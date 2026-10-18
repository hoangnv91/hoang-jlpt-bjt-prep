import { prisma } from "../lib/prisma";
import { claimNextJob, createJob, failJob, succeedJob } from "../lib/jobs";
import { getObject } from "../lib/storage";
import { extractDocument } from "../lib/extract";
import { assertCanExtract, assertCanSendAI } from "../lib/rights";
import { chatCompletion, MODEL } from "../lib/ai/client";
import { buildMessages } from "../lib/ai/prompts";
import { draftSchemas } from "../lib/ai/schemas";
import { acceptDraft } from "../lib/ai/accept";
import { SECTION_LABEL } from "../lib/types";
import type { RawChunk } from "../lib/extract";
import type { DraftKind, Prisma } from "@prisma/client";

const BASE_POLL_MS = Number(process.env.WORKER_POLL_MS ?? "3000");
const MAX_POLL_MS = Number(process.env.WORKER_MAX_POLL_MS ?? "10000");
const BACKOFF_FACTOR = 2;
const MAX_RUNS = Number(process.env.WORKER_MAX_RUNS ?? "1000");
const DRAIN_TIMEOUT_MS = 120_000;

// AI generation batching: never send the whole document in one prompt.
// Each batch is capped by chunk count AND estimated token size so a single
// request stays well under the provider's per-request token limit. The
// gpt-oss models on this key fail JSON validation when the prompt grows
// past ~4k chars, so batches are kept small (1-2 chunks).
const AI_BATCH_MAX_CHUNKS = Number(process.env.AI_BATCH_MAX_CHUNKS ?? "2");
const AI_BATCH_MAX_CHARS = Number(process.env.AI_BATCH_MAX_CHARS ?? "3200");
const AI_BATCH_DELAY_MS = Number(process.env.AI_BATCH_DELAY_MS ?? "2000");

let shuttingDown = false;
let idleTimer: NodeJS.Timeout | null = null;
let idleResolver: (() => void) | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    idleResolver = resolve;
    idleTimer = setTimeout(() => {
      idleTimer = null;
      idleResolver = null;
      resolve();
    }, ms);
  });
}

function interruptIdle(): void {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = null;
  if (idleResolver) idleResolver();
  idleResolver = null;
}

function requestShutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] received ${signal}, draining current job...`);
  // Safety net: if a job hangs past the drain timeout, force-exit.
  setTimeout(() => {
    console.error("[worker] drain timed out, forcing exit");
    process.exit(1);
  }, DRAIN_TIMEOUT_MS).unref();
  interruptIdle();
}

async function processJob() {
  const claimed = await claimNextJob();
  if (!claimed || !claimed.job) return false;

  const job = claimed.job;
  try {
    switch (job.type) {
      case "EXTRACT":
        if (!job.documentId) throw new Error("missing_document");
        await handleExtract(job.id, job.documentId);
        break;
      case "RIGHTS_CHECK":
        if (!job.documentId) throw new Error("missing_document");
        await handleRightsCheck(job.id, job.documentId);
        break;
      case "AI_GENERATE":
        if (!job.documentId) throw new Error("missing_document");
        await handleAiGenerate(job.id, job.documentId);
        break;
      default:
        throw new Error(`unknown_job_type: ${job.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error(`[worker] job ${job.id} (${job.type}) failed: ${message}`);
    await failJob(job.id, message.startsWith("ai_") || message === "document_not_found" ? "AI_UNAVAILABLE" : "INTERNAL_ERROR", message);
  }
  return true;
}

async function main() {
  console.log(`[worker] started (poll ${BASE_POLL_MS}ms, max idle ${MAX_POLL_MS}ms)`);
  let runs = 0;
  let idleDelay = BASE_POLL_MS;

  while (!shuttingDown) {
    runs += 1;
    if (runs > MAX_RUNS) {
      console.log("[worker] max runs reached, exiting");
      break;
    }

    const processed = await processJob();

    if (shuttingDown) break;

    if (processed) {
      // Work found — poll again promptly with the base interval.
      idleDelay = BASE_POLL_MS;
      continue;
    }

    // Queue empty — exponential backoff (base -> max) instead of hammering DB.
    await sleep(idleDelay);
    idleDelay = Math.min(idleDelay * BACKOFF_FACTOR, MAX_POLL_MS);
  }

  await prisma.$disconnect();
  console.log("[worker] stopped cleanly");
}

process.on("SIGTERM", () => requestShutdown("SIGTERM"));
process.on("SIGINT", () => requestShutdown("SIGINT"));

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});

async function handleExtract(jobId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("document_not_found");

  assertCanExtract(doc);

  const buffer = await getObject(doc.storageKey);
  const format = mimeToFormat(doc.mimeType);
  const chunks = await extractDocument(format, buffer);

  await prisma.$transaction([
    prisma.sourceChunk.deleteMany({ where: { documentId } }),
    prisma.sourceChunk.createMany({
      data: chunks.map((c) => ({
        documentId,
        userId: doc.userId,
        index: c.index,
        page: c.page ?? null,
        paragraph: c.paragraph ?? null,
        heading: c.heading ?? null,
        content: c.content,
        charStart: c.charStart ?? null,
        charEnd: c.charEnd ?? null,
      })),
    }),
    prisma.document.update({
      where: { id: documentId },
      data: { status: "READY", errorMessage: null },
    }),
  ]);

  await succeedJob(jobId);
  console.log(`[worker] EXTRACT ok: ${doc.fileName} -> ${chunks.length} chunks`);

  // Automatic enrichment pipeline: once a fresh document is extracted, queue
  // AI generation for its domain so questions/lessons appear without manual
  // steps. Skipped when the document already has drafts (e.g. re-extract).
  if (process.env.AUTO_GENERATE !== "false") {
    const existingDrafts = await prisma.aiDraft.count({ where: { documentId } });
    if (existingDrafts === 0) {
      const kinds = autoGenerateKinds(doc.section);
      for (const kind of kinds) {
        const job = await createJob({ userId: doc.userId, documentId, type: "AI_GENERATE" });
        await prisma.processingJob.update({
          where: { id: job.id },
          data: { errorMessage: kind },
        });
        console.log(`[worker] auto-queued AI_GENERATE ${kind} for ${doc.fileName}`);
      }
    }
  }
}

const AUTO_KINDS: Record<string, string[]> = {
  THEORY: ["LESSON"],
  VOCAB: ["VOCAB", "QUESTION"],
  BUSINESS_VOCAB: ["VOCAB", "QUESTION"],
  GRAMMAR: ["GRAMMAR", "QUESTION"],
  READING: ["READING", "QUESTION"],
  LISTENING: ["QUESTION"],
};

function autoGenerateKinds(section: string | null): string[] {
  const override = process.env.AUTO_GENERATE_KINDS;
  if (override) {
    return override
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
  }
  return section ? (AUTO_KINDS[section] ?? ["QUESTION"]) : ["QUESTION"];
}

function mimeToFormat(mime: string): "pdf" | "docx" | "txt" | "md" | "csv" {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("wordprocessingml")) return "docx";
  if (mime.includes("csv")) return "csv";
  if (mime.includes("markdown")) return "md";
  return "txt";
}

async function handleRightsCheck(jobId: string, documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("document_not_found");

  // Rights evaluation is recorded at ingest time; this job formalizes the step.
  // If rights are UNKNOWN/PENDING_VERIFICATION the document stays held for review.
  await succeedJob(jobId);
  console.log(`[worker] RIGHTS_CHECK ok: ${doc.fileName} (${doc.rightsStatus})`);
}

async function handleAiGenerate(jobId: string, documentId: string) {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  const kind = job?.errorMessage as "VOCAB" | "GRAMMAR" | "READING" | "QUESTION" | "LESSON" | null;
  if (!kind) throw new Error("missing_kind");

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("document_not_found");

  assertCanSendAI(doc);

  const chunks = await prisma.sourceChunk.findMany({
    where: { documentId },
    orderBy: { index: "asc" },
  });
  if (chunks.length === 0) throw new Error("no_chunks");

  const rawChunks: RawChunk[] = chunks.map((c) => ({
    index: c.index,
    page: c.page,
    paragraph: c.paragraph,
    heading: c.heading,
    content: c.content,
    charStart: c.charStart,
    charEnd: c.charEnd,
  }));

  // Split the document into small batches so no single request exceeds the
  // provider's per-request token limit. Each batch is sent separately and the
  // partial results are merged into one draft afterwards.
  const batches = batchChunks(rawChunks);
  const parts: Array<Record<string, unknown>> = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { system, user } = buildMessages(kind, batch, {
      section: doc.section ? SECTION_LABEL[doc.section].vi : undefined,
    });
    const content = await chatCompletion([
      { role: "system", content: system },
      { role: "user", content: user },
    ]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.warn(`[worker] AI_GENERATE batch ${i + 1}/${batches.length} returned invalid JSON, skipping`);
      continue;
    }

    const obj = parsed as Record<string, unknown>;
    const collectionKey = draftCollectionKey(kind);
    const collected = Array.isArray(obj[collectionKey]) ? (obj[collectionKey] as unknown[]) : [];
    if (collected.length === 0) {
      console.warn(`[worker] AI_GENERATE batch ${i + 1}/${batches.length} produced no items, skipping`);
      continue;
    }
    parts.push(obj);

    // Space out provider calls to stay under the free-tier RPM/TPM limits.
    if (i < batches.length - 1) {
      await sleep(AI_BATCH_DELAY_MS);
    }
  }

  if (parts.length === 0) throw new Error("ai_invalid_json");

  const merged = mergeDraftParts(kind, parts);
  const schema = draftSchemas[kind];
  const validated = schema.safeParse(merged);
  if (!validated.success) {
    throw new Error(`ai_schema_mismatch: ${validated.error.message.slice(0, 300)}`);
  }

  const payload = validated.data as Record<string, unknown>;
  const sourceRefs = {
    documentId,
    documentName: doc.fileName,
    chunkIds: chunks.map((c) => c.id),
  };

  await prisma.aiDraft.create({
    data: {
      userId: doc.userId,
      documentId,
      kind,
      payload: payload as Prisma.InputJsonValue,
      sourceRefs: sourceRefs as Prisma.InputJsonValue,
      status: "PENDING_REVIEW",
      aiModel: MODEL,
    },
  });

  await succeedJob(jobId);
  console.log(`[worker] AI_GENERATE ok: ${kind} for ${doc.fileName} (${batches.length} batch(es))`);

  // Automatic acceptance: skip the manual review step so generated questions
  // and lessons land in their domains immediately. Disable with
  // AUTO_ACCEPT_DRAFTS=false to keep the review queue.
  if (process.env.AUTO_ACCEPT_DRAFTS !== "false") {
    const created = await prisma.aiDraft.findFirst({
      where: { userId: doc.userId, documentId, kind },
      orderBy: { createdAt: "desc" },
    });
    if (created) {
      const { lessonId, createdQuestions } = await acceptDraft(created.id);
      console.log(
        `[worker] auto-accepted ${kind} draft ${created.id}` +
          (lessonId ? ` (lesson ${lessonId})` : "") +
          (createdQuestions ? ` (${createdQuestions} questions)` : "")
      );
    }
  }
}

/**
 * Split source chunks into small AI batches. A batch is closed when it reaches
 * AI_BATCH_MAX_CHUNKS chunks or AI_BATCH_MAX_CHARS characters (a rough proxy
 * for ~2-3k tokens), whichever comes first — so a single provider request never
 * carries the whole document.
 */
function batchChunks(chunks: RawChunk[]): RawChunk[][] {
  const batches: RawChunk[][] = [];
  let current: RawChunk[] = [];
  let currentChars = 0;

  for (const chunk of chunks) {
    const chunkChars = Math.min(chunk.content.length, 2200);
    if (
      current.length > 0 &&
      (current.length >= AI_BATCH_MAX_CHUNKS || currentChars + chunkChars > AI_BATCH_MAX_CHARS)
    ) {
      batches.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(chunk);
    currentChars += chunkChars;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** The array field of a draft payload that holds the generated items. */
function draftCollectionKey(kind: "VOCAB" | "GRAMMAR" | "READING" | "QUESTION" | "LESSON"): string {
  switch (kind) {
    case "VOCAB":
    case "GRAMMAR":
      return "items";
    case "READING":
      return "exercises";
    case "QUESTION":
      return "questions";
    case "LESSON":
      return "sections";
  }
}

/**
 * Merge partial draft payloads (one per AI batch) into a single draft. Array
 * fields are concatenated; scalar fields (title, summary, exam) are taken from
 * the first batch that produced them.
 */
function mergeDraftParts(
  kind: "VOCAB" | "GRAMMAR" | "READING" | "QUESTION" | "LESSON",
  parts: Array<Record<string, unknown>>
): Record<string, unknown> {
  const first = parts[0];
  const merged: Record<string, unknown> = { kind, title: first.title };

  switch (kind) {
    case "VOCAB":
    case "GRAMMAR":
      merged.items = parts.flatMap((p) => (Array.isArray(p.items) ? (p.items as unknown[]) : []));
      break;
    case "READING":
      merged.exercises = parts.flatMap((p) => (Array.isArray(p.exercises) ? (p.exercises as unknown[]) : []));
      break;
    case "QUESTION":
      merged.exam = first.exam ?? "JLPT_N1";
      merged.questions = parts.flatMap((p) => (Array.isArray(p.questions) ? (p.questions as unknown[]) : []));
      break;
    case "LESSON":
      merged.summary = parts
        .map((p) => (typeof p.summary === "string" ? p.summary : ""))
        .filter((s) => s.length > 0)
        .join("\n");
      merged.sections = parts.flatMap((p) => (Array.isArray(p.sections) ? (p.sections as unknown[]) : []));
      break;
  }
  return merged;
}

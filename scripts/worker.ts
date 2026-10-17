import { prisma } from "../lib/prisma";
import { claimNextJob, failJob, succeedJob } from "../lib/jobs";
import { getObject } from "../lib/storage";
import { extractDocument } from "../lib/extract";
import { assertCanExtract, assertCanSendAI } from "../lib/rights";
import { chatCompletion, MODEL } from "../lib/ai/client";
import { buildMessages } from "../lib/ai/prompts";
import { draftSchemas } from "../lib/ai/schemas";
import type { RawChunk } from "../lib/extract";
import type { Prisma } from "@prisma/client";

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_MS ?? "3000");
const MAX_RUNS = Number(process.env.WORKER_MAX_RUNS ?? "1000");

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

  const { system, user } = buildMessages(kind, rawChunks);
  const content = await chatCompletion([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("ai_invalid_json");
  }

  const schema = draftSchemas[kind];
  const validated = schema.safeParse(parsed);
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
  console.log(`[worker] AI_GENERATE ok: ${kind} for ${doc.fileName}`);
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
  console.log(`[worker] started (poll ${POLL_INTERVAL_MS}ms)`);
  let runs = 0;
  for (;;) {
    runs += 1;
    if (runs > MAX_RUNS) {
      console.log("[worker] max runs reached, exiting");
      process.exit(0);
    }
    const processed = await processJob();
    if (!processed) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
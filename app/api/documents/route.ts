import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody } from "@/lib/errors";
import { detectFileFormat } from "@/lib/ingest/files";
import { uploadDocumentSchema, urlDocumentSchema, textDocumentSchema } from "@/lib/ingest/schemas";
import { persistDocument } from "@/lib/ingest/persist";
import { safeFetch } from "@/lib/security/ssrf";
import { saveObject, sha256Of, buildStorageKey } from "@/lib/storage";
import { evaluateRights } from "@/lib/rights";
import { createJob } from "@/lib/jobs";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const userId = session.user.id;
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return await handleUpload(req, userId);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(toErrorBody(new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body")), { status: 400 });
    }

    if (typeof body.url === "string") {
      return await handleUrl(body, userId);
    }
    if (typeof body.content === "string") {
      return await handleText(body, userId);
    }
    return NextResponse.json(toErrorBody(new ApiError(422, "VALIDATION_ERROR", "Provide a file, url, or content")), { status: 422 });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

function toErrorResponse(err: unknown) {
  const body = toErrorBody(err);
  const status = err instanceof ApiError ? err.status : 500;
  return { status, body };
}

function rightsToDb(rights: ReturnType<typeof evaluateRights>) {
  return {
    rightsStatus: rights.rightsStatus,
    rightsStore: rights.rightsStore,
    rightsExtract: rights.rightsExtract,
    rightsSendAI: rights.rightsSendAI,
    rightsDistribute: rights.rightsDistribute,
    rightsEvidence: rights.evidence,
    rightsVerifiedAt: rights.verifiedAt,
  };
}

async function handleUpload(req: Request, userId: string) {
  const form = await req.formData();
  const file = form.get("file");
  const metadataRaw = form.get("metadata");
  const sectionRaw = form.get("section");

  if (!(file instanceof File)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Missing file");
  }

  const parsed = uploadDocumentSchema.safeParse({
    metadata: metadataRaw && typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : {},
    section: sectionRaw && typeof sectionRaw === "string" ? sectionRaw : null,
  });
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid metadata");

  const buffer = Buffer.from(await file.arrayBuffer());
  const doc = await persistDocument({
    userId,
    fileName: file.name,
    buffer,
    metadata: parsed.data.metadata,
    sourceType: "UPLOAD",
    section: parsed.data.section ?? null,
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}

async function handleUrl(body: unknown, userId: string) {
  const parsed = urlDocumentSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid URL payload");

  const { url, metadata } = parsed.data;
  const fetched = await safeFetch(url);
  if (!fetched.ok) {
    throw new ApiError(422, "FETCH_FAILED", `Remote server returned ${fetched.status}`);
  }

  const contentType = fetched.contentType ?? "text/plain";
  const extGuess = contentType.split(";")[0].trim();
  const fileName = new URL(fetched.finalUrl).pathname.split("/").pop() || "remote-content";
  const buffer = fetched.body;
  const detected = detectFileFormat(buffer, `${fileName}.${extFromMime(extGuess)}`);
  const sha = sha256Of(buffer);
  const storageKey = buildStorageKey(userId, fileName, sha);
  await saveObject(storageKey, buffer, detected.mimeType);

  const rights = evaluateRights({ sourceType: "URL", ...metadata });

  const doc = await prisma.document.create({
    data: {
      userId,
      fileName,
      mimeType: detected.mimeType,
      sizeBytes: buffer.byteLength,
      sha256: sha,
      storageKey,
      sourceType: "URL",
      sourceUrl: fetched.finalUrl,
      section: parsed.data.section ?? null,
      ...metadata,
      ...rightsToDb(rights),
    },
  });

  await createJob({ userId, documentId: doc.id, type: "EXTRACT" });
  await createJob({ userId, documentId: doc.id, type: "RIGHTS_CHECK" });

  return NextResponse.json({ document: doc }, { status: 201 });
}

async function handleText(body: unknown, userId: string) {
  const parsed = textDocumentSchema.safeParse(body);
  if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid text payload");

  const { title, content, metadata } = parsed.data;
  const buffer = Buffer.from(content, "utf8");
  const sha = sha256Of(buffer);
  const storageKey = buildStorageKey(userId, `${title}.txt`, sha);
  await saveObject(storageKey, buffer, "text/plain");

  const rights = evaluateRights({ sourceType: "TEXT", ...metadata });

  const doc = await prisma.document.create({
    data: {
      userId,
      fileName: `${title}.txt`,
      mimeType: "text/plain",
      sizeBytes: buffer.byteLength,
      sha256: sha,
      storageKey,
      sourceType: "TEXT",
      section: parsed.data.section ?? null,
      ...metadata,
      ...rightsToDb(rights),
    },
  });

  await createJob({ userId, documentId: doc.id, type: "EXTRACT" });
  await createJob({ userId, documentId: doc.id, type: "RIGHTS_CHECK" });

  return NextResponse.json({ document: doc }, { status: 201 });
}

function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/plain": "txt",
  };
  return map[mime] ?? "txt";
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const docs = await prisma.document.findMany({
      where: { userId: session.user.id, ...(status ? { status: status as never } : {}) },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });
    return NextResponse.json({ documents: docs });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
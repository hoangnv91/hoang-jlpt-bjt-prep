import { assertUploadSize, detectFileFormat } from "@/lib/ingest/files";
import { saveObject, sha256Of, buildStorageKey } from "@/lib/storage";
import { evaluateRights } from "@/lib/rights";
import { prisma } from "@/lib/prisma";
import { createJob } from "@/lib/jobs";
import type { Section } from "@prisma/client";

export interface PersistDocumentInput {
  userId: string;
  fileName: string;
  buffer: Buffer;
  metadata: {
    author?: string | null;
    license?: string | null;
    purpose?: string | null;
  };
  sourceType: "UPLOAD" | "URL" | "TEXT";
  sourceUrl?: string | null;
  section?: Section | null;
}

/**
 * Shared ingest pipeline: validate size/format, store the object, record the
 * Document row and enqueue the background jobs. Used by the single-shot
 * upload handler and the chunked-upload assembler.
 */
export async function persistDocument(input: PersistDocumentInput) {
  const { userId, fileName, buffer, metadata, sourceType, sourceUrl, section } = input;

  assertUploadSize(buffer.byteLength);
  const detected = detectFileFormat(buffer, fileName);
  const sha = sha256Of(buffer);
  const storageKey = buildStorageKey(userId, fileName, sha);
  await saveObject(storageKey, buffer, detected.mimeType);

  const rights = evaluateRights({ sourceType, ...metadata });

  const doc = await prisma.document.create({
    data: {
      userId,
      fileName,
      mimeType: detected.mimeType,
      sizeBytes: buffer.byteLength,
      sha256: sha,
      storageKey,
      sourceType,
      sourceUrl: sourceUrl ?? null,
      section: section ?? null,
      ...metadata,
      rightsStatus: rights.rightsStatus,
      rightsStore: rights.rightsStore,
      rightsExtract: rights.rightsExtract,
      rightsSendAI: rights.rightsSendAI,
      rightsDistribute: rights.rightsDistribute,
      rightsEvidence: rights.evidence,
      rightsVerifiedAt: rights.verifiedAt,
    },
  });

  await createJob({ userId, documentId: doc.id, type: "EXTRACT" });
  await createJob({ userId, documentId: doc.id, type: "RIGHTS_CHECK" });

  return doc;
}
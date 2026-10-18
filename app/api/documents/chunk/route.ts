import { NextResponse } from "next/server";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { ApiError, toErrorBody } from "@/lib/errors";
import { uploadDocumentSchema } from "@/lib/ingest/schemas";
import { MAX_FILE_BYTES } from "@/lib/ingest/files";
import { persistDocument } from "@/lib/ingest/persist";
import { sha256Of } from "@/lib/storage";

// Chunked upload: the preview proxy hard-caps request bodies at 1 MiB, so
// large files are sliced client-side into chunks well under that limit and
// posted one by one. Chunks are buffered on disk per (user, uploadId); when
// the last chunk (chunkIndex === totalChunks - 1) arrives, the parts are
// concatenated and fed through the standard ingest pipeline (persistDocument).
const CHUNK_ROOT = path.join(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data/uploads"),
  "chunks"
);
const MAX_CHUNK_BYTES = 921_600; // 900 KiB — must stay under the 1 MiB proxy cap
const MAX_TOTAL_CHUNKS = 40; // 40 × 512 KiB ≈ 20 MB
const CHUNK_TTL_MS = 60 * 60 * 1000; // orphaned uploads are swept after 1h

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function userChunkRoot(userId: string): string {
  return path.join(CHUNK_ROOT, userId);
}

function uploadChunkDir(userId: string, uploadId: string): string {
  return path.join(userChunkRoot(userId), uploadId);
}

/** Remove upload dirs older than the TTL so aborted uploads cannot pile up. */
async function sweepStale(userId: string): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(userChunkRoot(userId), { withFileTypes: true });
  } catch {
    return;
  }
  const now = Date.now();
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(userChunkRoot(userId), entry.name);
    try {
      const st = await fsp.stat(dir);
      if (now - st.mtimeMs > CHUNK_TTL_MS) {
        await fsp.rm(dir, { recursive: true, force: true });
      }
    } catch {
      // ignore per-directory races
    }
  }
}

async function writeChunkAtomic(dir: string, index: number, data: Buffer): Promise<void> {
  await fsp.mkdir(dir, { recursive: true, mode: 0o700 });
  const dest = path.join(dir, `${index}.part`);
  const tmp = path.join(dir, `.${index}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  await fsp.writeFile(tmp, data, { mode: 0o600 });
  await fsp.rename(tmp, dest);
}

async function collectChunks(dir: string, total: number): Promise<Buffer[]> {
  const parts: Buffer[] = [];
  let totalBytes = 0;
  for (let i = 0; i < total; i++) {
    const buf = await fsp.readFile(path.join(dir, `${i}.part`));
    totalBytes += buf.length;
    if (totalBytes > MAX_FILE_BYTES) {
      throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 20MB limit");
    }
    parts.push(buf);
  }
  return parts;
}

function toErrorResponse(err: unknown) {
  const body = toErrorBody(err);
  const status = err instanceof ApiError ? err.status : 500;
  return { status, body };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")),
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const form = await req.formData();
    const uploadId = String(form.get("uploadId") ?? "");
    const fileName = String(form.get("fileName") ?? "").trim();
    const chunkIndex = Number(form.get("chunkIndex"));
    const totalChunks = Number(form.get("totalChunks"));
    const chunk = form.get("chunk");

    if (!UUID_RE.test(uploadId)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Invalid uploadId");
    }
    if (
      !Number.isInteger(chunkIndex) ||
      !Number.isInteger(totalChunks) ||
      chunkIndex < 0 ||
      totalChunks < 1 ||
      chunkIndex >= totalChunks
    ) {
      throw new ApiError(422, "VALIDATION_ERROR", "Invalid chunk index");
    }
    if (totalChunks > MAX_TOTAL_CHUNKS) {
      throw new ApiError(413, "FILE_TOO_LARGE", "Too many chunks");
    }
    if (!fileName) {
      throw new ApiError(422, "VALIDATION_ERROR", "Missing fileName");
    }
    if (!(chunk instanceof File)) {
      throw new ApiError(422, "VALIDATION_ERROR", "Missing chunk");
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    if (buffer.byteLength === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Empty chunk");
    }
    if (buffer.byteLength > MAX_CHUNK_BYTES) {
      throw new ApiError(413, "CHUNK_TOO_LARGE", "Chunk exceeds 900KB limit");
    }

    await sweepStale(userId);
    const dir = uploadChunkDir(userId, uploadId);
    await writeChunkAtomic(dir, chunkIndex, buffer);

    // Auto-assemble once the final chunk is in.
    if (chunkIndex === totalChunks - 1) {
      let present = 0;
      try {
        const names = await fsp.readdir(dir);
        present = names.filter((n) => n.endsWith(".part")).length;
      } catch {
        present = 0;
      }
      if (present !== totalChunks) {
        throw new ApiError(
          409,
          "INCOMPLETE_UPLOAD",
          `Expected ${totalChunks} chunks, got ${present}`
        );
      }

      const parts = await collectChunks(dir, totalChunks);
      const assembled = Buffer.concat(parts);

      let metadata = {};
      const metadataRaw = form.get("metadata");
      if (metadataRaw && typeof metadataRaw === "string") {
        let parsedMeta: unknown;
        try {
          parsedMeta = JSON.parse(metadataRaw);
        } catch {
          throw new ApiError(422, "VALIDATION_ERROR", "Invalid metadata");
        }
        const parsed = uploadDocumentSchema.safeParse({ metadata: parsedMeta });
        if (!parsed.success) {
          throw new ApiError(422, "VALIDATION_ERROR", "Invalid metadata");
        }
        metadata = parsed.data.metadata;
      }

      const sectionRaw = form.get("section");
      let section: string | null = null;
      if (sectionRaw && typeof sectionRaw === "string") {
        const parsed = uploadDocumentSchema.safeParse({ section: sectionRaw });
        if (!parsed.success) {
          throw new ApiError(422, "VALIDATION_ERROR", "Invalid section");
        }
        section = parsed.data.section ?? null;
      }

      const clientSha = String(form.get("sha256") ?? "").trim();
      if (clientSha && clientSha.toLowerCase() !== sha256Of(assembled)) {
        await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
        throw new ApiError(422, "CHECKSUM_MISMATCH", "File checksum mismatch");
      }

      try {
        const doc = await persistDocument({
          userId,
          fileName,
          buffer: assembled,
          metadata,
          sourceType: "UPLOAD",
          section: section as "VOCAB" | "GRAMMAR" | "READING" | "LISTENING" | "BUSINESS_VOCAB" | "THEORY" | null,
        });
        await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
        return NextResponse.json({ document: doc }, { status: 201 });
      } catch (err) {
        await fsp.rm(dir, { recursive: true, force: true }).catch(() => undefined);
        throw err;
      }
    }

    return NextResponse.json({ received: chunkIndex, total: totalChunks, complete: false });
  } catch (err) {
    const { status, body } = toErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
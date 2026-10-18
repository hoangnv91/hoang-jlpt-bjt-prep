import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Client as MinioClient } from "minio";
import { ApiError } from "@/lib/errors";

const LOCAL_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data/uploads");
const TMP_DIR = path.join(LOCAL_DIR, ".tmp");
const MAX_STORED_BYTES = 25 * 1024 * 1024; // defense in depth above the 20MB upload cap

const minioEnabled = !!process.env.S3_ENDPOINT;

const minio = minioEnabled
  ? new MinioClient({
      endPoint: process.env.S3_ENDPOINT!,
      port: Number(process.env.S3_PORT ?? "9000"),
      useSSL: process.env.S3_USE_SSL === "true",
      accessKey: process.env.S3_ACCESS_KEY ?? "minioadmin",
      secretKey: process.env.S3_SECRET_KEY ?? "minioadmin",
    })
  : null;

const BUCKET = process.env.S3_BUCKET ?? "documents";

// Ensure the local storage dirs exist with private permissions (owner only).
// Called lazily so tests / non-upload code paths don't touch the FS.
let dirsEnsured = false;
function ensureDirs(): void {
  if (dirsEnsured) return;
  fs.mkdirSync(LOCAL_DIR, { recursive: true, mode: 0o700 });
  fs.mkdirSync(TMP_DIR, { recursive: true, mode: 0o700 });
  dirsEnsured = true;
}

/** Resolve a key inside LOCAL_DIR, rejecting any path traversal. */
function resolveLocalPath(key: string): string {
  const resolved = path.resolve(LOCAL_DIR, key);
  if (resolved !== LOCAL_DIR && !resolved.startsWith(LOCAL_DIR + path.sep)) {
    throw new ApiError(422, "VALIDATION_ERROR", "Invalid storage key");
  }
  return resolved;
}

function safeKeyPart(name: string): string {
  const cleaned = path.basename(name).replace(/[^\w.\-\u3040-\u30ff\u4e00-\u9fff]/g, "_");
  return cleaned.slice(0, 160) || "file";
}

export function buildStorageKey(userId: string, fileName: string, sha256: string): string {
  return `${userId}/${sha256.slice(0, 16)}-${safeKeyPart(fileName)}`;
}

export async function saveObject(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  if (buffer.byteLength > MAX_STORED_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds storage limit");
  }
  if (minio) {
    const exists = await minio.bucketExists(BUCKET).catch(() => false);
    if (!exists) await minio.makeBucket(BUCKET);
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
    return;
  }
  // Atomic write: temp file in a private dir, then rename into place.
  ensureDirs();
  const fullPath = resolveLocalPath(key);
  await fsp.mkdir(path.dirname(fullPath), { recursive: true, mode: 0o700 });
  const tmpPath = path.join(
    TMP_DIR,
    `${path.basename(fullPath)}.${crypto.randomBytes(8).toString("hex")}.tmp`
  );
  await fsp.writeFile(tmpPath, buffer, { mode: 0o600 });
  await fsp.rename(tmpPath, fullPath);
}

export async function getObject(key: string): Promise<Buffer> {
  if (minio) {
    const stream = await minio.getObject(BUCKET, key);
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of stream) {
      const buf = chunk as Buffer;
      total += buf.length;
      if (total > MAX_STORED_BYTES) {
        throw new ApiError(413, "FILE_TOO_LARGE", "Stored file exceeds size limit");
      }
      chunks.push(buf);
    }
    return Buffer.concat(chunks);
  }
  ensureDirs();
  const fullPath = resolveLocalPath(key);
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(fullPath);
  } catch {
    throw new ApiError(404, "NOT_FOUND", "Stored file not found");
  }
  if (stat.size > MAX_STORED_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "Stored file exceeds size limit");
  }
  return fsp.readFile(fullPath);
}

export async function deleteObject(key: string): Promise<void> {
  if (minio) {
    await minio.removeObject(BUCKET, key).catch(() => undefined);
    return;
  }
  ensureDirs();
  const fullPath = resolveLocalPath(key);
  await fsp.rm(fullPath, { force: true });
}

export function sha256Of(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
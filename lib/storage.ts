import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client as MinioClient } from "minio";
import { ApiError } from "@/lib/errors";

const LOCAL_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "data/uploads");

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
  if (minio) {
    const exists = await minio.bucketExists(BUCKET).catch(() => false);
    if (!exists) await minio.makeBucket(BUCKET);
    await minio.putObject(BUCKET, key, buffer, buffer.length, {
      "Content-Type": contentType,
    });
    return;
  }
  const fullPath = path.join(LOCAL_DIR, key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
}

export async function getObject(key: string): Promise<Buffer> {
  if (minio) {
    const stream = await minio.getObject(BUCKET, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks);
  }
  const fullPath = path.join(LOCAL_DIR, key);
  if (!fs.existsSync(fullPath)) {
    throw new ApiError(404, "NOT_FOUND", "Stored file not found");
  }
  return fs.readFileSync(fullPath);
}

export async function deleteObject(key: string): Promise<void> {
  if (minio) {
    await minio.removeObject(BUCKET, key).catch(() => undefined);
    return;
  }
  const fullPath = path.join(LOCAL_DIR, key);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
}

export function sha256Of(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}
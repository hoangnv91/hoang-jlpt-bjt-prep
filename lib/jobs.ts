import { prisma } from "@/lib/prisma";
import type { JobStatus, JobType } from "@prisma/client";

export const RETRY_BACKOFF_SECONDS = [1, 5, 30];
export const DEFAULT_MAX_ATTEMPTS = 3;

export async function createJob(params: {
  userId: string;
  documentId?: string;
  type: JobType;
}) {
  return prisma.processingJob.create({
    data: {
      userId: params.userId,
      documentId: params.documentId,
      type: params.type,
      status: "PENDING",
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    },
  });
}

export async function claimNextJob(): Promise<{
  job: Awaited<ReturnType<typeof prisma.processingJob.findFirst>>;
} | null> {
  const now = new Date();
  const job = await prisma.processingJob.findFirst({
    where: {
      status: "PENDING",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;

  const claimed = await prisma.processingJob.updateMany({
    where: { id: job.id, status: "PENDING" },
    data: { status: "RUNNING", startedAt: new Date() },
  });
  if (claimed.count === 0) return null;

  const refreshed = await prisma.processingJob.findUnique({
    where: { id: job.id },
  });
  return { job: refreshed };
}

export function isRetryable(code: string | null): boolean {
  if (!code) return true;
  const permanent = new Set([
    "VALIDATION_ERROR",
    "UNSUPPORTED_FORMAT",
    "INVALID_FILE",
    "RIGHTS_NOT_PERMITTED",
    "SSRF_BLOCKED",
    "NOT_FOUND",
  ]);
  return !permanent.has(code);
}

export async function failJob(
  jobId: string,
  code: string,
  message: string
): Promise<void> {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  const attemptsLeft = job.maxAttempts - (job.attempts + 1);
  if (attemptsLeft > 0 && isRetryable(code)) {
    const delay = RETRY_BACKOFF_SECONDS[Math.min(job.attempts, RETRY_BACKOFF_SECONDS.length - 1)];
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        attempts: { increment: 1 },
        nextRetryAt: new Date(Date.now() + delay * 1000),
        errorCode: code,
        errorMessage: message,
      },
    });
  } else {
    await prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        finishedAt: new Date(),
        errorCode: code,
        errorMessage: message,
      },
    });
  }
}

export async function succeedJob(jobId: string): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "SUCCEEDED", finishedAt: new Date() },
  });
}

export async function markRunning(jobId: string): Promise<void> {
  await prisma.processingJob.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

export const JOB_STATUS_LABEL: Record<JobStatus, { vi: string; ja: string }> = {
  PENDING: { vi: "Chờ xử lý", ja: "待機中" },
  RUNNING: { vi: "Đang xử lý", ja: "処理中" },
  SUCCEEDED: { vi: "Hoàn thành", ja: "完了" },
  FAILED: { vi: "Thất bại", ja: "失敗" },
  CANCELLED: { vi: "Đã hủy", ja: "キャンセル" },
};

export const JOB_TYPE_LABEL: Record<JobType, { vi: string; ja: string }> = {
  EXTRACT: { vi: "Trích xuất nội dung", ja: "コンテンツ抽出" },
  RIGHTS_CHECK: { vi: "Kiểm tra bản quyền", ja: "著作権チェック" },
  AI_GENERATE: { vi: "AI sinh nội dung", ja: "AI生成" },
};
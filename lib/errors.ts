export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNSUPPORTED_FORMAT"
  | "FILE_TOO_LARGE"
  | "INVALID_FILE"
  | "CHUNK_TOO_LARGE"
  | "INCOMPLETE_UPLOAD"
  | "CHECKSUM_MISMATCH"
  | "SSRF_BLOCKED"
  | "FETCH_FAILED"
  | "RIGHTS_NOT_PERMITTED"
  | "RIGHTS_UNVERIFIED"
  | "AI_UNAVAILABLE"
  | "AI_TIMEOUT"
  | "AI_BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function toErrorBody(error: unknown) {
  if (error instanceof ApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
  }
  const msg = error instanceof Error ? error.message : "Unknown error";
  return {
    error: { code: "INTERNAL_ERROR" as ErrorCode, message: msg },
  };
}

export function assertOwner(ownerId: string | undefined, userId: string) {
  if (!ownerId || ownerId !== userId) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource");
  }
}
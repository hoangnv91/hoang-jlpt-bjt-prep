import type { PermissionLevel, RightsStatus } from "@prisma/client";
import { ApiError } from "@/lib/errors";

export interface RightsDecision {
  rightsStatus: RightsStatus;
  rightsStore: PermissionLevel;
  rightsExtract: PermissionLevel;
  rightsSendAI: PermissionLevel;
  rightsDistribute: PermissionLevel;
  verifiedAt: Date | null;
  evidence: string | null;
}

/**
 * Evaluate usage rights for a document against the intended operation.
 *
 * Rules:
 * - We NEVER infer permission from "freely downloadable" or "personal study only".
 * - If rights are UNKNOWN or PENDING_VERIFICATION, the document is held for
 *   review and NOT eligible for extraction/AI/distribution.
 * - rightsStore defaults to PERMITTED for user-uploaded own material, else UNKNOWN.
 */
export function evaluateRights(input: {
  sourceType: "UPLOAD" | "URL" | "TEXT";
  license?: string | null;
  author?: string | null;
  purpose?: string | null;
  declaredRights?: Partial<RightsDecision>;
}): RightsDecision {
  const declared = input.declaredRights ?? {};

  const store: PermissionLevel =
    declared.rightsStore ??
    (input.sourceType === "UPLOAD" || input.sourceType === "TEXT"
      ? "PERMITTED"
      : "UNKNOWN");

  const status: RightsStatus =
    declared.rightsStatus ??
    (store === "PERMITTED" ? "PERMITTED" : "PENDING_VERIFICATION");

  const extract: PermissionLevel =
    declared.rightsExtract ??
    (status === "PERMITTED" ? "PERMITTED" : "UNKNOWN");
  const sendAI: PermissionLevel =
    declared.rightsSendAI ??
    (status === "PERMITTED" ? "PERMITTED" : "UNKNOWN");
  const distribute: PermissionLevel =
    declared.rightsDistribute ??
    (status === "PERMITTED" ? "UNKNOWN" : "UNKNOWN");

  return {
    rightsStatus: status,
    rightsStore: store,
    rightsExtract: extract,
    rightsSendAI: sendAI,
    rightsDistribute: distribute,
    verifiedAt: declared.verifiedAt ?? null,
    evidence: declared.evidence ?? null,
  };
}

export function assertCanExtract(doc: {
  rightsExtract: PermissionLevel;
  rightsStatus: RightsStatus;
}) {
  if (doc.rightsStatus === "RESTRICTED" || doc.rightsExtract === "NOT_PERMITTED") {
    throw new ApiError(
      403,
      "RIGHTS_NOT_PERMITTED",
      "Usage rights do not permit extracting content from this document"
    );
  }
  if (doc.rightsExtract === "UNKNOWN" || doc.rightsStatus === "PENDING_VERIFICATION") {
    throw new ApiError(
      425,
      "RIGHTS_UNVERIFIED",
      "Usage rights for this document are not yet verified; it is held for review"
    );
  }
}

export function assertCanSendAI(doc: {
  rightsSendAI: PermissionLevel;
  rightsStatus: RightsStatus;
}) {
  if (doc.rightsStatus === "RESTRICTED" || doc.rightsSendAI === "NOT_PERMITTED") {
    throw new ApiError(
      403,
      "RIGHTS_NOT_PERMITTED",
      "Usage rights do not permit sending this content to an AI provider"
    );
  }
  if (doc.rightsSendAI === "UNKNOWN" || doc.rightsStatus === "PENDING_VERIFICATION") {
    throw new ApiError(
      425,
      "RIGHTS_UNVERIFIED",
      "Usage rights for this document are not yet verified"
    );
  }
}

export function assertCanDistribute(doc: {
  rightsDistribute: PermissionLevel;
  rightsStatus: RightsStatus;
}) {
  if (doc.rightsStatus === "RESTRICTED" || doc.rightsDistribute === "NOT_PERMITTED") {
    throw new ApiError(
      403,
      "RIGHTS_NOT_PERMITTED",
      "Usage rights do not permit distributing this content"
    );
  }
  if (doc.rightsDistribute === "UNKNOWN" || doc.rightsStatus === "PENDING_VERIFICATION") {
    throw new ApiError(
      425,
      "RIGHTS_UNVERIFIED",
      "Distribution rights for this document are not yet verified"
    );
  }
}

export const RIGHTS_STATUS_LABEL: Record<RightsStatus, { vi: string; ja: string }> = {
  UNKNOWN: { vi: "Chưa rõ", ja: "不明" },
  PERMITTED: { vi: "Được phép", ja: "許可" },
  RESTRICTED: { vi: "Hạn chế", ja: "制限" },
  PENDING_VERIFICATION: { vi: "Chờ xác minh", ja: "確認待ち" },
};

export const PERMISSION_LABEL: Record<PermissionLevel, { vi: string; ja: string }> = {
  PERMITTED: { vi: "Được phép", ja: "許可" },
  NOT_PERMITTED: { vi: "Không được phép", ja: "不許可" },
  UNKNOWN: { vi: "Chưa rõ", ja: "不明" },
};
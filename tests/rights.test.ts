import { describe, it, expect } from "vitest";
import { evaluateRights, assertCanExtract, assertCanSendAI, assertCanDistribute } from "@/lib/rights";
import { ApiError } from "@/lib/errors";

describe("rights evaluation", () => {
  it("defaults uploads to PERMITTED store, others UNKNOWN", () => {
    const upload = evaluateRights({ sourceType: "UPLOAD" });
    expect(upload.rightsStore).toBe("PERMITTED");
    expect(upload.rightsStatus).toBe("PERMITTED");

    const url = evaluateRights({ sourceType: "URL" });
    expect(url.rightsStore).toBe("UNKNOWN");
    expect(url.rightsStatus).toBe("PENDING_VERIFICATION");
  });

  it("never infers permission from free download / personal study", () => {
    const doc = evaluateRights({
      sourceType: "URL",
      license: "free to download",
      purpose: "personal study only",
    });
    expect(doc.rightsStatus).toBe("PENDING_VERIFICATION");
    expect(doc.rightsExtract).toBe("UNKNOWN");
    expect(doc.rightsDistribute).toBe("UNKNOWN");
  });

  it("respects explicit declared rights", () => {
    const doc = evaluateRights({
      sourceType: "URL",
      declaredRights: {
        rightsStatus: "PERMITTED",
        rightsExtract: "PERMITTED",
        rightsSendAI: "PERMITTED",
        rightsDistribute: "NOT_PERMITTED",
      },
    });
    expect(doc.rightsStatus).toBe("PERMITTED");
    expect(doc.rightsDistribute).toBe("NOT_PERMITTED");
  });
});

describe("rights gates", () => {
  const permitted = {
    rightsStatus: "PERMITTED" as const,
    rightsExtract: "PERMITTED" as const,
    rightsSendAI: "PERMITTED" as const,
    rightsDistribute: "PERMITTED" as const,
  };
  const unverified = {
    rightsStatus: "PENDING_VERIFICATION" as const,
    rightsExtract: "UNKNOWN" as const,
    rightsSendAI: "UNKNOWN" as const,
    rightsDistribute: "UNKNOWN" as const,
  };
  const restricted = {
    rightsStatus: "RESTRICTED" as const,
    rightsExtract: "NOT_PERMITTED" as const,
    rightsSendAI: "NOT_PERMITTED" as const,
    rightsDistribute: "NOT_PERMITTED" as const,
  };

  it("allows extraction when permitted", () => {
    expect(() => assertCanExtract(permitted)).not.toThrow();
  });
  it("blocks extraction when unverified", () => {
    expect(() => assertCanExtract(unverified)).toThrowError(ApiError);
    expect(() => assertCanExtract(unverified)).toThrowError(/not yet verified/);
  });
  it("blocks AI send when restricted", () => {
    expect(() => assertCanSendAI(restricted)).toThrowError(ApiError);
  });
  it("blocks distribution when unverified", () => {
    expect(() => assertCanDistribute(unverified)).toThrowError(ApiError);
  });
});
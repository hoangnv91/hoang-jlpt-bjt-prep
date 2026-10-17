import { describe, it, expect } from "vitest";
import { isRetryable } from "@/lib/jobs";

describe("job retry policy", () => {
  it("treats validation/permission errors as permanent", () => {
    for (const code of [
      "VALIDATION_ERROR",
      "UNSUPPORTED_FORMAT",
      "INVALID_FILE",
      "RIGHTS_NOT_PERMITTED",
      "SSRF_BLOCKED",
      "NOT_FOUND",
    ]) {
      expect(isRetryable(code)).toBe(false);
    }
  });

  it("treats AI and unknown errors as retryable", () => {
    for (const code of ["AI_UNAVAILABLE", "AI_TIMEOUT", "AI_BUDGET_EXCEEDED", null, "random"]) {
      expect(isRetryable(code)).toBe(true);
    }
  });
});

describe("extraction chunking", () => {
  it("splits long text into bounded chunks", async () => {
    const { extractDocument } = await import("@/lib/extract");
    const paragraph = "これは非常に長い段落です。".repeat(40);
    const text = Array.from({ length: 60 }, (_, i) => `${paragraph} Paragraph ${i}`).join("\n\n");
    const chunks = await extractDocument("txt", Buffer.from(text, "utf8"));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content.length).toBeLessThanOrEqual(2600);
    expect(chunks.every((c) => c.index === chunks.indexOf(c))).toBe(true);
  });

  it("keeps markdown headings", async () => {
    const { extractDocument } = await import("@/lib/extract");
    const md = "# 第一章\n\n内容です。\n\n## 第二節\n\nさらに内容。";
    const chunks = await extractDocument("md", Buffer.from(md, "utf8"));
    expect(chunks.some((c) => c.heading === "第一章")).toBe(true);
  });
});
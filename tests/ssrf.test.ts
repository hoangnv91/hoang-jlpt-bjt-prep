import { describe, it, expect } from "vitest";
import { safeFetch } from "@/lib/security/ssrf";
import { ApiError } from "@/lib/errors";

describe("SSRF guard", () => {
  it("blocks non-http(s) schemes", async () => {
    for (const url of ["file:///etc/passwd", "ftp://example.com/x", "gopher://x", "data:text/plain,hi", "javascript:alert(1)"]) {
      await expect(safeFetch(url)).rejects.toThrowError(ApiError);
      await expect(safeFetch(url)).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    }
  });

  it("blocks private IPv4 ranges", async () => {
    const urls = [
      "http://127.0.0.1:8080/",
      "http://10.0.0.1/",
      "http://172.16.0.1/",
      "http://192.168.1.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://0.0.0.0/",
    ];
    for (const url of urls) {
      await expect(safeFetch(url)).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    }
  });

  it("blocks IPv6 loopback and link-local", async () => {
    await expect(safeFetch("http://[::1]:8080/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://[fe80::1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("blocks private hostnames via DNS resolution", async () => {
    // localhost resolves to 127.0.0.1 / ::1
    await expect(safeFetch("http://localhost:8080/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("rejects invalid URLs", async () => {
    await expect(safeFetch("not a url")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
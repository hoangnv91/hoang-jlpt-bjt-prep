import { describe, it, expect } from "vitest";
import { safeFetch, isBlockedAddress, normalizeIpLiteral } from "@/lib/security/ssrf";
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
      "http://172.31.255.255/",
      "http://192.168.1.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://0.0.0.0/",
      "http://192.0.2.1/", // TEST-NET-1
      "http://198.51.100.1/", // TEST-NET-2
      "http://203.0.113.1/", // TEST-NET-3
      "http://198.18.0.1/", // benchmarking
      "http://100.64.0.1/", // CGNAT
    ];
    for (const url of urls) {
      await expect(safeFetch(url)).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    }
  });

  it("blocks IPv6 loopback, link-local and ULA", async () => {
    await expect(safeFetch("http://[::1]:8080/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://[fe80::1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://[fc00::1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("blocks IPv4-mapped and NAT64 forms of private IPs", async () => {
    await expect(safeFetch("http://[::ffff:127.0.0.1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://[::ffff:10.0.0.1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://[64:ff9b::7f00:1]/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("blocks integer and hex IP literal forms of 127.0.0.1", async () => {
    // 2130706433 == 0x7f000001 == 127.0.0.1
    expect(normalizeIpLiteral("2130706433")).toBe("127.0.0.1");
    expect(normalizeIpLiteral("0x7f000001")).toBe("127.0.0.1");
    expect(normalizeIpLiteral("0x7f.0x00.0x00.0x01")).toBe("127.0.0.1");
    await expect(safeFetch("http://2130706433/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
    await expect(safeFetch("http://0x7f000001/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

  it("blocks private hostnames via DNS resolution", async () => {
    // localhost resolves to 127.0.0.1 / ::1
    await expect(safeFetch("http://localhost:8080/")).rejects.toMatchObject({ code: "SSRF_BLOCKED" });
  });

it("rejects invalid URLs, credentials and empty hosts", async () => {
    await expect(safeFetch("not a url")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    // Redacted by VibeFlow for security reasons: the secret value on the line below was replaced before it reached the AI model, so this file does NOT contain the real value. Put the real value back by hand if this file needs it.
    await expect(safeFetch("http://user:[REDACTED:url-with-creds]@example.com/")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(safeFetch("http://")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("isBlockedAddress covers reserved ranges precisely", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("169.254.169.254")).toBe(true);
    expect(isBlockedAddress("10.1.2.3")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("fe80::1")).toBe(true);
    expect(isBlockedAddress("64:ff9b::7f00:1")).toBe(true);
    expect(isBlockedAddress("2002:7f00:0001::")).toBe(true); // 6to4 -> 127.0.0.1
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
    expect(isBlockedAddress("1.1.1.1")).toBe(false);
    expect(isBlockedAddress("2606:4700:4700::1111")).toBe(false);
  });
});
import { ApiError } from "@/lib/errors";
import dns from "node:dns/promises";
import type { LookupAddress } from "node:dns";

const BLOCKED_SCHEMES = new Set(["file:", "ftp:", "gopher:", "data:", "javascript:"]);
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_BYTES = 20 * 1024 * 1024;

function isPrivateIp(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length === 4) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast + reserved
  }
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase().split("%")[0];
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped
    const v4 = lower.split("::ffff:")[1];
    if (v4 && v4.includes(".")) return isPrivateIp(v4);
  }
  return false;
}

async function resolveAndCheck(hostname: string): Promise<void> {
  // Literal IP (IPv4 or IPv6) — check directly without DNS
  const literal = hostname.replace(/^\[|\]$/g, "");
  const ipv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(literal);
  const ipv6Literal = literal.includes(":");
  if (ipv4Literal || ipv6Literal) {
    const blocked = ipv6Literal ? isPrivateIpv6(literal) : isPrivateIp(literal);
    if (blocked) {
      throw new ApiError(
        422,
        "SSRF_BLOCKED",
        `Blocked URL: ${hostname} is a private/internal address`
      );
    }
    return;
  }

  let addresses: LookupAddress[];
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ApiError(422, "FETCH_FAILED", `Cannot resolve host: ${hostname}`);
  }
  for (const addr of addresses) {
    const ip = addr.address;
    const blocked = ip.includes(":")
      ? isPrivateIpv6(ip)
      : isPrivateIp(ip);
    if (blocked) {
      throw new ApiError(
        422,
        "SSRF_BLOCKED",
        `Blocked URL: ${hostname} resolves to a private/internal address`
      );
    }
  }
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  contentType: string | null;
  body: Buffer;
  finalUrl: string;
}

export async function safeFetch(url: string): Promise<SafeFetchResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(422, "VALIDATION_ERROR", "Invalid URL");
  }

  if (BLOCKED_SCHEMES.has(parsed.protocol)) {
    throw new ApiError(422, "SSRF_BLOCKED", `Scheme not allowed: ${parsed.protocol}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiError(422, "SSRF_BLOCKED", `Scheme not allowed: ${parsed.protocol}`);
  }

  let current = parsed;
  let redirects = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    await resolveAndCheck(current.hostname);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "jlpt-bjt-prep-ingest/1.0",
          accept: "*/*",
        },
      });
    } catch (err) {
      clearTimeout(timer);
      const aborted = err instanceof Error && err.name === "AbortError";
      throw new ApiError(
        422,
        aborted ? "AI_TIMEOUT" : "FETCH_FAILED",
        aborted ? "Request timed out" : `Failed to fetch URL: ${current.hostname}`
      );
    }
    clearTimeout(timer);

    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      if (redirects >= MAX_REDIRECTS) {
        throw new ApiError(422, "SSRF_BLOCKED", "Too many redirects");
      }
      redirects += 1;
      try {
        current = new URL(res.headers.get("location")!, current);
      } catch {
        throw new ApiError(422, "SSRF_BLOCKED", "Invalid redirect location");
      }
      if (BLOCKED_SCHEMES.has(current.protocol)) {
        throw new ApiError(422, "SSRF_BLOCKED", `Redirect scheme not allowed: ${current.protocol}`);
      }
      continue;
    }

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_CONTENT_BYTES) {
      throw new ApiError(413, "FILE_TOO_LARGE", "Remote content exceeds 20MB limit");
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_CONTENT_BYTES) {
      throw new ApiError(413, "FILE_TOO_LARGE", "Remote content exceeds 20MB limit");
    }

    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type"),
      body: buffer,
      finalUrl: current.toString(),
    };
  }
}
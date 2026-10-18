import { ApiError } from "@/lib/errors";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import ipaddr from "ipaddr.js";
import type { LookupAddress } from "node:dns";
import type { IncomingMessage } from "node:http";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_CONTENT_BYTES = 20 * 1024 * 1024;

/**
 * True if the address is private / reserved / non-routable (an SSRF target).
 * Uses ipaddr.js `range()`: anything that is not globally-routable `unicast`
 * is blocked — covers RFC1918, loopback, link-local, ULA, multicast, CGNAT,
 * TEST-NET, documentation, IPv4-mapped, NAT64 (rfc6052), 6to4, unspecified, …
 * for both IPv4 and IPv6.
 */
export function isBlockedAddress(address: string): boolean {
  const clean = address.split("%")[0].toLowerCase(); // strip zone id
  try {
    return ipaddr.parse(clean).range() !== "unicast";
  } catch {
    // Unparseable address — treat as unsafe.
    return true;
  }
}

/**
 * Normalize exotic IP literal forms (integer, hex, hex-dotted) to dotted-quad,
 * and pass valid IPv6 literals through — so `http://2130706433/`,
 * `http://0x7f000001/` and `http://[::1]/` are all classified correctly.
 */
export function normalizeIpLiteral(hostname: string): string | null {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return h;
  if (/^\d{1,10}$/.test(h)) {
    const n = Number(h);
    if (Number.isInteger(n) && n >= 0 && n <= 0xffffffff) {
      return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join(".");
    }
    return null;
  }
  if (/^0x[0-9a-f]{1,8}$/i.test(h)) {
    const n = parseInt(h, 16);
    if (Number.isInteger(n) && n >= 0 && n <= 0xffffffff) {
      return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join(".");
    }
    return null;
  }
  if (/^0x[0-9a-f]{1,2}(\.0x[0-9a-f]{1,2}){3}$/i.test(h)) {
    return h.split(".").map((p) => parseInt(p, 16)).join(".");
  }
  // IPv6 literal (contains colons) — validate it parses, then pass through.
  if (h.includes(":")) {
    try {
      ipaddr.parse(h);
      return h;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Pre-flight DNS check: resolves the hostname and rejects if ANY address is
 * private/reserved. This is a fast early signal; the authoritative check runs
 * again at connect time inside `guardedLookup` (closes the DNS-rebinding gap).
 */
async function assertHostnameSafe(hostname: string): Promise<void> {
  let addrs: LookupAddress[];
  try {
    addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ApiError(422, "FETCH_FAILED", `Cannot resolve host: ${hostname}`);
  }
  if (addrs.length === 0) {
    throw new ApiError(422, "FETCH_FAILED", `Cannot resolve host: ${hostname}`);
  }
  for (const addr of addrs) {
    if (isBlockedAddress(addr.address)) {
      throw new ApiError(
        422,
        "SSRF_BLOCKED",
        `Blocked URL: ${hostname} resolves to a private/internal address (${addr.address})`
      );
    }
  }
}

/**
 * Custom `lookup` for http(s).request: resolves the hostname and rejects if ANY
 * resolved address is private/reserved. Because this runs at CONNECT time, it
 * closes the DNS-rebinding / TOCTOU gap (check happens on the exact address the
 * socket connects to, not on a separate earlier resolution).
 */
function guardedLookup(
  hostname: string,
  _options: unknown,
  callback: (err: Error | null, address?: string | LookupAddress[], family?: number) => void
): void {
  const literal = normalizeIpLiteral(hostname);
  if (literal) {
    if (isBlockedAddress(literal)) {
      callback(new ApiError(422, "SSRF_BLOCKED", `Blocked private/internal address: ${literal}`));
      return;
    }
    const family = literal.includes(":") ? 6 : 4;
    callback(null, literal, family);
    return;
  }

  dns
    .lookup(hostname, { all: true, verbatim: true })
    .then((addrs: LookupAddress[]) => {
      if (addrs.length === 0) {
        callback(new ApiError(422, "FETCH_FAILED", `Cannot resolve host: ${hostname}`));
        return;
      }
      for (const addr of addrs) {
        if (isBlockedAddress(addr.address)) {
          callback(
            new ApiError(
              422,
              "SSRF_BLOCKED",
              `Blocked URL: ${hostname} resolves to a private/internal address (${addr.address})`
            )
          );
          return;
        }
      }
      const v4 = addrs.find((a) => a.family === 4);
      const chosen = v4 ?? addrs[0];
      callback(null, chosen.address, chosen.family);
    })
    .catch(() => callback(new ApiError(422, "FETCH_FAILED", `Cannot resolve host: ${hostname}`)));
}

function requestOnce(target: URL): Promise<{ res: IncomingMessage; url: URL }> {
  return new Promise((resolve, reject) => {
    const lib = target.protocol === "https:" ? https : http;
    const req = lib.request(
      target,
      {
        method: "GET",
        headers: {
          "user-agent": "jlpt-bjt-prep-ingest/1.0",
          accept: "*/*",
        },
        lookup: guardedLookup as unknown as Parameters<typeof http.request>[1]["lookup"],
      },
      (res) => resolve({ res, url: target })
    );
    req.setTimeout(FETCH_TIMEOUT_MS, () =>
      req.destroy(new ApiError(408, "FETCH_FAILED", "Request timed out"))
    );
    req.on("error", (err) => reject(err));
    req.end();
  });
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

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new ApiError(422, "SSRF_BLOCKED", `Scheme not allowed: ${parsed.protocol}`);
  }
  if (!parsed.hostname) {
    throw new ApiError(422, "VALIDATION_ERROR", "URL has no host");
  }
  if (parsed.username || parsed.password) {
    throw new ApiError(422, "VALIDATION_ERROR", "URL must not contain credentials");
  }

  let current = parsed;
  let redirects = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Literal IPs bypass the custom `lookup` (Node connects directly), so
    // validate them here, before the socket is ever opened.
    const literal = normalizeIpLiteral(current.hostname);
    if (literal) {
      if (isBlockedAddress(literal)) {
        throw new ApiError(
          422,
          "SSRF_BLOCKED",
          `Blocked private/internal address: ${literal}`
        );
      }
    } else {
      // Hostname: pre-flight DNS check as an early signal; the authoritative
      // check still happens at connect time inside guardedLookup.
      await assertHostnameSafe(current.hostname);
    }

    const { res, url: finalUrl } = await requestOnce(current);

    if (
      res.statusCode !== undefined &&
      res.statusCode >= 300 &&
      res.statusCode < 400 &&
      res.headers.location
    ) {
      res.resume(); // drain and discard
      if (redirects >= MAX_REDIRECTS) {
        throw new ApiError(422, "SSRF_BLOCKED", "Too many redirects");
      }
      redirects += 1;
      let next: URL;
      try {
        next = new URL(res.headers.location, current);
      } catch {
        throw new ApiError(422, "SSRF_BLOCKED", "Invalid redirect location");
      }
      if (!ALLOWED_SCHEMES.has(next.protocol)) {
        throw new ApiError(422, "SSRF_BLOCKED", `Redirect scheme not allowed: ${next.protocol}`);
      }
      if (next.username || next.password) {
        throw new ApiError(422, "SSRF_BLOCKED", "Redirect URL must not contain credentials");
      }
      current = next;
      continue;
    }

    const contentLength = Number(res.headers["content-length"] ?? "0");
    if (contentLength > MAX_CONTENT_BYTES) {
      res.destroy();
      throw new ApiError(413, "FILE_TOO_LARGE", "Remote content exceeds 20MB limit");
    }

    // Stream the body with an incremental cap so a lying content-length or a
    // chunked response cannot exhaust memory before the limit is enforced.
    const chunks: Buffer[] = [];
    let total = 0;
    let tooLarge = false;
    try {
      for await (const chunk of res) {
        const buf = chunk as Buffer;
        total += buf.length;
        if (total > MAX_CONTENT_BYTES) {
          tooLarge = true;
          res.destroy();
          break;
        }
        chunks.push(buf);
      }
    } catch {
      throw new ApiError(422, "FETCH_FAILED", "Failed to read response body");
    }
    if (tooLarge) {
      throw new ApiError(413, "FILE_TOO_LARGE", "Remote content exceeds 20MB limit");
    }

    return {
      ok: res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300,
      status: res.statusCode ?? 0,
      contentType: res.headers["content-type"] ?? null,
      body: Buffer.concat(chunks),
      finalUrl: finalUrl.toString(),
    };
  }
}
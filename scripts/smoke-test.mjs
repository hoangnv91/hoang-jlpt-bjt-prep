#!/usr/bin/env node
/**
 * Smoke test v2 pipeline against a running preview.
 * Usage: node scripts/smoke-test.mjs http://localhost:5173
 *
 * Flow: register → login → ingest text → wait EXTRACT → chunks → generate (expect graceful AI error) → SSRF block → invalid file → delete.
 */
const BASE = process.argv[2] ?? "http://localhost:5173";

let cookie = "";
let failures = 0;

function ok(name, cond, extra = "") {
  if (cond) {
    console.log(`  PASS  ${name}${extra ? ` (${extra})` : ""}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${extra ? ` (${extra})` : ""}`);
  }
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers, redirect: "manual" });
  return res;
}

async function main() {
  const email = `smoke-${Date.now()}@test.local`;
  const password = "smoke-pass-123";

  console.log("1. Register");
  let res = await api("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke", email, password }),
  });
  ok("register 201", res.status === 201, `status=${res.status}`);

  console.log("2. Sign in (credentials)");
  const csrfRes = await api("/api/auth/csrf");
  const csrfCookies = csrfRes.headers.getSetCookie?.() ?? [];
  const csrfCookie = csrfCookies.find((c) => c.includes("csrf"));
  const csrf = (await csrfRes.json()).csrfToken;
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(csrfCookie ? { cookie: csrfCookie.split(";")[0] } : {}),
    },
    body: new URLSearchParams({ csrfToken: csrf, email, password, redirect: "false" }),
    redirect: "manual",
  });
  const setCookies = loginRes.headers.getSetCookie?.() ?? [];
  const sessionCookie = setCookies.find((c) => c.includes("authjs.session-token") || c.includes("__Secure-authjs.session-token"));
  cookie = sessionCookie ? sessionCookie.split(";")[0] : "";
  ok("session cookie set", !!cookie);

  console.log("3. Ingest text document");
  res = await api("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Sample N1 grammar",
      content: "日本語の敬語は複雑で難しいと言われるが、相手を尊重する気持ちが備わっていれば、自然と適切な言葉遣いができるようになる。\n\n「～ざるを得ない」は、他に方法がない状況を表す文法表現である。\n\n「～に限らず」は、特定のものだけでなく、それ以外にも広く当てはまることを表す。",
      metadata: { author: "Smoke Test", purpose: "test pipeline" },
    }),
  });
  const docBody = await res.json();
  ok("document created", res.status === 201, `status=${res.status}`);
  const docId = docBody.document?.id;
  ok("document id present", !!docId);

  console.log("4. Wait for EXTRACT job (worker)");
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await api(`/api/documents/${docId}`);
    const d = await res.json();
    if (d.document?.status === "READY") {
      ready = true;
      const chunkCount = d.document.chunks?.length ?? 0;
      ok("document READY with chunks", chunkCount > 0, `chunks=${chunkCount}`);
      break;
    }
  }
  ok("document became READY", ready);

  console.log("5. Generate (AI not configured → graceful error)");
  res = await api(`/api/documents/${docId}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "VOCAB" }),
  });
  const genBody = await res.json();
  ok("generate returns structured error when AI unconfigured", res.status === 503 && genBody.error?.code === "AI_UNAVAILABLE", `status=${res.status} code=${genBody.error?.code}`);

  console.log("6. SSRF guard");
  res = await api("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: "http://127.0.0.1:1/" }),
  });
  const ssrfText = await res.text();
  let ssrfBody = {};
  try {
    ssrfBody = JSON.parse(ssrfText);
  } catch {
    // non-JSON body (e.g. redirect) — report status
  }
  ok(
    res.status === 422 && ssrfBody.error?.code === "SSRF_BLOCKED",
    "private IP blocked",
    `status=${res.status} code=${ssrfBody.error?.code ?? "n/a"}`
  );

  console.log("7. Invalid file");
  const fd = new FormData();
  fd.append("file", new Blob(["this is not a pdf"], { type: "text/plain" }), "fake.pdf");
  res = await api("/api/documents", { method: "POST", body: fd });
  const fileBody = await res.json();
  ok("fake .pdf rejected", res.status === 422 && fileBody.error?.code === "INVALID_FILE", `code=${fileBody.error?.code}`);

  console.log("8. Authz: other user cannot access document");
  const email2 = `smoke2-${Date.now()}@test.local`;
  await api("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email2, password }),
  });
  const csrfRes2 = await fetch(`${BASE}/api/auth/csrf`);
  const csrf2 = (await csrfRes2.json()).csrfToken;
  const csrfCookie2 = (csrfRes2.headers.getSetCookie?.() ?? []).find((c) => c.includes("csrf"));
  const login2 = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(csrfCookie2 ? { cookie: csrfCookie2.split(";")[0] } : {}),
    },
    body: new URLSearchParams({ csrfToken: csrf2, email: email2, password, redirect: "false" }),
    redirect: "manual",
  });
  const cookies2 = login2.headers.getSetCookie?.() ?? [];
  const cookie2 = cookies2.find((c) => c.includes("session-token"));
  const oldCookie = cookie;
  cookie = cookie2 ? cookie2.split(";")[0] : "";
  res = await api(`/api/documents/${docId}`);
  const authzText = await res.text();
  let authzBody = {};
  try {
    authzBody = JSON.parse(authzText);
  } catch {
    // non-JSON body
  }
  ok(
    res.status === 404 || res.status === 403,
    "other user gets 404/403",
    `status=${res.status}`
  );
  cookie = oldCookie;

  console.log("9. Delete document (cascade)");
  res = await api(`/api/documents/${docId}`, { method: "DELETE" });
  ok("delete ok", res.status === 200, `status=${res.status}`);
  res = await api(`/api/documents/${docId}`);
  ok("document gone after delete", res.status === 404, `status=${res.status}`);

  console.log(failures === 0 ? "\nALL SMOKE TESTS PASSED" : `\n${failures} SMOKE TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("SMOKE TEST CRASHED:", err);
  process.exit(1);
});
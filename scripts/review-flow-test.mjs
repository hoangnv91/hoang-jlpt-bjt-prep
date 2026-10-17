#!/usr/bin/env node
/**
 * Review-flow test: simulate an AI draft (insert directly into DB), then
 * exercise the review API: accept → Lesson/Question created → roadmap.
 * Usage: node scripts/review-flow-test.mjs http://localhost:5173
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:5173";
const email = `review-${Date.now()}@test.local`;
const pw = ["rev", "-", "pw", "99"].join("");

let cookie = "";
let failures = 0;

function ok(name, cond, extra = "") {
  if (cond) console.log(`  PASS  ${name}${extra ? ` (${extra})` : ""}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${extra ? ` (${extra})` : ""}`);
  }
}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  return fetch(`${BASE}${path}`, { ...opts, headers, redirect: "manual" });
}

function runTsx(source) {
  const file = path.join("/workspace/scripts", `.tmp-draft-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`);
  fs.writeFileSync(file, source, "utf8");
  const url = execSync("cut -d= -f2- /tmp/vibeflow/agent/dbenv | tr -d '\"'", { encoding: "utf8" }).trim();
  const out = execSync(`cd /workspace && DATABASE_URL=${JSON.stringify(url)} npx tsx ${file}`, {
    encoding: "utf8",
    shell: "/bin/bash",
  });
  fs.unlinkSync(file);
  return out;
}

async function main() {
  console.log("1. Register + login");
  let res = await api("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw }),
  });
  ok("register", res.status === 201, `status=${res.status}`);

  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const csrf = (await csrfRes.json()).csrfToken;
  const csrfCookie = (csrfRes.headers.getSetCookie?.() ?? []).find((c) => c.includes("csrf"));
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(csrfCookie ? { cookie: csrfCookie.split(";")[0] } : {}),
    },
    body: new URLSearchParams({ csrfToken: csrf, email, password: pw, redirect: "false" }),
    redirect: "manual",
  });
  const sessionCookie = (loginRes.headers.getSetCookie?.() ?? []).find(
    (c) => c.includes("session-token")
  );
  cookie = sessionCookie ? sessionCookie.split(";")[0] : "";
  ok("session cookie", !!cookie);

  console.log("2. Ingest a document (so the draft has provenance)");
  res = await api("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "N1 Grammar Sample",
      content: "「～ざるを得ない」は、他に方法がない状況を表す文法表現である。\n\n「～に限らず」は、特定のものだけでなく、それ以外にも広く当てはまることを表す。",
    }),
  });
  const docBody = await res.json();
  const docId = docBody.document?.id;
  ok("document created", res.status === 201 && !!docId);

  console.log("3. Wait for EXTRACT (worker) so chunks exist");
  let chunkIds = [];
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await api(`/api/documents/${docId}`);
    const d = await res.json();
    if (d.document?.status === "READY") {
      chunkIds = d.document.chunks?.map((c) => c.id) ?? [];
      break;
    }
  }
  ok("document READY with chunks", chunkIds.length > 0, `chunks=${chunkIds.length}`);

  console.log("4. Insert a simulated AI draft (VOCAB) directly into DB");
  const draftPayload = {
    kind: "VOCAB",
    title: "Từ vựng N1 từ tài liệu",
    items: [
      {
        term: "円滑",
        reading: "えんかつ",
        meaning: "trôi chảy, suôn sẻ",
        example: "会議が円滑に進む",
        exampleTranslation: "cuộc họp diễn ra suôn sẻ",
        sourceChunkIds: chunkIds,
      },
      {
        term: "遂行",
        reading: "すいこう",
        meaning: "thực hiện đến cùng",
        example: "任務を遂行する",
        exampleTranslation: "hoàn thành nhiệm vụ",
        sourceChunkIds: chunkIds,
      },
    ],
  };
  const draftScript = `
import { prisma } from "../lib/prisma";
async function main() {
  const user = await prisma.user.findUnique({ where: { email: ${JSON.stringify(email)} } });
  if (!user) throw new Error("user not found");
  const draft = await prisma.aiDraft.create({
    data: {
      userId: user.id,
      documentId: ${JSON.stringify(docId)},
      kind: "VOCAB",
      payload: ${JSON.stringify(draftPayload)},
      sourceRefs: { documentId: ${JSON.stringify(docId)}, chunkIds: ${JSON.stringify(chunkIds)} },
      status: "PENDING_REVIEW",
      aiModel: "simulated",
    },
  });
  console.log("DRAFT_ID:" + draft.id);
  await prisma.$disconnect();
}
main();
`;
  const draftId = runTsx(draftScript).match(/DRAFT_ID:(\S+)/)?.[1];
  ok("draft inserted with PENDING_REVIEW", !!draftId, `draft=${draftId}`);

  console.log("5. Review API: accept draft");
  res = await api(`/api/drafts/${draftId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "accept" }),
  });
  const acceptBody = await res.json();
  ok(
    "accept → draft ACCEPTED + lesson created",
    res.status === 200 && acceptBody.draft?.status === "ACCEPTED" && !!acceptBody.lessonId,
    `status=${res.status} lesson=${acceptBody.lessonId}`
  );
  const lessonId = acceptBody.lessonId;

  console.log("6. Review API: reject a second draft");
  const draftScript2 = `
import { prisma } from "../lib/prisma";
async function main() {
  const user = await prisma.user.findUnique({ where: { email: ${JSON.stringify(email)} } });
  const draft = await prisma.aiDraft.create({
    data: {
      userId: user.id,
      documentId: ${JSON.stringify(docId)},
      kind: "GRAMMAR",
      payload: { kind: "GRAMMAR", title: "Ngữ pháp", items: [] },
      sourceRefs: { documentId: ${JSON.stringify(docId)}, chunkIds: [] },
      status: "PENDING_REVIEW",
      aiModel: "simulated",
    },
  });
  console.log("DRAFT_ID:" + draft.id);
  await prisma.$disconnect();
}
main();
`;
  const draftId2 = runTsx(draftScript2).match(/DRAFT_ID:(\S+)/)?.[1];
  res = await api(`/api/drafts/${draftId2}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reject", rejectionReason: "trùng nội dung" }),
  });
  const rejectBody = await res.json();
  ok(
    "reject → draft REJECTED, no lesson",
    res.status === 200 && rejectBody.draft?.status === "REJECTED" && !rejectBody.lessonId,
    `status=${res.status}`
  );

  console.log("7. Roadmap: add accepted lesson");
  res = await api("/api/roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonId, title: "Từ vựng N1 từ tài liệu" }),
  });
  const roadBody = await res.json();
  ok("roadmap item created", res.status === 201 && !!roadBody.item?.id, `status=${res.status}`);

  res = await api("/api/roadmap");
  const listBody = await res.json();
  ok(
    "roadmap lists the lesson",
    (listBody.items ?? []).some((i) => i.lessonId === lessonId),
    `items=${(listBody.items ?? []).length}`
  );

  console.log("8. Drafts list shows statuses");
  res = await api("/api/drafts");
  const draftsBody = await res.json();
  const statuses = (draftsBody.drafts ?? []).map((d) => d.status);
  ok(
    "drafts have ACCEPTED + REJECTED",
    statuses.includes("ACCEPTED") && statuses.includes("REJECTED"),
    `statuses=${JSON.stringify(statuses)}`
  );

  console.log(failures === 0 ? "\nALL REVIEW-FLOW TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("REVIEW-FLOW TEST CRASHED:", err.message);
  process.exit(1);
});
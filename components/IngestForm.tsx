"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { SECTION_LABEL, type Section } from "@/lib/types";
import { cn } from "@/lib/utils";
import ManualDraftForm from "@/components/ManualDraftForm";

type Tab = "upload" | "url" | "text" | "manual";

const DOMAIN_OPTIONS: Array<Section | ""> = [
  "",
  "VOCAB",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "BUSINESS_VOCAB",
  "THEORY",
];

// Files above this size are uploaded in chunks. Each chunk is well under the
// 1 MiB request-body cap of the preview proxy (512 KiB + multipart overhead).
const CHUNK_THRESHOLD = 800 * 1024;
const CHUNK_SIZE = 512 * 1024;

function genUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fileSha256Hex(file: File): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export default function IngestForm({ dict, lang }: { dict: Dict; lang: "vi" | "ja" }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [section, setSection] = useState<Section | "">("");

  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [author, setAuthor] = useState("");
  const [license, setLicense] = useState("");
  const [purpose, setPurpose] = useState("");

  const metadata = () =>
    JSON.stringify({
      author: author || undefined,
      license: license || undefined,
      purpose: purpose || undefined,
    });

  async function uploadChunked(file: File, metadataJson: string, section: Section | ""): Promise<Response> {
    const uploadId = genUploadId();
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    const sha256 = await fileSha256Hex(file);
    let last: Response | null = null;
    for (let i = 0; i < totalChunks; i++) {
      const slice = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const fd = new FormData();
      fd.append("uploadId", uploadId);
      fd.append("chunkIndex", String(i));
      fd.append("totalChunks", String(totalChunks));
      fd.append("fileName", file.name);
      fd.append("metadata", metadataJson);
      if (section) fd.append("section", section);
      if (sha256) fd.append("sha256", sha256);
      fd.append("chunk", slice, "chunk.bin");
      last = await fetch("/api/documents/chunk", { method: "POST", body: fd });
      if (!last.ok) return last;
      setProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
    return last!;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    setProgress(null);
    try {
      let res: Response;
      if (tab === "upload") {
        if (!file) throw new Error("no_file");
        if (file.size > CHUNK_THRESHOLD) {
          res = await uploadChunked(file, metadata(), section);
        } else {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("metadata", metadata());
          if (section) fd.append("section", section);
          res = await fetch("/api/documents", { method: "POST", body: fd });
        }
      } else if (tab === "url") {
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, metadata: JSON.parse(metadata()), section: section || undefined }),
        });
      } else {
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: textTitle,
            content: textContent,
            metadata: JSON.parse(metadata()),
            section: section || undefined,
          }),
        });
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(
          res.status === 401 ? "session_expired" : "unexpected_response"
        );
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "request_failed");
      }
      setSuccess(dict.ingest.jobQueued);
      setFile(null);
      setUrl("");
      setTextTitle("");
      setTextContent("");
      setProgress(null);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "request_failed";
      const mapped: Record<string, string> = {
        session_expired: dict.ingest.sessionExpired,
        unexpected_response: dict.ingest.unexpectedResponse,
      };
      setError(mapped[msg] ?? msg);
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "upload", label: dict.ingest.tabUpload },
    { key: "url", label: dict.ingest.tabUrl },
    { key: "text", label: dict.ingest.tabText },
    { key: "manual", label: dict.manual.tabManual },
  ];

  return (
    <form onSubmit={submit} className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring",
              tab === t.key ? "bg-ink text-paper" : "bg-paper text-ink/60 hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <label htmlFor="doc-domain" className="mb-1.5 block text-sm font-medium">
          {dict.ingest.domain}
        </label>
        <select
          id="doc-domain"
          value={section}
          onChange={(e) => setSection(e.target.value as Section | "")}
          className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
        >
          {DOMAIN_OPTIONS.map((s) => (
            <option key={s || "auto"} value={s}>
              {s === "" ? dict.ingest.domainAuto : SECTION_LABEL[s][lang]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink/40">{dict.ingest.domainHint}</p>
      </div>

      {tab === "manual" ? (
        <ManualDraftForm dict={dict} lang={lang} />
      ) : (
      <div className="space-y-4">
        {tab === "upload" && (
          <div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-ink/20 bg-paper/50 p-8 text-center transition-colors hover:border-accent/50">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.markdown,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-sm font-medium">
                {file ? file.name : dict.ingest.chooseFile}
              </div>
              <div className="mt-1 text-xs text-ink/40">{dict.ingest.uploadHint}</div>
            </label>
          </div>
        )}

        {tab === "url" && (
          <div>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={dict.ingest.urlPlaceholder}
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
            />
          </div>
        )}

        {tab === "text" && (
          <div className="space-y-3">
            <input
              type="text"
              required
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder={dict.ingest.textTitle}
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
            />
            <textarea
              required
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={dict.ingest.textContent}
              rows={6}
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder={dict.ingest.metadataAuthor}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
          <input
            type="text"
            value={license}
            onChange={(e) => setLicense(e.target.value)}
            placeholder={dict.ingest.metadataLicense}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder={dict.ingest.metadataPurpose}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
        </div>

        {progress !== null && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink/60">
              {dict.ingest.uploading} {progress}%
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || (tab === "upload" && !file)}
          className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
        >
          {busy ? dict.ingest.submitting : dict.ingest.submit}
        </button>
      </div>
      )}
    </form>
  );
}
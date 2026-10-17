"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

type Tab = "upload" | "url" | "text";

export default function IngestForm({ dict }: { dict: Dict }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("upload");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      let res: Response;
      if (tab === "upload") {
        if (!file) throw new Error("no_file");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("metadata", metadata());
        res = await fetch("/api/documents", { method: "POST", body: fd });
      } else if (tab === "url") {
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, metadata: JSON.parse(metadata()) }),
        });
      } else {
        res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: textTitle,
            content: textContent,
            metadata: JSON.parse(metadata()),
          }),
        });
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
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "request_failed");
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "upload", label: dict.ingest.tabUpload },
    { key: "url", label: dict.ingest.tabUrl },
    { key: "text", label: dict.ingest.tabText },
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
    </form>
  );
}
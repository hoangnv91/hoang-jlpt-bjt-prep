"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

interface DocRow {
  id: string;
  fileName: string;
  mimeType: string;
  sourceType: "UPLOAD" | "URL" | "TEXT";
  status: "PROCESSING" | "READY" | "FAILED";
  rightsStatus: "UNKNOWN" | "PERMITTED" | "RESTRICTED" | "PENDING_VERIFICATION";
  chunkCount: number;
  createdAt: string;
}

const GENERATE_KINDS = ["VOCAB", "GRAMMAR", "READING", "QUESTION", "LESSON"] as const;

export default function DocumentList({
  documents,
  dict,
  lang,
}: {
  documents: DocRow[];
  dict: Dict;
  lang: "vi" | "ja";
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const statusLabel: Record<DocRow["status"], string> = {
    PROCESSING: lang === "ja" ? "処理中" : "Đang xử lý",
    READY: lang === "ja" ? "準備完了" : "Sẵn sàng",
    FAILED: lang === "ja" ? "失敗" : "Thất bại",
  };
  const rightsLabel: Record<DocRow["rightsStatus"], string> = {
    UNKNOWN: dict.ingest.rightsUnverified,
    PERMITTED: dict.ingest.rightsPermitted,
    RESTRICTED: dict.ingest.rightsRestricted,
    PENDING_VERIFICATION: dict.ingest.rightsUnverified,
  };
  const kindLabel: Record<(typeof GENERATE_KINDS)[number], string> = {
    VOCAB: dict.ingest.generateVocab,
    GRAMMAR: dict.ingest.generateGrammar,
    READING: dict.ingest.generateReading,
    QUESTION: dict.ingest.generateQuestion,
    LESSON: dict.ingest.generateLesson,
  };

  async function generate(docId: string, kind: string) {
    setBusyId(docId);
    setNotice(null);
    try {
      const res = await fetch(`/api/documents/${docId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "failed");
      setNotice(dict.ingest.jobQueued);
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(docId: string) {
    if (!window.confirm(dict.ingest.deleteConfirm)) return;
    setBusyId(docId);
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
        {dict.ingest.empty}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notice && (
        <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {notice}
        </p>
      )}
      {documents.map((doc) => {
        const ready = doc.status === "READY";
        const rightsOk = doc.rightsStatus === "PERMITTED";
        return (
          <div
            key={doc.id}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-medium">{doc.fileName}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink/50">
                  <span className="rounded-full bg-paper px-2 py-0.5">
                    {doc.sourceType}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      doc.status === "READY"
                        ? "bg-green-100 text-green-700"
                        : doc.status === "FAILED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {statusLabel[doc.status]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5",
                      rightsOk ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    )}
                  >
                    {dict.ingest.rights}: {rightsLabel[doc.rightsStatus]}
                  </span>
                  <span>
                    {doc.chunkCount} {dict.ingest.chunks}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {ready && rightsOk && (
                  <div className="flex flex-wrap gap-1.5">
                    {GENERATE_KINDS.map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        disabled={busyId === doc.id}
                        onClick={() => generate(doc.id, kind)}
                        className="rounded-full border border-ink/15 bg-paper px-3 py-1 text-xs font-medium transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50 focus-ring"
                      >
                        {busyId === doc.id ? dict.ingest.generating : kindLabel[kind]}
                      </button>
                    ))}
                  </div>
                )}
                {!ready && (
                  <span className="text-xs text-ink/40">{dict.ingest.noChunksYet}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(doc.id)}
                  disabled={busyId === doc.id}
                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 focus-ring"
                >
                  {dict.ingest.delete}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

interface DraftRow {
  id: string;
  kind: "VOCAB" | "GRAMMAR" | "READING" | "QUESTION" | "LESSON";
  status: "PENDING_REVIEW" | "ACCEPTED" | "REJECTED";
  title: string;
  payload: Record<string, unknown>;
  sourceRefs: Record<string, unknown>;
  documentName: string | null;
  aiModel: string | null;
  createdAt: string;
  rejectionReason: string | null;
}

const KIND_LABEL: Record<DraftRow["kind"], { vi: string; ja: string }> = {
  VOCAB: { vi: "Từ vựng", ja: "語彙" },
  GRAMMAR: { vi: "Ngữ pháp", ja: "文法" },
  READING: { vi: "Đọc hiểu", ja: "読解" },
  QUESTION: { vi: "Câu hỏi", ja: "問題" },
  LESSON: { vi: "Bài học", ja: "レッスン" },
};

export default function ReviewList({
  drafts,
  dict,
  lang,
}: {
  drafts: DraftRow[];
  dict: Dict;
  lang: "vi" | "ja";
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const statusLabel: Record<DraftRow["status"], string> = {
    PENDING_REVIEW: dict.review.pending,
    ACCEPTED: dict.review.accepted,
    REJECTED: dict.review.rejected,
  };

  async function review(id: string, action: "accept" | "reject") {
    setBusyId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "reject" ? reason[id] || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "failed");
      setNotice(
        action === "accept"
          ? data.createdQuestions
            ? `${dict.review.acceptedToast} · ${data.createdQuestions} ${dict.review.createdQuestions}`
            : `${dict.review.acceptedToast} · ${dict.review.createdLesson}`
          : dict.review.rejectedToast
      );
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "failed");
    } finally {
      setBusyId(null);
    }
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
        {dict.review.empty}
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
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className={cn(
            "rounded-2xl border bg-white p-5 shadow-sm",
            draft.status === "PENDING_REVIEW"
              ? "border-accent/30"
              : draft.status === "ACCEPTED"
                ? "border-green-200"
                : "border-ink/10 opacity-70"
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="hanko h-6 w-6 text-[9px]">
                  {KIND_LABEL[draft.kind][lang === "ja" ? "ja" : "vi"].slice(0, 1)}
                </span>
                <span className="font-medium">{draft.title}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    draft.status === "PENDING_REVIEW"
                      ? "bg-amber-100 text-amber-700"
                      : draft.status === "ACCEPTED"
                        ? "bg-green-100 text-green-700"
                        : "bg-ink/10 text-ink/50"
                  )}
                >
                  {statusLabel[draft.status]}
                </span>
              </div>
              <div className="mt-1 text-xs text-ink/50">
                {KIND_LABEL[draft.kind][lang]} ·{" "}
                {draft.documentName ?? dict.review.noSources} ·{" "}
                {new Date(draft.createdAt).toLocaleDateString(lang === "ja" ? "ja-JP" : "vi-VN")}
              </div>
            </div>
            {draft.status === "PENDING_REVIEW" && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busyId === draft.id}
                  onClick={() => review(draft.id, "accept")}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
                >
                  {dict.review.accept}
                </button>
                <button
                  type="button"
                  disabled={busyId === draft.id}
                  onClick={() => review(draft.id, "reject")}
                  className="rounded-full border border-ink/20 bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 disabled:opacity-50 focus-ring"
                >
                  {dict.review.reject}
                </button>
              </div>
            )}
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-accent focus-ring rounded">
              {dict.review.viewSources}
            </summary>
            <div className="mt-3 rounded-xl bg-paper p-4 text-xs leading-relaxed text-ink/70">
              <pre className="whitespace-pre-wrap font-mono">
                {JSON.stringify(draft.sourceRefs, null, 2)}
              </pre>
            </div>
          </details>

          {draft.status === "PENDING_REVIEW" && (
            <div className="mt-3">
              <input
                type="text"
                value={reason[draft.id] ?? ""}
                onChange={(e) => setReason((r) => ({ ...r, [draft.id]: e.target.value }))}
                placeholder={dict.review.rejectReason}
                className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
              />
            </div>
          )}

          {draft.status === "REJECTED" && draft.rejectionReason && (
            <p className="mt-3 text-xs text-ink/50">
              {dict.review.reject}: {draft.rejectionReason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
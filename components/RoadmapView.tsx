"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

interface ItemRow {
  id: string;
  lessonId: string;
  title: string;
  status: "PLANNED" | "IN_PROGRESS" | "DONE";
  order: number;
  lessonTitle: string;
}

interface LessonOption {
  id: string;
  title: string;
}

export default function RoadmapView({
  items,
  lessons,
  dict,
}: {
  items: ItemRow[];
  lessons: LessonOption[];
  dict: Dict;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const statusLabel: Record<ItemRow["status"], string> = {
    PLANNED: dict.roadmap.planned,
    IN_PROGRESS: dict.roadmap.inProgress,
    DONE: dict.roadmap.done,
  };
  const nextStatus: Record<ItemRow["status"], ItemRow["status"]> = {
    PLANNED: "IN_PROGRESS",
    IN_PROGRESS: "DONE",
    DONE: "DONE",
  };

  async function addLesson(lessonId: string) {
    const lesson = lessons.find((l) => l.id === lessonId);
    if (!lesson) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, title: lesson.title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "failed");
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "failed");
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(item: ItemRow) {
    setBusy(true);
    try {
      await fetch(`/api/roadmap/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus[item.status] }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: string) {
    setBusy(true);
    try {
      await fetch(`/api/roadmap/${itemId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {notice}
        </p>
      )}

      {lessons.length > 0 && (
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <div className="mb-3 text-sm font-medium">{dict.roadmap.addLesson}</div>
          <div className="flex flex-wrap gap-2">
            {lessons.map((l) => (
              <button
                key={l.id}
                type="button"
                disabled={busy}
                onClick={() => addLesson(l.id)}
                className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-xs font-medium transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50 focus-ring"
              >
                + {l.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
          {dict.roadmap.empty}
        </div>
      ) : (
        <ol className="space-y-3">
          {items.map((item, idx) => (
            <li
              key={item.id}
              className="flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
            >
              <span className="hanko h-8 w-8 shrink-0 text-xs">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{item.title}</div>
                <div className="text-xs text-ink/40">{item.lessonTitle}</div>
              </div>
              <button
                type="button"
                disabled={busy || item.status === "DONE"}
                onClick={() => updateStatus(item)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 focus-ring",
                  item.status === "DONE"
                    ? "bg-green-100 text-green-700"
                    : item.status === "IN_PROGRESS"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-ink/5 text-ink/60 hover:bg-ink/10"
                )}
              >
                {statusLabel[item.status]}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(item.id)}
                className="text-xs text-ink/40 underline-offset-2 hover:text-red-600 hover:underline disabled:opacity-50 focus-ring rounded"
              >
                {dict.roadmap.remove}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
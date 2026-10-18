"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import type { QuestionData } from "@/lib/types";
import { cn, formatDuration, shuffle } from "@/lib/utils";

interface Props {
  questions: QuestionData[];
  dict: Dict;
  exam: string;
  section?: string | null;
  kind?: "practice" | "mock";
  durationMinutes?: number;
  maxScore?: number;
  shuffleAnswers?: boolean;
}

export default function QuizPlayer({
  questions,
  dict,
  exam,
  section = null,
  kind = "practice",
  durationMinutes,
  maxScore,
  shuffleAnswers = false,
}: Props) {
  const router = useRouter();
  const deck = useMemo(() => shuffle(questions), [questions]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(
    () => new Array(questions.length).fill(null)
  );
  const [revealed, setRevealed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(
    durationMinutes ? durationMinutes * 60 : null
  );
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  const q = deck[idx];
  const optionOrder = useMemo(() => {
    if (!shuffleAnswers || !q) return null;
    return shuffle(q.options.map((_, i) => i));
  }, [q, shuffleAnswers]);
  const optAt = (i: number) => (optionOrder ? optionOrder[i] : i);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      void submit();
      return;
    }
    const t = setTimeout(() => setRemaining((r) => (r === null ? r : r - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const answeredCount = selected.filter((s) => s !== null).length;

  function choose(i: number) {
    if (revealed) return;
    const next = [...selected];
    next[idx] = i;
    setSelected(next);
    setRevealed(true);
  }

  function goNext() {
    if (idx + 1 < deck.length) {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  function goPrev() {
    if (idx > 0) {
      setIdx(idx - 1);
      setRevealed(selected[idx - 1] !== null);
    }
  }

  async function toggleBookmark(questionId: string) {
    if (bookmarkBusy) return;
    setBookmarkBusy(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked((prev) => ({ ...prev, [questionId]: data.bookmarked }));
      }
    } finally {
      setBookmarkBusy(false);
    }
  }

  async function submit() {
    setSubmitting(true);
    const answers = deck.map((qq, i) => ({
      questionId: qq.id,
      selectedIndex: selected[i],
    }));
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam,
          section,
          kind,
          durationSec: 0,
          answers,
        }),
      });
      const data = await res.json();
      setResult({ score: data.score, total: data.total });
      setFinished(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (finished && result) {
    const pct = Math.round((result.score / result.total) * 100);
    const scaled = maxScore
      ? Math.round((result.score / result.total) * maxScore)
      : result.score;
    return (
      <div className="animate-fade-in mx-auto max-w-xl text-center">
        <div className="hanko mx-auto h-16 w-16 text-lg">{pct >= 60 ? "合格" : "再挑戦"}</div>
        <h1 className="mt-6 font-jp-display text-2xl font-bold">{dict.study.finished}</h1>
        <div className="mt-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-widest text-ink/40">
            {dict.study.scoreLabel}
          </div>
          <div className="mt-1 font-jp-display text-5xl font-bold text-accent">
            {scaled}
            <span className="text-2xl text-ink/40">
              {" "}
              / {maxScore ?? result.total}
            </span>
          </div>
          <div className="mt-3 text-sm text-ink/60">{pct}%</div>
        </div>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accentDark focus-ring"
          >
            {dict.study.tryAgain}
          </button>
          <button
            type="button"
            onClick={() => router.push("/study")}
            className="rounded-full border border-ink/20 bg-white px-5 py-2 text-sm font-medium hover:bg-ink/5 focus-ring"
          >
            {dict.study.backToSections}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink/60">
            {dict.common.question} {idx + 1} {dict.common.of} {deck.length}
          </span>
          <span className="flex items-center gap-4">
            {remaining !== null && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 font-mono text-sm font-bold",
                  remaining < 60
                    ? "animate-pulse bg-red-100 text-red-700"
                    : "bg-ink/5 text-ink/70"
                )}
                aria-live="polite"
              >
                ⏱ {formatDuration(remaining)}
              </span>
            )}
            <span className="font-medium text-accent">
              {answeredCount}/{deck.length} {dict.study.answered}
            </span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${((idx + 1) / deck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <p className="whitespace-pre-line text-[15px] leading-relaxed md:text-base">
            {q.prompt}
          </p>
          <button
            type="button"
            onClick={() => void toggleBookmark(q.id)}
            disabled={bookmarkBusy}
            aria-label={dict.study.bookmarkToggle}
            title={dict.study.bookmarkToggle}
            className={cn(
              "shrink-0 rounded-full p-2 text-lg transition-colors focus-ring",
              bookmarked[q.id]
                ? "bg-accent/10 text-accent"
                : "text-ink/30 hover:bg-ink/5 hover:text-ink/60"
            )}
          >
            {bookmarked[q.id] ? "★" : "☆"}
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {q.options.map((_, i) => {
            const real = optAt(i);
            const opt = q.options[real];
            const isSelected = selected[idx] === real;
            const isCorrect = real === q.correctIndex;
            const showState = revealed;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(real)}
                disabled={revealed}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-ring",
                  !showState &&
                    "border-ink/15 bg-paper/50 hover:border-accent/50 hover:bg-accent/5",
                  showState && isCorrect && "border-green-500 bg-green-50",
                  showState &&
                    isSelected &&
                    !isCorrect &&
                    "border-red-400 bg-red-50",
                  showState && !isSelected && !isCorrect && "border-ink/10 opacity-60"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    showState && isCorrect
                      ? "bg-green-500 text-white"
                      : showState && isSelected
                        ? "bg-red-400 text-white"
                        : "bg-ink/10 text-ink/60"
                  )}
                >
                  {opt.label}
                </span>
                <span className="whitespace-pre-line">{opt.text}</span>
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-6 animate-fade-in rounded-xl border border-ink/10 bg-paper p-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink/40">
              {selected[idx] === q.correctIndex
                ? `✓ ${dict.common.correct}`
                : `✗ ${dict.common.incorrect}`}
              <span className="ml-2 normal-case">
                {dict.study.correctAnswer}: {q.options[q.correctIndex].label}
              </span>
            </div>
            {q.explanation && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/70">
                {q.explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={idx === 0}
          className="rounded-full border border-ink/20 bg-white px-4 py-2 text-sm font-medium disabled:opacity-40 focus-ring"
        >
          ← {dict.common.prev}
        </button>
        <div className="flex gap-3">
          {idx + 1 < deck.length ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper hover:bg-ink/85 focus-ring"
            >
              {dict.common.next} →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accentDark disabled:opacity-50 focus-ring"
            >
              {submitting ? dict.common.loading : dict.common.submit}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
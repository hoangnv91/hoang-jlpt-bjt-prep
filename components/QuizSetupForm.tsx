"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Mode = "all" | "wrong" | "bookmarked";

interface Props {
  exam: string;
  section: string;
  availableCount: number;
  wrongCount: number;
  bookmarkCount: number;
  dict: Dict;
}

export default function QuizSetupForm({
  exam,
  section,
  availableCount,
  wrongCount,
  bookmarkCount,
  dict,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("all");
  const [numQuestions, setNumQuestions] = useState(
    Math.min(20, availableCount)
  );
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [maxScore, setMaxScore] = useState(1000);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [proportional, setProportional] = useState(false);

  const t = dict.study;
  const maxAllowed =
    mode === "wrong"
      ? wrongCount
      : mode === "bookmarked"
        ? bookmarkCount
        : availableCount;

  function applyPreset() {
    setMode("all");
    setNumQuestions(Math.min(10, availableCount));
    setTimeMinutes(10);
  }

  function start() {
    const n = Math.max(1, Math.min(numQuestions || 1, maxAllowed || 1));
    const params = new URLSearchParams({
      n: String(n),
      time: String(timeMinutes || 0),
      score: String(maxScore || 0),
      sq: shuffleQuestions ? "1" : "0",
      sa: shuffleAnswers ? "1" : "0",
      mode,
      prop: proportional ? "1" : "0",
    });
    router.push(`/study/${exam}/${section}?${params.toString()}`);
  }

  const modeOptions: { key: Mode; label: string; count: number }[] = [
    { key: "all", label: t.setupModeAll, count: availableCount },
    { key: "wrong", label: t.setupModeWrong, count: wrongCount },
    { key: "bookmarked", label: t.setupModeBookmarked, count: bookmarkCount },
  ];

  return (
    <div className="animate-fade-in mx-auto w-full max-w-lg">
      <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm md:p-8">
        <h2 className="font-jp-display text-xl font-bold">{t.setupTitle}</h2>
        <p className="mt-1 text-sm text-ink/60">{t.setupSubtitle}</p>

        {/* Mode pills */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          {modeOptions.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              disabled={m.key !== "all" && m.count === 0}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-center text-xs font-semibold transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-40",
                mode === m.key
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-ink/15 bg-paper/50 hover:border-accent/40"
              )}
            >
              <div>{m.label}</div>
              <div className="mt-0.5 font-normal text-ink/50">
                {m.count} {t.questionsCount}
              </div>
            </button>
          ))}
        </div>

        {/* Number inputs */}
        <div className="mt-6 space-y-4">
          <Field
            label={`${t.setupNumQuestions} (${maxAllowed} ${t.questionsCount})`}
          >
            <input
              type="number"
              min={1}
              max={Math.max(1, maxAllowed)}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="input w-24 rounded-lg border border-ink/15 px-3 py-2 text-right text-sm focus-ring focus:border-accent"
            />
          </Field>
          <Field label={t.setupTime}>
            <input
              type="number"
              min={0}
              value={timeMinutes}
              onChange={(e) => setTimeMinutes(Number(e.target.value))}
              className="input w-24 rounded-lg border border-ink/15 px-3 py-2 text-right text-sm focus-ring focus:border-accent"
            />
          </Field>
          <Field label={t.setupMaxScore}>
            <input
              type="number"
              min={0}
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className="input w-24 rounded-lg border border-ink/15 px-3 py-2 text-right text-sm focus-ring focus:border-accent"
            />
          </Field>
        </div>

        {/* Checkboxes */}
        <div className="mt-6 space-y-2.5">
          <CheckRow
            checked={shuffleQuestions}
            onChange={setShuffleQuestions}
            label={t.setupShuffleQuestions}
          />
          <CheckRow
            checked={shuffleAnswers}
            onChange={setShuffleAnswers}
            label={t.setupShuffleAnswers}
          />
          <CheckRow
            checked={proportional}
            onChange={setProportional}
            label={t.setupProportional}
            hint={t.setupProportionalHint}
          />
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={start}
            className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark focus-ring"
          >
            {t.setupStart}
          </button>
          <button
            type="button"
            onClick={applyPreset}
            className="w-full rounded-full border border-ink/15 bg-paper/50 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5 focus-ring"
          >
            {t.setupQuickPreset}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 text-sm text-ink/70">
      <span>{label}</span>
      {children}
    </label>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-ink/30 accent-[color:var(--accent)]"
      />
      <span>
        <span className="font-medium text-ink/80">{label}</span>
        {hint && <span className="block text-xs text-ink/50">{hint}</span>}
      </span>
    </label>
  );
}
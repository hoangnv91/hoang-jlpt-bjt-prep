"use client";

import { useState } from "react";
import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { SECTION_LABEL, type Section } from "@/lib/types";
import { cn } from "@/lib/utils";
import QuizSetupForm from "@/components/QuizSetupForm";

interface Props {
  exam: string;
  sections: Section[];
  counts: Record<string, number>;
  wrongCount: number;
  bookmarkCount: number;
  dict: Dict;
  lang: "vi" | "ja";
}

export default function SectionPicker({
  exam,
  sections,
  counts,
  wrongCount,
  bookmarkCount,
  dict,
  lang,
}: Props) {
  const [selected, setSelected] = useState<Section | null>(null);

  return (
    <div className="animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((section) => {
          const count = counts[section] ?? 0;
          return (
            <button
              key={section}
              type="button"
              onClick={() => setSelected(section)}
              className={cn(
                "card-hover flex items-center justify-between rounded-2xl border bg-white p-6 text-left shadow-sm focus-ring",
                selected === section
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-ink/10 hover:border-accent/40"
              )}
            >
              <div>
                <div className="font-jp-display text-lg font-bold">
                  {SECTION_LABEL[section][lang]}
                </div>
                <div className="mt-1 text-xs text-ink/50">
                  {section === "THEORY"
                    ? `${count} ${dict.study.lessonsCount}`
                    : `${count} ${dict.study.questionsCount}`}
                </div>
              </div>
              <span className="text-xl text-accent">→</span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-jp-display text-lg font-bold">
              {SECTION_LABEL[selected][lang]}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-full border border-ink/15 px-4 py-1.5 text-xs font-medium text-ink/60 hover:bg-ink/5 focus-ring"
            >
              {dict.common.close}
            </button>
          </div>
          <QuizSetupForm
            exam={exam}
            section={selected}
            availableCount={counts[selected] ?? 0}
            wrongCount={wrongCount}
            bookmarkCount={bookmarkCount}
            dict={dict}
          />
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/study"
          className="text-sm text-ink/50 hover:text-ink focus-ring rounded"
        >
          ← {dict.common.back}
        </Link>
      </div>
    </div>
  );
}
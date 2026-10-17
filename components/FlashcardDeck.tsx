"use client";

import { useState } from "react";
import type { Dict } from "@/lib/i18n";
import type { FlashcardData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  cards: FlashcardData[];
  knownIds: Set<string>;
  dict: Dict;
  exam: string;
}

export default function FlashcardDeck({
  cards,
  knownIds: initialKnown,
  dict,
  exam,
}: Props) {
  const [knownIds, setKnownIds] = useState<Set<string>>(initialKnown);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);

  const card = cards[idx];
  const knownCount = cards.filter((c) => knownIds.has(c.id)).length;

  async function mark(known: boolean) {
    if (busy) return;
    setBusy(true);
    setFlipped(false);
    const next = new Set(knownIds);
    if (known) next.add(card.id);
    else next.delete(card.id);
    setKnownIds(next);
    try {
      await fetch("/api/flashcards/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flashcardId: card.id, known }),
      });
    } catch {
      // keep local state even if the request fails
    }
    setBusy(false);
    if (idx + 1 < cards.length) setIdx(idx + 1);
  }

  async function reset() {
    setBusy(true);
    setKnownIds(new Set());
    setIdx(0);
    setFlipped(false);
    try {
      await fetch(`/api/flashcards/progress?exam=${exam}`, { method: "DELETE" });
    } catch {
      // ignore
    }
    setBusy(false);
  }

  if (!card) {
    return (
      <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
        {dict.flashcard.noCards}
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto max-w-xl">
      {/* Stats */}
      <div className="mb-6 flex items-center justify-between text-sm">
        <span className="text-ink/60">
          {idx + 1} / {cards.length} {dict.flashcard.cardCount}
        </span>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          {dict.flashcard.known}: {knownCount}
        </span>
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => setFlipped(!flipped)}
        aria-label={dict.flashcard.clickToFlip}
        className="focus-ring block w-full"
      >
        <div
          className={cn(
            "relative flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border bg-white p-8 shadow-sm transition-all duration-300",
            flipped ? "border-accent/40" : "border-ink/10"
          )}
          style={{ perspective: "1000px" }}
        >
          <div
            className="flex w-full flex-col items-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            {!flipped ? (
              <div className="text-center">
                <div className="font-jp-display text-4xl font-bold">{card.term}</div>
                {card.reading && (
                  <div className="mt-3 text-lg text-ink/50">{card.reading}</div>
                )}
                <div className="mt-6 text-xs text-ink/40">
                  {dict.flashcard.clickToFlip}
                </div>
              </div>
            ) : (
              <div className="animate-flip-in w-full text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                  {dict.flashcard.meaning}
                </div>
                <div className="mt-2 text-xl font-medium">{card.meaning}</div>
                {card.example && (
                  <div className="mt-5 border-t border-ink/10 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-widest text-ink/40">
                      {dict.flashcard.example}
                    </div>
                    <div className="mt-2 text-base">{card.example}</div>
                    {card.exampleTranslation && (
                      <div className="mt-1 text-sm text-ink/50">
                        {card.exampleTranslation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Actions */}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => mark(false)}
          disabled={busy}
          className="rounded-full border border-ink/20 bg-white px-6 py-2.5 text-sm font-medium transition-colors hover:bg-ink/5 disabled:opacity-50 focus-ring"
        >
          {dict.flashcard.unknown}
        </button>
        <button
          type="button"
          onClick={() => mark(true)}
          disabled={busy}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
        >
          {dict.flashcard.known}
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={reset}
          disabled={busy || knownCount === 0}
          className="text-xs text-ink/40 underline-offset-2 hover:text-ink hover:underline disabled:opacity-40 focus-ring rounded"
        >
          {dict.flashcard.resetProgress}
        </button>
      </div>
    </div>
  );
}
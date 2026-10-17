import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import { EXAM_LABEL, type Exam } from "@/lib/types";
import FlashcardDeck from "@/components/FlashcardDeck";

export const metadata: Metadata = { title: "Flashcard" };

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const session = await auth();
  const { dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const sp = await searchParams;
  const selected: Exam = sp.exam === "BJT_J1" ? "BJT_J1" : "JLPT_N1";

  const [cards, progress] = await Promise.all([
    prisma.flashcard.findMany({
      where: { exam: selected },
      orderBy: { term: "asc" },
    }),
    prisma.flashcardProgress.findMany({
      where: { userId },
      select: { flashcardId: true, known: true },
    }),
  ]);

  const knownIds = new Set(
    progress.filter((p) => p.known).map((p) => p.flashcardId)
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.flashcard.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.flashcard.subtitle}</p>
      </div>

      {/* Exam tabs */}
      <div className="mb-8 flex flex-wrap gap-2">
        {(Object.keys(EXAM_LABEL) as Exam[]).map((exam) => (
          <a
            key={exam}
            href={`/flashcards?exam=${exam}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-ring ${
              exam === selected
                ? "bg-ink text-paper"
                : "border border-ink/15 bg-white text-ink/60 hover:text-ink"
            }`}
          >
            {EXAM_LABEL[exam].vi}
            <span className="ml-2 text-xs opacity-60">{EXAM_LABEL[exam].ja}</span>
          </a>
        ))}
      </div>

      <FlashcardDeck
        cards={cards.map((c) => ({
          id: c.id,
          exam: c.exam,
          term: c.term,
          reading: c.reading,
          meaning: c.meaning,
          example: c.example,
          exampleTranslation: c.exampleTranslation,
        }))}
        knownIds={knownIds}
        dict={dict}
        exam={selected}
      />
    </div>
  );
}
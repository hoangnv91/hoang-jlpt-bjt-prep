import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import { SECTION_LABEL, type Exam, type Section } from "@/lib/types";
import QuizPlayer from "@/components/QuizPlayer";

export const metadata: Metadata = { title: "Luyện đề" };

const VALID_SECTIONS = new Set([
  "VOCAB",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "BUSINESS_VOCAB",
]);

export default async function StudyQuizPage({
  params,
}: {
  params: Promise<{ exam: string; section: string }>;
}) {
  const { exam, section } = await params;
  if (exam !== "JLPT_N1" && exam !== "BJT_J1") notFound();
  if (!VALID_SECTIONS.has(section)) notFound();
  const e: Exam = exam;
  const s: Section = section as Section;

  const { lang, dict } = await getDictFromCookie();

  const questions = await prisma.question.findMany({
    where: { exam: e, section: s },
    orderBy: { order: "asc" },
  });

  if (questions.length === 0) {
    return (
      <div className="animate-fade-in mx-auto max-w-xl text-center">
        <h1 className="font-jp-display text-2xl font-bold">
          {SECTION_LABEL[s][lang]}
        </h1>
        <p className="mt-4 text-sm text-ink/60">{dict.study.noQuestions}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-jp-display text-xl font-bold md:text-2xl">
          {SECTION_LABEL[s][lang]}
          <span className="ml-3 text-sm font-normal text-ink/40">
            {e === "JLPT_N1" ? "JLPT N1" : "BJT J1"}
          </span>
        </h1>
      </div>
      <QuizPlayer
        questions={questions.map((q) => ({
          id: q.id,
          exam: q.exam,
          section: q.section,
          prompt: q.prompt,
          options: q.options as { label: string; text: string }[],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
          source: q.source,
        }))}
        dict={dict}
        exam={e}
        section={s}
      />
    </div>
  );
}
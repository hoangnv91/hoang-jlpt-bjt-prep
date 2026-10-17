import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import { EXAM_LABEL, MOCK_TIME_MINUTES, type Exam } from "@/lib/types";
import QuizPlayer from "@/components/QuizPlayer";

export const metadata: Metadata = { title: "Thi thử" };

export default async function MockExamPage({
  params,
}: {
  params: Promise<{ exam: string }>;
}) {
  const { exam } = await params;
  if (exam !== "JLPT_N1" && exam !== "BJT_J1") notFound();
  const e: Exam = exam;

  const { dict } = await getDictFromCookie();

  const questions = await prisma.question.findMany({
    where: { exam: e },
    orderBy: [{ section: "asc" }, { order: "asc" }],
  });

  if (questions.length === 0) {
    return (
      <div className="animate-fade-in mx-auto max-w-xl text-center">
        <h1 className="font-jp-display text-2xl font-bold">{EXAM_LABEL[e].vi}</h1>
        <p className="mt-4 text-sm text-ink/60">{dict.study.noQuestions}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="font-jp-display text-xl font-bold md:text-2xl">
          {dict.mock.title} — {EXAM_LABEL[e].vi}
        </h1>
        <p className="mt-1 text-xs text-ink/50">
          {MOCK_TIME_MINUTES[e]} {dict.common.minutes} · {dict.mock.autoSubmitNotice}
        </p>
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
        kind="mock"
        durationMinutes={MOCK_TIME_MINUTES[e]}
      />
    </div>
  );
}
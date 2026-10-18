import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import { SECTION_LABEL, type Exam, type Section } from "@/lib/types";
import QuizPlayer from "@/components/QuizPlayer";
import LessonViewer from "@/components/LessonViewer";
import { shuffle } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = { title: "Luyện đề" };

const VALID_SECTIONS = new Set([
  "VOCAB",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "BUSINESS_VOCAB",
  "THEORY",
]);

export default async function StudyQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ exam: string; section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { exam, section } = await params;
  if (exam !== "JLPT_N1" && exam !== "BJT_J1") notFound();
  if (!VALID_SECTIONS.has(section)) notFound();
  const e: Exam = exam;
  const s: Section = section as Section;

  const sp = await searchParams;
  const { lang, dict } = await getDictFromCookie();
  const session = await auth();
  const userId = session?.user?.id;

  // THEORY is a content domain, not a question section: show the theory
  // lessons generated from documents tagged as Lý thuyết.
  if (s === "THEORY") {
    const lessons = userId
      ? await prisma.lesson.findMany({
          where: { userId, section: "THEORY" },
          orderBy: { createdAt: "desc" },
        })
      : [];

    return (
      <div className="animate-fade-in mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="font-jp-display text-xl font-bold md:text-2xl">
            {SECTION_LABEL.THEORY[lang]}
            <span className="ml-3 text-sm font-normal text-ink/40">
              {e === "JLPT_N1" ? "JLPT N1" : "BJT J1"}
            </span>
          </h1>
        </div>
        {lessons.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
            {dict.study.noTheoryLessons}
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson) => (
              <LessonViewer
                key={lesson.id}
                lesson={{
                  id: lesson.id,
                  title: lesson.title,
                  content: lesson.content,
                  createdAt: lesson.createdAt.toISOString(),
                }}
                lang={lang}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const str = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const n = Number(str("n")) || 0;
  const time = Number(str("time")) || 0;
  const maxScore = Number(str("score")) || 0;
  const shuffleQ = str("sq") === "1";
  const shuffleA = str("sa") === "1";
  const mode = str("mode") ?? "all";
  const proportional = str("prop") === "1";

  let where: Prisma.QuestionWhereInput = {
    exam: e,
    section: s,
  };

  if (mode === "wrong" && userId) {
    const wrong = await prisma.attemptAnswer.findMany({
      where: { isCorrect: false, attempt: { userId }, question: { exam: e, section: s } },
      select: { questionId: true },
      distinct: ["questionId"],
    });
    where = { ...where, id: { in: wrong.map((w) => w.questionId) } };
  } else if (mode === "bookmarked" && userId) {
    const bm = await prisma.questionBookmark.findMany({
      where: { userId, question: { exam: e, section: s } },
      select: { questionId: true },
    });
    where = { ...where, id: { in: bm.map((b) => b.questionId) } };
  }

  let questions = await prisma.question.findMany({
    where,
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

  if (shuffleQ || proportional) {
    questions = shuffle(questions);
  }
  if (n > 0 && questions.length > n) {
    questions = questions.slice(0, n);
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
        durationMinutes={time > 0 ? time : undefined}
        maxScore={maxScore > 0 ? maxScore : undefined}
        shuffleAnswers={shuffleA}
      />
    </div>
  );
}
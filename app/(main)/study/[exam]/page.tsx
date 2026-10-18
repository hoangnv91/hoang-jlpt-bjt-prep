import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getDictFromCookie } from "@/lib/i18n";
import {
  EXAM_LABEL,
  EXAM_SECTIONS,
  type Exam,
} from "@/lib/types";
import SectionPicker from "./SectionPicker";

export const metadata: Metadata = { title: "Luyện đề" };

export default async function StudySectionPage({
  params,
}: {
  params: Promise<{ exam: string }>;
}) {
  const { exam } = await params;
  if (exam !== "JLPT_N1" && exam !== "BJT_J1") notFound();
  const e: Exam = exam;
  const { lang, dict } = await getDictFromCookie();
  const session = await auth();
  const userId = session?.user?.id;

  const counts = await prisma.question.groupBy({
    by: ["section"],
    where: { exam: e },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.section, c._count._all]));

  if (userId) {
    const theoryLessons = await prisma.lesson.count({
      where: { userId, section: "THEORY" },
    });
    countMap.set("THEORY", theoryLessons);
  }

  let wrongCount = 0;
  let bookmarkCount = 0;
  if (userId) {
    const wrongRows = await prisma.attemptAnswer.findMany({
      where: {
        isCorrect: false,
        attempt: { userId },
        question: { exam: e },
      },
      select: { questionId: true },
      distinct: ["questionId"],
    });
    wrongCount = wrongRows.length;
    bookmarkCount = await prisma.questionBookmark.count({
      where: { userId, question: { exam: e } },
    });
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/study"
          className="text-sm text-ink/50 hover:text-ink focus-ring rounded"
        >
          ← {dict.common.back}
        </Link>
        <h1 className="mt-2 font-jp-display text-2xl font-bold md:text-3xl">
          {EXAM_LABEL[e].vi}
          <span className="ml-3 text-sm font-normal text-ink/40">
            {EXAM_LABEL[e].ja}
          </span>
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.study.chooseSection}</p>
      </div>

      <SectionPicker
        exam={e}
        sections={EXAM_SECTIONS[e]}
        counts={Object.fromEntries(countMap)}
        wrongCount={wrongCount}
        bookmarkCount={bookmarkCount}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}
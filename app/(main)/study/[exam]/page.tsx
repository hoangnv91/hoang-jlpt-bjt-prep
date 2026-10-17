import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import {
  EXAM_LABEL,
  EXAM_SECTIONS,
  SECTION_LABEL,
  type Exam,
} from "@/lib/types";

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

  const counts = await prisma.question.groupBy({
    by: ["section"],
    where: { exam: e },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.section, c._count._all]));

  return (
    <div className="animate-fade-in">
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

      <div className="grid gap-4 sm:grid-cols-2">
        {EXAM_SECTIONS[e].map((section) => {
          const count = countMap.get(section) ?? 0;
          return (
            <Link
              key={section}
              href={`/study/${e}/${section}`}
              className="card-hover flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-6 shadow-sm focus-ring"
            >
              <div>
                <div className="font-jp-display text-lg font-bold">
                  {SECTION_LABEL[section][lang]}
                </div>
                <div className="mt-1 text-xs text-ink/50">
                  {count} {dict.study.questionsCount}
                </div>
              </div>
              <span className="text-xl text-accent">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
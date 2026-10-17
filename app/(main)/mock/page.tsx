import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import { EXAM_LABEL, EXAM_SECTIONS, MOCK_TIME_MINUTES, SECTION_LABEL } from "@/lib/types";
import HankoLogo from "@/components/HankoLogo";

export const metadata: Metadata = { title: "Thi thử" };

export default async function MockHomePage() {
  const { dict } = await getDictFromCookie();

  const counts = await prisma.question.groupBy({
    by: ["exam"],
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.exam, c._count._all]));

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.mock.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.mock.subtitle}</p>
      </div>

      <div className="mb-6 text-xs font-medium uppercase tracking-widest text-ink/40">
        {dict.mock.chooseExam}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(EXAM_LABEL) as Array<"JLPT_N1" | "BJT_J1">).map((exam) => (
          <div
            key={exam}
            className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 shadow-sm"
          >
            <div className="absolute right-5 top-5">
              <HankoLogo text={exam === "JLPT_N1" ? "N1" : "J1"} size="lg" />
            </div>
            <div className="font-jp-display text-2xl font-bold text-accent">
              {EXAM_LABEL[exam].vi}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-ink/40">
              {EXAM_LABEL[exam].ja}
            </div>

            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink/50">{dict.mock.timeLimit}</dt>
                <dd className="font-semibold">
                  {MOCK_TIME_MINUTES[exam]} {dict.common.minutes}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">{dict.mock.questionsTotal}</dt>
                <dd className="font-semibold">
                  {countMap.get(exam) ?? 0} {dict.study.questionsCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink/50">{dict.mock.examStructure}</dt>
                <dd className="text-right font-medium">
                  {EXAM_SECTIONS[exam]
                    .map((s) => SECTION_LABEL[s].short)
                    .join(" · ")}
                </dd>
              </div>
            </dl>

            <Link
              href={`/mock/${exam}`}
              className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-transform hover:-translate-y-0.5 focus-ring"
            >
              {dict.mock.startMock} →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
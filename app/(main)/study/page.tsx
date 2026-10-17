import type { Metadata } from "next";
import Link from "next/link";
import { getDictFromCookie } from "@/lib/i18n";
import { EXAM_LABEL, EXAM_SECTIONS, SECTION_LABEL } from "@/lib/types";
import HankoLogo from "@/components/HankoLogo";

export const metadata: Metadata = { title: "Luyện đề" };

export default async function StudyHomePage() {
  const { lang, dict } = await getDictFromCookie();

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.study.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.study.subtitle}</p>
      </div>

      <div className="mb-6 text-xs font-medium uppercase tracking-widest text-ink/40">
        {dict.study.chooseExam}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(EXAM_LABEL) as Array<"JLPT_N1" | "BJT_J1">).map((exam) => (
          <Link
            key={exam}
            href={`/study/${exam}`}
            className="card-hover group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 shadow-sm focus-ring"
          >
            <div className="absolute right-5 top-5">
              <HankoLogo
                text={exam === "JLPT_N1" ? "N1" : "J1"}
                size="lg"
                className="transition-transform group-hover:scale-105"
              />
            </div>
            <div className="font-jp-display text-2xl font-bold text-accent">
              {EXAM_LABEL[exam].vi}
            </div>
            <div className="mt-1 text-xs font-medium uppercase tracking-widest text-ink/40">
              {EXAM_LABEL[exam].ja}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {EXAM_SECTIONS[exam].map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink/70"
                >
                  {SECTION_LABEL[s][lang]}
                </span>
              ))}
            </div>
            <div className="mt-5 text-sm font-semibold text-accent">
              {dict.study.startQuiz} →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
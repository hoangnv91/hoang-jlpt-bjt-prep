import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie, type Dict } from "@/lib/i18n";
import {
  SECTION_LABEL,
  type Section,
} from "@/lib/types";
import { formatPercent, formatDuration, formatDateTime } from "@/lib/utils";
import Link from "next/link";

export const metadata: Metadata = { title: "Bảng điều khiển" };

export default async function DashboardPage() {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const [attempts, recent] = await Promise.all([
    prisma.quizAttempt.findMany({ where: { userId } }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { finishedAt: "desc" },
      take: 8,
    }),
  ]);

  const totalAttempts = attempts.length;
  const totalAnswered = attempts.reduce((s, a) => s + a.totalQuestions, 0);
  const totalCorrect = attempts.reduce((s, a) => s + a.score, 0);
  const totalSeconds = attempts.reduce((s, a) => s + a.durationSec, 0);
  const avgScore =
    totalAttempts > 0 ? Math.round(totalCorrect / totalAttempts) : 0;

  const bySection = new Map<Section, { correct: number; total: number }>();
  for (const a of attempts) {
    if (!a.section) continue;
    const cur = bySection.get(a.section) ?? { correct: 0, total: 0 };
    cur.correct += a.score;
    cur.total += a.totalQuestions;
    bySection.set(a.section, cur);
  }
  const sections = Array.from(bySection.entries()).sort((x, y) =>
    x[0].localeCompare(y[0])
  );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.dashboard.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.dashboard.subtitle}</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={dict.dashboard.totalAttempts}
          value={String(totalAttempts)}
          suffix={dict.study.questionsCount}
        />
        <StatCard
          label={dict.dashboard.avgScore}
          value={`${avgScore}/${Math.max(1, totalAttempts ? Math.round(totalAnswered / totalAttempts) : 0)}`}
          suffix={dict.common.points}
        />
        <StatCard
          label={dict.dashboard.overallAccuracy}
          value={formatPercent(totalCorrect, totalAnswered)}
          accent
        />
        <StatCard
          label={dict.dashboard.hoursPracticed}
          value={(totalSeconds / 3600).toFixed(1)}
          suffix="h"
        />
      </div>

      {/* Accuracy by section */}
      <section className="mt-10">
        <h2 className="font-jp-display text-lg font-bold">{dict.dashboard.bySection}</h2>
        {sections.length === 0 ? (
          <EmptyState dict={dict} />
        ) : (
          <div className="mt-4 space-y-4 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            {sections.map(([section, stat]) => (
              <div key={section}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {SECTION_LABEL[section][lang]}
                    <span className="ml-2 text-xs text-ink/40">
                      {stat.correct}/{stat.total} {dict.dashboard.accuracy}
                    </span>
                  </span>
                  <span className="font-semibold text-accent">
                    {formatPercent(stat.correct, stat.total)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{
                      width: formatPercent(stat.correct, stat.total),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="font-jp-display text-lg font-bold">{dict.dashboard.recentActivity}</h2>
        {recent.length === 0 ? (
          <EmptyState dict={dict} />
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-5 py-3 font-medium">{dict.dashboard.section}</th>
                  <th className="px-5 py-3 font-medium">{dict.dashboard.type}</th>
                  <th className="px-5 py-3 font-medium">{dict.dashboard.score}</th>
                  <th className="px-5 py-3 font-medium">{dict.dashboard.accuracy}</th>
                  <th className="px-5 py-3 font-medium">{dict.dashboard.date}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-ink/5 last:border-0 hover:bg-paper/60"
                  >
                    <td className="px-5 py-3 font-medium">
                      {a.section
                        ? SECTION_LABEL[a.section][lang]
                        : dict.dashboard.mock}
                    </td>
                    <td className="px-5 py-3 text-ink/60">
                      {a.kind === "mock"
                        ? dict.dashboard.mock
                        : dict.dashboard.practice}
                    </td>
                    <td className="px-5 py-3">
                      {a.score}/{a.totalQuestions}
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-ink/70">
                        {formatPercent(a.score, a.totalQuestions)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-ink/50">
                      {formatDateTime(a.finishedAt, lang)}
                      <span className="ml-2">{formatDuration(a.durationSec)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  accent = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-ink/40">
        {label}
      </div>
      <div
        className={`mt-2 font-jp-display text-3xl font-bold ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-ink/40">{suffix}</span>}
      </div>
    </div>
  );
}

function EmptyState({ dict }: { dict: Dict }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center">
      <p className="text-sm text-ink/60">{dict.dashboard.noData}</p>
      <div className="mt-4 flex justify-center gap-3">
        <Link
          href="/study"
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accentDark focus-ring"
        >
          {dict.dashboard.startStudying}
        </Link>
        <Link
          href="/mock"
          className="rounded-full border border-ink/20 bg-white px-5 py-2 text-sm font-medium transition-colors hover:bg-ink/5 focus-ring"
        >
          {dict.dashboard.takeMock}
        </Link>
      </div>
    </div>
  );
}
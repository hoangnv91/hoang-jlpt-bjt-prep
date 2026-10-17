import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import { JOB_STATUS_LABEL, JOB_TYPE_LABEL } from "@/lib/jobs";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trạng thái xử lý" };

export default async function JobsPage() {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const jobs = await prisma.processingJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { document: { select: { fileName: true } } },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.jobs.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.jobs.subtitle}</p>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white/50 p-10 text-center text-sm text-ink/60">
          {dict.jobs.empty}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-5 py-3 font-medium">{dict.jobs.title}</th>
                <th className="px-5 py-3 font-medium">{dict.ingest.documents}</th>
                <th className="px-5 py-3 font-medium">{dict.ingest.status}</th>
                <th className="px-5 py-3 font-medium">{dict.jobs.attempts}</th>
                <th className="px-5 py-3 font-medium">{dict.dashboard.date}</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-ink/5 last:border-0 hover:bg-paper/60"
                >
                  <td className="px-5 py-3 font-medium">
                    {JOB_TYPE_LABEL[job.type][lang]}
                  </td>
                  <td className="px-5 py-3 text-ink/60">
                    {job.document?.fileName ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        job.status === "SUCCEEDED"
                          ? "bg-green-100 text-green-700"
                          : job.status === "FAILED"
                            ? "bg-red-100 text-red-700"
                            : job.status === "RUNNING"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {JOB_STATUS_LABEL[job.status][lang]}
                    </span>
                    {job.errorMessage && (
                      <div className="mt-1 max-w-[240px] truncate text-xs text-red-500">
                        {dict.jobs.error}: {job.errorMessage}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink/60">
                    {job.attempts}/{job.maxAttempts}
                    {job.nextRetryAt && (
                      <div className="text-xs text-ink/40">
                        {dict.jobs.retryAt}:{" "}
                        {new Date(job.nextRetryAt).toLocaleTimeString(lang === "ja" ? "ja-JP" : "vi-VN")}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-ink/50">
                    {new Date(job.createdAt).toLocaleString(lang === "ja" ? "ja-JP" : "vi-VN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
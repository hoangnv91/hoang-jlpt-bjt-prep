import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import ReviewList from "@/components/ReviewList";

export const metadata: Metadata = { title: "Duyệt bản nháp" };

export default async function ReviewPage() {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const drafts = await prisma.aiDraft.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { document: { select: { fileName: true } } },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.review.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.review.subtitle}</p>
      </div>

      <ReviewList
        drafts={drafts.map((d) => ({
          id: d.id,
          kind: d.kind,
          status: d.status,
          title: String((d.payload as { title?: unknown })?.title ?? d.kind),
          payload: d.payload as Record<string, unknown>,
          sourceRefs: d.sourceRefs as Record<string, unknown>,
          documentName: d.document?.fileName ?? null,
          aiModel: d.aiModel,
          createdAt: d.createdAt.toISOString(),
          rejectionReason: d.rejectionReason,
        }))}
        dict={dict}
        lang={lang}
      />
    </div>
  );
}
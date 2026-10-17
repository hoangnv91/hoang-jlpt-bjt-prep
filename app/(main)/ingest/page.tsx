import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import IngestForm from "@/components/IngestForm";
import DocumentList from "@/components/DocumentList";

export const metadata: Metadata = { title: "Nhập nội dung" };

export default async function IngestPage() {
  const session = await auth();
  const { lang, dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.ingest.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.ingest.subtitle}</p>
      </div>

      <IngestForm dict={dict} />

      <div className="mt-12">
        <h2 className="mb-4 font-jp-display text-lg font-bold">{dict.ingest.documents}</h2>
        <DocumentList
          documents={documents.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            mimeType: d.mimeType,
            sourceType: d.sourceType,
            status: d.status,
            rightsStatus: d.rightsStatus,
            chunkCount: d._count.chunks,
            createdAt: d.createdAt.toISOString(),
          }))}
          dict={dict}
          lang={lang}
        />
      </div>
    </div>
  );
}
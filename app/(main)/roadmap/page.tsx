import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDictFromCookie } from "@/lib/i18n";
import RoadmapView from "@/components/RoadmapView";

export const metadata: Metadata = { title: "Lộ trình học tập" };

export default async function RoadmapPage() {
  const session = await auth();
  const { dict } = await getDictFromCookie();
  const userId = session!.user!.id!;

  const [items, lessons] = await Promise.all([
    prisma.roadmapItem.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: { lesson: { select: { id: true, title: true, createdAt: true } } },
    }),
    prisma.lesson.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  const roadmapLessonIds = new Set(items.map((i) => i.lessonId));

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-jp-display text-2xl font-bold md:text-3xl">
          {dict.roadmap.title}
        </h1>
        <p className="mt-1 text-sm text-ink/60">{dict.roadmap.subtitle}</p>
      </div>

      <RoadmapView
        items={items.map((i) => ({
          id: i.id,
          lessonId: i.lessonId,
          title: i.title,
          status: i.status,
          order: i.order,
          lessonTitle: i.lesson.title,
        }))}
        lessons={lessons
          .filter((l) => !roadmapLessonIds.has(l.id))
          .map((l) => ({ id: l.id, title: l.title }))}
        dict={dict}
      />
    </div>
  );
}
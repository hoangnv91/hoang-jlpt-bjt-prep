import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody } from "@/lib/errors";
import { roadmapAddSchema } from "@/lib/ingest/schemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const items = await prisma.roadmapItem.findMany({
      where: { userId: session.user.id },
      orderBy: { order: "asc" },
      include: { lesson: { select: { id: true, title: true, createdAt: true } } },
    });
    return NextResponse.json({ items });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const parsed = roadmapAddSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid payload");

    const { lessonId, title } = parsed.data;
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new ApiError(404, "NOT_FOUND", "Lesson not found");
    if (lesson.userId !== session.user.id) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this lesson");
    }

    const existing = await prisma.roadmapItem.findUnique({
      where: { userId_lessonId: { userId: session.user.id, lessonId } },
    });
    if (existing) {
      return NextResponse.json({ item: existing });
    }

    const maxOrder = await prisma.roadmapItem.aggregate({
      where: { userId: session.user.id },
      _max: { order: true },
    });

    const item = await prisma.roadmapItem.create({
      data: {
        userId: session.user.id,
        lessonId,
        title,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
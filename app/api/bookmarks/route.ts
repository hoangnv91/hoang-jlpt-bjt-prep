import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const toggleSchema = z.object({
  questionId: z.string().uuid(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const count = await prisma.questionBookmark.count({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ count });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const parsed = toggleSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid questionId" },
      { status: 422 }
    );
  }
  const { questionId } = parsed.data;
  const existing = await prisma.questionBookmark.findUnique({
    where: {
      userId_questionId: { userId: session.user.id, questionId },
    },
  });
  if (existing) {
    await prisma.questionBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }
  await prisma.questionBookmark.create({
    data: { userId: session.user.id, questionId },
  });
  return NextResponse.json({ bookmarked: true });
}
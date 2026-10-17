import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  flashcardId: z.string(),
  known: z.boolean(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const { flashcardId, known } = parsed.data;

  const flashcard = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
  });
  if (!flashcard) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.flashcardProgress.upsert({
    where: {
      userId_flashcardId: { userId: session.user.id, flashcardId },
    },
    create: {
      userId: session.user.id,
      flashcardId,
      known,
    },
    update: { known },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const exam = url.searchParams.get("exam");
  if (exam !== "JLPT_N1" && exam !== "BJT_J1") {
    return NextResponse.json({ error: "invalid_input" }, { status: 422 });
  }

  const ids = await prisma.flashcard.findMany({
    where: { exam },
    select: { id: true },
  });
  await prisma.flashcardProgress.deleteMany({
    where: {
      userId: session.user.id,
      flashcardId: { in: ids.map((f) => f.id) },
    },
  });

  return NextResponse.json({ ok: true });
}
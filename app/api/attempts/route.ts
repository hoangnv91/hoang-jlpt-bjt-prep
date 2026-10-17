import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  exam: z.enum(["JLPT_N1", "BJT_J1"]),
  section: z
    .enum(["VOCAB", "GRAMMAR", "READING", "LISTENING", "BUSINESS_VOCAB"])
    .nullable()
    .optional(),
  kind: z.enum(["practice", "mock"]).default("practice"),
  durationSec: z.number().int().min(0).default(0),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedIndex: z.number().int().min(0).nullable(),
    })
  ),
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

  const { exam, section, kind, durationSec, answers } = parsed.data;
  const sectionValue = section ?? null;

  const questionIds = answers.map((a) => a.questionId);
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });
  const questionMap = new Map(questions.map((q) => [q.id, q]));

  let score = 0;
  const answerRecords = answers.map((a) => {
    const q = questionMap.get(a.questionId);
    const isCorrect =
      !!q && a.selectedIndex !== null && a.selectedIndex === q.correctIndex;
    if (isCorrect) score += 1;
    return {
      questionId: a.questionId,
      selectedIndex: a.selectedIndex,
      isCorrect,
    };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      exam,
      section: sectionValue,
      kind,
      score,
      totalQuestions: answers.length,
      durationSec,
      answers: { create: answerRecords },
    },
  });

  return NextResponse.json({ id: attempt.id, score, total: answers.length });
}
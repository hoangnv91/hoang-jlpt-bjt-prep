import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody, assertOwner } from "@/lib/errors";
import { reviewDraftSchema } from "@/lib/ingest/schemas";
import type { Prisma } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const draft = await prisma.aiDraft.findUnique({ where: { id } });
    if (!draft) throw new ApiError(404, "NOT_FOUND", "Draft not found");
    assertOwner(draft.userId, session.user.id);

    if (draft.status !== "PENDING_REVIEW") {
      throw new ApiError(409, "VALIDATION_ERROR", "Draft has already been reviewed");
    }

    const body = await req.json().catch(() => null);
    const parsed = reviewDraftSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid review payload");

    const { action, payload, rejectionReason } = parsed.data;

    if (action === "reject") {
      const updated = await prisma.aiDraft.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: rejectionReason ?? null },
      });
      return NextResponse.json({ draft: updated });
    }

    // accept
    const finalPayload = payload ?? (draft.payload as Record<string, unknown>);
    const kind = draft.kind;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.aiDraft.update({
        where: { id },
        data: { status: "ACCEPTED", reviewedAt: new Date() },
      });

      let lessonId: string | null = null;
      let createdQuestions = 0;

      if (kind === "QUESTION") {
        const questions = (finalPayload as { questions?: Array<Record<string, unknown>> }).questions ?? [];
        const exam = (finalPayload as { exam?: "JLPT_N1" | "BJT_J1" }).exam ?? "JLPT_N1";
        for (const q of questions) {
          const section = q.section as string;
          const validSections = ["VOCAB", "GRAMMAR", "READING", "LISTENING", "BUSINESS_VOCAB"];
          if (!validSections.includes(section)) continue;
          const options = (q.options as string[]).map((text, i) => ({ label: String.fromCharCode(65 + i), text }));
          await tx.question.create({
            data: {
              exam,
              section: section as never,
              prompt: String(q.prompt),
              options,
              correctIndex: Number(q.correctIndex),
              explanation: q.explanation ? String(q.explanation) : null,
              documentId: draft.documentId,
              draftId: draft.id,
              sourceChunkIds: (q.sourceChunkIds as string[]) ?? [],
            },
          });
          createdQuestions += 1;
        }
      } else {
        const title = String(finalPayload.title ?? "Bài học");
        const lesson = await tx.lesson.create({
          data: {
            userId: draft.userId,
            draftId: draft.id,
            title,
            content: finalPayload as Prisma.InputJsonValue,
            sourceRefs: draft.sourceRefs as Prisma.InputJsonValue,
          },
        });
        lessonId = lesson.id;
      }

      return { updated, lessonId, createdQuestions };
    });

    return NextResponse.json({ draft: result.updated, lessonId: result.lessonId, createdQuestions: result.createdQuestions });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
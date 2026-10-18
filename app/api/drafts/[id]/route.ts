import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody, assertOwner } from "@/lib/errors";
import { reviewDraftSchema } from "@/lib/ingest/schemas";
import { acceptDraft } from "@/lib/ai/accept";

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

    const { lessonId, createdQuestions } = await acceptDraft(id, finalPayload);

    return NextResponse.json({
      draft: await prisma.aiDraft.findUnique({ where: { id } }),
      lessonId,
      createdQuestions,
    });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
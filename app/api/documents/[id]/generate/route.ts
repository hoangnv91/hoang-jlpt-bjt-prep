import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody, assertOwner } from "@/lib/errors";
import { assertCanSendAI } from "@/lib/rights";
import { createJob } from "@/lib/jobs";
import { aiConfigured } from "@/lib/ai/client";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found");
    assertOwner(doc.userId, session.user.id);

    if (!aiConfigured()) {
      throw new ApiError(503, "AI_UNAVAILABLE", "AI provider is not configured (AI_API_KEY missing)");
    }

    const body = await req.json().catch(() => ({}));
    const kind = body.kind;
    if (!["VOCAB", "GRAMMAR", "READING", "QUESTION", "LESSON"].includes(kind)) {
      throw new ApiError(422, "VALIDATION_ERROR", "kind must be one of VOCAB|GRAMMAR|READING|QUESTION|LESSON");
    }

    const chunkCount = await prisma.sourceChunk.count({ where: { documentId: id } });
    if (chunkCount === 0) {
      throw new ApiError(422, "VALIDATION_ERROR", "Document has no extracted chunks yet");
    }

    assertCanSendAI(doc);

    const job = await createJob({ userId: session.user.id, documentId: id, type: "AI_GENERATE" });
    await prisma.processingJob.update({
      where: { id: job.id },
      data: { errorMessage: kind },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
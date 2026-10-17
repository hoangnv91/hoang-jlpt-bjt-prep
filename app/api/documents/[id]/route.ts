import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody, assertOwner } from "@/lib/errors";
import { deleteObject } from "@/lib/storage";
import { createJob } from "@/lib/jobs";
import { evaluateRights } from "@/lib/rights";
import { documentMetadataSchema } from "@/lib/ingest/schemas";

type Params = { params: Promise<{ id: string }> };

async function getOwnedDocument(id: string, userId: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    include: { chunks: { orderBy: { index: "asc" } }, jobs: { orderBy: { createdAt: "desc" } } },
  });
  if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found");
  assertOwner(doc.userId, userId);
  return doc;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const doc = await getOwnedDocument(id, session.user.id);
    return NextResponse.json({ document: doc });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const doc = await getOwnedDocument(id, session.user.id);

    await prisma.$transaction([
      prisma.attemptAnswer.deleteMany({
        where: { question: { documentId: id } },
      }),
      prisma.quizAttempt.deleteMany({
        where: { userId: session.user.id, answers: { none: {} } },
      }),
      prisma.question.deleteMany({ where: { documentId: id } }),
      prisma.roadmapItem.deleteMany({ where: { userId: session.user.id, lesson: { draft: { documentId: id } } } }),
      prisma.lesson.deleteMany({ where: { userId: session.user.id, draft: { documentId: id } } }),
      prisma.aiDraft.deleteMany({ where: { documentId: id } }),
      prisma.sourceChunk.deleteMany({ where: { documentId: id } }),
      prisma.processingJob.deleteMany({ where: { documentId: id } }),
      prisma.document.delete({ where: { id } }),
    ]);

    await deleteObject(doc.storageKey).catch(() => undefined);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const doc = await getOwnedDocument(id, session.user.id);

    const body = await req.json().catch(() => null);
    if (!body) throw new ApiError(400, "VALIDATION_ERROR", "Invalid JSON body");

    const metaParsed = documentMetadataSchema.safeParse(body);
    if (!metaParsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid metadata");

    const rights = evaluateRights({
      sourceType: doc.sourceType,
      ...metaParsed.data,
      declaredRights: {
        rightsStatus: body.rightsStatus,
        rightsStore: body.rightsStore,
        rightsExtract: body.rightsExtract,
        rightsSendAI: body.rightsSendAI,
        rightsDistribute: body.rightsDistribute,
        evidence: body.rightsEvidence,
        verifiedAt: body.rightsVerifiedAt ? new Date(body.rightsVerifiedAt) : undefined,
      },
    });

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...metaParsed.data,
        rightsStatus: rights.rightsStatus,
        rightsStore: rights.rightsStore,
        rightsExtract: rights.rightsExtract,
        rightsSendAI: rights.rightsSendAI,
        rightsDistribute: rights.rightsDistribute,
        rightsEvidence: rights.evidence,
        rightsVerifiedAt: rights.verifiedAt,
      },
    });

    if (body.requestRightsCheck) {
      await createJob({ userId: session.user.id, documentId: id, type: "RIGHTS_CHECK" });
    }

    return NextResponse.json({ document: updated });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
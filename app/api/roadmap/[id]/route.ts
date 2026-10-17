import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody, assertOwner } from "@/lib/errors";
import { roadmapUpdateSchema } from "@/lib/ingest/schemas";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const { id } = await params;
    const item = await prisma.roadmapItem.findUnique({ where: { id } });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Roadmap item not found");
    assertOwner(item.userId, session.user.id);

    const body = await req.json().catch(() => null);
    const parsed = roadmapUpdateSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(422, "VALIDATION_ERROR", "Invalid payload");

    const updated = await prisma.roadmapItem.update({
      where: { id },
      data: parsed.data,
    });
    return NextResponse.json({ item: updated });
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
    const item = await prisma.roadmapItem.findUnique({ where: { id } });
    if (!item) throw new ApiError(404, "NOT_FOUND", "Roadmap item not found");
    assertOwner(item.userId, session.user.id);

    await prisma.roadmapItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
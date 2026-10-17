import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiError, toErrorBody } from "@/lib/errors";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const drafts = await prisma.aiDraft.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { document: { select: { fileName: true } } },
    });
    return NextResponse.json({ drafts });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
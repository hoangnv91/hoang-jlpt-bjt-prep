import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiError, toErrorBody } from "@/lib/errors";
import { draftSchemas } from "@/lib/ai/schemas";
import { materializeContent } from "@/lib/ai/materialize";
import { MANUAL_KINDS, type ManualKind } from "@/lib/ingest/manual";
import { z } from "zod";

const manualPublishSchema = z.object({
  kind: z.enum(MANUAL_KINDS as [ManualKind, ...ManualKind[]]),
  payload: z.record(z.unknown()),
  section: z
    .enum(["VOCAB", "GRAMMAR", "READING", "LISTENING", "BUSINESS_VOCAB", "THEORY"])
    .optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(toErrorBody(new ApiError(401, "UNAUTHORIZED", "Unauthorized")), { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = manualPublishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(toErrorBody(new ApiError(422, "VALIDATION_ERROR", "Invalid payload")), { status: 422 });
    }

    const { kind, payload, section } = parsed.data;
    const schema = draftSchemas[kind];
    const validated = schema.safeParse(payload);
    if (!validated.success) {
      return NextResponse.json(
        toErrorBody(
          new ApiError(422, "VALIDATION_ERROR", validated.error.issues.map((i: z.ZodIssue) => i.message).join("; "))
        ),
        { status: 422 }
      );
    }

    const { lessonId, createdQuestions } = await materializeContent({
      userId: session.user.id,
      kind,
      payload: validated.data as Record<string, unknown>,
      section: section ?? null,
    });

    return NextResponse.json({ lessonId, createdQuestions }, { status: 201 });
  } catch (err) {
    const body = toErrorBody(err);
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json(body, { status });
  }
}
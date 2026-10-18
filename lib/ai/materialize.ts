import { prisma } from "@/lib/prisma";
import type { Prisma, DraftKind } from "@prisma/client";

export const QUESTION_SECTIONS = [
  "VOCAB",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "BUSINESS_VOCAB",
];

/**
 * Materialise a validated draft payload into persisted content:
 * - QUESTION payloads become Question rows.
 * - Any other kind becomes a Lesson tagged with the document's domain.
 * Shared by the AI review flow (acceptDraft) and manual content creation.
 */
export async function materializeContent(params: {
  userId: string;
  kind: DraftKind;
  payload: Record<string, unknown>;
  documentId?: string | null;
  sourceRefs?: Record<string, unknown>;
  section?: string | null;
  tx?: Prisma.TransactionClient;
}): Promise<{ lessonId: string | null; createdQuestions: number }> {
  const { userId, kind, payload, documentId = null, sourceRefs = {}, section } = params;
  const client = params.tx ?? prisma;

  const doc = documentId
    ? await client.document.findUnique({ where: { id: documentId } })
    : null;
  const docSection = section !== undefined ? (section as never) : (doc?.section ?? null);

  let lessonId: string | null = null;
  let createdQuestions = 0;

  if (kind === "QUESTION") {
    const questions = (payload.questions ?? []) as Array<Record<string, unknown>>;
    const exam = (payload.exam ?? "JLPT_N1") as "JLPT_N1" | "BJT_J1";
    for (const q of questions) {
      const section = (docSection ?? q.section) as string;
      if (!QUESTION_SECTIONS.includes(section)) continue;
      const options = ((q.options as string[]) ?? []).map((text, i) => ({
        label: String.fromCharCode(65 + i),
        text,
      }));
      await client.question.create({
        data: {
          exam,
          section: section as never,
          prompt: String(q.prompt),
          options,
          correctIndex: Number(q.correctIndex),
          explanation: q.explanation ? String(q.explanation) : null,
          documentId: documentId ?? null,
          sourceChunkIds: (q.sourceChunkIds as string[]) ?? [],
        },
      });
      createdQuestions += 1;
    }
  } else {
    const title = String(payload.title ?? "Bài học");
    const lesson = await client.lesson.create({
      data: {
        userId,
        title,
        content: payload as Prisma.InputJsonValue,
        sourceRefs: sourceRefs as Prisma.InputJsonValue,
        section: docSection,
      },
    });
    lessonId = lesson.id;
  }

  return { lessonId, createdQuestions };
}
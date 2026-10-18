import { prisma } from "@/lib/prisma";
import { materializeContent } from "@/lib/ai/materialize";
import type { Prisma } from "@prisma/client";

/**
 * Accept a pending AI draft: mark it ACCEPTED and materialise its content.
 * - QUESTION drafts become Question rows (section pinned to the source
 *   document's domain when set, otherwise the AI-proposed section).
 * - Any other kind becomes a Lesson tagged with the document's domain.
 * Shared by the manual review endpoint and the worker's auto-accept path.
 */
export async function acceptDraft(
  draftId: string,
  finalPayloadOverride?: unknown
): Promise<{ lessonId: string | null; createdQuestions: number }> {
  const draft = await prisma.aiDraft.findUnique({ where: { id: draftId } });
  if (!draft) throw new Error("draft_not_found");
  if (draft.status !== "PENDING_REVIEW") throw new Error("draft_already_reviewed");

  const finalPayload = (finalPayloadOverride ?? (draft.payload as Record<string, unknown>)) as Record<string, unknown>;

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.aiDraft.update({
      where: { id: draftId },
      data: { status: "ACCEPTED", reviewedAt: new Date() },
    });

    return materializeContent({
      userId: draft.userId,
      kind: draft.kind,
      payload: finalPayload,
      documentId: draft.documentId,
      sourceRefs: draft.sourceRefs as Record<string, unknown>,
      tx,
    });
  });
}
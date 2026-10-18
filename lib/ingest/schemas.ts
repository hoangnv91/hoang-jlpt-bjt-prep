import { z } from "zod";

export const documentSectionSchema = z
  .enum(["VOCAB", "GRAMMAR", "READING", "LISTENING", "BUSINESS_VOCAB", "THEORY"])
  .nullable()
  .optional();

export const documentMetadataSchema = z.object({
  author: z.string().trim().max(200).optional().nullable(),
  license: z.string().trim().max(500).optional().nullable(),
  purpose: z.string().trim().max(1000).optional().nullable(),
  sourceUrl: z.string().url().max(2000).optional().nullable(),
});

export const uploadDocumentSchema = z.object({
  metadata: documentMetadataSchema.default({}),
  section: documentSectionSchema,
});

export const urlDocumentSchema = z.object({
  url: z.string().url().max(2000),
  metadata: documentMetadataSchema.default({}),
  section: documentSectionSchema,
});

export const textDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(500_000),
  metadata: documentMetadataSchema.default({}),
  section: documentSectionSchema,
});

export const reviewDraftSchema = z.object({
  action: z.enum(["accept", "reject"]),
  payload: z.record(z.unknown()).optional(),
  rejectionReason: z.string().trim().max(500).optional(),
});

export const roadmapAddSchema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export const roadmapUpdateSchema = z.object({
  status: z.enum(["PLANNED", "IN_PROGRESS", "DONE"]).optional(),
  order: z.number().int().min(0).optional(),
  title: z.string().trim().min(1).max(200).optional(),
});
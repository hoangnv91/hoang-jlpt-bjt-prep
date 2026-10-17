import { z } from "zod";

export const vocabItemSchema = z.object({
  term: z.string().min(1),
  reading: z.string().optional().nullable(),
  meaning: z.string().min(1),
  example: z.string().optional().nullable(),
  exampleTranslation: z.string().optional().nullable(),
  sourceChunkIds: z.array(z.string()),
});

export const vocabDraftSchema = z.object({
  kind: z.literal("VOCAB"),
  title: z.string().min(1),
  items: z.array(vocabItemSchema).min(1).max(15),
});

export const grammarItemSchema = z.object({
  pattern: z.string().min(1),
  meaning: z.string().min(1),
  usage: z.string().min(1),
  examples: z.array(z.string()).min(1).max(3),
  sourceChunkIds: z.array(z.string()),
});

export const grammarDraftSchema = z.object({
  kind: z.literal("GRAMMAR"),
  title: z.string().min(1),
  items: z.array(grammarItemSchema).min(1).max(10),
});

export const readingExerciseSchema = z.object({
  passage: z.string().min(1),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1),
        options: z.array(z.string()).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
  sourceChunkIds: z.array(z.string()),
});

export const readingDraftSchema = z.object({
  kind: z.literal("READING"),
  title: z.string().min(1),
  exercises: z.array(readingExerciseSchema).min(1).max(3),
});

export const questionItemSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  section: z.enum(["VOCAB", "GRAMMAR", "READING", "LISTENING", "BUSINESS_VOCAB"]),
  sourceChunkIds: z.array(z.string()),
});

export const questionDraftSchema = z.object({
  kind: z.literal("QUESTION"),
  title: z.string().min(1),
  exam: z.enum(["JLPT_N1", "BJT_J1"]),
  questions: z.array(questionItemSchema).min(1).max(10),
});

export const lessonDraftSchema = z.object({
  kind: z.literal("LESSON"),
  title: z.string().min(1),
  summary: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(8),
  sourceChunkIds: z.array(z.string()),
});

export const draftSchemas = {
  VOCAB: vocabDraftSchema,
  GRAMMAR: grammarDraftSchema,
  READING: readingDraftSchema,
  QUESTION: questionDraftSchema,
  LESSON: lessonDraftSchema,
} as const;

export type DraftPayload = z.infer<typeof vocabDraftSchema> &
  z.infer<typeof grammarDraftSchema> &
  z.infer<typeof readingDraftSchema> &
  z.infer<typeof questionDraftSchema> &
  z.infer<typeof lessonDraftSchema>;
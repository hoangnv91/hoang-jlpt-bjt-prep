import { draftSchemas } from "@/lib/ai/schemas";
import { z } from "zod";
import type { DraftKind } from "@prisma/client";

export type ManualKind = "VOCAB" | "GRAMMAR" | "READING" | "QUESTION" | "LESSON";

export const MANUAL_KINDS: ManualKind[] = ["VOCAB", "GRAMMAR", "READING", "QUESTION", "LESSON"];

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  ok: boolean;
  payload: Record<string, unknown> | null;
  errors: ParseError[];
  validation: string[];
}

const CORRECT_LETTERS = ["A", "B", "C", "D"];

function letterToIndex(value: string): number | null {
  const v = value.trim().toUpperCase();
  const idx = CORRECT_LETTERS.indexOf(v);
  if (idx >= 0) return idx;
  const num = Number(v);
  if (Number.isInteger(num) && num >= 1 && num <= 4) return num - 1;
  return null;
}

function splitLines(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function splitPipe(line: string): string[] {
  return line.split("|").map((s) => s.trim());
}

function splitExamples(value: string): string[] {
  return value
    .split(/[;；]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function isEmptyLine(line: string): boolean {
  return line.trim().length === 0 || line.trim().startsWith("#");
}

function parseVocab(text: string, meta: { title?: string } = {}): ParseResult {
  const errors: ParseError[] = [];
  const items: Array<Record<string, unknown>> = [];
  splitLines(text).forEach((raw, i) => {
    const lineNo = i + 1;
    if (isEmptyLine(raw)) return;
    const cols = raw.split("\t").map((s) => s.trim());
    if (cols.length < 2) {
      errors.push({ line: lineNo, message: "Cần ít nhất 2 cột: từ, nghĩa (tab-separated)" });
      return;
    }
    const [term, second, meaning, example, exampleTranslation] = cols;
    const item: Record<string, unknown> = {
      term,
      meaning: cols.length === 2 ? second : meaning,
      sourceChunkIds: [],
    };
    if (cols.length >= 3) item.reading = second || null;
    if (cols.length >= 4) item.example = example || null;
    if (cols.length >= 5) item.exampleTranslation = exampleTranslation || null;
    if (cols.length > 5) {
      errors.push({ line: lineNo, message: "Quá nhiều cột (tối đa 5: từ, đọc, nghĩa, ví dụ, dịch ví dụ)" });
      return;
    }
    items.push(item);
  });
  if (items.length > 15) {
    errors.push({ line: 0, message: "Tối đa 15 mục từ vựng cho mỗi nội dung" });
  }
  return finalize("VOCAB", { title: meta.title ?? "", items }, errors);
}

function parseGrammar(text: string, meta: { title?: string } = {}): ParseResult {
  const errors: ParseError[] = [];
  const items: Array<Record<string, unknown>> = [];
  splitLines(text).forEach((raw, i) => {
    const lineNo = i + 1;
    if (isEmptyLine(raw)) return;
    const cols = splitPipe(raw);
    if (cols.length < 4) {
      errors.push({ line: lineNo, message: "Cần 4 cột: mẫu | nghĩa | cách dùng | ví dụ" });
      return;
    }
    const [pattern, meaning, usage, examplesRaw] = cols;
    const examples = splitExamples(examplesRaw);
    if (examples.length === 0) {
      errors.push({ line: lineNo, message: "Cần ít nhất 1 ví dụ (ngăn cách bằng ;)" });
      return;
    }
    if (examples.length > 3) {
      errors.push({ line: lineNo, message: "Tối đa 3 ví dụ" });
      return;
    }
    items.push({ pattern, meaning, usage, examples, sourceChunkIds: [] });
  });
  if (items.length > 10) {
    errors.push({ line: 0, message: "Tối đa 10 mục ngữ pháp cho mỗi nội dung" });
  }
  return finalize("GRAMMAR", { title: meta.title ?? "", items }, errors);
}

function parseQuestionLines(lines: Array<{ text: string; lineNo: number }>): {
  questions: Array<Record<string, unknown>>;
  errors: ParseError[];
} {
  const questions: Array<Record<string, unknown>> = [];
  const errors: ParseError[] = [];
  for (const { text, lineNo } of lines) {
    const cols = splitPipe(text);
    if (cols.length < 6) {
      errors.push({ line: lineNo, message: "Câu hỏi cần 6-7 cột: câu hỏi | A | B | C | D | đáp án | giải thích" });
      continue;
    }
    const [prompt, optA, optB, optC, optD, correctRaw] = cols;
    const correctIndex = letterToIndex(correctRaw);
    if (correctIndex === null) {
      errors.push({ line: lineNo, message: "Đáp án đúng phải là A, B, C hoặc D" });
      continue;
    }
    questions.push({
      prompt,
      options: [optA, optB, optC, optD],
      correctIndex,
      explanation: cols[6] || "",
      section: "VOCAB",
      sourceChunkIds: [],
    });
  }
  return { questions, errors };
}

function parseQuestion(text: string, meta: { title?: string; exam?: string; section?: string } = {}): ParseResult {
  const errors: ParseError[] = [];
  const lines = splitLines(text);
  const questionLines: Array<{ text: string; lineNo: number }> = [];
  let exam = meta.exam ?? "JLPT_N1";
  let section = meta.section ?? "VOCAB";

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    if (isEmptyLine(raw)) return;
    const trimmed = raw.trim();
    const examMatch = /^exam=(.+)$/i.exec(trimmed);
    if (examMatch) {
      const v = examMatch[1].trim().toUpperCase();
      if (v === "JLPT_N1" || v === "BJT_J1") exam = v;
      else errors.push({ line: lineNo, message: "exam phải là JLPT_N1 hoặc BJT_J1" });
      return;
    }
    const sectionMatch = /^section=(.+)$/i.exec(trimmed);
    if (sectionMatch) {
      section = sectionMatch[1].trim().toUpperCase();
      return;
    }
    questionLines.push({ text: trimmed, lineNo });
  });

  const { questions, errors: qErrors } = parseQuestionLines(questionLines);
  errors.push(...qErrors);
  if (questions.length > 10) {
    errors.push({ line: 0, message: "Tối đa 10 câu hỏi cho mỗi nội dung" });
  }
  return finalize("QUESTION", { title: meta.title ?? "", exam, questions }, errors);
}

function parseReading(text: string, meta: { title?: string; exam?: string; section?: string } = {}): ParseResult {
  const errors: ParseError[] = [];
  const exercises: Array<Record<string, unknown>> = [];
  const lines = splitLines(text);

  let passage: string[] = [];
  let questionBuf: Array<{ text: string; lineNo: number }> = [];

  const flush = () => {
    if (passage.length === 0 && questionBuf.length === 0) return;
    const { questions, errors: qErrors } = parseQuestionLines(questionBuf);
    errors.push(...qErrors);
    exercises.push({
      passage: passage.join("\n").trim(),
      questions,
      sourceChunkIds: [],
    });
    passage = [];
    questionBuf = [];
  };

  lines.forEach((raw, i) => {
    const lineNo = i + 1;
    if (/^\s*===/.test(raw)) {
      flush();
      return;
    }
    if (isEmptyLine(raw)) return;
    const trimmed = raw.trim();
    if (splitPipe(trimmed).length >= 6) {
      questionBuf.push({ text: trimmed, lineNo });
    } else {
      passage.push(trimmed);
    }
  });
  flush();

  if (exercises.length === 0) {
    errors.push({ line: 0, message: "Chưa có bài đọc nào. Bắt đầu mỗi bài bằng dòng === Đoạn văn ===" });
  }
  if (exercises.length > 3) {
    errors.push({ line: 0, message: "Tối đa 3 bài đọc cho mỗi nội dung" });
  }
  exercises.forEach((ex, i) => {
    const qs = (ex.questions as Array<Record<string, unknown>>) ?? [];
    if (qs.length === 0) errors.push({ line: 0, message: `Bài đọc ${i + 1} chưa có câu hỏi` });
    if (qs.length > 5) errors.push({ line: 0, message: `Bài đọc ${i + 1} tối đa 5 câu hỏi` });
  });

  return finalize("READING", { title: meta.title ?? "", exercises }, errors);
}

function parseLesson(text: string, meta: { title?: string }): ParseResult {
  const errors: ParseError[] = [];
  const lines = splitLines(text);
  const sections: Array<Record<string, string>> = [];
  const summaryParts: string[] = [];
  let title = meta.title ?? "";
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  const flushSection = () => {
    if (currentHeading !== null) {
      sections.push({ heading: currentHeading, content: currentContent.join("\n").trim() });
    }
    currentHeading = null;
    currentContent = [];
  };

  for (const raw of lines) {
    const lineNo = 0;
    const trimmed = raw.trim();
    if (trimmed.length === 0) continue;
    if (/^#{1,2}\s+/.test(trimmed)) {
      flushSection();
      currentHeading = trimmed.replace(/^#{1,2}\s+/, "");
      continue;
    }
    if (currentHeading !== null) {
      currentContent.push(trimmed);
    } else if (!title) {
      title = trimmed;
    } else {
      summaryParts.push(trimmed);
    }
  }
  flushSection();

  if (!title) {
    errors.push({ line: 0, message: "Thiếu tiêu đề bài học" });
  }
  if (sections.length === 0) {
    errors.push({ line: 0, message: "Chưa có mục nào. Bắt đầu mỗi mục bằng ## Tiêu đề mục" });
  }
  if (sections.length > 8) {
    errors.push({ line: 0, message: "Tối đa 8 mục cho mỗi bài học" });
  }

  let summary = summaryParts.join("\n").trim();
  if (!summary && sections.length > 0) {
    summary = sections[0].content.slice(0, 200);
  }

  return finalize("LESSON", { title, summary, sections, sourceChunkIds: [] }, errors);
}

function finalize(
  kind: ManualKind,
  payload: Record<string, unknown>,
  errors: ParseError[]
): ParseResult {
  const full: Record<string, unknown> = { kind, ...payload };
  const schema = draftSchemas[kind];
  const validation: string[] = [];
  if (errors.length === 0) {
    const check = { ...full, title: String(full.title ?? "").trim() || "TITLE" };
    const parsed = schema.safeParse(check);
    if (!parsed.success) {
      validation.push(...parsed.error.issues.map((iss: z.ZodIssue) => iss.message));
    }
  }
  return {
    ok: errors.length === 0 && validation.length === 0,
    payload: errors.length === 0 ? full : null,
    errors,
    validation,
  };
}

export function parseManualText(
  kind: ManualKind,
  text: string,
  meta: { title?: string; exam?: string; section?: string } = {}
): ParseResult {
  switch (kind) {
    case "VOCAB":
      return parseVocab(text, meta);
    case "GRAMMAR":
      return parseGrammar(text, meta);
    case "QUESTION":
      return parseQuestion(text, meta);
    case "READING":
      return parseReading(text, meta);
    case "LESSON":
      return parseLesson(text, meta);
  }
}

export function buildQuestionItem(values: Record<string, string>): Record<string, unknown> | null {
  const correctIndex = letterToIndex(values.correct ?? "");
  if (correctIndex === null) return null;
  return {
    prompt: values.prompt ?? "",
    options: [values.optA ?? "", values.optB ?? "", values.optC ?? "", values.optD ?? ""],
    correctIndex,
    explanation: values.explanation ?? "",
    section: values.section ?? "VOCAB",
    sourceChunkIds: [],
  };
}

export function buildFlatPayload(
  kind: "VOCAB" | "GRAMMAR",
  items: Array<Record<string, string>>,
  title: string
): Record<string, unknown> {
  if (kind === "VOCAB") {
    return {
      kind,
      title,
      items: items.map((i) => ({
        term: i.term ?? "",
        reading: i.reading?.trim() ? i.reading : null,
        meaning: i.meaning ?? "",
        example: i.example?.trim() ? i.example : null,
        exampleTranslation: i.exampleTranslation?.trim() ? i.exampleTranslation : null,
        sourceChunkIds: [],
      })),
    };
  }
  return {
    kind,
    title,
    items: items.map((i) => ({
      pattern: i.pattern ?? "",
      meaning: i.meaning ?? "",
      usage: i.usage ?? "",
      examples: splitExamples(i.examples ?? ""),
      sourceChunkIds: [],
    })),
  };
}

export function buildQuestionPayload(
  items: Array<Record<string, string>>,
  title: string,
  exam: string,
  section: string
): Record<string, unknown> {
  return {
    kind: "QUESTION",
    title,
    exam,
    questions: items
      .map((i) => buildQuestionItem({ ...i, section }))
      .filter((q): q is Record<string, unknown> => q !== null),
  };
}

export function buildReadingPayload(
  exercises: Array<{ passage: string; questionsText: string }>,
  title: string
): Record<string, unknown> {
  return {
    kind: "READING",
    title,
    exercises: exercises.map((ex) => {
      const { questions } = parseQuestionLines(
        splitLines(ex.questionsText)
          .map((t) => ({ text: t.trim(), lineNo: 0 }))
          .filter((l) => !isEmptyLine(l.text))
      );
      return { passage: ex.passage.trim(), questions, sourceChunkIds: [] };
    }),
  };
}

export function buildLessonPayload(
  title: string,
  summary: string,
  sections: Array<{ heading: string; content: string }>
): Record<string, unknown> {
  return {
    kind: "LESSON",
    title,
    summary,
    sections: sections
      .map((s) => ({ heading: s.heading.trim(), content: s.content.trim() }))
      .filter((s) => s.heading.length > 0),
  };
}

export type { DraftKind };
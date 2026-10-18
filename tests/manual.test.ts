import { describe, it, expect } from "vitest";
import {
  parseManualText,
  buildFlatPayload,
  buildQuestionPayload,
  buildReadingPayload,
  buildLessonPayload,
} from "@/lib/ingest/manual";

describe("manual VOCAB parser", () => {
  it("parses tab-separated rows", () => {
    const r = parseManualText("VOCAB", "勉強\tべんきょう\thọc tập\t毎日勉強します。\tTôi học mỗi ngày\n桜\tさくら\thoa anh đào");
    expect(r.ok).toBe(true);
    const items = (r.payload!.items as Array<Record<string, unknown>>);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      term: "勉強",
      reading: "べんきょう",
      meaning: "học tập",
      example: "毎日勉強します。",
      exampleTranslation: "Tôi học mỗi ngày",
    });
    expect(items[1].reading).toBe("さくら");
  });

  it("accepts 2-column rows as term + meaning", () => {
    const r = parseManualText("VOCAB", "本\tquyển sách");
    expect(r.ok).toBe(true);
    const items = r.payload!.items as Array<Record<string, unknown>>;
    expect(items[0]).toMatchObject({ term: "本", meaning: "quyển sách" });
    expect(items[0].reading).toBeUndefined();
  });

  it("reports bad rows with line numbers", () => {
    const r = parseManualText("VOCAB", "ok\tđọc\tnghĩa\nchỉ một cột");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.line === 2)).toBe(true);
  });

  it("caps at 15 items", () => {
    const lines = Array.from({ length: 16 }, (_, i) => `từ${i}\tđọc${i}\tnghĩa${i}`).join("\n");
    const r = parseManualText("VOCAB", lines);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes("15"))).toBe(true);
  });
});

describe("manual GRAMMAR parser", () => {
  it("parses pipe-separated rows with examples", () => {
    const r = parseManualText("GRAMMAR", "〜ように | để, sao cho | diễn tả mục đích | 早く起きるようにしています。; 忘れないようにメモします。");
    expect(r.ok).toBe(true);
    const items = r.payload!.items as Array<Record<string, unknown>>;
    expect(items[0]).toMatchObject({ pattern: "〜ように", meaning: "để, sao cho" });
    expect(items[0].examples).toEqual(["早く起きるようにしています。", "忘れないようにメモします。"]);
  });

  it("rejects rows without examples", () => {
    const r = parseManualText("GRAMMAR", "〜ように | để | diễn tả mục đích");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes("ví dụ"))).toBe(true);
  });
});

describe("manual QUESTION parser", () => {
  it("parses question rows and meta headers", () => {
    const r = parseManualText(
      "QUESTION",
      "exam=BJT_J1\nsection=BUSINESS_VOCAB\n会議は何時ですか。|9時|10時|11時|12時|B|Vì cuộc họp bắt đầu lúc 10 giờ.",
      { exam: "JLPT_N1", section: "VOCAB" }
    );
    expect(r.ok).toBe(true);
    const payload = r.payload!;
    expect(payload.exam).toBe("BJT_J1");
    const qs = payload.questions as Array<Record<string, unknown>>;
    expect(qs).toHaveLength(1);
    expect(qs[0]).toMatchObject({ prompt: "会議は何時ですか。", correctIndex: 1 });
    expect(qs[0].options).toEqual(["9時", "10時", "11時", "12時"]);
  });

  it("maps numeric correct answers", () => {
    const r = parseManualText("QUESTION", "Q|A|B|C|D|3|giải thích");
    expect(r.ok).toBe(true);
    const qs = r.payload!.questions as Array<Record<string, unknown>>;
    expect(qs[0].correctIndex).toBe(2);
  });

  it("rejects invalid correct letters", () => {
    const r = parseManualText("QUESTION", "Q|A|B|C|D|E|giải thích");
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.message.includes("A, B, C"))).toBe(true);
  });
});

describe("manual READING parser", () => {
  it("splits passages and questions", () => {
    const text = [
      "=== Bài 1 ===",
      "Đây là đoạn văn thứ nhất.",
      "Câu 1 | A | B | C | D | A | giải thích 1",
      "Câu 2 | A | B | C | D | C | giải thích 2",
      "=== Bài 2 ===",
      "Đoạn văn thứ hai.",
      "Câu 3 | A | B | C | D | D | giải thích 3",
    ].join("\n");
    const r = parseManualText("READING", text);
    expect(r.ok).toBe(true);
    const exs = r.payload!.exercises as Array<Record<string, unknown>>;
    expect(exs).toHaveLength(2);
    expect(exs[0].passage).toBe("Đây là đoạn văn thứ nhất.");
    expect((exs[0].questions as unknown[])).toHaveLength(2);
    expect((exs[1].questions as unknown[])).toHaveLength(1);
  });

  it("reports empty passages", () => {
    const r = parseManualText("READING", "không có dấu === nào");
    expect(r.ok).toBe(false);
  });
});

describe("manual LESSON parser", () => {
  it("parses title, summary and sections", () => {
    const text = [
      "Bài học về 〜ように",
      "Tóm tắt ngắn về bài học.",
      "## Cách dùng",
      "Diễn tả mục đích.",
      "## Ví dụ",
      "早く起きるようにしています。",
    ].join("\n");
    const r = parseManualText("LESSON", text);
    expect(r.ok).toBe(true);
    const p = r.payload!;
    expect(p.title).toBe("Bài học về 〜ように");
    expect(p.summary).toContain("Tóm tắt");
    expect(p.sections).toEqual([
      { heading: "Cách dùng", content: "Diễn tả mục đích." },
      { heading: "Ví dụ", content: "早く起きるようにしています。" },
    ]);
  });

  it("requires at least one section", () => {
    const r = parseManualText("LESSON", "Tiêu đề\nchỉ có summary");
    expect(r.ok).toBe(false);
  });
});

describe("manual payload builders", () => {
  it("builds vocab payload from form values", () => {
    const p = buildFlatPayload(
      "VOCAB",
      [{ term: "本", reading: "ほん", meaning: "sách", example: "", exampleTranslation: "" }],
      "Từ vựng bài 1"
    );
    expect(p.title).toBe("Từ vựng bài 1");
    expect((p.items as Array<Record<string, unknown>>)[0]).toMatchObject({
      term: "本",
      reading: "ほん",
      example: null,
    });
  });

  it("builds question payload with letter mapping", () => {
    const p = buildQuestionPayload(
      [{ prompt: "Q", optA: "a", optB: "b", optC: "c", optD: "d", correct: "C", explanation: "e" }],
      "Câu hỏi 1",
      "JLPT_N1",
      "GRAMMAR"
    );
    const q = (p.questions as Array<Record<string, unknown>>)[0];
    expect(q.correctIndex).toBe(2);
    expect(q.section).toBe("GRAMMAR");
  });

  it("builds reading payload from exercise forms", () => {
    const p = buildReadingPayload(
      [{ passage: "Đoạn văn", questionsText: "Q | A | B | C | D | A | gt" }],
      "Đọc hiểu 1"
    );
    const ex = (p.exercises as Array<Record<string, unknown>>)[0];
    expect(ex.passage).toBe("Đoạn văn");
    expect((ex.questions as unknown[])).toHaveLength(1);
  });

  it("builds lesson payload from sections", () => {
    const p = buildLessonPayload(
      "Bài học",
      "Tóm tắt",
      [{ heading: "Mục 1", content: "Nội dung 1" }]
    );
    expect(p.sections).toEqual([{ heading: "Mục 1", content: "Nội dung 1" }]);
  });
});
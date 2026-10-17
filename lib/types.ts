export type Exam = "JLPT_N1" | "BJT_J1";
export type Section =
  | "VOCAB"
  | "GRAMMAR"
  | "READING"
  | "LISTENING"
  | "BUSINESS_VOCAB";

export interface QuestionOption {
  label: string;
  text: string;
}

export interface QuestionData {
  id: string;
  exam: Exam;
  section: Section;
  prompt: string;
  options: QuestionOption[];
  correctIndex: number;
  explanation?: string | null;
  source?: string | null;
}

export interface FlashcardData {
  id: string;
  exam: Exam;
  term: string;
  reading?: string | null;
  meaning: string;
  example?: string | null;
  exampleTranslation?: string | null;
}

export interface AttemptSummary {
  id: string;
  exam: Exam;
  section: Section;
  kind: string;
  score: number;
  totalQuestions: number;
  durationSec: number;
  finishedAt: Date;
}

export interface SectionStat {
  section: Section;
  attempts: number;
  correct: number;
  total: number;
}

export const EXAM_LABEL: Record<Exam, { vi: string; ja: string }> = {
  JLPT_N1: { vi: "JLPT N1", ja: "日本語能力試験 N1" },
  BJT_J1: { vi: "BJT J1", ja: "ビジネス日本語能力テスト J1" },
};

export const SECTION_LABEL: Record<
  Section,
  { vi: string; ja: string; short: string }
> = {
  VOCAB: { vi: "Từ vựng", ja: "文字・語彙", short: "語彙" },
  GRAMMAR: { vi: "Ngữ pháp", ja: "文法", short: "文法" },
  READING: { vi: "Đọc hiểu", ja: "読解", short: "読解" },
  LISTENING: { vi: "Nghe hiểu", ja: "聴解", short: "聴解" },
  BUSINESS_VOCAB: { vi: "Từ vựng kinh doanh", ja: "語彙・表現", short: "語彙" },
};

export const EXAM_SECTIONS: Record<Exam, Section[]> = {
  JLPT_N1: ["VOCAB", "GRAMMAR", "READING", "LISTENING"],
  BJT_J1: ["BUSINESS_VOCAB", "READING", "LISTENING"],
};

export const MOCK_TIME_MINUTES: Record<Exam, number> = {
  JLPT_N1: 165,
  BJT_J1: 130,
};
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Dict } from "@/lib/i18n/shared";
import { EXAM_LABEL, SECTION_LABEL, EXAM_SECTIONS, type Exam, type Section } from "@/lib/types";
import {
  MANUAL_KINDS,
  parseManualText,
  buildFlatPayload,
  buildQuestionPayload,
  buildReadingPayload,
  buildLessonPayload,
  type ManualKind,
} from "@/lib/ingest/manual";
import { cn } from "@/lib/utils";

type Mode = "paste" | "form";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
}

interface FlatItem {
  id: string;
  values: Record<string, string>;
}

interface ExerciseForm {
  id: string;
  passage: string;
  questionsText: string;
}

interface LessonSectionForm {
  id: string;
  heading: string;
  content: string;
}

const LETTERS = ["A", "B", "C", "D"];

const KIND_LABELS: Record<ManualKind, { vi: string; ja: string }> = {
  VOCAB: { vi: "Từ vựng", ja: "語彙" },
  GRAMMAR: { vi: "Ngữ pháp", ja: "文法" },
  READING: { vi: "Đọc hiểu", ja: "読解" },
  QUESTION: { vi: "Câu hỏi", ja: "問題" },
  LESSON: { vi: "Bài học", ja: "レッスン" },
};

const FLAT_FIELDS: Record<"VOCAB" | "GRAMMAR" | "QUESTION", FieldDef[]> = {
  VOCAB: [
    { key: "term", label: "term" },
    { key: "reading", label: "reading" },
    { key: "meaning", label: "meaning" },
    { key: "example", label: "example" },
    { key: "exampleTranslation", label: "exampleTranslation" },
  ],
  GRAMMAR: [
    { key: "pattern", label: "pattern" },
    { key: "meaning", label: "meaning" },
    { key: "usage", label: "usage", type: "textarea" },
    { key: "examples", label: "examples", type: "textarea" },
  ],
  QUESTION: [
    { key: "prompt", label: "prompt", type: "textarea" },
    { key: "optA", label: "optA" },
    { key: "optB", label: "optB" },
    { key: "optC", label: "optC" },
    { key: "optD", label: "optD" },
    { key: "correct", label: "correct", type: "select", options: LETTERS },
    { key: "explanation", label: "explanation", type: "textarea" },
  ],
};

const FIELD_LABELS: Record<string, { vi: string; ja: string }> = {
  term: { vi: "Từ vựng", ja: "語彙" },
  reading: { vi: "Đọc (Hán tự)", ja: "読み" },
  meaning: { vi: "Nghĩa", ja: "意味" },
  example: { vi: "Ví dụ", ja: "例文" },
  exampleTranslation: { vi: "Dịch ví dụ", ja: "例文訳" },
  pattern: { vi: "Mẫu câu", ja: "文型" },
  usage: { vi: "Cách dùng", ja: "用法" },
  examples: { vi: "Ví dụ (ngăn cách ;)", ja: "例文（;区切り）" },
  prompt: { vi: "Câu hỏi", ja: "問題文" },
  optA: { vi: "Đáp án A", ja: "選択肢A" },
  optB: { vi: "Đáp án B", ja: "選択肢B" },
  optC: { vi: "Đáp án C", ja: "選択肢C" },
  optD: { vi: "Đáp án D", ja: "選択肢D" },
  correct: { vi: "Đáp án đúng", ja: "正解" },
  explanation: { vi: "Giải thích", ja: "解説" },
};

const FORMAT_HINTS: Record<ManualKind, { vi: string; ja: string }> = {
  VOCAB: { vi: "Mỗi dòng: từ ⭾ đọc ⭾ nghĩa ⭾ ví dụ ⭾ dịch ví dụ (tab-separated)", ja: "各行：単語⭾読み⭾意味⭾例文⭾例文訳（タブ区切り）" },
  GRAMMAR: { vi: "Mỗi dòng: mẫu | nghĩa | cách dùng | ví dụ1; ví dụ2", ja: "各行：文型 | 意味 | 用法 | 例文1; 例文2" },
  READING: { vi: "Mỗi bài bắt đầu bằng === Đoạn văn ===, sau đó các dòng câu hỏi", ja: "各文章は === 本文 === で開始し、その後質問行" },
  QUESTION: { vi: "Mỗi dòng: câu hỏi | A | B | C | D | đáp án | giải thích. Có thể thêm dòng exam=JLPT_N1, section=VOCAB", ja: "各行：問題 | A | B | C | D | 正解 | 解説。exam=JLPT_N1、section=VOCAB 行も可" },
  LESSON: { vi: "Dòng đầu = tiêu đề, mỗi mục bắt đầu bằng ## Tiêu đề mục", ja: "先頭行＝タイトル、各セクションは ## 見出し で開始" },
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function emptyFlatItem(kind: "VOCAB" | "GRAMMAR" | "QUESTION"): FlatItem {
  const values: Record<string, string> = {};
  for (const f of FLAT_FIELDS[kind]) values[f.key] = "";
  if (kind === "QUESTION") values.correct = "A";
  return { id: uid(), values };
}

export default function ManualDraftForm({ dict, lang }: { dict: Dict; lang: "vi" | "ja" }) {
  const router = useRouter();
  const [kind, setKind] = useState<ManualKind>("VOCAB");
  const [mode, setMode] = useState<Mode>("paste");
  const [title, setTitle] = useState("");
  const [exam, setExam] = useState<Exam>("JLPT_N1");
  const [section, setSection] = useState<Section>("VOCAB");
  const [pasteText, setPasteText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fromPaste, setFromPaste] = useState(false);

  const [items, setItems] = useState<FlatItem[]>([]);
  const [exercises, setExercises] = useState<ExerciseForm[]>([]);
  const [summary, setSummary] = useState("");
  const [sections, setSections] = useState<LessonSectionForm[]>([]);

  const t = (s: string) => {
    const val = (dict as Record<string, unknown>)[`manual.${s}`];
    return typeof val === "string" ? val : s;
  };
  const lbl = (key: string) => FIELD_LABELS[key]?.[lang] ?? key;

  function resetEditor() {
    setItems([]);
    setExercises([]);
    setSummary("");
    setSections([]);
    setErrors([]);
    setNotice(null);
    setFromPaste(false);
  }

  function switchKind(next: ManualKind) {
    if (next === kind) return;
    setKind(next);
    resetEditor();
    setPasteText("");
  }

  function parsePaste() {
    setErrors([]);
    setNotice(null);
    const result = parseManualText(kind, pasteText, { title, exam, section });
    if (!result.ok || !result.payload) {
      const msgs = [
        ...result.errors.map((e) => (e.line > 0 ? `${t("errorLine")} ${e.line}: ${e.message}` : e.message)),
        ...result.validation,
      ];
      setErrors(msgs);
      return;
    }
    const p = result.payload;
    if (!title.trim() && typeof p.title === "string" && p.title.trim()) {
      setTitle(p.title);
    }
    if (kind === "VOCAB" || kind === "GRAMMAR") {
      const list = ((p.items ?? []) as Array<Record<string, unknown>>).map((it) => {
        const values: Record<string, string> = {};
        for (const f of FLAT_FIELDS[kind]) values[f.key] = String(it[f.key] ?? "");
        if (kind === "GRAMMAR") values.examples = (it.examples as string[] ?? []).join("; ");
        return { id: uid(), values };
      });
      setItems(list);
    } else if (kind === "QUESTION") {
      const list = ((p.questions ?? []) as Array<Record<string, unknown>>).map((q) => ({
        id: uid(),
        values: {
          prompt: String(q.prompt ?? ""),
          optA: String((q.options as string[])[0] ?? ""),
          optB: String((q.options as string[])[1] ?? ""),
          optC: String((q.options as string[])[2] ?? ""),
          optD: String((q.options as string[])[3] ?? ""),
          correct: LETTERS[Number(q.correctIndex)] ?? "A",
          explanation: String(q.explanation ?? ""),
        },
      }));
      setItems(list);
    } else if (kind === "READING") {
      setExercises(
        ((p.exercises ?? []) as Array<Record<string, unknown>>).map((ex) => ({
          id: uid(),
          passage: String(ex.passage ?? ""),
          questionsText: ((ex.questions ?? []) as Array<Record<string, unknown>>)
            .map(
              (q) =>
                `${String(q.prompt ?? "")} | ${(q.options as string[]).join(" | ")} | ${LETTERS[Number(q.correctIndex)] ?? "A"} | ${String(q.explanation ?? "")}`
            )
            .join("\n"),
        }))
      );
    } else {
      setSummary(String(p.summary ?? ""));
      setSections(
        ((p.sections ?? []) as Array<Record<string, unknown>>).map((s) => ({
          id: uid(),
          heading: String(s.heading ?? ""),
          content: String(s.content ?? ""),
        }))
      );
    }
    setMode("form");
    setFromPaste(true);
  }

  function buildPayload(): Record<string, unknown> | null {
    if (kind === "VOCAB" || kind === "GRAMMAR") {
      return buildFlatPayload(kind, items.map((i) => i.values), title);
    }
    if (kind === "QUESTION") {
      return buildQuestionPayload(items.map((i) => i.values), title, exam, section);
    }
    if (kind === "READING") {
      return buildReadingPayload(exercises, title);
    }
    return buildLessonPayload(title, summary, sections);
  }

  async function publish() {
    setBusy(true);
    setNotice(null);
    setErrors([]);
    try {
      const payload = buildPayload();
      if (!payload) throw new Error(t("validationError"));
      const res = await fetch("/api/content/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, payload, section }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error?.message ?? t("validationError"));
      setNotice(
        data.createdQuestions
          ? `${t("publishedLesson")} · ${data.createdQuestions} ${t("publishedQuestions")}`
          : t("publishedLesson")
      );
      resetEditor();
      setPasteText("");
      router.refresh();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : t("validationError")]);
    } finally {
      setBusy(false);
    }
  }

  const flatKind = kind === "VOCAB" || kind === "GRAMMAR" || kind === "QUESTION" ? kind : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {MANUAL_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => switchKind(k)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring",
              kind === k ? "bg-ink text-paper" : "bg-paper text-ink/60 hover:text-ink"
            )}
          >
            {KIND_LABELS[k][lang]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">{t("title")}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("title")}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
          />
        </div>
        {kind === "QUESTION" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("exam")}</label>
            <select
              value={exam}
              onChange={(e) => setExam(e.target.value as Exam)}
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
            >
              {(Object.keys(EXAM_LABEL) as Exam[]).map((e) => (
                <option key={e} value={e}>
                  {EXAM_LABEL[e][lang]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium">{t("domain")}</label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm focus-ring focus:border-accent"
            >
              {EXAM_SECTIONS.JLPT_N1.concat(EXAM_SECTIONS.BJT_J1)
                .filter((s, i, arr) => arr.indexOf(s) === i)
                .map((s) => (
                  <option key={s} value={s}>
                    {SECTION_LABEL[s][lang]}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["paste", "form"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              if (m === "paste") setFromPaste(false);
            }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-ring",
              mode === m ? "bg-accent text-white" : "bg-paper text-ink/60 hover:text-ink"
            )}
          >
            {m === "paste" ? t("modePaste") : t("modeForm")}
          </button>
        ))}
      </div>

      {mode === "paste" && (
        <div className="space-y-2">
          <p className="text-xs text-ink/50">{FORMAT_HINTS[kind][lang]}</p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            placeholder={t("pastePlaceholder")}
            className="w-full rounded-lg border border-ink/15 bg-white px-4 py-2.5 font-mono text-sm focus-ring focus:border-accent"
          />
          <button
            type="button"
            onClick={parsePaste}
            disabled={busy || pasteText.trim().length === 0}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
          >
            {t("parse")}
          </button>
        </div>
      )}

      {mode === "form" && (
        <div className="space-y-4">
          {flatKind && (
            <>
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink/20 bg-white/50 p-6 text-center text-sm text-ink/50">
                  {t("emptyItems")}
                </p>
              )}
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FLAT_FIELDS[flatKind].map((f) => (
                      <div key={f.key} className={cn(f.type === "textarea" && "sm:col-span-2")}>
                        <label className="mb-1 block text-xs font-medium text-ink/60">{lbl(f.key)}</label>
                        {f.type === "select" ? (
                          <select
                            value={item.values[f.key] ?? ""}
                            onChange={(e) =>
                              setItems((list) =>
                                list.map((it) =>
                                  it.id === item.id ? { ...it, values: { ...it.values, [f.key]: e.target.value } } : it
                                )
                              )
                            }
                            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                          >
                            {f.options?.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={item.values[f.key] ?? ""}
                            onChange={(e) =>
                              setItems((list) =>
                                list.map((it) =>
                                  it.id === item.id ? { ...it, values: { ...it.values, [f.key]: e.target.value } } : it
                                )
                              )
                            }
                            className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems((list) => list.filter((it) => it.id !== item.id))}
                    className="mt-3 text-xs font-medium text-red-600 hover:underline"
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((list) => [...list, emptyFlatItem(flatKind)])}
                className="rounded-full border border-ink/20 bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 focus-ring"
              >
                {t("addItem")}
              </button>
            </>
          )}

          {kind === "READING" && (
            <>
              {exercises.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink/20 bg-white/50 p-6 text-center text-sm text-ink/50">
                  {t("emptyItems")}
                </p>
              )}
              {exercises.map((ex) => (
                <div key={ex.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <label className="mb-1 block text-xs font-medium text-ink/60">{t("passage")}</label>
                  <textarea
                    value={ex.passage}
                    onChange={(e) =>
                      setExercises((list) => list.map((x) => (x.id === ex.id ? { ...x, passage: e.target.value } : x)))
                    }
                    rows={5}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-ink/60">{t("questionsBlock")}</label>
                  <textarea
                    value={ex.questionsText}
                    onChange={(e) =>
                      setExercises((list) =>
                        list.map((x) => (x.id === ex.id ? { ...x, questionsText: e.target.value } : x))
                      )
                    }
                    rows={5}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 font-mono text-sm focus-ring focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setExercises((list) => list.filter((x) => x.id !== ex.id))}
                    className="mt-3 text-xs font-medium text-red-600 hover:underline"
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setExercises((list) => [...list, { id: uid(), passage: "", questionsText: "" }])}
                className="rounded-full border border-ink/20 bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 focus-ring"
              >
                {t("addExercise")}
              </button>
            </>
          )}

          {kind === "LESSON" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">{t("summary")}</label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                />
              </div>
              {sections.length === 0 && (
                <p className="rounded-xl border border-dashed border-ink/20 bg-white/50 p-6 text-center text-sm text-ink/50">
                  {t("emptyItems")}
                </p>
              )}
              {sections.map((s) => (
                <div key={s.id} className="rounded-xl border border-ink/10 bg-white p-4 shadow-sm">
                  <label className="mb-1 block text-xs font-medium text-ink/60">{t("heading")}</label>
                  <input
                    type="text"
                    value={s.heading}
                    onChange={(e) =>
                      setSections((list) => list.map((x) => (x.id === s.id ? { ...x, heading: e.target.value } : x)))
                    }
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                  />
                  <label className="mb-1 mt-3 block text-xs font-medium text-ink/60">{t("content")}</label>
                  <textarea
                    value={s.content}
                    onChange={(e) =>
                      setSections((list) => list.map((x) => (x.id === s.id ? { ...x, content: e.target.value } : x)))
                    }
                    rows={4}
                    className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm focus-ring focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setSections((list) => list.filter((x) => x.id !== s.id))}
                    className="mt-3 text-xs font-medium text-red-600 hover:underline"
                  >
                    {t("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSections((list) => [...list, { id: uid(), heading: "", content: "" }])}
                className="rounded-full border border-ink/20 bg-white px-4 py-1.5 text-sm font-medium transition-colors hover:bg-ink/5 focus-ring"
              >
                {t("addSection")}
              </button>
            </>
          )}

          {fromPaste && (
            <button
              type="button"
              onClick={() => setMode("paste")}
              className="text-sm font-medium text-accent hover:underline"
            >
              {t("repaste")}
            </button>
          )}
        </div>
      )}

      {errors.length > 0 && (
        <div role="alert" className="space-y-1 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      <button
        type="button"
        onClick={publish}
        disabled={busy || (mode === "form" && !hasAnyContent())}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accentDark disabled:opacity-50 focus-ring"
      >
        {busy ? t("publishing") : t("publish")}
      </button>
    </div>
  );

  function hasAnyContent(): boolean {
    if (kind === "VOCAB" || kind === "GRAMMAR" || kind === "QUESTION") return items.length > 0;
    if (kind === "READING") return exercises.length > 0;
    return sections.length > 0 || summary.trim().length > 0;
  }
}
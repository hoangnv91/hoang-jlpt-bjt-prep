interface LessonContent {
  kind?: string;
  title?: string;
  summary?: string;
  sections?: Array<{ heading?: string; content?: string }>;
  items?: Array<Record<string, unknown>>;
}

export default function LessonViewer({
  lesson,
  lang,
}: {
  lesson: { id: string; title: string; content: unknown; createdAt: string };
  lang: "vi" | "ja";
}) {
  const content = (lesson.content ?? {}) as LessonContent;

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-jp-display text-lg font-bold">{lesson.title}</h2>
      {content.summary && (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/70">
          {content.summary}
        </p>
      )}

      {content.sections && content.sections.length > 0 && (
        <div className="mt-4 space-y-4">
          {content.sections.map((sec, i) => (
            <section key={i}>
              {sec.heading && (
                <h3 className="mb-1.5 font-jp-display text-base font-bold text-accent">
                  {sec.heading}
                </h3>
              )}
              {sec.content && (
                <div className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
                  {sec.content}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {(!content.sections || content.sections.length === 0) &&
        content.items &&
        content.items.length > 0 && (
          <ul className="mt-4 space-y-3">
            {content.items.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed text-ink/80">
                {Object.entries(item)
                  .filter(([k]) => k !== "sourceChunkIds")
                  .map(([k, v]) => (
                    <span key={k} className="mr-2">
                      <span className="font-medium text-ink">{String(v)}</span>
                    </span>
                  ))}
              </li>
            ))}
          </ul>
        )}

      <p className="mt-4 text-xs text-ink/40">
        {lang === "ja" ? "作成日" : "Ngày tạo"}:{" "}
        {new Date(lesson.createdAt).toLocaleDateString(lang === "ja" ? "ja-JP" : "vi-VN")}
      </p>
    </article>
  );
}
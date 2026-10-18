# Tạo nội dung thủ công (Manual Content Creation)

Tính năng cho phép tạo nội dung học tập **không cần upload file và không cần AI**:
dán văn bản có cấu trúc (hoặc nhập từng ô) → publish thẳng thành `Lesson`/`Question`.

## Luồng

```
Trang Nhập nội dung → tab "Tạo thủ công" (components/ManualDraftForm.tsx)
  ├─ Chế độ "Dán văn bản": textarea → "Xem trước & chỉnh sửa"
  │    → parseManualText() → lỗi theo dòng (nếu có) HOẶC payload hợp lệ → đổ vào form để chỉnh sửa
  └─ Chế độ "Nhập từng ô": form động thêm/bớt mục
       → "Xuất bản" → POST /api/content/manual {kind, payload, section?}
            → validate bằng zod (lib/ai/schemas.ts)
            → materializeContent() (lib/ai/materialize.ts)
                 • QUESTION → tạo Question rows (exam, section)
                 • VOCAB/GRAMMAR/READING/LESSON → tạo Lesson (content = payload JSON)
```

Không tạo `ProcessingJob`, không gọi AI, không qua trang Duyệt — nội dung xuất hiện ngay:
- **Question** → Luyện đề / Thi thử theo `exam` + `section`.
- **Lesson** → Lộ trình (thêm thủ công); bài học `section=THEORY` hiện ở tab Lý thuyết của Luyện đề.

## Định dạng dán (parser: `lib/ingest/manual.ts`)

Dòng trống và dòng bắt đầu bằng `#` bị bỏ qua. Lỗi được báo kèm số dòng.

### Từ vựng (VOCAB) — tối đa 15 mục
Mỗi dòng, tab-separated (⭾ = tab):
```
từ ⭾ đọc ⭾ nghĩa ⭾ ví dụ ⭾ dịch ví dụ
```
- 2 cột → `từ, nghĩa`; ≥ 3 cột → `từ, đọc, nghĩa[, ví dụ[, dịch ví dụ]]`.
- Cột đọc/ví dụ/dịch để trống được.

### Ngữ pháp (GRAMMAR) — tối đa 10 mục
Mỗi dòng, pipe-separated:
```
mẫu câu | nghĩa | cách dùng | ví dụ1; ví dụ2; ví dụ3
```
- Ví dụ ngăn cách bằng `;` hoặc `；`, tối đa 3, bắt buộc ≥ 1.

### Câu hỏi (QUESTION) — tối đa 10 câu
```
exam=BJT_J1          ← tùy chọn, override form (JLPT_N1 | BJT_J1)
section=GRAMMAR      ← tùy chọn, override form
câu hỏi | A | B | C | D | đáp án | giải thích
```
- `đáp án` = chữ `A`–`D` (không phân biệt hoa thường) hoặc số `1`–`4`.

### Đọc hiểu (READING) — tối đa 3 bài, mỗi bài tối đa 5 câu
```
=== Đoạn văn 1 ===
Nội dung đoạn văn (nhiều dòng).
Câu hỏi | A | B | C | D | đáp án | giải thích

=== Đoạn văn 2 ===
...
```
- Dòng bắt đầu bằng `===` mở bài đọc mới.
- Dòng có ≥ 6 cột pipe (`|`) được coi là câu hỏi; còn lại là nội dung đoạn văn.

### Bài học (LESSON) — tối đa 8 mục
```
Tiêu đề bài học            ← dòng đầu (nếu ô tiêu đề chưa nhập)
Tóm tắt (các dòng trước mục đầu tiên).

## Tiêu đề mục 1
Nội dung mục 1.

## Tiêu đề mục 2
Nội dung mục 2.
```
- Mục bắt đầu bằng `## ` (hoặc `# `); nội dung gom cho tới mục kế tiếp.
- Nếu thiếu tóm tắt, tự lấy 200 ký tự đầu của mục đầu tiên.

## Giới hạn (schema zod)

| Loại | Giới hạn |
|---|---|
| VOCAB | 1–15 mục |
| GRAMMAR | 1–10 mục, 1–3 ví dụ/mục |
| READING | 1–3 bài, 1–5 câu/bài |
| QUESTION | 1–10 câu |
| LESSON | 1–8 mục |

## API

`POST /api/content/manual` — body:
```json
{
  "kind": "VOCAB | GRAMMAR | READING | QUESTION | LESSON",
  "payload": { "...": "theo draftSchemas[kind]" },
  "section": "VOCAB | GRAMMAR | READING | LISTENING | BUSINESS_VOCAB | THEORY"
}
```
Trả về `201 {lessonId?, createdQuestions}`. Lỗi: `401` chưa đăng nhập, `422` payload không hợp lệ (message = lỗi zod).

## Files liên quan

- `lib/ingest/manual.ts` — parser + payload builders + hằng số (pure, có unit test)
- `app/api/content/manual/route.ts` — endpoint publish
- `lib/ai/materialize.ts` — materialize chung (dùng bởi cả acceptDraft và manual)
- `components/ManualDraftForm.tsx` — UI 2 chế độ
- `components/IngestForm.tsx` — tab "Tạo thủ công"
- `tests/manual.test.ts` — 17 test parser/builders
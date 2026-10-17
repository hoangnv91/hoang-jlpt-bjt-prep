# REST API — Website ôn thi JLPT N1 & BJT J1

Base: `/api`. Mọi endpoint yêu cầu xác thực (session cookie từ Auth.js) trừ `/api/auth/*`.
Lỗi trả về envelope: `{ "error": { "code": "...", "message": "...", "details?": ... } }`.

## Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/register` | Đăng ký (email/password) → 201 |
| POST | `/api/auth/[...nextauth]` | Auth.js (credentials + google) |

## Documents (ingestion)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/documents` | Tạo document. 3 dạng: multipart `file` + `metadata`, JSON `{url, metadata}`, JSON `{title, content, metadata}` |
| GET | `/api/documents?status=` | Danh sách document của user (kèm `_count.chunks`) |
| GET | `/api/documents/:id` | Chi tiết + chunks + jobs |
| PATCH | `/api/documents/:id` | Cập nhật metadata + quyền (author, license, purpose, rights*) |
| DELETE | `/api/documents/:id` | Xóa cascade (answers, questions, roadmap, lessons, drafts, chunks, jobs, document, storage) |
| POST | `/api/documents/:id/generate` | Tạo job AI_GENERATE. Body `{kind: VOCAB\|GRAMMAR\|READING\|QUESTION\|LESSON}`. Kiểm tra quyền `rightsSendAI` |

## Drafts (review)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/drafts?status=` | Danh sách bản nháp của user |
| POST | `/api/drafts/:id` | Duyệt: `{action: "accept"}` → tạo Lesson/Question (transaction); `{action: "reject", rejectionReason?}` |

## Roadmap
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/roadmap` | Danh sách roadmap items |
| POST | `/api/roadmap` | Thêm lesson: `{lessonId, title}` |
| PATCH | `/api/roadmap/:id` | Cập nhật `{status?, order?, title?}` |
| DELETE | `/api/roadmap/:id` | Gỡ khỏi roadmap |

## Học tập (v1)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/attempts` | Nộp bài (practice/mock), tính điểm, lưu attempt + answers |
| POST | `/api/flashcards/progress` | Đánh dấu flashcard đã thuộc |
| DELETE | `/api/flashcards/progress?exam=` | Reset tiến độ flashcard |

## Error codes
`UNAUTHORIZED` (401) · `FORBIDDEN` (403) · `NOT_FOUND` (404) · `VALIDATION_ERROR` (422) ·
`UNSUPPORTED_FORMAT` (422) · `FILE_TOO_LARGE` (413) · `INVALID_FILE` (422) · `SSRF_BLOCKED` (422) ·
`FETCH_FAILED` (422) · `RIGHTS_NOT_PERMITTED` (403) · `RIGHTS_UNVERIFIED` (425) ·
`AI_UNAVAILABLE` (503) · `AI_TIMEOUT` (504) · `AI_BUDGET_EXCEEDED` (429) · `RATE_LIMITED` (429) · `INTERNAL_ERROR` (500)
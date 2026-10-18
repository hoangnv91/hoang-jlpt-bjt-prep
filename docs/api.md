# REST API — Website ôn thi JLPT N1 & BJT J1

Base: `/api`. Mọi endpoint yêu cầu xác thực (session cookie từ Auth.js) trừ `/api/auth/*`.
Lỗi trả về envelope: `{ "error": { "code": "...", "message": "...", "details?": ... } }`.

## Auth
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/register` | Đăng ký email/password → 201 `{id, email}`; 409 nếu email tồn tại |
| POST | `/api/auth/[...nextauth]` | Auth.js (credentials + google) — csrf, callback/credentials, session |
| GET | `/api/auth/csrf` | Lấy CSRF token (cần cho login credentials) |

## Documents (ingestion)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/documents` | Tạo document. 3 dạng: multipart `file` + `metadata`; JSON `{url, metadata}`; JSON `{title, content, metadata}`. Tạo kèm jobs `EXTRACT` + `RIGHTS_CHECK` |
| POST | `/api/documents/chunk` | Upload chunked (file > 800KB). Multipart: `uploadId, chunkIndex, totalChunks, fileName, metadata, sha256?, chunk`. Ghép khi đủ chunk, verify checksum |
| GET | `/api/documents?status=` | Danh sách document của user (kèm `_count.chunks`) |
| GET | `/api/documents/:id` | Chi tiết + chunks (tăng dần) + jobs (mới nhất trước) |
| PATCH | `/api/documents/:id` | Cập nhật metadata + quyền (`author, license, purpose, rightsStatus, rights*`). `requestRightsCheck: true` → tạo job RIGHTS_CHECK |
| DELETE | `/api/documents/:id` | Xóa cascade (answers, questions, roadmap, lessons, drafts, chunks, jobs, document, storage) |
| POST | `/api/documents/:id/generate` | Tạo job `AI_GENERATE`. Body `{kind: VOCAB\|GRAMMAR\|READING\|QUESTION\|LESSON}`. Gate: `assertCanSendAI` |

## Content (manual creation — không qua AI)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/content/manual` | Publish thẳng nội dung nhập tay. Body `{kind, payload, section?}` — payload validate bằng zod schema tương ứng; `QUESTION` → tạo `Question` rows, các loại khác → tạo `Lesson`. Không tạo job, không cần AI |

## Drafts (review)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/drafts?status=` | Danh sách bản nháp của user |
| POST | `/api/drafts/:id` | Duyệt: `{action: "accept", payload?}` → tạo Lesson/Question (transaction); `{action: "reject", rejectionReason?}` |

## Roadmap
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/roadmap` | Danh sách roadmap items |
| POST | `/api/roadmap` | Thêm lesson: `{lessonId, title}` |
| PATCH | `/api/roadmap/:id` | Cập nhật `{status?, order?, title?}` |
| DELETE | `/api/roadmap/:id` | Gỡ khỏi roadmap |

## Học tập
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/attempts` | Nộp bài (practice/mock), tính điểm, lưu attempt + answers |
| GET | `/api/bookmarks` | Đếm câu hỏi đã đánh dấu của user |
| POST | `/api/bookmarks` | Toggle bookmark: `{questionId}` → `{bookmarked: true\|false}` |
| POST | `/api/flashcards/progress` | Đánh dấu flashcard đã thuộc |
| DELETE | `/api/flashcards/progress?exam=` | Reset tiến độ flashcard |

## Error codes
| Code | Status | Ý nghĩa |
|---|---|---|
| `UNAUTHORIZED` | 401 | Chưa đăng nhập / session hết hạn |
| `FORBIDDEN` | 403 | Không sở hữu tài nguyên / quyền chặn |
| `NOT_FOUND` | 404 | Không tồn tại |
| `FETCH_FAILED` | 408/422 | Lỗi fetch URL (timeout 408, còn lại 422) |
| `FILE_TOO_LARGE` | 413 | Vượt giới hạn 20MB |
| `VALIDATION_ERROR` | 422 | Payload sai |
| `UNSUPPORTED_FORMAT` | 422 | Định dạng không hỗ trợ |
| `INVALID_FILE` | 422 | File hỏng / executable / sai encoding |
| `SSRF_BLOCKED` | 422 | Chặn private IP / scheme lạ / redirect vòng |
| `RIGHTS_NOT_PERMITTED` | 403 | Quyền sử dụng không cho phép |
| `RIGHTS_UNVERIFIED` | 425 | Quyền chưa xác minh — giữ để xem xét |
| `AI_UNAVAILABLE` | 502/503 | AI lỗi / chưa cấu hình |
| `AI_TIMEOUT` | 504 | AI quá thời gian chờ (90s) |
| `AI_BUDGET_EXCEEDED` | 429 | AI rate limit / hết budget |
| `RATE_LIMITED` | 429 | Bị giới hạn tốc độ |
| `INTERNAL_ERROR` | 500 | Lỗi không xác định |

Codes `CHUNK_TOO_LARGE`, `INCOMPLETE_UPLOAD`, `CHECKSUM_MISMATCH` được khai báo trong `lib/errors.ts` cho luồng upload chunked.
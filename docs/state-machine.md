# State Machine — Background Jobs & Retry Policy

## Trạng thái job

```
                ┌────────────┐
                │  PENDING   │◄──────────────┐ (retry, attempts < max)
                └─────┬──────┘               │
                      │ claim (worker)       │
                      ▼                      │
                ┌────────────┐  fail (retryable, attempts < max)
                │  RUNNING   │───────────────┤
                └─────┬──────┘               │
                      │                      │
        ┌─────────────┼─────────────┐        │
        ▼             ▼             ▼        │
  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
  │SUCCEEDED │  │  FAILED  │  │CANCELLED │  │
  └──────────┘  └──────────┘  └──────────┘  │
```

- `PENDING` → `RUNNING`: worker `claimNextJob()` đổi trạng thái atomically (updateMany có điều kiện status=PENDING).
- `RUNNING` → `SUCCEEDED`: `succeedJob()`.
- `RUNNING` → `PENDING` (retry): `failJob()` khi lỗi **retryable** và còn lượt thử.
- `RUNNING` → `FAILED`: `failJob()` khi lỗi **permanent** hoặc hết lượt thử.

## Retry policy
- `maxAttempts = 3`, `attempts` tăng mỗi lần chạy.
- Backoff exponential: `[1s, 5s, 30s]` (index theo `attempts`), lưu `nextRetryAt`.
- Worker chỉ claim job có `status=PENDING` và (`nextRetryAt IS NULL` hoặc `nextRetryAt <= now`).
- Lỗi **permanent** (không retry): `VALIDATION_ERROR`, `UNSUPPORTED_FORMAT`, `INVALID_FILE`, `RIGHTS_NOT_PERMITTED`, `SSRF_BLOCKED`, `NOT_FOUND`.
- Lỗi **retryable**: lỗi AI (`AI_UNAVAILABLE`, `AI_TIMEOUT`, `AI_BUDGET_EXCEEDED`), lỗi storage, lỗi không xác định.

## Luồng xử lý document (pipeline bắt buộc)
```
Ingest (upload/URL/text)
  → validate input (zod + magic bytes + size + SSRF guard)
  → tạo Document (PROCESSING) + rights evaluation (evaluateRights)
  → tạo ProcessingJob(EXTRACT) + ProcessingJob(RIGHTS_CHECK)
  → worker EXTRACT: getObject → extractDocument → SourceChunks → Document READY
  → worker RIGHTS_CHECK: xác nhận trạng thái quyền (giữ PENDING_VERIFICATION nếu chưa rõ)
  → POST /documents/:id/generate → ProcessingJob(AI_GENERATE) [kiểm tra rightsSendAI]
  → worker AI_GENERATE: chunks → prompt → AI → validate schema → AiDraft PENDING_REVIEW
  → user duyệt: accept → Lesson/Question (transaction) | reject → REJECTED
  → (tùy chọn) thêm Lesson vào Roadmap
```

## Quy tắc quyền (rights gate)
- `assertCanExtract`: chặn nếu `RESTRICTED`/`NOT_PERMITTED`; chặn nếu `UNKNOWN`/`PENDING_VERIFICATION` (425).
- `assertCanSendAI`: tương tự cho `rightsSendAI`.
- `assertCanDistribute`: tương tự cho `rightsDistribute`.
- Không bao giờ suy luận "tải miễn phí = được dùng". Document chưa xác minh quyền được giữ để xem xét, không tự động public.
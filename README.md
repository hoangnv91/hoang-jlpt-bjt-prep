# Luyện Thi Nhật Ngữ — JLPT N1 & BJT J1

Website song ngữ Việt–Nhật ôn thi tiếng Nhật: luyện đề theo phần, thi thử tính giờ, flashcard, và hệ thống **nhập tài liệu → AI sinh bản nháp → duyệt → bài học/lộ trình** với quản lý bản quyền & truy xuất nguồn gốc.

## Công nghệ

- **Frontend/Backend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **Database**: PostgreSQL + Prisma (UUID, UTC, migrations)
- **Auth**: Auth.js v5 (email/password + Google OAuth)
- **Storage**: MinIO (S3-compatible) hoặc local disk (fallback)
- **Worker**: tiến trình nền `scripts/worker.ts` (tsx) xử lý jobs
- **AI**: OpenAI-compatible API (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`), output JSON có schema (zod)

## Thiết lập môi trường cục bộ

### Yêu cầu
- Node.js ≥ 20, npm
- PostgreSQL (hoặc chạy preview qua podman-compose)

### 1. Cài dependencies
```bash
npm install
```

### 2. Biến môi trường (file `.env`)
```env
# Database — hoặc đặt DATABASE_URL trực tiếp
PGUSER=app
PGPASSWORD=app
PGHOST=localhost
PGPORT=5432
PGDATABASE=app
DATABASE_URL="postgresql://app:app@localhost:5432/app"

# Auth (bắt buộc trong production; preview tự sinh)
AUTH_SECRET=your-random-secret
AUTH_TRUST_HOST=true

# Google OAuth (tùy chọn — bật nút đăng nhập Google)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI provider (bắt buộc cho tính năng sinh nội dung)
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini

# Storage: để trống → local disk (data/uploads); đặt endpoint → MinIO/S3
S3_ENDPOINT=
S3_PORT=9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=documents
```

### 3. Migration + seed
```bash
npx prisma migrate dev
npx prisma db seed        # 35 câu hỏi mẫu + 30 flashcards
```

### 4. Chạy
```bash
npm run dev               # dev server
npm run worker            # worker xử lý jobs (terminal riêng)
```

### 5. Chạy kiểm thử
```bash
npm test                  # vitest: SSRF, file validation, rights, state machine, chunking
npm run lint
npm run build
```

## Preview (podman-compose)

```bash
podman-compose -f podman-compose.preview.vibeflow.yaml up --build -d
# db (Postgres) + minio (S3) + app (Next.js :3000) + worker + caddy (:5173)
```

## Cấu trúc thư mục

```
app/
  (main)/ingest/       # Nhập tài liệu (upload/URL/text) + danh sách + generate
  (main)/review/       # Duyệt bản nháp AI (accept/reject)
  (main)/roadmap/      # Lộ trình học tập
  (main)/jobs/         # Trạng thái xử lý nền
  (main)/dashboard|study|mock|flashcards   # Học tập (v1)
  api/documents|drafts|roadmap|attempts|flashcards  # REST API
lib/
  ingest/              # file validation (magic bytes), schemas
  extract/             # PDF/DOCX/TXT/MD/CSV → source chunks
  rights/              # đánh giá quyền (store/extract/sendAI/distribute)
  ai/                  # client, prompts, output schemas
  security/ssrf.ts     # chặn SSRF (private IP, redirects)
  jobs.ts              # state machine + retry policy
  storage.ts           # MinIO / local disk
scripts/
  worker.ts            # background worker
  extract-pdf.mjs      # tiện ích trích PDF → markdown
docs/
  erd.md               # ERD (mermaid)
  api.md               # REST API + error codes
  state-machine.md     # job states + retry + pipeline
tests/                 # vitest
```

## Quy trình xử lý (tóm tắt)

1. Nhập tài liệu (file/URL/text) → validate (magic bytes, size, SSRF guard) → lưu storage private → tạo `Document` + jobs `EXTRACT`/`RIGHTS_CHECK`.
2. Worker trích xuất nội dung → `SourceChunk` (kèm vị trí page/paragraph/heading).
3. Quyền được đánh giá: **không suy luận** "tải miễn phí = được dùng"; tài liệu chưa xác minh quyền được giữ để xem xét.
4. Bấm "Sinh nội dung" → job `AI_GENERATE` → AI tạo bản nháp (từ vựng/ngữ pháp/đọc hiểu/câu hỏi/bài học) → lưu `AiDraft` với `status=PENDING_REVIEW` kèm `sourceRefs`.
5. User duyệt từng bản nháp (chỉnh sửa/chấp nhận/từ chối). **Chỉ bản nháp được chấp nhận** mới tạo `Lesson`/`Question` (transaction).
6. (Tùy chọn) Thêm bài học vào `Roadmap`.

## Bảo mật

- Mọi API endpoint xác thực + kiểm tra quyền sở hữu từng đối tượng (`assertOwner`).
- Upload private; kiểm tra magic bytes, định dạng, dung lượng; chặn file thực thi.
- SSRF guard: chặn scheme lạ, private/loopback/link-local IP (IPv4+IPv6), redirect, timeout.
- Không thực thi file/macro upload; nội dung tài liệu coi là untrusted khi gửi AI.
- Không ghi toàn bộ văn bản tài liệu / credential / secret vào log.
- Giới hạn: file ≤ 20MB, retry ≤ 3 lần, AI budget theo provider rate limit.

## Trạng thái

- [x] v1: luyện đề, thi thử, flashcard, dashboard, tài khoản
- [x] v2: ingest (PDF/DOCX/TXT/MD/CSV, URL, text), extraction → chunks, rights-check, AI drafts + review, roadmap, jobs UI
- [x] Tests: SSRF, file validation, rights, state machine, chunking
- [ ] AI generation cần `AI_API_KEY` để chạy thực tế (chưa cấu hình trong preview)
- [ ] Google OAuth cần client credentials
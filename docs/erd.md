# ERD — Website ôn thi JLPT N1 & BJT J1

```mermaid
erDiagram
    User ||--o{ Document : owns
    User ||--o{ SourceChunk : owns
    User ||--o{ ProcessingJob : owns
    User ||--o{ AiDraft : owns
    User ||--o{ Lesson : owns
    User ||--o{ RoadmapItem : owns
    User ||--o{ QuizAttempt : owns
    User ||--o{ FlashcardProgress : marks
    User ||--o{ QuestionBookmark : marks

    Document ||--o{ SourceChunk : splits_into
    Document ||--o{ ProcessingJob : processed_by
    Document ||--o{ AiDraft : sourced_from

    ProcessingJob }o--|| Document : refers_to

    AiDraft ||--o{ Lesson : produces
    Lesson ||--o{ RoadmapItem : added_to

    Question ||--o{ AttemptAnswer : answered_by
    QuizAttempt ||--o{ AttemptAnswer : contains

    Flashcard ||--o{ FlashcardProgress : tracked_by
    Question ||--o{ QuestionBookmark : bookmarked_by
    User ||--o{ QuestionBookmark : owns

    User {
        uuid id PK
        string email UK
        string name
        string passwordHash
        string googleId UK
        string image
        datetime createdAt
    }
    Document {
        uuid id PK
        uuid userId FK
        string fileName
        string mimeType
        int sizeBytes
        string sha256
        string storageKey
        enum sourceType "UPLOAD|URL|TEXT"
        string sourceUrl
        string author
        string license
        string purpose
        enum rightsStatus "UNKNOWN|PERMITTED|RESTRICTED|PENDING_VERIFICATION"
        enum rightsStore "PERMITTED|NOT_PERMITTED|UNKNOWN"
        enum rightsExtract "PERMITTED|NOT_PERMITTED|UNKNOWN"
        enum rightsSendAI "PERMITTED|NOT_PERMITTED|UNKNOWN"
        enum rightsDistribute "PERMITTED|NOT_PERMITTED|UNKNOWN"
        string rightsEvidence
        datetime rightsVerifiedAt
        enum status "PROCESSING|READY|FAILED"
        string errorMessage
        datetime createdAt
    }
    SourceChunk {
        uuid id PK
        uuid documentId FK
        uuid userId FK
        int index
        int page
        int paragraph
        string heading
        text content
        int charStart
        int charEnd
        datetime createdAt
    }
    ProcessingJob {
        uuid id PK
        uuid userId FK
        uuid documentId FK
        enum type "EXTRACT|RIGHTS_CHECK|AI_GENERATE"
        enum status "PENDING|RUNNING|SUCCEEDED|FAILED|CANCELLED"
        int attempts
        int maxAttempts
        datetime nextRetryAt
        string errorCode
        string errorMessage
        datetime startedAt
        datetime finishedAt
        datetime createdAt
    }
    AiDraft {
        uuid id PK
        uuid userId FK
        uuid documentId FK
        enum kind "VOCAB|GRAMMAR|READING|QUESTION|LESSON"
        json payload
        json sourceRefs
        enum status "PENDING_REVIEW|ACCEPTED|REJECTED"
        string aiModel
        string rejectionReason
        datetime createdAt
        datetime reviewedAt
    }
    Lesson {
        uuid id PK
        uuid userId FK
        uuid draftId FK
        string title
        json content
        json sourceRefs
        enum section "VOCAB|GRAMMAR|READING|LISTENING|BUSINESS_VOCAB|THEORY"
        string status "PUBLISHED"
        datetime createdAt
    }
    RoadmapItem {
        uuid id PK
        uuid userId FK
        uuid lessonId FK
        int order
        string title
        enum status "PLANNED|IN_PROGRESS|DONE"
        datetime createdAt
    }
    Question {
        uuid id PK
        enum exam "JLPT_N1|BJT_J1"
        enum section "VOCAB|GRAMMAR|READING|LISTENING|BUSINESS_VOCAB|THEORY"
        enum type "MCQ"
        string prompt
        json options
        int correctIndex
        string explanation
        string source
        int order
        uuid documentId FK
        uuid draftId FK
        json sourceChunkIds
        datetime createdAt
    }
    QuestionBookmark {
        uuid id PK
        uuid userId FK
        uuid questionId FK
        datetime createdAt
    }
    Flashcard {
        uuid id PK
        enum exam
        string term
        string reading
        string meaning
        string example
        string exampleTranslation
        datetime createdAt
    }
    FlashcardProgress {
        uuid id PK
        uuid userId FK
        uuid flashcardId FK
        bool known
        datetime reviewedAt
    }
    QuizAttempt {
        uuid id PK
        uuid userId FK
        enum exam
        enum section
        string kind "practice|mock"
        int score
        int totalQuestions
        int durationSec
        datetime startedAt
        datetime finishedAt
    }
    AttemptAnswer {
        uuid id PK
        uuid attemptId FK
        uuid questionId FK
        int selectedIndex
        bool isCorrect
    }
```

## Ghi chú
- Mọi bản ghi đều có `userId` (quyền sở hữu người dùng) — authz scope theo owner.
- Timestamp lưu UTC (Prisma DateTime), serialize ra ISO8601.
- `Document.rights*` phân biệt 4 quyền: lưu trữ / trích xuất / gửi AI / phân phối.
- `AiDraft.status = PENDING_REVIEW` → chỉ ACCEPTED mới tạo `Lesson`/`Question`.
- Nội dung **tạo thủ công** (`POST /api/content/manual`) ghi thẳng `Lesson`/`Question` với `documentId`/`draftId` = NULL (không qua AiDraft).
- `Question.section` là enum `Section` đầy đủ (gồm `THEORY`), nhưng luồng accept/materialize chỉ chấp nhận 5 phần thi: VOCAB, GRAMMAR, READING, LISTENING, BUSINESS_VOCAB.
- Unique constraints: `User.email`, `User.googleId`, `RoadmapItem(userId, lessonId)`, `FlashcardProgress(userId, flashcardId)`, `QuestionBookmark(userId, questionId)`.
- Indexes chính: `Document(userId)`, `SourceChunk(documentId, index)`, `ProcessingJob(status, nextRetryAt)`, `AiDraft(userId, status)`, `Question(exam, section)`, `RoadmapItem(userId, order)`.
- Migration files: `20261017135907_init` (v1) · `20261017142427_v2_content_pipeline` (v2) · `20261017233121_add_question_bookmark` · `20261018001500_add_theory_section_and_document_domain`.
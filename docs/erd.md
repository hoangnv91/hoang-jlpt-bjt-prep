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

    Document ||--o{ SourceChunk : splits_into
    Document ||--o{ ProcessingJob : processed_by
    Document ||--o{ AiDraft : sourced_from

    ProcessingJob }o--|| Document : refers_to

    AiDraft ||--o{ Lesson : produces
    Lesson ||--o{ RoadmapItem : added_to

    Question ||--o{ AttemptAnswer : answered_by
    QuizAttempt ||--o{ AttemptAnswer : contains

    Flashcard ||--o{ FlashcardProgress : tracked_by

    User {
        uuid id PK
        string email UK
        string name
        string passwordHash
        string googleId UK
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
        string status
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
        enum section "VOCAB|GRAMMAR|READING|LISTENING|BUSINESS_VOCAB"
        enum type "MCQ"
        string prompt
        json options
        int correctIndex
        string explanation
        string source
        uuid documentId FK
        uuid draftId FK
        json sourceChunkIds
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
- Migration files: `prisma/migrations/20261017135907_init` (v1), `20261017142427_v2_content_pipeline` (v2).
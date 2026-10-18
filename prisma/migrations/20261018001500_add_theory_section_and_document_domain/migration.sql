-- AlterEnum: add THEORY (lý thuyết) as a content domain
ALTER TYPE "Section" ADD VALUE 'THEORY';

-- AlterTable: tag documents with their content domain (set at upload time)
ALTER TABLE "Document" ADD COLUMN "section" "Section";

-- AlterTable: tag lessons with their content domain so theory lessons can be
-- surfaced under the THEORY section of the study pages
ALTER TABLE "Lesson" ADD COLUMN "section" "Section";
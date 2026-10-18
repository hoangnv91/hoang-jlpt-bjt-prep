import pdf from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import { parse as parseCsv } from "csv-parse/sync";
import { ApiError } from "@/lib/errors";
import type { SupportedFormat } from "@/lib/ingest/files";

export interface RawChunk {
  index: number;
  page?: number | null;
  paragraph?: number | null;
  heading?: string | null;
  content: string;
  charStart?: number | null;
  charEnd?: number | null;
}

const CHUNK_SIZE = 2500;
const PARSE_TIMEOUT_MS = 60_000;
const MAX_TEXT_CHARS = 10_000_000; // ~20MB UTF-16 — bounds memory for huge PDFs
const MAX_CSV_RECORDS = 100_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new ApiError(422, "INVALID_FILE", `Timed out while parsing ${label}`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function splitIntoChunks(text: string, pageHint?: number): RawChunk[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\u0000/g, "");
  const paragraphs = normalized.split(/\n{2,}|\n(?=[一二三四五六七八九十百\d]+[、．.])/);
  const chunks: RawChunk[] = [];
  let buffer = "";
  let para = 0;
  let charOffset = 0;
  let pendingHeading: string | null = null;

  const flush = () => {
    const content = buffer.trim();
    if (!content) return;
    chunks.push({
      index: chunks.length,
      page: pageHint ?? null,
      paragraph: para,
      heading: pendingHeading,
      content,
      charStart: charOffset - content.length,
      charEnd: charOffset,
    });
    buffer = "";
    pendingHeading = null;
  };

  for (const rawPara of paragraphs) {
    para += 1;
    const trimmed = rawPara.trim();
    if (!trimmed) continue;

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (buffer) flush();
      pendingHeading = headingMatch[2].trim();
      continue;
    }

    if (buffer && buffer.length + trimmed.length > CHUNK_SIZE) {
      flush();
    }
    buffer += (buffer ? "\n\n" : "") + trimmed;
    charOffset += trimmed.length + 2;
  }
  flush();
  return chunks;
}

function guardTextSize(text: string): string {
  if (text.length > MAX_TEXT_CHARS) {
    throw new ApiError(422, "INVALID_FILE", "Extracted content is too large to process");
  }
  return text;
}

async function extractPdf(buffer: Buffer): Promise<RawChunk[]> {
  // pdf-parse can throw on corrupted files, hang on pathological structures,
  // or emit warnings to stderr — wrap with a hard timeout and swallow noise.
  const data = await withTimeout(pdf(buffer), PARSE_TIMEOUT_MS, "PDF");
  const text = guardTextSize(data.text ?? "");
  return splitIntoChunks(text);
}

async function extractDocx(buffer: Buffer): Promise<RawChunk[]> {
  const result = await withTimeout(
    mammoth.extractRawText({ buffer }),
    PARSE_TIMEOUT_MS,
    "DOCX"
  );
  const text = guardTextSize(result.value ?? "");
  return splitIntoChunks(text);
}

async function extractCsv(buffer: Buffer): Promise<RawChunk[]> {
  let records: string[][];
  try {
    records = parseCsv(buffer.toString("utf8"), {
      bom: true,
      relax_column_count: true,
      skip_empty_lines: true,
      // Bound memory: stop after a sane number of rows.
      max_record_size: 65536,
    }) as string[][];
  } catch {
    throw new ApiError(422, "INVALID_FILE", "CSV could not be parsed");
  }
  if (records.length > MAX_CSV_RECORDS) {
    throw new ApiError(422, "INVALID_FILE", "CSV has too many rows");
  }
  const lines = records.map((row) => row.join(" | "));
  return splitIntoChunks(guardTextSize(lines.join("\n")));
}

export async function extractDocument(
  format: SupportedFormat,
  buffer: Buffer
): Promise<RawChunk[]> {
  if (buffer.byteLength === 0) {
    throw new ApiError(422, "INVALID_FILE", "File is empty");
  }
  try {
    switch (format) {
      case "pdf":
        return await extractPdf(buffer);
      case "docx":
        return await extractDocx(buffer);
      case "csv":
        return await extractCsv(buffer);
      case "txt":
      case "md":
        return splitIntoChunks(guardTextSize(buffer.toString("utf8")));
      default:
        throw new ApiError(422, "UNSUPPORTED_FORMAT", `Unsupported format: ${format}`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Never leak raw parser messages (may contain file paths / internals).
    throw new ApiError(422, "INVALID_FILE", "Failed to extract content from file");
  }
}
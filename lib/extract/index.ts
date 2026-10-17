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

async function extractPdf(buffer: Buffer): Promise<RawChunk[]> {
  const data = await pdf(buffer);
  return splitIntoChunks(data.text);
}

async function extractDocx(buffer: Buffer): Promise<RawChunk[]> {
  const result = await mammoth.extractRawText({ buffer });
  return splitIntoChunks(result.value);
}

async function extractCsv(buffer: Buffer): Promise<RawChunk[]> {
  const records = parseCsv(buffer.toString("utf8"), {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];
  const lines = records.map((row) => row.join(" | "));
  return splitIntoChunks(lines.join("\n"));
}

export async function extractDocument(
  format: SupportedFormat,
  buffer: Buffer
): Promise<RawChunk[]> {
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
        return splitIntoChunks(buffer.toString("utf8"));
      default:
        throw new ApiError(422, "UNSUPPORTED_FORMAT", `Unsupported format: ${format}`);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const msg = err instanceof Error ? err.message : "unknown";
    throw new ApiError(422, "INVALID_FILE", `Failed to extract content: ${msg}`);
  }
}
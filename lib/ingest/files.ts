import { ApiError } from "@/lib/errors";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export type SupportedFormat = "pdf" | "docx" | "txt" | "md" | "csv";

export interface DetectedFile {
  format: SupportedFormat;
  mimeType: string;
  ext: string;
}

const MAGIC: Record<SupportedFormat, { mime: string; ext: string; test: (buf: Buffer) => boolean }> = {
  pdf: {
    mime: "application/pdf",
    ext: ".pdf",
    test: (b) => b.length >= 5 && b.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
    test: (b) => {
      if (b.length < 4 || b.subarray(0, 4).toString("hex") !== "504b0304") return false;
      const text = b.subarray(0, Math.min(b.length, 8192)).toString("latin1");
      return text.includes("[Content_Types].xml") || text.includes("word/");
    },
  },
  txt: { mime: "text/plain", ext: ".txt", test: () => true },
  md: { mime: "text/markdown", ext: ".md", test: () => true },
  csv: { mime: "text/csv", ext: ".csv", test: () => true },
};

const EXECUTABLE_MAGICS = [
  { name: "Windows PE", test: (b: Buffer) => b.subarray(0, 2).toString("ascii") === "MZ" },
  { name: "ELF", test: (b: Buffer) => b.length >= 4 && b[0] === 0x7f && b.subarray(1, 4).toString("ascii") === "ELF" },
  { name: "Mach-O", test: (b: Buffer) => b.length >= 4 && b.subarray(0, 4).toString("hex") === "feedface" },
  { name: "Shell script", test: (b: Buffer) => b.subarray(0, 2).toString("ascii") === "#!" },
  { name: "Java class", test: (b: Buffer) => b.length >= 4 && b.subarray(0, 4).toString("hex") === "cafebabe" },
];

export function detectFileFormat(buffer: Buffer, fileName: string): DetectedFile {
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new ApiError(413, "FILE_TOO_LARGE", "File exceeds 20MB limit");
  }

  for (const exe of EXECUTABLE_MAGICS) {
    if (exe.test(buffer)) {
      throw new ApiError(422, "INVALID_FILE", `Executable content detected (${exe.name})`);
    }
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const byExt: Partial<Record<string, SupportedFormat>> = {
    pdf: "pdf",
    docx: "docx",
    txt: "txt",
    md: "md",
    markdown: "md",
    csv: "csv",
  };
  const expected = byExt[ext];

  if (expected && expected !== "txt" && expected !== "md" && expected !== "csv") {
    if (!MAGIC[expected].test(buffer)) {
      throw new ApiError(
        422,
        "INVALID_FILE",
        `File content does not match .${ext} format`
      );
    }
    return { format: expected, mimeType: MAGIC[expected].mime, ext: "." + ext };
  }

  // Text formats: sniff content
  const sample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString("utf8");
  const looksLikeCsv =
    /^[^,\n]*,[^,\n]*(,|\n)/.test(sample.trimStart()) && sample.includes("\n");
  const looksLikeMd = /^#{1,6}\s|^\s*[-*]\s|^```/.test(sample.trimStart());

  if (looksLikeCsv) return { format: "csv", mimeType: "text/csv", ext: ".csv" };
  if (looksLikeMd) return { format: "md", mimeType: "text/markdown", ext: ".md" };

  // Validate UTF-8 (reject binary garbage)
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new ApiError(422, "INVALID_FILE", "File is not valid UTF-8 text");
  }
  return { format: "txt", mimeType: "text/plain", ext: ".txt" };
}
import { describe, it, expect } from "vitest";
import { detectFileFormat } from "@/lib/ingest/files";
import { ApiError } from "@/lib/errors";

function buf(str: string): Buffer {
  return Buffer.from(str, "utf8");
}

describe("file validation", () => {
  it("detects PDF by magic bytes", () => {
    const f = detectFileFormat(buf("%PDF-1.7\n..."), "doc.pdf");
    expect(f.format).toBe("pdf");
  });

  it("rejects a file claiming .pdf but not a PDF", () => {
    expect(() => detectFileFormat(buf("hello world"), "fake.pdf")).toThrowError(ApiError);
  });

  it("detects DOCX by zip magic + word content", () => {
    const zipHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
    const body = Buffer.concat([zipHeader, buf("[Content_Types].xml word/document.xml")]);
    const f = detectFileFormat(body, "doc.docx");
    expect(f.format).toBe("docx");
  });

  it("detects CSV and Markdown by content sniffing", () => {
    expect(detectFileFormat(buf("a,b,c\n1,2,3\n"), "data.csv").format).toBe("csv");
    expect(detectFileFormat(buf("# Heading\n\nbody"), "note.md").format).toBe("md");
  });

  it("rejects executable files", () => {
    expect(() => detectFileFormat(buf("MZ\x90\x00binary"), "evil.exe")).toThrowError(ApiError);
    expect(() => detectFileFormat(buf("\x7fELF\x02\x01\x01"), "elf.bin")).toThrowError(ApiError);
    expect(() => detectFileFormat(buf("#!/bin/sh\nrm -rf /"), "script.txt")).toThrowError(ApiError);
  });

  it("rejects oversized files", () => {
    const big = Buffer.alloc(21 * 1024 * 1024, 0x41);
    expect(() => detectFileFormat(big, "big.txt")).toThrowError(ApiError);
  });

  it("rejects binary garbage as text", () => {
    expect(() => detectFileFormat(Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x80]), "x.txt")).toThrowError(ApiError);
  });
});
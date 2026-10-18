interface PdfParseInfo {
  PDFFormatVersion: string;
  IsAcroFormPresent: boolean;
  IsXFAPresent: boolean;
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  [key: string]: unknown;
}

interface PdfParseResult {
  numpages: number;
  numrender: number;
  info: PdfParseInfo;
  metadata: Record<string, unknown> | null;
  version: string;
  text: string;
}

interface PdfParseOptions {
  /** Maximum number of pages to render (bounds CPU/memory on huge PDFs). */
  max?: number;
  /** PDF version to emulate when parsing. */
  version?: string;
}

declare module "pdf-parse" {
  function pdf(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdf;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  function pdf(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdf;
}
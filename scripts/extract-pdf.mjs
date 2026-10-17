#!/usr/bin/env node
/**
 * Extract text from PDF files in data/pdfs/ into data/extracted/ as markdown.
 *
 * Usage:
 *   npm run extract:pdf            # all PDFs in data/pdfs/
 *   npm run extract:pdf <file.pdf> # a single file
 *
 * The extracted markdown is a rough, reviewable draft. Questions still need
 * to be structured into prisma/seed/seed/questions-*.ts afterwards.
 */
import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";

const PDF_DIR = path.resolve(process.cwd(), "data/pdfs");
const OUT_DIR = path.resolve(process.cwd(), "data/extracted");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function extract(filePath) {
  const buf = fs.readFileSync(filePath);
  const data = await pdf(buf);
  const base = path.basename(filePath, path.extname(filePath));
  const outPath = path.join(OUT_DIR, `${base}.md`);
  fs.writeFileSync(outPath, data.text, "utf8");
  return { outPath, pages: data.numpages, chars: data.text.length };
}

async function main() {
  const args = process.argv.slice(2);
  ensureDir(PDF_DIR);
  ensureDir(OUT_DIR);

  let files = args.filter((a) => !a.startsWith("-"));
  if (files.length === 0) {
    files = fs
      .readdirSync(PDF_DIR)
      .filter((f) => f.toLowerCase().endsWith(".pdf"))
      .map((f) => path.join(PDF_DIR, f));
  }

  if (files.length === 0) {
    console.log(
      `No PDFs found. Put your question PDFs in ${PDF_DIR} and re-run.`
    );
    return;
  }

  for (const f of files) {
    const abs = path.isAbsolute(f) ? f : path.resolve(process.cwd(), f);
    if (!fs.existsSync(abs)) {
      console.error(`SKIP (not found): ${abs}`);
      continue;
    }
    try {
      const r = await extract(abs);
      console.log(
        `OK ${path.basename(abs)} -> ${path.relative(process.cwd(), r.outPath)} (${r.pages}p, ${r.chars} chars)`
      );
    } catch (err) {
      console.error(`FAIL ${abs}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
// One-time (re-runnable) ingestion of the Al Brooks "Trading Price Action
// Trends" PDF into a local JSON chunk index used by the Price Action RAG
// explanation feature. This script is NOT run at app runtime — it's a
// build-time/offline tool. Requires poppler's `pdftotext` on PATH.
//
// Run with: node scripts/ingest-brooks.ts
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SOURCE_PDF = "/Users/mustafaakgul/Downloads/Al-Brooks.pdf";
const DEST_DIR = path.resolve("data/knowledge/price-action");
const DEST_PDF = path.join(DEST_DIR, "brooks-trends.pdf");
const INDEX_PATH = path.join(DEST_DIR, "index.json");
const MANIFEST_PATH = path.join(DEST_DIR, "manifest.json");

const SOURCE_ID = "brooks-trends";
const SOURCE_TITLE =
  "Al Brooks — Trading Price Action Trends: Technical Analysis of Price Charts Bar by Bar for the Serious Trader (Wiley, 2012)";

// Verified against this PDF's own table of contents (see ingestion report).
// pdfPage = physical page index in the PDF file (1-based). printedPageOffset
// converts a body pdfPage to the book's own printed page number (pdfPage -
// 32, verified against multiple chapter-start footers). Front matter uses
// roman numerals read directly from each page instead.
const SECTIONS: {
  chapter: string;
  pdfStart: number;
  pdfEnd: number;
  frontMatter: boolean;
}[] = [
  { chapter: "List of Terms Used in This Book", pdfStart: 15, pdfEnd: 32, frontMatter: true },
  { chapter: "Chapter 1: The Spectrum of Price Action: Extreme Trends to Extreme Trading Ranges", pdfStart: 87, pdfEnd: 90, frontMatter: false },
  { chapter: "Chapter 3: Breakouts, Trading Ranges, Tests, and Reversals", pdfStart: 109, pdfEnd: 114, frontMatter: false },
  // NOTE: the TOC's "next chapter heading" naively suggested pdfEnd=320, but
  // the PDF's own internal typesetting tags (JWBT576-c17 vs -c18, embedded in
  // each page's print-production header) show Chapter 17 itself actually
  // ends at PDF page 306 — pages 307-320 are the Part III divider + intro
  // essay, bundled into chapter 18's typesetting file, not chapter 17's.
  { chapter: "Chapter 17: Horizontal Lines: Swing Points and Other Key Price Levels", pdfStart: 301, pdfEnd: 306, frontMatter: false },
  { chapter: "Chapter 19: Signs of Strength in a Trend", pdfStart: 339, pdfEnd: 350, frontMatter: false },
];

const PRINTED_PAGE_OFFSET = 32;

type Chunk = {
  chunkId: string;
  sourceId: string;
  sourceVersion: string;
  sourceTitle: string;
  chapter: string;
  section: string | null;
  pdfPageStart: number;
  pdfPageEnd: number;
  printedPageStart: string;
  printedPageEnd: string;
  figureRefs: string[];
  needsVisualContext: boolean;
  text: string;
};

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex");
}

function extractPageRange(pdfPath: string, from: number, to: number): string {
  return execFileSync("pdftotext", ["-layout", "-f", String(from), "-l", String(to), pdfPath, "-"], {
    maxBuffer: 1024 * 1024 * 64,
    encoding: "utf-8",
  });
}

// Print-production boilerplate only — blank lines are NOT junk, they carry
// paragraph-boundary information and must survive to pagesToParagraphs().
const JUNK_LINE_PATTERNS = [/^P1:\s*OTA/i, /^JWBT576-.*Printer:\s*Donnelly\s*$/i];

// Running header/footer: "<page> TITLE", "TITLE <page>", or with a
// "Figure X.X" back/forward-reference tacked onto either end (roman or
// arabic page numbers). Excludes "CHAPTER N" / "PART N" (real headings).
const HEADER_NUM_FIRST = /^\s*([ivxlc]+|\d+)\s+[A-Z][A-Z ,:'’-]{2,}\s*(?:Figure\s+[\d.]+)?\s*$/;
const HEADER_TITLE_FIRST = /^\s*(?:Figure\s+[\d.]+\s+)?[A-Z][A-Z ,:'’-]{2,}\s+([ivxlc]+|\d+)\s*$/;
// A page number sitting completely alone on its line (common on chapter
// opener pages, which print it at the bottom instead of in the top header).
const SOLO_PAGE_NUMBER = /^\s*([ivxlc]+|\d+)\s*$/;

function isJunkLine(line: string): boolean {
  if (line.trim() === "") return false; // blank: preserved, not junk
  return JUNK_LINE_PATTERNS.some((re) => re.test(line));
}

function extractPrintedPageFromHeader(line: string): string | null {
  let m = HEADER_NUM_FIRST.exec(line);
  if (m) return m[1];
  m = HEADER_TITLE_FIRST.exec(line);
  if (m) return m[1];
  return null;
}

const FIGURE_LINE = /\bFIGURE\s+(\d+\.\d+)\b/i;
const FIGURE_INLINE = /\bFigure\s+(\d+\.\d+)\b/g;

// Splits raw pdftotext output for a page range into an array of per-page
// line arrays (pdftotext emits form-feed \f between pages).
function splitPages(raw: string): string[][] {
  return raw.split("\f").map((page) => page.split("\n"));
}

type CleanedPage = { pdfPage: number; printedPage: string; lines: string[]; figures: string[] };

function cleanPages(raw: string, startPdfPage: number, frontMatter: boolean): CleanedPage[] {
  const pages = splitPages(raw);
  const result: CleanedPage[] = [];

  pages.forEach((pageLines, idx) => {
    const pdfPage = startPdfPage + idx;
    let printedPage = frontMatter ? "" : String(pdfPage - PRINTED_PAGE_OFFSET);
    const figures: string[] = [];
    const kept: string[] = [];

    for (const rawLine of pageLines) {
      const line = rawLine.replace(/\s+$/, "");
      if (isJunkLine(line)) continue;

      const isChapterOrPartHeading = /^\s*(CHAPTER\s+\d+|PART\s+[IVX]+)\s*$/i.test(line);
      const headerPage = isChapterOrPartHeading ? null : extractPrintedPageFromHeader(line);
      if (headerPage !== null) {
        printedPage = headerPage;
        const figMatch = FIGURE_LINE.exec(line);
        if (figMatch) figures.push(`Figure ${figMatch[1]}`);
        continue; // header line itself isn't body content
      }

      // Solo page number (chapter-opener pages print it alone at the bottom).
      if (!isChapterOrPartHeading && SOLO_PAGE_NUMBER.test(line)) {
        printedPage = SOLO_PAGE_NUMBER.exec(line)![1];
        continue;
      }

      const figCaption = /^\s*FIGURE\s+(\d+\.\d+)\s+/.exec(line);
      if (figCaption) figures.push(`Figure ${figCaption[1]}`);
      let m: RegExpExecArray | null;
      const inlineRe = new RegExp(FIGURE_INLINE);
      while ((m = inlineRe.exec(line))) figures.push(`Figure ${m[1]}`);

      kept.push(line);
    }

    result.push({ pdfPage, printedPage: printedPage || "?", lines: kept, figures: Array.from(new Set(figures)) });
  });

  return result;
}

// Re-flows a page's kept lines into paragraphs: a blank line separates
// paragraphs; wrapped lines within a paragraph are joined with a space.
function pagesToParagraphs(pages: CleanedPage[]): { text: string; pdfPage: number; printedPage: string; figures: string[] }[] {
  const paragraphs: { text: string; pdfPage: number; printedPage: string; figures: string[] }[] = [];

  for (const page of pages) {
    let buf: string[] = [];
    const flush = () => {
      const text = buf.join(" ").replace(/\s+/g, " ").replace(/-\s+/g, "").trim();
      if (text.length > 0) paragraphs.push({ text, pdfPage: page.pdfPage, printedPage: page.printedPage, figures: page.figures });
      buf = [];
    };
    for (const line of page.lines) {
      if (line.trim() === "") {
        flush();
      } else {
        buf.push(line.trim());
      }
    }
    flush();
  }
  return mergeDropCapArtifacts(paragraphs);
}

// Drop-cap chapter openings (e.g. a large stylized "W" for "Whenever") get
// extracted as an orphaned single letter starting the NEXT line/paragraph,
// splitting one sentence in two: "henever ... is" / "W moving ...". This
// stitches the letter back onto the front of the sentence it belongs to.
function mergeDropCapArtifacts<T extends { text: string; figures: string[] }>(paragraphs: T[]): T[] {
  const result: T[] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const cur = paragraphs[i];
    const next = paragraphs[i + 1];
    const isDropCapContinuation = next && /^[A-Z]\s+[a-z]/.test(next.text) && !/[.!?"'”’)]$/.test(cur.text);
    if (isDropCapContinuation && next) {
      const letter = next.text[0];
      const rest = next.text.slice(1).trim();
      result.push({ ...cur, text: `${letter}${cur.text} ${rest}`.trim(), figures: Array.from(new Set([...cur.figures, ...next.figures])) });
      i++; // consume `next` too
      continue;
    }
    result.push(cur);
  }
  return result;
}

// Heuristic chapter-heading / sub-heading detector for the 4 numbered
// chapters (not used for the glossary). A short, isolated, title-like
// paragraph that isn't a normal sentence (no ending period, short).
function looksLikeHeading(text: string): boolean {
  if (text.length > 60) return false;
  if (/[.;,]$/.test(text)) return false;
  if (/^(CHAPTER|FIGURE)\b/i.test(text)) return false;
  const words = text.split(/\s+/);
  if (words.length === 0 || words.length > 8) return false;
  const capitalized = words.filter((w) => /^[A-Z]/.test(w)).length;
  return capitalized / words.length > 0.6;
}

// Some sub-headings run directly into body text with no blank-line gap
// (e.g. "Deeper Discussion of This Chart The day broke out..."). Tries
// short leading word-counts to find where the heading ends and a real
// sentence begins.
function splitRunInHeading(text: string): { heading: string; rest: string } | null {
  const words = text.split(/\s+/);
  for (let n = 3; n <= 6 && n < words.length; n++) {
    const prefix = words.slice(0, n).join(" ");
    const rest = words.slice(n).join(" ");
    // `rest` must look like the start of a genuine sentence (capitalized
    // first word, lowercase second word) AND be long enough that it can
    // only be body prose, not more of a short title (titles in this book
    // run well under 60 chars; real paragraph sentences don't).
    if (looksLikeHeading(prefix) && /^[A-Z][a-z']+\s+[a-z]/.test(rest) && rest.length >= 60) {
      return { heading: prefix, rest };
    }
  }
  return null;
}

let chunkCounter = 0;
function makeChunkId(chapterSlug: string): string {
  chunkCounter += 1;
  return `${SOURCE_ID}:${chapterSlug}:${String(chunkCounter).padStart(4, "0")}`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/^chapter\s+(\d+):.*/i, "ch$1")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

const MAX_CHUNK_CHARS = 1400;

function buildChapterChunks(
  chapter: string,
  paragraphs: { text: string; pdfPage: number; printedPage: string; figures: string[] }[],
  sourceVersion: string
): Chunk[] {
  const chunks: Chunk[] = [];
  const chSlug = slug(chapter);

  let currentSection: string | null = null;
  let bufParas: typeof paragraphs = [];

  function flush() {
    if (bufParas.length === 0) return;
    const text = bufParas.map((p) => p.text).join("\n\n");
    const pdfPageStart = bufParas[0].pdfPage;
    const pdfPageEnd = bufParas[bufParas.length - 1].pdfPage;
    const printedPageStart = bufParas[0].printedPage;
    const printedPageEnd = bufParas[bufParas.length - 1].printedPage;
    const figureRefs = Array.from(new Set(bufParas.flatMap((p) => p.figures)));
    chunks.push({
      chunkId: makeChunkId(chSlug),
      sourceId: SOURCE_ID,
      sourceVersion,
      sourceTitle: SOURCE_TITLE,
      chapter,
      section: currentSection,
      pdfPageStart,
      pdfPageEnd,
      printedPageStart,
      printedPageEnd,
      figureRefs,
      needsVisualContext: figureRefs.length > 0,
      text,
    });
    bufParas = [];
  }

  let charCount = 0;
  for (const para of paragraphs) {
    // Skip the chapter title / opening decorative lines (very short, all-caps "CHAPTER N" already stripped as junk isn't needed since it's short body text)
    if (/^(CHAPTER\s+\d+|PART\s+[IVX]+)$/i.test(para.text)) continue;

    if (looksLikeHeading(para.text)) {
      flush();
      currentSection = para.text;
      charCount = 0;
      continue;
    }

    const runIn = splitRunInHeading(para.text);
    if (runIn) {
      flush();
      currentSection = runIn.heading;
      charCount = 0;
      const restPara = { ...para, text: runIn.rest };
      bufParas.push(restPara);
      charCount += restPara.text.length;
      continue;
    }

    if (charCount > 0 && charCount + para.text.length > MAX_CHUNK_CHARS) {
      flush();
      charCount = 0;
    }
    bufParas.push(para);
    charCount += para.text.length;
  }
  flush();

  return chunks;
}

// Glossary: one chunk per detected term entry (falls back to paragraph
// chunking for anything that doesn't match the term pattern).
const TERM_START = /^([a-z][a-z0-9 /'()-]{1,45}?)\s+([A-Z][a-z].{15,})$/;

function buildGlossaryChunks(
  chapter: string,
  pages: CleanedPage[],
  sourceVersion: string
): Chunk[] {
  const chSlug = slug(chapter);
  const chunks: Chunk[] = [];

  type Entry = { term: string; text: string; pdfPageStart: number; pdfPageEnd: number; printedPageStart: string; printedPageEnd: string };
  let current: Entry | null = null;
  const entries: Entry[] = [];

  for (const page of pages) {
    for (const rawLine of page.lines) {
      const line = rawLine.trim();
      if (line === "") continue;
      // Skip the section's own opening paragraph / short preamble sentences.
      const m = TERM_START.exec(line);
      if (m && m[1].split(/\s+/).length <= 4) {
        if (current) entries.push(current);
        current = {
          term: m[1].trim(),
          text: line,
          pdfPageStart: page.pdfPage,
          pdfPageEnd: page.pdfPage,
          printedPageStart: page.printedPage,
          printedPageEnd: page.printedPage,
        };
      } else if (current) {
        current.text += " " + line;
        current.pdfPageEnd = page.pdfPage;
        current.printedPageEnd = page.printedPage;
      }
      // else: preamble text before the first detected term — intentionally dropped (not a definition)
    }
  }
  if (current) entries.push(current);

  for (const entry of entries) {
    const text = entry.text.replace(/\s+/g, " ").replace(/-\s+/g, "").trim();
    chunks.push({
      chunkId: makeChunkId(chSlug),
      sourceId: SOURCE_ID,
      sourceVersion,
      sourceTitle: SOURCE_TITLE,
      chapter,
      section: entry.term,
      pdfPageStart: entry.pdfPageStart,
      pdfPageEnd: entry.pdfPageEnd,
      printedPageStart: entry.printedPageStart,
      printedPageEnd: entry.printedPageEnd,
      figureRefs: [],
      needsVisualContext: false,
      text,
    });
  }

  return chunks;
}

function main() {
  if (!fs.existsSync(SOURCE_PDF)) {
    console.error(`Source PDF not found at ${SOURCE_PDF}`);
    process.exit(1);
  }

  fs.mkdirSync(DEST_DIR, { recursive: true });

  const hash = sha256File(SOURCE_PDF);
  const sourceVersion = hash.slice(0, 16);

  if (fs.existsSync(MANIFEST_PATH)) {
    const prevManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
    if (prevManifest.sourceVersion === sourceVersion && fs.existsSync(INDEX_PATH)) {
      console.log(`Source unchanged (version ${sourceVersion}) — index already up to date, skipping re-ingestion.`);
      return;
    }
  }

  fs.copyFileSync(SOURCE_PDF, DEST_PDF);

  const allChunks: Chunk[] = [];

  for (const section of SECTIONS) {
    const raw = extractPageRange(SOURCE_PDF, section.pdfStart, section.pdfEnd);
    const pages = cleanPages(raw, section.pdfStart, section.frontMatter);

    if (section.frontMatter) {
      allChunks.push(...buildGlossaryChunks(section.chapter, pages, sourceVersion));
    } else {
      const paragraphs = pagesToParagraphs(pages);
      allChunks.push(...buildChapterChunks(section.chapter, paragraphs, sourceVersion));
    }
    console.log(`Processed "${section.chapter}": pdf pages ${section.pdfStart}-${section.pdfEnd}`);
  }

  fs.writeFileSync(INDEX_PATH, JSON.stringify({ sourceId: SOURCE_ID, sourceVersion, sourceTitle: SOURCE_TITLE, chunks: allChunks }, null, 2));
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      {
        sourceId: SOURCE_ID,
        sourceVersion,
        sha256: hash,
        sourceTitle: SOURCE_TITLE,
        totalPdfPages: 479,
        sectionsIngested: SECTIONS.map((s) => s.chapter),
        chunkCount: allChunks.length,
        ingestedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log(`\nWrote ${allChunks.length} chunks to ${INDEX_PATH}`);
}

main();

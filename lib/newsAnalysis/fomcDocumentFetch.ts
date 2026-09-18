import "server-only";
import { createHash } from "node:crypto";
import { fetchTrusted } from "@/lib/newsAnalysis/trustedFetch";
import { TtlCache } from "@/lib/rag/cache";

const FOMC_ALLOWLIST = new Set(["www.federalreserve.gov"]);
const documentCache = new TtlCache<FetchedFomcDocument | null>();

export type FetchedFomcDocument = {
  title: string;
  bodyText: string; // real extracted prose — may be "" (nothing usable) even when tablesOmitted is also true, or non-empty alongside it (surrounding narrative survives a table-heavy page)
  tablesOmitted: boolean; // true whenever this document actually contained a <table> that was stripped — independent of whether bodyText also has real prose; always propagate this alongside bodyText, including to any future model input
  publishedAt: string | null; // precise ISO datetime, ONLY when the page states a real release time (e.g. "For release at 2:00 p.m. EDT") — never fabricated
  lastUpdate: string | null; // ISO date, from the page's own "Last Update:" footer, when present
  contentHash: string; // sha256(bodyText || title).slice(0,16)
};

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const MIN_PROSE_CHARS = 40;

// The Fed's press-release/minutes/projections pages use at least three
// different page templates (see lib/newsAnalysis/README-sources.md for the
// concrete examples this was verified against), but all of them contain a
// "Last Update:" footer marking the end of real content, and one of three
// generic markers reliably marks its start: an `id="article"` container, an
// `article__time` byline, or (the projections-page template, which has
// neither) its single `col-xs-12 col-sm-8 col-md-8` content wrapper.
function extractArticleSegment(html: string): string | null {
  const startCandidates = [html.indexOf('id="article"'), html.indexOf("article__time"), html.indexOf('"col-xs-12 col-sm-8 col-md-8"')].filter(
    (i) => i !== -1
  );
  if (startCandidates.length === 0) return null;
  const anchorIndex = Math.min(...startCandidates);
  // The anchor lands mid-tag (e.g. inside `<div id="article" class="...">`)
  // — start the segment right AFTER that tag's closing `>`, never mid-tag,
  // so a leftover attribute fragment can never leak into the body text.
  const tagEnd = html.indexOf(">", anchorIndex);
  if (tagEnd === -1) return null;
  const start = tagEnd + 1;
  const end = html.indexOf('id="lastUpdate"', start);
  return html.slice(start, end === -1 ? undefined : end);
}

function extractLastUpdate(html: string): string | null {
  const m = html.match(/id="lastUpdate"[^>]*>\s*Last Update:\s*([^<]+)/);
  if (!m) return null;
  const d = new Date(m[1].trim());
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// A document's own URL embeds its date as YYYYMMDD (e.g.
// ".../monetary20260916a.htm") — used only to anchor a real release TIME
// onto the correct calendar day; never used to invent a time that wasn't
// actually stated on the page.
function extractYmdFromUrl(url: string): string | null {
  const m = url.match(/(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const iso = `${y}-${mo}-${d}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

// Only the statement and projections pages state a real release time (e.g.
// "For release at 2:00 p.m. EDT") — implementation notes and minutes never
// do. When absent, this returns null rather than guessing a time from the
// document's date alone.
function extractReleaseTime(html: string, documentDateIso: string): string | null {
  const m = html.match(/For release at\s+(\d{1,2}):(\d{2})\s*(a\.m\.|p\.m\.)\s*,?\s*(EDT|EST)\b/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  const isPm = /p\.m\./i.test(m[3]);
  if (isPm && hour !== 12) hour += 12;
  if (!isPm && hour === 12) hour = 0;
  const offsetHours = m[4].toUpperCase() === "EDT" ? 4 : 5; // fixed UTC-4 / UTC-5, no DST ambiguity since the page states the abbreviation explicitly
  const [y, mo, d] = documentDateIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d, hour + offsetHours, minute, 0));
  return isNaN(dt.getTime()) ? null : dt.toISOString();
}

// Fetches a single FOMC document page and extracts clean plain-text body
// content. Any <table> is stripped entirely rather than flattened — a
// mis-parsed table (losing which number belongs to which row/column header,
// or which unit) is worse than no text at all, so a table-heavy page (e.g.
// the Economic Projections page) legitimately comes back with bodyText: ""
// and tablesOmitted: true, never with garbled numbers presented as prose.
export async function fetchFomcDocument(url: string): Promise<FetchedFomcDocument | null> {
  const cacheKey = `fomc-doc:${url}`;
  return documentCache.getOrCompute(cacheKey, async () => {
    const result = await fetchTrusted(url, FOMC_ALLOWLIST);
    if (!result.ok) return null;

    let segment = extractArticleSegment(result.body);
    if (!segment) return null;

    const titleMatch = segment.match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    const title = titleMatch ? decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim() : "";

    const hadTable = /<table[\s>]/i.test(segment);
    segment = segment.replace(/<table[\s\S]*?<\/table>/gi, " ");
    segment = segment.replace(/<ul class="list-unstyled">[\s\S]*?<\/ul>/gi, " "); // share-menu block
    segment = segment.replace(/<!--[\s\S]*?-->/g, " ");
    segment = segment.replace(/<\/(p|li|blockquote|h3)>/gi, "\n");
    segment = segment.replace(/<br\s*\/?>/gi, "\n");
    segment = segment.replace(/<[^>]+>/g, " ");
    segment = decodeEntities(segment);

    const bodyText = segment
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length >= MIN_PROSE_CHARS)
      .join("\n\n");

    // tablesOmitted reflects reality (a table WAS stripped) regardless of
    // whether surrounding narrative text also survived — the two are
    // independent facts, both worth keeping. A near-empty result (the page
    // really was almost all tables) still returns bodyText: "" honestly,
    // rather than substituting the title as if it were real body content.
    const tablesOmitted = hadTable;
    const finalBodyText = bodyText.length >= MIN_PROSE_CHARS ? bodyText : "";

    const documentDate = extractYmdFromUrl(url);
    const publishedAt = documentDate ? extractReleaseTime(result.body, documentDate) : null;

    return {
      title,
      bodyText: finalBodyText,
      tablesOmitted,
      publishedAt,
      lastUpdate: extractLastUpdate(result.body),
      contentHash: createHash("sha256").update(finalBodyText || title).digest("hex").slice(0, 16),
    } satisfies FetchedFomcDocument;
  }, (doc) => doc !== null);
}

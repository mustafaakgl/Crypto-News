// Pure, deterministic, LLM-free extraction of a few standout sentences from
// a publisher's own RSS excerpt (item.descriptionFull) — used when no AI
// analysis is available (or configured) so the detail panel still has
// something better than a raw blob of text to show immediately, with zero
// network calls. Every sentence returned is a VERBATIM substring of the
// original text — never rewritten, reordered in content, truncated
// mid-clause, or paraphrased — so attribution, hedging language ("according
// to", "reportedly"), negation, and numeric context all survive intact.
// Runs identically on the client (no fetch needed) and would run the same
// way on the server if ever needed there.

// Abbreviations whose trailing period must NOT be treated as a sentence
// boundary. Matched against the exact token immediately preceding the
// period (case-sensitive), so this never over-fires on an unrelated word
// that happens to end in the same letters.
const ABBREVIATIONS = new Set([
  "U.S", "U.K", "U.N", "E.U",
  "Mr", "Mrs", "Ms", "Dr", "Sr", "Jr", "St", "Prof", "Rev", "Gov", "Sen", "Rep",
  "vs", "etc", "approx", "no",
  "Inc", "Corp", "Ltd", "Co", "LLC", "Co",
  "Jan", "Feb", "Mar", "Apr", "Jun", "Jul", "Aug", "Sep", "Sept", "Oct", "Nov", "Dec",
]);

function endsWithAbbreviation(before: string): boolean {
  // Checked as a literal suffix (not a `[A-Za-z]+$` token match) because an
  // abbreviation like "U.S" itself CONTAINS a period — a plain trailing-word
  // regex would only ever see the "S" after it and miss the "U." before it.
  for (const abbr of ABBREVIATIONS) {
    if (before.length < abbr.length) continue;
    if (before.slice(before.length - abbr.length) !== abbr) continue;
    const charBeforeAbbr = before[before.length - abbr.length - 1];
    if (charBeforeAbbr === undefined || /[\s(]/.test(charBeforeAbbr)) return true;
  }
  // A single capital letter right before the period is almost always an
  // initial ("J. Powell"), never a genuine sentence end.
  if (/(^|[\s(])[A-Z]$/.test(before)) return true;
  return false;
}

// Splits `text` into sentences on '.', '!', '?' — but never inside a
// decimal number (a digit immediately on both sides of the period) and
// never right after a known abbreviation or a bare initial.
export function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences: string[] = [];
  let start = 0;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;

    if (ch === ".") {
      const prevChar = normalized[i - 1] ?? "";
      const nextChar = normalized[i + 1] ?? "";
      if (/\d/.test(prevChar) && /\d/.test(nextChar)) continue; // e.g. "3.5%"
      if (endsWithAbbreviation(normalized.slice(0, i))) continue; // e.g. "U.S.", "J."
    }

    const rest = normalized.slice(i + 1);
    const nextNonSpace = rest.match(/^\s*(\S)/);
    // End of string, or the next visible character looks like a new
    // sentence's start (capital letter, digit, opening quote/paren) — a
    // lowercase continuation means this punctuation wasn't a real boundary.
    if (nextNonSpace && !/[A-Z0-9"'“‘(]/.test(nextNonSpace[1])) continue;

    sentences.push(normalized.slice(start, i + 1).trim());
    start = i + 1;
  }

  const tail = normalized.slice(start).trim();
  if (tail) sentences.push(tail);

  return sentences.filter((s) => s.length > 0);
}

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Word-overlap ratio of `sentence` against `title` — used to drop a
// "highlight" that's really just the headline restated (the same words,
// possibly reordered or lightly reworded), never a genuine second point.
function titleOverlapRatio(sentence: string, title: string): number {
  const sentenceWords = normalizeForComparison(sentence).split(" ").filter(Boolean);
  if (sentenceWords.length === 0) return 0;
  const titleWords = new Set(normalizeForComparison(title).split(" ").filter(Boolean));
  if (titleWords.size === 0) return 0;
  const overlap = sentenceWords.filter((w) => titleWords.has(w)).length;
  return overlap / sentenceWords.length;
}

export const MAX_HIGHLIGHT_SENTENCES = 4;
// Fewer sentences than this and forcing a bulleted "Key points" list would
// just fragment one short thought into artificial-looking bullets — a
// single readable paragraph represents the source more honestly.
const MIN_SENTENCES_FOR_KEY_POINTS = 3;
const TITLE_OVERLAP_DROP_THRESHOLD = 0.8;

export type ExcerptPresentation =
  | { mode: "none" }
  | { mode: "paragraph"; text: string }
  | { mode: "key_points"; sentences: string[] };

// The single entry point the detail panel uses to decide how to present a
// publisher excerpt with no LLM involved. Never invents text: every
// sentence in the output is a verbatim slice of `descriptionFull`.
export function selectExcerptHighlights(descriptionFull: string, title: string): ExcerptPresentation {
  const sentences = splitIntoSentences(descriptionFull);
  if (sentences.length === 0) return { mode: "none" };

  if (sentences.length < MIN_SENTENCES_FOR_KEY_POINTS) {
    return { mode: "paragraph", text: sentences.join(" ") };
  }

  const seen = new Set<string>();
  const candidates: string[] = [];
  for (const sentence of sentences) {
    const key = normalizeForComparison(sentence);
    if (!key || seen.has(key)) continue; // drop exact/near-duplicate repeats
    if (titleOverlapRatio(sentence, title) >= TITLE_OVERLAP_DROP_THRESHOLD) continue; // drop "just the headline again"
    seen.add(key);
    candidates.push(sentence);
  }

  if (candidates.length === 0) {
    // Every sentence was a duplicate or a headline restatement — fall back
    // to the plain paragraph rather than showing an empty "Key points" list.
    return { mode: "paragraph", text: sentences.join(" ") };
  }

  // Sentences are kept in their ORIGINAL order (never re-ranked) — a
  // publisher's lede is written to front-load what matters, and re-ordering
  // without real language understanding would be a guess, not an improvement.
  return { mode: "key_points", sentences: candidates.slice(0, MAX_HIGHLIGHT_SENTENCES) };
}

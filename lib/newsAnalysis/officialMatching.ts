// Pure entity+event+date matching logic for the SEC source, deliberately
// separated from the network fetching in officialSources.ts (which needs
// "server-only") so it can be unit tested directly with synthetic
// candidates. Fed/FOMC matching now lives in fomcMatching.ts (calendar/
// meeting-based, not RSS-candidate-based) — this file re-exports the shared
// date-window helper it also needs.
import type { NewsItem } from "@/lib/news";

export type OfficialCandidate = { title: string; url: string; publishedAt: string };

const DAY_MS = 86_400_000;

// The official release may precede the news article by a few days (typical
// reporting lag) or trail it by up to a day (a live-updates article written
// just ahead of a same-day statement) — anything outside that window is not
// treated as the same event.
export function isWithinAnnouncementWindow(newsPublishedAt: string, officialPublishedAt: string): boolean {
  const diffMs = new Date(newsPublishedAt).getTime() - new Date(officialPublishedAt).getTime();
  return diffMs >= -1 * DAY_MS && diffMs <= 3 * DAY_MS;
}

const TITLE_STOPWORDS = new Set([
  "the", "sec", "and", "for", "after", "with", "from", "its", "new", "over", "into", "amid", "says", "report", "update", "u.s.",
]);

export function significantTokens(title: string): Set<string> {
  const words = title.match(/\b[A-Z][a-zA-Z.]{3,}\b/g) ?? [];
  return new Set(words.map((w) => w.toLowerCase().replace(/\.$/, "")).filter((w) => !TITLE_STOPWORDS.has(w)));
}

export const SEC_MENTION = /\bsec\b/i;

// Entity: requires a shared proper-noun/capitalized token between the news
// title and the release title (e.g. a company or filing name) — "SEC"
// appearing in the news text alone is never sufficient. Date: see above.
export function pickSecMatch(item: NewsItem, candidates: OfficialCandidate[]): OfficialCandidate | null {
  const haystack = `${item.title} ${item.descriptionFull}`;
  if (!SEC_MENTION.test(haystack)) return null;

  const newsTokens = significantTokens(item.title);
  if (newsTokens.size === 0) return null;

  const matches = candidates.filter((c) => {
    if (!isWithinAnnouncementWindow(item.publishedAt, c.publishedAt)) return false;
    const candidateTokens = significantTokens(c.title);
    return [...newsTokens].some((t) => candidateTokens.has(t));
  });
  if (matches.length !== 1) return null;
  return matches[0];
}

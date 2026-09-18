// Pure, conservative same-event grouping for articles that don't have a
// verified event identity (like FOMC's calendar). Deliberately narrow: a
// shared asset alone is never enough (nearly every article mentions
// Bitcoin), and neither is a shared generic word — grouping requires BOTH a
// shared detected asset AND a shared distinctive proper-noun token in the
// title, within a tight time window. An article this misses stays ungrouped
// rather than being forced into a guessed cluster.
import type { NewsItem } from "@/lib/news";

const TITLE_STOPWORDS = new Set([
  "the", "and", "for", "after", "with", "from", "its", "new", "over", "into", "amid", "says", "report", "update",
  "u.s.", "crypto", "cryptocurrency", "coin", "coins", "today", "this", "that", "what", "how",
  "why", "are", "was", "were", "will", "can", "could", "should", "here", "your", "their",
  // Asset/project NAMES (from lib/assets.ts's own tagging vocabulary) are
  // excluded — asset overlap is already checked separately via
  // NewsItem.assets, so the coin's own name must never double as the
  // "distinctive event token" that justifies grouping on its own.
  "bitcoin", "ethereum", "ether", "litecoin", "dogecoin", "cardano", "chainlink", "cosmos", "avalanche",
  "polkadot", "polygon", "ripple", "solana", "tether", "toncoin", "tron", "zcash", "monero", "shiba",
]);

function significantTokens(title: string): Set<string> {
  const words = title.match(/\b[A-Z][a-zA-Z.']{2,}\b/g) ?? [];
  return new Set(words.map((w) => w.toLowerCase().replace(/[.']$/, "")).filter((w) => !TITLE_STOPWORDS.has(w)));
}

const TIME_WINDOW_MS = 48 * 60 * 60 * 1000;

// Seed-anchored clustering: every member is validated directly against the
// group's original seed article, never against other members — this is
// what stops a chain of loosely-similar titles from transitively dragging
// unrelated events into one group (A matches B, B matches C, but A and C
// are unrelated — C never joins A's group here).
export function groupGenericArticles(items: NewsItem[]): Map<string, string> {
  const assignments = new Map<string, string>();
  const used = new Set<string>();

  for (const seed of items) {
    if (used.has(seed.id)) continue;

    const seedTokens = significantTokens(seed.title);
    const seedAssets = new Set(seed.assets);
    if (seedTokens.size === 0 || seedAssets.size === 0) continue;

    const members: NewsItem[] = [seed];
    for (const candidate of items) {
      if (candidate.id === seed.id || used.has(candidate.id)) continue;
      const withinWindow = Math.abs(new Date(seed.publishedAt).getTime() - new Date(candidate.publishedAt).getTime()) <= TIME_WINDOW_MS;
      if (!withinWindow) continue;

      const sharedAsset = candidate.assets.some((a) => seedAssets.has(a));
      if (!sharedAsset) continue;

      const candidateTokens = significantTokens(candidate.title);
      const sharedToken = [...seedTokens].some((t) => candidateTokens.has(t));
      if (!sharedToken) continue;

      members.push(candidate);
    }

    if (members.length > 1) {
      const groupId = `generic:${seed.id}`;
      for (const m of members) {
        assignments.set(m.id, groupId);
        used.add(m.id);
      }
    }
  }

  return assignments;
}

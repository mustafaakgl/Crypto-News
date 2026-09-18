import type { NewsItem } from "@/lib/news";

export type Briefing = {
  items: NewsItem[];
  preparedAt: string; // ISO, when this view was rendered
  windowFrom: string; // ISO
  windowTo: string; // ISO
};

const WINDOW_HOURS = 24;
const MAX_ITEMS = 12;

// Purely deterministic: no LLM call, no fabricated summary or verification —
// just the most recent items already in the fetched news cache.
export function buildBriefing(items: NewsItem[]): Briefing {
  const now = new Date();
  const windowTo = now.toISOString();
  const windowFrom = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

  const recent = items
    .filter((item) => item.publishedAt >= windowFrom)
    .slice(0, MAX_ITEMS);

  return { items: recent, preparedAt: windowTo, windowFrom, windowTo };
}

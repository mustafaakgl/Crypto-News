// Pure, shared (client + server) classification of how much real source
// text an article actually has — never assume an RSS description is full
// article text. Both the client (for instant, no-fetch display before the
// server's real source resolution arrives) and the server run the exact
// same function on the exact same NewsItem shape. Actually resolving the
// real SourceRecord[] (with genuine fetch times and an official-announcement
// match, when one exists) is server-only — see
// lib/newsAnalysis/sourceResolver.ts.
import type { NewsItem } from "@/lib/news";
import type { ContentScope } from "@/lib/newsAnalysis/types";

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function classifyContentScope(item: NewsItem): ContentScope {
  if (wordCount(item.descriptionFull) === 0) return "headline_only";
  // Publisher RSS descriptions are excerpts, never confirmed to be the full
  // article body — "full_article" is reserved for a future ingestion path
  // that doesn't exist yet (see lib/newsAnalysis/README-sources.md for why).
  return "publisher_excerpt";
}

export const CONTENT_SCOPE_LABEL: Record<ContentScope, string> = {
  full_article: "Full article",
  publisher_excerpt: "Publisher excerpt",
  official_announcement: "Official announcement",
  headline_only: "Headline only",
};

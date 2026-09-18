import "server-only";
import { createHash } from "node:crypto";
import type { NewsItem } from "@/lib/news";
import type { SourceRecord } from "@/lib/newsAnalysis/types";
import { classifyContentScope } from "@/lib/newsAnalysis/contentScope";
import { matchOfficialSources } from "@/lib/newsAnalysis/officialSources";
import { TtlCache } from "@/lib/rag/cache";

// Keyed by article id AND a hash of its current RSS description, so an
// upstream correction to the RSS text (a real edit, not a re-fetch) produces
// a fresh cache entry with a fresh fetchedAt — never reuses a stale one.
function resolutionCacheKey(item: NewsItem): string {
  const contentHash = createHash("sha256").update(item.descriptionFull).digest("hex").slice(0, 16);
  return `${item.id}:${contentHash}`;
}

const resolutionCache = new TtlCache<SourceRecord[]>();

function buildRssExcerptRecord(item: NewsItem): SourceRecord | null {
  if (classifyContentScope(item) === "headline_only") return null;
  return {
    id: `${item.id}:rss-excerpt`,
    kind: "rss_excerpt",
    label: `Publisher excerpt — ${item.sourceName}`,
    text: item.descriptionFull,
    url: item.url,
    sourcePublishedAt: item.publishedAt,
    fetchedAt: new Date().toISOString(),
    contentHash: createHash("sha256").update(item.descriptionFull).digest("hex").slice(0, 16),
  };
}

// Resolves every source record this article actually has — the RSS excerpt
// (if any) and, when a confident same-entity/event/date match exists, a
// separate official-announcement record. Coalesces concurrent resolutions
// for the same article+content, and never throws: a failure in the official-
// announcement lookup just means that record is omitted, not that the whole
// resolution fails (the RSS excerpt path never depends on network access).
export async function resolveSourceRecords(item: NewsItem): Promise<SourceRecord[]> {
  const cacheKey = resolutionCacheKey(item);
  return resolutionCache.getOrCompute(cacheKey, async () => {
    const records: SourceRecord[] = [];

    const excerpt = buildRssExcerptRecord(item);
    if (excerpt) records.push(excerpt);

    try {
      records.push(...(await matchOfficialSources(item)));
    } catch {
      // A source error here must never break article resolution as a whole.
    }

    return records;
  });
}

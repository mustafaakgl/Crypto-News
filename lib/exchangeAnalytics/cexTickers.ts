import "server-only";
import { fetchJson } from "@/lib/exchangeAnalytics/httpClient";
import { classifyBaseAsset, classifyQuoteCurrency } from "@/lib/exchangeAnalytics/currencyClassification";
import type { CexTickerBreakdown, PairBreakdownEntry } from "@/lib/exchangeAnalytics/types";
import { TtlCache } from "@/lib/rag/cache";

const CG_BASE = "https://api.coingecko.com/api/v3";
const REVALIDATE_SECONDS = 900;

type RawTicker = {
  base?: unknown;
  target?: unknown;
  converted_volume?: { usd?: unknown };
  is_anomaly?: unknown;
  is_stale?: unknown;
};

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

function addTo(entries: Map<string, number>, key: string, amount: number) {
  entries.set(key, (entries.get(key) ?? 0) + amount);
}

function toSortedEntries(entries: Map<string, number>): PairBreakdownEntry[] {
  return Array.from(entries.entries())
    .map(([key, volumeUsd]) => ({ key, volumeUsd }))
    .sort((a, b) => b.volumeUsd - a.volumeUsd);
}

const tickerCache = new TtlCache<CexTickerBreakdown | null>();

// Only page 1 (CoinGecko returns tickers pre-sorted by volume descending,
// confirmed empirically) — a busy exchange can have hundreds of pairs, and
// fetching every page would blow the anonymous rate limit for a single
// drill-down. The coverage is stated explicitly in coverageNote rather than
// silently presented as complete.
const PAIRS_PER_PAGE = 100;

export async function getCexTickerBreakdown(exchangeId: string): Promise<CexTickerBreakdown | null> {
  const cacheKey = `tickers:${exchangeId}`;
  return tickerCache.getOrCompute(
    cacheKey,
    async (): Promise<CexTickerBreakdown | null> => {
      const result = await fetchJson(
        `${CG_BASE}/exchanges/${exchangeId}/tickers?page=1`,
        `CoinGecko tickers (${exchangeId})`,
        REVALIDATE_SECONDS
      );
      if (!result.ok) return null;

      const data = result.data as { tickers?: unknown };
      if (!Array.isArray(data.tickers)) return null;
      const raw = data.tickers as RawTicker[];

      const byBaseAsset = new Map<string, number>();
      const byQuoteType = new Map<string, number>();
      let pairsConsidered = 0;

      for (const t of raw.slice(0, PAIRS_PER_PAGE)) {
        // Anomalous/stale tickers are CoinGecko's own data-quality flags —
        // excluded rather than silently folded into the totals.
        if (t.is_anomaly === true || t.is_stale === true) continue;
        const base = typeof t.base === "string" ? t.base : null;
        const target = typeof t.target === "string" ? t.target : null;
        const usdVolume = num(t.converted_volume?.usd);
        if (!base || !target || usdVolume === null) continue;

        // Each pair's single USD-converted volume figure is added exactly
        // once per breakdown — never counted again for "the other side" of
        // the same pair.
        addTo(byBaseAsset, classifyBaseAsset(base), usdVolume);
        addTo(byQuoteType, classifyQuoteCurrency(target), usdVolume);
        pairsConsidered++;
      }

      if (pairsConsidered === 0) return null;

      return {
        exchangeId,
        byBaseAsset: toSortedEntries(byBaseAsset),
        byQuoteType: toSortedEntries(byQuoteType),
        pairsConsidered,
        coverageNote: `Based on the top ${pairsConsidered} pairs by volume (page 1 of this exchange's tickers) — not every listed pair.`,
        asOf: new Date().toISOString(),
      } satisfies CexTickerBreakdown;
    },
    (v) => v !== null
  );
}

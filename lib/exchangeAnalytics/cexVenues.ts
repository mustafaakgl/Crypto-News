import "server-only";
import { fetchJson, delay } from "@/lib/exchangeAnalytics/httpClient";
import {
  daysParamForPeriod,
  volumeKindForPeriod,
  sliceForPeriod,
  periodWindowFromPoints,
  trailing24hWindow,
  sumVolumeBtc,
  sumVolumeUsdWithHistoricalRates,
  type VolumePoint,
} from "@/lib/exchangeAnalytics/periodMath";
import type { CexVenue, CexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { TtlCache } from "@/lib/rag/cache";

const CG_BASE = "https://api.coingecko.com/api/v3";
// One page — see lib/exchangeAnalytics/README.md for why (CoinGecko's
// anonymous public API allows only 5-15 requests/minute; ranking is scoped
// to this pool and that scope is shown in the UI, never silently assumed
// to be "all exchanges").
const RANKING_POOL_SIZE = 250;
const RANKING_REVALIDATE_SECONDS = 900; // 15 min
const HISTORY_REVALIDATE_SECONDS = 900;
// Spacing between sequential per-venue history calls — keeps a burst of up
// to 10 calls comfortably under the confirmed 5-15/min anonymous limit.
const SEQUENTIAL_DELAY_MS = 4500;

type RawExchange = {
  id: string;
  name: string;
  url: string;
  image: string | null;
  trust_score: number | null;
  trust_score_rank: number | null;
  trade_volume_24h_btc: number;
};

function isRawExchange(v: unknown): v is RawExchange {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.name === "string" && typeof o.trade_volume_24h_btc === "number";
}

async function fetchRankingPool(): Promise<{ pool: RawExchange[]; warnings: string[] }> {
  const warnings: string[] = [];
  const result = await fetchJson(
    `${CG_BASE}/exchanges?per_page=${RANKING_POOL_SIZE}&page=1`,
    "CoinGecko exchanges list",
    RANKING_REVALIDATE_SECONDS
  );
  if (!result.ok) {
    warnings.push(result.error);
    return { pool: [], warnings };
  }
  if (!Array.isArray(result.data)) {
    warnings.push("CoinGecko exchanges list: unexpected response shape.");
    return { pool: [], warnings };
  }
  return { pool: result.data.filter(isRawExchange), warnings };
}

async function fetchBtcUsdPriceHistory(days: 1 | 30 | 365): Promise<[number, number][]> {
  const result = await fetchJson(
    `${CG_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`,
    "CoinGecko BTC/USD price history",
    HISTORY_REVALIDATE_SECONDS
  );
  if (!result.ok) return [];
  const data = result.data as { prices?: unknown };
  if (!Array.isArray(data.prices)) return [];
  return data.prices.filter(
    (p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number"
  );
}

async function fetchVenueVolumeChart(id: string, days: 1 | 30 | 365): Promise<VolumePoint[]> {
  const result = await fetchJson(
    `${CG_BASE}/exchanges/${id}/volume_chart?days=${days}`,
    `CoinGecko volume chart (${id})`,
    HISTORY_REVALIDATE_SECONDS
  );
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data
    .filter((p): p is [number, string] => Array.isArray(p) && p.length === 2)
    .map((p) => ({ timestampMs: Number(p[0]), volumeBtc: Number(p[1]) }))
    .filter((p) => isFinite(p.timestampMs) && isFinite(p.volumeBtc));
}

const overviewCache = new TtlCache<CexOverviewResult>();

// Venues are SELECTED using the cheap, always-available 24h reported
// volume (one list call), then — for 7D/30D/1Y only — each selected
// venue's own real period history is fetched to rank and total them
// accurately. This means a venue outside the top N by 24h volume that
// might rank higher over a longer window is not captured; that scope is
// surfaced in the UI, not hidden.
export async function getCexOverview(period: ExchangePeriod, count: VenueCount): Promise<CexOverviewResult> {
  const cacheKey = `cex:${period}:${count}`;
  return overviewCache.getOrCompute(
    cacheKey,
    async (): Promise<CexOverviewResult> => {
      const warnings: string[] = [];
      const { pool, warnings: poolWarnings } = await fetchRankingPool();
      warnings.push(...poolWarnings);
      if (pool.length === 0) {
        return { period, venues: [], rankingPoolSize: 0, asOf: new Date().toISOString(), warnings };
      }

      const candidates = [...pool].sort((a, b) => b.trade_volume_24h_btc - a.trade_volume_24h_btc).slice(0, count);
      const days = daysParamForPeriod(period);
      const volumeKind = volumeKindForPeriod(period);
      const now = Date.now();

      const priceHistory = await fetchBtcUsdPriceHistory(days);
      if (priceHistory.length === 0) warnings.push("BTC/USD price history unavailable — USD figures omitted.");

      const venues: CexVenue[] = [];

      for (const ex of candidates) {
        if (period === "1d") {
          // Cheap path — the ranking pool already has the real 24h figure, no extra call needed.
          const window = trailing24hWindow(now);
          const currentBtcPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1][1] : null;
          venues.push({
            id: ex.id,
            name: ex.name,
            url: ex.url,
            image: ex.image,
            trustScore: ex.trust_score,
            trustScoreRank: ex.trust_score_rank,
            volumeBtc: ex.trade_volume_24h_btc,
            volumeKind,
            volumeUsd: currentBtcPrice !== null ? ex.trade_volume_24h_btc * currentBtcPrice : null,
            usdRateBasis: currentBtcPrice !== null ? "current_rate" : null,
            periodStart: new Date(window.startMs).toISOString(),
            periodEnd: new Date(window.endMs).toISOString(),
          });
          continue;
        }

        const points = await fetchVenueVolumeChart(ex.id, days);
        await delay(SEQUENTIAL_DELAY_MS);
        if (points.length === 0) {
          warnings.push(`${ex.name}: volume history unavailable for this period.`);
          continue;
        }
        const sliced = sliceForPeriod(points, period);
        const window = periodWindowFromPoints(sliced);
        if (!window) continue;

        const btcTotal = sumVolumeBtc(sliced);
        const usdTotal = priceHistory.length > 0 ? sumVolumeUsdWithHistoricalRates(sliced, priceHistory) : null;
        venues.push({
          id: ex.id,
          name: ex.name,
          url: ex.url,
          image: ex.image,
          trustScore: ex.trust_score,
          trustScoreRank: ex.trust_score_rank,
          volumeBtc: btcTotal,
          volumeKind,
          volumeUsd: usdTotal,
          usdRateBasis: usdTotal !== null ? "daily_historical_rate" : null,
          periodStart: new Date(window.startMs).toISOString(),
          periodEnd: new Date(window.endMs).toISOString(),
        });
      }

      // Re-rank by the just-computed PERIOD volume — for 7D/30D/1Y this can
      // genuinely differ from the 24h-volume selection order above.
      venues.sort((a, b) => b.volumeBtc - a.volumeBtc);

      return { period, venues, rankingPoolSize: pool.length, asOf: new Date().toISOString(), warnings };
    },
    (result) => result.venues.length > 0
  );
}

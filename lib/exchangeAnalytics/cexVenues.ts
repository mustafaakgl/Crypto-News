import "server-only";
import { fetchJson, COINGECKO_PACE_KEY, COINGECKO_MIN_INTERVAL_MS } from "@/lib/httpClient";
import {
  daysParamForPeriod,
  volumeKindForPeriod,
  prepareDailySeries,
  trailing24hWindow,
  sumVolumeBtc,
  sumVolumeUsdWithHistoricalRates,
  priceAtOrBefore,
  type VolumePoint,
} from "@/lib/exchangeAnalytics/periodMath";
import type { CexVenue, CexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { TtlCache, type StaleAwareResult } from "@/lib/rag/cache";

const CG_BASE = "https://api.coingecko.com/api/v3";
// One page — see lib/exchangeAnalytics/README.md for why (CoinGecko's
// anonymous public API allows only 5-15 requests/minute; ranking is scoped
// to this pool and that scope is shown in the UI, never silently assumed
// to be "all exchanges").
const RANKING_POOL_SIZE = 250;
const HISTORY_REVALIDATE_SECONDS = 900;
// The in-memory result cache's normal freshness window and how long a
// stale-but-real result may still be served (immediately, while a
// background refresh runs) before it's discarded outright. Matched to the
// underlying fetch revalidate window above rather than an unrelated
// default, so "fresh" here means the same thing it means to the fetch layer.
const RESULT_TTL_MS = HISTORY_REVALIDATE_SECONDS * 1000;
const RESULT_STALE_TTL_MS = 60 * 60 * 1000; // up to 1h old, then a cold recompute is forced

const PACED = { key: COINGECKO_PACE_KEY, minIntervalMs: COINGECKO_MIN_INTERVAL_MS };

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
  const result = await fetchJson(`${CG_BASE}/exchanges?per_page=${RANKING_POOL_SIZE}&page=1`, "CoinGecko exchanges list", HISTORY_REVALIDATE_SECONDS, PACED);
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
  const result = await fetchJson(`${CG_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`, "CoinGecko BTC/USD price history", HISTORY_REVALIDATE_SECONDS, PACED);
  if (!result.ok) return [];
  const data = result.data as { prices?: unknown };
  if (!Array.isArray(data.prices)) return [];
  return data.prices.filter(
    (p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number"
  );
}

async function fetchVenueVolumeChart(id: string, days: 1 | 30 | 365): Promise<VolumePoint[]> {
  const result = await fetchJson(`${CG_BASE}/exchanges/${id}/volume_chart?days=${days}`, `CoinGecko volume chart (${id})`, HISTORY_REVALIDATE_SECONDS, PACED);
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data
    .filter((p): p is [number, string] => Array.isArray(p) && p.length === 2)
    .map((p) => ({ timestampMs: Number(p[0]), volumeBtc: Number(p[1]) }))
    .filter((p) => isFinite(p.timestampMs) && isFinite(p.volumeBtc));
}

const overviewCache = new TtlCache<CexOverviewResult>();

// Sorts period_total venues first (by their verified period volume), then
// unverified_daily_snapshot venues after (by their single-day volume) —
// never interleaved by raw volumeBtc, since a 30-day sum and a single
// day's snapshot are not the same unit and mixing them in one ranking
// would misrepresent both.
function rankVenues(venues: CexVenue[]): CexVenue[] {
  const rank = (k: CexVenue["volumeKind"]) => (k === "unverified_daily_snapshot" ? 1 : 0);
  return [...venues].sort((a, b) => rank(a.volumeKind) - rank(b.volumeKind) || b.volumeBtc - a.volumeBtc);
}

// Venues are SELECTED using the cheap, always-available 24h reported
// volume (one list call) — so for 7D/30D/1Y, the CANDIDATE pool is drawn
// from today's top-N by 24h volume, not the true top-N over that longer
// window; a venue outside today's top N that ranked higher over the full
// period would not be captured. That scope is surfaced in the UI, never
// hidden. Only after that selection is each candidate's own real period
// history fetched to rank and total them accurately among themselves.
async function computeCexOverview(period: ExchangePeriod, count: VenueCount): Promise<CexOverviewResult> {
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
      const currentBtcPrice = priceHistory.length > 0 ? priceAtOrBefore(priceHistory, now) : null;
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

    const rawPoints = await fetchVenueVolumeChart(ex.id, days);
    if (rawPoints.length === 0) {
      warnings.push(`${ex.name}: volume history unavailable for this period.`);
      continue;
    }

    const prepared = prepareDailySeries(rawPoints, period, now);

    if (!prepared.verified) {
      if (!prepared.latestCompletePoint) {
        warnings.push(`${ex.name}: no completed daily data available for this period.`);
        continue;
      }
      // Fall back to the single latest COMPLETE day's snapshot rather than
      // summing a series that failed verification (gap, duplicate, or too
      // few completed days) — never presented as a period total.
      const point = prepared.latestCompletePoint;
      const dayMs = 86_400_000;
      const price = priceHistory.length > 0 ? priceAtOrBefore(priceHistory, point.timestampMs) : null;
      warnings.push(`${ex.name}: ${period} total could not be verified (${prepared.reason}) — showing latest complete day's snapshot instead.`);
      venues.push({
        id: ex.id,
        name: ex.name,
        url: ex.url,
        image: ex.image,
        trustScore: ex.trust_score,
        trustScoreRank: ex.trust_score_rank,
        volumeBtc: point.volumeBtc,
        volumeKind: "unverified_daily_snapshot",
        volumeUsd: price !== null ? point.volumeBtc * price : null,
        usdRateBasis: price !== null ? "daily_historical_rate" : null,
        periodStart: new Date(point.timestampMs).toISOString(),
        periodEnd: new Date(point.timestampMs + dayMs).toISOString(),
      });
      continue;
    }

    const sliced = prepared.points;
    const btcTotal = sumVolumeBtc(sliced);
    const usdTotal = priceHistory.length > 0 ? sumVolumeUsdWithHistoricalRates(sliced, priceHistory) : null;
    const dayMs = 86_400_000;
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
      periodStart: new Date(sliced[0].timestampMs).toISOString(),
      periodEnd: new Date(sliced[sliced.length - 1].timestampMs + dayMs).toISOString(),
    });
  }

  return { period, venues: rankVenues(venues), rankingPoolSize: pool.length, asOf: new Date().toISOString(), warnings };
}

export async function getCexOverview(period: ExchangePeriod, count: VenueCount): Promise<StaleAwareResult<CexOverviewResult>> {
  const cacheKey = `cex:${period}:${count}`;
  return overviewCache.getFreshOrStale(cacheKey, () => computeCexOverview(period, count), {
    shouldCache: (result) => result.venues.length > 0,
    ttlMs: RESULT_TTL_MS,
    staleTtlMs: RESULT_STALE_TTL_MS,
  });
}

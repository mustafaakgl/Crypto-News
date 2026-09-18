import "server-only";
import { fetchJson, COINGECKO_PACE_KEY, COINGECKO_MIN_INTERVAL_MS } from "@/lib/httpClient";
import {
  daysParamForPeriod,
  volumeKindForPeriod,
  latestCompleteDailyPoint,
  trailing24hWindow,
  snapshotWindow,
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

async function fetchBtcUsdPriceHistory(days: 1 | 30): Promise<[number, number][]> {
  const result = await fetchJson(`${CG_BASE}/coins/bitcoin/market_chart?vs_currency=usd&days=${days}`, "CoinGecko BTC/USD price history", HISTORY_REVALIDATE_SECONDS, PACED);
  if (!result.ok) return [];
  const data = result.data as { prices?: unknown };
  if (!Array.isArray(data.prices)) return [];
  return data.prices.filter(
    (p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number"
  );
}

async function fetchVenueVolumeChart(id: string, days: 1 | 30): Promise<VolumePoint[]> {
  const result = await fetchJson(`${CG_BASE}/exchanges/${id}/volume_chart?days=${days}`, `CoinGecko volume chart (${id})`, HISTORY_REVALIDATE_SECONDS, PACED);
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data
    .filter((p): p is [number, string] => Array.isArray(p) && p.length === 2)
    .map((p) => ({ timestampMs: Number(p[0]), volumeBtc: Number(p[1]) }))
    .filter((p) => isFinite(p.timestampMs) && isFinite(p.volumeBtc));
}

const overviewCache = new TtlCache<CexOverviewResult>();

// Venues are SELECTED using the cheap, always-available 24h reported
// volume (one list call) — so for 7D/30D/1Y, the CANDIDATE pool is drawn
// from today's top-N by 24h volume, not a true top-N over any longer
// window (no such verified window exists — see periodMath.ts). That scope
// is surfaced in the UI, never hidden.
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

    // 7D/30D/1Y all resolve to the SAME thing today: the single most
    // recent verifiably-complete daily observation, never a multi-day sum
    // (see periodMath.ts for why). The period buttons still matter for
    // Flows and will matter again for Volume once the source's timestamp
    // semantics are actually confirmed — this is a deliberately-kept
    // limitation, not a bug.
    const rawPoints = await fetchVenueVolumeChart(ex.id, days);
    const point = latestCompleteDailyPoint(rawPoints, now);
    if (!point) {
      warnings.push(`${ex.name}: no completed daily volume data available.`);
      continue;
    }
    const window = snapshotWindow(point);
    const price = priceHistory.length > 0 ? priceAtOrBefore(priceHistory, point.timestampMs) : null;
    venues.push({
      id: ex.id,
      name: ex.name,
      url: ex.url,
      image: ex.image,
      trustScore: ex.trust_score,
      trustScoreRank: ex.trust_score_rank,
      volumeBtc: point.volumeBtc,
      volumeKind,
      volumeUsd: price !== null ? point.volumeBtc * price : null,
      usdRateBasis: price !== null ? "daily_historical_rate" : null,
      periodStart: new Date(window.startMs).toISOString(),
      periodEnd: new Date(window.endMs).toISOString(),
    });
  }

  venues.sort((a, b) => b.volumeBtc - a.volumeBtc);
  return { period, venues, rankingPoolSize: pool.length, asOf: new Date().toISOString(), warnings };
}

// Shared with Exchange Flows (lib/exchangeFlows) so venue SELECTION stays
// consistent across both tabs — Flows never invents its own top-N logic
// that could silently diverge from what Volume shows for the "same"
// selection. Same today's-24h-volume ranking basis as computeCexOverview
// above; that scope limitation applies here too.
export async function getCandidateVenues(count: VenueCount): Promise<{ id: string; name: string }[]> {
  const { pool } = await fetchRankingPool();
  return [...pool]
    .sort((a, b) => b.trade_volume_24h_btc - a.trade_volume_24h_btc)
    .slice(0, count)
    .map((ex) => ({ id: ex.id, name: ex.name }));
}

export async function getCexOverview(period: ExchangePeriod, count: VenueCount): Promise<StaleAwareResult<CexOverviewResult>> {
  const cacheKey = `cex:${period}:${count}`;
  return overviewCache.getFreshOrStale(cacheKey, () => computeCexOverview(period, count), {
    shouldCache: (result) => result.venues.length > 0,
    ttlMs: RESULT_TTL_MS,
    staleTtlMs: RESULT_STALE_TTL_MS,
  });
}

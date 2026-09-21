import "server-only";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import { ADAPTERS, getVenuePairs, RESOLUTION_MS } from "@/lib/exchangeVolume/adapters";
import { CEX_VENUES } from "@/lib/exchangeVolume/venues";
import type { Candle, CandleResolution } from "@/lib/exchangeVolume/types";
import { DEX_POOLS, fetchPoolCandles, poolUrl } from "@/lib/priceGap/dexPools";
import { completedBuckets, deviationSeries, gapStats, referenceSeries } from "@/lib/priceGap/gapMath";
import type { GapAsset, MarketKind, PriceGapResult, VenueGap } from "@/lib/priceGap/types";
import { TtlCache, type StaleAwareResult } from "@/lib/rag/cache";
import { storedDexCandles } from "@/lib/collector/dexCandles";
import { hasDb } from "@/lib/store/db";

const PERIOD_SPEC: Record<ExchangePeriod, { resolution: CandleResolution; buckets: number }> = {
  "1d": { resolution: "1h", buckets: 24 },
  "7d": { resolution: "1h", buckets: 168 },
  "30d": { resolution: "1h", buckets: 720 },
  "1y": { resolution: "1d", buckets: 365 },
};

// Enough history for the longest period at each resolution, plus the in-progress bucket.
const HISTORY_BUCKETS: Record<CandleResolution, number> = { "1h": 722, "1d": 367 };

const TTL_MS: Record<CandleResolution, number> = { "1h": 5 * 60 * 1000, "1d": 60 * 60 * 1000 };
const STALE_TTL_MS: Record<CandleResolution, number> = { "1h": 60 * 60 * 1000, "1d": 24 * 60 * 60 * 1000 };

type SourceSeries = {
  id: string;
  name: string;
  kind: MarketKind;
  pair: string;
  network?: string;
  poolAddress?: string;
  poolUrl?: string;
  candles: Candle[] | null;
  error: string | null;
};

type SeriesBundle = { sources: SourceSeries[]; fetchedAt: number };

const seriesCache = new TtlCache<SeriesBundle>();

const errMsg = (err: unknown) => (err instanceof Error ? err.message : String(err));

async function fetchCex(asset: GapAsset, resolution: CandleResolution, sinceMs: number, nowMs: number): Promise<SourceSeries[]> {
  return Promise.all(
    CEX_VENUES.map(async (venue): Promise<SourceSeries> => {
      const base: Omit<SourceSeries, "candles" | "error"> = { id: venue.id, name: venue.name, kind: "cex", pair: `${asset}/USDT` };
      try {
        const pair = (await getVenuePairs(venue.id)).find((p) => p.base === asset && p.quote === "USDT");
        if (!pair) return { ...base, candles: null, error: `${venue.name}: no ${asset}/USDT pair listed.` };
        return { ...base, candles: await ADAPTERS[venue.id].fetchCandles(pair.symbol, resolution, sinceMs, nowMs), error: null };
      } catch (err) {
        return { ...base, candles: null, error: errMsg(err) };
      }
    })
  );
}

// GeckoTerminal's free API only goes back ~6 months; anything older comes from what the collector has stored.
function withStoredHistory(asset: GapAsset, poolId: string, resolution: CandleResolution, live: Candle[], sinceMs: number): Candle[] {
  if (!hasDb()) return live;
  const earliestLive = live.length ? live[0].startMs : Infinity;
  const older = storedDexCandles(asset, poolId, resolution, sinceMs).filter((c) => c.startMs < earliestLive);
  return older.length ? [...older, ...live] : live;
}

async function fetchDex(asset: GapAsset, resolution: CandleResolution, sinceMs: number): Promise<SourceSeries[]> {
  return Promise.all(
    DEX_POOLS[asset].map(async (pool): Promise<SourceSeries> => {
      const base = {
        id: pool.id,
        name: `${pool.name} · ${pool.networkLabel}`,
        kind: "dex" as const,
        network: pool.networkLabel,
        poolAddress: pool.address,
        poolUrl: poolUrl(pool),
      };
      try {
        const { pair, candles } = await fetchPoolCandles(pool, resolution);
        return { ...base, pair, candles: withStoredHistory(asset, pool.id, resolution, candles, sinceMs), error: null };
      } catch (err) {
        return { ...base, pair: `${pool.assetSymbols[0]}/USDT`, candles: null, error: errMsg(err) };
      }
    })
  );
}

async function computeSeries(asset: GapAsset, resolution: CandleResolution): Promise<SeriesBundle> {
  const nowMs = Date.now();
  const sinceMs = Math.floor(nowMs / RESOLUTION_MS[resolution]) * RESOLUTION_MS[resolution] - HISTORY_BUCKETS[resolution] * RESOLUTION_MS[resolution];
  const [cex, dex] = await Promise.all([fetchCex(asset, resolution, sinceMs, nowMs), fetchDex(asset, resolution, sinceMs)]);
  return { sources: [...dex, ...cex], fetchedAt: nowMs };
}

function getSeries(asset: GapAsset, resolution: CandleResolution): Promise<StaleAwareResult<SeriesBundle>> {
  return seriesCache.getFreshOrStale(`${asset}:${resolution}`, () => computeSeries(asset, resolution), {
    // A missing DEX pool defeats the point of the comparison, so it's retried on the next request.
    shouldCache: (b) => b.sources.every((s) => s.kind === "cex" || s.candles) && b.sources.filter((s) => s.kind === "cex" && s.candles).length >= 3,
    ttlMs: TTL_MS[resolution],
    staleTtlMs: STALE_TTL_MS[resolution],
  });
}

export async function getPriceGap(asset: GapAsset, period: ExchangePeriod): Promise<StaleAwareResult<PriceGapResult>> {
  const { resolution, buckets: count } = PERIOD_SPEC[period];
  const { value: bundle, stale, computedAt } = await getSeries(asset, resolution);

  // Buckets are anchored to when the series was fetched, so a stale bundle
  // never pretends to cover buckets it doesn't have yet.
  const buckets = completedBuckets(bundle.fetchedAt, RESOLUTION_MS[resolution], count);
  const closes = new Map(bundle.sources.map((s) => [s.id + s.kind, new Map((s.candles ?? []).map((c) => [c.startMs, c.close]))]));
  const closesOf = (s: SourceSeries) => closes.get(s.id + s.kind)!;

  const reference = referenceSeries(
    buckets,
    bundle.sources.filter((s) => s.kind === "cex" && s.candles).map(closesOf)
  );

  const venues: VenueGap[] = bundle.sources.map((s) => {
    const inWindow = (s.candles ?? []).filter((c) => c.startMs >= buckets[0] && c.startMs <= buckets[buckets.length - 1]);
    return {
      id: s.id,
      name: s.name,
      kind: s.kind,
      pair: s.pair,
      network: s.network,
      poolAddress: s.poolAddress,
      poolUrl: s.poolUrl,
      status: s.candles ? "ok" : "error",
      error: s.error,
      lastClose: inWindow.length ? inWindow[inWindow.length - 1].close : null,
      deviationsPct: deviationSeries(buckets, closesOf(s), reference).map((d) => (d === null ? null : Math.round(d * 10_000) / 10_000)),
      stats: gapStats(buckets, closesOf(s), reference),
    };
  });

  return {
    value: {
      asset,
      period,
      resolution,
      buckets,
      reference,
      venues,
      asOf: new Date(bundle.fetchedAt).toISOString(),
      warnings: bundle.sources.filter((s) => s.error).map((s) => s.error!),
    },
    stale,
    computedAt,
  };
}

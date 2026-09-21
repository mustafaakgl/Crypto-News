import "server-only";
import { fetchJson } from "@/lib/httpClient";
import { TtlCache, type StaleAwareResult } from "@/lib/rag/cache";
import { ADAPTERS } from "@/lib/exchangeVolume/adapters";
import { aggregateAllPeriods, BASE_ASSETS, DAY_MS, HISTORY_DAYS, utcDayStart } from "@/lib/exchangeVolume/aggregate";
import { CEX_VENUES, type CexVenueId } from "@/lib/exchangeVolume/venues";
import type { BaseAsset, PairHistory, PairRef, ReferencePrices, VenueVolumeResult } from "@/lib/exchangeVolume/types";

// Daily candles only change once per UTC day, so an hour of freshness is
// plenty; a stale result (clearly dated by its window) may be served for a
// day while a refresh runs.
const RESULT_TTL_MS = 60 * 60 * 1000;
const RESULT_STALE_TTL_MS = 24 * 60 * 60 * 1000;
const PAIR_LIST_TTL_MS = 24 * 60 * 60 * 1000;

const KRAKEN_USD_PAIR: Record<BaseAsset, string> = { BTC: "XBTUSD", ETH: "ETHUSD", SOL: "SOLUSD", XRP: "XRPUSD" };

const pairListCache = new TtlCache<PairRef[]>();
const priceCache = new TtlCache<ReferencePrices>();
const venueCache = new TtlCache<VenueVolumeResult>();

// Kraken's daily VWAP on the real-USD pair: one consistent valuation source
// for every venue, rather than each venue's own quote currency (which would
// need FX rates for EUR/KRW/TRY).
async function computeReferencePrices(): Promise<ReferencePrices> {
  const since = Math.floor((utcDayStart(Date.now()) - HISTORY_DAYS * DAY_MS) / 1000) - 1;
  const prices: ReferencePrices = {};
  for (const base of BASE_ASSETS) {
    const result = await fetchJson(
      `https://api.kraken.com/0/public/OHLC?pair=${KRAKEN_USD_PAIR[base]}&interval=1440&since=${since}`,
      `Kraken ${base}/USD reference price`,
      3600,
      ADAPTERS.kraken.pace
    );
    if (!result.ok) continue;
    const data = result.data as { result?: Record<string, unknown> };
    const key = data.result ? Object.keys(data.result).find((k) => k !== "last") : undefined;
    const rows = key ? data.result![key] : null;
    if (!Array.isArray(rows)) continue;
    const series = new Map<number, number>();
    for (const r of rows) {
      if (!Array.isArray(r)) continue;
      const day = Number(r[0]) * 1000;
      const vwap = Number(r[5]);
      const close = Number(r[4]);
      const price = vwap > 0 ? vwap : close;
      if (isFinite(day) && isFinite(price) && price > 0) series.set(day, price);
    }
    if (series.size > 0) prices[base] = series;
  }
  return prices;
}

async function getReferencePrices(): Promise<ReferencePrices> {
  const { value } = await priceCache.getFreshOrStale("usd", computeReferencePrices, {
    shouldCache: (p) => Object.keys(p).length === BASE_ASSETS.length,
    ttlMs: RESULT_TTL_MS,
    staleTtlMs: RESULT_STALE_TTL_MS,
  });
  return value;
}

async function getPairs(venueId: CexVenueId): Promise<PairRef[]> {
  const cached = pairListCache.get(venueId);
  if (cached) return cached;
  const pairs = await ADAPTERS[venueId].listPairs();
  if (pairs.length > 0) pairListCache.set(venueId, pairs, PAIR_LIST_TTL_MS);
  return pairs;
}

const label = (p: PairRef) => `${p.base}/${p.quote}`;

async function computeVenueVolume(venueId: CexVenueId): Promise<VenueVolumeResult> {
  const venue = CEX_VENUES.find((v) => v.id === venueId)!;
  const adapter = ADAPTERS[venueId];
  const nowMs = Date.now();
  const sinceMs = utcDayStart(nowMs) - HISTORY_DAYS * DAY_MS;
  const base = { venueId, name: venue.name, url: venue.url, asOf: new Date(nowMs).toISOString() };

  let pairs: PairRef[];
  try {
    pairs = await getPairs(venueId);
  } catch (err) {
    return { ...base, status: "error", periods: null, pairs: [], pairsFailed: [], warnings: [`${venue.name}: ${err instanceof Error ? err.message : "pair list unavailable"}`] };
  }

  const [prices, settled] = await Promise.all([
    getReferencePrices(),
    Promise.allSettled(pairs.map((p) => adapter.fetchDaily(p.symbol, sinceMs, nowMs))),
  ]);

  const histories: PairHistory[] = [];
  const pairsFailed: string[] = [];
  const warnings: string[] = [];
  settled.forEach((s, i) => {
    if (s.status === "fulfilled") histories.push({ ...pairs[i], candles: s.value });
    else {
      pairsFailed.push(label(pairs[i]));
      warnings.push(s.reason instanceof Error ? s.reason.message : String(s.reason));
    }
  });

  const missingPrices = BASE_ASSETS.filter((b) => !prices[b]);
  if (missingPrices.length > 0) warnings.push(`No reference USD price for ${missingPrices.join(", ")}; that volume is excluded from USD totals.`);

  if (histories.length === 0) {
    return { ...base, status: "error", periods: null, pairs: [], pairsFailed, warnings: warnings.length ? warnings : [`${venue.name}: no tracked pairs found`] };
  }

  return {
    ...base,
    status: pairsFailed.length > 0 || missingPrices.length > 0 ? "partial" : "ok",
    periods: aggregateAllPeriods(histories, prices, nowMs),
    pairs: histories.map(label).sort(),
    pairsFailed,
    warnings,
  };
}

export async function getVenueVolume(venueId: CexVenueId): Promise<StaleAwareResult<VenueVolumeResult>> {
  return venueCache.getFreshOrStale(venueId, () => computeVenueVolume(venueId), {
    shouldCache: (r) => r.status === "ok",
    ttlMs: RESULT_TTL_MS,
    staleTtlMs: RESULT_STALE_TTL_MS,
  });
}

import "server-only";
import { fetchBinanceEthUsdt } from "@/lib/priceComparison/binanceAdapter";
import { fetchBybitEthUsdt } from "@/lib/priceComparison/bybitAdapter";
import { fetchUniswapWethUsdt } from "@/lib/priceComparison/dexscreenerAdapter";
import { computeDifference } from "@/lib/priceComparison/priceMath";
import type { PriceComparisonResult } from "@/lib/priceComparison/types";
import { TtlCache, type StaleAwareResult } from "@/lib/rag/cache";

// 45s: the midpoint of the brief's 30-60s starting window. All three
// providers are comfortably inside their own documented limits even at
// this cadence shared across every visitor (Binance ~50 weight/call of a
// 6000/min budget; Bybit's general 600-req/5s IP limit; DexScreener has no
// published limit for this specific endpoint, so this cache is the primary
// thing keeping call volume low for it specifically).
const CACHE_TTL_MS = 45_000;
const CACHE_STALE_TTL_MS = 5 * 60 * 1000;
const REFERENCE_VENUE_ID = "binance";
const CACHE_KEY = "eth-price-comparison";

const cache = new TtlCache<PriceComparisonResult>();

// Each adapter isolates its own failure — Promise.all here is safe (not
// allSettled) because every fetchXEthUsdt() function already catches its
// own errors internally and always resolves to a PriceObservation (status
// "ok" or "unavailable"), never rejects.
async function computePriceComparison(): Promise<PriceComparisonResult> {
  const now = Date.now();
  const [binance, bybit, uniswap] = await Promise.all([fetchBinanceEthUsdt(), fetchBybitEthUsdt(), fetchUniswapWethUsdt()]);

  const observations = [binance, bybit, uniswap];
  const reference = observations.find((o) => o.venueId === REFERENCE_VENUE_ID)!;
  const warnings = observations.filter((o) => o.status === "unavailable").map((o) => `${o.venueName}: ${o.error}`);

  const rows = observations.map((observation) => ({
    observation,
    difference: computeDifference(observation, reference, now),
  }));

  return { asset: "ETH", referenceVenueId: REFERENCE_VENUE_ID, rows, asOf: new Date(now).toISOString(), warnings };
}

// A manual "Refresh" click on the client just re-requests this same cached
// endpoint — it can never bypass the cache/pacing below, so a burst of
// refresh clicks from many visitors still costs at most one real upstream
// fetch per CACHE_TTL_MS window.
export async function getPriceComparison(): Promise<StaleAwareResult<PriceComparisonResult>> {
  return cache.getFreshOrStale(CACHE_KEY, computePriceComparison, {
    shouldCache: (result) => result.rows.some((r) => r.observation.status === "ok"),
    ttlMs: CACHE_TTL_MS,
    staleTtlMs: CACHE_STALE_TTL_MS,
  });
}

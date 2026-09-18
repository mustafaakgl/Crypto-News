// Pure period math for CoinGecko's exchange volume_chart endpoint.
//
// CoinGecko's own docs state the auto-granularity rule: "1 day = 10-minutely,
// 7-14 days = hourly, 30 days and above = daily." The 10-minute/hourly
// series are a ROLLING 24h window sampled repeatedly — summing them would
// wildly over-count (each sample already double-counts ~24h of the same
// trades). Only the DAILY granularity (days >= 30) gives real,
// non-overlapping per-day buckets that can be legitimately summed into a
// genuine period total. So for 7D specifically, this always requests
// days=30 and slices the last 7 daily points — never days=7.
import type { ExchangePeriod, VolumeKind } from "@/lib/exchangeAnalytics/types";

export type VolumePoint = { timestampMs: number; volumeBtc: number };

// The CoinGecko `days` query param to request for a given UI period.
export function daysParamForPeriod(period: ExchangePeriod): 1 | 30 | 365 {
  if (period === "1d") return 1;
  if (period === "1y") return 365;
  return 30; // both "7d" and "30d" fetch the same daily-granularity 30-day series
}

export function volumeKindForPeriod(period: ExchangePeriod): VolumeKind {
  return period === "1d" ? "trailing_24h" : "period_total";
}

// Slices a daily-granularity series (from a days=30 or days=365 request)
// down to the exact window the UI period asks for. Assumes points are
// sorted ascending by timestamp, as CoinGecko returns them.
export function sliceForPeriod(points: VolumePoint[], period: ExchangePeriod): VolumePoint[] {
  if (period === "7d") return points.slice(-7);
  return points; // "30d" and "1y" use the full fetched series as-is
}

export type PeriodWindow = { startMs: number; endMs: number };

// For period totals, the window is derived from the ACTUAL daily points
// used (never a generically-computed "now minus N days", which could
// silently drift from what was really summed if a day is missing).
export function periodWindowFromPoints(points: VolumePoint[], dayMs = 86_400_000): PeriodWindow | null {
  if (points.length === 0) return null;
  const startMs = points[0].timestampMs;
  const endMs = points[points.length - 1].timestampMs + dayMs; // each point represents [t, t+1day)
  return { startMs, endMs };
}

// For the 1d ("trailing 24h") period, the window is simply [now-24h, now] —
// never presented as a calendar-day bucket.
export function trailing24hWindow(nowMs: number): PeriodWindow {
  return { startMs: nowMs - 86_400_000, endMs: nowMs };
}

export function sumVolumeBtc(points: VolumePoint[]): number {
  return points.reduce((sum, p) => sum + p.volumeBtc, 0);
}

// Matches each daily BTC-volume point to the closest historical BTC/USD
// price sample at or before that day (never a future price) so a period's
// USD total uses THAT period's own rates, not today's — this is what makes
// a 30D/1Y USD figure a genuine historical conversion rather than a
// today's-rate reprice of old volume.
export function priceAtOrBefore(pricePoints: [number, number][], targetMs: number): number | null {
  let best: number | null = null;
  let bestTime = -Infinity;
  for (const [t, price] of pricePoints) {
    if (t <= targetMs && t > bestTime) {
      bestTime = t;
      best = price;
    }
  }
  return best;
}

export function sumVolumeUsdWithHistoricalRates(points: VolumePoint[], btcUsdPricePoints: [number, number][]): number | null {
  if (points.length === 0) return null;
  let total = 0;
  let matchedAny = false;
  for (const p of points) {
    const price = priceAtOrBefore(btcUsdPricePoints, p.timestampMs);
    if (price === null) continue;
    total += p.volumeBtc * price;
    matchedAny = true;
  }
  return matchedAny ? total : null;
}

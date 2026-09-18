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

const DAY_MS = 86_400_000;

// CoinGecko's daily-granularity series always includes a trailing bucket
// for the CURRENT (still in-progress) UTC day — confirmed empirically: for
// `days=30` the last point's timestamp is always today 00:00 UTC, hours
// before that day is over. Summing it as if it were a full day would
// understate "today" and silently make a "7D"/"30D" total include a
// partial day without saying so. A point only counts as a genuine
// completed day once its OWN 24h window (`timestampMs + dayMs`) has fully
// elapsed relative to `nowMs`.
export function completedDailyPoints(points: VolumePoint[], nowMs: number, dayMs = DAY_MS): VolumePoint[] {
  return points.filter((p) => p.timestampMs + dayMs <= nowMs);
}

export type SeriesValidation = { ok: true } | { ok: false; reason: string };

// Verifies the assumption `sliceForPeriod`/`sumVolumeBtc` depend on: that
// consecutive points are exactly one day apart (no gap, no duplicate) and
// therefore genuinely non-overlapping. This is checked at RUNTIME against
// the actual returned series — requesting `days=30` is never treated as
// proof by itself that CoinGecko returned 30 clean, contiguous daily
// buckets (a missing day, a repeated timestamp, or a provider hiccup would
// all silently corrupt a naive sum).
export function validateDailySeries(points: VolumePoint[], dayMs = DAY_MS, toleranceMs = 60_000): SeriesValidation {
  if (points.length === 0) return { ok: false, reason: "no daily points available" };
  const seen = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    if (seen.has(points[i].timestampMs)) {
      return { ok: false, reason: `duplicate timestamp at index ${i}` };
    }
    seen.add(points[i].timestampMs);
    if (i > 0) {
      const gap = points[i].timestampMs - points[i - 1].timestampMs;
      if (Math.abs(gap - dayMs) > toleranceMs) {
        return { ok: false, reason: `non-uniform gap between points ${i - 1} and ${i} (${gap}ms, expected ~${dayMs}ms) — likely a missing or overlapping day` };
      }
    }
  }
  return { ok: true };
}

export type PreparedDailySeries =
  | { verified: true; points: VolumePoint[] }
  | { verified: false; reason: string; latestCompletePoint: VolumePoint | null };

// The single entry point cexVenues.ts uses to turn a raw volume_chart
// response into either a verified period total or an honest "could not
// verify" fallback. Never produces a period total from a series that
// failed validation, per the rule this exists to enforce.
export function prepareDailySeries(rawPoints: VolumePoint[], period: ExchangePeriod, nowMs: number, dayMs = DAY_MS): PreparedDailySeries {
  const sorted = [...rawPoints].sort((a, b) => a.timestampMs - b.timestampMs);
  const completed = completedDailyPoints(sorted, nowMs, dayMs);
  const sliced = sliceForPeriod(completed, period);
  const latestCompletePoint = completed.length > 0 ? completed[completed.length - 1] : null;

  if (period === "7d" && sliced.length < 7) {
    return { verified: false, reason: `only ${sliced.length} completed day(s) available, need 7`, latestCompletePoint };
  }
  if (sliced.length === 0) {
    return { verified: false, reason: "no completed daily points available", latestCompletePoint };
  }

  const validation = validateDailySeries(sliced, dayMs);
  if (!validation.ok) {
    return { verified: false, reason: validation.reason, latestCompletePoint };
  }
  return { verified: true, points: sliced };
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

// Pure period math for CoinGecko's exchange volume_chart endpoint.
//
// CoinGecko's docs state an auto-granularity rule ("1 day = 10-minutely,
// 7-14 days = hourly, 30 days and above = daily") but do NOT document what
// a daily point's timestamp actually marks — period start, period end, or
// observation time. That was tested directly (2026-09-18, live, binance):
// the value at the trailing "today"-dated point was re-read 31 minutes
// apart and did not change, while an independently-confirmed-fresh rolling
// series moved in that same window — suggestive that the point may already
// be a closed 24h window, but 31 minutes cannot rule out the daily endpoint
// simply refreshing on a coarser cadence. Regular daily spacing is NOT
// proof of what a point measures either way.
//
// Given that unresolved ambiguity, this module NEVER sums multiple daily
// points into a "7D/30D/1Y total" — doing so would assert a precision
// about the underlying time window that hasn't actually been verified.
// Instead, for any period beyond the current trailing 24h, it surfaces the
// single most recent COMPLETE daily observation as a labeled
// "historical snapshot" (see cexVenues.ts) — real data, honestly scoped,
// never a fabricated multi-day aggregate. Resolving the underlying
// ambiguity would need real documentation or a much longer live
// observation window than is practical here; the limitation is left open
// rather than worked around.
import type { ExchangePeriod, VolumeKind } from "@/lib/exchangeAnalytics/types";

export type VolumePoint = { timestampMs: number; volumeBtc: number };

// The CoinGecko `days` query param to request. Only daily granularity
// (days >= 30) gives points spaced a real calendar day apart — this always
// requests 30 regardless of UI period, since every period now only ever
// needs to find ONE genuinely complete recent day, not a multi-day range.
export function daysParamForPeriod(period: ExchangePeriod): 1 | 30 {
  return period === "1d" ? 1 : 30;
}

export function volumeKindForPeriod(period: ExchangePeriod): VolumeKind {
  return period === "1d" ? "trailing_24h" : "historical_snapshot";
}

const DAY_MS = 86_400_000;

// A point only counts as a genuinely COMPLETE day once its own 24h window
// (`timestampMs + dayMs`) has fully elapsed relative to `nowMs` — this
// conservatively excludes the ambiguous trailing "today"-dated point (see
// the module comment above) so nothing downstream can mistake it for a
// confirmed-complete day.
export function completedDailyPoints(points: VolumePoint[], nowMs: number, dayMs = DAY_MS): VolumePoint[] {
  return points.filter((p) => p.timestampMs + dayMs <= nowMs);
}

// The single most recent verifiably-complete daily point, or null if none
// exists (e.g. a brand-new venue with no history yet). This is the ONLY
// thing periods beyond "1d" are ever built from — never a sum.
export function latestCompleteDailyPoint(rawPoints: VolumePoint[], nowMs: number, dayMs = DAY_MS): VolumePoint | null {
  const sorted = [...rawPoints].sort((a, b) => a.timestampMs - b.timestampMs);
  const completed = completedDailyPoints(sorted, nowMs, dayMs);
  return completed.length > 0 ? completed[completed.length - 1] : null;
}

export type PeriodWindow = { startMs: number; endMs: number };

// For the 1d ("trailing 24h") period, the window is simply [now-24h, now] —
// never presented as a calendar-day bucket.
export function trailing24hWindow(nowMs: number): PeriodWindow {
  return { startMs: nowMs - DAY_MS, endMs: nowMs };
}

// The window for a single historical-snapshot day, derived from that
// point's own timestamp — never a generically-computed "now minus N days".
export function snapshotWindow(point: VolumePoint, dayMs = DAY_MS): PeriodWindow {
  return { startMs: point.timestampMs, endMs: point.timestampMs + dayMs };
}

// Matches a daily BTC-volume point to the closest historical BTC/USD price
// sample at or before that day (never a future price) so its USD figure
// uses THAT day's own rate, not today's.
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

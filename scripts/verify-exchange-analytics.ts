// Manual verification script for the pure exchange-analytics functions
// (period math, currency classification). Avoids lib/exchangeAnalytics/
// {httpClient,cexVenues,dexOverview,cexTickers}.ts (all import "server-only",
// which cannot run under plain `node`) — see the live curl-based research
// notes in the delivery reports for how the real CoinGecko/DefiLlama
// behavior (rolling-vs-daily granularity, category contamination,
// parent/child protocol duplication, and the "what does a daily timestamp
// mark" ambiguity) was confirmed against the actual APIs.
// Run with: node scripts/verify-exchange-analytics.ts
import {
  daysParamForPeriod,
  volumeKindForPeriod,
  trailing24hWindow,
  snapshotWindow,
  priceAtOrBefore,
  completedDailyPoints,
  latestCompleteDailyPoint,
  type VolumePoint,
} from "../lib/exchangeAnalytics/periodMath.ts";
import { classifyQuoteCurrency, classifyBaseAsset } from "../lib/exchangeAnalytics/currencyClassification.ts";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

const DAY_MS = 86_400_000;

// ---- daysParamForPeriod / volumeKindForPeriod ----
// 7D/30D/1Y all resolve to "historical_snapshot" now — CoinGecko never
// documents what a daily volume_chart timestamp marks (start/end/observation),
// and a live 31-minute before/after test was suggestive but not conclusive
// (see the delivery report), so no period is ever summed into a "total".
{
  assertEqual(daysParamForPeriod("1d"), 1, "daysParamForPeriod: 1d -> 1 (10-minutely rolling)");
  assertEqual(daysParamForPeriod("7d"), 30, "daysParamForPeriod: 7d -> 30 (daily granularity; only need to find ONE complete day, not a range)");
  assertEqual(daysParamForPeriod("30d"), 30, "daysParamForPeriod: 30d -> 30 (same — no multi-day sum is ever built, so no extra headroom is needed)");
  assertEqual(daysParamForPeriod("1y"), 30, "daysParamForPeriod: 1y -> 30 (same reason)");

  assertEqual(volumeKindForPeriod("1d"), "trailing_24h", "volumeKindForPeriod: 1d is a rolling window, never called a period total");
  assertEqual(volumeKindForPeriod("7d"), "historical_snapshot", "volumeKindForPeriod: 7d is a single-day snapshot, never a period total");
  assertEqual(volumeKindForPeriod("30d"), "historical_snapshot", "volumeKindForPeriod: 30d is a single-day snapshot, never a period total");
  assertEqual(volumeKindForPeriod("1y"), "historical_snapshot", "volumeKindForPeriod: 1y is a single-day snapshot, never a period total");
}

// ---- trailing24hWindow / snapshotWindow ----
{
  const now = 1_000_000_000_000;
  assertEqual(trailing24hWindow(now), { startMs: now - DAY_MS, endMs: now }, "trailing24hWindow: exactly [now-24h, now], never a UTC calendar-day bucket");

  const point: VolumePoint = { timestampMs: 12 * DAY_MS, volumeBtc: 3 };
  assertEqual(snapshotWindow(point), { startMs: 12 * DAY_MS, endMs: 13 * DAY_MS }, "snapshotWindow: spans exactly that one point's own day, derived from its own timestamp");
}

// ---- priceAtOrBefore ----
{
  const prices: [number, number][] = [
    [0, 60000],
    [DAY_MS, 61000],
    [2 * DAY_MS, 62000],
  ];
  assertEqual(priceAtOrBefore(prices, DAY_MS), 61000, "priceAtOrBefore: exact timestamp match");
  assertEqual(priceAtOrBefore(prices, DAY_MS + 1000), 61000, "priceAtOrBefore: picks the most recent price AT OR BEFORE the target, never a future price");
  assertEqual(priceAtOrBefore(prices, -1000), null, "priceAtOrBefore: no price exists before this target -> null, never extrapolated");
}

// ---- completedDailyPoints / latestCompleteDailyPoint ----
// Modeled directly on a real CoinGecko exchanges/{id}/volume_chart?days=30
// response confirmed live (curl, binance, 2026-09-18): 30 points, uniform
// 86400000ms gaps, timestamps at 00:00 UTC — but the LAST point is always
// "today". Its exact meaning is unverified (see periodMath.ts), so it's
// conservatively excluded rather than trusted as a complete day.
{
  const cleanThirty: VolumePoint[] = Array.from({ length: 30 }, (_, i) => ({ timestampMs: i * DAY_MS, volumeBtc: 100 + i }));
  // "Now" is 8 hours into day 29 (the last point) — that day is not over yet.
  const nowMidDay29 = 29 * DAY_MS + 8 * 60 * 60 * 1000;

  const completed = completedDailyPoints(cleanThirty, nowMidDay29);
  assertEqual(completed.length, 29, "completedDailyPoints: excludes the ambiguous trailing point (30 raw points -> 29 usable)");
  assertEqual(completed[completed.length - 1].timestampMs, 28 * DAY_MS, "completedDailyPoints: last kept point is the last unambiguously-elapsed day, not today's");

  const latest = latestCompleteDailyPoint(cleanThirty, nowMidDay29);
  assertEqual(latest?.timestampMs, 28 * DAY_MS, "latestCompleteDailyPoint: returns the single most recent usable day");
  assertEqual(latest?.volumeBtc, 128, "latestCompleteDailyPoint: returns that day's own real volume, unmodified");

  assertEqual(latestCompleteDailyPoint([], nowMidDay29), null, "latestCompleteDailyPoint: no data at all -> null, never fabricated");

  const onlyTodayPoint: VolumePoint[] = [{ timestampMs: 29 * DAY_MS, volumeBtc: 999 }];
  assertEqual(latestCompleteDailyPoint(onlyTodayPoint, nowMidDay29), null, "latestCompleteDailyPoint: a series with ONLY the ambiguous trailing point -> null, never used as a snapshot");

  // Order-independence: CoinGecko returns points pre-sorted, but this must
  // not silently depend on that.
  const shuffled = [cleanThirty[10], cleanThirty[28], cleanThirty[5], cleanThirty[29]];
  const latestFromShuffled = latestCompleteDailyPoint(shuffled, nowMidDay29);
  assertEqual(latestFromShuffled?.timestampMs, 28 * DAY_MS, "latestCompleteDailyPoint: sorts internally, not dependent on input order");
}

// ---- classifyQuoteCurrency ----
{
  assertEqual(classifyQuoteCurrency("USD"), "fiat", "classifyQuoteCurrency: USD -> fiat");
  assertEqual(classifyQuoteCurrency("eur"), "fiat", "classifyQuoteCurrency: case-insensitive fiat match");
  assertEqual(classifyQuoteCurrency("USDT"), "stablecoin", "classifyQuoteCurrency: USDT -> stablecoin");
  assertEqual(classifyQuoteCurrency("USDC"), "stablecoin", "classifyQuoteCurrency: USDC -> stablecoin");
  assertEqual(classifyQuoteCurrency("ETH"), "crypto", "classifyQuoteCurrency: ETH (as a quote currency) -> other crypto");
  assertEqual(classifyQuoteCurrency("BTC"), "crypto", "classifyQuoteCurrency: BTC (as a quote currency) -> other crypto");
}

// ---- classifyBaseAsset ----
{
  assertEqual(classifyBaseAsset("BTC"), "BTC", "classifyBaseAsset: BTC recognized");
  assertEqual(classifyBaseAsset("eth"), "ETH", "classifyBaseAsset: case-insensitive ETH match");
  assertEqual(classifyBaseAsset("SOL"), "SOL", "classifyBaseAsset: SOL recognized");
  assertEqual(classifyBaseAsset("DOGE"), "Other", "classifyBaseAsset: everything else buckets to Other, never silently dropped");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

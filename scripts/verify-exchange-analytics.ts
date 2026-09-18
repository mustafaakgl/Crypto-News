// Manual verification script for the pure exchange-analytics functions
// (period math, currency classification). Avoids lib/exchangeAnalytics/
// {httpClient,cexVenues,dexOverview,cexTickers}.ts (all import "server-only",
// which cannot run under plain `node`) — see the live curl-based research
// notes in the final report for how the real CoinGecko/DefiLlama behavior
// (rolling-vs-daily granularity, category contamination, parent/child
// protocol duplication) was confirmed against the actual APIs.
// Run with: node scripts/verify-exchange-analytics.ts
import {
  daysParamForPeriod,
  volumeKindForPeriod,
  sliceForPeriod,
  periodWindowFromPoints,
  trailing24hWindow,
  sumVolumeBtc,
  priceAtOrBefore,
  sumVolumeUsdWithHistoricalRates,
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
{
  assertEqual(daysParamForPeriod("1d"), 1, "daysParamForPeriod: 1d -> 1 (10-minutely rolling)");
  assertEqual(daysParamForPeriod("7d"), 30, "daysParamForPeriod: 7d -> 30 (fetch daily granularity, slice last 7 — NEVER days=7, which is hourly rolling)");
  assertEqual(daysParamForPeriod("30d"), 30, "daysParamForPeriod: 30d -> 30 (daily granularity)");
  assertEqual(daysParamForPeriod("1y"), 365, "daysParamForPeriod: 1y -> 365 (daily granularity)");

  assertEqual(volumeKindForPeriod("1d"), "trailing_24h", "volumeKindForPeriod: 1d is a rolling window, never called a period total");
  assertEqual(volumeKindForPeriod("7d"), "period_total", "volumeKindForPeriod: 7d is a genuine period total");
  assertEqual(volumeKindForPeriod("1y"), "period_total", "volumeKindForPeriod: 1y is a genuine period total");
}

// ---- sliceForPeriod ----
{
  const thirtyDays: VolumePoint[] = Array.from({ length: 30 }, (_, i) => ({ timestampMs: i * DAY_MS, volumeBtc: 100 + i }));
  const sliced7 = sliceForPeriod(thirtyDays, "7d");
  assertEqual(sliced7.length, 7, "sliceForPeriod: 7d takes exactly the last 7 of a 30-day daily series");
  assertEqual(sliced7[0].volumeBtc, 123, "sliceForPeriod: 7d slice starts at the correct offset (day 23 of 0-29)");

  const sliced30 = sliceForPeriod(thirtyDays, "30d");
  assertEqual(sliced30.length, 30, "sliceForPeriod: 30d keeps the full fetched series");
}

// ---- periodWindowFromPoints / trailing24hWindow ----
{
  const points: VolumePoint[] = [
    { timestampMs: 10 * DAY_MS, volumeBtc: 1 },
    { timestampMs: 11 * DAY_MS, volumeBtc: 2 },
    { timestampMs: 12 * DAY_MS, volumeBtc: 3 },
  ];
  const window = periodWindowFromPoints(points);
  assertEqual(window, { startMs: 10 * DAY_MS, endMs: 13 * DAY_MS }, "periodWindowFromPoints: window spans from the first point's start to the last point's day END, not its start");
  assertEqual(periodWindowFromPoints([]), null, "periodWindowFromPoints: empty series -> null, never a fabricated window");

  const now = 1_000_000_000_000;
  assertEqual(trailing24hWindow(now), { startMs: now - DAY_MS, endMs: now }, "trailing24hWindow: exactly [now-24h, now], never a UTC calendar-day bucket");
}

// ---- sumVolumeBtc ----
{
  const points: VolumePoint[] = [
    { timestampMs: 0, volumeBtc: 100 },
    { timestampMs: DAY_MS, volumeBtc: 150 },
    { timestampMs: 2 * DAY_MS, volumeBtc: 200 },
  ];
  assertEqual(sumVolumeBtc(points), 450, "sumVolumeBtc: sums non-overlapping daily points directly (this is only ever called on daily-granularity series, never rolling ones)");
  assertEqual(sumVolumeBtc([]), 0, "sumVolumeBtc: empty series -> 0");
}

// ---- priceAtOrBefore / sumVolumeUsdWithHistoricalRates ----
{
  const prices: [number, number][] = [
    [0, 60000],
    [DAY_MS, 61000],
    [2 * DAY_MS, 62000],
  ];
  assertEqual(priceAtOrBefore(prices, DAY_MS), 61000, "priceAtOrBefore: exact timestamp match");
  assertEqual(priceAtOrBefore(prices, DAY_MS + 1000), 61000, "priceAtOrBefore: picks the most recent price AT OR BEFORE the target, never a future price");
  assertEqual(priceAtOrBefore(prices, -1000), null, "priceAtOrBefore: no price exists before this target -> null, never extrapolated");

  const volumePoints: VolumePoint[] = [
    { timestampMs: 0, volumeBtc: 10 },
    { timestampMs: DAY_MS, volumeBtc: 20 },
  ];
  const usdTotal = sumVolumeUsdWithHistoricalRates(volumePoints, prices);
  assertEqual(usdTotal, 10 * 60000 + 20 * 61000, "sumVolumeUsdWithHistoricalRates: each day's OWN rate is used, not a single today's-rate reprice of the whole period");

  const volumeWithGap: VolumePoint[] = [{ timestampMs: -5000, volumeBtc: 10 }];
  assertEqual(sumVolumeUsdWithHistoricalRates(volumeWithGap, prices), null, "sumVolumeUsdWithHistoricalRates: a day with no matching historical price is excluded rather than guessed, and returns null if nothing could be matched at all");
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

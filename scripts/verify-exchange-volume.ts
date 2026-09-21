// Manual verification for the pure exchange-volume aggregation.
// Run with: node scripts/verify-exchange-volume.ts
import { aggregatePeriod, quoteType, toTrackedPair, DAY_MS } from "../lib/exchangeVolume/aggregate.ts";
import type { PairHistory, ReferencePrices } from "../lib/exchangeVolume/types.ts";
import { bucketsFor, sumIntoBuckets } from "../lib/exchangeVolume/grouping.ts";
import { quoteUsdPrices, rolling24hTotals, type PricedTicker } from "../lib/exchangeVolume/rolling24h.ts";

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

// ---- pair normalization ----
assertEqual(toTrackedPair("XBT", "EUR"), { base: "BTC", quote: "EUR" }, "Kraken XBT normalizes to BTC");
assertEqual(toTrackedPair("eth", "btc"), { base: "ETH", quote: "BTC" }, "lowercase ETH/BTC is tracked");
assertEqual(toTrackedPair("BTC", "BTC"), null, "BTC/BTC is rejected");
assertEqual(toTrackedPair("DOGE", "USDT"), null, "untracked base is rejected");
assertEqual(toTrackedPair("BTC", "JPY"), null, "untracked quote is rejected");
assertEqual(toTrackedPair("BTC", "FDUSD"), null, "untracked stablecoin is rejected");

// ---- quote classification ----
assertEqual(["USD", "KRW", "USDT", "USDC", "BTC"].map((q) => quoteType(q as never)), ["fiat", "fiat", "stablecoin", "stablecoin", "crypto"], "quote types");

// ---- aggregation ----
const today = Date.UTC(2026, 8, 21);
const now = today + 9 * 3600 * 1000; // 09:00 UTC, today's candle still open
const day = (n: number) => today - n * DAY_MS; // n days before today

const prices: ReferencePrices = {
  BTC: new Map([
    [day(1), 100],
    [day(2), 200],
    [day(3), 300],
    [today, 999],
  ]),
  ETH: new Map([
    [day(1), 10],
    [day(2), 10],
  ]),
};

const pairs: PairHistory[] = [
  {
    base: "BTC",
    quote: "USDT",
    symbol: "BTCUSDT",
    candles: [
      { startMs: day(3), close: 1, quoteVolume: 0, baseVolume: 1 },
      { startMs: day(2), close: 1, quoteVolume: 0, baseVolume: 2 },
      { startMs: day(1), close: 1, quoteVolume: 0, baseVolume: 3 },
      { startMs: today, close: 1, quoteVolume: 0, baseVolume: 50 },
    ],
  },
  {
    base: "BTC",
    quote: "EUR",
    symbol: "BTCEUR",
    candles: [
      { startMs: day(2), close: 1, quoteVolume: 0, baseVolume: 1 },
      { startMs: day(1), close: 1, quoteVolume: 0, baseVolume: 1 },
    ],
  },
  {
    base: "ETH",
    quote: "BTC",
    symbol: "ETHBTC",
    candles: [
      { startMs: day(3), close: 1, quoteVolume: 0, baseVolume: 4 }, // no ETH price that day
      { startMs: day(1), close: 1, quoteVolume: 0, baseVolume: 5 }, // day(2) missing -> a gap
    ],
  },
];

const d1 = aggregatePeriod(pairs, prices, 1, now);
assertEqual([d1.startDay, d1.endDay], ["2026-09-20", "2026-09-20"], "1D window is yesterday only");
assertEqual(d1.totalUsd, 3 * 100 + 1 * 100 + 5 * 10, "1D excludes today's open candle");
assertEqual(d1.byQuoteType, { fiat: 100, stablecoin: 300, crypto: 50 }, "1D split by quote type");
assertEqual(d1.byBase.BTC, { usd: 400, qty: 4 }, "1D BTC usd and qty");

const d3 = aggregatePeriod(pairs, prices, 3, now);
assertEqual([d3.startDay, d3.endDay], ["2026-09-18", "2026-09-20"], "3-day window bounds");
assertEqual(d3.byQuote.USDT, 1 * 300 + 2 * 200 + 3 * 100, "3-day USDT sums each day at its own price");
assertEqual(d3.byQuote.EUR, 200 + 100, "3-day EUR");
assertEqual(d3.byBase.ETH, { usd: 50, qty: 9 }, "unpriced ETH day counts toward qty but not USD");
assertEqual(d3.unpricedDays, 1, "unpriced pair-day is reported");
assertEqual(d3.pairsWithShortHistory, 1, "BTCEUR starting after the window start is flagged");
assertEqual(d3.pairsWithGaps, 1, "ETHBTC missing day(2) is flagged as a gap");

const utc = aggregatePeriod(pairs, prices, 1, today);
assertEqual(utc.endDay, "2026-09-20", "exactly at midnight, the new day is not yet complete");

// ---- rolling 24h: quote currencies priced from the venue's own pairs ----
const tickers: PricedTicker[] = [
  { base: "BTC", quote: "USDT", last: 100_000, quoteVolume: 1_000_000 },
  { base: "EUR", quote: "USDT", last: 1.1, quoteVolume: 50_000 }, // EUR priced directly
  { base: "USDT", quote: "TRY", last: 40, quoteVolume: 4_000_000 }, // TRY priced by inverting
  { base: "BTC", quote: "KRW", last: 140_000_000, quoteVolume: 1_400_000_000 }, // KRW via BTC
  { base: "BTC", quote: "EUR", last: 90_000, quoteVolume: 90_000 },
  { base: "DOGE", quote: "TRY", last: 8, quoteVolume: 400_000 },
  { base: "USDC", quote: "USDT", last: 1, quoteVolume: 500_000 },
  { base: "ABC", quote: "ZZZ", last: 1, quoteVolume: 999 }, // unpriceable quote
  { base: "XYZ", quote: "USDT", last: 1, quoteVolume: 0 }, // no volume, ignored
];
const px = quoteUsdPrices(tickers);
assertEqual([px.get("USDT"), px.get("EUR"), px.get("TRY"), px.get("BTC")], [1, 1.1, 0.025, 100_000], "direct, inverted and stable quote prices");
assertEqual(Math.round(px.get("KRW")! * 1e7) / 1e7, Math.round((100_000 / 140_000_000) * 1e7) / 1e7, "KRW priced via BTC/KRW");
assertEqual(
  quoteUsdPrices([
    { base: "EUR", quote: "USDT", last: 1.2, quoteVolume: 10 },
    { base: "EUR", quote: "USDC", last: 1.1, quoteVolume: 1_000 },
  ]).get("EUR"),
  1.1,
  "the higher-volume candidate wins"
);

const r24 = rolling24hTotals(tickers, (b, q) => b === "BTC" && q !== "BTC");
assertEqual(r24.pairsCounted, 7, "priced pairs with volume are counted");
assertEqual([r24.pairsUnvalued, r24.unvaluedQuotes], [1, ["ZZZ"]], "unpriceable quote is reported, not guessed");
assertEqual(Math.round(r24.trackedUsd), 1_000_000 + 1_000_000 + 99_000, "tracked = BTC pairs in USD");
assertEqual(Math.round(r24.stableSwapUsd), 500_000, "stable↔stable volume broken out");
assertEqual(Math.round(r24.totalUsd), 1_000_000 + 50_000 + 100_000 + 1_000_000 + 99_000 + 10_000 + 500_000, "total over every priced pair");

// ---- grouping daily series into weeks / months ----
const d = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
assertEqual(bucketsFor(d("2026-09-14"), d("2026-09-16"), "day").length, 3, "one bucket per day");
const weeks = bucketsFor(d("2026-09-09"), d("2026-09-20"), "week"); // Wed .. Sun
assertEqual(
  weeks.map((w) => [w.startDay, w.endDay]),
  [[d("2026-09-07"), d("2026-09-13")], [d("2026-09-14"), d("2026-09-20")]],
  "weeks run Monday–Sunday, first one reaching back before the range"
);
const months = bucketsFor(d("2026-01-30"), d("2026-03-02"), "month");
assertEqual(months.map((m) => m.calendarDays), [31, 28, 31], "calendar months, February 2026 has 28 days");
const summed = sumIntoBuckets(weeks, [
  { day: d("2026-09-09"), value: 1 },
  { day: d("2026-09-10"), value: 2 },
  { day: d("2026-09-14"), value: 5 },
  { day: d("2026-09-20"), value: 7 },
  { day: d("2026-09-21"), value: 100 }, // after the last bucket
]);
assertEqual(summed, [{ value: 3, daysWithData: 2 }, { value: 12, daysWithData: 2 }], "sums per bucket and counts days, ignoring out-of-range points");

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall checks passed");

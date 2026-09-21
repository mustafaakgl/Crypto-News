// Manual verification for the pure exchange-volume aggregation.
// Run with: node scripts/verify-exchange-volume.ts
import { aggregatePeriod, quoteType, toTrackedPair, DAY_MS } from "../lib/exchangeVolume/aggregate.ts";
import type { PairHistory, ReferencePrices } from "../lib/exchangeVolume/types.ts";

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
      { dayStartMs: day(3), baseVolume: 1 },
      { dayStartMs: day(2), baseVolume: 2 },
      { dayStartMs: day(1), baseVolume: 3 },
      { dayStartMs: today, baseVolume: 50 },
    ],
  },
  {
    base: "BTC",
    quote: "EUR",
    symbol: "BTCEUR",
    candles: [
      { dayStartMs: day(2), baseVolume: 1 },
      { dayStartMs: day(1), baseVolume: 1 },
    ],
  },
  {
    base: "ETH",
    quote: "BTC",
    symbol: "ETHBTC",
    candles: [
      { dayStartMs: day(3), baseVolume: 4 }, // no ETH price that day
      { dayStartMs: day(1), baseVolume: 5 }, // day(2) missing -> a gap
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

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall checks passed");

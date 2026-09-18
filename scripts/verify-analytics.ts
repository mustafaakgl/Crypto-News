// Manual verification script for the pure analytics functions.
// Run with: node scripts/verify-analytics.ts
import { cleanCandles, splitClosed, parseKlineRow, type Candle } from "../lib/klines.ts";
import { findSwingPivots, classifyTrend, detectBreakout } from "../lib/priceAction.ts";
import { computeRelativeVolume, computeRollingVwap, computeVwapPosition } from "../lib/volume.ts";

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

const HOUR = 60 * 60 * 1000;

function makeCandle(i: number, o: number, h: number, l: number, c: number, vol = 100, quote?: number): Candle {
  const openTime = i * HOUR;
  return {
    openTime,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: vol,
    quoteVolume: quote ?? vol * c,
    closeTime: openTime + HOUR - 1,
  };
}

// ---- klines: parseKlineRow / cleanCandles / splitClosed ----
{
  const validRow = [1000, "1.0", "2.0", "0.5", "1.5", "10.0", 1000 + HOUR - 1, "15.0", 5, "5", "7.5", "0"];
  const parsed = parseKlineRow(validRow);
  assertTrue(parsed !== null && parsed.open === 1 && parsed.high === 2, "parseKlineRow: valid row parses");

  assertEqual(parseKlineRow(["not", "enough"]), null, "parseKlineRow: short row -> null");
  assertEqual(parseKlineRow([1000, "1.0", "0.5", "2.0", "1.5", "10.0", 1000 + HOUR - 1, "15.0"]), null, "parseKlineRow: high<low -> null");
  assertEqual(parseKlineRow([1000, "abc", "2.0", "0.5", "1.5", "10.0", 1000 + HOUR - 1, "15.0"]), null, "parseKlineRow: non-numeric -> null");

  const raw = [
    [2000, "1", "2", "0.5", "1.5", "10", 2000 + HOUR - 1, "15"],
    [1000, "1", "2", "0.5", "1.5", "10", 1000 + HOUR - 1, "15"],
    [1000, "1", "2", "0.5", "1.5", "10", 1000 + HOUR - 1, "15"], // duplicate openTime
    ["bad"],
  ];
  const cleaned = cleanCandles(raw);
  assertEqual(cleaned.length, 2, "cleanCandles: dedupes + sorts + drops malformed");
  assertEqual(cleaned[0].openTime, 1000, "cleanCandles: ascending order");

  const now = 1000 + HOUR + 10; // candle 1 closed, candle 2 (2000..) still forming
  const closed = splitClosed(cleaned, now);
  assertEqual(closed.length, 1, "splitClosed: excludes still-forming candle");
}

// ---- priceAction: findSwingPivots requires 2 closed candles on each side ----
{
  // Candles 0..6, index 3 is a clear high (100) surrounded by lower highs.
  const candles: Candle[] = [
    makeCandle(0, 10, 50, 40, 45),
    makeCandle(1, 45, 60, 44, 55),
    makeCandle(2, 55, 70, 54, 65),
    makeCandle(3, 65, 100, 64, 90), // swing high candidate
    makeCandle(4, 90, 80, 60, 70),
    makeCandle(5, 70, 65, 50, 55),
    makeCandle(6, 55, 60, 45, 50),
  ];
  const pivots = findSwingPivots(candles);
  assertEqual(pivots.highs.length, 1, "findSwingPivots: exactly one confirmed high in 7-candle set");
  assertEqual(pivots.highs[0].index, 3, "findSwingPivots: high at index 3");

  // With only 6 candles (index 3 has just ONE right neighbor closed, not two),
  // the pivot at index 3 must NOT be confirmed yet.
  const early = candles.slice(0, 5); // indices 0..4, so index 3 has only index 4 to its right
  const earlyPivots = findSwingPivots(early);
  assertEqual(earlyPivots.highs.length, 0, "findSwingPivots: pivot not confirmed until 2 right candles closed");
}

// ---- classifyTrend ----
{
  const risingHighs = [{ index: 0, time: 0, price: 100 }, { index: 1, time: 1, price: 110 }];
  const risingLows = [{ index: 0, time: 0, price: 90 }, { index: 1, time: 1, price: 95 }];
  assertEqual(classifyTrend({ highs: risingHighs, lows: risingLows }), "Uptrend", "classifyTrend: rising highs+lows -> Uptrend");

  const fallingHighs = [{ index: 0, time: 0, price: 110 }, { index: 1, time: 1, price: 100 }];
  const fallingLows = [{ index: 0, time: 0, price: 95 }, { index: 1, time: 1, price: 90 }];
  assertEqual(classifyTrend({ highs: fallingHighs, lows: fallingLows }), "Downtrend", "classifyTrend: falling highs+lows -> Downtrend");

  assertEqual(classifyTrend({ highs: risingHighs, lows: fallingLows }), "Mixed structure", "classifyTrend: mixed -> Mixed structure");
  assertEqual(classifyTrend({ highs: [risingHighs[0]], lows: risingLows }), "Insufficient data", "classifyTrend: <2 highs -> Insufficient data");
}

// ---- detectBreakout: window excludes the current (last) candle ----
{
  const window20 = Array.from({ length: 20 }, (_, i) => makeCandle(i, 100, 110, 90, 100));
  const breakoutUp = [...window20, makeCandle(20, 100, 200, 100, 150)]; // last close 150 > windowHigh 110
  const b = detectBreakout(breakoutUp);
  assertEqual(b?.direction, "up", "detectBreakout: close above prior-20 high -> up");
  assertEqual(b?.windowHigh, 110, "detectBreakout: window high excludes current candle");

  const noBreak = [...window20, makeCandle(20, 100, 105, 95, 100)];
  assertEqual(detectBreakout(noBreak)?.direction, "none", "detectBreakout: close inside range -> none");

  assertEqual(detectBreakout(window20.slice(0, 15)), null, "detectBreakout: insufficient candles -> null");
}

// ---- volume ----
{
  const window20 = Array.from({ length: 20 }, (_, i) => makeCandle(i, 100, 110, 90, 100, 50));
  const withSpike = [...window20, makeCandle(20, 100, 110, 90, 100, 150)];
  const rv = computeRelativeVolume(withSpike);
  assertEqual(rv?.avgVolume, 50, "computeRelativeVolume: avg of preceding 20 (excludes current)");
  assertEqual(rv?.ratio, 3, "computeRelativeVolume: 150/50 = 3x");

  assertEqual(computeRelativeVolume(window20.slice(0, 10)), null, "computeRelativeVolume: insufficient data -> null");

  const zeroVol = Array.from({ length: 21 }, (_, i) => makeCandle(i, 100, 110, 90, 100, 0));
  assertEqual(computeRelativeVolume(zeroVol), null, "computeRelativeVolume: zero avg volume -> null (Unavailable)");

  const vwapCandles = Array.from({ length: 20 }, (_, i) => makeCandle(i, 100, 110, 90, 100, 10, 1000));
  const vwap = computeRollingVwap(vwapCandles);
  assertEqual(vwap?.vwap, 100, "computeRollingVwap: sumQuote/sumBase = 20000/200 = 100");
}

// ---- computeVwapPosition ----
{
  assertEqual(computeVwapPosition(110, 100), { diffPct: 10, above: true }, "computeVwapPosition: 10% above VWAP");
  assertEqual(computeVwapPosition(90, 100), { diffPct: -10, above: false }, "computeVwapPosition: 10% below VWAP");
  assertEqual(computeVwapPosition(100, 0), null, "computeVwapPosition: zero VWAP -> null, not a divide-by-zero");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

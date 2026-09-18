// Rule-based Price Action observations. Deliberately simple, explicit rules —
// not the Brooks method, not a validated trading strategy. Operates only on
// already-closed candles; callers must pre-filter out any forming candle.
import type { Candle } from "@/lib/klines";

export type Pivot = {
  index: number; // index into the closed-candles array passed in
  time: number; // ms, UTC (candle openTime)
  price: number;
};

export type SwingPivots = {
  highs: Pivot[];
  lows: Pivot[];
};

// A swing high/low at index i is confirmed once candles i+1 and i+2 have
// also closed — which is automatically true here since `candles` contains
// only closed candles and i+2 must stay within bounds.
export function findSwingPivots(candles: Candle[]): SwingPivots {
  const highs: Pivot[] = [];
  const lows: Pivot[] = [];

  for (let i = 2; i <= candles.length - 3; i++) {
    const c = candles[i];
    const neighbors = [candles[i - 2], candles[i - 1], candles[i + 1], candles[i + 2]];

    if (neighbors.every((n) => c.high > n.high)) {
      highs.push({ index: i, time: c.openTime, price: c.high });
    }
    if (neighbors.every((n) => c.low < n.low)) {
      lows.push({ index: i, time: c.openTime, price: c.low });
    }
  }

  return { highs, lows };
}

export type TrendLabel = "Uptrend" | "Downtrend" | "Mixed structure" | "Insufficient data";

export function classifyTrend(pivots: SwingPivots): TrendLabel {
  const { highs, lows } = pivots;
  if (highs.length < 2 || lows.length < 2) return "Insufficient data";

  const [prevHigh, lastHigh] = highs.slice(-2);
  const [prevLow, lastLow] = lows.slice(-2);

  const highsRising = lastHigh.price > prevHigh.price;
  const lowsRising = lastLow.price > prevLow.price;
  const highsFalling = lastHigh.price < prevHigh.price;
  const lowsFalling = lastLow.price < prevLow.price;

  if (highsRising && lowsRising) return "Uptrend";
  if (highsFalling && lowsFalling) return "Downtrend";
  return "Mixed structure";
}

export type Breakout = {
  direction: "up" | "down" | "none";
  lastClose: number;
  windowHigh: number;
  windowLow: number;
  windowSize: number;
};

const BREAKOUT_WINDOW = 20;

// Compares the last closed candle's close against the high/low of the
// PRECEDING `BREAKOUT_WINDOW` candles — the current candle is excluded from
// that comparison window.
export function detectBreakout(candles: Candle[]): Breakout | null {
  if (candles.length < BREAKOUT_WINDOW + 1) return null;

  const last = candles[candles.length - 1];
  const window = candles.slice(candles.length - 1 - BREAKOUT_WINDOW, candles.length - 1);

  const windowHigh = Math.max(...window.map((c) => c.high));
  const windowLow = Math.min(...window.map((c) => c.low));

  let direction: Breakout["direction"] = "none";
  if (last.close > windowHigh) direction = "up";
  else if (last.close < windowLow) direction = "down";

  return { direction, lastClose: last.close, windowHigh, windowLow, windowSize: BREAKOUT_WINDOW };
}

export type PriceActionResult = {
  trend: TrendLabel;
  pivots: SwingPivots;
  lastConfirmedHigh: Pivot | null;
  lastConfirmedLow: Pivot | null;
  breakout: Breakout | null;
};

export function analyzePriceAction(candles: Candle[]): PriceActionResult {
  const pivots = findSwingPivots(candles);
  const trend = classifyTrend(pivots);
  return {
    trend,
    pivots,
    lastConfirmedHigh: pivots.highs.length > 0 ? pivots.highs[pivots.highs.length - 1] : null,
    lastConfirmedLow: pivots.lows.length > 0 ? pivots.lows[pivots.lows.length - 1] : null,
    breakout: detectBreakout(candles),
  };
}

import type { Candle } from "@/lib/klines";

const RELATIVE_VOLUME_WINDOW = 20;
const VWAP_WINDOW = 20;

export type RelativeVolume = {
  lastVolume: number;
  avgVolume: number;
  ratio: number;
  windowSize: number;
};

// Last closed candle's volume vs. the average of the preceding N closed
// candles — the current candle is excluded from that average.
export function computeRelativeVolume(candles: Candle[]): RelativeVolume | null {
  if (candles.length < RELATIVE_VOLUME_WINDOW + 1) return null;

  const last = candles[candles.length - 1];
  const window = candles.slice(candles.length - 1 - RELATIVE_VOLUME_WINDOW, candles.length - 1);
  const avgVolume = window.reduce((sum, c) => sum + c.volume, 0) / window.length;

  if (avgVolume === 0) return null; // avoid divide-by-zero; caller shows "Unavailable"

  return { lastVolume: last.volume, avgVolume, ratio: last.volume / avgVolume, windowSize: RELATIVE_VOLUME_WINDOW };
}

export type RollingVwap = {
  vwap: number;
  sumQuoteVolume: number;
  sumBaseVolume: number;
  windowSize: number;
};

// sum(quoteVolume) / sum(baseVolume) over the last N closed candles. Since
// quoteVolume ≈ sum(price × size) for each candle, this ratio is the
// volume-weighted average price over that window.
export function computeRollingVwap(candles: Candle[]): RollingVwap | null {
  if (candles.length < VWAP_WINDOW) return null;

  const window = candles.slice(candles.length - VWAP_WINDOW);
  const sumQuoteVolume = window.reduce((sum, c) => sum + c.quoteVolume, 0);
  const sumBaseVolume = window.reduce((sum, c) => sum + c.volume, 0);

  if (sumBaseVolume === 0) return null;

  return { vwap: sumQuoteVolume / sumBaseVolume, sumQuoteVolume, sumBaseVolume, windowSize: VWAP_WINDOW };
}

export type VolumeResult = {
  relativeVolume: RelativeVolume | null;
  rollingVwap: RollingVwap | null;
};

export function analyzeVolume(candles: Candle[]): VolumeResult {
  return {
    relativeVolume: computeRelativeVolume(candles),
    rollingVwap: computeRollingVwap(candles),
  };
}

export type VwapPosition = { diffPct: number; above: boolean };

// How the last close sits relative to the rolling VWAP, as a plain percentage.
export function computeVwapPosition(lastClose: number, vwap: number): VwapPosition | null {
  if (vwap === 0) return null;
  const diffPct = ((lastClose - vwap) / vwap) * 100;
  return { diffPct, above: diffPct >= 0 };
}

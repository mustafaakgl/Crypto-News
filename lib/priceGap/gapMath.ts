// Pure — no network, no "server-only"; exercised by scripts/verify-price-gap.ts.
import type { VenueGapStats } from "@/lib/priceGap/types";

// A median needs enough venues that one outlier can't move it.
export const MIN_REFERENCE_VENUES = 3;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Starts of the last `count` buckets that have fully closed by nowMs.
export function completedBuckets(nowMs: number, resolutionMs: number, count: number): number[] {
  const lastStart = Math.floor(nowMs / resolutionMs) * resolutionMs - resolutionMs;
  return Array.from({ length: count }, (_, i) => lastStart - (count - 1 - i) * resolutionMs);
}

export function referenceSeries(buckets: number[], cexCloses: Map<number, number>[]): (number | null)[] {
  return buckets.map((b) => {
    const values = cexCloses.map((m) => m.get(b)).filter((v): v is number => v !== undefined && v > 0);
    return values.length >= MIN_REFERENCE_VENUES ? median(values) : null;
  });
}

export function deviationSeries(buckets: number[], closes: Map<number, number>, reference: (number | null)[]): (number | null)[] {
  return buckets.map((b, i) => {
    const c = closes.get(b);
    const r = reference[i];
    return c !== undefined && c > 0 && r !== null ? ((c - r) / r) * 100 : null;
  });
}

function stdev(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (xs.length - 1));
}

// Return and volatility are always measured against the reference over the
// exact same buckets, so a venue with a shorter history (e.g. DEX data
// capped at ~6 months) is never compared with a different time span.
export function gapStats(buckets: number[], closes: Map<number, number>, reference: (number | null)[]): VenueGapStats {
  const common: { b: number; c: number; r: number }[] = [];
  buckets.forEach((b, i) => {
    const c = closes.get(b);
    const r = reference[i];
    if (c !== undefined && c > 0 && r !== null) common.push({ b, c, r });
  });

  if (common.length === 0) {
    return { buckets: 0, meanDevPct: null, meanAbsDevPct: null, maxAbsDevPct: null, maxAbsDevAt: null, returnPct: null, refReturnPct: null, volatilityPct: null, refVolatilityPct: null };
  }

  const devs = common.map((x) => ((x.c - x.r) / x.r) * 100);
  let maxIdx = 0;
  devs.forEach((d, i) => {
    if (Math.abs(d) > Math.abs(devs[maxIdx])) maxIdx = i;
  });

  const step = buckets.length > 1 ? buckets[1] - buckets[0] : 0;
  const venueRets: number[] = [];
  const refRets: number[] = [];
  for (let i = 1; i < common.length; i++) {
    if (common[i].b - common[i - 1].b !== step) continue;
    venueRets.push(Math.log(common[i].c / common[i - 1].c) * 100);
    refRets.push(Math.log(common[i].r / common[i - 1].r) * 100);
  }

  const first = common[0];
  const last = common[common.length - 1];
  const multi = common.length > 1;

  return {
    buckets: common.length,
    meanDevPct: devs.reduce((s, d) => s + d, 0) / devs.length,
    meanAbsDevPct: devs.reduce((s, d) => s + Math.abs(d), 0) / devs.length,
    maxAbsDevPct: Math.abs(devs[maxIdx]),
    maxAbsDevAt: common[maxIdx].b,
    returnPct: multi ? (last.c / first.c - 1) * 100 : null,
    refReturnPct: multi ? (last.r / first.r - 1) * 100 : null,
    volatilityPct: stdev(venueRets),
    refVolatilityPct: stdev(refRets),
  };
}

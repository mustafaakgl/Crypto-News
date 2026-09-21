// Manual verification for the pure price-gap math.
// Run with: node scripts/verify-price-gap.ts
import { completedBuckets, deviationSeries, gapStats, median, referenceSeries } from "../lib/priceGap/gapMath.ts";

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

function assertClose(actual: number | null, expected: number, label: string, eps = 1e-9) {
  if (actual === null || Math.abs(actual - expected) > eps) {
    failures++;
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

const H = 3_600_000;

// ---- median ----
assertEqual(median([]), null, "median of nothing is null");
assertEqual(median([3, 1, 2]), 2, "odd median");
assertEqual(median([4, 1, 3, 2]), 2.5, "even median");

// ---- buckets ----
const now = 10 * H + 20 * 60_000; // 10:20
assertEqual(completedBuckets(now, H, 3), [7 * H, 8 * H, 9 * H], "10:00 bucket is still open, so the last complete one starts 09:00");
assertEqual(completedBuckets(10 * H, H, 1), [9 * H], "exactly on the hour, the new bucket has not closed");

// ---- reference ----
const buckets = [0, H, 2 * H, 3 * H];
const cexA = new Map([[0, 100], [H, 110], [2 * H, 120], [3 * H, 130]]);
const cexB = new Map([[0, 101], [H, 111], [2 * H, 121], [3 * H, 131]]);
const cexC = new Map([[0, 99], [H, 109], [3 * H, 129]]); // missing 2H
const ref = referenceSeries(buckets, [cexA, cexB, cexC]);
assertEqual(ref, [100, 110, null, 130], "needs 3 venues for a median; 2H has only 2");
assertEqual(referenceSeries([0], [new Map([[0, 100]]), new Map([[0, 0]]), new Map([[0, 102]])]), [null], "zero prices don't count toward the minimum");

// ---- deviation ----
const dex = new Map([[0, 101], [H, 108.9], [3 * H, 130]]);
const dev = deviationSeries(buckets, dex, ref);
assertClose(dev[0], 1, "+1% above reference");
assertClose(dev[1], -1, "-1% below reference");
assertEqual([dev[2], dev[3]], [null, 0], "no reference → null; equal → 0");

// ---- stats ----
const s = gapStats(buckets, dex, ref);
assertEqual(s.buckets, 3, "stats use only buckets with both sides");
assertClose(s.meanDevPct, 0, "signed mean cancels out");
assertClose(s.meanAbsDevPct, 2 / 3, "abs mean doesn't cancel");
assertClose(s.maxAbsDevPct, 1, "max abs gap");
assertEqual(s.maxAbsDevAt, 0, "first of equal maxima is reported");
assertClose(s.returnPct, (130 / 101 - 1) * 100, "return over the venue's own first/last common bucket");
assertClose(s.refReturnPct, 30, "reference return over the same buckets");

// 0→H is consecutive, H→3H is not, so exactly one return pair → stdev null.
assertEqual([s.volatilityPct, s.refVolatilityPct], [null, null], "non-consecutive buckets are not used as returns");

const empty = gapStats(buckets, new Map(), ref);
assertEqual([empty.buckets, empty.meanDevPct, empty.returnPct], [0, null, null], "no data → nulls, not zeros");

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall checks passed");

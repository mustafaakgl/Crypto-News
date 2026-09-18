// Manual verification for the exchange-flows computation layer
// (lib/exchangeFlows/flowsMath.ts) — pure functions, no "server-only"
// import, runs directly under plain node.
// Run with: node scripts/verify-exchange-flows.ts
import {
  completedFlowDays,
  validateFlowDailySeries,
  netflow,
  summarizeCoverage,
  describeNetflowDirection,
  sumAvailable,
  targetCompleteDaysForFlowPeriod,
  DAY_MS,
} from "../lib/exchangeFlows/flowsMath.ts";
import type { DailyFlowPoint, ExchangeFlowRow } from "../lib/exchangeFlows/types.ts";

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

function isoDate(daysFromEpoch: number): string {
  return new Date(daysFromEpoch * DAY_MS).toISOString().slice(0, 10);
}

// ---- targetCompleteDaysForFlowPeriod ----
{
  assertEqual(targetCompleteDaysForFlowPeriod("1d"), 1, "targetCompleteDaysForFlowPeriod: 1d -> 1");
  assertEqual(targetCompleteDaysForFlowPeriod("7d"), 7, "targetCompleteDaysForFlowPeriod: 7d -> 7");
  assertEqual(targetCompleteDaysForFlowPeriod("30d"), 30, "targetCompleteDaysForFlowPeriod: 30d -> 30");
  assertEqual(targetCompleteDaysForFlowPeriod("1y"), 365, "targetCompleteDaysForFlowPeriod: 1y -> 365");
}

// ---- completedFlowDays: same "don't count today's partial day" rule as Volume ----
{
  const points: DailyFlowPoint[] = Array.from({ length: 5 }, (_, i) => ({
    dateIso: isoDate(i),
    inflow: 100 + i,
    outflow: 50 + i,
    netflow: 50,
  }));
  const nowMidDay4 = 4 * DAY_MS + 8 * 60 * 60 * 1000; // 8h into day 4 (the last point) — not yet over
  const completed = completedFlowDays(points, nowMidDay4);
  assertEqual(completed.length, 4, "completedFlowDays: drops today's not-yet-elapsed day (5 raw -> 4 complete)");
  assertEqual(completed[completed.length - 1].dateIso, isoDate(3), "completedFlowDays: last kept day is the last FULLY elapsed one");

  const withLag = completedFlowDays(points, 4 * DAY_MS + 2 * 60 * 60 * 1000, 6 * 60 * 60 * 1000); // day 4 elapsed 2h ago, but provider has a 6h publication lag
  assertEqual(withLag.length, 3, "completedFlowDays: a provider's own publication lag can push completeness back further than plain midnight-UTC elapsed");
}

// ---- validateFlowDailySeries: gap / duplicate detection, mirroring the Volume fix ----
{
  const clean: DailyFlowPoint[] = Array.from({ length: 10 }, (_, i) => ({ dateIso: isoDate(i), inflow: 1, outflow: 1, netflow: 0 }));
  assertTrue(validateFlowDailySeries(clean).ok, "validateFlowDailySeries: a clean, gap-free daily series passes");
  assertTrue(!validateFlowDailySeries([]).ok, "validateFlowDailySeries: an empty series fails rather than being treated as zero-coverage-but-fine");

  const withGap = [...clean.slice(0, 4), ...clean.slice(5)]; // day 4 missing
  assertTrue(!validateFlowDailySeries(withGap).ok, "validateFlowDailySeries: a missing day is caught, not silently skipped over");

  const withDuplicate = [...clean, { ...clean[3] }];
  assertTrue(!validateFlowDailySeries(withDuplicate).ok, "validateFlowDailySeries: a duplicate date is caught, never double-counted");
}

// ---- netflow: only from a genuine inflow AND outflow pair ----
{
  assertEqual(netflow(100, 40), 60, "netflow: inflow - outflow when both are real numbers");
  assertEqual(netflow(100, null), null, "netflow: null when outflow is unavailable — never treated as 0");
  assertEqual(netflow(null, 40), null, "netflow: null when inflow is unavailable — never treated as 0");
  assertEqual(netflow(0, 0), 0, "netflow: a genuine reported zero on both sides is a real 0, not null");
}

// ---- describeNetflowDirection: exact required phrasing, descriptive only ----
{
  assertEqual(describeNetflowDirection(120), "More crypto entered than left", "describeNetflowDirection: positive netflow phrasing matches the required wording exactly");
  assertEqual(describeNetflowDirection(-45), "More crypto left than entered", "describeNetflowDirection: negative netflow phrasing is the mirror image");
  assertEqual(describeNetflowDirection(0), "Inflow and outflow were equal", "describeNetflowDirection: a genuine tie is its own distinct message, not lumped into either direction");
}

// ---- summarizeCoverage: real support count vs the full requested selection ----
{
  const rows: ExchangeFlowRow[] = [
    { exchangeId: "a", exchangeName: "A", inflow: 1, outflow: 1, netflow: 0, coverage: "available", updatedAt: null },
    { exchangeId: "b", exchangeName: "B", inflow: null, outflow: null, netflow: null, coverage: "unavailable", updatedAt: null },
    { exchangeId: "c", exchangeName: "C", inflow: 2, outflow: 1, netflow: 1, coverage: "available", updatedAt: null },
  ];
  assertEqual(summarizeCoverage(rows), { supportedCount: 2, requestedCount: 3 }, "summarizeCoverage: counts only rows actually marked available, out of the full requested selection — this is what drives 'Data available for N of M selected exchanges'");
}

// ---- sumAvailable: never lets one missing exchange zero out a partial total ----
{
  assertEqual(sumAvailable([10, null, 20]), 30, "sumAvailable: sums only the available values, skipping unavailable ones rather than treating them as 0");
  assertEqual(sumAvailable([null, null]), null, "sumAvailable: null when NOTHING is available — distinct from a real 0 total");
  assertEqual(sumAvailable([]), null, "sumAvailable: empty input -> null, never a fabricated 0");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

// Manual verification for the pure on-chain functions.
// Run with: node scripts/verify-onchain.ts
import { utcDateString, addUtcDays, filterCompletedDays, computeWeekOverWeekChange } from "../lib/onchain.ts";

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

function assertClose(actual: number | null, expected: number, label: string, epsilon = 1e-9) {
  if (actual === null || Math.abs(actual - expected) > epsilon) {
    failures++;
    console.error(`FAIL ${label}: expected ~${expected}, got ${actual}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// ---- date helpers ----
assertEqual(utcDateString(Date.UTC(2026, 8, 17, 13, 45)), "2026-09-17", "utcDateString: extracts UTC calendar date, ignoring time-of-day");
assertEqual(addUtcDays("2026-09-17", 1), "2026-09-18", "addUtcDays: +1 day");
assertEqual(addUtcDays("2026-09-01", -1), "2026-08-31", "addUtcDays: -1 day crosses month boundary");
assertEqual(addUtcDays("2026-12-31", 1), "2027-01-01", "addUtcDays: crosses year boundary");

// ---- filterCompletedDays: the current UTC day is never "completed" ----
{
  const points = [
    { date: "2026-09-15", value: 100 },
    { date: "2026-09-16", value: 110 },
    { date: "2026-09-17", value: 120 }, // "today" — must be dropped
  ];
  const completed = filterCompletedDays(points, "2026-09-17");
  assertEqual(completed.length, 2, "filterCompletedDays: drops today's incomplete UTC day");
  assertEqual(completed.map((p) => p.date), ["2026-09-15", "2026-09-16"], "filterCompletedDays: sorted ascending, today excluded");
}

// ---- computeWeekOverWeekChange: calendar-date based, not index-based ----
{
  // Build 14 consecutive complete days, values rising from 100 to 113.
  const points = Array.from({ length: 14 }, (_, i) => ({
    date: addUtcDays("2026-09-01", i),
    value: 100 + i,
  }));
  // Last week (days 7-13, values 107-113) avg = 110. Prior week (days 0-6, values 100-106) avg = 103.
  const result = computeWeekOverWeekChange(points);
  assertEqual(result.lastWeekAvg, 110, "computeWeekOverWeekChange: last-7-day avg over real calendar dates");
  assertEqual(result.priorWeekAvg, 103, "computeWeekOverWeekChange: prior-7-day avg over real calendar dates");
  assertClose(result.changePct, (110 / 103 - 1) * 100, "computeWeekOverWeekChange: percent change formula");
  assertEqual(result.window?.lastWeekEnd, "2026-09-14", "computeWeekOverWeekChange: window anchored to the last available date");
}

// ---- missing a single day in either window -> Insufficient data (null), never estimated ----
{
  const points = Array.from({ length: 14 }, (_, i) => ({
    date: addUtcDays("2026-09-01", i),
    value: 100 + i,
  })).filter((p) => p.date !== "2026-09-03"); // drop one day from the "prior" week
  const result = computeWeekOverWeekChange(points);
  assertEqual(result.changePct, null, "computeWeekOverWeekChange: one missing day in prior week -> Insufficient data");
  assertEqual(result.lastWeekAvg, null, "computeWeekOverWeekChange: no partial-week average is computed either");

  const gapInLastWeek = Array.from({ length: 14 }, (_, i) => ({
    date: addUtcDays("2026-09-01", i),
    value: 100 + i,
  })).filter((p) => p.date !== "2026-09-12"); // drop one day from the "last" week
  assertEqual(computeWeekOverWeekChange(gapInLastWeek).changePct, null, "computeWeekOverWeekChange: one missing day in last week -> Insufficient data");
}

// ---- fewer than 14 days available at all -> Insufficient data ----
{
  const points = Array.from({ length: 10 }, (_, i) => ({ date: addUtcDays("2026-09-01", i), value: 100 }));
  assertEqual(computeWeekOverWeekChange(points).changePct, null, "computeWeekOverWeekChange: <14 days total -> Insufficient data");
}

// ---- zero denominator never produces a percentage ----
{
  const points = Array.from({ length: 14 }, (_, i) => ({
    date: addUtcDays("2026-09-01", i),
    value: i < 7 ? 0 : 50, // prior week all zero, last week 50
  }));
  assertEqual(computeWeekOverWeekChange(points).changePct, null, "computeWeekOverWeekChange: zero prior-week average -> no percent change produced");
}

// ---- empty series ----
assertEqual(computeWeekOverWeekChange([]).changePct, null, "computeWeekOverWeekChange: empty series -> null, no window");
assertEqual(computeWeekOverWeekChange([]).window, null, "computeWeekOverWeekChange: empty series -> no window claimed");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

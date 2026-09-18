// Manual verification for the pure derivatives functions.
// Run with: node scripts/verify-derivatives.ts
import {
  rateToPercent,
  pickLatestFunding,
  findPointNearTime,
  computePercentChange,
  deriveFundingIntervalHours,
  evaluateFundingFreshness,
  isRealtimeStale,
  isHourlySeriesStale,
} from "../lib/derivatives.ts";

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

const HOUR = 60 * 60 * 1000;

// ---- rateToPercent ----
assertEqual(rateToPercent(0.0001), 0.01, "rateToPercent: 0.0001 -> 0.01");
assertEqual(rateToPercent(-0.00005481), -0.005481, "rateToPercent: negative rate");

// ---- pickLatestFunding: never assumes array order ----
{
  const outOfOrder = [
    { fundingTime: 3000, fundingRate: 0.0001 },
    { fundingTime: 1000, fundingRate: 0.0002 },
    { fundingTime: 2000, fundingRate: 0.0003 },
  ];
  assertEqual(pickLatestFunding(outOfOrder)?.fundingTime, 3000, "pickLatestFunding: picks max fundingTime regardless of order");
  assertEqual(pickLatestFunding([]), null, "pickLatestFunding: empty -> null");
}

// ---- findPointNearTime: real timestamp matching, not index offset ----
{
  const points = [
    { timestamp: 0, value: 100 },
    { timestamp: HOUR, value: 110 },
    { timestamp: 24 * HOUR, value: 200 }, // exact 24h point
    { timestamp: 48 * HOUR, value: 300 },
  ];
  const exact = findPointNearTime(points, 24 * HOUR, 90 * 60 * 1000);
  assertEqual(exact?.value, 200, "findPointNearTime: exact match");

  const within = findPointNearTime(points, 24 * HOUR + 30 * 60 * 1000, 90 * 60 * 1000);
  assertEqual(within?.value, 200, "findPointNearTime: within tolerance");

  const tooFar = findPointNearTime(points, 24 * HOUR + 5 * HOUR, 90 * 60 * 1000);
  assertEqual(tooFar, null, "findPointNearTime: beyond tolerance -> null");

  assertEqual(findPointNearTime([], 24 * HOUR, 90 * 60 * 1000), null, "findPointNearTime: empty series -> null");

  // Critical: 3 samples "back" is NOT necessarily 24h ago if the series has gaps.
  const gappy = [
    { timestamp: 0, value: 100 },
    { timestamp: 1 * HOUR, value: 105 },
    { timestamp: 30 * HOUR, value: 999 }, // big gap — NOT 24h from the last point below
    { timestamp: 50 * HOUR, value: 400 },
  ];
  const lastTime = 50 * HOUR;
  // A naive "3rd sample back" approach would silently return the 30h point
  // (value 999) here instead of correctly recognizing there is no real 24h-ago sample.
  const real24hAgo = findPointNearTime(gappy, lastTime - 24 * HOUR, 90 * 60 * 1000);
  assertEqual(real24hAgo, null, "findPointNearTime: gappy series with no real 24h-ago point correctly returns null, not the 30h point");
}

// ---- computePercentChange ----
assertClose(computePercentChange(110, 100), 10, "computePercentChange: 110 vs 100 = +10%");
assertClose(computePercentChange(90, 100), -10, "computePercentChange: 90 vs 100 = -10%");
assertEqual(computePercentChange(100, 0), null, "computePercentChange: zero denominator -> null");

// ---- deriveFundingIntervalHours: empirical, never assumes a fixed value ----
{
  const eightHourly = [
    { fundingTime: 0, fundingRate: 0.0001 },
    { fundingTime: 8 * HOUR, fundingRate: 0.0001 },
    { fundingTime: 16 * HOUR, fundingRate: 0.0001 },
  ];
  assertEqual(deriveFundingIntervalHours(eightHourly), 8, "deriveFundingIntervalHours: consistent 8h gaps -> 8");

  const fourHourly = [
    { fundingTime: 0, fundingRate: 0.0001 },
    { fundingTime: 4 * HOUR, fundingRate: 0.0001 },
    { fundingTime: 8 * HOUR, fundingRate: 0.0001 },
  ];
  assertEqual(deriveFundingIntervalHours(fourHourly), 4, "deriveFundingIntervalHours: consistent 4h gaps -> 4 (never assumes 8h)");

  const irregular = [
    { fundingTime: 0, fundingRate: 0.0001 },
    { fundingTime: 8 * HOUR, fundingRate: 0.0001 },
    { fundingTime: 13 * HOUR, fundingRate: 0.0001 }, // inconsistent gap
  ];
  assertEqual(deriveFundingIntervalHours(irregular), null, "deriveFundingIntervalHours: inconsistent gaps -> null (unknown), not a guess");

  assertEqual(deriveFundingIntervalHours([{ fundingTime: 0, fundingRate: 0.0001 }]), null, "deriveFundingIntervalHours: single record -> null");
  assertEqual(deriveFundingIntervalHours([]), null, "deriveFundingIntervalHours: empty -> null");
}

// ---- evaluateFundingFreshness: separates data-fetch freshness from event-calendar freshness ----
{
  const now = 100 * HOUR;

  // No evidence at all (no provider nextFundingTime, no interval) -> unknown, never asserted stale.
  assertEqual(
    evaluateFundingFreshness({ now, lastFundingTime: now - 6 * HOUR, nextFundingTimeFromProvider: null, intervalHours: null, toleranceMs: 5 * 60 * 1000 }).freshness,
    "unknown",
    "evaluateFundingFreshness: no calendar evidence -> unknown, not stale"
  );

  // Provider's own nextFundingTime is still ahead -> fresh.
  assertEqual(
    evaluateFundingFreshness({ now, lastFundingTime: now - 2 * HOUR, nextFundingTimeFromProvider: now + 6 * HOUR, intervalHours: 8, toleranceMs: 5 * 60 * 1000 }).freshness,
    "fresh",
    "evaluateFundingFreshness: next settlement still ahead -> fresh"
  );

  // Provider's nextFundingTime passed a while ago and no new record arrived -> awaiting settlement.
  assertEqual(
    evaluateFundingFreshness({ now, lastFundingTime: now - 9 * HOUR, nextFundingTimeFromProvider: now - HOUR, intervalHours: 8, toleranceMs: 5 * 60 * 1000 }).freshness,
    "awaiting_settlement",
    "evaluateFundingFreshness: expected settlement overdue past tolerance -> awaiting_settlement"
  );

  // Just barely past the expected time but still within the documented tolerance -> fresh, not flagged yet.
  assertEqual(
    evaluateFundingFreshness({ now, lastFundingTime: now - 9 * HOUR, nextFundingTimeFromProvider: now - 60 * 1000, intervalHours: 8, toleranceMs: 5 * 60 * 1000 }).freshness,
    "fresh",
    "evaluateFundingFreshness: within grace period -> still fresh, not flagged prematurely"
  );

  // No provider nextFundingTime, but a known interval lets us derive an expectation from lastFundingTime.
  const fallback = evaluateFundingFreshness({ now, lastFundingTime: now - 9 * HOUR, nextFundingTimeFromProvider: null, intervalHours: 8, toleranceMs: 5 * 60 * 1000 });
  assertEqual(fallback.freshness, "awaiting_settlement", "evaluateFundingFreshness: falls back to lastFundingTime+intervalHours when provider time is missing");
  assertEqual(fallback.expectedNextFundingTime, now - HOUR, "evaluateFundingFreshness: fallback expected time = lastFundingTime + intervalHours");

  // ---- Regression: the specific "hidden missing payment" bug ----
  // Settlements are every 8h (boundaries at 0h, 8h, 16h, ...). We're 30 min
  // past the 8h boundary; Binance's premiumIndex has ALREADY rolled
  // nextFundingTime forward to the 16h boundary (it does this almost
  // immediately after settlement) — but funding-rate history is still stuck
  // on the 0h record, meaning the 8h payment never arrived. A naive check
  // against only the (already-future) nextFundingTime would say "fresh"
  // because now is nowhere near 16h — that's the bug.
  const boundary8h = 8 * HOUR;
  const nowJustAfter8h = boundary8h + 30 * 60 * 1000; // 8h + 30min
  const hidden = evaluateFundingFreshness({
    now: nowJustAfter8h,
    lastFundingTime: 0, // still only has the 0h record — the 8h one is missing
    nextFundingTimeFromProvider: 16 * HOUR, // already advanced to the NEXT period
    intervalHours: 8,
    toleranceMs: 5 * 60 * 1000,
  });
  assertEqual(
    hidden.freshness,
    "awaiting_settlement",
    "evaluateFundingFreshness: catches a missing settlement even when nextFundingTime has already advanced to the following period"
  );
  assertEqual(hidden.missingSettlementExpectedAt, boundary8h, "evaluateFundingFreshness: identifies the specific missed boundary (8h), not the future one (16h)");

  // Control: same moment, but the 8h settlement DID arrive — must read as fresh.
  const caughtUp = evaluateFundingFreshness({
    now: nowJustAfter8h,
    lastFundingTime: boundary8h,
    nextFundingTimeFromProvider: 16 * HOUR,
    intervalHours: 8,
    toleranceMs: 5 * 60 * 1000,
  });
  assertEqual(caughtUp.freshness, "fresh", "evaluateFundingFreshness: control — once the 8h record arrives, freshness reads fresh again");
}

// ---- other staleness rules (data-fetch freshness, unrelated to the funding calendar) ----
{
  const now = 100 * HOUR;
  assertEqual(isRealtimeStale(now - 10 * 60 * 1000, now), false, "isRealtimeStale: 10 min old OI snapshot is fresh");
  assertEqual(isRealtimeStale(now - 40 * 60 * 1000, now), true, "isRealtimeStale: 40 min old OI snapshot is stale");

  assertEqual(isHourlySeriesStale(now - 1 * HOUR, now), false, "isHourlySeriesStale: 1h old hourly sample is fresh");
  assertEqual(isHourlySeriesStale(now - 3 * HOUR, now), true, "isHourlySeriesStale: 3h old hourly sample is stale");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

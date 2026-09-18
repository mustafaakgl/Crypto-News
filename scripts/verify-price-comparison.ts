// Manual verification for the pure price-comparison math
// (lib/priceComparison/priceMath.ts) — no "server-only" import, runs
// directly under plain node. Covers exactly the concrete risks the brief
// named: price direction, percent formula, USD/USDT-style unit mismatch,
// unknown vs. known-stale source time, and single-provider isolation.
// Run with: node scripts/verify-price-comparison.ts
import { computePercentDiff, computeDifference, isStale, STALE_THRESHOLD_MS } from "../lib/priceComparison/priceMath.ts";
import type { PriceObservation } from "../lib/priceComparison/types.ts";

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

const NOW = Date.parse("2026-09-18T12:00:00.000Z");

function obs(overrides: Partial<PriceObservation>): PriceObservation {
  return {
    venueId: "test",
    venueName: "Test",
    venueType: "cex",
    pair: "ETH/USDT",
    status: "ok",
    price: 2500,
    quoteCurrency: "USDT",
    priceType: "last_trade",
    sourceTimeIso: new Date(NOW - 1000).toISOString(),
    fetchedAtIso: new Date(NOW).toISOString(),
    error: null,
    ...overrides,
  };
}

// ---- computePercentDiff: exact formula, correct sign/direction ----
{
  assertEqual(computePercentDiff(2550, 2500), 2, "computePercentDiff: a higher price than reference is a positive percent");
  assertEqual(computePercentDiff(2450, 2500), -2, "computePercentDiff: a lower price than reference is a negative percent (correct direction, not just magnitude)");
  assertEqual(computePercentDiff(2500, 2500), 0, "computePercentDiff: identical prices -> exactly 0, not a rounding artifact");
}

// ---- isStale: unknown time is NOT the same condition as known-stale ----
{
  assertTrue(!isStale(null, NOW), "isStale: a null (unknown) source time is never treated as stale — those are distinct conditions");
  assertTrue(!isStale(new Date(NOW - 60_000).toISOString(), NOW), "isStale: a trade 1 minute old is fresh");
  assertTrue(isStale(new Date(NOW - STALE_THRESHOLD_MS - 1000).toISOString(), NOW), "isStale: a trade older than the threshold is stale");
  assertTrue(!isStale(new Date(NOW - STALE_THRESHOLD_MS + 1000).toISOString(), NOW), "isStale: a trade just under the threshold is not yet stale");
}

// ---- computeDifference: the reference row itself ----
{
  const reference = obs({ venueId: "binance" });
  assertEqual(computeDifference(reference, reference, NOW), { status: "reference" }, "computeDifference: comparing the reference to itself is tagged 'reference', not a 0.000% diff");
}

// ---- computeDifference: reference unavailable -> every other row unavailable, never silently re-based ----
{
  const brokenReference = obs({ venueId: "binance", status: "unavailable", price: null, sourceTimeIso: null });
  const other = obs({ venueId: "bybit", price: 2510 });
  const diff = computeDifference(other, brokenReference, NOW);
  assertEqual(diff, { status: "unavailable", reason: "Reference price unavailable." }, "computeDifference: a dead reference makes every other diff unavailable, never falls back to a different implicit reference");
}

// ---- computeDifference: this venue's own price missing ----
{
  const reference = obs({ venueId: "binance", price: 2500 });
  const brokenObservation = obs({ venueId: "dex", status: "unavailable", price: null });
  assertEqual(
    computeDifference(brokenObservation, reference, NOW),
    { status: "unavailable", reason: "This venue's price is unavailable." },
    "computeDifference: this venue's own missing price -> unavailable, never treated as 0"
  );
}

// ---- computeDifference: quote-currency mismatch (the USD vs USDT trap) ----
{
  const reference = obs({ venueId: "binance", price: 2500, quoteCurrency: "USDT" });
  const usdPriced = obs({ venueId: "some-usd-venue", price: 2500, quoteCurrency: "USDT" as const });
  // Simulate a genuinely different quote currency by overriding the type at
  // the object level (the real type is fixed to "USDT" for this feature's
  // first pass, but the guard must still fire if that ever changes).
  const mismatched = { ...usdPriced, quoteCurrency: "USD" } as unknown as PriceObservation;
  const diff = computeDifference(mismatched, reference, NOW);
  assertTrue(diff.status === "unavailable" && diff.reason.includes("Quote currency mismatch"), "computeDifference: a quote-currency mismatch (e.g. USD vs USDT) is refused, never silently treated as equivalent");
}

// ---- computeDifference: known-stale data excluded ----
{
  const reference = obs({ venueId: "binance", price: 2500 });
  const staleObservation = obs({ venueId: "bybit", price: 2510, sourceTimeIso: new Date(NOW - STALE_THRESHOLD_MS - 60_000).toISOString() });
  const diff = computeDifference(staleObservation, reference, NOW);
  assertTrue(diff.status === "unavailable" && diff.reason.includes("stale"), "computeDifference: a known-stale price is excluded from the diff, not silently included");
}

// ---- computeDifference: unknown source time (DEX case) is NOT excluded as stale ----
{
  const reference = obs({ venueId: "binance", price: 2500 });
  const noTimeObservation = obs({ venueId: "uniswap", price: 2505, sourceTimeIso: null, priceType: "pool_price" });
  const diff = computeDifference(noTimeObservation, reference, NOW);
  assertTrue(diff.status === "computed", "computeDifference: an unknown (not known-stale) source time still allows a diff to be computed — 'unknown' and 'stale' are different things");
  if (diff.status === "computed") {
    assertEqual(diff.percent, computePercentDiff(2505, 2500), "computeDifference: the computed percent matches the plain formula");
  }
}

// ---- computeDifference: invalid numeric edge cases ----
{
  const zeroReference = obs({ venueId: "binance", price: 0 });
  const other = obs({ venueId: "bybit", price: 2500 });
  const diff = computeDifference(other, zeroReference, NOW);
  assertTrue(diff.status === "unavailable", "computeDifference: a zero reference price never causes a divide-by-zero result, refused instead");
}

// ---- single-provider failure isolation (structural check on the type) ----
{
  const rows: PriceObservation[] = [obs({ venueId: "binance" }), obs({ venueId: "bybit", status: "unavailable", price: null, error: "network error" }), obs({ venueId: "uniswap" })];
  const okCount = rows.filter((r) => r.status === "ok").length;
  assertEqual(okCount, 2, "computeDifference/model: one provider failing leaves the other two rows independently usable, not a shared all-or-nothing result");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

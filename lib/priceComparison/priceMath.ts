// Pure, provider-agnostic price-comparison math. No network access, no
// "server-only" import — testable directly under plain node.
import type { PriceObservation, PriceDifference } from "@/lib/priceComparison/types";

// Two of the world's most liquid spot pairs trade essentially every second;
// a "last trade" older than this signals a feed problem, not normal quiet
// trading, and is excluded from the difference calculation rather than
// treated as current.
export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function isStale(sourceTimeIso: string | null, nowMs: number, thresholdMs = STALE_THRESHOLD_MS): boolean {
  // A MISSING source time is a distinct condition ("unknown", handled by the
  // caller via priceType/sourceTimeIso being null) from a KNOWN, old one
  // ("stale") — this function only ever answers the latter.
  if (sourceTimeIso === null) return false;
  const parsed = Date.parse(sourceTimeIso);
  if (isNaN(parsed)) return false;
  return nowMs - parsed > thresholdMs;
}

// (price - referencePrice) / referencePrice * 100 — exactly the formula
// specified, never a differently-signed or differently-scaled variant.
export function computePercentDiff(price: number, referencePrice: number): number {
  return ((price - referencePrice) / referencePrice) * 100;
}

// Never produces a percentage from a missing, zero-as-placeholder, invalid,
// mismatched-unit, or known-stale price — each such case returns a distinct
// "unavailable" reason instead of a silently-wrong number.
export function computeDifference(observation: PriceObservation, reference: PriceObservation, nowMs: number): PriceDifference {
  if (observation.venueId === reference.venueId) return { status: "reference" };
  if (reference.status !== "ok" || reference.price === null) {
    return { status: "unavailable", reason: "Reference price unavailable." };
  }
  if (observation.status !== "ok" || observation.price === null) {
    return { status: "unavailable", reason: "This venue's price is unavailable." };
  }
  if (observation.quoteCurrency !== reference.quoteCurrency) {
    return { status: "unavailable", reason: `Quote currency mismatch (${observation.quoteCurrency} vs ${reference.quoteCurrency}).` };
  }
  if (!isFinite(observation.price) || !isFinite(reference.price) || reference.price === 0) {
    return { status: "unavailable", reason: "Invalid reference or observed price." };
  }
  if (isStale(observation.sourceTimeIso, nowMs)) {
    return { status: "unavailable", reason: "This venue's price is stale (last observed too long ago)." };
  }
  if (isStale(reference.sourceTimeIso, nowMs)) {
    return { status: "unavailable", reason: "Reference price is stale." };
  }
  return { status: "computed", percent: computePercentDiff(observation.price, reference.price) };
}

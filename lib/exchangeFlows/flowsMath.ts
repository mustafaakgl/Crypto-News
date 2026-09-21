// Pure, provider-agnostic computation layer for exchange flow data. Built
// and tested ahead of any live provider being connected (see provider.ts) —
// plugging in a real adapter later only means implementing FlowsProvider
// against these rules, not inventing them under time pressure then.
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { DailyFlowPoint, ExchangeFlowRow } from "@/lib/exchangeFlows/types";

export const DAY_MS = 86_400_000;

export function targetCompleteDaysForFlowPeriod(period: ExchangePeriod): number {
  if (period === "1d") return 1;
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  return 365;
}

function dayStartMs(dateIso: string): number {
  return Date.parse(`${dateIso}T00:00:00.000Z`);
}

// A "today"-dated point is dropped unless its own 24h window has fully
// elapsed. Also accounts for a provider's own PUBLICATION lag — an
// on-chain flow provider often finalizes yesterday's number some hours
// into today, not the instant midnight UTC passes. A caller that hasn't
// verified the real lag for its provider should pass 0, never guess a
// lag that makes stale data look current.
export function completedFlowDays(points: DailyFlowPoint[], nowMs: number, publicationLagMs = 0, dayMs = DAY_MS): DailyFlowPoint[] {
  return points.filter((p) => dayStartMs(p.dateIso) + dayMs + publicationLagMs <= nowMs);
}

export type FlowSeriesValidation = { ok: true } | { ok: false; reason: string };

// A daily series is only
// safe to sum/chart as non-overlapping days if it actually has no gaps and
// no repeated dates — checked at runtime, never assumed from the request
// alone.
export function validateFlowDailySeries(points: DailyFlowPoint[]): FlowSeriesValidation {
  if (points.length === 0) return { ok: false, reason: "no daily points available" };
  const sorted = [...points].sort((a, b) => dayStartMs(a.dateIso) - dayStartMs(b.dateIso));
  const seen = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    if (seen.has(sorted[i].dateIso)) {
      return { ok: false, reason: `duplicate date ${sorted[i].dateIso}` };
    }
    seen.add(sorted[i].dateIso);
    if (i > 0) {
      const gap = dayStartMs(sorted[i].dateIso) - dayStartMs(sorted[i - 1].dateIso);
      if (gap !== DAY_MS) {
        return { ok: false, reason: `gap between ${sorted[i - 1].dateIso} and ${sorted[i].dateIso} (${gap / DAY_MS} days apart, expected 1) — a day is missing` };
      }
    }
  }
  return { ok: true };
}

// Netflow is ONLY ever derived from a genuine inflow AND outflow reported
// for the exact same asset/network/period/methodology — never computed
// when a source gives just one side (that's not "the other side is zero",
// it's "unknown"), and never guessed from a balance/reserve change or raw
// trading volume.
export function netflow(inflow: number | null, outflow: number | null): number | null {
  if (inflow === null || outflow === null) return null;
  return inflow - outflow;
}

export function summarizeCoverage(rows: ExchangeFlowRow[]): { supportedCount: number; requestedCount: number } {
  return { supportedCount: rows.filter((r) => r.coverage === "available").length, requestedCount: rows.length };
}

export function sumAvailable(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

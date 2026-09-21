import "server-only";
import { EXCHANGE_PERIODS, type ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import { PERIOD_DAYS } from "@/lib/exchangeVolume/aggregate";
import type { StoredDailyPoint, StoredPeriodTotals, StoredVenueTotals } from "@/lib/exchangeVolume/types";
import type { CexVenueId } from "@/lib/exchangeVolume/venues";
import { dayToIso, getDb, hasDb, toDay } from "@/lib/store/db";

// Totals are only marked complete when every day of the window was collected
// with acceptable coverage; otherwise the partial sum is still returned but
// the UI must not present it as the period's total.
export function getStoredTotals(venueId: CexVenueId, nowMs = Date.now()): StoredVenueTotals | null {
  if (!hasDb()) return null;
  const db = getDb();
  const sync = db.prepare("SELECT first_day, complete_through_day, pairs_listed, updated_at FROM cex_venue_sync WHERE venue = ?").get(venueId) as
    | { first_day: number; complete_through_day: number; pairs_listed: number; updated_at: number }
    | undefined;
  if (!sync) return null;

  const endDay = toDay(nowMs) - 1;
  const oldest = endDay - PERIOD_DAYS["1y"] + 1;
  const rows = db
    .prepare("SELECT day, total_usd, tracked_usd, stable_swap_usd FROM cex_daily_totals WHERE venue = ? AND day BETWEEN ? AND ?")
    .all(venueId, oldest, endDay) as { day: number; total_usd: number; tracked_usd: number; stable_swap_usd: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));

  const periods = {} as Record<ExchangePeriod, StoredPeriodTotals>;
  for (const period of EXCHANGE_PERIODS) {
    const days = PERIOD_DAYS[period];
    const startDay = endDay - days + 1;
    let totalUsd = 0;
    let trackedUsd = 0;
    let stableSwapUsd = 0;
    let daysCovered = 0;
    for (let d = startDay; d <= endDay; d++) {
      const r = byDay.get(d);
      if (!r || d < sync.first_day || d > sync.complete_through_day) continue;
      totalUsd += r.total_usd;
      trackedUsd += r.tracked_usd;
      stableSwapUsd += r.stable_swap_usd;
      daysCovered++;
    }
    periods[period] = { totalUsd, trackedUsd, stableSwapUsd, days, daysCovered, complete: daysCovered === days, startDay: dayToIso(startDay), endDay: dayToIso(endDay) };
  }

  return { periods, collectedFrom: dayToIso(sync.first_day), collectedThrough: dayToIso(sync.complete_through_day), pairsListed: sync.pairs_listed };
}

// Only days inside the venue's collected range are returned, so a missing
// day is never read as zero volume.
export function getStoredDailySeries(venueId: CexVenueId, days: number, nowMs = Date.now()): StoredDailyPoint[] | null {
  if (!hasDb()) return null;
  const db = getDb();
  const sync = db.prepare("SELECT first_day, complete_through_day FROM cex_venue_sync WHERE venue = ?").get(venueId) as
    | { first_day: number; complete_through_day: number }
    | undefined;
  if (!sync) return null;
  const endDay = Math.min(toDay(nowMs) - 1, sync.complete_through_day);
  const startDay = Math.max(endDay - days + 1, sync.first_day);
  const rows = db
    .prepare("SELECT day, total_usd, tracked_usd FROM cex_daily_totals WHERE venue = ? AND day BETWEEN ? AND ? ORDER BY day")
    .all(venueId, startDay, endDay) as { day: number; total_usd: number; tracked_usd: number }[];
  return rows.map((r) => ({ day: r.day, totalUsd: r.total_usd, trackedUsd: r.tracked_usd }));
}

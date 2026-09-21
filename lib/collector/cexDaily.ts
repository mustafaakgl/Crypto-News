import "server-only";
import { ADAPTERS, type VenueAdapter } from "@/lib/exchangeVolume/adapters";
import { toTrackedPair } from "@/lib/exchangeVolume/aggregate";
import { rolling24hTotals } from "@/lib/exchangeVolume/rolling24h";
import type { CexVenueId } from "@/lib/exchangeVolume/venues";
import { DAY_MS, getDb, toDay, transaction } from "@/lib/store/db";

const BACKFILL_DAYS = 366;
// Re-fetch the last few days on every run so late corrections from an exchange are picked up.
const REFRESH_DAYS = 3;
// A day counts as collected for the venue only if (almost) every listed pair was fetched.
const MAX_FAILED_SHARE = 0.02;

// A separate, slower pace key than the page's live requests, so a long
// collection run never queues in front of a visitor's request.
const COLLECTOR_INTERVAL_MS: Record<CexVenueId, number> = {
  binance: 250,
  okx: 300,
  coinbase: 400,
  bybit: 250,
  upbit: 300,
  kraken: 3500,
  kucoin: 350,
  gate: 300,
  bitget: 700,
  bitstamp: 400,
};

function collectorAdapter(venueId: CexVenueId): VenueAdapter {
  const base = ADAPTERS[venueId];
  return { ...base, pace: { key: `${base.pace.key}:collector`, minIntervalMs: COLLECTOR_INTERVAL_MS[venueId] }, candleRevalidate: 0 };
}

export type VenueRunResult = { venueId: CexVenueId; pairsListed: number; pairsFailed: number; rowsWritten: number; daysRecomputed: number; errors: string[] };

export function recomputeDailyTotals(venueId: CexVenueId, fromDay: number, toDayInclusive: number): number {
  const db = getDb();
  const select = db.prepare("SELECT base, quote, close, quote_volume FROM cex_daily WHERE venue = ? AND day = ?");
  const upsert = db.prepare(
    `INSERT INTO cex_daily_totals (venue, day, total_usd, tracked_usd, stable_swap_usd, pairs, pairs_unvalued)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (venue, day) DO UPDATE SET total_usd = excluded.total_usd, tracked_usd = excluded.tracked_usd,
       stable_swap_usd = excluded.stable_swap_usd, pairs = excluded.pairs, pairs_unvalued = excluded.pairs_unvalued`
  );
  let n = 0;
  transaction(() => {
    for (let day = fromDay; day <= toDayInclusive; day++) {
      const rows = select.all(venueId, day) as { base: string; quote: string; close: number; quote_volume: number }[];
      if (rows.length === 0) continue;
      const t = rolling24hTotals(
        rows.map((r) => ({ base: r.base, quote: r.quote, last: r.close, quoteVolume: r.quote_volume })),
        (b, q) => toTrackedPair(b, q) !== null
      );
      upsert.run(venueId, day, t.totalUsd, t.trackedUsd, t.stableSwapUsd, t.pairsCounted, t.pairsUnvalued);
      n++;
    }
  });
  return n;
}

export async function collectVenueDaily(venueId: CexVenueId, nowMs = Date.now()): Promise<VenueRunResult> {
  const db = getDb();
  const adapter = collectorAdapter(venueId);
  const today = toDay(nowMs);
  const lastComplete = today - 1;

  const sync = db.prepare("SELECT first_day, complete_through_day FROM cex_venue_sync WHERE venue = ?").get(venueId) as
    | { first_day: number; complete_through_day: number }
    | undefined;
  // Backfill if nothing is collected yet or collection has fallen behind by more than the refresh window.
  const backfill = !sync || sync.complete_through_day < lastComplete - REFRESH_DAYS;
  const fromDay = backfill ? today - BACKFILL_DAYS : sync.complete_through_day - REFRESH_DAYS + 1;

  const instruments = await adapter.listInstruments();
  const insert = db.prepare(
    `INSERT INTO cex_daily (venue, symbol, base, quote, day, close, base_volume, quote_volume)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (venue, symbol, day) DO UPDATE SET close = excluded.close, base_volume = excluded.base_volume,
       quote_volume = excluded.quote_volume, base = excluded.base, quote = excluded.quote`
  );

  let rowsWritten = 0;
  const collect = async (inst: (typeof instruments)[number]) => {
    const candles = await adapter.fetchCandles(inst.symbol, "1d", fromDay * DAY_MS, nowMs);
    const complete = candles.filter((c) => {
      const d = toDay(c.startMs);
      return d >= fromDay && d <= lastComplete && c.startMs % DAY_MS === 0 && c.quoteVolume > 0 && c.close > 0;
    });
    transaction(() => {
      for (const c of complete) insert.run(venueId, inst.symbol, inst.base, inst.quote, toDay(c.startMs), c.close, c.baseVolume, c.quoteVolume);
    });
    rowsWritten += complete.length;
  };

  // Failures are usually transient timeouts; one retry at the end recovers most
  // without holding up the rest, and a pair missed here would otherwise only
  // ever get its last few days back from later daily runs.
  const failed: typeof instruments = [];
  for (const inst of instruments) {
    try {
      await collect(inst);
    } catch {
      failed.push(inst);
    }
  }
  const errors: string[] = [];
  for (const inst of failed) {
    try {
      await collect(inst);
    } catch (err) {
      errors.push(`${inst.symbol}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const daysRecomputed = recomputeDailyTotals(venueId, fromDay, lastComplete);

  const acceptable = instruments.length > 0 && errors.length / instruments.length <= MAX_FAILED_SHARE;
  if (acceptable) {
    db.prepare(
      `INSERT INTO cex_venue_sync (venue, first_day, complete_through_day, pairs_listed, pairs_failed, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (venue) DO UPDATE SET
         first_day = CASE WHEN excluded.first_day < cex_venue_sync.first_day THEN excluded.first_day ELSE cex_venue_sync.first_day END,
         complete_through_day = excluded.complete_through_day, pairs_listed = excluded.pairs_listed,
         pairs_failed = excluded.pairs_failed, updated_at = excluded.updated_at`
    ).run(venueId, fromDay, lastComplete, instruments.length, errors.length, nowMs);
  }

  return { venueId, pairsListed: instruments.length, pairsFailed: errors.length, rowsWritten, daysRecomputed, errors };
}

import "server-only";
import { runDuneSql } from "@/lib/exchangeFlows/duneClient";
import { DUNE_TOKENS, DUNE_TRACKED_VENUES, exchangeFlowsSql } from "@/lib/exchangeFlows/duneSql";
import { dayToIso, getDb, toDay, transaction } from "@/lib/store/db";

export const FLOWS_SOURCE = "dune_ethereum";
const NETWORK = "ethereum";
const BACKFILL_DAYS = 30;
// Dune can revise recent transfers; the last few days are re-fetched on every run.
const REFRESH_DAYS = 3;

export type FlowsRunResult = { fromDay: string; completeThrough: string | null; rowsWritten: number; credits: number | null; executionId: string };

export async function collectDuneFlows(nowMs = Date.now()): Promise<FlowsRunResult> {
  const db = getDb();
  const today = toDay(nowMs);
  const sync = db.prepare("SELECT first_day, complete_through_day FROM flows_sync WHERE source = ?").get(FLOWS_SOURCE) as
    | { first_day: number; complete_through_day: number }
    | undefined;
  const fromDay = sync && sync.complete_through_day >= today - BACKFILL_DAYS ? sync.complete_through_day - REFRESH_DAYS + 1 : today - BACKFILL_DAYS;

  const { rows, credits, executionId } = await runDuneSql(exchangeFlowsSql(dayToIso(fromDay), dayToIso(today)));

  // A day is complete only once Dune has ingested transfers up to its last second.
  const dataThroughMs = rows.reduce((max, r) => Math.max(max, Date.parse(String(r.data_through).replace(" UTC", "Z").replace(" ", "T"))), 0);
  const lastComplete = Math.min(today - 1, toDay(dataThroughMs + 1000) - 1);

  const venueByDuneName = new Map<string, string>(DUNE_TRACKED_VENUES.map((v) => [v.duneName, v.id]));
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const venue = venueByDuneName.get(String(r.cex));
    if (venue) byKey.set(`${venue}|${r.asset}|${toDay(Date.parse(`${r.day}T00:00:00Z`))}`, r);
  }

  const upsert = db.prepare(
    `INSERT INTO exchange_flows_daily (venue, asset, network, day, inflow_ext, inflow_cex, outflow_ext, outflow_cex, internal, legs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (venue, asset, network, day) DO UPDATE SET inflow_ext = excluded.inflow_ext, inflow_cex = excluded.inflow_cex,
       outflow_ext = excluded.outflow_ext, outflow_cex = excluded.outflow_cex, internal = excluded.internal, legs = excluded.legs`
  );
  let rowsWritten = 0;
  transaction(() => {
    // Every (venue, token, day) in the complete range gets a row; no row from Dune means no transfers that day.
    for (let day = fromDay; day <= lastComplete; day++) {
      for (const v of DUNE_TRACKED_VENUES) {
        for (const tok of DUNE_TOKENS) {
          const r = byKey.get(`${v.id}|${tok.asset}|${day}`);
          const n = (k: string) => (r ? Number(r[k]) || 0 : 0);
          upsert.run(v.id, tok.asset, NETWORK, day, n("inflow_ext"), n("inflow_cex"), n("outflow_ext"), n("outflow_cex"), n("internal"), n("legs"));
          rowsWritten++;
        }
      }
    }
  });

  if (lastComplete >= fromDay) {
    db.prepare(
      `INSERT INTO flows_sync (source, first_day, complete_through_day, data_through_ms, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (source) DO UPDATE SET
         first_day = min(flows_sync.first_day, excluded.first_day),
         complete_through_day = max(flows_sync.complete_through_day, excluded.complete_through_day),
         data_through_ms = excluded.data_through_ms, updated_at = excluded.updated_at`
    ).run(FLOWS_SOURCE, fromDay, lastComplete, dataThroughMs, nowMs);
  }

  return { fromDay: dayToIso(fromDay), completeThrough: lastComplete >= fromDay ? dayToIso(lastComplete) : null, rowsWritten, credits, executionId };
}

export function flowsCollectionDue(nowMs: number): boolean {
  const row = getDb().prepare("SELECT complete_through_day FROM flows_sync WHERE source = ?").get(FLOWS_SOURCE) as { complete_through_day: number } | undefined;
  return !row || row.complete_through_day < toDay(nowMs) - 1;
}


import "server-only";
import { runDuneSql } from "@/lib/exchangeFlows/duneClient";
import { bitcoinFlowsSql, DUNE_BITCOIN_VENUES, DUNE_TOKENS, DUNE_TRACKED_VENUES, exchangeFlowsSql } from "@/lib/exchangeFlows/duneSql";
import { BITCOIN_EXTRA_LABELS, ETHEREUM_EXTRA_LABELS, LABELS_VERSION } from "@/lib/exchangeFlows/porLabels";
import { dayToIso, getDb, toDay, transaction } from "@/lib/store/db";

const BACKFILL_DAYS = 30;
// Dune can revise recent transfers; the last few days are re-fetched on every run.
const REFRESH_DAYS = 3;

export type FlowsNetwork = "ethereum" | "bitcoin";

type FlowSource = {
  network: FlowsNetwork;
  venues: readonly { id: string; duneName: string }[];
  assets: readonly string[];
  // One Dune query per entry; Bitcoin's UTXO rules are evaluated per exchange.
  queries: (fromIso: string, toIso: string) => string[];
};

const SOURCES: Record<FlowsNetwork, FlowSource> = {
  ethereum: {
    network: "ethereum",
    venues: DUNE_TRACKED_VENUES,
    assets: DUNE_TOKENS.map((t) => t.asset),
    queries: (from, to) => [exchangeFlowsSql(from, to, ETHEREUM_EXTRA_LABELS)],
  },
  bitcoin: {
    network: "bitcoin",
    venues: DUNE_BITCOIN_VENUES,
    assets: ["BTC"],
    // Every venue's query gets all published wallets, so transfers between tracked exchanges are recognised.
    queries: (from, to) => DUNE_BITCOIN_VENUES.map((v) => bitcoinFlowsSql(v.duneName, from, to, BITCOIN_EXTRA_LABELS)),
  },
};

export const FLOW_NETWORKS: FlowsNetwork[] = ["ethereum", "bitcoin"];

// The label version is part of the key, so publishing new reserve wallets
// starts a fresh backfill instead of mixing old and new coverage.
export function flowsSourceKey(network: FlowsNetwork): string {
  return `dune:${network}:${LABELS_VERSION}`;
}

export function trackedFlowVenues(network: FlowsNetwork): string[] {
  return SOURCES[network].venues.map((v) => v.id);
}

export type FlowsRunResult = { fromDay: string; completeThrough: string | null; rowsWritten: number; credits: number; executions: string[] };

export async function collectDuneFlows(network: FlowsNetwork, nowMs = Date.now()): Promise<FlowsRunResult> {
  const source = SOURCES[network];
  const key = flowsSourceKey(network);
  const db = getDb();
  const today = toDay(nowMs);
  const sync = db.prepare("SELECT first_day, complete_through_day FROM flows_sync WHERE source = ?").get(key) as
    | { first_day: number; complete_through_day: number }
    | undefined;
  const fromDay = sync && sync.complete_through_day >= today - BACKFILL_DAYS ? sync.complete_through_day - REFRESH_DAYS + 1 : today - BACKFILL_DAYS;

  const rows: Record<string, unknown>[] = [];
  let credits = 0;
  const executions: string[] = [];
  for (const sql of source.queries(dayToIso(fromDay), dayToIso(today))) {
    const r = await runDuneSql(sql);
    rows.push(...r.rows);
    credits += r.credits ?? 0;
    executions.push(r.executionId);
  }

  // A day is complete only once Dune has ingested data past its last second.
  const parseTs = (v: unknown) => Date.parse(String(v).replace(" UTC", "Z").replace(" ", "T"));
  const dataThroughMs = rows.reduce((max, r) => Math.max(max, parseTs(r.data_through) || 0), 0);
  const lastComplete = Math.min(today - 1, toDay(dataThroughMs + 1000) - 1);

  const venueByDuneName = new Map<string, string>(source.venues.map((v) => [v.duneName, v.id]));
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
    // Every (venue, asset, day) in the complete range gets a row; no row from Dune means no transfers that day.
    for (let day = fromDay; day <= lastComplete; day++) {
      for (const v of source.venues) {
        for (const asset of source.assets) {
          const r = byKey.get(`${v.id}|${asset}|${day}`);
          const n = (k: string) => (r ? Number(r[k]) || 0 : 0);
          upsert.run(v.id, asset, network, day, n("inflow_ext"), n("inflow_cex"), n("outflow_ext"), n("outflow_cex"), n("internal"), n("legs"));
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
    ).run(key, fromDay, lastComplete, dataThroughMs, nowMs);
  }

  return { fromDay: dayToIso(fromDay), completeThrough: lastComplete >= fromDay ? dayToIso(lastComplete) : null, rowsWritten, credits, executions };
}

export function flowsCollectionDue(network: FlowsNetwork, nowMs: number): boolean {
  const row = getDb().prepare("SELECT complete_through_day FROM flows_sync WHERE source = ?").get(flowsSourceKey(network)) as { complete_through_day: number } | undefined;
  return !row || row.complete_through_day < toDay(nowMs) - 1;
}

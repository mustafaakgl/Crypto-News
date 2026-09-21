import "server-only";
import { runDuneSql } from "@/lib/exchangeFlows/duneClient";
import { bitcoinFlowsSql, DUNE_BITCOIN_VENUES, DUNE_TOKENS, DUNE_TRACKED_VENUES, DUNE_TRON_VENUES, exchangeFlowsSql, tronUsdtFlowsSql } from "@/lib/exchangeFlows/duneSql";
import { BITCOIN_EXTRA_LABELS, ETHEREUM_EXTRA_LABELS, LABELS_VERSION, TRON_EXTRA_LABELS } from "@/lib/exchangeFlows/porLabels";
import { dayToIso, getDb, toDay, transaction } from "@/lib/store/db";

const BACKFILL_DAYS = 30;
// Dune can revise recent transfers; the last few days are re-fetched on every run.
const REFRESH_DAYS = 3;
// Older history is filled in afterwards, newest first, one chunk per run, up to
// the 1Y window. FLOWS_HISTORY_DAYS lowers it (e.g. to save Dune credits).
const HISTORY_CHUNK_DAYS = 30;
const HISTORY_DAYS = Math.min(365, Number(process.env.FLOWS_HISTORY_DAYS) || 365);

export type FlowsNetwork = "ethereum" | "bitcoin" | "tron";

type FlowSource = {
  network: FlowsNetwork;
  venues: readonly { id: string; duneName: string }[];
  assets: readonly string[];
  // One Dune query per entry; Bitcoin's UTXO rules are evaluated per exchange.
  queries: (fromIso: string, toIso: string, openEnded: boolean) => string[];
};

const SOURCES: Record<FlowsNetwork, FlowSource> = {
  ethereum: {
    network: "ethereum",
    venues: DUNE_TRACKED_VENUES,
    assets: DUNE_TOKENS.map((t) => t.asset),
    queries: (from, to, open) => [exchangeFlowsSql(from, to, ETHEREUM_EXTRA_LABELS, open)],
  },
  bitcoin: {
    network: "bitcoin",
    venues: DUNE_BITCOIN_VENUES,
    assets: ["BTC"],
    // Every venue's query gets all published wallets, so transfers between tracked exchanges are recognised.
    queries: (from, to, open) => DUNE_BITCOIN_VENUES.map((v) => bitcoinFlowsSql(v.duneName, from, to, BITCOIN_EXTRA_LABELS, open)),
  },
  tron: {
    network: "tron",
    venues: DUNE_TRON_VENUES,
    assets: ["USDT"],
    queries: (from, to, open) => [tronUsdtFlowsSql(from, to, TRON_EXTRA_LABELS, open)],
  },
};

export const FLOW_NETWORKS: FlowsNetwork[] = ["ethereum", "bitcoin", "tron"];

// Labels, tracked venues and assets are part of the key: new reserve wallets,
// a newly tracked exchange or asset start a fresh backfill instead of mixing coverage.
export function flowsSourceKey(network: FlowsNetwork): string {
  const { venues, assets } = SOURCES[network];
  return `dune:${network}:${LABELS_VERSION}:${venues.map((v) => v.id).join("+")}:${assets.join("+")}`;
}

export function trackedFlowVenues(network: FlowsNetwork): string[] {
  return SOURCES[network].venues.map((v) => v.id);
}

export type FlowsRunResult = { fromDay: string; completeThrough: string | null; rowsWritten: number; credits: number; executions: string[] };

type Sync = { first_day: number; complete_through_day: number };

function readSync(key: string): Sync | undefined {
  return getDb().prepare("SELECT first_day, complete_through_day FROM flows_sync WHERE source = ?").get(key) as Sync | undefined;
}

async function runQueries(source: FlowSource, fromDay: number, toDayExclusive: number, openEnded: boolean) {
  const rows: Record<string, unknown>[] = [];
  let credits = 0;
  const executions: string[] = [];
  for (const sql of source.queries(dayToIso(fromDay), dayToIso(toDayExclusive), openEnded)) {
    const r = await runDuneSql(sql);
    rows.push(...r.rows);
    credits += r.credits ?? 0;
    executions.push(r.executionId);
  }
  return { rows, credits, executions };
}

// Every (venue, asset, day) in [fromDay, lastDay] gets a row; no row from Dune means no transfers that day.
function writeDays(source: FlowSource, rows: Record<string, unknown>[], fromDay: number, lastDay: number): number {
  const venueByDuneName = new Map<string, string>(source.venues.map((v) => [v.duneName, v.id]));
  const byKey = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const venue = venueByDuneName.get(String(r.cex));
    if (venue) byKey.set(`${venue}|${r.asset}|${toDay(Date.parse(`${r.day}T00:00:00Z`))}`, r);
  }
  const upsert = getDb().prepare(
    `INSERT INTO exchange_flows_daily (venue, asset, network, day, inflow_ext, inflow_cex, outflow_ext, outflow_cex, internal, legs)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (venue, asset, network, day) DO UPDATE SET inflow_ext = excluded.inflow_ext, inflow_cex = excluded.inflow_cex,
       outflow_ext = excluded.outflow_ext, outflow_cex = excluded.outflow_cex, internal = excluded.internal, legs = excluded.legs`
  );
  let rowsWritten = 0;
  for (let day = fromDay; day <= lastDay; day++) {
    for (const v of source.venues) {
      for (const asset of source.assets) {
        const r = byKey.get(`${v.id}|${asset}|${day}`);
        const n = (k: string) => (r ? Number(r[k]) || 0 : 0);
        upsert.run(v.id, asset, source.network, day, n("inflow_ext"), n("inflow_cex"), n("outflow_ext"), n("outflow_cex"), n("internal"), n("legs"));
        rowsWritten++;
      }
    }
  }
  return rowsWritten;
}

export async function collectDuneFlows(network: FlowsNetwork, nowMs = Date.now()): Promise<FlowsRunResult> {
  const source = SOURCES[network];
  const key = flowsSourceKey(network);
  const db = getDb();
  const today = toDay(nowMs);
  const sync = readSync(key);
  // Too far behind to refresh (e.g. the server was down for weeks): start over, so no gap hides inside the stored range.
  const restart = !sync || sync.complete_through_day < today - BACKFILL_DAYS;
  const fromDay = restart ? today - BACKFILL_DAYS : sync.complete_through_day - REFRESH_DAYS + 1;

  const { rows, credits, executions } = await runQueries(source, fromDay, today, true);

  // A day is complete only once Dune has ingested data past its last second.
  const parseTs = (v: unknown) => Date.parse(String(v).replace(" UTC", "Z").replace(" ", "T"));
  const dataThroughMs = rows.reduce((max, r) => Math.max(max, parseTs(r.data_through) || 0), 0);
  const lastComplete = Math.min(today - 1, toDay(dataThroughMs + 1000) - 1);

  let rowsWritten = 0;
  transaction(() => {
    rowsWritten = writeDays(source, rows, fromDay, lastComplete);
    if (lastComplete < fromDay) return;
    db.prepare(
      `INSERT INTO flows_sync (source, first_day, complete_through_day, data_through_ms, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (source) DO UPDATE SET
         first_day = CASE WHEN ? THEN excluded.first_day ELSE min(flows_sync.first_day, excluded.first_day) END,
         complete_through_day = CASE WHEN ? THEN excluded.complete_through_day ELSE max(flows_sync.complete_through_day, excluded.complete_through_day) END,
         data_through_ms = excluded.data_through_ms, updated_at = excluded.updated_at`
    ).run(key, fromDay, lastComplete, dataThroughMs, nowMs, restart ? 1 : 0, restart ? 1 : 0);
  });

  return { fromDay: dayToIso(fromDay), completeThrough: lastComplete >= fromDay ? dayToIso(lastComplete) : null, rowsWritten, credits, executions };
}

// The oldest day the 1Y window (ending at the last complete day) needs.
function historyTarget(sync: Sync): number {
  return sync.complete_through_day - HISTORY_DAYS + 1;
}

// Fills in the next older chunk before the stored range; those days are long
// complete, so they're written as-is and only first_day moves.
export async function collectDuneFlowsHistory(network: FlowsNetwork): Promise<FlowsRunResult | null> {
  const source = SOURCES[network];
  const key = flowsSourceKey(network);
  const sync = readSync(key);
  if (!sync || sync.first_day <= historyTarget(sync)) return null;
  const toDayExclusive = sync.first_day;
  const fromDay = Math.max(historyTarget(sync), toDayExclusive - HISTORY_CHUNK_DAYS);

  const { rows, credits, executions } = await runQueries(source, fromDay, toDayExclusive, false);

  let rowsWritten = 0;
  transaction(() => {
    rowsWritten = writeDays(source, rows, fromDay, toDayExclusive - 1);
    // Guarded on first_day, so a forward restart that ran meanwhile isn't overwritten.
    getDb().prepare("UPDATE flows_sync SET first_day = ? WHERE source = ? AND first_day = ?").run(fromDay, key, toDayExclusive);
  });

  return { fromDay: dayToIso(fromDay), completeThrough: dayToIso(toDayExclusive - 1), rowsWritten, credits, executions };
}

export function flowsCollectionDue(network: FlowsNetwork, nowMs: number): boolean {
  const row = readSync(flowsSourceKey(network));
  return !row || row.complete_through_day < toDay(nowMs) - 1;
}

export function flowsHistoryPending(network: FlowsNetwork): boolean {
  const row = readSync(flowsSourceKey(network));
  return !!row && row.first_day > historyTarget(row);
}

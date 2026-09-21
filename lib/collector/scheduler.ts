import "server-only";
import { collectVenueDaily } from "@/lib/collector/cexDaily";
import { collectDexCandles } from "@/lib/collector/dexCandles";
import { collectDuneFlows, collectDuneFlowsHistory, FLOW_NETWORKS, flowsCollectionDue, flowsHistoryPending, flowsSourceKey, type FlowsNetwork } from "@/lib/collector/duneFlows";
import { duneConfigured } from "@/lib/exchangeFlows/duneClient";
import { CEX_VENUES, type CexVenueId } from "@/lib/exchangeVolume/venues";
import { getDb, toDay } from "@/lib/store/db";

const TICK_MS = 10 * 60 * 1000;
// Give exchanges a few minutes after 00:00 UTC to finalize the previous day's candle.
const DAILY_AFTER_MS = 15 * 60 * 1000;
const DEX_EVERY_MS = 60 * 60 * 1000;
// Dune ingests Ethereum transfers with some lag; before 01:00 UTC yesterday is rarely complete yet.
const FLOWS_AFTER_MS = 60 * 60 * 1000;

const INTERRUPTED = "interrupted by restart";

const running = new Set<string>();

function startRun(job: string, target: string | null): number {
  const r = getDb()
    .prepare("INSERT INTO collection_runs (job, target, started_at, status) VALUES (?, ?, ?, 'running')")
    .run(job, target, Date.now());
  return Number(r.lastInsertRowid);
}

function finishRun(id: number, status: "ok" | "partial" | "error", itemsOk: number, itemsFailed: number, rowsWritten: number, detail: string | null) {
  getDb()
    .prepare("UPDATE collection_runs SET finished_at = ?, status = ?, items_ok = ?, items_failed = ?, rows_written = ?, detail = ? WHERE id = ?")
    .run(Date.now(), status, itemsOk, itemsFailed, rowsWritten, detail, id);
}

async function runExclusive(key: string, fn: () => Promise<void>) {
  if (running.has(key)) return;
  running.add(key);
  try {
    await fn();
  } catch (err) {
    console.error(`[collector] ${key} failed:`, err);
  } finally {
    running.delete(key);
  }
}

function cexDue(venueId: CexVenueId, nowMs: number): boolean {
  if (nowMs % 86_400_000 < DAILY_AFTER_MS) return false;
  const row = getDb().prepare("SELECT complete_through_day FROM cex_venue_sync WHERE venue = ?").get(venueId) as { complete_through_day: number } | undefined;
  if (!row || row.complete_through_day < toDay(nowMs) - 1) {
    // Don't hammer a venue that keeps failing: at most one attempt per hour.
    const last = getDb()
      .prepare("SELECT started_at FROM collection_runs WHERE job = 'cex_daily' AND target = ? AND coalesce(detail, '') != ? ORDER BY started_at DESC LIMIT 1")
      .get(venueId, INTERRUPTED) as { started_at: number } | undefined;
    return !last || nowMs - last.started_at > 60 * 60 * 1000;
  }
  return false;
}

function dexDue(nowMs: number): boolean {
  const last = getDb()
    .prepare("SELECT started_at FROM collection_runs WHERE job = 'dex_candles' AND status IN ('ok', 'partial') ORDER BY started_at DESC LIMIT 1")
    .get() as { started_at: number } | undefined;
  return !last || nowMs - last.started_at >= DEX_EVERY_MS - 60_000;
}

// Each attempt costs Dune credits, so a day that isn't complete yet is retried at most hourly.
function flowsDue(network: FlowsNetwork, nowMs: number): boolean {
  if (!duneConfigured() || nowMs % 86_400_000 < FLOWS_AFTER_MS || !flowsCollectionDue(network, nowMs)) return false;
  const last = getDb()
    .prepare("SELECT started_at FROM collection_runs WHERE job = 'dune_flows' AND target = ? AND coalesce(detail, '') != ? ORDER BY started_at DESC LIMIT 1")
    .get(flowsSourceKey(network), INTERRUPTED) as { started_at: number } | undefined;
  return !last || nowMs - last.started_at > 60 * 60 * 1000;
}

// Once the recent days are current, older history is filled in one chunk per
// tick; after a failed run it waits an hour rather than spending credits on retries.
function flowsHistoryDue(network: FlowsNetwork, nowMs: number): boolean {
  if (!duneConfigured() || flowsCollectionDue(network, nowMs) || !flowsHistoryPending(network)) return false;
  const lastError = getDb()
    .prepare("SELECT started_at FROM collection_runs WHERE job = 'dune_flows_history' AND target = ? AND status = 'error' AND coalesce(detail, '') != ? ORDER BY started_at DESC LIMIT 1")
    .get(flowsSourceKey(network), INTERRUPTED) as { started_at: number } | undefined;
  return !lastError || nowMs - lastError.started_at > 60 * 60 * 1000;
}

function tick() {
  const nowMs = Date.now();
  for (const venue of CEX_VENUES) {
    if (!cexDue(venue.id, nowMs)) continue;
    // Venues run in parallel (different hosts); pairs within a venue run sequentially.
    void runExclusive(`cex:${venue.id}`, async () => {
      const id = startRun("cex_daily", venue.id);
      try {
        const r = await collectVenueDaily(venue.id);
        finishRun(id, r.pairsFailed === 0 ? "ok" : "partial", r.pairsListed - r.pairsFailed, r.pairsFailed, r.rowsWritten, r.errors.slice(0, 20).join("\n") || null);
        console.log(`[collector] ${venue.id}: ${r.rowsWritten} rows, ${r.pairsFailed}/${r.pairsListed} pairs failed, ${r.daysRecomputed} days totaled`);
      } catch (err) {
        finishRun(id, "error", 0, 0, 0, err instanceof Error ? err.message : String(err));
        throw err;
      }
    });
  }
  for (const network of FLOW_NETWORKS) {
    if (!flowsDue(network, nowMs)) {
      if (flowsHistoryDue(network, nowMs)) {
        void runExclusive(`dune_flows:${network}`, async () => {
          const id = startRun("dune_flows_history", flowsSourceKey(network));
          try {
            const r = await collectDuneFlowsHistory(network);
            const detail = r ? `credits=${r.credits.toFixed(3)} from=${r.fromDay} through=${r.completeThrough} executions=${r.executions.join(",")}` : "nothing to fill";
            finishRun(id, "ok", r?.rowsWritten ?? 0, 0, r?.rowsWritten ?? 0, detail);
            console.log(`[collector] dune flows history ${network}: ${detail}`);
          } catch (err) {
            finishRun(id, "error", 0, 0, 0, err instanceof Error ? err.message : String(err));
            throw err;
          }
        });
      }
      continue;
    }
    void runExclusive(`dune_flows:${network}`, async () => {
      // Target is the source key, so a new label version isn't held back by the old one's retry window.
      const id = startRun("dune_flows", flowsSourceKey(network));
      try {
        const r = await collectDuneFlows(network);
        const detail = `credits=${r.credits.toFixed(3)} from=${r.fromDay} through=${r.completeThrough ?? "none"} executions=${r.executions.join(",")}`;
        finishRun(id, r.completeThrough ? "ok" : "partial", r.rowsWritten, 0, r.rowsWritten, detail);
        console.log(`[collector] dune flows ${network}: ${detail}`);
      } catch (err) {
        finishRun(id, "error", 0, 0, 0, err instanceof Error ? err.message : String(err));
        throw err;
      }
    });
  }
  if (dexDue(nowMs)) {
    void runExclusive("dex", async () => {
      const id = startRun("dex_candles", null);
      const r = await collectDexCandles();
      finishRun(id, r.errors.length === 0 ? "ok" : "partial", 12 - r.errors.length, r.errors.length, r.rowsWritten, r.errors.join("\n") || null);
    });
  }
}

const globalForCollector = globalThis as unknown as { __collectorStarted?: boolean };

export function startCollector() {
  if (globalForCollector.__collectorStarted) return;
  globalForCollector.__collectorStarted = true;
  // Runs interrupted by a restart would otherwise stay "running" forever.
  getDb().prepare("UPDATE collection_runs SET status = 'error', detail = ?, finished_at = ? WHERE status = 'running'").run(INTERRUPTED, Date.now());
  console.log("[collector] started");
  tick();
  setInterval(tick, TICK_MS).unref();
}

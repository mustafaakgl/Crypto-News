import "server-only";
import { collectVenueDaily } from "@/lib/collector/cexDaily";
import { collectDexCandles } from "@/lib/collector/dexCandles";
import { CEX_VENUES, type CexVenueId } from "@/lib/exchangeVolume/venues";
import { getDb, toDay } from "@/lib/store/db";

const TICK_MS = 10 * 60 * 1000;
// Give exchanges a few minutes after 00:00 UTC to finalize the previous day's candle.
const DAILY_AFTER_MS = 15 * 60 * 1000;
const DEX_EVERY_MS = 60 * 60 * 1000;

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

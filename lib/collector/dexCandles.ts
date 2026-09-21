import "server-only";
import { RESOLUTION_MS } from "@/lib/exchangeVolume/adapters";
import type { Candle, CandleResolution } from "@/lib/exchangeVolume/types";
import { DEX_POOLS, fetchPoolCandles } from "@/lib/priceGap/dexPools";
import { GAP_ASSETS, type GapAsset } from "@/lib/priceGap/types";
import { getDb, transaction } from "@/lib/store/db";

const RESOLUTIONS: CandleResolution[] = ["1h", "1d"];

// Only buckets that have closed are stored, so a stored close never changes afterwards.
export async function collectDexCandles(nowMs = Date.now()): Promise<{ rowsWritten: number; errors: string[] }> {
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO dex_candles (asset, pool, resolution, start_ms, close) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (asset, pool, resolution, start_ms) DO UPDATE SET close = excluded.close`
  );
  let rowsWritten = 0;
  const errors: string[] = [];
  for (const asset of GAP_ASSETS) {
    for (const pool of DEX_POOLS[asset]) {
      for (const resolution of RESOLUTIONS) {
        try {
          const { candles } = await fetchPoolCandles(pool, resolution);
          const closed = candles.filter((c) => c.startMs + RESOLUTION_MS[resolution] <= nowMs);
          transaction(() => {
            for (const c of closed) insert.run(asset, pool.id, resolution, c.startMs, c.close);
          });
          rowsWritten += closed.length;
        } catch (err) {
          errors.push(`${asset} ${pool.id} ${resolution}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }
  return { rowsWritten, errors };
}

export function storedDexCandles(asset: GapAsset, poolId: string, resolution: CandleResolution, sinceMs: number): Candle[] {
  const rows = getDb()
    .prepare("SELECT start_ms, close FROM dex_candles WHERE asset = ? AND pool = ? AND resolution = ? AND start_ms >= ? ORDER BY start_ms")
    .all(asset, poolId, resolution, sinceMs) as { start_ms: number; close: number }[];
  return rows.map((r) => ({ startMs: r.start_ms, close: r.close, baseVolume: 0, quoteVolume: 0 }));
}

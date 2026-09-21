import "server-only";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

// One SQLite file on the server's disk; needs Node ≥ 22.13 (node:sqlite unflagged).
const DB_PATH = resolve(process.env.MARKET_DB_PATH ?? "data/market/market.db");

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- One completed UTC day per exchange pair. Zero-volume days aren't stored.
CREATE TABLE IF NOT EXISTS cex_daily (
  venue TEXT NOT NULL,
  symbol TEXT NOT NULL,
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  day INTEGER NOT NULL,          -- days since 1970-01-01 (UTC)
  close REAL NOT NULL,
  base_volume REAL NOT NULL,
  quote_volume REAL NOT NULL,    -- in the pair's quote currency
  PRIMARY KEY (venue, symbol, day)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS cex_daily_venue_day ON cex_daily (venue, day);

-- Per-venue USD totals per day, recomputed from cex_daily whenever that day's candles change.
CREATE TABLE IF NOT EXISTS cex_daily_totals (
  venue TEXT NOT NULL,
  day INTEGER NOT NULL,
  total_usd REAL NOT NULL,
  tracked_usd REAL NOT NULL,
  stable_swap_usd REAL NOT NULL,
  pairs INTEGER NOT NULL,
  pairs_unvalued INTEGER NOT NULL,
  PRIMARY KEY (venue, day)
) WITHOUT ROWID;

-- The contiguous day range each venue has been collected for with acceptable coverage.
CREATE TABLE IF NOT EXISTS cex_venue_sync (
  venue TEXT PRIMARY KEY,
  first_day INTEGER NOT NULL,
  complete_through_day INTEGER NOT NULL,
  pairs_listed INTEGER NOT NULL,
  pairs_failed INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS dex_candles (
  asset TEXT NOT NULL,
  pool TEXT NOT NULL,
  resolution TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  close REAL NOT NULL,
  PRIMARY KEY (asset, pool, resolution, start_ms)
) WITHOUT ROWID;

-- Exchange wallet flows per day, in token units (USDT/USDC ≈ USD). Same-exchange transfers are
-- kept only in \`internal\` and excluded from in/out; *_cex is the part whose other side is another exchange.
CREATE TABLE IF NOT EXISTS exchange_flows_daily (
  venue TEXT NOT NULL,
  asset TEXT NOT NULL,
  network TEXT NOT NULL,
  day INTEGER NOT NULL,
  inflow_ext REAL NOT NULL,
  inflow_cex REAL NOT NULL,
  outflow_ext REAL NOT NULL,
  outflow_cex REAL NOT NULL,
  internal REAL NOT NULL,
  legs INTEGER NOT NULL,
  PRIMARY KEY (venue, asset, network, day)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS flows_sync (
  source TEXT PRIMARY KEY,
  first_day INTEGER NOT NULL,
  complete_through_day INTEGER NOT NULL,
  data_through_ms INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job TEXT NOT NULL,
  target TEXT,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  status TEXT NOT NULL,          -- running | ok | partial | error
  items_ok INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  rows_written INTEGER NOT NULL DEFAULT 0,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS collection_runs_job ON collection_runs (job, target, started_at);
`;

const globalForDb = globalThis as unknown as { __marketDb?: DatabaseSync };

// Readers use this to avoid creating an empty database on a server that never enabled collection.
export function hasDb(): boolean {
  return Boolean(globalForDb.__marketDb) || existsSync(DB_PATH);
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__marketDb) {
    mkdirSync(dirname(DB_PATH), { recursive: true });
    const db = new DatabaseSync(DB_PATH);
    db.exec(SCHEMA);
    globalForDb.__marketDb = db;
  }
  return globalForDb.__marketDb;
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export const DAY_MS = 86_400_000;
export const toDay = (ms: number) => Math.floor(ms / DAY_MS);
export const dayToIso = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

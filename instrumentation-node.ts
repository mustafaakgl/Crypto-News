// Background data collection inside the Node.js server process. Opt-in via
// COLLECTOR_ENABLED=1 so a local `next dev` doesn't start a ~1-hour,
// ~15,000-request backfill unless asked to. MARKET_DB_PATH overrides where
// the SQLite file lives (default: data/market/market.db).
import { startCollector } from "./lib/collector/scheduler";

if (process.env.COLLECTOR_ENABLED === "1") startCollector();

// Binance public market-data client (no API key — /api/v3/klines is a
// public, unauthenticated endpoint per Binance's market-data-only docs:
// https://developers.binance.com/en/docs/products/spot/faqs/market_data_only

export type Candle = {
  openTime: number; // ms, UTC
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // base asset volume (e.g. BTC)
  quoteVolume: number; // quote asset volume (e.g. USDT)
  closeTime: number; // ms, UTC
};

export type Asset = "BTC" | "ETH";
export type Interval = "1h" | "4h" | "1d";

export const ASSETS: Asset[] = ["BTC", "ETH"];
export const INTERVALS: Interval[] = ["1h", "4h", "1d"];

export const SYMBOL_BY_ASSET: Record<Asset, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

const INTERVAL_MS: Record<Interval, number> = {
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export function isAsset(value: string | null): value is Asset {
  return !!value && (ASSETS as string[]).includes(value);
}

export function isInterval(value: string | null): value is Interval {
  return !!value && (INTERVALS as string[]).includes(value);
}

const LIMIT = 300;
const REVALIDATE_SECONDS = 300;
// If the most recent closed candle is older than this many interval-lengths,
// the feed is treated as stale (Binance outage, or our fetch cache serving
// something that fell behind).
const STALE_INTERVAL_MULTIPLIER = 3;

function toNumber(value: unknown): number {
  const n = typeof value === "string" ? Number(value) : NaN;
  return n;
}

// Parses one raw Binance kline row. Returns null (rather than throwing) for
// a malformed row so one bad entry doesn't take down the whole batch.
export function parseKlineRow(row: unknown): Candle | null {
  if (!Array.isArray(row) || row.length < 8) return null;
  const [openTime, open, high, low, close, volume, closeTime, quoteVolume] = row;

  const candle: Candle = {
    openTime: Number(openTime),
    open: toNumber(open),
    high: toNumber(high),
    low: toNumber(low),
    close: toNumber(close),
    volume: toNumber(volume),
    quoteVolume: toNumber(quoteVolume),
    closeTime: Number(closeTime),
  };

  const values = [candle.openTime, candle.open, candle.high, candle.low, candle.close, candle.volume, candle.quoteVolume, candle.closeTime];
  if (values.some((v) => typeof v !== "number" || !isFinite(v))) return null;
  if (candle.open < 0 || candle.high < 0 || candle.low < 0 || candle.close < 0) return null;
  if (candle.volume < 0 || candle.quoteVolume < 0) return null;
  if (candle.high < candle.low) return null;
  if (candle.closeTime <= candle.openTime) return null;

  return candle;
}

// Sorts ascending by openTime, drops duplicate opens, drops anything malformed.
// Never fabricates a candle to fill a gap — a gap is just left as a gap.
export function cleanCandles(raw: unknown[]): Candle[] {
  const parsed = raw.map(parseKlineRow).filter((c): c is Candle => c !== null);
  parsed.sort((a, b) => a.openTime - b.openTime);

  const deduped: Candle[] = [];
  let lastOpenTime: number | null = null;
  for (const candle of parsed) {
    if (candle.openTime === lastOpenTime) continue; // duplicate open, skip
    deduped.push(candle);
    lastOpenTime = candle.openTime;
  }
  return deduped;
}

// Only candles whose close time has actually passed count as "closed" —
// the most recent entry Binance returns is usually still forming.
export function splitClosed(candles: Candle[], nowMs: number): Candle[] {
  return candles.filter((c) => c.closeTime <= nowMs);
}

export type KlinesResult = {
  asset: Asset;
  interval: Interval;
  pair: string; // e.g. "BTC/USDT"
  source: "Binance";
  candles: Candle[]; // closed candles only, ascending
  lastClosedAt: number | null; // ms, UTC — real data time, not fetch time
  stale: boolean;
  error: string | null;
};

export async function fetchKlines(asset: Asset, interval: Interval): Promise<KlinesResult> {
  const symbol = SYMBOL_BY_ASSET[asset];
  const pair = `${asset}/USDT`;
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${LIMIT}`;

  const empty = (error: string): KlinesResult => ({
    asset,
    interval,
    pair,
    source: "Binance",
    candles: [],
    lastClosedAt: null,
    stale: false,
    error,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    return empty(err instanceof Error ? err.message : "network error");
  }

  if (res.status === 429 || res.status === 418) {
    return empty("Binance rate limit reached — please try again shortly.");
  }
  if (!res.ok) {
    return empty(`Binance API error (HTTP ${res.status}).`);
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch {
    return empty("Could not parse Binance response.");
  }
  if (!Array.isArray(raw)) {
    return empty("Unexpected Binance response shape.");
  }

  const cleaned = cleanCandles(raw);
  const closed = splitClosed(cleaned, Date.now());

  if (closed.length === 0) {
    return empty("No closed candles returned.");
  }

  const lastClosedAt = closed[closed.length - 1].closeTime;
  const stale = Date.now() - lastClosedAt > INTERVAL_MS[interval] * STALE_INTERVAL_MULTIPLIER;

  return {
    asset,
    interval,
    pair,
    source: "Binance",
    candles: closed,
    lastClosedAt,
    stale,
    error: null,
  };
}

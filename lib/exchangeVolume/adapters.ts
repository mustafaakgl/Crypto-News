import "server-only";
import { fetchJson, type PacedOptions } from "@/lib/httpClient";
import { toTrackedPair } from "@/lib/exchangeVolume/aggregate";
import { TtlCache } from "@/lib/rag/cache";
import type { Candle, CandleResolution, PairRef } from "@/lib/exchangeVolume/types";
import type { CexVenueId } from "@/lib/exchangeVolume/venues";

export type Instrument = { base: string; quote: string; symbol: string };
export type RawTicker = { symbol: string; last: number; quoteVolume: number };

export type VenueAdapter = {
  pace: PacedOptions;
  // Every spot instrument, with asset codes normalized (uppercase, Kraken's XBT → BTC).
  listInstruments(): Promise<Instrument[]>;
  // Rolling-24h snapshot of every spot pair in one call; quoteVolume is in the pair's quote currency.
  fetchTickers24h(): Promise<RawTicker[]>;
  // Candles whose start is at or after sinceMs, UTC-aligned; may include the in-progress bucket.
  fetchCandles(symbol: string, resolution: CandleResolution, sinceMs: number, nowMs: number): Promise<Candle[]>;
};

export const RESOLUTION_MS: Record<CandleResolution, number> = { "1h": 3_600_000, "1d": 86_400_000 };

// Instrument lists can be several MB — too large for Next's fetch cache — so
// they're fetched uncached here and cached in memory instead.
const LIST_REVALIDATE = 0;
const CANDLE_REVALIDATE: Record<CandleResolution, number> = { "1h": 300, "1d": 3600 };
const PAIR_LIST_TTL_MS = 24 * 60 * 60 * 1000;

class AdapterError extends Error {}

async function getJson(url: string, label: string, revalidate: number, pace: PacedOptions): Promise<unknown> {
  const result = await fetchJson(url, label, revalidate, pace);
  if (!result.ok) throw new AdapterError(result.error);
  return result.data;
}

function rec(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") throw new AdapterError("unexpected response shape");
  return v as Record<string, unknown>;
}

function arr(v: unknown): unknown[] {
  if (!Array.isArray(v)) throw new AdapterError("unexpected response shape");
  return v;
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!isFinite(n)) throw new AdapterError("non-numeric field in response");
  return n;
}

function normalizeAsset(code: string): string {
  const u = code.toUpperCase();
  return u === "XBT" ? "BTC" : u;
}

function pairsFrom<T>(items: T[], pick: (item: T) => { base: string; quote: string; symbol: string } | null): Instrument[] {
  const out: Instrument[] = [];
  for (const item of items) {
    const raw = pick(item);
    if (raw) out.push({ base: normalizeAsset(raw.base), quote: normalizeAsset(raw.quote), symbol: raw.symbol });
  }
  return out;
}

// Row arrays of [timestamp, ...] where the timestamp unit and the close /
// base-volume columns differ per exchange.
function candlesFromRows(rows: unknown[], tsUnit: "ms" | "s", closeIndex: number, volIndex: number): Candle[] {
  return rows.map((r) => {
    const row = arr(r);
    return { startMs: num(row[0]) * (tsUnit === "s" ? 1000 : 1), close: num(row[closeIndex]), baseVolume: num(row[volIndex]) };
  });
}

function dedupe(candles: Candle[]): Candle[] {
  const byStart = new Map<number, Candle>();
  for (const c of candles) byStart.set(c.startMs, c);
  return [...byStart.values()].sort((a, b) => a.startMs - b.startMs);
}

// For APIs that return a fixed-size page ending at a cursor: walks backwards
// until the oldest candle reaches sinceMs or a short page signals the start of history.
async function pageBackward(
  pageSize: number,
  sinceMs: number,
  nowMs: number,
  resolution: CandleResolution,
  fetchPage: (cursor: number | null) => Promise<Candle[]>
): Promise<Candle[]> {
  const maxPages = Math.ceil((nowMs - sinceMs) / RESOLUTION_MS[resolution] / pageSize) + 1;
  const out: Candle[] = [];
  let cursor: number | null = null;
  for (let page = 0; page < maxPages; page++) {
    const batch = await fetchPage(cursor);
    if (batch.length === 0) break;
    out.push(...batch);
    const oldest = Math.min(...batch.map((c) => c.startMs));
    if (oldest <= sinceMs || batch.length < pageSize) break;
    cursor = oldest;
  }
  return dedupe(out);
}

// Illiquid or halted pairs can report null/empty prices; those are skipped, not fatal.
function tickersFrom<T>(items: T[], pick: (item: T) => { symbol: unknown; last: unknown; quoteVolume: unknown }): RawTicker[] {
  const out: RawTicker[] = [];
  for (const item of items) {
    const r = pick(item);
    const last = Number(r.last);
    const quoteVolume = Number(r.quoteVolume);
    if (typeof r.symbol === "string" && isFinite(last) && last > 0 && isFinite(quoteVolume) && quoteVolume >= 0) out.push({ symbol: r.symbol, last, quoteVolume });
  }
  return out;
}

const TICKER_REVALIDATE = 0;

const sec = (ms: number) => Math.floor(ms / 1000);

const binance: VenueAdapter = {
  pace: { key: "binance", minIntervalMs: 100 },
  async listInstruments() {
    const data = rec(await getJson("https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT", "Binance symbols", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.symbols), (s) => {
      const o = rec(s);
      return o.status === "TRADING" ? { base: String(o.baseAsset), quote: String(o.quoteAsset), symbol: String(o.symbol) } : null;
    });
  },
  async fetchTickers24h() {
    const data = arr(await getJson("https://api.binance.com/api/v3/ticker/24hr", "Binance 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(data, (t) => {
      const o = rec(t);
      return { symbol: o.symbol, last: o.lastPrice, quoteVolume: o.quoteVolume };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs) {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${resolution}&startTime=${sinceMs}&limit=1000`;
    return dedupe(candlesFromRows(arr(await getJson(url, `Binance klines ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)), "ms", 4, 5));
  },
};

// OKX's default "1D" bar is aligned to UTC+8; "1Dutc" is the UTC one.
const okx: VenueAdapter = {
  pace: { key: "okx", minIntervalMs: 120 },
  async listInstruments() {
    const data = rec(await getJson("https://www.okx.com/api/v5/public/instruments?instType=SPOT", "OKX instruments", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.state === "live" ? { base: String(o.baseCcy), quote: String(o.quoteCcy), symbol: String(o.instId) } : null;
    });
  },
  // For SPOT, volCcy24h is the 24h volume in the quote currency.
  async fetchTickers24h() {
    const data = rec(await getJson("https://www.okx.com/api/v5/market/tickers?instType=SPOT", "OKX 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(arr(data.data), (t) => {
      const o = rec(t);
      return { symbol: o.instId, last: o.last, quoteVolume: o.volCcy24h };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const bar = resolution === "1h" ? "1H" : "1Dutc";
    return pageBackward(100, sinceMs, nowMs, resolution, async (cursor) => {
      const url = `https://www.okx.com/api/v5/market/history-candles?instId=${symbol}&bar=${bar}&limit=100${cursor ? `&after=${cursor}` : ""}`;
      return candlesFromRows(arr(rec(await getJson(url, `OKX candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)).data), "ms", 4, 5);
    });
  },
};

// Coinbase caps a candles request at 300 buckets.
const coinbase: VenueAdapter = {
  pace: { key: "coinbase", minIntervalMs: 150 },
  async listInstruments() {
    const data = arr(await getJson("https://api.exchange.coinbase.com/products", "Coinbase products", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      return o.status === "online" && !o.trading_disabled ? { base: String(o.base_currency), quote: String(o.quote_currency), symbol: String(o.id) } : null;
    });
  },
  // /products/stats reports base volume only, so quote volume is approximated as base volume × last price.
  async fetchTickers24h() {
    const data = rec(await getJson("https://api.exchange.coinbase.com/products/stats", "Coinbase 24h stats", TICKER_REVALIDATE, this.pace));
    return tickersFrom(Object.entries(data), ([id, v]) => {
      const s24 = rec(rec(v).stats_24hour);
      return { symbol: id, last: s24.last, quoteVolume: Number(s24.volume) * Number(s24.last) };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const step = RESOLUTION_MS[resolution];
    const out: Candle[] = [];
    for (let start = sinceMs; start <= nowMs; start += 300 * step) {
      const end = Math.min(start + 299 * step, nowMs);
      const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=${step / 1000}&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`;
      out.push(...candlesFromRows(arr(await getJson(url, `Coinbase candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)), "s", 4, 5));
    }
    return dedupe(out);
  },
};

const bybit: VenueAdapter = {
  pace: { key: "bybit", minIntervalMs: 100 },
  async listInstruments() {
    const data = rec(await getJson("https://api.bybit.com/v5/market/instruments-info?category=spot", "Bybit instruments", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(rec(data.result).list), (s) => {
      const o = rec(s);
      return o.status === "Trading" ? { base: String(o.baseCoin), quote: String(o.quoteCoin), symbol: String(o.symbol) } : null;
    });
  },
  async fetchTickers24h() {
    const data = rec(await getJson("https://api.bybit.com/v5/market/tickers?category=spot", "Bybit 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(arr(rec(data.result).list), (t) => {
      const o = rec(t);
      return { symbol: o.symbol, last: o.lastPrice, quoteVolume: o.turnover24h };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs) {
    const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${resolution === "1h" ? "60" : "D"}&start=${sinceMs}&limit=1000`;
    const data = rec(await getJson(url, `Bybit klines ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace));
    return dedupe(candlesFromRows(arr(rec(data.result).list), "ms", 4, 5));
  },
};

// Upbit markets are "QUOTE-BASE". Its `timestamp` field is the last trade
// time, not the candle start — candle_date_time_utc is the bucket start.
const upbit: VenueAdapter = {
  pace: { key: "upbit", minIntervalMs: 150 },
  async listInstruments() {
    const data = arr(await getJson("https://api.upbit.com/v1/market/all", "Upbit markets", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const market = String(rec(s).market);
      const [quote, base] = market.split("-");
      return quote && base ? { base, quote, symbol: market } : null;
    });
  },
  async fetchTickers24h() {
    const data = arr(await getJson("https://api.upbit.com/v1/ticker/all?quote_currencies=KRW,BTC,USDT", "Upbit 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(data, (t) => {
      const o = rec(t);
      return { symbol: o.market, last: o.trade_price, quoteVolume: o.acc_trade_price_24h };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const path = resolution === "1h" ? "candles/minutes/60" : "candles/days";
    return pageBackward(200, sinceMs, nowMs, resolution, async (cursor) => {
      const to = cursor ? `&to=${encodeURIComponent(new Date(cursor).toISOString().replace(".000Z", "Z"))}` : "";
      const rows = arr(await getJson(`https://api.upbit.com/v1/${path}?market=${symbol}&count=200${to}`, `Upbit candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace));
      return rows.map((r) => {
        const o = rec(r);
        const start = Date.parse(`${String(o.candle_date_time_utc)}Z`);
        if (!isFinite(start)) throw new AdapterError("bad Upbit candle date");
        return { startMs: start, close: num(o.trade_price), baseVolume: num(o.candle_acc_trade_volume) };
      });
    });
  },
};

// Kraken's public limit is roughly one request per second; OHLC returns at most the latest 720 rows.
const kraken: VenueAdapter = {
  pace: { key: "kraken", minIntervalMs: 1100 },
  async listInstruments() {
    const data = rec(await getJson("https://api.kraken.com/0/public/AssetPairs", "Kraken asset pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(Object.entries(rec(data.result)), ([key, v]) => {
      const o = rec(v);
      if (typeof o.wsname !== "string" || (o.status !== undefined && o.status !== "online")) return null;
      const [base, quote] = o.wsname.split("/");
      return base && quote ? { base, quote, symbol: key } : null;
    });
  },
  // v[1] is the last-24h base volume and p[1] the last-24h VWAP.
  async fetchTickers24h() {
    const data = rec(await getJson("https://api.kraken.com/0/public/Ticker", "Kraken 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(Object.entries(rec(data.result)), ([key, v]) => {
      const o = rec(v);
      const c = Array.isArray(o.c) ? o.c : [];
      const vol = Array.isArray(o.v) ? o.v : [];
      const vwap = Array.isArray(o.p) ? o.p : [];
      return { symbol: key, last: c[0], quoteVolume: Number(vol[1]) * Number(vwap[1]) };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs) {
    const interval = resolution === "1h" ? 60 : 1440;
    const url = `https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=${interval}&since=${sec(sinceMs) - 1}`;
    const data = rec(await getJson(url, `Kraken OHLC ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace));
    if (Array.isArray(data.error) && data.error.length > 0) throw new AdapterError(`Kraken OHLC ${symbol}: ${data.error.join(", ")}`);
    const result = rec(data.result);
    const key = Object.keys(result).find((k) => k !== "last");
    if (!key) return [];
    return dedupe(candlesFromRows(arr(result[key]), "s", 4, 6));
  },
};

const kucoin: VenueAdapter = {
  pace: { key: "kucoin", minIntervalMs: 150 },
  async listInstruments() {
    const data = rec(await getJson("https://api.kucoin.com/api/v2/symbols", "KuCoin symbols", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.enableTrading ? { base: String(o.baseCurrency), quote: String(o.quoteCurrency), symbol: String(o.symbol) } : null;
    });
  },
  async fetchTickers24h() {
    const data = rec(await getJson("https://api.kucoin.com/api/v1/market/allTickers", "KuCoin 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(arr(rec(data.data).ticker), (t) => {
      const o = rec(t);
      return { symbol: o.symbol, last: o.last, quoteVolume: o.volValue };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const url = `https://api.kucoin.com/api/v1/market/candles?type=${resolution === "1h" ? "1hour" : "1day"}&symbol=${symbol}&startAt=${sec(sinceMs)}&endAt=${sec(nowMs)}`;
    return dedupe(candlesFromRows(arr(rec(await getJson(url, `KuCoin candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)).data), "s", 2, 5));
  },
};

const gate: VenueAdapter = {
  pace: { key: "gate", minIntervalMs: 120 },
  async listInstruments() {
    const data = arr(await getJson("https://api.gateio.ws/api/v4/spot/currency_pairs", "Gate currency pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      return o.trade_status === "tradable" ? { base: String(o.base), quote: String(o.quote), symbol: String(o.id) } : null;
    });
  },
  async fetchTickers24h() {
    const data = arr(await getJson("https://api.gateio.ws/api/v4/spot/tickers", "Gate 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(data, (t) => {
      const o = rec(t);
      return { symbol: o.currency_pair, last: o.last, quoteVolume: o.quote_volume };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const url = `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=${resolution}&from=${sec(sinceMs)}&to=${sec(nowMs)}`;
    return dedupe(candlesFromRows(arr(await getJson(url, `Gate candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)), "s", 2, 6));
  },
};

// Bitget's "1Dutc" is UTC-aligned; history-candles returns at most 200 rows
// per call, and its endTime is compared against candle close, so passing
// the oldest start returns the bucket before it.
const bitget: VenueAdapter = {
  pace: { key: "bitget", minIntervalMs: 350 },
  async listInstruments() {
    const data = rec(await getJson("https://api.bitget.com/api/v2/spot/public/symbols", "Bitget symbols", LIST_REVALIDATE, this.pace));
    // areaSymbol "yes" is Bitget's separate zone, ~2,100 tokenized US stocks (rNKE, rHCA, …) that
    // reported ~$96B/24h in 2026-09 against ~$1.4B for all its crypto pairs — not crypto trading.
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.status === "online" && o.areaSymbol !== "yes" ? { base: String(o.baseCoin), quote: String(o.quoteCoin), symbol: String(o.symbol) } : null;
    });
  },
  async fetchTickers24h() {
    const data = rec(await getJson("https://api.bitget.com/api/v2/spot/market/tickers", "Bitget 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(arr(data.data), (t) => {
      const o = rec(t);
      return { symbol: o.symbol, last: o.lastPr, quoteVolume: o.quoteVolume };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs, nowMs) {
    const granularity = resolution === "1h" ? "1h" : "1Dutc";
    return pageBackward(200, sinceMs, nowMs, resolution, async (cursor) => {
      const url = `https://api.bitget.com/api/v2/spot/market/history-candles?symbol=${symbol}&granularity=${granularity}&endTime=${cursor ?? nowMs}&limit=200`;
      return candlesFromRows(arr(rec(await getJson(url, `Bitget candles ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace)).data), "ms", 4, 5);
    });
  },
};

const bitstamp: VenueAdapter = {
  pace: { key: "bitstamp", minIntervalMs: 150 },
  async listInstruments() {
    const data = arr(await getJson("https://www.bitstamp.net/api/v2/trading-pairs-info/", "Bitstamp pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      if (o.trading !== "Enabled" || typeof o.name !== "string") return null;
      const [base, quote] = o.name.split("/");
      return base && quote ? { base, quote, symbol: String(o.url_symbol) } : null;
    });
  },
  // The ticker is keyed by "BTC/USD"; instruments by url_symbol "btcusd".
  async fetchTickers24h() {
    const data = arr(await getJson("https://www.bitstamp.net/api/v2/ticker/", "Bitstamp 24h tickers", TICKER_REVALIDATE, this.pace));
    return tickersFrom(data, (t) => {
      const o = rec(t);
      return { symbol: String(o.pair).replace("/", "").toLowerCase(), last: o.last, quoteVolume: Number(o.volume) * Number(o.vwap) };
    });
  },
  async fetchCandles(symbol, resolution, sinceMs) {
    const url = `https://www.bitstamp.net/api/v2/ohlc/${symbol}/?step=${RESOLUTION_MS[resolution] / 1000}&limit=1000&start=${sec(sinceMs)}`;
    const data = rec(await getJson(url, `Bitstamp OHLC ${symbol}`, CANDLE_REVALIDATE[resolution], this.pace));
    return dedupe(
      arr(rec(data.data).ohlc).map((r) => {
        const o = rec(r);
        return { startMs: num(o.timestamp) * 1000, close: num(o.close), baseVolume: num(o.volume) };
      })
    );
  },
};

export const ADAPTERS: Record<CexVenueId, VenueAdapter> = { binance, okx, coinbase, bybit, upbit, kraken, kucoin, gate, bitget, bitstamp };

const instrumentCache = new TtlCache<Instrument[]>();

export async function getVenueInstruments(venueId: CexVenueId): Promise<Instrument[]> {
  const cached = instrumentCache.get(venueId);
  if (cached) return cached;
  const instruments = await ADAPTERS[venueId].listInstruments();
  if (instruments.length > 0) instrumentCache.set(venueId, instruments, PAIR_LIST_TTL_MS);
  return instruments;
}

export async function getVenuePairs(venueId: CexVenueId): Promise<PairRef[]> {
  const out: PairRef[] = [];
  for (const i of await getVenueInstruments(venueId)) {
    const tracked = toTrackedPair(i.base, i.quote);
    if (tracked) out.push({ ...tracked, symbol: i.symbol });
  }
  return out;
}

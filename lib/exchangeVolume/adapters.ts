import "server-only";
import { fetchJson, type PacedOptions } from "@/lib/httpClient";
import { DAY_MS, toTrackedPair } from "@/lib/exchangeVolume/aggregate";
import type { DailyCandle, PairRef } from "@/lib/exchangeVolume/types";
import type { CexVenueId } from "@/lib/exchangeVolume/venues";

export type VenueAdapter = {
  pace: PacedOptions;
  listPairs(): Promise<PairRef[]>;
  // Candles from sinceMs onwards (UTC-day aligned); may include today's in-progress day.
  fetchDaily(symbol: string, sinceMs: number, nowMs: number): Promise<DailyCandle[]>;
};

// Instrument lists can be several MB — too large for Next's fetch cache — so
// they're fetched uncached here and cached in memory by the caller instead.
const LIST_REVALIDATE = 0;
const CANDLE_REVALIDATE = 3600;

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
  if (!isFinite(n)) throw new AdapterError("non-numeric field in candle");
  return n;
}

function pairsFrom<T>(items: T[], pick: (item: T) => { base: string; quote: string; symbol: string } | null): PairRef[] {
  const out: PairRef[] = [];
  for (const item of items) {
    const raw = pick(item);
    if (!raw) continue;
    const tracked = toTrackedPair(raw.base, raw.quote);
    if (tracked) out.push({ ...tracked, symbol: raw.symbol });
  }
  return out;
}

// Row arrays of [timestamp, ...] where the timestamp unit and base-volume
// column differ per exchange.
function candlesFromRows(rows: unknown[], tsIndex: number, tsUnit: "ms" | "s", volIndex: number): DailyCandle[] {
  return rows.map((r) => {
    const row = arr(r);
    const ts = num(row[tsIndex]) * (tsUnit === "s" ? 1000 : 1);
    return { dayStartMs: ts, baseVolume: num(row[volIndex]) };
  });
}

function dedupe(candles: DailyCandle[]): DailyCandle[] {
  const byDay = new Map<number, DailyCandle>();
  for (const c of candles) byDay.set(c.dayStartMs, c);
  return [...byDay.values()].sort((a, b) => a.dayStartMs - b.dayStartMs);
}

const sec = (ms: number) => Math.floor(ms / 1000);

const binance: VenueAdapter = {
  pace: { key: "binance", minIntervalMs: 100 },
  async listPairs() {
    const data = rec(await getJson("https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT", "Binance symbols", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.symbols), (s) => {
      const o = rec(s);
      return o.status === "TRADING" ? { base: String(o.baseAsset), quote: String(o.quoteAsset), symbol: String(o.symbol) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const rows = arr(await getJson(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1d&startTime=${sinceMs}&limit=1000`, `Binance klines ${symbol}`, CANDLE_REVALIDATE, this.pace));
    return candlesFromRows(rows, 0, "ms", 5);
  },
};

// OKX's default "1D" bar is aligned to UTC+8; "1Dutc" is the UTC one.
const okx: VenueAdapter = {
  pace: { key: "okx", minIntervalMs: 120 },
  async listPairs() {
    const data = rec(await getJson("https://www.okx.com/api/v5/public/instruments?instType=SPOT", "OKX instruments", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.state === "live" ? { base: String(o.baseCcy), quote: String(o.quoteCcy), symbol: String(o.instId) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const out: DailyCandle[] = [];
    let after = "";
    for (let page = 0; page < 6; page++) {
      const data = rec(await getJson(`https://www.okx.com/api/v5/market/history-candles?instId=${symbol}&bar=1Dutc&limit=100${after}`, `OKX candles ${symbol}`, CANDLE_REVALIDATE, this.pace));
      const batch = candlesFromRows(arr(data.data), 0, "ms", 5);
      if (batch.length === 0) break;
      out.push(...batch);
      const oldest = Math.min(...batch.map((c) => c.dayStartMs));
      if (oldest <= sinceMs) break;
      after = `&after=${oldest}`;
    }
    return dedupe(out);
  },
};

// Coinbase caps a candles request at 300 buckets.
const coinbase: VenueAdapter = {
  pace: { key: "coinbase", minIntervalMs: 150 },
  async listPairs() {
    const data = arr(await getJson("https://api.exchange.coinbase.com/products", "Coinbase products", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      return o.status === "online" && !o.trading_disabled ? { base: String(o.base_currency), quote: String(o.quote_currency), symbol: String(o.id) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs, nowMs) {
    const out: DailyCandle[] = [];
    for (let start = sinceMs; start <= nowMs; start += 300 * DAY_MS) {
      const end = Math.min(start + 299 * DAY_MS, nowMs);
      const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=86400&start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`;
      out.push(...candlesFromRows(arr(await getJson(url, `Coinbase candles ${symbol}`, CANDLE_REVALIDATE, this.pace)), 0, "s", 5));
    }
    return dedupe(out);
  },
};

const bybit: VenueAdapter = {
  pace: { key: "bybit", minIntervalMs: 100 },
  async listPairs() {
    const data = rec(await getJson("https://api.bybit.com/v5/market/instruments-info?category=spot", "Bybit instruments", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(rec(data.result).list), (s) => {
      const o = rec(s);
      return o.status === "Trading" ? { base: String(o.baseCoin), quote: String(o.quoteCoin), symbol: String(o.symbol) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const data = rec(await getJson(`https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=D&start=${sinceMs}&limit=1000`, `Bybit klines ${symbol}`, CANDLE_REVALIDATE, this.pace));
    return dedupe(candlesFromRows(arr(rec(data.result).list), 0, "ms", 5));
  },
};

// Upbit markets are "QUOTE-BASE". Its `timestamp` field is the last trade
// time, not the candle start — candle_date_time_utc is the UTC day.
const upbit: VenueAdapter = {
  pace: { key: "upbit", minIntervalMs: 150 },
  async listPairs() {
    const data = arr(await getJson("https://api.upbit.com/v1/market/all", "Upbit markets", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const market = String(rec(s).market);
      const [quote, base] = market.split("-");
      return quote && base ? { base, quote, symbol: market } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const out: DailyCandle[] = [];
    let to = "";
    for (let page = 0; page < 3; page++) {
      const rows = arr(await getJson(`https://api.upbit.com/v1/candles/days?market=${symbol}&count=200${to}`, `Upbit candles ${symbol}`, CANDLE_REVALIDATE, this.pace));
      const batch = rows.map((r) => {
        const o = rec(r);
        const day = Date.parse(`${String(o.candle_date_time_utc)}Z`);
        if (!isFinite(day)) throw new AdapterError("bad Upbit candle date");
        return { dayStartMs: day, baseVolume: num(o.candle_acc_trade_volume) };
      });
      if (batch.length === 0) break;
      out.push(...batch);
      const oldest = Math.min(...batch.map((c) => c.dayStartMs));
      if (oldest <= sinceMs || batch.length < 200) break;
      to = `&to=${encodeURIComponent(new Date(oldest).toISOString().replace(".000Z", "Z"))}`;
    }
    return dedupe(out);
  },
};

// Kraken's public limit is roughly one request per second; OHLC returns up to 720 rows.
const kraken: VenueAdapter = {
  pace: { key: "kraken", minIntervalMs: 1100 },
  async listPairs() {
    const data = rec(await getJson("https://api.kraken.com/0/public/AssetPairs", "Kraken asset pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(Object.entries(rec(data.result)), ([key, v]) => {
      const o = rec(v);
      if (typeof o.wsname !== "string" || (o.status !== undefined && o.status !== "online")) return null;
      const [base, quote] = o.wsname.split("/");
      return base && quote ? { base, quote, symbol: key } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const data = rec(await getJson(`https://api.kraken.com/0/public/OHLC?pair=${symbol}&interval=1440&since=${sec(sinceMs) - 1}`, `Kraken OHLC ${symbol}`, CANDLE_REVALIDATE, this.pace));
    if (Array.isArray(data.error) && data.error.length > 0) throw new AdapterError(`Kraken OHLC ${symbol}: ${data.error.join(", ")}`);
    const result = rec(data.result);
    const key = Object.keys(result).find((k) => k !== "last");
    if (!key) return [];
    return dedupe(candlesFromRows(arr(result[key]), 0, "s", 6));
  },
};

const kucoin: VenueAdapter = {
  pace: { key: "kucoin", minIntervalMs: 150 },
  async listPairs() {
    const data = rec(await getJson("https://api.kucoin.com/api/v2/symbols", "KuCoin symbols", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.enableTrading ? { base: String(o.baseCurrency), quote: String(o.quoteCurrency), symbol: String(o.symbol) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs, nowMs) {
    const data = rec(await getJson(`https://api.kucoin.com/api/v1/market/candles?type=1day&symbol=${symbol}&startAt=${sec(sinceMs)}&endAt=${sec(nowMs)}`, `KuCoin candles ${symbol}`, CANDLE_REVALIDATE, this.pace));
    return dedupe(candlesFromRows(arr(data.data), 0, "s", 5));
  },
};

const gate: VenueAdapter = {
  pace: { key: "gate", minIntervalMs: 120 },
  async listPairs() {
    const data = arr(await getJson("https://api.gateio.ws/api/v4/spot/currency_pairs", "Gate currency pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      return o.trade_status === "tradable" ? { base: String(o.base), quote: String(o.quote), symbol: String(o.id) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs, nowMs) {
    const rows = arr(await getJson(`https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${symbol}&interval=1d&from=${sec(sinceMs)}&to=${sec(nowMs)}`, `Gate candles ${symbol}`, CANDLE_REVALIDATE, this.pace));
    return dedupe(candlesFromRows(rows, 0, "s", 6));
  },
};

// Bitget's "1Dutc" is UTC-aligned; history-candles returns at most 200 rows per call.
const bitget: VenueAdapter = {
  pace: { key: "bitget", minIntervalMs: 350 },
  async listPairs() {
    const data = rec(await getJson("https://api.bitget.com/api/v2/spot/public/symbols", "Bitget symbols", LIST_REVALIDATE, this.pace));
    return pairsFrom(arr(data.data), (s) => {
      const o = rec(s);
      return o.status === "online" ? { base: String(o.baseCoin), quote: String(o.quoteCoin), symbol: String(o.symbol) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs, nowMs) {
    const out: DailyCandle[] = [];
    let endTime = nowMs;
    for (let page = 0; page < 3; page++) {
      const data = rec(await getJson(`https://api.bitget.com/api/v2/spot/market/history-candles?symbol=${symbol}&granularity=1Dutc&endTime=${endTime}&limit=200`, `Bitget candles ${symbol}`, CANDLE_REVALIDATE, this.pace));
      const batch = candlesFromRows(arr(data.data), 0, "ms", 5);
      if (batch.length === 0) break;
      out.push(...batch);
      const oldest = Math.min(...batch.map((c) => c.dayStartMs));
      if (oldest <= sinceMs || batch.length < 200) break;
      // endTime is compared against candle close, so `oldest` itself returns the day before it.
      endTime = oldest;
    }
    return dedupe(out);
  },
};

const bitstamp: VenueAdapter = {
  pace: { key: "bitstamp", minIntervalMs: 150 },
  async listPairs() {
    const data = arr(await getJson("https://www.bitstamp.net/api/v2/trading-pairs-info/", "Bitstamp pairs", LIST_REVALIDATE, this.pace));
    return pairsFrom(data, (s) => {
      const o = rec(s);
      if (o.trading !== "Enabled" || typeof o.name !== "string") return null;
      const [base, quote] = o.name.split("/");
      return base && quote ? { base, quote, symbol: String(o.url_symbol) } : null;
    });
  },
  async fetchDaily(symbol, sinceMs) {
    const data = rec(await getJson(`https://www.bitstamp.net/api/v2/ohlc/${symbol}/?step=86400&limit=1000&start=${sec(sinceMs)}`, `Bitstamp OHLC ${symbol}`, CANDLE_REVALIDATE, this.pace));
    return dedupe(
      arr(rec(data.data).ohlc).map((r) => {
        const o = rec(r);
        return { dayStartMs: num(o.timestamp) * 1000, baseVolume: num(o.volume) };
      })
    );
  },
};

export const ADAPTERS: Record<CexVenueId, VenueAdapter> = { binance, okx, coinbase, bybit, upbit, kraken, kucoin, gate, bitget, bitstamp };

// Pure — no network, no "server-only"; exercised by scripts/verify-exchange-volume.ts.
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type {
  BaseAsset,
  PairHistory,
  PeriodVolume,
  QuoteCurrency,
  QuoteType,
  ReferencePrices,
  VolumeBreakdown,
} from "@/lib/exchangeVolume/types";

export const DAY_MS = 86_400_000;

export const BASE_ASSETS: BaseAsset[] = ["BTC", "ETH", "SOL", "XRP"];
export const FIAT_CURRENCIES = ["USD", "EUR", "GBP", "KRW", "TRY"] as const;
export const QUOTE_CURRENCIES: QuoteCurrency[] = ["USD", "EUR", "GBP", "KRW", "TRY", "USDT", "USDC", "BTC"];
export const QUOTE_TYPES: QuoteType[] = ["fiat", "stablecoin", "crypto"];

export const PERIOD_DAYS: Record<ExchangePeriod, number> = { "1d": 1, "7d": 7, "30d": 30, "1y": 365 };

// Upper bound on history any caller needs: the 1Y window plus today's in-progress day.
export const HISTORY_DAYS = PERIOD_DAYS["1y"] + 1;

export function quoteType(quote: QuoteCurrency): QuoteType {
  if ((FIAT_CURRENCIES as readonly string[]).includes(quote)) return "fiat";
  if (quote === "USDT" || quote === "USDC") return "stablecoin";
  return "crypto";
}

// Normalizes an exchange's own asset code (Kraken's XBT, etc.) and keeps only
// the tracked base/quote set; ETH/BTC is kept, BTC/BTC-style nonsense is not.
export function toTrackedPair(rawBase: string, rawQuote: string): { base: BaseAsset; quote: QuoteCurrency } | null {
  const norm = (s: string) => {
    const u = s.toUpperCase();
    return u === "XBT" ? "BTC" : u;
  };
  const base = norm(rawBase);
  const quote = norm(rawQuote);
  if (!(BASE_ASSETS as string[]).includes(base)) return null;
  if (!(QUOTE_CURRENCIES as string[]).includes(quote)) return null;
  if (base === quote) return null;
  return { base: base as BaseAsset, quote: quote as QuoteCurrency };
}

export function utcDayStart(ms: number): number {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function emptyBreakdown(): VolumeBreakdown {
  return {
    totalUsd: 0,
    byQuoteType: { fiat: 0, stablecoin: 0, crypto: 0 },
    byQuote: { USD: 0, EUR: 0, GBP: 0, KRW: 0, TRY: 0, USDT: 0, USDC: 0, BTC: 0 },
    byBase: { BTC: { usd: 0, qty: 0 }, ETH: { usd: 0, qty: 0 }, SOL: { usd: 0, qty: 0 }, XRP: { usd: 0, qty: 0 } },
  };
}

// Window = the last `days` COMPLETE UTC days; today's in-progress candle is
// never counted. Every candle is valued at the reference USD price of its
// own day, so EUR/KRW/TRY pairs need no FX conversion.
export function aggregatePeriod(pairs: PairHistory[], prices: ReferencePrices, days: number, nowMs: number): PeriodVolume {
  const windowEnd = utcDayStart(nowMs); // exclusive
  const windowStart = windowEnd - days * DAY_MS;
  const out = emptyBreakdown();
  let pairsWithShortHistory = 0;
  let pairsWithGaps = 0;
  let unpricedDays = 0;

  for (const pair of pairs) {
    const inWindow = new Map<number, number>();
    for (const c of pair.candles) {
      if (c.startMs >= windowStart && c.startMs < windowEnd) {
        inWindow.set(c.startMs, (inWindow.get(c.startMs) ?? 0) + c.baseVolume);
      }
    }
    const earliest = pair.candles.reduce((min, c) => Math.min(min, c.startMs), Infinity);
    if (earliest > windowStart) pairsWithShortHistory++;
    const expectedFrom = Math.max(windowStart, earliest);
    const expectedDays = expectedFrom < windowEnd ? (windowEnd - expectedFrom) / DAY_MS : 0;
    if (inWindow.size < expectedDays) pairsWithGaps++;

    const qt = quoteType(pair.quote);
    const priceSeries = prices[pair.base];
    for (const [day, qty] of inWindow) {
      out.byBase[pair.base].qty += qty;
      if (qty === 0) continue;
      const price = priceSeries?.get(day);
      if (price === undefined) {
        unpricedDays++;
        continue;
      }
      const usd = qty * price;
      out.totalUsd += usd;
      out.byQuoteType[qt] += usd;
      out.byQuote[pair.quote] += usd;
      out.byBase[pair.base].usd += usd;
    }
  }

  return {
    ...out,
    days,
    startDay: isoDay(windowStart),
    endDay: isoDay(windowEnd - DAY_MS),
    pairsWithShortHistory,
    pairsWithGaps,
    unpricedDays,
  };
}

export function aggregateAllPeriods(pairs: PairHistory[], prices: ReferencePrices, nowMs: number): Record<ExchangePeriod, PeriodVolume> {
  return {
    "1d": aggregatePeriod(pairs, prices, PERIOD_DAYS["1d"], nowMs),
    "7d": aggregatePeriod(pairs, prices, PERIOD_DAYS["7d"], nowMs),
    "30d": aggregatePeriod(pairs, prices, PERIOD_DAYS["30d"], nowMs),
    "1y": aggregatePeriod(pairs, prices, PERIOD_DAYS["1y"], nowMs),
  };
}

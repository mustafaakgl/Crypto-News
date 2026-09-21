import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";

export type BaseAsset = "BTC" | "ETH" | "SOL" | "XRP";
export type FiatCurrency = "USD" | "EUR" | "GBP" | "KRW" | "TRY";
export type QuoteCurrency = FiatCurrency | "USDT" | "USDC" | "BTC";
export type QuoteType = "fiat" | "stablecoin" | "crypto";

export type PairRef = { base: BaseAsset; quote: QuoteCurrency; symbol: string };

export type CandleResolution = "1h" | "1d";

// startMs is the UTC start of the bucket (00:00 UTC for daily candles).
export type Candle = { startMs: number; close: number; baseVolume: number; quoteVolume: number };

export type PairHistory = PairRef & { candles: Candle[] };

// base asset -> (dayStartMs -> USD price)
export type ReferencePrices = Partial<Record<BaseAsset, Map<number, number>>>;

export type VolumeBreakdown = {
  totalUsd: number;
  byQuoteType: Record<QuoteType, number>;
  byQuote: Record<QuoteCurrency, number>;
  byBase: Record<BaseAsset, { usd: number; qty: number }>;
};

export type PeriodVolume = VolumeBreakdown & {
  days: number;
  startDay: string; // YYYY-MM-DD, UTC, inclusive
  endDay: string; // YYYY-MM-DD, UTC, inclusive
  pairsWithShortHistory: number;
  pairsWithGaps: number;
  unpricedDays: number; // pair-days with volume but no reference USD price
};

export type VenueVolumeResult = {
  venueId: string;
  name: string;
  url: string;
  status: "ok" | "partial" | "error";
  periods: Record<ExchangePeriod, PeriodVolume> | null;
  pairs: string[]; // e.g. "BTC/USDT", every pair counted
  pairsFailed: string[];
  asOf: string;
  warnings: string[];
};

export type VenueRolling24h = {
  totalUsd: number; // every spot pair on the venue
  trackedUsd: number; // the tracked major pairs, from the same snapshot
  stableSwapUsd: number; // stablecoin ↔ stablecoin / USD pairs, included in totalUsd
  pairsCounted: number;
  pairsUnvalued: number;
  unvaluedQuotes: string[];
  asOf: string;
};

export type StoredPeriodTotals = {
  totalUsd: number;
  trackedUsd: number;
  stableSwapUsd: number;
  days: number;
  daysCovered: number;
  complete: boolean;
  startDay: string;
  endDay: string;
};

export type StoredVenueTotals = {
  periods: Record<ExchangePeriod, StoredPeriodTotals>;
  collectedFrom: string;
  collectedThrough: string;
  pairsListed: number;
};

export type StoredDailyPoint = { day: number; totalUsd: number; trackedUsd: number }; // day = days since 1970-01-01 UTC

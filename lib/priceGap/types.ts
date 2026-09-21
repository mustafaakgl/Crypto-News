import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { CandleResolution } from "@/lib/exchangeVolume/types";

export type GapAsset = "BTC" | "ETH";
export const GAP_ASSETS: GapAsset[] = ["BTC", "ETH"];

export type MarketKind = "cex" | "dex";

export type VenueGapStats = {
  buckets: number; // buckets where both this venue and the reference have a close
  meanDevPct: number | null;
  meanAbsDevPct: number | null;
  maxAbsDevPct: number | null;
  maxAbsDevAt: number | null; // bucket start, ms
  returnPct: number | null; // first → last common bucket
  refReturnPct: number | null; // CEX reference over the same buckets
  volatilityPct: number | null; // stdev of consecutive-bucket returns
  refVolatilityPct: number | null; // CEX reference over the same bucket pairs
};

export type VenueGap = {
  id: string;
  name: string;
  kind: MarketKind;
  pair: string; // the real pair traded, e.g. "WBTC/USDT" on a DEX
  network?: string;
  poolAddress?: string;
  poolUrl?: string;
  status: "ok" | "error";
  error: string | null;
  lastClose: number | null;
  deviationsPct: (number | null)[]; // aligned with PriceGapResult.buckets
  stats: VenueGapStats;
};

export type PriceGapResult = {
  asset: GapAsset;
  period: ExchangePeriod;
  resolution: CandleResolution;
  buckets: number[]; // completed bucket starts, ms, ascending
  reference: (number | null)[]; // median CEX close per bucket, USDT
  venues: VenueGap[];
  asOf: string;
  warnings: string[];
};

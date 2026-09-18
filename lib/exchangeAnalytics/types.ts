export type ExchangePeriod = "1d" | "7d" | "30d" | "1y";

export const EXCHANGE_PERIODS: ExchangePeriod[] = ["1d", "7d", "30d", "1y"];

export const EXCHANGE_PERIOD_LABEL: Record<ExchangePeriod, string> = {
  "1d": "1D",
  "7d": "7D",
  "30d": "30D",
  "1y": "1Y",
};

export type VenueCount = 5 | 10;

// "trailing_24h" — a rolling window ending now, not a calendar-period sum
// (only ever true for the 1d period). "period_total" — a genuine sum of
// non-overlapping daily buckets covering the exact UTC window below,
// verified at runtime (see periodMath.validateDailySeries) to actually be
// complete and non-overlapping — never assumed just because the right
// `days` value was requested. "unverified_daily_snapshot" — the daily
// series for this venue/period failed that verification (a gap, a
// duplicate, or too few completed days); rather than sum something that
// might double-count or under-count, only the single latest COMPLETE
// day's volume is shown, explicitly not a period total.
export type VolumeKind = "trailing_24h" | "period_total" | "unverified_daily_snapshot";

export type CexVenue = {
  id: string;
  name: string;
  url: string;
  image: string | null;
  trustScore: number | null; // CoinGecko's own 0-10 score — surfaced, never used to silently exclude a venue
  trustScoreRank: number | null;
  volumeBtc: number;
  volumeKind: VolumeKind;
  volumeUsd: number | null; // null only if BTC/USD price history was unavailable
  // Both bases are ESTIMATES, never presented as an exact figure: "current_rate"
  // applies today's BTC/USD price to a trailing-24h BTC volume; "daily_historical_rate"
  // applies each day's own historical BTC/USD price to that day's BTC volume. Neither
  // is confirmed to match the exact rate CoinGecko itself used internally when it
  // originally converted trade-level volume into the BTC figure it reports — the UI
  // must label these "Estimated USD equivalent", never a bare unqualified figure.
  usdRateBasis: "current_rate" | "daily_historical_rate" | null;
  periodStart: string; // ISO
  periodEnd: string; // ISO
};

export type CexOverviewResult = {
  period: ExchangePeriod;
  venues: CexVenue[];
  rankingPoolSize: number; // how many CoinGecko-listed exchanges were considered for ranking
  asOf: string; // ISO — when this server actually fetched the ranking pool
  warnings: string[];
};

export type DexProtocol = {
  id: string;
  name: string;
  chains: string[];
  volumeUsd: number;
  change1d: number | null;
};

export type DexOverviewResult = {
  period: ExchangePeriod;
  totalVolumeUsd: number | null; // DefiLlama's OWN top-level total for the period — never re-derived by summing protocols
  protocols: DexProtocol[];
  protocolPoolSize: number;
  asOf: string;
  warnings: string[];
};

export type QuoteCurrencyType = "fiat" | "stablecoin" | "crypto";

export type PairBreakdownEntry = { key: string; volumeUsd: number };

export type CexTickerBreakdown = {
  exchangeId: string;
  byBaseAsset: PairBreakdownEntry[]; // BTC / ETH / SOL / Other
  byQuoteType: PairBreakdownEntry[]; // fiat / stablecoin / crypto
  pairsConsidered: number; // counted toward the totals above
  pairsExcludedAnomalousOrStale: number; // CoinGecko-flagged is_anomaly/is_stale pairs, dropped rather than counted
  paginationComplete: false; // always false today — only page 1 (up to 100 pairs) is ever fetched, see cexTickers.ts
  // CoinGecko's /tickers endpoint is a LIVE/current snapshot (roughly the
  // trailing 24h), independent of whatever period (7D/30D/1Y) is selected
  // for the venue-level totals elsewhere on the page. Never presented as a
  // 30D/1Y distribution.
  dataPeriod: "current_ticker_snapshot";
  coverageNote: string;
  asOf: string;
};

export type ExchangePeriod = "1d" | "7d" | "30d" | "1y";

export const EXCHANGE_PERIODS: ExchangePeriod[] = ["1d", "7d", "30d", "1y"];

export const EXCHANGE_PERIOD_LABEL: Record<ExchangePeriod, string> = {
  "1d": "1D",
  "7d": "7D",
  "30d": "30D",
  "1y": "1Y",
};

export type VenueCount = 5 | 10;

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

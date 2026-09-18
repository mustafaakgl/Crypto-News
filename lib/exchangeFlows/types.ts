import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";

// First-wave supported assets only — genuinely usable combinations, never
// a placeholder that implies broader coverage than any real provider gives.
export type FlowAsset = "BTC" | "ETH" | "USDT" | "USDC";

// Only meaningful for multi-chain assets (USDT/USDC exist on many chains;
// BTC/ETH are effectively single-network for this purpose). null means
// "not applicable" for BTC/ETH, never "all networks combined" — a
// provider's USDT-on-Ethereum figure is never presented as USDT-wide.
export type FlowNetwork = "bitcoin" | "ethereum" | "tron" | "solana" | null;

export const FLOW_ASSETS: FlowAsset[] = ["BTC", "ETH", "USDT", "USDC"];

// Networks a stablecoin might realistically be tracked on — a provider is
// never assumed to cover all of these; getFlowsProviderCapabilities()
// (or the provider's own not_configured response) states what's real.
export const FLOW_NETWORKS_BY_ASSET: Record<FlowAsset, FlowNetwork[]> = {
  BTC: [null],
  ETH: [null],
  USDT: ["ethereum", "tron", "solana"],
  USDC: ["ethereum", "solana"],
};

export type FlowRowCoverage = "available" | "unavailable";

export type ExchangeFlowRow = {
  exchangeId: string;
  exchangeName: string;
  // All three are in `asset` units (never mixed with another asset's units
  // — see lib/exchangeFlows/provider.ts). null when this specific row has
  // no data, distinct from a genuine reported zero.
  inflow: number | null;
  outflow: number | null;
  // Only ever provider-reported directly, or computed as inflow - outflow
  // when the provider gives both for the SAME asset/network/period — never
  // derived by this app when the provider only exposes an aggregate.
  netflow: number | null;
  coverage: FlowRowCoverage;
  // The provider's own data timestamp for this row (when its last
  // observation was), not this server's fetch time.
  updatedAt: string | null;
};

export type DailyFlowPoint = {
  dateIso: string; // UTC calendar date, YYYY-MM-DD
  inflow: number | null;
  outflow: number | null;
  netflow: number | null;
};

export type FlowCandidateVerdict = "supported" | "not_supported" | "requires_new_paid_plan" | "requires_new_account";

export type FlowProviderCandidate = {
  name: string;
  verdict: FlowCandidateVerdict;
  blocker: string; // concrete, human-readable reason
  docsUrl: string;
};

export type ExchangeFlowsResult =
  | {
      status: "connected";
      asset: FlowAsset;
      network: FlowNetwork;
      period: ExchangePeriod;
      periodStart: string; // ISO
      periodEnd: string; // ISO
      rows: ExchangeFlowRow[];
      requestedCount: number;
      supportedCount: number; // rows with coverage === "available"
      source: string;
      methodologyNote: string;
      networkScopeNote: string;
      asOf: string;
      warnings: string[];
    }
  | {
      status: "not_configured";
      asset: FlowAsset;
      network: FlowNetwork;
      period: ExchangePeriod;
      reason: string;
      candidatesEvaluated: FlowProviderCandidate[];
    };

export type ExchangeFlowDailySeries = {
  exchangeId: string;
  asset: FlowAsset;
  network: FlowNetwork;
  points: DailyFlowPoint[];
} | null; // null when unavailable — never an empty-but-implied-zero series

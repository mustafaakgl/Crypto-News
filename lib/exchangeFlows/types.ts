import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";

// Only what's actually collected (see lib/exchangeFlows/duneSql.ts).
export type FlowAsset = "USDT" | "USDC" | "BTC";

// Always explicit, so a USDT-on-Ethereum figure is never presented as USDT across all chains.
export type FlowNetwork = "bitcoin" | "ethereum" | "tron" | "solana" | null;

export const FLOW_ASSETS: FlowAsset[] = ["USDT", "USDC", "BTC"];

export const FLOW_NETWORKS_BY_ASSET: Record<FlowAsset, FlowNetwork[]> = {
  USDT: ["ethereum"],
  USDC: ["ethereum"],
  BTC: ["bitcoin"],
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
  // Parts of inflow/outflow whose other side is a different labeled exchange —
  // money moving between exchanges, not entering or leaving the market.
  inflowFromExchanges: number | null;
  outflowToExchanges: number | null;
  // Transfers between this exchange's own wallets; excluded from inflow/outflow.
  internalExcluded: number | null;
  coverage: FlowRowCoverage;
  unavailableReason?: "not_tracked" | "not_collected" | "no_labeled_activity";
  // "verified": the exchange's own published reserve wallets are included; "dune_labels": Dune's labels only.
  coverageBasis: "verified" | "dune_labels" | null;
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
      collectedFrom: string; // YYYY-MM-DD, first day in the stored history
      historyNeededFrom: string | null; // YYYY-MM-DD when the period starts before collectedFrom
      dataThrough: string; // ISO, newest transfer the source had ingested at the last run
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

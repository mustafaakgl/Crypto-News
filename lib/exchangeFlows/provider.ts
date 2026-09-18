import "server-only";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { ExchangeFlowsResult, ExchangeFlowDailySeries, FlowAsset, FlowNetwork, FlowProviderCandidate } from "@/lib/exchangeFlows/types";

export type FlowsOverviewParams = {
  asset: FlowAsset;
  network: FlowNetwork;
  period: ExchangePeriod;
  // Candidate venues to look up, in the SAME order/selection as the Volume
  // tab (see cexVenues.ts) — a provider fills in what it can and reports
  // the rest as unavailable; it never substitutes a different exchange.
  candidates: { id: string; name: string }[];
};

export type FlowsDailySeriesParams = {
  exchangeId: string;
  asset: FlowAsset;
  network: FlowNetwork;
  period: ExchangePeriod;
};

// The provider contract every real adapter (Glassnode, CryptoQuant, ...)
// implements. Swapping in a real provider is a one-line change in
// getFlowsProvider() below — nothing else in the app depends on which
// concrete provider is active.
export interface FlowsProvider {
  getOverview(params: FlowsOverviewParams): Promise<ExchangeFlowsResult>;
  getDailySeries(params: FlowsDailySeriesParams): Promise<ExchangeFlowDailySeries>;
}

// Findings from the source research this feature's first pass required
// (docs read, no paid plan or new account started — see the delivery
// report for the full write-up). Kept as data, not prose buried in a
// comment, so the same facts back both this fallback provider's response
// and the UI's "why isn't this connected" panel — one source of truth.
export const FLOW_PROVIDER_CANDIDATES: FlowProviderCandidate[] = [
  {
    name: "Glassnode",
    verdict: "requires_new_paid_plan",
    blocker:
      "Glassnode's API always requires an API key, and every tier that includes it needs a paid subscription — there is no free tier. The lightest paid tier (\"Advanced\", light API) is capped at 14 days of history, daily resolution only, 50 calls/day; full exchange netflow access needs \"Professional\". No Glassnode subscription exists for this project, and this task does not start one.",
    docsUrl: "https://docs.glassnode.com/basic-api/api",
  },
  {
    name: "CryptoQuant",
    verdict: "requires_new_account",
    blocker:
      "CryptoQuant's free \"Basic\" plan requires creating a new account to get an API key, which this task does not do. Even with an account, Basic's API access is scoped to \"market data\" only (community indicators) — exchange netflow/inflow/outflow is on-chain data, gated behind the paid \"Professional\" plan ($99/mo) or above.",
    docsUrl: "https://cryptoquant.com/pricing",
  },
  {
    name: "DefiLlama",
    verdict: "not_supported",
    blocker:
      "DefiLlama's free API has no exchange wallet inflow/outflow/netflow endpoint at all. Its only \"inflows\" endpoint (/api/inflows/{protocol}/{timestamp}) is Pro-only ($300/mo) and measures a DEFI PROTOCOL's own bridged/token inflows — not a centralized exchange's wallet flows. This isn't an access problem, the data itself doesn't exist here.",
    docsUrl: "https://api-docs.defillama.com/",
  },
];

const NOT_CONFIGURED_REASON =
  "No exchange flow data source is connected in this deployment. Of the three candidates evaluated (Glassnode, CryptoQuant, DefiLlama), none offer real inflow/outflow/netflow data without either a new paid subscription or a new account — both out of scope for this task. See the candidates below for the specific blocker and source for each.";

class NotConfiguredFlowsProvider implements FlowsProvider {
  async getOverview(params: FlowsOverviewParams): Promise<ExchangeFlowsResult> {
    return {
      status: "not_configured",
      asset: params.asset,
      network: params.network,
      period: params.period,
      reason: NOT_CONFIGURED_REASON,
      candidatesEvaluated: FLOW_PROVIDER_CANDIDATES,
    };
  }

  async getDailySeries(): Promise<ExchangeFlowDailySeries> {
    return null;
  }
}

// A real adapter would read its own env var here (e.g. GLASSNODE_API_KEY)
// and only activate if present — server-side only, never sent to the
// client. Today, no such variable is set for any evaluated provider, so
// this always resolves to the honest not-configured provider.
export function getFlowsProvider(): FlowsProvider {
  return new NotConfiguredFlowsProvider();
}

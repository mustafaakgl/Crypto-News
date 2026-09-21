import "server-only";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { ExchangeFlowsResult, ExchangeFlowDailySeries, FlowAsset, FlowNetwork, FlowProviderCandidate } from "@/lib/exchangeFlows/types";
import { StoredFlowsProvider, storedFlowsAvailable } from "@/lib/exchangeFlows/storedProvider";

export type FlowsOverviewParams = {
  asset: FlowAsset;
  network: FlowNetwork;
  period: ExchangePeriod;
  // Candidate venues to look up, in the SAME order/selection as the Volume
  // tab (see lib/exchangeVolume/venues.ts) — a provider fills in what it can and reports
  // the rest as unavailable; it never substitutes a different exchange.
  candidates: { id: string; name: string }[];
};

export type FlowsDailySeriesParams = {
  exchangeId: string;
  asset: FlowAsset;
  network: FlowNetwork;
  period: ExchangePeriod;
};

// The contract any flow source implements; the rest of the app doesn't
// depend on which concrete provider is active.
export interface FlowsProvider {
  getOverview(params: FlowsOverviewParams): Promise<ExchangeFlowsResult>;
  getDailySeries(params: FlowsDailySeriesParams): Promise<ExchangeFlowDailySeries>;
}

// Sources evaluated for exchange flows (see PROVIDERS.md). Dune is the one in use.
export const FLOW_PROVIDER_CANDIDATES: FlowProviderCandidate[] = [
  {
    name: "Dune",
    verdict: "supported",
    blocker:
      "In use for USDT/USDC on Ethereum: SQL over cex.addresses wallet labels and tokens.transfers, run by the server's collector with DUNE_API_KEY (free plan, 2,500 credits/month; a 3-exchange × 2-token daily refresh costs about 0.5 credits). No Bitcoin coverage in its curated flows, and wallet labels were last extended in 2025-08, so figures are a lower bound.",
    docsUrl: "https://docs.dune.com/data-catalog/curated/cex-flows/addresses",
  },
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
  "Exchange flow collection hasn't run on this server yet (it needs DUNE_API_KEY and COLLECTOR_ENABLED=1), so there is no stored data to show.";

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

// Visitors only ever read what the collector stored; no request reaches Dune from here.
export function getFlowsProvider(): FlowsProvider {
  return storedFlowsAvailable() ? new StoredFlowsProvider() : new NotConfiguredFlowsProvider();
}

import { NextRequest, NextResponse } from "next/server";
import { CEX_VENUES } from "@/lib/exchangeVolume/venues";
import { getFlowsProvider } from "@/lib/exchangeFlows/provider";
import { FLOW_ASSETS, FLOW_NETWORKS_BY_ASSET } from "@/lib/exchangeFlows/types";
import type { ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import type { FlowAsset, FlowNetwork } from "@/lib/exchangeFlows/types";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is `${VenueCount}` {
  return v === "5" || v === "10";
}
function isAsset(v: string | null): v is FlowAsset {
  return v !== null && (FLOW_ASSETS as string[]).includes(v);
}

// A flows request failing (or the provider simply not being connected —
// see lib/exchangeFlows/provider.ts) must never affect the Volume tab's
// own route/data; the two are deliberately independent endpoints with no
// shared failure path.
export async function GET(req: NextRequest) {
  const assetParam = req.nextUrl.searchParams.get("asset");
  const networkParam = req.nextUrl.searchParams.get("network");
  const periodParam = req.nextUrl.searchParams.get("period");
  const countParam = req.nextUrl.searchParams.get("count");

  const asset: FlowAsset = isAsset(assetParam) ? assetParam : "BTC";
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "1d";
  const count: VenueCount = isCount(countParam) ? (Number(countParam) as VenueCount) : 5;

  const validNetworks = FLOW_NETWORKS_BY_ASSET[asset];
  const requestedNetwork = networkParam === "" || networkParam === null ? null : (networkParam as FlowNetwork);
  const network: FlowNetwork = validNetworks.includes(requestedNetwork) ? requestedNetwork : validNetworks[0];

  const candidates = CEX_VENUES.slice(0, count).map((v) => ({ id: v.id, name: v.name }));
  const result = await getFlowsProvider().getOverview({ asset, network, period, candidates });

  return NextResponse.json(result);
}

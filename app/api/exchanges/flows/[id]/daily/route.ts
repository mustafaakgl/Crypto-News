import { NextRequest, NextResponse } from "next/server";
import { getFlowsProvider } from "@/lib/exchangeFlows/provider";
import { FLOW_ASSETS, FLOW_NETWORKS_BY_ASSET } from "@/lib/exchangeFlows/types";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { FlowAsset, FlowNetwork } from "@/lib/exchangeFlows/types";

const SAFE_ID = /^[a-z0-9_-]+$/i;

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isAsset(v: string | null): v is FlowAsset {
  return v !== null && (FLOW_ASSETS as string[]).includes(v);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: "Invalid exchange id." }, { status: 400 });
  }

  const assetParam = req.nextUrl.searchParams.get("asset");
  const networkParam = req.nextUrl.searchParams.get("network");
  const periodParam = req.nextUrl.searchParams.get("period");

  const asset: FlowAsset = isAsset(assetParam) ? assetParam : "BTC";
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "1d";
  const validNetworks = FLOW_NETWORKS_BY_ASSET[asset];
  const requestedNetwork = networkParam === "" || networkParam === null ? null : (networkParam as FlowNetwork);
  const network: FlowNetwork = validNetworks.includes(requestedNetwork) ? requestedNetwork : validNetworks[0];

  const series = await getFlowsProvider().getDailySeries({ exchangeId: id, asset, network, period });
  return NextResponse.json({ series });
}

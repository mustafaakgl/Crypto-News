import { NextRequest, NextResponse } from "next/server";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import { getPriceGap } from "@/lib/priceGap/service";
import { GAP_ASSETS, type GapAsset } from "@/lib/priceGap/types";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}

export async function GET(req: NextRequest) {
  const assetParam = req.nextUrl.searchParams.get("asset");
  const periodParam = req.nextUrl.searchParams.get("period");
  const asset: GapAsset = GAP_ASSETS.includes(assetParam as GapAsset) ? (assetParam as GapAsset) : "BTC";
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "7d";
  const { value, stale } = await getPriceGap(asset, period);
  return NextResponse.json({ ...value, stale });
}

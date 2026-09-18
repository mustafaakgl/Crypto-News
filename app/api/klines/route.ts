import { NextRequest, NextResponse } from "next/server";
import { fetchKlines, isAsset, isInterval } from "@/lib/klines";
import { analyzePriceAction } from "@/lib/priceAction";
import { analyzeVolume } from "@/lib/volume";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assetParam = searchParams.get("asset");
  const intervalParam = searchParams.get("interval");

  if (!isAsset(assetParam) || !isInterval(intervalParam)) {
    return NextResponse.json(
      { error: "Invalid asset or interval. Allowed assets: BTC, ETH. Allowed intervals: 1h, 4h, 1d." },
      { status: 400 }
    );
  }

  const result = await fetchKlines(assetParam, intervalParam);

  if (result.error || result.candles.length === 0) {
    return NextResponse.json(result, { status: 200 });
  }

  const priceAction = analyzePriceAction(result.candles);
  const volume = analyzeVolume(result.candles);

  return NextResponse.json({ ...result, priceAction, volume });
}

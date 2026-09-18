import { NextRequest, NextResponse } from "next/server";
import { isAsset } from "@/lib/klines";
import { fetchDerivatives } from "@/lib/derivatives";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const assetParam = searchParams.get("asset");

  if (!isAsset(assetParam)) {
    return NextResponse.json({ error: "Invalid asset. Allowed: BTC, ETH." }, { status: 400 });
  }

  const result = await fetchDerivatives(assetParam);
  return NextResponse.json(result);
}

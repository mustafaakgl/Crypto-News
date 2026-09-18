import { NextRequest, NextResponse } from "next/server";
import { isAsset, isInterval, fetchKlines } from "@/lib/klines";
import { analyzePriceAction } from "@/lib/priceAction";
import { explainPriceAction } from "@/lib/rag/explain";

// Price Action only. The request body accepts nothing beyond asset/interval
// — there is no sourceId/scope parameter a client could use to reach any
// other retrieval source; the server hard-codes the Brooks price-action
// index as the only source this endpoint ever queries.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid request body." }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const assetParam = typeof obj.asset === "string" ? obj.asset : null;
  const intervalParam = typeof obj.interval === "string" ? obj.interval : null;

  if (!isAsset(assetParam) || !isInterval(intervalParam)) {
    return NextResponse.json({ status: "error", message: "Invalid asset or interval." }, { status: 400 });
  }

  // The server independently re-derives the market data and the price
  // action calculation itself — it never trusts a client-supplied analysis
  // payload as verified market data.
  const klines = await fetchKlines(assetParam, intervalParam);
  if (klines.error || klines.candles.length === 0 || klines.lastClosedAt === null) {
    return NextResponse.json(
      { status: "error", message: klines.error ?? "No market data available." },
      { status: 200 }
    );
  }

  const priceAction = analyzePriceAction(klines.candles);

  const result = await explainPriceAction({
    asset: assetParam,
    interval: intervalParam,
    pair: klines.pair,
    lastClosedAt: klines.lastClosedAt,
    priceAction,
  });

  return NextResponse.json(result);
}

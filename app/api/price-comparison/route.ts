import { NextResponse } from "next/server";
import { getPriceComparison } from "@/lib/priceComparison/service";

export async function GET() {
  const { value, stale } = await getPriceComparison();
  return NextResponse.json({ ...value, stale });
}

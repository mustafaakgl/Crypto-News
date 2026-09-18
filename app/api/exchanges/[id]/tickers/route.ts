import { NextRequest, NextResponse } from "next/server";
import { getCexTickerBreakdown } from "@/lib/exchangeAnalytics/cexTickers";

const SAFE_ID = /^[a-z0-9_-]+$/i;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: "Invalid exchange id." }, { status: 400 });
  }

  const breakdown = await getCexTickerBreakdown(id);
  if (!breakdown) {
    return NextResponse.json({ error: "No ticker breakdown available for this exchange." }, { status: 200 });
  }
  return NextResponse.json(breakdown);
}

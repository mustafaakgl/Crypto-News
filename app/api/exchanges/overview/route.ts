import { NextRequest, NextResponse } from "next/server";
import { getDexOverview } from "@/lib/exchangeAnalytics/dexOverview";
import type { DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is `${VenueCount}` {
  return v === "5" || v === "10";
}

// DEX side only — CEX volume is served per venue by /api/exchanges/volume.
export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "1d";
  const countParam = req.nextUrl.searchParams.get("count");
  const count: VenueCount = isCount(countParam) ? (Number(countParam) as VenueCount) : 5;

  try {
    const { value, stale } = await getDexOverview(period, count);
    return NextResponse.json({ period, dex: value, dexStale: stale });
  } catch (err) {
    const empty: DexOverviewResult = {
      period,
      totalVolumeUsd: null,
      protocols: [],
      protocolPoolSize: 0,
      asOf: new Date().toISOString(),
      warnings: [String(err)],
    };
    return NextResponse.json({ period, dex: empty, dexStale: false });
  }
}

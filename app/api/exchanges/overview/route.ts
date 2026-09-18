import { NextRequest, NextResponse } from "next/server";
import { getCexOverview } from "@/lib/exchangeAnalytics/cexVenues";
import { getDexOverview } from "@/lib/exchangeAnalytics/dexOverview";
import type { ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is `${VenueCount}` {
  return v === "5" || v === "10";
}

// CEX and DEX are fetched with allSettled — a CoinGecko outage never hides
// working DefiLlama data and vice versa; each side reports its own warnings
// independently.
export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const countParam = req.nextUrl.searchParams.get("count");
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "1d";
  const count: VenueCount = isCount(countParam) ? (Number(countParam) as VenueCount) : 5;

  const [cexResult, dexResult] = await Promise.allSettled([getCexOverview(period, count), getDexOverview(period, count)]);

  return NextResponse.json({
    period,
    count,
    cex:
      cexResult.status === "fulfilled"
        ? cexResult.value
        : { period, venues: [], rankingPoolSize: 0, asOf: new Date().toISOString(), warnings: [String(cexResult.reason)] },
    dex:
      dexResult.status === "fulfilled"
        ? dexResult.value
        : { period, totalVolumeUsd: null, protocols: [], protocolPoolSize: 0, asOf: new Date().toISOString(), warnings: [String(dexResult.reason)] },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getCexOverview } from "@/lib/exchangeAnalytics/cexVenues";
import { getDexOverview } from "@/lib/exchangeAnalytics/dexOverview";
import type { CexOverviewResult, DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is `${VenueCount}` {
  return v === "5" || v === "10";
}

const EMPTY_CEX = (period: ExchangePeriod, reason: string): CexOverviewResult => ({
  period,
  venues: [],
  rankingPoolSize: 0,
  asOf: new Date().toISOString(),
  warnings: [reason],
});
const EMPTY_DEX = (period: ExchangePeriod, reason: string): DexOverviewResult => ({
  period,
  totalVolumeUsd: null,
  protocols: [],
  protocolPoolSize: 0,
  asOf: new Date().toISOString(),
  warnings: [reason],
});

// `part=cex` / `part=dex` let the client fetch each side independently so
// DEX (one fast DefiLlama call) can render immediately instead of waiting
// behind CEX (up to ~10 sequential, rate-limited CoinGecko calls on a cold
// load) — "show what's ready first" rather than blocking everything on the
// slowest source. Omitting `part` still returns both, kept for any other
// caller. Each side is fetched with allSettled — a CoinGecko outage never
// hides working DefiLlama data and vice versa.
export async function GET(req: NextRequest) {
  const periodParam = req.nextUrl.searchParams.get("period");
  const countParam = req.nextUrl.searchParams.get("count");
  const partParam = req.nextUrl.searchParams.get("part");
  const period: ExchangePeriod = isPeriod(periodParam) ? periodParam : "1d";
  const count: VenueCount = isCount(countParam) ? (Number(countParam) as VenueCount) : 5;

  const wantCex = partParam !== "dex";
  const wantDex = partParam !== "cex";

  const [cexResult, dexResult] = await Promise.allSettled([
    wantCex ? getCexOverview(period, count) : Promise.resolve(null),
    wantDex ? getDexOverview(period, count) : Promise.resolve(null),
  ]);

  const cexStale = cexResult.status === "fulfilled" ? (cexResult.value?.stale ?? false) : false;
  const dexStale = dexResult.status === "fulfilled" ? (dexResult.value?.stale ?? false) : false;

  return NextResponse.json({
    period,
    count,
    cex: wantCex ? (cexResult.status === "fulfilled" ? cexResult.value!.value : EMPTY_CEX(period, String(cexResult.reason))) : undefined,
    dex: wantDex ? (dexResult.status === "fulfilled" ? dexResult.value!.value : EMPTY_DEX(period, String(dexResult.reason))) : undefined,
    cexStale,
    dexStale,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getStoredDailySeries } from "@/lib/exchangeVolume/storedTotals";
import { CEX_VENUES, isCexVenueId } from "@/lib/exchangeVolume/venues";

const MAX_DAYS = 365;

export async function GET(req: NextRequest) {
  const requested = (req.nextUrl.searchParams.get("venues") ?? "").split(",").filter(isCexVenueId);
  const venues = requested.length ? requested : CEX_VENUES.map((v) => v.id);
  const daysParam = Number(req.nextUrl.searchParams.get("days"));
  const days = Number.isInteger(daysParam) && daysParam > 0 ? Math.min(daysParam, MAX_DAYS) : MAX_DAYS;
  try {
    return NextResponse.json({
      days,
      venues: venues.map((id) => ({ venueId: id, name: CEX_VENUES.find((v) => v.id === id)!.name, series: getStoredDailySeries(id, days) })),
    });
  } catch (err) {
    console.error("[volume history] unavailable:", err);
    return NextResponse.json({ days, venues: [] });
  }
}

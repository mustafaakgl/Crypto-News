import { NextRequest, NextResponse } from "next/server";
import { getRolling24h, getVenueVolume } from "@/lib/exchangeVolume/service";
import { getStoredTotals } from "@/lib/exchangeVolume/storedTotals";
import { isCexVenueId } from "@/lib/exchangeVolume/venues";

// One venue per request so the client can render each exchange as soon as
// its own history is in, instead of waiting on the slowest (Kraken).
export async function GET(req: NextRequest) {
  const venue = req.nextUrl.searchParams.get("venue");
  if (!isCexVenueId(venue)) return NextResponse.json({ error: "Unknown venue." }, { status: 400 });
  const [{ value, stale }, rolling] = await Promise.all([getVenueVolume(venue), getRolling24h(venue)]);
  let storedTotals = null;
  try {
    storedTotals = getStoredTotals(venue);
  } catch (err) {
    console.error("[volume] stored totals unavailable:", err);
  }
  return NextResponse.json({ ...value, stale, rolling24h: rolling.value, rolling24hError: rolling.error, storedTotals });
}

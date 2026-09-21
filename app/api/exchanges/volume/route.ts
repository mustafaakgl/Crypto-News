import { NextRequest, NextResponse } from "next/server";
import { getVenueVolume } from "@/lib/exchangeVolume/service";
import { isCexVenueId } from "@/lib/exchangeVolume/venues";

// One venue per request so the client can render each exchange as soon as
// its own history is in, instead of waiting on the slowest (Kraken).
export async function GET(req: NextRequest) {
  const venue = req.nextUrl.searchParams.get("venue");
  if (!isCexVenueId(venue)) return NextResponse.json({ error: "Unknown venue." }, { status: 400 });
  const { value, stale } = await getVenueVolume(venue);
  return NextResponse.json({ ...value, stale });
}

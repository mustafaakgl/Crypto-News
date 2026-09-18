import "server-only";
import { fetchJson } from "@/lib/httpClient";
import type { PriceObservation } from "@/lib/priceComparison/types";

const VENUE_ID = "binance";
const VENUE_NAME = "Binance";
const PAIR = "ETH/USDT";

// Public spot market data — no key. Documented weight budget is 6000/min
// (confirmed live via GET /api/v3/exchangeInfo's rateLimits); this single
// call carries weight ~50 (confirmed via the x-mbx-used-weight response
// header), so even polled once per cache window this uses under 2% of
// budget. Paced defensively anyway since this is a SHARED provider budget
// key — see lib/httpClient.ts.
const PACED = { key: "binance", minIntervalMs: 500 };

function unavailable(error: string, fetchedAtIso: string): PriceObservation {
  return {
    venueId: VENUE_ID,
    venueName: VENUE_NAME,
    venueType: "cex",
    pair: PAIR,
    status: "unavailable",
    price: null,
    quoteCurrency: "USDT",
    priceType: null,
    sourceTimeIso: null,
    fetchedAtIso,
    error,
  };
}

// Uses /api/v3/trades (the single most recent executed trade), NOT
// /api/v3/ticker/price or /ticker/bookTicker — neither of those carries any
// timestamp for the reported price, which would leave "source time" as an
// unexplained gap. /trades gives both a genuine last-trade price AND a real
// per-trade timestamp, confirmed live (2026-09-18).
export async function fetchBinanceEthUsdt(): Promise<PriceObservation> {
  const fetchedAtIso = new Date().toISOString();
  const result = await fetchJson("https://api.binance.com/api/v3/trades?symbol=ETHUSDT&limit=1", "Binance ETH/USDT last trade", 0, PACED);
  if (!result.ok) return unavailable(result.error, fetchedAtIso);

  const data = result.data;
  if (!Array.isArray(data) || data.length === 0) {
    return unavailable("Binance ETH/USDT last trade: empty response.", fetchedAtIso);
  }
  const trade = data[0] as { price?: unknown; time?: unknown };
  const price = typeof trade.price === "string" ? Number(trade.price) : null;
  const timeMs = typeof trade.time === "number" ? trade.time : null;
  if (price === null || !isFinite(price) || timeMs === null) {
    return unavailable("Binance ETH/USDT last trade: unexpected response shape.", fetchedAtIso);
  }

  return {
    venueId: VENUE_ID,
    venueName: VENUE_NAME,
    venueType: "cex",
    pair: PAIR,
    status: "ok",
    price,
    quoteCurrency: "USDT",
    priceType: "last_trade",
    sourceTimeIso: new Date(timeMs).toISOString(),
    fetchedAtIso,
    error: null,
  };
}

import "server-only";
import { fetchJson } from "@/lib/httpClient";
import type { PriceObservation } from "@/lib/priceComparison/types";

const VENUE_ID = "bybit";
const VENUE_NAME = "Bybit";
const PAIR = "ETH/USDT";

// Public spot market data — no key. Bybit's documented general IP limit is
// 600 requests / 5 seconds; polled once per cache window this is a
// vanishing fraction of that. See lib/httpClient.ts for the shared pacer.
const PACED = { key: "bybit", minIntervalMs: 500 };

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

// Uses /v5/market/recent-trade (the single most recent executed trade), NOT
// /v5/market/tickers — tickers' top-level `time` field is the RESPONSE'S own
// generation time, not a timestamp for lastPrice specifically. recent-trade
// gives a genuine last-trade price with its own real execution timestamp,
// confirmed live (2026-09-18) — the same price TYPE as the Binance adapter,
// so the two CEX rows are genuinely comparable.
export async function fetchBybitEthUsdt(): Promise<PriceObservation> {
  const fetchedAtIso = new Date().toISOString();
  const result = await fetchJson(
    "https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=ETHUSDT&limit=1",
    "Bybit ETH/USDT last trade",
    0,
    PACED
  );
  if (!result.ok) return unavailable(result.error, fetchedAtIso);

  const data = result.data as { retCode?: unknown; retMsg?: unknown; result?: { list?: unknown } };
  if (data.retCode !== 0) {
    return unavailable(`Bybit ETH/USDT last trade: ${typeof data.retMsg === "string" ? data.retMsg : `retCode ${String(data.retCode)}`}.`, fetchedAtIso);
  }
  const list = data.result?.list;
  if (!Array.isArray(list) || list.length === 0) {
    return unavailable("Bybit ETH/USDT last trade: empty response.", fetchedAtIso);
  }
  const trade = list[0] as { price?: unknown; time?: unknown };
  const price = typeof trade.price === "string" ? Number(trade.price) : null;
  const timeMs = typeof trade.time === "string" ? Number(trade.time) : null;
  if (price === null || !isFinite(price) || timeMs === null || !isFinite(timeMs)) {
    return unavailable("Bybit ETH/USDT last trade: unexpected response shape.", fetchedAtIso);
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

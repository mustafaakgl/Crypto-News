// Fixed, curated list — ranking by self-reported volume alone puts
// low-trust venues with likely wash-traded volume above Coinbase/Bybit.
// "Top 5" is the first five entries.
export const CEX_VENUES = [
  { id: "binance", name: "Binance", url: "https://www.binance.com" },
  { id: "okx", name: "OKX", url: "https://www.okx.com" },
  { id: "coinbase", name: "Coinbase", url: "https://exchange.coinbase.com" },
  { id: "bybit", name: "Bybit", url: "https://www.bybit.com" },
  { id: "upbit", name: "Upbit", url: "https://upbit.com" },
  { id: "kraken", name: "Kraken", url: "https://www.kraken.com" },
  { id: "kucoin", name: "KuCoin", url: "https://www.kucoin.com" },
  { id: "gate", name: "Gate", url: "https://www.gate.com" },
  { id: "bitget", name: "Bitget", url: "https://www.bitget.com" },
  { id: "bitstamp", name: "Bitstamp", url: "https://www.bitstamp.net" },
] as const;

export type CexVenueId = (typeof CEX_VENUES)[number]["id"];

export function isCexVenueId(v: string | null): v is CexVenueId {
  return CEX_VENUES.some((venue) => venue.id === v);
}

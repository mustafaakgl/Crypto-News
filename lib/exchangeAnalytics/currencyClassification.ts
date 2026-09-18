// Pure — classifies a ticker's quote (target) currency so a per-exchange
// breakdown can separate fiat, stablecoin, and other-crypto pairs rather
// than lumping them together.
import type { QuoteCurrencyType } from "@/lib/exchangeAnalytics/types";

const FIAT = new Set(["USD", "EUR", "GBP", "JPY", "KRW", "CHF", "AUD", "CAD", "TRY", "BRL", "IDR", "INR", "NGN"]);

const STABLECOIN = new Set([
  "USDT", "USDC", "DAI", "BUSD", "TUSD", "FDUSD", "USDP", "USDD", "GUSD", "PYUSD", "USD1", "USDE", "FRAX", "LUSD",
]);

export function classifyQuoteCurrency(symbol: string): QuoteCurrencyType {
  const upper = symbol.toUpperCase();
  if (FIAT.has(upper)) return "fiat";
  if (STABLECOIN.has(upper)) return "stablecoin";
  return "crypto";
}

const MAJOR_BASE_ASSETS = new Set(["BTC", "ETH", "SOL"]);

// Buckets a pair's BASE asset into BTC / ETH / SOL / Other — never merges
// the two sides of a single pair into more than one bucket.
export function classifyBaseAsset(symbol: string): "BTC" | "ETH" | "SOL" | "Other" {
  const upper = symbol.toUpperCase();
  return MAJOR_BASE_ASSETS.has(upper) ? (upper as "BTC" | "ETH" | "SOL") : "Other";
}

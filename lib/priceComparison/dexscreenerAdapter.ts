import "server-only";
import { fetchJson } from "@/lib/httpClient";
import type { PriceObservation } from "@/lib/priceComparison/types";

const VENUE_ID = "uniswap-weth-usdt";
const VENUE_NAME = "Uniswap (WETH/USDT)";
const PAIR = "WETH/USDT";

// DexScreener's docs don't publish a rate limit for this specific endpoint
// (/latest/dex/pairs/{chainId}/{pairId}) — other endpoints are documented
// at 60 req/min. Paced conservatively; the real ceiling is the shared
// service-level cache (30-60s), which limits this to ~1-2 req/min
// regardless of site traffic — see lib/priceComparison/service.ts.
const PACED = { key: "dexscreener", minIntervalMs: 1000 };

// Fixed by an explicit, one-time rule: of the Ethereum-mainnet Uniswap
// WETH/USDT pairs DexScreener lists, this is the one with the highest USD
// liquidity at selection time (2026-09-18: $113.9M vs the next-largest at
// $8.3M — not a close call). Confirmed live: chainId "ethereum", dexId
// "uniswap", labels ["v3"], base/quote token addresses below match the
// canonical WETH and USDT contracts. Pinned here rather than re-selected by
// "highest liquidity" on every request — a liquidity-based re-pick could
// silently swap which pool is being shown; changing this is a deliberate
// code change, not a runtime decision.
export const UNISWAP_WETH_USDT_POOL = {
  chainId: "ethereum",
  network: "Ethereum mainnet",
  dexId: "uniswap",
  protocolVersion: "Uniswap V3",
  pairAddress: "0x4e68Ccd3E89f51C3074ca5072bbAC773960dFa36",
  baseTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  quoteTokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
} as const;

function unavailable(error: string, fetchedAtIso: string): PriceObservation {
  return {
    venueId: VENUE_ID,
    venueName: VENUE_NAME,
    venueType: "dex",
    pair: PAIR,
    status: "unavailable",
    price: null,
    quoteCurrency: "USDT",
    priceType: null,
    sourceTimeIso: null,
    fetchedAtIso,
    error,
    network: UNISWAP_WETH_USDT_POOL.network,
    pairAddress: UNISWAP_WETH_USDT_POOL.pairAddress,
    protocolVersion: UNISWAP_WETH_USDT_POOL.protocolVersion,
  };
}

export async function fetchUniswapWethUsdt(): Promise<PriceObservation> {
  const fetchedAtIso = new Date().toISOString();
  const { chainId, pairAddress } = UNISWAP_WETH_USDT_POOL;
  const result = await fetchJson(
    `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddress}`,
    "DexScreener Uniswap WETH/USDT",
    0,
    PACED
  );
  if (!result.ok) return unavailable(result.error, fetchedAtIso);

  const data = result.data as { pairs?: unknown };
  const pairs = Array.isArray(data.pairs) ? data.pairs : null;
  const pair = pairs?.[0] as
    | { baseToken?: { address?: unknown }; quoteToken?: { address?: unknown }; priceNative?: unknown }
    | undefined;
  if (!pair) return unavailable("DexScreener Uniswap WETH/USDT: pair not found in response.", fetchedAtIso);

  // Verified on EVERY read, not just at selection time — a provider
  // response shape change or upstream data error could otherwise silently
  // feed a different pair's price under this pool's fixed label.
  const baseAddr = typeof pair.baseToken?.address === "string" ? pair.baseToken.address.toLowerCase() : null;
  const quoteAddr = typeof pair.quoteToken?.address === "string" ? pair.quoteToken.address.toLowerCase() : null;
  if (baseAddr !== UNISWAP_WETH_USDT_POOL.baseTokenAddress.toLowerCase() || quoteAddr !== UNISWAP_WETH_USDT_POOL.quoteTokenAddress.toLowerCase()) {
    return unavailable(
      "DexScreener Uniswap WETH/USDT: response token addresses did not match the pinned pool — refused rather than showing an unverified price.",
      fetchedAtIso
    );
  }

  // priceNative = price of the BASE token (WETH) in QUOTE token (USDT)
  // units — the one field that genuinely IS "WETH priced in USDT".
  // priceUsd is a DIFFERENT quantity (WETH priced in USD) that only looks
  // similar because USDT is ~pegged to USD; it is never substituted here.
  // Also never derived from liquidity.base/liquidity.quote — for a
  // concentrated-liquidity (V3) pool that ratio reflects positions within
  // tracked ranges, not the current trading price (confirmed by comparing
  // the two live: they differ by ~1.8%, this pool's actual liquidity.base
  // and .quote produce ~2556.8, not the real priceNative ~2512.14).
  const priceNative = typeof pair.priceNative === "string" ? Number(pair.priceNative) : null;
  if (priceNative === null || !isFinite(priceNative)) {
    return unavailable("DexScreener Uniswap WETH/USDT: priceNative missing or invalid.", fetchedAtIso);
  }

  return {
    venueId: VENUE_ID,
    venueName: VENUE_NAME,
    venueType: "dex",
    pair: PAIR,
    status: "ok",
    price: priceNative,
    quoteCurrency: "USDT",
    priceType: "pool_price",
    // DexScreener's pair response has no field for when this price was
    // last observed/updated (only pairCreatedAt, the pool's creation time —
    // never substituted for a live price timestamp).
    sourceTimeIso: null,
    fetchedAtIso,
    error: null,
    network: UNISWAP_WETH_USDT_POOL.network,
    pairAddress: UNISWAP_WETH_USDT_POOL.pairAddress,
    protocolVersion: UNISWAP_WETH_USDT_POOL.protocolVersion,
  };
}

import "server-only";
import { delay, fetchJson } from "@/lib/httpClient";
import type { Candle, CandleResolution } from "@/lib/exchangeVolume/types";
import type { GapAsset } from "@/lib/priceGap/types";

export type DexPool = {
  id: string;
  name: string;
  network: string; // GeckoTerminal network id
  networkLabel: string;
  address: string;
  // Which side of GeckoTerminal's pool pair is the asset; the other side must be USDT.
  assetSide: "base" | "quote";
  assetSymbols: string[];
};

// Pinned, not re-picked per request: the most liquid USDT pool per chain as
// of 2026-09 (GeckoTerminal reserves: ETH mainnet $112M / $34M, Arbitrum
// $6.8M / $4.6M, BSC $5.5M / $25M). USDT keeps every venue in one quote unit.
export const DEX_POOLS: Record<GapAsset, DexPool[]> = {
  ETH: [
    { id: "uniswap-eth", name: "Uniswap V3", network: "eth", networkLabel: "Ethereum", address: "0x4e68ccd3e89f51c3074ca5072bbac773960dfa36", assetSide: "base", assetSymbols: ["WETH"] },
    { id: "uniswap-arbitrum", name: "Uniswap V3", network: "arbitrum", networkLabel: "Arbitrum", address: "0x641c00a822e8b671738d32a431a4fb6074e5c79d", assetSide: "base", assetSymbols: ["WETH"] },
    { id: "pancakeswap-bsc", name: "PancakeSwap V3", network: "bsc", networkLabel: "BNB Chain", address: "0xbe141893e4c6ad9272e8c04bab7e6a10604501a5", assetSide: "base", assetSymbols: ["ETH"] },
  ],
  BTC: [
    { id: "uniswap-eth", name: "Uniswap V3", network: "eth", networkLabel: "Ethereum", address: "0x56534741cd8b152df6d48adf7ac51f75169a83b2", assetSide: "base", assetSymbols: ["WBTC"] },
    { id: "uniswap-arbitrum", name: "Uniswap V3", network: "arbitrum", networkLabel: "Arbitrum", address: "0x5969efdde3cf5c0d9a88ae51e47d721096a97203", assetSide: "base", assetSymbols: ["WBTC"] },
    { id: "pancakeswap-bsc", name: "PancakeSwap V3", network: "bsc", networkLabel: "BNB Chain", address: "0x46cf1cf8c69595804ba91dfdd8d6b960c9b0a7c4", assetSide: "quote", assetSymbols: ["BTCB"] },
  ],
};

// The free API allows ~30 calls/min and returned 429s well below that in testing.
const GECKOTERMINAL_PACE = { key: "geckoterminal", minIntervalMs: 3000 };
const RATE_LIMIT_RETRY_MS = 12_000;
const REVALIDATE: Record<CandleResolution, number> = { "1h": 300, "1d": 3600 };

export function poolUrl(pool: DexPool): string {
  return `https://www.geckoterminal.com/${pool.network}/pools/${pool.address}`;
}

// Returns closes in USDT per unit of the asset, plus the pair label as the pool actually trades it.
export async function fetchPoolCandles(pool: DexPool, resolution: CandleResolution): Promise<{ pair: string; candles: Candle[] }> {
  const timeframe = resolution === "1h" ? "hour" : "day";
  const url = `https://api.geckoterminal.com/api/v2/networks/${pool.network}/pools/${pool.address}/ohlcv/${timeframe}?aggregate=1&limit=1000&currency=token&token=${pool.assetSide}`;
  const label = `GeckoTerminal ${pool.name} (${pool.networkLabel})`;
  let result = await fetchJson(url, label, REVALIDATE[resolution], GECKOTERMINAL_PACE);
  // GeckoTerminal's 429s carry no Retry-After, so fetchJson won't retry them itself.
  if (!result.ok && result.error.includes("rate limit")) {
    await delay(RATE_LIMIT_RETRY_MS);
    result = await fetchJson(url, label, REVALIDATE[resolution], GECKOTERMINAL_PACE);
  }
  if (!result.ok) throw new Error(result.error);

  const data = result.data as {
    data?: { attributes?: { ohlcv_list?: unknown } };
    meta?: { base?: { symbol?: unknown }; quote?: { symbol?: unknown } };
  };
  const base = String(data.meta?.base?.symbol ?? "");
  const quote = String(data.meta?.quote?.symbol ?? "");
  // With token=quote GeckoTerminal swaps base/quote in its response, so the
  // asset must always come back as `base`, priced in USDT.
  if (!pool.assetSymbols.includes(base) || quote !== "USDT") {
    throw new Error(`GeckoTerminal ${pool.name} (${pool.networkLabel}): expected ${pool.assetSymbols.join("/")}/USDT, got ${base}/${quote}.`);
  }

  const rows = data.data?.attributes?.ohlcv_list;
  if (!Array.isArray(rows)) throw new Error(`GeckoTerminal ${pool.name}: unexpected response shape.`);
  const candles: Candle[] = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    const startMs = Number(r[0]) * 1000;
    const close = Number(r[4]);
    // r[5] is USD volume, not base volume, and isn't needed for price gaps.
    if (isFinite(startMs) && isFinite(close) && close > 0) candles.push({ startMs, close, baseVolume: 0 });
  }
  return { pair: `${base}/USDT`, candles: candles.sort((a, b) => a.startMs - b.startMs) };
}

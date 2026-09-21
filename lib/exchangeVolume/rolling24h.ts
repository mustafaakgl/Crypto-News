// Pure — no network, no "server-only"; exercised by scripts/verify-exchange-volume.ts.

export type PricedTicker = { base: string; quote: string; last: number; quoteVolume: number };

export type Rolling24hTotals = {
  totalUsd: number;
  trackedUsd: number;
  stableSwapUsd: number; // stablecoin ↔ stablecoin / USD pairs (USDC/USDT, USDT/USD, …), included in totalUsd
  pairsCounted: number;
  pairsUnvalued: number; // pairs with volume whose quote currency couldn't be priced in USD
  unvaluedQuotes: string[];
};

// Valued at $1. A depeg would skew these pairs' USD value, never their inclusion.
export const USD_STABLES = new Set(["USD", "USDT", "USDC", "FDUSD", "DAI", "TUSD", "USDP", "PYUSD", "USD1", "USDE", "BUSD", "RLUSD", "USDS", "USDG"]);

// Prices every quote currency in USD from the venue's OWN pairs, so no
// external FX source is needed: Q/stable directly (EUR/USDT), stable/Q
// inverted (USDT/TRY, Upbit's KRW-USDT), or via BTC (BTC/Q against BTC's
// USD price). Among several candidates, the one with the most USD volume wins.
export function quoteUsdPrices(tickers: PricedTicker[]): Map<string, number> {
  const best = new Map<string, { price: number; weightUsd: number }>();
  const offer = (q: string, price: number, weightUsd: number) => {
    if (USD_STABLES.has(q) || !(price > 0) || !isFinite(price)) return;
    const cur = best.get(q);
    if (!cur || weightUsd > cur.weightUsd) best.set(q, { price, weightUsd });
  };

  for (const t of tickers) {
    if (USD_STABLES.has(t.quote)) offer(t.base, t.last, t.quoteVolume);
    if (USD_STABLES.has(t.base)) offer(t.quote, 1 / t.last, t.quoteVolume / t.last);
  }
  const btcUsd = best.get("BTC")?.price;
  if (btcUsd) {
    const pricedDirectly = new Set(best.keys());
    for (const t of tickers) {
      if (t.base !== "BTC" || USD_STABLES.has(t.quote) || pricedDirectly.has(t.quote)) continue;
      const price = btcUsd / t.last;
      const cur = best.get(t.quote);
      if (!cur || t.quoteVolume * price > cur.weightUsd) best.set(t.quote, { price, weightUsd: t.quoteVolume * price });
    }
  }

  const out = new Map<string, number>();
  for (const s of USD_STABLES) out.set(s, 1);
  for (const [q, v] of best) out.set(q, v.price);
  return out;
}

export function rolling24hTotals(tickers: PricedTicker[], isTracked: (base: string, quote: string) => boolean): Rolling24hTotals {
  const prices = quoteUsdPrices(tickers);
  let totalUsd = 0;
  let trackedUsd = 0;
  let stableSwapUsd = 0;
  let pairsCounted = 0;
  let pairsUnvalued = 0;
  const unvalued = new Set<string>();

  for (const t of tickers) {
    if (t.quoteVolume <= 0) continue;
    const price = prices.get(t.quote);
    if (price === undefined) {
      pairsUnvalued++;
      unvalued.add(t.quote);
      continue;
    }
    const usd = t.quoteVolume * price;
    pairsCounted++;
    totalUsd += usd;
    if (isTracked(t.base, t.quote)) trackedUsd += usd;
    if (USD_STABLES.has(t.base) && USD_STABLES.has(t.quote)) stableSwapUsd += usd;
  }

  return { totalUsd, trackedUsd, stableSwapUsd, pairsCounted, pairsUnvalued, unvaluedQuotes: [...unvalued].sort() };
}

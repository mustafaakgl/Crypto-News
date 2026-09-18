export type MarketAsset = {
  id: string; // CoinGecko id, e.g. "bitcoin"
  symbol: string; // uppercase ticker, e.g. "BTC"
  name: string;
  image: string | null;
  rank: number | null;
  usd: number | null;
  changePct24h: number | null;
  marketCapUsd: number | null;
  volumeUsd: number | null;
  lastUpdated: string | null; // ISO, per-asset
};

export type MarketPricesResult = {
  assets: MarketAsset[];
  asOf: string | null; // ISO, overall snapshot time (oldest per-asset update)
  source: "CoinGecko";
  scope: "Top 100 by market cap";
  error: string | null;
};

const REVALIDATE_SECONDS = 600;
const PER_PAGE = 100;

// Homepage highlight strip. A fixed, curated set rather than a literal
// "first N by rank" cut, so the same five majors always show regardless of
// day-to-day rank churn just outside the top 10.
export const HOMEPAGE_SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "BNB"];

export async function getMarketPrices(): Promise<MarketPricesResult> {
  const url =
    `https://api.coingecko.com/api/v3/coins/markets` +
    `?vs_currency=usd&order=market_cap_desc&per_page=${PER_PAGE}&page=1` +
    `&price_change_percentage=24h&sparkline=false`;

  try {
    const res = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Array<{
      id: string;
      symbol: string;
      name: string;
      image?: string | null;
      market_cap_rank: number | null;
      current_price: number | null;
      price_change_percentage_24h?: number | null;
      market_cap: number | null;
      total_volume: number | null;
      last_updated: string | null;
    }>;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("empty response");
    }

    const assets: MarketAsset[] = data.map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      image: c.image ?? null,
      rank: c.market_cap_rank ?? null,
      usd: typeof c.current_price === "number" ? c.current_price : null,
      changePct24h: typeof c.price_change_percentage_24h === "number" ? c.price_change_percentage_24h : null,
      marketCapUsd: typeof c.market_cap === "number" ? c.market_cap : null,
      volumeUsd: typeof c.total_volume === "number" ? c.total_volume : null,
      lastUpdated: c.last_updated ?? null,
    }));

    const updateTimes = assets
      .map((a) => (a.lastUpdated ? new Date(a.lastUpdated).getTime() : null))
      .filter((t): t is number => typeof t === "number" && !isNaN(t));
    const asOf = updateTimes.length > 0 ? new Date(Math.min(...updateTimes)).toISOString() : null;

    return { assets, asOf, source: "CoinGecko", scope: "Top 100 by market cap", error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { assets: [], asOf: null, source: "CoinGecko", scope: "Top 100 by market cap", error: message };
  }
}

export function pickHomepageAssets(result: MarketPricesResult): MarketAsset[] {
  const bySymbol = new Map(result.assets.map((a) => [a.symbol, a]));
  return HOMEPAGE_SYMBOLS.map(
    (symbol) =>
      bySymbol.get(symbol) ?? {
        id: symbol.toLowerCase(),
        symbol,
        name: symbol,
        image: null,
        rank: null,
        usd: null,
        changePct24h: null,
        marketCapUsd: null,
        volumeUsd: null,
        lastUpdated: null,
      }
  );
}

export function pickTopAssets(result: MarketPricesResult, count: number): MarketAsset[] {
  return [...result.assets].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)).slice(0, count);
}

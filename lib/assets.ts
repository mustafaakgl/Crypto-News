// Lightweight keyword tagging so news items can show "related assets".
// Deliberately conservative: only unambiguous names/tickers are matched,
// so generic words (e.g. "link", "ada") never produce a false tag.

type AssetDef = {
  symbol: string;
  patterns: RegExp[];
};

function word(pattern: string): RegExp {
  return new RegExp(`\\b${pattern}\\b`, "i");
}

const ASSET_DEFS: AssetDef[] = [
  { symbol: "BTC", patterns: [word("BTC"), word("bitcoin")] },
  { symbol: "ETH", patterns: [word("ETH"), word("ethereum"), word("ether")] },
  { symbol: "SOL", patterns: [word("SOL"), word("solana")] },
  { symbol: "XRP", patterns: [word("XRP"), word("ripple")] },
  { symbol: "BNB", patterns: [word("BNB"), word("binance coin")] },
  { symbol: "DOGE", patterns: [word("DOGE"), word("dogecoin")] },
  { symbol: "ADA", patterns: [word("cardano")] },
  { symbol: "TRX", patterns: [word("TRX"), word("tron")] },
  { symbol: "LTC", patterns: [word("LTC"), word("litecoin")] },
  { symbol: "DOT", patterns: [word("polkadot")] },
  { symbol: "AVAX", patterns: [word("AVAX"), word("avalanche")] },
  { symbol: "LINK", patterns: [word("chainlink")] },
  { symbol: "MATIC", patterns: [word("polygon")] },
  { symbol: "TON", patterns: [word("toncoin"), word("TON")] },
  { symbol: "SHIB", patterns: [word("SHIB"), word("shiba inu")] },
  { symbol: "ATOM", patterns: [word("cosmos")] },
  { symbol: "XMR", patterns: [word("XMR"), word("monero")] },
  { symbol: "BCH", patterns: [word("bitcoin cash")] },
  { symbol: "USDT", patterns: [word("USDT"), word("tether")] },
  { symbol: "USDC", patterns: [word("USDC")] },
  { symbol: "NEAR", patterns: [word("near protocol")] },
  { symbol: "ZEC", patterns: [word("ZEC"), word("zcash")] },
];

export function detectAssets(text: string): string[] {
  const found = new Set<string>();
  for (const def of ASSET_DEFS) {
    if (def.patterns.some((pattern) => pattern.test(text))) {
      found.add(def.symbol);
    }
  }
  return Array.from(found);
}

export const KNOWN_ASSET_SYMBOLS = ASSET_DEFS.map((d) => d.symbol);

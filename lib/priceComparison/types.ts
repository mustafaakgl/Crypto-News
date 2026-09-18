export type PriceVenueType = "cex" | "dex";

// "last_trade" — the price of the most recent executed trade. "bid_ask_midpoint"
// — (best bid + best ask) / 2. "pool_price" — an AMM's own reported current
// price (e.g. from its current tick/reserves), not a discrete trade. Every
// observation states which one it is; comparisons never assume they match.
export type PriceType = "last_trade" | "bid_ask_midpoint" | "pool_price";

export type PriceObservationStatus = "ok" | "unavailable";

export type PriceObservation = {
  venueId: string;
  venueName: string;
  venueType: PriceVenueType;
  pair: string; // the REAL pair traded here, e.g. "ETH/USDT" or "WETH/USDT" — never generalized to "ETH/USDT" for a WETH venue
  status: PriceObservationStatus;
  price: number | null; // always in quoteCurrency units
  quoteCurrency: "USDT"; // fixed for this feature's first pass — every venue here quotes in USDT, never USD/USDC treated as equivalent
  priceType: PriceType | null;
  // The source's OWN observation time for this specific price, when it
  // exposes one — null (never a guess) when it doesn't. Distinct from
  // fetchedAtIso: calling three APIs back-to-back does not mean their
  // prices were observed at the same instant.
  sourceTimeIso: string | null;
  fetchedAtIso: string;
  error: string | null;
  // DEX identification — always populated for venueType "dex", so the exact
  // pool being read is never left implicit.
  network?: string;
  pairAddress?: string;
  protocolVersion?: string;
};

export type PriceDifference =
  | { status: "reference" }
  | { status: "unavailable"; reason: string }
  | { status: "computed"; percent: number };

export type PriceComparisonRow = {
  observation: PriceObservation;
  difference: PriceDifference;
};

export type PriceComparisonResult = {
  asset: "ETH";
  referenceVenueId: string;
  rows: PriceComparisonRow[];
  asOf: string;
  warnings: string[];
};

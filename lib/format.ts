// Locale-aware formatting helpers shared by the price and news UI.
// English UI only (en-GB), Europe/Berlin time zone per product decision.

export function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  const abs = Math.abs(value);

  // Large values: no decimals needed, thousands separators.
  if (abs >= 1000) {
    return `$${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
  }
  // Normal range: 2 decimals.
  if (abs >= 1) {
    return `$${value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  // Sub-$1 values need more precision or the number reads as "$0.00".
  // Scale decimals to the first 3 significant digits.
  const magnitude = Math.floor(Math.log10(abs));
  const decimals = Math.min(10, Math.max(2, -magnitude + 2));
  return `$${value.toLocaleString("en-GB", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatMarketCap(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  return `$${value.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// Funding rates are tiny (often ±0.0001%–0.05%) — one decimal would round
// almost everything to 0.0%, so this keeps 4 decimal places.
export function formatFundingPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(4)}%`;
}

export function formatQuantity(value: number, symbol: string): string {
  return `${value.toLocaleString("en-GB", { maximumFractionDigits: 2 })} ${symbol}`;
}

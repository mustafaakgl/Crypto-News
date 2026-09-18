import type { PriceActionResult } from "@/lib/priceAction";
import type { Asset, Interval } from "@/lib/klines";

// Builds a retrieval query from the app's OWN computed concepts — trend
// structure, confirmed swing points, key price levels, breakout candidates
// — never from free-form client text.
export function buildPriceActionQuery(asset: Asset, interval: Interval, result: PriceActionResult): string {
  const terms: string[] = [];

  switch (result.trend) {
    case "Uptrend":
      terms.push("uptrend", "bull trend", "higher high", "higher low", "trend continuation");
      break;
    case "Downtrend":
      terms.push("downtrend", "bear trend", "lower high", "lower low", "trend continuation");
      break;
    case "Mixed structure":
      terms.push("trading range", "sideways", "pullback", "reversal", "two-sided");
      break;
    case "Insufficient data":
      terms.push("spectrum of price action", "trend", "trading range");
      break;
  }

  if (result.pivots.highs.length > 0 || result.pivots.lows.length > 0) {
    terms.push("swing high", "swing low", "horizontal line", "key price level");
  }

  if (result.breakout && result.breakout.direction !== "none") {
    terms.push("breakout", result.breakout.direction === "up" ? "bull breakout" : "bear breakout", "test", "follow-through");
  }

  terms.push(asset === "BTC" ? "bitcoin" : "ethereum", interval);

  return terms.join(" ");
}

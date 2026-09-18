"use client";

import { useState } from "react";
import type { MarketAsset } from "@/lib/prices";
import { PriceStrip } from "@/components/PriceStrip";
import { StocksWidget } from "@/components/StocksWidget";

export function CryptoStocksTabs({
  assets,
  asOf,
  error,
}: {
  assets: MarketAsset[];
  asOf: string | null;
  error: string | null;
}) {
  const [tab, setTab] = useState<"crypto" | "stocks">("crypto");
  const [stocksMounted, setStocksMounted] = useState(false);

  function selectStocks() {
    setTab("stocks");
    setStocksMounted(true);
  }

  return (
    <div>
      <div role="tablist" aria-label="Price category" className="flex gap-1 mb-2">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "crypto"}
          onClick={() => setTab("crypto")}
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${
            tab === "crypto" ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
          }`}
        >
          Crypto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "stocks"}
          onClick={selectStocks}
          className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide border ${
            tab === "stocks" ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
          }`}
        >
          Stocks
        </button>
      </div>

      <div role="tabpanel" hidden={tab !== "crypto"}>
        <PriceStrip assets={assets} asOf={asOf} error={error} />
      </div>
      <div role="tabpanel" hidden={tab !== "stocks"}>
        {stocksMounted && <StocksWidget />}
      </div>
    </div>
  );
}

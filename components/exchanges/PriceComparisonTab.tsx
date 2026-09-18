"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceComparisonResult, PriceComparisonRow } from "@/lib/priceComparison/types";
import { clockTime } from "@/lib/time";

type Loadable = { state: "loading" | "ready" | "error"; data: (PriceComparisonResult & { stale: boolean }) | null; error: string | null };

const PRICE_TYPE_LABEL: Record<string, string> = {
  last_trade: "Last trade",
  bid_ask_midpoint: "Bid/ask midpoint",
  pool_price: "Provider-reported pool price",
};

// Prices are compared at sub-dollar precision (a 0.05% ETH difference is
// ~$1.25) — never rounded to whole dollars the way a headline USD figure
// elsewhere in the app might be.
function formatPrice(value: number): string {
  return value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function VenueTypeTag({ type }: { type: "cex" | "dex" }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide border px-1 ${type === "cex" ? "border-ink/30 text-ink/60" : "border-accent text-ink/70"}`}>
      {type.toUpperCase()}
    </span>
  );
}

function DataStatus({ row }: { row: PriceComparisonRow }) {
  if (row.observation.status === "ok") return <span className="text-ink/60">OK</span>;
  return <span className="text-ink/50" title={row.observation.error ?? undefined}>Unavailable</span>;
}

function DiffCell({ row }: { row: PriceComparisonRow }) {
  const d = row.difference;
  if (d.status === "reference") return <span className="text-ink/50">Reference</span>;
  if (d.status === "unavailable") {
    return (
      <span className="text-ink/40" title={d.reason}>
        Unavailable
      </span>
    );
  }
  const sign = d.percent > 0 ? "+" : "";
  return (
    <span className={d.percent > 0 ? "text-green-700" : d.percent < 0 ? "text-red-700" : "text-ink/70"}>
      {sign}
      {d.percent.toFixed(3)}%<span className="block text-[10px] text-ink/40 font-normal normal-case">Indicative — time alignment unverified</span>
    </span>
  );
}

function SourceTimeCell({ row }: { row: PriceComparisonRow }) {
  if (row.observation.sourceTimeIso) {
    return (
      <span>
        {clockTime(row.observation.sourceTimeIso)} (Europe/Berlin)
        <span className="block text-[10px] text-ink/40">Fetched {clockTime(row.observation.fetchedAtIso)}</span>
      </span>
    );
  }
  return (
    <span>
      <span className="text-ink/45">Source time unavailable</span>
      <span className="block text-[10px] text-ink/40">Fetched {clockTime(row.observation.fetchedAtIso)}</span>
    </span>
  );
}

export function PriceComparisonTab() {
  const [loadable, setLoadable] = useState<Loadable>({ state: "loading", data: null, error: null });
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const thisRequestId = ++requestIdRef.current;
    setLoadable((prev) => ({ state: "loading", data: prev.data, error: null }));
    fetch("/api/price-comparison")
      .then((res) => res.json())
      .then((json: PriceComparisonResult & { stale: boolean }) => {
        if (thisRequestId !== requestIdRef.current) return;
        setLoadable({ state: "ready", data: json, error: null });
      })
      .catch(() => {
        if (thisRequestId !== requestIdRef.current) return;
        setLoadable({ state: "error", data: null, error: "Could not load price comparison data." });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = loadable.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/70">Compare reported ETH market prices across selected centralized and decentralized venues.</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={load}
          disabled={loadable.state === "loading"}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border border-ink/30 text-ink/60 hover:border-ink disabled:opacity-50"
        >
          {loadable.state === "loading" ? "Refreshing…" : "Refresh"}
        </button>
        {loadable.data && (
          <p className="text-[11px] text-ink/50">
            Reference: <strong className="text-ink/70">Binance ETH/USDT</strong> · As of {clockTime(loadable.data.asOf)} (Europe/Berlin)
            {loadable.data.stale && <span className="text-accent"> · refreshing in the background…</span>}
          </p>
        )}
      </div>

      {loadable.state === "error" && (
        <div className="border border-ink/20 px-4 py-6 text-center">
          <p className="text-sm text-ink/60">{loadable.error}</p>
        </div>
      )}

      {loadable.data && loadable.data.warnings.length > 0 && (
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">Partial data: {loadable.data.warnings.join(" ")}</p>
      )}

      {loadable.data && (
        <>
          {/* Desktop / wide table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">ETH price comparison across CEX and DEX venues</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
                  <th scope="col" className="py-2 pr-2">
                    Venue
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Pair
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    Price
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Price type
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    Diff vs reference
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    Source time / Fetched at
                  </th>
                  <th scope="col" className="py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.observation.venueId} className="border-b border-rule/60 align-top">
                    <td className="py-2 pr-2">
                      <span className="font-semibold">{row.observation.venueName}</span> <VenueTypeTag type={row.observation.venueType} />
                      {row.observation.venueType === "dex" && (
                        <p className="text-[10px] text-ink/40 mt-0.5">
                          {row.observation.network} · {row.observation.protocolVersion} · {row.observation.pairAddress}
                        </p>
                      )}
                    </td>
                    <td className="py-2 pr-2">{row.observation.pair}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {row.observation.price !== null ? formatPrice(row.observation.price) : "—"}
                      <span className="block text-[10px] text-ink/40">{row.observation.quoteCurrency}</span>
                    </td>
                    <td className="py-2 pr-2 text-ink/60">{row.observation.priceType ? PRICE_TYPE_LABEL[row.observation.priceType] : "—"}</td>
                    <td className="py-2 pr-2 text-right">
                      <DiffCell row={row} />
                    </td>
                    <td className="py-2 pr-2 text-ink/60">
                      <SourceTimeCell row={row} />
                    </td>
                    <td className="py-2">
                      <DataStatus row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile / stacked cards */}
          <div className="sm:hidden space-y-3">
            {rows.map((row) => (
              <div key={row.observation.venueId} className="border border-ink/20 px-3 py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">
                    {row.observation.venueName} <VenueTypeTag type={row.observation.venueType} />
                  </span>
                  <DataStatus row={row} />
                </div>
                <p className="text-xs text-ink/60">Pair: {row.observation.pair}</p>
                {row.observation.venueType === "dex" && (
                  <p className="text-[10px] text-ink/40">
                    {row.observation.network} · {row.observation.protocolVersion} · {row.observation.pairAddress}
                  </p>
                )}
                <p className="text-sm tabular-nums">
                  {row.observation.price !== null ? formatPrice(row.observation.price) : "—"} <span className="text-[10px] text-ink/40">{row.observation.quoteCurrency}</span>
                </p>
                <p className="text-xs text-ink/60">Price type: {row.observation.priceType ? PRICE_TYPE_LABEL[row.observation.priceType] : "—"}</p>
                <p className="text-xs">
                  Diff vs reference: <DiffCell row={row} />
                </p>
                <p className="text-xs text-ink/60">
                  <SourceTimeCell row={row} />
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <details className="border border-ink/20 px-4 py-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Methodology &amp; sources</summary>
        <div className="mt-2 space-y-2 text-xs text-ink/60">
          <p>
            <strong>Sources</strong> — Binance and Bybit: each venue&apos;s own public spot market-data API, most recent executed trade
            (no key). Uniswap: DexScreener&apos;s public API, reading one fixed WETH/USDT pool on Ethereum mainnet (Uniswap V3, address
            shown above) — selected once by highest USD liquidity among Ethereum Uniswap WETH/USDT pairs, pinned rather than re-picked on
            every load.
          </p>
          <p>
            <strong>ETH vs WETH</strong> — Binance and Bybit report native ETH. Uniswap is an Ethereum smart contract and can only hold
            ERC-20 tokens, so it trades WETH (Wrapped Ether) — an ERC-20 token backed 1:1 by ETH locked in a canonical contract, not a
            different asset. The DEX row is always labeled WETH/USDT, never silently shown as if it were the same ticker as the CEX rows.
          </p>
          <p>
            <strong>Price types</strong> — Binance/Bybit show &quot;Last trade&quot;: the price of the most recent executed trade, with
            that trade&apos;s own real timestamp. Uniswap shows &quot;Provider-reported pool price&quot;: DexScreener&apos;s own current
            price for the pool (not a discrete trade, and — for this concentrated-liquidity V3 pool — deliberately not the same thing as
            the pool&apos;s total token balance ratio, which can differ from the actual trading price). DexScreener&apos;s pair data
            carries no timestamp for when that price was last computed, so its source time is shown as unavailable rather than guessed.
          </p>
          <p>
            <strong>Reference &amp; difference</strong> — Binance ETH/USDT is always the reference; if it&apos;s unavailable, every other
            row&apos;s difference shows as unavailable rather than silently comparing against something else. The percentage is
            (price − reference) / reference × 100, computed only when both prices are present, numeric, quoted in USDT, and not stale
            (a &quot;last trade&quot; older than 5 minutes is treated as stale and excluded). Every computed difference is labeled
            &quot;Indicative — time alignment unverified&quot;: fetching three APIs in the same request does not mean their prices were
            observed at the same instant, and this page never claims otherwise.
          </p>
          <p>
            <strong>What this is not</strong> — no trade size, exchange fee, gas cost, or slippage is included in any figure here; a
            difference shown is never labeled a &quot;best exchange&quot;, a guaranteed profit, or an arbitrage opportunity.
          </p>
          <p>
            <strong>Scope</strong> — two CEXs and one DEX pool do not represent the largest exchanges or the whole DEX market; this is a
            first, limited pass (ETH only).
          </p>
          <p>
            <strong>Caching</strong> — all three sources are fetched in parallel and cached together for up to 45 seconds, shared across
            every visitor; a manual refresh re-requests this same cache rather than bypassing it.
          </p>
        </div>
      </details>
    </div>
  );
}

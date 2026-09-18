"use client";

import { useEffect, useState } from "react";
import type { CexTickerBreakdown } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";

const QUOTE_TYPE_LABEL: Record<string, string> = { fiat: "Fiat (USD/EUR/…)", stablecoin: "Stablecoin (USDT/USDC/…)", crypto: "Other crypto" };

function BreakdownList({ entries, labelFor }: { entries: { key: string; volumeUsd: number }[]; labelFor: (key: string) => string }) {
  const total = entries.reduce((s, e) => s + e.volumeUsd, 0);
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-ink/40 border-b border-rule/60">
          <th scope="col" className="py-1 pr-2 font-normal">
            Group
          </th>
          <th scope="col" className="py-1 pr-2 font-normal text-right">
            Volume (USD)
          </th>
          <th scope="col" className="py-1 font-normal text-right w-16">
            Share of retrieved pairs
          </th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.key} className="border-b border-rule/60">
            <td className="py-1 pr-2">{labelFor(e.key)}</td>
            <td className="py-1 pr-2 text-right tabular-nums">{formatMarketCap(e.volumeUsd)}</td>
            <td className="py-1 text-right tabular-nums text-ink/50">{total > 0 ? `${((e.volumeUsd / total) * 100).toFixed(0)}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExchangeDrilldown({ exchangeId, exchangeName }: { exchangeId: string; exchangeName: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<(CexTickerBreakdown & { stale?: boolean }) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    fetch(`/api/exchanges/${exchangeId}/tickers`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json && json.byBaseAsset) {
          setData(json as CexTickerBreakdown & { stale?: boolean });
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [exchangeId]);

  return (
    <div className="border border-ink/20 bg-accent/5 px-4 py-3 mt-2 space-y-3">
      <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">{exchangeName} — pair breakdown</p>
      <p className="text-[10px] text-ink/50">
        Current ticker snapshot (roughly the trailing 24h) — independent of whatever 7D/30D/1Y period is selected above, never presented
        as that period&apos;s distribution.
      </p>

      {state === "loading" && <p className="text-xs text-ink/50 animate-pulse">Loading pair breakdown…</p>}
      {state === "error" && <p className="text-xs text-ink/50">Could not load a pair breakdown for this exchange right now.</p>}

      {state === "ready" && data && (
        <>
          <p className="text-xs text-ink/70 font-semibold">
            {data.pairsConsidered} pair{data.pairsConsidered === 1 ? "" : "s"} retrieved (page 1 only)
            {data.pairsExcludedAnomalousOrStale > 0 && `, ${data.pairsExcludedAnomalousOrStale} excluded as anomalous/stale`}
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink/40 mb-1">By base asset</p>
              <BreakdownList entries={data.byBaseAsset} labelFor={(k) => k} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink/40 mb-1">By quote currency type</p>
              <BreakdownList entries={data.byQuoteType} labelFor={(k) => QUOTE_TYPE_LABEL[k] ?? k} />
            </div>
          </div>
          <p className="text-[10px] text-ink/40">
            {data.coverageNote}
            {data.stale && <span className="text-accent"> Refreshing in the background…</span>}
          </p>
        </>
      )}
    </div>
  );
}

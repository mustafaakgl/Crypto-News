"use client";

import { useEffect, useState } from "react";
import type { CexTickerBreakdown } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";

const QUOTE_TYPE_LABEL: Record<string, string> = { fiat: "Fiat (USD/EUR/…)", stablecoin: "Stablecoin (USDT/USDC/…)", crypto: "Other crypto" };

function BreakdownList({ entries, labelFor }: { entries: { key: string; volumeUsd: number }[]; labelFor: (key: string) => string }) {
  const total = entries.reduce((s, e) => s + e.volumeUsd, 0);
  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        {entries.map((e) => (
          <tr key={e.key} className="border-b border-rule/60">
            <td className="py-1 pr-2">{labelFor(e.key)}</td>
            <td className="py-1 pr-2 text-right tabular-nums">{formatMarketCap(e.volumeUsd)}</td>
            <td className="py-1 text-right tabular-nums text-ink/50 w-16">{total > 0 ? `${((e.volumeUsd / total) * 100).toFixed(0)}%` : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExchangeDrilldown({ exchangeId, exchangeName }: { exchangeId: string; exchangeName: string }) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<CexTickerBreakdown | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setData(null);
    fetch(`/api/exchanges/${exchangeId}/tickers`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json && json.byBaseAsset) {
          setData(json as CexTickerBreakdown);
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

      {state === "loading" && <p className="text-xs text-ink/50 animate-pulse">Loading pair breakdown…</p>}
      {state === "error" && <p className="text-xs text-ink/50">Could not load a pair breakdown for this exchange right now.</p>}

      {state === "ready" && data && (
        <>
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
          <p className="text-[10px] text-ink/40">{data.coverageNote}</p>
        </>
      )}
    </div>
  );
}

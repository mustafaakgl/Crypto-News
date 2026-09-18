"use client";

import { useEffect, useState } from "react";
import type { CexTickerBreakdown } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

function BreakdownList({
  entries,
  labelFor,
  t,
}: {
  entries: { key: string; volumeUsd: number }[];
  labelFor: (key: string) => string;
  t: Dictionary["exchangeDrilldown"];
}) {
  const total = entries.reduce((s, e) => s + e.volumeUsd, 0);
  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="text-left text-[10px] uppercase tracking-wide text-ink/40 border-b border-rule/60">
          <th scope="col" className="py-1 pr-2 font-normal">
            {t.colGroup}
          </th>
          <th scope="col" className="py-1 pr-2 font-normal text-right">
            {t.colVolumeUsd}
          </th>
          <th scope="col" className="py-1 font-normal text-right w-16">
            {t.colShareOfRetrieved}
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

export function ExchangeDrilldown({
  exchangeId,
  exchangeName,
  locale = "en",
}: {
  exchangeId: string;
  exchangeName: string;
  locale?: Locale;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<(CexTickerBreakdown & { stale?: boolean }) | null>(null);
  const t = getDictionary(locale).exchangeDrilldown;
  const quoteTypeLabel: Record<string, string> = { fiat: t.quoteTypeFiat, stablecoin: t.quoteTypeStablecoin, crypto: t.quoteTypeCrypto };

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
      <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">{t.pairBreakdown(exchangeName)}</p>
      <p className="text-[10px] text-ink/50">{t.scopeNote}</p>

      {state === "loading" && <p className="text-xs text-ink/50 animate-pulse">{t.loading}</p>}
      {state === "error" && <p className="text-xs text-ink/50">{t.error}</p>}

      {state === "ready" && data && (
        <>
          <p className="text-xs text-ink/70 font-semibold">{t.pairsRetrieved(data.pairsConsidered, data.pairsExcludedAnomalousOrStale)}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink/40 mb-1">{t.byBaseAsset}</p>
              <BreakdownList entries={data.byBaseAsset} labelFor={(k) => k} t={t} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-ink/40 mb-1">{t.byQuoteType}</p>
              <BreakdownList entries={data.byQuoteType} labelFor={(k) => quoteTypeLabel[k] ?? k} t={t} />
            </div>
          </div>
          <p className="text-[10px] text-ink/40">
            {data.coverageNote}
            {data.stale && <span className="text-accent"> {t.refreshingInBackground}</span>}
          </p>
        </>
      )}
    </div>
  );
}

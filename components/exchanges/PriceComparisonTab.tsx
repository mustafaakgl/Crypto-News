"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PriceComparisonResult, PriceComparisonRow } from "@/lib/priceComparison/types";
import { clockTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

type Loadable = { state: "loading" | "ready" | "error"; data: (PriceComparisonResult & { stale: boolean }) | null; error: string | null };

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

function DataStatus({ row, t }: { row: PriceComparisonRow; t: Dictionary["priceComparison"] }) {
  if (row.observation.status === "ok") return <span className="text-ink/60">{t.statusOk}</span>;
  return (
    <span className="text-ink/50" title={row.observation.error ?? undefined}>
      {t.statusUnavailable}
    </span>
  );
}

function DiffCell({ row, t }: { row: PriceComparisonRow; t: Dictionary["priceComparison"] }) {
  const d = row.difference;
  if (d.status === "reference") return <span className="text-ink/50">{t.diffReference}</span>;
  if (d.status === "unavailable") {
    return (
      <span className="text-ink/40" title={d.reason}>
        {t.diffUnavailable}
      </span>
    );
  }
  const sign = d.percent > 0 ? "+" : "";
  return (
    <span className={d.percent > 0 ? "text-green-700" : d.percent < 0 ? "text-red-700" : "text-ink/70"}>
      {sign}
      {d.percent.toFixed(3)}%<span className="block text-[10px] text-ink/40 font-normal normal-case">{t.indicativeUnverified}</span>
    </span>
  );
}

function SourceTimeCell({ row, t }: { row: PriceComparisonRow; t: Dictionary["priceComparison"] }) {
  if (row.observation.sourceTimeIso) {
    return (
      <span>
        {clockTime(row.observation.sourceTimeIso)} (Europe/Berlin)
        <span className="block text-[10px] text-ink/40">{t.fetched(clockTime(row.observation.fetchedAtIso))}</span>
      </span>
    );
  }
  return (
    <span>
      <span className="text-ink/45">{t.sourceTimeUnavailable}</span>
      <span className="block text-[10px] text-ink/40">{t.fetched(clockTime(row.observation.fetchedAtIso))}</span>
    </span>
  );
}

export function PriceComparisonTab({ locale = "en" }: { locale?: Locale }) {
  const [loadable, setLoadable] = useState<Loadable>({ state: "loading", data: null, error: null });
  const requestIdRef = useRef(0);
  const dict = getDictionary(locale);
  const t = dict.priceComparison;
  const priceTypeLabel: Record<string, string> = {
    last_trade: t.priceTypeLastTrade,
    bid_ask_midpoint: t.priceTypeBidAskMidpoint,
    pool_price: t.priceTypePoolPrice,
  };

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
        setLoadable({ state: "error", data: null, error: t.errorLoad });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = loadable.data?.rows ?? [];

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink/70">{t.intro}</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={load}
          disabled={loadable.state === "loading"}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border border-ink/30 text-ink/60 hover:border-ink disabled:opacity-50"
        >
          {loadable.state === "loading" ? t.refreshing : t.refresh}
        </button>
        {loadable.data && (
          <p className="text-[11px] text-ink/50">
            {t.referencePrefix}
            <strong className="text-ink/70">Binance ETH/USDT</strong>
            {t.referenceSuffix(clockTime(loadable.data.asOf))}
            {loadable.data.stale && <span className="text-accent">{t.refreshingInBackground}</span>}
          </p>
        )}
      </div>

      {loadable.state === "error" && (
        <div className="border border-ink/20 px-4 py-6 text-center">
          <p className="text-sm text-ink/60">{loadable.error}</p>
        </div>
      )}

      {loadable.data && loadable.data.warnings.length > 0 && (
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">{t.partialData(loadable.data.warnings.join(" "))}</p>
      )}

      {loadable.data && (
        <>
          {/* Desktop / wide table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">{t.tableCaption}</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
                  <th scope="col" className="py-2 pr-2">
                    {t.colVenue}
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    {t.colPair}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t.colPrice}
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    {t.colPriceType}
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right">
                    {t.colDiffVsReference}
                  </th>
                  <th scope="col" className="py-2 pr-2">
                    {t.colSourceTimeFetched}
                  </th>
                  <th scope="col" className="py-2">
                    {t.colStatus}
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
                    <td className="py-2 pr-2 text-ink/60">{row.observation.priceType ? priceTypeLabel[row.observation.priceType] : "—"}</td>
                    <td className="py-2 pr-2 text-right">
                      <DiffCell row={row} t={t} />
                    </td>
                    <td className="py-2 pr-2 text-ink/60">
                      <SourceTimeCell row={row} t={t} />
                    </td>
                    <td className="py-2">
                      <DataStatus row={row} t={t} />
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
                  <DataStatus row={row} t={t} />
                </div>
                <p className="text-xs text-ink/60">{t.mobilePairLabel(row.observation.pair)}</p>
                {row.observation.venueType === "dex" && (
                  <p className="text-[10px] text-ink/40">
                    {row.observation.network} · {row.observation.protocolVersion} · {row.observation.pairAddress}
                  </p>
                )}
                <p className="text-sm tabular-nums">
                  {row.observation.price !== null ? formatPrice(row.observation.price) : "—"} <span className="text-[10px] text-ink/40">{row.observation.quoteCurrency}</span>
                </p>
                <p className="text-xs text-ink/60">{t.mobilePriceTypeLabel(row.observation.priceType ? priceTypeLabel[row.observation.priceType] : "—")}</p>
                <p className="text-xs">
                  {t.mobileDiffLabel} <DiffCell row={row} t={t} />
                </p>
                <p className="text-xs text-ink/60">
                  <SourceTimeCell row={row} t={t} />
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <details className="border border-ink/20 px-4 py-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-ink/50 font-semibold">{t.methodologyAndSources}</summary>
        <div className="mt-2 space-y-2 text-xs text-ink/60">
          <p>
            <strong>{t.labelSources}</strong> — {t.methodologySources}
          </p>
          <p>
            <strong>{t.labelEthVsWeth}</strong> — {t.methodologyEthVsWeth}
          </p>
          <p>
            <strong>{t.labelPriceTypes}</strong> — {t.methodologyPriceTypes}
          </p>
          <p>
            <strong>{t.labelReferenceAndDifference}</strong> — {t.methodologyReferenceAndDifference}
          </p>
          <p>
            <strong>{t.labelWhatThisIsNot}</strong> — {t.methodologyWhatThisIsNot}
          </p>
          <p>
            <strong>{t.labelScope}</strong> — {t.methodologyScope}
          </p>
          <p>
            <strong>{t.labelCaching}</strong> — {t.methodologyCaching}
          </p>
        </div>
      </details>
    </div>
  );
}

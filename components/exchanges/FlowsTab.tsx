"use client";

import { useEffect, useRef, useState } from "react";
import type { ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { FLOW_ASSETS, FLOW_NETWORKS_BY_ASSET } from "@/lib/exchangeFlows/types";
import type { ExchangeFlowRow, ExchangeFlowsResult, ExchangeFlowDailySeries, FlowAsset, FlowNetwork } from "@/lib/exchangeFlows/types";
import { formatCompactQuantity } from "@/lib/format";
import { dateTime, utcDateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

function useFlowsOverview(asset: FlowAsset, network: FlowNetwork, period: ExchangePeriod, count: VenueCount) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ExchangeFlowsResult | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
    setData(null);
    const params = new URLSearchParams({ asset, period, count: String(count) });
    if (network) params.set("network", network);
    fetch(`/api/exchanges/flows?${params.toString()}`)
      .then((res) => res.json())
      .then((json: ExchangeFlowsResult) => {
        if (thisRequestId !== requestIdRef.current) return;
        setData(json);
        setState("ready");
      })
      .catch(() => {
        if (thisRequestId !== requestIdRef.current) return;
        setState("error");
      });
  }, [asset, network, period, count]);

  return { state, data };
}

function useFlowDailySeries(exchangeId: string | null, asset: FlowAsset, network: FlowNetwork, period: ExchangePeriod) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [series, setSeries] = useState<ExchangeFlowDailySeries>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!exchangeId) {
      setSeries(null);
      return;
    }
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
    setSeries(null);
    const params = new URLSearchParams({ asset, period });
    if (network) params.set("network", network);
    fetch(`/api/exchanges/flows/${exchangeId}/daily?${params.toString()}`)
      .then((res) => res.json())
      .then((json: { series: ExchangeFlowDailySeries }) => {
        if (thisRequestId !== requestIdRef.current) return;
        setSeries(json.series);
        setState("ready");
      })
      .catch(() => {
        if (thisRequestId !== requestIdRef.current) return;
        setState("error");
      });
  }, [exchangeId, asset, network, period]);

  return { state, series };
}

export function FlowsTab({
  period,
  count,
  asset,
  network,
  onAssetChange,
  onNetworkChange,
  locale = "en",
}: {
  period: ExchangePeriod;
  count: VenueCount;
  asset: FlowAsset;
  network: FlowNetwork;
  onAssetChange: (asset: FlowAsset) => void;
  onNetworkChange: (network: FlowNetwork) => void;
  locale?: Locale;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dict = getDictionary(locale);
  const t = dict.flows;
  const periodLabel = dict.exchangeAnalytics.periodLabels[period];
  const intl = locale === "de" ? "de-DE" : "en-GB";
  const qty = (v: number | null) => (v === null ? "—" : formatCompactQuantity(v, asset, intl));
  const utcDay = (iso: string) => iso.slice(0, 10);

  const availableNetworks = FLOW_NETWORKS_BY_ASSET[asset];

  useEffect(() => {
    setExpandedId(null);
  }, [asset, network, period, count]);

  const { state, data } = useFlowsOverview(asset, network, period, count);
  const daily = useFlowDailySeries(expandedId, asset, network, period);

  const netClass = (v: number | null) => (v === null || Math.abs(v) < 0.5 ? "" : v > 0 ? "text-emerald-700" : "text-red-700");
  const signed = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : ""}${qty(v)}`);

  function Row({ row }: { row: ExchangeFlowRow }) {
    const expandable = row.coverage === "available";
    return (
      <tr className="border-b border-rule/60 align-top">
        <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
          {expandable ? (
            <button
              type="button"
              onClick={() => setExpandedId((cur) => (cur === row.exchangeId ? null : row.exchangeId))}
              aria-expanded={expandedId === row.exchangeId}
              className="underline decoration-accent decoration-2"
            >
              {row.exchangeName}
            </button>
          ) : (
            row.exchangeName
          )}
        </th>
        <td className="py-2 pr-3 text-ink/70">{asset}</td>
        <td className="py-2 pr-3 text-ink/70">{network ? t.networkLabels[network] : "—"}</td>
        {row.coverage === "available" ? (
          <>
            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{qty(row.inflow)}</td>
            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{qty(row.outflow)}</td>
            <td className={`py-2 pr-3 text-right tabular-nums whitespace-nowrap font-semibold ${netClass(row.netflow)}`}>{signed(row.netflow)}</td>
            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap text-ink/60">
              <span className="block">{t.betweenIn(qty(row.inflowFromExchanges))}</span>
              <span className="block">{t.betweenOut(qty(row.outflowToExchanges))}</span>
            </td>
            <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap text-ink/50">{qty(row.internalExcluded)}</td>
            <td className="py-2 text-ink/50 whitespace-nowrap">{row.updatedAt ? dateTime(row.updatedAt) : "—"}</td>
          </>
        ) : (
          <td colSpan={6} className="py-2 text-xs text-ink/50">
            {row.unavailableReason === "not_tracked" ? t.notTracked : t.notCollected}
          </td>
        )}
      </tr>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-700">{t.heading}</h2>
        <p className="text-xs uppercase tracking-wide text-ink/50 mt-0.5">{t.scopeLine}</p>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-rule pb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">{t.asset}</span>
          <div className="flex gap-1" role="group" aria-label={t.ariaSelectAsset}>
            {FLOW_ASSETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onAssetChange(a)}
                aria-pressed={asset === a}
                className={`px-3 py-1 text-xs font-semibold border ${asset === a ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">{t.network}</span>
          <div className="flex gap-1" role="group" aria-label={t.ariaSelectNetwork}>
            {availableNetworks.map((n) => (
              <button
                key={n ?? "none"}
                type="button"
                onClick={() => onNetworkChange(n)}
                aria-pressed={network === n}
                className={`px-3 py-1 text-xs font-semibold border ${network === n ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"}`}
              >
                {n ? t.networkLabels[n] : "—"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state === "loading" && <p className="text-sm text-ink/50 animate-pulse py-8">{t.loading}</p>}
      {state === "error" && <p className="text-sm text-ink/60 py-8">{t.error}</p>}

      {state === "ready" && data && data.status === "not_configured" && (
        <div className="border border-ink/20 px-4 py-6 text-center">
          <p className="text-sm text-ink/60">{t.notAvailableYet}</p>
        </div>
      )}

      {state === "ready" && data && data.status === "connected" && (
        <>
          {data.historyNeededFrom && (
            <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">{t.historyTooShort(data.collectedFrom, data.historyNeededFrom)}</p>
          )}
          {data.warnings.length > 0 && <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">{t.partialData(data.warnings.join(" "))}</p>}
          <p className="text-xs text-ink/50">
            {t.sourceLine(data.source, periodLabel, utcDay(data.periodStart), utcDay(data.periodEnd), utcDateTime(Date.parse(data.dataThrough)))}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <caption className="sr-only">{t.tableCaption(asset, periodLabel)}</caption>
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
                  <th scope="col" className="py-2 pr-3">
                    {t.colExchange}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t.colAsset}
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    {t.colNetwork}
                  </th>
                  {[t.colInflow, t.colOutflow, t.colNetflow, t.colBetweenExchanges, t.colInternal].map((h) => (
                    <th key={h} scope="col" className="py-2 pr-3 text-right whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="py-2">
                    {t.colUpdated}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <Row key={row.exchangeId} row={row} />
                ))}
              </tbody>
            </table>
          </div>

          {expandedId && (
            <div className="border border-ink/20 bg-accent/5 px-4 py-3 space-y-2">
              {daily.state === "loading" && <p className="text-xs text-ink/50 animate-pulse">{t.dailyLoading}</p>}
              {daily.state === "error" && <p className="text-xs text-ink/50">{t.dailyError}</p>}
              {daily.state === "ready" && daily.series === null && <p className="text-xs text-ink/50">{t.dailyEmpty}</p>}
              {daily.state === "ready" && daily.series && (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-ink/40 border-b border-rule/60">
                      <th scope="col" className="py-1 pr-2 font-normal">
                        {t.colDateUtc}
                      </th>
                      <th scope="col" className="py-1 pr-2 font-normal text-right">
                        {t.colInflow}
                      </th>
                      <th scope="col" className="py-1 pr-2 font-normal text-right">
                        {t.colOutflow}
                      </th>
                      <th scope="col" className="py-1 font-normal text-right">
                        {t.colNetflow}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.series.points.map((p) => (
                      <tr key={p.dateIso} className="border-b border-rule/60">
                        <td className="py-1 pr-2">{p.dateIso}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{qty(p.inflow)}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{qty(p.outflow)}</td>
                        <td className={`py-1 text-right tabular-nums ${netClass(p.netflow)}`}>{signed(p.netflow)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <details className="border border-ink/20 px-4 py-3">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-ink/50 font-semibold">{t.howToReadThis}</summary>
            <div className="mt-2 space-y-2 text-xs text-ink/60 leading-relaxed">
              {t.methodology.map(([label, body]) => (
                <p key={label}>
                  <strong>{label}</strong> — {body}
                </p>
              ))}
            </div>
          </details>
        </>
      )}
    </div>
  );
}

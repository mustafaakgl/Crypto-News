"use client";

import { useEffect, useId, useState } from "react";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import { GAP_ASSETS, type GapAsset, type PriceGapResult, type VenueGap } from "@/lib/priceGap/types";
import { GapChart } from "@/components/exchanges/GapChart";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type Loadable = { state: "loading" | "ready" | "error"; data: (PriceGapResult & { stale: boolean }) | null };

const DEX_COLORS = ["#0d9488", "#7c3aed", "#db2777"];
// Cold loads wait on GeckoTerminal's pacing (and one bounded retry on a 429).
const CLIENT_TIMEOUT_MS = 90_000;

function pct(v: number | null, digits = 3, signed = true): string {
  if (v === null) return "—";
  const rounded = Number(v.toFixed(digits));
  if (rounded === 0) return `${(0).toFixed(digits)}%`;
  return `${signed && rounded > 0 ? "+" : ""}${rounded.toFixed(digits)}%`;
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
}

export function PriceComparisonTab({ period, locale = "en" }: { period: ExchangePeriod; locale?: Locale }) {
  const panelId = useId();
  const dict = getDictionary(locale);
  const t = dict.priceComparison;
  const periodLabel = dict.exchangeAnalytics.periodLabels[period];
  const [asset, setAsset] = useState<GapAsset>("BTC");
  const [loadable, setLoadable] = useState<Loadable>({ state: "loading", data: null });
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);
    setLoadable({ state: "loading", data: null });
    fetch(`/api/price-comparison?asset=${asset}&period=${period}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: PriceGapResult & { stale: boolean }) => setLoadable({ state: "ready", data: json }))
      .catch(() => {
        if (controller.signal.aborted && !timedOut) return;
        setLoadable({ state: "error", data: null });
      })
      .finally(() => clearTimeout(timeoutId));
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [asset, period]);

  const intlLocale = locale === "de" ? "de-DE" : "en-GB";
  const data = loadable.data;
  const hourly = data?.resolution === "1h";
  const formatBucket = (ms: number) =>
    new Date(ms).toLocaleString(intlLocale, { timeZone: "UTC", day: "numeric", month: "short", year: hourly ? undefined : "numeric", hour: hourly ? "2-digit" : undefined, minute: hourly ? "2-digit" : undefined }) + (hourly ? " UTC" : "");
  const formatAxisBucket = (ms: number) =>
    new Date(ms).toLocaleString(intlLocale, { timeZone: "UTC", day: "numeric", month: "short", hour: hourly && period === "1d" ? "2-digit" : undefined, minute: hourly && period === "1d" ? "2-digit" : undefined });
  const formatPrice = (v: number) => v.toLocaleString(intlLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const dex = data?.venues.filter((v) => v.kind === "dex") ?? [];
  const cex = data?.venues.filter((v) => v.kind === "cex") ?? [];
  const okDex = dex.filter((v) => v.status === "ok");
  const okCex = cex.filter((v) => v.status === "ok");

  const band = data
    ? data.buckets.map((_, i) => {
        const vals = okCex.map((v) => v.deviationsPct[i]).filter((d): d is number => d !== null);
        return vals.length ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: null, max: null };
      })
    : [];

  const dexAvgGap = mean(okDex.map((v) => v.stats.meanAbsDevPct).filter((x): x is number => x !== null));
  const cexAvgGap = mean(okCex.map((v) => v.stats.meanAbsDevPct).filter((x): x is number => x !== null));
  const widest = [...okDex, ...okCex].reduce<VenueGap | null>((w, v) => ((v.stats.maxAbsDevPct ?? -1) > (w?.stats.maxAbsDevPct ?? -1) ? v : w), null);
  const dexShortHistory = data && okDex.some((v) => v.stats.buckets < data.buckets.length * 0.9);

  function Row({ v, color }: { v: VenueGap; color?: string }) {
    const s = v.stats;
    const retGap = s.returnPct !== null && s.refReturnPct !== null ? s.returnPct - s.refReturnPct : null;
    const volRatio = s.volatilityPct !== null && s.refVolatilityPct ? s.volatilityPct / s.refVolatilityPct : null;
    const meanDevShown = Number((s.meanDevPct ?? 0).toFixed(3));
    return (
      <tr className="border-b border-rule/60 align-top">
        <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
          <span className="flex items-center gap-1.5">
            {color && <span className="inline-block w-2.5 h-2.5 shrink-0" style={{ backgroundColor: color }} aria-hidden />}
            {v.poolUrl ? (
              <a href={v.poolUrl} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-accent decoration-2">
                {v.name}
              </a>
            ) : (
              v.name
            )}
          </span>
          <span className="block text-[10px] font-normal text-ink/50">{v.pair}</span>
        </th>
        {v.status === "error" ? (
          <td colSpan={6} className="py-2 text-xs text-ink/50">
            {t.venueUnavailable(v.error ?? "")}
          </td>
        ) : (
          <>
            <td className="py-2 pr-3 text-right tabular-nums">{v.lastClose !== null ? formatPrice(v.lastClose) : "—"}</td>
            <td className={`py-2 pr-3 text-right tabular-nums ${meanDevShown > 0 ? "text-emerald-700" : meanDevShown < 0 ? "text-red-700" : ""}`}>{pct(s.meanDevPct)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">{pct(s.meanAbsDevPct, 3, false)}</td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {pct(s.maxAbsDevPct, 3, false)}
              {s.maxAbsDevAt !== null && <span className="block text-[10px] text-ink/40">{formatBucket(s.maxAbsDevAt)}</span>}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {pct(s.returnPct, 2)}
              {retGap !== null && <span className="block text-[10px] text-ink/40">{t.vsCexPoints(pct(retGap, 2).replace("%", ""))}</span>}
            </td>
            <td className="py-2 pr-3 text-right tabular-nums">
              {pct(s.volatilityPct, 2, false)}
              {volRatio !== null && <span className="block text-[10px] text-ink/40">{t.vsCexRatio(volRatio.toFixed(2))}</span>}
            </td>
          </>
        )}
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-ink/60 uppercase tracking-wide">{t.asset}</span>
        <div className="flex gap-1" role="group" aria-label={t.ariaSelectAsset}>
          {GAP_ASSETS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setAsset(a)}
              aria-pressed={asset === a}
              className={`px-3 py-1 text-xs font-semibold border ${asset === a ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-ink/70">{t.intro}</p>

      {loadable.state === "loading" && <p className="text-sm text-ink/50 animate-pulse py-8">{t.loading}</p>}
      {loadable.state === "error" && <p className="text-sm text-ink/60 py-8">{t.errorLoad}</p>}

      {loadable.state === "ready" && data && (
        <>
          {data.warnings.length > 0 && <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">{t.partialData(data.warnings.join(" "))}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-ink/20 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink/50">{t.tileDexGap}</div>
              <div className="font-serif text-2xl font-700 tabular-nums">{pct(dexAvgGap, 3, false)}</div>
            </div>
            <div className="border border-ink/20 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink/50">{t.tileCexGap}</div>
              <div className="font-serif text-2xl font-700 tabular-nums">{pct(cexAvgGap, 3, false)}</div>
            </div>
            <div className="border border-ink/20 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-ink/50">{t.tileWidest}</div>
              <div className="font-serif text-2xl font-700 tabular-nums">{widest ? pct(widest.stats.maxAbsDevPct, 2, false) : "—"}</div>
              {widest && widest.stats.maxAbsDevAt !== null && (
                <div className="text-[11px] text-ink/50">
                  {widest.name} · {formatBucket(widest.stats.maxAbsDevAt)}
                </div>
              )}
            </div>
          </div>

          <section>
            <h2 className="font-serif text-xl font-700 mb-1">{t.chartHeading(asset, periodLabel)}</h2>
            <p className="text-xs text-ink/50 mb-3">{t.chartNote(hourly ? t.resolutionHourly : t.resolutionDaily)}</p>
            <GapChart
              buckets={data.buckets}
              lines={okDex.map((v, i) => ({ id: v.id, label: v.name, color: DEX_COLORS[i % DEX_COLORS.length], values: v.deviationsPct }))}
              band={band}
              bandLabel={t.bandLabel(okCex.length)}
              referenceLabel={t.referenceLabel}
              formatBucket={formatBucket}
              formatAxisBucket={formatAxisBucket}
            />
            {dexShortHistory && <p className="text-[11px] text-ink/50 mt-2">{t.dexHistoryNote}</p>}
          </section>

          <section>
            <h2 className="font-serif text-xl font-700 mb-2">{t.tableHeading(periodLabel)}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <caption className="sr-only">{t.tableCaption(asset, periodLabel)}</caption>
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
                    <th scope="col" className="py-2 pr-3">
                      {t.colVenue}
                    </th>
                    {[t.colLastClose, t.colMeanDev, t.colMeanAbsDev, t.colMaxAbsDev, t.colReturn, t.colVolatility].map((h) => (
                      <th key={h} scope="col" className="py-2 pr-3 text-right whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th colSpan={7} scope="rowgroup" className="pt-3 pb-1 text-left text-[11px] uppercase tracking-wide text-ink/60">
                      {t.groupDex}
                    </th>
                  </tr>
                  {dex.map((v) => (
                    <Row key={v.kind + v.id} v={v} color={v.status === "ok" ? DEX_COLORS[okDex.indexOf(v) % DEX_COLORS.length] : undefined} />
                  ))}
                  <tr>
                    <th colSpan={7} scope="rowgroup" className="pt-4 pb-1 text-left text-[11px] uppercase tracking-wide text-ink/60">
                      {t.groupCex}
                    </th>
                  </tr>
                  {cex.map((v) => (
                    <Row key={v.kind + v.id} v={v} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-ink/40 mt-2">
              {t.windowNote(formatBucket(data.buckets[0]), formatBucket(data.buckets[data.buckets.length - 1]), data.buckets.length)}
              {data.stale && <span className="text-accent">{t.refreshingInBackground}</span>}
            </p>
          </section>
        </>
      )}

      <div className="border border-ink/20">
        <button
          type="button"
          onClick={() => setMethodologyOpen((v) => !v)}
          aria-expanded={methodologyOpen}
          aria-controls={panelId}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/60 hover:text-ink"
        >
          {t.methodologyAndSources}
          <span aria-hidden="true">{methodologyOpen ? "−" : "+"}</span>
        </button>
        {methodologyOpen && (
          <div id={panelId} className="px-3 pb-3 text-xs text-ink/60 leading-relaxed space-y-2">
            {t.methodology.map(([label, body]) => (
              <p key={label}>
                <strong>{label}</strong> — {body}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

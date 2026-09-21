"use client";

import { useState, type ReactNode } from "react";
import type { ExchangePeriod } from "@/lib/exchangeAnalytics/types";
import type { BaseAsset, FiatCurrency, QuoteType, VenueRolling24h, VenueVolumeResult } from "@/lib/exchangeVolume/types";
import { formatMarketCap, formatPct, formatQuantity } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export type VenueRowState = {
  id: string;
  name: string;
  state: "loading" | "ready" | "error";
  data: VenueVolumeResult | null;
  rolling24h: VenueRolling24h | null;
  stale: boolean;
};

type View = "allPairs" | "quoteType" | "base" | "fiat" | "trend";
const VIEWS: View[] = ["allPairs", "quoteType", "base", "fiat", "trend"];
const QUOTE_TYPES: QuoteType[] = ["fiat", "stablecoin", "crypto"];
const BASES: BaseAsset[] = ["BTC", "ETH", "SOL", "XRP"];
const FIATS: FiatCurrency[] = ["USD", "EUR", "GBP", "KRW", "TRY"];
const TREND_PERIODS: ExchangePeriod[] = ["1d", "7d", "30d", "1y"];
const MIX_COLOR: Record<QuoteType, string> = { fiat: "bg-accent", stablecoin: "bg-ink", crypto: "bg-ink/30" };

function usd(v: number): string {
  return v > 0 ? formatMarketCap(v) : "—";
}

function Share({ part, whole }: { part: number; whole: number }) {
  if (whole <= 0 || part <= 0) return null;
  return <span className="block text-[10px] text-ink/40">{((part / whole) * 100).toFixed(1)}%</span>;
}

function Num({ children }: { children: ReactNode }) {
  return <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap align-top">{children}</td>;
}

export function CexVolumeTable({ rows, period, locale = "en" }: { rows: VenueRowState[]; period: ExchangePeriod; locale?: Locale }) {
  const [view, setView] = useState<View>("quoteType");
  const dict = getDictionary(locale);
  const t = dict.exchangeVolume;
  const periodLabels = dict.exchangeAnalytics.periodLabels;

  const ready = rows.filter((r) => r.state === "ready" && r.data?.periods);
  const pending = rows.filter((r) => !(r.state === "ready" && r.data?.periods));
  const sortKey = (r: VenueRowState) => (view === "allPairs" ? (r.rolling24h?.totalUsd ?? -1) : r.data!.periods![period].totalUsd);
  const sorted = [...ready].sort((a, b) => sortKey(b) - sortKey(a));
  const perDay = (r: VenueRowState, p: ExchangePeriod) => r.data!.periods![p].totalUsd / r.data!.periods![p].days;

  const sum = (f: (r: VenueRowState) => number) => ready.reduce((s, r) => s + f(r), 0);
  const allReady = pending.length === 0 && ready.length > 0;

  const headers: string[] = {
    allPairs: [t.colAllPairs24h, t.colTracked24h, t.colTrackedShare, t.colStableSwap24h, t.colPairsCounted],
    quoteType: [t.colTotal, t.quoteTypeLabels.fiat, t.quoteTypeLabels.stablecoin, t.quoteTypeLabels.crypto, t.colMix],
    base: [t.colTotal, ...BASES],
    fiat: [t.colFiatTotal, ...FIATS],
    trend: [...TREND_PERIODS.map((p) => (p === "1d" ? periodLabels[p] : t.colPerDay(periodLabels[p]))), t.colVs1y],
  }[view];

  function cells(r: VenueRowState | null): ReactNode {
    const p = r ? r.data!.periods![period] : null;
    const total = p ? p.totalUsd : sum((x) => x.data!.periods![period].totalUsd);
    const qt = (k: QuoteType) => (r ? p!.byQuoteType[k] : sum((x) => x.data!.periods![period].byQuoteType[k]));
    switch (view) {
      case "allPairs": {
        const rs = r ? (r.rolling24h ? [r.rolling24h] : []) : ready.flatMap((x) => (x.rolling24h ? [x.rolling24h] : []));
        if (rs.length === 0) {
          return (
            <td colSpan={headers.length} className="py-2 text-xs text-ink/50">
              {t.rollingUnavailable}
            </td>
          );
        }
        const all = rs.reduce((a, x) => a + x.totalUsd, 0);
        const tracked = rs.reduce((a, x) => a + x.trackedUsd, 0);
        const stable = rs.reduce((a, x) => a + x.stableSwapUsd, 0);
        return (
          <>
            <Num>{usd(all)}</Num>
            <Num>{usd(tracked)}</Num>
            <Num>{all > 0 ? `${((tracked / all) * 100).toFixed(1)}%` : "—"}</Num>
            <Num>
              {usd(stable)}
              <Share part={stable} whole={all} />
            </Num>
            <Num>{rs.reduce((a, x) => a + x.pairsCounted, 0).toLocaleString(locale === "de" ? "de-DE" : "en-GB")}</Num>
          </>
        );
      }
      case "quoteType":
        return (
          <>
            <Num>{usd(total)}</Num>
            {QUOTE_TYPES.map((k) => (
              <Num key={k}>
                {usd(qt(k))}
                <Share part={qt(k)} whole={total} />
              </Num>
            ))}
            <td className="py-2 align-top min-w-[80px]">
              <div className="flex h-2.5 w-full mt-1.5" aria-hidden>
                {QUOTE_TYPES.map((k) => (total > 0 ? <div key={k} className={MIX_COLOR[k]} style={{ width: `${(qt(k) / total) * 100}%` }} /> : null))}
              </div>
            </td>
          </>
        );
      case "base":
        return (
          <>
            <Num>{usd(total)}</Num>
            {BASES.map((b) => {
              const v = r ? p!.byBase[b] : { usd: sum((x) => x.data!.periods![period].byBase[b].usd), qty: sum((x) => x.data!.periods![period].byBase[b].qty) };
              return (
                <Num key={b}>
                  {usd(v.usd)}
                  {v.qty > 0 && <span className="block text-[10px] text-ink/40">{formatQuantity(v.qty, b)}</span>}
                </Num>
              );
            })}
          </>
        );
      case "fiat": {
        const fiat = (c: FiatCurrency) => (r ? p!.byQuote[c] : sum((x) => x.data!.periods![period].byQuote[c]));
        const fiatTotal = qt("fiat");
        return (
          <>
            <Num>{usd(fiatTotal)}</Num>
            {FIATS.map((c) => (
              <Num key={c}>
                {usd(fiat(c))}
                <Share part={fiat(c)} whole={fiatTotal} />
              </Num>
            ))}
          </>
        );
      }
      case "trend": {
        const avg = (pp: ExchangePeriod) => (r ? perDay(r, pp) : sum((x) => perDay(x, pp)));
        const vs = avg("1y") > 0 ? ((avg("1d") - avg("1y")) / avg("1y")) * 100 : null;
        return (
          <>
            {TREND_PERIODS.map((pp) => (
              <Num key={pp}>{usd(avg(pp))}</Num>
            ))}
            <Num>{vs !== null ? <span className={vs >= 0 ? "text-emerald-700" : "text-red-700"}>{formatPct(vs)}</span> : "—"}</Num>
          </>
        );
      }
    }
  }

  const win = ready[0]?.data?.periods?.[period];
  const notes = ready.flatMap((r) => {
    const d = r.data!;
    const p = d.periods![view === "trend" ? "1y" : period];
    const parts: string[] = [];
    if (view === "allPairs") {
      if (r.rolling24h && r.rolling24h.pairsUnvalued > 0) parts.push(t.noteUnvaluedPairs(r.rolling24h.pairsUnvalued, r.rolling24h.unvaluedQuotes.join(", ")));
      return parts.length > 0 ? [`${d.name}: ${parts.join("; ")}`] : [];
    }
    if (p.pairsWithShortHistory > 0) parts.push(t.noteShortHistory(p.pairsWithShortHistory));
    if (p.pairsWithGaps > 0) parts.push(t.noteGaps(p.pairsWithGaps));
    if (p.unpricedDays > 0) parts.push(t.noteUnpriced(p.unpricedDays));
    if (d.pairsFailed.length > 0) parts.push(t.noteFailed(d.pairsFailed.join(", ")));
    return parts.length > 0 ? [`${d.name}: ${parts.join("; ")}`] : [];
  });

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-3" role="group" aria-label={t.ariaSelectView}>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`text-xs font-semibold uppercase tracking-wide px-2.5 py-1 border ${view === v ? "border-ink bg-ink text-white" : "border-ink/30 hover:border-ink"}`}
          >
            {t.viewLabels[v]}
          </button>
        ))}
      </div>

      {view === "quoteType" && (
        <div className="flex flex-wrap gap-3 text-[11px] text-ink/60 mb-2" aria-hidden>
          {QUOTE_TYPES.map((k) => (
            <span key={k} className="flex items-center gap-1">
              <span className={`inline-block w-2.5 h-2.5 ${MIX_COLOR[k]}`} />
              {t.quoteTypeLegend[k]}
            </span>
          ))}
        </div>
      )}
      {view === "trend" && <p className="text-xs text-ink/50 mb-2">{t.trendNote}</p>}
      {view === "allPairs" && <p className="text-xs text-ink/50 mb-2">{t.allPairsNote}</p>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">{t.tableCaption}</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
              <th scope="col" className="py-2 pr-3">
                {t.colExchange}
              </th>
              {headers.map((h) => (
                <th key={h} scope="col" className={`py-2 pr-3 whitespace-nowrap ${h === t.colMix ? "" : "text-right"}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-b border-rule/60">
                <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap align-top">
                  <a href={r.data!.url} target="_blank" rel="noopener noreferrer" className="hover:underline decoration-accent decoration-2">
                    {r.name}
                  </a>
                  {r.stale && <span className="block text-[10px] font-normal text-accent">{t.refreshing}</span>}
                </th>
                {cells(r)}
              </tr>
            ))}
            {pending.map((r) => (
              <tr key={r.id} className="border-b border-rule/60">
                <th scope="row" className="py-2 pr-3 text-left font-semibold whitespace-nowrap">
                  {r.name}
                </th>
                <td colSpan={headers.length} className={`py-2 text-xs ${r.state === "loading" ? "text-ink/40 animate-pulse" : "text-ink/60"}`}>
                  {r.state === "loading" ? t.venueLoading : t.venueUnavailable(r.data?.warnings[0] ?? "")}
                </td>
              </tr>
            ))}
            {ready.length > 1 && (
              <tr className="border-t-2 border-ink/40 font-semibold">
                <th scope="row" className="py-2 pr-3 text-left whitespace-nowrap align-top">
                  {allReady ? t.totalRow(ready.length) : t.totalRowPartial(ready.length, rows.length)}
                </th>
                {cells(null)}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {win && view !== "trend" && view !== "allPairs" && <p className="text-[11px] text-ink/40 mt-2">{t.windowNote(win.startDay, win.endDay, win.days)}</p>}
      {notes.length > 0 && (
        <ul className="text-[11px] text-ink/40 mt-1 space-y-0.5">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

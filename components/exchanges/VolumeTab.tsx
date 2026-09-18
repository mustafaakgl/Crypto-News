"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CexOverviewResult, DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { CexTable } from "@/components/exchanges/CexTable";
import { DexTable } from "@/components/exchanges/DexTable";
import { ExchangeDrilldown } from "@/components/exchanges/ExchangeDrilldown";
import { VolumeComparisonSummary } from "@/components/exchanges/VolumeComparisonSummary";
import { dateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type Loadable<T> = { state: "loading" | "ready" | "error"; data: T | null; stale: boolean; error: string | null };
const INITIAL: Loadable<never> = { state: "loading", data: null, stale: false, error: null };

// A genuinely cold load (nothing cached yet) fetches each selected venue's
// own history SEQUENTIALLY with real pacing against CoinGecko's shared,
// confirmed 5-15 requests/minute anonymous rate limit (see
// lib/httpClient.ts) — up to ~45s for 10 venues. Once anything has been
// fetched once, a repeat visit within the stale window serves that result
// immediately while refreshing in the background (see
// lib/exchangeAnalytics/cexVenues.ts), so this long wait is a one-time,
// not a per-visit, cost. A generous client timeout avoids aborting a
// request that's genuinely still in progress, not stuck.
const CLIENT_TIMEOUT_MS = 70_000;

function useOverviewPart<T>(part: "cex" | "dex", period: ExchangePeriod, count: VenueCount) {
  const [loadable, setLoadable] = useState<Loadable<T>>(INITIAL as Loadable<T>);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [loadDurationMs, setLoadDurationMs] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    const startedAt = Date.now();
    setLoadable({ state: "loading", data: null, stale: false, error: null });
    setLoadDurationMs(null);
    setElapsedMs(0);

    const tick = setInterval(() => {
      if (thisRequestId === requestIdRef.current) setElapsedMs(Date.now() - startedAt);
    }, 1000);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    fetch(`/api/exchanges/overview?period=${period}&count=${count}&part=${part}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { cex?: CexOverviewResult; dex?: DexOverviewResult; cexStale?: boolean; dexStale?: boolean }) => {
        if (thisRequestId !== requestIdRef.current) return;
        const data = (part === "cex" ? json.cex : json.dex) as T;
        const stale = (part === "cex" ? json.cexStale : json.dexStale) ?? false;
        setLoadable({ state: "ready", data, stale, error: null });
        setLoadDurationMs(Date.now() - startedAt);
      })
      .catch((err) => {
        if (thisRequestId !== requestIdRef.current) return;
        setLoadable({
          state: "error",
          data: null,
          stale: false,
          error: err instanceof DOMException && err.name === "AbortError" ? "Request timed out." : "Could not load data.",
        });
      })
      .finally(() => {
        clearTimeout(timeoutId);
        clearInterval(tick);
      });

    return () => {
      clearTimeout(timeoutId);
      clearInterval(tick);
      controller.abort();
    };
  }, [part, period, count]);

  return { ...loadable, elapsedMs, loadDurationMs };
}

export function VolumeTab({ period, count, locale = "en" }: { period: ExchangePeriod; count: VenueCount; locale?: Locale }) {
  const panelId = useId();
  const cex = useOverviewPart<CexOverviewResult>("cex", period, count);
  const dex = useOverviewPart<DexOverviewResult>("dex", period, count);
  const dict = getDictionary(locale);
  const t = dict.exchangeVolume;
  const periodLabel = dict.exchangeAnalytics.periodLabels[period];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  // A period/count change is a new selection — the previously expanded
  // drilldown belonged to the old selection's venue list and should not
  // silently persist across it.
  useEffect(() => {
    setExpandedId(null);
  }, [period, count]);

  const allWarnings = [...(cex.data?.warnings ?? []), ...(dex.data?.warnings ?? [])];
  const bothReady = cex.state === "ready" && dex.state === "ready" && cex.data && dex.data;

  return (
    <>
      {allWarnings.length > 0 && (
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80 mb-4">{t.partialData(allWarnings.join(" "))}</p>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="font-serif text-xl font-700 mb-2">{t.comparisonHeading(periodLabel)}</h2>
          {bothReady ? (
            <VolumeComparisonSummary cex={cex.data!} dex={dex.data!} locale={locale} />
          ) : cex.state === "error" || dex.state === "error" ? (
            <p className="text-sm text-ink/60 py-4">{t.comparisonUnavailable(cex.error ?? dex.error ?? "")}</p>
          ) : (
            <p className="text-sm text-ink/50 animate-pulse py-4">{t.waitingOnData(cex.state !== "ready" ? "CEX" : "DEX")}</p>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl font-700 mb-1">{t.centralizedExchanges}</h2>
          {cex.state === "loading" && (
            <p className="text-sm text-ink/50 animate-pulse py-8">
              {period === "1d"
                ? t.loadingShort(Math.round(cex.elapsedMs / 1000))
                : t.loadingLong(count, count === 10 ? "30–45" : "15–25", Math.round(cex.elapsedMs / 1000))}
            </p>
          )}
          {cex.state === "error" && (
            <div className="border border-ink/20 px-4 py-6 text-center">
              <p className="text-sm text-ink/60 mb-2">{cex.error}</p>
            </div>
          )}
          {cex.state === "ready" && cex.data && (
            <>
              <p className="text-xs text-ink/50 mb-2">
                {period === "1d" ? t.rankedTrailing24h(cex.data.rankingPoolSize) : t.rankedOtherPeriods(cex.data.rankingPoolSize, periodLabel)}
              </p>
              <CexTable
                venues={cex.data.venues}
                onExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                expandedId={expandedId}
                locale={locale}
              />
              {expandedId && (
                <ExchangeDrilldown
                  exchangeId={expandedId}
                  exchangeName={cex.data.venues.find((v) => v.id === expandedId)?.name ?? expandedId}
                  locale={locale}
                />
              )}
              {cex.data.venues[0] && (
                <p className="text-[11px] text-ink/40 mt-2">
                  {t.windowFetched(dateTime(cex.data.venues[0].periodStart), dateTime(cex.data.venues[0].periodEnd), dateTime(cex.data.asOf))}
                  {cex.stale && <span className="text-accent">{t.refreshingInBackground}</span>}
                  {!cex.stale && cex.loadDurationMs !== null && t.loadedIn((cex.loadDurationMs / 1000).toFixed(1))}
                </p>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl font-700 mb-1">{t.decentralizedExchanges}</h2>
          {dex.state === "loading" && <p className="text-sm text-ink/50 animate-pulse py-4">{t.loading}</p>}
          {dex.state === "error" && <p className="text-sm text-ink/60 py-4">{dex.error}</p>}
          {dex.state === "ready" && dex.data && (
            <>
              <p className="text-xs text-ink/50 mb-2">{t.rankedDex(periodLabel, dex.data.protocolPoolSize)}</p>
              <DexTable protocols={dex.data.protocols} locale={locale} />
              <p className="text-[11px] text-ink/40 mt-2">
                {t.fetchedSourceDefiLlama(dateTime(dex.data.asOf))}
                {dex.stale && <span className="text-accent">{t.refreshingInBackground}</span>}
              </p>
            </>
          )}
        </section>

        <div className="border border-ink/20">
          <button
            type="button"
            onClick={() => setMethodologyOpen((v) => !v)}
            aria-expanded={methodologyOpen}
            aria-controls={panelId}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/60 hover:text-ink"
          >
            {dict.tabSection.methodologyAndSources}
            <span aria-hidden="true">{methodologyOpen ? "−" : "+"}</span>
          </button>
          {methodologyOpen && (
            <div id={panelId} className="px-3 pb-3 text-xs text-ink/60 leading-relaxed space-y-2">
              <p>
                <strong>{t.labelCexVolume}</strong> — {t.methodologyCex}
              </p>
              <p>
                <strong>{t.labelDexVolume}</strong> — {t.methodologyDex}
              </p>
              <p>
                <strong>{t.labelComparison}</strong> — {t.methodologyComparison(String(cex.data?.venues.length ?? ""))}
              </p>
              <p>
                <strong>{t.labelAccessLimit}</strong> — {t.methodologyAccessLimit}
              </p>
              <p>
                <strong>{t.labelPairBreakdown}</strong> — {t.methodologyPairBreakdown}
              </p>
              <p>
                <strong>{t.labelLoadingCaching}</strong> — {t.methodologyCaching}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

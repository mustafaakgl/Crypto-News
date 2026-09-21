"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import type { VenueRolling24h, VenueVolumeResult } from "@/lib/exchangeVolume/types";
import { CEX_VENUES } from "@/lib/exchangeVolume/venues";
import { CexVolumeTable, type VenueRowState } from "@/components/exchanges/CexVolumeTable";
import { DexTable } from "@/components/exchanges/DexTable";
import { VolumeComparisonSummary } from "@/components/exchanges/VolumeComparisonSummary";
import { dateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

// A cold load is bounded by Kraken (~1 request/s over ~27 requests).
const CLIENT_TIMEOUT_MS = 90_000;

// Every period comes back in one response per venue, so switching period
// never refetches — only changing the venue count does.
function useVenueVolumes(count: VenueCount): VenueRowState[] {
  const venues = CEX_VENUES.slice(0, count);
  const [rows, setRows] = useState<Record<string, VenueRowState>>({});

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_TIMEOUT_MS);
    for (const v of CEX_VENUES.slice(0, count)) {
      setRows((cur) => (cur[v.id]?.state === "ready" ? cur : { ...cur, [v.id]: { id: v.id, name: v.name, state: "loading", data: null, rolling24h: null, stale: false } }));
      fetch(`/api/exchanges/volume?venue=${v.id}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((json: VenueVolumeResult & { stale?: boolean; rolling24h?: VenueRolling24h | null }) => {
          const ok = json.status !== "error" && json.periods !== null;
          setRows((cur) => ({ ...cur, [v.id]: { id: v.id, name: v.name, state: ok ? "ready" : "error", data: json, rolling24h: json.rolling24h ?? null, stale: json.stale ?? false } }));
        })
        .catch(() => {
          if (controller.signal.aborted && !timedOut) return;
          setRows((cur) => ({ ...cur, [v.id]: { id: v.id, name: v.name, state: "error", data: null, rolling24h: null, stale: false } }));
        });
    }
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [count]);

  return venues.map((v) => rows[v.id] ?? { id: v.id, name: v.name, state: "loading", data: null, rolling24h: null, stale: false });
}

type DexLoadable = { state: "loading" | "ready" | "error"; data: DexOverviewResult | null; stale: boolean; error: string | null };

function useDexOverview(period: ExchangePeriod, count: VenueCount): DexLoadable {
  const [loadable, setLoadable] = useState<DexLoadable>({ state: "loading", data: null, stale: false, error: null });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    setLoadable({ state: "loading", data: null, stale: false, error: null });
    const controller = new AbortController();
    fetch(`/api/exchanges/overview?period=${period}&count=${count}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: { dex: DexOverviewResult; dexStale?: boolean }) => {
        if (thisRequestId !== requestIdRef.current) return;
        setLoadable({ state: "ready", data: json.dex, stale: json.dexStale ?? false, error: null });
      })
      .catch(() => {
        if (thisRequestId !== requestIdRef.current) return;
        setLoadable({ state: "error", data: null, stale: false, error: "Could not load data." });
      });
    return () => controller.abort();
  }, [period, count]);

  return loadable;
}

export function VolumeTab({ period, count, locale = "en" }: { period: ExchangePeriod; count: VenueCount; locale?: Locale }) {
  const panelId = useId();
  const cexRows = useVenueVolumes(count);
  const dex = useDexOverview(period, count);
  const dict = getDictionary(locale);
  const t = dict.exchangeVolume;
  const periodLabel = dict.exchangeAnalytics.periodLabels[period];
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const cexReady = cexRows.filter((r) => r.state === "ready" && r.data?.periods);
  const cexSettled = cexRows.every((r) => r.state !== "loading");
  const cexTotalUsd = cexReady.reduce((s, r) => s + r.data!.periods![period].totalUsd, 0);
  const cexWindow = cexReady[0]?.data?.periods?.[period];
  // Only when every loaded venue has it — a partial sum would understate the CEX side.
  const cexAllPairs24hUsd =
    period === "1d" && cexReady.length > 0 && cexReady.every((r) => r.rolling24h) ? cexReady.reduce((s, r) => s + r.rolling24h!.totalUsd, 0) : null;

  return (
    <>
      {dex.data && dex.data.warnings.length > 0 && (
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80 mb-4">{t.partialData(dex.data.warnings.join(" "))}</p>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="font-serif text-xl font-700 mb-1">{t.centralizedExchanges}</h2>
          <p className="text-xs text-ink/50 mb-3">{t.cexIntro(count)}</p>
          <CexVolumeTable rows={cexRows} period={period} locale={locale} />
        </section>

        <section>
          <h2 className="font-serif text-xl font-700 mb-2">{t.comparisonHeading(periodLabel)}</h2>
          {cexSettled && cexReady.length > 0 && dex.state === "ready" && dex.data ? (
            <VolumeComparisonSummary
              cexTotalUsd={cexTotalUsd}
              cexVenueCount={cexReady.length}
              cexWindow={cexWindow ? `${cexWindow.startDay} – ${cexWindow.endDay}` : ""}
              cexAllPairs24hUsd={cexAllPairs24hUsd}
              dex={dex.data}
              locale={locale}
            />
          ) : dex.state === "error" || (cexSettled && cexReady.length === 0) ? (
            <p className="text-sm text-ink/60 py-4">{t.comparisonUnavailable(dex.error ?? "CEX")}</p>
          ) : (
            <p className="text-sm text-ink/50 animate-pulse py-4">{t.waitingOnData(!cexSettled ? "CEX" : "DEX")}</p>
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
                <strong>{t.labelUsdValuation}</strong> — {t.methodologyUsdValuation}
              </p>
              <p>
                <strong>{t.labelAllPairs}</strong> — {t.methodologyAllPairs}
              </p>
              <p>
                <strong>{t.labelVenueSelection}</strong> — {t.methodologyVenueSelection}
              </p>
              <p>
                <strong>{t.labelDexVolume}</strong> — {t.methodologyDex}
              </p>
              <p>
                <strong>{t.labelComparison}</strong> — {t.methodologyComparison}
              </p>
              <p>
                <strong>{t.labelAccessLimit}</strong> — {t.methodologyAccessLimit}
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

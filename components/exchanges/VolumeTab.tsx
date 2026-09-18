"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { CexOverviewResult, DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { EXCHANGE_PERIOD_LABEL } from "@/lib/exchangeAnalytics/types";
import { CexTable } from "@/components/exchanges/CexTable";
import { DexTable } from "@/components/exchanges/DexTable";
import { ExchangeDrilldown } from "@/components/exchanges/ExchangeDrilldown";
import { VolumeComparisonSummary } from "@/components/exchanges/VolumeComparisonSummary";
import { dateTime } from "@/lib/time";

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

export function VolumeTab({ period, count }: { period: ExchangePeriod; count: VenueCount }) {
  const panelId = useId();
  const cex = useOverviewPart<CexOverviewResult>("cex", period, count);
  const dex = useOverviewPart<DexOverviewResult>("dex", period, count);

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
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80 mb-4">Partial data: {allWarnings.join(" ")}</p>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="font-serif text-xl font-700 mb-2">CEX vs DEX — {EXCHANGE_PERIOD_LABEL[period]}</h2>
          {bothReady ? (
            <VolumeComparisonSummary cex={cex.data!} dex={dex.data!} />
          ) : cex.state === "error" || dex.state === "error" ? (
            <p className="text-sm text-ink/60 py-4">Comparison unavailable — {cex.error ?? dex.error}</p>
          ) : (
            <p className="text-sm text-ink/50 animate-pulse py-4">
              Waiting on {cex.state !== "ready" ? "CEX" : "DEX"} data before showing a comparison — a comparison built from only one
              completed side would misrepresent the other as zero.
            </p>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl font-700 mb-1">Centralized exchanges</h2>
          {cex.state === "loading" && (
            <p className="text-sm text-ink/50 animate-pulse py-8">
              {period === "1d"
                ? `Loading… (${Math.round(cex.elapsedMs / 1000)}s elapsed)`
                : `Fetching ${count}-venue historical data from CoinGecko's public API, paced to its free-tier rate limit — typically ${count === 10 ? "30–45" : "15–25"}s on a cold load, faster if this selection was viewed recently. ${Math.round(cex.elapsedMs / 1000)}s elapsed.`}
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
                {period === "1d"
                  ? `Ranked by trailing 24h spot volume as reported by CoinGecko, from a pool of the ${cex.data.rankingPoolSize} exchanges CoinGecko ranks by its own trust score — not necessarily every exchange that exists.`
                  : `Selected by TODAY's 24h volume from a pool of the ${cex.data.rankingPoolSize} CoinGecko-ranked exchanges. What CoinGecko's daily volume_chart timestamps actually measure isn't documented and couldn't be conclusively verified (see Methodology), so ${EXCHANGE_PERIOD_LABEL[period]} does not sum a period total — each row shows that venue's latest verifiably-complete day instead.`}
              </p>
              <CexTable venues={cex.data.venues} onExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))} expandedId={expandedId} />
              {expandedId && (
                <ExchangeDrilldown exchangeId={expandedId} exchangeName={cex.data.venues.find((v) => v.id === expandedId)?.name ?? expandedId} />
              )}
              {cex.data.venues[0] && (
                <p className="text-[11px] text-ink/40 mt-2">
                  Window: {dateTime(cex.data.venues[0].periodStart)} – {dateTime(cex.data.venues[0].periodEnd)} (Europe/Berlin) · fetched{" "}
                  {dateTime(cex.data.asOf)}
                  {cex.stale && <span className="text-accent"> · refreshing in the background…</span>}
                  {!cex.stale && cex.loadDurationMs !== null && ` · loaded in ${(cex.loadDurationMs / 1000).toFixed(1)}s`}
                </p>
              )}
            </>
          )}
        </section>

        <section>
          <h2 className="font-serif text-xl font-700 mb-1">Decentralized exchanges</h2>
          {dex.state === "loading" && <p className="text-sm text-ink/50 animate-pulse py-4">Loading…</p>}
          {dex.state === "error" && <p className="text-sm text-ink/60 py-4">{dex.error}</p>}
          {dex.state === "ready" && dex.data && (
            <>
              <p className="text-xs text-ink/50 mb-2">
                Ranked by {EXCHANGE_PERIOD_LABEL[period]} volume as reported by DefiLlama, spot DEX protocols only (category
                &quot;Dexs&quot;) — DEX aggregators are excluded since their volume is already routed through, and counted by, the
                underlying protocols shown here. From a pool of {dex.data.protocolPoolSize} tracked protocols.
              </p>
              <DexTable protocols={dex.data.protocols} />
              <p className="text-[11px] text-ink/40 mt-2">
                Fetched {dateTime(dex.data.asOf)} · source: DefiLlama
                {dex.stale && <span className="text-accent"> · refreshing in the background…</span>}
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
            Methodology &amp; sources
            <span aria-hidden="true">{methodologyOpen ? "−" : "+"}</span>
          </button>
          {methodologyOpen && (
            <div id={panelId} className="px-3 pb-3 text-xs text-ink/60 leading-relaxed space-y-2">
              <p>
                <strong>CEX volume</strong> — CoinGecko&apos;s public API (no key, no paid plan). Candidates for every period are
                selected by TODAY&apos;s 24h volume — this is not necessarily the true top-N venues by any other window, only among
                today&apos;s top volumes. Self-reported volume is not audited; the Trust score column is shown so a high-volume,
                low-trust venue is visible, not hidden. 1D uses the current trailing-24h figure. <strong>7D/30D/1Y do not sum a period
                total.</strong> CoinGecko&apos;s docs describe the volume_chart endpoint&apos;s auto-granularity (10-minutely / hourly /
                daily) but never document what a daily point&apos;s timestamp actually marks — period start, period end, or observation
                time. Regularly-spaced points don&apos;t resolve that; it was tested directly with a live 31-minute before/after read,
                which was suggestive but not conclusive (see the delivery notes for that session). Rather than assert a period total on
                an unverified premise, 7D/30D/1Y each show that venue&apos;s single most recent verifiably-complete day — labeled
                &quot;Historical 24h volume snapshot&quot; — until the timestamp semantics can actually be confirmed. USD figures are
                always an <strong>estimate</strong>: today&apos;s BTC/USD rate for 1D, that specific day&apos;s own historical BTC/USD
                rate otherwise — neither is confirmed to match the exact rate CoinGecko itself used internally.
              </p>
              <p>
                <strong>DEX volume</strong> — DefiLlama&apos;s free API (api.llama.fi, no key). Totals are DefiLlama&apos;s own top-level
                aggregate for the period, never re-derived by summing individual protocols (which would double-count protocol versions
                like Uniswap V3/V4, or miscount vs. DefiLlama&apos;s own categorization). The protocol table is filtered to category
                &quot;Dexs&quot; only.
              </p>
              <p>
                <strong>CEX vs DEX comparison</strong> — shown as two separately-scoped totals, not a combined market-share pie: the CEX
                figure covers only the {cex.data?.venues.length ?? "selected"} venues shown above (selected by today&apos;s volume, as
                noted), while the DEX figure is DefiLlama&apos;s full tracked-protocol universe. Their time windows also don&apos;t
                exactly align (CEX for 7D/30D/1Y is each venue&apos;s own most recent complete day; DEX is DefiLlama&apos;s own trailing
                window as of its fetch time). Because both the venue scope and the time window differ, this page never computes or shows
                a single combined
                &quot;X% of the total market is CEX&quot; percentage from these two numbers.
              </p>
              <p>
                <strong>Known access limit</strong> — DefiLlama&apos;s derivatives/perps overview requires a paid plan (confirmed: HTTP
                402) and was not accessed; this page only ever shows spot volume.
              </p>
              <p>
                <strong>Pair breakdown</strong> — for an expanded exchange, based on the top ~100 pairs by volume (page 1 of that
                exchange&apos;s tickers), which is a live current snapshot independent of the 7D/30D/1Y period selected above — not
                necessarily every listed pair for a very active exchange.
              </p>
              <p>
                <strong>Loading &amp; caching</strong> — identical requests from concurrent visitors are coalesced into one upstream
                call. On a 429, this app honors the provider&apos;s Retry-After header with a single bounded retry rather than guessing.
                A result already fetched once is served immediately on a repeat visit (labeled &quot;refreshing in the background…&quot;
                while a newer one is fetched) rather than making every visitor re-pay the full cold-load cost.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

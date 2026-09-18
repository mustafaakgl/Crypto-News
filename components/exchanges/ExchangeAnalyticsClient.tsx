"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CexOverviewResult, DexOverviewResult, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { EXCHANGE_PERIODS, EXCHANGE_PERIOD_LABEL } from "@/lib/exchangeAnalytics/types";
import { CexTable } from "@/components/exchanges/CexTable";
import { DexTable } from "@/components/exchanges/DexTable";
import { ExchangeDrilldown } from "@/components/exchanges/ExchangeDrilldown";
import { VolumeComparisonSummary } from "@/components/exchanges/VolumeComparisonSummary";
import { dateTime } from "@/lib/time";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is "5" | "10" {
  return v === "5" || v === "10";
}

type ApiResponse = { period: ExchangePeriod; count: VenueCount; cex: CexOverviewResult; dex: DexOverviewResult };

// 7D/30D/1Y cold loads fetch each selected venue's own history SEQUENTIALLY
// with a deliberate delay (see lib/exchangeAnalytics/cexVenues.ts) to stay
// under CoinGecko's confirmed 5-15 requests/minute anonymous rate limit —
// up to ~45s for 10 venues. A generous client timeout avoids aborting a
// request that's genuinely still in progress, not stuck.
const CLIENT_TIMEOUT_MS = 70_000;

export function ExchangeAnalyticsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = useId();

  const period: ExchangePeriod = isPeriod(searchParams.get("period")) ? (searchParams.get("period") as ExchangePeriod) : "1d";
  const count: VenueCount = isCount(searchParams.get("count")) ? (Number(searchParams.get("count")) as VenueCount) : 5;

  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const requestIdRef = useRef(0);

  function navigate(next: Partial<{ period: ExchangePeriod; count: VenueCount }>) {
    const params = new URLSearchParams();
    const nextPeriod = next.period ?? period;
    const nextCount = next.count ?? count;
    if (nextPeriod !== "1d") params.set("period", nextPeriod);
    if (nextCount !== 5) params.set("count", String(nextCount));
    const qs = params.toString();
    router.push(qs ? `/en/analytics/exchanges?${qs}` : "/en/analytics/exchanges", { scroll: false });
  }

  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
    // Clear the previous selection's data immediately — a period/count
    // change never leaves the old figures showing under the new controls.
    setData(null);
    setExpandedId(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    fetch(`/api/exchanges/overview?period=${period}&count=${count}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: ApiResponse) => {
        if (thisRequestId !== requestIdRef.current) return;
        setData(json);
        setState("ready");
      })
      .catch((err) => {
        if (thisRequestId !== requestIdRef.current) return;
        setErrorMessage(err instanceof DOMException && err.name === "AbortError" ? "Request timed out." : "Could not load exchange data.");
        setState("error");
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [period, count]);

  const allWarnings = [...(data?.cex.warnings ?? []), ...(data?.dex.warnings ?? [])];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/en/analytics" className="text-xs font-semibold uppercase tracking-wide text-ink/60 hover:text-ink">
        ← Asset analytics
      </Link>
      <h1 className="font-serif text-3xl font-800 mt-2 mb-1">Exchange Analytics</h1>
      <p className="text-sm text-ink/70 mb-4">
        Centralized (CEX) vs decentralized (DEX) spot trading volume — no futures/perpetuals, no LLM-generated commentary.
      </p>

      <div className="flex flex-wrap items-center gap-4 border-y border-rule py-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">Period</span>
          <div className="flex gap-1" role="group" aria-label="Select time period">
            {EXCHANGE_PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => navigate({ period: p })}
                aria-pressed={period === p}
                className={`px-3 py-1 text-xs font-semibold border ${
                  period === p ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
                }`}
              >
                {EXCHANGE_PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">Venues</span>
          <div className="flex gap-1" role="group" aria-label="Select number of venues to show">
            {[5, 10].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => navigate({ count: c as VenueCount })}
                aria-pressed={count === c}
                className={`px-3 py-1 text-xs font-semibold border ${
                  count === c ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
                }`}
              >
                Top {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state === "loading" && (
        <p className="text-sm text-ink/50 animate-pulse py-8">
          {period === "1d"
            ? "Loading…"
            : `Fetching ${count}-venue historical data from CoinGecko's public API — this can take up to ${count === 10 ? "45" : "25"} seconds due to the free tier's strict rate limit.`}
        </p>
      )}

      {state === "error" && (
        <div className="border border-ink/20 px-4 py-6 text-center">
          <p className="text-sm text-ink/60 mb-2">{errorMessage}</p>
          <button
            type="button"
            onClick={() => navigate({})}
            className="text-xs font-semibold uppercase tracking-wide border border-ink/30 px-2 py-1 hover:border-ink"
          >
            Retry
          </button>
        </div>
      )}

      {state === "ready" && data && (
        <div className="space-y-8">
          {allWarnings.length > 0 && (
            <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">
              Partial data: {allWarnings.join(" ")}
            </p>
          )}

          <section>
            <h2 className="font-serif text-xl font-700 mb-2">CEX vs DEX — {EXCHANGE_PERIOD_LABEL[period]}</h2>
            <VolumeComparisonSummary cex={data.cex} dex={data.dex} />
          </section>

          <section>
            <h2 className="font-serif text-xl font-700 mb-1">Centralized exchanges</h2>
            <p className="text-xs text-ink/50 mb-2">
              Ranked by {data.cex.venues[0]?.volumeKind === "trailing_24h" ? "trailing 24h" : `${EXCHANGE_PERIOD_LABEL[period]} total`} spot
              volume as reported by CoinGecko, from a pool of the {data.cex.rankingPoolSize} exchanges CoinGecko ranks by its own trust
              score — not necessarily every exchange that exists.
            </p>
            <CexTable venues={data.cex.venues} onExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))} expandedId={expandedId} />
            {expandedId && (
              <ExchangeDrilldown exchangeId={expandedId} exchangeName={data.cex.venues.find((v) => v.id === expandedId)?.name ?? expandedId} />
            )}
            {data.cex.venues[0] && (
              <p className="text-[11px] text-ink/40 mt-2">
                Window: {dateTime(data.cex.venues[0].periodStart)} – {dateTime(data.cex.venues[0].periodEnd)} (Europe/Berlin) · fetched{" "}
                {dateTime(data.cex.asOf)}
              </p>
            )}
          </section>

          <section>
            <h2 className="font-serif text-xl font-700 mb-1">Decentralized exchanges</h2>
            <p className="text-xs text-ink/50 mb-2">
              Ranked by {EXCHANGE_PERIOD_LABEL[period]} volume as reported by DefiLlama, spot DEX protocols only (category
              &quot;Dexs&quot;) — DEX aggregators are excluded since their volume is already routed through, and counted by, the
              underlying protocols shown here. From a pool of {data.dex.protocolPoolSize} tracked protocols.
            </p>
            <DexTable protocols={data.dex.protocols} />
            <p className="text-[11px] text-ink/40 mt-2">Fetched {dateTime(data.dex.asOf)} · source: DefiLlama</p>
          </section>

          <section className="border border-ink/20 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/60 mb-1">Flows &amp; price comparison</h2>
            <p className="text-xs text-ink/50">
              Not available yet — planned for a future phase. This page never estimates fiat bank flows from trading volume, and never
              shows a placeholder value in their place.
            </p>
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
                  <strong>CEX volume</strong> — CoinGecko&apos;s public API (no key, no paid plan). Exchanges are ranked from a pool of
                  the top {data.cex.rankingPoolSize} exchanges by CoinGecko&apos;s own trust-score ranking, then re-sorted by their
                  self-reported volume — CoinGecko&apos;s default list order is a trust ranking, not a volume ranking, and this app
                  never assumes otherwise. Self-reported volume is not audited; the Trust score column is shown so a high-volume,
                  low-trust venue is visible, not hidden. 1D uses the current trailing-24h figure; 7D/30D/1Y sum real non-overlapping
                  daily buckets from CoinGecko&apos;s volume_chart endpoint (confirmed: 1 day = 10-minutely rolling samples, 7-14 days =
                  hourly rolling samples, 30+ days = true daily buckets — only the daily buckets are ever summed into a period total,
                  never the rolling windows). USD figures for 7D/30D/1Y convert each day&apos;s BTC volume at that day&apos;s own
                  BTC/USD rate; 1D uses today&apos;s rate (labeled).
                </p>
                <p>
                  <strong>DEX volume</strong> — DefiLlama&apos;s free API (api.llama.fi, no key). Totals are DefiLlama&apos;s own
                  top-level aggregate for the period, never re-derived by summing individual protocols (which would double-count
                  protocol versions like Uniswap V3/V4, or miscount vs. DefiLlama&apos;s own categorization). The protocol table is
                  filtered to category &quot;Dexs&quot; only.
                </p>
                <p>
                  <strong>Known access limit</strong> — DefiLlama&apos;s derivatives/perps overview requires a paid plan (confirmed:
                  HTTP 402) and was not accessed; this page only ever shows spot volume.
                </p>
                <p>
                  <strong>Pair breakdown</strong> — for an expanded exchange, based on the top ~100 pairs by volume (page 1 of that
                  exchange&apos;s tickers) — not necessarily every listed pair for a very active exchange.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

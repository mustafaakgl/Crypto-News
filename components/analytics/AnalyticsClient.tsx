"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ASSETS, INTERVALS, isAsset, isInterval, type Asset, type Interval, type Candle } from "@/lib/klines";
import type { PriceActionResult } from "@/lib/priceAction";
import type { VolumeResult } from "@/lib/volume";
import type { DerivativesResult } from "@/lib/derivatives";
import type { OnChainResult } from "@/lib/onchain";
import { Tabs, type TabDef } from "@/components/analytics/Tabs";
import { PriceActionTab } from "@/components/analytics/PriceActionTab";
import { VolumeTab } from "@/components/analytics/VolumeTab";
import { DerivativesTab } from "@/components/analytics/DerivativesTab";
import { OnChainTab } from "@/components/analytics/OnChainTab";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

const CLIENT_FETCH_TIMEOUT_MS = 12000;

const TAB_KEYS = ["price-action", "volume", "derivatives", "on-chain"] as const;
type TabKey = (typeof TAB_KEYS)[number];
function isTabKey(v: string | null): v is TabKey {
  return !!v && (TAB_KEYS as readonly string[]).includes(v);
}

// "1H"/"4H"/"1D" are the same abbreviation in both supported interface
// languages — not threaded through the dictionary.
const INTERVAL_LABEL: Record<Interval, string> = { "1h": "1H", "4h": "4H", "1d": "1D" };

type ApiResponse = {
  asset: Asset;
  interval: Interval;
  pair: string;
  source: "Binance";
  candles: Candle[];
  lastClosedAt: number | null;
  stale: boolean;
  error: string | null;
  priceAction?: PriceActionResult;
  volume?: VolumeResult;
};

type LoadState = "loading" | "ready" | "error";

export function AnalyticsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = localeFromPathname(pathname);
  const dict = getDictionary(locale);
  const t = dict.analyticsHub;
  const TAB_DEFS: TabDef<TabKey>[] = [
    { key: "price-action", label: t.tabPriceAction },
    { key: "volume", label: t.tabVolume },
    { key: "derivatives", label: t.tabDerivatives },
    { key: "on-chain", label: t.tabOnChain },
  ];

  // The URL is the single source of truth for asset/tab/interval — this is
  // what makes browser back/forward "just work" with zero extra sync code:
  // every navigation (ours or the browser's) re-renders with fresh
  // searchParams, and these are simply re-derived from it.
  const asset: Asset = isAsset(searchParams.get("asset")) ? (searchParams.get("asset") as Asset) : "BTC";
  const tab: TabKey = isTabKey(searchParams.get("tab")) ? (searchParams.get("tab") as TabKey) : "price-action";
  const interval: Interval = isInterval(searchParams.get("interval")) ? (searchParams.get("interval") as Interval) : "4h";

  function navigate(next: Partial<{ asset: Asset; tab: TabKey; interval: Interval }>) {
    const params = new URLSearchParams();
    params.set("asset", next.asset ?? asset);
    params.set("tab", next.tab ?? tab);
    params.set("interval", next.interval ?? interval);
    router.push(`/${locale}/analytics?${params.toString()}`, { scroll: false });
  }

  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [derivatives, setDerivatives] = useState<DerivativesResult | null>(null);
  const [derivativesLoading, setDerivativesLoading] = useState(true);
  const [derivativesError, setDerivativesError] = useState<string | null>(null);

  const [onchain, setOnchain] = useState<OnChainResult | null>(null);
  const [onchainLoading, setOnchainLoading] = useState(true);
  const [onchainError, setOnchainError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const derivRequestIdRef = useRef(0);
  const derivAbortRef = useRef<AbortController | null>(null);
  const onchainRequestIdRef = useRef(0);
  const onchainAbortRef = useRef<AbortController | null>(null);

  // Klines + Price Action + Volume — keyed by asset AND interval. Shared by
  // both the Price Action and Volume tabs; switching between those two tabs
  // never re-triggers this effect (it doesn't depend on `tab`).
  useEffect(() => {
    const thisRequestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_FETCH_TIMEOUT_MS);

    setState("loading");
    setErrorMessage(null);

    fetch(`/api/klines?asset=${asset}&interval=${interval}`, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (res.status === 429) throw new Error(t.errorRateLimited);
        if (res.status === 503) throw new Error(t.errorServiceUnavailable);
        const json = (await res.json()) as ApiResponse;
        if (thisRequestId !== requestIdRef.current) return;

        if (json.error || json.candles.length === 0) {
          setErrorMessage(json.error ?? t.errorNoData);
          setData(json);
          setState("error");
          return;
        }
        setData(json);
        setState("ready");
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (thisRequestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          if (!timedOut) return; // superseded by a newer selection — not an error
          setErrorMessage(t.errorTimedOut);
          setData(null);
          setState("error");
          return;
        }
        setErrorMessage(err instanceof Error ? err.message : t.errorRequestFailed);
        setData(null);
        setState("error");
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [asset, interval]);

  // Derivatives — keyed by asset only (interval doesn't apply to funding/OI).
  useEffect(() => {
    const thisRequestId = ++derivRequestIdRef.current;
    derivAbortRef.current?.abort();
    const controller = new AbortController();
    derivAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_FETCH_TIMEOUT_MS);

    setDerivativesLoading(true);
    setDerivativesError(null);

    fetch(`/api/derivatives?asset=${asset}`, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (res.status === 429) throw new Error(t.errorRateLimited);
        if (res.status === 503) throw new Error(t.errorServiceUnavailable);
        const json = (await res.json()) as DerivativesResult | { error: string };
        if (thisRequestId !== derivRequestIdRef.current) return;
        if ("error" in json) {
          setDerivativesError(json.error);
          setDerivatives(null);
        } else {
          setDerivatives(json);
        }
        setDerivativesLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (thisRequestId !== derivRequestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          if (!timedOut) return;
          setDerivativesError(t.errorTimedOut);
          setDerivatives(null);
          setDerivativesLoading(false);
          return;
        }
        setDerivativesError(err instanceof Error ? err.message : t.errorRequestFailed);
        setDerivatives(null);
        setDerivativesLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [asset]);

  // On-chain — keyed by asset only; the 1H/4H/1D chart interval never
  // changes this daily-cadence data's period.
  useEffect(() => {
    const thisRequestId = ++onchainRequestIdRef.current;
    onchainAbortRef.current?.abort();
    const controller = new AbortController();
    onchainAbortRef.current = controller;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_FETCH_TIMEOUT_MS);

    setOnchainLoading(true);
    setOnchainError(null);

    fetch(`/api/onchain?asset=${asset}`, { signal: controller.signal })
      .then(async (res) => {
        clearTimeout(timeoutId);
        if (res.status === 429) throw new Error(t.errorRateLimited);
        if (res.status === 503) throw new Error(t.errorServiceUnavailable);
        const json = (await res.json()) as OnChainResult | { error: string };
        if (thisRequestId !== onchainRequestIdRef.current) return;
        if ("error" in json) {
          setOnchainError(json.error);
          setOnchain(null);
        } else {
          setOnchain(json);
        }
        setOnchainLoading(false);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        if (thisRequestId !== onchainRequestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          if (!timedOut) return;
          setOnchainError(t.errorTimedOut);
          setOnchain(null);
          setOnchainLoading(false);
          return;
        }
        setOnchainError(err instanceof Error ? err.message : t.errorRequestFailed);
        setOnchain(null);
        setOnchainLoading(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [asset]);

  const showIntervalControl = tab === "price-action" || tab === "volume";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="font-serif text-3xl font-800">{t.heading}</h1>
        <Link
          href={`/${locale}/analytics/exchanges`}
          className="text-xs font-semibold uppercase tracking-wide text-ink underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink"
        >
          {t.exchangeAnalyticsLink}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-y border-rule py-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">{t.asset}</span>
          <div className="flex gap-1" role="group" aria-label={t.ariaSelectAsset}>
            {ASSETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => navigate({ asset: a })}
                aria-pressed={asset === a}
                className={`px-3 py-1 text-xs font-semibold border ${
                  asset === a ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {showIntervalControl && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/60 uppercase tracking-wide">{t.interval}</span>
            <div className="flex gap-1" role="group" aria-label={t.ariaSelectInterval}>
              {INTERVALS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate({ interval: i })}
                  aria-pressed={interval === i}
                  className={`px-3 py-1 text-xs font-semibold border ${
                    interval === i ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"
                  }`}
                >
                  {INTERVAL_LABEL[i]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-rule mb-6">
        <Tabs tabs={TAB_DEFS} active={tab} onChange={(next) => navigate({ tab: next })} idPrefix="analytics" ariaLabel={t.ariaAnalyticsSections} />
      </div>

      {TAB_DEFS.map((def) => {
        if (def.key !== tab) return null; // only the active tabpanel is ever mounted
        return (
          <div key={def.key} role="tabpanel" id={`analytics-panel-${def.key}`} aria-labelledby={`analytics-tab-${def.key}`} tabIndex={0}>
            {def.key === "price-action" &&
              (state === "loading" && !data ? (
                <div className="border border-ink/20 px-4 py-16 text-center text-ink/50 animate-pulse">
                  {t.loadingCandles(asset, INTERVAL_LABEL[interval])}
                </div>
              ) : state === "error" && !data ? (
                <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">
                  {errorMessage ?? t.couldNotLoad}
                </div>
              ) : data && data.candles.length > 0 && data.priceAction && data.lastClosedAt ? (
                <PriceActionTab
                  asset={asset}
                  interval={interval}
                  candles={data.candles}
                  priceAction={data.priceAction}
                  lastClosedAt={data.lastClosedAt}
                  pair={data.pair}
                  source={`Binance klines · last closed candle`}
                  stale={data.stale}
                />
              ) : null)}

            {def.key === "volume" &&
              (state === "loading" && !data ? (
                <div className="border border-ink/20 px-4 py-16 text-center text-ink/50 animate-pulse">
                  {t.loadingCandles(asset, INTERVAL_LABEL[interval])}
                </div>
              ) : state === "error" && !data ? (
                <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">
                  {errorMessage ?? t.couldNotLoad}
                </div>
              ) : data && data.candles.length > 0 && data.volume && data.lastClosedAt ? (
                <VolumeTab
                  asset={asset}
                  interval={interval}
                  candles={data.candles}
                  volume={data.volume}
                  lastClosedAt={data.lastClosedAt}
                  pair={data.pair}
                  source="Binance klines"
                  stale={data.stale}
                  locale={locale}
                />
              ) : null)}

            {def.key === "derivatives" && (
              <DerivativesTab asset={asset} data={derivatives} loading={derivativesLoading} error={derivativesError} locale={locale} />
            )}

            {def.key === "on-chain" && (
              <OnChainTab asset={asset} data={onchain} loading={onchainLoading} error={onchainError} locale={locale} />
            )}
          </div>
        );
      })}
    </div>
  );
}

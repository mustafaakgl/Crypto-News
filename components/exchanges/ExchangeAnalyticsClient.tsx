"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { EXCHANGE_PERIODS } from "@/lib/exchangeAnalytics/types";
import { FLOW_ASSETS, FLOW_NETWORKS_BY_ASSET } from "@/lib/exchangeFlows/types";
import type { FlowAsset, FlowNetwork } from "@/lib/exchangeFlows/types";
import { VolumeTab } from "@/components/exchanges/VolumeTab";
import { FlowsTab } from "@/components/exchanges/FlowsTab";
import { PriceComparisonTab } from "@/components/exchanges/PriceComparisonTab";
import { localeFromPathname, withLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type ExchangeAnalyticsTab = "volume" | "flows" | "price";

function isPeriod(v: string | null): v is ExchangePeriod {
  return v === "1d" || v === "7d" || v === "30d" || v === "1y";
}
function isCount(v: string | null): v is "5" | "10" {
  return v === "5" || v === "10";
}
function isTab(v: string | null): v is ExchangeAnalyticsTab {
  return v === "volume" || v === "flows" || v === "price";
}
function isAsset(v: string | null): v is FlowAsset {
  return v !== null && (FLOW_ASSETS as string[]).includes(v);
}

export function ExchangeAnalyticsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = localeFromPathname(usePathname());
  const dict = getDictionary(locale);
  const t = dict.exchangeAnalytics;

  // Existing links (e.g. from a news article's "View BTC analytics") never
  // included a `tab` param and must keep opening Volume — "volume" is the
  // default whenever it's absent, not just when explicitly requested.
  const tab: ExchangeAnalyticsTab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as ExchangeAnalyticsTab) : "volume";
  const period: ExchangePeriod = isPeriod(searchParams.get("period")) ? (searchParams.get("period") as ExchangePeriod) : "1d";
  const count: VenueCount = isCount(searchParams.get("count")) ? (Number(searchParams.get("count")) as VenueCount) : 5;
  const asset: FlowAsset = isAsset(searchParams.get("asset")) ? (searchParams.get("asset") as FlowAsset) : FLOW_ASSETS[0];
  const validNetworks = FLOW_NETWORKS_BY_ASSET[asset];
  const requestedNetwork = searchParams.get("network") as FlowNetwork;
  const network: FlowNetwork = validNetworks.includes(requestedNetwork) ? requestedNetwork : validNetworks[0];

  function navigate(next: Partial<{ tab: ExchangeAnalyticsTab; period: ExchangePeriod; count: VenueCount; asset: FlowAsset; network: FlowNetwork }>) {
    const nextTab = next.tab ?? tab;
    const nextPeriod = next.period ?? period;
    const nextCount = next.count ?? count;
    // Changing asset resets network to that asset's own default rather than
    // keeping a prior asset's network selection under a new one.
    const nextAsset = next.asset ?? asset;
    const nextAssetNetworks = FLOW_NETWORKS_BY_ASSET[nextAsset];
    const nextNetwork = next.asset ? nextAssetNetworks[0] : (next.network ?? network);

    const params = new URLSearchParams();
    if (nextTab !== "volume") params.set("tab", nextTab);
    if (nextPeriod !== "1d") params.set("period", nextPeriod);
    if (nextCount !== 5) params.set("count", String(nextCount));
    if (nextTab === "flows") {
      if (nextAsset !== FLOW_ASSETS[0]) params.set("asset", nextAsset);
      if (nextNetwork && nextNetwork !== nextAssetNetworks[0]) params.set("network", nextNetwork);
    }
    const qs = params.toString();
    const base = withLocale("/en/analytics/exchanges", locale);
    router.push(qs ? `${base}?${qs}` : base, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link href={withLocale("/en/analytics", locale)} className="text-xs font-semibold uppercase tracking-wide text-ink/60 hover:text-ink">
        {t.backLink}
      </Link>
      <h1 className="font-serif text-3xl font-800 mt-2 mb-1">{t.heading}</h1>
      <p className="text-sm text-ink/70 mb-4">{t.subheading}</p>

      <div className="flex gap-1 border-b border-rule mb-4" role="tablist" aria-label={t.ariaView}>
        {(["volume", "flows", "price"] as const).map((tb) => (
          <button
            key={tb}
            type="button"
            role="tab"
            aria-selected={tab === tb}
            onClick={() => navigate({ tab: tb })}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide border-b-2 -mb-px ${
              tab === tb ? "border-accent text-ink" : "border-transparent text-ink/50 hover:text-ink"
            }`}
          >
            {tb === "volume" ? t.tabVolume : tb === "flows" ? t.tabFlows : t.tabPriceComparison}
          </button>
        ))}
      </div>

      {/* Price comparison always uses all ten exchanges as its reference set, so only Period applies there. */}
      <div className="flex flex-wrap items-center gap-4 border-b border-rule pb-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink/60 uppercase tracking-wide">{t.period}</span>
          <div className="flex gap-1" role="group" aria-label={t.ariaSelectPeriod}>
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
                {t.periodLabels[p]}
              </button>
            ))}
          </div>
        </div>
        {tab !== "price" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/60 uppercase tracking-wide">{t.venues}</span>
            <div className="flex gap-1" role="group" aria-label={t.ariaSelectVenueCount}>
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
                  {t.topN(c)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === "volume" && <VolumeTab period={period} count={count} locale={locale} />}
      {tab === "flows" && (
        <FlowsTab
          period={period}
          count={count}
          asset={asset}
          network={network}
          onAssetChange={(a) => navigate({ asset: a })}
          onNetworkChange={(n) => navigate({ network: n })}
          locale={locale}
        />
      )}
      {tab === "price" && <PriceComparisonTab period={period} locale={locale} />}
    </div>
  );
}

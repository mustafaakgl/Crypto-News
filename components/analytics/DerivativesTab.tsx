import type { Asset } from "@/lib/klines";
import type { DerivativesResult } from "@/lib/derivatives";
import { isRealtimeStale, isHourlySeriesStale } from "@/lib/derivatives";
import { TabSection } from "@/components/analytics/TabSection";
import { Sparkline } from "@/components/analytics/Sparkline";
import { utcDateTime } from "@/lib/time";
import { formatFundingPct, formatPct, formatQuantity, formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

function Field({
  label,
  value,
  time,
  badge,
  unavailableLabel,
}: {
  label: string;
  value: React.ReactNode;
  time: number | null;
  badge?: { text: string; color: "red" | "accent" } | null;
  unavailableLabel: string;
}) {
  return (
    <div className="border-b border-rule py-2 last:border-b-0">
      <p className="text-[11px] uppercase tracking-wide text-ink/50">{label}</p>
      {value !== null ? (
        <p className="font-serif text-base font-700">
          {value}
          {badge && (
            <span
              className={`ml-2 text-[11px] font-sans font-semibold ${
                badge.color === "red" ? "text-red-700" : "text-ink/60"
              }`}
            >
              {badge.text}
            </span>
          )}
        </p>
      ) : (
        <p className="text-sm text-ink/40">{unavailableLabel}</p>
      )}
      {time !== null && <p className="text-[11px] text-ink/40">{utcDateTime(time)}</p>}
    </div>
  );
}

export function DerivativesTab({
  asset,
  data,
  loading,
  error,
  locale = "en",
}: {
  asset: Asset;
  data: DerivativesResult | null;
  loading: boolean;
  error: string | null;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const t = dict.derivatives;

  if (loading && !data) {
    return <div className="border border-ink/20 px-4 py-16 text-center text-ink/50 animate-pulse">{t.loading(asset)}</div>;
  }

  if (error && !data) {
    return <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">{error}</div>;
  }

  if (!data) return null;

  const now = Date.now();
  const oiStale = isRealtimeStale(data.oiQuantityTime, now);
  const oiHistStale = isHourlySeriesStale(data.oiHistory[data.oiHistory.length - 1]?.time ?? null, now);
  const fundingBadge = data.fundingFreshness === "awaiting_settlement" ? ({ text: t.awaitingSettlementData, color: "accent" } as const) : null;

  const meaningParts: React.ReactNode[] = [];
  if (data.lastFundingRatePct !== null) {
    const sign = data.lastFundingRatePct >= 0 ? "positive" : "negative";
    meaningParts.push(
      <span key="funding">
        {t.fundingSentence(`${asset}`, sign, formatFundingPct(data.lastFundingRatePct), data.lastFundingTime ? utcDateTime(data.lastFundingTime) : t.unknownTime)}
      </span>
    );
    if (data.fundingFreshness === "awaiting_settlement" && data.missingSettlementExpectedAt) {
      meaningParts.push(
        <span key="awaiting">
          {t.awaitingSentence(
            utcDateTime(data.missingSettlementExpectedAt),
            data.expectedNextFundingTime ? t.nextFundingSuffix(utcDateTime(data.expectedNextFundingTime)) : ""
          )}
        </span>
      );
    }
  } else {
    meaningParts.push(<span key="funding-unavail">{t.fundingRateUnavailable}</span>);
  }
  if (data.oiChangePct24h !== null) {
    const dir = data.oiChangePct24h >= 0 ? "increased" : "decreased";
    meaningParts.push(<span key="oi">{t.oiChangeSentence(dir, Math.abs(data.oiChangePct24h).toFixed(1))}</span>);
  } else {
    meaningParts.push(<span key="oi-unavail">{t.oiChangeUnavailable}</span>);
  }

  return (
    <TabSection
      intro={t.intro}
      meaning={meaningParts}
      sourceLine={
        <>
          {data.source}
          {data.warnings.length > 0 && <span className="text-red-700"> · {data.warnings.join(" ")}</span>}
        </>
      }
      methodology={
        <>
          <p>{t.methodology}</p>
          {data.fundingIntervalHours !== null && (
            <p className="mt-2">
              {t.fundingIntervalNote(data.fundingIntervalHours, data.fundingIntervalSource === "provider" ? t.fundingSourceProvider : t.fundingSourceDerived)}
            </p>
          )}
          {data.markPrice !== null && <p>{t.markPrice(data.markPrice.toFixed(2))}</p>}
        </>
      }
    >
      <div className="border border-ink">
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6">
          <Field
            label={t.lastSettledFundingRate}
            value={data.lastFundingRatePct !== null ? formatFundingPct(data.lastFundingRatePct) : null}
            time={data.lastFundingTime}
            badge={fundingBadge}
            unavailableLabel={dict.common.unavailableCapitalized}
          />
          <Field
            label={t.nextFundingTime}
            value={data.nextFundingTime !== null ? `${utcDateTime(data.nextFundingTime)}${data.nextFundingIsPast ? t.pastAwaitingRefresh : ""}` : null}
            time={null}
            unavailableLabel={dict.common.unavailableCapitalized}
          />
          <Field
            label={t.openInterest}
            value={data.oiQuantity !== null ? formatQuantity(data.oiQuantity, asset) : null}
            time={data.oiQuantityTime}
            badge={oiStale ? { text: t.stale, color: "red" } : null}
            unavailableLabel={dict.common.unavailableCapitalized}
          />
          <Field
            label={t.openInterestNotional}
            value={data.oiNotionalUsd !== null ? formatMarketCap(data.oiNotionalUsd) : null}
            time={data.oiNotionalTime}
            badge={oiHistStale ? { text: t.stale, color: "red" } : null}
            unavailableLabel={dict.common.unavailableCapitalized}
          />
          <Field
            label={t.openInterestChange24h}
            value={data.oiChangePct24h !== null ? formatPct(data.oiChangePct24h) : null}
            time={data.oiChangeLastTime}
            badge={oiHistStale ? { text: t.stale, color: "red" } : null}
            unavailableLabel={dict.common.unavailableCapitalized}
          />
        </div>

        <div className="px-4 py-3 border-t border-rule">
          <p className="text-[11px] uppercase tracking-wide text-ink/50 mb-2">{t.openInterestHistorySection(asset)}</p>
          <Sparkline points={data.oiHistory} label={t.openInterestSparklineLabel} locale={locale} />
        </div>
      </div>
    </TabSection>
  );
}

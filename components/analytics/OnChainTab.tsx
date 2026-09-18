import type { Asset } from "@/lib/klines";
import type { OnChainResult, OnChainMetric } from "@/lib/onchain";
import { TabSection } from "@/components/analytics/TabSection";
import { Sparkline } from "@/components/analytics/Sparkline";
import { dateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary, type Dictionary } from "@/lib/i18n/getDictionary";

function MetricBlock({ metric, dict, locale }: { metric: OnChainMetric; dict: Dictionary; locale: Locale }) {
  const points = metric.series30d.map((p) => ({ time: new Date(`${p.date}T00:00:00.000Z`).getTime(), value: p.value }));
  const t = dict.onChain;
  const label = t.metricLabel[metric.key];
  const unit = t.metricUnit[metric.key];

  return (
    <div className="border-b border-rule py-3 last:border-b-0">
      <p className="text-[11px] uppercase tracking-wide text-ink/50">{label}</p>
      <p className="text-[11px] text-ink/40 mb-1">{unit}</p>

      {!metric.available ? (
        <p className="text-sm text-ink/40">{t.dataUnavailable}</p>
      ) : (
        <>
          <p className="font-serif text-lg font-700">
            {metric.lastCompleted ? metric.lastCompleted.value.toLocaleString("en-GB") : dict.common.unavailableCapitalized}
          </p>
          {metric.lastCompleted && <p className="text-[11px] text-ink/40">{t.dayOfUtc(metric.lastCompleted.date)}</p>}

          <p className="mt-2 text-xs text-ink/70">
            {t.sevenDayAvgVsPrior}{" "}
            {metric.weekOverWeek.changePct !== null ? (
              <span className="font-semibold">
                {metric.weekOverWeek.changePct >= 0 ? "+" : ""}
                {metric.weekOverWeek.changePct.toFixed(1)}%
              </span>
            ) : (
              <span className="text-ink/40">{t.insufficientData}</span>
            )}
          </p>

          {/* Only attempt a chart when there's real data — never an empty chart placeholder. */}
          {metric.series30d.length > 1 && (
            <div className="mt-2">
              <Sparkline points={points} label={`${label}, 30 days`} locale={locale} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function OnChainTab({
  asset,
  data,
  loading,
  error,
  locale = "en",
}: {
  asset: Asset;
  data: OnChainResult | null;
  loading: boolean;
  error: string | null;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const t = dict.onChain;

  // fetchOnChain() resolves immediately (no live network call is made yet),
  // so this loading state is only ever visible for a moment — never an
  // indefinite spinner.
  if (loading && !data) {
    return <div className="border border-ink/20 px-4 py-8 text-center text-ink/50 text-sm">{t.loading(asset)}</div>;
  }

  if (error && !data) {
    return <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">{error}</div>;
  }

  if (!data) return null;

  return (
    <TabSection
      intro={t.intro}
      meaning={data.available ? <>{t.mostRecentDay(asset)}</> : <>{t.notConnected}</>}
      sourceLine={
        data.available ? (
          data.dataAsOf ? (
            <>{t.sourceLine(data.network, data.source, data.dataAsOf)}</>
          ) : (
            <>
              {data.network} · {data.source}
            </>
          )
        ) : (
          <>{t.sourceLineNotConnected(data.network)}</>
        )
      }
      methodology={
        <>
          <p>{t.methodology}</p>
          {data.available && <p className="mt-2">{t.fetched(dateTime(data.fetchedAt))}</p>}
        </>
      }
    >
      {!data.available && (
        <div className="border border-dashed border-ink/30 bg-ink/5 px-4 py-3">
          <p className="text-sm font-semibold text-ink/70">{t.notAvailableYet}</p>
          {data.unavailableReason && <p className="mt-1 text-xs text-ink/50">{data.unavailableReason}</p>}
        </div>
      )}

      <div className="border border-ink px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6">
        {data.metrics.map((metric) => (
          <MetricBlock key={metric.key} metric={metric} dict={dict} locale={locale} />
        ))}
      </div>
    </TabSection>
  );
}

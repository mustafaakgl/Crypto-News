import type { Asset } from "@/lib/klines";
import type { DerivativesResult } from "@/lib/derivatives";
import { isRealtimeStale, isHourlySeriesStale } from "@/lib/derivatives";
import { TabSection } from "@/components/analytics/TabSection";
import { Sparkline } from "@/components/analytics/Sparkline";
import { utcDateTime } from "@/lib/time";
import { formatFundingPct, formatPct, formatQuantity, formatMarketCap } from "@/lib/format";

function Field({
  label,
  value,
  time,
  badge,
}: {
  label: string;
  value: React.ReactNode;
  time: number | null;
  badge?: { text: string; color: "red" | "accent" } | null;
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
        <p className="text-sm text-ink/40">Unavailable</p>
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
}: {
  asset: Asset;
  data: DerivativesResult | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading && !data) {
    return <div className="border border-ink/20 px-4 py-16 text-center text-ink/50 animate-pulse">Loading {asset}USDT perpetual futures data…</div>;
  }

  if (error && !data) {
    return <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">{error}</div>;
  }

  if (!data) return null;

  const now = Date.now();
  const oiStale = isRealtimeStale(data.oiQuantityTime, now);
  const oiHistStale = isHourlySeriesStale(data.oiHistory[data.oiHistory.length - 1]?.time ?? null, now);
  const fundingBadge =
    data.fundingFreshness === "awaiting_settlement"
      ? ({ text: "Awaiting settlement data", color: "accent" } as const)
      : null;

  const meaningParts: React.ReactNode[] = [];
  if (data.lastFundingRatePct !== null) {
    const sign = data.lastFundingRatePct >= 0 ? "positive" : "negative";
    meaningParts.push(
      <span key="funding">
        Last settled funding on {asset}USDT was {sign} ({formatFundingPct(data.lastFundingRatePct)}) at{" "}
        {data.lastFundingTime ? utcDateTime(data.lastFundingTime) : "an unknown time"}.{" "}
      </span>
    );
    if (data.fundingFreshness === "awaiting_settlement" && data.missingSettlementExpectedAt) {
      meaningParts.push(
        <span key="awaiting">
          A settlement expected around {utcDateTime(data.missingSettlementExpectedAt)} hasn&rsquo;t appeared in the
          feed yet
          {data.expectedNextFundingTime && <> (next scheduled: {utcDateTime(data.expectedNextFundingTime)})</>}.{" "}
        </span>
      );
    }
  } else {
    meaningParts.push(<span key="funding-unavail">Realized funding rate is unavailable right now. </span>);
  }
  if (data.oiChangePct24h !== null) {
    const dir = data.oiChangePct24h >= 0 ? "increased" : "decreased";
    meaningParts.push(
      <span key="oi">
        Open interest {dir} by {Math.abs(data.oiChangePct24h).toFixed(1)}% over the matched ~24h period.
      </span>
    );
  } else {
    meaningParts.push(<span key="oi-unavail">24h open interest change is unavailable.</span>);
  }

  return (
    <TabSection
      intro="Binance perpetual futures funding and open interest for the selected asset — a separate market from the spot candles above."
      meaning={meaningParts}
      sourceLine={
        <>
          {data.source}
          {data.warnings.length > 0 && <span className="text-red-700"> · {data.warnings.join(" ")}</span>}
        </>
      }
      methodology={
        <>
          <p>
            Funding rate is the most recently settled value from funding-rate history (matched by fundingTime, not
            array position), shown as a percentage — not the next funding rate. The funding interval is read from
            Binance&rsquo;s own funding schedule for this symbol where available, or otherwise derived from the
            spacing between realized records — never assumed to be a fixed 8h. &ldquo;Awaiting settlement
            data&rdquo; appears once a settlement should already have happened (even if the provider&rsquo;s own
            next-funding time has already rolled forward to the following period) and a short grace period has
            passed without a new record.
          </p>
          <p className="mt-2">
            Open interest change compares the latest hourly sample to the point closest to 24h earlier by timestamp
            (not a fixed 24-sample offset); if no point falls within ~90 minutes of that target, the change is
            Unavailable. Quantity (contracts) and notional (USD) are separate figures from separate endpoints with
            their own timestamps. All figures cover Binance USDⓈ-M perpetual futures only, not the wider derivatives
            market. A rising open interest alone is not treated as a directional (bullish/bearish) signal here.
          </p>
          {data.fundingIntervalHours !== null && (
            <p className="mt-2">
              Funding interval: {data.fundingIntervalHours}h (
              {data.fundingIntervalSource === "provider" ? "from Binance's funding schedule" : "derived from realized records"}
              ).
            </p>
          )}
          {data.markPrice !== null && <p>Mark price {data.markPrice.toFixed(2)} USDT.</p>}
        </>
      }
    >
      <div className="border border-ink">
        <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6">
          <Field
            label="Last settled funding rate"
            value={data.lastFundingRatePct !== null ? formatFundingPct(data.lastFundingRatePct) : null}
            time={data.lastFundingTime}
            badge={fundingBadge}
          />
          <Field
            label="Next funding time"
            value={
              data.nextFundingTime !== null
                ? `${utcDateTime(data.nextFundingTime)}${data.nextFundingIsPast ? " (past — awaiting refresh)" : ""}`
                : null
            }
            time={null}
          />
          <Field
            label="Open interest"
            value={data.oiQuantity !== null ? formatQuantity(data.oiQuantity, asset) : null}
            time={data.oiQuantityTime}
            badge={oiStale ? { text: "stale", color: "red" } : null}
          />
          <Field
            label="Open interest (notional)"
            value={data.oiNotionalUsd !== null ? formatMarketCap(data.oiNotionalUsd) : null}
            time={data.oiNotionalTime}
            badge={oiHistStale ? { text: "stale", color: "red" } : null}
          />
          <Field
            label="Open interest change — 24h"
            value={data.oiChangePct24h !== null ? formatPct(data.oiChangePct24h) : null}
            time={data.oiChangeLastTime}
            badge={oiHistStale ? { text: "stale", color: "red" } : null}
          />
        </div>

        <div className="px-4 py-3 border-t border-rule">
          <p className="text-[11px] uppercase tracking-wide text-ink/50 mb-2">
            Open interest · 72h history · 1h samples ({asset})
          </p>
          <Sparkline points={data.oiHistory} label="Open interest, 72h hourly" />
        </div>
      </div>
    </TabSection>
  );
}

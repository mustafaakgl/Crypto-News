import type { Asset } from "@/lib/klines";
import type { OnChainResult, OnChainMetric } from "@/lib/onchain";
import { TabSection } from "@/components/analytics/TabSection";
import { Sparkline } from "@/components/analytics/Sparkline";
import { dateTime } from "@/lib/time";

function MetricBlock({ metric }: { metric: OnChainMetric }) {
  const points = metric.series30d.map((p) => ({ time: new Date(`${p.date}T00:00:00.000Z`).getTime(), value: p.value }));

  return (
    <div className="border-b border-rule py-3 last:border-b-0">
      <p className="text-[11px] uppercase tracking-wide text-ink/50">{metric.label}</p>
      <p className="text-[11px] text-ink/40 mb-1">{metric.unit}</p>

      {!metric.available ? (
        <p className="text-sm text-ink/40">Data unavailable</p>
      ) : (
        <>
          <p className="font-serif text-lg font-700">
            {metric.lastCompleted ? metric.lastCompleted.value.toLocaleString("en-GB") : "Unavailable"}
          </p>
          {metric.lastCompleted && <p className="text-[11px] text-ink/40">day of {metric.lastCompleted.date} (UTC)</p>}

          <p className="mt-2 text-xs text-ink/70">
            7d avg vs prior 7d:{" "}
            {metric.weekOverWeek.changePct !== null ? (
              <span className="font-semibold">
                {metric.weekOverWeek.changePct >= 0 ? "+" : ""}
                {metric.weekOverWeek.changePct.toFixed(1)}%
              </span>
            ) : (
              <span className="text-ink/40">Insufficient data</span>
            )}
          </p>

          {/* Only attempt a chart when there's real data — never an empty chart placeholder. */}
          {metric.series30d.length > 1 && (
            <div className="mt-2">
              <Sparkline points={points} label={`${metric.label}, 30 days`} />
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
}: {
  asset: Asset;
  data: OnChainResult | null;
  loading: boolean;
  error: string | null;
}) {
  // fetchOnChain() resolves immediately (no live network call is made yet),
  // so this loading state is only ever visible for a moment — never an
  // indefinite spinner.
  if (loading && !data) {
    return <div className="border border-ink/20 px-4 py-8 text-center text-ink/50 text-sm">Loading {asset} network data…</div>;
  }

  if (error && !data) {
    return <div className="border border-ink/20 bg-accent/10 px-4 py-6 text-center text-ink/70">{error}</div>;
  }

  if (!data) return null;

  return (
    <TabSection
      intro="Daily on-chain network activity for the selected asset — active addresses, transaction count, and total fees."
      meaning={
        data.available ? (
          <>{asset} network activity for the most recently completed UTC day is shown above.</>
        ) : (
          <>
            No live figures below — the metrics stay defined and ready, but nothing is connected. See
            &ldquo;Methodology &amp; sources&rdquo; for exactly what was checked and why.
          </>
        )
      }
      sourceLine={
        data.available ? (
          <>
            {data.network} · {data.source}
            {data.dataAsOf && <> · data as of {data.dataAsOf}</>}
          </>
        ) : (
          <>{data.network} · Not connected</>
        )
      }
      methodology={
        <>
          <p>
            Daily metrics only, from the most recently fully completed UTC day — the current, still-in-progress UTC
            day is never included. The 7-day comparison uses real calendar dates: both the most recent 7 complete
            days and the 7 days before that must be fully present, or the change shows &ldquo;Insufficient
            data&rdquo; (never a partial-week estimate). No change is shown when the prior week&rsquo;s average is
            zero.
          </p>
          <p className="mt-2">
            &ldquo;Active addresses&rdquo; counts distinct addresses seen on-chain per day, not unique people or
            wallets under common control. Ethereum figures would cover mainnet only, not L2 rollups. Fees are
            reported in the currency the source provides, USD unless noted otherwise. A rise in network activity
            alone is not read here as a price or buy signal.
          </p>
          <p className="mt-2">
            Source check performed this turn: Coin Metrics Community API/data is licensed CC BY-NC 4.0
            (non-commercial; github.com/coinmetrics/data, docs.coinmetrics.io) — free access is not the same as
            commercial redistribution permission, and no subscription was started. A second free candidate
            (blockchain.com&rsquo;s Charts/Stats API) had ambiguous, restrictively-worded API terms for third-party
            redistribution and was not connected either.
          </p>
          {data.available && <p className="mt-2">Fetched {dateTime(data.fetchedAt)}.</p>}
        </>
      }
    >
      {!data.available && (
        <div className="border border-dashed border-ink/30 bg-ink/5 px-4 py-3">
          <p className="text-sm font-semibold text-ink/70">On-chain data is not available yet.</p>
          {data.unavailableReason && <p className="mt-1 text-xs text-ink/50">{data.unavailableReason}</p>}
        </div>
      )}

      <div className="border border-ink px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-x-6">
        {data.metrics.map((metric) => (
          <MetricBlock key={metric.key} metric={metric} />
        ))}
      </div>
    </TabSection>
  );
}

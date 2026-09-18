import type { CexOverviewResult, DexOverviewResult } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";

// Deliberately does NOT compute a combined "CEX is X%, DEX is Y%" market
// share: the CEX total here covers only the selected N venues (chosen by
// TODAY's volume — see cexVenues.ts) while the DEX total is DefiLlama's
// entire tracked-protocol universe, and their time windows don't exactly
// align either (CEX = complete UTC calendar days; DEX = DefiLlama's own
// trailing window as of its fetch time). Treating those two numbers as
// parts of one whole would silently smuggle in a "this selection tells you
// the whole market's CEX/DEX split" claim that the underlying data cannot
// support. Instead, both totals are shown as independent bars (length
// relative to whichever is larger) purely for a sense of scale, each with
// its own explicit scope label.
export function VolumeComparisonSummary({ cex, dex }: { cex: CexOverviewResult; dex: DexOverviewResult }) {
  const cexTotalUsd = cex.venues.reduce((sum, v) => sum + (v.volumeUsd ?? 0), 0);
  const cexHasUsd = cex.venues.some((v) => v.volumeUsd !== null);
  const dexTotalUsd = dex.totalVolumeUsd;

  const maxUsd = Math.max(cexHasUsd ? cexTotalUsd : 0, dexTotalUsd ?? 0, 1);
  const cexBarPct = cexHasUsd ? (cexTotalUsd / maxUsd) * 100 : 0;
  const dexBarPct = dexTotalUsd !== null ? (dexTotalUsd / maxUsd) * 100 : 0;

  return (
    <div className="space-y-3">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">CEX vs DEX volume comparison for the selected period — two separately-scoped totals, not a market-share split</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
            <th scope="col" className="py-1">
              Venue type (scope)
            </th>
            <th scope="col" className="py-1 text-right">
              Volume (USD)
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-rule/60">
            <td className="py-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-accent mr-1.5 align-middle" aria-hidden />
              CEX — {cex.venues.length} selected exchange{cex.venues.length === 1 ? "" : "s"} only
            </td>
            <td className="py-1.5 text-right tabular-nums">{cexHasUsd ? formatMarketCap(cexTotalUsd) : "—"}</td>
          </tr>
          <tr>
            <td className="py-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-ink mr-1.5 align-middle" aria-hidden />
              DEX — DefiLlama&apos;s full tracked-protocol universe
            </td>
            <td className="py-1.5 text-right tabular-nums">{dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "—"}</td>
          </tr>
        </tbody>
      </table>
      <div className="space-y-1.5" role="img" aria-label={`CEX (${cex.venues.length} selected venues): ${cexHasUsd ? formatMarketCap(cexTotalUsd) : "unknown"}. DEX (DefiLlama full universe): ${dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "unknown"}. Shown for scale only, not a combined market share.`}>
        <div className="h-3 bg-accent" style={{ width: `${Math.max(cexBarPct, cexHasUsd ? 1.5 : 0)}%` }} />
        <div className="h-3 bg-ink" style={{ width: `${Math.max(dexBarPct, dexTotalUsd !== null ? 1.5 : 0)}%` }} />
      </div>
      <p className="text-[11px] text-ink/50">
        These two bars compare absolute scale only — they are <strong>not</strong> a combined market-share split. The CEX total is only
        the {cex.venues.length} selected exchanges above (increasing the venue count changes it); the DEX total is DefiLlama&apos;s own
        global figure, unrelated to any venue count. Their time windows also don&apos;t exactly align (see Methodology below). A single
        &quot;CEX is X% of the market&quot; figure is deliberately not computed from these two numbers.
      </p>
    </div>
  );
}

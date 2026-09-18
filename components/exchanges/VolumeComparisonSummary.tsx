import type { CexOverviewResult, DexOverviewResult } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";

// Sums only the venues actually displayed (top N) — never presented as
// "all CEX volume", since the ranking pool itself is scoped (see
// lib/exchangeAnalytics/cexVenues.ts). Percentages are always labeled
// "Share of selected venues", never "market share".
export function VolumeComparisonSummary({ cex, dex }: { cex: CexOverviewResult; dex: DexOverviewResult }) {
  const cexTotalUsd = cex.venues.reduce((sum, v) => sum + (v.volumeUsd ?? 0), 0);
  const cexHasUsd = cex.venues.some((v) => v.volumeUsd !== null);
  const dexTotalUsd = dex.totalVolumeUsd;

  const combined = (cexHasUsd ? cexTotalUsd : 0) + (dexTotalUsd ?? 0);
  const cexShare = combined > 0 && cexHasUsd ? (cexTotalUsd / combined) * 100 : null;
  const dexShare = combined > 0 && dexTotalUsd !== null ? ((dexTotalUsd ?? 0) / combined) * 100 : null;

  return (
    <div className="space-y-2">
      <div className="flex h-6 w-full overflow-hidden border border-ink/20" role="img" aria-label={`CEX (selected venues): ${cexShare?.toFixed(0) ?? "unknown"}%. DEX (DefiLlama total): ${dexShare?.toFixed(0) ?? "unknown"}%.`}>
        {cexShare !== null && <div className="bg-accent h-full" style={{ width: `${cexShare}%` }} />}
        {dexShare !== null && <div className="bg-ink h-full" style={{ width: `${dexShare}%` }} />}
      </div>
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">CEX vs DEX volume comparison for the selected period</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
            <th scope="col" className="py-1">
              Venue type
            </th>
            <th scope="col" className="py-1 text-right">
              Volume (USD)
            </th>
            <th scope="col" className="py-1 text-right">
              Share of selected venues
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-rule/60">
            <td className="py-1">
              <span className="inline-block w-2.5 h-2.5 bg-accent mr-1.5 align-middle" aria-hidden />
              CEX ({cex.venues.length} venue{cex.venues.length === 1 ? "" : "s"})
            </td>
            <td className="py-1 text-right tabular-nums">{cexHasUsd ? formatMarketCap(cexTotalUsd) : "—"}</td>
            <td className="py-1 text-right tabular-nums">{cexShare !== null ? `${cexShare.toFixed(1)}%` : "—"}</td>
          </tr>
          <tr>
            <td className="py-1">
              <span className="inline-block w-2.5 h-2.5 bg-ink mr-1.5 align-middle" aria-hidden />
              DEX (DefiLlama total, all spot DEXs)
            </td>
            <td className="py-1 text-right tabular-nums">{dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "—"}</td>
            <td className="py-1 text-right tabular-nums">{dexShare !== null ? `${dexShare.toFixed(1)}%` : "—"}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[11px] text-ink/50">
        The DEX figure is DefiLlama&apos;s own global total (not limited to a venue count). The CEX figure is the sum of only the{" "}
        {cex.venues.length} selected exchanges above — increasing the venue count changes this comparison.
      </p>
    </div>
  );
}

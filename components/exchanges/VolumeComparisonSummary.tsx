import type { CexOverviewResult, DexOverviewResult } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

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
export function VolumeComparisonSummary({ cex, dex, locale = "en" }: { cex: CexOverviewResult; dex: DexOverviewResult; locale?: Locale }) {
  const t = getDictionary(locale).volumeComparisonSummary;
  const cexTotalUsd = cex.venues.reduce((sum, v) => sum + (v.volumeUsd ?? 0), 0);
  const cexHasUsd = cex.venues.some((v) => v.volumeUsd !== null);
  const dexTotalUsd = dex.totalVolumeUsd;

  const maxUsd = Math.max(cexHasUsd ? cexTotalUsd : 0, dexTotalUsd ?? 0, 1);
  const cexBarPct = cexHasUsd ? (cexTotalUsd / maxUsd) * 100 : 0;
  const dexBarPct = dexTotalUsd !== null ? (dexTotalUsd / maxUsd) * 100 : 0;

  return (
    <div className="space-y-3">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">{t.caption}</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
            <th scope="col" className="py-1">
              {t.colVenueTypeScope}
            </th>
            <th scope="col" className="py-1 text-right">
              {t.colVolumeUsd}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-rule/60">
            <td className="py-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-accent mr-1.5 align-middle" aria-hidden />
              {t.cexRow(cex.venues.length)}
            </td>
            <td className="py-1.5 text-right tabular-nums">{cexHasUsd ? formatMarketCap(cexTotalUsd) : "—"}</td>
          </tr>
          <tr>
            <td className="py-1.5">
              <span className="inline-block w-2.5 h-2.5 bg-ink mr-1.5 align-middle" aria-hidden />
              {t.dexRow}
            </td>
            <td className="py-1.5 text-right tabular-nums">{dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "—"}</td>
          </tr>
        </tbody>
      </table>
      <div
        className="space-y-1.5"
        role="img"
        aria-label={t.ariaLabel(cex.venues.length, cexHasUsd ? formatMarketCap(cexTotalUsd) : "unknown", dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "unknown")}
      >
        <div className="h-3 bg-accent" style={{ width: `${Math.max(cexBarPct, cexHasUsd ? 1.5 : 0)}%` }} />
        <div className="h-3 bg-ink" style={{ width: `${Math.max(dexBarPct, dexTotalUsd !== null ? 1.5 : 0)}%` }} />
      </div>
      <p className="text-[11px] text-ink/50">{t.footer}</p>
    </div>
  );
}

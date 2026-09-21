import type { DexOverviewResult } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Deliberately not a "CEX is X% of the market" split: the CEX figure is only
// the selected exchanges' major pairs, the DEX figure is DefiLlama's whole
// tracked universe, and their windows differ (complete UTC days vs.
// DefiLlama's trailing window). Two independently-scoped bars, for scale only.
export function VolumeComparisonSummary({
  cexTotalUsd,
  cexVenueCount,
  cexWindow,
  dex,
  locale = "en",
}: {
  cexTotalUsd: number;
  cexVenueCount: number;
  cexWindow: string;
  dex: DexOverviewResult;
  locale?: Locale;
}) {
  const t = getDictionary(locale).volumeComparisonSummary;
  const dexTotalUsd = dex.totalVolumeUsd;

  const maxUsd = Math.max(cexTotalUsd, dexTotalUsd ?? 0, 1);
  const cexBarPct = (cexTotalUsd / maxUsd) * 100;
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
              {t.cexRow(cexVenueCount, cexWindow)}
            </td>
            <td className="py-1.5 text-right tabular-nums">{formatMarketCap(cexTotalUsd)}</td>
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
        aria-label={t.ariaLabel(cexVenueCount, formatMarketCap(cexTotalUsd), dexTotalUsd !== null ? formatMarketCap(dexTotalUsd) : "unknown")}
      >
        <div className="h-3 bg-accent" style={{ width: `${Math.max(cexBarPct, 1.5)}%` }} />
        <div className="h-3 bg-ink" style={{ width: `${Math.max(dexBarPct, dexTotalUsd !== null ? 1.5 : 0)}%` }} />
      </div>
      <p className="text-[11px] text-ink/50">{t.footer}</p>
    </div>
  );
}

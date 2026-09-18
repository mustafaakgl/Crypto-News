"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Asset, Interval, Candle } from "@/lib/klines";
import type { PriceActionResult } from "@/lib/priceAction";
import { CandleChart, type SrLevel, type CandleChartHandle } from "@/components/analytics/CandleChart";
import { TabSection } from "@/components/analytics/TabSection";
import { ExplainChart } from "@/components/analytics/ExplainChart";
import { utcDateTime } from "@/lib/time";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function PriceActionTab({
  asset,
  interval,
  candles,
  priceAction,
  lastClosedAt,
  pair,
  source,
  stale,
}: {
  asset: Asset;
  interval: Interval;
  candles: Candle[];
  priceAction: PriceActionResult;
  lastClosedAt: number;
  pair: string;
  source: string;
  stale: boolean;
}) {
  const [showSr, setShowSr] = useState(true);
  const chartRef = useRef<CandleChartHandle>(null);
  const dict = getDictionary(localeFromPathname(usePathname()));
  const t = dict.priceAction;

  const { trend, pivots, lastConfirmedHigh, lastConfirmedLow, breakout } = priceAction;
  const trendLabel = t.trendLabel[trend];

  const srLevels: SrLevel[] = [];
  if (lastConfirmedHigh) {
    srLevels.push({ price: lastConfirmedHigh.price, title: t.resistanceLabel, color: "#b3261e" });
  }
  if (lastConfirmedLow) {
    srLevels.push({ price: lastConfirmedLow.price, title: t.supportLabel, color: "#0a7a34" });
  }

  const meaning =
    trend === "Insufficient data" ? (
      <>{t.notEnoughPivots(asset, interval)}</>
    ) : (
      <>
        {t.structurePrefix(asset, interval)}
        <strong>{trendLabel}</strong>
        {t.structureSuffix(pivots.highs.length, pivots.lows.length)}
        {breakout && breakout.direction !== "none" && t.breakoutCandidate(breakout.direction, breakout.windowSize)}
      </>
    );

  return (
    <TabSection
      intro={t.intro}
      meaning={meaning}
      sourceLine={
        <>
          {t.sourceLine(pair, utcDateTime(lastClosedAt))}
          {stale && <span className="text-red-700 font-semibold">{t.staleSuffix}</span>}
        </>
      }
      methodology={
        <>
          <p>{t.methodology}</p>
          {lastConfirmedHigh && (
            <p className="mt-2">
              {t.lastConfirmedHigh}: {lastConfirmedHigh.price.toFixed(2)} at {utcDateTime(lastConfirmedHigh.time)}.
            </p>
          )}
          {lastConfirmedLow && (
            <p>
              {t.lastConfirmedLow}: {lastConfirmedLow.price.toFixed(2)} at {utcDateTime(lastConfirmedLow.time)}.
            </p>
          )}
          {breakout && (
            <p>{t.lastCloseVsPrior(breakout.lastClose.toFixed(2), breakout.windowSize, breakout.windowLow.toFixed(2), breakout.windowHigh.toFixed(2))}</p>
          )}
          <p className="mt-2">{t.whatWouldChange}</p>
          <p className="mt-2">{source}</p>
        </>
      }
    >
      <div className="flex items-center gap-2" role="group" aria-label={t.ariaChartZoomControls}>
        <button
          type="button"
          onClick={() => chartRef.current?.zoomIn()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          {t.zoomIn}
        </button>
        <button
          type="button"
          onClick={() => chartRef.current?.zoomOut()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          {t.zoomOut}
        </button>
        <button
          type="button"
          onClick={() => chartRef.current?.resetZoom()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          {t.reset}
        </button>
        <button
          type="button"
          onClick={() => setShowSr((v) => !v)}
          aria-pressed={showSr}
          className="ml-auto px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          {showSr ? t.hideSupportResistance : t.showSupportResistance}
        </button>
      </div>

      <div className="border border-ink">
        <CandleChart ref={chartRef} candles={candles} srLevels={srLevels} showSr={showSr} />
      </div>

      <div className="mt-4">
        <ExplainChart asset={asset} interval={interval} />
      </div>
    </TabSection>
  );
}

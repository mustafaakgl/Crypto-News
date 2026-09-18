"use client";

import { useRef, useState } from "react";
import type { Asset, Interval, Candle } from "@/lib/klines";
import type { PriceActionResult } from "@/lib/priceAction";
import { CandleChart, type SrLevel, type CandleChartHandle } from "@/components/analytics/CandleChart";
import { TabSection } from "@/components/analytics/TabSection";
import { ExplainChart } from "@/components/analytics/ExplainChart";
import { utcDateTime } from "@/lib/time";

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

  const { trend, pivots, lastConfirmedHigh, lastConfirmedLow, breakout } = priceAction;

  const srLevels: SrLevel[] = [];
  if (lastConfirmedHigh) {
    srLevels.push({ price: lastConfirmedHigh.price, title: "Resistance (last confirmed high)", color: "#b3261e" });
  }
  if (lastConfirmedLow) {
    srLevels.push({ price: lastConfirmedLow.price, title: "Support (last confirmed low)", color: "#0a7a34" });
  }

  const meaning =
    trend === "Insufficient data" ? (
      <>Not enough confirmed swing pivots yet to classify structure on {asset}/USDT ({interval}).</>
    ) : (
      <>
        {asset}/USDT ({interval}) structure reads as <strong>{trend}</strong>, based on the last two confirmed swing
        highs and lows ({pivots.highs.length} confirmed high{pivots.highs.length === 1 ? "" : "s"},{" "}
        {pivots.lows.length} confirmed low{pivots.lows.length === 1 ? "" : "s"} found so far).
        {breakout && breakout.direction !== "none" && (
          <>
            {" "}
            Last close is also a breakout candidate to the {breakout.direction}side of the prior {breakout.windowSize}
            -bar range.
          </>
        )}
      </>
    );

  return (
    <TabSection
      intro="Candlestick structure for the selected asset and interval — confirmed swing highs/lows, trend read, and breakout candidates."
      meaning={meaning}
      sourceLine={
        <>
          Source: Binance · Pair: {pair} · Last closed candle: {utcDateTime(lastClosedAt)}
          {stale && <span className="text-red-700 font-semibold"> · Data may be stale</span>}
        </>
      }
      methodology={
        <>
          <p>
            Swing high/low: a candle whose high (or low) exceeds both of its 2 closed neighbors on each side — only
            confirmed once 2 further candles have closed. Trend: rising last-two highs and lows = Uptrend, falling =
            Downtrend, otherwise Mixed structure. Breakout candidate: last close beyond the high/low of the preceding
            20 closed candles (current candle excluded from that window). These are simple rule-based observations —
            not the Brooks method and not a validated trading strategy.
          </p>
          {lastConfirmedHigh && (
            <p className="mt-2">
              Last confirmed high: {lastConfirmedHigh.price.toFixed(2)} at {utcDateTime(lastConfirmedHigh.time)}.
            </p>
          )}
          {lastConfirmedLow && (
            <p>
              Last confirmed low: {lastConfirmedLow.price.toFixed(2)} at {utcDateTime(lastConfirmedLow.time)}.
            </p>
          )}
          {breakout && (
            <p>
              Last close {breakout.lastClose.toFixed(2)} vs. prior {breakout.windowSize}-bar range [
              {breakout.windowLow.toFixed(2)} – {breakout.windowHigh.toFixed(2)}].
            </p>
          )}
          <p className="mt-2">
            What would change this view: a new confirmed swing high or low that breaks the current rising/falling
            pattern.
          </p>
          <p className="mt-2">{source}</p>
        </>
      }
    >
      <div className="flex items-center gap-2" role="group" aria-label="Chart zoom controls">
        <button
          type="button"
          onClick={() => chartRef.current?.zoomIn()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          Zoom in
        </button>
        <button
          type="button"
          onClick={() => chartRef.current?.zoomOut()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          Zoom out
        </button>
        <button
          type="button"
          onClick={() => chartRef.current?.resetZoom()}
          className="px-2 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={() => setShowSr((v) => !v)}
          aria-pressed={showSr}
          className="ml-auto px-3 py-1 text-xs font-semibold border border-ink/30 text-ink/60 hover:border-ink"
        >
          {showSr ? "Hide" : "Show"} support/resistance lines
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

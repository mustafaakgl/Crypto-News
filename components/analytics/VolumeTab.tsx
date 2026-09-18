import type { Asset, Interval, Candle } from "@/lib/klines";
import type { VolumeResult } from "@/lib/volume";
import { computeVwapPosition } from "@/lib/volume";
import { VolumeChart } from "@/components/analytics/VolumeChart";
import { TabSection } from "@/components/analytics/TabSection";
import { utcDateTime } from "@/lib/time";

export function VolumeTab({
  asset,
  interval,
  candles,
  volume,
  lastClosedAt,
  pair,
  source,
  stale,
}: {
  asset: Asset;
  interval: Interval;
  candles: Candle[];
  volume: VolumeResult;
  lastClosedAt: number;
  pair: string;
  source: string;
  stale: boolean;
}) {
  const { relativeVolume, rollingVwap } = volume;
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : null;
  const vwapPosition = lastClose !== null && rollingVwap ? computeVwapPosition(lastClose, rollingVwap.vwap) : null;

  const meaning = (
    <>
      {relativeVolume ? (
        <>
          The last closed candle traded <strong>{relativeVolume.ratio.toFixed(2)}x</strong> the volume of the
          preceding {relativeVolume.windowSize}-bar average.
        </>
      ) : (
        <>Relative volume is unavailable — not enough closed candles yet.</>
      )}{" "}
      {vwapPosition ? (
        <>
          Last close is <strong>{Math.abs(vwapPosition.diffPct).toFixed(2)}%</strong>{" "}
          {vwapPosition.above ? "above" : "below"} the {rollingVwap?.windowSize}-bar rolling VWAP.
        </>
      ) : (
        <>Price position vs. VWAP is unavailable.</>
      )}
    </>
  );

  return (
    <TabSection
      intro="Trading volume for the selected asset and interval, compared against its own recent average, plus a rolling volume-weighted average price."
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
            Relative volume = last closed candle&rsquo;s volume ÷ average volume of the preceding 20 closed candles
            (current candle excluded from the average). 20-bar rolling VWAP = sum of quote-asset volume ÷ sum of
            base-asset volume over the last 20 closed candles — mathematically the volume-weighted average price over
            that window. Volume figures reflect trading on Binance only, not the wider market.
          </p>
          {relativeVolume && (
            <p className="mt-2">
              Last closed candle volume {relativeVolume.lastVolume.toFixed(4)} {asset} vs.{" "}
              {relativeVolume.windowSize}-bar average {relativeVolume.avgVolume.toFixed(4)} {asset}.
            </p>
          )}
          {rollingVwap && (
            <p>
              Sum quote volume {rollingVwap.sumQuoteVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 })}{" "}
              USDT / sum base volume {rollingVwap.sumBaseVolume.toLocaleString("en-GB", { maximumFractionDigits: 2 })}{" "}
              {asset} over the last {rollingVwap.windowSize} closed candles.
            </p>
          )}
          <p className="mt-2">
            These figures update every closed candle and reuse the same {interval} candle data as Price Action — no
            separate request is made when switching between these two tabs.
          </p>
          <p className="mt-2">{source}</p>
        </>
      }
    >
      <div className="border border-ink">
        <VolumeChart candles={candles} />
      </div>
    </TabSection>
  );
}

import type { Asset, Interval, Candle } from "@/lib/klines";
import type { VolumeResult } from "@/lib/volume";
import { computeVwapPosition } from "@/lib/volume";
import { VolumeChart } from "@/components/analytics/VolumeChart";
import { TabSection } from "@/components/analytics/TabSection";
import { utcDateTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function VolumeTab({
  asset,
  interval,
  candles,
  volume,
  lastClosedAt,
  pair,
  source,
  stale,
  locale = "en",
}: {
  asset: Asset;
  interval: Interval;
  candles: Candle[];
  volume: VolumeResult;
  lastClosedAt: number;
  pair: string;
  source: string;
  stale: boolean;
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  const t = dict.volumeTabAsset;
  const { relativeVolume, rollingVwap } = volume;
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : null;
  const vwapPosition = lastClose !== null && rollingVwap ? computeVwapPosition(lastClose, rollingVwap.vwap) : null;

  const meaning = (
    <>
      {relativeVolume ? (
        <>
          {t.relativeVolumePrefix}
          <strong>{relativeVolume.ratio.toFixed(2)}</strong>
          {t.relativeVolumeSuffix(relativeVolume.windowSize)}
        </>
      ) : (
        <>{t.relativeVolumeUnavailable}</>
      )}{" "}
      {vwapPosition ? (
        <>
          {t.vwapPrefix}
          <strong>{Math.abs(vwapPosition.diffPct).toFixed(2)}</strong>
          {t.vwapMiddle(vwapPosition.above, rollingVwap?.windowSize ?? 0)}
        </>
      ) : (
        <>{t.vwapUnavailable}</>
      )}
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
          {relativeVolume && (
            <p className="mt-2">
              {t.lastClosedCandleVolume(relativeVolume.lastVolume.toFixed(4), relativeVolume.windowSize, relativeVolume.avgVolume.toFixed(4), asset)}
            </p>
          )}
          {rollingVwap && (
            <p>
              {t.sumVolumes(
                rollingVwap.sumQuoteVolume.toLocaleString("en-GB", { maximumFractionDigits: 0 }),
                rollingVwap.sumBaseVolume.toLocaleString("en-GB", { maximumFractionDigits: 2 }),
                asset,
                rollingVwap.windowSize
              )}
            </p>
          )}
          <p className="mt-2">{t.reuseNote}</p>
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

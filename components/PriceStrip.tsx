"use client";

import type { MarketAsset } from "@/lib/prices";
import { useBinanceLiveTicker } from "@/lib/useBinanceLiveTicker";
import { clockTime, clockTimeWithSeconds } from "@/lib/time";
import { formatUsd, formatPct } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function PriceStrip({
  assets,
  asOf,
  error,
  locale = "en",
}: {
  assets: MarketAsset[];
  asOf: string | null;
  error: string | null;
  locale?: Locale;
}) {
  const live = useBinanceLiveTicker(assets.map((a) => a.symbol));
  const latestLive = Math.max(0, ...Object.values(live).map((q) => q.eventTime));
  const allFailed = assets.every((a) => a.usd === null) && latestLive === 0;
  const dict = getDictionary(locale);
  const newsHref = `/${locale}/latest-crypto-news`;

  return (
    <div className="border border-ink">
      <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-ink">
        {assets.map((a) => {
          const q = live[a.symbol];
          const usd = q?.price ?? a.usd;
          const change = q?.changePct24h ?? a.changePct24h;
          return (
          <a
            key={a.symbol}
            href={`${newsHref}?coin=${a.symbol}`}
            className="px-2 py-3 text-center hover:bg-accent/10 transition-colors"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{a.symbol}</p>
            {usd !== null ? (
              <>
                <p className="font-serif text-sm sm:text-lg font-700 leading-tight tabular-nums">{formatUsd(usd)}</p>
                <p className={`text-[11px] font-semibold ${change != null && change < 0 ? "text-red-700" : "text-green-700"}`}>
                  {change != null ? formatPct(change) : "—"}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-ink/50 py-2">{dict.prices.priceUnavailable}</p>
            )}
          </a>
          );
        })}
      </div>
      <p className="px-3 py-1.5 text-[11px] text-ink/50 border-t border-rule">
        {latestLive > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" aria-hidden />
            {dict.prices.liveSourceLine(clockTimeWithSeconds(latestLive))}
          </span>
        ) : allFailed || error ? (
          dict.prices.unreachable
        ) : (
          dict.prices.sourceLine(asOf ? clockTime(asOf) : dict.common.dash)
        )}
      </p>
    </div>
  );
}

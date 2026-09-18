import type { MarketAsset } from "@/lib/prices";
import { clockTime } from "@/lib/time";
import { formatUsd, formatPct } from "@/lib/format";

export function PriceStrip({
  assets,
  asOf,
  error,
}: {
  assets: MarketAsset[];
  asOf: string | null;
  error: string | null;
}) {
  const allFailed = assets.every((a) => a.usd === null);

  return (
    <div className="border border-ink">
      <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-ink">
        {assets.map((a) => (
          <a
            key={a.symbol}
            href={`/en/latest-crypto-news?coin=${a.symbol}`}
            className="px-2 py-3 text-center hover:bg-accent/10 transition-colors"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">{a.symbol}</p>
            {a.usd !== null ? (
              <>
                <p className="font-serif text-sm sm:text-lg font-700 leading-tight">{formatUsd(a.usd)}</p>
                <p
                  className={`text-[11px] font-semibold ${
                    a.changePct24h != null && a.changePct24h < 0 ? "text-red-700" : "text-green-700"
                  }`}
                >
                  {a.changePct24h != null ? formatPct(a.changePct24h) : "—"}
                </p>
              </>
            ) : (
              <p className="text-[11px] text-ink/50 py-2">Price unavailable</p>
            )}
          </a>
        ))}
      </div>
      <p className="px-3 py-1.5 text-[11px] text-ink/50 border-t border-rule">
        {allFailed || error
          ? "CoinGecko could not be reached — prices temporarily unavailable."
          : `Source: CoinGecko · refreshes every 10 minutes · data as of ${asOf ? clockTime(asOf) : "—"}`}
      </p>
    </div>
  );
}

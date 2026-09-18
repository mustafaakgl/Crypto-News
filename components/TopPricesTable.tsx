import Image from "next/image";
import type { MarketAsset } from "@/lib/prices";
import { clockTime } from "@/lib/time";
import { formatUsd, formatPct, formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function TopPricesTable({
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
  const dict = getDictionary(locale);
  const t = dict.prices;
  const newsHref = `/${locale}/latest-crypto-news`;

  return (
    <section aria-label={t.ariaCryptocurrencyPrices} className="mt-10 border-t border-rule pt-6">
      <div className="flex items-baseline justify-between border-b-2 border-ink pb-2 mb-1">
        <h2 className="font-serif text-sm font-700 uppercase tracking-widest">{t.cryptocurrencyPrices}</h2>
        <a
          href={`/${locale}/prices`}
          className="text-xs font-semibold text-ink/60 hover:text-ink hover:underline decoration-accent decoration-2 underline-offset-4"
        >
          {t.viewAllPrices}
        </a>
      </div>

      {error || assets.length === 0 ? (
        <p className="border border-ink/20 px-4 py-6 text-center text-ink/60 text-sm">{t.unreachable}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-rule text-left text-[11px] uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-2">{t.colRank}</th>
                  <th className="py-2 pr-2">{t.colAsset}</th>
                  <th className="py-2 pr-2 text-right">{t.colPrice}</th>
                  <th className="py-2 pr-2 text-right">{t.col24h}</th>
                  <th className="py-2 pr-2 text-right hidden sm:table-cell">{t.colMarketCap}</th>
                  <th className="py-2 text-right hidden sm:table-cell">{t.colVolume24h}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {assets.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-2 text-ink/50">{a.rank ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <a
                        href={`${newsHref}?coin=${a.symbol}`}
                        className="flex items-center gap-2 hover:underline decoration-accent decoration-2 underline-offset-2"
                      >
                        {a.image ? (
                          <Image src={a.image} alt="" width={20} height={20} className="rounded-full" />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-ink/10 inline-block" />
                        )}
                        <span className="font-semibold">{a.name}</span>
                        <span className="text-ink/50">{a.symbol}</span>
                      </a>
                    </td>
                    <td className="py-2 pr-2 text-right font-serif">
                      {a.usd !== null ? formatUsd(a.usd) : <span className="text-ink/50 text-xs">{dict.common.unavailable}</span>}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right font-semibold ${
                        a.changePct24h != null && a.changePct24h < 0 ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {a.changePct24h != null
                        ? `${a.changePct24h >= 0 ? "▲" : "▼"} ${formatPct(a.changePct24h).replace("+", "").replace("-", "")}`
                        : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right text-ink/70 hidden sm:table-cell">
                      {a.marketCapUsd !== null ? formatMarketCap(a.marketCapUsd) : "—"}
                    </td>
                    <td className="py-2 text-right text-ink/70 hidden sm:table-cell">
                      {a.volumeUsd !== null ? formatMarketCap(a.volumeUsd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-ink/50">{t.sourceLine(asOf ? clockTime(asOf) : dict.common.dash)}</p>
        </>
      )}
    </section>
  );
}

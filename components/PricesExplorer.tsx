"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { MarketAsset } from "@/lib/prices";
import { clockTime } from "@/lib/time";
import { formatUsd, formatPct, formatMarketCap } from "@/lib/format";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

const PAGE_SIZE = 20;

type SortKey = "rank" | "name" | "usd" | "changePct24h" | "marketCapUsd";
type SortDir = "asc" | "desc";

export function PricesExplorer({
  assets,
  asOf,
  error,
}: {
  assets: MarketAsset[];
  asOf: string | null;
  error: string | null;
  scope: string;
}) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const locale = localeFromPathname(usePathname());
  const dict = getDictionary(locale);
  const t = dict.prices;
  const newsHref = `/${locale}/latest-crypto-news`;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return assets;
    return assets.filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q));
  }, [assets, query]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === null && bv === null) cmp = 0;
        else if (av === null) cmp = 1;
        else if (bv === null) cmp = -1;
        else cmp = av - bv;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageItems = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="font-serif text-3xl font-800 mb-1">{t.heading}</h1>
      <p className="text-sm text-ink/60 mb-4">{t.subheading(t.scopeTop100, asOf ? clockTime(asOf) : dict.common.dash)}</p>

      {error && <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80 mb-4">{t.unreachable}</p>}

      <label className="block mb-4">
        <span className="sr-only">{t.ariaSearch}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full max-w-sm border border-ink/30 px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
        />
      </label>

      {sorted.length === 0 ? (
        <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">{error ? t.emptyNoData : t.emptyNoMatches}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-ink text-left text-[11px] uppercase tracking-wide text-ink/60">
                  <th className="py-2 pr-2">
                    <button type="button" onClick={() => toggleSort("rank")} className="hover:text-ink">
                      {t.colRank}
                      {sortIndicator("rank")}
                    </button>
                  </th>
                  <th className="py-2 pr-2">
                    <button type="button" onClick={() => toggleSort("name")} className="hover:text-ink">
                      {t.colAsset}
                      {sortIndicator("name")}
                    </button>
                  </th>
                  <th className="py-2 pr-2 text-right">
                    <button type="button" onClick={() => toggleSort("usd")} className="hover:text-ink">
                      {t.colPrice}
                      {sortIndicator("usd")}
                    </button>
                  </th>
                  <th className="py-2 pr-2 text-right">
                    <button type="button" onClick={() => toggleSort("changePct24h")} className="hover:text-ink">
                      {t.col24h}
                      {sortIndicator("changePct24h")}
                    </button>
                  </th>
                  <th className="py-2 text-right">
                    <button type="button" onClick={() => toggleSort("marketCapUsd")} className="hover:text-ink">
                      {t.colMarketCap}
                      {sortIndicator("marketCapUsd")}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {pageItems.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-2 text-ink/50">{a.rank ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <a
                        href={`${newsHref}?coin=${a.symbol}`}
                        className="font-semibold hover:underline decoration-accent decoration-2 underline-offset-2"
                      >
                        {a.name}
                      </a>
                      <span className="ml-1 text-ink/50">{a.symbol}</span>
                    </td>
                    <td className="py-2 pr-2 text-right font-serif">
                      {a.usd !== null ? formatUsd(a.usd) : <span className="text-ink/50 text-xs">{dict.common.unavailable}</span>}
                    </td>
                    <td
                      className={`py-2 pr-2 text-right ${
                        a.changePct24h != null && a.changePct24h < 0 ? "text-red-700" : "text-green-700"
                      }`}
                    >
                      {a.changePct24h != null ? formatPct(a.changePct24h) : "—"}
                    </td>
                    <td className="py-2 text-right text-ink/70">
                      {a.marketCapUsd !== null ? formatMarketCap(a.marketCapUsd) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-ink/60">
            <p>{t.pageOf(page, totalPages, sorted.length)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border border-ink/30 px-3 py-1.5 font-semibold uppercase tracking-wide disabled:opacity-30 hover:border-ink disabled:hover:border-ink/30"
              >
                {t.prev}
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border border-ink/30 px-3 py-1.5 font-semibold uppercase tracking-wide disabled:opacity-30 hover:border-ink disabled:hover:border-ink/30"
              >
                {t.next}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

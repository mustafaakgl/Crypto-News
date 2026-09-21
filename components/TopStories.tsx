"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { NewsItem } from "@/lib/news";
import { PublisherImage } from "@/components/PublisherImage";
import { SentimentTag } from "@/components/SentimentTag";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { relativeTime } from "@/lib/time";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type Filter = "all" | "BTC" | "ETH";
const FILTERS: Filter[] = ["all", "BTC", "ETH"];
const COIN_BADGE: Record<"BTC" | "ETH", { mark: string; className: string }> = {
  BTC: { mark: "₿", className: "bg-[#f7931a] text-white" },
  ETH: { mark: "◆", className: "bg-[#627eea] text-white" },
};

function Credit({ item }: { item: NewsItem }) {
  if (!item.showPublisherImage || !item.imageUrl) return null;
  return <span className="absolute bottom-1 right-1 bg-ink/60 px-1 text-[9px] text-white">{item.sourceName}</span>;
}

export function TopStories({ items }: { items: NewsItem[] }) {
  const { openDetail } = useNewsInteraction();
  const locale = localeFromPathname(usePathname());
  const t = getDictionary(locale).home;
  const [filter, setFilter] = useState<Filter>("all");

  const shown = filter === "all" ? items : items.filter((i) => i.assets.includes(filter));
  const [featured, ...rest] = shown;
  const side = rest.slice(0, 4);
  const grid = rest.slice(4, 10);

  const meta = (item: NewsItem) => (
    <p className="mt-1 text-xs text-ink/50">
      {item.sourceName} · {relativeTime(item.publishedAt)}
    </p>
  );

  return (
    <section aria-label={t.topStories} className="mb-10">
      <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label={t.ariaStoryFilter}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              filter === f ? "bg-ink text-paper" : "bg-ink/5 text-ink hover:bg-ink/10"
            }`}
          >
            {f !== "all" && (
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${COIN_BADGE[f].className}`} aria-hidden>
                {COIN_BADGE[f].mark}
              </span>
            )}
            {f === "all" ? t.filterAll : f === "BTC" ? t.filterBitcoin : t.filterEthereum}
          </button>
        ))}
      </div>

      {!featured ? (
        <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">{t.noStoriesForFilter}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
            <button type="button" onClick={() => openDetail(featured)} className="group text-left">
              <div className="relative aspect-video overflow-hidden bg-ink">
                <PublisherImage item={featured} width={1200} className="transition-opacity group-hover:opacity-90" />
                <Credit item={featured} />
              </div>
              <div className="mt-3 flex items-center gap-3">
                {featured.category && <span className="text-xs text-ink/60">{featured.category}</span>}
                <SentimentTag title={featured.title} description={featured.descriptionFull || featured.summary} locale={locale} />
              </div>
              <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-700 leading-tight group-hover:underline decoration-accent decoration-2 underline-offset-4">
                {featured.title}
              </h2>
              <p className="mt-2 text-sm text-ink/70 leading-snug">{featured.descriptionFull || featured.summary}</p>
              {meta(featured)}
            </button>

            <ul className="space-y-5">
              {side.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(item)}
                    className="group w-full text-left border-l-2 border-transparent pl-3 hover:border-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.category && <span className="text-xs text-ink/60">{item.category}</span>}
                      <SentimentTag title={item.title} description={item.descriptionFull || item.summary} locale={locale} />
                    </div>
                    <h3 className="mt-0.5 font-serif text-lg leading-snug text-ink/80 group-hover:text-ink">{item.title}</h3>
                    {meta(item)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {grid.length > 0 && (
            <ul className="mt-8 border-t border-rule pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
              {grid.map((item) => (
                <li key={item.id}>
                  <button type="button" onClick={() => openDetail(item)} className="group w-full text-left">
                    <div className="relative aspect-video overflow-hidden bg-ink">
                      <PublisherImage item={item} width={640} className="transition-opacity group-hover:opacity-90" />
                      <Credit item={item} />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {item.category && <span className="text-xs text-ink/60">{item.category}</span>}
                      <SentimentTag title={item.title} description={item.descriptionFull || item.summary} locale={locale} />
                    </div>
                    <h3 className="mt-0.5 font-serif text-lg leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
                      {item.title}
                    </h3>
                    {meta(item)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

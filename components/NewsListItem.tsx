"use client";

import { usePathname } from "next/navigation";
import type { NewsItem } from "@/lib/news";
import { NewsMeta } from "@/components/NewsMeta";
import { SaveButton } from "@/components/SaveButton";
import { SentimentTag } from "@/components/SentimentTag";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { localeFromPathname } from "@/lib/i18n/locale";

export function NewsListItem({ item }: { item: NewsItem }) {
  const { openDetail } = useNewsInteraction();
  const locale = localeFromPathname(usePathname());

  return (
    <li className="py-4 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => openDetail(item)} className="group text-left flex-1">
          <div className="mb-1 empty:hidden">
            <SentimentTag title={item.title} description={item.descriptionFull || item.summary} locale={locale} />
          </div>
          <h3 className="font-serif text-lg font-700 leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-ink/70 leading-snug">{item.descriptionFull || item.summary}</p>
          <div className="mt-2">
            <NewsMeta sourceName={item.sourceName} publishedAt={item.publishedAt} assets={item.assets} locale={locale} />
          </div>
        </button>
        <SaveButton item={item} />
      </div>
    </li>
  );
}

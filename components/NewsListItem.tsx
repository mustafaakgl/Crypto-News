"use client";

import type { NewsItem } from "@/lib/news";
import { NewsMeta } from "@/components/NewsMeta";
import { SaveButton } from "@/components/SaveButton";
import { useNewsInteraction } from "@/components/NewsInteractionContext";

export function NewsListItem({ item }: { item: NewsItem }) {
  const { openDetail } = useNewsInteraction();

  return (
    <li className="py-4 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => openDetail(item)} className="group text-left flex-1">
          <h3 className="font-serif text-lg font-700 leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
            {item.title}
          </h3>
          <p className="mt-1 text-sm text-ink/70 leading-snug line-clamp-2">{item.summary}</p>
          <div className="mt-2">
            <NewsMeta sourceName={item.sourceName} publishedAt={item.publishedAt} assets={item.assets} />
          </div>
        </button>
        <SaveButton item={item} />
      </div>
    </li>
  );
}

"use client";

import type { NewsItem } from "@/lib/news";
import { relativeTime } from "@/lib/time";
import { SaveButton } from "@/components/SaveButton";
import { useNewsInteraction } from "@/components/NewsInteractionContext";

export function AgendaItem({ item }: { item: NewsItem }) {
  const { openDetail } = useNewsInteraction();

  return (
    <li className="py-3 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => openDetail(item)} className="group text-left flex-1">
          <h4 className="text-sm font-semibold leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
            {item.title}
          </h4>
          <p className="mt-1 text-[11px] text-ink/50">
            {item.sourceName} &middot; {relativeTime(item.publishedAt)}
          </p>
        </button>
        <SaveButton item={item} />
      </div>
    </li>
  );
}

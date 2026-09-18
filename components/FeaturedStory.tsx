"use client";

import Image from "next/image";
import type { NewsItem } from "@/lib/news";
import { NewsMeta } from "@/components/NewsMeta";
import { SaveButton } from "@/components/SaveButton";
import { useNewsInteraction } from "@/components/NewsInteractionContext";

export function FeaturedStory({ item }: { item: NewsItem }) {
  const { openDetail } = useNewsInteraction();
  const showSourceImage = item.imageRightsVerified && item.imageUrl;

  return (
    <div className="group">
      <button type="button" onClick={() => openDetail(item)} className="block w-full text-left">
        <div className="relative w-full aspect-[16/10] bg-ink overflow-hidden">
          <Image
            src={showSourceImage ? item.imageUrl! : "/cover-placeholder.svg"}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover group-hover:opacity-90 transition-opacity"
            priority
          />
        </div>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-800 leading-tight group-hover:underline decoration-accent decoration-2 underline-offset-4">
          {item.title}
        </h2>
        <p className="mt-2 text-sm text-ink/70 leading-snug">{item.summary}</p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-3">
        <NewsMeta sourceName={item.sourceName} publishedAt={item.publishedAt} assets={item.assets} />
        <SaveButton item={item} />
      </div>
    </div>
  );
}

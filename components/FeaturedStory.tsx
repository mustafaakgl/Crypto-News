"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { NewsItem } from "@/lib/news";
import { NewsMeta } from "@/components/NewsMeta";
import { SaveButton } from "@/components/SaveButton";
import { SentimentTag } from "@/components/SentimentTag";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { localeFromPathname } from "@/lib/i18n/locale";

export function FeaturedStory({ item }: { item: NewsItem }) {
  const { openDetail } = useNewsInteraction();
  const locale = localeFromPathname(usePathname());
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
        <div className="mt-3 empty:hidden">
          <SentimentTag title={item.title} description={item.descriptionFull || item.summary} locale={locale} />
        </div>
        <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-800 leading-tight group-hover:underline decoration-accent decoration-2 underline-offset-4">
          {item.title}
        </h2>
        <p className="mt-2 text-sm text-ink/70 leading-snug">{item.descriptionFull || item.summary}</p>
      </button>
      <div className="mt-2 flex items-center justify-between gap-3">
        <NewsMeta sourceName={item.sourceName} publishedAt={item.publishedAt} assets={item.assets} locale={locale} />
        <SaveButton item={item} />
      </div>
    </div>
  );
}

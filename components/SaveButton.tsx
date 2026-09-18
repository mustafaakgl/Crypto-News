"use client";

import { usePathname } from "next/navigation";
import type { NewsItem } from "@/lib/news";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function SaveButton({ item, className = "" }: { item: NewsItem; className?: string }) {
  const { isItemSaved, toggleSave } = useNewsInteraction();
  const saved = isItemSaved(item.id);
  const dict = getDictionary(localeFromPathname(usePathname()));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave(item);
      }}
      aria-pressed={saved}
      aria-label={saved ? dict.common.removeFromSaved : dict.common.saveForLater}
      title={saved ? dict.common.removeFromSaved : dict.common.saveForLater}
      className={`shrink-0 border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
        saved ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60 hover:border-ink hover:text-ink"
      } ${className}`}
    >
      {saved ? dict.common.saved : dict.common.save}
    </button>
  );
}

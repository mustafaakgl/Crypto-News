"use client";

import type { NewsItem } from "@/lib/news";
import { useNewsInteraction } from "@/components/NewsInteractionContext";

export function SaveButton({ item, className = "" }: { item: NewsItem; className?: string }) {
  const { isItemSaved, toggleSave } = useNewsInteraction();
  const saved = isItemSaved(item.id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSave(item);
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save for later"}
      title={saved ? "Remove from saved" : "Save for later"}
      className={`shrink-0 border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
        saved ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60 hover:border-ink hover:text-ink"
      } ${className}`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}

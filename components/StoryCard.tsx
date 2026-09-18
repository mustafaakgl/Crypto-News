"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Story } from "@/lib/newsGrouping/buildStories";
import { relativeTime, clockTime } from "@/lib/time";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { SaveButton } from "@/components/SaveButton";
import { CoverageDialog } from "@/components/CoverageDialog";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Only ever rendered for a group with more than one member — a lone article
// renders as a plain NewsListItem instead, so the fields here (article
// count, distinct-publisher count, "View coverage") always have real
// multi-source content behind them.
export function StoryCard({ story }: { story: Story }) {
  const { openDetail } = useNewsInteraction();
  const [coverageOpen, setCoverageOpen] = useState(false);
  const locale = localeFromPathname(usePathname());
  const dict = getDictionary(locale);

  // The earliest member is the representative headline — a simple,
  // consistent "first to report this" rule applied to real articles, never
  // a generated summary.
  const representative = story.items[0];
  const latest = story.items[story.items.length - 1];
  const distinctPublishers = new Set(story.items.map((i) => i.sourceName)).size;
  const assets = Array.from(new Set(story.items.flatMap((i) => i.assets))).sort();
  const categoryLabel = dict.news.storyCategory[story.category];

  return (
    <li className="py-4 first:pt-0">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={() => openDetail(representative)} className="group text-left flex-1">
          <div className="flex items-center gap-2 mb-1 text-[11px] text-ink/50">
            {categoryLabel && <span className="uppercase tracking-wide border border-ink/30 px-1 text-ink/60">{categoryLabel}</span>}
            <span className="font-semibold text-ink/70">{representative.sourceName}</span>
          </div>
          <h3 className="font-serif text-lg font-700 leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
            {representative.title}
          </h3>
          {assets.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {assets.map((a) => (
                <span key={a} className="bg-accent/20 border border-accent/60 px-1.5 py-0.5 text-[11px] font-semibold text-ink/80">
                  {a}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-ink/60">
            {dict.news.firstLatestArticles(
              relativeTime(representative.publishedAt),
              clockTime(representative.publishedAt),
              clockTime(latest.publishedAt),
              story.items.length,
              distinctPublishers
            )}
          </p>
        </button>
        <SaveButton item={representative} />
      </div>
      <button
        type="button"
        onClick={() => setCoverageOpen(true)}
        className="mt-2 text-xs font-semibold uppercase tracking-wide border border-ink/30 px-2 py-1 hover:border-ink"
      >
        {dict.news.viewCoverage}
      </button>
      <CoverageDialog open={coverageOpen} onClose={() => setCoverageOpen(false)} story={story} />
    </li>
  );
}

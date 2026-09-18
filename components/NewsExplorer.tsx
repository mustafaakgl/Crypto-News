"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { NewsItem } from "@/lib/news";
import { NewsListItem } from "@/components/NewsListItem";
import { StoryCard } from "@/components/StoryCard";
import { Tabs, type TabDef } from "@/components/analytics/Tabs";
import { buildStories } from "@/lib/newsGrouping/buildStories";
import { groupGenericArticles } from "@/lib/newsGrouping/genericGrouping";
import type { FomcGroupAssignment } from "@/lib/newsGrouping/types";
import { KNOWN_ASSET_SYMBOLS } from "@/lib/assets";
import { loadWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { mentionsFomcEvent } from "@/lib/newsAnalysis/fomcMatching";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

const PAGE_SIZE = 20;

const VIEW_KEYS = ["latest", "stories", "watchlist"] as const;
type ViewKey = (typeof VIEW_KEYS)[number];
function isViewKey(v: string | null): v is ViewKey {
  return !!v && (VIEW_KEYS as readonly string[]).includes(v);
}

export function NewsExplorer({
  allItems,
  sourceErrors,
  fomcAssignments,
}: {
  allItems: NewsItem[];
  sourceErrors: { sourceName: string; error: string }[];
  fomcAssignments: Record<string, FomcGroupAssignment>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = localeFromPathname(pathname);
  const dict = getDictionary(locale);
  const t = dict.news;
  const newsHref = `/${locale}/latest-crypto-news`;
  const VIEW_DEFS: TabDef<ViewKey>[] = [
    { key: "latest", label: t.viewLatest },
    { key: "stories", label: t.viewStories },
    { key: "watchlist", label: t.viewWatchlist },
  ];

  const [view, setView] = useState<ViewKey>(isViewKey(searchParams.get("view")) ? (searchParams.get("view") as ViewKey) : "latest");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [coin, setCoin] = useState(searchParams.get("coin") ?? "all");
  const [source, setSource] = useState(searchParams.get("source") ?? "all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [includeMacro, setIncludeMacro] = useState(false);
  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const coinOptions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => item.assets.forEach((a) => set.add(a)));
    return Array.from(set).sort();
  }, [allItems]);

  const sourceOptions = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((item) => set.add(item.sourceName));
    return Array.from(set).sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (q && !item.title.toLowerCase().includes(q) && !item.summary.toLowerCase().includes(q)) {
        return false;
      }
      if (coin !== "all" && !item.assets.includes(coin)) return false;
      if (source !== "all" && item.sourceName !== source) return false;
      return true;
    });
  }, [allItems, query, coin, source]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, coin, source, view]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (coin !== "all") params.set("coin", coin);
    if (source !== "all") params.set("source", source);
    if (view !== "latest") params.set("view", view);
    const qs = params.toString();
    router.replace(qs ? `${newsHref}?${qs}` : newsHref, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, coin, source, view]);

  // Recomputed from the currently FILTERED list on every render — story
  // membership and counts always match whatever search/coin/source leaves
  // in scope, never a stale total from the full unfiltered list.
  const stories = useMemo(() => buildStories(filtered, fomcAssignments, groupGenericArticles), [filtered, fomcAssignments]);

  const watchlistItems = useMemo(() => {
    if (watchlist.length === 0) return [];
    const watchSet = new Set(watchlist);
    const seen = new Set<string>();
    const result: NewsItem[] = [];
    for (const item of filtered) {
      const directMatch = item.assets.some((a) => watchSet.has(a));
      const macroMatch = includeMacro && mentionsFomcEvent(`${item.title} ${item.descriptionFull}`);
      // A article matching more than one followed asset still appears once.
      if ((directMatch || macroMatch) && !seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }
    return result;
  }, [filtered, watchlist, includeMacro]);

  function handleToggleWatch(symbol: string) {
    setWatchlist((prev) => toggleWatchlist(prev, symbol));
  }

  const activeList = view === "watchlist" ? watchlistItems : null; // Stories has its own rendering path
  const visibleItems = activeList ? activeList.slice(0, visibleCount) : filtered.slice(0, visibleCount);
  const visibleStories = stories.slice(0, visibleCount);
  const totalForView = view === "stories" ? stories.length : view === "watchlist" ? watchlistItems.length : filtered.length;
  const shownCount = view === "stories" ? visibleStories.length : visibleItems.length;
  const hasMore = visibleCount < totalForView;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-3xl font-800 mb-1">{t.heading}</h1>
      <p className="text-sm text-ink/60 mb-4">{t.subheading(allItems.length)}</p>

      {sourceErrors.length > 0 && (
        <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80 mb-4">
          {t.sourceErrorBanner(sourceErrors.map((e) => e.sourceName).join(", "))}
        </p>
      )}

      <div className="mb-4 border-b border-rule">
        <Tabs tabs={VIEW_DEFS} active={view} onChange={setView} idPrefix="news-view" ariaLabel={t.ariaViews} />
      </div>

      <div className="flex flex-wrap gap-3 mb-6 border-y border-rule py-3">
        <label className="flex-1 min-w-[200px]">
          <span className="sr-only">{t.ariaSearch}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full border border-ink/30 px-3 py-1.5 text-sm focus:outline-none focus:border-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-ink/60">{t.coin}</span>
          <select
            value={coin}
            onChange={(e) => setCoin(e.target.value)}
            className="border border-ink/30 px-2 py-1.5 text-sm focus:outline-none focus:border-ink"
          >
            <option value="all">{t.all}</option>
            {coinOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <span className="text-ink/60">{t.source}</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-ink/30 px-2 py-1.5 text-sm focus:outline-none focus:border-ink"
          >
            <option value="all">{t.all}</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {view === "watchlist" && (
        <div className="mb-6 border border-ink/20 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{t.followedAssets}</p>
            <label className="flex items-center gap-1.5 text-xs text-ink/60">
              <input type="checkbox" checked={includeMacro} onChange={(e) => setIncludeMacro(e.target.checked)} />
              {t.includeMacroNews}
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KNOWN_ASSET_SYMBOLS.map((symbol) => {
              const followed = watchlist.includes(symbol);
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => handleToggleWatch(symbol)}
                  aria-pressed={followed}
                  className={`px-2 py-1 text-xs font-semibold border ${
                    followed ? "border-ink bg-ink text-paper" : "border-ink/30 text-ink/60 hover:border-ink"
                  }`}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-ink/50">{t.watchlistScopeNote}</p>
        </div>
      )}

      {view === "watchlist" && watchlist.length === 0 && (
        <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">{t.emptyAddAssets}</p>
      )}

      {view === "watchlist" && watchlist.length > 0 && watchlistItems.length === 0 && (
        <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">
          {query || coin !== "all" || source !== "all" ? t.emptyNoFollowedNewsFiltered : t.emptyNoFollowedNews}
        </p>
      )}

      {view !== "watchlist" && filtered.length === 0 && (
        <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">{t.emptyNoMatches}</p>
      )}

      {view === "stories" && stories.length > 0 && (
        <>
          <ul className="divide-y divide-rule">
            {visibleStories.map((story) =>
              story.items.length > 1 ? (
                <StoryCard key={story.id} story={story} />
              ) : (
                <NewsListItem key={story.id} item={story.items[0]} />
              )
            )}
          </ul>
          <p className="mt-4 text-xs text-ink/50">{t.showingStories(shownCount, totalForView)}</p>
        </>
      )}

      {view === "latest" && filtered.length > 0 && (
        <ul className="divide-y divide-rule">
          {visibleItems.map((item) => (
            <NewsListItem key={item.id} item={item} />
          ))}
        </ul>
      )}

      {view === "watchlist" && watchlistItems.length > 0 && (
        <ul className="divide-y divide-rule">
          {visibleItems.map((item) => (
            <NewsListItem key={item.id} item={item} />
          ))}
        </ul>
      )}

      {view !== "stories" && (view === "latest" ? filtered.length > 0 : watchlistItems.length > 0) && (
        <p className="mt-4 text-xs text-ink/50">{t.showingHeadlines(shownCount, totalForView)}</p>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
          className="mt-3 border border-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
        >
          {t.loadMore}
        </button>
      )}
    </div>
  );
}

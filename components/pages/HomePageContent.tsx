import { getNews } from "@/lib/news";
import { getMarketPrices, pickHomepageAssets, pickTopAssets } from "@/lib/prices";
import { getResearch } from "@/lib/research";
import { buildBriefing } from "@/lib/briefing";
import { CryptoStocksTabs } from "@/components/CryptoStocksTabs";
import { TopPricesTable } from "@/components/TopPricesTable";
import { FeaturedStory } from "@/components/FeaturedStory";
import { NewsListItem } from "@/components/NewsListItem";
import { AgendaItem } from "@/components/AgendaItem";
import { BriefingCard } from "@/components/BriefingCard";
import { ResearchPanel } from "@/components/ResearchPanel";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Shared by app/en/page.tsx and app/de/page.tsx — the data-fetching and
// layout are identical for every interface locale; only the static text
// (via `dict`) and internal links (via `locale`) differ. Keeping this in
// one place means the two routes can never silently drift apart in
// behavior, only in language.
export async function HomePageContent({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.home;
  const [news, prices, research] = await Promise.all([getNews(), getMarketPrices(), getResearch()]);
  const homepageAssets = pickHomepageAssets(prices);
  const topTenAssets = pickTopAssets(prices, 10); // same fetched result, no extra request
  const briefing = buildBriefing(news.items);

  const [featured, ...rest] = news.items;
  const latest = rest.slice(0, 6);
  const agenda = rest.slice(6, 11);

  return (
    <div className="min-h-screen bg-paper">
      {news.sourceErrors.length > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <p className="border border-ink/20 bg-accent/10 px-3 py-2 text-xs text-ink/80">
            {t.sourceErrorBanner(news.sourceErrors.map((e) => e.sourceName).join(", "))}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {!featured ? (
          <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">{t.newsUnavailable}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] gap-8">
            <section aria-label={t.ariaLatestNews}>
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2 mb-1">
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest">{t.latestNews}</h2>
                <a
                  href={`/${locale}/latest-crypto-news`}
                  className="text-xs font-semibold text-ink/60 hover:text-ink hover:underline decoration-accent decoration-2 underline-offset-4"
                >
                  {t.allNews}
                </a>
              </div>
              <ul className="divide-y divide-rule">
                {latest.map((item) => (
                  <NewsListItem key={item.id} item={item} />
                ))}
              </ul>
            </section>

            <section aria-label={t.ariaFeaturedAndPrices} className="space-y-6">
              <CryptoStocksTabs assets={homepageAssets} asOf={prices.asOf} error={prices.error} />
              <div>
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest border-b-2 border-ink pb-2 mb-3">{t.featured}</h2>
                <FeaturedStory item={featured} />
              </div>
            </section>

            <section aria-label={t.ariaAgendaAndPanels} className="space-y-6">
              <div>
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest border-b-2 border-ink pb-2 mb-1">{t.todaysAgenda}</h2>
                {agenda.length > 0 ? (
                  <ul className="divide-y divide-rule">
                    {agenda.map((item) => (
                      <AgendaItem key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink/50 py-2">{t.noFurtherHeadlines}</p>
                )}
              </div>

              <BriefingCard briefing={briefing} />
              <ResearchPanel research={research} locale={locale} />
            </section>
          </div>
        )}

        <TopPricesTable assets={topTenAssets} asOf={prices.asOf} error={prices.error} locale={locale} />
      </main>

      <footer className="mt-10 border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-4 text-[11px] text-ink/50">{t.footerDisclaimer}</div>
      </footer>
    </div>
  );
}

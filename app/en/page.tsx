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

export const revalidate = 300;

export default async function DashboardPage() {
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
            Could not reach: {news.sourceErrors.map((e) => e.sourceName).join(", ")} — showing
            available sources only.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {!featured ? (
          <p className="border border-ink/20 px-4 py-8 text-center text-ink/60">
            News temporarily unavailable — none of the connected sources could be reached.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr_1fr] gap-8">
            <section aria-label="Latest news">
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2 mb-1">
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest">Latest News</h2>
                <a
                  href="/en/latest-crypto-news"
                  className="text-xs font-semibold text-ink/60 hover:text-ink hover:underline decoration-accent decoration-2 underline-offset-4"
                >
                  All news →
                </a>
              </div>
              <ul className="divide-y divide-rule">
                {latest.map((item) => (
                  <NewsListItem key={item.id} item={item} />
                ))}
              </ul>
            </section>

            <section aria-label="Featured story and prices" className="space-y-6">
              <CryptoStocksTabs assets={homepageAssets} asOf={prices.asOf} error={prices.error} />
              <div>
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest border-b-2 border-ink pb-2 mb-3">
                  Featured
                </h2>
                <FeaturedStory item={featured} />
              </div>
            </section>

            <section aria-label="Today's agenda and panels" className="space-y-6">
              <div>
                <h2 className="font-serif text-sm font-700 uppercase tracking-widest border-b-2 border-ink pb-2 mb-1">
                  Today&rsquo;s Agenda
                </h2>
                {agenda.length > 0 ? (
                  <ul className="divide-y divide-rule">
                    {agenda.map((item) => (
                      <AgendaItem key={item.id} item={item} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ink/50 py-2">No further headlines right now.</p>
                )}
              </div>

              <BriefingCard briefing={briefing} />
              <ResearchPanel research={research} />
            </section>
          </div>
        )}

        <TopPricesTable assets={topTenAssets} asOf={prices.asOf} error={prices.error} />
      </main>

      <footer className="mt-10 border-t border-rule">
        <div className="mx-auto max-w-6xl px-4 py-4 text-[11px] text-ink/50">
          News from CoinDesk and Decrypt RSS feeds, refreshed every few minutes. Headlines open a
          detail view with a link to the original article. This is an unverified news digest — no
          official confirmation has been applied to any item. Source image usage rights are not
          confirmed, so a fixed cover image is used instead of article photos. Prices from
          CoinGecko, refreshed every 10 minutes. Stock quotes from TradingView. Research summaries
          from Glassnode Research and Coin Metrics, shown as opinion, not verified news.
        </div>
      </footer>
    </div>
  );
}

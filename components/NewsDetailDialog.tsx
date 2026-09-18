"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/Modal";
import { SaveButton } from "@/components/SaveButton";
import { NewsInsights } from "@/components/NewsInsights";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { relativeTime, clockTime } from "@/lib/time";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

const ANALYTICS_ASSETS = new Set(["BTC", "ETH"]);

export function NewsDetailDialog() {
  const { detailItem, closeDetail } = useNewsInteraction();
  const locale = localeFromPathname(usePathname());
  const dict = getDictionary(locale);

  return (
    <Modal open={detailItem !== null} onClose={closeDetail} titleId="news-detail-title">
      {detailItem && (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
            <h2 id="news-detail-title" className="font-serif text-2xl sm:text-[32px] font-700 leading-tight">
              {detailItem.title}
            </h2>
            <button
              type="button"
              onClick={closeDetail}
              aria-label={dict.common.close}
              className="shrink-0 border border-ink/30 px-2.5 py-1.5 text-xs text-ink/60 hover:border-ink hover:text-ink"
            >
              {dict.common.close}
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink/60">
              <span className="font-semibold text-ink/80">{detailItem.sourceName}</span>
              {detailItem.author && (
                <>
                  <span aria-hidden>&middot;</span>
                  <span>{dict.news.byAuthor(detailItem.author)}</span>
                </>
              )}
              <span aria-hidden>&middot;</span>
              <span>
                {relativeTime(detailItem.publishedAt)} &middot; {clockTime(detailItem.publishedAt)} (Europe/Berlin)
              </span>
              <span aria-hidden>&middot;</span>
              <span className="border border-ink/30 px-1 rounded-sm">{dict.common.languageTag(locale)}</span>
            </div>

            {detailItem.assets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {detailItem.assets.map((symbol) => (
                  <span
                    key={symbol}
                    className="bg-accent/20 border border-accent px-1.5 py-0.5 text-[11px] font-semibold"
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            )}

            {detailItem.imageRightsVerified && detailItem.imageUrl && (
              <div className="relative w-full aspect-[16/10] bg-ink overflow-hidden">
                <Image src={detailItem.imageUrl} alt="" fill sizes="576px" className="object-cover" />
              </div>
            )}

            <NewsInsights item={detailItem} />

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={detailItem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-ink bg-ink text-paper px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-ink/80"
              >
                {dict.common.readOriginal}
              </a>
              <SaveButton item={detailItem} />
              {detailItem.assets
                .filter((symbol) => ANALYTICS_ASSETS.has(symbol))
                .map((symbol) => (
                  <Link
                    key={symbol}
                    href={`/${locale}/analytics?asset=${symbol}&tab=price-action&interval=4h`}
                    className="text-xs font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink"
                  >
                    {dict.newsDetail.viewAnalytics(symbol)}
                  </Link>
                ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

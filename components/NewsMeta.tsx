import { relativeTime } from "@/lib/time";
import { getDictionary } from "@/lib/i18n/getDictionary";
import type { Locale } from "@/lib/i18n/locale";

export function NewsMeta({
  sourceName,
  publishedAt,
  assets = [],
  locale = "en",
}: {
  sourceName: string;
  publishedAt: string;
  assets?: string[];
  locale?: Locale;
}) {
  const dict = getDictionary(locale);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink/60">
      <span className="font-semibold text-ink/80">{sourceName}</span>
      <span aria-hidden>&middot;</span>
      <span>{relativeTime(publishedAt)}</span>
      <span aria-hidden>&middot;</span>
      <span className="border border-ink/30 px-1 rounded-sm">{dict.common.languageTag(locale)}</span>
      <span className="text-ink/50">{dict.news.noOfficialConfirmation}</span>
      {assets.length > 0 && (
        <>
          <span aria-hidden>&middot;</span>
          <span className="flex gap-1">
            {assets.map((symbol) => (
              <span key={symbol} className="bg-accent/20 border border-accent/60 px-1 font-semibold text-ink/80">
                {symbol}
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}

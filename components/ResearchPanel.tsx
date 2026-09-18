import type { ResearchResult } from "@/lib/research";
import { relativeTime } from "@/lib/time";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ResearchPanel({ research, locale = "en" }: { research: ResearchResult; locale?: Locale }) {
  const allFailed = research.sourceErrors.length > 0 && research.items.length === 0;
  const dict = getDictionary(locale);
  const t = dict.research;

  return (
    <section aria-label={t.heading} className="border border-ink">
      <div className="px-3 py-3 border-b border-rule">
        <h2 className="font-serif text-sm font-700 uppercase tracking-widest">{t.heading}</h2>
        <p className="mt-1 text-[11px] text-ink/50">{t.subheading}</p>
      </div>

      <div className="px-3 py-3">
        {allFailed ? (
          <p className="text-sm text-ink/60 py-2">{t.unreachableJoined(research.sourceErrors.map((e) => e.sourceName).join(", "))}</p>
        ) : research.items.length === 0 ? (
          <p className="text-sm text-ink/50 py-2">{t.empty}</p>
        ) : (
          <ul className="divide-y divide-rule">
            {research.items.map((item) => (
              <li key={item.id} className="py-3 first:pt-0 flex gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center text-xs font-semibold">
                  {initials(item.sourceName)}
                </span>
                <div className="min-w-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-sm font-700 leading-snug hover:underline decoration-accent decoration-2 underline-offset-2"
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-[11px] text-ink/50">
                    {item.sourceName}
                    {item.author ? ` · ${item.author}` : ""} &middot; {relativeTime(item.publishedAt)}
                    <span className="ml-2 border border-ink/30 px-1 rounded-sm text-ink/60">{t.opinion}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {research.sourceErrors.length > 0 && !allFailed && (
          <p className="mt-2 text-[11px] text-ink/40">{t.unreachableOne(research.sourceErrors.map((e) => e.sourceName).join(", "))}</p>
        )}
      </div>
    </section>
  );
}

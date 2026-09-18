import type { ResearchResult } from "@/lib/research";
import { relativeTime } from "@/lib/time";

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ResearchPanel({ research }: { research: ResearchResult }) {
  const allFailed = research.sourceErrors.length > 0 && research.items.length === 0;

  return (
    <section aria-label="Research and opinion" className="border border-ink">
      <div className="px-3 py-3 border-b border-rule">
        <h2 className="font-serif text-sm font-700 uppercase tracking-widest">Research &amp; Opinion</h2>
        <p className="mt-1 text-[11px] text-ink/50">
          Independent analyst commentary — opinion, not verified news.
        </p>
      </div>

      <div className="px-3 py-3">
        {allFailed ? (
          <p className="text-sm text-ink/60 py-2">
            Could not reach {research.sourceErrors.map((e) => e.sourceName).join(" or ")} — no
            research items available right now.
          </p>
        ) : research.items.length === 0 ? (
          <p className="text-sm text-ink/50 py-2">No research items available right now.</p>
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
                    <span className="ml-2 border border-ink/30 px-1 rounded-sm text-ink/60">Opinion</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {research.sourceErrors.length > 0 && !allFailed && (
          <p className="mt-2 text-[11px] text-ink/40">
            Could not reach: {research.sourceErrors.map((e) => e.sourceName).join(", ")}.
          </p>
        )}
      </div>
    </section>
  );
}

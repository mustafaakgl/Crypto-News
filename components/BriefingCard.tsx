"use client";

import { useState } from "react";
import type { Briefing } from "@/lib/briefing";
import { Modal } from "@/components/Modal";
import { dateTime, relativeTime } from "@/lib/time";

export function BriefingCard({ briefing }: { briefing: Briefing }) {
  const [open, setOpen] = useState(false);

  return (
    <section aria-label="Latest 24h briefing" className="border border-ink">
      <div className="px-3 py-3">
        <h2 className="font-serif text-sm font-700 uppercase tracking-widest">Latest 24h Briefing</h2>
        <p className="mt-1 text-xs text-ink/60">
          {briefing.items.length} headline{briefing.items.length === 1 ? "" : "s"} from the last 24
          hours, pulled from the current news cache.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 border border-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-ink hover:text-paper"
        >
          View briefing
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} titleId="briefing-title">
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
            <div>
              <h2 id="briefing-title" className="font-serif text-xl font-700">
                Latest 24h Briefing
              </h2>
              <p className="mt-1 text-[11px] text-ink/50">
                Prepared {dateTime(briefing.preparedAt)} · covers {dateTime(briefing.windowFrom)} –{" "}
                {dateTime(briefing.windowTo)} · generated on demand from the live news cache, not a
                scheduled or delivered report.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="shrink-0 border border-ink/30 px-2 py-1 text-xs text-ink/60 hover:border-ink hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className="px-5 py-4">
            {briefing.items.length === 0 ? (
              <p className="text-sm text-ink/50 py-4">No headlines in the last 24 hours.</p>
            ) : (
              <ol className="divide-y divide-rule">
                {briefing.items.map((item, i) => (
                  <li key={item.id} className="py-3">
                    <p className="text-[11px] text-ink/40 mb-1">{i + 1}</p>
                    <h3 className="font-serif text-base font-700 leading-snug">{item.title}</h3>
                    <p className="mt-1 text-sm text-ink/70 leading-snug">{item.summary}</p>
                    <p className="mt-1 text-[11px] text-ink/50">
                      {item.sourceName} &middot; {relativeTime(item.publishedAt)}
                    </p>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold underline decoration-accent decoration-2 underline-offset-2"
                    >
                      Read original →
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </Modal>
    </section>
  );
}

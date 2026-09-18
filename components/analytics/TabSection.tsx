"use client";

import { useId, useState } from "react";

// Shared readability structure for every Analytics tab:
//   1. one-sentence "what does this section show" intro
//   2. chart + key metrics (children)
//   3. "What does this mean?" — short plain-language read
//   4. source name / data time / error-stale warnings — always visible
//   5. collapsible "Methodology & sources" for the longer explanation
export function TabSection({
  intro,
  children,
  meaning,
  sourceLine,
  methodology,
}: {
  intro: string;
  children: React.ReactNode;
  meaning: React.ReactNode;
  sourceLine: React.ReactNode;
  methodology: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{intro}</p>

      {children}

      <div className="border border-rule bg-accent/5 px-4 py-3">
        <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">What does this mean?</p>
        <div className="text-sm text-ink/80">{meaning}</div>
      </div>

      <div className="text-xs text-ink/50">{sourceLine}</div>

      <div className="border border-ink/20">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink/60 hover:text-ink"
        >
          Methodology &amp; sources
          <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
        {open && (
          <div id={panelId} className="px-3 pb-3 text-xs text-ink/60 leading-relaxed">
            {methodology}
          </div>
        )}
      </div>
    </div>
  );
}

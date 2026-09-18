"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { Asset, Interval } from "@/lib/klines";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

type VerifiedReference = {
  chunkId: string;
  sourceTitle: string;
  chapter: string;
  section: string | null;
  printedPageStart: string;
  printedPageEnd: string;
};

type ExplainResponse =
  | { status: "ok"; observation: string; interpretation: string; limitations: string; references: VerifiedReference[]; cached: boolean }
  | { status: "no_source"; message: string }
  | { status: "llm_unavailable"; message: string; references: VerifiedReference[] }
  | { status: "llm_error"; message: string }
  | { status: "rate_limited"; message: string }
  | { status: "error"; message: string };

type LoadState = "idle" | "loading" | "done" | "failed";

function ReferenceList({ references, title }: { references: VerifiedReference[]; title: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">{title}</p>
      <ul className="space-y-1.5">
        {references.map((ref) => (
          <li key={ref.chunkId} className="text-xs text-ink/70">
            <span className="font-semibold">{ref.sourceTitle.split(" — ")[0]}</span> — {ref.chapter}
            {ref.section ? ` — ${ref.section}` : ""}, p.{" "}
            {ref.printedPageStart === ref.printedPageEnd ? ref.printedPageStart : `${ref.printedPageStart}–${ref.printedPageEnd}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExplainChart({ asset, interval }: { asset: Asset; interval: Interval }) {
  const [state, setState] = useState<LoadState>("idle");
  const [response, setResponse] = useState<ExplainResponse | null>(null);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const dict = getDictionary(localeFromPathname(usePathname()));
  const t = dict.explainChart;

  // Reset on selection change so a stale explanation never lingers under a
  // new coin/interval.
  useEffect(() => {
    setState("idle");
    setResponse(null);
    setNetworkError(null);
    requestIdRef.current++;
  }, [asset, interval]);

  async function handleExplain() {
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
    setNetworkError(null);

    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset, interval }),
      });
      const json = (await res.json()) as ExplainResponse;
      if (thisRequestId !== requestIdRef.current) return; // superseded by a newer selection
      setResponse(json);
      setState("done");
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      setNetworkError(err instanceof Error ? err.message : t.failed(""));
      setState("failed");
    }
  }

  return (
    <section className="border border-ink">
      <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
        <h3 className="font-serif text-base font-700">{t.heading}</h3>
        <button
          type="button"
          onClick={handleExplain}
          disabled={state === "loading"}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border border-ink bg-ink text-paper hover:bg-ink/80 disabled:opacity-40"
        >
          {state === "loading" ? t.explaining : t.explainThisChart}
        </button>
      </div>

      <div className="px-4 py-3">
        {state === "idle" && <p className="text-sm text-ink/50">{t.idle}</p>}

        {state === "loading" && <p className="text-sm text-ink/50 animate-pulse">{t.retrieving}</p>}

        {state === "failed" && <p className="text-sm text-ink/60">{t.failed(networkError ?? "")}</p>}

        {state === "done" && response?.status === "ok" && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">{t.whatTheChartShows}</p>
              <p className="text-sm text-ink/90">{response.observation}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">{t.howThisRelates}</p>
              <p className="text-sm text-ink/80">{response.interpretation}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">{t.limitations}</p>
              <p className="text-sm text-ink/70">{response.limitations}</p>
            </div>
            <ReferenceList references={response.references} title={t.references} />
            <p className="text-[11px] text-ink/40">
              {response.cached ? t.servedFromCache : ""}
              {t.excerptDisclaimer}
            </p>
          </div>
        )}

        {state === "done" && response?.status === "no_source" && (
          <p className="text-sm text-ink/60">{response.message}</p>
        )}

        {state === "done" && response?.status === "llm_unavailable" && (
          <div className="space-y-3">
            <p className="text-sm text-ink/60">{response.message}</p>
            {response.references.length > 0 && <ReferenceList references={response.references} title={t.relatedExcerptsUnavailable} />}
          </div>
        )}

        {state === "done" && (response?.status === "llm_error" || response?.status === "rate_limited" || response?.status === "error") && (
          <p className="text-sm text-ink/60">{response.message}</p>
        )}
      </div>
    </section>
  );
}

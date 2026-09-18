"use client";

import { useEffect, useRef, useState } from "react";
import type { Asset, Interval } from "@/lib/klines";

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
      setNetworkError(err instanceof Error ? err.message : "Request failed.");
      setState("failed");
    }
  }

  return (
    <section className="border border-ink">
      <div className="px-4 py-3 border-b border-rule flex items-center justify-between">
        <h3 className="font-serif text-base font-700">Source-backed explanation</h3>
        <button
          type="button"
          onClick={handleExplain}
          disabled={state === "loading"}
          className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide border border-ink bg-ink text-paper hover:bg-ink/80 disabled:opacity-40"
        >
          {state === "loading" ? "Explaining…" : "Explain this chart"}
        </button>
      </div>

      <div className="px-4 py-3">
        {state === "idle" && (
          <p className="text-sm text-ink/50">
            Generates a short explanation of the Price Action findings above, referencing a trading book as
            background context.
          </p>
        )}

        {state === "loading" && <p className="text-sm text-ink/50 animate-pulse">Retrieving sources and generating an explanation…</p>}

        {state === "failed" && (
          <p className="text-sm text-ink/60">Could not reach the explanation service{networkError ? `: ${networkError}` : "."} The chart and calculations above are unaffected.</p>
        )}

        {state === "done" && response?.status === "ok" && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">What the chart shows</p>
              <p className="text-sm text-ink/90">{response.observation}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">How this relates to the source</p>
              <p className="text-sm text-ink/80">{response.interpretation}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">Limitations</p>
              <p className="text-sm text-ink/70">{response.limitations}</p>
            </div>
            <ReferenceList references={response.references} title="References" />
            <p className="text-[11px] text-ink/40">
              {response.cached ? "Served from cache. " : ""}Excerpts are used as background context, not as a verified
              trading strategy or a claim that the book endorses this reading.
            </p>
          </div>
        )}

        {state === "done" && response?.status === "no_source" && (
          <p className="text-sm text-ink/60">{response.message}</p>
        )}

        {state === "done" && response?.status === "llm_unavailable" && (
          <div className="space-y-3">
            <p className="text-sm text-ink/60">{response.message}</p>
            {response.references.length > 0 && <ReferenceList references={response.references} title="Related source excerpts (retrieved, not yet explained)" />}
          </div>
        )}

        {state === "done" && (response?.status === "llm_error" || response?.status === "rate_limited" || response?.status === "error") && (
          <p className="text-sm text-ink/60">{response.message}</p>
        )}
      </div>
    </section>
  );
}

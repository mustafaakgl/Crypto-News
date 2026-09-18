"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news";
import type { NewsAnalysisResult, PublicSourceRecord } from "@/lib/newsAnalysis/types";
import { classifyContentScope, CONTENT_SCOPE_LABEL } from "@/lib/newsAnalysis/contentScope";
import { relativeTime, clockTime } from "@/lib/time";

const RETRYABLE_STATUSES = new Set(["llm_error", "rate_limited", "error"]);

function formatDocDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Only shows a clock time when the source page actually stated a release
// time (publishedAtPrecision === "datetime") — otherwise a plain date, never
// a fabricated hour.
function formatDocPublished(r: PublicSourceRecord): string {
  if (r.publishedAtPrecision === "datetime") {
    return `${formatDocDate(r.sourcePublishedAt)}, ${clockTime(r.sourcePublishedAt)}`;
  }
  return formatDocDate(r.sourcePublishedAt);
}

function SectionBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold mb-1">{label}</p>
      {children}
    </div>
  );
}

export function NewsInsights({ item }: { item: NewsItem }) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const [result, setResult] = useState<NewsAnalysisResult | null>(null);
  const requestIdRef = useRef(0);

  const runAnalysis = useCallback(async (forItem: NewsItem) => {
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
    // Clear the previous article's result immediately — otherwise its
    // sourceRecords/generatedAt would keep rendering in "Sources & updates"
    // under the new headline for the moment before this fetch resolves.
    setResult(null);
    try {
      const res = await fetch("/api/news-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: forItem.id }),
      });
      const json = (await res.json()) as NewsAnalysisResult;
      if (thisRequestId !== requestIdRef.current) return;
      setResult(json);
      setState("loaded");
    } catch {
      if (thisRequestId !== requestIdRef.current) return;
      setResult({ status: "error", message: "Could not reach the analysis service." });
      setState("failed");
    }
  }, []);

  // Auto-generate on open (or when switching to a different article) — never
  // leaves the previous article's AI output showing under a new headline.
  useEffect(() => {
    runAnalysis(item);
  }, [item, runAnalysis]);

  // Before the server's real resolution arrives, fall back to the instant,
  // no-fetch scope classification so "Content used" isn't blank while loading.
  const fallbackScope = classifyContentScope(item);
  const sourceRecords: PublicSourceRecord[] = (result && "sourceRecords" in result && result.sourceRecords) || [];
  const excerptRecords = sourceRecords.filter((r) => r.kind === "rss_excerpt");
  const officialRecords = sourceRecords.filter((r) => r.kind === "official_announcement");
  const hasOfficial = officialRecords.length > 0;
  const contentUsedLabel = hasOfficial ? "Publisher excerpt + Related official documents" : CONTENT_SCOPE_LABEL[fallbackScope];
  const generatedAt = result?.status === "ok" ? result.generatedAt : null;
  const cached = result?.status === "ok" ? result.cached : false;

  return (
    <div className="space-y-4">
      {/* Key takeaways / Why it matters / Analyst take / What to watch next */}
      {state === "loading" && <p className="text-sm text-ink/50 animate-pulse">Preparing analysis…</p>}

      {state !== "loading" && result?.status === "ok" && (
        <>
          <SectionBlock label={`Key takeaways${result.limitedSourceDetail ? " · Limited source detail" : ""}`}>
            {result.keyTakeaways.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-sm text-ink/85">
                {result.keyTakeaways.map((t, i) => (
                  <li key={i}>{t.text}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/50">No distinct takeaways could be drawn from the available source text.</p>
            )}
          </SectionBlock>

          <SectionBlock label="Why it matters">
            <p className="text-sm text-ink/80">{result.whyItMatters || "Insufficient information for analysis"}</p>
          </SectionBlock>

          <div className="border border-rule bg-accent/5 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Analyst take</p>
              <span className="text-[10px] uppercase tracking-wide border border-ink/30 px-1.5 py-0.5 text-ink/50">
                AI-generated analysis
              </span>
            </div>
            <p className="text-sm text-ink/80">{result.analystTake}</p>
          </div>

          <SectionBlock label="What to watch next">
            {result.watchNext.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-sm text-ink/85">
                {result.watchNext.map((t, i) => (
                  <li key={i}>{t.text}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/50">No concrete follow-up points were named in the available source text.</p>
            )}
          </SectionBlock>
        </>
      )}

      {state !== "loading" && result && result.status !== "ok" && (
        <div className="border border-rule px-4 py-3 space-y-2">
          <p className="text-sm text-ink/60">{result.message}</p>
          {RETRYABLE_STATUSES.has(result.status) && (
            <button
              type="button"
              onClick={() => runAnalysis(item)}
              className="px-2 py-1 text-xs font-semibold uppercase tracking-wide border border-ink/30 text-ink/60 hover:border-ink"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Sources & updates — always renders from real article data, independent of AI status */}
      <div className="border border-ink/20 px-4 py-3 space-y-2">
        <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Sources &amp; updates</p>
        <div className="text-xs text-ink/60 space-y-1">
          <p>
            Content used: <span className="font-semibold text-ink/80">{contentUsedLabel}</span>
          </p>
          <p>
            Published: {relativeTime(item.publishedAt)} · {clockTime(item.publishedAt)}
          </p>
          {generatedAt && (
            <p>
              AI analysis prepared: {clockTime(generatedAt)}
              {cached ? " (served from cache)" : ""}
            </p>
          )}
        </div>

        {hasOfficial && (
          <p className="text-xs text-ink/50 italic">
            The official document(s) below match this article's institution, event type and date — that confirms only the
            specific statement or release it names, not every claim or market comment in this article.
          </p>
        )}

        {excerptRecords.length > 0 && (
          <details className="text-xs text-ink/60">
            <summary className="cursor-pointer font-semibold text-ink/70">Source text used</summary>
            <div className="mt-2 space-y-2">
              {excerptRecords.map((r) => (
                <div key={r.id} className="border-l-2 border-ink/20 pl-2">
                  <p className="font-semibold text-ink/70">{r.label}</p>
                  <p className="italic">&ldquo;{r.text}&rdquo;</p>
                  <p className="text-[10px] text-ink/40 mt-0.5">
                    Source dated {clockTime(r.sourcePublishedAt)} · fetched {clockTime(r.fetchedAt)} ·{" "}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Original
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}

        {officialRecords.length > 0 && (
          <details className="text-xs text-ink/60" open>
            <summary className="cursor-pointer font-semibold text-ink/70">Related official documents</summary>
            <div className="mt-2 space-y-3">
              {officialRecords.map((r) => (
                <div key={r.id} className="border-l-2 border-accent pl-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-ink/70">{r.label}</p>
                    {r.isSubsequentUpdate && (
                      <span className="text-[10px] uppercase tracking-wide border border-ink/30 px-1 text-ink/50">
                        Published after this article
                      </span>
                    )}
                  </div>
                  {r.text ? (
                    <p className="italic">&ldquo;{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}&rdquo;</p>
                  ) : (
                    <p className="italic text-ink/40">No extractable text for this document — see the original link.</p>
                  )}
                  {r.tablesOmitted && (
                    <p className="text-[10px] text-ink/50 font-semibold mt-0.5">Numerical projection tables not included</p>
                  )}
                  <p className="text-[10px] text-ink/40 mt-0.5">
                    Published {formatDocPublished(r)}
                    {r.meetingDate && r.meetingDate !== r.sourcePublishedAt.slice(0, 10) ? ` · meeting held ${formatDocDate(r.meetingDate)}` : ""}
                    {" · fetched "}
                    {clockTime(r.fetchedAt)} ·{" "}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Original
                    </a>
                  </p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

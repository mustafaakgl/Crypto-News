"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NewsItem } from "@/lib/news";
import type { NewsAnalysisResult, PublicSourceRecord } from "@/lib/newsAnalysis/types";
import { classifyContentScope } from "@/lib/newsAnalysis/contentScope";
import { selectExcerptHighlights } from "@/lib/newsAnalysis/excerptHighlights";
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
    return `${formatDocDate(r.sourcePublishedAt)}, ${clockTime(r.sourcePublishedAt)} (Europe/Berlin)`;
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

function AiTag({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] uppercase tracking-wide border border-ink/30 px-1.5 py-0.5 text-ink/50 shrink-0">{children}</span>;
}

export function NewsInsights({ item }: { item: NewsItem }) {
  // Instant, no-fetch baseline: the publisher's own excerpt, presented
  // without any LLM. Computed synchronously from data already on hand, so
  // the article is readable the moment the panel opens — nothing here waits
  // on the analysis request below.
  const contentScope = classifyContentScope(item);
  const excerpt = selectExcerptHighlights(item.descriptionFull, item.title);

  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const [result, setResult] = useState<NewsAnalysisResult | null>(null);
  const requestIdRef = useRef(0);

  const runAnalysis = useCallback(async (forItem: NewsItem) => {
    const thisRequestId = ++requestIdRef.current;
    setState("loading");
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
  // Skipped entirely for a headline-only article: the server can only ever
  // resolve that to "insufficient_source" (no source text exists to send a
  // model), so asking would just be a wasted round trip.
  useEffect(() => {
    if (contentScope === "headline_only") {
      requestIdRef.current++; // invalidate any in-flight request from a previous article
      setState("loaded");
      setResult(null);
      return;
    }
    runAnalysis(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, contentScope, runAnalysis]);

  const sourceRecords: PublicSourceRecord[] = (result && "sourceRecords" in result && result.sourceRecords) || [];
  const excerptRecords = sourceRecords.filter((r) => r.kind === "rss_excerpt");
  const officialRecords = sourceRecords.filter((r) => r.kind === "official_announcement");
  const hasOfficial = officialRecords.length > 0;
  const aiOk = result?.status === "ok";
  const generatedAt = aiOk ? result.generatedAt : null;
  const cached = aiOk ? result.cached : false;
  const showAdditionalUnavailableNote = state !== "loading" && result !== null && !aiOk && RETRYABLE_STATUSES.has(result.status);

  if (contentScope === "headline_only") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink/70">Only the headline is available. Read the original for details.</p>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-2 hover:decoration-ink"
        >
          Read original →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {aiOk ? (
        <>
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">
                Key points{result.limitedSourceDetail ? " · Limited source detail" : ""}
              </p>
              <AiTag>AI-generated summary</AiTag>
            </div>
            {result.keyTakeaways.length > 0 ? (
              <ul className="list-disc pl-4 space-y-1 text-sm text-ink/85">
                {result.keyTakeaways.map((t, i) => (
                  <li key={i}>{t.text}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/50">No distinct takeaways could be drawn from the available source text.</p>
            )}
          </div>

          {result.whyItMatters.trim() && (
            <SectionBlock label="Why it matters">
              <p className="text-sm text-ink/80">{result.whyItMatters}</p>
            </SectionBlock>
          )}

          {result.analystTake.trim() && (
            <div className="border border-rule bg-accent/5 px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Analyst take</p>
                <AiTag>AI-generated analysis</AiTag>
              </div>
              <p className="text-sm text-ink/80">{result.analystTake}</p>
            </div>
          )}

          {result.watchNext.length > 0 && (
            <SectionBlock label="What to watch next">
              <ul className="list-disc pl-4 space-y-1 text-sm text-ink/85">
                {result.watchNext.map((t, i) => (
                  <li key={i}>{t.text}</li>
                ))}
              </ul>
            </SectionBlock>
          )}
        </>
      ) : excerpt.mode === "key_points" ? (
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Key points</p>
            <AiTag>Selected from publisher excerpt</AiTag>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-sm text-ink/85">
            {excerpt.sentences.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ) : excerpt.mode === "paragraph" ? (
        <SectionBlock label="Publisher excerpt">
          <p className="text-sm text-ink/85">{excerpt.text}</p>
        </SectionBlock>
      ) : null}

      {showAdditionalUnavailableNote && (
        <div className="flex items-center gap-2 text-xs text-ink/50">
          <span>Additional analysis is temporarily unavailable.</span>
          <button
            type="button"
            onClick={() => runAnalysis(item)}
            className="px-2 py-0.5 font-semibold uppercase tracking-wide border border-ink/30 text-ink/60 hover:border-ink shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Sources & updates — a compact disclosure, always built from real
          article data, independent of AI status. */}
      <details className="border border-ink/20 px-4 py-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-wide text-ink/50 font-semibold">Sources &amp; updates</summary>
        <div className="mt-2 space-y-3 text-xs text-ink/60">
          <p>
            Published: {relativeTime(item.publishedAt)} · {clockTime(item.publishedAt)} (Europe/Berlin)
            {generatedAt && (
              <>
                {" · AI analysis prepared "}
                {clockTime(generatedAt)}
                {cached ? " (cached)" : ""}
              </>
            )}
          </p>

          {excerptRecords.map((r) => (
            <div key={r.id} className="border-l-2 border-ink/20 pl-2">
              <p className="font-semibold text-ink/70">{r.label}</p>
              <p className="text-[10px] text-ink/40 mt-0.5">
                Source dated {clockTime(r.sourcePublishedAt)} (Europe/Berlin) ·{" "}
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                  Original
                </a>
              </p>
            </div>
          ))}

          {state !== "loading" && (
            <>
              {hasOfficial ? (
                <p className="italic">
                  The official document(s) below match this article&apos;s institution, event type and date — that confirms only the
                  specific statement or release it names, not every claim or market comment in this article.
                </p>
              ) : (
                <p className="italic text-ink/45">
                  No matching official document found among the sources this app checks against — that does not mean no official
                  statement exists, only that none was matched here.
                </p>
              )}

              {officialRecords.map((r) => (
                <div key={r.id} className="border-l-2 border-accent pl-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-semibold text-ink/70">{r.label}</p>
                    {r.isSubsequentUpdate && (
                      <span className="text-[10px] uppercase tracking-wide border border-ink/30 px-1 text-ink/50">
                        Subsequent official update
                      </span>
                    )}
                  </div>
                  {r.text ? (
                    <p className="italic">&ldquo;{r.text.length > 400 ? `${r.text.slice(0, 400)}…` : r.text}&rdquo;</p>
                  ) : (
                    <p className="italic text-ink/40">No extractable text for this document — see the original link.</p>
                  )}
                  {r.tablesOmitted && <p className="text-[10px] text-ink/50 font-semibold mt-0.5">Numerical projection tables not included</p>}
                  <p className="text-[10px] text-ink/40 mt-0.5">
                    Published {formatDocPublished(r)}
                    {r.meetingDate && r.meetingDate !== r.sourcePublishedAt.slice(0, 10) ? ` · meeting held ${formatDocDate(r.meetingDate)}` : ""}
                    {" · "}
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline">
                      Original
                    </a>
                  </p>
                </div>
              ))}
            </>
          )}
        </div>
      </details>
    </div>
  );
}

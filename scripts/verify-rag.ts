// Manual verification script for the pure RAG functions (retrieval, query
// building, citation parsing/verification). Deliberately avoids importing
// lib/rag/store.ts, lib/rag/llm.ts, lib/rag/cache.ts, or lib/rag/explain.ts,
// since those import the "server-only" package, which throws unconditionally
// outside a Next.js server/client bundle split and cannot run under plain
// `node`. Synthetic BookChunk[] fixtures stand in for store.ts's real index.
// Run with: node scripts/verify-rag.ts
import type { BookChunk, ScoredChunk } from "../lib/rag/types.ts";
import { tokenize, bm25Search, createBm25Retriever } from "../lib/rag/search.ts";
import { buildPriceActionQuery } from "../lib/rag/query.ts";
import { parseLlmJson, verifyCitations } from "../lib/rag/citations.ts";
import type { PriceActionResult } from "../lib/priceAction.ts";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function makeChunk(overrides: Partial<BookChunk> & { chunkId: string; text: string }): BookChunk {
  return {
    sourceId: "brooks-trends",
    sourceVersion: "test-version",
    sourceTitle: "Al Brooks — Trading Price Action Trends: Technical Analysis of Price Charts Bar by Bar for the Serious Trader. Wiley, 2012.",
    chapter: "Chapter 1: The Spectrum of Price Action: Extreme Trends to Extreme Trading Ranges",
    section: null,
    pdfPageStart: 87,
    pdfPageEnd: 87,
    printedPageStart: "55",
    printedPageEnd: "55",
    figureRefs: [],
    needsVisualContext: false,
    ...overrides,
  };
}

const emptyPivots = { highs: [], lows: [] };

function makePriceAction(overrides: Partial<PriceActionResult>): PriceActionResult {
  return {
    trend: "Insufficient data",
    pivots: emptyPivots,
    lastConfirmedHigh: null,
    lastConfirmedLow: null,
    breakout: null,
    ...overrides,
  };
}

// ---- tokenize ----
{
  assertEqual(tokenize("Higher Highs, Higher Lows!"), ["higher", "highs", "higher", "lows"], "tokenize: lowercases, strips punctuation, drops stopwords");
  assertEqual(tokenize("the a an of"), [], "tokenize: pure-stopword text -> []");
  assertEqual(tokenize("don't test"), ["dont", "test"], "tokenize: strips apostrophes rather than splitting on them");
}

// ---- bm25Search / createBm25Retriever ----
{
  const chunks: BookChunk[] = [
    makeChunk({
      chunkId: "c17-swing-1",
      chapter: "Chapter 17: Horizontal Lines: Swing Points and Other Key Price Levels",
      pdfPageStart: 301,
      pdfPageEnd: 301,
      printedPageStart: "269",
      printedPageEnd: "269",
      text: "A swing high is a bar with a lower high on both sides. Traders draw a horizontal line at the swing high and swing low to mark key price levels.",
    }),
    makeChunk({
      chunkId: "c19-strength-1",
      chapter: "Chapter 19: Signs of Strength in a Trend",
      pdfPageStart: 339,
      pdfPageEnd: 339,
      printedPageStart: "307",
      printedPageEnd: "307",
      text: "In a strong bull trend, pullbacks are small and every higher high is followed by a higher low, showing trend continuation.",
    }),
    makeChunk({
      chunkId: "c3-breakout-1",
      chapter: "Chapter 3: Breakouts, Trading Ranges, Tests, and Reversals",
      pdfPageStart: 109,
      pdfPageEnd: 109,
      printedPageStart: "77",
      printedPageEnd: "77",
      text: "A breakout above a trading range often needs a test and follow-through before traders trust the new bull breakout.",
    }),
    makeChunk({
      chunkId: "glossary-unrelated",
      chapter: "List of Terms Used in This Book",
      pdfPageStart: 15,
      pdfPageEnd: 15,
      printedPageStart: "xiii",
      printedPageEnd: "xiii",
      text: "Apex the point where two trend lines of a triangle would cross if extended far enough to the right.",
    }),
  ];

  const swingResults = bm25Search(chunks, "swing high swing low horizontal line key price level", 4);
  assertTrue(swingResults.length > 0, "bm25Search: swing-point query returns results");
  assertEqual(swingResults[0].chunk.chunkId, "c17-swing-1", "bm25Search: swing-point query ranks the Chapter 17 swing chunk first");

  const breakoutResults = bm25Search(chunks, "breakout test follow-through bull breakout", 4);
  assertEqual(breakoutResults[0].chunk.chunkId, "c3-breakout-1", "bm25Search: breakout query ranks the Chapter 3 breakout chunk first");

  const noMatch = bm25Search(chunks, "zzqqxx nonexistent term", 4);
  assertEqual(noMatch, [], "bm25Search: query with no matching terms returns []");

  const empty = bm25Search([], "swing high", 4);
  assertEqual(empty, [], "bm25Search: empty corpus returns []");

  const retriever = createBm25Retriever(chunks);
  const viaRetriever = retriever.search("higher high higher low trend continuation", 2);
  assertTrue(viaRetriever.length > 0 && viaRetriever.length <= 2, "createBm25Retriever: respects k and returns scored chunks");
  assertEqual(viaRetriever[0].chunk.chunkId, "c19-strength-1", "createBm25Retriever: trend-continuation query ranks Chapter 19 first");
}

// ---- buildPriceActionQuery ----
{
  const uptrend = makePriceAction({
    trend: "Uptrend",
    pivots: { highs: [{ index: 5, time: 1000, price: 100 }], lows: [{ index: 3, time: 900, price: 90 }] },
    breakout: { direction: "up", lastClose: 105, windowHigh: 104, windowLow: 95, windowSize: 20 },
  });
  const q1 = buildPriceActionQuery("BTC", "1h", uptrend);
  for (const term of ["uptrend", "bull trend", "higher high", "swing high", "swing low", "breakout", "bull breakout", "bitcoin", "1h"]) {
    assertTrue(q1.includes(term), `buildPriceActionQuery: uptrend+breakout query includes "${term}"`);
  }
  assertTrue(!q1.includes("bear"), "buildPriceActionQuery: uptrend query never includes bear/downtrend terms");

  const mixed = makePriceAction({ trend: "Mixed structure" });
  const q2 = buildPriceActionQuery("ETH", "4h", mixed);
  assertTrue(q2.includes("trading range") && q2.includes("ethereum") && q2.includes("4h"), "buildPriceActionQuery: mixed-structure query includes trading-range terms and asset/interval");
  assertTrue(!q2.includes("swing high"), "buildPriceActionQuery: no pivots found -> no swing-point terms added");

  const insufficient = makePriceAction({ trend: "Insufficient data" });
  const q3 = buildPriceActionQuery("BTC", "1d", insufficient);
  assertTrue(q3.includes("spectrum of price action"), "buildPriceActionQuery: insufficient-data query falls back to spectrum-of-price-action terms");
}

// ---- parseLlmJson ----
{
  const valid = parseLlmJson(JSON.stringify({ observation: "o", interpretation: "i", limitations: "l", citations: ["a", "b"] }));
  assertEqual(valid, { observation: "o", interpretation: "i", limitations: "l", citations: ["a", "b"] }, "parseLlmJson: accepts a well-formed structured response");

  assertEqual(parseLlmJson("not json"), null, "parseLlmJson: invalid JSON -> null");
  assertEqual(parseLlmJson(JSON.stringify({ observation: "o" })), null, "parseLlmJson: missing required fields -> null");
  assertEqual(parseLlmJson(JSON.stringify({ observation: 1, interpretation: "i", limitations: "l", citations: [] })), null, "parseLlmJson: wrong field type -> null");

  const missingCitations = parseLlmJson(JSON.stringify({ observation: "o", interpretation: "i", limitations: "l" }));
  assertEqual(missingCitations, { observation: "o", interpretation: "i", limitations: "l", citations: [] }, "parseLlmJson: missing citations array defaults to []");

  const dirtyCitations = parseLlmJson(JSON.stringify({ observation: "o", interpretation: "i", limitations: "l", citations: ["a", 42, "b"] }));
  assertEqual(dirtyCitations?.citations, ["a", "b"], "parseLlmJson: non-string citation entries are filtered out");
}

// ---- verifyCitations ----
{
  const retrieved: ScoredChunk[] = [
    { chunk: makeChunk({ chunkId: "real-1", chapter: "Chapter 1: The Spectrum of Price Action: Extreme Trends to Extreme Trading Ranges", printedPageStart: "55", printedPageEnd: "55" }), score: 5 },
    { chunk: makeChunk({ chunkId: "real-2", chapter: "Chapter 19: Signs of Strength in a Trend", printedPageStart: "307", printedPageEnd: "308" }), score: 3 },
  ];

  const ok = verifyCitations(["real-1", "real-2"], retrieved);
  assertEqual(ok.map((r) => r.chunkId), ["real-1", "real-2"], "verifyCitations: accepts chunkIds that were actually retrieved, in order");
  assertEqual(ok[1].printedPageStart, "307", "verifyCitations: server reconstructs the printed page range from the retrieved chunk, not from the model");

  const fabricated = verifyCitations(["real-1", "made-up-chunk-id"], retrieved);
  assertEqual(fabricated.map((r) => r.chunkId), ["real-1"], "verifyCitations: drops a fabricated/unretrieved chunkId instead of trusting it");

  const outOfScope = verifyCitations(["some-onchain-chunk-id"], retrieved);
  assertEqual(outOfScope, [], "verifyCitations: a chunkId from outside the retrieved set (e.g. another tab's scope) is rejected entirely");

  const deduped = verifyCitations(["real-1", "real-1", "real-2"], retrieved);
  assertEqual(deduped.map((r) => r.chunkId), ["real-1", "real-2"], "verifyCitations: duplicate citations are deduplicated");

  const none = verifyCitations([], retrieved);
  assertEqual(none, [], "verifyCitations: no claimed citations -> []");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

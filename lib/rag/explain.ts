import "server-only";
import type { Asset, Interval } from "@/lib/klines";
import type { PriceActionResult } from "@/lib/priceAction";
import type { ScoredChunk, VerifiedReference } from "@/lib/rag/types";
import { loadPriceActionChunks, getSourceVersion } from "@/lib/rag/store";
import { createBm25Retriever } from "@/lib/rag/search";
import { buildPriceActionQuery } from "@/lib/rag/query";
import { buildExplainPrompt, PROMPT_VERSION } from "@/lib/rag/prompt";
import { getLlmConfig, callLlm } from "@/lib/rag/llm";
import { parseLlmJson, verifyCitations } from "@/lib/rag/citations";
import { buildExplainCacheKey, TtlCache, checkRateLimit } from "@/lib/rag/cache";

const RETRIEVAL_K = 4;
const RELEVANCE_FLOOR = 0.5; // BM25 scores below this aren't considered relevant enough

// Module-level singleton — persists for the lifetime of this server process
// (fine for the initial, single-instance scope this feature targets).
const explainCache = new TtlCache<ExplainResult>();

export type DataContext = {
  asset: Asset;
  interval: Interval;
  pair: string;
  lastClosedAt: number;
  trend: PriceActionResult["trend"];
};

export type ExplainResult =
  | { status: "ok"; observation: string; interpretation: string; limitations: string; references: VerifiedReference[]; dataContext: DataContext; generatedAt: string; cached: boolean }
  | { status: "no_source"; message: string; dataContext: DataContext }
  | { status: "llm_unavailable"; message: string; references: VerifiedReference[]; dataContext: DataContext }
  | { status: "llm_error"; message: string; dataContext: DataContext }
  | { status: "rate_limited"; message: string };

function referencesFromRetrieved(retrieved: ScoredChunk[]): VerifiedReference[] {
  return retrieved.map((r) => ({
    chunkId: r.chunk.chunkId,
    sourceTitle: r.chunk.sourceTitle,
    chapter: r.chunk.chapter,
    section: r.chunk.section,
    printedPageStart: r.chunk.printedPageStart,
    printedPageEnd: r.chunk.printedPageEnd,
  }));
}

export async function explainPriceAction(params: {
  asset: Asset;
  interval: Interval;
  pair: string;
  lastClosedAt: number;
  priceAction: PriceActionResult;
}): Promise<ExplainResult> {
  const { asset, interval, pair, lastClosedAt, priceAction } = params;
  const dataContext: DataContext = { asset, interval, pair, lastClosedAt, trend: priceAction.trend };

  if (!checkRateLimit()) {
    return { status: "rate_limited", message: "Too many explanation requests right now — please try again shortly." };
  }

  const chunks = loadPriceActionChunks();
  const sourceVersion = getSourceVersion();

  if (chunks.length === 0 || !sourceVersion) {
    return { status: "no_source", message: "No relevant source found", dataContext };
  }

  const retriever = createBm25Retriever(chunks);
  const query = buildPriceActionQuery(asset, interval, priceAction);
  const retrieved = retriever.search(query, RETRIEVAL_K).filter((r) => r.score >= RELEVANCE_FLOOR);

  if (retrieved.length === 0) {
    return { status: "no_source", message: "No relevant source found", dataContext };
  }

  const llmConfig = getLlmConfig();
  if (!llmConfig) {
    return {
      status: "llm_unavailable",
      message: "AI explanation unavailable — no model is configured (missing LLM_BASE_URL / LLM_API_KEY / LLM_MODEL).",
      references: referencesFromRetrieved(retrieved),
      dataContext,
    };
  }

  const cacheKey = buildExplainCacheKey({
    asset,
    interval,
    priceAction,
    sourceVersion,
    model: llmConfig.model,
    promptVersion: PROMPT_VERSION,
  });

  const wasCached = explainCache.get(cacheKey) !== null;

  const result = await explainCache.getOrCompute(cacheKey, async (): Promise<ExplainResult> => {
    const messages = buildExplainPrompt({ asset, interval, pair, lastClosedAt, priceAction, chunks: retrieved });
    const outcome = await callLlm(llmConfig, messages);

    if (!outcome.ok) {
      return { status: "llm_error", message: outcome.error, dataContext };
    }

    const parsed = parseLlmJson(outcome.content);
    if (!parsed) {
      return { status: "llm_error", message: "The model's response could not be parsed as the expected structured format.", dataContext };
    }

    const verifiedRefs = verifyCitations(parsed.citations, retrieved);
    if (verifiedRefs.length === 0) {
      return { status: "llm_error", message: "The model's citations could not be verified against the retrieved source excerpts.", dataContext };
    }

    return {
      status: "ok",
      observation: parsed.observation,
      interpretation: parsed.interpretation,
      limitations: parsed.limitations,
      references: verifiedRefs,
      dataContext,
      generatedAt: new Date().toISOString(),
      cached: false,
    };
  }, (value) => value.status === "ok");

  if (result.status === "ok") {
    return { ...result, cached: wasCached } satisfies ExplainResult;
  }
  return result;
}

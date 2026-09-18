import "server-only";
import type { NewsItem } from "@/lib/news";
import type { NewsAnalysisResult } from "@/lib/newsAnalysis/types";
import { resolveSourceRecords } from "@/lib/newsAnalysis/sourceResolver";
import { buildNewsAnalysisPrompt, PROMPT_VERSION } from "@/lib/newsAnalysis/prompt";
import { getLlmConfig, callLlm } from "@/lib/rag/llm";
import { parseNewsAnalysisJson, verifySourceRecordIds, containsFabricatedClaim } from "@/lib/newsAnalysis/citations";
import { buildNewsAnalysisCacheKey, checkNewsAnalysisRateLimit } from "@/lib/newsAnalysis/cache";
import { TtlCache } from "@/lib/rag/cache";

// Module-level singleton — persists for the lifetime of this server process.
const analysisCache = new TtlCache<NewsAnalysisResult>();

export async function analyzeNews(item: NewsItem): Promise<NewsAnalysisResult> {
  if (!checkNewsAnalysisRateLimit()) {
    return { status: "rate_limited", message: "Too many analysis requests right now — please try again shortly." };
  }

  const sourceRecords = await resolveSourceRecords(item);

  if (sourceRecords.length === 0) {
    return {
      status: "insufficient_source",
      message: "This article's available content is a headline only — not enough source text to generate key takeaways or analysis.",
      sourceRecords,
    };
  }

  const llmConfig = getLlmConfig();
  if (!llmConfig) {
    return { status: "llm_unavailable", message: "AI analysis unavailable — no model is configured yet for this feature.", sourceRecords };
  }

  const cacheKey = buildNewsAnalysisCacheKey({
    itemId: item.id,
    sourceRecords,
    model: llmConfig.model,
    promptVersion: PROMPT_VERSION,
  });

  const wasCached = analysisCache.get(cacheKey) !== null;

  const result = await analysisCache.getOrCompute(
    cacheKey,
    async (): Promise<NewsAnalysisResult> => {
      const messages = buildNewsAnalysisPrompt({ item, sourceRecords });
      const outcome = await callLlm(llmConfig, messages);

      if (!outcome.ok) {
        return { status: "llm_error", message: outcome.error, sourceRecords };
      }

      const parsed = parseNewsAnalysisJson(outcome.content);
      if (!parsed) {
        return { status: "llm_error", message: "The model's response could not be parsed as the expected structured format.", sourceRecords };
      }

      const verifiedIds = verifySourceRecordIds(parsed.sourceRecordIds, sourceRecords);
      if (verifiedIds.length === 0) {
        return { status: "llm_error", message: "The model's output could not be grounded in the retrieved source content.", sourceRecords };
      }

      const allText = [parsed.whyItMatters, parsed.analystTake, ...parsed.keyTakeaways, ...parsed.watchNext];
      if (allText.some(containsFabricatedClaim)) {
        return { status: "llm_error", message: "The model's response included an unsupported link or price figure and was rejected.", sourceRecords };
      }

      // NOTE: this attributes every bullet to the first verified record, not
      // a genuine per-bullet match — with only a flat sourceRecordIds[] in
      // the response contract, the server cannot yet tell which specific
      // bullet came from which specific record when more than one exists
      // (e.g. RSS excerpt + official announcement together). A real citation
      // id being valid is a structural check, not a semantic-accuracy
      // guarantee — see the final report for why this is a known
      // simplification to revisit once a real model is connected.
      const primaryRecordId = verifiedIds[0];
      return {
        status: "ok",
        keyTakeaways: parsed.keyTakeaways.map((text) => ({ text, sourceRecordId: primaryRecordId })),
        limitedSourceDetail: parsed.limitedSourceDetail,
        whyItMatters: parsed.whyItMatters,
        analystTake: parsed.analystTake,
        watchNext: parsed.watchNext.map((text) => ({ text, sourceRecordId: primaryRecordId })),
        sourceRecords,
        generatedAt: new Date().toISOString(),
        cached: false,
      };
    },
    (value) => value.status === "ok"
  );

  if (result.status === "ok") {
    return { ...result, cached: wasCached } satisfies NewsAnalysisResult;
  }
  return result;
}

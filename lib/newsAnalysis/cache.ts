import "server-only";
import { createHash } from "node:crypto";
import type { SourceRecord } from "@/lib/newsAnalysis/types";

// Cache key spans everything that can change the answer: which article, a
// hash of the actual source text used (so an updated RSS description
// invalidates it), the model, and the prompt version.
export function buildNewsAnalysisCacheKey(params: {
  itemId: string;
  sourceRecords: SourceRecord[];
  model: string;
  promptVersion: string;
}): string {
  const { itemId, sourceRecords, model, promptVersion } = params;
  const contentFingerprint = JSON.stringify(sourceRecords.map((r) => ({ id: r.id, text: r.text })));
  const contentHash = createHash("sha256").update(contentFingerprint).digest("hex").slice(0, 16);
  return [itemId, contentHash, model, promptVersion].join(":");
}

// Own sliding-window limiter, independent from the Price Action explain
// endpoint's budget — an auto-triggered "open article" flow and a manual
// "explain this chart" button shouldn't compete for the same quota.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestTimestamps: number[] = [];

export function checkNewsAnalysisRateLimit(): boolean {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  requestTimestamps.push(now);
  return true;
}

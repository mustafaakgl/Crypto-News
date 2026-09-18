import type { BookChunk, ScoredChunk, VerifiedReference } from "@/lib/rag/types";

export type LlmStructuredResponse = {
  observation: string;
  interpretation: string;
  limitations: string;
  citations: string[];
};

// Accepts only a plausible shape — never trusts field types blindly.
export function parseLlmJson(raw: string): LlmStructuredResponse | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const observation = typeof obj.observation === "string" ? obj.observation : null;
  const interpretation = typeof obj.interpretation === "string" ? obj.interpretation : null;
  const limitations = typeof obj.limitations === "string" ? obj.limitations : null;
  const citations = Array.isArray(obj.citations) ? obj.citations.filter((c): c is string => typeof c === "string") : [];
  if (observation === null || interpretation === null || limitations === null) return null;
  return { observation, interpretation, limitations, citations };
}

// The ONLY source of truth for what a citation is allowed to reference: the
// exact set of chunks that were actually retrieved and sent to the model.
// Anything else the model names is a fabrication and is dropped — the
// server, not the model, builds the visible reference list from here.
export function verifyCitations(claimed: string[], retrieved: ScoredChunk[]): VerifiedReference[] {
  const byId = new Map<string, BookChunk>(retrieved.map((r) => [r.chunk.chunkId, r.chunk]));
  const seen = new Set<string>();
  const verified: VerifiedReference[] = [];

  for (const chunkId of claimed) {
    if (seen.has(chunkId)) continue;
    const chunk = byId.get(chunkId);
    if (!chunk) continue; // fabricated or out-of-scope chunkId — rejected
    seen.add(chunkId);
    verified.push({
      chunkId: chunk.chunkId,
      sourceTitle: chunk.sourceTitle,
      chapter: chunk.chapter,
      section: chunk.section,
      printedPageStart: chunk.printedPageStart,
      printedPageEnd: chunk.printedPageEnd,
    });
  }

  return verified;
}

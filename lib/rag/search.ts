import type { BookChunk, ScoredChunk } from "@/lib/rag/types";

// A pluggable retrieval interface — this local BM25 implementation is the
// starting point ("yerel tam metin arama"); a future embeddings-backed
// retriever can implement the same interface without touching call sites.
export type Retriever = {
  search(query: string, k: number): ScoredChunk[];
};

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "at", "is", "are", "was", "were", "be", "been", "being",
  "and", "or", "but", "if", "then", "than", "for", "with", "as", "by", "it", "its", "this", "that",
  "these", "those", "from", "into", "about", "not", "no", "so", "such", "there", "their", "his",
  "her", "will", "would", "should", "can", "could", "may", "might", "has", "have", "had",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’‘'"]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const K1 = 1.5;
const B = 0.75;

// BM25 over the small, fixed price-action chunk corpus — recomputed at
// query time (fine at this scale: ~100 chunks) rather than persisted.
export function bm25Search(chunks: BookChunk[], query: string, k: number): ScoredChunk[] {
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0 || chunks.length === 0) return [];

  const docTokens = chunks.map((c) => tokenize(c.text));
  const docLengths = docTokens.map((toks) => toks.length);
  const avgDocLength = docLengths.reduce((a, b) => a + b, 0) / (docLengths.length || 1);

  const docFreq = new Map<string, number>();
  const uniqueQueryTerms = Array.from(new Set(queryTerms));
  for (const term of uniqueQueryTerms) {
    let df = 0;
    for (const toks of docTokens) {
      if (toks.includes(term)) df++;
    }
    docFreq.set(term, df);
  }

  const N = chunks.length;
  const idf = new Map<string, number>();
  for (const term of uniqueQueryTerms) {
    const df = docFreq.get(term) ?? 0;
    // Standard BM25 IDF with a floor so unseen terms don't go negative.
    const value = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    idf.set(term, Math.max(value, 0.01));
  }

  const scored: ScoredChunk[] = chunks.map((chunk, i) => {
    const toks = docTokens[i];
    const termFreq = new Map<string, number>();
    for (const t of toks) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of uniqueQueryTerms) {
      const tf = termFreq.get(term) ?? 0;
      if (tf === 0) continue;
      const numerator = tf * (K1 + 1);
      const denominator = tf + K1 * (1 - B + B * (docLengths[i] / (avgDocLength || 1)));
      score += (idf.get(term) ?? 0) * (numerator / denominator);
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

export function createBm25Retriever(chunks: BookChunk[]): Retriever {
  return { search: (query, k) => bm25Search(chunks, query, k) };
}

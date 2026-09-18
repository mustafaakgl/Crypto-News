import type { SourceRecord } from "@/lib/newsAnalysis/types";

export type ParsedNewsAnalysis = {
  keyTakeaways: string[];
  limitedSourceDetail: boolean;
  whyItMatters: string;
  analystTake: string;
  watchNext: string[];
  sourceRecordIds: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

// Accepts only a plausible shape — never trusts field types blindly.
export function parseNewsAnalysisJson(raw: string): ParsedNewsAnalysis | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  const whyItMatters = typeof obj.whyItMatters === "string" ? obj.whyItMatters : null;
  const analystTake = typeof obj.analystTake === "string" ? obj.analystTake : null;
  const limitedSourceDetail = typeof obj.limitedSourceDetail === "boolean" ? obj.limitedSourceDetail : null;
  const keyTakeaways = isStringArray(obj.keyTakeaways) ? obj.keyTakeaways : null;
  const watchNext = isStringArray(obj.watchNext) ? obj.watchNext : null;
  const sourceRecordIds = isStringArray(obj.sourceRecordIds) ? obj.sourceRecordIds : [];

  if (whyItMatters === null || analystTake === null || limitedSourceDetail === null || keyTakeaways === null || watchNext === null) {
    return null;
  }

  return { keyTakeaways, limitedSourceDetail, whyItMatters, analystTake, watchNext, sourceRecordIds };
}

// The ONLY source of truth for what a citation may reference: the exact set
// of source records that were actually sent to the model. Anything else is
// a fabrication and is dropped.
export function verifySourceRecordIds(claimed: string[], sent: SourceRecord[]): string[] {
  const knownIds = new Set(sent.map((r) => r.id));
  const seen = new Set<string>();
  const verified: string[] = [];
  for (const id of claimed) {
    if (seen.has(id) || !knownIds.has(id)) continue;
    seen.add(id);
    verified.push(id);
  }
  return verified;
}

const URL_PATTERN = /https?:\/\//i;
const DOLLAR_AMOUNT_PATTERN = /\$\s?\d/;

// The model was never given any price/market data, so any dollar figure or
// URL in its own words is necessarily fabricated, not drawn from a source.
export function containsFabricatedClaim(text: string): boolean {
  return URL_PATTERN.test(text) || DOLLAR_AMOUNT_PATTERN.test(text);
}

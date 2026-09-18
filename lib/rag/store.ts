import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { BookChunk } from "@/lib/rag/types";

// The PDF, its extracted text, and this index all live under
// data/knowledge/ — gitignored, never copied into public/, and this module
// is marked server-only so it can never end up in a client bundle.
const INDEX_PATH = path.join(process.cwd(), "data", "knowledge", "price-action", "index.json");

export const PRICE_ACTION_SOURCE_ID = "brooks-trends";

type IndexFile = { sourceId: string; sourceVersion: string; sourceTitle: string; chunks: BookChunk[] };

let cached: IndexFile | null | undefined;

// Scoped, on purpose, to exactly one source (Price Action / Brooks) — there
// is no parameter here for a caller to widen the scope to other sources.
export function loadPriceActionChunks(): BookChunk[] {
  if (cached !== undefined) return cached?.chunks ?? [];
  try {
    const raw = fs.readFileSync(INDEX_PATH, "utf-8");
    const parsed = JSON.parse(raw) as IndexFile;
    if (parsed.sourceId !== PRICE_ACTION_SOURCE_ID) {
      cached = null;
      return [];
    }
    cached = parsed;
    return parsed.chunks;
  } catch {
    // Index not ingested yet (e.g. a fresh checkout without running the
    // ingestion script) — retrieval degrades to "no source available",
    // never an error that takes down the rest of the app.
    cached = null;
    return [];
  }
}

export function getSourceVersion(): string | null {
  loadPriceActionChunks();
  return cached?.sourceVersion ?? null;
}

export function getSourceTitle(): string | null {
  loadPriceActionChunks();
  return cached?.sourceTitle ?? null;
}

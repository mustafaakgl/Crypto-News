export type BookChunk = {
  chunkId: string;
  sourceId: string;
  sourceVersion: string;
  sourceTitle: string;
  chapter: string;
  section: string | null;
  pdfPageStart: number;
  pdfPageEnd: number;
  printedPageStart: string;
  printedPageEnd: string;
  figureRefs: string[];
  needsVisualContext: boolean;
  text: string;
};

export type ScoredChunk = {
  chunk: BookChunk;
  score: number;
};

// A citation the server has independently verified corresponds to a chunk
// that was actually retrieved and sent to the model — never a chunkId the
// model merely claimed.
export type VerifiedReference = {
  chunkId: string;
  sourceTitle: string;
  chapter: string;
  section: string | null;
  printedPageStart: string;
  printedPageEnd: string;
};

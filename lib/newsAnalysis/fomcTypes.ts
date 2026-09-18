// Shared, plain types for FOMC meeting/document matching — kept separate
// from lib/newsAnalysis/types.ts's SourceRecord so the pure matching module
// (fomcMatching.ts) never needs to import anything server-only.
export type FomcDocumentType = "policy_statement" | "economic_projections" | "implementation_note" | "meeting_minutes";

export const FOMC_DOCUMENT_LABEL: Record<FomcDocumentType, string> = {
  policy_statement: "Policy statement",
  economic_projections: "Economic projections",
  implementation_note: "Implementation note",
  meeting_minutes: "Meeting minutes",
};

export type FomcDocumentLink = {
  type: FomcDocumentType;
  url: string; // absolute federalreserve.gov URL
  // For minutes, the Fed calendar page states a separate "Released <date>"
  // date distinct from the meeting's decision date (minutes come ~3 weeks
  // later) — null for document types released same-day as the decision.
  releasedAt: string | null; // ISO date, when known
};

export type FomcMeeting = {
  meetingId: string; // the decision date, e.g. "2026-09-16" — doubles as a stable event identity
  decisionDate: string; // ISO date (YYYY-MM-DD), derived from a document URL's own embedded date, not guessed
  documents: FomcDocumentLink[];
};

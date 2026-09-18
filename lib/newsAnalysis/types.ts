// How much of the underlying article the app actually has text for. RSS
// feeds only ever give a short excerpt today — "full_article" is reserved
// for a future ingestion path. It is NOT implemented: CoinDesk's and
// Decrypt's own Terms of Service explicitly prohibit automated/scraped
// access to article pages (see lib/newsAnalysis/README-sources.md), so this
// app never fetches full article HTML from either publisher. Never assume a
// scope beyond what was actually retrieved.
export type ContentScope = "full_article" | "publisher_excerpt" | "official_announcement" | "headline_only";

import type { FomcDocumentType } from "@/lib/newsAnalysis/fomcTypes";

// A single piece of real, retrieved source text the model is allowed to
// draw from. Everything the UI shows as a "source" traces back to one of
// these — never to free text the model invented.
export type SourceRecord = {
  id: string;
  kind: "rss_excerpt" | "official_announcement";
  label: string; // e.g. "Publisher excerpt — CoinDesk"
  text: string;
  url: string;
  // The record's own publish/update time — for an FOMC document, this is
  // when the DOCUMENT was actually released, which is NOT necessarily the
  // same instant as the meeting itself (see meetingDate below). Precision
  // varies honestly: "datetime" only when the source page stated a real
  // release time; "date" when only a calendar day is known — same-day
  // ordering is never presented as certain in that case.
  sourcePublishedAt: string; // ISO
  publishedAtPrecision?: "date" | "datetime"; // set for FOMC documents; absent elsewhere (RSS/SEC items always carry a real datetime)
  meetingDate?: string; // ISO date (YYYY-MM-DD) — the FOMC meeting's own event date, kept distinct from sourcePublishedAt (the document's release), never conflated
  fetchedAt: string; // ISO — when THIS server actually captured/prepared this text (never reused as sourcePublishedAt, and not regenerated on a cache hit)
  contentHash: string; // sha256(text).slice(0,16) — changes whenever the underlying text changes, driving cache invalidation
  documentType?: FomcDocumentType; // set only for a real FOMC document record
  tablesOmitted?: boolean; // true whenever this document had a data table stripped from its extracted text — independent of whether bodyText also has real prose; carry this into any future model input too
  isSubsequentUpdate?: boolean; // true when this document was published AFTER the article it's attached to — the article could not have known about it
};

// The subset of a SourceRecord that's safe and useful to send to the
// client for display — the client never needs to re-derive this itself.
export type PublicSourceRecord = SourceRecord;

export type GroundedItem = { text: string; sourceRecordId: string };

export type NewsAnalysisResult =
  | {
      status: "ok";
      keyTakeaways: GroundedItem[];
      limitedSourceDetail: boolean;
      whyItMatters: string;
      analystTake: string;
      watchNext: GroundedItem[];
      sourceRecords: PublicSourceRecord[];
      generatedAt: string;
      cached: boolean;
    }
  | { status: "insufficient_source"; message: string; sourceRecords: PublicSourceRecord[] }
  | { status: "llm_unavailable"; message: string; sourceRecords: PublicSourceRecord[] }
  | { status: "llm_error"; message: string; sourceRecords: PublicSourceRecord[] }
  | { status: "rate_limited"; message: string }
  | { status: "error"; message: string };

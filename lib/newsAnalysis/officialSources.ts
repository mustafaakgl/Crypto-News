import "server-only";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import type { NewsItem } from "@/lib/news";
import type { SourceRecord } from "@/lib/newsAnalysis/types";
import { FOMC_DOCUMENT_LABEL, type FomcDocumentType } from "@/lib/newsAnalysis/fomcTypes";
import { matchFomcMeeting, selectRelevantDocumentTypes, mentionsFomcEvent } from "@/lib/newsAnalysis/fomcMatching";
import { getFomcMeetings } from "@/lib/newsAnalysis/fomcCalendar";
import { fetchFomcDocument } from "@/lib/newsAnalysis/fomcDocumentFetch";
import { pickSecMatch, SEC_MENTION, type OfficialCandidate } from "@/lib/newsAnalysis/officialMatching";
import { fetchTrusted } from "@/lib/newsAnalysis/trustedFetch";

// Only these hosts are ever fetched for an official source — never a
// client-supplied URL, and never any other domain. See
// lib/newsAnalysis/README-sources.md for why these were picked (both are
// U.S. federal government sources; content is public domain under 17
// U.S.C. §105, and every feed/page used is the agency's own public channel).
const SEC_ALLOWLIST = new Set(["www.sec.gov"]);

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", cdataPropName: "#text" });

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asText).join(" ");
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return asText((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function parseRssCandidates(xml: string): OfficialCandidate[] {
  try {
    const parsed = parser.parse(xml);
    const rawItems = parsed?.rss?.channel?.item;
    const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    return items
      .map((raw) => {
        const item = raw as Record<string, unknown>;
        const title = asText(item.title).trim();
        const url = asText(item.link).trim();
        const parsedDate = new Date(asText(item.pubDate));
        return { title, url, publishedAt: isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString() };
      })
      .filter((c) => c.title && c.url && c.publishedAt);
  } catch {
    return [];
  }
}

async function getSecCandidates(): Promise<OfficialCandidate[]> {
  const result = await fetchTrusted("https://www.sec.gov/news/pressreleases.rss", SEC_ALLOWLIST);
  return result.ok ? parseRssCandidates(result.body) : [];
}

function fomcDocumentSourceRecord(
  item: NewsItem,
  documentType: FomcDocumentType,
  meetingDecisionDate: string,
  url: string,
  releasedAt: string | null,
  doc: { title: string; bodyText: string; tablesOmitted: boolean; publishedAt: string | null; contentHash: string }
): SourceRecord {
  // meetingDate (the event) is kept structurally separate from
  // sourcePublishedAt (when the DOCUMENT itself was released) — never
  // derive one from the filename and call it the other.
  let sourcePublishedAt: string;
  let publishedAtPrecision: "date" | "datetime";
  let isSubsequentUpdate: boolean;

  if (doc.publishedAt) {
    // A real release time was stated on the page (statement/projections) —
    // compare full instants, so same-day ordering is only ever claimed when
    // it's actually known.
    sourcePublishedAt = doc.publishedAt;
    publishedAtPrecision = "datetime";
    isSubsequentUpdate = new Date(doc.publishedAt).getTime() > new Date(item.publishedAt).getTime();
  } else {
    // Only a calendar day is known (implementation note, minutes, or a
    // statement page whose release-time text didn't parse) — never invent
    // an hour. A same-day document is treated as contemporaneous rather
    // than guessed at hour-level precision; only a document dated on a
    // strictly LATER calendar day (e.g. minutes released weeks later) is
    // called a subsequent update.
    const dateOnly = releasedAt ?? meetingDecisionDate;
    sourcePublishedAt = new Date(`${dateOnly}T00:00:00.000Z`).toISOString();
    publishedAtPrecision = "date";
    isSubsequentUpdate = dateOnly > item.publishedAt.slice(0, 10);
  }

  const label = `${isSubsequentUpdate ? "Subsequent official update" : "Related official document"} — ${FOMC_DOCUMENT_LABEL[documentType]} (Federal Reserve)`;

  return {
    id: `${item.id}:fomc:${documentType}:${meetingDecisionDate}`,
    kind: "official_announcement",
    label,
    text: doc.bodyText,
    url,
    sourcePublishedAt,
    publishedAtPrecision,
    meetingDate: meetingDecisionDate,
    fetchedAt: new Date().toISOString(),
    contentHash: doc.contentHash,
    documentType,
    tablesOmitted: doc.tablesOmitted,
    isSubsequentUpdate,
  };
}

async function matchFomcDocuments(item: NewsItem): Promise<SourceRecord[]> {
  const meetings = await getFomcMeetings();
  const matchResult = matchFomcMeeting(item, meetings);
  if (matchResult.status !== "matched") return [];

  const relevantTypes = new Set(selectRelevantDocumentTypes(item));
  const docsToFetch = matchResult.meeting.documents.filter((d) => relevantTypes.has(d.type));

  const records = await Promise.all(
    docsToFetch.map(async (docLink) => {
      const fetched = await fetchFomcDocument(docLink.url);
      if (!fetched) return null;
      return fomcDocumentSourceRecord(item, docLink.type, matchResult.meeting.decisionDate, docLink.url, docLink.releasedAt, fetched);
    })
  );

  return records.filter((r): r is SourceRecord => r !== null);
}

function toSecSourceRecord(item: NewsItem, candidate: OfficialCandidate): SourceRecord {
  const text = candidate.title;
  return {
    id: `${item.id}:official:sec`,
    kind: "official_announcement",
    label: "Official announcement — U.S. SEC",
    text,
    url: candidate.url,
    sourcePublishedAt: candidate.publishedAt,
    fetchedAt: new Date().toISOString(),
    contentHash: createHash("sha256").update(text).digest("hex").slice(0, 16),
  };
}

// Tries each configured official source and returns every confident match —
// for an FOMC meeting this may be more than one document (e.g. statement +
// implementation note), since they describe the same event together. Never
// throws: any fetch/parse failure for one source just means it contributes
// no records, exactly like "no suitable source found" — it never breaks
// resolution of the other sources or of the article's own RSS excerpt.
export async function matchOfficialSources(item: NewsItem): Promise<SourceRecord[]> {
  const haystack = `${item.title} ${item.descriptionFull}`;
  const records: SourceRecord[] = [];

  if (mentionsFomcEvent(haystack)) {
    try {
      records.push(...(await matchFomcDocuments(item)));
    } catch {
      // A source error here must never break resolution of the rest.
    }
  }

  if (records.length === 0 && SEC_MENTION.test(haystack)) {
    try {
      const sec = pickSecMatch(item, await getSecCandidates());
      if (sec) records.push(toSecSourceRecord(item, sec));
    } catch {
      // Same as above.
    }
  }

  return records;
}

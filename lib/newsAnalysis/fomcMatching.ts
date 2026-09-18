// Pure event-based FOMC matching, deliberately separated from the network
// fetching in fomcCalendar.ts/fomcDocumentFetch.ts (both "server-only") so
// it can be unit tested directly with a synthetic FomcMeeting[] calendar.
import type { NewsItem } from "@/lib/news";
import type { FomcDocumentType, FomcMeeting } from "@/lib/newsAnalysis/fomcTypes";

// Deliberately NOT just "does this mention Fed/Federal Reserve" — a bare
// institution mention is not, on its own, evidence the article is actually
// about an FOMC rate decision (e.g. a bill about a proposed strategic
// Bitcoin reserve that happens to mention "Federal Reserve funding routes"
// is not a rate-decision story). Matches either a real rate-action PHRASE
// on its own (covers most real headline phrasings directly: "rate
// increase", "Fed Hikes Rates", "basis points", "FOMC", "interest rate"),
// or the institution name within a few words of an action verb (covers
// looser constructions like "Fed's first hike" or "Bitcoin traders brace
// for Fed hike"). A bare institution mention with no rate-action language
// anywhere nearby never matches.
const FOMC_ACTION_PHRASE =
  /\bfomc\b|\bbasis points\b|\binterest rate\b|\brate\s+(hike|hikes|increase|increases|decision|cut|cuts)\b|\b(hikes?|raises?|raised|increased|cuts?)\s+(interest\s+)?rates?\b/i;
const INSTITUTION_WORDS = new Set(["fed", "federal"]);
const ACTION_WORDS = new Set(["hike", "hikes", "hiked", "cut", "cuts", "raise", "raises", "raised"]);
const PROXIMITY_WORDS = 4;

export function mentionsFomcEvent(text: string): boolean {
  if (FOMC_ACTION_PHRASE.test(text)) return true;
  const words = text.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  const institutionIdx: number[] = [];
  const actionIdx: number[] = [];
  words.forEach((w, i) => {
    if (INSTITUTION_WORDS.has(w)) institutionIdx.push(i);
    if (ACTION_WORDS.has(w)) actionIdx.push(i);
  });
  return institutionIdx.some((i) => actionIdx.some((j) => Math.abs(i - j) <= PROXIMITY_WORDS));
}

const MENTIONS_PROJECTIONS = /\b(projections?|dot plot|summary of economic projections|\bsep\b)\b/i;
const MENTIONS_MINUTES = /\bminutes\b/i;

const DAY_MS = 86_400_000;

// A meeting's decision date may fall up to 1 day after the news (a
// live-updates article written just ahead of the same-day statement) or up
// to 3 days before it (typical reporting lag) — outside that, it isn't the
// same event. Same window rule as officialMatching.ts's
// isWithinAnnouncementWindow — kept as a local copy rather than a shared
// import so this module has no runtime dependency on another file (a "@/"
// alias import isn't resolvable by plain `node`, which is how this module's
// tests run; see scripts/verify-news-analysis.ts).
function isWithinMeetingWindow(newsPublishedAt: string, decisionDate: string): boolean {
  const diffMs = new Date(newsPublishedAt).getTime() - new Date(`${decisionDate}T00:00:00.000Z`).getTime();
  return diffMs >= -1 * DAY_MS && diffMs <= 3 * DAY_MS;
}

export type MeetingMatchResult =
  | { status: "matched"; meeting: FomcMeeting }
  | { status: "no_match" }
  | { status: "ambiguous"; meetingIds: string[] };

// Groups by MEETING (event identity), not by individual document — so a
// meeting with both a statement and a projections release is one confident
// match with two documents, never two competing "candidates." Only refuses
// when the window genuinely spans more than one distinct meeting date.
export function matchFomcMeeting(item: NewsItem, meetings: FomcMeeting[]): MeetingMatchResult {
  const haystack = `${item.title} ${item.descriptionFull}`;
  if (!mentionsFomcEvent(haystack)) return { status: "no_match" };

  const inWindow = meetings.filter((m) => isWithinMeetingWindow(item.publishedAt, m.decisionDate));
  if (inWindow.length === 0) return { status: "no_match" };

  const distinctMeetingIds = Array.from(new Set(inWindow.map((m) => m.meetingId)));
  if (distinctMeetingIds.length > 1) {
    // More than one distinct meeting genuinely falls in the window — refuse
    // rather than picking "the nearest one."
    return { status: "ambiguous", meetingIds: distinctMeetingIds };
  }

  return { status: "matched", meeting: inWindow[0] };
}

// Which document TYPES are relevant, based on what the news itself
// describes — not every available document for the meeting is attached
// indiscriminately. Statement + implementation note are the baseline "this
// meeting's decision" pair (always co-released); projections/minutes are
// added only when the news text signals them.
export function selectRelevantDocumentTypes(item: NewsItem): FomcDocumentType[] {
  const haystack = `${item.title} ${item.descriptionFull}`;
  const types: FomcDocumentType[] = ["policy_statement", "implementation_note"];
  if (MENTIONS_PROJECTIONS.test(haystack)) types.push("economic_projections");
  if (MENTIONS_MINUTES.test(haystack)) types.push("meeting_minutes");
  return types;
}

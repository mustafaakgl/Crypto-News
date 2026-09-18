// Pure FOMC story-grouping logic — separated from the network fetching in
// lib/newsAnalysis/fomcCalendar.ts (server-only) so it can be unit tested
// directly with a synthetic FomcMeeting[] calendar. Distinct from
// lib/newsAnalysis/fomcMatching.ts's matchFomcMeeting: that function scopes
// its window tightly around the DECISION date only (right for "which
// document should the detail page attach"), whereas grouping also needs to
// recognize a meeting's MINUTES, released weeks later, as a real but
// SEPARATE phase of the same event — never the same bucket as the decision
// itself, and never confused with pre-meeting expectation coverage.
import type { NewsItem } from "@/lib/news";
import type { FomcMeeting } from "@/lib/newsAnalysis/fomcTypes";
import type { FomcGroupAssignment, StoryCategory } from "@/lib/newsGrouping/types";

// Deliberately NOT just "does this mention Fed/Federal Reserve" — a bare
// institution mention is not, on its own, grounds for grouping (e.g. a bill
// about a proposed strategic Bitcoin reserve that happens to mention
// "Federal Reserve funding routes" is not a rate-decision story). Kept as a
// local copy of lib/newsAnalysis/fomcMatching.ts's mentionsFomcEvent — a
// "@/" alias import isn't resolvable by plain `node`, which is how this
// module's tests run; see scripts/verify-news-analysis.ts.
const FOMC_ACTION_PHRASE =
  /\bfomc\b|\bbasis points\b|\binterest rate\b|\brate\s+(hike|hikes|increase|increases|decision|cut|cuts)\b|\b(hikes?|raises?|raised|increased|cuts?)\s+(interest\s+)?rates?\b/i;
const INSTITUTION_WORDS = new Set(["fed", "federal"]);
const ACTION_WORDS = new Set(["hike", "hikes", "hiked", "cut", "cuts", "raise", "raises", "raised"]);
const PROXIMITY_WORDS = 4;

function mentionsFomcEvent(text: string): boolean {
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

const MENTIONS_MINUTES = /\bminutes\b/i;

const DAY_MS = 86_400_000;
function daysBetween(aIso: string, bIso: string): number {
  return (new Date(aIso).getTime() - new Date(bIso).getTime()) / DAY_MS;
}

type Classified = { meeting: FomcMeeting; category: Exclude<StoryCategory, "generic"> };

function classify(item: NewsItem, meeting: FomcMeeting): Classified | null {
  const haystack = `${item.title} ${item.descriptionFull}`;
  const minutesDoc = meeting.documents.find((d) => d.type === "meeting_minutes");

  // Minutes phase: the article actually discusses the minutes AND falls
  // near their real (calendar-stated) release date — a meeting's minutes,
  // published weeks after the decision, are a genuinely separate
  // development, never folded into decision-day coverage.
  if (minutesDoc?.releasedAt && MENTIONS_MINUTES.test(haystack)) {
    const diff = daysBetween(item.publishedAt, `${minutesDoc.releasedAt}T00:00:00.000Z`);
    if (diff >= -1 && diff <= 3) return { meeting, category: "fomc-minutes" };
  }

  // Decision / expectation phase: within a few days of the decision date
  // itself — before it is "expectation" coverage, not the announced
  // decision, and is never presented as the same development.
  const decisionDiff = daysBetween(item.publishedAt, `${meeting.decisionDate}T00:00:00.000Z`);
  if (decisionDiff >= -1 && decisionDiff <= 3) {
    const articleDay = item.publishedAt.slice(0, 10);
    return { meeting, category: articleDay < meeting.decisionDate ? "fomc-expectation" : "fomc-decision" };
  }

  return null;
}

// Groups Fed/FOMC-related articles by verified event identity (meeting +
// phase). An article whose date genuinely falls near more than one distinct
// meeting/phase is left out of FOMC grouping entirely — real ambiguity is
// never resolved by guessing "the nearest one."
export function groupFomcArticles(items: NewsItem[], meetings: FomcMeeting[]): Map<string, FomcGroupAssignment> {
  const assignments = new Map<string, FomcGroupAssignment>();

  for (const item of items) {
    const haystack = `${item.title} ${item.descriptionFull}`;
    // A minutes-focused article ("Fed minutes show internal debate...")
    // often doesn't use rate-hike phrasing at all — accepted here as an
    // alternative entry point, but classify() below still independently
    // requires BOTH the "minutes" mention AND real date-proximity to the
    // calendar's own stated release date before actually assigning it.
    if (!mentionsFomcEvent(haystack) && !MENTIONS_MINUTES.test(haystack)) continue;

    const matches: Classified[] = [];
    for (const meeting of meetings) {
      const classified = classify(item, meeting);
      if (classified) matches.push(classified);
    }

    const distinctKeys = new Set(matches.map((m) => `${m.meeting.meetingId}:${m.category}`));
    if (distinctKeys.size !== 1) continue; // 0 = no match, >1 = ambiguous — both leave the item ungrouped by FOMC logic

    const { meeting, category } = matches[0];
    assignments.set(item.id, { groupId: `fomc:${meeting.meetingId}:${category}`, category });
  }

  return assignments;
}

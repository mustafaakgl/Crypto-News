import "server-only";
import type { NewsItem } from "@/lib/news";
import { getFomcMeetings } from "@/lib/newsAnalysis/fomcCalendar";
import { groupFomcArticles } from "@/lib/newsGrouping/fomcGrouping";
import type { FomcGroupAssignment } from "@/lib/newsGrouping/types";

// Computed once per news-list page render, from the same cached FOMC
// calendar the detail page already uses — no per-article document fetches
// (those stay specific to the detail page's on-demand "Related official
// documents"), and no LLM call. Sent to the client as a plain id->assignment
// map so story building itself can stay a pure, client-recomputable function.
export async function computeFomcGroupAssignments(items: NewsItem[]): Promise<Record<string, FomcGroupAssignment>> {
  const meetings = await getFomcMeetings();
  const assignments = groupFomcArticles(items, meetings);
  return Object.fromEntries(assignments);
}

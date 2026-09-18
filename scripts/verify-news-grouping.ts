// Manual verification script for the pure story-grouping and Fed-event-
// detection functions. Avoids lib/newsGrouping/fomcGroupingServer.ts (it
// imports "server-only", which cannot run under plain `node`) — the FOMC
// calendar fetch itself was already verified live in earlier turns; this
// script exercises the pure classification/grouping logic with a synthetic
// FomcMeeting[] calendar instead.
// Run with: node scripts/verify-news-grouping.ts
import type { NewsItem } from "../lib/news.ts";
import { mentionsFomcEvent } from "../lib/newsAnalysis/fomcMatching.ts";
import type { FomcMeeting } from "../lib/newsAnalysis/fomcTypes.ts";
import { groupFomcArticles } from "../lib/newsGrouping/fomcGrouping.ts";
import { groupGenericArticles } from "../lib/newsGrouping/genericGrouping.ts";
import { buildStories } from "../lib/newsGrouping/buildStories.ts";
import type { FomcGroupAssignment } from "../lib/newsGrouping/types.ts";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function makeItem(overrides: Partial<NewsItem>): NewsItem {
  return {
    id: "coindesk:https://example.com/a",
    title: "Some headline",
    summary: "",
    descriptionFull: "",
    url: "https://example.com/a",
    sourceName: "CoinDesk",
    author: null,
    publishedAt: new Date().toISOString(),
    imageUrl: null,
    imageRightsVerified: false,
    assets: [],
    ...overrides,
  };
}

// ---- mentionsFomcEvent — the real bug found via live testing ----
{
  assertTrue(
    !mentionsFomcEvent(
      "House Committee Advances US Bitcoin Reserve Bill on Party-Line Split A substitute text adopted before the vote strips out the Federal Reserve funding routes and thins the transparency rules."
    ),
    "mentionsFomcEvent: a bare 'Federal Reserve' institution mention with no rate-action language nearby is NOT an FOMC event (real false positive found live, now fixed)"
  );
  assertTrue(mentionsFomcEvent("Crypto rallies through the Fed's first rate increase since 2023"), "mentionsFomcEvent: 'rate increase' phrase matches directly");
  assertTrue(mentionsFomcEvent("Fed raises rates by 25 basis points in first hike since July 2023"), "mentionsFomcEvent: 'basis points' / 'raises rates' phrase matches");
  assertTrue(mentionsFomcEvent("Fed Hikes Rates for the First Time Since 2023"), "mentionsFomcEvent: reversed-order 'Hikes Rates' phrase matches");
  assertTrue(mentionsFomcEvent("Bitcoin traders brace for Fed hike, but a surprise hold could pose bigger risk"), "mentionsFomcEvent: 'Fed hike' (institution adjacent to action word) matches");
  assertTrue(mentionsFomcEvent("Zcash jumps 23% as bitcoin and major tokens rise despite Fed's first hike since 2023"), "mentionsFomcEvent: 'Fed's first hike' (institution near action word, loose proximity) matches");
  assertTrue(mentionsFomcEvent("Fed Chair Implies Trump Is Only Half Right on the Economy Following Rate Hike"), "mentionsFomcEvent: 'Rate Hike' at the end of a long title still matches via the phrase check");
  assertTrue(!mentionsFomcEvent("Ripple adds XRP payments to Stripe and Tempo's AI standard in new developer kit"), "mentionsFomcEvent: an unrelated article never matches");
}

// ---- groupFomcArticles ----
{
  const meeting: FomcMeeting = {
    meetingId: "2026-09-16",
    decisionDate: "2026-09-16",
    documents: [
      { type: "policy_statement", url: "https://www.federalreserve.gov/a.htm", releasedAt: null },
      { type: "economic_projections", url: "https://www.federalreserve.gov/b.htm", releasedAt: null },
      { type: "meeting_minutes", url: "https://www.federalreserve.gov/c.htm", releasedAt: "2026-10-08" },
    ],
  };

  const preMeeting = makeItem({ id: "a", title: "Wall Street bets on Fed rate hike", publishedAt: "2026-09-15T21:46:00.000Z" });
  const decisionDay = makeItem({ id: "b", title: "Fed raises rates by 25 basis points", publishedAt: "2026-09-16T18:15:00.000Z" });
  const decisionDayFollowup = makeItem({ id: "c", title: "Crypto rallies through the Fed's first rate increase", publishedAt: "2026-09-17T12:40:00.000Z" });
  const minutesDay = makeItem({ id: "d", title: "Fed minutes show internal debate over rate path", publishedAt: "2026-10-08T20:00:00.000Z" });
  const unrelated = makeItem({ id: "e", title: "Meta may have found a fix for its glasses", publishedAt: "2026-09-16T12:00:00.000Z" });

  const assignments = groupFomcArticles([preMeeting, decisionDay, decisionDayFollowup, minutesDay, unrelated], [meeting]);

  assertEqual(assignments.get("a"), { groupId: "fomc:2026-09-16:fomc-expectation", category: "fomc-expectation" }, "groupFomcArticles: pre-meeting article -> expectation phase, distinct group");
  assertEqual(assignments.get("b"), { groupId: "fomc:2026-09-16:fomc-decision", category: "fomc-decision" }, "groupFomcArticles: decision-day article -> decision phase");
  assertEqual(assignments.get("c"), { groupId: "fomc:2026-09-16:fomc-decision", category: "fomc-decision" }, "groupFomcArticles: decision-day+1 article -> SAME decision-phase group as (b)");
  assertEqual(assignments.get("d"), { groupId: "fomc:2026-09-16:fomc-minutes", category: "fomc-minutes" }, "groupFomcArticles: minutes released weeks later -> separate minutes-phase group, not decision");
  assertTrue(!assignments.has("e"), "groupFomcArticles: an unrelated article never gets an FOMC assignment");

  // Two distinct meetings' decision windows both covering one article's date -> ambiguous, excluded.
  const closeMeeting: FomcMeeting = { meetingId: "2026-09-15", decisionDate: "2026-09-15", documents: [{ type: "policy_statement", url: "https://www.federalreserve.gov/x.htm", releasedAt: null }] };
  const ambiguousAssignments = groupFomcArticles([decisionDay], [meeting, closeMeeting]);
  assertTrue(!ambiguousAssignments.has("b"), "groupFomcArticles: an article whose date genuinely spans two distinct meetings is left ungrouped rather than guessed");
}

// ---- groupGenericArticles ----
{
  const seed = makeItem({ id: "s1", title: "Group behind Revolut data breach demands $3 million in Monero", assets: ["XMR"], publishedAt: "2026-09-16T17:00:00.000Z" });
  const sameStory = makeItem({ id: "s2", title: "Revolut hackers demand $3M Monero ransom, threaten to sell customer data", assets: ["XMR"], publishedAt: "2026-09-17T10:00:00.000Z" });
  const sameAssetDifferentEvent = makeItem({ id: "s3", title: "Zcash Closes On $1,400 After Coinholders Vote", assets: ["ZEC"], publishedAt: "2026-09-17T12:00:00.000Z" });
  const sameAssetOnlyNoToken = makeItem({ id: "s4", title: "Monero price update for the week", assets: ["XMR"], publishedAt: "2026-09-16T18:00:00.000Z" });
  const tooFarInTime = makeItem({ id: "s5", title: "Revolut breach fallout continues weeks later", assets: ["XMR"], publishedAt: "2026-09-25T00:00:00.000Z" });

  const grouped = groupGenericArticles([seed, sameStory, sameAssetDifferentEvent, sameAssetOnlyNoToken, tooFarInTime]);
  assertEqual(grouped.get("s1"), grouped.get("s2"), "groupGenericArticles: two publishers' coverage of the same named event (shared asset + shared proper noun, close in time) group together");
  assertTrue(!grouped.has("s3"), "groupGenericArticles: same asset (ZEC vs XMR — different anyway) with a different event never groups — sanity check on an unrelated ZEC story");
  assertTrue(!grouped.has("s4"), "groupGenericArticles: same asset alone with no shared distinctive title token never groups (asset alone is not grounds)");
  assertTrue(!grouped.has("s5"), "groupGenericArticles: same asset+token but far outside the time window never groups");

  // Chain-drift guard: A~B (shared token X) and B~C (shared token Y) but A and C share nothing — C must NOT join A's group transitively.
  const a = makeItem({ id: "chain-a", title: "Circle launches Arc blockchain platform", assets: ["ETH"], publishedAt: "2026-09-17T10:00:00.000Z" });
  const b = makeItem({ id: "chain-b", title: "Arc blockchain and Coinbase Base compared", assets: ["ETH"], publishedAt: "2026-09-17T11:00:00.000Z" });
  const c = makeItem({ id: "chain-c", title: "Coinbase Base sees record volume", assets: ["ETH"], publishedAt: "2026-09-17T12:00:00.000Z" });
  const chainGrouped = groupGenericArticles([a, b, c]);
  assertTrue(chainGrouped.get("chain-a") === chainGrouped.get("chain-b"), "groupGenericArticles: A and B (share 'Arc') group together");
  assertTrue(!chainGrouped.has("chain-c") || chainGrouped.get("chain-a") !== chainGrouped.get("chain-c"), "groupGenericArticles: C never transitively joins A's group just because C matched B ('Coinbase'/'Base') — no chain drift");
}

// ---- buildStories ----
{
  const fomcMeeting: FomcMeeting = { meetingId: "2026-09-16", decisionDate: "2026-09-16", documents: [{ type: "policy_statement", url: "https://www.federalreserve.gov/a.htm", releasedAt: null }] };
  const fomcItem1 = makeItem({ id: "f1", title: "Fed raises rates by 25 basis points", publishedAt: "2026-09-16T18:00:00.000Z" });
  const fomcItem2 = makeItem({ id: "f2", title: "Crypto rallies through the Fed's rate increase", publishedAt: "2026-09-16T20:00:00.000Z" });
  const lone = makeItem({ id: "lone1", title: "Some unrelated headline", publishedAt: "2026-09-16T19:00:00.000Z" });

  const fomcAssignments: Record<string, FomcGroupAssignment> = Object.fromEntries(
    groupFomcArticles([fomcItem1, fomcItem2, lone], [fomcMeeting])
  );
  const stories = buildStories([fomcItem1, fomcItem2, lone], fomcAssignments, groupGenericArticles);

  const fomcStory = stories.find((s) => s.items.some((i) => i.id === "f1"));
  assertTrue(fomcStory !== undefined && fomcStory.items.length === 2, "buildStories: the two FOMC-assigned articles land in one story with both members");
  assertEqual(fomcStory?.items[0].id, "f1", "buildStories: representative (first) member is the earliest-published article");
  assertEqual(fomcStory?.category, "fomc-decision", "buildStories: story category carries through from the FOMC assignment");

  const loneStory = stories.find((s) => s.items.some((i) => i.id === "lone1"));
  assertTrue(loneStory !== undefined && loneStory.items.length === 1, "buildStories: an article with no group assignment becomes its own single-member story");

  assertEqual(
    stories.reduce((sum, s) => sum + s.items.length, 0),
    3,
    "buildStories: every input article appears exactly once across all stories — none dropped, none duplicated"
  );
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

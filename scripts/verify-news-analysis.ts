// Manual verification script for the pure news-analysis functions (content
// scope classification, official-announcement matching, and citation
// parsing/verification). Avoids importing lib/newsAnalysis/prompt.ts (it
// does a runtime import of "@/lib/time" via the "@/" path alias, which only
// Next's bundler/tsc resolve — not plain `node`, same as lib/rag/prompt.ts
// before it) and lib/newsAnalysis/{cache,sourceResolver,officialSources,analyze}.ts
// (all import "server-only", which cannot run under plain `node` either) —
// see scripts/mock-llm-server.ts for the live end-to-end path that exercises
// those instead.
// Run with: node scripts/verify-news-analysis.ts
import type { NewsItem } from "../lib/news.ts";
import { classifyContentScope, CONTENT_SCOPE_LABEL } from "../lib/newsAnalysis/contentScope.ts";
import { parseNewsAnalysisJson, verifySourceRecordIds, containsFabricatedClaim } from "../lib/newsAnalysis/citations.ts";
import { isWithinAnnouncementWindow, significantTokens, pickSecMatch, type OfficialCandidate } from "../lib/newsAnalysis/officialMatching.ts";
import { matchFomcMeeting, selectRelevantDocumentTypes } from "../lib/newsAnalysis/fomcMatching.ts";
import type { FomcMeeting } from "../lib/newsAnalysis/fomcTypes.ts";
import type { SourceRecord } from "../lib/newsAnalysis/types.ts";

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

// ---- classifyContentScope ----
{
  const empty = makeItem({ descriptionFull: "" });
  assertEqual(classifyContentScope(empty), "headline_only", "classifyContentScope: empty RSS description -> headline_only");

  const whitespace = makeItem({ descriptionFull: "   \n  " });
  assertEqual(classifyContentScope(whitespace), "headline_only", "classifyContentScope: whitespace-only description -> headline_only");

  const excerpt = makeItem({ descriptionFull: "A bill would exempt qualifying crypto fees from gain-or-loss calculations.", sourceName: "Decrypt" });
  assertEqual(classifyContentScope(excerpt), "publisher_excerpt", "classifyContentScope: real RSS text -> publisher_excerpt, never assumed full_article");

  assertEqual(CONTENT_SCOPE_LABEL.publisher_excerpt, "Publisher excerpt", "CONTENT_SCOPE_LABEL: publisher_excerpt label");
  assertEqual(CONTENT_SCOPE_LABEL.headline_only, "Headline only", "CONTENT_SCOPE_LABEL: headline_only label");
}

// ---- officialMatching: isWithinAnnouncementWindow ----
{
  const news = "2026-09-17T12:00:00.000Z";
  assertTrue(isWithinAnnouncementWindow(news, "2026-09-16T18:00:00.000Z"), "isWithinAnnouncementWindow: official ~18h before news -> in window");
  assertTrue(isWithinAnnouncementWindow(news, "2026-09-14T12:00:00.000Z"), "isWithinAnnouncementWindow: official exactly 3 days before -> in window (boundary)");
  assertTrue(!isWithinAnnouncementWindow(news, "2026-09-13T12:00:00.000Z"), "isWithinAnnouncementWindow: official 4 days before -> out of window");
  assertTrue(isWithinAnnouncementWindow(news, "2026-09-18T00:00:00.000Z"), "isWithinAnnouncementWindow: official 12h after news (same-day live coverage) -> in window");
  assertTrue(!isWithinAnnouncementWindow(news, "2026-09-19T00:00:00.000Z"), "isWithinAnnouncementWindow: official 36h after news -> out of window (news can't report the future)");
}

// ---- officialMatching: significantTokens ----
{
  assertTrue(significantTokens("Circle Launches Arc Blockchain").has("circle"), "significantTokens: captures a real proper-noun entity");
  assertTrue(!significantTokens("The SEC Says After Report").has("sec"), "significantTokens: 'SEC' itself is a stopword, never the matching token");
  assertTrue(significantTokens("The SEC Says After Report").size === 0, "significantTokens: an all-stopword title yields nothing");
}

// ---- fomcMatching: matchFomcMeeting ----
{
  const fedNews = makeItem({
    title: "Crypto rallies through the Fed's first rate increase since 2023",
    descriptionFull: "Bitcoin rose as the central bank's projections implied only one further hike.",
    publishedAt: "2026-09-17T02:00:00.000Z",
  });

  // One real meeting with BOTH a statement and a projections document — this
  // must be ONE confident match with two documents, not "two candidates".
  const septemberMeeting: FomcMeeting = {
    meetingId: "2026-09-16",
    decisionDate: "2026-09-16",
    documents: [
      { type: "policy_statement", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm", releasedAt: null },
      { type: "implementation_note", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a1.htm", releasedAt: null },
      { type: "economic_projections", url: "https://www.federalreserve.gov/monetarypolicy/fomcprojtabl20260916.htm", releasedAt: null },
    ],
  };
  const julyMeeting: FomcMeeting = {
    meetingId: "2026-07-29",
    decisionDate: "2026-07-29",
    documents: [{ type: "policy_statement", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260729a.htm", releasedAt: null }],
  };
  // Synthetic: two distinct meeting decision dates close enough together to
  // both fall inside a single article's window — this never happens on the
  // real ~6-week FOMC cadence, but exercises the ambiguity-refusal path.
  const closeButDistinctMeeting: FomcMeeting = {
    meetingId: "2026-09-15",
    decisionDate: "2026-09-15",
    documents: [{ type: "policy_statement", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260915a.htm", releasedAt: null }],
  };

  const singleMeetingMatch = matchFomcMeeting(fedNews, [septemberMeeting]);
  assertEqual(singleMeetingMatch, { status: "matched", meeting: septemberMeeting }, "matchFomcMeeting: one meeting with multiple real documents is a single confident match, not an ambiguity");

  const notFedNews = makeItem({ title: "Meta May Have Found a Fix for Its Glasses", descriptionFull: "Meta smart glasses news." });
  assertEqual(matchFomcMeeting(notFedNews, [septemberMeeting]), { status: "no_match" }, "matchFomcMeeting: an article with no Fed/rate wording never matches, even with a valid meeting available");

  const twoDistinctMeetingsMatch = matchFomcMeeting(fedNews, [septemberMeeting, closeButDistinctMeeting]);
  assertEqual(twoDistinctMeetingsMatch.status, "ambiguous", "matchFomcMeeting: two genuinely DIFFERENT meetings both in window -> ambiguous, refuses rather than picking the nearest one");

  assertEqual(matchFomcMeeting(fedNews, [septemberMeeting, julyMeeting]).status, "matched", "matchFomcMeeting: a genuinely distant second meeting (~7 weeks away) never causes false ambiguity");

  const staleMeeting: FomcMeeting = {
    meetingId: "2026-01-28",
    decisionDate: "2026-01-28",
    documents: [{ type: "policy_statement", url: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20260128a.htm", releasedAt: null }],
  };
  assertEqual(matchFomcMeeting(fedNews, [staleMeeting]), { status: "no_match" }, "matchFomcMeeting: a meeting from months earlier (wrong date) never matches");
}

// ---- fomcMatching: selectRelevantDocumentTypes ----
{
  const generalRateNews = makeItem({ title: "Fed raises rates", descriptionFull: "The Fed hiked rates today." });
  assertEqual(
    selectRelevantDocumentTypes(generalRateNews),
    ["policy_statement", "implementation_note"],
    "selectRelevantDocumentTypes: a general rate-decision article gets the baseline statement + implementation note pair"
  );

  const projectionsNews = makeItem({ title: "Fed dot plot signals one more hike", descriptionFull: "The central bank's projections point to further tightening." });
  assertEqual(
    selectRelevantDocumentTypes(projectionsNews),
    ["policy_statement", "implementation_note", "economic_projections"],
    "selectRelevantDocumentTypes: an article discussing projections/dot plot also gets economic_projections"
  );

  const minutesNews = makeItem({ title: "Fed minutes show internal debate over rate path", descriptionFull: "The minutes revealed disagreement." });
  assertEqual(
    selectRelevantDocumentTypes(minutesNews),
    ["policy_statement", "implementation_note", "meeting_minutes"],
    "selectRelevantDocumentTypes: an article about the minutes also gets meeting_minutes"
  );
}

// ---- officialMatching: pickSecMatch ----
{
  const secNews = makeItem({
    title: "SEC Grants Exemptive Relief to Acme Corp",
    descriptionFull: "The SEC issued an order.",
    publishedAt: "2026-09-16T20:00:00.000Z",
  });
  const secCandidates: OfficialCandidate[] = [
    { title: "SEC Grants Exemptive Relief From Certain Requirements to Acme Corp", url: "https://www.sec.gov/a", publishedAt: "2026-09-16T12:47:00.000Z" },
    { title: "SEC Proposes Rescission of Shareholder Proposal Rule", url: "https://www.sec.gov/b", publishedAt: "2026-09-16T10:00:00.000Z" },
  ];
  const secMatch = pickSecMatch(secNews, secCandidates);
  assertTrue(secMatch?.url === "https://www.sec.gov/a", "pickSecMatch: matches via the shared entity name (Acme Corp), not just the word SEC");

  const genericSecNews = makeItem({ title: "SEC Says Markets Are Volatile", descriptionFull: "The SEC commented on markets." });
  assertEqual(pickSecMatch(genericSecNews, secCandidates), null, "pickSecMatch: mentioning SEC alone with no shared entity token never matches");

  assertEqual(pickSecMatch(makeItem({ title: "Bitcoin price update", descriptionFull: "Bitcoin rose overnight." }), secCandidates), null, "pickSecMatch: an article that never mentions the regulator is never even considered");
}

// ---- parseNewsAnalysisJson ----
{
  const valid = parseNewsAnalysisJson(
    JSON.stringify({
      keyTakeaways: ["a", "b"],
      limitedSourceDetail: true,
      whyItMatters: "why",
      analystTake: "take",
      watchNext: ["next"],
      sourceRecordIds: ["id-1"],
    })
  );
  assertEqual(
    valid,
    { keyTakeaways: ["a", "b"], limitedSourceDetail: true, whyItMatters: "why", analystTake: "take", watchNext: ["next"], sourceRecordIds: ["id-1"] },
    "parseNewsAnalysisJson: accepts a well-formed structured response"
  );

  assertEqual(parseNewsAnalysisJson("not json"), null, "parseNewsAnalysisJson: invalid JSON -> null");
  assertEqual(
    parseNewsAnalysisJson(JSON.stringify({ keyTakeaways: ["a"], whyItMatters: "w" })),
    null,
    "parseNewsAnalysisJson: missing required fields -> null"
  );
  assertEqual(
    parseNewsAnalysisJson(JSON.stringify({ keyTakeaways: "not an array", limitedSourceDetail: false, whyItMatters: "w", analystTake: "t", watchNext: [] })),
    null,
    "parseNewsAnalysisJson: wrong field type -> null"
  );

  const missingCitations = parseNewsAnalysisJson(
    JSON.stringify({ keyTakeaways: ["a"], limitedSourceDetail: false, whyItMatters: "w", analystTake: "t", watchNext: [] })
  );
  assertEqual(missingCitations?.sourceRecordIds, [], "parseNewsAnalysisJson: missing sourceRecordIds defaults to []");
}

// ---- verifySourceRecordIds ----
{
  const sent: SourceRecord[] = [
    {
      id: "a:rss-excerpt",
      kind: "rss_excerpt",
      label: "Publisher excerpt — CoinDesk",
      text: "t",
      url: "https://example.com",
      sourcePublishedAt: new Date().toISOString(),
      fetchedAt: new Date().toISOString(),
      contentHash: "abc123",
    },
  ];
  assertEqual(verifySourceRecordIds(["a:rss-excerpt"], sent), ["a:rss-excerpt"], "verifySourceRecordIds: accepts an id that was actually sent");
  assertEqual(verifySourceRecordIds(["fabricated-id"], sent), [], "verifySourceRecordIds: drops a fabricated/unsent id instead of trusting it");
  assertEqual(
    verifySourceRecordIds(["brooks-trends:ch17:0088"], sent),
    [],
    "verifySourceRecordIds: an id from an unrelated source (e.g. the Price Action book index) is rejected — no cross-scope leakage"
  );
  assertEqual(verifySourceRecordIds(["a:rss-excerpt", "a:rss-excerpt"], sent), ["a:rss-excerpt"], "verifySourceRecordIds: deduplicates repeated ids");
}

// ---- containsFabricatedClaim ----
{
  assertTrue(containsFabricatedClaim("Read more at https://example.com"), "containsFabricatedClaim: detects an invented URL");
  assertTrue(containsFabricatedClaim("This could push BTC toward $120,000"), "containsFabricatedClaim: detects an invented dollar price target");
  assertTrue(!containsFabricatedClaim("The filing could affect institutional demand over the coming months."), "containsFabricatedClaim: ordinary conditional analysis text passes");
  assertTrue(!containsFabricatedClaim("A 30% tax exemption was proposed in the bill."), "containsFabricatedClaim: a plain percentage (no $ sign) is not flagged");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

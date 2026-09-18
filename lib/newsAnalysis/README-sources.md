# Source access notes

Recorded from actually fetching each source's robots.txt / Terms of Service
directly (not assumed). Re-check before relying on this if a source's terms
change.

## CoinDesk (RSS: `https://www.coindesk.com/arc/outboundfeeds/rss/`)

- **Fields actually present in the feed**: `title`, `link`, `description`
  (short excerpt), `pubDate`, `dc:creator` (author, often multiple),
  `media:content` (image), `category`. The feed declares the
  `content:encoded` namespace but every item's `<content:encoded/>` tag is
  **empty** — no full article text is delivered via RSS regardless of
  permission.
- **Usable content scope**: excerpt + metadata only (`publisher_excerpt`).
- **Terms**: [coindesk.com/terms](https://www.coindesk.com/terms) —
  "You agree that you will not use any robot, spider, scraper, or other
  automated means to access the Services for any purpose without our
  express written permission," and content may be viewed for "personal,
  informational, and non-commercial purposes only" — may not be
  "reproduce[d], republish[ed], ... distribute[d]."
- **Concrete access blocker**: `robots.txt` explicitly blocks a long list of
  named AI/automation bots — including `ClaudeBot` and `Claude-Web` by
  name — from everything except `/price/`. Combined with the ToS clause
  above, this is an explicit, unambiguous prohibition. **Full article HTML
  is never fetched from CoinDesk by this app.**

## Decrypt (RSS: `https://decrypt.co/feed`)

- **Fields actually present in the feed**: `title`, `link`, `description`
  (short excerpt), `pubDate`, `dc:creator`, `enclosure`/`media:thumbnail`
  (image), `category`. No `content:encoded` field is present at all.
- **Usable content scope**: excerpt + metadata only (`publisher_excerpt`).
- **Terms**: [decrypt.co/terms-of-service](https://decrypt.co/terms-of-service)
  — "you shall not: ... use robots, spiders, scripts, service, software or
  any manual or automatic device, tool, or process designed to data mine or
  scrape the Content, data or information from the Services ... or
  otherwise access or collect the Content, data or information from the
  Service using automated means." (The RSS/API mention elsewhere in the
  Terms concerns Decrypt's own licence to redistribute *user submissions*
  it receives — it is not a grant for third parties to scrape decrypt.co.)
- **Concrete access blocker**: the ToS clause above is an explicit
  prohibition on automated scraping. `robots.txt` itself is permissive
  (`User-agent: *` with no disallow rules), but the ToS governs actual
  permitted use regardless. **Full article HTML is never fetched from
  Decrypt by this app.**

## Official announcement sources (at most 2, unpaid)

Both are official U.S. government sources. Content authored by the U.S.
federal government is public domain under 17 U.S.C. §105, and every
feed/page used is the agency's own public channel — no ToS review was
needed for reuse, only for confirming each page exists and serves what we
expect.

- **Federal Reserve / FOMC** (calendar-and-document based, not RSS-candidate
  based — see below): calendar at
  `https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm`, with
  documents fetched from `federalreserve.gov/newsevents/pressreleases/...`
  and `federalreserve.gov/monetarypolicy/...`. Live and working; see the
  worked real example below.
- **U.S. SEC** — `https://www.sec.gov/news/pressreleases.rss` (unchanged
  from the prior pass: entity-token + date-window matching over the press-
  release RSS feed). Live and working. In practice this rarely matches
  current crypto-news headlines (most current headlines are about Fed
  policy, not SEC actions) — an expected, honest outcome of conservative
  matching, not a bug.

Only these hosts are ever fetched — `FOMC_ALLOWLIST` in
`lib/newsAnalysis/fomcCalendar.ts`/`fomcDocumentFetch.ts` and
`SEC_ALLOWLIST` in `lib/newsAnalysis/officialSources.ts`. No other
institution/company official source was evaluated or implemented.

### FOMC matching (event-based, not asset-name-based)

The Fed's own meeting-calendar page is parsed directly for each meeting's
real document links (Statement, Implementation Note, Projection Materials,
Minutes) — every document URL this app ever fetches for a "FOMC" match
comes from that page, which is what makes a match calendar-verified by
construction (there is no other code path that produces a Fed document
URL). Matching groups candidates by MEETING (decision date), not by
individual document, so a meeting with both a statement and a projections
release is one confident match with two source records, not two competing
candidates — refusal only fires when the article's date window genuinely
spans two DIFFERENT meetings.

Document *content* is fetched from the calendar's own linked HTML pages
(not just the RSS title) and cleanly extracted; any `<table>` found in a
document is stripped before converting to plain text — never flattened
into (potentially unit/header-losing) text. The Economic Projections page
is almost entirely data tables; its surrounding narrative/methodology
prose is still extracted, but the numeric tables themselves are always
omitted, never guessed at.

Worked real example (verified live, not archived) — CoinDesk's "Crypto
rallies through the Fed's first rate increase since 2023" (published 2026-
09-17T10:40Z) matched the September 15–16, 2026 meeting and attached its
real Policy Statement and Implementation Note text (the RSS excerpt also
mentioned "projections", which additionally pulled in the real Economic
Projections document). A second real example — Decrypt's "Wall Street Bets
on Fed Rate Hike..." (published 2026-09-15T21:46Z, the day *before* the
decision) — correctly attaches the same statement/implementation-note
documents but labels them "Subsequent official update — published after
this article," since they didn't exist yet when that article was written.

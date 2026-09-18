import "server-only";
import type { FomcDocumentLink, FomcMeeting } from "@/lib/newsAnalysis/fomcTypes";
import { fetchTrusted } from "@/lib/newsAnalysis/trustedFetch";
import { TtlCache } from "@/lib/rag/cache";

const FED_HOST = "www.federalreserve.gov";
const FOMC_ALLOWLIST = new Set([FED_HOST]);
const CALENDAR_URL = `https://${FED_HOST}/monetarypolicy/fomccalendars.htm`;

function absolute(href: string): string {
  return new URL(href, `https://${FED_HOST}/`).toString();
}

// A document URL always embeds its date as YYYYMMDD, e.g.
// ".../monetary20260916a.htm" — this is Fed's own authoritative labeling of
// the decision date, far more reliable than parsing the calendar's loose
// "September 15-16" text.
function extractYmd(url: string): string | null {
  const m = url.match(/(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const iso = `${y}-${mo}-${d}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

function extractMeetingBlockField(block: string, pattern: RegExp): RegExpMatchArray | null {
  return block.match(pattern);
}

// Parses the Fed's own current FOMC meeting-calendar page into structured
// per-meeting document links. Every document URL this app ever fetches for
// a "FOMC" match comes from THIS parse — there is no other path to obtain
// one, which is what makes every match calendar-verified by construction.
function parseMeetings(html: string): FomcMeeting[] {
  const meetings: FomcMeeting[] = [];

  // Split into per-meeting HTML chunks. Both the shaded and unshaded row
  // variants contain the literal substring "row fomc-meeting" in their
  // class attribute — sufficient to find each block's start.
  const blockStartPattern = /<div class="[^"]*row fomc-meeting[^"]*"/g;
  const starts: number[] = [];
  for (const m of html.matchAll(blockStartPattern)) {
    if (m.index !== undefined) starts.push(m.index);
  }

  for (let i = 0; i < starts.length; i++) {
    const block = html.slice(starts[i], starts[i + 1] ?? starts[i] + 4000);

    const statementMatch = extractMeetingBlockField(
      block,
      /<strong>Statement:<\/strong><br>\s*<a href="([^"]+\.pdf)">PDF<\/a>\s*\|\s*<a href="([^"]+\.htm)">HTML<\/a>/
    );
    const implNoteMatch = extractMeetingBlockField(block, /<a href="([^"]+)">Implementation Note<\/a>/);
    const projectionsMatch = extractMeetingBlockField(
      block,
      /<strong>Projection Materials<\/strong><br>\s*<a href="([^"]+\.pdf)">PDF<\/a>\s*\|\s*<a href="([^"]+\.htm)">HTML<\/a>/
    );
    const minutesMatch = extractMeetingBlockField(
      block,
      /<strong>Minutes:<\/strong><br>\s*<a href="([^"]+\.pdf)">PDF<\/a>\s*\|\s*<a href="([^"]+\.htm)">HTML<\/a>\s*<br>\s*\(Released ([^)]+)\)/
    );

    const documents: FomcDocumentLink[] = [];
    let decisionDate: string | null = null;

    if (statementMatch) {
      const url = absolute(statementMatch[2]);
      const ymd = extractYmd(url);
      if (ymd) {
        decisionDate = decisionDate ?? ymd;
        documents.push({ type: "policy_statement", url, releasedAt: null });
      }
    }
    if (implNoteMatch) {
      const url = absolute(implNoteMatch[1]);
      const ymd = extractYmd(url);
      if (ymd) {
        decisionDate = decisionDate ?? ymd;
        documents.push({ type: "implementation_note", url, releasedAt: null });
      }
    }
    if (projectionsMatch) {
      const url = absolute(projectionsMatch[2]);
      const ymd = extractYmd(url);
      if (ymd) {
        decisionDate = decisionDate ?? ymd;
        documents.push({ type: "economic_projections", url, releasedAt: null });
      }
    }
    if (minutesMatch) {
      const url = absolute(minutesMatch[2]);
      const releasedDate = new Date(minutesMatch[3]);
      documents.push({
        type: "meeting_minutes",
        url,
        releasedAt: isNaN(releasedDate.getTime()) ? null : releasedDate.toISOString().slice(0, 10),
      });
    }

    // A future scheduled meeting with no documents published yet has
    // nothing to match to — correctly excluded rather than represented
    // with a guessed date.
    if (!decisionDate || documents.length === 0) continue;

    meetings.push({ meetingId: decisionDate, decisionDate, documents });
  }

  return meetings;
}

const calendarCache = new TtlCache<FomcMeeting[]>();

export async function getFomcMeetings(): Promise<FomcMeeting[]> {
  return calendarCache.getOrCompute(
    "fomc-calendar",
    async () => {
      const result = await fetchTrusted(CALENDAR_URL, FOMC_ALLOWLIST);
      if (!result.ok) return [];
      try {
        return parseMeetings(result.body);
      } catch {
        return [];
      }
    },
    (meetings) => meetings.length > 0
  );
}

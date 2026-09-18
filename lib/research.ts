import { XMLParser } from "fast-xml-parser";

export type ResearchItem = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  author: string | null;
  publishedAt: string; // ISO
};

export type ResearchResult = {
  items: ResearchItem[];
  sourceErrors: { sourceName: string; error: string }[];
};

type FeedConfig = { id: string; sourceName: string; url: string };

const FEEDS: FeedConfig[] = [
  { id: "glassnode", sourceName: "Glassnode Research", url: "https://research.glassnode.com/rss/" },
  { id: "coinmetrics", sourceName: "Coin Metrics", url: "https://coinmetrics.substack.com/feed" },
];

const REVALIDATE_SECONDS = 900;
const MAX_ITEMS = 3;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#text",
});

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asText).join(" ");
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return asText((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchFeed(feed: FeedConfig): Promise<ResearchItem[]> {
  const res = await fetch(feed.url, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { "User-Agent": "kripto-brifing/0.1 (+research panel)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const xml = await res.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const title = stripHtml(asText(item.title));
    const link = asText(item.link).trim();
    const author = stripHtml(asText(item["dc:creator"]));
    const pubDateRaw = asText(item.pubDate);
    const parsedDate = new Date(pubDateRaw);
    const publishedAt = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    return {
      id: link ? `${feed.id}:${link}` : `${feed.id}:${index}:${title}`,
      title,
      url: link,
      sourceName: feed.sourceName,
      author: author || null,
      publishedAt,
    };
  });
}

export async function getResearch(): Promise<ResearchResult> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const items: ResearchItem[] = [];
  const sourceErrors: { sourceName: string; error: string }[] = [];

  results.forEach((result, index) => {
    const feed = FEEDS[index];
    if (result.status === "fulfilled") {
      items.push(...result.value);
    } else {
      sourceErrors.push({
        sourceName: feed.sourceName,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return { items: items.slice(0, MAX_ITEMS), sourceErrors };
}

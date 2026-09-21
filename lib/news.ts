import { XMLParser } from "fast-xml-parser";
import { detectAssets } from "@/lib/assets";

export type NewsItem = {
  id: string;
  title: string;
  summary: string; // the publisher's full excerpt (usually one or two sentences), shown on cards
  descriptionFull: string; // untruncated RSS description, for the detail view
  url: string;
  sourceName: string;
  author: string | null; // from the feed's own dc:creator field(s), when present
  publishedAt: string; // ISO
  imageUrl: string | null;
  // An image in an RSS feed is not, by itself, a licence to republish it. The
  // site owner chose (2026-09-21) to show publishers' own images anyway,
  // loaded straight from the publisher's server with the source named and
  // linked — never copied or re-hosted here — and accepts the takedown risk.
  showPublisherImage: boolean;
  category: string | null; // the publisher's own section, e.g. "Markets"
  assets: string[]; // detected related tickers, e.g. ["BTC"]
};

export type NewsResult = {
  items: NewsItem[];
  sourceErrors: { sourceName: string; error: string }[];
  fetchedAt: string; // ISO — when this server actually ran the feed fetches
};

type FeedConfig = {
  id: string;
  sourceName: string;
  url: string;
  showPublisherImages: boolean;
};

const FEEDS: FeedConfig[] = [
  {
    id: "coindesk",
    sourceName: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    showPublisherImages: true,
  },
  {
    id: "decrypt",
    sourceName: "Decrypt",
    url: "https://decrypt.co/feed",
    showPublisherImages: true,
  },
];

const REVALIDATE_SECONDS = 300;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "#text",
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/\s+/g, " ")
    .trim();
}

function asText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(asText).join(" ");
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return asText((value as Record<string, unknown>)["#text"]);
  }
  return "";
}

function firstUrlFrom(value: unknown): string | null {
  const candidates = Array.isArray(value) ? value : value ? [value] : [];
  for (const candidate of candidates) {
    const url = (candidate as Record<string, unknown>)?.["@_url"];
    if (typeof url === "string" && url.startsWith("http")) return url;
  }
  return null;
}

// Publishers tag every item with a generic "News" too; the first specific
// section is the useful one. Decrypt also tags coins in lowercase ("zcash").
function extractCategory(item: Record<string, unknown>): string | null {
  const raw = item["category"];
  const names = (Array.isArray(raw) ? raw : raw == null ? [] : [raw]).map((v) => stripHtml(asText(v)).trim()).filter(Boolean);
  const name = names.find((n) => n.toLowerCase() !== "news");
  if (!name) return null;
  return name === name.toLowerCase() ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}

function extractAuthor(item: Record<string, unknown>): string | null {
  const raw = item["dc:creator"];
  if (raw == null) return null;
  const names = (Array.isArray(raw) ? raw : [raw]).map((v) => asText(v).trim()).filter(Boolean);
  return names.length > 0 ? Array.from(new Set(names)).join(", ") : null;
}

// Decrypt's enclosure is a resizable image-proxy URL while its media:thumbnail
// is the multi-megapixel original, so the enclosure is tried first.
function extractImage(item: Record<string, unknown>): string | null {
  return (
    (() => {
      const enclosure = item["enclosure"] as Record<string, unknown> | undefined;
      const url = enclosure?.["@_url"];
      return typeof url === "string" && url.startsWith("http") ? url : null;
    })() ??
    firstUrlFrom(item["media:content"]) ??
    firstUrlFrom(item["media:thumbnail"])
  );
}

async function fetchFeed(feed: FeedConfig): Promise<NewsItem[]> {
  const res = await fetch(feed.url, {
    next: { revalidate: REVALIDATE_SECONDS },
    headers: { "User-Agent": "kripto-brifing/0.1 (+news dashboard)" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const xml = await res.text();
  const parsed = parser.parse(xml);
  const rawItems = parsed?.rss?.channel?.item;
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return items.map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const title = stripHtml(asText(item.title));
    const link = asText(item.link).trim();
    const description = stripHtml(asText(item.description));
    const pubDateRaw = asText(item.pubDate);
    const parsedDate = new Date(pubDateRaw);
    const publishedAt = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    return {
      id: link ? `${feed.id}:${link}` : `${feed.id}:${index}:${title}`,
      title,
      summary: description,
      descriptionFull: description,
      url: link,
      sourceName: feed.sourceName,
      author: extractAuthor(item),
      publishedAt,
      imageUrl: extractImage(item),
      showPublisherImage: feed.showPublisherImages,
      category: extractCategory(item),
      assets: detectAssets(`${title} ${description}`),
    };
  });
}

export async function getNews(): Promise<NewsResult> {
  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  const items: NewsItem[] = [];
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

  const seenUrls = new Set<string>();
  const deduped = items.filter((item) => {
    if (!item.url || seenUrls.has(item.url)) return false;
    seenUrls.add(item.url);
    return true;
  });

  return { items: deduped, sourceErrors, fetchedAt: new Date().toISOString() };
}

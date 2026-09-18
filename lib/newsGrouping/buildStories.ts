// Pure — runs identically client or server, and is re-run on the CLIENT
// every time search/coin/source filters change, so story membership and
// counts always match whatever is actually in scope (never a stale,
// precomputed-on-the-full-list total). Never drops or merges the underlying
// NewsItem objects — grouping only changes how they're displayed.
//
// groupGenericArticles is passed in by the caller rather than imported
// directly (dependency injection) so this module has no runtime dependency
// on another file via a "@/" alias — that isn't resolvable by plain `node`,
// which is how this module's tests run; see scripts/verify-news-grouping.ts.
import type { NewsItem } from "@/lib/news";
import type { FomcGroupAssignment, StoryCategory } from "@/lib/newsGrouping/types";

type GenericGrouper = (items: NewsItem[]) => Map<string, string>;

export type Story = {
  id: string;
  category: StoryCategory;
  items: NewsItem[]; // chronological, oldest (the representative) first
};

function sortChrono(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
}

export function buildStories(
  filteredItems: NewsItem[],
  fomcAssignments: Record<string, FomcGroupAssignment>,
  groupGenericArticles: GenericGrouper
): Story[] {
  const fomcBuckets = new Map<string, { category: StoryCategory; items: NewsItem[] }>();
  const remaining: NewsItem[] = [];

  for (const item of filteredItems) {
    const assignment = fomcAssignments[item.id];
    if (assignment) {
      const bucket = fomcBuckets.get(assignment.groupId) ?? { category: assignment.category, items: [] };
      bucket.items.push(item);
      fomcBuckets.set(assignment.groupId, bucket);
    } else {
      remaining.push(item);
    }
  }

  const genericAssignments = groupGenericArticles(remaining);
  const genericBuckets = new Map<string, NewsItem[]>();
  const singles: NewsItem[] = [];
  for (const item of remaining) {
    const groupId = genericAssignments.get(item.id);
    if (groupId) {
      const list = genericBuckets.get(groupId) ?? [];
      list.push(item);
      genericBuckets.set(groupId, list);
    } else {
      singles.push(item);
    }
  }

  const stories: Story[] = [];
  for (const [groupId, bucket] of fomcBuckets) {
    stories.push({ id: groupId, category: bucket.category, items: sortChrono(bucket.items) });
  }
  for (const [groupId, members] of genericBuckets) {
    stories.push({ id: groupId, category: "generic", items: sortChrono(members) });
  }
  for (const item of singles) {
    stories.push({ id: `single:${item.id}`, category: "generic", items: [item] });
  }

  return stories.sort((a, b) => {
    const aLast = a.items[a.items.length - 1].publishedAt;
    const bLast = b.items[b.items.length - 1].publishedAt;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });
}

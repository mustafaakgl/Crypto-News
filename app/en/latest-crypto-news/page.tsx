import { Suspense } from "react";
import { getNews } from "@/lib/news";
import { computeFomcGroupAssignments } from "@/lib/newsGrouping/fomcGroupingServer";
import { NewsExplorer } from "@/components/NewsExplorer";
import LoadingNews from "./loading";

export const revalidate = 300;

export default async function LatestNewsPage() {
  const news = await getNews();
  // Cheap (the FOMC calendar is cached) and reuses the exact same
  // calendar-verified event data the detail page's "Related official
  // documents" already fetches — no per-article network calls, no LLM.
  const fomcAssignments = await computeFomcGroupAssignments(news.items);

  return (
    <Suspense fallback={<LoadingNews />}>
      <NewsExplorer allItems={news.items} sourceErrors={news.sourceErrors} fomcAssignments={fomcAssignments} />
    </Suspense>
  );
}

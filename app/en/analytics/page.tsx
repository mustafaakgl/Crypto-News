import { Suspense } from "react";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import LoadingAnalytics from "./loading";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingAnalytics />}>
      <AnalyticsClient />
    </Suspense>
  );
}

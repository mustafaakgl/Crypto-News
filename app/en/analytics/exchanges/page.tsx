import { Suspense } from "react";
import { ExchangeAnalyticsClient } from "@/components/exchanges/ExchangeAnalyticsClient";

export default function ExchangeAnalyticsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink/50">Loading…</div>}>
      <ExchangeAnalyticsClient />
    </Suspense>
  );
}

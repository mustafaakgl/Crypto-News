import { Suspense } from "react";
import { ExchangeAnalyticsClient } from "@/components/exchanges/ExchangeAnalyticsClient";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function ExchangeAnalyticsPageContent({ locale }: { locale: Locale }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink/50">{getDictionary(locale).common.loading}</div>}>
      <ExchangeAnalyticsClient />
    </Suspense>
  );
}

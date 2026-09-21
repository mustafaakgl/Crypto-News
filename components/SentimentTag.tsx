"use client";

import { classifySentiment } from "@/lib/newsSentiment";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function SentimentTag({ title, description, locale = "en" }: { title: string; description: string; locale?: Locale }) {
  const sentiment = classifySentiment(title, description);
  if (!sentiment) return null;
  const t = getDictionary(locale).news;
  const positive = sentiment === "positive";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${positive ? "text-emerald-700" : "text-red-700"}`} title={t.sentimentHint}>
      <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] leading-none text-white ${positive ? "bg-emerald-600" : "bg-red-600"}`} aria-hidden>
        {positive ? "▲" : "▼"}
      </span>
      {positive ? t.sentimentPositive : t.sentimentNegative}
    </span>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { NewsInteractionProvider } from "@/components/NewsInteractionContext";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsDetailDialog } from "@/components/NewsDetailDialog";
import { SavedPanel } from "@/components/SavedPanel";
import { localeFromPathname } from "@/lib/i18n/locale";

// The root layout (app/layout.tsx) renders <html> above every locale route
// segment, so it can't read `params.locale` itself — this keeps the
// `lang` attribute honest without restructuring that layout.
function HtmlLangSync() {
  const locale = localeFromPathname(usePathname());
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NewsInteractionProvider>
      <HtmlLangSync />
      <SiteHeader />
      {children}
      <NewsDetailDialog />
      <SavedPanel />
    </NewsInteractionProvider>
  );
}

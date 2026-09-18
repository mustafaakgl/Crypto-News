"use client";

import { NewsInteractionProvider } from "@/components/NewsInteractionContext";
import { SiteHeader } from "@/components/SiteHeader";
import { NewsDetailDialog } from "@/components/NewsDetailDialog";
import { SavedPanel } from "@/components/SavedPanel";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <NewsInteractionProvider>
      <SiteHeader />
      {children}
      <NewsDetailDialog />
      <SavedPanel />
    </NewsInteractionProvider>
  );
}

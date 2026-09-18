"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { NewsItem } from "@/lib/news";
import { loadSaved, toggleSaved } from "@/lib/saved";

type NewsInteractionValue = {
  detailItem: NewsItem | null;
  openDetail: (item: NewsItem) => void;
  closeDetail: () => void;
  savedItems: NewsItem[];
  isItemSaved: (id: string) => boolean;
  toggleSave: (item: NewsItem) => void;
  savedPanelOpen: boolean;
  openSavedPanel: () => void;
  closeSavedPanel: () => void;
};

const NewsInteractionContext = createContext<NewsInteractionValue | null>(null);

export function NewsInteractionProvider({ children }: { children: React.ReactNode }) {
  const [detailItem, setDetailItem] = useState<NewsItem | null>(null);
  const [savedItems, setSavedItems] = useState<NewsItem[]>([]);
  const [savedPanelOpen, setSavedPanelOpen] = useState(false);

  useEffect(() => {
    setSavedItems(loadSaved());
  }, []);

  const openDetail = useCallback((item: NewsItem) => setDetailItem(item), []);
  const closeDetail = useCallback(() => setDetailItem(null), []);

  const isItemSaved = useCallback((id: string) => savedItems.some((i) => i.id === id), [savedItems]);

  const toggleSave = useCallback((item: NewsItem) => {
    setSavedItems((prev) => toggleSaved(prev, item));
  }, []);

  const openSavedPanel = useCallback(() => setSavedPanelOpen(true), []);
  const closeSavedPanel = useCallback(() => setSavedPanelOpen(false), []);

  const value = useMemo(
    () => ({
      detailItem,
      openDetail,
      closeDetail,
      savedItems,
      isItemSaved,
      toggleSave,
      savedPanelOpen,
      openSavedPanel,
      closeSavedPanel,
    }),
    [detailItem, openDetail, closeDetail, savedItems, isItemSaved, toggleSave, savedPanelOpen, openSavedPanel, closeSavedPanel]
  );

  return <NewsInteractionContext.Provider value={value}>{children}</NewsInteractionContext.Provider>;
}

export function useNewsInteraction(): NewsInteractionValue {
  const ctx = useContext(NewsInteractionContext);
  if (!ctx) throw new Error("useNewsInteraction must be used within NewsInteractionProvider");
  return ctx;
}

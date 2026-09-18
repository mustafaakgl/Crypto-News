"use client";

import type { NewsItem } from "@/lib/news";

const STORAGE_KEY = "kripto-brifing:saved:v1";

function isNewsItem(value: unknown): value is NewsItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.title === "string" && typeof v.url === "string";
}

export function loadSaved(): NewsItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNewsItem);
  } catch {
    // Corrupted or inaccessible storage (private mode, quota, bad JSON, etc.)
    // must never crash the app — treat it as "nothing saved".
    return [];
  }
}

function persist(items: NewsItem[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function isSaved(items: NewsItem[], id: string): boolean {
  return items.some((item) => item.id === id);
}

export function toggleSaved(items: NewsItem[], item: NewsItem): NewsItem[] {
  const exists = items.some((i) => i.id === item.id);
  const next = exists ? items.filter((i) => i.id !== item.id) : [item, ...items];
  persist(next);
  return next;
}

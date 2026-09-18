"use client";

import { KNOWN_ASSET_SYMBOLS } from "@/lib/assets";

const STORAGE_KEY = "kripto-brifing:watchlist:v1";
const KNOWN_SET = new Set(KNOWN_ASSET_SYMBOLS);

export function loadWatchlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Only symbols the app's own tagging system actually supports — a
    // stored value from an older asset list, or corrupted data, is dropped
    // rather than crashing or silently matching nothing downstream.
    return Array.from(new Set(parsed.filter((v): v is string => typeof v === "string" && KNOWN_SET.has(v))));
  } catch {
    // Corrupted or inaccessible storage (private mode, quota, bad JSON,
    // etc.) must never crash the app — treat it as "nothing followed".
    return [];
  }
}

function persist(symbols: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  } catch {
    // Best-effort — a failed write just means the toggle doesn't persist
    // this session; it must never throw up into the UI.
  }
}

export function toggleWatchlist(symbols: string[], symbol: string): string[] {
  const next = symbols.includes(symbol) ? symbols.filter((s) => s !== symbol) : [...symbols, symbol];
  persist(next);
  return next;
}

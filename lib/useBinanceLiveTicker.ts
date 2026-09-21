"use client";

import { useEffect, useState } from "react";

export type LiveQuote = { price: number; changePct24h: number; eventTime: number };

const STREAM_URL = "wss://stream.binance.com:9443/stream?streams=";
const MAX_BACKOFF_MS = 30_000;
// If the connection stays down this long, drop live values so stale prices never pass as live.
const STALE_AFTER_MS = 15_000;

// Binance's public 24h mini-ticker for SYMBOLUSDT pairs, pushed about once a
// second. `o` is the price 24h ago, so the change matches a rolling 24h window.
// Returns an empty map until the first message arrives (or if Binance is
// unreachable, e.g. from a region it blocks), so callers keep their fallback.
export function useBinanceLiveTicker(symbols: string[]): Record<string, LiveQuote> {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const key = symbols.join(",");

  useEffect(() => {
    if (!key) return;
    const streams = key
      .split(",")
      .map((s) => `${s.toLowerCase()}usdt@miniTicker`)
      .join("/");
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let staleTimer: ReturnType<typeof setTimeout> | null = null;
    let backoff = 1000;
    let closed = false;

    const connect = () => {
      ws = new WebSocket(STREAM_URL + streams);
      ws.onopen = () => {
        backoff = 1000;
        if (staleTimer) clearTimeout(staleTimer);
        staleTimer = null;
      };
      ws.onmessage = (ev) => {
        try {
          const { data } = JSON.parse(ev.data as string) as { data?: { s?: string; c?: string; o?: string; E?: number } };
          if (!data?.s?.endsWith("USDT")) return;
          const price = Number(data.c);
          const open = Number(data.o);
          if (!(price > 0) || !(open > 0)) return;
          const symbol = data.s.slice(0, -4);
          setQuotes((cur) => ({ ...cur, [symbol]: { price, changePct24h: (price / open - 1) * 100, eventTime: data.E ?? Date.now() } }));
        } catch {
          // A malformed frame is skipped; the next one replaces it within a second.
        }
      };
      ws.onclose = () => {
        if (closed) return;
        if (!staleTimer) staleTimer = setTimeout(() => setQuotes({}), STALE_AFTER_MS);
        retryTimer = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (staleTimer) clearTimeout(staleTimer);
      ws?.close();
    };
  }, [key]);

  return quotes;
}

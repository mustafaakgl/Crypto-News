import "server-only";
import { createHash } from "node:crypto";
import type { Asset, Interval } from "@/lib/klines";
import type { PriceActionResult } from "@/lib/priceAction";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Cache key spans everything that can change the answer: coin, interval, a
// hash of the actual analysis data (so a new swing/breakout invalidates it),
// the book's own version, the model, and the prompt version — so a prompt
// or model change never silently serves a stale explanation.
export function buildExplainCacheKey(params: {
  asset: Asset;
  interval: Interval;
  priceAction: PriceActionResult;
  sourceVersion: string;
  model: string;
  promptVersion: string;
}): string {
  const { asset, interval, priceAction, sourceVersion, model, promptVersion } = params;
  const analysisFingerprint = JSON.stringify({
    trend: priceAction.trend,
    highs: priceAction.pivots.highs.length,
    lows: priceAction.pivots.lows.length,
    lastHigh: priceAction.lastConfirmedHigh,
    lastLow: priceAction.lastConfirmedLow,
    breakout: priceAction.breakout,
  });
  const analysisHash = createHash("sha256").update(analysisFingerprint).digest("hex").slice(0, 16);
  return [asset, interval, analysisHash, sourceVersion, model, promptVersion].join(":");
}

export type CacheEntry<T> = { value: T; expiresAt: number };

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private inFlight = new Map<string, Promise<T>>();

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs = CACHE_TTL_MS) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  // Coalesces concurrent identical requests into a single in-flight promise.
  // `shouldCache` lets the caller persist only successful outcomes (e.g. a
  // transient LLM error shouldn't be replayed from cache for a full hour —
  // concurrent duplicates still share the one in-flight attempt, though).
  async getOrCompute(key: string, compute: () => Promise<T>, shouldCache: (value: T) => boolean = () => true): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached;

    const existing = this.inFlight.get(key);
    if (existing) return existing;

    const promise = compute()
      .then((value) => {
        if (shouldCache(value)) this.set(key, value);
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }
}

export { TtlCache };

// ---- simple in-memory rate limiter (per server process) ----
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestTimestamps: number[] = [];

export function checkRateLimit(): boolean {
  const now = Date.now();
  while (requestTimestamps.length > 0 && now - requestTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  requestTimestamps.push(now);
  return true;
}

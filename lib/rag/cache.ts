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

export type CacheEntry<T> = { value: T; expiresAt: number; computedAt: number };

export type StaleAwareResult<T> = { value: T; stale: boolean; computedAt: number };

class TtlCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  // Kept separately from `store` and with its own (much longer) lifetime —
  // this is what lets `getFreshOrStale` still have something to serve after
  // the normal TTL has lapsed, without pretending that value is fresh.
  private staleStore = new Map<string, CacheEntry<T>>();
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
    const now = Date.now();
    const entry: CacheEntry<T> = { value, expiresAt: now + ttlMs, computedAt: now };
    this.store.set(key, entry);
    this.staleStore.set(key, entry);
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

  // Serves a previously-successful (but TTL-expired) value IMMEDIATELY,
  // starting a background refresh rather than blocking the caller behind
  // it — a repeat visitor never re-pays a slow cold-load cost just because
  // the normal TTL lapsed a few minutes ago. `computedAt` on the returned
  // value is always the REAL time that data was actually fetched, so a
  // caller can honestly say "as of <time>, refreshing" instead of "as of
  // now". A value older than `staleTtlMs` is discarded — never served
  // indefinitely — and a genuinely first-ever request (nothing cached at
  // all, nothing in flight) still awaits the real computation.
  async getFreshOrStale(
    key: string,
    compute: () => Promise<T>,
    opts: { shouldCache?: (value: T) => boolean; ttlMs?: number; staleTtlMs?: number } = {}
  ): Promise<StaleAwareResult<T>> {
    const shouldCache = opts.shouldCache ?? (() => true);
    const ttlMs = opts.ttlMs ?? CACHE_TTL_MS;
    const staleTtlMs = opts.staleTtlMs ?? ttlMs * 6;

    const fresh = this.get(key);
    if (fresh !== null) {
      const entry = this.staleStore.get(key)!;
      return { value: fresh, stale: false, computedAt: entry.computedAt };
    }

    const runCompute = (): Promise<T> => {
      const promise = compute()
        .then((value) => {
          if (shouldCache(value)) this.set(key, value, ttlMs);
          return value;
        })
        .finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, promise);
      return promise;
    };

    const staleEntry = this.staleStore.get(key);
    const staleUsable = staleEntry !== undefined && Date.now() - staleEntry.computedAt < staleTtlMs;

    if (staleUsable) {
      if (!this.inFlight.has(key)) {
        // Fire-and-forget: `.catch` here only prevents an unhandled-rejection
        // warning for THIS un-awaited call site — it derives a separate
        // promise, so the original one stored in `inFlight` (which a
        // concurrent cold caller might still be awaiting) is unaffected.
        runCompute().catch(() => {});
      }
      return { value: staleEntry.value, stale: true, computedAt: staleEntry.computedAt };
    }

    const value = await (this.inFlight.get(key) ?? runCompute());
    return { value, stale: false, computedAt: Date.now() };
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

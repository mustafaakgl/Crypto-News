import "server-only";

// Shared fetch helper for this app's fixed, trusted external API bases
// (CoinGecko, DefiLlama — never a client-supplied URL): timeout, explicit
// rate-limit/HTTP-error classification, never throws.
const TIMEOUT_MS = 8000;

export type FetchOutcome = { ok: true; data: unknown } | { ok: false; error: string };

export type PacedOptions = {
  // A shared budget key (e.g. "coingecko") — every caller across every
  // feature that passes the SAME key is paced against the SAME clock, so
  // the limit reflects this server process's total request budget to that
  // provider, not just one feature's own loop. A fixed per-loop delay
  // cannot see calls another feature is making concurrently; this can.
  key: string;
  minIntervalMs: number;
};

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Module-level (per server process) — intentionally not per-request, so
// concurrent requests from different visitors are paced against each other.
const lastCallAt = new Map<string, number>();

async function pace(key: string, minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const last = lastCallAt.get(key) ?? 0;
  const wait = Math.max(0, last + minIntervalMs - now);
  lastCallAt.set(key, now + wait); // reserve the slot immediately, before awaiting, so concurrent callers don't race onto the same slot
  if (wait > 0) await delay(wait);
}

// When the provider itself says "back off N seconds" (Retry-After on a real
// 429), every OTHER caller sharing this budget key backs off too — not just
// the one that got the 429 — since the limit that was hit is shared.
function pushBackShared(key: string, extraMs: number): void {
  const now = Date.now();
  const current = lastCallAt.get(key) ?? now;
  lastCallAt.set(key, Math.max(current, now) + extraMs);
}

const MAX_RETRY_AFTER_WAIT_MS = 15_000;

async function attemptFetch(url: string, label: string, revalidateSeconds: number): Promise<{ res: Response } | { outcome: FetchOutcome }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    return { res };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { outcome: { ok: false, error: `${label}: request timed out.` } };
    }
    return { outcome: { ok: false, error: `${label}: ${err instanceof Error ? err.message : "network error."}` } };
  } finally {
    clearTimeout(timer);
  }
}

// `paced`, when given, both spaces this call out against a shared
// cross-feature budget AND — on a real 429 that carries a Retry-After
// header — waits that long (bounded) and retries exactly once. Without a
// Retry-After header, or on a second 429, this returns the rate-limit error
// immediately rather than retrying blindly.
export async function fetchJson(url: string, label: string, revalidateSeconds: number, paced?: PacedOptions): Promise<FetchOutcome> {
  if (paced) await pace(paced.key, paced.minIntervalMs);

  let attempt = await attemptFetch(url, label, revalidateSeconds);
  if ("outcome" in attempt) return attempt.outcome;

  if (attempt.res.status === 429) {
    const retryAfterHeader = attempt.res.headers.get("retry-after");
    const retryAfterSec = retryAfterHeader !== null ? Number(retryAfterHeader) : NaN;
    if (paced && isFinite(retryAfterSec) && retryAfterSec > 0) {
      const waitMs = Math.min(retryAfterSec * 1000, MAX_RETRY_AFTER_WAIT_MS);
      pushBackShared(paced.key, waitMs);
      await delay(waitMs);
      attempt = await attemptFetch(url, label, revalidateSeconds);
      if ("outcome" in attempt) return attempt.outcome;
      if (attempt.res.status === 429) {
        return { ok: false, error: `${label}: rate limit reached (retried once after Retry-After=${retryAfterSec}s, still limited).` };
      }
      // falls through to normal status handling below
    } else {
      return { ok: false, error: `${label}: rate limit reached.` };
    }
  }

  if (attempt.res.status === 402) return { ok: false, error: `${label}: requires a paid plan (HTTP 402) — not accessed.` };
  if (!attempt.res.ok) return { ok: false, error: `${label}: HTTP ${attempt.res.status}.` };
  try {
    const data = await attempt.res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: `${label}: invalid JSON response.` };
  }
}

// CoinGecko's anonymous public API allows only 5-15 requests/minute
// (confirmed at https://support.coingecko.com, no key, no paid plan
// started). This budget key is shared by EVERY feature that calls
// CoinGecko (Prices, Exchange Analytics venue history, ticker breakdowns)
// so the pacing reflects the app's real total call volume to this
// provider — a fixed delay local to one loop cannot see requests another
// feature is making at the same time.
export const COINGECKO_PACE_KEY = "coingecko";
export const COINGECKO_MIN_INTERVAL_MS = 4500;

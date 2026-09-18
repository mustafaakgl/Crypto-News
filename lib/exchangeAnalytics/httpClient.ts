import "server-only";

// Shared fetch helper for the two fixed, trusted API bases this feature
// uses (CoinGecko's public API, DefiLlama's free API) — never a
// client-supplied URL. Mirrors lib/derivatives.ts's fetchJson pattern:
// timeout, explicit rate-limit/HTTP-error classification, never throws.
const TIMEOUT_MS = 8000;

export type FetchOutcome = { ok: true; data: unknown } | { ok: false; error: string };

export async function fetchJson(url: string, label: string, revalidateSeconds: number): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
      headers: { Accept: "application/json" },
    });
    if (res.status === 429) return { ok: false, error: `${label}: rate limit reached.` };
    if (res.status === 402) return { ok: false, error: `${label}: requires a paid plan (HTTP 402) — not accessed.` };
    if (!res.ok) return { ok: false, error: `${label}: HTTP ${res.status}.` };
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: `${label}: request timed out.` };
    }
    return { ok: false, error: `${label}: ${err instanceof Error ? err.message : "network error."}` };
  } finally {
    clearTimeout(timer);
  }
}

// A short, fixed delay awaited between sequential per-venue CoinGecko calls
// — the anonymous public API allows only 5-15 requests/minute (confirmed at
// https://support.coingecko.com, no key registered, no paid plan started),
// so fetching history for several venues back-to-back without spacing them
// out reliably triggers 429s. This keeps the sequential burst under that
// budget; the aggressive server-side cache (see cexVenues.ts) means this
// cost is only ever paid once per cache window, not per page view.
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

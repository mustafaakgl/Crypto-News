import "server-only";

// Shared, hardened fetch used for every official-source network call in
// this app (Fed/SEC RSS feeds, FOMC calendar page, individual FOMC document
// pages) — never for a client-supplied URL. Validates the host BEFORE the
// initial request, and validates each redirect hop's host BEFORE following
// it (redirect: "manual", not "follow") — a request is never sent to a host
// outside the allowlist, not even transiently. Enforces one timeout across
// the whole hop chain and a response-size cap enforced by reading the
// stream directly rather than trusting a Content-Length header.
const FETCH_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_REDIRECT_HOPS = 5;

export type TrustedFetchResult = { ok: true; body: string; finalUrl: string } | { ok: false; error: string };

function isAllowed(url: string, allowlist: ReadonlySet<string>): string | null {
  try {
    const host = new URL(url).hostname;
    return allowlist.has(host) ? host : null;
  } catch {
    return null;
  }
}

export async function fetchTrusted(startUrl: string, allowlist: ReadonlySet<string>): Promise<TrustedFetchResult> {
  if (!isAllowed(startUrl, allowlist)) {
    return { ok: false, error: `host not allow-listed: ${startUrl}` };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    let currentUrl = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "kripto-brifing/0.1 (+news dashboard; official-source lookup)" },
      });

      // A manual-mode redirect response (3xx with a Location header) — resolve
      // the absolute next URL and validate ITS host before ever requesting it.
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return { ok: false, error: `redirect with no Location header from ${currentUrl}` };
        const nextUrl = new URL(location, currentUrl).toString();
        if (!isAllowed(nextUrl, allowlist)) {
          return { ok: false, error: `redirect target not allow-listed: ${nextUrl}` };
        }
        currentUrl = nextUrl;
        continue;
      }

      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };

      const reader = res.body?.getReader();
      if (!reader) {
        const body = await res.text();
        if (body.length > MAX_RESPONSE_BYTES) return { ok: false, error: "response too large" };
        return { ok: true, body, finalUrl: currentUrl };
      }
      const chunks: Uint8Array[] = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            return { ok: false, error: "response too large" };
          }
          chunks.push(value);
        }
      }
      const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
      return { ok: true, body, finalUrl: currentUrl };
    }
    return { ok: false, error: "too many redirects" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, error: "timed out" };
    return { ok: false, error: err instanceof Error ? err.message : "fetch failed" };
  } finally {
    clearTimeout(timer);
  }
}

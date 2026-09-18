// Binance USDⓈ-M perpetual futures market data — separate service and base
// URL from the spot klines client in lib/klines.ts. Per the docs:
// https://developers.binance.com/en/docs/catalog/core-trading-derivatives-trading-usd-s-m-futures/api/rest-api/market-data
import type { Asset } from "@/lib/klines";

// Futures symbols happen to match the spot symbols used in lib/klines.ts,
// but this is kept as its own map (rather than importing the value from
// klines.ts) so this module has no runtime dependency on the spot client.
const SYMBOL_BY_ASSET: Record<Asset, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
};

const FUTURES_BASE = "https://fapi.binance.com";
const TIMEOUT_MS = 8000;
const REVALIDATE_SECONDS = 300;
const OI_HISTORY_LIMIT = 100; // >72h of hourly points, with margin for gaps
const OI_CHANGE_TOLERANCE_MS = 90 * 60 * 1000; // 90 min tolerance for the "24h ago" match

// ---- pure helpers (unit-testable in isolation) ----

export function rateToPercent(rate: number): number {
  return rate * 100;
}

export type FundingRecord = { fundingTime: number; fundingRate: number };

// Selects the realized funding record with the latest fundingTime — never
// assumes array order.
export function pickLatestFunding(records: FundingRecord[]): FundingRecord | null {
  if (records.length === 0) return null;
  return records.reduce((latest, r) => (r.fundingTime > latest.fundingTime ? r : latest), records[0]);
}

export type SeriesPoint = { timestamp: number; value: number };

// Finds the series point closest to `targetTime`, but only if it's within
// `toleranceMs` — never assumes "N samples back" means "N hours back".
export function findPointNearTime(points: SeriesPoint[], targetTime: number, toleranceMs: number): SeriesPoint | null {
  let best: SeriesPoint | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(p.timestamp - targetTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  if (!best || bestDiff > toleranceMs) return null;
  return best;
}

export function computePercentChange(last: number, prior: number): number | null {
  if (prior === 0) return null;
  return (last / prior - 1) * 100;
}

const HOUR_MS = 60 * 60 * 1000;

// A short, documented grace period after the expected settlement time before
// we call it "awaiting settlement" rather than momentarily out of sync.
export const FUNDING_SETTLEMENT_TOLERANCE_MS = 5 * 60 * 1000;

// Derives the funding interval empirically from realized records, instead of
// assuming a fixed 8h for every symbol. Only trusts the result if consecutive
// gaps are consistent (within 30 min of each other) — otherwise the interval
// is genuinely unknown from this evidence alone.
export function deriveFundingIntervalHours(records: FundingRecord[]): number | null {
  if (records.length < 2) return null;
  const sorted = [...records].sort((a, b) => a.fundingTime - b.fundingTime);
  const gapsHours: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gapsHours.push((sorted[i].fundingTime - sorted[i - 1].fundingTime) / HOUR_MS);
  }
  const first = gapsHours[0];
  const consistent = gapsHours.every((h) => Math.abs(h - first) < 0.5);
  if (!consistent || first <= 0) return null;
  return Math.round(first);
}

export type FundingFreshness = "fresh" | "awaiting_settlement" | "unknown";

export type FundingFreshnessResult = {
  freshness: FundingFreshness;
  // The upcoming settlement boundary (provider's nextFundingTime, or derived
  // from lastFundingTime + intervalHours when the provider value is missing).
  expectedNextFundingTime: number | null;
  // The most recent settlement that SHOULD already be reflected in
  // lastFundingTime, given `now`. Only meaningful (and only set) when
  // freshness === "awaiting_settlement".
  missingSettlementExpectedAt: number | null;
};

// Freshness of the FUNDING EVENT itself (is a settlement overdue?) is a
// separate question from freshness of the API RESPONSE we just received
// (handled by the per-endpoint `warnings`, not this function).
//
// Critical edge case this guards against: right after a settlement, Binance's
// premiumIndex.nextFundingTime advances to the FOLLOWING period almost
// immediately — before funding-rate history has necessarily been backfilled
// with the settlement that JUST happened. Naively comparing `now` only to
// that (already-future) nextFundingTime would hide a missing payment, since
// `now` would still be comfortably before it. So when the interval is known,
// this walks nextFundingTime backwards by one interval to find the most
// recent boundary that should already be settled, and checks lastFundingTime
// against THAT — not against the next upcoming one.
export function evaluateFundingFreshness(params: {
  now: number;
  lastFundingTime: number | null;
  nextFundingTimeFromProvider: number | null;
  intervalHours: number | null;
  toleranceMs: number;
}): FundingFreshnessResult {
  const { now, lastFundingTime, nextFundingTimeFromProvider, intervalHours, toleranceMs } = params;

  if (lastFundingTime === null) {
    return { freshness: "unknown", expectedNextFundingTime: nextFundingTimeFromProvider, missingSettlementExpectedAt: null };
  }

  let nextBoundary = nextFundingTimeFromProvider;
  if (nextBoundary === null && intervalHours !== null) {
    nextBoundary = lastFundingTime + intervalHours * HOUR_MS;
  }

  if (nextBoundary === null || intervalHours === null) {
    // Without a known cadence we cannot look past the next boundary to check
    // for a hidden missing settlement — so we don't assert freshness at all.
    return { freshness: "unknown", expectedNextFundingTime: nextBoundary, missingSettlementExpectedAt: null };
  }

  // Walk the boundary backwards to the latest scheduled settlement <= now.
  let mostRecentExpected = nextBoundary;
  let guard = 0;
  while (mostRecentExpected > now && guard < 100) {
    mostRecentExpected -= intervalHours * HOUR_MS;
    guard++;
  }

  if (now > mostRecentExpected + toleranceMs && lastFundingTime < mostRecentExpected) {
    return { freshness: "awaiting_settlement", expectedNextFundingTime: nextBoundary, missingSettlementExpectedAt: mostRecentExpected };
  }

  return { freshness: "fresh", expectedNextFundingTime: nextBoundary, missingSettlementExpectedAt: null };
}

export function isRealtimeStale(time: number | null, now: number): boolean {
  if (time === null) return false;
  return now - time > 30 * 60 * 1000;
}

export function isHourlySeriesStale(time: number | null, now: number): boolean {
  if (time === null) return false;
  return now - time > 2 * HOUR_MS;
}

// ---- fetch orchestration ----

type FetchOutcome = { ok: true; data: unknown } | { ok: false; error: string };

async function fetchJson(url: string): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });
    if (res.status === 429 || res.status === 418) {
      return { ok: false, error: "Binance futures rate limit reached." };
    }
    if (res.status === 503) {
      return { ok: false, error: "Binance futures service unavailable (503)." };
    }
    if (!res.ok) {
      return { ok: false, error: `Binance futures API error (HTTP ${res.status}).` };
    }
    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "Binance futures request timed out." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Network error." };
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return isFinite(n) ? n : null;
}

export type OiHistoryPoint = { time: number; value: number };

export type DerivativesResult = {
  asset: Asset;
  symbol: string;
  source: string;
  lastFundingRatePct: number | null;
  lastFundingTime: number | null;
  nextFundingTime: number | null;
  nextFundingIsPast: boolean;
  fundingIntervalHours: number | null;
  fundingIntervalSource: "provider" | "derived" | null;
  fundingFreshness: FundingFreshness;
  expectedNextFundingTime: number | null;
  missingSettlementExpectedAt: number | null;
  markPrice: number | null;
  premiumIndexTime: number | null;
  oiQuantity: number | null;
  oiQuantityTime: number | null;
  oiNotionalUsd: number | null;
  oiNotionalTime: number | null;
  oiChangePct24h: number | null;
  oiChangeLastTime: number | null;
  oiChangePriorTime: number | null;
  oiHistory: OiHistoryPoint[];
  warnings: string[];
};

export async function fetchDerivatives(asset: Asset): Promise<DerivativesResult> {
  const symbol = SYMBOL_BY_ASSET[asset];
  const now = Date.now();
  const warnings: string[] = [];

  // Promise.all is safe here (rather than allSettled): every fetchJson()
  // call catches its own errors internally and always resolves to a
  // FetchOutcome object — none of these four promises can reject, so one
  // endpoint failing can never take the others down with it.
  const [fundingRes, premiumRes, oiRes, oiHistRes, fundingInfoRes] = await Promise.all([
    fetchJson(`${FUTURES_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=5`),
    fetchJson(`${FUTURES_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`),
    fetchJson(`${FUTURES_BASE}/fapi/v1/openInterest?symbol=${symbol}`),
    fetchJson(`${FUTURES_BASE}/futures/data/openInterestHist?symbol=${symbol}&period=1h&limit=${OI_HISTORY_LIMIT}`),
    fetchJson(`${FUTURES_BASE}/fapi/v1/fundingInfo`),
  ]);

  const result: DerivativesResult = {
    asset,
    symbol,
    source: `Binance USDⓈ-M perpetual futures — ${symbol}`,
    lastFundingRatePct: null,
    lastFundingTime: null,
    nextFundingTime: null,
    nextFundingIsPast: false,
    fundingIntervalHours: null,
    fundingIntervalSource: null,
    fundingFreshness: "unknown",
    expectedNextFundingTime: null,
    missingSettlementExpectedAt: null,
    markPrice: null,
    premiumIndexTime: null,
    oiQuantity: null,
    oiQuantityTime: null,
    oiNotionalUsd: null,
    oiNotionalTime: null,
    oiChangePct24h: null,
    oiChangeLastTime: null,
    oiChangePriorTime: null,
    oiHistory: [],
    warnings,
  };

  // Realized funding rate
  let fundingRecords: FundingRecord[] = [];
  if (fundingRes.ok && Array.isArray(fundingRes.data)) {
    fundingRecords = fundingRes.data
      .map((r: unknown) => {
        if (!r || typeof r !== "object") return null;
        const obj = r as Record<string, unknown>;
        const fundingTime = num(obj.fundingTime);
        const fundingRate = num(obj.fundingRate);
        if (fundingTime === null || fundingRate === null) return null;
        return { fundingTime, fundingRate };
      })
      .filter((r): r is FundingRecord => r !== null);

    const latest = pickLatestFunding(fundingRecords);
    if (latest) {
      result.lastFundingRatePct = rateToPercent(latest.fundingRate);
      result.lastFundingTime = latest.fundingTime;
    } else {
      warnings.push("Funding rate history returned no valid records.");
    }
  } else {
    warnings.push(`Funding rate: ${!fundingRes.ok ? fundingRes.error : "unexpected response shape"}`);
  }

  // Mark price + next funding time
  if (premiumRes.ok && premiumRes.data && typeof premiumRes.data === "object") {
    const obj = premiumRes.data as Record<string, unknown>;
    const nextFundingTime = num(obj.nextFundingTime);
    result.markPrice = num(obj.markPrice);
    result.premiumIndexTime = num(obj.time);
    if (nextFundingTime !== null) {
      result.nextFundingTime = nextFundingTime;
      result.nextFundingIsPast = nextFundingTime <= now;
    }
  } else {
    warnings.push(`Mark price / next funding time: ${!premiumRes.ok ? premiumRes.error : "unexpected response shape"}`);
  }

  // Funding interval: prefer Binance's fundingInfo listing for this symbol
  // (authoritative for non-standard intervals); fundingInfo only lists a
  // subset of symbols, so absence from it is NOT evidence of an 8h interval
  // — it just means we fall back to deriving the interval from realized
  // records instead.
  if (fundingInfoRes.ok && Array.isArray(fundingInfoRes.data)) {
    const entry = fundingInfoRes.data.find(
      (r: unknown) => r && typeof r === "object" && (r as Record<string, unknown>).symbol === symbol
    ) as Record<string, unknown> | undefined;
    const providerHours = entry ? num(entry.fundingIntervalHours) : null;
    if (providerHours !== null) {
      result.fundingIntervalHours = providerHours;
      result.fundingIntervalSource = "provider";
    }
  } else {
    warnings.push(`Funding interval schedule: ${!fundingInfoRes.ok ? fundingInfoRes.error : "unexpected response shape"}`);
  }
  if (result.fundingIntervalHours === null) {
    const derived = deriveFundingIntervalHours(fundingRecords);
    if (derived !== null) {
      result.fundingIntervalHours = derived;
      result.fundingIntervalSource = "derived";
    }
  }

  const freshness = evaluateFundingFreshness({
    now,
    lastFundingTime: result.lastFundingTime,
    nextFundingTimeFromProvider: result.nextFundingTime,
    intervalHours: result.fundingIntervalHours,
    toleranceMs: FUNDING_SETTLEMENT_TOLERANCE_MS,
  });
  result.fundingFreshness = freshness.freshness;
  result.expectedNextFundingTime = freshness.expectedNextFundingTime;
  result.missingSettlementExpectedAt = freshness.missingSettlementExpectedAt;

  // Current open interest (quantity, real-time)
  if (oiRes.ok && oiRes.data && typeof oiRes.data === "object") {
    const obj = oiRes.data as Record<string, unknown>;
    result.oiQuantity = num(obj.openInterest);
    result.oiQuantityTime = num(obj.time);
  } else {
    warnings.push(`Open interest: ${!oiRes.ok ? oiRes.error : "unexpected response shape"}`);
  }

  // Historical open interest (quantity + notional), used for the 72h chart
  // and the 24h change match.
  if (oiHistRes.ok && Array.isArray(oiHistRes.data)) {
    type HistRow = { timestamp: number; quantity: number; notional: number | null };
    const rows: HistRow[] = oiHistRes.data
      .map((r: unknown) => {
        if (!r || typeof r !== "object") return null;
        const obj = r as Record<string, unknown>;
        const timestamp = num(obj.timestamp);
        const quantity = num(obj.sumOpenInterest);
        if (timestamp === null || quantity === null) return null;
        return { timestamp, quantity, notional: num(obj.sumOpenInterestValue) };
      })
      .filter((r): r is HistRow => r !== null)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (rows.length > 0) {
      result.oiHistory = rows.slice(-72).map((r) => ({ time: r.timestamp, value: r.quantity }));

      const lastRow = rows[rows.length - 1];
      result.oiNotionalUsd = lastRow.notional;
      result.oiNotionalTime = lastRow.timestamp;

      const targetTime = lastRow.timestamp - 24 * HOUR_MS;
      const priorPoint = findPointNearTime(
        rows.map((r) => ({ timestamp: r.timestamp, value: r.quantity })),
        targetTime,
        OI_CHANGE_TOLERANCE_MS
      );
      if (priorPoint) {
        result.oiChangePct24h = computePercentChange(lastRow.quantity, priorPoint.value);
        result.oiChangeLastTime = lastRow.timestamp;
        result.oiChangePriorTime = priorPoint.timestamp;
      } else {
        warnings.push("Open interest 24h change: no historical point close enough to 24h ago.");
      }
    } else {
      warnings.push("Open interest history returned no valid records.");
    }
  } else {
    warnings.push(`Open interest history: ${!oiHistRes.ok ? oiHistRes.error : "unexpected response shape"}`);
  }

  return result;
}

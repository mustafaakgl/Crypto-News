// Daily on-chain network activity (active addresses, transaction count,
// total fees) for BTC and ETH.
//
// STATUS: no live provider is connected this turn. See
// ON_CHAIN_UNAVAILABLE_REASON below for the specific licensing research and
// obstacle. The calculation pipeline (calendar-based week-over-week change,
// completed-day filtering) is implemented and unit-tested against synthetic
// data so a real provider can be dropped in later without touching this
// logic — see the OnChainProvider contract at the bottom of this file.
import type { Asset } from "@/lib/klines";

export type DailyPoint = { date: string; value: number }; // date: YYYY-MM-DD, UTC calendar day

export function utcDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addUtcDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Drops any point that isn't strictly before `todayUtc` — the current UTC
// day is never "completed" and must never be compared or charted as if it were.
export function filterCompletedDays(points: DailyPoint[], todayUtc: string): DailyPoint[] {
  return points.filter((p) => p.date < todayUtc).sort((a, b) => a.date.localeCompare(b.date));
}

export type WeekWindow = {
  lastWeekStart: string;
  lastWeekEnd: string;
  priorWeekStart: string;
  priorWeekEnd: string;
};

export type WeekOverWeekResult = {
  changePct: number | null;
  window: WeekWindow | null;
  lastWeekAvg: number | null;
  priorWeekAvg: number | null;
};

// Compares the average of the last 7 COMPLETE calendar days to the average
// of the 7 complete calendar days before that. Both windows are built from
// real dates (never "last 7 array entries") and either missing a single day
// makes that whole window incomplete — never filled with a fabricated value.
export function computeWeekOverWeekChange(points: DailyPoint[]): WeekOverWeekResult {
  if (points.length === 0) return { changePct: null, window: null, lastWeekAvg: null, priorWeekAvg: null };

  const byDate = new Map(points.map((p) => [p.date, p.value]));
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const lastWeekEnd = sorted[sorted.length - 1].date;
  const lastWeekStart = addUtcDays(lastWeekEnd, -6);
  const priorWeekEnd = addUtcDays(lastWeekStart, -1);
  const priorWeekStart = addUtcDays(priorWeekEnd, -6);
  const window: WeekWindow = { lastWeekStart, lastWeekEnd, priorWeekStart, priorWeekEnd };

  function collectFullWeek(start: string): number[] | null {
    const values: number[] = [];
    let d = start;
    for (let i = 0; i < 7; i++) {
      const v = byDate.get(d);
      if (v === undefined) return null; // any missing day -> this window is incomplete
      values.push(v);
      d = addUtcDays(d, 1);
    }
    return values;
  }

  const lastWeekValues = collectFullWeek(lastWeekStart);
  const priorWeekValues = collectFullWeek(priorWeekStart);

  if (!lastWeekValues || !priorWeekValues) {
    return { changePct: null, window, lastWeekAvg: null, priorWeekAvg: null };
  }

  const lastWeekAvg = lastWeekValues.reduce((a, b) => a + b, 0) / 7;
  const priorWeekAvg = priorWeekValues.reduce((a, b) => a + b, 0) / 7;
  const changePct = priorWeekAvg === 0 ? null : (lastWeekAvg / priorWeekAvg - 1) * 100;

  return { changePct, window, lastWeekAvg, priorWeekAvg };
}

export type OnChainMetricKey = "activeAddresses" | "transactionCount" | "totalFeesUsd";

export type OnChainMetric = {
  key: OnChainMetricKey;
  label: string;
  unit: string;
  lastCompleted: DailyPoint | null;
  series30d: DailyPoint[];
  weekOverWeek: WeekOverWeekResult;
  available: boolean;
  unavailableReason: string | null;
};

export type OnChainResult = {
  asset: Asset;
  network: string;
  label: "Daily on-chain data";
  source: string;
  sourceUrl: string | null;
  metrics: OnChainMetric[];
  dataAsOf: string | null; // the DATA's own latest date, never the fetch/cache time
  fetchedAt: string; // ISO — when this response was generated
  available: boolean;
  unavailableReason: string | null;
};

const METRIC_DEFS: { key: OnChainMetricKey; label: string; unit: string }[] = [
  {
    key: "activeAddresses",
    label: "Active addresses",
    // Deliberately not "users" — one person can control many addresses, and
    // one address can be shared (e.g. an exchange hot wallet).
    unit: "distinct addresses active per day (not a count of people)",
  },
  { key: "transactionCount", label: "Transaction count", unit: "transactions per day" },
  { key: "totalFeesUsd", label: "Total transaction fees", unit: "USD per day" },
];

// Researched this turn: Coin Metrics was the starting candidate for BTC+ETH
// daily network activity.
//  - API access: Community API (community-api.coinmetrics.io / api.coinmetrics.io
//    community endpoints) needs no key, but is explicitly described by Coin
//    Metrics' own docs as "available to the community under the Creative
//    Commons license" (docs.coinmetrics.io -> Coin Metrics Community Data).
//  - Their public data archive (github.com/coinmetrics/data), generated from
//    that same Community API, is licensed CC BY-NC 4.0 — NonCommercial. Free
//    access is not commercial redistribution permission.
//  - Commercial use (showing the data, or charts derived from it, on a
//    public product) would need "Network Data Pro" / "Market Data Pro"
//    (paid, enterprise pricing via sales contact — no published self-serve
//    price) per docs.coinmetrics.io.
// A second candidate, blockchain.com's free Charts/Stats API (BTC-only,
// api.blockchain.info/charts, api.blockchain.info/stats), was also checked;
// its published "API Terms of Service" is written for a different, more
// restrictive wallet/data product (mentions a required Key and broad
// restrictions on redistributing "Content" to third parties) and did not
// clearly authorize public commercial display within this review.
// No paid plan was started. No source is connected — see below.
export const ON_CHAIN_UNAVAILABLE_REASON =
  "No data source with clear terms for public/commercial display was connected. Coin Metrics' free Community data is CC BY-NC 4.0 (non-commercial only) — commercial use needs a paid Network Data Pro / Market Data Pro plan. See the Methodology note on this card for details.";

export async function fetchOnChain(asset: Asset): Promise<OnChainResult> {
  return {
    asset,
    network: asset === "BTC" ? "Bitcoin" : "Ethereum (mainnet only)",
    label: "Daily on-chain data",
    source: "Not connected",
    sourceUrl: null,
    metrics: METRIC_DEFS.map((def) => ({
      key: def.key,
      label: def.label,
      unit: def.unit,
      lastCompleted: null,
      series30d: [],
      weekOverWeek: { changePct: null, window: null, lastWeekAvg: null, priorWeekAvg: null },
      available: false,
      unavailableReason: ON_CHAIN_UNAVAILABLE_REASON,
    })),
    dataAsOf: null,
    fetchedAt: new Date().toISOString(),
    available: false,
    unavailableReason: ON_CHAIN_UNAVAILABLE_REASON,
  };
}

// ---- provider contract for a future real adapter ----
//
// A real implementation plugs in here: fetch each metric's raw daily series
// from the provider (server-side, in its own module, cached with
// `next: { revalidate: 3600 }` initially — a 1h cache is independent from
// the *data's* own last-completed-day date, which must always come from the
// series itself, never from when we happened to fetch it), run it through
// filterCompletedDays() and computeWeekOverWeekChange() above, and populate
// OnChainMetric per asset. A provider failure must only affect this card —
// see fetchOnChain()'s isolation from lib/klines.ts and lib/derivatives.ts.
export type OnChainProvider = {
  name: string;
  sourceUrl: string;
  fetchDailySeries(
    asset: Asset,
    metric: OnChainMetricKey,
    days: number
  ): Promise<{ points: DailyPoint[]; error: string | null }>;
};

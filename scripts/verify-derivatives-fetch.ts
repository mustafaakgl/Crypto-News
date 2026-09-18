// Verifies the SERVER-SIDE error handling in fetchDerivatives() by mocking
// global.fetch and calling the real exported function — this exercises the
// actual server code path, unlike mocking requests in a browser (which only
// verifies the client, not lib/derivatives.ts's own error handling).
// Run with: node scripts/verify-derivatives-fetch.ts
import { fetchDerivatives } from "../lib/derivatives.ts";

let failures = 0;

function check(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

const originalFetch = global.fetch;

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as Response;
}

async function withMockFetch(impl: (url: string) => Promise<Response> | Response, fn: () => Promise<void>) {
  // @ts-expect-error — deliberately replacing global.fetch for this test only
  global.fetch = (input: RequestInfo | URL) => Promise.resolve(impl(String(input)));
  try {
    await fn();
  } finally {
    global.fetch = originalFetch;
  }
}

// Anchored to real "now" so the nextFundingTime-in-the-future assertion is
// meaningful regardless of when this script runs.
const NOW = Date.now();
const FUNDING_OK = [{ fundingTime: NOW - 3600_000, fundingRate: "0.00012300" }];
const PREMIUM_OK = { markPrice: "76000.5", nextFundingTime: NOW + 3600_000, time: NOW - 100_000 };
const OI_OK = { openInterest: "50000.5", time: NOW - 60_000 };
const OI_HIST_OK = Array.from({ length: 30 }, (_, i) => ({
  timestamp: NOW - (29 - i) * 3600_000,
  sumOpenInterest: (50000 + i * 10).toString(),
  sumOpenInterestValue: (4_000_000_000 + i * 1000).toString(),
}));
const FUNDING_INFO_OK = [
  { symbol: "BTCUSDT", fundingIntervalHours: 8 },
  { symbol: "ETHUSDT", fundingIntervalHours: 8 },
];

async function main() {
  // ---- 1. All endpoints return 429 (rate limit) ----
  await withMockFetch(
    () => jsonResponse(429, { code: -1003, msg: "Too many requests" }),
    async () => {
      const r = await fetchDerivatives("BTC");
      check(r.lastFundingRatePct === null, "429: funding rate stays null");
      check(r.oiQuantity === null, "429: open interest stays null");
      check(r.warnings.some((w) => w.includes("rate limit")), "429: warning mentions rate limit");
      check(r.warnings.length === 5, "429: all five endpoints reported a warning");
    }
  );

  // ---- 2. All endpoints return 503 ----
  await withMockFetch(
    () => jsonResponse(503, {}),
    async () => {
      const r = await fetchDerivatives("BTC");
      check(r.warnings.some((w) => w.includes("503")), "503: warning mentions 503");
      check(r.oiHistory.length === 0, "503: open interest history stays empty, not fabricated");
    }
  );

  // ---- 3. Timeout: fetch rejects the way our internal AbortController would ----
  await withMockFetch(
    () => Promise.reject(new DOMException("The operation was aborted.", "AbortError")),
    async () => {
      const r = await fetchDerivatives("ETH");
      check(r.warnings.some((w) => w.toLowerCase().includes("timed out")), "timeout: warning mentions timed out");
      check(r.lastFundingRatePct === null && r.oiQuantity === null, "timeout: no fields fabricated");
    }
  );

  // ---- 4. Empty open-interest history, everything else healthy ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, FUNDING_INFO_OK);
      if (url.includes("openInterestHist")) return jsonResponse(200, []);
      if (url.includes("fundingRate")) return jsonResponse(200, FUNDING_OK);
      if (url.includes("premiumIndex")) return jsonResponse(200, PREMIUM_OK);
      if (url.includes("openInterest")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(r.lastFundingRatePct !== null, "empty OI history: funding rate still populates (isolated failure)");
      check(r.oiQuantity !== null, "empty OI history: current OI still populates (isolated failure)");
      check(r.oiHistory.length === 0, "empty OI history: history stays empty, not fabricated");
      check(r.oiChangePct24h === null, "empty OI history: 24h change is Unavailable, not guessed");
      check(r.warnings.some((w) => w.includes("Open interest history")), "empty OI history: warning identifies which metric is limited");
    }
  );

  // ---- 5. Malformed premiumIndex (missing fields), rest healthy ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, FUNDING_INFO_OK);
      if (url.includes("openInterestHist")) return jsonResponse(200, OI_HIST_OK);
      if (url.includes("fundingRate")) return jsonResponse(200, FUNDING_OK);
      if (url.includes("premiumIndex")) return jsonResponse(200, { unexpected: "shape" });
      if (url.includes("openInterest")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(r.markPrice === null, "malformed premiumIndex: markPrice null, not fabricated");
      check(r.nextFundingTime === null, "malformed premiumIndex: nextFundingTime null, not fabricated");
      check(r.lastFundingRatePct !== null, "malformed premiumIndex: funding rate from the OTHER endpoint still works");
      check(r.oiChangePct24h !== null, "malformed premiumIndex: OI 24h change still computed from its own healthy endpoint");
    }
  );

  // ---- 6. Fully healthy: sanity-check percent conversion + 24h match end-to-end ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, FUNDING_INFO_OK);
      if (url.includes("openInterestHist")) return jsonResponse(200, OI_HIST_OK);
      if (url.includes("fundingRate")) return jsonResponse(200, FUNDING_OK);
      if (url.includes("premiumIndex")) return jsonResponse(200, PREMIUM_OK);
      if (url.includes("openInterest") && !url.includes("Hist")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(Math.abs(r.lastFundingRatePct! - 0.0123) < 1e-9, "healthy: 0.000123 fraction -> 0.0123%");
      check(r.nextFundingIsPast === false, "healthy: future nextFundingTime is not marked past");
      check(r.oiChangePct24h !== null, "healthy: 24h OI change computed from real 24h-apart samples");
      check(r.oiHistory.length > 0 && r.oiHistory.length <= 72, "healthy: history capped at 72 points");
      check(r.warnings.length === 0, "healthy: no warnings when everything succeeds");
      check(r.fundingIntervalHours === 8 && r.fundingIntervalSource === "provider", "healthy: funding interval read from provider's schedule");
      check(r.fundingFreshness === "fresh", "healthy: funding freshness is 'fresh' when a settlement isn't overdue");
    }
  );

  // ---- 7. Awaiting settlement: nextFundingTime has passed, no new record yet ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, FUNDING_INFO_OK);
      if (url.includes("openInterestHist")) return jsonResponse(200, OI_HIST_OK);
      // Last realized record is from well before the (now-past) expected next funding time.
      if (url.includes("fundingRate")) return jsonResponse(200, [{ fundingTime: NOW - 9 * 3600_000, fundingRate: "0.0001" }]);
      // Provider's own nextFundingTime is 10 minutes in the past — beyond the 5-min tolerance —
      // and no realized record has appeared since then.
      if (url.includes("premiumIndex")) return jsonResponse(200, { markPrice: "76000.5", nextFundingTime: NOW - 10 * 60_000, time: NOW - 100_000 });
      if (url.includes("openInterest")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(r.fundingFreshness === "awaiting_settlement", "awaiting settlement: detected when expected settlement is overdue past tolerance");
      check(r.lastFundingRatePct !== null, "awaiting settlement: still shows the last known (now-overdue) rate, doesn't hide it");
    }
  );

  // ---- 8. Symbol absent from fundingInfo: NOT treated as an error or as proof of a fixed interval ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, [{ symbol: "SOMEOTHERUSDT", fundingIntervalHours: 4 }]);
      if (url.includes("openInterestHist")) return jsonResponse(200, OI_HIST_OK);
      // Two realized records 8h apart let the interval be derived empirically instead.
      if (url.includes("fundingRate"))
        return jsonResponse(200, [
          { fundingTime: NOW - 16 * 3600_000, fundingRate: "0.0001" },
          { fundingTime: NOW - 8 * 3600_000, fundingRate: "0.00012" },
        ]);
      if (url.includes("premiumIndex")) return jsonResponse(200, PREMIUM_OK);
      if (url.includes("openInterest")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(!r.warnings.some((w) => w.toLowerCase().includes("funding interval")), "symbol absent from fundingInfo: not treated as an error");
      check(r.fundingIntervalHours === 8 && r.fundingIntervalSource === "derived", "symbol absent from fundingInfo: interval derived from realized records instead");
    }
  );

  // ---- 9. End-to-end regression: nextFundingTime already rolled forward, but the
  // settlement it just passed is still missing from funding-rate history ----
  await withMockFetch(
    (url) => {
      if (url.includes("fundingInfo")) return jsonResponse(200, FUNDING_INFO_OK); // 8h interval
      if (url.includes("openInterestHist")) return jsonResponse(200, OI_HIST_OK);
      // History is stuck on a record from 16.5h ago — the one from 30 min ago never arrived.
      if (url.includes("fundingRate")) return jsonResponse(200, [{ fundingTime: NOW - 16.5 * 3600_000, fundingRate: "0.0001" }]);
      // The most recent boundary was 30 min ago (well past the 5-min tolerance), but
      // premiumIndex has ALREADY advanced nextFundingTime to the FOLLOWING boundary,
      // 7.5h from now — as Binance does almost immediately after settlement.
      if (url.includes("premiumIndex")) return jsonResponse(200, { markPrice: "76000.5", nextFundingTime: NOW + 7.5 * 3600_000, time: NOW - 100_000 });
      if (url.includes("openInterest")) return jsonResponse(200, OI_OK);
      return jsonResponse(404, {});
    },
    async () => {
      const r = await fetchDerivatives("BTC");
      check(
        r.fundingFreshness === "awaiting_settlement",
        "hidden missing payment: future nextFundingTime does not mask a settlement missing from history"
      );
      check(
        r.missingSettlementExpectedAt !== null && r.missingSettlementExpectedAt < NOW,
        "hidden missing payment: identifies the missed (past) boundary, not the future nextFundingTime"
      );
    }
  );

  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main();

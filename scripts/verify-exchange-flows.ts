// Manual verification for the exchange-flows computation layer
// (lib/exchangeFlows/flowsMath.ts) — pure functions, no "server-only"
// import, runs directly under plain node.
// Run with: node scripts/verify-exchange-flows.ts
import {
  completedFlowDays,
  validateFlowDailySeries,
  netflow,
  summarizeCoverage,
  sumAvailable,
  targetCompleteDaysForFlowPeriod,
  DAY_MS,
} from "../lib/exchangeFlows/flowsMath.ts";
import type { DailyFlowPoint, ExchangeFlowRow } from "../lib/exchangeFlows/types.ts";
import { bitcoinFlowsSql, exchangeFlowsSql, tronUsdtFlowsSql } from "../lib/exchangeFlows/duneSql.ts";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function isoDate(daysFromEpoch: number): string {
  return new Date(daysFromEpoch * DAY_MS).toISOString().slice(0, 10);
}

// ---- targetCompleteDaysForFlowPeriod ----
{
  assertEqual(targetCompleteDaysForFlowPeriod("1d"), 1, "targetCompleteDaysForFlowPeriod: 1d -> 1");
  assertEqual(targetCompleteDaysForFlowPeriod("7d"), 7, "targetCompleteDaysForFlowPeriod: 7d -> 7");
  assertEqual(targetCompleteDaysForFlowPeriod("30d"), 30, "targetCompleteDaysForFlowPeriod: 30d -> 30");
  assertEqual(targetCompleteDaysForFlowPeriod("1y"), 365, "targetCompleteDaysForFlowPeriod: 1y -> 365");
}

// ---- completedFlowDays: same "don't count today's partial day" rule as Volume ----
{
  const points: DailyFlowPoint[] = Array.from({ length: 5 }, (_, i) => ({
    dateIso: isoDate(i),
    inflow: 100 + i,
    outflow: 50 + i,
    netflow: 50,
  }));
  const nowMidDay4 = 4 * DAY_MS + 8 * 60 * 60 * 1000; // 8h into day 4 (the last point) — not yet over
  const completed = completedFlowDays(points, nowMidDay4);
  assertEqual(completed.length, 4, "completedFlowDays: drops today's not-yet-elapsed day (5 raw -> 4 complete)");
  assertEqual(completed[completed.length - 1].dateIso, isoDate(3), "completedFlowDays: last kept day is the last FULLY elapsed one");

  const withLag = completedFlowDays(points, 4 * DAY_MS + 2 * 60 * 60 * 1000, 6 * 60 * 60 * 1000); // day 4 elapsed 2h ago, but provider has a 6h publication lag
  assertEqual(withLag.length, 3, "completedFlowDays: a provider's own publication lag can push completeness back further than plain midnight-UTC elapsed");
}

// ---- validateFlowDailySeries: gap / duplicate detection, mirroring the Volume fix ----
{
  const clean: DailyFlowPoint[] = Array.from({ length: 10 }, (_, i) => ({ dateIso: isoDate(i), inflow: 1, outflow: 1, netflow: 0 }));
  assertTrue(validateFlowDailySeries(clean).ok, "validateFlowDailySeries: a clean, gap-free daily series passes");
  assertTrue(!validateFlowDailySeries([]).ok, "validateFlowDailySeries: an empty series fails rather than being treated as zero-coverage-but-fine");

  const withGap = [...clean.slice(0, 4), ...clean.slice(5)]; // day 4 missing
  assertTrue(!validateFlowDailySeries(withGap).ok, "validateFlowDailySeries: a missing day is caught, not silently skipped over");

  const withDuplicate = [...clean, { ...clean[3] }];
  assertTrue(!validateFlowDailySeries(withDuplicate).ok, "validateFlowDailySeries: a duplicate date is caught, never double-counted");
}

// ---- netflow: only from a genuine inflow AND outflow pair ----
{
  assertEqual(netflow(100, 40), 60, "netflow: inflow - outflow when both are real numbers");
  assertEqual(netflow(100, null), null, "netflow: null when outflow is unavailable — never treated as 0");
  assertEqual(netflow(null, 40), null, "netflow: null when inflow is unavailable — never treated as 0");
  assertEqual(netflow(0, 0), 0, "netflow: a genuine reported zero on both sides is a real 0, not null");
}

// ---- summarizeCoverage: real support count vs the full requested selection ----
{
  const rows: ExchangeFlowRow[] = [
    { exchangeId: "a", exchangeName: "A", inflow: 1, outflow: 1, netflow: 0, inflowFromExchanges: null, outflowToExchanges: null, internalExcluded: null, coverageBasis: null, coverage: "available", updatedAt: null },
    { exchangeId: "b", exchangeName: "B", inflow: null, outflow: null, netflow: null, inflowFromExchanges: null, outflowToExchanges: null, internalExcluded: null, coverageBasis: null, coverage: "unavailable", updatedAt: null },
    { exchangeId: "c", exchangeName: "C", inflow: 2, outflow: 1, netflow: 1, inflowFromExchanges: null, outflowToExchanges: null, internalExcluded: null, coverageBasis: null, coverage: "available", updatedAt: null },
  ];
  assertEqual(summarizeCoverage(rows), { supportedCount: 2, requestedCount: 3 }, "summarizeCoverage: counts only rows actually marked available, out of the full requested selection — this is what drives 'Data available for N of M selected exchanges'");
}

// ---- sumAvailable: never lets one missing exchange zero out a partial total ----
{
  assertEqual(sumAvailable([10, null, 20]), 30, "sumAvailable: sums only the available values, skipping unavailable ones rather than treating them as 0");
  assertEqual(sumAvailable([null, null]), null, "sumAvailable: null when NOTHING is available — distinct from a real 0 total");
  assertEqual(sumAvailable([]), null, "sumAvailable: empty input -> null, never a fabricated 0");
}

// ---- Dune SQL builders: inputs are validated before being inlined ----
{
  const throws = (fn: () => unknown) => {
    try {
      fn();
      return false;
    } catch {
      return true;
    }
  };
  const eth = "0x28c6c06298d514db089934071355e5743bf21d60";
  const sql = exchangeFlowsSql("2026-09-14", "2026-09-21", [{ address: eth, cexName: "Binance" }]);
  assertTrue(sql.includes(`address NOT IN (${eth})`) && sql.includes(`(${eth}, 'Binance')`), "published wallets replace Dune's label for the same address");
  assertTrue(sql.includes("NOT LIKE '% Pool%'"), "mining-pool labels are excluded");
  assertTrue(!exchangeFlowsSql("2026-09-14", "2026-09-21").includes("VALUES"), "no extra labels -> Dune labels only");
  assertTrue(throws(() => exchangeFlowsSql("2026-09-14'; DROP", "2026-09-21")), "a malformed date is rejected");
  assertTrue(throws(() => exchangeFlowsSql("2026-09-14", "2026-09-21", [{ address: "0x1'); --", cexName: "Binance" }])), "a malformed Ethereum address is rejected");
  assertTrue(throws(() => exchangeFlowsSql("2026-09-14", "2026-09-21", [{ address: eth, cexName: "Bin'ance" }])), "a quote in an exchange name is rejected");
  const btc = bitcoinFlowsSql("Binance", "2026-09-14", "2026-09-21", [{ address: "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h", cexName: "Binance" }]);
  assertTrue(btc.includes("('bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h', 'Binance')") && btc.includes("FROM bitcoin.blocks"), "bitcoin query inlines published wallets and reads chain freshness from blocks");
  assertTrue(throws(() => bitcoinFlowsSql("Binance", "2026-09-14", "2026-09-21", [{ address: "1abc' OR 1=1 --", cexName: "Binance" }])), "a malformed Bitcoin address is rejected");
  assertTrue(throws(() => bitcoinFlowsSql("Binance'", "2026-09-14", "2026-09-21")), "a quote in the bitcoin exchange name is rejected");
  const tron = tronUsdtFlowsSql("2026-09-14", "2026-09-21", [{ address: "TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS", cexName: "Binance" }]);
  assertTrue(
    tron.includes("from_utf8(address) NOT IN ('TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS')") && tron.includes("('TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS', 'Binance')"),
    "tron query lets published wallets replace Dune's label for the same address"
  );
  assertTrue(tron.includes("varbinary_substring(from_base58("), "tron base58 labels are decoded to the 20-byte account id");
  assertTrue(throws(() => tronUsdtFlowsSql("2026-09-14", "2026-09-21", [{ address: "T0' OR 1=1 --", cexName: "Binance" }])), "a malformed Tron address is rejected");
  // The freshness scan is the only clause that puts the window end right before the contract filter.
  const ethBound = (end: string) => `block_date < DATE '${end}' AND contract_address`;
  assertTrue(!exchangeFlowsSql("2026-09-14", "2026-09-21").includes(ethBound("2026-09-21")), "recent runs read freshness past the window end");
  assertTrue(exchangeFlowsSql("2025-09-14", "2025-10-14", [], false).includes(ethBound("2025-10-14")), "history chunks bound the ethereum freshness scan");
  assertTrue(
    tronUsdtFlowsSql("2025-09-14", "2025-10-14", [], false).includes("TIMESTAMP '2025-09-14 00:00:00 UTC' AND evt_block_time < TIMESTAMP '2025-10-14 00:00:00 UTC'"),
    "history chunks bound the tron freshness scan"
  );
  assertTrue(bitcoinFlowsSql("Binance", "2025-09-14", "2025-10-14", [], false).includes("date >= DATE '2025-09-14' AND date < DATE '2025-10-14')"), "history chunks bound the bitcoin freshness scan");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

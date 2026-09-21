// Pure — builds the Dune SQL; no network. Exercised by scripts/verify-exchange-flows.ts.

// Exchanges whose Ethereum wallet labels in Dune's cex.addresses were checked
// (2026-09: Binance 136, OKX 217, Bybit 45 addresses, none shared between
// exchanges, newest label added 2025-08 — so coverage is a lower bound).
export const DUNE_TRACKED_VENUES = [
  { id: "binance", duneName: "Binance" },
  { id: "okx", duneName: "OKX" },
  { id: "bybit", duneName: "Bybit" },
] as const;

// Bitcoin labels in Dune are much thinner (Bybit 4, Coinbase 13 addresses), so
// only exchanges whose reserve wallets were checked against a published
// proof-of-reserves list are tracked there.
export const DUNE_BITCOIN_VENUES = [{ id: "binance", duneName: "Binance" }] as const;

export const DUNE_TOKENS = [
  { asset: "USDT", contract: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { asset: "USDC", contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
] as const;

// Addresses an exchange itself publishes (e.g. in proof of reserves). They
// take precedence over Dune's label for the same address.
export type ExtraLabel = { address: string; cexName: string };

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ETH_ADDRESS = /^0x[0-9a-f]{40}$/;
const BTC_ADDRESS = /^(1|3|bc1)[0-9A-Za-z]{20,90}$/;
const CEX_NAME = /^[A-Za-z0-9 .]+$/;

function checkDays(fromDayIso: string, toDayExclusiveIso: string) {
  if (!ISO_DAY.test(fromDayIso) || !ISO_DAY.test(toDayExclusiveIso)) throw new Error("dates must be YYYY-MM-DD");
}

function checkLabels(labels: ExtraLabel[], pattern: RegExp) {
  for (const l of labels) {
    if (!pattern.test(l.address) || !CEX_NAME.test(l.cexName)) throw new Error(`invalid extra label: ${l.address} / ${l.cexName}`);
  }
}

// Mining-pool wallets (e.g. "Binance Pool 1") pay out miners; those payouts
// aren't exchange withdrawals, so pool labels are left out entirely.
const NOT_A_POOL = "coalesce(distinct_name, '') NOT LIKE '% Pool%'";

// One row per (day, exchange, token). Every transfer touching a tracked
// exchange wallet becomes an "in" leg for the receiving exchange and/or an
// "out" leg for the sending one; a transfer between two wallets of the SAME
// exchange is counted once as `internal` and excluded from in/out. `*_cex`
// columns are transfers whose other side is a different labeled exchange.
// `data_through` is the newest transfer Dune has ingested in the window, so
// the caller can tell whether the last day is complete yet.
export function exchangeFlowsSql(fromDayIso: string, toDayExclusiveIso: string, extraLabels: ExtraLabel[] = []): string {
  checkDays(fromDayIso, toDayExclusiveIso);
  checkLabels(extraLabels, ETH_ADDRESS);
  const names = DUNE_TRACKED_VENUES.map((v) => `'${v.duneName}'`).join(", ");
  const contracts = DUNE_TOKENS.map((t) => t.contract).join(", ");
  const tokenCase = DUNE_TOKENS.map((t) => `WHEN ${t.contract} THEN '${t.asset}'`).join(" ");
  const extra = extraLabels.map((l) => `(${l.address}, '${l.cexName}')`).join(",\n    ");
  const labels = extraLabels.length
    ? `SELECT address, cex_name FROM cex.addresses
  WHERE blockchain = 'ethereum' AND ${NOT_A_POOL}
    AND address NOT IN (${extraLabels.map((l) => l.address).join(", ")})
  UNION ALL
  SELECT address, cex_name FROM (VALUES
    ${extra}
  ) AS v (address, cex_name)`
    : `SELECT address, cex_name FROM cex.addresses WHERE blockchain = 'ethereum' AND ${NOT_A_POOL}`;
  return `
WITH labels AS (
  ${labels}
),
t AS (
  SELECT block_date, block_time, contract_address, "from", "to", amount
  FROM tokens.transfers
  WHERE blockchain = 'ethereum'
    AND block_date >= DATE '${fromDayIso}'
    AND block_date < DATE '${toDayExclusiveIso}'
    AND contract_address IN (${contracts})
),
freshness AS (SELECT max(block_time) AS data_through FROM t),
tagged AS (
  SELECT t.block_date, t.contract_address, t.amount, f.cex_name AS from_cex, x.cex_name AS to_cex
  FROM t
  LEFT JOIN labels f ON t."from" = f.address
  LEFT JOIN labels x ON t."to" = x.address
  WHERE f.cex_name IN (${names}) OR x.cex_name IN (${names})
),
legs AS (
  SELECT block_date, contract_address, to_cex AS cex, 'in' AS dir, from_cex AS other, amount FROM tagged WHERE to_cex IN (${names})
  UNION ALL
  SELECT block_date, contract_address, from_cex AS cex, 'out' AS dir, to_cex AS other, amount FROM tagged WHERE from_cex IN (${names})
)
SELECT
  CAST(block_date AS VARCHAR) AS day,
  cex,
  CASE contract_address ${tokenCase} END AS asset,
  sum(CASE WHEN dir = 'in' AND other IS NULL THEN amount ELSE 0 END) AS inflow_ext,
  sum(CASE WHEN dir = 'in' AND other IS NOT NULL AND other <> cex THEN amount ELSE 0 END) AS inflow_cex,
  sum(CASE WHEN dir = 'out' AND other IS NULL THEN amount ELSE 0 END) AS outflow_ext,
  sum(CASE WHEN dir = 'out' AND other IS NOT NULL AND other <> cex THEN amount ELSE 0 END) AS outflow_cex,
  sum(CASE WHEN dir = 'out' AND other = cex THEN amount ELSE 0 END) AS internal,
  count(*) AS legs,
  CAST(max(freshness.data_through) AS VARCHAR) AS data_through
FROM legs CROSS JOIN freshness
GROUP BY 1, 2, 3
ORDER BY 1, 2, 3
`.trim();
}

// Bitcoin is UTXO-based, so flows are judged per transaction for one exchange:
//   the exchange is NOT among the inputs -> its outputs are inflow
//     (inflow_cex when every input belongs to another labeled exchange)
//   the exchange IS among the inputs     -> outputs to others are outflow
//     (outflow_cex for outputs to another labeled exchange); outputs back to
//     the exchange (change, own-wallet moves) are internal and excluded.
// `data_through` is the newest block Dune has, so a day counts as complete
// only once the chain has moved past its midnight.
export function bitcoinFlowsSql(duneName: string, fromDayIso: string, toDayExclusiveIso: string, extraLabels: ExtraLabel[] = []): string {
  checkDays(fromDayIso, toDayExclusiveIso);
  checkLabels(extraLabels, BTC_ADDRESS);
  if (!CEX_NAME.test(duneName)) throw new Error("invalid exchange name");
  const inRange = (alias: string) => `${alias}.block_date >= DATE '${fromDayIso}' AND ${alias}.block_date < DATE '${toDayExclusiveIso}'`;
  const labels = extraLabels.length
    ? `SELECT from_utf8(address) AS addr, cex_name FROM cex.addresses
  WHERE blockchain = 'bitcoin' AND ${NOT_A_POOL}
    AND from_utf8(address) NOT IN (${extraLabels.map((l) => `'${l.address}'`).join(", ")})
  UNION ALL
  SELECT addr, cex_name FROM (VALUES
    ${extraLabels.map((l) => `('${l.address}', '${l.cexName}')`).join(",\n    ")}
  ) AS v (addr, cex_name)`
    : `SELECT from_utf8(address) AS addr, cex_name FROM cex.addresses WHERE blockchain = 'bitcoin' AND ${NOT_A_POOL}`;
  return `
WITH labels AS (
  ${labels}
),
own AS (SELECT addr FROM labels WHERE cex_name = '${duneName}'),
touching AS (
  SELECT DISTINCT i.tx_id FROM bitcoin.inputs i WHERE ${inRange("i")} AND i.address IN (SELECT addr FROM own)
  UNION
  SELECT DISTINCT o.tx_id FROM bitcoin.outputs o WHERE ${inRange("o")} AND o.address IN (SELECT addr FROM own)
),
ins AS (
  SELECT i.tx_id,
    sum(CASE WHEN l.cex_name = '${duneName}' THEN i.value ELSE 0 END) AS own_in,
    count_if(l.cex_name IS NULL) AS ext_inputs,
    count_if(l.cex_name IS NOT NULL AND l.cex_name <> '${duneName}') AS cex_inputs
  FROM bitcoin.inputs i
  JOIN touching t ON t.tx_id = i.tx_id
  LEFT JOIN labels l ON l.addr = i.address
  WHERE ${inRange("i")}
  GROUP BY i.tx_id
),
outs AS (
  SELECT o.tx_id, min(o.block_date) AS day,
    sum(CASE WHEN l.cex_name = '${duneName}' THEN o.value ELSE 0 END) AS to_own,
    sum(CASE WHEN l.cex_name IS NULL THEN o.value ELSE 0 END) AS to_ext,
    sum(CASE WHEN l.cex_name IS NOT NULL AND l.cex_name <> '${duneName}' THEN o.value ELSE 0 END) AS to_cex
  FROM bitcoin.outputs o
  JOIN touching t ON t.tx_id = o.tx_id
  LEFT JOIN labels l ON l.addr = o.address
  WHERE ${inRange("o")}
  GROUP BY o.tx_id
),
freshness AS (SELECT max(time) AS data_through FROM bitcoin.blocks WHERE date >= DATE '${fromDayIso}')
SELECT
  CAST(o.day AS VARCHAR) AS day,
  '${duneName}' AS cex,
  'BTC' AS asset,
  sum(CASE WHEN coalesce(i.own_in, 0) = 0 AND NOT (coalesce(i.ext_inputs, 0) = 0 AND coalesce(i.cex_inputs, 0) > 0) THEN o.to_own ELSE 0 END) AS inflow_ext,
  sum(CASE WHEN coalesce(i.own_in, 0) = 0 AND coalesce(i.ext_inputs, 0) = 0 AND coalesce(i.cex_inputs, 0) > 0 THEN o.to_own ELSE 0 END) AS inflow_cex,
  sum(CASE WHEN i.own_in > 0 THEN o.to_ext ELSE 0 END) AS outflow_ext,
  sum(CASE WHEN i.own_in > 0 THEN o.to_cex ELSE 0 END) AS outflow_cex,
  sum(CASE WHEN i.own_in > 0 THEN o.to_own ELSE 0 END) AS internal,
  count(*) AS legs,
  CAST(max(freshness.data_through) AS VARCHAR) AS data_through
FROM outs o
LEFT JOIN ins i ON i.tx_id = o.tx_id
CROSS JOIN freshness
GROUP BY 1
ORDER BY 1
`.trim();
}

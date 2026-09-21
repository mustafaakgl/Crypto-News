// Pure — builds the Dune SQL; no network. Exercised by scripts/verify-exchange-flows.ts.

// Exchanges whose Ethereum wallet labels in Dune's cex.addresses were checked
// (2026-09: Binance 136, OKX 217, Bybit 45 addresses, none shared between
// exchanges, newest label added 2025-08 — so coverage is a lower bound).
export const DUNE_TRACKED_VENUES = [
  { id: "binance", duneName: "Binance" },
  { id: "okx", duneName: "OKX" },
  { id: "bybit", duneName: "Bybit" },
] as const;

export const DUNE_TOKENS = [
  { asset: "USDT", contract: "0xdac17f958d2ee523a2206206994597c13d831ec7" },
  { asset: "USDC", contract: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" },
] as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// One row per (day, exchange, token). Every transfer touching a tracked
// exchange wallet becomes an "in" leg for the receiving exchange and/or an
// "out" leg for the sending one; a transfer between two wallets of the SAME
// exchange is counted once as `internal` and excluded from in/out. `*_cex`
// columns are transfers whose other side is a different labeled exchange.
// `data_through` is the newest transfer Dune has ingested in the window, so
// the caller can tell whether the last day is complete yet.
export function exchangeFlowsSql(fromDayIso: string, toDayExclusiveIso: string): string {
  if (!ISO_DAY.test(fromDayIso) || !ISO_DAY.test(toDayExclusiveIso)) throw new Error("dates must be YYYY-MM-DD");
  const names = DUNE_TRACKED_VENUES.map((v) => `'${v.duneName}'`).join(", ");
  const contracts = DUNE_TOKENS.map((t) => t.contract).join(", ");
  const tokenCase = DUNE_TOKENS.map((t) => `WHEN ${t.contract} THEN '${t.asset}'`).join(" ");
  return `
WITH labels AS (
  SELECT address, cex_name FROM cex.addresses WHERE blockchain = 'ethereum'
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

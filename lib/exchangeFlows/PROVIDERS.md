# Exchange Flows — data source

The Flows tab shows USDT and USDC flows on Ethereum for exchanges whose wallet
labels were checked, from Dune. This file records why Dune was chosen, what
its limits are, and the alternatives that were evaluated. The same facts are
encoded as data in [`provider.ts`](./provider.ts) (`FLOW_PROVIDER_CANDIDATES`).

## In use: Dune (free plan, API key on the server)

- SQL in [`duneSql.ts`](./duneSql.ts) over `cex.addresses` (wallet labels) and
  `tokens.transfers`, run once a day by the collector
  ([`lib/collector/duneFlows.ts`](../collector/duneFlows.ts)) and stored in
  SQLite; visitors only read the stored rows.
- Needs `DUNE_API_KEY` (server env, never sent to the client) and
  `COLLECTOR_ENABLED=1`. Free accounts created after 2026-07-21 get 2,500
  credits/month and API access; older free accounts became view-only on
  2026-09-10.
- Measured cost (2026-09-21): coverage check 1.37 credits; Binance · USDT ·
  7 days 1.12; Binance/OKX/Bybit × USDT/USDC × 7 days 0.48.
- Label coverage checked for Ethereum: Binance 136, OKX 217, Bybit 45 labeled
  wallets, none shared between exchanges; Binance US is labeled separately
  and not merged into Binance. The newest label was added 2025-08, so
  wallets opened since then are missing and figures are a lower bound.
- Labels cover exchange hot/cold wallets, not per-customer deposit
  addresses: a deposit is seen when it's swept into a labeled wallet, and a
  transfer to another exchange's deposit address counts as an ordinary
  outflow rather than an exchange-to-exchange one.
- Same-exchange transfers are large (Binance USDT: $2.68B over the 7 days
  tested, about as much as its inflow) and are excluded from in/out.
- `cex.flows` (Dune's own curated table) wasn't used because it doesn't
  document how it handles same-exchange transfers.
- Not covered: Bitcoin (not in Dune's curated CEX flows), bank deposits and
  withdrawals in USD/EUR (not visible on-chain).

## Alternatives evaluated (2026-09, docs read, no account created, no plan started)

### Glassnode — blocked: requires a new paid plan

- API access always requires an `api_key`; there is no free tier at all.
- The lightest paid tier ("Advanced" / light API) is capped at 14 days of
  history, daily resolution only, 50 calls/day.
- Full exchange netflow/inflow/outflow access needs "Professional".
- Docs: <https://docs.glassnode.com/basic-api/api>,
  <https://docs.glassnode.com/further-information/exchange-data-transparency-notice>
- Coverage notes (from the transparency page, for whenever this is revisited):
  balances tracked on Bitcoin and Ethereum only, via verified addresses +
  public tags + proprietary clustering; reported balances are a *lower
  bound*; recent inflow/outflow figures can be retrospectively revised.

### CryptoQuant — blocked: requires a new account (and then a new paid plan)

- Even the free "Basic" plan requires creating an account to get an API key.
- Basic's API scope is "market data" (community indicators) only.
- Exchange netflow/inflow/outflow is on-chain data, gated behind the paid
  "Professional" plan ($99/mo) or above.
- Docs: <https://cryptoquant.com/pricing>, <https://docs.cryptoquant.com/>

### DefiLlama — blocked: the data doesn't exist here, not an access problem

- The free API (`api.llama.fi`) has no exchange wallet inflow/outflow/netflow
  endpoint at all.
- The only "inflows" endpoint (`/api/inflows/{protocol}/{timestamp}`) is
  Pro-only ($300/mo) and measures a DeFi *protocol's* own bridged/token
  inflows — not a centralized exchange's wallet flows.
- Docs: <https://api-docs.defillama.com/>

## Extending coverage

1. Another exchange: check its Ethereum labels in `cex.addresses` against the
   wallet list it publishes (e.g. proof-of-reserves) before adding it to
   `DUNE_TRACKED_VENUES`.
2. Bitcoin flows: needs a paid provider (Glassnode or CryptoQuant
   Professional); implement `FlowsProvider` against it.
3. 1Y: the collector backfills 30 days; extend `BACKFILL_DAYS` once the
   credit cost of a longer window has been measured.

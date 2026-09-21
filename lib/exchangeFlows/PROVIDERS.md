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
- Binance's own reserve wallets are added on top of Dune's labels, from its
  proof of reserves (audit PR01SEP26, snapshot 2026-09-01; hot/cold list in
  [`porLabels/binance-20260901.json`](./porLabels/binance-20260901.json)).
  Checked against that list, Dune's labels alone covered 93.3% of the BTC,
  95.1% of the USDT and only 56.5% of the USDC balance (two unlabeled USDC
  wallets held $2.36B). With the published wallets added, Binance's USDC
  7-day inflow went from $690M to $3.66B and USDT's net from +$273M to +$555M.
  The label version is part of the collector's source key, so a new audit
  file triggers a fresh backfill.
- OKX's reserve addresses are added the same way, from its proof of reserves
  (snapshot 2026-08-11, `por_csv_2026081100_V6.zip`; 212k addresses incl.
  deposit addresses, so only the non-staking addresses holding 99.9% of each
  balance are kept in [`porLabels/okx-20260811.json`](./porLabels/okx-20260811.json):
  1,298 BTC and 105 Ethereum addresses). Dune's labels alone covered 53.6% of
  OKX's BTC, 57.7% of its USDT and 0.9% of its USDC reserve balance. Adding
  them moved OKX's own hot ↔ cold transfers out of in/out: USDT 7-day inflow
  went from $1.38B to $1.14B and net from −$16M to +$39M.
- The other eight exchanges are tracked on Ethereum with Dune's labels only
  and marked "unverified" per row. None of them publishes a downloadable
  wallet list to check against (checked 2026-09-21): Coinbase, Upbit and
  Kraken publish no list; KuCoin, Bitget and Gate prove wallet ownership to
  their auditor and publish Merkle tooling, not addresses. An unverified
  exchange with zero transfers on its labels over a period is shown as "no
  labeled activity" rather than 0 (Kraken's 231 Ethereum labels saw no USDT
  in the week tested). Adding them cost almost nothing: the 30-day Ethereum
  backfill went from 1.3 to 1.7 credits. The 30-day Bitcoin backfill for
  Binance and OKX cost 13–20 credits.
- Tron USDT (`tronUsdtFlowsSql`): `tether_tron.tether_usd_evt_transfer`
  joined to Tron labels, which Dune stores as base58 "T…" text and are
  decoded with `from_base58` to the 20-byte account id the events use.
  Dune labels Tron wallets only for Binance (16), OKX (15), Bitget (11),
  Bybit (8), KuCoin (5) and Gate (2), last added 2024-04. Checked against
  proof of reserves they covered 85% of Binance's and 0% of OKX's Tron USDT
  balance, so both lists are added (Binance 20 hot/cold addresses, OKX the
  206 holding 99%). A 7-day query cost 0.76 credits; Binance's Tron USDT
  inflow that week ($6.0B) was 1.5× its Ethereum USDT inflow.
- Bybit's current wallet list is only downloadable after logging in (the
  only public file is from 2022-12), so Bybit uses Dune's labels alone.
- Bitcoin (Binance, OKX): UTXO rules per transaction in `bitcoinFlowsSql`;
  7-day query ~0.5 credits per exchange. Cost varies by Dune load: one 7-day
  Ethereum run cost 12.6 credits where the same query had cost 0.5–1.2. Dune's Bitcoin labels for other
  exchanges are too thin to use (Bybit 4, Coinbase 13 addresses).
- Mining-pool labels ("Binance Pool …") are excluded: payouts to miners
  aren't exchange withdrawals.
- `cex.flows` (Dune's own curated table) wasn't used because it doesn't
  document how it handles same-exchange transfers.
- Not covered: bank deposits and withdrawals in USD/EUR (not visible
  on-chain); per-customer deposit addresses (Binance publishes 3.19M of
  them, 350 MB — would need a Dune table upload).

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
2. Bitcoin for more exchanges: add their published reserve wallets the same
   way, then add them to `DUNE_BITCOIN_VENUES`.
3. 1Y: the collector backfills 30 days; extend `BACKFILL_DAYS` once the
   credit cost of a longer window has been measured.

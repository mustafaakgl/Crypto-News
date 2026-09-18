# Exchange Flows — provider research

The user-facing "Flows" tab only ever shows "Exchange flow data is not
available yet." This file is the developer-facing record of *why*, and what
it would take to change that. The same facts are also encoded as data in
[`provider.ts`](./provider.ts) (`FLOW_PROVIDER_CANDIDATES`) — this file is
the prose version for anyone reading the code who isn't parsing that array.

## Candidates evaluated (2026-09, docs read, no account created, no plan started)

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

## What would unblock this

1. Someone decides to pay for Glassnode Professional or CryptoQuant
   Professional (or a comparable provider not yet evaluated).
2. A server-side API key is added as an env var (never sent to the client).
3. Implement `FlowsProvider` (see `provider.ts`) against that key and swap
   it in via `getFlowsProvider()` — the type contract, computation layer
   (`flowsMath.ts`), and UI (`components/exchanges/FlowsTab.tsx`) are
   already built against that interface and shouldn't need to change.

## Why the UI doesn't show this

Earlier iterations surfaced this whole evaluation directly on the page. It
was accurate but is developer/decision-maker context, not something an end
user opening the Flows tab needs — a short "not available yet" is the
honest, minimal-noise version of the same fact for that audience.

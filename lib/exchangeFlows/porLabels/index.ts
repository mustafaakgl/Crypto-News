import "server-only";
import binance from "@/lib/exchangeFlows/porLabels/binance-20260901.json";
import okx from "@/lib/exchangeFlows/porLabels/okx-20260811.json";
import type { ExtraLabel } from "@/lib/exchangeFlows/duneSql";

// Reserve wallets exchanges publish in their proof of reserves, added on top
// of Dune's labels. Checked 2026-09-21 against Dune's own labels (share of
// the reserve balance Dune already covered):
//   Binance (hot/cold list): BTC 93%, USDT 95%, USDC 57%
//   OKX (all reserve addresses; the ones holding 99.9% of each balance are
//   kept, staking validators left out): BTC 54%, USDT 58%, USDC 0.9%
// Bybit's current list is only downloadable after logging in, so Bybit uses
// Dune's labels alone. Replacing a file changes LABELS_VERSION, which makes
// the collector re-backfill with the new labels.
export const LABELS_VERSION = `por-binance-${binance.snapshot}-okx-${okx.snapshot}`;

const asLabels = (addresses: string[], cexName: string): ExtraLabel[] => addresses.map((address) => ({ address, cexName }));

// Venues whose flows rest on their own published wallet list rather than Dune's labels alone.
export const VERIFIED_VENUES: Record<"ethereum" | "bitcoin", string[]> = {
  ethereum: ["binance", "okx"],
  bitcoin: ["binance", "okx"],
};

export const ETHEREUM_EXTRA_LABELS = [...asLabels(binance.ethereum, "Binance"), ...asLabels(okx.ethereum, "OKX")];
export const BITCOIN_EXTRA_LABELS = [...asLabels(binance.bitcoin, "Binance"), ...asLabels(okx.bitcoin, "OKX")];

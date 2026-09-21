import "server-only";
import binance from "@/lib/exchangeFlows/porLabels/binance-20260901.json";
import type { ExtraLabel } from "@/lib/exchangeFlows/duneSql";

// Reserve wallets Binance publishes in its proof of reserves (hot/cold only;
// the per-customer deposit list is 350 MB and not used). Checked 2026-09-21
// against Dune's own labels: Dune covered 93% of the BTC, 95% of the USDT and
// only 57% of the USDC balance in these wallets. Replace the file (and bump
// LABELS_VERSION) when a newer audit is published; that triggers a re-backfill.
export const LABELS_VERSION = `por-binance-${binance.snapshot}`;

const asLabels = (addresses: string[]): ExtraLabel[] => addresses.map((address) => ({ address, cexName: "Binance" }));

export const ETHEREUM_EXTRA_LABELS = asLabels(binance.ethereum);
export const BITCOIN_EXTRA_LABELS = asLabels(binance.bitcoin);

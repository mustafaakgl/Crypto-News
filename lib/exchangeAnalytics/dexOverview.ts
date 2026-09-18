import "server-only";
import { fetchJson } from "@/lib/exchangeAnalytics/httpClient";
import type { DexOverviewResult, DexProtocol, ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { TtlCache } from "@/lib/rag/cache";

const LLAMA_BASE = "https://api.llama.fi";
const REVALIDATE_SECONDS = 600;

// DefiLlama's /overview/dexs/protocols array mixes in several NON-dex
// categories (DEX Aggregator, Prediction Market, Lending, Bridge, ...) —
// confirmed by inspecting a live response. Only "Dexs" is a real spot DEX.
// "DEX Aggregator" is deliberately excluded: an aggregator's volume is
// routed THROUGH the underlying DEXs already counted here — including it
// too would double-count the same trades.
const DEX_CATEGORY = "Dexs";

const PERIOD_FIELD: Record<ExchangePeriod, "total24h" | "total7d" | "total30d" | "total1y"> = {
  "1d": "total24h",
  "7d": "total7d",
  "30d": "total30d",
  "1y": "total1y",
};

type RawProtocol = {
  name?: unknown;
  displayName?: unknown;
  category?: unknown;
  chains?: unknown;
  defillamaId?: unknown;
  change_1d?: unknown;
  total24h?: unknown;
  total7d?: unknown;
  total30d?: unknown;
  total1y?: unknown;
};

function num(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
}

const overviewCache = new TtlCache<DexOverviewResult>();

// The top-level total24h/total7d/total30d/total1y are DefiLlama's OWN
// already-deduplicated aggregate — this is what's shown as "Total DEX
// volume", never re-derived by summing the protocols[] array ourselves
// (summing all protocols over- or under-counts vs. the real total,
// confirmed empirically: neither "sum everything" nor "sum category==Dexs
// only" exactly matches DefiLlama's own top-level figure).
export async function getDexOverview(period: ExchangePeriod, count: VenueCount): Promise<DexOverviewResult> {
  const cacheKey = `dex:${period}:${count}`;
  return overviewCache.getOrCompute(
    cacheKey,
    async (): Promise<DexOverviewResult> => {
      const warnings: string[] = [];
      const result = await fetchJson(
        `${LLAMA_BASE}/overview/dexs?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
        "DefiLlama DEX overview",
        REVALIDATE_SECONDS
      );
      if (!result.ok) {
        warnings.push(result.error);
        return { period, totalVolumeUsd: null, protocols: [], protocolPoolSize: 0, asOf: new Date().toISOString(), warnings };
      }

      const data = result.data as Record<string, unknown>;
      const periodField = PERIOD_FIELD[period];
      const totalVolumeUsd = num(data[periodField]);
      if (totalVolumeUsd === null) warnings.push(`DefiLlama DEX overview: ${periodField} missing from response.`);

      const rawProtocols = Array.isArray(data.protocols) ? (data.protocols as RawProtocol[]) : [];
      const dexOnly = rawProtocols.filter((p) => p.category === DEX_CATEGORY);

      const withVolume = dexOnly
        .map((p) => {
          const volumeUsd = num(p[periodField]);
          if (volumeUsd === null) return null;
          return {
            id: typeof p.defillamaId === "string" ? p.defillamaId : String(p.name ?? ""),
            name: typeof p.displayName === "string" ? p.displayName : typeof p.name === "string" ? p.name : "Unknown",
            chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === "string") : [],
            volumeUsd,
            change1d: num(p.change_1d),
          } satisfies DexProtocol;
        })
        .filter((p): p is DexProtocol => p !== null)
        .sort((a, b) => b.volumeUsd - a.volumeUsd)
        .slice(0, count);

      return {
        period,
        totalVolumeUsd,
        protocols: withVolume,
        protocolPoolSize: dexOnly.length,
        asOf: new Date().toISOString(),
        warnings,
      };
    },
    (r) => r.protocols.length > 0
  );
}

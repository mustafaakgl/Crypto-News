import "server-only";
import { PERIOD_DAYS } from "@/lib/exchangeVolume/aggregate";
import { FLOW_NETWORKS, flowsSourceKey, trackedFlowVenues, type FlowsNetwork } from "@/lib/collector/duneFlows";
import type { FlowsDailySeriesParams, FlowsOverviewParams, FlowsProvider } from "@/lib/exchangeFlows/provider";
import { VERIFIED_VENUES } from "@/lib/exchangeFlows/porLabels";
import type { ExchangeFlowDailySeries, ExchangeFlowRow, ExchangeFlowsResult } from "@/lib/exchangeFlows/types";
import { DAY_MS, dayToIso, getDb, hasDb } from "@/lib/store/db";

type Sync = { first_day: number; complete_through_day: number; data_through_ms: number; updated_at: number };
type Sums = { inflow_ext: number; inflow_cex: number; outflow_ext: number; outflow_cex: number; internal: number; legs: number; days: number };

function readSync(network: FlowsNetwork): Sync | undefined {
  return getDb().prepare("SELECT first_day, complete_through_day, data_through_ms, updated_at FROM flows_sync WHERE source = ?").get(flowsSourceKey(network)) as
    | Sync
    | undefined;
}

export function storedFlowsAvailable(): boolean {
  return hasDb() && FLOW_NETWORKS.some((n) => readSync(n) !== undefined);
}

// On a live exchange wallet money moves both ways, many times a day. Labels
// that over the whole collected history only receive (typically dust/spam
// sent to old addresses), only send, or see a handful of transfers are stale:
// the smaller side must reach this share of the larger, at this many transfers a day.
const MIN_TWO_WAY_SHARE = 0.1;
const MIN_LEGS_PER_DAY = 2;

function isFlowsNetwork(v: string | null): v is FlowsNetwork {
  return (FLOW_NETWORKS as (string | null)[]).includes(v);
}

// The window ends at the last day Dune had fully ingested, not blindly at yesterday.
function windowFor(sync: Sync, periodDays: number) {
  const endDay = sync.complete_through_day;
  const startDay = endDay - periodDays + 1;
  return { startDay, endDay, covered: startDay >= sync.first_day };
}

export class StoredFlowsProvider implements FlowsProvider {
  async getOverview({ asset, network, period, candidates }: FlowsOverviewParams): Promise<ExchangeFlowsResult> {
    const sync = isFlowsNetwork(network) ? readSync(network) : undefined;
    if (!sync || !isFlowsNetwork(network)) {
      return { status: "not_configured", asset, network, period, reason: "No collected flow data for this network yet.", candidatesEvaluated: [] };
    }
    const tracked = new Set(trackedFlowVenues(network));
    const { startDay, endDay, covered } = windowFor(sync, PERIOD_DAYS[period]);
    const sumStmt = getDb().prepare(
      `SELECT sum(inflow_ext) AS inflow_ext, sum(inflow_cex) AS inflow_cex, sum(outflow_ext) AS outflow_ext,
              sum(outflow_cex) AS outflow_cex, sum(internal) AS internal, sum(legs) AS legs, count(*) AS days
       FROM exchange_flows_daily WHERE venue = ? AND asset = ? AND network = ? AND day BETWEEN ? AND ?`
    );
    const historyStmt = getDb().prepare(
      `SELECT sum(inflow_ext + inflow_cex) AS inflow, sum(outflow_ext + outflow_cex) AS outflow, sum(legs) AS legs, count(*) AS days
       FROM exchange_flows_daily WHERE venue = ? AND asset = ? AND network = ? AND day BETWEEN ? AND ?`
    );
    const labelsLookStale = (venue: string) => {
      const h = historyStmt.get(venue, asset, network, sync.first_day, sync.complete_through_day) as {
        inflow: number | null;
        outflow: number | null;
        legs: number | null;
        days: number;
      };
      const inflow = h.inflow ?? 0;
      const outflow = h.outflow ?? 0;
      return (h.legs ?? 0) < MIN_LEGS_PER_DAY * h.days || Math.min(inflow, outflow) < MIN_TWO_WAY_SHARE * Math.max(inflow, outflow);
    };
    const updatedAt = new Date(sync.updated_at).toISOString();

    const rows: ExchangeFlowRow[] = candidates.map((c) => {
      const empty: ExchangeFlowRow = {
        exchangeId: c.id,
        exchangeName: c.name,
        inflow: null,
        outflow: null,
        netflow: null,
        inflowFromExchanges: null,
        outflowToExchanges: null,
        internalExcluded: null,
        coverage: "unavailable",
        coverageBasis: null,
        updatedAt: null,
      };
      if (!tracked.has(c.id)) return { ...empty, unavailableReason: "not_tracked" };
      if (!covered) return { ...empty, unavailableReason: "not_collected" };
      const s = sumStmt.get(c.id, asset, network, startDay, endDay) as Sums;
      if (s.days !== endDay - startDay + 1) return { ...empty, unavailableReason: "not_collected" };
      const verified = VERIFIED_VENUES[network].includes(c.id);
      // No transfers, or one-way traffic only, on an unverified exchange's labels means the labels are stale, not that nothing moved.
      if (!verified && (s.legs === 0 || labelsLookStale(c.id))) return { ...empty, unavailableReason: "no_labeled_activity" };
      const inflow = s.inflow_ext + s.inflow_cex;
      const outflow = s.outflow_ext + s.outflow_cex;
      return {
        ...empty,
        inflow,
        outflow,
        netflow: inflow - outflow,
        inflowFromExchanges: s.inflow_cex,
        outflowToExchanges: s.outflow_cex,
        internalExcluded: s.internal,
        coverage: "available",
        coverageBasis: verified ? "verified" : "dune_labels",
        updatedAt,
      };
    });


    return {
      status: "connected",
      asset,
      network,
      period,
      periodStart: new Date(startDay * DAY_MS).toISOString(),
      periodEnd: new Date((endDay + 1) * DAY_MS - 1).toISOString(),
      rows,
      requestedCount: rows.length,
      supportedCount: rows.filter((r) => r.coverage === "available").length,
      source: "Dune",
      collectedFrom: dayToIso(sync.first_day),
      historyNeededFrom: covered ? null : dayToIso(startDay),
      dataThrough: new Date(sync.data_through_ms).toISOString(),
      asOf: updatedAt,
      warnings: [],
    };
  }

  async getDailySeries({ exchangeId, asset, network, period }: FlowsDailySeriesParams): Promise<ExchangeFlowDailySeries> {
    if (!isFlowsNetwork(network)) return null;
    const sync = readSync(network);
    if (!sync || !trackedFlowVenues(network).includes(exchangeId)) return null;
    const { startDay, endDay } = windowFor(sync, PERIOD_DAYS[period]);
    const rows = getDb()
      .prepare(
        `SELECT day, inflow_ext + inflow_cex AS inflow, outflow_ext + outflow_cex AS outflow
         FROM exchange_flows_daily WHERE venue = ? AND asset = ? AND network = ? AND day BETWEEN ? AND ? ORDER BY day`
      )
      .all(exchangeId, asset, network, Math.max(startDay, sync.first_day), endDay) as { day: number; inflow: number; outflow: number }[];
    if (rows.length === 0) return null;
    return {
      exchangeId,
      asset,
      network,
      points: rows.map((r) => ({ dateIso: dayToIso(r.day), inflow: r.inflow, outflow: r.outflow, netflow: r.inflow - r.outflow })),
    };
  }
}

import "server-only";
import { PERIOD_DAYS } from "@/lib/exchangeVolume/aggregate";
import { FLOWS_SOURCE } from "@/lib/collector/duneFlows";
import { DUNE_TRACKED_VENUES } from "@/lib/exchangeFlows/duneSql";
import type { FlowsDailySeriesParams, FlowsOverviewParams, FlowsProvider } from "@/lib/exchangeFlows/provider";
import type { ExchangeFlowDailySeries, ExchangeFlowRow, ExchangeFlowsResult } from "@/lib/exchangeFlows/types";
import { DAY_MS, dayToIso, getDb, hasDb } from "@/lib/store/db";

type Sync = { first_day: number; complete_through_day: number; data_through_ms: number; updated_at: number };
type Sums = { inflow_ext: number; inflow_cex: number; outflow_ext: number; outflow_cex: number; internal: number; days: number };

const TRACKED = new Set<string>(DUNE_TRACKED_VENUES.map((v) => v.id));

function readSync(): Sync | undefined {
  return getDb().prepare("SELECT first_day, complete_through_day, data_through_ms, updated_at FROM flows_sync WHERE source = ?").get(FLOWS_SOURCE) as Sync | undefined;
}

export function storedFlowsAvailable(): boolean {
  return hasDb() && readSync() !== undefined;
}

// The window ends at the last day Dune had fully ingested, not blindly at yesterday.
function windowFor(sync: Sync, periodDays: number) {
  const endDay = sync.complete_through_day;
  const startDay = endDay - periodDays + 1;
  return { startDay, endDay, covered: startDay >= sync.first_day };
}

export class StoredFlowsProvider implements FlowsProvider {
  async getOverview({ asset, network, period, candidates }: FlowsOverviewParams): Promise<ExchangeFlowsResult> {
    const sync = readSync()!;
    const { startDay, endDay, covered } = windowFor(sync, PERIOD_DAYS[period]);
    const sumStmt = getDb().prepare(
      `SELECT sum(inflow_ext) AS inflow_ext, sum(inflow_cex) AS inflow_cex, sum(outflow_ext) AS outflow_ext,
              sum(outflow_cex) AS outflow_cex, sum(internal) AS internal, count(*) AS days
       FROM exchange_flows_daily WHERE venue = ? AND asset = ? AND network = ? AND day BETWEEN ? AND ?`
    );
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
        updatedAt: null,
      };
      if (!TRACKED.has(c.id)) return { ...empty, unavailableReason: "not_tracked" };
      if (!covered) return { ...empty, unavailableReason: "not_collected" };
      const s = sumStmt.get(c.id, asset, network, startDay, endDay) as Sums;
      if (s.days !== endDay - startDay + 1) return { ...empty, unavailableReason: "not_collected" };
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
    if (!TRACKED.has(exchangeId)) return null;
    const sync = readSync()!;
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

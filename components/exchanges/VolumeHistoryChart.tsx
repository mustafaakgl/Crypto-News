"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ExchangePeriod, VenueCount } from "@/lib/exchangeAnalytics/types";
import { bucketsFor, sumIntoBuckets, type Grouping } from "@/lib/exchangeVolume/grouping";
import type { StoredDailyPoint } from "@/lib/exchangeVolume/types";
import { CEX_VENUES } from "@/lib/exchangeVolume/venues";
import { formatMarketCap } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

// Colour follows the exchange, never its rank: the first seven get the
// validated categorical slots in list order, the rest fold into "Other"
// (a neutral, since it isn't one identity).
const SLOT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"];
const OTHER_COLOR = "#898781";
const SURFACE = "#ffffff";

const RANGE_DAYS: Record<ExchangePeriod, number> = { "1d": 30, "7d": 7, "30d": 30, "1y": 365 };
const HEIGHT = 240;
const PAD = { top: 10, right: 8, bottom: 24, left: 56 };

type Metric = "total" | "tracked";
type Mode = "usd" | "share";
type HistoryResponse = { venues: { venueId: string; name: string; series: StoredDailyPoint[] | null }[] };

// Rounds the axis top up so the four gridline steps land on 1/2/2.5/5 × 10ⁿ.
function niceMax(max: number): number {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((v) => v >= raw)!;
  return step * 4;
}

function groupingsFor(rangeDays: number): Grouping[] {
  if (rangeDays >= 365) return ["day", "week", "month"];
  if (rangeDays >= 30) return ["day", "week"];
  return ["day"];
}

function Toggle<T extends string>({ value, options, labels, onChange, aria }: { value: T; options: T[]; labels: Record<T, string>; onChange: (v: T) => void; aria: string }) {
  return (
    <div className="flex gap-1" role="group" aria-label={aria}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`px-2 py-0.5 text-[11px] font-semibold border ${value === o ? "bg-ink text-paper border-ink" : "border-ink/30 text-ink/60 hover:border-ink"}`}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  );
}

export function VolumeHistoryChart({ period, count, locale = "en" }: { period: ExchangePeriod; count: VenueCount; locale?: Locale }) {
  const t = getDictionary(locale).volumeHistory;
  const intl = locale === "de" ? "de-DE" : "en-GB";
  const rangeDays = RANGE_DAYS[period];
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [grouping, setGrouping] = useState<Grouping>(rangeDays >= 365 ? "week" : "day");
  const [metric, setMetric] = useState<Metric>("total");
  const [mode, setMode] = useState<Mode>("usd");
  const [hoverIndex, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  const venueIds = CEX_VENUES.slice(0, count).map((v) => v.id);
  const venueKey = venueIds.join(",");

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    fetch(`/api/exchanges/volume/history?venues=${venueKey}&days=365`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json: HistoryResponse) => setData(json))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [venueKey]);

  useEffect(() => {
    if (!groupingsFor(rangeDays).includes(grouping)) setGrouping(rangeDays >= 365 ? "week" : "day");
  }, [rangeDays, grouping]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [data]);

  const chart = useMemo(() => {
    if (!data) return null;
    const collected = data.venues.filter((v) => v.series && v.series.length > 0);
    if (collected.length === 0) return null;
    const endDay = Math.max(...collected.map((v) => v.series!.at(-1)!.day));
    const startDay = endDay - rangeDays + 1;
    const buckets = bucketsFor(startDay, endDay, grouping);

    const listIndex = (id: string) => CEX_VENUES.findIndex((c) => c.id === id);
    const named = collected.filter((v) => listIndex(v.venueId) < SLOT_COLORS.length);
    const others = collected.filter((v) => listIndex(v.venueId) >= SLOT_COLORS.length);
    const seriesOf = (v: HistoryResponse["venues"][number]) =>
      v.series!.filter((p) => p.day >= startDay && p.day <= endDay).map((p) => ({ day: p.day, value: metric === "total" ? p.totalUsd : p.trackedUsd }));

    const layers = named.map((v) => ({ id: v.venueId, label: v.name, color: SLOT_COLORS[listIndex(v.venueId)], sums: sumIntoBuckets(buckets, seriesOf(v)) }));
    if (others.length > 0) {
      const merged = others.map((v) => sumIntoBuckets(buckets, seriesOf(v)));
      layers.push({
        id: "other",
        label: t.other(others.map((v) => v.name).join(", ")),
        color: OTHER_COLOR,
        sums: buckets.map((_, i) => ({ value: merged.reduce((a, m) => a + m[i].value, 0), daysWithData: Math.min(...merged.map((m) => m[i].daysWithData)) })),
      });
    }

    const rows = buckets.map((b, i) => {
      const inRange = Math.min(b.endDay, endDay) - Math.max(b.startDay, startDay) + 1;
      const total = layers.reduce((a, l) => a + l.sums[i].value, 0);
      const complete = inRange === b.calendarDays && layers.every((l) => l.sums[i].daysWithData === b.calendarDays);
      return { bucket: b, total, complete };
    });

    return { buckets, layers, rows, missing: data.venues.filter((v) => !v.series || v.series.length === 0).map((v) => v.name) };
  }, [data, rangeDays, grouping, metric, t]);

  if (failed) return <p className="text-sm text-ink/60 py-4">{t.error}</p>;
  if (!data) return <p className="text-sm text-ink/50 animate-pulse py-4">{t.loading}</p>;
  if (!chart) return <p className="text-sm text-ink/60 py-4">{t.notCollected}</p>;

  const { layers, rows, missing } = chart;
  const n = rows.length;
  // A hover index from a previous grouping can point past the new bar count.
  const hover = hoverIndex !== null && hoverIndex < n ? hoverIndex : null;
  const maxY = mode === "share" ? 100 : niceMax(Math.max(...rows.map((r) => r.total), 1));
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = innerW / n;
  const gap = n > 120 ? 0 : 2;
  const barW = Math.max(1, step - gap);
  const y = (v: number) => PAD.top + innerH - (v / maxY) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const fmtDay = (day: number, withYear = false) =>
    new Date(day * 86_400_000).toLocaleDateString(intl, { timeZone: "UTC", day: "numeric", month: "short", year: withYear ? "numeric" : undefined });
  const bucketLabel = (i: number) => {
    const b = rows[i].bucket;
    if (grouping === "day") return fmtDay(b.startDay, true);
    if (grouping === "month") return new Date(b.startDay * 86_400_000).toLocaleDateString(intl, { timeZone: "UTC", month: "long", year: "numeric" });
    return `${fmtDay(b.startDay)} – ${fmtDay(b.endDay, true)}`;
  };
  const xTickCount = Math.max(2, Math.min(6, Math.floor(innerW / 100)));
  const xTicks = Array.from({ length: xTickCount }, (_, k) => Math.round((k / (xTickCount - 1)) * (n - 1)));
  const valueOf = (layerIdx: number, i: number) => {
    const v = layers[layerIdx].sums[i].value;
    return mode === "share" ? (rows[i].total > 0 ? (v / rows[i].total) * 100 : 0) : v;
  };
  const anyIncomplete = rows.some((r) => !r.complete);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <Toggle value={grouping} options={groupingsFor(rangeDays)} labels={t.groupingLabels} onChange={setGrouping} aria={t.ariaGrouping} />
        <Toggle value={metric} options={["total", "tracked"] as Metric[]} labels={t.metricLabels} onChange={setMetric} aria={t.ariaMetric} />
        <Toggle value={mode} options={["usd", "share"] as Mode[]} labels={t.modeLabels} onChange={setMode} aria={t.ariaMode} />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/70 mb-2">
        {layers.map((l) => (
          <span key={l.id} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5" style={{ backgroundColor: l.color }} aria-hidden />
            {l.label}
          </span>
        ))}
      </div>

      <div ref={wrapRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={t.ariaChart(rows.length)}
          onMouseMove={(e) => {
            const x = e.clientX - e.currentTarget.getBoundingClientRect().left - PAD.left;
            const i = Math.floor(x / step);
            setHover(i >= 0 && i < n ? i : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {ticks.map((v, k) => (
            <g key={k}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={k === 0 ? "#c3c2b7" : "#e1e0d9"} />
              <text x={PAD.left - 6} y={y(v)} dy="0.32em" textAnchor="end" fontSize={10} fill="#898781" className="tabular-nums">
                {mode === "share" ? `${Math.round(v)}%` : v === 0 ? "0" : formatMarketCap(v)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            let acc = 0;
            const x = PAD.left + i * step + gap / 2;
            return (
              <g key={i} opacity={r.complete ? 1 : 0.4}>
                {layers.map((l, li) => {
                  const v = valueOf(li, i);
                  if (v <= 0) return null;
                  const y0 = y(acc);
                  acc += v;
                  const y1 = y(acc);
                  return <rect key={l.id} x={x} y={y1} width={barW} height={Math.max(0, y0 - y1)} fill={l.color} stroke={gap ? SURFACE : "none"} strokeWidth={gap ? 1 : 0} />;
                })}
              </g>
            );
          })}
          {xTicks.map((i) => (
            <text key={i} x={PAD.left + i * step + step / 2} y={HEIGHT - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize={10} fill="#898781">
              {grouping === "month"
                ? new Date(rows[i].bucket.startDay * 86_400_000).toLocaleDateString(intl, { timeZone: "UTC", month: "short", year: "2-digit" })
                : fmtDay(rows[i].bucket.startDay)}
            </text>
          ))}
          {hover !== null && <rect x={PAD.left + hover * step} y={PAD.top} width={step} height={innerH} fill="#0b0b0b" opacity={0.06} pointerEvents="none" />}
        </svg>

        {hover !== null && (
          <div
            className="absolute top-2 pointer-events-none bg-paper border border-ink/30 px-2 py-1.5 text-[11px] shadow-sm tabular-nums min-w-[180px]"
            style={PAD.left + hover * step > width / 2 ? { right: width - (PAD.left + hover * step) + 8 } : { left: PAD.left + (hover + 1) * step + 8 }}
          >
            <div className="font-semibold mb-0.5">{bucketLabel(hover)}</div>
            {[...layers].reverse().map((l) => {
              const v = l.sums[hover].value;
              const share = rows[hover].total > 0 ? (v / rows[hover].total) * 100 : 0;
              return (
                <div key={l.id} className="flex justify-between gap-3">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2" style={{ backgroundColor: l.color }} aria-hidden />
                    {l.id === "other" ? t.otherShort : l.label}
                  </span>
                  <span>
                    {formatMarketCap(v)} <span className="text-ink/40">{share.toFixed(1)}%</span>
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between gap-3 border-t border-rule mt-1 pt-1 font-semibold">
              <span>{t.total}</span>
              <span>{formatMarketCap(rows[hover].total)}</span>
            </div>
            {!rows[hover].complete && <div className="text-ink/50 mt-0.5">{t.incompleteBucket}</div>}
          </div>
        )}
      </div>

      <p className="text-[11px] text-ink/40 mt-2">
        {t.note}
        {anyIncomplete && ` ${t.incompleteNote}`}
        {missing.length > 0 && ` ${t.missingVenues(missing.join(", "))}`}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

export type GapLine = { id: string; label: string; color: string; values: (number | null)[] };

const HEIGHT = 260;
const PAD = { top: 12, right: 12, bottom: 26, left: 52 };

// Symmetric around 0 and sized to the 98th percentile, so one thin-liquidity
// spike doesn't flatten everything else; clipped points sit on the edge and
// the tooltip still shows their real value.
function yDomain(values: number[]): number {
  const abs = values.map(Math.abs).sort((a, b) => a - b);
  const p = abs[Math.min(abs.length - 1, Math.floor(abs.length * 0.98))] ?? 0;
  return Math.max(p * 1.15, 0.05);
}

function niceTicks(domain: number): number[] {
  const raw = domain / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let v = -Math.floor(domain / step) * step; v <= domain + 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

export function GapChart({
  buckets,
  lines,
  band,
  bandLabel,
  referenceLabel,
  formatBucket,
  formatAxisBucket,
}: {
  buckets: number[];
  lines: GapLine[];
  band: { min: number | null; max: number | null }[];
  bandLabel: string;
  referenceLabel: string;
  formatBucket: (ms: number) => string;
  formatAxisBucket: (ms: number) => string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const all = [...lines.flatMap((l) => l.values), ...band.flatMap((b) => [b.min, b.max])].filter((v): v is number => v !== null);
  const domain = yDomain(all);
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const n = buckets.length;
  const x = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const y = (v: number) => PAD.top + ((domain - Math.max(-domain, Math.min(domain, v))) / (2 * domain)) * innerH;

  function path(values: (number | null)[]): string {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  // Band polygon per contiguous run of buckets that have both edges.
  const bandPaths: string[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length > 1) {
      const top = run.map((i) => `${x(i).toFixed(1)},${y(band[i].max!).toFixed(1)}`);
      const bottom = [...run].reverse().map((i) => `${x(i).toFixed(1)},${y(band[i].min!).toFixed(1)}`);
      bandPaths.push(`M${top.join("L")}L${bottom.join("L")}Z`);
    }
    run = [];
  };
  band.forEach((b, i) => (b.min !== null && b.max !== null ? run.push(i) : flush()));
  flush();

  const xTickCount = Math.max(2, Math.min(6, Math.floor(innerW / 110)));
  const xTicks = Array.from({ length: xTickCount }, (_, k) => Math.round((k / (xTickCount - 1)) * (n - 1)));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / innerW) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  }

  const fmt = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(3)}%`);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink/70 mb-2">
        {lines.map((l) => (
          <span key={l.id} className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5" style={{ backgroundColor: l.color }} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-2.5 bg-ink/15" />
          {bandLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 border-t border-dashed border-ink/60" />
          {referenceLabel}
        </span>
      </div>
      <svg width={width} height={HEIGHT} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${referenceLabel}: ${lines.map((l) => l.label).join(", ")}`}>
        {niceTicks(domain).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="currentColor" className={t === 0 ? "text-ink/60" : "text-ink/10"} strokeDasharray={t === 0 ? "4 3" : undefined} />
            <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-ink/50 text-[10px] tabular-nums">
              {`${t > 0 ? "+" : ""}${t}%`}
            </text>
          </g>
        ))}
        {bandPaths.map((d, k) => (
          <path key={k} d={d} className="fill-ink/15" />
        ))}
        {lines.map((l) => (
          <path key={l.id} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={1.5} strokeLinejoin="round" />
        ))}
        {xTicks.map((i) => (
          <text key={i} x={x(i)} y={HEIGHT - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="fill-ink/50 text-[10px]">
            {formatAxisBucket(buckets[i])}
          </text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} className="stroke-ink/40" />}
      </svg>
      {hover !== null && (
        <div
          className="absolute top-8 pointer-events-none bg-paper border border-ink/30 px-2 py-1.5 text-[11px] shadow-sm tabular-nums"
          style={x(hover) > width / 2 ? { right: width - x(hover) + 8 } : { left: x(hover) + 8 }}
        >
          <div className="font-semibold mb-0.5">{formatBucket(buckets[hover])}</div>
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-3">
              <span style={{ color: l.color }}>{l.label}</span>
              <span>{fmt(l.values[hover])}</span>
            </div>
          ))}
          <div className="flex justify-between gap-3 text-ink/60">
            <span>{bandLabel}</span>
            <span>
              {fmt(band[hover]?.min ?? null)} … {fmt(band[hover]?.max ?? null)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

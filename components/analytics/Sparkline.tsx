import { utcDateTime } from "@/lib/time";

export function Sparkline({
  points,
  label,
}: {
  points: { time: number; value: number }[];
  label: string;
}) {
  if (points.length < 2) {
    return <p className="text-xs text-ink/50 py-4">Not enough history to draw a chart yet.</p>;
  }

  const width = 600;
  const height = 100;
  const padding = 4;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padding + (i / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-24"
        role="img"
        aria-label={`${label}: from ${first.value.toFixed(2)} to ${last.value.toFixed(2)}`}
      >
        <polyline points={coords.join(" ")} fill="none" stroke="#fdc800" strokeWidth={2} />
      </svg>
      <div className="flex justify-between text-[10px] text-ink/40 mt-1">
        <span>{utcDateTime(first.time)}</span>
        <span>{utcDateTime(last.time)}</span>
      </div>
    </div>
  );
}

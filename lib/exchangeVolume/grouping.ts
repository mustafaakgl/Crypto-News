// Pure — no network, no "server-only"; exercised by scripts/verify-exchange-volume.ts.
// Days are integers: days since 1970-01-01 (UTC).

export type Grouping = "day" | "week" | "month";

export type DayBucket = {
  startDay: number; // first calendar day of the bucket (may be before the range)
  endDay: number; // last calendar day of the bucket (may be after the range)
  calendarDays: number;
};

// 1970-01-01 was a Thursday; weeks start on Monday (ISO).
function weekStart(day: number): number {
  return day - ((day + 3) % 7);
}

function monthBounds(day: number): { start: number; end: number } {
  const d = new Date(day * 86_400_000);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 86_400_000;
  const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 86_400_000 - 1;
  return { start, end };
}

export function bucketsFor(fromDay: number, toDay: number, grouping: Grouping): DayBucket[] {
  const out: DayBucket[] = [];
  let day = fromDay;
  while (day <= toDay) {
    let start = day;
    let end = day;
    if (grouping === "week") {
      start = weekStart(day);
      end = start + 6;
    } else if (grouping === "month") {
      ({ start, end } = monthBounds(day));
    }
    out.push({ startDay: start, endDay: end, calendarDays: end - start + 1 });
    day = end + 1;
  }
  return out;
}

// Sums a daily series into buckets. `daysWithData` < `calendarDays` means the
// bucket is incomplete (clipped by the range, or days missing from the series).
export function sumIntoBuckets(buckets: DayBucket[], series: { day: number; value: number }[]): { value: number; daysWithData: number }[] {
  const out = buckets.map(() => ({ value: 0, daysWithData: 0 }));
  let b = 0;
  for (const p of [...series].sort((x, y) => x.day - y.day)) {
    while (b < buckets.length && buckets[b].endDay < p.day) b++;
    if (b >= buckets.length) break;
    if (p.day < buckets[b].startDay) continue;
    out[b].value += p.value;
    out[b].daysWithData++;
  }
  return out;
}

"use client";

import { useState } from "react";
import type { CexVenue } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap, formatQuantity } from "@/lib/format";

type SortKey = "rank" | "name" | "trust" | "volumeBtc" | "volumeUsd";

function sortVenues(venues: CexVenue[], key: SortKey, dir: 1 | -1): CexVenue[] {
  const sorted = [...venues];
  sorted.sort((a, b) => {
    switch (key) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "trust":
        return dir * ((a.trustScore ?? -1) - (b.trustScore ?? -1));
      case "volumeUsd":
        return dir * ((a.volumeUsd ?? -1) - (b.volumeUsd ?? -1));
      case "volumeBtc":
      case "rank":
      default:
        return dir * (a.volumeBtc - b.volumeBtc);
    }
  });
  return sorted;
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: 1 | -1; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-ink">
      {label}
      {active && <span aria-hidden>{dir === 1 ? "▲" : "▼"}</span>}
    </button>
  );
}

export function CexTable({ venues, onExpand, expandedId }: { venues: CexVenue[]; onExpand: (id: string) => void; expandedId: string | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("volumeBtc");
  const [dir, setDir] = useState<1 | -1>(-1);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    } else {
      setSortKey(key);
      setDir(-1);
    }
  }

  const sorted = sortVenues(venues, sortKey, dir);

  if (venues.length === 0) {
    return <p className="text-sm text-ink/50 py-4">No CEX venues available for this selection.</p>;
  }

  return (
    <table className="w-full text-sm border-collapse">
      <caption className="sr-only">Centralized exchange spot volume ranking, sortable by column</caption>
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
          <th scope="col" className="py-2 pr-2">
            #
          </th>
          <th scope="col" className="py-2 pr-2">
            <SortButton label="Exchange" active={sortKey === "name"} dir={dir} onClick={() => handleSort("name")} />
          </th>
          <th scope="col" className="py-2 pr-2">
            <SortButton label="Trust score" active={sortKey === "trust"} dir={dir} onClick={() => handleSort("trust")} />
          </th>
          <th scope="col" className="py-2 pr-2 text-right">
            <SortButton label="Volume (BTC)" active={sortKey === "volumeBtc"} dir={dir} onClick={() => handleSort("volumeBtc")} />
          </th>
          <th scope="col" className="py-2 pr-2 text-right">
            <SortButton label="Volume (USD)" active={sortKey === "volumeUsd"} dir={dir} onClick={() => handleSort("volumeUsd")} />
          </th>
          <th scope="col" className="py-2">
            Details
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((v, i) => (
          <tr key={v.id} className="border-b border-rule/60">
            <td className="py-2 pr-2 text-ink/50">{i + 1}</td>
            <td className="py-2 pr-2">
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline decoration-accent decoration-2">
                {v.name}
              </a>
            </td>
            <td className="py-2 pr-2 text-ink/70">{v.trustScore !== null ? `${v.trustScore}/10` : "—"}</td>
            <td className="py-2 pr-2 text-right tabular-nums">{formatQuantity(v.volumeBtc, "BTC")}</td>
            <td className="py-2 pr-2 text-right tabular-nums">
              {v.volumeUsd !== null ? formatMarketCap(v.volumeUsd) : "—"}
              {v.usdRateBasis === "current_rate" && <span className="text-[10px] text-ink/40 block">at today&apos;s rate</span>}
            </td>
            <td className="py-2">
              <button
                type="button"
                onClick={() => onExpand(v.id)}
                aria-expanded={expandedId === v.id}
                className="text-xs font-semibold uppercase tracking-wide border border-ink/30 px-2 py-1 hover:border-ink"
              >
                {expandedId === v.id ? "Hide" : "Pairs"}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

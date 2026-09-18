"use client";

import { useState } from "react";
import type { DexProtocol } from "@/lib/exchangeAnalytics/types";
import { formatMarketCap, formatPct } from "@/lib/format";

type SortKey = "name" | "volumeUsd" | "change";

function sortProtocols(protocols: DexProtocol[], key: SortKey, dir: 1 | -1): DexProtocol[] {
  const sorted = [...protocols];
  sorted.sort((a, b) => {
    if (key === "name") return dir * a.name.localeCompare(b.name);
    if (key === "change") return dir * ((a.change1d ?? -Infinity) - (b.change1d ?? -Infinity));
    return dir * (a.volumeUsd - b.volumeUsd);
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

export function DexTable({ protocols }: { protocols: DexProtocol[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("volumeUsd");
  const [dir, setDir] = useState<1 | -1>(-1);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setDir((d) => (d === 1 ? -1 : 1) as 1 | -1);
    } else {
      setSortKey(key);
      setDir(-1);
    }
  }

  const sorted = sortProtocols(protocols, sortKey, dir);

  if (protocols.length === 0) {
    return <p className="text-sm text-ink/50 py-4">No DEX protocols available for this selection.</p>;
  }

  return (
    <table className="w-full text-sm border-collapse">
      <caption className="sr-only">DEX spot volume ranking by protocol, sortable by column</caption>
      <thead>
        <tr className="text-left text-[11px] uppercase tracking-wide text-ink/50 border-b border-rule">
          <th scope="col" className="py-2 pr-2">
            #
          </th>
          <th scope="col" className="py-2 pr-2">
            <SortButton label="Protocol" active={sortKey === "name"} dir={dir} onClick={() => handleSort("name")} />
          </th>
          <th scope="col" className="py-2 pr-2">
            Chains
          </th>
          <th scope="col" className="py-2 pr-2 text-right">
            <SortButton label="Volume (USD)" active={sortKey === "volumeUsd"} dir={dir} onClick={() => handleSort("volumeUsd")} />
          </th>
          <th scope="col" className="py-2 text-right">
            <SortButton label="24h Δ" active={sortKey === "change"} dir={dir} onClick={() => handleSort("change")} />
          </th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p, i) => (
          <tr key={p.id} className="border-b border-rule/60">
            <td className="py-2 pr-2 text-ink/50">{i + 1}</td>
            <td className="py-2 pr-2 font-semibold">{p.name}</td>
            <td className="py-2 pr-2 text-ink/60 text-xs">
              {p.chains.length > 2 ? `${p.chains.slice(0, 2).join(", ")} +${p.chains.length - 2}` : p.chains.join(", ") || "—"}
            </td>
            <td className="py-2 pr-2 text-right tabular-nums">{formatMarketCap(p.volumeUsd)}</td>
            <td className={`py-2 text-right tabular-nums ${p.change1d === null ? "text-ink/40" : p.change1d >= 0 ? "text-green-700" : "text-red-700"}`}>
              {p.change1d !== null ? formatPct(p.change1d) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

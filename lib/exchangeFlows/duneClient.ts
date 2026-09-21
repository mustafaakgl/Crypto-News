import "server-only";
import { delay } from "@/lib/httpClient";

const BASE = "https://api.dune.com/api/v1";
const POLL_MS = 5000;
const TIMEOUT_MS = 10 * 60 * 1000;

export type DuneResult = { rows: Record<string, unknown>[]; credits: number | null; executionId: string };

export function duneConfigured(): boolean {
  return Boolean(process.env.DUNE_API_KEY);
}

// Server-side only: the key is read from the environment and never sent to the browser.
export async function runDuneSql(sql: string): Promise<DuneResult> {
  const key = process.env.DUNE_API_KEY;
  if (!key) throw new Error("DUNE_API_KEY is not set");
  const headers = { "X-Dune-Api-Key": key, "Content-Type": "application/json" };

  const exec = await fetch(`${BASE}/sql/execute`, { method: "POST", headers, body: JSON.stringify({ sql }), cache: "no-store" });
  const execJson = (await exec.json()) as { execution_id?: string; error?: string };
  if (!exec.ok || !execJson.execution_id) throw new Error(`Dune execute failed (HTTP ${exec.status}): ${execJson.error ?? "no execution id"}`);
  const executionId = execJson.execution_id;

  const deadline = Date.now() + TIMEOUT_MS;
  let status: { state?: string; execution_cost_credits?: number; error?: { message?: string } } = {};
  while (Date.now() < deadline) {
    await delay(POLL_MS);
    const res = await fetch(`${BASE}/execution/${executionId}/status`, { headers, cache: "no-store" });
    status = await res.json();
    if (status.state !== "QUERY_STATE_PENDING" && status.state !== "QUERY_STATE_EXECUTING") break;
  }
  if (status.state !== "QUERY_STATE_COMPLETED") {
    throw new Error(`Dune execution ${executionId} ended as ${status.state ?? "timeout"}: ${status.error?.message ?? ""}`.trim());
  }

  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  for (;;) {
    const res = await fetch(`${BASE}/execution/${executionId}/results?limit=1000&offset=${offset}`, { headers, cache: "no-store" });
    const json = (await res.json()) as { result?: { rows?: Record<string, unknown>[] }; next_offset?: number };
    rows.push(...(json.result?.rows ?? []));
    if (json.next_offset === undefined || json.next_offset === null) break;
    offset = json.next_offset;
  }
  return { rows, credits: typeof status.execution_cost_credits === "number" ? status.execution_cost_credits : null, executionId };
}

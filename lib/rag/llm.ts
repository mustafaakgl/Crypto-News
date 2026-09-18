import "server-only";

// OpenAI-compatible chat completion client. Matches the LLM_BASE_URL /
// LLM_API_KEY / LLM_MODEL env var convention already used elsewhere in this
// project's design docs, so Anthropic / OpenAI / OpenRouter / a local model
// all plug in with the same three env vars — no new paid account is opened
// by this code.
export type LlmConfig = { baseUrl: string; apiKey: string; model: string };

export function getLlmConfig(): LlmConfig | null {
  const baseUrl = process.env.LLM_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!baseUrl || !apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

export type LlmChatMessage = { role: "system" | "user"; content: string };

export type LlmOutcome =
  | { ok: true; content: string }
  | { ok: false; error: string };

const LLM_TIMEOUT_MS = 20000;
const MAX_OUTPUT_TOKENS = 700;

export async function callLlm(config: LlmConfig, messages: LlmChatMessage[]): Promise<LlmOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        max_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) return { ok: false, error: "LLM provider rate limit reached." };
    if (!res.ok) return { ok: false, error: `LLM provider error (HTTP ${res.status}).` };

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "LLM provider returned an empty response." };
    return { ok: true, content };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { ok: false, error: "LLM request timed out." };
    }
    return { ok: false, error: err instanceof Error ? err.message : "LLM request failed." };
  } finally {
    clearTimeout(timer);
  }
}

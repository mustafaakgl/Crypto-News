// A local, in-process OpenAI-compatible mock LLM server used ONLY for
// exercising real pipelines end-to-end through the real Next.js dev server,
// without opening any real paid LLM account. Not part of the app itself.
// Serves BOTH shapes this project's server code expects:
//   - Price Action /api/explain (store -> retrieval -> llm.ts -> citations.ts -> cache.ts)
//   - News detail /api/news-analysis (contentScope -> llm.ts -> citations.ts -> cache.ts)
// The request shape is auto-detected from the prompt text (chunkId: vs
// sourceRecordId:), so one mock server + one `mode` control covers both.
// Run with: node scripts/mock-llm-server.ts <port>
import http from "node:http";

const port = Number(process.argv[2] ?? 8799);

type Mode = "ok" | "fabricated" | "malformed" | "http500" | "empty" | "price_target";
let mode: Mode = "ok";
let chatCompletionCalls = 0;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function extractFirstChunkId(promptText: string): string | null {
  const m = promptText.match(/chunkId:\s*(\S+)/);
  return m ? m[1] : null;
}

function extractFirstSourceRecordId(promptText: string): string | null {
  const m = promptText.match(/sourceRecordId:\s*(\S+)/);
  return m ? m[1] : null;
}

const server = http.createServer(async (req, res) => {
  const body = await readBody(req);

  if (req.url === "/_control/mode" && req.method === "POST") {
    const parsed = JSON.parse(body) as { mode: Mode };
    mode = parsed.mode;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, mode }));
    return;
  }

  if (req.url === "/_control/calls" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ chatCompletionCalls }));
    return;
  }

  if (req.url === "/_control/reset-calls" && req.method === "POST") {
    chatCompletionCalls = 0;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.url === "/chat/completions" && req.method === "POST") {
    chatCompletionCalls++;

    if (mode === "http500") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "mock upstream failure" }));
      return;
    }

    const parsedReq = JSON.parse(body) as { messages: Array<{ content: string }> };
    const userContent = parsedReq.messages?.[1]?.content ?? "";
    const isNewsRequest = userContent.includes("sourceRecordId:");

    let structured: unknown;
    if (mode === "malformed") {
      structured = "this is not JSON at all {{{";
    } else if (mode === "fabricated") {
      structured = isNewsRequest
        ? JSON.stringify({
            keyTakeaways: ["A claim attributed to a source record that was never actually sent."],
            limitedSourceDetail: false,
            whyItMatters: "This would matter if it were grounded in a real source.",
            analystTake: "This take cites a source record id that does not exist in what was retrieved.",
            watchNext: ["A follow-up point."],
            sourceRecordIds: ["totally-fabricated-source-record-id-that-was-never-sent"],
          })
        : JSON.stringify({
            observation: "The chart shows a mixed structure with recent swing points.",
            interpretation: "This relates to the source's discussion of horizontal lines at swing points.",
            limitations: "This is a rule-based reading, not a validated trading signal.",
            citations: ["totally-fabricated-chunk-id-that-was-never-retrieved"],
          });
    } else if (mode === "empty") {
      structured = isNewsRequest
        ? JSON.stringify({ keyTakeaways: [], limitedSourceDetail: true, whyItMatters: "", analystTake: "Insufficient information for analysis", watchNext: [], sourceRecordIds: [] })
        : JSON.stringify({ observation: "", interpretation: "", limitations: "", citations: [] });
    } else if (mode === "price_target" && isNewsRequest) {
      const sourceRecordId = extractFirstSourceRecordId(userContent);
      structured = JSON.stringify({
        keyTakeaways: ["The article reports a development involving the named entity."],
        limitedSourceDetail: true,
        whyItMatters: "This could move the price.",
        analystTake: "This could push the price toward $120,000 within weeks, a fabricated price target not grounded in any source record.",
        watchNext: ["Price action over the next few days."],
        sourceRecordIds: sourceRecordId ? [sourceRecordId] : [],
      });
    } else if (isNewsRequest) {
      const sourceRecordId = extractFirstSourceRecordId(userContent);
      structured = JSON.stringify({
        keyTakeaways: [
          "The article reports a concrete development involving the named entity and asset.",
          "The source frames this as a reported event, not yet a finalized outcome.",
        ],
        limitedSourceDetail: true,
        whyItMatters: "This is relevant to the related asset because it touches its regulatory or market structure.",
        analystTake:
          "If this development proceeds, it could modestly affect sentiment for the related asset over the coming weeks. The key uncertainty is whether the reported step is finalized or reversed. This reading would weaken if follow-up coverage contradicts the initial report.",
        watchNext: ["Confirmation or denial from an official source in the coming days."],
        sourceRecordIds: sourceRecordId ? [sourceRecordId] : [],
      });
    } else {
      const chunkId = extractFirstChunkId(userContent);
      structured = JSON.stringify({
        observation: "The current structure reads as a mixed, two-sided range based on the app's own confirmed swing points.",
        interpretation: "The source discusses how horizontal lines at swing highs and lows mark key price levels traders watch for tests and reversals.",
        limitations: "This is background reading from the book, not proof that the described pattern is present on this chart, and not a trading recommendation.",
        citations: chunkId ? [chunkId] : [],
      });
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        choices: [{ message: { content: typeof structured === "string" ? structured : JSON.stringify(structured) } }],
      })
    );
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

server.listen(port, () => {
  console.log(`mock-llm-server listening on http://localhost:${port}`);
});

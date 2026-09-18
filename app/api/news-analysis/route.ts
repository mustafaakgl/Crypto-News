import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/news";
import { analyzeNews } from "@/lib/newsAnalysis/analyze";

// The request body accepts only an article id. The server independently
// re-fetches the current, trusted RSS feeds itself and looks up the
// matching item — it never summarizes free-form text a client sends, which
// would let a client fabricate "source content" for the model to analyze.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "error", message: "Invalid request body." }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : null;
  if (!id) {
    return NextResponse.json({ status: "error", message: "Invalid article id." }, { status: 400 });
  }

  const { items } = await getNews();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return NextResponse.json(
      { status: "error", message: "This article is no longer available in the current feed." },
      { status: 200 }
    );
  }

  const result = await analyzeNews(item);
  return NextResponse.json(result);
}

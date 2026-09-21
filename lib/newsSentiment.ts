// Pure — rule-based headline tone; exercised by scripts/verify-news-sentiment.ts.
// A keyword heuristic, not a model: it reads what the headline says happened
// (a rally, a hack, an approval), not whether that's good for any holder.

export type NewsSentiment = "positive" | "negative";

const POSITIVE = [
  "surge[sd]?", "soar(s|ed|ing)?", "rall(y|ies|ied|ying)", "jump(s|ed)?", "climb(s|ed)?", "gain(s|ed)?", "rise[sn]?", "rose",
  "record high", "all-time high", "new high", "rebound(s|ed)?", "recover(s|ed|y)?", "bounce[sd]? back",
  "approv(e|es|ed|al)", "green[- ]?light(s|ed)?", "greenlit", "launch(es|ed)?", "partner(s|ship|ships|ed)?",
  "adopt(s|ed|ion)?", "buy(s|ing)?", "bought", "purchas(e|es|ed)", "acquire[sd]?", "acquisition", "inflows?", "bullish",
  "upgrade[sd]?", "wins?", "won", "secure[sd]?", "raises? \\$", "expand(s|ed)?", "expansion", "integrat(es|ed|ion)",
  "milestone", "outperform(s|ed)?", "beats?", "boost(s|ed)?", "backs", "backed", "champion(s|ed)?", "welcome[sd]?",
  "accumulat(e|es|ed|ion)", "breaks? above", "optimis(m|tic)", "strong demand", "record inflows?",
  "advance[sd]?", "(nerves|fears|concerns|jitters) (fade|fades|faded|ease|eases|eased)",
  "(tops?|hits?|reclaims?|(blasts?|breaks?|pushes?|climbs?) (past|above)) \\$",
];

const NEGATIVE = [
  "plunge[sd]?", "crash(es|ed)?", "tumble[sd]?", "slump(s|ed)?", "drop(s|ped)?", "falls?", "fell", "slide[sd]?", "slid",
  "sink(s)?", "sank", "dump(s|ed)?", "sell-?off", "liquidat(ed|ion|ions)", "hack(s|ed|er|ers)?", "exploit(s|ed)?",
  "breach(es|ed)?", "stolen", "theft", "scam(s|mer|mers)?", "fraud", "lawsuits?", "sue[sd]?", "charged", "indict(ed|ment)",
  "arrest(s|ed)?", "ban(s|ned)?", "crackdown", "penalt(y|ies)", "fined", "probe[sd]?", "investigat(es|ed|ion)",
  "sanction(s|ed)?", "outflows?", "bearish", "bankrupt(cy)?", "insolven(t|cy)", "collapse[sd]?", "delist(s|ed|ing)?",
  "halt(s|ed)?", "suspend(s|ed)?", "warn(s|ed|ing)?", "fears?", "loss(es)?", "lose[s]?", "lost", "decline[sd]?",
  "downgrade[sd]?", "reject(s|ed)?", "den(y|ies|ied)", "launder(ing|ed)?", "outage", "falls? short", "setback",
  "slashe[sd]?", "cuts? (jobs|staff)", "layoffs?", "breaks? below", "pessimis(m|tic)",
  "attacks?", "hostages?", "kidnap(s|ped|ping)?", "robb(ed|ery)", "allegations?", "accus(es|ed|ation)", "fake", "defeat(s|ed)?",
];

const toRegex = (terms: string[]) => new RegExp(`\\b(${terms.join("|")})\\b`, "gi");
const POSITIVE_RE = toRegex(POSITIVE);
const NEGATIVE_RE = toRegex(NEGATIVE);
// A negator shortly before a term flips it: "not approved", "fails to rally", "no longer bullish".
const NEGATOR_BEFORE = /\b(not|no|never|without|fails? to|failed to|unable to|no longer)\s+(\w+\s+){0,2}$/i;

// Liquidated or squeezed SHORT positions mean the price went up; read them
// as a rally before the plain word "liquidated" can count against the story.
const SHORT_SQUEEZE = /\b(short squeezes?|shorts?( positions?)?[^.]{0,40}?liquidat\w*|liquidat\w*[^.]{0,20}?shorts?|bearish bets)\b/gi;

function score(rawText: string): number {
  const text = rawText.replace(SHORT_SQUEEZE, " rally ");
  let total = 0;
  for (const [re, sign] of [
    [POSITIVE_RE, 1],
    [NEGATIVE_RE, -1],
  ] as const) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const before = text.slice(Math.max(0, m.index - 40), m.index);
      total += NEGATOR_BEFORE.test(before) ? -sign : sign;
    }
  }
  return total;
}

const TITLE_WEIGHT = 2;
const THRESHOLD = 2;

// The headline carries the story, so it counts double; a single clear
// headline cue is enough, while mixed signals that cancel out stay unlabeled.
export function classifySentiment(title: string, description = ""): NewsSentiment | null {
  const s = score(title) * TITLE_WEIGHT + score(description);
  if (s >= THRESHOLD) return "positive";
  if (s <= -THRESHOLD) return "negative";
  return null;
}

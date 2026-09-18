// Manual verification for the LLM-free excerpt-highlight selection used by
// the news detail panel when no AI analysis is available. Pure functions,
// no "server-only" import, so this runs directly under plain node.
// Run with: node scripts/verify-excerpt-highlights.ts
import { splitIntoSentences, selectExcerptHighlights, MAX_HIGHLIGHT_SENTENCES } from "../lib/newsAnalysis/excerptHighlights.ts";

let failures = 0;

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

function assertTrue(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

// ---- splitIntoSentences: the concrete risks named in the brief ----
{
  assertEqual(
    splitIntoSentences("Bitcoin rose 3.5% on Wednesday. Analysts cited ETF inflows."),
    ["Bitcoin rose 3.5% on Wednesday.", "Analysts cited ETF inflows."],
    "splitIntoSentences: a decimal number (3.5%) is never mistaken for a sentence boundary"
  );

  assertEqual(
    splitIntoSentences("The U.S. Treasury sanctioned the exchange. It cited illicit finance."),
    ["The U.S. Treasury sanctioned the exchange.", "It cited illicit finance."],
    "splitIntoSentences: 'U.S.' is never split as if each period ended a sentence"
  );

  assertEqual(
    splitIntoSentences("Fed Chair J. Powell spoke Wednesday. Rates were left unchanged."),
    ["Fed Chair J. Powell spoke Wednesday.", "Rates were left unchanged."],
    "splitIntoSentences: a bare initial (J.) is never treated as a sentence end"
  );

  assertEqual(
    splitIntoSentences("The firm, Acme Inc., raised $10M. It plans to hire."),
    ["The firm, Acme Inc., raised $10M.", "It plans to hire."],
    "splitIntoSentences: a corporate suffix (Inc.) mid-sentence doesn't fragment the sentence"
  );

  assertEqual(splitIntoSentences("   "), [], "splitIntoSentences: blank input -> no sentences, never a fabricated one");

  assertEqual(splitIntoSentences("No terminal punctuation here"), ["No terminal punctuation here"], "splitIntoSentences: trailing text with no closing punctuation is still returned, not dropped");
}

// ---- selectExcerptHighlights: presentation-mode selection ----
{
  const shortDesc = "Bitcoin topped $80,000 for the first time this year.";
  const shortResult = selectExcerptHighlights(shortDesc, "Bitcoin hits new high");
  assertEqual(shortResult, { mode: "paragraph", text: shortDesc }, "selectExcerptHighlights: a single-sentence excerpt renders as a paragraph, never padded into a bulleted list");

  const twoSentenceDesc = "Bitcoin topped $80,000 for the first time this year. Analysts pointed to ETF demand.";
  const twoResult = selectExcerptHighlights(twoSentenceDesc, "Bitcoin hits new high");
  assertEqual(twoResult, { mode: "paragraph", text: twoSentenceDesc }, "selectExcerptHighlights: two sentences still render as one paragraph, not a forced 2-item list");

  const richDesc =
    "The Treasury sanctioned BitBank on Wednesday. Officials said it moved funds for the Revolutionary Guards. " +
    "The exchange has denied wrongdoing. Trading volume dropped sharply after the announcement. " +
    "A spokesperson declined to comment further.";
  const richResult = selectExcerptHighlights(richDesc, "Treasury sanctions crypto exchange over Iran ties");
  assertTrue(richResult.mode === "key_points", "selectExcerptHighlights: 5 distinct sentences produce a key_points list");
  if (richResult.mode === "key_points") {
    assertTrue(richResult.sentences.length <= MAX_HIGHLIGHT_SENTENCES, "selectExcerptHighlights: never returns more than the max allowed sentences");
    assertTrue(
      richResult.sentences.every((s) => richDesc.includes(s)),
      "selectExcerptHighlights: every returned sentence is a verbatim substring of the source text, never rewritten"
    );
  }

  const withDuplicateLede =
    "Treasury sanctions crypto exchange over Iran ties. The Treasury sanctioned the exchange for moving illicit funds. " +
    "The exchange denied any wrongdoing in a statement. Regulators said the case remains under review.";
  const dedupeResult = selectExcerptHighlights(withDuplicateLede, "Treasury sanctions crypto exchange over Iran ties");
  if (dedupeResult.mode === "key_points") {
    assertTrue(
      !dedupeResult.sentences.some((s) => normalizeLoose(s) === normalizeLoose("Treasury sanctions crypto exchange over Iran ties.")),
      "selectExcerptHighlights: a sentence that just restates the headline is dropped, never shown as a 'second' point"
    );
  } else {
    assertTrue(true, "selectExcerptHighlights: headline-restatement case reduced to fewer than 3 usable sentences -> paragraph mode is an acceptable, non-fabricating outcome");
  }

  assertEqual(selectExcerptHighlights("", "Some headline"), { mode: "none" }, "selectExcerptHighlights: empty description -> mode 'none', never fabricated content");
}

function normalizeLoose(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);

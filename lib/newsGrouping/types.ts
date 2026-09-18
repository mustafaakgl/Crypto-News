export type StoryCategory = "fomc-decision" | "fomc-minutes" | "fomc-expectation" | "generic";

export const STORY_CATEGORY_LABEL: Record<StoryCategory, string> = {
  "fomc-decision": "FOMC decision",
  "fomc-minutes": "FOMC minutes",
  "fomc-expectation": "FOMC expectation",
  generic: "",
};

// Precomputed server-side (needs the FOMC calendar) and handed to the
// client so it never has to re-derive calendar-verified event identity
// itself — grouping into visible stories still happens client-side, over
// whatever the current search/coin/source filters leave in scope.
export type FomcGroupAssignment = { groupId: string; category: Exclude<StoryCategory, "generic"> };

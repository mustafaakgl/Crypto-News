// Manual verification for the rule-based headline tone.
// Run with: node scripts/verify-news-sentiment.ts
import { classifySentiment } from "../lib/newsSentiment.ts";

let failures = 0;
function check(title: string, description: string, expected: string | null) {
  const got = classifySentiment(title, description);
  if (got !== expected) {
    failures++;
    console.error(`FAIL "${title}": expected ${expected}, got ${got}`);
  } else {
    console.log(`ok   ${expected ?? "unlabeled"}: ${title}`);
  }
}

check("Bitmine bought $75 million ether as Tom Lee says institutions are still underweight crypto", "The largest Ethereum-centric treasury firm kept buying.", "positive");
check("Strategy returns to bitcoin buys, adding 1,200 BTC", "", "positive");
check("Layer-2 and DeFi tokens lead broad crypto advance as post-Fed hike nerves fade", "Starknet and arbitrum gained more than 17%.", "positive");
check("Bitcoin price surges past $90,000 to record high", "", "positive");
check("SEC approves spot solana ETFs", "", "positive");
check("UAE, Sweden Arrest Seven Over $7.1M Crypto Laundering Ring", "Investigators say tracing the network's crypto transactions exposed links.", "negative");
check("Exchange hacked for $40 million in hot wallet exploit", "", "negative");
check("Ether plunges 12% as liquidations mount", "", "negative");
check("SEC sues crypto lender over fraud", "", "negative");
check("SEC does not approve spot ether ETF", "", "negative");
check("Bitcoin fails to rally despite ETF inflows", "", null);
check("Treasury Secretary outlines stablecoin framework", "The proposal would set reserve requirements for issuers.", null);
check("Bitcoin weathers September storm as rate hikes and Clarity act setback test bulls", "Bitcoin is down just 1.5% in its historically weakest month and remains on track for its first quarterly gain in a year.", null);
check("Buyback program announced by miner", "", null);
check("Bitcoin Tops $85K as $648M in Crypto Shorts Liquidated", "", "positive");
check("Bitcoin hits $85,000 as short squeeze forces out $648 million of bearish bets", "", "positive");
check("Longs liquidated as bitcoin slides below $80,000", "", "negative");
check("Crypto Worker's Children Held Hostage in Latest French 'Wrench Attack'", "", "negative");
check("Block Times Fall 17% in Latest Speed Upgrade", "", null);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nall checks passed");

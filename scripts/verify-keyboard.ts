// Real keyboard verification using Playwright against the live dev server.
// Run with: node scripts/verify-keyboard.ts
// (requires `npm run dev` already running on http://localhost:3000)
import { chromium } from "playwright";

let failures = 0;
function check(cond: boolean, label: string) {
  if (!cond) {
    failures++;
    console.error(`FAIL ${label}`);
  } else {
    console.log(`ok   ${label}`);
  }
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/en/analytics?asset=BTC&tab=price-action&interval=4h", {
    waitUntil: "networkidle",
  });

  // ---- WAI-ARIA Tabs: roving tabindex + arrow-key focus movement ----
  const tabIndexes = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="tab"]')).map((el) => ({
      text: el.textContent?.trim(),
      tabIndex: el.getAttribute("tabindex"),
      selected: el.getAttribute("aria-selected"),
    }))
  );
  check(
    tabIndexes.filter((t) => t.tabIndex === "0").length === 1 && tabIndexes.find((t) => t.tabIndex === "0")?.text === "Price Action",
    "roving tabindex: only the selected tab (Price Action) has tabindex=0"
  );
  check(
    tabIndexes.filter((t) => t.tabIndex === "-1").length === 3,
    "roving tabindex: the other three tabs have tabindex=-1 (out of the Tab order)"
  );

  // Focus the active tab directly (simulates Tab landing on it from outside the tablist).
  await page.focus("#analytics-tab-price-action");
  await page.keyboard.press("ArrowRight");
  const afterRight = await page.evaluate(() => ({
    focused: document.activeElement?.id,
    selectedTab: document.querySelector('[aria-selected="true"]')?.id,
  }));
  check(afterRight.focused === "analytics-tab-volume", "ArrowRight: moves focus to the next tab (Volume)");
  check(
    afterRight.selectedTab === "analytics-tab-price-action",
    "ArrowRight: does NOT activate the tab by itself (manual activation) — Price Action panel is still selected"
  );

  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const afterEnter = await page.evaluate(() => ({
    selectedTab: document.querySelector('[aria-selected="true"]')?.id,
    url: window.location.href,
    panelExists: !!document.getElementById("analytics-panel-volume"),
    priceActionPanelExists: !!document.getElementById("analytics-panel-price-action"),
  }));
  check(afterEnter.selectedTab === "analytics-tab-volume", "Enter on focused tab: activates it (Volume now selected)");
  check(afterEnter.url.includes("tab=volume"), "Enter on focused tab: URL updates to tab=volume");
  check(afterEnter.panelExists, "activating a tab: its tabpanel is mounted");
  check(!afterEnter.priceActionPanelExists, "activating a tab: the previous tab's panel is unmounted (not just hidden)");

  // ArrowLeft should move back.
  await page.keyboard.press("ArrowLeft");
  const afterLeft = await page.evaluate(() => document.activeElement?.id);
  check(afterLeft === "analytics-tab-price-action", "ArrowLeft: moves focus back to Price Action");

  // Home/End.
  await page.keyboard.press("End");
  check((await page.evaluate(() => document.activeElement?.id)) === "analytics-tab-on-chain", "End: moves focus to the last tab (On-chain)");
  await page.keyboard.press("Home");
  check((await page.evaluate(() => document.activeElement?.id)) === "analytics-tab-price-action", "Home: moves focus to the first tab (Price Action)");

  // Space should also activate.
  await page.keyboard.press("ArrowRight"); // -> Volume
  await page.keyboard.press("ArrowRight"); // -> Derivatives
  await page.keyboard.press(" ");
  await page.waitForTimeout(300);
  check(
    (await page.evaluate(() => document.querySelector('[aria-selected="true"]')?.id)) === "analytics-tab-derivatives",
    "Space on focused tab: activates it (Derivatives)"
  );
  check((await page.evaluate(() => window.location.href)).includes("tab=derivatives"), "Space activation updates the URL too");

  // Derivatives tab must NOT show the Interval control.
  check(
    (await page.locator('[aria-label="Select time interval"]').count()) === 0,
    "Derivatives tab: no Interval (1H/4H/1D) control shown"
  );

  // ---- Back to Price Action: S/R toggle keyboard behavior (inside the tab now) ----
  await page.goto("http://localhost:3000/en/analytics?asset=BTC&tab=price-action&interval=4h", { waitUntil: "networkidle" });
  const srButton = page.getByRole("button", { name: /support\/resistance lines/i });
  await srButton.focus();
  const before = await srButton.getAttribute("aria-pressed");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(150);
  const after = await srButton.getAttribute("aria-pressed");
  check(before !== after, `S/R toggle: Enter flips aria-pressed (${before} -> ${after})`);

  // Asset switch via keyboard (Tab to ETH, Enter) preserves the active tab.
  await page.goto("http://localhost:3000/en/analytics?asset=BTC&tab=derivatives&interval=4h", { waitUntil: "networkidle" });
  const ethButton = page.getByRole("button", { name: "ETH", exact: true });
  await ethButton.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const afterAssetSwitch = await page.evaluate(() => ({
    url: window.location.href,
    selectedTab: document.querySelector('[aria-selected="true"]')?.id,
  }));
  check(afterAssetSwitch.url.includes("asset=ETH") && afterAssetSwitch.url.includes("tab=derivatives"), "keyboard asset switch preserves the active tab in the URL");
  check(afterAssetSwitch.selectedTab === "analytics-tab-derivatives", "keyboard asset switch preserves the active tab in the UI");

  await browser.close();
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

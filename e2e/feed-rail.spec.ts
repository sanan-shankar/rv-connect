import { test, expect } from "@playwright/test";

/* Regression guard for the bug the owner reported on 2026-11-05: the feed's
 * right rail pinned by its top edge, so once its three cards were taller than
 * the window the last one sat below the fold for good ("I can't access it").
 * Measured then: the pinned rail ran 28px to 910px, so at 1280x720 "This week
 * in Letters" was entirely out of reach. StickyRail now pins a tall rail by
 * its bottom edge instead.
 *
 * One number covers both cases, so this does not depend on which modules
 * happen to show today (Letters only appears in a week with a letter): after
 * scrolling, a rail that fits keeps 28px above it, a rail that does not keeps
 * 28px below its last card. Either way, 28.
 *
 * 1280x720 is the shortest common laptop window, the one where the old rail
 * lost a whole card. Polled, and scrolled inside each attempt, because the
 * feed's posts and the Collection's photograph both arrive after load and
 * change the page's length and the rail's height. */
test("the last card in the feed rail can always be scrolled into view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "the feed has no rail at mobile width");

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/feed");
  await expect(page.locator("[data-feed-rail]")).toBeVisible();

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          window.scrollTo(0, 1500);
          const box = document.querySelector("[data-feed-rail]")!.getBoundingClientRect();
          const fits = box.height <= window.innerHeight - 56;
          return Math.round(fits ? box.top : window.innerHeight - box.bottom);
        }),
      { timeout: 15_000, message: "the pinned rail's outer gap is not the page's 28px margin" },
    )
    .toBe(28);
});

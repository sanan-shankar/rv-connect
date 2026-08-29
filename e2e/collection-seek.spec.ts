import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ *
 *  The decade rail SEEKS, and nothing moves under the reader's eye.
 *
 *  Two facts, both of which look fine in a screenshot and are only
 *  visible as numbers, so they are pinned here rather than watched.
 *
 *  1. Pressing a decade travels to it; it does not filter to it. The
 *     version this replaced narrowed the grid to the decade pressed,
 *     which also collapsed the rail to a single mark and hid it --
 *     leaving no way back: "I now have no way to go back? ... doing that
 *     has locked me into 2020s" (owner, 2026-08-29). A river you can
 *     still scroll out of in both directions is the fix, and "there are
 *     other decades on the page afterwards" is how you can tell.
 *
 *  2. When a page of newer photographs arrives ABOVE the reader, the
 *     photograph they are looking at does not move. That is the whole
 *     feel of the thing and it is one arithmetic slip away from being
 *     a page that lurches every time it loads.
 *
 *  Driven against /lab/collection, because the live archive holds four
 *  photographs and cannot exercise any of this; the room's 240 are
 *  deterministic (see _archive.ts), so the decades below are stable.
 *
 *  Written AFTER the behaviour was measured by hand, per CLAUDE.md
 *  gotcha 7 -- these numbers were read off a live page first, never
 *  discovered by re-running this file.
 * ------------------------------------------------------------------ */

/** The rail lives in the 1280px margin, so there is nothing to press below
 *  it -- deliberately, until the phone scrubber is built. */
const desktopOnly = (name: string) =>
  test.skip(name === "mobile", "the decade rail is xl-only; the phone gets its own scrubber");

const rail = (page: import("@playwright/test").Page) =>
  page.locator('nav[aria-label^="Jump to when"]');

async function readInChronologicalOrder(page: import("@playwright/test").Page) {
  await page.goto("/lab/collection");
  await page.getByRole("button", { name: /^Order:/ }).click();
  await page.getByRole("menuitem", { name: "Chronological" }).click();

  /* Readiness is the LIT MARK, not a heading -- and that is a fact about
     this archive worth stating. The newest decade alone fills the first
     page, so the river is a single band and renders no heading whatsoever
     (there is nothing to fold). The rail is lit anyway, because what it
     shows falls back to the decade the top photograph belongs to; waiting
     on a heading here waits forever. */
  await expect(rail(page).locator('button[aria-current="true"]')).toBeVisible();
}

test("pressing a decade travels there, and leaves the rest of the river in place", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await readInChronologicalOrder(page);

  await rail(page).getByRole("button", { name: /1970s/ }).click();

  /* The decade asked for is on the page... */
  await expect(page.locator('h2[data-era="1970s"]')).toBeVisible();

  /* ...and so are decades on BOTH sides of it, which is the difference
     between a seek and a filter. A filter would leave exactly one. */
  const eras = await page.locator("h2[data-era]").evaluateAll((hs) =>
    hs.map((h) => (h as HTMLElement).dataset.era ?? ""),
  );
  expect(eras.length).toBeGreaterThan(1);
  expect(eras).toContain("1960s"); // older than the one pressed
  expect(eras.some((e) => /^(19[89]0s|20[0-2]0s)$/.test(e))).toBeTruthy(); // and newer

  /* The rail says where the reader now is, and it is a fact read off the
     page rather than the filter they set. */
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveText(/1970s/);
});

test("pressing a decade from another order turns the river to Chronological", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);

  /* The rail is drawn in EVERY order, because the marks are a picture of what
     the archive holds and that is worth having at rest. But a decade is only
     a position along a date spine, so pressing one in "Newest" -- where the
     river is sorted by upload date -- has to commit to reading in time
     rather than quietly doing nothing. */
  await page.goto("/lab/collection");
  await expect(page.getByRole("button", { name: /^Order:/ })).toHaveText(/Newest/);
  await expect(rail(page)).toBeVisible();
  // Nothing is lit, because "which decade am I in" has no answer here.
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveCount(0);

  await rail(page).getByRole("button", { name: /1970s/ }).click();

  await expect(page.getByRole("button", { name: /^Order:/ })).toHaveText(/Chronological/);
  await expect(page.locator('h2[data-era="1970s"]')).toBeVisible();
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveText(/1970s/);
});

test("a page arriving above the reader does not move the photograph they are looking at", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await readInChronologicalOrder(page);
  await rail(page).getByRole("button", { name: /1970s/ }).click();
  await expect(page.locator('h2[data-era="1970s"]')).toBeVisible();

  /* Mark a photograph in the middle of the viewport -- the one whose
     stillness is the promise -- and remember where it sits on SCREEN. */
  const marked = await page.evaluate(() => {
    const img = [...document.querySelectorAll("section img")].find((i) => {
      const r = i.getBoundingClientRect();
      return r.top > 200 && r.top < 600;
    });
    if (!img) return null;
    (img as HTMLElement).dataset.probe = "1";
    return {
      top: img.getBoundingClientRect().top,
      height: document.scrollingElement!.scrollHeight,
    };
  });
  expect(marked, "no photograph in the middle of the viewport to watch").not.toBeNull();

  /* Climb until a page actually lands above us. Nothing is worth measuring
     until it does, and it takes more than one screen of climbing to reach
     the sentinel. */
  const STEP = 400;
  let climbed = 0;
  await expect
    .poll(
      async () => {
        if (await page.evaluate(() => window.scrollY <= 0)) return true;
        await page.evaluate((s) => window.scrollBy(0, -s), STEP);
        climbed += STEP;
        return page.evaluate(
          (was) => document.scrollingElement!.scrollHeight > was,
          marked!.height,
        );
      },
      { timeout: 30_000, message: "no page ever arrived above the reader" },
    )
    .toBeTruthy();

  // Let the prepend settle: the correction runs before paint, but the page
  // that triggered it is still arriving.
  await page.waitForTimeout(500);

  const after = await page.evaluate(() => {
    const img = document.querySelector('img[data-probe="1"]');
    return img
      ? {
          top: img.getBoundingClientRect().top,
          height: document.scrollingElement!.scrollHeight,
        }
      : null;
  });
  expect(after, "the watched photograph left the page").not.toBeNull();

  /* Real content did arrive above -- otherwise this test proves nothing. */
  expect(after!.height).toBeGreaterThan(marked!.height);

  /* And the watched photograph sits exactly as far down the screen as the
     reader's own climbing put it, and not one pixel further. NOT measured
     against scrollY: when a page lands above, the anchor adds its height to
     scrollTop on purpose, so scrollY moves by design and using it as the
     ruler reports a jump where there is none. A pixel of slack for
     sub-pixel layout; a real regression here is hundreds. */
  const drift = after!.top - marked!.top - climbed;
  expect(Math.abs(drift), `the page jumped ${Math.round(drift)}px`).toBeLessThanOrEqual(1);
});

import { test, expect, type Page } from "@playwright/test";

/* ------------------------------------------------------------------ *
 *  The picture memory.
 *
 *  One baseline per route per viewport, in e2e/__screenshots__/. A run
 *  either says "identical" or hands you a three-up diff (expected /
 *  actual / difference) in playwright-report.
 *
 *  When a change is INTENTIONAL:  npm run visual:update
 *  When it is not:                open the report and look at the diff.
 *
 *  Adding a route: add a line to ROUTES. Nothing else.
 * ------------------------------------------------------------------ */

type Route = {
  path: string;
  name: string;
  /** Why this route is worth remembering. Every entry states one. */
  why: string;
  /** Signed-out surfaces skip the stored admin cookie. */
  anonymous?: boolean;
};

const ROUTES: Route[] = [
  { path: "/", name: "landing", why: "the front door; the only page a stranger sees", anonymous: true },
  { path: "/login", name: "login", why: "auth chrome + the hoopoe eye-cover easter egg", anonymous: true },
  { path: "/feed", name: "feed", why: "the spine: ContentColumn width, PostCard, composer" },
  { path: "/directory", name: "directory", why: "the map is the distinctive draw and the most fragile layout" },
  { path: "/letters", name: "letters", why: "the reading surface and its serif type scale" },
  { path: "/catchups", name: "catchups", why: "rebuilt surface, most recent churn" },
  { path: "/collection", name: "collection", why: "photo grid; catches image-sizing regressions" },
  { path: "/support", name: "support", why: "the tree backdrop + CostBar, retuned three times" },
  { path: "/birds", name: "birds", why: "50 avatar glyphs; catches a broken plumage path fast" },
  { path: "/about", name: "about", why: "static copy; a canary for global token drift" },
];

/* Relative timestamps ("3h ago") tick between runs and would fail every
 * baseline within the hour. Playwright paints a flat box over these, so
 * the surrounding layout is still compared -- only the digits are
 * excused. Cheaper and less invasive than threading a data-attribute
 * through the ten components that call formatTimeAgo (src/lib/utils.ts). */
function volatileRegions(page: Page) {
  return [
    page.getByText(/^(just now|\d+[mhdw] ago)$/),
    /* The recovery fill on /support is LIVE (costs-card.tsx:16): it moves
     * whenever a contribution lands, so its width is real data, not a
     * design decision. Masked by its own role rather than a new
     * data-attribute, so no product code changes to serve the tests. */
    page.getByRole("progressbar"),
    /* The hoopoe idles FOREVER -- it breathes and blinks with no rest
     * state, so its crest and eyes differ between any two shots. Caught on
     * the first honest re-run (2026-08-19): /login desktop failed on the
     * mascot alone, everything around it clean.
     *
     * Masking it loses no coverage: the mascot already has two purpose-
     * built checks of its own, scripts/qa/hoopoe-idle-check.mjs and
     * hoopoe-landing-check.mjs. This suite watches the page it sits on. */
    page.locator(".hoopoe-mascot"),
  ];
}

/* networkidle never arrives on a page that polls or holds a stream open,
 * and a hard wait on it fails the test for a reason that has nothing to do
 * with how the page looks. Bounded, and a miss is not fatal: the font and
 * image settling below is what actually makes a shot deterministic. */
async function quiet(page: Page, ms = 8_000) {
  await page.waitForLoadState("networkidle", { timeout: ms }).catch(() => {});
}

/** Settle the page: fonts swapped, images decoded, no in-flight work. */
async function settle(page: Page) {
  await quiet(page);
  await page.evaluate(() => document.fonts.ready);
  /* Lazy images below the fold never decode at rest, so a full-page shot
   * catches half of them mid-swap. Scroll to the bottom, then back. */
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.scrollTo(0, 0);
  });
  await quiet(page);
  /* Every <img> actually decoded, so the grid on /collection and the 50
   * glyphs on /birds are never caught half-painted. */
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((img) => !img.complete)
        .map((img) => img.decode().catch(() => {})),
    ),
  );
}

for (const route of ROUTES) {
  test(`${route.name} looks unchanged`, async ({ page }) => {
    /* Signed-out surfaces: drop the admin cookie rather than building a
     * second context. Playwright gives every test its own context already,
     * so clearing here cannot leak into another test -- and this keeps the
     * project's viewport, DPR and reducedMotion exactly as configured,
     * which hand-rolling a context would quietly lose. */
    if (route.anonymous) await page.context().clearCookies();

    await page.goto(route.path, { waitUntil: "domcontentloaded" });
    await settle(page);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
      mask: volatileRegions(page),
    });
  });
}

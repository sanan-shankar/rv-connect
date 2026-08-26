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
  /** See LIVE ROUTES below. "band" masks the content under the page header;
   *  "map" masks only the world map and its headcount. */
  live?: "band" | "map";
};

const ROUTES: Route[] = [
  { path: "/", name: "landing", why: "the front door; the only page a stranger sees", anonymous: true },
  { path: "/login", name: "login", why: "auth chrome + the hoopoe eye-cover easter egg", anonymous: true },
  { path: "/feed", name: "feed", why: "the spine: ContentColumn width and offset", live: "band" },
  { path: "/directory", name: "directory", why: "the map is the distinctive draw and the most fragile layout", live: "map" },
  { path: "/letters", name: "letters", why: "the reading surface: the narrow measure the serif needs", live: "band" },
  { path: "/catchups", name: "catchups", why: "rebuilt surface, most recent churn", live: "band" },
  { path: "/collection", name: "collection", why: "photo grid; catches image-sizing regressions" },
  { path: "/support", name: "support", why: "the tree backdrop + CostBar, retuned three times" },
  { path: "/birds", name: "birds", why: "50 avatar glyphs; catches a broken plumage path fast" },
  { path: "/about", name: "about", why: "static copy; a canary for global token drift" },
  { path: "/privacy", name: "privacy", why: "the policy shell; one page stands in for all three documents", anonymous: true },
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
    /* The notification bell's unread DOT is live data: it appears the moment
     * anybody comments, likes or joins anything, and it sits in the mobile
     * header of every single route. Four mobile checks -- collection, support,
     * birds, about -- went red on 2026-08-25 with that dot as the only
     * differing pixels, on pages nothing had touched. That is the suite crying
     * wolf about somebody else's activity, which is exactly what this list is
     * for. The bell has its own behaviour covered by the notification tests;
     * this suite watches the pages it sits on. */
    page.getByRole("button", { name: /notifications/i }),
  ];
}

/* ---- LIVE ROUTES ------------------------------------------------- *
 *
 * Four routes photograph a database that real people are changing. A new
 * post, a new signup, one saved draft, and the page below it moves --
 * so feed, directory, letters and catchups were red on every run from
 * 2026-08-25 onward, on both viewports, for reasons no commit caused.
 * Session 1 of the refactor campaign inherited all eight failures and
 * could not tell them apart from a real regression, which is the whole
 * cost: a suite that is red every morning gets read as noise, and then
 * the ninth failure -- the real one -- is read as noise too.
 *
 * They are NOT rebaselined against today's posts, because a baseline
 * made from those is stale by tomorrow's. Each is masked as narrowly as
 * its own drift allows, which is two different amounts:
 *
 * "band" -- feed, letters, catchups. Inserting one post or saving one
 * draft moves everything below it, so no per-element mask helps: the
 * page is shot at viewport height and the content under the page header
 * is covered. What still fails a bad commit: the sidebar, the mobile
 * header, the page background, and the header band itself -- the serif
 * title, the Canopy pill, the spacing -- which is where a token change
 * shows up first. Plus spine(), which pins the content column's exact x
 * and width as numbers with a readable message.
 *
 * "map" -- directory, which drifts far more narrowly: the headcount, and
 * cluster circles that grow as people sign up. Its layout is the most
 * fragile in the app and the reason it is in this suite, so only the map
 * drawing and the headcount are masked. The search field, the filter
 * pills, the Map/Batches toggle and the map's own container box are all
 * still compared, full page.
 *
 * What is given up either way: how one post, letter or Catch-up card
 * renders. This suite could never hold that steady against a database
 * real people are writing to.
 *
 * The other seven routes are unchanged: full page, nothing masked but
 * the volatile bits below. /collection is deliberately NOT in this list
 * -- photos arrive rarely enough that its picture still means something,
 * and it is the one that catches image-sizing regressions.
 *
 * If full coverage of these four is ever wanted back, the fix is seeded
 * content, not a bigger mask: point the suite at a database it owns.
 * ------------------------------------------------------------------ */

/* Mark the live band so it can be masked by selector. The page header --
   title plus its actions -- is the first thing inside <main> and starts
   at main's own top; member content is the next band down. So: descend
   through the wrappers that begin at the top, and mark the first run of
   elements that begins clear of the header. No product code carries a
   test attribute for this; the marking happens on the page, at run time,
   and dies with the context. */
async function markLiveBand(page: Page) {
  const marked = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return 0;
    const top = main.getBoundingClientRect().top;
    let n = 0;
    const visit = (el: Element) => {
      for (const child of Array.from(el.children)) {
        const r = child.getBoundingClientRect();
        if (r.height === 0) continue;
        if (r.top - top >= 50) {
          child.setAttribute("data-visual-live", "");
          n += 1;
        } else visit(child);
      }
    };
    visit(main);
    return n;
  });
  /* Nothing marked means the shape of the page changed under the rule and
     the mask is now silently covering nothing -- the failure mode that
     makes a masked suite worthless. Fail loudly instead. */
  expect(marked, "no live content band found to mask").toBeGreaterThan(0);
}

/** What each live route masks, beyond the volatile bits every route masks. */
function liveRegions(page: Page, route: Route) {
  if (route.live === "band") return [page.locator("[data-visual-live]")];
  if (route.live === "map")
    return [
      /* The map drawing itself. `touch-none select-none` is functional --
         it stops a drag selecting the continents -- so it is a steadier
         hook than any layout class. */
      page.locator("main svg.touch-none"),
      /* "63 people", which changes with every signup. */
      page.getByText(/^\d[\d,]*\s+(people|person)$/),
    ];
  return [];
}

/** The spine: content sits in one column, the same width on every route. */
async function spine(page: Page, name: string) {
  const box = await page.locator("main").boundingBox();
  expect(box, `${name}: no <main> to measure`).not.toBeNull();
  const viewport = page.viewportSize()!;
  const sidebar = viewport.width >= 1180 ? 248 : 0;
  expect(Math.round(box!.x), `${name}: content column starts at the wrong x`).toBe(sidebar);
  expect(
    Math.round(box!.width),
    `${name}: content column is the wrong width`,
  ).toBe(viewport.width - sidebar);
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

    if (route.live) await spine(page, route.name);
    if (route.live === "band") await markLiveBand(page);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      /* A "band" route is shot at viewport height: full-page would change
         size the moment somebody posts, and a size mismatch fails before
         any mask is even consulted. */
      fullPage: route.live !== "band",
      mask: [...volatileRegions(page), ...liveRegions(page, route)],
    });
  });
}

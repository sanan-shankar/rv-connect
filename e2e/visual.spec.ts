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
  /* LIVE as of 2026-08-29, and it had not been marked so. The archive held
     four photographs for long enough that the grid looked like fixed content;
     it went to twelve mid-session and the baseline failed on photographs
     alone, with every pixel of chrome identical. That is the cry-wolf failure
     the masking exists to prevent -- a red run nobody can act on teaches
     people to run visual:update without looking, which is the one way to make
     this suite worthless. What is still compared is what this route was added
     for: the header band, the serif title and its swap caret, the sidebar, the
     background, and spine(). */
  { path: "/collection", name: "collection", why: "the header band and the spine; the grid below it is live", live: "band" },
  /* The Collection's other half. Its own line because it is a DIFFERENT page
     -- a different title, a flipped caret, no bucket line at all -- and the
     valley baseline above would never notice any of it moving.

     THAT DAY ARRIVED, 2026-09-02, exactly as the note here predicted: the
     admin account's own class gained 1,719 photographs when the owner's album
     was imported, and both viewports went red on photographs with every pixel
     of chrome identical. So it is masked like the valley half now, and for the
     same reason -- a red run nobody can act on teaches people to run
     visual:update without looking, which is the one way to make this suite
     worthless.

     What it costs: the empty state, which is what every class sees on its
     first day, is no longer compared. There is no account left to shoot it
     from, so the honest answer is that it is uncovered rather than that it is
     covered by this. What is still compared is what the route was added for:
     the title, the flipped caret, the absent bucket line, the sidebar and
     spine(). */
  { path: "/collection?scope=class", name: "collection-class", why: "the class half: the flipped caret and the title; the grid below is live", live: "band" },
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
    /* The phone's Collection scrubber. It was masked on 2026-09-02 because it
     * was a TIMER -- raised by a scroll, gone a second and a half later, so
     * whether a screenshot caught it mid-fade depended on how long the page
     * took to settle. That reason expired on 2026-09-12: it stays put now.
     *
     * It stays masked for a different one. Whether it is drawn at all depends
     * on the river having loaded enough photographs to make the page taller
     * than the window, and the river lazy-loads -- so its presence is a race
     * with image decoding rather than a fact about the design. Its POSITION
     * rides the scroll offset besides.
     *
     * No coverage lost: it has four checks of its own in
     * e2e/collection-seek.spec.ts, including that it IS there at rest and
     * does not take itself away again. */
    page.locator('button[aria-label^="Jump to when"]'),
  ];
}

/* ---- LIVE ROUTES ------------------------------------------------- *
 *
 * Six routes photograph a database that real people are changing. A new
 * post, a new signup, one saved draft, and the page below it moves --
 * so feed, directory, letters and catchups were red on every run from
 * 2026-08-25 onward, on both viewports, for reasons no commit caused.
 * /collection joined them on 2026-08-29 and /collection?scope=class on
 * 2026-09-02; each of those two carries its own note above its line.
 * Session 1 of the refactor campaign inherited all eight failures and
 * could not tell them apart from a real regression, which is the whole
 * cost: a suite that is red every morning gets read as noise, and then
 * the ninth failure -- the real one -- is read as noise too.
 *
 * They are NOT rebaselined against today's posts, because a baseline
 * made from those is stale by tomorrow's. Each is masked as narrowly as
 * its own drift allows, which is two different amounts:
 *
 * "band" -- feed, letters, catchups and both halves of the Collection.
 * Inserting one post, saving one draft or importing one album moves
 * everything below it, so no per-element mask helps: the
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
 * The remaining routes are unchanged: full page, nothing masked but the
 * volatile bits below. /collection USED to be the counter-example here
 * -- "photos arrive rarely enough that its picture still means
 * something, and it is the one that catches image-sizing regressions" --
 * and that reversed twice in five days, for the reasons written above
 * its two lines. Image sizing has no picture watching it now.
 *
 * If full coverage of any of these is ever wanted back, the fix is
 * seeded content, not a bigger mask: point the suite at a database it
 * owns.
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
    let foot = 0;
    let left = Infinity;
    let right = -Infinity;
    const visit = (el: Element) => {
      for (const child of Array.from(el.children)) {
        const r = child.getBoundingClientRect();
        if (r.height === 0) continue;
        if (r.top - top >= 50) {
          child.setAttribute("data-visual-live", "");
          foot = Math.max(foot, r.bottom);
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
          n += 1;
        } else visit(child);
      }
    };
    visit(main);
    /* Masking the marked boxes alone covers the band at TODAY's height, so
       the strip between the band's foot and the viewport's was still being
       compared -- and that strip is empty background only until the content
       grows into it. Six more Catch-ups arrived, the band got 160px taller
       on both viewports, and the suite went red for a database write. That
       is the exact cry-wolf the masking above exists to prevent. The block
       comment already stated the intent -- "the content under the page
       header is covered" -- so this is that sentence implemented.
       Constrained to the band's OWN x-range, never the full viewport: the
       sidebar, the two gutters and the background sit outside it and the
       comment above promises they are still compared. `position: fixed` so
       appending it reflows nothing, and it dies with the context. */
    if (n > 0 && foot < window.innerHeight) {
      const tail = document.createElement("div");
      tail.setAttribute("data-visual-live-tail", "");
      tail.style.cssText =
        `position:fixed;bottom:0;pointer-events:none;` +
        `top:${Math.floor(foot)}px;left:${Math.floor(left)}px;` +
        `width:${Math.ceil(right - left)}px`;
      document.body.appendChild(tail);
    }
    return n;
  });
  /* Nothing marked means the shape of the page changed under the rule and
     the mask is now silently covering nothing -- the failure mode that
     makes a masked suite worthless. Fail loudly instead. */
  expect(marked, "no live content band found to mask").toBeGreaterThan(0);
}

/** What each live route masks, beyond the volatile bits every route masks. */
function liveRegions(page: Page, route: Route) {
  if (route.live === "band")
    return [page.locator("[data-visual-live]"), page.locator("[data-visual-live-tail]")];
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
  /* Every <img> THAT WILL BE IN THE SHOT actually decoded, so the grid on
   * /collection and the 50 glyphs on /birds are never caught half-painted.
   *
   * Near the viewport, not every image on the page, and bounded by a timeout.
   * Both guards exist for the same reason: since the Collection draws its
   * whole archive at full height (river-geometry.ts), a page can hold several
   * hundred `loading="lazy"` images that are thousands of pixels away and will
   * never be fetched at all. `decode()` on one of those does not reject -- it
   * simply never settles -- so the old unbounded `Promise.all` hung until the
   * 90-second test timeout rather than failing on a diff. Only what can appear
   * in the screenshot needs to be decoded before taking it. */
  await page.evaluate(async () => {
    const reach = window.innerHeight * 2;
    const near = Array.from(document.images).filter((img) => {
      if (img.complete) return false;
      const r = img.getBoundingClientRect();
      return r.bottom > -reach && r.top < window.innerHeight + reach;
    });
    await Promise.all(
      near.map((img) =>
        Promise.race([
          img.decode().catch(() => {}),
          new Promise((r) => setTimeout(r, 2_000)),
        ]),
      ),
    );
  });
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

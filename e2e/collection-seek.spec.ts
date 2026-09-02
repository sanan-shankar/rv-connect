import { test, expect } from "@playwright/test";

/* ------------------------------------------------------------------ *
 *  The year rail SEEKS, and nothing moves under the reader's eye.
 *
 *  Two facts, both of which look fine in a screenshot and are only
 *  visible as numbers, so they are pinned here rather than watched.
 *
 *  1. Pressing a year travels to it; it does not filter to it. The
 *     version this replaced narrowed the grid to the band pressed,
 *     which also collapsed the rail to a single mark and hid it --
 *     leaving no way back: "I now have no way to go back? ... doing that
 *     has locked me into 2020s" (owner, 2026-08-29). A river you can
 *     still scroll out of in both directions is the fix, and "there are
 *     other years on the page afterwards" is how you can tell.
 *
 *  2. When a page of newer photographs arrives ABOVE the reader, the
 *     photograph they are looking at does not move. That is the whole
 *     feel of the thing and it is one arithmetic slip away from being
 *     a page that lurches every time it loads.
 *
 *  Driven against /lab/collection, because the live archive holds a
 *  handful of photographs and cannot exercise any of this; the room's
 *  240 are deterministic (see _archive.ts), so 1953 below is a year that
 *  is really there, with years on both sides of it.
 *
 *  Written AFTER the behaviour was measured by hand, per CLAUDE.md
 *  gotcha 7 -- these numbers were read off a live page first, never
 *  discovered by re-running this file.
 * ------------------------------------------------------------------ */

/** The rail lives in the 1280px margin, so there is nothing to press below
 *  it -- deliberately, until the phone scrubber is built. */
const desktopOnly = (name: string) =>
  test.skip(name === "mobile", "the year rail is xl-only; the phone gets its own scrubber");

const rail = (page: import("@playwright/test").Page) =>
  page.locator('nav[aria-label^="Jump to when"]');

/** What the rail is drawing right now. Every row is in the DOM at every
 *  moment -- what changes is whether it is painted and where it sits -- so
 *  this reads opacity, not visibility. */
const drawn = (page: import("@playwright/test").Page) =>
  rail(page).evaluate((nav) => {
    const rows = [...nav.querySelectorAll("button")];
    const shade = (el: Element) => Number(getComputedStyle(el).opacity);
    return {
      rows: rows.length,
      height: Math.round(nav.getBoundingClientRect().height),
      shown: rows.filter((r) => shade(r) > 0.5).map((r) => r.getAttribute("aria-label") ?? ""),
      /* The one number the owner's complaint reduces to. A rail that is
         resting must be all-or-nothing: "there's so many instances where it's
         these different shades of grey ... two numbers showing and they're
         both kind of half showing" (2026-08-31). */
      halfDrawn: rows.filter((r) => shade(r) > 0.02 && shade(r) < 0.98).length,
    };
  });

/** Wait for the rail to stop moving. Opening a decade is a dozen rows on a
 *  spring, and every one of them is fully painted long before it has
 *  arrived, so waiting on opacity alone hands back a rail whose rows are
 *  still travelling -- the box you read is not the box that will be there.
 *  Geometry is the readiness signal, per CLAUDE.md's rule for animated UI. */
async function settled(page: import("@playwright/test").Page) {
  let last = "";
  await expect
    .poll(
      async () => {
        const now = await rail(page).evaluate((nav) =>
          [...nav.querySelectorAll("button")]
            .map((r) => Math.round(r.getBoundingClientRect().top))
            .join(","),
        );
        const still = now === last;
        last = now;
        return still;
      },
      { message: "the rail never stopped moving" },
    )
    .toBeTruthy();
}

/** Point at a decade and wait for it to open. This is the whole gesture the
 *  rail has: closed, a decade's years are parked underneath it and take no
 *  pointer events, so a hand reaches 1953 by arriving at "1950s" and letting
 *  it open. Playwright hit-tests BEFORE it moves the mouse, so a spec that
 *  goes straight for the year waits for ever on a row the closed rail is
 *  deliberately covering. */
async function openDecade(page: import("@playwright/test").Page, decade: string) {
  /* Off the rail first, so it is closed before we point. An open decade's
     years cover the closed-list rows beneath it -- deliberately, so that
     reading them cannot re-choose the decade -- which means you cannot jump
     straight from one decade to another one below it. Leaving and coming
     back is the gesture a hand makes, and it is the one the rail is built
     for. */
  await page.mouse.move(20, 400);
  await settled(page);
  const at = (await rail(page).getByRole("button", { name: decade, exact: true }).boundingBox())!;
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  /* Ready when ANY year of that decade is out -- not when the decade's own
     first year is, which the archive need not hold at all: the 1950s in the
     fixture is one photograph from 1953. */
  await expect
    .poll(async () =>
      (await drawn(page)).shown.some((l) => /^\d{4}$/.test(l) && l.startsWith(decade.slice(0, 3))),
    )
    .toBeTruthy();
  await settled(page);
}

async function readInChronologicalOrder(page: import("@playwright/test").Page) {
  await page.goto("/lab/collection");
  await page.getByRole("button", { name: /^Order:/ }).click();
  await page.getByRole("menuitem", { name: "Chronological" }).click();

  /* Readiness is the LIT MARK: the rail lights the moment the order lands
     (from the top photograph's own year when the scrollspy has nothing to
     say yet), which makes it the one signal that exists in every state. */
  await expect(rail(page).locator('button[aria-current="true"]')).toBeVisible();
}

/** Press a year: open its decade, then press it. Addressed by `aria-label`,
 *  which every row carries whether or not it is currently painted. */
async function pressYear(page: import("@playwright/test").Page, year: string) {
  await openDecade(page, `${year.slice(0, 3)}0s`);
  await rail(page).getByRole("button", { name: year, exact: true }).click();
}

test("pressing a year travels there, and leaves the rest of the river in place", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await readInChronologicalOrder(page);

  await pressYear(page, "1953");

  /* The year asked for is on the page... */
  await expect(page.locator('h2[data-band="1953"]')).toBeVisible();

  /* ...and so are years on BOTH sides of it, which is the difference
     between a seek and a filter. A filter would leave exactly one. */
  const bands = await page.locator("h2[data-band]").evaluateAll((hs) =>
    hs.map((h) => (h as HTMLElement).dataset.band ?? ""),
  );
  expect(bands.length).toBeGreaterThan(1);
  expect(bands).toContain("1940"); // older than the one pressed
  expect(bands.some((b) => /^\d{4}$/.test(b) && Number(b) > 1953)).toBeTruthy(); // and newer

  /* The rail says where the reader now is, and it is a fact read off the
     page rather than the filter they set. Read with the pointer taken away,
     so the rail is closed: a collapsed decade lights when the reader is
     anywhere inside it, which is how the rail keeps answering "where am I"
     while the year itself is folded under it. */
  await page.mouse.move(20, 400);
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveAttribute(
    "aria-label",
    "1950s",
  );
});

test("pressing a year from another order turns the river to Chronological", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);

  /* The rail is drawn in EVERY order, because the marks are a picture of what
     the archive holds and that is worth having at rest. But a year is only a
     position along a date spine, so pressing one in "Newest" -- where the
     river is sorted by upload date -- has to commit to reading in time
     rather than quietly doing nothing. */
  await page.goto("/lab/collection");
  await expect(page.getByRole("button", { name: /^Order:/ })).toHaveText(/Newest/);
  await expect(rail(page)).toBeVisible();
  // Nothing is lit, because "which year am I in" has no answer here.
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveCount(0);

  await pressYear(page, "1953");

  await expect(page.getByRole("button", { name: /^Order:/ })).toHaveText(/Chronological/);
  await expect(page.locator('h2[data-band="1953"]')).toBeVisible();
  await page.mouse.move(20, 400);
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveAttribute(
    "aria-label",
    "1950s",
  );
});

/* ------------------------------------------------------------------ *
 *  A list of decades, and the one you point at opens into its years.
 *
 *  Two versions before this one tried to fit every year of the archive
 *  down the column at once and needed a proximity-driven opacity field
 *  to keep sixty eleven-pixel labels from colliding. It worked as
 *  designed and read as a mess: "so many instances where it's these
 *  different shades of grey ... two numbers showing and they're both
 *  kind of half showing ... it's just coming off as still so janky"
 *  (owner, 2026-08-31). The nesting does that job now, and the rule the
 *  fading broke is pinned here: at rest, nothing is half-drawn.
 * ------------------------------------------------------------------ */

test("the rail rests as decades and opens the one you point at", async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();

  const atRest = await drawn(page);
  expect(atRest.rows, "the fixture should span dozens of years").toBeGreaterThan(20);
  /* Only decades and Undated, so a good deal fewer rows than the archive has
     years. Loose on purpose: the exact count is the fixture's business. */
  expect(atRest.shown.length).toBeLessThan(atRest.rows / 3);
  expect(atRest.shown.every((l) => /s$/.test(l) || l === "Undated")).toBeTruthy();

  await openDecade(page, "1970s");
  const open = await drawn(page);
  expect(open.shown, "the decade's own years should be out").toContain("1974");
  /* And ONLY that decade's -- one open at a time is what keeps the rail's
     height constant and stops a move switching you twice. */
  expect(open.shown.filter((l) => /^\d{4}$/.test(l)).every((l) => l.startsWith("197"))).toBeTruthy();
  // The box never changes size, so there is no edge for the pointer to fall off.
  expect(open.height).toBe(atRest.height);

  // And it closes again when the pointer leaves.
  await page.mouse.move(20, 400);
  await expect.poll(async () => (await drawn(page)).shown).toEqual(atRest.shown);
});

test("nothing is ever left half-drawn", async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();

  expect((await drawn(page)).halfDrawn, "greys before anything was touched").toBe(0);

  /* Every decade in turn, settling on each. A row is either a row or it is
     not; there is no state in which one is a shade of the other. */
  for (const decade of ["2010s", "1990s", "1970s", "1950s"]) {
    await openDecade(page, decade);
    expect((await drawn(page)).halfDrawn, `greys while ${decade} was open`).toBe(0);
  }

  await page.mouse.move(20, 400);
  await settled(page);
  expect((await drawn(page)).halfDrawn, "greys after it closed again").toBe(0);
});

/* ------------------------------------------------------------------ *
 *  You can walk the whole rail without ever leaving it.
 *
 *  "I don't want to have to exit the siderail and enter again to get the
 *  next row" (owner, 2026-09-02). Travelling out of an open decade opens
 *  the next one, one at a time, in both directions.
 *
 *  Both halves of that are load-bearing. Opening whichever decade's
 *  block happens to contain the pointer looks right and is not: packed
 *  years give blocks of different heights, so leaving a ten-year decade
 *  drops the pointer clean past a one-year decade and into whatever is
 *  under THAT. Measured before the fix, a steady drag went 2020s, 2010s,
 *  2000s, 1970s, 1940s -- four decades skipped. Stepping one at a time
 *  fixes the leap and a travel brake fixes the speed.
 * ------------------------------------------------------------------ */

/** Drag the pointer down (or up) the rail and report the decades it opened,
 *  in order, with the repeats collapsed. */
async function walkTheRail(page: import("@playwright/test").Page, dir: "down" | "up") {
  const box = (await rail(page).boundingBox())!;
  const x = box.x + box.width - 10;
  const from = dir === "down" ? 6 : 600;
  const to = dir === "down" ? 600 : 6;
  const step = dir === "down" ? 12 : -12;
  const seen: string[] = [];
  for (let dy = from; dir === "down" ? dy < to : dy > to; dy += step) {
    await page.mouse.move(x, box.y + dy);
    const open = await rail(page).evaluate((nav) => {
      const years = [...nav.querySelectorAll("button")]
        .filter((r) => Number(getComputedStyle(r).opacity) > 0.5)
        .map((r) => r.getAttribute("aria-label") ?? "")
        .filter((l) => /^\d{4}$/.test(l));
      return years.length ? `${Math.floor(Number(years[0]) / 10) * 10}s` : "";
    });
    if (open && seen[seen.length - 1] !== open) seen.push(open);
  }
  return seen;
}

test("the rail can be walked decade by decade without leaving it", async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();

  const down = await walkTheRail(page, "down");
  expect(down.length, "a drag down the rail should open several decades").toBeGreaterThan(4);
  /* IN ORDER AND WITHOUT SKIPPING, which is the whole assertion: every
     decade the drag opened is exactly one older than the last. */
  const older = (a: string, b: string) => Number(b.slice(0, 4)) === Number(a.slice(0, 4)) - 10;
  expect(down.every((d, i) => i === 0 || older(down[i - 1], d)), down.join(" \u2192 ")).toBeTruthy();

  await page.mouse.move(20, 400);
  const up = await walkTheRail(page, "up");
  expect(up.length).toBeGreaterThan(4);
  expect(up.every((d, i) => i === 0 || older(d, up[i - 1])), up.join(" \u2192 ")).toBeTruthy();
});

/* ------------------------------------------------------------------ *
 *  And it stays with you down the whole river.
 *
 *  "The siderail shouldn't disappear when I scroll down, cause if I'm at
 *  1987 the only way to navigate is to scroll to the top?" (owner,
 *  2026-09-02). It had stopped being sticky: a `relative` class beside
 *  the `sticky` one, and Tailwind emits position utilities in its own
 *  order rather than the class string's, so `relative` won. Measured
 *  2312px off the top of the window after a scroll.
 * ------------------------------------------------------------------ */
test("the rail stays with the reader down the river", async ({ page }, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();

  await page.mouse.wheel(0, 2500);
  await expect
    .poll(async () => page.evaluate(() => Math.round(window.scrollY)))
    .toBeGreaterThan(1000);

  const where = await rail(page).evaluate((nav) => ({
    top: Math.round(nav.getBoundingClientRect().top),
    onScreen:
      nav.getBoundingClientRect().bottom > 0 &&
      nav.getBoundingClientRect().top < window.innerHeight,
    position: getComputedStyle(nav).position,
  }));
  expect(where.position, "the rail stopped being sticky").toBe("sticky");
  expect(where.onScreen, `the rail sat at ${where.top}px, off screen`).toBeTruthy();
});

/* ------------------------------------------------------------------ *
 *  And the rail itself fits, which is the whole reason it is not a
 *  list of decades any more.
 *
 *  "Make sure you're easily able to reach say 1956. Think about what
 *  you'd have to scroll" (owner, 2026-08-30). The answer is nothing: two
 *  moves, no scroll of the rail and no scroll of the page. The failure
 *  this pins is the one an early build had -- the rail sized against the
 *  height it has once it STICKS, which put its foot below the fold on
 *  arrival.
 * ------------------------------------------------------------------ */
test("every year is reachable without scrolling the rail or the page", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();
  // The tallest state there is: one decade open. It is the same height
  // whichever decade that is, so any of them answers for all of them.
  await openDecade(page, "1970s");

  const fit = await rail(page).evaluate((nav) => {
    const painted = [...nav.querySelectorAll("button")].filter(
      (r) => Number(getComputedStyle(r).opacity) > 0.5,
    );
    const last = painted[painted.length - 1].getBoundingClientRect();
    return {
      rows: painted.length,
      bottom: last.bottom,
      viewport: window.innerHeight,
      /* A scroll container inside a scroll container is the thing this design
         exists to avoid, so the assertion is on OVERFLOW rather than on
         scrollHeight: an 11px label in a 17px row can make the nav's content
         box a pixel or two taller than the nav with nothing scrollable about
         it, and a scrollHeight comparison reads that as a scrollbar. */
      overflow: getComputedStyle(nav).overflowY,
    };
  });

  expect(fit.rows, "a decade and its years should both be on show").toBeGreaterThan(10);
  expect(fit.overflow, "the rail became a scroll container").toBe("visible");
  expect(
    fit.bottom,
    `the oldest year sits ${Math.round(fit.bottom - fit.viewport)}px below the fold`,
  ).toBeLessThanOrEqual(fit.viewport);
});

test("a page arriving above the reader does not move the photograph they are looking at", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await readInChronologicalOrder(page);
  await pressYear(page, "1953");
  await expect(page.locator('h2[data-band="1953"]')).toBeVisible();

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

/* ------------------------------------------------------------------ *
 *  Where the reader is, after a JUMP rather than a scroll.
 *
 *  The scrollspy hangs off an IntersectionObserver whose root is the top
 *  fifth of the window, so it fires when a heading crosses THAT strip --
 *  which is what continuous scrolling does and what a jump does not.
 *  Landing with no heading inside the strip at either end changes no
 *  intersection state, delivers no callback, and leaves the reading
 *  stuck wherever it last settled: measured, the reader at the 2000
 *  heading with the rail lit on "Undated". It went unnoticed while it
 *  was only a mark glowing in a margin; the phone's scrubber prints the
 *  answer on screen, so it had to be right.
 * ------------------------------------------------------------------ */
test("the rail says where the reader is after a jump, not only after a scroll", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await readInChronologicalOrder(page);

  /* Far enough down that plenty of bands have loaded, then straight to a
     position no gradual scrolling reached. */
  await page.mouse.wheel(0, 12000);
  await expect.poll(async () => page.evaluate(() => Math.round(window.scrollY))).toBeGreaterThan(4000);

  for (const to of [3000, 9000, 1500]) {
    await page.evaluate((y) => window.scrollTo(0, y), to);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          let at = "";
          for (const h of document.querySelectorAll("h2[data-band]")) {
            if (h.getBoundingClientRect().top <= window.innerHeight * 0.2) {
              at = (h as HTMLElement).dataset.band ?? "";
            }
          }
          const lit = document
            .querySelector('nav[aria-label^="Jump to when"] button[aria-current="true"]')
            ?.getAttribute("aria-label");
          /* The rail lights the DECADE when its years are folded away, so a
             match is the lit row covering the band the reader is in. */
          return !at || !lit ? "" : lit.startsWith(at.slice(0, 3)) || lit === at ? "match" : `${lit} vs ${at}`;
        }),
      )
      .toBe("match");
  }
});

/* ------------------------------------------------------------------ *
 *  The phone's half of the same index.
 *
 *  "You have to think of an ingenious non-intrusive way of doing it on
 *  phone as well, something like the google photos scroller" (owner,
 *  2026-09-02). Non-intrusive is the part with teeth, so it is the part
 *  pinned first: at rest there is nothing there at all.
 *
 *  It scrubs the BANDS rather than the page, which is why it can be
 *  trusted on a cursor-paginated river: what is loaded is a window onto
 *  the archive, so a scrollbar's arithmetic would call 1978 by a
 *  different name every time another page arrived.
 * ------------------------------------------------------------------ */

const scrubber = (page: import("@playwright/test").Page) =>
  page.locator('button[aria-label^="Jump to when"]');

/** The rail is the desktop's; the scrubber is the phone's. */
const mobileOnly = (name: string) =>
  test.skip(name !== "mobile", "the scrubber is the phone's half; the desktop gets the rail");

async function readChronologicallyOnAPhone(page: import("@playwright/test").Page) {
  await page.goto("/lab/collection");
  await page.getByRole("button", { name: /^Order:/ }).click();
  await page.getByRole("menuitem", { name: "Chronological" }).click();
  await expect(page.locator("h2[data-band]").first()).toBeVisible();
}

test("the phone's scrubber is not there until the river moves", async ({ page }, testInfo) => {
  mobileOnly(testInfo.project.name);
  await readChronologicallyOnAPhone(page);

  // Nothing at rest. No track, no rule, no furniture down the edge.
  await expect(scrubber(page)).toHaveCount(0);

  await page.mouse.wheel(0, 3000);
  await expect(scrubber(page)).toBeVisible();
  /* And it says where you are, in the same words the river's own headings
     use -- the band, not a percentage. Read off the accessible name rather
     than the thumb's text, because the thumb HAS no text: it is a hairline,
     and the year only appears, large, once it is held. */
  await expect(scrubber(page)).toHaveAttribute("aria-label", /Now at (\d{4}|Undated)$/);
  /* Nothing large is drawn until it is held -- the whole of "non-intrusive". */
  await expect(page.locator("[data-scrub-year]")).toHaveCount(0);

  // And it goes again once the river stops.
  await expect(scrubber(page)).toHaveCount(0, { timeout: 6000 });
});

test("dragging the scrubber travels to the band it was let go on", async ({ page }, testInfo) => {
  mobileOnly(testInfo.project.name);
  await readChronologicallyOnAPhone(page);

  await page.mouse.wheel(0, 3000);
  await expect(scrubber(page)).toBeVisible();

  const from = (await scrubber(page).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  /* Down the track in steps, the way a thumb travels -- and the label has to
     follow it, or the reader is dragging blind. */
  const bandNow = async () =>
    ((await scrubber(page).getAttribute("aria-label")) ?? "").replace(/^.*Now at /, "");
  const seen = new Set<string>();
  for (const y of [0.35, 0.5, 0.65, 0.8]) {
    await page.mouse.move(from.x + from.width / 2, page.viewportSize()!.height * y);
    seen.add(await bandNow());
  }
  expect(seen.size, "the year should change as the thumb travels").toBeGreaterThan(1);

  /* And it is SAID, not merely tracked: the year reads out large beside the
     thumb while it is held. */
  await expect(page.locator("[data-scrub-year]")).toHaveText(await bandNow());

  const landed = await bandNow();
  await page.mouse.up();

  /* Released, the river is AT that band -- read off the heading the river's
     own scrollspy is reading, not off the pill that asked for it. */
  await expect
    .poll(async () =>
      page.evaluate(() => {
        let at = "";
        for (const h of document.querySelectorAll("h2[data-band]")) {
          if (h.getBoundingClientRect().top <= window.innerHeight * 0.2) at = (h as HTMLElement).dataset.band ?? "";
        }
        return at === "unknown" ? "Undated" : at;
      }),
    )
    .toBe(landed);
});

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

/** How many rows and how many names the rail is currently painting. Every
 *  row is in the DOM at every moment -- what changes is whether it is drawn
 *  and where it sits -- so this reads opacity, not visibility. */
const drawn = (page: import("@playwright/test").Page) =>
  rail(page).evaluate((nav) => {
    const rows = [...nav.querySelectorAll("button")];
    const on = (el: Element) => Number(getComputedStyle(el).opacity) > 0.5;
    return {
      rows: rows.length,
      height: Math.round(nav.getBoundingClientRect().height),
      shown: rows.filter(on).length,
      names: rows.filter((r) => on(r.querySelector("span:last-child")!)).length,
    };
  });

/** Put a pointer in the rail and wait for it to finish opening -- BOTH
 *  halves of that. Opening is sixty rows travelling on a spring, and every
 *  row is fully drawn long before it has arrived, so waiting on opacity
 *  alone hands back a rail whose rows are still moving: the box you read is
 *  not the box that will be there, and the pointer lands a few pixels off
 *  the row you meant. Geometry is the readiness signal, per CLAUDE.md's rule
 *  for animated UI. */
async function openRail(page: import("@playwright/test").Page) {
  const box = (await rail(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 8);
  await expect.poll(async () => (await drawn(page)).shown).toBe((await drawn(page)).rows);

  let last = -1;
  await expect
    .poll(
      async () => {
        const now = await rail(page).evaluate(
          (nav) => Math.round(nav.querySelectorAll("button")[nav.querySelectorAll("button").length - 1]!.getBoundingClientRect().top),
        );
        const still = now === last;
        last = now;
        return still;
      },
      { message: "the rail never stopped moving" },
    )
    .toBeTruthy();
}

async function readInChronologicalOrder(page: import("@playwright/test").Page) {
  await page.goto("/lab/collection");
  await page.getByRole("button", { name: /^Order:/ }).click();
  await page.getByRole("menuitem", { name: "Chronological" }).click();

  /* Readiness is the LIT MARK: the rail lights the moment the order lands
     (from the top photograph's own year when the scrollspy has nothing to
     say yet), which makes it the one signal that exists in every state --
     including the first page being a single year. */
  await expect(rail(page).locator('button[aria-current="true"]')).toBeVisible();
}

/** Press a year. The rail has to be OPEN first and that is not a test
 *  workaround, it is the gesture: closed, the years are hidden behind the
 *  decade they belong to and take no pointer events, so a hand reaches one
 *  by arriving at the rail, letting it open, and then travelling to the
 *  year. Playwright hit-tests before it moves the mouse, so without this it
 *  waits for ever on a row the closed rail is deliberately covering.
 *
 *  Addressed by `aria-label` rather than by visible text, because only the
 *  decades keep their lettering when the rows get tight. */
async function pressYear(page: import("@playwright/test").Page, name: string) {
  await openRail(page);
  await rail(page).getByRole("button", { name, exact: true }).click();
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
     page rather than the filter they set. */
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveAttribute(
    "aria-label",
    "1953",
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
  await expect(rail(page).locator('button[aria-current="true"]')).toHaveAttribute(
    "aria-label",
    "1953",
  );
});

/* ------------------------------------------------------------------ *
 *  Decades at rest, years under the pointer.
 *
 *  "Eh too many ticks ... maybe just decades but it beautifully expands
 *  becoming granular when you hover" (owner, 2026-08-31). Sixty marks
 *  standing there read as texture rather than as a scale, so at rest the
 *  rail draws about one row per decade and the rest of the years arrive
 *  with the pointer.
 *
 *  Asserted on computed opacity rather than on visibility: every row is
 *  in the DOM and laid out at every moment -- that is the point, the rows
 *  never move -- and what changes is whether they are painted.
 * ------------------------------------------------------------------ */

test("the rail rests as decades and goes granular under the pointer", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();

  const atRest = await drawn(page);
  expect(atRest.rows, "the fixture should span dozens of years").toBeGreaterThan(20);
  /* About one per decade, plus the two ends and Undated. The bound is loose
     on purpose -- the exact count is the fixture's business, and pinning it
     would make this test fail every time a photograph moves year. What
     matters is that it is nothing like the row count. */
  expect(atRest.names).toBeLessThan(atRest.rows / 3);
  expect(atRest.shown).toBe(atRest.names);

  await openRail(page);
  const open = await drawn(page);
  expect(open.shown).toBe(open.rows);
  /* And it really is an EXPANSION -- "I want it to expand only when you
     hover" -- so the rail is taller open than closed rather than merely
     busier. */
  expect(open.height).toBeGreaterThan(atRest.height * 2);

  // And it closes again when the pointer goes elsewhere.
  await page.mouse.move(20, 400);
  await expect.poll(async () => (await drawn(page)).shown).toBe(atRest.names);
});

/* ------------------------------------------------------------------ *
 *  The name that lights and the mark that swells are the same row.
 *
 *  "Sometimes after resizing window the highlight number is one higher
 *  than the highlighted ticks" (owner, 2026-08-31). The reveal used to
 *  interpolate across a fixed input range built from the row height, and
 *  a resize changes the row height without rebuilding the range -- so the
 *  swell (which reads the live rect) and the name (which did not) drifted
 *  apart by a row. Pinned at two window heights, because one window can
 *  never catch it.
 * ------------------------------------------------------------------ */
test("the row that swells is the row that names itself, at any window size", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();
  await openRail(page);

  /* A row the rail does NOT name of its own accord, so what is read below
     can only have come from the pointer being on it. */
  const target = await rail(page).evaluate((nav) =>
    [...nav.querySelectorAll("button")]
      .find((r) => Number(getComputedStyle(r.querySelector("span:last-child")!).opacity) < 0.5)
      ?.getAttribute("aria-label") ?? "",
  );
  expect(target, "every row was already named; nothing to reveal").not.toBe("");

  const agree = async () => {
    await openRail(page);
    const at = (await rail(page).getByRole("button", { name: target, exact: true }).boundingBox())!;
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    return expect
      .poll(async () =>
        rail(page).evaluate((nav) => {
          const rows = [...nav.querySelectorAll("button")];
          let swollen = "";
          let peak = 0;
          for (const r of rows) {
            const s = new DOMMatrixReadOnly(getComputedStyle(r).transform).a;
            if (s > peak) {
              peak = s;
              swollen = r.getAttribute("aria-label") ?? "";
            }
          }
          const revealed = rows
            .filter((r) => Number(getComputedStyle(r.querySelector("span:last-child")!).opacity) > 0.9)
            .map((r) => r.getAttribute("aria-label"));
          return { swollen, named: revealed.includes(swollen) };
        }),
      )
      .toEqual({ swollen: target, named: true });
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await agree();
  // The same gesture again, at a height that gives every row a different size.
  await page.setViewportSize({ width: 1440, height: 1040 });
  await agree();
});

/* ------------------------------------------------------------------ *
 *  And the rail itself fits, which is the whole reason it is not a
 *  list of decades any more.
 *
 *  "Make sure you're easily able to reach say 1956. Think about what
 *  you'd have to scroll" (owner, 2026-08-30). The answer is nothing:
 *  every year the archive holds is on screen at once, at rest, before a
 *  single scroll. The failure this pins is the one the first build had
 *  -- rows measured against the height the rail has once it STICKS,
 *  which put its oldest three years below the fold on arrival.
 * ------------------------------------------------------------------ */
test("every year is reachable without scrolling the rail or the page", async ({
  page,
}, testInfo) => {
  desktopOnly(testInfo.project.name);
  await page.goto("/lab/collection");
  await expect(rail(page)).toBeVisible();
  // Open, because that is the state every year has to be reachable in.
  await openRail(page);

  const fit = await rail(page).evaluate((nav) => {
    const rows = [...nav.querySelectorAll("button")];
    const last = rows[rows.length - 1].getBoundingClientRect();
    return {
      rows: rows.length,
      bottom: last.bottom,
      viewport: window.innerHeight,
      /* A scroll container inside a scroll container is the thing this design
         exists to avoid, so the assertion is on OVERFLOW rather than on
         scrollHeight: an 11px label in an 11px row makes the nav's content
         box two pixels taller than the nav, with nothing scrollable about
         it, and a scrollHeight comparison reads that as a scrollbar. */
      overflow: getComputedStyle(nav).overflowY,
    };
  });

  expect(fit.rows, "the fixture should span dozens of years").toBeGreaterThan(20);
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

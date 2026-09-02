import { test, expect, type Page } from "@playwright/test";

/* ------------------------------------------------------------------ *
 *  THE COLLECTION, DRIVEN AS A JOURNEY RATHER THAN PHOTOGRAPHED AT REST.
 *
 *  Everything else pointed at this page looks at it standing still: the
 *  visual suite screenshots it, the unit tests read its source, the seek spec
 *  drives /lab/collection -- which is the river and the rail with the room's
 *  own state behind them, and therefore exercises none of the state machine
 *  in <CollectionClient>.
 *
 *  That is where the bugs were. On 2026-09-02 the owner found three in a
 *  minute: photographs duplicated across a scope swap, a pressed year landing
 *  somewhere else with the rail lit on a third year, and a river only a reload
 *  could clear. Every one of them was two of this component's fourteen pieces
 *  of state disagreeing during a transition -- a state no screenshot of a
 *  settled page can ever be taken of. *"We've considered 0 edge cases, 0
 *  scenarios. How would we want it to act when the user goes through any of
 *  these 100 different scenarios and how do we make sure it does that."*
 *
 *  So this file asserts INVARIANTS over SEQUENCES. It says nothing about how
 *  many photographs the archive holds, which years it covers or what is in
 *  them -- it shares a database with production and that would be a spec that
 *  fails when somebody contributes. It says only things that must be true of
 *  this page no matter what it holds:
 *
 *    1. A photograph appears once. Ever, after any sequence of actions.
 *    2. Pressing a year puts that year at the top and lights that year.
 *    3. Year headings exist in Chronological and in no other order.
 *    4. Swapping halves lands on that half, whole, and returns to the same
 *       place when you swap back.
 *
 *  Written after the behaviour was measured by hand in chrome-devtools, per
 *  CLAUDE.md gotcha 7 -- every number below was read off a live page first.
 *  Each test skips itself rather than failing when the live archive cannot
 *  exercise it (no class collection on this account, a rail with nothing to
 *  press), because a spec that goes red for lack of data teaches sessions to
 *  ignore it.
 * ------------------------------------------------------------------ */

const rail = (page: Page) => page.locator('nav[aria-label^="Jump to when"]');
const orderButton = (page: Page) => page.getByRole("button", { name: /^Order:/ }).first();

/** Every photograph currently drawn in the river, by thumbnail URL. The one
 *  measurement all of these turn on: a duplicate here is a duplicate React key
 *  upstream, and an id that vanished is a section React lost track of. */
async function drawn(page: Page) {
  return page.evaluate(() => {
    const srcs = [...document.querySelectorAll("main section img")].map((i) => (i as HTMLImageElement).src);
    return {
      total: srcs.length,
      unique: new Set(srcs).size,
      sections: document.querySelectorAll("main section").length,
      bands: [...document.querySelectorAll("main h2[data-band]")].map(
        (h) => (h as HTMLElement).dataset.band ?? ""
      ),
    };
  });
}

/** Pick an order from the menu and wait for the river to be the one that
 *  order asked for -- not merely for the label to change, which happens a
 *  second earlier and is exactly the window the duplicate-key bug lived in. */
async function chooseOrder(page: Page, label: string) {
  await orderButton(page).click();
  await page.getByRole("menuitem", { name: label, exact: true }).click();
  await expect(orderButton(page)).toContainText(label);
  // Chronological draws headings; nothing else does. Either way, waiting on
  // the river's own shape is waiting on the page that actually arrived.
  await expect
    .poll(async () => (await drawn(page)).bands.length > 0)
    .toBe(label === "Chronological");
}

/** The years the rail is offering right now, as labels. Only four-digit ones:
 *  past about thirty years the rail folds into decades, and a decade press is
 *  a different gesture with its own spec (collection-seek). */
async function offeredYears(page: Page) {
  const labels = await rail(page)
    .locator("button")
    .evaluateAll((els) =>
      els
        .filter((e) => e.getBoundingClientRect().height > 0)
        .map((e) => e.textContent?.trim() ?? "")
    );
  return labels.filter((l) => /^\d{4}$/.test(l));
}

test.describe("the Collection survives being used", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/collection");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("main section img").first()).toBeVisible();
  });

  /* ---------------------------------------------------------------- *
   *  1. A PHOTOGRAPH APPEARS ONCE.
   *
   *  The one that mattered most, because it was silent: `<section>` was keyed
   *  by the year, `bandsOf` cuts consecutive runs, and the same year returns
   *  as several bands the moment the list is not sorted by year -- which is
   *  every render between pressing an order and that order's page arriving.
   *  React got the same key several times, stopped reconciling, and left
   *  sections behind. Measured before the fix: eight swaps grew the valley's
   *  17 photographs to 41 nodes, 24 of them duplicates.
   * ---------------------------------------------------------------- */
  test("no sequence of orders and swaps ever shows a photograph twice", async ({ page }) => {
    const swap = page.locator('h1 button[aria-label^="Switch"]');
    const canSwap = await swap.count();

    for (const label of ["Chronological", "Newest", "Oldest", "Chronological", "Newest"]) {
      await chooseOrder(page, label);
      const river = await drawn(page);
      expect(river.total, `${label}: the river is showing a photograph more than once`).toBe(
        river.unique
      );
    }

    if (canSwap) {
      for (let i = 0; i < 4; i += 1) {
        await swap.click();
        await expect(page.locator("main section img").first()).toBeVisible();
        // The title is the readiness signal: it is the one thing that changes
        // synchronously with the half, so a river read after it is this half's.
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const river = await drawn(page);
        expect(river.total, `swap ${i + 1}: a photograph is drawn more than once`).toBe(
          river.unique
        );
      }
    }
  });

  /* ---------------------------------------------------------------- *
   *  2. HEADINGS ARE A FACT ABOUT THE PHOTOGRAPHS, NOT ABOUT THE REQUEST.
   *
   *  A year heading under "Newest" is the visible half of the same fault: the
   *  river was grouped by the order that had been ASKED for while still
   *  holding the previous order's photographs. The owner's screenshot had
   *  "2021" twice under Newest.
   * ---------------------------------------------------------------- */
  test("year headings exist in Chronological and nowhere else", async ({ page }) => {
    await chooseOrder(page, "Chronological");
    expect((await drawn(page)).bands.length).toBeGreaterThan(0);

    for (const label of ["Newest", "Oldest", "Most loved"]) {
      await chooseOrder(page, label);
      expect(
        (await drawn(page)).bands,
        `${label} is drawing year headings, which only Chronological has`
      ).toEqual([]);
    }
  });

  /* ---------------------------------------------------------------- *
   *  3. PRESSING A YEAR GOES TO THAT YEAR.
   *
   *  It landed the reader at the head of the river, which is where the upward
   *  sentinel lives, so the sentinel fired on arrival and climbed away from
   *  the year pressed -- "it goes to chron but brings 2022 to the top of the
   *  page but the siderail says 2026". Measured before: three of six seeks
   *  landed wrong. After: ten of ten.
   *
   *  Every year the rail offers, from Newest each time, because entering
   *  Chronological from a non-time order is the path that was broken.
   * ---------------------------------------------------------------- */
  test("every year the rail offers lands on that year, lit", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile", "the year rail is xl-only; the phone has the scrubber");

    /* ON THE DEEPEST HALF THIS ACCOUNT CAN REACH, which for the owner is the
       Class Collection and its imported album. That is not a preference, it
       is the only place the failure appears: the runaway climb needs a year
       with more photographs above it than a screen can hold, and the valley
       holds seventeen in total. Reverting the fix and running this against
       the valley passes; against the class it fails on the first press. */
    const swap = page.locator('h1 button[aria-label^="Switch"]');
    if (await swap.count()) {
      await chooseOrder(page, "Chronological");
      const here = (await offeredYears(page)).length;
      await swap.click();
      await expect(page.locator("main section img").first()).toBeVisible();
      await chooseOrder(page, "Chronological");
      // Back if the other half turned out to be the shallower one.
      if ((await offeredYears(page)).length < here) {
        await swap.click();
        await expect(page.locator("main section img").first()).toBeVisible();
      }
    }

    await chooseOrder(page, "Chronological");
    const years = await offeredYears(page);
    test.skip(years.length < 2, "this archive has fewer than two years to travel between");

    for (const year of years) {
      await chooseOrder(page, "Newest");
      await rail(page).getByRole("button", { name: year, exact: true }).click();

      /* Geometry, not presence, per CLAUDE.md: a heading mid-animation
         answers toBeVisible() while still travelling. The landing puts the
         pressed year's heading at the top of the river, which is 24px below
         the viewport edge on a wide screen -- the one position where the
         sticky rail does not move. */
      await expect
        .poll(
          async () =>
            page.evaluate((want) => {
              const h = [...document.querySelectorAll("main h2[data-band]")].find(
                (e) => (e as HTMLElement).dataset.band === want
              );
              if (!h) return null;
              const top = Math.round(h.getBoundingClientRect().top);
              return Math.abs(top - 24) <= 8 ? "landed" : `at ${top}`;
            }, year),
          { message: `pressing ${year} did not put ${year} at the top of the river` }
        )
        .toBe("landed");

      await expect(
        rail(page).locator('button[aria-current="true"]'),
        `the rail is lit on the wrong year after pressing ${year}`
      ).toHaveText(year);

      const river = await drawn(page);
      expect(river.total, `seeking to ${year} duplicated a photograph`).toBe(river.unique);

      /* AND THE ARCHIVE IS CONTINUOUS ACROSS THE LANDING. A seek moves the
         reader through the river; it does not empty it above them. Pressing a
         year used to return that year and everything older and nothing at
         all above, so a reader who scrolled up met the page header where the
         previous year should be and then watched it fill in behind them:
         "why can't I just jump to that point with the photos already above
         and below it??????? it's like navigating to a point in a pdf, you
         don't lose the stuff above where you navigate to" (owner).

         Every year except the newest one the rail offers therefore has river
         above it when you arrive -- which, since the landing puts the year's
         heading at the top of the viewport, is exactly "the page is scrolled
         down". */
      if (year !== years[0]) {
        expect(
          await page.evaluate(() => Math.round(window.scrollY)),
          `pressing ${year} left nothing above it: the years above have to arrive with it`
        ).toBeGreaterThan(0);
      }
    }
  });

  /* ---------------------------------------------------------------- *
   *  4. THE OTHER HALF IS A WHOLE ARCHIVE, AND COMING BACK IS FREE.
   *
   *  Three per-half facts used to be computed for the half the SERVER
   *  rendered, so one press left the queue, the empty state and the upload
   *  quota all describing the other collection. And the river itself grew by
   *  six photographs a swap.
   * ---------------------------------------------------------------- */
  test("swapping halves and back returns the river you started with", async ({ page }) => {
    const swap = page.locator('h1 button[aria-label^="Switch"]');
    test.skip((await swap.count()) === 0, "this account has no Class Collection to swap to");

    const title = page.getByRole("heading", { level: 1 });
    const before = { name: await title.innerText(), river: await drawn(page) };

    await swap.click();
    await expect(title).not.toHaveText(before.name);
    await expect(page.locator("main section img").first()).toBeVisible();
    const other = await drawn(page);
    expect(other.total, "the other half is drawing a photograph twice").toBe(other.unique);

    await swap.click();
    await expect(title).toHaveText(before.name);
    await expect(page.locator("main section img").first()).toBeVisible();
    const back = await drawn(page);
    expect(back.total, "coming back left the river a different size").toBe(before.river.total);
    expect(back.sections, "coming back left sections behind").toBe(before.river.sections);
  });
});

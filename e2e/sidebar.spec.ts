import { test, expect } from "@playwright/test";

/* Regression guard for the bug the owner reported on 2026-08-19: opening the
 * account pill and then clicking Admin left the panel open, and its rows
 * overlapped the admin section list that replaces the rail under /admin
 * ("it's kind of cutting into the admin menu").
 *
 * The cause was a gap between two tests in AccountSection: /admin is not in
 * NAV (it is an account row), AND the Admin row removes itself while you are
 * inside admin -- so neither the open branch nor the close branch fired and
 * the panel simply kept whatever state it already had.
 *
 * Asserted on GEOMETRY rather than on the presence of "My profile". Two
 * earlier attempts failed on locators: the mobile drawer renders the same
 * AccountSection through a Radix portal, and a detached exit-animation node
 * still answers a visibility filter. The overlap is also what the owner
 * actually complained about -- rows sitting on top of the admin nav -- so
 * measuring it is closer to the report than counting elements is. */
test("the account panel collapses when you enter admin", async ({ page }, testInfo) => {
  /* Desktop only. At 390px there is no rail at all -- the nav lives in a
     drawer that already closes itself on navigate (onNavigate in sidebar.tsx),
     so the geometry this test measures does not exist there. */
  test.skip(testInfo.project.name === "mobile", "no persistent rail at mobile width");

  await page.goto("/feed");
  const rail = page.locator("aside").first();

  await rail.getByText("Sanan Shankar").click();
  const adminRow = rail.getByRole("link", { name: "Admin", exact: true });
  await expect(adminRow).toBeVisible();

  await adminRow.click();
  await page.waitForURL(/\/admin$/);

  /* The rail is the admin nav now. */
  await expect(rail.getByRole("link", { name: "Reports", exact: true })).toBeVisible();

  /* And nothing is painted over it. The last admin row is Analytics; below it
   * there must be clear space down to the account chip, not four account rows.
   * Polled, because the panel leaves on a staggered exit. */
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const aside = document.querySelector("aside");
          if (!aside) return -1;
          const boxes = Array.from(aside.querySelectorAll("a, button"))
            .map((el) => el.getBoundingClientRect())
            .filter((r) => r.width > 0 && r.height > 0);
          const analytics = Array.from(aside.querySelectorAll("a")).find((a) =>
            (a.textContent || "").includes("Analytics"),
          );
          if (!analytics) return -1;
          const below = analytics.getBoundingClientRect().bottom;
          /* Controls strictly between Analytics and the account chip at the
             foot. Zero when collapsed; four when the bug is present. */
          return boxes.filter((r) => r.top > below + 4 && r.bottom < window.innerHeight - 90)
            .length;
        }),
      { timeout: 10_000, message: "account rows still overlapping the admin nav" },
    )
    .toBe(0);
});

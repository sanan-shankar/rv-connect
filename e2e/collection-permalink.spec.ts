import { test, expect } from "@playwright/test";

/* Regression guard for a bug found on 2026-08-28, while building the river.
 *
 * /collection/<id> is not a page of its own any more. It is the Collection
 * with the viewer already open on that photograph, which is what let the
 * separate photo page go (campaign spec sec. 5). The river writes the view it
 * is showing into the address bar as you filter it, so a bucket or a decade is
 * a link you can send somebody -- and on this route that write fired on mount,
 * rewrote the URL to /collection, and Next read the replaceState as a
 * NAVIGATION. It re-rendered the other route, which has no photograph to open,
 * so a shared link landed on the archive with the thing it named nowhere in
 * sight and no error anywhere.
 *
 * Two assertions, because either alone passes with the bug half-present: the
 * viewer is open, AND the address is still the photograph's. Diagnosed live in
 * a browser first and pinned here afterwards, per CLAUDE.md.
 */

/** A link to one photograph, taken from where the app actually publishes one:
 *  the feed rail's "From the Collection" card. Reading it from a real surface
 *  rather than from a fixture means the test cannot pass against an id the
 *  database no longer has. */
async function anyPhotoHref(page: import("@playwright/test").Page) {
  await page.goto("/feed");
  const link = page.locator('a[href^="/collection/"]').first();
  if ((await link.count()) === 0) return null;
  return link.getAttribute("href");
}

test("a link to one photograph opens on it, and keeps its address", async ({ page }) => {
  const href = await anyPhotoHref(page);
  test.skip(!href, "nothing on the feed links to a photograph on this database");

  // Arriving cold, so this is a real navigation into the route rather than a
  // client-side transition from the river it came from.
  await page.goto("/letters");
  await page.goto(href!);

  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 15000 });

  /* And it is still that photograph's address. Polled rather than read once:
     the write that used to break this happened in an effect, so a single read
     immediately after load would have passed even while the bug was live. */
  await expect
    .poll(() => page.evaluate(() => window.location.pathname), {
      message: "the permalink rewrote its own address on arrival",
      timeout: 5000,
    })
    .toBe(href);
});

import { test, expect } from "@playwright/test";

/* Regression guard for bug-report-2 C-052: a notification about a post links
 * to /feed#<postId>, and nothing read the fragment. PostFeed fetches its posts
 * after mount, so at the moment the router commits there is no element with
 * that id and the browser has nothing to scroll to -- the member landed at the
 * top of the feed with no idea which post was meant.
 *
 * Two shapes, because the fix needed both and the first version of it only
 * handled one. Arriving from another page is a fresh mount. Tapping the bell
 * while ALREADY on the feed changes only the fragment, which is a
 * same-document navigation: nothing remounts and no effect re-runs.
 *
 * Asserted on geometry with expect.poll, per this repo's rule about animated
 * UI: the scroll is smooth, so a single read right after the click is a read
 * of wherever the scroll happened to be. */

/** The id of a post far enough down the first page that reaching it is a scroll. */
async function targetPost(page: import("@playwright/test").Page) {
  await page.goto("/feed");
  const articles = page.locator("article[id]");
  await expect(articles.first()).toBeVisible();
  const count = await articles.count();
  expect(count).toBeGreaterThan(4);
  const id = await articles.nth(Math.min(8, count - 1)).getAttribute("id");
  expect(id).toBeTruthy();
  return id as string;
}

/** How far the post's top sits from the top of the viewport. */
async function offsetOf(page: import("@playwright/test").Page, id: string) {
  return page.evaluate((postId) => {
    const el = document.getElementById(postId);
    if (!el) return null;
    const { top } = el.getBoundingClientRect();
    return { top, viewport: window.innerHeight };
  }, id);
}

test("a notification's fragment scrolls its post into view, arriving fresh", async ({ page }) => {
  const id = await targetPost(page);

  // Somewhere else first, so this is a real navigation into /feed#<id>.
  await page.goto("/letters");
  await page.goto(`/feed#${id}`);

  await expect
    .poll(async () => {
      const box = await offsetOf(page, id);
      return box ? box.top > 0 && box.top < box.viewport : false;
    }, { message: "the deep-linked post never came into view", timeout: 15000 })
    .toBe(true);
});

test("...and when the bell is tapped while already on the feed", async ({ page }) => {
  const id = await targetPost(page);

  await page.evaluate(() => window.scrollTo(0, 0));
  // What router.push('/feed#<id>') does from the feed itself: same document,
  // fragment only. This is the case the first fix silently did nothing for.
  await page.evaluate((postId) => {
    window.location.hash = postId;
  }, id);

  await expect
    .poll(async () => {
      const box = await offsetOf(page, id);
      return box ? box.top > 0 && box.top < box.viewport : false;
    }, { message: "a same-document fragment change scrolled nowhere", timeout: 15000 })
    .toBe(true);
});

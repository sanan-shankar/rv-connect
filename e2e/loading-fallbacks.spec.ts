import { test, expect, type APIRequestContext } from "@playwright/test";

/* ------------------------------------------------------------------ *
 *  Which skeleton actually shows.
 *
 *  A `loading.tsx` covers its own segment AND every segment below it,
 *  and the OUTER boundary is the one that paints. So while
 *  /letters/loading.tsx sat beside /letters/page.tsx, pressing "Write a
 *  letter" flashed three fake letter cards before the writing desk, and
 *  /letters/new/loading.tsx -- along with the reader's and the draft
 *  desk's -- never rendered at all (owner, 2026-08-30: "a lot of the
 *  letter loading skeletons are messed up"). Seventeen skeletons across
 *  the app were in that state. The fix is a route group: the index page
 *  and its skeleton live in `(index)/`, so the fallback stops there.
 *
 *  `src/lib/loading-boundary-rule.test.mjs` is the general enforcement
 *  and needs no server: no loading.tsx may sit above another. THIS file
 *  is the behavioural half -- proof that the rule describes what the
 *  browser is actually served, read off the FIRST FLUSH of the streamed
 *  document. Everything from React's hidden streamed-content div
 *  onwards is the resolved page; what precedes it is the fallback.
 * ------------------------------------------------------------------ */

const OPEN = '<template id="B:0"></template>';

/** The streamed document up to the point the real page replaces it. */
async function firstFlush(request: APIRequestContext, path: string) {
  const res = await request.get(path);
  expect(res.status(), `${path} did not render`).toBe(200);
  const html = await res.text();
  const cut = html.search(/<div hidden id="S:0"/);
  expect(cut, `${path} streamed nothing; it has no loading boundary`).toBeGreaterThan(0);
  return html.slice(0, cut);
}

/** Just the fallback markup, with the shell and <head> stripped off, so two
 *  routes can be compared without their titles and asset tags differing. */
async function fallbackMarkup(request: APIRequestContext, path: string) {
  const flush = await firstFlush(request, path);
  const start = flush.indexOf(OPEN);
  expect(start, `${path} has no Suspense fallback`).toBeGreaterThan(0);
  return flush.slice(start + OPEN.length);
}

/** The three-letter-card shape that used to hijack every route under /letters. */
const INDEX_CARDS = 'bg-card p-5"';

test("the writing desk's own skeleton is what /letters/new shows", async ({ page }) => {
  const flush = await firstFlush(page.request, "/letters/new");
  // The editor's 55vh floor: only the desk skeleton reserves it.
  expect(flush).toContain("min-h-[55vh]");
  expect(flush).not.toContain(INDEX_CARDS);
});

test("the reader's own skeleton is what a letter shows", async ({ page }) => {
  const flush = await firstFlush(page.request, "/letters/seed-wa-that-beautiful-walk-in-the-darkness");
  // The reading measure, which only the reader's skeleton sets.
  expect(flush).toContain("max-w-[680px]");
  expect(flush).not.toContain(INDEX_CARDS);
});

test("the letters index still shows its own skeleton", async ({ page }) => {
  const flush = await firstFlush(page.request, "/letters");
  expect(flush).toContain(INDEX_CARDS);
});

test("the new-catchup form's own skeleton is what /catchups/new shows", async ({ page }) => {
  const flush = await firstFlush(page.request, "/catchups/new");
  // The form's two-column grid, which only its own skeleton mirrors.
  expect(flush).toContain("sm:grid-cols-[340px_1fr]");
});

test("an admin screen does not get the admin overview's skeleton", async ({ page }) => {
  // The nine admin screens share one AdminSkeleton and differ only in its
  // props, so there is no class name to look for -- the proof is that the two
  // fallbacks are not the same markup. They were identical until 2026-08-30.
  const overview = await fallbackMarkup(page.request, "/admin");
  const content = await fallbackMarkup(page.request, "/admin/content");
  expect(content).not.toBe(overview);
});

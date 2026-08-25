import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const aboutPagePath = new URL("../../app/(main)/about/page.tsx", import.meta.url);
const adminPagePath = new URL("../../app/(main)/admin/page.tsx", import.meta.url);
const adminLayoutPath = new URL("../../app/(main)/admin/layout.tsx", import.meta.url);
const adminGuardPath = new URL("../../lib/admin.ts", import.meta.url);
const tourButtonPath = new URL("./take-tour-again-button.tsx", import.meta.url);
const tourStepsPath = new URL("./tour-steps.ts", import.meta.url);

test("About is a minimal, generously spaced placeholder", async () => {
  const source = await readFile(aboutPagePath, "utf8");

  assert.match(source, /<PageHeader title="About" \/>/);
  assert.match(source, />\s*indefinitely procrastinated\s*</);
  assert.match(source, /min-h-\[75vh\]/);
  assert.match(source, /items-center justify-center/);
  assert.match(source, /text-muted-foreground/);
  assert.doesNotMatch(source, /subtitle=|TakeTourAgainButton|Separator|ExternalLink/);
  assert.doesNotMatch(source, /<section|border|bg-card|rounded|shadow/);
  assert.doesNotMatch(source, /About Rishi Valley|What is this\?|How to use it|Community Guidelines/);
});

test("Admin exposes the tour action only to the configured owner email", async () => {
  // The 2026-08-19 rebuild split /admin into nine sections. Two things moved,
  // and this test moved with them rather than being deleted:
  //
  //   The role guard is now in the admin LAYOUT, so it covers all eleven
  //   routes instead of being repeated on each one and eventually forgotten
  //   on one. It lives in requireAdminPage() (src/lib/admin.ts).
  //
  //   The owner check is isOwner(), for the same reason: it was an inline
  //   ADMIN_EMAIL comparison that only the old single page performed.
  //
  // What has NOT changed, and is what this test actually protects: the tour
  // trigger is on the admin Overview, and only the configured owner sees it,
  // because tour-steps.ts ends by telling them to come back here for it.
  const layout = await readFile(adminLayoutPath, "utf8");
  assert.match(layout, /await requireAdminPage\(\)/);

  const guard = await readFile(adminGuardPath, "utf8");
  assert.match(guard, /session\.user\.role !== "admin"/);
  // forbidden(), not redirect("/feed"): a non-admin is told "nice try" on a
  // 403 rather than silently landing on the feed (owner, 2026-08-25). What
  // this line is really pinning is that the refusal still THROWS, so the
  // admin page body is never rendered for them.
  assert.match(guard, /forbidden\(\)/);
  assert.doesNotMatch(
    guard,
    /redirect\("\/feed"\)/,
    "the admin gate is back to a silent redirect"
  );
  assert.match(guard, /const ownerEmail = process\.env\.ADMIN_EMAIL;/);
  assert.match(guard, /return Boolean\(ownerEmail\) && email === ownerEmail;/);

  const source = await readFile(adminPagePath, "utf8");
  assert.match(
    source,
    /actions=\{isOwner\(session\.email\) \? <TakeTourAgainButton \/> : undefined\}/
  );
});

test("the Admin tour trigger is a compact CTA that starts the existing tour", async () => {
  const source = await readFile(tourButtonPath, "utf8");

  assert.match(source, /const \{ start \} = useTour\(\);/);
  assert.match(
    source,
    /<Button variant="primary" size="sm" onClick=\{start\}>\s*hoopoe tour\s*<\/Button>/
  );
  assert.doesNotMatch(source, /Take the tour again/);
});

test("the tour finish points the owner back to the Admin trigger, not About", async () => {
  const source = await readFile(tourStepsPath, "utf8");

  assert.match(source, /use "hoopoe tour" in the Admin panel/);
  assert.doesNotMatch(source, /About page|How to use it/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const aboutPagePath = new URL("../../app/(main)/about/page.tsx", import.meta.url);
const adminPagePath = new URL("../../app/(main)/admin/page.tsx", import.meta.url);
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
  const source = await readFile(adminPagePath, "utf8");

  assert.match(
    source,
    /session\.user\.role !== "admin"\) \{\s*redirect\("\/feed"\);\s*\}/
  );
  assert.match(source, /const ownerEmail = process\.env\.ADMIN_EMAIL;/);
  assert.match(
    source,
    /const showTour = Boolean\(ownerEmail\) && session\.user\.email === ownerEmail;/
  );
  assert.match(
    source,
    /<PageHeader\s+title="Admin Panel"\s+actions=\{showTour \? <TakeTourAgainButton \/> : undefined\}\s+\/>/
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

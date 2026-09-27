/**
 * The guide's chapter chain and its first-run tour (docs/spec/guide.md 5).
 *
 * The tour's promise to the owner is "only once, make sure that it doesn't
 * happen again and again" (2026-09-27), and each piece of that promise lives
 * in a different file: the Feed decides whether to start it, the layer
 * decides when it has ended, the action stamps the account, and the e2e
 * sign-in keeps the visual suite from photographing it. A change to any one
 * of them would pass every type check and quietly break the promise, so
 * each is pinned here where it is written.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { guideChain, nextGuideArea } from "./guide-areas.ts";
import { read, decomment, balancedBody } from "./test-kit.mjs";

test("the chain is his order, and teachers stop before Catch-ups", () => {
  // "the guide for the feed read through it. And then click next, go to
  // directory, click next, and go cycle through of them"
  assert.deepEqual(guideChain(false), ["feed", "directory", "collection", "letters", "catchups"]);
  // /catchups sends a teacher to the Feed, so a chapter about it would
  // describe a door they cannot open.
  assert.deepEqual(guideChain(true), ["feed", "directory", "collection", "letters"]);
  assert.equal(nextGuideArea("letters", guideChain(false))?.slug, "catchups");
  assert.equal(nextGuideArea("letters", guideChain(true)), undefined);
  assert.equal(nextGuideArea("catchups", guideChain(false)), undefined);
  // Birds is a chapter, not a stop.
  assert.equal(nextGuideArea("birds", guideChain(false)), undefined);
});

test("every chapter in the chain has a component", () => {
  const index = read("src/components/guide/chapters/index.tsx");
  for (const slug of guideChain(false)) {
    assert.match(index, new RegExp(`\\b${slug}: \\w+Chapter`), `no chapter component for "${slug}"`);
  }
});

test("the Feed starts the tour only for an account that has not had it, and never on the demo", () => {
  const feed = decomment(read("src/app/(main)/feed/page.tsx"));
  assert.match(feed, /select: \{ feedSeenAt: true, guideSeenAt: true \}/, "the Feed no longer reads the tour marker");
  assert.match(
    feed,
    /\{!IS_DEMO && marker && !marker\.guideSeenAt && \(\s*<GuideTourStart/,
    "the tour is no longer gated on the account's marker and the demo"
  );
});

test("the account is stamped once, conditionally, when the tour ends", () => {
  const action = balancedBody(
    decomment(read("src/app/(main)/guide/actions.ts")),
    "export async function markGuideSeen"
  );
  assert.ok(action, "markGuideSeen is gone");
  // The first stamp wins; a second call (last page, then the close) is a no-op.
  assert.match(action, /where: \{ id: session\.user\.id, guideSeenAt: null \}/);

  const layer = decomment(read("src/components/guide/guide-layer.tsx"));
  // Ended by reaching the last page, or by closing for any reason.
  assert.match(layer, /if \(at === chain\.length - 1\) end\(\)/, "reaching the last page no longer ends the tour");
  assert.match(layer, /else if \(touring\.current && !guide\)/, "closing the tour no longer ends it");
  assert.match(layer, /noteTourEnded\(userId\)/);
  assert.match(layer, /markGuideSeen\(\)/);
});

test("the visual suite never photographs the tour, and never spends the owner's", () => {
  // The e2e account is the owner's own. Closing the tour there would stamp
  // his real row; the browser note keeps it out of every shot instead.
  const setup = read("e2e/auth.setup.ts");
  assert.match(setup, /localStorage\.setItem\(`rv:moment:guideTour:\$\{id\}`, "fired"\)/);
  const tour = read("src/lib/guide-tour.ts");
  assert.match(tour, /export const TOUR_ENDED = "guideTour";/, "the e2e note no longer matches the key the tour reads");
  // And the Feed's start must not re-send the stamp from that note.
  const start = decomment(read("src/components/guide/guide-tour-start.tsx"));
  assert.ok(!/markGuideSeen/.test(start), "the tour start stamps the account from the browser's note");
});

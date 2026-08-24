import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ------------------------------------------------------------------ *
 *  Regression pins for the Catch-up lifecycle findings (bug audit
 *  B-060/B-061/B-062).
 *
 *  The behaviour of the pure engine is tested properly in
 *  catchups.test.mjs -- these are the pins for the parts that only exist
 *  as a call into Prisma, in the security-regressions.test.mjs style:
 *  read the real source and fail the moment the guard goes missing.
 *  Written this way rather than as an integration test because the only
 *  database here is the live production one.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const decomment = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

test("B-061: the clock stops for a Catch-up that is not active", () => {
  const src = decomment(read("src/lib/catchups.ts"));
  // The one gate, inside advanceEdition, which every caller comes through.
  assert.match(
    src,
    /meta\.catchupStatus !== "active"\)\s*return;/,
    "advanceEdition no longer refuses to advance a paused or ended Catch-up"
  );
  // And the sweep does not even load them.
  assert.match(
    src,
    /catchup: \{ status: "active", \.\.\.scope \}/,
    "advanceDueCatchups no longer scopes its edition query to active Catch-ups"
  );
});

test("B-061: pausing stamps the freeze, ending and resuming clear it", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.match(src, /status: "paused", pausedAt: new Date\(\)/, "pause does not stamp pausedAt");
  assert.match(src, /status: "active", pausedAt: null/, "resume does not clear pausedAt");
  assert.match(src, /status: "ended", nextOpensAt: null, pausedAt: null/, "end does not clear pausedAt");
  // Pause is an edge, not a re-stamp: an already-paused row must not have its
  // credit extended by a second pause.
  assert.match(
    src,
    /where: \{ id: catchupId, status: "active" \}/,
    "pause is no longer conditional on the Catch-up being active"
  );
});

test("B-061: every hand-driven write into a live Round refuses a frozen Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));

  // The clock gate in advanceEdition covers the automatic half only. These
  // seven write the edition directly, in their own transactions, and each used
  // to check the ROUND's status alone -- which does not change on a pause. A
  // Keeper with a tab opened before the pause could still publish the Round and
  // notify the whole group under a page saying it was paused.
  const MUST_REFUSE_WHEN_FROZEN = [
    "openAnswering",
    "closeAndPrepare",
    "extendDeadline",
    "publishNow",
    "nudgeGroup",
    "submitPrompt",
    "submitEntry",
  ];
  for (const name of MUST_REFUSE_WHEN_FROZEN) {
    const start = src.indexOf(`export async function ${name}`);
    assert.ok(start > -1, `${name} has been renamed or removed`);
    const rest = src.slice(start);
    const end = rest.indexOf("export async function", 1);
    const body = end === -1 ? rest : rest.slice(0, end);
    assert.match(
      body,
      /refuseIfFrozen\(/,
      `${name} writes into a Round without refusing a paused or ended Catch-up`
    );
  }

  const page = decomment(read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"));
  assert.match(
    page,
    /catchup\.status !== "active"/,
    "the answer page no longer refuses a frozen Catch-up"
  );
});

test("B-060: resume re-arms the rhythm rather than leaving a dead Catch-up", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  // resumeCatchup must reach for addCadenceGap: without it, a Catch-up whose
  // Round published while paused sits active forever with no future Round and
  // no control anywhere in the app to start one.
  const resume = src.slice(src.indexOf("export async function resumeCatchup"));
  const body = resume.slice(0, resume.indexOf("export async function", 1));
  assert.match(body, /addCadenceGap/, "resumeCatchup no longer backfills nextOpensAt");
  assert.match(body, /shiftEditionPatch/, "resumeCatchup no longer gives back the paused time");
  // The compare-and-swap pins the freeze stamp, not just the status: a
  // pause/resume/pause cycle racing this one would otherwise credit the wrong
  // duration to every deadline below.
  assert.match(
    body,
    /status: "paused", pausedAt \}/,
    "resumeCatchup's compare-and-swap no longer pins pausedAt"
  );
});

test("B-062: the header does not count down a Catch-up whose clock is stopped", () => {
  const src = decomment(read("src/app/(main)/catchups/[catchupId]/page.tsx"));
  assert.match(
    src,
    /catchup\.status === "active"\s*\?\s*editionCountdownLabel/,
    "the page header prints a live countdown over the paused banner again"
  );
});

test("C-125: a stale device cannot replace an answer written on another one", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = src.indexOf("export async function submitEntry(");
  assert.notEqual(start, -1);
  const body = src.slice(start, src.indexOf("\nexport async function", start + 10));

  // The precondition: the write only lands if the row still holds the version
  // the caller last saw. Without `updatedAt: base` in the where clause this is
  // an ordinary update and the guard is decoration.
  assert.match(
    body,
    /updateMany\(\{\s*where: \{[^}]*updatedAt: base[^}]*\}/,
    "the version precondition is gone from the entry write"
  );
  assert.match(body, /moved\.count === 0/, "a refused save is not detected");
  assert.match(body, /changed somewhere else/, "a refused save says nothing to the member");
  // The unconditional upsert survives ONLY for a caller holding no version.
  assert.ok(
    body.indexOf("if (base) {") < body.indexOf("catchupEntry.upsert("),
    "the upsert is no longer behind the version check"
  );
  // The new version goes back, or the next save would look stale.
  assert.match(body, /updatedAt: entry\.updatedAt\.toISOString\(\)/);

  // The same instrument the letters desk carries for M66; if that one is ever
  // removed this comparison is worth revisiting rather than silently drifting.
  const feed = decomment(read("src/app/(main)/feed/actions.ts"));
  assert.match(feed, /updatedAt: base/, "editPost lost the guard this one mirrors");
});

test("C-125: the answering surface actually sends the version it holds", () => {
  const experience = decomment(read("src/components/catchups/answer/answer-experience.tsx"));
  assert.match(experience, /baseUpdatedAt: versions\.current\[promptId\]/);
  assert.match(experience, /versions\.current\[promptId\] = "updatedAt" in result/);
  // Seeded from what the page rendered, not from nothing.
  assert.match(experience, /prompts\.map\(\(p\) => \[p\.id, p\.entryUpdatedAt\]\)/);
  const page = decomment(read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"));
  assert.match(page, /entryUpdatedAt: entry\?\.updatedAt\.toISOString\(\) \?\? null/);
  assert.match(page, /select: \{ promptId: true, body: true, images: true, updatedAt: true \}/);
});

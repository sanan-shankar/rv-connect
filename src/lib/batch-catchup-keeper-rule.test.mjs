import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Every batch member is a Keeper for the CYCLE now (owner, 2026-09-27:
 *  "make everyone a keeper ... have all of them paused by default"),
 *  reversing the earlier N30 design where a batch Catch-up refused every
 *  manual control outright. Membership and identity -- add, remove, hand
 *  off the hat, rename, the rhythm, end -- still refuse a batch outright,
 *  because the batch IS the roster.
 *
 *  What this pins: the nine controls that now let a batch member through
 *  (`allowBatch: true` on `loadKeeperScope` / `loadKeeperEdition`), the six
 *  that still do not, that a new batch Catch-up is born paused, and that
 *  the screens read the same split rather than one flag doing double duty.
 * ------------------------------------------------------------------ */

const ACTIONS = "src/app/(main)/catchups/actions.ts";
const actions = decomment(read(ACTIONS));

/** One function's body, asserted to exist and to be a real body, not a
 *  four-line stub the extractor lost the scope on. */
function fnBody(name) {
  const body = balancedBody(actions, `export async function ${name}(`);
  assert.ok(body, `${name} is gone or renamed`);
  assert.ok(body.length > 60, `${name}'s body did not extract; this test is vacuous`);
  return body;
}

const OPENED_TO_BATCH = [
  "openAnswering",
  "closeAndPublish",
  "extendDeadline",
  "nudgeGroup",
  "pauseCatchup",
  "resumeCatchup",
  "startNextEditionNow",
];

const STAYS_REFUSED = [
  "renameCatchup",
  "updateCatchupCadence",
  "endCatchup",
  "addCatchupMembers",
  "removeCatchupMember",
  "setCatchupKeeper",
];

test("the cycle controls each opt a batch member in", () => {
  for (const name of OPENED_TO_BATCH) {
    const body = fnBody(name);
    assert.match(
      body,
      /allowBatch:\s*true/,
      `${name} no longer opts a batch member in; loadKeeperScope/loadKeeperEdition default to ` +
        `refusing, so this control silently went back to Keeper-only on a batch Catch-up`
    );
  }
});

test("membership and identity controls do not opt in, and stay refused", () => {
  for (const name of STAYS_REFUSED) {
    const body = fnBody(name);
    assert.doesNotMatch(
      body,
      /allowBatch:\s*true/,
      `${name} now opts a batch member in -- the batch IS the roster, so adding, removing, ` +
        `handing off the hat, renaming, the rhythm and ending must stay refused there`
    );
  }
});

test("curatePrompt opts a batch member in on BOTH branches: remove and reorder", () => {
  const body = fnBody("curatePrompt");
  const hits = body.match(/allowBatch:\s*true/g) ?? [];
  assert.equal(
    hits.length,
    2,
    "curatePrompt should send allowBatch on both the reorder and the remove branch; " +
      `found ${hits.length}`
  );
});

test("loadKeeperEdition refuses a batch Catch-up unless the caller opts in", () => {
  const fn = balancedBody(actions, "async function loadKeeperEdition(");
  assert.ok(fn, "loadKeeperEdition is gone or renamed");
  assert.match(
    fn,
    /if\s*\(isBatchCatchup\(edition\.catchup\.group\.batchYear\)\)\s*\{\s*if\s*\(!refusal\.allowBatch\)\s*return\s*\{\s*error:\s*BATCH_CATCHUP_REFUSAL\s*\}/,
    "loadKeeperEdition no longer branches on refusal.allowBatch for a batch Catch-up"
  );
  // The Keeper check for a PEOPLE Catch-up must still run when it is not
  // batch, so a batch member's exemption cannot leak into isEffectiveKeeper
  // itself changing meaning.
  assert.match(fn, /isEffectiveKeeper\(\{/, "the people-Catch-up Keeper check is gone");
});

test("loadKeeperScope refuses a batch Catch-up unless the caller opts in", () => {
  const fn = balancedBody(actions, "async function loadKeeperScope(");
  assert.ok(fn, "loadKeeperScope is gone or renamed");
  assert.match(
    fn,
    /if\s*\(isBatchCatchup\(ctx\.catchup\.group\.batchYear\)\)\s*\{\s*return refusal\.allowBatch\s*\?\s*\{\s*catchup:\s*ctx\.catchup\s*\}\s*:\s*\{\s*error:\s*BATCH_CATCHUP_REFUSAL\s*\}/,
    "loadKeeperScope no longer branches on refusal.allowBatch for a batch Catch-up"
  );
  assert.match(fn, /isEffectiveKeeper\(\{/, "the people-Catch-up Keeper check is gone");
});

test("submitPrompt's own Keeper check stays batch-blind on purpose (it decides attribution, not permission)", () => {
  const fn = fnBody("submitPrompt");
  const at = fn.indexOf("const keeper = isEffectiveKeeper(");
  assert.ok(at > -1, "submitPrompt's keeper attribution is gone");
  const call = fn.slice(at, fn.indexOf(");", at));
  assert.doesNotMatch(
    call,
    /batchYear/,
    "submitPrompt's source-attribution check picked up batchYear; every batch member's own " +
      "question would then be attributed to a keeper rather than to them"
  );
});

test("the frozen hints on submitPrompt and submitEntry no longer name a Keeper who may not exist", () => {
  assert.doesNotMatch(
    actions,
    /resumes it\.\"\s*\n?\s*\);\s*\n\s*if \(frozen\) return frozen;\s*\n\s*\n\s*const keeper/,
    "a stale hint slipped back in"
  );
  assert.doesNotMatch(actions, /when the Keeper resumes it/, "a paused-batch hint still names \"the Keeper\", who a batch Catch-up does not have");
});

test("ensureBatchCatchup creates a new batch Catch-up already paused", () => {
  const src = decomment(read("src/lib/batch-catchups.ts"));
  const fn = balancedBody(src, "export async function ensureBatchCatchup(");
  assert.ok(fn, "ensureBatchCatchup is gone or renamed");
  const create = fn.slice(fn.indexOf("tx.catchup.create("), fn.indexOf("});", fn.indexOf("tx.catchup.create(")));
  assert.match(create, /status:\s*"paused"/, "a new batch Catch-up no longer starts paused");
  assert.match(create, /pausedAt:\s*now/, "a new batch Catch-up's pausedAt is not stamped at creation");
});

test("the dated migration pauses every active batch series, idempotently, and is not applied here", () => {
  const sql = read("prisma/migrations-manual/2026-09-27-batch-catchups-paused.sql");
  assert.match(sql, /UPDATE\s+"CatchupSeries"/i, "the migration does not touch CatchupSeries");
  assert.match(sql, /status\s*=\s*'paused'/, "the migration does not set status to paused");
  assert.match(sql, /"pausedAt"\s*=\s*now\(\)/, "the migration does not stamp pausedAt");
  assert.match(sql, /"batchYear"\s+IS NOT NULL/, "the migration is not scoped to batch groups");
  assert.match(
    sql,
    /c\.status\s*=\s*'active'/,
    "the migration has no idempotent guard; a second run would re-stamp pausedAt on an already-paused row"
  );
});

test("BATCH_CATCHUP_REFUSAL no longer claims nobody keeps a batch Catch-up", () => {
  const core = decomment(read("src/lib/catchups-core.ts"));
  const at = core.indexOf("export const BATCH_CATCHUP_REFUSAL =");
  assert.ok(at > -1, "BATCH_CATCHUP_REFUSAL is gone");
  const decl = core.slice(at, core.indexOf(";", at) + 1);
  assert.doesNotMatch(decl, /nobody keeps it/i, "the refusal sentence still says nobody keeps a batch Catch-up, which is now false for the cycle");
});

/* ------------------------------------------------------------------ *
 *  The screens: canRun and youKeep must diverge for a batch Catch-up,
 *  not move together. `youKeep` used to gate hold/resume too; it must
 *  not any more, or a batch member sees an Edition's cycle controls but
 *  not the hold/resume row sitting right beside them in Settings.
 * ------------------------------------------------------------------ */

const homePage = decomment(
  read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx")
);
const catchupHome = decomment(read("src/components/catchups/home/catchup-home.tsx"));
const settingsSurface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));

test("canRun includes the batch; youKeep does not", () => {
  assert.match(homePage, /canRun:\s*isKeeper \|\| isBatch/, "canRun no longer includes every batch member");
  assert.match(homePage, /youKeep:\s*isKeeper && !isBatch/, "youKeep now includes the batch, which would offer rename/rhythm/end there");
});

test("the on-hold card's resume button reads canRun, not the narrow per-role isKeeper", () => {
  const at = catchupHome.indexOf("This Catch-up is on hold");
  assert.ok(at > -1, "the on-hold card's copy is gone or reworded; retarget this test");
  const holdCard = catchupHome.slice(at);
  const button = holdCard.slice(0, holdCard.indexOf("</div>"));
  assert.match(button, /data\.settings\.canRun/, "a batch member with no individual Keeper role would never see Start it again");
  assert.doesNotMatch(button, /data\.viewer\.isKeeper/, "the resume button still reads the batch-blind isKeeper flag");
});

test("question curation reads the same batch-inclusive permission as the rest of the cycle", () => {
  assert.match(
    catchupHome,
    /youKeep=\{data\.settings\.canRun\}/,
    "AskedPanel's youKeep prop no longer reads settings.canRun, so a batch member cannot reorder or remove a question"
  );
});

test("settings splits hold/resume (the cycle) from end (identity) onto different permissions", () => {
  const group = settingsSurface.slice(
    settingsSurface.indexOf("function catchupGroup"),
    settingsSurface.indexOf("function youGroup")
  );
  const holdAt = group.search(/if\s*\(c\.canRun && !c\.ended\)/);
  const endAt = group.indexOf('key: "end"');
  assert.ok(holdAt > -1, "hold/resume no longer gated on c.canRun -- a batch member would lose the resume row in Settings");
  assert.ok(endAt > holdAt, "end's row moved ahead of the hold/resume block, or the block structure changed");
  const endGuard = group.slice(0, endAt);
  assert.match(
    endGuard.slice(endGuard.lastIndexOf("if (")),
    /c\.youKeep && !c\.ended/,
    "end is no longer gated on the narrower youKeep permission"
  );
});

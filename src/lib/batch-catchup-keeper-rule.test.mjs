import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Every batch member is a Keeper for the CYCLE now (owner, 2026-09-27:
 *  "make everyone a keeper"), reversing the earlier N30 design where a
 *  batch Catch-up refused every manual control outright. Membership and
 *  identity -- add, remove, hand off the hat, rename, end -- still refuse
 *  a batch outright, because the batch IS the roster.
 *
 *  And since 2026-10-17 STARTING an Edition is wider than the cycle: there
 *  is no rhythm, and anyone in any Catch-up may start one (his answer:
 *  "Anyone in it"). Hold and the rhythm are gone; a batch is made idle
 *  rather than paused.
 *
 *  What this pins: the controls that let a batch member through
 *  (`allowBatch: true` on `loadKeeperScope` / `loadKeeperEdition`), the
 *  ones that still do not, that Start asks nobody's role, that a new batch
 *  Catch-up is born idle, and that the screens read the same split rather
 *  than one flag doing double duty.
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
];

const STAYS_REFUSED = [
  "renameCatchup",
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
        `handing off the hat, renaming and ending must stay refused there`
    );
  }
});

test("Start asks for membership and nothing else: anyone in any Catch-up, batch or people", () => {
  const body = fnBody("startEdition");
  assert.doesNotMatch(
    body,
    /loadKeeperScope\(|loadKeeperEdition\(|isEffectiveKeeper\(/,
    "startEdition gates on a Keeper again; his answer (2026-10-17) was \"Anyone in it\""
  );
  assert.match(body, /ctx\.membership/, "startEdition no longer checks the caller is in the Catch-up");
  assert.match(body, /refuseIfEnded\(ctx\.catchup\.status\)/, "startEdition starts an Edition in an ended Catch-up");
  assert.match(body, /requireVerifiedMember\(\)/, "startEdition rings every bell in the group without a confirmed address");
  assert.match(body, /rateLimit\("catchups"/, "startEdition is not metered, so start/close/start could page the group on a loop");
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

test("ensureBatchCatchup makes a batch Catch-up idle: not paused, no rhythm, a first Edition with no deadline", () => {
  const src = decomment(read("src/lib/batch-catchups.ts"));
  const fn = balancedBody(src, "export async function ensureBatchCatchup(");
  assert.ok(fn, "ensureBatchCatchup is gone or renamed");
  const create = fn.slice(fn.indexOf("tx.catchup.create("), fn.indexOf("});", fn.indexOf("tx.catchup.create(")));
  assert.doesNotMatch(create, /paused|pausedAt|cadence/, "a new batch Catch-up is being paused or given a rhythm again");
  const edition = fn.slice(fn.indexOf("tx.catchupEdition.create("));
  assert.match(edition, /questionsCloseAt:\s*null/, "the first Edition has a deadline, so it starts itself and tells the batch");
  assert.doesNotMatch(fn, /notify/, "making a batch Catch-up tells somebody; nobody asked for it");
});

test("the dated migration settles every legacy row into the idle model, idempotently", () => {
  const sql = read("prisma/migrations-manual/2026-10-17-editions-start-by-hand.sql");
  assert.match(sql, /SET\s+status\s*=\s*'active'[\s\S]*WHERE\s+status\s*=\s*'paused'/i, "paused rows are not made active");
  assert.match(sql, /SET\s+"questionsCloseAt"\s*=\s*NULL/, "an Edition that closed empty is not fizzled, so the first page view reopens it");
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
 *  not move together, and Start must ask neither.
 * ------------------------------------------------------------------ */

const homePage = decomment(
  read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx")
);
const catchupHome = decomment(read("src/components/catchups/home/catchup-home.tsx"));
const settingsSurface = decomment(read("src/components/catchups/settings/settings-surface.tsx"));

test("canRun includes the batch; youKeep does not", () => {
  assert.match(homePage, /canRun:\s*isKeeper \|\| isBatch/, "canRun no longer includes every batch member");
  assert.match(homePage, /youKeep:\s*isKeeper && !isBatch/, "youKeep now includes the batch, which would offer rename/end there");
});

test("the home offers Start to everyone in an idle Catch-up, on no role at all", () => {
  const at = catchupHome.indexOf("if (data.idle) {");
  assert.ok(at > -1, "the home no longer draws an idle state; retarget this test");
  const idle = catchupHome.slice(at, catchupHome.indexOf('edition?.status === "collecting"', at));
  assert.match(idle, /onClick=\{onStart\}/, "the idle state has no Start");
  assert.doesNotMatch(
    idle,
    /canRun|isKeeper|youKeep/,
    "Start is gated on a role again; anyone in any Catch-up may start one (2026-10-17)"
  );
  assert.doesNotMatch(catchupHome, /This Catch-up is on hold/, "the on-hold card is back, with nothing left that can hold");
});

test("question curation reads the same batch-inclusive permission as the rest of the cycle", () => {
  assert.match(
    catchupHome,
    /youKeep=\{data\.settings\.canRun\}/,
    "AskedPanel's youKeep prop no longer reads settings.canRun, so a batch member cannot reorder or remove a question"
  );
});

test("settings offers no rhythm, no hold and no Start, and end stays on the narrower youKeep", () => {
  const group = settingsSurface.slice(
    settingsSurface.indexOf("function catchupGroup"),
    settingsSurface.indexOf("function youGroup")
  );
  assert.doesNotMatch(settingsSurface, /key: "rhythm"|key: "hold"|key: "resume"|key: "start-next"/, "a rhythm, hold or start row is back in settings");
  const endAt = group.indexOf('key: "end"');
  assert.ok(endAt > -1, "end's row is gone");
  const endGuard = group.slice(0, endAt);
  assert.match(
    endGuard.slice(endGuard.lastIndexOf("if (")),
    /c\.youKeep && !c\.ended/,
    "end is no longer gated on the narrower youKeep permission"
  );
});

/* ------------------------------------------------------------------ *
 *  STAGE: every control that reaches other members asks for a verified
 *  member before it does anything (bug audit 3, L10-01 and V-T2-01).
 *
 *  Since daec81ec every member of a batch holds the cycle, and a signup
 *  joins their batch's Catch-up before confirming anything, which the owner
 *  kept (2026-10-29, his Q13: they may read it; the controls wait). So the
 *  stage gate on each control is all that stands between an account that
 *  has proved nothing and a class's Edition, and four of them had none:
 *  removing questions, opening answering, extending, closing and
 *  publishing. The people Catch-up's Keeper verbs had none either.
 *
 *  Pinned as a property of the file, not a list: any exported action that
 *  opts a batch in, goes through a Keeper or Edition preamble, starts an
 *  Edition, or rings anyone, calls requireVerifiedMember() before its first
 *  load or write -- or is on REACHES_NOBODY with its reason.
 * ------------------------------------------------------------------ */

const REACHES_NOBODY = {
  renameCatchup:
    "changes one word on a page its people are already reading, with no bell and no mail (its docblock)",
};

const REACHES_OTHERS =
  /allowBatch:\s*true|loadKeeperScope\(|loadKeeperEdition\(|loadMemberEdition\(|openEdition\(|\bnotify[A-Z]\w*\(/;
const FIRST_LOAD_OR_WRITE =
  /loadKeeperScope\(|loadKeeperEdition\(|loadMemberEdition\(|loadCatchupContext\(|loadCommentableEntry\(|prisma\./;

test("every control that reaches other members asks for a verified member before anything else", () => {
  const names = [...actions.matchAll(/export async function ([A-Za-z0-9_]+)\(/g)].map((m) => m[1]);
  let candidates = 0;
  for (const name of names) {
    const body = fnBody(name);
    if (!REACHES_OTHERS.test(body)) continue;
    candidates += 1;
    if (REACHES_NOBODY[name]) continue;
    const gate = body.search(/requireVerifiedMember\(\)/);
    assert.ok(
      gate > -1,
      `${name} reaches other members and never asks for a verified member; an account that has ` +
        `confirmed nothing (or a signup in its claimed batch) can press it`
    );
    const first = body.search(FIRST_LOAD_OR_WRITE);
    assert.ok(first === -1 || gate < first, `${name} loads or writes before it checks the caller's stage`);
  }
  // 16 on 2026-10-29. If the pattern stopped matching, this would pass over nothing.
  assert.ok(candidates >= 14, `only ${candidates} actions look like they reach other members; the sweep has drifted`);
});

test("the seven controls the audit found open each carry the gate by name", () => {
  for (const name of [
    "curatePrompt",
    "openAnswering",
    "closeAndPublish",
    "extendDeadline",
    "endCatchup",
    "removeCatchupMember",
    "setCatchupKeeper",
  ]) {
    assert.match(fnBody(name), /requireVerifiedMember\(\)/, `${name} lost its stage gate (L10-01)`);
  }
});

test("the reaches-nobody list names only actions that still exist, and still reach nobody", () => {
  for (const name of Object.keys(REACHES_NOBODY)) {
    const body = fnBody(name);
    assert.doesNotMatch(body, /\bnotify[A-Z]\w*\(|allowBatch:\s*true/, `${name} now rings people or opens to a batch; take it off REACHES_NOBODY`);
  }
});

test("putting somebody into a Catch-up, or handing them the hat, asks the Catch-up rule", () => {
  /* The member's own doors (link, create, ask, answer) already ask Stage 2.
     These are the doors that put SOMEONE ELSE in, which never asked who
     that someone was (L10-01, doors 2 and 3). One rule for all of them:
     CATCHUP_PEOPLE, the same set the pickers offer. */
  for (const name of ["createCatchupWithPeople", "addCatchupMembers"]) {
    assert.match(
      fnBody(name),
      /prisma\.user\.findMany\(\{\s*where:\s*\{\s*id:\s*\{\s*in:[^}]*\},\s*AND:\s*\[CATCHUP_PEOPLE\]\s*\}/,
      `${name} enrols people without the Catch-up rule; an unconfirmed or unvouched account can be put in`
    );
  }
  const keeper = fnBody("setCatchupKeeper");
  const grant = keeper.match(/prisma\.groupMember\.updateMany\(\{([\s\S]*?)data: \{ role: "keeper" \}/);
  assert.ok(grant, "setCatchupKeeper's grant moved; retarget this pin");
  assert.match(grant[1], /user:\s*CATCHUP_PEOPLE/, "the hat can be handed to somebody a Catch-up may not hold");
  assert.match(keeper, /Only a verified member can be a Keeper\./, "a refused grant says nothing, or says it worked");
});

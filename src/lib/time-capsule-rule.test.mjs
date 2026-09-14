import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";

import { read, decomment, walk, ROOT, balancedBody } from "./test-kit.mjs";
import {
  DAY_MS,
  TICK_GRACE_MS,
  capsuleOpensAt,
  computeStatus,
  nextEditionStatus,
  planNextAction,
  sealPatch,
  mayMarkTimeCapsule,
  decideTimeCapsuleMark,
  homeStateLine,
  catchupStageLine,
  describeEditionStatus,
} from "./catchups-core.ts";
import { voteResult } from "./vote-question-rule.ts";
import { formatDayAndDate, formatDisplayDateLong } from "./utils.ts";

/* ------------------------------------------------------------------ *
 *  A time capsule (Catch-ups rework, build phase 14, spec 3.12).
 *
 *  His: "release the addition only one year later". His answers,
 *  2026-09-14: "33 time capsule is just for one edition. 34b. 35 yes an
 *  edition can." 34b is the one that bites: nothing in a sealed Edition
 *  is readable until it opens, your own answer included.
 *
 *  The clock is tested as pure functions. Everything that only exists as
 *  a call into Prisma is pinned by shape, in the catchup-lifecycle style,
 *  because the only database here is the live one.
 * ------------------------------------------------------------------ */

const DATE_VOICE = { dayAndDate: formatDayAndDate, longDate: formatDisplayDateLong };
const iso = (d) => d.toISOString();

/* ---- the date it opens ---------------------------------------------- */

test("a capsule opens on the same date next year, at 07:00 IST", () => {
  // Sealed by the 07:30 IST cron on 14 September: opens 07:00 IST on the 14th.
  assert.equal(iso(capsuleOpensAt(new Date("2026-09-14T02:00:00Z"))), "2027-09-14T01:30:00.000Z");
  // A Keeper closing it at 16:12 IST: the same date.
  assert.equal(iso(capsuleOpensAt(new Date("2026-09-14T10:42:00Z"))), "2027-09-14T01:30:00.000Z");
  // 01:15 IST on the 15th is still the 14th in UTC. The valley's date wins.
  assert.equal(iso(capsuleOpensAt(new Date("2026-09-14T19:45:00Z"))), "2027-09-15T01:30:00.000Z");
  // 23:59 IST on the 13th.
  assert.equal(iso(capsuleOpensAt(new Date("2026-09-13T18:29:00Z"))), "2027-09-13T01:30:00.000Z");
});

test("the opening lands on the civil hour and never more than a year out", () => {
  for (let h = 0; h < 48; h += 1) {
    const sealed = new Date(Date.UTC(2026, 8, 14) + h * 30 * 60 * 1000);
    const opens = capsuleOpensAt(sealed);
    assert.equal(opens.getUTCHours(), 1);
    assert.equal(opens.getUTCMinutes(), 30);
    const days = (opens.getTime() - sealed.getTime()) / DAY_MS;
    // 07:00 IST on the date: up to seventeen hours short of a year (sealed
    // late at night), up to seven over (sealed just after midnight IST).
    assert.ok(days > 364.25 && days < 365.3, `${iso(sealed)} opens ${days} days later`);
  }
});

test("29 February opens on 28 February", () => {
  assert.equal(iso(capsuleOpensAt(new Date("2028-02-29T02:00:00Z"))), "2029-02-28T01:30:00.000Z");
  // 01:30 IST on the 29th is the 28th in UTC; the valley says the 29th.
  assert.equal(iso(capsuleOpensAt(new Date("2028-02-28T20:00:00Z"))), "2029-02-28T01:30:00.000Z");
  // And into a leap year, the 28th stays the 28th.
  assert.equal(iso(capsuleOpensAt(new Date("2027-02-28T02:00:00Z"))), "2028-02-28T01:30:00.000Z");
});

test("sealing writes both dates together and no publish date", () => {
  const now = new Date("2026-09-14T02:00:00Z");
  const patch = sealPatch(now);
  assert.equal(patch.status, "sealed");
  assert.equal(iso(patch.sealedAt), iso(now));
  assert.equal(iso(patch.publishAt), iso(capsuleOpensAt(now)));
  assert.ok(!("publishedAt" in patch), "a sealed Edition was given the date it came out");
});

/* ---- the clock ------------------------------------------------------ */

const NOW = new Date("2026-09-14T02:00:00Z");
const at = (ms) => new Date(NOW.getTime() + ms);
const edition = (over = {}) => ({
  status: "answering",
  questionsCloseAt: at(-8 * DAY_MS),
  answersCloseAt: at(-60 * 1000),
  publishedAt: null,
  remindersSent: 0,
  timeCapsule: true,
  publishAt: null,
  ...over,
});
const counts = (entries = 5) => ({ entries, prompts: 3 });

test("a capsule's close seals it, and the write demands the flag", () => {
  const plan = planNextAction(edition(), counts(), NOW);
  assert.equal(plan.kind, "transition");
  assert.equal(plan.from, "answering");
  assert.equal(plan.to, "sealed");
  assert.equal(plan.notify, "catchup_sealed");
  assert.deepEqual(plan.requires, { timeCapsule: true });
  assert.equal(iso(plan.patch.publishAt), "2027-09-14T01:30:00.000Z");

  const after = { ...edition(), ...plan.patch };
  assert.equal(computeStatus(after, NOW), "sealed");
  assert.deepEqual(planNextAction(after, counts(), NOW), { kind: "none" }, "sealing fired twice");
});

test("an ordinary close still publishes, and its write refuses a capsule", () => {
  const plan = planNextAction(edition({ timeCapsule: false }), counts(), NOW);
  assert.equal(plan.to, "published");
  assert.equal(plan.notify, "catchup_published");
  assert.deepEqual(plan.requires, { timeCapsule: false });
  assert.equal(nextEditionStatus(edition({ timeCapsule: false }), NOW), "published");
});

test("a capsule nobody wrote in takes the one extension, then seals empty", () => {
  const first = planNextAction(edition(), counts(0), NOW);
  assert.equal(first.kind, "extend");
  const extended = { ...edition(), ...first.patch, answersCloseAt: at(-60 * 1000) };
  const second = planNextAction(extended, counts(0), NOW);
  assert.equal(second.to, "sealed", "an empty capsule published instead of sealing");
});

test("sealed means nothing moves until the morning it opens, then it opens once", () => {
  const sealed = edition({ status: "sealed", publishAt: new Date("2027-09-14T01:30:00Z") });
  const dayBefore = new Date("2027-09-13T02:00:00Z");
  assert.equal(computeStatus(sealed, dayBefore), "sealed");
  assert.deepEqual(planNextAction(sealed, counts(), dayBefore), { kind: "none" });

  // The 07:30 cron, and the grace the rest of the clock gets.
  const morning = new Date("2027-09-14T02:00:00Z");
  const open = planNextAction(sealed, counts(), morning);
  assert.equal(open.kind, "transition");
  assert.equal(open.from, "sealed");
  assert.equal(open.to, "published");
  assert.equal(open.notify, "catchup_published");
  assert.equal(open.setsNextOpensAt, false, "opening a capsule re-booked the rhythm");
  assert.deepEqual(open.requires, { timeCapsule: true });
  assert.equal(iso(open.patch.publishedAt), iso(morning));
  const early = new Date(new Date("2027-09-14T01:30:00Z").getTime() - TICK_GRACE_MS);
  assert.equal(computeStatus(sealed, early), "published");

  const opened = { ...sealed, ...open.patch };
  assert.deepEqual(planNextAction(opened, counts(), morning), { kind: "none" }, "it opened twice");
});

test("a sealed row with no opening date stays sealed, for ever", () => {
  const broken = edition({ status: "sealed", publishAt: null });
  assert.equal(computeStatus(broken, new Date("2099-01-01T00:00:00Z")), "sealed");
  // And a sealed row whose flag somehow reads false still only walks forward by its date.
  assert.equal(computeStatus(edition({ status: "sealed", timeCapsule: false, publishAt: null }), NOW), "sealed");
});

test("a very stale capsule cascades to sealed and stops there", () => {
  const stale = edition({ status: "collecting", questionsCloseAt: at(-30 * DAY_MS), answersCloseAt: at(-20 * DAY_MS) });
  assert.equal(computeStatus(stale, NOW), "sealed");
  assert.equal(nextEditionStatus(stale, NOW), "answering", "a capsule skipped a step");
});

test("the rhythm carries on while one Edition is sealed", () => {
  // Booked at the seal, from the seal.
  assert.equal(planNextAction(edition(), counts(), NOW).setsNextOpensAt, true);

  const core = decomment(read("src/lib/catchups.ts"));
  const due = balancedBody(core, "async function openNextEditionIfDue");
  assert.match(due, /latest\.status !== "published" && latest\.status !== "sealed"/, "a sealed Edition stops the rhythm");

  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  const start = balancedBody(actions, "export async function startNextEditionNow");
  assert.match(start, /newest\.status !== "published" && newest\.status !== "sealed"/);
  const resume = balancedBody(actions, "export async function resumeCatchup");
  assert.match(resume, /latest\.status === "published" \|\| latest\.status === "sealed"/);
  const cadence = balancedBody(actions, "export async function updateCatchupCadence");
  assert.match(cadence, /status: \{ in: \["published", "sealed"\] \}/);
  assert.match(cadence, /lastClosed\?\.sealedAt \?\? lastClosed\?\.publishedAt/, "the rhythm counts from a capsule's opening, a year late");
});

test("a capsule opens on its date even when its Catch-up is held or ended", () => {
  const core = decomment(read("src/lib/catchups.ts"));
  const advance = balancedBody(core, "export async function advanceEdition");
  assert.match(advance, /meta\.catchupStatus !== "active" && edition\.status !== "sealed"\)\s*return;/);
  // The entry count a capsule's close needs, so it is not mistaken for empty.
  assert.match(advance, /closing === "published" \|\| closing === "sealed"/);
  const sweep = balancedBody(core, "export async function advanceDueCatchups");
  assert.match(sweep, /status: "sealed",\s*publishAt: \{ lte: new Date\(now\.getTime\(\) \+ TICK_GRACE_MS\) \}/);
  assert.match(sweep, /editions: \{ some: sealedDue \}/);
  assert.match(sweep, /\.\.\.scope/, "the sweep reaches capsules outside the viewer's own Catch-ups");
});

test("the compare-and-swap carries the flag, on the clock and in the Keeper's hand", () => {
  const core = decomment(read("src/lib/catchups.ts"));
  const apply = balancedBody(core, "async function applyEditionAction");
  assert.match(apply, /status: action\.from, \.\.\.\(action\.requires \?\? \{\}\)/);
  assert.match(apply, /notifyPublished\(tx, \{ \.\.\.meta, editionId, capsule: action\.from === "sealed" \}\)/);
  assert.match(apply, /notifySealed\(tx,/);

  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  const close = balancedBody(actions, "export async function closeAndPublish");
  assert.match(close, /where: \{ id: editionId, status: "answering", timeCapsule: true \}/);
  assert.match(close, /where: \{ id: editionId, status: "answering", timeCapsule: false \}/, "an early close can publish a capsule");
  assert.ok(close.indexOf("sealPatch(") < close.indexOf("publishPatch("), "a capsule is published before the seal is considered");
});

/* ---- who may mark one, and when -------------------------------------- */

test("who may mark: a people Catch-up's Keepers, anyone in a batch, nobody else", () => {
  const people = { createdById: "maker", batchYear: null };
  assert.equal(mayMarkTimeCapsule({ ...people, viewerId: "maker", groupRole: "admin" }), true);
  assert.equal(mayMarkTimeCapsule({ ...people, viewerId: "k", groupRole: "keeper" }), true);
  assert.equal(mayMarkTimeCapsule({ ...people, viewerId: "m", groupRole: "member" }), false);
  const batch = { createdById: null, batchYear: 2023 };
  assert.equal(mayMarkTimeCapsule({ ...batch, viewerId: "m", groupRole: "member" }), true);
  assert.equal(mayMarkTimeCapsule({ ...batch, viewerId: null, groupRole: null }), false);
});

test("when: only while collecting questions", () => {
  assert.deepEqual(decideTimeCapsuleMark("collecting"), { ok: true });
  for (const status of ["draft", "answering", "sealed", "published", ""]) {
    assert.equal(decideTimeCapsuleMark(status).ok, false, `${status} could be marked`);
  }
});

test("the marking action: member, not frozen, who, when, and the window re-read by the write", () => {
  const src = decomment(read("src/app/(main)/catchups/actions.ts"));
  const fn = balancedBody(src, "export async function setEditionTimeCapsule");
  assert.ok(fn, "setEditionTimeCapsule is gone");
  const order = [
    "requireVerifiedMember(",
    "loadMemberEdition(",
    "refuseIfFrozen(",
    "mayMarkTimeCapsule(",
    "decideTimeCapsuleMark(",
    "catchupEdition.updateMany(",
  ].map((needle) => [needle, fn.indexOf(needle)]);
  for (const [needle, i] of order) assert.ok(i > -1, `setEditionTimeCapsule lost ${needle}`);
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(order[i - 1][1] < order[i][1], `${order[i - 1][0]} no longer runs before ${order[i][0]}`);
  }
  assert.match(fn, /where: \{ id: editionId, status: "collecting" \},\s*data: \{ timeCapsule \}/);
  /* The batch is let in BY NAME through mayMarkTimeCapsule, never by a
     preamble built to refuse it (his 35 against his N30). */
  assert.doesNotMatch(fn, /loadKeeperEdition\(|loadKeeperScope\(/);

  // The only writer of the flag.
  const writers = walk(resolve(ROOT, "src"), { skip: ["generated", "node_modules", "lab"] })
    .filter((f) => /\.tsx?$/.test(f) && /data: \{[^}]*\btimeCapsule\b/.test(decomment(read(f))))
    .map((f) => f.slice(ROOT.length + 1));
  assert.deepEqual(writers, ["src/app/(main)/catchups/actions.ts"]);
  assert.equal(src.match(/data: \{[^}]*\btimeCapsule\b/g).length, 1, "a second write of the flag appeared");
});

/* ---- 34b: nothing readable while sealed ------------------------------ */

test("the one loader that builds an Edition refuses anything unpublished itself", () => {
  const src = decomment(read("src/lib/catchups-edition-view.ts"));
  const fn = balancedBody(src, "export async function loadPublishedEditionView");
  assert.match(fn, /catchupEdition\.findFirst\(\{\s*where: \{ id: editionId, status: "published" \}/, "the heavy read no longer asks for published");
  assert.doesNotMatch(fn, /findUnique/);
});

test("every reader path asks for published before a word of an Edition", () => {
  const reader = decomment(read("src/app/(main)/catchups/edition/[editionId]/page.tsx"));
  const gate = reader.indexOf('if (status !== "published")');
  assert.ok(gate > -1);
  assert.ok(gate < reader.indexOf("loadPublishedEditionView("), "the reader loads before it gates");
  assert.ok(gate < reader.indexOf("markEditionRead("), "a sealed Edition is marked read");
  assert.match(reader, /edition\.status !== "published"\) return \{ title: "Catch-ups" \}/, "the tab title names a sealed Edition");

  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.match(balancedBody(actions, "export async function toggleEntryLove"), /edition\.status !== "published"/);
  assert.match(balancedBody(actions, "async function loadCommentableEntry"), /scope\.edition\.status !== "published"/);
  assert.equal(voteResult("sealed", [{ id: "a", text: "A", position: 0 }], []), null);

  const home = decomment(read("src/app/(main)/catchups/[catchupId]/(home)/page.tsx"));
  assert.match(home, /where: \{ catchupId: catchup\.id, status: "published" \}/);
  assert.match(home, /const editionIds = publishedEditions\.map/, "the home's cover photographs come from somewhere else");
  // Your own answer comes back only while answering: not while sealed (34b).
  assert.match(home, /if \(freshLatest\?\.status === "answering"\) \{\s*const accepted/);

  const list = decomment(read("src/app/(main)/catchups/(index)/page.tsx"));
  assert.match(list, /where: \{ status: "published", catchupId: \{ in:/);
  assert.match(list, /const editionIds = covers\.map/);

  const admin = decomment(read("src/app/(main)/admin/catchups/[catchupId]/page.tsx"));
  // Not fetched and hidden: never queried (write-path review, phase 14).
  assert.match(admin, /prompts: \{\s*where: \{ edition: \{ status: \{ not: "sealed" \} \} \}/, "the admin room queries a sealed capsule");
  assert.match(home, /prompts: \{\s*where: \{ edition: \{ status: \{ not: "sealed" \} \} \}/, "the home queries a sealed capsule's questions");
});

test("nothing new reads an answer without being looked at for a sealed Edition", () => {
  /* A tripwire, not a proof. Every file outside the lab that reads answer
     rows, and why each is safe while an Edition is sealed. A new one fails
     here, so the session adding it reads spec 3.12 first. */
  const allowed = new Map([
    ["src/app/(main)/catchups/actions.ts", "the writer: answers, hearts and comments, each gated on answering or published"],
    ["src/app/(main)/catchups/[catchupId]/(home)/page.tsx", "your own answers while answering; cover photographs of published Editions"],
    ["src/app/(main)/catchups/(index)/page.tsx", "cover photographs of published Editions"],
    ["src/lib/catchups-edition-view.ts", "the heavy read, published only"],
    ["src/lib/catchups-notify.ts", "who has answered, ids only"],
    ["src/lib/admin-analytics.ts", "counts and author ids, no words"],
    ["src/lib/account-purge.ts", "a purged member's own photographs, to delete them"],
    ["src/app/api/account/export/route.ts", "a member's own words, argued in the file"],
    ["src/app/(main)/admin/people/actions.ts", "merging two accounts, no reading"],
    ["src/lib/demo-seed/seed.ts", "the demo's nightly reset, deleting its own rows"],
  ]);
  const readers = walk(resolve(ROOT, "src"), { skip: ["generated", "node_modules", "lab"] })
    .filter((f) => /\.tsx?$/.test(f) && /catchupEntry\.(findMany|findFirst|findUnique|deleteMany|updateMany)\(/.test(decomment(read(f))))
    .map((f) => f.slice(ROOT.length + 1))
    .filter((f) => !allowed.has(f));
  assert.deepEqual(readers, [], "a new file reads Catch-up answers; check it against a sealed Edition");
});

test("the bell never carries a word of a sealed Edition, and says when it opens", () => {
  const notify = decomment(read("src/lib/catchups-notify.ts"));
  const sealed = notify.slice(notify.indexOf("export const notifySealed"));
  assert.match(sealed, /`\/catchups\/\$\{ctx\.catchupId\}`/, "the seal's bell points at a page with nothing to read");
  assert.match(sealed, /formatDisplayDateLong\(ctx\.opensAt\)/);
  const types = decomment(read("src/app/(main)/catchups/actions.ts"));
  assert.match(types, /"catchup_sealed",/, "leaving a Catch-up leaves its sealed bell behind");
  assert.match(read("src/components/layout/notification-bell.tsx"), /catchup_sealed:/);
});

/* ---- the words that stand in until he picks -------------------------- */

test("the stand-in lines say what a sealed Edition is and nothing about it", () => {
  const opens = new Date("2027-09-14T01:30:00Z");
  assert.match(catchupStageLine("active", { status: "sealed", publishAt: opens }, DATE_VOICE), /^Sealed until 14 September 2027$/);
  assert.equal(describeEditionStatus({ status: "sealed" }), "Sealed");
  assert.equal(
    homeStateLine("active", { status: "sealed" }, new Date("2026-10-14T02:00:00Z"), DATE_VOICE),
    "The next one opens 14 October 2026"
  );
});

/* ---- schema, migration, exports, demo -------------------------------- */

test("the columns, the CHECK, and nothing dropped", () => {
  const schema = read("prisma/schema.prisma");
  const model = schema.slice(schema.indexOf("model CatchupEdition {"));
  const body = model.slice(0, model.indexOf("\n}"));
  assert.match(body, /timeCapsule\s+Boolean\s+@default\(false\)/);
  assert.match(body, /sealedAt\s+DateTime\?/);
  assert.match(body, /publishAt\s+DateTime\?/);

  const sql = read("prisma/migrations-manual/2026-09-14-time-capsule.sql").replace(/--.*$/gm, "");
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "timeCapsule" BOOLEAN NOT NULL DEFAULT false/);
  assert.match(
    sql,
    /CHECK \(\s*"status" <> 'sealed'\s*OR \("timeCapsule" AND "sealedAt" IS NOT NULL AND "publishAt" IS NOT NULL\)\s*\)/
  );
  assert.doesNotMatch(sql, /\bDROP\b/i, "the migration drops something");
});

test("both exports carry the capsule, and the demo may write it", () => {
  const route = decomment(read("src/app/api/account/export/route.ts"));
  const answers = route.slice(route.indexOf('"catchupAnswers"'), route.indexOf('"catchupQuestions"'));
  assert.match(answers, /edition: \{ select: \{ status: true, publishAt: true \} \}/);
  const script = read("scripts/dev/export-catchups.mjs");
  assert.match(script, /timeCapsule: r\.timeCapsule \?\? false/);
  assert.match(script, /sealedAt: iso\(r\.sealedAt\)/);
  assert.match(script, /publishAt: iso\(r\.publishAt\)/);
  assert.match(read("src/lib/demo.ts"), /"CatchupEdition",/);
});

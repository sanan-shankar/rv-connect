#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Catch-ups: post-migration smoke test (WP-S).
 *
 *  Walks the REAL Round state machine against the REAL database by calling
 *  the actual `advanceEdition` / `resolveSpotify` functions from
 *  `src/lib/catchups.ts` (not a reimplementation), on a throwaway group +
 *  3 test users + one Catch-up it creates itself, then deletes every row
 *  it created and verifies nothing leaked.
 *
 *  GATE: this script REFUSES TO RUN until the six Catchup* tables exist
 *  (spec `docs/spec/catchups.md` section 6.3). Pre-migration it exits(1)
 *  with a friendly message instead of throwing. Run it only after the
 *  owner has applied that SQL.
 *
 *  Usage:
 *    node scripts/qa/catchups-smoke.mjs
 *
 *  Connection: reads DATABASE_URL, the same var `src/lib/prisma.ts` reads
 *  (the transaction pooler in production). If DATABASE_URL is unset but
 *  DIRECT_URL is, this falls back to it, so the script also targets a local
 *  Postgres / PGlite dev database that only exposes one of the two. Because
 *  this script imports the real `@/lib/prisma` singleton (via the alias
 *  loader below) rather than opening a second connection, its own seed
 *  writes and `advanceEdition`'s internal queries share one client and one
 *  transaction pool, so there is no risk of the two halves of the test
 *  looking at different databases.
 *
 *  Shared production DB safety: this is a live community database. Every
 *  row this script creates is tagged with one `runId` (in the test users'
 *  emails and the test group's name), and every assertion that could be
 *  fooled by concurrent real traffic (other alumni's groups publishing a
 *  real Round while this happens to be running) is SCOPED to this run's own
 *  ids, never a bare table-wide count. The "before/after" GLOBAL row counts
 *  the plan asks for are still recorded and printed for a human to eyeball,
 *  but the pass/fail gate for "did we leak anything" is the scoped, run-
 *  specific count, which is immune to unrelated concurrent activity.
 *
 *  Safe to re-run: every id is generated fresh (cuid defaults) and every
 *  test user's email embeds the run's random id, so nothing collides with
 *  a previous run, even one that crashed before its cleanup ran.
 * ------------------------------------------------------------------ */

import { registerHooks } from "node:module";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";

// ─── "@/*" alias resolution + extensionless relative-import fallback ────────
//
// This project resolves the "@/*" import alias via tsconfig `paths`, which
// only Next.js's bundler understands. A plain `node` process does not, so a
// bare run of this script cannot follow `src/lib/catchups.ts`'s own
// `import("@/lib/prisma")` / `import("@/lib/catchups-notify")` calls (see
// that file's header comment for why those are dynamic in the first place).
// This hook is the one bit of plumbing that lets a standalone QA script
// import real app modules unmodified: it rewrites any "@/..." specifier to
// "<repoRoot>/src/..." and lets Node's own TypeScript type-stripping (stable
// on the Node version this repo targets) handle the rest. Node still needs a
// concrete extension, so a few candidates are tried in order.
//
// That alias rewrite only covers the FIRST hop. Once Node is inside a
// resolved file, Prisma's generated client (`src/generated/prisma/client.ts`,
// generator = "prisma-client") imports its own siblings with extensionless
// relative specifiers, e.g. `import * as $Enums from "./enums"`. Node's
// native module resolver requires an explicit extension for relative
// specifiers and does not consult this hook's alias logic for them (the
// alias branch above only matches "@/..." prefixes), so that import throws
// ERR_MODULE_NOT_FOUND before `@/lib/prisma` ever finishes loading. The
// second branch below catches exactly that: for a relative specifier Node's
// default resolver could not find, it tries the same extension/index
// candidates against the *importing file's* directory.

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "../..");
const SRC_DIR = path.join(REPO_ROOT, "src");
const EXTENSION_CANDIDATES = (base) => [
  base,
  `${base}.ts`,
  `${base}.tsx`,
  `${base}.js`,
  path.join(base, "index.ts"),
  path.join(base, "index.tsx"),
  path.join(base, "index.js"),
];

function firstExistingFile(candidates) {
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function resolveAliasFile(specifier) {
  const base = path.join(SRC_DIR, specifier.slice(2)); // strip "@/"
  return firstExistingFile(EXTENSION_CANDIDATES(base));
}

function resolveRelativeFile(specifier, parentURL) {
  if (!parentURL) return null;
  const parentDir = path.dirname(fileURLToPath(parentURL));
  const base = path.resolve(parentDir, specifier);
  return firstExistingFile(EXTENSION_CANDIDATES(base));
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const file = resolveAliasFile(specifier);
      if (!file) return nextResolve(specifier, context); // let Node raise its natural error
      return nextResolve(pathToFileURL(file).href, context);
    }

    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      try {
        return nextResolve(specifier, context);
      } catch (err) {
        if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
        const file = resolveRelativeFile(specifier, context.parentURL);
        if (!file) throw err; // genuinely missing; surface the original error
        return nextResolve(pathToFileURL(file).href, context);
      }
    }

    return nextResolve(specifier, context);
  },
});

// Node warns once per process that a `.ts` file has no "type" in the nearest
// package.json ("MODULE_TYPELESS_PACKAGE_JSON"). Harmless here (we never
// change package.json for a QA script), just noisy; keep everything else.
// `process.on` alone would add a listener ALONGSIDE Node's own default
// printer rather than replacing it, so the default is removed first.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.code === "MODULE_TYPELESS_PACKAGE_JSON") return;
  console.warn(w);
});

// ─── Connection env (see header: DATABASE_URL, falling back to DIRECT_URL) ───

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
if (!process.env.DATABASE_URL) {
  console.error(
    "[catchups-smoke] Set DATABASE_URL (or DIRECT_URL) to a Postgres connection string first."
  );
  process.exit(1);
}

// ─── Real app modules (via the alias hook above) ─────────────────────────────

const { prisma } = await import("@/lib/prisma");
const {
  advanceEdition,
  resolveSpotify,
  isMissingCatchupTable,
  addCadenceGap,
  REMINDER_TWO_DAYS,
  REMINDER_LAST_DAY,
  REMINDER_EXTENDED,
} = await import("@/lib/catchups");

// ─── Tiny pass/fail harness ───────────────────────────────────────────────────

const results = [];
let currentSection = "";

function section(title) {
  currentSection = title;
  console.log(`\n${title}`);
}

function check(name, pass, detail) {
  results.push({ section: currentSection, name, pass: !!pass, detail });
  const tag = pass ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? ` (${detail})` : ""}`);
  return !!pass;
}

function inRange(actual, expectedMs, toleranceMs) {
  if (!(actual instanceof Date)) return false;
  return Math.abs(actual.getTime() - expectedMs) <= toleranceMs;
}

// ─── Fixed clock reference for this run's expectation math ───────────────────

const RUN_ID = randomUUID().slice(0, 8);
const TAG = `[QA catchups-smoke ${RUN_ID}]`;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ─── Step 0: refuse to run if the tables are missing ─────────────────────────
//
// Returns true when it is safe to proceed. On any failure it prints a clear
// message and returns false; the caller sets process.exitCode and returns
// without ever calling process.exit() directly (see the note on main(), below,
// on why: process.exit() can truncate buffered stdout/stderr when this
// script's output is piped rather than attached to a TTY).

async function assertTablesReady() {
  try {
    await prisma.catchup.count();
    return true;
  } catch (err) {
    if (isMissingCatchupTable(err)) {
      console.error(
        `\n${TAG} The Catchup* tables do not exist yet in this database.\n` +
          "This smoke test only makes sense post-migration. Ask the owner to apply the\n" +
          "idempotent SQL in docs/spec/catchups.md section 6.3 (Supabase SQL / execute_sql),\n" +
          "then re-run this script.\n"
      );
      return false;
    }
    console.error(`\n${TAG} Could not reach the database to check the Catchup tables:`, err);
    return false;
  }
}

// ─── Global "before" snapshot (informational; see header for why the real ────
//     leak gate below is scoped to this run's own ids, not these) ────────────

const CATCHUP_TABLES = [
  ["catchup", () => prisma.catchup.count()],
  ["catchupEdition", () => prisma.catchupEdition.count()],
  ["catchupPrompt", () => prisma.catchupPrompt.count()],
  ["catchupEntry", () => prisma.catchupEntry.count()],
  ["catchupEntryLove", () => prisma.catchupEntryLove.count()],
  ["catchupPref", () => prisma.catchupPref.count()],
];

async function snapshotGlobalCounts() {
  const out = {};
  for (const [name, fn] of CATCHUP_TABLES) out[name] = await fn();
  return out;
}

function printCounts(label, counts) {
  console.log(`${label}: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
}

// ─── Edition fetch, matching the shape advanceEdition needs ──────────────────

const EDITION_SELECT = {
  id: true,
  catchupId: true,
  status: true,
  questionsCloseAt: true,
  answersCloseAt: true,
  publishAt: true,
  publishedAt: true,
  remindersSent: true,
  catchup: {
    select: {
      cadence: true,
      status: true,
      group: { select: { id: true, name: true } },
    },
  },
};

async function freshEdition(id) {
  return prisma.catchupEdition.findUnique({ where: { id }, select: EDITION_SELECT });
}

async function countNotif(userIds, type) {
  return prisma.notification.count({ where: { userId: { in: userIds }, type } });
}

// ─── Seed: throwaway group + 3 users + one Catch-up with two Rounds ──────────
//
// `state` is filled in incrementally (rather than built up and returned only
// on full success) so that if seeding throws partway through, `cleanup()`
// still knows about every row created before the failure and can remove it.
// On a shared production database, a half-seeded run is exactly the case
// that must not leak.

function emptyState() {
  return { users: [], group: null, catchup: null, editionA: null, promptA: null, editionB: null };
}

async function seed(state) {
  const now = new Date();

  for (let n = 1; n <= 3; n += 1) {
    const user = await prisma.user.create({
      data: {
        name: `Smoke Test Member ${n}`,
        email: `catchups-smoke-${RUN_ID}-${n}@qa.invalid`,
        accountType: "alumnus",
      },
      select: { id: true, name: true },
    });
    state.users.push(user);
  }

  state.group = await prisma.group.create({
    data: {
      name: `${TAG} throwaway group`,
      creatorId: state.users[0].id,
      visibility: "private",
    },
    select: { id: true, name: true },
  });

  await prisma.groupMember.createMany({
    data: state.users.map((u, i) => ({
      groupId: state.group.id,
      userId: u.id,
      role: i === 0 ? "admin" : "member",
    })),
  });

  state.catchup = await prisma.catchup.create({
    data: { groupId: state.group.id, createdById: state.users[0].id, cadence: "monthly", status: "active" },
    select: { id: true },
  });

  // Round 1 (Edition A): starts in `collecting` with its question window
  // already closed, so the very first advanceEdition call below drives the
  // collecting -> answering transition. Ships with one accepted prompt so a
  // real Entry can be attached later (the "one or more answered" branch of
  // the too-few-answers rule, spec 2.6).
  state.editionA = await prisma.catchupEdition.create({
    data: {
      catchupId: state.catchup.id,
      number: 1,
      status: "collecting",
      questionsCloseAt: new Date(now.getTime() - 60_000),
    },
    select: { id: true },
  });
  state.promptA = await prisma.catchupPrompt.create({
    data: {
      editionId: state.editionA.id,
      authorId: state.users[0].id,
      text: `${TAG} smoke test prompt`,
      source: "keeper",
      showAsker: true,
      accepted: true,
      position: 0,
    },
    select: { id: true },
  });

  // Round 2 (Edition B): seeded directly in `answering` with its answer
  // window already closed and ZERO entries, to exercise the auto-extend
  // branch of the too-few-answers rule in isolation from Round 1.
  state.editionB = await prisma.catchupEdition.create({
    data: {
      catchupId: state.catchup.id,
      number: 2,
      status: "answering",
      questionsCloseAt: new Date(now.getTime() - 4 * DAY_MS),
      answersCloseAt: new Date(now.getTime() - 60_000),
    },
    select: { id: true },
  });
  await prisma.catchupPrompt.create({
    data: {
      editionId: state.editionB.id,
      authorId: state.users[0].id,
      text: `${TAG} smoke test prompt (round 2)`,
      source: "keeper",
      showAsker: true,
      accepted: true,
      position: 0,
    },
  });
}

// ─── The full state-machine walk ──────────────────────────────────────────────

async function walkEditionA(seeded) {
  const { users, editionA, promptA } = seeded;
  const userIds = users.map((u) => u.id);

  section("Round 1: collecting -> answering (natural close)");
  {
    const before = await countNotif(userIds, "catchup_answers_open");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const after = await countNotif(userIds, "catchup_answers_open");
    check("status advanced to answering", ed.status === "answering", ed.status);
    check(
      "answersCloseAt set to ~7 days out",
      inRange(ed.answersCloseAt, Date.now() + 7 * DAY_MS, 5 * 60_000),
      String(ed.answersCloseAt)
    );
    check("remindersSent still 0", ed.remindersSent === 0, String(ed.remindersSent));
    check("catchup_answers_open fired to all 3 members exactly once", after - before === 3, `delta=${after - before}`);
  }

  section("Round 1: double-advance is idempotent (collecting->answering step)");
  {
    const before = await countNotif(userIds, "catchup_answers_open");
    await advanceEdition(await freshEdition(editionA.id));
    const after = await countNotif(userIds, "catchup_answers_open");
    const ed = await freshEdition(editionA.id);
    check("status unchanged (still answering)", ed.status === "answering");
    check("no duplicate catchup_answers_open notifications", after === before, `before=${before} after=${after}`);
  }

  section("Round 1: two-days-left reminder fires at the right boundary");
  {
    await prisma.catchupEdition.update({
      where: { id: editionA.id },
      data: { answersCloseAt: new Date(Date.now() + 1.5 * DAY_MS) },
    });
    const before = await countNotif(userIds, "catchup_reminder");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const after = await countNotif(userIds, "catchup_reminder");
    check(
      "remindersSent bit 1 (two-days) set",
      (ed.remindersSent & REMINDER_TWO_DAYS) === REMINDER_TWO_DAYS,
      `remindersSent=${ed.remindersSent}`
    );
    check("status still answering (not a transition)", ed.status === "answering");
    check("catchup_reminder fired to all 3 non-answerers", after - before === 3, `delta=${after - before}`);
  }

  section("Round 1: double-advance is idempotent (two-days reminder)");
  {
    const before = await countNotif(userIds, "catchup_reminder");
    await advanceEdition(await freshEdition(editionA.id));
    const after = await countNotif(userIds, "catchup_reminder");
    check("no duplicate two-days reminder", after === before, `before=${before} after=${after}`);
  }

  section("Round 1: last-day reminder fires at the right boundary");
  {
    await prisma.catchupEdition.update({
      where: { id: editionA.id },
      data: { answersCloseAt: new Date(Date.now() + 12 * HOUR_MS) },
    });
    const before = await countNotif(userIds, "catchup_reminder");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const after = await countNotif(userIds, "catchup_reminder");
    check(
      "remindersSent bit 2 (last-day) set alongside bit 1",
      (ed.remindersSent & (REMINDER_TWO_DAYS | REMINDER_LAST_DAY)) === (REMINDER_TWO_DAYS | REMINDER_LAST_DAY),
      `remindersSent=${ed.remindersSent}`
    );
    check("catchup_reminder fired again to all 3 non-answerers", after - before === 3, `delta=${after - before}`);
  }

  section("Round 1: double-advance is idempotent (last-day reminder)");
  {
    const before = await countNotif(userIds, "catchup_reminder");
    await advanceEdition(await freshEdition(editionA.id));
    const after = await countNotif(userIds, "catchup_reminder");
    check("no duplicate last-day reminder", after === before, `before=${before} after=${after}`);
  }

  section("Round 1: one real answer, then answering -> preparing (no extension needed)");
  {
    await prisma.catchupEntry.create({
      data: {
        editionId: editionA.id,
        promptId: promptA.id,
        authorId: users[0].id,
        body: `${TAG} a real answer`,
      },
    });
    await prisma.catchupEdition.update({
      where: { id: editionA.id },
      data: { answersCloseAt: new Date(Date.now() - 60_000) },
    });
    const beforeAnswersOpen = await countNotif(userIds, "catchup_answers_open");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const afterAnswersOpen = await countNotif(userIds, "catchup_answers_open");
    check("status advanced to preparing", ed.status === "preparing", ed.status);
    check(
      "did NOT extend (entryCount >= 1, extended bit stays unset)",
      (ed.remindersSent & REMINDER_EXTENDED) === 0,
      `remindersSent=${ed.remindersSent}`
    );
    check("publishAt set ~24h after the close", inRange(ed.publishAt, Date.now() + 24 * HOUR_MS, 5 * 60_000));
    check("no answers-open re-fire on a normal close", afterAnswersOpen === beforeAnswersOpen);
  }

  section("Round 1: double-advance is idempotent (preparing, hold not elapsed)");
  {
    const before = await countNotif(userIds, "catchup_published");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const after = await countNotif(userIds, "catchup_published");
    check("status still preparing", ed.status === "preparing");
    check("no published notification yet", after === before);
  }

  section("Round 1: preparing -> published once the 24h hold elapses");
  {
    await prisma.catchupEdition.update({
      where: { id: editionA.id },
      data: { publishAt: new Date(Date.now() - 60_000) },
    });
    const before = await countNotif(userIds, "catchup_published");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const catchupRow = await prisma.catchup.findUnique({
      where: { id: seeded.catchup.id },
      select: { nextOpensAt: true },
    });
    const after = await countNotif(userIds, "catchup_published");
    check("status advanced to published", ed.status === "published", ed.status);
    check("publishedAt stamped", ed.publishedAt instanceof Date);
    check("catchup_published fired to all 3 members exactly once", after - before === 3, `delta=${after - before}`);
    check(
      "Catchup.nextOpensAt scheduled ~1 month out (monthly cadence)",
      inRange(catchupRow.nextOpensAt, addCadenceGap(new Date(), "monthly").getTime(), DAY_MS)
    );
  }

  section("Round 1: double-advance is idempotent (published is terminal)");
  {
    const before = await countNotif(userIds, "catchup_published");
    await advanceEdition(await freshEdition(editionA.id));
    const ed = await freshEdition(editionA.id);
    const after = await countNotif(userIds, "catchup_published");
    check("status still published", ed.status === "published");
    check("no duplicate published notification", after === before);
  }
}

async function walkEditionB(seeded) {
  const { users, editionB } = seeded;
  const userIds = users.map((u) => u.id);

  section("Round 2: too-few-answers auto-extend (zero entries at close)");
  {
    const before = await countNotif(userIds, "catchup_answers_open");
    await advanceEdition(await freshEdition(editionB.id));
    const ed = await freshEdition(editionB.id);
    const after = await countNotif(userIds, "catchup_answers_open");
    check("status stays answering (extended, not advanced)", ed.status === "answering", ed.status);
    check(
      "remindersSent bit 4 (extended) set",
      (ed.remindersSent & REMINDER_EXTENDED) === REMINDER_EXTENDED,
      `remindersSent=${ed.remindersSent}`
    );
    check(
      "answersCloseAt pushed ~3 days out",
      inRange(ed.answersCloseAt, Date.now() + 3 * DAY_MS, 5 * 60_000)
    );
    check("catchup_answers_open re-fired to all 3 non-answerers", after - before === 3, `delta=${after - before}`);
  }

  section("Round 2: double-advance is idempotent (the extension itself)");
  {
    const before = await countNotif(userIds, "catchup_answers_open");
    await advanceEdition(await freshEdition(editionB.id));
    const ed = await freshEdition(editionB.id);
    const after = await countNotif(userIds, "catchup_answers_open");
    check("status still answering", ed.status === "answering");
    check("no duplicate re-extension notification", after === before, `before=${before} after=${after}`);
  }

  section("Round 2: after one extension, a second close proceeds regardless of count");
  {
    await prisma.catchupEdition.update({
      where: { id: editionB.id },
      data: { answersCloseAt: new Date(Date.now() - 60_000) },
    });
    const entryCount = await prisma.catchupEntry.count({ where: { editionId: editionB.id } });
    await advanceEdition(await freshEdition(editionB.id));
    const ed = await freshEdition(editionB.id);
    check("entryCount is still zero for this check", entryCount === 0, `entryCount=${entryCount}`);
    check("status advanced to preparing on the second pass", ed.status === "preparing", ed.status);
    check(
      "extended bit remains set (not extended a second time)",
      (ed.remindersSent & REMINDER_EXTENDED) === REMINDER_EXTENDED
    );
  }

  section("Round 2: preparing -> published");
  {
    await prisma.catchupEdition.update({
      where: { id: editionB.id },
      data: { publishAt: new Date(Date.now() - 60_000) },
    });
    const before = await countNotif(userIds, "catchup_published");
    await advanceEdition(await freshEdition(editionB.id));
    const ed = await freshEdition(editionB.id);
    const after = await countNotif(userIds, "catchup_published");
    check("status advanced to published", ed.status === "published", ed.status);
    check("catchup_published fired to all 3 members exactly once", after - before === 3, `delta=${after - before}`);
  }

  section("Round 2: double-advance is idempotent (published is terminal)");
  {
    const before = await countNotif(userIds, "catchup_published");
    await advanceEdition(await freshEdition(editionB.id));
    const after = await countNotif(userIds, "catchup_published");
    check("no duplicate published notification", after === before);
  }
}

async function checkResolveSpotify() {
  section("resolveSpotify: keyless oembed (real network) + SSRF host allowlist");

  // A durable, well-known track. resolveSpotify's `ok` flag reflects the
  // host/path allowlist only (spec 3.4.1 fails soft on the network call
  // itself), so `ok: true` is the correct hard assertion; whether the oembed
  // fetch itself returned metadata is reported separately and does not fail
  // the run, since that depends on outbound network access being available
  // wherever this script happens to execute.
  const known = await resolveSpotify("https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J?si=abc123");
  check("known track resolves (ok, SSRF allowlist passed)", known.ok === true, JSON.stringify(known));
  if (known.ok) {
    check("tracking query stripped from the stored songUrl", known.songUrl === "https://open.spotify.com/track/7tFiyTwD0nx5a1eklYtX2J");
    const gotArt = Boolean(known.songArt) && known.songTitle !== known.songUrl;
    console.log(
      `  [INFO] oembed metadata ${gotArt ? "resolved" : "unavailable (fail-soft path used)"}: title="${known.songTitle}", art=${known.songArt ?? "null"}`
    );
  }

  const rejected = await resolveSpotify("https://evil.example.com/track/abc123");
  check("a non-Spotify host is rejected (SSRF boundary, fails soft)", rejected.ok === false, JSON.stringify(rejected));
}

// ─── Cleanup: delete everything this run created, scoped by exact ids ────────
//
// Every step is defensive against partial state (a `seed()` that threw
// halfway through leaves some fields null / some arrays short) so a failed
// seed still gets fully cleaned up rather than leaking whatever it managed
// to create before the error.

async function cleanup(state) {
  const editionIds = [state.editionA?.id, state.editionB?.id].filter(Boolean);
  const userIds = state.users.map((u) => u.id);

  if (editionIds.length > 0) {
    const entryIds = (
      await prisma.catchupEntry.findMany({ where: { editionId: { in: editionIds } }, select: { id: true } })
    ).map((e) => e.id);
    if (entryIds.length > 0) {
      await prisma.catchupEntryLove.deleteMany({ where: { entryId: { in: entryIds } } });
    }
    await prisma.catchupEntry.deleteMany({ where: { editionId: { in: editionIds } } });
    await prisma.catchupPrompt.deleteMany({ where: { editionId: { in: editionIds } } });
    await prisma.catchupEdition.deleteMany({ where: { id: { in: editionIds } } });
  }
  if (state.catchup) {
    await prisma.catchupPref.deleteMany({ where: { catchupId: state.catchup.id } });
    await prisma.catchup.deleteMany({ where: { id: state.catchup.id } });
  }
  if (state.group) {
    await prisma.groupMember.deleteMany({ where: { groupId: state.group.id } });
    await prisma.group.deleteMany({ where: { id: state.group.id } });
  }
  if (userIds.length > 0) {
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function assertNoLeakage(state) {
  section("Cleanup: zero leakage (scoped to this run's own ids)");
  const editionIds = [state.editionA?.id, state.editionB?.id].filter(Boolean);
  const userIds = state.users.map((u) => u.id);

  const [catchupLeft, editionsLeft, promptsLeft, entriesLeft, lovesLeft, prefsLeft, membersLeft, groupLeft, notifsLeft, usersLeft] =
    await Promise.all([
      state.catchup ? prisma.catchup.count({ where: { id: state.catchup.id } }) : 0,
      editionIds.length ? prisma.catchupEdition.count({ where: { id: { in: editionIds } } }) : 0,
      editionIds.length ? prisma.catchupPrompt.count({ where: { editionId: { in: editionIds } } }) : 0,
      editionIds.length ? prisma.catchupEntry.count({ where: { editionId: { in: editionIds } } }) : 0,
      // Scoped by our own test users rather than a relation through the
      // (already-deleted) CatchupEntry rows: any love this script could ever
      // have created came from one of these throwaway accounts, and nobody
      // else in a shared community database knows their ids.
      userIds.length ? prisma.catchupEntryLove.count({ where: { userId: { in: userIds } } }) : 0,
      state.catchup ? prisma.catchupPref.count({ where: { catchupId: state.catchup.id } }) : 0,
      state.group ? prisma.groupMember.count({ where: { groupId: state.group.id } }) : 0,
      state.group ? prisma.group.count({ where: { id: state.group.id } }) : 0,
      userIds.length ? prisma.notification.count({ where: { userId: { in: userIds } } }) : 0,
      userIds.length ? prisma.user.count({ where: { id: { in: userIds } } }) : 0,
    ]);

  check("Catchup row deleted", catchupLeft === 0, `left=${catchupLeft}`);
  check("CatchupEdition rows deleted (both Rounds)", editionsLeft === 0, `left=${editionsLeft}`);
  check("CatchupPrompt rows deleted", promptsLeft === 0, `left=${promptsLeft}`);
  check("CatchupEntry rows deleted", entriesLeft === 0, `left=${entriesLeft}`);
  check("CatchupEntryLove rows deleted", lovesLeft === 0, `left=${lovesLeft}`);
  check("CatchupPref rows deleted", prefsLeft === 0, `left=${prefsLeft}`);
  check("GroupMember rows deleted", membersLeft === 0, `left=${membersLeft}`);
  check("Group row deleted", groupLeft === 0, `left=${groupLeft}`);
  check("Notification rows deleted", notifsLeft === 0, `left=${notifsLeft}`);
  check("User rows deleted", usersLeft === 0, `left=${usersLeft}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${TAG} starting`);
  if (!(await assertTablesReady())) {
    process.exitCode = 1;
    await prisma.$disconnect();
    return;
  }

  const beforeGlobal = await snapshotGlobalCounts();
  printCounts("Global Catchup* table counts before this run (informational)", beforeGlobal);

  const state = emptyState();
  try {
    section("Seed: throwaway group + 3 users + a Catch-up with two Rounds");
    await seed(state);
    check("seeded a group, 3 users, a Catchup, and 2 editions", true, `catchupId=${state.catchup.id}`);

    await walkEditionA(state);
    await walkEditionB(state);
    await checkResolveSpotify();
  } catch (err) {
    console.error(`\n${TAG} unexpected error during the walk:`, err);
    check("(fatal) the walk completed without throwing", false, String(err?.message ?? err));
  } finally {
    try {
      await cleanup(state);
      await assertNoLeakage(state);
    } catch (cleanupErr) {
      console.error(
        `\n${TAG} CLEANUP FAILED. If rows were left behind, they are tagged "${RUN_ID}" ` +
          `(user emails end in "-${RUN_ID}-N@qa.invalid", the group name starts with "${TAG}"). ` +
          "Remove them by hand.",
        cleanupErr
      );
      check("cleanup ran without throwing", false, String(cleanupErr?.message ?? cleanupErr));
    }
  }

  const afterGlobal = await snapshotGlobalCounts();
  printCounts("Global Catchup* table counts after this run (informational)", afterGlobal);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${TAG} ${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed`);
  if (failed.length > 0) {
    console.log("\nFailed checks:");
    for (const f of failed) console.log(`  - [${f.section}] ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    console.log(`\n${TAG} SMOKE TEST FAILED`);
  } else {
    console.log(`${TAG} SMOKE TEST PASSED`);
  }
  console.log("=".repeat(60));

  // process.exitCode (not process.exit()) so buffered stdout/stderr always
  // flushes before the process ends, even when this script's output is
  // piped rather than attached to a TTY. Node exits on its own once the
  // event loop drains, which $disconnect() below ensures happens promptly.
  process.exitCode = failed.length > 0 ? 1 : 0;
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(`${TAG} fatal error outside the guarded walk:`, err);
  process.exitCode = 1;
  try {
    await prisma.$disconnect();
  } catch {
    // already disconnected or never connected; nothing more to do.
  }
});

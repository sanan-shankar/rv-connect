#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Step two of the suggestion pass: put a session's answers back.
 *
 *  Reads `scripts/dev/.tagging/manifest.json` (what `tag-photos-pick.mjs` exported)
 *  and `scripts/dev/.tagging/verdicts.json` (what the session wrote), and writes the
 *  buckets and decades onto the rows. NOT captions -- see below.
 *
 *  THIS IS THE HALF THAT CAN DAMAGE A REAL ARCHIVE, so it is built to be
 *  hard to do that with:
 *
 *    - DRY BY DEFAULT. It prints every change it would make and writes
 *      nothing until `--apply`.
 *    - It only ever fills a field that is EMPTY. A bucket somebody
 *      chose and a date somebody gave are never touched -- the rule and
 *      its reasoning are in `src/lib/photo-suggest.ts`, which is where
 *      the tests are too.
 *    - IT NEVER WRITES A CAPTION AT ALL (owner, 2026-08-28: "tagging
 *      tool should not write captions"). A caption in the verdicts file
 *      is dropped, counted and reported below rather than refused: a
 *      field whose correct handling is to ignore it must not cost a
 *      batch of good buckets.
 *    - A bucket outside the six is REFUSED, not coerced to Other. A
 *      closed vocabulary that quietly accepts anything is not closed.
 *    - The rows are re-read at apply time, not trusted from the
 *      manifest, because a contributor may have filed one of them in the
 *      hours since the batch was picked.
 *    - Every write leaves `scripts/dev/.tagging/applied-<time>.json`, holding the old
 *      value of every column it touched. `--undo <file>` puts them back.
 *
 *  Run: node scripts/dev/tag-photos-apply.mjs [--apply] [--env .env.demo]
 *       node scripts/dev/tag-photos-apply.mjs --undo scripts/dev/.tagging/applied-….json --apply
 * ------------------------------------------------------------------ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { readEnv } from "./_env.mjs";
import { planChange, readVerdicts } from "../../src/lib/photo-suggest.ts";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const APPLY = flag("--apply");
const UNDO = value("--undo", null);
const envFile = value("--env", ".env");
const OUT = path.join(process.cwd(), "scripts", "dev", ".tagging");

const env = readEnv([envFile]);
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
  process.exit(1);
}
const DEMO_REF = "cbvlzptghkuxhygyaezq";
if (envFile.includes("demo") && !url.includes(DEMO_REF)) {
  console.error(`refusing: ${envFile} was asked for, but the connection does not carry the demo ref`);
  process.exit(1);
}

const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));

/** The columns this script is allowed to write, and nothing else ever. */
const COLUMNS = ["subject", "era", "datePrecision"];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/** Write one row's columns. Shared by the apply and the undo, so there is one
 *  place that knows how a column gets set and one list of which may be. */
async function writeRow(id, columns) {
  const names = Object.keys(columns).filter((c) => COLUMNS.includes(c));
  if (!names.length) return;
  const sets = names.map((c, i) => `"${c}" = $${i + 2}`).join(", ");
  await client.query(
    `UPDATE "Photo" SET ${sets} WHERE "id" = $1`,
    [id, ...names.map((c) => columns[c])]
  );
}

/* ---------------- undo ---------------- */

if (UNDO) {
  const log = await readJson(path.resolve(UNDO));
  if (log.database !== envFile) {
    console.error(
      `refusing: that log was applied against ${log.database}, and this run is pointed at ${envFile}`
    );
    process.exit(1);
  }
  console.log(`${log.changes.length} change(s) to put back, from ${UNDO}`);
  for (const c of log.changes) {
    for (const [column, was] of Object.entries(c.was)) {
      console.log(`  ${c.id}  ${column} <- ${JSON.stringify(was)}`);
    }
  }
  if (!APPLY) {
    console.log(`\nDry run. Add --apply to put them back.`);
    await client.end();
    process.exit(0);
  }
  await client.query("BEGIN");
  try {
    for (const c of log.changes) await writeRow(c.id, c.was);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
  console.log(`\nput back ${log.changes.length}.`);
  await client.end();
  process.exit(0);
}

/* ---------------- apply ---------------- */

const manifest = await readJson(path.join(OUT, "manifest.json"));
if (manifest.database !== envFile) {
  console.error(
    `refusing: that batch was picked from ${manifest.database}, and this run is pointed at ${envFile}.` +
      `\nThe ids belong to one database and applying them to another is the one mistake here that cannot be undone.`
  );
  process.exit(1);
}

let raw;
try {
  raw = await readJson(path.join(OUT, "verdicts.json"));
} catch {
  console.error(
    `No scripts/dev/.tagging/verdicts.json. That is the file the tagging session writes;` +
      `\nsee .claude/skills/tag-photos/SKILL.md.`
  );
  process.exit(1);
}

const known = new Set(manifest.photos.map((p) => p.id));
const { verdicts, problems, ignoredCaptions } = readVerdicts(raw, known);

if (ignoredCaptions) {
  console.log(
    `${ignoredCaptions} caption(s) in verdicts.json were ignored: this pass does not write` +
      ` captions. The buckets and decades beside them still apply.\n`
  );
}

if (problems.length) {
  console.log(`${problems.length} problem(s) in verdicts.json:`);
  for (const p of problems) console.log(`  ${p.at}: ${p.why}`);
  console.log("");
}

const unanswered = manifest.photos.filter((p) => !verdicts.some((v) => v.id === p.id));
if (unanswered.length) {
  // Said out loud rather than counted silently: a batch of sixty answered
  // fifty-two is a session that ran out of room, and the eight it dropped are
  // still untagged and will come back on the next pick.
  console.log(`${unanswered.length} of ${manifest.photos.length} photograph(s) were not answered.\n`);
}

if (!verdicts.length) {
  console.log("Nothing to apply.");
  await client.end();
  process.exit(problems.length ? 1 : 0);
}

/* The rows are re-read HERE rather than carried in the manifest. Hours pass
   between picking a batch and answering it, and in that time a contributor may
   have filed one of them -- in which case the answer is theirs and this must
   leave it alone. Reading the state we are about to decide about is the only
   way that check means anything. */
const { rows } = await client.query(
  `SELECT "id", "subject", "era", "datePrecision"
     FROM "Photo" WHERE "id" = ANY($1::text[]) AND "isHidden" = false`,
  [verdicts.map((v) => v.id)]
);
const byId = new Map(rows.map((r) => [r.id, r]));

const changes = [];
let unchanged = 0;
let missing = 0;
for (const v of verdicts) {
  const row = byId.get(v.id);
  if (!row) {
    missing += 1;
    continue;
  }
  const change = planChange(row, v);
  if (!change) {
    unchanged += 1;
    continue;
  }
  changes.push(change);
}

for (const c of changes) {
  const said = Object.entries(c.set)
    .map(([k, val]) => `${k}=${JSON.stringify(val)}`)
    .join("  ");
  console.log(`  ${c.id}  ${said}${c.kept.length ? `   (kept: ${c.kept.join("; ")})` : ""}`);
}

console.log(
  `\n${changes.length} row(s) to change, ${unchanged} already answered,` +
    `${missing ? ` ${missing} gone or hidden since the batch was picked,` : ""}` +
    ` against ${envFile}.`
);

if (!APPLY) {
  console.log(`Dry run. Add --apply to write.`);
  await client.end();
  process.exit(0);
}
if (!changes.length) {
  await client.end();
  process.exit(0);
}

const logFile = path.join(OUT, `applied-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
/* The log is written BEFORE the transaction commits, so an interrupted run
   leaves a log naming more than it changed rather than a change with no log.
   Undo is idempotent -- putting a column back to a value it already holds is a
   no-op -- so erring that way is the safe one. */
await writeFile(
  logFile,
  JSON.stringify({ database: envFile, applied: new Date().toISOString(), changes }, null, 2) + "\n"
);

await client.query("BEGIN");
try {
  for (const c of changes) await writeRow(c.id, c.set);
  await client.query("COMMIT");
} catch (err) {
  await client.query("ROLLBACK");
  console.error(`\nnothing was written: ${err instanceof Error ? err.message : err}`);
  await client.end();
  process.exit(1);
}

console.log(`\nchanged ${changes.length}. To put them back: --undo ${logFile} --apply`);
await client.end();

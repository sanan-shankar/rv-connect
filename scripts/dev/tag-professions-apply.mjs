#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Step three of the profession pass: put the session's answers back.
 *
 *  Dry by default. It prints one line per member saying exactly which
 *  tags it would write and which it is replacing, and writes nothing
 *  until `--apply`.
 *
 *  What it guarantees, so the session does not have to:
 *    - A tag outside the vocabulary is REFUSED, not quietly dropped. A
 *      closed vocabulary is only worth having if nothing outside it can
 *      be written, and "no tags is a legitimate answer" (rule 8) stops
 *      being a signal the moment an unrecognised value maps to silence.
 *    - Parents are added automatically (rule 6), so a child tag can
 *      never leave its parent's filter empty.
 *    - More than TAG_MAX_PER_PERSON judged tags is refused (rule 7).
 *    - An id outside the picked batch, or the same id answered twice, is
 *      refused: those are the two ways an answer lands on the wrong
 *      person.
 *    - The rows are re-read at apply time, so the source string stored
 *      is the text as it stands now, not as it was when picked.
 *    - Every write leaves `scripts/dev/.professions/applied-<time>.json` holding the
 *      old values. `--undo <file> --apply` puts them back.
 *
 *  UNLIKE tag-photos-apply.mjs, this one OVERWRITES tags that are
 *  already there. That script protects what a contributor typed; nobody
 *  types this column, so "only fill what is empty" would make a bad tag
 *  permanent and make splitting a tag impossible -- which is the whole
 *  point of `--tag` on the picker. The undo file is what makes that safe.
 *
 *  Run: node scripts/dev/tag-professions-apply.mjs [--apply]
 *       node scripts/dev/tag-professions-apply.mjs --undo <file> --apply
 *       node scripts/dev/tag-professions-apply.mjs --env .env.demo
 * ------------------------------------------------------------------ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { readEnv } from "./_env.mjs";
import {
  TAG_VALUES,
  TAG_MAX_PER_PERSON,
  sourceOf,
  withParents,
} from "../../src/lib/profession-tags.ts";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

const APPLY = flag("--apply");
const UNDO = value("--undo", null);
const envFile = value("--env", ".env");
const OUT = path.join(process.cwd(), "scripts", "dev", ".professions");

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

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/** Write one member's two columns. Shared by the apply and the undo, so
 *  there is one definition of what "putting it back" means. */
async function writeRow(id, tags, source) {
  await client.query(
    `UPDATE "User" SET "professionTags" = $2::text[], "professionTagSource" = $3 WHERE "id" = $1`,
    [id, tags, source]
  );
}

/* ---------------- undo ---------------- */

if (UNDO) {
  const log = JSON.parse(await readFile(path.resolve(process.cwd(), UNDO), "utf8"));
  if (log.database !== envFile) {
    console.error(
      `refusing: that log was written against ${log.database}, and this run is pointed at ${envFile}.`
    );
    process.exit(1);
  }
  console.log(`${log.changes.length} row(s) to put back${APPLY ? "" : "  (dry run)"}`);
  for (const c of log.changes) {
    console.log(`  ${c.id}  [${c.after.tags.join(", ")}] -> [${c.before.tags.join(", ")}]`);
    if (APPLY) await writeRow(c.id, c.before.tags, c.before.source);
  }
  console.log(APPLY ? "\nput back." : "\nNothing written. Add --apply.");
  await client.end();
  process.exit(0);
}

/* ---------------- read the batch and the answers ---------------- */

const manifest = JSON.parse(await readFile(path.join(OUT, "manifest.json"), "utf8"));
if (manifest.database !== envFile) {
  console.error(
    `refusing: that batch was picked from ${manifest.database}, and this run is pointed at ${envFile}.` +
      `\nThe ids belong to one database and applying them to another is the one mistake here that cannot be undone.`
  );
  process.exit(1);
}

const raw = JSON.parse(await readFile(path.join(OUT, "verdicts.json"), "utf8"));
/* A bare array instead of { people: [...] } is accepted, as the photograph
   applier accepts one: it is the shape a session reaches for first and
   refusing it teaches nothing. */
const entries = Array.isArray(raw) ? raw : raw.people;
if (!Array.isArray(entries)) {
  console.error(`verdicts.json should be { "people": [...] } or a bare array.`);
  process.exit(1);
}

const known = new Set(manifest.people.map((p) => p.id));
const problems = [];
const verdicts = new Map();

for (const [i, e] of entries.entries()) {
  const at = `people[${i}]${e && e.id ? ` (${e.id})` : ""}`;
  if (!e || typeof e.id !== "string") {
    problems.push([at, "no id"]);
    continue;
  }
  if (!known.has(e.id)) {
    problems.push([at, "not in this batch -- the verdicts file and the manifest have come apart"]);
    continue;
  }
  if (verdicts.has(e.id)) {
    problems.push([at, "answered twice"]);
    continue;
  }
  const tags = Array.isArray(e.tags) ? e.tags.map((t) => String(t).trim()).filter(Boolean) : null;
  if (tags === null) {
    problems.push([at, "`tags` must be an array (use [] to say the text names no field)"]);
    continue;
  }
  const unknown = tags.filter((t) => !TAG_VALUES.includes(t));
  if (unknown.length > 0) {
    problems.push([
      at,
      `not in the vocabulary: ${unknown.join(", ")}. Do not invent one -- ` +
        `leave the person untagged and the pile is the evidence for adding it properly (rule 8).`,
    ]);
    continue;
  }
  if (new Set(tags).size > TAG_MAX_PER_PERSON) {
    problems.push([
      at,
      `${new Set(tags).size} tags, and ${TAG_MAX_PER_PERSON} is the ceiling (rule 7). ` +
        `Most people want one or two -- keep the ones that name what they DO.`,
    ]);
    continue;
  }
  /* Rule 6, applied here rather than trusted to the session. Forgetting it
     is invisible at the time and expensive later: the day a tag splits,
     everyone moved onto a child would silently leave the parent and every
     saved link to it would return an empty page. */
  verdicts.set(e.id, withParents([...new Set(tags)]));
}

if (problems.length > 0) {
  console.error(`Refusing the batch. ${problems.length} problem(s):\n`);
  for (const [at, why] of problems) console.error(`  ${at}: ${why}`);
  console.error(`\nNothing was written. Fix verdicts.json and run again.`);
  await client.end();
  process.exit(1);
}

/* ---------------- re-read, compare, report ---------------- */

/* The rows are re-read HERE rather than trusted from the manifest. Hours
   can pass between the pick and the apply, and the source string that gets
   stored has to describe the text as it stands NOW -- otherwise a member
   who edited their job title in between is recorded as judged from words
   nobody read, and the next pick will not notice they changed. */
const ids = [...verdicts.keys()];
const { rows } = await client.query(
  `SELECT "id", "jobTitle", "workplace", "professionTags", "professionTagSource"
     FROM "User" WHERE "id" = ANY($1::text[])`,
  [ids]
);
const live = new Map(rows.map((r) => [r.id, r]));

const changes = [];
let unchanged = 0;
for (const id of ids) {
  const row = live.get(id);
  if (!row) {
    console.log(`  gone since the batch was picked, skipping: ${id}`);
    continue;
  }
  const before = { tags: row.professionTags ?? [], source: row.professionTagSource ?? null };
  const after = { tags: verdicts.get(id), source: sourceOf(row.jobTitle, row.workplace) };
  const same =
    before.tags.length === after.tags.length &&
    before.tags.every((t) => after.tags.includes(t)) &&
    before.source === after.source;
  if (same) {
    unchanged++;
    continue;
  }
  changes.push({ id, before, after, said: [row.jobTitle, row.workplace] });
}

const unanswered = manifest.people.length - verdicts.size;
console.log(
  `batch of ${manifest.people.length}: ${verdicts.size} answered, ${unanswered} left alone, ` +
    `${changes.length} to change, ${unchanged} already right.${APPLY ? "" : "   (dry run)"}\n`
);
for (const c of changes) {
  const from = c.before.tags.length ? `[${c.before.tags.join(", ")}]` : "(none)";
  const to = c.after.tags.length ? `[${c.after.tags.join(", ")}]` : "(none)";
  console.log(`  ${JSON.stringify(c.said[0])} @ ${JSON.stringify(c.said[1])}`);
  console.log(`      ${from} -> ${to}`);
}

if (!APPLY) {
  console.log(`\nNothing written. Read the list above, then add --apply.`);
  await client.end();
  process.exit(0);
}

if (changes.length === 0) {
  console.log(`Nothing to write.`);
  await client.end();
  process.exit(0);
}

const logFile = path.join(OUT, `applied-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await writeFile(
  logFile,
  JSON.stringify({ database: envFile, at: new Date().toISOString(), changes }, null, 2) + "\n"
);

for (const c of changes) await writeRow(c.id, c.after.tags, c.after.source);

console.log(`\nchanged ${changes.length}. To put them back: --undo ${logFile} --apply`);
await client.end();

#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Step three of the profession pass: put the session's answers back.
 *
 *  Dry by default. It prints one line per member saying exactly which
 *  tags it would write and which it is replacing -- and, where the session
 *  tidied the pair, the words it would write over the words that are
 *  there -- and writes nothing until `--apply`.
 *
 *  This file is the reading and the writing. What it decides -- what a
 *  well-formed answer is, when a row may be written, the statement that
 *  writes it -- is src/lib/profession-pass.ts, where a test can hold it.
 *  Between them they guarantee, so the session does not have to:
 *    - A tag outside the vocabulary is REFUSED, not quietly dropped, and so
 *      is the whole batch with it. "No tags is a legitimate answer" (rule
 *      8) stops being a signal the moment an unknown value maps to silence.
 *    - Parents are added automatically (rule 6), and more than
 *      TAG_MAX_PER_PERSON judged tags is refused (rule 7).
 *    - An id outside the picked batch, or answered twice, is refused: the
 *      two ways an answer lands on the wrong person.
 *    - A tidied job title or workplace the profile could not hold is
 *      refused, and one the member's next save would rewrite is flagged.
 *    - A member whose words changed since the pick is left alone, tags and
 *      all, and comes back on the next run.
 *    - The write is ONE statement, guarded row by row on the words it read:
 *      all of it lands or none does, and an edit landing after the re-read
 *      is not overwritten.
 *    - Every write leaves `scripts/dev/.professions/applied-<time>.json` holding the
 *      old values. `--undo <file> --apply` puts them back, and passes over
 *      anybody who has edited their words since.
 *
 *  UNLIKE tag-photos-apply.mjs, this one OVERWRITES tags that are
 *  already there. That script protects what a contributor typed; nobody
 *  types this column, so "only fill what is empty" would make a bad tag
 *  permanent and make splitting a tag impossible -- which is the whole
 *  point of `--tag` on the picker. The undo file is what makes that safe.
 *
 *  And since 2026-10-01 it overwrites what a member TYPED as well, which
 *  every hand-run pass refused until the owner asked for it (his words
 *  are on TIDY_RULES in src/lib/profession-tags.ts). The text guards
 *  above are the price of that, and none of them is optional.
 *
 *  Run: node scripts/dev/tag-professions-apply.mjs [--apply]
 *       node scripts/dev/tag-professions-apply.mjs --undo <file> --apply
 *       node scripts/dev/tag-professions-apply.mjs --env .env.demo
 * ------------------------------------------------------------------ */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { databaseUrl } from "./_env.mjs";
import { argv } from "./_cli.mjs";
import {
  GUARDED_WRITE,
  guardedWriteRows,
  planRow,
  readVerdicts,
  sameTags,
  sameText,
  undoneByNextSave,
} from "../../src/lib/profession-pass.ts";

const { flag, value } = argv();

const APPLY = flag("--apply");
const UNDO = value("--undo", null);
const envFile = value("--env", ".env");
const OUT = path.join(process.cwd(), "scripts", "dev", ".professions");

const { url } = databaseUrl(envFile);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const said = (r) => `${JSON.stringify(r.jobTitle)} @ ${JSON.stringify(r.workplace)}`;
const tagList = (tags) => (tags.length ? `[${tags.join(", ")}]` : "(none)");

/** The rows as they stand now, as the columns this pass writes. */
async function readLive(ids) {
  const { rows } = await client.query(
    `SELECT "id", "jobTitle", "workplace", "professionTags", "professionTagSource"
       FROM "User" WHERE "id" = ANY($1::text[])`,
    [ids]
  );
  return new Map(
    rows.map((r) => [
      r.id,
      {
        tags: r.professionTags ?? [],
        source: r.professionTagSource ?? null,
        jobTitle: r.jobTitle,
        workplace: r.workplace,
      },
    ])
  );
}

/** One change, printed the same way by the apply and the undo. */
function show(from, to, label) {
  console.log(`  ${said(from)}`);
  if (!sameText(from, to)) console.log(`      ${said(to)}   (${label})`);
  console.log(
    sameTags(from.tags, to.tags)
      ? `      ${tagList(to.tags)}, as before`
      : `      ${tagList(from.tags)} -> ${tagList(to.tags)}`
  );
}

/** Write through the one guarded statement. Returns the rows it did NOT
 *  write, each one a member who edited in the moment before the write. */
async function write(rows) {
  if (rows.length === 0) return [];
  const { rows: written } = await client.query(GUARDED_WRITE, [guardedWriteRows(rows)]);
  const done = new Set(written.map((r) => r.id));
  const missed = rows.filter((r) => !done.has(r.id));
  for (const r of missed) console.log(`  left alone, edited in the moment before the write: ${said(r.over)}`);
  return missed;
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
  /* Read first, so the dry run can name who would be passed over rather
     than discovering it on --apply. The statement's own guard still holds
     for anybody who edits between this read and the write. */
  const live = await readLive(log.changes.map((c) => c.id));
  const back = log.changes.filter((c) => live.has(c.id) && sameText(live.get(c.id), c.after));
  const kept = log.changes.filter((c) => !back.includes(c));

  console.log(`${back.length} of ${log.changes.length} row(s) to put back${APPLY ? "" : "  (dry run)"}`);
  for (const c of back) show(c.after, c.before, "their words, back");
  for (const c of kept) {
    console.log(`  left alone, ${live.has(c.id) ? "edited since the apply" : "gone"}: ${said(c.after)}`);
  }

  if (APPLY) {
    const missed = await write(back.map((c) => ({ id: c.id, to: c.before, over: c.after })));
    console.log(`\nput back ${back.length - missed.length}.`);
  } else {
    console.log("\nNothing written. Add --apply.");
  }
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

const batch = new Map(manifest.people.map((p) => [p.id, p]));
const { verdicts, problems } = readVerdicts(
  JSON.parse(await readFile(path.join(OUT, "verdicts.json"), "utf8")),
  new Set(batch.keys())
);

if (problems.length > 0) {
  console.error(`Refusing the batch. ${problems.length} problem(s):\n`);
  for (const { at, why } of problems) console.error(`  ${at}: ${why}`);
  console.error(`\nNothing was written. Fix verdicts.json and run again.`);
  await client.end();
  process.exit(1);
}

/* ---------------- re-read, compare, report ---------------- */

/* Re-read HERE rather than trusted from the manifest, because hours can
   pass between the pick and the apply -- planRow is what does with that. */
const live = await readLive(verdicts.map((v) => v.id));

const changes = [];
const moved = [];
let unchanged = 0;
for (const v of verdicts) {
  const row = live.get(v.id);
  if (!row) {
    console.log(`  gone since the batch was picked, skipping: ${v.id}`);
    continue;
  }
  const plan = planRow(row, batch.get(v.id), v);
  if (plan.kind === "moved") moved.push(row);
  else if (plan.kind === "same") unchanged++;
  else changes.push({ id: v.id, before: plan.before, after: plan.after });
}

const unanswered = manifest.people.length - verdicts.length;
const retyped = changes.filter((c) => !sameText(c.before, c.after)).length;
console.log(
  `batch of ${manifest.people.length}: ${verdicts.length} answered, ${unanswered} left alone, ` +
    `${changes.length} to change (${retyped} with their words tidied), ${unchanged} already right.` +
    `${APPLY ? "" : "   (dry run)"}\n`
);
for (const c of changes) {
  show(c.before, c.after, "tidied");
  for (const note of undoneByNextSave(c.before, c.after)) {
    console.log(`      note: their next save would undo this -- ${note}`);
  }
}
if (moved.length > 0) {
  console.log(
    `\n${moved.length} edited their words since the pick, so their answers were judged from words that` +
      ` are gone. Left alone; the next pick takes them again:`
  );
  for (const r of moved) console.log(`  ${said(r)}`);
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

/* Written BEFORE the statement, so the way back exists before anything it
   undoes does. A row the guard then refuses is in the log too, harmlessly:
   the undo passes over it, because its words are not the ones this run
   would have written. */
const logFile = path.join(OUT, `applied-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
await writeFile(
  logFile,
  JSON.stringify({ database: envFile, at: new Date().toISOString(), changes }, null, 2) + "\n"
);

const missed = await write(changes.map((c) => ({ id: c.id, to: c.after, over: c.before })));
console.log(`\nchanged ${changes.length - missed.length}. To put them back: --undo ${logFile} --apply`);
await client.end();

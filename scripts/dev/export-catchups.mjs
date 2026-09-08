#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Every Catch-up, out of the database and onto the disk, rebuildable.
 *
 *  WHY: the Catch-ups rework (docs/planning/catchups-rework/) is going to
 *  move schema and screens under seventy live beta testers. The owner's
 *  one condition, brief ¶45 and ¶51: "I would like it not to be deleted...
 *  put it all in whatever file type you want, so that it can be rebuilt
 *  later", and "any form of saving previous catch ups is good as long as
 *  they're totally regeneratable".
 *
 *  "Totally regeneratable" is the test this script has to pass, and it is
 *  why the photograph BYTES are copied rather than their urls recorded.
 *  A JSON file full of `images.r2.dev` links is regenerable only for as
 *  long as that bucket exists and that key is untouched -- which is
 *  exactly the thing a rework might break. The nightly pg_dump and the
 *  media mirror (docs/OPERATIONS.md) are the floor under all of this;
 *  this is the thing you can open, read and restore from by hand.
 *
 *  READ-ONLY against the database. Nothing here deletes, updates or
 *  inserts anything, ever, in any mode -- there is no `--apply` that
 *  writes to Postgres, because there is nothing it could usefully write.
 *
 *  DRY BY DEFAULT anyway, as a courtesy: a bare run prints exactly what
 *  it would write and touches no disk. `--write` writes the folder. The
 *  asymmetry is deliberate -- the dry run is how you check the counts
 *  against docs/planning/catchups-rework/handover.md F1 before spending
 *  a few hundred megabytes and a few minutes on image fetches.
 *
 *  It is an ORDINARY dev script, not a hand-run pass. docs/spec/
 *  hand-run-passes.md governs passes where a model judges members' data
 *  and writes a judgment back (the Collection's tags, the directory's
 *  professions). This makes no judgments; it copies. See handover F16,
 *  which withdrew an earlier claim that the pass protocol applied here.
 *
 *  Output: scripts/dev/.exports/catchups/<date>/
 *      catchups.json          the whole thing, shape = src/lib/catchups-export.ts
 *      photos/<answerId>-N.<ext>   every answer photograph
 *      avatars/<userId>.<ext>      every uploaded member photo
 *  Beside the script, not above it: the repo root is closed, and
 *  `scripts/dev/.*` is already gitignored. This folder holds members'
 *  private words and MUST NOT be committed.
 *
 *  Run: node scripts/dev/export-catchups.mjs            (dry)
 *       node scripts/dev/export-catchups.mjs --write
 *       node scripts/dev/export-catchups.mjs --write --no-photos
 *       node scripts/dev/export-catchups.mjs --write --out <dir> --env .env.demo
 * ------------------------------------------------------------------ */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { databaseUrl } from "./_env.mjs";
import { argv, bytesFor } from "./_cli.mjs";

const { flag, value } = argv();
const WRITE = flag("--write");
const NO_PHOTOS = flag("--no-photos");
const envFile = value("--env", ".env");
const { url } = databaseUrl(envFile);

const stamp = new Date().toISOString().slice(0, 10);
const OUT = path.resolve(
  process.cwd(),
  value("--out", path.join("scripts", "dev", ".exports", "catchups", stamp))
);

/* The one guard on where this lands. `--out` exists so an export can be
   staged somewhere else before a migration, and the repo root is closed
   (CLAUDE.md, and scripts/qa/hand-run-passes.test.mjs fails a pass whose
   output climbs to it). A path outside the repo is fine; the root itself
   is not. */
const REPO_ROOT = path.resolve(process.cwd());
if (path.dirname(OUT) === REPO_ROOT) {
  console.error(`refusing to write to the repo root: ${OUT}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const q = async (text, params = []) => (await client.query(text, params)).rows;
const iso = (d) => (d ? new Date(d).toISOString() : null);

/** `promptKind` from src/lib/catchups-types.ts, which this .mjs cannot import
 *  through the TS path alias. Three lines, and a drift here would only
 *  mislabel a fixture's `kind`; the `category` it derives from is exported
 *  beside it, so nothing is lost either way. */
const kindOf = (category) =>
  category === "photo-wall" ? "photo" : category === "songs" ? "songs" : "text";

// ─── read everything ─────────────────────────────────────────────────────────

const catchups = await q(`
  select s.*, g.name as group_name, g."batchYear" as batch_year
  from "CatchupSeries" s join "Group" g on g.id = s."groupId"
  order by s."createdAt"
`);

const members = await q(`
  select gm."groupId", gm.role, gm."joinedAt",
         u.id, u.name, u."batchYear", u."photoUrl", u."birdOverride"
  from "GroupMember" gm join "User" u on u.id = gm."userId"
  order by gm."groupId", u.name
`);

const prefs = await q(`select * from "CatchupReminderPref"`);
const editions = await q(`select * from "CatchupEdition" order by "catchupId", number`);
const prompts = await q(`
  select p.*, u.id as a_id, u.name as a_name, u."batchYear" as a_batch,
         u."photoUrl" as a_photo, u."birdOverride" as a_bird
  from "CatchupPrompt" p left join "User" u on u.id = p."authorId"
  order by p."editionId", p.position
`);
const entries = await q(`
  select e.*, u.id as a_id, u.name as a_name, u."batchYear" as a_batch,
         u."photoUrl" as a_photo, u."birdOverride" as a_bird
  from "CatchupEntry" e join "User" u on u.id = e."authorId"
  order by e."promptId", e."createdAt"
`);
const hearts = await q(`select "entryId", "userId" from "CatchupEntryLove"`);

await client.end();

// ─── index by parent ─────────────────────────────────────────────────────────

const by = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

const membersByGroup = by(members, "groupId");
const prefsByCatchup = by(prefs, "catchupId");
const editionsByCatchup = by(editions, "catchupId");
const promptsByEdition = by(prompts, "editionId");
const entriesByPrompt = by(entries, "promptId");
const heartsByEntry = by(hearts, "entryId");

const person = (r, prefix = "a_") => {
  const id = r[`${prefix}id`];
  if (!id) return null;
  return {
    id,
    name: r[`${prefix}name`],
    batchYear: r[`${prefix}batch`] ?? null,
    photoUrl: r[`${prefix}photo`] ?? null,
    birdOverride: r[`${prefix}bird`] ?? null,
  };
};

/* Every file the export wants to copy, collected while the JSON is built and
   fetched afterwards. Collecting first means the dry run can report the exact
   count and the exact destinations without fetching a byte. */
const wanted = [];
const wantPhoto = (url, dir, base) => {
  if (!url) return null;
  /* Extension from the url, capped and cleaned: these are our own keys, but a
     url is member-adjacent input and this becomes a filename. */
  const ext = (url.split("?")[0].split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const file = path.join(dir, `${base}.${ext.length > 0 && ext.length <= 5 ? ext : "bin"}`);
  wanted.push({ url, file });
  return file;
};

const out = {
  version: 1,
  takenAt: new Date().toISOString(),
  source: "live",
  note: `exported from ${envFile} by scripts/dev/export-catchups.mjs`,
  catchups: catchups.map((c) => {
    const keepers = new Set([c.createdById].filter(Boolean));
    return {
      id: c.id,
      groupId: c.groupId,
      groupName: c.group_name,
      batchYear: c.batch_year ?? null,
      title: c.title,
      intro: c.intro,
      cadence: c.cadence,
      status: c.status,
      createdById: c.createdById,
      // inviteToken is deliberately absent: it is a bearer token. See the type.
      nextOpensAt: iso(c.nextOpensAt),
      pausedAt: iso(c.pausedAt),
      createdAt: iso(c.createdAt),
      updatedAt: iso(c.updatedAt),
      members: (membersByGroup.get(c.groupId) ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        batchYear: m.batchYear ?? null,
        photoUrl: m.photoUrl ?? null,
        birdOverride: m.birdOverride ?? null,
        photoFile: NO_PHOTOS ? null : wantPhoto(m.photoUrl, "avatars", m.id),
        role: m.role,
        joinedAt: iso(m.joinedAt),
        isKeeper: keepers.has(m.id),
      })),
      prefs: (prefsByCatchup.get(c.id) ?? []).map((p) => ({
        userId: p.userId,
        reminderMode: p.reminderMode,
        archivedAt: iso(p.archivedAt),
      })),
      editions: (editionsByCatchup.get(c.id) ?? []).map((r) => ({
        id: r.id,
        number: r.number,
        theme: r.theme,
        status: r.status,
        questionsCloseAt: iso(r.questionsCloseAt),
        answersCloseAt: iso(r.answersCloseAt),
        publishedAt: iso(r.publishedAt),
        remindersSent: r.remindersSent,
        createdAt: iso(r.createdAt),
        questions: (promptsByEdition.get(r.id) ?? []).map((p) => ({
          id: p.id,
          author: person(p),
          text: p.text,
          category: p.category,
          kind: kindOf(p.category),
          source: p.source,
          showAsker: p.showAsker,
          accepted: p.accepted,
          position: p.position,
          createdAt: iso(p.createdAt),
          answers: (entriesByPrompt.get(p.id) ?? []).map((e) => {
            /* `images` is a JSON array of urls in a text column. A row that
               cannot be parsed is recorded as no photographs rather than
               crashing the export -- losing one malformed row's images is
               bad, losing the whole export is worse. */
            let urls = [];
            try {
              const parsed = e.images ? JSON.parse(e.images) : [];
              if (Array.isArray(parsed)) urls = parsed.filter((u) => typeof u === "string");
            } catch {
              console.warn(`  ! entry ${e.id}: images column is not JSON, exported as none`);
            }
            return {
              id: e.id,
              author: person(e),
              body: e.body,
              images: urls.map((u, i) => ({
                url: u,
                file: NO_PHOTOS ? null : wantPhoto(u, "photos", `${e.id}-${i}`),
                bytes: null,
              })),
              songUrl: e.songUrl,
              songTitle: e.songTitle,
              songArt: e.songArt,
              hearts: (heartsByEntry.get(e.id) ?? []).map((h) => h.userId),
              createdAt: iso(e.createdAt),
              updatedAt: iso(e.updatedAt),
            };
          }),
        })),
      })),
    };
  }),
};

// ─── report, then (only with --write) put it on disk ─────────────────────────

const answers = out.catchups.flatMap((c) =>
  c.editions.flatMap((r) => r.questions.flatMap((q2) => q2.answers))
);
const totals = {
  catchups: out.catchups.length,
  editions: out.catchups.reduce((n, c) => n + c.editions.length, 0),
  questions: out.catchups.reduce((n, c) => n + c.editions.reduce((m, r) => m + r.questions.length, 0), 0),
  answers: answers.length,
  answersWithPhotos: answers.filter((a) => a.images.length > 0).length,
  photos: answers.reduce((n, a) => n + a.images.length, 0),
  hearts: answers.reduce((n, a) => n + a.hearts.length, 0),
  memberships: out.catchups.reduce((n, c) => n + c.members.length, 0),
  prefs: out.catchups.reduce((n, c) => n + c.prefs.length, 0),
  filesToCopy: wanted.length,
};

console.log(`\nCatch-ups export  (${WRITE ? "WRITE" : "dry run"}, ${envFile})\n`);
for (const c of out.catchups) {
  const rs = c.editions.map((r) => `R${r.number}:${r.status}`).join(" ");
  console.log(
    `  ${c.groupName.padEnd(16)} ${c.status.padEnd(7)} ${String(c.members.length).padStart(3)} members  ${rs}`
  );
}
console.log("");
for (const [k, v] of Object.entries(totals)) console.log(`  ${k.padEnd(18)} ${v}`);
console.log(`\n  destination        ${path.relative(process.cwd(), OUT)}`);

if (!WRITE) {
  console.log(`\nNothing written. Re-run with --write to export.\n`);
  process.exit(0);
}

await mkdir(OUT, { recursive: true });
if (wanted.length > 0) {
  await mkdir(path.join(OUT, "photos"), { recursive: true });
  await mkdir(path.join(OUT, "avatars"), { recursive: true });
}

/* One at a time. This runs a few hundred times at most against our own
   bucket, on a laptop, once before a migration; concurrency would buy
   seconds and cost the ability to read the log when one fails. */
let copied = 0;
const failed = [];
const sizes = new Map();
for (const { url: u, file } of wanted) {
  try {
    const bytes = await bytesFor(u);
    await writeFile(path.join(OUT, file), bytes);
    sizes.set(file, bytes.length);
    copied += 1;
    if (copied % 25 === 0) console.log(`  copied ${copied}/${wanted.length}`);
  } catch (err) {
    failed.push({ file, url: u, why: String(err.message ?? err) });
  }
}

/* Record the byte count next to each image, and null the `file` of anything
   that did not arrive. A restore has to be able to tell "this answer had no
   photograph" from "this photograph did not come with us". */
for (const c of out.catchups) {
  for (const m of c.members) if (m.photoFile && !sizes.has(m.photoFile)) m.photoFile = null;
  for (const r of c.editions)
    for (const q2 of r.questions)
      for (const a of q2.answers)
        for (const img of a.images) {
          if (img.file && sizes.has(img.file)) img.bytes = sizes.get(img.file);
          else img.file = null;
        }
}

await writeFile(path.join(OUT, "catchups.json"), JSON.stringify(out, null, 2) + "\n");

const megabytes = ([...sizes.values()].reduce((n, b) => n + b, 0) / 1e6).toFixed(1);
console.log(`\n  wrote catchups.json and ${copied} files (${megabytes} MB)`);
if (failed.length > 0) {
  console.log(`\n  ${failed.length} did NOT copy, and are recorded as file: null:`);
  for (const f of failed.slice(0, 10)) console.log(`    ${f.file}  ${f.why}`);
  if (failed.length > 10) console.log(`    ...and ${failed.length - 10} more`);
}
console.log(
  `\n  ${path.relative(process.cwd(), OUT)} is gitignored and holds members' private` +
    `\n  words and photographs. Do not commit it, and do not move it into the repo root.\n`
);

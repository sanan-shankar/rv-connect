#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Step one of the suggestion pass: put the untagged photographs where a
 *  session can look at them.
 *
 *  WHY: spec sec. 8.3 wants the taxonomy filled in without asking a
 *  contributor to do it, because 70-80% of this archive arrives in bulk
 *  and nobody is going to tag a hundred photographs one at a time. It
 *  was drawn as a paid API call; the owner redirected it on 2026-08-28
 *  to a Claude Code session on his own subscription, which can simply
 *  READ the photographs. That is what this puts on disk.
 *
 *  It writes a working folder, `.tagging/`, holding one small JPEG per
 *  photograph and a manifest saying what each one is and what the
 *  contributor already typed. The session reads them, writes
 *  `.tagging/verdicts.json`, and `tag-photos-apply.mjs` puts the answers
 *  back. `.claude/skills/tag-photos/SKILL.md` is the whole procedure.
 *
 *  READ-ONLY against the database. It writes nothing anywhere but
 *  `.tagging/`, which is gitignored -- it holds copies of real members'
 *  photographs and must never enter git, for the same reason `.backups/`
 *  must not.
 *
 *  Run: node scripts/dev/tag-photos-pick.mjs [--limit N] [--all]
 *                                            [--env .env.demo]
 * ------------------------------------------------------------------ */

import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { readEnv } from "./_env.mjs";
import { sharpImage } from "../../src/lib/image.ts";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i === -1 ? fallback : argv[i + 1];
};

/** How many photographs one session takes on.
 *
 *  Sixty because reading a photograph costs a tool call and a place in the
 *  session's context, and a batch that outgrows the context is a batch that
 *  gets answered carelessly at the end. Run it again for the next sixty --
 *  the picker only ever exports photographs that are still untagged, so
 *  repeating it walks the archive rather than re-reading it. */
const DEFAULT_LIMIT = 60;

const LIMIT = Number(value("--limit", DEFAULT_LIMIT));
const ALL = flag("--all");
const envFile = value("--env", ".env");
const OUT = path.join(process.cwd(), ".tagging");

const env = readEnv([envFile]);
const url = env.DIRECT_URL || env.DATABASE_URL;
if (!url) {
  console.error(`No DIRECT_URL or DATABASE_URL found in ${envFile}`);
  process.exit(1);
}
/* The same destination check run-sql.mjs makes: asking for the demo and
   getting production is the worst outcome a script in this folder has. */
const DEMO_REF = "cbvlzptghkuxhygyaezq";
if (envFile.includes("demo") && !url.includes(DEMO_REF)) {
  console.error(`refusing: ${envFile} was asked for, but the connection does not carry the demo ref`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/* Untagged means no bucket. That is the field the whole of sec. 7 rests on and
   the one a contributor can silently refuse to fill (D35: nothing is
   required), so it is the default. `--all` widens it to anything still missing
   a DATE as well, for a second pass over photographs that were filed but not
   dated. Not captions: this pass does not write them (see the note at the top
   of src/lib/photo-suggest.ts), so picking a photograph BECAUSE it has no
   caption would export bytes for a question nobody is going to answer.
   Hidden rows are left out either way: they are removed, and filing them
   better serves nobody. */
const wanted = ALL
  ? `("subject" IS NULL OR "subject" = ''
      OR "datePrecision" IS NULL OR "datePrecision" = 'unknown')`
  : `("subject" IS NULL OR "subject" = '')`;

const { rows } = await client.query(
  `SELECT p."id", p."thumbUrl", p."url", p."caption", p."area", p."era",
          p."photoYear", p."photoMonth", p."datePrecision", p."subject",
          p."approved", p."createdAt", u."name" AS uploader
     FROM "Photo" p
     LEFT JOIN "User" u ON u."id" = p."uploaderId"
    WHERE p."isHidden" = false AND ${wanted}
    ORDER BY p."createdAt" DESC
    LIMIT $1`,
  [Number.isFinite(LIMIT) ? LIMIT : DEFAULT_LIMIT]
);

const { rows: totals } = await client.query(
  `SELECT count(*)::int AS n FROM "Photo" WHERE "isHidden" = false AND ${wanted}`
);
const outstanding = totals[0]?.n ?? rows.length;

console.log(
  `${outstanding} photograph(s) ${ALL ? "still missing something" : "with no bucket"}; ` +
    `taking ${rows.length}.`
);
if (rows.length === 0) {
  console.log("Nothing to do.");
  await client.end();
  process.exit(0);
}

/* A fresh folder every run. A leftover JPEG from a previous batch sitting
   beside this one's manifest is how a session ends up describing a photograph
   nobody asked about, and the manifest is the only thing that says which is
   which. */
await rm(OUT, { recursive: true, force: true });
await mkdir(path.join(OUT, "photos"), { recursive: true });

/** The bytes behind one of our public urls. Local dev writes root-relative
 *  paths under public/; production writes absolute ones on the bucket's host. */
async function bytesFor(u) {
  if (u.startsWith("/")) return readFile(path.join(process.cwd(), "public", u.slice(1)));
  const res = await fetch(u);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** What the contributor already said, in the words the session will read. */
function saidSoFar(r) {
  const said = {};
  if (r.caption) said.caption = r.caption;
  if (r.area) said.where = r.area;
  if (r.photoYear && r.photoMonth) said.when = `${r.photoYear}-${String(r.photoMonth).padStart(2, "0")}`;
  else if (r.photoYear) said.when = String(r.photoYear);
  else if (r.era && r.era !== "unknown") said.when = r.era;
  if (r.subject) said.buckets = r.subject.split(",").filter(Boolean);
  return said;
}

const photos = [];
const failures = [];

/* One at a time, deliberately: this reads the live bucket that is also serving
   the site, it is a hand-run job with no deadline, and a fleet of parallel
   fetches costs more than it saves. Same reasoning as the dimensions backfill. */
for (const [i, r] of rows.entries()) {
  const n = String(i + 1).padStart(3, "0");
  const file = `${n}-${r.id}.jpg`;
  try {
    /* JPEG, not the stored WebP, and 640px rather than the 480 the thumbnail
       already is. The format because it is the one every image reader takes
       without a question; the size because a bucket is a judgment about what
       is IN the frame -- a bird at the edge of a 480px thumbnail is a smudge,
       and the whole batch is a few megabytes either way. */
    const jpeg = await sharpImage(await bytesFor(r.thumbUrl || r.url))
      .resize(640, 640, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    await writeFile(path.join(OUT, "photos", file), jpeg);
    photos.push({ id: r.id, file: `photos/${file}`, uploader: r.uploader ?? "(deleted account)", said: saidSoFar(r) });
  } catch (err) {
    failures.push([r.id, err instanceof Error ? err.message : String(err)]);
  }
}

await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify(
    {
      /* Which database these ids belong to, spelled out. There is one
         connection string for production and local dev and a second for the
         demo, and applying a demo batch to the real archive is the one
         irreversible mistake available here. */
      database: envFile,
      taken: new Date().toISOString(),
      outstanding,
      photos,
    },
    null,
    2
  ) + "\n"
);

console.log(`\nwrote ${photos.length} to .tagging/photos/, failed ${failures.length}`);
for (const [id, why] of failures) console.log(`  ${why}  ${id}`);
console.log(
  `\nNext: a session reads .tagging/manifest.json and the photographs beside it, writes` +
    `\n.tagging/verdicts.json, then \`node scripts/dev/tag-photos-apply.mjs\` (dry by default).` +
    `\nThe procedure is .claude/skills/tag-photos/SKILL.md.`
);
await client.end();

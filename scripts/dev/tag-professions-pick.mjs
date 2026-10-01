#!/usr/bin/env node
/* ------------------------------------------------------------------ *
 *  Step one of the profession pass: put the pairs where a session can
 *  read them.
 *
 *  WHY: the directory's Profession filter needs a bucket per member, and
 *  the bucket is only readable from the PAIR -- `workplace` holds the
 *  organisation ("Tufts University") and `jobTitle` the role ("Student"),
 *  so neither column can be filtered on alone. Measured on the live
 *  database 2026-08-28: 63 members, 34 with any work text, and the
 *  filter's old self-selection vocabulary matched none of them.
 *
 *  Like the Collection's tagging pass, the judgement is made by a Claude
 *  Code session on the owner's own subscription rather than a paid API
 *  call. The same reading also tidies the pair itself, since 2026-10-01
 *  (TIDY_RULES in src/lib/profession-tags.ts). This script does the part a
 *  session should not: it reads the database and writes a manifest. The session reads the manifest, writes
 *  `scripts/dev/.professions/verdicts.json`, and tag-professions-apply.mjs puts the
 *  answers back. The procedure is .claude/skills/tag-professions/SKILL.md.
 *
 *  READ-ONLY against the database. Writes nothing anywhere but
 *  `scripts/dev/.professions/`, which is gitignored. Beside the scripts that
 *  own it rather than in the repo root: the owner keeps the root short, and an
 *  ignored working folder is the clearest case of something that does not have
 *  to be there. `scripts/dev/.tagging/`, the photograph pass's equivalent, sits
 *  beside it for the same reason. The shape both passes share, and the rule
 *  that a third one conforms rather than inventing its own, is
 *  docs/spec/hand-run-passes.md.
 *
 *  Run: node scripts/dev/tag-professions-pick.mjs [--all] [--limit N]
 *                                                 [--tag <value>]
 *                                                 [--env .env.demo]
 * ------------------------------------------------------------------ */

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { databaseUrl } from "./_env.mjs";
import { argv } from "./_cli.mjs";
import { PROFESSION_TAGS, TAG_FLOOR, TAG_RULES, TIDY_RULES, sourceOf } from "../../src/lib/profession-tags.ts";

const { flag, value } = argv();

/* No default limit, unlike the photograph picker's sixty.
 *
 * That one exports IMAGES, and a batch that outgrows a session's context
 * gets answered carelessly at the end. This exports two short strings per
 * person: the whole membership at 2,000 people is a few pages, and
 * splitting it into batches would cost the thing that makes the vocabulary
 * work -- rules 3, 4 and 5 are judgements about the DISTRIBUTION, and you
 * cannot see a distribution sixty rows at a time. `--limit` is here for
 * when somebody wants a look, not for the real pass. */
const LIMIT = Number(value("--limit", 0));
const ALL = flag("--all");
const ONLY_TAG = value("--tag", null);
const envFile = value("--env", ".env");
const OUT = path.join(process.cwd(), "scripts", "dev", ".professions");

const { url } = databaseUrl(envFile);

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

/* Live members only -- blocked accounts and accounts inside the 60-day
   deletion grace window are already gone from the directory, so tagging
   them is work nobody can see the result of. The same pair of clauses
   buildDirectoryWhere opens with. */
const LIVE = `u."isBlocked" = false AND u."deletionRequestedAt" IS NULL`;

/* Somebody has to have said SOMETHING. A member with both columns empty
   cannot be tagged from anything, and exporting them would fill the
   manifest with rows whose only honest answer is the blank they already
   have. They arrive here the moment they fill either field in. */
const HAS_TEXT = `(nullif(btrim(coalesce(u."jobTitle", '')), '') IS NOT NULL
                   OR nullif(btrim(coalesce(u."workplace", '')), '') IS NOT NULL)`;

/* Three selectors, and the default is the one that makes re-running cheap.
 *
 *  default   never judged, or judged from text that has since CHANGED.
 *            That second half is what professionTagSource buys: a member
 *            who leaves school and becomes a doctor comes back on their
 *            own, without re-reading the 400 people who have not moved.
 *  --tag     everyone holding one tag. This is the SPLIT path: when
 *            Healthcare grows enough to become Healthcare + Doctors, this
 *            exports exactly the people who have to be re-judged.
 *  --all     everybody with any text, judged or not. The vocabulary round,
 *            and the only way to see the distribution rules 3-5 need. */
const params = [];
let wanted = HAS_TEXT;
if (ONLY_TAG) {
  params.push(ONLY_TAG);
  wanted = `u."professionTags" @> ARRAY[$${params.length}]::text[]`;
}
/* The default selector's "or the text has changed since" half is applied in
   JS, below, and NOT in this WHERE clause.
 *
 * It was written in SQL first, as
 * `json_build_array(coalesce("jobTitle", ''), coalesce("workplace", ''))::text`,
 * and it re-took all 34 people the run after they were tagged: Postgres
 * renders that as `["Businessman", "KSR Group"]` and JSON.stringify renders
 * it as `["Businessman","KSR Group"]`, so every row compared unequal to its
 * own source forever. Two implementations of one definition, disagreeing by
 * a space.
 *
 * So there is one implementation -- sourceOf() -- and this query returns the
 * candidates rather than the answer. It costs a few hundred short rows at
 * the size this will ever run at, and it cannot drift. */

const { rows: candidates } = await client.query(
  `SELECT u."id", u."jobTitle", u."workplace", u."bio", u."batchYear",
          u."accountType", u."professionTags", u."professionTagSource"
     FROM "User" u
    WHERE ${LIVE} AND ${wanted}
    ORDER BY u."jobTitle" NULLS LAST, u."workplace" NULLS LAST`,
  params
);

/* Never judged, or judged from words that have since changed. `--all` and
   `--tag` mean "take these whatever their state", so they skip it. */
const selected =
  ONLY_TAG || ALL
    ? candidates
    : candidates.filter((r) => r.professionTagSource !== sourceOf(r.jobTitle, r.workplace));
const rows = LIMIT > 0 ? selected.slice(0, LIMIT) : selected;

const { rows: totals } = await client.query(
  `SELECT count(*)::int AS n FROM "User" u WHERE ${LIVE} AND ${HAS_TEXT}`
);
const { rows: hist } = await client.query(
  `SELECT unnest(u."professionTags") AS tag, count(*)::int AS n
     FROM "User" u WHERE ${LIVE}
    GROUP BY 1 ORDER BY n DESC, tag ASC`
);
/* Rule 8's feedback loop. These are people who WERE judged and came back
   with nothing -- not people nobody has looked at yet, which is why a
   source is required. A run of the same kind of work in this list is the
   evidence for the next tag, arriving without anyone having had to guess
   in advance. It is the job "Other" does in the Collection, done better:
   there is no bucket to hide in, so the pile is the whole signal. */
const { rows: untagged } = await client.query(
  `SELECT u."jobTitle", u."workplace" FROM "User" u
    WHERE ${LIVE} AND ${HAS_TEXT}
      AND coalesce(array_length(u."professionTags", 1), 0) = 0
      AND u."professionTagSource" IS NOT NULL
    ORDER BY 1 NULLS LAST`
);

const people = rows.map((r) => ({
  id: r.id,
  jobTitle: r.jobTitle ?? null,
  workplace: r.workplace ?? null,
  /* Bio, because it is short, already public on the profile, and it is
     sometimes the only thing that names the field. NOT `about`, which is
     a long-form paragraph: much more of somebody's own words for the same
     one-line answer. NOT `name` either -- the judgement is on the work, a
     name adds nothing to it, and guessing a field from somebody's name is
     a way to be wrong that this pass should not even have available. */
  bio: r.bio ?? null,
  /* Earns its place: a 2024 leaver at a general university is Student, a
     1978 alumnus who writes "Doctor" is not. */
  batchYear: r.batchYear ?? null,
  accountType: r.accountType,
  currentTags: r.professionTags ?? [],
}));

console.log(
  `${totals[0]?.n ?? 0} live member(s) have said something about their work; taking ${people.length}` +
    `${ONLY_TAG ? ` (holding "${ONLY_TAG}")` : ALL ? " (all of them)" : " (new or changed since tagging)"}.`
);

if (hist.length > 0) {
  console.log(`\nTags as they stand (${TAG_FLOOR} needed before the filter offers one):`);
  for (const h of hist) {
    console.log(`  ${String(h.n).padStart(4)}  ${h.tag}${h.n >= TAG_FLOOR ? "" : "   (below the floor)"}`);
  }
}

if (untagged.length > 0) {
  console.log(
    `\nJudged and left untagged (${untagged.length}) -- read this pile, it is where the next tag comes from:`
  );
  for (const u of untagged) console.log(`  ${JSON.stringify(u.jobTitle)}  @  ${JSON.stringify(u.workplace)}`);
}

if (people.length === 0) {
  console.log("\nNothing to take.");
  await client.end();
  process.exit(0);
}

/* A fresh batch every run: a verdicts file left over from the previous batch
   sitting beside this manifest is how somebody's answers get applied to the
   wrong people. The manifest itself is overwritten just below.

   That one file, NOT the folder. It used to clear the whole folder, and the
   folder is also where the applier leaves its undo logs -- so the next pick
   silently deleted the only way back from the last apply, which matters most
   on the day an apply has rewritten what members typed. */
await mkdir(OUT, { recursive: true });
await rm(path.join(OUT, "verdicts.json"), { force: true });
await writeFile(
  path.join(OUT, "manifest.json"),
  JSON.stringify(
    {
      /* Which database these ids belong to. One connection string serves
         production and local dev and a second serves the demo, and
         applying a demo batch to the real membership is the one mistake
         here with no undo. The applier refuses a mismatch. */
      database: envFile,
      taken: new Date().toISOString(),
      selector: ONLY_TAG ? `tag:${ONLY_TAG}` : ALL ? "all" : "new-or-changed",
      outstanding: totals[0]?.n ?? people.length,
      /* The vocabulary and the rules travel WITH the batch rather than
         being looked up. A session reading a manifest picked last week
         should judge by the vocabulary that was current when it was
         picked, and a manifest that carries its own rules can be read by
         somebody who never opened the skill file. */
      vocabulary: PROFESSION_TAGS.map((t) => ({ value: t.value, label: t.label, hint: t.hint })),
      rules: TAG_RULES,
      /* How the pair should read, judged in the same pass. Optional per
         person in the verdicts: a field left out is left alone. */
      tidyRules: TIDY_RULES,
      people,
    },
    null,
    2
  ) + "\n"
);

console.log(
  `\nwrote ${people.length} to scripts/dev/.professions/manifest.json` +
    `\n\nNext: read it -- the vocabulary, the tag rules and the tidy rules are in the file -- write` +
    `\nscripts/dev/.professions/verdicts.json, then \`node scripts/dev/tag-professions-apply.mjs\` (dry by default).` +
    `\nThe procedure is .claude/skills/tag-professions/SKILL.md.`
);
await client.end();

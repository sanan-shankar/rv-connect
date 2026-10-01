---
name: tag-professions
description: Work out what field each member is in, from their job title and workplace, file them under the directory's profession tags, and tidy how those two fields read. Use when asked to tag professions, run the profession pass, fill in the Profession filter, or clean up members' job titles and workplaces. Writes back through a dry-run-by-default script with an undo, and never over words a member has changed since the batch was taken.
---

# Tagging what people do

Three steps, and the middle one is the only one that needs you.

This is one of the **hand-run passes**. `docs/spec/hand-run-passes.md` is the shape
they all share -- what a picker and an applier guarantee, where the working
folder goes, and the rules that hold across every pass. Read it if you are
changing this one or building a third. What follows is only what is particular
to professions.

```bash
node scripts/dev/tag-professions-pick.mjs --all      # export the pairs to scripts/dev/.professions/
#  ...you read them and write scripts/dev/.professions/verdicts.json...
node scripts/dev/tag-professions-apply.mjs           # dry run: shows every change
node scripts/dev/tag-professions-apply.mjs --apply   # writes
```

## Why this exists

The directory's Profession filter needs to know what field somebody is in, and nothing on
the site asks them. What it has instead is a pair of free-text columns: `workplace` holds
the **organisation** ("Tufts University", "Marvell", "Rishi Valley Rural Health Centre")
and `jobTitle` the **role** ("Student", "Computer Engineer", "Doctor"). Neither can be
filtered on alone — measured on the live database on 2026-08-28, the filter's old
self-selection vocabulary matched 0 of 63 members — and the answer is only ever readable
from the two together.

So a session reads the pairs and writes the tags. Not an API call: the owner runs this on
his own subscription, the same way `tag-photos` works, and for the same reason.

## Step 1 — take the batch

```bash
node scripts/dev/tag-professions-pick.mjs [--all] [--tag <value>] [--limit N] [--env .env.demo]
```

Read-only. Writes `scripts/dev/.professions/manifest.json`, which carries the people, **the vocabulary
and the rules**, so everything you need to judge is in the one file.

| | |
|---|---|
| *(no flag)* | never judged, or judged from text that has since changed. The routine re-run. |
| `--all` | everybody with any work text. Use this for the first pass and whenever the vocabulary itself is in question. |
| `--tag <value>` | everyone holding one tag. This is the **split path** — see below. |

It prints two things worth reading before you start: the tag histogram as it stands, and
the **judged-but-untagged pile**.

## Step 2 — read them

The rules are in `TAG_RULES` in `src/lib/profession-tags.ts`, and the picker copies them
into the manifest. **Read them there, not from this summary** — that file is what the tests
hold and this one is not.

Write `scripts/dev/.professions/verdicts.json`:

```json
{
  "people": [
    { "id": "clx…", "tags": ["student", "healthcare"] },
    { "id": "cly…", "tags": ["law"] },
    { "id": "clz…", "tags": [] }
  ]
}
```

A bare array instead of `{ "people": [...] }` is accepted too.

### The same reading tidies the pair

Since 2026-10-01 a verdict may also carry `jobTitle` and `workplace`: the words the member's
profile should print. The owner asked for it the day the pass first read everybody -- *"since
you're going through all of them you might as well just comb through them polish them up and um
change them all"* -- and the rules are `TIDY_RULES`, beside `TAG_RULES` in the same file, which the
manifest carries as `tidyRules`.

```json
{ "id": "clx…", "tags": ["student"], "jobTitle": "Student", "workplace": "Krea University" }
{ "id": "cly…", "tags": [], "workplace": null }
```

Present means "write this", `null` empties the field, and a field left out is left exactly as it
is. Most people need neither. The profile prints the pair as one sentence, "*job title* at
*workplace*", so that sentence is the test: "Teacher at Self" fails it, "Analyst at UBS" passes.

### The three mistakes this pass actually makes

**Over-tagging.** Four is the hard ceiling and most people want one or two. A tag means the
person *works in that field*, not that it is adjacent to it — a doctor at a hospital is
`["healthcare"]`, not Healthcare and Research and Social impact.

This is the **opposite** of the Collection's photograph buckets, which ask for as many as
genuinely apply. The reason they differ is what the tag is for: over-filing a photograph
costs nothing, because a photograph in three buckets is findable from three places. Over-
tagging a person makes every filtered result the whole directory, which is this feature
failing without anybody noticing. If you have read `tag-photos` recently, that instinct is
wrong here.

**Guessing a field from a general university.** "Student" at Ashoka, NYU, Edinburgh or
Delhi University names no field at all. That is `["student"]` and nothing else. "Student"
at GNLU is a law school, at SRMC a medical college, at the Culinary Arts Academy a
hospitality school — those name a field, and there the second tag is real. The line is
whether the institution or the course *tells* you, not whether you can imagine a likely
answer.

**Over-tidying.** The tidy fixes form -- capitals, acronyms, a placeholder, a course typed as an
occupation -- and never what somebody does, save the one batchYear case `TIDY_RULES` names.
"Business" stays Business and "Salaried" stays
Salaried: neither is wrong, and a better-sounding title is a guess about their job. The tidy is
the only part of this pass a member can SEE, on their own profile, so the bar is a change you
would defend to them.

### No tags is a real answer, and it is the point

There is no "Other" here. Someone whose text names no field gets `[]`, and the picker
prints that pile every run. A run of people landing there with the same kind of work in
them is the evidence for adding a tag — arriving without anybody having had to guess in
advance. **Never invent a tag to file somebody under**; the applier refuses one outside the
vocabulary, and inventing one is how the pile stops being a signal.

### Adding, splitting and removing a tag

The vocabulary is meant to change, and none of these needs a migration:

- **Add** — one entry in `PROFESSION_TAGS`, then a re-run picks up who it catches.
- **Split** Healthcare into Healthcare + Doctors — add Doctors with `parent: "healthcare"`,
  then `--tag healthcare` re-exports exactly those people to re-judge. The applier adds the
  parent back automatically, so Healthcare never empties and no saved
  `?profession=healthcare` link dies.
- **Remove or rename** — drop it from `PROFESSION_TAGS` and add it to `LEGACY_TAGS`, which
  maps a dead value onto zero or more live ones on read.

The list is capped at 18 entries by a test, so past that, adding one is an argument about
which one it replaces. That is deliberate: the caps are what stop the filter becoming a
wall of forty options.

### If you run out of room

Answer fewer and say so. The applier reports how many of the batch went unanswered; the
ones you skipped keep whatever they had and come back on the next run. Half the batch
properly is worth more than all of it carelessly.

## Step 3 — apply

```bash
node scripts/dev/tag-professions-apply.mjs             # dry: prints every change
node scripts/dev/tag-professions-apply.mjs --apply     # writes
```

**Always read the dry run.** One line per member: the pair it is judging, the tags it is
replacing, and the tags it would write.

What the applier guarantees (its decisions live in `src/lib/profession-pass.ts`, where
`profession-pass.test.mjs` holds them):

- **It refuses a tag outside the vocabulary**, an id outside the batch, the same person
  answered twice, and more than four judged tags — the whole batch, not just that row.
- **It adds parent tags for you.**
- **It leaves alone anybody whose text changed since the pick**, tags and all. The verdict
  was judged from the manifest's words; over newer ones it would be a judgement of text nobody
  read, and a tidy of the old words would erase what the member just typed. They come back on
  the next default run.
- **The write is one statement, guarded row by row on the words it read**, so all of it lands
  or none does, and an edit landing between the re-read and the write is not overwritten.
- **It flags a tidy the member's next save would rewrite** -- the save path runs
  `occupationCase`, and a tidy that fights it is undone the first time they touch the field.
- **Every write leaves an undo.** `scripts/dev/.professions/applied-<time>.json` holds the old values,
  words included; `--undo <file> --apply` puts them back and passes over anybody who has edited
  their text since. The next pick keeps these files: it clears the batch, not the folder.

## The traps

- **One database serves production and local dev.** An `--apply` here changes what members
  see. That is what the dry run is for, and it is not optional.
- **This one OVERWRITES, unlike `tag-photos-apply`.** That script protects what a
  contributor typed. Nobody types this column, so a bad tag has to be correctable and a tag
  has to be splittable. The undo log is the safety, not a fill-only rule.
- **It rewrites `workplace` and `jobTitle` only where a verdict says to, and members see it.**
  Those are the member's own words and the input to this pass. Until 2026-10-01 it never
  touched them; the owner asked for the tidy, and the guards in step 3 are what make it safe.
  If a tag is wrong, the fix is still the member editing their job title, and the next run
  re-reads it.
- **`scripts/dev/.professions/` holds real members' details keyed by user id.** Gitignored, and it must
  stay that way.
- **The manifest names its own database.** Both scripts refuse a batch picked from a
  different one, because the ids belong to one database and applying them to another is the
  mistake here with no undo.
- **The tag is invisible to the member** (owner's call, 2026-08-28). It is a backend index
  for the filter, never a label on anybody's profile.

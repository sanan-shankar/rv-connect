---
name: tag-professions
description: Work out what field each member is in, from their job title and workplace, and file them under the directory's profession tags. Use when asked to tag professions, run the profession pass, or fill in the Profession filter. Writes back through a dry-run-by-default script. It never touches what a member typed.
---

# Tagging what people do

Three steps, and the middle one is the only one that needs you.

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
    { "id": "clx…", "tags": ["studying", "healthcare"] },
    { "id": "cly…", "tags": ["law"] },
    { "id": "clz…", "tags": [] }
  ]
}
```

A bare array instead of `{ "people": [...] }` is accepted too.

### The two mistakes this pass actually makes

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
Delhi University names no field at all. That is `["studying"]` and nothing else. "Student"
at GNLU is a law school, at SRMC a medical college, at the Culinary Arts Academy a
hospitality school — those name a field, and there the second tag is real. The line is
whether the institution or the course *tells* you, not whether you can imagine a likely
answer.

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

What the applier guarantees:

- **It refuses a tag outside the vocabulary**, an id outside the batch, the same person
  answered twice, and more than four judged tags — the whole batch, not just that row.
- **It adds parent tags for you.**
- **It re-reads the rows** at apply time, so the source text it records is the text as it
  stands now.
- **Every write leaves an undo.** `scripts/dev/.professions/applied-<time>.json` holds the old values;
  `--undo <file> --apply` puts them back.

## The traps

- **One database serves production and local dev.** An `--apply` here changes what members
  see. That is what the dry run is for, and it is not optional.
- **This one OVERWRITES, unlike `tag-photos-apply`.** That script protects what a
  contributor typed. Nobody types this column, so a bad tag has to be correctable and a tag
  has to be splittable. The undo log is the safety, not a fill-only rule.
- **It never touches `workplace` or `jobTitle`.** Those are the member's own words and the
  input to this pass. If a tag is wrong, the fix is the member editing their job title, and
  the next run re-reads it.
- **`scripts/dev/.professions/` holds real members' details keyed by user id.** Gitignored, and it must
  stay that way.
- **The manifest names its own database.** Both scripts refuse a batch picked from a
  different one, because the ids belong to one database and applying them to another is the
  mistake here with no undo.
- **The tag is invisible to the member** (owner's call, 2026-08-28). It is a backend index
  for the filter, never a label on anybody's profile.

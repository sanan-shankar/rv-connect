# Hand-run passes

**Read this before building, changing or running any pass that asks a session to judge real
members' data.** It is the shape all of them share. A new pass conforms to it; it does not
invent a new one.

Two exist today:

| Pass | Judges | Writes | Skill |
|---|---|---|---|
| Photographs | what a Collection photograph is | `Photo.subject`, `Photo.era` | `/tag-photos` |
| Professions | what field a member works in | `User.professionTags` | `/tag-professions` |

## What a hand-run pass is

A column the site needs filled, that nothing on the site asks anybody for, filled by a Claude
Code session reading the real data and writing an answer back.

**It is never a paid API call.** The owner, 2026-08-28: *"I wasn't actually gonna do it
through API. I was gonna orchestrate it through my regular Claude Max subscription on a
session in VS Code."* Both passes were specified as API calls first and both were redirected.
If a design needs a model in the loop, the model is a session, and the deliverable is a script
pair plus a skill — not a service, not a key, not a queue.

That constraint is what produces the shape below: a session cannot be trusted to write to the
database directly, and it cannot be asked to run unattended. So the work splits into a part
that reads, a part that judges, and a part that writes, with a human-readable file between
each.

## The shape — three steps, and only the middle one needs a session

```bash
node scripts/dev/<name>-pick.mjs        # read-only: export what needs judging
#  ...the session reads it and writes verdicts.json...
node scripts/dev/<name>-apply.mjs       # dry run: prints every change, writes nothing
node scripts/dev/<name>-apply.mjs --apply
```

### The picker

- **Read-only.** It touches nothing but its own working folder.
- Writes `scripts/dev/.<name>/manifest.json`: the rows to judge, keyed by id.
- **Carries the vocabulary and the rules inside the manifest.** A session reading a batch
  picked last week should judge by the vocabulary that was current when it was picked, and a
  manifest that carries its own rules can be read by somebody who never opened the skill.
- **Stamps which database it came from.** One connection string serves production and local
  dev, a second serves the demo. Applying one database's ids to another is the mistake with
  no undo.
- **Prints the histogram and the un-answered pile** every run, whether or not there is a
  batch to take. See "the pile is the sensor", below.
- **Exports the least that answers the question.** No names where the judgement is about work;
  no long-form paragraphs where a one-line bio settles it. Every extra column is a real
  member's data on disk for a question nobody asked.
- Selectors: a default that takes only what is new or has changed since it was judged, and a
  way to re-take a subset deliberately. Never judged is not the same as judged and empty.

### The session

Reads the manifest, writes `scripts/dev/.<name>/verdicts.json`. That is all it does. It does
not run SQL, it does not edit rows, and it does not decide what the vocabulary is mid-batch.

### The applier

**Dry by default.** `--apply` writes. One line per row saying what it would change and what it
is leaving alone, and reading that output is not optional — one database serves production and
local dev, so an apply changes what members see.

It must guarantee, so the session does not have to:

- **Refuse a value outside the vocabulary** — the whole batch, not just that row. A closed
  vocabulary is only worth having if nothing outside it can be written, and quietly mapping an
  unrecognised value to a fallback is how the fallback stops being a signal.
- **Refuse an id outside the picked batch, and the same id answered twice.** Those are the two
  ways an answer lands on the wrong person.
- **Refuse a manifest from a different database.**
- **Re-read the rows at apply time.** Hours pass between the pick and the apply.
- **Leave an undo.** `scripts/dev/.<name>/applied-<time>.json` holds the prior value of every
  column touched; `--undo <file> --apply` puts them back.
- Enforce whatever else the vocabulary's own rules say, so they cannot be forgotten. The
  profession applier adds parent tags automatically for exactly this reason.

### The working folder

`scripts/dev/.<name>/`, gitignored by the single `scripts/dev/.*/` line, **never in the repo
root.** The owner keeps the root short, and an ignored working folder full of real members'
data is the clearest case of something that does not have to be there. Both passes were built
with a root entry first and both were moved; do not make it three.

It holds real members' data keyed by user id. Never commit it, never move anything out of it.

## The rules that hold across every pass

**Only fill what is empty — unless nobody types the column.** The photograph pass never
overwrites a bucket or a date a contributor chose. The profession pass *does* overwrite,
because nobody types `professionTags`: a bad tag has to be correctable and a vocabulary has to
be splittable. Which of the two a pass is, is a decision to make explicitly and write down, not
a default to inherit.

**Never write the thing you cannot check.** The photograph pass is forbidden from writing
captions: a bucket is checkable by looking, a name or an occasion is not, and a confident wrong
sentence in a real school's archive is worse than a blank. Ask of any column: could a reader
tell that this answer is wrong? If not, leave it to the person who was there.

**A guess dressed as a fact is worse than the blank.** Answer fewer and say so. Every applier
reports how many of a batch went unanswered, and what was skipped comes back next run.

**The unanswered pile is the sensor.** Rows that were judged and came back empty are the
evidence for the next vocabulary entry, arriving without anyone having had to guess in advance.
Two ways of doing this exist and the second is better: the photograph pass has an explicit
"Other" bucket, the profession pass has no fallback at all and prints the empty pile. Prefer no
fallback — there is no bucket to hide in, so the pile is the whole signal.

**The vocabulary lives in TypeScript, never in the database.** No Postgres enum, no CHECK
constraint. One database serves production and local dev, so a constraint turns every
vocabulary edit into a migration with an outage window. Both `src/lib/collection.ts` and
`src/lib/profession-tags.ts` keep a legacy map from dead values onto live ones, so **adding,
removing or splitting** a value needs no SQL and rows carrying an old one keep working. Renaming
a STORED value is the exception and does need a migration: a facet's option list is usually
counted in raw SQL, which never passes through the legacy map, so the old name goes on being
counted and labelled until the rows themselves are rewritten.

**Prefer tags to buckets, and never a boolean.** The owner, 2026-08-28: *"student boolean isn't
scalable... more like tags then."* Several values in one array column lets a status and a
category coexist without a second axis or a schema change. See
[[taxonomies-are-tags-not-enums]] in the reasoning behind `profession-tags.ts`.

**Cap the vocabulary three ways, because they do different jobs.** A per-value floor ("is this
a category or is it one person"), a cap on how many are offered at once ("is this list
readable"), and a test-held cap on how many may exist ("adding one has to be an argument about
which it replaces"). Getting the first wrong is quiet: `TAG_FLOOR` was five for one afternoon
and the directory's Profession filter had exactly one option, which reads as a broken control.

**A control that hides itself is treating a data problem as a presentation problem.** If a
facet has nothing to offer, the answer is the floor or the pass, not the component.

## Building a third one

Do not start from scratch and do not write a new procedure document. Copy the pair that is
closest — `tag-professions-*` if the judgement is about text, `tag-photos-*` if it is about
images — and change what the judgement is. Then:

1. A skill at `.claude/skills/<name>/SKILL.md`. It states the procedure and the two or three
   mistakes *that* pass actually makes; it does **not** restate this file, it links to it.
2. A `<NAME>_RULES` exported string beside the vocabulary, so the rules live where a test can
   hold them and the picker can copy them into the manifest.
3. Two rows in `scripts/README.md`, or `scripts-ledger.test.mjs` fails.
4. A row in the CLAUDE.md skills table, so a keyword reaches it.
5. `hand-run-passes.test.mjs` checks 1, 3 and the working-folder rule. Run `npm run check`.

## Running one

Say the skill name — `/tag-photos`, `/tag-professions` — or just describe it ("tag the
photographs", "run the profession pass", "fill in the professions"). The skill descriptions
carry those phrasings. Everything the session needs is in the skill and in the manifest the
picker writes; it should not need to be told the rules again, and if it does, the gap belongs
in the skill or in this file rather than in the next prompt.

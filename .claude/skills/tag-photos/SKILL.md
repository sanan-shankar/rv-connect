---
name: tag-photos
description: Fill in the Valley Collection's buckets and decades for photographs nobody filed. Use when asked to tag, classify or file Collection photographs, or to run the suggestion pass. Looks at the photographs on disk and writes answers back through a dry-run-by-default script. It never writes captions.
---

# Tagging the Collection

You are going to look at photographs from a real school's archive and say what
each one is. Three steps, and the middle one is the only one that needs you.

```bash
node scripts/dev/tag-photos-pick.mjs            # export a batch to .tagging/
#  ...you read them and write .tagging/verdicts.json...
node scripts/dev/tag-photos-apply.mjs           # dry run: shows every change
node scripts/dev/tag-photos-apply.mjs --apply   # writes
```

## Why this exists

70–80% of this archive arrives in bulk. The owner cannot ask the school
photographer to tag a hundred photographs one at a time, and the contribute
room requires nothing — no caption, no bucket, no date — because a contribution
refused for want of a tag is a contribution that does not happen. So the
taxonomy in `docs/planning/collection-rework/spec.md` §7 only works if
something fills it in afterwards. This is that something.

It was specified as a paid API call (§8.3). The owner redirected it on
2026-08-28: *"I wasn't actually gonna do it through API. I was gonna
orchestrate it through my regular Claude Max subscription on a session in VS
Code. It can access all the photos and that should be more than enough."*

## Step 1 — pick a batch

```bash
node scripts/dev/tag-photos-pick.mjs [--limit 60] [--all] [--env .env.demo]
```

Read-only against the database. It writes `.tagging/`:

- `.tagging/photos/001-<id>.jpg` … one 640px JPEG per photograph
- `.tagging/manifest.json` … the id, the file, who uploaded it, and **what the
  contributor already typed**

Default is every photograph with **no bucket**, newest first, sixty at a time.
`--all` widens it to anything still missing a date. Run it again
for the next sixty: it only ever exports what is still untagged, so repeating
it walks the archive rather than re-reading it. The count it prints is how many
are outstanding in total.

## Step 2 — look at them

Read `.tagging/manifest.json` first, then read the photographs. **Actually open
each image.** The whole point of doing this in a session rather than through an
API is that you can see them.

Read `said` on each manifest entry before you decide. A contributor who wrote
"Founders' Week, 1974" has told you something you cannot see, and it usually
settles the bucket and the decade both.

Write `.tagging/verdicts.json`:

```json
{
  "photos": [
    { "id": "clx…", "buckets": ["people", "school-life"], "era": "1970s" },
    { "id": "cly…", "buckets": ["birds"] }
  ]
}
```

`buckets` is required and is the only required field. `era` is offered only
where the photograph itself dates it. **There is no caption field** — see
below. A bare array instead of `{ "photos": [...] }` is accepted too.

### The six buckets, and how to choose between them

The vocabulary and the rules are in `src/lib/photo-suggest.ts` — read
`BUCKET_RULES` and `VALLEY_GLOSSARY` there rather than working from this
summary, because that file is what the tests hold and this one is not.

The short version: **People · Birds · Nature · Campus · School life · Other.**
Give as many as genuinely apply — the banyan with children under it is Campus
*and* People *and* School life, and filing it under one of the three makes it
unfindable under the other two. Anything outside the six is refused by the
applier, not quietly mapped to Other, so do not invent a seventh.

Use **Other** rather than forcing a fit. Other is read: a run of photographs
landing there with "sports day" in their captions is the evidence for a seventh
bucket arriving without anyone having had to guess in advance. That feedback
loop is the whole reason Other exists, and forcing photographs into a bucket
that nearly fits is how it gets defeated.

### Do not write captions

**This pass does not caption anything.** The owner, 2026-08-28: *"tagging tool
should not write captions."*

The reason is the shape of what you can and cannot see. A bucket and a decade
are checkable by looking: a bird is a bird, black-and-white film is a decade's
worth of evidence, and both are closed vocabularies where a wrong answer is
visible as a wrong answer. A caption is not. You cannot see a name, a house, a
year, an occasion or whose morning it was, so anything you write is a
description of pixels standing in a real school's archive in the place where
somebody's own sentence should be — and it is worse than a blank, because a
blank invites the person who was there to fill it and a caption does not.

If you put a `caption` on an entry anyway, the applier drops it, counts it and
says so in the dry run. It does not refuse the batch: your buckets and decades
still land.

### Decades

Only where the photograph itself dates it — the film stock, the clothes, black
and white, the buildings that are not there yet. A guess dressed as a fact is
worse than the blank, because the decade rail on `/collection` is what the
archive is browsed by. Leave `era` out when you are guessing, or say
`"unknown"`, which means the same thing.

### If you run out of room

Answer fewer and say so. The applier reports how many of the batch went
unanswered, and the ones you skipped stay untagged and come back on the next
pick. Sixty carelessly is worse than forty properly.

## Step 3 — apply

```bash
node scripts/dev/tag-photos-apply.mjs             # dry: prints every change
node scripts/dev/tag-photos-apply.mjs --apply     # writes
```

**Always read the dry run before applying.** It prints one line per row saying
exactly which columns it would set and what it is leaving alone.

What the applier guarantees, so you do not have to:

- **It only fills what is empty.** A bucket somebody chose, a date somebody
  gave — never touched. The rule and its tests are in
  `src/lib/photo-suggest.ts`.
- **It never writes a caption**, whatever the verdicts file says.
- **It re-reads the rows** at apply time, so a photograph filed in the hours
  since the batch was picked keeps what its contributor chose.
- **It refuses a seventh bucket**, an unknown decade, an id outside the batch,
  and the same photograph answered twice.
- **Every write leaves an undo.** `.tagging/applied-<time>.json` holds the old
  value of every column touched; `--undo <file> --apply` puts them back.

## The traps

- **One database serves production and local dev.** A `--apply` here changes
  what members see. That is what the dry run is for, and it is not optional.
- **`.tagging/` holds copies of real members' photographs.** It is gitignored
  and must stay that way. Never commit it, and never move anything out of it.
- **The manifest names its own database.** Both scripts refuse to apply a batch
  picked from a different one, because the ids belong to one database and
  applying them to another is the mistake here with no undo.
- **This does not touch the contribute room.** New uploads get no live
  suggestion — that needed the API call the owner declined. The answer is to
  run this again when photographs have accumulated.

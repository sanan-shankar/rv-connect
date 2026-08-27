# Phase 6 — what is actually IN the objects before anything is dropped

Read-only census, 2026-08-26, against the live database (`DIRECT_URL`, the one
serving production and local dev). Run before any DDL, at the owner's
instruction that an irreversible change gets checked until there is no chance of
a mistake.

**The headline: the audit reasoned from CODE, not from DATA, and seven of the
thirteen drop targets are not empty.** Nothing here contradicts "no code reads
it" — that still holds. What it contradicts is the unstated assumption that
nothing-reads-it means nothing-is-there.

## Provably safe — empty or all-NULL (6)

| Object | Contents |
|---|---|
| `Account` (table) | **0 rows** |
| `Session` (table) | **0 rows** |
| `VerificationToken` (table) | **0 rows** |
| `User.openTo` | 0 non-NULL of all users |
| `Photo.blurhash` | 0 non-NULL |
| `Photo.originalUrl` | 0 non-NULL — confirms data-layer-03's "every row holds NULL" |

The three auth tables are the NextAuth adapter's, and the adapter is inert
(dependency-diet-04 = data-layer-01). Empty and unreferenced. These are the only
six where dropping cannot lose anything.

## NOT empty — each needs an owner decision on its own terms (7)

| Object | Contents | What is actually lost |
|---|---|---|
| `GroupInvite` (table) | **2 rows** | Two real invitations, both `pending`, both sent by the owner on 2026-07-21 one minute apart, to two different members, in one group. The audit says "zero readers and zero writers"; true, but the table is not empty. They can never be accepted — no invite UI exists. |

(The two Catch-up tables an earlier draft listed here have been removed: they are
live, not orphans. See "The trap" below.)
| `Post.tag` | **5 posts**, all `campus-memory` | A retired classification on five real posts. Recoverable only from a backup. |
| `Group.visibility` | **13 groups: 9 `public`, 4 `private`** | data-layer-03 says it is "written with constants and read by nothing". Read by nothing is right; **written with constants is not** — four groups really are marked private. If Groups ever return, that distinction is real. |
| `Visit.timezone` | **194 of 614 rows** | The audit calls the Visit trio "write-only". It is written, to a third of all visits. |
| `Visit.lat` | **194 of 614 rows** | Members' actual coordinates. |
| `Visit.lng` | **194 of 614 rows** | Members' actual coordinates. |
| `User.avatarColor` | **1 user** | One member's chosen avatar colour. |

**The Visit trio deserves its own sentence.** These are members' locations,
collected on a third of all visits and read by nothing. That is a stronger
argument for dropping them than the audit made — a field you collect and never
use is one that data minimisation says you should stop collecting — but it is
also the one drop that destroys personal data rather than a placeholder, so it
is the owner's, with that framing in front of him.

## The trap that would have destroyed the Catch-ups

**An earlier version of this file said `CatchupSeries` and `CatchupReminderPref`
were orphans with rows in them, and it was WRONG in the direction that ends a
feature.** It is corrected here rather than quietly edited, because the way it
went wrong is the most useful thing on this page.

I found the two by diffing every physical table against every `model` name in
`prisma/schema.prisma` and taking what had no match. That method is broken here,
and `schema.prisma:807-825` says why in a comment written a month before I ran it:

- the model named **`Catchup`** is `@@map`ped to the physical table
  **`CatchupSeries`** — 3 rows, every Catch-up in the app;
- the model named **`CatchupPref`** is `@@map`ped to **`CatchupReminderPref`** —
  14 rows, live reminder settings.

The mapping exists precisely because the reverted 2026-06 build left dead tables
called `Catchup` and `CatchupPref` **with those exact names** and incompatible
columns, so the live models were pointed at fresh names to avoid reading the
wrong table. The result is a name space where the obvious inference is inverted
twice over: a table called `CatchupSeries` looks orphaned and is load-bearing,
while a table called `Catchup` looks live and was dead.

**Acting on my own census would have dropped every Catch-up and every reminder
preference in the app, and left the actual dead tables untouched.**

**Rule, for any future session: never decide a table is dead by name. Resolve
`@@map` first** (`grep -n "@@map" prisma/schema.prisma`), then diff physical
names against *mapped* names, and confirm with `reltuples` and a reference grep.

## And the row it was meant to close is already closed

The six legacy tables from the reverted build — `Catchup`, `CatchupPref`,
`CatchupAnswer`, `CatchupAnswerLove`, `CatchupIssue`, `CatchupQuestion` — were
checked individually with `to_regclass`. **All six return NULL: they no longer
exist.** Someone dropped them already. Phase 6's "Verify/DROP the six orphan
reverted-Catchup tables" row needs no action, and its verb order — *verify*, then
drop — is the reason this ended as a correction rather than an outage.

Exactly six Catch-up tables remain and all six are live: `CatchupSeries`,
`CatchupEdition`, `CatchupPrompt`, `CatchupEntry` (133 rows), `CatchupEntryLove`
(507 rows), `CatchupReminderPref`. **None of them is a drop target.**

## One thing the plan got right and cheaply

**`Account`/`Session`/`VerificationToken` are genuinely empty**, so
dependency-diet-04's ordering (remove the adapter in code first, then drop)
carries no data risk at all — it is the cleanest row in the phase.

## Both remaining gaps, closed 2026-08-27

**The demo database is empty of every drop target.** Censused with the same query
(`run-sql.mjs --env .env.demo`): `Account` 0, `Session` 0, `VerificationToken` 0,
`GroupInvite` 0, tagged posts 0, geolocated visits 0, `avatarColor` 0, `openTo` 0,
`blurhash`/`originalUrl` 0. It holds one Group row, the demo Catch-up's roster
container, whose `visibility` is a default nobody reads. So the demo takes the
same migration with nothing at stake — which is the opposite of the production
picture above and worth saying out loud, because it means a clean demo run proves
nothing about the production run.

**The indexes were checked against `pg_stat_user_indexes`**, over a 96-day
statistics window, and the numbers changed a decision.
`SearchLog_query_idx` had **1 scan** and was dropped. `Comment_postId_isHidden_idx`
had **13**, and data-layer-07 itself rates it marginal and says to skip it in
doubt — so it is KEPT. `Group_visibility_createdAt_idx` (147) and
`GroupInvite_inviteeId_status_idx` (385) go regardless, because the column and the
table they belong to are going; on tables this small those counts are Postgres
picking a tiny index over a tiny sequential scan, not evidence of a query anyone
wrote. **Consult that view before believing any "no query can use this" claim: the
audit never ran it.**

## The order this has to happen in

For every object, code before schema before DDL, and never the reverse:

1. Remove the readers and writers in code, ship, confirm `npm run verify:crawl`
   is clean and the demo guard tests pass.
2. Edit `prisma/schema.prisma`, `npx prisma generate`, `npm run check`.
3. Only then a dated idempotent file in `prisma/migrations-manual/`, applied with
   `run-sql.mjs` to **both** databases, `IF EXISTS` on every statement.

Prisma never touches a table with no model, so step 1 can ship days before step 3
and nothing breaks in between. That gap is the safety margin, and it is free.

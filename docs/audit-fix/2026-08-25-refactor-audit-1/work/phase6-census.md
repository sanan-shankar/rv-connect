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

## Two corrections to the plan itself

1. **"The six orphan reverted-Catch-up tables" are TWO, not six.** Diffing every
   live table against every `model` in `prisma/schema.prisma`, exactly two tables
   have no model: `CatchupReminderPref` and `CatchupSeries`. Both have rows —
   **14** and **3**.
2. **`Account`/`Session`/`VerificationToken` are genuinely empty**, so
   dependency-diet-04's ordering (remove the adapter in code first, then drop)
   carries no data risk at all — it is the cleanest row in the phase.

## Still to census before any DDL

- **The demo database has not been looked at.** It is a separate Supabase project
  and takes the same migration (`run-sql.mjs --env .env.demo`). Every count above
  must be repeated there; the whole reason that flag exists is that a second
  database with no migration path is a second database that will be wrong.
- The 2–3 indexes proposed for dropping (`Group_visibility_createdAt_idx` and the
  GroupInvite indexes) have not been checked for use via `pg_stat_user_indexes`.
- No code has been changed yet. Nothing has been dropped.

## The order this has to happen in

For every object, code before schema before DDL, and never the reverse:

1. Remove the readers and writers in code, ship, confirm `npm run verify:crawl`
   is clean and the demo guard tests pass.
2. Edit `prisma/schema.prisma`, `npx prisma generate`, `npm run check`.
3. Only then a dated idempotent file in `prisma/migrations-manual/`, applied with
   `run-sql.mjs` to **both** databases, `IF EXISTS` on every statement.

Prisma never touches a table with no model, so step 1 can ship days before step 3
and nothing breaks in between. That gap is the safety margin, and it is free.

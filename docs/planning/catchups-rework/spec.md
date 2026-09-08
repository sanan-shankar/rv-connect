# The Catch-ups rework — the spec

**S5, 2026-09-08.** What gets built, in what order, and who decided each part of it.

## How to read this, and how much room you have

The shape is already settled and drawn. **[`architecture.md`](architecture.md) is the design**:
the nouns, the surfaces, every control, and the owner's own sentence beside each decision. It is
live at `/lab/catchups/sketches` and he has signed off on it. This file does not restate it and
does not redraw it. It says what the *code and the database* have to become for that drawing to
be the shipped app, in slices that can each be reverted.

So, in order:

1. **[`brief.md`](brief.md), in full**, if you are exercising judgment rather than transcribing
   one. 52 numbered paragraphs, about fifteen minutes. §14 below maps every one of them to the
   section that answers it. His rule (¶22) is that his words travel verbatim.
2. **[`architecture.md`](architecture.md), in full.** It carries his sentences inline, so it is
   the shape and the reasoning in one place.
3. **This file**, then your phase's section.
4. **[`handover.md`](handover.md)**'s board, findings F1 to F46 and its ledger. Everything else
   in this folder is reference: grep it, do not read it. See "How much of this you actually have
   to read" at the top of the handover.

**Every decision here carries one of three marks.**

| Mark | Means | What you do |
|---|---|---|
| **LOCKED** | The owner decided it, in words, with reasons. | Build it. Do not relitigate. If it is impossible, say so rather than quietly doing something else. |
| **RECOMMENDED** | This session's judgment, with the reasoning attached. | You may do better. If you do, say what you did instead and why. |
| **OPEN** | Nobody has decided. | Yours, or his — each one says which. |

**What is NOT yours.** The drawing. `/lab/catchups/sketches` is the approved version and it is
transplanted faithfully, the way the Collection's picked room was; re-deriving a design he has
already approved has cost this project a whole session before ("ship the approved version").
Diff the shipped page against the room before you call a phase done. If a drawn decision looks
wrong to you, say so in a sentence and let him decide.

**What IS yours.** Everything below marked RECOMMENDED, all of the mechanism, and the three
surfaces nobody has drawn yet (§11). And the bar, which is his and is not an adjective:

> ¶19: *"if catch-ups was my entire app, the amount of attention to detail that I would have
> would not ship anything like that ... How do I make it a complete experience that is so
> beautiful and so intuitive?"*

---

## 1. What is already decided, and where it is written

Nothing in this list is re-argued here. It is an index so a phase can find its own authority.

| | Decided | Where |
|---|---|---|
| The one representation of a published Edition | its photographs, one component | `architecture.md` §1 |
| Every Catch-up has a picture | from the day it is made, never optional | `architecture.md` §1b |
| Six nouns, one home each | no noun gets a second home | `architecture.md` §2 |
| A card is a door | the whole rectangle, and it always opens the home | `architecture.md` §3 |
| The list | a shelf of picture cards, no rail, no Fresh off the press | `architecture.md` §4 |
| The home | a place, not a page that transforms; four regions | `architecture.md` §5 |
| Every control, who holds it | the accident rule; a batch has no manual transitions | `architecture.md` §6 |
| Getting anywhere in one move | the name of the thing you are inside is the way up | `architecture.md` §7 |
| Intent against state | the table that collapses to eight real cells | `architecture.md` §8 |
| The reader | the strip, navigator A, the cinnamon measure | `front-runner.md` "What was built" |
| Which navigator | **A** | his answer, N46 |
| Deleting becomes leaving | one word, and past answers stay | his answer, N18 |
| Anyone in a batch may replace its picture | it is reversible, unlike a transition | his answer, N47 |
| The six with no batch year | nothing changes for them | his answer, N47 |
| Ten is the floor for a batch Catch-up | and under it, Catch-ups is not on your sidebar | his answer, 2026-09-08, §3.5b |
| The two clamps in the reader | the list's rows 3 lines, the strip's docked question 2 | his answer, 2026-09-08, §4.3 |

**Two things he still owes**, and neither blocks a phase: the **twenty photographs** (owner
question 17, "I'll give the pictures when I get time") and the **settings surface**, which he has
claimed for a session of his own (N100).

---

## 2. The noun: Round becomes Edition, in one pass

**LOCKED that it happens.** His, 2026-09-07: *"let's not use Round or Issue let's call them
additions"*, then a minute later, *"Editions not additions."* Every user-facing string in the
drawing already says Edition. The code does not, and it disagrees with itself: the database has
said `CatchupEdition` since the day it was written, while the reader's URL says `round` and 288
identifiers in the Catch-ups tree say Round.

**RECOMMENDED that it is one pass, first, before anything else.** It is mechanical, it touches
every file a later phase will touch, and doing it after those phases means every one of them is
written twice. It is also the only phase in this spec with no behaviour change in it at all,
which makes it the cheapest thing to revert if something surprises you.

**What changes.**

| Layer | Today | After |
|---|---|---|
| Prisma models | `CatchupEdition`, `editionId` | unchanged — the database was always right |
| Route | `/catchups/round/[editionId]` | `/catchups/edition/[editionId]` |
| Components | `src/components/catchups/round/*` | `src/components/catchups/edition/*` |
| Types | `RoundEntry`, `RoundState`, `ShelfRound`, `SketchRound` | `EditionEntry`, `EditionState`, … |
| Helpers | `roundLabel(n)`, `catchups-round-view.ts` | `roundLabel` **deleted** (§3.3); `catchups-edition-view.ts` |
| Copy | "Round 4", "Published issues", "Read the round" | "Edition", and no number anywhere (§3.3) |

**Two things a rename can break here, and both are real.**

- **Stored notification links.** `Notification.link` is a column, and
  `catchups-notify.ts` writes `/catchups/round/<editionId>` on publish and on a heart, and
  `/catchups/<catchupId>/answer` on a reminder. Rows already in members' bells point at the old
  paths. **RECOMMENDED**: a dated migration rewrites them
  (`UPDATE "Notification" SET link = replace(link, '/catchups/round/', '/catchups/edition/')`),
  **and** the old route survives permanently as a redirect. Both, not either: the migration fixes
  the bell, the redirect fixes anything already shared, bookmarked or sitting in an email.
- **The `/answer` route is deleted in phase 7**, because answering moves onto the home. Its
  reminder links get the same treatment: rewritten to `/catchups/<catchupId>`, with a redirect
  left behind.

**Not renamed:** the physical table names. `@@map("CatchupSeries")` and
`@@map("CatchupReminderPref")` exist to dodge the dead tables the 2026-07 reverted build left in
this database, and the header comment in `prisma/schema.prisma` says why. Leave both alone.

---

## 3. The data, and the seventy people standing on it

Seventy members are on this today, twenty-three of them inside a paused Catch-up with a live
Edition in it. ¶44: *"there's 70 freaking beta testers and catch-ups doesn't work properly."*
Every schema change below is a **dated idempotent file in `prisma/migrations-manual/`**, applied
with `node scripts/dev/run-sql.mjs`. **Never `prisma db push`** — one Supabase project serves
production and local dev and `db push` will offer to drop tables it thinks are orphaned
(`docs/spec/catchups.md:462`).

**Production and the demo are separate Supabase projects.** Every file is applied twice:

```
node scripts/dev/run-sql.mjs prisma/migrations-manual/<file>.sql
node scripts/dev/run-sql.mjs --env .env.demo prisma/migrations-manual/<file>.sql
```

A second database with no way to migrate it is a second database that will be wrong; that is
written on `run-sql.mjs` itself and it cost a silent outage once already.

**Ordering, and the one rule that is not negotiable.** A column drop before the code that stopped
reading it has deployed breaks the running production build, because there is one database behind
both. So every phase that retires a column does it in **two files**: the additive one, applied
before the commit; the drop, applied **after that commit has been pushed and Vercel has finished
deploying**, in the cleanup phase (§13, phase 11). Index drops have no such ordering (Prisma
never names an index in a query); column drops do.

### 3.1 LOCKED — the export runs first, every time

¶45: *"If you have to make huge changes to everything and there's a risk of it being deleted, put
it all in whatever file type you want, so that it can be rebuilt later."* ¶51: *"as long as
they're totally regeneratable."*

`node scripts/dev/export-catchups.mjs --write` writes
`scripts/dev/.exports/catchups/<date>/`: one JSON file plus every photograph and avatar byte.
**Re-run it immediately before every migration in every phase**, not once at the start.

Re-run for this spec, 2026-09-07 (UTC): **6 Catch-ups, 7 Editions, 24 questions, 143 answers, 32
of them with photographs, 36 photograph files, 521 hearts, 39 memberships, 16 preferences, 5.8 MB
total.** That folder is gitignored, holds members' private words, and must never be committed or
moved to the repo root.

And his override, which the export does not soften (¶45): *"don't let the existing catch-ups be
any reason for you to lower the scale of your reworking."* The content is protected. The shipped
UI is not.

### 3.2 The live rows, as they stand today

Read 2026-09-07, read-only. This is what any migration is actually running against.

| Catch-up | group | status | members | Editions |
|---|---|---|---|---|
| in the loop | people | **paused** | 23 | 1 published (11 questions, 133 answers), **2 collecting** |
| test | people | ended | 1 | 1 published, empty |
| Batch of 2024 | people (a hand-made snapshot, `batchYear` null) | active | 11 | 1 published (8 questions, 8 answers) |
| [Recon] the happy path | people | active | 2 | 1 published |
| Test | people | active | 1 | 1 published |
| testest | people | active | 1 | 1 collecting |

Also: **70 users, 64 with a batch year, 11 batch groups holding 65 memberships, and not one batch
group has a Catch-up** (F17 — the batch Catch-up never existed; nothing regressed). The largest
batch is 2023 with 39 members; eight of the eleven have four members or fewer.

**No Edition is in `preparing` right now.** The handover said one was; it published on its own
between then and now, which is exactly what `preparing` does. §3.3 still has to handle the state,
because the daily tick can put an Edition into it at any moment before the build lands.

**Three throwaways to remove in the cleanup phase**: `[Recon] the happy path`, `Test`, `testest`.
They hold the owner's and Jerry's rows only, by design (F14). `test` (ended, one member) is his
own and stays unless he says otherwise.

### 3.3 LOCKED — `preparing` is deleted, and so is every Edition number

> N88 / architecture §6: *"Why are we preparing? ... why doesn't it just publish immediately? Is
> there a reason we have to have a separate preparing section? I can't just publish at midnight
> and the deadline is done."*

`preparing` is a hard-coded 24-hour hold (`PREPARING_HOLD_HOURS`) between answers closing and the
Edition coming out, during which nobody — Keeper included — can read a word. Its only real job is
stopping an Edition landing at 3am, and "Publish now" exists solely to skip it.

**What goes:** the `preparing` member of `EditionStatus`; `preparingPatch`; `PREPARING_HOLD_HOURS`;
the `publishAt` column; the "Publish now" control and `publishNowButton`; the `almost-ready` and
`not-yet-published` screens; the branch in `computeStatus` and in `planNextAction`.
`closeAndPrepare` becomes `closeAndPublish`.

**What replaces the 3am job — RECOMMENDED, and the number comes from the app, not from taste.**
Deadlines snap to a **civil hour: 07:00 IST (01:30 UTC)**, applied to both `questionsCloseAt` and
`answersCloseAt` wherever they are set (`answeringPatch`, `extendPhasePatch`, the create path).
Today they are `addDays(now, N)`, so a deadline inherits whatever minute the phase happened to
open at.

07:00 rather than any other civil hour because of one fact already in the repo: `vercel.json`
runs `/api/catchups/tick` at **02:00 UTC, which is 07:30 IST**. A deadline at 07:00 IST is always
picked up by that morning's cron, within thirty minutes, rather than waiting on the lazy tick and
whoever happens to open a page. So an Edition lands with the morning, every time, and the 24-hour
hold buys nothing.

**The migration, and where a mid-flight Edition lands.** Idempotent, and it must cope with rows
that appear between now and the day it runs:

```sql
-- Any Edition caught mid-hold comes out, dated when it was always going to come out.
UPDATE "CatchupEdition"
   SET status = 'published',
       "publishedAt" = COALESCE("publishedAt", "publishAt", "answersCloseAt", now())
 WHERE status = 'preparing';
```

**The notification is the part that is easy to miss.** `notifyPublished` fires from the publish
action, not from the database, so a row published by SQL sends nobody anything. **RECOMMENDED**:
run the count first (`SELECT count(*) FROM "CatchupEdition" WHERE status='preparing'`), and if it
is zero — as it is today — the migration is a no-op and there is nothing to notify. If it is not
zero, publish those Editions **through the action** (`publishNow`) before applying the migration,
and let the migration remain as the idempotent backstop. Never leave an Edition published in
silence: for its members it simply never happened.

**Every Edition number goes with it.** N92: *"let's ditch the round 1 ... The round number is
irrelevant."* And ¶39 / architecture §5: an Edition is identified by its **date**, in full with
the year on a back number (`shortDate`), and by day-and-date on a live deadline (`dayAndDate`).
`roundLabel()` is deleted rather than left as a helper that contradicts the rule. The
`CatchupEdition.number` **column stays** — it is the `@@unique([catchupId, number])` that makes
"one Edition at a time" enforceable — it is simply never printed.

**And `no Edition yet` is deleted too**, for his reason (N88): a Catch-up is collecting from the
moment it is made, and a batch Catch-up opens straight into collecting when its turn comes. There
is no reachable state where a member lands on a home with no Edition on it.

### 3.4 LOCKED — the Catch-up's picture

`architecture.md` §1b, and it is his (N19 to N25): *"Catch-ups is the only one that has like
nothing, no images, no media. It's just all text and organization and very functional and very
corporate."* Every Catch-up has one from the day it is made. Never optional — N23: *"then we'd
have to have 2 different architectures."*

**RECOMMENDED — two columns, not a table.**

```prisma
model Catchup {
  // ...
  /// Where the picture is: a path into the shipped pool ("/images/catchups/07.webp")
  /// or an R2 url someone uploaded. One column, because the two are the same
  /// thing to every reader of it.
  pictureSrc   String
  /// The `object-position` its wide crop is taken at. What makes these
  /// photographs read as a PLACE -- a horizon, the stone benches, the ground
  /// under the banyan -- is in the lower quarter of all of them, so a centred
  /// crop returns green texture. See PICTURES in the pool module.
  pictureFocus String @default("center 85%")
}
```

Added `NOT NULL` with a backfill in the same file, so there is never a row without one and never
a no-picture layout to draw:

```sql
ALTER TABLE "CatchupSeries" ADD COLUMN IF NOT EXISTS "pictureSrc" text;
ALTER TABLE "CatchupSeries" ADD COLUMN IF NOT EXISTS "pictureFocus" text NOT NULL DEFAULT 'center 85%';
-- Deterministic, so a re-run assigns the same picture to the same Catch-up.
UPDATE "CatchupSeries" SET "pictureSrc" = <pool>[ (hashtext(id) & 2147483647) % <poolsize> + 1 ]
 WHERE "pictureSrc" IS NULL;
ALTER TABLE "CatchupSeries" ALTER COLUMN "pictureSrc" SET NOT NULL;
```

**The pool moves out of the lab.** `PICTURES` currently lives in
`src/app/lab/catchups/sketches/_shelf.ts` with six stand-ins, two of which were dropped for being
a duplicate and a portrait (F46). It becomes `src/lib/catchup-pictures.ts`, one exported array of
`{ src, focus }`, imported by the pool picker, the settings row and the seed. **Adding his twenty
is then one file edit and no migration**, provided the filenames are stable.

**Who may change it.** Whoever may run the Catch-up; and on a batch Catch-up, **anyone in the
batch** — his answer to owner question 18, and safe because it is reversible, unlike an Edition's
transitions. The control is the **Picture** row in the settings list, and it opens the surface
described in §11.2.

**What he owes, and what to do until he does.** Owner question 17. Twenty photographs of the
school, 2,400px or more on the long edge, landscape, the subject off dead centre, nothing with a
recognisable face in it, and **details rather than valley views** — the landing page and half the
Collection are already wide valley views, so twenty more would read as the same photograph twenty
times. Until then the six stand-ins ship. They are 900 to 1,280px on the long edge, which is
upscaled at retina on a 1,076px banner; that is a known and stated compromise, not an oversight.

### 3.5 LOCKED — a batch Catch-up exists by default

¶4 and ¶51: *"anyone in that batch is automatically added to that catch-up, can see the history of
rounds ... can participate in any future rounds ... This batch catch-up should exist by default"*,
and *"the batch catch up can't edit people in and out it's just people in that batch and they're
all automatically added and have access to previous issues if they join later."*

The container already exists and nothing about it has to change (F6): a batch is a `Group` with
`batchYear` set, and a Catch-up is one row per `Group`. So "a batch Catch-up by default" is one
`Catchup` row per batch group, and **three places have to create it**:

1. **A backfill migration** for the batch groups that already meet the floor in §3.5b, which
   today is two of the eleven: Batch of 2023 and Batch of 2024.
2. **At signup**, in `joinBatchGroup` (`src/components/auth/actions.ts`), which already
   find-or-creates the batch group in a race-safe way. The Catch-up is created in the same
   best-effort block.
3. **A self-heal in the daily tick.** RECOMMENDED, and it closes a hole the code already predicted
   in its own comment: `joinBatchGroup`'s failure is swallowed and reported, and *"nothing
   re-checks 'an alumnus with a batchYear and no batch-group row'"*. **That failure has already
   happened.** Rukmini Rau carries `batchYear: 2024` and is not in the Batch of 2024 group. So the
   tick does two idempotent passes: every alumnus with a batch year is in their batch group, and
   every batch group **at or over the floor** has a Catch-up. Both are upserts; neither can do
   anything twice, and the second is also what creates a Catch-up the day a batch reaches ten.

**Its shape**, from `architecture.md` §6: `createdById` null (nobody keeps it), no member editing,
no leaving, archive only, **and no manual transitions at all** — it runs on its rhythm and the
only things anyone does on one are ask and answer. That is his own correction (N30) and it is what
makes "nobody owns it" survivable. Anyone in the batch may replace the picture.

**The 100-person cap does not apply to it.** `MAX_CATCHUP_PEOPLE` is the reach limit on a roster
you assemble; a batch's membership is the batch. F40's arithmetic (a hundred people in a sticky
300px column) is already dead: the roster is behind one icon, in a dialog on a laptop and a sheet
on a phone.

**RECOMMENDED — the hand-made "Batch of 2024" is adopted, not duplicated.** F17 found it: a 2024
alumnus made it through `/catchups/new` on 2026-08-23, which always mints a NEW group, so it sits
on a snapshot group with `batchYear: null` while the real Batch of 2024 group has no Catch-up.
Measured today: the snapshot holds 11 members, the real group holds 11, ten are in both. The one
who is only in the snapshot is Rukmini Rau — a real 2024 alumna missing from her own batch group
(above), with no answers and no questions. The one who is only in the real group joined on
2026-08-28, after the snapshot was taken.

So, **in this order**, in one migration file:

1. Heal the batch memberships. Rukmini joins Batch of 2024, and the snapshot becomes a strict
   subset of the real group.
2. **Assert** that subset relation. If it does not hold, the file stops and does nothing.
3. Re-point `Catchup.groupId` at the real batch group.

That keeps its published Edition, its 8 answers and its 8 questions exactly where they are, loses
nobody, and hands the two missing 2024 alumni the earlier Edition — which is ¶4's *"access to
previous issues if they join later"*, arriving for the first person it was ever true of. The
orphaned snapshot group is deleted in the cleanup phase, after the re-point is confirmed.

### 3.5b LOCKED — ten is the floor, and under it Catch-ups is not on your sidebar

**His, 2026-09-08**, answering owner question 19 and going further than the question asked:

> *"for people whose batches have less than ten people, let's not even show the catch ups things in
> the sidebar. it won't be reachble to them. once there's ten it appears and the catch up would be
> created for that batch."*

So **ten**, and it governs two separate things:

1. **A batch Catch-up is created when its batch reaches ten members**, not when the group is made.
   The backfill therefore creates **two** Catch-ups today, not eleven: Batch of 2023 (39) and Batch
   of 2024 (11). The tick's self-heal creates one the day a batch crosses ten, which is also the
   day it starts collecting.
2. **The Catch-ups item is not in the sidebar** for a member with nothing behind it.

**Why the arithmetic is so lopsided, so nobody re-derives it.** Nine of the eleven batches have
four members or fewer and six have exactly one, so under any smaller floor most batch Catch-ups
would be a newsletter to yourself, with reminders. Ten is his number and it is a comfortable one:
it is the size at which a Round has enough voices to read like a Round.

**RECOMMENDED — the sidebar test is "have you got a Catch-up", not "is your batch big".** His
reason for hiding it is *"it won't be reachble to them"* — hide the door when there is nothing
behind it. But a member of a small batch can still be **invited to a people Catch-up**, and then
there is something behind the door. Two live cases prove it is not hypothetical: Jerry Maguire has
no batch year at all and is a member of two Catch-ups, and **the public demo's visitor is a member
of `demo-catchup`** — a strict batch-size test would delete Catch-ups from the demo sidebar, which
hides a whole feature from everyone he shows the app to.

So the predicate is: **you see Catch-ups if you can open at least one Catch-up.** A member of a
ten-plus batch always can, which is his rule exactly; a member of a small batch can once somebody
invites them. Nothing else changes. If he meant the stricter reading, it is one clause.

**Hiding a door is not access control.** `/catchups` still renders for anyone signed in, and shows
the empty state; the invite link `/catchups/join/[token]` still works and makes the sidebar item
appear the moment it is accepted. A nav item that is hidden must never be the thing enforcing who
may read what — that is what the membership check is for, and it is unchanged.

**What a member under the floor sees:** nothing. No sidebar item, no batch Catch-up, no
notifications, no reminders. Twenty of the seventy members are in that position today (fourteen in
a small batch, six with no batch year), and exactly one of them — Jerry, the test account — is
kept in by the people-Catch-up clause.

### 3.6 LOCKED — leaving replaces deleting

His, N18: *"defaults, except deleting becomes leaving."* So the verb on a people Catch-up is
**Leave**, what you already published **stays** (other people have read it and replied to it), and
the thirty-day bin goes with the word.

| Goes | Stays |
|---|---|
| `CatchupPref.deletedAt` | `CatchupPref.archivedAt` |
| `setCatchupDeleted` | `setCatchupArchived` |
| the "Recently deleted" shelf, `index/filed-away.tsx` | one quiet "Archived" row at the foot of the list, present only when one exists |
| the 30-day retention sweep over `deletedAt` | `leaveCatchup`, now the only exit, and only on a people Catch-up |
| `@@index([deletedAt])` | |

Migration: `UPDATE "CatchupReminderPref" SET "archivedAt" = COALESCE("archivedAt", "deletedAt")
WHERE "deletedAt" IS NOT NULL;` then the drop, in the cleanup file. **Zero rows are affected
today** — nobody has archived or binned a copy — so this is a no-op that exists so it cannot
become one later. Archive is the conservative landing: it never removes a membership behind
somebody's back.

**Archiving is a member's own copy**, unchanged, and it is his WhatsApp model (¶5): *"when you
archive, you don't see it in your main feed ... But I don't want to fucking see archived things.
And then there's a Put back button, which is right there."* One row at the foot, revealed the way
the sidebar's own profile menu reveals, and **Put back only after you have opened it**.

### 3.7 LOCKED that they exist, RECOMMENDED how — comments on answers

D7, from ¶10, ¶17, ¶19 and ¶27. He also said how (N1):

> *"I feel like the comment section can be done the same way that we do it in feed. I don't know
> why we're trying to do it in a different way. Showing just the bird doesn't make sense. Because
> people want to know who commented ... I think we can just copy that comment section ... If you
> can find a sleeker way of doing it, sure."*

**RECOMMENDED — one `Comment` table, widened; not a second one.** `Comment.postId` becomes
nullable, a nullable `entryId` is added, and a CHECK enforces exactly one:

```sql
ALTER TABLE "Comment" ADD COLUMN IF NOT EXISTS "entryId" text;
ALTER TABLE "Comment" ALTER COLUMN "postId" DROP NOT NULL;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_one_target"
  CHECK (("postId" IS NULL) <> ("entryId" IS NULL)) NOT VALID;
ALTER TABLE "Comment" VALIDATE CONSTRAINT "Comment_one_target";
CREATE INDEX IF NOT EXISTS "Comment_entryId_createdAt_idx" ON "Comment" ("entryId", "createdAt");
```

Why widened rather than a `CatchupEntryComment` twin: `CommentLike`, the soft-delete-with-replies
rule, the admin hide, the purge behaviour (`authorId` SetNull so a purged account cannot take
other members' replies down) and the 700-line reading surface all already exist and are all
already argued for in the schema's own comments. A twin needs a twin of every one of them, which
is precisely the "second implementation" that cost the Collection campaign a room. Seventeen query
sites touch `prisma.comment`; every one already passes `postId`, so relaxing the column is safe as
long as a `write-path-reviewer` pass checks each.

**The reading surface**: `src/components/posts/comments-section.tsx` takes its five server actions
(`loadComments`, `createComment`, `deleteComment`, `toggleCommentLike`, `adminRemoveComment`) as
props instead of importing them from `@/app/(main)/feed/actions`. That is the smallest change that
makes it serve two owners, and letters already reuse the file unchanged, which proves the seam.
N1's *"sleeker"* is an invitation, not an instruction: it is the same component with the feed's
own vertical padding reduced 10% top and bottom, which he asked for separately (N93) **and asked
to be checked before it touches the feed**.

**N4**: *"the comment section has to animate opening and closing correctly."* `useAutoAnimate` is
already in the file; the open/close is the caller's, and it uses the app's own springs.

**Notifications**: one new type, `catchup_comment`, linking to
`/catchups/edition/<editionId>#<entryId>`, coalesced the way `catchup_love` already is — at most
one unread per author per Edition, so a busy Edition cannot spam a bell.

**Reporting**: unchanged and out of scope. `Report.targetType` is `post | user`; a feed comment is
not reportable today either, so a Catch-up comment is not a regression.

### 3.8 LOCKED that it works, RECOMMENDED where it lives — link previews

¶50, and it is the sharpest functional ask in the brief:

> *"The song thing shouldn't just work if the question has exactly taken from the set of questions
> that we have ... the thumbnail thing should work. Whenever they paste a link to a song, right?
> So Letterloop did it the first way, but we are trying to improve on Letterloop. Letterloop's
> things are too fixed."*

It has never once worked (F29, F30): `songArt` is null on every row in the database, the songs
question has thirteen answers and `songUrl` null on all of them because four people pasted links
into the body instead, and the CSP was blocking Spotify's rotating cover shards anyway (fixed).

**RECOMMENDED — a `LinkPreview` table keyed by url**, the same trick the Collection's `Image`
table uses and for the same reason: no migration of existing rows, no writes to `CatchupEntry`,
and a row missing is not an error.

```prisma
model LinkPreview {
  url       String   @id           // the url as pasted, normalised
  kind      String                 // "spotify" | "youtube"
  title     String?
  subtitle  String?                // artist or channel, when the endpoint gives one
  thumbUrl  String?
  failedAt  DateTime?              // fail-soft: retried at most once a day
  fetchedAt DateTime @default(now())
}
```

**The hosts**: Spotify (keyless oembed; it returns no artist field, and "Spotify" is not one —
F33) and YouTube (the still is derivable from the video id, no key). Anything else stays a plain
link. **The fail-soft rule**: a link that will not resolve is printed as an ordinary link and
never as an error, and the body text it came from is **not** stripped unless a card actually
replaced it — that inversion is F38 and F39, where an answer whose whole body was a Bandcamp link
came out empty and was dropped from the page.

`CatchupEntry.songUrl / songTitle / songArt` are retired in the cleanup phase. Nothing reads them
and they are null everywhere.

### 3.9 RECOMMENDED — the read mark

Owner question 16, default (a), accepted with the rest of his "defaults, except".

```prisma
model CatchupEditionRead {
  userId    String
  editionId String
  readAt    DateTime @default(now())
  @@id([userId, editionId])
  @@index([editionId])
}
```

One row per person per Edition, written when the reader is opened. It is what makes an unread
Edition look different from a read one on the list, without anything counting anything — his
standing objection is to counts, not to signals (R32: *"you're trying so hard to include useless
information"*). `ShelfRound.read` in the drawing is already wired for it.

---

## 4. The surfaces

All three are drawn and approved. This section says only what the transplant has to get right,
and the numbers it must not re-invent — they come from the app, not from taste.

**The shared geometry**, and it is the app's own:

| | Number | Where it comes from |
|---|---|---|
| Two-column grid | fluid main + **318px** rail, **30px** gutter, from **1180px** | `src/components/layout/rail-grid.ts` |
| The list's page width | **1096px** | `_list.tsx`, so a television gets air rather than a 2,000px line |
| The standard pill | Button `default` — **h-10, px-4** | `src/components/ui/button.tsx`; it was `sm` and he caught it |
| The shell for a side panel vs a sheet | **1024px** | `src/components/common/use-wide-viewport.ts` |
| The scrim over any picture carrying words | `PICTURE_SCRIM`, one constant | `_cover.tsx` |

### 4.1 The list, `/catchups`

`architecture.md` §4, drawn in `_list.tsx`. The card **is** the picture: 5:2 on a laptop, 16:9 on
a phone, two up from 1180px, name and one state line written on it over the scrim. No rail, no
Fresh off the press, no View, no three dots, no birds row, no counts, no Edition number. One
call to action, the app's own standard pill. Archived is one quiet row at the foot.

**Deleted, not restyled**: `index/fresh-off-the-press.tsx`, `index/filed-away.tsx`,
`index/your-catchups-card.tsx`, `index/catchup-card-menu.tsx`, `index/group-first-guidance.tsx`.

**Plus the spare slots — see §5**, which is a piece of the list nobody has drawn yet and which
he decided on 2026-09-07.

### 4.2 The home, `/catchups/[id]`

`architecture.md` §5, drawn in `_home.tsx`. Four regions, always in the same spot, at every state
and for every member: the **head** (the picture as a banner, **240px** on a laptop and **172px**
on a phone — a height and never a ratio, so a wider screen shows *more* of the photograph rather
than a thinner slice; the name on it bottom left, People and Settings as icon doors bottom right);
the **Edition** region, which is the only thing that changes; the **state line**, one line under
it, right-aligned; and the **sidebar**, which is the earlier Editions as covers and nothing else.

**The rule that stops the controls floating again**, and it is the whole lesson of the rejected
first pass (N44: *"nudge everyone, close now, just hanging in the middle of nowhere"*):

> A control is either the page's one primary action, in the content, attached to the thing it acts
> on — or it is behind the Settings door on the picture. There is no third place, and there is
> never a row of equal-weight pills in the content.

**Answering happens here** (N77), so `/catchups/[catchupId]/answer` is deleted and redirected, and
`answer/answer-experience.tsx` and `answer/progress-rail.tsx` move onto the home.
**`home/people-panel.tsx` (728 lines) and `home/keeper-settings-dialog.tsx` are deleted**, along
with `console-collecting`, `console-answering`, `console-published`, `extend-deadline-card`,
`archive-shelf`, `almost-ready` and `not-yet-published`.

**The type rule**, which he asked for by name (N96) and which needs writing down because
`globals.css` puts the heading face on `h1` to `h4`:

> **Serif is a title or a name** — the page's title, a Catch-up's name, a dialog's title, a card's
> own title, a question, and the date that identifies an Edition on its cover. **Sans is the app
> talking** — the label over a group, a state line, a hint, a value, a control, a count.

Anything that is a label carries `font-sans` explicitly, whatever tag it uses.

### 4.3 The reader, `/catchups/edition/[editionId]`

`front-runner.md`, drawn in `_reader.tsx`, `_navigator.tsx` and `_parts.tsx`. The green bar
carries the Catch-up's name and is the way up at every scroll depth. Under it the strip: the
Edition's date at rest, the current question in full once its heading has gone, capped at **three
lines** (N5), with a cinnamon measure along its top edge for progress. **Navigator A** — the strip
unfolds downward in place — and it is now the only one (N46).

**Four traps this surface has already sprung on three sessions**, all written up in the room:

- A sticky element inside a scaled frame drifts by `(1 - s)` (F34). **Nothing in that room is
  scaled and nothing should be again.** The shipped page is not scaled either; do not add a frame.
- An ancestor with `overflow: hidden` becomes the scrollport and kills `position: sticky`;
  `overflow-x: clip` does not (F31, F33).
- `ImageViewer` must be reached through `lazy-image-viewer.tsx` or a server render throws, React
  calls it recoverable, and the page silently builds twice (F36). There is now a test for it.
- The rail's magnification is the **Collection year rail's** mechanism — a motion value for the
  pointer, a transform reading each row's live rect, a spring on the scale, zero React renders per
  frame. Reach is not the Collection's 64px: these rows are 41 to 79px tall (F45).

**Two things it must carry that are not in the drawing yet**: comments (§3.7) and the answer
tile's vertical padding down 10% top and bottom (N93), which touches the feed if the number is
shared — and he asked to be asked before it does.

**The two clamps, decided by him 2026-09-08** (owner question 20), and they swap:

> *"a. make this clamp to three lines and the other one that was previously clamped to three
> lines, clamp to two lines."*

| | Today | After |
|---|---|---|
| The **docked question in the strip**, always on screen (`_navigator.tsx:118`) | 3 lines | **2 lines** |
| A **row in the pull-down list of questions** (`QuestionList`'s `Row`), no clamp at all | unbounded — a 300-character question is **211px against its neighbours' 41** | **3 lines** |

That inversion is right for a reason worth keeping: the strip is on screen the whole time you are
reading, so it has to be small; the list is a thing you deliberately pull down, so it can afford
more. **This closes F41.**

Two traps, both from F41 and both already proved: `overflow: hidden` clips at the **padding** box,
so a clamp written on the padded button bleeds a band of the fourth line into the row beneath — it
belongs on an inner span. And the rail's swell measures live row rects, so clamping changes row
heights and the magnification must be re-checked, not assumed.

`QuestionList` has other callers. Apply the three lines to the navigator's rows; if a cover looks
wrong under the same clamp, say so rather than quietly adding a second number.

**OPEN, and it is the reader's one unanswered note — N11, the title.** *"In the Loop Round 1, 15th
August. It's super basic. It works okay. I feel like we can still make it much prettier. The
title. It's just not that beautiful."* The Edition number has since gone (N92) and the date is
cinnamon, which is half of it. The other half is undone. **Phase 8 owns it**, and it is drawn in
the lab and shown to him before it ships, not decided in a build session.

---

## 5. The list's spare slots

Decided by him on 2026-09-07, drawn by nobody. It lands **inside phase 6**, with the list, because
it is a rule about what fills that grid rather than a surface of its own.

> *"regarding the one catch up page let's just show the latest editions in a preview like we're
> doing but on that page! I think that would work well. let's do it so it maxes at 4. that is if
> they have one catch up then max latest 3 editions. if they have 2 catch ups the the latest two
> editions whichever one they're from. if they have four catch up, no need to show editions there.
> we'd have to show the date and from which catch up it is if there's more than one catch up. and
> just so it's obvious that they're different types of elements maybe include the fact that it's
> the latest editon somewhere on the card in a pretty way."*

**The arithmetic.** The grid holds four things. Catch-up cards come first; the remainder is filled
with the most recent Editions, newest first, from whichever Catch-ups they belong to.

| Catch-ups | Edition covers |
|---|---|
| 1 | 3 |
| 2 | 2 |
| 3 | 1 |
| 4 or more | none |

**What an Edition cover carries here, and only here**: its date; which Catch-up it came from, but
**only when the member has more than one** (with one, saying so is the same fact twice); and
something that marks it as the newest, *"in a pretty way"* — deliberately not a label reading
"Latest Edition", which is the register he keeps cutting.

**Two things for whoever draws it.** It is `Cover` from `_cover.tsx`, the same component the home
uses, so this must not become a second way of drawing an Edition — that is the campaign's oldest
complaint (¶13, ¶39). And it is close to "Fresh off the press", which he had deleted: what made
that one wrong was a rail of quoted first sentences with a curved divider and a padding-less
hover, not the idea of showing what is new. **Draw the cover, not the teaser.**

---

## 6. What is deleted, in one list

So a build session can check its own work against it. Every one of these is deleted rather than
redrawn, and each has its reason written above.

| | Why |
|---|---|
| the right rail on `/catchups`, and Fresh off the press with it | §4.1, I1, I9 |
| the View button, the three dots, the darkening hover | a card is a door |
| the row of birds and "+18" | ¶23, it identifies nobody |
| "Recently deleted", the 30-day bin, `deletedAt` | §3.6 |
| the `preparing` state, `publishAt`, "Publish now" | §3.3 |
| every Edition number, and `roundLabel()` | §3.3, N92 |
| the `/catchups/[id]/answer` route | §4.2, N77 |
| `people-panel.tsx`, the See-and-add-people dialog | E1, E3 |
| `keeper-settings-dialog.tsx` and the settings dialog | S1 |
| the "Round 1 is out" tile and the "open on its own page" link | ¶35 |
| "13 of the group wrote in", "Question 1" | R21, R30, R32, ¶27 |
| the rhythm line and the sentence explaining what an Edition is | *"we don't need to teach them how to use it"* |
| "Skip for now" in the composer | N83, *"skip for now is same as next"* |
| the name/anonymous segmented pill | N73, one eye in the box's top right instead |
| the `song*` columns on `CatchupEntry` | §3.8 |
| the `-catch-up` suffix in `catchupSurfaceTitle` | ¶25, and it is a reversal of his own July decision (F22) |

---

## 7. Copy

- **"Rishi Valley", never "RV Connect."** App-wide.
- **"In the loop", not "In the loop catch-up"** (¶25). This reverses his own 2026-07-25 decision,
  which `catchupSurfaceTitle`'s docblock cites; record it as a reversal, not as a bug (F22).
- **The Keeper is "Keeper"**, and nothing more (¶38).
- **No Edition numbers, anywhere a member reads.** A date is its name. **One exception, his,
  2026-09-08: the admin room keeps them** -- three places (`/admin/catchups`, the reading room's
  section labels, the stuck-Edition alert). There the number is the row's actual key,
  `@@unique([catchupId, number])`, and an unpublished Edition has no date to go by. All three
  carry a comment saying so, because otherwise a later phase "finishes" the rename.
- **No counts** unless the number is the finding: not answers, not photographs, not people.
- **Nothing that teaches.** ¶ and N: *"everyone from 1978, every 3 months, that doesn't need to be
  said"*, and *"we don't need to teach them how to use it."*
- **Banned words** (D43, from his 2026-07-25 copy review, unreversed): "gentle", "quiet", "small",
  "warm", "a round of".
- **No em dashes in user-facing copy.** House rule.
- **Warmth is a dial**: one warm line per surface, on the title, never on a button and never on
  destructive text. Target about 4.5 out of 10, not 7.5.
- **A one-way control says so in its own words**, on its own row — *"Cannot be undone"* — rather
  than through a dot and a footnote explaining the dot.

---

## 8. Testing

- **Unit, on the pure logic.** `catchups-core.ts` is already covered by 874 lines of tests; the
  civil-hour snap, the deleted `preparing` transition and `planNextAction` without it all get
  their own cases. `catchup-shelf.ts` gets the spare-slot arithmetic (§5) as a table test: 1→3,
  2→2, 3→1, 4→0, and the "name the Catch-up only when there is more than one" rule.
- **A regression test per fixed bug**, shipped in that bug's own commit, never as a `test:` commit
  of its own.
- **Playwright on geometry, with `expect.poll`**, for anything animated — a node mid exit-animation
  still answers `toBeVisible()`. Scope every locator to the desktop rail (`page.locator("aside")
  .first()`), because the mobile drawer renders the same components again through a portal.
  `e2e/sidebar.spec.ts` is the worked example of both.
- **The MCP finds the answer; Playwright remembers it.** Never debug by re-running a spec.
- **Visual baselines.** `/catchups` is already in `ROUTES` in `e2e/visual.spec.ts`, masked past the
  page header because it photographs live data. The home and the reader are added, each with its
  reason, and anything that moves on its own goes in `volatileRegions()`. Stage moved baselines
  **inside the UI commit that moved them**.
- **The pressure corpus.** `?data=pressure` already swaps the Edition the whole spine draws
  (F43 fixed the pill). Every rebuilt surface is looked at under it before it is called done: it
  is what found seven defects in one night, and D45 exists because nothing had ever rendered the
  file. The real caps it sits on: answer body **6,000 characters**, **3 photographs** per answer,
  question **300 characters**, **40 questions** per Edition, **100 people** on a people Catch-up,
  photographs boxed to **1920px** on the long edge (F19).
- **`npm run check` before every commit; `npm run visual` after any UI change; never both at
  once** (two spurious whole-page diffs, 2026-08-29). Read the diff before ever running
  `visual:update`.
- **Screenshot desktop and mobile, minimum two rounds**, comparing in specific numbers.

---

## 9. Phases

Each one ships on its own, leaves the app working, and can be reverted without taking another
with it. Each is a session. Re-run the export (§3.1) at the start of any phase with a migration
in it.

| # | Phase | What lands | Migration |
|---|---|---|---|
| **X** | **Fast fixes** | the heart's `revalidatePath` (F23: 603 KB and 2.6s per tap, and the fix is deleting two lines); `break-words` on the answer body and question heading (F18, the phone overflow he can see today); the image viewer's three swipe faults (V1 to V3, which he allowed to touch the feed); the caption clamp 2 lines → 4 (¶32, D38) | none |
| **1** | **Edition** — **DONE 2026-09-08** | the rename, one mechanical pass; the route move plus a permanent 308. `roundLabel()` deleted and its five call sites re-worded. `npm run visual` 25/25, no baseline moved | written, **applied after the deploy**: `2026-09-08-round-becomes-edition.sql` rewrites `Notification.link` (61 rows) and `ContentView.kind` (17). Running it first would 404 sixty-one live bell links on the build still deployed |
| **2** | **The clock** | `preparing` deleted; deadlines snap to 07:00 IST; **Start the next Edition now** added — the control nobody had (N43) | `preparing` rows published |
| **3** | **The picture** | the two columns, the pool module out of the lab, the backfill, creation writes one. Nothing renders it yet | picture columns + backfill |
| **4** | **The batch Catch-up** — **DONE 2026-09-08** | two created (2023 and 2024, the only batches at ten); `createdById` and `inviteToken` NULL on both; the 2024 snapshot adopted after an assertion, keeping its Edition; `joinBatchGroup` moved to `src/lib/batch-catchups.ts` and now ensures the Catch-up; the tick's two self-heals, on the CRON sweep only; both Keeper preambles and both exits refuse a batch; the sidebar item hidden when you have no Catch-up to open. **Measured: 51 of 70 members now see Catch-ups, 15 lose the row.** No schema change | `2026-09-08-batch-catchups.sql`, applied to both: 1 membership healed, 1 re-point, 1 Catch-up, 1 Edition on production; a clean no-op on the demo |
| **5** | **Leaving, and the read mark** — **DONE 2026-09-08** | `setCatchupDeleted`, the 30-day bin, its retention sweep, its shelf and `restoreOwnCatchupCopy` all deleted; `leaveCatchup` the only exit and the only holder of the batch refusal; Delete became **Leave** on the list. `CatchupEditionRead` is a table of its own rather than a read of `ContentView` (the analytics counter, no FK on `targetId`, written before the reader knows the status), written past the published gate. **Nothing draws the mark yet; phase 6 does.** `deletedAt` the COLUMN waits for phase 11 | `2026-09-08-leaving-and-the-read-mark.sql`, applied to both: 0 rows moved on each (counted first), the index dropped, the read table created |
| **6** | **The list** | `/catchups` rebuilt from `_list.tsx`, including the spare slots (§5) and the archived row | none |
| **7** | **The home** | `/catchups/[id]` rebuilt from `_home.tsx`: the head and its two doors, the Edition region per state, the state line, the sidebar of back numbers, the people dialog and sheet, the settings list. Answering moves onto the page; `/answer` deleted and redirected | none |
| **8** | **The reader** | the front runner transplanted; navigator A; the rebuilt magnification; **the two clamps** (§4.3, which closes F41); **N11, the title, decided** | none |
| **9** | **Comments** | the widened `Comment`, the five actions, `comments-section.tsx` parameterised, `catchup_comment`, the open/close animation | `Comment.entryId` |
| **10** | **Link previews** | `LinkPreview`, resolution on any pasted link, Spotify and YouTube cards, the fail-soft rule | the `LinkPreview` table |
| **11** | **Cleanup** | the dead columns dropped **after phases 2, 5 and 10 have deployed**; the three throwaway Catch-ups and the orphaned snapshot group removed; `docs/spec/catchups.md` rewritten to describe what shipped | the drop file |

**Two sessions run beside these, not inside them.**

- **The settings surface and the confirmations** (§11.3). His, N100: *"I think the settings dialog
  needs refining but no need to do that now I can do it in a separate session."* Before phase 7.
- **S-features** (§12). After this spec, before or beside phases 9 and 10, because two of its three
  pieces are LOCKED decisions those phases have to carry anyway.

**Track M, the magazine**, runs on its own timetable from `M1` and is not sequenced here.

**X may ship first and at any time.** It is independent of the redesign, it is fixes from causes
S1 already root-caused, and F23 and F18 are live faults on a surface seventy members use.

---

## 10. What is undrawn, and whether it is drawn before the build or inside it

Three surfaces have no drawing. Here is the call on each, with the reason.

### 10.1 The composer's attachments — **inside the build, phase 7**

The composer's shape is drawn on the home and he named the shipped one as close to right (N36).
What is not drawn is the photo strip's neighbours.

- **The song field is deleted, not drawn.** D9 and ¶50 say a pasted link resolves *wherever* it
  appears; a dedicated song field is precisely Letterloop's *"things are too fixed"* that he was
  criticising in the same breath. F30 measured the cost of keeping it: the songs question has
  thirteen answers and `songUrl` is null on every one, because people pasted into the body. So
  there is nothing to draw — there is one writing box, and §3.8 does the rest.
- **The photo-wall answering control is the photo strip with a higher cap.** `promptKind` already
  returns `photo` for the `photo-wall` category, and the strip is drawn, animated and capped at 3
  (`Attachments` in `_home.tsx`, whose four decisions about displacement are already argued). A
  wall question raises the cap; nothing else about the control changes. Inside the build.
- **What is genuinely undrawn is how a wall of twenty-four photographs is READ**, in the reader,
  in a way that is not a grid. That is his interesting half, and it belongs to **S-features**
  (§12), before phase 8 touches the reader.

### 10.2 The picture's upload and crop — **inside the build, phase 3**

Both halves already exist: `photo-aim.tsx` is the aiming control the feed composer and the
Catch-up photo attachments both use, and the R2 direct-upload path (`/api/upload/presign` and
`/finalize`) has been unblocked since 2026-08-21. So this is a settings row that opens a picker
(the pool, from §3.4) with an "upload your own" branch that hands the file to the existing path
and stores the resulting `object-position` in `pictureFocus`. It is a dialog assembled from parts
that are already drawn, which is the definition of build work rather than design work.

One thing it must get right, and it is the thing that has fooled two sessions: **the crop moves
between screens** — 5:2 on the list, 16:9 on a phone, a fixed 240px band on the home. So the
aiming control shows the *narrowest* of those bands while you aim, not the widest, and the hint
says what is guaranteed to survive.

### 10.3 The confirmations the one-way controls open — **drawn before the build**

These are dialogs, and dialogs are the one part of this feature he has asked to be reworked *"in
general"* (¶3), with three separate complaints filed against them (L4, E3, S2) and a research
base already on disk (`docs/planning/other/dialog-standards-findings.md`). D50 says this spec owns
them, and the honest answer is that a confirmation is only as good as the settings list it opens
from — which he has called *"very bare bones"* and has claimed for a session of his own (N100).

So: **the settings surface and its confirmations are one session, drawn in the lab, before phase
7.** Not because a confirmation is hard, but because five of them designed one at a time inside a
build phase is exactly how twelve horizontal rules and a pill inside a pill happened the first
time (¶14, ¶40).

What that session inherits, already settled: the settings **list** grammar — an icon tile, the
label, what it does in a phrase, and the value or a chevron on the right; a one-way control
wearing a cinnamon tile and saying *"Cannot be undone"* in its own hint; reminders as a row among
the rest and not a block of their own (*"reminders I feel can go with the other settings. I don't
know why we're separating it"*); and the accident rule, that an irreversible control never sits
where a thumb lands and is never open to everyone by default.

---

## 11. S-features: the second brainstorm

**He has asked twice that this not be lost**, and the row exists because he watched a feature-
research ask become a handful of ledger lines:

> *"in my initial request for the catch ups rework I also requested a brainstorm on and research
> into more features we can incorporate for instance a photo wall round and that can be shown
> nicely on the reader in a unique way and maybe some other stuff ... have a think and see what
> people would want and what letterloop and any other similar guys do now. I don't want you to do
> it in this session but I had requested it at some point and I wanna make sure it gets done at
> some point and it hasn't been written out of the brief completely."*

It has not been: it is ¶16, ¶49 and ¶50, and ledger rows R15, R16 and P22. **What is missing is a
session that does it**, and this is that session's brief.

**What it is NOT.** Not a redraw of anything at `/lab/catchups/sketches`. Not the build. It asks
what a Catch-up should be able to *hold* that it currently cannot.

**The three it owns**, so nothing is re-derived:

1. **A photo-wall Edition** (¶16, ¶49). *"we definitely have to add a photo wall for questions
   where people can just add photos, but it needs to be modular and work with everything else."*
   The `promptKind` exists and has never been drawn. **The interesting half is the reading
   surface**, and it is the one piece here that can change a page already drawn — so it comes
   before phase 8. The pressure corpus already carries a two-hundred-photograph wall.
2. **Link previews on any pasted link** (¶16, ¶50). Half-built and specified in §3.8; what this
   session adds is which *other* hosts, if any, and whether a preview belongs anywhere but an
   answer.
3. **The Letterloop parity list** (¶49). *"a lot of the things that were there in Letterloop
   aren't there ... those kind of tiny things."* `prior-art.md` §1 has words and no pixels, and
   F15 says not to lean on it. This wants looking at the product again, plus whoever else is in
   this space now.

**And the genuinely open part**: what else an Edition could hold. *"maybe some other stuff"* and
*"see what people would want"* is an invitation to propose, not a list to implement. Bring him a
shortlist with a sentence each, in the shape the owner-questions block uses, and let him cut it.

---

## 12. Operational context

So none of it is explained twice.

- **Repo** `/Users/sanan/Documents/rv-connect`, branch `main`, no feature branches. Commit each
  coherent piece as it lands and passes `npm run check`, with its test, its `progress.md` line,
  its `docs/history/progress-<YYYY-MM>.md` entry and its doc edits **inside the same commit**.
  **Do not push** without asking: a push is a deploy to both Vercel projects.
- **Several Claude sessions share this checkout.** Uncommitted changes you did not make are
  someone's work in progress. Stage by pathspec — `git commit -F - -- path/one path/two` — and
  never `git add -A`, `-a`, stash, reset, checkout or clean. Do not kill a dev server you did not
  start.
- **Commit messages**: plain conventional, 150 words hard ceiling, no AI attribution of any kind.
- **The gate** is `npm run check` (about 30s idle, minutes when another session is building).
  `npm run visual` after any UI change, **never concurrently**.
- **Dev server** `npm run dev` on `http://localhost:3000`; `mv .next .next-stale-$(date +%s)` if
  every route 404s, and always after editing `globals.css`.
- **Screenshots**: `npm run screenshot:auth -- "<url>" [--mobile] [--full]` and
  `npm run verify:shot <route> <out.png> [mobile]`, both signed in from Node. Everything writes to
  `e2e/.shots/`. F28: the `chrome-devtools` MCP cannot be signed in from a session; for geometry,
  a throwaway puppeteer probe in `/tmp` importing `scripts/qa/_dev-login.mjs`, deleted by the same
  command that made it. F27: a `--mobile --full` shot of a page over ~8,000px with a
  `backdrop-filter` in it comes back blank; capture at scale 1 or in pieces.
- **Test account is Jerry Maguire** (`sanan.shankar@gmail.com`). Never sign in as a real alumnus:
  dev-login writes presence telemetry against whoever it signs in as.
- **`/lab` needs a session and the admin role**, and every room is registered in
  `src/app/lab/_registry.ts` or `npm run check` fails. House voice: `docs/spec/lab-voice.md`.
- **Never any Vercel CLI command.** Env vars, domains and settings are his, in the dashboard.
- **The repo root is closed.** Scratch dies in the command that made it; scripts that stay go in
  `scripts/dev/` or `scripts/qa/` with their working folder beside them.
- **His machine has hung under browser fleets.** One `chrome-devtools` instance; the
  desktop-plus-mobile `screenshot-qa` pair is the ceiling.
- **"kowalski"** anywhere in a message: reply at once with a compact progress report, and keep
  working.

---

## 13. Every paragraph of the brief, and where it is answered

The ledger in `handover.md` is the aid; **the brief is the test**. ¶1 to ¶52, none skipped.

| ¶ | What he asked | Where |
|---|---|---|
| 1 | the list's shape, the long rectangles, white space on a TV, a picture per Catch-up, where archived ones live | §4.1, §3.4, §3.6 |
| 2 | picking the transcript back up | no ask — out |
| 3 | View, three dots, the hover, dialogs "in general", "a V0.5 of an app" | §4.1, §10.3, §0 (the bar) |
| 4 | the batch Catch-up by default, who keeps it, "Start one" going to the add-members page | §3.5 |
| 5 | no leaving your batch; WhatsApp archive and delete; no Archived tile with Put back | §3.5, §3.6, §4.1 |
| 6 | 90% white space on a wide window; the Spotify-grid idea, immediately withdrawn | §4 (1096px), §4.1 |
| 7 | constraints not answers; research Letterloop; pick the best way | §0, §11 |
| 8 | pausing, which he does not get, and then argues for himself | §3.3 (hold the next Edition), architecture §6 |
| 9 | Fresh off the press: the quote, the curved divider, the hover, "the most bugs" | §4.1 — deleted |
| 10 | a PDF; comments; click a picture to expand; the bolding TOC; "navigation on phone is incredibly bad" | track M, §3.7, X, §4.3 |
| 11 | the horizontal bar, the chip row, the green bar cut off, density, the desktop rail | §4.3, X (F18, F23) |
| 12 | the people surface, "and 16 more", "done so badly" | §4.2 — the roster is one door |
| 13 | Published issues vs Fresh off the press; one representation | §4.1, architecture §1 |
| 14 | twelve horizontal rules, pills inside pills; pause and resume are okay | §10.3 |
| 15 | the same Edition three times on one home | §4.2 |
| 16 | a photo wall; YouTube and Spotify previews done cutely | §11, §3.8 |
| 17 | so functional and so boring; Letterloop is the floor and we are under it | §0 (the bar) |
| 18 | the architecture; what the home is; a Back button is not the answer | §4.2, architecture §7 |
| 19 | "if catch-ups was my entire app"; two parts; about 10% is good | §0 |
| 20 | recon, then multiple rounds of brainstorming, then build it several ways | done — S1, S3, S3b, S3c, S4 |
| 21 | the PDF and the magazine, both aspirational; scope it as a side project | track M — out of this spec, §14 |
| 22 | amend the writing-for-agents skill | done in S0 — out |
| 23 | three calls to action; the birds and "+18" identify nobody | §4.1 |
| 24 | the ended/archive problem; three dots belong top right if at all | §3.6, §4.1 |
| 25 | the green bar cut off on his phone; say "In the loop", not "In the loop catch-up" | X (F18), §7 |
| 26 | his problems are valid, his suggestions are examples; do not just reduce the negatives | §0 |
| 27 | the birds row; "13 of the group wrote in"; the horizontal rule; "Question 1"; the tiles are fine | §6, §4.3 |
| 28 | the image viewer: the size snap, the wrong swipe-back, the overshoot | X |
| 29 | the heart's animation a second late | X (F23) |
| 30 | the thick empty band under a tile; the magazine as the real answer | §4.3 (N93), track M |
| 31 | Cyan's tile using 15% of itself; the hundred things that could go wrong | §4.3, track M |
| 32 | the caption's More and Less, 2 lines → 4 | X (D38) |
| 33 | the half-centimetre of white space on the right | X (F18) |
| 34 | no way to navigate on a phone once you have scrolled; maybe a Collection-like navigation | §4.3 |
| 35 | the dead "Round 1 is out" tile; scrolling to the bottom to get home | §4.2, architecture §3 and §7 |
| 36 | every intent against every state; modular design collapses the 10,000 | architecture §8, §4.2 |
| 37 | "In this catch-up" and its wasteful rows; the Keeper's leaf is nice | §4.2 |
| 38 | the See-and-add-people dialog, and its every fault | §4.2 — it does not exist |
| 39 | Published issues; "15 different ways in 15 different places" | architecture §1, §5 |
| 40 | settings: the billion rules, too many pills, the Reminders dialog, too many verbs | §10.3 |
| 41 | "I've described maybe 10% of the problems" | §0, and recon's 43 findings |
| 42 | do not reinvent the palette; the Action Button; a higher level of abstraction | §0, `architecture.md` |
| 43 | screenshots, because code cannot show a UX problem; structure the work how you like | §8, §9 |
| 44 | 70 beta testers on it today; catch-ups is actively hidden from demos | §3 |
| 45 | do not delete the content; export it; do not let that shrink the rework | §3.1 |
| 46 | which sessions on which models at which effort | `handover.md` "The sessions" — out |
| 47 | "do me proud", go above and beyond | §0 |
| 48 | old specs are guidance, not law; heavily outdated | §0 |
| 49 | Letterloop parity; the Spotify thing does not work; no photo wall | §11, §3.8 |
| 50 | the preview fires whenever a link is pasted, not only on the songs question | §3.8 |
| 51 | his five answers: ultracode, throwaways, both kinds together, the export, real data, pressure testing, portrait | §3.1, §3.5, §8, track M |
| 52 | `/lab/catchups/` is the sandbox, "use it whenever you need" | §8, §12 |

---

## 14. What this spec does not cover, and why

- **The magazine and the PDF (¶21, ¶30, ¶31).** He called both *aspirational* and asked for it to
  be scoped as its own side project. It is track M — `M1` writes its layout grammar, its failure
  list and its feasibility spike, and it runs beside these phases rather than after them. D24 has
  the recommended pipeline; D27 has the resolution problem, which is a data question this spec
  does **not** settle: Catch-up photographs are boxed to 1920px on the long edge, which is 164 dpi
  at A4 full-bleed. If M1 needs more, it needs the Collection's keep-the-original treatment, and
  that is a migration of its own.
- **The settings surface and its confirmations.** §10.3 — his own session, before phase 7.
- **The photo wall's reading surface.** §11 — the S-features session, before phase 8.
- **N11, the reader's title.** §4.3 — phase 8 owns it, drawn in the lab and shown to him.
- **F41 is no longer open.** He answered it on 2026-09-08: three lines on the list's rows, two on
  the strip's docked question. It lands in phase 8; see §4.3 for the two traps that come with it.
- **The refactor pass.** ¶20 fences it: *"We don't have to refactor the catch-ups portion yet."* A
  2,054-line actions file is not this campaign's problem unless a design needs it changed. Phases
  7 and 9 will shrink it as a side effect; nothing here chases it for its own sake.
- **The feed's own edge-to-edge photographs (N17).** He asked for it as **one nuclear commit he
  can revert**, separately from everything else. It is not a Catch-ups phase and must not ride
  inside one.

---

## 15. Owner questions this spec opened, and how they closed

**All three are closed as of 2026-09-08.** Nothing in this spec is waiting on him. What is still
his, and is not a question, is listed in §1: the twenty photographs, and the settings surface he
has claimed for a session of his own.

**19. ANSWERED 2026-09-08, and he went further than the question.** *"for people whose batches have
less than ten people, let's not even show the catch ups things in the sidebar. it won't be reachble
to them. once there's ten it appears and the catch up would be created for that batch."*
Written up as **§3.5b**, with one reading marked RECOMMENDED: the sidebar test is "have you got a
Catch-up" rather than "is your batch big", because the demo's visitor and any small-batch member
invited to a people Catch-up both have something behind the door.

**20. ANSWERED 2026-09-08 — (a), and the strip drops to two.** *"a. make this clamp to three lines
and the other one that was previously clamped to three lines, clamp to two lines."* Written up in
§4.3. **This closes F41**, which had been open since 2026-09-07.

**21. WITHDRAWN — it was already answered and already done.** *(asked and withdrawn 2026-09-08,
within an hour, when the commit was found)*

The 10% tightening (N93) was measured on 2026-09-07 and the number IS shared with the feed: **8px
above the reaction row's box and 9px below**, either side of a 32px button whose glyph is inset 7,
so the ink sat 21px under the words and 23px above the border. A tenth of each is 2px:
`mt-2 -> mt-1.5`, and the bottom pull `-7 -> -9`. It shipped to the feed as
**`2a6f7d25`, its own revertable commit**, which is exactly the *"keep that as one nuclear commit
that I can revert"* he asked for in N17. The Catch-ups half arrives with build phase 8, because the
drawn tile uses the feed's own control at the feed's own sizes.

One cost is recorded in `post-card.tsx` and repeated here so it is not lost: the old `-7` was
chosen so the ink landed 17px above the border, matching the card's 16px sides (*"bottom padding
must match the sides"*, 2026-08). At `-9` it lands at 15, a pixel INSIDE the side inset rather
than a pixel outside. The later instruction won. If the older one is the one he meant, that is the
line to change back.

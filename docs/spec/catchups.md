# Catch-ups

What shipped, as of 2026-09-14: build phases 1 to 10 of the Catch-ups rework and the safe half of
phase 11. **Revised 2026-10-17: Editions start by hand.** There is no rhythm and no hold; an Edition
begins when somebody in the Catch-up presses Start (`docs/planning/catchups-rework/editions-on-demand.md`
has his words and the four answers that settled it). Every fact here was read off the code and the schema, not the planning documents. Where
the two disagree, the code is what this file describes, and §15 lists every place they part.

The reasoning (the owner's brief, his reviews, the options weighed and not taken) lives in
`docs/planning/catchups-rework/`: `brief.md` for what he asked, `architecture.md` for the shape,
`spec.md` for the build plan, and `handover.md` for where the campaign stands. This file does not
repeat any of it. The version this replaces (the July build spec, with Rounds, `preparing` and a
24-hour hold) is in `git log --follow -- docs/spec/catchups.md`.

Copy rules that still bind every Catch-ups surface: "Rishi Valley", never "RV Connect"; no em dashes;
no subtitle that restates its heading; the words "gentle", "quiet", "small", "warm" and the phrase "a
round of" are banned (owner review 2026-07-25); no counts unless the number is the finding; no
Edition numbers anywhere a member reads.

---

## 1. What it is

A Catch-up is a newsletter a group writes to itself whenever one of them wants one. Somebody presses
Start, the group asks questions for a few days, everybody answers for a week, and the answers come
out together as one **Edition** that the whole group reads. Then nothing happens until somebody
starts the next one. The owner, 2026-10-17: *"You should just be able to start it whenever you want.
And then it ends when it ends. And then it just doesn't go until you start it again."*

---

## 2. The nouns

| Word | Table | What it is |
|---|---|---|
| **Catch-up** | `CatchupSeries` (model `Catchup`) | One per `Group` (`groupId` is unique). Its state, its picture, who keeps it |
| **Edition** | `CatchupEdition` | One cycle. Its status, its two deadlines, when it came out |
| **Question** | `CatchupPrompt` | One thing asked in an Edition. Always stores its asker; `showAsker` false hides them |
| **Answer** | `CatchupEntry` | One member's answer to one question. Unique on `(promptId, authorId)`. Never anonymous |
| **Heart** | `CatchupEntryLove` | One member's heart on one answer |
| **Comment** | `Comment` with `entryId` set | The feed's own comment table, widened (§9) |
| **Read mark** | `CatchupEditionRead` | Who has opened which published Edition (§12) |
| **Preference** | `CatchupReminderPref` (model `CatchupPref`) | One member's reminder setting and archive stamp for one Catch-up |
| **Link preview** | `LinkPreview` | A resolved card for a pasted url, shared by every answer that pastes it (§10) |

The two `@@map`s exist because an earlier, reverted build left tables called `Catchup` and
`CatchupPref` behind with different columns. **Those legacy tables are gone from the live database**
(checked 2026-09-14); the maps stay because renaming a live table is not free.

**An Edition is named by its date.** `CatchupEdition.number` exists only so
`@@unique([catchupId, number])` can enforce one Edition at a time; nothing a member reads prints it.
`roundLabel()` is deleted. The one exception is the admin room (§14), where the number is the row's
key and an unpublished Edition has no date.

### 2.1 Two kinds of Catch-up

**A people Catch-up** is started by a member from `/catchups/new`: a name (1 to 80 characters), up to
`MAX_CATCHUP_PEOPLE` = 100 people. `createCatchupWithPeople` creates a private `Group`
silently as the membership container, the `Catchup` with an invite token and a picture, and Edition
1 in `collecting` with no questions: making a people Catch-up starts its first Edition, and everyone
named is told. The starter is `createdById` and holds the group role `admin`.
Anyone a Catch-up may not hold is dropped from the roster: `CATCHUP_PEOPLE` in
`src/lib/catchup-caps.ts`, which is an alumnus with a confirmed email and a verified profile, not
blocked, not inside their deletion window, and not the site's Anonymous byline. Both pickers offer
exactly that set (`forCatchup=1` on `/api/users/search` and `/api/users-by-batch`), and adding people
later and handing on the hat ask the same rule (bug audit 3, L10-01: until 2026-10-29 the pickers
offered accounts that had confirmed nothing).

**A batch Catch-up** belongs to a batch group (`Group.batchYear` set). `isBatchCatchup(batchYear)`
is the whole test. One exists for every batch group at or over **`BATCH_CATCHUP_FLOOR` = 10**
members; under ten there is none. On the live database, 2026-09-27, that is nine batches: 1989, 2016,
2018, 2019, 2021, 2022, 2023, 2024 and 2026. Its `createdById` and `inviteToken` are NULL: there is no
individual Keeper of record and nobody to invite, because the membership is the batch. Everyone who signs
up with that batch year is added (`joinBatchGroup` in `src/lib/batch-catchups.ts`), before confirming
anything, and a late joiner reads every earlier Edition. An account that is not yet verified reads
the batch's Catch-up and presses nothing in it (owner, 2026-10-29: the controls wait, the joining
does not; §2.2). A member whose batch year changes afterwards, by their own profile or the
admin's People edit, is moved: `syncBatchGroup` takes them out of the old batch's group, pref row and
Catch-up bells, the same as leaving, and into the new one. Only alumni are in a batch. Their answers,
if any, stay in the old batch's Editions.

**It is made idle, and stays idle until somebody starts it.** It used to run every three months and
was made paused (both 2026-09-27); both went on 2026-10-17. A batch nobody starts never hears a word
from Catch-ups (his: *"if a batch is totally not concerned with it. They should not be bothered by
it"*), and any member may press Start (§3.5).

Three places make a batch Catch-up exist: `joinBatchGroup` at signup (so the tenth signup of a
batch is the moment one appears), and the two nightly self-heals (§13).

**It appears at ten but does not start.** Edition 1 is made `collecting` with `questionsCloseAt` null
and nobody is told. That row is idle (`isEditionRunning`, §3.5): the home draws Start, not the ask
box, and `submitPrompt` refuses it. The first Start puts the clock on that same row. Until
2026-10-17 the batch's third question started it instead (owner, 2026-09-22); Batch of 2018 has two
questions left in its first Edition from then, and they carry into it when somebody presses Start.
The original backfill was `prisma/migrations-manual/2026-09-08-batch-catchups.sql`.

### 2.2 Keepers

`isEffectiveKeeper` is true for the creator (`createdById`), or for a member whose `GroupMember.role`
is `keeper` or `admin`. Every path that hands the hat on writes `keeper`: `setCatchupKeeper`,
succession on leaving or removal, the account purge's succession and an admin's merge (the last two
wrote `admin` until 2026-10-29, which the revoke never matched, so their Keepers could not be
relieved; bug audit 3, T7a-07). `admin` is left only on each creator's own row from creation. It
was the group's moderation role once, and posts left groups on 2026-09-07, so it grants nothing a
Keeper lacks, and revoking takes either word from anyone but the creator (T3-15). The creator is
always a Keeper and cannot be demoted or removed. Nobody changes their own hat, and the last hat is
never taken: the revoke asks `anyOtherHolder` inside a transaction that holds the group's row, so two
Keepers taking each other's at once leave one wearing it (write-path review of A2, 2026-10-29). `isEffectiveKeeper` itself never returns true for a batch member --
nobody there holds `createdById` or the role, and that does not change.

**Every batch member holds the cycle instead** (owner, 2026-09-27: "make everyone a keeper"),
reversing his earlier N30 worry about an accident nobody could undo -- answered now by Start's
confirmation saying how many people it tells, not by locking the controls to nobody. Both preambles
(`loadKeeperScope`, `loadKeeperEdition`) take an `allowBatch` opt-in per caller, the
`mayChangeCatchupPicture` shape: the cycle controls (§4) pass it and let any batch member through
before `isEffectiveKeeper` is even asked; membership and identity do not, and are refused outright,
the same as before.

**Every control that reaches other members asks for a verified member first**: `requireVerifiedMember`,
the trust model's Stage 2, the same gate asking, answering and Start always had. Until 2026-10-29 the
four cycle controls and the people Catch-up's Keeper controls (end, remove, the hat) asked nobody's
stage, so a signup that had confirmed nothing could publish its class's Edition early, extend it or
delete its questions the moment a classmate pressed Start (bug audit 3, L10-01). Rename and the
picture wait too, though they reach nobody: on a batch Catch-up anyone may change the picture, so a
signup that had confirmed nothing could re-skin its class's Catch-up (write-path review of A2). Only
reading, leaving, filing your own copy and your reminder setting stay open below Stage 2, and
`batch-catchup-keeper-rule.test.mjs` fails any other action that does not ask. The hat itself goes only to somebody a Catch-up may hold
(§2.1), so it cannot be handed to an account its own controls would turn away.

**Starting an Edition is wider than the cycle**: anyone in any Catch-up, batch or people, Keeper or
not (his answer, 2026-10-17: "Anyone in it"). `startEdition` asks for membership and nothing else.

### 2.3 Sidebar

The Catch-ups row appears on the sidebar only for a member in at least one Catch-up: `(main)/layout.tsx`
asks `prisma.catchup.findFirst` and passes `hasCatchup`, which defaults to true when a caller forgets.
Hiding the row is not access control: `/catchups` still renders for anyone signed in. Teachers are
turned away from every `/catchups` route by `catchups/layout.tsx`.

---

## 3. The Edition's clock

### 3.1 States

```
draft -> collecting -> answering -> published
                                \-> sealed -> published     (a time capsule, a year later)
```

Forward only. `preparing` and its 24-hour hold were deleted on 2026-09-08: answers closing and the
Edition coming out are one transition. `draft` is still in the type, but nothing creates one; every
path opens straight into `collecting`.

| Status | Members see | Keepers can also |
|---|---|---|
| `collecting` | the ask box and the questions so far | remove or reorder a question, open answering, give everyone longer |
| `answering` | the questions to answer, on the home | give everyone longer, close and publish now |
| `sealed` | a time capsule waiting out its year: nothing in it, their own answer included (built, not yet drawn; §16) | (anyone may start the next Edition, §3.5) |
| `published` | the Edition, readable forever by every member, whether they wrote or not; on the home, Start under its cover | (anyone may start the next Edition) |

**Nothing in an Edition is readable before it is published**, Keeper included, and that includes
another member's answers. Only your own answers come back to you while answering. The owner closed
this on 2026-09-09 (spec §3.13, reading (a)). The heavy read, `loadPublishedEditionView`, is only
called after a fresh `published` status has been confirmed, and since phase 14 it also asks for
`published` in its own `where`, so a sealed time capsule returns nothing however it is reached.

### 3.2 Deadlines

All in `src/lib/catchups-core.ts`.

- **Question window: 3 days** (`QUESTION_WINDOW_DAYS`). **Answer window: 7 days.**
- **Every deadline lands on 07:00 IST** (`snapToDeadlineHour`, 01:30 UTC). It rounds forward, never
  back, so a window is never shorter than promised. The cron runs at 02:00 UTC (07:30 IST,
  `vercel.json`), so a deadline is picked up within half an hour. A test reads `vercel.json` to keep
  the two in step.
- **`TICK_GRACE_MS` = 5 minutes**: a deadline counts as passed five minutes early, so scheduler
  jitter cannot push a phase back a whole day.
- **`publishedAt` is the real instant**, not the snapped deadline, because it is the Edition's name.
- **A time capsule opens** on `capsuleOpensAt(sealedAt)`: the same calendar date next year in IST,
  at 07:00 IST. 29 February opens on 28 February. It is stored in `publishAt`.
- **Nothing opens on its own.** `nextOpensAt`, `cadence` and the month arithmetic under them went on
  2026-10-17; the columns leave the database with `2026-10-17-drop-rhythm-columns.sql`.

### 3.3 What the clock does on its own

`planNextAction` is the whole decision, pure and unit-tested; `advanceEdition` applies one step per
transaction with a compare-and-swap on status (or on `remindersSent`), so a second visitor does
nothing twice.

- **Collecting closes with no questions**: the question window is extended 3 days, once
  (`REMINDER_QUESTIONS_EXTENDED`), silently. If it closes empty a second time the
  Edition **fizzles**: the clock clears its question deadline, nobody is told, and it stays in
  `collecting`, idle (§3.5). The next Start reuses the row with a fresh window. A question no longer
  revives it; only Start does.
- **Collecting closes with questions**: answering opens, and the people taking part are told (§11).
  The clock and the Keeper's "Open answering" both count the questions after their status swap, in
  its transaction, and roll back on none; removing a question holds the same Edition row while it
  deletes. So a removal and an open landing together cannot leave an answering Edition with nothing
  in it, which counting first allowed (bug audit 3, L1-02).
- **Answering closes with no answers at all**: extended 3 days, once (`REMINDER_EXTENDED`), and the
  non-answerers taking part are told again. An answer is a row with words, a photograph or a
  recording in it (`ANSWERED_ENTRY_WHERE`), the same count the Keeper's early close takes. After that it publishes whatever is there. This is the
  clock's rule, at the deadline, and only the clock's: "Close and send it out" pressed with no
  answers in the Edition is refused and offered three more days instead (§8; bug audit 3, C3-01).
- **Answering closes with answers**: published, everyone told, and the Catch-up is idle. A time
  capsule goes `sealed` instead, with `sealedAt` and `publishAt` written together, everyone told the
  day it opens (`catchup_sealed`); the Catch-up is idle beside it and may start its next Edition. The
  write requires the flag, so a stale read can never publish a capsule.
- **A sealed Edition reaches `publishAt`**: published, everyone told. This one step runs even when
  the Catch-up has ended.
- **While answering**: one reminder a day to non-answerers who turned reminders on (§11), guarded by
  a days-left bucket in the high bits of `remindersSent`, so a hundred page views produce one.

### 3.4 Four ways the clock is driven

1. **Every authenticated page**: `(main)/layout.tsx` calls `advanceDueCatchups(userId)`, scoped to the
   viewer's own Catch-ups.
2. **The page itself**: the home and the reader each advance their own Edition before rendering, after
   checking membership (a non-member cannot trigger a write by opening a url).
3. **Every action on an Edition**: `loadMemberEdition` in `catchups/actions.ts` advances the Edition
   an action is about to act on, after the same membership check, so nothing acts on a status the
   clock has already passed. Until 2026-10-29 it advanced first and checked after, so any account
   holding an Edition or answer id could move a group's clock (bug audit 3, L12-03); a missing
   Edition and a closed door now get the same sentence.
4. **The nightly cron**: `GET /api/catchups/tick`, bearer `CRON_SECRET` required, calls
   `advanceDueCatchups()` unscoped. Only this path runs the batch self-heals (§13).

All four swallow their own errors and report them through `reportSwallowed`; none can break a page.

### 3.5 Idle, Start, End

- **Idle** is the state a Catch-up rests in: nothing running and not ended. `isEditionRunning` is the
  one test, used by the home, the list, the admin room, `openEdition` and the refusals, and it reads
  one field: running is `answering`, or `collecting` WITH a question deadline. So the newest Edition
  is published or sealed, or is `collecting` with no deadline -- never started (every batch's first)
  or fizzled (the clock clears it). A window that has just closed, with questions or without, still
  runs: the clock is about to move it on. The page-view sweep leaves idle rows out in SQL, so a
  Catch-up resting between Editions costs its members nothing however long it rests.
- **Start** (`startEdition`, the home's one primary action when idle): anyone in the Catch-up,
  verified, metered on the shared `catchups` bucket, refused once ended. `openEdition` (in
  `lib/catchups.ts`) refuses if one is running, reuses an idle `collecting` row in place (keeping any
  questions in it) or opens the next number, gives the questions 3 days to 07:00 IST, and tells every
  member but the starter, by name, in the same transaction. Two simultaneous presses make one Edition:
  the in-place path compare-and-swaps on the row it read, a new row has the unique `(catchupId,
  number)` under it. Its first statement holds the Catch-up's row, only while the Catch-up has not
  ended, so an End landing after Start's own check cannot leave an ended Catch-up running (A3 review
  of T2a-07). It replaced "Start the next Edition now", which sat in Settings where a 2024
  alumnus never found it (`2026-10-17-fold-2024-duplicate-into-batch.sql`).
- **The refusals.** `submitPrompt`, `openAnswering` and `extendDeadline` refuse an idle Edition
  (`refuseIfIdle`), so nothing but Start can put the clock on one with nobody told.
- **End** (`endCatchup`): status `ended`. One-way. Published Editions stay readable and still take
  hearts and comments. Nothing records when it ended, so the list and the home say "Ended" with no
  date. Refused outright on a batch Catch-up: the roster is the batch, so there is nobody to make
  that call for the rest of it. **Refused while an Edition is running** (collecting with a deadline,
  or answering): the clock stops for an ended Catch-up, so one caught mid-way stayed there for good
  and that week's answers were never read. The check (`RUNNING_EDITION_WHERE`, beside
  `isEditionRunning`) and the write are one statement, run while End holds the Catch-up's row, the
  row `openEdition` takes first, and the End row says "You can end it once this Edition is over"
  instead of opening (his Q2, 2026-10-29: refuse, rather than send out what is there
  or throw it away; bug audit 3, T2a-07). `refuseIfEnded` refuses every hand-driven write into an ended
  Catch-up's Edition, and the clock stops for it.
- **Hold and resume are gone** (2026-10-17). Between Editions there is nothing scheduled to hold, and
  inside one "give everyone longer" is the same act with a date on it. A legacy `paused` row is read
  as active everywhere; `2026-10-17-editions-start-by-hand.sql` makes the data say so.

---

## 4. Who may do what

Every action is in `src/app/(main)/catchups/actions.ts`. "Verified" means `requireVerifiedMember`:
the trust model's Stage 2, a confirmed email address AND a verified profile (this line said "a
confirmed email address" until 2026-10-29, which is Stage 1). "Ended" means refused once the
Catch-up has ended; "idle" means refused while nothing is running (§3.5).

| Action | People Catch-up | Batch Catch-up | Gates |
|---|---|---|---|
| `createCatchupWithPeople` | any alumnus | n/a | verified, rate-limited (`catchups`) |
| `joinCatchupByToken` | anyone with the link, not a teacher; refuses an ended or a full one | no link exists | verified |
| `startEdition` | **any member**, while idle | **any member**; same | verified, ended, rate-limited (`catchups`) |
| `submitPrompt` (ask) | any member, while collecting | same | verified, ended, idle, 300 chars, 40 per Edition |
| `curatePrompt` (remove, reorder) | Keeper, while collecting | **any member**, while collecting | verified, ended |
| `openAnswering` | Keeper; refuses an Edition with no questions | **any member**; same | verified, ended, idle |
| `extendDeadline` | Keeper, collecting or answering; refused if the deadline its page showed has moved | **any member**; same | verified, ended, idle |
| `closeAndPublish` | Keeper, while answering; refused, writing nothing, while nobody has answered | **any member**; same | verified, ended |
| `setEditionTimeCapsule` | Keeper, while collecting | any member, while collecting | verified, ended; nothing calls it yet |
| `submitEntry` (answer) | any member, while answering | same | verified, ended |
| `toggleEntryLove`, comments | any member, published only | same | verified; comments rate-limited |
| `renameCatchup` | Keeper | refused | verified |
| `endCatchup` | Keeper, while nothing is running | refused | verified; off on the demo |
| `setCatchupPicture` | Keeper | any member | verified; pool or own upload only |
| `addCatchupMembers` | Keeper, not ended; the roster holds 100 at most, counted in the write while the group's row is held | refused | verified; metered per person added (`catchupAdds`, 200 an hour), spent once they are in |
| `removeCatchupMember` | Keeper; not yourself, not the creator; changes the invite link | refused | verified |
| `setCatchupKeeper` | Keeper; not on yourself or the creator; never the last hat; only to somebody a Catch-up may hold | refused | verified |
| `leaveCatchup` | any member but the creator | refused | off on the demo |
| `setCatchupArchived` | any member | same (the only exit) | off on the demo |
| `setReminderPref` | any member | same | |

The cycle (bold above) opened to every batch member on 2026-09-27: choosing questions, opening
answering, extending, closing and publishing. (Nudging was one of them until it was deleted on
2026-10-17; §11.) Starting opened to everyone in any Catch-up on
2026-10-17, and pausing, resuming and the rhythm were deleted the same day. `loadKeeperScope` and
`loadKeeperEdition` take an `allowBatch` opt-in per caller for exactly the cycle; the rest do not,
and a batch refusal there still says one sentence,
`BATCH_CATCHUP_REFUSAL`, now scoped to membership and identity rather than the whole feature. Leaving
a batch says `BATCH_LEAVE_REFUSAL`, which points at archiving.

---

## 5. Leaving, removing, archiving

**Leaving** (`leaveCatchup`) is the only way out of a people Catch-up, and it happens at once: the
`GroupMember` row goes, the member's preference row goes, and their Catch-up notifications are
cleared (`clearCatchupNotifications`, matched by prefix on `/catchups/<id>` and
`/catchups/edition/<editionId>`, `#entry-` anchors included). **What they published stays** in the
Editions other people have read. If they were the last holder of Keeper powers,
`promoteGroupSuccessor` hands the hat on first, to the longest-standing member who can act: someone
a Catch-up may hold (§2.1), so never a blocked, leaving, teacher or unverified account, and a holder
who can no longer act does not count as one (bug audit 3, T2a-09, L10-01). Succession holds the
group's row before it reads (`lockGroup`), so the last two Keepers leaving or removed in the same
instant are decided one after the other rather than each seeing the other still wearing the hat
(L1-03). The account purge decides it the same way, without that lock yet. The creator cannot leave; they are told to end it or
make someone else a Keeper. A batch member cannot leave, because the nightly heal would put them
straight back.

The thirty-day "Recently deleted" bin, `setCatchupDeleted`, its nightly sweep and
`restoreOwnCatchupCopy` were all deleted in build phase 5. `CatchupReminderPref.deletedAt` is unread
and waits for its drop (§16).

**Removing** someone (`removeCatchupMember`) does the same to them, by a Keeper: membership, pref row
and notifications go (the pref row stayed until 2026-10-29, so a member re-added by link found the
Catch-up under Archived; bug audit 3, T2a-10). **It also changes the invite link**, in the same
transaction, so every copy already out stops working, the removed member's included; anyone the
Keeper still wants needs the new one (his Q16, 2026-10-29; L12-09: the link never changed and rode in
every member's page data, so a removed member could walk straight back in).

**Archiving** (`setCatchupArchived`) is personal filing: `CatchupPref.archivedAt` on your own row.
You stay a member and still get every notification (muting is the Reminders setting). An archived
Catch-up leaves your list and sits in a closed "Archived" row at its foot, with Put back inside.
Being re-added by a Keeper clears your archive stamp; being re-listed while already a member does
not.

---

## 6. The picture

Every Catch-up has a photograph, always. `Catchup.pictureSrc` is NOT NULL, with `pictureFocus` (an
`object-position`) beside it.

- **The pool** is `CATCHUP_PICTURES` in `src/lib/catchup-pictures.ts`: three photographs today. Adding
  one is a file in `public/images/catchups/` and an entry at the end of the array, no migration.
  Retiring one is a migration, because rows point at it. The first entry is the column's default,
  pinned by `catchup-pictures.test.mjs`.
- **At creation**, `pickCatchupPicture` chooses the pool photograph the new Catch-up's people already
  see least on their other Catch-ups, seeded off the group id so a retry lands on the same one.
- **Changing it** (`setCatchupPicture`): a pool path, or an image under the caller's own
  `uploads/<id>/` prefix. Nothing else passes, because every member's browser loads that url. The
  focus is pattern-matched before it reaches a style attribute. The demo allows the pool and refuses
  uploads.
- **Crops.** Every surface draws it `object-fit: cover`. The home's head is a fixed 240px height on a
  laptop and 172px on a phone, so its ratio slides from 4.63:1 to 6.33:1; the list card is 5:2 on a
  laptop and 16:9 below 500px. `handover.md` has the measured table.
- **The account purge** (`src/lib/account-purge.ts`) puts a pool picture back on any Catch-up whose
  uploaded picture belonged to the member being purged.

---

## 7. The surfaces

### 7.1 The list, `/catchups`

`(index)/page.tsx`. A shelf of cards, 1096px wide at most, two up from 1180px. **A card is the
photograph**, with the Catch-up's name (two lines at most) and one state line written on it over a
scrim. No birds, counts, Edition numbers or buttons; the whole card is the door. The state line is
`catchupStageLine`: Ended, Open for questions, "Answers close Thursday 20 August", "Out 15 August
2026", and for an idle `collecting` row No Editions yet (never started) or Nothing running (fizzled).

Order: answering first, then collecting, then published and idle, then by name.

**Spare slots**: the grid holds four things. With one Catch-up, the three latest published Editions
fill the rest; with two, two; with three, one; with four or more, none (`editionSlots`). An Edition
cover has a foot with its date on the card's own paper, its first three photographs (or its
Catch-up's picture when it has none), a 2px read mark beside the date (cinnamon unread, hairline
read), and the Catch-up's name only when you are in more than one.

**Archiving from the list**: swipe left on a phone (with an undo toast), or a control in the card's
top right on a fine pointer, visible on hover or Tab. The Archived row sits at the foot, closed.

The header carries **Start a Catch-up**, and for an admin a link to the admin room.

### 7.2 Starting one, `/catchups/new`

One form: name, people. The viewer's batch year seeds an "everyone from my batch" shortcut, and
**when the batch already has its Catch-up the shortcut is a link to it instead** ("Your batch
already has a Catch-up"), so a whole batch cannot be made into a second Catch-up from here (his
answer, 2026-10-17: "Send them to it"). Questions are not picked here, and there is no rhythm to
pick. Making it starts its first Edition. Two presses in flight together make one Catch-up: the
creation holds the creator's own row and looks for its twin (same creator, same name, ten seconds)
inside the transaction, so the second finds the first (bug audit 3, T2a-08).

### 7.3 The home, `/catchups/[catchupId]`

`[catchupId]/(home)/page.tsx`, drawn by `components/catchups/home/`.

- **The head** is the picture with the name on it, and two doors on the picture: **People** (a dialog
  on a laptop, a sheet on a phone; every row a link to that person; add, remove and make-a-Keeper on
  a person's row, for Keepers of a people Catch-up, and at its foot **Add someone** with **Copy invite
  link** beside it while the Catch-up has not ended; §7.6) and **Settings** (§8).
- **The Edition region** draws one thing per state. Collecting: the ask box (the question, a library
  button, and an eye in the box's corner that makes it anonymous), then the questions so far.
  Answering: the answering surface itself, on the page (§7.5). **Idle** (§3.5): Start, the page's
  one primary action -- under the latest Edition's cover, right-aligned, once one is out; otherwise a
  card with one serif line (No Editions yet, or Nothing running) and the pill. Start opens a
  confirmation that says how many people it tells. Ended: no region.
- **The state line** under it: "Answers close Thursday 20 August" while answering, "Ended" when
  ended, nothing otherwise (`homeStateLine`). The slot under a published cover is Start's.
- **The sidebar** holds the earlier Editions as the same cover cards the list draws. When the
  Catch-up has ended, every published Edition is there, the latest included.

A non-member gets `NotAvailableCard`. `/catchups/[catchupId]/answer` is a permanent redirect to the
home (answering moved there in phase 7).

### 7.4 The reader, `/catchups/edition/[editionId]`

`edition/[editionId]/page.tsx` and `components/catchups/edition/`. Non-members get a 404. An Edition
that is not published yet gets `NotYetPublished`, which says where it is. `/catchups/round/[id]` is a
permanent redirect here.

- **No masthead.** On a phone the app's green bar carries the Catch-up's name (`app-bar-title.tsx`),
  and under it sits **the strip**: the Edition's date at rest, the question you are in once its
  heading has scrolled under the bar. A thin cinnamon line along its top edge grows as you read.
- **The strip opens** into the list of questions in place (navigator A, the only one), with the same
  line running down its left edge and stopping at the question you are in. A docked question clamps
  to two lines; a row in the list to three.
- **A question**: a short cinnamon mark, the heading, "Asked by" and the asker when they were named.
- **An answer** is a paper tile: the member's bird at 40px and name at 17px medium, the body through
  `renderRichText`, photographs edge to edge, the heart and the replies control. No timestamps, no
  batch line. An answer with nothing in it is not drawn.
- **Photo wall questions** draw as a run (§10.2).
- The layout is chosen in CSS rather than JavaScript, so the server's one render is right at every
  width; `reader-geometry.test.mjs` pins the classes to their constants.

Opening any Edition a member may see writes a `ContentView` row (the admin analytics counter);
opening a published one also writes the read mark. Both run after the response.

### 7.5 Answering

`components/catchups/answer/`. On the home, one question at a time, with the drawn marks as buttons
to jump between questions and Back beside Next. There is no "Skip for now".

- **Three kinds**, from the question's library category (`promptKind`): `photo-wall` takes
  photographs, `songs` takes a typed song name, everything else is text. A song name is stored in
  `body`; the `song*` columns are unread.
- **Caps**: body 6,000 characters, 3 photographs per answer, on every kind.
- **Autosave on blur** through `submitEntry`, which re-checks the Edition is still answering inside
  the write's own transaction, and refuses a save whose `baseUpdatedAt` is stale, so a second device
  cannot silently replace what the first wrote.
- **Clearing every field deletes the answer**, which withdraws you from the Edition. The delete asks
  that the row is still empty (`EMPTY_ENTRY_WHERE`: no words, photograph or recording), so a save
  from a second device that refilled it in between stays, and the device that emptied it keeps its
  own version and is told the answer changed elsewhere (bug audit 3, T2b-06).
- Photographs must be the caller's own uploads (`ownedUploadUrls`).

### 7.6 The invite link, `/catchups/join/[token]`

Outside `(main)` and public in `src/proxy.ts`, because the person following it may have no account.
Signed in and not a member: an invitation with Join. Already a member: straight in. Signed out: the
same invitation with sign in and sign up, both carrying `?next=` back to the link. A stranger sees the
name, who keeps it and how many are in it; nothing anyone wrote.

**Where a Keeper gets it**: Copy invite link in the People door, beside Add someone. It copies the
join address for the host the Keeper is on and toasts "Link copied. Anyone with it can join."; where
the clipboard is refused, the address appears in a field to copy by hand. Build phase 7 had dropped
it with `people-panel.tsx`, so from 2026-09-09 to 2026-10-29 no screen showed the link that every
people Catch-up was still minted with (his Q11; bug audit 3, T3-17).

The token is a bearer token, so only a Keeper's page carries it, and not once the Catch-up has ended
(the home's view model; until 2026-10-29 every member's page did). A removal mints a new one (§5),
and the removal's toast says so. **Joining reads the link again, and counts the roster, while the
group's row is held**, the row a removal and an add take first: a join that read a link a removal
is changing waits and is then refused, and the hundred-person cap holds for a join as it does for
an add, with the same sentence (A3 review of L12-09 and T3-17).

### 7.7 Holding screens

`AlmostReady` renders on any Catch-ups route when Prisma reports a missing table (P2021), and on
nothing else. `runAction` turns the same error into a sentence for every action.

---

## 8. The settings surface

`components/catchups/settings/settings-surface.tsx`, one implementation behind the home's Settings
door, signed off by the owner 2026-09-09. Three groups, and who you are decides which rows press, not
which rows exist.

| Group | Rows | Shown to |
|---|---|---|
| **This Edition** | collecting: Open answering, Give everyone longer. answering: Give everyone longer, Close and send it out | whoever runs the cycle (§2.2), while an Edition is running; never when idle |
| **This Catch-up** | Name, Picture, for everyone; then End this Catch-up | the first two to all, pressable by whoever may change them; End to Keepers of a people Catch-up, not once ended, and while an Edition runs it is a line saying when it can be ended rather than a press |
| **You** | Reminders; Leave, or on a batch Catch-up Put it away | everyone |

Three dialog shapes only: a confirmation, a chooser that unfolds in the row, an editor. The words
"Cannot be undone" in cinnamon mark a one-way row (Open answering, Close and send it out, End,
Leave).

**Give everyone longer** unfolds three pills, and they are acts, never a setting: none is drawn
pressed, and the row's line is the deadline it moves ("Questions close" while collecting, "Answers
close" while answering), read from the page. The press sends that date back, `extendDeadline` swaps
on it, so two taps from one page add one extension and the second is told the deadline moved; a
toast says the new date. Until 2026-10-29 a picked pill stayed pressed, a second tap added the
extension again, and the line said "A week more" from local state (bug audit 3, T3-06).

**Close and send it out** with nobody's answers in the Edition has nothing to send: the press opens
"Nobody has answered yet" with "Give everyone 3 more days" (the same three days, from the deadline),
and the server refuses a press from a page that did not know, which turns into the same dialog. The
answers are counted after the close's swap, in its transaction, and only rows with something in them,
so an answer emptied as the press lands is not "somebody answered" (A3 review of C3-01). It
used to move the deadline to three days from now, often earlier, ring everyone again, and say
nothing, so a second press published an empty Edition (his Q15, 2026-10-29; C3-01). Reminders: Daily, On the last day, Never, and Never is what a member who never chose has. Start's confirmation is drawn by this file too
(`confirmCopy("start")`), but opened from the home; Rhythm, Hold and Start left the panel on
2026-10-17.

---

## 9. Hearts and comments

**Hearts** (`toggleEntryLove`) open once an Edition is published, for any member. Delete-first, then
create, so two taps cannot throw. No `revalidatePath`: the button flips itself.

**Comments** use the feed's `Comment` table: `postId` became nullable, `entryId` sits beside it, and
the CHECK `Comment_one_target` requires exactly one (`comment-target-rule.test.mjs`). The thread
(paging, stubs for deleted comments with replies, the double-submit guard, one level of replies,
serialising) is `src/lib/comment-thread.ts`, shared with the feed; each owner keeps only its gate and
its notification. `comments-section.tsx` takes its five actions as a prop.

- The gate is the heart's: a member, and a published Edition. An ended Catch-up still takes comments.
- 1,000 characters, rate-limited under `comments`.
- The replies control sits beside the heart at the feed's size.
- A comment's like rings no bell.

---

## 10. Links and the photo wall

### 10.1 Link previews

Any `http(s)` link in an answer's body becomes a card, through `LinkPreview` keyed by the normalised
url (`src/lib/link-preview-core.ts` is the pure half, `src/lib/link-preview.ts` the network half).

- **Three kinds**: a Spotify item and a YouTube video get the song card (keyless oembed); any other
  page gets a link card from its own title, site name and preview image. A page that gives no title
  stays an ordinary link, now a real `<a>`. A card whose subtitle only repeats its title shows the
  address instead.
- **When**: never inside a render. On save (`submitEntry` schedules it with `after()`), and lazily on
  read for a link with no row or with a failure more than a day old; that view prints the plain link
  and the next one has the card.
- **Images are re-hosted** into our own bucket under `link-previews/`, boxed to 480px WebP, never
  hotlinked. `link-previews/` is deliberately not in `KNOWN_ROOTS`.
- **The guard** against server-side request forgery: http(s) on ports 80 and 443, no credentials;
  every resolved address checked at connect time (any private, loopback, link-local or metadata
  answer refuses the host), literal IPs and the connected socket checked too; at most three
  redirects, each re-checked; five seconds in all; bytes counted after decompression (512 KB of page,
  64 KB of oembed, 5 MB of image); only the expected content type read. **The demo never resolves.**

### 10.2 The photo wall

A `photo-wall` question's answers are drawn as a **run** (`edition/photo-run.tsx`,
`src/lib/photo-wall.ts`): one band the width of the reading column, every photograph at its own
width and never cropped to match, bleeding off the right edge. One person's photographs sit 3px apart
under one name; groups sit 10px apart. No captions on the band (words live in the viewer) and no
count line. The cap is the ordinary three per answer. Tapping one opens the shared viewer on that
photograph. **No live Edition has ever used a photo-wall question**, so the grouping is pinned by
`photo-wall.test.mjs` rather than by a screenshot.

---

## 11. Notifications

Written by `src/lib/catchups-notify.ts` into `Notification`; `type` is a free string.

**Two bells an Edition for anybody not taking part** (owner, 2026-10-17: "Only 'a round started' and
'it's published'. No reminders unless you've turned them on yourself"). Taking part means asking a
question in that Edition, or turning this Catch-up's reminders on (`takingPartIds`). Reminders are
off unless a member turns them on (`DEFAULT_REMINDER_MODE`; the column default since
`2026-10-17-reminders-default-off.sql`). The manual nudge is deleted. `catchup-two-bells-rule.test.mjs`
pins all of it.

| Type | When | Who | Link |
|---|---|---|---|
| `catchup_questions_open` | an Edition starts: creation of a people Catch-up, or somebody pressing Start, named in the bell. Never a batch reaching ten, and never the empty-window extension | every member but whoever did it | `/catchups/<id>` |
| `catchup_answers_open` | answering opens; re-sent on the no-answers extension | the people taking part, but whoever opened it; on the extension, the non-answerers among them | `/catchups/<id>` |
| `catchup_reminder` | once a day while answering | non-answerers by preference: Daily every day, On the last day on the last day, Never (the default) not at all. Today's replaces yesterday's | `/catchups/<id>` |
| `catchup_published` | published, by the clock or a Keeper; or a time capsule opening | every member but the Keeper who closed it | `/catchups/edition/<editionId>` |
| `catchup_sealed` | a time capsule closes, saying the day it opens | every member but the Keeper who closed it | `/catchups/<id>` |
| `catchup_love` | a heart on your answer | the answer's author, if still a member; at most one unread per author per Edition | `/catchups/edition/<editionId>` |
| `catchup_comment` | a comment under your answer, or a reply to your comment | the answer's author and whoever was replied to, if still members; one unread per recipient, per writer, per answer | `/catchups/edition/<editionId>#entry-<entryId>` |
| `catchup_added` | a Keeper adds you to a Catch-up that already exists | just the people newly enrolled; never the Keeper who added them, and never someone re-listed who was already a member | `/catchups/<id>` |

A reminder is matched on its exact link when it is replaced, which is why a route rename is a data
migration as well as a file move (`2026-09-08-round-becomes-edition.sql`,
`2026-09-09-answering-moves-to-the-home.sql`). Transition notifications share the transition's
transaction, so an Edition cannot publish with nobody told.

---

## 12. The read mark

`CatchupEditionRead`, one row per member per Edition, primary key `(userId, editionId)`. Written by
`markEditionRead` after the reader has confirmed the Edition is published, never for one still
collecting or answering. `readAt` keeps the first reading. `readEditionIds` answers one page's worth
as a set, never a count. It is its own table rather than a read of `ContentView`, which is the admin
analytics counter, has no foreign key on `targetId`, and is written for unpublished Editions too.

---

## 13. The nightly tick and its self-heals

`/api/catchups/tick` (02:00 UTC, `maxDuration` 120s) runs, in order:

1. `healBatchCatchupsAndMemberships()`: **`healBatchGroupMemberships`** puts every alumnus with a
   batch year into their batch group (a signup whose best-effort join failed) and takes anyone out
   of a batch group that is not theirs (a year changed by a path that skipped `syncBatchGroup`), then
   **`healBatchCatchups`** creates the Catch-up and its first Edition for any batch group at or over
   ten that has none. Both are idempotent, scan whole tables, and never run on a page view.
2. The advance: every stale Edition in a Catch-up that has not ended, and every sealed Edition whose
   `publishAt` has come (in any Catch-up). It opens nothing: an Edition starts when somebody starts it.

---

## 14. The demo, the admin room, and a member's data

- **The demo** (`docs/spec/demo.md`) has its own database; its seed (`src/lib/demo-seed/seed.ts`)
  writes one Catch-up, though the demo database held none when checked on 2026-09-14. Every visitor is
  the same persona, so leave, archive and end are refused with a sentence, a picture upload is
  refused (the pool works), and links never resolve.
- **The admin room**, `/admin/catchups` and `/admin/catchups/[catchupId]`, is oversight, not a second
  control panel. It runs the unscoped advance before reading, lists every Catch-up and any stuck
  Edition, and keeps Edition numbers, by the owner's decision.
- **The account export** includes a member's questions, answers and comments in Catch-ups, their
  own answers in a sealed time capsule included, marked with its status and opening day (a decision
  the owner may overturn; spec §3.12).
- **The admin reading room** shows a sealed time capsule's status and opening day and never queries
  its questions or answers. A capsule past its day that has not opened shows as stuck.
- **The account purge** removes a member's answers and their photographs, sets their questions'
  `authorId` to NULL (a question belongs to everyone who answered it), and restores a pool picture
  where theirs was uploaded.
- **The rework's export**, `node scripts/dev/export-catchups.mjs --write`, copies every Catch-up with
  its photograph bytes into `scripts/dev/.exports/catchups/<date>/` (gitignored, members' private
  words). It is re-run before every Catch-ups migration.

---

## 15. Where the code and the plans disagree

Each of these was checked in the code on 2026-09-14.

- **"Give everyone longer" offered 3 days, a week and two weeks; `extendDeadline` accepted 1, 2, 4 or 7.**
  So Three days and Two weeks were refused and only A week worked. **Fixed 2026-09-14**: the server
  accepts exactly 3, 7 and 14, pinned against the surface by `extend-days-rule.test.mjs`.
- **`catchupSurfaceTitle` still appends " catch-up"** ("In the loop catch-up") on the reader's tab
  title and other surfaces. `spec.md` §6 lists the suffix as deleted (brief ¶25).
- **`spec.md` §3.12 put time capsule on `Catchup.timeCapsule`.** The owner corrected it on 2026-09-14:
  a time capsule is one Edition. Corrected there, and built as a flag and a `sealed` status on
  `CatchupEdition`.
- **`spec.md` §3.10 said a voice answer caps at 90 seconds.** The owner said two minutes; corrected there
  2026-09-14, and the code's constant is 120.
- **`spec.md` §3.5 and §9 row 11 deleted the orphaned "Batch of 2024" snapshot group** in the
  cleanup. It still exists (`cmt5ru8bb000004lausdv5vvl`, 11 members, all also in the real 2024 group):
  the owner authorised deleting the test Catch-ups, not it.
- **`catchups-notify.ts`'s header still describes excluding "anyone who has deleted their own copy"**
  and six triggers. The bin is gone and the audience is simply the group.
- **`schema.prisma`'s `@@map` comments describe the legacy `Catchup` and `CatchupPref` tables as
  present.** They are not.
- **`song-attachment.tsx`'s TODO proposes a `CatchupEntry.songs` column.** Link previews made song
  links cards in any answer, and the `song*` columns are going instead.
- **`CatchupEdition.publishAt` was in the database but not in `schema.prisma`.** Back in the schema
  since phase 14, as a time capsule's opening day. Three published rows keep old values from the
  deleted hold; nothing reads it on a published row.
- **The Catch-ups guide chapter (`components/guide/chapters/catchups.tsx`) still tells members about
  the deleted hold** ("The day is there so that publishing is an event") and says "nobody is added
  without being asked first", when a starter or a Keeper enrols people directly. Member-facing copy,
  not changed here.
- **Citations of this file by section or line number point at the July version**, which is in git
  history: `catchups-core.ts` (`catchups.md:257`, `:825`), `catchups-notify.ts` (section 5),
  `group-succession.ts` (§7), `components/guide/chapters/catchups.tsx` (sections 1 to 7), and
  `CLAUDE.md` (`catchups.md:462`, the note that `prisma db push` would drop tables it thinks are
  orphaned, which is still true).

---

## 16. Still to come

- **Phase 11, the rest**: drop `CatchupEntry.songUrl`, `songTitle`, `songArt` (0 rows carry one) and
  `CatchupReminderPref.deletedAt` (0 rows), together with `submitEntry`'s `songUrl` input,
  `resolveSpotify` and the account export's `songUrl` select. It waits for a release that is the
  owner's, because one database serves production and local dev. `CatchupEdition.publishAt` is
  never dropped.
- **Phase 12, a question you answer out loud**: audio up to two minutes, played back, with the
  browser's own transcript in the body. **Underneath is built** (2026-09-14): `CatchupEntry.audioUrl`,
  `audioSeconds`, `audioIsAuto`; the upload path `/api/upload/audio` then `/finalize`, staged under
  `staging/<id>/` and kept under `audio/<id>/`; `submitEntry`'s optional `audio`, owner-checked;
  the purge and both exports. The rules are `src/lib/voice-answer-rule.ts`. **No surface records or
  plays yet**: the drawings are `/lab/catchups/voice`, waiting for the owner's pick.
- **Phase 13, a question the group votes on**: **DELETED 2026-10-09**, the owner's word (*"no need
  to vote. let's ditch that. I don't like it particularly cause it takes up real estate in the UI and
  I don't think anyone's gonna use it"*). Every line of it is out of the code. `CatchupPromptOption`
  and `CatchupEntry.pollOptionId` are both empty and are dropped by
  `prisma/migrations-manual/2026-10-09-drop-vote-questions.sql`, which is NOT APPLIED until this removal
  deploys. Commits `5d8d52cb` and `3a4fb0e8` hold the whole thing if it is wanted back.
- **Phase 14, time capsule**: one Edition, sealed until it opens, with nothing readable before then,
  your own answer included; a batch Catch-up's Edition can be one. **Underneath is built**
  (2026-09-14): `CatchupEdition.timeCapsule`, `sealedAt`, `publishAt`, the `sealed` status and its
  CHECK; the clock (§3.3); `setEditionTimeCapsule` (§4); `catchup_sealed`; the read gate in
  `loadPublishedEditionView`; both exports. The rules are pinned by `time-capsule-rule.test.mjs`.
  **No surface marks, shows or opens one yet**: the drawings are `/lab/catchups/capsule`, waiting
  for the owner's pick.
- **The longer question library**: drafted in `docs/planning/catchups-rework/library-draft.md` for the
  owner to cut. `CATCHUP_PROMPT_SETS` is unchanged until he does.
- ~~**M1, the magazine and its PDF**~~ — **DELETED 2026-10-09**, the owner's word: *"magazine is a failed experiement. delete it."* Commit `3e92eb2d` holds the design and the engine.

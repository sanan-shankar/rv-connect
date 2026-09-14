# Catch-ups

What shipped, as of 2026-09-14: build phases 1 to 10 of the Catch-ups rework and the safe half of
phase 11. Every fact here was read off the code and the schema, not the planning documents. Where
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

A Catch-up is a newsletter a group writes to itself on a rhythm. The group asks questions for a few
days, everybody answers for a week, and the answers come out together as one **Edition** that the
whole group reads. Then the next one opens.

---

## 2. The nouns

| Word | Table | What it is |
|---|---|---|
| **Catch-up** | `CatchupSeries` (model `Catchup`) | One per `Group` (`groupId` is unique). Its rhythm, its state, its picture, who keeps it |
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
`MAX_CATCHUP_PEOPLE` = 100 people, and a rhythm. `createCatchupWithPeople` creates a private `Group`
silently as the membership container, the `Catchup` with an invite token and a picture, and Edition
1 in `collecting` with no questions. The starter is `createdById` and holds the group role `admin`.
Teachers, blocked accounts and anyone inside their deletion window are dropped from the roster.

**A batch Catch-up** belongs to a batch group (`Group.batchYear` set). `isBatchCatchup(batchYear)`
is the whole test. One exists for every batch group at or over **`BATCH_CATCHUP_FLOOR` = 10**
members; under ten there is none. On the live database that is Batch of 2023 and Batch of 2024. Its
`createdById` and `inviteToken` are NULL: nobody keeps it and there is nobody to invite, because the
membership is the batch. Everyone who signs up with that batch year is added (`joinBatchGroup` in
`src/lib/batch-catchups.ts`), and a late joiner reads every earlier Edition.

Three places make a batch Catch-up exist: `joinBatchGroup` at signup (so the tenth signup of a
batch is the moment one appears, and the batch is told questions are open), and the two nightly
self-heals (§13). The original backfill was `prisma/migrations-manual/2026-09-08-batch-catchups.sql`.

### 2.2 Keepers

`isEffectiveKeeper` is true for the creator (`createdById`), or for a member whose `GroupMember.role`
is `keeper` or `admin`. `setCatchupKeeper` only ever writes `keeper`, because `admin` is also the
group's moderation role; revoking touches only `keeper` rows. The creator is always a Keeper and
cannot be demoted or removed. A batch Catch-up has no Keeper, and the refusal is checked **before**
the Keeper question in both preambles (`loadKeeperScope`, `loadKeeperEdition`), so no data accident
can give one a Keeper.

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
```

Forward only. `preparing` and its 24-hour hold were deleted on 2026-09-08: answers closing and the
Edition coming out are one transition. `draft` is still in the type, but nothing creates one; every
path opens straight into `collecting`.

| Status | Members see | Keepers can also |
|---|---|---|
| `collecting` | the ask box and the questions so far | remove or reorder a question, open answering, give everyone longer |
| `answering` | the questions to answer, on the home | give everyone longer, nudge, close and publish now |
| `published` | the Edition, readable forever by every member, whether they wrote or not | start the next Edition now |

**Nothing in an Edition is readable before it is published**, Keeper included, and that includes
another member's answers. Only your own answers come back to you while answering. The owner closed
this on 2026-09-09 (spec §3.13, reading (a)). The heavy read, `loadPublishedEditionView`, is only
called after a fresh `published` status has been confirmed.

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
- **The next Edition opens** at `nextOpensAt = publishedAt + gap`: 14 days (`biweekly`), one calendar
  month (`monthly`, the default), or three (`quarterly`). Months clamp to the end of a short month.
  It only opens once the latest Edition is published.

### 3.3 What the clock does on its own

`planNextAction` is the whole decision, pure and unit-tested; `advanceEdition` applies one step per
transaction with a compare-and-swap on status (or on `remindersSent`), so a second visitor does
nothing twice.

- **Collecting closes with no questions**: the question window is extended 3 days, once
  (`REMINDER_QUESTIONS_EXTENDED`), and the group is told again. If it closes empty a second time the
  Edition goes **dormant** and stays in `collecting`; the first question anyone submits revives it
  with a fresh 3-day window.
- **Collecting closes with questions**: answering opens, everyone is told.
- **Answering closes with no answers at all**: extended 3 days, once (`REMINDER_EXTENDED`), and the
  non-answerers are told again. After that it publishes whatever is there.
- **Answering closes with answers**: published, everyone told, `nextOpensAt` stamped.
- **While answering**: one reminder a day to non-answerers (§11), guarded by a days-left bucket in the
  high bits of `remindersSent`, so a hundred page views produce one.

### 3.4 Three ways the clock is driven

1. **Every authenticated page**: `(main)/layout.tsx` calls `advanceDueCatchups(userId)`, scoped to the
   viewer's own Catch-ups.
2. **The page itself**: the home and the reader each advance their own Edition before rendering, after
   checking membership (a non-member cannot trigger a write by opening a url).
3. **The nightly cron**: `GET /api/catchups/tick`, bearer `CRON_SECRET` required, calls
   `advanceDueCatchups()` unscoped. Only this path runs the batch self-heals (§13).

All three swallow their own errors and report them through `reportSwallowed`; none can break a page.

### 3.5 Hold, resume, end

- **Hold** (`pauseCatchup`, the settings row "Hold the next Edition"): status `paused`, `pausedAt`
  stamped. The clock stops (`advanceEdition` returns early), and every hand-driven write into the
  Edition is refused by `refuseIfFrozen`.
- **Resume** ("Start it again"): every deadline still ahead of `pausedAt` moves forward by exactly the
  time the hold lasted, **not** snapped to 07:00, so two days left stays two days left. If the latest
  Edition was already published, `nextOpensAt` is re-armed or shifted the same way.
- **End** (`endCatchup`): status `ended`, `nextOpensAt` and `pausedAt` cleared. One-way. Published
  Editions stay readable and still take hearts and comments. Nothing records when it ended, so the
  list and the home say "Ended" with no date.
- **Changing the rhythm** re-computes a booked `nextOpensAt` from the last publish date under the new
  gap (or now, if that has passed).

---

## 4. Who may do what

Every action is in `src/app/(main)/catchups/actions.ts`. "Verified" means `requireVerifiedMember`
(a confirmed email address). "Frozen" means refused while the Catch-up is paused or ended.

| Action | People Catch-up | Batch Catch-up | Gates |
|---|---|---|---|
| `createCatchupWithPeople` | any alumnus | n/a | verified, rate-limited (`catchups`) |
| `joinCatchupByToken` | anyone with the link, not a teacher; refuses an ended one | no link exists | verified |
| `submitPrompt` (ask) | any member, while collecting | same | verified, frozen, 300 chars, 40 per Edition |
| `curatePrompt` (remove, reorder) | Keeper, while collecting | refused | |
| `openAnswering` | Keeper; refuses an Edition with no questions | refused | frozen |
| `extendDeadline` | Keeper, collecting or answering | refused | frozen |
| `nudgeGroup` | Keeper, while answering | refused | frozen, rate-limited, off on the demo |
| `closeAndPublish` | Keeper, while answering (zero answers extends instead) | refused | frozen |
| `startNextEditionNow` | Keeper, when the latest is published and the Catch-up active | refused | verified |
| `submitEntry` (answer) | any member, while answering | same | verified, frozen |
| `toggleEntryLove`, comments | any member, published only | same | verified; comments rate-limited |
| `renameCatchup`, `updateCatchupCadence` | Keeper | refused | |
| `pauseCatchup`, `resumeCatchup`, `endCatchup` | Keeper | refused | end is off on the demo |
| `setCatchupPicture` | Keeper | **any member** | pool or own upload only |
| `addCatchupMembers` | Keeper, not ended, up to 100 at a time | refused | verified |
| `removeCatchupMember` | Keeper; not yourself, not the creator | refused | |
| `setCatchupKeeper` | Keeper; not on the creator | refused | |
| `leaveCatchup` | any member but the creator | refused | off on the demo |
| `setCatchupArchived` | any member | same (the only exit) | off on the demo |
| `setReminderPref` | any member | same | |

A batch refusal says one sentence, `BATCH_CATCHUP_REFUSAL`; leaving a batch says
`BATCH_LEAVE_REFUSAL`, which points at archiving.

---

## 5. Leaving, removing, archiving

**Leaving** (`leaveCatchup`) is the only way out of a people Catch-up, and it happens at once: the
`GroupMember` row goes, the member's preference row goes, and their Catch-up notifications are
cleared (`clearCatchupNotifications`, matched by prefix on `/catchups/<id>` and
`/catchups/edition/<editionId>`, `#entry-` anchors included). **What they published stays** in the
Editions other people have read. If they were the last holder of Keeper powers,
`promoteGroupSuccessor` hands the hat on first. The creator cannot leave; they are told to end it or
make someone else a Keeper. A batch member cannot leave, because the nightly heal would put them
straight back.

The thirty-day "Recently deleted" bin, `setCatchupDeleted`, its nightly sweep and
`restoreOwnCatchupCopy` were all deleted in build phase 5. `CatchupReminderPref.deletedAt` is unread
and waits for its drop (§16).

**Removing** someone (`removeCatchupMember`) does the same to them, by a Keeper.

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
`catchupStageLine`: Paused, Ended, Open for questions, "Answers close Thursday 20 August", "Out 15
August 2026".

Order: answering first, then collecting, then published, then by name.

**Spare slots**: the grid holds four things. With one Catch-up, the three latest published Editions
fill the rest; with two, two; with three, one; with four or more, none (`editionSlots`). An Edition
cover has a foot with its date on the card's own paper, its first three photographs (or its
Catch-up's picture when it has none), a 2px read mark beside the date (cinnamon unread, hairline
read), and the Catch-up's name only when you are in more than one.

**Archiving from the list**: swipe left on a phone (with an undo toast), or a control in the card's
top right on a fine pointer, visible on hover or Tab. The Archived row sits at the foot, closed.

The header carries **Start a Catch-up**, and for an admin a link to the admin room.

### 7.2 Starting one, `/catchups/new`

One form: name, people, rhythm. The viewer's batch year seeds a suggested name and an "everyone
from my batch" shortcut. Questions are not picked here.

### 7.3 The home, `/catchups/[catchupId]`

`[catchupId]/(home)/page.tsx`, drawn by `components/catchups/home/`.

- **The head** is the picture with the name on it, and two doors on the picture: **People** (a dialog
  on a laptop, a sheet on a phone; every row a link to that person; add, remove and make-a-Keeper on
  a person's row, for Keepers of a people Catch-up) and **Settings** (§8).
- **The Edition region** draws one thing per state. Collecting: the ask box (the question, a library
  button, and an eye in the box's corner that makes it anonymous), then the questions so far.
  Answering: the answering surface itself, on the page (§7.5). Published: the latest Edition's cover.
  Paused: an on-hold card. Ended: no region.
- **The state line** under it: "Answers close Thursday 20 August" while answering, "The next one
  opens 15 September 2026" once published, "Ended" when ended, nothing otherwise (`homeStateLine`).
- **The sidebar** holds the earlier Editions as the same cover cards the list draws. When the
  Catch-up is paused or ended, every published Edition is there, the latest included.

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
- **Clearing every field deletes the answer**, which withdraws you from the Edition.
- Photographs must be the caller's own uploads (`ownedUploadUrls`).

### 7.6 The invite link, `/catchups/join/[token]`

Outside `(main)` and public in `src/proxy.ts`, because the person following it may have no account.
Signed in and not a member: an invitation with Join. Already a member: straight in. Signed out: the
same invitation with sign in and sign up, both carrying `?next=` back to the link. A stranger sees the
name, who keeps it and how many are in it; nothing anyone wrote.

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
| **This Edition** | collecting: Open answering, Give everyone longer. answering: Give everyone longer, Nudge everyone, Close and send it out. published: Start the next Edition now | Keepers of an active people Catch-up only |
| **This Catch-up** | Name, Picture, Rhythm, for everyone; then Hold the next Edition (or Start it again) and End this Catch-up | the first three to all, pressable by whoever may change them; the last two to Keepers, not once ended |
| **You** | Reminders; Leave, or on a batch Catch-up Put it away | everyone |

Three dialog shapes only: a confirmation, a chooser that unfolds in the row, an editor. The words
"Cannot be undone" in cinnamon mark a one-way row (Open answering, Nudge, Close and send it out, Start
the next Edition now, End, Leave). Rhythm offers the three cadences the column holds: every two
weeks, every month, every three months. Reminders: Daily, On the last day, Never.

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

| Type | When | Who | Link |
|---|---|---|---|
| `catchup_questions_open` | an Edition opens (creation, the clock, a Keeper, a batch reaching ten), or an empty question window is extended | every member but whoever did it | `/catchups/<id>` |
| `catchup_answers_open` | answering opens; re-sent on the no-answers extension | every member but the Keeper who opened it; on the extension, non-answerers only | `/catchups/<id>` |
| `catchup_reminder` | once a day while answering; or a Keeper's nudge | non-answerers by preference: Daily every day, On the last day on the last day, Never not at all. A nudge ignores Never. Today's replaces yesterday's | `/catchups/<id>` |
| `catchup_published` | published, by the clock or a Keeper | every member but the Keeper who closed it | `/catchups/edition/<editionId>` |
| `catchup_love` | a heart on your answer | the answer's author, if still a member; at most one unread per author per Edition | `/catchups/edition/<editionId>` |
| `catchup_comment` | a comment under your answer, or a reply to your comment | the answer's author and whoever was replied to, if still members; one unread per recipient, per writer, per answer | `/catchups/edition/<editionId>#entry-<entryId>` |

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
   batch year into their batch group (a signup whose best-effort join failed), then
   **`healBatchCatchups`** creates the Catch-up and its first Edition for any batch group at or over
   ten that has none. Both are idempotent, scan whole tables, and never run on a page view.
2. The advance: every stale Edition in an active Catch-up, then every Catch-up whose `nextOpensAt`
   has passed.

---

## 14. The demo, the admin room, and a member's data

- **The demo** (`docs/spec/demo.md`) has its own database; its seed (`src/lib/demo-seed/seed.ts`)
  writes one Catch-up, though the demo database held none when checked on 2026-09-14. Every visitor is
  the same persona, so leave, archive, end and nudge are refused with a sentence, a picture upload is
  refused (the pool works), and links never resolve.
- **The admin room**, `/admin/catchups` and `/admin/catchups/[catchupId]`, is oversight, not a second
  control panel. It runs the unscoped advance before reading, lists every Catch-up and any stuck
  Edition, and keeps Edition numbers, by the owner's decision.
- **The account export** includes a member's questions, answers and comments in Catch-ups.
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
- **Rhythm has three cadences**; the drawn settings room offered four. Adding the other two is a
  column value, and it is the owner's call.
- **`spec.md` §3.12 puts time capsule on `Catchup.timeCapsule`.** The owner corrected it on 2026-09-14:
  a time capsule is one Edition, so it becomes a flag on `CatchupEdition`. Nothing is built.
- **`spec.md` §3.10 says a voice answer caps at 90 seconds.** The owner said two minutes.
- **`spec.md` §3.5 and §9 row 11 deleted the orphaned "Batch of 2024" snapshot group** in the
  cleanup. It still exists (`cmt5ru8bb000004lausdv5vvl`, 11 members, all also in the real 2024 group):
  the owner authorised deleting the test Catch-ups, not it.
- **`catchups-notify.ts`'s header still describes excluding "anyone who has deleted their own copy"**
  and six triggers. The bin is gone and the audience is simply the group.
- **`schema.prisma`'s `@@map` comments describe the legacy `Catchup` and `CatchupPref` tables as
  present.** They are not.
- **`song-attachment.tsx`'s TODO proposes a `CatchupEntry.songs` column.** Link previews made song
  links cards in any answer, and the `song*` columns are going instead.
- **`CatchupEdition.publishAt` is in the database but not in `schema.prisma`.** It stays: a time
  capsule is a scheduled publish date.
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
  browser's own transcript in the body.
- **Phase 13, a question the group votes on**: fixed choices, the result drawn as who chose what.
- **Phase 14, time capsule**: one Edition, sealed until it opens, with nothing readable before then,
  your own answer included; a batch Catch-up's Edition can be one.
- **The longer question library**: drafted in `docs/planning/catchups-rework/library-draft.md` for the
  owner to cut. `CATCHUP_PROMPT_SETS` is unchanged until he does.
- **M1, the magazine and its PDF**, last.

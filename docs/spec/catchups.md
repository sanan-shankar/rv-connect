# Catch-ups

The recurring group newsletter for Rishi Valley. Modelled on Letterloop (see
`docs/planning/letterloop-research.md`) and tuned for a small, invite-only community where everyone
already has an account, a profile, and a bird avatar. This spec supersedes the earlier build, which
was reverted in full. Builders follow this literally. No em dashes anywhere. User-facing copy says
"Rishi Valley", never "Alumni". The feature is **Catch-ups**; a single edition is a **Round**
(Round 1, Round 2, ...). "Roundup" is dead everywhere.

---

## 1. Concept in two sentences (the newcomer explainer)

Use this almost verbatim in the UI, wherever a first-timer meets the feature:

> A Catch-up is a gentle group newsletter on a rhythm. Everyone in the group answers the same few
> questions during an open window, and once it closes their replies are gathered into one warm issue
> the whole group reads together.

A shorter one-liner for tight spaces (cards, tooltips):

> Everyone answers a few questions. Their replies become one issue the whole group reads.

There will be a proper tutorial later, so nothing here should get wordy. One explainer band on the
index and one line on the create flow is the whole budget.

---

## 2. Objects and lifecycle

### 2.1 The objects

- **Catchup** (one per Group). The standing newsletter for a group: its cadence, its status
  (active / paused / ended), and who tends it (the Keeper). `groupId` is unique, so a group has at
  most one Catch-up.
- **Round** (`CatchupEdition`). One cycle. Carries the window timestamps, its lifecycle status, and
  a monotonic `number` within its Catchup.
- **Prompt** (`CatchupPrompt`). A question inside a Round. Submitted from the library, by a member,
  or by the Keeper. Carries the submitter (always stored) and a `showAsker` flag (named vs
  anonymous) and an `accepted` flag (curated into the Round).
- **Entry** (`CatchupEntry`). One member's answer to one prompt. Text, photos, and one Spotify
  track. Always attributed to its author with their bird avatar. Answers are never anonymous.
- **Entry love** (`CatchupEntryLove`). A heart on a single answer. Reuses the shared `LoveButton`.
- **Pref** (`CatchupPref`). A member's reminder setting for one Catchup (all / last only / off).

### 2.2 The Round state machine

`CatchupEdition.status` moves forward only, one direction:

```
draft -> collecting -> answering -> preparing -> published
```

| Status | Meaning | Member sees | Keeper sees |
|---|---|---|---|
| `draft` | created but not opened (used only if the Keeper stages a Round early; the normal create flow opens straight into `collecting`) | nothing yet | edit + "Open now" |
| `collecting` | question window is open | "add a question everyone will answer" | curate list, "Open answering now" |
| `answering` | questions frozen, everyone answers | "answer these questions" | live progress, "Close and prepare now" |
| `preparing` | window closed, the issue is being put together | "putting your Catch-up together" | same, plus "Publish now" |
| `published` | the Round is live and readable forever | the newsletter | the newsletter + archive |

### 2.3 Timing rules (defaults, all overridable by the Keeper before the window opens)

- Question window: **3 days** (`questionsCloseAt = collectingOpenedAt + 3d`).
- Answer window: **7 days** (`answersCloseAt = answeringOpenedAt + 7d`).
- Preparing hold: **24 hours** (`publishAt = answersCloseAt + 24h`). This is the ritual beat; see 2.5.
- Next round opens (recurring only): `nextOpensAt = publishedAt + cadenceGap`, where cadenceGap is
  14 days (biweekly), ~1 calendar month (monthly, the default), or ~3 calendar months (quarterly).

### 2.4 Advancing states without a cron (lazy, read-time advance)

Vercel hobby has no background jobs, so **no transition depends on a scheduler.** The correct state
is a pure function of the Round's timestamps and the clock; visits make it real.

- `computeStatus(edition, now)` is a **pure function** returning the status the Round *should* be in
  given its timestamps. It never writes.
- `advanceEdition(edition)` compares `computeStatus` to the stored `status`, and if they differ,
  persists the new status **and fires that transition's one-time side effects** (notifications, set
  `nextOpensAt`, seed the next Round). Side effects are guarded so they run exactly once per
  transition: the `status` column itself guards the big transitions, and the `remindersSent` bitmask
  guards the mid-window nudges (bit 1 = two-days-left, bit 2 = last-day, bit 4 = auto-extended once).
  Everything runs inside one Prisma transaction so a double visit cannot double-fire.
- `advanceDueCatchups(userId)` finds every Round in the viewer's groups whose stored status is stale
  (or whose `nextOpensAt` has passed) and advances each. It is called **opportunistically on any
  member visit**: on load of the Catch-ups index, on load of any Catch-up home, and, crucially,
  piggy-backed on the **app-shell notification-count query** that already runs on essentially every
  authenticated page view. In an active community that fires transitions within minutes of their due
  time, with no cron. Transitions are therefore eventually-consistent, bounded by "next time any
  member touches the app". This is acceptable and documented.
- A future `/api/catchups/tick` (guarded by `CRON_SECRET`) may call the same `advanceDueCatchups()`
  with no viewer scope for belt-and-braces timeliness. **Not required for MVP.** Build the helper so
  the endpoint is a thin wrapper if it is ever added.

### 2.5 Making "preparing" feel like a ritual

When `answersCloseAt` passes, the Round enters `preparing` and stays there until `publishAt`
(24h later). During this window **no answers are readable by anyone**, Keeper included. The home and
any deep link show a warm holding scene: the `skeleton-warm` shimmer under a settled hoopoe and copy
like "Putting your Catch-up together." (Keeper reuse of the mascot rig, motion always on.) The
payoff is that publication is a genuine reveal a full day later, and the `catchup_published`
notification lands as a moment ("Your Catch-up is ready to read") rather than a silent state flip.
The Keeper may shortcut the hold with "Publish now".

### 2.6 The too-few-answers rule

Evaluated at the `answering -> preparing` boundary:

- If **zero** members submitted any Entry, auto-extend the answer window **once** by 3 days, set the
  extended bit (4), and re-fire `catchup_answers_open` to non-answerers. A first Round should never
  publish empty.
- If **one or more** members answered, proceed to `preparing` normally. A sparse Round is allowed;
  the masthead copy softens automatically for a thin Round (see 3.6).
- After a Round has already been extended once, it always proceeds regardless of count.

---

## 3. Screens and flows

Global layout rule from the owner: **never a single centered column with big empty margins.** Every
screen below specifies a richer shape. On mobile everything collapses to a single sticky-header
stack, which is the one place a single column is correct.

Routes:

- `/catchups`, the hub / index
- `/catchups/new?group=<groupId>`, the create flow (group preselected)
- `/catchups/[catchupId]`, the Catch-up home (live cycle + Keeper controls + archive)
- `/catchups/[catchupId]/answer`, the answering experience
- `/catchups/round/[editionId]`, a published Round (the reader)
- Group integration: a Catch-up card on `/groups/[id]`
- Nav: `/catchups` is already in the sidebar (`MessagesSquare` icon)

Every route ships a `loading.tsx` using `skeleton-warm` (never a grey pulse).

### 3.1 The index (`/catchups`)

**Layout shape:** a full-width **explainer band** across the top (the two-sentence concept plus a
single "How it works" three-beat strip: Ask -> Answer -> Read), then an **asymmetric two-column
body**: a wider left column of "Your Catch-ups" cards (one per group the viewer belongs to), and a
right rail "Fresh off the press" reading list of the most recently published Rounds across the
viewer's groups. Not a centered stack.

- Each "Your Catch-ups" card shows: group name, bird-avatar cluster of members, current status
  ("Questions open, 2 days left" / "Answering now" / "Preparing" / "Round 4 published"), and the
  right primary CTA for that state (Add a question / Answer now / Read the Round).
- For a group the viewer is in that has **no Catch-up yet**: the card shows "No Catch-up here yet"
  with a "Start one" CTA -> `/catchups/new?group=<groupId>` (only if the viewer is a group member;
  any member may start it).

**Empty / edge states:**

- Viewer is in **no groups**: the whole body is the group-first guidance. One card: "A Catch-up
  lives inside a group. Create or join a group first, then start a Catch-up from it." Primary CTA
  "Find a group" -> `/groups`; secondary "Create a group" -> `/groups/new`. Do not offer a
  standalone Catch-up anywhere.
- Viewer is in groups but **none has a Catch-up**: show the group cards each with "Start one", and
  keep the explainer band prominent.

### 3.2 The create flow (`/catchups/new`)

Always reached with a group in mind. **A Catch-up can only be created from a group.**

- **No `group` param and viewer has groups:** step 0 is a group picker (only groups where the viewer
  is a member and no Catch-up exists yet).
- **No `group` param and viewer has no groups:** short-circuit to the group-first guidance (same copy
  as 3.1) with the create CTA pointing at `/groups/new`. After they make a group, the group page's
  Catch-up card brings them back here with the group preselected.

**Layout shape:** a two-column setup sheet. Left = the form steps; right = a live preview card of the
first Round (group name, chosen cadence, the seeded starter questions) so the setup never feels like
an empty form in a void.

Steps (one screen, progressive, not a wizard slog):

1. **Confirm the group** (shown as a read-only chip once chosen).
2. **Choose the rhythm.** Canopy pill segmented control: Biweekly / **Monthly** (default) /
   Quarterly. One line under it: "You can change this anytime." (Research: monthly fits alumni;
   weekly kills these loops, so it is not offered.)
3. **Seed the first questions.** Auto-suggest **2** questions from the library (one warm valley-days
   prompt, one right-now prompt), each removable, with "Add from the library" and "Write your own".
   Copy makes clear members will also add their own during the question window.
4. **Start it.** Primary canopy pill "Start the first Round". On submit: create the `Catchup`, create
   Round 1 in `collecting`, attach the seeded prompts as `accepted`, and fire
   `catchup_questions_open` to all group members. Redirect to `/catchups/[catchupId]`.

The creator becomes the **Keeper** of this Catch-up.

### 3.3 The Catch-up home (`/catchups/[catchupId]`)

The command surface for the live cycle plus the archive.

**Layout shape:** asymmetric two-column. **Left (wide) = the live cycle console**; **right rail =
Keeper controls + settings (Keeper only) and the archive of past Rounds (everyone).** Not centered.

The left console changes with the Round status:

- **collecting:** a warm "status console" card at top (Round number, a soft progress ring counting
  down `questionsCloseAt`, member avatar strip). Below it, the **question-submission** panel (3.3.1)
  and the growing list of submitted questions.
- **answering:** the console shows "Answering now, N of M have shared" with a progress ring on
  `answersCloseAt`. Primary CTA is a big canopy pill "Answer now" -> `/answer`. Below, a read-only
  list of the frozen questions and a live "who has answered" avatar strip (avatars fill in as people
  finish; no answer content shown yet).
- **preparing:** the ritual holding scene (2.5).
- **published:** the console becomes a "Round N is out" banner with a "Read the Round" CTA ->
  `/catchups/round/[editionId]`.

**Keeper controls (right rail, Keeper or group admin only):**

- Curate questions (accept / remove / reorder submitted prompts; add from library) during
  `collecting`.
- "Open answering now" (collecting -> answering), "Close and prepare now" (answering -> preparing),
  "Publish now" (preparing -> published).
- "Nudge the group" (fires a manual `catchup_reminder` to non-answerers, bypassing per-member off).
- Settings: change cadence, Pause / Resume, End.

**Empty / edge states:** no questions yet in `collecting` -> the submission panel is the hero with a
"Be the first to ask something" prompt and the library shortcut. Paused Catchup -> a calm banner
"This Catch-up is paused" and, for the Keeper, "Resume". Ended -> archive only.

#### 3.3.1 Question submission (named / anonymous)

A single warm input card: a text field ("Ask everyone something..."), a "from the library" shortcut
that opens the prompt sets (section 4), and a **named / anonymous toggle** rendered as a small pill
pair: "Ask as [Your name]" / "Ask anonymously". This sets `showAsker`. The author is always stored;
`showAsker=false` only hides the asker in the UI. Cap ~3 open submissions per member per Round and
~12 accepted prompts per Round (soft caps, surfaced as gentle helper text, enforced in the action).

Submitted-but-not-yet-accepted questions show to their author as "waiting for the Keeper"; the Keeper
sees all and accepts the ones that go in. Auto-accept the creator's seeded and the Keeper's own
additions.

### 3.4 The answering experience (`/catchups/[catchupId]/answer`)

The owner's headline requirement: **beautiful and intimate**, "you want to read and participate and
it just makes you feel happy", 100% on-theme. This is the most important screen to get right after
the reader.

**Layout shape (desktop):** a **two-pane** view, not a lone column. A **sticky left progress rail**
lists every prompt as a row with a check state and a small progress ring at top ("4 of 7 shared").
The **main pane** shows **one prompt at a time** as a large, calm, ruled-sheet answer card, with a
quiet filmstrip of upcoming prompts beneath it. Advancing a prompt slides the next one in
(transform/opacity only, `EASE_SPRING`). **Mobile:** the rail becomes a slim sticky progress bar at
the top; prompts stack one per screen with "Next" / "Back".

Each answer card contains, in this order:

- The prompt text as an editorial heading, and, if `showAsker`, a soft "asked by {name}" line with
  the asker's bird avatar.
- A generous text area (autosaving on blur; every question is **optional**).
- **Add a photo** (reuses `POST /api/upload`, up to 3, WebP via Sharp, stored as a JSON array on the
  Entry). Thumbnails show inline as small framed plates.
- **Add a song** (Spotify). A single URL field ("paste a Spotify link"); on submit the server
  resolves it (section 3.4.1) and the card shows the resolved album-art card inline.
- Autosave indicator ("Saved") and a per-card "Skip for now".

**Intimacy details (all on-theme, none cringe):** warm Paper surface, ruled-sheet lines behind the
text area, a gentle "you have shared with N others so far" line, the member's own bird perched in the
corner of the card, and a soft completion moment when the last prompt is answered ("That is you in
this Round. See you when it is out."). No streaks, no gamified badges, no "favourite tree".

**Edge states:** entering `/answer` when the Round is not in `answering` redirects to the home with a
toast. A non-member (or non-group) hitting the URL gets the group's normal not-available surface.
Editing is allowed for the whole `answering` window; entries lock at close.

#### 3.4.1 Song of the moment (keyless Spotify)

`GET https://open.spotify.com/oembed?url=<track|album|playlist url>` returns JSON with `title` and
`thumbnail_url` (300x300 album art) and no API key. Resolve **server-side inside `submitEntry`**:

1. Validate the host is exactly `open.spotify.com` (accept `/track`, `/album`, `/playlist`); reject
   anything else with a friendly error.
2. Fetch the oembed with a 3s timeout. On success store `songUrl` (normalized), `songTitle`
   (`title`), `songArt` (`thumbnail_url`). On timeout or failure, store `songUrl` + a fallback
   `songTitle` of the URL and leave `songArt` null (fail soft, never block the answer).

Render the album art with a plain `<img>` (the app already uses `<img>`; no `next.config` change) as
an **album-art card**: cover thumbnail, track/album title, and a "Open in Spotify" affordance linking
out. **Do not** embed the oembed iframe (CSP and theme reasons); the card is on-theme and lighter.

### 3.5 The preparing state

Covered in 2.5. It is a state of the home (3.3) and of any deep link to the Round while
`status = preparing`, not a separate route. Holding scene + shimmer + settled hoopoe + "Putting your
Catch-up together." Keeper sees an extra "Publish now".

### 3.6 The published Round (`/catchups/round/[editionId]`): the crown jewel

A communal newsletter organized **by question**, styled like the Letter reading view but warmer and
plural. This is where the money is; it must feel like a keepsake.

**Layout shape:** a **magazine layout**, explicitly not a centered column.

- **Masthead (full-bleed band):** "Round N", the group name, the publish date, and a **who-answered
  avatar strip** (bird avatars of everyone who contributed, "12 of the group wrote in"). For a thin
  Round the count copy softens ("A quiet Round. {name} and {name} wrote in.").
- **Body:** one **section per question**. The question is an editorial section header (Libre
  Baskerville, tight tracking), offset toward the outer margin rather than dead-center. Under it, the
  answers are a **staggered stack of answer cards** with gentle alternating alignment / varied widths
  (a ruled-sheet card kit), so the page has rhythm rather than a monotonous column. If a question
  shows its asker, the header carries a small "asked by {name}".
- **Right-hand floating table of contents (desktop):** a sticky question nav (jump to each question);
  collapses into a top "jump to" chip row on mobile.
- **Each answer card:** the author's **bird avatar** + name + batch line (reuse `IdentityRow`), the
  answer text, inline framed photos, the Spotify album-art card, and the shared **`LoveButton`** (the
  one red heart `#E03A33`) with a live count. Hearts are per-answer.
- A quiet footer: "Next Round opens {date}" for recurring cadences, plus a "back to {group}
  Catch-ups" link.

**Reactions:** hearts on individual answers via the shared `LoveButton` and `toggleEntryLove`. No
emoji picker in v1 (the one red heart is the app's reaction language).

**Comments:** the card **leaves room** for a future comment affordance (a quiet "reply" slot in the
card footer) but comments are **not built in v1** (see scope fences). Design the card so adding them
later is a drop-in, not a redesign.

**Empty / edge states:** a question that nobody answered still gets its section, with a soft "No one
took this one" line rather than being hidden (mirrors the "everyone is still here" ethos). A member
who answered nothing still appears in the who-answered strip as "read but did not write" only if they
visited; otherwise they are simply absent (do not shame non-answerers).

### 3.7 The archive

Every published Round is browsable forever, inside the Catch-up home right rail and as a dedicated
section. **Layout shape:** a "vellum spines on a shelf" list, one row per Round (Round number, date,
a one-line teaser pulled from the most-loved answer, contributor count), warm Paper cards, opening to
`/catchups/round/[editionId]`. Not a grid of identical squares. The archive is a top-cited reason
people stay, so it is first-class, not a dropdown.

---

## 4. Built-in question library

Ships as data in `src/lib/catchups.ts` as `CATCHUP_PROMPT_SETS`: an array of 5 sets, each
`{ id, label, prompts: string[] }`. Categories used on `CatchupPrompt.category`: `valley-days`,
`right-now`, `most-likely-to`, `on-the-horizon`, `small-things`. Auto-suggest on Round 1 picks one
`valley-days` and one `right-now`. All prompts are warm, specific, alumni-school register, and free
of AI-tell phrasing. None are cringe.

**Valley days** (`valley-days`)
1. Which corner of campus could you find your way to with your eyes closed?
2. Who was the teacher whose class you never wanted to miss, and why?
3. What is a sound from the Valley you can still hear if you shut your eyes?
4. Tell us about a rule you were happy to break.
5. What did you always order, trade for, or sneak from the dining hall?
6. Which friendship from those years surprised you by lasting?

**Right now** (`right-now`)
7. Where in the world are you reading this from?
8. What does an ordinary Tuesday look like for you these days?
9. What have you been making, fixing, or growing lately?
10. Who or what has been keeping you company this season?
11. What is something you have changed your mind about recently?
12. What is a small win from the last few weeks worth mentioning?

**Most likely to** (`most-likely-to`)
13. Who from our years ended up exactly where you always pictured them?
14. Who could always be counted on to have a book you had never heard of?
15. Who would you call first if you were stuck somewhere at two in the morning?
16. Who seems to be ageing in reverse, going by the group photos?
17. Who gave the best advice back then, whether or not you took it?
18. Who should have been running the whole place all along?

**On the horizon** (`on-the-horizon`)
19. What are you quietly working toward this year?
20. Where do you hope to be standing this time next year?
21. What is a trip you keep meaning to take?
22. What is something you want to learn before you run out of excuses?
23. If the group met up somewhere next year, where should it be?
24. What would make this next chapter a good one for you?

**Small things** (`small-things`)
25. What is on repeat for you right now? Drop the song.
26. Share a photo from your week, no explanation needed.
27. What is the best thing you have eaten lately?
28. What are you reading, watching, or listening to that the rest of us should too?
29. What is a small ritual that quietly makes your day better?
30. Send a photo of the view from wherever you are sitting.

---

## 5. Notifications

Reuse the existing `Notification` model. `type` is a free string, so **no migration** is needed for
new types. Every send respects `CatchupPref.reminderMode` per the rules below, except a manual Keeper
nudge which bypasses `off`. All copy below is placeholder; **the owner will rewrite copy later.**

| Trigger | `type` | Recipients | `link` | Message template [copy: owner to rewrite] |
|---|---|---|---|---|
| Round enters `collecting` | `catchup_questions_open` | all group members | `/catchups/[catchupId]` | "{group} is starting a Catch-up. Add a question you want everyone to answer." |
| Round enters `answering` | `catchup_answers_open` | all group members | `/catchups/[catchupId]/answer` | "Answers are open for {group}'s Catch-up. Share yours." |
| 2 days before `answersCloseAt` | `catchup_reminder` | members with no Entry, `reminderMode = all` | `/catchups/[catchupId]/answer` | "Two days left to answer {group}'s Catch-up." |
| Last day before `answersCloseAt` | `catchup_reminder` | members with no Entry, `reminderMode` in (all, last) | `/catchups/[catchupId]/answer` | "Last day to answer {group}'s Catch-up." |
| Keeper "Nudge the group" | `catchup_reminder` | members with no Entry (bypasses `off`) | `/catchups/[catchupId]/answer` | "{keeper} is waiting on you for {group}'s Catch-up." |
| Round enters `published` | `catchup_published` | all group members | `/catchups/round/[editionId]` | "Your {group} Catch-up is ready to read." |
| Someone hearts your answer (optional, see below) | `catchup_love` | the answer's author | `/catchups/round/[editionId]` | "{name} loved your answer in {group}'s Catch-up." |

Rules:

- The two dated reminders go **only to members who have submitted no Entry**, and are guarded by the
  `remindersSent` bitmask (bit 1, bit 2) so the lazy advance cannot re-send them.
- `catchup_love` is an **optional** post-publish stickiness nudge; if built, coalesce it (at most one
  per author per Round per liker session) so it cannot spam. Ship the core five first.
- The notification bell needs a small type -> icon/label mapping addition for the `catchup_*` types
  (owned by the notifications work package). Fall back to the generic bell icon if unmapped.

---

## 6. Data model

Six new Prisma models. Table names are **chosen to not collide** with the dead tables left by the
reverted build. `CatchupEdition` (not `CatchupIssue`) and `CatchupPrompt` (not `CatchupQuestion`) are
genuinely fresh names for genuinely absent tables. `CatchupEntry` and `CatchupEntryLove` are also
fresh/absent.

> **Live DB introspection (2026-07-05) found two of the "fresh" names are not fresh.** The reverted
> build ALSO left physical `Catchup` and `CatchupPref` tables behind, and their columns do not match
> this spec: legacy `Catchup` has `creatorId` (this spec's model needs `createdById`) and legacy
> `CatchupPref` has `optedOut boolean` (this spec's model needs `reminderMode TEXT`). Left alone, the
> `Catchup` and `CatchupPref` Prisma models below would point at those legacy tables and silently read
> or write the wrong columns instead of raising the intended "table does not exist" (P2021) signal
> pre-migration — and the section 6.3 SQL for those two tables would be a no-op forever (`CREATE TABLE
> IF NOT EXISTS` sees the legacy table and does nothing), so the bug survives the migration too. The
> fix: the `Catchup` and `CatchupPref` **models keep their names** (so `prisma.catchup.*` /
> `prisma.catchupPref.*` in app code never changes) but are mapped via `@@map(...)` to fresh physical
> table names, `CatchupSeries` and `CatchupReminderPref`, that do not collide with anything. The 6.1
> models and 6.3 SQL below already reflect this; do not rename them back to bare `"Catchup"` /
> `"CatchupPref"` in the SQL.

> Deploy risk, read before running anything: `prisma db push` compares the schema to the DB and will
> try to **drop** the orphan `CatchupIssue` / `CatchupQuestion` tables (they are not in the schema).
> If we lack the privilege to drop them, `db push` will error. **Primary path:** apply the idempotent
> SQL in 6.3 directly (Supabase SQL / `execute_sql`), then run `prisma generate` only (not
> `db push`). This creates the new tables and regenerates the client without touching the orphans.
> Keep the Prisma models below as the source of truth for the generated client.

### 6.1 Models (paste into `prisma/schema.prisma`)

```prisma
model Catchup {
  id          String    @id @default(cuid())
  groupId     String    @unique
  createdById String?                       // the Keeper; nullable so the Catch-up survives if they leave
  title       String?                       // optional custom name; UI falls back to "{group} Catch-ups"
  intro       String?                       // one-line description on the home
  cadence     String    @default("monthly") // "biweekly" | "monthly" | "quarterly"
  status      String    @default("active")  // "active" | "paused" | "ended"
  nextOpensAt DateTime?                      // when the next Round auto-opens (recurring cadences)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  group     Group            @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdBy User?            @relation("CatchupsKept", fields: [createdById], references: [id], onDelete: SetNull)
  editions  CatchupEdition[]
  prefs     CatchupPref[]

  @@index([status, nextOpensAt])
  @@map("CatchupSeries") // legacy "Catchup" table exists with incompatible columns (creatorId, no createdById); see callout above
}

model CatchupEdition {
  id               String    @id @default(cuid())
  catchupId        String
  number           Int
  theme            String?
  status           String    @default("collecting") // draft|collecting|answering|preparing|published
  questionsCloseAt DateTime?
  answersCloseAt   DateTime?
  publishAt        DateTime?                          // = answersCloseAt + 24h (the preparing ritual)
  publishedAt      DateTime?
  remindersSent    Int       @default(0)              // bitmask: 1=two-days, 2=last-day, 4=extended-once
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  catchup Catchup         @relation(fields: [catchupId], references: [id], onDelete: Cascade)
  prompts CatchupPrompt[]
  entries CatchupEntry[]

  @@unique([catchupId, number])
  @@index([status, publishAt])
}

model CatchupPrompt {
  id        String   @id @default(cuid())
  editionId String
  authorId  String                          // always stored, even when shown anonymously
  text      String
  category  String?                          // library set id (e.g. "valley-days") or null for custom
  source    String   @default("member")     // "library" | "member" | "keeper"
  showAsker Boolean  @default(true)          // false = submitted anonymously
  accepted  Boolean  @default(false)         // curated into the Round by the Keeper
  position  Int      @default(0)
  createdAt DateTime @default(now())

  edition CatchupEdition @relation(fields: [editionId], references: [id], onDelete: Cascade)
  author  User           @relation("CatchupPromptsAuthored", fields: [authorId], references: [id], onDelete: Cascade)
  entries CatchupEntry[]

  @@index([editionId, position])
}

model CatchupEntry {
  id        String   @id @default(cuid())
  editionId String                          // denormalized for fast whole-Round reads
  promptId  String
  authorId  String
  body      String?
  images    String?                          // JSON array of R2 urls (reuse /api/upload)
  songUrl   String?
  songTitle String?
  songArt   String?                          // Spotify oembed thumbnail_url
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  edition CatchupEdition    @relation(fields: [editionId], references: [id], onDelete: Cascade)
  prompt  CatchupPrompt     @relation(fields: [promptId], references: [id], onDelete: Cascade)
  author  User              @relation("CatchupEntriesAuthored", fields: [authorId], references: [id], onDelete: Cascade)
  loves   CatchupEntryLove[]

  @@unique([promptId, authorId])
  @@index([editionId])
}

model CatchupEntryLove {
  id      String @id @default(cuid())
  userId  String
  entryId String

  user  User         @relation("CatchupLoves", fields: [userId], references: [id], onDelete: Cascade)
  entry CatchupEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@unique([userId, entryId])
}

model CatchupPref {
  id           String @id @default(cuid())
  catchupId    String
  userId       String
  reminderMode String @default("all")       // "all" | "last" | "off"

  catchup Catchup @relation(fields: [catchupId], references: [id], onDelete: Cascade)
  user    User    @relation("CatchupPrefs", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([catchupId, userId])
  @@map("CatchupReminderPref") // legacy "CatchupPref" table exists with `optedOut boolean`, not `reminderMode`; see callout above
}
```

### 6.2 Back-relations to add on existing models

On `model Group`, add:

```prisma
  catchup Catchup?
```

On `model User`, add:

```prisma
  catchupsKept    Catchup[]          @relation("CatchupsKept")
  catchupPrompts  CatchupPrompt[]    @relation("CatchupPromptsAuthored")
  catchupEntries  CatchupEntry[]     @relation("CatchupEntriesAuthored")
  catchupLoves    CatchupEntryLove[] @relation("CatchupLoves")
  catchupPrefs    CatchupPref[]      @relation("CatchupPrefs")
```

### 6.3 Idempotent SQL migration (equivalent to the models above)

Safe to run repeatedly. Creates only the new tables, indexes, and FKs. Postgres. Run this via
Supabase SQL / `execute_sql`, then `prisma generate`.

```sql
-- Tables ---------------------------------------------------------------------
-- "Catchup" is deliberately NOT the table name here: a legacy table with that
-- exact name already exists (from the reverted build) with an incompatible
-- column (`creatorId`, not `createdById`). Using "CatchupSeries" as the
-- physical table avoids the collision; the Prisma model is still named
-- `Catchup` via `@@map("CatchupSeries")` in 6.1, so `prisma.catchup.*` in app
-- code is unaffected. See the callout at the top of section 6.
CREATE TABLE IF NOT EXISTS "CatchupSeries" (
  "id"          TEXT PRIMARY KEY,
  "groupId"     TEXT NOT NULL,
  "createdById" TEXT,
  "title"       TEXT,
  "intro"       TEXT,
  "cadence"     TEXT NOT NULL DEFAULT 'monthly',
  "status"      TEXT NOT NULL DEFAULT 'active',
  "nextOpensAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEdition" (
  "id"               TEXT PRIMARY KEY,
  "catchupId"        TEXT NOT NULL,
  "number"           INTEGER NOT NULL,
  "theme"            TEXT,
  "status"           TEXT NOT NULL DEFAULT 'collecting',
  "questionsCloseAt" TIMESTAMP(3),
  "answersCloseAt"   TIMESTAMP(3),
  "publishAt"        TIMESTAMP(3),
  "publishedAt"      TIMESTAMP(3),
  "remindersSent"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupPrompt" (
  "id"        TEXT PRIMARY KEY,
  "editionId" TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "text"      TEXT NOT NULL,
  "category"  TEXT,
  "source"    TEXT NOT NULL DEFAULT 'member',
  "showAsker" BOOLEAN NOT NULL DEFAULT true,
  "accepted"  BOOLEAN NOT NULL DEFAULT false,
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEntry" (
  "id"        TEXT PRIMARY KEY,
  "editionId" TEXT NOT NULL,
  "promptId"  TEXT NOT NULL,
  "authorId"  TEXT NOT NULL,
  "body"      TEXT,
  "images"    TEXT,
  "songUrl"   TEXT,
  "songTitle" TEXT,
  "songArt"   TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CatchupEntryLove" (
  "id"      TEXT PRIMARY KEY,
  "userId"  TEXT NOT NULL,
  "entryId" TEXT NOT NULL
);

-- "CatchupPref" is likewise deliberately NOT the table name here: a legacy
-- table with that exact name already exists with an incompatible column
-- (`optedOut boolean`, not `reminderMode`). "CatchupReminderPref" is the
-- physical table; the Prisma model stays named `CatchupPref` via
-- `@@map("CatchupReminderPref")` in 6.1.
CREATE TABLE IF NOT EXISTS "CatchupReminderPref" (
  "id"           TEXT PRIMARY KEY,
  "catchupId"    TEXT NOT NULL,
  "userId"       TEXT NOT NULL,
  "reminderMode" TEXT NOT NULL DEFAULT 'all'
);

-- Unique + secondary indexes -------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupSeries_groupId_key"           ON "CatchupSeries" ("groupId");
CREATE INDEX        IF NOT EXISTS "CatchupSeries_status_nextOpensAt_idx" ON "CatchupSeries" ("status", "nextOpensAt");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEdition_catchupId_number_key" ON "CatchupEdition" ("catchupId", "number");
CREATE INDEX        IF NOT EXISTS "CatchupEdition_status_publishAt_idx" ON "CatchupEdition" ("status", "publishAt");
CREATE INDEX        IF NOT EXISTS "CatchupPrompt_editionId_position_idx" ON "CatchupPrompt" ("editionId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntry_promptId_authorId_key"  ON "CatchupEntry" ("promptId", "authorId");
CREATE INDEX        IF NOT EXISTS "CatchupEntry_editionId_idx"          ON "CatchupEntry" ("editionId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupEntryLove_userId_entryId_key" ON "CatchupEntryLove" ("userId", "entryId");
CREATE UNIQUE INDEX IF NOT EXISTS "CatchupReminderPref_catchupId_userId_key" ON "CatchupReminderPref" ("catchupId", "userId");

-- Foreign keys (idempotent via duplicate_object guard) -----------------------
DO $$ BEGIN
  ALTER TABLE "CatchupSeries" ADD CONSTRAINT "CatchupSeries_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupSeries" ADD CONSTRAINT "CatchupSeries_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEdition" ADD CONSTRAINT "CatchupEdition_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "CatchupSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPrompt" ADD CONSTRAINT "CatchupPrompt_editionId_fkey"
    FOREIGN KEY ("editionId") REFERENCES "CatchupEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupPrompt" ADD CONSTRAINT "CatchupPrompt_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_editionId_fkey"
    FOREIGN KEY ("editionId") REFERENCES "CatchupEdition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_promptId_fkey"
    FOREIGN KEY ("promptId") REFERENCES "CatchupPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntry" ADD CONSTRAINT "CatchupEntry_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntryLove" ADD CONSTRAINT "CatchupEntryLove_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupEntryLove" ADD CONSTRAINT "CatchupEntryLove_entryId_fkey"
    FOREIGN KEY ("entryId") REFERENCES "CatchupEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupReminderPref" ADD CONSTRAINT "CatchupReminderPref_catchupId_fkey"
    FOREIGN KEY ("catchupId") REFERENCES "CatchupSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CatchupReminderPref" ADD CONSTRAINT "CatchupReminderPref_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### 6.4 OPTIONAL cleanup (owner runs this manually, only if privileges allow)

Separate and optional. Drops the dead tables from the reverted build. Do **not** fold this into the
migration above; the owner runs it deliberately once they confirm nothing else references them.

Live introspection (2026-07-05) found the reverted build left **six** orphan tables, not two:
`Catchup` (3 leftover rows), `CatchupAnswer` (22 rows), `CatchupAnswerLove` (0 rows), `CatchupIssue`
(4 rows), `CatchupPref` (0 rows), `CatchupQuestion` (10 rows). None of these are read by this build
(6.1/6.3 use `CatchupSeries`/`CatchupEdition`/`CatchupPrompt`/`CatchupEntry`/`CatchupEntryLove`/
`CatchupReminderPref` instead), so leaving them in place is harmless and does not block anything in
this spec. Dropping them is pure hygiene; check for leftover content worth preserving first.

```sql
-- OPTIONAL: remove the dead tables left by the reverted Catch-ups build.
-- Run only after confirming no other object depends on them and that any
-- leftover rows (see counts above) are not worth preserving.
DROP TABLE IF EXISTS "CatchupQuestion" CASCADE;
DROP TABLE IF EXISTS "CatchupIssue" CASCADE;
DROP TABLE IF EXISTS "CatchupAnswerLove" CASCADE;
DROP TABLE IF EXISTS "CatchupAnswer" CASCADE;
DROP TABLE IF EXISTS "CatchupPref" CASCADE;
DROP TABLE IF EXISTS "Catchup" CASCADE;
```

---

## 7. Permissions

- **Visibility and participation are inherited from the Group.** Only group members can view or
  participate in that group's Catch-up. Private groups are already gated; the Catch-up rides on the
  same membership check (`GroupMember`). There is no separate Catch-up invite, member list, or cap.
- **Keeper = the member who created the Catch-up** (`Catchup.createdById`). If no Catch-up exists for
  a group, **any group member may create one** (`groupId @unique` guarantees only one wins). If the
  Keeper leaves and `createdById` goes null, any remaining member may act as Keeper / re-adopt it.
- **Effective Keeper powers** are held by the Catch-up's `createdBy` **or** any group admin
  (`GroupMember.role = "admin"`, the group "Keeper"). Those powers: set/change cadence; curate
  questions (accept, remove, reorder; add from library); open answering early; close and prepare
  early; publish early; nudge the group; pause / resume / end.
- **Every member** may: submit questions (named or anonymous); answer (all questions optional); heart
  answers; set their own `CatchupPref`; read published Rounds and the archive.
- **Moderation** reuses the app's existing report-on-user flow. Reporting an individual answer is out
  of v1; a site admin (`User.role = "admin"`) retains blanket moderation via existing tools.

---

## 8. Scope fences (explicitly OUT of v1)

Do not build these. They are named so builders do not gold-plate.

- **Comments on answers.** Design the answer card *for* them (a quiet reply slot) but do not wire
  them. Hearts are the only reaction in v1.
- **Emoji reactions.** The single red heart is the reaction language.
- **PDF / keepsake export.** Fast-follow.
- **Email delivery.** In-app notifications only. Resend stays unused.
- **Birthdays / milestone auto-prompts.** Later.
- **Mementos / shareable highlight cards.** Fast-follow.
- **Interactive poll / "Most likely to" vote types.** The "most likely to" prompts ship as ordinary
  text questions, not a voting widget. No poll question type.
- **Themes / multiple cover presets.** One warm on-theme look, matching the app.
- **Timezone machinery.** Single community timezone; windows are in server time.
- **Standalone Catch-ups, invites, member cap.** A Catch-up always belongs to a group.
- **Anonymity of answers.** Only *question submission* can be anonymous; answers are always
  attributed.
- **Cron.** MVP relies on the lazy read-time advance (2.4). The `/api/catchups/tick` endpoint is an
  optional later hardening, not v1.

---

## 9. Build plan (parallelizable work packages)

Seven packages. **File ownership is exclusive** unless flagged as a coordinated insert. WP1 must land
and be generated before the rest start (they need the Prisma client + lib helpers + types). WP2 must
land before the screen packages can wire actions, but the screen packages can build UI against typed
stubs in parallel and swap to the real actions when WP2 merges.

**WP1 - Data + lib foundation.** *Owns:* `prisma/schema.prisma` (the only owner of this file), the
idempotent SQL from 6.3, `src/lib/catchups.ts` (prompt library `CATCHUP_PROMPT_SETS`, timing
constants, cadence gaps, `computeStatus`, `advanceEdition`, `advanceDueCatchups`, the Spotify oembed
resolver `resolveSpotify(url)`), and `src/lib/catchups-types.ts` (shared TS types for the screens).
Runs `prisma generate`. *Deliverable:* schema + client + pure helpers with unit-testable
`computeStatus`. Everything depends on this.

**WP2 - Server actions.** *Owns:* `src/app/(main)/catchups/actions.ts`. Actions: `createCatchup`,
`updateCatchupCadence`, `pauseCatchup` / `resumeCatchup` / `endCatchup`, `submitPrompt`
(named/anonymous), `curatePrompt` (accept / remove / reorder), `openAnswering`, `submitEntry` (image
urls + `resolveSpotify`), `toggleEntryLove`, `closeAndPrepare`, `publishNow`, `setReminderPref`,
`nudgeGroup`. Enforces the 7 permission rules and calls WP1 helpers. Depends on WP1.

**WP3 - Index + create flow.** *Owns:* `src/app/(main)/catchups/page.tsx`, `.../catchups/loading.tsx`,
`src/app/(main)/catchups/new/page.tsx` + `.../new/loading.tsx`, and
`src/components/catchups/create/*` (group picker, cadence control, seed-questions picker, preview
card) + `src/components/catchups/index/*` (explainer band, your-catchups card, fresh-off-the-press
rail). Group-first guidance lives here. Depends on WP1 (types) + WP2 (`createCatchup`).

**WP4 - Catch-up home + cycle screens.** *Owns:* `src/app/(main)/catchups/[catchupId]/page.tsx` +
`loading.tsx`, and `src/components/catchups/home/*` (status console + progress ring, Keeper controls
rail, the question-submission panel with the named/anonymous toggle, the preparing holding scene,
the archive shelf). Depends on WP1 + WP2.

**WP5 - Answering experience.** *Owns:* `src/app/(main)/catchups/[catchupId]/answer/page.tsx` +
`loading.tsx` and `src/components/catchups/answer/*` (two-pane progress rail + one-prompt-at-a-time
card, photo attach reusing `/api/upload`, the Spotify field + resolved album-art card, autosave,
completion moment). Reuses `IdentityRow`, `BirdAvatar`, motion tokens. Depends on WP1 + WP2.

**WP6 - Published Round reader + archive detail.** *Owns:*
`src/app/(main)/catchups/round/[editionId]/page.tsx` + `loading.tsx` and
`src/components/catchups/round/*` (magazine masthead, who-answered strip, by-question sections,
staggered answer-card kit, sticky question TOC, Spotify album-art card render, `LoveButton` wiring
via `toggleEntryLove`, the future-comment slot left dormant). Depends on WP1 + WP2. This is the
crown-jewel package; give it the most polish budget.

**WP7 - Notifications + group integration + nav.** *Owns:* `src/lib/catchups-notify.ts` (builds the
`Notification` rows for the six triggers, respecting `CatchupPref`), the notification-bell type ->
icon/label mapping addition, `src/components/catchups/group-catchup-card.tsx`, and the wiring of
`advanceDueCatchups` into the app-shell notification-count query. *Coordinated insert (not exclusive):*
one import + one JSX block into `src/app/(main)/groups/[id]/page.tsx` to mount the group Catch-up card
(WP7 makes exactly this one edit, at the top of the members-only branch, so it never collides with the
groups owner). Depends on WP1 + WP2; the notify builder is consumed by WP2's actions and WP1's
`advanceEdition`, so agree the `catchups-notify.ts` signature with WP1/WP2 up front.

---

_Last rewritten 2026-07-05. Supersedes the reverted build. Source research:
`docs/planning/letterloop-research.md`. Canonical design language: `docs/spec/DESIGN-SYSTEM.md`._

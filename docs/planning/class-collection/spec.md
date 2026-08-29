# The Class Collection — design

**2026-08-29.** A second, private half of the Collection: photographs a member's own
class uploads, visible only to that class.

Decided in conversation with the owner on 2026-08-29 and locked where it says LOCKED.
Everything else is a recommendation a building session may argue with, in writing, in
this file.

Read `docs/planning/collection-rework/spec.md` first. This document is a delta on it and
does not repeat what is already true there: the justified rows, the viewer, the storage
budget, the buckets, the decade rail, keyset pagination. Where the two disagree about the
Valley Collection, that one wins; this one only ever adds.

**The governing rule, and it outranks everything below.** Owner, 2026-08-29: *"please
don't worsen the good things we have in collections. we just improve on it. don't add a
billion elements and just ruin it."* The Collection is a restrained surface that took a
campaign to get right. Every item in this document is a **substitution or a scoping**, not
an addition. If a section here reads as one more element on the page, it is wrong and the
building session should say so rather than build it.

---

## 0. What was settled, in one place

| | |
|---|---|
| **It lives inside the Collection** | Not a new sidebar row, not a `/class` surface, not the first piece of a wider class home. The Collection gains a second scope. |
| **The page is "The Class Collection"** | Parallel to "The Valley Collection", and the title is the *whole* of how a member knows which half they are in. No lock icon, no line underneath restating it. |
| **The audience is exact batch-year equality** | `User.batchYear` alone. ISC and ICSE leavers of the same year are one class. |
| **Admins see everything** | Consistent with `decidePostVisibility`, which exempts admins outright. A stated decision, not an oversight. |
| **Access requires `verifyState === "verified"`** | Plus an `AuditLog` row on every `batchYear` change. The residual hole is documented in §2.4 and accepted. |
| **No "move to the Valley Collection"** | Owner, verbatim: *"if they wanted it they could've just put it there instead."* The consequence is in §7.3. |

---

## 1. What a Class Collection is, and what it must not become

**It is not the Valley Collection with a `WHERE` clause.** That is the one mistake this
document exists to prevent, because the clone would look finished and be wrong.

Every organising mechanism in the Valley Collection answers a problem a class collection
does not have. The six buckets exist because twenty thousand photographs contributed by
strangers across a century need a spine. The decade rail exists because "when" spans
1930 to 2026. "Part of school" is asked for because a contributor cannot assume context.

A class collection is a few hundred to a couple of thousand photographs, from a window
five to seven years wide, contributed by people who all know each other. So:

- **When collapses.** Everything is one decade. A decade rail with a single mark on it is
  a joke. The axis survives at *year* resolution and nowhere coarser.
- **What collapses.** Everything is People and School life. Five of the six bucket words
  would be permanently empty, and a control that is always empty teaches a member to stop
  reading controls.
- **Who becomes the dominant axis** — "photographs Ravi put up", "the 2019 reunion" — and
  it is the one axis the Valley Collection has no equivalent for.

The design consequence: **share all the plumbing, diverge on the spine.** Upload,
re-encode, direct-to-R2, `sourceKey` uniqueness, the quota, the purge booking, the
justified-row layout, the viewer, love, delete — roughly a thousand lines of hard-won
machinery in `src/app/(main)/collection/actions.ts` and `src/components/collection/*` —
are reused untouched. The buckets, the decade rail and the "Part of school" field are what
get replaced.

### 1.1 What it is *for*

Three products hide under the phrase and only one of them is being built:

- **A private archive** (the Valley Collection, scoped) — not this.
- **A shared camera roll** — reunion photographs, low ceremony, chronological, uploaded in
  bulk, captions optional. **This.**
- **A memory-making surface** — comments, "who is that in the back row", collective
  excavation. Not v1, but §11 keeps the door open rather than closing it.

The bulk-drop path in §7.2 is therefore not a nice-to-have. It is the feature.

---

## 2. The audience — LOCKED

### 2.1 The key is `batchYear`, never `batchTargetKey`

`src/lib/post-visibility-rule.ts` targets posts at an `"ISC-2004"`-shaped composite. **Do
not build on it here.** That key splits one cohort in two: a member who left after 10th
carries `batchType: "ICSE"` and sat beside the ISC-2004 people for six years. They are the
same class. `User.batchYear` is documented in the schema as *"the year the person's class
would finish 12th (their 'Batch of'); derived, not the year they left"*, which is exactly
the identity wanted, and it already holds for mid-school leavers.

Post targeting may be wrong about this. A page titled "The Class Collection" may not.

### 2.2 What the audience is stored as

**A comma list of years, not a single integer**, even though v1 only ever writes one. The
cost today is nothing; the cost of getting it wrong is a migration on a table that will by
then hold tens of thousands of rows. It makes "the uploader may add the class above"
a later flag flip rather than a schema change.

### 2.3 The boundary is socially false, and that is accepted

At a boarding school your people are your dorm and your house and the year above you. A
2004 member's photographs are full of 2003 and 2005 faces, and under exact equality a
photograph *of you* posted by a 2005 friend is invisible to you, permanently.

The alternative considered was an overlap window computed from `yearJoined`/`yearLeft`,
covering roughly six classes either side. It is truer to how RV friendships actually work
and it was rejected for one reason: **"who can see this" stops having a short answer**, and
a privacy feature whose contract cannot be said in one sentence is a privacy feature nobody
trusts. Exact equality buys a sentence: *"Only the class of 2004 can see this."*

If the complaint arrives in real use, the fix is §2.2's column plus a per-photograph
audience picker, not a wider default.

### 2.4 The batch-year door, and the shape of the hole left open

Editing `batchYear` in the profile grants access to another class's private photographs.
`batchYear` is a member-editable field (`src/components/profile/profile-actions.ts`,
in the editable-field list, written straight through).

Two mitigations ship:

1. **`verifyState === "verified"` is required** to see any Class Collection. An unverified
   account sees the Valley Collection and a prompt. This reuses the roster machinery in
   `src/lib/roster.ts` rather than inventing a rule.
2. **An `AuditLog` row on every `batchYear` change.** It prevents nothing; it means nobody
   does it quietly.

**The hole they leave, stated deliberately.** A `batchYear` edit calls
`tryRosterAutoVerifyQuietly`, and that function returns immediately for anyone already
verified: `roster.ts` only ever transitions `unverified`/`pending` upward and never
demotes, by design, because an existing verification method is a fact worth preserving. So
**a verified member can edit 2004 to 2005, keep their verification, and gain the 2005
class's photographs.** The realistic actor is a curious member of a small closed community,
not an adversary, and the owner has accepted this.

**The one line that would close it**, if it is ever wanted: demote a roster-verified
account to `pending` when `batchYear` changes. It costs a re-verification to anyone
correcting a typo, which is why it is not being taken now. Recorded here so the next
session does not have to rediscover the mechanism.

### 2.5 Members with no class at all

- **Teachers.** `taughtFrom`/`taughtUntil`, no `batchYear`. They have no class and the
  switch does not offer them one. "The years you taught" is a different feature; §11.
- **Incomplete profiles and unverified accounts.** **The switch is simply absent**, and this
  reverses what an earlier draft of this section said. The draft had it present and leading
  to a prompt; building it made the cost obvious — a control drawn only in order to explain
  that it does not work is one more element on a page whose entire brief was to stay quiet.
  The honest place to tell somebody their class archive is one field away is beside the
  missing field, in the profile editor, not on a page they have already navigated to.
  **Logged for phase 5**, and it is a real gap until then: a member one field short of the
  feature currently has no way to learn it exists.

### 2.6 A class of one

Early cohorts and the 1940s will have one member on the app, or none. **Show it anyway.**
It is their archive and it grows. No member-count floor.

---

## 3. Data model

### 3.1 Columns

One table. `Photo` gains two columns:

```prisma
/// Which half of the Collection this photograph belongs to. An EXPLICIT
/// discriminator and never a nullable audience meaning "everyone": a null
/// that reads as public is how a default-open leak is written.
scope       String  @default("valley")   // "valley" | "class"

/// The classes that may see it, as a comma list of batch years ("2004").
/// Always exactly one today; a list so §2.2's widening is not a migration.
/// Null for every valley-scoped row.
classYears  String?
```

**A second table was considered and rejected.** It would mean re-implementing the viewer,
love, the purge booking, the quota, direct upload and the admin queue. The price of sharing
one table is that every existing photo query becomes a security surface, which is a fair
trade only if it is paid deliberately — §4 is that payment.

### 3.2 Index

```
@@index([scope, classYears, approved, isHidden, takenKey(sort: Desc), id(sort: Desc)])
```

Mirroring `Photo_river_taken_idx`, which already ends in the tiebreak that makes the
ordering total and the keyset cursor safe (audit B-122). Do not drop that property here.

### 3.3 Migration

A dated file in `prisma/migrations-manual/`, applied with `node scripts/dev/run-sql.mjs`.
Never `prisma db push`: one Supabase instance serves production and local dev.

- `scope` is `NOT NULL DEFAULT 'valley'`, so every existing row is correct on arrival with
  no backfill pass.
- **Do not go near `takenKey`.** It is `GENERATED ALWAYS ... STORED`, Prisma reads it and
  never writes it, and touching it broke every contribution once already.
- `subject` is `NOT NULL`. Class photographs write `""`; `bucketsOf("")` already returns
  `[]`, so nothing downstream needs changing. Verified against `src/lib/collection.ts`.

### 3.4 A gotcha that will cost a session otherwise

The dev Prisma client rebuilds itself off `Prisma.ModelName`. **Adding columns to an
existing model does not change the model list**, so the cached client may not rebuild and
the new fields will be missing from a server that typechecks perfectly. Restart the dev
server after applying this migration.

---

## 4. The rule, and where it has to be enforced

### 4.1 One pure function

`src/lib/photo-visibility-rule.ts`, with **no relative imports at all**, so a plain
`node --test` `.mjs` file can try every case. This is the shape of
`src/lib/post-visibility-rule.ts` and it exists for the reason that file gives: a security
decision that cannot be tested is a security decision nobody will notice breaking.

```
decidePhotoVisibility(photo, viewer) -> { ok: true } | { ok: false, reason }
```

In order:
1. `viewer.role === "admin"` — visible. LOCKED, §0.
2. Own upload — visible, including a pending one.
3. `isHidden` / not approved — refused.
4. `scope === "valley"` — visible.
5. `scope === "class"` — visible only if `viewer.verifyState === "verified"` **and**
   `String(viewer.batchYear)` is a token-exact member of `classYears`.

Token-exact, not `String.includes`. `post-visibility-rule.ts` carries the same warning for
the same reason: a stored `"20111"` matched a viewer keyed `"2011"` and showed a post to a
class it was not written for.

**One refusal message for every reason.** Distinguishing "no such photograph" from "not
your class" turns any caller into an oracle confirming both that the photograph exists and
which class it belongs to. The specific reason stays server-side.

### 4.2 The sweep — every read path that must gain a scope predicate

Missing one of these is the leak. This list is the checklist for the phase-2 session.

- `buildCollectionWhere`, `loadPhotos`, `loadPhoto`, `myPendingPhotos` —
  `src/app/(main)/collection/actions.ts`
- `collectionPageData`'s `approvedCount` and the member's own photo count —
  `src/app/(main)/collection/collection-data.ts`
- **The `/collection/[id]` permalink**, and its `generateMetadata`. A private caption must
  not reach an OG tag.
- **The feed rail's collection module** — `src/components/feed/rail/collection-module.tsx`.
  Valley-only for v1.
- **The profile's photographs tab.** The easiest one to miss: a non-classmate viewing your
  profile must not see your class uploads. `@@index([uploaderId])` already backs the query.
- The Collection's search (`SearchPill` reads caption, area, freeTags and uploader name).
- The admin queue, `approvePhoto`, `approvePhotos`, and the content moderation lists.
- `declinePhoto` / `deleteOwnPhoto` / `adminRemovePhoto` — the uploader-or-admin check is
  already correct, but confirm it does not widen for class photographs.

### 4.3 Writing

**Scope is derived from the session and never accepted from the client.** A member cannot
upload into a class that is not theirs. Spawn `write-path-reviewer` on the phase-1 and
phase-4 diffs.

### 4.4 Enforcement that survives the next session

- The pure rule plus its `.mjs` test, covering: admin, own pending upload, valley, matching
  class, non-matching class, unverified member with a matching class, null `batchYear`,
  the `"20111"`/`"2011"` prefix case, and an unparseable `classYears`.
- A grep-shaped assertion in `src/lib/security-regressions.test.mjs` pinning that no photo
  query in `actions.ts` ships without a scope predicate.

---

## 5. The switch

### 5.1 The constraint that outranks elegance

**This is a privacy indicator, not a filter.** If a member cannot tell at a glance which
half they are in, one of them will eventually put a private photograph into the public
archive, or believe a public one is private. That requirement decides the mechanism.

### 5.2 What ships — one caret on the title

**A single caret, inline, immediately after the title's last word.** Muted, 13px, on the
title's own baseline. Press it and the collection swaps and the caret flips. Nothing is
added to the controls line; that row is byte-identical to what it was.

The title already says which half you are in, which makes the title the only honest place
for the thing that changes it. One glyph rather than the owner's suggested up-and-down pair:
with exactly two halves there is nowhere to travel, only somewhere to return from, and a
second arrow is a second mark earning nothing. If a third collection ever exists, that is
the assumption that breaks, and a stacked pair is what it breaks into.

It is inline **inside** the `<h1>` rather than beside it in the header, because "The Valley
Collection" wraps on a phone: anchored to the block it would strand itself to the right of
"The Valley" with two lines of nothing beneath. Inline, it follows "Collection" down.
`PageHeader` gained one `afterTitle` slot for it, and it is deliberately outside `GuideDoor`
— the words open the guide chapter, the mark beside them swaps the collection, and nesting
one button in another is both an accessibility error and a way to open the guide on every
swap.

### 5.3 What was tried and was wrong

**A `<SegmentedPills>` switch on the controls line shipped in one commit and was reverted.**
It is recorded here rather than quietly dropped, because the reasoning that produced it was
plausible and will be produced again.

The argument was: it is the house component, it is what the profile switcher and the
directory toggle use, and Apple's HIG reaches for a segmented control with two mutually
exclusive views. All true, and all beside the point. **The controls line is the one place in
this app whose brief was explicitly *no pills, no borders*** — `river-controls.tsx`'s own
header says so, quoting the owner. Putting a filled white capsule beside bare 13.5px bucket
words produced two selection idioms, at two sizes, on two baselines, in two visual
languages. The owner's read: *"one of the ugliest things I've seen."*

**The lesson, stated so it survives: a control does not become appropriate because it is the
house component. The house component belongs where the house put it.** A shared primitive
carries the design system's answer to a question; it does not carry permission to ask that
question on a surface that already answered it differently.

Also rejected, and these still stand:

| | |
|---|---|
| **A menu on the title** | With two halves a menu is a press to reveal one option. And the title is already the guide's door. |
| **Swipe between the two** | Collides with the viewer's own swipe and the bucket scroller, breaks scroll restoration across two infinite lists, leaves no indicator. |
| **A card on the Valley page** | One-way, and navigation-by-content is what the Collection spec rejects outright. |
| **A sidebar sub-row** | Two implementations, and on mobile the indicator vanishes with the drawer. |
| **"Your class" as a seventh bucket word** | A category error: the bucket line means *what is in the photograph*. Audience on the subject axis makes a private page and a public archive look identical. |

### 5.4 The transition

- **In place, not a navigation.** `?scope=class` on the same route, cross-faded, URL
  updated behind it. This is the mechanism the bucket, decade and search filters already
  use, and `collectionPageData` already server-renders a cold arrival at any filter set, so
  a shared link opens correctly with no client round trip.
- **Reuse the existing cross-fade** (`dimmed={loading}`). Do not invent a slide.
- **Filters reset on switch.** Searching "banyan", switching, and finding nothing is a bad
  first impression that costs the feature its first use.
- **Pre-warm on hover.** `warmThumbs` already exists; warming the other side's first twelve
  thumbnails when the segment is hovered makes the swap instant for the cost of nothing.
- **The decade rail stays as it is**, on both sides. It is an `xl:` column beside the river,
  so hiding it on the class side would reflow the whole grid on every switch — and the
  cheapest way not to reflow is to change nothing. On a class it will show one or two
  decades, which is thin but honest. §6.2.

### 5.5 Where the switch hangs, in the client — checked against the code

**Scope is a fifth query dimension, not a new `firstPage`.** Getting this wrong is the one
implementation seam that would look right and behave badly, so it is written down.

`CollectionClient` memoises `fetchPage` on `[bucket, search, order, seekEra]`
(`collection-client.tsx:305-317`) and holds its seeded-once guard against the **identity**
of that callback (`:333`, `:349`), so any change to a query dimension is serviced as a
fresh first page automatically. Separately, the server reseed at `:178-188` adopts a new
`firstPage` **only when it contains a photograph the river does not already show**, asked
through `appendUnseen` — a deliberate guard so an RSC re-render cannot clobber a river the
reader has scrolled into.

So: add `scope` to `fetchPage`'s dependencies and to `RiverFilters`, and the switch inherits
the whole apparatus for free — the cross-fade, the URL sync at `:292-303`, and the landing
rules (a seek goes to the head unconditionally, any other change pulls up only). Deliver the
switch through a server-rendered `firstPage` instead and it fights that reseed guard rather
than using it.

Found by rv-connect-06 while root-causing the post-action scroll reset (commit `9fec6f6`,
which is also why the in-place switch will feel smooth at all); confirmed here by reading
the file.

---

## 6. The Class Collection page

### 6.1 The header

```
The Class Collection
```

**That is all of it.** The word "Class" is the privacy indicator; nothing is added beside
it. A draft of this document had a lock icon and a line reading "Only the class of 2004 can
see this", and the owner cut both: the title already says it, and two more elements to say
it again is how a good page becomes a worse one.

The search pill and Contribute keep their places on the title line, unchanged.

### 6.2 The controls line

The bucket words go (§1). What is left on that line is the segmented switch and the order
dropdown — **fewer controls than the Valley side, not more.** That is the test for this
whole page: it should read as the Collection with less on it, never as the Collection with
a class feature bolted to it.

The decade rail is untouched, for the reason in §5.4.

**Later, and only if it earns it (phase 5):** the rail could resolve to *years* on the class
side, since a class spans five to seven of them and a decade rail showing one mark is thin.
It reads `takenKey`, which already exists, so it is a substitution rather than a new
mechanism — and it is the natural home for EXIF dates, because unlike the Valley
Collection's scanned prints, class photographs are mostly digital and actually carry one.
Not v1. The rail we have works.

### 6.3 The empty state

Every class has zero photographs on day one, so this state is the feature for its first
month. It is **the existing empty state with its copy changed**, not a new component:
`CollectionClient` already renders a heading, a line and an "Add the first one" button, and
that is the right shape. Only the words differ.

---

## 7. Contributing

### 7.1 The destination is fixed, and the dialog's own title carries it

**No new line in the dialog.** The contribute dialog already has a visible title in both its
empty and its chosen-photograph states (2026-08-29 work). That title names the destination:

> Add to the Class Collection
> Add to the Valley Collection

Fixed by whichever side Contribute was pressed from, and **not switchable inside the
dialog** — a switchable destination is a second way to get it wrong.

This is the whole of the safeguard, and it is enough because it is the first thing read and
it is read before a file is chosen. §7.3 explains why it carries more weight than it looks
like it does.

### 7.2 Ask for almost nothing — and the bulk path already existed

Caption, and optionally when. No bucket, no "Part of school".

**This section was wrong when it was written, and building it proved so.** It said the bulk
path was its own phase and most of the effort, on the assumption that the contribute room
filed one scanned print at a time. It does not: `ContributeRoom` already takes a whole drop,
holds them on a wall, caps the batch against the account quota and files them one by one.
A reunion's two hundred photographs were always going to work.

So phase 4 shrank to two real numbers:

- **`MAX_PHOTOS_PER_DROP = 200`** (owner's call). A whole camera card.
- **The hourly meter had to move with it**, and this is the part that would have bitten.
  A direct-path contribution spends TWO tokens of `collectionUploads` — one at
  `/api/upload/presign`, one at `contributePhotoDirect` — so a 200-photograph drop costs
  400, and the meter stood at exactly 400. A full drop would have spent its entire hour, and
  the last photograph could be refused by anything racing it: a refusal arriving *after* the
  member has waited for the upload, which is the worst moment to refuse anybody. Raised to
  1000, with the arithmetic written into the limit's own comment and pinned by
  `upload-shared.test.mjs` so changing one number without the other fails the gate.

### 7.3 No approval queue, and no way back out

**Class photographs auto-approve.** A private page among people who know each other does not
want the owner reading it first, and the queue burden across a hundred classes would be
enormous. Reporting and admin removal stay.

**There is no "move to the Valley Collection".** Owner: *"if they wanted it they could've
just put it there instead."* The consequence, stated so it is not discovered: **the only
correction for a misfiled photograph is delete and re-upload.** A member can already delete
their own photographs, so this costs a re-upload and nothing else — but it puts the entire
weight of preventing the mistake on the contribute dialog's title (§7.1). Write that title
accordingly, and check it on both viewports.

### 7.4 The quota — two pools, not one

**Decided: a separate pool per half** (owner, 2026-08-29). `MAX_PHOTOS_PER_ACCOUNT` stays
at 1000 and is now counted per `scope`, so emptying a reunion into your Class Collection
never spends the room you had for the school's own archive. They are different acts.

The cost ceiling this defends therefore doubles, which is accepted rather than overlooked:
at roughly 250KB a photograph, a member who genuinely filled both pools costs about half a
gigabyte on R2 — pennies a month. The pressure here was never the bytes.

`photoQuotaError` takes the scope, and both contribute paths now resolve their destination
**before** checking the quota, because there is no number to check against until you know
which half. `collectionPageData` counts per scope too, so the pop-up's promise of remaining
room is true of the half it is about — promising the valley's number over the Class
Collection is a lie the member would only discover two hundred photographs in.

---

## 8. Notifications

> Ravi added 34 photographs to the Class Collection.

**Coalesced: one per uploader per day, never one per photograph.** This has to be designed
now rather than discovered, because the undesigned version is two hundred notifications and
a member who turns the feature off.

---

## 9. Operations

- **Demo.** `IS_DEMO` seeds its own photographs and has no real classes. Seed one class so
  the demo shows the feature, under the existing three-layer default-deny writes.
- **Deleting an account** cascades `Photo` via `onDelete: Cascade` on `uploader`. Today that
  erases a member's Valley contributions; under a shared class archive it punches holes in
  forty other people's memory of 1999. This is pre-existing behaviour and **out of scope
  here**, but it is worth its own look, and it is logged in `docs/planning/FEATURES.md`
  rather than smuggled into this campaign.
- **Backups** need no change.
- `/collection?scope=class` joins `ROUTES` in `e2e/visual.spec.ts`, masked past the page
  header like the other live-data routes.
- The guide's `collection` chapter gains a paragraph, in the same commit as the switch.

---

## 10. Testing

- The pure rule's `.mjs` test, cases enumerated in §4.4.
- The `security-regressions.test.mjs` pin, §4.4.
- A Playwright spec **written after the behaviour is known**, never as the way to find it:
  reproduce in `chrome-devtools` first, then pin the switch's geometry with `expect.poll`,
  scoped past the mobile drawer's portal.
- Visual baselines for both scopes, both viewports, staged in the commit that moves them.

---

## 11. What this deliberately does not build

Each of these is a real idea being declined for v1, not an oversight:

- **Per-class settings, names or moderators.** "The legendary '04" is charming and it is a
  whole permission model.
- **Albums or folders inside the class side.** The Collection spec rejects folders at every
  level and this does not get an exception.
- **Comments on photographs.** The viewer has love and a caption. Comments are a surface.
- **Face tagging.** Large, and the hand-run-pass protocol covers filing, not identifying.
- **Cross-class sharing.** §2.2 shapes the column for it. Nothing builds the UI.
- **A class home** (posts, members, reunions, with photographs as one tab). Explicitly
  considered and set aside by the owner on 2026-08-29; if it is ever built, this page moves
  into it.
- **Teachers' years.** §2.5.

---

## 12. Phases

1. **Schema, the pure rule, its tests.** No UI at all. Invisible and safe.
2. **Scope every read path**, §4.2's checklist, plus the regression pin. Still invisible.
3. **The switch**: segmented control, title, privacy line, the class side as a scoped river
   with buckets dropped. First visible commit.
4. **The bulk contribute path**, §7.2. The largest piece.
5. **The year rail, EXIF dates, notifications**, and the profile-side nudge that tells a
   member with no batch year that a class archive is waiting behind that field (§2.5).

Each phase is a commit that can be reverted whole: code, test, `progress.md` line, spec
edit and any moved visual baseline together.

---

## 13. Open

Both questions this section held are answered and built (§7.2, §7.4): separate quota pools,
and a 200-photograph drop ceiling with the hourly meter raised to carry it.

What is left is phase 5, and none of it blocks anything:

- **The year rail and EXIF dates.** Note for whoever takes it: the bulk path did NOT move
  where the bytes are read. A drop still goes direct-to-R2 via `/api/upload/presign` and is
  re-encoded server-side in `contributePhotoDirect`, with the proxied `contributePhoto` as
  the fallback for anything over Vercel's body cap. EXIF date pre-fill in the dialog is
  therefore unaffected by anything phase 4 changed.
- **Notifications**, coalesced per uploader per day (§8).
- **The profile-side nudge** for a member whose missing batch year is all that stands
  between them and a class archive (§2.5).

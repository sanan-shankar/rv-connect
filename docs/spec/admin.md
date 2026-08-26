# Spec: admin

**Status:** written 2026-08-18, from the owner's brief ("completely redo admin... it follows no
design principles, no UI, no UX... rethink it and make sure that every important thing we do has
been done there also"). Approved in chat on 2026-08-18 before writing. Nothing here is built yet.

This spec covers the whole admin surface: its navigation, its information architecture, the person
row that appears on every one of its screens, and the twelve capabilities the code supports today
that the panel cannot reach. It is grounded in measurements of the live panel, not impressions.

Read alongside `docs/spec/DESIGN-SYSTEM.md` (canonical), `docs/spec/demo.md` (the three write
layers), and `docs/planning/bugs.md` #6 (the raw-SQL timestamp trap, which names an admin tool as
the thing that will hit it).

---

## 1. What is wrong, measured

Measured on 2026-08-18 against the live panel at 1440x900, signed in as the owner, via
`chrome-devtools`. Every number below is from the page, not from reading the source.

| Measure | Value |
|---|---|
| Page height | 2901px, i.e. 3.2 screens of scrolling |
| Height of the users table alone | 2032px, **70% of the whole page** |
| Interactive elements on one page | 203 (147 of them are 49 rows x 3 icon buttons) |
| Text elements in `main` | 242 |
| Text elements set in `--muted-foreground` | **128, i.e. 53%** |
| Text elements below the type scale's smallest step | 23, of which 18 are also grey |
| Database round trips per page load | ~15, including **three** separate `User` queries |

Four conclusions follow, and they are the four things this rebuild fixes.

### 1.1 There is no navigation, so everything is height

Six sections stack down one page and the only way between them is the scrollbar. Five of the six
are near-empty on a normal day (no reports, no photos, nobody unverified), and each still pays for
a heading. The sixth, Users, is 2032px of table. The panel's shape is therefore "a wall of one
thing, preceded by five headings", which is not a shape anyone chose.

### 1.2 Three surfaces describe the same 49 people

`Users`, `Verification`, and `Email & verification` are three sections over one population. The
third one's fourth filter is labelled **Everyone** and lists all 49, roughly two inches above a
section that lists all 49. The owner named this exact duplication.

### 1.3 The page's structural vocabulary is set below the type scale, in grey

The design system's smallest documented step is `label 0.75rem` (12px) uppercase. The panel's six
stat labels are 10.5px and its six section headings are 11px, all in `--muted-foreground`. Those 18
elements are the entire navigational and structural vocabulary of the page. This is the whole of
the owner's "so hard to read because there's so much grey text", and it is measurable rather than a
matter of taste: 53% of all text on the page is grey.

### 1.4 Every load fetches everything

`src/app/(main)/admin/page.tsx` issues roughly fifteen round trips to Mumbai on every render:

- five counts in one `Promise.all` (`totalUsers`, `totalPosts`, `newSignups`, `pendingReports`,
  `pendingPhotos`)
- `users` (all 49, nine columns)
- `pendingVerification` (a second `User` scan)
- `verificationUsers` (a third `User` scan, ten columns), concurrent with `mailHealth()`, which is
  itself three more counts
- `verifyMail`
- `messageThreads`, capped at 40 threads **with every message nested inside each one**
- `reports`

All of it, every time, to look at an empty report list. Splitting the panel into routes makes each
screen load only its own data, which is the real argument for routes over tabs.

### 1.5 Mobile cannot reach the destructive actions

The users table carries `min-w-[640px]` inside a scroller measured at 460px, so Status and Actions
sit off-screen behind a horizontal scroll with no scrollbar affordance. On a phone the block and
delete buttons are, in practice, unreachable. (Measured at a 500px client width, the narrowest this
Chrome window allows; confirm at 390 with `npm run screenshot:auth` during implementation.)

---

## 2. The shape: nine sections, three groups

`/admin` stops being one page. It becomes nine sections, grouped by the job they serve. Two of them (People and Messages) carry a detail route as well, so eleven routes in all.

```
WAITING              things that need you now
  Overview   /admin
  Messages   /admin/messages
  Reports    /admin/reports

THE COMMUNITY        the people and what they made
  People     /admin/people        + /admin/people/[id]
  Content    /admin/content
  Catch-ups  /admin/catchups

THE PLACE            the health of the thing
  Support    /admin/support
  Mail       /admin/mail
  Analytics  /admin/analytics     (stub, see 9.9)
```

The group labels are provisional copy and may change; the grouping is not. Three groups of three is
what makes nine rows scannable, and it mirrors the main sidebar's own split (nav rows, then the
account section).

### Why routes and not tabs

Three reasons, in order of weight:

1. **Each screen loads only its own data** (see 1.4). A tab bar over one server component does not,
   because the page has already run every query before the tab state exists.
2. **A section is linkable.** The Overview worklist points at a specific person, a specific thread,
   a specific report. The notification an admin gets already does this today with `?thread=<id>`,
   which becomes `/admin/messages/<id>` and stops being a query-string special case.
3. **Mobile drills in.** The nav swaps, `/admin` lists the sections, each one is a full page with a
   way back. That is the platform-native shape and it costs nothing to get.

---

## 3. Navigation: the sidebar swaps

Entering `/admin` replaces the main sidebar's `NAV` list with the admin list, plus a back row at the
top. The account chip, the hoopoe and the rail's material stay exactly as they are.

```
┌────────────────────┐    ┌────────────────────┐
│   [Rishi Valley]   │    │   [Rishi Valley]   │
│                    │    │                    │
│  Feed              │    │  ← Rishi Valley    │
│  Directory         │    │                    │
│  Collection        │    │  WAITING           │
│  Letters           │ →  │   Overview      3  │
│  Catch-ups         │    │   Messages      1  │
│  Support           │    │   Reports          │
│  About             │    │                    │
│                    │    │  THE COMMUNITY     │
│         🐦         │    │   People       49  │
│  My profile        │    │   Content          │
│  Reach out         │    │   Catch-ups        │
│  Admin        ●    │    │                    │
│  🐦 Sanan Shankar  │    │  THE PLACE         │
└────────────────────┘    │   Support          │
                          │   Mail             │
                          │   Analytics        │
                          │         🐦         │
                          │  🐦 Sanan Shankar  │
                          └────────────────────┘
```

### The rules

- **Reuse `NavRow`.** The admin rows are the same component as Feed and Directory, in the same
  marker group (`markerId="nav-desktop"`). The active marker is a `layoutId` pair, so it **glides**
  from the account section's Admin row up into the admin nav on entry, and back down on exit. That
  choreography is already the sidebar's own idiom (`sidebar.tsx`, the AccountSection comment); a
  bespoke rail would throw it away.
- **The back row is first, always.** `← Rishi Valley`, returning to `/feed`. This is the one cost of
  a drill-in nav and it is paid once, at the top, in one click.
- **The account section stays.** My profile / Reach out / Admin still sit at the bottom, so leaving
  admin never requires the back row if you were headed to your own profile anyway.
- **Counts are on the row, right-aligned, tabular.** A count appears only when it is greater than
  zero. A permanent `0` beside Reports is noise, and six of them is the current stat strip's
  mistake repeated in a new place.
- **The nav scrolls if it must.** Nine rows plus three labels plus the back row is roughly 650px on
  top of the logo and under the account block. That fits a 900px window and does not fit a 700px
  one, so the nav region takes `min-h-0 overflow-y-auto` the way the mobile drawer already does.
- **Mobile is the same swap** inside the existing left `Sheet`. `/admin` itself also lists the nine
  sections as rows, so the drawer is never the only way in.

### What this costs, stated honestly

While you are in admin you cannot jump straight to Directory. You go via the back row, or via the
account section. That is the standard drill-in trade and it is the reason the owner was offered a
second rail as an alternative; the swap was chosen because two vertical navs on one screen is worse.

---

## 4. The person row

### 4.1 The finding

`IdentityRow` (`src/components/common/identity-row.tsx`) is shared **geometry**, not shared
**content**. Every consumer passes its own `meta`, so adopting the component does not by itself make
two screens agree. The audit:

| Surface | Component | Subtitle |
|---|---|---|
| Post card | `IdentityRow` | batch, time ago |
| Directory | `ProfileCard` (bespoke) | batch, job title, city |
| Map drilldown | `IdentityRow` | batch, job title |
| Feed rail directory module | `IdentityRow` | batch (blank when unknown), city |
| Mention dropdown | `IdentityRow` | **hand-written** `` `Batch of '${...}` ``, not `batchLine` |
| Sidebar account chip | `IdentityRow` | batch, full year |
| Letters index | `IdentityRow` | its own `metaLine` call |
| Comments, messages, Catch-up pickers and panels | bare `BirdAvatar` | no shared row at all |
| Admin: verification overview | bare `BirdAvatar` | email, batch |
| Admin: message queue | bare `BirdAvatar` | kind label, thread title, last message |
| Admin: verification queue | **no avatar** | batch, email, admission no., years |
| Admin: users table | **no avatar** | two table columns |
| Admin: photo queue | **no avatar** | uploader name, date |

Four distinct components. Ten subtitle formulas. Admin uses the shared row zero times.

### 4.2 The rule, for admin

A new component, `AdminPersonRow`, wrapping `IdentityRow`. It **does not take a `meta` prop**, which
is the whole point: an admin surface cannot diverge because it has nowhere to put a different
subtitle.

```
🐦  Kavi Ullal                                    [Confirmed] [Verified]
    Batch of '23 · kavi.ullal@gmail.com
```

- **Avatar, always.** `BirdAvatar` at `size="sm"`, photo overriding bird, per the avatar rules.
- **Name is always the link to `/profile/[id]`.** The eye icon in the Actions column is deleted.
  Owner, verbatim: "I should just be able to click on their name to view profile."
- **Subtitle is always `batchLine(user)` then `email`, joined by `metaLine`.** Never job title,
  never city, never admission number, never a state. In admin the email *is* the identity: it is the
  login, the thing that gets confirmed, and the thing you search by. Elsewhere in the app it is
  private, which is why this rule is admin's and not the app's.
- **`batchLine`, never `formatBatch`.** This fixes a real bug already flagged and never closed:
  `src/components/admin/user-management.tsx:86` is the last `formatBatch` call in the codebase and
  renders **blank for every teacher** (`progress.md`, round 3: "an admin surface the owner did not
  name"). It is named now.
- **State lives in chips on the right**, and chips are the only thing that varies between sections.
  Identity never varies.
- **Two click targets, clearly different.** The name goes to the public profile. The rest of the row
  goes to `/admin/people/[id]`. Each section's own primary action (Verify, Approve) is a button on
  the row, so bulk triage never leaves the list.

### 4.3 The app-wide sweep

Not in scope. The owner chose "admin now, app-wide audit written up". The audit above is the
starting point; it lands as its own document (`docs/spec/person-row-audit.md`) with a recommended
target for each of the thirteen surfaces, so the sweep is a decided piece of work that can be
green-lit later rather than something started today.

---

## 5. Type, colour and density

### 5.1 Type

The rule: **the primary fact in any row is `--foreground`; at most one supporting line is muted.**
Today the panel inverts this, and 53% of its text is grey.

- **Nothing below 12px.** The type scale's smallest documented step is `label 0.75rem`. The 10.5px
  stat labels and 11px section headings go up to 12px, or stop being labels.
- **Labels stop carrying primary information.** A count is a foreground figure in the row it belongs
  to, not a grey uppercase caption under a number. The uppercase eyebrow survives only where it is
  genuinely a label over a group (the sidebar's three group headings), which is what the scale
  documents it for.
- **Section headings are no longer needed as navigation.** The sidebar carries that now, so a
  heading no longer has to shout and whisper at once. `AdminSection`'s 11px muted uppercase label is
  retired along with the single-page stack it existed to break up.
- **Tabular figures on every count**, as today. A count ticking 9 to 10 must not shift its own
  baseline box.

### 5.2 Colour

Straight from the design system, no invention:

- Chips use the approved tint trio, rotated so one screen never repeats a tint:
  `border-leaf/30 bg-leaf/[0.07] text-leaf`, the cinnamon equivalent, the sky equivalent. Plus
  `destructive` for the one state that is actually wrong. No `bg-canopy/10` decorative wash.
- **Canopy fill is reserved for selection**: the active sidebar row, a set filter pill, a segmented
  thumb. Nothing else.
- Hover and press are the `state-layer` utility, never an opaque token swap.
- Radius ladder holds: 16px cards, 12px inner panels and inputs, 8.8px thumbnails, pills for
  controls.
- Registers, so the panel is not one green page: **sky** is the administrative/system register (it
  already is, in `ModerationDialog`), **cinnamon** is the warm/waiting register, **leaf** is the
  confirmed/good register, **destructive** is failure only.

### 5.3 Density

Density is still the feature. The owner's 2026-08-04 note stands: "everything in the admin panel
can be more dense, very feature rich. So sparsely populated." Nothing in this spec loosens the
panel; it moves the density from one 2901px page into nine screens that each fit.

- Empty states stay one line of text, no bordered box. `AdminEmpty` survives.
- A section with nothing waiting shows one line and its sidebar row shows no count.

---

## 6. Data loading

- **Each route queries only what it renders.** No route re-fetches the `User` table three times.
- **The sidebar counts are one query.** A single `Promise.all` of counts, run in the admin layout
  (`src/app/(main)/admin/layout.tsx`), shared by every section so the rail is consistent and costs
  one round trip rather than nine.
- **Lists paginate.** `People` at 49 rows is fine today and is not fine at 500. Every list surface
  takes a cursor from the start, following the keyset pattern `loadPosts` already uses.
- **Threads do not nest their messages in the list query.** `/admin/messages` loads thread headers;
  `/admin/messages/[id]` loads that thread's messages. Today one page pulls 40 threads with every
  message in all of them.
- **Every route ships a `loading.tsx` using the warm shimmer**, per the house rule, not a grey
  pulse.
- **Every write goes through Prisma.** Never raw `pg`. `bugs.md` #6: `Post.createdAt` and friends
  are `timestamp without time zone`, and rows written via raw `pg` read back 5h30m ahead through
  Prisma. That entry names "a future import script, migration, or **admin tool**" as what will hit
  it. This is that admin tool.

---

## 7. Authorisation and the demo

Unchanged, and verified rather than assumed:

1. **Proxy.** `src/proxy.ts` closes `/admin` for the demo by prefix
   (`pathname === p || pathname.startsWith(p + "/")`), so every new `/admin/*` route is closed with
   no edit. Confirm `demo.test.mjs` still passes.
2. **Session.** The demo visitor's `role` is pinned to `member` whatever the row says, so `/admin`
   would redirect even if the proxy let it through.
3. **Prisma allowlist.** `ALLOWED_WRITE_MODELS` is default-deny, so every new admin write is born
   blocked on the demo. New models touched by this work (`Notification` for announcements) must be
   checked against that list deliberately rather than by accident.

Every new server action re-checks `role === "admin"` on the server through the existing
`requireAdmin()` guard in `src/components/profile/admin-actions.ts`. Nothing trusts the client.

The `write-path-reviewer` agent runs before any commit that touches an action, a route, auth,
uploads or the schema.

---

## 8. The capability audit

Twelve gaps. All twelve are approved for build (owner, 2026-08-18: "all of these are good, add any
others you find and organise them all nicely").

| # | Gap | Evidence |
|---|---|---|
| 1 | **Contributions ledger** | `Contribution` is live and taking money. No admin surface exists. `failureReason` is stored and never read. |
| 2 | **Content desk** | Removal already works from each card's own dropdown via `ModerationDialog`. What is missing is *finding* the thing. |
| 3 | **Admin notes** | `adminNote` is stored, fetched on every admin page load, and dropped. `UserRow` does not declare the field. |
| 4 | **Photo-trusted** | `photoTrusted` has zero UI in the codebase. `contributePhoto` reads it, so it works. Nobody can be granted it. |
| 5 | **Role promotion** | Same shape: `role` is read everywhere and settable nowhere. |
| 6 | **Edit a member's details** | The owner fixed a city, two name capitalisations and a bird override by hand-writing SQL in the week of 2026-08-18. The most-used admin operation, no interface. |
| 7 | **Blocked members** | Counted out of "Members", filtered out of the verification view, visible only as a red badge mid-table. No list, no undo path. |
| 8 | **Report history** | Only `status: "pending"` is ever queried. A dismissed report is unreachable forever. |
| 9 | **Mail failures** | `mailHealth()` returns three counts. `OutboundEmail.lastError` is recorded and never shown. No retry. |
| 10 | **Announcements** | `Notification.type` supports `"admin"`. Nothing in the app creates one. |
| 11 | **Post as the office account** | 11 curated stories were seeded via direct Postgres inserts as the Anonymous user. `FEATURES.md` asks for an official Alumni Office account. |
| 12 | **Merge duplicate accounts** | `FEATURES.md` names it. In an alumni directory a double signup is a matter of time. |

---

## 9. The sections

### 9.1 Overview (`/admin`)

**Not a stats scoreboard.** A worklist plus a health strip, in that order.

**The worklist** is one list of everything waiting, newest first, mixed across kinds: an unanswered
message, a flagged member, a pending report, a photo awaiting review, a failed send, a Catch-up past
its date. Each row carries the one action it needs inline and links through to its section for
anything more. When it is empty it says so in one line and the health strip becomes the page.

**The health strip** is the facts that are not jobs: members, new this week, mail sent today against
the cap, money in this month. Each one links to the section that owns it, which is what the current
stat strip fails to do (six counts, none clickable, three of them repeated as headings below).

**Constraint:** the hoopoe tour button lives here, in the `PageHeader` actions slot, gated on
`session.user.email === process.env.ADMIN_EMAIL`. `src/components/tour/tour-steps.ts` ends the tour
with "use 'hoopoe tour' in the Admin panel", and `manual-tour-entry.test.mjs` asserts the exact
`PageHeader` markup. That test is updated deliberately as part of this work, not broken in passing.

### 9.2 Messages (`/admin/messages`, `/admin/messages/[id]`)

The `AdminThread` inbox, as an inbox. Thread list with unanswered first (the existing
`[{ adminUnread: "desc" }, { lastMessageAt: "desc" }]` order is right), a thread on its own route
rather than expanding in place, and the sorted archive behind its existing disclosure.

The notification deep link `?thread=<id>` becomes `/admin/messages/<id>` and its mark-seen effect
becomes an ordinary page load rather than a mount-once ref guard.

Reuses `Conversation` and `MessageComposer` unchanged.

### 9.3 Reports (`/admin/reports`)

Pending and resolved, filterable. Separate from Content because `Report.targetType` is
`"post" | "user"`: a report can be against a person, so it spans People and Content and belongs to
neither.

New: **history**. Today `status: "pending"` is the only query, so you cannot see that the same
person has been reported five times. A report against a person also surfaces on their
`/admin/people/[id]` page as a count with a link.

`Report` has a back-relation to `AdminThread` (the conversation the reporter can follow), so a
report row links to its thread and back.

### 9.4 People (`/admin/people`, `/admin/people/[id]`)

**Replaces three sections**: Users, Verification, and Email & verification.

**The list.** One row per member, `AdminPersonRow`, with two chips: email state (Confirmed / Link
sent / Queued / Send failed / No link) and member state (Verified / Pending / Unverified /
Flagged). Both taxonomies already exist in `verification-overview.tsx` and are good; they are kept
verbatim, including the reasoning about which states actually need a human.

Filters use the **existing shared kit** (`src/components/common/filters/`): `FilterPopover` on
desktop, `FilterSheet` on mobile, `SentenceLine` carrying the active state on the count row so a
filter costs zero extra rows, `ResultCount`. Facets: needs a look, email not confirmed, not yet
verified, blocked, admins, teachers, batch range. The current bespoke pill row in
`verification-overview.tsx` is deleted; it reinvents the kit badly.

Search by name or email, server-side, cursor-paginated.

Row actions inline: **Verify** where that is the obvious next step, nothing otherwise. Everything
else is on the detail page.

**The detail page** (`/admin/people/[id]`), a page and not a dialog, because the design system is
explicit that a dialog is for something done in seconds and this is not. It holds:

- identity and standing, with both verification meanings side by side
- **the admin note**, editable (gap 3)
- **their details, editable**: name, city, batch, account type, bird override (gap 6). This is the
  hand-written-SQL replacement, so it must cover exactly what has actually been fixed by hand: name
  capitalisation, `currentCity` plus the `UserPlace` record behind it, and `birdOverride`. Writes go
  through the existing `updateUserPlaces` transaction, not raw SQL.
- their contributions, their content counts, their reports filed and received
- their mail history, with `lastError` where a send failed, and a retry
- the actions: verify, unverify, block, unblock, grant photo-trusted (gap 4), promote or demote
  (gap 5), merge into another account (gap 12), delete
- a link to their public profile

**Destructive actions get the shared `Dialog` material**, with a typed confirmation for delete and
merge. `window.confirm` is used twice in the current panel and is not the app's material.

`src/components/profile/admin-profile-tools.tsx` (the same tools embedded on a member's public
profile) and this page should share one component rather than drift into two.

### 9.5 Content (`/admin/content`)

New. One list of everything members have made: posts, letters, comments, photos. Type filter,
author filter, search, newest first.

The photo approval queue becomes the `Photos awaiting review` filter here rather than its own
section, and keeps its existing approve and decline actions. Approved photos are reachable too, so
something can be taken down after the fact (gap in the current panel: only unapproved is visible).

Removal reuses `ModerationDialog` and the existing `adminRemovePost` / `adminRemoveComment` /
`adminRemovePhoto` actions, note to the author included. This section builds no new moderation
machinery; it builds the missing way to find the thing.

Also here: **post as the office account** (gap 11) and **announcements** (gap 10). Both are
"the admin writes something everyone sees", they share a composer, and they are the same job.
Announcement writes a `Notification` of type `"admin"`; posting as the office account writes a
`Post` authored by the Anonymous user.

### 9.6 Catch-ups (`/admin/catchups`)

New. Six models, twenty server actions, a lifecycle
(`draft -> collecting -> answering -> preparing -> published`) with real deadlines, and **no cron**:
`advanceDueCatchups` runs lazily off whoever happens to load a page. A Round stuck in `collecting`
past `questionsCloseAt` is completely invisible today.

The section is deliberately small: a list of Catch-ups with their status, their current Round, its
deadline, its participation (prompts submitted, entries in), and a flag on anything past its date.
Read-mostly. The Keeper still runs their own Catch-up; this is oversight, not a second control
panel.

### 9.7 Support (`/admin/support`)

The contributions ledger (gap 1).

- **Split on `livemode`.** The public total on `/support` already filters `status: "paid",
  livemode: true` so a developer's localhost click cannot inch the bar. The ledger must honour the
  same split or the two surfaces disagree about how much money exists. Test payments are shown,
  clearly marked, never summed into the real total.
- Total against the goal, this month, all time.
- Every contribution: who (linked, `AdminPersonRow`), how much, method, when, status.
- **Failures are visible**, with `failureReason`, which is stored and currently read by nothing.
- `userId` is nullable with `SetNull`, so a contribution can outlive its account. Those rows render
  as an amount with no person, not as a crash.

### 9.8 Mail (`/admin/mail`)

The `OutboundEmail` queue as an operable thing rather than three numbers (gap 9).

- The budget: sent today against `DAILY_CAP`, and `nextBudgetResetAt()` as a real clock time.
- The queue: what is waiting, in send order (`priority` ascending, then `createdAt`), so it is
  visible that a password reset sorts ahead of a welcome.
- **The failures, individually**, with `lastError` and `attempts`, and a **retry**, which is the
  thing the panel most obviously lacks: today it tells you "1" and stops.
- A person's mail history also appears on their detail page, so the two views agree.

### 9.9 Analytics (`/admin/analytics`)

**Stubbed.** A registered route, a sidebar row, a page that says what it will be and does not
pretend to have numbers. The owner is building this separately; the job here is to reserve the slot
so it is not bolted on later.

What it will draw on, recorded now so the stub is useful:

- signups over time (`User.createdAt`), splits by `accountType`, `batchYear`, `verifyState`
- geography from `UserPlace`, which already denormalises lat/lng for exactly this kind of read
- content volume by `Post.kind`, plus `Comment`, `Like`, `CommentLike`, `PollVote`, `Bookmark`,
  `PhotoLove`
- Catch-up participation from `CatchupEntry` against membership
- giving from `Contribution`
- deliverability from `OutboundEmail`
- page views from PostHog, which is the only analytics tool here: `@vercel/analytics` was
  removed on 2026-08-26 rather than run a second one for the same number

**One schema gap to raise before that build, not after:** `lastSeenAt` on `User` was planned in the
roadmap's Phase 5 delta list and never added. "Who is actually still using this" is therefore the
one question the database cannot answer, and it is the first question an analytics hub gets asked.
Adding the column is cheap now and unbackfillable later. Flagged, not built here.

---

## 10. What is deliberately not built

- **Events** and **Invites / JoinRequest / Vouch** are in the roadmap and not in the schema. The IA
  has room for them (Events under The Community, Invites under People) and nothing is built
  speculatively.
- **Community vouching**, one of the three specced verification tracks, is not implemented; only
  `office_list` is. Out of scope here.
- **Manage batches and houses** (`FEATURES.md`) is low value against its cost and is not built.
- **The app-wide person-row sweep** is written up, not started (section 4.3).
- **A `/lab` room.** Recommended against and accepted in chat: lab rooms earn their keep when the
  question is "which of these looks right" on a surface members see. This is a private tool with one
  user and a functional brief, where the question is "does this let you do the job", which is better
  answered by building People for real and putting it in front of the owner.

---

## 11. Order of work

Each step ends with `npm run check`, desktop and mobile screenshots, and a commit. Nothing waits for
the end.

1. **Shell.** `/admin/layout.tsx`, the sidebar swap, all eleven routes as stubs, `loading.tsx` on each,
   the shared count query. Update `manual-tour-entry.test.mjs`.
2. **People.** The list, the filters on the shared kit, `AdminPersonRow`, the detail page, the edit
   tools, notes, photo-trusted, role, blocked. Kills three old sections and the `formatBatch`
   teacher bug. The biggest single win, so it lands first.
3. **Overview.** The worklist and the health strip, once there are sections to link into.
4. **Messages.** Route split, deep link migration.
5. **Content and Reports.** The find-and-remove surface, report history, announcements, office posts.
6. **Support, Mail, Catch-ups.**
7. **Analytics stub.**
8. **The person-row audit document.**
9. **Delete what is now dead**: `admin-stats.tsx`, `verification-overview.tsx`,
   `verification-queue.tsx`, `user-management.tsx`, and `admin-section.tsx` if nothing survives on
   it.

---

## 12. Definition of done

- Nine sections across eleven routes, each loading only its own data, each with a warm-shimmer `loading.tsx`.
- No admin screen taller than roughly two viewports at 1440x900.
- No text below 12px anywhere in admin. Muted text is a minority of the text on every screen.
- One person row component, no `meta` prop, used on every admin surface that shows a person.
- No horizontal scroll at 390px anywhere in admin; every destructive action reachable on a phone.
- All twelve capabilities in section 8 reachable from the panel.
- `npm run check` green: types, lint, the shape and colour protocol audit, the lab registry, the
  unit tests.
- `write-path-reviewer` clean on every action, route and schema change.
- `demo.test.mjs` green, and the three demo layers manually confirmed against `/admin/*`.
- Every write through Prisma. No raw `pg` anywhere in the admin path.
- Desktop and mobile screenshots, minimum two rounds each, compared in numbers.
- `/simplify` run before the final commit. Session logged in `progress.md`.

# Audit: the person row, across the app

**Status:** written 2026-08-19, alongside the admin rebuild (`docs/spec/admin.md`). This is an
audit and a proposal, not a change. **Nothing outside `/admin` has been touched.**

The owner, 2026-08-18:

> throughout the UI, we use the bird and the name and a subtitle for that name... we just do it in
> like a billion different ways, and it's totally inconsistent. That is, it's totally inconsistent
> from the content to the design of it.

He is right, and the admin panel was the worst offender, which is why admin was fixed first. This
document is the rest of it: every place the app draws a person, what it currently says, and what it
should say. It exists so the sweep is a decided piece of work that can be green-lit later, rather
than a thing somebody starts and abandons halfway.

---

## 1. The finding, in one sentence

`IdentityRow` is shared **geometry**, not shared **content**, so adopting it does not by itself make
two screens agree.

Every caller passes its own `meta`, and eight of them pass something different. Two more surfaces
(the Directory, and everything in Catch-ups and comments) do not use the component at all. That is
how one app ended up with four components and ten subtitle formulas over the same population.

---

## 2. The audit

| # | Surface | File | Component | Subtitle today |
|---|---|---|---|---|
| 1 | Feed post card | `posts/post-card.tsx` | `IdentityRow` | batch, time ago (`MetaDots`) |
| 2 | Letters index | `(main)/letters/page.tsx` | `IdentityRow` | its own `metaLine` |
| 3 | Letter detail | `(main)/letters/[id]/page.tsx` | `IdentityRow` | its own `metaLine` |
| 4 | Collection photo detail | `(main)/collection/[id]/page.tsx` | `IdentityRow` | its own |
| 5 | Map city drilldown | `directory/alumni-map.tsx` | `IdentityRow` | batch, job title |
| 6 | Feed rail, directory module | `feed/rail/directory-module.tsx` | `IdentityRow` | batch (blank when unknown), city |
| 7 | Mention dropdown | `posts/mention-dropdown.tsx` | `IdentityRow` | **hand-written** `` `Batch of '${...}` `` |
| 8 | Sidebar account chip | `layout/sidebar.tsx` | `IdentityRow` | batch, full year |
| 9 | Catch-up question/answer | `catchups/round/*.tsx` | `IdentityRow` | its own |
| 10 | **Directory card** | `directory/profile-card.tsx` | **bespoke** | batch, job title, city |
| 11 | **Comments** | `posts/comments-section.tsx` | **bare `BirdAvatar` (34px)** | time ago only, no shared row |
| 12 | **Messages conversation** | `messages/conversation.tsx` | **bare `BirdAvatar` (36px)** | time ago only, no shared row |
| 13 | **Catch-up people picker** | `catchups/create/people-picker.tsx` | **bare `BirdAvatar` (xs)** | varies by list |
| 14 | **Catch-up people panel** | `catchups/home/people-panel.tsx` | **bare `BirdAvatar` (xs)** | varies by list |
| — | Admin, five surfaces | `components/admin/*` | **fixed 2026-08-19** | `AdminPersonRow`, one rule |

Four components. Ten subtitle formulas. Avatar sizes of xs / 34 / 36 / sm / md, four of them
hand-typed pixel values rather than size tokens.

---

## 3. Two bugs the audit turned up

**3.1 is FIXED (`07e28d8`). 3.2 was fixed and then REVERTED by the owner the same day**, and is
now a recorded exception rather than an outstanding bug. Both are kept here with their diagnosis,
because each explains a trap the next person can fall into. The sweep in section 4 is still not
started.

### 3.1 The mention dropdown hand-wrote the batch line (fixed)

`posts/mention-dropdown.tsx` built `` `Batch of '${String(user.batchYear).slice(-2)}` `` by hand
instead of calling `batchLine()`.

**Correction to this document's first draft**, which said teachers were the victims: they are not,
because `/api/users/search` excludes them outright. The real trigger is any account with no batch
year at all, where `String(null).slice(-2)` is `"ll"` and the row reads **"Batch of 'll"**.
Reproduced against the live database: the **Anonymous** account, which every curated story is
posted as, so it came up for anybody typing `@anon`.

Two things let it through. `MentionUser` typed `batchYear` as `number` while the column is `Int?`,
so TypeScript never saw `null` reach a string. And the component's correctness depended on a
`where` clause in a different file. The fix calls `batchLine()`, types the field nullably, and has
the endpoint return `accountType` so the row is right on its own terms.

Same class as the bug the admin rebuild closed (`user-management.tsx:86`, the last `formatBatch`
call, blank for every teacher). Both call sites are now gone.

### 3.2 `IdentityRow`'s default meta style is below the type scale (NOT A BUG, owner call)

`META_CLASS` is `text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground`.
Both the size and the tracking sit under the smallest documented step (`label 0.75rem` at
0.08-0.16em). Seven surfaces inherit it: the feed byline, the letters index and reader, a
Collection photo, the map drilldown and the feed rail.

It was raised to `text-[12px] font-medium uppercase tracking-[0.08em]` on 2026-08-19 and
**reverted the same day** on the owner seeing it: "revert bug two. it's fine how it was before."

**This is now a decision, not drift.** The scale's floor is a floor for text that has to be READ;
this line is glanced at, under a name that has already said who somebody is, and at 10.5px it
stays a texture rather than becoming a second line competing with the name. The reasoning lives in
a comment on the constant itself, because anyone re-deriving it from the scale will arrive at 12px
again and think they have found a bug.

The sidebar's own 11px override stands for the same reason: a deliberate owner tuning.

By the same call, the letter card's `LETTER · 3 MIN READ` eyebrow and the feed rail's
`Did you know` heading stay at 10.5px too. They were flagged as a follow-up sweep; that sweep is
cancelled.

---

## 4. The proposal

### 4.1 The rule

**A person row's subtitle answers "who is this", and never "what is happening to them."**

State (verified, blocked, waiting, new, sorted) goes in a chip or a badge beside the row. Time,
which is about the CONTENT and not the person, goes in the content's own line. This is the rule
admin now enforces structurally, by refusing a `meta` prop.

### 4.2 What the subtitle should be, per context

Three contexts, three fixed formulas. Not per-screen taste.

| Context | Subtitle | Which surfaces |
|---|---|---|
| **Browse** (you are looking for somebody) | batch, job title, city | 5, 6, 10 |
| **Byline** (somebody made this thing) | batch, time ago | 1, 2, 3, 4, 9, 11, 12 |
| **Pick** (you are choosing from a list) | batch only | 7, 13, 14 |
| **Admin** | batch, email | already done |

The sidebar chip (8) stays as it is: it is about YOU, it is not a row in a list, and the owner
specifically asked for the full year there on 2026-08-02.

### 4.3 The components

Four wrappers over `IdentityRow`, each owning its own content and each refusing a `meta` prop, the
same way `AdminPersonRow` does:

- `PersonBrowseRow` — replaces the bespoke `ProfileCard` internals and surfaces 5 and 6
- `PersonByline` — surfaces 1, 2, 3, 4, 9, and gives 11 and 12 a shared row for the first time
- `PersonPickRow` — surfaces 7, 13, 14
- `AdminPersonRow` — shipped

`IdentityRow` stays exactly what it is: shared geometry. It just stops being called directly.

### 4.4 Avatar sizes

Retire the hand-typed pixel values (34, 36) in favour of the tokens (`xs` 28, `sm` 40, `md` 64,
`lg` 104). If 34 and 36 are genuinely needed, they are a missing token, not a per-file decision.

---

## 5. Order, and what it costs

1. ~~Fix §3.1~~ **Done** (`07e28d8`).
2. ~~Fix §3.2~~ **Cancelled.** Tried, reverted, and now a recorded exception. Do not revisit.
3. Build the three wrappers, convert surface by surface, screenshotting each.
4. Delete the direct `IdentityRow` calls and the bespoke `ProfileCard` lockup.

Which leaves steps 3 and 4 as the actual sweep, and they still need the owner's go-ahead.

Step 3 is the sweep proper. It needs the owner's go-ahead, because it touches the feed, the
directory, comments, messages, letters, the Collection, Catch-ups and the map in one pass, and
those are most of the surfaces members actually look at.

**And it inherits the lesson from §3.2: a rule in the design system is not a mandate to change
something that already works.** The sweep's job is to make the subtitles agree on WHAT THEY SAY.
It should carry the existing type treatment across unchanged.

**The directory's density measurements must survive it.** `directory/profile-card.tsx` carries a
measured argument for its lockup (people per 1000px of column, at 1440 and at 390, across four
densities) and the owner picked the result. `PersonBrowseRow` has to reproduce that, not replace it
with a fresh guess.

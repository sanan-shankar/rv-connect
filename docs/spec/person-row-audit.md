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

Both are real and both are cheap. Neither is fixed here.

### 3.1 The mention dropdown hand-writes the batch line

`posts/mention-dropdown.tsx:93` builds `` `Batch of '${String(user.batchYear).slice(-2)}` `` by hand
instead of calling `batchLine()`. So a **teacher** in the mention list reads `Batch of 'ed` (from
`undefined`) or an empty line, depending on the value, rather than "Teacher". `batchLine()` exists
precisely to know about `accountType` and is already unit-tested for exactly this case.

This is the same class of bug as the one the admin rebuild just closed
(`user-management.tsx:86`, the last `formatBatch` call, which rendered blank for every teacher).
One call site left.

### 3.2 `IdentityRow`'s default meta style is below the type scale

`identity-row.tsx:12` sets `META_CLASS` to
`text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground`.

10.5px is below the design system's smallest documented step (`label 0.75rem` = 12px). Every caller
that does not override `metaClassName` inherits it. This was 18 of the elements measured on the old
admin panel and is the reason `AdminPersonRow` overrides it.

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

1. Fix §3.1, the mention-dropdown teacher bug. Ten minutes, and it is a live wrong-output bug
   regardless of whether the sweep ever happens.
2. Fix §3.2, `IdentityRow`'s default meta to 12px. One line, but it changes eight surfaces at once
   and needs screenshots at both viewports.
3. Build the three wrappers, convert surface by surface, screenshotting each.
4. Delete the direct `IdentityRow` calls and the bespoke `ProfileCard` lockup.

Steps 1 and 2 are worth doing on their own merits. Step 3 is the sweep and needs the owner's
go-ahead, because it touches the feed, the directory, comments, messages, letters, the Collection,
Catch-ups and the map in one pass, and those are most of the surfaces members actually look at.

**The directory's density measurements must survive it.** `directory/profile-card.tsx` carries a
measured argument for its lockup (people per 1000px of column, at 1440 and at 390, across four
densities) and the owner picked the result. `PersonBrowseRow` has to reproduce that, not replace it
with a fresh guess.

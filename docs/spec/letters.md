# Spec: letters

> **What is live in this document, and what is not. Rewritten 2026-09-08.**
>
> **Live: §2 (Letters), §5.1 (the `Post` delta that carries them) and §6's reuse map.** Letters
> shipped from those and the reasoning still holds.
>
> **Not live: everything about "Roundups".** The recurring newsletter was built as **Catch-ups**,
> per `docs/ROADMAP.md`'s explicit rejection of "Roundups", and `docs/spec/catchups.md` is its
> spec. The `Roundup*` model family here never existed; the shipped one is `Catchup`,
> `CatchupEdition`, `CatchupPrompt`, `CatchupEntry`, `CatchupEntryLove` and `CatchupPref`
> (`prisma/schema.prisma`). **The banner that stood here named a third set —
> `CatchupIssue`/`CatchupQuestion`/`CatchupAnswer` — which catchups.md §6 says outright do not
> exist.** A supersession banner is itself a dated claim and rots like the body it annotates.
>
> **§0, §1, §3, §4, §5.2, §5.3, §7 and §8 were deleted on 2026-09-08** and replaced by a line each
> saying where the answer lives. They were ~300 of this file's 430 lines, and they described
> Groups (removed from the product), a `datasource provider = "sqlite"` (three stack generations
> ago) and a Render Cron tick (never built). `git log --follow -- docs/spec/letters.md` has them.

# Newsletter Feature and Long-Form Post Type — Design Spec

Written 2026-07-01 for two related but distinct surfaces: the recurring newsletter (our Letterloop
equivalent) and the long-form post type. Both shipped, under the names §1 settled on.

---

## 0. Letterloop research: the parity target

**Deleted 2026-09-08.** It was a 34-line condensation of `docs/planning/letterloop-research.md`,
which is 376 lines of the same research and is what `docs/spec/catchups.md` actually cites. Read
that.

## 1. The naming collision

**Deleted 2026-09-08.** It argued a collision between two meanings of "Letters" and recommended a
name. That was decided in July 2026 and locked in `docs/spec/DESIGN-SYSTEM.md` §8: **Letters** are
the long-form post type, **Catch-ups** are the recurring newsletter.

## 2. The long-form post type ("Letters")

### 2.1 What it is and where it is written

A Letter is **not a new model**; it is a `Post` with a distinguishing tag/kind. This is the single most important reuse decision: the owner explicitly wants "one shared post-composer and one shared feed component used across the main feed and all group feeds." A Letter must therefore be authored through the **same composer** (`src/components/posts/create-post-form.tsx`) and rendered through the **same card** (`src/components/posts/post-card.tsx`), just in a long-form *mode*. Treating it as a separate model would fork the composer and the feed, which is exactly what the brief forbids.

Concretely, a Letter can be written anywhere the shared composer appears: the **main feed** and **every group feed**. In v2 the composer already advertises this with the `<Feather/> Letter` chip. Selecting that chip switches the composer into long-form mode rather than opening a different editor.

### 2.2 How a Letter differs from a normal post

| Aspect | Normal post | Letter |
|---|---|---|
| Length | short, soft-capped, current 5000-char limit | long, raised cap (see below) |
| Title | none | optional **title** line (renders as a heading) |
| Composer | inline textarea that grows to 4 rows | full-height editor mode (modal or expanded sheet) with the existing bold/italic toolbar still available |
| Feed rendering | full content (with the seven-line "Read more" fold already in `post-card.tsx`) | **collapsed preview card** in the feed: title + first ~2 lines + "Read this letter" → opens a dedicated reading view. It must NOT dominate the feed. |
| Reading view | n/a (read in place) | a focused `/letters/[id]` route with serif body, generous measure, the author header, and comments/likes reused |

**The line between the two is 300 words** (owner, 2026-09-17; `LETTER_MIN_WORDS` in
`src/lib/utils.ts`). It is advice, never a rule the server enforces. Past it, the feed composer shows
"This is turning into a longer piece. It might make a lovely letter." with Keep as a post / Make it a
letter, which switches the same composer in place. Publishing a letter under it opens a dialog, Post it
instead / Publish as a letter; posting it instead keeps the title as a bold opening line
(`withTitleAsOpeningLine`, and `publishDraft(id, { asPost: true })` for a saved draft). Seeded content
follows the line strictly: that was the point of it.

### 2.3 How it renders without dominating the feed (decision)

The owner's stated fear: at 600 posts/month the feed gets cluttered, and a long essay inline would swamp everything around it. Decision:

- **In any feed (main or group), a Letter renders as a compact "letter card," never expanded inline.** It shows: a small `Feather` glyph + "Letter" label, the **title**, an author header (reusing the shared avatar + batch line from `post-card.tsx`), a 2–3 line dek/excerpt, estimated read time ("4 min read"), and a single primary affordance ("Read this letter"). Likes/comments counts show on the card; the full thread lives in the reading view.
- This is a visual variant of the existing `Card`, styled like the v2 ruled-sheet entries so it sits in the same sheet as ordinary posts without breaking rhythm. It is taller than a one-liner but bounded (think 1.5–2 post-heights), so it reads as "a featured entry," not "a wall of text."
- **The full Letter opens at `/letters/[id]`** (or `/feed/letter/[id]`), a reading-optimized page: Libre Baskerville-adjacent serif for the body is acceptable here even though body text is normally Source Sans 3, because a Letter is explicitly a reading context; ~66ch measure; `line-height: 1.7` per the project's typography guardrail. The existing `CommentsSection` and like button are reused verbatim at the bottom.

### 2.4 Composer changes (reuse, not rewrite)

The existing `create-post-form.tsx` already has: rich-text bold/italic via `wrapSelection`, `@`-mentions via `MentionDropdown`, image upload to `/api/upload`, polls, tags, and a 5000-char counter. To make it produce a Letter:

- The `Letter` chip (already present in v2) toggles `kind: "letter"` local state. When on:
  - Reveal an optional **Title** input above the textarea.
  - Switch the textarea to a taller editor (e.g. expand to a modal/sheet using the existing `Dialog`/`Sheet` UI primitives in `src/components/ui/`) so long writing is comfortable.
  - Raise the character cap for letters (see schema delta; propose 20000) and update the counter accordingly.
  - Disable the Poll affordance in letter mode (a Letter is prose, not a poll). Image upload and mentions stay enabled.
- On submit, `createPost` sets `kind = "letter"` and `title`. Everything else (image handling, mention encoding `@[name](id)`, `revalidatePath`) is unchanged.

### 2.5 Feed integration and the clutter problem

`loadPosts` in `feed/actions.ts` already supports `search` and pagination. (Written when it also took `tag`, `sortBy` and `timeFilter` and paged by offset. `tag` never shipped; paging is keyset now; the sort and time filters were deleted on 2026-09-07, having been unreachable on screen since June.) Letters slot into this with **zero new query plumbing** because they are `Post` rows. Two additions:

- A **"Letters" filter** in the existing tag/sort UI so people can see only long-form pieces (maps to `where: { kind: "letter" }`).
- Because Letters are sparse and high-effort, optionally surface the **latest Letter** in the right rail (the v2 rail already hosts "Coming up," "New in the directory," "Your groups"; add a "Latest letter" card). This keeps essays discoverable without letting them dominate the chronological sheet.

### 2.6 Edge cases (Letters)

- **Empty title:** allowed; the card falls back to the excerpt as its heading.
- **Letter with images:** images render in the reading view, not on the feed card (card shows at most one small thumbnail).
- **Editing:** reuse `editPost`; the edit dialog must show the title field when `kind === "letter"`.
- **Deletion / reporting / hiding:** unchanged — `deletePost`, `ReportDialog`, and `isHidden` all already operate on `Post`. **The controls shipped 2026-09-08** (owner's campaign question 15): Report, Edit and Delete sit in a menu on the byline row of the reading page, `src/components/letters/letter-menu.tsx`, item for item the same as the feed card's own header menu. **No server-side code was needed** — every one of the four actions already took a letter, because a letter is a `Post`. Edit splits deliberately: a draft is a link to the `/letters/[id]/edit` desk, a published letter opens the shared dialog.
- **Mentions and notifications:** unchanged; `@`-mentions in a Letter behave like in any post.
- **Group Letters:** a Letter written in a group feed is scoped to that group (see §5 on unifying `GroupPost` into `Post`).

---

## 3. The recurring newsletter feature

**Deleted 2026-09-08, along with §4's cross-batch variant.** Ninety-eight lines specifying a
`Roundup` that belongs to a `Group`, in a product that no longer has Groups. The feature shipped as
Catch-ups and its spec is `docs/spec/catchups.md`; the lifecycle, cadence and reminder design in
particular were carried over there rather than lost.

## 5. Prisma data model

### 5.1 Long-form Letters — minimal delta on `Post`

No new model. Two columns on the existing `Post` (SQLite-safe, nullable, backward compatible):

```prisma
model Post {
  // ...existing fields...
  kind   String  @default("post")   // "post" | "letter"
  title  String?                     // used only when kind == "letter"
  // content reused as the letter body; raise app-level cap to 20000 for letters
}
```

`validators.ts` `postSchema` gains:
```ts
kind: z.enum(["post", "letter"]).default("post"),
title: z.string().max(160).optional(),
// content max becomes conditional: 5000 for "post", 20000 for "letter"
```
`createPost`/`editPost` pass `kind`/`title` through; `loadPosts` needs no change (Letters are already returned; add an optional `where: { kind }` filter for the "Letters" feed tab). `PostData` in `post-card.tsx` gains `kind` and `title` so the card can switch to the compact letter variant.

### 5.2 Recurring Catch-ups — the models

**Deleted 2026-09-08.** 108 lines of `Roundup*` models, ending with a note that "the schema stays
the same SQLite-local / Postgres-prod shape" and that "the `datasource` provider in the current
schema is hardcoded `sqlite`". Neither is true of anything since 2026-07-01. The shipped models are
in `prisma/schema.prisma` and explained in `docs/spec/catchups.md` §6.

### 5.3 Folding `GroupPost` into `Post`

**Deleted 2026-09-08.** It recommended a nullable `Post.groupId`. That shipped, and then Groups was
removed from the product, so the column stopped being written: 0 of 20 rows carry one, the code
stopped setting it on 2026-09-07, and the removal SQL is in `prisma/migrations-manual/` unrun. **The
column still exists.**

---

## 6. Reuse map (what each feature borrows from existing code)

| Need | Reused from |
|---|---|
| Letter authoring | `create-post-form.tsx` (composer in "letter" mode); `wrapSelection` rich-text, `MentionDropdown`, `/api/upload`, char counter |
| Letter feed card + reading view | `post-card.tsx` variant; the shared avatar, `Card`, `CommentsSection`, `renderRichText`, `formatTimeAgo`, like button all reused |
| Letter feed queries / pagination / filters | `loadPosts` in `feed/actions.ts` (add `kind` filter; pagination + `targetBatches` audience already there) |
| Letter audience (cross-batch) | existing `targetBatches` field + filter — no new feature |
| Roundup answering (text) | extract `wrapSelection` toolbar from the composer; shared textarea pattern |
| Roundup answering (photo) | `/api/upload` + preview UI from `create-post-form.tsx` |
| Catch-up membership / privacy | proposed against `Group`/`GroupMember`, both since removed from the product; a Catch-up is scoped by batch instead |
| Roundup notifications (in-app) | `Notification` model + `notification-bell.tsx` (new `type` values only) |
| Roundup reminders / publish emails | **new**: Render Cron (`/api/roundups/tick`) + Resend transactional templates |
| Compiled issue + Letter reading view | shared serif reading-view shell; `CommentsSection`, the shared avatar |
| List add/remove animations (prompts, answers) | `@formkit/auto-animate` (already in stack) |
| Visual language | v2 ruled-sheet + `.glass`/`v2-card` styling, brand tokens (`--primary` green, `--blue` #3F7CA6, `--cinnamon`), LiftKit golden-ratio spacing |
| Delight | hoopoe template — e.g. hoopoe peeking when a Roundup deadline is near, or a feather flourish when a Letter publishes (spread to 2–3 spots, never intrusive) |

---

## 7. New backend infrastructure, and the build order

**Deleted 2026-09-08.** §7 called for a **Render Cron** tick at `/api/roundups/tick`; the app is on
Vercel and Catch-ups advance on a Vercel scheduled job. §8's build order has been executed. Both are
history; `docs/spec/catchups.md` describes what was built.

---

Files this spec was grounded in, as they stood on 2026-07-01. Several have since gone with Groups;
they are named as history, not as places to look: the schema, the composer and post card, the
feed's actions, `src/lib/validators.ts`, the group feed and group page, and the locked v2 design
(now `/lab/v2`).

Letterloop research sources:
- [letterloop.co](https://www.letterloop.co/), [How Letterloop works](https://help.letterloop.co/en/articles/12-how-letterloop-works), [Manage & Submit Questions](https://help.letterloop.co/en/articles/6-manage-and-submit-questions), [Customizing Your Issue](https://help.letterloop.co/en/articles/67-customizing-your-issue), [Send Extra Reminders](https://help.letterloop.co/en/articles/57-send-extra-reminders), [FAQs](https://www.letterloop.co/faqs), [Hands-on review (jaredsbryson.com)](https://www.jaredsbryson.com/blogs/review-group-newsletters-with-letterloop)
# Spec: letters

> **Naming update (2026-07-01):** The newsletter feature is being built under the name **"Catch-ups"**, per `docs/ROADMAP.md`'s explicit rejection of "Roundups." The `Roundup`/`RoundupIssue`/`RoundupQuestion`/`RoundupAnswer`/`RoundupPref` model family and "Roundup(s)" naming throughout this document are **superseded** by `docs/spec/catchups.md`'s `Catchup`/`CatchupIssue`/`CatchupQuestion`/`CatchupAnswer`/`CatchupAnswerLove`/`CatchupPref` models. The underlying feature design (cadence, lifecycle windows, reminders) is not otherwise contradicted — only the name and model family changed.

I now have a complete, grounded picture of the codebase, the shared composer/feed patterns, the v2 design language, and Letterloop's full feature set. I have everything needed to write the exhaustive spec.

---

# Newsletter Feature and Long-Form Post Type — Design Spec

This is the design and decision document for two related but distinct surfaces: the recurring **newsletter feature** (our Letterloop equivalent) and the **long-form post type**. The owner flagged that "Letters" is overloaded between these two; resolving the naming collision is the first decision below.

---

## 0. Letterloop research: the parity target

Synthesized from letterloop.co, its help center, the FAQs, and a hands-on third-party review. This is the feature surface we measure ourselves against.

**Core loop.** A newsletter owner creates a "Letterloop," invites people by email, and picks a set of questions. Each cycle (issue), every member gets an email prompting them to answer within a window (default **7 days**). Letterloop compiles all the answers into one beautifully formatted newsletter and emails it to the whole group. Answering is **entirely email/web-based** — no account or app strictly required (members can answer by replying through the web flow). All questions are **optional**; a member who answers nothing is still listed in the issue.

**Questions.**
- Owner/admin curates the question set per issue. Each cycle Letterloop **suggests** a few questions; the owner can swap them, edit them, or add their own.
- A library of **600+ curated questions** organized into ~13 themed sets (Evergreen Topics, On The Self, On Childhood, On Career, On Relationships, On Wisdom, On Parenting, What If?, Mad Libs, Most Likely To, Team Icebreakers, etc.).
- **Members can submit questions** for upcoming issues, via three entry points: a "Submit Question" button on the issue dashboard, an email prompt sent 1 day after each issue is delivered, and a button at the bottom of each issue. The owner approves/includes them.
- Questions are **drag-to-reorder**. Sections beyond plain questions exist: "New Obsessions," a "Photo Wall," etc. Question/answer types include free text and **photo** answers (the Photo Wall). The review and product copy reference photos and "extras"; song/Spotify-style extras are positioned as add-on prompt types rather than a guaranteed primitive.

**Cadence and scheduling.**
- Frequency is configurable from **weekly to quarterly** (weekly, biweekly, monthly, quarterly are the common presets; biweekly is the de facto default in practice). Owners can also run it **manually/spontaneously** ("send the next round when the conversation cools").
- Owner controls the send day (the reviewer moved their issue from Mondays to Fridays).

**Reminders.**
- On issue open, every member is prompted. Non-responders get up to **3 automated "gentle nudge" reminders** before the deadline.
- The owner can **manually trigger extra reminders** to people who have not yet replied (issue → ⋯ menu → "Send Extra Reminders").
- Reminders go by email or push depending on each member's notification settings; members control their own reminder preferences.

**Compiled issue and archive.**
- The compiled issue groups answers (typically by question, with each person's answer under it, plus the Photo Wall). It is delivered to inboxes and also viewable on the web app, where **past issues are archived** and browsable by the group.
- The issue is customizable before publish: editable title, sections, question order, intro, preview before sending.

**Members, privacy, limits.**
- Up to **50 members** per Letterloop. One person can own/run **unlimited** Letterloops.
- Replies and photos are visible **only to invited members**. No third-party data sharing, no ads.
- Commercial limits (not relevant to us): first 2 issues free, then a single ~$3/mo subscription covers all of an owner's Letterloops.

**What we adopt for parity:** owner-curated question sets with a starter library, member-submitted questions, configurable cadence + manual send, a deadline window, automated multi-nudge reminders plus a manual "nudge non-responders" button, optional questions, a compiled issue with text + photo answers, a per-group browsable archive, and member-level notification control. **What we drop:** the standalone-email-only participation model (we already have authenticated accounts and a notification system, so participation happens in-app), the 50-member cap and per-issue paywall (irrelevant to a private alumni network), and "push notifications" (no native app in MVP).

---

## 1. The naming collision (decision required, recommendation given)

"Letters" currently maps to two different things in the owner's brief and even appears as a nav item and a composer chip in `src/app/preview/v2/page.tsx` (`{ icon: Feather, label: "Letters" }` and the `<Feather/> Letter` composer chip). These must become two intuitive, non-colliding names.

The two concepts:
1. **A long-form post type** — one person writes a single extended piece (an essay, a reflection, a tribute, a travelogue). It lives in a feed like any other post; it is authored once by one person.
2. **A recurring compiled newsletter** — a group of people each answer prompts on a cadence, and their answers are compiled into a periodic issue. It is many-authored, scheduled, and archived.

The defining difference: **one voice, written once** vs. **many voices, compiled on a schedule.** The names should encode that.

**Naming options considered**

| Long-form post type | Recurring newsletter | Verdict |
|---|---|---|
| "Letters" | "Letterloop" | Reject. Both contain "Letter"; collides exactly as the owner warned. Also "Letterloop" is the competitor's trademark. |
| "Essays" | "Letters" | Workable but "Essay" feels academic/stiff for a tribute or a travel note. |
| **"Letters"** | **"Roundups"** | Strong. "Letters" perfectly fits a single long-form personal piece (a letter to the valley); "Roundup" clearly means "many people, gathered, periodically." No shared root. |
| "Letters" | "Dispatches" | "Dispatch" leans single-author/journalistic, muddying the "many voices" idea. |
| "Letters" | "Circulars" | Too bureaucratic; "circular" reads as an official notice. |
| "Letters" | "The Valley Roundup" / branded | Good as a default *issue title*, but the feature noun should stay generic so each group can name its own. |

**Recommendation: long-form = "Letters", recurring newsletter = "Roundups".**

Rationale:
- "Letter" is exactly the right register for a single, considered, personal long-form piece in a school-alumni context (a letter home, a letter to a teacher, a letter to the valley). It also lets us keep the `Feather` icon already chosen in v2.
- "Roundup" is plain-English for "we gathered everyone's answers." It implies recurrence and multiplicity without any overlap with "Letter." It maps cleanly onto the school idiom ("the Krishna House roundup," "the Class of '09 roundup").
- Distinct icons reinforce the split: `Feather` (Lucide) for Letters, `Newspaper` / `MailOpen` for Roundups (the v2 nav already uses `Newspaper` for the main Feed, so use `MailOpen` or `Mailbox` for Roundups to avoid clashing).

Everywhere below, **Letter** = the long-form post type and **Roundup** = the recurring newsletter. A single compiled instance of a Roundup is an **issue** (e.g. "Krishna House Roundup, Issue 4").

---

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
| Feed rendering | full content (with a 300-char "Read more" clamp already in `post-card.tsx`) | **collapsed preview card** in the feed: title + first ~2 lines + "Read this letter" → opens a dedicated reading view. It must NOT dominate the feed. |
| Reading view | n/a (read in place) | a focused `/letters/[id]` route with serif body, generous measure, the author header, and comments/likes reused |

### 2.3 How it renders without dominating the feed (decision)

The owner's stated fear: at 600 posts/month the feed gets cluttered, and a long essay inline would swamp everything around it. Decision:

- **In any feed (main or group), a Letter renders as a compact "letter card," never expanded inline.** It shows: a small `Feather` glyph + "Letter" label, the **title**, an author header (reusing the existing `UserAvatar` + batch line from `post-card.tsx`), a 2–3 line dek/excerpt, estimated read time ("4 min read"), and a single primary affordance ("Read this letter"). Likes/comments counts show on the card; the full thread lives in the reading view.
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
- **Deletion / reporting / hiding:** unchanged — `deletePost`, `ReportDialog`, and `isHidden` all already operate on `Post`.
- **Mentions and notifications:** unchanged; `@`-mentions in a Letter behave like in any post.
- **Group Letters:** a Letter written in a group feed is scoped to that group (see §5 on unifying `GroupPost` into `Post`).

---

## 3. The recurring newsletter feature ("Roundups")

### 3.1 The core relationship: a Roundup belongs to a Group

Decision: **a Roundup is always owned by a Group.** This is the cleanest mapping of Letterloop's "small set of people" onto our existing structure — a Group already *is* a bounded, invited membership with a chat/feed (`Group`, `GroupMember`, `GroupPost`). The owner's brief says exactly this: "a group has a chat/feed; a member can spin up a recurring newsletter from it."

Consequences:
- A Roundup's **recipient/participant set = the Group's members.** No separate invite list to maintain; joining the group joins the roundup, leaving the group removes you. This reuses `GroupMember` entirely and sidesteps Letterloop's 50-member ceiling.
- A Group can have **more than one** Roundup (e.g. a monthly catch-up *and* a quarterly "where are they now"). So the relation is Group `1—*` Roundup.
- Privacy is inherited: a Roundup issue is visible only to group members, exactly as group posts are gated in `groups/[id]/page.tsx` (`isMember` check). No new privacy model needed.
- Any **group admin can create/run a Roundup** (the `GroupMember.role === "admin"` we already have). We can optionally let any member propose one that a group admin confirms, but MVP: group admins create.

This is a deliberate scoping decision worth stating plainly: **we are not building standalone Roundups that exist outside a group.** If two people want a private roundup, they make a small private group first. This keeps one membership concept in the app instead of two.

### 3.2 IA and routes

```
/groups/[id]                      group home (existing feed) — gains a "Roundups" tab/section
/groups/[id]/roundups             list of this group's roundups + archive of past issues
/groups/[id]/roundups/new         create a roundup (admin)            [admin only]
/groups/[id]/roundups/[rid]       a roundup's home: schedule, members, next deadline, past issues
/roundups/[rid]/issues/[iid]/answer   the prompt-answering screen for the current open issue
/roundups/[rid]/issues/[iid]      the compiled, published issue (reading view)
```

A top-level nav entry is **not** added for Roundups in MVP; they live under Groups, reinforcing the "spun up from a group" mental model. (The v2 nav's `Feather`/"Letters" item becomes the Letters surface, not Roundups.)

### 3.3 The Roundup lifecycle (states)

A Roundup cycles through issues. Each **issue** moves through states:

1. **`draft`** — admin is assembling questions for the next issue (or it is auto-seeded from suggested questions per cadence).
2. **`collecting`** — issue is open; members are prompted to answer; the **deadline** is set. This is the window (default 7 days, configurable).
3. **`published`** — deadline passed (or admin published early); answers compiled into the issue; notifications + email sent; issue is now in the archive and read-only.
4. **`skipped`** — admin chose to skip this cycle (Letterloop parity: "send when the conversation cools").

State transitions are driven by **scheduled jobs** (see §4) and by explicit admin actions ("Open now," "Publish now," "Skip this issue").

### 3.4 Questions and prompt submission

Mirrors Letterloop:

- Each issue has an ordered list of **prompts** (`RoundupQuestion` rows). An admin curates them in the `draft`/`collecting` phase. We ship a **starter prompt library** (a static JSON seed of themed prompts adapted to RV: "On the valley," "On the years after," "What you're reading," "A teacher who mattered," "A photo from the year," etc.) so an admin can assemble an issue in seconds. This is our equivalent of the 600-question library, scoped down for MVP (a curated ~60–100 is enough).
- **Prompt types:** `text` (default), `longtext`, and `photo` (the "photo wall" answer). A `song`/link type is an easy later addition (just a URL answer rendered as a link/oembed card) but is **not** required for MVP parity given even Letterloop treats it as an extra.
- **Member-submitted prompts:** any group member can suggest a prompt for the next issue from the roundup home or from a published issue's footer (Letterloop's three entry points collapse to two for us: roundup home + issue footer). Suggested prompts land in a `suggested` bucket; the admin includes or ignores them when curating the next `draft`. This reuses the same `RoundupQuestion` table with a `status` field.
- Prompts are **drag-to-reorder** (use the existing `@formkit/auto-animate` already in the stack for the list transition).

**Prompt submission / answering UI.** This is the one genuinely new authoring surface, but it is built from existing primitives:
- The answer screen lists each prompt with an input below it. `text`/`longtext` reuse the same textarea + bold/italic toolbar pattern from the shared composer (extract the `wrapSelection` rich-text helper so both the post composer and the answer screen use it — a clean reuse win). `photo` prompts reuse the exact `/api/upload` flow and preview UI already in `create-post-form.tsx`.
- All prompts are **optional** (Letterloop parity). A member can save a partial set of answers and return before the deadline; answers are editable until the issue publishes.
- A member who answers nothing is **still listed** in the published issue as "didn't write in this time" (parity with Letterloop's "still included").

### 3.5 Cadence options (decision)

Presets, stored on the Roundup: **`weekly`, `biweekly`, `monthly`, `quarterly`, `manual`.** This matches Letterloop's "weekly to quarterly" plus the spontaneous mode.
- For automated cadences the system computes the next issue's open date and deadline from the cadence + a configured **send day** and **answer window** (default 7 days).
- `manual` means no auto-scheduling; an admin clicks "Start next issue" whenever they like.
- Realistic default for an alumni network where people check infrequently: **monthly**, 10–14 day answer window. (Weekly would fatigue this audience; the brief explicitly notes people "check infrequently.")

### 3.6 Deadlines and automated email reminders (this is the new backend)

This is the part that adds real infrastructure beyond what the app has today. Be explicit about it:

- **Scheduled jobs are required.** Today the app has none. Roundups need a periodic worker that, on each run: opens issues whose start date has arrived (`draft → collecting`), sends "new issue is open" notifications, fires reminder nudges to non-responders as the deadline approaches, and publishes/compiles issues whose deadline has passed (`collecting → published`). On Render this is a **Render Cron Job** (the deploy is moving to Render per the brief) hitting an internal authenticated endpoint, e.g. `POST /api/roundups/tick` guarded by a secret header, run every 15–60 min. (If any window stays on Vercel, the equivalent is Vercel Cron.) State the dependency clearly to the owner: **Roundups cannot ship without a scheduler.**
- **Transactional email via Resend is required.** The brief says magic links are being removed, but **Resend stays as the transactional email provider** for: "new issue open," up to **3 graduated reminders** before the deadline (e.g. T-5d, T-2d, T-12h to non-responders only), "issue published — read it" to everyone, and "your roundup needs questions" to the admin if a `draft` is empty as its open date nears. Each email is a Resend template; the compiled-issue email is the richest one (it can contain the issue itself or a link to the web reading view). Note for the owner: this is **added transactional-email volume and a second reason to keep Resend configured** even after magic links go.
- **Manual reminders.** Parity with Letterloop's "Send Extra Reminders": the roundup home shows a roster of who has/hasn't answered, with a "Nudge people who haven't written" button (admin only) that fires the reminder email/notification on demand.
- **In-app reminders too.** Reuse the existing `Notification` model (`type` gains values like `roundup_open`, `roundup_reminder`, `roundup_published`) so the existing `notification-bell.tsx` surfaces roundup activity with no new UI. Email and in-app stay in sync.
- **Member notification control.** Add per-member roundup notification preferences (mute a roundup, or "remind me by email vs. in-app only"). MVP-minimal: a single "email me about this roundup" toggle stored on the membership.

### 3.7 The compiled issue and the per-group archive

- When an issue publishes, the system **compiles** all answers into a read-only issue document. Layout decision: **grouped by prompt** (each prompt as a heading, then every member's answer beneath it with their `UserAvatar` + name), followed by a **Photo Wall** section aggregating all `photo`-type answers. This matches Letterloop's structure and reads well at a glance. The issue has an editable **title** (default "{Group name} Roundup · Issue {n}") and an optional admin **intro** note.
- The compiled issue renders at `/roundups/[rid]/issues/[iid]` using the same reading-view shell as a Letter (serif, wide measure, comments reused). It is **also emailed** to all members via Resend.
- **Per-group archive:** `/groups/[id]/roundups/[rid]` lists every past issue as browsable cards (Issue 1…N, with date and a one-line stat like "9 of 14 wrote in"). This is the exact "archive" Letterloop offers, scoped to the group. Because everything is rows in our DB (not just emails), the archive is fully searchable and permalinkable — an improvement over Letterloop's email-first model.

### 3.8 Edge cases (Roundups)

- **Nobody answers before the deadline:** publish anyway with whatever exists (even zero answers) or auto-extend once? Decision: **publish on deadline regardless**, listing everyone, to keep the rhythm; the admin can optionally extend the deadline once from the roundup home before it passes.
- **Empty draft at open time:** do not open an empty issue; instead notify the admin "add questions to open Issue n" and hold in `draft`. Auto-seed suggested prompts if the admin has enabled "auto-fill from library."
- **Member joins mid-cycle:** they can answer the currently-`collecting` issue; they are not retroactively added to already-`published` issues.
- **Member leaves the group:** their already-published answers remain in past issues (historical record); they stop receiving prompts. Hard-delete of a user cascades via existing `onDelete: Cascade` relations.
- **Editing answers:** allowed while `collecting`, locked at `published`.
- **Admin deletes a roundup:** cascades to its issues, questions, and answers (Prisma `onDelete: Cascade`); past-issue emails already sent are obviously unaffected.
- **Two roundups, same group, overlapping deadlines:** allowed; notifications name the roundup to disambiguate.
- **Scale:** issues and answers are bounded per group (members × prompts), so this never contributes to the 600-posts/month feed-clutter problem — Roundups live off the main feed entirely.

---

## 4. Cross-batch Letters / cross-batch Roundups (the owner's skeptical idea — clarified, recommend dropping)

The "cross-batch letters" idea most likely means one of:
1. **A long-form Letter explicitly addressed across batches** (e.g. "an open letter from the Class of '04 to the Class of '24"). This is already fully expressible: it is just a Letter (long-form post) whose audience targeting spans batches. The `Post` model already has `targetBatches`, and `loadPosts` already filters on it (`targetBatches: { contains: userBatch }`). **No new feature is needed**; if anyone wants a cross-batch letter, they write a Letter and either leave it untargeted (everyone sees it) or target multiple batches. So as a *distinct* feature it is redundant.
2. **A Roundup whose participants are drawn from multiple batches** (e.g. "alumni who were in Krishna House across all years"). This is *also* already expressible: make a Group with cross-batch membership and run a Roundup in it. Groups are not batch-bound; `Group`/`GroupMember` have no batch constraint. So again, **no new mechanism is required** — it falls out of "Roundups belong to Groups."

**Recommendation: drop "cross-batch Letters" as a named feature.** It is not a third thing; it is a property of the two features we are already building (audience targeting on Letters, arbitrary membership on Roundup-bearing Groups). Folding it in avoids a confusing third concept and matches the owner's own skepticism. The one thing worth surfacing in the UI to honor the *intent*: when composing a Letter, expose the existing `targetBatches` control as an "Address this letter to…" audience picker (all / specific batches), so the cross-batch *gesture* is available without a separate feature.

---

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

### 5.2 Recurring Roundups — new models

```prisma
model Roundup {
  id            String   @id @default(cuid())
  groupId       String
  title         String                          // "Krishna House Roundup"
  description   String?
  cadence       String   @default("monthly")    // weekly|biweekly|monthly|quarterly|manual
  sendDay       Int?                             // 0-6 day-of-week for auto cadences
  answerWindow  Int      @default(10)            // days the issue stays open
  autoFill      Boolean  @default(false)         // auto-seed prompts from the library
  isActive      Boolean  @default(true)
  creatorId     String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  group   Group           @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator User            @relation("RoundupCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  issues  RoundupIssue[]
  prefs   RoundupPref[]
}

model RoundupIssue {
  id          String    @id @default(cuid())
  roundupId   String
  number      Int                               // 1,2,3...
  title       String?                           // overrides default "Issue n"
  intro       String?                           // admin note at top of compiled issue
  status      String    @default("draft")       // draft|collecting|published|skipped
  opensAt     DateTime?
  deadline    DateTime?
  publishedAt DateTime?
  createdAt   DateTime  @default(now())

  roundup   Roundup            @relation(fields: [roundupId], references: [id], onDelete: Cascade)
  questions RoundupQuestion[]
  answers   RoundupAnswer[]

  @@unique([roundupId, number])
}

model RoundupQuestion {
  id           String   @id @default(cuid())
  issueId      String
  text         String
  type         String   @default("text")        // text|longtext|photo|link
  position     Int
  status       String   @default("included")    // included|suggested
  submittedById String?                          // set when member-suggested
  createdAt    DateTime @default(now())

  issue       RoundupIssue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
  submittedBy User?           @relation("QuestionSubmitter", fields: [submittedById], references: [id], onDelete: SetNull)
  answers     RoundupAnswer[]
}

model RoundupAnswer {
  id         String   @id @default(cuid())
  issueId    String
  questionId String
  authorId   String
  body       String?                             // text/longtext/link answer
  images     String?                             // JSON array, reuses existing image pattern
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  issue    RoundupIssue    @relation(fields: [issueId], references: [id], onDelete: Cascade)
  question RoundupQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  author   User            @relation("AnswerAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@unique([questionId, authorId])               // one answer per person per question
}

model RoundupPref {
  id           String  @id @default(cuid())
  roundupId    String
  userId       String
  emailMe      Boolean @default(true)            // email reminders for this roundup
  muted        Boolean @default(false)

  roundup Roundup @relation(fields: [roundupId], references: [id], onDelete: Cascade)
  user    User    @relation("RoundupPref", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roundupId, userId])
}
```

Back-relations to add on existing models:
```prisma
model Group {
  // ...
  roundups Roundup[]
}

model User {
  // ...
  createdRoundups   Roundup[]         @relation("RoundupCreator")
  roundupAnswers    RoundupAnswer[]   @relation("AnswerAuthor")
  submittedQuestions RoundupQuestion[] @relation("QuestionSubmitter")
  roundupPrefs      RoundupPref[]     @relation("RoundupPref")
}
```

`Notification.type` (a free-string field already) gains: `roundup_open`, `roundup_reminder`, `roundup_published`, `roundup_question` — no schema change, just new values, so `notification-bell.tsx` works unchanged.

Note: there is **no Render-specific Prisma change** — the schema stays the same SQLite-local / Postgres-prod shape; only the deploy target moves. The `datasource` provider in the current schema is hardcoded `sqlite`; the production switch to Postgres on Render is an env/provider concern, not a Roundup concern.

### 5.3 Optional consolidation: fold `GroupPost` into `Post`

This is adjacent but strongly recommended given the brief's "one shared feed component" mandate. Today `GroupPost` is a parallel, thinner model than `Post` (no likes, comments, polls, tags) and `group-feed.tsx` reimplements a whole composer + card that duplicates `create-post-form.tsx` and `post-card.tsx`. To deliver the owner's "one composer, one feed everywhere," add a nullable `groupId` to `Post` and retire `GroupPost`:

```prisma
model Post {
  // ...
  groupId String?
  group   Group?  @relation(fields: [groupId], references: [id], onDelete: Cascade)
}
model Group { posts Post[] }   // replaces GroupPost[]
```

Then `loadPosts` filters `groupId: null` for the main feed and `groupId: id` for a group, and Letters work identically in both places for free. This is the change that makes "a member can write a Letter in a group, and spin up a Roundup from that group" a coherent, low-duplication story. Flag it as a recommended refactor that should land *before or with* Letters, since Letters in groups otherwise have to be re-plumbed through the legacy `GroupPost`.

---

## 6. Reuse map (what each feature borrows from existing code)

| Need | Reused from |
|---|---|
| Letter authoring | `create-post-form.tsx` (composer in "letter" mode); `wrapSelection` rich-text, `MentionDropdown`, `/api/upload`, char counter |
| Letter feed card + reading view | `post-card.tsx` variant; `UserAvatar`, `Card`, `CommentsSection`, `renderRichText`, `formatTimeAgo`, like button all reused |
| Letter feed queries / pagination / filters | `loadPosts` in `feed/actions.ts` (add `kind` filter; pagination + `targetBatches` audience already there) |
| Letter audience (cross-batch) | existing `targetBatches` field + filter — no new feature |
| Roundup answering (text) | extract `wrapSelection` toolbar from the composer; shared textarea pattern |
| Roundup answering (photo) | `/api/upload` + preview UI from `create-post-form.tsx` |
| Roundup membership / privacy | `Group`, `GroupMember`, `isMember`/`isAdmin` checks in `groups/[id]/page.tsx` |
| Roundup notifications (in-app) | `Notification` model + `notification-bell.tsx` (new `type` values only) |
| Roundup reminders / publish emails | **new**: Render Cron (`/api/roundups/tick`) + Resend transactional templates |
| Compiled issue + Letter reading view | shared serif reading-view shell; `CommentsSection`, `UserAvatar` |
| List add/remove animations (prompts, answers) | `@formkit/auto-animate` (already in stack) |
| Visual language | v2 ruled-sheet + `.glass`/`v2-card` styling, brand tokens (`--primary` green, `--blue` #3F7CA6, `--cinnamon`), LiftKit golden-ratio spacing |
| Delight | hoopoe template — e.g. hoopoe peeking when a Roundup deadline is near, or a feather flourish when a Letter publishes (spread to 2–3 spots, never intrusive) |

---

## 7. New backend infrastructure this introduces (call-outs for the owner)

1. **A scheduler.** Roundups require a recurring job (Render Cron → authenticated `/api/roundups/tick`) to open issues, send reminders, and publish on deadline. The app has none today. This is the single biggest net-new dependency and Roundups cannot function without it.
2. **Transactional email via Resend stays.** Even though magic-link auth is being removed, Resend must remain configured to send roundup open/reminder/publish emails. New email volume = (members × issues × up to ~5 emails/issue), bounded per group.
3. **A prompt library seed.** A static, curated set of RV-flavored prompts (one JSON seed file, ~60–100 prompts in themed sets) to make issue creation instant. No model change beyond `RoundupQuestion`.
4. **No scheduler/email needed for Letters at all** — Letters are pure `Post` rows and ship with zero new infrastructure. This is why Letters should ship first and Roundups second.

---

## 8. Suggested build order

1. **`GroupPost → Post` consolidation** (recommended refactor) so the composer/feed are truly shared.
2. **Letters**: `kind`/`title` columns, composer letter-mode, compact feed card, `/letters/[id]` reading view, "Letters" feed filter. No new infra.
3. **Roundups data model + group-scoped CRUD**: create roundup, curate prompts, answer screen, member-suggested prompts, compiled-issue reading view, per-group archive — all usable with **manual** cadence first (admin clicks "open"/"publish"), which needs no scheduler.
4. **Roundups automation**: Render Cron tick + Resend reminder/publish emails + per-member notification prefs. This converts manual roundups into truly recurring ones and reaches full Letterloop parity.

---

Relevant existing files grounding this spec (all absolute):
- `/Users/sanan/Documents/rv-connect/prisma/schema.prisma`
- `/Users/sanan/Documents/rv-connect/src/components/posts/create-post-form.tsx`
- `/Users/sanan/Documents/rv-connect/src/components/posts/post-card.tsx`
- `/Users/sanan/Documents/rv-connect/src/app/(main)/feed/actions.ts`
- `/Users/sanan/Documents/rv-connect/src/lib/validators.ts`
- `/Users/sanan/Documents/rv-connect/src/components/groups/group-feed.tsx`
- `/Users/sanan/Documents/rv-connect/src/app/(main)/groups/[id]/page.tsx`
- `/Users/sanan/Documents/rv-connect/src/app/preview/v2/page.tsx`

Letterloop research sources:
- [letterloop.co](https://www.letterloop.co/), [How Letterloop works](https://help.letterloop.co/en/articles/12-how-letterloop-works), [Manage & Submit Questions](https://help.letterloop.co/en/articles/6-manage-and-submit-questions), [Customizing Your Issue](https://help.letterloop.co/en/articles/67-customizing-your-issue), [Send Extra Reminders](https://help.letterloop.co/en/articles/57-send-extra-reminders), [FAQs](https://www.letterloop.co/faqs), [Hands-on review (jaredsbryson.com)](https://www.jaredsbryson.com/blogs/review-group-newsletters-with-letterloop)
# Spec: profile

> **THE SHIPPED PROFILE IS REJECTED, 2026-07-25. Read `docs/planning/profile-concepts-brief.md`
> before doing any profile work.**
>
> The owner's verdict on the page this spec produced: "the profile version we have is like the
> main reason I feel like I can't ship this", and on being asked what to build instead, "I am
> actually stumped, I can tell you what I like and what I don't like". Three fresh concepts are
> in `/preview/delight/profiles` (`passport`, `broadsheet`, `terrace`); the brief above is the
> rule set they were built to.
>
> Specific reversals against what is written below and what shipped:
> - The decorative leaf watermark is out. ("Everyone hated that.")
> - No dashed or dotted rules anywhere on the profile.
> - No gradient fade from the header photo into the card. ("A definite no-go.")
> - The header photo must not be a magnified sliver. The shipped band is ~6.4:1 over a 3:2 or
>   1:1 source, showing roughly a quarter of the frame at about 5x. Give the picture a frame
>   whose aspect is close to the source, and set an explicit `object-position`.
> - Email and phone must NOT sit next to the name. They belong behind "Get in touch".
> - Valley years render as `2014-2023`. Never append a year count.
> - **About is the first and default tab**, not Posts.
> - Hover never moves a control anywhere in the app. Colour change only.
> - The houses chain must hold ten houses. When it wraps, it now runs as a serpentine with a
>   180 turn at each row end, so no arrow ever points into empty space (the owner's own idea).
>   Reference implementation: `src/app/preview/delight/profiles/_houses-trail.tsx`.
> - No dead white space at 1440 or 1920, and a clear reading order at 390.
>
> Still binding: the CTA decisions in section 3, the admission-number privacy question in
> section 4 (note the owner has since treated it as public but understated), the contact-link
> model in section 5, and the guardrails in section 13.

I now have everything I need. I have grounded the spec in the real schema (no `house`, no `avatarImage`, no teacher/memory/verified fields exist yet), the real profile page, the directory card, the shared `UserAvatar`, `formatBatch`, `PostCard`, and the locked v2 preview. Here is the spec.

---

# Profile Page — Redesign & Data Model Spec

Owner: Profile area. Status: decision-bearing. Grounded in `prisma/schema.prisma`, `src/app/(main)/profile/[id]/page.tsx`, `src/components/directory/profile-card.tsx`, `src/components/common/user-avatar.tsx`, `src/components/settings/settings-form.tsx`, `src/components/posts/post-card.tsx`, and the locked design `src/app/preview/v2/page.tsx`.

## 0. What exists today (the honest baseline)

- The live profile page (`profile/[id]/page.tsx`) is a plain three-`Card` stack: a header card, a flat "info grid" that dumps every non-null field into a 2-column list (`infoItems.filter(value)`), and a posts list using `PostCard`. No cover photo, no tabs, no rail. It looks nothing like v2.
- The v2 preview is the locked design: cover card, bird avatar with ring, batch-line, bio, soft tags, a stats strip, tabbed main column (Posts / About / Photos), and a right rail with Details / Contact / Groups cards.
- The schema `User` has: `bio`, `currentCity`, `workplace` (mislabeled "Industry" in the form), `jobTitle`, `phone`, `instagram`, `linkedin`, `batchType`, `batchYear`, `yearJoined`, `yearLeft`, `admissionNumber`, `avatarColor`. There is **no** `house`, **no** `avatarImage`, **no** teacher flag, **no** social links beyond Instagram/LinkedIn, **no** memory/about-section split, **no** verified marker.
- `formatBatch()` ignores `batchType` entirely and returns `Batch of 'YY`. So the public header should never surface ISC/ICSE as a visible token; it is data, not chrome.
- `UserAvatar` is initials-only (`avatarColor` background). The v2 bird glyph and photo override do **not** exist in the real shared avatar yet.

Every decision below states the delta against this baseline.

---

## 1. The two avatar realities, and the one shared component

> **Superseded 2026-07-02.** This section's premise (`UserAvatar` initials-only vs a v2 bird
> `Avatar`, needing convergence) predates the actual convergence. `src/components/common/
> user-avatar.tsx` no longer exists in the codebase; it has already been replaced by
> `src/components/profile/profile-avatar.tsx` (profile-specific wrapper) plus the shared
> `src/components/common/bird-avatar.tsx` / `bird-avatar-v2.tsx` (50-species deterministic-hash
> system, see `docs/spec/avatars.md`, the canonical avatar doc). There is no `birdVariant`
> prop/column and no 0..2 variant scheme; species/colour/pose are all derived from salted
> FNV-1a hashes over the user id (`src/lib/avatar.ts`). The convergence work this section calls
> for is done, just not in the exact shape described below. Kept for history.

The brief says "reuse shared avatar." There are currently **two** avatar implementations: the real `UserAvatar` (initials) and the v2 `Avatar` (bird glyph + photo + ring). They must converge into **one** shared `UserAvatar` before the profile is built, because the profile is the single place where all three avatar modes (photo, bird, ring) appear at once.

**Decision: extend `src/components/common/user-avatar.tsx` to the superset, do not fork a profile-only avatar.**

New props:
- `photo?: string | null` — when present, render the uploaded image (object-cover, rounded-full). Photo always wins over bird/initials.
- `birdVariant?: number` — 0..2, picks the `BirdGlyph` path from v2. Default avatar is a **bird**, not initials (locked decision: "bird avatars as default + photo upload override"). Derive a stable variant from the user id hash so a given person always gets the same bird.
- `ring?: boolean` — adds the `4px solid var(--surface)` border for the cover overlap.
- Keep `avatarColor` as the bird's background tint and eye color (v2 passes `color` as both fill background and `eye`).
- `size` gains an `xxl` (104px) for the cover; v2 uses `size={104}`.

Initials remain only as the **final** fallback if a user somehow has no color (legacy rows). Order: photo -> bird (default) -> initials.

This single component is consumed by: the profile cover, the rail "Groups" rows, the directory `ProfileCard`, the feed `PostCard`, the composer, and the navbar user chip. One change, every surface updated.

---

## 2. Header / cover — the specific fixes

### 2.1 Avatar must not be cut off
v2 sets `.cover-top .v2-av { margin-top:-52px }` with a `104px` avatar pulled up over a `160px` cover photo. With `align-items:flex-end` on `.cover-top`, the avatar's bottom aligns to the name baseline, which on narrow widths and with the `4px` ring can clip the top of the avatar against the cover-photo's gradient edge.

**Decision:**
- Cover photo height `176px` (up from 160) so the negative-margin overlap leaves the full avatar visible. The avatar (104 + 4px ring = 112 box) sits with `~56px` above the fold and `~56px` below, fully inside the card.
- The avatar wrapper gets `position: relative; z-index: 2` so it always paints above the cover gradient `::after`.
- On mobile (<=720), switch `.cover-top` to `flex-direction: column; align-items: flex-start`, avatar `margin-top:-46px`, name and meta stack below at full width. No clipping because nothing is side-by-side.
- `overflow: hidden` stays on the cover card for the rounded photo, but the avatar is allowed to overlap because it is inside `.cover-body` (which is **not** clipped), not inside `.cover-photo`. Verify the avatar lives in `cover-body`, pulled up by negative margin, never as a child of the clipped `.cover-photo`.

### 2.2 Tighten name to batch spacing
v2 has `.cover-meta { margin-top:5px }` under an `h2` with `line-height:1.1`. The visual gap reads larger than 5px because the serif `h2` has internal leading. **Decision:** name `h2` `line-height:1.05`, `margin:0`; meta `margin-top:3px` (LiftKit `2xs`-ish optical tightening). The name and batch should read as one stacked unit, roughly 3 to 4px apparent gap.

### 2.3 Header line = batch, location, profession (NOT house)
Current v2 cover-meta reads: `Batch of '09 · Krishna House · Bengaluru`. The brief removes house from the public line.

**Decision — the public header meta line is exactly:**
```
Batch of '09  ·  Bengaluru  ·  Biology teacher
```
- Batch via `formatBatch()` (already house-agnostic).
- Location = `currentCity` (with a `MapPin` only if you want one icon; keep it textual to avoid icon soup, the directory card already uses the pin so reuse that pattern).
- Profession = `jobTitle` (fall back to `workplace` industry if `jobTitle` empty, e.g. "Works in Education").
- Each segment renders **only if present**; the `·` separators collapse so you never get a leading/trailing dot or a double dot. Implement as `[batch, city, profession].filter(Boolean).join(' · ')` at render, not hardcoded dotseps.
- House is collected and stored, surfaced only in the Details card (private-ish, see 4) and in the directory filters, never in the public header line.

### 2.4 Remove glows
v2 `.v2-btn-primary` has `box-shadow:0 8px 18px -10px var(--primary)` (a green glow) and `.v2-card` carries a heavy `0 20px 40px -30px rgba(0,0,0,.5)` drop. The brief says "remove glows."

**Decision:**
- Primary button on the profile: drop the colored glow, use a single neutral layered shadow consistent with the rest of the app's restrained system: `0 1px 2px rgba(0,0,0,.05), 0 4px 12px -8px rgba(30,40,32,.25)`. No `--primary`-tinted shadow.
- Cover card: keep a soft single-direction shadow, not the deep `-30px` spread. Color-tint at very low opacity per CLAUDE.md ("Layered, color-tinted at low opacity. Never flat shadow-md"), but no halo around interactive elements.
- Avatar ring stays (it is a border, not a glow).

### 2.5 Stats strip
Current: `42 posts · 5 groups · In the valley 2003 to 2009`. Brief: drop "5 groups", keep posts and the valley years.

**Decision — stats strip is exactly two items:**
```
42 posts        In the valley 2003 to 2009
```
- "posts" count from `_count.posts` (real).
- "In the valley {yearJoined} to {yearLeft}" only renders if **both** years exist. If only one or neither is set, render the surviving one as "In the valley from 2003" / "Left in 2009", and if neither, **drop the whole item** rather than show a half-empty stat. Never show "In the valley undefined to undefined."
- Groups count moves into the rail's Groups card header (e.g. "Groups (5)"), where it is contextually relevant, instead of competing as a vanity stat.
- This also fixes the "AI picks exactly N" smell at the stats level: two real, meaningful numbers beat three padded ones.

---

## 3. Primary CTA — recommendation

The brief flags "Message?" as unclear and asks for a recommendation.

**Context that decides this:** there is **no DM / messaging system** in the schema (no `Message`, `Thread`, `Conversation` model) and the owner explicitly said this is "NOT a WhatsApp/Facebook replacement." Shipping a "Message" button that opens nothing, or that silently mails them, is the worst option. So:

**Decision — the primary CTA depends on whose profile it is:**

- **Own profile:** primary CTA is **"Edit profile"** (leaf/primary), linking to `/settings`. Secondary ghost: **"View as visitor"** (renders the public-facing version so people can preview what others see, since house/admission are hidden). This replaces the small `outline` "Edit profile" button buried under the bio today.

- **Someone else's profile:** the primary action is **"Connect"** with an explicit, honest meaning, NOT a fake chat. Recommended behavior, in order of preference:
  1. **Primary: "Get in touch"** — opens a small popover/sheet listing the contact methods the person has actually exposed (email, phone, socials, site). It is a deterministic, no-new-infra action that surfaces the Contact card's data at the top of the page. This matches the product's real purpose (a directory for reconnection) without pretending to be a messaging app. Label it "Get in touch", not "Message", because there is no inbox.
  2. **Secondary ghost: "Save contact"** — generates and downloads a `.vcf` (vCard) from the public fields (name, batch, city, profession, email/phone if shared, socials as URLs). This is genuinely useful for a directory and needs zero backend. v2 already shows a "Save contact" ghost button, so this is reusing an existing affordance, just wiring it up.
  3. Defer a real DM/"Message" feature to post-MVP. If the owner later wants in-app messaging, "Get in touch" becomes the entry point that flips to opening a thread, so the label still reads correctly.

- **Visibility guard:** if the viewed person has shared **no** contact methods at all, "Get in touch" is disabled with helper text "This member hasn't shared contact details yet." Never render a primary CTA that leads to an empty state.

Rationale: every CTA must resolve to something real (CLAUDE.md: "Every clickable element needs hover, focus-visible, active. No exceptions" — and by extension, a destination). "Get in touch" is honest about being a directory, reuses the Contact data, and is forward-compatible with a future inbox.

---

## 4. Details card — the right set (killing the "exactly three" smell)

v2's Details card has exactly three facts (House, At RV years, City) and v2's live page dumps *every* field into one flat grid. Both are wrong: one is artificially trimmed, the other is undifferentiated. The fix is to make the set **complete and grouped**, and to let it be **variable-length** (it grows with how much the person filled in), which is what naturally defeats the "AI always picks three" look.

**Decision — Details card contents, in this order, each rendered only when present:**

1. **At RV** — `In the valley {yearJoined}-{yearLeft}` (the years-attended range). Always shown if any year exists.
2. **Batch** — `ISC 2009` / `ICSE 2007` (here we *do* spell out `batchType`, because the Details card is the canonical record, unlike the public header line which uses the short `Batch of '09`).
3. **House** — e.g. "Krishna House." Collected per the owner's "house per year" data goal, surfaced here (not in the header). See 4.1 on per-year houses.
4. **Section** — class section(s), e.g. "Sections: A, then C" (new field, see model).
5. **Based in** — `currentCity`, optionally `homeCity` if different ("Originally from / now in"), see model.
6. **Profession** — `jobTitle` at `workplace`/industry, e.g. "Biology teacher · Education." Reuse the directory's Briefcase pattern.
7. **Role at RV** — only for teachers: a "Taught here" / "Teacher" line, optional subject and years taught (see teacher fields in model). This is how the product distinguishes alumni from past/present teachers without a separate page.
8. **Member since** — `createdAt` ("On RV Alumni since Mar 2026"). Low-priority, render last, optional.

**Explicitly NOT in the public Details card: `admissionNumber`.** Admission number is **private** (brief). Store it, show it only to (a) the owner on their own profile, and (b) admins via `AdminProfileTools`. It is a verification datum, not a public fact. Render it in a faint, clearly-labeled "Private to you" subgroup at the bottom of the owner's own Details card, never on others' profiles.

This produces a card that is typically 4 to 7 rows depending on completeness, with admission number gated. The variability is the point: it reads as "this person's actual record," not "three bullets the AI generated."

### 4.1 House-per-year (the owner wants rich house data)
A single `house` string cannot express "Krishna in junior school, then moved to senior house." The owner explicitly wants **house per year**.

**Decision:** model houses as a small related table (`UserHouse`, see Section 7), each row = `{ house, fromYear?, toYear?, isPrimary }`. The Details card shows the **primary** house as one line by default ("Krishna House"), with a subtle expander "(houses over the years)" that reveals the timeline only if there is more than one. This keeps the card un-cluttered (one line by default) while preserving the full data the directory and "person in focus" feature can use. If a user only ever picks one house, it is just one line, no expander.

---

## 5. Contact card — labeled, any number of links

v2's Contact card hardcodes three rows (Message / site / LinkedIn) and the schema only has `instagram` + `linkedin`. The brief wants phone, email, and **any number** of social links each with a **clear human label of where it goes**.

**Decision — Contact card is a list of typed, labeled links built from real data:**

Fixed rows (rendered if present and if the viewer is allowed to see them, see privacy below):
- **Email** — `Mail` icon, label "Email", value = the email; `mailto:` link. Respect a per-user "show email" toggle.
- **Phone** — `Phone` icon, label "Phone", value = number; `tel:` link. Respect a "show phone" toggle.

Variable social rows — a **`UserLink` related table** (Section 7), one row per link, each with:
- `kind`: `instagram | facebook | twitter | linkedin | website | other`
- `label`: a human label of *where it goes*, e.g. "My photography on Instagram", "Studio website", "Personal blog". This is the brief's "clear human label" requirement, made first-class instead of guessed.
- `url`: the destination.

Rendering: each row shows the kind's icon (Lucide `Instagram`, `Facebook`, `Twitter`, `Linkedin`, `Globe`; `Link` for other), the **label** as the primary text, and the host (e.g. `instagram.com/ananya`) as faint secondary text so users know exactly where a click goes before clicking. All open `target="_blank" rel="noopener noreferrer"`. URLs normalized (prepend `https://` if missing), Instagram handles normalized to a full URL (the live page already does `https://instagram.com/${value.replace('@','')}` — reuse that normalizer in a `socialUrl(kind, value)` util).

There is **no fixed limit** of three; the list is `user.links` of arbitrary length, with an empty state ("No links shared yet") on the owner's own card and the row simply omitted on others'.

**Migration note:** existing `instagram` and `linkedin` string columns are backfilled into `UserLink` rows (`kind=instagram`, `kind=linkedin`, label defaulted to "Instagram"/"LinkedIn") and then the two columns are retired in a follow-up migration. Keep them readable during the transition; the spec's settings form writes only to `UserLink` going forward.

### 5.1 Privacy toggles
Email and phone are sensitive. **Decision:** add `showEmail` and `showPhone` booleans (default `false` for email, `false` for phone). On others' profiles, hidden contact methods are simply absent (not greyed) so there is no "this is hidden" leak. The owner always sees their own. This is what makes "Get in touch" (Section 3) honestly reflect what the person chose to expose.

---

## 6. About + School Memories — structure (the brainstorming the owner asked for)

The brief wants two distinct things: (1) a free **About** section the user writes, and (2) a **prompted "school memories"** area (favorite teacher, favorite anecdote, committees, captaincy/torchbearer, sports-day records). The risk is clutter. Here is the proposed organization.

### 6.1 Two clearly separated blocks under the "About" tab
The "About" tab (in the tabbed main column) contains, top to bottom:

**Block A — "In their words" (free prose).**
- Single `about` rich-ish text field (markdown bold/italic, reuse the existing `renderRichText` util the posts use). This is the user's own paragraph, distinct from the short `bio` that shows in the cover. **Decision: keep `bio` (the one-liner under the avatar, ~160 chars) AND add `about` (the long-form paragraph).** They serve different slots; conflating them is why the live page feels thin.
- Empty state on own profile: a soft prompt "Write a few lines about yourself" linking to settings. On others': the block is omitted if empty.

**Block B — "The valley years" (prompted memories).**
This is the structured-but-not-cluttered part. **Decision: render it as a set of "memory chips/cards," each tied to a specific prompt, and only show the prompts the user actually answered.** This is the anti-clutter mechanism: an unanswered prompt is invisible on the public profile (it appears only as a fill-in suggestion on the owner's own edit view). So a person who answered two prompts shows two tidy lines; a person who answered all of them shows a richer block. Nobody sees empty scaffolding.

Proposed prompt set (each maps to a structured field, see model — a `UserMemory` table keyed by `prompt`):
- **Favorite teacher** — short text. Renders as "Remembers fondly: Mr. ___."
- **A favorite memory / anecdote** — short paragraph (the one "story" slot). Renders as a soft quote block (cinnamon left-border), the most personality-rich element on the page; the natural source for "person in focus."
- **Committees & roles** — chips: e.g. "Nature Club", "Choir", "Editorial". Multi-value.
- **Captaincy / Torchbearer** — chips: "House Captain (Krishna)", "Torchbearer 2009". (Torchbearer is an RV-specific honor; treat as a tagged role.)
- **Sports-day records / sports** — short text or chips: "100m record, 2008", "Football XI".
- **Under the banyan** — an optional open-ended "anything else from the valley" line, so the structure never feels like a closed form.

Why a `UserMemory` table keyed by `prompt` rather than fixed columns: it lets the owner add/retire prompts later without a migration, makes "person in focus" a trivial query ("give me any user with a non-empty `favorite_memory`"), and naturally yields variable-length, non-cluttered rendering. It also avoids the "exactly N fields" smell at the schema level.

**Layout to avoid clutter:**
- Block A is prose width (`max-width: 64ch`).
- Block B is a **two-column key/value list on desktop, single column on mobile**, where each answered prompt is a labeled row (label in `--ink-soft` uppercase micro-caps reusing the rail `h3` style, value in body). Chips (committees, captaincy, sports) use the existing `.v2-tag-soft` style.
- The anecdote/"favorite memory" gets a full-width pull-quote treatment (serif, cinnamon rule) so the page has one warm focal moment instead of a wall of equal-weight facts.

### 6.2 "Person in focus" daily feature
The brief asks to "consider a person in focus daily feature pulling from these answers." 

**Decision: yes, build it as a small read-only surface fed entirely by `UserMemory` + cover fields — no new authoring UI.**
- **What it is:** a daily-rotating spotlight ("Today in the valley: Ananya Rao, '09") shown on the **Feed right rail** and/or the **Directory** header, linking to the profile. It surfaces the person's name, bird/photo avatar, batch, profession, and one pulled answer (preferring `favorite_memory`, falling back to `favorite_teacher` or a committee).
- **Eligibility:** only users who (a) have filled at least the anecdote or favorite-teacher prompt, and (b) have not opted out (`featureOptOut` boolean, default false — respect consent since it pushes someone's memory to everyone). This is the consent guardrail; never spotlight someone who wrote nothing or opted out.
- **Selection:** deterministic by date so everyone sees the same person each day and it does not reshuffle on refresh. A daily cron or an on-read `seed = dateString` pick over the eligible set. Avoid repeating within a rolling window (store `lastFeaturedAt` on `User`, prefer least-recently-featured eligible user).
- **Tone / easter-egg fit:** this is a natural home for one of the "2 to 3 delightful" touches — the hoopoe peeking in, or a hand-drawn banyan motif framing the spotlight. Keep it gentle, never a modal, never intrusive (per brief).
- **Scope call for MVP:** the *data* (UserMemory, opt-out, lastFeaturedAt) ships with the profile work so the feature is unblocked, but the rail widget itself can land in the Feed area's scope. Flag it as a cross-area dependency rather than building the widget inside the profile PR.

---

## 7. Alignment fix (Details/Contact/Groups rail vs short About; tabs top vs rail top)

The brief: the rail (Details/Contact/Groups) is long while the About content is short, and the tabs content top should align with the rail top.

**Diagnosis of the v2 markup:** the cover card spans **full width**, and below it `.v2-inner--profile-cols` is a 2-col grid (`minmax(0,1fr) 290px`) where the **left** column starts with `.profile-tabs` and the **right** is the rail. v2 sets `margin-top:20px` on the cols wrapper, so the tabs row and the first rail card *do* start at the same Y. The real misalignment problems are:
1. When a tab's content is short (About with little text), the left column collapses to its content height while the rail stays tall, leaving a large empty gutter on the left and a ragged bottom. It reads as broken.
2. When content is long (Posts), the rail ends early and the left column runs far below it, so the rail "floats" with dead space beneath.

**Decisions:**
- **Top alignment:** keep tabs and the first rail card sharing the same top edge by ensuring the cols grid starts both columns at row 1 with `align-items: start` (so the rail does **not** stretch). Verify the `.profile-tabs` `padding-top` and the first `.v2-railcard` `padding-top` are equal so the two header baselines line up to the pixel. Currently tabs buttons have `padding:9px 14px` and rail cards `padding:15px 16px`; nudge the rail's first card top padding or add a hairline so the "Details" h3 baseline sits on the tab-label baseline. This is a LiftKit optical-alignment pass, not arbitrary.
- **Sticky rail:** make the rail `position: sticky; top: 24px` with `align-self: start`, so on long Posts tabs the rail scrolls with you and never floats in dead space. On short tabs it simply sits at the top, aligned.
- **Min-height floor for short tabs:** give the left column a `min-height` tied to the rail's natural height **only via** the grid (`align-items: start` + the sticky rail) rather than a hard pixel min-height, so a short About no longer creates a giant empty left gutter that exceeds the rail. Better: cap the **rail** length instead of padding the content. Concretely, the Groups rail card should show a **max of 4 to 5 groups with a "See all (12)" link**, not the full list, so the rail does not become the longest thing on the page. This directly addresses "the rail is long."
- **Short About fix at the content level:** the About tab is short today because there is only `bio` duplicated. Once `about` + the prompted memory block (Section 6) exist, the About tab has real height and the imbalance largely resolves. The empty-state prompts on the owner's own view also give it height.
- **Mobile (<=1080):** v2 already collapses to single column and hides the rail (`.col-rail{display:none}`). **Decision: do not hide the rail on mobile — move it.** The Details and Contact information is the *core reason to use a directory*; hiding it on phones is wrong for this product. Instead, on <=1080 stack order should be: cover -> Details -> Contact -> tabs (Posts/About/Photos) -> Groups. Render the rail cards inline above the tabs on narrow screens rather than dropping them. Only "Groups" (least essential) may collapse to a compact strip.

---

## 8. Tabs and the "ruled sheet" post list reuse

- **Tabs:** Posts / About / Photos, reusing the existing shadcn `Tabs` (`src/components/ui/tabs.tsx`) rather than the bespoke `.profile-tabs` buttons, so keyboard and focus-visible come for free (CLAUDE.md interactive-state rule). Style them to match v2's underline-on-active look via the `variant="line"` the component already supports.
- **Posts tab = the shared ruled-sheet feed.** The profile must reuse the **same** post-list component the main feed and group feeds use (the modular "one shared feed" mandate). In v2 this is `<PostList sheet />` rendering `.v2-sheet`/`.v2-post.sheet` (ruled entries in one card). The real implementation reuses `PostCard` inside a shared `PostList`/`Sheet` wrapper. **Decision:** the profile passes the same props the feed passes (`posts`, `currentUserId`, like/poll handlers); the only profile-specific concern is the **query** (author = this user, batch-visibility filter, pagination), which already exists in `profile/[id]/page.tsx`. Do not build a profile-only post renderer. The page-size/pagination story (the owner's "600 posts/month, needs pagination") is the feed area's shared concern; the profile inherits whatever cursor pagination the shared list adopts (`take: 20` today becomes cursor-based).
- **Empty state:** "No posts yet from {firstName}" on others'; on own, a soft "Share your first memory" linking to the composer.
- **Photos tab:** sourced from images attached to the user's posts (`post.images` JSON arrays), not a separate upload silo, so there is no new model. v2's hardcoded grid becomes a real `parseJsonArray(post.images)` flatten. If empty, omit the tab entirely rather than show six placeholder tiles.

---

## 9. Verified marker (brief mentions "a non-obvious verified marker")

This is primarily the auth/verification area's model, but the profile is where the marker **renders**, so the profile spec must reserve the slot. **Decision:** add `verifiedAt: DateTime?` and `verifiedBy: String?` to `User` (set when community vouching + admin confirm completes; the vouch tally itself lives in the verification area's models). On the profile, render a **subtle** mark: a small leaf/peaks glyph in `--primary` placed *after* the name with no label, with a tooltip "Verified by the alumni office." Non-obvious per brief: no big blue check, no badge pill. Unverified users show nothing (absence, not a "pending" stamp on the public view).

---

## 10. Prisma model (full profile fields)

> **Still the target 2026-07-02 (owner decision): build toward this richer model.** The shipped
> schema currently takes a simpler path, and that flat shape is the **interim MVP, not the final
> design** — the owner wants the richer profile. What ships today: `avatarColor`/`photoUrl`, `bio`,
> `about`, and `openTo` (comma-list) as flat `User` columns; `accountType`, nullable
> `batchType`/`batchYear`, `taughtFrom`/`taughtUntil`, `subjects`, and `verifyState` close to spec.
> Still to build (this section is the plan): the `UserHouse`/`houses` (house-per-year),
> `UserLink`/`links` (arbitrary contact links beyond the flat `instagram`/`linkedin`), and
> `UserMemory`/`memories` tables — today the memory prompts render from a hardcoded
> `MEMORY_PROMPTS` array with a "Memory prompts are coming to your settings" placeholder (not yet
> wired to saved per-user answers). (Note: there is **no `birdVariant` column**; the avatar system
> is the 50-species deterministic hash in `docs/spec/avatars.md` / `src/lib/avatar.ts`. Deploy is
> Vercel + Supabase Postgres Mumbai for both local and prod.)

Deltas against the current schema. New/changed fields on `User`, plus three small related tables. SQLite local / Postgres prod, so use scalar defaults and relations (no enums in SQLite-friendly form — `kind`/`prompt` are validated `String`s via Zod, matching the existing `batchType`/`role` string-with-comment pattern).

```prisma
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  password      String?
  emailVerified DateTime?

  // --- avatar ---
  avatarColor   String?          // bird tint + initials fallback bg
  avatarImage   String?          // NEW: Vercel Blob URL; photo overrides bird
  birdVariant   Int       @default(0) // NEW: 0..2 stable default bird

  // --- short identity (cover) ---
  bio           String?          // one-liner under the avatar (<=160 shown)
  about         String?          // NEW: long-form "in their words" paragraph

  // --- location / profession ---
  currentCity   String?          // "based in" (public)
  homeCity      String?          // NEW: optional "originally from"
  workplace     String?          // industry (poorly named; keep for now)
  jobTitle      String?          // profession (public header)

  // --- RV record ---
  batchType       String          // "ICSE" | "ISC"
  batchYear       Int
  yearJoined      Int?
  yearLeft        Int?
  classSection    String?         // NEW: "A" or "A,C" sections over years
  admissionNumber Int?            // PRIVATE: owner + admins only

  // --- teacher support (past or present, may never have studied here) ---
  isTeacher       Boolean  @default(false) // NEW
  taughtSubject   String?                  // NEW: e.g. "Biology"
  taughtFromYear  Int?                     // NEW
  taughtToYear    Int?                     // NEW: null = present

  // --- contact privacy ---
  phone        String?
  showEmail    Boolean @default(false)     // NEW
  showPhone    Boolean @default(false)     // NEW

  // --- verification (renders here; tally lives in verification area) ---
  verifiedAt   DateTime?                   // NEW
  verifiedBy   String?                     // NEW: admin id

  // --- person-in-focus ---
  featureOptOut  Boolean   @default(false) // NEW: consent to be spotlighted
  lastFeaturedAt DateTime?                 // NEW: rotation fairness

  // --- moderation / system (unchanged) ---
  role       String   @default("member")
  isBlocked  Boolean  @default(false)
  adminNote  String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // relations (existing + new)
  houses    UserHouse[]   // NEW
  links     UserLink[]    // NEW
  memories  UserMemory[]  // NEW

  posts            Post[]
  comments         Comment[]
  likes            Like[]
  commentLikes     CommentLike[]
  pollVotes        PollVote[]
  reports          Report[]
  notifications    Notification[]
  accounts         Account[]
  sessions         Session[]
  groupMemberships GroupMember[]
  createdGroups    Group[]

  // NOTE: `instagram` and `linkedin` are RETIRED after backfill into UserLink.
}

model UserHouse {        // NEW — house per year (owner wants rich house data)
  id        String  @id @default(cuid())
  userId    String
  house     String        // "Krishna", "Aravali", etc.
  fromYear  Int?
  toYear    Int?
  isPrimary Boolean @default(false) // the one shown by default in Details

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model UserLink {         // NEW — any number of labeled contact/social links
  id       String  @id @default(cuid())
  userId   String
  kind     String        // "instagram"|"facebook"|"twitter"|"linkedin"|"website"|"other"
  label    String        // human "where it goes": "My photography on Instagram"
  url      String
  position Int     @default(0)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
}

model UserMemory {       // NEW — prompted school-memories, keyed by prompt
  id     String @id @default(cuid())
  userId String
  prompt String        // "favorite_teacher" | "favorite_memory" | "committees"
                       // | "captaincy" | "sports" | "banyan"
  value  String        // text; chip-lists stored as JSON string (matches Post.images)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, prompt]) // one answer per prompt
  @@index([userId])
}
```

**Migration sequence:** (1) `prisma db push` the additive columns + three tables; (2) data-migration script: for each user with `instagram`/`linkedin`, insert `UserLink` rows and set a default `UserHouse` from any existing single-house intent (none today, so no-op); set `birdVariant = hash(id) % 3`; (3) a later migration drops `instagram`/`linkedin`. Keep `admissionNumber` exactly as-is (just re-classified as private at the render layer).

**Zod deltas** (`src/lib/validators.ts`): extend `profileSchema` with `about` (max 4000), `homeCity`, `classSection`, `isTeacher`/`taughtSubject`/`taughtFromYear`/`taughtToYear`, `showEmail`/`showPhone`, `featureOptOut`; add `userLinkSchema` (`kind` enum, `label` max 80, `url` valid URL), `userHouseSchema`, `userMemorySchema`. Admission number validation unchanged.

---

## 11. Routes / IA

- `/(main)/profile/[id]` — the public profile (others see this). Server component, fetches user + `houses`/`links`/`memories` + paginated posts, computes `isOwnProfile`/`isAdmin`/`canSeeEmail`/`canSeePhone`, and gates `admissionNumber`.
- `/(main)/profile/me` (or reuse `[id]` with the session id) — own profile, adds Edit CTA and empty-state prompts. Recommend `/profile/me` as a stable self-link for the navbar chip.
- `/(main)/settings` — the **edit** surface. The current single `settings-form.tsx` is extended into grouped sections matching the profile blocks: Identity & photo, RV record (incl. houses-per-year repeater), Profession & location, Contact & privacy (the `UserLink` repeater + show-email/phone toggles), About, Valley memories (the prompt list with "don't remember" affordances per the brief's "always offer a clear don't remember"). The onboarding flow stays minimal (brief: minimal signup); the rest is "complete your profile" in settings.
- No new public route for "person in focus"; it is a widget consuming the same `UserMemory` data, surfaced in the Feed/Directory areas (cross-area dependency, Section 6.2).

---

## 12. Reused vs new components

**Reuse (do not rebuild):**
- `UserAvatar` (extended to the superset in Section 1) — cover, rail, directory, feed, navbar.
- `PostCard` + the shared `PostList`/ruled-sheet wrapper — the Posts tab.
- `formatBatch`, `getInitials`, `renderRichText`, `parseJsonArray`, `cn` — formatting and content.
- shadcn `Tabs`, `Card`, `Button`, `Tooltip`, `Dialog`/`Sheet` (for the "Get in touch" popover), `Separator`.
- v2 styles: `.v2-cover`, `.cover-meta`, `.v2-tag-soft`, `.v2-railcard`, `.fact`, `.fact.link`, `.v2-grow` — already the locked look; port to the real component classes.

**New (profile area):**
- `ProfileHeader` (cover photo, avatar overlap fix, name/meta line, stats strip, CTA logic from Section 3).
- `ProfileDetailsCard`, `ProfileContactCard`, `ProfileGroupsCard` (rail), each reading the new relations and applying the privacy gates.
- `ProfileAbout` (Block A prose + Block B prompted-memory renderer from Section 6).
- `GetInTouchPopover` and a `toVCard(user)` util for "Save contact."
- `socialUrl(kind, value)` + `socialIcon(kind)` utils, reused by Contact card and any social rendering elsewhere.

---

## 13. Edge cases / guardrails

- **No contact methods shared:** "Get in touch" disabled with explanatory text; Contact card shows owner-only empty state, omitted for others.
- **Partial valley years:** never render "undefined to undefined"; collapse to the surviving fragment or drop the stat (Section 2.5).
- **Header dotseps:** computed by `filter(Boolean).join(' · ')`, never hardcoded, so a person with only a batch shows just the batch, no dangling dots.
- **Teacher who never studied here:** `batchYear` may be a "joined as staff" year; if `isTeacher && !yearJoined`, the header shows profession + "Teacher" and suppresses the alumni batch token rather than inventing a batch.
- **Photo vs bird:** photo upload override is per Section 1; deleting a photo reverts to the stable bird (same `birdVariant`), never to a random new bird.
- **Long About / labels:** `about` clamps to a "Read more" past ~6 lines (reuse the `isLongText` pattern from `PostCard`); link labels truncate with ellipsis but title-attr shows full.
- **Admission number leak:** assert at the data layer that `admissionNumber` is stripped from the serialized user for non-owner/non-admin viewers, not merely hidden in JSX.
- **Person-in-focus consent:** never spotlight `featureOptOut` users or users with empty memories; deterministic-by-date selection so it does not reshuffle on refresh.
- **Mobile:** rail content is relocated above tabs, not hidden (Section 7); avatar uses column layout to avoid clipping (Section 2.1). Verify at 390x844 per CLAUDE.md.
- **Glows:** audit every interactive element on the profile for `--primary`-tinted box-shadows and replace with neutral layered shadows (Section 2.4).

---

### Files referenced (absolute paths)
- `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma`
- `/Users/sanan/Documents/rv-alumni/src/app/(main)/profile/[id]/page.tsx`
- `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx`
- `/Users/sanan/Documents/rv-alumni/src/components/common/user-avatar.tsx`
- `/Users/sanan/Documents/rv-alumni/src/components/directory/profile-card.tsx`
- `/Users/sanan/Documents/rv-alumni/src/components/settings/settings-form.tsx`
- `/Users/sanan/Documents/rv-alumni/src/components/posts/post-card.tsx`
- `/Users/sanan/Documents/rv-alumni/src/lib/validators.ts`
- `/Users/sanan/Documents/rv-alumni/src/lib/utils.ts` (`formatBatch`, `getInitials`, `renderRichText`)

Key load-bearing facts discovered: `formatBatch()` ignores `batchType` and returns `Batch of 'YY` (header line is house-agnostic for free); there is **no** messaging model, so a "Message" CTA has no destination (drove the "Get in touch" recommendation); there is **no** `house`, `avatarImage`, teacher, memory, social-beyond-IG/LinkedIn, or verified field in the schema today (all are net-new in the model above); the live profile page dumps every field into one flat grid (the "exactly three vs everything" problem the Details/Contact redesign resolves).
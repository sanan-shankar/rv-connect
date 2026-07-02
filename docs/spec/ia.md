# Spec: ia

I now have everything I need. I have a complete, code-grounded picture of the current architecture and its central reuse failures. Here is the exhaustive design/spec for my assigned area.

---

# Information Architecture, Navigation & Component-Reuse Architecture

## 0. Grounding: what the code actually does today

I read the real code before deciding anything. The findings below drive every decision in this spec.

**Three different post systems exist, none of which share a card.**
1. The **main feed** uses `PostFeed` (`src/components/posts/post-feed.tsx`) which calls the `loadPosts` server action (`src/app/(main)/feed/actions.ts`), renders `PostCard` (`src/components/posts/post-card.tsx`), and supports search + sort + time-filter + "Load more" pagination (cursor-by-page, `take: 21 / skip: page*20`, `hasMore` via the 21st row).
2. **Group feeds** use `GroupFeed` (`src/components/groups/group-feed.tsx`), which is a wholesale re-implementation: it has its own inline composer (`<textarea>` only, no tags/images/polls/mentions/markdown), its own inline post markup (no likes, no comments, no poll, no markdown rendering, its own private `timeAgo`), and it reads from a **separate `GroupPost` table** (`prisma/schema.prisma:74`). Group posts cannot be liked, commented on, reported, or contain a poll. This is the single largest reuse failure in the codebase.
3. **Profile posts** (`src/app/(main)/profile/[id]/page.tsx`) correctly reuse `PostCard`, but hand-roll the entire Prisma `include` and the `PostData` mapping inline, duplicating ~40 lines that are identical to `loadPosts`. There is no pagination on profile posts (`take: 20`, no "load more").

**Two avatars exist.** `UserAvatar` (`src/components/common/user-avatar.tsx`) is initials-on-color only. The locked v2 design (`src/app/preview/v2/page.tsx`) introduces a `BirdGlyph` valley-bird avatar with `style="birds"` and `photo` override. The shipped app has none of this.

**Navigation is a top navbar, not the locked design.** `Navbar` (`src/components/layout/navbar.tsx`) is a sticky top bar with `NAV_LINKS = [Feed, Groups, Directory, About]`. The locked v2 design is a **flush full-height green sidebar** with `NAV = [Feed, Directory, Groups, Letters, Events, About]` plus a user chip pinned to the bottom. The shell in `(main)/layout.tsx` is `Navbar + max-w-7xl main + Footer`, with a fixed full-bleed background image. There is **no right rail** in the shipped app; the v2 design has one.

**Two composers exist** (`CreatePostForm` full-featured; `GroupFeed`'s inline textarea). The v2 preview shows a *third*, collapsed "pill" composer. There is no single shared `<Composer/>`.

Everything below is written to converge these onto one set of shared primitives, matching the locked v2 design, while preserving the working `loadPosts` pagination contract.

---

## 1. Information Architecture: the seven destinations

The locked sidebar order in v2 is **Feed, Directory, Groups, Letters, Events, About**. I am making targeted, decision-bearing changes to that list, because the owner has constraints v2 did not encode.

### 1.1 Final sidebar navigation (top group)

| # | Label | Route | Lucide icon | Rationale |
|---|-------|-------|-------------|-----------|
| 1 | **Feed** | `/feed` | `Newspaper` | Default landing after login. Matches v2. |
| 2 | **Directory** | `/directory` | `Users` | The owner calls this "the core reason to join." It sits **second, directly under Feed** (v2 order), not buried. |
| 3 | **Groups** | `/groups` | `UsersThree` (Phosphor) / `Users` is taken → use Lucide `Network` or keep `FolderOpen` from v2. **Decision: `Boxes`** | v2 used `FolderOpen`, which reads as "files." `Boxes` reads as "collections of people." See 1.4. |
| 4 | **Archive** | `/archive` | **`Aperture`** | The school PHOTO ARCHIVE. Named and iconned below in 1.3. |
| 5 | **Letters** | `/letters` | `Feather` | The long-form **post type** reading surface. Renamed concept, see 1.2. Keeps v2's `Feather`. |
| 6 | **Roundups** | `/roundups` | `MailOpen` | The Letterloop-style **recurring newsletter** feature. The naming split is mandated by the owner; see 1.2. |
| 7 | **Events** | `/events` | `CalendarDays` | Light events. Matches v2. |
| 8 | **About** | `/about` | `Info` | School/community info, the verification explainer, code of conduct. Matches v2. |

**Bottom group (pinned, `margin-top:auto`)** — the user chip, exactly as v2:
- Avatar + name + batch line, a `Settings` gear that routes to `/settings`. Clicking the chip body routes to **own profile** (`/profile/[self]`). Admin users get a `Shield` "Admin" link that appears only when `role === "admin"` (already gated this way in `navbar.tsx:104`).

**Decision — collapse to 8 items max with a "more" overflow if needed.** Eight primary destinations is the ceiling for a sidebar that must stay scannable. Letters + Roundups are both present because the owner explicitly requires the two "Letters" concepts to have **distinct names and distinct homes**. If usability testing shows the sidebar is too tall on short laptops, **Roundups and Events fold into a secondary "More" group** below a hairline divider; Feed/Directory/Groups/Archive/Letters stay primary. I am specifying the divider structure now so it is cheap to apply later.

### 1.2 Resolving the overloaded word "Letters"

The owner stated "Letters" is overloaded and the two meanings need distinct names. Decision:

- **"Letters"** = the **long-form post type**. A Letter is a `Post` with a `kind = "letter"` (data delta in section 6). It has a title, renders full-width in a serif reading column, and is composed in the same shared `<Composer/>` switched into "letter mode." The `/letters` route is a filtered reading surface (`Feed` scoped to `kind = "letter"`), reusing the shared `<Feed/>`. This is the `Feather` chip already present in both the v2 composer (`Letter` chip, `page.tsx:483`) and the shipped composer would gain it. **Name rationale:** a personal, written, long-form piece. "Letter" is warm, archival, and on-brand for a Krishnamurti school.
- **"Roundups"** = the **recurring Letterloop-style newsletter**. A Roundup is a *container* that periodically collects member answers to prompts ("What are you reading? Where did the year take you?") and publishes them as a single issue on a cadence. This is a **new model entirely** (owned by the Newsletter spec author, not me; I only reserve the route, the nav slot, and the IA). **Name rationale:** "Roundup" says "recurring collection of many people's contributions," which is exactly Letterloop's mechanic and cannot be confused with a single long post. Alternatives considered and rejected: "Digests" (too techy/email-marketing), "Dispatches" (overlaps with Letters' tone), "Circulars" (institutional, cold).

If the Newsletter spec author prefers a different label, the constraint I am enforcing at the IA level is only this: **the two must not both be called "Letters," and they get two separate sidebar slots and two separate routes.**

### 1.3 The Photo Archive: name and icon

The owner asked for a warm name (not "media library") and a great Lucide icon.

- **Name: "The Archive"** (sidebar label: **Archive**; page H1: **"The Valley Archive"**). It holds school photographs across decades, plus eventually scanned yearbooks/programmes. "Archive" carries the weight of an institution preserving its own memory, which fits a 90-plus-year-old school and reads warmer and more deliberate than "Gallery" or "Media." Empty-state and section copy lean into it: "Photographs from the valley, kept for everyone." Considered and rejected: "Gallery" (gift-shop/art connotation), "Memories" (saccharine, and collides with the `campus-memory` post tag), "The Banyan" (too cute as a top-level nav label; better reserved for an Easter egg or a sub-collection name).
- **Icon: `Aperture`** (Lucide). It is unambiguously photographic, it has rotational symmetry that pairs well with the restrained line-weight of the other nav icons (`strokeWidth={1.9}` per v2), and it avoids the over-used `Image`/`ImageIcon` (already used inside the composer for the "Photo" attachment chip, so reusing it in nav would create an icon collision). Backup if `Aperture` reads too "camera-app": `Images` (stacked), which signals "many photos." **Primary choice stands: `Aperture`.**

### 1.4 Groups icon correction

v2 uses `FolderOpen` for Groups, which semantically reads as a file folder. Decision: **`Boxes`** (Lucide) for a collection-of-collections feel, or fall back to Phosphor `UsersThree` duotone if we want the "group of people" reading. I recommend **`Boxes`** because `Users` is already the Directory icon and reusing a people-glyph for both Directory and Groups muddies the distinction. The two nav items should not both be people icons.

---

## 2. Complete page / route inventory

Route groups stay as they are: `(auth)` for unauthenticated, `(main)` for everything behind login (the `(main)/layout.tsx` redirect-if-no-session pattern is correct and stays).

### 2.1 Authenticated app — `(main)/`

| Route | Page file | Shell variant | Reuses | Notes / deltas |
|-------|-----------|---------------|--------|----------------|
| `/feed` | `(main)/feed/page.tsx` | **3-col** (sidebar + main + right rail) | `<Composer mode="post"/>`, `<Feed scope="all"/>`, right-rail building blocks | Today it is `max-w-3xl` single column with `CreatePostForm` + `PostFeed`. Becomes the 3-column shell with the collapsed composer pill and right rail. |
| `/letters` | `(main)/letters/page.tsx` *(new)* | 3-col or 2-col | `<Feed scope="letters"/>`, `<Composer mode="letter"/>` | Reading surface filtered to `kind="letter"`. A single Letter detail at `/letters/[id]` renders full serif column. |
| `/letters/[id]` | *(new)* | 2-col (sidebar + reading column, optional rail) | `<PostCard variant="letter-full"/>` | Permalink for a long-form Letter; expands the read-more inline behaviour into a real page. |
| `/roundups` | `(main)/roundups/page.tsx` *(new, owned by Newsletter spec)* | 2-col | TBD by Newsletter author | I reserve the route + nav slot only. |
| `/roundups/[id]` | *(new)* | 2-col | TBD | A published issue. |
| `/directory` | `(main)/directory/page.tsx` | **2-col** (sidebar + content, no rail) | `<DirectoryClient/>` (exists), `<ProfileCard/>` (exists), shared `<Avatar/>` | Already has search + filter-on-demand + batch-grid landing. Keep. Swap `UserAvatar` for shared `<Avatar/>`. |
| `/profile/[id]` | `(main)/profile/[id]/page.tsx` | **2-col** (sidebar + profile, optional rail per v2 `ProfileView`) | `<ProfileHeader/>`, `<ProfileTabs/>`, `<Feed scope="author" authorId/>`, right-rail building blocks | v2 has cover photo, tabs (Posts/About/Photos), and a details/contact/groups rail. Today it is `max-w-3xl`, hand-rolled posts, no pagination, no tabs. Reconcile to v2; reuse the same right-rail primitives as `/feed`. |
| `/groups` | `(main)/groups/page.tsx` | 2-col | `<GroupCard/>` (extract), shared `<Avatar/>` | Group index / discovery / "your groups." |
| `/groups/new` | `(main)/groups/new/page.tsx` | 2-col | `<CreateGroupForm/>` (exists) | Keep. |
| `/groups/[id]` | `(main)/groups/[id]/page.tsx` | **3-col** (sidebar + group main + group rail) | `<GroupHeader/>`, `<Composer mode="post" groupId/>`, `<Feed scope="group" groupId/>`, right-rail members block | **Rewrite to drop `GroupFeed`'s bespoke UI** and use the same `<Composer/>` and `<Feed/>` as the main feed. See section 4 (the big reuse fix). |
| `/archive` | `(main)/archive/page.tsx` *(new)* | 2-col | `<PhotoGrid/>` (extract from v2 `photos-grid` + profile Photos tab) | The Valley Archive. Collections, decade filters, lightbox. |
| `/archive/[collection]` | *(new)* | 2-col | `<PhotoGrid/>`, `<Lightbox/>` | A single collection (e.g. "Founders' Week 2019"). |
| `/events` | `(main)/events/page.tsx` *(new)* | 2-col or 3-col | `<EventCard/>` (extract from v2 rail `v2-event` + `v2-datechip`), `<Feed/>` not used here | Light events list. The `Coming up` rail card on `/feed` is the same `<EventCard/>` primitive at small size. |
| `/events/[id]` | *(new)* | 2-col | `<EventCard variant="detail"/>` | Event detail + RSVP. |
| `/donate` | `(main)/donate/page.tsx` | 2-col | existing | Exists. Linked from the fund-style post and footer. |
| `/about` | `(main)/about/page.tsx` | 2-col | existing | Exists. Add the verification explainer + code of conduct. |
| `/notifications` | `(main)/notifications/...` | 2-col | `<NotificationList/>` | Actions exist (`notifications/actions.ts`); the bell (`notification-bell.tsx`) is the entry point. A full-page list is the overflow target. |
| `/settings` | `(main)/settings/page.tsx` | 2-col | `<SettingsForm/>` (exists) | "Complete your profile" lives here (house-per-year, sections, profession, etc. per owner). |
| `/admin` | `(main)/admin/page.tsx` | 2-col | `<UserManagement/>`, `<ReportManagement/>` | Gated `role==="admin"`. |

### 2.2 Unauthenticated — `(auth)/` and root

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Public landing (`landing-client.tsx`). |
| `/login` | `(auth)/login/page.tsx` | Email + password (magic links being removed per owner). The v2 split-photo login with the **hoopoe-covers-eyes** Easter egg lives here. |
| `/signup` | `(auth)/signup/page.tsx` | Minimal signup (`signup-form.tsx`, `trivia-gate.tsx` is the invite/vouch gate). |
| `/onboarding` | `(auth)/onboarding/page.tsx` | Post-signup data capture; the "complete your profile" first pass. |
| `/verify` | `(auth)/verify/page.tsx` | Verification landing. |

### 2.3 Routes to retire

- `src/app/preview/**` (v2, logos, `[dir]`, `_shared`) are design scratch. They inform this spec; they are not shipped IA. Do not link them from nav.

---

## 3. The app shell

The shell is the single most reused structural component. It is the flush green sidebar + content area + optional right rail, taken directly from v2 (`v2-shell`, `v2-side`, `v2-content`, `v2-inner`).

### 3.1 `<AppShell/>` (server-friendly wrapper) + `<Sidebar/>` (client)

```
<AppShell rightRail?={ReactNode}>
  <Sidebar active={pathname} user={...} />        // flush, full-height, green
  <main class="content">
    <div class="bg" />                            // the dimmed valley photo, opacity ~.09
    <div class="inner [--cols]">
      <section class="main">{children}</section>
      {rightRail && <aside class="rail">{rightRail}</aside>}
    </div>
  </main>
</AppShell>
```

- **Replaces** the current `Navbar` + `max-w-7xl main` + `Footer` arrangement in `(main)/layout.tsx`. The fixed background image stays but moves into `.content` (per v2, the background sits behind content, not behind the sidebar; the sidebar is opaque green and flush to the viewport edge).
- **Grid contract** (from v2 `v2-inner`): `grid-template-columns: minmax(0,1fr) 318px; max-width:1180px; gap:30px`. When a page passes no `rightRail`, the grid collapses to a single `minmax(0,1fr)` column and `max-width` tightens (v2 `v2-inner--profile` uses `1040px`). So **`<AppShell/>` takes an optional `rightRail` prop**; presence of the prop is what switches 3-col vs 2-col. No separate layout files needed.
- **Sidebar is `position:sticky; top:0; height:100vh`**, flush green (`--sidebar`, being darkened per owner). It is a **client component** because it needs `usePathname()` for the active state (same mechanism as the current navbar at `navbar.tsx:43`).
- **Footer**: in a flush-sidebar app the footer belongs **inside the scrolling content column**, not full-bleed under the sidebar. Keep `<Footer/>` but render it at the bottom of `.main`, not as a sibling of the shell.

### 3.2 Mobile shell

v2 hides the sidebar under 720px and the rail under 1080px (`page.tsx:785`). Decision:
- **Right rail**: hidden below the `lg` breakpoint. Its contents are not lost — the most useful rail cards (Your groups, Coming up) become collapsible sections appended below the feed on mobile, OR are simply dropped on mobile for MVP (rail content is supplementary by design). **MVP decision: drop the rail on mobile**; do not duplicate it inline. This keeps the mobile feed clean and matches the owner's "lightweight" mandate.
- **Sidebar**: below `md`, the flush sidebar collapses into a **bottom tab bar** (Feed, Directory, Groups, Archive, + "More" sheet) OR the existing `Sheet` hamburger pattern from `navbar.tsx:122`. **Decision: bottom tab bar** for the 4-5 primary destinations, because the owner mandates mobile verification on every change and a thumb-reachable bottom bar is the correct mobile pattern for an app people "check infrequently" and want to navigate fast. The remaining nav items (Letters, Roundups, Events, About, Settings, Admin) live behind a "More" sheet, reusing `src/components/ui/sheet.tsx`.

### 3.3 What is common vs page-specific

| Layer | Common (in `<AppShell/>`) | Page-specific (passed in as children/props) |
|-------|---------------------------|---------------------------------------------|
| Sidebar | Always identical (active state derived from route) | — |
| Background image | Always | — |
| Content max-width + grid | Driven by `rightRail` presence | Page chooses to pass a rail or not |
| Page header (`v2-head`: H1 + subline + toolbar) | The **shape** is a shared `<PageHeader title subtitle actions/>` | Title text, subtitle, and toolbar contents per page |
| Toolbar (search pill, bell, primary CTA) | `<NotificationBell/>` and the search-expand pill are shared | The primary CTA differs: "New post" on feed, "Edit profile" on own profile, "New group" on groups, "Upload" on archive |
| Right rail | The **building blocks** are shared (section 5) | Which blocks, in what order, per page |

---

## 4. The reuse fix: one `<Composer/>` and one `<Feed/>` everywhere

This is the heart of the assignment and the biggest delta from shipped code. Today there are three post systems (section 0). The target is **one composer, one feed, one card, one server-action contract**, parameterised by a `scope`.

### 4.1 `<Composer/>` — the single post editor

`CreatePostForm` (the full-featured one) becomes the basis for the shared `<Composer/>`. The group `<textarea>` and the v2 collapsed pill are *modes/sizes* of the same component, not separate components.

```ts
type ComposerScope =
  | { kind: "post" }                       // main feed
  | { kind: "group"; groupId: string }     // a group feed
  | { kind: "letter" }                      // long-form

interface ComposerProps {
  scope: ComposerScope;
  collapsed?: boolean;          // renders the v2 "pill" until focused, then expands (CreatePostForm already does this via `expanded`)
  placeholder?: string;         // "Share something with {Group}…" vs "Share a memory…"
  onPosted?: () => void;        // local optimistic prepend, or router.refresh fallback
}
```

What it keeps from `CreatePostForm` (all already built — do not rewrite):
- Collapse→expand on focus (`expanded` state, `page.tsx`/`create-post-form.tsx:27,202`).
- Markdown bold/italic toolbar via `wrapSelection` (`:34`).
- `@mention` autocomplete via `MentionDropdown` (`:69`) hitting `/api/users/search`.
- Image upload (≤3, ≤5MB, WebP via `/api/upload`) (`:89`).
- Poll creator via `PollCreator` (`:236`), 2-4 options.
- Tag chips (`TAGS`, `:12`) — these are the existing `campus-memory / life-update / looking-for-connections / photo / general`.

What changes:
- **Scope-driven submit target.** Instead of always calling `createPost`, the composer calls one server action `createPost(formData)` that now accepts an optional `groupId` and `kind`. Group posts stop going to the `GroupPost` table and become regular `Post` rows with a `groupId` FK (data delta, section 6). This is what unlocks likes/comments/polls/reports/mentions inside groups for free.
- **"Letter" chip** (the `Feather` icon, already in v2 composer at `page.tsx:483`) switches the composer to letter mode: adds a title field, removes the poll affordance, widens the textarea, and submits with `kind="letter"`.
- **Collapsed pill variant** for the feed top (matches v2 `v2-composer`): avatar + ghost placeholder + the Photo/Poll/Letter chips. On focus it becomes the full expanded editor. This is just `collapsed` driving initial `expanded=false` with the pill styling.

**Result:** the bespoke group `<textarea>` in `group-feed.tsx:139-160` is deleted. Group composing becomes `<Composer scope={{kind:"group", groupId}} placeholder={...}/>`.

### 4.2 `<Feed/>` — the single post list

`PostFeed` becomes the basis for shared `<Feed/>`. It already has the right shape: filters, pagination, auto-animated list, skeleton, empty state. It is generalised by a `scope`.

```ts
type FeedScope =
  | { kind: "all" }                          // /feed
  | { kind: "group"; groupId: string }       // /groups/[id]
  | { kind: "author"; authorId: string }     // /profile/[id]
  | { kind: "letters" }                      // /letters (kind=letter only)
  | { kind: "tag"; tag: string }             // future: a tag landing

interface FeedProps {
  scope: FeedScope;
  showControls?: boolean;     // search/sort/time row — see scalability §7
  sheet?: boolean;            // ruled-sheet rendering (v2) vs stacked cards
  initialPosts?: PostData[];  // SSR first page to avoid a loading flash
}
```

- **Single data contract.** `loadPosts` (`feed/actions.ts:349`) is extended to accept `scope` and becomes the *only* post-fetcher. It already returns `{ posts: PostData[], hasMore }` with `take:21/skip:page*20`. Profile and group pages stop hand-rolling their own `prisma.post.findMany` + mapping (today duplicated in `profile/[id]/page.tsx:45` and `groups/[id]/page.tsx:32`). They call `loadPosts({ scope, page })`.
  - `scope.kind==="author"` adds `authorId` to the `where` (replaces the inline profile query).
  - `scope.kind==="group"` adds `groupId` to the `where` (only possible after the data delta in §6).
  - `scope.kind==="letters"` adds `kind: "letter"`.
  - The existing `targetBatches` visibility `OR` clause (`:371`) and `isHidden:false` carry through unchanged for every scope.
- **Pagination stays "Load more"** (button) by default and gains an **infinite-scroll option** (§7). The page-based skip/take contract is preserved exactly, so the server action does not change shape.

### 4.3 `<PostCard/>` — the single card, with variants

`PostCard` (`post-card.tsx`) is already the right card and is already reused by `/feed` and `/profile`. It becomes the *only* card. The group's inline post markup (`group-feed.tsx:174-225`) is deleted in favour of it. Variants via a single prop:

```ts
interface PostCardProps {
  post: PostData;                 // unchanged shape; gains optional `title`, `kind`, `groupId`
  variant?: "card" | "sheet" | "letter-full";
  showGroupBadge?: boolean;       // on /feed, a group post shows a "in {Group}" chip linking to the group
}
```

- `"card"`: today's bordered card (used in stacked feeds).
- `"sheet"`: the **ruled-sheet** row from v2 (`v2-post.sheet`, one shared sheet container with `border-bottom` between entries). This is the locked design for the main feed. `PostCard` gains a sheet style; `<Feed sheet/>` wraps the rows in the single `v2-sheet` card.
- `"letter-full"`: long-form reading layout for `/letters/[id]` (serif column, title, no truncation).

The card already does: like (optimistic, `:80`), comments toggle (`CommentsSection`), poll (`PollDisplay`), markdown render (`renderRichText`), images grid, report/edit/delete dropdown gated by `isOwn`/admin. **All of this becomes available in groups automatically** once group posts are real `Post` rows.

### 4.4 Before/after reuse map

| Surface | Composer (before → after) | List (before → after) | Card (before → after) |
|---------|---------------------------|------------------------|------------------------|
| Main feed | `CreatePostForm` → `<Composer scope=post collapsed/>` | `PostFeed` → `<Feed scope=all sheet/>` | `PostCard` → `<PostCard variant=sheet/>` |
| Group feed | bespoke `<textarea>` → `<Composer scope=group/>` | bespoke map → `<Feed scope=group/>` | bespoke div → `<PostCard/>` |
| Profile | (none) → optional `<Composer/>` on own profile | inline `findMany` → `<Feed scope=author/>` | `PostCard` (kept) → `<PostCard variant=sheet/>` |
| Letters | `Letter` chip → `<Composer mode=letter/>` | (none) → `<Feed scope=letters/>` | (none) → `<PostCard variant=letter-full/>` |

---

## 5. Shared right-rail building blocks

v2's right rail (`v2-rail`) is three cards: **Coming up** (an event), **New in the directory** (recent members), **Your groups**. The profile rail (`col-rail`) is **Details / Contact / Groups**. These are not bespoke per page; they are a small library of rail primitives.

```
<RailCard title>                 // the v2-railcard shell: uppercase tracked label + slot
<RailEventItem event small?>     // v2-event + v2-datechip (also the base of <EventCard/>)
<RailPersonRow user/>            // v2-railrow: avatar + name + batch·city, links to /profile/[id]
<RailGroupRow group/>            // v2-grow: name + member count (blue), links to /groups/[id]
<RailFact icon label value link?>// v2 profile `fact` row (Details/Contact)
```

| Page | Rail composition (top→bottom) |
|------|-------------------------------|
| `/feed` | Coming up (`RailEventItem`) · New in the directory (`RailPersonRow`×3 → links to `/directory`) · Your groups (`RailGroupRow` → `/groups`) |
| `/profile/[id]` | Details (`RailFact`: house, years at RV, city) · Contact (`RailFact` links: message, site, LinkedIn) · Groups (`RailGroupRow`) |
| `/groups/[id]` | Members (`RailPersonRow` list, replaces the inline member toggle in `group-feed.tsx:116`) · About this group · maybe Group admins |

Every `RailPersonRow`, `RailGroupRow`, and avatar in the rail is a **link to that entity's profile/group page** (see §8).

---

## 6. Data-model deltas (Prisma)

These deltas exist purely to enable the reuse architecture. I am specifying them; the database-spec author can refine types.

1. **Kill `GroupPost`; fold groups into `Post`.** Add to `Post`:
   ```
   groupId  String?           // null = main feed; set = posted into a group
   group    Group?  @relation(fields: [groupId], references: [id], onDelete: Cascade)
   kind     String  @default("post")   // "post" | "letter" | "fund"
   title    String?            // letters only
   @@index([groupId, createdAt])
   @@index([authorId, createdAt])
   @@index([kind, createdAt])
   ```
   Remove the `GroupPost` model (`schema.prisma:74`) and `Group.posts GroupPost[]`; replace with `Group.posts Post[]`. **Rationale:** this single change collapses three post systems into one and gives group posts likes/comments/polls/reports/mentions for free. The composite indexes are what keep the feed fast at 600+ posts/month (§7).
2. **Feed visibility.** The `loadPosts` `where` already filters `targetBatches` and `isHidden`. Add a scope clause: main feed = `groupId: null AND kind != "letter"`; group feed = `groupId: <id>`; letters = `kind: "letter"`. No schema change beyond the fields above.
3. **No change** to `Like`, `Comment`, `PollOption`, `PollVote`, `Report` — they already FK to `Post.id`, so group posts inherit all of them once they are `Post` rows.
4. **Reserved (Newsletter spec author owns these):** `Roundup`, `RoundupIssue`, `RoundupAnswer` models for `/roundups`. I only reserve the route + nav slot.
5. **Reserved (Archive):** a `Photo` + `PhotoCollection` model for `/archive`. Out of my area; I reserve the route + nav.
6. **Migration note:** existing `GroupPost` rows must be migrated into `Post` (set `groupId`, `kind="post"`, copy `content`/`images`/`createdAt`/`authorId`). This is a data migration, flagged for the database-spec author.

---

## 7. Feed scalability at 600+ posts/month with infrequent visits

The owner's constraint: the feed gets cluttered (e.g. 600 posts/month), people check infrequently, and the feed must stay useful at scale.

### 7.1 Pagination / loading
- **Keep page-based windowing** (`take:21/skip:page*20`, `hasMore` = 21st row). It is already implemented and correct (`feed/actions.ts:429`). Do **not** switch to OFFSET-heavy deep pagination unmanaged: at 600/month, by year two there are ~7,200 rows. `skip` past page ~50 gets slow on Postgres. **Decision: migrate the contract from `skip/take` to keyset (cursor) pagination** keyed on `(createdAt, id)` for the default "recent" sort. The `<Feed/>` API stays `{posts, hasMore}` + an opaque `cursor`; only the server action's internals change. For the "liked"/"commented" sorts (which can't keyset cleanly) keep windowed pagination but cap at, say, 10 pages — those are exploratory, not exhaustive reads.
- **Infinite scroll with a sentinel `IntersectionObserver`** replaces the manual "Load more" button on `/feed` and group feeds (keep a "Load more" fallback button for no-JS / accessibility). Profile and Letters can stay button-based. Auto-animate (`useAutoAnimate`, already in `PostFeed`) handles insert transitions.

### 7.2 What keeps the feed useful (filters/search that reveal on demand)
The owner wants filters that "reveal on demand" and "a smaller search that expands." This maps onto controls that are *collapsed by default* so the feed reads clean, and expand when intent appears:
- **Search pill that expands.** The v2 toolbar has a compact `v2-search` pill ("Search the valley"). Decision: it is a **collapsed pill in the page header**; clicking expands it into the full debounced search input that `PostFeed` already has (`searchInput`→`search`, 300ms debounce, `:37`). On mobile the pill is icon-only and expands to full width.
- **Filters behind a disclosure**, exactly like the Directory already does (`directory-client.tsx:52` `showFilters` toggle). The sort (`recent/liked/commented`) and time window (`all/today/week/month/year`) controls already exist in `PostFeed` (`:96-125`) but are always-on; **move them behind a "Filter" toggle** so the default feed is uncluttered. The most valuable filter for infrequent visitors is **time window** ("Since I last visited" → defaults to surfacing the catch-up set).
- **"Catch up" affordance for infrequent visits.** Because people check rarely, add a soft **"New since you were last here"** divider in the feed (a horizontal rule with a count), computed from `User.updatedAt` or a new `lastSeenAt` field. This is the single most useful scale feature for the stated usage pattern: it answers "what did I miss?" without making the user scroll an undifferentiated 600-item river. (Requires a `lastSeenAt DateTime?` on `User` — flag for database-spec author.)
- **Tag filters as quick chips.** The existing tags (`campus-memory`, etc.) become one-tap filter chips above the feed when filters are revealed, reusing `<Feed scope=tag/>`.

### 7.3 Main feed vs group feeds: how they differ
| Aspect | Main feed `/feed` | Group feed `/groups/[id]` |
|--------|-------------------|---------------------------|
| Scope | `groupId: null, kind != letter`, plus `targetBatches` visibility | `groupId: <id>` only; membership-gated at the page (`isMember` check, `groups/[id]/page.tsx:42`) |
| Controls shown | Full: search + sort + time + tags (revealed on demand) | Lighter: search + time only; a group is small enough that sort-by-liked is rarely needed. `showControls` prop tunes this. |
| Composer | `scope=post`, full tag set | `scope=group`, group context; tags optional |
| Right rail | Coming up / New in directory / Your groups | Members / About this group |
| "Catch up" divider | Yes | Yes (group-scoped `lastSeenAt` is overkill for MVP; use the global one) |
| Card variant | `sheet` (ruled) | `sheet` or `card` — pick `card` for groups so each post reads as a distinct contribution in a smaller stream |

Both render through the *same* `<Feed/>` and `<PostCard/>`; only the `scope` and `showControls` differ. That is the entire point of the architecture.

---

## 8. "Click a name to go to that profile" — applies everywhere a name or avatar appears

This is a global rule, not a per-page feature. Anywhere a person is rendered, both their **name text and their avatar are links to `/profile/[id]`**. `PostCard` already does this correctly (`post-card.tsx:107` avatar link, `:115` name link). Make it a property of the shared primitives so it is impossible to forget:

- **Shared `<Avatar/>`** (the new unified avatar, §9) optionally takes a `userId`; when present it wraps itself in `<Link href={/profile/userId}>`. So every avatar everywhere is a profile link by default.
- **Shared `<PersonName/>`** primitive renders the name as a `Link` to `/profile/[id]` with the hover-underline treatment.

Inventory of every place this applies:
- Post card header (name + avatar) — already done.
- Comments and replies (each comment author's name + avatar) — `CommentsSection` must use `<Avatar userId/>` + `<PersonName/>`.
- `@mentions` inside post/comment body — `renderRichText` already parses `@[Name](id)`; the rendered mention is a profile link.
- Right rail: `RailPersonRow` (New in directory), group member rows.
- Directory `ProfileCard` and the batch-grid result rows.
- Group members list (`group-feed.tsx:116` currently renders members as non-links — fix).
- Group/Letter author lines.
- Notifications ("X liked your post") — the actor name links to their profile; the body links to the post.
- Like lists / poll voter peeks (if shown).
- Admin user-management rows.
- Event RSVPs / attendee lists.

The user chip in the sidebar links to **own** profile.

---

## 9. The unified `<Avatar/>` (consolidating two avatar systems)

> **Superseded 2026-07-02.** This sub-model (the `variant 0-2` disc API, the `style: "birds" |
> "initials"` toggle, and `UserAvatar`/initials as a fallback) does not match what shipped.
> Canonical source: `docs/spec/avatars.md` and the real implementation in `src/lib/avatar.ts` +
> `src/components/common/bird-avatar.tsx` / `bird-avatar-v2.tsx`. What actually shipped: 50 real
> Rishi Valley bird species (not a 0-2 variant), deterministic per-user via salted FNV-1a hashing
> over three axes (species/colour/pose), no disc background (`BG_MODE="none"`), no
> `style="initials"` toggle, and `src/components/common/user-avatar.tsx` no longer exists in the
> codebase at all (already deleted — the migration this section calls for is done). The
> "avatar as a `Link` to `/profile/[userId]` when a `userId` is present" **principle** in this
> section is still live and should be read against `ProfileAvatar`
> (`src/components/profile/profile-avatar.tsx`), not against the disc/variant API below. Kept
> for history; not current.

Today `UserAvatar` (initials only) ships; v2 introduces bird glyphs + photo. The owner's locked decision is **bird avatars as default + photo upload override**. Decision: **one `<Avatar/>`** that supersedes `UserAvatar`.

```ts
interface AvatarProps {
  name: string;
  userId?: string;          // when set, the avatar is a Link to /profile/[userId]  (§8)
  photo?: string | null;    // Vercel Blob URL; overrides the glyph
  avatarColor?: string | null;
  variant?: number;         // bird glyph variant 0-2 (deterministic from userId)
  style?: "birds" | "initials";  // app-wide default "birds"; "initials" as a fallback toggle
  size?: "sm" | "md" | "lg" | "xl";  // keep UserAvatar's size scale (8/10/16/24)
  ring?: boolean;           // the cover-overlap ring on profile headers
}
```

- Default render = **bird glyph** (`BirdGlyph` from v2) on the user's `avatarColor`, variant derived deterministically from `userId` so a given person always gets the same bird.
- `photo` present = circular cropped image (v2 `v2-av img`).
- `style="initials"` reproduces today's `UserAvatar` exactly, so the migration is a drop-in: every `UserAvatar` call site (navbar, post-card, group-feed, directory, profile) swaps to `<Avatar/>`. Requires a `photo`/`avatarPhoto` field on `User` (flag for database-spec author; `avatarColor` already exists).

**Migration scope:** replace all imports of `@/components/common/user-avatar` with the new shared `<Avatar/>`. Then delete `user-avatar.tsx`.

---

## 10. Component inventory: common vs page-specific (the master map)

**Common (shared, used by ≥2 surfaces):**
- `<AppShell/>` + `<Sidebar/>` + `<PageHeader/>` (shell)
- `<Composer/>` (feed, groups, profile-own, letters)
- `<Feed/>` (feed, groups, profile, letters, tag)
- `<PostCard/>` (everywhere posts render) + `<PollDisplay/>` + `<CommentsSection/>` (already shared)
- `<Avatar/>` + `<PersonName/>` (everywhere a person appears)
- `<MentionDropdown/>` (composer + comments) — exists
- Right-rail kit: `<RailCard/> <RailEventItem/> <RailPersonRow/> <RailGroupRow/> <RailFact/>`
- `<EventCard/>` (events page + feed rail; same primitive, two sizes)
- `<PhotoGrid/>` + `<Lightbox/>` (archive + profile Photos tab)
- `<NotificationBell/>` (shell) — exists
- shadcn primitives (`button/card/dialog/select/sheet/tabs/skeleton/badge`) — exist; reuse, do not re-add

**Page-specific (single surface):**
- `<DirectoryClient/>` + `<ProfileCard/>` (directory) — exist, keep
- `<ProfileHeader/>` + `<ProfileTabs/>` (profile) — extract from v2 `ProfileView`
- `<GroupHeader/>` + `<GroupCard/>` + `<CreateGroupForm/>` (groups) — extract header from `group-feed.tsx`; form exists
- `<SettingsForm/>` (settings) — exists
- `<UserManagement/>` + `<ReportManagement/>` (admin) — exist
- Roundups components — owned by Newsletter spec
- `<Lightbox/>`, collection chrome (archive) — out of my area beyond reserving IA

---

## 11. Edge cases

- **Group post visibility leak.** Folding group posts into `Post` means `loadPosts` MUST default-exclude `groupId != null` on the main feed, or group content leaks into the global feed. The `where` clause must enforce `groupId: null` for `scope=all`. This is the single highest-risk regression of the data delta — call it out in the migration PR and add a test.
- **`targetBatches` × group scope.** The batch-visibility `OR` clause must still apply inside groups (a group post can still target batches). Compose, don't replace, the where-clauses.
- **Letters in the main feed.** A Letter (`kind="letter"`) should appear in `/feed` as a compact "Letter" card (title + excerpt + "Read") that links to `/letters/[id]`, not as a giant inline block. So `scope=all` includes `kind="letter"` but `<PostCard variant="sheet">` renders a letter teaser; only `/letters/[id]` uses `variant="letter-full"`. Decide whether letters appear in both `/feed` and `/letters` (recommended: yes, with the teaser treatment) — this is the one place §7.3's "main feed excludes letters" needs softening to a teaser rather than a hard exclude. **Final call: include letter teasers in `/feed`, full letters at `/letters`.**
- **Deleting a group** cascades to its posts (now `Post` rows with `onDelete: Cascade` via `groupId`). Verify likes/comments/polls also cascade (they FK to `Post`, so yes).
- **Empty states** per scope (the shared `<Feed/>` already branches on `posts.length===0`): main feed "be the first to share"; group "no posts yet in this group"; profile "no posts yet"; letters "no letters written yet." Pass an `emptyState` prop.
- **Profile of a blocked user** already 404s (`profile/[id]/page.tsx:36`). Keep; ensure shared `<PersonName/>` links don't leak blocked users into rails (filter `isBlocked` in rail queries).
- **Infinite scroll + auto-animate** can fight on fast scroll; throttle the observer and only animate the *first* page's inserts, not appended pages (or disable list animation on append, animate only on prepend/optimistic-add).
- **Sidebar active state for nested routes.** `/groups/[id]` and `/profile/[id]` must light the correct top-level item. Reuse the `pathname.startsWith(link.href)` logic from `navbar.tsx:64`, but note `/profile` has no nav item — own-profile is reached via the user chip, so no nav item lights for profiles (acceptable).
- **Mobile bottom-bar + composer.** The collapsed composer pill and the bottom tab bar both want the bottom of the screen on mobile; the composer is in-content (scrolls away) while the tab bar is fixed, so they don't collide, but verify at 390×844 per the project's mobile mandate.

---

## 12. Migration sequence (so reuse lands safely)

1. Add `Post.groupId/kind/title` + indexes; migrate `GroupPost` rows into `Post`; keep `GroupPost` readable during transition.
2. Extend `loadPosts` to accept `scope`; add the `groupId:null` guard for `scope=all` (+ test for the leak).
3. Generalise `PostFeed`→`<Feed scope>`; point `/feed`, `/profile`, `/groups/[id]` at it.
4. Generalise `CreatePostForm`→`<Composer scope>`; replace the group textarea.
5. Build `<AppShell/>`+`<Sidebar/>` from v2; swap `(main)/layout.tsx` off the top navbar.
6. Unify `<Avatar/>`; delete `user-avatar.tsx`.
7. Add new routes (`/letters`, `/archive`, `/events`, `/roundups` placeholders) into the nav.
8. Drop the `GroupPost` model once nothing reads it.

---

## Files referenced (all absolute)

- `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma` — `Post`, `GroupPost`, `Group` models; the `GroupPost` fold is the central delta.
- `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx` — the locked v2 design: sidebar `NAV`, `v2-shell`/`v2-side`/`v2-inner` grid, ruled-sheet `PostList`, `BirdGlyph` avatar, right rail, hoopoe Easter egg.
- `/Users/sanan/Documents/rv-alumni/src/app/(main)/layout.tsx` — current shell (top navbar + max-w-7xl + footer); to be replaced by `<AppShell/>`.
- `/Users/sanan/Documents/rv-alumni/src/components/layout/navbar.tsx` — current nav links + active-state + mobile sheet + user dropdown logic to migrate into `<Sidebar/>`.
- `/Users/sanan/Documents/rv-alumni/src/components/posts/post-feed.tsx` — basis for shared `<Feed/>` (search/sort/time/pagination/auto-animate).
- `/Users/sanan/Documents/rv-alumni/src/components/posts/post-card.tsx` — basis for shared `<PostCard/>`; already profile-links names+avatars.
- `/Users/sanan/Documents/rv-alumni/src/components/posts/create-post-form.tsx` — basis for shared `<Composer/>` (markdown, mentions, images, polls, tags, collapse/expand).
- `/Users/sanan/Documents/rv-alumni/src/components/groups/group-feed.tsx` — the bespoke duplicate composer + card + member list to be deleted in favour of shared primitives.
- `/Users/sanan/Documents/rv-alumni/src/app/(main)/feed/actions.ts` — `loadPosts` pagination contract (`take:21/skip:page*20`, `hasMore`) to preserve and extend with `scope`.
- `/Users/sanan/Documents/rv-alumni/src/app/(main)/profile/[id]/page.tsx` — inline post query duplicating `loadPosts`; to be replaced by `<Feed scope=author/>`.
- `/Users/sanan/Documents/rv-alumni/src/app/(main)/groups/[id]/page.tsx` — reads `GroupPost`; to be rewritten onto unified posts.
- `/Users/sanan/Documents/rv-alumni/src/components/directory/directory-client.tsx` — the filter-reveal-on-demand pattern to reuse for the feed controls.
- `/Users/sanan/Documents/rv-alumni/src/components/common/user-avatar.tsx` — to be superseded by the unified `<Avatar/>` and deleted.
> **READ THIS BEFORE ANY OF WHAT FOLLOWS. Superseded twice.**
>
> **2026-08-28, and this is the big one.** The Collection rework
> (`docs/planning/collection-rework/spec.md`) replaced the design of most of
> this document, and where the two disagree, that one is what shipped. The
> sections below that are now WRONG, not merely dated:
>
> - **§2, "what stays out"** — dead in full. It is built around "the place,
>   not people", with three mechanisms for keeping people out and a canned
>   decline for a class photograph. The owner widened the frame to the
>   school's whole visual memory (campaign D2): people, class photographs
>   and events all belong.
> - **§5, the taxonomy** — dead. The four facets and the fourteen `subject`
>   values are gone, replaced by **six buckets** (`src/lib/collection.ts`:
>   People, Birds, Nature, Campus, School life, Other), "Part of school" as
>   free text rather than a picklist, and no facet dropdowns at all. The
>   fourteen values had nowhere to file a class photograph, which is what
>   made them wrong rather than short. `freeTags` survives as a column and
>   is searched; nothing writes it any more.
> - **§3's routes** — `/collection/[id]` is a permalink that opens the
>   viewer, not a detail page; `/collection/contribute` never existed as a
>   route (contributing is a pop-up).
> - **§6, the grid page** — dead. No masonry, no filter rail of three
>   Selects, no "A wander" sort. The page is a river of justified rows with
>   the six buckets on one line, a year rail, search on the title line
>   and four orders (`src/components/collection/*`).
> - **§4.3's "blur placeholder"** and the whole question of how a photograph
>   is sized are answered by `src/lib/photo-layout.ts` and `<PhotoFrame>`,
>   which store real dimensions and reserve the space (campaign phases 1–3).
>
> - **§4.2's variant table and §4.4's budget** — corrected 2026-09-05, having
>   been blessed as "still true" here while teaching a three-variant pipeline
>   that has never existed. Two variants ship, not three, and the display one
>   is encoded two different ways depending on which path the upload took.
>   Both sections now say so; read them, not this line.
>
> What is still true here: §1 (the name), §4.1 (R2 as the store), §8 (admin
> approval), §9 (the data model, plus the columns added since), and §7's
> principle that the archive is reusable across the app.
>
> **2026-07-02.** Storage is Cloudflare R2 (not Vercel Blob) via the
> `putImage`/`delImage` shim in `src/lib/storage.ts`; hosting is Vercel (compute
> never moved to Render). For the stack itself see `AGENTS.md`; the infra migration runbook lives in git history: `git log --follow -- docs/STACK_MIGRATION.md`.

# Spec: media

I now have a thorough grounding in the real codebase: the upload pipeline, image rendering, moderation model, IA, spacing tokens, filter/grid patterns, and avatar conventions. I have everything needed to write the spec. This is my deliverable, returned directly as my final message.

---

# The Photo Archive ("The Valley Collection")

A design and implementation spec for the school photo archive area of RV Connect. Grounded in the real codebase (`prisma/schema.prisma`, `src/app/api/upload/route.ts`, `src/app/(main)/feed/actions.ts`, `src/components/posts/*`, `src/app/preview/v2/page.tsx`, `.claude/skills/liftkit-spacing`). No files edited.

## 1. Name and identity

### Decision: call it "The Valley Collection" (route `/collection`, sidebar label "Collection")

The owner dislikes "media library" (too clinical, too SaaS) and the project already has a "Letters" naming overload problem, so the new name must be unambiguous, warm, and not collide with "Photos" (which already exists as a *personal* tab on the profile page, see `ProfileView` `tab === "photos"` in `preview/v2/page.tsx`). Candidates considered:

| Name | Verdict |
|------|---------|
| "The Banyan" | Beautiful, but the banyan is a load-bearing motif better reserved for the brand/landing; overloading it dilutes it. |
| "The Album" | Reads personal/Facebook, which is exactly the wrong frame (this is about the *place*, not people-snaps). |
| "Sightings" | Lovely for birds but too narrow; excludes landscape/campus/ethos. |
| "The Archive" | Accurate but cold and museum-like; discourages casual contribution. |
| **"The Valley Collection"** | **Chosen.** "Collection" frames it as a curated, communal body of work that grows (invites contribution), "Valley" anchors it to the *place* not people, and it has zero collision with "Photos" (personal) or "Letters" (two features). Short label in the sidebar: **"Collection"**. |

Sub-framing in copy: the page header subtitle reads **"A shared picture of the place: the banyan, Rishi Konda, the birds, the light."** This sentence does the policy work of telling people what belongs here (the place) versus what does not (selfies, reunion group shots), without a rulebook. No em dashes anywhere, per the owner's constraint; the colon above is intentional and allowed.

### Icon

The v2 sidebar (`NAV` array in `preview/v2/page.tsx`) currently uses Lucide `FolderOpen` for "Groups" and `Newspaper`, `Users`, `Feather`, `CalendarDays`, `Info` for the others. The Collection needs a distinct glyph that reads as "many images / gallery" rather than "one photo":

- **Sidebar chrome icon: Lucide `Images`** (the stacked-frames glyph, `import { Images } from "lucide-react"`), `strokeWidth={1.9}` to match the existing `n.icon size={18} strokeWidth={1.9}` nav convention. `Images` (plural, stacked) is visually distinct from the single `ImageIcon`/`ImagePlus` already used in the composer, so the sidebar item does not look like "add a photo."
- **Decorative / hero / empty-state icon: Phosphor duotone**, per the CLAUDE.md rule ("`@phosphor-icons/react` duotone for decorative/hero contexts"). Use `<ImagesSquare weight="duotone" />` or `<Mountains weight="duotone" />` from `@phosphor-icons/react`. `Mountains` doubles as a quiet nod to the three peaks (Bodikonda, Middle Peak, Rishikonda) that will become the real logo, so it ties the empty state to the brand story.

This keeps the icon language consistent with the established split: Lucide for chrome, Phosphor duotone for decorative.

## 2. Purpose, scope, and what stays out

> **DEAD, 2026-08-28.** The frame widened to the school's whole visual
> memory. People, class photographs and events belong here. See the banner
> at the top of this file and campaign decision D2.

The owner is explicit: this is **a living visual memory of the place**, not a personal photo dump. The design must structurally discourage people-snaps without policing them heavily. Three mechanisms enforce the frame:

1. **The taxonomy has no "people" or "reunion" category.** Tags are about *place, subject, era, and part of school* (section 5). There is nowhere to file a selfie, so it self-selects out.
2. **The upload dialog asks for a caption framed around the place** ("What is this, and where in the valley?"), not "who is in this."
3. **Admin approval (section 8)** is the backstop: an admin declines anything that is a personal snap with the canned reason "This space is for the place itself; please share people-shots on the feed or your profile instead." The decline is gentle and routes the energy to the right place (feed/profile already support images via the existing upload pipeline).

What lives here: campus and buildings, the banyan, Rishi Konda and the hills, birds and wildlife, landscapes and weather, junior/senior school life as *scenes* (the dining hall, assembly, the long tables), archival/historical scans, ethos moments (silence, walks, study). What does not: individual portraits, reunion group photos, screenshots, memes, anything off-topic. People *in* a landscape are fine; a photo *of* people is not the point.

## 3. Information architecture and routes

The app currently ships a top **Navbar** (`src/components/layout/navbar.tsx`) with `NAV_LINKS = [Feed, Groups, Directory, About]`, while the locked v2 design (`preview/v2/page.tsx`) uses a **flush full-height green sidebar** with `NAV = [Feed, Directory, Groups, Letters, Events, About]`. The Collection slots into the v2 sidebar between Events and About, or right after Groups; the natural grouping is the *browse-the-community* cluster (Directory, Groups, Collection) above the *read* cluster (Letters, Events) and About. Proposed final sidebar order:

`Feed · Directory · Groups · Collection · Letters · Events · About`

Routes (App Router, `(main)` route group so it inherits the auth gate from `(main)/layout.tsx`):

| Route | Purpose | Render |
|-------|---------|--------|
| `/collection` | The grid: masonry of approved photos, with filter rail. Supports `?tag=`, `?era=`, `?subject=`, `?q=`, `?sort=`, `?page=` query params (mirrors the directory's URL-driven filter pattern in `directory-client.tsx`). | Server component fetches page 0, hydrates a `CollectionClient`. |
| `/collection/[id]` | Single-photo lightbox/detail view: full image, caption, uploader, tags, era, "appears in" backlinks. Deep-linkable and shareable. | Server component. |
| `/collection/contribute` | The full upload flow (drag-drop, tag, caption, era) when more room than the quick dialog is wanted. Optional; the quick dialog on `/collection` covers the common case. | Client. |
| Admin queue | Lives inside the existing **`/admin`** page as a new "Photo queue" tab, beside the existing report management. No new top-level admin route. | Server + `PhotoQueue` client. |

The grid page is the default. Pagination is cursor/offset based exactly like `loadPosts` (`take: 21, skip: page * 20`, `hasMore = posts.length > 20`); reuse that idiom so the feed and collection paginate identically.

## 4. Cost-aware storage strategy (the load-bearing decision)

The owner's hard constraint: **hosting photos is expensive, storage is limited.** Hosting is Vercel; the database is Supabase Postgres (Mumbai). This changes the storage math and is the single most important decision in this spec.

### 4.1 Where the bytes live

*(Historical: this section originally proposed keeping Vercel Blob and documented Cloudflare R2 as a fallback if Blob cost became a bottleneck. That fallback is now the actual implementation — see the banner at the top of this file.)*

The existing pipeline (`src/app/api/upload/route.ts`) already does the right thing and must be **reused, not rebuilt**: every upload is processed through `sharp` (`resize(1920,1920,{fit:"inside",withoutEnlargement:true}).webp({quality:80})`) and written via the storage shim, `src/lib/storage.ts`'s `putImage`/`delImage`. The shim picks Cloudflare R2 (S3-compatible, zero egress) when `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET`/`R2_PUBLIC_BASE_URL` are all set, and falls back to the local filesystem (`public/uploads/YYYY/MM/`) otherwise (local dev only). Deletion mirrors this in `feed/actions.ts deletePost`, calling `delImage(url)` which routes to an R2 `DeleteObjectCommand` or a local `unlink` depending on the URL's shape.

**Decision: Cloudflare R2 as the photo store.** R2 has zero egress fees, which matters a lot for a public gallery that people browse repeatedly (egress, not storage, is what kills photo-app bills). It is S3-compatible (`@aws-sdk/client-s3`) and reachable from any host, so it does not couple the photo store to Vercel. The abstraction is exactly the one-file shim this section originally recommended: `src/lib/storage.ts` exports `putImage(buffer, subdir, filename)` and `delImage(url)`; the upload route and `deletePost` call the shim rather than any storage SDK directly, so a future provider swap stays a one-file change.

### 4.2 Variants: thumbnail and display

> **Corrected 2026-09-05 against the code.** This section proposed three
> variants and was quoted for months as if all three shipped. **Two ship**, and
> the display one has two different encodes. What follows is what the tree
> actually does; if it disagrees with the code, the code is right.

**Two derivatives per contribution**, stored as two columns on `Photo`
(`prisma/schema.prisma:269-270`). There is no `originalUrl` and there never
has been.

| Variant | Long edge | sharp settings | Where |
|---------|-----------|----------------|-------|
| `thumbUrl` | 480px | `.resize(480,480,{fit:"inside",withoutEnlargement:true}).webp({quality:72})` | `src/lib/collection-image.ts:96-98` (`gridThumb`, re-exported by `collection-photo.ts`). The river; the only thing most page-views load. |
| `url` (display), **direct path** | **full resolution**, bounded only by a 40-megapixel AREA cap | `storedResizeBox(...)` then `.webp({quality:100})` | `src/app/(main)/collection/actions.ts:600-603`, `COLLECTION_WEBP_QUALITY` in `upload-shared.ts:91`. This is what nearly every contribution takes. The cap exists to stop a decompression bomb (audit M16), not to make the picture smaller. |
| `url` (display), **FormData fallback** | 1600px | `.resize(1600,1600,{fit:"inside",withoutEnlargement:true}).webp({quality:80})` | `src/app/(main)/collection/actions.ts:341-342`. The path taken when the direct-to-R2 upload is unavailable. |

**The two display encodes do not match, and that is a live question, not a
design.** A contributor who falls back gets a visibly smaller photograph than
one who does not, and is told nothing. It is §4 #20 of the 2026-09-03 refactor
audit, awaiting the owner: match the direct path, or say "saved at reduced
size" out loud.

The river loads `thumbUrl`; the viewer loads `url`. **Do not** reach for
`toDisplayWebp` in `src/lib/image.ts` when working here: its docblock says
"boxed to 1920, WebP at 80" and it is the **feed's** encode, called only by
`/api/upload` and `/api/upload/finalize`. Two sessions have read it and
concluded the Collection stores 1920px copies. See `docs/TRAPS.md`.

Implementation note: the current route hard-caps file input at `5 * 1024 * 1024` (5MB) and rejects non-`image/` types. For the archive, **raise the input cap to 15MB** (people want to contribute good DSLR shots, the owner explicitly wants "higher-quality shots") but keep the *output* tightly compressed via the three-variant pass, so storage stays bounded regardless of input size. Reject HEIC up front with a clear message, or add `heic-convert`; sharp's HEIC support depends on the libvips build and is not guaranteed on every deploy target, so guard it.

### 4.3 Lazy loading, thumbnails, and a blur placeholder

- Every grid `<img>` uses `loading="lazy"` (the post-card already does this, `post-card.tsx` line 211) plus `decoding="async"`.
- Store a tiny **BlurHash or a 16px base64 LQIP** string on the row (`blurhash` column) generated in the sharp pass (`.resize(16).blur().toBuffer()` then base64, ~200 bytes). The grid renders the blur as a CSS background behind the `<img>` so the masonry does not reflow and the page feels instant. This is cheap and high-impact.
- Use an `IntersectionObserver`-driven infinite scroll on the grid (same hasMore/page model as `post-feed.tsx`) so only on-screen tiles fetch.
- Set long cache headers on stored objects (R2 serves immutable content-addressed URLs, so `Cache-Control: public, max-age=31536000, immutable` is safe; R2 has zero egress fees, so this is a pure cache-hit-rate win rather than a cost-avoidance one — implemented in `putImage`, `src/lib/storage.ts`).

### 4.4 Storage budget guardrails

- Per-user soft cap surfaced in the UI ("you have contributed 38 photos"); a hard per-upload batch limit of, say, 10 photos to prevent a single bulk dump.
- **The arithmetic that used to be here assumed three variants and a 1600px
  display copy, and both were wrong** (corrected 2026-09-05). What ships is a
  ~35KB thumbnail plus a display copy that, on the direct path, is a
  full-resolution WebP at quality 100 -- so the per-photograph cost is set by
  what people contribute, not by a box this spec chose. Budget from the real
  numbers in R2 rather than from a figure in a document. R2 storage past the
  10GB free tier is a flat per-GB rate with no egress charge, so a public
  gallery that gets browsed heavily stays cheap regardless of traffic; that
  part was always true and is the reason the store was chosen.
- Declined photos are deleted from storage immediately on rejection (admin decline calls `delImage` on all variants), so the storage cost is only ever *approved* content.

## 5. Cataloging: the tag taxonomy (decision-bearing)

> **DEAD, 2026-08-28.** Six buckets, in `src/lib/collection.ts`. See the
> banner at the top of this file.

The owner wants "community cataloging via simple tags (birds, landscape, junior/senior school, decade, etc.)." The risk with free-text tags is a sprawling, useless mess at 600 photos. **Decision: a small, fixed, faceted taxonomy across four axes, plus optional free-text only for bird/species names.** Faceted (not flat) tags make the filter rail genuinely useful at scale.

| Facet | Field | Values (fixed enum, stored as strings to match the project's existing string-enum convention, e.g. `Post.tag`) |
|-------|-------|------|
| **Subject** | `subject` (one or many) | `birds`, `wildlife`, `landscape`, `campus`, `buildings`, `banyan`, `rishi-konda`, `hills`, `weather-sky`, `flora`, `assembly-dining`, `arts-music`, `sport-outdoors`, `historical` |
| **Part of school** | `area` | `junior-school`, `senior-school`, `whole-campus`, `off-campus` |
| **Era** | `era` | a decade bucket: `pre-1960s`, `1960s`, `1970s`, `1980s`, `1990s`, `2000s`, `2010s`, `2020s`, plus `unknown` |
| **Free tags** | `freeTags` | optional, comma-joined; reserved mainly for **bird/species names** (hoopoe, paradise flycatcher, etc.) so birders can build a de-facto species index without polluting the fixed facets. |

Rationale for fixed enums on the first three facets:
- They power a clean filter rail (section 6) and they will not drift into 200 near-duplicate tags.
- `era` as decade buckets, not exact years, respects the owner's repeated "always offer a clear 'don't remember'" rule. Every uploader can pick `unknown`; the UI copy is "Roughly when? (a guess is fine)".
- They mirror the project's existing pattern of string-valued enums validated by Zod (`postSchema.tag` is a `z.enum([...])`), so the validators file gets one new schema in the same style.

Free-text is deliberately confined to species names so the community can self-organize birds (the school is a famous bird sanctuary, this is the highest-value cataloging) without a tag free-for-all.

## 6. The grid page UX

> **DEAD, 2026-08-28.** The page is a river of justified rows, not masonry
> behind a filter rail. See the banner at the top of this file.

Reuse the directory's proven structure (`directory-client.tsx`): URL-driven filters, a search box with a 300ms debounce, a collapsible filter panel in a `glass` container, and a graceful empty state. The collection adds a masonry layout instead of the equal-card grid.

- **Header** mirrors `v2-head` in `preview/v2/page.tsx`: display-font title "The Valley Collection" + subtitle, with a primary **"Contribute a photo"** button (`v2-btn v2-btn-primary` with the `Plus` icon convention already in v2) that opens the quick upload dialog.
- **Filter rail**: three `Select`s (Subject, Part of school, Era) from `src/components/ui/select.tsx` (already installed), plus the debounced search input over caption + free tags, plus a sort `Select` (Newest, Oldest, Most loved, A wander = random). "A wander" (a random shuffle) is a small delight that encourages browsing the place rather than just the latest uploads.
- **Masonry**: CSS columns (`columns-2 sm:columns-3 lg:columns-4`, `gap` via a LiftKit `--space-s` token, tiles `break-inside-avoid mb-[var(--space-s)]`). Tiles preserve aspect ratio (store `width`/`height` on the row so the grid never reflows). Each tile: blur LQIP behind a lazy `thumbUrl`, a hover overlay (gradient `from-black/55` per the CLAUDE.md image-treatment rule) showing caption + a love count + a subtle uploader credit.
- **Empty / first-run state**: the Phosphor duotone `Mountains` glyph, a warm line ("The collection is just beginning. The first photographs of the valley will live here."), and the Contribute button. This is the seeding hook (section 9).
- **Mobile (390x844)**: `columns-2`, filter rail collapses into a sheet (the project already uses `src/components/ui/sheet.tsx` for the mobile nav), tap a tile to open the detail route. Per LiftKit mobile rule, step every spacing token down one level.

## 7. How it ties into the rest of the app (reuse)

This is where the archive earns its keep instead of being a silo. The owner wants pictures usable as post images and profile/cover photos, and cover images for groups/events.

1. **Shared upload pipeline.** *(Proposal, and not what shipped: the Collection has its own
   contribute path with its own encode, and returns two variants. See the corrected §4.2.)*
   The archive uses the *same* `/api/upload` route and `sharp` settings as the composer; the only delta is generating three variants and returning `{thumbUrl, url, originalUrl, width, height, blurhash}` instead of a flat `urls` array. To avoid breaking the existing `create-post-form.tsx` (which expects `{urls}`), add a `?variants=1` query flag or a second route `/api/upload/photo`; the composer path stays untouched. This honours the project's "shared composer / shared feed" modular goal.

2. **"Add from the Collection" picker.** A small reusable `<CollectionPicker>` client component (a dialog showing the masonry of approved photos with single/multi select) becomes the *shared image source* across the app:
   - In the **post composer** (`create-post-form.tsx`), beside the existing "Photo" upload button, add a "From the Collection" button. Selecting a photo pushes its `url` (the 1600px display variant) into the existing `images` state array; nothing else in the post flow changes, because posts already store `images` as a JSON array of URLs (`Post.images`, `parseJsonArray`). This means a beautiful banyan shot someone uploaded can be reused in a post without re-uploading or re-storing bytes.
   - **Profile cover** and **group/event cover** images use the same picker, storing the chosen `url` on `User.coverPhoto` / `Group.coverPhoto` / `Event.coverPhoto` (new columns). The v2 profile already renders a `cover-photo` div and a `photos-grid`; this wires real data into it.

3. **Backlinks ("appears in").** Because a Collection photo's `url` may be embedded in posts/covers, the detail page can show "Used in 3 posts" by querying `Post.images contains photo.url`. This makes the archive feel alive and connected rather than a dead-end gallery. Cheap to compute on the detail route only.

4. **Reuse rendering + helpers.** `parseJsonArray`, `formatTimeAgo`, `UserAvatar` (uploader credit), `Card`/`Button`/`Select`/`Sheet`/`Dialog` from `src/components/ui/*`, and the `glass` utility all carry over. No new design primitives needed.

## 8. Moderation (admin approval)

The project already has a complete moderation pattern to mirror: the `Report` model with `status: "pending" | "reviewed" | "dismissed"`, `Post.isHidden`, admin actions (`adminHidePost`, `adminDismissReport`, `adminResolveReport` in `components/profile/admin-actions.ts`), and the `ReportManagement` queue UI inside `/admin`.

**Decision: every uploaded photo starts `approved = false` and is invisible in the grid until an admin approves it.** Rationale: storage is expensive and the frame is fragile (people-snaps), so a small gate at the front is far cheaper than cleanup later, and the community is invite-only and small enough that an approval queue is tractable. This matches the owner's "admin approval" note exactly.

Flow:
- Upload writes a `Photo` row with `approved = false` and stores all variants. The uploader sees their own pending photos in the grid with a "Pending review" badge (so it does not feel like a black hole), but no one else sees them.
- A new **"Photo queue" tab in `/admin`** renders a `PhotoQueue` client component modelled directly on `ReportManagement`: each pending photo shows the thumb, caption, proposed tags/era, uploader, and three actions: **Approve** (`approved = true`, `approvedAt`, `approvedById`), **Edit tags then approve** (admin can fix mis-tagging inline, which keeps the taxonomy clean), and **Decline** (deletes all variants from storage via `delImage`, deletes the row, optionally fires a gentle `Notification` of type `"admin"` with the place-not-people canned message).
- Post-approval moderation: approved photos can still be reported using the *existing* `Report` flow (extend `Report` to optionally reference a photo, section 9), and an admin can hide/remove them the same way posts are hidden. No second moderation system.
- **Trust escalation (optional, recommended):** after an admin approves N photos from the same uploader, flip a per-user `photoTrusted` flag so their future uploads auto-approve. This keeps the queue from becoming a chore as the prolific contributors (the birders) prove themselves, while new/unknown uploaders still pass the gate. Implemented as a simple count check in the upload action.

## 9. Data model deltas (Prisma)

The schema (`prisma/schema.prisma`) uses `cuid()` ids, string-valued enums, `DateTime @default(now())`, and `@@unique` join models. The additions follow those conventions exactly. SQLite local / Postgres prod means **no native array or enum types**: multi-value facets are stored as comma-joined strings (the project already does this with `Post.images`, `targetBatches`), validated by Zod against the fixed enums.

```prisma
model Photo {
  id            String    @id @default(cuid())
  uploaderId    String

  // storage variants (all WebP, produced in one sharp pass)
  // SHIPPED (2026-09-05): two columns, not three. `originalUrl` was never
  // added; `url`'s size depends on the upload path. See the corrected §4.2
  // and prisma/schema.prisma:269-270, which is the live shape.
  thumbUrl      String    // 480px  — the river
  url           String    // full resolution on the direct path, 1600px on the fallback
  blurhash      String?   // tiny LQIP for no-reflow loading
  width         Int       // intrinsic dims so the masonry never reflows
  height        Int

  caption       String?   // "What is this, and where in the valley?"

  // faceted taxonomy (fixed enums validated by Zod; comma-joined where multi)
  subject       String    // comma-joined from the subject enum (e.g. "banyan,landscape")
  area          String?   // "junior-school" | "senior-school" | "whole-campus" | "off-campus"
  era           String    @default("unknown") // decade bucket or "unknown"
  freeTags      String?   // comma-joined free text, mainly bird/species names

  // moderation (mirrors Post.isHidden + Report pattern)
  approved      Boolean   @default(false)
  isHidden      Boolean   @default(false) // post-approval takedown, same semantics as Post.isHidden
  approvedAt    DateTime?
  approvedById  String?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  uploader      User        @relation("PhotoUploader", fields: [uploaderId], references: [id], onDelete: Cascade)
  approvedBy    User?       @relation("PhotoApprover", fields: [approvedById], references: [id])
  loves         PhotoLove[]

  @@index([approved, isHidden, createdAt]) // the grid's hot query
  @@index([era])
}

model PhotoLove {  // mirrors the Like model, lets people "love" a photo (drives "Most loved" sort + a delight)
  id      String @id @default(cuid())
  userId  String
  photoId String

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  photo Photo @relation(fields: [photoId], references: [id], onDelete: Cascade)

  @@unique([userId, photoId])
}
```

User-side additions (cover photos reuse the archive, section 7):

```prisma
// add to model User:
  coverPhoto    String?       // a Collection photo url reused as profile cover
  photoTrusted  Boolean  @default(false) // auto-approve this uploader's future photos
  photos        Photo[]      @relation("PhotoUploader")
  approvedPhotos Photo[]     @relation("PhotoApprover")
  photoLoves    PhotoLove[]
```

Reuse-as-cover columns on Group (and the planned Event model) are `coverPhoto String?` storing a Collection photo `url`.

Reporting reuse: extend the existing `Report` model to make `postId` optional and add an optional `photoId String?` + relation, rather than building a parallel report system; the `ReportManagement` queue then handles both with a small conditional. (Alternatively, photos are takedown-only via the admin queue and never user-reported; the simpler MVP path is to skip photo reporting at launch and rely on the upfront approval gate.)

Validators: add to `src/lib/validators.ts`, in the same style as `postSchema`:

```ts
export const photoSchema = z.object({
  caption: z.string().max(300).optional(),
  subject: z.array(z.enum([
    "birds","wildlife","landscape","campus","buildings","banyan",
    "rishi-konda","hills","weather-sky","flora","assembly-dining",
    "arts-music","sport-outdoors","historical",
  ])).min(1, "Pick at least one subject"),
  area: z.enum(["junior-school","senior-school","whole-campus","off-campus"]).optional(),
  era: z.enum([
    "pre-1960s","1960s","1970s","1980s","1990s","2000s","2010s","2020s","unknown",
  ]).default("unknown"),
  freeTags: z.string().max(200).optional(),
});
```

(The array is `.join(",")` into the string column on write, validated against the enum before joining.)

## 10. Seeding and marketing the collection (the owner is unsure here)

An empty gallery is a dead gallery; the chicken-and-egg problem is the real risk. Concrete plays, cheapest first:

1. **Admin seeds 40-60 photos before launch.** The owner/admins upload a curated founding set: the banyan in every season, Rishi Konda at dawn, the famous bird shots, the dining hall, assembly, archival scans. This is the single most important step; the empty-state copy ("the collection is just beginning") only works if it is *not* actually empty on day one. These founding photos demonstrate the *quality bar and the place-not-people frame* by example, which teaches the taxonomy better than any rulebook.

2. **A weekly/monthly "from the Collection" surface elsewhere.** The v2 feed already has a right-hand rail with cards ("Coming up", "New in the directory", "Your groups"). Add a **"From the Collection"** rail card showing one rotating photo with a one-line caption and a "see more" link. This pulls the archive into the feed (where people actually are) and gives passive viewers a reason to click in. It also drives the "newsletter" feature (the Letterloop-style one) a ready-made section: "a photograph from the valley this month."

3. **A gentle prompt seeded into the post composer.** Among the composer chips, an occasional rotating placeholder: "Have a good photo of the valley? Add it to the Collection." Low-friction, in-context, non-nagging.

4. **Theme drives.** Periodic light campaigns run by admins: "Monsoon week: show us the valley in the rain," "The banyan through the decades," "Birds of RV." Each becomes a temporary `freeTag` and a feed post. Birders are the highest-propensity contributors (the school's identity is a bird sanctuary), so the very first drive should be birds; it will reliably produce volume and seeds the species index.

5. **Reuse as the carrot.** Because Collection photos can be set as profile/group/event covers (section 7), there is a *selfish* reason to contribute and to browse: you get beautiful, on-theme cover art for free, sourced from the community. "Set your profile cover from the Collection" is a one-click hook that converts browsers into contributors.

6. **A small delight to reward contribution.** When a photo is approved, the uploader gets a warm notification and a quiet count ("You have added 12 photographs to the valley's memory"). The hoopoe-covering-its-eyes easter egg (the established template from the login form, `Hoopoe` component) gets a second home here: on the empty state or on a successful contribution, the hoopoe peeks out from behind its wings. This is exactly the "2-3 places, never cringe" spread the owner asked for.

## 11. Micro-animations and delight (scoped, non-cringe)

Honouring the "No `transition-all`, only `transform`/`opacity`, spring easing" rule and the hoopoe easter-egg template:

- **Love a photo**: reuse the existing heart `pop` keyframe from `post-card.tsx`/v2 (`@keyframes pop`), red heart, on the detail view and grid hover.
- **Tile entrance**: a subtle staggered `opacity` + small `translateY` fade-in as tiles enter the viewport via `motion`, animating transform/opacity only. Skip per-frame iteration when screenshotting (CLAUDE.md note about animated elements).
- **The hoopoe easter egg, place #2**: on the empty state, or as a one-time celebration when a contribution is approved, the hoopoe (from the existing `Hoopoe` SVG component) uncovers its eyes. Reuses existing code, no new asset.
- **"A wander" sort** gently cross-fades the grid (opacity only) when shuffled, so it feels like turning over a new page of an album rather than a jarring re-sort.

## 12. Open questions / decisions to confirm with the owner

1. ~~**Keep `originalUrl`?**~~ **Resolved by what shipped:** it was never built. The
   Collection stores two variants and the display copy is itself full resolution on the
   direct path, so there is nothing an "original" would add. See the corrected §4.2.
2. ~~Vercel Blob vs Cloudflare R2 at launch.~~ **Resolved:** shipped on R2 behind the `storage.ts` shim (see banner and section 4.1).
3. **Photo reporting at launch?** Recommend MVP relies solely on the upfront approval gate and admin takedown; defer user-facing photo reports (and the `Report.photoId` change) to v2.
4. **Auto-approve trust flag (`photoTrusted`)** at launch or later? Recommend later, once the queue actually feels heavy.
5. **Dark mode**: the owner is "light-mode-first, dark mode loses character." The v2 styles already define dark tokens; the grid and detail view will inherit them for free, but the founding curated photos are tuned for the warm light palette. Recommend not spending effort tuning the archive for dark mode in MVP.

---

Files this spec is grounded in (all absolute):
- `/Users/sanan/Documents/rv-connect/prisma/schema.prisma` (models, conventions, string-enum + comma-join idioms)
- `/Users/sanan/Documents/rv-connect/src/app/api/upload/route.ts` (the sharp + storage-shim pipeline to reuse and extend to 3 variants)
- `/Users/sanan/Documents/rv-connect/src/lib/storage.ts` (the `putImage`/`delImage` shim: R2 in production, local filesystem in dev)
- `/Users/sanan/Documents/rv-connect/src/app/(main)/feed/actions.ts` (pagination `take:21/skip` idiom, `delImage` deletion to mirror for declined photos)
- `/Users/sanan/Documents/rv-connect/src/components/posts/create-post-form.tsx` and `post-card.tsx` (composer image handling and `loading="lazy"` rendering to reuse via `<CollectionPicker>`)
- `/Users/sanan/Documents/rv-connect/src/components/admin/report-management.tsx` + `src/components/profile/admin-actions.ts` (moderation queue pattern to mirror as `PhotoQueue`)
- `/Users/sanan/Documents/rv-connect/src/components/directory/directory-client.tsx` (URL-driven filters, debounced search, glass filter panel, empty state to mirror)
- `/Users/sanan/Documents/rv-connect/src/app/preview/v2/page.tsx` (locked v2 design: sidebar `NAV`, header, rail cards, `Hoopoe` easter-egg component, palette tokens)
- `/Users/sanan/Documents/rv-connect/src/lib/validators.ts`, `src/lib/utils.ts`, `src/components/common/user-avatar.tsx`, `src/components/layout/navbar.tsx`, `.claude/skills/liftkit-spacing/SKILL.md` (Zod style, helpers, avatar, IA, spacing tokens)
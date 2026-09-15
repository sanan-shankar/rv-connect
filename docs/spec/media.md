> **READ THIS BEFORE ANY OF WHAT FOLLOWS.**
>
> **The Collection rework (`docs/planning/collection-rework/spec.md`) replaced the design of most
> of this document on 2026-08-28**, and where the two disagree, that one is what shipped.
>
> **On 2026-09-08 the sections this banner had been calling dead were actually deleted.** §2, §5,
> §6, §10, §11 and §12 had each carried a tombstone since August and had gone on printing the dead
> text underneath it, so the file read two ways at once and only a careful reader avoided the
> wrong one. Each is now one paragraph saying what replaced it. A tombstone is not a delete;
> `git log --follow -- docs/spec/media.md` is what preserves the original.
>
> Two corrections that are not deletions and must be read where they sit:
>
> - **§4.2's variant table and §4.4's budget** — corrected 2026-09-05, having been blessed as
>   "still true" here while teaching a three-variant pipeline that has never existed. Two variants
>   ship, not three, and the display one is encoded two different ways depending on which path the
>   upload took. Read those sections, not this line.
> - **§4.3's "blur placeholder"** and the whole question of how a photograph is sized are answered
>   by `src/lib/photo-layout.ts` and `<PhotoFrame>`, which store real dimensions and reserve the
>   space (campaign phases 1-3).
>
> What is still true here: §1 (the name), §3 as rewritten, §4.1 (R2 as the store), §7's principle
> that the archive is reusable across the app, §8 (admin approval) and §9 (the data model, plus
> the columns added since).
>
> **2026-07-02.** Storage is Cloudflare R2 (not Vercel Blob) via the `putImage`/`delImage` shim in
> `src/lib/storage.ts`; hosting is Vercel (compute never moved to Render). For the stack itself see
> `AGENTS.md`; the infra migration runbook lives in git history:
> `git log --follow -- docs/STACK_MIGRATION.md`.

# Spec: media

I now have a thorough grounding in the real codebase: the upload pipeline, image rendering, moderation model, IA, spacing tokens, filter/grid patterns, and avatar conventions. I have everything needed to write the spec. This is my deliverable, returned directly as my final message.

---

# The Photo Archive ("The Valley Collection")

A design and implementation spec for the school photo archive area of RV Connect. Grounded in the codebase as it stood on 2026-07-26: the schema, the upload route, the feed's actions, the post components, the locked v2 design (now `/lab/v2`) and the spacing skill. No files edited.

## 1. Name and identity

### Decision: call it "The Valley Collection" (route `/collection`, sidebar label "Collection")

The owner dislikes "media library" (too clinical, too SaaS) and the project already has a "Letters" naming overload problem, so the new name must be unambiguous, warm, and not collide with "Photos" (which already exists as a *personal* tab on the profile page). Candidates considered:

| Name | Verdict |
|------|---------|
| "The Banyan" | Beautiful, but the banyan is a load-bearing motif better reserved for the brand/landing; overloading it dilutes it. |
| "The Album" | Reads personal/Facebook, which is exactly the wrong frame (this is about the *place*, not people-snaps). |
| "Sightings" | Lovely for birds but too narrow; excludes landscape/campus/ethos. |
| "The Archive" | Accurate but cold and museum-like; discourages casual contribution. |
| **"The Valley Collection"** | **Chosen.** "Collection" frames it as a curated, communal body of work that grows (invites contribution), "Valley" anchors it to the *place* not people, and it has zero collision with "Photos" (personal) or "Letters" (two features). Short label in the sidebar: **"Collection"**. |

Sub-framing in copy: the page header subtitle reads **"A shared picture of the place: the banyan, Rishi Konda, the birds, the light."** This sentence does the policy work of telling people what belongs here (the place) versus what does not (selfies, reunion group shots), without a rulebook. No em dashes anywhere, per the owner's constraint; the colon above is intentional and allowed.

### Icon

The v2 sidebar (now `/lab/v2`) used Lucide `FolderOpen` for "Groups" and `Newspaper`, `Users`, `Feather`, `CalendarDays`, `Info` for the others. The Collection needs a distinct glyph that reads as "many images / gallery" rather than "one photo":

- **Sidebar chrome icon: Lucide `Images`** (the stacked-frames glyph, `import { Images } from "lucide-react"`), `strokeWidth={1.9}` to match the existing `n.icon size={18} strokeWidth={1.9}` nav convention. `Images` (plural, stacked) is visually distinct from the single `ImageIcon`/`ImagePlus` already used in the composer, so the sidebar item does not look like "add a photo."
- **Decorative / hero / empty-state icon: Phosphor duotone**, per the CLAUDE.md rule ("`@phosphor-icons/react` duotone for decorative/hero contexts"). Use `<ImagesSquare weight="duotone" />` or `<Mountains weight="duotone" />` from `@phosphor-icons/react`. `Mountains` doubles as a quiet nod to the three peaks (Bodikonda, Middle Peak, Rishikonda) that will become the real logo, so it ties the empty state to the brand story.

This keeps the icon language consistent with the established split: Lucide for chrome, Phosphor duotone for decorative.

## 2. Purpose, scope, and what stays out

**Deleted 2026-09-08; it was marked dead on 2026-08-28 and printed underneath its own
tombstone for eleven days.** It argued that the archive was about the place and not people, and
built three mechanisms to keep people out, including a canned decline for a class photograph. The
owner widened the frame to the school's whole visual memory: **people, class photographs and events
all belong.** The shipped taxonomy leads with **People**. `git log --follow -- docs/spec/media.md`
has the original if the reasoning is ever wanted.

## 3. Information architecture and routes

*(Rewritten from `src/app/(main)/collection/` on 2026-09-08. The table below used to describe a
sidebar that no longer exists and a route that never did.)*

The Collection sits in the sidebar between Letters and About. Two routes, both under `(main)` so
they inherit its auth gate:

| Route | What it is |
|---|---|
| `/collection` | The archive itself: a river of justified rows, six buckets on one line, a year rail, search on the title line, four orders. `?scope=class` is the same page's other half, a different title and a flipped caret. Server component, hydrating a client that pages both ways. |
| `/collection/[id]` | **A permalink, not a detail page.** It opens the viewer over the grid. Deep-linkable and shareable; there is no separate reading surface for one photograph. |

**There is no `/collection/contribute` and there never was.** Contributing is a pop-up, opened from
the archive itself (`src/components/collection/contribute-room.tsx`).

**A drop says how far it has got.** Photographs climb to the bucket three at a time from the moment
they land; one count and bar ("Uploading 34 of 100", then "Adding 12 of 100") sits above the Add
button with "Keep this tab open", and goes once nothing is left to wait for. Add waits for every
climb to finish before filing, so nothing is sent twice. Closing the pop-up on photographs not yet
added asks first ("Discard 12 photographs?"), and closing the tab raises the browser's own prompt
(`src/components/common/use-leave-guard.ts`, which the post composer uses too).

**The admin queue is its own route**, `/admin/review` — not a tab inside `/admin`, which is what
this spec proposed. It was split out on 2026-08-30; `docs/spec/admin.md` §9.5b says why.

## 4. Cost-aware storage strategy (the load-bearing decision)

The owner's hard constraint: **hosting photos is expensive, storage is limited.** Hosting is Vercel; the database is Supabase Postgres (Mumbai). This changes the storage math and is the single most important decision in this spec.

### 4.1 Where the bytes live

*(Historical: this section originally proposed keeping Vercel Blob and documented Cloudflare R2 as a fallback if Blob cost became a bottleneck. That fallback is now the actual implementation — see the banner at the top of this file.)*

The existing pipeline (`src/app/api/upload/route.ts`) already does the right thing and must be **reused, not rebuilt**: every upload is processed through `sharp` (`resize(1920,1920,{fit:"inside",withoutEnlargement:true}).webp({quality:80})`) and written via the storage shim, `src/lib/storage.ts`'s `putImage`/`delImage`. The shim picks Cloudflare R2 (S3-compatible, zero egress) when `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`/`R2_BUCKET`/`R2_PUBLIC_BASE_URL` are all set, and falls back to the local filesystem under `public/` otherwise (local dev only). Deletion mirrors this in `feed/actions.ts deletePost`, calling `delImage(url)` which routes to an R2 `DeleteObjectCommand` or a local `unlink` depending on the URL's shape.

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

### 4.2b The third rendition: what Download hands over

**Added 2026-09-08.** Two derivatives are STORED; a third is made on demand and
kept nowhere. The owner: *"when I download images from places it comes as webp.
people can't really use that."* He is right — older Photoshop, Preview's print
dialog and most print shops still refuse a `.webp`, so the Download button was
handing an alumnus a file they could not open, named after its object key.

`GET /api/photo/download?url=…` re-encodes the stored display copy to **JPEG
q92** and streams it. Full resolution, unresized: the archive stores full-res on
purpose and a download is the one moment that matters.

- **Not PNG**, which was asked for first. Measured on real archive photographs:
  6000x4000 is 3.9MB as JPEG and 43.5MB as PNG; 3456x4608 is 2.7MB against
  20.4MB. Eight to eleven times the traffic for no picture, because what PNG
  would losslessly preserve is a WebP that was already lossy.
- **The taken-date survives.** `.keepExif()`, which on a stored copy means
  exactly `DateTimeOriginal` and nothing else — the GPS a phone writes was
  dropped at upload (M12). So the file files itself under 1978 in somebody's
  photo app rather than under today, which is why the date was kept in the
  first place (§4.2, 2026-09-01).
- **The input check is `keyForUrl`**, the same one the delete path trusts, so
  the converter cannot be aimed off-host and made an open proxy. Session-gated
  and metered (`photoDownloads`, 60/hour) because the CPU is the cost, not the
  bytes — the stored object was always publicly fetchable.
- **The response is streamed, and must stay streamed.** See `docs/TRAPS.md`:
  Vercel caps a buffered response at 4.5MB, which the larger half of this
  archive exceeds as a JPEG.
- **The filename is built client-side** (`src/lib/photo-save-name.ts`), from
  the caption and the taken-date: "Rishi Valley 1978 Sports day.jpg". It is set
  through the anchor's `download` attribute rather than a `Content-Disposition`
  header, so a member-written caption never reaches a header.
- The button shows a spinner and refuses a second press while a save is in
  flight; a 24-megapixel photograph is around six seconds end to end.

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

## 5. Cataloging: the tag taxonomy

**Deleted 2026-09-08, same reason as §2.** It specified four facets and fourteen `subject` values,
none of which could file a class photograph. What shipped is **six buckets** in
`src/lib/collection.ts` — People, Birds, Nature, Campus, School life, Other — plus a decade, and no
facet dropdowns at all. `area` and `freeTags` survived as columns nothing wrote (0 of 1,749 rows);
the code stopped reading them on 2026-09-07 and their removal SQL is
`prisma/migrations-manual/2026-09-07-drop-collection-legacy-tags.sql`, unrun. **The columns still
exist.**

## 6. The grid page UX

**Deleted 2026-09-08, same reason as §2.** It specified a masonry of CSS columns behind a rail of
three `Select`s and an "A wander" random sort. What shipped is a river of justified rows, the six
buckets on one line, a year rail, search on the title line and four orders. The page is
`src/components/collection/*`; the design that replaced this section is
`docs/planning/collection-rework/spec.md`.

## 7. How it ties into the rest of the app (reuse)

This is where the archive earns its keep instead of being a silo. The owner wants pictures usable as post images and profile/cover photos, and cover images for groups/events.

1. **Shared upload pipeline.** *(Proposal, and not what shipped: the Collection has its own
   contribute path with its own encode, and returns two variants. See the corrected §4.2.)*
   The archive uses the *same* `/api/upload` route and `sharp` settings as the composer; the only delta is generating three variants and returning `{thumbUrl, url, originalUrl, width, height, blurhash}` instead of a flat `urls` array. To avoid breaking the existing `create-post-form.tsx` (which expects `{urls}`), add a `?variants=1` query flag or a second route `/api/upload/photo`; the composer path stays untouched. This honours the project's "shared composer / shared feed" modular goal.

2. **"Add from the Collection" picker.** A small reusable `<CollectionPicker>` client component (a dialog showing the masonry of approved photos with single/multi select) becomes the *shared image source* across the app:
   - In the **post composer** (`create-post-form.tsx`), beside the existing "Photo" upload button, add a "From the Collection" button. Selecting a photo pushes its `url` (the 1600px display variant) into the existing `images` state array; nothing else in the post flow changes, because posts already store `images` as a JSON array of URLs (`Post.images`, `parseJsonArray`). This means a beautiful banyan shot someone uploaded can be reused in a post without re-uploading or re-storing bytes.
   - **Profile cover** and **group/event cover** images use the same picker, storing the chosen `url` on `User.coverPhoto` / `Group.coverPhoto` / `Event.coverPhoto` (new columns). The v2 profile already renders a `cover-photo` div and a `photos-grid`; this wires real data into it.

3. **Backlinks ("appears in").** Because a Collection photo's `url` may be embedded in posts/covers, the detail page can show "Used in 3 posts" by querying `Post.images contains photo.url`. This makes the archive feel alive and connected rather than a dead-end gallery. Cheap to compute on the detail route only.

4. **Reuse rendering + helpers.** `parseJsonArray`, `formatTimeAgo`, the shared avatar (uploader credit), the installed shadcn primitives and the `glass` utility all carry over. No new design primitives needed.

## 8. Moderation (admin approval)

The project already has a complete moderation pattern to mirror: the `Report` model with `status: "pending" | "reviewed" | "dismissed"`, `Post.isHidden`, admin actions (`adminHidePost`, `adminDismissReport`, `adminResolveReport` in `app/(main)/admin/reports/actions.ts`), and the `ReportManagement` queue UI inside `/admin`.

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

## 10. Seeding and marketing the collection

**Deleted 2026-09-08.** It planned how to reach a founding set of 40 to 60 photographs, and
solved a chicken-and-egg problem that no longer exists: the archive holds 1,749, imported from the
owner's own album in one pass. The ideas that outlived the problem — a Collection card in the feed
rail, theme drives, setting a profile cover from the archive — are in `docs/planning/FEATURES.md`,
which is where a parked idea belongs.

## 11. Micro-animations and delight

**Deleted 2026-09-08.** It specified a staggered masonry tile entrance and a cross-fade for the
"A wander" sort, and the banner above already says there is no masonry and no "A wander". The
motion rules are DESIGN-SYSTEM §7; the delight bank is `docs/content/DELIGHT.md`.

## 12. Open questions

**All five are answered, so the section is deleted, 2026-09-08.** For the record: `originalUrl`
was never built and needs no successor (§4.2); Blob versus R2 resolved as R2 behind the
`storage.ts` shim (§4.1); photo reporting is still the upfront approval gate plus admin takedown;
`photoTrusted` exists and is set from the person page; dark mode shipped 2026-08-02 and the archive
inherited it.

---

Files this spec was grounded in, as they stood on 2026-07-26. Several have since moved or gone;
they are named as history, not as places to look:
- `prisma/schema.prisma` (models, conventions, string-enum + comma-join idioms)
- `src/app/api/upload/route.ts` (the sharp + storage-shim pipeline; note §4.2 for what it
  actually encodes, which is not what this spec assumed)
- `src/lib/storage.ts` (the `putImage`/`delImage` shim: R2 in production, local filesystem in dev)
- `src/app/(main)/feed/actions.ts` (pagination `take:21/skip` idiom, `delImage` deletion to mirror
  for declined photos)
- the composer and post card (image handling and `loading="lazy"` rendering)
- the admin report queue and `src/app/(main)/admin/reports/actions.ts` (the moderation pattern the
  photo queue mirrors)
- `src/components/directory/directory-client.tsx` (URL-driven filters, debounced search, glass
  filter panel, empty state to mirror)
- the locked v2 design, now `/lab/v2` (sidebar `NAV`, header, rail cards, the hoopoe easter egg,
  palette tokens)
- `src/lib/validators.ts`, `src/lib/utils.ts`, the shared avatar, the old top navbar and the spacing skill (Zod style, helpers, avatar, IA, spacing tokens)
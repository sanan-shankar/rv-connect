# Profile Rebuild — Implementation Spec (Round 6)

Status: decision-bearing, ready to build. Author: profile design lead.
Supersedes the layout in `docs/spec/profile.md` where they disagree (that doc's data-model and
privacy reasoning still hold; this doc owns the layout, IA, and the owner's Round-6 verdict).

This spec is self-contained. An implementer should be able to build from this without reading the
brief that produced it.

---

## 0. The verdict in one paragraph

Base the new profile on the **Dossier** concept, but strip its faults and graft on the best of
**Letterhead**. Keep from Dossier: the **admission-number stamp**, **tab navigation**, the
**houses chain** (colored boxes joined by arrows with year ranges — the owner's favourite element,
must scale to ~10 houses), and the **"Find them" social-links section**. Kill from Dossier: the
continuous/endless posts stream, the **"Write them a letter"** button, **Follow / following**, and
the header clutter ("entered in 4th grade", "at Rishi Valley for X years"). Take from Letterhead the
**contact-card header density** (batch, city, occupation, key contacts in one business-card block)
and the **leaf sitting right after the name**; the RV logo lockup is optional/subtle. About is the
**default tab**; Posts and Letters are **one tab with two labelled groups**; tab order is **About,
then Posts & Letters**. The page must **not be flat/white/lifeless** — it must carry the colour and
background presence the current live profile has (which the owner said has more life than all five
concepts). Desktop (1440) and mobile (390) must be **distinct, individually beautiful** layouts;
desktop must **use the width**, never a narrow column marooned in white gutters.

---

## 1. What each source contributes (traceability)

| Source | Keep | Drop |
|---|---|---|
| **Dossier** (base) | Admission stamp, tab nav, houses chain, "Find them" links | Continuous ledger feel, "Write them a letter", Follow/following, "entered in grade / at RV X years" header line |
| **Letterhead** | Contact-card header density (business card), leaf beside the name | RV colophon lockup (make subtle or omit), narrow single-column that wastes desktop width |
| **Current live profile** (`profile/[id]/page.tsx`) | The **life**: coloured cover band + faint whole-page image wash; the two-column desktop skeleton; click-the-bird; Get in touch; Save contact (VCF) | About-not-default; posts-only-first-tab; long floating rail; header meta pin-soup |
| **Field Guide** | Its one redeeming quality: **flowy background** feeling | Everything else (rejected) |
| **Valley Terrain** | Its one redeeming quality: **a pop of colour** | Everything else (rejected) |
| **Editorial** | Nothing structural. The line under the name was liked but is **overkill — skip** | Rejected |

---

## 2. Data model & field sources (grounded in `prisma/schema.prisma`)

Everything the page renders comes from these, resolved server-side in `profile/[id]/page.tsx`.

### 2.1 `User` (real columns today — do not invent)
- Identity: `id`, `name`, `photoUrl` (uploaded photo, overrides bird), `avatarColor`, `birdOverride`, `verifyState`, `verifiedAt`, `accountType` (`alumnus | teacher | ex_teacher`).
- Batch: `batchType` (`ISC | ICSE | null`), `batchYear`, `yearJoined`, `yearLeft`, `gradeJoined`, `admissionNumber`.
- Teacher: `taughtFrom`, `taughtUntil`, `subjects`.
- Prose: `about` (long-form — THE about field), `bio` (legacy one-liner — see §8.2), `openTo`.
- Work: `jobTitle`, `workplace`.
- Contact: `email` (sign-in), `displayEmail` (**profile shows `displayEmail ?? email`**), `phone`, `instagram`, `linkedin`.
- Houses: `houses` — JSON string of `[{ year, house }]` (per-year). Canonical names in `src/lib/houses.ts` (22 houses + free-text "Other"). **This is the source for the houses chain.**
- Header image: `coverPhoto` (a Collection photo URL reused as the header slot).
- Legacy city columns: `currentCity`, `secondaryCity` — **superseded by `UserPlace`** (read `places` first; fall back to these only if `places` is empty during migration).

### 2.2 `UserPlace[]` (`user.places`) — the cities, new source of truth
`{ id, placeId?, label, city, lat?, lng?, position }`. Unlimited, **ordered by `position`**, **all shown equally** (no primary/secondary labelling). `label` = full display string ("Bengaluru, Karnataka"), `city` = short chip name. `placeId/lat/lng` null = free-typed (gazetteer miss).

### 2.3 `Place` (gazetteer) — backs the location picker only
`{ id (geonameid), name, asciiName, altNames, lat, lng, country, admin1, population }`. Not read by the profile page; consumed by the location-picker module (§9.3).

### 2.4 `Post` (`user.posts`, paginated) — the Posts & Letters tab
`kind` = `"post" | "letter"`, `title?` (letters). Split the author's posts by `kind` into the two groups. Photos tab flattens `post.images` JSON arrays (existing logic in the live page).

### 2.5 Derived helpers (reuse, do not re-derive inline)
- `batchLine(user)` → `"Batch of '23"` (alumni) / `"Teacher"` / `"Former teacher"` / `"Member"`. Header uses this.
- `formatBatch(batchType, batchYear)` → short `Batch of 'YY`.
- `computeBatchFromSchooling(yearJoined, yearLeft, gradeJoined)` → batch (edit-profile "work it out" path).
- Header meta list is built `[...].filter(Boolean).join(' · ')` — never hardcode separators (avoids dangling dots).

---

## 3. Component tree

```
ProfilePage (server, (main)/profile/[id]/page.tsx)
├─ resolves: user, places, houses(parsed), groups, paginated posts, photos,
│            isOwnProfile, isAdmin, contactMethods, vcard
│
├─ <ProfileHeaderCard>                 ← NEW (replaces current cover block)
│   ├─ colour/image band  (§6 — the "life")
│   ├─ <ProfileAvatar>                 ← REUSE (click-the-bird + species chip)
│   ├─ identity: name + leaf + <VerifiedMark>        ← REUSE VerifiedMark
│   ├─ contact-card facts: batch · occupation · cities   (Letterhead density)
│   ├─ key contacts: Email (displayEmail ?? email) + Phone   (prominent)
│   ├─ <AdmissionStamp>                ← NEW (port Dossier stamp, cinnamon)
│   └─ actions: <GetInTouch> (Get in touch + Save contact)  ← REUSE
│
├─ <HousesChain houses={parsedHouses} />   ← NEW (port Dossier HousesTimeline, scale to ~10)
│
├─ <ProfileTabs default="about">        ← REPLACE current ProfileTabs (new IA)
│   tabs: About | Posts & Letters   (+ Photos, + Saved own-only)
│
└─ two-zone body (desktop) / stacked (mobile):
    ├─ TAB PANEL (left / main)
    │   ├─ About:  <ProfileAbout>       ← NEW (prose + valley-years block)
    │   └─ Posts & Letters: <ProfilePostsAndLetters>   ← NEW wrapper
    │        ├─ "Letters" group  → <ProfileAuthorFeed kind="letter">   ← REUSE feed
    │        └─ "Posts"   group  → <ProfileAuthorFeed kind="post">     ← REUSE feed
    │   (Photos → existing grid; Saved → <SavedPostsFeed> own-only)     ← REUSE
    │
    └─ RAIL (right, desktop only; inlined into About on mobile)
        ├─ <ProfileRecordCard>          ← NEW ("The record": years, entered, cities)
        ├─ <ProfileContactCard>         ← NEW (Find them: socials/links)
        └─ <ProfileGroupsCard>          ← REUSE pattern (cap 4–5 + "See all")

Admin-only: <AdminProfileTools>, <FlagPersonDialog>   ← REUSE (unchanged)
```

**Removed entirely:** Follow/following state, "Write them a letter" button, the "AT RISHI VALLEY
YYYY–YYYY · ENTERED IN GRADE N" header eyebrow, the `openTo` tag row's prominence (demote — see §8.4).

---

## 4. Desktop layout (1440) — use the width

Header contact-card + houses chain span the **full content width** (this is what fills the width and
gives the business-card presence). Below, a two-column split: a generous reading column (capped ~660px
measure) + a substantial right rail (~340px), so the rail is a real second column, not a lonely strip.
The colour/image band sits behind the header **and the tab bar** (owner: "maybe sitting behind the tab
bar"); the reading surface below is calm warm paper.

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ░░░ COLOUR / BACKGROUND-IMAGE BAND (cropped stock, cycles; gradient fallback) ░ │
│ ┌───────────────────────────────────────────────────────────────────────────┐ │
│ │  (•bird)   Sanan Shankar 🍃 ✓                              ┌───────────┐    │ │
│ │  avatar    Batch of '23  ·  Software Engineer, Bluepeak    │ ADMISSION │    │ │
│ │            Chennai · Bengaluru                             │ No. 1385  │    │ │
│ │            ✉ sanan@…   ☎ +91 …            (key contacts)   └───────────┘    │ │
│ │            [ Get in touch ]  [ Save contact ]                stamp (cinnamon)│ │
│ └───────────────────────────────────────────────────────────────────────────┘ │
│  HOUSES CHAIN:  [Aravali 2014–17] → [Krishna 2017–21] → … (scales to ~10)      │
│  ┌── tab bar (on the band): [ About ]  [ Posts & Letters ]  [Photos] [Saved]──┐ │
└──┴────────────────────────────────────────────────────────────────────────────┘
   ╭──────────────────────────────────────────╮   ╭──────────────────────────╮
   │ MAIN COLUMN (~1fr, measure ≤ 660px)       │   │ RAIL (~340px, sticky)    │
   │                                           │   │ ┌──────────────────────┐ │
   │  ABOUT (default tab):                     │   │ │ THE RECORD           │ │
   │  ┌─────────────────────────────────────┐  │   │ │ In the valley 2014–21│ │
   │  │ In their words … about prose …      │  │   │ │ Entered in Grade 4   │ │
   │  │ (serif-friendly, ≤64ch)             │  │   │ │ Based in Chennai,    │ │
   │  └─────────────────────────────────────┘  │   │ │  Bengaluru           │ │
   │  ┌─────────────────────────────────────┐  │   │ └──────────────────────┘ │
   │  │ The valley years (prompted memories)│  │   │ ┌──────────────────────┐ │
   │  │ answered prompts only               │  │   │ │ FIND THEM            │ │
   │  └─────────────────────────────────────┘  │   │ │  Instagram · LinkedIn│ │
   │                                           │   │ │  Website …           │ │
   │  (Posts & Letters tab replaces the above: │   │ └──────────────────────┘ │
   │   ── Letters (n) ──  serif letter rows    │   │ ┌──────────────────────┐ │
   │   ── Posts (n)   ──  ruled-sheet feed )    │   │ │ GROUPS (4)  see all →│ │
   │                                           │   │ └──────────────────────┘ │
   ╰──────────────────────────────────────────╯   ╰──────────────────────────╯
```

Rules:
- Grid: `grid-template-columns: minmax(0,1fr) 340px; gap: var(--space-l); align-items: start;`
  Rail `position: sticky; top: var(--space-l)` so it never floats in dead space on long Posts tabs.
- The rail is **persistent across tabs** (Record/Contact/Groups always visible — it is a directory).
- Cap Groups at 4–5 rows + "See all (n)" so the rail never becomes the tallest element (the old
  "rail is too long" complaint).
- Content max content-width ~1120px centered; header/houses/tabs span it fully.

---

## 5. Mobile layout (390) — a distinct linear composition (NOT the desktop squeezed)

One column. The rail content is **inlined into the About tab** (never hidden — the Record/Contact are
the point of a directory). Houses chain becomes a horizontal scroll-snap strip. This is the owner's
sketched linear order.

```
┌───────────────────────────────┐
│ ░ COLOUR / IMAGE BAND ░        │
│      (• bird avatar, overlap)  │
│   Sanan Shankar 🍃 ✓           │
│   Batch of '23 · Software Eng. │
│   Chennai · Bengaluru          │
│   ┌─────────┐                  │
│   │ADM 1385 │  (stamp, inline) │
│   └─────────┘                  │
│   ✉ email      ☎ phone         │
│   [ Get in touch ][Save contact]│
├───────────────────────────────┤
│ HOUSES  → horizontal scroll →  │
│ [Aravali 14–17]→[Krishna 17–21]│
├───────────────────────────────┤
│ [ About ] [ Posts & Letters ]  │  ← sticky tab bar on scroll
├───────────────────────────────┤
│ ABOUT (default):               │
│  In their words … prose …      │
│  The valley years (memories)   │
│  ── The record ──              │
│    In the valley 2014–21       │
│    Entered Grade 4             │
│    Based in Chennai, Bengaluru │
│  ── Find them ──               │
│    Instagram · LinkedIn · Web  │
│  ── Groups (4) ──  see all →   │
└───────────────────────────────┘
  Posts & Letters tab → Letters group, then Posts group (stacked)
```

Rules:
- Header stacks: band → avatar (overlap, `-mt`) → name → batch·occupation → cities → stamp (inline,
  smaller) → key contacts → actions (Get in touch full-width, Save contact beside/under).
- Houses: `overflow-x-auto` with scroll-snap chips; connectors (→) between; never wrap awkwardly.
  If a person has 1 house, render a single chip (no arrow).
- Tab bar sticky (`position: sticky; top: 0`) with a `.glass` backing once scrolled past the header.
- Avatar column layout avoids the clip bug the old cover had (no side-by-side at narrow width).

---

## 6. Colour & life — the header band + background slot (design this now)

The owner's hard requirement: the page must feel alive, not flat/white. Two layers:

1. **Header band (primary colour source).** A full-width band behind the header card **and the tab
   bar**. Source priority:
   1. `user.coverPhoto` if set (owner will also supply a set of **cropped stock images that cycle** —
      spec a `HEADER_IMAGE_POOL` string[] and pick deterministically by `hash(user.id) % pool.length`
      so a given person's header is stable, not reshuffling per load).
   2. Fallback when no image: a **layered radial-gradient wash** using brand tokens — canopy top-left,
      cinnamon bottom-right, plus SVG-noise grain (reuse the exact recipe from the Dossier
      `PAPER_TEXTURE` / Letterhead `PAPER_GRAIN` module-scope constants). Never a flat fill.
   - Treatment over any photo: `bg-gradient-to-t from-black/45` + optional `mix-blend-multiply` tint so
     white text and the avatar ring stay legible (design-system image rule).
2. **Faint whole-page wash (continuity, optional but recommended).** The current live profile's "more
   life" comes partly from a very faint full-page image behind everything. Reproduce subtly: the same
   header image at ~4–6% opacity as a fixed background behind the paper, OR skip if it fights the
   reading area — validate visually. This is the Field-Guide "flowy background" quality, tastefully
   dialled down.

Colour discipline (design-system): Canopy `#235C49` for CTAs, Cinnamon `#C2622F` for the admission
stamp + Letters eyebrows + secondary accents, Leaf `#1F8A4C` for the name leaf + highlights only, Sky
`#3F7CA6` as a sparing cool pop (e.g. group member counts), heart `#E03A33`. The Valley-Terrain "pop
of colour" is honoured by the gradient fallback and the cinnamon stamp, not by a garish header.

---

## 7. The signature elements (ported from Dossier)

### 7.1 Admission-number stamp — KEEP
Port `AdmissionStamp` from `_variant-dossier.tsx` verbatim in spirit: cinnamon double-ruled accession
stamp, never a `#`. The "ink wash" is a separate `mix-blend-multiply` layer from the stroke/numerals so
the stamp renders true `#C2622F` (do not blend the ink colour against the paper — it muddies to red).
Motion: thumps into place on mount (`initial opacity 0, scale 1.5, rotate -16 → scale 1, rotate -7`,
`SPRINGS.snappy` with `delay ~0.3`). Desktop: pinned top-right of the header card. Mobile: inline,
smaller, under the identity block. Only render if `admissionNumber` present. **Public** per owner (not
gated), but keep it visually secondary to the name.

### 7.2 Houses chain — KEEP (the owner's favourite; must scale to ~10)
Port `HousesTimeline`: each house = a pill (`rounded-full`, `font-heading` name + tabular year range),
joined by `→` arrows. Alternate canopy/cinnamon tints per house so a long run reads as distinct
chapters (do NOT invent 22 real house colours). Source = parsed `user.houses` JSON `[{year, house}]`;
collapse consecutive same-house years into a single `fromYear–toYear` box. **Scaling to ~10:** on
desktop `flex-wrap` with arrows; on mobile `overflow-x-auto` scroll-snap. Cap visible year label to
2-digit if space-tight. One house → one chip, no arrow. Zero houses → hide the whole band.

### 7.3 "Find them" links — KEEP
Port the Dossier "Find them" section into the rail Contact card (desktop) / About block (mobile):
labelled social pills built from `instagram`, `linkedin`, and any future `UserLink` rows, each with its
icon (Lucide `Instagram`/`Linkedin`/`Globe`/`Link`), a human label, and the host as faint secondary
text. Normalise URLs (prepend `https://`, `@handle → instagram.com/handle`) via a shared
`socialHref(kind, value)` (the live page already has this — extract to `src/lib/social.ts`).

---

## 8. Interactions, content rules, and kills

### 8.1 KILLS (remove from the current build and from Dossier)
- **"Write them a letter"** button — gone. (You don't write one person a letter.)
- **Follow / following** — gone. There is no following system and never was.
- **Header clutter line** "AT RISHI VALLEY 2014–2021 · ENTERED IN GRADE 4" — gone from the header.
  Those facts move to the rail **Record** card ("In the valley 2014–21", "Entered in Grade 4").
- **Continuous/endless posts** — replaced by the grouped Posts & Letters tab (headers + distinct
  Letter treatment break the stream).

### 8.2 KEEPS (from the current live profile)
- **Click-the-bird** — `ProfileAvatar` chirp + species chip. Unchanged. Owner-loved.
- **Get in touch** — `GetInTouch` dialog listing shared contact methods. Keep.
- **Save contact (VCF)** — the `.vcf` download inside `GetInTouch` + as a header action. Keep; update
  the vCard builder to pull `displayEmail ?? email`, all `UserPlace` cities, and houses.

### 8.3 Tabs & feed
- Default tab = **About**. Order: About, Posts & Letters, then (Photos if any), (Saved own-only).
- **Posts & Letters** is one tab, two labelled groups inside: a **Letters** group (cinnamon eyebrow +
  `Feather`, serif letter rows — the flagship register from the Letters page) rendered first, then a
  **Posts** group (the shared ruled-sheet feed). Each group has a count in its header and its own empty
  state; a group with zero items is hidden. Reuse `ProfileAuthorFeed` (query by `authorId` +
  `kind`), do **not** build a profile-only renderer. Inherit whatever cursor pagination the shared feed
  adopts.
- Photos tab: existing `post.images` flatten. Omit tab if empty.
- Saved tab: `SavedPostsFeed`, own-profile only.

### 8.4 `openTo` tags
Demote, do not delete. If present, render as a small soft pill row **inside the About tab** (top), not
competing with the header. On own profile with none set, show nothing (drop the DEFAULT_OPEN_TO
auto-suggest from the public view; move that nudge to edit-profile).

### 8.5 Header contact-card density (from Letterhead)
The header is a business card: identity + `Batch of '23` + occupation + cities + the two key contacts
(Email using `displayEmail ?? email`, Phone) + stamp + actions, all in one block. Occupation =
`jobTitle at workplace` (filter-join, degrade gracefully). Cities = `user.places.map(p => p.city)`
joined `· `. Leaf glyph sits **immediately after the name** (owner liked the leaf position), followed
by `VerifiedMark`. The RV `PeaksMark` colophon is optional — if included, make it a subtle small mark;
default is to omit.

---

## 9. Edit profile — rebuilt in conjunction

Surface: `(main)/settings` (extend `settings-form.tsx`). Single scrollable page of grouped cards, **no
forced sequential steps**, save per section or one save. Tone: jolly, not homework.

### 9.1 IA — grouped sections (each an independently-savable card)
1. **You** — name, profile photo (existing upload; keep bird fallback copy), header image.
2. **Your batch** — batch-first (§9.2).
3. **Houses** — per-year repeater (§9.4).
4. **Where you are** — the location-picker module: unlimited ordered cities (§9.3).
5. **Work** — jobTitle, workplace.
6. **About** — the prose field, **labelled "About" everywhere** (§9.5). Encouraged, not required.
7. **Contact** — displayEmail (with "leave blank to use your sign-in email" helper), phone, socials.
8. **Valley memories** (optional/parked) — the prompt list, each with a clear "I don't remember / skip"
   affordance; only answered prompts surface on the profile.

### 9.2 Batch-first mental model (replaces "worked out from three facts, correct it here")
- Primary control: **"Batch of ____"** — a year input/picker framed as the headline identity
  ("Which batch are you? The year your class finished 12th."). This writes `batchYear`.
- Secondary, collapsible: **"I left before 12th, or I'm not sure — work it out from my years"** reveals
  the existing `yearJoined / yearLeft / gradeJoined` inputs and runs `computeBatchFromSchooling` to
  fill/verify the batch (keep the live preview chip). Also where teachers pick "I taught here"
  (`accountType`, `taughtFrom/Until`, `subjects`).
- Remove the apologetic "Your batch is worked out from these three facts…" copy from the top.

### 9.3 Location-picker module (shared, integration point)
A gazetteer-backed picker is being built **separately** (backed by `Place` + writing `UserPlace`).
This spec fixes the integration seam so it is used **identically** in onboarding, settings, and
profile-edit:
- Component: `<LocationPicker value={UserPlace[]} onChange={(places) => …} />`.
- Behaviour: type-ahead search against `Place` (via an API route, e.g. `GET /api/places?q=`), add
  unlimited cities, drag-reorder (sets `position`), remove, and free-type fallback that stores
  `placeId=null` with the typed string as both `label` and `city`.
- Output shape matches `UserPlace` exactly so all three surfaces persist the same way.
- Edit-profile just mounts it in the "Where you are" card; do not fork a settings-only variant. When
  the module lands, delete the legacy `currentCity`/`secondaryCity` inputs and backfill.

### 9.4 Houses repeater
Reuse the onboarding `HousesStep` module (`src/components/onboarding/steps/houses-step.tsx`). Rows of
`{ year, house }`; house select from `HOUSES` (22) + an **"Other"** free-text (owner instruction),
normalised via `normalizeHouse`. Persists to the `houses` JSON column. Same module in onboarding and
settings (consistency requirement).

### 9.5 Consistent naming + encouragement
- "**About**" is the label everywhere (kill "Bio" / "In your words" from the form). The form's single
  prose field writes to `user.about`. Decide `bio`'s fate in §12 (open question) — interim: hide the
  `bio` input, keep the column.
- Encourage the About: friendly prompt copy, a soft character counter, a placeholder example, and 2–3
  optional prompt chips ("What do you do now?", "A memory from the valley", "What brought you back?").
- Jolly: warm section headers, a gentle completion cheer, no gating, no wizard.

---

## 10. Motion (transform/opacity only; tokens from `src/components/common/motion.tsx`)

- Import `SPRINGS` (`gentle`/`snappy`/`settle`), `EASE_POP`, `EASE_SPRING`, `FadeRise`, `SpringPress`,
  `useMotionGovernor`. Never hand-type a `cubic-bezier`.
- **Admission stamp:** mount thump — `SPRINGS.snappy`, `delay ~0.3` (§7.1).
- **Tab switch:** underline thumb `layoutId` slide with `SPRINGS.snappy` (reuse the existing
  `ProfileTabs` `motion.span layoutId` pattern); panel content `FadeRise key={tab}`.
- **Houses chain:** entrance stagger via `FadeRise` per chip (small `delay` step); hover lift
  `SpringPress`.
- **Every clickable** (tabs, house chips, contact pills, actions): `SpringPress` for hover/active +
  visible `focus-visible` ring. No `transition-all`; animate only `transform`/`opacity`.
- **Bird:** `ProfileAvatar` chirp/species chip unchanged.
- Motion always plays (no `prefers-reduced-motion` gate); pause only on hidden tab via
  `useMotionGovernor` for any ambient loops (header image shouldn't loop-animate).
- New async work already covered by `loading.tsx` — keep the warm shimmer (not grey pulse).

---

## 11. The photo pop-in fix (fold in)

Symptom: the uploaded profile photo paints ~1s after the rest of the page (the bird SVG paints
instantly; the `<img>` lazy-loads). Fix so everything paints together:
- When `photoUrl` is present, render it via **`next/image` with `priority` + `fetchPriority="high"`**
  and explicit `width`/`height` (reserve the box with `aspect-ratio` to prevent layout shift). Do the
  same for the header band image.
- Ensure `ProfileAvatar` / `BirdAvatar` photo branch uses the prioritized `Image`, not a plain
  lazy `<img>`.
- Add `<link rel="preload" as="image" href={photoUrl}>` (and header image) in the page head for the
  above-the-fold hero images.
- Confirm `next.config` `images.remotePatterns` allows the `*.r2.dev` host (it should already — see
  AGENTS.md). Verify at runtime, not just `tsc`.

---

## 12. Reused vs new (explicit)

**Reuse unchanged:** `ProfileAvatar`, `BirdAvatar`, `VerifiedMark`, `LoveButton`, `BookmarkButton`,
`GetInTouch` (minor vCard/email update), `ProfileAuthorFeed`, `SavedPostsFeed`, `PostCard`,
`AdminProfileTools`, `FlagPersonDialog`, `motion.tsx` primitives, `formatBatch`/`batchLine`/
`computeBatchFromSchooling`/`parseJsonArray`, onboarding `HousesStep`.

**Port from `_variant-dossier.tsx`:** `AdmissionStamp`, `HousesTimeline` (→ `HousesChain`), the
"Find them" contact-row + `PAPER_TEXTURE` recipe.

**New components:** `ProfileHeaderCard`, `HousesChain`, `ProfileAbout`, `ProfilePostsAndLetters`,
`ProfileRecordCard`, `ProfileContactCard`, `ProfileGroupsCard` (or extract a shared rail-card kit),
`src/lib/social.ts` (`socialHref`/`socialIcon`), the header-image pool util.

**Replace:** `ProfileTabs` (new IA: About default, Posts & Letters combined). `settings-form.tsx`
(regrouped, batch-first, About label, location-picker mount).

**Do not touch (separate work):** the gazetteer location-picker module itself (this spec only fixes the
integration seam), the person-in-focus feature (cross-area; `UserMemory` data not yet built).

---

## 13. Build checklist (an implementation agent can follow this without the brief)

1. Read `docs/spec/DESIGN-SYSTEM.md` + this file. Confirm shapes against `/preview/delight/profiles?v=dossier`.
2. `src/lib/social.ts` — extract `socialHref(kind,value)` + `socialIcon(kind)` from the live page.
3. Header-image util — `HEADER_IMAGE_POOL` + `headerImageFor(user)` (coverPhoto → deterministic pool pick → null).
4. `ProfileHeaderCard` — band (image/gradient-fallback + noise), `ProfileAvatar`, name+leaf+`VerifiedMark`,
   contact-card facts (batch · occupation · cities via `filter().join('·')`), key contacts
   (Email=`displayEmail ?? email`, Phone), `AdmissionStamp` (port), actions (`GetInTouch`). No Follow,
   no "Write a letter", no "entered/at-RV" line.
5. `AdmissionStamp` — port from Dossier (cinnamon, split ink/stroke layers, mount thump).
6. `HousesChain` — port `HousesTimeline`; parse `user.houses` JSON, collapse same-house runs, arrows,
   alternating canopy/cinnamon tints; desktop wrap / mobile scroll-snap; scales to ~10; hides if empty.
7. `ProfileTabs` (replace) — About default; tabs About | Posts & Letters | (Photos) | (Saved own-only);
   `layoutId` underline + `FadeRise` panel; real `role="tab"`/`aria-selected`/focus-visible.
8. `ProfileAbout` — demoted `openTo` pills (if any) + About prose (≤64ch, "Read more" past ~6 lines) +
   valley-years prompted block (answered prompts only; own-profile soft prompt to fill).
9. `ProfilePostsAndLetters` — Letters group (cinnamon eyebrow, serif) then Posts group (ruled-sheet),
   counts + per-group empty states, hide empty group; reuse `ProfileAuthorFeed` filtered by `kind`.
10. Rail cards: `ProfileRecordCard` (In the valley YYYY–YY, Entered Grade N, Based in {cities}),
    `ProfileContactCard` (Find them socials + Save contact), `ProfileGroupsCard` (cap 4–5 + See all).
    Sticky, `align-items:start`. Persistent across tabs.
11. Layout: desktop `grid minmax(0,1fr) 340px`, header+houses+tabs full-width; mobile single column
    with rail cards inlined into the About tab, houses horizontal scroll, sticky glass tab bar.
12. Photo pop-in: `next/image priority`+`fetchPriority=high`+explicit dims + `<link rel=preload>` for
    avatar photo and header image; reserve boxes.
13. Edit profile (`settings-form.tsx`): regroup into cards; batch-first control + collapsible
    "work it out" path; About label; mount `<LocationPicker>` (integration seam) replacing city inputs;
    houses repeater via `HousesStep`; jolly copy + encouragement; no wizard/gating.
14. Update `GetInTouch` vCard: `displayEmail ?? email`, all `UserPlace` cities, houses in NOTE.
15. Motion pass: `SpringPress` on every clickable; tokens only; no `transition-all`.
16. Screenshot desktop (1440) + mobile (390), own + other + teacher + minimal-profile; 2 rounds each.
    Watch server log for `PrismaClientValidationError` (verify `houses`/`places`/`displayEmail` reads).
17. `/simplify`; security review (touches contact data + forms); no em dashes; "Rishi Valley" naming.

---

## 14. Edge cases / guardrails
- **Batch line degrades:** teacher → "Teacher"/"Former teacher"; no `batchYear` → "Member"; never invent a batch.
- **Header facts:** `[batch, occupation].filter(Boolean).join(' · ')`; cities separate line; no dangling dots.
- **Cities:** all equal, no primary/secondary label; empty → omit the line; fall back to legacy
  `currentCity/secondaryCity` only while `places` is unpopulated.
- **Houses:** malformed/empty JSON → hide the band, never render "undefined". One house → no arrow.
- **Years:** partial `yearJoined`/`yearLeft` → show the surviving fragment ("from 2014"), never "YYYY–undefined".
- **Admission stamp:** only if present; public but visually secondary; owner + admin still see it on own/any.
- **Contacts:** Email always shown to signed-in members (`displayEmail ?? email`); Phone only if set;
  "Get in touch" disabled if truly nothing shared.
- **Photo vs bird:** photo overrides everywhere; removing photo reverts to the same deterministic bird.
- **Mobile:** rail content inlined into About (not hidden); avatar column layout avoids the cover clip.
- **No glows** on interactive elements; layered ink-tinted low-opacity shadows only.

---

## 15. Open questions (need an owner call)
1. **`bio` vs `about`:** two prose columns exist. Confirm we consolidate to `about` (label "About")
   and retire `bio` (hide input now, migrate/drop later)? Or keep `bio` as a distinct one-line tagline
   under the name?
2. **Contact privacy:** the verdict says show email + phone prominently. Is email visible to **all
   signed-in members** by default (current behaviour), or opt-in per member? Do we need `showEmail`/
   `showPhone` toggles, or is `displayEmail` (choose which email) sufficient?
3. **Header image pool:** owner will supply cropped stock. Confirm delivery format/count and whether
   cycling should be deterministic-per-user (recommended) or truly random per load.
4. **Faint whole-page wash:** keep the current profile's subtle full-page image behind the paper for
   continuity, or restrict colour to the header band only? (Recommend: keep it very subtle.)
5. **RV colophon in header:** omit entirely, or include as a subtle small `PeaksMark`? (Owner lukewarm;
   default = omit.)
6. **Posts & Letters group order:** Letters first (flagship) then Posts, or newest-across-both with
   sub-headers? (Recommend: Letters group first, then Posts.)
7. **`openTo` tags:** keep at all (demoted in About), or retire from the public profile entirely?
8. **Person-in-focus / valley-memories:** `UserMemory` data isn't built. Ship the About "valley years"
   block as a placeholder now, or defer the whole block until the memory model lands?
```

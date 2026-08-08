# Spec: avatars

> **Stack note (2026-07-01):** Image storage is **Cloudflare R2** (not Vercel Blob); the database is **Supabase Postgres, Mumbai** (not Turso/SQLite/Render). Inline references below to Vercel Blob, Turso, Render, or "the DB move" are **superseded** — `photoUrl` holds an R2 URL. See `docs/STACK_MIGRATION.md`.

> **Implementation status (2026-06-29): SHIPPED — reborn as 50 real Rishi Valley birds in colour.**
> The original mono-white silhouette system was replaced: the owner found the off-white birds
> indistinguishable at profile size. The live system is now in **`src/components/common/bird-avatar-v2.tsx`**
> (`BirdAvatar` delegates to it via the `USE_V2` flag; the legacy mono path remains behind `USE_V2=false`).
>
> Current system:
> - **50 species**, each a real bird recorded at/around Rishi Valley, drawn in its **real colours**
>   from big soft rounded shapes (no thin spikes). Curated so no two read alike at 28-40px.
> - **No background** (`BG_MODE="none"` in bird-avatar-v2.tsx): the bird floats, no disc. `BG_MODE`
>   can switch to `"outline"` (sticker halo) or `"inset"` (bird in a coloured disc) in one line.
>   With no disc the visible variety is 50 species x 2 poses (left/right); disc colour is held in
>   reserve for the disc-bearing modes.
> - **Optical centering** is data-driven: `scripts/dev/centroid.mjs` rasterises each bird, finds its
>   true pixel centroid + area, and writes scale/nudge corrections to
>   `src/components/common/bird-adjust.json` (read via `archeTransform`). Birds are sized by visual
>   MASS (area-equivalent radius), not their farthest tip, so a long bill/tail/crest never shrinks
>   the body. Converged: every bird centroid = (50,50), consistent body size.
> - **Owner pin**: `SPECIES_PINS` in `src/lib/avatar.ts` pins a user id to a species (the owner is
>   pinned to the Indian Roller, not the Hoopoe - see the reservations below).
> - **Manual per-user override (2026-07, shipped)**: `User.birdOverride` (DB column, a species slug
>   like `"peregrine-falcon"`) lets an admin hand-assign one member's bird without touching the
>   hash. **Precedence is now: photo > `birdOverride` > `SPECIES_PINS` > deterministic hash.**
>   To assign one: resolve the slug by kebab-casing the full name in `SPECIES_FULL_NAMES`
>   (`bird-avatar-v2.tsx`) - e.g. "Peregrine Falcon" -> `peregrine-falcon` - then run one additive
>   SQL update via `node scripts/dev/run-sql.mjs --inline "UPDATE \"User\" SET \"birdOverride\" =
>   'peregrine-falcon' WHERE id = '...'"`. Unknown slugs are silently ignored (falls through to the
>   pin/hash tiers), so a typo never renders as a blank avatar.
> - **Hoopoe reservation**: the Hoopoe (species index 0) is the app's flying mascot
>   (`docs/spec/mascot.md`) and no real member may wear it. `birdOverride = "hoopoe"` only resolves
>   for the Anonymous placeholder account (id `"anonymous"`); for every other id it is ignored
>   (`resolveBirdOverride` in `bird-avatar-v2.tsx`). Separately, any member whose plain hash happens
>   to land on the Hoopoe slot is deterministically remapped to a fixed alternate, the Rufous Treepie
>   (`hashSpeciesFor` / `HOOPOE_HASH_REMAP_INDEX` in `src/lib/avatar.ts`) - this only changes the
>   outcome for ids that would otherwise hash to the Hoopoe; every other id's bird is untouched.
> - **Indian Roller reservation (2026-08-04)**: the Roller belongs to the owner alone. It was moved
>   out of the hashable pool to index 50, one past the end (`BIRD_SPECIES_COUNT` is 50, so
>   `hash % 50` returns 0..49), which means it needs no remap the way the Hoopoe does - nobody can
>   land on it. `birdOverride = "indian-roller"` resolves only for the ids in
>   `ROLLER_RESERVED_USER_IDS`, and `GALLERY_SPECIES` keeps it off `/birds`. **The Laughing Dove was
>   drawn to take its vacated slot 3** rather than being appended: appending would have meant raising
>   `BIRD_SPECIES_COUNT`, and since that number is the hash modulo, every member in the database
>   would have woken up as a different bird. Taking slot 3 changed only the members who used to hash
>   onto the Roller. **Never raise `BIRD_SPECIES_COUNT` to add a species**; take a slot inside 0..49.
> - Rooms: **`/lab/birds-rv`** (gallery, mirrors the shipped `/birds`) and **`/lab/centroid`**
>   (dev harness for the centering script). Verified by `src/lib/avatar.test.mjs`, which covers both
>   the hash distribution and the two reservations.
>
> **Everything below this line is the ORIGINAL design proposal. It is superseded by the shipped
> system described above,** and kept only for the still-valid rationale (why deterministic-from-id,
> the FNV-1a hashing, precedence, accessibility, lightweight goals, edge cases). Where the draft and
> the shipped system disagree, the banner above and the code (`src/lib/avatar.ts`,
> `bird-avatar-v2.tsx`) are authoritative. The main differences to hold in mind while reading:
> - **50 species, not 12.** Every "12" below, the species table in 1.1, and the `768` math are the
>   original plan.
> - The bird is drawn in its **real colours and floats with no disc** (`BG_MODE="none"`). The
>   off-white-silhouette-on-a-coloured-disc design below, the 16-disc palette in 1.2, and the disc
>   markup did not ship; the 10-colour palette and disc are held in reserve for the optional
>   `outline` / `inset` modes.
> - Visible variety is **50 species x 2 poses** (a left/right mirror), not "16 discs x 4 variations".
> - The hash salts are `species::` / `color::` / `pose::` over counts `50` / `10` / `4`, not the
>   `s:` / `c:` sketch in 2.2.
> - Precedence is now: **photo > `birdOverride` (per-user DB slug) > owner/staff pin > hash**
>   (with the Hoopoe hash-exclusion described above). "Manual" in the draft below refers to the old,
>   now-removed `avatarSpecies` render prop, not `birdOverride`.

I have everything I need. The current production code uses `UserAvatar` (initials + `avatarColor` random color), `pickAvatarColor()` assigns random colors at signup, and `User.avatarColor` is the only avatar field in the schema. The v2 preview proves out the bird concept with a single `BirdGlyph` and 3 variants. Now I'll write the exhaustive spec.

---

# Bird-Avatar Generation System

## 0. Scope and the problem this solves

Every member needs a default avatar that is recognizable, calm, on-brand, and *unique enough* that you can tell two people apart in a 600-post feed without reading the name. The current production code (`src/components/common/user-avatar.tsx`) renders **initials on a randomly-picked solid disc** (`pickAvatarColor()` in `src/lib/utils.ts`, persisted to `User.avatarColor` at signup in `src/components/auth/actions.ts`). That is the thing being replaced.

Two problems with the status quo:

1. **Random color is not stable.** It is chosen once at signup and frozen, but it is *random*, so distribution is uneven by luck and there is no relationship between identity and appearance. If we ever re-seed (migration, re-import from the old WhatsApp roster, account merge), the avatar changes.
2. **Initials are weak differentiators at scale and tonally wrong.** "AR" on a green disc reads like a generic SaaS. The valley identity (bird sanctuary, hoopoe, banyan) is the entire emotional hook of this project. The v2 preview (`src/app/preview/v2/page.tsx`, lines 72-132) already proves the bird direction with a single `BirdGlyph` + a color disc.

This spec defines a **procedural, fully deterministic** system: `userId -> (species, plumage color, variation)`, rendered as a centered SVG bird silhouette on a colored disc, with a photo upload that overrides everything. No randomness anywhere after this lands. The same user always gets the same bird forever, on any device, with zero database lookups beyond the fields already present.

### Why deterministic-from-id and not stored

We deliberately do **not** store the chosen species/color in the database as the source of truth. The avatar is a *pure function of `User.id`*, computed at render time. Rationale:

- **Zero migration cost.** `User.id` is a `cuid()` that already exists for all 500+ members. No backfill job, no nullable columns to reconcile.
- **Stable across environments.** Turso today, Render/Postgres tomorrow: `id` is preserved across the DB move, so avatars do not churn during the deploy migration.
- **No write path to maintain.** Signup does not need to "pick" anything. We can delete `pickAvatarColor()` and the `avatarColor` write.
- **Re-import safety.** When the admin bulk-imports the historical roster, as long as a member keeps their `id`, they keep their bird.

We *retain* `avatarColor` and add fields only as **optional manual overrides** (see Section 7). The default is computed; the override, if present, wins.

---

## 1. The combinatorial space: how we exceed 500 with margin

> Superseded: the shipped system is **50 real-colour species x 2 poses** (no disc). The 12 x 16 x 4 = 768 model below is the original plan; see the banner at the top of this file.

The avatar is the product of three independent axes:

```
SPECIES (12)  x  PLUMAGE PALETTE (16)  x  VARIATION (4)  =  768 combinations
```

768 > 500 with comfortable headroom, and the three axes are *visually orthogonal* (you perceive species, color, and crest/tail independently), so the *perceptual* distinctness is much larger than 768 raw cells. We are not trying to give all 768 out before collision; we are trying to make collisions rare *and* make any two colliding-on-one-axis avatars still differ on the other two.

### 1.1 Species set (12) — valley birds as flat silhouettes

Chosen from birds actually associated with Rishi Valley's sanctuary, picked so the **silhouettes are mutually distinguishable at 32px** (the binding constraint). Silhouette shape, not feather detail, is what survives at 32px, so each species is defined by *one dominant shape gesture*:

| # | Species | Silhouette signature (what makes it readable at 32px) |
|---|---------|-------------------------------------------------------|
| 0 | **Hoopoe** | Fanned **crest** of 5 spikes + long down-curved bill. The mascot bird; appears in the set but is *not* over-weighted (see easter-egg note 9.3). |
| 1 | **Rose-ringed parakeet** | Hooked heavy bill + long **tapering tail** (longest tail in set). |
| 2 | **Green bee-eater** | Slim body + **two thin tail streamers** + thin straight bill. |
| 3 | **Purple sunbird** | Tiny round body + **steeply down-curved thin bill**, perched-upright posture. |
| 4 | **White-throated kingfisher** | Chunky body + **oversized dagger bill** + short tail (top-heavy). |
| 5 | **Red-vented bulbul** | Rounded body + small **pointed peak crest** (single spike, contrast with hoopoe fan). |
| 6 | **Indian roller** | Broad-shouldered, **squared head**, short bill, stocky. |
| 7 | **Drongo** | Sleek body + **deeply forked tail** (the fork is the tell). |
| 8 | **Coppersmith barbet** | Very round, **stub bill**, almost neckless "ball" profile. |
| 9 | **Paradise flycatcher** | Crested head + **single very long ribbon tail** (distinct from parakeet's broad taper). |
| 10 | **Indian peafowl (peahen profile)** | Long neck + small **head tuft** of 3 dots-on-stalks. |
| 11 | **Tailorbird / warbler** | Smallest, **cocked-up short tail**, fine bill (the "wren" gesture). |

Design rule for the set: every silhouette must be readable as *a single filled path* (plus at most 2 accent sub-paths for crest/tail/eye). No internal feather lines, no gradients inside the glyph at the base layer. This is what keeps the set lightweight (Section 6) and legible small.

> Note: the existing `BirdGlyph` in the v2 preview is a *generic* bird with `variant` 0/1/2 toggling tail-shape/crest. This spec **supersedes** that placeholder with 12 named species. We keep its proven structural ideas (single white fill on a colored disc, eye color = disc color for a subtractive "negative-space" eye, lines 89-90) and its sizing approach (`size * 0.66`).

### 1.2 Plumage palette (16) — discs from the locked accent system

The disc background colors are drawn **only** from the locked v2 palette and its tonal neighbors, never default Tailwind blue/indigo (hard rule in CLAUDE.md). The bird silhouette itself is always a near-white `--surface`-tinted fill (`#FBFBF8` at ~97% opacity, matching v2 line 84) so it reads on every disc. We never tint the bird; we tint the disc. This is the single most important legibility decision: one foreground, sixteen backgrounds.

The 16 discs are organized into four tonal families so the overall directory never looks like a Skittles bag, staying within the "warm light, restrained accent" brief:

| Family | Disc hex values | Source |
|--------|-----------------|--------|
| **Leaf / green** (5) | `#2F6A56` `#1F6F57` `#3D8B37` `#5A8A52` `#6E8B6B` | primary + sidebar greens (v2 vars) |
| **Office blue** (3) | `#3F7CA6` `#5F7E8C` `#4A7E8E` | the vivid `--blue` pop + muted teals |
| **Cinnamon / bark** (5) | `#C26B39` `#9A6B3F` `#B8860B` `#A9763F` `#C98A5A` | `--cinnamon`, bark golds, hoopoe body |
| **Earth / clay** (3) | `#7B6B5A` `#8C7B5F` `#6B5F4A` | warm neutrals for visual rest |

Each disc background is paired with a slightly darker **rim** (the inset ring at v2 line 640, `inset 0 0 0 1px rgba(255,255,255,.18)`) and a subtle 2-stop vertical gradient (top 6% lighter, bottom 6% darker) to give the disc the layered, non-flat quality the design guardrails demand. Disc colors are intentionally mid-to-deep saturation so the off-white bird has contrast at all sizes; we exclude pale tints (the Clay `#E8DCC8` / Paper `#F8FBF8` brand colors are background-only, never disc colors, because an off-white bird would vanish on them).

Heart red (`#DD5043`) is **excluded** from the disc palette — it is reserved for the like state and would read as an alert.

### 1.3 Variation (4) — crest/tail micro-differentiators

A small per-bird modifier that does not change the species reading but breaks up identical-species neighbors:

| Variation | Effect | Implementation |
|-----------|--------|----------------|
| 0 | Base silhouette | as drawn |
| 1 | **Plumage accent** | a single small accent shape in a complementary color (e.g. cinnamon throat-patch, blue wing-flash) drawn over the white body. One extra `<path>`. |
| 2 | **Tail/crest lift** | tail raised ~12 deg or crest fanned wider (a `transform: rotate()` on the named sub-path) |
| 3 | **Posture** | whole glyph mirrored horizontally (`scaleX(-1)`) so the bird faces the other way |

Variation 3 (mirroring) is nearly free and doubles apparent diversity. Variation 1 (accent) is the only one that adds a second color into the glyph, and it pulls from the *same* 16-color palette offset from the disc color, keeping the system closed.

---

## 2. The hash: `userId -> (species, color, variation)`

### 2.1 Requirements restated

1. **Deterministic**: same `id` -> same triple, forever, on server and client (must agree, because the avatar can render in a Server Component like `profile/[id]/page.tsx` *and* a Client Component like `post-card.tsx`).
2. **Even distribution**: across 500+ members, no species/color should be wildly over-represented. cuids are *not* uniformly random in their leading characters (they share a timestamp-derived prefix), so we cannot just take "first char mod N".
3. **Decorrelated axes**: species, color, and variation must be statistically independent. If we derived all three from one small number, neighbors who collide on the modulus would collide on everything.
4. **No identical neighbors**: in *rendered order* (a feed page, a directory grid), adjacent avatars should not be visually identical. This is handled partly by the hash decorrelation and partly by a render-time tie-break (Section 4).

### 2.2 Algorithm: FNV-1a 32-bit over the full id, then three independent bit-fields

We hash the **entire** `id` string with FNV-1a (a tiny, well-distributed, dependency-free non-cryptographic hash). FNV-1a's avalanche means the timestamp-prefix problem of cuids disappears: the whole string feeds the hash, and the low bits are well-mixed.

```ts
// src/lib/avatar.ts

const SPECIES_COUNT = 12;
const COLOR_COUNT = 16;
const VARIATION_COUNT = 4;

/** FNV-1a 32-bit. Stable, dependency-free, identical on server & client. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // h *= 16777619, kept in 32-bit unsigned range
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export interface AvatarSpec {
  speciesIndex: number; // 0..11
  colorIndex: number;   // 0..15
  variation: number;    // 0..3
}

export function avatarSpec(userId: string): AvatarSpec {
  const h = fnv1a(userId);

  // Pull three INDEPENDENT slices from different bit regions of the 32-bit hash,
  // re-hashing each slice's domain so the three axes do not share a modulus.
  const species = fnv1a("s:" + userId) % SPECIES_COUNT;
  const color   = fnv1a("c:" + userId) % COLOR_COUNT;
  const variation = (h >>> 28) % VARIATION_COUNT; // top 4 bits, unused by the salted hashes

  return { speciesIndex: species, colorIndex: color, variation };
}
```

**Why salted re-hashing for species and color** (`"s:" + id`, `"c:" + id`) instead of slicing one hash: it guarantees independence cheaply. Two ids that happen to collide on `species` are astronomically unlikely to also collide on `color`, because the two values come from *separately salted* hashes, not two windows of the same number (windows of one hash are correlated through carries). Variation reuses the top nibble of the unsalted hash because a 1-in-4 collision there is harmless and we want to avoid a third hash call per render.

### 2.3 Distribution proof obligation

Because `12 * 16 = 192` does not divide evenly into 2^32, there is a negligible modulo bias (the largest bucket is at most ~`2^-27` more likely than the smallest). At N=500..5000 this is invisible. We make this a **test**, not an assumption:

```ts
// src/lib/avatar.test.ts (vitest)
// Generate 5000 cuid-shaped ids, assert:
//  - every species bucket within ±25% of N/12
//  - every color bucket within ±25% of N/16
//  - chi-square p-value > 0.01 for both axes
//  - species and color are uncorrelated (Cramér's V < 0.1)
```

The ±25% band is generous on purpose: with N=500 and 12 species the expected count is ~42, and Poisson noise alone gives a std-dev of ~6.5, so ~±25% is the natural fluctuation. We are testing for *bias*, not for perfect equality, which would be wrong.

### 2.4 Why FNV-1a and not `crypto.subtle` / a library

- It is ~10 lines, no dependency (keeps the app lightweight, per the owner's constraint).
- It is synchronous (no `await`), so it works inside a render with no effect/hook gymnastics.
- It is identical on Node (server components) and the browser (client components) because it is pure arithmetic on `charCodeAt`. `crypto.subtle.digest` is async and would force the avatar to be stateful.

---

## 3. Component API

The public surface is **one component**, `<BirdAvatar user={...} size={...} />`, that replaces `UserAvatar`. It is a Server Component by default (no hooks, no `"use client"`) so it can render in `profile/[id]/page.tsx` and the directory grid without shipping JS. The chirp easter-egg interactivity is opted into via a thin client wrapper (Section 9.2), so the 99% of avatars that are non-interactive ship zero JS.

### 3.1 Props

```ts
// src/components/common/bird-avatar.tsx

export interface BirdAvatarUser {
  id: string;                 // REQUIRED — the hash seed
  name: string;               // for alt text / aria-label / fallback initials
  photoUrl?: string | null;   // Vercel Blob URL; if present, overrides the bird
  avatarColor?: string | null;   // optional manual disc override (kept from old schema)
  avatarSpecies?: number | null; // optional manual species override (new, see §7)
}

export interface BirdAvatarProps {
  user: BirdAvatarUser;
  size?: number | "sm" | "md" | "lg" | "xl"; // px or token; default "md"
  ring?: boolean;             // 4px surface ring for cover/overlap contexts (v2 line 112)
  interactive?: boolean;      // mount the chirp wrapper; default false
  priority?: boolean;         // pass to next/image when photoUrl present, for above-fold
  className?: string;
}
```

### 3.2 Size tokens

Bridges the old string sizes (`sm|md|lg|xl` in `user-avatar.tsx`) and the v2 numeric sizes (34/40/42/104). We accept **either** a number or a token, so the migration is mechanical:

| Token | px | LiftKit rationale | Where used today |
|-------|----|----|------|
| `sm` | 28 | feed inline, comment authors, mention dropdown | `comments-section.tsx`, `mention-dropdown.tsx` |
| `md` | 40 | post header, composer, directory rows | `post-card.tsx`, rail rows |
| `lg` | 64 | directory cards | `profile-card.tsx` |
| `xl` | 104 | profile cover | `profile/[id]/page.tsx`, v2 line 328 |

The bird glyph is always drawn at `floor(size * 0.66)` inside the disc and centered with CSS grid `place-items: center` (matching v2 line 640). The **viewBox is fixed at `0 0 32 32` for the glyph and `0 0 40 40` for the disc**, so scaling is purely a `width`/`height` swap; no geometry recompute, identical optical weight at 28px and 104px.

### 3.3 Render logic (precedence)

```
1. photoUrl present?            -> render <img>/<next image> cover-cropped, circular.  (PHOTO WINS)
2. else compute spec = avatarSpec(user.id)
3. apply manual overrides if set: spec.colorIndex <- indexOf(avatarColor); spec.speciesIndex <- avatarSpecies
4. render <BirdDisc species color variation /> with aria-label={user.name}
```

This is the literal reading of the owner's constraint "Photo upload overrides the generated bird." Precedence is: **photo > manual override > deterministic hash**.

### 3.4 Markup shape (the disc)

```tsx
<div
  className="bird-av"
  data-size={size}
  style={{ width, height, background: `linear-gradient(180deg, ${lighten(disc,6)}, ${darken(disc,6)})` }}
  aria-label={user.name}
  role="img"
>
  <BirdGlyph species={spec.speciesIndex} variation={spec.variation} size={glyphPx} disc={disc} />
</div>
```

- `.bird-av`: `border-radius:50%; display:grid; place-items:center; overflow:hidden; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18), 0 1px 2px rgba(30,28,22,.18);` — the layered, color-tinted shadow the guardrails require, not flat.
- The disc keeps the `corner-shape` irrelevant here (it is a true circle) but uses the same inset-ring technique as v2.
- `role="img"` + `aria-label` makes the decorative SVG a single labeled image for screen readers; the inner SVG is `aria-hidden`.

---

## 4. No-identical-neighbors guarantee

Decorrelated axes make a full triple-collision rare (`1/768` per pair). But "rare per pair" still surfaces in a 30-item feed page. Two layers handle it:

1. **Hash decorrelation (primary)** already ensures that even two members sharing a species look different (different disc color ~15/16 of the time). The eye reads *color first* at a glance, so same-species/different-color does not register as "identical."

2. **Render-time variation nudge (defensive, optional)** for dense grids (directory, mention dropdown) where avatars are physically adjacent. The list renderer may pass an `indexHint` that XORs into the *variation* axis only:
   ```ts
   variation = (baseVariation + indexHint_lowbit_if_prev_was_identical) % 4
   ```
   This never changes species or color (so identity stays stable across pages) — it only flips crest/tail/mirror when two *fully identical* triples land adjacent. In practice this fires on well under 1% of rows. It is deliberately scoped to grids and off by default, because the avatar must stay stable on the profile page and in the feed regardless of neighbors.

Decision: ship layer 1 always; ship layer 2 only in `directory-client.tsx` and `mention-dropdown.tsx` where adjacency is tight. Do not apply it in the feed (posts are far enough apart vertically that identical-but-rare is acceptable, and feed avatar stability matters more).

---

## 5. Legibility at 32px and 104px

The two-size mandate drives concrete rules:

- **One foreground color.** The bird is always off-white on a saturated disc. Tested mentally against all 16 discs; the palest disc (`#6E8B6B` leaf-grey) still gives ~2.9:1 against `#FBFBF8`, which is fine for a non-text decorative shape. We *exclude* any disc lighter than that.
- **Silhouette occupies ~66% of the disc, centered.** At 32px that is a ~21px glyph; the species-defining gesture (crest fan, tail fork, dagger bill) sits in the outer third where it survives downscaling.
- **Stroke-free glyph.** No thin strokes (they alias to nothing at 32px). Crest spikes are filled rectangles with min width 1.5 user-units (the v2 hoopoe already does this, line 53), so they hold at small sizes.
- **Negative-space eye.** The eye is a single dot in the *disc color* punched into the white body (v2 lines 89-90, `fill={eye}` where `eye===color`). This gives a focal point without a third color and disappears gracefully at 28px rather than turning to mud.
- **Variation 1 accent** is suppressed below `size < 32` (the accent path is omitted), because a second color in a sub-21px glyph muddies it. Species + color + mirror still differentiate.
- **`shape-rendering` left to the browser default** (anti-aliased) for the body; crest/tail spikes get `shape-rendering: geometricPrecision` so edges stay crisp when scaled up to 104px.

A screenshot verification step is mandatory per CLAUDE.md: render a contact sheet of all 12 species x a few colors at both 32px and 104px, then `Read` the PNG and check each silhouette is distinguishable. (Out of scope to execute here — this is a spec — but it is a required gate before this ships.)

---

## 6. Keeping the SVG set lightweight

The owner explicitly wants the app lightweight. Approach:

- **One component, parametric paths — not 12 files, not 768 files.** `BirdGlyph` is a single component with a `switch(species)` returning one `<path d="...">` (plus optional crest/tail/accent sub-paths). The 12 path strings are short flat-fill silhouettes (the v2 glyph is ~5 paths in ~600 bytes; 12 species at similar size is ~7 KB of path data, gzips to ~2 KB).
- **No external SVG assets, no `<img src="*.svg">`, no sprite fetch.** Everything is inline JSX, so it tree-shakes and ships in the JS/HTML, with zero extra network requests. This also satisfies any future Artifact/CSP constraint and the Blob-only image policy (only *photos* live in Blob).
- **Paths authored on a 32-unit grid** so coordinates are 1-2 digit integers/halves (compact, like the v2 glyph). No 6-decimal Illustrator exports.
- **Disc gradient and ring are CSS**, not SVG, so they are shared across all 768 avatars with one rule.
- **Color tables are arrays of hex strings** (`DISC_COLORS[16]`, `ACCENT_COLORS[16]`), ~300 bytes total.
- **Server Component by default** means most avatars (feed, directory, profile) render to HTML with no client JS at all. Only `interactive` avatars hydrate.

Estimated total weight of the whole system: one `avatar.ts` (~1 KB), one `bird-avatar.tsx` + `BirdGlyph` (~8-9 KB source, far less gzipped), shared by every avatar on the site. Compare to shipping 500 PNGs.

---

## 7. Data model deltas (Prisma)

The hash needs **only `User.id`**, which exists. So the *required* delta is **zero**. Everything below is optional and additive, for manual override and photo support.

```prisma
model User {
  // ... existing fields ...

  avatarColor   String?   // KEEP. Repurpose: was random hex; now an OPTIONAL manual disc override.
  avatarSpecies Int?      // NEW. Optional manual species override (0..11). Null = use hash.
  photoUrl      String?   // NEW. Vercel Blob URL of uploaded avatar photo. Null = generated bird.

  // ... rest unchanged ...
}
```

Notes and migration:

- **`avatarColor` is repurposed, not dropped.** Old rows have random hex values. We change its *meaning* to "optional manual disc override" and **null it out in a one-time migration** (`UPDATE User SET avatarColor = NULL`) so existing members immediately get their deterministic bird instead of a stale random disc. If we prefer not to touch data, the override resolver (Section 3.3) maps a legacy hex onto the nearest of the 16 palette colors; but nulling is cleaner and is the recommended path.
- **`photoUrl`**: there is currently **no avatar photo field** in the schema (`Post.images` and `GroupPost.images` exist for post media, but users have no photo). This is the one genuinely new column required to honor "photo upload overrides the generated bird." Stored as a single Blob URL matching the `*.public.blob.vercel-storage.com` pattern (per AGENTS.md File Storage). Sharp-WebP conversion before upload, square-cropped, per the existing upload pattern.
- **`avatarSpecies`** lets a member who dislikes their assigned bird re-roll to a chosen one from "complete your profile" (fits the owner's "complete your profile" data-collection flow). Range-validated `0..11` in Zod (`src/lib/validators.ts`). Disc color override via `avatarColor` likewise from a 16-swatch picker.
- **`db push`** is sufficient locally (SQLite); a proper migration for the Render/Postgres move. No relations change, no indexes needed (avatar fields are never queried/filtered).

Delete from `src/lib/utils.ts`: `pickAvatarColor()` and the `AVATAR_COLORS` array (now dead). Remove the `avatarColor: pickAvatarColor()` write in `src/components/auth/actions.ts` (signup no longer assigns anything — the bird is computed). Keep `getInitials()` (still used for the photo-load-failure fallback and aria).

---

## 8. Routes / IA / call-site migration

No new routes. This is a **component swap** across existing surfaces. The new `<BirdAvatar>` replaces `<UserAvatar>` at every call site. Inventory (from grep):

| File | Current | Change |
|------|---------|--------|
| `src/components/common/user-avatar.tsx` | `UserAvatar` (initials) | Becomes a thin re-export of `BirdAvatar` (or delete + codemod imports). Keep the name as an alias for a quieter diff. |
| `src/components/posts/post-card.tsx` (line 108) | `<UserAvatar size="md">` | `<BirdAvatar user={post.author} size="md">`. The `post.author` shape (`id,name,avatarColor`) gains `photoUrl`. |
| `src/components/directory/profile-card.tsx` (line 24) | `<UserAvatar size="lg">` | `<BirdAvatar size="lg">` + `indexHint` for neighbor de-dup. |
| `src/components/directory/directory-client.tsx` | grid of avatars | pass `indexHint={i}` (Section 4 layer 2). |
| `src/components/posts/comments-section.tsx` | comment author avatars | `size="sm"`. |
| `src/components/posts/mention-dropdown.tsx` | search-result avatars | `size="sm"` + `indexHint`. |
| `src/components/layout/navbar.tsx` | current-user chip | `size="sm"`, `interactive` (the chirp lives on *your own* avatar — see 9.3). |
| `src/components/groups/group-feed.tsx` | group post authors | `size="md"`. |
| `src/app/(main)/profile/[id]/page.tsx` | cover avatar | `<BirdAvatar size="xl" ring>`. |
| `src/components/posts/create-post-form.tsx` / composer | composer leading avatar | `size="md"`. |

Every one of these already passes `{name, avatarColor}`; the new component needs `id` (always available on the same object) and optionally `photoUrl`. The Prisma `select`s in the page/server files (`post-card` author select, directory select) must add `id` (mostly already selected) and `photoUrl`.

**Settings / complete-your-profile**: `src/components/settings/settings-form.tsx` gains (a) a photo uploader (Blob), (b) a "re-roll my bird" species picker (12 swatches) writing `avatarSpecies`, (c) a disc color picker (16 swatches) writing `avatarColor`, and a "use my generated bird" reset that nulls both. This is additive UI, no new route.

---

## 9. Easter egg: click-to-chirp hook

### 9.1 The hook, not the full implementation

The owner wants 2-3 spread-out, never-cringe delights, with the hoopoe-covering-its-eyes (already built at v2 lines 46-66 / 779-783) as the template. The avatar system **exposes the hook** and is one of the 2-3 sites.

### 9.2 Mechanism

`interactive` avatars render through a `"use client"` wrapper `<ChirpAvatar>` that wraps the server-rendered disc:

```tsx
// src/components/common/chirp-avatar.tsx  ("use client")
// On click/tap of an interactive BirdAvatar:
//  1. play a tiny species-flavored micro-animation (NOT sound by default):
//     - the bird does a single "bob": translateY spring down-and-up (transform only, per no-transition-all rule)
//     - the crest/tail variation path does a quick fan/flick
//  2. emit a soft chirp via WebAudio ONLY if the user has interacted & a per-session
//     "sound on" flag is set (default OFF — never autoplay audio; never intrusive).
//  3. respect prefers-reduced-motion: skip the bob, keep nothing else.
```

Animation uses `motion` (already the project's lib) animating **only `transform`/`opacity`** with spring easing (`cubic-bezier(.34,1.56,.64,1)`, the exact curve already in v2 line 699 `pop`). No layout, no color transition.

The chirp **sound** is a 4-6 note pentatonic pluck synthesized with WebAudio (no audio asset to ship — keeps it lightweight), pitch seeded by `speciesIndex` so each species "sounds" slightly different. It is **off by default**, opt-in, gated behind a first user gesture, and never fires for avatars the user did not click.

### 9.3 Placement and restraint

- **Primary site: your own avatar in the navbar/userchip.** Clicking *your own* bird chirps and bobs. This is discoverable-but-private; it does not fire when scrolling a feed of other people's avatars (those are non-interactive server components). This is the deliberate "spread to 2-3 places, never intrusive" placement.
- **Hoopoe specifically**: if *your* assigned/chosen species is the hoopoe (species 0), the chirp animation is the eye-cover (reusing the exact `Hoopoe` covered/uncovered wing logic from v2), tying the easter egg back to the login mascot. This is the third delight site, and it only ever appears for the small fraction of members whose bird is the hoopoe — which is exactly why the hash must **not** over-weight species 0 (Section 1.1). Random assignment keeps it a rare, "oh!" moment.
- Feed/directory avatars are intentionally inert. Delight that fires on every hover in a 600-post feed would violate "never cringe or intrusive."

### 9.4 Accessibility / safety

- `prefers-reduced-motion: reduce` -> no bob, no animation; the chirp sound (if explicitly enabled) may still play on click as it is user-initiated.
- The interactive avatar is a real `<button>` with `aria-label="{name}, tap to chirp"` only when `interactive`; otherwise it stays a labeled `role="img"`.
- No audio without a prior user gesture (browser policy + courtesy).

---

## 10. Edge cases

| Case | Handling |
|------|----------|
| **Photo fails to load** | `next/image` `onError` (client wrapper) falls back to the generated bird, not a broken image. Server-only path uses a `<noscript>`-safe `object-fit:cover` `<img>` with the bird disc as CSS `background` underneath, so a failed photo still shows the bird color. |
| **`id` missing / empty** (should never happen) | `avatarSpec("")` is deterministic (FNV-1a of empty string is the standard offset basis) -> a fixed fallback bird; plus a dev-only `console.warn`. Never throws. |
| **Manual `avatarSpecies` out of range** | Zod-clamped to `0..11` on write; resolver also `% 12` defensively at read. |
| **Legacy `avatarColor` hex not in the 16-palette** | Resolver maps to nearest palette color by CIE-ish distance, OR (recommended) the migration nulls it so the hash color is used. Never renders an off-palette disc. |
| **Very long / non-Latin names** | aria-label uses the raw name; initials fallback uses existing `getInitials()` which already handles single-word and multi-word. Bird glyph is name-independent, so non-Latin names are unaffected. |
| **Same person, two accounts** (merge) | Each `id` -> its own bird; after a merge the surviving `id` keeps its bird. Acceptable. |
| **SSR/CSR mismatch** | Impossible by construction: the spec is a pure function of `id` with identical arithmetic on both runtimes. No `Math.random`, no `Date`, no locale. This is the core reason `pickAvatarColor()` (which used `Math.random`) is removed. |
| **AvatarGroup / overlap (`-space-x-2`)** | The existing `ui/avatar.tsx` `AvatarGroup` ring technique still works; `<BirdAvatar ring>` provides the `--surface` rim so overlapped birds stay separated. |
| **Dark mode** (parked for MVP but decide) | Disc colors are saturated enough to work on the dark `--surface:#18211D`; the off-white bird needs *no change*. Only the inset ring opacity flips (already conditional in v2 `.v2.dark`). Decision: ship light-first; dark "just works" for avatars because foreground is constant. |

---

## 11. Reuse summary

- **Reuses** the v2 proven structure: white-fill-on-color-disc, `size*0.66` glyph, negative-space eye, inset white ring, `corner-shape`/squircle conventions, and the exact spring curve from v2's `pop`/`bell` animations.
- **Reuses** `getInitials()` (fallback/aria), `cn()`, the `motion` lib, the Blob+Sharp upload pattern from post images, and the LiftKit size tokens.
- **One shared component** (`BirdAvatar`) consumed by feed, group feed, directory, profile, comments, mentions, navbar, composer — matching the owner's "modular + reuse" mandate exactly as the shared post-composer/feed does for posts.
- **Deletes** `pickAvatarColor()` + `AVATAR_COLORS`, the random write at signup, and (optionally) `UserAvatar`'s body (becomes an alias).

## 12. Decision register (the load-bearing choices)

1. **Avatar = pure function of `User.id`**, computed at render, not stored. Zero migration, stable across the Render move.
2. **Shipped as 50 real-colour species x 2 poses (left/right)**, deterministic from `User.id`, with the disc palette held in reserve. (Original plan: 12 species x 16 discs x 4 variations = 768.)
3. **FNV-1a 32-bit, separately salted per axis** (`"s:"+id`, `"c:"+id`) for even, decorrelated distribution; correctness enforced by a chi-square test, not assumed.
4. **One off-white foreground, sixteen saturated discs**; pale brand colors (Clay/Paper) and heart-red are excluded from discs.
5. **Photo > manual override > hash** precedence. `photoUrl` and `avatarSpecies` are the only new columns; `avatarColor` is repurposed and nulled.
6. **Single parametric SVG component**, inline, ~8 KB shared, no per-bird files, no network fetch — lightweight.
7. **Server Component by default**; only `interactive` avatars hydrate and carry the chirp.
8. **Chirp easter egg only on your own avatar**, hoopoe-eye-cover when your bird is the hoopoe; off by default, reduced-motion-safe, never on the feed.

Files this touches (all under `/Users/sanan/Documents/rv-connect/`): new `src/lib/avatar.ts`, new `src/lib/avatar.test.ts`, new `src/components/common/bird-avatar.tsx`, new `src/components/common/chirp-avatar.tsx`, edited `src/components/common/user-avatar.tsx` (alias), `prisma/schema.prisma` (+`avatarSpecies`,`photoUrl`; repurpose `avatarColor`), `src/lib/utils.ts` (delete `pickAvatarColor`/`AVATAR_COLORS`), `src/components/auth/actions.ts` (drop random write), `src/lib/validators.ts` (species/color validators), and the ~10 call sites in Section 8. No files were edited in producing this spec.
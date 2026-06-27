# Spec: delight

I now have a complete, grounded picture. There is even an existing `BlinkingOwl` in the trivia gate (a precedent for the blink-on-load behavior, and a candidate for consolidation). I have everything I need to write the spec without editing any files.

Here is my deliverable.

---

# Delight & Micro-Interaction Inventory

Grounding note. I read the real code, not just the brief. The current state is: the hoopoe exists only in the preview login mock (`src/app/preview/v2/page.tsx`, `Hoopoe` component) and is NOT yet wired into the real `src/components/auth/signup-form.tsx`, which still ships a plain password field. The like-pop is real (`post-card.tsx`, `animateLike` + `scale-110`). The bell-shake is real but lives only in the preview CSS (`@keyframes bell`); the real `notification-bell.tsx` has only `active:scale-95`. `motion` (Framer) is installed but used nowhere. `@formkit/auto-animate` is wired into `post-feed.tsx` only. There is no Bookmark/Save model in `prisma/schema.prisma`. There is a second bird, `BlinkingOwl`, hand-built in `trivia-gate.tsx` with its own blink keyframes. No `prefers-reduced-motion` guard exists anywhere. Avatars are initials-only in real code (`user-avatar.tsx`); the bird glyph lives only in the preview. Every decision below is calibrated to that reality.

## 0. Governing principles (decisions that bind the whole inventory)

These are not decoration; they are the constraints every item below must satisfy.

- **One animation primitive, not many.** Decision: introduce a single `motion`-free CSS-keyframe layer plus a tiny set of shared React helpers, rather than reaching for Framer per-component. Rationale: the brief says "keep the app lightweight" and `motion` is currently dead weight (~tree-shaken but still a habit risk). All items here are expressible in CSS `transform`/`opacity` keyframes triggered by a class toggle. Reserve `motion` for exactly the two cases where layout-aware spring physics genuinely pays off (the bookmark ribbon's enter and the loading scene's looped hop), and import it lazily so it does not enter the auth/feed critical path. CLAUDE.md already forbids `transition-all` and restricts to `transform`/`opacity`; every spec below obeys that.
- **`prefers-reduced-motion` is mandatory, globally.** Decision: add a single `@media (prefers-reduced-motion: reduce)` block in `globals.css` that neutralizes every keyframe named here to its end-state (eyes open, ribbon present-but-static, heart filled, no hop). Rationale: this is the one missing piece that turns "cute" into "accessible-cute," and it is the cheapest insurance against the "intrusive" failure mode. Every item gets a one-line reduced-motion fallback noted inline.
- **Spread, do not cluster.** The brief explicitly says NOT all on auth. Final placement: 1 on auth (the hoopoe), 1 on the avatar (everywhere), 1 on bookmark (feed + profile + letters), 1 on loading (feed/directory/letters first paint), plus the two already-real ones (like-pop, bell-shake) hardened and standardized. That is 4 new + 2 hardened = 6 touchpoints across 4 distinct surfaces. No surface carries more than one "look at me" beat.
- **Trigger discipline.** Delight fires on intent (click, toggle, first-load reveal), never on hover-spam, never on scroll-through, never on every render. Re-render must not re-trigger; each item below names how it de-duplicates.
- **No copy changes here, but: no em dashes** anywhere these features surface tooltips or aria-labels.

---

## 1. The Hoopoe (auth) — upgrade and re-stage

**Status:** exists in preview only; the single most important mark in the product's personality. Needs (a) a visual redesign so it reads unmistakably as a hoopoe, (b) a load choreography so people notice it, and (c) wiring into the real login and signup password fields.

### 1a. Visual redesign (make it obviously a hoopoe)
The current `Hoopoe` is a generic round brown bird with a fan crest and two stubby wings. A real hoopoe (Upupa epops, and the valley's emblem) has three unmistakable silhouette cues that the current mark mostly lacks:

1. **A tall, fanned, black-tipped crest** — the current 5-spoke fan is close but reads as a "crown" not a crest. Decision: keep 5 to 7 feathers, but make them taller (raise the crest origin, lengthen each `rect` from 15 to ~20 units), and give every tip the dark cinnamon-black `--hp-tip`, with the crest fanning slightly wider (rotation spread from `[-16..16]` to `[-22..22]`). The crest is the logo; it must dominate.
2. **A long, slim, decurved beak** — currently a short triangle. Decision: replace with a thin tapering quadratic path that curves gently downward, roughly 1.6x current length. This single change does more than anything to say "hoopoe."
3. **The barred black-and-white wing/tail** — the defining field mark. Decision: this is what the wings should evoke. The current solid `--hp-wing` shapes become the "covering hands" (they sweep up to hide the eyes), but ADD a static furled tail behind the body with 2 to 3 alternating cream/charcoal bars (thin `rect`s), and make the wings' inner edge show one bar each. Result: even at 48px the bird reads as barred + crested + long-beaked = hoopoe.

Decision on size: bump default stage from 76px to **96px** on login/signup (it is the hero of an otherwise quiet form). Keep a 64px variant for any inline reuse.

Decision on the "covering" gesture: today the wings rotate ~68deg to cover the eyes when `!showPw`. Keep that mechanic (it is the template and it is good), but make it read as the bird lifting both wingtips over its eyes, with the wingtips meeting near the midline. Transform-origin stays at the wing roots; spec below.

Color: reuse the existing `--hp-*` custom properties verbatim so the redesign drops into the existing palette. Add `--hp-bar:#F4EEE2` (cream bar) and reuse `--hp-tip` for dark bars.

### 1b. Load choreography (open eyes, then close, so people notice)
This is the headline behavior the brief asks for. The interaction is not "static covered bird" but a tiny three-beat performance on mount.

- **Trigger:** component mount on the login/signup page, exactly once. De-dupe via a `useState(false)` "hasPlayed" flag set true after the sequence, plus the page only mounts once. If the user has already toggled the eye, skip the intro entirely.
- **Sequence (≈1.1s total):**
  1. `0ms` → mounted with **eyes open, wings down** (not covered). Bird is fully visible and looking at you. A subtle settle: body `opacity 0 → 1` over 240ms and `translateY(6px → 0)` with a soft spring.
  2. `≈520ms` → a single **blink**: both `.eye` scale-Y `1 → 0.06 → 1` over 160ms (reuse the existing `BlinkingOwl` blink idea but as a one-shot, not a 5s loop). This is the "notice me" beat.
  3. `≈760ms` → wings **sweep up to cover** the eyes (the default password-hidden resting state), over 420ms with the existing `cubic-bezier(.34,1.5,.64,1)` overshoot. The bird ends shy, covering its eyes, which is the resting password-hidden state.
- **Thereafter:** the eye-cover is driven purely by the password visibility toggle (`showPw`). Reveal password → wings drop, eyes open, optional single blink. Hide password → wings sweep back up. This is the existing mechanic, unchanged.
- **Animation spec:** transform + opacity only. Settle = `transform: translateY` + `opacity`, spring-ish (`cubic-bezier(.34,1.56,.64,1)`). Blink = `transform: scaleY` on `.eye` group around its own center (add `transform-box: fill-box; transform-origin: center`). Wing sweep = existing rotation keyframe.
- **Reduced motion:** skip beats 1 and 2; mount directly into the covered resting state, no settle, no blink. Toggling still swaps covered/uncovered instantly (no transition).
- **Where it lives:** real `src/components/auth/signup-form.tsx` password field and the login page password field. Extract the redesigned `Hoopoe` from the preview into a shared `src/components/common/hoopoe.tsx` so both auth screens import one source of truth. The `v2-hoopoe-stage` wrapper (fixed 88px → 108px height, grid-centered) comes with it.

### 1c. Consolidation decision (cut the owl, or keep it?)
There are now two hand-built birds on auth: `BlinkingOwl` (trivia gate) and `Hoopoe`. Recommendation: **retire `BlinkingOwl` and let the hoopoe carry the trivia gate too**, peeking instead of blinking-idle, so the signup flow has one consistent mascot rather than two competing birds. Rationale: two different birds on adjacent auth screens reads as inconsistent, not charming. If the owl has sentimental value, the fallback is to keep it but move it off auth entirely (e.g. the 404 page) so the two never appear in the same flow. Either way, do not ship both on signup.

---

## 2. Avatar easter egg — the bird chirp/wiggle

**Status:** new. The brief's named example. This is the "spread it off auth" anchor, because avatars appear on every surface.

**Decision on scope:** the wiggle fires only on the **bird-glyph** default avatars, not on photo avatars and not on initials avatars. Rationale: a photo of a real person doing a "chirp wiggle" is uncanny; initials wiggling is meaningless. The bird is the only thing it makes sense for, and it doubles as a gentle nudge: "this is a default bird, you can upload a photo." This requires the bird-glyph avatar (currently preview-only `BirdGlyph`) to be promoted into the real `UserAvatar` as the default-when-no-photo rendering, which aligns with the locked v2 design decision ("bird avatars as default + photo upload override").

- **Trigger:** a deliberate **click/tap on your OWN bird avatar** (the user-chip avatar in the sidebar, and your avatar in the composer). Decision: only your own, not other people's, to keep it a private little toy and avoid "why is this stranger's face wiggling" confusion. Optional second trigger: triple-click any bird avatar anywhere (power-user easter egg, undiscoverable by accident).
- **Animation spec (one beat, ≈420ms):**
  - The whole glyph does a quick **head-tilt wiggle**: `rotate(0 → -9deg → 7deg → 0)` with origin at the body center, spring easing `cubic-bezier(.34,1.56,.64,1)`.
  - The **beak** opens once: a tiny `scaleY(1 → 1.35 → 1)` on the beak path (chirp), synced to the first rotation peak.
  - A single faint **note glyph** (a small ♪ or a 4px dot) fades up and drifts: `opacity 0 → 1 → 0`, `translateY(0 → -10px)` over 500ms, positioned top-right of the avatar, then unmounts. This is the only "added element"; keep it 8px, low-contrast cinnamon, no sound.
  - **No audio.** Decision: never play actual sound; "chirp" is purely visual. Rationale: sound on click is the fastest route to "intrusive/cringe" and breaks in shared/quiet spaces.
- **De-dupe:** ignore re-clicks while a wiggle is in flight (a `isWiggling` ref/state gate); the note element keys off a counter so rapid clicks do not stack.
- **Reduced motion:** the note still fades in/out (opacity only, no drift); the rotation/beak are suppressed. So the easter egg is still acknowledged, just calmly.
- **Where it lives:** `src/components/common/user-avatar.tsx` (the shared avatar). Gate the behavior behind a prop like `interactive` so it only activates on the self-avatar instances (sidebar user-chip, composer), keeping all other avatars inert and cheap.
- **Cringe risk:** LOW, provided audio stays off and it is self-only. The note glyph is the one part that could tip twee; keep it tiny and optional behind a flag if the team wants to A/B it.

---

## 3. Bookmark / Save — the ribbon sweep

**Status:** new feature + new delight. The brief flags bookmarking as "a chance for color and a cute beat." This is the most product-meaningful addition (it gives infrequent visitors a way to keep useful posts at 600/month scale, which ties directly into the scalability constraint).

### 3a. Data model delta (Prisma)
There is no save concept in the schema. Add a join model mirroring the existing `Like`:

```prisma
model Bookmark {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String
  createdAt DateTime @default(now())

  @@unique([userId, postId])
  @@index([userId])
}
```
Add back-relations `bookmarks Bookmark[]` to both `User` and `Post`. A new server action `toggleBookmark(postId)` parallels `toggleLike` in `feed/actions.ts`. A `/saved` route (or a Saved tab on the profile) lists `Bookmark`-joined posts, paginated like the feed. This reuses the existing shared feed component end to end; "saved" is just a different query feeding the same `PostList`/`post-feed`.

### 3b. The interaction
- **Trigger:** click the bookmark button (a third action in the post action row, alongside like and comment). Optimistic toggle, identical pattern to `handleLike`.
- **Animation spec — the ribbon sweep (≈520ms), the signature beat:**
  - The icon is a bookmark/ribbon (Phosphor `BookmarkSimple`, `regular` → `fill` weight on save).
  - On **save**: the outline ribbon **gains color** as a wipe, not an instant swap. Implementation: render the filled ribbon clipped from the bottom, and animate the clip/`scaleY` from `0 → 1` with `transform-origin: bottom`, so color floods up the ribbon like ink filling it, 280ms, eased `cubic-bezier(.34,1.56,.64,1)`. The filled ribbon is **cinnamon** (`--cinnamon` / `#C26B39`), giving the warm-touch color pop the brief wants (red is reserved for hearts, green for primary, blue for office; cinnamon is the right "saved" warmth).
  - Simultaneously a tiny **pennant flick**: the whole ribbon does `rotate(0 → -6deg → 0)` and `translateY(-2px → 0)` (the "sweep over"), 320ms spring.
  - One **settle pop** at the end: `scale(1 → 1.12 → 1)`, 180ms. This is the "cute beat."
  - On **unsave**: reverse the color-wipe (drain downward) over 200ms, no flick, no pop. Calmer, because removing should feel lighter than adding.
- **Confirmation, not a toast storm.** Decision: do NOT fire a Sonner toast on every save (that is noise at 600 posts/month). The animation IS the confirmation. Optionally a single subtle toast only on the FIRST-EVER save in a session ("Saved. Find it under Saved.") for discoverability, then never again that session.
- **De-dupe:** in-flight gate like the like button; the color-wipe keys off the boolean so re-renders do not re-wipe.
- **Reduced motion:** instant weight/color swap (regular ↔ fill, cinnamon), no wipe, no flick, no pop.
- **Where it lives:** `src/components/posts/post-card.tsx` action row, so it appears automatically in the main feed, every group feed, the profile posts tab, and Letters — because all of them render `post-card`. This is the reuse the brief demands: one component, save everywhere.
- **Cringe risk:** LOW. The pennant flick is the one thing to keep restrained (6deg max, not a flag-waving). Color-flood + small pop is the tasteful core.

---

## 4. Loading states — the living scene (replace gray skeletons)

**Status:** the only skeleton today is `ui/skeleton.tsx` (`animate-pulse` gray rectangles). The brief wants a "small lively scene... without being a movie."

**Decision: two-tier loading, not one.**

- **Tier 1, content-shaped skeletons (the common case):** keep skeletons for layout stability, but **stop the gray pulse** and replace it with a warmer treatment: paper-tinted blocks (`--surface-2`) with a slow left-to-right **shimmer sweep** (a translucent gradient band translating across via `transform: translateX(-100% → 100%)`, 1.6s loop, opacity-only highlight). This already feels less "AI loading bar" than `animate-pulse`. Use this for any list/grid where a real layout is about to appear (directory grid, profile, comments). It is calm and not a "scene."
- **Tier 2, the lively scene (one place, on purpose):** the **feed first-paint empty-while-loading** state, and the `/saved` empty-while-loading state, get the bird-among-leaves vignette. This is the one "delight" loader; everywhere else uses Tier 1 shimmer.
  - **Scene:** 2 to 3 scattered leaf shapes (reuse the `LeafMark` silhouette) on the paper, and one small bird (the `BirdGlyph`) that **hops** between two of them.
  - **Animation spec (loops, ≈2.4s/cycle, capped):** the bird does a short hop = `translateX` + an arc via `translateY(0 → -6px → 0)` with a tiny `rotate(±4deg)` lean, spring-eased; pauses ~700ms (a "peck" = quick beak `scaleY` once); hops back. Leaves do a near-imperceptible `rotate(±2deg)` drift on long offset loops so the scene breathes without demanding attention. Everything is transform/opacity.
  - **Not a movie:** the loop is ≤3s, the motion amplitude is small (≤6px hop), and it auto-stops the instant content arrives (the loader unmounts). Decision: if loading exceeds ~6s, freeze the bird mid-scene rather than looping forever, so a slow connection does not turn it into a hypnotic toy.
  - **Reduced motion:** static scene — bird perched among leaves, no hop, no peck. Still warmer than gray, zero motion.
  - **Where it lives:** a new `src/components/common/loading-scene.tsx`, used as the Suspense fallback / loading boundary for the feed and saved routes. The shimmer treatment lives in the existing `ui/skeleton.tsx` (change the class from `animate-pulse` to a new `skeleton-shimmer`).
- **Cringe risk:** MEDIUM if overused. Mitigation: hard rule that the bird-scene appears in at most these two routes; everything else is Tier 1 shimmer. A hopping bird on every spinner would be exhausting.

---

## 5. The like-pop — standardize (already real)

**Status:** real in `post-card.tsx` but ad hoc (`setAnimateLike` + `setTimeout(300)` + Tailwind `scale-110`). Preview has a nicer keyframe (`@keyframes pop` to scale 1.4 with overshoot).

- **Decision:** adopt the preview's overshoot keyframe as the canonical like-pop and drop the manual `setTimeout` toggle in favor of a CSS `animation` re-triggered by a `key` change on the heart wrapper (the preview already does exactly this: `<span className="heartwrap" key={String(liked)}>`). This is cleaner, GPU-cheap, and self-cancelling.
- **Trigger:** like toggle (existing). Fires only on transition to liked, not on unlike (unlike = quiet, heart just empties). Rationale: rewarding the positive action, not the retraction.
- **Spec:** `transform: scale(1 → 1.4 → 1)`, 400ms, `cubic-bezier(.34,1.56,.64,1)`; color crossfades muted → `--heart` (`#DD5043`) via the weight swap. Optional, restrained: 3 tiny particle dots burst outward on like (`opacity` + `translate` from center, 360ms) — flag this as **OPTIONAL and the most cuttable** sub-feature; the pop alone is plenty.
- **Reduced motion:** weight/color swap only, no scale.
- **Where it lives:** `post-card.tsx`, identical everywhere it renders.

---

## 6. The bell-shake — promote from preview to real (already designed, not wired)

**Status:** the shake `@keyframes bell` exists only in preview CSS; the real `notification-bell.tsx` has only `active:scale-95`.

- **Decision:** port the shake to the real bell, but change the trigger. In preview it fires on hover (`:hover svg { animation: bell }`), which on the real product would be hover-spam every time the cursor crosses the toolbar. **Trigger instead on the arrival of a new notification** (unread count increments while mounted), plus a one-shot shake when the dropdown opens with unread items. Rationale: the shake should mean "something happened," not "you moved your mouse."
- **Spec:** the existing `@keyframes bell` rotation wobble (`0 → 13 → -11 → 7 → -4 → 0`), 600ms, `transform-origin: 50% 4px` (top of the bell). Pair it with a subtle one-time scale-pop on the red count badge when it increments (`scale(1 → 1.25 → 1)`, 220ms).
- **De-dupe:** fire on the count-increased edge only (compare previous vs next unread count in an effect), never on every poll/refetch.
- **Reduced motion:** badge color/number updates with no shake, no pop.
- **Where it lives:** `notification-bell.tsx`.

---

## Summary table

| # | Interaction | Trigger | Motion (transform/opacity only) | Lives in | Reduced-motion fallback | Cringe risk |
|---|---|---|---|---|---|---|
| 1 | Hoopoe redesign + open-then-close-on-load | Mount once; then password toggle | settle (translateY+opacity) → 1 blink (eye scaleY) → wing sweep (rotate, spring) | `common/hoopoe.tsx`; login + `signup-form.tsx` | Mount covered, instant toggle | Low |
| 2 | Bird avatar chirp/wiggle | Click own bird avatar (or triple-click any) | head tilt (rotate), beak scaleY, drifting ♪ (opacity+translateY); no sound | `common/user-avatar.tsx` (gated `interactive`) | ♪ fades only, no motion | Low (keep audio off, self only) |
| 3 | Bookmark ribbon sweep | Click save | color-flood wipe (scaleY/clip from bottom, cinnamon) + pennant flick (rotate 6deg) + settle pop (scale) | `posts/post-card.tsx` (→ feed/groups/profile/letters) | Instant fill swap | Low (restrain the flick) |
| 4 | Loading scene + shimmer skeletons | Suspense/loading | Tier1 shimmer (translateX band); Tier2 bird hops among leaves (translate arc + rotate, capped loop) | `common/loading-scene.tsx` (feed/saved) + `ui/skeleton.tsx` | Static perched bird / static shimmer block | Medium (limit scene to 2 routes) |
| 5 | Like-pop (standardize) | Like (not unlike) | scale 1→1.4→1 overshoot, key-retriggered | `posts/post-card.tsx` | Weight/color swap only | Low (particles = cut candidate) |
| 6 | Bell-shake (promote + retrigger) | New notification arrives / open with unread | rotate wobble + badge scale-pop | `layout/notification-bell.tsx` | Number update only | Low |

## Things to CUT or guard (explicit anti-cringe list)
- **Audio on the avatar chirp** — cut entirely. Sound is the single biggest cringe/intrusion risk.
- **Like-burst particles** — the most cuttable sub-feature; ship the pop, hold the confetti.
- **Bird loading scene everywhere** — guard hard: max 2 routes. A hopping bird on every spinner is exhausting and turns delight into noise.
- **Toast on every bookmark** — cut; the ribbon animation is the confirmation. Allow at most one first-save-of-session discoverability toast.
- **Hover-triggered bell shake** (the preview's current trigger) — cut; retrigger on real events only.
- **Two mascots on auth (owl + hoopoe)** — cut the owl from signup; one bird per flow.
- **Pennant over-flick on bookmark** — cap at 6deg; a waving flag is twee.

## Cross-cutting implementation notes
- Add one `@media (prefers-reduced-motion: reduce)` block in `globals.css` neutralizing every keyframe above to its end-state. This is non-negotiable and the cheapest accessibility + anti-intrusion win.
- Promote three preview-only pieces into shared real components: `Hoopoe` → `src/components/common/hoopoe.tsx`; `BirdGlyph` rendering → folded into `src/components/common/user-avatar.tsx` as the photo-less default; the `@keyframes pop`/`bell`/wing CSS → either `globals.css` or co-located component styles.
- Reuse, do not fork: the bookmark surfaces through the one `post-card`, which is rendered by the one shared feed (`post-feed.tsx`, already `auto-animate`-wired) across main feed, group feeds, profile, and Letters. The `/saved` view is the same feed fed a different query. This satisfies the "one shared post component everywhere" constraint directly.
- Keep `motion` (Framer) out of the auth and feed critical path. If used at all, lazy-import it only for the bookmark enter and the loading-scene loop; otherwise everything here is plain CSS keyframes toggled by class/key, which is lighter and matches the "keep it lightweight" mandate.

Relevant files (all absolute): `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx` (source of the Hoopoe, BirdGlyph, pop/bell/wing keyframes), `/Users/sanan/Documents/rv-alumni/src/components/posts/post-card.tsx` (like-pop home + bookmark host), `/Users/sanan/Documents/rv-alumni/src/components/layout/notification-bell.tsx` (bell-shake target), `/Users/sanan/Documents/rv-alumni/src/components/common/user-avatar.tsx` (avatar chirp host), `/Users/sanan/Documents/rv-alumni/src/components/ui/skeleton.tsx` (shimmer target), `/Users/sanan/Documents/rv-alumni/src/components/auth/trivia-gate.tsx` (BlinkingOwl to retire/relocate), `/Users/sanan/Documents/rv-alumni/src/components/auth/signup-form.tsx` (real password field needing the hoopoe), `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma` (add Bookmark model), `/Users/sanan/Documents/rv-alumni/src/app/globals.css` (reduced-motion block + shared keyframes).
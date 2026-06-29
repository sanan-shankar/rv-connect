# Spec: landing

I now have a complete picture: the locked v2 design system (tokens, components, the hoopoe, bird avatars, the green flush sidebar, the ruled-sheet feed), the current hero landing client, the logo lab (peaks/feather/wordmark candidates), the brand tokens in globals.css, and the available animation libraries (`motion`, `@formkit/auto-animate`). I have not edited any files. Here is the exhaustive spec for my assigned area.

---

# The Public Landing Page — Design & Build Spec

## 0. Premise and goal

The landing page is the only surface a non-member ever sees, and the network is invite-only. So its single job is conversion of the right person: a Rishi Valley alum or teacher who lands here, recognizes the place instantly, feels the calm, and wants in. It is a recruiting brochure disguised as a quiet valley, not a SaaS marketing page.

Two audiences, one page:

- Returning members who just want to sign in. They are served entirely by the hero (the fold). They never scroll. We must not slow them down or bury the Sign in affordance.
- Prospective members (alumni and teachers, past and present) who are evaluating whether to request an invite. They scroll. The showcase below the fold sells them.

The current implementation (`src/components/landing-client.tsx`) is a single full-screen hero with two buttons and nothing below. The decision here is to keep that hero almost exactly as it is (it is calm and good) and make the page scrollable into a tasteful feature showcase that uses real screenshots of the app, with restrained scroll-driven motion and two small bird/leaf easter eggs.

This is a public, unauthenticated route, so unlike every other page in the app it cannot live behind the `(main)` layout and cannot reuse the in-app sidebar shell. It is its own composition. It is light-mode only (see Section 9).

---

## 1. Route, file structure, and reuse

### 1.1 Route

Stays at `/` (`src/app/page.tsx`), which currently renders `<LandingClient />`. No routing change. The page remains public per `AGENTS.md` (`/`, `/login`, `/verify` are the public routes).

### 1.2 Component decomposition

The current monolithic `landing-client.tsx` should be split so the page is a server component that streams static content, with islands of interactivity only where motion needs it. Proposed structure under `src/components/landing/`:

| File | Type | Responsibility |
|---|---|---|
| `src/app/page.tsx` | Server | Imports and composes the sections in order. Sets metadata. No `"use client"`. |
| `landing/hero.tsx` | Client (island) | The existing hero, lightly evolved. Needs `useState` for the hover overlay and the scroll-cue. |
| `landing/landing-nav.tsx` | Client (island) | A thin top bar that appears on scroll: peaks logo left, "Sign in" / "Request invite" right. |
| `landing/section-reveal.tsx` | Client (island) | Reusable scroll-reveal wrapper. The ONE animation primitive every section uses. |
| `landing/feature-section.tsx` | Server | Reusable text + screenshot section (the workhorse; used 5 times). |
| `landing/showcase-shot.tsx` | Client (island) | Wraps a screenshot with the browser-chrome frame and a subtle parallax/tilt. |
| `landing/birds.tsx` | Client (island) | The two hopping-bird and leaf-drift easter eggs. |
| `landing/footer.tsx` | Server | Closing CTA band + footer links. |
| `landing/peaks-mark.tsx` | Server | The three-peaks logo as an inline SVG component (see Section 8). |

Rationale for the split: only the hero, the nav, the reveal wrapper, the showcase frames, and the birds need client JavaScript. Everything else (copy, layout, screenshots) is static server-rendered HTML, which keeps first paint fast and the client bundle tiny. This matches the app's stated pattern of keeping things lightweight and modular.

### 1.3 What it reuses from the existing system

- Brand tokens from `globals.css`: `--color-leaf #22A845`, `--color-canopy #1A8035`, `--color-paper`, `--color-ink #1A1A2E`, the LiftKit golden-ratio spacing scale (`--space-xs` … `--space-3xl`), `--radius`, and the `.glass` utility (line 161). Use these, never raw Tailwind blue/indigo (hard rule).
- Fonts already wired via `--font-display` (Libre Baskerville) and `--font-body` (Source Sans 3).
- The accent system from the locked v2 design: the alumni-office blue `#3F7CA6`, cinnamon `#C26B39`, heart-red `#DD5043`. These are defined inside the `.v2` scope in `preview/v2/page.tsx`, not yet promoted to global tokens. Decision: the landing page should read these from the global `:root` once they are promoted (a dependency on the design-tokens workstream); until then, define them as page-scoped CSS variables on the landing root so the page is self-contained and does not block on the token migration.
- The peaks logo component (Section 8), shared with the sidebar/auth pages once built.
- The `Image` component from `next/image` for the hero (already used) and for screenshots.

### 1.4 What it does NOT reuse

The in-app shell (`src/components/layout`, the green sidebar, `(main)/layout.tsx`) is for authenticated pages and must not appear here. The showcase instead embeds *pictures* of that shell. The landing nav is its own minimal bar.

---

## 2. The fold: hero (kept calm, lightly evolved)

Keep the spirit of the current hero exactly: full-bleed valley photo (`/images/landing.jpeg`, already optimized to 970KB from the 6MB original), the line "Welcome back to the valley.", a one-line subhead, and two buttons.

### 2.1 Concrete changes to the existing hero

1. Headline punctuation. Current copy is "Welcome back to the valley." The owner's brief and the v2/auth copy use "Welcome back to the valley" without the period in some places. Decision: keep it as a sentence with a full stop on the landing hero (it reads as a warm greeting, and a period is calmer than none). No em dashes anywhere (hard rule). Confirm no em dash sneaks into the subhead.

2. Subhead rewrite, warmer and more literary, still one line on desktop:
   > "A quiet place for the people who grew up under the same trees. Find each other, share the valley, keep it close."
   This echoes the auth copy ("the people who grew up under the same trees") for brand consistency and sets the literary tone for the sections below.

3. Buttons. Keep two, keep order (primary = join). Relabel to match the invite-only reality and the rest of the app:
   - Primary (solid white on photo, as now): "Request an invite" → `/signup`. The app uses "Join the community" today; "Request an invite" is more honest about the gated model and is more intriguing. Decision: use "Request an invite" on the hero and keep `/signup` as the destination (the signup page already opens with the trivia gate, which reinforces "you have to be one of us").
   - Secondary (outline white, as now): "Sign in" → `/login`.
   - Preserve all three interactive states already present (`hover:scale`, `focus-visible:ring`, `active:scale`). One fix: the secondary button uses `transition-all` (line 53), which violates the hard rule. Change to `transition-[transform,background-color,border-color]` or split into `transition-transform`/`transition-colors`. Animate only transform and opacity for the scale; color changes are allowed via color transitions but not under the `all` keyword.

4. Overlay. Current hover overlay darkens the whole photo from 5% to 25% black on mouse-enter (lines 27-32). Keep it, but the brief says the ecru background is being warmed and surfaces less pure-white; carry that warmth into the photo treatment by layering a very subtle bottom gradient `linear-gradient(180deg, transparent 55%, rgba(20,30,22,0.45))` so the headline always has contrast regardless of hover, and the eye is pulled downward toward the scroll cue. Keep `mix-blend` off the hero (we want the photo to look like the real valley, not tinted).

5. Logo in the fold. Top-left, the new peaks mark in white plus a small "Rishi Valley / Alumni" wordmark, low opacity, so the brand is present immediately. This is the same mark used in the app sidebar.

6. Scroll cue (new). A small, low-key downward chevron or a single hopping bird glyph at the bottom-center of the fold with the label "See what's inside". This is the bridge that tells returning members "ignore me" and tells prospects "there is more". It does a gentle 6px vertical bob (transform only, 2s ease-in-out infinite) and fades out as the user scrolls past 15% of viewport height. This is the first of the spread-out bird touches.

### 2.2 The fold must stay a true full viewport

`min-h-screen` (really `min-h-dvh` to handle mobile browser chrome correctly in Next 16 / modern viewport units) so a returning member sees only the hero and the two buttons, exactly as today. The showcase begins below the fold.

---

## 3. Section flow below the fold

Order is deliberate: lead with the single strongest reason to join (the directory, which the owner names as "the core reason to join"), then breadth (feed, groups), then the two distinctive features (newsletters, photo archive), then trust (invite-only / verification), then the closing ask.

| # | Section | Headline (draft) | Visual | Why here |
|---|---|---|---|---|
| 1 | The Directory | "Find the people, not just the posts." | Screenshot of the directory grid + a profile card | The core reason to join. Lead with it. |
| 2 | The Feed | "The valley, in one quiet sheet." | Screenshot of the ruled-sheet feed | Shows daily life; reassures it is calm, not noisy. |
| 3 | Groups | "Your batch, your house, your city." | Screenshot of a group feed | Concrete belonging; uses the same shared feed component. |
| 4 | Newsletters | "Letters that come round again." | Screenshot of the recurring-newsletter feature | The distinctive Letterloop-style feature; high differentiation. |
| 5 | Photo Archive | "The valley remembers." | Masonry of archive photos | Emotional payload; nostalgia is the strongest pull. |
| 6 | Trust / invite-only | "A small place, kept small on purpose." | The non-obvious verified marker, vouching illustration | Converts the hesitant; explains the gate. |
| 7 | Closing CTA + footer | "Come back to the valley." | Calm band, repeated buttons | The ask. |

### 3.1 Section anatomy (the reusable `feature-section.tsx`)

Every content section (1 through 5) is one component instance. Signature:

```
<FeatureSection
  eyebrow="The Directory"
  title="Find the people, not just the posts."
  body="..."          // 2 short sentences, literary, no em dashes
  bullets={[...]}     // optional 2–3 micro-points
  shot={<ShowcaseShot src=... alt=... />}
  reverse={boolean}   // alternates image left/right down the page
  accent="blue" | "cinnamon" | "leaf"   // tints the eyebrow + small flourishes
/>
```

Layout: a two-column grid (`text` | `screenshot`) that stacks to one column on mobile (text first, then image). `reverse` swaps columns on desktop only so the page has rhythm and does not feel like a stack of identical rows. The eyebrow is a small uppercase tracked label in the section's accent color (reusing the `.pv-eyebrow` treatment from `_shared.tsx`: 11px, weight 700, letter-spacing .16em). Title in Libre Baskerville with tight tracking (-0.03em per the design guardrails). Body in Source Sans 3 at line-height 1.7.

Spacing comes from LiftKit tokens only: vertical section padding `--space-3xl` top/bottom (`6.854em`), inter-element gaps `--space-l` and `--space-m`. Never arbitrary Tailwind steps. Per `CLAUDE.md`, read `.claude/skills/liftkit-spacing/SKILL.md` before finalizing any padding/radius.

### 3.2 Copy tone (warm, literary, no em dashes)

Voice: a person who loves the place writing to another person who loves the place. Short sentences. Concrete valley imagery (banyan, Rishi Konda, hoopoe, dawn light, the dining-hall long table, choir, the nature club). Never marketing-speak ("leverage", "engage", "platform"). Never em dashes; use a period, a comma, or "and" instead. Examples per section:

- Directory: "The whole point is the people. Search by batch, house, city, or what someone does now, and actually find the friend you lost touch with in 2009. Bird avatars until you upload a face."
- Feed: "One ruled sheet, not an endless scroll. A sighting, a memory, a note for the valley. It stays useful even when it is busy, because it was never built to be loud."
- Groups: "Your batch. Your house, year by year. Your city, wherever the valley scattered you. Same quiet feed, smaller room."
- Newsletters: "A round-robin letter that comes back every season. You answer a few prompts, everyone's answers arrive together, and the years stay close even when the miles do not." (Note: the public-facing name for the newsletter feature is owned by the newsletter workstream; this section uses whatever distinct name they land on, NOT "Letters", which is reserved for the long-form post type. Placeholder here: "Roundups" / "Seasons". Do not hardcode "Letters".)
- Photo archive: "Decades of the valley in one place. Founders' Week, the banyan, choir on the steps, the hoopoes that never left. Add the ones only you still have."

### 3.3 Trust section (6) specifics

This is the section that converts a hesitant alum. Content:

- "Invite-only. Members vouch for members, and the alumni office confirms." Visual: a small illustration of overlapping bird avatars with a soft "10 vouched" pill (reuse the bird-avatar glyph from v2). 
- The non-obvious verified marker: show it once, in context, with a one-line caption ("You will know it when you see it."). Do not over-explain; the owner wants it subtle.
- One line of reassurance about what this is NOT: "Not another feed to keep up with. Not Facebook. Just the valley, and the people in it." This directly answers the unspoken objection and matches the owner's framing.

---

## 4. The screenshots / embeds (the "real, very nice app")

The brief insists on REAL screenshots/embeds of the app, not mockups. Decision matrix on how to source them:

### 4.1 Sourcing approach (decided)

Use static, optimized image screenshots, NOT live embeds or iframes, for sections 1 through 5. Reasons:

1. Performance: live `<iframe>` of authenticated pages is impossible (they require auth) and embedding the real React shells would balloon the public bundle and leak in-app code. Static images keep the public page tiny and fast.
2. Control: screenshots let us stage ideal seed content (the Ananya Rao / hoopoe / Founders' Week sample data already in v2) so the app always looks alive and warm, never empty.
3. Privacy: no real member data on a public page. The sample data in `preview/v2/page.tsx` (Ananya Rao, Karthik Menon, the Alumni Office fund post) is fictional and perfect for this.

### 4.2 How the screenshots get produced (workflow)

The repo already has `scripts/qa/screenshot.mjs` / `scripts/qa/screenshot-auth.mjs` and the `screenshot-auth` skill (admin-login bypass). Pipeline:

1. Seed the dev DB with the v2 sample content (or build a dedicated `/preview/showcase` route that renders the real in-app components with fixed seed props, so the screenshots are of *real components*, satisfying "real screenshots of the app" while staying deterministic).
2. Capture at 2x device-scale for retina crispness, at a fixed viewport (1440 wide for the desktop frame; a 390-wide capture for the mobile inset where used).
3. Run each capture through Sharp (already a dependency) to emit WebP at the exact display dimensions plus a 2x variant, and a tiny blurred placeholder (for `next/image` `placeholder="blur"` + `blurDataURL`). Store under `public/images/landing/` (e.g. `directory.webp`, `feed.webp`, etc.).
4. The mobile-verification hard rule applies: each section's screenshot must be checked at 390x844 to confirm it scales and the frame does not overflow horizontally.

This keeps the page honest (it is the real UI) and fast (it is just optimized images).

### 4.3 The `ShowcaseShot` frame component

Each screenshot sits inside a restrained browser/app frame so it reads as "the product", not a floating rectangle:

- A rounded container (`--radius` * ~1.8, squircle via `corner-shape:squircle` as used throughout `_shared.tsx`) with the layered, color-tinted shadow from the design guardrails: `box-shadow: 0 1px 2px rgba(30,28,22,.05), 0 40px 80px -40px rgba(31,111,87,.35)` (green-tinted, low opacity, never flat `shadow-md`).
- A 1px warm border (`--border`).
- A thin top bar with three muted dots (mac-window cue) OR, better and more on-brand, a faux in-app top bar showing the peaks mark and a search pill, so it reads specifically as *this* app. Decision: the faux app top bar, because it reinforces the product identity in every shot.
- The image fills below with `object-fit: cover`, `max-width: 100%`, and lives in its own `overflow: hidden` rounded clip.

Motion on the frame (see Section 5): a subtle scroll-linked parallax (the frame drifts up ~24px slower than the page as it enters) and a one-time tilt-settle (rotateX from 4deg to 0 as it reveals). Transform only.

---

## 5. Animation approach (lively but tasteful, fast)

Principle from `CLAUDE.md`: animate only `transform` and `opacity`, spring-style easing, no `transition-all`. Use `motion` (already installed) for scroll-driven reveals and `@formkit/auto-animate` is available but not needed here. Everything must respect `prefers-reduced-motion`.

### 5.1 The one reveal primitive

`SectionReveal` wraps each section and each screenshot. It uses `motion`'s scroll/viewport hooks (`whileInView` with `viewport={{ once: true, amount: 0.3 }}`) to animate from `{ opacity: 0, y: 24 }` to `{ opacity: 1, y: 0 }` with a spring (stiffness ~120, damping ~20) and a small stagger between the text block and the screenshot (text leads by ~80ms). `once: true` means it fires a single time, so scrolling back up does not re-trigger and the page never feels busy. This is the only general-purpose animation; reusing it everywhere keeps motion coherent and the bundle small.

### 5.2 Scroll-linked parallax on screenshots

`useScroll` + `useTransform` map the section's progress through the viewport to a small `y` translation (range about -24px to +24px) and a faint scale (1.0 to 1.02) on the `ShowcaseShot`. This gives depth without the page "moving". Strictly transform; GPU-composited; no layout thrash.

### 5.3 The bird and leaf easter eggs (2 to 3 places, never cringe)

The owner's template is the hoopoe covering its eyes (already implemented on the v2 login password field). Spread three small touches across the landing page, all opt-in to motion (disabled under reduced-motion), all `transform`/`opacity` only:

1. Scroll cue bird (in the fold, Section 2.1). A tiny bird glyph (reuse `BirdGlyph` from v2) that bobs, inviting the scroll. Tap/hover makes it do a single hop (translateY keyframe with the spring "pop" curve already in v2: `cubic-bezier(.34,1.56,.64,1)`).
2. The hopping bird on the directory section. As the directory screenshot reveals, a small bird hops along the top edge of the frame (3 discrete hops via a transform keyframe sequence, then settles and preens once). It is decorative, positioned absolutely, `aria-hidden`, and pauses off-screen so it does not consume CPU when not visible (gate the animation behind the same `whileInView`).
3. A few drifting leaves between the photo-archive section and the closing CTA. Two or three small leaf SVGs (reuse the leaf path from the logo lab / v2 `LeafMark`) that drift slowly downward and rotate as that band scrolls into view, then stop. Very low opacity, very slow, easy to miss, which is the point. Capped at 3 leaves so it never becomes "snow".

The hoopoe-covering-eyes itself lives on the auth pages (login/signup password field), not the landing page, so the landing keeps the family resemblance (same bird vocabulary) without repeating the exact gag. This is the "spread to 2-3 places" instruction satisfied: scroll-cue bird, hopping bird, drifting leaves.

### 5.4 Reduced motion

A single `useReducedMotion()` (from `motion`) check at the top of each animated island. When true: reveals become instant (`opacity: 1`, no transform), parallax is disabled, birds render static (the bird still appears, it just does not hop), leaves do not drift. The page must be fully legible and complete with zero motion. This is both an accessibility requirement and an `impeccable-audit` P0 concern.

### 5.5 The sticky landing nav

After the user scrolls past the fold (~60% of viewport), a slim top bar fades/slides in (`opacity` + small `y`, transform only): peaks mark left, "Sign in" (text link) and "Request an invite" (small leaf-green pill) right. It is `position: sticky` / fixed with a `.glass` backdrop (reusing the global `.glass` utility) so it sits on the warm content without a hard edge. This keeps the CTA always one tap away during the long scroll, which is the main conversion lever. Hidden in the fold itself so the hero stays pristine.

---

## 6. Performance plan (keep it fast)

The public landing page is the most performance-sensitive surface (first impression, likely first contentful paint the prospect ever sees, possibly on Indian mobile networks). Decisions:

1. Server-render everything static. Only the hero, nav, reveal wrapper, showcase frames, and birds are client islands. Section copy and layout are server HTML, so they are in the initial document and need no hydration to be readable.
2. Hero image. Keep `priority` on the hero `Image` (already set) so it preloads; it is the LCP element. Serve it as WebP/AVIF via `next/image` (the source is already the 970KB `landing.jpeg`; consider re-encoding to AVIF for a further drop). Use `sizes="100vw"`. Add a `blurDataURL` placeholder so the fold is never blank.
3. Screenshots lazy-load. Every `ShowcaseShot` image is `loading="lazy"` with `placeholder="blur"`. Below-the-fold images never block first paint. Each is sized exactly (intrinsic width/height set) to avoid layout shift (CLS = 0).
4. Animation cost. `motion` is already a dependency, so no new bundle weight. Reveals use `whileInView` with `once: true` so observers detach after firing. Parallax uses `useScroll` scoped per section (not a global scroll listener fan-out). Bird/leaf loops are gated behind in-view so off-screen animations are paused. No `requestAnimationFrame` loops left running.
5. No web fonts beyond the two already loaded (Libre Baskerville, Source Sans 3). No icon-font; Lucide/Phosphor are tree-shaken SVGs (already in use).
6. CSP / self-contained. Everything (image, fonts) is same-origin from `public/`; no third-party embeds, trackers, or CDN calls, which also keeps it fast and private.
7. Budget target. Aim for LCP < 2.0s on a mid mobile, JS for the route < ~60KB gz on top of the framework baseline, CLS 0. Verify with the `impeccable-optimize` / `impeccable-audit` skills before merging (the `CLAUDE.md` workflow calls for an audit pass on significant UI).

---

## 7. Data model (Prisma) deltas

The landing page is almost entirely static marketing content and needs no new persisted models. However two optional, low-cost enhancements would make it feel alive and are worth specifying:

### 7.1 Live "social proof" counters (optional, recommended)

A single trust line in the hero or trust section: "Members of the valley: 1,240 across 38 batches." This is a strong conversion signal for a gated community. It needs read-only counts, no new model:

- `User` count (members), derivable today.
- Distinct batch/year count, derivable from existing year fields on `User`.
- These are fetched in the server `page.tsx` via a cached Prisma `count()` (wrapped so the public page never exposes member identities, only aggregate numbers). Cache for ~1 hour (`unstable_cache` / route segment `revalidate = 3600`) so it does not hit the DB on every anonymous visit. If the schema does not already expose a verified flag, gate the count to verified members only once that exists.

If counts feel risky to expose or the DB call adds latency, fall back to a static, periodically-updated number. Decision: ship with the cached live count if it adds < 50ms; otherwise static.

### 7.2 Invite-request capture (coordinate, do not own)

The "Request an invite" button points to `/signup`, which already runs the trivia gate. No landing-specific model is needed. If product later wants a lightweight "leave your email, we'll vouch" capture distinct from full signup, that is a new `InviteRequest` model (`email`, `connection`, `vouchedBy`, `status`, `createdAt`), owned by the auth/onboarding workstream, not by the landing page. Flagged here only so the landing CTA copy ("Request an invite") stays consistent with whatever that flow becomes.

No schema migration is required for the landing page MVP.

---

## 8. The peaks logo on the landing page

The real logo will be a traced outline of the three peaks (Bodikonda, Middle Peak, Rishikonda) as a standalone white/green mark; for now a leaf placeholder is used (`LeafMark` in v2, `Bird` mark in `_shared.tsx`). The logo lab (`preview/logos/page.tsx`) already includes a "Valley + hills" ridgeline candidate (line 74-84) that is the closest existing asset to the intended three-peaks mark.

Decisions for the landing page:

- Build a single `PeaksMark` SVG component (`landing/peaks-mark.tsx`) with a `tone` prop (`"white"` for on-photo use in the fold, `"green"` for the nav/footer on the warm background) and a `size` prop. Base it on the ridgeline path from the logo lab, refined to three distinct peaks. This component is shared: the app sidebar and auth pages should adopt the same `PeaksMark` so brand is consistent everywhere. It supersedes the leaf placeholder once approved.
- In the fold: white peaks mark + small "Rishi Valley / Alumni" wordmark, top-left, ~70% opacity, with the same uppercase tracked "Alumni" sublabel used in v2 (`letter-spacing:.2em; text-transform:uppercase`).
- In the sticky nav and footer: green peaks mark on the warm surface.
- Until the final traced mark is delivered, the placeholder ridgeline ships; swapping it is a one-file change because every surface imports `PeaksMark`.

---

## 9. Light-mode decision

The owner says dark mode "loses character" and is likely parked for MVP. Decision: the landing page is light-mode only and does not honor `next-themes`. It renders on the warm-ecru/paper palette regardless of system or app theme. Rationale: it is the brand's first impression and must always look like the valley at midday; a dark landing page would undercut the calm, literary identity. The hero photo and warm surfaces are intrinsically light. Implementation: scope the landing root so it never picks up the `.dark` class (do not apply `dark:` variants, and if `next-themes` would inject `.dark` on `<html>`, the landing sections use explicit light tokens, not the theme-reactive `--background` swap). This is consistent with `globals.css` where `.dark` only takes effect under `.dark` ancestors (`@custom-variant dark (&:is(.dark *))`).

---

## 10. Edge cases and resilience

- Reduced motion (covered in 5.4): full static fallback, page complete with no motion.
- Slow network: hero blur placeholder, lazy screenshots, server-rendered copy means the value proposition is readable before any image or JS arrives.
- JS disabled: the page is server-rendered, so the hero, all section copy, screenshots, and the footer CTA render and the Sign in / Request invite links work. Only the reveal animations, parallax, sticky nav, and birds are inert (they degrade to "always visible"). The reveal wrapper must therefore default to visible (animate *from* a visible state, or render content visible and let motion take over on hydration) so a no-JS or pre-hydration user never sees `opacity: 0` content. This is critical: do not gate visibility on JS.
- Very wide screens (>1600px): cap content width (`max-width` ~1180px as in v2's `.v2-inner`) and center; the hero photo still bleeds full-width.
- Mobile (390x844, hard rule): hero buttons stack or wrap (already `flex-wrap`); sections collapse to single column (text then image); screenshot frames scroll-clip inside their own `overflow-x: auto` if a shot is intrinsically wide, so the page body never scrolls horizontally (Artifact/responsive rule applies equally here). Sticky nav collapses to peaks mark + single "Join" pill. Verify both 1440x900 and 390x844 per the screenshot protocol (minimum 2 rounds each, desktop then mobile).
- Text overflow / i18n: copy is English-only for MVP, but headlines use `text-wrap: balance` and bodies cap at ~60ch so long lines never run edge to edge.
- Empty/seed data in screenshots: screenshots are staged with the fictional v2 sample data, so there is never an "empty state" shown to prospects.
- The known Vercel admin-login bug is irrelevant here (landing is unauthenticated), but note the move to Render: nothing on the landing page depends on the deploy target except absolute asset paths, which are all relative to `public/`, so the move is transparent.

---

## 11. Build order (for the implementing agent)

1. Promote the v2 accent tokens (blue `#3F7CA6`, cinnamon `#C26B39`, heart `#DD5043`) to page-scoped vars on the landing root (or to `:root` if the token workstream has landed).
2. Build `PeaksMark` and swap it into the hero.
3. Split `landing-client.tsx` into `hero.tsx` + the new section components; convert `page.tsx` to a server component composing them.
4. Build `SectionReveal` (the motion primitive) with the reduced-motion + no-JS-visible defaults.
5. Stage the showcase route / seed data; capture and Sharp-process the five screenshots into `public/images/landing/`.
6. Build `FeatureSection` + `ShowcaseShot`, drop in the five sections with final copy (run copy through the no-em-dash check).
7. Add the sticky `LandingNav`, the trust section, and the footer CTA.
8. Add the three bird/leaf easter eggs, each gated behind in-view + reduced-motion.
9. Screenshot desktop (1440x900) and mobile (390x844), 2 rounds each, against LiftKit spacing. Run `impeccable-audit` / `impeccable-optimize` for the performance and a11y P0s before merge. No AI attribution in the commit (hard rule).

---

## 12. Summary of concrete decisions

- Keep the calm hero; make the page scroll into a 7-part showcase that leads with the directory.
- Use real, Sharp-optimized WebP screenshots framed as the product, not live embeds, for speed and privacy.
- One reusable `SectionReveal` motion primitive (transform/opacity, spring, `once:true`), scroll-linked parallax on screenshots, three small bird/leaf easter eggs, all reduced-motion-safe and no-JS-safe.
- Sticky glass nav appears past the fold so the CTA is always reachable.
- Server-render static content; client islands only where motion lives; LCP < 2s, CLS 0 targets.
- No Prisma migration required; optional cached aggregate member counts for social proof.
- Light-mode only. Reuse brand tokens, LiftKit spacing, the `.glass` utility, the bird/leaf glyph vocabulary, and the shared `PeaksMark` logo. No em dashes in any copy. "Request an invite" / "Sign in" as the two CTAs.

Relevant files grounded in this spec (all absolute):
- `/Users/sanan/Documents/rv-alumni/src/app/page.tsx` (route entry, to become server component)
- `/Users/sanan/Documents/rv-alumni/src/components/landing-client.tsx` (current hero, to split)
- `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx` (locked v2 system: tokens, BirdGlyph, Hoopoe, LeafMark, ruled-sheet feed)
- `/Users/sanan/Documents/rv-alumni/src/app/preview/_shared.tsx` (shared preview tokens/components, eyebrow + card + sidebar treatments to echo)
- `/Users/sanan/Documents/rv-alumni/src/app/preview/logos/page.tsx` (peaks "Valley + hills" ridgeline candidate, basis for `PeaksMark`)
- `/Users/sanan/Documents/rv-alumni/src/app/globals.css` (brand tokens, LiftKit spacing, `.glass`)
- `/Users/sanan/Documents/rv-alumni/src/app/(auth)/login/page.tsx` (CTA copy + destinations to stay consistent with)
- `/Users/sanan/Documents/rv-alumni/public/images/landing.jpeg` (hero photo, already optimized)

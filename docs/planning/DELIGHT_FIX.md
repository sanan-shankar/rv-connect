# Delight Fix Campaign — bringing the app up to /preview/delight fidelity

The owner approved the `/preview/delight` lab as the source of truth. A prior session integrated it
into the app badly (got structure ~80% right, choreography details wrong, broke some things). This
campaign ports the proven preview implementations faithfully and fixes every owner complaint.

Source of truth: `src/app/preview/delight/{_kit,_birds,_leaves,composer/page,feedback/page,transitions/page,landing/page,eggs/page}.tsx`.
Full per-surface diagnosis: workflow `wy6rhatn1` output (cross-checked against first-hand reads).

## Rules
- Port from the preview; do not reinvent. Light mode only. Motion runs always (no OS reduced-motion gate).
- Animate transform/opacity only (+ background/border color at 120ms). Heart is `#E03A33` on frame one.
- One spring set lives in `src/components/common/motion.tsx` (SPRINGS gentle/snappy/settle, EASE_POP, EASE_SPRING).
  Do NOT migrate to `src/lib/motion.ts` (rejected: needless churn, collides with the bird session).

## Deferred (do NOT touch this campaign)
- Hoopoe mascot integration + `src/components/mascot/*`, `hoopoe.tsx`, `hoopoe-kit.ts` (separate live session).
- `bird-avatar*.tsx`, `avatar.ts`, `centroid.mjs` (live bird session, 1100+ uncommitted lines).
- **Avatar beak-chirp refinement + species hover tooltip** (live in `bird-avatar.tsx` -> defer, flag to owner).
- Loading skeletons / states (owner wants another idea round first).

## Foundation
- [x] `common/motion.tsx`: add `NAV_MARKER_SPRING` (spring 480/38/0.9) for the sidebar marker.

## OWNER-CRAFTED (done by main thread, hand-tuned + screenshot-verified)

### Post cluster (`create-post-form.tsx`, `comments-section.tsx`, `post-card.tsx`)
- [ ] **Composer open/close**: root cause = `<AnimatePresence mode="wait">` (create-post-form.tsx:291) -> pill
  fully fades out before panel grows, and reverse on close = the "disappear then expand / everything jumps".
  Fix: stable card with avatar pinned; animate the body via `layout` (SPRINGS.gentle); no mode="wait". Smooth
  open AND animated collapse, no layout jump.
- [ ] **Composer polish**: group the B/I/U/S bar into one bordered toolbar (not stranded); keep add-a-tag, `+`
  overflow (poll/letter), pill Post, outside-click retract (already present).
- [ ] **Comments close**: post-card.tsx:410 renders `{showComments && <CommentsSection/>}` with no AnimatePresence
  -> snap close. Wrap in AnimatePresence + add `exit={{height:0,opacity:0}}` to the section root.
- [ ] **Comments focus ring**: comments-section.tsx:124 `overflow:hidden` clips the input ring (top + partial
  sides only = "weird green shape"). Fix: clean inset ring + set overflow visible once open settles.
- [ ] **Comments spurts**: drop `animate={loading?'hidden':'show'}`; placeholder cross-fades, list renders final
  layout from frame 1.
- [ ] **Heart**: port preview flecks exactly (0.9s, opacity [0,.95,.95,0], scale [0.5,1,1,0.9], times [0,.18,.7,1],
  ~7px, rotate +-40); remove competing `active:scale-95`; keep snap-red.
- [ ] **Bookmark**: replace phosphor icon anim with preview custom RIBBON svg (path M5 4 H35 V52 L20 42 L5 52 Z),
  even cinnamon stroke, scaleY pop [1,.9,1.04,1], clipPath fill sweep, overflow visible (fixes uneven notch + crop).
- [ ] **Share**: drop SPRINGS.snappy on the check (overshoot = "forced wiggle"); clean crossfade (ease, no bounce).
- [ ] **Press feedback**: wrap heart/comment/bookmark/share with SpringPress (hover 1.02 / tap 0.93); drop active:scale-95.
- [ ] **Header alignment**: optically center the name+batch+time block against the bird's visual mass (screenshot-tune).

### Landing (`valley-leaves.tsx`, `valley-section.tsx`, `valley-birds.tsx`, `landing-birds.tsx`, `feature-section.tsx`, `app/page.tsx`, `showcase-shot.tsx`, `landing-hero.tsx`, `landing-nav.tsx`)
- [ ] **Leaves rectangle artifact**: valley-leaves `shadeHalf` uses `ctx.clip()+fillRect` -> visible rectangle.
  Fill the half-leaf path directly instead.
- [ ] **Leaves confined to a box**: `.vl-living max-width:72rem` constrains the canvas. Move max-width to the inner
  content; canvas spans full landing width; leaves drift the whole bottom band.
- [ ] **Leaf variety/colors**: add neem + gulmohar species; ensure a clear yellow; more leaf-like (veins/shade).
- [ ] **Cursor parts leaves**: already ported; works once full-width.
- [ ] **Birds**: remove the lame black `HoppingBird` (zooms like Star Wars); integrate the articulated `ValleyBird`
  (varied species, individually-moving legs, hop-along + arc-jump between the showcase shots) ACROSS the landing,
  not confined to one box. Fix barbet color (#2E9E59 -> #3F8F58). Leave a clean seam for the hoopoe (deferred).
- [ ] **Hero load**: image + content appear together intentionally (image already `priority`; verify entrance).

### Login slide-over (`login/page.tsx`, `landing-hero.tsx`, `landing-nav.tsx`)
- [ ] **NaN errors**: login slide uses `x:48` (px) across a route boundary -> NaN. Use percentage `x:'62%'` +
  `initial={false}`.
- [ ] **Lateral pass**: on landing Sign-in, animate hero content sliding left + fade, then navigate (~250ms);
  login slides in from the right; shared bg + logo stay put (both pages render them identically).

## MECHANICAL (workflow `delight-impl`, file-isolated, code-verified; main thread screenshot-verifies after)

- [ ] **Sidebar marker** (`sidebar.tsx`): re-tune the cinnamon left-edge bar (left ~-8px, ~3px wide, slight radius),
  use NAV_MARKER_SPRING, fix the FLAKY first-paint (layoutId/initial), verify brand lockup not truncating.
- [ ] **Search pill** (`search-pill.tsx`): subtle bounce open + subtle bounce-back close, NO stretch (kill the
  under-damped/over-stretch); center the magnifier icon (leading-none / grid).
- [ ] **Notification** (`notification-bell.tsx`, `dropdown-menu.tsx`): bell shake duration 0.7 + ease [.36,.07,.2,1]
  (currently 0.6 easeInOut); panel scale+fade-in from the bell corner (enhance base-ui CSS, transform-origin top-right);
  verify bell icon centered, shake only on unread increment.
- [ ] **Dialogs** (`ui/dialog.tsx`): report/flag/edit/etc. snap in. Animate backdrop opacity + backdrop-filter blur
  0->8px AND content scale 0.96->1 + rise + fade over ~280ms via base-ui data-starting/ending-style CSS (NOT a
  motion.div wrap, which breaks base-ui mount/exit). Improves all dialogs.
- [ ] **RSVP** (`feed/rsvp-button.tsx`): resting "RSVP" has a left gap + off-center label (check always rendered).
  Hide check at rest, center label, keep the ->Going morph.
- [ ] **Poll** (`poll-display.tsx`): bar grow spring 150/20 (not SPRINGS.gentle); count-up already works; choice check.
- [ ] **Fundraiser** (`support/cost-bar.tsx`): add count-up figure paired with the bar fill on scroll-into-view.
- [ ] **Route transitions** (`(main)/template.tsx`): keep content fade+rise; drop `scale` (owner wants fade+rise only).
- [ ] **Seg thumb** (`signup-form.tsx`): account-type toggle has zero motion -> add a sliding layoutId thumb
  (profile-tabs + directory toggle already slide; leave them).
- [ ] **Toasts** (`ui/sonner.tsx`): warm card bg (#F6F2E8), layered shadow, green dot (not red), leaf success icon.
- [ ] **Letters draw** (`letters/[id]/page.tsx` + new client wrapper): draw an underline under the REAL letter title
  on open (port the preview draw; keep feather + cinnamon). NO "dear friend" placeholder copy.
- [ ] **Konami** (new `layout/konami-eggs.tsx` mounted in `app-shell.tsx`): up up down down left right left right b a
  -> birds fly across once. Client child component (do not convert app-shell to client; preserve its uncommitted edits).
- [ ] **Logo hover fact** (`logo-fact.tsx`): VERIFY only (works), do not break.

## Verify gate (per surface)
tsc clean (one run at the end) + screenshot the touched surface at 1440 (and 390 where mobile matters) + one
interaction check. Read the PNG; do not assume. Commit in organized batches, plain messages, no AI attribution.

<!--
  Before opening this PR, read docs/spec/DESIGN-SYSTEM.md (section "How to use this doc").
  This checklist is the after-work check it points to. Fill in both sections honestly;
  "n/a" is fine for anything that doesn't apply to this change.
-->

## What changed

<!-- One or two sentences: what this PR does and why. -->

## Before work

- [ ] Read `docs/spec/DESIGN-SYSTEM.md` and the relevant `docs/spec/*` for this area.
- [ ] Checked `docs/planning/bugs.md` / `docs/ROADMAP.md` for existing decisions that
      cover this change before designing something new.

## After work — design system checklist

- [ ] **Pill CTAs.** Buttons, chips, and tags use the shared `Button` primitive's default
      full-pill radius (`rounded-full`), not a one-off radius.
- [ ] **Only `transform`/`opacity` animated.** No `transition-all`, no animating `width`,
      `height`, `top`, `left`, colors, etc.
- [ ] **No hand-typed easing.** Curves come from `EASE_POP` / `EASE_SPRING` / `SPRINGS` in
      `src/components/common/motion.tsx`, never an inline `cubic-bezier(...)`.
- [ ] **Shared primitives reused, not rebuilt:** `Button`, `BirdAvatar` (never `BirdGlyphV2`
      directly), `LoveButton`, `FeedColumn`, and `src/components/common/motion.tsx` helpers
      (`SpringPress`, `FadeRise`, `useMotionGovernor`).
- [ ] **Warm loading state.** Any new async route ships a `loading.tsx` using the warm
      shimmer, not the grey pulse.
- [ ] **Screenshots reviewed.** Desktop (1440x900) and mobile (390x844) screenshots taken
      and checked against `docs/spec/DESIGN-SYSTEM.md` / `/preview/v2`.
- [ ] **No em dashes** anywhere in copy touched by this PR (see
      `docs/content/AI-WRITING-TELLS.md`).
- [ ] **Naming is "Rishi Valley"** in every user-facing string (never "RV Alumni" or
      "Alumni" — that's internal shorthand only).

## Verification

- [ ] `npx tsc --noEmit` passes (or only shows pre-existing, unrelated errors).
- [ ] `npx eslint src --max-warnings=99999` reviewed; no new design-system warnings left
      unaddressed (or a reason is noted below for why one was kept).

<!-- Notes on anything skipped above, and why: -->

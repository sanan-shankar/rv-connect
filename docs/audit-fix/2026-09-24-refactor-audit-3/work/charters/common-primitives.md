# Charter: common-primitives (T08)
Report: `work/agents/common-primitives.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/common/**` (57 files, ~10,019 lines) **except** the media primitives whose names
  contain `image`, `photo`, `viewer` or `carousel` (T04) and `bird-avatar-v2.tsx` (1,621 lines, T10).
  Include `motion.tsx`, `float-field.tsx`, `float-area`, the filters, the bottom sheet, the
  confirm dialog, `Button`, `LoveButton`, `ContentColumn`, `FeedColumn`, the toast wiring, and
  everything else.
- For every primitive: count its callers (`grep -rl` across `src/`, lab included) and list
  callers-per-prop for its optional props.

## Specs and context
`docs/spec/DESIGN-SYSTEM.md` (the primitives section), `.claude/skills/liftkit-spacing/SKILL.md`.
Commits: `d422de66` (one bottom sheet with a shared title, round X and swipe to close, 2026-09-15),
`f9bca40f` (the toast's action button), `334d7907` (back closes a photo, dialog, sheet or drawer),
`9c018561` (the header search pill — T09 owns the header; you own any primitive it uses).

## Leads from the orchestrator
- The shared bottom sheet (09-15): are the sheets it replaced deleted, or still exported?
- At audit 2, `filters/active-filter-chips.tsx` and `filters/result-count.tsx` were unused files;
  knip no longer lists them — deleted, or now imported? Say which.
- Audit 2's `E11` UI-kit tail is PARTIAL: which primitives were adopted and which surfaces still
  hand-roll them (`fix-prompt.md` ledger).
- Props no caller passes (re-grep the lab first — audit 2's `GetInTouch` lesson).
- Primitives with exactly one caller: is each a primitive or a relocated component?

## Questions
1. Client boundaries: which primitives are `"use client"` for a leaf's sake.
2. `motion.tsx`: LazyMotion strays, `m.` vs `motion.`, animation helpers used once.
3. The six signatures per file; over-abstraction (options objects, variant registries with one
   variant in use).

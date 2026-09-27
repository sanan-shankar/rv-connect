# Charter: landing-mascot-avatars (T10)
Report: `work/agents/landing-mascot-avatars.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/landing/**` (13 files, ~2,956 — five of them knip-unused: the showcase family the
  owner chose to KEEP at audit 2's Q1; report their state, do not re-propose deletion)
- `src/components/mascot/**` (27 files, ~5,775; `hoopoe.tsx` 1,253; `moments/` is new),
  `src/components/common/bird-avatar-v2.tsx` (1,621 lines: the 50 glyphs)
- `src/app/page.tsx`, `src/app/hoopoe/**`, `src/app/(main)/birds/**`, the bird half of
  `src/app/(main)/pick-bird/**` (T05 owns the flow)
- `src/lib/`: `avatar.ts`, `avatar-swap.ts`, `hoopoe-geometry.ts` (375), `app-icon-safe-zone*`
- `public/images/birds/**` (852 KB), `public/images/icons/**`, `public/images/brand/**`,
  `public/images/landing.jpeg` (488 KB), `src/app/icon.svg`, `apple-icon.png`
- Read, do not run: `scripts/dev/build-app-icon.mjs`, `generate-icons.mjs`, `generate-bird-photos.mjs`

## Specs and context
`docs/spec/avatars.md` (40 KB), `docs/spec/mascot.md` (23 KB), DESIGN-SYSTEM's landing section.
Commits: `07ad0bdf` (the hoopoe answers a tap, keeps living, and celebrates the photographs),
`eb55658c`/`86447f73` (three clicks on the logo raise the app icon's hoopoe), `3c6c1e02` (the
Android icon is the peek again), `9600932d` (the lockup), `40791570`. Memory notes worth knowing:
the mascot's transform-box gotcha and the "template-transform containing-block" gotcha are real
constraints, not bloat.

## Leads from the orchestrator
- The birds-as-sprite owner decision from audits 1 and 2 (−44 KB on 39 routes): state?
- `bird-avatar-v2.tsx`: 1,621 lines of inline SVG in a client component — what does every route
  that shows an avatar pay for it (L03 measures; you say what is imported where and whether the
  glyph set could be split per bird).
- `moments/` (3 files, 2026-09-17): a subsystem for celebrations — how much is reachable?
- Audit 2's `E11` mascot tail is PARTIAL: what is left?
- The hoopoe's idle/flight/arrival controllers (`use-flight-arrival.ts` ratio 1.22,
  `mascot-flight-layer.tsx` 1.10): one state machine or several overlapping ones?

## Questions
1. What the signed-out landing page ships in JS for the mascot and the birds.
2. Dead branches in the mascot after the 09-17 series (`git log -S` for removed props).
3. The six signatures per file.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- `src/components/landing/shots.ts` names five image files deleted on 2026-09-07 while `showcase.tsx`
  and `_variant-*` still read the table: either the table goes with the images, or the images come back
  (`work/agents/tracked-weight.md`, carry-overs section).
- `public/images/landing.jpeg` is 1680 px wide under `sizes="100vw"`, so a 2× 1440 laptop gets it
  upscaled 1.7×; the 6.2 MB master is on disk (gitignored) to re-export a 2880-wide q75 copy (~400 KB).

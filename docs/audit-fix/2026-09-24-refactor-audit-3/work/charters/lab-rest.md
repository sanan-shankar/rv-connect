# Charter: lab-rest (T16)
Report: `work/agents/lab-rest.md`. See `_header.md`.

**Classification depth, not line-by-line.** Same rules as T15: the lab is history; you classify,
measure, and put archive candidates to the owner as questions.

## Territory
- `src/app/lab/**` **except** `catchups/` — ~50,750 lines: the shared kit (`_kit.tsx`,
  `_second-look-kit.tsx`, `_shared.tsx`, `_lab-client.tsx`, `_birds.tsx`, `_hoopoe.tsx`,
  `_leaves.tsx`, `_registry.ts`, `layout.tsx`, `lab.css`, `[dir]/`, `loading.tsx`, `page.lab.tsx`)
  and ~45 room folders (birds-bg, birds-rv, centroid, chain-lines, collection{,/scrub,/swap},
  comments, composer, craft, crop, directory, eggs, everything, feed-canvas, feedback, focus,
  glass-edges, groups-rethink, hoopoe, hoopoe-lives, hoopoe-marks, icon-colours, icon-directions,
  landing, landings, loading, loading-ideas, location-picker, logo, logos, mascot-moments,
  new-post, profiles, reach, spine, spine-marker, support, support-ideas, tiles (`_specimens.tsx`
  1,054), transitions, type, v2, valley (+ `public/lab/valley/**` 2.01 MB tracked, +
  `scripts/dev/valley-terrain.mjs`), viewer, years (wall/then/weave + `scripts/dev/wall-atlas.mjs`,
  `public/lab/wall/` gitignored))
- `docs/spec/lab-voice.md`, `docs/planning/valley/handover.md`, `docs/planning/other/**`.

## For the kit and each room
1. Classify: kit / active exploration / verdict shipped (name the commit) / superseded / reference.
   With `git log -1 --format=%ad` per folder.
2. Imports: does any shipped file import from `src/app/lab/**`? (`grep -rn "app/lab\|/lab/" src
   --include=*.ts --include=*.tsx` minus the lab itself.) Must be zero; anything else is a finding.
3. Rooms that duplicate a shipped primitive they were the prototype of — register, do not propose
   deletion (audit 2 counted 29 lab↔shipped clone pairs; `raw/jscpd.txt` has this run's).
4. `public/lab/valley/` is tracked and deploys with every production build (2.01 MB) while
   `public/lab/wall/` is gitignored. One rule for both? (relocate/gitignore finding.)
5. `lab.css` and the kit's `BASE_CSS`/`PAGE_CSS` exports: what of the lab's styling reaches the
   shared stylesheet (L03 measures the bytes; you say which files carry global rules).
6. knip: ~150 unused exports in lab files — one table, classified (room API / dead / harmless).
7. `tsc`: `wall/_shapes.tsx:255` unused `g`; the one `@ts-expect-error`; 26 `as object` casts.
8. `[dir]/` — a dynamic room: what does it do, and does it exist in the registry?

## Owner decisions
The archive-candidate list with dates, as questions, default keep.

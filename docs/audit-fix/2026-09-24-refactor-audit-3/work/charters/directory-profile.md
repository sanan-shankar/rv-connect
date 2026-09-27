# Charter: directory-profile (T05)
Report: `work/agents/directory-profile.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/directory/**` (4 files, ~2,196; `directory-grid.tsx` ratio 1.27),
  `src/components/profile/**` (15 files, ~5,651; `letterhead-profile.tsx` 1,294 lines)
- `src/app/(main)/directory/**` (`where.ts`, `actions.ts`, page, loading),
  `src/app/(main)/profile/**`, `src/app/(main)/pick-bird/**` (share with T10: you own the flow,
  T10 owns the bird art), `src/app/(main)/birds/**` (T10 owns; skim)
- `src/lib/`: `city-coords.ts`, `city-scope.ts`, `place-input.ts`, `geocode.ts`, `map-cluster.ts`
  (288), `houses.ts`, `house-spans.ts`, `contact-rows.ts`, `profession-tags.ts` (ratio 1.85),
  `phone.ts`, `search-log.ts`, `directory-rule*` (test = spec)
- `src/app/api/places/search`, `api/users/search`, `api/users-by-batch` (T12 owns gate shape)
- `public/geo/**` (108 KB)

## Specs and context
`docs/spec/directory.md`, `docs/spec/profile.md`, `docs/spec/person-row-audit.md`,
`docs/spec/avatars.md` (skim). Commits: `16758d27`/`93d4ed1c` (Get in touch becomes the calling
card), `bcec4cdc`/`ff67fb46` (the .vcf), `2c6c33fb` (the grid re-forms as one wave), `efb95a3e`,
`762da94b`, `467cb72e`, `40791570` (a member's photograph never falls back to their bird).

## Leads from the orchestrator
- `raw/db-statements-live.json`: two `Post` COUNTs per profile view (17,445 and 17,444 calls);
  `UserPlace` SELECT 32,721 calls and a second shape 21,786 calls; `COUNT(city) … LEFT JOIN User`
  5,410 calls returning 44 rows each; the country GROUP BY at 4.5 ms × 424. Which component per
  statement, and is any of it per-row (N+1) on the directory grid?
- Audit 2 phase B: the d3 map stack on demand and profession hints — landed? (`fix-prompt.md` board).
- The calling card replaced "Get in touch" on 09-09: is the old sheet gone? `GetInTouch` had seven
  callers, five in lab rooms — grep the lab before calling anything unreferenced.
- `letterhead-profile.tsx` at 1,294 lines: sections, states, how many would split cleanly.
- The profession tags pass (`docs/spec/hand-run-passes.md`) and `profession-tags.ts`: the
  vocabulary file vs the filter — one source of truth?

## Questions
1. Client boundaries; dynamic imports for the map, the calling card, the vcf.
2. Duplication between the directory's person row and the profile's header.
3. The six signatures per file.

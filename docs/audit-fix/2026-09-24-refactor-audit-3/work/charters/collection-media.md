# Charter: collection-media (T04)
Report: `work/agents/collection-media.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/collection/**` (14 files, ~6,776; `collection-client.tsx` 863 code / 836 comment,
  `photo-river.tsx`, `contribute-stage.tsx` …)
- `src/app/(main)/collection/**` (`actions.ts`, `collection-data.ts`, `[id]`, loading)
- `src/lib/`: `collection.ts` (608), `collection-photo.ts`, `collection-intake.ts`,
  `collection-image.ts`, `collection-shape.ts`, `collection-viewer-image.ts`, `collection-date*`,
  `photo-layout.ts` (731 lines; **160 code / 531 comment, ratio 3.32, the most comment-dense
  file in the repo**), `photo-visibility-rule.ts`, `photo-wall.ts`, `photo-save-name.ts`,
  `photo-suggest.ts` (272, an orphan), `river-geometry.ts` (243), `river-cursor.ts`,
  `taken-date.ts`, `exif-date.ts`, `file-taken-date.ts`, `caption-tidy.ts`, `upload-shared.ts`
  (ratio 2.03), `upload-client.ts`, `image.ts`, `image-cdn.ts`, `image-downscale.ts`,
  `image-record.ts`, `image-purge.ts`, `image-purge-rule*`, `storage.ts` (392)
- The media primitives in `src/components/common/` whose names contain `image`, `photo`, `viewer`
  or `carousel` (T08 skips them; you own them).
- `src/app/api/upload/**` and `src/app/api/photo/download/route.ts` (T12 owns their gate shape;
  you own the pipeline logic).
- Read, do not run: `scripts/dev/import-album.mjs`, `backfill-screen-copies.mjs`,
  `backfill-image-dimensions.mjs`, `sweep-stranded-originals.mjs`, `tag-photos-*.mjs`.

## Specs and context
`docs/spec/media.md` (2026-09-23), `docs/planning/collection-rework/handover.md`,
`docs/planning/class-collection/spec.md`, `docs/spec/hand-run-passes.md`. Commits: `91c735cb`
(screen copies, 2026-09-23 — three stored objects per photograph now), `d920f631` (the river knows
its own height before it loads), `8f85b30e` (the river stops fetching itself), `02362260`
(the phone's scrubber), `f63c3926`/`836e3b37`/`951df4fd` (the date box), `2c996b83` (upload
progress), `7885ce33` (set aside in review), `c331e7b0` (two reservation shortcuts tried and
reverted — do not re-propose them).

## Leads from the orchestrator
- **The one real import cycle in the repo**: `src/app/(main)/collection/actions.ts` ↔
  `src/lib/river-geometry.ts` (`raw/madge-circular.txt`). A lib importing a `"use server"` file.
  What does it import, and what is the clean cut?
- `raw/db-statements-live.json`: a `Photo` SELECT of `id,width,height,photoYear,era` returns
  **1,692 rows per call** (637 calls) — the river geometry fetching every photograph's dimensions
  per load; `COUNT(*) GROUP BY scope` at 8.6 ms × 1,732 calls; `COUNT … GROUP BY photoYear, era`
  2,305 calls. Which render issues which, and how many per page view?
- `raw/db-indexes-live.json`: `Photo_caption_trgm_idx` (147 KB) and `PhotoLove_photoId_idx` have
  **zero scans since 2026-05-22**. Is caption search wired to anything?
- `photo-suggest.ts` was an orphan at audit 2 and still is. State?
- Screen copies (09-23): three objects per photo across upload, import, backfill, purge, delete,
  account purge. Is the object-list logic in one place (`photoStoredUrls`)? Any path still
  deleting two of three?
- `public/images/collection/` is 3.6 MB tracked — what uses it (demo? seed? the lab)?
- `photo-layout.ts` ratio 3.32: is that 531 lines of reasoning (product) or restatement? Quote one
  of each.

## Questions
1. `"use client"` boundaries and `next/dynamic` for the viewer, crop, contribute stage.
2. Kit adoption: audit 2's `E11` collection tail is PARTIAL — what is left?
3. The six signatures; and the "argued-for constant" test: a constant with no comment is the
   exception here — list them.

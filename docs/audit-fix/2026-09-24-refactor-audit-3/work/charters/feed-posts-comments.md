# Charter: feed-posts-comments (T01)
Report: `work/agents/feed-posts-comments.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/posts/**` (16 files, ~5,730 lines) and `src/components/feed/**` (10 files, ~710)
- `src/app/(main)/feed/**` (page, loading, `actions.ts`), `src/app/(main)/notifications/**`,
  `src/app/(main)/image-aim.ts`
- `src/lib/`: `posts.ts`, `post-visibility.ts`, `post-visibility-rule.ts`, `post-notifications.ts`,
  `rich-text.ts`, `rich-text-editing.ts`, `link-preview.ts`, `link-preview-core.ts`,
  `comment-thread.ts`, `toggle-queue.ts`, `normalize.ts`, `feed-write-rule` (read its test as the spec)
- `src/components/posts/feed-comment-actions.ts` AND, for comparison only,
  `src/components/catchups/edition/entry-comment-actions.ts` (T02 owns it; you judge the pair)
- Related tests: read them as the behavioural spec; T14 audits them as tests.

## Specs and context
`docs/spec/DESIGN-SYSTEM.md`, `docs/spec/letters.md` (the 300-word post/letter line, 2026-09-17),
`docs/spec/media.md` (carousels, the viewer). Commits to read with `git show --stat`: `8582a30b`
("the comment section ships; the two looks become one"), `02423f69`, `bf05bc8b`, `57f424e6`,
`7873578e` (Read more folds by measured lines), `82aa15dc` (every tap counts while a save is in the
air), `1be31066` (New post is the member's own bird, and the composer pill is gone), `2c3a761b`
(drop the verified leaf), `5a332878`/`e58ed2ad` (link previews).

## Leads from the orchestrator (claims to confirm or refute, not conclusions)
- The comment section was unified on 2026-09-16 ("the two looks become one"): is the second look
  actually gone, or does its code still exist behind a prop nobody passes?
- Two comment action files exist (feed vs Catch-up entries) on one `Comment` table. Same shape?
  Drift? What would one module with a `target` cost?
- `raw/db-statements-live.json`: `Post` SELECT has at least three statement shapes (different
  `select` sets); `LinkPreview` has 7 rows; `Like` seq_scan 30,802 on 75 rows. Which code paths?
- The composer pill removal (09-14): any pill code left? Any `create-post-form` variants?
- `link-preview-core.ts` (518) + `link-preview.ts` (416): 934 lines for link cards. Earned?
- `toggle-queue.ts` (09-17) and the like celebration replay (`80da11f5`): is there still a
  LoveButton path and a separate heart path?

## Questions this territory must answer
1. Every `"use client"` file here: does it need the boundary, or only a leaf?
2. Which components are superseded by the shared primitives (`PostCard`, `FeedColumn`,
   `PhotoCarousel`, `ImageViewer`, `LoveButton`, the shared bottom sheet of 2026-09-15)?
3. The six LLM-bloat signatures, per file.
4. Anything a member never reaches (a prop no caller passes, a branch no state produces).

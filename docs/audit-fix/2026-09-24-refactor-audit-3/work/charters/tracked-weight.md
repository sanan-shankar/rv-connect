# Charter: tracked-weight (L08, cross-cutting lens)
Report: `work/agents/tracked-weight.md`. See `_header.md`.

**Grants beyond the common rules**: `du`, `git count-objects -vH`, `git rev-list --objects --all |
git cat-file --batch-check` (read-only history walks), `sips -g pixelWidth -g pixelHeight <file>`
and `file` on images. Never open `sanan's stuff/` or `scripts/dev/.*/`.

## The question
The repository is **44.90 MB tracked in 1,632 files** — it was 32.19 MB at audit 2 three weeks ago
and 29.89 MB when audit 1 closed. Attribute every megabyte, and the +12.7 MB in particular, and
say what should not be there, what should be smaller, and what should live elsewhere (R2 behind
`images.rishivalley.space` exists for exactly this; `public/lab/wall/` is already gitignored).

## Inputs
`raw/tracked-bytes.txt` (every tracked file, bytes, largest first), `raw/tracked-files.txt`,
`raw/files-added-since-audit2.txt`, audit 2's `root-assets.md` report and its `tracked-bytes-by-dir.txt`.
Top-level today: `e2e/__screenshots__` 12.02 MB (24 PNG), `public/images` 11.36 MB (142 files),
`docs/audit-fix` 4.16 MB (139), `src/app/lab` 3.44 MB (201), `src/components` 2.81, `src/lib` 2.19,
`public/lab` 2.01 MB (15), `docs/planning` 1.86, `docs/history` 1.16, `src/app` 0.96, `.claude`
0.69, `scripts` 0.58, root 0.52 (of which `package-lock.json` 0.41), `docs/spec` 0.36, `prisma` 0.30.

## What to produce
1. **`public/**` (18 MB on disk, ~13.4 MB tracked)**: for every file over 100 KB — referenced from
   where (`grep -rF "<basename>" src scripts docs .claude`), rendered how (raw `<img>`,
   `next/image`, CSS `url()`, OG image, favicon, PWA icon), intrinsic pixels vs the largest size
   it is displayed at, format, and whether it belongs on R2 or should be resized/re-encoded. The
   three Catch-up covers (`shaded-path.webp` 3.19 MB, `boulder-hill.webp` 1.76, `stone-benches.webp`
   1.53) first. `public/images/collection/` 3.6 MB: demo/seed images? `public/images/birds/`
   852 KB (50 birds). `public/lab/valley/` 2.01 MB tracked (height maps) vs `public/lab/wall/`
   gitignored — one rule. Anything nothing references (410 KB of never-referenced binaries at
   audit 2 — did they go?).
2. **`e2e/__screenshots__`** (12 MB): per PNG bytes and pixels; which routes in `visual.spec.ts`
   ROUTES; whether a route was removed from ROUTES but its PNG stayed; what a `deviceScaleFactor`
   or clip policy would save (T17 owns the policy; you own the bytes — agree).
3. **`docs/`** (7.5 MB): audit 2's `work/` (90 files) that the house rule sends to history when the
   campaign closes; `catchups-rework/handover.md` 0.33 MB; `findings-index.json` 0.45 MB;
   `docs/history` 1.16 MB; what is a record (keep) vs a working folder (archive).
4. **`src/app/lab`** 3.44 MB: the 12 JSON fixtures (T15 judges them; you weigh them).
5. **`.claude/`** 0.69 MB tracked: imported skill packs (T20 judges relevance; you weigh).
6. **The `.git` directory**: `du -sh .git`, `git count-objects -vH`; the 20 largest blobs in
   history and whether they are still tracked. History rewriting is an owner question at most —
   describe, do not recommend.
7. **`.gitignore` hygiene**: patterns with no subject; things that should be ignored and are not
   (`public/lab/valley`?); `.DS_Store` files present on disk (ignored — note only).
8. A table attributing the 44.9 MB and the +12.7 MB, and findings with tracked-KB savings.

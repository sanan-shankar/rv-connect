# Charter: dead-code (L01, cross-cutting lens)
Report: `work/agents/dead-code.md`. See `_header.md`.

**The rule**: semantic tools decide what is dead; you decide whether it is safe to delete. Grep
alone never declares death — grep confirms a tool's hit. Every hit gets a verdict.

## Inputs (all on disk under `raw/`)
- `knip-repo-plus-lab.txt`: 7 unused files, 187 unused exports, 30 unused types, `@prisma/client`
  (false positive), `server-only` ×3 (false positive), 3 poppler binaries.
- `madge-orphans-filtered.txt` (5), `tsc-unused.txt` (2), `depcruise.txt`, `env-flags.txt`
  (46 `process.env` keys with counts), `commented-out-code.txt` (14), `console-log.txt` (8),
  `todos.txt` (3), `type-sludge.txt`, `routes.txt`, `db-columns-live.json`, `db-tables-live.json`,
  `db-indexes-live.json`, `files-deleted-since-audit2.txt` (119).

## What to produce
1. **Every knip line, dispositioned** in a table: id, symbol, file:line, verdict (dead / lab room
   API — harmless / in-progress (added <14 days, say the commit) / framework-reachable / kept-why),
   and for "dead" the `git log -S` evidence and the deletion steps. Group the ~150 lab exports into
   one class finding with the table; give every non-lab line its own finding.
2. **The 7 unused files**: five are the landing showcase family (owner keeps; state only), two are
   Catch-ups (`answer-redirect.tsx`, `picture-picker-dialog.tsx`) — dead or in flight?
3. **Env keys**: for each of the 46, where it is read, whether `docs/OPERATIONS.md`/`README.md`/
   `vercel.json`/`.github` document it, and whether any key is read in code but exists nowhere in
   the docs (or documented but read nowhere). Always-true/always-false flags.
4. **Routes nothing links to**: for every `page.tsx` in `routes.txt`, find at least one `href`/
   `redirect`/`Link` to it outside itself (lab and tests count as "reachable but only from there").
5. **Unreachable code**: after `return`/`throw`, branches impossible by type, `if (false)`,
   `NODE_ENV` branches that cannot run in a Vercel build, `catch` blocks that swallow into a
   fallback nothing renders.
6. **Deleted-file ghosts**: for each of the 119 files deleted since audit 2, any remaining
   reference by basename in `src/`, `scripts/`, `e2e/`, `docs/`, `.claude/`, `CLAUDE.md`.
7. **Props no caller passes** (re-grep the lab), **components exported but unused**, **CSS tokens**
   in `globals.css` with no consumer, **`loading.tsx` whose page is not async**, **columns nothing
   reads** (co-owned with L06/T18 — you do the grep, they do the schema).
8. The 14 commented-out candidates and 8 console sites: prose or code, one line each.

## Standards
Never mark dead anything reachable by framework convention (brief-common §5c). Say the safety
verification for each deletion (`npm run check` catches TypeScript-visible deaths; `npm run
verify:crawl` catches route deaths; a named test).

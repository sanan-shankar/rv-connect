# Charter: root-instructions-tooling (T20)
Report: `work/agents/root-instructions-tooling.md`. See `_header.md`.

The owner's verbatim ask (brief-common §1) is the spec for this territory: "Critically analyse
each thing that's there — whether it has to be there, whether it can be somewhere else — and make
the root directory just a bit cleaner." Audit 2 found all fifteen tracked root files root-pinned.
Do it again, from scratch, and name the tool convention that pins each one (verify — e.g. does
`components.json` have to be at the root for the shadcn CLI, and is that CLI even used now that
`shadcn` was removed from the dependencies?).

## Territory (read every file in full)
- **The repo root**: the 15 tracked entries (`.gitignore`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md`,
  `README.md`, `components.json`, `eslint.config.mjs`, `next.config.ts`, `package-lock.json`,
  `package.json`, `postcss.config.mjs`, `prisma.config.ts`, `progress.md`, `tsconfig.json`,
  `vercel.json`) and every untracked/ignored entry the owner sees in Finder (`.DS_Store`, `.env`,
  `.env.demo`, `.next/`, `node_modules/`, `next-env.d.ts`, `sanan's stuff/` — never open it — and
  the folders). For each: required at root by which tool (cite its docs or source), or movable
  (to where, with every reference that would change: `grep -rn` the name across the repo, CI,
  scripts, docs), or a judgment call for the owner.
- **`CLAUDE.md` (26.8 KB) and `AGENTS.md`**: audit 2's process note asked that a third audit give
  these a territory — the file every session reads first belonged to nobody. Check **every
  number, path, command and claim** against the tree: "~90 routes, 43 lab rooms", "in about 30
  seconds", the screenshot commands table, the gotchas (is each still true?), the skills table (do
  the skills exist at the paths named?), the MCP notes, the "verify at runtime" story, the
  hand-run passes rows. Report each stale line with its replacement. Also its *shape*: repeated
  rules, rules that contradict each other, rules a test now enforces (which could shrink to a
  pointer).
- **`README.md`**, **`.mcp.json`**, **`components.json`**.
- **`.claude/**`**: tracked `agents/` (8) and `skills/` (~40+ tracked files; 93 MD files / 15,195
  lines on disk incl. imported skill packs), and the untracked `hooks/`, `scripts/`, `shots/`
  (PNGs), `_disabled-gsd/`, `package.json`, `settings.local.json`, `workflows/`. Which imported
  skill packs are still invoked (CLAUDE.md's table, `scripts/qa/campaign.test.mjs`'s global-skill
  rule) — the audit-1 owner decision to move packs out of `.claude/` — state? Which tracked skill
  files reference paths that no longer exist?
- `progress.md`: the index (482 lines) — one line per session, no bodies (the test enforces).

## Questions
1. The root table: entry → pinned-by → verdict → exact reference updates if moved.
2. Every stale line in CLAUDE.md/AGENTS.md, with the correction.
3. `.claude/` weight and relevance: what is tracked that no session reads.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- CLAUDE.md's skills table still names four commands that do not resolve (audit 2 carry-over 06 —
  which four? verify at HEAD).
- `.claude/` is 0.69 MB tracked, 86 % imported skill packs, byte-identical to audit 2; plus two
  dead untracked piles (`_disabled-gsd/`, `shots/`, ~17 MB) on disk.
- CLAUDE.md is 354 lines / 26.8 KB and is context every session pays for: which rules are now
  enforced by a test and could shrink to a pointer?

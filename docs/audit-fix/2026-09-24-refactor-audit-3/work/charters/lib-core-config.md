# Charter: lib-core-config (T13)
Report: `work/agents/lib-core-config.md`. See `_header.md`.

## Territory (read every file in full)
- `src/lib/` files no other territory owns: `prisma.ts` (175), `utils.ts` (551 — shared with T09,
  you own its *exports*), `test-kit.mjs`, `test-fn-body.mjs`, `image-cdn.ts`? (T04), and any
  `src/lib/*.ts` not named in another charter — build the list by elimination and say what you found
  (the charters name their files; anything left is yours).
- The config surface: `next.config.ts` (26 KB — 138 code lines / 324 comment lines, the second
  most comment-dense file in the repo), `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`,
  `components.json`, `vercel.json`, `prisma.config.ts`, `package.json` (scripts, `overrides`,
  `puppeteer` config; L04 owns the dependency lists), `.mcp.json`, `.github/**` (4 workflows + 1
  JSON), `.gitignore`, `src/instrumentation.ts`, `src/instrumentation-client.ts`, `src/types/**`,
  the Sentry configuration wherever it lives.
- `src/lib/security-regressions.test.mjs` — read as the contract; T14 audits it as a test.

## Context
`docs/TRAPS.md`, `docs/OPERATIONS.md`, `docs/SECURITY.md`. TypeScript 7 (native) is in use.
Audit 2 refuted: tsconfig `exclude` of the lab or `src/generated`; a conditional Sentry hook.

## Leads from the orchestrator
- `next.config.ts`: what is in 26 KB — headers/CSP, images, `pageExtensions` (the lab-out-of-demo
  switch), `optimizePackageImports`, Sentry wrap, redirects? Which entries are still needed, and
  which comments describe config that no longer exists?
- `package.json` `overrides`: why each one, and is the reason still current (`npm ls` for each)?
- `scripts/qa/ci-parity.test.mjs` pins that `check.yml` runs only `npm run check` — confirm the
  workflows match.
- `src/lib/prisma.ts`: the self-rebuilding dev client (CLAUDE.md gotcha 8) — still needed as
  written? Connection settings for the transaction pooler.
- `.gitignore`: 100+ lines of commentary — every rule still has a subject?

## Questions
1. Every file in your list: the six signatures, dead exports, comments describing deleted things.
2. The config surface: every option, and whether the tree still contains what it configures.

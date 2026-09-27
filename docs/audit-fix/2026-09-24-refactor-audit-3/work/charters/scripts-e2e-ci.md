# Charter: scripts-e2e-ci (T17)
Report: `work/agents/scripts-e2e-ci.md`. See `_header.md`.

**Grants beyond the common rules**: you may run `node --test scripts/qa/*.test.mjs`; you may time
the individual gates once each, one at a time — `time npx tsc --noEmit`, `time npx eslint .`,
`time node scripts/qa/protocol-audit.mjs`, `time node scripts/qa/lab-audit.mjs`,
`time node scripts/qa/npm-audit-gate.mjs`, `time node scripts/qa/audit-status.mjs` — to explain
why `npm run check` went 24.8 s → 45.9 s. Do NOT run Playwright, `npm run visual`, `npm run
check`, the probes, or anything under `scripts/dev` or `scripts/ops` (they touch the database or R2).

## Territory (read every file in full)
- `scripts/**` (70 `.mjs` + 5 `.ts` + `README.md` ledger, ~8,600 lines): `qa/` (`check.mjs` 273,
  `audit-status.mjs` 712, `drive.mjs` 726, `protocol-audit.mjs`, `lab-audit.mjs`, `crawl.mjs`,
  `_shoot.mjs`, `_probe-kit.mjs`, `_dev-login.mjs`, `_dir-room-shots.mjs`, `theme-shots.mjs`,
  `screenshot*.mjs`, `verify-shot.mjs`, `hover-probe.mjs`, `hoopoe-*.mjs` ×3,
  `map-cluster-verify.mjs`, `phase3-10-probe.mjs` (8 security probes, ~2,400 lines),
  `phase4-prod-check.mjs`, `npm-audit-gate.mjs`, `local-base-url.mjs`, `knip.jsonc`, the five
  `*.test.mjs`), `dev/` (the hand-run family, imports, backfills, `apple-edge/` ×5,
  `valley-terrain`, `wall-atlas`, `print-magazine`, `run-sql`, `_env`, `_cli`, `centroid`,
  `shot-clip`, `shot-svg`, `email-mark`, `set-password`, `city-alias-scan.ts`, `merge-cities.ts`,
  `seed-curated-content.ts`, `import-roster`, `import-places`, `generate-*`, `build-app-icon`),
  `ops/` (`prune.mjs`, `snapshot.mjs`), `demo/` ×3. **Never open `scripts/dev/.*/`** — those
  gitignored folders hold real members' data.
- `e2e/**` (10 files, ~1,900 lines: `visual.spec.ts` 329, `collection-seek.spec.ts` 692,
  `collection-journeys` 323, `comments-close`, `deeplink`, `loading-fallbacks`, `sidebar`,
  `collection-permalink`, `auth.setup.ts`, `playwright.config.ts`), `e2e/__screenshots__/**`
  (24 PNGs, 12.02 MB; L08 owns the bytes, you own the policy: what is photographed, at what scale,
  how many routes, what is masked).
- `.github/**` (T13 reads for config; you read for what CI runs and how long).

## Context
`docs/OPERATIONS.md`, `scripts/README.md` (the ledger `scripts-ledger.test.mjs` enforces),
`docs/spec/hand-run-passes.md`, `docs/SECURITY.md` (the probes' purpose), audit 1's owner
decision to retire two probes and audit 2's `scripts-e2e-ci` report (its row `-12` is still open).

## Leads from the orchestrator
- **`scripts/qa/knip.jsonc` is stale**: it does not list `src/app/**/page.lab.tsx` as entries, so
  knip run the documented way reports 197 unused files (every lab page). T1 fix; write the exact
  lines.
- `check.mjs`'s test gate: 130 files; which are slow (T14 times them; you own the runner).
- The probes `phase3`…`phase10` (~2,400 lines): which still run against anything, which reference
  routes that no longer exist (`phase9-probe.mjs:39` was failing at audit 2).
- One-off probes that stayed: `hoopoe-idle-check`, `hoopoe-landing-check`, `hoopoe-zoom-probe`,
  `hover-probe`, `map-cluster-verify`, `apple-edge/*`, `_dir-room-shots`, `shot-clip`, `shot-svg`,
  `email-mark`. For each: last run evidence (git log, README ledger), and whether it would be
  rewritten in the MCP today (CLAUDE.md: "never hand-roll another puppeteer probe script").
- `visual.spec.ts` ROUTES vs the 12 desktop baselines: `landing.png` is 2.33 MB — full page at
  2×? What would `deviceScaleFactor: 1`, clipping or fewer routes save without losing the check?
- `collection-seek.spec.ts` 692 lines: one spec or a suite in one file?
- `drive.mjs` 726 and `audit-status.mjs` 712: what are they, who runs them, what do they cost.
- `scripts/dev/merge-cities.ts:22` unused `CANONICAL_PLACE_ID` (tsc).
- `.mts`/`.ts` scripts: how are they executed (tsx? node --experimental-strip-types)? Consistent?

## Questions
1. Every script: purpose, last evidence of use, README ledger row, keep/retire/merge.
2. The six signatures apply to scripts too; the shared helpers (`_probe-kit`, `_shoot`, `_env`,
   `_cli`) vs re-implemented bits in individual scripts.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- `npm run shots:clean` has existed since 2026-09-07 and nothing runs it: `e2e/.shots` is 506 MB /
  908 files (audit 1: 91 MB, audit 2: 153 MB). The lens proposes wiring it into `check.mjs`; say how.
- `scripts/dev/print-magazine.mjs` leaves 225 MB of rendered Editions under `scripts/dev/.magazine`
  with no retention rule; `.exports/` keeps every dated export. The hand-run-passes protocol has a
  working-folder convention — does it say what a pass keeps?
- The QA screenshot scripts write ~570 KB PNGs where WebP q72 would be a third (audits 1–2 noted it).
- `e2e/visual.spec.ts` baselines: every PNG is already 1× (`scale: "css"`), so a DPR policy saves
  nothing; 82 % of the bytes are one photograph's entropy (the hero on `/` and `/login`, the
  9 %-opacity `.valley-tree` backdrop on every signed-in full-page shot). The lens's lever is
  `toHaveScreenshot`'s `style` option hiding `.valley-tree` (~−3.5 MB, T17 policy, owner decision).
  Read its finding 04 and take a position.

## Audit 2 rows still open in your territory (report their state; absorb them if still real)
- **E5, the rest** (audit 2 fix-prompt ledger, "What Phase E left"): one bootstrap, one dev-login, one answer to
  "which Chrome" — and **eleven bare `config({ path })` calls still print dotenv 17's banner** on the stdout of every
  hand-run pass (`_env.mjs` passes `quiet: true`; the others do not).
- **scripts-e2e-ci-12** (with root-assets-12): four `.claude/agents` nobody references (T20 owns `.claude/`; you own
  whether any script or CI names them).

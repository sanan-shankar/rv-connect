# Charter: dependency-diet (L04, cross-cutting lens)
Report: `work/agents/dependency-diet.md`. See `_header.md`.

**Grants beyond the common rules**: web fetch/search for package sizes (bundlephobia, npm registry,
GitHub READMEs) — read-only. `npm ls`, `npm ls --all`, `npm ls <pkg>`, `npm view <pkg>` (read-only,
network) are allowed. No installs.

## Inputs
`package.json` (32 runtime + 17 dev; `overrides`; `puppeteer` config), `package-lock.json` (854
packages; 1,082 at audit 2 before `shadcn` and `world-atlas` left), `node_modules` (1.1 GB on disk,
512 top-level entries), `raw/knip-repo-plus-lab.txt` (deps section), `raw/depcruise.txt`,
audit 2's `dependency-diet.md` report and its §5 refusals (AWS SDK stays; `bcryptjs` stays).

## What to produce
1. **A table of all 49 dependencies**: section (runtime/dev), who imports it (`grep -rl` count
   across `src`, `scripts`, `e2e`, config), install size (`du -sh node_modules/<pkg>` plus its
   exclusive transitive closure where you can), client-bundle cost where it reaches a client file
   (L03 has the per-chunk data), correct section? (a runtime import in `src/` from a dev dep, or a
   dev-only tool in runtime), verdict (keep / move section / replace with X / remove).
2. **Misfiled**: `pg` is a devDependency while `@prisma/adapter-pg` needs it at runtime (it works
   only because Vercel installs dev deps) — confirm and say what breaks if `npm ci --omit=dev`;
   `dotenv` (who reads it — scripts only?); `prisma` (CLI) in runtime deps (needed for
   `postinstall: prisma generate` on Vercel — say so); `puppeteer` with its download policy;
   `@types/*` correctness; `typescript` 7.
3. **Duplicate versions** in the lockfile (`npm ls --all 2>/dev/null | grep deduped` vs
   multiple versions of `react`, `zod`, `tslib`, `@types/node`…) and the 5 `overrides`: each
   override's reason, still needed?
4. **The heavy ones**: `@sentry/nextjs` (install size, what it adds to the serverless function and
   whether anything reaches the client), `@aws-sdk/*` (refused at audit 2 — note only),
   `sharp`, `posthog-js` (the audit-1 owner decision vs Vercel Analytics — state), `motion`,
   `@phosphor-icons/react` + `lucide-react` (two icon sets — the design system says which is for
   what; is the split clean?), `@base-ui/react`, the `d3-*` trio + `topojson-client`,
   `@upstash/*`, `resend`, `@formkit/auto-animate`, `@paralleldrive/cuid2`.
5. **Native replacements**: what 20 lines of code would replace (cuid2 → `crypto.randomUUID` was
   parked at audit 1 — state), and where a dependency is used for one function.
6. **The advisory/renovate side**: `.github/renovate.json`? `npm-audit-gate.mjs`'s allowlist —
   entries whose advisory is gone.

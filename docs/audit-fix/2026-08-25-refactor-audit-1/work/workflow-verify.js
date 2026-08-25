export const meta = {
  name: 'simplification-audit-verify',
  description: 'Adversarial verification: 10 cluster verifiers re-test the audit findings at HEAD',
  phases: [{ title: 'Verify', detail: 'each verifier refutes a cluster of related findings, writes verify/<cluster>.md' }],
}
const ROOT = '/Users/sanan/Documents/rv-connect'
const AUD = `${ROOT}/docs/audit-fix/2026-08-25-refactor-audit-1/work`
const done = new Set((args && args.done) || [])
const VERDICTS = {
  type: 'object',
  required: ['cluster', 'verdicts', 'notes'],
  properties: {
    cluster: { type: 'string' },
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'verdict', 'reason'],
        properties: {
          id: { type: 'string', description: 'finding id, e.g. dead-code-01, or claim label' },
          verdict: { type: 'string', enum: ['confirmed', 'confirmed-with-correction', 'refuted', 'unverifiable-needs-db'] },
          reason: { type: 'string', description: 'one sentence; corrections spelled out' },
        },
      },
    },
    notes: { type: 'string', description: 'anything the report writer must know, 3 sentences max' },
  },
}
const CLUSTERS = [
  { key: 'v-dead-symbols', ids: 'member-surfaces-01, member-surfaces-11, catchups-01, catchups-06, catchups-13, admin-analytics-01, admin-analytics-02, admin-analytics-07, shell-primitives-01, shell-primitives-02, shell-primitives-03, shell-primitives-12, landing-mascot-avatars-01, landing-mascot-avatars-05, landing-mascot-avatars-06, landing-mascot-avatars-07, landing-mascot-avatars-11, dead-code-01..05, dead-code-09, dead-code-15, directory-profile-04, directory-profile-07, auth-edge-09, auth-edge-10, lab-02',
    charter: `Every DELETE or DE-EXPORT claim over code symbols. For each finding id listed, open the agent report it comes from (agents/<key>.md), extract every symbol it declares dead or internal-only, and RE-GREP each at HEAD yourself with word boundaries across src, scripts, e2e, prisma, .github, docs — including string references, dynamic import() strings, template usage, and test files. The tree moved during the find phase (one finding, catchups-16, was already refuted because a same-day commit added a reader), so your job is specifically staleness: has ANY commit since given a dead symbol a caller? Also verify the claimed "what to do" would not orphan something (e.g. deleting suggestSeedPrompts must trim catchups.test.mjs's import). Check the CONTRIBUTION_STATUSES/canBecomePaid conflict: dead-code-09 says delete, member-surfaces-11 says keep as tested spec — read contribution-state.test.mjs and say which is right.` },
  { key: 'v-dead-assets', ids: 'member-surfaces-02, root-docs-assets-01..04, root-docs-assets-07, root-docs-assets-13, root-docs-assets-14, root-docs-assets-16, root-docs-assets-17, dead-code-06, dead-code-07, dead-code-13',
    charter: `Every asset/file deletion claim. Re-grep each named public/ file basename (WITH the extensionless re-check that saved demo-banyan-*: grep the basename without extension too, and grep 'file:' keys in src/lib/demo-seed/content.ts), the audit JSON dumps' referrers, the overflow PDF/HTML, the QR SVGs, the gitignore dead lines (confirm nothing on disk matches the patterns), the .DS_Store count, and the globals.css dead-token list (grep every one of --z-base, --space-3xl, chart-1..5, animate-bell across ALL of src including lab). Verify tsBuildInfoFile relocation is a real tsc option and node_modules/.cache is safe.` },
  { key: 'v-schema-auth', ids: 'dependency-diet-04, data-layer-01, data-layer-02, data-layer-03, data-layer-07, dead-code-14, dependency-diet-10, catchups-16-rewrite',
    charter: `The schema and auth claims — the highest-stakes cluster. (1) The adapter-inert claim: read src/lib/auth.ts IN FULL at HEAD; confirm strategy:"jwt" and Credentials-only; then check node_modules/next-auth (beta.32) source for ANY adapter call reachable under this config (search its dist for 'adapter.' call sites gated on strategy/provider type; the claim fails if e.g. signIn events or the JWT callback touch adapter methods). (2) Re-count prisma.account/session/verificationToken/groupInvite call sites. (3) The five dead-column claims (openTo, tag, blurhash, originalUrl never-written, visibility write-only) — re-grep each with precise patterns. (4) The three droppable indexes — re-grep every where/orderBy on SearchLog.query, Group.visibility, Comment postId+isHidden. (5) Prisma version skew 7.5.0/7.8.0/7.9.1 — read the three node_modules package.json versions yourself. (6) The catchups-16 rewrite: confirm admin/catchups/[catchupId]/page.tsx reads theme and no member surface does.` },
  { key: 'v-bundle-facts', ids: 'bundle-build-01..04, bundle-build-07, bundle-build-08, bundle-build-10, dependency-diet-12, lib-core-config-03, landing-mascot-avatars-03, landing-mascot-avatars-08',
    charter: `The measured bundle claims. Verify by direct inspection of ${ROOT}/.next (if the build output is still present; if .next/static/chunks is gone or rebuilt, say so and verify what you can from raw/route-bundle-stats.json + raw/route-js.txt): (1) posthog chunk 24740q0lmcv1n.js ~245KB on all 92 routes; (2) motion chunk 3u7hqaj6wqdv7.js on all routes AND the domMax question — grep src for 'layout' props on motion components, layoutId, drag props, AnimatePresence usage; COUNT them and say whether LazyMotion needs domMax (halving the claimed saving) — this decides dependency-diet-12 vs bundle-build-02's numbers; (3) the not-found→Hoopoe chain: grep the hoopoe path literal "M0 -3.4 Q3 0 0 3.4" in chunks and confirm which chunk, and that not-found.tsx statically imports Hoopoe; (4) lab CSS leakage: spot-check 2 of the claimed lab-only arbitrary classes in the built CSS; (5) DemoBar string in a first-load chunk of a member route; (6) the world-atlas static import. Do NOT run any build.` },
  { key: 'v-groups-residue', ids: 'feed-posts-01, feed-posts-13, member-surfaces-13, data-layer-02, shell-primitives-08-groupinvite, landing-mascot-avatars-04',
    charter: `The Groups-residue programme. Verify: no /groups route dir exists; createPost refuses groupId (quote the line); the five revalidatePath group ternaries exist as claimed; loadSavedPosts runs a groupMember.findMany on every call (quote); letter-engagement's two /groups fallbacks; FeedScope dead values + the stale 'needs loadPosts support' comment vs actions.ts accepting authorId; the group_invite notification icon entry has no writer (grep for "group_invite" writers); the tour catchups-explainer anchor is registered nowhere (grep useTourAnchor + data-tour). Then the risk side: confirm decidePostVisibility's group branch is pinned by post-visibility-rule.test.mjs so the fixer must NOT touch it.` },
  { key: 'v-dedupe-evidence', ids: 'auth-edge-01..03, auth-edge-05, auth-edge-08, auth-edge-12, duplication-02, duplication-04..06, duplication-18, catchups-02, catchups-04, catchups-07, feed-posts-03, feed-posts-05..08, member-surfaces-03, member-surfaces-06, data-layer-05, data-layer-06, lib-tests-01',
    charter: `The duplication evidence. You cannot re-read everything; sample rigorously: (1) confirm the 136-line login/signup clone by diffing the claimed ranges (login-client 223-358 vs signup-client 163-284) — count differing lines; (2) confirm the published-round select clone AND the song-rule drift (the round page's title fallback chain vs the home's songUrl-only condition — quote both); (3) re-count the action-preamble census on TWO files (feed/actions.ts and messages/actions.ts): actions exported, await auth() count, requireVerifiedMember count — do the numbers match duplication-02's census rows; (4) confirm the 14x identity-select count with the exact grep 'photoUrl: true, birdOverride: true'; (5) confirm decomment copies: grep -l 'const decomment' across src scripts and count; (6) confirm the date-locale disagreement by quoting the three locale strings; (7) confirm the three photo-intake copies share the era/auto-approve/thumb recipe by opening the claimed ranges; (8) the double-auth claim in duplication-02 (requireVerifiedMember calls auth() itself — read member-gate.ts and confirm).` },
  { key: 'v-pinned-safety', ids: 'feed-posts-02, catchups-02, catchups-03, duplication-02, duplication-09, dead-code-09-slice-trap, lib-tests-02, lib-tests-03, member-surfaces-08, data-layer-08',
    charter: `The pinned-file safety claims — where a wrong claim breaks the check gate or a security pin. For each: (1) composer-rule.test.mjs really reads create-post-form.tsx by path and matches the fragments feed-posts-02 lists; (2) catchup-lifecycle.test.mjs really greps refuseIfFrozen( per function body (so catchups-02's helper MUST update it); (3) gate-coverage.test.mjs's GATE regex at ~line 31 — quote it; confirm adding withMember|withAdmin|withAuth is the right edit shape; (4) upload-size-rule/image-purge-rule really read the upload route files as text (duplication-09's caveat); (5) normalize.test.mjs:71 uses socialIcon's decl as a slice boundary (dead-code's trap) — quote it; (6) proxy.ts additions for /donate: confirm proxy-rule.test.mjs pins publicPaths shape and whether a new redirect block would trip it; (7) data-layer-08's omit: confirm Prisma 7 supports omit on findUnique in this installed version (check node_modules/@prisma/client typings for 'omit'); (8) security-regressions.test.mjs does NOT reference PrismaAdapter/Session/Account (the adapter-removal precondition).` },
  { key: 'v-root-docs', ids: 'root-docs-assets-05, root-docs-assets-06, root-docs-assets-08..10, root-docs-assets-15, root-docs-assets-18, scripts-e2e-ci-07, lib-tests-06',
    charter: `Docs and root claims. Verify the six dead doc pointers (each target absent from git ls-files); the profile.md REJECTED banner text and that 22b4b6c shipped the letterhead; docs/README's spec list vs ls docs/spec; the README rewrite claims (already orchestrator-verified: db push at 56+107, admin-login at 39 — just confirm nothing else dangerous is listed, e.g. check the env-var table vs the app's real env reads in raw/env-flags.txt); CLAUDE.md vs OPERATIONS duplicated tables (quote both table headers); the '10 routes x 2 viewports' vs 11 ROUTES claim (count ROUTES in e2e/visual.spec.ts); progress.md session-header formats count (~101); the knip.json entry proposal is syntactically valid knip config.` },
  { key: 'v-scripts-tooling', ids: 'scripts-e2e-ci-01, scripts-e2e-ci-04..09, lib-tests-03, lib-tests-04, lib-tests-07, dependency-diet-15, dependency-diet-16',
    charter: `Scripts/tooling claims. Verify: the 22-unlisted-scripts list (re-derive: git ls-files scripts vs scripts/README.md backticked names — count and name any difference from the report's list); demo/run-sql.mjs zero referrers + dev/run-sql.mjs --env flag exists (quote); the demo-ref guard constant in demo/run-sql.mjs the port must keep; phase6/phase9 one-time-ness (read both headers; confirm phase9 renames check.yml mid-run — quote the line); crawl.mjs missing the five routes (read its list); the SKILL.md stale counts ('14' in check SKILL, route lists in screenshot-auth/ui-audit naming /groups //settings); xlsx via createRequire (quote import-roster.mjs:36); puppeteer skipDownload current scope; the 2026-08-03 test cohort birth commits (git log --diff-filter=A on the three files).` },
  { key: 'v-member-admin', ids: 'member-surfaces-05, member-surfaces-12, member-surfaces-14, member-surfaces-15, admin-analytics-03..06, admin-analytics-08..13, directory-profile-01..03, directory-profile-05, directory-profile-08..14, catchups-08..12, catchups-14, feed-posts-04, feed-posts-09..12, feed-posts-14, feed-posts-15',
    charter: `The remaining T2/T3 surface findings — sample the highest-risk half rather than all: MUST verify: directory-profile-05 (professions: confirm the deleted onboarding Industry select via git log --diff-filter=D and that both live workplace writers are free text); directory-profile-01 (the edit-only import list in letterhead-profile — confirm LocationPicker/HouseChainEditor/AvatarCropDialog imports and that draft is only passed on own profile, quote page.tsx); directory-profile-08 (places/search local escapeLike lacks the clamp — quote both versions); admin-analytics-03 (ContentView calls loadPeople() and uses only .total — quote page lines); admin-analytics-06 (admin-worklist importers server-only); member-surfaces-05 (the notice retirement: retention caps notifications at 365 days — quote retention.ts); member-surfaces-12 (writers pin subject:"" freeTags:null — quote one); catchups-08 (the two NotAvailableCards' padding difference — quote both); feed-posts-09 (composer handlers duplicate rich-text-editing exports — quote both bodies); feed-posts-04 (the interaction gates: showComments/viewerAt/showEdit conditions — quote). For the rest, verify one load-bearing quote each where cheap; mark 'confirmed' only on evidence you saw.` },
]
const prompt = (c) => `You are adversarial verifier \`${c.key}\` in the pre-release simplification audit of ${ROOT}. The find phase produced 241 findings across 18 reports in ${AUD}/agents/. Finder quality is high, but the tree MOVED during the find phase (HEAD is now past c74d99f) and one finding was already refuted because a same-day commit added a reader of a "dead" column. Your job is to REFUTE what you can, at today's HEAD, before a fix session trusts it.

Read ${AUD}/brief-common.md sections 2 (hard rules — read-only, no builds/tests/DB, another session shares the tree) and 4c (dead-code safety rules) first. Tool outputs from the find phase are in ${AUD}/raw/. The machine-readable index is ${AUD}/findings-index.json.

## Findings in your cluster
${c.ids}

## Your charter
${c.charter}

## Rules of the verdicts
- "confirmed" only after you personally saw the evidence at HEAD (quote or count in your reason).
- "confirmed-with-correction" when right in spirit, wrong in a detail — spell out the correction (line ranges, counts, savings).
- "refuted" when the claim is wrong; say exactly what you found. Default toward refuted when uncertain.
- "unverifiable-needs-db" for claims resting on live data this audit cannot query.
- Do not re-litigate owner decisions or not-findings; verify facts, not taste.

## Deliverable
Write your full working notes to ${AUD}/verify/${c.key}.md BEFORE returning (the session may die; the file survives). Then return the structured verdict list — one entry per finding id you checked (use the sub-claim label where a finding has several distinct claims).`
phase('Verify')
const todo = CLUSTERS.filter((c) => !done.has(c.key))
log(`launching ${todo.length} verifiers in waves of 5 (skipping ${done.size})`)
const ok = []
for (let i = 0; i < todo.length; i += 5) {
  const wave = todo.slice(i, i + 5)
  log(`wave ${i / 5 + 1}: ${wave.map((c) => c.key).join(', ')}`)
  const results = await parallel(wave.map((c) => () => agent(prompt(c), { label: c.key, phase: 'Verify', schema: VERDICTS, effort: 'high' })))
  ok.push(...results.filter(Boolean))
  if (wave.length > 1 && results.every((r) => !r)) { log('entire wave failed - stopping'); break }
}
const flat = ok.flatMap((r) => r.verdicts.map((v) => ({ ...v, cluster: r.cluster })))
log(`verdicts: ${flat.length} total; refuted ${flat.filter((v) => v.verdict === 'refuted').length}; corrections ${flat.filter((v) => v.verdict === 'confirmed-with-correction').length}`)
return { clusters: ok.map((r) => r.cluster), summaries: ok }

export const meta = {
  name: 'refactor-audit-2-verify',
  description: 'Adversarial verification: cluster verifiers re-test refactor audit 2 findings at HEAD, each writes verify/<cluster>.md',
  phases: [{ title: 'Verify', detail: 'each verifier refutes a cluster of related findings, writes verify/<cluster>.md before returning' }],
}
const ROOT = '/Users/sanan/Documents/rv-connect'
const AUD = `${ROOT}/docs/audit-fix/2026-09-03-refactor-audit-2/work`
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
          id: { type: 'string', description: 'finding id, e.g. collection-02, or a sub-claim label' },
          verdict: { type: 'string', enum: ['confirmed', 'confirmed-with-correction', 'refuted', 'unverifiable-needs-db', 'unverifiable-needs-browser'] },
          reason: { type: 'string', description: 'one sentence; corrections spelled out with the line numbers you saw' },
        },
      },
    },
    notes: { type: 'string', description: 'anything the report writer must know, 3 sentences max' },
  },
}
const CLUSTERS = [
  {key:"lib-misc", charter:"assorted src/lib and src/app findings that fit no single territory."},
  {key:"tooling-a", charter:"scripts/, e2e/, .github/ and the unit tests. A delete-this claim must prove nothing invokes it: package.json, check.mjs, every workflow, every other script, every skill under .claude/. check.mjs has a test-count floor and a ci-parity test that fail if the suite shrinks -- say where that bites."},
  {key:"tooling-b", charter:"scripts/, e2e/, .github/ and the unit tests. A delete-this claim must prove nothing invokes it: package.json, check.mjs, every workflow, every other script, every skill under .claude/. check.mjs has a test-count floor and a ci-parity test that fail if the suite shrinks -- say where that bites."},
  {key:"media", charter:"the image pipeline, storage, the viewer, photo layout and avatars. Byte and dimension numbers ARE the claim: reproduce them or correct them."},
  {key:"shell-a", charter:"the app shell, common primitives, layout, mascot, landing, onboarding, guide, support and settings. Prop-is-inert and component-is-unused claims need every call site enumerated."},
  {key:"shell-b", charter:"the app shell, common primitives, layout, mascot, landing, onboarding, guide, support and settings. Prop-is-inert and component-is-unused claims need every call site enumerated."},
  {key:"collection-a", charter:"the Collection: its client, server actions, scripts, tests and photograph pipeline. The newest large feature, so finder confidence is least tested here."},
  {key:"collection-b", charter:"the Collection: its client, server actions, scripts, tests and photograph pipeline. The newest large feature, so finder confidence is least tested here."},
  {key:"tooling-c", charter:"scripts/, e2e/, .github/ and the unit tests. A delete-this claim must prove nothing invokes it: package.json, check.mjs, every workflow, every other script, every skill under .claude/. check.mjs has a test-count floor and a ci-parity test that fail if the suite shrinks -- say where that bites."},
  {key:"admin", charter:"the admin rooms and analytics queries."},
  {key:"shell-c", charter:"the app shell, common primitives, layout, mascot, landing, onboarding, guide, support and settings. Prop-is-inert and component-is-unused claims need every call site enumerated."},
  {key:"auth-edge-a", charter:"auth, the proxy, API routes, email and the sign-in surfaces. SECURITY-SENSITIVE: a dedupe that changes an auth path by even one branch is a correction, not a confirmation. Audit 1 refuted the withMember/withAdmin wrapper (gate-coverage.test.mjs, C-189, forbids a non-async export in a \"use server\" file) -- refute anything shaped like it again."},
  {key:"auth-edge-b", charter:"auth, the proxy, API routes, email and the sign-in surfaces. SECURITY-SENSITIVE: a dedupe that changes an auth path by even one branch is a correction, not a confirmation. Audit 1 refuted the withMember/withAdmin wrapper (gate-coverage.test.mjs, C-189, forbids a non-async export in a \"use server\" file) -- refute anything shaped like it again."},
  {key:"misc-a", charter:"findings whose evidence names no single file -- repo-wide counts, cross-cutting patterns, process claims. The easiest to overstate: recompute every number you are given."},
  {key:"feed-posts-a", charter:"the feed, posts, letters and comments. Unreachable-control and dead-branch claims need every caller enumerated, not just the file read."},
  {key:"config-ui", charter:"globals.css, Tailwind, next.config, package.json and the shadcn ui primitives."},
  {key:"misc-b", charter:"findings whose evidence names no single file -- repo-wide counts, cross-cutting patterns, process claims. The easiest to overstate: recompute every number you are given."},
  {key:"catchups-a", charter:"Catch-ups: rounds, prefs, the shelf, the bin, succession. Rich invariants; a simplification that drops a guard is a refutation."},
  {key:"catchups-b", charter:"Catch-ups: rounds, prefs, the shelf, the bin, succession. Rich invariants; a simplification that drops a guard is a refutation."},
  {key:"feed-posts-b", charter:"the feed, posts, letters and comments. Unreachable-control and dead-branch claims need every caller enumerated, not just the file read."},
  {key:"docs-area", charter:"documentation findings. Verify the claim about the DOC by reading the code it describes."},
  {key:"lab", charter:"src/app/lab and public/lab. check.mjs fails on an unregistered room; a delete must take its registry line with it."},
  {key:"data", charter:"Prisma schema, retention, keyset pagination and query shape. NOTE: the owner has just cut notification retention to 30 days; judge related claims against 30, not 365."},
  {key:"directory-profile-a", charter:"the directory, member profiles, the map and profession tags."},
  {key:"directory-profile-b", charter:"the directory, member profiles, the map and profession tags."},
  {key:"root-assets", charter:"the repository root, public/, the visual baselines, .claude/ and the tracked byte census. Byte and line counts ARE the claims: recompute every one. A delete-this-asset claim must prove nothing references it, including CSS url() and the web manifest."},
  {key:"docs-report-a", charter:"documentation findings from the docs lens. Verify each claim about a DOC by reading the code it describes; a doc is only stale if the code disagrees with it. docs-02 (media.md's image pipeline) is the highest-stakes one: check it against collection/actions.ts and image.ts."},
  {key:"docs-report-b", charter:"documentation findings from the docs lens, second half. Same rule: verify the claim about the doc by reading the code. Counted facts (route counts, test-file counts, spec-file counts) must be recounted, not taken."},
]
const prompt = (c) => `You are adversarial verifier "${c.key}" in refactor audit 2 of ${ROOT}. The find phase produced 369 findings across the reports in ${AUD}/agents/ (index: ${AUD}/findings-index.json). Finder quality is high, but every finding is a CLAIM until someone re-reads the tree at today's HEAD and tries to break it. Your job is to REFUTE what you can before a fix session trusts it.

Read ${AUD}/brief-common.md sections 2 (hard rules: read-only; no builds, tsc, knip, browsers, database, network), 4 (what audit 1 settled and refuted) and 5c (dead-code safety) first. Raw tool output from the find phase is in ${AUD}/raw/. A production build of HEAD sits read-only at ${ROOT}/.scratch/audit2-build/.next/ and a lab-free one at ${ROOT}/.scratch/audit2-build-nolab/.next/.

## Findings in your cluster
Your cluster key is **${c.key}**. Its finding ids are the "${c.key}" array in ${AUD}/clusters-final.json. Look each id up in ${AUD}/findings-index.json (id, title, where, tier, class, saving, gate, claim), then read its full entry in its parent report under ${AUD}/agents/ before you judge it.

## Your charter
${c.charter}

## Rules of the verdicts
- "confirmed" only after you personally saw the evidence at HEAD (quote a line or a count in your reason).
- "confirmed-with-correction" when right in spirit, wrong in a detail: spell out the correction (line ranges, counts, savings, a pin the finding missed).
- "refuted" when the claim is wrong: say exactly what you found. Default toward refuted when uncertain.
- "unverifiable-needs-db" for claims resting on live data; "unverifiable-needs-browser" for claims only a running app can settle (the orchestrator will take those to chrome-devtools).
- Do not re-litigate owner decisions or not-findings; verify facts, not taste. Where two findings from different reports overlap, say whether they agree and which one's steps are the safer ones.

## Deliverable
Write your full working notes to ${AUD}/verify/${c.key}.md BEFORE returning (the session may die; the file survives). Then return the structured verdict list, one entry per finding id or sub-claim you checked.`
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
log(`verdicts: ${flat.length}; refuted ${flat.filter((v) => v.verdict === 'refuted').length}; corrections ${flat.filter((v) => v.verdict === 'confirmed-with-correction').length}; needs-db ${flat.filter((v) => v.verdict === 'unverifiable-needs-db').length}; needs-browser ${flat.filter((v) => v.verdict === 'unverifiable-needs-browser').length}`)
return { clusters: ok.map((r) => r.cluster), verdicts: flat }

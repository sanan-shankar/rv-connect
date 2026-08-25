# Completeness critic (critic-1) — what the audit apparatus did NOT look at

Date: 2026-08-25. Read-only pass. Inputs: brief-common.md (the promised methodology),
simplification-report.md (the deliverable), findings.md (orchestrator notes + Decomposition),
all 18 agent Coverage sections, findings-index.json (241 entries), workflow-find.js (the
actual charters), every file in raw/, and fresh reads of code at HEAD to verify each claimed
gap. Everything below was verified against the tree, not inferred from the reports.

**Verdict in one line**: the find/verify apparatus is sound — raw tool output is genuinely
accounted for, territory ownership of src is complete to the file, and my fresh-eyes reads
of audited files found almost nothing the agents missed. The one structural hole is the
**"For other lenses" channel**: cross-territory notes have no finding ids, so the
compilation dropped at least six verified items, including one visible-bug lead. The rest
of the gaps are small and enumerated below with follow-ups.

---

## Gaps found (ordered by materiality)

### G1 — The "For other lenses" sections are a drop channel; six verified casualties

Every agent report ends with "For other lenses" cross-notes. These carry no `<agent>-NN`
id, so `findings-index.json` never indexes them, no §2 plan row points at them, and no fix
session will ever read them (the report tells fixers to read "each item's full entry" — these
items have no entry). I checked every For-other-lenses line against the report, the index,
and the receiving agent's report. Most were independently re-found or merged (the MERGES
list in findings.md is real). These six were not, and I verified each at HEAD:

1. **A visible-bug lead, lost** (catchups → "bugs"): `src/components/catchups/round/question-section.tsx:41-44`
   prints `entry.body` raw (`{entry.body}` in a `whitespace-pre-wrap` `<p>`) while
   `src/components/catchups/round/answer-card.tsx:105` renders the same field through
   `renderRichText`. A photo caption with formatting markers prints them literally on the
   wall and formatted on the card. Verified at HEAD. Not in any other report, not in
   `docs/planning/bugs.md`, not in the deliverable — which advertises "two small visible
   bugs get fixed free"; this found-then-lost one would be the third.
   *Follow-up: add to the phase-3/4 catchups work or bugs.md; one-line fix (route the wall
   caption through `renderRichText` or strip markers).*

2. **The zod vs zod/v4 split** (dependency-diet §For-other-lenses, aimed at the profile
   territory): `src/components/profile/profile-actions.ts:26` imports
   `type { ZodTypeAny } from "zod"` while the other five zod files import `"zod/v4"`.
   Verified: 1× `"zod"`, 5× `"zod/v4"`. dependency-diet's own dep table says "keep; unify
   the split (For other lenses)" — and then nobody received it. Zero mentions of zod in the
   report. *Follow-up: one-line import change, ride along in phase 3.*

3. **`@types/node ^20` vs CI Node 24** (dependency-diet "CI lens" note): verified —
   package.json:76 `"@types/node": "^20"`, check.yml:46 and snapshot.yml:54 `node-version: '24'`.
   *Follow-up: bump in phase 1b's dependency row.*

4. **`transition-[colors,transform]` in 14 shipped files** (member-surfaces note): the
   protocol-adjacent pattern census. Not in the report or index. I confirmed the pattern
   exists (e.g. `src/components/messages/conversation.tsx:104`). *Follow-up: hand to the
   protocol audit or record a not-finding; cheap either way.*

5. **Dead CSP allowance** (dependency-diet "security/config" note): `next.config.ts:125`
   allows `https://vitals.vercel-insights.com` (Speed Insights beacon) but
   `@vercel/speed-insights` is not installed. Semi-covered — the agent says it "dies
   naturally" with finding 13 (Owner decision 7), but the report's owner-decision text never
   mentions it, so if the owner says "keep Vercel Analytics" the dead line survives.
   *Follow-up: one clause in Owner decision 7.*

6. **Smaller dropped notes**, each verified absent from report+index: auth-edge's
   `settings/actions.ts:324-328` `hasBudget`+`consume` observation (member-surfaces never
   mentions it); member-surfaces' "collection-client and directory-client fetch their first
   page client-side after SSR" perf note. Low value individually.

*Systemic follow-up for G1: one ~30-minute compilation pass over the 18 "For other lenses"
sections, disposing of every line as (a) already merged (name the id), (b) new plan row, or
(c) consciously dropped (say why). The MERGES list in findings.md shows the orchestrator
did this for the big clusters; the tail was never swept.*

### G2 — The "no cron" stale-comment fix names one of five sites

The report (phase 2 stale-comment batch) targets `(main)/layout.tsx:81` ("There is no cron
on this project" vs the two crons in vercel.json). Verified by grep: the same claim lives in
**five** shipped files — `src/app/(main)/layout.tsx:81`, `src/app/(main)/admin/mail/page.tsx:107`,
`src/app/(main)/notifications/actions.ts:48`, `src/lib/email-queue.ts:63`,
`src/lib/auth-tokens.ts:146`. No agent report or verify file mentions "no cron" at all (the
layout one was an orchestrator note in findings.md). The claims are half-true — no cron
drives the mail queue — but the audit itself ruled the wording drift; fixing one of five
leaves the drift standing. *Follow-up: widen the phase-2 batch item to the five files;
suggested wording "no cron drives this queue" rather than "no cron on this project".*

### G3 — One tracked file owned by nobody: `src/app/(main)/forbidden.tsx`

The Decomposition ("every tracked file belongs to exactly one territory") predates commit
c74d99f, which created this file mid-audit. I subtracted every tracked src file against the
actual charter lists in workflow-find.js: this is the only orphan (src/lib is fully owned —
the 18-lib directory-profile charter includes normalize/vcard/social/search-log/professions/
search-continuation, which findings.md's abbreviated globs hide). Every report mentions
forbidden.tsx only as WIP context; none audited it. **I read it myself: 40 lines, every
choice argued in the header, nothing to simplify.** So the gap is bookkeeping, not code.
Also unowned but trivial: `src/app/apple-icon.png`, `favicon.ico`, `icon.svg` (2 KB each,
framework-convention). *Follow-up: none beyond an asterisk on the coverage-map claim.*

### G4 — The showcase decision is missing its asset rider (283 KB, publicly served)

`public/images/landing/{catchups-v2,collection,directory-v2,feed-v2,letters-v2}.webp`
(5 tracked files, ~283 KB) are referenced **only** by `src/components/landing/shots.ts` —
which is reachable only behind `SHOW_SHOWCASE = false` (landing-mascot-avatars-02).
Verified: no other referrer in src/docs/scripts/e2e. The finding lists shots.ts as code but
never names the assets, and root-docs-assets' public/ sweep (which caught gen/, the
v-series, the WhatsApp originals) missed this folder — the files fell between the code lens
("referenced, so not dead") and the asset lens ("referenced, so kept"). Related and also
unconnected: **bugs.md open item 2** says `collection.webp` is a stale pre-redesign capture
— the owner conversation about the showcase (Owner decision 1) should carry both facts.
*Follow-up: one sentence in Owner decision 1 — the five screenshots ride the showcase's
fate, and one of them is stale per bugs.md #2.*

### G5 — Checklist lenses that no report applied by name (low yield, but unrecorded)

Phrase-grep across all 18 reports: **zero** hits for "nested ternar", "indentation" /
max-3-levels, "guard clause", "useMemo", "mirrors props"; one hit for "useCallback". The 4e
signatures 1-6 and defensive try/catch were substantively applied (findings exist for
single-use types, options-params, narrating comments; try/catch discussed in 3 reports),
but the 4d micro-trio and the React trio were not systematically walked. I spot-checked
them myself so the yield is on record:
- Nested ternaries: 53 single-line hits in shipped src (excl. lab/tests); sampled a dozen —
  all two-level, idiomatic, parenthesized (worst: `perching-birds.tsx:282`, three-level but
  typed and clear). Applying the lens would produce contested hygiene churn, not savings.
- useMemo/useCallback: 53 sites; sampled `people-list.tsx:96` (justified — `setParam` dep),
  `collection-client.tsx:107` (justified in its own comment), `:124` (marginal, harmless).
- console.*: type-sludge.txt counts 63 sites but lists none; no agent triaged them. I did:
  **zero `console.log`**; all 63 are `console.warn/error`, which the house standard
  (CLAUDE.md: dev telemetry must log its own failures) requires. Non-issue.
*Follow-up: none — record this section as the conscious skip so no future audit re-runs it.*

### G6 — Phase 6 ("rewrite") was never applied-or-rejected on a code file

The findings index has "rewrite" only for docs. No report says "I considered a clean-room
rewrite of my worst file; the tests are / are not a faithful spec". De facto answered — the
two biggest files (create-post-form 1,683, catchups/actions 2,187) got architecture
findings (feed-posts-02, catchups-03) instead, which is the better call — but the brief
asked for the judgement to be stated. *Follow-up: none needed; noting for honesty.*

### G7 — Server-action return-shape consistency was never asked as a question

The codebase itself documents the cost: `src/components/catchups/index/filed-away.tsx:112`
("[the two actions] return different success shapes, and unifying them inside the thunk…").
Actions return `{ error }` objects, `{ success: true }`, bare data, or silent-empty results
(`notifications/actions.ts` mixes two of these in one file). Only glancing mentions in two
reports. The audit's own action-gate wrapper (duplication-02, phase 6 pilot) is the natural
vehicle and its entry does not mention return shapes. *Follow-up: one sentence in the
duplication-02 pilot brief: standardize the return shape of the wrapped file's actions
while wrapping.*

### G8 — docs/spec content was audited only at the staleness-marker level

root-docs-assets explicitly delegated spec CONTENT to territory agents; territory agents
read specs as *reference*, not as audit subjects. The seam mostly worked (several staleness
findings: profile.md banner, mascot.md, media.md, directory.md headers) but nobody owned
"is this 17.4k-line docs tree itself bloated" beyond pointers and banners. Given the brief
forbids proposing deletion of docs the owner reads, expected yield is low. *Follow-up:
acceptable as-is; if the owner repeats the docs-bloat complaint, that pass is the one that
was not done.*

---

## Territory-skip judgements (every admitted skip, from the 18 Coverage sections)

| Skip | Verdict |
|---|---|
| bundle-build: 40 largest client files probed by hook-density scan, not read | Acceptable — the lens question (boundary + weight) is answered by the probe; territory agents read the internals |
| catchups: 5 loading.tsx skimmed | Acceptable — stated convention |
| data-layer: admin raw-SQL bodies beyond FROM/WHERE | Acceptable — admin-analytics read admin-analytics.ts fully anyway; double-covered |
| dead-code: lab symbols by refcount; shadcn sub-exports as a class | Acceptable — shell-primitives read all ui/* fully |
| duplication + lab: variant-file interiors (~20k lines) not line-read | Acceptable by charter (owner-protected history; nothing imports them — verified by the agents by grep). Largest unread mass in the audit; charter-sanctioned |
| landing: showcase-family bodies skimmed (behind the false flag) | Acceptable now, **but**: if the owner ships the showcase, ~2,000 of those lines return to production having never been line-audited. Should be said in Owner decision 1 |
| lib-core-config: demo-seed content.ts/people.ts prose | Acceptable — narrative data with its own reference-walking test |
| member-surfaces: policy prose; avatar-crop-dialog:230-370 | Acceptable — I read the crop dialog tail myself (see one-hour test): clean |
| root-docs-assets: spec content, progress.md content, JSON dumps | Spec content = G8; rest acceptable |
| scripts-e2e-ci: phase-probe + audit-status bodies; vendored skill prose | Acceptable — liveness was the question; owner decision 8/9 covers fates |
| dependency-diet: package-lock via npm ls | Acceptable |
| type-coverage tool could not run (Node 26) | Disclosed in report; grep substitute exists |

## The one-hour test (fresh eyes, checklists applied)

- `src/components/messages/conversation.tsx` (136 lines, read fully by member-surfaces):
  clean; every comment carries a reason; only note is the `transition-[colors,transform]`
  at :104 (part of G1.4) — nothing else missed.
- `src/app/(main)/notifications/actions.ts` (138 lines, member-surfaces): clean and
  unusually well-argued (KEEP=100 prune, value-keyset, updateMany-not-update all pin audit
  ids). Missed by the audit: its `:48` "no cron on this project" copy (G2), and it is a live
  exhibit of the mixed return shapes (G7). `revalidatePath("/")` per tap is debatable but
  defensible; not a finding.
- `src/components/settings/avatar-crop-dialog.tsx:225-370` (the admitted skim): clean —
  fallback paths argued, buttons have disabled states, motion via transform only. The skim
  was safe.

## Evidence for the clean parts (what I checked and found accounted for)

- **Raw outputs**: sampled all of todos.txt (5 lines, one catchups TODO cluster — covered,
  7 mentions in catchups.md), tsc-unused.txt (4 hits — utils trio + combobox/popover, in
  the plan), commented-out-code.txt (all prose — matches the §5 not-finding),
  madge-orphans-filtered (6 — 2 findings + 4 framework FPs), depcruise.txt (5 cycles + 2
  warns — all in phase 6), comment-density.txt (top files all read-fully or lab-classified),
  env-flags.txt (34 keys; dev flags triaged across auth-edge/bundle-build/dead-code),
  route-js.txt (the report's route table is derived from it), use-client.txt (top 38 files
  all owned and read or probed), jscpd clone-frequency ranking (top 10 files each have a
  triage window or a not-finding), knip-configured unused-exports (8 sampled symbols — all
  present in dead-code's ledger). The coverage-map claim "every tool line is explained"
  held everywhere I sampled, with the one console.* soft spot closed above (G5).
- **Ownership**: subtraction of every tracked src file against the workflow-find.js
  charters: complete except forbidden.tsx + 3 tiny icon assets (G3). prisma 51/51 (schema +
  50 migrations), e2e/.github/.claude/scripts/public/docs all in a territory.
- **TRAPS.md**: consulted by 8 of 18 agents; the DDL and tsconfig proposals carry the
  right trap-aware gates.
- **bugs.md open items**: only the collection.webp staleness (G4) intersects the audit and
  went unconnected; items 3/5 are cosmetic/product, rightly out of scope.

## Bottom line

No missing subsystem, no unexamined directory, no tool output with unexplained mass. The
apparatus read what it said it read. The follow-ups worth an hour of a fix session:
sweep the 18 "For other lenses" tails into the plan (G1 — six named items, one of them a
real rendering bug), widen the no-cron comment fix to five files (G2), and add the
283 KB asset rider + stale-screenshot note to Owner decision 1 (G4). G5-G8 are recorded
so nobody re-litigates them.

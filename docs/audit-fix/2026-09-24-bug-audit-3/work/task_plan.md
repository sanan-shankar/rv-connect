## >>> CLOSED 2026-10-24 — the audit is finished; nothing here is resumed <<<
The owner closed the audit after completeness round 4 ("close now. i'll run the huge fix session
separately"). The deliverables are `../bug-report-3.md` and `../fix-prompt.md`; the fix campaign runs
from the fix-prompt alone (@ it and invoke `/campaign`). This folder is the evidence and stays while the
campaign runs (README house rule). `ledger-final.json` + `ledger-overrides.json` (the orchestrator's
rulings) are the ledger; the tools that compiled it ran from /tmp and are gone. Everything below is the
record of how it got here.

# Third pre-release bug & stability audit — task plan (2026-09-24)

## >>> FOURTH SESSION — resumed 2026-10-23 on the owner's word ("finish that in full swing", bug audit 3 picked over refactor audit 3) <<<
Orchestrator: Opus 5.5. HEAD at resume `88642426`, 113 commits past `495ecdd2`; `rebaseline.md` lists them and every
changed file. Every agent from here on checks at HEAD and may rule a finding **FIXED-SINCE <sha>**.
Order this session: (1) L7 + L8 resume, validators V-T2 V-T4 V-T6 V-T7a (resume) and V-T3 V-T7b V-T9 V-O-L1 V-L-a V-L-b
(fresh) on opus; V-L-c after L8, V-L-d after L7. (2) Completeness rounds C1-C3. (3) Final report + fix-prompt.md.
(4) The fix campaign via /campaign, owner's explicit ask. Progress is logged in "Done-list" below as agents land.
If this session dies: verdict and report files on disk are the state; relaunch only what has no `## Coverage`.

## >>> RESUME HERE — THIRD STOP, 2026-09-27 ~21:30 BST (owner paused the audit for usage) <<<
The owner stopped the audit mid-validation to save usage and will resume in a NEW session. An INTERIM
compilation of everything found so far is `../bug-report-3.md` (committed with this folder). A session told to
"continue the bug audit" does this, in order:
1. **Re-baseline.** The audit read the code at `495ecdd2`. HEAD moved while it was paused (at the stop: `4eddc6f7`,
   seven commits — `e49e6265` "a changed batch year moves the member out of the old batch" (likely fixes
   T2a-01/T6-02), `14f77687` batch Catch-ups every three months (touches T2a-*), `46d4408f` guide chapters + a
   once-only tour (T8b-13/T8b-16), `08d25d12` dialog close button (T8b-01's file?), `b5a87180` directory city
   panel (T6-*), `105e056c` Collection drop box (T4b-*), `4eddc6f7` chip colours). Run
   `git log --oneline 495ecdd2..HEAD` and `git diff --stat 495ecdd2..HEAD -- src` and hand every validator the list
   of changed files: a finding whose lines changed is re-checked, not assumed.
2. **The throwaway account is gone** (deleted 2026-09-25 by a separate session at the owner's request — note 3 below).
   Nothing to clean. A new live pass needs a NEW throwaway, deleted in the same sitting.
3. **Finish Phase 1** — relaunch, each told to read its own partial file first and continue from its Coverage:
   L7 (`reports/L7.md`, 743 lines, 8 findings; killed while fixing line numbers), L8 (`reports/L8.md`, 349 lines, 15
   headed items; check its Coverage). Prompts: `launch-prompts.md` + the L7/L8 prompts in the conversation record
   are re-derivable from `charters.md` §L7/§L8 and `leads-routed.md`.
4. **Finish Phase 2 (validation)** — model opus, ≤7 in flight, brief `brief-validator.md`, zone notes in
   `validation-zones.md` ("Zone notes as of 2026-09-27"). DONE: V-T1, V-T8, V-T5. PARTIAL (resume from the file):
   V-T2 (T2a done, T2b from T2b-01), V-T4 (stub), V-T6 (stub), V-T7a (stub). NOT STARTED: V-T3, V-T7b, V-T9,
   V-O-L1 (now includes O-07), V-L-a (L2+L3), V-L-b (L4+L10+L11), V-L-c (L5+L8), V-L-d (L6+L12+L9+L7).
5. **Phase 2c — completeness rounds** (plan below, "Completeness rounds"), until two consecutive dry rounds.
6. **Phase 3** — replace the INTERIM `bug-report-3.md` with the final report (structure: prompt §8; drafts in
   `report-draft-method.md`, `report-draft-live.md`; the ledger merge described in `findings.md`), write
   `fix-prompt.md` (campaign shape: first line /campaign; `## Campaign board`; empty `## Owner questions` +
   `## Owner answers` pointing at the report's owner section; `## Ledger`), update the README row, progress log,
   `npm run check`, commit by pathspec, no push.


**Already fixed OUTSIDE the audit, 2026-09-29/30** (the platform-health session, `docs/planning/platform-health/`).
Validators re-check these against the fix, they do not re-find them: L3-08 / L11-01 photo backup (`7f28818c` did NOT fix it — R2 refused that flag too, runs of 10-01/10-02 failed; FIXED by `a281e855`, green nightly since 10-03 per V-L-b; and
`4487283b` adds a nightly restore rehearsal); L5-02 sign-in flood rows capped at 120/hour, and L5-08's size alarm
(`e29823cb`); L5-07's backup share of egress (`4487283b`; the app's share is unmeasured); L2-01 lab rooms gate
themselves (`8d35ff4e`); O-07 every database client on verified TLS (`91c07fbc`); T2b-01 / L8-05 bounded meta parser
(`b6cbdfc0`); O-03 / T5-17 a failed session read shows the error screen, not the sign-in form (`e286daf0`); T3-01 and
T3-03 (`592e3526`). By other sessions: T3-02 (`1439c83a`), T6-02 / T2a-01 (`e49e6265`), T5-01 for bounced addresses
(`c41893f0`). L8-01 is OPEN as an owner decision (download converter; the options are in the platform handover).
Not an audit finding but the real Hobby-plan killer: link prefetching, ~18 server renders per real page view
(`19be10b0`); L5-01 had attributed the risk to the presence beacon and the proxy, which measurement did not bear out.

Audit-only session. No application code changes. Report goes to
`docs/audit-fix/2026-09-24-bug-audit-3/bug-report-3.md`, fix-prompt beside it.
Previous: audit 1 (closed 2026-08-21), audit 2 (203 findings, all dispositioned 2026-08-25).
Dedup baseline = docs/TRAPS.md + bugs.md (Open + Settled) + audit-2 fix-ledger owner-decision
leftovers (C-032 absolute session, C-012 admin reads drafts, C-138 theme per device, C-135,
C-165/166, C-186, C-112/167) + refactor-audit-2 open rows (fixes not started).

## USAGE CLIFF — 2026-09-24 03:05 BST (07:35 IST)
The Anthropic session limit fired ("You've hit your session limit · resets 7am Europe/London"). Seven finders
died mid-flight: T3, T7b, T8a, T8b, T9, L2, L3. Their partial reports are on disk (see the done-list below for
what each holds). NOT YET LAUNCHED: L4, L5, L6, L7, L8, L9, L10, L11, L12. Complete on disk: O, L1, T1, T2a,
T2b, T4a, T4b, T5, T6, T7a (10 reports, 155 findings harvested into work/candidates.md).

**A session that resumes after 07:00 London does, in this order:**
1. `git status` — the work folder is untracked; nothing else should be dirty from this audit.
2. Read this file, then `work/findings.md` (orchestrator notes + live phase), `work/candidates.md`.
3. **DONE 2026-09-25 (owner asked, audit paused): the throwaway account is DELETED.** A separate session
   removed it in one guarded SQL transaction, because the owner did not want it live for the day or more
   the pause might last. Every step of `purgeUserAccount` was checked to be a no-op for it first (no images,
   posts, comments, reports or covers; plain member of Batch of 1980, so no rehome), so the purge reduced
   to the User delete; GroupMember, AuthToken and OutboundEmail cascaded, and its LoginAttempt row and the
   owner's one ContentView of its profile were deleted with it. A scan of every text column afterwards
   found nothing naming it. No AuditLog row was written. The report drafts' "deleted through the admin
   panel's Delete for good" must be corrected to this. If the live pass resumes, create a NEW throwaway
   and delete it in the same sitting. The original note follows for the record.
   WAS: "Audit TestBird" <sanan.shankar+audit3@gmail.com>, id cmueuj6bp002hc7sg0e4yurdi,
   batch 1980, unconfirmed. Either continue the live pass with it (its password is lost with the crashed
   session — sign in via dev-login as it, or reset via Jerry) or delete it: dev-login as Jerry (admin) →
   /admin/people/cmueuj6bp002hc7sg0e4yurdi → Delete for good (typed confirmation "Audit TestBird"), then
   `SELECT count(*) FROM "User" WHERE email='sanan.shankar+audit3@gmail.com'` = 0 and check GroupMember (batch
   1980), OutboundEmail (1 queued verify row), LoginAttempt (1 ok row), AuditLog for residue. It MUST be gone
   before the closing commit.
4. Relaunch the seven killed finders. For each, the prompt is the one in this file's "Launch prompts" section
   (identical to the originals) PLUS this line: "A partial report already exists at work/reports/<ID>.md from a
   run the usage limit killed; read it first, keep every finding it holds, and continue from its Coverage
   section rather than starting over." Keep ≤6–7 in flight. Then launch L4–L12 as slots free (their charters
   are in work/charters.md; each prompt also says to read work/leads-routed.md and the reports that touch its
   question).
5. Phase 2 (validation): one validator per finder report (cluster), brief = work/brief-validator.md, verdicts to
   work/verdicts/<zone>.md. Orchestrator hand-verifications so far are in findings.md ("my own eyes").
6. Phase 3: report + fix-prompt + README row + progress log; delete TestBird; commit by name.

## Resume protocol
A fresh session that hears "continue": read this file top to bottom, then `findings.md` and
`progress.md` in this folder. Reports already on disk under `work/reports/` are DONE — never
relaunch an agent whose report exists. Verdicts under `work/verdicts/` likewise.

## Phases
- [x] Phase 0: orient. check GREEN 130/130; visual 22/25 (directory x2 + letters red: live data / cold compile, re-check letters); crawl: NAV-TIMEOUTS from /birds onward — DEV SERVER WEDGED (PID 75607, up 7.5 days, 77% CPU, /login 60s+). Not mine to restart. Live phase needs a decision. Ranking, dedup baseline, findings.md, brief-common.md, charters.md written. — gates green? dev server (PID 75607, port 3000, this checkout — not mine,
      do not kill). Read bugs.md, TRAPS.md, ledger, schema. Crawl baseline. Live DB numbers.
      Glasswing ranking. Changes since audit 2 (2026-08-25 → now).
- [~] Phase 1: finder fan-out in WAVES of ~6, each agent writes work/reports/<id>.md BEFORE returning.
      Plan: 13 territories (T1,T2a,T2b,T3,T4a,T4b,T5,T6,T7a,T7b,T8a,T8b,T9) + 12 lenses (L1..L12) = 25 finders, model fable.
      WAVE 1 launched ~06:20 IST: T2a, T1, T4a, T5, T7a, L1.
      WAVE 2 (next): T2b, T3, T4b, T6, T7b, T8a.  WAVE 3: T8b, T9, L2, L3, L4, L5.  WAVE 4: L6, L7, L8, L9, L10, L11, L12.
      Leads: work/leads-routed.md is appended as reports land; EVERY later charter prompt says 'also read work/leads-routed.md'. Running agents got theirs by SendMessage (T2a, T1, T7a, T5, T2b at 01:55 BST).
      Relaunch rule: if work/reports/<id>.md exists with a '## Coverage' section filled, do NOT relaunch; if it exists but is a stub, relaunch with 'resume from your own file'.
- [x] Phase 1b: orchestrator's own reads done: proxy.ts, prisma.ts, auth.ts, (main)/layout.tsx, tick, sweep, presence, last-seen, api-gate, stats-exclusion, email dev guard. Dev-log mining produced O-01 (letters drafts date, CONFIRMED), O-03 (DB timeout → signed out, CONFIRMED mechanism), O-02 (after/cookies, artefact, re-check live), O-04 (action fetch failure sentence). Live fact sheet in findings.md.
- [ ] Phase 2: validation — adversarial validators per locality zone → work/verdicts/. Candidate ledger: work/candidates.md (harvested from reports; re-harvest after each report; 97 at 02:45 BST from O, L1, T2a, T4a, T5 + in-progress T1, T7a). Validator brief written: work/brief-validator.md. Zones = one validator per finder report (cluster) for territories with ≤20 findings, two for larger; lens findings by locality. Orchestrator hand-verified so far: L1-01, L1-04, T4a-10, T5-01/02/03, T2a-01/02 (see findings.md).
- [~] Phase 2b: live confirmation, serialized in one browser. THROWAWAY ACCOUNT: "Audit TestBird" <sanan.shankar+audit3@gmail.com>, alumnus, joined 1968 / left 1980 / batch 1980 (a 1-member batch group, no Catch-up), signup submitted 02:21 BST (01:21:29 UTC, read with ::text) via the real /signup in chrome-devtools. DELETED 2026-09-25 (see resume step 3); was: MUST BE DELETED before the session ends: dev-login as Jerry (admin) → /admin/people → Delete for good, then SELECT to confirm no row names it (a crashed session resumes HERE first). Password is in /tmp only.
      BLNS through every text input.
- [ ] Phase 2c: completeness critic until two consecutive dry rounds.
- [ ] Phase 3: report + 2k dossier + verified-clean map + coverage map; fix-prompt.md with
      campaign board; README row; cleanup test data; commit; progress log.

## Done-list (agents whose report is on disk and complete)
- L1 (01:50 BST): 7 findings (1 M, 6 L), 20 clean checks, 12 leads. Rolling window: T2b launched in its place.
- T4a (02:05 BST): 14 findings (1 H, 5 M, 8 L), 25 clean checks, 8 leads. T3 launched.
- T5 (02:08 BST): 17 findings (4 H, 7 M, 6 L), 28 clean checks, 9 leads; O-03 confirmed as T5-17. T4b + T6 launched.
- T2a (02:20 BST): 14 findings (2 H, 6 M, 6 L), 9 leads; corrected my 'zero waiting batch editions' claim. T7b launched.
- T7a (02:50 BST): 23 findings (8 M, 2 M-L, 13 L); all routed leads dispositioned in its report. T8a launched.
- T1 (03:05 BST): 25 findings (6 M, 19 L), 14 leads; all 6 routed leads answered. T8b launched.
- T2b (02:30 BST real): 13 findings (1 H, 5 M, 7 L). T9 launched.
- T6 (02:40 BST real): 15 findings (1 H, 3 M, 11 L), 9 leads. L2 launched.
- T4b (02:50 BST real): 13 findings (4 H, 5 M, 4 L). L3 launched.
- KILLED 03:05 BST by the usage limit (partial reports on disk): T3, T7b, T8a, T8b, T9, L2, L3. Not launched: L4–L12.
- 07:50 BST: relaunched T3/T7b/T8a/T8b on fable; the owner interrupted and switched the session to Opus 5.5; those four died with it (no subagents listed, reports unchanged).
- 07:55 BST: WAVE R1 on model opus (the session's model from here on; noted for the report's coverage map): T3, T7b, T8a, T8b (resume from partials), T9 (resume), L5 (new). Queue after: L2 (resume), L3 (resume), L4, L10, L11, L6, L12, L9, L7, L8. Launch template: work/launch-prompts.md.
- 08:08 BST: validator V-T1 launched (7 in flight). Zones: work/validation-zones.md. Live pass done (work/live/blns-live.md); O-05/O-06 new; T4b-08 refuted live; T4b-13 re-ruled Low.
- 08:30 BST: T8a relaunch DONE (18 findings: 0 H, 5 M, 12 L + T8a-03 folded into T8a-02 which rises to Medium). Hand-verified T8a-11/12/13/15/16 at source; T8a-11 live (4 bells, 2 unread). Leads appended + sent to T3, T7b, L5, T8b. L2 (resume) launched in its slot. Harvest: 234 candidates (19 H, 72 M, 142 L). Harvester note: map 'Low-Medium' (T7a-09) to Medium for validation.
- 08:50-08:57 BST: T8b DONE (21: 1 H, 7 M, 13 L), T9 DONE (14: 5 M, 9 L), T3 DONE (24: 3 H, 8 M, 13 L). Launched L3 (resume), L4 (new), V-T8 (validator). Hand-verified T8b-14 (REPRODUCED offline, localhost DSN), T8b-15, T8b-17, T9-01, T9-04 (see findings.md 'second wave'). Leads appended; sent to T7b (PostHog), L5 (query counts), L2 (layout/page concurrency, reset vs retry, ChunkLoadError). ?next= sanitizer executed clean (live/blns-live.md). In flight (7): T7b, L5, V-T1, L2, L3, L4, V-T8. Queue: L10, L11, L6, L12, L9, L7, L8 + validators V-T5, V-T2, V-T4, V-T6, V-T7a, V-O-L1, V-T3, V-T7b, V-T9, V-L-a..d.
- 09:02 BST: V-T1 DONE (8 C, 13 CC, 1 down, 3 refuted, 3 new Low). L10 launched. In flight (7): T7b, L5, L2, L3, L4, V-T8, L10.
- 09:10 BST: T7b DONE (22: 5 M, 17 L) → L6 launched. 09:22 BST: L5 DONE (12: 3 Critical L5-01/02/07, 1 High L5-08, 2 M, 6 L; the full 2k dossier) → L11 launched. Criticals' plan facts verified by the orchestrator (Supabase FREE per repo; Vercel Hobby limits fetched). In flight (7): L2, L3, L4, V-T8, L10, L6, L11. Remaining lenses: L12, L9, L7, L8. Validators all but V-T1/V-T8.
- 09:40 BST: V-T8 DONE (0 refuted; T8b-14 and T8b-17 → High). V-T5 launched. O-07 (plaintext DB connection, High) written by the orchestrator at 09:31. In flight (7): L2, L3, L4, L10, L6, L11, V-T5.
- 09:47 BST: L3 DONE (8: L3-08 High — media backup failing every night since 08-29, CONFIRMED by orchestrator via gh logs; L3-01/02 Medium; 5 Low). L12 launched. In flight (7): L2, L4, L10, L6, L11, V-T5, L12. Remaining lenses: L9, L7, L8.
- **SECOND STOP — the session halted ~09:12 BST 2026-09-24 (file mtimes; my logged times ran ~35 min fast) and resumed 2026-09-27 01:57 BST on the owner's "continue".** HEAD still `495ecdd2`, tree unchanged (only the two untracked audit folders). No subagent survived. On disk and COMPLETE: L4 (18 findings), L6 (16), L10 (18; its Coverage line is a stale interim note, every section is present). PARTIAL: L2 (85 lines, 0 findings), L11 (79 lines, 2 findings), V-T5 (stub). NEVER WRITTEN: L12. Relaunched 01:58 BST on opus: L2 (resume), L11 (resume), L12 (fresh), V-T5 (resume), L9, L7, L8 (fresh). Then the validators: V-T7a, V-T2, V-T4, V-T6, V-O-L1, V-T3, V-T7b, V-T9, V-L-a..d. UPDATE 02:20 BST: TestBird was ALREADY GONE on resume (removed outside the app during the stop; no audit row) — cleanup verified by SELECT; /tmp credentials file deleted.
- 2026-09-27 02:30 BST: L2 DONE (5: L2-01 High — /lab admin gate skipped by a crafted RSC tree, PROVED by the orchestrator as Jerry; 2 M, 2 L) → V-T2 launched. 02:45: V-T5 DONE (0 refuted; T5-02/03 → Medium; T5-17 → O-03) → V-T4 launched. In flight (7): L11, L12, L9, L7, L8, V-T2, V-T4. Validators left: V-T6, V-T7a, V-T3, V-T7b, V-T9, V-O-L1, V-L-a..d.
- 03:00 BST: L12 DONE (9: 2 M, 7 L; L12-01 verified at source) → V-T6 launched. In flight (7): L11, L9, L7, L8, V-T2, V-T4, V-T6.
- 03:15 BST: L11 DONE (7: L11-01 = L3-08, 2 M, 4 L; all 88 manual migrations checked) → V-T7a launched. In flight (7): L9, L7, L8, V-T2, V-T4, V-T6, V-T7a.
- ~03:30 BST: L9 DONE (12: 1 M, 11 L) → V-T3 launched. Then the Anthropic session limit fired again (resets 06:50): L7, L8, V-T2, V-T4, V-T6, V-T7a, V-T3 all died. 21:30 BST: owner paused the audit; interim report compiled and committed (see RESUME HERE at the top).

## Completeness rounds (planned 2026-09-27 03:05 BST; launch once L7/L8/L9/L11 are on disk)
Cold-spot scan: of the Glasswing top 200, only 16 files are mentioned ≤1 time across every report and verdict —
`scripts/dev/seed-curated-content.ts` (#21, 0), `scripts/qa/phase{3,4,5,7,10}-probe.mjs`, `scripts/qa/drive.mjs`,
`_shoot.mjs`, `hover-probe.mjs`, `map-cluster-verify.mjs`, `npm-audit-gate.mjs`, `scripts/dev/tag-professions-apply.mjs`,
`src/components/admin/admin-filter-bar.tsx`, `src/components/admin/analytics/compare.tsx`, `src/app/lab/valley/_hills.tsx`,
`src/app/lab/feedback/page.lab.tsx`.
- **C1 — scripts against the one database + the cold files**: every script under `scripts/` that connects to the database or calls a live route (what it writes, whether it can touch real rows or run production jobs early, stale or broken), and the four cold `src/` files.
- **C2 — taxonomy critic + repo bloat**: read every report's Coverage/Verified-clean; list each 6a–6k row and sub-bullet with where it was applied and whether it came back clean or unexamined; investigate the thinnest five; plus the owner's standing rule 4 (repo bloat: the root, `e2e/.shots`, stale scripts and docs).
- **C3 — fresh eyes on the four hottest files** (`catchups/actions.ts`, `admin-analytics.ts`, `feed/actions.ts`, `collection/actions.ts`): new defects only, not in candidates.md.
Rule: a round is DRY when it surfaces no new Medium-or-higher finding and no new Low with teeth; two consecutive dry rounds end Phase 2c.

## Decisions for the compilation (08:34 BST)
- Status vocabulary for bug-report-3: **Confirmed** = reproduced or observed (live browser, live rows, running the real code, EXPLAIN) OR a deterministic path that an adversarial validator AND the orchestrator each re-derived from source with nothing environmental in the way — each carries an evidence tag (live / data / executed / source). **Suspected** = mechanism argued from code but dependent on timing, vendor behaviour or load that could not be safely proven; each states the proof that would settle it.
- Confirmed-member writes (posts, letters, answers, captions, contributions) stay argued from code: TestBird cannot be confirmed (AuthToken stores only a sha256 hash; the mail went to the owner's inbox), and Jerry is not a dedicated audit account.
- fix-prompt.md per the prompt §8: first line invokes /campaign; `## Campaign board`; `## Owner questions` and `## Owner answers` EMPTY (a one-line pointer to the report's owner section, which holds the five-line questions); `## Ledger` empty. work/ is committed with the report (README house rule: work/ stays while the campaign runs).
- r2.dev: settled (findings.md), not blocking.

## Errors encountered
| Error | Attempt | Resolution |
|---|---|---|
- **2026-10-23 (fourth session, Opus 5.5 orchestrator)**: launched on opus, 13 in flight: L7 (resume), L8 (resume), V-T2 (resume from T2b-01 + HEAD line on each T2a verdict), V-T4, V-T6, V-T7a (stubs → full), V-T3, V-T7b, V-T9, V-O-L1, V-L-a, V-L-b (fresh), V-DRIFT (NEW: re-rules every standing V-T1/V-T5/V-T8 finding at HEAD → verdicts/V-DRIFT.md). Queue: V-L-c (after L8), V-L-d (after L7), then C1-C3.
- 2026-10-23: V-DRIFT DONE (77 standing: 71 stand, 5 CHANGED — T5-01 → Medium suggested (c41893f0 fixed the bounce case only), T5-02 half fixed, T5-06 wider, T5-08 → Low suggested, T8b-15 matters more after e286daf0; T8b-16 MOOT-SINCE 46d4408f; O-03/T5-17 FIXED-SINCE e286daf0 for the hard-load face only — auth() still null on a stall). C1 launched.
- 2026-10-23: V-L-b DONE (21: 4 C, 15 CC, L10-01 UPGRADED to High — orchestrator CONFIRMED at source: curatePrompt/openAnswering/closeAndPublish/extendDeadline take `allowBatch` via loadKeeperEdition with no requireVerifiedMember; 54 unconfirmed accounts sit in 20 live batch Catch-ups; L11-01 FIXED-SINCE a281e855; new V-L-b-01 Low). C3 launched.
- 2026-10-23 ~13:00 BST: Anthropic session limit (reset 13:10) killed 11 agents; V-T7a and V-L-a had finished on disk first. V-T7a: 23 (3 C, 15 CC, 4 DOWNGRADED to Low — T7a-05/07/09/21, T7a-22 REFUTED, 3 new). V-L-a: 13 (L2-01 FIXED-SINCE 8d35ff4e — all 25 server lab rooms gate, gate-coverage test pins it; L3-01 FIXED-SINCE d7a8041d; L3-08 FIXED-SINCE a281e855; L3-04 MOOT/REFUTED; L2-02 REFUTED; 1 new). 23:00 BST: the other 11 resumed by SendMessage (contexts intact).
- V-T6 DONE (18: 3 C, 13 CC, T6-01 DUP of T7a-06, T6-02 FIXED-SINCE e49e6265 with a Low teacher residual; V-O-A/B/C all Low, V-O-B canonical over L6-02 for the bidi root cause; T6-15's cursor half real).
- V-T2 DONE (27: 21 confirmed, 8 downgraded, 0 refuted; T2a-01 FIXED-SINCE e49e6265, T2b-01 FIXED-SINCE b6cbdfc0; T2a-05/06/12 MOOT-SINCE eb855c71 → drop owner Q2; V-T2-01 = L10-01 door 3 (fold into L10-01, High); V-T2-02 Low; L4-01 riskier while three column-drop files are unapplied).
- V-O-L1 DONE (14: 7 confirmed, O-01 → Low, O-02/L1-05/L1-06 REFUTED, O-03 FIXED-SINCE e286daf0 hard-load face only, O-07 FIXED-SINCE 91c07fbc + Enforce SSL on since 10-08 (owner action F settled), L1-07 MOOT; L1-02 fix needs row locks; new VOL1-01 Low: scripts use rejectUnauthorized:false).
- V-T9 DONE (14: 11 confirmed, T9-05 → Low, T9-02 KNOWN (bugs.md #20 needs its diagnosis rewritten), T9-10 REFUTED (showcase off the route); T9-04 shares one fix with L7-03 + T8b-07; new VT9-01 Low: signup wings hang after a late error).
- V-T7b DONE (22: 19 confirmed, T7b-01 → Low (metric records only because the repo went public; still no actions:read), T7b-03 DUP of T3-16, T7b-12 FIXED-SINCE 19be10b0; T7b-22 fix corrected (posthog sends attr__href regardless; needs ph-no-capture); new VT7b-01 Low: no referrer recorded since the beacon, 2,540 visits).
- V-T4 DONE (30: 21 confirmed, T4a-04/06 → Low, T4b-13 → Low, T4a-08/09/T4b-08/V-T4a-B REFUTED, T4b-02 DUP T8b-01, T4a-05 FIXED-SINCE 9c992844; T4a-03's lifecycle rule "never added" per progress-2026-09 → owner check C closed, fix in-app; T4a-01 + V-T1-02 + V-T4a-A one unit in collection-intake.ts; new V-T4-01 Low). T4a-06's `.env.demo` R2-key count: the orchestrator's read was denied by permissions → stays an owner check.
- V-T3 DONE (24: 17 confirmed, T3-01/02/03 FIXED-SINCE, T3-07/20 MOOT, T3-13 KNOWN (TRAPS), 0 refuted; T3-06 wider since daec81ec (any batch member extends, no cap); new V-T3-01 Low). ORCHESTRATOR RULING on the T3-16 / T7b-03 pair: **T7b-03 canonical** (V-T3's pick; V-T7b deferred). The setCatchupPicture replaced-picture lead goes to V-L-d.
- L7 DONE (9: 4 M — L7-01/02/03/09, 5 L; L7-09 NEW voice-recorder race (Remove does not stick; mic left open); none fixed since). V-L-d launched (L6+L12+L9+L7).
- C3 DONE, NOT DRY: C3-01 Medium (closeAndPublish on a zero-answer Edition re-sets the deadline to now+3d — CONFIRMED at source by the orchestrator, actions.ts:1110-1136 + catchups-core.ts:869-881 — and the second press publishes empty), C3-02 Low (only Start is metered); extends V-L-b-01 with the four mention-bell sites. HEAD moved to 13f797bd (peer session: trivia, birds); the four hot files unchanged.
- C1 DONE, NOT DRY: C1-06 HIGH (orchestrator VERIFIED: repo is PUBLIC since ~2026-10-02 (44516525); docs/content/whatsapp-curation/picks.json names the real author in all 17 sourceNotes beside the stories published as Anonymous; this audit's own work/ folder (pushed in f32b6e02) names members) → put to the owner at once; C1-01/04/05 + more Lows. NOTHING from this audit is pushed until the owner rules on C1-06.
- OWNER RULING 2026-10-23 on C1-06: "its not that deep. can leave it public." → C1-06 is OWNER-DECLINED (recorded, not a fix row). Pushes are not held on it.
- V-L-d DONE (40: 16 C, 20 CC, L6-05 UPGRADED to Medium (link scan now on posts/letters/comments; 2.5 s per 20k letter), L9-11 → Low, L6-01 FIXED-SINCE 5164de0f; new V-L-d-01 Low = setCatchupPicture never deletes the replaced picture (one unit with L12-02)).
- L8 DONE: production is on **Vercel Pro** (not Hobby) with a $50 on-demand cap that PAUSES production → L5-01/L5-11 moot as ceilings (cost now), L8-01 Critical → Low, Hobby cron lateness moot, Fluid measured ON (T7a-05 answered). Open: L8-04 Medium (demo + prod share one budget/cap, no WAF), L8-06 Medium (Skew Protection OFF). Supabase 500 MB is now an org billing quota (re-rule L5-08). V-L-c launched; C2 launched.
- Completeness ROUND 1 = C1 + C3, NOT DRY. ROUND 2 = C2 (taxonomy critic + bloat) + C4 (NEW: the server/auth/write code written after 495ecdd2 — c41893f0, d7a8041d, dcad8dd8, 9e6721df, trivia gate, 44b20a91, ad390fd0, 70e4a0c6, 6c84c602). Round 3 only if round 2 is not dry.
- OWNER 2026-10-23: VS Code at 5 GB → "chill out". C4 STOPPED (relaunch fresh when V-L-c or C2 finishes; its prompt is the C4 entry in launch-prompts.md / this file). From here: at most ~3 agents in flight.
- C2 DONE. ORCHESTRATOR RULING: C2-01 (R2 client has no deadline) is a plain Low — needs an R2 stall never yet recorded; teeth not shown → C2 is DRY. Owner action noted: 'sanan's stuff/recovery-codes.txt' sits inside the working tree (ignored, unread) — move it out. C4 relaunched fresh (V-L-c + C4 in flight).
- V-L-c DONE (22: L5-01/L5-11 MOOT (Vercel Pro since 2026-09-21), L5-02 Crit→Med (DB half FIXED e29823cb; Upstash exhaustion remains → one WAF rule closes it and L8-04), L5-07 Crit→High (backup half FIXED 4487283b) = the FIRST organic limit (Supabase egress; ~700-3,200 members depending on activity), L5-08 → Low, L5-03 → Low fold T1-17, L5-12 REFUTED, L8-05 FIXED; new V-L-c-01: vercel metrics now 'Observability Plus required' and team API says billing.plan hobby with an expired subscription → OWNER CHECK Settings → Billing). Only C4 in flight.
- 2026-10-24: ledger compiled by /tmp/ba3/ledger.py (+ ledger-overrides.json = orchestrator rulings) → ledger-final.json: 371 findings, 321 open (8 H, 79 M, 234 L), all assigned to phases A–N by /tmp/ba3/phases.py (logic restated in compile/phase-names when the fix-prompt is written). Compile writers launched: compile/entries-A-F.md and compile/entries-G-M.md (brief: compile/brief-compile.md). In flight: C4 + 2 writers. Next: V-C validator over C1–C4's findings, then a round-3 critic if round 2 is dry, then assembly.
- C4 DONE, NOT DRY (C4-01 Medium: trivia gate log floodable anonymously — 600 rows/h site-wide, kept a year, ~2.5 GB steady state; C4-02 Medium: after 'Use another email' the banner reports the OLD address's bounce against the new one; C4-03 Low with teeth: claimAndSend sends to a stale 'to'; C4-04 Low: rv_trivia_id cookie missing from privacy page). ROUND 2 = C2 (dry) + C4 (not dry) → NOT DRY. Round 3 planned: C5 = every anonymous write surface + the mail/confirmation state machine end to end (the two seams rounds 1-2 kept hitting). V-C (validator over C1-C4) launched.
- Writers DONE: compile/entries-A-F.md (51) and entries-G-M.md (35). ORCHESTRATOR RULINGS: environmental-dependence rows stay Suspected (L7-02, T3-11, T8a-02, T9-03, L5-04, L5-07, L7-03, T9-04, L11-05, T5-10) per the status rule; T5-06 follows V-DRIFT (dcad8dd8 widened it); L5-07 is OWNER-DEFERRED (platform handover item 14, 2026-10-08: revisit before ~1,000 members) — no new question; owner questions final at Q1-Q17 (compile/owner-questions.md); writers cited the INTERIM numbering → remap at assembly (draft→final: 1→1, 3→2, 4→3, 5→4, 6→5, 10→6, 11→7, 13→8, 14→9, 15→10, 16→11, 17→12). C5 (round 3) + V-C in flight.
- V-C DONE (16: 8 C, 6 CC, C2-02 DUP of T6-03, 0 refuted; C4-01 arithmetic re-derived (2.55 GB/yr at cap, alarm ~32 d, read-only ~50 d; nothing upstream bounds it; 5th false promise gate-coverage.test.mjs:42); C4-02 both triggers hold; C4-03 → fold into C4-02's fix; C2-01 fix direction unsafe as written (needs a purge-worklist row before moving deletes to after()); C1-05 confirmed (only RESTRICT FK + 30 s timeout are accidental brakes)).
- C5 DONE, NOT DRY (C5-01 M image optimizer accepts any query string → ~1.1M requests reach the $50 cap; C5-02 M reset mail drains the day's budget; C5-03 M trivia answers public on origin/main + 'egg' contains-match; C5-04/05 Low). ORCHESTRATOR verified C5-01 (next.config.ts:382-386 + match-remote-pattern.js:46-50) and C5-03 (trivia-bank.ts on origin/main f8ef67a2; judge :277) at source; C5-02 from the constants. New owner Q18. ROUND 3 NOT DRY. Round 4 = C6: what a SIGNED-IN member (any stage) can make the server write/send/spend — the authenticated twin of C5's anonymous table.
- OWNER 2026-10-24: "you can run up to 5 agents parallel" (memory updated). ROUND 4 = C6 (signed-in member abuse) + C7a (cold top-ranked files, compile/cold-files.md §A) + C7b (new files since the base nobody named, §B) + C8 (lifecycle cascades matrix). 4 in flight. Round 4's findings need validating before they count; round 5 only if round 4 is not dry.
- C6 DONE, NOT DRY (5 Medium, all abuse-by-a-member class: C6-01 resend + deletion-request mail drains the day's budget; C6-02 bells to everyone via unmetered edits + rename re-rings; C6-03 never-confirmed account writes 20k drafts every 10 s, kept for ever; C6-04 SearchLog no per-member ceiling; C6-05 unmetered reads spend Supabase egress). Lead with teeth verified by the orchestrator at source → filed as **O-08** (Medium, reports/O.md): roster auto-verify on name + batch year verifies a stranger as a real classmate, no already-claimed check; 119 members office_list-verified. New owner Q19.
- ORCHESTRATOR RULING 2026-10-24: **O-09 filed** (reports/O.md) as the CLASS 'nothing bounds what one account or one script may spend of what everyone shares' (13 instances: C4-01 C5-01 C5-02 C6-01..05 L5-02 L8-04 T2a-03 T2b-02 C3-02). From here a new instance of the class is an EXTENSION of O-09, not a new finding, so it does not make a round un-dry. New phase **O** (budgets), run order A B O E F D C G H J I K L M N; C4-01/C5-02/C6-01 stay in G (shared files) and apply O's helper. V-R4a (C6 + O-08) launched; C7a, C7b, C8 still in flight.
- C7b DONE, thin: 8 Lows (C7b-01..03 trivia gate client → G; C7b-04..07 trivia admin room → I; C7b-08 links wrapping <Button> → N). C7b-05 (Accept truncates to 120 so the accepted answer matches nothing) is a Low with teeth.
- V-R4a DONE (C6-01..05 all stand, 0 refuted; **O-08 UPGRADED to High**: Stage 1 reads every name + batch year from the directory / users-by-batch, copies one, and is verified as that classmate; no admin notice, no claimed-roster record, 81 copyable identities). O-08 moved to Phase A (renamed: Trust).
- C7a DONE, NOT DRY: C7a-03 Medium (profile autosave: a refused field stays on screen under a wrong 'Saved'; → K), C7a-01 Low (river tile stale after a mid-list edit; → E), C7a-02 Low (crop dialog never resets; → F), C7a-04 Low (navigator cap inverted; → H). ROUND 4 NOT DRY (C6 + C7a).
- C8 DONE, NOT DRY (C8-01 M optimizer copies of deleted photos live a year (Suspected); C8-02 M admin takedown leaves a post's photos public, 3 live (orchestrator confirmed adminHidePost sets isHidden only); C8-03 M no takedown for a Catch-up answer; 6 Lows). **OWNER 2026-10-24 on the stop rule: "close now. i'll run the huge fix session separately."** → no more rounds; the two-dry-rounds rule was NOT met and the report says so; C8's rows are marked not adversarially validated (V-R4b covers C7a/C7b and is the last agent). The fix campaign is NOT run in this session.

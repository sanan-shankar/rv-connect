# Third pre-release bug & stability audit — task plan (2026-09-24)

## >>> RESUME HERE — THIRD STOP, 2026-09-27 ~21:30 BST (owner paused the audit for usage) <<<
The owner stopped the audit mid-validation to save usage and will resume in a NEW session. An INTERIM
compilation of everything found so far is `../bug-report-3.md` (committed with this folder). A session told to
"continue the bug audit" does this, in order:
1. **Re-baseline.** The audit read the code at `70570bcd`. HEAD moved while it was paused (at the stop: `60b8fc16`,
   seven commits — `ac70bd9d` "a changed batch year moves the member out of the old batch" (likely fixes
   T2a-01/T6-02), `9ef7d821` batch Catch-ups every three months (touches T2a-*), `81bb7d11` guide chapters + a
   once-only tour (T8b-13/T8b-16), `ca85e424` dialog close button (T8b-01's file?), `1b6e5fd3` directory city
   panel (T6-*), `bda5571c` Collection drop box (T4b-*), `60b8fc16` chip colours). Run
   `git log --oneline 70570bcd..HEAD` and `git diff --stat 70570bcd..HEAD -- src` and hand every validator the list
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
Validators re-check these against the fix, they do not re-find them: L3-08 / L11-01 photo backup (`5b891c92`, and
`0cdfcaa3` adds a nightly restore rehearsal); L5-02 sign-in flood rows capped at 120/hour, and L5-08's size alarm
(`ddae0afb`); L5-07's backup share of egress (`0cdfcaa3`; the app's share is unmeasured); L2-01 lab rooms gate
themselves (`0dd607b1`); O-07 every database client on verified TLS (`25a9c231`); T2b-01 / L8-05 bounded meta parser
(`47023cd2`); O-03 / T5-17 a failed session read shows the error screen, not the sign-in form (`79024643`); T3-01 and
T3-03 (`65049ebc`). By other sessions: T3-02 (`1619d6af`), T6-02 / T2a-01 (`ac70bd9d`), T5-01 for bounced addresses
(`8000e830`). L8-01 is OPEN as an owner decision (download converter; the options are in the platform handover).
Not an audit finding but the real Hobby-plan killer: link prefetching, ~18 server renders per real page view
(`c5fee5b4`); L5-01 had attributed the risk to the presence beacon and the proxy, which measurement did not bear out.

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
- **SECOND STOP — the session halted ~09:12 BST 2026-09-24 (file mtimes; my logged times ran ~35 min fast) and resumed 2026-09-27 01:57 BST on the owner's "continue".** HEAD still `70570bcd`, tree unchanged (only the two untracked audit folders). No subagent survived. On disk and COMPLETE: L4 (18 findings), L6 (16), L10 (18; its Coverage line is a stale interim note, every section is present). PARTIAL: L2 (85 lines, 0 findings), L11 (79 lines, 2 findings), V-T5 (stub). NEVER WRITTEN: L12. Relaunched 01:58 BST on opus: L2 (resume), L11 (resume), L12 (fresh), V-T5 (resume), L9, L7, L8 (fresh). Then the validators: V-T7a, V-T2, V-T4, V-T6, V-O-L1, V-T3, V-T7b, V-T9, V-L-a..d. UPDATE 02:20 BST: TestBird was ALREADY GONE on resume (removed outside the app during the stop; no audit row) — cleanup verified by SELECT; /tmp credentials file deleted.
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

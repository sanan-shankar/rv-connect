# Audit session progress log

## Session 2026-08-21 (bug & stability audit, audit-only)

### Done
- Phase 0-2: oriented (bugs.md, pipeline doc, schema, prisma.ts, auth.ts, rate-limit.ts, proxy.ts),
  green baseline (check: only the other session's WIP TS error; crawl 17 routes all 200 clean),
  Glasswing territory+lens partition.
- Phase 3 wave 1: 26-agent workflow (wf_a3eccac4-718). 22 completed (304 candidate findings:
  4 Critical, 53 High, 141 Medium, 106 Low; 285 confirmed-in-code, 19 suspected). 4 lens agents
  (input-validation, react-client, chaos, vercel-limits) hit the 5-hour usage cap; RESUMED from
  cache (only those 4 re-run) — in progress.
- Extracted all 22 agent reports to docs/planning/audits/wave1/*.json; ledger at
  wave1-ledger.tsv; full-object map at wave1-fullmap.json.
- Orchestrator dedup cluster map (25 clusters) in findings.md.
- Live read-only DB proofs: CL-2 email-case affects 1 of 52 real members TODAY (backfill safe,
  0 dup-lower pairs); volumes tiny pre-launch; CL-7 latent (0 dup batch groups yet).
- Personally verified top cluster CL-1 (Critical cascade), CL-2, CL-3, CL-6 in code.

### Update 2 (mid-session)
- All 26 finders done (355 findings). Consolidated → 44 canonical C/H. Validation wave
  (wf_2d7f31fa-fb2) done: 44/44 verdicts. Final: 2 Critical, 22 High, 18 Medium, 2 Low; B-050
  downgraded via split-verdict resolution; 0 dropped. Verdicts in verdicts.json,
  final-severities.json.
- Live proofs: email-case 1/52 affected; directory NaN does NOT crash (200, refutes 3 finders);
  0 malformed-JSON rows (latent). All read-only.
- Report ASSEMBLED: docs/planning/audits/bug-report.md (1005 lines) from _report_header.md +
  _findings_section.md + _medium_section.md (68 roots) + _low_section.md (117) + _report_footer.md
  (dossier + clean map + coverage). Pending: fold in completeness-critic net-new findings.
- Completeness critic round 1 running (agent a1ab429106d43c36e).

### Next (resume-safe; see task_plan.md resume protocol)
- Await 4 lens agents (resume wf_a3eccac4-718). Then consolidate 304 → canonical B-IDs.
- Validation wave: 1 refuter per canonical Critical/High; Medium/Low orchestrator-reviewed.
- Phase 4 live repro where safe (single browser / run-sql reads / verify-shot). BLNS fuzz on
  signup+login+profile+post+comment+search via one browser.
- Completeness rounds → report → cleanup test data → commit report + progress.

### Scariest so far (pre-validation)
1. CL-1 Group-creator cascade: first batch member / Catch-up initiator deleting their account
   cascade-destroys the whole batch group or whole Catch-up incl. every other member's answers.
   Contradicts schema's own "nullable so the Catch-up survives if they leave" comment. CRITICAL.
2. CL-6/W1-224 email queue: transient Resend failure permanently fails mail; deletion-scheduled
   kind can never be sent at all.
3. CL-2 email case: 1 real member already cannot reset their password; one mailbox can register
   twice.
4. CL-13 missing FK indexes: like/comment/poll/photo-love counts full-scan at every feed/grid load.
5. CL-3 IST dates: every server-rendered date wrong for 00:00-05:30 IST content, sitewide.

### COMPLETE (session end)
- All 26 finders + 44 validators + 2 completeness rounds done. R2 fully dry (netNewFindings [];
  admin worklist / multi-keeper / admission-stamp all clean). B-201 (AdminThread flag lost-update)
  confirmed trivial, already captured.
- FINAL: 45 canonical (2C/22H/17M/4L) + 68 Medium roots + 117 Low appendix. B-094 refuted->dossier.
- Report: docs/planning/audits/bug-report.md (1061 lines, §1 exec / §2 phased plan / §3 findings /
  §4 2000-user dossier + k6 / §5 verified-clean / §6 coverage).
- No test data created (read-only audit); verified no stray audit account. Tree clean.
- Committing report + evidence to main. NOT pushing (push = deploy; owner must approve).

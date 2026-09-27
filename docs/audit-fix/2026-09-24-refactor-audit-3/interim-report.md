# Refactor audit 3 — interim report (PAUSED, not finished)

**Paused 2026-09-27 by the owner, for usage.** The audit ran from the prompt in
`docs/audit-fix/prompts/refactor-audit-prompt.md`, started 2026-09-24. Fourteen of its twenty-eight planned
readings are complete; this file compiles them so nothing is lost if the audit is never resumed. When the audit
finishes, `report.md` and `fix-prompt.md` replace this file.

**How far to trust it.** Every finding below comes from an agent report. I (the orchestrator) re-checked two to
three claims per report against the code at HEAD, and every one held, apart from small corrections logged in
`work/findings.md`. **No adversarial verification has run yet.** At audit 2, 54 % of findings carried a wrong detail
once verified, almost always a moved line range. So: trust a finding, re-derive its lines.

## How to resume (in a new session)

Say: *"@docs/audit-fix/2026-09-24-refactor-audit-3/work/task_plan.md continue refactor audit 3"*. The plan lists what
is done, the fourteen readings still to run, how to launch them, and the compile steps that follow. Everything the
orchestrator decided is in `work/findings.md`; nothing depends on the old session's memory.

## Baseline (measured 2026-09-24, tree `70570bcd`)

| Measure | Now | At audit 2 (2026-09-03) |
|---|---|---|
| Tracked files / weight | 1,632 files, 44.90 MB | 1,252 files, 32.19 MB |
| Code lines, whole repo (cloc) | 286,820 | 199,028 |
| Production build, warm, quiet machine | 68.2 s (compile 18.5, TypeScript 20.6, new cache compaction 12.1) | 42.3 s |
| `npm run check` | green, 130 test files | green, 102 test files |
| Shipped first-load JavaScript, median | 985 KB raw / 315 KB gzip | 1,069 KB raw |
| Heaviest shipped route | `/profile/[id]` 1,240 KB | 1,258 KB |
| Stylesheet on every page | 171,870 B raw / 26,544 B gzip | 238,434 B raw |
| Copy-paste duplication (jscpd, src + scripts, tests excluded) | 325 clones, 2.44 % | 232 clones, 1.82 % |
| Unused files / exports / types (knip, repo config + lab pages) | 7 / 187 / 30 | 7 / 70 / 11 |
| Real import cycles | 1 | 0 |
| Dependencies | 32 runtime + 17 dev; 854 lockfile packages | 33 + 18; 1,082 |
| Live database | 41 tables, 128 indexes, 13 with zero scans since 2026-05-22 | — |

Raw output for every number is in `work/raw/`. Type coverage could not run; its real cause is recorded in
`work/task_plan.md`.

## The fourteen readings

| Report | Findings | T1 | T2 | T3 | T4 | Needs you |
|---|---|---|---|---|---|---|
| catchups-ui | 35 | 7 | 23 | 4 | 1 | 4 |
| fresh-code | 22 | 9 | 9 | 3 | 1 | 4 |
| collection-media | 24 | 7 | 13 | 4 | 0 | 0 |
| catchups-lib | 21 | 3 | 10 | 5 | 3 | 7 |
| feed-posts-comments | 24 | 8 | 9 | 5 | 2 | 3 |
| admin-analytics | 24 | 6 | 13 | 2 | 3 | 3 |
| auth-onboarding-settings | 23 | 9 | 12 | 2 | 0 | 0 |
| directory-profile | 17 | 5 | 9 | 3 | 0 | 1 |
| common-primitives | 16 | 8 | 6 | 2 | 0 | 2 |
| lab-rest | 16 | 7 | 5 | 0 | 4 | 5 |
| landing-mascot-avatars | 15 | 8 | 5 | 2 | 0 | 1 |
| lab-catchups | 15 | 5 | 7 | 3 | 0 | 0 |
| bundle-build | 11 | 1 | 7 | 1 | 2 | 2 |
| tracked-weight | 11 | 4 | 5 | 1 | 1 | 3 |
| **Total** | **274** | **87** | **133** | **37** | **17** | **35** |

The full list, one line per finding, is `work/compile/findings-table.md`. Each finding's evidence, steps and
safety gate are in its report under `work/agents/`.

## The biggest things found so far

1. **Every server function carries the whole `public/` folder.** The local-disk branch of `src/lib/storage.ts` joins
   the working directory with `"public"`, so Next's file tracer ships every picture into every function. I counted
   162 `public/` files in the `/feed` trace. One tracing-exclude line removes it (bundle-build-01).
2. **Three Catch-up cover photographs are half of the repo's growth.** They are 1.6 to 3.3 MB each at 4,608 pixels.
   No screen shows more than about 2,360 pixels, and the picture chooser draws all three raw, so it is a 6.8 MB
   download. Re-exporting them at 2,560 pixels saves about 4.5 MB (tracked-weight-01, bundle-build-04).
3. **The magazine's test examples are 18,632 lines of hand-expanded JSON**, 43 % of all JSON in the repo. As small
   builders they would be about 2,500 lines, proved identical by a deep-equality check (lab-catchups-01).
4. **Two Catch-up controls lost their doors in the 9 September rebuild.** The settings "Picture" row opens nothing,
   and a Keeper can no longer copy an invite link. The spec describes both, so these are regressions to restore, not
   code to delete (catchups-ui-01, -02).
5. **Queries every page pays for.**
   - Each signed-in page loads every live Catch-up with its Editions to learn that nothing is due (catchups-lib-02).
   - The feed fetches its first page after the page arrives (feed-posts-comments-01).
   - A profile save renders the page twice (directory-profile-01).
   - The Collection's first page runs three queries one after another (collection-media-02).
6. **Admin-only code reaches members.** The admin rail, the moderation dialog and the profile's admin box are in
   member bundles (admin-analytics-01 to -03).
7. **Answers the owner gave in audit 2 never shipped.** There are still three help-bubble machines where he chose one
   (Q7). The Collection's fallback upload still shrinks photographs, which his Q6 answer ended. Four more audit-2 rows
   fell out of that plan (common-primitives-02, collection-media-04, auth-onboarding-settings carry-overs).
8. **One sign-in fact changes a settled item.** Next 16 runs the proxy on Node.js, not the edge, so the proxy can
   import the demo's closed-route list and its mirrored copy can go. This re-opens audit 1's "honesty check" with new
   evidence. It touches the demo's security layers, so it gets the hardest verification (auth-onboarding-settings-02).

## Rulings already made where reports disagreed

These are in `work/findings.md` with the evidence.
- **The Catch-up picture chooser is kept and reconnected, not deleted.** Spec §6 describes the feature.
- **The old song code is removed now; its database columns go at the owner's next release.** Spec §16 already plans
  both.
- **The magazine engine stays in `src/lib`.** The rework's board has its build as an open phase.
- **The Catch-ups "almost ready" screen stays.** It protects deploys that land before a new table does, and the
  rework kept it on purpose. fresh-code-04 is overruled.
- **`photo-suggest.ts` is not an orphan.** The photo-tagging scripts import it.
- **The covers go to 2,560 pixels, not 3,840.**

## Bugs found on the way (not simplification; for `docs/planning/bugs.md`)

- **Collection quotas.** The contribute pop-up is capped by the other half's quota (collection-media-07). "Add to
  the Collection" counts both halves and does not exempt admins (-09).
- **Admin.** The admin counts store never compares photographs (admin-analytics-06). "Hide the post" settles the
  report even when hiding fails (-14).
- **Catch-ups.** The advance runs before the membership check. A member who corrects their batch year stays in both
  batch groups. The export script never creates `audio/` (catchups-lib, "For other lenses").
- **Lab.** The lab's archive action lets a dev server write production's lab state without sign-in (lab-catchups-09).
  `/lab/constructor` returns 500 instead of 404 (lab-rest).
- **Buttons.** The press on the shared Button jumps instead of easing since Tailwind v4 (common-primitives, owner
  question B).
- **Email.** The email-confirmation page says "Sent to …" even when the day's mail budget is spent
  (auth-onboarding-settings-06).

## Questions that will go to the owner (not asked yet)

Thirty-five findings need the owner. Each report's "Owner decisions" section drafts them in the five-line format. The
notes on how they merge, and the defaults chosen where drafts disagree, are in `work/findings.md` under
"Owner-question merge notes". The main themes:
- the three built-but-hidden Catch-up features (voice, vote, time capsule);
- the invite link;
- the lab rooms whose designs went live;
- the magazine;
- the admin tools on member profiles;
- what a finished design campaign keeps.

The campaign's first gate asks them all at once.

## What is left

- **Fourteen readings to run.** Shell and UI, letters and messages, write paths, the data layer, core library and
  config, tests, scripts and CI, the database schema and demo seed, dead code, duplication, docs, the root folder
  and `CLAUDE.md`, dependencies, and runtime performance. Six of these were stopped mid-work at the pause. A new
  session relaunches them fresh; old agents cannot be resumed across sessions.
- **Adversarial verification, then two consecutive dry completeness rounds.**
- **`report.md`, `fix-prompt.md` (the `/campaign` handover), and the audits README row.**

## Outside this audit, found at close-out

**The September session history was overwritten.** Commit `9ef7d821` (2026-09-27) replaced
`docs/history/progress-2026-09.md` with its own entry, deleting 8,363 lines, and each commit since has done the same.
**Fixed the same day at the owner's request:** the 287 entries are back, the seven written since are appended,
and the progress-log test now checks both directions, so an overwrite fails `npm run check`. Details: `work/findings.md`, ORCH-01.

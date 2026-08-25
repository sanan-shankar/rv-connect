# Completeness critic ROUND 2 (critic-2)

Date: 2026-08-25. Read-only. Inputs: all 18 agents/*.md "For other lenses" sections (re-read
independently), simplification-report.md (457 lines, post-repair), findings-index.json (241
ids), findings.md (MERGES/CONFLICTS), critic-1.md, plus fresh greps at HEAD for every claim
I repeat below. My only write is this file.

**Verdict: NOT DRY.** Round 1's repair landed cleanly (11/11 verified, §A). But round 1
tested only the "For other lenses" channel. Testing the sibling channel — indexed findings
vs the report — finds a second drop: after expanding every slash-list and the `landing-…`
ellipsis, **37 of 241 finding ids are never named in the report**; 22 are legitimately
merged (verified per item, §B2), but **~15 executable findings are absent by id AND by
content**, including **two owner decisions missing from §4**. §3's sentence "Section 2
above is the deduplicated execution ordering of all of them" is false as written. Plus one
new verified FOL casualty round 1 also missed (§C).

---

## A. Round-1 repair check — all 11 landed (verified in the file)

1. zod → zod/v4 unify — report:139 (Phase 1b hygiene row) ✓
2. @types/node 20 → 24 — report:139 ✓
3. SECURITY.md probe range {4..10}→{3..10} — report:139 ✓
4. OPERATIONS missing snapshot.yml section — report:139 ✓
5. vitals.vercel-insights.com CSP drop — report:139 ✓ (landed in Phase 1b, not in Owner
   decision 7 as critic-1 suggested; acceptable — arguably stronger, it drops either way)
6. "no cron" comment in FIVE files — report:150 (Phase 2 stale-comment row) ✓
7. loadThreadWindow shared for the two thread pages — report:182 (Phase 4 admin row) ✓
8. transition-[colors,transform] 14-file sweep — report:183 ✓
9. collection/directory first-page server-render option — report:205 (Phase 5) ✓
10. landing webps rider + bugs.md #2 on Owner decision 1 — report:307-309 ✓
11. Two bug leads (question-section raw body; masthead timeZone) — report:285-291 ✓

One repair omission: critic-1 G1.6's `settings/actions.ts:324-328` hasBudget+consume FYI
was not restored and is disposed nowhere. FYI-grade; listed in §C.

## B. The new hole (G9): the index→report channel

Method: parse findings-index.json (241 ids; tier math 94+110+30+7=241 ✓), expand every id
list in the report ("admin-analytics-04/05/08/09/11/12/13", "landing-…-05/06/07",
"duplication-02 (+ -20)"), diff. 37 ids unnamed. Each then checked at the CONTENT level
(keyword greps: passwordHash, ContentView, PERSON_SELECT, freeTags, cuid2, barrel,
MIN_PASSWORD, houses-editor, leaf, mascot.md, misfiled … all 0 hits in the report) and
against the rows' cited entries for subsumption. findings.md/task_plan.md contain no
deliberate-exclusion rule and never mention these ids.

### B1. Absent by id AND content — material (each verified in its agent entry)

1. **§4 is missing two owner decisions**:
   - **member-surfaces-12** — legacy Collection taxonomy (`subject`/`freeTags`) plumbing;
     T2, Decides: owner (one DB count → ~55-65 lines).
   - **shell-primitives' "Collection filter row vs sentence line"** (its Owner decisions
     section) — Collection still on ActiveFilterChips/ResultCount while Directory + both
     admin lists use the lab-picked sentence line; ~80 lines of kept double-kit and a
     member-visible inconsistency. §4 claims to be the whole owner conversation; it isn't.
2. **data-layer-08** — profile/[id]/page.tsx:111-114 `include` without `select` fetches all
   44 User scalars incl. the password hash on the most-visited page; one-line `omit` fix.
   T2 autonomous, security-adjacent. Nowhere in the report.
3. **admin-analytics-03** — ContentView/FacesView each run loadPeople's 13 queries for one
   integer; RhythmsView fetches 4 heavy unread lists. ~24+ dropped queries/view on a
   force-dynamic page hitting Mumbai. T2 autonomous. Nowhere.
4. **directory-profile-09 = duplication-16** — directory person type declared 3-4× +
   PERSON_SELECT 2× (~40-65 lines). NOT subsumed: data-layer-05 (the Phase 3 selects row)
   explicitly says "the directory keeps its own PERSON_SELECT/PIN_SELECT". Nowhere.
5. **directory-profile-04 residue** — the report (via dead-code-09) deletes only
   seedHouseYearRows + restoreAllYearRows; the rest of the dead year-row library
   (HouseYearRow, groupHouseYearEntries, missingYears, ~50 lines) is proven dead and
   uncovered. §3's "house-spans.test.mjs empties" correction dangles without it.
6. **dependency-diet-14** — cuid2 → crypto.randomUUID at 12 sites; −1 dep (+1 transitive).
   §1b's "−7 now" count silently excludes it.
7. **shell-primitives-10** — replace the filters barrel with direct imports (12 lines +
   client KB on 4 routes). Also the unanswered receiver of duplication's FOL barrel note.
8. **auth-edge-13** — MIN_PASSWORD spelled at 7 sites + the gaze clamp at 7; shared
   constants (~10 lines; the password floor becomes one number).
9. **dependency-diet-16** — puppeteer downloads ~130MB Chrome locally per major
   (skipDownload is Vercel-only); its playwright-core note also never answered by scripts.

### B2. Absent by id, small but real (T1 autonomous)

shell-primitives-12 (dead `leaf` Button alias, 6 lines — its keep-reason, the held-off
catchups rebuild, has landed); directory-profile-10 (sort-control stub + tile pair,
~6-18); directory-profile-06 (profile-avatar.tsx relocate, lab-only importer);
landing-mascot-avatars-10 (misfiled sidebar test — named in findings.md's MERGES list as
"sidebar-test rename x2" yet no report row); landing-mascot-avatars-09 (mascot.md's stale
bell-delivery section — content absent; the Phase 1b docs row cites only root-docs ids);
lib-tests-04/05/07 (test-hygiene batch, escapeLike one-home, tour-verify trim).

### B3. Verified as legitimately merged/represented (do not re-litigate)

De-export ×6 fragments (admin-analytics-07, catchups-13, directory-profile-07,
landing-…-11, lib-core-config-06, shell-primitives-15) live in dead-code-10/11's triage
table, which the Phase 1a row cites; catchups-06's four view-model types are in
dead-code-11 (verified by name); data-layer-09 (isRecordNotFound) is inside dead-code-09;
dead-code-16 = the /donate row (member-surfaces-08 + decision 16); auth-edge-15 = decision
16's tooltip canon; root-docs-assets-15 = decision 16's duplicated tables;
scripts-e2e-ci-09 = §7 + §1b disk row; admin-analytics-06's content is §5's "worklist pair
… merged in phase 4" (id missing from the P4 row — bookkeeping only); catchups-14,
shell-primitives-11, feed-posts-10/15, member-surfaces-10, bundle-build-09, data-layer-07,
scripts-e2e-ci-03 etc. all present inside slash-lists. Appendix-grade T3/T4 fairly left in
agent reports: catchups-05, dead-code-12, dead-code-17, dependency-diet-17,
scripts-e2e-ci-10 (though the last — baselines write 17MB of git history per rebaseline —
would sit well in §4).

## C. Independent FOL re-sweep (all 18 files, every distinct item)

Round 1's six restorations verified (§A). Sweeping the tails again independently:

**New verified casualty**: admin-analytics FOL → data-layer: **Visit.timezone/lat/lng are
written by last-seen.ts (:36-38, :80-81) and read by nothing** (verified at HEAD: every
src lat/lng reader is Place/UserPlace; loadPresence selects city/country only).
data-layer.md never mentions them; data-layer-03's five dead columns don't include them.
Three write-only columns missing from the Phase 6 owner conversation.

**Dropped, small**: catchups → join flow: `catchups/join/page.tsx` inlines the shell
`join/[token]/page.tsx:172-186` defines (~15 lines); feed-posts → messages/catchups:
`message-composer.tsx:74` + `photo-attachments.tsx:85` hand-roll the `/api/upload` fetch
loop (no receiving finding exists); duplication → shell-primitives: the FadeSlide motion
primitive (~15 sites × 4 lines) — no uptake, no rejection; member-surfaces →
lib-core-config: the privacy-page retention-numbers drift test — no uptake; auth-edge →
member-surfaces: the hasBudget FYI (§A note).

**Undisposed but below threshold** (one §5/§6 line each would close them):
messages/actions.ts internal micro-clones (2×~8 lines); snapshot.mjs's ~10 unread metric
keys (the confirm request was never answered; flagger leaned "deliberate accumulation");
lab `type/_fonts.ts` ten Google fonts, some unimported (lab never answered); bundle-build's
Connection:close/dev-CSP TRAPS.md suggestion; not-found.tsx's prefers-reduced-motion vs
the house motion rule (a design call, not a simplification); lib-tests' three-text-cutters
convergence question (functions are genuinely distinct); root-docs' QA-screenshots-as-webp
idea (the §7 retention rule bounds the cost anyway); directory-profile's "settings/ folder
name is historical" note.

**Answered or covered — verified, no action**: writePlaces (P4 places-transaction row);
filters-toolbar merge (directory-profile confirmed the kit is imported, not re-implemented);
GroupMember question (feed-posts: live as the Catch-up privacy container); advanceDueCatchups
per-page-view cost (carried by bug-report-2.md — the right audit); admin catchups title
fallback (named inside catchups-11's entry); catchups-11/12, maskEmail re-export,
avatars.md banner, lab-audit hardcode, posthog-rewrites comment, unattended-rule path pin,
db-indexes coordination (each rides its cited entry); EMAIL_UNVERIFIED/VerifiedViewer
(dead-code table lines 690/739); users-by-batch clone (§5 "three search endpoints stay
three"); everything else in the 18 tails traces to a plan row, §4/§5/§7, or §1 as marked.
I also disposed of duplication's open question myself: **admin-profile-tools.tsx is live**
(imported and rendered at profile/[id]/page.tsx:11 and :403) — not dead code.

## D. Fresh probe: §1b arithmetic vs the phase tables

- Phase 1a rows sum ~2,007-2,042 vs the header's "~1,800" and §1b's "dead ~1,800" —
  conservative, fine. P3 (783) + P4 (1,845) ≈ 2,628 vs "dedupe ~2,300" — over-delivers
  (some P4 rows are scripts/mechanism lines). All-phase sum ≈ 5,476 vs the claimed
  −4,500..−5,500 — consistent at the top of the range. Index tier math 94+110+30+7=241 ✓.
  The ~15 missing findings would add roughly +300-400 lines, −1 dep, and the query wins —
  the ranges survive their inclusion, so §1b needs no rewrite beyond the dep count note.

## Repair (one compilation pass, ~1 hour, then a round 3)

1. Add plan rows for B1 items 2-9 and B2 (mostly Phase 1a/3/4 one-liners; cuid2 into the
   Phase 1b dep row, +1 to the "−7" count).
2. Add the two missing §4 owner decisions (member-surfaces-12; Collection filter-row
   migration) and the Visit.timezone/lat/lng columns to decision 4's list.
3. Sweep §C's dropped/undisposed tail: a row, a §5 line, or a named "consciously dropped"
   each — the same discipline critic-1 asked for on the FOL channel, applied to its tail.
4. Reword §3's "execution ordering of all of them" to match reality — or make it true.

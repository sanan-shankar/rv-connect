# Completeness critic ROUND 3 (critic-3) — closing check

Date: 2026-08-25. Read-only. Inputs: simplification-report.md (477 lines, post-round-2
repair), critic-2.md (its own lists, item by item), findings-index.json (241 ids, tier math
94+110+30+7=241 ✓), findings.md (MERGES/CONFLICTS), the agent entries for every row I
spot-audited, prisma/schema.prisma for one field name. My only write is this file.

**Verdict: DRY. The audit closes.**

Round 2's repair landed in full: every named missing finding has a row with its id in a
sensible phase, both missing owner decisions are in §4, the Visit columns are in the
phase-6 row, §3's false sentence is rewritten true, and the small tail has its row. My
independent 241-id diff finds **zero unaccounted absences and zero phantom ids**. Three
spot-audited new rows are faithful to their agent entries — one of them (shell-primitives-10)
is *more* precise than critic-2's own summary. Four cosmetic residues are logged below for
the fix sessions; none is a dropped finding, a missing decision, a wrong phase, or a wrong
row figure, so none blocks closure.

---

## 1. Round-2 repair verified item by item (critic-2's own lists)

### B1 material — all present
| critic-2 item | Where it landed | Faithful? |
|---|---|---|
| §4: member-surfaces-12 (legacy Collection taxonomy) | §4 decision 16 — one SELECT, zero rows → ~60 lines | ✓ id cited |
| §4: Collection filter row vs sentence line | §4 decision 17 — ~80 lines, member-visible, owner schedules | ✓ (shell-primitives owner note) |
| data-layer-08 (profile fetches password hash) | Phase 3 row, `omit: { password: true }`, "defence-in-depth", gate "open a profile" | ✓ — field name checked against schema.prisma:14 (`password String?`); the omit line is the agent entry's own prescription (data-layer.md:389-391) |
| admin-analytics-03 (analytics over-querying) | Phase 4 admin row: "~24 unread queries per analytics view (countMembers(); split loadPresence)", id in the slash-list | ✓ figure and fix match the entry |
| directory-profile-09 = duplication-16 (person type ×3-4, PERSON_SELECT ×2) | Phase 3 selects row, "(explicitly outside data-layer-05's scope)" — directly answers critic-2's non-subsumption point | ✓ |
| directory-profile-04 residue (full year-row library) | Phase 1a own row, "directory-profile-04 ⊃ dead-code-09's two", ~117 incl. test — un-dangles §3's house-spans.test correction | ✓ |
| dependency-diet-14 (cuid2 → randomUUID) | Phase 6 row, "1 dep", "(quiet-moment item, not pre-launch)" | ✓ — placed deferred rather than critic-2's suggested Phase 1b; defensible scheduling (touching upload/receipt id generation pre-launch buys nothing), and §1b's "(+1–2 owner)" now brackets it (see residue 2) |
| shell-primitives-10 (filters barrel) | Phase 5 row, "4 importers go direct… a few KB on 3 routes" | ✓ — matches the entry verbatim (savings land on the two admin routes + Collection; the 4th importer /directory keeps its bytes). Critic-2's "4 routes" was the looser claim |
| auth-edge-13 (MIN_PASSWORD ×7 + gaze clamp) | Phase 3 row, "~10 + one floor" | ✓ |
| dependency-diet-16 (puppeteer skipDownload) | Phase 1b row, "~130 MB local per major" | ✓ verbatim |

### B2 small-but-real — all present
shell-primitives-12 (leaf alias) → Phase 1a sweep row ✓; directory-profile-06/10 → Phase
1a row (profile-avatar relocate + sort-stub/tile) ✓; landing-mascot-avatars-10 → Phase 3
"misfiled sidebar test rename" ✓; landing-mascot-avatars-09 → Phase 2 stale-comment row ✓;
lib-tests-04/05/07 → inside "lib-tests-01..07" with the content named (spelling-pin trim,
escapeLike one-home, tour-mobile pin trim, hygiene trio) ✓.

### The rest of the repair spec
- **Visit.timezone/lat/lng**: in the phase-6 row, named in backticks, credited "critic-2's
  find". ✓ (Decision-4/§1b counts not bumped — residue 1.)
- **§3 sentence**: "execution ordering of all of them" is gone; the replacement ("named in
  a row, folded into a named programme, listed in §4/§5, or recorded as below-threshold in
  verify/critic-2.md §C") is **true per my own diff** (§2 below). ✓
- **Small-tail row** (Phase 4, take-or-leave): catchups join-page shell ~15;
  message-composer/photo-attachments shared upload fetch; FadeSlide primitive; privacy-page
  retention drift-test — all four of critic-2 §C's material dropped items. ✓

## 2. Independent diff: 241 ids vs the report

Method: script-expanded every id form in the report — slash-lists
(admin-analytics-03/04/05/08/09/11/12/13), the `lib-tests-01..07` range, `=` merges, `⊃`,
the `landing-…` ellipsis, `duplication-24.7`, and the `duplication-02 (+ -20)` shorthand —
then diffed against the index. **223 of 241 ids are named. 18 are not. All 18 are exactly
critic-2 §B3's verified merged/appendix list**, each with a content-level home:

- **6 de-export fragments** (admin-analytics-07, catchups-13, directory-profile-07,
  landing-mascot-avatars-11, lib-core-config-06, shell-primitives-15) → inside the
  dead-code-10/11 triage table, which the Phase 1a de-export row cites.
- **catchups-06** (view-model types) → in dead-code-11 by name; **data-layer-09**
  (isRecordNotFound) → inside dead-code-09's row.
- **dead-code-16** = the /donate row (member-surfaces-08) + §4.18's redirect
  recommendation; **auth-edge-15** = §4.18's tooltip canon; **root-docs-assets-15** =
  §4.18's duplicated-tables call.
- **scripts-e2e-ci-09** → §7.5 + §1b's disk row; **admin-analytics-06** → §5's "worklist
  pair … merged in phase 4".
- **Appendix-grade T3/T4, fairly left in their agent reports** (per critic-2 B3):
  catchups-05, dead-code-12, dead-code-17, dependency-diet-17, scripts-e2e-ci-10.

Zero phantom ids (nothing in the report cites an id the index lacks). Zero absences
outside the B3 list. The index→report channel is closed.

## 3. Spot-audit of repair quality (3 new rows + 1 rider)

1. **data-layer-08** (Phase 3): the `omit: { password: true }` spelling is correct — the
   schema field is `password`, not passwordHash (critic-2's prose said "password hash";
   the report used the real column). Saving "defence-in-depth" = the entry's "0 lines
   (adds one); defence-in-depth only". Phase 3 is right for a one-line lib-level query fix.
2. **shell-primitives-10** (Phase 5): "4 importers… 3 routes" matches the entry exactly;
   Phase 5 (bundle) is the right home for a KB-motivated barrel deletion. Gate names
   /directory and /collection; the two admin routes are exercised by the Phase 4 admin
   row's gate anyway.
3. **admin-analytics-03** (folded into the Phase 4 admin row): the ~24-query figure and
   the countMembers()/split-loadPresence fix are the entry's own; Phase 4 admin is where
   every other admin-analytics item lives. Correct.
4. **dependency-diet-16** (Phase 1b): 130MB figure verbatim; its playwright-core aside
   rides in the full entry, which the row's id points at.

## 4. Cosmetic residue — for the fix sessions, not for another round

1. **Column-count drift (one word ×3)**: with Visit.timezone/lat/lng added, the cleanup
   migration drops **8** columns, but §1b ("−5 columns"), §1c and §4 decision 4 ("five
   dead columns") still say five. The phase-6 row is self-annotating and the phase is
   owner-gated, so the owner conversation walks the rows — but decision 4 should say
   "eight (five dead + three write-only Visit)" when phase 6 is briefed.
2. **§1b dep bracket**: "(+1–2 owner)" now under-brackets the recommended-yes owner
   removals (adapter +1, cuid2 +1, Vercel Analytics per decision 7 +1 → +2–3, +4 if xlsx
   dies). Critic-2 §D pre-blessed the ranges as surviving inclusion; "+2–3" would be truer.
3. **Pre-existing double-cite** (pre-repair; inside critic-2 §D's blessed arithmetic):
   landing-mascot-avatars-05/06/07 appear in BOTH Phase 1a rows ("small-dead sweep ~306"
   and "dead flags ~100"), double-citing ~65 lines between the two rows; the phase
   header's conservative "~1,800" absorbs it, and a fix session cannot delete twice. The
   repair also appended shell-primitives-12 (+6) to the ~306 row without re-summing —
   inside the "~". Suggest: drop the landing ids from the sweep row when phase 1a runs.
4. **hasBudget FYI** (critic-1 G1.6): still no report row; disposed by critic-2's own
   downgrade to FYI-grade (§A note + §C record), which §3 now references. Acceptable
   as-is.

## 5. Verdict

**DRY.** Both drop channels ("For other lenses" — round 1; index→report — round 2) are
closed and verified closed by independent re-derivation, the owner-decision surface is
complete, the §3 coverage claim is now true, and the sampled repair rows are faithful to
their sources. The four residues above are one-word or bookkeeping polish a fix session
absorbs in passing; none changes what the owner is asked to decide or what a session
executes. The audit closes; per §7.4, archive to
`docs/audit-fix/2026-08-simplification/` when the fixes finish.

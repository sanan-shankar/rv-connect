# v-dead-symbols - verification notes

Verifier: adversarial re-grep of every DELETE / DE-EXPORT claim in the cluster, at HEAD
`c74d99f` (2026-08-25 14:49, "feat(admin): a non-admin who asks for /admin is told 'nice try'").
Working tree clean apart from the audit's own untracked files, so tree == HEAD.

Method: every symbol each finding declares dead or internal-only was re-grepped with word
boundaries (`grep -rEow "\bSYM\b"`) across `src`, `scripts`, `e2e`, `prisma`, `.github`, `docs`
(ts/tsx/mjs/js/md/yml/json/sql/prisma), excluding `src/generated` and the audit's own output
under `docs/planning/audits/simplification/`. Every ambiguous hit was opened and classified
comment vs code. Staleness focus: the same-day commits 730f1c6 (ninety-day sessions + admin
Catch-up route), 6d5609e (admin reading room), 1d3f996 (admin header circle), c74d99f (nice-try
page) are all IN the tree I grepped, so any caller they added would have surfaced. None did.

## Verdict table (detail below)

| finding | verdict |
|---|---|
| member-surfaces-01 | confirmed |
| member-surfaces-11 | confirmed-with-correction (3 callers of setThemePreference, not 2) |
| catchups-01 | confirmed |
| catchups-06 | confirmed |
| catchups-13 | confirmed |
| admin-analytics-01 | confirmed |
| admin-analytics-02 | confirmed |
| admin-analytics-07 | confirmed |
| shell-primitives-01 | confirmed |
| shell-primitives-02 | confirmed |
| shell-primitives-03 | confirmed |
| shell-primitives-12 | confirmed |
| landing-mascot-avatars-01 | confirmed |
| landing-mascot-avatars-05 | confirmed |
| landing-mascot-avatars-06 | confirmed |
| landing-mascot-avatars-07 | confirmed |
| landing-mascot-avatars-11 | confirmed |
| dead-code-01 | confirmed |
| dead-code-02 | confirmed |
| dead-code-03 | confirmed |
| dead-code-04 | confirmed |
| dead-code-05 | confirmed |
| dead-code-09 | confirmed-with-correction (drop the CONTRIBUTION_STATUSES/canBecomePaid pair; second slice-boundary trap) |
| dead-code-15 | confirmed-with-correction (AdminSectionDef is NOT deletable) |
| directory-profile-04 | confirmed-with-correction (test file left empty; line drift) |
| directory-profile-07 | confirmed |
| auth-edge-09 | confirmed |
| auth-edge-10 | confirmed |
| lab-02 | confirmed |

## The adjudication the charter asked for: CONTRIBUTION_STATUSES / canBecomePaid

dead-code-09 says delete both + trim `contribution-state.test.mjs`; member-surfaces-11 says
keep both as the tested spec. **member-surfaces-11 is right, on two independent grounds:**

1. `CONTRIBUTION_STATUSES` is not even export-dead: `contribution-state.ts:30` derives
   `ContributionStatus` from it (`(typeof CONTRIBUTION_STATUSES)[number]`), and that type
   constrains `PAYABLE_FROM` and `REVERSED_STATUSES` via `satisfies readonly
   ContributionStatus[]`. Deleting it breaks the module. dead-code-09's premise ("in-file
   self-count shows no internal caller") is factually wrong for this symbol.
2. `canBecomePaid` has no production caller (grep: def at :42 + nine test references only),
   but the test that consumes it is the pinned spec of the C-084/C-085 payment state machine:
   `canBecomePaid("refunded") === false` etc. is the assertion form of "a re-delivered
   payment.captured cannot resurrect a refunded gift", and the second test iterates
   `CONTRIBUTION_STATUSES` to force any FUTURE status to declare which side of the transition
   it is on ("s belongs to neither side of the transition"). The brief (section 3) binds every
   proposal to keep the pinned security tests green. Deleting the function and trimming those
   blocks deletes the exhaustiveness guard, not just a dead wrapper. Keep both; list under
   not-findings so no future audit re-litigates.

## Per-finding evidence

### member-surfaces-01 / dead-code-01 - updateUserProfile — CONFIRMED
- Def at `src/components/settings/actions.ts:26`, closing brace at :139 (next export
  `updateUserPlaces` at :147). Range claim exact.
- All 4 external textual matches are comments: `profile-actions.ts:8`, `utils.ts:468`,
  `validators.ts:102`, `validators.ts:128`. Zero call sites. Commit 871d553
  (settings/onboarding/uploads, 13:03 today) did not add a caller.
- Stranded-import claim precise at symbol level: `profileSchema` (:78), `batchTypeFromLeaving`
  (:93), `normalizePhone` (:110) are used only inside :26-139. Fixer note: TRIM lines 17-18,
  do not delete them — `valleyDayKey` (:355), `VALLEY_TIME_ZONE` (:370), `titleCase`
  (:98-100 inside the dying fn but ALSO :158 inside live `updateUserPlaces`) survive.
  Both findings already say "verify with eslint" / name only the three symbols, so this is a
  fixer note, not a correction.

### member-surfaces-11 — CONFIRMED-WITH-CORRECTION
- `razorpayConfigured`: 1 hit total = def (`razorpay.ts:42`). Dead.
- `SUBJECT_VALUES` / `AREA_VALUES`: 1 hit each = defs (`collection.ts:40-41`). Dead.
- `setTheme` -> `setThemePreference` rename: nothing imports `setTheme` from theme-actions
  (all other `setTheme` hits are unrelated locals in lab pages and next-themes' hook).
- CORRECTION: there are THREE importers of `setThemePreference`, not "both callers":
  `lights-on.tsx:11`, `dark-gauntlet.tsx:29`, and `src/app/(main)/dark-mode/page.tsx:19`.
  All three already use the surviving name, so the plan is unchanged; the count was wrong.
- Its keep-verdict on CONTRIBUTION_STATUSES/canBecomePaid is correct (above).

### catchups-01 / dead-code-02 - createCatchup path — CONFIRMED
- `\bcreateCatchup\b` non-def hits at HEAD: `components/auth/actions.ts:233` (comment),
  `scripts/qa/audit-status.mjs:613` (audit-history probe description string),
  `docs/spec/catchups.md:846,856` (WP history). Zero callers; not resurrected by 730f1c6 or
  6d5609e (the admin Catch-up route work).
- `seedPromptSchema` (:115) and `createCatchupSchema` (:120) referenced only at :123 and :356,
  both inside the dying block.
- `suggestSeedPrompts`: def `catchups.ts:300`; only consumers `catchups.test.mjs:46` (import)
  and :684-690 (its one test). The "trim the test import + block" instruction is exactly right
  and is the orphan-check the charter asked about: verified nothing else in the test file uses it.

### catchups-06 — CONFIRMED
- `CatchupRoundSection` (:154, used only by `CatchupRoundView` :174 which is itself dead),
  `CatchupRoundView`, `CatchupViewerRole`, `CatchupArchiveRow`: zero refs outside
  catchups-types.ts.
- `NotifyBaseCtx`: 5 hits, all inside catchups-types.ts (:222 def, :231/:236/:241/:262 uses)
  — de-export, exactly as proposed.
- `AnswerAsker`: the one external-looking hit, `catchups.test.mjs:736`, is inside a block
  comment ("A type declaration reads `asker: AnswerAsker | null;`"). Internal use at
  answer/types.ts:37 is handled by the finding's replace-with-`CatchupPersonRef` step.
- `MAX_ACCEPTED_PROMPTS_PER_EDITION` home/types.ts:41: zero consumers; actions.ts has its own
  local at :95 (used :123, :153, :919). Dead copy confirmed.

### catchups-13 — CONFIRMED
- All seven (`ANSWER_WINDOW_DAYS`, `PREPARING_HOLD_HOURS`, `EXTEND_DAYS`, `STATUS_ORDER`,
  `dueReminder`, `shouldExtendForNoQuestions`, `questionsExtendPatch`): a single grep across
  src/scripts/e2e excluding `src/lib/catchups.ts` returns ZERO hits — no test, no admin room,
  no script. Internal uses exist (e.g. STATUS_ORDER :450-453, dueReminder :736/:1098), which
  is fine: the proposal is de-export only. Line numbers all match HEAD.

### admin-analytics-01 / dead-code-05 - loadSupport, Metric, Slice — CONFIRMED
- `loadSupport` def at :279; only other hit is an old audit JSON. The analytics page's import
  block (page.tsx:4-24) names 18 loaders, not it.
- Importers of `@/lib/admin-analytics` at HEAD: page.tsx (values) + `compare.tsx` (MemberRow),
  `presence.tsx` (Presence), `cohort.tsx` (JourneyRow), `stat.tsx` (Trend). Nobody imports
  `Metric` or `Slice`, and neither is used inside the lib (only def lines :27/:37; :13 is a
  comment about MetricSnapshot). `Trend` and the row types are live and untouched by the
  proposal. Both findings agree; dead-code-05's cross-check note (prefer dedupe if the two
  support surfaces disagree) is sensible but nothing calls this one at HEAD.

### admin-analytics-02 - eight fetched-but-never-rendered fields — CONFIRMED
- Positive control works (`catchups.people` page.tsx:427, `mail.sent` :655).
- `mail.` usage at HEAD: sent, delivered, deliveryRate, bounced, queued, complained, byKind —
  never `mail.failed`. `searches.` usage: total, empty, top, byScope — never `searches.recent`.
  `catchups.` usage: entries, answersPerPrompt, people, loves — never `.series`, `.editions`,
  `.byEdition`. `byHouse`, `photoLoves`: zero hits in page.tsx and components/admin/analytics/.
- The two `recent` hits that look like counter-evidence are other loaders: `p.recent` (:143)
  is loadPresence's, `r.recent` (:242) is a retention row.

### admin-analytics-07 - dead exports batch across admin libs — CONFIRMED
- `ADMIN_SECTIONS`: def-only (admin-nav.ts:129). (But see dead-code-15 for AdminSectionDef.)
- `THREAD_KINDS` (:16-17 def only), `ThreadKind` (1 hit), `ComposerKind` (1 hit): dead.
- `MAX_SUBJECT_LENGTH`: def :24 + internal :90 — de-export, as proposed.
- `isUploadedImageUrl` re-export (admin-threads-server.ts:11): every consumer
  (upload-ownership.ts:1) imports from `@/lib/upload-shared`. Dead line.
- `worklistCounts`: def admin.ts:240, called internally by `loadAdminCounts` (:189-193) —
  de-export, as proposed. `PER_QUEUE`: 8 internal uses in admin-worklist-query.ts — de-export.

### shell-primitives-01 - shadcn kit sub-primitives — CONFIRMED
- All 23 named symbols (11 DropdownMenu* incl. Portal/Group/Label/Sub/SubTrigger/SubContent/
  CheckboxItem/RadioGroup/RadioItem/Separator/Shortcut, ComboboxIcon/Clear/Collection,
  SelectGroup/Label/Separator, CardAction, CardFooter, SheetFooter, SheetDescription,
  DialogClose, PopoverClose): ZERO references outside `src/components/ui/` across src, e2e,
  scripts, tests at HEAD — including the brand-new admin header circle (1d3f996) and nice-try
  page (c74d99f).
- Internal-use caveats verified at exact lines: SelectScrollUp/DownButton used inside
  SelectContent (select.tsx:112,118); DialogOverlay+DialogPortal inside DialogContent
  (dialog.tsx:60-61); DropdownMenuContent calls `MenuPrimitive.Portal` directly (:38), so the
  wrapper is fully dead. dropdown-menu.tsx is 315 lines as claimed.
- NOTE for the report writer: dead-code-12 (not in this cluster) reaches the opposite
  recommendation for the same 27 knip lines (keep-as-class, owner call). Facts on both sides
  agree (all dead today); the orchestrator must pick one policy.

### shell-primitives-02 / dead-code-03 - ui/badge.tsx, ui/tabs.tsx — CONFIRMED
- Zero importers of `ui/badge` or `ui/tabs` anywhere in src/e2e/scripts. `badgeVariants` and
  `tabsListVariants` referenced only inside their own files. 56 + 90 = 146 lines, as claimed.

### shell-primitives-03 / dead-code-04 - utils.ts dead trio — CONFIRMED
- `pickAvatarColor`: only hit in code is its def (utils.ts:200); all other matches are
  docs (ROADMAP, avatars spec). `AVATAR_COLORS` (:195) feeds only pickAvatarColor (:201).
- `formatBatch`: def :204; the four src matches (`letters/page.tsx:211`,
  `admin-person-row.tsx:37`, `directory-module.tsx:67`, `utils.ts:415`) are ALL comments —
  I read each line; every one is prose explaining why `batchLine` is used INSTEAD.
  `batch-line.test.mjs` imports only `{ batchLine, metaLine }` (:4); its two formatBatch
  mentions are comments.
- `computeBatchFromSchooling` + `BatchComputation`: hits only at utils.ts:386 (pointer
  comment), :493 (type), :522/:526 (def). Dead.

### shell-primitives-12 - the leaf Button variant — CONFIRMED
- `variant="leaf"` / `variant: "leaf"`: zero call sites in all of src (lab included). Only
  hits in button.tsx are the alias def (:78) and its own comments. The Catch-ups rebuild the
  alias waited for has shipped; the migration is complete.

### landing-mascot-avatars-01 - USE_V2 legacy path — CONFIRMED
- `const USE_V2 = true;` at bird-avatar.tsx:16; the `if (USE_V2)` early return at :682 covers
  every render; the legacy path (birdFor at :705, poseTransform/BIRD_POSE_COUNT at :612) is
  unreachable, and the file's own comment (:707-710) admits the legacy species index "is
  approximate for that dead path". `birdFor`/`BIRD_POSE_COUNT` imports (:4,:6) are used only
  by the dead path. Only other USE_V2 hits: a comment in bird-avatar-v2.tsx:34 and the avatars
  spec — the spec (docs/spec/avatars.md:8) must be updated with the change.

### landing-mascot-avatars-05 - tour enabled flag — CONFIRMED
- tour-steps.ts at HEAD: exactly four stops, all `enabled: true`; no Groups entry anywhere in
  the file; banner comment :12 still claims a reserved `enabled: false` slot that does not
  exist. `ENABLED_TOUR_STOPS` (:112) is an identity filter; sole consumer tour-provider.tsx
  (:26,:116), exactly as the finding maps.

### landing-mascot-avatars-06 - flight speed plumbing — CONFIRMED
- `speed?` field's own doc says "unused by any current launcher"; the only launcher in the
  repo is landing-hero.tsx:223, which passes `{ from, target }`. `normalizeFlightSpeed`: 4
  hits, all inside the two mascot-flight files being trimmed. No other launchFlight caller.

### landing-mascot-avatars-07 - bindPassword — CONFIRMED
- 7 hits: impl (hoopoe.tsx:1002), api entry (:1156), interface (hoopoe-kit.ts:176), the
  triple-hit wrapper line (use-hoopoe.ts:62), spec doc (mascot.md:53). Zero call sites.
  login-client/reset-client drive coverEyes/peek/gaze directly.

### landing-mascot-avatars-11 - de-export sweep — CONFIRMED
- `archeTransform`: def :87 + internal :1794 only. `ARCHETYPE_COUNT`: def-only (1 hit).
- `DRAWN_SPECIES_COUNT`: internal to avatar.ts (:66 def, :130/:132 uses).
- `SPECIES_PINS`: avatar.ts internal (:86,:134); the bird-avatar.tsx:22 hit is a doc comment.
- `fnv1a`: avatar.ts internal (:140,:165); avatar.test.mjs defines its OWN `function fnv1a`
  copy (:29) — de-export does not touch the test.
- `AUTH_PANEL_VW`: hero-photo.ts internal (:7 comment, :23 def, :26 use).

### dead-code-09 — CONFIRMED-WITH-CORRECTION
- Confirmed dead-with-test-only-consumer: `socialIcon` (def :26; normalize.test.mjs:71 hit is
  a slice-boundary STRING, spec mention is prose), `socialHost` (def :54; the only live users
  of social.ts are profile/[id]/page.tsx importing socialHref/socialDisplay/parseUserLinks),
  `isRecordNotFound` (def + prisma-errors.test.mjs only), `seedHouseYearRows` (def + test +
  one comment in house-chain-editor.tsx:120), `restoreAllYearRows` (def only, zero refs),
  `formatBatch` (see shell-primitives-03).
- CORRECTION 1 (drop a pair): the CONTRIBUTION_STATUSES/canBecomePaid item is wrong — see the
  adjudication section. CONTRIBUTION_STATUSES has an internal caller at contribution-state.ts:30
  and the test blocks are the pinned C-084/C-085 spec. member-surfaces-11's keep wins.
- CORRECTION 2 (a second trap): the finding flags normalize.test.mjs:71's
  `indexOf("export function socialIcon")` end boundary, but line :72 ALSO uses
  `indexOf("export function socialHost")` as the end boundary of the socialDisplay slice.
  Deleting both functions breaks BOTH slices (indexOf -> -1 -> slice(start,-1) silently
  truncates). Repoint both boundaries (end-of-file works for both) in the same commit.
- Lucide-import note verified: Instagram/Linkedin/Facebook/Globe/ExternalLink/LucideIcon in
  social.ts:1 are used only by socialIcon; the whole import line dies with it. The
  `instagramHandle` import at :2 STAYS (socialHref/socialDisplay use it).

### dead-code-15 — CONFIRMED-WITH-CORRECTION
- Confirmed def-only/dead at HEAD: admin-threads-server.ts:11 re-export; member-gate.ts:30 and
  email-verification.ts:29 re-exports (all four consumers import the sentinels from the
  `*-gate-message` files directly — verified list); social.ts:9 re-export; auth.ts:380
  signIn/signOut narrowing (zero importers; only `auth` and `handlers` consumed, checked
  after 730f1c6 touched auth.ts today); ADMIN_SECTIONS; razorpayConfigured; reportSchema
  (def-only at validators.ts:283); MAX_ACCEPTED home copy; directorySortOptions +
  directoryDefaultSort (def-only; SORT_OPTIONS internal); MAIL_DAILY_CAP (def-only,
  email-queue.ts:840); isAliasedPlaceId (def-only); pickAvatarColor; SUBJECT_VALUES /
  AREA_VALUES; HousesChain (def + a comment in house-spans.ts:6); EASE_POP in hoopoe-kit.ts:34
  (def-only — every consumer imports motion.tsx's copy); the `parallel` step constructor +
  union member + player branch (hoopoe-kit.ts:127,:130, hoopoe.tsx:1144-1145; zero builders
  anywhere); ARCHETYPE_COUNT; the `import * as React` lines in combobox.tsx:3 / popover.tsx:3
  (zero `React.` uses in either file); devLoginContext (def-only).
- CORRECTION: "`ADMIN_SECTIONS` (self=1) + `AdminSectionDef` (:31). Delete both" is wrong on
  the second half. `AdminSectionDef` is used at admin-nav.ts:43 — `AdminNavGroup.sections:
  AdminSectionDef[]` — and AdminNavGroup types the live ADMIN_NAV. Delete ADMIN_SECTIONS
  (:129) only; AdminSectionDef stays (de-export at most, if nothing imports it — it IS part of
  the exported AdminNavGroup shape, so leaving it exported is simplest).

### directory-profile-04 — CONFIRMED-WITH-CORRECTION
- The dead set is right: `HouseYearRow`, `groupHouseYearEntries` (only caller is
  seedHouseYearRows :89), `seedHouseYearRows`, `missingYears` (the _findings.ts:241 hit is a
  prose string quoting the deleted settings-form), `restoreAllYearRows` (zero refs). The live
  survivors (`HouseSpan`, `academicSpanLabel`, `parseHouseYearEntries`, `parseHouseSpans`)
  have 14 importers and are untouched by the proposal.
- CORRECTION 1 (line drift): at HEAD the defs sit at :18 (HouseYearRow), :40
  (groupHouseYearEntries), :84 (seedHouseYearRows), :112 (missingYears), :135
  (restoreAllYearRows) — a few lines past the ranges in the finding. Re-locate by name.
- CORRECTION 2 (the test file): house-spans.test.mjs is 33 lines and ALL THREE tests are
  seedHouseYearRows pins; "shrinking rather than deleting" leaves a test file with zero tests
  (and a then-unused academicSpanLabel import). Either write a small academicSpanLabel /
  parseHouseSpans test to keep the file honest, or delete the file and adjust the C-190/C-195
  floor deliberately — an empty test-shaped file is exactly what that gate exists to catch.

### directory-profile-07 — CONFIRMED
- `HousesChain`: def houses-chain.tsx:759 + one comment (house-spans.ts:6). Zero callers;
  shipped profile uses HouseTrail. `SORT_OPTIONS`/`directorySortOptions`/
  `directoryDefaultSort`: internal/def-only. `isAliasedPlaceId`: def-only.
  `instagramHandle` re-export social.ts:9: sole external importer (profile-actions.ts:23)
  uses `@/lib/normalize`. socialIcon/socialHost: see dead-code-09 (incl. the :72 slice trap).

### auth-edge-09 — CONFIRMED (all seven, at HEAD, post-730f1c6)
- signIn/signOut: `export const { handlers, signIn, signOut } = nextAuth;` still at auth.ts:380;
  zero importers of either from `@/lib/auth` (checked every `from "@/lib/auth"` line — only
  `auth` and `handlers`). reportSchema: def-only. EMAIL_UNVERIFIED/MEMBER_UNVERIFIED
  re-exports: all consumers (verification-actions.ts:6, verify-email-dialog.tsx:14-15,
  member-gate.ts:3-4, email-verification.ts:3) import the message files directly.
  VerifiedViewer: internal (:31 def, :39 use). tryRosterAutoVerify: only caller is
  tryRosterAutoVerifyQuietly in the same file (:99). EMAIL_MAX: internal (:32 def, :43 use).

### auth-edge-10 — CONFIRMED
- `"signin.success"` / `"signin.fail"`: only hits in src/scripts/e2e are the union members
  (audit.ts:21-22) and the file's own header doc (:10). No writeAudit call and no filter
  string anywhere; sign-ins go through recordLoginAttempt.

### lab-02 — CONFIRMED
- The import lists of all `_second-look-kit` consumers (craft, spine, houses, everything,
  directory, tiles, type, support, chain-lines) never name `T`, `PROSE`, `CODE`, `ROOMS`,
  `useToggles`; the only occurrences of the five in the repo are their defs (:36,:45,:47,:61,
  :607) — no internal use inside the kit either. `Room` dies with `ROOMS`. In `_kit.tsx`,
  `AmbientLayer` (:123) and `RouteLink` are def-only. One footnote: docs/content/DELIGHT.md
  mentions AmbientLayer six times as a described pattern — prose only, no code breakage, but
  the fixer may want a line noting the helper is gone.

## Cross-cluster notes for the orchestrator
- shell-primitives-01 (delete kit sub-parts) vs dead-code-12 (keep-as-class, owner call) is a
  genuine policy conflict over the same 27 knip lines; both agents' facts check out.
- Duplicate coverage is consistent everywhere else: member-surfaces-01 == dead-code-01,
  catchups-01 == dead-code-02, shell-primitives-02 == dead-code-03, admin-analytics-01 ⊃
  dead-code-05, and dead-code-15 overlaps member-surfaces-11 / auth-edge-09 /
  directory-profile-07 / lab-02 items — one fix session should dedupe by symbol, not by id.
- Docs that reference deleted symbols and should be touched in the same commits:
  docs/spec/avatars.md:8 (USE_V2), docs/spec/mascot.md:53 (bindPassword),
  docs/spec/profile.md:436 (socialIcon).

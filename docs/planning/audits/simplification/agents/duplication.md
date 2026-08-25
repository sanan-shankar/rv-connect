# duplication - simplification audit report

Cross-cutting duplication lens for the pre-release simplification audit. Two inputs: the 275
token-level clones in `raw/jscpd.txt` (3,819 duplicated lines, 2.74%) plus the 12 in
`raw/jscpd-tests.txt`, and a semantic hunt over the named suspect pairs (two avatar renderers,
the letterhead transplant, lab-vs-shipped families, the server-action preambles, the small lib
twins). Every clone was triaged into: (a) real duplication to unify, (b) deliberate decoupling
to keep, (c) framework boilerplate a shared piece could still collapse, or (d) noise. Date:
2026-08-25. Files in territory: the 613 files jscpd scanned plus every file a clone or suspect
names; opened and read at the relevant ranges: ~70 files; read fully: ~25 (the small suspects,
the guard libs, the moment components, the rail modules, the message files).

## Coverage

- Read fully: `src/lib/call-action.ts`, `src/lib/member-gate.ts`, `src/lib/admin.ts`,
  `src/lib/prisma-errors.ts`, `src/lib/onboarding-local.ts`, `src/lib/tour-local.ts`,
  `src/components/mascot/moments/one-shot.ts`, the three empty-state hoopoes,
  `src/components/feed/rail/*`, the five `*-message.ts` files, `src/lib/test-fn-body.mjs`
  (head), `src/components/common/confirm-dialog.tsx` (usage census), both `bird-avatar` file
  heads and the full structure map of v1, `src/components/letters/letter-desk.tsx`,
  `src/app/api/users-by-batch/route.ts`, the letters/new loading pair.
- Read at the cloned ranges (the jscpd triage): `(main)/catchups/actions.ts` (7 windows),
  `(main)/feed/actions.ts` (5 windows), `(main)/collection/actions.ts`,
  `(main)/messages/actions.ts`, `(main)/admin/people/actions.ts` vs
  `components/settings/actions.ts`, `components/posts/report-action.ts`,
  `login-client`/`signup-client`/`auth-panel`/`forgot`/`reset`, the upload and cron API routes,
  the admin list components, `post-feed` vs `profile-author-feed`, `post-card` vs
  `letter-engagement`, `image-viewer`, `hoopoe.tsx`, `perching-birds`, the onboarding steps,
  `house-picker` vs `house-chain-editor`, the directory person-type trio, `validators.ts`,
  `utils.ts`, `avatar.ts` vs `wordle.ts`, `email-verification.ts`, `_archive-state.ts` vs
  `catchups.ts`, `email-templates.ts`, `catchups-notify.ts`, the catchup page loaders, the
  admin/member message pages, the qa probes and their `_probe-kit.mjs`, the rule-test preambles.
- Skimmed with a similarity measure instead of a line-read (lab variant galleries, judged as
  design history per the brief): `lab/profiles/_variant-letterhead*(-2,-3)`, `lab/landings/_variant-*`,
  `lab/directory/*`, `lab/chain-lines`, `lab/profiles/_chain-*`, `lab/composer/_variants.tsx`,
  `lab/eggs`, `lab/mascot-moments`, `lab/support-ideas`. Shared-line counts are in the findings.
- Not read: the interiors of the five landing lab variants and the four chain lab variants
  beyond their clone windows (classified lab-record by policy; nothing shipped imports them -
  verified `rg 'from "@/app/lab'` over shipped code returns nothing).
- Uncommitted edits seen: none. `git status --short` at audit time showed only this audit's own
  files. The WIP my charter warned about (next.config.ts, src/lib/admin.ts, phase7-probe.mjs,
  manual-tour-entry.test.mjs, forbidden.tsx) has since been committed (src/lib/admin.ts as read
  matches HEAD); I judged the files as they now stand.

## Summary

The clone map has a clear shape. About a third of the 275 clones are **lab-vs-shipped or
lab-vs-lab pairs, and almost all of those are deliberate design history** - variant galleries
and preserved concept rooms that the brief rules out of deletion. Another third are the same
five or six **ceremonies rewritten by hand at every call site**: the server-action preamble
(auth + gate + rate limit + parse, ~75 actions), the API-route guard, the catchups keeper
check (10 copies in one file), the author-fields Prisma select (39 sites), and the rule-test
preamble (42 files, 22 identical `decomment`s). Those ceremonies are where the real lines are:
the wrapper/helper findings below are worth roughly 1,200 lines on their own and, more
importantly, make the security-relevant preambles impossible to forget. The single biggest raw
win is not a clone at all but the charter's suspect pair confirmed: `bird-avatar.tsx` carries
~560 lines of legacy silhouette renderer that is unreachable behind a hardcoded `USE_V2 =
true`. The codebase also has an unusually high rate of **documented deliberate duplication** -
comments that say "kept independent on purpose, here is why" - and nearly every one I checked
held up; those are recorded as not-findings so nobody re-litigates them. Structural vs cheap:
overwhelmingly structural; the cheap remainder is folded into one micro-cluster finding.

## Findings

### duplication-01 - Delete the legacy silhouette renderer inside bird-avatar.tsx (two renderers, one avatar)
- **Where**: `src/components/common/bird-avatar.tsx:51-622` (the `WHITE` const, `Eye`,
  the ~530-line `Species` switch, `poseTransform`), plus the `USE_V2` flag at line 16 and the
  dead-path branch at lines 705-733.
- **Phase**: placeholder (an always-true flag hiding a dead renderer)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (see Notes for the owner nuance)
- **Evidence**: Line 16: `const USE_V2 = true;` with the comment "Flip to `false` to fall back
  to the legacy mono-white silhouettes." Line 682 `if (USE_V2) {` returns before the legacy
  path; the legacy path's own comment at ~line 710 admits "it is not used while USE_V2 is on."
  File is 734 lines; the wrapper logic (interface, size tokens, photo branch, v2 delegation) is
  ~170 of them. `depcruise-metrics`: `bird-avatar.tsx` Ca=45 (the canonical import point),
  `bird-avatar-v2.tsx` Ca=16 (v2 is also imported directly by lab rooms and `lib/avatar.ts`
  consumers, so it stays). jscpd also ties `lab/birds-bg/page.tsx:41-55` to
  `bird-avatar-v2.tsx:1812-1826` (a lab room quoting one bird path - lab record, keep).
- **What to do**: Delete `USE_V2`, the `Eye`/`Species`/`poseTransform` block (lines ~51-622)
  and the `if (USE_V2)`/legacy fork (keep the v2 branch's body as the unconditional path).
  Keep `AvatarUser`, `SIZE_TOKENS`, the photo/initials branches, and the v2 delegation exactly
  as they are so all 45 importers are untouched. The `@deprecated avatarSpecies` field on
  `AvatarUser` can stay (source compatibility, documented).
- **Saving**: ~560 lines code; a few KB in any client bundle that pulls the wrapper.
- **Risk & gate**: low. `npm run check`; `npm run visual` (avatars appear on 8 of the 10
  baseline routes); open `/birds` and one profile. No test pins the legacy path (grep for
  `USE_V2` outside this file: nothing).
- **Confidence**: high. The one thing that would change my mind: an owner wish to keep the
  mono-white set as a future theme - but the design record for it survives in git and in
  `/lab` regardless.
- **Notes**: This is the charter's "two renderers for one avatar" suspect, confirmed. The
  dead-code lens likely has it too; it is listed here because the fix is a dedupe of renderers,
  not just a delete. Deleting unreachable code changes nothing a member sees, hence
  "autonomous"; if the orchestrator prefers, the one-line question "do you ever want the white
  silhouettes back?" costs nothing to ask. Restoring later is `git revert` of one commit.

### duplication-02 - One wrapper for the server-action preamble (withMember / withAdmin / withAuth)
- **Where**: every `"use server"` action file. Census (verified by grep, per file:
  actions / `await auth()` / member-gate / rate-limit): `(main)/catchups/actions.ts` 23/23/8/4,
  `(main)/feed/actions.ts` 17/17/8/3, `(main)/collection/actions.ts` 8/8/4/3,
  `(main)/messages/actions.ts` 5/5/0/0 (+3 hand-rolled admin checks),
  `(main)/notifications/actions.ts` 4/4, `(main)/support/actions.ts` 3/3 (+1 admin check),
  `(main)/directory/actions.ts` 1, `(main)/admin/{mail,people}/actions.ts` 8 (already on
  `requireAdminAction`/`Actor`), `components/settings/actions.ts` 5/5/1/2,
  `components/posts/report-action.ts` 2/2/3/3, `components/profile/admin-actions.ts` 8 (on
  `requireAdminAction`), `components/profile/profile-actions.ts` 2/2,
  `components/onboarding/actions.ts` 3/3, `components/auth/*` (mostly PUBLIC_BY_DESIGN),
  `components/settings/theme-actions.ts` 2/1. Totals: **101 exported actions; ~75 open with
  `await auth()` + a null-check; 61 hand-typed "Not authenticated"/"Not signed in" returns; 24
  `requireVerifiedMember` + `if (!gate.ok)` pairs; 21 `rateLimit` + check pairs; 20
  `safeParse` + first-issue-message pairs; ~11 hand-rolled `role !== "admin"` checks** (listed
  in duplication-20). `catchups/actions.ts` additionally wraps everything in its private
  `runAction` (lines 175-185), which no other actions file has.
- **Phase**: dedupe (with an architecture flavour)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: 30 of the 65 typescript-format jscpd clones are pieces of this one ceremony
  (all the `catchups/actions.ts` 340-/617-/869-/1072- internal pairs; `collection` 607 vs
  `feed` 371/431/546/1429; `messages` 76 vs 135; `catchups` 342 vs `collection` 607; ...).
  Example, repeated with only the comment varying:
  ```ts
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };
  const gate = await requireVerifiedMember();
  if (!gate.ok) return { error: gate.error };
  const limited = await rateLimit("catchups", session.user.id);
  if (!limited.ok) return { error: limited.error };
  const parsed = createCatchupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  ```
  Note the first two lines are redundant where the gate follows: `requireVerifiedMember()`
  calls `auth()` itself and returns the user - so 24 actions authenticate twice.
- **What to do**: Add `src/lib/action-gate.ts` with three factories that RETURN async
  functions (the next-safe-action shape, which is valid in a `"use server"` module because the
  exported value is an async function):
  `withAuth(fn)` -> auth + null-check; `withMember(opts, fn)` -> gate (+ optional
  `limit: "catchups"`, optional `schema`), passing `(user, parsedInput)` in;
  `withAdmin(fn)` -> `requireAdminAction` folded in. Fold `runAction`'s try/catch in as the
  default failure floor (per-file error mappers like `isMissingCatchupTable` stay as an option
  arg). Convert ONE file first (`(main)/messages/actions.ts`, small and shape-complete
  including its demo refusals) and run the whole gate before converting the rest. Keep every
  "why this action is gated/metered" comment - they move to sit above the wrapper call.
  **Pinned file**: `src/lib/gate-coverage.test.mjs`'s `GATE` regex (line 31) must gain
  `|withMember|withAdmin|withAuth`; that is a one-line change to a security tripwire and must
  ship in the same commit as the first converted file.
- **Saving**: ~220 lines net across the app (75 preambles shrinking 2-8 lines each, minus the
  ~70-line wrapper), plus the double-`auth()` in 24 actions gone, plus the class of
  "forgot-the-gate" bug (audits H1/H3/L4) becoming structurally impossible in wrapped actions.
- **Risk & gate**: medium (touches every mutation). `npm run check` (75 test files, including
  gate-coverage, feed-write-rule, composer-rule, admin-guard-rule);
  `security-regressions.test.mjs` must stay green; `npm run verify:crawl`; exercise one write
  per converted file by hand. Convert file-by-file, one commit each.
- **Confidence**: high on the shape, medium on the exact line count. What would change my
  mind: if the Next compiler's server-action registration mis-handles the wrapped-const export
  shape in this Next 16 build - which is why the one-file pilot comes first.
- **Notes**: This is the charter's `withMember()` question answered: `lib/call-action.ts` is
  NOT it (that is the client-side await wrapper for audit B-042); nothing like `withMember`
  exists today, and `runAction` (catchups-only) is the closest ancestor. The demo layers are
  unaffected: proxy and the Prisma allowlist sit under this, and the wrapper centralises the
  scattered hand-written `if (IS_DEMO) return { error: ... }` refusals (messages, report-action,
  catchups member actions) as an option. Alternative rejected: adopting `next-safe-action` as a
  dependency - the hand-rolled version is ~70 lines and adds no new failure modes.

### duplication-03 - Share the rule-test preamble: one kit for read/decomment/fnBody
- **Where**: 42 of the 68 `src/lib/*.test.mjs` files open with the identical 5-import +
  `ROOT` + `read` + `decomment` block (~10 lines each); **22 files carry an identical
  `const decomment =` line** (verified `rg -l "const decomment" src scripts` = 22); `fnBody`
  (the brace-balancing extractor) exists **three times**: `src/lib/test-fn-body.mjs`
  (`balancedBody`, the documented canonical copy, imported today only by
  `composer-rule.test.mjs`), `src/lib/gate-coverage.test.mjs:67` (its comment says "fnBody,
  the audit-status version verbatim"), and `scripts/qa/audit-status.mjs:85`.
  All 12 clones in `raw/jscpd-tests.txt` are this one cluster (admin-guard-rule vs
  catchup-lifecycle/mail-queue/presence/purge/verify-outcome/notification-reach/gate-coverage;
  directory-rule vs login-attempt/profile-editor; notification-reach vs
  people-search/security-regressions; profile-editor vs threads-rule).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/lib/test-fn-body.mjs`'s own banner records why this matters: every
  hand-copied slicer has already shipped a broken variant ("audit C-188: ... deleting
  editPost's entire audience block left the test green"). A bug fixed in one of 22 `decomment`
  copies stays broken in 21.
- **What to do**: Extend `src/lib/test-fn-body.mjs` (or add `src/lib/_rule-kit.mjs` beside it)
  exporting `repoRoot()`, `read(p)`, `decomment(src)`, and keep `balancedBody`. Convert the 42
  preambles to two lines (`import { read, decomment } from "./_rule-kit.mjs"`). Point
  `gate-coverage.test.mjs` and `scripts/qa/audit-status.mjs` at `balancedBody` (their `fnBody`
  is the same algorithm taking a name; a 3-line adapter that builds the regex covers both).
  Safe with the runner: `scripts/qa/check.mjs` discovers only `*.test.mjs` (line 54), and its
  C-195 "test-shaped but not executed" guard (line 83) does not match a `_rule-kit.mjs` name -
  `test-fn-body.mjs` is the existing precedent. Plain relative imports, no alias, per the
  test-fn-body banner.
- **Saving**: ~300 lines (42 x ~7 net + 2 x ~28 for the fnBody copies).
- **Risk & gate**: low. `npm run check` runs all 42 files; `node scripts/qa/audit-status.mjs`
  by hand once. The one subtlety: some files inline small variations (an extra `body()` helper,
  a different decomment) - convert mechanically only where the text is identical, and leave any
  file whose variation is load-bearing with a one-line comment saying so.
- **Confidence**: high.
- **Notes**: This is the lib-tests lens's territory by file, but the clone cluster is mine; the
  orchestrator should merge with whatever `lib-tests` proposed. The win is not the lines, it is
  that the NEXT shape-test author gets the correct slicer by default.

### duplication-04 - login/signup: extract the flight-perch machinery and the photo half
- **Where**: `src/app/(auth)/login/login-client.tsx:223-358` vs
  `src/app/(auth)/signup/signup-client.tsx:163-284` (the 136-line jscpd clone: `reportPerchRect`
  + DOMMatrix un-transform + the ResizeObserver/resize/scroll perch watcher + the flight
  handoff with its fallback timer, comment-for-comment identical); `login-client.tsx:431-491`
  vs `signup-client.tsx:286-340` vs `components/auth/auth-panel.tsx:114-149` (the fixed
  58.3333% photo half + wordmark overlay + Back-link form column: THREE copies); plus the
  smaller clones the report lists at 10-18, 70-98, 499-515, 610-619.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `auth-panel.tsx`'s banner (lines 15-30) documents why login/signup do not USE
  AuthPanel ("they additionally run the perch-reporting and handoff machinery from
  mascot-flight.ts, which is most of their length") - but it does not defend login and signup
  duplicating that machinery BETWEEN THEMSELVES, nor the photo half existing three times. The
  perch block carries dated, hard-won reasoning (the 2026-08-11 ResizeObserver forced-layout
  fix, "traced at ~85ms") twice over; a fix to one copy will miss the other.
- **What to do**: (1) `src/components/auth/use-flight-perch.ts`: a hook taking
  `{ arrivedViaFlight, hoopoeBoxRef, entranceRef }` and returning
  `{ reportPerchRect, perchWatchStop }` - the 136-line block moves verbatim, comments intact,
  and each client calls the hook. (2) `src/components/auth/auth-photo-half.tsx`: the fixed
  photo panel + wordmark (~45 lines), used by login-client, signup-client AND auth-panel; the
  per-page comment differences merge into one canonical comment. Leave the form columns alone -
  they genuinely differ. Update the auth-panel banner to say the flight machinery now lives in
  the shared hook.
- **Saving**: ~200 lines net (perch: 2x~125 -> ~135 + 2x6; photo half: 3x~45 -> ~50 + 3x3).
- **Risk & gate**: medium - this is the owner's most-polished choreography. `npm run visual`
  (/, /login are baseline routes); then a manual flight check: landing -> "Sign in" slide ->
  bird cruises and perches, both viewports; `e2e` sign-in flow. The failure mode to watch is
  the DOMMatrix un-transform against the `entranceRef` motion.div - keep the ref threading
  exact.
- **Confidence**: high that it is duplication; medium on effort (the two files interleave the
  block with page-specific state; budget a careful session, not a mechanical one).
- **Notes**: `forgot`/`reset` already use AuthPanel (their jscpd clones against each other are
  the AnimatePresence success-panel idiom, ~6 lines - noise, keep). The
  `signup-client` 273-326 vs `auth-panel` 103-149 clone is the same photo-half, counted here.

### duplication-05 - Catchups: requireKeeper / requireEditionKeeper helpers (10 hand-rolled keeper guards)
- **Where**: `src/app/(main)/catchups/actions.ts` - keeper ceremony at 617-636, 686-702,
  722-738, 809-822, 1000-1013, 1043-1056, 1072-1089, 1146-1163, 1289-1306, 2143-2157 ("Only
  the Keeper can ..." x10, each preceded by the same auth + id-typecheck +
  `loadCatchupContext`/`loadFreshEdition` + membership + `isEffectiveKeeper` block, ~14-16
  lines); member-scope variant (auth + IS_DEMO + id-typecheck + `loadOwnCatchupCopy`) at
  1927-1940, 1981-1993, 2019-2031, 2060-2072, 2111-2120; the `EditionContext` select spelled
  twice inside `loadFreshEdition` itself (226-247 and 252-263).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: 25 of the 275 jscpd clones are internal to this one 2,187-line file - the
  densest clone cluster in the app. `isEffectiveKeeper` appears 18 times. The ten refusal
  sentences differ only in the verb ("change the rhythm" / "pause this Catch-up" / ...).
- **What to do**: Two file-local helpers (they need nothing outside this file):
  `requireKeeper(catchupId, verb)` -> `{ error } | { userId, ctx }` and
  `requireEditionKeeper(editionId, verb)` -> `{ error } | { userId, edition, membership }`,
  each ending with `Only the Keeper can ${verb}.`; a third
  `requireOwnCopy(catchupId)` for the member-scope five. Hoist the duplicated edition select
  into one `EDITION_SELECT` const used by both queries in `loadFreshEdition`. If
  duplication-02 lands first, these become the `fn` bodies' first line instead - the two
  findings compose, they do not conflict.
- **Saving**: ~130 lines in this one file.
- **Risk & gate**: low. `npm run check` (catchup-lifecycle.test.mjs, catchups.test.mjs);
  exercise pause/resume/publish-early on a dev Catch-up.
- **Confidence**: high.
- **Notes**: Keep the per-action comments about WHY each is keeper-scoped; they attach above
  the helper call. The status-precondition checks after the guard (`status !== "collecting"`
  etc.) stay at call sites - they are genuinely per-action.

### duplication-06 - One identity-select constant instead of 39 hand-spelled author selects
- **Where**: 39 occurrences of `birdOverride: true` inside hand-written Prisma `select`
  blocks across 25 files (census in evidence); the two shapes are "identity"
  (`id, name, photoUrl, birdOverride`) and "identity + standing" (`+ accountType, verifyState,
  batchType, batchYear`). Exemplars: `feed/actions.ts` (4, one already hoisted as
  `COMMENT_AUTHOR_SELECT`), `catchups/[catchupId]/page.tsx` (4), `admin/messages/[id]/page.tsx`
  vs `(main)/messages/[id]/page.tsx` (the whole 20-line `messages:` select including the
  audit-Low-86 comment is verbatim in both), `catchups/round/[editionId]/page.tsx` (2),
  directory pages, letters pages, the api routes, the rail module.
- **Phase**: dedupe
- **Tier**: T3 (many files, each edit trivial)     **Class**: structural     **Decides**: autonomous
- **Evidence**: `feed/actions.ts:34` already proves the pattern and names it: "The author
  fields a rendered comment needs. One copy, two readers." Then the same file spells the
  8-field shape out inline three more times. The drift risk is live: shapes differ by one
  field in ways that look accidental (some card renderers get `verifyState`, some do not - the
  verified leaf simply cannot render where it was forgotten).
- **What to do**: In `src/lib/posts.ts` (already the home of `PUBLISHED_ONLY`,
  `AUTHOR_IN_GOOD_STANDING`): export `IDENTITY_SELECT` and `AUTHOR_CARD_SELECT` `as const`,
  plus `THREAD_MESSAGES_SELECT` for the two message pages. Replace mechanically wherever the
  field set matches EXACTLY; where a site differs by a field, either spread-and-add
  (`{ ...IDENTITY_SELECT, email: true }`) or leave it with a one-line comment. Also fold
  `deletion-aware` variants only if identical. Do not force the two API routes' minimal
  selects into it (theirs are deliberately narrower - harvest surface).
- **Saving**: ~170 lines, and the leaf/batch-line drift class closed.
- **Risk & gate**: low per site. `npm run check` (`tsc` catches any select/type mismatch
  immediately - this is the rare refactor the compiler fully guards); `npm run verify:crawl`.
- **Confidence**: high.
- **Notes**: Prisma type inference works fine through an `as const` select constant. Related
  finding: duplication-16 (the same shape re-declared as three TS types in the directory
  components).

### duplication-07 - QA probes: finish moving the shared plumbing into _probe-kit.mjs
- **Where**: `scripts/qa/phase{3,4,5,6,7,8,10}-probe.mjs` (2,325 lines total). ~20 jscpd
  clone pairs among them (jscpd.txt lines 63-114): the pg client + `q` helper, the
  repoRoot/chdir/BASE/`PUPPETEER_EXECUTABLE_PATH` block, the probe-account create/cleanup
  blocks, and in `phase10-probe.mjs:36-43` a hand-rolled 8-line `.env` parser in a file that
  ALREADY imports from `_probe-kit.mjs` - which exports `loadEnv` for exactly this.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `_probe-kit.mjs`'s own banner: "audit R6 was nine hand-copied sign-in blocks
  quietly diverging across QA scripts." The sign-in copies were unified (`_dev-login.mjs`,
  used by all probes - verified); the rest of the bootstrap was not.
- **What to do**: Extend `_probe-kit.mjs` with `bootstrap(importMetaUrl)` (env + chdir + BASE
  + chrome path, returning `{ repoRoot, BASE }`) and `openDb()` (pg client on
  DIRECT_URL/DATABASE_URL + `q` + `end`). Convert the seven probes; delete phase10's inline
  env parser. The probe-account helpers (create a throwaway `@probeN.invalid` user, clean up)
  repeat in 4+ probes and can join the kit as `makeProbeUser(db, tag)`.
- **Saving**: ~140 lines across scripts/qa.
- **Risk & gate**: low-medium: probes hit the live shared database, so DO NOT run them to
  verify during the audit-fix session; convert, then run each once during the next scheduled
  security pass. Gate: the probes' own pass/fail ledgers.
- **Confidence**: high on the duplication; medium on how much each probe's bootstrap genuinely
  varies (phase3 reads bcrypt + sharp, others do not - the kit should stay additive, not force
  one shape).
- **Notes**: The scripts-e2e-ci lens owns whether some probes should exist at all; this
  finding assumes they stay. Same cluster, same treatment for the screenshot family
  (`screenshot-auth`/`screenshot`/`hover-probe`/`theme-shots`/`tour-mobile-verify`/`drive`/
  `map-cluster-verify`/`_dir-room-shots`/`hoopoe-*-check`): a `launchBrowser()` in a kit would
  take ~10 lines out of each of ~9 files (~60 lines), but several of those scripts are
  plausibly delete candidates under the "MCP replaced hand-rolled puppeteer probes" rule -
  defer to the scripts lens before spending the effort.

### duplication-08 - dev scripts: one pg/env bootstrap
- **Where**: `scripts/dev/city-alias-scan.ts:11-35` = `merge-cities.ts:15-38` =
  `seed-curated-content.ts:39-63` (25-line clone: dotenv + pg client + tiny query helper);
  `import-places.mjs:41-55` = `run-sql.mjs:29-43`; `import-roster.mjs:48-63` overlapping both
  and two qa probes.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt lines 7-33; the three .ts files' openers are token-identical per the
  263/197-token clones.
- **What to do**: `scripts/dev/_db.mjs` exporting `openDb()`/`closeDb()` (mirroring the qa
  kit's, or one shared `scripts/_lib/db.mjs` for both dirs); the six dev scripts import it.
  Keep `scripts/demo/*` SEPARATE and duplicated: those scripts point at the demo Supabase
  project, and a shared db-opener whose default is the production `DIRECT_URL` is exactly the
  kind of convenience that one day seeds the wrong database. Their 6-7-line clones
  (`apply-schema` vs `run-sql`, `seed-demo` vs `verify-guard`) are the price of that wall -
  keep.
- **Saving**: ~90 lines.
- **Risk & gate**: low. The scripts are run-by-hand tools; gate is running
  `node scripts/dev/run-sql.mjs --help`-style smoke checks at next legitimate use, not now.
- **Confidence**: high.

### duplication-09 - API routes: one guard helper for the upload trio, the lookup pair, and the cron trio
- **Where**: `src/app/api/upload/route.ts:19-50` = `upload/presign/route.ts:8-55` =
  `upload/finalize/route.ts:40-71` (32-line clone: originAllowed + auth +
  `requireVerifiedMember` + `rateLimit("uploads")`, each with its NextResponse.json refusal);
  `api/users-by-batch/route.ts:8-28` = `api/users/search/route.ts:13-38` (auth +
  `requireVerifiedEmail` + `rateLimit("search")`); `api/catchups/tick/route.ts:31-38` =
  `api/retention/sweep/route.ts:42-49` = `api/demo/reset/route.ts:99-105` (the CRON_SECRET
  timing-safe check).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt lines 332-345. The upload trio's preamble carries three copies of
  the M33/M2 reasoning comments.
- **What to do**: In `src/lib/upload-shared.ts` (already shared by the trio):
  `guardUploadRequest(request)` returning `{ fail: NextResponse } | { userId }`, comments
  moving with it. In a small `src/lib/api-gate.ts` (or the same file):
  `guardLookupRequest()` for the two user-lookup routes, and `requireCronSecret(req)` (5
  lines) for the three cron-shaped routes. Call sites become
  `const g = await guardUploadRequest(request); if ("fail" in g) return g.fail;`.
- **Saving**: ~90 lines across 8 routes.
- **Risk & gate**: low. `npm run check` (upload-ownership-rule, upload-size-rule, origin-rule
  test files read these sources - confirm their pattern matchers still match, and update in
  the same commit if they pin the inline shape; that is a pinned-file touch to call out in the
  fix commit). Manual: one avatar upload, one directory search.
- **Confidence**: high, with the rule-test caveat above as the one watch-item.

### duplication-10 - The places-save transaction exists twice (admin and settings)
- **Where**: `src/app/(main)/admin/people/actions.ts:215-249` vs
  `src/components/settings/actions.ts:150-188` - `parsePlaces` + `resolvePlaces` + the
  deleteMany/createMany/user-update `$transaction` + the C-101 legacy-columns comment,
  verbatim; only the userId source and the revalidate targets differ.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt line 172 (25 lines, 115 tokens). Both copies carry the same B-111
  and C-101 audit comments - two copies of a bug-fix is two places for the NEXT fix to miss.
- **What to do**: `savePlacesForUser(userId, places)` in `src/lib/place-input.ts` (it already
  owns `parsePlaces`) returning `{ error } | { success }`; both actions call it and keep their
  own revalidatePath lines and their own auth (admin gates as admin, member as self).
- **Saving**: ~30 lines.
- **Risk & gate**: low. `npm run check`; edit your own places in /settings, edit someone's as
  admin, confirm the directory map updates.
- **Confidence**: high.

### duplication-11 - loadPublishedIssue: one query for the two Round readers
- **Where**: `src/app/(main)/catchups/[catchupId]/page.tsx:85-160` vs
  `src/app/(main)/catchups/round/[editionId]/page.tsx:243-321` - the 40+-line nested
  prompts/entries/loves select (jscpd: 41 lines + a 12-line follow-on), including the
  Lows-27/34/57 ordering comment, twice.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **What to do**: Move `loadPublishedIssue(editionId, viewerId)` (and its `PublishedIssue`
  type) into `src/lib/catchup-shelf.ts` or `src/lib/catchups.ts`; both pages import it. The
  admin reading room (`admin/catchups/[catchupId]/page.tsx`, which clones 13 lines of the same
  shape per jscpd line 164) can take it too if its select matches exactly - check before
  forcing.
- **Saving**: ~50 lines; the two member-facing views of a published Round can no longer drift.
- **Risk & gate**: low. `npm run check`; open a published Round from /catchups and from its
  permalink.
- **Confidence**: high.

### duplication-12 - One paged-list hook for PostFeed / ProfileAuthorFeed / CollectionClient
- **Where**: `src/components/posts/post-feed.tsx:55-65,245-269` vs
  `src/components/profile/profile-author-feed.tsx:42-107` vs
  `src/components/collection/collection-client.tsx:132-143` - the cancelled-effect initial
  load, the `loadingMoreRef` synchronous double-tap guard (audit C-180), the id-dedupe append,
  and the try/finally busy-flag reset (audit B-042), three times.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt lines 731-732, 794-801. ProfileAuthorFeed's own comment: "the same
  pair PostFeed carries and for the same reason (audit C-180)".
- **What to do**: `src/components/common/use-paged-list.ts`: a hook
  `usePagedList<T>({ fetch, deps })` returning
  `{ items, loading, loadingMore, hasMore, loadMore, reset }`, owning the C-180 ref-guard,
  the B-042 finally, and the id-dedupe. PostFeed keeps its extra generation counter (Low 75)
  and filters on top; ProfileAuthorFeed and CollectionClient become thin.
- **Saving**: ~70 lines net, and three copies of two audit fixes become one.
- **Risk & gate**: medium (feed is the app's centre). `npm run check`; `npm run visual`
  (/feed, /collection, a profile are baselines); scroll-to-load on all three surfaces, both
  viewports.
- **Confidence**: medium-high. What would change my mind: if PostFeed's generation logic
  cannot sit cleanly on top of the hook, the extraction should cover only
  ProfileAuthorFeed + CollectionClient (~45 lines) and leave PostFeed alone rather than force
  it.
- **Notes**: ROADMAP's "one `<Feed/>`" decision would prefer ProfileAuthorFeed to BE PostFeed
  with `scope=author`. That is a bigger unification with real risk (PostFeed drags search/
  filter/divider machinery a profile tab does not want); the hook gets 80% of the value at 20%
  of the risk. Flagged for the feed-posts lens to weigh the full merge.

### duplication-13 - One optimistic like/bookmark hook for PostCard and LetterEngagement
- **Where**: `src/components/posts/post-card.tsx:160-196` vs
  `src/components/letters/letter-engagement.tsx:45-90` - `handleLike` (optimistic flip +
  `settledHeart` C-133 adoption + rollback + busy ref) and `handleBookmark`, near-verbatim
  twice.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt line 761 (21 lines). Both carry the C-133 comment.
- **What to do**: `useHeart(postId, initialLiked, initialCount)` and
  `useBookmark(postId, initial)` hooks in `src/components/posts/` (beside `post-card`) or on
  top of `src/lib/heart.ts` which already owns `settledHeart`; both components consume them.
  PostCard's demo-freeze early-returns stay at its call site.
- **Saving**: ~40 lines.
- **Risk & gate**: low. `heart.test.mjs` stays green; like + un-like on a feed post and a
  letter page, watch the count.
- **Confidence**: high.

### duplication-14 - One stage frame for the empty-state hoopoes
- **Where**: `src/components/mascot/moments/no-results-hoopoe.tsx` (50 lines),
  `no-saved-hoopoe.tsx` (57), `src/components/messages/messages-empty-hoopoe.tsx` (42) - the
  frame (`useHoopoe` + stageRef + `useSoloHoopoe` + `useMomentAutoplay` + the aria-hidden
  stage div) is identical; only the sequence array, default size, and the idea-board comment
  differ.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt lines 776-786 ties all three pairwise.
- **What to do**: Add `MomentStage({ size, className, play })` to
  `src/components/mascot/moments/moment-hoopoe.tsx` (already the home of the two shared
  hooks), where `play(h)` runs the sequence. Each moment file becomes its banner comment plus
  a ~10-line component. `messages-empty-hoopoe.tsx` moves into `moments/` while touched
  (relocate: it is a moment, filed under messages).
- **Saving**: ~55 lines, and the next moment costs 10 lines instead of 45.
- **Risk & gate**: low. Visual check of the three empty states (empty search, empty saved,
  empty messages); the one-hoopoe-guard behaviour (`useSoloHoopoe`) must keep standing down on
  desktop.
- **Confidence**: high.

### duplication-15 - One safe-localStorage kit (three copies, a fourth nearby)
- **Where**: `src/lib/onboarding-local.ts:20-36` = `src/lib/tour-local.ts:20-36` =
  `src/components/mascot/moments/one-shot.ts:24-40` - the SSR-guarded, try/caught
  `safeGet`/`safeSet` pair, three times (tour-local's banner: "shaped in the exact pattern of
  onboarding-local.ts"). `src/lib/theme.ts` touches localStorage too - check whether it can
  join while there.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt line 818 (21 lines, the charter's named clone).
- **What to do**: `src/lib/local-flag.ts` exporting `safeGet(key)` / `safeSet(key, value)`
  with the private-mode rationale once; the three files keep their own key-scheme constants,
  exported functions and banners (the banners are the value - they explain the trust model of
  each flag).
- **Saving**: ~40 lines.
- **Risk & gate**: low. `npm run check`; tour + onboarding smoke (the tour-auto-offer and
  composer-rule tests read some of these files - confirm no pattern pins the inline shape).
- **Confidence**: high.

### duplication-16 - Directory: one person type instead of three identical declarations
- **Where**: `src/components/directory/alumni-map.tsx:31-47` (`PinPerson`),
  `directory-client.tsx:33-45` (`interface User`), `profile-card.tsx:45-57` (inline prop
  type) - 12 identical fields three times (PinPerson adds `otherCities`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt lines 746-750. A new field (this is how `verifyState` arrived) must
  currently be added three times or the surfaces silently diverge.
- **What to do**: Export `DirectoryPerson` from `profile-card.tsx` (the leaf all three render
  through) or a `directory/types.ts`; `PinPerson = DirectoryPerson & { otherCities?: ... }`.
- **Saving**: ~25 lines.
- **Risk & gate**: low; `npm run check` alone proves it (types only).
- **Confidence**: high.
- **Notes**: These types still carry `avatarColor: string | null`, which `AvatarUser`
  deprecates as unused - flagged to the dead-code lens; do not widen this finding into a data
  change.

### duplication-17 - Adopt lib/prisma-errors everywhere it already answers
- **Where**: `src/app/(main)/catchups/actions.ts:187-190` declares a private
  `isUniqueConstraintError` in a file that ALSO imports `isUniqueViolation` (used at 1601;
  the local one at 417 and 1733); hand-rolled `code === "P2002"` at
  `src/components/auth/actions.ts:169,259` and `src/lib/last-seen.ts:123`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `prisma-errors.ts`'s banner: "Collected here because there were four
  hand-written `code === "P2002"` checks scattered across the codebase and no name for what
  any of them meant." Three grew back.
- **What to do**: Delete the local helper, redirect its two call sites; replace the three
  hand-rolled checks with `isUniqueViolation(err)`.
- **Saving**: ~10 lines; naming consistency.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### duplication-18 - One valley date formatter
- **Where**: three local `formatDate` copies in catchups components
  (`index/fresh-off-the-press.tsx:21`, `home/archive-shelf.tsx:20`,
  `home/console-published.tsx:31`) plus inline `toLocaleDateString` in
  `round/masthead.tsx:50`, `letters/drafts-strip.tsx:98`, `(main)/letters/[id]/page.tsx:182`,
  `(main)/collection/[id]/page.tsx:159`, `settings/actions.ts`, `verify-email-banner.tsx`,
  `round/footer-tease.tsx`, `home/extend-deadline-card.tsx`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The copies disagree on locale for no visible reason: "en-US" (fresh-off-the-
  press), "en-IN" (archive-shelf, console-published), "en-GB" (masthead, letters, collection).
  en-US renders "Aug 18", en-GB "18 Aug" - the same site currently shows both orders.
- **What to do**: `formatValleyDate(d, style)` in `src/lib/utils.ts` (beside `formatTimeAgo`
  and `VALLEY_TIME_ZONE`) with three styles: `"monthDay"`, `"short"` (18 Aug 2026), `"long"`
  (18 August 2026); pick ONE locale (en-GB matches the majority and the letters surface) and
  convert the ~11 sites. Any deliberate exception keeps a comment.
- **Saving**: ~40 lines, plus a real consistency fix.
- **Risk & gate**: low-medium: this CHANGES rendered dates where locales disagreed, so
  `npm run visual` will flag catchup surfaces - review the diffs, `visual:update` the
  intentional ones in the same commit. The unified order is arguably owner-visible: mention in
  the fix summary.
- **Confidence**: high on the duplication; medium on which locale is "the" choice (flagged in
  the fix commit for the owner to veto).

### duplication-19 - useWideViewport: four inline matchMedia copies
- **Where**: `src/components/profile/house-chain-editor.tsx:51-61` (already a named
  `useWideViewport`), `src/components/common/house-picker.tsx:85-96` (same body inline),
  `src/components/auth/auth-panel.tsx`, `src/components/landing/landing-hero.tsx` (same
  `(min-width: 1024px)` listener pattern).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **What to do**: Move `useWideViewport` to `src/components/common/` (beside motion.tsx),
  export, and convert the four sites. Keep the collision-flipping rationale comment at the
  hook.
- **Saving**: ~30 lines.
- **Risk & gate**: low; `npm run check` + open the house editor at 390px.
- **Confidence**: high.

### duplication-20 - Hand-rolled admin role checks where requireAdminAction exists
- **Where**: `feed/actions.ts:519,1052`, `support/actions.ts:253`,
  `messages/actions.ts:211,259,294`, `collection/actions.ts:637,662,732`,
  `admin/people/actions.ts:59`, `app/lab/actions.ts:31` - eleven
  `session.user.role !== "admin"` checks outside `lib/admin.ts`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `lib/admin.ts`'s own banner: "Centralised so the check and its copy cannot
  drift between the twenty-odd actions that need it." Eleven did not get the memo. The copies
  already drift: refusal strings vary ("Not authorized" vs "Not authorised." vs none).
- **What to do**: Replace each with `const denied = await requireAdminAction(); if (denied)
  return denied;` (or fold into duplication-02's `withAdmin` if that lands first).
  `feed/actions.ts:1031` (author-or-admin) stays - it is a different predicate.
- **Saving**: ~10 lines; one refusal string; one place to change the admin predicate.
- **Risk & gate**: low. `admin-guard-rule.test.mjs` and `gate-coverage.test.mjs` must stay
  green (both read these files - the GATE regex already matches `requireAdminAction`).
- **Confidence**: high.

### duplication-21 - validators.ts: the links schema is spelled twice
- **Where**: `src/lib/validators.ts:137-156` (profileSchema.links) = `:189-209`
  (contactMethodsSchema.links) - the label + https-only + URL-parse refinement array, verbatim
  but for `.optional()`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd.txt line 824. The file itself documents why this class of duplication
  bites: the phones rule "used to be spelled out separately here and had no minimum, so a
  three-character fragment saved through the contact editor and was then rejected by the other
  path (audit Low 84)" - which is why `phoneList()` exists. `links` is the same story waiting.
- **What to do**: `const linksList = () => z.array(...).max(10);` beside `phoneList()`; both
  schemas use it (`linksList().optional()` in profileSchema).
- **Saving**: ~20 lines.
- **Risk & gate**: low; `npm run check`; save a profile link and a contact link.
- **Confidence**: high.

### duplication-22 - isMissingTable: parameterize the two copies
- **Where**: `src/lib/catchups.ts:941-949` (`isMissingCatchupTable`) vs
  `src/app/lab/_archive-state.ts:30-40` (`isMissingLabTable`, whose comment says "Same shape
  as isMissingCatchupTable").
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **What to do**: `isMissingTable(err, tablePattern: RegExp)` in `src/lib/prisma-errors.ts`
  (its natural home); the two become one-line wrappers or direct calls.
- **Saving**: ~12 lines.
- **Risk & gate**: low; `npm run check`; /lab still renders.
- **Confidence**: high.

### duplication-23 - The letters desk skeleton is two identical files
- **Where**: `src/app/(main)/letters/new/loading.tsx` and
  `src/app/(main)/letters/[id]/edit/loading.tsx` - byte-identical 18-line files (both export
  `NewLetterLoading`; `diff` confirms zero differences).
- **Phase**: dedupe (framework boilerplate, class c)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **What to do**: Extract `LetterDeskSkeleton` into `src/components/letters/` and make both
  loading files 3-line wrappers (the files themselves must stay - `loading.tsx` is a Next
  convention).
- **Saving**: ~24 lines.
- **Risk & gate**: low; open /letters/new while throttled or just `npm run check`.
- **Confidence**: high.
- **Notes**: This is the whole of the loading.tsx cluster worth acting on. The other 34
  loading files are NOT a finding: the 11 admin ones already share `AdminSkeleton` (5 lines
  each - the pattern done right), and the rest each mirror their own page's real geometry,
  which is the point of a warm shimmer skeleton. Same for `error.tsx` (only 3, all different
  by design). Framework boilerplate verdict: already collapsed where collapsing was correct.

### duplication-24 - Micro-clone cluster: real but small, batch them in one sweep
- **Where / What** (each verified at both ends):
  1. `components/posts/report-action.ts:75-100` vs `:220-250` - reportPost/reportUser share a
     ~25-line preamble (auth + demo + gate + two rate limits + C-174 reason validation). A
     file-local `guardReport()` -> ~25 lines. (Subsumed by duplication-02 if that lands.)
  2. `components/common/image-viewer.tsx:366-388` - the Link-vs-span branch repeats identical
     children; hoist the avatar+name+date fragment to a variable -> ~12 lines.
  3. Onboarding steps: `houses-step.tsx:135-147` = `register-step.tsx:196-208` (Back / Skip /
     Save footer). A `StepFooter` used by the 3 steps that have it -> ~25 lines.
  4. `components/common/filters/range-facet-pill.tsx:88-113` internal (the two bound inputs)
     and vs `facet-search-select.tsx:87-97` - the pill-input idiom; a shared `BoundField`
     inside the filters kit -> ~15 lines.
  5. Admin: `content-list.tsx:163-205` vs `people-list.tsx:181-218` - the desktop-popover +
     mobile-sheet filter trigger pair; a `ResponsiveFilterTrigger` in the filters kit (also
     usable by directory-client) -> ~30 lines across 3 files.
  6. `admin/support/page.tsx:281-290` vs `admin/mail/mail-rows.tsx:89-98`,
     `admin/messages/thread-list.tsx:13-24` vs `thread-view.tsx:24-35`,
     `person-detail.tsx:511-527` internal, `progress-rail.tsx:76-85` internal,
     `catchups/create/people-picker.tsx:189-200` vs `home/people-panel.tsx:566-575`,
     `sidebar-hoopoe.tsx:83-91` vs `tour-panel.tsx:60-67` - each a 8-15-line presentational
     idiom (status pill, row scaffold, avatar-stack). Individually below the extraction
     threshold; fix only if already editing the file. -> maybe 40 lines total, optional.
  7. `lib/wordle.ts:37-46` re-implements `fnv1a` which `lib/avatar.ts:140-148` exports;
     import it (or move `fnv1a` to utils.ts while touching) -> ~9 lines.
  8. `lib/member-gate.ts:43-63` re-implements Stage 1 inside Stage 2; composing
     (`requireVerifiedMember` calling `requireVerifiedEmail`, then the verifyState check)
     saves ~12 lines and makes the stage relationship structural. Medium confidence: needs
     `verifyState` threaded through, and both files are read by rule tests
     (`security-regressions`, `auth-flow-rule`) - check their patterns first. Skip if the
     tests pin the inline shape.
  9. `(auth)/signup/signup-client.tsx:382-405` internal - two near-identical step panels;
     and `login-client.tsx:610-619` vs `components/auth/signup-form.tsx:658-667` (the
     submit-button-with-spinner idiom). Idiom-level; leave.
- **Phase**: dedupe / hygiene
- **Tier**: T2     **Class**: structural (items 1-5, 7-8) / cheap (6, 9)     **Decides**: autonomous
- **Saving**: ~130 lines if items 1-5, 7 are done; +~50 optional.
- **Risk & gate**: low each; `npm run check` + a visual pass on the touched surface.
- **Confidence**: high on 1-5, 7; medium on 8; item 6 and 9 are take-it-or-leave-it.

## Owner decisions

- **The letterhead concept has stopped being "in step".** The shipped profile
  (`src/components/profile/letterhead-profile.tsx`, 1,981 lines, edited today) opens with:
  "The concept file is the design record; this is the same layout against real `User` data.
  **Keep them in step, or retire the concept.**" They are not in step: the concept
  (`lab/profiles/_variant-letterhead-2.tsx`, 833 lines) froze on 2026-08-08 while the shipped
  copy kept growing; only ~305 normalized lines are still shared. Nothing needs deleting - the
  room is your design history and the brief protects it - but the instruction in the header is
  now fiction. Recommendation: amend the two file headers to say the concept is a **snapshot
  of the 2026-07-30 pick, not a maintained spec** (five minutes, no code), rather than asking
  future sessions to keep a 2,000-line file synchronized with an 833-line one. The same one-line
  header note would fit `lab/chain-lines/page.tsx` vs `houses-chain.tsx` (192 shared lines and
  drifting).
- **Two kinds of "are you sure?".** Post delete and the admin profile tools use the browser's
  plain `confirm()` popup (`post-card.tsx:196`, `admin-profile-tools.tsx:35,53`); Catch-ups
  and the admin person page use the app's own warm `ConfirmDialog`. Members will see both
  styles. Unifying on `ConfirmDialog` is a small, visible change (roughly +25 lines, so it is
  a consistency spend, not a saving). Recommendation: unify, per the design-protocol "what
  would Apple do" standard - but it changes what a member sees on delete, so it is your call.
- **Dates render in three different orders.** "Aug 18" (feed-adjacent catchup shelf), "18 Aug
  2026" (archive), "18 August 2026" (letters). duplication-18 unifies the machinery either
  way; the choice of one order is yours (recommendation: the letters style, day-first, since
  the letters page is the most deliberately typeset surface).

## Not-findings

(verified intentional; recorded so no future audit re-litigates)

- **The letters editor does not duplicate the composer.** `letter-desk.tsx` wraps the shared
  `CreatePostForm` - its banner: "extracted nothing, forked nothing, so the two can never
  drift." The ROADMAP "one Composer" decision is honoured. `lab/composer/_variants.tsx` (987
  lines, 199 shared normalized lines with the shipped form) is the variant gallery that led to
  it - design record, keep.
- **`lib/admin-*.ts` vs `lib/admin-*-query.ts` is a load-bearing split, not duplication.**
  `admin-content-query.ts` banner: "SPLIT OUT OF admin-content.ts ON PURPOSE ... a value
  import from any module that also imports `prisma` drags @prisma/adapter-pg (and `pg`, and
  its `require("dns")`) into the browser bundle." Types/constants client-side, queries
  server-side. All four pairs follow it; contents do not overlap.
- **Email HTML is already one shell.** `email-templates.ts` has a single `shell()` and four
  templates through it; `catchups-notify.ts` contains no HTML at all (it writes Notification
  rows). The charter's suspicion of inline duplicate email HTML is unfounded.
- **The five feed rail modules are the pattern done right.** One shared `RailCard` shell;
  each module is a distinct query + distinct body (54-91 lines). Forcing a variant prop over
  them would be over-abstraction.
- **`formatPhoneDisplay` vs `splitPhoneParts` in utils.ts share a country-code block on
  purpose**: "Kept independent ... so this never risks that function's existing,
  already-relied-on output" (with the owner's 2026-08-22 quote). Keep; if ever revisited, a
  pure `callingCodeLength(digits)` extraction is the safe cut.
- **`toggleLike` vs `togglePhotoLove` are documented twins** ("the shape and the reasoning are
  toggleLike's ... which this is the Collection's twin of") over different tables with
  different unique keys. A generic delegate-parameterized toggle would couple two modules to
  save ~15 lines. Keep.
- **The hoopoe's repeated wing-fold choreography blocks differ on purpose** - the landing
  variant deliberately does NOT touch the legs, with a comment explaining the unresolvable
  `.finished` it avoids. Extracting a shared "fold" would bury a load-bearing asymmetry. Keep
  (same verdict for the perching-birds behaviour-roll branches with different probabilities).
- **`scripts/demo/*` deliberately do not share db plumbing with `scripts/dev/*`**: they point
  at the demo Supabase project; the 6-7-line clones are the wall between "seed the demo" and
  "seed production". Keep (see duplication-08).
- **The admin `loading.tsx` family is already deduplicated** through `AdminSkeleton`
  (11 five-line files). The remaining loading files each mirror their own page's geometry -
  that is what a good skeleton is.
- **Lab-vs-shipped clone pairs are design history, not dedupe targets**: `lab/eggs` vs
  `konami-eggs` (the room is the preserved preview; commit 7c03568 "port the approved preview
  interactions into the app"), `lab/mascot-moments` vs `moments/*`, `lab/support-ideas/_shared`
  vs `bird-plate`, `lab/directory/_maps` vs `alumni-map`, `lab/landings/_variant-*` vs
  `components/landing/*`, `lab/chain-lines` + `_chain-*` vs `houses-chain`, `lab/birds-bg` vs
  `bird-avatar-v2`. Verified: no shipped file imports from `@/app/lab`, so none of this
  reaches members. The lab-internal variant-to-variant clones (letterhead-2 vs -3 sharing 554
  of 833 normalized lines; the five chain variants; the five landing variants) are what a
  variant gallery IS - forks are the medium. No action.
- **The five `*-message.ts` sentinel files**: I considered merging them into one
  `gate-messages.ts` (would save ~4 files / ~30 comment lines) and decided against
  recommending it: each banner documents a different matching contract (client dialogs match
  the exact string; plain-Node probes import without next/headers), the files are
  dependency-free BY CONTRACT, and merging saves nothing a member or build feels. Recorded so
  the next audit does not re-propose it.

## For other lenses

- **dead-code**: `avatarColor` is deprecated-unused per `AvatarUser`, yet still selected in
  `COMMENT_AUTHOR_SELECT` (feed/actions.ts:38) and carried by the directory person types -
  dead data on the wire. Also: is `admin-profile-tools.tsx` (imported by profile/[id]/page)
  still reachable now that `person-detail.tsx` exists with the same actions?
- **bundle**: `src/components/common/filters/index.ts` is an internal barrel re-export
  (defeats tree-shaking per brief 4f). Also `ui/skeleton.tsx` (grey `animate-pulse bg-muted`)
  survives alongside the mandated `skeleton-warm` (33 files) - two skeleton systems; if the
  grey one has few importers it is a delete for dead-code plus a CLAUDE.md-compliance fix.
- **bugs**: `catchups/round/masthead.tsx:50` formats `publishedAt` with `en-GB` but - unlike
  the sibling formatters - check whether it passes `timeZone: VALLEY_TIME_ZONE`; a date can
  shift a day across midnight IST if not.
- **scripts-e2e-ci**: the one-off puppeteer scripts (`hover-probe`, `theme-shots`,
  `tour-mobile-verify`, `hoopoe-*-check`, `_dir-room-shots`, `map-cluster-verify`) look like
  exactly the hand-rolled probes CLAUDE.md now forbids in favour of the chrome-devtools MCP -
  delete candidates before anyone deduplicates them (duplication-07 note).
- **shell-primitives**: the `motion.div initial/animate/exit/transition={SPRINGS.gentle}`
  fade-slide quad recurs across auth clients and dialogs; if `common/motion.tsx` grew a
  `FadeSlide` primitive, ~15 sites shrink by 4 lines each.
- **feed-posts**: the full ProfileAuthorFeed -> `PostFeed scope=author` unification question
  (duplication-12 note) and the post-DTO mapper duplicated between `loadPosts` and
  `loadSavedPosts` in feed/actions.ts (~35 lines twice; a `toPostDto(p, viewerId, isAdmin)`
  would collapse it - counted in duplication-06's territory but the file is theirs).

## Metrics

- jscpd clones triaged: 275 + 12 = 287, all classified. Rough split: ~95 lab-record or
  lab-internal (keep), ~120 ceremony/preamble clones (unify - findings 02, 05, 06, 07, 08,
  09, 20), ~35 real component/lib dedupe (findings 04, 10-19, 21-24), ~37 noise/idiom (keep).
- Duplicated lines per jscpd: 3,819 (2.74%) in src+scripts+e2e; 291 more in tests. Honest
  recoverable estimate across all findings: **~2,300 lines** (the largest single item,
  duplication-01 at ~560, is unreachable code rather than a clone).
- Biggest files touched by findings: `catchups/actions.ts` 2,187; `letterhead-profile.tsx`
  1,981; `bird-avatar-v2.tsx` 1,840; `create-post-form.tsx` 1,683; `feed/actions.ts` 1,648;
  `login-client.tsx` 654.
- Ceremony census: 101 exported server actions; 75 `await auth()` preambles; 61 hand-typed
  not-authenticated returns; 24 member-gates; 21 rate-limit pairs; 20 safeParse pairs; 11
  hand-rolled admin checks; 22 `decomment` copies; 3 `fnBody` copies; 3 safe-localStorage
  pairs; 39 hand-spelled identity selects; 3 declarations of the directory person type.
- Similarity measures (shared normalized lines): letterhead-profile vs letterhead-2: 305 of
  833; vs letterhead-3: 320; letterhead-2 vs -3: 554 of 833; houses-chain vs chain-lines lab:
  192 of 761; create-post-form vs lab composer variants: 199.

# catchups - simplification audit report

Territory reader for Catch-ups, the recurring group newsletter: the member-facing routes under
`src/app/(main)/catchups/**` and `src/app/catchups/**` (join flow), the cron tick route, the 39
components under `src/components/catchups/**`, and the six lib modules (`catchups.ts`,
`catchups-notify.ts`, `catchups-types.ts`, `catchup-caps.ts`, `catchup-shelf.ts`,
`group-succession.ts`). Charter: map `actions.ts` (the repo's biggest file), find the lifecycle
written twice, explain the madge cycle `lib/catchups.ts <-> lib/catchups-notify.ts`, and answer the
five floor questions. Date: 2026-08-25. Files in territory: 61 (12 + 3 + 1 + 39 + 6); read fully: 58.

## Coverage

- Read fully: `src/app/(main)/catchups/actions.ts` (all 2,187 lines), `src/app/(main)/catchups/page.tsx`,
  `[catchupId]/page.tsx`, `[catchupId]/answer/page.tsx`, `round/[editionId]/page.tsx`, `new/page.tsx`,
  `layout.tsx`; `src/app/catchups/join/[token]/page.tsx`, `join/page.tsx`;
  `src/app/api/catchups/tick/route.ts`; all six lib files; all 39 files in `src/components/catchups/**`
  except the five `loading.tsx` skeletons (skimmed) and `create/cadence-control.tsx`,
  `join/accept-invite.tsx`, `almost-ready.tsx`, `answer/*`, `round/*`, `home/*`, `index/*` (all read
  fully). Also read: `docs/spec/catchups.md` (889 lines), `docs/planning/catchups-fixes-brief.md`,
  `src/lib/catchup-lifecycle.test.mjs` (headers + pins), relevant slices of `catchups.test.mjs`,
  `demo.ts`, `demo-seed/seed.ts`, `email-queue.ts`, `post-notifications.ts`.
- Skimmed (why): the five `loading.tsx` files (~276 lines total; hand-drawn skeleton mirrors, the
  repo's stated convention, nothing to find beyond confirming they exist per rule);
  `admin/catchups/**` (not mine; skimmed imports only, see "For other lenses");
  `catchups.test.mjs`/`catchup-shelf.test.mjs`/`group-succession.test.mjs` bodies (read enough to
  know which exports they consume, which findings 01/13 depend on).
- Not read: nothing in territory.
- Uncommitted edits seen: **none in my territory** (`git status --short` over all territory paths is
  empty). The other session's WIP (`next.config.ts`, `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs`, `src/app/(main)/forbidden.tsx`) never intersected
  anything I judged.

## Summary

This is the healthiest big territory an auditor could hope to be handed, and I want to say that
before listing cuts: nearly every "long" thing here is long because of owner-standard "why" comments
(cloc: actions.ts is 1,396 code / 602 comment; lib/catchups.ts 806/438), and those comments carry
audit IDs, owner quotes and dates - they are the repo's institutional memory, not bloat. The state
machine is genuinely written once (`computeStatus`/`planNextAction` in lib/catchups.ts; every action
and page calls through `advanceEdition`/`loadFreshEdition`; the tick route is the thin wrapper the
spec asked for). The two real structural problems are: (1) **a dead 120-line creation path** -
`createCatchup`, the groups-era action, callable as a live server-action endpoint but referenced by
nothing since the people-first rewrite - and (2) **the same 13-15 line auth/membership/Keeper/frozen
preamble pasted 14 times through actions.ts**, which is most of what jscpd flagged. Behind those:
the published-Round heavy query + view mapping is duplicated verbatim between two pages (~90 lines),
`lib/catchups.ts` should split into a pure core and an impure engine (which kills the madge cycle,
deletes the dynamic-import singleton machinery, and un-drills two prop chains), and
`catchups-types.ts` carries four view-model types no screen ever adopted. Everything else is
T1-sized: duplicated date formatters in three different locales, a second NotAvailableCard that
drifted from its twin, dead props, two P2002 helpers in one file. Structural-vs-cheap split: about
80% of the winnable lines are structural. Estimated honest total: ~550 lines, plus one dead DB
column and a removed attack-surface endpoint.

**The actions.ts responsibility map** (current line ranges):

| Lines | Responsibility | Actions |
|---|---|---|
| 1-96 | header docblock, imports, cap constant | - |
| 97-165 | Zod schemas | - |
| 166-325 | shared helpers (`runAction`, `loadMembership`, `loadFreshEdition`, `loadCatchupContext`, `refuseIfFrozen`) | - |
| 327-835 | series lifecycle | `createCatchup` (DEAD), `createCatchupWithPeople`, `joinCatchupByToken`, `updateCatchupCadence`, `pauseCatchup`, `resumeCatchup`, `endCatchup` |
| 837-1067 | prompts | `submitPrompt`, `curatePrompt` |
| 1069-1345 | round transitions | `openAnswering`, `closeAndPrepare`, `extendDeadline`, `publishNow` |
| 1347-1621 | entries + hearts | `submitEntry`, `toggleEntryLove` |
| 1623-2106 | membership + personal copy | `addCatchupMembers`, `removeCatchupMember`, `leaveCatchup`, `setCatchupArchived`, `setCatchupDeleted`, `setCatchupKeeper` (+ 4 helpers) |
| 2108-2187 | prefs + nudge | `setReminderPref`, `nudgeGroup` |

Verdict on "is its size honest": mostly yes. 20 exported actions (19 after the dead one goes), each
doing real permission re-derivation, CAS writes and transactional notification, at ~70 lines each
including the argued-for comments. After findings 01 and 02 land it is ~1,850 lines with clear
section banners. A physical split is possible and mapped in finding 05, but it is optional; the
preamble helper is not.

**The floor questions, answered:**
1. *One-use wrappers among the 39 components?* Almost none. `EntryLoveButton` and `PublishNowButton`
   wrap shared primitives but add real action wiring and each has two call sites. The one genuine
   duplicate-wrapper is `NotAvailableCard`, which exists twice (finding 08). `SongNameField` is
   single-use and thin, but its docblock carries the load-bearing songs-migration TODO; inlining it
   would orphan that. The component tree reuses `BirdAvatar`, `IdentityRow`, `LoveButton`,
   `RichTextArea`, `useUserSearch`, `ConfirmDialog`, `AttachImageDialog` - the shared primitives are
   genuinely being used, not re-implemented.
2. *Shelf/caps/succession - three concepts or three sessions?* Three concepts, each with consumers
   outside this feature: `catchup-caps.ts` exists because a `"use server"` file may not export
   constants (same reason as `post-caps.ts`); `catchup-shelf.ts` is shared with `lib/retention.ts`
   (the countdown a member reads and the sweep's cutoff are the same arithmetic, which is its whole
   point); `group-succession.ts` is shared with `lib/retention.ts` and `lib/account-purge.ts`.
   Verified not-findings (see below).
3. *Second copy of composer/avatar row/people list/empty state?* No composer copy (the answer box is
   the shared `RichTextArea`); no avatar-row copy (`IdentityRow` used in both round card and section
   header); the people-search ROW markup is near-duplicated between `create/people-picker.tsx` and
   `home/people-panel.tsx` (jscpd, ~12 lines - noted in finding 09's notes, below the action line);
   the empty-state duplicate is the NotAvailableCard pair (finding 08).
4. *How many actions share the same preamble?* 7 edition-scoped Keeper preambles + 4 catchup-scoped
   Keeper preambles + 3 edition-scoped member preambles = 14. Counted and quoted in finding 02.
5. *Does the tick route duplicate lib logic?* No. It is 42 lines: CRON_SECRET check +
   `advanceDueCatchups()` - exactly the "thin wrapper" spec 2.4 prescribed. Not-finding.

## Findings

### catchups-01 - Delete the dead groups-era creation path (`createCatchup` + its schemas + `suggestSeedPrompts`)
- **Where**: `src/app/(main)/catchups/actions.ts:329-424` (docblock + `createCatchup`),
  `actions.ts:115-124` (`seedPromptSchema`, `createCatchupSchema`),
  `src/lib/catchups.ts:294-304` (`suggestSeedPrompts`),
  `src/lib/catchups.test.mjs:684-...` (the `suggestSeedPrompts` test, plus its line in the import
  block at `catchups.test.mjs:46`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip flags `createCatchup` unused in BOTH `knip.txt` and `knip-production.txt`
  (`createCatchup function src/app/(main)/catchups/actions.ts:337:23`). My own grep across all of
  `src/` finds exactly one reference outside its definition: a comment in
  `src/components/auth/actions.ts:233` ("Same shape createCatchup uses"). The create flow uses only
  `createCatchupWithPeople` (`create-catchup-form.tsx:34,80`). No rule test pins it:
  `catchup-lifecycle.test.mjs` and `demo.test.mjs` reference `createCatchupWithPeople` only
  (`demo.test.mjs:305`). History: the fix brief (2026-07-25, section 5.1) removed question-picking
  from creation and `new/page.tsx`'s docblock records that the `?group=<id>` path died on
  2026-08-21 - `createCatchup` (start from an existing group, with seed prompts) is the path both
  changes orphaned. `suggestSeedPrompts` was the seed picker's data source and is now consumed only
  by its own unit test.
- **What to do**: delete `createCatchup` (actions.ts lines 329-424) and the two schemas only it uses
  (`seedPromptSchema` 115-118, `createCatchupSchema` 120-124; keep `cadenceSchema`, which
  `createCatchupWithPeopleSchema` also uses). Delete `suggestSeedPrompts` (catchups.ts 294-304) and
  its test (catchups.test.mjs "suggestSeedPrompts: two Round 1 starters..." block + the import).
  Reword the comment in `components/auth/actions.ts:233` to name `createCatchupWithPeople` instead.
  Note `MAX_ACCEPTED_PROMPTS_PER_EDITION` is still used by `curateReorderSchema` and `submitPrompt` -
  it stays.
- **Saving**: ~120 lines code, plus one fewer live server-action POST endpoint in production (dead
  code that is also attack surface: a `"use server"` export is invokable by action id even with no
  UI caller; it enforces auth/gates correctly today, but an unused mutation endpoint is pure
  downside).
- **Risk & gate**: low. `npm run check` (typecheck catches any missed import; the unit suite runs
  `catchups.test.mjs` and `demo.test.mjs`); `security-regressions.test.mjs` does not reference it.
- **Confidence**: high. The one thing that would change my mind: a plan to resurrect group-scoped
  creation - nothing in ROADMAP/FEATURES suggests one, and groups are being retired.
- **Notes**: I checked whether the demo's three write layers or `call-action` rule tests enumerate
  action names - they enumerate models (`demo.ts:84-89`) and one function body
  (`createCatchupWithPeople`), not this function. The deletion also removes the last writer that
  could set `CatchupPrompt.source = "keeper"` at creation time via `seedPrompts`; `submitPrompt`
  still writes `"keeper"` for a Keeper's own submissions, so the `source` column stays meaningful.

### catchups-02 - One gate helper for the 14 copies of the auth/membership/Keeper/frozen preamble in actions.ts
- **Where**: `src/app/(main)/catchups/actions.ts` - edition-scoped Keeper preamble x7:
  1002-1017 (`curatePrompt` reorder), 1045-1060 (`curatePrompt` remove), 1078-1092 (`openAnswering`),
  1152-1166 (`closeAndPrepare`), 1236-1250 (`extendDeadline`), 1295-1309 (`publishNow`),
  2146-2160 (`nudgeGroup`); catchup-scoped Keeper preamble x4: 625-636 (`updateCatchupCadence`),
  692-703 (`pauseCatchup`), 728-739 (`resumeCatchup`), 812-823 (`endCatchup`); edition-scoped member
  preamble x3: 871-882 (`submitPrompt`), 1385-1396 (`submitEntry`), 1572-1578 (`toggleEntryLove`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: this is what jscpd's 20+ intra-file clones in actions.ts are (raw/jscpd.txt lines
  185-267: e.g. `[1072:36-1089:22]` = `[1146:38-1163:22]` = `[1289:33-1306:22]`, 18 lines, 145
  tokens). The canonical copy, from `openAnswering` (1078-1092):
  ```ts
  const edition = await loadFreshEdition(editionId);
  if (!edition) return { error: "Catch-up round not found." };
  const membership = await loadMembership(edition.catchup.group.id, session.user.id);
  if (!membership) return { error: "You are not a member of this group." };
  if (
    !isEffectiveKeeper({
      viewerId: session.user.id,
      createdById: edition.catchup.createdById,
      groupRole: membership.role,
    })
  ) {
    return { error: "Only the Keeper can open answering." };
  }
  const frozen = refuseIfFrozen(edition.catchup.status, "Resume it to pick the Round back up.");
  if (frozen) return frozen;
  ```
  The proof the codebase already believes in the helper shape: `loadKeeperScope` (1743-1757) does
  exactly this for the catchup-scoped case and is used by three actions - while the four lifecycle
  actions above it (written earlier) restate the identical logic inline with only the refusal
  sentence differing.
- **What to do**: add two helpers beside `loadFreshEdition`:
  `loadKeeperEdition(editionId, viewerId, refusal: { keeper: string; pausedHint?: string })`
  returning `{ edition, membership } | { error }` (runs load + membership + `isEffectiveKeeper` +
  `refuseIfFrozen` when `pausedHint` given - `curatePrompt`'s two branches pass no hint since they
  are already status-gated to `collecting`), and `loadMemberEdition(editionId, viewerId)` for the
  three member actions (load + membership only; leave each action's own status check and
  `refuseIfFrozen` where the ordering matters - `submitEntry` checks status before frozen, keep
  that). Parameterise `loadKeeperScope` with the refusal message and use it in the four lifecycle
  actions. Each call site becomes 2-3 lines.
  **Critical**: `src/lib/catchup-lifecycle.test.mjs` ("B-061: every hand-driven write ... refuses a
  frozen Catch-up") greps each named function body for `refuseIfFrozen(` - after this refactor
  those bodies call the helper instead, so that test MUST be updated in the same commit to accept
  `refuseIfFrozen(|loadKeeperEdition(|loadMemberEdition(` (or to assert the helper is called AND
  that the helper itself contains `refuseIfFrozen`). Do not weaken it: it should still fail if a
  future action skips the gate.
- **Saving**: ~110 lines code net (14 blocks x ~9-13 lines removed, minus ~35 lines of helpers),
  and one place where the permission rule lives instead of fourteen.
- **Risk & gate**: medium (it rewrites the top of every guarded mutation). Gates:
  `npm run check` (the full unit suite, especially `catchup-lifecycle.test.mjs` updated as above and
  `demo.test.mjs`); manual: as Jerry, open a Catch-up and verify a non-Keeper still gets the
  refusal toasts on Keeper controls.
- **Confidence**: high on the duplication; medium on the exact helper signature (the per-action
  refusal sentences are owner-reviewed copy and must survive verbatim - pass them in, never
  genericise them).
- **Notes**: I considered a decorator-style `withKeeperEdition(fn)` wrapper and rejected it: the
  repo's idiom is plain calls and early returns, and a higher-order wrapper would hide the gate the
  rule tests want to see. The `typeof x !== "string"` id checks at each action top are 1 line each
  and fine to leave.

### catchups-03 - Split `lib/catchups.ts` into pure core + impure engine; this kills the madge cycle and the dynamic-import machinery
- **Where**: `src/lib/catchups.ts:31-78` (the dynamic-import singletons + `report`),
  `catchups.ts:20-29` (imports), `catchups.ts:953-1349` (the impure drivers),
  `src/lib/catchups-notify.ts:24` (the static import that closes the cycle),
  `src/components/catchups/home/keeper-settings-dialog.tsx:30-34` (the re-typed cadence list),
  `src/app/(main)/catchups/new/page.tsx:94` + `create-catchup-form.tsx:44` +
  `cadence-control.tsx:34` (the `cadenceLabels` prop drill),
  `[catchupId]/page.tsx:480` + `home/types.ts:103` + `console-collecting.tsx` +
  `library-picker-dialog.tsx` (the `promptLibrary` prop drill).
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/madge-circular.txt` cycle 44: `lib/catchups.ts > lib/catchups-notify.ts`.
  **The explanation the charter asked for**: `catchups-notify.ts` statically imports
  `answerReminderMessage` from `catchups.ts` (notify.ts:24, used at :202 - the C-141/C-031 fix put
  the reminder sentence and the countdown it shares in one place); `catchups.ts` imports
  `catchups-notify.ts` back, but only DYNAMICALLY inside `getNotify()` (catchups.ts:58-61), so the
  cycle never bites at runtime - module init cannot deadlock because the notify import is deferred
  until the first impure driver call. The dynamic import exists for a second reason the file
  documents at 31-45: `catchups.test.mjs` runs under bare `node --test` and must load the pure state
  machine with no database, so prisma and notify must stay out of the static graph. So the cycle is
  a symptom, not the disease: the disease is one module holding both the pure state machine and the
  impure Prisma drivers, forcing the lazy-singleton workaround (`PrismaLike`, `NotifyModule`,
  `getPrisma`, `getNotify`, the dynamic `report`) and forcing every client component to avoid the
  module - hence the re-typed `CADENCE_OPTIONS` literal in keeper-settings-dialog (its comment says
  exactly this: "not imported from @/lib/catchups so this client component never pulls that module's
  lazy-loaded Prisma/notify code paths"), the `cadenceLabels` prop threaded through two components,
  and `CATCHUP_PROMPT_SETS` (~56 lines of static data) serialized into the RSC payload of every
  Catch-up home render just to reach `LibraryPickerDialog` as a prop.
- **What to do**: (1) create `src/lib/catchups-core.ts` (client-safe, dependency-free except
  `./utils.ts`): move everything above the "Impure drivers" banner - constants, `newInviteToken`
  (needs `node:crypto`, which is fine for RSC but NOT client; if any client component ever needs
  core, put `newInviteToken` in the engine instead), `CATCHUP_PROMPT_SETS`, `CADENCE_LABELS`,
  calendar math, `askerVisible`, `isEffectiveKeeper`, the pure state machine + patches +
  `planNextAction`, the copy helpers (`valleyDaysLeft`, `answersCloseSentence`,
  `answerReminderMessage`, `describeEditionStatus`...), `resolveSpotify`, `isMissingCatchupTable`.
  (2) `catchups.ts` keeps the impure drivers and now imports `prisma`, `catchups-notify` and
  `report-error` STATICALLY - the singletons (47-61), `report`'s fallback (72-78) and both type
  aliases die. (3) `catchups-notify.ts` imports `answerReminderMessage` from core: **cycle gone**.
  (4) `catchups.test.mjs` imports core (it already imports with explicit paths;
  `catchup-lifecycle.test.mjs`'s source-grep pins reference `src/lib/catchups.ts` text patterns -
  re-point the two `read("src/lib/catchups.ts")` pins that assert on driver internals; they still
  hold since drivers stay in catchups.ts). (5) `keeper-settings-dialog.tsx` derives its options from
  `CADENCE_LABELS` imported from core and deletes the literal; `new/page.tsx` stops passing
  `cadenceLabels` and `cadence-control.tsx`/`create-catchup-form.tsx` import the labels directly;
  `LibraryPickerDialog` imports `CATCHUP_PROMPT_SETS` directly and `promptLibrary` comes off
  `CatchupHomeData`, the page load, and the two prop hops. Update the ~10 server-side import sites
  (pages, actions, tick route, notify) to pull pure names from core - mechanical, tsc-guided.
- **Saving**: ~40 lines net code; removes 1 real dependency cycle (of the repo's 5 non-generated);
  removes ~2KB of static library data from every Catch-up home RSC payload; ends the "never import
  lib/catchups from a client file" tribal rule that three separate docblocks currently spend
  paragraphs defending.
- **Risk & gate**: medium. Gates: `npm run check` (tsc catches every import; `catchups.test.mjs`,
  `catchup-lifecycle.test.mjs` must stay green); `npm run visual` (/catchups is a baseline route);
  open `/catchups/[id]` and the create flow as Jerry. If the fixer wants a minimal step instead:
  moving ONLY `answerReminderMessage`+`valleyDaysLeft` (and the `ms` helper they share) into
  `catchups-types.ts` (already mixed types+runtime: `promptKind`, `PROMPT_CATEGORIES`) kills the
  cycle in ~20 minutes, but leaves the singletons and the prop drills; do the full split.
- **Confidence**: high that the split is safe (the file's own section banners already draw the
  line); medium on effort (an afternoon, not an hour).
- **Notes**: fear: `node --test` resolves `@/` aliases nowhere - core must import `./utils.ts` with
  the extension exactly as catchups.ts:21 does today, and notify's import of core must use a
  form the test runner can survive if any test ever loads notify (none does today; notify is only
  loaded via the engine). Do NOT move `restoreOwnCatchupCopy` to core (it is impure; it currently
  sits mid-file in the pure-looking region, see catchups-15).

### catchups-04 - One loader for the published-Round view (the heavy select + mapping is pasted in two pages)
- **Where**: `src/app/(main)/catchups/[catchupId]/page.tsx:85-191` (`loadPublishedIssue`) vs
  `src/app/(main)/catchups/round/[editionId]/page.tsx:239-350` (the inline heavy query + mapping);
  the shared `toPersonRef` re-declared at `[catchupId]/page.tsx:141-151` and
  `round/[editionId]/page.tsx:292-299`.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: `app/(main)/catchups/[catchupId]/page.tsx [92:7-132:40]` =
  `round/[editionId]/page.tsx [243:7-283:40]` (41 lines, 190 tokens - the prompt/entry/love select)
  and `[159:106-170:13]` = `[310:5-321:13]` (the CatchupPromptView mapping). `loadPublishedIssue`'s
  own docblock admits it: "Mirrors the heavy query in `round/[editionId]/page.tsx`". And the two
  copies have ALREADY drifted on song mapping: the round page prints a song when
  `songTitle || songUrl` with a title fallback chain (round page:335,343), while the home's inline
  issue prints one only when `songUrl` is set (`[catchupId]/page.tsx:179`) - a legacy Spotify row
  whose oembed failed renders in both, but the rule is written twice and only one carries the
  explanatory comment. This is the exact bug-breeding shape the repo's own history (C-019: two
  renderers disagreeing on anonymity) warns about, on the same pages.
- **What to do**: create `src/lib/catchups-round-view.ts` (server-only; or fold into the engine file
  from catchups-03) exporting `loadPublishedRoundView(editionId, viewerId)` -> 
  `{ publishedAt, sections: Array<{ prompt: CatchupPromptView; entries: RoundEntry[] }> } | null`,
  containing the select (prompts where accepted, ordered `[{position:"asc"},{createdAt:"asc"}]`,
  entries with author/loves), `toPersonRef`, the `askerVisible` mapping, `batchLine`,
  `parseJsonArray`, and ONE song rule - adopt the round page's (title falls back to the raw URL;
  `url: ""` signals SpotifyCard's unlinked row) since it is the later, commented one. Both pages
  call it; `[catchupId]/page.tsx` keeps its "only when fresh status is published" guard and the
  round page keeps its light-query/advance/membership ordering (that ordering is a security fix -
  do not move the membership gate into the shared loader's callers' heads; assert it in the round
  page exactly where it is).
- **Saving**: ~90 lines code, and the anonymity + song rules exist once for the two biggest reader
  surfaces.
- **Risk & gate**: medium (touches the crown-jewel page). Gates: `npm run check`;
  `npm run visual`; open a published Round both inline on the home and at
  `/catchups/round/[id]` as Jerry, confirm identical sections, hearts, songs, anonymous "asked by
  you, anonymously" lines.
- **Confidence**: high.
- **Notes**: keep `RoundEntry`'s `authorMeta` in the loader (it needs the author's
  accountType/batchType/batchYear select). The `preparing`-secrecy invariant (T-catchups-04, answer
  bodies never queried pre-publish) must be stated in the new loader's docblock, because it becomes
  the one place a future feature would be tempted to call too early.

### catchups-05 - The actions.ts decomposition map (execute only if wanted; the file is honest after 01+02)
- **Where**: `src/app/(main)/catchups/actions.ts` whole file; section ranges in the Summary table.
- **Phase**: architecture
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: 2,187 lines today; ~1,850 after findings 01+02. cloc: 1,396 code / 602 comments -
  the comment mass is owner-standard reasoning (B-061, C-125, C-029, M12... each writes down WHY a
  guard exists), and the code per action is genuine: permission re-derivation, CAS writes,
  transactional notify. There is no hidden second state machine in here: every transition delegates
  to the lib's patch helpers (`answeringPatch`, `extendPatch`, `preparingPatch`, `publishPatch`) and
  every status read goes through `loadFreshEdition` -> `advanceEdition`. The lifecycle is written
  once; this file is its keyboard.
- **What to do** (if a later session wants the physical split): move shared helpers (166-325 plus
  finding 02's new gates) into `src/lib/catchups-action-guards.ts` (a `"use server"` file may export
  only async functions, so the non-action helpers must leave anyway if split); then five `"use
  server"` files under `src/app/(main)/catchups/actions/`: `series.ts` (327-835), `prompts.ts`
  (837-1067), `rounds.ts` (1069-1345), `entries.ts` (1347-1621), `people.ts` (1623-2187). Keep
  `actions.ts` as a `"use server"` barrel re-exporting all of them so the ~15 component import sites
  (`@/app/(main)/catchups/actions`) do not change. Update the file paths inside
  `catchup-lifecycle.test.mjs` and `demo.test.mjs` (both `read("src/app/(main)/catchups/actions.ts")`
  by string) to read the new files.
- **Saving**: 0 lines (this is navigation, not weight). My recommendation: **do 01+02 and stop**;
  the single file with its section banners is defensible, and the barrel + test-path churn buys
  little. Recorded so the orchestrator has the map either way.
- **Risk & gate**: medium if executed (`npm run check`; both rule tests re-pointed; a manual pass
  over every Catch-up mutation as Jerry).
- **Confidence**: high in the map; high in the "stop after 01+02" recommendation.
- **Notes**: a `"use server"` barrel of re-exported async functions is valid; verify one action
  fires through it in dev before committing, because a broken barrel breaks every mutation at once.

### catchups-06 - Delete the four view-model types nothing adopted, and the stray type/constant dupes
- **Where**: `src/lib/catchups-types.ts:153-157` (`CatchupRoundSection`), `:159-176`
  (`CatchupRoundView`), `:178-185` (`CatchupViewerRole`), `:203-211` (`CatchupArchiveRow`); de-export
  `NotifyBaseCtx` (`:222-227`, used only within the file); `src/components/catchups/home/types.ts:37-41`
  (`MAX_ACCEPTED_PROMPTS_PER_EDITION`, a dead copy of the actions.ts constant);
  `src/components/catchups/answer/types.ts:12-16` (`AnswerAsker`, a narrower re-declaration of
  `CatchupPersonRef`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip lists all of `CatchupRoundSection`, `CatchupRoundView`, `CatchupViewerRole`,
  `CatchupArchiveRow`, `NotifyBaseCtx`, `AnswerAsker`, `MAX_ACCEPTED_PROMPTS_PER_EDITION`
  (home/types.ts:41). My grep confirms: zero references outside their defining files. These are
  WP1's planned view models that the screen packages superseded with screen-local shapes
  (`home/types.ts`, `PublishedIssue` in console-published.tsx, `IndexCardView` in
  your-catchups-card.tsx, `HomeArchiveRow`) - the pattern the repo then correctly documented
  ("Kept local to home/ ... nothing outside this screen consumes these shapes"). The old shared
  copies were never deleted. `AnswerAsker` `{id,name,photoUrl}` is `CatchupPersonRef` minus optional
  fields; the answer page actually selects `birdOverride` too, so the type is also lying slightly.
- **What to do**: delete the four types + their doc comments; remove `export` from `NotifyBaseCtx`;
  delete home/types.ts:37-41; replace `AnswerAsker` with `CatchupPersonRef` in
  `answer/types.ts` (`asker: CatchupPersonRef | null`) and delete the type. While there: type
  `HomePromptView.category` as `PromptCategory | null` (it is `string | null` today, the one place
  the union is dropped).
- **Saving**: ~55 lines.
- **Risk & gate**: low; `npm run check` (pure types; tsc is the whole proof).
- **Confidence**: high.
- **Notes**: do NOT delete `CatchupIndexCard`, `CatchupPersonRef`, `CatchupEntryView`,
  `CatchupPromptView`, `CatchupSongView`, `EditionTiming`, the unions, or the five `Notify*Fn`
  signatures - all verified in use. `CatchupIndexCard` is used only by the index components; moving
  it into `components/catchups/index/` is optional tidiness, not required.

### catchups-07 - One date formatter instead of six local ones in three locales
- **Where**: `src/components/catchups/home/archive-shelf.tsx:20-28` (en-IN, short month),
  `home/console-published.tsx:31-39` (en-IN, long month), `index/fresh-off-the-press.tsx:21-28`
  (en-US, "Aug 5"), `round/masthead.tsx:49-56` (en-GB, long), `round/footer-tease.tsx:26-33`
  (en-GB, long), `home/extend-deadline-card.tsx:45-55` (en-GB, weekday, deliberate - keep).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: grep shows six `toLocaleDateString` calls in the territory while
  `src/lib/utils.ts:371-378` already exports `formatDisplayDate` (en-GB, short month,
  VALLEY_TIME_ZONE) - which the admin Catch-ups room uses. The same published date renders
  "5 Aug 2026" on the archive shelf, "Published 5 August 2026" on the inline console, "Aug 5" on the
  index rail and "5 August 2026" on the masthead. Three locale tags for one community whose every
  timestamp is deliberately in one timezone.
- **What to do**: use `formatDisplayDate` in archive-shelf and fresh-off-the-press (short forms);
  for the two long-month sites (masthead, console-published, footer-tease) either accept the short
  form or add one `formatDisplayDateLong` beside `formatDisplayDate` and use it in all three. Delete
  the five local helpers. Keep extend-deadline-card's weekday formatter (its comment argues the
  weekday is the point).
- **Saving**: ~30 lines, and one date voice.
- **Risk & gate**: low-medium: this changes rendered text, so `npm run visual` WILL flag /catchups
  if a date is on the baseline - that diff is intentional; look at it, then `visual:update` staged
  with the change. Owner should be told dates now read one way ("announce frontend changes").
- **Confidence**: high on the duplication; medium on which long/short mix the owner prefers -
  default to matching what each surface shows today (short where short, long where long) to keep the
  visual diff near zero.

### catchups-08 - Two NotAvailableCards, already drifted apart
- **Where**: `src/components/catchups/answer/not-available.tsx:10-32` (shared, `p-12`, `max-w-3xl`)
  vs `src/app/(main)/catchups/[catchupId]/page.tsx:486-511` (local copy, `p-[var(--space-l)]`,
  `max-w-2xl`, token margins).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the shared component's docblock claims it "Mirrors the Catch-up home's own
  NotAvailableCard ... copy and shape exactly" - no longer true. The home's local copy carries the
  2026-07-25 owner fix ("It was p-12: an arbitrary step, and far bigger than the copy it held")
  while the shared one in answer/ still has the pre-review `p-12` and hard-coded `mt-2`/`mt-5`.
  Same props, same JSX shape, four call sites in answer/page.tsx + two in [catchupId]/page.tsx.
- **What to do**: move the HOME page's version (the owner-corrected one) into
  `src/components/catchups/not-available.tsx` (it serves two routes now, so it leaves `answer/`),
  delete both old copies, update the six call sites. One decision to make consciously: `max-w-2xl`
  (home's) vs `max-w-3xl` (answer's) - take 2xl, the corrected file.
- **Saving**: ~26 lines, and the drift closes.
- **Risk & gate**: low. `npm run check`; eyeball `/catchups/<bad-id>` and
  `/catchups/<id>/answer` as a non-member (Jerry on a Catch-up he is not in).
- **Confidence**: high.

### catchups-09 - The frozen question list in console-answering re-implements console-collecting's QuestionRow
- **Where**: `src/components/catchups/home/console-answering.tsx:76-107` vs
  `home/console-collecting.tsx:371-413` (`QuestionRow`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: both render: avatar-or-"?" circle (identical classes, `h-7 w-7`, `bg-muted`,
  `text-[10px]`), question text (`text-sm leading-snug`), and an asker label - but the label logic
  is written twice and differently: collecting's `askerLabel` says "You" / "You (anonymous)" /
  name / "Someone in the group", answering's inline ternary says "asked by you" / "asked by {name}" /
  "asked anonymously". Same data, two vocabularies one status apart on the same page.
- **What to do**: export `QuestionRow` from console-collecting (or a tiny `home/question-row.tsx`),
  give it the `actions` slot it already has (answering passes none), and pick ONE label voice -
  the answering page's "asked by ..." reads better against the fix brief's plain-speech rule, but
  either is fine so long as it is one. Replace console-answering lines 76-107 with the mapped rows.
- **Saving**: ~30 lines.
- **Risk & gate**: low. `npm run check`; screenshot the home in `collecting` and `answering` states.
- **Confidence**: high.
- **Notes**: related smaller clone, noted not prescribed: the person-search result row in
  `create/people-picker.tsx:170-204` vs `home/people-panel.tsx` `AddPeople` (jscpd 728-729, ~12
  lines) - same BirdAvatar + name + batchYear + Plus button. A shared `PersonSearchRow` would
  couple the create flow to home/; tolerable duplication across that boundary, my judgement is
  leave it unless someone touches both anyway.

### catchups-10 - actions.ts carries two P2002 detectors, one of them imported
- **Where**: `src/app/(main)/catchups/actions.ts:187-190` (`isUniqueConstraintError`) vs the
  imported `isUniqueViolation` from `@/lib/prisma-errors` (imported at :85, used at :1601).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `isUniqueConstraintError` (used at :417 and :1733) is a hand-rolled
  `err.code === "P2002"` check; the same file already imports and uses the shared
  `isUniqueViolation` for the same purpose in `toggleEntryLove`.
- **What to do**: delete the local function; use `isUniqueViolation` at the two call sites.
- **Saving**: ~6 lines.
- **Risk & gate**: low; `npm run check`. (Verify `isUniqueViolation` matches P2002 the same way -
  it is the canonical helper the feed already trusts.)
- **Confidence**: high.

### catchups-11 - The Catch-up title one-liner exists four times; the exported one is the orphan
- **Where**: `src/app/(main)/catchups/[catchupId]/page.tsx:56-58` (`homeTitle` - bare group name),
  `[catchupId]/answer/page.tsx:58-60` (`surfaceTitle` - "{group} catch-up"),
  `round/[editionId]/page.tsx:67-69` (`roundTitle` - identical to surfaceTitle),
  `src/lib/catchups.ts:353-356` (`catchupTitle` - the plural "{group} Catch-ups", used only by its
  own unit test).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: the round page's own TODO (63-65) already names this: "this is now the third copy of
  the same one-liner ... It wants to be one exported helper in src/lib/catchups.ts, next to
  catchupTitle." Meanwhile knip flags `catchupTitle` itself as unused - the index and archive it
  claims to serve actually print `{groupName}` bare or via the admin room's own fallback.
- **What to do**: export from the core module (catchups-03): `catchupDisplayName(title, groupName)`
  = `title?.trim() || groupName` (homeTitle's rule) and `catchupSurfaceTitle(title, groupName)` =
  `title?.trim() || `${groupName} catch-up`` (the other two). Replace the three locals, delete
  `catchupTitle` and re-point its test at the new helpers (keep the fallback assertions - they pin
  real behaviour). Resolve the TODO comment.
- **Saving**: ~15 lines and one stale TODO.
- **Risk & gate**: low; `npm run check` (`catchups.test.mjs` updated in the same commit).
- **Confidence**: high.

### catchups-12 - Dead props and fields: `keeperName`, `initialPeople`, ArchiveShelf's `groupName`, a stale MemberStrip comment
- **Where**: `src/components/catchups/home/types.ts:90` + `[catchupId]/page.tsx:470` + the
  `createdBy: { select: { id: true, name: true } }` include at `[catchupId]/page.tsx:212`
  (`keeperName` is built and typed, rendered by nothing);
  `create/create-catchup-form.tsx:41,53,57` + `new/page.tsx:97` (`initialPeople` is always `[]`
  since the `?group=` preload died 2026-08-21 - the page's own docblock records the death);
  `home/archive-shelf.tsx:30` + `catchup-home-shell.tsx:106` (`groupName` accepted, never read);
  `[catchupId]/page.tsx:276` (comment explains ordering in terms of `MemberStrip`, a component the
  2026-07-25 review deleted - the ordering is real, the referent is gone).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep: `keeperName` has one write and zero reads; `initialPeople` has one caller
  passing the default; `groupName` is not in ArchiveShelf's destructure. All knip-invisible (props
  and object fields), found by hand.
- **What to do**: delete the four; `useState<PickedPerson[]>([])` inline; drop the `createdBy`
  include from the loadHome query (its only consumer was keeperName - `createdById` scalar stays);
  rewrite the :276 comment to say "the people panel shows only the first PILLS_SHOWN".
- **Saving**: ~15 lines and one fewer join in the home page's hot query.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### catchups-13 - De-export the six lib/catchups.ts symbols nothing outside the file (tests included) consumes
- **Where**: `src/lib/catchups.ts:129` (`ANSWER_WINDOW_DAYS`), `:130` (`PREPARING_HOLD_HOURS`),
  `:132` (`EXTEND_DAYS`), `:197` (`STATUS_ORDER`), `:465` (`dueReminder`), `:491`
  (`shouldExtendForNoQuestions`), `:622` (`questionsExtendPatch`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: knip flags ~25 exports here; most are false alarms - consumed by
  `catchups.test.mjs`, which knip cannot see (the known runner-config gap). I grepped each: these
  seven have zero references in ANY test or source file outside catchups.ts itself.
- **What to do**: remove the `export` keyword from the seven (do it during catchups-03's move so it
  is one touch). Everything else knip flags in this file STAYS exported for the tests: `DAY_MS`,
  `HOUR_MS`, `REMINDER_TWO_DAYS/LAST_DAY/EXTENDED`, `dailyBucket`, `withDailyBucket`,
  `daysLeftUntil`, `TICK_GRACE_MS`, `computeStatus`, `nextEditionStatus`, `planNextAction`,
  `valleyDaysLeft` - the fixer must not "clean" those.
- **Saving**: 0 lines; restores knip's signal for the next audit.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high (each grepped individually, word-boundary).

### catchups-14 - Small in-function sludge in actions.ts: the double select in `loadFreshEdition`, the array-of-one destructure in `submitPrompt`
- **Where**: `src/app/(main)/catchups/actions.ts:226-266` (the identical 9-field select written
  twice, then hand-reassembled); `:911-918` (`const [{ _max, _count }] = [await tx.catchupPrompt.aggregate(...)]`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: quoted above. The second select in `loadFreshEdition` re-reads after
  `advanceEdition`; correctness needs the re-read, not the re-typed select - a
  `const EDITION_CONTEXT_SELECT = {...} as const` used twice says the same thing in half the lines.
  The aggregate destructure wraps a single await in a one-element array literal for no effect.
- **What to do**: hoist the select object; write
  `const { _max, _count } = await tx.catchupPrompt.aggregate({...})`.
- **Saving**: ~15 lines.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### catchups-15 - lib/catchups.ts internal misfilings: an orphaned docblock and a function wedged inside another's doc
- **Where**: `src/lib/catchups.ts:112` ("Question window: 3 days. Answer window: 7 days..." sits
  directly above `newInviteToken`, describing constants that now live at 128-132);
  `:1118-1149` (the docblock at 1118-1124 describes `advanceEdition`, but `restoreOwnCatchupCopy`'s
  own docblock + body were inserted between it and `advanceEdition` at 1151, so `advanceEdition`
  reads as undocumented and the 1118 comment as floating).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read lines 107-132 and 1117-1155; the insertion seams are visible (the C-020 restore
  helper landed mid-file).
- **What to do**: move the one-line window summary down beside its constants; move
  `restoreOwnCatchupCopy` (with its docblock) below `advanceDueCatchups` so `advanceEdition`'s
  docblock touches its function again. Falls out for free if catchups-03 is executed.
- **Saving**: 0 lines; reading order only.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### catchups-16 - `CatchupEdition.theme` is a column the app never reads (the demo seed writes it into the void)
- **Where**: `prisma/schema.prisma` (`CatchupEdition.theme String?`); writers:
  `src/lib/demo-seed/seed.ts:399` (+ the `theme` field on the seed's round shape at :384 and
  `demo-seed/content.ts:855`); readers: none anywhere in `src/`.
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (code); the column drop itself follows the repo's manual-SQL rules
- **Evidence**: `grep -rn "theme"` over the whole territory + admin: zero reads of
  `edition.theme`/`select { theme }` anywhere; the only writer is the demo seed, whose value no
  surface renders. The spec's model (catchups.md:505) carries it as optional with no screen using
  it; the fix brief never mentions themes; scope fence 8 explicitly cuts "Themes / multiple cover
  presets".
- **What to do**: code side (safe now): drop `theme` from the demo seed's round shape and write.
  Schema side: remove the field from `prisma/schema.prisma`, `npx prisma generate` - the physical
  column can stay in Postgres harmlessly, or the owner can drop it later via a dated file in
  `prisma/migrations-manual/` (`ALTER TABLE "CatchupEdition" DROP COLUMN IF EXISTS "theme";`)
  applied with `scripts/dev/run-sql.mjs`, per the CLAUDE.md rules (never `db push`). Related but
  weaker: `Catchup.intro` is written only by the demo seed and read only by the admin room - alive
  on the demo deployment, so leave it; `Catchup.title` is likewise demo-written and drives the
  title fallbacks - leave it (see Owner decisions).
- **Saving**: ~6 lines code, 1 dead column out of the schema.
- **Risk & gate**: low-medium (schema touch). Gates: `npm run check`; the demo seed must still run
  (demo lens owns proving that); nothing selects the column so no query can break.
- **Confidence**: high on "no reads" (grepped `src` exhaustively); medium on ordering - coordinate
  with the data-model lens so the column isn't dropped twice.

## Owner decisions

- **The `draft` Round status is plumbing for a feature that does not exist.** The state machine,
  the status copy ("Draft"), the answer page's redirect copy, and the index sort all carry a `draft`
  state, but no code path ever creates a Round as `draft` - both creation paths and the
  next-Round opener write `collecting`, and there is no "stage a Round early" control anywhere. It
  costs maybe 15 lines across five files and it is named in the spec's table (2.2), so this is not
  bloat so much as a reserved seat. Recommendation: keep it (removing a state from a forward-only
  machine to save 15 lines is bad trade against ever wanting staged Rounds), but know that it is
  currently unreachable.
- **`Catchup.title` has no writer a member can reach.** The "a Keeper's custom title wins" fallback
  is implemented on four surfaces, but no settings control lets a Keeper set a title - only the
  demo seed writes one. Either a later session adds a "rename" field to the Keeper settings dialog
  (small), or the fallbacks quietly serve only the demo forever. Recommendation: add the rename
  control eventually; it is the only way the machinery earns its keep. Not urgent for release.
- **Finding 05 (physically splitting actions.ts)**: my recommendation is not to. Written there;
  flagging here because "the biggest file in the repo" will keep coming up in future audits, and a
  recorded decision would stop the re-litigation.

## Not-findings

Things that look like bloat and are verified intentional; do not re-litigate:

- **The comment mass** (actions.ts 602 comment lines, lib/catchups.ts 438). Spot-checked dozens:
  they carry audit IDs (B-061, C-125, C-029, M12, C-020...), owner quotes with dates, and
  concurrency reasoning. This is the "every constant argued for in a comment" owner standard,
  explicitly protected by the brief (4d). A handful restate code, but not enough to be a finding.
- **The dynamic imports in lib/catchups.ts** are not an LLM tic - the 31-45 docblock explains the
  `node --test` isolation they buy. Finding 03 removes the NEED for them; until then they are
  correct.
- **`catchup-caps.ts` / `catchup-shelf.ts` / `group-succession.ts` as three files**: each is
  constraint-driven (server-file export rules; shared with `retention.ts`; shared with
  `retention.ts` + `account-purge.ts` respectively). Charter question answered: three concepts.
- **The tick route** (`/api/catchups/tick`): 42 lines, no duplicated logic - it IS the "thin
  wrapper over advanceDueCatchups" spec 2.4 prescribed, and its jscpd hits are the shared
  CRON_SECRET header check every cron route carries (a repo-wide pattern for the API lens, not
  mine).
- **The charter's email-queue hypothesis**: catchups-notify could NOT reuse
  `src/lib/email-queue.ts` - that queue drains Resend-budgeted account mail (verify/reset/deletion
  templates), while Catch-ups is in-app `Notification` rows only, by explicit spec fence
  ("Email delivery: In-app notifications only. Resend stays unused.", catchups.md:817). They share
  nothing but the word "notify". In fact the influence runs the other way:
  `lib/post-notifications.ts` documents that it mirrors `clearCatchupNotifications`.
- **knip's "unused" verdicts on `catchups.test.mjs`/`catchup-lifecycle.test.mjs`/
  `catchup-shelf.test.mjs`** (files) and on most lib/catchups.ts exports: the known
  knip-runner-config gap; the exports are the tests' API (finding 13 lists the seven true positives).
- **`REMINDER_TWO_DAYS` / `REMINDER_LAST_DAY`** look dead ("legacy: superseded") but document the
  low-byte bit layout that `REMINDER_EXTENDED`/`REMINDER_QUESTIONS_EXTENDED` still occupy, and the
  bucket test uses them to prove flags survive bucket writes. Keep.
- **The five `loading.tsx` skeletons** (~276 lines): the repo mandates a warm-shimmer loading.tsx
  per async route, mirrored to the real layout to prevent shift. Correct by rule.
- **The songs limitation TODO appearing in 4 files** (song-attachment.tsx, answer/types.ts,
  round/answer-card.tsx, round page): deliberate cross-references to ONE canonical TODO
  (song-attachment.tsx names the `CatchupEntry.songs Json?` column). The owner's fix brief
  explicitly ordered "leave in place and flag, do not hack around".
- **people-panel.tsx at 717 lines**: five cohesive private components + one export,每 with owner
  decisions attached; splitting it would scatter the reasoning. Honest size.
- **`joinCatchupByToken`'s teacher check duplicating `layout.tsx`'s teacher redirect**: the join
  flow lives OUTSIDE `(main)` (public route), so the layout guard cannot cover it; both are needed.

## For other lenses

- **bugs**: `round/question-section.tsx:41-44` - PhotoWall prints `entry.body` raw while
  `round/answer-card.tsx:105` renders the same field through `renderRichText`; a photo caption
  containing formatting markers prints them literally on the wall and formatted on a card.
- **bundle/use-client**: 28 of the 39 catchups components are client files (`raw/use-client.txt`);
  the reader path (`round/*`) is properly server-first. The only lever I saw is finding 03's
  RSC-payload point; no `next/dynamic` candidates worth the churn (dialogs here are small).
- **admin-analytics**: `admin/catchups/page.tsx:137` and `[catchupId]/page.tsx:141` re-implement the
  `title ?? "{group} Catch-ups"` fallback by hand (the plural voice that `catchupTitle` was for);
  if catchups-11 lands, point them at the shared helper. Also jscpd 164-165: the two admin pages
  share a 13-line clone.
- **api-routes**: the CRON_SECRET + `timingSafeEqualStrings` preamble is cloned across
  `catchups/tick`, `retention/sweep`, `demo/reset` (jscpd 332-338) - a shared `requireCronSecret()`
  would serve all three.
- **components/common**: three hand-rolled overlapping avatar clusters (`-space-x-*` + BirdAvatar)
  in `index/your-catchups-card.tsx`, `answer/answer-experience.tsx`, `round/masthead.tsx` - if a
  cluster primitive ever exists, these are its first three customers; each differs (ring, size,
  links) so I did not propose one inside my territory alone.
- **layout/perf**: `advanceDueCatchups(userId)` runs on every authenticated page view via
  `(main)/layout.tsx:74`; it is scoped and swallow-safe, but it is two `findMany`s per page view -
  the 2k-user headroom lens may want to time it.
- **join flow**: `src/app/catchups/join/page.tsx` inlines the same Shell (Wordmark + 420px card)
  that `join/[token]/page.tsx:172-186` defines locally; a shared shell would save ~15 lines across
  the two public pages.

## Metrics

- Territory size: 61 files, ~12,071 lines (app/(main)/catchups 4,244 in 12 files; app/catchups 311
  in 3; tick route 42; components/catchups 5,417 in 39; libs 2,057 in 6). Companion tests: 1,306
  lines (catchups.test.mjs 880, catchup-lifecycle 375, catchup-shelf 51).
- Read fully: ~11,800 lines of the territory plus 1,057 lines of spec/brief and test slices.
- Biggest files: actions.ts 2,187; lib/catchups.ts 1,349; people-panel.tsx 717; [catchupId]/page.tsx
  580; console-collecting.tsx 413; round/[editionId]/page.tsx 410.
- Comment-heaviest (comment/code): catchups-notify.ts 0.57; catchups-types.ts 0.52; catchups.ts
  0.54; actions.ts 0.43 - all owner-standard reasoning, see Not-findings.
- Client components: 28 of 39.
- Duplication: 30+ jscpd clones inside actions.ts (finding 02); the 41-line select clone across the
  two reader pages (finding 04); 6 local date formatters in 3 locales (finding 07).
- Honest savings total across findings: ~550 lines code, 1 dependency cycle, 1 dead server-action
  endpoint, 1 dead DB column, ~2KB/request RSC payload on the Catch-up home.

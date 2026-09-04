# Refactor audit 2 — fix session prompt

**@ this file and nothing else.** It is the whole handover. Read it, do the next unfinished phase,
update the ledger at the bottom before you end, and the session after you can start the same way.

Audit: `docs/audit-fix/2026-09-03-refactor-audit-2/`. `report.md` is the deliverable — read §2 (the
phased plan), §4 (the owner's questions) and §5 (things you must not "fix"). The per-finding evidence
is in `work/agents/<territory>.md`, indexed in `work/findings-index.json`. The adversarial verdicts
are in `work/verify/`.

---

## Read this before you touch anything

**The findings are right and their line numbers are not.** 84 of the 369 findings were re-tested by a
hostile reader whose instruction was to refute. **None was refuted. Forty-five carried a wrong
detail** — an off-by-two range, a miscounted call site, a pin named in the wrong test file. Assume the
same ratio holds for the 285 findings no adversary reached. **So: trust the finding, open the file,
re-derive the range.** Never apply a stated line range without reading it.

**Two standing warnings that apply to whole classes of finding, not single rows.**

1. **Every "no caller passes this prop" claim needs a lab re-grep before you act.** Two sub-findings
   were refuted for exactly this: `GetInTouch` has seven call sites, five of them lab profile-variant
   rooms, and two pass the props the finding calls dead; `AdmissionStamp`'s `className` is passed by
   two more. The lab is typed and compiled — deleting those props fails TypeScript. Several finders
   grepped non-lab callers only.
2. **Every `prisma/schema.prisma` line number in the `data-layer` report is wrong** — the content is
   right, the coordinates are off by 85 to 130 lines. A verifier wrote the corrected map at the end of
   `work/verify/data.md`. **Use that map, not the report's citations.**

Seven verified corrections change a *recommendation*, not a citation. They are folded into §2 already,
but they are the ones that would have bitten you:

1. **`admin-analytics-07` — do NOT do the one-line `after()` move.** `touchLastSeen` calls
   `await headers()`, which throws inside `after()` in a Server Component. Its error handler is silent
   in production, so the naive fix breaks presence and tells you nothing. Read the headers during
   render, pass the facts in.
2. **`auth-edge-01` — `hint` is `FloatArea`'s prop, not `FloatField`'s.** The finding's "use
   `trailing` instead" alternative does not exist.
3. **`dead-code-07` — the stated range `:112-122` includes `sectionVariants`, which is live** at
   `:249`. Deleting it as written breaks the landing hero's stagger.
4. **`media-viewer-09` — `IDLE_MS` never moved from 2.6 s to 3.6 s.** Drop the instruction to put it
   "back".
5. **`bundle-build-05`** — its `/welcome` half is superseded by `directory-profile-03`; take only the
   `person-detail.tsx:25` half. The figure is 115.7 KB, not 126 KB.
6. **`duplication-05`** — passing `m.index` to `balancedBody` coerces a number through `text.match()`
   and silently matches elsewhere. Pass the RegExp it already accepts.
7. **`dependency-diet-03`** — `phase9-probe.mjs:39` is **already failing today**, and the claimed
   saving on the security status board does not exist.

**Do not re-propose what two audits have now refuted.** §5 of the report is binding: the
`withMember`/`withAdmin` action-gate wrapper (`gate-coverage.test.mjs` forbids a non-async export in a
`"use server"` file), a `tsconfig` `exclude` of the lab (Next's generated route types pull every page
back in — measured twice), the comment mass, the shadcn kit, the C-189 preamble clones, the lab↔shipped
clones. If you think you have new evidence, put it in the ledger before you act on it.

**House rules that apply to every commit here**: work on `main`, no branches. `npm run check` before
every commit, and never at the same time as `npm run visual`. Stage by pathspec — `git commit -- <paths>` —
because another session may share this tree. One revertable change per commit: the code, its test, the
`progress.md` entry and the doc edit ride together; no trailing `docs:` commit. 150 words is the hard
ceiling on a commit message. Pushing is a deploy: **ask first.**

---

## The order to work in

Phases A → C are worth doing whatever the owner decides about the rest. Do not start Phase D, G or any
row marked T4 until the owner has answered §4.

### Phase A — free money (10 rows, all T1, one sitting)
Config scoping, two dependency removals, two pieces of broken QA tooling, and a set of orphan deletions.
Every row's gate is `npm run check` plus `npm run visual`. Expect **−73 KB of CSS on every route,
−100 MB of `node_modules`, −235 lockfile entries, −831 KB tracked, and two quality tools that start
telling the truth.** Row A11 (`docs/spec/media.md` §4.2/§4.4) is documentation but belongs in this
phase: it is the file `CLAUDE.md` sends a media session to, and it teaches a three-variant image
pipeline that **has never existed** — the exact hallucination the owner has complained about twice.

### Phase B — bundle levers (9 rows, T2/T3)
One root cause, four times over: *a server component that statically imports a client component puts
that module in the route's bundle whether the branch renders or not.* **Measure before and after with
`work/raw/route-js.mjs` against a fresh build — a row that does not move the number is a row that did
not work.** B1 is the largest single lever on a public route. B2 carries a trap: `next/dynamic` does
not forward refs, so fill the hoopoe controller from `onReady` or the bird is silently inert — and
**correct `not-found.tsx:20-22` in the same commit**, because it tells you the sidebar shows the bird
at first paint, and it does not.

### Phase C — the query floor (9 rows, T2)
Nine changes take an authenticated page from seven queries before its own down to four or five. C1, C2
and C5 share one idiom (`cache()`, and the `FILTER` aggregate the same files already use). C4 is the
one with the correction above.

### Phase D — switched-off subsystems (owner-gated)
Nine subsystems that work and nobody can reach. **Every one that touches a database column carries a
`SELECT` in its report: run it first, paste the result into the ledger, then cut.** These are the rows
that move source lines; nothing before them does, much.

### Phase E — de-duplication that closes a drift (7 rows)
Line-neutral by design. Do them for the drifts, not the lines: **one of three upload clients has the
abort timeout, the Catch-up copy runs a 5 MB pre-check before the shrinker, the avatar path misses
blank-MIME HEIC, three of four emails have drifted into two wordings of one message, and
`import-album.mjs` — the one script that writes photographs — has no demo-destination guard.**

### Phase F — hygiene, in one pass, last
Stale comment blocks in eleven territories, the documentation drift, and the two recurrence mechanisms
(`progress.md`'s archive rule and the audit-archive rule) that stop this list regrowing.

### Phase G — architecture and taste, one at a time
Nothing here starts until A–C are done and green.

---

## Outside your scope — hand these over, do not fix them here

The report's §2 tail lists correctness and security leads found while auditing. **They belong in
`docs/planning/bugs.md`, not in a simplification commit.** The exception already taken: ORCH-04, the
notification-retention divergence, which the owner answered mid-audit and which shipped as `74cc61a`.

---

## Sequencing and gate traps

These come from the verifiers' working notes (`work/verify/*.md`), not from the finding reports. Each
one is a thing that would turn `npm run check` red, or silently undo another row, if you did the rows
in the obvious order.

**Tests that go red when you delete the thing they pin.**
- Deleting `approvePhoto` / `approvePhotos` (D4) turns `src/lib/image-purge-rule.test.mjs:253-264`
  (C-074 / C-130) red. **Re-point that pin at `admin/review/actions.ts:89-102` in the same commit.**
  The finding claims no rule test covers it; the finding is wrong.
- `image-purge-rule.test.mjs` also pins *counts* across the whole of `collection/actions.ts`
  (`putAllOrNone == 2` at `:151`, `createPhotoRow == 2` at `:145`, `Promise.all([putImage == 0` at
  `:152`). So **`fresh-code-01`'s shared-ingest plan breaks it and `media-viewer-04`'s encode-only
  helper does not.** Do `media-viewer-04` first; treat `fresh-code-01` as the ambitious follow-up.
- `scripts-ledger.test.mjs` only sees a *new* script after `git add`, so a new shared module passes
  `npm run check` and then fails at commit unless its `scripts/README.md` row ships in the same edit.
  Its second test fails on any *deletion* until every backticked mention of the file leaves that
  README — prose included.
- `check.mjs`'s `findUnrunTests` reds the build if any test-shaped file under `src/` or `scripts/` is
  not named `*.test.mjs`. The `MIN_TEST_FILES = 60` floor is nowhere near binding at 102 files.
- `auth-first-frame.test.mjs:41` pins a literal class string; E9 must widen it in the same commit.
- `append-page.test.mjs:94` asserts `appendUnseen(` is present in `collection-client.tsx` **by path**,
  so G5's decomposition moves a pin the finding's list does not mention.
- **D5 (`area` / `freeTags`) breaks two files the finding's remediation list misses**:
  `scripts/dev/import-album.mjs:405` names both columns in an explicit `INSERT` column list, and
  `src/app/lab/collection/_archive.ts:147,149` constructs a `Photo` with them.
- Deleting the tour tooling (A6) also needs `scripts/qa/_dev-login.mjs:19`, which names
  `tour-mobile-verify.mjs` in prose.

**Rows that must travel together.**
- A7's allowlist deletion **must** also fix `scripts/qa/phase9-probe.mjs:39`, which hard-codes the
  advisory id and is already failing at HEAD.
- `scripts-e2e-ci` 03 + 04 + 15 are **one commit**: 15's `chromePath` and 03's viewport are parameters
  of 04's shared module.
- Four of `scripts-e2e-ci-10`'s nine README corrections (`:50`, `:118`, `:123`, `:126`) must ship
  inside findings 13, 05, 07 and 01 rather than in 10 itself.
- `bundle-build-01` and `dependency-diet-15` edit the same eight lines of `motion-features.tsx`.
- C2, C3 and C4 all touch `(main)/layout.tsx`. Order them: `data-layer-07(a)`, then
  `shell-primitives-03(a)`, then `admin-analytics-07`.

**Swaps that are not drop-in replacements.**
- `admin-analytics-05` (`MailCard` = `MailRows`): `MailCard` uses `formatDisplayDate` (absolute) where
  `MailRows` uses `formatTimeAgo` (relative), and `MailRows`' `showActions` renders *Try again* and
  *Clear* on **every** row. Swapping changes what an admin sees.
- `media-viewer-12`'s shared cross-dissolve needs a variant-key rename plus the stage's
  `pointerEvents` exit — the viewer's keys are `enter/center/exit`, the stage's are `enter/here/leave`.

**Fixes that would work against another row.**
- `duplication-17` must **not** be fixed by importing `clamp` from `hoopoe-kit` — that pulls in
  `common/motion` and works directly against B2's deferral.
- `lab-07` and `landing-mascot-avatars-03` are **one** owner decision, and one of `-07`'s four waiters
  lives inside the switched-off showcase. Use `-03`'s steps: they catch `protocol-audit.mjs:120-121`
  and `section-reveal`'s five lab consumers.
- `lib-core-config-05` must not add a **fourth** `.env` parser. `scripts/dev/_env.mjs` already exports
  `readEnv`/`loadEnv`, and the two parsers disagree on **values**, not just keys. Adopt `dotenv`.
- `lib-tests-05`'s pre-filter needs a new count guard, because
  `identity-row-overflow-rule.test.mjs` has none and the filter could silently empty its loop.
- **`collection-01`'s proposed `replaceState` fix is a proven no-op in Next 16.3.3.**
  `copyNextJsInternalHistoryState` (`app-router.js:84-95`) copies the internals tree even when `data`
  is null, and `navigateToUnknownRoute` is reachable only from `ACTION_NAVIGATE`, never from the
  `ACTION_RESTORE` a `replaceState` produces. Measure it in chrome-devtools first (count `?_rsc=` GETs
  against action POSTs after one bucket press) and **start the bisection at `router.refresh()` and
  PostHog, not at line 418.**
- **`dead-code-05`: do NOT drop `export` from `hoopoe-geometry.ts:32`** on the strength of the named
  imports. `src/app/lab/hoopoe-marks/_parts.tsx:25` re-exports `H` (`export { H, G } from ...`), which
  the finding missed by reading only the import block above it, so the change fails TypeScript and
  `npm run check`. Delete `H` from that re-export line in the same edit — nothing imports `H` from
  `_parts`. This is the audit's **one outright refutation**, and it would have cost a red build.

**Security-sensitive rows where verification changed the answer.**
- **`auth-edge-03` changes behaviour by one branch.** `humanPassValid` compares the whole
  `${ts}.${sig}` string, so `<ts>.<sig>.junk` is **accepted today** and would be refused after the
  merge. That is a correction on a signup gate, not a confirmation — decide it deliberately.
- **`auth-edge-02`'s stated gate is unsound.** Nothing anywhere pins `TICK_HUMAN_BOX` or
  `BOT_CHECK_BLOCKED` — `phase4-probe.mjs` does not assert those sentences. The only proof is a manual
  `TURNSTILE_DEV_CHALLENGE=1` pass on all three forms.
- **`auth-edge-08`: the dead lines are `next-auth.d.ts` 43, 44, 47 and 48 — not the contiguous 43-48**
  the summary implies. Lines 45 and 46 are the live `batchType` / `batchYear`.

**Two findings the find phase reported and verification refuted — do NOT fix them.**
- `feed-posts-07`'s poll-option whitespace hole **does not exist**: the pre-parse filter at `:155`
  strips whitespace-only options on every path, and the proposed fix would make a 1-option array fail
  Zod's `.min(2)` and refuse the whole `createPost` instead of silently dropping the poll.
- `duplication-03`'s blank-MIME HEIC is **safely refused** by `sniffImageType`
  (`upload-shared.ts:268-288`), which merely gives a misleading reason. Fix the message if you like;
  there is no hole.

**More gate traps found in the later waves.**
- **`catchups-15`'s fix will turn `npm run check` red**: `catchups-core.test.mjs:833-838` (C-141) pins
  the exact line it deletes.
- **`data-layer-11`'s remedy for `catchups-round-view.ts:103-113` would add a `verifyState` column
  that `letters/[id]/(read)/page.tsx:63-71` documents as deliberately absent for the same byline.**
  That file also already imports `IDENTITY_SELECT` at `:42`, contrary to the finding.
- **E1's merge**: take `media-viewer-06`'s line ranges and steps, keep `duplication-02`'s timeout
  rationale, drop `catchups-04(b)` as redundant — and gate on `upload-size-rule.test.mjs` **plus the
  C-182 pin at `catchups-core.test.mjs:844-874`, which neither report names.**
- **`feed-posts-14(b)` is refuted: decline the move.** Its premise is that this is the only
  `"use server"` file under `components/`; there are twelve.
- **Adopting `Opener` verbatim strips a border**: `answer-photos.tsx:68` also lacks
  `border border-border`, so `media-viewer-03`'s shared opener changes `post-card`'s pixels.
- **`data-layer-01` and `-02` have wider blast radii than stated**, which changes their tiering: `-01`
  walks into the post-visibility security pair and its pinned `post-visibility-rule.test.mjs`
  (`RULE_FACTS` at `:332`), and `-02` walks into `image-facts.test.mjs` plus `meanChroma`.
- **`directory-profile-15`'s diagnosis survives but both supporting facts are wrong**:
  `admin/people/actions.ts` does **not** import `adminDeleteUser`, and the four pins that hard-code the
  file path are `gate-coverage:219`, `admin-guard-rule:19`, `unattended-rule:305` and
  `scripts/qa/audit-status.mjs:246` — the last a check-gate script, not a test.
- **`directory-profile-02` (B7): the `/directory` visual baseline masks `main svg.touch-none`**, which
  `ssr: false` removes from the server HTML. Expect the mask to stop matching and update it knowingly.
- **`data-layer-10`: deleting the `loaded` parameter breaks C-174** at `profile-editor-rule.test.mjs:83`,
  and its export half is **ten** call sites, not one.
- **A11 (`docs-02`): do not overcorrect.** `media.md`'s 480 px / q72 thumbnail row is *right*; its
  1600 px / q80 row is right **for the FormData fallback only**; only `originalUrl` (3000 px) never
  existed. Document **two** Collection encode paths — direct is 40 MP at q100, fallback is 1600 px at
  q80 — or you replace one wrong fact with another. `TRAPS.md`'s flat "does NOT downscale" and
  `schema.prisma:270`'s `// 1600px` comment have the same gap.
- **`docs-01`: archiving audit 1's `work/` is not free** — `report.md` and `fix-prompt.md` cite it
  13 times; rewrite those citations in the same commit.
- **`lab-01`'s member-JS paragraph is refuted** — and so was my own stronger version of it. The lab is
  not free to members: 49 of 52 routes shrink without it, ~0.1 % on average, 23 KB on `/verify-email`.
  Do not cite "zero bytes"; see ORCH-02.
- **`lab-05` says delete `Sheared`. Do not** — it has three in-file uses at
  `lab/type/_specimens.tsx:101,118,144`.
- **`shell-primitives-12` says `THEME_COLORS` must stay exported. It need not** — the pin reads source
  text and never mentions `export`.
- **`dead-code-09` misdescribes one site**: at `photo-river.tsx:472` the render prop is
  `(p, i, cell)` and `p` **is** used; the unused parameter is the middle one.

**Ordering the later waves added.**
- `fresh-code-20` before `feed-posts-15` — its class strings live inside the region 15 wants to move.
- `fresh-code-07` and `fresh-code-21` both rewrite `directory-client.tsx` — one session. Take
  `fresh-code-07`'s `fullWidth` steps over `directory-profile-17e`'s, but note **both miss
  `people-list.tsx:122-123`**.
- `media-viewer-01` before `media-viewer-03` — 03's shared opener wants 01's preload module.
- `catchups-10`, then `catchups-03`, then `catchups-02`'s prompt-library half **and measure the home
  chunk**, because 02 turns `catchups-core` (922 lines) into a client value import.

**Rows whose stated saving is unproven or negative.**
- **`member-surfaces-13` may ADD bytes to `/support`.** Its premise is that `animate` / `useInView`
  already ship; across non-lab source they do not appear on that route. Measure before you swap the
  hand-rolled rAF count-up for `motion`.
- **`shell-primitives-14`'s shared `onDark` constant would visibly change a button**: love uses
  `text-white/85`, share uses `text-white/80`. Pick one deliberately and screenshot it.
- **`landing-mascot-avatars-15`'s suggested `takeOffRaw(0)` does not typecheck** — the signature is
  `(dir: 1 | -1 = 1)`. Widen it first.
- **`member-surfaces-02` (B12) saves ~22.6 KB for both components in one chunk, not ~44 KB.** The
  finder's chunk markers were JSX prop names that live in the caller's chunk; the honest proof is
  callee-body strings.
- **B2 and B3's route counts are both softer than the reports say.** Two verifiers disagree on how
  many routes B2 frees (23–25 vs 28), and B3's 8,508 B chunk is isolated on only 10 of the 26 routes
  that carry it. Quote a measured delta, never a route count × chunk size.

**Two things only the owner or a browser can settle.**
- `collection-08` and every other column drop want their `SELECT` run against **production and demo**
  before anything is dropped.
- Whether the stranded-originals dry run returns 0 — nobody in this audit could run it.

---

## Ledger

Update this every session. One row per phase attempted, with what actually happened — including what
you could not do and why.

| Date | Phase | Rows done | Measured result | Notes / what the next session must know |
|---|---|---|---|---|
| 2026-09-04 | — | audit closed | see `report.md` §1b | Nothing fixed yet except ORCH-04 (`74cc61a`). Verification covered 84 of 369 findings; the other 285 have orchestrator spot-checks only. |

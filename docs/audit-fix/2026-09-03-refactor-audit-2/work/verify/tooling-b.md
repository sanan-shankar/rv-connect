# tooling-b — adversarial verification (refactor audit 2)

HEAD at verification: `72b5a1d` ("fix(viewer): the chrome stays under a resting cursor…").
Charter: `scripts/`, `e2e/`, `.github/`, the unit tests. 17 finding ids.

## IMPORTANT — the working tree moved under me mid-verification

At the start of this session `git status --short` was clean apart from the untracked audit
folder. Partway through, a **peer session (the orchestrator, tagging itself `ORCH-04`) began
applying the notification-retention fix in the shared checkout**. As I write, the tree holds
uncommitted edits to:

```
 M .github/workflows/snapshot.yml      (--days 30 removed, step renamed "Prune stale notifications")
 M docs/SECURITY.md                    (Notifications 1 year -> 30 days, + a dated paragraph)
 M scripts/ops/prune.mjs               (DEFAULT_DAYS 365 -> 30, banner rewritten)
 M src/lib/retention.ts                (KEEP_DAYS.notifications 365 -> 30, 12-line rationale)
 M src/app/(main)/notice/[id]/page.tsx
 M src/app/(policies)/privacy/page.tsx
 M src/lib/notification-reach.test.mjs
 M src/lib/post-notifications.ts
```

The owner has evidently settled the window at **30 days** (SECURITY.md's new paragraph says so
verbatim: *"The owner kept the behaviour and moved the promise; the flag is deleted"*).
All my verdicts below are stated **against HEAD** (checked with `git show HEAD:<path>`), but a
fix session must NOT re-apply `lib-core-config-01` / `scripts-e2e-ci-02` — they are being done
right now. **Still not done in that WIP: `docs/OPERATIONS.md:117` ("notifications 1y") and
`:153` ("`scripts/ops/prune.mjs --days 30`") are both still wrong in the working tree.**

---

## scripts-e2e-ci-01 — delete `tour-mobile-verify.mjs` + its test — CONFIRMED

- `wc -l` → 248 + 26 = **274 lines**, exactly as claimed.
- The tour is gone. `grep -rn "Product tour|data-tour|hoopoe tour" src/ e2e/` returns **one**
  hit and it is a comment: `src/components/demo/demo-bar.tsx:43` "The hoopoe tour used to…".
  `ae5bc9a`'s message: "the removal is total rather than a flag".
- The script's two anchors are both dead: `tour-mobile-verify.mjs:107`
  `document.querySelector('[role="dialog"][aria-label="Product tour"]')` and `:168`
  `b.textContent?.trim() === 'hoopoe tour'`.
- The test asserts only that the *source text* still contains three dev-login safety patterns.
  A security pin on a corpse — accurate description.
- Ledger: `scripts/README.md:126` is the only README mention (`grep -n tour-mobile-verify` → 1).
  `scripts/qa/scripts-ledger.test.mjs`'s second test ("names no script that has been deleted")
  matches **bare backticked basenames anywhere in the file**, so removing that one row is
  sufficient and necessary.
- `cookieDomainForBaseUrl` cascade verified: `local-base-url.mjs:30`, one non-test caller
  (`tour-mobile-verify.mjs:8,92`), two assertions (`local-base-url.test.mjs:42-43`).
- Test-file count today is **102** (`find src scripts -name "*.test.mjs" | wc -l`), floor is
  `MIN_TEST_FILES = 60` (`check.mjs:69`) → 101 is comfortably fine.

**Correction the finding missed:** `scripts/qa/_dev-login.mjs:19` names this file in prose as the
exemplar for the whole shared-sign-in module ("Only tour-mobile-verify.mjs got this right, with a
comment explaining why"). Not gated by anything, but deleting the file leaves a comment pointing
at a ghost; reword it in the same commit.

## scripts-e2e-ci-02 — `snapshot.yml --days 30` re-opens M55 — CONFIRMED (already being fixed)

At HEAD, every element checks out:
- `git show HEAD:.github/workflows/snapshot.yml` → step named `Prune notifications older than 30
  days`, `run: node scripts/ops/prune.mjs --days 30`.
- `git show HEAD:scripts/ops/prune.mjs` → `const DEFAULT_DAYS = 365;` under the comment "Matches
  KEEP_DAYS.notifications in src/lib/retention.ts. Change it there."; and at :59-62 the stale
  "the owner asked for a flat 30 days".
- `git show HEAD:src/lib/retention.ts` → `notifications: 365`.
- `git show HEAD:docs/SECURITY.md:85` → `| Notifications | 1 year |`;
  `docs/OPERATIONS.md:117` "notifications 1y", `:153` "`prune.mjs --days 30`".
- Schedules: snapshot `cron: '10 0 * * *'` (00:10 UTC), retention `cron: '0 21 * * *'` — the
  3h10m gap the finding states, and it is written in snapshot.yml's own header.
- `git log -S"DEFAULT_DAYS = 365" -- scripts/ops/prune.mjs` → `d77197a`;
  `git log -S"prune.mjs --days 30" -- .github/workflows/snapshot.yml` → `6adb61c`, untouched since.

**Correction:** `docs/OPERATIONS.md:153` sits inside the `### snapshot.yml` section (headings at
134 and 157), so "The same job" there means snapshot.yml and is correct about *which* job — only
the number is wrong. No gate reads any of this: `ci-parity.test.mjs` scopes itself to
`check.yml` by construction (`const WORKFLOW = ".github/workflows/check.yml"`, and its header
says why).

## lib-core-config-01 — one retention number — CONFIRMED (overlaps 02; this is the safer write-up)

Same facts, wider blast radius, and it is the one a fix session should follow, because it treats
the *number* as the owner's call and spells out both branches with their consequences (~12x
Notification table growth on the 365 branch, against a 500 MB free tier). scripts-e2e-ci-02
proposes only "drop the flag", which silently picks the 365-day branch — the more expensive one,
and not what the owner has now chosen. Where they disagree, **lib-core-config-01 is right**.

Verified extras in this finding: `retention.ts:81` is `presence: 90` (not a notifications key —
the finding cites `:81` as the `SweepResult` key; at HEAD line 81 is inside `KEEP_DAYS`, so that
one line reference is off, but the sweep step at `:176-180` and the result key both exist).
`docs/SECURITY.md:85` at HEAD does say `1 year`.
No retention-window rule test exists — confirmed by grep; the "For other lenses" note that this
gap is worth closing is a fair one, and the ORCH-04 WIP does not add one.

## scripts-e2e-ci-03 — `--mobile` is a desktop at 390px — CONFIRMED WITH CORRECTIONS

Mechanism confirmed by reading all six scripts:
- `screenshot-auth.mjs:43-45` `mobileFlag ? { width: 390, height: 844 } : …` — no `isMobile`,
  no `hasTouch`, no `deviceScaleFactor`. Same bare object in `verify-shot.mjs:17`,
  `theme-shots.mjs:45`, `_dir-room-shots.mjs:46`.
- `screenshot.mjs:48-52` is correct and carries the comment explaining the flag "was documented
  in the CLAUDE.md table but only ever implemented in the auth variant".
- `drive.mjs:673-681` correct, with the reason in a comment.
- The skill the owner's own loop uses, `.claude/skills/screenshot-auth/SKILL.md:21-22`, invokes
  the defective flag. So the QA-loop-correctness framing is right.

**Correction 1 — `map-cluster-verify.mjs` is already correct and needs no change.** Lines 50-53
set `{ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }`, and
lines 89-92 *assert the emulation took* (`window.matchMedia("(pointer: coarse)").matches`, with
`if (mobile && !coarse) fail.push(...)`). The finding's "check its viewport too" implies a
possible defect there; there is none.

**Correction 2 — the "every `hover:` class" fear is refuted.** I counted the shipped stylesheet
`.scratch/audit2-build/.next/static/chunks/32v74upyu8cz7.css` (238,434 B): **169 occurrences of
`:hover`** but only **7 hover media blocks** (6 × `@media (hover:hover)`, 1 ×
`@media (hover:hover) and (pointer:fine)`), plus 1 `@media (pointer:coarse)` and 1
`@media (pointer:fine)`. Tailwind v4 is *not* wrapping `hover:` variants here, so the blast
radius is the 9 explicit media blocks, not the whole app. The finding's own "medium confidence"
hedge on that point should be struck.

**Correction 3 — the proposed proof will show nothing.** The finding's gate says "run
`screenshot:auth … --mobile` and confirm the carousel arrows are gone from the second shot".
`photo-carousel.tsx:369-376` is `hidden … opacity-0 group-hover/carousel:opacity-100 …
[@media(pointer:fine)]:grid` — the arrows are `display:grid` on a fine pointer but still
`opacity:0` unless the cursor hovers the carousel, and neither script hovers. Use
`comments-section.tsx:674` instead, which is the genuinely visible one:
`opacity-0 … [@media(pointer:coarse)]:opacity-100` — the comment overflow menu is **invisible in
today's fake-mobile shot and always visible on a real phone**. `menu-material.ts:42`
(`[@media(hover:hover)_and_(pointer:fine)]:after:hidden`) changes hit area only, not pixels.

Playwright is unaffected: `e2e/playwright.config.ts:117-124` spreads `devices["iPhone 13"]` and
re-asserts `isMobile: true, hasTouch: true`.

## fresh-code-15 — `apple-edge/look.mjs` writes to a repo-root folder — CONFIRMED

`scripts/dev/apple-edge/look.mjs:17` `const OUT = '.tmp-shots/edge';`, `:18` `mkdirSync(OUT,
{recursive:true})`. `.gitignore:99` `.tmp-shots/`. `grep -rn tmp-shots` over the tree → exactly
those two lines. The folder does not exist today (`ls -a` of the root). CLAUDE.md's screenshot
rule ("screenshots go to `e2e/.shots/`… Nothing puts an image at the repo root any more") is
contradicted.

**Two corrections.** (a) `look.mjs` does **not** `process.chdir(repoRoot)` (unlike
`scripts/dev/shot-clip.mjs:5-6` and `scripts/qa/verify-shot.mjs:11-12`), so `OUT` is relative to
wherever it is invoked — it lands in the repo root only because that is where everyone runs it.
Adding the chdir is part of the fix, not just the path. (b) There is **no gate here at all**:
`scripts/qa/hand-run-passes.test.mjs` only inspects `*-pick.mjs` files (`:30` builds `PASSES`
from `readdirSync(DEV)`, `:57` greps `const OUT = path.join(...)`), so `look.mjs` is outside it.
The finding's "gate: none. Not run by anything" is right; CLAUDE.md's claim that that test
catches an OUT climbing to the root only holds for the pick scripts.

## landing-mascot-avatars-09 — three `apple-edge` scripts read into `sanan's stuff/` — CONFIRMED

`grep -n "sanan's stuff" scripts/dev/apple-edge/*.mjs` → `compare.mjs:8`, `truth.mjs:3`,
`truth-profile.mjs:6` — all three the literal `"sanan's stuff/Inspiration/not yet right.png"`.
(I did not open the file itself; brief §2.2 forbids reading under that folder.)
Audit-1's open owner decision is real and still open: `report.md:445` item 15, and
`fix-prompt.md:128` "…'sanan's stuff' move (#15, owner does it himself)".
`scripts/README.md:90-109` is the harness section, and it documents each script's purpose but
says nothing about the external dependency; line 108 does say "Their PNG output is ignored, not
committed", which is where the `.tmp-shots` note belongs too (finding fresh-code-15).
No gate: nothing runs these.

## landing-mascot-avatars-16 — icon pipeline has no entry point; `shot-clip.mjs` ignores the Chrome override — CONFIRMED

- `build-app-icon.mjs:11-12` is the only record of the run order (two lines of a docblock).
  Seam assertions at `:58-66`; the matching post-substitution assertion at
  `generate-icons.mjs:67-74`. Both exactly as described, and both well argued.
- `package.json:5-24` has `dev:centroid` and `dev:shot-clip` and **no icon script**.
- `shot-clip.mjs:10` `executablePath: "/Applications/Google Chrome.app/…"` with no
  `PUPPETEER_EXECUTABLE_PATH ||`. Contrast `shot-svg.mjs:15-16` (has it, plus an `existsSync`
  fallback), `centroid.mjs:29` (has it), `apple-edge/look.mjs:22` (has it). All four line
  references are exact.
- `src/lib/app-icon-safe-zone.test.mjs` exists and the committed icons were last touched by
  `48e3312` ("fix(icons): compose the maskable icon against Android's safe zone"), so the
  "in sync today" claim holds.
- The warning not to wire this into `npm run check` is correct: `ci-parity.test.mjs`'s third
  test pins that `check.mjs` still names `npm-audit-gate.mjs` and `audit-status.mjs`, and the
  first test pins that `check.yml` runs only `npm ci` / `npm run check` — adding a gate to
  `check.mjs` is allowed, adding a step to the workflow is not.

## lib-core-config-04 — demo photograph pipeline has never produced a photograph — CONFIRMED

- `src/lib/demo-seed/photos.generated.ts` is 15 lines ending `export const GENERATED_PHOTOS:
  DemoPhoto[] = [];`; `git log --follow` → exactly one commit, `0ea3174`.
- `seed.ts:39` imports it, `:313` `const allPhotos = [...GENERATED_PHOTOS, ...DEMO_PHOTOS];`.
- `ls -d demo-photos` → No such file or directory. `.gitignore:76` `demo-photos/`.
- `docs/spec/demo.md:137` "put images in `demo-photos/` at the repo root" — the direct conflict
  with CLAUDE.md's closed-root rule, confirmed by reading both.
- `scripts/demo/add-photos.mjs` is 201 lines; `content.test.mjs` imports `DEMO_PHOTOS` only
  (`:13,48,90,181,227`) and never `GENERATED_PHOTOS`, so option 3 leaves it green as claimed.
- Ledger row exists at `scripts/README.md:63`.

**Correction:** the inbox constant is at `add-photos.mjs:29` (`const INBOX = resolve(ROOT,
"demo-photos")`), not `:31`; the human-facing copy of the path is at `:5`. Also
`src/lib/demo-seed/photos.generated.ts:3` hard-codes the same folder name in its generated
banner, so option 1 is **four** places, not two.

## lib-core-config-05 — one `.env` reader for `scripts/demo` — CONFIRMED WITH A BIG CORRECTION

The three copies are real and I read all three: `apply-schema.mjs:33-46` (`readEnvDemo`),
`seed-demo.mts:27-43` (`loadEnvFile`), `verify-guard.mts:19-28` (inline). The parse loop and the
quote-strip are identical across the three. `seed-demo.mts:47` really is
`const mainEnv = loadEnvFile([".env", ".env"]);` — `.env` twice.

**Correction — do not write `scripts/demo/env.mjs`; `scripts/dev/_env.mjs` already IS this
module.** It exports `readEnv(files)` and `loadEnv(files)`, has a row in `scripts/README.md:88`,
and its banner already documents the *exact* artefact this finding rediscovered: *"Seven of them
carried this parser verbatim, and five of those carried the same leftover with it:
`for (const file of [".env", ".env"])`, the second entry a `.env.local` that stopped existing."*
Adding a fourth parser in `scripts/demo/` would be the thing the audit is meant to prevent.

**Second correction — the two regexes are not identical, so a swap is not behaviour-neutral.**
`_env.mjs:34` uses `/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/` (greedy `.*`, trailing whitespace is
KEPT); all three demo copies use `(.*?)` (lazy, trailing whitespace is STRIPPED). A DSN with a
trailing space in `.env.demo` behaves differently. Reconcile deliberately, in one direction,
with a comment.

**Third correction — the ledger question resolves to "yes, a row is needed".**
`scripts-ledger.test.mjs`'s `trackedScripts()` filters out only `*.test.mjs`; helper modules are
in the inventory (which is why `_env.mjs`, `_dev-login.mjs` and `_probe-kit.mjs` all have rows).
Reusing `_env.mjs` avoids the question entirely.

The doc-drift ride-alongs check out: `seed-demo.mts:5` says `scripts/demo/seed-demo.ts` and the
file is `.mts`.

## lib-core-config-14 — the `lint` npm script nothing runs — CONFIRMED

`package.json:9` `"lint": "eslint"`. `scripts/qa/check.mjs:109` `await run("npx", ["eslint",
"src"])` — direct, not through the script. `grep -rn "npm run lint"` across `docs/ scripts/
.github/ .claude/ CLAUDE.md AGENTS.md README.md progress.md` → four hits, all inside
`.claude/_disabled-gsd/` (disabled third-party template prose). No workflow mentions lint;
`.claude/settings.local.json:15` allows `Bash(npx eslint:*)`, not the npm script.

**One nuance for the fixer:** `eslint` with no args lints the whole project, while the gate lints
`src` only, so the script is not merely a duplicate — it is the only (unused) way to lint outside
`src`. Deleting is still correct; if anyone wants the wider run, it belongs in `check.mjs`.

## lib-tests-02 — two server-action detectors, the security one weaker — CONFIRMED

Line ranges are exact: `security-regressions.test.mjs:100-107` (the `execSync git grep -l '"use
server"'` chain) and `gate-coverage.test.mjs:100-117` (`serverActionFiles`, the C-189-fixed
walk). gate-coverage's own header at `:85-97` enumerates all three failure modes the git-grep
version still has (double quotes only, directive at char zero, tracked files only).

I replayed both detectors at HEAD: **22 and 22**. They agree today; the divergence is latent, as
claimed. The "do not change what it matches, only where it lives" warning is the right one —
`serverActionFiles` depends only on `walk`, `readFileSync`, `relative`, `ROOT`, all already
exported from `test-kit.mjs`.

## lib-tests-03 — memoise `read` — CONFIRMED WITH CORRECTED NUMBERS

`test-kit.mjs:39` `export const read = (p) => readFileSync(resolve(ROOT, p), "utf8");` — no cache.
`catchup-lifecycle.test.mjs` reads `src/app/(main)/catchups/actions.ts` **11 times** (lines 34,
48, 110, 138, 168, 218, 230, 252, 271, **319**, 349 — the finding's list omits 319, which is the
one raw, non-decommented read). That file is **2,054 lines / 87,857 bytes**, so the ~80 KB figure
is right. `decomment(read(` appears **189** times across the suite — exact.

**Correction to the headline count.** Measured over every `*.test.mjs`: **22 duplicate groups in
13 files, 41 genuinely redundant reads** (63 total reads inside those groups — which is where the
finding's "~60" comes from; 60 is the group *size*, not the waste). 207 literal `read("…")` call
sites in total. So the saving is "41 redundant reads and their decomment passes", not 60.

Also worth knowing: `notification-links.test.mjs` and several sweeps call `readFileSync` directly,
not `read`, so a kit cache does not touch them.

## lib-tests-05 — eight full-tree sweeps — CONFIRMED WITH ONE IMPORTANT CORRECTION

`raw/test-timings.txt` line 3 is `1064.0 ms  overflow-*-visible is always written with the other
axis clipped` — third-slowest in the suite, behind `avatar.test.mjs` (1592.6) and the 108MP
refusal (1123.9). The code at `identity-row-overflow-rule.test.mjs:44-59` (the finding says
45-60; the `test(` opens at 44) does `decomment(read(...))` then `.split("\n").forEach` on every
file `walk(join(ROOT,"src"))` returns, with no early filter. `src` holds 822 files / 714 `.ts(x)`.
The pre-filter (`if (!raw.includes("overflow-")) continue;`) is sound and does not change the
assertion.

**Correction — the stated safety net does not exist in the file this finding is mainly about.**
The risk line says "each edited sweep keeps its existing count guard (`files.length > 300`)".
`identity-row-overflow-rule.test.mjs` has **no such guard** — its only `.length` assertion is
`rows.length, 2` in a different test at `:68`. The guard does exist in
`notification-links.test.mjs:28` and `:58`, `image-purge-rule.test.mjs:195`,
`place-input.test.mjs:213` and `motion-namespace-rule.test.mjs:37` (`> 400`). So the fix session
must **add** a count guard to identity-row while adding the pre-filter, or an over-eager filter
that empties the loop passes silently — exactly the C-195 failure mode.

`notification-links.test.mjs`'s two walks are at `:27` and `:57` (the finding's 25-34 / 46-64
brackets the tests around them), and they differ only in `skip: [..., LAB]`, so the proposed
module-level `SOURCES` + path filter works. Both timings are on the list (188.7 and 165.4 ms).

## lib-tests-08 — repeated / disagreeing / stale pins — CONFIRMED WITH CORRECTIONS

All seven sub-claims verified at HEAD:
- (a) `rich-truncate.test.mjs:91-95` really does accept `new Set(prev.map((p) => p.id))` OR
  `appendUnseen(prev, data.posts)` over two files, while `append-page.test.mjs:84-104` asserts
  `appendUnseen(` AND `doesNotMatch(/new Set\(\w+\.map…/)` over four. The first alternative is
  unreachable. **Correction:** the file already carries a comment (`:87-90`) saying precisely
  this and pointing at `append-page.test.mjs` as the owner — so this is a tidy-up, not a trap a
  reader falls into. Lower value than the write-up implies.
- (b) `upload-shared.test.mjs:95-98` exact. **Correction:** it is not purely redundant — line 86
  proves the throw *via sharp*, while 97 is pure arithmetic that survives a change in sharp's
  behaviour. Deleting it is defensible but it is a taste call, not dead code.
- (c) `directory-rule.test.mjs:252-268` exact. `tagShipped = /profession/i.test(SCHEMA)` is true
  (`professionTags` is in `prisma/schema.prisma`), so the branch runs and passes; the comment
  still says "The plan is still to…" and "The day that column exists this fails". `:224` and
  `:230-234` already pin `where.professionTags = { has:` positively. Merge is right.
- (d) `:270-279` exact, and the coupling is real: `:202` slices
  `WHERE.slice(WHERE.indexOf("if (filters.city)"), WHERE.indexOf("if (filters.profession)"))`,
  i.e. C-098 (test at `:200`) does use the profession arm as its END boundary.
  **Correction:** the kit helper is named **`balancedBody`** (`test-kit.mjs:29`, re-exported from
  `test-fn-body.mjs:33`), not `balancedBlock` as the finding writes; and it slices a *function*
  body from a declaration, so slicing an `if (filters.city) { … }` block needs either a new
  helper or a different approach. Do not assume it drops straight in.
- (e) `gate-coverage.test.mjs:120` "the git grep broke" (it has been a walk since C-189) and
  `:191` "311 lines" while `post-visibility-rule.test.mjs` is **423**. Both exact.
- (f) `catchup-lifecycle.test.mjs:138-141` and `:168-170` slice `submitEntry` with the same four
  lines (the finding says 139-141/169-170; the read line is 138/168).
- (g) `purge-rule.test.mjs:142-143` exact, and the vacuity is real: `body.slice(-1)` is a
  one-character string, always truthy. The following `assert.match(del.slice(0,
  del.indexOf("})")), …)` would still fail (slice(0,-1) of one char is `""`), so it is a dead
  guard, not a hole — exactly as written.

## lib-tests-09 — two scratch-shaped tests, plus the auth styling pins — CONFIRMED WITH CORRECTIONS

- `pinch-zoom.test.mjs:41-55` is the "the swipe kept the numbers it was tuned with" test, pinning
  `SWIPE_FOLLOW = 0.14`, `SWIPE_DISTANCE = 70`, `SWIPE_VELOCITY = 420` as source text.
  `git log -1` on it → `122ac26 feat(viewer): the photograph can be pinched open`. Its failure
  message ("Moving the swipe off Motion's drag was a gesture rewrite, not a re-tuning… they carry
  over verbatim") is the fix session's own proof, per CLAUDE.md's scratch-test rule.
  **Correction:** the file holds **7** tests, not 6 — so six survive the deletion, not five.
  Every other one pins a mechanism (`touch-none`, no Motion `drag`, non-passive wheel,
  `naturalWidth` arithmetic, zoom reset, the 1:1 ceiling), which supports the split.
- `auth-first-frame.test.mjs` is 125 lines. **Correction:** it has **2** literal `test(` blocks
  plus one inside a loop over a 19-entry `COPIED` table (so 21 tests at run time, but the thing a
  fixer edits is a 19-row table, not "20 snippets"). The characterisation — a hand-copy drift
  guard that turns every /login spacing tweak into a red suite — is accurate, and it is correctly
  routed to the auth lens / owner rather than actioned here.

## lib-tests-10 — raise the suite floor, add per-file timing — CONFIRMED

`check.mjs:69` `const MIN_TEST_FILES = 60;` with the comment "Raise it if it ever starts feeling
close" at `:59-68`. Today's count is **102**, so 42 files (41 %) of slack. The tests gate
(`:113-138`) reports `${results.length - failed.length}/${results.length} passing` and nothing
per file — no timing, confirmed.

`ci-parity.test.mjs` reads `check.mjs` only to assert it still names `scripts/qa/npm-audit-gate.mjs`
and `scripts/qa/audit-status.mjs`, so changing `MIN_TEST_FILES` cannot redden it. Confirmed
exactly as the finding says.

**Where the floor bites, for the fix campaign (my charter asks for this explicitly):** three
findings in this cluster delete test files — scripts-e2e-ci-01 (−1: `tour-mobile-verify.test.mjs`),
member-surfaces-14 (−1: `valley-year.test.mjs`). That is 102 → 100. Any new floor must be set
**after** those land and below the resulting count; a session that raises it to 100+ first and then
deletes turns `npm run check` red on a blocking gate. Recommend the floor move last, to ~90.

Note also the *other* half of the gate: `findUnrunTests` (`check.mjs:71-87`) fails the run on any
`*.(test|spec).[cm]?[jt]sx?` file outside `e2e/` that is not `.test.mjs`. A fix session that
renames or relocates a test rather than deleting it will trip that, not the floor.

## member-surfaces-14 — fold `valley-year.test.mjs` into `valley-day.test.mjs` — CONFIRMED

`valley-year.test.mjs` is **27 lines / 3 tests**, born in `012174a`. Both files import
`valleyYear` from `./utils.ts` (`valley-year.test.mjs:3`; `valley-day.test.mjs:6-14`).
Its third test (`2026-12-31T19:00:00Z → 2027`) is the same boundary
`valley-day.test.mjs:55-59` pins with three assertions (18:29 → 2026, 18:30 → 2027, 23:59 → 2027)
— strictly stronger. Its second test (a runtime whose `toLocaleDateString` ignores `en-CA`) is
genuinely unique and must survive the fold. Floor is fine (102 → 101 alone, 100 with
scripts-e2e-ci-01).

---

## Overlaps and which write-up to follow

- **lib-core-config-01 vs scripts-e2e-ci-02**: same defect, both correct on the facts. Follow
  **lib-core-config-01** (it treats the window as the owner's number and prices both branches);
  scripts-e2e-ci-02's "just drop the flag" silently selects the 365-day branch, which is the
  expensive one and not what the owner has now chosen. **Neither is actionable any more** — the
  ORCH-04 WIP in the tree is applying the 30-day branch as I write.
- **fresh-code-15 vs landing-mascot-avatars-09**: same file (`look.mjs:17`), no conflict.
  landing-mascot-avatars-09 also owns the `sanan's stuff` half; landing-mascot-avatars-16 owns
  the Chrome-override half of the same folder. All three want one commit against
  `scripts/dev/apple-edge/*` plus `scripts/README.md:90-109`.
- **lib-tests-08(b) and lib-tests-09** both name `upload-shared.test.mjs:95-98`. Same claim, one
  fix.
- **lib-tests-02 and lib-tests-03** both change `test-kit.mjs`; land 02 first (it adds
  `serverActionFiles`), then 03 (it changes `read`), so the audit-1 mutation replay
  ("gutting `read` reddens 31 files") is run once against the final kit.

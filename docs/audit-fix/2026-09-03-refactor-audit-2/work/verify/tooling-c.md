# tooling-c - adversarial verification, refactor audit 2

Cluster: `tooling-c` (15 ids from `scripts-e2e-ci.md`). Territory: `scripts/`, `e2e/`,
`.github/`, the unit tests. Date: 2026-09-04.

## HEAD moved since the find phase

The audit baseline was `72b5a1d`. HEAD today is **`74cc61a fix(retention): notifications are
kept 30 days, everywhere`** — one commit, which touched `.github/workflows/snapshot.yml`,
`scripts/ops/prune.mjs`, `docs/OPERATIONS.md`, `docs/SECURITY.md`, `src/lib/retention.ts` and
four others. That commit **fixes finding 02** (the `--days 30` split) and **shifts the line
numbers in finding 17 by one**. Nothing else in my cluster moved.

Working tree is clean apart from the untracked audit folder itself. No peer WIP in my files.

## Where the two shrink-guards bite (charter question)

- **`scripts/qa/check.mjs:69` `MIN_TEST_FILES = 60`.** `findTests` walks `src/` and `scripts/`
  for `*.test.mjs`: **102 files today** (`check-baseline.txt` reports `102/102 passing`). A fix
  session would have to delete 43 test files before the floor fires. None of my cluster's
  deletions comes near it. The floor is not the binding constraint here.
- **`check.mjs:73-88` `findUnrunTests`.** Any file matching `\.(test|spec)\.[cm]?[jt]sx?$` under
  `src/` or `scripts/` that is NOT `*.test.mjs` fails the `tests` gate outright. So a fix session
  must not add a `.test.ts` anywhere in those two trees. `e2e/` is explicitly exempted.
- **`scripts/qa/ci-parity.test.mjs`.** Two pins. (1) `check.yml`'s only `run:` steps may be
  `npm ci` and `npm run check`. (2) `scripts/qa/check.mjs` must still contain the literal strings
  `scripts/qa/npm-audit-gate.mjs` and `scripts/qa/audit-status.mjs`. **Finding 09 rewrites
  `audit-status.mjs`; it does not touch `check.mjs`, so pin (2) is unaffected.** Nothing in my
  cluster adds a workflow step.
- **`scripts/qa/scripts-ledger.test.mjs`** — the one that actually bites, twice:
  - *"every tracked script has a line in the README"* uses `git ls-files scripts`, so a NEW
    script (finding 04's `_shoot.mjs`) is invisible to the gate until it is `git add`ed. A fix
    session that runs `npm run check` before staging sees green and then fails at commit time.
    Write the README line in the same edit.
  - *"the README names no script that has been deleted"* matches **any backticked basename**
    anywhere in `scripts/README.md`, not just the tables. Deleting `phase9-probe.mjs`,
    `phase6-probe.mjs` or `_dir-chrome-probe.mjs` (findings 06, 07) fails this test until every
    mention goes — including prose mentions like README:36's paragraph about
    `verify-shot.mjs`/`crawl.mjs`.
- **`package.json` is read by no test at all.** The only tool that reads it is
  `scripts/qa/audit-status.mjs:37`, and only for `dependencies`/`devDependencies` (:168, :256).
  Deleting the `lint` script (finding 18) breaks nothing.

---

## Per-finding verdicts

### 04 — three screenshot scripts — CONFIRMED WITH CORRECTIONS
Line counts exact: `screenshot.mjs` 65, `screenshot-auth.mjs` 85, `verify-shot.mjs` 41.
jscpd pairs reproduced verbatim from `raw/jscpd.txt:128-132`.
Corrections:
1. `screenshot.mjs:14-26` ≡ `screenshot-auth.mjs:27-41` is verbatim only for **14-22 ≡ 27-35**.
   The filename lines diverge: `screenshot.mjs:23-25` has no mobile suffix, `screenshot-auth.mjs:37-40`
   builds `suffix = [label, mobileFlag ? 'mobile' : ''].join('-')`. jscpd's own match stops at
   `[27:1-37:6]` / `[14:1-23:6]`, which is that shorter range.
2. `screenshot.mjs:54-60` ≡ `screenshot-auth.mjs:71-77` is **not** verbatim: the fallback sleep is
   `2000` in one and `3000` in the other. jscpd matched to column 39 of line 59 — exactly the
   character before the digit. The finding's own Evidence paragraph gets this right ("2s" vs the
   flat extra "4000ms" — that 4000 is `screenshot-auth.mjs:79`, a separate unconditional wait).
3. **"(b) what mobile means — three different viewports" is wrong: there are TWO.**
   `screenshot.mjs:48-52` = `{390, 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true}`;
   `screenshot-auth.mjs:43-45` and `verify-shot.mjs:17` are **both** the bare `{width: 390,
   height: 844}`. That is finding 03's subject, and 03 states it correctly.
4. `verify-shot.mjs` hardcodes `http://localhost:3000` **three** times (`:24`, `:25`, `:28`),
   not twice.
5. Internal cross-reference error: "import it from `_probe-kit.mjs` … see finding 09" — the
   Chrome-resolution finding is **15**, not 09.
6. The clone family is wider than the three files. `raw/jscpd.txt` also pairs
   `screenshot-auth.mjs` with `hover-probe.mjs [31:27-40:6]`, `tour-mobile-verify.mjs [16:83-26:99]`
   and `dev/apple-edge/look.mjs [18:36-26:24]`, and `hover-probe.mjs` with `theme-shots.mjs`.
   Not a defect in 04 (it scoped itself deliberately) but the shared kit should be sized for the
   wider family, which is finding 15's point.
Gate correction: `scripts-ledger.test.mjs` bites only after `git add` — see above.

### 05 — drive.mjs — CONFIRMED WITH CORRECTIONS
Every number checks out. `drive.mjs` is 727 lines and **is** the largest file in `scripts/`
(`audit-status.mjs` 723 is second). Scenario boundaries exact, verified with
`awk 'NR>=91 && NR<=670 && /^  [a-zA-Z]/'`:
`dateField` 107, `wells` 243, `confirmDelete` 295, `focusStates` 357, `slide` 460, `create` 519,
`profile` 549, `houses` 571, `places` 621, `poll` 643. `91-666` = 576 lines.
`git log -S"async <name>("` dates reproduced exactly: slide/create/profile/houses/places/poll
2026-07-25 (`c979eb0`, `063896c`, `fd235d7`, `1875992` ×3); focusStates 2026-08-29 `822a389`;
confirmDelete 2026-08-29 `285fe9d`; wells 2026-08-29 `2873faf`; dateField 2026-08-30 `8d3f51b`.
Corrections:
1. **`e2e/.shots/date-probe.jpg` exists on this machine right now** — 6,681 bytes, Aug 30 23:37.
   So `dateField` *does* run here. The claim "cannot run at all for anybody but its author" is
   true of a fresh clone and of this machine the moment the gitignored scratch dir is cleaned,
   which is the honest wording.
2. Extra evidence the finding missed, and it strengthens the case: `progress.md:3904` records
   *"drive.mjs's houses and places scenarios drove `/settings`, gone since the letterhead profile
   absorbed the editors (22b4b6c). Both now open the member's own profile"* — two of the ten had
   already rotted once and had to be repaired.
Deletion safety: the only references to `drive.mjs` anywhere are `scripts/README.md:118`, its own
usage line at `:10`, and four `progress.md` narration lines. Nothing invokes it.
I searched `progress.md` for any "re-run drive.mjs <name>" instruction and found none, matching
the finding.

### 06 — phase9-probe rot — CONFIRMED (one doc detail off)
`grep -c 'npm-audit-gate.mjs' .github/workflows/check.yml` → **0**.
`grep -c 'audit-status.mjs --fail-on-open=critical,high' .github/workflows/check.yml` → **0**.
`phase9-probe.mjs:78-84` is exactly the block quoted. `check.yml:51-60` carries "THE ONLY GATE
STEP, and it must stay that way" and names `ci-parity.test.mjs`. `audit-status.mjs:276-291` is
H16, and its comment says in so many words that the proof moved onto `check.mjs`; it now reads
`scripts/qa/check.mjs` for `npm-audit-gate.mjs` and for `audit-status.mjs"…--fail-on-open`.
The `renameSync` trick is at `phase9-probe.mjs:55-63`, and it does mutate the shared tree.
Line counts exact: phase9 86 + phase6 130 = **216**.
Correction: `docs/SECURITY.md:139` says **`scripts/qa/phase{3..10}-probe.mjs`**, not `{4..10}`.
Deletion safety: no workflow, no npm script, no `check.mjs` gate and no `*.test.mjs` invokes
either probe. Only `scripts/README.md:146` and `:149`, the two files' own usage lines,
`docs/SECURITY.md:139` and `progress.md:5409`. `scripts-ledger.test.mjs`'s second test fails
until both README lines go — as the finding says, that is the desired behaviour.
Test floor: 102 → 102 (the probes are not `*.test.mjs`), no floor risk.

### 07 — _dir-chrome-probe — CONFIRMED
`grep -rn "data-tour" src/` returns **nothing**. `_dir-chrome-probe.mjs:48` is the
`[data-tour="directory-search"]` query; `:76-79` is `if (!data) { console.log(...toolbar not
found); continue; }`, and the script ends with `await browser.close()` and no non-zero exit, so
it exits 0. `WIDTHS` is 3 (`:30`) × `STATES` is 4 (`:23-28`) = **12** "toolbar not found" lines.
File is 90 lines. Citations confirmed at `_room.tsx:158`, `_chrome.tsx:11`, `_data.ts:485`, and
`_room.tsx:124` and `:169` are the "142px, 3 rows" numbers the room states.
The six-class Tailwind chain the finding warns about is at `:65`.
Deletion safety: no invoker; refs are `scripts/README.md:123`, its own usage line at `:9`, and
the three lab files.

### 08 — visual:report — CONFIRMED
`e2e/playwright.config.ts:57` is exactly
`reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "e2e/.report" }]] : [["list"]],`
`ls e2e/.report` → No such file or directory. `e2e/.output` **does** exist, so the diff PNGs are
being written and only the viewer is missing, as claimed. `.gitignore:96` `/e2e/.output/` and
`:97` `/e2e/.report/` — both ignored, which is the evidence the folder was meant to exist locally.
`package.json:"visual:report": "playwright show-report e2e/.report"`. No corrections.

### 09 — brace matcher written twice — CONFIRMED WITH CORRECTIONS
`raw/jscpd.txt:74-75` reproduced verbatim: `qa/audit-status.mjs [91:36-116:2]` ≡
`lib/test-fn-body.mjs [38:31-73:2]`, 26 lines / 259 tokens.
`fnBody` is `audit-status.mjs:72-116` (docblock from 72, closing brace 116). `balancedBody` is
`test-fn-body.mjs:33-73`. The two walks are character-for-character the same algorithm modulo
brace style. `audit-status.mjs` is a **blocking** gate: `check.mjs:221-239`, `blocking: true`,
`--fail-on-open=critical,high`.
Corrections:
1. `fnBody` has **14 call sites** in `audit-status.mjs` (15 `fnBody(` hits minus the definition),
   not "~20 of its 74 probes".
2. The adapter cannot be a single `balancedBody` call. `fnBody:86-88` tries
   `(export\s+)?(async\s+)?function <name>\b` and falls back with `??` to
   `(^|[\s,{])(async\s+)?<name>\s*\(`. A two-try adapter is needed, and its semantics differ in
   one corner: `fnBody` returns `null` if the FIRST regex matches but no `(` follows it, whereas
   a two-try adapter would go on and try the method form. That is exactly the kind of silent
   move the finding fears — and the finding's own gate (`--json` before/after, byte-identical)
   is the right instrument. Do not accept the change without that diff.
3. The import direction is confirmed sound: `test-fn-body.mjs` has zero imports of its own
   (`:1-33` is docblock only), is re-exported by `src/lib/test-kit.mjs:29`, imported by
   `src/lib/composer-rule.test.mjs:3`, and is already a knip entry point at
   `scripts/qa/knip.jsonc:25`.

### 10 — nine wrong README lines — CONFIRMED (one detail sharpened)
All nine checked at HEAD.
- **:46** `GATES` in `check.mjs` are `types` (:95), `lint` (:105), `protocol` (:129), `lab` (:143),
  `tests` (:153), `deps` (:191), `security` (:221) — **seven**. The README names five in both its
  prose list and its gate-name list. Confirmed.
- **:50** crawl list, no `/guide`. **:79** sweep-stranded-originals, "run once now and once
  after the staging change deploys, then delete it and this line". **:116** "Currently reports
  real findings" vs `check-baseline.txt` `ok Shape + colour protocol  clean`. **:118** "Generic."
  **:122** `docs/planning/bugs.md:122` is `### 14. Vercel environment variable duplicates (owner
  will handle)`; the hoopoe zoom bug is `:137 ### 17. The hoopoe misbehaves at browser zoom —
  ROOT CAUSE FOUND: it is Safari`. **:123**, **:125**, **:126** as described.
Correction to :125's fix note: `local-base-url.mjs` has its **own** direct pin,
`scripts/qa/local-base-url.test.mjs`, in addition to `tour-mobile-verify.test.mjs`. That matters
because finding 01 proposes deleting `tour-mobile-verify.mjs` **and its test** — the helper keeps
a pin either way, so 01 does not strand it. Its live callers are `playwright.config.ts:3` +`:25`
and `auth.setup.ts:2` +`:32`, both as claimed.

### 13 — crawl misses /guide — CONFIRMED
`crawl.mjs:44` holds exactly 20 destinations; I counted them. `src/app/(main)/guide/page.tsx` and
`src/app/(main)/guide/[area]/page.tsx` both exist; `git log -1 -- src/app/(main)/guide` →
`503a00a feat(guide): the guide ships, and the title is the way in`. The self-indicting comment is
at `:40-43`. The other absentees named in the finding all exist:
`src/app/(main)/catchups/new/page.tsx`, `src/app/(main)/letters/new/page.tsx`, and
`src/app/(policies)/{privacy,terms,guidelines}`. No corrections.

### 14 — auth.setup.ts hand-rolls dev-login — CONFIRMED
`grep -rn devLoginContext` over the whole tree (excluding node_modules and the audit folders)
returns **one** line: its own definition at `scripts/qa/_dev-login.mjs:102`. The export is dead.
`auth.setup.ts` is 50 lines; the hand-rolled block is `:13-49` with the POST at `:34-36`. The
three divergences are real: `redirect: "error"` at `_dev-login.mjs:65`, `COOKIE_NAMES` at `:24`,
the 404 hint at `:71`. The helper's header quote at `:4-8` is verbatim.
Note for the fixer (not a correction, a caution): today the cookie lands in the context as a side
effect of `page.request.post`; `devLoginContext` instead calls `context.addCookies` with
`domain: new URL(baseUrl).hostname` and `sameSite: "Lax"`. For an IPv6 loopback base URL that
hostname is the bracketed form — which is precisely what `cookieDomainForBaseUrl`
(`local-base-url.mjs:29-32`) documents as correct — so it should work, but the gate must be an
actual `npm run visual` setup-project run, not a read of the code.

### 15 — fifteen Chrome paths — CONFIRMED WITH A COUNT CORRECTION
`puppeteer.launch(` call sites: **25** across `scripts/` (20 in `qa/`, 5 in `dev/`) — the
finding's number, exact. The 26th grep hit is prose in `scripts/README.md:33`.
**The literal is typed 18 times, not 15**: 13 in `scripts/qa/` and 5 in `scripts/dev/`. One of the
18 (`_probe-kit.mjs:20`) is the canonical `MAC_CHROME`, so there are **17 duplicates**.
The Where list omits three `dev/` sites: `scripts/dev/centroid.mjs:29`,
`scripts/dev/apple-edge/look.mjs:22` (both `env || macPath`) and `scripts/dev/shot-svg.mjs:15`
(`SYSTEM_CHROME` const). Everything else spot-checked exact:
`_probe-kit.mjs:20` + `:35` (`||=`); `phase3:251`, `phase4:211`, `phase5:268`, `phase7:121`,
`phase8:101`, `phase10:84` all pass bare `process.env.PUPPETEER_EXECUTABLE_PATH`;
`crawl.mjs:45` and `verify-shot.mjs:18` pass no `executablePath` at all;
`_dir-chrome-probe.mjs:19`+`:32`, `dev/shot-clip.mjs:10`, `dev/apple-edge/compare.mjs:12` carry
the literal with no env override. The four policies are as described.

### 16 — three ways to read .env — CONFIRMED, AND THE GATE IS WRONG
`dotenv` is `^17.3.1` in `package.json:78`; installed **17.4.2**. `processEnv` is documented at
`node_modules/dotenv/lib/main.d.ts:78-80`; `quiet` exists too. `_env.mjs` is 53 lines with
**14** script callers (15 `grep -l` hits minus `scripts/README.md`).
I ran both parsers over the same synthetic input in memory (no files written):

    input:  A=1 # note / lower_key=2 / B="x y" / C=␣␣spaced␣␣ / MULTI="line1\nline2" / export D=4
    dotenv: {A:"1", lower_key:"2", B:"x y", C:"spaced", MULTI:"line1\nline2", D:"4"}
    hand:   {A:"1 # note",          B:"x y", C:"spaced  ", MULTI:"\"line1"}

So the swap is **not** semantics-preserving. It is a change in the right direction, but:
- **The finding's stated gate is insufficient.** It compares
  `Object.keys(readEnv()).sort().join(",")` before and after. That cannot see a *value* change —
  and `A` above is exactly the case that would silently rewrite a connection string. The fix
  session must compare a map of key → value **length** (or a hash), never the values themselves.
  With that swapped in, the gate is good.
- The rewrite must pass `quiet: true` (as `_probe-kit.mjs:15` already does) or dotenv 17's banner
  line appears on stdout of every hand-run pass. Note the eleven bare `config({ path: ".env" })`
  calls the finding leaves alone are already printing it.

### 17 — snapshot.yml shell injection — CONFIRMED, LINE NUMBERS MOVED
HEAD `74cc61a` edited this file. The block is now at **`.github/workflows/snapshot.yml:77-82`**
(finding says 76-81), with `${{ inputs.day }}` at `:78` and `:79`. The secrets in scope are at
`:66-75` (`SUPABASE_DIRECT_URL`, `SENTRY_AUTH_TOKEN`, `POSTHOG_PERSONAL_API_KEY`,
`POSTHOG_PROJECT_ID`, `GITHUB_TOKEN`) — one more than the finding listed. It remains the only
`${{ }}`-into-`run:` instance across the four workflows. The mechanism and the low severity are
both right.

### 18 — npm run lint — CONFIRMED
`package.json:9` `"lint": "eslint"`. `check.mjs:109` `run("npx", ["eslint", "src"])`.
A repo-wide grep for `npm run lint` / `"lint"` outside `node_modules` and the audit folders
returns exactly **one** line, the package.json entry itself. `.claude/skills/check/SKILL.md:16`
names `lint` only as a `npm run check -- <gate>` argument, never the npm script.
Deletion safety proven above: no test reads `package.json`; `audit-status.mjs:37` reads it only
for `dependencies`/`devDependencies`.

### 20 — baseline history — CONFIRMED, ONE TOTAL CORRECTED
Reproduced exactly with
`git rev-list --objects --all -- e2e/__screenshots__ | git cat-file --batch-check`:
**157 blobs, 101.236 MiB**, across **39** commits (`git rev-list --count HEAD -- …`).
`du -sh .git` = **232M**; `git count-objects -vH` `size-pack: 72.87 MiB`. All match.
24 PNGs = the 12 `ROUTES` entries in `e2e/visual.spec.ts:29-67` × the two projects, **zero
orphans**. Every per-file byte size in the finding matches to the byte.
The five desktop shots (landing, login, birds, about, support) are 7,455,009 bytes = **54.85%**.
Correction: the working-copy total is **13,589,284 bytes = 13,271 KiB = 13.6 MB**, not
"12,959 KB". The finding's total is ~2.4% low; no conclusion changes.

### 21 — seed-curated-content.ts:19 — CONFIRMED
`:19` reads *"Env is loaded by hand (.env then .env, same precedence as scripts/dev/run-sql.mjs)"*.
`:41` is `import { loadEnv } from "./_env.mjs";` and `:43` is `loadEnv();`. The fossil is real and
the rest of that paragraph (`:20-23`, why the Prisma client and storage shim are dynamic imports)
is correct and should be kept, as the finding says.

## Overlaps and ordering advice for the fix session
- **04 / 15 / 03 are one commit, in that order of containment.** 15's `chromePath()` and 03's
  viewport object are both parameters of 04's `_shoot.mjs`. Doing 03 alone leaves the drift; doing
  15 alone touches twenty files for a cheap win. Do 04, and let it carry 03 and 15's qa/ half.
  15's three `dev/` sites (centroid, apple-edge/look, shot-svg) are outside `_shoot.mjs` and want
  the exported `chromePath()` applied directly.
- **10 overlaps 01, 05, 07, 13.** Four of the nine README lines (:50, :118, :123, :126) belong
  inside those commits. Only :46, :79, :116, :122, :125 are 10's own work. Doing 10 wholesale
  first would create ghost lines that `scripts-ledger.test.mjs` then fails on.
- **06 and 10 collide on `scripts/README.md:146` and `:149`.** If 06 retires the two probes, those
  lines go with them; 10 does not touch them.
- **09's gate is the only one in this cluster that can fail silently.** Everything else fails
  loudly or is a documentation edit.

## Unverifiable here
None. Every claim in this cluster was settled by reading the tree at HEAD. No live-database or
browser evidence was needed: 08's "the HTML report never appears" was settled by the config
conditional plus the absent directory, and 07's "twelve toolbar-not-found lines" by the grep for
`data-tour` plus the control-flow read.

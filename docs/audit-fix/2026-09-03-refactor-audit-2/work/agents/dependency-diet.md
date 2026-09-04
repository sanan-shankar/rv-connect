# dependency-diet - refactor audit 2 report

Cross-cutting lens over every entry in `package.json`: 33 runtime + 18 dev dependencies (51),
five `overrides`, an `allowScripts` block and `puppeteer.skipDownload`. For each: where it is
imported and how many sites, what it weighs on disk and in the lockfile's transitive closure,
whether it reaches the browser (measured against the production build in
`.scratch/audit2-build/`) or only the server, whether a lighter substitute or a native API
exists, and whether it sits in the right section. Date: 2026-09-04 (started 09-03). Files in
territory: `package.json`, `package-lock.json` (1,082 resolved packages, queried not read
linearly), every import site in `src/`, `scripts/`, `e2e/`, plus the build output. Read fully:
`package.json`, `scripts/qa/npm-audit-gate.mjs`, `scripts/qa/npm-audit-gate.test.mjs`,
`scripts/qa/knip.jsonc` (head), `src/lib/storage.ts` (imports + call sites),
`src/components/common/motion-features.tsx`, `docs/OPERATIONS.md` §4-5,
`.github/renovate.json`, the audit-1 dependency report and its fix log, `next.config.ts`
Sentry + experiments blocks, `node_modules/shadcn/dist/tailwind.css` (95 lines).

---

## Coverage

- **Read fully**: `package.json`; `scripts/qa/npm-audit-gate.mjs` + `.test.mjs`;
  `src/components/common/motion-features.tsx`; `node_modules/shadcn/dist/tailwind.css`;
  `postcss.config.mjs`; `components.json`; `docs/OPERATIONS.md` §4 and §5;
  `.github/renovate.json`; the audit-1 report `docs/audit-fix/2026-08-25-refactor-audit-1/work/agents/dependency-diet.md`
  (summary, the 61-row table, findings 02, 03, 12-17, floor totals) and the phase-1b fix log in
  `docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md:255-300`; `brief-common.md`;
  `CLAUDE.md`; `AGENTS.md`.
- **Read in part (the dependency-relevant slices)**: `src/lib/storage.ts` (imports, the five
  S3 verbs, the client factory), `src/lib/email.ts` (the Resend call and its timeout race,
  lines 195-248), `src/lib/auth.ts:40-70` and every `bcrypt.` call site,
  `src/components/directory/alumni-map.tsx:75-115` (the atlas-fetch comment),
  `next.config.ts:171,225-260,330-390`, `scripts/qa/check.mjs:185-225`.
- **Queried, not read linearly**: `package-lock.json` — traversed with `node -e` to build the
  real dependency graph (npm hoisting rules honoured), which is where the transitive counts,
  the dev/prod split and the override parentage in this report come from.
- **Not read**: the bodies of the 26 puppeteer scripts and the 9 bcrypt/cuid2 probe scripts
  (scripts lens owns their fate; I confirmed the import and the section). The feature code that
  consumes each dependency (territory agents own it).
- **Uncommitted edits seen**: none. `git status --short` at the time of writing shows only this
  audit's own untracked folder. The `M src/components/common/image-viewer.tsx` the session
  started with landed as `72b5a1d` before I read anything.
- **Not run** (hard rule 3): no build, no `npx knip`, no `npm ls`, no browser. Every number
  below comes from `du`, `stat`, `gzip -c | wc -c`, `grep` and `node -e` over files already on
  disk.

---

## Summary

The list is in better shape than audit 1 found it, and three of that audit's biggest levers
have actually been pulled: **posthog-js no longer ships in any first load** (it is behind
`void import("posthog-js")` in `posthog-client.ts:62`; its 244.6 KB raw / 79.0 KB gz chunk
appears in the first-load set of **zero** of the 100 built routes), **LazyMotion shipped**
(`motion-features.tsx`, `domMax` behind a function so the feature set is its own async chunk;
181 `m.` call sites against 0 stray `motion.` in non-lab code), and the six dead deps, the
section moves and the puppeteer download are all done. What is left is smaller but real.

The single biggest structural win is **`shadcn`**. Audit 1 moved it to devDependencies and
recorded it as "a CLI with zero imports". That is not quite true — `src/app/globals.css:2`
does `@import "shadcn/tailwind.css"`, so it is also a *build-time CSS dependency*, and the
import is load-bearing (base-ui's Separator needs shadcn's `data-horizontal`/`data-vertical`
variants, which mean something different from Tailwind v4's native `data-*`). But that file is
**95 lines**, of which about 40 are used. Inlining those 40 lines into `globals.css` lets the
package leave entirely: **234 packages out of the lockfile — 21.6 % of all 1,082 — and 92.3 MB
of node_modules**, including `@ts-morph/common` 12.3 MB, `@modelcontextprotocol/sdk` 8.2 MB,
`msw` 6.4 MB and `web-streams-polyfill` 8.7 MB, none of which this project has any business
installing. It also kills one of the five overrides outright.

Second: **`world-atlas` is a runtime dependency that only a lab room imports.** The shipped map
was moved to a fetched static file (`public/geo/countries-110m.json`) and the npm package's only
surviving importer is `src/app/lab/directory/_maps.tsx:28`. It is 7.9 MB on disk for a 105 KB
JSON, and it compiles a **198.3 KB raw / 64.2 KB gz** chunk that rides on `/lab/directory`.

Third: **the advisory machinery has drifted from its documentation.** `OPERATIONS.md:222` still
says "One `overrides` entry lives in `package.json`" — there are five, four added in the last
eight days, and the exit condition for each of those four exists only in a commit message. And
the one entry in `npm-audit-gate.mjs`'s `ALLOWLIST` is now **dead**: the `deepmerge-ts` override
forces the patched 8.0.2, so no advisory matches it, which `raw/check-baseline.txt:11`
("Dependency advisories **clean**", with no ", 1 allowlisted") proves.

On the two questions the charter asked me to settle honestly: **the AWS SDK swap is not worth
it** — I traced `/api/upload`'s real serverless output and `@aws-sdk` + `@smithy` come to
**1.31 MB of a 35.9 MB function**, next to `@img/sharp-libvips` at 16.95 MB and `@prisma/client`
at 4.58 MB; and two scripts use `ListObjectsV2Command`, which a five-verb hand-signer would not
cover. **bcryptjs is not replaceable at all** — it is 140 KB with zero transitive dependencies,
and the scrypt migration can never finish, because a dormant member's bcrypt hash can only be
re-hashed on a successful sign-in that may never come.

Structural vs cheap: of 15 findings, 11 are structural (dead/relocate/library/architecture) and
4 are hygiene. Client-JS savings from dependency work are now **near zero** — the honest total
across every proposal here is 0 KB off any shipping route, and 64 KB gz off one lab route. The
wins are in install weight, lockfile size, and the truthfulness of the security gate. What
surprised me: `core-js` at 14.8 MB is posthog-js's, not ours; `@sentry/cli-darwin` at 34.6 MB is
installed and approved to run an install script for a source-map upload that `next.config.ts`
explicitly disables; and `@prisma/client` really is unused *by our code* — every one of its 43
imports lives inside the gitignored generated client, which knip is configured not to look at.

---

## Findings

### dependency-diet-01 - Inline the 40 lines of `shadcn/tailwind.css` we use and drop the package: 234 lockfile entries, 92.3 MB
- **Where**: `package.json:82` (`"shadcn": "^4.1.0"` in devDependencies); `src/app/globals.css:2`
  (`@import "shadcn/tailwind.css"`); the resolved file is
  `node_modules/shadcn/dist/tailwind.css` (95 lines, 4.0 KB), reached through shadcn's
  `exports["./tailwind.css"].style`. Consumers of what it provides:
  `src/components/ui/separator.tsx:17`, `src/components/ui/dialog.tsx:39,67,69`,
  `src/components/ui/dropdown-menu.tsx:77`, `src/components/ui/select.tsx:143`,
  `src/components/ui/combobox.tsx:128`.
- **Phase**: relocate (a build-time dependency replaced by 40 lines in the file that already
  imports it)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the package has **zero JavaScript imports** anywhere (`grep -rIoh "from ['\"]…"`
  over `src scripts e2e prisma` + root configs produces no `shadcn` specifier), and
  `components.json` has not changed since the initial commit `d4ce9c4` (2026-03-20). The last
  component the CLI added was 2026-07-18 (`combobox.tsx`, `popover.tsx`); everything since is
  hand-written (`field-focus.ts`, `focus-recipe.test.mjs`, `menu-material.ts`). So the *CLI*
  half is dormant. The *CSS* half is not, and this is the part audit 1 missed: the file defines
  nine `@custom-variant`s and one `@utility`, and I counted usage of each in `src/`:

  | variant | usages in `src/` | can Tailwind v4 do it natively? |
  |---|---|---|
  | `data-disabled` | 6 | yes (`[data-disabled]`) — shadcn also excludes `="false"` |
  | `data-closed` | 4 | yes (`[data-closed]`) |
  | `data-horizontal` | 2 | **no** — shadcn maps it to `[data-orientation="horizontal"]` |
  | `data-vertical` | 2 | **no** — same |
  | `data-open` | 1 | yes (`[data-open]`) |
  | `data-active`, `data-checked`, `data-selected`, `data-unchecked` | 0 | — |
  | `@utility no-scrollbar` | **0** | — |

  So removing the `@import` without replacing it would silently break
  `separator.tsx:17`'s `data-horizontal:h-px data-horizontal:w-full data-vertical:w-px` — a
  real visual regression, not a theoretical one. The two accordion `@keyframes` in the file are
  dead here (no Accordion component exists, and they reference
  `--radix-accordion-content-height` from Radix, which this project does not install); I
  confirmed they are **absent** from the built stylesheet
  (`grep -c "accordion-down" .scratch/audit2-build/.next/static/chunks/32v74upyu8cz7.css` = 0),
  as is `no-scrollbar`. The cost of keeping the package, measured from the lockfile graph
  (npm hoisting honoured, exclusive-reachability computed):

  ```
  shadcn: 234 exclusive packages, 92.3 MB
     12.3 MB  @ts-morph/common          8.2 MB  @modelcontextprotocol/sdk
      8.7 MB  web-streams-polyfill      6.4 MB  msw
      6.2 MB  shadcn                    5.0 MB  shadcn/node_modules/zod
      3.0 MB  tldts                     2.7 MB  hono
      2.6 MB  @noble/curves             2.4 MB  ajv-formats
  ```
  234 of 1,082 lockfile entries is **21.6 % of the entire dependency graph**, installed on every
  `npm ci` locally and in CI, to supply 40 lines of CSS and a CLI nobody has run in seven weeks.
  It also owns the sole parent of the `postcss-selector-parser` override
  (finding 05) and one of `browserslist`'s three parents.
- **What to do**:
  1. Copy the five *used* `@custom-variant` blocks verbatim out of
     `node_modules/shadcn/dist/tailwind.css` into `src/app/globals.css`, immediately below the
     existing `@custom-variant dark (&:is(.dark *));` on line 4, under a comment saying they
     came from shadcn's stylesheet, why (base-ui's `data-orientation` is not Tailwind's
     `data-*`), and the date. The exact blocks to copy are lines **28-41** (`data-open`,
     `data-closed`), **62-68** (`data-disabled`) and **76-87** (`data-horizontal`,
     `data-vertical`) — 35 lines. Do **not** copy lines 1-27 (an `@theme inline` with two
     Radix accordion keyframes this project has no component for, and which I verified are
     absent from the built stylesheet), lines 42-61 and 69-75 (`data-checked`,
     `data-unchecked`, `data-selected`, `data-active` — zero usages), or lines 88-95
     (`@utility no-scrollbar` — zero usages).
  2. Delete line 2 (`@import "shadcn/tailwind.css"`).
  3. Delete `"shadcn": "^4.1.0"` from devDependencies; `npm install`.
  4. Delete the now-parentless `"postcss-selector-parser": "^7.1.5"` override (finding 05).
  5. Update CLAUDE.md's "Check `components.json` before adding a shadcn component" line to say
     the CLI is now `npx shadcn@latest` (npx resolves it from the registry when it is absent;
     `components.json` still pins `"style": "base-nova"`, so the style is unchanged).
- **Saving**: **1 dep, 234 lockfile packages (21.6 %), 92.3 MB of node_modules, 1 override.**
  0 KB of client JS and 0 KB of CSS (Tailwind v4 emits only used utilities, so nothing about
  the shipped stylesheet moves). Install time on `npm ci` should drop noticeably; I did not
  measure it because installing is banned in this audit.
- **Risk & gate**: medium — this touches `globals.css`, and CLAUDE.md's gotcha 1 says to clear
  `.next` and restart after any `globals.css` edit. Gate: `npm run check`, then **`npm run
  visual` in full** (the separator, the dialog overlay's `data-closed:opacity-0`, the dropdown
  item's `data-disabled:opacity-50`, the select and the combobox all ride on these five
  variants), plus one manual open of a dialog and a dropdown at 390×844. If any `data-*`
  utility stops applying, the copy missed a block. Do NOT run `check` and `visual` concurrently
  (project memory: spurious whole-page diffs, bitten twice on 2026-08-29).
- **Confidence**: high on the mechanics and the measurement. The one thing that would change my
  mind: if the owner intends to keep adding shadcn components regularly, a pinned local CLI is
  worth something — but seven weeks with none, and a `components.json` untouched since March,
  says otherwise.
- **Notes**: audit 1's finding 03 recommended "move, not delete", reasoning that "a floating
  `@latest` CLI against `components.json` is how a base-nova project gets a default-style
  component pasted into it". That reasoning was made without the 234-package number, and
  `components.json` is what carries the style, not the CLI version. I think the trade has
  flipped. The counter-argument stated fairly: if a future shadcn major changes how it reads
  `components.json`, an unpinned `npx shadcn@latest` could paste the wrong thing — the
  mitigation is `npx shadcn@4 add …`, which costs nothing and is worth putting in the CLAUDE.md
  line. Related: finding 05 (the override this frees), finding 14 (the knip config).

### dependency-diet-02 - `world-atlas` is a runtime dependency only a lab room imports
- **Where**: `package.json:64` (`"world-atlas": "^2.0.2"` in **dependencies**); the only
  importer is `src/app/lab/directory/_maps.tsx:28`
  (`import worldData from "world-atlas/countries-110m.json"`). The shipped map does not:
  `src/components/directory/alumni-map.tsx:85-101` explains at length why it fetches
  `/geo/countries-110m.json` instead, and `public/geo/countries-110m.json` (107,761 bytes) is
  tracked in git.
- **Phase**: relocate (minimum) / dead (if the lab room is repointed)
- **Tier**: T1 for the move, T2 for the deletion     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rIn "world-atlas" src scripts e2e public` returns exactly three lines —
  the lab import at `_maps.tsx:28`, a prose mention at `_maps.tsx:798`, and the explanatory
  comment at `alumni-map.tsx:85` that names the import it *removed*. The package on disk is
  **7.9 MB** for five TopoJSON files, of which one (107 KB) is used. The chunk it compiles is
  `.next/static/chunks/163zhp5dmrn-k.js` at **198.3 KB raw / 64.2 KB gz**, and
  `route-bundle-stats.json` puts it in the first-load set of exactly one route: `/lab/directory`
  (965 KB first load). Zero non-lab routes carry it. `world-atlas` has 1 exclusive package and
  no transitive dependencies.
- **What to do**: two options, in increasing order of value.
  - **(a) Autonomous, one line.** Move `"world-atlas": "^2.0.2"` from `dependencies` to
    `devDependencies`. Lab pages are built by `next build` (105 static pages, `/lab/*` included),
    and Vercel installs devDependencies before building, so nothing breaks. This is correct on
    its own terms — a package no shipping code imports does not belong in the runtime section —
    and it is what audit 1 did for `pg`, `dotenv` and `@types/d3-zoom`.
  - **(b) Better, and still small.** Repoint `_maps.tsx:28` at the same static file the shipped
    map uses: replace the static JSON import with the `loadLandPaths(signal)` shape from
    `alumni-map.tsx:104-113` (fetch `/geo/countries-110m.json`, `feature(topo, topo.objects.countries)`),
    then delete the dependency entirely. This deletes 1 dep and 7.9 MB, and takes 64.2 KB gz out
    of `/lab/directory`'s first load. The lab room becomes marginally more honest too: it would
    then be exercising the same data path the shipped map uses.
- **Saving**: (a) 1 dep re-sectioned, 0 bytes. (b) **1 dep, 7.9 MB node_modules, 198.3 KB raw /
  64.2 KB gz off `/lab/directory`**, ~10 lines net in the lab room.
- **Risk & gate**: (a) near-zero; gate is `npm run check` and one Vercel build observed.
  (b) low, but it edits a lab room, and CLAUDE.md's gotcha 5 plus the lab-registry gate mean
  `npm run check` must pass; then open `/lab/directory` and confirm the coastlines draw. The map
  already tolerates a late atlas (`landPaths` starts empty and renders no `<path>`), so the
  failure mode is "no land", which is visible immediately. `npm run visual` does not photograph
  lab routes, so this needs the manual look.
- **Confidence**: high. The one thing that would change my mind is another importer I missed —
  I grepped `src`, `scripts`, `e2e` and `public`; a `require()` behind `createRequire` (the
  trick `import-roster.mjs` used to hide `xlsx` from knip in audit 1) would not have shown up,
  but there is no such call for this package (`grep -rn "createRequire" scripts src` returns
  nothing for world-atlas).
- **Notes**: the brief is explicit that lab rooms are owner-approved history and must not be
  proposed for deletion. This proposes nothing of the kind — the room stays, it just loads its
  world from the same place the real map does. If the fixer prefers not to touch lab code at
  all, option (a) alone is still correct and costs one line. Cross-filed to the bundle lens:
  they own `/lab/directory`'s 965 KB.

### dependency-diet-03 - The `npm-audit-gate` allowlist entry is dead; the override already closed it
- **Where**: `scripts/qa/npm-audit-gate.mjs:21-32` (the `ALLOWLIST` object, its single
  `GHSA-ggr8-5vv4-36mx` entry); `scripts/qa/npm-audit-gate.test.mjs:34-46,85-90` (three tests
  that read `Object.keys(ALLOWLIST)[0]`); `package.json:27` (the `deepmerge-ts` override that
  superseded it); `docs/OPERATIONS.md:222-227`.
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the allowlist entry accepts GHSA-ggr8-5vv4-36mx "deepmerge-ts stack exhaustion,
  pulled only via @prisma/config", with `clearsWhen: "prisma ships a 7.x release that bumps
  deepmerge-ts to >=8"`. Commit `b4411f1` (2026-08-27) then added
  `"deepmerge-ts": "^8.0.2"` to `overrides`, which *forces* exactly that outcome:
  `package-lock.json` resolves `node_modules/deepmerge-ts @ 8.0.2` against `@prisma/config`'s
  exact `7.1.5` pin. The advisory therefore no longer appears in `npm audit --omit=dev`, and the
  gate's own output proves it — `check.mjs:207-215` appends ", N allowlisted" whenever an
  allowlisted advisory is seen, and `raw/check-baseline.txt:11` reads:

  ```
    ok   Dependency advisories    clean
  ```

  with no count. An allowlist entry that never fires is precisely what the file's own header
  warns against: *"an entry with no exit condition is a rug"* — this one has an exit condition
  and has already met it.
- **What to do**: delete the `GHSA-ggr8-5vv4-36mx` block from `ALLOWLIST` (leaving
  `export const ALLOWLIST = {};` with its docblock intact, because the *mechanism* must stay).
  Then repair the three tests that assume a non-empty allowlist — `gateVerdict` already takes
  the allowlist as its second parameter (`gateVerdict(auditJson, allowlist = ALLOWLIST)`,
  line 47), so the fix is to pass a fixture:
  `const FIXTURE = { "GHSA-fixt-ure0-0000": { reason: "…", clearsWhen: "…" } };` and call
  `gateVerdict(auditJson([...]), FIXTURE)` at lines 35 and 42. The
  "every allowlist entry carries a reason and an exit condition" test at line 85 iterates an
  empty object and passes vacuously; keep it — it is the guard for the *next* entry. Update
  `OPERATIONS.md:222-227` in the same commit (see finding 04).
- **Saving**: ~12 lines from the gate, ~4 lines net in the test, and one fewer accepted advisory
  on the security status board. 0 KB anywhere. The real value is that `npm run check` stops
  carrying a documented exception that no longer exists.
- **Risk & gate**: low. Gate: `npm run check` (the deps gate must still print "clean", and
  `scripts/qa/npm-audit-gate.test.mjs` must stay green), plus `scripts/qa/ci-parity.test.mjs`
  which pins that `check.yml` runs `npm run check` and nothing else. Also re-run
  `npm run audit:status` — `scripts/qa/audit-status.mjs` mentions the allowlist and may count it.
- **Confidence**: high that the entry is inert. Medium on whether to remove it *now*: the honest
  counter-argument is that if a future `@prisma/config` ever un-pins `deepmerge-ts` in a way that
  makes the override moot, the advisory could come back and the allowlist would be the softer
  landing. I still recommend removal — a dormant exception is exactly the thing nobody
  re-derives, and the override is the stronger guarantee anyway.
- **Notes**: audit 1's fix log says flatly *"Do not retry this, and do not delete the allowlist
  entry"* — but that instruction was about the **prisma → devDependencies** move, whose
  justification was that the move would clear the advisory. It did not; a *different* change
  (the override, five weeks later) did. This is new evidence, stated as such per the brief's
  rule on re-litigation. Related: findings 04 and 05.

### dependency-diet-04 - `OPERATIONS.md` §4 documents one override; there are five
- **Where**: `docs/OPERATIONS.md:222-227`; `package.json:25-31`.
- **Phase**: hygiene (documentation drift with a real cost)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: OPERATIONS §4 opens "**One `overrides` entry lives in `package.json`, and it is
  not permanent**" and describes `deepmerge-ts` only. Since it was written, `5dbb402`
  (2026-09-02) added `mysql2`, `postcss-selector-parser` and `browserslist`, and `a13a8a9`
  (2026-09-02, the most recent commit before this audit) added `fast-uri`. The exit condition
  for those four exists **only in the two commit messages**, and OPERATIONS' own sentence for
  why the doc exists is "an override that outlives its reason is a pin nobody remembers making"
  — which is now true of four fifths of the block.
- **What to do**: rewrite §4's override paragraph as a five-row table: package, forced version,
  the GHSA/severity it closed, the parent that pins the bad one, and the exit condition. The
  facts, verified from the lockfile, are in finding 05. Ship this edit **inside** the commit
  that acts on finding 03 or 05, not as a standalone `docs:` commit (CLAUDE.md's one-commit
  rule).
- **Saving**: 0 lines (probably +10). This is a correctness fix on a doc the owner reads, not a
  reduction.
- **Risk & gate**: none. Nothing tests OPERATIONS.md.
- **Confidence**: high.
- **Notes**: I checked whether any test pins the override count — none does
  (`grep -rIln "overrides" scripts src` finds no rule test). That is arguably the deeper fix: a
  `*-rule.test.mjs` asserting that every key in `package.json`'s `overrides` is named in
  OPERATIONS §4 would keep this from drifting again, and matches the repo's own house pattern
  (project memory: "one protocol, enforced by a test"). I have not written it up as a separate
  finding because a new test is a new thing to maintain, and the owner's brief is about *less*.
  Offered as an option, not a recommendation.

### dependency-diet-05 - Two of the five overrides force something; three only raise a floor. One is about to be parentless.
- **Where**: `package.json:25-31`.
- **Phase**: architecture (a correctness/clarity judgement about a config block, mostly
  line-neutral)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (the postcss one), owner-informed (the rest)
- **Evidence**: I resolved every override against the lockfile — its resolved version, every
  parent that declares it, and the range each parent declares:

  | override | resolved | declared by | verdict |
  |---|---|---|---|
  | `deepmerge-ts: ^8.0.2` | 8.0.2 (prod) | `@prisma/config` at **exact `7.1.5`** | **load-bearing.** A major bump across an exact pin — npm cannot reach 8.x without it. Keep until `@prisma/config` moves. |
  | `mysql2: ^3.24.3` | 3.24.3 (prod) | `prisma` at **exact `3.15.3`** | **load-bearing.** Same shape. Keep. |
  | `fast-uri: ^3.1.7` | 3.1.7 (prod) | four nested `ajv` copies, all at `^3.0.1` | **floor only.** Every parent's range already admits 3.1.7; the override raises the lockfile's floor and stops a downgrade. It is in the *production* graph (via `@prisma/streams-local` → `ajv`), which is why CI went red on `a13a8a9` while the local run had passed. Keep while prisma sits in `dependencies`. |
  | `browserslist: ^4.28.8` | 4.28.8 (prod) | `@babel/helper-compilation-targets ^4.24.0`, `webpack ^4.28.1` (via `@sentry/webpack-plugin`), `shadcn ^4.26.2` | **floor only.** All three ranges already admit it. Keep — it is a caret floor with three parents and costs nothing — but note it is not "forcing" anything. |
  | `postcss-selector-parser: ^7.1.5` | 7.1.5 (**dev**) | `shadcn ^7.1.0` — **the only parent** | **the weakest of the five, and dead the moment finding 01 lands.** It closed a **low**-severity advisory, and `gateVerdict` (npm-audit-gate.mjs:66) only considers `high` and `critical`, so this override has never affected the gate. Its package is dev-only, so `npm audit --omit=dev` never saw it either. It exists purely so a bare `npm audit` prints 0. |

  The through-line worth stating: **three of the four live overrides plus the (dead) allowlist
  entry exist because `prisma` and `@sentry/nextjs` sit in the production dependency graph.**
  `prisma` is 107 exclusive packages / 243.7 MB in the `--omit=dev` set; `@sentry/webpack-plugin`
  drags `webpack` (9.7 MB) and `schema-utils` in behind it. Audit 1 measured and refused the
  prisma move (see carry-overs below) — I am not re-proposing it, only recording that this is
  where the advisory pressure comes from, so the next person who sees a red `check` knows why.
- **What to do**: nothing today except (a) delete `postcss-selector-parser` in the same commit
  as finding 01, and (b) write the table above into OPERATIONS §4 (finding 04). If finding 01
  is *not* taken, leave all five alone.
- **Saving**: 1 override line, contingent on finding 01. 0 KB.
- **Risk & gate**: low. `npm run check` — the deps gate is the whole test. If it prints anything
  other than "clean", revert.
- **Confidence**: high on the parentage and resolution facts (read straight from the lockfile).
  Medium on the "floor only" characterisation of `browserslist` and `fast-uri`: npm resolves the
  highest satisfying version at install time, so those two overrides are redundant *given a
  fresh lockfile* and useful *against a stale one*. Since Renovate runs `lockFileMaintenance`
  monthly, they are close to redundant — but they are one line each and removing them buys
  nothing, so I do not propose it.
- **Notes**: I looked for a sixth, invisible override — a package where the lockfile's resolved
  version violates every parent's declared range without an override to explain it. There is
  none.

### dependency-diet-06 - `@sentry/cli`'s install script is approved for an upload that is switched off
- **Where**: `package.json:93` (`"@sentry/cli@2.58.6": true` in `allowScripts`);
  `next.config.ts:348` (`sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN }`) and
  `:368` (`release: { create: false, deploy: undefined }`).
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: owner (it is a monitoring capability, not code)
- **Evidence**: `@sentry/cli` exists to upload source maps and create releases. Both are off,
  deliberately and with long comments: there is no `SENTRY_AUTH_TOKEN` ("there isn't one, on
  purpose"), and `release.create` is `false` because of the owner's own words at
  `next.config.ts:353` — *"don't let sentry send me emails for each commit or deployment"*.
  Meanwhile `@sentry/cli-darwin`, the platform binary, is **34.6 MB** — the single largest
  package inside `@sentry/nextjs`'s 147.5 MB / 137-package exclusive subtree — and it is in the
  **production** graph. The commit that added the `allowScripts` block (`cf6b482`) justified the
  approval as keeping "a future npm [from] quietly drop[ping] prisma generate or Sentry's
  source-map upload"; the second half of that sentence describes something that does not happen.
- **What to do**: two honest options.
  - **Leave it.** The approval costs nothing at runtime and means the day the owner adds a
    Sentry auth token, source maps start working without a second discovery. This is my
    recommendation, because the reason the block exists is to be *pre-answered*.
  - **Flip to `false`** and add a one-line comment saying it is off because the upload is off,
    and to flip it back with the token. This saves an install script running, not the 34.6 MB
    (the binary arrives as an npm optionalDependency, not as a download).
  Either way, correct the commit's claim in `progress.md`'s ledger only if it is quoted anywhere
  a future session would read it as fact — it is not, so probably do nothing.
- **Saving**: 0 MB, 0 lines. This is a truthfulness item.
- **Risk & gate**: near-zero either way. If flipped, `npm ci` must still complete and
  `npm run build` must not warn.
- **Confidence**: high on the facts. The recommendation is a judgement call and I have argued
  both sides.
- **Notes**: I checked whether `@sentry/nextjs` could be slimmed. It cannot from our side — the
  147.5 MB is `@sentry/cli-darwin` 34.6, `@opentelemetry/semantic-conventions` 11.8,
  `@sentry/core` 11.4, `webpack` 9.7 (via `@sentry/webpack-plugin`, which a Turbopack build
  still loads because `withSentryConfig` wraps the config), `@sentry/browser` 4.4 and
  `@sentry/replay` 3.2 (both installed although **no browser SDK is initialised**), and 131
  more. All of it delivers **0 bytes to the client** (verified: the only chunk containing the
  string "Sentry" is posthog's, and it is a posthog integration reference) and **0.26 MB** of
  shipped server code in `server/instrumentation.js`'s trace. That is a good ratio for a smoke
  alarm; the weight is install-time only. Not a finding, recorded so nobody re-derives it.

### dependency-diet-07 - `@types/d3-selection` is the last of audit 1's "hoisting luck" imports: declare it
- **Where**: `src/components/directory/alumni-map.tsx:8`
  (`import { select } from "d3-selection"`) and `:9` (`d3-zoom`, which is typed by
  `@types/d3-zoom`, whose own `dependencies` are `{"@types/d3-interpolate":"*","@types/d3-selection":"*"}`);
  `package.json` declares `@types/d3-zoom` and `@types/d3-geo` and `@types/topojson-client` but
  **not** `@types/d3-selection`.
- **Phase**: relocate (a declaration that should exist)
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: audit 1's finding 06 fixed exactly this class for the runtime packages —
  `d3-selection` was being imported without being declared and was added to `dependencies` in
  `931a4cd`. The types half was not: `alumni-map.tsx:8` typechecks only because
  `node_modules/@types/d3-selection` is hoisted to the root by `@types/d3-zoom`'s `*`
  dependency on it. `d3-selection` ships no types of its own
  (`node_modules/d3-selection/package.json` has no `types`/`typings` and no `index.d.ts`). The
  day `@types/d3-zoom` drops that dependency, `tsc` fails on a line nobody touched. Same for
  `@types/d3-interpolate`, though nothing imports `d3-interpolate` directly.
- **What to do**: add `"@types/d3-selection": "^3.0.0"` to `devDependencies`, beside the other
  three `@types/d3-*`. One line. (Do **not** add `@types/d3-interpolate` — nothing imports
  `d3-interpolate` directly, so it is a genuine transitive.)
- **Saving**: 0 packages (it is already installed), 0 KB, +1 line. This is insurance against a
  build that breaks for a reason nobody can see, which is the same argument audit 1 accepted for
  the runtime half.
- **Risk & gate**: none. `npm run check` (TypeScript).
- **Confidence**: high.
- **Notes**: I swept for the whole class and this is the only survivor. Every other bare
  specifier in `src`, `scripts`, `e2e`, `prisma` and the root configs resolves to a declared
  package or a Node builtin. The only other "undeclared" hit was `geojson`
  (`alumni-map.tsx:11`, `lab/directory/_maps.tsx:29`, both `import type`), which is correctly
  served by the declared `@types/geojson` — the standard TS pattern, not a gap.

### dependency-diet-08 - `resend` is one HTTP POST behind five packages, and the SDK's missing AbortSignal is already worked around
- **Where**: `package.json:59`; the only importer is `src/lib/email.ts:1,63-67,209-237`.
  `src/app/api/resend/webhook/route.ts` does **not** use the SDK — it verifies the webhook
  signature by hand with `node:crypto`.
- **Phase**: library (a dependency doing what ~20 lines of native code would)
- **Tier**: T3     **Class**: structural     **Decides**: autonomous, but coordinate with the lib lens
- **Evidence**: the entire surface used is `new Resend(key)` and `api.emails.send({from, to,
  subject, html, text})` returning `{data, error}`. That is one `POST https://api.resend.com/emails`
  with a bearer token. The package brings `postal-mime` and `standardwebhooks` (neither
  imported here) for a total of **5 packages, 0.8 MB**. More interesting than the size: the SDK
  has no `AbortSignal`, which forced the workaround at `email.ts:206-217` —

  > `// abort: the Resend SDK takes no signal, so the request may still land --`
  > `// which is one reason DAILY_CAP keeps five messages in hand.`

  a `Promise.race` against a `setTimeout` that leaves the request in flight. A raw
  `fetch(..., { signal: AbortSignal.timeout(SEND_TIMEOUT_MS) })` genuinely cancels it, which
  removes both the race and the reason `DAILY_CAP` keeps a buffer.
- **What to do**: replace `email.ts:1` and `:63-67` with a small `postJson` helper in the same
  file; replace the `Promise.race` block with a single `await fetch` under
  `AbortSignal.timeout(SEND_TIMEOUT_MS)`, mapping a non-2xx body's `{name, message}` onto the
  existing `{ok:false, error, transient, quota}` shape. **`isTransientMailError` and
  `quotaExceeded` in `src/lib/mail-policy.ts` are the coupling risk**: they classify the SDK's
  error object, and the fixer must confirm they read only `error.message`/`error.name` (which
  the raw JSON body also carries) before touching anything. Keep every comment in the file; the
  timeout comment needs one sentence rewritten, not deleted.
- **Saving**: **1 dep, 5 lockfile packages, 0.8 MB**, and roughly line-neutral in `email.ts`
  (the helper costs what the race saves). 0 KB client (the SDK never reached the browser —
  `email.ts:253` explains the split that keeps it out).
- **Risk & gate**: **medium**, and this is the honest reason I have it at T3 rather than T2. It
  is the money-adjacent mail path, `mail-policy.ts` has a 1.97 comment ratio because every
  branch pins an incident, and the failure mode (mail silently not sending) is invisible until
  someone complains. Gate: `npm run check`; the `mail-policy` and `email-queue` unit tests;
  a real send through `/api/dev-login` + a password-reset request in dev with `RESEND_API_KEY`
  set, watching for the `providerId` coming back (it is "the ONLY thing a delivery webhook gives
  us to identify which OutboundEmail an event belongs to", `email.ts:233-236`); and one webhook
  replay against `/api/resend/webhook` to prove the id still matches.
- **Confidence**: medium. The one thing that would change my mind: if `mail-policy.ts`'s
  classifiers reach into SDK-specific error fields (a `statusCode`, a typed class), the mapping
  gets fiddly and the trade stops being worth 0.8 MB. **The fixer should read `mail-policy.ts`
  first and abandon this if so.**
- **Notes**: I nearly filed this as a not-finding. It survives because of the second half — the
  workaround the SDK forces is itself a small piece of complexity that a native API deletes, and
  the brief's reduction order explicitly names "a dependency doing what 20 lines of native code
  would" as phase 8. If the fix sessions are short on time, this is the first thing to cut from
  the list. Cross-filed to whichever lens owns `src/lib/email*.ts`.

### dependency-diet-09 - `@paralleldrive/cuid2` is still parked, and the case for unparking it has weakened
- **Where**: `package.json:37`; 8 call sites in `src` across 7 files
  (`api/upload/route.ts:2,128`, `api/upload/finalize/route.ts:2,129`,
  `api/upload/presign/route.ts:2,99`, `(main)/collection/actions.ts:3,330,622,623`,
  `(main)/support/actions.ts:16,83`, `components/settings/actions.ts:3,98`,
  `lib/collection-intake.ts:1,127,129`); 9 more sites in `scripts/qa/phase*-probe.mjs`,
  `scripts/dev/import-album.mjs` and `scripts/dev/seed-curated-content.ts`.
- **Phase**: library
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence / state**: audit 1's finding 14 proposed `crypto.randomUUID()` and the fix
  campaign parked it ("a quiet-moment item", fix-prompt.md:1608). Nothing has changed in the
  call sites since. What I can add: the true cost is **4 packages, 2.2 MB, 0 client bytes** —
  smaller than audit 1 implied, because `@noble/hashes` resolves to cuid2's own copy and the
  shadcn duplicate it was compared against is at a different major. The one behavioural
  constraint I re-verified: `support/actions.ts:101` notes *"Razorpay caps receipt at 40
  characters; a cuid2 is 24"* — a UUID is 36, still inside the cap. Nothing parses id shape
  (`keyForUrl`/`keyBelongsTo` in `storage.ts:263-291` parse roots and traversal, never filename
  shape). So it remains safe and remains small.
- **What to do**: if a fix session wants it: replace 7 `import { createId } …` lines and 8 call
  sites with `crypto.randomUUID()` (global, no import), do the same in the 9 script sites, and
  remove the dep. If not: leave it, and stop re-raising it.
- **Saving**: 1 dep, 4 packages, 2.2 MB, −7 import lines. 0 KB client.
- **Risk & gate**: low. `npm run check`; one upload through `/api/upload` and one through the
  presign path; the Collection contribute flow; the `/support` receipt path.
- **Confidence**: high on safety. **Low on worth**: 2.2 MB against touching the upload path
  before a public release is a poor trade. My recommendation is the opposite of audit 1's: leave
  it parked, and if a later session wants a small dependency win, take finding 02(b) instead —
  same effort, 7.9 MB, and no shipping code touched.
- **Notes**: this row exists because the charter asked me to report its state, not to re-argue
  it. Audit-1 carry-over, still open, now with a recommendation to close it as "won't do".

### dependency-diet-10 - `optimizePackageImports`' unconfirmed bet on `@phosphor-icons/react` is confirmed — and `lucide-react` is redundant on the list it is not on
- **Where**: `next.config.ts:230` (`optimizePackageImports: ["@phosphor-icons/react", "motion"]`)
  and `:330-332` ("optimizePackageImports above is a bet about @phosphor-icons/react
  tree-shaking that nothing has ever confirmed"); `docs/OPERATIONS.md:236-237` repeats the doubt.
- **Phase**: hygiene (a doc/comment that records an open question now answered)
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: I tested it directly against the production build. Phosphor ships ~9,000 icon
  components; this app imports **20 distinct glyphs** (22 bindings — `MagnifyingGlassIcon` and
  `XIcon` are v2 aliases of two of them) across **21 files**, 17 of them outside `/lab`.
  Grepping `.next/static/chunks/*.js` for icons the app does **not** import:

  ```
  Acorn: 0 chunks     Airplane: 0     Bandaids: 0     Cactus: 0
  Confetti: 0         Dogsuit: 0      Eyeglasses: 0
  ```

  Nothing but the used icons reaches a chunk. The bet is settled: whatever is doing it
  (`optimizePackageImports`, Turbopack's own tree-shaking, or both), the outcome is correct.
  Separately, `lucide-react` is in Next 16's **default** `optimizePackageImports` list
  (`node_modules/next/dist/server/config.js:1124`), so it needs no entry and correctly has
  none. `@base-ui/react` is not on either list and does not need to be — every one of its 11
  import sites already uses a subpath (`@base-ui/react/popover`, `/dialog`, `/select`, …), which
  is what the option would have produced anyway.
- **What to do**: replace the hedge at `next.config.ts:330-332` and `OPERATIONS.md:236-237`
  with the measurement and the date. Two comment edits; ship them inside whatever commit is
  already touching those files.
- **Saving**: 0 lines, 0 KB. It closes an open question the codebase has been carrying in two
  places, and stops a future session re-running an analyzer to answer it.
- **Risk & gate**: none.
- **Confidence**: high on the result. Medium on the attribution — I cannot separate
  `optimizePackageImports` from Turbopack's tree-shaking without a second build, which this
  audit may not run. The comment should say "confirmed empty of unused icons in the 2026-09-03
  build" rather than "optimizePackageImports works".
- **Notes**: cross-filed to the bundle lens, who own `next.config.ts`'s experiments block and
  can say whether the entry could now be dropped entirely.

### dependency-diet-11 - `knip`'s config hides the generated Prisma client, which is why it reports `@prisma/client` unused
- **Where**: `scripts/qa/knip.jsonc` (the `src/generated/**` ignore, and knip's own
  "Configuration hints (2)" at the bottom of `raw/knip-repo-config.txt` telling us to remove it);
  `raw/knip-repo-config.txt` ("Unused dependencies (1): @prisma/client");
  `raw/knip-repo-config-production.txt` ("Unused dependencies (2): @prisma/client, prisma").
- **Phase**: hygiene (a measuring tool that reports a false positive every run)
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `@prisma/client` is **not** unused. `grep -rIn "@prisma/client" src scripts prisma e2e`
  outside `src/generated` returns **zero** hits — every one of the 43 references lives inside the
  generated client, which imports `@prisma/client/runtime/client` in 42 files and
  `@prisma/client/runtime/index-browser` in one. `src/generated/prisma` is gitignored
  (`.gitignore:33`) and knip is configured to ignore it, so knip cannot see the only importer.
  `prisma` (the CLI) shows up in the production run for the adjacent reason: its only importers
  are `prisma.config.ts` (`from "prisma/config"`) and the `postinstall` script, both outside
  knip's production entry set. Both lines are resolver artefacts, not findings — but a tool that
  prints a false positive on every run is a tool people learn to skim.
- **What to do**: take knip's own hint. Either (a) drop `src/generated/**` from the `ignore`
  list and add `src/generated/prisma/**/*.ts` as an `entry` (knip then sees the real importer),
  or (b) add `@prisma/client` and `prisma` to `ignoreDependencies` with a one-line comment
  saying why — the generated client is gitignored, and the CLI is a `postinstall` binary. (b) is
  smaller and truer to what the file already does elsewhere. Also remove the redundant
  `prisma.config.ts` entry pattern knip's second hint names.
- **Saving**: 0 lines of app code; knip's dependency section becomes trustworthy, which matters
  because it is the tool every future audit reaches for first.
- **Risk & gate**: none — `knip` is not part of `npm run check` (it is an occasional `npx`, as
  the config's own header says). Gate: one `npx knip --config scripts/qa/knip.jsonc` run by a
  session that is allowed to run it, showing "Unused dependencies (0)".
- **Confidence**: high.
- **Notes**: this directly answers the charter's "knip says @prisma/client is unused — explain".
  For completeness: `prisma generate` needs the `prisma` CLI (a `bin`, run by `postinstall`) and
  writes to `src/generated/prisma` per the generator block in `prisma/schema.prisma`; the
  emitted code needs `@prisma/client/runtime/*` at **runtime**, which is why `@prisma/client`
  must stay in `dependencies` and cannot be moved anywhere.

### dependency-diet-12 - Two full browser-automation stacks are installed: puppeteer (34.3 MB) and Playwright (31.2 MB)
- **Where**: `package.json:68` (`@playwright/test`) and `:82` (`puppeteer`); 26 script files
  import puppeteer, 5 files (the `e2e/` specs and config) import Playwright.
- **Phase**: architecture / relocate
- **Tier**: T4     **Class**: structural     **Decides**: owner (it is a scripts rewrite, not a dependency edit)
- **Evidence**: puppeteer's exclusive subtree is 18 packages / **34.3 MB**
  (`chromium-bidi` 14.9, `puppeteer-core` 7.9, a second `zod` copy 5.0, `devtools-protocol` 3.7);
  `@playwright/test` is 3 packages / **18.1 MB** on top of `playwright-core` 13.1 MB. Both drive
  Chrome. `package.json:87-89` already tells puppeteer not to download its own browser
  (`skipDownload: true`, audit-1 finding 16, landed as `cb3709d`), because CLAUDE.md gotcha 2
  says the bundled Chrome is broken here and the scripts point at the real one. Playwright, by
  contrast, has working browsers and is already the engine behind `npm run visual` and
  `npm run test:e2e`.
- **What to do**: nothing in a dependency commit. This is a rewrite of 26 script files onto
  `playwright-core` and belongs to the scripts lens; audit 1 said the same thing and it did not
  happen, which is itself information. If it ever does, the prize is 1 dev dep and ~34 MB.
- **Saving**: (deferred) 1 dep, 18 packages, 34.3 MB, and one fewer browser API for a session to
  learn.
- **Risk & gate**: medium-high if attempted — `npm run screenshot`, `npm run screenshot:auth`,
  `npm run verify:shot`, `npm run verify:crawl` and every `phase*-probe.mjs` would all need
  re-verifying, and CLAUDE.md's gotcha 7 ("a Playwright spec is written after the answer is
  known") warns about exactly the debugging loop this would create.
- **Confidence**: high on the numbers, low on the value against the risk before a launch.
- **Notes**: recorded so the next audit does not rediscover it. Audit-1 carry-over, still open,
  still not recommended now.

### dependency-diet-13 - `@phosphor-icons/react` is 56.7 MB for 20 icons (owner-shaped)
- **Where**: `package.json:38`; 17 non-lab import sites + 4 lab; **20 distinct glyphs**
  (`Bell`, `Bird`, `BookmarkSimple`, `Buildings`, `CaretDown`, `CaretLeft`, `CaretRight`,
  `ChatCircle`, `Check`, `Feather`, `Heart`, `Images`, `MagnifyingGlass(Icon)`, `MusicNotes`,
  `ShareFat`, `SlidersHorizontal`, `Sparkle`, `Tree`, `UsersThree`, `X(Icon)`).
- **Phase**: library
- **Tier**: T3     **Class**: structural     **Decides**: **owner**
- **Evidence**: 56.7 MB on disk, the fourth-largest package in the tree after `next` (198.5),
  `posthog-js` (45.7) and `lucide-react` (45.1). It tree-shakes correctly (finding 10), so its
  **client cost is already near-optimal** — this is purely install weight and `npm ci` seconds.
  CLAUDE.md mandates the dual set ("Lucide for UI chrome, `@phosphor-icons/react` duotone for
  decorative"), and audit 1's not-finding 1 defends it.
- **What to do**: nothing autonomous. The only lever is inlining the 17 SVGs as local
  components, which deletes the dependency and the `optimizePackageImports` entry with it — and
  which the owner would have to want, because it makes every *future* decorative icon a
  hand-copy instead of an import, and it hard-codes a set the design system currently treats as
  a living library.
- **Saving**: (if taken) 1 dep, 1 package, 56.7 MB, 0 KB client. ~20 small files added.
- **Risk & gate**: low technically (`npm run visual` would catch any glyph that changed shape),
  high in principle — it converts a design-system decision into a maintenance chore.
- **Confidence**: high on the numbers. **My recommendation is to keep it.** 56.7 MB of local
  disk is the cheapest thing this project spends, and the icon-set rule is in CLAUDE.md for a
  reason. Filed as a finding rather than a not-finding only because the charter asked for the
  weight of every package and this is the largest one whose removal is even conceivable.
- **Notes**: see also Owner decisions below.

### dependency-diet-14 - `sonner` and the motion core are the only vendor code left that rides every route and could conceivably move
- **Where**: `package.json:61` (`sonner`, 57 import sites); `package.json:51` (`motion`);
  the chunks are `.next/static/chunks/1454vpw-cvghc.js` (**35.9 KB raw / 10.0 KB gz**, sonner +
  a lucide icon) and `.next/static/chunks/3-zzbce_v74kh.js` (**49.0 KB raw / 16.9 KB gz**,
  framer-motion's `LazyMotion`/`m` core), both in the first-load set of **all 52 non-lab routes**.
- **Phase**: (no action) — recorded as the measured ceiling on this lens
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: the 14 chunks common to every non-lab route total **621.1 KB raw**, against a
  non-lab median first load of 1,069 KB. Their composition: `react-dom` 223.7 KB (69.8 gz), the
  Next runtime 125.9 KB (33.7 gz), motion 49.0 KB (16.9 gz), sonner 35.9 KB (10.0 gz), and nine
  app chunks. Everything else in this dependency list is server-only, dev-only, or already
  behind a dynamic import. **There is no remaining dependency swap in this repo that takes a
  meaningful number of kilobytes off a shipping route.** `motion` was the big one and LazyMotion
  has already taken it (`motion-features.tsx` is worth reading — it explains why `domMax` and not
  `domAnimation`, and the layout/drag census backs it up: 278 `layout` and 43 `drag` references
  in non-lab code). `posthog-js` was the other and it is now lazy.
- **What to do**: nothing. Sonner at 10 KB gz for the app's entire toast system across 57 files
  is a good price and there is no lighter equivalent that keeps the same behaviour (and the
  brief forbids proposing a swap that changes UX). Motion's remaining 16.9 KB gz is the
  `LazyMotion` shell plus `m`; cutting further means `domAnimation`, which
  `motion-features.tsx:14-17` already documents would "silently break both" the layout marker
  and the drag surfaces.
- **Saving**: 0. Stating a floor is the finding.
- **Risk & gate**: n/a.
- **Confidence**: high — these are measured `gzip -9` sizes of the actual built chunks, not
  bundlephobia estimates.
- **Notes**: chunk-level attribution over-counts where a chunk mixes vendor and app code, so
  treat "base-ui ≈ 121-171 KB raw per route across three chunks" as an upper bound rather than a
  figure. Precise per-module attribution is the bundle lens's job and needs a source-map build
  Turbopack did not emit here. Cross-filed to them.

### dependency-diet-15 - `motion-features.tsx` names a test file that has never existed
- **Where**: `src/components/common/motion-features.tsx:23`
  (`` `no-motion-namespace.test.mjs` is what keeps the app side honest instead. ``); the real
  file is `src/components/common/motion-namespace-rule.test.mjs`.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `find . -name "*no-motion-namespace*"` returns nothing, and
  `git log --diff-filter=D --name-only -- '*no-motion-namespace*'` shows it was never deleted
  either — it was never created under that name. The test that actually exists was added in the
  same commit as the comment (`8314f24`, "perf(motion): the app animates through `m`, features
  load async") as `motion-namespace-rule.test.mjs`, and it does exactly what the comment claims
  (`:45-50` walks every file importing `motion/react` and fails on a stray `motion.`; `:69-71`
  asserts the LazyMotion is mounted with `domMax`).
- **What to do**: change the filename in the comment. One word.
- **Saving**: 0 lines. It stops the next session grepping for a file that is not there and
  concluding the guard was removed — which, given how carefully this repo names its pins, is a
  real hazard, not a typo.
- **Risk & gate**: none.
- **Confidence**: high.
- **Notes**: found from the dependency side while verifying that audit 1's LazyMotion finding
  had actually landed. It belongs to whichever lens owns `src/components/common/`; filed here
  because I have the evidence and it costs them nothing to take.

---

## The full 51-row table

Import sites are lines matching `from "<pkg>"`/`require("<pkg>")` across `src` + `scripts` +
`e2e` + `prisma` + root configs, excluding `src/generated`. "Excl. MB / N" is the exclusive
transitive subtree — packages reachable from this dependency and no other direct one — computed
from `package-lock.json` with npm hoisting rules. "Client" is measured against
`.scratch/audit2-build/.next/static/chunks`.

### dependencies (33)

| # | package | sites | excl. MB / N | client | verdict |
|---|---|---|---|---|---|
| 1 | `@aws-sdk/client-s3` | 3 (storage.ts + 2 scripts) | 9.7 / 28 | 0 | keep — 1.31 MB of a 35.9 MB traced function; see not-finding 1 |
| 2 | `@aws-sdk/s3-request-presigner` | 1 (storage.ts:8) | 0.1 / 1 | 0 | keep — presigned direct PUT is load-bearing |
| 3 | `@base-ui/react` | 11 (all subpath imports) | 16.9 / 10 | ~121-171 KB raw/route (3 chunks) | keep — the shadcn base-nova primitive layer |
| 4 | `@formkit/auto-animate` | 12 (10 non-lab) | 0.1 / 1 | small | keep — DESIGN-SYSTEM.md:349 makes it mandatory on lists |
| 5 | `@paralleldrive/cuid2` | 17 (8 src, 9 scripts) | 2.2 / 4 | 0 | parked — finding 09 |
| 6 | `@phosphor-icons/react` | 21 files (17 non-lab) | 56.7 / 1 | 20 glyphs only, tree-shaken | keep — finding 13 (owner) |
| 7 | `@prisma/adapter-pg` | 3 | 0.2 / 3 | 0 | keep |
| 8 | `@prisma/client` | 0 direct; 43 inside `src/generated` | 71.9 / 2 | 0 | keep — knip false positive, finding 11 |
| 9 | `@sentry/nextjs` | 3 (`instrumentation.ts`, `next.config.ts`, `report-error.ts`) | 147.5 / 137 | **0 bytes** | keep — 0.26 MB shipped server; finding 06 |
| 10 | `@upstash/ratelimit` | 1 (`rate-limit.ts:1`) | 0.5 / 2 | 0 | keep — 15 named limits, 15 importer files behind it (audit-1 not-finding 6) |
| 11 | `@upstash/redis` | 1 (`rate-limit.ts:2`) | 0.0 / 0 | 0 | keep |
| 12 | `bcryptjs` | 13 (4 src, 9 scripts) | 0.1 / 1 | 0 | keep — not-finding 2 |
| 13 | `class-variance-authority` | 2 (button.tsx `cva()`, one type import) | 0.0 / 1 | ~1 KB gz | keep — not-finding 3 |
| 14 | `clsx` | 1 (`utils.ts` `cn()`, fan-in 165) | 0.0 / 0 | ~0.4 KB gz | keep |
| 15 | `d3-geo` | 2 (shipped map + lab map) | 0.4 / 1 | in the 66.3 KB `/directory` chunk | keep |
| 16 | `d3-selection` | 2 | 0.0 / 0 | (same chunk) | keep — declare its @types, finding 07 |
| 17 | `d3-zoom` | 2 | 0.6 / 6 | (same chunk) | keep |
| 18 | `lucide-react` | 141 files, 111 distinct icons | 45.1 / 1 | per-icon (Next default optimize list) | keep |
| 19 | `motion` | 95 | 10.7 / 4 | 16.9 KB gz/route | keep — LazyMotion already shipped; finding 14 |
| 20 | `next` | 301 | 0.0 / 0 (198.5 MB shared) | framework | keep |
| 21 | `next-auth` (exact beta.32) | 10 | 8.0 / 6 | 0 | keep — pin deliberate (renovate.json) |
| 22 | `next-themes` | 4 (+5 comment mentions) | 0.0 / 1 | small | keep — dark mode |
| 23 | `posthog-js` | 1 (`posthog-client.ts:62`, dynamic) | 70.1 / 12 (incl. `core-js` 14.8) | **0 in first load**; 79.0 KB gz lazy | keep — the lazy load is new since audit 1 |
| 24 | `prisma` | 1 (`prisma.config.ts`) + `postinstall` | 243.7 / 107 | 0 | keep in `dependencies` — audit 1 measured the move as worthless; see carry-overs |
| 25 | `react` (exact 19.2.4) | 240 | 0.0 / 0 | framework | keep |
| 26 | `react-dom` (exact) | 3 | 0.0 / 0 | 69.8 KB gz/route | keep |
| 27 | `resend` | 1 (`email.ts:1`) | 0.8 / 5 | 0 | finding 08 — replaceable by one `fetch` |
| 28 | `sharp` | 13 | 0.0 / 0 (19.0 MB shared with next) | 0 | keep — 16.95 MB of libvips in the upload function is the price of WebP |
| 29 | `sonner` | 57 | 0.2 / 1 | 10.0 KB gz/route | keep — finding 14 |
| 30 | `tailwind-merge` | 1 (`utils.ts` `cn()`) | 0.0 / 0 (1.0 MB) | ~7 KB gz est. | keep |
| 31 | `topojson-client` | 2 | 0.3 / 2 | in the `/directory` chunk | keep |
| 32 | `world-atlas` | 1, **lab only** | 7.9 / 1 | 64.2 KB gz on `/lab/directory` only | **finding 02** — relocate or delete |
| 33 | `zod` (v4) | 6 (5 × `zod/v4`, 1 type-only) | 0.0 / 0 (6.0 MB) | 0 (server-only validators) | keep |

### devDependencies (18)

| # | package | sites | excl. MB / N | verdict |
|---|---|---|---|---|
| 34 | `@playwright/test` | 5 (`e2e/`) | 18.1 / 3 | keep — the visual suite |
| 35 | `@tailwindcss/postcss` | 1 (`postcss.config.mjs`) | 11.8 / 28 | keep |
| 36 | `@types/d3-geo` | tsc-implicit | 0.0 / 2 | keep (`d3-geo` ships no types) |
| 37 | `@types/d3-zoom` | tsc-implicit | 0.2 / 4 | keep |
| 38 | `@types/geojson` | 2 `import type` sites | 0.0 / 1 | keep |
| 39 | `@types/node` (24) | tsc | 0.0 / 2 | keep |
| 40 | `@types/pg` | tsc for 17 script sites | 0.0 / 11 | keep |
| 41 | `@types/react` | tsc | 0.0 / 2 | keep |
| 42 | `@types/react-dom` | tsc | 0.1 / 3 | keep |
| 43 | `@types/topojson-client` | tsc-implicit | 0.0 / 3 | keep |
| 44 | `dotenv` | 18 (0 in `src`) | 0.0 / 1 | keep — correctly dev (audit-1 move stands) |
| 45 | `eslint` | 1 (config) | 0.0 / 85 | keep |
| 46 | `eslint-config-next` (exact 16.3.3) | 2 | 50.8 / 176 | keep — must track `next` (renovate rule) |
| 47 | `pg` | 17 (0 in `src`) | 0.0 / 14 | keep — runtime `pg` arrives via `@prisma/adapter-pg`'s own `pg: ^8.16.3` |
| 48 | `puppeteer` | 26 script files | 34.3 / 18 | keep — finding 12 (deferred) |
| 49 | `shadcn` | **0 JS imports**; 1 CSS import | **92.3 / 234** | **finding 01 — remove** |
| 50 | `tailwindcss` | 1 (`globals.css:1`) | 0.0 / 1 | keep |
| 51 | `typescript` | tsc | 0.0 / 1 (22.8 MB) | keep |

**Orphaned `@types`: none.** Every `@types/*` in the list corresponds to a runtime package that
ships no types of its own (verified per package: `d3-geo`, `d3-zoom`, `pg`, `react`, `react-dom`,
`topojson-client` all have no `types`/`typings` field and no `index.d.ts`), or is
`@types/node`/`@types/geojson`, which have no runtime twin by design. The gap is the reverse —
one `@types` package is *missing* (finding 07).

### Lockfile facts (the charter's explicit question)

- **`package-lock.json`: 541,687 bytes, 15,208 lines, `lockfileVersion: 3`, 1,082 resolved
  packages.** It is 0.54 MB of the root directory's 1.15 MB tracked bytes
  (`raw/tracked-bytes-by-dir.txt`), and it is not compressible from our side: it is a generated
  artefact whose size is the graph's size.
- **510 packages in the production graph** (what `npm audit --omit=dev` and a `--omit=dev`
  install see), **572 dev-only**, 118 optional, 38 peer.
- **The ten heaviest exclusive subtrees** (packages reachable from that direct dependency and no
  other; `du -sk`, so nested `node_modules` double-count slightly):

  | rank | direct dependency | exclusive packages | MB | section |
  |---|---|---|---|---|
  | 1 | `prisma` | 107 | 243.7 | dependencies (measured; see carry-overs) |
  | 2 | `@sentry/nextjs` | 137 | 147.5 | dependencies |
  | 3 | **`shadcn`** | **234** | **92.3** | devDependencies — **finding 01** |
  | 4 | `@prisma/client` | 2 | 71.9 | dependencies |
  | 5 | `posthog-js` | 12 | 70.1 | dependencies |
  | 6 | `@phosphor-icons/react` | 1 | 56.7 | dependencies |
  | 7 | `eslint-config-next` | 176 | 50.8 | devDependencies |
  | 8 | `lucide-react` | 1 | 45.1 | dependencies |
  | 9 | `puppeteer` | 18 | 34.3 | devDependencies |
  | 10 | `@playwright/test` | 3 | 18.1 | devDependencies |

  (`next` itself is 198.5 MB but shows 0 exclusive, because `eslint-config-next` and
  `@tailwindcss/postcss` reach into the same subtree. Total `node_modules`: **1.2 GB**.)

### Ranked by what each dependency actually costs (the charter's first question)

**By client KB (gzipped, measured on the built chunks, first load):**
1. `react-dom` 69.8 · 2. Next runtime 33.7 · 3. `@base-ui/react` ~19.3 (one of three chunks) ·
4. `motion` 16.9 · 5. `sonner` 10.0 · 6. `tailwind-merge` ~7 (est.) · 7. `d3-geo`/`d3-zoom`/
`topojson-client` 22.8 **on `/directory` only** · 8. `clsx` + `class-variance-authority` ~1.5 ·
9. everything else **0**. `posthog-js` (79.0 gz) and `world-atlas` (64.2 gz) are both off the
first load — the first by design, the second because only a lab route loads it.

**By server / disk MB:** `prisma` 243.7 · `@sentry/nextjs` 147.5 · `shadcn` 92.3 ·
`@prisma/client` 71.9 · `posthog-js` 70.1 · `@phosphor-icons/react` 56.7 · `eslint-config-next`
50.8 · `lucide-react` 45.1 · `puppeteer` 34.3 · `@playwright/test` 18.1.

**By import sites:** `next` 301 · `react` 240 · `lucide-react` 142 · `motion` 95 · `sonner` 57 ·
`puppeteer` 25 · `@phosphor-icons/react` 21 · `dotenv` 18 · `pg`/`@paralleldrive/cuid2` 17 ·
`sharp`/`bcryptjs` 13 · `@formkit/auto-animate` 12 · `@base-ui/react` 11 · `next-auth` 10 ·
`zod` 6 · `next-themes` 4 · `@aws-sdk/client-s3`/`@prisma/adapter-pg`/`@sentry/nextjs` 3 ·
`class-variance-authority`/`d3-*`/`topojson-client`/`world-atlas` 2 ·
`clsx`/`tailwind-merge`/`resend`/`posthog-js`/`@upstash/*`/`@aws-sdk/s3-request-presigner`/`prisma` 1 ·
`shadcn` 0.

**The three safe, autonomous removals**, in order of value:
1. **`shadcn`** (finding 01) — 234 packages, 92.3 MB, plus the `postcss-selector-parser`
   override. Needs 40 lines copied into `globals.css` first, and a `npm run visual`.
2. **`world-atlas`** (finding 02) — 1 dep, 7.9 MB, 64.2 KB gz off a lab route. Option (a), the
   one-line section move, is safe with no code change at all.
3. **the dead allowlist entry** (finding 03) — not a package, but the same class of removal:
   12 lines of a security gate that describe an advisory that no longer exists.
   (`@paralleldrive/cuid2` is the fourth, and I recommend against it — see finding 09.)

---

## Owner decisions

**1. Should the shadcn command-line tool stay installed?** Today the project keeps a local copy
of the shadcn command-line tool — the thing that pastes a new button or dialog into
`src/components/ui/` when you ask for one. Keeping it installed drags in **234 other packages
and about 92 MB**, roughly a fifth of everything in the project's dependency folder, including a
web-server library, a network-mocking library and a TypeScript compiler wrapper, none of which
this site uses for anything. The tool has not been used since 18 July. It can be run on demand
instead (`npx shadcn@4 add …`), which downloads it for that one command and throws it away. The
one thing that has to move first is a small stylesheet the tool provides, which the app really
does use — about 40 lines that need copying into `globals.css`. **Recommendation: do it.** The
only thing lost is that the tool is no longer pinned to an exact version, which matters if a
future release changes how it reads `components.json`; pinning the major (`shadcn@4`) covers that.

**2. Should the second icon set stay?** The site uses two icon libraries by design — Lucide for
buttons and menus, Phosphor for the decorative ones (the heart, the feather, the tree). Phosphor
is **56.7 MB** on disk for the **20** icons actually used. None of that reaches anybody's
browser; it is disk space on the developer's machine and seconds on each install. The
alternative is to copy those 20 shapes into the project as small files and drop the library,
which would mean every future decorative icon is a manual copy rather than a one-line import.
**Recommendation: keep it.** The rule that there are two sets is written into the project's own
design rules for a reason, and the cost is the cheapest kind this project pays.

**3. Should Sentry's uploader keep permission to run?** Sentry (the error alarm) installs a
34.6 MB helper program whose job is to upload debugging maps after each deploy. That upload is
deliberately switched off — there is no Sentry token, on purpose — so the helper never runs. Its
permission was granted "so a future npm cannot quietly drop Sentry's source-map upload", which
describes something that is not happening. **Recommendation: leave it alone.** It costs nothing
while off, and it means the day you add a Sentry token, the maps start working without anybody
having to rediscover this.

**4. Two ways of driving a browser are installed.** The project has both Puppeteer and
Playwright — two libraries that do the same job (open Chrome, click things, take screenshots),
together about 65 MB. Playwright runs the automatic screenshot comparison; Puppeteer runs 26
hand-written checking scripts. Moving those 26 scripts onto Playwright would drop one of them.
**Recommendation: not before launch.** It is a rewrite of 26 files for 34 MB of disk, and the
risk is that a checking script quietly stops working at the moment you most want it.

---

## Not-findings

**1. The AWS SDK stays. (The charter's explicit question, answered with a measurement.)**
Audit 1 filed the `aws4fetch` swap as a deferred note against "11 MB of server weight". That
number is `node_modules` disk, not what ships. I traced the real serverless output for
`/api/upload` (`.next/server/app/api/upload/route.js.nft.json`, 572 files, 35.9 MB) and summed
it by package:

```
16.95 MB  @img/sharp-libvips-darwin-arm64      0.30 MB  @aws-sdk/client-s3
 9.19 MB  (app)                                0.15 MB  @aws-sdk/core
 4.58 MB  @prisma/client                       0.11 MB  @aws-sdk/nested-clients
 1.42 MB  next                                 0.46 MB  @smithy/core
--- @aws-sdk + @smithy total: 1.31 MB (3.6% of the function)
```

A hand-rolled SigV4 signer would save **1.31 MB of a 35.9 MB function** and some client-init
milliseconds, at the cost of hand-writing request signing for the file `storage.ts` — the
C2-audited ownership and deletion choke point. And it would not even be complete: two scripts
(`scripts/dev/sweep-stranded-originals.mjs:44`, `scripts/dev/import-album.mjs:66`) use
`ListObjectsV2Command` and `DeleteObjectCommand`, so either the dependency stays for them or the
signer has to grow a paginated list. **Verdict: keep, and stop deferring it — the honest answer
is no.**

**2. `bcryptjs` stays, and the swap can never complete. (The charter's other explicit question.)**
`bcryptjs` is **140 KB with zero dependencies** (`node_modules/bcryptjs/package.json` has no
`dependencies` key) and reaches the browser never. Node's `crypto.scrypt` is native and would
delete it. It cannot: password hashes are one-way, so an existing member's bcrypt hash can only
be replaced during a successful sign-in, and a dormant account never signs in. Any migration
therefore has to keep **both** algorithms indefinitely — which is more code, not less, plus a
column to record which one a row uses. It would also touch `src/lib/auth.ts:151,169,180` and the
`DUMMY_PASSWORD_HASH` at `:52`, whose whole purpose is that the *rejecting* branches cost the
same time as the accepting one (`bcryptjs` short-circuits on a parse error and the equalisation
is lost — the file says so at `:51`); a mixed-algorithm world reintroduces exactly the timing
difference that constant exists to erase. **Verdict: keep. There is no version of this that is
smaller.**

**3. Three packages for `cn()` is correct.** `clsx` (~0.4 KB gz) is the class joiner and is also
`class-variance-authority`'s only dependency; `tailwind-merge` (~7 KB gz) resolves conflicting
Tailwind classes, which `guide-overlay.tsx:74` and `pill-shell.tsx:123` both have comments about
relying on; `class-variance-authority` (44 KB on disk, 1 package, ~1 KB gz) is called **once**,
in `button.tsx:25`, but its `VariantProps<typeof buttonVariants>` type flows to
`create-post-form.tsx:1096,1130` and `library-picker-dialog.tsx:35-36`. Replacing `cva` with a
hand-rolled lookup table would be ~20 lines and would lose that inference. Total client cost of
the trio: **~8.5 KB gz on every page**, for the class system the entire UI is written in.
**Verdict: keep all three.**

**4. `@upstash/ratelimit` + `@upstash/redis` are one import each and both earn it.** Two import
lines in one file (`src/lib/rate-limit.ts:1-2`), 0.5 MB exclusive between them, 0 client bytes.
They back **15** named limits (`signup`, `reset`, `trivia`, `posts`, `comments`, `uploads`, `collectionUploads`, `photoEdits`, `photoReview`, `reports`, `catchups`, `contributions`, `reauth`, `export`, `search`) used across 15 files. Audit 1's not-finding 6 defends them; nothing
has changed. **Verdict: keep.**

**5. `d3-geo` + `d3-selection` + `d3-zoom` + `topojson-client` are four packages for one map, and
that is the right number.** Together: 1.3 MB exclusive, 11 packages, all four imported in
`alumni-map.tsx:7-10` for `geoNaturalEarth1`, `geoPath`, `select`, `zoom`, `zoomIdentity` and
`feature`. `d3-selection` is not optional — `d3-zoom` operates on a d3 selection, so `select()`
is the adapter, not a convenience. `topojson-client`'s `feature()` is the only thing that turns
the atlas into GeoJSON. There is no smaller combination that draws a pannable world map.
**Verdict: keep.** (`world-atlas`, the fifth member of that family, is a different story —
finding 02.)

**6. `@sentry/nextjs` ships nothing to the browser.** Verified rather than assumed: the only
`.js` chunk in the whole build containing the string "Sentry" is posthog's
(`24740q0lmcv1n.js`), and that is a posthog integration reference, not the Sentry SDK. Audit 1's
not-finding 8 held. **Verdict: keep, server-only confirmed at 2026-09-03.**

**7. `dotenv`, `pg`, `@types/d3-zoom` are in the right section now.** Audit 1 moved all three to
`devDependencies` in `fd62729`. I re-verified: zero `src` imports of `dotenv` or `pg`; the
runtime `pg` arrives through `@prisma/adapter-pg`'s own `"pg": "^8.16.3"`, which is why
`node_modules/pg` is marked non-dev in the lockfile. **Verdict: correct as-is.**

**8. `zod` is server-only and costs the browser nothing.** Six import sites, five of them
`zod/v4` and one type-only; all in server actions and validators. No chunk contains a zod
signature. Its 6.0 MB is disk. **Verdict: keep.** (The `zod` vs `zod/v4` split audit 1 flagged
was unified in `c85658f`; only the type-only import at `profile-actions.ts:28` uses the
`zod/v4` path for a type, which is consistent.)

**9. `puppeteer.skipDownload: true` in `package.json` is the audit-1 fix, done.** `.puppeteerrc.cjs`
is gone; the setting moved into `package.json:87-89` in `cb3709d`, and the owner deleted the
357 MB of cached Chrome on 2026-08-26. `npm run screenshot` was verified working with
`PUPPETEER_EXECUTABLE_PATH` at that time. **Verdict: closed, nothing to do.**

**10. `allowScripts` is a real npm field, not dead config.** It is not read by anything in this
repo — I checked `scripts/`, `.github/`, `docs/` and `.npmrc` (absent) — because it is read by
**npm itself**: npm 11 warns about install scripts outside it and npm 12 will refuse them
(`cf6b482`). The five approvals and three denials are all justified. **Verdict: keep.** (The one
inconsistency inside it is finding 06.)

---

## Audit-1 carry-overs in this territory

- **`prisma` → `devDependencies` (audit-1 finding 02): stays refused, and I have new evidence
  for *why it matters*, not for retrying it.** `@prisma/client@7.10.0` still declares
  `"prisma": "*"` as an **optional peer** (`peerDependenciesMeta.prisma.optional: true`),
  which is the mechanism the fix session measured: npm keeps the CLI in the `--omit=dev` graph
  whichever section lists it. Confirmed in the lockfile — `node_modules/prisma` is marked
  non-dev, along with its whole 107-package / 243.7 MB subtree (`effect` 32.7, `@electric-sql/pglite`
  23.2, `@prisma/dev` 18.3, `@prisma/studio-core` 42.2, `elkjs` 7.7). **Not retried.** The new
  fact worth recording: three of the five overrides exist because of that graph
  (`deepmerge-ts` via `@prisma/config`, `mysql2` via `prisma` itself, `fast-uri` via
  `@prisma/streams-local` → `ajv`), and it is why `a13a8a9` went red in CI while green locally.
  That is a cost of a decision already taken, not an argument to re-take it.
- **`@paralleldrive/cuid2` → `randomUUID` (audit-1 finding 14): still parked.** Finding 09
  reports its state and recommends closing it as "won't do".
- **`motion` → LazyMotion (audit-1 finding 12): DONE.** `src/components/common/motion-features.tsx`
  ships `LazyMotion features={loadDomMax}`; 181 `m.` sites in non-lab code and 0 stray `motion.`;
  `src/components/common/motion-namespace-rule.test.mjs` is the pin (the comment in `motion-features.tsx:23` names it wrongly — finding 15). The remaining shared motion chunk is 49.0 KB raw /
  16.9 KB gz. Audit 1 predicted 15-20 KB gz saved if `domAnimation` sufficed, ~8-12 if `domMax`
  was forced; `domMax` was forced (278 `layout` + 43 `drag` references) and the measured floor
  is consistent with that. **Closed.**
- **Two analytics SDKs (audit-1 finding 13, an open owner decision): resolved.**
  `@vercel/analytics` is gone from `package.json` entirely, and `posthog-js` now loads through
  `void import("posthog-js")` on an idle callback (`posthog-client.ts:62`), so its 244.6 KB raw /
  79.0 KB gz chunk is in **zero** routes' first load. This was the single largest client-side
  dependency item in audit 1 and it is fully closed. **Moot.**
- **`@next/bundle-analyzer` removal (audit-1 finding 05): done**, `npm run analyze` now runs
  `next experimental-analyze` (`package.json:22`). OPERATIONS §5 documents the change.
- **`xlsx` (audit-1 finding 15, owner decision): resolved.** The owner decided no more
  spreadsheets are coming; the workbooks were converted to CSV and the dependency deleted
  (`938a898`). Gone from `package.json`. **Closed.**
- **Puppeteer's 357 MB of cached Chrome (audit-1 owner item 3): done**, deleted by the owner
  2026-08-26.
- **The `@auth/prisma-adapter`, `supercluster`, `d3-scale`, `@types/*` removals (audit-1 finding
  01, 04, 07): all done** in `931a4cd`; none of those names appears in `package.json` or the
  lockfile.
- **`tw-animate-css` (audit-1 finding 09): removed entirely** in `add8dd2`, not just
  re-sectioned. `globals.css` no longer imports it.

---

## For other lenses

- **`src/app/lab/directory/_maps.tsx:28`** compiles a 198.3 KB raw / 64.2 KB gz chunk into
  `/lab/directory`'s 965 KB first load. Bundle lens: this is the largest single vendor chunk in
  the whole build and it exists on one lab page. See finding 02(b).
- **`src/lib/mail-policy.ts`** — finding 08 hinges on whether `isTransientMailError` and
  `quotaExceeded` read SDK-specific error fields or just `message`/`name`. Whoever owns
  `src/lib/email*.ts` should answer that in their report; if the answer is "SDK-specific",
  finding 08 should be dropped.
- **`next.config.ts:230`** — with finding 10's measurement in hand, the bundle lens can decide
  whether the `optimizePackageImports` entry is still doing anything or whether Turbopack's own
  tree-shaking has made it redundant. That needs a two-build comparison I am not allowed to run.
- **`.next/static/chunks/32v74upyu8cz7.css` is 232 KB raw / 32 KB gz** and rides every page. The
  only dependency-shaped contribution I could find is `shadcn/tailwind.css`'s five used
  `@custom-variant`s, which emit no bytes of their own. The brief says the lab's CSS share is
  still unmeasured — it is not a dependency question, but finding 01 touches `globals.css`, so
  whoever measures it should sequence after finding 01, not before.
- **`scripts/qa/audit-status.mjs`** references the npm-audit-gate allowlist. Whoever owns the
  QA scripts should check whether the status board counts the allowlist entry finding 03 removes.
- **`src/components/analytics/posthog-client.ts`** — 45.7 MB of `posthog-js` plus 14.8 MB of
  `core-js` on disk, for a lazily-loaded 79.0 KB gz chunk. Nothing to do dependency-side, but
  the analytics lens may want to know that `core-js` (a polyfill set for browsers this app does
  not support) is posthog's, and that posthog offers no lighter build.
- **`src/components/ui/separator.tsx:17`, `dialog.tsx:39,67,69`, `dropdown-menu.tsx:77`,
  `select.tsx:143`, `combobox.tsx:128`** are the six files whose classes depend on
  `shadcn/tailwind.css`. Whoever owns `src/components/ui/` should sanity-check my variant census
  before finding 01 lands.
- **`package.json` has no `engines` field and the repo has no `.nvmrc` or `.node-version`.**
  `.github/workflows/check.yml:46` pins Node 24, `@types/node` is `^24`, and
  `@prisma/client@7.10.0` declares `engines: ^20.19 || ^22.12 || >=24`. Nothing warns when a
  local Node drifts from CI's, and the brief records `type-coverage` crashing on Node 26 twice.
  Config lens's call: one `"engines": { "node": ">=24" }` line would make `npm install` say so.
  I have not filed it as a finding because it adds a line rather than removing one, and the
  owner's brief is about less.
- **`src/components/common/motion-features.tsx:23`** — finding 15, a one-word comment fix in
  the components territory.

---

## Metrics

- **Dependencies**: 51 declared (33 runtime + 18 dev), down from 61 at audit 1 (10 removed,
  none added). Lockfile: **1,082 resolved packages**, 510 in the production graph, 572 dev-only,
  15,208 lines / 541,687 bytes.
- **node_modules**: 1.2 GB total. Three packages account for **483 MB** of it (`prisma` 243.7,
  `@sentry/nextjs` 147.5, `shadcn` 92.3, exclusive subtrees). The single removal proposed here
  takes out 92.3 MB and 234 packages.
- **Client**: 14 chunks ride all 52 non-lab routes, **621.1 KB raw** in total. Of that,
  identifiable vendor code is `react-dom` 223.7 KB, the Next runtime 125.9 KB, motion 49.0 KB
  and sonner 35.9 KB. Non-lab median first load 1,069 KB raw. **Net client saving available from
  dependency work: 0 KB.**
- **Server**: `/api/upload`'s traced function is 35.9 MB over 572 files —
  `@img/sharp-libvips` 16.95, app code 9.19, `@prisma/client` 4.58, `next` 1.42,
  `@aws-sdk`+`@smithy` 1.31, everything else under 0.3. `instrumentation.js` traces 1.9 MB, of
  which Sentry is 0.26.
- **Findings**: 15 (11 structural, 4 hygiene). 4 owner decisions. 10 not-findings. 8 audit-1
  carry-overs, of which 6 are now closed or moot.
- **Total measured savings.** The two low-risk removals (findings 01 + 02b) together:
  **2 dependencies, 235 lockfile packages (21.7 % of 1,082), 100.2 MB of node_modules,
  1 override, and 64.2 KB gz off `/lab/directory`.** Add finding 08 (`resend`, medium risk) and
  it becomes **3 dependencies, 240 packages (22.2 %), 101.0 MB**. Add finding 09 (`cuid2`,
  which I recommend against) and it is 4 / 244 / 103.2. Plus ~12 lines out of a security gate
  (finding 03) and one `@types` line added (finding 07). **Zero lines and zero bytes off any
  shipping page** — which is the honest shape of this lens after audit 1 already took the two
  client-side items that mattered.

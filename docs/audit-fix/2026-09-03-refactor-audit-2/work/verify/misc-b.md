# misc-b — adversarial verification notes (refactor audit 2)

Verifier: misc-b. Charter: findings whose evidence names no single file — repo-wide counts,
cross-cutting patterns, process claims. Every number below was recomputed from the tree, the
raw tool output, or the read-only build; nothing is taken from a report on trust.

**Tree state when I ran.** HEAD is `74cc61a` ("fix(retention): notifications are kept 30 days,
everywhere"), i.e. TWO commits past the audit baseline `72b5a1d` that `brief-common.md` §3
names. `git status --short`: `M docs/audit-fix/README.md`, `M progress.md`, `?? docs/audit-fix/
2026-09-03-refactor-audit-2/` — the peer's `M src/components/common/image-viewer.tsx` that
several finders reported as WIP has since landed in `72b5a1d`, so `image-viewer.tsx` is clean
and line-number citations against it (fresh-code-09) are valid at HEAD. Read-only throughout:
`rg`, `sed`, `wc`, `git log/show/ls-files`, `python3`/`node -e` over files, `gzip -c | wc -c`
over the pre-built chunks. No build, no tsc, no knip, no browser, no database.

---

## duplication-21 — "Register: the 27 lab-vs-shipped clones" → **confirmed-with-correction**

Re-parsed `raw/jscpd.txt` in full (232 "Clone found" blocks, both sides + line count each) and
classified by whether `app/lab` appears in one path, both, or neither:

```
total clones 232
lab-lab      89   (1457 duplicated lines)
lab-shipped  29   ( 435 duplicated lines)
neither     114
```

- **The count is 29, not 27; the line total is 435, not 418.** duplication-21's own metrics
  block ("27 lab-vs-shipped clones (418 lines)") is off by the two `lab/composer/_variants.tsx`
  pairs, which its "Where" list omits entirely: `_variants.tsx` ↔ `components/layout/search-pill.tsx`
  (8 lines) and `_variants.tsx` ↔ `components/posts/create-post-form.tsx` (9 lines).
  **lab-12 has the right numbers** (89 / 29 / 114) and the right table; where the two overlap,
  lab-12 is the safer register and duplication-21 should be folded into it.
- **"chain-lines … 11 clones, 192 lines" is wrong.** `chain-lines/page.tsx` ↔ `houses-chain.tsx`
  is **9 clones / 167 lines** (63, 27, 17, 12, 11, 10, 10, 9, 8). Adding the three
  `profiles/_chain-kit.tsx` ↔ `houses-chain.tsx` pairs (24, 16, 11) gives 12 clones / 218 lines.
  Neither reading is 11/192.
- **"8 lab files import from `_kit`" is wrong: 15 do.**
  `rg 'from "(\.\.?/)+_kit"' src/app/lab` → `_leaves, transitions, eggs, _hoopoe, feed-canvas,
  feedback, mascot-moments, focus, crop, loading-ideas, composer/page, landing, _birds, loading,
  composer/_variants` = 15. Only **2** of those import `SPRINGS` from `_kit` (`_hoopoe.tsx:13`,
  `composer/_variants.tsx:46`); the other 20 lab `SPRINGS` importers already come from
  `@/components/common/motion`. "26 already import from common/motion" is right
  (`rg -l '@/components/common/motion"' src/app/lab | wc -l` → 26).
- **The load-bearing claim holds.** `rg '"@/app/lab' src --glob '!src/app/lab/**'` → **0 hits**.
  The only occurrences of the string `app/lab` outside the lab are comments and test path
  strings (`proxy.ts:210`, `post-card.tsx:180`, `notification-links.test.mjs:56`,
  `motion-namespace-rule.test.mjs:20,23,26`, `motion-features.tsx:21`, `focus-recipe.test.mjs:71,76`).
  No lab code reaches a member.
- Spot-checked `_kit.tsx:29-33` vs `motion.tsx:17-21`: SPRINGS' three keys (`gentle`, `snappy`,
  `settle`) are byte-identical including the trailing comments; `motion.tsx` has a fourth,
  `firm` (2026-08-29, the owner's "that spring is too loose"). The finding's "three of
  motion.tsx's four keys" is right.
- Saving is 0 either way, so none of this changes what a fix session does — it changes what the
  register says, and the register is the whole deliverable.

## lab-12 — "The 29 lab↔shipped clones are design history" → **confirmed**

My independent parse reproduces **89 lab↔lab, 29 lab↔shipped, 114 shipped↔shipped** exactly.
Its table sums to 29 rows and to 435 lines, which is the sum I computed clone-by-clone. Every
per-file line multiset matches (chain-lines 63/27/17/12/11/10/10/9/8; letterhead-2 39/11;
_chain-kit 24/16/11; letterhead 20/7; eggs 18/12/11; birds-bg 15; mascot-moments 15/9;
broadsheet 12; composer 9/8; editorial 9; support-ideas 9; _kit 7; dossier 6).
The header quote is verbatim at `src/app/lab/chain-lines/page.tsx:12-15`:
*"This room draws the SAME shipped geometry (packing, serpentine, turns, all copied from
src/components/profile/houses-chain.tsx) six different ways, so the pick is about the line and
only the line."* Nothing to do; recorded correctly.

## lab-05 — "The 48 unused lab exports … (de-export 41, dead 4, keep 3)" → **confirmed-with-correction**

Two corrections, one of them consequential.

1. **The population is 57, not 48.** `grep -c 'src/app/lab' raw/knip-repo-config.txt` → **57**:
   48 rows inside "Unused exports (70)" (file lines 12-59 — the finding says "39 lab lines" in
   that exact range, which contradicts both the range and its own total) and 9 inside "Unused
   exported types (11)" (lines 83-91). The finding's *table*, however, enumerates all 57
   symbols, and its tally is internally right at 57: 4 dead + 12 "kept as documentation"
   (`LIVE_ROWS/LIVE_TOTAL/TAGGED/FIELDS/STAGES` = 5, `PLEDGE/SEGMENTS/MONTHLY/BUILD_COST/
   BUILD_RECOVERED` = 5, `LabStatus/LabChildEntry` = 2) + **41 de-export** = 57. So only the
   headline number and the "39" are wrong; the work is complete.
2. **`Sheared` is NOT dead — deleting it breaks `/lab/type`.** `src/app/lab/type/_specimens.tsx:38`
   exports `Sheared`, and the same file *uses* it at `:101`, `:118` and `:144`
   (`const wrap = (node) => (real ? node : <Sheared>{node}</Sheared>)`). knip lists it only
   because no *other* file imports it. The finding's "What to do" says "Delete the 4 …
   `type/_specimens.tsx:38-42`'s `Sheared` is five lines" — executing that is a compile error.
   `Sheared` belongs in the de-export column. **Dead count is 3, not 4; de-export is 42, not 41;
   the ~27-line saving drops to roughly 22.**
3. The other three dead symbols check out. `hoopoe-marks/page.tsx:15` imports exactly
   `{ Body, Crest, Face, G }` from `./_parts`, and `Feather` / `Eye` / `Bill`
   (`_parts.tsx:75,83,90`) have no other reference anywhere — every other `Feather` in
   `src/app/lab` is the lucide icon.
4. Spot-checks that pass: `BASE_CSS` (`_kit.tsx:234`) is used at `_kit.tsx:197` and nowhere
   else; `PEAK_PLANES` is genuinely imported by three rooms; `knip.jsonc:33` is indeed
   `"ignore": [".claude/**", "docs/**", "src/generated/**"]`, so the suggested ignore-list route
   is available.

## lib-core-config-06 — Sentry's injected `clientTraceMetadata` → **confirmed-with-correction**

Everything static checks out, and the gate as written cannot fire.

- `raw/build.txt:4-9` prints the five experiments including `· clientTraceMetadata` — verbatim
  as quoted.
- `rg 'clientTraceMetadata' next.config.ts src` → **0 hits**. It is not this project's option.
- The injector is real: `node_modules/@sentry/nextjs/build/cjs/config/withSentryConfig/
  getFinalConfigObjectUtils.js` — `function maybeSetClientTraceMetadataOption` begins at **:82**
  (the finding says :88-95; the injection statement is :90-95), and it spreads the user value
  *after* its own two, so the finding is right that setting `experimental.clientTraceMetadata: []`
  cannot remove them.
- `src/instrumentation.ts:11-17` quote is verbatim ("there is no browser SDK here … Adding it
  costs ~30KB gzipped on every page load").
- **The correction that matters: the proposed curl gate is void as written.**
  `src/instrumentation.ts:40-42` sets `const ENABLED = Boolean(process.env.VERCEL) ||
  process.env.SENTRY_DEV === "1"` and `Sentry.init({ ..., enabled: ENABLED })`. Next only emits
  the meta tags when the OTel propagator has something to inject — `app-page.runtime.prod.js`
  computes `iC(getTracer().getTracePropagationData(), E.clientTraceMetadata)` and
  `getTracePropagationData()` is `propagation.inject(context.active(), entries, setter)` with
  `iC = (e,t) => t ? e.filter(({key}) => t.includes(key)) : undefined`. On a local scratch build
  neither `VERCEL` nor `SENTRY_DEV` is set, so a local `curl … | grep '<meta name="sentry-trace"'`
  will return nothing **whether or not the option is there**, and the finding's own instruction
  ("If that returns nothing at HEAD, this finding is void") would close a live item as a
  not-finding. The fix session must run the curl with `SENTRY_DEV=1` (or against a preview
  deploy), not against a bare local build.
- I could not settle whether the tags are emitted per-response or only on sampled traces
  (`tracesSampleRate: 0.1`) without a server; the ~450-byte-per-document saving therefore stays
  an estimate. All 105 routes are `ƒ`; the only HTML on disk in the scratch build is
  `_global-error.html` / `500.html`, which carry neither tag.

## lib-core-config-07 — drop `https://*.posthog.com` from `img-src`/`connect-src` → **confirmed**

- `rg -n posthog next.config.ts` → the entry sits at **:92** (`img-src`) and **:121**
  (`connect-src`), exactly as cited.
- The contradicting comment is verbatim at `next.config.ts:65-67`: *"PostHog is same-origin
  (proxied through /ingest, next.config rewrites) so it needs no host here; Sentry is
  server-only (no browser SDK), so it needs none either."*
- `posthog-client.ts:71` `api_host: "/ingest"`, `:74` `ui_host: "https://eu.posthog.com"` — both
  as quoted. The three rewrites are at `next.config.ts:288-298` (the commented block opens at
  :275; the finding's "287-298" is a line off, not a substantive error).
- The pin is safe: `security-regressions.test.mjs:139-150` collects wildcard hosts and filters
  offenders with `!/r2\.cloudflarestorage\.com|posthog\.com|razorpay\.com/`, then asserts the
  offender list is empty. Deleting an allowed entry cannot redden it.
- One point in the finding's favour it did not make: `script-src` (`:73-79`) never listed
  `posthog.com` at all, so the PostHog toolbar/`ui_host` path is already blocked today. Removing
  the img/connect entries changes nothing that currently works.
- Residual: whether some posthog-js optional bundle contacts a `posthog.com` host directly at
  runtime needs a browser console. That is the finding's own caveat and it is honestly stated.

## lib-tests-04 — 49 hand-rolled function-slicers in 25 files → **confirmed**

The count reproduces to the site. `rg -c 'indexOf\("\\nexport|indexOf\("export async function"|
indexOf\("\\n\}|indexOf\("\\n  \}' -g '*.test.mjs' src scripts` → **49 sites across 25 files**,
and the per-file tally is the finding's list character for character: catchup-lifecycle 8;
unattended-rule, threads-rule, purge-rule, proxy-rule, index-coverage, demo 3 each;
profile-editor-rule, mail-queue-rule, feed-write-rule, auth-flow-rule, admin-rule 2 each; and 1
each in verify-outcome-rule, security-regressions, river-cursor, rich-truncate,
post-visibility-rule, notification-reach, group-succession, draft-rule, directory-rule,
composer-rule, catchups-core, append-page, admin-guard-rule.

`balancedBody` call sites are exactly the four claimed: `catchup-lifecycle:93`,
`composer-rule:43`, `gate-coverage:82`, `river-cursor:314`.

The two stale justifications are verbatim: `auth-flow-rule.test.mjs:18-27` ("Deliberately NOT
brace-matched … lands on the parameter object") and `directory-rule.test.mjs:81-84` ("Sliced to
the next top-level `export` … The same trap cost a round in auth-flow-rule.test.mjs"), against
`test-fn-body.mjs:20-23` which says `balancedBody` "step[s] over a `: Promise<{ ... }>` return
annotation". The comments do describe a limitation the kit removed.

Nits only: the header quote is at `test-fn-body.mjs:20-23`, not `:22-25`; and
"`slice(start, -1)` returns the WHOLE TAIL" is loose (it returns the tail minus one character) —
the hazard it describes is real, the arithmetic in the parenthesis is not.

## lib-tests-06 — twelve files hand-roll `read`/`ROOT` → **confirmed-with-correction**

Every individual line citation I checked is right, including the ones a naive single-line grep
misses because the call wraps (`heart:64`, `collection-taxonomy:92,144`, `upload-shared:251-256`).
`test-kit.mjs:39` is `export const read = (p) => readFileSync(resolve(ROOT, p), "utf8")`, so the
proposed rewrite is exact. Three corrections:

1. **Four convertible sites are missing, and the reason given for omitting them is false.** The
   finding lists 10 of the 14 `readFileSync(resolve(ROOT, …))` sites and excuses the rest with
   "(the other five users of that spelling read paths a `walk` returned, which is the natural
   call)". There are **four**, not five, and all four read **literal string paths**, exactly the
   case `read()` exists for: `valley-day.test.mjs:65` ("src/lib/validators.ts"),
   `email-normalization-rule.test.mjs:74` ("src/lib/validators.ts"),
   `place-input.test.mjs:216` ("src/lib/place-write.ts"),
   `notification-links.test.mjs:39` ("src/app/(main)/feed/actions.ts"). Three of the four already
   import `ROOT` from the kit; `email-normalization-rule` already imports `read` and does not use
   it here. Conversely the sites the finding *did* list include the ones that genuinely read
   loop variables (`keyset:96` uses `f` from a git-grep list; `post-visibility-rule:344,396` use
   `f`/`file`) — the characterisation is inverted.
2. **The file count is wrong twice over.** Its own list already names 16 files; adding the four
   above makes **20**. "Twelve" is the audit-1 leftover number, not this one.
3. **Four files were born after the kit, not three.** `test-kit.mjs` was added
   `2026-08-26 68d4ad6` ("test: one preamble for the shape tests, not thirty-nine copies").
   Post-kit: `collection-taxonomy` 2026-08-28, `river-cursor` 2026-08-28, `river-query`
   2026-09-02 — **and `mark-centring` 2026-08-27**, which the finding itself dates as post-kit in
   its "Where" list but then leaves out of "three post-kit files". The trend it is arguing for is
   slightly stronger than it claims.

Verified as stated: `river-query.test.mjs` lives at `src/components/collection/` (not `src/lib/`),
was added `2026-09-02 bc2a789`, builds its own root at `:32-34`, and imports no kit — so the
suggested `../../lib/test-kit.mjs` path is correct. `catchups-core.test.mjs:728` declares
`CATCHUP_ROOT` and uses it at `:735`, `:739`, `:853` while importing `read` from the kit at `:58`.
`identity-row-overflow-rule.test.mjs:48` is `decomment(read(relative(ROOT, file)))`.
`scripts/qa/hand-run-passes.test.mjs` really is cwd-relative — `SPEC` (`:25`), `DEV` (`:26`),
`readdirSync(DEV)` (`:30`), `readFileSync(\`${DEV}/…\`)` (`:40`, `:82`),
`readFileSync("CLAUDE.md")` (`:98`), `readFileSync(skill)` (`:102`) — and would ENOENT from any
cwd but the repo root.

## media-viewer-02 — the viewer is emitted nine times → **confirmed**

The strongest-evidenced finding in the cluster; every number reproduces off the read-only build.

`grep -l 'data-viewer-chrome' .scratch/audit2-build/.next/static/chunks/*.js` → **9 files**, the
exact nine named. Each contains one `hasPointerCapture` and one "Copy a link to this photo".
Measured raw / `gzip -c` bytes, all nine matching the report to the byte:

| chunk | raw | gz | who loads it (from the build's manifests) |
|---|---|---|---|
| 0czqfvpi1d0d3 | 23,876 | 8,904 | `server/app/lab/crop/page/react-loadable-manifest.json` |
| 0nxsg2mdm6uxj | 27,415 | 9,354 | `/lab/collection` + `/lab/collection/swap` first-load, **and** `(main)/collection/(index)` + `[id]` react-loadable |
| 0oy1wl0rg584e | 22,320 | 7,822 | catchups `[catchupId]/(home)` + `round/[editionId]` |
| 172f7wyg930dy | 16,178 | 5,741 | `(main)/feed`, parent chunk `0dg3o7twddv0h.js` |
| 1g-kxdkg5db2g | 16,430 | 5,838 | `letters/[id]/(read)` |
| 1mknvk_koqi1h | 15,931 | 5,643 | `profile/[id]` (+ `lab/profiles`) |
| 2soaqx7e1xiuq | 16,141 | 5,722 | **second feed copy**, same parent `0dg3o7twddv0h.js` |
| 3ay-dhmyr-d1r | 15,894 | 5,624 | **second profile copy**, same two parents `3igqlp69pwrk4` + `12vdeu4rx3cjy` |
| 3apbwbzl8qo8i | 18,191 | 6,392 | `/lab/viewer` first-load |

Totals: **172,376 bytes raw** ("172 KB") and **61,040 bytes gz** ("61 KB") — both exact. The two
feed chunks do begin byte-identically (`…push([…,440160, e=>{ … "download" …`), so the
"byte-identical module bodies" claim holds; the module id it names (927657) is not the first
module in the header — 440160 is the Download icon — but 927657 does appear once in each.

**The first-load claim is right and I checked it independently.** Scanning every route's
`firstLoadChunkPaths` in `raw/route-bundle-stats.json` (100 routes) for the nine names: only
`0nxsg2mdm6uxj` (`/lab/collection`, `/lab/collection/swap`) and `3apbwbzl8qo8i` (`/lab/viewer`)
appear. So the viewer costs **0 KB first-load on every shipping route**, and it is 3 lab routes
across **2** chunks, not "three lab rooms … list one" each. `lab/crop` and `lab/profiles` reach
it dynamically, not statically.

One number to correct: "a member who opens a photograph on /feed, /letters, a Catch-up, /profile
and /collection downloads the viewer five times (~29 KB gz)". Those five chunks are
5,741 + 5,838 + 7,822 + 5,643 + 9,354 = **34,398 bytes gz ≈ 34 KB**, not 29 KB. The per-session
argument is therefore slightly *stronger* than claimed.

## scripts-e2e-ci-12 — the five imported `.claude/agents` → **confirmed-with-correction**

- Line counts exact: `code-reviewer.md` 47, `comment-analyzer.md` 70, `pr-test-analyzer.md` 69,
  `silent-failure-hunter.md` 130, `type-design-analyzer.md` 110 = **426 lines**. All eight agent
  files are tracked (`git ls-files .claude/agents`).
- "Daisy" appears in exactly the three named (`pr-test-analyzer`, `silent-failure-hunter`,
  `type-design-analyzer`). `code-reviewer.md:4` is `model: opus`; the other four imports are
  `model: inherit`; the three repo-written agents are all `model: sonnet`.
- The description-byte measurement holds. Parsing the `description:` value out of each front
  matter I get 1984 / 1952 / 1508 / 1428 / 1394 = **8,266** for the five, and 261 / 246 / 314 =
  **821** for the three. The report's 8,336 and 863 are each exactly 14 bytes per file higher
  (it counted the `description: ` key and its newline). Same order of magnitude, same argument:
  ~2.1k tokens against ~0.2k.
- **The one refuted sub-claim: "`grep -rn` for the other five outside `.claude/` and the audit
  folders: zero hits" is wrong.** `progress.md:5540` names one: *"In .claude/agents/:
  Anthropic's five pr-review-toolkit agents, **silent-failure-hunter the prize among them**."*
  That is the session log of the import, not an instruction to use one, so it does not overturn
  the finding — but the finding's stated falsifier was "a `progress.md` entry … I searched and
  found none", and there is an entry. The owner should see that line before deciding, and the
  fix session must not delete the five while claiming nothing references them.
- `knip.jsonc:33` does ignore `.claude/**`, as claimed.

## shell-primitives-12 — audit-1 hygiene rows plus four new → **confirmed-with-correction**

Seven sub-items, all grep-verified at HEAD; one Note is wrong.

1. `src/app/layout.tsx:75-82` — the "HARD GUARD: until a `.dark` block exists in globals.css this
   is visually inert" comment is there verbatim, and `.dark` **does** exist: I brace-matched it,
   `globals.css:270-352`, 83 lines (the finding says "60 lines of it"; the block is 83 lines,
   ~60 of them token declarations). Comment is false as written. ✔
2. `sidebar.tsx:394-400` — `countFor` is exactly the seven-line `if (!counts) return undefined;
   return counts[key];`, called once at `:385`. ✔
3. `peaks-mark.tsx:33-34` — `PEAK_SPAN` and `PEAK_CENTRE` exported, used only at `:34`/`:35`;
   the only outside mention is `mark-centring.test.mjs:79`, which regexes the source text and
   does not import, so un-exporting keeps the pin green. `PEAK_PLANES:84` is imported by
   `lab/icon-directions`, `lab/glass-edges`, `lab/icon-colours` — three rooms, as claimed. ✔
4. `motion-features.tsx:23` names `no-motion-namespace.test.mjs`; no such file exists anywhere in
   the repo, the real one is `src/components/common/motion-namespace-rule.test.mjs`. ✔
5. `search-pill.tsx:195` — `<m.form>` carries only `onSubmit` and `className`; the animating
   `m.div` is at `:206` and the `m.span` at `:344`. ✔
6. `posthog-identify.tsx:44-48` — the effect's `return () => { /* comment only */ };` is exactly
   that. ✔
7. `sidebar.tsx:643-645` and `:729-731` — `user.accountType === "teacher" || user.accountType
   === "ex_teacher"` written twice, and `inAdmin` is at `:595` where the hoist would go. ✔
- `isWideRoute` (`content-column.tsx:55`) is indeed un-exported already. ✔
- **The Note is wrong.** It tells a fix session `THEME_COLORS` "must **stay exported**:
  `src/lib/proxy-rule.test.mjs:141-145` matches on `THEME_COLORS[` and on the exact declaration
  shape. Audit 1 was wrong about that one; do not 'fix' it." Both assertions read the layout as
  **text** — `:141` `assert.match(body, /THEME_COLORS\[/)` and `:144`
  `layout.match(/THEME_COLORS = \{ light: "([^"]+)", dark: "([^"]+)" \}/)`. Neither contains the
  word `export`, so dropping the keyword leaves both green, and `THEME_COLORS` has exactly one
  consumer, `layout.tsx:65`. Audit 1 was right; this Note would talk the next session out of a
  safe change on evidence that does not say what it is quoted as saying.

## feed-posts-17 — hygiene sweep across the territory → **confirmed-with-correction**

Thirteen sub-items. Eleven land on the exact cited line; two carry path/attribution errors; a
handful are one or two lines off. None is refuted.

1. `feed/page.tsx:35` `const s = await auth();` inside `if (q)` — ✔ (session already held).
2. `feed/actions.ts:1284-1293` — two stacked docblocks, and the last sentence of the first is
   "Group posts only surface while the member still belongs to that group". ✔ Note the second
   docblock belongs to `SAVED_POSTS_LIMIT` at `:1295`, so the merge must keep both subjects.
3. `feed/actions.ts:739` "The four sibling toggles below use the same shape." ✔ — and the
   correction is right: only `toggleBookmark` (`:792`) and `toggleCommentLike` (`:1341`) are
   below it in this file.
4. `feed/actions.ts:464-465` "which is why this was a `let`". ✔
5. Import-block scars: `api/upload/route.ts:7-14` (blank line inside the braces, then
   `stillPictureNotice,}`) ✔ and `collection/actions.ts:37-38` (`isImageFile,}`) ✔. The third
   site's **path is wrong**: there is no `src/app/(main)/settings/actions.ts`; it is
   `src/components/settings/actions.ts`, where `:15` is
   `import {sniffImageType, describeProcessingError, isImageFile} from "@/lib/upload-shared";` —
   the cited line number is right, the folder is not.
6. `post-card.tsx:553` `(photo, i, cell)` with `photo` unused — ✔, and `raw/tsc-unused.txt` line
   4 is `src/components/posts/post-card.tsx(553,23): error TS6133`.
7. `post-card.tsx:236-245` — the `viewerImages` memo re-parses `post.images` that `:225` already
   parsed into `images`. ✔
8. `use-letter-persistence.ts` — `stashLocalDraft` is `:50-52` and `dropLocalDraft` `:54-56`
   (finding says 51-56); the `useCallback` pair is `:159-163` (finding says 160-164). Substance ✔.
9. `rich-text-editing.ts:89` `FORMAT_SHORTCUTS` exported, no consumer outside the file; matches
   `raw/knip-repo-config.txt` ("FORMAT_SHORTCUTS  src/lib/rich-text-editing.ts:89:14"). ✔
10. `notification-bell.tsx` — the docblock naming `groups/actions.ts` is at `:55-62`, not
    `:56-58`; `src/app/(main)/groups` no longer exists. ✔
11. `notifications/actions.ts:47-48` "no scheduled job does either" — now false: `retention.ts:41,
    54, 188-190` deletes notifications older than 30 days. ✔ (This is the change HEAD's own
    commit `74cc61a` made, i.e. it went stale *during* the audit.)
12. `post-feed.tsx:111` (not `:112`) "Re-arms the skeleton whenever the filters, group or reload
    trigger change" — no group any more. ✔
13. `directory-module.tsx:27-40` (not `:25-39`) — the hand-typed select and the comment "matching
    the post-card author select". ✔ **but the reason is understated**: the shipped
    `AUTHOR_CARD_SELECT` (`people-select.ts:51-58`) carries `verifyState` and `batchType`, which
    directory-module does **not** select, so the comment's promise is already false today. The
    finding's proposed replacement — `{ ...IDENTITY_SELECT, accountType: true, batchYear: true,
    currentCity: true }` — matches the seven fields exactly and is the right fix; the fix session
    must not "simplify" it to `AUTHOR_CARD_SELECT`, which would silently add two columns.

## fresh-code-09 — constants and literals written more than once → **confirmed-with-correction**

Every citation lands, on the line given, except one word in the framing.

- `type BandCount = { key: string; count: number }` at `collection/actions.ts:761`,
  `year-rail.tsx:65`, `photo-scrubber.tsx:74`, with `collection-client.tsx:61` importing the
  year-rail one. ✔ Three identical declarations.
- `RIVER_ORDERS` at `river-controls.tsx:63-68`; `ORDERS` at
  `src/app/(main)/collection/collection-data.ts:26`; the `RiverOrder` union at
  `river-cursor.ts:11`. ✔
- `ease: [0.22, 1, 0.36, 1]` at `photo-scrubber.tsx:295,328,351,386,398` and `year-rail.tsx:112`
  — six sites, exactly. ✔ `motion.tsx` exports **five** named curves (`EASE_POP` :32,
  `EASE_SPRING` :33, `EASE_OUT_SMOOTH` :41, `EASE_IN_OUT_SCENE` :51, `EASE_SEGMENT_GLIDE` :78),
  not the two the finding names — but the load-bearing point stands: none of them is
  `[0.22, 1, 0.36, 1]`, so the curve genuinely has no name.
- **Correction to the saving line: "6 rule violations" overstates it.** No gate flags these.
  `scripts/qa/protocol-audit.mjs` has no bezier or easing rule (`rg 'bezier|ease'` finds one
  prose comment), no `*.test.mjs` pins `cubic-bezier`, and `npm run check` is green at HEAD.
  CLAUDE.md's rule is written as "no hand-typed `cubic-bezier(...)`" — a CSS function, not a
  motion array. These are six unnamed curves, which is a real and worth-fixing drift risk; they
  are not six failing rules.
- `"rgba(24, 25, 20, 0.94)"` at `image-viewer.tsx:132` (`BACKDROP`, and identical at HEAD — the
  peer's WIP on that file landed in `72b5a1d`) and `review-room.tsx:76` (`STAGE`). ✔
- The year message at `contribute-room.tsx:610` vs `review-room.tsx:199` — genuinely different
  wording for the same rule ("Use four digits for a year, or three for a decade." vs "Four
  digits for a year, three for a decade."). ✔
- "An admin looks at new photographs before they appear." at `contribute-room.tsx:840` and
  `:1006`. ✔
- `SWIPE_PX = 70` / `SWIPE_VELOCITY = 420` at `contribute-stage.tsx:167-168` (finding says
  168-169, one off) with the comment "the viewer's thresholds, so the same flick does the same
  thing in both places", copied from `src/components/common/pinch-zoom.ts:84-85`
  (`SWIPE_DISTANCE = 70`, `SWIPE_VELOCITY = 420`). ✔ Both are module-private today, so the fix
  is an export plus two imports.

---

## Cross-finding notes for the compiler

- **duplication-21 and lab-12 are the same register and disagree.** lab-12's numbers are the
  correct ones (29 pairs / 435 lines / the full per-file table); duplication-21's 27 / 418 and
  its "11 clones, 192 lines" for chain-lines are arithmetic slips, and it omits the two
  `lab/composer/_variants.tsx` pairs. Keep lab-12, fold duplication-21's two optional
  one-liners (the `_kit` SPRINGS re-export, `mascot-moments` importing `useMomentAutoplay`) into
  it as the owner question, and drop duplication-21's counts.
- **Two findings in this cluster hand a fix session an instruction that would break something**:
  lab-05's "delete `Sheared`" (three in-file uses) and shell-primitives-12's "THEME_COLORS must
  stay exported" (the pin does not require it). Both should be corrected in the plan text, not
  left for the fix session to discover.
- **lib-core-config-06's gate is the one item here a fix session can get wrong silently.**
  Without `SENTRY_DEV=1` the curl returns nothing at HEAD *and* after the change, which the
  finding's own wording turns into "this finding is void".

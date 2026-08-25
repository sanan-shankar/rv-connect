# v-pinned-safety — verification notes

Verifier: adversarial pass over the pinned-file safety claims. All evidence read at HEAD =
`c74d99f` (the prompt said "past c74d99f"; `git log` shows c74d99f IS HEAD). Working tree at
check time: clean except the untracked audit directories. Read-only throughout; no builds, no
tests run, no DB.

Cluster: feed-posts-02, catchups-02, catchups-03, duplication-02, duplication-09,
dead-code-09-slice-trap, lib-tests-02, lib-tests-03, member-surfaces-08, data-layer-08, plus
the data-layer-01 sub-claim my charter item 8 maps to.

---

## 1. feed-posts-02 — composer-rule.test.mjs really pins create-post-form.tsx

**CONFIRMED WITH CORRECTION.**

- `src/lib/composer-rule.test.mjs:29` reads the composer by path:
  `const composer = decomment(read("src/components/posts/create-post-form.tsx"));` — it reads
  EIGHT files by path (card, composer, editDialog, rail, desk, contacts, letterhead,
  feedActions), not "six" as the finding says (trivial).
- Fragments checked one by one against the finding's list:
  - `onAutosaveState?.("failed")` — YES, line 77 (`/onAutosaveState\?\.\("failed"\)/`).
  - `localStorage` — YES, line 90.
  - `clearLocalDraft` — YES, line 95.
  - `pagehide` — YES, line 251 (`/addEventListener\("pagehide"/`).
  - `revokeObjectURL` — **NO. composer-rule.test.mjs never asserts it.** That pin lives in
    `src/lib/rich-truncate.test.mjs` (C-183, lines ~112-119): it requires
    `function revokeBlobPreviews(` to exist in create-post-form.tsx and counts
    `revokeBlobPreviews(previewsRef.current)` to be EXACTLY 2, plus `u.startsWith("blob:")`.
- Beyond the fragment list, composer-rule also slice-anchors on:
  `autosaveTimer.current = setTimeout` / `}, 2500)` (C-175),
  `async function handleSubmit` + `clearTimeout(autosaveTimer.current)` +
  `await autosaveRunRef.current` (C-175), `const autosaveTimer = useRef` +
  `async function runAutosave` + the effect's dependency list (C-176),
  `visibilityState === "hidden"` + `const flush = ()` + `stashLocalDraft(` (C-177),
  `const restoredRef = useRef` + `}, []);` (C-177),
  `disabled={!content.trim()...}` x2 with `uploading` (B-044),
  `initialCityScope` and `formData.set("cityScope", audienceCity ?? "")` (B-048).
  Every one of these anchors sits inside the code the finding moves to
  `use-letter-persistence.ts` / `use-composer-uploads.ts`, so the "MANDATORY same-commit
  update" is right — but the update list is INCOMPLETE. Four pinned files read
  create-post-form.tsx by path (grep at HEAD):
  1. `src/lib/composer-rule.test.mjs:29` (the finding names this one).
  2. `src/lib/rich-truncate.test.mjs:113,122` — C-183 (blob-URL release, exact count of 2)
     and C-014 (crash-net key template ``rv:letter-draft:${userId ?? "anon"}:${postId ?? "new"}``
     plus `localDraftKey(currentUser?.id` call-site counting). C-183 pins the UPLOAD hook's
     code; C-014 pins the PERSISTENCE hook's code. Both must be repointed.
  3. `src/lib/upload-shared.test.mjs:188` — C-073 requires `toast.info(notice)` exactly 2x in
     the composer (upload pipeline code — moves).
  4. `src/lib/upload-size-rule.test.mjs:37` — composer is in the SENDERS list; the test
     requires `/shrinkForUpload|downscaleImage/` in that file (upload pipeline code — moves,
     so the SENDERS entry must be repointed to the hook file).

## 2. catchups-02 — catchup-lifecycle.test.mjs greps refuseIfFrozen( per body

**CONFIRMED.**

- `src/lib/catchup-lifecycle.test.mjs:54-90` ("B-061: every hand-driven write into a live
  Round refuses a frozen Catch-up"): for each of `openAnswering, closeAndPrepare,
  extendDeadline, publishNow, nudgeGroup, submitPrompt, submitEntry` it slices from
  `src.indexOf("export async function ${name}")` to the next `export async function` and
  runs `assert.match(body, /refuseIfFrozen\(/)`. So yes — a helper that absorbs
  `refuseIfFrozen` into `loadKeeperEdition` removes the literal from those bodies and the
  test FAILS; catchups-02's "MUST be updated in the same commit" is exactly right.
- The canonical preamble the finding quotes (actions.ts:1078-1092, openAnswering) matches
  VERBATIM at HEAD — I diffed it by eye against `sed -n '1078,1095p'`. `refuseIfFrozen(`
  appears 8 times in actions.ts.
- Extra safety fact the fixer should know: the SAME test file's C-026 sweep (lines 253-280)
  finds every `await notifyX(prisma,` call and requires `await rateLimit(` to appear
  LITERALLY in the surrounding exported action body, BEFORE the notify call. catchups-02's
  helper as scoped (auth/membership/Keeper/frozen only — no rateLimit) leaves that green.
  Any broader wrapper that absorbs rate-limit (see duplication-02) trips it.

## 3. duplication-02 — gate-coverage GATE regex and the edit shape

**CONFIRMED WITH CORRECTION.**

- The regex, quoted from `src/lib/gate-coverage.test.mjs:31`:
  ```js
  const GATE = /await\s+auth\s*\(|requireVerifiedMember|requireVerifiedEmail|requireAdminActor|requireAdminAction|requireAdmin\s*\(/;
  ```
- Adding `|withMember|withAdmin|withAuth` to that alternation is the right edit shape,
  with two conditions verified in the same file:
  1. The wrapper must be CALLED INSIDE the body of an `export async function`. The test
     "no action file exports a shape this sweep cannot see" (~lines 143-168) hard-fails any
     other export form — `export const doThing = withMember(async ...)` (HOF style) fails
     loudly, it does not slip through. So the finding's plain-call helper style is the only
     compatible one; that matches its intent.
  2. There is a pass-2 delegation rule (a body calling a GATED SIBLING in the same file
     inherits its gate) — a helper imported from lib is NOT a sibling, so GATE itself must
     learn the wrapper names; the finding is right that the regex edit is needed.
- CORRECTION (gap in the finding's gate list): it names gate-coverage, feed-write-rule,
  composer-rule, admin-guard-rule, security-regressions — but NOT
  `catchup-lifecycle.test.mjs`, which pins actions.ts preamble internals twice: B-061
  (refuseIfFrozen per body, see item 2) and C-026 (`await rateLimit(` literally inside each
  fanout action, before the notify call). A wrapper that absorbs the rate-limit line for
  `catchups/actions.ts` breaks C-026; one that absorbs the frozen gate breaks B-061. Both
  must be on the same-commit update list.

## 4. duplication-09 — do upload-size-rule / image-purge-rule read the routes as text?

**CONFIRMED WITH CORRECTION** (the dedupe is real; the caveat names the wrong test files).

- The finding's gate says "upload-ownership-rule, upload-size-rule, origin-rule test files
  read these sources". At HEAD that is WRONG on all three names:
  - `upload-size-rule.test.mjs` reads the five client SENDERS + next.config.ts — never the
    API routes.
  - `origin-rule.test.mjs` is purely behavioural (imports `originAllowed`, asserts on
    values). No file reads.
  - `upload-ownership-rule.test.mjs` — zero `readFileSync`/`read(` calls. Behavioural.
- The tests that actually read the upload routes as text (grep "api/upload" over
  src/lib/*.mjs): `image-purge-rule.test.mjs` and `upload-shared.test.mjs`.
  - image-purge-rule:111-112 reads `api/upload/route.ts` + `api/upload/finalize/route.ts`;
    the C-064 pins anchor at `const abort = async` and sweep everything AFTER the abort
    block for bare `return NextResponse.json({error` (must be none) and >=3 `return abort(`.
    The guard preamble sits BEFORE the abort (`const abort` at route.ts:91 / finalize:103;
    the preambles end ~line 48 / ~71), so extracting the preamble into a helper does not
    touch these pins.
  - upload-shared.test.mjs:135 reads `presign/route.ts` (C-066 signed content-type) and
    :172-190 reads upload + finalize routes (C-073 `countImageFrames(` /
    `stillPictureNotice(` per route). Also below the preamble. Safe.
- Preamble clone itself verified: originAllowed → auth() → requireVerifiedMember() →
  rateLimit("uploads") in all three routes (upload:23-48, presign:~30-50, finalize:45-66).
- The cron pair: `unattended-rule.test.mjs:151-158` requires
  `export const maxDuration = \d+;` in BOTH `api/retention/sweep/route.ts` and
  `api/catchups/tick/route.ts` — a guard helper is fine, but each route file must keep its
  own `export const maxDuration`. No test pins CRON_SECRET text.
- The lookup pair: `people-search-rule.test.mjs` (:40,:93) and `directory-rule.test.mjs`
  (:155) read `users/search/route.ts` but pin query/`logSearch` internals, not the guard
  preamble. Safe.
- Note for the fixer: NO test currently enforces that the routes call `originAllowed` at all
  (only origin-rule's behavioural tests of the function). The M33 protection has no per-route
  tripwire, so the helper must be reviewed by hand for keeping it.

## 5. dead-code-09-slice-trap — normalize.test.mjs:71 uses socialIcon's decl as a boundary

**CONFIRMED WITH CORRECTION** (the trap is real and there is a second one on the next line).

- Quoted, `src/lib/normalize.test.mjs:71-72`:
  ```js
  const href = social.slice(social.indexOf("export function socialHref"), social.indexOf("export function socialIcon"));
  const display = social.slice(social.indexOf("export function socialDisplay"), social.indexOf("export function socialHost"));
  ```
- Failure mode, precisely: deleting `socialIcon` makes `indexOf` return -1;
  `String.prototype.slice(start, -1)` then runs to the last-char-minus-one, so the `href`
  slice silently widens to nearly the whole file tail and the
  `assert.match(href, /instagramHandle\s*\(/)` keeps PASSING against the wrong scope — a
  silent C-188-style vacuity, not a red test. Exactly the trap the finding describes.
- CORRECTION: line 72 has the SAME trap with `socialHost` — and `socialHost` is also on
  dead-code-09's delete list (social.ts:54-62). Both boundaries must be repointed in the
  delete commit, not just :71. social.ts declaration order verified: socialHref(14),
  socialIcon(26), socialDisplay(44), socialHost(54), parseUserLinks(70).
- Side-check: zero non-comment consumers of `socialIcon`/`socialHost` anywhere in src
  outside social.ts itself (grep at HEAD returned nothing).

## 6. member-surfaces-08 — /donate proxy redirect vs proxy-rule.test.mjs

**CONFIRMED.**

- `src/app/(main)/donate/page.tsx` is exactly the 7-line `redirect("/support")` stub with
  the "old links never break" comment. Verified at HEAD.
- `proxy-rule.test.mjs` pins `publicPaths` via the shape regex
  `/const publicPaths = \[([\s\S]*?)\n {2}\];/` (line 26; the array must exist and close
  with a two-space-indented `];`) and DERIVES from it: cron reachability (vercel.json),
  sitemap agreement, and `/catchups/join` membership. It also pins the
  `if (!sessionCookie) {` branch (C-202 API-JSON-vs-redirect), the matcher (C-203), the
  `next=`/`x-search`/`x-pathname` forwarding (C-117/C-200), and layout/theme things.
- A `/donate` redirect block written beside the `/groups` one — verified at
  `src/proxy.ts:192`: `if (pathname === "/groups" || pathname.startsWith("/groups/")) {`
  (the finding said 192-194; the `if` opens at 192 — correct) — touches none of those
  pinned shapes: it neither edits the publicPaths array nor the no-session branch. None of
  the 8 proxy-rule tests would trip. `security-regressions.test.mjs`'s only proxy pin is the
  /ingest cookie-strip branch (:193-204) — unaffected. `demo.test.mjs` reads
  DEMO_CLOSED_PATHS — unaffected.
- The "answers before auth" claim holds: the /groups-style redirect blocks sit ABOVE the
  publicPaths/session logic in `proxy()`, so a signed-out /donate hits /support directly
  (and then /support's own auth applies). /donate is in neither the sitemap scrape nor
  vercel.json crons, so the derived tests cannot start failing.

## 7. data-layer-08 — Prisma 7 `omit` on findUnique in the installed client

**CONFIRMED.**

- Installed `@prisma/client` is 7.5.0; generator output is `src/generated/prisma` (schema
  line 3).
- `src/generated/prisma/models/User.ts:14891-14908`, `UserFindUniqueArgs`:
  ```ts
  select?: Prisma.UserSelect<ExtArgs> | null
  omit?: Prisma.UserOmit<ExtArgs> | null
  include?: Prisma.UserInclude<ExtArgs> | null
  where: Prisma.UserWhereUniqueInput
  ```
  `omit` coexists with `include` in the args type (it is `select` that excludes the others
  via SelectSubset), so adding `omit: { password: true }` to the profile page's
  include-carrying findUnique typechecks. 14 `omit?:` occurrences across the User model's
  arg types; `findUnique` signature at :14401 confirms the args flow through.
- The call site is as claimed: `src/app/(main)/profile/[id]/page.tsx:111-114`,
  `prisma.user.findUnique({ where: { id }, include: { places: { orderBy: { position: "asc" } } } })`
  — `include` without `select`. (I did not recount the "44 columns" figure; not load-bearing.)

## 8. data-layer-01 sub-claim — security-regressions.test.mjs and the adapter precondition

**CONFIRMED.**

- `src/lib/security-regressions.test.mjs` is 280 lines (matches the finding's count).
- `grep -n "PrismaAdapter\|Session\|Account\|adapter"` over it: ZERO matches.
  Case-insensitive `session|account` hits are only prose in comments ("Vercel account
  fetch...", "the HttpOnly session token", "authjs.session-token") — the C-198 analytics
  cookie-strip pin, nothing about the Prisma adapter, the Session/Account models, or
  VerificationToken. Removing the adapter cannot make this file go red.

## 9. lib-tests-02 — gate-coverage fnBody duplicates balancedBody

**CONFIRMED WITH CORRECTION.**

- `test-fn-body.mjs:33-73` `balancedBody` — exact range verified. `gate-coverage.test.mjs`:
  comment "fnBody, the audit-status version verbatim" at :62-66, `function fnBody` at
  :67-94. Side-by-side: identical algorithm — balance the parameter parens, step over a
  `: ...<...>` return annotation counting angle brackets, then balance the body braces;
  same unbalanced-tail fallback (`text.slice(i)`).
- The one real difference: fnBody anchors with a REGEX,
  `export\s+async\s+function\s+${name}\b`. The finding's suggested replacement — passing
  the plain STRING `` `export async function ${name}` `` — loses the `\b` (a name that is a
  prefix of another, e.g. looking for `doX` when `doXAll` is declared first, would anchor on
  the wrong function) and the `\s+` flexibility. `balancedBody` accepts a RegExp as `decl`
  (typeof check at :34-35), so the exact-fidelity edit is
  `balancedBody(text, new RegExp(`export\\s+async\\s+function\\s+${name}\\b`))`.
- Import feasibility proven by precedent: `composer-rule.test.mjs:6` already imports
  balancedBody under the bare-node runner (test-fn-body.mjs is a plain .mjs, no aliases).
- Savings arithmetic (~28 lines) is about right: fnBody is 28 code lines + 5 comment lines,
  minus the one import line added.

## 10. lib-tests-03 — the 2026-08-03 spelling-pin tests

**CONFIRMED WITH CORRECTION** (content all verified; one birth-commit detail wrong).

- `verified-mark.test.mjs` second test (lines 14-21) pins exactly the four spellings listed:
  `inline-flex items-center`, `px-[var(--space-m)] py-[var(--space-xs)]`,
  `text-[0.6875rem] leading-[1.25]`, `className="translate-y-px"`. First test is the
  "Verified, not Verified member" copy pin — the finding's keep/delete split is coherent.
- `landing-auth-ui.test.mjs`: 23 lines; targets `../layout/sidebar.tsx` (so the file IS
  misnamed); pins `Tree as PhosphorTree` (:20) and `doesNotMatch /\bPiggyBank\b/` (:22);
  header really says "sat red for three weeks asserting a reverted decision" (:14-15).
- `tour-provider.test.mjs`: 23 lines; pins `[autoOffer, pathname, phase, userId]` (:15) and
  `<TourContext.Provider value={{ start }}>` (:22) among six literal wiring pins.
  `tour-auto-offer.test.mjs` is 71 lines of behavioural tests, as claimed.
- Floor check: `scripts/qa/check.mjs:69` `const MIN_TEST_FILES = 60;`; discovery walks
  src AND scripts (:157). Count at HEAD: 72 in src + 3 in scripts = 75. So "75→74 stays
  above the floor" is arithmetically sound.
- CORRECTION on provenance: `git log --diff-filter=A --follow` shows verified-mark.test.mjs
  was born in **abb9381** ("leaf verification from 'verified member' to 'verified'",
  2026-08-03), not 1d7294b; 1d7294b (same day) is the commit that ADDED the second,
  styling test (`git log -S "translate-y-px"` hits only 1d7294b). tour-provider.test.mjs
  was born in 1d7294b; landing-auth-ui in a2279ff (2026-07-18) as the finding itself notes.
  "All three were born in 1d7294b" is therefore wrong for verified-mark, but the substance
  (same-day fix-session probes, the styling pin comes from 1d7294b) stands.

## 11. catchups-03 — the lifecycle test's reads of lib/catchups.ts survive the split

**CONFIRMED WITH CORRECTION.**

- The finding says "re-point the two `read("src/lib/catchups.ts")` pins". There are
  **THREE**, not two: catchup-lifecycle.test.mjs:25 (B-061 advanceEdition /
  advanceDueCatchups internals), :187 (C-020 `restoreOwnCatchupCopy`), :342 (C-149 catch
  sweep). All three pin DRIVER-side code that the split keeps in catchups.ts:
  restoreOwnCatchupCopy is at catchups.ts:1140, inside the 953-1349 driver range; the
  advance functions are drivers. So the claim "they still hold since drivers stay" is
  right — no re-pointing is even needed for these three, only for `catchups.test.mjs`'s
  imports of the pure core.
- C-149 subtlety verified: its sweep regex `/\}\s*catch\s*\([^)]*\)\s*\{/` requires a
  PARENTHESISED catch. catchups.ts has parenless `} catch {` at :75 (the report shim),
  :886, :926 (resolveSpotify) — these never matched the sweep — and `catch (err)` at
  :1225, :1333, :1341, all in drivers. The sweep's floor is `catches.length >= 3`; after
  the split the count is exactly 3. Two consequences for the fixer: (a) moving resolveSpotify
  to the core does not disturb the sweep; (b) the floor is then met with zero slack — do not
  also convert a driver catch to parenless form, and if the `report()` shim is replaced with
  direct `reportSwallowed()` calls, note the sweep's `/report\(/` check does NOT match
  `reportSwallowed(` — the test would fail loudly and must be updated in the same commit.

---

## Summary of verdicts

| id | verdict |
|---|---|
| feed-posts-02 | confirmed-with-correction (revokeObjectURL is not a composer-rule pin; 3 more pinned readers of the composer missing from the update list) |
| catchups-02 | confirmed |
| catchups-03 | confirmed-with-correction (three reads, not two; C-149 floor met with zero slack) |
| duplication-02 | confirmed-with-correction (GATE edit shape right; catchup-lifecycle B-061/C-026 missing from the gate list) |
| duplication-09 | confirmed-with-correction (caveat names the wrong test files; the real readers' pins sit below the preamble and survive) |
| dead-code-09-slice-trap | confirmed-with-correction (line 72 has the same trap on socialHost) |
| lib-tests-02 | confirmed-with-correction (use the RegExp form to keep \b) |
| lib-tests-03 | confirmed-with-correction (verified-mark born abb9381, styling test added 1d7294b) |
| member-surfaces-08 | confirmed |
| data-layer-08 | confirmed (Prisma 7.5.0 generated client has omit on UserFindUniqueArgs, coexists with include) |
| data-layer-01 (security-regressions precondition) | confirmed (zero adapter/Session/Account references in 280 lines) |

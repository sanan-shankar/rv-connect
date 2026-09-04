# auth-edge - refactor audit 2 report

Territory reader for authentication, the request edge and the auth-shaped API routes:
`src/app/(auth)/**` (12 files), `src/app/api/auth/[...nextauth]/route.ts`,
`src/app/api/dev-login/route.ts`, `src/proxy.ts`, `src/components/auth/**` (14 files),
`src/types/next-auth.d.ts`, 32 named `src/lib/*` files, and the 15 tests that pin them. This is
the most security-sensitive slice: every proposal below names the `*-rule.test.mjs` /
`security-regressions.test.mjs` / `gate-coverage.test.mjs` pin it touches, and nothing here
weakens the demo's three-layer default-deny (`proxy.ts`, `lib/demo.ts`, `lib/call-action.ts`).
Audit 1's seven adoptions (flight-perch hook, PasswordField, photo panel, links schema,
MIN_PASSWORD, claimToken, requireVerifiedMember composing Stage 1) were each re-verified as
adopted everywhere, and nothing new hand-rolls them. Date: 2026-09-03. Files in territory: 64
(49 source + 15 tests); read fully: 64, plus two mascot files the login critical path runs
through.

## Coverage

- **Read fully**: all of `src/app/(auth)/**`; all 14 of `src/components/auth/**`;
  `src/app/api/auth/[...nextauth]/route.ts`; `src/app/api/dev-login/route.ts`; `src/proxy.ts`;
  `src/types/next-auth.d.ts`; every named lib file (`auth.ts`, `auth-tokens.ts`,
  `app-secret.ts`, `double-submit.ts`, `email-address.ts`, `email-gate-message.ts`,
  `email-verification.ts`, `verification-mail.ts`, `bot-check-message.ts`, `human-pass.ts`,
  `human-pass-rule.ts`, `login-attempt.ts`, `mask-email.ts`, `member-gate.ts`,
  `member-gate-message.ts`, `next-path.ts`, `origin-rule.ts`, `password-rule.ts`,
  `rate-limit.ts`, `rate-limit-message.ts`, `session-revocation.ts`,
  `sign-in-unavailable-message.ts`, `timing-safe.ts`, `turnstile.ts`,
  `turnstile-origin-rule.ts`, `validators.ts`, `call-action.ts`, `wordle.ts`, `roster.ts`,
  `roster-rule.ts`, `api-gate.ts`, `demo.ts`); all 15 pinning tests in full
  (`auth-flow-rule`, `human-pass-rule`, `login-attempt-rule`, `origin-rule`, `password-rule`,
  `proxy-rule`, `roster-rule`, `session-revocation`, `turnstile-origin-rule`,
  `verify-outcome-rule`, `call-action`, `demo`, `email-normalization-rule`,
  `security-regressions`, `gate-coverage`) plus `components/auth/auth-first-frame.test.mjs`.
  Outside the territory but on the login route's critical path, read in full to answer the
  907 KB question: `src/components/mascot/use-flight-arrival.ts` (350) and
  `src/components/mascot/hoopoe-warmup.tsx` (99); the head of `use-hoopoe.ts` for the
  two-handle question. Specs read first: `docs/SECURITY.md`, `docs/spec/demo.md`,
  `docs/TRAPS.md`, the audit-1 auth-edge report, the audit-1 fix-prompt rows for phases 1a, 3
  and 4.
- **Skimmed (why)**: none.
- **Not read (why)**: none in the territory.
- **Uncommitted edits seen**: none in the territory (`git status --short` over `(auth)`,
  `components/auth`, `src/lib`, `proxy.ts`, `api/`, `types/` was empty). The tree's one
  modified file (`src/components/common/image-viewer.tsx`) is someone else's and outside
  this slice.
- **Tooling note**: the raw `depcruise-metrics.txt` only lists modules with zero afferent
  couplings, so the single-importer census below was done by grep over `src`, `scripts` and
  `e2e` with the test files excluded; `route-bundle-stats.json` uses the key
  `firstLoadChunkPaths`, and chunk contents were attributed by grepping marker strings in
  `.scratch/audit2-build/.next/static/chunks/` (read-only).

## Summary

This territory is still the best-argued slice in the repo, and audit 1 left it tidy: every one
of its seven extractions is adopted at every site, its dead-export sweep landed, and no new
hand-rolled copy of any of them has appeared. The structural well is not dry, but it is not
where you would expect. The single biggest number in this report is a bundle fact, not a
line count: `float-field.tsx:5` statically imports `InfoTooltip`, which is built on the
shadcn/base-ui Popover, so every page that draws a FloatField ships the Popover + floating-ui
+ select stack -- three chunks, 100.6 KB raw, plus a 34 KB floating-ui chunk that leaves with
them -- while the ONE caller that actually passes a `hint` is the Collection contribute room.
/login, /signup, /forgot-password, /reset-password and the landing (through
`auth-first-frame.tsx`) all pay it for a tooltip they never render; /verify-email, which has
no FloatField, is the proof (762 KB against 921). That is auth-edge-01 and it is a ~100 KB
first-load cut on five routes for one `next/dynamic`.

The rest is dedupe with a security flavour: the Turnstile token dance is written three times
(one code-to-sentence map instead of three), the trivia pass and the human pass are two
HMAC-stamp implementations whose clock-skew rule is kept the same by a comment, and the three
email-flow clients each hold two handles to one bird. Then a short dead/placeholder list (a
no-op route-group layout, `hashToken`'s stale export, a type re-export nobody consumes, a prop
no caller passes) and a hygiene batch of eight comments that describe deleted or moved code.
Structural-vs-cheap: 7 structural findings, 6 cheap. What surprised me: the login route's
first load is 40 KB heavier than the landing's and only 8 KB heavier than
/forgot-password's -- the mascot rig is genuinely shared, so "the perching birds" cost the
sign-in page almost nothing extra, and the fat is in a form primitive nobody suspected.

## Charter questions, answered

- **How many of the ~32 lib files export exactly one symbol with exactly one importer?**
  Three of 32: `sign-in-unavailable-message.ts` (importer: `login-client.tsx`), `wordle.ts`
  (importer: `(main)/dark-mode/page.tsx`) and `origin-rule.ts` (importer: `api-gate.ts`).
  `turnstile-origin-rule.ts` has two exports and one importer (`turnstile.ts`). The last two
  are `*-rule.ts` files whose one-importer shape IS the protocol (a pure module node can run
  a test against; `origin-rule.test.mjs` and `turnstile-origin-rule.test.mjs` are their
  reason to exist). `wordle.ts` is a server-only fetch with a fallback that the dark-mode page
  alone needs. Only `sign-in-unavailable-message.ts` is a one-constant file kept alive by
  convention rather than a pin, and it is part of the auth-edge-04 carry-over below. Full
  census: 19 of the 32 files have 3+ importers; `auth.ts` has 51 and `call-action.ts` 50.
- **Is there one canonical email-normalisation path?** Yes. `normalizeEmail` / `emailField` in
  `email-address.ts`, enforced by the positive sweep in `email-normalization-rule.test.mjs`
  (every `where: { email: X }` in src traced to the canonical form; two database-sourced
  addresses allowlisted with reasons). Every lookup reaches it. Two WRITE-side spellings of
  the same form survive outside the sweep -- `login-attempt.ts:48` and the prefill guard in
  `forgot-password/page.tsx:9-11` -- and are auth-edge-10 (cheap).
- **Which gate helpers overlap, and could one absorb another without changing the export shape
  the C-189 sweep expects?** None should. `requireVerifiedEmail` (Stage 1) and
  `requireVerifiedMember` (Stage 2) compose since audit 1 (`member-gate.ts:47-58`);
  `api-gate.ts` composes both for route handlers and adds the origin check and the meter,
  which actions get from Next and the sweep respectively. The one apparent overlap -- both
  `vetUploadRequest` and `vetLookupRequest` call `auth()` before the gate the gate itself
  calls -- exists to answer 401 rather than 403 for a missing session, and `auth()` is
  `cache()`d so the read is free. Folding them into a `vetRequest(options)` would be the
  factory shape audit 1's fix session re-refuted (the C-189 tripwire refuses any
  `export const x = ...` in a use-server file, and `GATE` matches the two function names by
  name). Answer: three gates for three shapes, one composition chain, nothing to absorb.
- **Is the trivia/wordle gate live, dormant or a placeholder?** Live, both.
  `signup-client.tsx:177` renders `TriviaGate` as step one; `actions.ts:22` refuses
  `registerUser` without `hasPassedTrivia()`; `gate-coverage.test.mjs:42-46` lists the three
  trivia actions as public-by-design with reasons. `wordle.ts` is imported by the dark-mode
  page and its word gate is the owner's 2026-07-31 feature. Neither is an owner decision.
- **Is anything on the login route's first load (907 KB) not needed to sign in?** Measured
  against siblings: /login (928,393 B) is only 40.6 KB above the landing (921,074 B) and
  7.6 KB above /forgot-password; the 40.6 KB is the page's own code chunk (18.1 KB:
  `login-client`, `use-flight-arrival`, `turnstile-widget`, `next-auth/react`, `PasswordField`,
  `HoopoeWarmup`), a 16.5 KB motion + base-ui core chunk, and two small ones. Against /privacy
  (644,863 B, the smallest full page) /login carries +285.6 KB: ~100 KB of Popover/select
  base-ui (auth-edge-01, NOT needed), 34 KB floating-ui (leaves with it), ~85 KB of hoopoe
  rig + flight bus + motion core (the owner's signature; see Owner decisions), 25.8 KB
  `next/image` (the photo panel), 22.5 KB motion AnimatePresence (the error-line and
  row-glide choreography). So: the mascot is needed by design and costs ~85 KB; the popover
  stack is not needed and costs ~100-135 KB; `HoopoeWarmup` is redundant on this page but
  costs bytes only in its own tiny module (auth-edge-04's saving is paint work, not KB).
- **proxy.ts and next.config.ts spelling the same path list twice?** No. `next.config.ts`
  names only the three `/ingest` rewrite sources (lines 288-296); the proxy's `publicPaths`
  and `DEMO_CLOSED_*` lists have no twin there. The only list the proxy does duplicate is
  `DEMO_CLOSED_PATHS` from `demo.ts`, by design (edge bundle cannot import it) and held
  equal by `demo.test.mjs:220-235`.

## Findings

### auth-edge-01 - Stop FloatField shipping the base-ui Popover stack to every page that never opens it
- **Where**: `src/components/common/float-field.tsx:5` (static
  `import { InfoTooltip } from "@/components/common/info-tooltip"`) and `:242-267` (rendered
  only `{hint && (...)}`); `src/components/common/info-tooltip.tsx:5-11` (imports
  `Popover*` from `@/components/ui/popover`, which is `@base-ui/react/popover`). Consumers of
  FloatField that never pass `hint`: `src/app/(auth)/login/login-client.tsx:9`,
  `forgot-password/forgot-client.tsx:7`, `src/components/auth/password-field.tsx:5` (so
  /reset-password too), `signup-form.tsx:12-19`, `trivia-gate.tsx:9`, `year-input.tsx:4`,
  `auth-first-frame.tsx:7` (drawn on the landing). The one caller that passes `hint`:
  `src/components/collection/photo-questions.tsx:171`.
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/route-bundle-stats.json` diffed route against route, chunk sizes from
  the build. /forgot-password (920,819 B) minus /verify-email (762,499 B) is eight chunks;
  /verify-email has `Button` but no FloatField. Three of those chunks carry Popover markers
  and nothing an auth page uses: `0jlq6l4f8yx9k.js` 59.1 KB (floating-ui `computePosition`
  + Popover + `useRender`), `3lg6rokqb517_.js` 24.9 KB (Popover + select/listbox),
  `2154mzuydk5m6.js` 16.6 KB (Popover). A fourth, `0mmkcfgfeodk3.js` 34.2 KB, matches only
  floating-ui markers and is likewise present on /forgot and absent on /verify. The same
  three Popover chunks are in the /login-minus-/privacy set. Grep of every `hint=` in src:
  one FloatField caller (`photo-questions.tsx:171`); the other hits are `InsetField`/`Field`
  components in the lab and the admin room, not FloatField. The tooltip's own file says it is
  for "settings' batch-year note" -- the settings surface, which is not an auth page.
- **What to do**: in `float-field.tsx`, replace the static import with
  `const InfoTooltip = dynamic(() => import("@/components/common/info-tooltip").then(m => m.InfoTooltip), { ssr: false })`
  (the tooltip is interaction-only, so `ssr: false` costs no first paint; keep the
  `{hint && ...}` guard so the chunk is requested only where a hint exists). Alternative with
  the same payoff and no dynamic import: drop `hint` from FloatField and have
  `photo-questions.tsx` compose the tooltip through the existing `trailing` prop, which is
  how `signup-form.tsx:538,568` already attaches its own `InfoTip` to `YearInput`. Either
  way `info-tooltip.tsx` and `ui/popover.tsx` stay exactly as they are. Re-measure with the
  route table after: expect /login, /signup, /forgot-password, /reset-password and `/` each
  to drop by ~100 KB raw (135 KB if `0mmkcfgfeodk3` goes with them; it should, nothing else on
  those routes reaches floating-ui except base-ui's core chunk, which stays).
- **Saving**: ~100-135 KB raw first-load JS on five routes (the four auth pages and the
  landing); 0 lines.
- **Risk & gate**: low. `npm run check`; `npm run visual` (login, signup and the landing are
  baselined; nothing visible changes); open /collection's contribute pop-up and hover the
  caption field's (i) to confirm the tooltip still mounts; `raw/route-js.txt` regenerated by
  the bundle lens's next build for the number. No `*-rule.test.mjs` pins `float-field.tsx`'s
  imports (`auth-first-frame.test.mjs` pins copy and classes, not imports).
- **Confidence**: high on the mechanism (the chunk markers and the caller grep agree); medium
  on the exact byte count until the build is re-run, because Turbopack may re-split the
  floating-ui chunk between base-ui's core and the Popover.
- **Notes**: co-owned with the bundle-build and shell-primitives lenses (`float-field.tsx`
  and `info-tooltip.tsx` are theirs); filed here because the login critical path is this
  charter's floor question and the number is the largest in this report. It also changes the
  weight of the carried-over owner decision auth-edge-15 (the InfoTip canon): since audit 1,
  `info-tooltip.tsx` gained FloatField as a second consumer, so the Popover-based (i) is now
  the one on every form primitive while the hand-rolled one in `signup-form.tsx` (no base-ui)
  is the one on the signup page. Whichever canon the owner picks, this finding stands on its
  own: the tooltip should load when a hint exists, not when a field does.

### auth-edge-02 - The Turnstile token dance is written three times; give the widget one `proof()` that maps its own refusals
- **Where**: `src/app/(auth)/login/login-client.tsx:129-149`,
  `src/components/auth/signup-form.tsx:395-414`,
  `src/app/(auth)/forgot-password/forgot-client.tsx:74-91`; the handle they drive is
  `src/components/auth/turnstile-widget.tsx:94-113` (types) and `:218-256`
  (`getToken`/`reset`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: all three forms run the identical three-way branch on
  `await turnstileRef.current?.getToken()`: `"interaction"` -> `setError(TICK_HUMAN_BOX)`,
  `"blocked"` -> `setError(BOT_CHECK_BLOCKED)`, else attach the token -- 15, 17 and 17 lines,
  each under its own copy of the same two explanatory comments ("Cloudflare's checkbox is on
  screen, waiting for the human" / "The check's script never loaded here ... (audit M07)").
  jscpd does not list it because the surrounding `setLoading`/`hoopoe.react` lines differ,
  but the sentinel-to-sentence mapping is one contract spelled in three files, which is the
  exact shape `api-gate.ts`'s header calls "a sameness maintained by hand". The two
  sentences already live in one dependency-free file (`bot-check-message.ts`), so the widget
  module, already a client component, can import them.
- **What to do**: add to `TurnstileHandle` a second method,
  `proof(): Promise<{ token: string | null } | { refusal: string }>`, implemented in
  `turnstile-widget.tsx` as `getToken()` followed by the two-sentinel map (move the two
  comments there, once). Keep `getToken` for one release or delete it (no other caller).
  Each form becomes: `const p = await turnstileRef.current?.proof(); if (p && "refusal" in p) { setError(p.refusal); <page-specific reaction>; setLoading(false); return; } if (p?.token) formData.set("turnstileToken", p.token)`.
  The page-specific reactions stay put: signup's `hoopoe.react("error")`, forgot's
  `apiRef.current?.react("wrong")`, login's nothing. Note login attaches the token to the
  `signIn` call rather than FormData; that one line is unchanged.
- **Saving**: ~25 lines net across three files; 1 clone; the sentinel-to-sentence contract
  gets one spelling.
- **Risk & gate**: low. `npm run check`; `npm run visual` (login + signup baselined);
  `auth-flow-rule.test.mjs` C-034 pins that `forgot-client` calls
  `callAction(() => requestPasswordReset(` and has no bare await of it -- untouched; the
  sentences themselves must not change by a character (`scripts/qa/phase4-probe.mjs`
  asserts the UI shows them; owner-run, do not run in audit). Manual: `TURNSTILE_DEV_CHALLENGE=1`
  once, tick nothing, submit, read "Please tick the box first" on all three forms.
- **Confidence**: high.
- **Notes**: the widget's header (lines 5-48) is the argued history of this feature and moves
  nowhere. Related: auth-edge-04 carry-over below (the message files) -- `proof()` is a
  second natural consumer of a merged sentinel file, if that taste item is ever taken.

### auth-edge-03 - Two HMAC-stamped cookie tokens with two implementations; the trivia pass should reuse the human-pass rule
- **Where**: `src/components/auth/trivia-actions.ts:187-189` (`sign`), `:306-307` (mint
  `${ts}.${hmac("trivia:ts:browserId")}`), `:319-335` (`hasPassedTrivia`: split on ".",
  `Number()`, expiry + future-skew check, recompute, `timingSafeEqualStrings`) versus
  `src/lib/human-pass-rule.ts:13-19` (`signHumanPass`, `${ts}.${hmac("human-pass:ts:email")}`)
  and `:22-41` (`humanPassValid`: the same parse, the same `now - ts > TTL || ts > now + 60_000`
  rule, the same constant-time compare).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: the two token formats are identical in shape and differ only in the subject
  bound (`browserId` vs `email`), the label, and the TTL (30 min vs 5 min).
  `trivia-actions.ts:328-330` says so itself: "the same clock-skew paranoia
  human-pass-rule.ts applies". A rule kept the same by a comment is the drift `api-gate.ts`
  was written to end. The human pass is unit-tested as attacks
  (`human-pass-rule.test.mjs`, 9 cases: cross-subject replay, expiry, future stamp, wrong
  secret, tampered ts, garbage shapes); the trivia pass has none of that coverage, only the
  owner-run phase4 probe. `trivia-actions.ts` is a `"use server"` file, so its helpers must
  stay module-private (TRAPS: a non-async export there breaks every importing route at
  runtime), which is why the shared code has to live in the pure rule file, not be exported
  from the actions file.
- **What to do**: generalise `human-pass-rule.ts` by two pure functions,
  `signStamp(label, subject, ts, secret)` and `stampValid(value, label, subject, now, ttlMs, secret)`,
  and re-express `signHumanPass`/`humanPassValid` as one-line calls with
  `label = "human-pass"`, `ttlMs = HUMAN_PASS_TTL_MS` (their exported names and behaviour
  unchanged, so the nine existing tests keep passing untouched). In `trivia-actions.ts`,
  delete `sign()` and the body of `hasPassedTrivia` after the cookie reads, replacing them
  with `signStamp("trivia", browserId, ts, appSecret())` and
  `stampValid(token, "trivia", browserId, Date.now(), TOKEN_TTL_MS, appSecret())`; drop the
  now-unused `crypto`/`timingSafeEqualStrings` imports (keep `crypto.randomUUID` for the
  browser id). Add three trivia vectors to `human-pass-rule.test.mjs` (a pass minted for one
  browser id refused for another; the 30-minute expiry; the future stamp).
- **Saving**: ~20 lines; one HMAC-token implementation instead of two; the trivia pass gains
  the unit-tested attack surface the human pass already has.
- **Risk & gate**: low-medium (this is a signup gate). `npm run check`;
  `human-pass-rule.test.mjs` must stay green with its nine cases untouched;
  `gate-coverage.test.mjs` PUBLIC_BY_DESIGN names `getTriviaQuestion`/`checkTrivia`/
  `hasPassedTrivia` -- the function names and their `export async function` shape are
  unchanged; `scripts/qa/phase4-probe.mjs` (trivia limits and replay) is the behavioural
  proof, owner-run. Manual: answer the entry question, then register, once.
- **Confidence**: high. The one thing that would change my mind: a deliberate wish for the
  two tokens to be unable to share a bug -- but they share the secret and the scheme
  already, so separate implementations buy only separate mistakes.
- **Notes**: `human-pass-rule.ts:34-37` inlines its own constant-time compare on purpose
  (rule files import nothing relative); the generalised functions inherit that, so
  `timing-safe.ts` loses its trivia consumer and keeps three others. Do NOT move the trivia
  question bank or `normalize`/`withinOneEdit` (`trivia-actions.ts:19-232`); they are the
  owner-tuned answer rules, and are argued line by line.

### auth-edge-04 - `HoopoeWarmup` on /login and /signup warms a rig the page has already built
- **Where**: `src/app/(auth)/login/login-client.tsx:15,374-377`;
  `src/app/(auth)/signup/signup-client.tsx:14,212-215`; the component
  `src/components/mascot/hoopoe-warmup.tsx:5-39` (its own rationale); the landing's mount,
  which stays, at `src/components/landing/landing-hero.tsx:445`.
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (mascot lens to co-sign)
- **Evidence**: the warmup's header states its one job: on the LANDING "there is usually no
  `<Hoopoe>` mounted anywhere yet", so the first SVG rig the browser ever builds would be the
  flight puppet, mid-flight; the fix mounts one off-screen at idle for two frames. Both auth
  pages render a real `<Hoopoe>` statically at first paint (`login-client.tsx:245`,
  `signup-client.tsx:159`; on a flight arrival it sits at opacity 0, which still lays out and
  paints). So by the time the warmup's idle callback fires, the page's own bird has already
  paid every cost the warmup exists to pre-pay, and its part 1 (`import("./hoopoe")`) is a
  no-op the file itself calls "harmless / instant if this page already has it". The comment
  at the two mounts ("in case a visitor lands here directly and bounces back to the landing
  hero to fly again") describes a case the page's own mounted bird already covers, and the
  landing re-mounts its own warmup on the way back regardless. `git log -S HoopoeWarmup` on
  login-client shows it arrived inside `36e17cd` "feat(security): bot defence and one rate
  limiter at every door" (2026-08-20) with no measurement of its own.
- **What to do**: delete the import and the `<HoopoeWarmup />` (with its 3-line comment) from
  both auth clients. Leave `hoopoe-warmup.tsx` and the landing's mount alone.
- **Saving**: ~10 lines across two files; one fewer off-screen 1,512-line SVG mount + paint on
  every /login and /signup load (idle-time work, but on a phone it is a second rig built at
  the moment the mobile fly-in is about to start); ~1 KB of the page chunk.
- **Risk & gate**: low. `node scripts/qa/hoopoe-landing-check.mjs` (exists; pins the fly-in's
  first visible frame); a manual round trip landing -> Sign in -> back -> Sign in at 1440 to
  look for a stutter on the second flight; `npm run visual`. No rule test names
  `HoopoeWarmup`.
- **Confidence**: medium-high. It would change my mind if the mascot lens knows a measured
  stutter on the SECOND flight that only the auth page's warmup fixed; the commit that added
  it records none, and the mechanism argued in the warmup's own header does not apply to a
  page that mounts the rig.

### auth-edge-05 - The three email-flow clients hold two handles to one bird
- **Where**: `src/app/(auth)/forgot-password/forgot-client.tsx:47-48` (`useHoopoe()` AND
  `apiRef`), `:61-64`, `:80,88,102`, `:114-118`;
  `src/app/(auth)/reset-password/reset-client.tsx:68-69`, `:78-91`, `:113-114`, `:130-131`,
  `:138`; `src/app/(auth)/verify-email/verify-client.tsx:71` (`useHoopoe()` for the ref
  only), `:83-105`. The wrapper they could use instead:
  `src/components/mascot/use-hoopoe.ts:51-76`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `useHoopoe()` returns `{ ref } & HoopoeApi` -- stable wrappers for EVERY verb
  (`express`, `react`, `nod`, `shake`, `celebrate`, `coverEyes`, `peek`, `gaze`, ...) that
  forward to the controller once mounted and "resolve harmlessly" before. The three pages
  call `useHoopoe()` for `hoopoe.gaze()`/`peek()`/`coverEyes()`, and ALSO capture the raw
  `HoopoeApi` from `onHoopoeReady` into `apiRef` to call `express`/`react`/`nod`/`celebrate`/
  `shake` -- the same verbs the wrapper already exposes. `reset-client.tsx:84,114` even
  calls `coverEyes` through both handles. `verify-client` uses `useHoopoe()` for nothing but
  the ref. /login and /signup are different: their `runIntro` receives `api` from the hook
  and uses it inside that callback only, which is the shape the hook documents.
- **What to do**: in forgot/reset, delete `apiRef` and replace every `apiRef.current?.x(...)`
  with `hoopoe.x(...)`; keep `onHoopoeReady` only for the arrival beat (it can call
  `hoopoe.express("curious")` too, since the ref is attached before `onReady` fires -- or
  keep using its `api` argument inside that one function, as /login does). In verify-client
  the same, or simply `const hoopoe = useHoopoe()` and pass `hoopoe.ref`.
- **Saving**: ~12 lines across three files; one mental model for "how a page talks to its
  bird".
- **Risk & gate**: low. `npm run check`; a manual look at the three pages' arrival beats at
  1440 and 390 (curious lean on forgot, covered eyes / sad shake on reset, celebrate on
  verify). No rule test pins these lines; `auth-flow-rule` C-034 pins only the `callAction`
  dispatches, which are untouched.
- **Confidence**: medium-high. Would change my mind: if a wrapper verb called inside
  `onHoopoeReady` can run before `ref.current` is assigned on some path. Reading
  `use-hoopoe.ts`, a pre-mount call resolves as a no-op rather than throwing, so the worst
  case is a missed beat, which the page-level `api` argument avoids anyway.

### auth-edge-06 - `(auth)/layout.tsx` is a no-op wrapper with a stale comment
- **Where**: `src/app/(auth)/layout.tsx:1-9`; the styles it duplicates:
  `src/app/globals.css:384-386` (`body { @apply bg-background text-foreground }`) and every
  page root under it (`login-client.tsx:198`, `signup-client.tsx:103`, `auth-panel.tsx:126`,
  `error.tsx:26`, all `min-h-screen`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: the layout renders `<div className="min-h-screen bg-background">{children}</div>`
  and nothing else. The body already carries `bg-background`; every page and the error
  boundary set their own `min-h-screen`. Its comment ("login is a photo-split;
  signup/onboarding center their own card") dates from `ddf25bf` 2026-06-28 and is false
  twice over: /signup has been a photo-split since the calm-form redesign, and onboarding
  (`/welcome`) lives under `(main)`. A route group needs no layout; `(auth)/error.tsx` nests
  under the root layout and keeps working.
- **What to do**: delete the file. TRAPS: deleting a route file can leave a stale validator
  in `.next/types`; if `tsc` complains, move that directory aside as the entry describes.
- **Saving**: 1 file, 9 lines; one fewer layout segment in the render tree of five routes.
- **Risk & gate**: low. `npm run check`; open /login, /signup, /verify-email (no token) and
  the auth error boundary (throw once locally) to confirm the cream background and full
  height; `npm run visual` (login + signup baselined; pixel-identical expected). Pins:
  `proxy-rule.test.mjs` C-119 reads `src/app/layout.tsx` (the root), not this file.
- **Confidence**: high.

### auth-edge-07 - `hashToken` is exported for a caller that no longer exists, under a docblock that says so
- **Where**: `src/lib/auth-tokens.ts:61-79` (docblock + `export function hashToken`); its
  only callers are in the same file (`:121`, `:183`, `:275`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-config.txt:67` lists it unused; grep of `src` and `scripts`
  finds no importer -- the one external mention is a comment in `email-actions.ts:175`. The
  docblock (lines 65-75) still argues the export: "Exported because `email-actions.ts` needs
  to claim a token inside the SAME transaction ... So the claim is repeated against `tx` --
  see `claimToken` below, which is where that now lives". That last clause is the giveaway:
  `claimToken` (`d3b1b79`, audit-1 auth-edge-08) moved the claim INTO this file, so the
  reason for the export left with it, and the paragraph now describes the state it replaced.
- **What to do**: drop the `export` keyword; cut the docblock to its first two sentences
  ("The stored form of a token. Only the hash is ever written down, so a database read
  cannot hand anybody a working link.") and, if the fixer wants to keep the drift warning,
  one line: "One hash for mint, read and claim; two spellings of it would break every link
  in the app the day they differed." Update `email-actions.ts:175`'s pointer to say
  `claimToken`'s docblock instead.
- **Saving**: ~10 lines; one knip line clears; a docblock stops describing deleted code.
- **Risk & gate**: none beyond `npm run check`. Pins: `verify-outcome-rule.test.mjs` reads
  decommented `auth-tokens.ts` for `reason: "used"; userId` and the `BURNS_ON_MINT` table --
  untouched; `email-normalization-rule.test.mjs` allowlists `sentToEmail` in this file --
  untouched.
- **Confidence**: high.

### auth-edge-08 - A type re-export nobody consumes, and four `User` fields nothing sets or reads
- **Where**: `src/lib/member-gate.ts:29` (`export type { GateResult } from "./email-verification"`);
  `src/types/next-auth.d.ts:43-48` (`accountType?`, `verifyState?`, `photoUrl?`,
  `birdOverride?` on the `User` augmentation).
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `GateResult` appears in exactly two files, its definition
  (`email-verification.ts:37`) and `member-gate.ts`, which imports it on line 4 for its own
  signature and then re-exports it on line 29 for importers that do not exist (the six
  importers of `member-gate` take `requireVerifiedMember`/`viewerMaySeeContacts` only).
  Audit 1 removed this file's sentinel re-export (`MEMBER_UNVERIFIED`) and missed the type
  one. In `next-auth.d.ts`, the `User` interface is what `authorize()` returns and the `jwt`
  callback reads: `auth.ts:239-253` returns `id, name, email, role, batchType, batchYear,
  credentialVersion` and `auth.ts:297-309` reads exactly those; `accountType`, `verifyState`,
  `photoUrl`, `birdOverride` are set on `Session.user` from the row (`auth.ts:347-363`),
  never on `User`. knip does not see either because type augmentations and type re-exports
  are outside its resolution.
- **What to do**: delete `member-gate.ts:29`; delete the four `User` lines (keep `role?` and
  `credentialVersion?`, which `jwt()` reads, and `batchType?`/`batchYear?`, which it copies).
  `tsc` proves it: nothing narrows on them.
- **Saving**: 5 lines.
- **Risk & gate**: none beyond `npm run check`. `session-revocation.test.mjs` reads
  `auth.ts`'s session `select`, not the type file.
- **Confidence**: high.

### auth-edge-09 - `AuthPanel`'s `hoopoeSize` prop is passed by no caller
- **Where**: `src/components/auth/auth-panel.tsx:89` (default `102`), `:99` (type), `:152`
  (use); callers `forgot-client.tsx:122-126`, `reset-client.tsx:159-163`,
  `verify-client.tsx:120-124` pass `back`, `hoopoeRef`, `onHoopoeReady` only.
- **Phase**: placeholder
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep `hoopoeSize` across src: the three lines above and nothing else. The
  102 is /login's size and the header comment already says the three email pages "ride
  along" with /login's column; a size that varies per page would contradict that.
- **What to do**: remove the prop and its type; write `size={102}` at line 152 with a
  four-word comment ("/login's size; one column").
- **Saving**: 3 lines; one fewer option nobody chose.
- **Risk & gate**: `npm run check`.
- **Confidence**: high.

### auth-edge-10 - The canonical email form is spelled by hand in two more places
- **Where**: `src/lib/login-attempt.ts:48`
  (`email: input.email.trim().toLowerCase().slice(0, 200)`);
  `src/app/(auth)/forgot-password/page.tsx:6-11` (`looksLikeEmail`, a third email regex in
  the codebase) and `:29`. The canonical pair: `src/lib/email-address.ts:23-25`
  (`normalizeEmail`) and `:42-44` (`emailField`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `email-address.ts`'s header is the B-020 story: three canonical forms became
  one. The sweep in `email-normalization-rule.test.mjs` covers LOOKUPS (`where: { email }`),
  so a write of the same shape (`login-attempt.ts` writes `data: { email }`) and a prefill
  check are outside it and can drift unnoticed -- exactly how the `displayEmail` bare
  `z.email()` drifted before audit 1's auth-edge-05. `looksLikeEmail` is looser than the
  schema on shape and stricter on length (254 vs `EMAIL_MAX` 200), so an address the prefill
  accepts can be one the server refuses.
- **What to do**: `login-attempt.ts`: `email: normalizeEmail(input.email).slice(0, 200)`
  (import from `./email-address`; this is a server module, zod is already in its bundle).
  `forgot-password/page.tsx`: replace `looksLikeEmail` with
  `emailField().safeParse(email).success`, keeping the same "prefill only if it parses"
  behaviour; the box then also opens lowercased, which the server would do anyway.
- **Saving**: ~8 lines; one regex fewer; the write side joins the lookup side on one form.
- **Risk & gate**: low. `npm run check`; `email-normalization-rule.test.mjs` (unaffected: no
  `where:` changes) and `login-attempt-rule.test.mjs` (reads the `LoginReason` vocabulary
  from this file, untouched) stay green. Manual: /login, type a capitalised address, press
  "Forgot it?", see it prefilled.
- **Confidence**: high.

### auth-edge-11 - Eight comments that describe deleted or moved code
- **Where**:
  (a) `src/components/auth/email-actions.ts:29-32` -- a four-line docblock for
  `MIN_PASSWORD` with no declaration under it (the constant moved to `password-rule.ts` in
  `2630812`); it now floats above a section divider.
  (b) `src/lib/rate-limit.ts:203-206` -- `rateLimit()`'s docblock ("Count this event against
  the limit ... one line after the member gate") sits above `reportLimiterFailure`'s docblock
  (207-220), two declarations away from its function at line 232.
  (c) `src/lib/email-verification.ts:72-73` -- a tombstone: "viewerMaySeeContacts moved to
  member-gate.ts on 2026-08-20".
  (d) `src/lib/mask-email.ts:4-7` -- claims "the 'check your inbox' screen masks the address
  the visitor just typed" and that a client component would otherwise "pull the Resend SDK";
  `forgot-client.tsx:34-37` says the opposite ("unmasked ... masking a value somebody just
  entered protects nobody"), and all four importers of `maskEmail` are server modules.
  (e) `src/app/(auth)/login/login-client.tsx:276-281` -- "That bypass is being removed":
  it was removed 2026-08-19 (C1-a/b/c); six lines describing deleted code in the present
  tense. (The next comment, 282-292, is the argued reason for the missing `initial` and is
  pinned by `auth-first-frame.test.mjs:101-125`; keep it.)
  (f) `src/proxy.ts:58-61` -- the parenthetical "(Until 2026-08-19 this line also guarded
  admin-login ... that route is deleted -- security audit C1-b.)". Carries an audit id, so
  the fixer may keep it; flagged because the charter asked for exactly this class.
  (g) `src/app/(auth)/layout.tsx:6-7` -- see auth-edge-06; moot if the file goes.
  (h) `src/components/auth/auth-panel.tsx:180` -- "34ch, not /login's 30": /login has had no
  subtitle paragraph since the calm-form pass (2026-08-14); there is no 30ch measure in
  `login-client.tsx` to differ from.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: each verified by reading the file it points at (quoted above). Two of a
  different kind, quoted so the fixer can tell them apart: `auth.ts:157-162` ("There is
  deliberately no admin branch here. Until 2026-08-19 ...") also describes deleted code but
  IS the C1-a decision and the pin's context -- keep; `proxy.ts:66-75` (the /api/places
  paragraph) describes a deleted list entry but is the reason it must not come back
  (bug M64) -- keep.
- **What to do**: (a) delete; (b) move the four lines down to sit above `export async function
  rateLimit`; (c) delete; (d) rewrite to "First character and domain only ... Pure and
  importless so any caller can take it" and drop the Resend sentence; (e) cut to the one
  sentence that carries the decision ("Unconditional: the field used to hide for the admin
  address, which is also what stopped the owner ever testing his own password"); (f)
  fixer's call; (h) cut "not /login's 30".
- **Saving**: ~20 lines; four docblocks stop lying.
- **Risk & gate**: none beyond `npm run check` (every rule test decomments before matching,
  so comment edits cannot trip one).
- **Confidence**: high.

### auth-edge-12 - `(auth)/error.tsx` nests a `<Button>` inside a `<Link>`
- **Where**: `src/app/(auth)/error.tsx:37-39`; the repo's idiom for the same thing:
  `reset-client.tsx:181-189` and `verify-client.tsx:129-136` (`nativeButton={false}
  render={<Link href=... />}`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: an interactive element inside an interactive element (a `<button>` in an
  `<a>`) is invalid HTML and reads as two stops to a screen reader; the base-nova Button's
  `render` prop exists for exactly this and the two sibling pages use it.
- **What to do**: `<Button variant="outline" nativeButton={false} render={<Link href="/login" />}>Back to sign in</Button>`.
- **Saving**: 2 lines; one fewer nested-interactive.
- **Risk & gate**: `npm run check`; throw once locally under `(auth)` and press the button.
  Not a baselined route.
- **Confidence**: high.

### auth-edge-13 - Small simplifications in the signup form, the literal "8", and three duplicate import lines
- **Where**: `src/components/auth/signup-form.tsx:354-357` (`ACCOUNT_TYPES` declared inside
  the component, `as const`, rebuilt per render), `:366-392` (four identical
  `setError(...); hoopoe.react("error"); setLoading(false); return;` blocks), `:369` and
  `src/components/auth/actions.ts:38` (the sentence "Password must be at least 8
  characters." with the digit hand-typed beside a `MIN_PASSWORD` comparison);
  `login-client.tsx:12,27`, `forgot-client.tsx:10,17`, `reset-client.tsx:10,17` (two
  `import` lines from `@/components/mascot/use-hoopoe` each).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read of the files. The literal "8" is the residue of audit-1 auth-edge-13:
  the COMPARISON reads `MIN_PASSWORD` but the SENTENCE still says eight, so raising the floor
  would make the refusal lie; `password-rule.ts:56` and `email-actions.ts:322` already
  template it. The four `fail` blocks are the brief's 5d case (repeated logic in one
  function); `ACCOUNT_TYPES` is a module constant living in a render.
- **What to do**: move `ACCOUNT_TYPES` above the component; add a local
  `const fail = (msg: string) => { setError(msg); hoopoe.react("error"); setLoading(false); }`
  and use it four times; template both sentences on `MIN_PASSWORD`; merge the paired
  import lines (`import { useHoopoe, gazeFor } from ...`).
- **Saving**: ~14 lines.
- **Risk & gate**: `npm run check`; `auth-first-frame.test.mjs` pins copy and classes in
  `signup-client`/`login-client`/`trivia-gate`, not the error sentence; `npm run visual`.
- **Confidence**: high.

## Owner decisions

- **Which (i)-tooltip is the product's, now with a price tag (carried over from audit 1,
  auth-edge-15).** There are still two circled-i helpers: the one on the signup form (hand
  written, clamps to the phone screen, opens under the icon, no library behind it) and the
  shared one built on the popover library (opens above; used by the Catch-ups reminder setting
  and, since audit 1, by every form field that offers a hint). The second one is what brings
  about 100 KB of extra JavaScript to the sign-in, join, forgot and reset pages and the front
  page, even though none of those pages ever shows the tooltip (auth-edge-01 stops that
  regardless of your choice). My recommendation is unchanged from audit 1 and stronger for it:
  keep the signup one, use it in both places, retire the popover-based one, and check the
  Catch-ups reminder screen still looks right. Nothing is lost but a few dozen lines and a
  small inconsistency, and the popover library stops being a dependency of a text field.
- **The bird on the sign-in page costs about 85 KB, and I recommend keeping it.** Of the
  sign-in page's first load, roughly 85 KB is the hoopoe (its drawing, the flight machinery
  that carries it from the front page, and the animation engine under it). It is the
  signature of the site and it is shared with the front page, so removing it from the
  sign-in page alone would save almost nothing a visitor coming from the front page would
  notice. No cut proposed; the number is here so the decision is yours and informed. What
  IS proposed (auth-edge-04) is removing a second, invisible bird that the sign-in and join
  pages build off-screen for two frames "to warm up" a rig those pages have already built.
- **Nothing else here needs a ruling.** The entry question, the human pass, the Wordle gate,
  the roster auto-verify and the batch-group auto-join all trace to owner decisions recorded
  in comments or SECURITY.md; none is a placeholder, and none is proposed for removal.

## Not-findings

- **proxy.ts's 262 comment lines over 132 code (the charter's direct question).** Re-read
  block by block. Every paragraph carries an audit id, a date, a measured fact or an owner
  decision (C-198, C-202, C-203, B-022, C-117/C-200, C-111/C-136, M19, M27/M34, H12, the
  Host-header curl verification, the visit-cookie race history, the server-action
  revalidation trap measured on a response). The file's SHAPE is pinned four ways:
  `proxy-rule.test.mjs` parses the literal `const publicPaths = [` block, the matcher string,
  the `x-search`/`x-pathname` sets, the `next=` line and the `isServerAction` guard;
  `security-regressions.test.mjs:188-213` pins the ingest strip's position before
  `publicPaths`; `demo.test.mjs:220-235` parses `DEMO_CLOSED_PATHS`. The one paragraph that
  literally describes deleted code (58-61) is auth-edge-11(f), fixer's call. Leave the rest.
- **One rate limiter, or several?** One: `rate-limit.ts` is a 19-row `LIMITS` table behind
  one Upstash client; every `rateLimit("name")` call site was counted (14 names, one or two
  callers each; `hasBudget`/`consume` have two callers, `auth.ts` and the settings reauth).
  `auth-tokens.ts:51-59` carries a SECOND mechanism -- a per-account, per-kind mint ceiling
  counted in Postgres -- and it is not a duplicate: it keys on `userId` not IP, guards a third
  party's inbox and the mail budget rather than the door, and fails CLOSED (the Upstash
  limiter fails open by design). Two postures, two stores, both argued. Keep.
- **Login attempts, session revocation and credentialVersion are one path.** `authorize()`
  records every branch through `recordLoginAttempt` (seven call sites, one function); the
  session callback decides through `sessionRevoked()` (pinned by `session-revocation.test.mjs`
  in both halves: the rule and the `select` feeding it); dev-login stamps the same
  `credentialVersion` from the row (`route.ts:121`). No second path exists.
- **dev-login's production-404 is pinned.** `security-regressions.test.mjs:32-41` requires
  `NODE_ENV`/`production`, `DEV_LOGIN_SECRET`, `timingSafeEqual` and no literal role;
  `auth-flow-rule.test.mjs:143-153` requires `MAX_AGE = SESSION_MAX_AGE` and forbids a typed
  number; `email-normalization-rule.test.mjs:175-179` requires `normalizeEmail`. Route stays.
- **`/api/auth/[...nextauth]` (2 lines) is NextAuth's handler contract**; cannot be an
  action. `/api/dev-login` serves curl, the MCP and the QA scripts; an action cannot.
- **The (auth) per-page code is earned.** By cloc: `login-client` 237 code / 125 comment
  (the peek-a-boo intro 29 lines, `handleSubmit` 70, the shell + form 140);
  `signup-client` 127 / 79 (a greet intro and a two-step column, nothing else);
  `forgot-client` 165 / 52; `reset-client` 191 / 51 (its 22-line `DEAD_LINK` table is
  three owner-tuned screens); `verify-client` 129 / 31 (a seven-outcome copy table). The
  three email pages already sit on `AuthPanel`/`AuthHeading`; the arrival beats and the
  copy are the per-page remainder, and each is owner-tuned. What is left duplicated between
  /login and /signup (jscpd: the outer scaffold `194:3-218:28`, the perch box
  `229:78-245:45`, and a 6-line class string) is ~45 lines and one perch comment written
  twice with slightly different words. I looked hard at a `FlightPerch` leaf: it would take
  seven props for twelve lines of JSX, and `auth-first-frame.test.mjs:37-66` asserts the
  perch-box class strings are present IN `login-client.tsx` and `signup-client.tsx`
  (`source.includes(snippet)`), so moving them would mean re-pointing that pin. Net negative
  by this repo's own dedupe lesson; tolerated, my judgement, and consistent with the
  owner-recorded split in `auth-panel.tsx:20-26`.
- **`signup-form.tsx` does not dispatch `registerUser` through `callAction`**, and does not
  need to: `handleSubmit` wraps the await in `try/catch/finally` (`:394-476`), the catch sets
  the sentence and re-arms Turnstile, and the `finally` deliberately leaves the button
  disabled on success (audit Low 111). `auth-flow-rule` C-034 pins the three EMAIL clients
  only. Adopting `callAction` there would be consistency for its own sake. Elsewhere in the
  territory every action dispatch from a client goes through it (`trivia-gate`,
  `member-verify-dialog`, `verify-email-dialog`, `verify-email-banner`, the three email
  clients). The nine non-adopters the census found are all outside this slice (admin,
  collection, support, letters) and are listed under "For other lenses".
- **The `*-rule.ts` / implementation splits (`human-pass`, `roster`, `turnstile-origin`,
  `origin`, `password`, `session-revocation`) are the testing protocol**, not one-export
  bloat: each rule file is pure so `node --test` can load it, and each has its own attack
  suite. `turnstile-origin-rule.ts` (2026-08-28, newest file in the territory) is the
  narrowing that makes the `vercel.app` hostname widening safe (SECURITY.md, "The hostname
  list"); its one importer is by design.
- **The exported signature types** (`TokenKind`, `MintResult`, `ConsumeResult`,
  `TurnstileFailure`, `BannerState`, `RevocationRow`, `LimitName`,
  `RequestVerificationResult`) have no external importer, and that is fine: each is the
  parameter or return type of an exported function or the prop type of an exported
  component. De-exporting them would be the kind of tidiness that makes callers write
  `Parameters<typeof x>[0]`. Not dead.
- **The session cookie name pair is spelled in three files** (`proxy.ts:172-173`,
  `dev-login/route.ts:104-106`, `scripts/qa/_dev-login.mjs:24`). The proxy deliberately
  imports nothing app-local (edge bundle; audit-1 not-finding), so a shared constant would
  serve only the other two; six characters of drift risk against a new import. Tolerated.
- **The two gate dialogs' matching 320px card and the banner/dialog resend handlers**
  (jscpd 12 + 14 lines): audit-1 not-findings, re-confirmed. The copy differs by surface on
  purpose ("make all the confirm email alerts look the same" was about SHAPE), and the
  handlers' three-state sentences differ.
- **The forgot/reset `AnimatePresence` wrappers and signup-client's two step wrappers**
  (jscpd 6-8 lines each): the standard `initial/animate/exit` scaffold on `SPRINGS.gentle`;
  not worth a primitive.
- **`TURNSTILE_DEV_CHALLENGE` / `TURNSTILE_DEV_REAL` / the `devBypass` credential**: real
  dev and QA switches. `devBypass` is presented by `phase4-probe`, `phase6-probe`,
  `phase8-probe` and `phase4-prod-check` (the last one proving it is refused in production).
- **`auth.ts`'s session callback reads twelve columns on every request.** `auth()` is
  `cache()`d per request (one read for layout + page + every action) and the columns are
  what the trust model needs fresh (role, `emailVerified`, `verifyState`, `isBlocked`,
  `credentialVersion`); `session-revocation.test.mjs:84-105` derives the required columns
  from the rule. Not a query-count finding.
- **`double-submit.ts`** is in this charter's list but is a feed/messages/Catch-ups helper
  (three importers there, none here); nothing to do in this slice.
- **`mask-email.ts` as its own file**: with no client consumer its "both sides need it"
  reason is gone (auth-edge-11(d) fixes the docblock), but the file is 8 lines of code, pure,
  and merging it into `email.ts` would save one file for no bundle change. Left alone.

## Audit-1 carry-overs in this territory

- auth-edge-01 (flight-perch hook): done (`0dd055a`), adopted by `login-client:99`,
  `signup-client:97`, `auth-panel:117`; no fourth copy exists.
- auth-edge-02 (photo panel): done (`76d999e`); `AuthPhotoPanel` used by all three shells.
- auth-edge-03 (PasswordField adopted): done (`da091ca`); used by login, signup-form, reset
  (twice) and `auth-first-frame`; no inline reveal toggle remains.
- auth-edge-04 (five `*-message.ts` files into one): filed as optional taste, NOT done.
  Current state, reported not re-argued: still five files (`rate-limit-message` 8 lines,
  `member-gate-message` 14, `email-gate-message` 17, `sign-in-unavailable-message` 18,
  `bot-check-message` 36); importers 3, 3, 4, 1, 5 respectively; no `.test.mjs` names any of
  the five paths; `scripts/qa/phase3-probe.mjs:26-27` and `phase4-probe.mjs:42` import three
  of them by relative `.ts` path. Two things have changed since: the login page's
  code-to-sentence map (`login-client.tsx:165-173`) and the proposed `proof()` in
  auth-edge-02 are both consumers that would read more naturally from one file.
- auth-edge-05 (links schema + displayEmail): done (`64f8297`); `linksList()` at
  `validators.ts:60-81`, both `displayEmail`s on `emailField()`.
- auth-edge-06 (LOGIN_TRANSITION_FLAG): done (`17fcfeb`); `use-flight-arrival.ts` reads
  only `FLIGHT_FLAG` and `AUTH_PREVIEW_FLAG`.
- auth-edge-07 (metadata-only layouts): done (`99dcc4e`); metadata inline in
  `login/page.tsx:4` and `signup/page.tsx:4`. The route-group layout that remains is
  auth-edge-06 above.
- auth-edge-08 (claimToken): done (`d3b1b79`); both claims call it. Its side effect is
  auth-edge-07 above (`hashToken`'s export outlived its reason).
- auth-edge-09 (seven dead exports): done (`e23e80c`); `auth.ts:382` exports `handlers`
  only, `reportSchema` gone, both sentinel re-exports gone, `VerifiedViewer`,
  `tryRosterAutoVerify` and `EMAIL_MAX` unexported. The type re-export in auth-edge-08 is
  the one that survived.
- auth-edge-10 (`signin.success`/`signin.fail` audit actions): `audit.ts` is the
  admin-analytics lens's; not re-verified here.
- auth-edge-11 (dev-login via `next-auth/jwt`): done (`931a4cd`); `route.ts:38`.
- auth-edge-12 (requireVerifiedMember composes Stage 1): done (`89315d9`);
  `member-gate.ts:47-58`.
- auth-edge-13 (MIN_PASSWORD + gazeFor): done (`2630812`); seven importers of the constant;
  residue is the two hand-typed "8" sentences in auth-edge-13 above.
- auth-edge-14 (auth-tokens stale docs): done; the `RATE_LIMIT` doc sits above its table
  (`:51-59`) and `mintToken`'s docstring states the per-kind burn (`:148-157`).
- auth-edge-15 (InfoTip canon): OPEN owner decision; see Owner decisions. New since audit 1:
  `info-tooltip.tsx` has a second consumer, `float-field.tsx`, which is what makes
  auth-edge-01 a bundle finding.
- Report §4 "retiring two security probes": the probes are the scripts lens's; noted here
  only that `phase3-probe` and `phase4-probe` are the sole non-src importers of the message
  files and `phase4-probe` is the behavioural proof named by findings 02 and 03.

## For other lenses

- **bundle-build / shell-primitives**: `src/components/common/float-field.tsx:5` ->
  `info-tooltip.tsx` -> `ui/popover.tsx` -> `@base-ui/react/popover`: ~100-135 KB raw on
  every FloatField route (auth-edge-01). Separately, base-ui's core chunk (with floating-ui,
  `useRender`, motion, tailwind-merge: `0pz4spm2fe1cw.js` 25.9 KB on /verify-email,
  `33tpczt5r6c49.js` 16.5 KB on /login) rides in through `ui/button.tsx:4`
  (`@base-ui/react/button`) on every page with a Button; whether a Button needs the
  base-ui render engine at all is that lens's question. The 34.2 KB `0mmkcfgfeodk3.js`
  chunk matched only floating-ui markers; worth naming precisely in the build.
- **landing-mascot-avatars**: auth-edge-04 (`HoopoeWarmup` on the auth pages) and
  auth-edge-05 (the two-handle pattern) touch `hoopoe-warmup.tsx` and `use-hoopoe.ts` only
  by call site; `landing-hero.tsx` is the one page that needs the warmup. Also: the perch-box
  comment in `login-client.tsx:230-239` and `signup-client.tsx:147-153` is the same argument
  in two wordings; if the hook ever grows a `FlightPerch` leaf, that comment goes with it.
- **feed-posts / member-surfaces / admin-analytics / catchups (callAction non-adopters
  outside this slice)**: `admin/content/content-list.tsx` (2 bare awaits),
  `admin/people/person-detail.tsx` (3), `admin/reports/report-list.tsx` (1),
  `profile/admin-profile-tools.tsx` (3), `collection/contribute-room.tsx` (4),
  `support/support-contribute.tsx` (2), `letters/letter-engagement.tsx` (1),
  `catchups/round/entry-love-button.tsx` and `collection/photo-river.tsx`/`river-controls.tsx`
  (0 calls of either kind; they import an actions module for types or a hook). Each is the
  B-042 stranded-busy-flag class `call-action.ts` was written for.
- **lib-core-config**: no path list is duplicated between `proxy.ts` and `next.config.ts`
  (answered above). `wordle.ts:16` imports `./fnv1a.ts` with an explicit `.ts` extension
  while every other lib import is extensionless; consistency only.
- **scripts-e2e-ci**: `scripts/qa/phase3-probe.mjs:26-27` and `phase4-probe.mjs:42` import
  three `*-message.ts` files by relative path; if auth-edge-04 (carry-over) is ever taken,
  those two imports move with it.
- **admin-analytics**: audit-1 auth-edge-10 (`signin.success`/`signin.fail` in `audit.ts`)
  was not re-verified here.
- **design lens**: `(auth)/error.tsx`'s Button-in-Link (auth-edge-12) may have siblings under
  `(main)`; a grep for `<Link[^>]*>\s*<Button` would find them.

## Metrics

- Lines read: 11,335 in-territory (`(auth)` 1,438; `components/auth` 3,429; api routes +
  types 624; lib 3,206; tests 2,189; mascot critical-path files 449) plus ~860 lines of spec
  and ~1,300 lines of audit-1 report and fix-prompt.
- Comment-to-code, from `raw/cloc-by-file.csv`: `proxy.ts` 262/132 (1.98), `rate-limit.ts`
  170/117 (1.45), `turnstile.ts` 112/78 (1.44), `demo.ts` 162/116 (1.40), `auth-tokens.ts`
  169/132 (1.28), `api-gate.ts` 66/55 (1.20), `session-revocation.ts` 54/13,
  `turnstile-origin-rule.ts` 46/12; directory ratios `components/auth` 0.54, `(auth)` 0.42.
  All examined; the flagged lines are auth-edge-07 and auth-edge-11 (~30 lines out of
  ~2,900 comment lines in the territory).
- Biggest files (total lines): `signup-form.tsx` 701, `auth.ts` 461, `email-actions.ts` 438,
  `proxy.ts` 418, `login-client.tsx` 380, `trivia-actions.ts` 335, `auth-tokens.ts` 325,
  `rate-limit.ts` 306, `demo.ts` 302, `validators.ts` 299.
- jscpd clone pairs inside the territory: 12 (from `raw/jscpd.txt:137-159, 617-624`);
  addressed by findings 02 (the token dance is a clone jscpd's token threshold misses);
  tolerated with reasons: the login/signup shell (3 pairs), the forgot/reset and
  signup-client motion wrappers (3), the two gate dialogs (1), the banner/dialog handlers
  (1), the login/signup import blocks (1), the error `m.p` (1), signup-form's internal pair
  (1).
- Single-export-single-importer lib files: 3 of 32 (`sign-in-unavailable-message`,
  `wordle`, `origin-rule`); `turnstile-origin-rule` is 2 exports / 1 importer. Files with
  3+ importers: 19 of 32. `auth.ts` 51 importers, `call-action.ts` 50, `demo.ts` 30,
  `rate-limit.ts` 14.
- `rateLimit` call sites by name: 14 names, 1-2 callers each; `hasBudget`/`consume`: 2
  callers. `clientIp`/`ipFromRequest`: 5 files.
- Route first-load (bytes, `raw/route-bundle-stats.json`): /signup 942,828; /login 928,393;
  /reset-password 924,400; / 921,074; /forgot-password 920,819; /verify-email 762,499;
  /privacy 644,863. /login minus / = 40.6 KB (4 chunks); /login minus /privacy = 285.6 KB
  (12 chunks); /forgot-password minus /verify-email = 223.4 KB (8 chunks), of which the
  Popover/select trio is 100.6 KB and the floating-ui chunk 34.2 KB.
- Files touched in this territory since audit 1 closed (`raw/files-added-since-audit1.txt`):
  2 (`turnstile-origin-rule.ts` and its test, 2026-08-28), both read with the extra
  suspicion the brief asks for and found to be the pinned narrowing SECURITY.md describes.
- Estimated honest savings if every autonomous finding lands: ~100-135 KB raw first-load JS
  on five routes (01); ~115 lines and 1 file (02-13 combined); 1 knip line; four docblocks
  corrected; one fewer off-screen SVG mount per auth page load.

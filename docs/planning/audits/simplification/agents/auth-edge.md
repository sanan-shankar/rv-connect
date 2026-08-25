# auth-edge - simplification audit report

Territory reader for authentication, the request edge and the auth-shaped API routes:
`src/app/(auth)/**` (14 files), `src/app/api/auth/**`, `src/app/api/dev-login/route.ts`,
`src/proxy.ts`, `src/components/auth/**` (12 files), 31 named `src/lib/*` files and
`src/types/next-auth.d.ts`. This is the most security-sensitive slice; every proposal below
names the `*-rule.test.mjs` / `security-regressions.test.mjs` pins it touches, and nothing
here weakens the demo's three-layer default-deny (`proxy.ts`, `lib/demo.ts`,
`lib/call-action.ts`). Date: 2026-08-25. Files in territory: 47; read fully: 44 (see Coverage).

## Coverage

- **Read fully**: all of `src/app/(auth)/**` (login, signup, forgot-password, reset-password,
  verify-email pages + clients + layouts, `error.tsx`), all 12 of `src/components/auth/**`,
  `src/app/api/auth/[...nextauth]/route.ts`, `src/app/api/dev-login/route.ts`, `src/proxy.ts`,
  and these libs in full: `auth.ts`, `auth-tokens.ts`, `app-secret.ts`, `double-submit.ts`,
  `email-address.ts`, `email-gate-message.ts`, `email-verification.ts`, `verification-mail.ts`,
  `bot-check-message.ts`, `human-pass.ts`, `human-pass-rule.ts`, `login-attempt.ts`,
  `mask-email.ts`, `member-gate.ts`, `member-gate-message.ts`, `next-path.ts`, `origin-rule.ts`,
  `password-rule.ts`, `rate-limit.ts`, `rate-limit-message.ts`, `session-revocation.ts`,
  `sign-in-unavailable-message.ts`, `timing-safe.ts`, `turnstile.ts`, `validators.ts`,
  `call-action.ts`, `audit.ts`, `wordle.ts`, `roster.ts`, `roster-rule.ts`,
  `src/types/next-auth.d.ts`. Also read in full to know the pins: `security-regressions.test.mjs`,
  `proxy-rule.test.mjs`, `auth-flow-rule.test.mjs`, `email-normalization-rule.test.mjs`, and the
  heads of `verify-outcome-rule.test.mjs`. Specs read first: `docs/SECURITY.md`,
  `docs/spec/demo.md`, `docs/TRAPS.md`.
- **Skimmed (why)**: `demo.test.mjs`, `gate-coverage.test.mjs`, `session-revocation.test.mjs`,
  `human-pass-rule.test.mjs`, `origin-rule.test.mjs`, `password-rule.test.mjs`,
  `roster-rule.test.mjs`, `call-action.test.mjs` - lib-tests owns them; I read them only far
  enough to know exactly what each pins (recorded per finding).
- **Not read**: nothing in the territory.
- **Uncommitted edits seen**: none. The charter warned of another session's WIP in
  `next.config.ts`, `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs` and a new `(main)/forbidden.tsx`; by the time
  this audit ran, `git status --short src/` was clean (that work is committed as `c74d99f` and
  neighbours). The `turnstile.ts` TEMP repro diff the charter mentioned is also gone -
  `git diff HEAD -- src/lib/turnstile.ts` is empty. I judged HEAD throughout.

## Summary

This territory is in unusually good shape for its sensitivity: the lib layer (31 files, 3,090
lines) is dense, heavily commented with reasons rather than narration, and pinned by ~1,800
lines of rule tests. I found essentially **no dead subsystems and no security shortcuts to
propose** - the wins here are almost all *dedupe*. The one big structural item is the pair
`login-client.tsx` (654) / `signup-client.tsx` (433): they share ~190 lines of verbatim
mascot-flight machinery each (jscpd's single biggest clone in the repo at 136 lines), plus a
third, drifted copy of the same fly-in inside `auth-panel.tsx` - an extraction the
`auth-panel.tsx` header comment explicitly anticipates and does not forbid. Beyond that: the
shared `PasswordField` that was "extracted so the reset page cannot drift from what /login and
/signup draw" is not actually used by /login or /signup; `validators.ts` carries a verbatim
24-line clone of its links schema (with a real displayEmail drift already visible between the
two copies); and the five one-constant `*-message.ts` files can be one file without touching a
single test pin (no `.test.mjs` references any of the five paths - only two QA probe scripts
import two of them). Structural-vs-cheap split: roughly 10 structural findings (~440 lines) and
5 cheap ones (~30 lines). What surprised me: how many knip "unused export" flags in this slice
are genuinely dead (7 of 9 checked), and that `proxy.ts`'s notorious 1.91 comment ratio survives
scrutiny almost entirely - it is the best-argued file in the repo, and its comments are what the
pins quote.

## Findings

### auth-edge-01 - Extract the triplicated hoopoe flight/arrival machinery into one hook
- **Where**: `src/app/(auth)/login/login-client.tsx:62-98,113-161,214-358` (~200 lines),
  `src/app/(auth)/signup/signup-client.tsx:53-117,154-284` (~190 lines),
  `src/components/auth/auth-panel.tsx:50-112` (a third, simplified copy of the mobile fly-in,
  ~45 lines)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd's largest clone in the repo: `login-client.tsx [223:3-358:21]` vs
  `signup-client.tsx [163:3-284:21]` (136 lines, 538 tokens), plus `[70:68-98:42]` vs
  `[56:69-84:42]` (29 lines) and `[10:61-18:41]` vs `[10:59-18:41]`. Reading both files
  confirms the machinery is line-for-line identical including its long comment blocks:
  `arrivedViaFlight` sessionStorage init (13 lines), `mobileFlyIn` matchMedia init (23),
  `preFlightVeil` + `useLayoutEffect` (12), `hoopoeShown` (12), `reportPerchRect` useCallback
  with the DOMMatrix un-shift (27), the ResizeObserver perch-watch effect (45 in login, 16 in
  signup which cross-references login's comment - they have ALREADY drifted in commentary),
  the flight-handoff effect (34), and the mobile fly-in effect (36). The only differences are
  the flight key (`"login"` vs `"signup"`), the hoopoe size (102 vs 96), and each page's
  `runIntro`. `auth-panel.tsx:50-112` is a THIRD copy of the mobile-fly-in half, slightly
  simplified (no `arrivedViaFlight` branch). The `auth-panel.tsx` header (lines 15-31)
  defends /login and /signup keeping their own *shell*, "because they additionally run the
  perch-reporting and handoff machinery from mascot-flight.ts, which is most of their length" -
  it defends the pages not using AuthPanel; it does not defend the machinery being written
  twice.
- **What to do**: create `src/components/mascot/use-flight-arrival.ts` (client hook) taking
  `{ flightKey: "login" | "signup" | null, runIntro(api), }` and returning
  `{ hoopoeBoxRef, entranceRef, hoopoeShown, preFlightVeil, onHoopoeReady, reportPerchRect }`.
  Move the four effects, three state initialisers and the `reportPerchRect` callback there
  verbatim, keeping the comments once. Replace the blocks in both clients with the hook call
  (~15 lines each). Then have `auth-panel.tsx` use the same hook with `flightKey: null` (which
  disables the perch/handoff half) so its own fly-in copy goes too. No behaviour change: this
  is a mechanical move of identical code to one home. Do NOT touch `runIntro` bodies (they are
  page-specific and owner-tuned) or any flight constants (6000ms fallback vs the 5800ms
  failsafe, the two-rAF veil lift - all argued in comments that move with the code).
- **Saving**: ~230 lines net (~390 duplicated lines and their comments become one ~170-line
  hook + 3 call sites), and one home for a subsystem that currently must be fixed in three
  places (the perch-watch comments show the copies already diverging).
- **Risk & gate**: medium (this is the owner's most-polished animation). Gates:
  `npm run check`; `npm run visual` (login + signup are baselined routes);
  `node scripts/qa/hoopoe-landing-check.mjs` (exists precisely to pin the fly-in's first
  visible frame); one manual run of the landing -> Sign in flight and the landing -> Join
  flight at desktop, and a 390px load of both pages for the mobile fly-in. No `*-rule.test.mjs`
  pins any of these lines (auth-flow-rule C-034 pins the three EMAIL clients, not these two).
- **Confidence**: high that the extraction is safe and worthwhile; the one thing that would
  change my mind is a deliberate intent for the two pages' choreography to diverge in future -
  nothing in the comments or specs suggests it, and three copies is the wrong way to hold that
  option anyway.
- **Notes**: keep the hook OUT of `components/auth/` - it belongs with the flight bus in
  `components/mascot/` beside `mascot-flight.ts`, whose header comment already names the three
  numbers (5800/6000/cruise) the hook's comments cross-reference. `scripts/qa/protocol-audit.mjs`
  greps component files; adding a new file is fine (nothing registers components), but run
  `npm run check` to let the lab-registry and protocol audits confirm. Related: auth-edge-02
  (the shell JSX half of the same duplication).

### auth-edge-02 - The auth photo panel is written three times; extract the one JSX block
- **Where**: `src/app/(auth)/login/login-client.tsx:446-472` and the container/back-link at
  `435-488`; `src/app/(auth)/signup/signup-client.tsx:300-337`;
  `src/components/auth/auth-panel.tsx:118-156`
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: `login-client [431:3-463:9]` vs `signup-client [286:3-317:9]` (33
  lines) and `[464:55-491:28]` vs `[316:15-340:28]` (28 lines). The fixed 58.3333% panel, the
  100vw right-aligned `Image` with `HERO_IMAGE_SRC`/`HERO_IMAGE_BLUR`, the gradient overlay,
  and the Wordmark `Link` with the same drop-shadow filter are byte-identical in all three
  files; the geometry comment ("full 100vw object-cover render... so the handoff has no jump")
  is repeated three times.
- **What to do**: add `AuthPhotoPanel` (a ~35-line presentational component, no state) to
  `auth-panel.tsx` and export it; replace the three inline copies. Optionally also share the
  Back-link + outer `min-h-screen lg:pl-[58.3333%]` scaffold, but the motion.div entrance
  differs (login/signup carry `entranceRef` + `onAnimationComplete={reportPerchRect}` +
  signup's per-step `my-auto`/`mt-[8vh]` anchor), so share only the static photo half - that
  keeps the auth-panel header's "they keep their own geometry" decision intact where it
  actually bites.
- **Saving**: ~55 lines net (3 x ~30 -> 1 x 35), and the photo crop can no longer drift
  between the five auth pages, which is the exact drift the comments warn about.
- **Risk & gate**: low. `npm run visual` (both routes baselined, plus forgot/reset/verify via
  crawl); pixel-identical output expected. No test pins these lines.
- **Confidence**: high. Changes nothing at runtime; it is the same JSX with one home.
- **Notes**: deliberately smaller than "make login/signup use AuthPanel" - that larger merge
  is blocked by the owner-defended split in auth-panel.tsx:15-31 and I am not proposing it.

### auth-edge-03 - /login and /signup hand-roll the password reveal that PasswordField exists to own
- **Where**: `src/app/(auth)/login/login-client.tsx:558-585` (FloatField + Eye/EyeOff trailing
  button), `src/components/auth/signup-form.tsx:616-644` (same), vs the shared
  `src/components/auth/password-field.tsx` (80 lines)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `password-field.tsx:12-13` states its own purpose: "Extracted so the reset
  page cannot drift from what /login and /signup draw." Neither /login nor /signup uses it -
  both keep an inline copy of the exact FloatField + reveal-toggle it wraps. jscpd flags the
  toggle button clone: `login-client [610:15-619:18]` vs `signup-form [658:9-667:12]`. The
  component is currently imported only by `reset-client.tsx`, so today the shared primitive is
  the one with a single consumer while the two "canonical" pages carry copies.
- **What to do**: extend `PasswordField` with the three props the pages need - `name?: string`
  (signup reads FormData), `id?: string`, `autoComplete` (already a prop; login passes
  `"current-password"`), and keep `onChange(value)` (both pages' `hoopoe.gaze()` call moves
  into that callback, see auth-edge-13's `gazeFor`). Then replace the two inline blocks.
  Login's "Forgot it?" link block stays where it is (it is outside the field). signup-form's
  password `motion.div` wrapper stays; only its child changes.
- **Saving**: ~45 lines, and one reveal-toggle to restyle instead of three.
- **Risk & gate**: low-medium. `npm run visual` on /login + /signup, both viewports; the
  e2e sign-in flow (`npm run test:e2e`) exercises the login field. No rule test pins these
  lines. Watch one detail: PasswordField generates its `id` via `useId()` - login currently
  uses `id="password"`; pass the explicit id through so any label/autofill behaviour is
  unchanged.
- **Confidence**: high. The component's docstring says this was always the intent.
- **Notes**: `minLength`/`required` defaults already match. The hoopoe gaze divisors differ
  (16 in both password fields - identical), so no tuning is lost.

### auth-edge-04 - Five one-constant message files can be one gate-messages.ts; no pin blocks it
- **Where**: `src/lib/rate-limit-message.ts` (8 lines), `src/lib/member-gate-message.ts` (14),
  `src/lib/email-gate-message.ts` (17), `src/lib/sign-in-unavailable-message.ts` (18),
  `src/lib/bot-check-message.ts` (36)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: 93 lines across five files exporting seven string constants, each file
  carrying a near-identical "its own dependency-free file for the same reason as X" paragraph.
  The load-bearing property is *dependency-freedom* (client components must import the
  sentinels without dragging `auth()`/NextAuth/Prisma into the bundle; `authorize()` can only
  pass CODES so the login form maps them back to these exact sentences) - that property
  belongs to the FILE being import-free, not to there being five of them. Verified importers:
  7 src files (`login-client`, `forgot-client`, `signup-form`, `actions.ts`, `email-actions`,
  `verification-actions`, `verify-email-dialog`, plus `rate-limit.ts`, `member-gate.ts`,
  `email-verification.ts`). Verified pins: NO `.test.mjs` anywhere references any of the five
  paths or constants by filename (checked `src/lib/*.test.mjs`, `src/components/**/*.test.mjs`,
  `e2e/`); the only non-src references are `scripts/qa/phase4-probe.mjs:45` (imports
  `RATE_LIMITED` by relative path) and `scripts/qa/phase3-probe.mjs:29-30` (`EMAIL_UNVERIFIED`,
  `MEMBER_UNVERIFIED`).
- **What to do**: create `src/lib/gate-messages.ts` with zero imports, one header comment
  stating the dependency-free contract and the matched-exactly rule ONCE, and move all seven
  constants (`RATE_LIMITED`, `MEMBER_UNVERIFIED`, `EMAIL_UNVERIFIED`, `SIGN_IN_UNAVAILABLE`,
  `BOT_CHECK_FAILED`, `TICK_HUMAN_BOX`, `BOT_CHECK_BLOCKED`) keeping each constant's own
  "why this sentence" comment. Update the ~10 src imports and the two probe scripts' relative
  imports. Delete the five files. The strings themselves must not change by one character
  (the dialogs match them exactly; the probes assert the UI shows exactly them).
- **Saving**: ~30 lines and 4 files; more usefully, one place where the "server returns it,
  client matches on it" contract is written down instead of five.
- **Risk & gate**: low. `npm run check` (typecheck catches any missed import);
  `node scripts/qa/phase3-probe.mjs` and `phase4-probe.mjs` against a dev server if run.
- **Confidence**: high. The one thing that would change my mind: if the owner prefers the
  one-file-per-sentinel convention as a discoverability rule - but `email-gate-message` vs
  `member-gate-message` already shows the convention costs a whole file per new gate.
- **Notes**: keep the merged file's name out of `email-verification.ts`/`member-gate.ts`
  re-export chains - see auth-edge-09, those re-exports are dead anyway.

### auth-edge-05 - validators.ts: the links schema is a verbatim 20-line clone, and its displayEmail twin has already drifted
- **Where**: `src/lib/validators.ts:137-157` (profileSchema.links) vs `:190-209`
  (contactMethodsSchema.links); also `:119` vs `:179-181` (displayEmail)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `lib/validators.ts [133:41-156:13]` vs `[189:41-209:13]` (24 lines, 107
  tokens). The `z.array(z.object({ label, url: https-only + URL-parse refine })).max(10)`
  block is character-identical in both schemas. The file itself already demonstrates the fix:
  `phoneList()` (lines 37-47) exists precisely because "two schemas write the same column and
  had drifted (audit Low 84)". And the drift has in fact begun on the sibling field:
  profileSchema's `displayEmail` uses the shared `emailField()` (which trims, lowercases and
  caps at EMAIL_MAX=200) while contactMethodsSchema's uses a bare
  `z.email().max(200)` with no trim/lowercase - so an address typed with a trailing space or
  capitals saves through the contact editor un-normalised into the same column the profile
  editor normalises. That is exactly the B-020 class of bug the email-normalization sweep
  exists for (it only sweeps *lookups*, not display-column writes, so it does not catch this).
- **What to do**: (1) add a module-private `linksField()` beside `phoneList()` carrying the
  https-only comment once; use it in both schemas (the contact one adds nothing - both are
  `.max(10)`; profile's is `.optional()`, contact's is required, so `linksField().optional()`
  vs `linksField()`). (2) align contactMethodsSchema's `displayEmail` to build on
  `emailField()` (keeping `.nullable()` and the `z.literal("")` arm), so both write paths
  produce the canonical form.
- **Saving**: ~22 lines; closes a live normalisation drift on `displayEmail`.
- **Risk & gate**: low. `npm run check` (email-normalization-rule.test.mjs asserts
  `emailField(` appears in validators.ts - it still will; profile-editor-rule.test.mjs and
  post-caps.test.mjs read this file - neither pins the links block's spelling, but re-run the
  suite to be sure). Manual: save a contact-links row and a profile-links row once.
- **Confidence**: high on the clone; medium-high on the displayEmail change being wanted -
  it slightly changes accepted input (trims/lowercases), which I judge a fix, not a break.
- **Notes**: `reportSchema` two definitions down is dead - see auth-edge-09.

### auth-edge-06 - The dead LOGIN_TRANSITION_FLAG mechanism: set, read once, and thrown away
- **Where**: `src/app/(auth)/login/login-client.tsx:38-60,100-111` (~35 lines incl. comments),
  `src/components/landing/landing-hero.tsx:252` (the set), `src/components/landing/hero-photo.ts:36`
  (the export)
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `arrivedViaTransition` is initialised from the flag (lines 53-60) and then
  used by exactly one consumer: the cleanup effect (104-111) that removes the flag. The
  comment at 100-103 admits it: "the flag is otherwise unused now that the entrance below
  plays for every arrival, but this keeps it from lingering as stale state." So the landing
  page writes a sessionStorage key whose only reader exists to delete it. Repo-wide grep:
  three files, no other reader.
- **What to do**: delete the `arrivedViaTransition` state + effect from login-client, the
  `setItem` line in landing-hero.tsx:252, and the `LOGIN_TRANSITION_FLAG` export from
  hero-photo.ts. (The hero *transition* itself - the slide - is untouched; only the flag that
  no longer influences anything goes.) One sessionStorage key stops being written.
- **Saving**: ~35 lines across three files.
- **Risk & gate**: low. `npm run check`; one manual click of the landing "Sign in" slide to
  confirm the entrance is unchanged (it is - the entrance is unconditional, which is the very
  reason the flag is dead). `landing-hero.tsx` is outside my territory - flagging for the
  member-surfaces/landing reader to co-sign.
- **Confidence**: high. Would change my mind: any plan to re-differentiate hero-transition
  arrivals; git log shows none.
- **Notes**: the sibling FLIGHT_FLAG is live (drives `arrivedViaFlight`) - do not touch it.

### auth-edge-07 - Delete the two metadata-only layouts under (auth)
- **Where**: `src/app/(auth)/login/layout.tsx` (13 lines), `src/app/(auth)/signup/layout.tsx`
  (13 lines)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: each exports `metadata = { title }` and a passthrough `({children}) => children`.
  The other three auth pages already do this the light way: `forgot-password/page.tsx:4`,
  `reset-password/page.tsx:4` and `verify-email/page.tsx:5` each carry
  `export const metadata = { title: ... }` inline - both login/page.tsx and signup/page.tsx are
  server components (they read `turnstileSiteKey()` from env), so the same works there.
- **What to do**: move `title: "Sign in"` into `login/page.tsx`, `title: "Join"` into
  `signup/page.tsx`; delete both layout files. Note the TRAPS entry: deleting a route file can
  leave a stale `.next/types` validator - the fixer may need
  `mv .next/dev/types .next/dev/types-stale` if tsc complains about the removed layouts.
- **Saving**: 26 lines -> 2 lines; 2 files.
- **Risk & gate**: low. `npm run check`; open /login and /signup and read the tab titles.
- **Confidence**: high.

### auth-edge-08 - The conditional token claim is written twice; give auth-tokens.ts the helper
- **Where**: `src/components/auth/email-actions.ts:181-197` (confirmEmailToken) and
  `:379-394` (resetPassword)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `[185:23-198:34]` vs `[383:22-395:34]` (14 lines, 51 tokens). Both
  transactions repeat `tx.authToken.updateMany({ where: { tokenHash: hashToken(token), kind,
  usedAt: null, expiresAt: { gt: new Date() }, user: { email: peek.email } }, data: { usedAt:
  new Date() } })`, each under its own copy of the same two-paragraph explanation of why
  `readToken` cannot supply the burn (it writes through the shared client, not `tx`) and why
  the stale check must be repeated. The `hashToken` docblock in auth-tokens.ts:65-75 already
  documents this exact duplication as the reason `hashToken` is exported.
- **What to do**: add to `auth-tokens.ts`, beside `hashToken`:
  `export function claimToken(tx: Prisma.TransactionClient, raw: string, kind: TokenKind, sentToEmail: string)`
  returning the updateMany promise, carrying the why-not-readToken comment once. Replace both
  inline claims with `const claim = await claimToken(tx, token, "verify"|"reset", peek.email)`.
  The security property (claim exactly as strict as the peek: unused, unexpired, same kind,
  same address) then has one spelling.
- **Saving**: ~15 lines; more importantly, the twice-written stale-check can no longer be
  half-fixed - the pattern SECURITY.md's C-060 note calls "half-fixing one of a pair".
- **Risk & gate**: low. Pins checked: `auth-flow-rule.test.mjs` C-035 needs
  `if (!applied)` and the post-commit awaits inside a try in `resetPassword` (unchanged), and
  `return { ok: true, email: peek.email };` (unchanged); `verify-outcome-rule.test.mjs`
  reads decommented `email-actions.ts` for the used-token/B-021 shapes (the claim's *call*
  remains in the transaction; verify the suite after). Gate: `npm run check`.
- **Confidence**: high; medium only on whether the fixer keeps `hashToken`'s export note in
  sync (update that docblock to point at `claimToken`).

### auth-edge-09 - Dead exports: seven confirmed, one line each
- **Where**: `src/lib/auth.ts:380` (`signIn`, `signOut`); `src/lib/validators.ts:283-286`
  (`reportSchema`); `src/lib/email-verification.ts:29` (re-export `EMAIL_UNVERIFIED` + its
  4-line comment) and `:31` (`VerifiedViewer` interface export keyword);
  `src/lib/member-gate.ts:30` (re-export `MEMBER_UNVERIFIED`); `src/lib/roster.ts:33`
  (`tryRosterAutoVerify` export keyword); `src/lib/email-address.ts:32` (`EMAIL_MAX` export
  keyword)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: each verified by repo-wide grep, not knip alone:
  - `signIn`/`signOut` from `@/lib/auth`: zero importers - every client uses
    `next-auth/react`'s versions (`login-client:5`, `reset-client:5`, `signup-form:4`,
    `sidebar:5`, `letterhead-profile:104`); only `handlers` and `auth` are consumed.
  - `reportSchema`: zero importers; `report-action.ts` does its own validation (its caps are
    pinned by security-regressions C-013 against the *dialog*, not against this schema).
  - the two sentinel re-exports: every importer of `EMAIL_UNVERIFIED`/`MEMBER_UNVERIFIED`
    reaches the message files directly (verified list above at auth-edge-04); the re-export
    lines and their "Re-exported here so server callers can reach it" comments serve nobody.
  - `tryRosterAutoVerify`: called only by `tryRosterAutoVerifyQuietly` in the same file; all
    five external callers use the Quietly wrapper (admin people actions, profile-actions,
    email-actions, verification-actions).
  - `EMAIL_MAX`: used only inside `emailField()` in the same file.
- **What to do**: `export const { handlers, signIn, signOut }` -> `export const { handlers }`;
  delete the `reportSchema` block; delete the two re-export lines (+comments); drop the
  `export` keyword from `VerifiedViewer`, `tryRosterAutoVerify`, `EMAIL_MAX`. Also, while in
  the area: `email-actions.ts:7` imports `maskEmail` from `@/lib/email` (a re-export at
  `email.ts:254`) - point it at `@/lib/mask-email` directly like every other consumer;
  whether `email.ts:254` can then drop its re-export belongs to lib-core.
- **Saving**: ~25 lines; knip noise drops by 7 entries.
- **Risk & gate**: low. `npm run check`. Pins: `security-regressions.test.mjs` C1-a decommments
  auth.ts and asserts absence of `ADMIN_EMAIL`/role literals - untouched; `admin-rule.test.mjs`
  asserts `tryRosterAutoVerifyQuietly(` is *called* - untouched. NOTE: `stripRosterInitials`
  (`roster-rule.ts:34`) is also knip-flagged but is NOT dead - `scripts/dev/import-roster.mjs:39`
  imports it; leave it (recorded under Not-findings).
- **Confidence**: high on all seven (each grep-confirmed with comment-stripping not needed -
  the symbols are plain identifiers).

### auth-edge-10 - `signin.success` / `signin.fail` are audit actions nothing writes
- **Where**: `src/lib/audit.ts:24-25` (the union members), `:10-11` (the doc line claiming
  "Every accountability event goes through here: sign-ins, ...")
- **Phase**: placeholder
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: repo-wide grep (excluding `src/generated`): zero writers of either string.
  Sign-ins are recorded via `recordLoginAttempt` into `LoginAttempt` (auth.ts calls it in all
  seven branches), not via `writeAudit`. The union members date from Phase 7 (`0fdaa64`); the
  attempt log superseded them. The audit.ts header even documents the same pattern for
  `account.delete`: "nothing writes it since Phase 8, but old rows still carry it."
- **What to do**: remove the two union members and correct the header's "sign-ins" claim to
  point at `LoginAttempt`/`recordLoginAttempt`, OR (if old AuditLog rows carry these strings)
  keep them under an "historical, no writer" comment exactly like `account.delete`'s. Either
  way the doc line stops claiming sign-ins flow through here, because a future session acting
  on that claim would double-log.
- **Saving**: ~4 lines; accuracy of the accountability doc.
- **Risk & gate**: low. `npm run check`. /admin/audit renders action strings from rows, not
  from this type, so display of any historical rows is unaffected.
- **Confidence**: high on "nothing writes them"; medium on whether any 2026-08-20-era rows
  exist in the table (cannot check the DB read-only from here) - which is why the
  `account.delete`-style comment is the safe variant.

### auth-edge-11 - dev-login imports from a package that is not a dependency
- **Where**: `src/app/api/dev-login/route.ts:38` - `import { encode } from "@auth/core/jwt"`
- **Phase**: library
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip: `@auth/core/jwt  src/app/api/dev-login/route.ts:38:24` under "unlisted
  dependencies". `package.json` lists only `next-auth: 5.0.0-beta.32` (pinned exact);
  `@auth/core` arrives transitively. Verified the fix is one line:
  `node_modules/next-auth/jwt.d.ts:8` is `export * from "@auth/core/jwt"` and the runtime
  `./jwt` export map points at `jwt.js` doing the same - so `next-auth/jwt` provides the
  identical `encode`. `src/types/next-auth.d.ts` already augments `next-auth/jwt`, proving the
  path resolves in this tsconfig.
- **What to do**: change the import to `from "next-auth/jwt"`. Nothing else moves.
- **Saving**: 0 lines; removes the one import that breaks if npm's hoisting of a transitive
  dep changes shape under the pinned beta.
- **Risk & gate**: low. `npm run check`; the C1-b pins in security-regressions.test.mjs grep
  dev-login for `NODE_ENV`/`DEV_LOGIN_SECRET`/`timingSafeEqual`/no-role-literal - none touch
  the import. `npm run screenshot:auth <any-route>` proves the minted cookie still verifies.
- **Confidence**: high.

### auth-edge-12 - requireVerifiedMember re-implements requireVerifiedEmail instead of building on it
- **Where**: `src/lib/member-gate.ts:41-63` vs `src/lib/email-verification.ts:49-68`
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd `lib/email-verification.ts [49:43-68:83]` vs `lib/member-gate.ts
  [43:44-59:83]` (20 lines, 107 tokens): the session fetch, the viewer projection
  ({id,name,email,role}), the IS_DEMO short-circuit with its own copy of the same
  justification comment, and the emailConfirmed check are duplicated; member-gate adds one
  line (`verifyState !== "verified"`). The trust model itself says Stage 2 = Stage 1 + one
  more fact (member-gate's own header: "Stage 1 is requireVerifiedEmail... This file is
  Stage 2").
- **What to do**: implement `requireVerifiedMember` as: call `requireVerifiedEmail()`; if not
  ok, return it; if `IS_DEMO`, return it (the email gate already passed the demo through);
  otherwise `const session = await auth()` (free - `auth` is `cache()`d per request, one DB
  read total) and add the single `verifyState` check returning `MEMBER_UNVERIFIED`. Keep both
  files (the two headers carry different owner decisions worth their homes) - only the body
  dedupes.
- **Saving**: ~14 lines; the demo exemption and the viewer projection get one spelling.
- **Risk & gate**: low-medium (this IS the write gate). Pins: `gate-coverage.test.mjs` greps
  actions for `requireVerifiedMember|requireVerifiedEmail` *call sites* - unchanged;
  `demo.test.mjs` pins the demo write-policy in demo.ts/prisma.ts, not these gates (grep
  confirmed no reference). Gate: `npm run check`, plus `npx tsx scripts/demo/verify-guard.mts`
  if the fixer wants the wiring proof (owner-run, DB-touching - note it, don't run it in
  audit).
- **Confidence**: high on equivalence: for every input the composed version returns the same
  {ok/error} - verified by case analysis (no session / demo / unconfirmed / unverified /
  verified). The thing that would change my mind: if a future Stage-2 rule must diverge from
  Stage 1's demo posture - the composition makes that harder to express, which is the point.

### auth-edge-13 - Shared constants for the two numbers the auth forms repeat: MIN_PASSWORD and the gaze clamp
- **Where**: MIN_PASSWORD=8 spelled independently at `email-actions.ts:32`,
  `reset-client.tsx:58`, plus literal 8s at `actions.ts:36`, `signup-form.tsx:369`,
  `validators.ts:64`, `login-client.tsx:571`, `password-field.tsx:32`. The
  `Math.max(-1, Math.min(1, (len/N)*2-1))` gaze clamp at 7 sites across `login-client` (x2),
  `forgot-client`, `reset-client` (x2), `trivia-gate`, with `signup-form.tsx:29-30` already
  owning the `gazeFor` helper.
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep counts above. email-actions.ts:29-31's comment already worries about the
  drift: "Matches the signup rule... Raising it here alone would lock people out."
- **What to do**: export `MIN_PASSWORD = 8` from `password-rule.ts` (dependency-free, already
  the password policy's home, already directly imported by both files that hand-type the
  constant) and use it in email-actions, reset-client, actions.ts, signupSchema's `.min(8)`
  and the two `minLength` props. Move `gazeFor` from signup-form to
  `components/mascot/use-hoopoe.ts` (or hoopoe-kit) and import at the 7 sites.
- **Saving**: ~10 lines; the real value is that the password floor becomes one number.
- **Risk & gate**: low. `password-rule.test.mjs` imports password-rule.ts directly - adding an
  export cannot break it (node runs the file; no relative imports added). `npm run check`.
- **Confidence**: high.
- **Notes**: cheap class, stated plainly: this is drift-proofing, not line count.

### auth-edge-14 - auth-tokens.ts: two doc comments now contradict the code they describe
- **Where**: `src/lib/auth-tokens.ts:37-41` (a RATE_LIMIT doc stranded above BURNS_ON_MINT's
  doc, two declarations away from its subject) and `:97-104` (mintToken's docstring: "Every
  previously outstanding token of the same kind for this user is burned first" - false for
  `verify` since the B-021 fix; `BURNS_ON_MINT` and the inline comment at 121-127 carry the
  true rule)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: read of the file; `verify-outcome-rule.test.mjs` pins the *behaviour*
  (verify tokens not burned on remint) that this docstring denies. verify-email-banner.tsx:44
  records what a stale docstring in exactly this feature cost last time: "an invitation for a
  later session to 'restore'... and re-break" (audit C-037).
- **What to do**: move the 37-41 comment down to RATE_LIMIT; rewrite mintToken's docstring to
  say the burn is a reset-only property, pointing at BURNS_ON_MINT.
- **Saving**: 0 lines; prevents the C-037 failure mode on the token layer.
- **Risk & gate**: none beyond `npm run check` (comments only; the rule tests decomment before
  matching, so comment edits cannot trip them).
- **Confidence**: high.

### auth-edge-15 - signup-form's InfoTip duplicates the shared InfoTooltip primitive
- **Where**: `src/components/auth/signup-form.tsx:35-146` (useHoverCapable + InfoTip, ~112
  lines) vs `src/components/common/info-tooltip.tsx` (56 lines, one importer:
  `catchups/home/reminder-pref-control.tsx`)
- **Phase**: dedupe
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: two implementations of "a small circled-i that reveals a short note on
  hover/tap/focus". They are not identical: signup's InfoTip adds viewport clamping (the
  bubble never runs off a 390px screen), a `fit` width mode, `:focus-visible` gating, and
  opens *below* the trigger with its own motion; the common one is built on the shared
  Popover, opens *above*, and has none of those. Swapping either for the other changes
  on-screen behaviour on real surfaces (the signup batch explainer is the owner-reviewed one -
  "the i to explain batches goes behind the UI" was an owner note this component fixed).
- **What to do**: owner picks a canon. My recommendation: promote signup's InfoTip (the more
  capable one) to `components/common/`, give it the Popover-based one's `side` flexibility if
  needed, and retire `info-tooltip.tsx`, updating reminder-pref-control - then verify that
  one catchups surface visually. The reverse (adopting the Popover one in signup) would lose
  the viewport clamping that a mobile screenshot round added.
- **Saving**: ~55 lines net once unified; one (i) affordance for the design system.
- **Risk & gate**: medium - visible change on whichever surface switches. `npm run visual`
  + screenshots of the signup batch tip and the catchups reminder tip at both viewports.
- **Confidence**: medium. This is a design call, hence owner.

## Owner decisions

- **One (i)-tooltip for the product (auth-edge-15).** There are two different circled-i
  helpers: the one on the signup form (clamps to the screen, opens under the icon) and a
  simpler shared one used on the Catch-ups reminder setting (opens above, built on the shared
  popover). They look and behave slightly differently. I recommend keeping the signup one -
  it handles small phone screens better - and using it in both places, then checking the
  Catch-ups screen still looks right. Nothing is lost but a few dozen lines and a small
  inconsistency.
- **Nothing else in this territory needs an owner ruling.** I looked for features no spec
  defends (the brief's macro question): the trivia gate, the human pass, the Wordle gate, the
  batch-group auto-join and the roster auto-verify all trace to owner decisions recorded in
  comments or SECURITY.md within the last month. The Group model's continued existence
  (registerUser still creates "Batch of {year}" groups whose membership "nothing reads today",
  per actions.ts:185-192's own honest note) is the one borderline case - but that comment
  already records the reviewed decision to keep writing it with a witness on failure, so I am
  not re-litigating it; the feed/data reader who owns `batchScopeWhere` may want to weigh in.

## Not-findings

- **proxy.ts's 241 comment lines against 126 code (the charter's direct question).** I read
  every block. Almost all carry a reason, an audit ID, a date, or a measured fact: C-198
  (cookie strip), C-202 (API 401s), C-203 (robots/sitemap), B-022/C-117/C-200 (`next=`),
  C-111/C-136 (cron paths), M19 (/lab), M27/M34, H12, the Host-header verification note, the
  visit-cookie race history. Perhaps 15 lines narrate ("Check for NextAuth session cookie",
  "Public routes that don't require auth") - not worth a finding. Moreover the file's *shape*
  is pinned: `proxy-rule.test.mjs` parses the literal `const publicPaths = [` block, the
  matcher string, and the `x-search`/`x-pathname`/`next=` lines; `security-regressions.test.mjs`
  pins the ingest branch's position before `publicPaths`. Leave proxy.ts alone.
- **One canonical email path exists (charter floor question).** `normalizeEmail`/`emailField`
  in `email-address.ts`, enforced not by convention but by a sweeping positive pin:
  `email-normalization-rule.test.mjs` walks every `where: { ... email: X }` in src and traces
  X to the canonical form. The one soft spot found is a *display* column, recorded in
  auth-edge-05.
- **wordle.ts and the trivia gate are both live (charter floor question).** Trivia is the
  signup entry gate (`hasPassedTrivia` enforced server-side in registerUser; the client is
  trivia-gate.tsx). wordle.ts serves the /dark-mode gauntlet's word gate (owner feature,
  2026-07-31), imported by `(main)/dark-mode/page.tsx` and pinned by
  `unattended-rule.test.mjs:258`. Neither is a placeholder.
- **The API routes that are mine must stay routes (charter floor question).**
  `/api/auth/[...nextauth]` is NextAuth's handler contract (2 lines, cannot be an action);
  `/api/dev-login` is called by non-React tooling (curl, the MCP, the QA scripts) and mints a
  cookie - an action cannot serve those callers, and its shape is pinned by C1-b. The other
  ~12 routes under src/app/api belong to neighbouring lenses; the same test applies there
  (webhooks/crons/uploads stay; anything only a React client calls is a candidate).
- **rate-limit.ts is not one-caller plumbing (charter suspicion).** `rateLimit` has 20+ call
  sites across nine features; the `hasBudget`/`consume` split exists so successful sign-ins
  never spend budget (H6) - both halves have multiple callers (auth.ts + settings reauth).
  The per-limit argued-constant comments are the owner standard, not bloat.
- **The five message files' *existence rationale* is genuine** (dependency-free client/server
  sharing; `authorize()` can only emit codes). Only the five-way split is negotiable
  (auth-edge-04); the constants and their exact-match contract must survive verbatim.
- **login/signup not using AuthPanel is an owner-recorded decision** (`auth-panel.tsx:15-31`),
  and I have respected it: auth-edge-01/02 extract a hook and a leaf component; they do not
  force the pages onto the shell.
- **The two gate dialogs' matching 320px shape** (`verify-email-dialog` / `member-verify-dialog`)
  is deliberate sibling design ("deliberately the same shape", member-verify-dialog:17-24).
  Extracting a shared card would couple two surfaces whose copy is owner-tuned separately;
  the ~20 sharable lines are not worth it. Tolerated duplication, my judgement.
- **trivia-gate's raw input on FIELD_SHELL** looks like a FloatField re-implementation and is
  not: the comment at 180-187 argues why overriding ui/Input would be fragile (hairline,
  iOS zoom). Verified intentional.
- **`stripRosterInitials` is not dead** despite knip: `scripts/dev/import-roster.mjs:39-72`
  imports and uses it (knip's production mode doesn't see scripts). Leave exported.
- **FNV-1a inlined in proxy.ts** duplicates lib/avatar.ts and lib/wordle.ts, but proxy.ts's
  copy stays: the file deliberately imports nothing app-local (it cannot import demo.ts for
  the same reason), and 8 lines is cheaper than coupling the edge bundle to lib. The
  avatar/wordle pair is for lib-core (below).
- **auth.ts at 460 lines is not a rewrite candidate.** Every block is either pinned
  (C1-a, C-032, the B-020 lookup, the M18 try/catch) or carries the owner decision it
  implements (the deletion-cancel branch, the no-signIn-callback note, DUMMY_PASSWORD_HASH's
  timing equalisation). Comment ratio 0.83 is the owner standard working as intended.
- **`TURNSTILE_DEV_CHALLENGE` / `TURNSTILE_DEV_REAL`** read like dev-only flag debt and are
  not: both are documented operational switches (SECURITY.md's Turnstile note; the re-arm bug
  shipped precisely because the interactive path was invisible locally).

## For other lenses

- `src/lib/avatar.ts:140-149` and `src/lib/wordle.ts:37-46` both hand-write FNV-1a (jscpd
  pair); a shared `fnv1a()` in a pure lib file would serve both (proxy.ts keeps its own copy,
  see Not-findings). avatar.ts is lib-core's.
- `src/lib/email.ts:254` re-exports `maskEmail`; after auth-edge-09 retargets its one consumer,
  lib-core can delete the re-export line.
- `src/components/landing/landing-hero.tsx:252` + `hero-photo.ts:36`: the LOGIN_TRANSITION_FLAG
  halves outside my territory (auth-edge-06 names them; landing's reader should co-sign).
- `src/components/layout/logo-fact.tsx` and `src/components/common/segmented-pills.tsx` also
  hand-roll `role="tooltip"` surfaces - if auth-edge-15's canon is picked, the design lens may
  want to sweep these two toward it.
- `scripts/qa/_dev-login.mjs` exports `fetchSessionCookie`/`devLoginContext` that knip flags
  unused - scripts lens.
- `src/components/settings/actions.ts:324-328` is the only `hasBudget`+`consume` caller outside
  auth.ts (the reauth meter) - member-surfaces should know it exists before touching that file.
- The Group/batch-group question (see Owner decisions last paragraph) really belongs to whoever
  reads the feed/data model: `registerUser` writes GroupMember rows that, per its own comment,
  nothing reads today.

## Metrics

- Lines read: ~8,300 in-territory source (5,152 app/api/components + 3,090 lib + 63 types)
  plus ~1,100 lines of pinning tests and ~1,050 lines of spec.
- Comment-heaviest in territory (comment/code): proxy.ts 1.91 (241/126), auth-tokens.ts 1.16,
  rate-limit.ts 1.05, email-actions.ts 1.02, turnstile-widget.tsx 0.93, auth.ts 0.83 - all
  examined; all but ~20 lines carry reasons (see Not-findings).
- Biggest files: signup-form.tsx 718, login-client.tsx 654, email-actions.ts 468, auth.ts 460,
  signup-client.tsx 433, proxy.ts 388.
- jscpd clones inside the territory: 14; addressed by findings 01, 02, 03, 05, 08, 12; two
  tolerated with reasons (gate dialogs, forgot/reset motion wrappers - 6-line AnimatePresence
  scaffolds not worth an abstraction).
- Single-export-single-importer lib files (charter floor question, via depcruise Ca +
  grep confirmation): exactly 2 of the 31 - `sign-in-unavailable-message.ts` (Ca=1,
  login-client) and `wordle.ts` (Ca=1, dark-mode page). Both justified; the former folds into
  auth-edge-04 anyway.
- Estimated honest savings if all autonomous findings land: ~440 lines, 6 files; plus ~55
  lines pending the auth-edge-15 owner call.

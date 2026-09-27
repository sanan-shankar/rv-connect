# auth-onboarding-settings - refactor audit 3 report

Territory T07: everything a person touches before and around becoming a member, and the gates
behind it. Sign-in, sign-up, the entry question, the bot check (Turnstile), the human pass, email
confirmation, password reset, the onboarding wizard (`/welcome`), the settings actions (avatar,
places, account deletion, theme), the dark-mode gauntlet (`/dark-mode`), the NextAuth config and
the dev login, the data export route, the proxy, the API gate, the rate limiter, the login-attempt
recorder, the validators, and the account purge and retention sweep. This is the security surface,
so every proposal here only simplifies. None weakens a gate, and each names the pin it touches.
Date 2026-09-24, HEAD `70570bcd`. Files in territory: 65 (12,029 physical lines: 6,930 code,
4,331 comment, 768 blank). Read fully: 65 of 65, plus 14 adjacent files read fully or in the part
that mattered.

## Coverage
- Read fully: `src/components/auth/**` (14), `src/components/onboarding/**` (8),
  `src/components/settings/**` (7), `src/app/(auth)/**` (11), `src/app/(main)/welcome/**` (2),
  `src/app/(main)/dark-mode/**` (2), `src/app/api/auth/[...nextauth]/route.ts`,
  `src/app/api/dev-login/route.ts`, `src/app/api/account/export/route.ts`, `src/lib/auth.ts`,
  `auth-tokens.ts`, `auth-flow-rule.test.mjs`, `turnstile.ts`, `bot-check-detail.ts`,
  `bot-check-message.ts`, `human-pass-rule.ts`, `app-secret.ts`, `api-gate.ts`, `rate-limit.ts`,
  `login-attempt.ts`, `validators.ts`, `account-purge.ts`, `retention.ts`, `src/proxy.ts`,
  `src/types/next-auth.d.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`.
- Adjacent, read fully because a proposal depends on them: `src/lib/session-revocation.ts`,
  `human-pass.ts`, `rate-limit-message.ts`, `turnstile-origin-rule.ts`,
  `src/components/common/info-tooltip.tsx`, `src/components/auth/auth-first-frame.test.mjs`.
- Read in the part that mattered: `security-regressions.test.mjs` (C1 block, lines 1-60),
  `gate-coverage.test.mjs` (lines 1-150), `session-revocation.test.mjs` (the wiring tests),
  `proxy-rule.test.mjs`, `purge-rule.test.mjs`, `login-attempt-rule.test.mjs`,
  `verify-outcome-rule.test.mjs`, `unattended-rule.test.mjs`, `catchup-pictures.test.mjs`
  (the purge block), `demo.test.mjs` (the mirror test), `src/lib/demo.ts` (header and closed-path
  block), `src/lib/origin.ts` (header), `password-rule.ts`, `batch-year.ts`, `float-field.tsx`
  (the lazy tooltip block), `common/motion.tsx` (`FadeRise`), `collection-viewer-facts.ts`,
  `collection-data.ts:278-292`, `admin/people/actions.ts:505-547`,
  `scripts/qa/audit-status.mjs:296-345` (H21 and H22 probes), and the installed
  `node_modules/@auth/core/lib/actions/callback/index.js` plus Next 16's
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.
- Specs read: `CLAUDE.md`, `AGENTS.md`, `docs/SECURITY.md`, `docs/spec/demo.md`, `docs/TRAPS.md`
  (Database, Prisma, Next.js, Testing, Working here); audit 2's `auth-edge.md`, report rows and
  fix-prompt board, owner answers and E-phase ledger.
- Earlier reports grepped for this territory: `collection-media.md` (auth reads User twice),
  `catchups-lib.md` (-14 and -20 touch the purge), `bundle-build.md` (per-route numbers, B1/B6
  state, the `/dark-mode` note this report corrects), `fresh-code.md`, `tracked-weight.md`,
  `lab-catchups.md`.
- Skimmed (why): none.
- Not read (why): `src/components/mascot/**` (`use-flight-arrival.ts`, `hoopoe-warmup.tsx`, the
  rig) and `src/components/profile/letterhead-profile.tsx`, which my files call into. They belong
  to the mascot and directory-profile lenses, and I only needed their call sites. I did not open
  `.next/` (brief), so chunk contents are attributed by route diff, not by reading chunks.
- Uncommitted edits seen (someone else's WIP): none. `git status --short` over every territory path
  was empty at start. The tree held only the two untracked audit folders.

## Summary
This territory is heavily commented (0.62; `proxy.ts` 2.01), and nearly all of it is argued, so
the lines are not where the weight is. The weight is in five verified structural wins:
(1) the session token mints three claims nothing reads, plus `id` beside `sub`, and they feed a
false "the session is JWT-stale" belief that costs the Collection a second `User` read (-01);
(2) Next 16 runs `proxy.ts` on Node.js, so the mirrored demo route list and its mirror test can go,
re-opening an audit-1 "honesty check" on new evidence (-02);
(3) `/dark-mode` ships the 31.9 KB hoopoe rig for a bird that only appears at step 6 (-03);
(4) `/signup` ships its about 25-30 KB register form behind the trivia step (-04);
(5) the owner's audit-2 "one help-bubble machine" answer was never executed (-05).
Findings split 14 structural and 9 cheap. Surprises: five verified audit-2 rows never reached audit
2's plan (four are re-issued here), and the "three `User` session statements" lead is one caller
across three eras of its `select` (not-finding). B1 and B6 landed. E7b is still open but now smaller.

## Findings

### auth-onboarding-settings-01 - Stop minting the session claims nobody reads (`role`, `batchType`, `batchYear`, and `id` beside `sub`)
- **Where**: `src/lib/auth.ts:354-367` (`async jwt({ token, user })`: `token.id = user.id;`
  `token.role = user.role;` `token.batchType = user.batchType;` `token.batchYear = user.batchYear;`),
  `:296-310` (`authorize()` returns `role`, `batchType`, `batchYear` only to feed those claims),
  `:370-373` (`session.user.id = token.id as string` and `where: { id: token.id as string }`);
  `src/app/api/dev-login/route.ts:108-124` (`encode({ token: { name, email, sub, id, role,
  credentialVersion, batchType, batchYear } })`); `src/types/next-auth.d.ts:44-55`
  (`interface User`: `role?`, `credentialVersion?`, `accountType?`, `verifyState?`, `batchType?`,
  `batchYear?`, `photoUrl?`, `birdOverride?`) and `:58-66` (`interface JWT`: `id?`, `role?`,
  `credentialVersion?`, `batchType?`, `batchYear?`); `src/lib/member-gate.ts:29`
  (`export type { GateResult } from "./email-verification"`, the other half of audit-2
  `auth-edge-08`).
- **Phase**: dead
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The only reads of the token in the whole tree are `token.id` and
  `token.credentialVersion`, both inside the session callback (`grep -rn "token\.(role|batchType|batchYear|id|credentialVersion|sub)" src`:
  writes at `auth.ts:356-364`, reads at `:370`, `:373`, `:404`). Nothing decodes the cookie
  anywhere else. There is no `getToken`, `jose` or `decode(` in `src/`, `scripts/` or `e2e/`, and
  the proxy checks only that the cookie exists. The session callback re-reads `role`,
  `batchType` and `batchYear` from the row on every request (`auth.ts:374-393`,
  `:410-421`), so the token's copies are write-only. The installed Auth.js seeds every
  credentials token with `sub: user.id`
  (`node_modules/@auth/core/lib/actions/callback/index.js:247-252`), so `token.id` is a second
  spelling of `token.sub`. The `User` augmentation's `accountType`, `verifyState`, `photoUrl` and
  `birdOverride` are set by nothing. `authorize()` never returns them, and audit 2's
  `auth-edge-08` verified this (fix-prompt line 710) but no row ever shipped it: the four lines and
  the `GateResult` re-export are still there.
  **The cost is not the bytes; it is the belief.** `src/lib/collection-viewer-facts.ts:18-21`
  says the Collection reads the viewer "off the ROW, never off the session: a JWT claim is minted
  at sign-in", and `src/app/(main)/collection/collection-data.ts:285-286` repeats "a JWT claim can
  be an hour stale". Both are false here: `session.user.verifyState` and `batchYear` come from the
  row on every request. A reader who sees `token.batchYear = user.batchYear` in the jwt callback
  would reasonably believe the opposite. That belief now costs a second `User` read per Collection
  request (collection-media's "For other lenses" line). A 90-day token carrying a `role` that is
  never refreshed is also a trap: the first person who reads `token.role` for a quick admin check
  gets a demoted admin's old role back.
- **What to do**:
  1. `auth.ts` jwt callback: keep only `token.credentialVersion = user.credentialVersion ?? 0;`
     (and its comment) inside `if (user)`. Delete the `token.id`, `token.role`,
     `token.batchType` and `token.batchYear` lines.
  2. Session callback: `session.user.id = token.sub as string;` and
     `where: { id: token.sub as string }`. Tokens minted before the change carry both `id` and
     `sub`, so nobody is signed out.
  3. `authorize()`'s return: `{ id, name, email, credentialVersion }`. Drop `role`, `batchType`
     and `batchYear`. Auth.js needs `id`, `name` and `email` for its default token.
  4. `dev-login/route.ts`: drop `id`, `role`, `batchType` and `batchYear` from the `encode`
     payload. Keep `name`, `email`, `sub` and `credentialVersion`. The response body's
     `signedInAs.role` stays, because it is a diagnostic for the person running the script.
  5. `next-auth.d.ts`: `interface User { credentialVersion?: number }` and
     `interface JWT { credentialVersion?: number }`. `Session` is untouched.
  6. `member-gate.ts:29`: delete the `GateResult` re-export (its six importers take only
     `requireVerifiedMember` and `viewerMaySeeContacts`, re-verified by grep).
  7. `security-regressions.test.mjs:44-46`: rewrite the comment "Reading the row's role into the
     token (role: user.role) is the correct mirror of authorize()" to say that dev-login carries
     no role at all. The assertion (`!/role:\s*["']/`) stays and stays green.
- **Saving**: about 20 lines across four files; about 50 bytes of JSON (roughly 70 bytes of
  cookie after encryption and base64) off every request's `Cookie` header, static assets
  included; one dead type re-export; and the misreading that props up a second `User` read per
  Collection request (see For other lenses).
- **Risk & gate**: low. Pins: `security-regressions.test.mjs` C1-a (`auth.ts` has no
  `role: "admin"` literal) and C1-b (dev-login has no literal role) both stay green.
  `session-revocation.test.mjs` "the session callback still asks" and "the session read fetches
  every column the rule consults" are untouched, because the `select` and the
  `sessionRevoked(...)` shape do not change. `auth-flow-rule.test.mjs` C-032 (`maxAge:
  SESSION_MAX_AGE`, dev-login `MAX_AGE = SESSION_MAX_AGE`) is untouched. Proof: `npm run check`;
  sign in as Jerry Maguire through `/login` and through `scripts/qa/_dev-login.mjs`, and load
  `/feed`, `/admin` (as an admin) and `/profile/<id>`; then take an OLD cookie (minted before the
  change) and confirm it still resolves.
- **Confidence**: high on "never read" (the grep is exhaustive and Auth.js's own session default
  copies only `name`, `email` and `picture`, per `node_modules/@auth/core/lib/actions/session.js:38`).
  One thing would change my mind: a script outside `src/`, `scripts/` or `e2e/` decoding the
  cookie. None exists in this repo.
- **Notes**: I considered going further and returning a minimal token from the jwt callback
  (dropping Auth.js's own `name`, `email` and `picture` defaults too). Rejected: those are the
  library's contract (Auth.js builds `session.user` from them before our callback runs), and dropping
  them would buy about 40 bytes for behaviour the library owns. This finding extends audit-2 `auth-edge-08`, which kept `role?`, `batchType?` and
  `batchYear?` because "`jwt()` reads/copies them". It copies them, but nothing reads the copies.
  The Collection half (read `verifyState` and `batchYear` from the session, and put `photoTrusted`
  in the session select or keep one narrow read) belongs to collection-media, and I have written
  it up under For other lenses.

### auth-onboarding-settings-02 - The proxy runs on Node in Next 16: import the demo's closed list instead of mirroring it, and delete the mirror test
- **Where**: `src/proxy.ts:4` ("Import-free by design, so it is safe in the edge bundle"),
  `:13-26` (`const IS_DEMO = process.env.DEMO_MODE === "1";`), `:28-51` (the hand-copied
  `DEMO_CLOSED_PATHS` list with its comments, and at `:30-31` "this file cannot import it,
  because proxy is bundled for the edge runtime"); `src/lib/demo.ts:286-316` (the canonical
  list and its docblock "ENFORCEMENT LIVES IN src/proxy.ts, which cannot import this file: proxy
  is bundled for the edge runtime"); `src/lib/demo.test.mjs:220-236` (test "the closed-path list
  in proxy.ts matches the one in demo.ts"); `src/lib/proxy-rule.test.mjs:7-16` (header: "it is
  bundled for the edge runtime"); `src/instrumentation.ts:74-82` (`runtime === "nodejs" ||
  runtime === "edge"`, "The edge half is not hypothetical: src/proxy.ts runs there for every
  request"); `src/lib/origin.ts:11-14` (lib-core's file, same claim).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The installed Next docs
  (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:253-255`)
  say: "Proxy defaults to using the Node.js runtime. The `runtime` config option is not available
  in Proxy files. Setting the `runtime` config option in Proxy will throw an error." The version
  table at `:806` says "`v16.0.0` Middleware is deprecated and renamed to Proxy. Proxy defaults to
  the Node.js runtime". This repo is on `next@16.3.3` and uses `src/proxy.ts`. `grep -rn
  'runtime = "edge"' src` finds nothing, so no code in this app runs on edge at all.
  Independently, `src/lib/demo.ts` has no import statement today and never has: it was checked at
  its creation (`0ea31744`), before audit 1 (`1a71625e`) and at audit 2 (`72b5a1d`). Its only
  environment read is `process.env.DEMO_MODE`, the same one the proxy repeats. So "that module's
  own dependencies" (origin.ts) were never an obstacle either. The only thing that reads
  `demo.ts`'s `DEMO_CLOSED_PATHS` at runtime is nothing: its sole consumer is the mirror test.
  Audit 1 kept that export as "the honesty check for proxy's mirror copy" (audit-1 report §5,
  line 494), and audit 2 re-affirmed it. That was right on the premise both audits had, and the
  premise is what is new here.
- **What to do**:
  1. `proxy.ts`: `import { IS_DEMO, DEMO_CLOSED_PATHS } from "@/lib/demo";`. Delete the local
     `IS_DEMO` line and the 24-line local list with its comments (the reasons for each closed
     path already live verbatim beside the canonical list in `demo.ts`). Keep the 11-line block
     comment's two "jobs" paragraph (why demo returns before the cookie check). Change
     `isUnder(pathname: string, prefixes: string[])` to take `readonly string[]`.
  2. `demo.ts:286-296`: rewrite the docblock's last paragraph to say that enforcement is in
     `src/proxy.ts`, which imports this list.
  3. `demo.test.mjs:220-236`: delete the mirror test. If a pin is wanted, write a three-line test
     instead: `proxy.ts` must import `DEMO_CLOSED_PATHS` from `@/lib/demo` and must not declare
     `const DEMO_CLOSED_PATHS` itself. That pins the property (one list), not the instance.
  4. Correct the claim where it lives: the `proxy-rule.test.mjs` header ("cannot be imported
     here" stays true because node:test cannot load `next/server`; drop "bundled for the edge
     runtime"); `instrumentation.ts:75-77` (either drop `|| runtime === "edge"` or keep it as
     honest future-proofing, but the comment must stop saying the proxy runs there);
     `origin.ts:11-14` (lib-core-config, see For other lenses); and
     `.claude/agents/write-path-reviewer.md:45` (tooling lens).
- **Saving**: about 25 lines out of `proxy.ts`, about 15 out of `demo.test.mjs`, and 7 wrong
  sentences in 6 files. There are now 2 copies of a security list kept equal by a test; there
  will be 1. knip's "unused export `DEMO_CLOSED_PATHS`" disappears.
- **Risk & gate**: low. Same data, one source. It touches the demo's security suite, so the pins
  are named. `demo.test.mjs` (the mirror test is removed or re-pointed, and every
  `demoWriteAllowed` attack test is untouched). `proxy-rule.test.mjs` scrapes `publicPaths` with
  `/const publicPaths = \[([\s\S]*?)\n {2}\];/`, which is untouched. `security-regressions.test.mjs`
  does not read `proxy.ts`'s demo block. Gates: `npm run check`. After a production build, confirm
  the proxy function is Node (for example `.next/server/functions-config-manifest.json` or the
  build log's "ƒ Proxy (Middleware)" entry with no edge marker). A demo smoke on a local
  `DEMO_MODE=1 next dev` using only GETs (`curl -sI localhost:3000/admin` should answer a
  redirect to `/feed`; `/api/upload/x` should answer 403 JSON). GETs are harmless even though
  that dev server points at the real database: the proxy answers before any route runs.
- **Confidence**: high on the docs and the import history. Medium-high on the deployed runtime:
  the docs are unambiguous, but the fixer should read the manifest once, because it is the one
  thing that would change my mind.
- **Notes**: This is the one place I re-open a settled item, and the new evidence is (a) Next 16
  changed the proxy's runtime and (b) `demo.ts` never had the dependencies the premise assumed.
  `DEMO_CLOSED_APIS` stays in the proxy (it has no second copy). I rejected moving `publicPaths`
  to module scope in the same pass: `proxy-rule.test.mjs`'s regex expects the closing `];` at
  exactly two spaces of indent, so hoisting it would silently make that file vacuous (see -20).

### auth-onboarding-settings-03 - `/dark-mode` loads the hoopoe rig for a bird that appears only at step 6: make the sleep trial and the nightfall scene lazy
- **Where**: `src/components/settings/dark-gauntlet.tsx:26-34` (`animate`, `useMotionValue`,
  `useMotionValueEvent`, `useTransform`, used only by `SleepTrial`), `:38-39` (`import { Hoopoe }`,
  `import { useHoopoe }`, used only by `SleepTrial`), `:42` (`import { Nightfall }`), `:252-259`
  (`{step === "trial" && <SleepTrial ... />}`), `:299-307` (`{nightfall && <Nightfall ... />}`),
  `:385-602` (`SleepTrial`, its constants and its portal); `src/components/settings/nightfall.tsx`
  (160 lines).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `/dark-mode` has four first-load chunks that `/about` (a member route at the
  floor) does not (`raw/route-bundle-stats.json`): `1gnprwog56le7.js` 31,884 B / 8,633 gz (the
  hoopoe rig; bundle-build confirmed its path literals), `38sqwbznafna8.js` 28,203 / 10,402 (the
  field/sequence chunk, including the imperative `animate()` sequence API),
  `0et6nzrgew7fc.js` 33,714 / 12,706 (the motion engine, needed at rest for the step
  transitions), and `3n_1u8d5juvga.js` 14,852 / 5,077 (the gauntlet's own code). That is
  108.7 KB in total. In the code, the intro step and questions 1 to 5 render no `<Hoopoe>`; the
  only `<Hoopoe>` and the only `useHoopoe()` in the file are inside `SleepTrial` (`:417`, `:544`),
  which mounts at step 6 after five questions and a Wordle. `Nightfall` mounts only after the
  trial. bundle-build's note says "`/dark-mode` at 1,085 KB is by design: the gauntlet ... draws
  the bird and runs the sequence API at rest" and bundle-build-02 says "(`/dark-mode` keeps it: the
  gauntlet is the bird)". That describes the gauntlet before its 2026-09-21 rebuild (the trial used
  to be a press-and-hold). In today's code the bird is not at rest.
- **What to do**: Move `SleepTrial`, its four constants (`STILL_MS`, `SETTLE_MS`, `STIR_PX`,
  `VEIL`) and its imports into `src/components/settings/sleep-trial.tsx`, exporting
  `SleepTrial`. In `dark-gauntlet.tsx`:
  `const SleepTrial = dynamic(() => import("./sleep-trial").then((m) => m.SleepTrial), { ssr: false });`
  and `const Nightfall = dynamic(() => import("./nightfall").then((m) => m.Nightfall), { ssr: false });`.
  `ssr: false` is right because `step` starts at `"intro"` on the server and neither can render
  there. Warm both the way `onboarding-flow.tsx:65-69` does (`PRELOAD`): fire
  `void import("./sleep-trial"); void import("./nightfall");` from an effect when `step` becomes
  `"word"`, or on mount after idle, so the trial never waits on the network. `StepKicker` and
  `BailLink` are used by both halves; either export them from the new file or keep them in the
  gauntlet and pass them in. Exporting from `sleep-trial.tsx` and importing back is the simpler
  shape.
- **Saving**: about 40-60 KB raw (about 12-18 KB gz) off `/dark-mode`'s first load (the rig
  31.9 KB, the part of the sequence chunk only the trial uses, and the roughly 8-10 KB of
  `SleepTrial` and `Nightfall` code). That moves `/dark-mode` from the fourth-heaviest member
  route (1,085 KB) toward the pack. The split within `38sqwbznafna8.js` is an estimate; measure it.
- **Risk & gate**: low-medium. The ceremony's timing is the owner's, so the preload must land
  before step 6. Gates: `npm run check`; walk the whole gauntlet as Jerry Maguire at 1440 and 390
  (all five questions, the Wordle with a wrong then right answer, the trial including a stir, the
  switch, nightfall, both regrets choices). Measure at the browser on `next start`: resource
  entries on a cold `/dark-mode` should not list the rig chunk until the Wordle step. No rule test
  names these components (the `unattended-rule` C-116 test reads `wordle.ts`, not the gauntlet).
- **Confidence**: high that the bird is not at rest (it is in the code). Medium on the exact bytes.
- **Notes**: This is the same "eager for a later surface" shape as bundle-build-02 (the moment
  wrappers) and the campaign's B6 (the welcome steps). `LightsOn` (the already-dark case) never
  needed any of it. Related: -23 (the identity `useTransform` inside `SleepTrial`).

### auth-onboarding-settings-04 - `/signup` loads the whole register form behind a question every visitor answers first: lazy-load it with a preload at the gate
- **Where**: `src/app/(auth)/signup/signup-client.tsx:9` (`import { SignupForm } from
  "@/components/auth/signup-form"`), `:189-201` (rendered only when `step === "register"`);
  `src/components/auth/signup-form.tsx` (701 lines, with `SegmentedPills`, `YearInput`,
  `PasswordField`, `TurnstileWidget`, the private `InfoTip` and `PhoneField`);
  `src/components/auth/trivia-gate.tsx:131` (`setTimeout(onPass, 1150)`, the only way to reach the
  register step).
- **Phase**: architecture
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `step` starts at `"trivia"` (`signup-client.tsx:29`) and becomes `"register"` only
  via `TriviaGate`'s `onPass`, 1,150 ms after a correct answer. Every visitor to `/signup` pays
  for the form before they can see it. `/signup`'s first load is 798,723 B raw against `/login`'s
  783,855. It has three chunks `/login` does not, `0h_gunnmidigw.js` 21,186 B,
  `16xpi449s5dg7.js` 28,603 B and `1oz-8cd731e1p.js` 374 B (50.2 KB), which hold `signup-client`,
  `trivia-gate` and `signup-form` with its signup-only dependencies. `signup-client` plus
  `trivia-gate` together are about the size of `login-client`, whose own two private chunks are
  35 KB, so roughly 25-30 KB of the 50 is the form. The landing's stand-in
  (`auth-first-frame.tsx`) draws only the trivia step, so the register step is outside the
  flight hand-off.
- **What to do**: In `signup-client.tsx`:
  `const SignupForm = dynamic(() => import("@/components/auth/signup-form").then((m) => m.SignupForm), { ssr: false });`.
  `ssr: false` is right because the register step never renders on the server. In
  `TriviaGate`, or in `signup-client` next to `useFlightArrival`, warm it:
  `useEffect(() => { void import("@/components/auth/signup-form"); }, [])`. A person needs seconds
  to answer the question, so the chunk is always there before `onPass` fires. Keep
  `TurnstileWidget` inside the form: it only matters on the register step, and it is already in a
  chunk shared with `/login` and `/forgot-password`.
- **Saving**: about 25-30 KB raw (about 8-10 KB gz) off `/signup`'s first load. Measure it.
- **Risk & gate**: low. `auth-first-frame.test.mjs` pins strings in `signup-client.tsx` and
  `trivia-gate.tsx` (the shell, the perch, the gate's copy), none of which move. The hoopoe wing
  choreography runs from the form's mount effect (`signup-form.tsx:290-352`). It waits for the bird
  to be idle anyway, so a form that mounts a frame later changes nothing. Gates: `npm run check`,
  `npm run visual` (`/signup` is baselined at the trivia step), and a full signup as a throwaway
  account at 1440 and 390 (answer the question, fill the form, reach `/welcome`). Delete the
  account afterwards per TRAPS. On a slow-3G profile, confirm there is no empty frame at the step
  swap.
- **Confidence**: medium-high on the mechanism, medium on the bytes.
- **Notes**: I considered and rejected server-rendering the first trivia question to save the
  mount-time action round trip (see Not-findings). The landing's stand-in pins "..." and a
  disabled Check, so the real page must mount the same way.

### auth-onboarding-settings-05 - Carry out the owner's answer to audit-2 Q7: one help-bubble machine, look unchanged (signup's private `InfoTip` is one of the three)
- **Where**: `src/components/auth/signup-form.tsx:31-41` (`useHoverCapable`, with an
  `eslint-disable-next-line react-hooks/set-state-in-effect`), `:43-145` (`InfoTip`: its own
  positioning, outside-click, Escape and hover-capability handling), uses at `:538` and `:568`;
  `src/components/common/info-tooltip.tsx` (83 lines, base-ui Popover), used only through
  `src/components/common/float-field.tsx:8-24` (lazy, `ssr: false`), whose one caller passing a
  hint is `src/components/collection/photo-questions.tsx:171`;
  `src/components/common/verified-mark.tsx:4` (`import { Tooltip } from "@base-ui/react/tooltip"`,
  the third machine).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: Audit 2 row G2 ("Two systems, not three ... one decision"). The owner's reading
  table says "7 | default | (a) — all three help bubbles onto one piece of machinery, **look
  unchanged**." The fix-prompt board lists phase G as "DONE" with G1 and G7 shipped and six rows
  parked. G2 appears in neither. `git log` shows `info-tooltip.tsx` unchanged since `7ec5b338`
  (2026-08-29), `signup-form.tsx` untouched since before 2026-09-01, and `verified-mark.tsx` moved
  onto base-ui Tooltip on 2026-09-15 (`9430ab96`), so there are still three machines. The
  shared Popover stack is expensive: B1 measured 145 KB raw off each of five routes by making it
  lazy.
- **What to do**: Make `InfoTooltip` the one machine, and make it cheap by default using the
  pattern bundle-build-07 proposes for `VerifiedMark`. The `(i)` trigger renders statically (it
  is a 15 px Lucide icon in a button), and the Popover is loaded with `next/dynamic` on the first
  `pointerenter`, `focus` or `pointerdown` of the trigger, through a `useState` latch, exactly the
  B1 shape. Give it the two props the signup notes need to keep their look: a `className` for the
  panel (signup's is `w-64` or `w-max`, `text-[12.5px]`, `bg-paper`, border) and the `side` and
  `align` it already has. Then delete `InfoTip` and `useHoverCapable` from `signup-form.tsx` and
  render `<InfoTooltip label="What does batch mean?" ...>` at the two sites. `float-field.tsx`'s
  own `dynamic()` wrapper can then import `InfoTooltip` statically (the laziness moves inside),
  which deletes its 17-line comment-plus-wrapper. `VerifiedMark` joins as bundle-build-07.
- **Saving**: about 115 lines out of `signup-form.tsx` (and one of the five eslint-disables in
  the territory), about 15 out of `float-field.tsx`, about 3-4 KB off `/signup`'s register chunk.
  The Popover stack still loads only on intent, never at first load. Three machines become one.
- **Risk & gate**: medium. The owner said "look unchanged", and the two signup notes open under
  the icon, clamp to the viewport and close on outside-tap. Gates: screenshots of both notes at
  1440 and 390 (hover on desktop, tap on mobile), before and after, compared in pixels; the
  Collection contribute dialog's hint (`photo-questions.tsx`); `npm run visual` (signup is
  baselined, though not with a note open); `npm run check`.
- **Confidence**: high that the owner's answer is still unexecuted. Medium on how much styling
  surface `InfoTooltip` needs to reproduce `InfoTip`'s look exactly.
- **Notes**: Autonomous by standing approval: the owner answered audit-2 Q7 "(a) all three help
  bubbles onto one piece of machinery, look unchanged" on 2026-09-07. The one sub-question left
  (keep 12.5px or move to 14px) is Owner decision 2. The opposite direction, promoting the
  dependency-free `InfoTip` to be the one
  machine, was audit 1's and audit 2's recommendation. It deletes the Popover dependency from
  the help notes, but it needs a portal and collision handling for the contribute dialog, and
  `9430ab96` shows clipping inside dialogs is real. I prefer the direction above because the
  Popover is already a dependency of the app (the houses chain and the filters use it), so the
  one machine costs nothing new. Coordinate with bundle-build-07 so the latch is written once.

### auth-onboarding-settings-06 - Resend-the-confirmation is written three times and has drifted; make it one hook, and make the two gate dialogs one card
- **Where**: `src/components/auth/verify-email-banner.tsx:95-125` (`handleSend`);
  `src/components/auth/verify-email-dialog.tsx:94-124` (`handleResend`, whose own comment calls
  the banner's "the banner's twin of this handler"); `src/app/(auth)/verify-email/verify-client.tsx:107-117`
  (`handleResend`) and `:139-147` (the "Sent to ..." box); the two dialogs' shared shell,
  `verify-email-dialog.tsx:83-156` and `src/components/auth/member-verify-dialog.tsx:26-85`
  (jscpd: `member-verify-dialog.tsx:26-37` ↔ `verify-email-dialog.tsx:83-94`, and
  `verify-email-banner.tsx:95-108` ↔ `verify-email-dialog.tsx:94-108`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: All three run the same scaffold: `if (busy) return; setBusy(true);
  setFlash(""); const result = await callAction(() => resendVerification()); if (!("ok" in
  result) || !result.ok) { set...(result.error ?? "That did not work. Try again in a minute.") }
  ... finally setBusy(false)`. The banner and the dialog map the three states to words. The page
  does not: `verify-client.tsx:114` says `if (result.ok) setResent(result.sentTo ?? "your address")`
  and renders "Sent to X. Check your spam folder if it does not arrive." even when
  `result.state === "queued"`, which means the day's email budget is spent and the mail goes out
  tomorrow. The banner's own header (`verify-email-banner.tsx:20-25`) states the rule this
  breaks: "Telling somebody to go and look in an inbox we have not written to yet is how a working
  queue reads as a broken product, so 'queued' gets its own sentence." The two dialogs are
  "deliberately the same shape (320px, a title, one short line, a pill that names what it does)"
  (`member-verify-dialog.tsx:17-24`). That sameness is currently kept by a comment and two copies
  of the same `<p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] px-3.5 py-2.5 text-[13px] ...">`.
- **What to do**:
  1. Add `useResendVerification()` beside `resendVerification`, in a client file such as
     `src/components/auth/use-resend-verification.ts`. It owns `busy`, the `callAction`, the
     failure sentence and the one state-to-words map (`sent` becomes "Sent to X. Check your spam
     folder if it does not arrive.", `queued` becomes "We have hit today's email limit. Your link
     goes out {sendTimeLabel}.", anything else becomes "Your link is on its way. Give it a minute,
     then check spam."). It returns `{ busy, send }`, where `send()` resolves to
     `{ state, sentTo, sendingAt, sentence } | { error }`. The banner keeps its own `setState`
     from the result, and the dialog and the page just show `sentence`.
  2. Add a `GateCard({ title, line, action, busy, flash, icon })` used by both
     `VerifyEmailDialog` and `MemberVerifyDialog`: Dialog, 320 px content, header, pill, flash
     line.
  3. Move `sendTimeLabel` into the hook file (the banner and the dialog both import it today).
- **Saving**: about 35-45 lines across four files; two jscpd clones (26 lines); one drift bug
  fixed. The verify page stops saying "sent" about a mail that is waiting for tomorrow.
- **Risk & gate**: low-medium. **Pin**: `auth-flow-rule.test.mjs` C-034 asserts
  `verify-client.tsx` contains the literal `callAction(() => resendVerification(` and no bare
  `= await resendVerification(`. If the call moves into the hook, re-point that test at the hook
  file, where the same two assertions hold, and add `verify-client.tsx` must call the hook. Do
  not weaken it. `verify-outcome-rule.test.mjs` reads `verify-client.tsx` for `superseded` and
  `GOOD`, which are untouched. Gates: `npm run check`; as an unconfirmed throwaway account, press
  resend in the banner (on `/feed` at 1440, where the chip floats in the rail, and at 390), in the
  dialog (try to post), and on `/verify-email` with no token.
- **Confidence**: high.
- **Notes**: One visible copy change (the verify page on a day the email budget is spent); it is
  Owner decision 1, with "do it" as the default. The queued case is rare (the free plan's 100-a-day cap). That rarity is why nobody
  has seen the drift. It is also why it must not be left to a fourth copy.

### auth-onboarding-settings-07 - Sweep dead AuthToken rows in the nightly retention pass, not in an `after()` on every mint
- **Where**: `src/lib/auth-tokens.ts:202-238` (the `sweep` closure, the `try { after(sweep) }
  catch { void sweep() }` E468 guard and their two comment blocks), `:2` (`import { after }`);
  `src/lib/retention.ts:27-78` (`KEEP_DAYS`), `:115-134` (`CUTOFF_STEPS`), `:136-158`
  (`SweepResult`, which hand-lists the keys `CUTOFF_STEPS` already names).
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The comment at `auth-tokens.ts:202-204` says it: "no scheduled job prunes this
  table (the nightly retention workflow covers other tables, not these)". The retention sweep
  exists precisely to be that job. It is "idempotent, and safe to run twice", audited on every
  pass, and "verified live end to end" (SECURITY.md). Its `CUTOFF_STEPS` table was built so that
  an age-out is one line checked by `tsc` (`retention.ts:94-114`). Every mint (every confirmation
  and reset email) currently schedules a `DELETE` after the response, behind the same E468 guard
  that `login-attempt.ts` and `email-queue.ts` carry. The live numbers show no cadence problem
  (`raw/db-tables-live.json`: 162 live rows, 44 dead tuples, meaning MVCC garbage from `usedAt`
  updates, well under the autovacuum threshold of about 82). This is about where the rule lives,
  not about volume.
- **What to do**: In `retention.ts`, add `authTokens: 7` to `KEEP_DAYS` with a one-sentence
  comment ("a week past expiry, so an expired click can still say 'this link has run out'"), and
  add a `CUTOFF_STEPS` entry:
  `{ key: "authTokens", days: KEEP_DAYS.authTokens, run: (lt: Date) => prisma.authToken.deleteMany({ where: { expiresAt: { lt } } }) }`.
  The column is `expiresAt`, not `createdAt`, and the existing `expiresAt` index (507 scans)
  serves it. Delete `auth-tokens.ts:202-238` and the `after` import. While `SweepResult` is open,
  derive the eight-plus-one cutoff keys from `CUTOFF_STEPS`
  (`type SweepResult = Record<(typeof CUTOFF_STEPS)[number]["key"], number> & { adminMessages: number; notificationsCapped: number; ... }`)
  so the next step cannot be forgotten in the type.
- **Saving**: about 35 lines out of `auth-tokens.ts` (one fewer `after()`/E468 guard site) and
  about 8 out of `SweepResult`, for about 5 lines added. One fewer `DELETE` per email sent. One
  place answers "how long do we keep X".
- **Risk & gate**: low. Rows now go nightly instead of at the next mint, which is sooner in every
  realistic case. Pins: `unattended-rule.test.mjs`, `purge-rule.test.mjs`, `presence-rule.test.mjs`
  (it pins `KEEP_DAYS.presence`, untouched) and `cascade-rule.test.mjs` read `retention.ts` and
  are unaffected by an added step. `verify-outcome-rule.test.mjs` reads `auth-tokens.ts` for
  `BURNS_ON_MINT`, which is untouched. Do NOT edit SECURITY.md's retention table: its machinery
  section is on the do-not-touch list, and a token's lifetime is an implementation detail, not
  one of the owner's windows. Gates: `npm run check`; read the next `retention.sweep` audit line
  on `/admin/audit` for an `authTokens` count.
- **Confidence**: high.
- **Notes**: Considered and rejected keeping both (sweep on mint as well as nightly): that is the
  same rule written twice. Rejected shortening the week: the week is what makes "this link has
  run out" possible.

### auth-onboarding-settings-08 - `readToken`'s consume branch has no caller left: make it `peekToken`, and fix the docblocks that describe the old shape
- **Where**: `src/lib/auth-tokens.ts:262-319` (`readToken(raw, kind, opts: { consume: boolean })`;
  the dead branch is `:308-316`, `if (opts.consume) { const claimed = await prisma.authToken.updateMany(...) ... }`),
  its docblock `:262-270` ("On success the row is marked used in the same query that checks it,
  so two clicks racing each other cannot both win"); callers `email-actions.ts:147`, `:299`,
  `:326` (all `{ consume: false }`); `hashToken`'s docblock `:61-80` (opens "Exported because
  `email-actions.ts` needs to claim a token ..." and then says "Not exported. It was, back when
  ..."); the three exported-but-local types `TokenKind` (`:23`), `MintResult` (`:148-150`) and
  `ConsumeResult` (`:243-260`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -rn "readToken(" src` finds three calls, all with `{ consume: false }`. The
  burn moved into `claimToken(tx, ...)` inside the effect's own transaction (bug audit Lows 22 and
  114; the comments at `email-actions.ts:137-147` and `:343-357` tell that story). Audit 2's A14
  un-exported `hashToken` but appended a new paragraph under the old one instead of replacing it,
  so the docblock now contradicts itself in its first two sentences. `TokenKind`, `MintResult` and
  `ConsumeResult` have no importer outside the file (grep).
- **What to do**: Rename `readToken(raw, kind, opts)` to `peekToken(raw, kind)`. Delete the
  `opts` parameter and the `if (opts.consume) {...}` block. Rewrite the docblock to "Read a
  token WITHOUT spending it. Spending happens in `claimToken`, inside the transaction of the
  effect it unlocks." Update the three call sites and the comments that name
  `readToken(consume: true)` as history (`email-actions.ts:140`, `:344`, `:354`), keeping the
  history sentence. Replace `hashToken`'s 20-line docblock with its last paragraph (private on
  purpose: "a hash helper that anything can reach is a second implementation waiting to
  happen"). Drop `export` from the three types.
- **Saving**: about 30 lines (a 9-line dead branch, a parameter, and about 20 lines of
  self-contradicting or stale docblock).
- **Risk & gate**: nil. `verify-outcome-rule.test.mjs` pins `reason: "used"; userId: string` in
  the result type (kept). `email-normalization-rule.test.mjs:82-83` mentions `readToken` and
  `claimToken`'s `sentToEmail` in comments only, so update the name there. `npm run check`; one
  confirmation click and one reset as a throwaway account.
- **Confidence**: high.
- **Notes**: I left `burnTokens` after a reset alone. See Not-findings.

### auth-onboarding-settings-09 - The account purge: a docblock above the wrong function, two facts read twice in one transaction, and its audit sentence written in two files
- **Where**: `src/lib/account-purge.ts:239-253` (the docblock for
  `clearCoversPointingAtThisMember`, "Clear other members' profile covers ...", which sits above
  a SECOND docblock at `:254-272` and the function `restoreCatchupPicturesUploadedBy` at `:273`,
  while `clearCoversPointingAtThisMember` itself at `:288` has none, and `restoreCatchupPicturesUploadedBy`'s
  docblock calls it "`clearCoversPointingAtThisMember` above" when it is below); Photo rows read
  at `:110-113` (`collectImageUrls`) and again at `:289-292` (`clearCoversPointingAtThisMember`),
  same `where: { uploaderId: userId }`, same three columns; Catch-up rows read at `:123-126`
  (`pictureSrc: { contains: \`/uploads/${userId}/\` }`) and again at `:274-277`; the purge-outcome
  sentence at `src/lib/retention.ts:316-318` and `src/app/(main)/admin/people/actions.ts:543-545`
  (`${purged.imagesDeleted} stored image(s) removed` + `, ${n} still queued` + `, ${n} group(s)
  handed on`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Read of the file. The two reads of each fact happen inside ONE RepeatableRead
  transaction (`:382-396`), so the second read sees exactly the snapshot the first saw. It is pure
  repetition. The live statements show 15 user deletions since the counters reset
  (`raw/db-statements-live.json` #117), so this is about correctness of reading, not runtime.
- **What to do**: (1) Move `clearCoversPointingAtThisMember` (and its docblock) above
  `restoreCatchupPicturesUploadedBy`'s docblock, which is the order the latter's "above" assumes.
  (2) Have `collectImageUrls` return the photo rows and the Catch-up rows it read (`{ urls, photos,
  catchups }`), select `id`, `groupId` and `pictureSrc` once, and pass them to
  `clearCoversPointingAtThisMember(tx, photos)` and `restoreCatchupPicturesUploadedBy(tx, catchups)`.
  (3) Export a plain `describePurge(result: Extract<PurgeResult, { ok: true }>): string` from
  `account-purge.ts` returning the "N stored image(s) removed, ..." tail, and use it in both
  callers.
- **Saving**: about 12 lines; 2 queries per purge; one clone across two files; one misplaced
  docblock.
- **Risk & gate**: low, but pinned. **Pins**: `catchup-pictures.test.mjs:314-318` asserts four
  exact spellings in `account-purge.ts`: `restoreCatchupPicturesUploadedBy`,
  `pickCatchupPicture(db, row.groupId)` (keep the loop variable named `row`),
  `` pictureSrc: { contains: `/uploads/${userId}/` } `` (keep it in the single read), and
  `urls.push(c.pictureSrc)` (keep the variable `c`). Keep them or update that test in the same
  commit. `purge-rule.test.mjs` asserts `/imagesFailed/` in `account-purge.ts` (kept) and the
  transaction and conditional-delete shapes (untouched). `unattended-rule.test.mjs` C-076
  (`isolationLevel: "RepeatableRead"`) and C-118 (`updateMany` in the drain) are untouched.
  `login-attempt-rule.test.mjs:61-72` asserts the purge does not clear `loginAttempt` (untouched).
  Gates: `npm run check`. Prove the purge with the TRAPS "rolled-back transaction" method on a
  throwaway account, or `phase8-probe.mjs` (owner-run).
- **Confidence**: high.
- **Notes**: `promoteOrphanedGroups` (`:46-83`) writes `role: "admin"` while
  `promoteGroupSuccessor` writes `"keeper"`. That is catchups-lib-14's owner question, and if he
  says yes, one helper should serve both. `type Db` at `:34` is catchups-lib-20's.

### auth-onboarding-settings-10 - `/login` and `/signup` each carry their own copy of the flight-destination shell: extract it once
- **Where**: `src/app/(auth)/login/login-client.tsx:208-261` and
  `src/app/(auth)/signup/signup-client.tsx:99-161` (the `lg:pl-[58.3333%]` wrapper,
  `<AuthPhotoPanel />`, the cream column, the Back link, the entrance `m.div` with
  `initial={entrancePlayedOnLanding ? false : { opacity: 0, x: 48 }}`, the perch box with
  `data-hoopoe-perch` and `PERCH_LIFT_PX`), plus the import blocks `login-client.tsx:10-20` ↔
  `signup-client.tsx:9-19`. jscpd: four clones, 11 + 25 + 6 + 17 = 59 lines.
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: `auth-panel.tsx:16-33` explains why `/login` and `/signup` "keep their own shell"
  (they are flight endpoints with a measured perch and entrance, and `/signup` re-anchors between
  steps). That is a reason not to use `AuthPanel`. It is not a reason for the two flight pages to
  duplicate each other. The differences between them are three values: perch height (128 vs
  112), hoopoe size (102 vs 96), and the column's anchoring class (`my-auto` vs the step-dependent
  one plus `layout="position"`).
- **What to do**: Add `FlightAuthShell` to `auth-panel.tsx`, taking props `{ flightKey, runIntro,
  perchClass, hoopoeSize, anchorClass, layoutPosition?, hoopoeRef, children }`. It calls
  `useFlightArrival` itself and renders the wrapper, panel, Back link, entrance and perch, with
  the page's content as `children`. `login-client` and `signup-client` keep their intro beats
  (`runIntro`), their forms and `HoopoeWarmup`.
- **Saving**: about 45 lines; 4 clones.
- **Risk & gate**: medium. This is the owner's most-polished hand-off. **Pins**:
  `auth-first-frame.test.mjs` asserts that the stand-in's copied strings exist in
  `signup-client.tsx` and `login-client.tsx` (`COPIED`, `:69-101`: the column padding, the 400 px
  column, `{ opacity: 0, x: 48 }`, `transition={SPRINGS.gentle}`, the perch classes) and that
  both pages contain `initial={entrancePlayedOnLanding ? false : { opacity: 0, x: 48 }}`
  (`:117-134`). Re-point those sources to `auth-panel.tsx` in the same commit, and keep the "no
  auth column hand-types its own h1" test pointing at all three. Gates: `npm run check`,
  `npm run visual`, `node scripts/qa/hoopoe-landing-check.mjs` (the fly-in's first visible frame),
  and a manual landing to Sign in and landing to Join flight at 1440 plus the mobile fly-in at 390.
- **Confidence**: medium. The code is simple; the risk is a one-frame difference in a hand-off the
  owner watches.
- **Notes**: Do this after -04 (the lazy form), so `signup-client` is already in its final shape.
  If the owner would rather not touch the flight at all this close to launch, this is the one row
  in this report to drop.

### auth-onboarding-settings-11 - The onboarding wizard: `onSkip` is always `onNext`, the step list is written three times, and the footer and heading are written three times
- **Where**: `src/components/onboarding/onboarding-flow.tsx:229-237` (`onNext={goNext} ...
  onSkip={goNext}` for all three steps), the `onSkip` prop in `steps/register-step.tsx:45,50,202`,
  `steps/houses-step.tsx:46,51,119` and `steps/photo-step.tsx:32,37,112`
  (`onClick={photoUrl ? onNext : onSkip}` picks between two identical functions); the step list at
  `onboarding-flow.tsx:71` (`STEP_ORDER`), `src/app/(main)/welcome/page.tsx:21` (`STEP_IDS`) and
  `src/components/onboarding/types.ts:25` (the `OnboardingStepId` union); the footer (Back /
  Skip for now / Save & continue) at `register-step.tsx:196-211` ↔ `houses-step.tsx:113-128`
  (jscpd 13 + 8 lines) with a one-button variant at `photo-step.tsx:103-116`; the step heading at
  `register-step.tsx:112-121`, `houses-step.tsx:91-100` and `photo-step.tsx:47-55` (the same
  `font-heading text-[24px] leading-tight tracking-[-0.02em]` h2 and the same muted paragraph);
  the "why the already-onboarded guard is client-side" reason told three times at
  `welcome/page.tsx:59-71`, `onboarding-flow.tsx:107-128` and `onboarding/actions.ts:92-97`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Read of the five files. `grep -rn "onSkip" src` finds only these sites. No
  caller passes a different skip.
- **What to do**: (1) Delete `onSkip` from the three steps; their "Skip for now" calls `onNext`.
  (2) `types.ts`: `export const ONBOARDING_STEPS = ["welcome", "register", "houses", "photo", "done"] as const;
  export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];`, imported by the flow and the
  page. (3) In `onboarding/steps/`, add `StepHeading({ title, children })` and
  `StepFooter({ onBack, onSkip?, primary })` and use them in the three data steps. (4) Keep the
  full guard explanation in `onboarding-flow.tsx`, where the guard is, and cut the page's and the
  action's copies to one sentence pointing there.
- **Saving**: about 45 lines (about 12 of props, 2 of lists, about 20 of JSX, about 15 of repeated
  comment); 2 clones; 3 spellings of one list become 1.
- **Risk & gate**: low. No rule test reads these files (the only hit is
  `upload-size-rule.test.mjs`, which names `photo-step.tsx` for the avatar shrink, untouched).
  `npm run check`; walk `/welcome` as a throwaway account at 1440 and 390, for a teacher and an
  alumnus (the teacher skips Houses); `?step=houses` on a teacher account.
- **Confidence**: high.
- **Notes**: The `onSkip` part is a placeholder (a prop every caller passes the same value); the rest is dedupe. The
  guard itself (the `hasCheckedRef` once-per-mount check) is correct and pinned by nothing, so the fixer
  must not "simplify" it into a server redirect: the page's own comment explains why that bounces
  members mid-wizard.

### auth-onboarding-settings-12 - Seven identical step cross-fades on the auth pages: one `StepSwap`
- **Where**: `src/app/(auth)/signup/signup-client.tsx:165-171` and `:178-184`;
  `src/app/(auth)/forgot-password/forgot-client.tsx:129-135` and `:188-194`;
  `src/app/(auth)/reset-password/reset-client.tsx:166-172`, `:192-197` (no exit) and `:203-209`.
  Each is `<m.div key=... initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }} transition={SPRINGS.gentle}>` (jscpd
  `forgot-client.tsx:190-195` ↔ `reset-client.tsx:168-173` and `:205-210`, and
  `signup-client.tsx:167-174` ↔ `:180-188`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `grep -F 'initial={{ opacity: 0, y: 8 }}' src` finds these seven, plus
  `(main)/template.tsx`, `settings/nightfall.tsx` and two in `letterhead-profile.tsx` with other
  shapes. `common/motion.tsx`'s `FadeRise` is the obvious home but has no `exit` and no non-lab
  caller (see For other lenses).
- **What to do**: Export `StepSwap({ children, noExit? })` from `auth-panel.tsx`, rendering the
  `m.div` above, and use it as `<StepSwap key="ask">...</StepSwap>`. AnimatePresence tracks
  children by key, and the exit runs through presence context in the child `m.div`.
- **Saving**: about 25 lines; 3 clones.
- **Risk & gate**: low. `auth-first-frame.test.mjs` does not pin these wrappers (its entrance
  pins are on the column). `npm run visual` covers `/signup` and `/login`. Swap each step once by
  hand (trivia to register; forgot's ask to sent; reset's form to done) at 1440 and 390.
- **Confidence**: high.
- **Notes**: `dark-gauntlet.tsx` (`stepMotion`, y 16/-12) and `onboarding-flow.tsx` (y 10/-10) use different
  numbers on purpose and are left alone; only the seven identical auth wrappers are one thing.

### auth-onboarding-settings-13 - `theme-actions.ts` is "one implementation, two names; collapse to one when the flow ships". It shipped: collapse it
- **Where**: `src/components/settings/theme-actions.ts:31-65` (private `setTheme`) and `:67-75`
  (`export async function setThemePreference(theme) { return setTheme(theme); }` with the
  docblock "One implementation, two names; collapse to one when the flow ships.");
  `src/lib/gate-coverage.test.mjs:130-131` (Pass 2's comment names "the theme actions'
  one-implementation-two-names pattern").
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: The dark-mode flow shipped (the gauntlet and `LightsOn` are live and are the
  action's only two callers). I measured gate-coverage's Pass 2 (delegation) with a read-only
  replica of its sweep over the 22 action files: it admits four exports, `setThemePreference` and
  three in `src/app/(main)/messages/actions.ts` (`adminReplyToThread`, `setThreadStatus`,
  `markThreadSeenByAdmin`). So Pass 2 stays after the collapse; only its example goes stale.
- **What to do**: Rename `setTheme` to `export async function setThemePreference` (the body keeps
  `await auth(`, so it passes Pass 1 by itself). Delete the wrapper and its docblock. Update
  `gate-coverage.test.mjs`'s Pass 2 comment to cite a messages action as its example.
- **Saving**: about 10 lines.
- **Risk & gate**: nil. `gate-coverage.test.mjs` (the export still carries a gate marker).
  `npm run check`; turn dark mode on through the gauntlet and off through `LightsOn`.
- **Confidence**: high.
- **Notes**: None beyond keeping `setThemePreference`'s name, which both callers import.

### auth-onboarding-settings-14 - `turnstile.ts`: an export with one internal caller, an exported type nobody imports, and a three-line wrapper
- **Where**: `src/lib/turnstile.ts:106-118` (`export async function verifyTurnstile(...) { return
  (await checkTurnstile(token, ip, host)).ok; }`, whose only caller is `verifyHumanFromForm` at
  `:235`), `:90-100` (`export type BotCheckFailure`, used only in `HumanVerdict` in this file),
  `:83-88` (`hostFromRequest`, one caller at `auth.ts:132`).
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `raw/knip-repo-plus-lab.txt:199` (`verifyTurnstile function src/lib/turnstile.ts:112:23`,
  unused export) and `:237` (`BotCheckFailure type`, unused export). A grep confirms the only
  call is internal.
- **What to do**: In `verifyHumanFromForm`, return
  `(await checkTurnstile(formData.get("turnstileToken") as string | null, ip, host)).ok`. Delete
  `verifyTurnstile` and its docblock. Drop `export` from `BotCheckFailure`. Optionally inline
  `hostFromRequest` into `auth.ts` as `normaliseHost(request.headers.get("host"))` (its "mirrors
  `ipFromRequest`" symmetry is the only argument for it, and that is taste).
- **Saving**: about 14 lines; 2 knip lines.
- **Risk & gate**: nil. **Pin**: `scripts/qa/audit-status.mjs` H22 (`:322-345`) greps the three
  DOOR files (`auth.ts`, `components/auth/actions.ts`, `components/auth/email-actions.ts`) for
  `verifyTurnstile(|checkTurnstile(|verifyHumanFromForm(`, not `turnstile.ts`, so it stays green.
  Update its comment at `:327-328` ("which wraps verifyTurnstile"). `npm run check` includes
  `audit:status --fail-on-open=critical,high`.
- **Confidence**: high.
- **Notes**: Does not touch the verification itself; `checkTurnstile`'s fail-open and origin-rule branches are
  unchanged. This is also the natural moment to land E7b (see Audit carry-overs), since both touch
  the Turnstile call sites.

### auth-onboarding-settings-15 - `api-gate.ts`: fold the six hand-built refusals into one helper, and keep every gate call literal
- **Where**: `src/lib/api-gate.ts:56-78` (`vetUploadRequest`), `:93-110` (`vetLookupRequest`),
  `:129-141` (`vetPhotoDownload`). There are six
  `return { ok: false, response: NextResponse.json({ error: X }, { status: N }) };` lines (jscpd:
  `:73-93` ↔ `:104-129` and `:135-157`, and `:93-99` ↔ `:129-135`, 49 lines).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd lists three clones inside the file.
- **What to do**: Add `const refuse = (error: string, status: number): Vetted => ({ ok: false, response: NextResponse.json({ error }, { status }) });`
  and use it at the six sites. Do NOT fold the three vetters into one `vet(gate, meter)`
  combinator.
- **Saving**: about 10 lines; 3 clones.
- **Risk & gate**: nil if the rule above is kept. **Pin**: `scripts/qa/audit-status.mjs` H21
  (about `:296-321`) splits `api-gate.ts` on `export async function`, keeps the vetters whose body
  contains `requireVerifiedMember(`, and fails if the upload route's vetter is not one of them.
  A combinator that passes the gate as a function reference would hide the call from the probe,
  re-open a HIGH finding, and fail `npm run check`. `npm run check`.
- **Confidence**: high.
- **Notes**: This is also the answer to charter question 3; see Not-findings on "two gates, one
  policy?".

### auth-onboarding-settings-16 - The password floor: three server checks at signup, four wordings, three hand-typed eights
- **Where**: `src/components/auth/actions.ts:36-40` (`if (!password || password.length <
  MIN_PASSWORD) return { error: "Password must be at least 8 characters." }`, before the schema
  and `passwordProblem`, which both check the same thing); `src/lib/validators.ts:98-101` (`.min(MIN_PASSWORD, \`Password must be at least ${MIN_PASSWORD} characters\`)`);
  `src/lib/password-rule.ts:55-57` (`Password must be at least ${MIN_PASSWORD} characters.`);
  `src/components/auth/signup-form.tsx:368-373` (client, hand-typed "8");
  `src/components/auth/email-actions.ts:316-318` and `reset-client.tsx:104-106` ("Pick a password
  of at least ..."); `src/components/auth/password-field.tsx:38` (`focusHint = "8+ characters"`);
  `email-actions.ts:9` and `:19` (two imports from `@/lib/password-rule`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Read of the files. Audit-2 `auth-edge-13` found the same two hand-typed eights. It
  was never compiled into audit 2's plan, and both are still there.
- **What to do**: Delete `actions.ts:36-40` (the schema and `passwordProblem` both still refuse,
  with the same meaning). Template the client sentence and the hint on `MIN_PASSWORD`
  (`\`${MIN_PASSWORD}+ characters\``). Pick one wording for "too short" and use it in the four
  places. Merge the two `password-rule` imports in `email-actions.ts`.
- **Saving**: about 8 lines; one number, one sentence.
- **Risk & gate**: nil. `npm run check` (`password-rule.test.mjs` tests the rule, not the
  callers). The one visible effect: a too-short password with the consent box unticked now gets
  the consent sentence first. Both are refusals the form already blocks client-side.
- **Confidence**: high.
- **Notes**: Keep one early length check in `resetPassword` if the fixer prefers to refuse a short password
  before the token peek (it saves a DB read on an obviously bad submit). What must go is the
  hand-typed "8" and the third wording, not necessarily the ordering.

### auth-onboarding-settings-17 - The signup form's submit handler: one `fail()`, a module-level account-type list, one class string for the three legal links, and the shared year rule
- **Where**: `src/components/auth/signup-form.tsx:368-392` and `:399-413` (six blocks of
  `setError(msg); hoopoe.react("error"); setLoading(false); return;`), `:354-357`
  (`ACCOUNT_TYPES`, declared inside the component), `:387-392` (a hand-written "The year you left
  cannot be before the year you joined."), `:675`, `:679`, `:683` (three copies of
  `font-medium text-canopy underline decoration-canopy/40 underline-offset-2 hover:decoration-canopy`);
  the shared rule `src/lib/batch-year.ts:89-100` (`yearClashMessage`, pure and import-free, and
  already what the server runs at `components/auth/actions.ts:88`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Read of the file. Audit-2 `auth-edge-13` (dropped in compilation) found the first
  two. The year rule is new: the client checks only left-before-joined, so the other clash the
  server refuses (a batch year before the year you left) is caught only after the Turnstile token
  has been spent and re-armed.
- **What to do**: `const fail = (msg: string) => { setError(msg); hoopoe.react("error"); setLoading(false); };`
  used six times; `ACCOUNT_TYPES` above the component; `const LEGAL_LINK = "..."`; replace
  `:387-392` with `const clash = yearClashMessage({ yearJoined: Number(yearJoined) || undefined,
  yearLeft: Number(yearLeft) || undefined, batchYear: isAlum ? Number(batchYear) || undefined :
  undefined }); if (clash) return fail(clash);`. Check `MemberYears` for the exact field types.
  The two "fill in the years" checks stay (they name missing fields, which the rule does not).
- **Saving**: about 20 lines. The server's second year rule now answers before a token is spent.
- **Risk & gate**: low. `auth-first-frame.test.mjs` does not read `signup-form.tsx`.
  `focus-recipe.test.mjs` reads it for focus classes, so keep the checkbox's
  `focus-visible:outline-*` untouched. `npm run check`; submit the form with swapped years and
  with a batch before the left year, at 390.
- **Confidence**: high.
- **Notes**: The three legal `<a>` links have `hover:` but no `focus-visible:` style. That is a
  protocol gap, so it goes to the bug lens (For other lenses), not here.

### auth-onboarding-settings-18 - `rate-limit.ts`: a docblock that argues the old number, a future tense for a shipped feature, and the demo check written three times
- **Where**: `src/lib/rate-limit.ts:95-114` (the `collectionUploads` JSDoc: "Two hundred
  photographs an hour is a long sitting for a real contributor and still five hours to the
  ceiling"), directly followed by a second block comment `:115-127` that argues the value
  actually set, `collectionUploads: { tokens: 1000, window: "1 h" }` at `:128`; `:157-159`
  (`reports`: "Phase 7 adds the per-pair dedupe."); `:268`, `:287`, `:302` (`if (IS_DEMO) return
  ...` at the top of `rateLimit`, `hasBudget` and `consume`, each followed by `const limiter =
  limiterFor(name); if (!limiter) return ...`).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `git log -S'Two hundred photographs' -- src/lib/rate-limit.ts` shows `6af84335`
  (2026-08-28), when the value became 400 (two tokens per photograph, so 200 an hour). `git log
  -S'collectionUploads: { tokens: 1000'` shows `35bdd5b7` the next day, which added the second
  block and left the first. At 1000, the JSDoc's arithmetic is wrong (500 an hour; two hours to
  the 1,000-photograph ceiling). In a file whose rule is that every constant is argued for, a
  wrong argument is worse than none. The per-pair report dedupe shipped (SECURITY.md,
  Accountability).
- **What to do**: Merge the two `collectionUploads` comments into one that argues 1000 (keep the
  school photographer, the two-tokens arithmetic, and `MAX_PHOTOS_PER_ACCOUNT` as the real
  ceiling). `reports`: "the per-pair dedupe lives in the report action". Move `if (IS_DEMO)
  return null;` into `limiterFor`, and delete the three copies (every caller already treats a null
  limiter as "open").
- **Saving**: about 12 lines; one wrong argument removed.
- **Risk & gate**: nil. `unattended-rule.test.mjs` C-154 pins the `reportSwallowed` path
  (untouched). `mail-policy.test.mjs`, `upload-shared.test.mjs` and
  `email-normalization-rule.test.mjs` read `rate-limit.ts` for other shapes. `npm run check`.
- **Confidence**: high.
- **Notes**: The `login-unverified` docblock (`:47-69`) in the same file is the model of an argued constant
  and must not be trimmed in this pass.

### auth-onboarding-settings-19 - The same field rules written twice across onboarding, settings and admin: build from `profileSchema`, one account-type list, and one name for the only houses writer
- **Where**: `src/components/onboarding/actions.ts:32-42` (`registerStepSchema`:
  `admissionNumber: z.number().int().min(0).max(10000)`, `workplace` and `jobTitle`
  `.max(100)`, `subjects` `.max(200)` with the comment "200 matches the settings validator's
  ceiling for the same field"), restating `src/lib/validators.ts:159-160`, `:178` and `:181`;
  `onboarding/actions.ts:103-109` (`houseYearSchema` year `.min(1900).max(2100)`, while
  `batch-year.ts:24-25` has `FIRST_BATCH_YEAR = 1926`); `validators.ts:103` and `:172`
  (`z.enum(["alumnus", "teacher", "ex_teacher"])` twice) and
  `src/app/(main)/admin/people/actions.ts:66` (`const ACCOUNT_TYPES = [...] as const`, a third
  time); `validators.ts:20` (`yearField`'s default is `{ tooLate: "That year hasn't happened yet" }`,
  and `:104` passes exactly that string); `saveOnboardingHouses` (`onboarding/actions.ts:118`),
  which is the ONLY writer of `User.houses` and is imported by the profile
  (`letterhead-profile.tsx:92`, `:481`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Read and grep. "A rule kept true by a comment" is the drift `human-pass-rule.ts`'s
  own header names as the thing to end.
- **What to do**: `registerStepSchema = z.object({ admissionNumber:
  profileSchema.shape.admissionNumber, workplace: profileSchema.shape.workplace, jobTitle:
  profileSchema.shape.jobTitle, subjects: profileSchema.shape.subjects, places:
  placesSchema.default([]) })`. The register step trims `workplace` and `jobTitle` while the
  profile schema does not; keep the trim with `.trim()` chained on, or add `.trim()` to
  `profileSchema`, which the editor would welcome. Export `ACCOUNT_TYPES` once (from
  `validators.ts`) and use it in both enums and in the admin action. Make `tooLate` optional in
  `yearField`. Use `FIRST_BATCH_YEAR` and `LAST_BATCH_YEAR` in `houseYearSchema`. Rename
  `saveOnboardingHouses` to `saveHouses` (optionally moving it to `profile-actions.ts`), with its
  two callers.
- **Saving**: about 10 lines; three spellings of the account types become one; one comment-kept
  equality gone; one misleading name.
- **Risk & gate**: low. `profile-editor-rule.test.mjs` pins that the profile editor reads
  `profileSchema.shape` (untouched). `gate-coverage.test.mjs` sweeps the renamed action (it still
  carries `await auth(`). `npm run check`; save the register step and the houses step in
  `/welcome`, and houses on the profile.
- **Confidence**: high.
- **Notes**: If `profileSchema` gains `.trim()` on `workplace` and `jobTitle`, the profile editor's stored
  values change for anyone who typed trailing spaces. That is harmless (the register step already
  trims), but say so in the commit.

### auth-onboarding-settings-20 - `proxy.ts` has `isUnder()` and then writes its body out three more times
- **Where**: `src/proxy.ts:105-107` (`function isUnder(pathname, prefixes) { return
  prefixes.some((p) => pathname === p || pathname.startsWith(p + "/")); }`), used only in the demo
  branch (`:137`, `:143`); the same test written out at `:128` (`/ingest`), `:194` (`/groups`) and
  `:296-298` (`publicPaths.some((path) => pathname === path || pathname.startsWith(path + "/"))`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Read of the file.
- **What to do**: Use `isUnder(pathname, ["/ingest"])`, `isUnder(pathname, ["/groups"])` and
  `isUnder(pathname, publicPaths)`. Leave `publicPaths` where it is (see Notes).
- **Saving**: about 4 lines; one spelling of "under this prefix".
- **Risk & gate**: nil. **Pin**: `proxy-rule.test.mjs:21-26` scrapes `publicPaths` with
  `/const publicPaths = \[([\s\S]*?)\n {2}\];/`, so the array must stay a `const` inside the
  function with its closing `];` at two spaces of indent. `npm run check`; `curl -sI` a public
  path, a gated page, and a cookieless `/api/...` for 200, 307 and 401 JSON.
- **Confidence**: high.
- **Notes**: Hoisting `publicPaths` to module scope (so it is not rebuilt per request) is correct
  and trivial at runtime, but it would silently make `proxy-rule.test.mjs` vacuous. It is only
  worth doing with the regex updated in the same commit. The per-request cost of the array is
  noise.

### auth-onboarding-settings-21 - Four verified audit-2 rows that fell out of the plan and are still true
- **Where**: (a) `src/components/auth/auth-panel.tsx:89`, `:99`, `:152` (`hoopoeSize = 102`,
  which no caller passes: `forgot-client.tsx:122-126`, `reset-client.tsx:159-163`,
  `verify-client.tsx:120-124`); (b) `src/lib/login-attempt.ts:53`
  (`email: input.email.trim().toLowerCase().slice(0, 200)`, a hand-spelled canonical email) and
  `src/app/(auth)/forgot-password/page.tsx:9-11`, `:29` (`looksLikeEmail`, a third email regex);
  (c) `src/app/(auth)/error.tsx:37-39` (`<Link href="/login"><Button
  variant="outline">...</Button></Link>`, a button inside an anchor); (d) paired imports from one
  module: `login-client.tsx:12` and `:27`, `forgot-client.tsx:10` and `:17`, `reset-client.tsx:10`
  and `:17` (`useHoopoe` and `gazeFor` from `@/components/mascot/use-hoopoe` on two lines).
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Audit-2 `auth-edge-09`, `-10`, `-12` and `-13` (in
  `docs/audit-fix/2026-09-03-refactor-audit-2/work/agents/auth-edge.md`). `grep` over audit 2's
  `report.md` and `fix-prompt.md` finds none of those ids, so they never became rows. Each was
  re-verified in today's code at the lines above.
- **What to do**: (a) Remove the prop and write `size={102}`. (b)
  `email: normalizeEmail(input.email).slice(0, 200)`, and in the forgot page
  `emailField().safeParse(email).success`. (c) `<Button variant="outline" nativeButton={false}
  render={<Link href="/login" />}>Back to sign in</Button>`, the idiom `reset-client.tsx:181-189`
  already uses. (d) Merge each pair.
- **Saving**: about 12 lines; one nested interactive element; one email regex.
- **Risk & gate**: nil. `login-attempt-rule.test.mjs` reads the `LoginReason` vocabulary
  (untouched). `email-normalization-rule.test.mjs` covers lookups (unaffected). `npm run check`.
  Throw once under `(auth)` locally and press the button.
- **Confidence**: high.
- **Notes**: These four are the only audit-2 rows in this territory that fell between the report and the
  fix-prompt. None is security-relevant; (c) is an HTML validity and screen-reader fix.

### auth-onboarding-settings-22 - Comments that describe code that moved or no longer exists (14 sites)
- **Where / what each says / what is true**:
  1. `src/lib/auth.ts:506-509`. "// Dedupe auth() within a single request ..." sits above
     `guardedSession`'s own docblock (`:510-519`), 17 lines from the `cache(` it describes
     (`:526`). Move it down.
  2. `src/components/auth/email-actions.ts:243`. "an account with no password to reset (the admin
     bypass row)". The bypass was deleted 2026-08-19 (C1-a). A password-less account is "an
     invited member who never finished signing up" (`auth.ts:223-224`).
  3. `src/app/(auth)/login/login-client.tsx:267-270`. "rows carry `layout` so the password block
     vanishing (admin email) ...". It never vanishes now (the same file's `:288-290` says so).
  4. `login-client.tsx:129-134`. "Null when the widget could not produce one — the server then
     refuses with the bot-check code below". Since 2026-09-11 it does not; `:151-156` in the same
     function says so.
  5. `src/components/auth/trivia-actions.ts:9-17`. "Attempts are lightly rate limited per gate
     token" (per IP since M7, as `:181-188` says) and "cookie (triviaPassedAt)" (the cookie is
     `rv_trivia_pass`).
  6. `src/components/onboarding/steps/welcome-step.tsx:6-11`. "mounted by the server page, see
     onboarding/page.tsx". The page is `welcome/page.tsx`, and the celebration now mounts only at
     Done (`onboarding-flow.tsx:14-19`).
  7. `src/app/(main)/welcome/page.tsx:60-62`. "set via the onboarding 'register' step or
     /settings". `/settings` does not exist (audit M49: the profile is the settings surface).
  8. `src/app/(main)/welcome/page.tsx:16-20`. A route-naming history above `STEP_IDS`, unrelated
     to it. Delete it or move it to the file head.
  9. `src/app/api/account/export/route.ts:9-10`. "Reached from the quiet 'Download your data'
     link in settings". Settings means the profile.
  10. `src/components/settings/dark-gauntlet.tsx:5-6`. "turning it OFF is one click in
      Appearance". It is `LightsOn`, "one calm page, one button" (`lights-on.tsx:3-5`).
  11. `src/components/settings/avatar-crop-dialog.tsx:24-26`. "its z-50 panel already clears the
      settings save bar (z-20)". No settings save bar exists (grep for "save bar" and `z-20`
      sticky bars finds none in `src/components`).
  12. `src/instrumentation.ts:60-61`. "`debug: false` Tree-shakes Sentry's own debug logging out
      of the production bundle". `debug` is a runtime option and `false` is the SDK default; the
      build-time tree-shaking is a different setting. Delete the line and the comment, or say
      what it is.
  13. `src/components/onboarding/onboarding-flow.tsx:20-33`. A 14-line debugging story about
      `bg-card` in two other files. Cut it to its conclusion (the celebration waits for Done).
  14. `src/components/auth/turnstile-widget.tsx:31-36`. "What happens when it CANNOT produce one
      used to be described here as ...", a comment about an earlier version of this comment.
      Keep the three bullets under it, which carry M07 and the dates.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Each was verified against the file it points at (the quotes are above).
  Quoting one of each kind, as the brief asks. A comment that is NOT bloat, kept:
  `rate-limit.ts:47-69` (the `login-unverified` meter: "13 of the 39 sign-in attempts in the
  fortnight to 2026-09-10 died there", an argued number with a measured incident). A comment
  that IS bloat: item 3 above, which describes a field that "vanishes" and no longer does.
- **What to do**: As listed. Where a sentence carries an audit id or a date, keep that sentence
  and cut the stale half.
- **Saving**: about 35 comment lines; 14 statements that now match the code.
- **Risk & gate**: nil. Every rule test decomments before matching. `npm run check`.
- **Confidence**: high.
- **Notes**: Items 2, 3 and 4 are the same kind as audit-2 `auth-edge-11`: comments that outlived the
  2026-08-19 admin-bypass removal and the 2026-09-11 bot-check change.

### auth-onboarding-settings-23 - Small code simplifications (no-op ternaries, a per-render constant, an identity transform, repeated literals)
- **Where / what**:
  1. `src/components/auth/email-actions.ts:301` (`checkResetLink`):
     `return { state: read.reason === "unknown" ? "unknown" : read.reason };` is a no-op ternary.
     Write `{ state: read.reason }`.
  2. `email-actions.ts:162-166` (`confirmEmailToken`): after the `"used"` branch, `peek.reason`
     is already `"unknown" | "expired" | "stale"`, all members of `ConfirmOutcome`, so the nested
     ternary becomes `return peek.reason;`. Also `:150-161` and `:185-194` run the same
     `findUnique({ select: { emailVerified: true } })` into `"already" | "superseded"`; make it a
     module-private `async function alreadyOrSuperseded(userId)`. It must stay unexported,
     because this is a `"use server"` file (TRAPS).
  3. `email-actions.ts:105-112` (`resendVerification`): a nested ternary mapping three states.
     `state.state === "failed" || "none"` has already returned, so it can be
     `state: state.state === "sent" || state.state === "queued" ? state.state : "imminent"`.
  4. `src/app/(auth)/login/login-client.tsx:174-187`: a four-deep nested ternary from refusal
     code to sentence. Use a small map `{ "rate-limited": RATE_LIMITED, unavailable:
     SIGN_IN_UNAVAILABLE }`, with the bot-check case (which depends on `scriptBlocked`) as the one
     `if`.
  5. `src/components/settings/dark-gauntlet.tsx:423`: `useTransform(drowse, [0, 1], [0, 1])`
     returns `drowse` (clamped to a range it never leaves), so use `drowse` for the veil's
     opacity. `:125-129`: `stepMotion` is rebuilt every render; hoist it to module scope.
  6. `src/components/settings/avatar-crop-dialog.tsx:108`, `:215` and `:258`: the display scale
     `(FRAME / Math.min(w, h)) * zoom` is computed three times under a header that says "derived
     once". Have `panLimits` return `{ s, maxX, maxY }`, and replace the `stage` IIFE
     (`:256-264`) with a plain call.
  7. `src/components/settings/actions.ts:30` (`MAX_AVATAR_INPUT = 15 * 1024 * 1024`, and
     "Photo must be under 15MB" at `:100`) and `src/components/settings/avatar-upload.ts:28`
     (`MAX_PICK_BYTES`, same number and sentence at `:75`): one constant in
     `src/lib/upload-shared.ts` (client-safe), imported by both.
  8. The httpOnly/secure/lax/path cookie options are written three times:
     `trivia-actions.ts:272-280` and `:312-318`, and `src/lib/human-pass.ts:29-38`. Add one
     `shortLivedCookie(maxAgeSeconds)` in a server lib module.
  9. `hasPassedTrivia` (`trivia-actions.ts:322-332`) is exported from a `"use server"` file only
     because the cookie helpers live there, so it needs a `PUBLIC_BY_DESIGN` entry in
     `gate-coverage.test.mjs:44`. Move it, the two cookie names and `TOKEN_TTL_MS` into
     `src/lib/trivia-pass.ts` (the precedent is `sendVerificationEmail`, moved out of the actions
     file on purpose; see `email-actions.ts:36-40`). Remove the gate-coverage entry in the same
     commit, because the test fails on a stale entry.
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Read of each file.
- **What to do**: As listed.
- **Saving**: about 30 lines; one fewer public action entry; three copies of 15 MB and three of
  the cookie shape become one each.
- **Risk & gate**: nil to low. `gate-coverage.test.mjs` (item 9: the entry must go with the
  export). `auth-flow-rule.test.mjs` C-035 counts awaits after `if (!applied)` in `resetPassword`
  (item 2 does not touch that function). `upload-size-rule.test.mjs` pins the avatar hook's
  shrink (item 7 leaves it). `npm run check`.
- **Confidence**: high.
- **Notes**: Item 9 is optional: it removes one `PUBLIC_BY_DESIGN` entry and moves no bytes. Items 1-3 are
  in a `"use server"` file, so any new helper there must stay unexported (TRAPS: a non-async
  export breaks every importing route at runtime).

## Owner decisions

**1. A sentence on the email-confirmation page is wrong on busy days.**
- *What I'd change:* On the page people land on from a confirmation email, the "send me a new
  link" button says "Sent to your address" even on days the site has used up its daily email
  allowance and the email will actually go out the next morning. The banner and the pop-up
  already say the true thing on those days. I'd make the page say it too, by sharing one piece of
  code between all three.
- *What you'd notice:* only on a day the email limit is hit. The page would then say "We have
  hit today's email limit. Your link goes out tomorrow at 5:30 am IST" instead of "Sent".
- *If I guess wrong:* the wording on one rare screen changes. It is your own rule, already
  written into the banner, applied to the page that missed it.
- *Options:* (a) make the page match the banner; (b) leave the page saying "Sent".
- *If you don't reply I'll do:* (a). *(row: auth-onboarding-settings-06)*

**2. The small help bubbles on the join form. You already said yes; one detail is left.**
- *What I'd change:* In the last audit you chose "one piece of machinery for all the help
  bubbles, looking exactly as they do now". It was never done. I'd do it now. The two bubbles on
  the join form ("What does batch mean?" and the teacher's note) are the ones that move.
- *What you'd notice:* nothing, if I keep their current look. The one open question: you later
  said small text across these flows should be 14px, and these two bubbles use 12.5px.
- *If I guess wrong:* two bubbles are slightly bigger or smaller than you expect. It is one
  number to change back.
- *Options:* (a) keep them exactly as they look now (12.5px); (b) bring them up to 14px like the
  other help bubbles.
- *If you don't reply I'll do:* (a), because your answer last time said "look unchanged".
  *(row: auth-onboarding-settings-05, audit-2 G2)*

**3. Nothing else here needs a ruling.** Every feature in this territory is defended by a spec, a
recorded owner decision or an audit id: the entry question, the invisible bot check and its
hourly allowance, the five-minute human pass, the Wordle and the sleeping-bird gauntlet, the
90-day sign-in, the 60-day deletion grace, the data download, the roster auto-verify, and the
auto-join to your batch. None is a placeholder, and none is proposed for removal.

## Not-findings

- **The "three `User` session-row statements" (77,364 / 45,032 / 43,673 calls) are ONE caller
  across three eras, not three callers.** They are all the NextAuth session callback's `select`.
  `pg_stat_statements` keys by query text, and the counters date from 2026-05-22
  (`raw/db-stats-reset.json`), so each edit to the `select` became a new row. #48 has
  `avatarColor` beside `isBlocked` and `credentialVersion`, so it ran from 2026-08-20 (`dc062317`
  added the kill-switch columns) to 2026-08-27 (`1ec58be3` retired `avatarColor`). #49 has
  neither `avatarColor` nor `lastSeenAt`, so it ran 2026-08-27 to 2026-09-05. #21 has `lastSeenAt`
  (`29582b36`, 2026-09-05) and is today's. #92 (21,422) and #96 (11,004) are older eras still
  (before `emailVerified` was added on 2026-08-11, and before 2026-08-20). There is nothing to
  collapse: `auth()` is `cache()`d per request and runs exactly one `select`, and every column in
  it has readers (`session.user.<field>` grep: `role` 43, `name` 25, `emailConfirmed` 10, `email`
  9, `accountType` 6, `photoUrl` 5, `birdOverride` 5, `verifyState` 4, `batchYear` 3,
  `batchType` 2, `lastSeenAt` 1). The real lead hiding here is -01 (the claims nobody reads) and
  collection-media's second `User` read.
- **`validators.ts` is not "schemas used once, duplicated client/server".** Every schema has
  exactly one importer and all are server modules (`registerUser`, the profile actions,
  `createPost`, `createComment`, `createEntryComment`, the admin messages, the presence route,
  `collection-photo.ts`). No client component imports `validators.ts`, so zod does not reach a
  browser through it. "Used once" is the file's purpose: it is the one place several rule tests
  read (`post-caps.test.mjs`, `profile-editor-rule.test.mjs`, `email-normalization-rule.test.mjs`,
  `valley-day.test.mjs`). The duplication that exists is -19's.
- **`proxy.ts` and `api-gate.ts`: two gates, two jobs, not one policy written twice** (charter
  question 3). The proxy checks only that a session cookie EXISTS. It is the source of truth for
  which paths are public, for the demo's closed doors, for the canonical-host redirect, and for
  answering a cookieless request in the right language (a 307 to `/login` for pages, a 401 JSON
  for `/api`). It cannot know whether a cookie is still valid (a revoked session keeps its
  cookie, `proxy.ts:311-312`). `api-gate.ts` is the source of truth for what a route handler may
  do once it runs: origin (M33), a real session through `auth()`, the trust stage, and the meter.
  The only overlap is "no session, 401", and it is not really an overlap, because the proxy's
  version fires for a missing cookie and the gate's for a revoked one.
- **The first trivia question is fetched after mount on purpose.** Server-rendering it would save
  one action round trip per `/signup` visit, but the landing's stand-in (`auth-first-frame.tsx:62-109`)
  draws the gate "before its question has come back": "..." and a disabled Check. The real page
  must mount identical to that, or the flight hand-off pops. `auth-first-frame.test.mjs` pins the
  question line's classes and the copy.
- **`burnTokens` after a successful reset (`email-actions.ts:409`)** is redundant in theory: a
  reset mint already burns the older ones (`BURNS_ON_MINT.reset`), so after the claim there should
  be nothing left to burn. It is one `updateMany` on a credential path, as defence in depth. Keep it.
- **The `never` list on the trivia `Question` type (`70570bcd`)** is the minimal mechanism. The
  alternatives (require the guess, not just the candidate, to be five characters or more; or drop
  "folky") would break "foki" and "fokee", which the file relies on matching within one edit, or
  refuse an answer the owner asked to accept.
- **The split files** `bot-check-detail.ts`, `bot-check-message.ts`, `rate-limit-message.ts`,
  `turnstile-origin-rule.ts`, `human-pass-rule.ts` and `session-revocation.ts` exist because
  node:test cannot load a module with relative value imports (TRAPS, Testing) or because a
  client component must import the sentence without pulling Node crypto. They are not
  fragmentation.
- **The comment mass in `proxy.ts` (2.01), `rate-limit.ts` (1.68), `bot-check-message.ts` (3.86)
  and `auth-tokens.ts` (1.31)** is overwhelmingly reasons with dates, audit ids and owner quotes.
  The one clear case of restating the next line is `actions.ts:108` "// Check if user already
  exists" and `:117` "// Hash the password" (2 lines; include them in -22's pass if convenient).
- **`DUMMY_PASSWORD_HASH` (`auth.ts:43-54`)** is timing equalisation against a membership oracle.
  **The try/catch around all of `authorize()` (`:91-315`)** is the M18 fix (a DB failure must not
  read as "wrong password"), not defensive bloat.
- **`api-gate.ts`'s three separate vetters** stay separate (see -15), for the H21 probe.
- **`HoopoeWarmup` on `/login` and `/signup`** costs no bytes (bundle-build). Its runtime cost is
  audit-2 `auth-edge-04`, in E11's open mascot tail; not re-argued.
- **Deferring `next-auth/react`'s `signIn` to submit time.** Rejected. The module is about 18 KB
  unminified (`react.js` 15,154 B plus `lib/client.js` 2,987 B), a few KB gzipped. The member
  shell loads it anyway for `signOut`, and a submit-time fetch would slow the one moment the
  owner's hand-off choreography cares about.
- **`theme-actions.ts` writing the cookie on the server** (TRAPS: it re-renders the page). Keep
  it. Both callers navigate immediately after, so the re-render is absorbed (its own docblock
  makes this exact argument).
- **Auth.js's default `name`, `email` and `picture` claims.** The library's own; not removed in -01.
- **The `components/settings/` folder name**, for a `/settings` page that no longer exists. Its
  files serve the profile, onboarding and `/dark-mode`. Renaming it is import churn across about 10
  sites for zero bytes. Say it in `docs/` if anywhere.
- **`/welcome/loading.tsx` and `/dark-mode/loading.tsx`**: measured skeletons, correct (TRAPS: a
  loading frame the server never streams can still be photographed, and the welcome page's own
  comment explains when it paints).
- **`CelebrationSignals` passed as a prop into `OnboardingFlow`** (`welcome/page.tsx:82`) is
  deliberate: the client decides when the server component enters the tree.
- **`TURNSTILE_DEV_CHALLENGE` and `TURNSTILE_DEV_REAL`**: dev switches with incident history,
  settled in audits 1 and 2.
- **AuthToken's "44 dead" and LoginAttempt's 324 rows** (charter lead): the 44 are MVCC dead
  tuples from `usedAt` updates, below the autovacuum threshold (50 + 0.2 × 162 ≈ 82; last
  autovacuum 2026-08-28), not unswept expired rows. 324 login attempts is well inside the owner's
  one-year window. The cadence is fine. -07 is about where the sweep lives, not how often it runs.
- **`src/types/next-auth.d.ts` in `madge-orphans-filtered.txt`** is ambient module augmentation, a
  framework convention, not an orphan.
- **`instrumentation-client.ts`**: 10 lines, one job (`back-closes`), clean.
- **B6 and the welcome steps**: `onboarding-flow.tsx:47-69` lazy-loads the three heavy steps with
  preloads, as intended.

## Audit carry-overs in this territory

- **E7b / `auth-edge-02` (the Turnstile sentinel map): OPEN, and its shape has changed.** On
  2026-09-11 (`3558e96d`) sign-in stopped refusing a tokenless attempt. `/login` now maps
  `"interaction"` to `TICK_HUMAN_BOX` immediately but holds `"blocked"` back, sends the attempt
  with a `botFailHint`, and shows `BOT_CHECK_BLOCKED` only if the server refuses
  (`login-client.tsx:136-183`). `/signup` (`signup-form.tsx:399-413`) and `/forgot-password`
  (`forgot-client.tsx:76-90`) still refuse both sentinels at once and are identical to each other.
  So a `proof()` helper now serves two forms fully and `/login` for `"interaction"` only (it must
  return the raw `"blocked"` sentinel to login). The saving is about 10 lines, down from 25.
  Still true: nothing pins `TICK_HUMAN_BOX` or `BOT_CHECK_BLOCKED`
  (`scripts/qa/phase4-probe.mjs` asserts neither), so the only proof is a manual
  `TURNSTILE_DEV_CHALLENGE=1` pass on all three forms with a dev-server restart.
- **B1 / `auth-edge-01` (the float field's Popover stack): DONE** (`7c475940`; −145 KB raw measured
  on `/login`, `/signup`, `/forgot-password`, `/reset-password` and `/`). Holds: `float-field.tsx:21-24`.
- **B6 (the welcome wizard's steps lazy): DONE** (`onboarding-flow.tsx:61-69`; `/welcome`
  1,190 → 1,062 KB per bundle-build).
- **E7a / `auth-edge-03` (the trivia pass on the human-pass stamp): DONE.** `trivia-actions.ts`
  signs and checks with `signStamp` and `stampValid` from `human-pass-rule.ts`.
- **A14 / `auth-edge-06` and `-07`: DONE**, with a residue. `(auth)/layout.tsx` is gone and
  `hashToken` is private, but its docblock was appended to rather than rewritten, and now
  contradicts itself (-08).
- **`auth-edge-04` and `-05` (`HoopoeWarmup`; two handles to one bird): OPEN inside E11's mascot
  tail.** Both are still in the code (`login-client.tsx:15,386`, `signup-client.tsx:14,211`;
  `forgot-client.tsx:47-48` and `reset-client.tsx:68-69` hold `useHoopoe()` and an `apiRef`).
  Not re-argued.
- **`auth-edge-08` (the four `User` fields and the `GateResult` re-export): OPEN, never shipped.**
  Subsumed and extended by -01.
- **`auth-edge-09`, `-10`, `-12` and `-13`: OPEN, dropped in compilation.** They were never rows
  in audit 2's report or fix-prompt, and are re-issued as -21 (09, 10, 12, and 13's imports),
  -16 (13's "8") and -17 (13's `fail()` and `ACCOUNT_TYPES`).
- **`auth-edge-11` (stale comments): mostly DONE** (a, b, e, h). (f), the proxy's admin-login
  parenthetical, was left to the fixer and is still there, which is fine: it carries C1-b.
- **G2 (three help-bubble machines; the owner's Q7 answer (a), 2026-09-07): OPEN, never executed**
  (-05).
- **Audit-1 §5 "`DEMO_CLOSED_PATHS`'s unused export is the honesty check": RE-OPENED ON NEW
  EVIDENCE** (-02). Next 16's proxy runs on Node.js, and `demo.ts` never had imports.
- **Refuted rows touching these files, holding:** the `withMember`/`withAdmin` wrapper (every
  action here still opens with its own `auth()`, which is gate-coverage's C-189 contract). Replacing
  `bcryptjs` stays declined (`auth.ts`, `components/auth/actions.ts`, `settings/actions.ts`,
  `email-actions.ts` are its four users). Neither is re-opened.

## For other lenses

- **collection-media / data-layer**: `src/lib/collection-viewer-facts.ts:18-21` and
  `src/app/(main)/collection/collection-data.ts:285-286` justify a second `User` read per Collection
  request with "a JWT claim is minted at sign-in / can be an hour stale". That is false here:
  `session.user.verifyState` and `batchYear` are read from the row on every request
  (`auth.ts:374-421`). `viewerFacts` adds only `photoTrusted`. Either add `photoTrusted: true` to
  the session `select` (one boolean on a read that already happens) and read all three off the
  session, or keep `viewerFacts` for `photoTrusted` alone. That saves 1 `User` query per Collection
  page load and per `loadPhotos` call. Pair it with -01 so the misleading token claims go too.
- **bundle-build**: correction to bundle-build-02's "(`/dark-mode` keeps it: the gauntlet is the
  bird)" and to its "`/dark-mode` at 1,085 KB is by design" note. Since the 2026-09-21 rebuild, the
  bird exists only in step 6 (`SleepTrial`). See -03.
- **lib-core-config**: `src/lib/origin.ts:11-14` says the proxy "is bundled for the edge runtime,
  which is why it says it cannot import `demo.ts`; the obstacle there is that module's own
  dependencies". Both halves are false on Next 16.3.3 (-02).
- **root-instructions-tooling**: `.claude/agents/write-path-reviewer.md:45` teaches every
  write-path review that "`proxy.ts` runs on the edge runtime and therefore **cannot import**
  `src/lib/demo.ts`". It is false on Next 16 (-02) and should change in the same commit.
- **common-primitives**: `FadeRise` (`src/components/common/motion.tsx:118-140`) has zero non-lab
  callers, and `src/app/lab/_kit.tsx:53` defines its own `FadeRise`. If -12's `StepSwap` lands,
  consider whether `FadeRise` should gain an `exit` and become it.
- **bug lens (the peer session decides)**: `member-verify-dialog.tsx:76-81` and
  `verify-email-dialog.tsx:147-152` draw an error string in the same leaf-tinted box with a green
  `BadgeCheck` / `MailCheck` icon they use for success. The three consent links in
  `signup-form.tsx:675-685` have no `focus-visible` style. `verify-client.tsx:114` says "Sent"
  for a queued mail (fixed by -06). `(auth)/error.tsx:37-39` nests a button in a link (fixed by
  -21).
- **lib-tests**: `gate-coverage.test.mjs:130-131` names the theme actions as Pass 2's example;
  after -13, three messages actions remain its users. `demo.test.mjs:220-236` and the header of
  `proxy-rule.test.mjs` carry the false edge premise (-02).
- **scripts-e2e-ci**: `scripts/qa/audit-status.mjs:327-328` (H22's comment) names `verifyTurnstile`,
  which -14 deletes. The probe's regex stays correct.
- **admin-analytics**: `src/app/(main)/admin/people/actions.ts:66` (`ACCOUNT_TYPES`) and
  `:543-545` (the purge-outcome sentence) are the other halves of -19 and -09.
- **catchups-lib**: I agree with catchups-lib-14's reading of `promoteOrphanedGroups`
  (`account-purge.ts:46-83`, which writes `"admin"`). If the owner says yes, the purge should call
  the same helper as `leaveCatchup`.
- **data-layer**: `User.gradeJoined` has no writer. Its readers are the data export
  (`api/account/export/route.ts:119`) and six lab profile variants. The comments in `validators.ts`
  and `components/auth/actions.ts` say so honestly. It is a column question, not mine.

## Metrics

- **Lines read**: 12,029 across the 65 territory files, all read fully. About 1,900 more across
  the adjacent files and pins listed in Coverage.
- **Territory composition (cloc)**: code 6,930 · comment 4,331 · blank 768 · comment/code 0.62.
- **Comment-heaviest (comment/code)**: `bot-check-message.ts` 3.86 · `bot-check-detail.ts` 2.79 ·
  `proxy.ts` 2.01 · `instrumentation.ts` 1.88 · `app-secret.ts` 1.80 · `rate-limit.ts` 1.68 ·
  `theme-actions.ts` 1.62 · `turnstile.ts` 1.39 · `auth-tokens.ts` 1.31 · `login-attempt.ts` 1.30.
- **Biggest files (physical lines)**: `signup-form.tsx` 701 · `dark-gauntlet.tsx` 602 · `auth.ts`
  528 · `account-purge.ts` 472 · `email-actions.ts` 433 · `proxy.ts` 422 · `login-client.tsx` 389 ·
  `avatar-crop-dialog.tsx` 373 · `retention.ts` 364 · `account/export/route.ts` 349 ·
  `rate-limit.ts` 338 · `trivia-actions.ts` 332 · `auth-tokens.ts` 329.
- **Findings**: 23. By tier: T1 9 (08, 13, 14, 16, 18, 20, 21, 22, 23) · T2 12 (01, 02, 03,
  04, 06, 07, 09, 11, 12, 15, 17, 19) · T3 2 (05, 10) · T4 0. By class: structural 14
  (01-14) · cheap 9 (15-23). Autonomous 23 (06 and 05 each carry a small owner question, above).
- **Projected savings** (honest units, before measurement): roughly 450-550 source lines net
  (the per-finding estimates add to about 590 gross, and each dedupe row pays back a docblock and
  imports, per audit 1's lesson); about
  40-60 KB raw off `/dark-mode` and about 25-30 KB raw off `/signup` first load; about 3-4 KB off
  signup's register chunk; about 70 bytes of cookie on every request; 1 `User` query per
  Collection request (with collection-media's half); 2 queries per account purge; 1 `DELETE` per
  email sent; one 20-line duplicated security list and its mirror test; 2 knip lines
  (`verifyTurnstile`, `BotCheckFailure`) plus the `DEMO_CLOSED_PATHS` export; about 14 of the 17
  jscpd clones touching the territory (201 lines).
- **jscpd clones touching territory**: 17 clones, 201 lines (login↔signup shell 4/59; api-gate
  internal 3/49; verify dialogs and banner 2/26; onboarding steps 2/21; forgot↔reset step fades
  2/12; signup-client internal 1/8; login↔signup-form error line 1/10; settings↔collection upload
  checks 1/7; signup-form↔photo-questions 1/9).
- **Pins named in this report**: `security-regressions.test.mjs` (C1-a, C1-b),
  `session-revocation.test.mjs`, `auth-flow-rule.test.mjs` (C-032, C-034, C-035),
  `gate-coverage.test.mjs` (Pass 2, `PUBLIC_BY_DESIGN`), `demo.test.mjs` (mirror test),
  `proxy-rule.test.mjs` (`publicPaths` regex), `auth-first-frame.test.mjs` (`COPIED`, entrance),
  `catchup-pictures.test.mjs` (purge spellings), `purge-rule.test.mjs`, `unattended-rule.test.mjs`
  (C-076, C-118, C-154), `login-attempt-rule.test.mjs`, `verify-outcome-rule.test.mjs`,
  `profile-editor-rule.test.mjs`, `focus-recipe.test.mjs`, `upload-size-rule.test.mjs`, and
  `scripts/qa/audit-status.mjs` H21 and H22.
- **Live DB facts used**: session-callback statements #21/#48/#49/#92/#96 (198,495 calls in all
  since 2026-05-22); User deletions #117 (15 calls); AuthToken 162 live / 44 dead tuples;
  LoginAttempt 324 live / 32 dead; AuthToken indexes (`tokenHash_key` 222 scans, `expiresAt` 507,
  `userId_kind_createdAt` 575).

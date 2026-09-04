# auth-edge-a — adversarial verification notes

Verifier: `auth-edge-a`. Date: 2026-09-04. Tree HEAD at verification: **`74cc61a`**
("fix(retention): notifications are kept 30 days, everywhere"), one commit past the
`72b5a1d` the find phase measured. That commit touches `scripts/ops/prune.mjs`,
`src/lib/retention.ts`, `src/lib/post-notifications.ts`, `src/app/(main)/notice/[id]/page.tsx`,
`src/app/(policies)/privacy/page.tsx`, `src/lib/notification-reach.test.mjs` and three docs —
**nothing in this cluster's territory**, so every line number below was re-derived at
`74cc61a` and is directly usable.

Uncommitted work in the tree at verification time: `docs/audit-fix/README.md` (M),
`progress.md` (M), and the untracked audit folder. No source file in this territory has
uncommitted edits.

Method: read-only. `grep`/`sed`/`cat`/`node -e`/`du`/`git log`. No build, no tsc, no knip,
no browser, no database, no network. Charter is security-sensitive, so for every dedupe I
diffed the two implementations line by line rather than trusting the finder's summary — that
is where two of the corrections below came from.

---

## auth-edge-02 — Turnstile token dance written three times → `proof()`  **CONFIRMED**

Re-derived at HEAD, all three ranges are exact:

- `src/app/(auth)/login/login-client.tsx:129-149` — comment 129-134, `getToken()` at 135,
  `"interaction"` branch 136-140, comment 141-144, `"blocked"` branch 145-149.
- `src/components/auth/signup-form.tsx:395-414` — comment 395-397, `getToken()` at 398,
  interaction 399-405, comment 406-407, blocked 408-413, `formData.set` at 414.
- `src/app/(auth)/forgot-password/forgot-client.tsx:74-91` — same shape, 18 lines.

The three branches are identical in effect: `"interaction"` → `setError(TICK_HUMAN_BOX)`,
`"blocked"` → `setError(BOT_CHECK_BLOCKED)`, anything else → attach. The per-page differences
are exactly the three the finding names (login attaches to `signIn` and plays no beat; signup
calls `hoopoe.react("error")`; forgot calls `apiRef.current?.react("wrong")` and uses
`setSending` not `setLoading`).

`getToken` has exactly three call sites (grep across `src`, `scripts`, `e2e`):
login-client:135, signup-form:398, forgot-client:75. `TurnstileHandle` is declared at
`turnstile-widget.tsx:106-113` with `getToken` at :107; the `useImperativeHandle` body is
`:218-256`. `TurnstileFailure = "interaction" | "blocked"` at :104, documented at :94-103.
`bot-check-message.ts` is genuinely dependency-free (no imports at all), so the "use client"
widget can import the sentences — confirmed by reading the file.

**No C-189 hazard.** `turnstile-widget.tsx` is `"use client"`, not `"use server"`; adding a
method to a `useImperativeHandle` object is not an export-shape change, so it is nothing like
the withMember/withAdmin factory audit 1 refuted.

Savings are honest: 21 + 20 + 18 = 59 lines of branch today, ~6 lines each after (18), plus a
~14-line `proof()` in the widget → net ≈ −27. The report's "~25" is right.

### Correction to the gate line (important)
The report writes: "`scripts/qa/phase4-probe.mjs` asserts the UI shows them". It does not.
`grep -rn --include='*.mjs' -e TICK_HUMAN_BOX -e "Verify you are human" -e "tick the"` over
`src scripts e2e` returns **zero** hits on those sentences (`phase4-probe.mjs:262` matches only
on the word "tick" in a comment about the Phase 8 consent checkbox). The only `.mjs` files
mentioning Turnstile at all are `scripts/qa/_probe-kit.mjs`, `scripts/qa/phase4-prod-check.mjs`
and `src/lib/turnstile-origin-rule.test.mjs`, and the last of those pins `normaliseHost`/
`sameOrigin`, not the copy. **So nothing automated pins these two refusal sentences.** The fix
session must do the `TURNSTILE_DEV_CHALLENGE=1` manual pass on all three forms; there is no
test that will go red if the mapping is wired up wrong.

### Note for the fixer
`proof()` must keep three outcomes distinct, not two: `null` (widget tried and could not —
still submit, the server decides) is different from the two sentinels (do not submit). The
report's `{ token: string | null } | { refusal: string }` shape does preserve that; a naive
`string | null` return would silently turn a recoverable failure into a refusal.

---

## auth-edge-03 — two HMAC-stamped cookie tokens  **CONFIRMED WITH CORRECTION**

Everything structural checks out at HEAD:

- `trivia-actions.ts:1` is `"use server"` (so the finder is right that shared helpers cannot
  be exported from there — TRAPS / C-189).
- `sign()` at `trivia-actions.ts:187-189`. Mint at `:306-307`
  (`const ts = Date.now();` / ``const token = `${ts}.${sign(`trivia:${ts}:${browserId}`)}`;``).
  `hasPassedTrivia` at `:319-335`, `timingSafeEqualStrings(...)` at `:334`.
- `human-pass-rule.ts:13-19` `signHumanPass`, `:22-41` `humanPassValid`. Exact ranges.
- `human-pass-rule.test.mjs` has **9** `test(` blocks. ✓
- `gate-coverage.test.mjs:42-45` names `getTriviaQuestion`, `checkTrivia`, `hasPassedTrivia`
  under PUBLIC_BY_DESIGN. ✓
- `timingSafeEqualStrings` has 4 importers today (`api/dev-login/route.ts:37`,
  `trivia-actions.ts:7`, `api-gate.ts:7`, `turnstile.ts:2`), so dropping trivia's leaves 3. ✓

### The correction: the two parsers are NOT the same, and merging them changes trivia's behaviour
`humanPassValid` (`:29-40`) does `indexOf(".")`, slices the ts off the front, and then compares
the **entire value** against a freshly signed **entire value**:

```
const expected = Buffer.from(signHumanPass(email, ts, secret));   // `${ts}.${sig}`
const got = Buffer.from(value);                                    // the whole cookie
```

`hasPassedTrivia` (`:323-334`) does `token.split(".")`, destructures `[tsStr, sig]`, and
compares **only the middle segment**:

```
const [tsStr, sig] = token.split(".");
...
return timingSafeEqualStrings(sign(`trivia:${ts}:${browserId}`), sig);
```

So a cookie of the form `"<ts>.<validsig>.anything"` is **accepted today by the trivia gate and
rejected by the human pass**. Re-expressing `hasPassedTrivia` on a shared `stampValid` tightens
that. It tightens in the safe direction (an attacker gains nothing — they still need a valid
sig, which they cannot forge without `AUTH_SECRET`, and the cookie is their own), so this is
not a vulnerability today and not a reason to refuse the finding. But it IS a behaviour change
on a signup gate and the fix session must (a) know it is making it, and (b) add a vector for it
to the test file rather than discovering it as a mystery failure in `phase4-probe.mjs`.

Second, smaller difference: `humanPassValid` takes `now` as a parameter (which is what makes
the nine attack tests possible); `hasPassedTrivia` calls `Date.now()` twice inline at `:332`.
The generalised `stampValid(value, label, subject, now, ttlMs, secret)` signature the report
proposes already handles this — good — and the fixer should pass one captured `now`, not two
`Date.now()` calls, or the expiry and future-skew checks read different clocks.

Third: `signHumanPass` lowercases its subject (`email.toLowerCase()`); trivia's subject is a
`crypto.randomUUID()` browser id. If `signStamp` keeps the lowercase inside itself the trivia
sig changes value for any uppercase hex — `randomUUID()` emits lowercase, so this is harmless
in practice, but the lowercase belongs at the human-pass call site, not inside the shared
helper. **Every live trivia pass cookie is invalidated the moment this ships either way**
(the label/format is unchanged but any re-derivation risk lands on a 30-minute cookie); that is
a non-event — worst case somebody mid-signup answers the entry question once more.

Verdict: confirmed in substance, with those three corrections written into the steps.

---

## auth-edge-04 — `HoopoeWarmup` on /login and /signup  **CONFIRMED**

- `HoopoeWarmup` has exactly three mount sites: `login-client.tsx:377`,
  `signup-client.tsx:215`, `landing-hero.tsx:445`. Imports at `:15`, `:14`, `:12`. ✓
- Both auth pages render a real, **unconditional** `<Hoopoe>` at first paint:
  `login-client.tsx:245` (`size={102}`) inside a plain `<div ref={hoopoeBoxRef} data-hoopoe-perch
  style={{ opacity: hoopoeShown ? 1 : 0 }}>` — opacity 0, still mounted, still laid out and
  painted — and `signup-client.tsx:159` (`size={96}`). I read the surrounding 50 lines of
  login-client to confirm there is no `{cond && (` above it. There is not.
- Part 1 of the warmup (`void import("./hoopoe")`, `hoopoe-warmup.tsx:56`) is provably a no-op
  on these two pages: both statically `import { Hoopoe } from "@/components/mascot/hoopoe"`
  (login-client:11, signup-client:10), and the flight layer's lazy import is the same specifier
  (`mascot-flight-layer.tsx:48`: `dynamic(() => import("./hoopoe").then((m) => m.Hoopoe))`).
- Part 2 (mount an off-screen `<Hoopoe size={96} idle={false}/>` for two rAFs,
  `hoopoe-warmup.tsx:93-98`) pre-pays a cost the page's own bird has already paid before the
  idle callback can fire.
- The mount comment on both pages ("in case a visitor lands here directly and bounces back to
  the landing hero to fly again") is answered by the same two facts.

Confirmed. The one thing I could not settle read-only is whether anyone ever *measured* a
stutter on the second flight that only this mount fixed — `git log -S HoopoeWarmup` puts it in
`36e17cd` with no measurement, as the finder says, and the component's own 39-line header
argues the landing case only. If the orchestrator wants belt-and-braces, this is the one item
in the cluster worth an `unverifiable-needs-browser` follow-up *after* the change, not before:
land → Sign in → back → Sign in at 1440 and at 390, watching the second fly-in.

---

## auth-edge-05 — "the three email-flow clients hold two handles"  **CONFIRMED WITH CORRECTION**

It is **two** clients, not three.

- `forgot-client.tsx` — `useHoopoe()` at `:47`, `apiRef` at `:48`, filled at `:62`, used at
  `:80`, `:88`, `:102`, `:114`; the wrapper used at `:153` (`hoopoe.gaze(`). Two handles. ✓
- `reset-client.tsx` — `useHoopoe()` at `:68`, `apiRef` at `:69`, filled at `:79`; wrapper
  verbs at `:95-96` (`hoopoe.peek()` / `hoopoe.coverEyes()`), `:226`, `:237`; raw handle at
  `:113`, `:114`, `:130`, `:131`, `:138`. Two handles. ✓
- `verify-client.tsx` — **`grep -n "apiRef" ` returns nothing.** Line 71 is
  `const { ref: hoopoeRef } = useHoopoe();` and the only verbs are inside
  `onHoopoeReady(api)` at `:83-105`, called on the `api` argument. That is precisely the
  pattern the finding itself exempts for /login and /signup ("their `runIntro` receives `api`
  from the hook and uses it inside that callback only, which is the shape the hook
  documents"). So verify-client is already correct and there is nothing to change there; the
  report's own "what to do" for it ("or simply `const hoopoe = useHoopoe()` and pass
  `hoopoe.ref`") is a rename, not a saving.

Also: the report says "reset-client.tsx:84,114 even calls `coverEyes` through both handles".
At HEAD it is **`:96` and `:114`** (`hoopoe.coverEyes()` in the reveal effect, then
`apiRef.current?.coverEyes()` in the two failure paths). The observation stands, the line
number does not.

`use-hoopoe.ts:51-85` confirms the premise: the returned object wraps **every** verb, including
all five taken through `apiRef` (`express` :71, `celebrate` :72, `nod` :64, `shake` :65,
`react` :80, plus `coverEyes` :75, `peek` :76, `gaze` :74), and `use-hoopoe.ts:5-7` states
pre-mount calls "resolve harmlessly" — `p()`/`v()` at `:37-49` return `Promise.resolve()` /
do nothing when `ref.current` is null, so no throw is possible.

Corrected saving: ~8 lines across **two** files, not ~12 across three. Still low risk, still
cheap-class.

---

## auth-edge-06 — `(auth)/layout.tsx` is a no-op wrapper  **CONFIRMED**

The whole file is 9 lines and the body is
`return <div className="min-h-screen bg-background">{children}</div>;` (`:8`), under a comment
at `:6-7`. Verified at HEAD:

- `globals.css:384-386` — `body { @apply bg-background text-foreground; }` (the `@apply` is
  line 385). The finding's range is exactly right. ✓
- Every child sets its own `min-h-screen`: `login-client.tsx:198`, `signup-client.tsx:103`,
  `auth-panel.tsx:126` (which is what forgot/reset/verify render), `error.tsx:26`. All four
  read `<div className="... min-h-screen ...">` as the outermost element. ✓
- The comment is false twice over as claimed: `signup-client.tsx:103-104` is the identical
  `min-h-screen lg:pl-[58.3333%]` photo-split as login, and there is no onboarding route under
  `(auth)` — `find src/app/(auth) -type f` returns 12 files, none of them `/welcome`.
- `(auth)/error.tsx` does not need a sibling layout to work; it nests under the root layout.

Confirmed, T1, delete the file.

---

## auth-edge-07 — `hashToken` exported for a caller that no longer exists  **CONFIRMED**

Exact at HEAD: docblock `auth-tokens.ts:61-76`, `export function hashToken` at `:77-79`.
Callers: `:121`, `:183`, `:275` — all three inside the same file. The only mention anywhere
else is the comment at `email-actions.ts:175`. `raw/knip-repo-config.txt:67` reads
`hashToken function src/lib/auth-tokens.ts:77:17`. ✓

The docblock's argument is self-refuting exactly as described — `:69-71` says "So the claim is
repeated against `tx` -- see `claimToken` below, which is where that now lives", and
`claimToken` is in this same file (`:81` onward), so no external importer is needed. Dropping
the `export` keyword is safe; nothing does a dynamic or string-keyed import of it (checked
`src`, `scripts`, `e2e`, `prisma`).

---

## auth-edge-08 — dead type re-export + four dead `User` fields  **CONFIRMED WITH CORRECTION**

`GateResult`: defined `email-verification.ts:37`; imported `member-gate.ts:4`; re-exported
`member-gate.ts:29`; used in `member-gate.ts:41`. Four hits total across `src` — no third file.
Delete `:29`. ✓

The `next-auth.d.ts` half is right in substance and **wrong in its line range**. The report
says `:43-48`, which reads as a contiguous block. At HEAD:

```
38  interface User {
39    role?: string;
40-42 /** docblock */ credentialVersion?: number;
43    accountType?: string;      <- dead
44    verifyState?: string;      <- dead
45    batchType?: string | null;   KEEP (jwt() copies it, auth.ts:300)
46    batchYear?: number | null;   KEEP (jwt() copies it, auth.ts:301)
47    photoUrl?: string | null;  <- dead
48    birdOverride?: string | null; <- dead
```

The four to delete are **43, 44, 47, 48** — not a range. (The report's "what to do" prose gets
this right; only the `Where` line is misleading, and a fixer working from the index summary
alone would cut the two live ones.)

The evidence behind "dead" holds: `authorize()` returns exactly
`id, name, email, role, batchType, batchYear, credentialVersion` (`auth.ts:239-253`) and
`jwt()` copies exactly `id, role, batchType, batchYear, credentialVersion`
(`auth.ts:297-309`). `accountType`/`verifyState`/`photoUrl`/`birdOverride` are written onto
`session.user` from the fresh row at `auth.ts:348-361`, which is the `Session` augmentation
(`next-auth.d.ts:17,20,33,34`), a different interface. I also checked the one other place that
could mint a `User`: `api/dev-login/route.ts:108` uses `encode({ token: {...} })`, i.e. the
`JWT` augmentation, never `User`. Nothing else produces one (JWT strategy, no adapter).

---

## auth-edge-09 — `AuthPanel`'s `hoopoeSize` prop  **CONFIRMED**

`grep -rn hoopoeSize src` returns exactly three lines, all inside `auth-panel.tsx`: `:89`
(`hoopoeSize = 102,`), `:99` (`hoopoeSize?: number;`), `:152`
(`<Hoopoe ref={hoopoeRef} size={hoopoeSize} onReady={handleReady} />`). All three `<AuthPanel`
call sites (`verify-client.tsx:120`, `reset-client.tsx:159`, `forgot-client.tsx:122`) pass
`back`, `hoopoeRef`, `onHoopoeReady` and nothing else — I read the seven lines after each. ✓

---

## auth-edge-10 — email canonical form spelled by hand twice more  **CONFIRMED WITH CORRECTION**

- `login-attempt.ts:48` is `email: input.email.trim().toLowerCase().slice(0, 200),` —
  character-for-character `normalizeEmail` + the `EMAIL_MAX` cap. ✓
- `forgot-password/page.tsx:9-11` is `looksLikeEmail`, used at `:29`; it accepts up to **254**
  where `EMAIL_MAX` (`email-address.ts:32`) is **200**, so the finding's "the prefill accepts
  what the server refuses" is real. ✓

Two corrections:

1. **"a third email regex in the codebase" overstates it.** `grep -rn '\[\^\\s@\]'` over `src`
   and `scripts` returns exactly **two** hand-written regexes: this one and
   `scripts/dev/import-roster.mjs:112`, which is a dev script outside the app. Everything else
   goes through `z.email()`. So the fix removes the last hand-rolled email regex *in `src`*,
   which is a better way to say it.
2. The proposed replacement is internally inconsistent: `emailField().safeParse(email).success`
   is a boolean, so keeping `? email : ""` prefills the **raw** string — the box does *not*
   "open lowercased" as the report claims. The fixer should use
   `const parsed = emailField().safeParse(email); const prefill = parsed.success ? parsed.data : "";`
   if the lowercasing is wanted, and should decide deliberately: prefilling `Foo@x.com`
   lowercased is a visible change to what the member sees echoed back, and
   `forgot-client.tsx:34-37` argues at length that this screen exists to echo what they typed.
   My read: keep `email` raw, use `.success` only, and drop the "opens lowercased" sentence.

Also note `EMAIL_MAX` is module-private (`const EMAIL_MAX = 200;`, not exported), so
`login-attempt.ts` keeps the literal `200` unless the fixer exports it. Fine either way; say so
rather than leaving a fixer hunting for an import that does not exist.

---

## auth-edge-11 — eight comments describing deleted or moved code  **CONFIRMED**

I opened all eight. Every one is where the report says it is:

(a) `email-actions.ts:29-32` — a four-line `/** Matches the signup rule ... */` docblock with
    **no declaration under it**; line 34 starts a section divider. ✓
(b) `rate-limit.ts:203-206` — `/** Count this event against the limit ... one line after the
    member gate */` sits directly above `reportLimiterFailure`'s own docblock (`:207-220`),
    then `REPORT_EVERY_MS` (:221), `lastReported` (:222), `reportLimiterFailure` (:224), and
    only at **`:232`** `export async function rateLimit`. Two declarations away, exactly. ✓
(c) `email-verification.ts:72-73` — the two-line `// viewerMaySeeContacts moved to
    member-gate.ts on 2026-08-20 ...` tombstone. ✓
(d) `mask-email.ts:4-7` — claims the "check your inbox" screen masks the typed address and
    that a client component would otherwise "pull the Resend SDK". Both halves are stale:
    `forgot-client.tsx:34-37` says the screen shows it **unmasked** on purpose, and all four
    importers of `maskEmail` are server modules (`(main)/layout.tsx:10`,
    `email-actions.ts:7` — a `"use server"` file, `email.ts:3`, `email-queue.ts:5`). ✓
(e) `login-client.tsx:276-281` — "That bypass is being removed" in the present progressive; it
    was removed 2026-08-19. Six lines. The *next* comment (`:282-292`) is the argued reason for
    the missing `initial` and is pinned — keep, as the report says. ✓
(f) `proxy.ts:58-61` — the admin-login parenthetical, exact lines. Carries the C1-b id;
    fixer's call. The `/api/places` paragraph the report says to KEEP is `:66-75`. ✓
(g) duplicate of auth-edge-06. ✓
(h) `auth-panel.tsx:180` — "34ch, not /login's 30". `grep -rn 30ch src` finds no `30ch` in
    `login-client.tsx` (only three lab files and this comment), and `login-client.tsx:249-251`
    is an explicit `{/* No subtitle: same calm-form language as /signup (owner, 2026-08-14) */}`.
    So there is nothing for /login's 30 to differ from. ✓

No test can be tripped: every rule test decomments before matching (the pattern is documented
in the rule files themselves), and none of these lines is inside a pinned string.

---

## auth-edge-12 — `(auth)/error.tsx` nests `<Button>` inside `<Link>`  **CONFIRMED**

`error.tsx:37-39` is exactly:

```
        <Link href="/login">
          <Button variant="outline">Back to sign in</Button>
        </Link>
```

and the two siblings use the house idiom: `reset-client.tsx:181-189` and
`verify-client.tsx:129-136`, both `nativeButton={false} render={<Link href=... />}`. Not a
baselined route, so `npm run visual` will not see it either way; the manual proof (throw once
under `(auth)`, press the button) is the right gate.

---

## auth-edge-13 — signup-form odds and ends, the literal "8", duplicate imports  **CONFIRMED WITH CORRECTION**

- `ACCOUNT_TYPES` declared inside the component at `signup-form.tsx:354-357`, `as const`,
  rebuilt every render. ✓
- Four identical `setError(...); hoopoe.react("error"); setLoading(false); return;` blocks at
  **`:368-391`** (the report says 366-392; the first `if` opens at 368 and the last `}` is 391).
- The hand-typed "8": `signup-form.tsx:369` ✓ and — correction — `actions.ts:**37**`, not
  `:38`. Line 36 is `if (!password || password.length < MIN_PASSWORD) {`, line 37 is the
  `return { error: "Password must be at least 8 characters." };`. `MIN_PASSWORD = 8`
  (`password-rule.ts:32`), so the sentence is true *today* and lies the day the floor moves;
  the two files that already template it are `password-rule.ts:56` and `email-actions.ts:322`,
  both confirmed. ✓
- Duplicate imports from the same module confirmed in all three files:
  `login-client.tsx:12`+`:27`, `forgot-client.tsx:10`+`:17`, `reset-client.tsx:10`+`:17`
  (`useHoopoe` and `gazeFor`, same specifier). ✓

One caution for the fixer on the `fail` helper: the four blocks call `setLoading(false)` and
the *Turnstile* refusals two dozen lines further down do the same thing but are inside the
`try`. If the helper is introduced, use it in the four validation blocks only, or check that
the Turnstile branches' `hoopoe.react("error")` ordering is preserved — they set the error
BEFORE the reaction in both cases today, so a shared helper is fine, but do not also fold in
forgot-client's `react("wrong")`/`setSending` variant.

---

## dependency-diet-08 — drop the `resend` SDK for one `fetch`  **CONFIRMED WITH CORRECTION**

Facts, all re-verified at HEAD:

- `package.json:59` `"resend": "^6.9.4"`; installed 6.20.0. Sole importer in `src`, `scripts`,
  `e2e`: `src/lib/email.ts:1`. ✓
- The whole surface used is `new Resend(key)` (`email.ts:63-68`) and
  `api.emails.send({from,to,subject,html,text})` (`email.ts:208-214`) returning
  `{ data, error }` (`:222`). One POST. ✓
- `src/app/api/resend/webhook/route.ts` imports only `next/server`, `node:crypto` and
  `@/lib/prisma` — the signature check really is hand-rolled, so dropping the SDK does not
  touch it. ✓
- Package count and size: `resend` → `postal-mime` 2.7.5 + `standardwebhooks` 1.0.0 →
  `@stablelib/base64` + `fast-sha256`. **5 packages**; `du` on disk 268K + 348K + 36K + 84K +
  40K = **776 KB ≈ 0.8 MB**. ✓ Both numbers are honest.
- Client bytes: 0 either way; `email.ts:250-253` explains the split that keeps it server-side. ✓

### Correction 1 — the finding's own abandon condition is already met
The report says: "the fixer must confirm they read only `error.message`/`error.name` (which the
raw JSON body also carries) before touching anything", and under Confidence: "if
`mail-policy.ts`'s classifiers reach into SDK-specific error fields (a `statusCode`, a typed
class) ... abandon this."

They do. At HEAD, `mail-policy.ts:175-179` declares

```
export type MailErrorLike = { name?: string | null; statusCode?: number | null; message?: string | null };
```

and `isTransientMailError` (`:182-191`) reads all three, with `statusCode` carrying its own
rule: `if (typeof err.statusCode === "number" && (err.statusCode === 429 || err.statusCode >= 500)) return true;`
— "429 and every 5xx, whatever the code happens to be called this year" (`:185`). So a literal
reading of the finding says stop. In practice a raw `fetch` is *better* here (`res.status` is
right there, and the SDK's typed `ErrorResponse` does not reliably carry `statusCode` at all),
but the fixer must be told to set `statusCode: res.status` on the mapped object or
`isTransientMailError` quietly loses its 429/5xx arm — and losing it turns a retryable outage
into permanently retired queue rows. That is the single most dangerous line in this proposal
and the report does not name it.

### Correction 2 — the AbortSignal argument does not do what the report says
The report's strongest claim is that a real abort "removes both the race and **the reason
`DAILY_CAP` keeps a buffer**". It does not. `email-queue.ts:76-82` gives the reason for the
buffer as: "Resend counts what IT accepted, and a retry after a network timeout can land as a
second accepted message where we recorded none." `AbortSignal.timeout()` closes the client's
end of a request that has already been sent; it cannot un-accept a POST Resend has already
processed. The 5-message cushion is warranted with `fetch` exactly as it is with the SDK, and
`email.ts:206-207`'s comment would need a rewrite, not a deletion.

With both corrections the case shrinks to: **−1 dependency, −5 lockfile packages, −0.8 MB
install, a slightly tidier timeout (a real cancel instead of a dangling promise), 0 lines, 0
client bytes**, on the money-adjacent mail path, in exchange for hand-maintaining an error
mapping that three separate classifier arms depend on. The finder already wrote "if the fix
sessions are short on time, this is the first thing to cut from the list" — I agree, and after
correction 1 I would put it below that: this is the lowest value-per-unit-risk item in the
cluster. Recommend the orchestrator park it unless the owner specifically wants the dependency
count down.

---

## Cross-cluster overlaps noticed
- `lib-core-config-13` ("delete the comment at the end of `email.ts` that explains an export
  removed in audit 1") lands in the same file and within ~15 lines of the
  `dependency-diet-08` edit region (`email.ts:250-253`). If both are taken they should be one
  commit; if `dependency-diet-08` is parked, `lib-core-config-13` still stands alone.
- `duplication-07` ("the auth pages hand-type the heading `AuthHeading` already owns") touches
  `auth-panel.tsx` / the three email clients, i.e. the same files as auth-edge-05, -09 and
  -11(h). Sequence them: take auth-edge-09 and -11(h) (both inside `auth-panel.tsx`) in the
  same pass as duplication-07 to avoid two rounds of `npm run visual` on the same component.
- `lib-core-config-16` ("two exports that nothing imports, and the rule tests that pin their
  `export` keyword") is the same *class* as auth-edge-07 and auth-edge-08. Worth checking
  whether any rule test pins `export function hashToken` before the `export` keyword is
  dropped — I grepped and found none (`verify-outcome-rule.test.mjs` matches `reason: "used"`
  and the `BURNS_ON_MINT` table, not the signature), but the fixer for lib-core-config-16 will
  have the sharper picture of that pattern and should confirm.

## What I could not settle read-only
Nothing in this cluster needs the database. One item would benefit from a browser, and only
*after* the change, not to justify it: auth-edge-04 (watch the second cross-page fly-in at 1440
and 390 once `HoopoeWarmup` is gone from the two auth pages). Everything else is settled by the
tree.

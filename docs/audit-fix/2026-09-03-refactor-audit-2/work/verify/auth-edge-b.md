# auth-edge-b - adversarial verification notes

Verifier charter: auth, the proxy, API routes, email, the sign-in surfaces. Read-only.
Tree state when verified: HEAD `74cc61a` ("fix(retention): notifications are kept 30 days,
everywhere") -- note this is LATER than the `72b5a1d` the find phase measured against.
`git status --short`: only `docs/audit-fix/README.md`, `progress.md` (someone else's WIP) and
the untracked audit folder. **No file I judged has uncommitted edits.**

13 findings checked: directory-profile-27, duplication-03/07/12, feed-posts-06,
lib-core-config-02/09/10/11/13/15/16, lib-tests-07.

Result: 6 confirmed, 7 confirmed-with-correction, 0 refuted. Finder quality in this cluster is
high; the corrections are line-number drift, one overstated failure mode (duplication-03), two
overstated savings (feed-posts-06, duplication-12), one wrong fact about the cron topology
(lib-core-config-10) and one *good news* correction (lib-core-config-16: the pin bites harder
than the finder thought).

---

## directory-profile-27 - two selects that should spread IDENTITY_SELECT
**confirmed-with-correction.**

- `src/lib/people-select.ts:35-40` -- `IDENTITY_SELECT = { id, name, photoUrl, birdOverride }`,
  with the docblock's own instruction at `:11-14`: *"Anything else spreads one of them and adds
  what it needs, so the addition is visible in the diff."*
- `grep -rn "birdOverride: true" src` returns **9 hits outside people-select.ts**, exactly as
  claimed: search route, admin/people/[id]:39, pick-bird:50, welcome:35, catchups/new:55,
  directory-module:35, catchups-round-view:108, auth.ts:329 and auth.ts:413.
- **Correction, line range**: the search route's select is `src/app/api/users/search/route.ts:
  65-77` (`select: {` at 65, `accountType: true` at 76, `take: 8` at 78), NOT `:63-75`.
  `welcome/page.tsx:31-42` is exact.
- Gate claim verified: `src/lib/people-search-rule.test.mjs` reads the route at `:33` and `:86`
  for `alumniOnly`, the teacher-exclusion `where` and the callers' opt-in shape. **Nothing in
  it touches the `select`.** Safe.
- Saving −6 lines is honest (4 lines -> 1 spread, twice). The search route's `accountType:
  true` carries a 5-line comment which must stay *after* the spread.

## duplication-03 - four server-side image intakes, one hand-rolled HEIC check
**confirmed-with-correction.** The duplication is real; the stated consequence is not.

Verified at HEAD:
- `/api/upload/route.ts` -- `isImageFile` :82, `isUnsupportedHeic` :86, `MAX_UPLOAD_BYTES` :95,
  `sniffImageType` :107, `countImageFrames` :123. The HEIC sentence is spelled out in full at
  `:89`.
- `/api/upload/finalize/route.ts` -- HEAD size :107, buffer size :112, `sniffImageType` :117,
  frames :126. No HEIC branch (correct: the presign route turns HEIC away, `presign/route.ts:57`).
- `collection/actions.ts` -- `isImageFile` :277, `isUnsupportedHeic` :278, size :284,
  `sniffImageType` :317, frames :321 (`contributePhoto`); and :555/:560/:565/:571
  (`contributePhotoDirect`). The HEIC sentence spelled out in full again at `:281`.
- `settings/actions.ts` -- `isImageFile` :86, then **`:87-88`**:
  `if (file.type === "image/heic" || file.type === "image/heif") return { error: "HEIC is not
  supported yet. Please export as JPG or PNG." }`, size `MAX_AVATAR_INPUT` :89, sniff :95.
  **Correction**: the finding cites `:85-97` and `:88`; the hand-roll is at `:87-88`.

**The failure mode is overstated.** The finding says a blank-MIME iPhone HEIC "passes the
settings check, reaches sharp, and gets the opaque 'unsupported image format' error". It does
not reach sharp. `sniffImageType` (`upload-shared.ts:268-288`) recognises only JPEG/PNG/GIF/WebP
magic bytes and its docblock says *"HEIC/HEIF are deliberately absent"*, so the file is refused
at `settings/actions.ts:95-97` with **"That file doesn't look like a JPG, PNG, GIF or WebP
image."** That is a wrong, unhelpful sentence for a HEIC -- a real defect -- but it is a
second gate, not a crash, and the drift is cosmetic rather than dangerous. The window is also
narrow: the client path (`avatar-upload.ts` `sendUndecodable` -> `image-downscale.ts:122-129`)
already names HEIC by extension, but only when the shrunk total exceeds the 4.5 MB body limit,
so a small blank-MIME HEIC is the case that gets the wrong sentence.

**A fifth copy the finding missed**: `src/components/collection/contribute-room.tsx:326-337`
hand-rolls `f.type === "image/heic" || f.type === "image/heif" || /\.hei[cf]$/i.test(f.name)` --
byte-for-byte `isUnsupportedHeic` -- with two more sentences of its own. It is a client
component and `upload-shared.ts` is already client-safe, so it belongs in the same commit.

**Pins, re-checked (the finding's caution is right but names the wrong file):**
- `upload-size-rule.test.mjs` does **not** read either API route. It reads six client files
  (`photo-step`, `photo-attachments`, `message-composer`, `contribute-room`,
  `use-composer-uploads`, `letterhead-profile`), `settings/avatar-upload.ts:64` and
  `next.config.ts:71`. No obstacle.
- `image-purge-rule.test.mjs:104-129` **does** read both routes: it requires `const abort =
  async` and asserts that **below** it there is no bare `return NextResponse.json({ error`
  (`assert.deepEqual(bare..., [])`) and at least three `return abort(`. Any extracted predicate
  must therefore still return its string *through* `abort()` inside the loop.
- `image-purge-rule.test.mjs:217-230` reads `settings/actions.ts` for the C-050 avatar swap
  (two `await swapPhotoUrl(`, no `select: { photoUrl: true }`, the purge on a lost swap).
  A HEIC-line change does not touch any of that.
- **C-189 (`gate-coverage.test.mjs:135-140`)**: a `"use server"` file may export only
  `export async function ...` (and types). So the shared `HEIC_REFUSAL` / predicates must live
  in `upload-shared.ts` and never be exported from `settings/actions.ts`, `collection/actions.ts`
  or `feed/actions.ts`. This is the shape audit 1 refuted; keep the fix on the lib side and it
  is fine.

## duplication-07 - the auth pages hand-type AuthHeading's h1
**confirmed.**

`grep` for the exact class string returns six source hits at precisely the claimed lines:
`signup-client.tsx:174` and `:190`, `login-client.tsx:251`, `auth-panel.tsx:177` (AuthHeading's
own), `auth-first-frame.tsx:71` and `:120`. All five non-owner sites are a bare
`<h1 class>text</h1>` with no subtitle, so `<AuthHeading title="..." />` substitutes cleanly
(children optional since the calm-form pass, `auth-panel.tsx:167-171`).

- No new module edge for the two pages: `login-client.tsx:13` and `signup-client.tsx:12`
  already import `AuthPhotoPanel` from `@/components/auth/auth-panel`.
- `auth-first-frame.tsx` does **not** import auth-panel today, so this adds one edge from the
  landing bundle (`landing-hero.tsx:21` is its only importer) into auth-panel.tsx. Cheap:
  landing-hero already carries `Image`, `Link`, `motion`, `Hoopoe`, `Wordmark`, `hero-photo`
  and the flight machinery; the only new arrival is `useFlightArrival`.
- **Pin**: `auth-first-frame.test.mjs:41` asserts the literal class string is present in BOTH
  `auth-first-frame.tsx` and `signup-client.tsx`. Both halves go red on this change and must be
  re-pointed in the same commit; re-point at `<AuthHeading` in both files AND keep a separate
  assertion on the 27px in `auth-panel.tsx`, or the pin loses the size it was written to hold.
  `:46` and `:60` pin the heading *words* ("First, a quick check", "Welcome back"), which
  survive as `title="..."`.

**Overlap / disagreement**: `auth-edge.md`'s not-finding (lines 592-606) tolerates the
login/signup duplication -- the outer scaffold, the perch box **and "a 6-line class string"** --
as net negative by the repo's dedupe lesson. The two reports disagree on this one item.
My reading: auth-edge's argument is strong for the perch box (a `FlightPerch` leaf would take
seven props for twelve lines of JSX, and the pin at `:37-66` would have to move) and weak for
the h1, where the component already exists, both files already import that module, and each
site goes from 3 lines to 1 (−10 lines gross). Recommendation to the fixer: **take
duplication-07 for the h1 only; leave the perch box and the outer scaffold alone per
auth-edge.**

## duplication-12 - useResendVerification for the banner and the dialog
**confirmed.**

`raw/jscpd.txt:623-624`: `verify-email-banner.tsx [95:28 - 108:8]` vs
`verify-email-dialog.tsx [94:30 - 108:8]`, **14 lines, 62 tokens**. Read both at HEAD:
`handleSend` is `verify-email-banner.tsx:95-125`, `handleResend` is
`verify-email-dialog.tsx:94-124` -- the finding's ranges are exact. Shared verbatim: the `if
(busy) return`, `setBusy(true)`, `setFlash("")`, the B-042 comment, `callAction(() =>
resendVerification())`, `if (!("ok" in result) || !result.ok)` with the identical fallback
sentence *"That did not work. Try again in a minute."*, `router.refresh()`, `finally
setBusy(false)`. The dialog's comment names the banner as its twin (`:101-102`).

**Correction to the saving.** "~14 lines" is the clone size, not the net. The banner's `flash`
carries *success* copy too (`setFlash(\`Sent to ...\`)` at `:110`), so a hook that owns `error`
leaves the banner with two message states to merge at render. Once the new hook file gets the
docblock this repo requires, net lines are ~0. The honest unit is "1 clone, one B-042 comment
in one place" -- which is still a good finding. `member-verify-dialog.tsx` correctly excluded.

## feed-posts-06 - "three photos" written six times
**confirmed-with-correction.**

Every literal is at the exact line claimed: `api/upload/route.ts:22` and `:52-54`,
`api/upload/finalize/route.ts:36` and `:66-67`, `use-composer-uploads.ts:219`
(`const remaining = 3 - shots.length`), `create-post-form.tsx:859`
(`disabled: previews.length >= 3`), `feed/actions.ts:582-583`. The one argued constant is
`upload-ownership-rule.ts:15`; the re-export is `upload-ownership.ts:5`; knip lists both
`MAX_IMAGES` and `MAX_IMAGE_URL` at `src/lib/upload-ownership.ts:5` under "Unused exports".
`upload-ownership-rule.ts` genuinely has no imports (docblock `:1-13` explains why), so the two
client files can import it for 0 KB.

**Correction to the saving.** "~3 lines" is wrong. Only `feed/actions.ts:25` already imports
from that family; the other four files need a new import line each. Net: −2 (`MAX_FILES`
declarations) −1 (re-export, if dropped) +4 (imports) ≈ **+1 line**. The win is one cap and two
knip rows, not lines -- exactly audit 1's lesson. Also: `feed/actions.ts` is `"use server"`, so
it may **import** `MAX_IMAGES` but must never re-export it (C-189, `gate-coverage.test.mjs:
135-140`).

Gate claim verified: `image-purge-rule.test.mjs:104-129` reads both routes for the abort shape,
not the count message; `upload-ownership-rule.test.mjs:7-8` imports the constants from the rule
file and is unaffected.

## lib-core-config-02 - build each email's text part from the same words as its HTML
**confirmed.**

- `shell(opts)` is `src/lib/email-templates.ts:66-217` and returns `string` (HTML only);
  the finding's `:66-216` is off by one on the closing brace.
- The four `text:` arrays are at exactly `:255-263`, `:297-305`, `:335-342`, `:377-386` = **36
  lines**.
- All three drifts reproduce verbatim:
  - reset: HTML `Set a new password for <strong>…</strong> **below**` (`:288-293`) vs text
    `Set a new password for ${opts.email} **here**` (`:300`).
  - passwordChanged: HTML `ctaLabel: "This wasn't me"` (`:330`) vs text with no label, the URL
    hung off the footnote sentence with a colon (`:340-341`).
  - deletionScheduled: HTML `ctaLabel: "Keep my account"` (`:372`) vs text with no label, the
    URL hung off the body paragraph with a colon (`:382-383`).
  - verifyEmail's text is in sync on prose, though it too omits the CTA label.
- No test reads this file: the only two references anywhere are `email-queue.ts` (the importer)
  and `scripts/qa/protocol-audit.mjs:136`, which **allowlists** it for literal hex values.

**Caution the finding underplays**: a single shell-built `text` does not only add two labels,
it *re-orders* two security notices. Today passwordChanged's text ends "…Tell us and we will
lock the account:" + URL, and deletionScheduled's reads "Changed your mind? … cancelled:" +
URL. A uniform heading/body/label+href/footnote assembly moves the URL above the footnote in
both. That is a member-facing copy change in the app's one no-undo surface; the fix session
should paste all four rendered text parts into the commit or show them to the owner.

## lib-core-config-09 - the canonical origin in seven places
**confirmed.**

Every literal is exactly where claimed: `proxy.ts:9` (used once, at `:165`), `email.ts:59`,
`email-templates.ts:41`, `:206`, `:321`, `:373`, `:383`. `email.ts:44` already documents the
duplication (*"Same constant as CANONICAL_ORIGIN in src/proxy.ts"*). The eighth is real:
`.github/workflows/retention.yml:52`. Everything else the grep returns is prose, policy-page
copy, `images.rishivalley.space` (a different host) or a test fixture in
`turnstile-origin-rule.test.mjs` / `origin-rule.test.mjs` -- which, as the finding says, are
about cross-origin comparison and are not affected.

Pin check done as the finder asked: `proxy-rule.test.mjs` never greps for the origin (its proxy
assertions are the `next-action`/visit-cookie shape at `:216-230`), and
`security-regressions.test.mjs:196-213` reads `proxy.ts` only for the `/ingest` cookie strip.
Nothing forbids `proxy.ts` importing an import-free module; the "cannot import" comment at
`proxy.ts:28-29` is about `demo.ts`'s dependencies, as the finder argued.

## lib-core-config-10 - pool bounds and a duration ceiling for /api/demo/reset
**confirmed-with-correction.**

- The bare client is real: `src/app/api/demo/reset/route.ts:51-53`,
  `new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`
  -- no `max`, no `connectionTimeoutMillis`, no `query_timeout`, against the reasoning in
  `prisma.ts:18-44` and the guarded construction at `prisma.ts:45-57`.
- `db-pool-rule.test.mjs:23` reads **only** `src/lib/prisma.ts`, so it is blind to this second
  construction. Widening it to sweep every `new PrismaPg(` in `src/` is the right fix.
- No `maxDuration` in the route; `retention/sweep/route.ts:42` = 300 and
  `catchups/tick/route.ts:31` = 120 confirmed.
- `seed.ts:75` `SEED_TRANSACTION_TIMEOUT_MS = 30_000`, `:532` `maxWait: 10_000` -- the 40 s
  worst case is real.

**Correction (cron topology).** The finding calls demo/reset "the third cron, in the same
vercel.json". `vercel.json` declares **two** crons: `/api/catchups/tick` (0 2 * * *) and
`/api/demo/reset` (0 20 * * *). `/api/retention/sweep` is fired by a GitHub Action
(`.github/workflows/retention.yml:52`), not by Vercel. So demo/reset is the *second* Vercel
cron and the only scheduled route with no ceiling. Also: six routes in `src/app` declare
`maxDuration` (the two crons, both upload routes, and two Collection pages), not two.

## lib-core-config-11 - the Resend webhook's four-deep ternary
**confirmed.**

`src/app/api/resend/webhook/route.ts:103-136` (the finding says `:103-137`; `: null;` lands on
136). Four levels, three multi-line comment blocks inside the arms, and the bounce-kind
expression `event.data?.bounce?.subType ?? event.data?.bounce?.type ?? "unknown"` computed
twice, at `:115-116` and again inside the `lastError` template at `:125-126`. No test anywhere
reads this route (the only tree-wide hit for "resend/webhook" is a string inside
`src/generated/prisma`). A `switch` in a named `patchFor(event, now)` is safe; keep the four
event names and four patch shapes byte-identical.

## lib-core-config-13 - the orphaned re-export comment at the end of email.ts
**confirmed, exactly.**

`src/lib/email.ts` is 253 lines; `:250-253` is the four-line comment; there is no re-export
statement anywhere in the file. `maskEmail` is imported normally at `:3` and used at `:159`.
`git log -S 'export { maskEmail }' -- src/lib/email.ts` returns the two commits named:
`fa99bd2` (added it) and `e23e80c` "refactor(lib): remove dead exports the audit proved
unreferenced" (removed the statement, left the prose). T1, delete 4 lines.

## lib-core-config-15 - three one-line config no-ops
**confirmed-with-correction** (on item 1's provability).

1. `src/app/api/demo/reset/route.ts:32` -- present. `grep -rn "export const dynamic" src/app`
   returns exactly five: `lab/page.tsx:13`, `lab/centroid/page.tsx:7`, `lab/birds-bg/page.tsx:6`,
   this route, and `admin/analytics/page.tsx:49`. So the "only API route that declares it" claim
   holds. **Cannot be proven a no-op without a rebuild** (out of bounds), but the strongest
   available evidence is on disk: `raw/build.txt:46-56` shows every API route rendered `ƒ`
   (Dynamic), including `/api/retention/sweep` and `/api/upload`, neither of which declares
   `dynamic`. Same shape (a GET that reads the request), same outcome. I would still take the
   finder's own fallback and leave the line if the fix session cannot exercise the demo cron:
   one line is not worth a route that caches when it must not.
2. `next.config.ts:368` -- `release: { create: false, deploy: undefined },` present, with the
   15-line owner-quoted comment above it at `:353-367`. Deleting `, deploy: undefined` is safe
   at runtime unless the Sentry plugin branches on key *presence* rather than value; worth a
   glance at the plugin's own types in the same commit.
3. `scripts/demo/verify-guard.mts:145` -- `if (hacked !== 0 || users !== 40)` present.
   `people.ts` has exactly 40 `slug: "` entries and `:630` is
   `export const ALL_DEMO_PEOPLE: DemoPerson[] = [DEMO_VISITOR, ...DEMO_PEOPLE];`, so 40 is
   right today and wrong the day anybody adds a person. The script already dynamic-imports from
   `src/lib/` at `:35-36`, so the fix is one more line.

## lib-core-config-16 - two unused exports pinned by their `export` keyword
**confirmed-with-correction** -- and the correction makes the finder's "skip it" verdict easier.

Both are in `raw/knip-repo-config.txt` under "Unused exports": `dailyBudget function
src/lib/email-queue.ts:394:23` and `SEND_TIMEOUT_MS src/lib/email.ts:77:14`. Grep at HEAD
matches the finder exactly: `dailyBudget` is called at `email-queue.ts:773`, `:793`, `:995`,
mentioned in prose at `:848` and at `admin/mail/actions.ts:88`, and nowhere else;
`SEND_TIMEOUT_MS` is used at `email.ts:217`, `:220` and referenced by name from
`email-queue.ts:622`, `:786`, `:959` and the rule test's arithmetic.

**Correction to the risk.** The finding worries that dropping `export` from `dailyBudget` could
make `mail-queue-rule.test.mjs:44` pass vacuously. It would not. With the anchor missing,
`indexOf` is −1, `queue.slice(-1)` is one character, `fn.indexOf("\n}\n")` is −1 and `body`
becomes one character -- at which point `assert.ok(/sentAt: \{ gte:/.test(body))` (`:51`) and
`assert.ok(/status: "sending"/.test(body))` (`:53`) both **fail loudly**. The `body.length >
400` vacuity guard the finder half-remembered is at `:166`, on the `drainMailQueue` test, a
different assertion. So the change is louder and safer than described -- but the payoff is
still two words, and I agree with the finder's own recommendation to close it as a not-finding
unless a "no unused exports" gate is ever added to `npm run check`.

## lib-tests-07 - the surviving `walk` copy and three brace balancers
**confirmed-with-correction.**

- `email-normalization-rule.test.mjs:92-100` is a local `walk` skipping
  `generated | node_modules | lab`. `test-kit.mjs:56` is `SKIP_DIRS = ["generated",
  "node_modules"]` and `:66-83` is `walk(dir, { skip, match })`, so
  `walk(resolve(ROOT, "src"), { skip: [...SKIP_DIRS, "lab"] })` is behaviourally identical
  (the kit's `skipped` tests basename or full path; the local one tests basename). Exact match.
- `whereBlock` at `:102-115`, `catchup-lifecycle.test.mjs` inline balancer at `:373-383`,
  `image-purge-rule.test.mjs` `blockAt` at `:24-35` -- all present as described.
- **Correction**: `test-fn-body.mjs`'s tail loop is at **`:64-72`**, not `:58-71`. Line 58 is
  inside the return-type angle-bracket skip (`else if (c === "{" && angle === 0) break;`),
  which is a *different* piece of logic and must not be swept into the shared helper.
- **Correction that changes the work**: `blockAt` returns `{ body, end }`, and two call sites
  consume `.end` -- `image-purge-rule.test.mjs:66` (`direct.slice(blockAt(direct, guard).end)`)
  and `:120` (`src.slice(blockAt(src, src.indexOf("=>", loop)).end)`), the latter being the
  C-064 "no bare error return below the abort" assertion. A shared
  `balancedBlock(text, at)` returning only the block string breaks both. It must return the end
  index too (or those two callers change in the same commit). Note also that `whereBlock`
  degrades gracefully on unbalanced input (`return src.slice(i)`) where `blockAt` throws
  (`unbalanced braces from ${from}`) -- pick one deliberately, don't inherit whichever.
- `catchup-lifecycle.test.mjs:3` already imports `balancedBody` from the kit, so it has the
  import edge already.
- The audit-1 mutation note holds: gutting `walk` currently reddens 5 files; after this it is 6.

---

## Cross-cluster notes for the compiler
- **duplication-07 vs auth-edge.md's not-finding (592-606)**: genuine disagreement, resolved
  above -- take the h1, leave the perch box.
- **duplication-03 / feed-posts-06 both touch `/api/upload/route.ts` and
  `/api/upload/finalize/route.ts`**: they do not conflict (one edits the refusal predicates,
  the other the count constant), but they should land as one commit or in a fixed order, since
  both re-read `image-purge-rule.test.mjs:104-129`.
- **lib-core-config-02 and -09 both rewrite `email-templates.ts`**: 09 replaces four literals
  that 02's rewrite would move. Do 09 first (mechanical), then 02.
- **lib-core-config-10 and -15(1) both edit `src/app/api/demo/reset/route.ts:32`**: 15 deletes
  the `dynamic` export, 10 adds `maxDuration` beside it. One commit.

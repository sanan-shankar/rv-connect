# Security fix plan — the spine

**Companion to** `SECURITY-AUDIT.md` (85 findings) and `OWNER-INPUT-REQUIRED.md` (the owner's answers).
**Ground truth is not this file.** It is `npm run audit:status`. Run that first, always.

---

## START HERE — the resume protocol

A new session does exactly this, in order. Nothing else needs to be asked of the owner.

```
1. npm run audit:status            # what is actually open, proved from the code
2. read this file's PHASES table   # pick the topmost phase not marked done
3. read that phase's section       # it lists findings, files, and the shape of the work
4. read those findings' sections in SECURITY-AUDIT.md   # NOT optional: this file says WHAT,
                                   # the audit holds the attack detail, the file:line
                                   # evidence, and the edge cases a summary line drops
5. work it
6. verify (see VERIFICATION below) # non-negotiable, every phase
7. commit each coherent piece as it passes
8. append to SESSION LOG at the bottom of this file, and to progress.md
9. stop, and report what closed
```

**The owner does not need to be consulted to start, continue, or finish a phase.** Every decision
they were going to be asked has already been answered and is recorded in DECISIONS below. If a
genuinely new question appears, add it to OPEN QUESTIONS at the bottom and *keep working on
everything that does not depend on the answer* — do not stall a session on it.

---

## STANDING AUTHORIZATIONS

Granted once by the owner so no session has to stop and ask. *(Owner: confirm once; after that
these hold for the whole project.)*

| # | The session may… | Boundary |
|---|---|---|
| SA-1 | **Commit freely to `main`** as each coherent piece passes the gate | Stage by filename, never `git add -A`. Never touch files another session has modified. |
| SA-2 | **Push at phase boundaries** once check + visual + audit-status are all green | A push is a deploy. Report what went out immediately after. Never push mid-phase. |
| SA-3 | **Apply forward-only, idempotent SQL** via `scripts/dev/run-sql.mjs` from a dated file in `prisma/migrations-manual/` | Never `prisma db push`. Never a destructive statement (DROP, TRUNCATE, unqualified DELETE) without asking first. |
| SA-4 | **Draft all user-facing copy** — privacy policy, terms, community guidelines, gate messages | Owner reviews at the end of Phase 8, not before. Drafting is never blocked on approval. |
| SA-5 | **Install packages** needed by a phase | Under 200MB, and named in the commit message. |
| SA-6 | **Change a member row** when a phase requires it | Only via a script in `scripts/dev/`, never ad-hoc SQL against people's data, and logged here. |

---

## VERIFICATION — required before any phase is marked done

Not optional, and not delegable to a subagent's report.

| Gate | Command | Applies to |
|---|---|---|
| Type/lint/protocol/tests | `npm run check` | every phase |
| Finding actually closed | `npm run audit:status` | every phase |
| Nothing else moved | `npm run visual` | every phase touching UI or a shared component |
| Real behaviour | a written probe against the running dev server | every phase touching auth, permissions or a write path |
| Both viewports | screenshot at 1440x900 **and** 390x844, read the PNGs | every phase touching UI |

**The standard set in Phase 1, to match.** Closing C1 was not called done because the code looked
right. It was called done because: the admin address with an empty password, a wrong password and an
arbitrary password were each shown to mint no session; `/api/dev-login` was shown to 404 with no
secret, 404 with a wrong secret, and 200 with the right one; the deleted route was shown to set no
cookie; a correct password was shown to mint a session that gets 200 from a members-only route; and
all 21 visual tests passed. **Write the probe, run it, paste the numbers into the session log.**

A phase is done when `audit:status` says so and the log records how it was proved.

---

## DECISIONS — the owner's answers, canonical

Recorded so no session re-asks. From the owner's review, 19–20 Aug 2026.

**Trust model**
- **Verification stays manual, with the owner.** No vouching for now (a 3-person vouch may come later).
- **Roster cross-check is wanted.** Two spreadsheets in `sanan's stuff/rough databases/` (gitignored):
  `Centenary Alum meet registrations 2026-06-18.xlsx` (473 rows; **name, email, year of passing, board**)
  and `rishivalley.xls` (`Master` 1,862 rows, batches from 1936, 1,037 with email; plus `Chennai` 123
  and `TN` 144). A signup matching the roster should be **auto-verified with `verifyMethod:
  "office_list"`** so the owner can see it was the sheets that verified them, not him. Consolidating
  the sheets into one clean roster is wanted. **Do not** auto-fill anyone's admission number or house.
- **No complete list from the school** is coming. Expected ceiling ~1,000 members.
- **Capability tiers** (this supersedes the table in `OWNER-INPUT-REQUIRED.md` D2):

  | | Stage 0 · no email confirmed | Stage 1 · email confirmed | Stage 2 · profile verified |
  |---|:---:|:---:|:---:|
  | Read the feed, posts, letters | ✓ read-only | ✓ | ✓ |
  | Directory map: view, zoom, pan | ✓ | ✓ | ✓ |
  | Directory: click a circle or batch, see names | ✗ | ✓ | ✓ |
  | Someone's full profile page | ✗ | ✓ | ✓ |
  | **Contact details ("Get in touch")** | ✗ | **✗** | ✓ |
  | Post, comment, like, vote, upload, Collection, Catch-ups, Letters, report | ✗ | **✗** | ✓ |
  | Own profile and own contact details | ✓ | ✓ | ✓ |
  | Message the admin | ✓ | ✓ | ✓ |

  The change from today: **every write now needs Stage 2**, not Stage 1. Reading the feed drops to
  Stage 0 so a new arrival sees a living site immediately.
- **Existing members: already grandfathered.** The owner knows everyone currently on it personally.
- **Locked panel:** no blur-over-real-content. Existing "confirm your email" copy is approved as-is;
  write a sibling for "waiting on profile verification". Own profile unaffected. vCard follows the
  same lock. **Map stays visible** (a city is coarse enough).
- **Notifications: none.** The owner will man the admin panel. No digest, no per-request email.

**Auth**
- Admin bypass removed entirely, both parts. ✓ done Phase 1.
- **Second admin:** `sanan.shankar@gmail.com` (currently named "Jerry McGuire"). ✓ done Phase 1.
- **No TOTP two-factor.** If ever, an emailed code, admins only. Not now.
- **Session length stays 30 days.**
- **next-auth:** upgrade to `5.0.0-beta.32` and launch on it. No migration to another system.

**Money / infrastructure**
- **Vercel Hobby and Supabase Free. No paid plans.** Backups are the nightly GitHub Action to a
  private R2 bucket, already built — no Supabase subscription for it.
- **No separate development database.** H15 stays ACCEPTED.
- Turnstile keys, Upstash, Sentry, GitHub Dependabot: all configured by the owner, in `.env`,
  GitHub Secrets and both Vercel projects.
- R2 has **no object versioning feature at all**; the nightly media copy is the substitute. Done.

**Legal**
- **Controller: the owner personally, but do not print his name.** Contact `sanan.shankar@gmail.com`,
  postal "Margravine Gardens, London". Bury the details rather than featuring them.
- Privacy policy, terms of use and community guidelines are all wanted, drafted by the session and
  approved by the owner at the end. **No lawyer will review anything.** Do not raise the Art. 9
  special-category question again — considered and dismissed.
- School is **informally aware and fine with it**; no personal data will come from them.
- **Retention:** admin messages 2y · reports 3y · payments **10y** · notifications 1y · login/audit
  log 1y · sent-email log **180d** · deleted accounts purged after a **60-day** grace period.
- Consent checkbox at signup, linking all three documents. Existing members are assumed to agree.

**Scope**
- `/lab`: **admin only.**
- Turnstile: **yes.**
- Demo site: **keep it working.** It must stay exempt from the new gates, as it already is from the
  email gate, and `src/lib/demo.test.mjs` must keep passing.
- No public contribution total is shown anywhere; totals are admin-only. Considered settled.
- **No launch date. Completeness beats speed.** Work the phases in order.

---

## PHASES

Mark a phase done only when `npm run audit:status` agrees.

| # | Phase | Closes | Status |
|---|---|---|---|
| 1 | Admin takeover + session integrity | C1-a/b/c, and the signIn role grant | **done 2026-08-20** |
| 2 | Authorization holes | H1, H3, H4, M6, M4 | **done 2026-08-20** |
| 3 | The two-gate trust model | H21, and the abuse half of M1 | **done 2026-08-20** |
| 4 | Bot defence and rate limiting | H22, H6, M2, M3, M7 | **done 2026-08-20** |
| 5 | Object deletion and uploads | C2, M10–M17 | **done 2026-08-20** |
| 6 | Headers, dependencies, quick highs | H7, C3, H18, M19, M27, M32, M18 | **done 2026-08-20** |
| 7 | Audit log and admin accountability | H10, H14, M36, H5 | **done 2026-08-20** |
| 8 | Deletion, retention, privacy layer | H8, H9, H12, M34, M35 | **done 2026-08-20** (docs owner-approved same day) |
| 9 | CI hardening and security tests | H16, H17 | **done 2026-08-20** |
| 10 | Remaining mediums and lows | the rest | next |

---

### Phase 1 — Admin takeover + session integrity · **done**
Closed C1-a, C1-b, C1-c, plus a signIn callback that granted admin by email match.
`/api/auth/admin-login` deleted; `/api/dev-login` replaces it for local tooling only (404s whenever
`NODE_ENV` is production, wants `DEV_LOGIN_SECRET` via `timingSafeEqual`, never grants a role).
Nine copied sign-in blocks across `scripts/qa` consolidated into `_dev-login.mjs`, which
authenticates from Node so the secret never enters page JavaScript.
`scripts/dev/set-password.mjs` is the break-glass (`--admin` to also grant the role).
Second admin account created.

### Phase 2 — Authorization holes · **done**
- **H1** `auth()` in `loadDirectoryPage`.
- **H3** one shared `canViewPost(postId, userId)`, applied to `loadComments`, `createComment`,
  `toggleLike`, `toggleBookmark`, `votePoll`, `toggleCommentLike`. The read path already gets this
  right (`loadPosts:651`, `loadSavedPosts:832`) — copy its logic, do not invent a second one.
- **H4** `isBlocked` in `authorize()`, in the session callback, in the `(main)` layout, and in the
  gate helpers.
- **M6** session callback returns `null` when the row is gone (currently returns a session with an
  id, so every `if (!session?.user?.id)` guard passes for a deleted account).
- **M4** add `credentialVersion` to `User`, stamp it on password change/reset/block/delete, carry it
  in the JWT, reject stale tokens. **One mechanism, and it is also what makes H4's block real** —
  without it a blocked member keeps a valid 30-day token.
- *Schema change → dated file in `prisma/migrations-manual/`, then `npx prisma generate`, then
  `node scripts/dev/run-sql.mjs`.*

### Phase 3 — The two-gate trust model
- `requireVerifiedMember()` beside `requireVerifiedEmail()`. `verifyState` is **already** in the
  session select in `auth.ts` — no schema change needed for the read.
- Apply the DECISIONS capability table. Every write action moves from the email gate to the member
  gate; feed reads drop to Stage 0.
- Locked "Get in touch" panel. **The real values must never be serialized for a viewer who may not
  see them** — `viewerMaySeeContacts` already decides what to *serialize*, not just what to render.
  Keep that. Blur placeholder shapes, never real data behind CSS.
- Member-initiated "request verification" writing `verifyState: "pending"` (nothing writes it today).
- Roster import: consolidate the two spreadsheets into one clean file, match on **email first**
  (exact, lowercased), then **name + batch year** fuzzily. Auto-verify a match with
  `verifyMethod: "office_list"`. Never auto-fill admission number or house.
- Demo stays exempt (`IS_DEMO` short-circuit, as `requireVerifiedEmail` already does).

### Phase 4 — Bot defence and rate limiting
- Turnstile on signup, login and password reset; verify the token **server-side**.
- One Upstash-backed limiter used everywhere: login (per IP and per account), signup, reset (**per
  IP** — today it is per user id only, so ~24 known addresses exhaust the day's mail budget), posts,
  comments, uploads, reports, Catch-up creation.
- Trivia gate: drop the hardcoded `"rv-connect-trivia-dev-secret"` fallback, and fix the limiter
  that currently checks *before* issuing its cookie — which lets an attacker bypass it by omitting
  the cookie while locking out every genuine first-time visitor.

### Phase 5 — Object deletion and uploads
- **C2**: give `Post`/`Photo` a server-written `objectKey`; delete only by that. Validate
  `postSchema.images` against the upload origin with `isUploadedImageUrl` (the pattern already
  correct in `admin-threads-server.ts:29-33`), and cap the array. Stop `keyForUrl` accepting caller
  URLs.
- M10 external image URLs · M11 pending Collection photos world-readable · M12 EXIF/GPS on
  Collection originals · M13 magic-byte check · M14 `sharp` `limitInputPixels` · M16 presigned POST
  with `content-length-range` · M17 per-account quota.

### Phase 6 — Headers, dependencies, quick highs
- **H7** `headers()` in `next.config.ts`: CSP, `X-Frame-Options: DENY`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `X-Content-Type-Options`, `Permissions-Policy`. CSP will fight
  PostHog and Sentry — expect to iterate with the browser console open.
- **C3** `next-auth` → `5.0.0-beta.32`, `sharp` → ≥0.35.3 (re-verify all five call sites), `next` → 16.3.
- **H18** `take:` on the two admin `findMany`s and `/api/users-by-batch`.
- **M19** `/lab` out of `publicPaths`, admin-gated · **M27** the dead `/api/catchups/tick` cron ·
  **M32** transactional poll create · **M18** `updateContactMethods` through `profileSchema`.

### Phase 7 — Audit log and admin accountability
- `AuditLog` model: actor, action, target, timestamp, IP. Written on sign-in, admin action, block,
  delete, role change, verification change.
- **H5** `reportUser` stops writing `verifyState: "flagged"` on one report: require N distinct
  reporters, add `@@unique(reporterId, reportedUserId)`, rate-limit, and route through the same
  thread limiter `startThread` uses.

### Phase 8 — Deletion, retention, privacy layer
- **H8** clear filed reports before `user.delete` (mirror `adminDeleteUser`, which already does).
- **H9** delete the member's R2 objects. **M35** 60-day grace, confirmation, re-auth, data export.
- **M34** retention jobs on the DECISIONS schedule.
- **H12** privacy policy, terms of use, community guidelines, and the signup consent checkbox.
  Controller details buried, name omitted, per DECISIONS.

### Phase 9 — CI hardening and security tests
- `npm audit --omit=dev --audit-level=high` in `check.yml`; `audit-status --fail-on-open=critical,high`
  as a gate so a regression cannot merge.
- A test per gated action asserting unauthenticated and wrong-tier calls are refused; property tests
  for `renderRichText`; regression tests pinning C1 and C2 closed.

### Phase 10 — Remaining mediums and lows
Everything else in the audit's Medium and Low bands, plus the R-series reliability items.

---

## KNOWN TRAPS

Things that have already cost time here.

1. **Deleting a route leaves a stale `.next` type.** `npm run check` fails with
   `Cannot find module '../../../src/app/api/.../route.js'`. Fix: `rm -f .next/dev/types/validator.ts`.
   Check nothing is on `:3000` before touching `.next` — another session may be mid-build.
2. **`grep` for a symbol matches the comment explaining its removal.** This broke two probes in
   `audit-status.mjs` on first run. Strip comments before asking "is X still referenced".
3. **Three PostHog 404s** (`dead-clicks-autocapture`, `surveys`, `web-vitals`) appear in every
   `verify:shot` error list. Pre-existing, benign, unrelated — but they mean "3 console errors" is
   the normal baseline, so a real fourth error is easy to miss. Worth fixing in Phase 10.
4. **`PUPPETEER_EXECUTABLE_PATH`** must be set to
   `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` for `verify-shot`, `crawl` and the
   probes. The bundled Chrome is broken here.
5. **`timeout` does not exist on this Mac.** Use the Bash tool's own timeout parameter.
6. **`verify:shot` writes into `temporary screenshots/`**, joining whatever path you give it. Pass a
   bare filename, not an absolute path.
7. **Another session may be working in this tree.** `.github/workflows/backup.yml` was modified by
   someone else mid-session. Never stage a file you did not change.

---

## SESSION LOG

Append one block per session. Newest last.

### 2026-08-20 — Phase 1
**Closed:** C1-a, C1-b, C1-c, plus an unlisted signIn callback granting admin by email match.
**Built:** `/api/dev-login`, `scripts/qa/_dev-login.mjs`, `scripts/dev/set-password.mjs`,
`scripts/qa/audit-status.mjs`. Second admin account created.
**Proved:**
- admin address + empty / wrong / arbitrary password → `signedIn:false`, no cookie, all three
- correct password → session minted, members-only `/feed` → 200
- `/api/dev-login` → 404 with no secret, 404 with a wrong secret, 200 with the right one
- deleted `/api/auth/admin-login` → 400 from NextAuth's catch-all, **0** cookies set
- `npm run check` clean · `npm run visual` 21/21 including the Playwright auth setup on the new route
**Notes:** the owner's account already held a valid bcrypt hash, so the lockout risk was nil; the
password field was simply hidden whenever the admin address was typed. `audit-status.mjs` found
three bugs in itself on first run — see trap 2.
**Owner needs to:** delete `NEXT_PUBLIC_ADMIN_EMAIL` from both Vercel projects (it is gone from
code and `.env`; the deploy will not use it either way). Change the second admin's temporary
password. Confirm the standing authorizations above.

### 2026-08-20 — Phase 2
**Closed:** H1, H3, H4, M4, M6. Also: Sentry release-per-deploy turned off explicitly
(owner: no deploy mail), and a second security test file added, which is a down payment on H17.
**Built:** `src/lib/post-visibility.ts` (fetching) split from `post-visibility-rule.ts` (the pure
decision, no imports, so it is unit-testable) + `post-visibility-rule.test.mjs`, 12 cases phrased as
attacks. `credentialVersion` column + `prisma/migrations-manual/2026-08-20-credential-version.sql`.
**Proved:**
- behavioural probe against a disposable account, **9/9**: epoch bump ends a live session; a fresh
  sign-in after the bump works; blocking ends the live session *and* refuses the correct password at
  the door; unblocking restores; a deleted account's session stops; `/directory` refuses anonymously
- `/directory` search as a signed-in member returns 52 profile links; anonymous gets 307
- feed renders 16 articles, no console errors beyond the three known PostHog 404s
- `npm run check` clean (16 test files) · `npm run visual` 21/21 · `npm run build` exit 0
- **production build**: `/api/dev-login` answers **404 even with the correct secret** and sets no
  cookie; the deleted `/api/auth/admin-login` answers 400 and sets no cookie
- deploy blast radius measured before pushing: **0** members have `credentialVersion > 0` and **0**
  are blocked, out of 51 -- so no one is signed out or locked out by this landing
**Caught by verification, not by review:** neither `authorize()` nor `dev-login` put
`credentialVersion` into the token, so anybody who had ever reset their password would have signed
in, been stamped 0, been compared against a row reading 1, and been thrown straight back out --
permanently. `npm run check` was perfectly happy with it. **Static checks cannot find this class of
bug; the probe is not optional.**
**Owner needs to:** run the one-line `credentialVersion` migration against the DEMO database too, if
it is still live (belt and braces -- the demo's session path bypasses NextAuth entirely, so nothing
there reads the column):
```sql
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "credentialVersion" INTEGER NOT NULL DEFAULT 0;
```
Also: Sentry's own new-issue and weekly-summary mail is an account setting, not a build setting --
Sentry > Settings > Notifications, and the Vercel-Sentry integration sends deploy mail from Vercel's
side. The code no longer creates a release per deploy.

### 2026-08-20 — Phase 3
**Closed:** H21 (verification gated nothing), and the harvesting half of M1. H5's worst edge
(one report stripping a member's badge, which the new gate would have turned into one report
stripping a member's ACCESS) removed; H5 itself stays open for Phase 7's threshold work.
**Built:** `src/lib/member-gate.ts` (`requireVerifiedMember`, `viewerMaySeeContacts` moved up to
Stage 2) + `member-gate-message.ts` sentinel; every community write moved from the email gate to
the member gate (posts, comments, edits, likes, poll votes, comment likes, catch-up
create/join/prompt/entry/love, collection uploads+loves, 3 upload routes, both report actions).
Directory names, `/api/users/search`, `/api/users-by-batch`, profile pages and pin drilldowns hold
the Stage 1 line server-side (counts and circles at Stage 0, never a serialized name — including
the tab `<title>`). `requestVerification` writes the first-ever `pending`; member-verify dialog
(sibling of the confirm-email card) carries "Ask to be verified"; new `verify` queue on the admin
worklist. `RosterEntry` (2,134 people consolidated from both sheets by
`scripts/dev/import-roster.mjs`) auto-verifies matches as `office_list` at email-confirm, reset,
name/year edits, and on request — email match alone, or name+batch (never a lone token, never an
initial, `roster-rule.ts` + 12 unit tests). No auto-fill of admission number or houses.
**Proved:** `scripts/qa/phase3-probe.mjs`, **22/22** against the running server with disposable
accounts per tier: Stage 0 reads the feed but gets zero names from /directory, search, by-batch or
a profile; Stage 1 sees people but is refused uploads (member sentinel), a REAL comment typed into
the real feed UI writes no row and shows the card, "Ask to be verified" lands `pending` and appears
on /admin; Stage 2's identical comment lands, contacts serialize; roster email-match and
name+batch-match both verify through a real /verify-email link (no admission number filled), a
no-match stays unverified. Screenshots desktop+mobile of every locked state, read personally.
`npm run check` clean (17 test files) · `npm run visual` 21/21 (two baselines re-accepted for a
new real member joining, diffs read first) · `npm run build` exit 0 · `audit:status` 13 fixed.
**Notes:** the demo needs no migration this time — `RosterEntry` is never queried under `IS_DEMO`.
51 of 52 existing members were already verified; the one unverified account (Yashvardhan Chauhan,
email confirmed 2026-08-19) matches no sheet, so verifying them is the owner's call from
/admin/people. `resultCount` and map/batch counts stay visible at Stage 0 deliberately (a count is
coarse, per the map decision).
**Write-path review caught two things after the probe was green:** (1) the feed rail's "New in
the directory" card served six names/batches/cities to Stage 0 -- directory data on a feed route;
fixed, and the probe now pins it (24/24). (2) `updateAvatar` writes image bytes with no tier gate;
REVIEWED AND LEFT, with the reasoning at the call site: the owner's table grants own-profile at
Stage 0, the onboarding wizard's photo step runs before an email can be confirmed, the abuse is
bounded (one 512px WebP, prior object deleted), and the image only ever renders for Stage 1+
viewers. Revisit if avatars appear anywhere unauthenticated.
**Infra drift found by the review, pre-existing:** the DEMO database is missing older migration
columns (at least `User.birdPickedAt`, plus `credentialVersion` from Phase 2), so
`scripts/demo/verify-guard.mts` crashes with P2022 and its three "BROKEN" lines are that crash,
not real guard failures. Bring the demo schema up to date so that proof runs again.
**Owner needs to:** nothing blocking. Verify or decline Yashvardhan Chauhan from the admin panel
when convenient. Two noted calls to overrule if wanted: avatar uploads stay at Stage 0 (above),
and Stage 0 still sees aggregate counts (result totals, pin numbers, batch tiles).
**Post-deploy:** production verified live (directory/search/by-batch 307 to login signed out,
dev-login 404, site 200). Dependabot PRs #2/#7/#8 closed with notes -- #7 pinned sharp 0.35.0,
whose broken types failed every preview build and re-emailed the owner on each rebase. **Phase 6
(C3) owes those upgrades**: next-auth beta.32, sharp >=0.35.3 (0.35.0-0.35.2 have broken type
exports), next 16.3, hono, ip-address, express-rate-limit -- do them there, not from Dependabot's
lump.
**Owner confirmed same day:** demo DB got the credentialVersion + birdPickedAt columns;
NEXT_PUBLIC_ADMIN_EMAIL deleted from Vercel; he is verifying Yashvardhan himself. Still open with
the owner: the second admin account's temporary password from Phase 1.
**Same evening -- Supabase advisor criticals (new finding, not in the audit):** every Supabase
project exposes PostgREST over the public schema via the anon key; with RLS off that is full
read/write on every table for anyone holding the key. The app never uses that API (Prisma only),
so it was latent, but real. Fixed on BOTH databases: RLS enabled on all 38 tables with no
policies (`prisma/migrations-manual/2026-08-20-enable-rls.sql`; owner connections bypass RLS, so
the app is untouched -- proved by phase3-probe 24/24 after). The demo DB was also 8 tables and 3
columns behind the code it autodeploys (why verify-guard crashed): caught up additively via the
new `scripts/demo/run-sql.mjs`, and verify-guard now passes 15/15. The advisor warnings clear on
its next scan. Optional owner toggle for belt and braces: Project Settings -> Data API -> disable,
in both projects (nothing uses it).


### 2026-08-20 — Phase 4
**Closed:** H22, H6, M2, M3, M7. Also, owner ask mid-session: the trivia gate now offers
"Try a different question" (no cost, no limit; both questions were always a refresh away).
**Built:** `src/lib/rate-limit.ts` — the ONE limiter (Upstash sliding windows, fail-open,
IS_DEMO exempt, dev/prod keyspaces split so probes never spend production budget; every
number argued in place). `src/lib/turnstile.ts` — server-side verify; dev/test pin
Cloudflare's official always-pass pair so the enforcement path is identical in every
environment and e2e/visual/QA run unattended; `devBypassAllowed` accepts DEV_LOGIN_SECRET
via timingSafeEqual, non-production only (the Phase 1 mechanism). `src/lib/human-pass-rule.ts`
(+9 unit tests phrased as attacks) — the 5-minute HMAC cookie a fresh signup or completed
reset carries into authorize() instead of a second widget token; bound to ONE address,
replaces only the bot check. Widget: `turnstile-widget.tsx`, appearance "interaction-only",
so login/signup/forgot keep their look (21/21 visual baselines untouched). Login/signup
page.tsx became thin server wrappers passing the site key (protocol-audit allowlist moved
with the rename). Login limits are FAILURES ONLY, read at the door and spent only on a
refusal, so members and QA scripts signing in repeatedly consume nothing; refusals carry
honest codes (`rate-limited`, `bot-check`) the login form shows instead of lying "invalid
password". Reset per IP (M3). Posts 10/10m, comments 30/10m, uploads 40/h across all five
byte paths, reports 10/d, catch-up creation 5/h, all per account (M2). Trivia (M7): fallback
secret deleted (appSecret() throws), per-IP limit in the shared store, pass token HMAC-bound
to a browser id and compared constant-time.
**Proved:** `scripts/qa/phase4-probe.mjs`, **29/29** against the running server: no
proof-of-human → refused BEFORE bcrypt (and LoginAttempt shows the password was never
judged); human pass works for its own address only, dead at six minutes; 10 failures shut an
account across rotated IPs while a bystander account signs in from the attacker's own IP; 30
failures shut an IP; the WHOLE real signup ran unattended in a browser (trivia → form →
Turnstile → account → auto sign-in on /welcome) with two forged-pass sabotages refused
mid-flow; 8 wrong trivia answers shut one IP while a fresh visitor passes first try
(M7's global-bucket DoS pinned dead: discarding cookies does not reopen the IP); 5 reset
requests shut an IP, another IP unaffected, zero reset mail rows written; the 41st presign
in an hour is a 429 while another account passes. `phase4-prod-check.mjs` against a local
production build, **6/6**: QA bypass with the CORRECT secret refused, garbage token refused
by a LIVE siteverify round trip against the real key, dev-login still 404, and a valid human
pass signs in — the positive control that caught the first run being vacuous (UntrustedHost
500s made every refusal "pass"; local prod needs `AUTH_TRUST_HOST=1`, which Vercel sets
itself). `npm run check` clean (18 test files) · visual 21/21 · e2e 22 passed / 1 designed
skip · audit:status **18 fixed** (M2/M3 got probes of their own; H6/H22 probes tightened to
demand the real mechanism, not a keyword) · signup gate screenshotted desktop+mobile, read
personally; question swap driven live (tree → house → tree).
**Notes:** demo stays untouched three ways: IS_DEMO short-circuits every limiter call, a
missing Turnstile secret skips verification, and fail-open means absent Upstash env can
never lock anything. Signup allows 10/h per IP (not 5) for the reunion-crowd-on-one-NAT
case; bots still gain nothing, since every minted account is Stage 0. Blocked-member logins
deliberately do not consume the failure budget (a correct password from a known account is
not a guessing signal). The reset-side human pass (resetPassword → auto sign-in) shares the
exact minting line signup's E2E run proved; not separately behaviour-tested.
**Write-path review (rerun after an interrupt killed the first): clean on all six
adversarial questions** — no gate skips, the human pass cannot cross accounts / replace a
password / outlive 5 minutes, no membership oracle in the new refusals, the renames leak
nothing. Two low findings, one fixed (`verifyTurnstile` and `turnstileSiteKey` now
short-circuit on IS_DEMO — defence in depth for the demo project, which carries real keys
behind closed routes), one deferred to post-deploy: EMPIRICALLY confirm Vercel overwrites
`x-forwarded-for` rather than appending (drive prod /forgot-password 6x with a spoofed
rotating XFF; the 6th must still be refused). The simplify pass consolidated the four
hand-typed constant-time compares into `timing-safe.ts` (human-pass-rule keeps its inline
copy DELIBERATELY: -rule files import nothing relative, or node cannot run their tests —
found the hard way when check went red), one `verifyHumanFromForm` for the two form doors,
one source of truth for the refusal copy (trivia and the login form had already grown
three different sentences for the same throttle), `_probe-kit.mjs` for the QA plumbing
(the R6 lesson, nearly repeated), and a `TURNSTILE_DEV_REAL=1` escape hatch for debugging
live Turnstile locally. Two altitude findings deliberately skipped and worth revisiting in
Phase 9: folding the limit name into `requireVerifiedMember(limit?)` so gate and meter
cannot drift (skipped now: rewrites a Phase 3-proven artifact and the audit-status probes
mid-phase), and unifying the trivia pass onto the human-pass signing primitive (took only
the concrete drift fix: trivia now also rejects future-dated timestamps). Both probes
re-run green after all of it: 29/29 dev, 6/6 prod build.
**Owner needs to:** nothing blocking. Two to verify after this deploys: sign in once on
production (proves the real site key accepts rishivalley.space — the widget side no local
test can reach), and confirm the Turnstile widget list in the Cloudflare dashboard includes
the production domain. If members ever report "We couldn't confirm you're human", that is
the widget/domain mismatch to check first.

**Post-deploy, verified live on production (2026-08-20, same session):**
- **XFF is not spoofable on Vercel — confirmed empirically**, closing the review's deferred
  item: the trivia limiter engaged live, and rotating a forged `x-forwarded-for` did NOT
  reopen it (the platform overwrites the header). Per-IP limits hold as designed.
- A real headless Chrome driving the real production login was **refused by Turnstile with
  the honest bot-check copy**, while the widget loaded with zero console errors — the site
  key accepts the domain, and an automated browser cannot pass the door. That refusal IS
  the feature working; the one thing a bot cannot prove (a human passing) remains the
  owner's one real sign-in.
- `phase4-prod-check` against the live site: 5/6, the human-pass positive control failing
  only because the probe signs with the LOCAL AUTH_SECRET and Vercel's differs — on the
  real deployment mint and verify share one runtime and one secret, which the local
  production build already proved 6/6.
- Owner round, same day, from screenshots: the visible Cloudflare card in dev was my wrong
  test-key variant (visible …AA instead of invisible …BB) — fixed; challenge theme pinned
  light; the swap link became an inline circular-arrow glyph with a one-breath swap
  animation. Deploy times (~1m20 → ~2m since 2026-08-19) are Sentry's build wrapping plus
  PostHog landing, i.e. normal growth; sourcemap upload was already off; the one real
  waste found — puppeteer downloading Chrome on every Vercel build — is now skipped via
  `.puppeteerrc.cjs`.


### 2026-08-20 — Phase 5
**Closed:** C2 (any member could delete every image in R2), and M10, M11, M12, M13, M14, M16, M17.
(M15, malware scanning, is not in this phase — the audit itself parks it as accept-for-now.)
**The C2 shape chosen** — the audit offered (a) validate-on-write with `isUploadedImageUrl` + cap,
or (b) a server-written `objectKey`, delete only by that. **Both, realised as owner-scoped keys**
rather than a per-row column, because a post holds up to three images and a photo three URLs, so the
natural place for "the server decides the key" is the key itself: every upload now mints under
`<purpose>/<uploaderId>/…` (`ownerPrefix` in `storage.ts`), and every write that accepts client image
URLs runs them through `ownedUploadUrls` — app-minted (`isUploadedImageUrl`, moved to the pure
`upload-shared.ts`) AND under the caller's own `uploads/<id>/` prefix, capped at 3. The pure verdict
is `upload-ownership-rule.ts` (+12 attack unit tests); the wrapper wires the real URL parsers so there
is no second copy of the parsing. The two direct-to-R2 finalize paths bind the staged key to the
caller (`STAGING_KEY`/`COLLECTION_ORIGINAL_KEY` now carry an id segment + `keyBelongsTo`). `keyForUrl`
is fenced to the four known roots, so even a raw URL reaching a delete path cannot name an arbitrary
object. Legacy rows (keys with no id segment) still DELETE fine — `keyForUrl` accepts the `uploads/`
root — and editing a legacy draft simply keeps its images rather than dropping them (the ownership
gate ignores a set it cannot vouch for). **M10** falls out of the same gate (external URLs rejected on
posts and Catch-up answers). **M11** `adminRemovePhoto` now deletes the R2 bytes (keeps the row for the
note/record). **M12** `contributePhotoDirect` re-encodes the original through sharp (metadata dropped)
and deletes the raw EXIF-bearing file; full resolution kept, with a resize ceiling only at WebP's hard
16383px so a monster scan is bounded instead of throwing. **M13** `sniffImageType` (magic bytes) guards
every path that ingests client bytes, before libvips. **M14** `sharpImage()` sets `limitInputPixels`
(100MP) at all five sharp call sites. **M16** `headObjectSize` HEAD-checks a presigned object's size
before pulling it into memory (R2 has no `content-length-range`; verified against Cloudflare's S3 docs
— the audit's "presigned POST" fix is not available on this platform, so this is the honest
mitigation). **M17** `MAX_PHOTOS_PER_ACCOUNT` (1000) caps Collection contributions per account.
**Proved:** `scripts/qa/phase5-probe.mjs`, **27/27** against the running server and the REAL R2 bucket
(storage.ts imported in-process — it has no relative imports, so node loads it): a real PNG uploads to
`uploads/<id>/` and exists in R2; text bytes wearing `image/png` are refused (magic bytes); a member
can finalize only their OWN staged key (cross-user 400, own succeeds — positive control); the REAL
composer, driven headless with the upload response FORGED to a victim's URL, creates NO post carrying
that URL and the victim's object survives, while the attacker's own submit does create a post
(positive control, path is live); the exact ownership verdict on real URLs accepts my own image,
rejects the victim's and an external URL, and does not false-reject the victim posting their own; a
GPS/EXIF JPEG comes out of the re-encode pipeline with no metadata; `delImage` really removes bytes
from R2; `keyForUrl` refuses unknown roots. `npm run check` clean (19 test files) · `npm run visual`
21/21 · audit:status **26 fixed** (C2 + M10–M17 now tracked; the H22 probe was also corrected — it
still read the pre-Phase-4 `verifyTurnstile` call site and missed the `verifyHumanFromForm` wrapper
the simplify pass introduced, so it wrongly showed OPEN).
**Write-path review found three real defects the probe missed, all now fixed and re-verified:**
(1) The "Also add to the Collection" tick (`collection-intake.ts`) stored the Collection row's `url`
as the SAME R2 object the post's `images` already pointed at. Harmless until M11 — but M11 made
`adminRemovePhoto`/`declinePhoto` delete a Collection photo's bytes, so removing a tick-contributed
photo would have silently broken the member's still-live feed post. Fixed structurally: the tick now
copies the bytes to the Collection's OWN `collection/<id>/` object (0 aliased rows exist today, so
nothing legacy to migrate). (2) That same tick path bypassed the M17 quota entirely; it now honours
`MAX_PHOTOS_PER_ACCOUNT`. (3) `editPost` on a pre-owner-scoped-keys letter draft would silently drop
image edits, because the draft's legacy `uploads/<year>/...` URLs fail the ownership check; now those
already-stored URLs are grandfathered, only newly-added URLs are gated, and a bad add is a visible
error instead of a silent no-op. Probe extended to 29/29 (grandfather logic proved on real URLs).
Held: ownership wiring on all three write paths, the `keyForUrl` root fence, both direct-finalize
ownership checks, M13/M14/M16 ordering, and the demo's three layers (demo.test.mjs still 19/19).
**Caught in self-review, not by the probe:** WebP's 16383px hard dimension cap — the M12 re-encode
would have thrown on a heritage scan larger than WebP can hold, where the old raw-passthrough stored
it. Bounded with a `fit:inside`/`withoutEnlargement` ceiling so only a >16383px original is touched.
Also, the probe's first run used disposable user ids with underscores; real ids are cuid2
(`[a-z0-9]+`), which the staging-key regex correctly expects, so the probe was misrepresenting the
finalize path — switched to `createId()`.
**No UI moved** (visual 21/21). New user-facing strings appear only on abuse/edge paths (a forged or
external image, a fourth image, a non-image file, an over-quota Collection, an oversized upload); a
member's normal posting and contributing is unchanged. One behaviour change worth the owner knowing:
a Collection photo uploaded through the direct path is now stored as a re-encoded WebP (full
resolution) instead of the exact original bytes, so its download is a WebP and its location metadata
is gone — deliberate, for M12.
**Owner needs to:** nothing blocking. No schema change this phase, so no migration and no demo-DB
step. The R2 bucket stays public-read (H20 accepted); M11's pending-photo-privacy half is bounded by
that posture — a truly private pending prefix would need signed delivery, which conflicts with the
accepted public bucket, so only the concrete "removed photos stay fetchable" half is closed here.


### 2026-08-20 — Phase 6
**Closed:** H7, C3, H18, M19, M27, M32, M18. (H18 was already half-solved: /admin's people list is
keyset-paginated and the worklist queries all carry `take: PER_QUEUE` since the audit, so only
`/api/users-by-batch` was still unbounded.)
**Built / changed:**
- **C3** — `next-auth` beta.30 -> **5.0.0-beta.32** (pinned EXACT, not `^`, so a reinstall cannot
  drift to an untested beta), `sharp` ^0.34.5 -> **^0.35.3** (the vulnerable range ends at 0.35.0;
  0.35.0-0.35.2 have broken type exports, so ^0.35.3 is the floor), `next` 16.2 -> **16.3.1**.
  sharp 0.35 bundles a stricter libpng (1.6.58); `sharpImage` now sets `failOn: "error"` so a
  heritage scan with a merely-cosmetic libpng WARNING (the classic "iCCP: incorrect sRGB profile")
  is still decoded rather than turned away. Its `sharp.Sharp` type moved to a named `Sharp` export.
  **`npm audit --omit=dev` went from 2 critical / 33 total to 0 critical / 3 total.** The second
  critical was `@auth/core@0.41.1` pulled by `@auth/prisma-adapter@2.11.1` (next-auth beta.32 already
  pulls the fixed 0.41.3); bumped the adapter to 2.11.3 so both resolve to 0.41.3. `npm audit fix`
  cleared every remaining HIGH and MODERATE (a Prisma-toolchain sweep: prisma 7.5 -> 7.9.1,
  `prisma generate` re-run, build + both probes green after). The 3 that remain are one
  non-exploitable advisory — `deepmerge-ts` stack-exhaustion via `@prisma/config`, whose only
  offered "fix" is a MAJOR downgrade to prisma 6, and which needs attacker-controlled config objects
  this app never hands it (build/config-time only). Accepted residual; clears when Prisma ships a 7.x
  bump of it.
- **H7** — `next.config.ts` `headers()`: a CSP built as a documented directive map, plus
  X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, X-Content-Type-Options:
  nosniff, Permissions-Policy, and an explicit HSTS. `frame-ancestors 'none'` + X-Frame-Options are
  the clickjacking fix the audit named (framing /settings onto deleteAccount). script-src allowlists
  exactly the three third-party hosts the browser talks to (Turnstile, Razorpay checkout, Vercel
  analytics); PostHog is same-origin via /ingest, Sentry is server-only. It carries
  'unsafe-inline'+'unsafe-eval' — Next needs inline without a nonce pipeline, and once inline is
  allowed eval adds no XSS surface; the real wins are host-allowlisting, frame-ancestors, referrer
  and nosniff. A nonce-based strict CSP is future work.
- **M19** — `/lab` out of `publicPaths` and behind a new `src/app/lab/layout.tsx` that `notFound()`s
  a non-admin (a 404 hides that the tree exists). `/lab/everything`'s internal audit log of quoted
  source paths is no longer reachable by any member.
- **M27** — the never-existent `/api/catchups/tick` the nightly cron 404'd on now exists, wrapping
  `advanceDueCatchups()` (the function was written to be exactly this thin wrapper), required to
  carry `Authorization: Bearer $CRON_SECRET` (timing-safe), and added to `publicPaths` so the
  cookie-less cron reaches it.
- **M32** — poll options moved into the SAME `post.create` as a nested create, so a post and its
  options commit in one transaction instead of a post-then-loop that could leave a partial poll.
- **M18** — `updateContactMethods` now runs its input through `contactMethodsSchema` (the same
  length caps, email format and https-only link rule `profileSchema` applies to those columns) after
  dropping blank repeater rows; a bad link can no longer reach the column trusting only the read-side
  re-check.
- **H18** — `/api/users-by-batch` caps the batch list at 120 and the query at `take: 5000`, so a
  signed-in account can no longer turn it into a whole-table dump.
**Proved:** `scripts/qa/phase6-probe.mjs`, **15/15** against the running server: all five headers
present with `frame-ancestors 'none'` and the Turnstile+Razorpay script hosts allowlisted; a REAL
credentials login mints a session under beta.32 and opens /feed, while a wrong password mints
nothing (the fail-open advisory C3 names, checked live); /lab is 307 signed-out, **404 to a non-admin
member**, 200 to an admin; the tick route is 401 with no/ wrong secret and EXISTS (not 404);
users-by-batch still returns for a real batch. The CSP was iterated against the browser console
(chrome-devtools): it caught Vercel Web Analytics' `va.vercel-scripts.com` loader (added), and a
prod-build run confirmed the login page renders fully — hero image, fonts, and the Cloudflare
Turnstile widget all load under the enforced policy (the one residual eval "issue" is Turnstile's own
bot-fingerprint probing inside Cloudflare's sandboxed iframe, present with OR without our eval
allowance, i.e. not our scripts). `npm run build` exit 0 under all three upgrades · `npm run check`
clean (19 test files) · `npm run visual` 21/21 (16.3 changed no rendering) · `phase5-probe` re-run
**29/29** under sharp 0.35 (a regression caught here: the probe's hand-pasted 1x1 PNG tripped the
stricter libpng — a bad TEST image, not a real one; sharp-generated PNGs and JPEGs process fine, and
the probe now generates a valid PNG). audit:status **33 fixed**.
**Owner needs to:** (1) Confirm `CRON_SECRET` is set in the REAL Vercel project's env (it is the same
secret `/api/demo/reset` already uses) — the nightly Catch-up cron needs it to run; until then the
route 401s and Catch-ups keep advancing via the lazy page-load tick, as they did before, so nothing
regresses. (2) Dependabot's next-auth/sharp/next PRs can be closed as done. Nothing else blocking; no
schema change, no migration, no demo-DB step. User-visible: no layout moved; the only new failure
copy is on invalid contact input (a non-https link, an over-long field), which was silently accepted
before.

### 2026-08-20 — Phase 7
**Closed:** H10, H14, M36, H5.
**Schema (SA-3 migration `2026-08-20-audit-log.sql`, applied via run-sql, RLS-enabled to match the
2026-08-20 posture):** `AuditLog` (id, actorId, action, targetType, targetId, ip, detail, createdAt)
with NO foreign keys ON PURPOSE — actorId/targetId are plain strings and `detail` carries a
denormalised name/email, so a row is immutable and OUTLIVES the accounts it names ("admin X deleted
member Y" must survive Y's deletion, and X's). Plus `@@unique([reporterId, reportedUserId])` on
Report (a pre-check found 0 duplicate pairs, so the index built clean; post reports carry
reportedUserId NULL and Postgres keeps NULLs distinct, so post reporting is untouched).
**Built:** `src/lib/audit.ts` `writeAudit()` — append-only, NEVER throws (the touchLastSeen contract:
an audit write must not turn a successful block/delete/sign-in into an error page), IS_DEMO
short-circuits. `requireAdminActor()` in `admin.ts` returns `{ok, actorId, ip}` so an audited action
can attribute itself. Wired: block/unblock, delete, verify, unverify, role, merge (admin actions),
account.delete (self, M36 — context captured before the row is gone), report.user/report.post.
Sign-ins were ALREADY logged in LoginAttempt since Phase 4, so AuditLog covers what that does not;
the two together are the record. **H5's remainder:** reportUser now dedups per (reporter, reported)
pair (a findFirst fast-path AND a P2002 catch on create, so a concurrent double-flag is the same
graceful "already flagged", not a 500), routes through the same new-thread limiter startThread uses
(reporting can't out-fan messaging), and escalates the admin notification from "someone flagged X"
to "N members have now flagged X" at 3 distinct reporters — standing still changes only by an
admin's hand (the Phase 3 decision), the threshold just tells one voice from a chorus. **H14:** a new
admin-only `/admin/audit` view (recent AuditLog + recent failed sign-ins from LoginAttempt — the
attribution record and the break-in-shape record side by side), linked in the admin nav.
**Proved:** `scripts/qa/phase7-probe.mjs`, **9/9** against the running server: /admin/audit is
redirected signed-out, redirected for a non-admin member, 200 for an admin; a duplicate
(reporter, reported) user-report is refused by the unique index while two post reports from one
member both land; and END TO END — the admin clicks Verify on a disposable member in the real
/admin/people UI, the member is verified AND an `admin.verify` AuditLog row is written attributed to
the admin acting on that member, and it renders on /admin/audit as "Verified". `npm run check` clean
(19 test files) · `npm run visual` 21/21 · the /admin/audit page screenshotted desktop+mobile and
read (clean, responsive, nav active state correct). audit:status **37 fixed, 3 open** (H9/H12 are
Phase 8, H16 Phase 9).
**Write-path review, two findings, both fixed:** (1) the reportUser dedup had a TOCTOU race — two
flags of the same pair racing in both pass the findFirst, and the loser hit the unique index as an
unhandled 500; now the create catches P2002 and returns the same graceful "already flagged". (2)
`deleteAccount` had the SAME RESTRICT-FK break `adminDeleteUser` was fixed for — a self-deleting
member who had ever filed a report threw before the delete, which ALSO meant the M36 audit never
ran for them; now it clears their filed reports first, in a try/catch, so M36 is reliable. That
one-liner **closes H8 early** (its whole content was "deleteAccount throws for report-filers"); the
Phase 8 deletion rework (H9 R2 cleanup, M35 grace/export) still stands on top of it. Review
otherwise confirmed the invariants: writeAudit never throws and always follows a successful
mutation, AuditLog has no FK so rows outlive deletions, /admin/audit inherits the admin-layout gate,
and AuditLog/Report are absent from the demo write-allowlist (default-deny even past the IS_DEMO
short-circuit).
**Owner needs to:** nothing blocking. The audit log begins empty and fills as actions happen; the
failed-sign-in list is already populated (it reads the LoginAttempt table Phase 4 has been writing).
No demo-DB step — the demo writes no audit rows (writeAudit short-circuits on IS_DEMO), and RLS on
AuditLog matches every other table.

### 2026-08-20 — Phase 8
**Closed:** H9, H12, M34, M35 (H8 closed early in Phase 7; its regression is pinned here anyway).
audit:status now **41 fixed, 1 open** (H16, Phase 9).
**Schema (SA-3 migration `2026-08-20-deletion-grace-consent.sql`, applied to BOTH databases — the
demo's directory queries filter on the new column, the Phase 3 P2022 lesson):**
`User.deletionRequestedAt` and `User.consentAt`, both nullable, so nothing existing is touched.
**Built:**
- **Deletion became a request, not an event (M35).** `requestAccountDeletion` replaces the old
  one-call `deleteAccount`: the dialog re-asks for the PASSWORD (a stolen cookie must not be able to
  schedule someone's history for destruction), wrong guesses spend their own `reauth` budget (5/h —
  the login limiter cannot see this second password door), and a correct one stamps
  `deletionRequestedAt`, bumps the credential epoch (every session ends), writes an
  `account.delete_request` audit entry and queues the new `deletion-scheduled` email — the written
  confirmation that is also the takeover alarm, with the purge date and "sign in to cancel".
  Signing in during the 60-day window IS the cancel: authorize() clears the request, writes
  `account.delete_cancel`, and leaves a welcome-back notification. While pending, the account is held
  out of every people surface exactly like a blocked one (directory + counts + pins + city facet,
  search, by-batch, the feed rail card, and both Catch-up enrol paths).
- **The purge (H9).** `src/lib/account-purge.ts` `purgeUserAccount()` — ONE definition of "gone",
  used by `adminDeleteUser` (immediate) and the retention sweep (grace-expired): collect every
  stored-image URL the member's rows point at (avatar, post images, Collection thumb/full/original,
  Catch-up answer images) BEFORE the cascade takes the rows, delete the row in one transaction with
  the H8 report-clearing (a failed delete can no longer half-commit), then delete the R2 objects
  best-effort AFTER the row delete succeeds. `coverPhoto` deliberately not collected — it aliases a
  Collection Photo row's object.
- **Retention (M34).** `src/lib/retention.ts` applies the DECISIONS schedule verbatim (admin
  messages 730d, reports 1095d, payments 3650d, notifications 365d, LoginAttempt+AuditLog 365d,
  OutboundEmail 180d) plus the grace-expired purge, every step individually try/caught, the pass
  itself audit-logged (`retention.sweep` with the counts as detail — "is retention running" is
  answerable from /admin/audit). Trigger: `/api/retention/sweep` (Bearer CRON_SECRET, timing-safe,
  IS_DEMO skips) called nightly by the new `.github/workflows/retention.yml` at 02:30 IST — GitHub
  Actions, NOT a third Vercel cron, because Hobby allows two and both are spent. Documented in
  OPERATIONS.md.
- **The export (M35, Art. 20).** `GET /api/account/export` — strictly self-service (session decides
  whose, no parameter exists), rate-limited 3/day, audit-logged, returns a JSON attachment of
  profile/places/posts/comments/likes/photos/catch-up answers/admin messages/reports
  filed/contributions, and none of the operational columns (hash, epoch, adminNote, role). Reached
  from the new quiet "Download your data" link beside "Delete your account" in settings.
- **The transparency layer (H12).** `/privacy`, `/terms`, `/guidelines` — public, static, in a new
  `(policies)` route group with its own shell and shared typographic pieces; controller contact
  (email + Margravine Gardens, London, no name) at the BOTTOM of the privacy policy per DECISIONS;
  honest about the public image CDN (H20) and the deletion carve-outs. Signup gained the required
  consent tick linking all three (server-enforced — a POST that strips `required` is refused — and
  receipted as `consentAt`, the Art. 7 proof; existing members carry null = assumed agreement, the
  owner's decision). LandingFooter carries the three links, but NOTE: the landing showcase (footer
  included) is behind `SHOW_SHOWCASE = false` (owner, 2026-08-04, hero-only landing), so today the
  documents are reached from the signup consent line and by URL; whether the hero should carry a
  quiet link is the owner's call. New audit actions: account.delete_request / delete_cancel / purge
  / export, retention.sweep — all labelled on /admin/audit.
**Proved:** `scripts/qa/phase8-probe.mjs`, **40/40** against the running server and the REAL R2
bucket, twice (before and after the review fixes): all three documents 200 signed out with the
controller reachable; the REAL dialog refuses a wrong password (nothing recorded) and the right one
records the request + audit row + queued confirmation email while the pre-request session dies at
/feed; signing back in cancels (row cleared, audit, notification); a grace-period account vanishes
from people search while a control account still surfaces; the sweep 401s without/with a wrong
secret, and with it a grace-expired account that had uploaded a REAL image, authored a post wearing
it, and FILED A REPORT (the H8 FK) is purged — row gone, R2 object gone (HEAD), account.purge row
written; seeded 400-day notification / 200-day email row / 400-day login attempt die while fresh
controls survive; the export downloads the caller's own data (attachment header, their post, nobody
else's address), refuses signed out, and is audit-logged; the REAL signup form blocks an unticked
submit in the browser, refuses a `required`-stripped submit at the SERVER, and stamps consentAt when
ticked. `phase4-probe` re-run **29/29** (its signup drive now ticks the box). `npm run check` clean
(19 test files) · `npm run visual` green with two NEW baselines (privacy desktop+mobile, read
personally) — a mid-run feed failure was probe-account pollution in the rail, not a regression ·
all six document/checkbox/dialog surfaces screenshotted desktop+mobile and read.
**Local-tooling note:** the retention probe needs the dev server started with CRON_SECRET in its
environment (`.env` has none and is deny-ruled to sessions); this session used
`CRON_SECRET=dev-cron-secret-for-local-probes-only npm run dev`, and the probe falls back to that
same value. Adding CRON_SECRET to `.env` (owner's hand) would make it self-contained.
**Write-path review: three findings, all fixed and re-proved** — (1) the purge's report-clear +
row-delete were two statements, so a failed delete could silently destroy report history while the
account lived; now one `$transaction` (matters doubly with the sweep running it unattended nightly).
(2) Both Catch-up enrol actions re-validate invitees with their own query and missed the grace
filter — a hand-crafted call could enrol and email someone who asked to leave; both now carry
`deletionRequestedAt: null`. (3) `adminMergeUsers` stranded the duplicate's avatar object in R2 (the
H9 failure shape via merge); it now `delImage`s the source's photoUrl after the transaction commits,
never the coverPhoto (that aliases a Collection row's object, which the merge just re-pointed and
kept alive). Review confirmed sound: authorize() ordering (blocked members can never reach the
cancel), the export's self-scoping and column hygiene, the sweep's windows vs DECISIONS, demo's
three layers untouched (demo.test.mjs 19/19, verify-guard 15/15).
**Design review: three findings, all fixed** — the nine new inline document links and the consent
checkbox lacked focus-visible rings (added, leaf, matching the house convention); the delete dialog
had borrowed the auth pages' mist FloatField, which the design system scopes to pages that ARE a
form — swapped to the standard bordered Input like every other dialog. Re-screenshotted both
viewports after.
**Owner needs to:** (1) REVIEW the three documents before Phase 9 proceeds — screenshots and the
H13 DPA links are in the session handoff. (2) Add the `CRON_SECRET` repository secret on GitHub
(Settings → Secrets → Actions) — same value as the Vercel one — or the nightly retention job fails
loudly with a 401 and nothing is swept; this joins the existing open item of setting CRON_SECRET on
the prod Vercel project. (3) Decide whether the hero-only landing should carry a quiet privacy
link while the showcase stays off.
**Owner answered, same day:** documents approved as written; no privacy link on the hero; the
CRON_SECRET GitHub secret stays an open reminder ("remind me later"). Phases 9–10 green-lit.

### 2026-08-20 — Phase 9
**Closed:** H16, H17. audit:status now **42 fixed, 0 open** (2 accepted, 1 awaiting the owner's
DPA signatures).
**Built:**
- **H16, the CI security gate**, two halves added to `check.yml` after `npm run check`:
  `scripts/qa/npm-audit-gate.mjs` — `npm audit --omit=dev` with a WRITTEN allowlist (a bare
  `npm audit --audit-level=high` is permanently red on the one owner-accepted deepmerge-ts
  residual, and a gate that is always red is a gate nobody reads; each allowlist entry carries
  the reason AND the condition that clears it, enforced by its own unit test) — and
  `audit-status.mjs --fail-on-open=critical,high`, so a quietly undone fix now stops the merge
  instead of shipping. The H16 probe was tightened to demand both real mechanisms, not a keyword.
- **H17, three security test suites**, all running in `npm run check` and therefore in CI
  (23 test files now):
  `security-regressions.test.mjs` pins C1 and C2 closed (no email-match grant in authorize, the
  admin-login route stays deleted, dev-login stays production-dead/secret-gated/role-less, the
  admin email stays out of the bundle, keyForUrl keeps its root fence, ownerPrefix/keyBelongsTo
  survive, both image-accepting write paths keep the ownership gate);
  `gate-coverage.test.mjs` sweeps EVERY `"use server"` file — each exported action must carry a
  gate marker, delegate to a gated sibling, or sit on the written PUBLIC_BY_DESIGN list with its
  reason (the tripwire for the forgotten-gate class that produced H1/H3/L4: a new ungated action
  now fails check until gating it is a decision, not an accident);
  `rich-text.test.mjs` attacks renderRichText — the one dangerouslySetInnerHTML feeder — with
  script tags, attribute breakouts through mention names/ids, javascript: ids, plus the property
  that NO hostile input in a fixed corpus yields a tag outside the renderer's own set.
**Proved:** `scripts/qa/phase9-probe.mjs`, **13/13**, no dev server needed, both directions of
both gates: the npm-audit gate passes the real tree naming its allowlisted advisory, and refuses
a CRAFTED novel advisory (unit test — a real npm audit cannot invent one on demand);
`--fail-on-open` exits 0 on the real tree and exits 1 naming H16 when check.yml is moved aside
(a genuine regression, restored in finally); all three suites pass; the workflow wires all of it.
`npm run check` clean, 23/23 test files. No UI touched, so no visual/screenshot round this phase.
**Found and fixed during the build (the sweep doing its job early):** the first run flagged 10
candidates; triage found my fnBody helper mangled return-type braces (fixed with the
audit-status version), two `src/lib` files matched only because their comments QUOTE the
"use server" directive (discovery now requires it as the module's first statement), the theme
action's one-implementation-two-names delegation (pass 2 follows delegation to a gated sibling),
and the rest were genuinely public token/trivia flows, now on the written list. Also: the C1-c
regression test itself became the one src/ reference to NEXT_PUBLIC_ADMIN_EMAIL and flipped the
audit-status probe to open — trap 2 striking its own guard; the test now splits the literal.
**Owner needs to:** nothing new. The standing reminder: add `CRON_SECRET` to GitHub repo secrets
(retention), and to the prod Vercel project (catchups tick).

### 2026-08-20 — Phase 10
**Closed (code changed):** M29, M33, M8, L3, L5, L9, plus R6's remaining duplication and R7's stale
docs, and the three-PostHog-404s console noise (plan trap 3). **Closed (already true, now tracked):**
M5, M9, M20, M28, M30, M31, M36, L2, L4, L6, L7, L8, L10, L12. **Accepted, with the reason on the
board:** M21, M22, M24, M25, M26, L1, L11; M23 owner-side. The audit-status board now tracks the
audit's WHOLE C/H/M/L set: **74 checked — 63 fixed, 0 open, 9 accepted, 2 awaiting the owner**
(H13 DPAs, M23 secret practice).
**Built / changed:**
- **M33** — `src/lib/origin-rule.ts` (+9 attack unit tests): a request carrying an Origin header
  must name the host it arrived at; absent Origin passes (no browser omits it on the cross-site
  POST this exists to stop, and non-browsers carry no ambient cookie). Wired into all three upload
  routes ahead of auth, so SameSite=Lax is no longer the single point of failure the audit named.
- **M8** — `src/lib/password-rule.ts` (+6 unit tests): NIST-style, no composition theatre — the
  breach-corpus classics at 8+ chars, the site's own "companyname123" family (rishivalley123 and
  friends), and the caller's own email local part. Wired into signup and reset; reset checks
  against a PEEK at the token so a refused password never burns the person's one link.
- **M29** — both Catch-up enrolment paths capped at 100 (a whole batch, argued in place), down from
  the audit's own abuse number of 500.
- **L3** — requestPasswordReset's enqueue moved into after(): both branches now return after the
  same single lookup, closing the timing oracle that recovered the membership fact the identical
  answers exist to hide.
- **L9** — registerUser catches the create's P2002 race and answers the same sentence as the
  pre-check instead of a 500.
- **L5** — the one production log line carrying an address (the undeliverable-address warn) now
  masks it; the dev-mode full prints are local-only by design and stay.
- **R6/R7** — the last two hand-copied `insensitive` gates (directory/where.ts, city-scope.ts) now
  import the one definition in db-text.ts; AGENTS.md's auth section rewritten (it still claimed
  database sessions and documented the DELETED admin bypass as a working feature).
- **Trap 3** — the three PostHog 404s on every page: posthog-js probes a versioned asset path the
  asset host does not serve, then falls back. A rewrite maps the versioned probe onto the
  query-string form, so every page load is now 404-free and a real console error has no noise to
  hide in.
**Proved:** `scripts/qa/phase10-probe.mjs`, **11/11** against the running server: a cross-site
Origin (and the sandboxed-iframe "null") with a VALID member cookie is 403 on all three upload
routes while the site's own origin and origin-less probes still upload (positive controls); the
REAL signup form refuses Password123 with the new copy and no row, then lands a decent password on
the same form (non-vacuous), and a duplicate address gets the friendly sentence; a page load
produces zero /ingest 404s. Regression re-runs after the route changes: phase5-probe **29/29**,
phase8-probe **40/40**. `npm run check` clean (25 test files). Phase 9's CI run passed on GitHub
(the new security gate's first real outing). No UI changed, so no visual/screenshot round.
**Local-tooling note:** `npm run build` cannot run inside this session's sandbox — two
owner-added images in public/images/collection carry com.apple.provenance and read as EPERM under
seatbelt (earlier sessions built fine; Vercel builds from the git checkout). The next.config
rewrite was validated by the restarted dev server and verified live in the browser instead.
**R-series disposition:** R6 (above), R7 (above), R9 already fixed (the self-deriving client key),
R10/R11 are praise. R1-R5, R8 are performance/refactoring items with no exposure, parked for the
post-launch backlog on the audit's own phasing; R5's security half (a check lost in a 1,400-line
file) is now covered by the gate-coverage sweep, which fails check on any ungated new action.

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
4. work it
5. verify (see VERIFICATION below) # non-negotiable, every phase
6. commit each coherent piece as it passes
7. append to SESSION LOG at the bottom of this file, and to progress.md
8. stop, and report what closed
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
| 4 | Bot defence and rate limiting | H22, H6, M2, M3, M7 | next |
| 5 | Object deletion and uploads | C2, M10–M17 | |
| 6 | Headers, dependencies, quick highs | H7, C3, H18, M19, M27, M32, M18 | |
| 7 | Audit log and admin accountability | H10, H14, M36, H5 | |
| 8 | Deletion, retention, privacy layer | H8, H9, H12, M34, M35 | |
| 9 | CI hardening and security tests | H16, H17 | |
| 10 | Remaining mediums and lows | the rest | |

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


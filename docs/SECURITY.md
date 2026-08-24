# Security — the reference

**One document, consolidated 2026-08-20** from the three working files of the security overhaul
(`docs/planning/SECURITY-AUDIT.md`, `OWNER-INPUT-REQUIRED.md`, `SECURITY-FIX-PLAN.md`), which are
deleted. Their full text — 85 findings with file:line evidence, the owner Q&A, and the ten
session logs — lives in git history: `git log --follow -- docs/planning/SECURITY-AUDIT.md`.
This file keeps only what a future session or the owner needs going forward.

**The work is done.** All ten phases shipped and deployed on 2026-08-20. Ground truth was never a
document and still isn't:

```
npm run audit:status        # 74 findings tracked: 63 fixed, 9 accepted, 2 owner-side, 0 open
```

Every probe on that board reads the real tree, so a regression re-opens a finding automatically —
and CI fails the push (see The gates, below).

---

## The machinery, and what must not be broken

Each mechanism below closed real findings. Weakening one re-opens them; most are regression-pinned
by tests that will say so.

**Sessions and sign-in** (`src/lib/auth.ts`)
- JWT sessions. Revocation is `User.credentialVersion`: stamped into the token at sign-in,
  compared against the row on every read. A password reset, block, deletion request, or account
  deletion ends every live session by bumping it. Deleted rows and blocked members are dropped in
  the session callback; `auth()` is the one funnel every page and action uses.
- There is NO admin bypass and no email-match role grant. Local tooling signs in via
  `POST /api/dev-login` (needs `DEV_LOGIN_SECRET`, never grants a role, 404 on production builds).
  `src/lib/security-regressions.test.mjs` pins all of this deleted-shape forever.
- The door is metered (failures only): 10/15m per account, 30/15m per IP, honest refusal codes.
  Turnstile proves a human before bcrypt runs; a fresh signup/reset carries a 5-minute HMAC
  "human pass" instead of a second widget. Dev/test pin Cloudflare's always-pass keys so the
  enforcement path is identical everywhere.
- Passwords: 8+ chars AND `src/lib/password-rule.ts` (breach-corpus denylist, the site's own
  name-family, not-your-own-email), enforced at signup and reset.

**The trust model** (owner's capability table, 2026-08-19 — the law for every new feature)

| | Stage 0 · no email confirmed | Stage 1 · email confirmed | Stage 2 · profile verified |
|---|:---:|:---:|:---:|
| Read feed, posts, letters | ✓ | ✓ | ✓ |
| Directory map (zoom/pan, counts) | ✓ | ✓ | ✓ |
| See names, profiles | ✗ | ✓ | ✓ |
| Contact details ("Get in touch") | ✗ | ✗ | ✓ |
| EVERY community write (post, comment, upload, report, Catch-ups…) | ✗ | ✗ | ✓ |
| Own profile; message the admin | ✓ | ✓ | ✓ |

`requireVerifiedEmail()` / `requireVerifiedMember()` in `src/lib/`. Verification is manual (the
owner) plus the roster auto-verify (`RosterEntry`, 2,134 people from the office sheets; email
match, or name+batch — never auto-filling admission number or house). A capability lives everywhere
its data is SERIALIZED, not on one route — the Phase 3 lesson.
`src/lib/gate-coverage.test.mjs` fails `npm run check` for any exported server action without a
gate or a written public-by-design reason.

**Uploads and stored images** (`src/lib/storage.ts`, `upload-*`)
- Every object minted under the uploader's own prefix (`uploads/<id>/…`); writes accepting image
  URLs pass `ownedUploadUrls` (app-minted AND caller-owned, max 3); `keyForUrl` refuses anything
  outside the four known roots. Magic-byte sniffing before sharp; `limitInputPixels`; presigned
  objects HEAD-checked for size; EXIF/GPS stripped from Collection originals; per-account photo
  quota. The three upload routes also refuse cross-site Origins (`src/lib/origin-rule.ts`) before
  auth runs.

**Deletion, retention, the member's rights**
- `purgeUserAccount` (`src/lib/account-purge.ts`) is the ONE meaning of "gone": collect every
  stored-image URL first, delete the row (one transaction with the filed-reports clearing), then
  the R2 bytes. Used by `adminDeleteUser` (immediate) and the sweep (below).
- Self-deletion is a REQUEST: password re-auth in the dialog, `deletionRequestedAt` stamped, every
  session ended, a confirmation email with the date, 60-day grace. Signing in during the window
  cancels it (in `authorize()`). Pending accounts leave every people surface like blocked ones.
- The retention sweep (`src/lib/retention.ts`) runs nightly — GitHub Actions `retention.yml` →
  `GET /api/retention/sweep` with `CRON_SECRET` — applying the owner's schedule and finalising
  expired deletions. Every pass writes a `retention.sweep` audit line, so "is it running" is
  answered on /admin/audit. **Verified live end to end 2026-08-20.**
- `GET /api/account/export` is the Art. 20 download: strictly self-service, 3/day, audit-logged.

| Retention (owner, 2026-08-19) | Kept |
|---|---|
| Admin messages | 2 years |
| Reports | 3 years |
| Payment records | 10 years |
| Notifications | 1 year |
| Login + audit logs | 1 year |
| Sent-email log | 180 days |
| Presence + search telemetry (`Visit`, `SearchLog`) | 90 days |
| Deleted accounts | purged 60 days after the request |

*Presence added 2026-08-21 (bug audit B-093): both tables were created after the sweep was written
and neither had any expiry at all. Cut from 180 to 90 on 2026-08-25 (bug-report-2 C-164): `Visit` is
one ~750-byte row per session, and at this project's own stated scale -- 2,000 members, 30 views a
day -- 180 days of it is over half a gigabyte against a 500MB plan. 90 days is exactly the deepest
lookback any analytics view uses, so nothing the owner can currently see gets shorter.*

**Accountability** — `AuditLog` (no foreign keys ON PURPOSE: rows outlive the accounts they name)
via `writeAudit()` (never throws; IS_DEMO short-circuits), covering every admin action, deletion
lifecycle, reports, exports, sweeps. `/admin/audit` shows it beside the failed-sign-in record
(`LoginAttempt`). Report abuse: one report per (reporter, reported) pair, thread-limited,
escalation copy at 3 distinct reporters — standing only ever changes by an admin's hand.

**Headers** — CSP (host-allowlisted scripts; carries `unsafe-inline`/`unsafe-eval` because Next
needs inline without a nonce pipeline — a strict nonce CSP is future work), frame-ancestors
'none' + X-Frame-Options, Referrer-Policy, nosniff, Permissions-Policy, HSTS. In `next.config.ts`.

**The legal layer** — `/privacy`, `/terms`, `/guidelines` (public, owner-approved 2026-08-20;
controller contact buried at the bottom of the privacy policy per the owner's decision: email
sanan.shankar@gmail.com, Margravine Gardens, London, no name printed). Signup has a required,
server-enforced consent tick recorded as `User.consentAt`; members who pre-date it carry null =
assumed agreement (owner's decision). The landing footer links exist but sit behind
`SHOW_SHOWCASE=false`; owner declined a hero link.

**The demo** stays exempt three ways everywhere: `IS_DEMO` short-circuits (gates, limiters, mail,
audit), the proxy's closed lists, and the Prisma write-allowlist that default-denies any model not
named. `src/lib/demo.test.mjs` holds the layers honest; a NEW model on a write path the demo can
reach needs a deliberate allowlist decision.

## The gates

- `npm run check` — types, lint, protocol, lab registry, all 25+ unit test files (which include
  the security suites: `security-regressions`, `gate-coverage`, `rich-text`, `origin-rule`,
  `password-rule`, `demo`, the `-rule` files).
- CI (`check.yml`) additionally runs `scripts/qa/npm-audit-gate.mjs` — npm audit with a WRITTEN
  allowlist (sole entry: the deepmerge-ts advisory via @prisma/config, build-time only, accepted
  2026-08-20; clears when Prisma bumps it) — and `audit-status --fail-on-open=critical,high`, so a
  new advisory or a re-opened finding stops the merge by name.
- Behavioural probes, `scripts/qa/phase{4..10}-probe.mjs`: each proves its phase against the
  running server (and the real R2 bucket where relevant), refusals AND positive controls. Run the
  relevant one after touching its area. phase8/phase10 need the dev server started with
  `CRON_SECRET` in its environment (the probes default to `dev-cron-secret-for-local-probes-only`;
  `.env` is deny-ruled to sessions).

## The accepted-risk register

Each is on the audit:status board with its reason; the short version:

- **Public-read R2 bucket (H20)** — owner chose to leave public 2026-08-19; image URLs are
  unguessable but shareable. Disclosed honestly in the privacy policy. Revisit post-launch
  (signed URLs or a custom domain with hotlink protection).
- **One database for prod and dev (H15)** — staging declined (cost); the nightly verified backup
  is the mitigation. `prisma db push` remains forbidden.
- **Hobby/free tiers, one region (M25/M26)** — owner decision; the mail queue and backups absorb
  the sharp edges.
- **No field-level encryption (M21), schema debt (M22), single signing key (M24)** — accepted with
  reasons; M24's rotation path is "set a new AUTH_SECRET, everyone re-authenticates".
- **Login email as fallback contact (L1)** — mitigated by the Stage 2 contacts gate; switching to
  displayEmail-only is an owner call (it would blank most existing contacts).
- **Secrets practice (M23)** — owner-side: .env + the two dashboards; rotate on compromise.
- **DPAs (H13)** — Vercel/Cloudflare/Resend apply automatically with their terms
  ([vercel.com/legal/dpa](https://vercel.com/legal/dpa),
  [cloudflare.com/cloudflare-customer-dpa](https://www.cloudflare.com/cloudflare-customer-dpa/),
  [resend.com/legal/dpa](https://resend.com/legal/dpa) + their signed PDF). Razorpay publishes
  none (their merchant terms govern). **Supabase's sign-a-DPA form was declined by the owner,
  2026-08-20** (third-party contract service wanting personal details); their standard terms still
  govern the processing — a paperwork gap, not a data-handling one. Do not re-raise.
- **Art. 9 special-category question** — considered and dismissed by the owner. Do not re-raise.
- **R-series** (offset pagination, N+1s, interactive transactions on PgBouncer, oversized modules,
  dead columns) — performance/refactoring backlog, no exposure; the gate-coverage sweep covers the
  one security half (a check lost in a big file).

## Open with the owner

- Nothing. The second admin's temporary password was changed by the owner on 2026-08-20, which was
  the last open item.
- No launch date; completeness beats speed. Post-launch revisits: H20 signed delivery, a
  nonce-based CSP, M21 encryption, the R-series backlog.

## A note on the Turnstile checkbox

The production widget is Cloudflare's **Managed** mode with `appearance: interaction-only`: most
members see nothing, but a visitor Cloudflare finds suspicious (incognito, VPN, automation
signals) gets the "Verify you are human" checkbox. That is the design working, not a bug — the
alternative (Invisible mode, changeable in the Cloudflare dashboard) refuses suspicious HUMANS
outright with no way to prove themselves. Since 2026-08-20 the forms answer an unticked submit
instantly ("Please tick the box first") instead of hanging out a 12-second token timeout into a
doomed request.

Three things changed on 2026-08-22, after the owner's sister met the checkbox on Safari in the UK
and had to tick it twice:

- **The second tick was ours.** `getToken()` re-armed the widget the instant it handed the token
  over, to have the next one brewing early. Measured at 33ms into a 2.5s sign-in — so anyone with a
  checkbox watched their tick wipe itself under a button still reading "Signing in...". Re-arming
  now belongs to the form and happens only once an attempt has actually failed, which is when a
  retry becomes possible and the spent token genuinely has to be replaced.
- **It fits the form now.** `size: "flexible"` instead of the fixed 300px box, which had sat short
  of the 400px fields with eggshell beside it, plus a `clip-path` rounding it to the fields' 12px.
  Everything inside the challenge is a cross-origin iframe and cannot be styled: not the white
  fill, not the type, not the logo. The width, the corners and the frame around it are the whole of
  what we own. (`clip-path`, not `overflow-hidden` — see the comment in `turnstile-widget.tsx`.)
- **The interactive path can be seen locally.** `TURNSTILE_DEV_CHALLENGE=1` pins Cloudflare's
  always-challenge test key. Dev otherwise pins the invisible always-pass key, so nobody here had
  ever watched a member tick the box, which is exactly how the re-arm bug shipped.

Pre-Clearance, which would stop re-challenging someone who has already passed, needs the hostname
proxied through Cloudflare. `rishivalley.space` answers `server: Vercel` with no `cf-ray`, so it is
DNS-only and Pre-Clearance is not available to us.

## Traps that have already cost time

1. A local production server needs `AUTH_TRUST_HOST=1` or every auth route 500s and refusal tests
   pass vacuously — always include a positive control.
2. `*-rule.ts` files must import nothing relative, or node cannot run their tests.
3. Schema changes are a dated idempotent file in `prisma/migrations-manual/` applied via
   `scripts/dev/run-sql.mjs` — to BOTH databases when a queried column is involved (the demo
   P2022 lesson). Never `prisma db push`.
4. Grep for a removed symbol matches the comment explaining its removal — decomment first. This
   has bitten audit-status probes AND the tests that guard them.
5. `PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` for
   probes; `timeout` doesn't exist on this Mac; `verify:shot` wants a bare filename.
6. Deleting a route leaves a stale `.next` type — `rm -f .next/dev/types/validator.ts`.
7. Heavy parallel load (visual suite + probes + screenshots on one dev server) produces flaky
   failures that look real. Re-run quiet before believing a red.

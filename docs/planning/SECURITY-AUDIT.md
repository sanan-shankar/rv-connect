# Security, Compliance, Architecture & Production-Readiness Audit
## Rishi Valley alumni platform (`rv-connect`) — consolidated report, 11 August 2026

**Target:** Next.js 16 (App Router), React 19, Prisma / Supabase Postgres (`ap-south-1` Mumbai),
NextAuth v5-beta, Cloudflare R2, Razorpay, Resend, Vercel.
**Commit audited:** `824eac3` (2026-08-11, HEAD).
**Codebase:** ~97,500 LOC excluding the generated Prisma client · 70 page routes (38 of them `/lab`
dev rooms) · 10 API routes · 20 server-action modules, ~86 exported actions · 30 Prisma models in a
761-line schema · 14 unit tests.
**No source files were modified by either audit.**

---

## Provenance of this document

This report consolidates **two independent read-only audits** performed on the same commit, with
duplicate findings merged and every unique observation from each preserved:

| Source | Scope | What it uniquely contributes |
|---|---|---|
| **Audit A** — re-verification pass (`SECURITY-AUDIT-2026-08-11.md`) | Re-opened every finding of an earlier audit written against `274f087` (2026-08-08) at its cited file and traced it against current code, then ran an independent pass over the ~3,900 lines of auth/email/token code added in the 11 commits since. | The historical verification record (what survived, what was fixed); four findings in the new email subsystem (N1–N4); the detailed "verified clean" confirmations; the collection-photo second leg. |
| **Audit B** — independent enterprise pass (`SECURITY-AUDIT-2026-08-11-independent.md`) | Deliberately conducted **without reading** any prior review, so it could not inherit their conclusions or blind spots. Read the auth core, the proxy, all 10 API routes, all ~86 server actions, the full schema, storage, mail queue, token layer, payment layer, demo isolation, every dynamic-route page guard, **the framework source**, and **the build output**. | Compliance, infrastructure, DevOps, DR, scalability, code-quality and business-logic coverage; dependency-advisory analysis; the build-artefact confirmation of the admin address; the server-action cross-route forwarding mechanism. |

The earlier audit that Audit A re-verifies (`docs/planning/SECURITY-AUDIT.md`, written against
`274f087`) was never committed to git and no longer exists on disk. **Audit A's re-verification text
is now the only surviving record of those findings, and it is reproduced in full below and in
Appendix C.**

Two independent passes converging on the same Critical findings, from different starting points and
by different methods, is itself evidence: these are not artefacts of one reviewer's mental model.
Where the two disagreed on severity, the disagreement is recorded explicitly rather than averaged
away.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Master severity index](#2-master-severity-index)
3. [Critical findings](#3-critical-findings)
4. [High findings](#4-high-findings)
5. [Medium findings](#5-medium-findings)
6. [Low findings](#6-low-findings)
7. [Reliability, scalability & maintainability](#7-reliability-scalability--maintainability)
8. [Session & token security assessment](#8-session--token-security-assessment)
9. [Verified clean and correct by design](#9-verified-clean-and-correct-by-design)
10. ["Vibe coding" risk indicators](#10-vibe-coding-risk-indicators)
11. [AI integration & privacy review](#11-ai-integration--privacy-review)
12. [Production-readiness scores](#12-production-readiness-scores)
13. [Remediation roadmap](#13-remediation-roadmap)
- [Appendix A — targeted vulnerability audit](#appendix-a--targeted-vulnerability-audit)
- [Appendix B — ID cross-reference map](#appendix-b--id-cross-reference-map)
- [Appendix C — prior-audit verification record](#appendix-c--prior-audit-verification-record)
- [Appendix D — notes on method](#appendix-d--notes-on-method)

---

# 1. Executive summary

**This is not a "vibe coded" codebase in the usual sense.** The comment density, the reasoning
recorded next to security decisions, the token design in `src/lib/auth-tokens.ts`, the Razorpay HMAC
handling in `src/lib/razorpay.ts`, the demo default-deny Prisma extension in `src/lib/demo.ts`, and
the per-action authorization discipline in `src/app/(main)/catchups/actions.ts` are all above the
standard of most seed-stage SaaS. Several controls are genuinely good engineering: the "queue stores
ingredients, mints the token at send time" decision, the constant-time signature compare, the
`$allOperations` (not `$allModels`) placement in the demo guard, the raw-body webhook verification.
Someone was thinking.

**And it would fail an enterprise security review outright, on the first item.**

The platform ships a publicly reachable, unauthenticated endpoint that mints a full administrator
session for anyone who supplies one string — and that string is compiled into the public JavaScript
bundle. This was verified against the build output, not inferred from source. It is not a theoretical
finding. It is a five-second, no-tools, total compromise of every member's personal data, and it is
documented in the repository as an intentional feature. A second, independent path to the same
compromise exists in the ordinary login form. **Both audits found this first, independently.**

Beyond that headline, the pattern running through every finding is consistent: **the authorization
thinking is excellent where it was applied, and completely absent where nobody thought to look.**
Two data-returning server actions have no authentication check at all. `isBlocked` — the platform's
entire moderation control — is enforced in six read queries and in zero write paths and zero
authentication paths, so banning someone does nothing. The image-deletion path trusts a
client-supplied URL list, which means any member can permanently wipe the production object store,
including the scanned heritage photo archive, with no versioning and no backup behind it. Account
deletion throws for anyone who has ever filed a report, which is a GDPR Article 17 failure with a
stack trace attached.

**The one genuine improvement since the earlier audit:** a complete, and genuinely well-built, email
subsystem now exists — hashed single-use tokens, CSPRNG, TTLs, rate limits, a priority send-queue
with a reserved slice for resets, constant-shaped "forgot password" responses, and a "confirm your
email before you can write" gate enforced **server-side** and applied consistently across the
community-write surfaces (posts, comments, letters, all three upload routes, collection
contributions, the catchup write paths). This closed the previous audit's "no email verification, no
password reset" finding outright and hardened the upload surface. `src/lib/auth-tokens.ts` is the
strongest security code in the repository. It makes the surviving admin bypass stand out more
starkly, not less.

**What the new work did not fix:** every Critical and every High from the earlier audit. All five
Highs (unauthenticated directory scrape, private-content IDOR, cross-user image deletion, blocked
users never de-authorized, one-click verified-badge strip) and every Medium (incomplete and broken
deletion, no security headers, no rate limiting, tracking-pixel image URLs, no audit trail,
enumeration, orphaned hidden photos, non-transactional poll create, no upload throttle) are still
present, verbatim.

**The compliance posture is effectively nil:** no privacy policy, no cookie notice, no consent
capture, no Article 30 processing record, no data-retention policy, no audit log, no
breach-detection capability, no DPA with the four processors handling EU/UK residents' data, and a
cross-border transfer (EU alumni → Mumbai) with no transfer mechanism recorded.

**Production-readiness is similarly thin:** no monitoring, no alerting, no error tracking, no
verified backups, no R2 versioning, no rate limiting on authentication, a single unbacked-up
Supabase instance shared between production and every developer laptop, 33 known dependency
vulnerabilities including two Critical advisories that land directly on the authentication library in
use, no CI of any kind, and a "cron" in `vercel.json` pointing at a route that does not exist and has
therefore been 404ing nightly without anyone noticing.

**Verdict: not fit for production with real personal data in its current state.** The four Critical
items in §3 must be closed before the site is exposed to anyone. They are all small, well-understood
fixes — under a week of work. The compliance and operational gaps are larger but are mostly
first-time-setup work rather than refactoring.

**On scale.** The "millions of users" ambition is not currently plausible: the admin page loads the
entire `User` table into memory unbounded, `/api/users-by-batch` returns an unlimited array, and the
mail queue is drained by whoever happens to load a page.

**The single most useful sentence in this report:** every Critical finding here would pass
`npm run check` today. The gate runs TypeScript, ESLint, a colour-and-shape design audit, a
lab-registry audit and 14 unit tests. It has never once asked "does this endpoint check who is
calling it." The discipline exists; the enforcement does not. Point the gate at authorization and
this codebase's existing rigour will do the rest.

---

# 2. Master severity index

Severity is the **higher** of the two audits' ratings where they diverged; divergences are noted.
"Source" gives the original IDs (A = re-verification pass, B = independent pass) so both prior
documents remain traceable.

| ID | Sev | Finding | Primary location | Source |
|---|---|---|---|---|
| **C1** | Critical | Unauthenticated admin takeover (3 parts) | `auth.ts:30-49`, `api/auth/admin-login/route.ts:7-70`, `login/page.tsx:345-372` | A:C1,C2,C3 · B:C-1,C-2 |
| **C2** | Critical | Any member can delete every image in the R2 bucket | `feed/actions.ts:117→278→29` → `storage.ts:183,168,151` | A:H3 · B:C-3 |
| **C3** | Critical | 33 production dependency advisories; 2 Critical on the auth library | `package.json` | B:C-4 · A:L3 |
| **C4** | Critical (op) | No verified DB backup; no R2 versioning or backup | infrastructure | B:F-61,F-62 |
| **H1** | High | `loadDirectoryPage` has no authentication check | `directory/actions.ts:39-61` | A:H1 · B:F-7,F-10 |
| **H2** | High | `proxy.ts` is not an authorization boundary for server actions | `proxy.ts:107-110,161-163` | B:§5 · A:H1 note |
| **H3** | High | Private-content IDOR: comments, likes, bookmarks, polls | `feed/actions.ts:234,405,455,477,908,954` | A:H2 · B:F-11,F-12 |
| **H4** | High | `isBlocked` never enforced; blocking is cosmetic | `auth.ts:18-66,90-105`; all writes | A:H4 · B:H-3,F-2 |
| **H5** | High | `reportUser` strips any member's verified badge, unlimited | `report-action.ts:96-143` | A:H5 · B:F-15,F-44 |
| **H6** | High | No rate limiting, lockout, MFA or bot protection on auth | `api/auth/callback/credentials` | A:M4 (Med) · B:F-1 (High) |
| **H7** | High | No security headers of any kind | `next.config.ts`, `vercel.json` | A:M3 (Med) · B:F-30 (High) |
| **H8** | High | `deleteAccount` throws for anyone who filed a report | `settings/actions.ts:245-255`; `schema.prisma:404` | A:M2 · B:H-2,F-51 |
| **H9** | High | Deletion never removes stored bytes; orphaned content survives | `settings/actions.ts:245-255` | A:M1 · B:H-2,F-52,F-55 |
| **H10** | High | No audit log anywhere | schema; `admin-actions.ts` | A:M6 (Med) · B:F-57 (High) |
| **H11** | High | No monitoring, alerting or error tracking | infrastructure | B:F-58 |
| **H12** | High | No privacy policy, consent, or transparency layer | all 70 routes | A:L9 (Low) · B:H-1 (High) |
| **H13** | High | Cross-border transfer with no mechanism; no DPAs | infrastructure | B:H-4 |
| **H14** | High | No breach-detection capability | — | B:H-6 |
| **H15** | High | Production and local dev share one live database; no staging | `AGENTS.md`, `CLAUDE.md`, `.env` | B:F-19,F-37 |
| **H16** | High | No CI/CD, no branch protection, no security gate | repo | B:F-36 · B:§9 |
| **H17** | High | 14 tests for 97,500 LOC; none test security | `*.test.mjs` | B:F-72 |
| **H18** | High | Unbounded queries that will OOM | `admin/page.tsx:63-74,99-113`; `users-by-batch/route.ts:24` | B:F-65,F-13 |
| **H19** | High | No RTO/RPO, no runbook, no IR plan; schema not reproducible | ops; `prisma/migrations-manual/` | B:F-63,F-64 |
| **H20** | High | Object storage is public-read, permanent, unsigned | `storage.ts` | A:L11 · B:F-22 |
| **H21** | High | `verifyState` gates nothing: profile verification is decorative | `verified-mark.tsx:28`; no consumer | added 2026-08-12 |
| **H22** | High | No bot or automation defence on any public entry point | signup, login, reset, directory | added 2026-08-12 |
| **M1** | Med-High | Member enumeration and bulk harvesting | `auth/actions.ts:67-69`; `users-by-batch`; `users/search` | A:M7 · B:H-7,F-5,F-13 |
| **M2** | Med-High | No rate limiting on any content-creating action or API route | everywhere | A:M10 · B:F-14 |
| **M3** | Med-High | Public reset requests can exhaust the whole day's mail budget | `email-actions.ts:149`; `email-queue.ts:69,80,137` | B:F-16 |
| **M4** | Medium | Password reset/change does not revoke existing sessions | `auth.ts:69-71`; `email-actions.ts:234-289` | A:N1 · B:§12 |
| **M5** | Medium | JWT strategy: no revocation, no session inventory; docs wrong | `auth.ts:69-71` | B:F-4 |
| **M6** | Medium | A deleted user retains a working session for 30 days | `auth.ts:106` | B:F-3 |
| **M7** | Medium | Trivia gate: weak, hardcoded fallback secret, limiter is a DoS primitive | `trivia-actions.ts:89,162-166,191,208` | A:L2 · B:F-6 |
| **M8** | Medium | Password policy is length-only | `validators.ts:19` | B:F-8 |
| **M9** | Medium | No re-authentication for sensitive operations | `settings/actions.ts`, admin actions | B:F-9 |
| **M10** | Medium | Feed and Catch-up entries accept arbitrary external image URLs | `validators.ts:115`; `catchups/actions.ts:143` | A:M5 · B:F-28 |
| **M11** | Medium | Pending and hidden Collection photos stay publicly fetchable | `collection/actions.ts:73,192,459` | A:M8 |
| **M12** | Medium | Presigned Collection originals bypass re-encoding; EXIF/GPS public | `collection/actions.ts:271` | B:F-27 |
| **M13** | Medium | Content-type trusted from the client; no magic-byte check | `upload/route.ts:59`; `collection/actions.ts:86`; `settings/actions.ts:189` | A:L7 · B:F-25 |
| **M14** | Medium | No `sharp` `limitInputPixels`; decompression-bomb exposure | all 5 `sharp()` call sites | A:L6 |
| **M15** | Medium | No malware scanning on uploads | — | B:F-26 |
| **M16** | Medium | Presigned PUT cannot enforce object size | `storage.ts:112-130` | B:F-23 |
| **M17** | Medium | No per-account storage quota | upload paths | A:M10 · B:F-29 |
| **M18** | Medium | `updateContactMethods` bypasses `profileSchema` entirely | `profile-actions.ts:116-153` | A:L10 · B:F-32 |
| **M19** | Medium | 38 `/lab` dev routes public in production, incl. an internal findings log | `proxy.ts:163`; `lab/everything/_findings.ts` | A:L8 · B:F-34 |
| **M20** | Medium | No row-level security; one DB role with full DML | `schema.prisma` | B:F-21 |
| **M21** | Medium | No field-level encryption for phones, admission numbers, admin notes | `schema.prisma` | B:F-20 |
| **M22** | Medium | Schema-quality debt that will bite at scale | `schema.prisma` (761 lines) | B:F-24 |
| **M23** | Med-High | Secrets are a plaintext `.env` plus a dashboard; no rotation | `.env` (12 secrets) | B:F-38 |
| **M24** | Medium | `NEXTAUTH_SECRET` is the only signing key, no rotation path | env | B:F-39 |
| **M25** | Medium | Single region; single points of failure throughout | `bom1` | B:F-40,F-70 |
| **M26** | Medium | Free-tier services on the critical path | Resend, Supabase | B:F-42 |
| **M27** | Medium | `vercel.json` cron points at a route that does not exist | `vercel.json` | A:L5 · B:F-18 |
| **M28** | Medium | No scheduler: mail and Catch-ups advance on page view | `(main)/layout.tsx:31-60` | B:F-66 |
| **M29** | Medium | Forced enrolment: one member can add 500 arbitrary users to a group | `catchups/actions.ts:376-451` | B:F-43 |
| **M30** | Medium | `photoTrusted` auto-approval has no revocation path | `collection/actions.ts:151` | B:F-45 |
| **M31** | Medium | No security-relevant metrics | — | B:F-60 |
| **M32** | Medium | Poll options created outside a transaction | `feed/actions.ts:133-143` | A:M9 · B:F-49 |
| **M33** | Medium | API routes have no CSRF token; rely solely on `SameSite=Lax` | `api/upload*` | B:F-35 |
| **M34** | Medium | No retention policy; unbounded accumulation of personal data | schema-wide | B:H-5,F-56 |
| **M35** | Medium | No deletion confirmation, re-auth, grace period or data export | `settings/actions.ts:245` | B:F-53 |
| **M36** | High (combined) | Deletion is silent and unlogged | `settings/actions.ts`; `admin-actions.ts` | B:F-54 |
| **L1** | Low | Login email used as the default public profile contact | `profile/[id]/page.tsx:120,137` | A:L1 (mitigated) |
| **L2** | Low | Reset/verify tokens ride in the URL with no `Referrer-Policy` | `email-queue.ts:232,238` | A:N4 |
| **L3** | Low | `requestPasswordReset` has a timing enumeration side-channel | `email-actions.ts:149-206` | A:N3 |
| **L4** | Low→Med | Verification gate skips report / admin-message / `createCatchup` | `report-action.ts`, `messages/actions.ts`, `catchups/actions.ts:281` | A:N2 |
| **L5** | Low-Med | PII in application logs; unstructured, unscrubbed, no retention | `email.ts:120,132-134,150-152` | B:H-8,F-59 |
| **L6** | Low | Upload finalize validates key *shape*, not ownership | `collection/actions.ts:192-290`; `upload/finalize` | B:F-17 |
| **L7** | Low-Med | Poll voting: no window, unlimited switching, no visibility check | `feed/actions.ts:234` | B:F-46 |
| **L8** | Low | `livemode` filtering on public contribution totals unverified | `support/actions.ts`; `schema.prisma` | B:F-47 |
| **L9** | Low | Signup race condition surfaces an unhandled P2002 | `auth/actions.ts:63-98` | B:F-48 |
| **L10** | Low | `extendDeadline` deletes notifications unscoped by user | `catchups/actions.ts:964-967` | B:F-50 |
| **L11** | Low-Med | R2 token is object-scoped and cannot manage CORS | `storage.ts:104-110` | B:F-41 |
| **L12** | Low | Client-side-only enforcement patterns; cap disagreements | `feed/actions.ts:361`; `tour-local.ts`; `onboarding-local.ts` | B:F-33 |

Reliability, scalability and maintainability items (**R1–R11**) are catalogued in §7.

---

# 3. Critical findings

## C1 — Unauthenticated admin takeover, in three mutually reinforcing parts

**Severity: Critical · Architectural + Implementation · CWE-287, CWE-305, CWE-306 · OWASP A07 / API2**
**Confidence: High** (both paths read unambiguously from source; the public exposure of the
identifier was confirmed against build output.)

Both audits independently ranked this first. It is **one incident in three parts. Fix all three
together, before anything else.**

### C1-a — The password check is skipped entirely for the admin email
`src/lib/auth.ts:30-49`

Inside the Credentials `authorize()` callback, the admin branch runs *before* the password
comparison and returns the user object unconditionally:

```js
if (adminEmail && email === adminEmail) { … return { …, role: "admin" } }
// Regular user: verify password  ← never reached for the admin
if (!password || !user.password) return null;
```

The `password` argument is never read on the admin branch; `bcrypt.compare` at line 52 only runs for
non-admin emails. **The standard `/login` form, with the admin address and any password — including
an empty string — issues a valid admin session.** There is no rate limit (H6), so this is not even
noisy. This path survives deleting the API route in C1-b.

### C1-b — `/api/auth/admin-login` mints a 30-day admin JWT with no credential
`src/app/api/auth/admin-login/route.ts:7-70`; reachable because `src/proxy.ts:161` lists `/api/auth`
as public.

The route accepts an unauthenticated `POST` with `{ "email": "<something>" }`. Its *entire*
authorization check is:

```js
if (email !== adminEmail) return 403   // line 17
```

No password. No secret. No signature. No IP allowlist. No rate limit. No CSRF token. No
`NODE_ENV` gate. No second factor. If the string matches, the route sets `role: "admin"` on the row,
`encode()`s a NextAuth JWT with `role:"admin"` and `maxAge` 30 days (lines 43-57), and sets the
session cookie (lines 61-67). The caller is now the site administrator, and because the session
strategy is JWT (M5) **that token cannot be revoked server-side**.

The only change since the earlier audit is cosmetic — `sameSite:"lax"` and a protocol-derived cookie
name — which does not affect the finding.

> **The demo-mode closure is not a mitigation.** `src/proxy.ts:54-59` closes `/api/auth` in **demo**
> mode only. On the real deployment the endpoint is fully open.

### C1-c — The admin email is compiled into the public JavaScript bundle
`src/app/(auth)/login/page.tsx:345-347`, POST at `:356-372`, password field hidden at `:505`

```js
const isAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL && email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
```

`NEXT_PUBLIC_*` is statically inlined into the client bundle at build time. **This was verified
against the build output** — the address appears in `.next/dev/static/chunks/src_0xnik.6._.js`, a
chunk served to every visitor. It is also the owner's ordinary personal address, so it would be
guessable even without that. It is the same string `ADMIN_EMAIL` that gates C1-a and C1-b.

### Attack vector

View source on the login page → search the JS chunk for `@` →

```
curl -X POST https://rishivalley.space/api/auth/admin-login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<found>"}' -c jar.txt
```

Total elapsed time under a minute, no tools beyond a browser and curl. Or: type the address into the
public login form and press enter.

### Impact

Complete compromise. The admin surface exposes every member's name, sign-in email, batch, admin
notes, verification state and account age (`src/app/(main)/admin/page.tsx:63-113`); every private
member↔admin conversation including bug reports and moderation complaints; every report ever filed
and who filed it. It grants `adminDeleteUser` (irreversible account destruction, cascading to all
their posts, photos and messages), `adminBlockUser`, `adminVerifyUser`, and soft-hide over all
content. It grants `setArchived` on `/lab`. **Combined with C2 it grants deletion of the entire
media bucket.**

**Business impact.** Total loss of member trust in a community whose entire value proposition is
privacy for a closed alumni group. Full personal-data breach.

**Legal.** GDPR Art. 32 (security of processing) failure; near-certain Art. 33/34 notifiable breach
obligation on exploitation; and — because there is no audit log (H10) — you would be unable to tell
a regulator *whether* it was exploited, *when*, or *by whom*, which is itself an Art. 5(2)
accountability failure.

**Aggravating factor.** `AGENTS.md` records this as a working, intentional production feature
("Works locally and on Vercel… owner confirmed 2026-07-18"). It is not a leftover. It is a
documented backdoor, and the documentation calls the fixed Vercel behaviour a success.

### Remediation

1. **Delete the route.** Sign in as admin through the ordinary credentials flow.
2. **Delete the admin branch in `authorize()`.** An administrator authenticates with a bcrypt
   password like everyone else; role comes from the database row, not from a string comparison.
3. **Remove `NEXT_PUBLIC_ADMIN_EMAIL`** and the client-side admin detection. Rename it to a
   server-only variable and drive any login-page branch off a server response, not a build-time
   constant.
4. If a developer bypass is genuinely required, gate it on `NODE_ENV !== "production"` **and** a
   high-entropy `ADMIN_BYPASS_SECRET` compared with `timingSafeEqual` — never on an identifier.
5. **Rotate every secret** afterwards on the assumption this was exploited (see roadmap item 15).

---

## C2 — Any verified member can delete every image in the production R2 bucket

**Severity: Critical · Implementation · CWE-639 (IDOR), CWE-73 · OWASP A01 · Confidence: High**

> **Severity divergence, resolved.** Audit A rated this High (as its H3); Audit B rated it Critical.
> **Critical is correct**, because Audit B additionally established what A did not examine: there is
> no R2 object versioning, no lifecycle policy, and no backup of the bucket anywhere (C4). Without
> those, the action is irreversible, and the target includes a scanned heritage photo archive that
> cannot be re-sourced.

### The chain

```
src/app/(main)/feed/actions.ts:117-129   createPost writes `images` straight through
  → src/lib/validators.ts:115            images: z.string().optional()   (no origin check, no ownership check, no cap)
  → src/app/(main)/feed/actions.ts:278   deletePost  (also cited as :302 in audit A)
  → src/app/(main)/feed/actions.ts:29    deletePostImages
  → src/lib/storage.ts:183               delImage
  → src/lib/storage.ts:168               keyForUrl      (derives the object key by string slicing)
  → src/lib/storage.ts:151               delImageByKey → DeleteObjectCommand
```

The `images` column is a client-supplied JSON array of strings. **Nothing ever checks that those
URLs belong to the caller, that the caller uploaded them, or that they are post images at all.**
`keyForUrl` accepts *any* URL under `R2_PUBLIC_BASE_URL` (or any root-relative `/` path) and derives
the key by string slicing. On post deletion every key in the array is deleted with `Promise.all`,
with no cap on how many.

### Attack vector

1. Browse `/collection`, `/directory` and `/feed` as an ordinary member. Every image's public R2 URL
   is in the rendered HTML. Scrape them — the Collection alone is the community's photo archive.
2. `createPost({ content: "x", images: JSON.stringify([...every scraped URL]) })`. `MAX_FILES = 3`
   exists only in the upload routes, not here; `parseImageUrls` and `deletePostImages` apply no limit.
3. `deletePost(thatPostId)`.

Every named object is now gone. **The same primitive is reachable through `deleteDraft` and through
`editPost` on a letter draft.**

The bar to reach it: a signed-in account with a confirmed email address. Signup requires only a
trivia answer ("What tree was the school built around?" — see M7) and a working mailbox.

**Local-dev variant:** the `unlink` branch at `src/lib/storage.ts:156` additionally allows `../`
path-escape file deletion under `process.cwd()/public`. That branch does not execute in production
(R2 is configured) and no shell is involved, so it is not command injection — but it is the same
untrusted-key flow.

### Impact

Permanent destruction of the entire media archive: every member's avatar, every historical Collection
photograph, every post image. Cloudflare R2 does not retain deleted objects without explicit bucket
versioning, and none is enabled. **This is unrecoverable.** For a school-heritage archive of scanned
originals this is likely the single highest-consequence loss the platform can suffer, and it is one
authenticated request away. Irreversible loss of donated historical material the community cannot
re-source; catastrophic reputational damage.

### Remediation

`delImage` must never accept a caller-supplied URL. Either:

- **(a) validate on write** — reject any `images` entry that is not a URL this app minted for this
  user, exactly the way `src/lib/admin-threads-server.ts:29-33` already does correctly with
  `isUploadedImageUrl`; cap the array length; or
- **(b) better — stop deriving keys from URLs entirely.** Give `Photo` / `Post` a first-class
  `objectKey` column written server-side at upload, and delete only by that.

**Enable R2 object versioning today, regardless of the code fix.** Note that the codebase *already
contains the correct pattern* in the admin-messages path (and audit A independently flagged that
same pattern as the one feed and Catch-ups should copy for M10). It simply was not applied here.

---

## C3 — Critical advisories against the exact auth library, with a fail-open failure mode

**Severity: Critical · Operational + Supply chain · OWASP A06**
**Location:** `package.json` — `next-auth@^5.0.0-beta.30`, `@auth/prisma-adapter@^2.11.1`, and
transitively `@auth/core`.

`npm audit --omit=dev` returns **33 vulnerabilities: 2 critical, 19 high, 10 moderate, 2 low** in
*production* dependencies. Both Criticals land on the authentication library:

| Package | Vulnerable range | Installed | Advisory |
|---|---|---|---|
| `next-auth` | `4.24.8 – 5.0.0-beta.31` | `5.0.0-beta.30` | **"Configuration errors can cause existence-based auth checks to fail open (auth object populated with an error)"** |
| `@auth/core` | `<= 0.41.2` | transitive | Homoglyph `@` bypass in the email normalizer; `getToken()` uncaught exception on malformed `Bearer` headers |

**The first advisory is not generic. This codebase's entire authorization model is existence-based.**
Every one of the ~86 server actions opens with some variant of
`if (!session?.user?.id) return { error: "Not authenticated" }`. That is precisely the pattern the
advisory names as failing open. A configuration error that populates the session object with an
error field rather than returning null would turn **every guard in the application** into a pass.

Also material:

- **`sharp < 0.35.0` (High)** — inherited libvips CVEs (CVE-2026-33327 / 33328 / 35590 / 35591).
  This application runs `sharp` on **arbitrary attacker-supplied image bytes** in five places:
  `src/app/api/upload/route.ts:87`, `src/app/api/upload/finalize/route.ts:67`,
  `src/app/(main)/collection/actions.ts:124`, `src/components/settings/actions.ts:199`,
  `src/lib/collection-intake.ts:80`. Image-decoder memory-safety bugs are a classic RCE path into a
  serverless function that holds the database connection string, the R2 keys and the Razorpay
  secret. Compounded by M13 (the first thing to touch attacker bytes is libvips, because the
  content-type check is a client-supplied string) and M14 (no `limitInputPixels`).
- **`next` (High)** — DoS with Server Components; `16.2.0` is inside the vulnerable range.
- **`lodash` (High)** — code injection via `_.template`.
- **`defu` (High)** — prototype pollution.
- **`ip-address` (High)** — SSRF / trust-boundary bypass via octal octet confusion.

Running `next-auth` on a **beta** release as the sole authentication mechanism for a system holding
personal data is, on its own, an enterprise-review failure. (Audit A tracked this separately as its
L3: `resend` is no longer a dead dependency — it is now the live transport in `src/lib/email.ts` —
but `next-auth` is still `^5.0.0-beta.30` gating all auth.)

**Remediation.** `npm audit fix`, then `npm audit fix --force` for `sharp` (accept the 0.35.x
breaking change and re-verify the five call sites; installed is `^0.34.5`, which resolves inside the
vulnerable range — latest is 0.35.3). Add `npm audit --omit=dev --audit-level=high` as a blocking CI
gate — there is no CI at all today (H16).

> **Correction, verified against the registry on 2026-08-12: "move `next-auth` to a stable release"
> is not actionable.** There is no stable v5. `npm view next-auth dist-tags` returns
> `latest: 4.24.15`, `beta: 5.0.0-beta.32`. And the advisory range — **4.24.8 – 5.0.0-beta.31** —
> *includes* v4 latest, so downgrading to "stable" would leave the Critical advisory open **and**
> require a rewrite of the entire auth layer to the v4 API.
> **`5.0.0-beta.32` is the only published version that is outside the vulnerable range.** The upgrade
> path is therefore `beta.30 → beta.32`, and the platform launches on a beta authentication library.
> That is a real, accepted risk rather than a fixable one; the alternative is migrating off
> `next-auth` entirely (Better Auth, Clerk, Auth0), which is a multi-week project. See
> `docs/planning/OWNER-INPUT-REQUIRED.md` §2.4 for the decision.

---

## C4 — No verified database backup, and no backup or versioning of R2 at all

**Severity: Critical (operational)**

**No documented backup strategy for the database.** Supabase's plan-level automated backups may
exist; there is nothing in this repository that documents them, verifies them, tests a restore, or
defines retention. With one database serving production *and* every developer laptop (H15), the
probability of an accidental destructive write is meaningfully non-zero — `CLAUDE.md` itself
documents that `prisma db push` will attempt to DROP tables it considers orphaned, mitigated only by
a written note to a human rather than by a permissions boundary. **There is no evidence any restore
has ever been tested.**

**No backup of R2 at all.** No versioning, no lifecycle policy, no cross-bucket replication, no
snapshot. **This is what turns C2 from a serious bug into an extinction event for the photo
archive.**

See also H19 (no RTO/RPO, no runbook, no incident-response plan; the schema itself is not
reproducible).

---

# 4. High findings

## H1 — `loadDirectoryPage` has no authentication check: the entire member directory is exposed

**Severity: High · Implementation · CWE-306**
`src/app/(main)/directory/actions.ts:39-61`

It is a `"use server"` module with one export and **zero `auth()` calls** — the only server action in
the repository with no session check whatsoever. It returns, 60 at a time with keyset pagination and
a caller-supplied cursor:

`id, name, avatarColor, photoUrl, birdOverride, accountType, verifyState, batchType, batchYear,
currentCity, jobTitle, workplace`

…for all non-blocked users. `buildDirectoryWhere` takes caller-controlled filters including free-text
search across name, workplace, jobTitle and city. Paginate to exhaustion and you have the complete
membership roll of a private community, with employer and city.

The `(main)` page wrapper does call `auth()`, but **the action is a POST endpoint invokable
independently of the page** (see H2). Because `src/proxy.ts:107-109,174` only checks that a session
cookie is *present*, a request carrying any garbage cookie value passes the middleware, and the
action itself never validates the session.

That dataset is directly usable for targeted phishing and social engineering against a trusting
alumni population.

> *Confidence: High that the check is missing (unambiguous from source). High that any authenticated
> member can call it regardless of account state. Medium-High on unauthenticated end-to-end
> extraction — that depends on whether the forwarded internal request re-traverses the edge proxy on
> Vercel, which could not be verified without a production build. **Even at the lower bound this is a
> High**: it is an authorization control that is simply absent, and every sibling action in the
> codebase has it.*

**Fix:** add `auth()` and reject unauthenticated callers. One line.

---

## H2 — `proxy.ts` is not an authorization boundary for server actions

**Severity: High · Architectural · Confidence: High on the mechanism**

`src/proxy.ts` is the *only* thing standing between an anonymous visitor and every non-public route,
and its check is:

```js
const sessionCookie =
  request.cookies.get("authjs.session-token") ||
  request.cookies.get("__Secure-authjs.session-token");
if (!sessionCookie) { redirect to /login }
```

**It checks that a cookie exists. It never validates it.** `authjs.session-token=x` satisfies it. The
comment acknowledges this and defers real validation to the `(main)` layout — correct for page
renders, but a Server Action executes *before and independently of* the layout render.

Worse, **actions are not confined to their own route.** Reading the dispatcher:
`node_modules/next/dist/server/app-render/action-handler.js:451-461` calls
`selectWorkerForForwarding(actionId, page)` and, when the current route does not own the action,
**forwards the request to a worker that does**. So an action can be invoked by POSTing its ID to a
route listed in `publicPaths` — `/`, `/login`, `/signup`, `/lab` — and the proxy's gate is simply not
in the path. This is the same class of problem as the 2025 Next.js middleware-bypass family.

**Consequence: every action must carry its own check.** Most do. H1 and H3 do not. This finding is
the reason H1's blast radius may extend to fully unauthenticated callers.

---

## H3 — Private-content IDOR: comments, likes, bookmarks and poll votes ignore post visibility

**Severity: High · Implementation · CWE-639**
`src/app/(main)/feed/actions.ts:234, 405, 455, 477, 908, 954-1000`

"A post not everyone may see" is a real category in this app: private groups still exist as the
hidden container under every people-started Catch-up (`createCatchupWithPeople` creates a `private`
group and posts scope to it via `groupId`), and city-scoped posts exist. **The read path enforces
this correctly** — `loadPosts` at line 651 and `loadSavedPosts` at line 832 both carefully apply
membership and city-scope checks. **The interaction paths do not re-derive it:**

**Leg 1 — `loadComments` (:954-1000): no authentication *and* no visibility check.** It tolerates a
null session by design (`const userId = session?.user?.id`, line 956) and filters only on `isHidden`.
Supply a post ID and you get the full comment thread — content, author name, photo, batch — for a
**private-group post** or a **city-scoped post** you have no access to.

**Leg 2 — the write paths:**
- `createComment` (:477) — now correctly requires a confirmed email, but still writes to any `postId`
  with no group-membership or cityScope check, and raises a notification on the post author.
- `votePoll` (:234) — only checks `option.postId === postId`.
- `toggleLike` (:405) / `toggleBookmark` (:455) / `toggleCommentLike` (:908) — only check for an
  existing row.

**Post IDs leak** through notification links (`/feed#<postId>` — deep links the app itself sends),
shared URLs, and the `nextCursor` values `loadPosts` hands out. A non-member holding a `postId` (a
leaked link, a prior membership) can read the full private thread and inject comments, likes and
votes.

**Fix:** a shared `canViewPost(postId, userId)` helper applied to all six actions, and require a
session in `loadComments`.

---

## H4 — `isBlocked` is never enforced: blocking a member does nothing

**Severity: High · Architectural**
`src/lib/auth.ts:18-66` (`authorize`), `:90-105` (session callback), `src/app/(main)/layout.tsx:19-23`

`isBlocked` appears in **6 read queries and 0 write paths and 0 authentication paths.**

- The session callback's `select` does not include `isBlocked`.
- `authorize()` never reads it.
- The `(main)` layout redirects only on a missing session, never on `isBlocked`.
- `adminBlockUser` (`src/components/profile/admin-actions.ts:24`) flips the flag, but the flag is
  only ever consumed as a *read filter* (directory, search, profile 404).

A blocked member signs in normally, keeps a valid 30-day JWT, and continues to post, comment, upload,
message admins and file reports. Blocking only removes them from the directory. With JWT sessions
(M5) there is no server-side session to revoke, so a blocked user keeps their token — and, until C1
is fixed, can mint a fresh 30-day one.

**For a harassment or safeguarding complaint in a community containing former minors, the only
enforcement control the platform has is cosmetic. This is a safeguarding failure, not just a security
one.**

**Fix:** enforce in `authorize()`, in the session callback, in the `(main)` layout, and in
`requireVerifiedEmail()`. Then give it a real revocation primitive (see M4's `credentialVersion`
proposal, which fixes both).

---

## H5 — `reportUser` lets any member strip anyone's verified badge, unlimited

**Severity: High · Business logic**
`src/components/posts/report-action.ts:96-143` (the mutation is at :124-127)

`reportUser` runs `prisma.user.update({ data: { verifyState: "flagged" } })` unconditionally after
the self-flag check:

- no rate limit
- no duplicate check, and `Report` has no `@@unique(reporterId, reportedUserId)`
- no test of whether the target is already verified
- no threshold of distinct reporters

Enumerate user IDs from the directory (H1 / M1), loop, and **every member in the community loses
their verification badge.** Each call also creates a `Report`, an `AdminThread`, a `Notification`,
and a fan-out notification to **every admin** — **bypassing the `isThreadRateLimited` guard** that
the legitimate `startThread` path applies at `src/app/(main)/messages/actions.ts:77`. It is an
unlimited thread-creation and admin-notification-flood primitive, reached through a UI button.

**Compounded by L4:** `reportUser` is one of the write actions the email-verification gate does *not*
cover, so even an unconfirmed account can do all of this.

**Fix:** require N distinct reporters before touching `verifyState`; add
`@@unique(reporterId, reportedUserId)`; rate-limit; route through the same thread rate limiter; and
add `requireVerifiedEmail`.

---

## H6 — No rate limiting, lockout, MFA or bot protection on authentication

**Severity: High** (Audit A rated this Medium as its M4; Audit B rated it High as F-1 — High is
correct given M1 makes the address list enumerable.)

`POST /api/auth/callback/credentials` has no per-IP limit, no per-account limit, no exponential
backoff, no lockout, no CAPTCHA. A grep of the whole tree shows rate limiting **does** exist for
admin threads, email enqueue, tokens, trivia and the demo reset — **and nowhere near login.**

Unlimited credential stuffing against a member base whose email addresses are enumerable (M1). **No
MFA exists anywhere for any role, including admin.** OWASP A07, API4.

---

## H7 — No security headers at all

**Severity: High** (Audit A: M3, Medium. Audit B: F-30, High.)
`next.config.ts`, `vercel.json`, and the whole `src/` tree contain **no `headers()` function and no
header configuration anywhere.**

Missing:

- **`Content-Security-Policy`** — any XSS is unmitigated and there is no script allowlist. This is
  what sits behind the hand-rolled sanitiser (Appendix A §4).
- **`X-Frame-Options` / `frame-ancestors`** — **the site is clickjackable.** An attacker can frame
  `/settings` or the admin surface and bait clicks onto `deleteAccount` or `adminDeleteUser`.
- **`Referrer-Policy`** — profile URLs containing user IDs leak to every outbound link target, and
  reset/verify tokens in URLs leak in the `Referer` header (L2).
- **`Permissions-Policy`**, **`X-Content-Type-Options`**, explicit **HSTS**.

Vercel supplies HSTS by default; nothing else on that list.

---

## H8 — Right to erasure is broken by a foreign key

**Severity: High · Implementation · GDPR Art. 17**
`src/components/settings/actions.ts:245-255`; `prisma/schema.prisma:404`

`deleteAccount` calls `prisma.user.delete` directly. But `Report.reporter` has no `onDelete`, so
Prisma applies `Restrict`. **Any member who has ever reported a post or flagged a person cannot
delete their own account** — the call throws, the server action surfaces a generic error, and the
data stays.

**The codebase knows this.** `src/components/profile/admin-actions.ts:42-48` clears filed reports
first, with a comment explaining exactly this failure mode. The user-facing path never got the same
treatment.

---

## H9 — Deletion never removes stored bytes, and orphaned content survives

**Severity: High · GDPR Art. 17**

Even when `deleteAccount` succeeds, deletion is incomplete:

- **R2 objects (avatar, post images, Collection photographs) are never deleted** — there is no
  `delImage` call anywhere in `deleteAccount`. Their bytes remain publicly retrievable at their
  `pub-*.r2.dev` URLs forever (H20), with no row left pointing at them, so **no one can ever find and
  remove them.** This alone makes GDPR Art. 17 unachievable for images.
- `AdminMessage.author` is `SetNull`, so the *content* of every private message the person wrote
  survives, orphaned.
- `Contribution.user` is `SetNull`, so payment records survive — defensible for tax, but undocumented
  and un-notified to the member.

**Fix:** mirror `adminDeleteUser` (clear filed reports first), enumerate and delete the member's R2
objects, and decide-and-document what is retained and why.

---

## H10 — There is no audit log

**Severity: High · Architectural** (Audit A: M6, Medium. Audit B: F-57, High.)

No record of: sign-ins (success or failure), admin actions, blocks, deletions, verification changes,
role changes, exports, or data access. `adminNote` is a free-text field, not a log.

**Consequences:** a compromise via C1 is undetectable and unattributable; you cannot meet GDPR
Art. 33(3)'s requirement to describe the categories and approximate number of records affected;
there is no non-repudiation for moderation decisions; there is no way to investigate a member's
complaint about an admin action.

Related: **M36 — deletion is silent and unlogged.** No confirmation email, no audit record. Combined
with C1 (an attacker with admin can `adminDeleteUser` anyone), this means **irreversible destruction
of a member's entire history with no trace and no notice.**

---

## H11 — No monitoring, alerting, or error tracking

**Severity: High · Operational**

No Sentry, no Datadog, no OpenTelemetry, no log aggregation, no uptime check, no alert routing. The
only instrumentation is `@vercel/analytics` (page views). Observability is `console.error` into
Vercel's log stream, unstructured, with no retention policy and nobody watching.

**M27 is the proof this is failing today: a cron has been 404ing nightly and nobody knows.**

Related: **M31 — no security-relevant metrics.** No failed-login counter, no upload-volume metric, no
rate-limit-hit counter, so none of the abuse vectors in this report would be visible even during
active exploitation.

---

## H12 — No lawful-basis or transparency layer at all

**Severity: High · Operational · GDPR Arts. 5(1)(a), 6, 12, 13, 30**
(Audit A rated this Low as its L9; Audit B rated it High as H-1. High is correct — it is a bare
violation with no defence available.)

The platform processes, for a population that certainly includes EU/UK residents: names, personal
email addresses, up to five phone numbers, home cities with lat/long coordinates, employer, job
title, school admission number, house history, dates of attendance, free-text biography, uploaded
photographs, private messages, payment records, and IP-adjacent connection data. This is squarely
GDPR-in-scope personal data, **with the school affiliation arguably qualifying as data revealing
religious or philosophical belief in the Krishnamurti context — potentially Art. 9 special
category.**

There is **no privacy policy, no cookie notice, no consent capture, no processing record (Art. 30),
and no data-protection notice anywhere in the route tree** (all 70 page routes were checked;
`/about` is a product page). Signup at `src/components/auth/actions.ts:11` collects and stores
personal data with no notice and no recorded basis. There is also no Art. 20 portability export
(M35).

---

## H13 — Cross-border transfer with no mechanism, and no DPAs

**Severity: High · Operational · GDPR Arts. 28, 44-49**

Data on EU/UK alumni is stored in Supabase `ap-south-1` (Mumbai) and processed by Vercel (US),
Cloudflare R2, Resend (US) and Razorpay (India). No DPA, no SCCs, no transfer impact assessment, no
sub-processor list, and no record of any of it was found.

---

## H14 — No breach-detection capability

**Severity: High · Operational**

There is no audit log, no access log, no anomaly detection, no alerting. If C1 is exploited, nothing
anywhere records it. The 72-hour Art. 33 notification clock **cannot be met because you would never
learn the clock had started**, and Art. 33(3) requires you to describe the categories and approximate
number of records affected — which you could not do.

---

## H15 — Production and local development share one live database; there is no staging

**Severity: High · Architectural + Operational**

`AGENTS.md` and `CLAUDE.md` both confirm one Supabase instance behind production and local dev.
Consequences:

- Every developer laptop holds a credential to the **production** database in a plaintext `.env`.
- Every local test writes production rows.
- Any accidental destructive command hits live member data. `CLAUDE.md` documents the near-miss —
  `prisma db push` will "try to DROP tables it considers orphaned" — and mitigates it with a
  **written instruction to a human** rather than a permissions boundary.
- `.env` also carries the live `RESEND_API_KEY`; the code comment at `src/lib/email.ts:126` admits
  this caused real emails to be sent from a developer machine.
- Per `AGENTS.md`, the R2 bucket is shared too.

**There is no way to test a migration, a payment flow or an email change safely.** Separating
production from development is the single highest-value ongoing-risk reduction on the entire
short-term list.

---

## H16 — No CI/CD, no branch protection, no security gate

**Severity: High · Operational**

No `.github/workflows`, no CI configuration of any kind. `vercel.json` is a runtime config, not a
pipeline. Consequences: `npm run check` is a *local* command a human must remember to run; nothing is
enforced at merge; there is no dependency scanning, no SAST, no secret scanning, no license scanning,
no build-reproducibility check. Deployment is `git push` to `main` → Vercel autodeploy, with **no
branch protection, no required review, no gate.**

**And the gate that does exist measures the wrong thing.** `npm run check` runs TypeScript, ESLint, a
shape-and-colour design audit, a lab-registry audit and 14 unit tests. **No security check runs in
it.** That is exactly how C1 and C2 shipped: each is invisible to a type checker and to a design
audit, and each has a comment beside it explaining a *different* concern the author was thinking
about at the time. `CLAUDE.md` prescribes a `write-path-reviewer` agent, but nothing enforces that it
ran.

---

## H17 — 14 unit tests for ~97,500 lines, and none of them test security

**Severity: High**

The tests cover avatars, catchup state maths, house spans, map clustering, string normalisation, tour
offers, and the demo write policy (`src/lib/demo.test.mjs` — the one security-adjacent test, and a
good one).

There is **zero coverage** of: authentication, authorization, any server action, any API route,
`renderRichText` (the XSS sink), the token layer, the payment layer, or the storage shim. No
integration tests. No E2E tests. No security regression tests.

**Every finding in this report would have been caught by a test suite that asserted "an
unauthenticated call to X returns an error."**

---

## H18 — Unbounded queries that will fail hard

**Severity: High at scale**

- `src/app/(main)/admin/page.tsx:63-74` — `prisma.user.findMany` with **no `take`**: loads every
  user, with email and admin notes, into a server render. At 10,000 users this is slow; at 1,000,000
  it OOMs the function.
- `src/app/(main)/admin/page.tsx:99-113` — a second unbounded `findMany` over all users.
- `src/app/api/users-by-batch/route.ts:24-33` — no `take`.
  `?batches=1926,1927,…,2033&detail=1` returns every non-blocked user's
  `id, name, photoUrl, birdOverride, batchYear` in one response. **Any signed-in account dumps the
  whole user table in a single request** — both an enumeration channel (M1) and a memory/DoS vector.
- `src/lib/admin-threads-server.ts:53-61` — admin fan-out with a "small table, so a fan-out is fine"
  comment: true today, an N-row write per member message later.

---

## H19 — No RTO/RPO, no runbook, no incident-response plan; the schema is not reproducible

**Severity: High**

No documented recovery procedure, no rollback plan, no breach-response playbook (which GDPR Art. 33's
72-hour clock effectively requires you to have prepared), no on-call.

**The schema itself is not reproducible.** `prisma/migrations-manual/` holds hand-run dated SQL
applied via a script. There is no `_prisma_migrations` ledger, so **there is no authoritative record
of the production schema's state** and no way to rebuild it. A rebuild-from-scratch would be
archaeology. That is a due-diligence red flag on its own, and it compounds C4: even with a data
backup, the structure to restore into is undocumented.

---

## H20 — Object storage is public-read, permanent and unsigned

**Severity: High** (Audit A: L11, Low. Audit B: F-22, Medium-High.)

`putImage` writes with `CacheControl: public, max-age=31536000, immutable`, and objects serve from a
public `pub-*.r2.dev` URL with **no signing and no expiry**. Anyone with a URL — including someone
whose account was deleted, or a search-engine crawler — retains permanent access to every avatar and
photograph. There is no `robots.txt` in the app.

Combined with H9 (deletion never removes bytes), this means **the platform cannot honour an erasure
request for images.** Combined with M11 it means unreviewed contributions are world-fetchable, and
with M12 that full-resolution originals carry their EXIF GPS coordinates.

**Fix direction:** private bucket with signed URLs, or a custom domain with hotlink protection, plus
a `robots.txt`.

---

## H21 — `verifyState` gates nothing: profile verification is decorative

**Severity: High · Architectural · Added 2026-08-12 (owner review of the consolidated audit)**

The platform has **two independent trust signals**, and only one of them does any work:

| Signal | How it is granted | What it currently controls |
|---|---|---|
| `emailVerified` → `session.user.emailConfirmed` | **Automatic, self-serve.** Click the link in the confirmation email. | Writes (posts, comments, uploads, collection, four Catch-up actions) and contact visibility, via `requireVerifiedEmail()` / `viewerMaySeeContacts()`. |
| `verifyState` (`unverified` / `pending` / `verified` / `flagged`) | **Manual, admin-only** — `adminVerifyUser` (`admin-actions.ts:73-96`) is the only writer, besides `reportUser` writing `"flagged"`. | **Nothing.** It renders a leaf badge (`src/components/common/verified-mark.tsx:28` returns `null` unless `"verified"`) and populates the admin queue. **No authorization path anywhere reads it.** |

So the platform's stronger signal — a human confirming this person is actually a Rishi Valley alumnus — is **cosmetic**, exactly as `isBlocked` is cosmetic (H4). The weaker signal — control of a mailbox, which any bot with a disposable address obtains in seconds — is the only thing standing between a stranger and the community's content and contact details.

Two further gaps in the same state machine:

- **Nothing ever writes `"pending"`.** The value is declared in the schema comment (`prisma/schema.prisma:45`) and read by the admin UI, but no code path sets it. There is no "request verification" flow: a member cannot ask, and the owner has no signal that someone is waiting.
- **`adminUnverifyUser` exists but `verifyMethod` has no roster path.** The column's declared values are `"office_list" | "admin_manual"` (`admin-actions.ts:74`), which implies an intended match against the school's official alumni list. No such matching code exists.

**Consequence today:** an account created with a disposable mailbox, past a two-question trivia gate whose answers are on Wikipedia (M7), reaches the full member directory, every profile, every phone number and every email address in the community — and can post, comment and upload. The verified leaf next to a name tells another member "this person is confirmed real" while guaranteeing nothing about what that person can do.

**Owner policy decision, 2026-08-12.** This is being changed to a **two-gate trust model**: an account must be **both email-confirmed and profile-verified** before it can write anything to the community or see any member's contact details. The full specification — the capability table for each tier, how verification is granted, how existing members are migrated, and the locked-contact UI — is in `docs/planning/OWNER-INPUT-REQUIRED.md` §1, and is a prerequisite for the fixes to H1, H3, H5, M1 and H22.

**Remediation.** Introduce a single `requireVerifiedMember()` gate alongside `requireVerifiedEmail()`, reading both signals from the session (add `verifyState` to the session callback's `select`, which already re-reads `role` per request at `auth.ts:90-105`). Apply it to every write action and to `viewerMaySeeContacts()`. Add a member-initiated "request verification" path that writes `"pending"`, and a roster-match path for `verifyMethod: "office_list"`.

---

## H22 — No bot or automation defence on any public entry point

**Severity: High · Architectural · Added 2026-08-12**

There is **no CAPTCHA, no proof-of-work, no device attestation, no bot-management layer and no anomaly detection** anywhere in the application. A grep of the tree confirms no Turnstile, reCAPTCHA or hCaptcha integration exists.

The complete list of what an automated client faces today:

| Entry point | Defence |
|---|---|
| `/signup` | Two fixed trivia questions with answers in any article about the school, fuzzy-matched with one-edit tolerance — and a rate limiter that an attacker bypasses by omitting a cookie while denying signup to everyone else (M7) |
| `/login` | **Nothing** (H6) |
| `requestPasswordReset` | Per-user-id limit only, never per IP (M3) |
| `loadDirectoryPage` | **Nothing — not even authentication** (H1) |
| `/api/users-by-batch` | Session presence only, unbounded result (H18) |
| Every content action | **Nothing** (M2) |

**Consequence.** Bulk account creation, credential stuffing, directory scraping, and content or report flooding are all unmetered. For a private alumni community whose entire value proposition is that it is not public, scraping is the primary threat, and H1 means it does not even require an account.

**Remediation.** Cloudflare Turnstile (free, and this project already uses Cloudflare for R2) on signup, login and password reset; a shared rate-limit layer backed by a durable store on every write action and every enumeration-capable read; plus the H21 trust gate, which is what actually removes the value of a bulk-created account.

---

# 5. Medium findings

## M1 — Member enumeration and bulk harvesting
**Med-High.** The forgot-password flow is *carefully* non-enumerable
(`src/components/auth/email-actions.ts:138-206`) — this is good work, and its comment says explicitly
that the goal is to prevent the form becoming an "is this person a Rishi Valley alumnus" oracle.
**Signup then gives the answer away for free:** `src/components/auth/actions.ts:67-69` returns *"An
account with this email already exists"*. The exact fact the reset flow protects is readable from the
signup form. `src/app/api/users/search/route.ts` and `src/app/api/users-by-batch/route.ts` (H18) are
the bulk channels. See also L3 (the reset flow's own timing side-channel).

## M2 — No rate limiting on any content-creating action or API route
**Med-High · Architectural.** Nothing throttles post creation, comment creation, uploads, poll
voting, likes, directory queries, place searches, or Catch-up creation. `/api/upload` in particular
is an unmetered path from any confirmed account to unbounded R2 storage cost (20MB × 3 files per
request, no per-account quota — M17).

## M3 — Public reset requests can exhaust the entire daily mail budget
**Med-High · Business logic + availability.** `requestPasswordReset` is public and rate-limited only
*per user id* (4 per 30 min, `src/lib/email-queue.ts:137`) — **never per IP**. The shared budget is
95 messages/day with a 20-message reserve (`src/lib/email-queue.ts:69,80`). With ~24 known addresses
an attacker exhausts the whole day's quota in minutes. Consequence: **no member can sign up, confirm
an address, or recover a password for the rest of the day** — and the "password changed" security
notice, the only warning a victim gets that their account was taken, also stops going out.

## M4 — A password reset or change does not revoke existing sessions
**Medium · Architectural.** `src/lib/auth.ts:69-71` (JWT strategy) +
`src/components/auth/email-actions.ts:234-289` (`resetPassword`). The reset writes the new bcrypt
hash and burns outstanding *reset tokens* (:270), and a `password-changed` warning email is queued
(:281). But sessions are JWTs with no server-side store, no revocation list, and no credential epoch
in the token. **An attacker who already holds a valid session cookie keeps it working for its full
30-day life after the victim resets the password.** The warning email tells the victim something
happened but gives them no way to terminate the other session.

**Fix (this one mechanism closes three findings):** add `sessionsValidFrom` / `credentialVersion` to
`User`; stamp it on every password change or reset, on block (H4), and on delete (M6); carry it in
the JWT; reject any token minted before it in the session callback. This also gives C1's remediation
a real revocation primitive to lean on.

## M5 — JWT sessions: no revocation, no inventory, and the documentation is wrong
**Medium · Architectural.** `src/lib/auth.ts:69-71` sets `strategy: "jwt"` while also configuring
`PrismaAdapter` and maintaining an **unused `Session` table**. `AGENTS.md` states *"Session strategy:
database-backed (Prisma adapter)"* — **the documentation is wrong about the security architecture.**
Consequences: signing out cannot invalidate a stolen token; a compromised token is valid for 30 days
with no kill switch; there is no session inventory, so "which devices are signed in" cannot be
answered for a subject access request; and there is no way to force-logout after a breach.

## M6 — A deleted user retains a fully working session for 30 days
**Medium · Implementation.** `src/lib/auth.ts:106`: `if (dbUser) { … }`. When the row is gone the
branch is skipped **but the session is still returned** with `session.user.id` set from the JWT.
Every `if (!session?.user?.id)` guard passes. The deleted account can browse the directory, read the
feed, open profiles, and see other members' contact details. Writes fail with foreign-key errors that
surface as generic 500s. **The correct behaviour is `return null`.** (15-minute fix.)

## M7 — The signup gate is weak, and its rate limiter is a denial-of-service primitive
**Medium · Implementation.** `src/components/auth/trivia-actions.ts`.

Two fixed questions with answers findable in any article about the school, matched with a one-edit
fuzzy tolerance. Beyond that, the limiter:

```js
const rlKey = jar.get("rv_trivia_rl")?.value ?? `anon:${id}`;   // line 162
if (rateLimited(rlKey)) return { error: "Too many attempts…" }; // line 163 — returns BEFORE
if (!jar.get("rv_trivia_rl")) jar.set(...)                       // line 166 — the cookie is set
```

A caller who never sends the cookie always keys the **global** bucket `anon:banyan`. Eight requests
in ten minutes exhausts it, and thereafter **every genuine first-time visitor is refused on their
first attempt**, because the check runs before the cookie is issued. One trivial loop denies signup
to the whole site (per serverless instance). The attacker meanwhile bypasses the limit entirely by
rotating or omitting the cookie.

Two further weaknesses in the same file: `secret()` at line 89 falls back to the hardcoded literal
`"rv-connect-trivia-dev-secret"`; and the pass token at line 191 is `HMAC(timestamp)` alone — bound
to no session and no browser, so **one solved gate is a shareable 30-minute pass anyone can replay**
— compared non-constant-time at line 208.

## M8 — Password policy is length-only
**Medium.** Minimum 8 characters (`src/lib/validators.ts:19`), no breach-corpus check (HIBP
k-anonymity), no complexity requirement, no zxcvbn. `"password"` and `"12345678"` are accepted.
Combined with H6 (no login rate limit) this is a live account-takeover path.

## M9 — No re-authentication for sensitive operations
**Medium.** `deleteAccount`, email and contact changes, and admin actions require no password
re-entry. A borrowed unlocked laptop is a full account takeover.

## M10 — Feed and Catch-up entries accept arbitrary external image URLs
**Medium.** `src/lib/validators.ts:115` types `postSchema.images` as `z.string().optional()` with no
origin validation (this is also the root of C2). `src/app/(main)/catchups/actions.ts:143` uses
`images: z.array(z.url()).max(3)` — any URL. An attacker-hosted URL rendered to every member of a
Catch-up is an IP-address and user-agent harvesting pixel. **The correct pattern already exists in
this codebase** — the messages feature validates screenshot URLs with `isUploadedImageUrl`
(`src/app/(main)/messages/actions.ts:50`, `src/lib/admin-threads-server.ts:29-33`), confirmed working
by audit A. Copy it here.

## M11 — Pending and hidden Collection photos stay publicly fetchable
**Medium.** `contributePhoto` (`src/app/(main)/collection/actions.ts:73`) and
`contributePhotoDirect` (:192) both create the `Photo` row with `approved:false` **after** the bytes
are already at a public R2 URL, so an unreviewed contribution is world-fetchable during review. And
`adminRemovePhoto` (:459) only flips `isHidden` and **keeps the file**, so "removed" content stays
retrievable forever by anyone who noted the URL. Both halves confirmed present.
**Fix:** upload pending contributions under a private prefix; delete or relocate on removal.

## M12 — Presigned Collection originals bypass server-side re-encoding, publishing EXIF and GPS
**Medium (privacy).** `contributePhotoDirect` stores the browser-uploaded original **as-is** as the
photo's canonical `url` (`src/app/(main)/collection/actions.ts:271`); only the thumbnail is
re-encoded. So the full-resolution file served to every member is attacker-supplied bytes with its
**original EXIF, including GPS coordinates**, intact and publicly retrievable. This is deliberate
("high-res in the Collection is the point") and the privacy consequence appears not to have been
considered. It undoes the EXIF-stripping benefit the proxied path otherwise provides.

## M13 — Content-type is trusted from the client on three paths
**Medium · CWE-434.** `src/app/api/upload/route.ts:59`,
`src/app/(main)/collection/actions.ts:86`, `src/components/settings/actions.ts:189` all check
`file.type.startsWith("image/")` — a client-supplied MIME string. **No magic-byte verification.**
`sharp` will reject a non-image, so this is mitigated in practice, which is why it is Medium and not
High. But it means **the first thing to touch attacker-controlled bytes is libvips** — which has four
open High CVEs in the pinned version (C3).

## M14 — No `sharp` `limitInputPixels`; decompression-bomb exposure
**Medium.** None of the five `sharp()` call sites sets `limitInputPixels` or a concurrency cap. A
small file that decodes to an enormous pixel buffer can exhaust the serverless function's memory.
Pairs with M2 (no upload throttle) and M17 (no quota).

## M15 — No malware scanning
**Medium.** Photographs are stored and served to the whole community with no AV or CDR pass.

## M16 — Presigned PUT cannot enforce object size
**Medium.** `src/lib/storage.ts:112-130` signs `Bucket`/`Key`/`ContentType`/`CacheControl` with a
600s expiry but **no `ContentLength` condition**. The size check happens after the fact in `finalize`
and `contributePhotoDirect`, which delete the object if oversized — so an attacker can still push
arbitrarily large objects into the bucket and you pay for the ingest and the storage during the
window. **Fix:** a presigned POST policy with `content-length-range`.

## M17 — No per-account storage quota
**Medium.** Direct, unmetered cost amplification from any confirmed account.

## M18 — `updateContactMethods` bypasses `profileSchema` entirely
**Medium · Implementation.** `src/components/profile/profile-actions.ts:116-153` writes
`displayEmail`, `instagram`, `linkedin`, `facebook` and `links[].url` with **no Zod validation, no
length cap, and no `https://` check** — while `src/lib/validators.ts:74-94` defines exactly those
rules and `updateUserProfile` applies them. **Two write paths to the same columns with different
rules; the newer one has none.** It is currently saved from being stored XSS only by the read-side
re-validation in `parseUserLinks` (`src/lib/social.ts:73`, which re-checks `^https://`). Unbounded
strings into unbounded `text` columns (M22) are also a storage-abuse vector.

## M19 — 38 `/lab` dev routes are publicly reachable in production
**Medium · Operational.** `src/proxy.ts:163` lists `/lab` in `publicPaths`, and `CLAUDE.md` says
*"Remove before shipping to the public."* It has not been. **`/lab/everything` serves an internal
audit log** (`src/app/lab/everything/_findings.ts`) whose `evidence` fields contain **exact file
paths and quoted source code** — a free architecture map for an attacker. `setArchived` is
admin-gated in production (correctly), but the surface itself is 38 unreviewed pages with no security
review applied to them.

## M20 — No row-level security; one database role with full DML
**Medium.** Supabase supports RLS; the schema declares none. A leaked `DATABASE_URL` — and one is
present in every developer `.env` (H15) — is complete data access.

## M21 — No field-level encryption
**Medium.** Phone numbers, admission numbers and admin notes sit in plaintext columns, with no
encryption at rest beyond the provider default.

## M22 — Schema-quality debt that will bite at scale
**Medium · Architectural.** `prisma/schema.prisma`:

- **No `@db.VarChar` anywhere.** Every string is unbounded Postgres `text`. Length limits live only
  in Zod — and where Zod is skipped (M18) they do not exist at all.
- **Everything is a magic string.** `role`, `verifyState`, `status`, `kind`, `accountType`,
  `datePrecision`, `visibility`, `targetType` are all `String` with the valid values in a trailing
  comment. No Postgres enums, no CHECK constraints. **A typo writes a value nothing will ever match,
  silently.**
- **Structured data stored as JSON-in-string:** `houses`, `phones`, `links`, `images`,
  `targetBatches`. Unqueryable, unvalidatable at the DB, hand-parsed in ~6 places with divergent
  rules.
- **Dead columns retained:** `openTo`, `Post.tag` — documented as having no reader or writer.
- **Legacy `Catchup` / `CatchupPref` tables with incompatible columns still live in production**,
  worked around with `@@map` (schema comment lines 567-586). Load-bearing technical debt in the data
  layer.
- **Missing indexes for actual query patterns:** `Post.authorId` (profile tab), `Report.status`
  (admin queue), `Photo.uploaderId`, `Contribution.livemode`.
- **No migration history** — see H19.

## M23 — Secrets management is a plaintext `.env` plus a dashboard
**Med-High.** No vault, no rotation policy, no rotation history, no per-environment scoping, no
access log for who read what. Twelve secrets in one file on developer machines: `DATABASE_URL`,
`DIRECT_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, three R2 keys, three Razorpay keys,
`VERCEL_OIDC_TOKEN`.
**Positive, and worth stating:** `.gitignore` correctly excludes `.env*`, and this was verified
against `git ls-files` **and the full history** — no environment file has ever been committed. That
is the most common way this goes wrong, and it did not go wrong here.

## M24 — `NEXTAUTH_SECRET` is the only signing key and has no rotation path
**Medium.** It signs every session JWT. Rotating it invalidates every session at once, with no
rolling-key support. (`AUTH_SECRET ?? NEXTAUTH_SECRET` was verified as a valid fallback at
`next-auth/lib/env.js:22` — which *rules out* a finding another reviewer might report here.)

## M25 — Single region; single points of failure throughout
**Medium.** `bom1` only, one Supabase instance, no read replica, no multi-region failover, no
documented RTO/RPO. The full SPOF list: one database, one region, one R2 bucket, one Resend account,
one signing key, **one admin.**

## M26 — Free-tier services on the critical path
**Medium.** Resend's 100/day cap is load-bearing enough that **an entire priority-queue subsystem
exists to work around it** (and M3 is the abuse of that). Supabase free tier for the demo.

## M27 — The `vercel.json` cron points at a route that does not exist
**Medium · Operational.** `vercel.json` schedules `/api/catchups/tick` daily at 02:00. **There is no
such route** — the API tree contains 10 routes and that is not one of them. **Every night this cron
404s.** Catch-up state advance is therefore entirely dependent on the lazy tick in the authenticated
layout (`src/app/(main)/layout.tsx:42`), which means a Catch-up round only advances **if a member
happens to load a page**. On a quiet week, deadlines silently do not fire. Nobody noticed, which
tells you there is no cron-failure alerting (H11).

## M28 — No scheduler: the mail queue and Catch-up advance run on page view
**Medium.** `drainMailQueue` and `advanceDueCatchups` are both triggered from the authenticated
layout on **every page view** (`src/app/(main)/layout.tsx:31-60`). That is:
(a) a **correctness** problem — no traffic means no mail and no state advance, and the one real cron
is broken (M27);
(b) a **scaling** problem — `dailyBudget()` runs a `COUNT` per drain iteration, up to 9 counts per
pass, on every page load across the fleet;
(c) a **contention** problem — every concurrent request races for the same claim rows.

## M29 — Forced enrolment: one member can add 500 arbitrary users to a group
**Medium · Business logic.** `src/app/(main)/catchups/actions.ts:376-451`: any verified member can
create a Catch-up naming **up to 500 arbitrary user IDs**, which silently creates `GroupMember` rows
for all of them and notifies every one. No invitation, no consent, no acceptance, no rate limit. A
single account can add every member of the community to a group they never joined and notify them.
Notification spam plus non-consensual association.

## M30 — `photoTrusted` auto-approval has no revocation path
**Medium.** `photoTrusted` bypasses the moderation queue
(`src/app/(main)/collection/actions.ts:151`). **No action anywhere sets it to `false`.** A trusted
contributor who turns malicious cannot be untrusted without direct SQL.

## M31 — No security-relevant metrics
**Medium.** See H11.

## M32 — Poll options are created outside a transaction
**Medium.** `src/app/(main)/feed/actions.ts:133-143` (cited as `:134-143` in audit B): up to 4
separate round trips in a loop, outside a transaction. A failure mid-loop leaves a partial poll.

## M33 — API routes carry no CSRF token and rely solely on `SameSite=Lax`
**Medium (Not Detected, weak by construction).** Next.js applies an Origin check to Server Actions,
and session cookies are `SameSite=Lax`, which blocks cross-site POST — the comment at
`src/app/(main)/support/actions.ts:5-11` shows the author understood this, and audit A separately
confirmed there is no `Access-Control-Allow-Origin` anywhere. **However:** the API routes
(`/api/upload`, `/api/upload/presign`, `/api/upload/finalize`) carry **no CSRF token of their own**
and rely entirely on `SameSite=Lax`. That is a single point of failure — one cookie-policy change,
one browser quirk, one future `SameSite=None` requirement for an embed, and three authenticated write
endpoints become cross-site callable.

## M34 — No retention policy; unbounded accumulation
**Medium (Med-High as a compliance item) · GDPR Art. 5(1)(e).** `Notification`, `Report`,
`AdminMessage`, `Contribution`, `Post`, `Photo` all grow forever with no expiry. Only `AuthToken` has
a sweep (`src/lib/auth-tokens.ts:107-111`), and it is opportunistic and unawaited. `OutboundEmail`
rows persist indefinitely with recipient addresses.

## M35 — No deletion confirmation, re-auth, grace period or data export
**Medium.** `deleteAccount` fires on one call. No Art. 20 portability export exists anywhere.

## M36 — Deletion is silent and unlogged
**High in combination.** See H10.

---

# 6. Low findings

## L1 — The login email is the default public profile contact (mitigated)
`src/app/(main)/profile/[id]/page.tsx:120`. `contactEmail = user.displayEmail?.trim() || user.email`
still falls back to the sign-in address. **Mitigated since the earlier audit:** contact details are
now gated by `maySeeContacts = isOwnProfile || await viewerMaySeeContacts()` (:137), and the whole
`methods`/`vcard` block is withheld from the serialized payload when false — so the login email now
leaks only to **email-confirmed** members, not to any account at all. The underlying "auth identifier
reused as a public contact by default" pattern remains. **Fix is still one line: only ever expose
`displayEmail`.**

## L2 — Reset and verify tokens ride in the URL with no `Referrer-Policy`
`src/lib/email-queue.ts:232,238` (`/reset-password?token=…`, `/verify-email?token=…`) + H7. Standard
and mostly unavoidable for emailed links, but it puts the token into browser history, into any
proxy/access logs, and — because there is no `Referrer-Policy` — into the `Referer` header of any
cross-origin request those pages might trigger. Limited by the tokens being single-use and
short-lived (reset 1h, verify 24h) and the pages being simple.
**Fix:** ship `Referrer-Policy: strict-origin-when-cross-origin` as part of H7, keep those pages free
of third-party resources, and consider consuming the token into an httpOnly cookie with a clean-URL
redirect on first load.

## L3 — `requestPasswordReset` has a timing side-channel that partially defeats its own design
`src/components/auth/email-actions.ts:149-206`. The function is carefully written to return an
identical `{ ok: true }` whether or not the account exists, specifically so the form cannot be used
as an alumni-membership oracle (the comment at :138-148 says so explicitly). **But the two branches
do different amounts of work before returning:** a non-existent address returns right after one
`findUnique` (:162), while an existing address additionally `await`s `enqueueMail` (:169) — which
itself runs a fold-check `findFirst`, a rate-limit `count`, and a `create`. The existing-account path
is measurably slower. Noisy over the internet, but real, and it recovers exactly the fact the
function is shaped to hide.
**Fix:** move the enqueue and drain entirely into `after()` (as the drain nudge already is) so both
branches return after the same single lookup. Do not `await` account-dependent work before
responding.

## L4 — The email-verification gate skips the report, admin-message and `createCatchup` actions
**Low→Medium; compounds H5.** `requireVerifiedEmail` is called in `feed/actions.ts`,
`collection/actions.ts`, both `upload` routes, `finalize`, and `catchups/actions.ts` — **but not** in
`src/components/posts/report-action.ts` (`reportPost` / `reportUser`),
`src/app/(main)/messages/actions.ts` (`startThread` / `replyToThread`), or
`src/app/(main)/catchups/actions.ts:281` (`createCatchup`, the group-based creator — while its
sibling `createCatchupWithPeople:376` *is* gated).

`reportUser` reaches admins (Notification + AdminThread) and mutates another user's `verifyState`;
`startThread` pages a real human. Both run for any signed-in session regardless of `emailConfirmed`.
So an **unconfirmed** account — precisely the account the gate exists to constrain — can strip
verified badges (H5), spam the moderation queue, and open admin threads. Reaching a real person is
the gate's own stated trigger (`src/lib/email-verification.ts:11-17`).

## L5 — PII in application logs; unstructured, unscrubbed, no retention
`src/lib/email.ts:120` logs recipient addresses; `:132-134,150-152` log the full message body
**including live reset links** in non-production. Vercel log retention is not configured and there is
no scrubbing.

## L6 — Upload finalize validates key *shape*, not ownership
`src/app/(main)/collection/actions.ts:192-290` checks the `COLLECTION_ORIGINAL_KEY` regex only; the
same in `/api/upload/finalize` with `STAGING_KEY`. Practically mitigated by cuid2 unguessability, but
the control is shape, not authorization.

## L7 — Poll voting has no window and no visibility check
**Low-Medium.** `votePoll` (`src/app/(main)/feed/actions.ts:234`) accepts a vote on any post forever,
from any member, including one who cannot see the post (H3). Vote switching is unlimited.

## L8 — `livemode` filtering on public contribution totals is unverified
`startContribution` forces INR and clamps ₹100–₹500,000 correctly, and `livemode` is derived from the
key prefix correctly. The schema comment warns that public totals must filter on it; the reporting
query was not in scope to confirm. **Flagged for verification.**

## L9 — Signup race condition surfaces an unhandled P2002
`src/components/auth/actions.ts:63-98` does a check-then-insert. Concurrent signups on the same
address hit the unique constraint and throw an **unhandled P2002**, surfacing as a raw server-action
exception rather than the friendly message.

## L10 — `extendDeadline` deletes notifications unscoped by user
`src/app/(main)/catchups/actions.ts:964-967` — scoped by `type` and `link` but not `userId`. Correct
in intent, over-broad in construction.

## L11 — The R2 token is object-scoped and cannot manage CORS
**Low-Medium.** `src/lib/storage.ts:104-110` documents that CORS was applied by hand from the
dashboard and that any new origin must be added manually or uploads silently degrade to the slower
proxied path. Manual, undocumented, un-versioned infrastructure state.

## L12 — Client-side-only enforcement patterns and cap disagreements
Post length is capped at 20,000 in Zod, but the composer's UI cap and the server cap in `editPost`
(5,000 / 20,000, `src/app/(main)/feed/actions.ts:361`) disagree with `postSchema`'s single 20,000.
Tour and onboarding state live only in `localStorage` (`src/lib/tour-local.ts`,
`src/lib/onboarding-local.ts`) — cosmetic, but it makes onboarding completion a client-controlled
fact.

---

# 7. Reliability, scalability & maintainability

Non-security findings that bear on production readiness. (Security-relevant scale items are H18 and
M28.)

**R1 · Offset pagination on sorted feeds.** `src/app/(main)/feed/actions.ts:754-770` falls back to
`skip: offset` for the like and comment sorts. `ORDER BY count DESC OFFSET n` degrades
quadratically. Keyset is used correctly for the recent sort — the author knew; the count sorts were
the acknowledged compromise.

**R2 · Per-request N+1 patterns.** `getViewerCities` runs on every feed load; `loadFreshEdition`
performs read → advance → re-read on every Catch-up action; `advanceEdition` fires on every page view.

**R3 · Transaction pooler and `$transaction` interaction.** Runtime uses PgBouncer transaction mode
(`?pgbouncer=true`). Interactive transactions (`profile-actions.ts`,
`src/components/onboarding/actions.ts:62`, `src/app/(main)/catchups/actions.ts:411`) hold a pooled
connection for their duration and are a known source of pool exhaustion under load. No
connection-pool sizing is configured.

**R4 · Retry logic is absent except in the mail queue.** Razorpay order creation has a 15s timeout
and no retry; R2 writes have none; Prisma has none. The mail queue's retry design (4 attempts,
stale-claim reclaim, terminal failure) is the one well-built piece here.

**R5 · Oversized modules.** `bird-avatar-v2.tsx` 1,840 lines; `hoopoe.tsx` 1,513;
`letterhead-profile.tsx` 1,497; `catchups/actions.ts` 1,425; `create-post-form.tsx` 1,301;
`feed/actions.ts` 1,000. **A 1,425-line action file is where an authorization check goes missing
unnoticed.**

**R6 · Duplicated security logic that has already drifted.** The `IS_POSTGRES` / `insensitive` idiom
is copy-pasted verbatim in four files (`feed/actions.ts:38`, `directory/where.ts:6`,
`collection/actions.ts:294`, `city-scope.ts:4`) while `src/lib/db-text.ts` exists for exactly this.
`DEMO_CLOSED_PATHS` is duplicated between `proxy.ts:30` and `demo.ts:255` — *with a test holding them
in sync, which is the right mitigation.* But the profile-write logic drifted for real:
`updateUserProfile` validates through `profileSchema`, `updateContactMethods` validates through
nothing (M18). That is the copy-paste-security failure mode, live in the codebase.

**R7 · Documentation contradicts the implementation.** `AGENTS.md` states sessions are
database-backed; they are JWT (M5). It presents the admin bypass as a working feature (C1).
`CLAUDE.md` says `/lab` should be removed before public launch; it is public (M19). `vercel.json`
references a route that does not exist (M27).

**R8 · Dead code and dead columns.** `openTo`, `Post.tag`, legacy `Catchup` / `CatchupPref` tables,
retired `REMINDER_TWO_DAYS` / `REMINDER_LAST_DAY` bits, `setTheme` / `setThemePreference` as two
names for one function (acknowledged in a comment), a `Group` model retained as a hidden container
for a retired feature.

**R9 · The Prisma client-key hack.** `src/lib/prisma.ts:59`: a manually-bumped `clientKey` string
that must be edited in the same commit as any schema change or dev breaks silently. Documented,
honest, and a symptom of the missing migration discipline (H19).

**R10 · Genuinely strong, and worth protecting.** TypeScript `strict: true`. ESLint configured. A
real, fast quality gate (`npm run check`, ~17s). Clean separation of storage behind a shim,
validation into `validators.ts`, auth into `auth.ts`. Consistent `{ error }` / `{ success }` action
shape. **And the comments are the best thing in this repository** — nearly every non-obvious constant
is argued for, and several record *disproved* hypotheses and past incidents. That is unusually good
engineering hygiene, and it is the reason both audits could be precise.

**R11 · The mail queue is a well-built subsystem.** Stale-claim reclaim, CAS row-claiming, retry
caps, idempotent send, a priority ordering with a reserved slice for password resets, and the
"queue stores ingredients, mints the token at send time" decision. Its weaknesses are the missing
scheduler (M28) and the missing per-IP limit on its public entry point (M3), not its design.

---

# 8. Session & token security assessment

| Property | State | Assessment |
|---|---|---|
| Strategy | JWT; `PrismaAdapter` configured but `Session` table unused | **No revocation** (M5); documentation contradicts reality |
| Lifetime | 30 days, fixed | Too long for an admin-capable session; no idle timeout, no absolute cap |
| Cookie flags | `httpOnly` ✓, `secure` ✓ (https), `sameSite: lax` ✓, `path: /` | **Correct** |
| Signing | HS256 via `AUTH_SECRET ?? NEXTAUTH_SECRET` (fallback verified at `next-auth/lib/env.js:22`) | Single key, no rotation (M24) |
| Rotation on privilege change | None | An admin session survives demotion until expiry — *partially* mitigated because `role` is re-read from the database per request (`src/lib/auth.ts:90`) |
| Rotation on password change | None | `burnTokens` kills reset links but **not sessions** — a compromised account's attacker session survives the victim's reset (M4) |
| Binding | None | Not bound to IP, UA or device; a stolen cookie is portable for 30 days |
| Concurrent session visibility | None | No session inventory; cannot answer a subject access request |
| Deleted-user handling | **Fails open** | M6 |
| Blocked-user handling | **Not checked at all** | H4 |
| Trivia pass token | `HMAC(timestamp)`, unbound to session or browser, non-constant-time compare at `trivia-actions.ts:208` | M7 |
| Catch-up invite token | 128-bit `randomUUID`, unique-indexed, regex-validated on both entry points | **Correct** |
| Email token | 256-bit CSPRNG, SHA-256 at rest, single-use via conditional update, kind-checked, address-pinned | **Exemplary** |

---

# 9. Verified clean and correct by design

Both audits checked these and found no finding. Recorded so the next reviewer does not re-derive
them, and so the good patterns are visible for copying.

### Injection and rendering
- **SQL injection — Not Detected, high confidence.** All application queries use the Prisma query
  builder. The two raw queries — `src/app/api/places/search/route.ts:94` and `src/lib/geocode.ts:84`
  — use `Prisma.sql` tagged templates with `Prisma.join`, so every interpolation is a bound
  parameter. The places route additionally escapes LIKE metacharacters (`escapeLike`, line 69) with
  an explicit `ESCAPE '\\'`. The conditional `altNamesClause` is composed from `Prisma.sql` /
  `Prisma.empty`, not string concatenation. `$queryRawUnsafe` / `$executeRawUnsafe` appear nowhere in
  application code, and the demo write policy explicitly refuses `executeRaw*` (`src/lib/demo.ts:109`).
- **XSS — Not Detected in the `dangerouslySetInnerHTML` sinks, high confidence** — but structurally
  fragile. Full analysis in Appendix A §4.
- **Command injection — Not Detected.** No `child_process`, `exec`, `execSync`, `spawn`, `fork` or
  shell invocation anywhere in `src/`.
- **Code injection — Not Detected.** No `eval`, no `new Function`, no string-argument `setTimeout` /
  `setInterval`, no `vm`, no runtime compilation, no plugin loader, no user-controlled dynamic
  import. The dynamic imports in `src/lib/catchups.ts:52-60` use hardcoded module specifiers with a
  documented reason (keeping the pure state machine dependency-free for unit tests). `JSON.parse` is
  applied to database-sourced strings in ~8 places, every one wrapped in try/catch with a safe
  fallback and no `__proto__` reviver or prototype-merge pattern.

### Boundaries done right
- **SSRF — `resolveSpotify` (`src/lib/catchups.ts:619-673`) is a properly-built boundary:** exact
  hostname match on `https://open.spotify.com`, https-only, track/album/playlist path allowlist,
  reconstructed URL rather than pass-through, 3s abort, fail-soft. The oembed fetch target host is
  hardcoded.
- **Open redirect — closed.** `safeNextPath` (`src/lib/next-path.ts`) rejects `//`, backslashes and
  control characters. Complete.
- **CORS** — no `Access-Control-Allow-Origin` anywhere. JSON routes require a session except the
  HMAC-verified Razorpay webhook.

### Payments — textbook
- `/api/razorpay/webhook` verifies over the **raw body** with `request.text()`, HMAC-SHA256 against a
  *separate* webhook secret, `timingSafeEqual` with a length pre-check, returns 400 not 5xx on
  failure to stop retry storms, and is idempotent with "paid" as terminal.
- `confirmContribution` verifies the signature **and** checks row ownership
  (`src/app/(main)/support/actions.ts:157`) — the signature proves the payment is real, not that this
  session opened it. That distinction is frequently missed and is correct here.
- Amounts are validated server-side and clamped ₹100–₹500,000 (`support/actions.ts:56`);
  `Number.isInteger` correctly rejects `NaN` / `Infinity`.

### Authentication and token plumbing
- **Password hashing is correct.** `bcrypt` cost factor 12, applied consistently at
  `src/components/auth/actions.ts:72` and `src/components/auth/email-actions.ts:256`. No plaintext,
  no reversible encryption, no MD5/SHA. Comparison via the constant-time `bcrypt.compare`.
- **The token layer (`src/lib/auth-tokens.ts`) is the strongest security code in the repository.**
  32 bytes from `randomBytes` (never `Math.random`), SHA-256 stored, the raw token existing only in
  the recipient's inbox and never logged; `kind` checked on redeem so a verify link can never be
  replayed as a reset (:165); `sentTo` compared against the current address so an address change
  kills in-flight links (:174); single-use enforced by a conditional `updateMany` CAS that makes
  concurrent clicks race-safe (:179-183); prior live tokens burned on mint inside a transaction
  (:91-99); per-user mint rate limits (:40-43). The reasoning for using unsalted SHA-256 here (256
  bits of CSPRNG has no dictionary) is correct. **Brute force is not a concern**, which is why the
  un-rate-limited `resetPassword` / `confirmEmailToken` redeem actions are not a finding.
- **Role is re-read from the database on every session resolution** (`src/lib/auth.ts:90-105`) rather
  than trusted from the JWT, so a demotion takes effect immediately. `React.cache` dedupes it per
  request.
- **Email templates (`src/lib/email-templates.ts`):** all user-controlled interpolation (`name`,
  `email`) is `escapeHtml`-escaped before entering HTML; the raw `body` slot is only ever fed
  template-built strings that themselves escape their inputs; `color-scheme` locked; no user input
  reaches an attribute or URL context unescaped. **No HTML-injection finding.**
- **Email sending (`src/lib/email.ts`):** structured Resend SDK call, so there is no header-injection
  surface via `to`; refuses undeliverable reserved TLDs; refuses to send in demo mode and in
  dev-without-opt-in.

### Per-object authorization where it was applied
- **Per-action authorization is re-derived from the database, never from client input.**
  `src/app/(main)/catchups/actions.ts` is exemplary: `isEffectiveKeeper` computed from fresh rows,
  compare-and-swap on state transitions, membership checked on every mutation. All 20 Catch-up
  actions verified.
- All 5 message actions enforce thread ownership server-side every time.
- All 8 admin actions go through a centralised `requireAdmin`.
- Collection moderation, the Razorpay pair, and **every dynamic page guard in `(main)`** —
  `/messages/[id]`, `/collection/[id]`, `/letters/[id]`, `/catchups/round/[editionId]`, `/notice/[id]`,
  `/profile/[id]` — verified correct.
- **Notification ownership** (`src/app/(main)/notifications/actions.ts:31,44`) is correctly scoped by
  `{ id, userId }` on both `update` and `updateMany` — no notification IDOR, worth recording since it
  is a common miss.
- **Mass assignment — none.** `updateUserProfile` / `updateProfileField` / `updateContactMethods`
  write explicit field whitelists; `role` / `verifyState` / `batchType` are never client-settable.
  `markNotificationRead`, `setTheme` and the onboarding `updateProfile` are all correctly
  session-scoped.
- **`isUploadedImageUrl`** on admin-message screenshot URLs (`src/app/(main)/messages/actions.ts:50`,
  `src/lib/admin-threads-server.ts:29-33`) is confirmed working. **This is the pattern that C2 and
  M10 need.**

### Uploads
- Gated on both authentication *and* confirmed email **at the route**, not only in the calling action
  — the comment at `src/app/api/upload/route.ts:17-21` shows the author understood why.
- Every proxied image is re-encoded through `sharp` to a fixed `image/webp`, which strips EXIF
  (including GPS) and destroys polyglot payloads.
- Filenames are server-generated cuid2 values, never derived from user input, so there is no path
  traversal in the write path.
- Size caps enforced server-side; `finalize` validates staging keys against a strict regex; type
  allowlists explicit in `presign`, which rejects SVG.

### Demo isolation
- `/api/demo/reset` 404s unless `DEMO_MODE=1`, is throttled, and the cron half checks `CRON_SECRET`.
- The Prisma allowlist in `src/lib/demo.ts` is a **robust default-deny**: model allowlist,
  own-profile-only `User` edits (blocking `role` / `verifyState` / `isBlocked` / `email` / `password`
  / `photoUrl`), bulk-op-without-filter refused, raw `executeRaw` refused. The `$allOperations` (not
  `$allModels`) placement is the correct choice. Covered by the one security-adjacent unit test in
  the repo.

### Also confirmed
- `socialHref` (`src/lib/social.ts:11-17`) prepends `https://` to anything not already
  `http(s)://`, so `javascript:alert(1)` becomes the harmless `https://javascript:alert(1)`;
  `parseUserLinks` re-validates `^https://` **on read** (`:73`). Good defence in depth — and it is
  what currently saves M18.
- No environment file has ever been committed, verified against full git history (M23).

---

# 10. "Vibe coding" risk indicators

Assessed honestly, because this codebase is a genuinely mixed case and a blanket verdict would be
wrong.

| Indicator | Present? | Evidence |
|---|---|---|
| Hardcoded credentials | **Partial** | `secret()` falls back to the literal `"rv-connect-trivia-dev-secret"` (`trivia-actions.ts:89`). A production user id is hardcoded in `avatar.ts:75`. No real secrets in git — verified against full history. |
| Disabled security protections | **Yes** | C1-a and C1-b are deliberately-built authentication bypasses, documented as features. |
| Overly permissive access | **Yes** | H1, H3, H18, C2. |
| Debug/dev code in production | **Yes** | 38 `/lab` routes public (M19), including an internal audit log with source-code excerpts. |
| Frontend-only validation | **Mostly no** | Server-side validation is the norm and is thought about. Exception: M18. |
| Inconsistent validation | **Yes** | `updateUserProfile` vs `updateContactMethods` (M18); `isUploadedImageUrl` applied to admin messages but not Catch-up entries or post images (M10, C2); post visibility checked on read but not on write (H3). |
| Copy-pasted security logic | **Yes** | R6. |
| Massive unmaintainable files | **Yes** | Six files over 1,000 lines (R5). |
| "Make it work first" shortcuts | **Yes** | One database for prod and dev; drain-on-page-view instead of a cron; hand-run SQL instead of migrations; `photoTrusted` with no revocation. |
| Missing architectural discipline | **No** | Layering, naming and separation of concerns are consistently good. |
| Overuse of admin/service-role access | **Partial** | One DB role with full DML, no RLS (M20). But the demo's unguarded client is correctly scoped and justified. |
| Lack of testing | **Yes** | 14 tests, none security (H17). |
| Lack of code review | **Yes** | No CI, no branch protection, no required review (H16). |
| Lack of engineering standards | **No** | `CLAUDE.md` and `AGENTS.md` define standards in unusual detail — they are just **design** standards, not security ones. |

**The honest characterisation.** This is not careless code. It is code where **the quality gate
measured the wrong thing.** Every Critical finding here is invisible to that gate: C1-a and C1-b are
type-correct and lint-clean; C1-c is a build-time inline; C2 is a missing check inside a well-typed
function; H1 is a `"use server"` file that compiles perfectly.

The author demonstrably understood the relevant threat models — `verification-mail.ts` carries a
comment explaining why it must *not* be a `"use server"` export because that would make it an open
mail relay, which is a sophisticated observation about **exactly the class of bug that
`loadDirectoryPage` then committed anyway, twelve files away.** The discipline exists. The
enforcement does not.

---

# 11. AI integration & privacy review

**There is no AI integration in this codebase.** Checked exhaustively: no `@anthropic-ai`, no
`openai`, no `langchain`, no `google-generativeai`, no model endpoints, no embeddings, no vector
store, no LLM-backed features. `package.json` production dependencies contain no AI SDK.

**Therefore: prompt injection — Not Applicable. AI data-processing risk — Not Applicable. AI
governance — Not Applicable.** Any report claiming AI findings here is describing a different system.

**Adjacent finding worth recording.** The codebase was largely AI-assisted (per `progress.md`,
`CLAUDE.md` and the agent tooling in the repo). The relevant governance risk is not runtime, it is
**provenance: there is no human security-review checkpoint in the workflow** (H16).

**If AI is added later**, the pre-conditions this platform does not yet have: a lawful basis and
notice for sending member content to a third-country processor (H12, H13), a DPA with the model
provider, an opt-out, an output-handling boundary (LLM output must never reach
`dangerouslySetInnerHTML` — and there is no CSP behind it, H7), and prompt-injection isolation for
any tool-calling.

---

# 12. Production-readiness scores

The two audits scored independently and diverged. **Both columns are reported**, because the
divergence is informative rather than a contradiction:

| Dimension | Audit A | Audit B | Consolidated | Why they diverge |
|---|---:|---:|---:|---|
| **Security** | 26 | 18 | **18** | A scored deltas against an earlier audit and credited the new email work (which is real); B scored absolutely and weighted the dependency advisories (C3) and the unrecoverable-deletion path (C2) that A rated High. A system with C1 cannot score higher. |
| **Compliance / Privacy** | 38 | 12 | **12** | A credited email verification, the non-enumerable reset flow and contact-gating as genuine privacy-by-design gains (they are). B additionally examined DPAs, cross-border transfer, Art. 30 records, consent capture, retention and breach detection — **none of which exist** — which A did not scope. B's number reflects the wider frame. |
| **Architecture** | 66 | 58 | **58** | Both credit clean layering, the token/queue subsystem and the demo isolation. B additionally penalised the proxy-as-auth-boundary error, the unused `Session` table, one-database-for-everything, and the absent migration history. |
| **Scalability** | 57 | 32 | **32** | A noted the mail queue is thoughtful and nothing regressed. B measured against the stated "millions of users" ambition and found unbounded `findMany`s that OOM, drain-on-page-view, offset pagination, and pooler contention. |
| **Reliability** | 54 | 25 | **25** | A credited the queue's retry and reclaim design (correctly). B weighted no monitoring, no alerting, a silently-failing cron, no verified backups and no DR plan. |
| **Maintainability** | 72 | 62 | **62** | Both credit the comments, strict TypeScript and the fast gate. B weighted 14 tests across 97.5k LOC, six 1,000+ line modules, drifted duplicate logic and documentation that contradicts the implementation. |
| **Enterprise readiness** | 29 | 14 | **14** | Same gates fail in both: security and compliance. B enumerated the rest — no CI/CD, no environments, no branch protection, no review gate, no audit log, no MFA, no RBAC, no SSO, no DR, no vendor management, no IR plan, no pen test, beta auth library. |

## **OVERALL: 29 / 100 — NOT PRODUCTION READY**

Both audits independently arrived at the same overall verdict and, coincidentally, the same headline
number.

---

# 13. Remediation roadmap

## Immediate (0–30 days) — do not expose the site publicly until 1–5 are done

| # | Fix | Effort | Closes |
|---|---|---|---|
| 1 | **Delete `/api/auth/admin-login`.** Remove `NEXT_PUBLIC_ADMIN_EMAIL` and the client-side admin detection from `login/page.tsx`. | 1h | C1-b, C1-c |
| 2 | **Delete the admin branch in `authorize()`.** Admins authenticate with a bcrypt password like everyone else; role comes from the row. | 30m | C1-a |
| 3 | **Stop `delImage` accepting caller-supplied URLs.** Validate `images` on write with `isUploadedImageUrl`, cap the array, and restrict `keyForUrl` to a caller-owned prefix — or add a server-written `objectKey` column and delete only by that. **Enable R2 object versioning today**, independently of the code fix. | 4h | C2, C4 (partial) |
| 4 | **Add `auth()` to `loadDirectoryPage` and `loadComments`**, plus a shared `canViewPost` check on `createComment` / `toggleLike` / `toggleBookmark` / `votePoll` / `toggleCommentLike`. | 3h | H1, H3 |
| 5 | `npm audit fix`; force-upgrade `sharp` to ≥ 0.35.3 and re-verify the five call sites; upgrade `next-auth` to `5.0.0-beta.32` (**the only version outside the advisory range — no stable v5 exists, and v4 latest is also vulnerable**). | 1d | C3 |
| 6 | Enforce `isBlocked` in `authorize()`, in the session callback, in the `(main)` layout and in `requireVerifiedEmail()`. | 1h | H4 |
| 7 | `return null` from the session callback when `dbUser` is null. | 15m | M6 |
| 8 | Fix `deleteAccount`: clear filed reports first (mirror `adminDeleteUser`), delete the member's R2 objects, add confirmation + re-auth. | 4h | H8, H9, M35 |
| 9 | Add security headers via `next.config.ts` `headers()`: CSP, `X-Frame-Options: DENY` / `frame-ancestors`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options`, `Permissions-Policy`. | 3h | H7, L2 |
| 10 | Rate-limit authentication (per IP **and** per account, with lockout). Vercel KV or Upstash. | 1d | H6 |
| 11 | Remove `/lab` from `publicPaths` — admin-gate it. | 15m | M19 |
| 12 | Add `take` to the two admin `findMany` calls and to `/api/users-by-batch`. | 1h | H18 |
| 13 | Fix or delete the `/api/catchups/tick` cron. | 1h | M27 |
| 14 | Validate `updateContactMethods` through `profileSchema`. | 1h | M18 |
| 15 | **Rotate every secret** on the assumption C1 was exploited: `NEXTAUTH_SECRET`, R2 keys, Razorpay keys, Resend key, database password. | 4h | — |
| 16 | Fix H5 properly: require N distinct reporters before touching `verifyState`, add `@@unique(reporterId, reportedUserId)`, rate-limit, and route through the thread rate limiter. Add `requireVerifiedEmail` to `reportPost` / `reportUser` / `startThread` / `createCatchup`. | 3h | H5, L4 |
| 17 | Add a `credentialVersion` / `sessionsValidFrom` column to `User`; stamp on password change/reset, block and delete; carry it in the JWT; reject stale tokens in the session callback. **One mechanism, three findings.** | 1d | M4, and the revocation half of H4 and M6 |
| 18 | **Two-gate trust model**: add `verifyState` to the session select; introduce `requireVerifiedMember()`; apply to every write action and to `viewerMaySeeContacts()`; add the member-initiated "request verification" path and the locked-contact UI. Spec in `OWNER-INPUT-REQUIRED.md` §1. | 2d | H21, and the abuse half of H1, H3, H5, M1 |
| 19 | **Cloudflare Turnstile** on signup, login and password reset; shared durable rate-limit layer on all write actions and enumeration-capable reads. | 1d | H22, and reinforces H6, M2, M3 |

**Total: roughly one focused week** for items 1–15; add two days for 16–17.

## Short-term (1–3 months)

- **CI pipeline** — `npm run check` + `npm audit --omit=dev --audit-level=high` + secret scanning + a
  SAST pass, plus branch protection on `main`. **Add security assertions to `npm run check` so this
  class of bug fails the gate.** (H16)
- **Separate production from development** — a dedicated dev database, dev R2 bucket and dev Resend
  key. **Nothing else on this list matters as much for reducing ongoing risk.** (H15)
- **Audit logging** — an `AuditLog` table capturing sign-ins, admin actions, deletions, role and
  verification changes, with actor, target, timestamp and IP. (H10, H14, M36)
- **Error tracking and alerting** — Sentry or equivalent, with alerts on auth failures, 5xx spikes
  and cron failures. (H11, M31)
- **Rate limiting across the board** — signup, uploads, posts, comments, reports, password reset
  (**per IP**, closing M3), Catch-up creation. (M2)
- **Privacy layer** — privacy policy, cookie notice, consent capture at signup, Art. 30 processing
  record, DPAs with Vercel / Supabase / Cloudflare / Resend / Razorpay, SCCs for the EU→India
  transfer. (H12, H13)
- **Session hardening** — shorten to 7 days, add an idle timeout, invalidate on password change, add
  a session inventory. (M5)
- **Security test suite** — one test per action asserting that unauthenticated and cross-user calls
  are refused; property tests for `renderRichText`; regression tests for C1 and C2. (H17)
- **Backups** — verify Supabase backups exist, test a restore end to end, document RTO/RPO, add R2
  replication. (C4, H19)
- **MFA for administrators.** (H6)
- **Storage privacy** — private prefix for pending Collection contributions; delete or relocate on
  removal (M11); strip EXIF from Collection originals or warn the contributor (M12).
- Also: M10 (validate feed/catchup image origins), M13 (magic-byte checks), M14 (`limitInputPixels`),
  M29 (invitation instead of forced enrolment), M30 (`photoTrusted` revocation), M32 (transactional
  poll create), L3 (move the reset enqueue into `after()`), L9 (catch P2002), L10 (scope the
  notification delete by `userId`).

## Medium-term (3–6 months)

Prisma migration history — reconcile the live schema, adopt `migrate deploy`, retire hand-run SQL
(H19). Postgres enums and CHECK constraints for status columns; `@db.VarChar` limits; normalise the
JSON-in-string columns (M22). Supabase RLS (M20). Break up the six 1,000+ line modules (R5). Replace
the hand-rolled `renderRichText` with a maintained sanitiser (DOMPurify) behind a real CSP.
Structured logging with PII scrubbing and defined retention (L5). Data-retention jobs (M34). A real
cron for the mail queue and Catch-up advance (M28). Presigned POST with `content-length-range` (M16).
Per-account storage quotas (M17). Signed URLs, or a custom domain with hotlink protection, for R2,
plus a `robots.txt` (H20). Self-service data export, Art. 20 (M35). A staging environment (H15).
Field-level encryption for phone numbers and admission numbers (M21).

## Long-term (6–12 months)

Full RBAC with a permissions table instead of a `role` string. SSO/OIDC option. Read replicas and
multi-region (M25). Formal incident-response plan with tabletop exercises (H19). Annual third-party
penetration test. SOC 2 Type II readiness if institutional partnership is a goal. Malware scanning on
uploads (M15). WAF / bot management. Feature flags and progressive rollout. Chaos and DR drills.
**A formal per-object authorization helper so a new action cannot forget the checks H1, H3 and C2
forgot.** A documented threat model maintained alongside the specs — the `docs/spec/` discipline
already exists and is good; it simply has no security chapter.

---

# Appendix A — targeted vulnerability audit

Status / Location / Attack vector / Impact / Confidence. No remediation in this section by design.

## A.1 Authentication bypass — **PRESENT (Critical)**

**Location:** `src/app/api/auth/admin-login/route.ts:7-70`; `src/lib/auth.ts:30-49`; enabled by
`src/proxy.ts:161` and `src/app/(auth)/login/page.tsx:346-347`.

**Attack vector:** (a) POST `{email: "<admin address>"}` to `/api/auth/admin-login` — the address is
compiled into the public client bundle (verified present in
`.next/dev/static/chunks/src_0xnik.6._.js`) and the caller is returned an admin JWT with no
credential. (b) Enter the same address in the normal login form with any password — `authorize()`
returns before the `bcrypt.compare`.

**Impact:** Full administrative compromise. All member PII, all private messages, all reports;
irreversible account deletion; moderation control; combined with A.3 below, destruction of the media
archive.

**Confidence: High.** Both paths read unambiguously from source; the public exposure of the
identifier was confirmed against build output.

**Secondary (Medium):** `src/proxy.ts:107-110` treats cookie *presence* as authentication and never
validates it. Combined with Next's cross-route action forwarding
(`node_modules/next/dist/server/app-render/action-handler.js:451-461`), the proxy is not an
authorization boundary for server actions. **Confidence: High** on the mechanism.

**Not detected:** hardcoded user credentials; a debug/test-mode auth skip; OAuth flaws (no OAuth
configured); JWT `alg:none` or key-confusion (handled by `@auth/core`).

## A.2 Weak password handling — **NOT DETECTED (storage) / PRESENT (policy & flows, Medium)**

**Location:** `src/components/auth/actions.ts:72`; `src/components/auth/email-actions.ts:238-270`;
`src/lib/auth-tokens.ts`; `src/lib/validators.ts:19`.

**Findings:** Storage is correct — `bcrypt` cost 12, no plaintext, no reversible encryption,
constant-time compare. The reset flow is **well built**: 256-bit CSPRNG token, SHA-256 at rest,
single-use via conditional update, kind-checked, address-pinned, prior tokens burned, non-enumerable
request endpoint. Weaknesses: 8-character minimum with no complexity and no breach-corpus check; **no
session invalidation on password change** (an attacker's session survives the victim's reset); no
re-auth for sensitive operations; no rate limit on the login endpoint enabling unlimited guessing;
and a timing side-channel on the reset request that partially undoes its own anti-enumeration design
(L3).

**Impact:** Weak-password account takeover; persistence of an attacker session through the victim's
remediation.

**Confidence: High.**

## A.3 Missing or flawed authorization — **PRESENT (Critical + High)**

- `src/app/(main)/directory/actions.ts:39` — `loadDirectoryPage`, **zero `auth()` calls**, returns
  the paginated member directory with caller-controlled filters. *Impact:* full membership roll with
  employer and city. *Confidence:* High (missing check) / Medium-High (unauthenticated reachability).
- `src/app/(main)/feed/actions.ts:954` — `loadComments`, no auth and no post-visibility check.
  *Impact:* read private-group and city-scoped comment threads by post ID. *Confidence:* High.
- `src/app/(main)/feed/actions.ts:117 → 278 → 29` → `src/lib/storage.ts:183,168,151` — **IDOR on
  object deletion.** Client supplies an unvalidated, uncapped array of R2 URLs in `Post.images`;
  deleting the post issues `DeleteObjectCommand` for each. *Impact:* any confirmed member permanently
  deletes every image in the production bucket. *Confidence:* High.
- `src/app/(main)/feed/actions.ts:234,405,455,477` (and `:908`) — `votePoll` / `toggleLike` /
  `toggleBookmark` / `createComment` / `toggleCommentLike` act on any post ID with no visibility
  check, **though the read path enforces one**. *Confidence:* High.
- `src/lib/auth.ts` + all write paths — `isBlocked` enforced in 6 reads, 0 writes, 0 auth paths.
  *Impact:* banning is cosmetic. *Confidence:* High.
- `src/components/posts/report-action.ts:96` — any member sets any user's `verifyState` to
  `"flagged"`, unlimited, bypassing the thread rate limit. *Confidence:* High.
- `src/app/api/users-by-batch/route.ts:24` — unbounded enumeration of the user table.
  *Confidence:* High.

**Correctly authorized (verified, no finding):** all 20 Catch-up actions; all 5 message actions; all
8 admin actions (via a centralised `requireAdmin`); collection moderation; the Razorpay pair;
notification read-state; and every dynamic page guard in `(main)` — `/messages/[id]`,
`/collection/[id]`, `/letters/[id]`, `/catchups/round/[editionId]`, `/notice/[id]`, `/profile/[id]`.

## A.4 Cross-site scripting (CWE-79/80) — **NOT DETECTED (but structurally fragile)**

**Location:** `src/lib/utils.ts:404-429` (`renderRichText`) → `src/components/posts/post-card.tsx:304,320`,
`src/app/(main)/letters/[id]/page.tsx:172`, and `src/components/posts/create-post-form.tsx:253`
(`.innerHTML`).

**Analysis.** `renderRichText` escapes `&`, `<`, `>`, `"` first; then applies five emphasis regexes
emitting fixed tags; then rewrites `@[Name](userId)` into `<a href="/profile/$2" class="…">@$1</a>`.

- `$1` lands in element text — already escaped. Safe.
- `$2` lands inside a **double-quoted** attribute. Every `"` in the input has already become
  `&quot;`, and none of the emphasis `open`/`close` strings contains a quote character, so **the
  attribute cannot be broken out of.** The one non-obvious composition was checked: `@[a](x*y*z)`
  yields `href="/profile/x<em>y</em>z"` — a raw `<` inside an attribute value, which HTML parsers
  treat as literal, not as a tag start. No breakout.
- The href is hard-prefixed with `/profile/`, so `javascript:` and `data:` schemes are structurally
  unreachable.
- `'` is *not* escaped, but every attribute here is double-quoted, so it is inert.
- React auto-escapes everywhere else. `parseUserLinks` (`src/lib/social.ts:73`) re-validates
  `^https://` on read, and `socialHref` neutralises scheme injection by prepending `https://`.

**Residual risk (not a current vulnerability):** a **hand-rolled sanitiser with zero test coverage**
protecting the highest-value sink in the application, `'` unescaped, and **no CSP** (H7) — so a
single future refactor to a single-quoted attribute, one more `open` string, or one more replacement
rule becomes exploitable with nothing behind it. `src/components/profile/profile-actions.ts:116`
writes link URLs with no validation, relying entirely on the read-side check (M18). Two other
`dangerouslySetInnerHTML` uses take real user data in `/lab`
(`src/app/lab/feed-canvas/page.tsx:208`) but with hardcoded strings.

**Confidence: High** that no reflected, stored or DOM-based XSS is presently exploitable through
these sinks. **Recommendation: replace with a maintained sanitiser and cover with tests even though
it is currently correct.**

## A.5 SQL injection (CWE-89) — **NOT DETECTED**

**Location:** `src/app/api/places/search/route.ts:94`; `src/lib/geocode.ts:84`. All other data access
uses the Prisma query builder.

**Analysis:** Both raw queries use `Prisma.sql` tagged templates; every user value is a bound
parameter. `Prisma.join` is used for the IN-list. LIKE metacharacters are escaped (`escapeLike`,
line 69) with an explicit `ESCAPE '\\'`. The conditional `altNamesClause` is composed from
`Prisma.sql` / `Prisma.empty`, not string concatenation. `$queryRawUnsafe` and `$executeRawUnsafe`
appear nowhere in application code; the demo write policy explicitly refuses `executeRaw*`
(`src/lib/demo.ts:109`).

**Note (not injection):** `buildDirectoryWhere` (`src/app/(main)/directory/where.ts:28`) passes
caller-controlled filter strings into a Prisma `where` object. Values are parameterised and object
*keys* are fixed by the function, so no operator injection is possible — **but the function is
reachable without authentication** (A.3).

**Confidence: High.**

## A.6 Command injection (CWE-78) — **NOT DETECTED**

**Location:** N/A. There is no `child_process`, `exec`, `execSync`, `spawn`, `fork` or shell
invocation anywhere in `src/`.

**Adjacent, non-command finding:** `keyForUrl` (`src/lib/storage.ts:168`) derives a filesystem path
from a caller-supplied URL in the local-development branch (`readFile` / `unlink` under
`process.cwd()/public`). A `/../` sequence would traverse — but that branch does not execute in
production (R2 is configured), and no shell is involved. The **production** consequence of the same
untrusted-key flow is object deletion, reported as C2 / A.3.

**Confidence: High.**

## A.7 Code injection (CWE-94) — **NOT DETECTED**

**Location:** N/A. No `eval`, no `new Function`, no string-argument `setTimeout` / `setInterval`, no
`vm`, no runtime compilation, no plugin loader, no user-controlled dynamic import. The dynamic
imports in `src/lib/catchups.ts:52-60` use hardcoded module specifiers with a documented reason.

**Adjacent:** `JSON.parse` is applied to database-sourced strings in ~8 places (`images`, `links`,
`phones`, `houses`, `payload`). Every one is wrapped in try/catch with a safe fallback, and no
`__proto__` reviver or prototype-merge pattern is used. Not a code-injection path; the
**prototype-pollution advisory against `defu`** (transitive, High, C3) is a supply-chain concern
rather than an application one.

**Confidence: High.**

---

# Appendix B — ID cross-reference map

For anyone holding the two source documents. **A** = re-verification pass. **B** = independent pass.

| Consolidated | Audit A | Audit B |
|---|---|---|
| C1 (all parts) | C1, C2, C3 | C-1, C-2 |
| C2 | H3 | C-3 |
| C3 | L3 (partial) | C-4 |
| C4 | — | F-61, F-62 |
| H1 | H1 | F-7, F-10 |
| H2 | (noted under H1) | §5 structural, Appendix secondary |
| H3 | H2 | F-11, F-12 |
| H4 | H4 | H-3, F-2 |
| H5 | H5 | F-15, F-44 |
| H6 | M4 | F-1 |
| H7 | M3 | F-30 |
| H8 | M2 | H-2, F-51 |
| H9 | M1 | H-2, F-52, F-55 |
| H10 | M6 | F-57 |
| H11 | — | F-58 |
| H12 | L9 | H-1 |
| H13 | — | H-4 |
| H14 | — | H-6 |
| H15 | — | F-19, F-37 |
| H16 | — | F-36, §9 adjacent |
| H17 | — | F-72 |
| H18 | — | F-65, F-13 |
| H19 | — | F-63, F-64 |
| H20 | L11 | F-22 |
| M1 | M7 | H-7, F-5, F-13 |
| M2 | M10 | F-14 |
| M3 | — | F-16 |
| M4 | **N1** | §12 (row) |
| M5 | — | F-4 |
| M6 | — | F-3 |
| M7 | L2 | F-6 |
| M8 | — | F-8 |
| M9 | — | F-9 |
| M10 | M5 | F-28 |
| M11 | M8 | — |
| M12 | — | F-27 |
| M13 | L7 | F-25 |
| M14 | L6 | — |
| M15 | — | F-26 |
| M16 | — | F-23 |
| M17 | M10 | F-29 |
| M18 | L10 | F-32 |
| M19 | L8 | F-34 |
| M20 | — | F-21 |
| M21 | — | F-20 |
| M22 | — | F-24 |
| M23 | — | F-38 |
| M24 | — | F-39 |
| M25 | — | F-40, F-70 |
| M26 | — | F-42 |
| M27 | L5 | F-18 |
| M28 | — | F-66 |
| M29 | — | F-43 |
| M30 | — | F-45 |
| M31 | — | F-60 |
| M32 | M9 | F-49 |
| M33 | (clean-list note) | F-35 |
| M34 | — | H-5, F-56 |
| M35 | — | F-53 |
| M36 | — | F-54 |
| L1 | L1 | — |
| L2 | **N4** | — |
| L3 | **N3** | — |
| L4 | **N2** | — |
| L5 | — | H-8, F-59 |
| L6 | — | F-17 |
| L7 | — | F-46 |
| L8 | — | F-47 |
| L9 | — | F-48 |
| L10 | — | F-50 |
| L11 | — | F-41 |
| L12 | — | F-33 |
| R1 (offset pagination) | — | F-67 |
| R2 (N+1 patterns) | — | F-68 |
| R3 (pooler + interactive transactions) | — | F-69 |
| R4 (no retries outside the mail queue) | — | F-71 |
| R5 (oversized modules) | — | F-73 |
| R6 (duplicated security logic, drifted) | — | F-74 |
| R7 (docs contradict implementation) | — | F-75 |
| R8 (dead code and dead columns) | — | F-76 |
| R9 (Prisma `clientKey` hack) | — | F-77 |
| R10 (code-quality positives) | (maintainability notes) | §17 positives |
| R11 (mail queue design) | (queue/reliability notes) | F-71 positive, §16 |
| (defence-in-depth note, `socialHref` / `parseUserLinks`) | L10 context | F-31 |
| **Resolved** | **L4** (no email verification / no password reset) | — |

---

# Appendix C — prior-audit verification record

Audit A's job was to re-open every finding of an earlier audit (written against `274f087`,
2026-08-08) at its cited file and trace it against HEAD. **That earlier document was never committed
and no longer exists on disk, so this table is the only surviving record of it.** Preserved verbatim
in substance.

**The one-line answer: the prior audit was accurate. Almost everything it found is still live.**

Legend: **PRESENT** (still live, unchanged) · **MITIGATED** (still present, blast radius reduced by
new work) · **RESOLVED** (fixed since the prior audit).

| Prior ID | Prior severity | Status at `824eac3` | Location then verified | Now |
|----|------|--------|--------|---|
| C1 | Critical | **PRESENT** | `src/lib/auth.ts:30-49` | C1-a |
| C2 | Critical | **PRESENT** | `src/app/api/auth/admin-login/route.ts:7-70` | C1-b |
| C3 | Critical | **PRESENT** | `src/app/(auth)/login/page.tsx:345-347, 356-372` | C1-c |
| H1 | High | **PRESENT** | `src/app/(main)/directory/actions.ts:39` | H1 |
| H2 | High | **PRESENT** | `src/app/(main)/feed/actions.ts:234, 405, 477, 954` | H3 |
| H3 | High | **PRESENT** | `validators.ts:115` → `feed/actions.ts:125, 302, 29` → `storage.ts:168, 183` | C2 |
| H4 | High | **PRESENT** | `src/lib/auth.ts:90-105`; `(main)/layout.tsx` (no `isBlocked`) | H4 |
| H5 | High | **PRESENT** | `src/components/posts/report-action.ts:124-127` | H5 |
| M1 | Medium | **PRESENT** | `src/components/settings/actions.ts:245-255` | H9 |
| M2 | Medium | **PRESENT** | `prisma/schema.prisma:404` + `settings/actions.ts:250` | H8 |
| M3 | Medium | **PRESENT** | `next.config.ts` (no `headers()`) | H7 |
| M4 | Medium | **PRESENT** | `src/lib/auth.ts`, `admin-login/route.ts` | H6 |
| M5 | Medium | **PRESENT** | `src/lib/validators.ts:115`; `catchups/actions.ts:143` | M10 |
| M6 | Medium | **PRESENT** | `prisma/schema.prisma` (no `AuditLog`); `admin-actions.ts` | H10 |
| M7 | Medium | **PRESENT** | `api/users/search/route.ts`; `users-by-batch/route.ts` | M1 |
| M8 | Medium | **PRESENT** (second leg confirmed) | `collection/actions.ts:459, 73, 192` | M11 |
| M9 | Medium | **PRESENT** | `src/app/(main)/feed/actions.ts:133-143` | M32 |
| M10 | Medium | **PRESENT** | `upload/route.ts`, `finalize/route.ts`, `collection/actions.ts` | M2, M17 |
| L1 | Low | **MITIGATED** | `profile/[id]/page.tsx:120` (now gated at :137) | L1 |
| L2 | Low | **PRESENT** | `src/components/auth/trivia-actions.ts:89, 86` | M7 |
| L3 | Low | **PARTLY RESOLVED** | `package.json` — `resend` now wired up; `next-auth` still beta | C3 |
| L4 | Low | **RESOLVED** | email verification + password reset shipped | — |
| L5 | Low | **PRESENT** | `vercel.json` → `/api/catchups/tick` still absent | M27 |
| L6 | Low | **PRESENT** | all `sharp()` calls (no `limitInputPixels`) | M14 |
| L7 | Low | **PRESENT** | `src/app/api/upload/route.ts:59` | M13 |
| L8 | Low | **PRESENT** | `src/proxy.ts:163` (`/lab` in `publicPaths`) | M19 |
| L9 | Low | **PRESENT** | no privacy/consent/export route | H12 |
| L10 | Low | **PRESENT** | `profile-actions.ts:131`; render guard `src/lib/social.ts:73` | M18 |
| L11 | Low | **PRESENT** | `src/lib/storage.ts` (public global bucket) | H20 |

**What changed, in full.**

- **L4 — RESOLVED.** Email verification (`/verify-email` + `confirmEmailToken`) and the full
  forgot-password / reset flow shipped (`src/lib/auth-tokens.ts`,
  `src/components/auth/email-actions.ts`, `src/lib/email-queue.ts`). Signup now sends a confirmation
  link, and the "confirm before you write" gate exists and is enforced server-side.
- **L1 — MITIGATED.** See L1 above; the login email now leaks only to email-confirmed members.
- **L3 — PARTLY RESOLVED.** `resend` is no longer a dead dependency; `next-auth` is still beta.
- **M8 — a second leg confirmed.** `contributePhoto` (:73) and `contributePhotoDirect` (:192) both
  create the `Photo` row with `approved:false` **after** the bytes are already at a public R2 URL.
- **Nothing else moved.** No Critical and no High was fixed, mitigated or even touched in the 11
  commits between `274f087` and `824eac3`.

---

# Appendix D — notes on method

Both audits were **read-only**; no source file was modified by either.

**Audit B's findings that exist only because it read beyond `src/`:**

- The **server-action forwarding behaviour** that undermines the proxy (H2) came from reading
  `node_modules/next/dist/server/app-render/action-handler.js`, not from a mental model of Next.js.
- The **`next-auth` beta advisory that lands precisely on this codebase's existence-based guard
  pattern** (C3) came from cross-reading the advisory text against the actual guard idiom used in all
  ~86 actions.
- The confirmation that **`NEXTAUTH_SECRET` is a valid fallback for `AUTH_SECRET`**
  (`next-auth/lib/env.js:22`) *ruled out* a finding another reviewer might have reported.
- **The admin address in a client chunk (C1-c)** was found by grepping the **build output**, not the
  source. It was the single most consequential thing found, and **it is invisible from `src/` alone.**

**Audit A's contribution was continuity:** it established which findings survived, which were fixed,
and — by reading the ~3,900 lines of auth/email/token code added in 11 commits that no earlier audit
had seen — it produced four findings (now M4, L2, L3, L4) that only exist in the newest code, and
confirmed that the new subsystem is otherwise sound.

**The most useful thing to take from this report is not the list.** It is this: **every Critical
finding here would pass `npm run check` today.** The gate is excellent at what it measures and has
never been pointed at authorization. Point it there, and this codebase's existing discipline will do
the rest.

---

*Consolidated from two independent read-only audits performed against commit `824eac3` on
2026-08-11. Line numbers are current as of that commit; re-check before implementing if the tree has
moved.*

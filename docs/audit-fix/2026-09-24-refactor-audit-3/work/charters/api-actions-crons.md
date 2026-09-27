# Charter: api-actions-crons (T12)
Report: `work/agents/api-actions-crons.md`. See `_header.md`.

**Write-path surface.** You audit the *shape* of every server action and API route: gates,
validation, revalidation, error mapping, duplication across files, dead routes. T04/T07/T11 own
the domain logic inside upload, auth and payment routes; you own the pattern across all of them.
Never propose weakening a gate; name the pin beside anything touching a pinned file.

## Territory (read every file in full)
- `src/app/api/**` — all 18 `route.ts` (~2,401 lines): account/export, auth/[...nextauth],
  catchups/tick, demo/reset, dev-login, photo/download, places/search, presence, razorpay/webhook,
  resend/webhook, retention/sweep, upload/{audio,audio/finalize,finalize,presign,(root)},
  users-by-batch, users/search
- All 22 action files (`raw/routes.txt` does not list them; the list: `src/app/(main)/{admin/mail,
  admin/people,admin/reports,admin/review,catchups,collection,directory,feed,messages,
  notifications,support}/actions.ts`, `src/app/lab/actions.ts`, `src/components/auth/{actions,
  email-actions,trivia-actions,verification-actions}.ts`, `src/components/catchups/edition/
  entry-comment-actions.ts`, `src/components/onboarding/actions.ts`, `src/components/posts/
  feed-comment-actions.ts`, `src/components/profile/profile-actions.ts`, `src/components/settings/
  {actions,theme-actions}.ts`) — read each for its *shape*; territory agents read them for logic.
- `src/lib/call-action.ts`, `api-gate.ts`, `demo.ts` (316), `vercel.json` (crons)
- `src/lib/gate-coverage.test.mjs`, `security-regressions.test.mjs` — read as the contract.

## Context
The identical action preambles are the C-189 contract (audit 1 and 2 §5) — NOT duplication. What
is *not* covered by that contract and repeats — revalidation sets, zod parse + error shaping,
notification fan-out, rate-limit calls, `after()` usage — is yours to judge. Audit 2's
`admin-analytics-07` warning: `await headers()` throws inside `after()`.

## Leads from the orchestrator
- `catchups/actions.ts` is 1,619 lines and exports two functions nothing imports (knip:
  `setCatchupPicture`, `setEditionTimeCapsule`).
- Two comment action files on one table (feed, Catch-up entries).
- Three search endpoints stay three (audit 1) — but has a fourth appeared (the header pill)?
- The upload family: presign/finalize (direct-to-R2) plus `upload/route.ts` (server-side) plus the
  audio pair. Audit 2 said all three live; re-verify who calls `upload/route.ts` today.
- `demo/reset`, `dev-login`, `catchups/tick`, `retention/sweep`: each answers what in production?
  Which are cron-driven (`vercel.json`) and does every cron route exist and vice versa?
- `presence` (T06 has the DB side): request rate per member session.

## Questions
1. A table: every action/route × (auth gate, demo gate, rate limit, validation, revalidate, audit
   log) — cells filled from the code. Gaps are the bug audit's; *inconsistencies of shape* are yours.
2. Dead routes and dead actions (routes nothing fetches; actions nothing calls — grep the lab too).
3. The six signatures; single-use helpers inside action files.

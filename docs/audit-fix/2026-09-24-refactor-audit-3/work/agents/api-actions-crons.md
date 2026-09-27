# api-actions-crons - refactor audit 3 report

PARTIAL (second checkpoint; still reading collection, admin/people, messages, support, the auth
quartet, profile/settings and catchups 1990-2821). Findings below are verified; more to come.

Charter: T12, the SHAPE of every server action and API route (gates, validation, revalidation,
error mapping, cross-file duplication, dead routes/actions) plus the crons. Audit-only. Date
2026-09-24, HEAD 70570bcd.

## Coverage
- Territory: 18 `route.ts` (2,401 lines), 22 `"use server"` files (9,269 in the charter's list
  plus two it missed: `src/app/(main)/image-aim.ts` 108 and `src/components/posts/report-action.ts`
  356), two client-side comment adapters (32 + 36), `call-action.ts` 59, `api-gate.ts` 164,
  `demo.ts` 316, `vercel.json` 15, `gate-coverage.test.mjs` 256, `security-regressions.test.mjs` 458.
- Read fully so far: all 18 routes, call-action, api-gate, demo, vercel.json, both contract tests,
  lab/actions, directory/actions, admin/mail, admin/reports, notifications, onboarding,
  feed/actions 1-1140, catchups/actions 1-1990.
- Charter drift: `catchups/actions.ts` is 2,821 lines at HEAD, not 1,619.
- Uncommitted edits seen: none in territory (`git status --short` clean on every file).

## Findings so far (headline only; full write-ups replace this list)
- 01 The 105 `revalidatePath` calls: on Next 16.3 with every route dynamic and nothing cached,
  the path argument is inert (action-handler.js:100-124 sends one flag; server-action-reducer.js
  218-237 evicts the whole bfcache/prefetch cache and re-renders the CURRENT route). Sets have
  drifted; three comments state a path-based model that the shipped code does not have.
- 02 Autosave actions re-render the page they are called from on every save (editPost on the
  letter desk every 2.5 s idle; submitEntry on every answer blur).
- 03 Versioned autosaves write with updateMany then re-read the row for its version; Prisma 7's
  updateManyAndReturn does both (editPost, submitEntry): -1 query per save.
- 04 Catch-ups' runAction: a second, Catch-ups-only error-mapping layer that hides errors from
  Sentry (console.error only), with a dead P2021 branch.
- 05 feed adminRemovePost / adminRemoveComment still hand-roll requireAdminAction.
- 06 Resend webhook re-types timingSafeEqualStrings.
- 07 places/search hand-writes a signed-in-plus-meter door (same shape as vetPhotoDownload).
- 08 The Catch-up notify payload is written seven times.
- 09 revalidatePath inside after() (createPost -> /collection) is inert.

(Report in progress; no Metrics section until complete.)

# Charter: letters-messages-support (T11)
Report: `work/agents/letters-messages-support.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/letters/**` (7 files, ~779), `src/components/messages/**` (4, ~544),
  `src/components/support/**` (7, ~1,558; `wood.tsx` — the parked aviary lives here?)
- `src/app/(main)/letters/**`, `messages/**` (+`actions.ts`), `support/**` (+`actions.ts`)
- `src/lib/`: `email.ts` (255), `email-queue.ts` (1,051 — audit 2 proved its comment mass is the
  product; do not re-litigate; look for what changed since), `email-templates.ts` (387),
  `mail-policy.ts` (335, ratio 1.97), `contribution-state.ts`, `razorpay.ts`
- `src/app/api/razorpay/webhook`, `api/resend/webhook` (T12 owns gate shape)
- `docs/content/**` (740 MD lines + 124 JSON: the letters' content?), `public/images/email/**`
- `src/app/(main)/admin/mail/**` is T06's; read `admin/mail/actions.ts` for the queue's admin side.

## Specs and context
`docs/spec/letters.md` (2026-09-17), `docs/OPERATIONS.md` (mail, Resend, Razorpay), the support
section of DESIGN-SYSTEM. Commits: `0be48079`/`b3a66f7d` (300 words is the line; a short letter is
asked whether it would rather be a post), `580f87f1` (ten letters, content), `8f1a3bc1`,
`9f34cf8e` (leave the site's own people's payments out of the totals), `ed03e985`/`0f38fd20`
(the bill's bar), `28c14316`, `e9cc0730`, `b884678f`.

## Leads from the orchestrator
- `raw/db-tables-live.json`: `OutboundEmail` 231 rows with **27,124 seq scans**; `QueueLease` 1 row
  with 6,943 seq scans. What polls them, how often, from where (a cron? every request?).
- `docs/content/`: is it loaded at runtime, at build, or was it seeded once (then it is a record,
  not code — where should it live)?
- The letters/posts split at 300 words: two composers or one with a threshold?
- `wood.tsx` and the aviary: memory says "aviary parked in wood.tsx (lab-only)" — is any of it in
  the shipped support page's bundle?
- `messages`: a member→admin thread system (`AdminThread` 8 live / 51 dead rows). Size of the
  surface vs use.

## Questions
1. Client boundaries; dynamic imports for the Razorpay flow.
2. Duplication between the three email surfaces (templates, queue, policy) and `catchups-notify.ts` (T03).
3. The six signatures per file.

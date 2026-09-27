# Charter: auth-onboarding-settings (T07)
Report: `work/agents/auth-onboarding-settings.md`. See `_header.md`.

**Security surface.** Simplify only; never propose anything that weakens a gate, and name the pin
(`security-regressions.test.mjs`, `gate-coverage.test.mjs`, the `*-rule.test.mjs`) beside every
proposal that touches a pinned file.

## Territory (read every file in full)
- `src/components/auth/**` (14 files, ~3,432; `actions.ts`, `email-actions.ts`,
  `trivia-actions.ts`, `verification-actions.ts`, `turnstile-widget.tsx`)
- `src/components/onboarding/**` (8, ~988), `src/components/settings/**` (7, ~1,647; `actions.ts`, `theme-actions.ts`)
- `src/app/(auth)/**` (11 files), `src/app/(main)/welcome/**`, `src/app/(main)/dark-mode/**`
- `src/app/api/auth/[...nextauth]`, `api/dev-login`, `api/account/export` (T12 owns gate shape)
- `src/lib/`: `auth.ts` (528), `auth-tokens.ts`, `auth-flow-rule*`, `turnstile.ts`,
  `bot-check-detail.ts`, `bot-check-message.ts`, `human-pass-rule.ts`, `app-secret.ts`,
  `api-gate.ts`, `rate-limit.ts` (338, ratio 1.68), `login-attempt.ts`, `validators.ts` (321),
  `account-purge.ts` (472), `retention.ts` (364), `src/proxy.ts` (422, ratio 2.01),
  `src/types/next-auth.d.ts`, `src/instrumentation.ts`, `src/instrumentation-client.ts`

## Specs and context
`docs/SECURITY.md`, `docs/spec/demo.md`, `docs/TRAPS.md`, AGENTS.md's auth section. Commits:
`3558e96d` (a failed bot check stops being a permanent lockout), `70570bcd` (the trivia `never[]`
list), `c2ac10f4` (dark-mode gauntlet copy), `638793cc` (loading screens for Pick your bird, Dark
mode, Welcome).

## Leads from the orchestrator
- `raw/db-statements-live.json`: the `User` session-row SELECT appears as **three statement
  shapes** (77,364 / 45,032 / 43,673 calls) with different column sets. Which callers, and would one
  `select` behind `auth()` (already `cache()`d per request) collapse them? Say what each shape is for.
- `LoginAttempt` 324 rows; `AuthToken` 162 rows with 44 dead — the sweep cadence.
- Audit 2's win #2 (the sign-in pages carried a 161 KB popover stack for a tooltip they never draw):
  did the campaign land it? Check `float-field.tsx`'s imports and what `/login` pulls today.
- The welcome wizard steps as dynamic imports (audit 2 phase B) — landed?
- `validators.ts` 321 lines of zod: schemas used once, schemas duplicated between client and server.

## Questions
1. Client boundaries (the forms); what the auth pages import that a signed-out visitor does not need.
2. Duplication between the four auth action files (error mapping, token flows, rate-limit calls).
3. `proxy.ts` and `api-gate.ts`: two gates, one policy? Say where each is the source of truth.
4. The six signatures per file.

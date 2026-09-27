# lib-core-config - refactor audit 3 report (PARTIAL, in progress)

Charter T13: every `src/lib` file no other charter names (found by elimination: 56 files, 3,441
lines), plus the config surface (`next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
`postcss.config.mjs`, `components.json`, `vercel.json`, `prisma.config.ts`, `package.json` scripts
and overrides, `.mcp.json`, `.github/**`, `.gitignore`, `src/instrumentation*.ts`, `src/types/**`).
Date 2026-09-24, HEAD `70570bcd`. Audit-only.

## Coverage
- Elimination list (56 lib files): append-page, collection-viewer-facts, content-view, db-text,
  double-submit, draft-images, draft-rule, email-address, email-gate-message, email-verification,
  fnv1a, guide-areas, guide-open, heart, human-pass, keyset, local-storage, mask-email,
  member-gate-message, member-gate, next-path, notification-count, notification-links, origin-rule,
  origin, page-label, password-rule, people-select, place-aliases, place-lookup, place-write,
  post-caps, prisma-errors, prisma, rate-limit-message, read-more-fold, report-error, roster-rule,
  search-continuation, session-revocation, sign-in-unavailable-message, social, stats-exclusion,
  test-fn-body.mjs, test-kit.mjs, text-width, theme, timing-safe, turnstile-origin-rule,
  upload-ownership-rule, upload-ownership, utils (exports), vcard, verification-mail, voice-answer,
  wordle.
- Reading in progress.
- Uncommitted edits seen: none in territory (`git status --short` shows only the two audit folders).

(PARTIAL: no Metrics section yet; the report is not complete.)

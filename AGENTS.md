<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Architecture

## Auth
- **NextAuth v5 beta** (`next-auth@5.0.0-beta.32`, pinned exact) with Credentials (email + password) provider
- Session strategy: **JWT** (`strategy: "jwt"` in `src/lib/auth.ts`), NOT database sessions. Revocation
  exists anyway: `User.credentialVersion` is stamped into the token at sign-in and compared against the
  row on every session read, so a password reset, block or deletion request ends every live session
  (audits M4/M5/H4). This paragraph previously claimed database-backed sessions; the code was always JWT.
- There is **no admin bypass**. The old `POST /api/auth/admin-login` (minted an admin session from an
  email address alone) was deleted in the 2026-08-20 security work (audit C1-b) and is pinned deleted by
  `src/lib/security-regressions.test.mjs`. Local tooling signs in via `POST /api/dev-login`, which
  requires `DEV_LOGIN_SECRET`, never grants a role, and answers 404 on every production build.
- Protected routes: everything under `(main)/` layout requires auth. Public: `/`, `/login`, `/signup`,
  the auth/email/token flows, `/privacy`, `/terms`, `/guidelines`, and the exact list in `src/proxy.ts`.

## Database
- **Prisma ORM** with `@prisma/adapter-pg` (Postgres driver adapter)
- **Supabase Postgres**, region `ap-south-1` (Mumbai), for both production and local dev
- Runtime connects via the transaction pooler (`DATABASE_URL`, port 6543, `?pgbouncer=true`); the Prisma CLI uses the session pooler (`DIRECT_URL`, port 5432), set in `prisma.config.ts`
- Schema: `prisma/schema.prisma` — User, Post, Comment, Like, Group, Notification, Report, Poll models
- Commands: `npx prisma db push`, `npx prisma generate`, `npx prisma studio`
- Migrated off Turso/libSQL on 2026-07-01

## File Storage
- **Cloudflare R2** (S3-compatible, zero egress) for user-uploaded images (avatars, post images); bucket `rv-alumni-media`
- All image bytes flow through the `putImage`/`delImage` shim in `src/lib/storage.ts` (R2 in prod, local filesystem in dev)
- **Sharp** for WebP conversion before upload
- Remote image pattern: `*.r2.dev` (served from a `pub-*.r2.dev` URL; a custom domain can be added before launch)
- Migrated off Vercel Blob on 2026-07-01

## Key Patterns
- App Router with `(auth)` and `(main)` route groups
- Server Actions for mutations (not API routes, except auth endpoints)
- `cn()` utility for conditional Tailwind classes (`src/lib/utils.ts`)
- Toast notifications via Sonner
- Dark mode via `next-themes`
- Form validation with Zod

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Architecture

## Auth
- **NextAuth v5 beta** (`next-auth@5.0.0-beta.30`) with Resend magic link provider
- Session strategy: database-backed (Prisma adapter)
- Admin bypass: `POST /api/auth/admin-login` with `ADMIN_EMAIL` creates a DB session + cookie. Works locally, known bug on Vercel deployment.
- Protected routes: everything under `(main)/` layout requires auth. Public: `/`, `/login`, `/verify`.

## Database
- **Prisma ORM** with `@prisma/adapter-pg` (Postgres driver adapter)
- **Supabase Postgres**, region `ap-south-1` (Mumbai), for both production and local dev
- Runtime connects via the transaction pooler (`DATABASE_URL`, port 6543, `?pgbouncer=true`); the Prisma CLI uses the session pooler (`DIRECT_URL`, port 5432), set in `prisma.config.ts`
- Schema: `prisma/schema.prisma` — User, Post, Comment, Like, Group, Notification, Report, Poll models
- Commands: `npx prisma db push`, `npx prisma generate`, `npx prisma studio`
- Migrated off Turso/libSQL on 2026-07-01; runbook in `docs/STACK_MIGRATION.md`

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

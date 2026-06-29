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
- **Prisma ORM** with `@prisma/adapter-libsql`
- Local: SQLite (`dev.db`)
- Production: Turso (libSQL), hosted on Vercel
- Schema: `prisma/schema.prisma` — User, Post, Comment, Like, Group, Notification, Report, Poll models
- Commands: `npx prisma db push`, `npx prisma generate`, `npx prisma studio`

## File Storage
- **Vercel Blob** for user-uploaded images (avatars, post images)
- **Sharp** for WebP conversion before upload
- Remote image pattern: `*.public.blob.vercel-storage.com`

## Key Patterns
- App Router with `(auth)` and `(main)` route groups
- Server Actions for mutations (not API routes, except auth endpoints)
- `cn()` utility for conditional Tailwind classes (`src/lib/utils.ts`)
- Toast notifications via Sonner
- Dark mode via `next-themes`
- Form validation with Zod

# RV Alumni

A social platform for Rishi Valley School alumni to reconnect, share stories, and find each other.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** SQLite (local) / PostgreSQL (production) via Prisma ORM
- **Auth:** NextAuth.js v5 with magic link login (Resend)
- **Image Processing:** sharp (WebP conversion)
- **Icons:** Lucide React

## Local Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sanan-shankar/rv-alumni.git
   cd rv-alumni
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env .env.local
   ```
   Edit `.env.local` and fill in:
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate
   - `RESEND_API_KEY` — get from [resend.com](https://resend.com) (free tier)
   - `ADMIN_EMAIL` — your email (gets admin role on first login)

4. **Push the database schema:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/          Login, signup, verify, onboarding
    (main)/          Authenticated pages (feed, directory, profile, settings, admin, about)
    api/             Auth handler, image upload
  components/
    ui/              shadcn/ui components
    auth/            Trivia gate, signup form
    posts/           Post card, comments, create form
    directory/       Search, profile cards
    layout/          Navbar, dark mode toggle, notifications
    admin/           User & report management
    settings/        Profile edit form
    profile/         Admin profile tools
  lib/
    auth.ts          NextAuth v5 config
    prisma.ts        Prisma client singleton
    utils.ts         Helpers (formatTimeAgo, getInitials, etc.)
    validators.ts    Zod validation schemas
prisma/
  schema.prisma      Database schema
```

Additional docs are organized under `docs/`; start with `docs/README.md` for the map.

## Deploying to Vercel

The app runs on **Vercel** with a **Turso** (libSQL) database and **Vercel Blob**
for images; local dev stays on SQLite. See `docs/operations/DEPLOY.md` for the
full walkthrough.

1. Connect the GitHub repo to a Vercel project (production branch: `main`)
2. Provision a Turso database and set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`
3. Set the remaining env vars in the Vercel dashboard: `NEXTAUTH_SECRET`,
   `NEXTAUTH_URL`, `ADMIN_EMAIL`, `NEXT_PUBLIC_ADMIN_EMAIL`, `BLOB_READ_WRITE_TOKEN`
   (and `RESEND_API_KEY` once email ships)
4. `postinstall` runs `prisma generate`; Vercel builds with `next build` automatically
5. Apply the schema to Turso with `npx prisma db push` (pointed at the Turso URL)

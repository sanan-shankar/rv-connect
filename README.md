# RV Connect

A social platform for Rishi Valley School alumni to reconnect, share stories, and find each other.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase Postgres (`ap-south-1`, Mumbai) via Prisma ORM, for both production and local dev
- **Auth:** NextAuth.js v5 with email + password (bcrypt); admin bypass via `ADMIN_EMAIL`
- **File Storage:** Cloudflare R2 (S3-compatible, zero egress) for user-uploaded images
- **Image Processing:** sharp (WebP conversion) before upload
- **Icons:** Lucide React (UI chrome), Phosphor duotone (decorative/hero)

## Local Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sanan-shankar/rv-connect.git
   cd rv-connect
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables.** Create a `.env` in the repo root. That is
   the only env file this project uses: both Next.js and the Prisma CLI read it,
   and it is gitignored, so it never leaves your machine.

   Required:
   - `DATABASE_URL` / `DIRECT_URL` — your Supabase Postgres connection strings
     (pooled port `6543` for `DATABASE_URL`, direct port `5432` for `DIRECT_URL`)
   - `NEXTAUTH_SECRET` — run `openssl rand -base64 32` to generate
   - `NEXTAUTH_URL` — `http://localhost:3000` locally
   - `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` — your email (gets admin role on
     first login; also enables the password-less admin bypass at
     `/api/auth/admin-login`)

   Optional, each degrading cleanly when absent:
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
     `R2_PUBLIC_BASE_URL` — Cloudflare R2 credentials. Omit locally to fall back
     to the filesystem storage driver under `public/uploads/`.
   - `RESEND_API_KEY` — transactional email.
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — the
     Support page's payment flow.
   - `CRON_SECRET` — authenticates the scheduled jobs declared in `vercel.json`.

   The public demo build is a separate deployment with its own database and its
   own two variables, `DEMO_MODE` and `AUTH_SECRET`. Neither belongs in a normal
   local `.env`; see `docs/spec/demo.md` for that setup.

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
    layout/          Sidebar, app shell, notifications
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

The app runs on **Vercel**, with the database on **Supabase Postgres** (`ap-south-1`,
Mumbai — the same database for production and local dev) and user images on
**Cloudflare R2**.

1. Connect the GitHub repo to a Vercel project (production branch: `main`)
2. Set the env vars in the Vercel dashboard: `DATABASE_URL` (pooled, port `6543`),
   `DIRECT_URL` (direct, port `5432`) from Supabase; `R2_ACCOUNT_ID`,
   `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`
   from Cloudflare; `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`,
   `NEXT_PUBLIC_ADMIN_EMAIL`
3. `postinstall` runs `prisma generate`; Vercel builds with `next build` automatically
4. Apply the schema to Supabase with `npx prisma db push` (the Prisma CLI uses
   `DIRECT_URL`, configured in `prisma.config.ts`)

## After deploying

Seed founding content so the app does not look empty: write a first Letter, add
40-60 photos to the Valley Collection (auto-approved as admin), and set your city
so the world map has a pin.

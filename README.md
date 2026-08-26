# RV Connect

The repository name; the site calls itself **Rishi Valley** everywhere a member can see.

A social platform for Rishi Valley School alumni to reconnect, share stories, and find each other.

## Tech Stack

- **Framework:** Next.js 16 (App Router, TypeScript)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Database:** Supabase Postgres (`ap-south-1`, Mumbai) via Prisma ORM, for both production and local dev
- **Auth:** NextAuth.js v5 with email + password (bcrypt), JWT sessions revocable through
  `User.credentialVersion`. There is no admin bypass: `ADMIN_EMAIL` only grants the admin
  role on that address's first login.
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
   - `NEXTAUTH_URL` — `http://localhost:3000` locally. Read by NextAuth itself, not by
     any app code; emailed links are built from `APP_URL` (or the canonical origin) instead, on
     purpose — see the reasoning in `src/lib/email.ts`.
   - `ADMIN_EMAIL` — your email. That address is given the admin role on its first login.
     Do **not** set `NEXT_PUBLIC_ADMIN_EMAIL`: a `NEXT_PUBLIC_` variable is compiled into
     the browser bundle, which is closed security finding C1-c, and `npm run check`'s
     audit probe reopens it if the variable comes back.
   - `DEV_LOGIN_SECRET` — 32+ characters, `openssl rand -base64 32`. Every QA script signs
     in through `/api/dev-login` with it. Never set it on Vercel; the route 404s on a
     production build regardless.

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

4. **Generate the Prisma client:**
   ```bash
   npx prisma generate
   ```

   **Never run `prisma db push`.** One Supabase database serves production *and* local
   dev, and `prisma.config.ts` points the CLI at it; `db push` diffs the schema and will
   offer to DROP tables it considers orphaned. Schema changes go: edit
   `prisma/schema.prisma` → write a dated, idempotent file in `prisma/migrations-manual/`
   → `npx prisma generate` → apply it with `node scripts/dev/run-sql.mjs <file>`. A fresh
   database is built by applying that folder in filename order.

5. **Run the dev server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/          Login, signup, password reset, email verification
    (main)/          Everything behind auth: feed, directory, collection, letters,
                     catchups, messages, profile, support, admin, about
    (policies)/      Privacy, terms, guidelines — public
    lab/             Dev and preview rooms; every one listed in lab/_registry.ts
    api/             Auth handlers, uploads, Razorpay and Resend webhooks,
                     dev-login, scheduled retention jobs
  components/        By area: feed, directory, collection, letters, catchups,
                     profile, admin, settings, layout, mascot, tour, ui, common
  lib/
    auth.ts          NextAuth v5 config
    prisma.ts        Prisma client singleton (rebuilds itself when the schema moves)
    utils.ts         cn() and shared helpers
    storage.ts       R2 in production, local filesystem in dev
  proxy.ts           Canonical-domain redirect, public-path allowlist, demo guards
prisma/
  schema.prisma      Database schema
  migrations-manual/ Dated idempotent SQL, applied by scripts/dev/run-sql.mjs
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
   from Cloudflare; `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_EMAIL`, `CRON_SECRET`
3. `postinstall` runs `prisma generate`; Vercel builds with `next build` automatically
4. Schema changes reach Supabase through `prisma/migrations-manual/`, applied with
   `node scripts/dev/run-sql.mjs` — never `prisma db push` (see step 4 above). Deploys
   themselves are git-only: both Vercel projects build from a push to `main`.

## After deploying

Seed founding content so the app does not look empty: write a first Letter, add
40-60 photos to the Valley Collection (auto-approved as admin), and set your city
so the world map has a pin.

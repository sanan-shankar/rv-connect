# Deploying RV Alumni to Render

The app is built to run on **Render** with a **Render Postgres** database, while
local development stays on **SQLite**. Everything in the repo is ready; the steps
below need *your* accounts (Render + GitHub) and a few secrets.

Local dev is unaffected by any of this: with a `file:` `DATABASE_URL` the app uses
the SQLite/libSQL adapter exactly as before.

## How the SQLite-local / Postgres-prod split works

- `src/lib/prisma.ts` picks the adapter at runtime: a `postgres://` `DATABASE_URL`
  uses the Postgres adapter; anything else (a `file:` URL or Turso) uses libSQL.
- Prisma does not allow `provider` to be an env var, so `scripts/prepare-prisma.mjs`
  rewrites `provider = "sqlite"` to `postgresql` **only during the Render build**
  (when `DATABASE_URL` is Postgres). Your committed schema stays `sqlite`.
- The schema uses no SQLite-only types, so the swap is clean.

## One-time setup

1. **Push the repo to GitHub** (a private repo is fine). This redesign branch
   should be merged to `main` (or point Render at the branch).
2. **Vercel Blob token** (photo/avatar storage, reachable from Render): create a
   Blob store at vercel.com/dashboard > Storage and copy its
   `BLOB_READ_WRITE_TOKEN`. Without it, uploads only work locally.

## Deploy with the Blueprint (recommended)

1. Render dashboard > **New > Blueprint**, connect GitHub, pick this repo. Render
   reads `render.yaml` and proposes a web service + a Postgres database.
2. Click **Apply**. Render provisions Postgres and wires `DATABASE_URL` and a
   generated `NEXTAUTH_SECRET` automatically.
3. In the web service **Environment**, fill the `sync:false` values:
   - `NEXTAUTH_URL` = your Render URL, e.g. `https://rv-alumni.onrender.com`
   - `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL` = your owner email
   - `BLOB_READ_WRITE_TOKEN` = the token from setup
   - `RESEND_API_KEY` = leave blank until the Catch-ups newsletter ships
4. The build runs: `prepare-prisma` -> `prisma generate` -> `prisma db push` ->
   `next build`. `db push` creates all tables on the fresh Postgres database.
5. Open the site, sign in with `ADMIN_EMAIL` (the password-less admin bypass), and
   you are the first verified member.

## After the first deploy

- **Seed the founding content** so the app does not look empty: write a first
  Letter, add 40-60 photos to the Valley Collection (you auto-approve as admin),
  and set your city so the world map has a pin.
- **Replace the placeholders**: the UPI ID + QR on `/support`, and the peaks logo
  (still the placeholder ridgeline; trace it from `bodi-middle-rishi.png`).

## Notes, limits, follow-ups

- Free tier: the web service cold-starts after inactivity and the free Postgres
  expires after ~90 days. Upgrade both to `starter` before sharing widely.
- Schema changes after launch: this project uses `prisma db push` (no migration
  history). For safer production changes later, switch to `prisma migrate`.
- Not yet wired (need this deploy first): the **Catch-ups** newsletter needs a
  **Render Cron Job** hitting an authenticated tick endpoint plus **Resend**
  emails; **Events** needs its model + page. Both are designed in `docs/spec/`.
- The Postgres path has not been run against a live database yet (no Postgres in
  local dev). Watch the first Render build log; if `db push` reports a type it
  cannot map, it will name the field. Everything in the schema is plain
  String/Int/Boolean/DateTime, so this is not expected.

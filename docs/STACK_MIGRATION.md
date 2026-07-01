# Stack migration: Vercel Blob → Cloudflare R2, Turso → Supabase

Goal: photos on Cloudflare R2 (zero egress), database on Supabase Postgres in the
**Mumbai** region. Keep Vercel (hosting) and NextAuth (login) unchanged.

## Golden safety rule

Do it in this order, and **never delete the old thing until the new thing is proven working**:

1. **Cloudflare R2** (photos) — set up and verify.
2. **Supabase** (database) — set up, verify, deploy.
3. **Turso + Vercel Blob teardown** — only after 1 and 2 are confirmed live.

If anything goes wrong, the old stack is still there to fall back to until the very last step.

## Logins (do this first, once)

Use **one email your organisation controls** (the violetresearch.org address), the same email
everywhere, so nothing is tied to a personal account you might lose.

- **Vercel** and **Supabase**: log in with **GitHub** (the account that owns the repo). This makes
  deploys and database setup smoother.
- **Cloudflare**: email + password (GitHub login not offered).
- Turn on **2-factor authentication** on all three. These now hold your production infrastructure.
- Save every secret in a password manager: R2 keys, the Supabase database password, and the two
  connection strings. You will not be able to see some of them again after creation.

---

## Phase 1 — Cloudflare R2 (photos)

### 1A. 👤 You: create the account, bucket, and keys

1. Go to https://dash.cloudflare.com and sign up (verify the email).
2. Left sidebar → **R2 Object Storage**. The first time, Cloudflare asks you to **add a payment
   card** even for the free tier. This is normal; you stay at **$0** until you exceed 10 GB stored.
3. Click **Create bucket**.
   - Name: `rv-alumni-media`
   - Location: choose **Asia-Pacific (APAC)** as the location hint (keeps the master copy near
     Mumbai; it is still cached worldwide).
   - Create.
4. Make objects publicly readable: open the bucket → **Settings** → **Public access**.
   - Enable the **r2.dev subdomain** (the quick option). It gives a URL like
     `https://pub-abc123.r2.dev`. (A custom domain like `media.yourdomain.com` is nicer for
     production; we can add that later.)
5. Create API keys: R2 home → **Manage R2 API Tokens** → **Create API Token**.
   - Permission: **Object Read & Write**
   - Scope: **this bucket only** (`rv-alumni-media`)
   - Create. Copy the **Access Key ID** and **Secret Access Key** now (the secret is shown once).
6. Find your **Account ID**: shown on the R2 overview page (and inside the endpoint URL
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).

**Bring these 5 values back:**

| Value | Example |
|---|---|
| Account ID | `a1b2c3d4...` |
| Access Key ID | `f00ba7...` |
| Secret Access Key | `wJalr...` (secret) |
| Bucket name | `rv-alumni-media` |
| Public base URL | `https://pub-abc123.r2.dev` |

### 1B. 🤖 Me: code (DONE)

Already finished, dev still works via the local-filesystem fallback:
- `src/lib/storage.ts` rewritten to talk to R2 (S3-compatible).
- `src/app/api/upload/route.ts` and `src/app/(main)/feed/actions.ts` now go through the shim.
- `next.config.ts` allows `*.r2.dev` images.
- Added dependency `@aws-sdk/client-s3`.

### 1C. 👤+🤖: set the env vars

Local `.env` and Vercel both need:

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=rv-alumni-media
R2_PUBLIC_BASE_URL=https://pub-abc123.r2.dev
```

I can push these to Vercel for you via the CLI once you have run `vercel login` (see CLI note below),
or you add them in Vercel → Project → Settings → Environment Variables.

### 1D. ✅ Verify

- Locally: add the vars to `.env`, run `npm run dev`, upload a photo, confirm the URL is a
  `r2.dev` link and the image displays.
- Then deploy and repeat in production.

### 1E. Blob teardown (after R2 verified)

- Remove `@vercel/blob` dependency and the `BLOB_READ_WRITE_TOKEN` env var.
- Delete the Blob store in Vercel → Storage (no production images to lose, this is pre-launch).
- Remove the legacy `*.public.blob.vercel-storage.com` pattern from `next.config.ts`.

---

## Phase 2 — Supabase (database)

### 2A. 👤 You: create the project

1. https://supabase.com → **Start your project** → log in with GitHub.
2. **New project**:
   - Name: `rv-alumni`
   - Database password: generate a strong one and **save it**.
   - Region: **South Asia (Mumbai)** / `ap-south-1`
   - Plan: **Free**
   - Create, wait ~2 minutes.
3. Get the connection strings: top **Connect** button → **ORMs / Prisma**. Copy the two strings and
   replace `[YOUR-PASSWORD]` with the password from step 2:
   - **Pooled** (transaction, port `6543`) → this is `DATABASE_URL`
   - **Direct** (port `5432`) → this is `DIRECT_URL`

**Bring back:** `DATABASE_URL` (pooled) and `DIRECT_URL` (direct). Both contain the password, treat as secrets.

### 2B. 🤖 Me: code

- `prisma/schema.prisma`: datasource `provider = "postgresql"`, add `directUrl`.
- `prisma.config.ts`: point the migration engine at `DIRECT_URL`.
- `src/lib/prisma.ts`: use the Postgres adapter only; drop the libSQL/Turso branch.
- Remove dependencies `@prisma/adapter-libsql` and `@libsql/client`.

### 2C. 👤+🤖: env vars + apply schema + seed

- Set `DATABASE_URL` and `DIRECT_URL` locally and on Vercel.
- Apply schema: `npx prisma db push` (creates all tables on Supabase).
- Regenerate client: `npx prisma generate`.
- Seed: `node prisma/seed-demo.mjs` then `node prisma/seed-collection.mjs`.
- Decide local-dev database: simplest is to point local `.env` at the same Supabase project for now
  (optionally a local Postgres later).

### 2D. ✅ Verify, then deploy

- Run locally against Supabase, confirm login/feed/collection work.
- Deploy to Vercel, confirm in production.

---

## Phase 3 — Turso teardown (LAST, after Supabase verified in production)

1. Turso dashboard (https://turso.tech) → database `rv-alumni` → **Destroy / Delete**.
2. Vercel → Project → **Integrations**: remove any Turso integration.
3. Vercel → env vars: delete `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
4. Local `.env`: remove the `TURSO_*` lines.
5. (Code-side Turso removal already done in Phase 2.)
6. Optional: delete the Turso account if nothing else uses it.

---

## Vercel CLI

Installed globally (`vercel` 54.x). To let me manage env vars and deploys for you, run this once in
your terminal (it opens a browser):

```
vercel login
vercel link
```

After that I can run `vercel env add/ls`, `vercel env pull`, and `vercel --prod` on your behalf.

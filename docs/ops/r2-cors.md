# R2 bucket CORS, for direct photo uploads

**Status:** waiting on the owner. Until this is applied, uploads silently fall back to the
old server-proxied path, which works fine locally but is capped at roughly 4.5MB on Vercel.

## Why this is needed

Vercel caps a serverless request body at about 4.5MB no matter what the config says. That is
why photos used to be shrunk in the browser before upload, which defeats the point of a 20MB
limit and of a high-resolution Valley Collection.

The fix is a presigned upload: the browser asks the server for a one-time signed URL
(`/api/upload/presign`), then PUTs the file **straight to R2**, so the bytes never pass
through a Vercel function and the cap never applies. A browser will only make that
cross-origin PUT if the bucket says it is allowed. That permission is the bucket's CORS rule,
and it has to be set once per bucket.

An attempt to set it from `scripts/setup-r2-cors.mjs` failed with `AccessDenied`: the R2 API
token in `.env.local` is scoped to **Object** Read & Write, which cannot change bucket-level
configuration. Either use the dashboard (option A, no new token) or mint an admin-scoped
token (option B).

## Option A: the Cloudflare dashboard (simplest)

1. Go to <https://dash.cloudflare.com> and open **R2** in the left sidebar.
2. Click the bucket **`rv-alumni-media`**.
3. Open the **Settings** tab.
4. Find **CORS Policy** and click **Edit** (or **Add CORS policy**).
5. Paste exactly this, replacing the second origin with the real production domain (and add
   the `*.vercel.app` preview domain as a third entry if previews should upload too):

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://YOUR-PRODUCTION-DOMAIN"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "MaxAgeSeconds": 3600
  }
]
```

6. Save.

`AllowedOrigins` must be the site's own origin, scheme included, with no trailing slash. It
is not the R2 public URL.

## Option B: an admin token plus the script

1. Cloudflare dashboard, **R2** > **API** > **Manage API Tokens** > **Create API Token**.
2. Permission: **Admin Read & Write**. This is the whole point; the app's existing token is
   Object Read & Write, which is why it was refused.
3. Scope it to the `rv-alumni-media` bucket, create it, and copy the Access Key ID and Secret
   Access Key.
4. Run the script with those credentials in the environment, passing the production origin:

```bash
R2_ACCESS_KEY_ID=<admin key id> \
R2_SECRET_ACCESS_KEY=<admin secret> \
node scripts/setup-r2-cors.mjs https://YOUR-PRODUCTION-DOMAIN
```

The script always includes `http://localhost:3000` and whatever `NEXTAUTH_URL` is set to, then
adds every origin passed as an argument. It prints the resulting policy back, read from the
bucket, so the output is proof rather than a claim.

5. Do **not** leave the admin credentials in `.env.local`. The running app only ever needs the
   original object-scoped token.

## Checking it worked

Upload a photo larger than 5MB to the Valley Collection from the deployed site. If the CORS
rule is live, the browser's network panel shows a `PUT` straight to
`*.r2.cloudflarestorage.com` returning 200, and the stored photo keeps its full resolution.
If the rule is missing, that PUT fails on CORS, the client quietly falls back to the proxied
route, and on Vercel anything over about 4.5MB is rejected.

Re-run this whenever the site's domain changes: a CORS rule only covers the origins it names.

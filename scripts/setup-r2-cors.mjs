/**
 * One-time R2 bucket CORS setup for direct presigned browser uploads.
 *
 * The presigned-PUT upload path (browser -> R2, dodging Vercel's ~4.5MB
 * request cap) needs the bucket to accept cross-origin PUTs from the site.
 * Run once per bucket, and again if the site's domain changes:
 *
 *   node scripts/setup-r2-cors.mjs                  # localhost + NEXTAUTH_URL
 *   node scripts/setup-r2-cors.mjs https://rv.example.org   # extra origins
 *
 * Reads the same R2_* env vars as src/lib/storage.ts from .env.local.
 */
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(repoRoot, ".env.local") });

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  console.error("Missing R2_* env vars in .env.local; nothing to configure.");
  process.exit(1);
}

const origins = [
  "http://localhost:3000",
  ...(process.env.NEXTAUTH_URL ? [new URL(process.env.NEXTAUTH_URL).origin] : []),
  ...process.argv.slice(2),
];
const unique = [...new Set(origins)];

const client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: R2_BUCKET,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: unique,
          AllowedMethods: ["PUT"],
          AllowedHeaders: ["Content-Type", "Cache-Control"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

const check = await client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET }));
console.log(`CORS set on ${R2_BUCKET} for:`);
for (const rule of check.CORSRules ?? []) {
  console.log("  origins:", rule.AllowedOrigins?.join(", "));
  console.log("  methods:", rule.AllowedMethods?.join(", "));
}

// Flip the Prisma datasource provider to postgresql when deploying against a
// Postgres DATABASE_URL (Render). Local dev keeps `provider = "sqlite"`.
// Prisma does not allow env() for `provider`, so we rewrite it at build time.
// This runs on the deploy host's ephemeral checkout; it is not committed.
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
const schemaPath = "prisma/schema.prisma";

if (url.startsWith("postgres")) {
  let schema = readFileSync(schemaPath, "utf8");
  if (schema.includes('provider = "sqlite"')) {
    schema = schema.replace('provider = "sqlite"', 'provider = "postgresql"');
    writeFileSync(schemaPath, schema);
    console.log("[prepare-prisma] datasource provider set to postgresql for this build");
  } else {
    console.log("[prepare-prisma] provider already non-sqlite; leaving as is");
  }
} else {
  console.log("[prepare-prisma] DATABASE_URL is not postgres; keeping sqlite (local/dev)");
}

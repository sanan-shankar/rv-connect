import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/* There is exactly ONE env file in this project: `.env`. It holds every local
   secret, and both Next.js and this CLI read it.

   It used to be two. Prisma's generated config reads `.env` and only `.env`,
   while Next.js prefers `.env.local`, so the database URLs had to be written
   into both files byte for byte. Two env files that must agree is a silent way
   to break a project: edit one, and the app and the CLI point at different
   databases without saying so. `.env.local` was folded into `.env` on
   2026-08-08 (owner: "why the longer name for no reason").

   The path is passed explicitly rather than relying on dotenv's default, so
   the one file this project uses is named in the code that depends on it. */
loadEnv({ path: ".env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  /* No `migrations` block on purpose. It used to name `prisma/migrations`, a
     directory that does not exist and never will: one Supabase database serves
     production and local dev, so `prisma migrate` and `db push` are both
     banned here (CLAUDE.md), and a schema change is a dated SQL file in
     `prisma/migrations-manual/` applied with `scripts/dev/run-sql.mjs`.
     Config naming a migrate workflow reads as an invitation to use it. */
  datasource: {
    // The CLI (db push / migrate) must use a direct/session connection, not the
    // transaction pooler. The app runtime uses DATABASE_URL via the adapter.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});

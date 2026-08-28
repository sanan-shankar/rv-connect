import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { IS_DEMO, DemoWriteError, demoWriteAllowed } from "./demo";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Production and local dev both run on Postgres (Supabase in production).
  // At runtime we connect through the transaction pooler in DATABASE_URL.
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Bounded and impatient, deliberately. The bare `new PrismaPg({ connectionString })`
  // this replaced took every pg default, and two of them are dangerous on
  // serverless: `max` 10 connections PER INSTANCE, and no checkout timeout at
  // all -- a checkout with no free connection waits forever (pg-pool
  // index.js:205). The `(main)` layout awaits its data ABOVE every
  // loading.tsx, so "forever" reaches the member as a blank page or a
  // platform 504, never the app's error screen, and each hung request keeps
  // its Vercel concurrency slot, so a spike compounds instead of shedding.
  //
  //   max 5              -- Supavisor's client cap is 200; 5 x ~40 concurrent
  //                         instances stays under it, and 5 covers the widest
  //                         fan-out in the app (the directory page's 7-leg
  //                         Promise.all) in two waves rather than three.
  //   connectionTimeout  -- 5s. Under load a few requests get a fast, honest
  //                         error instead of the whole site hanging.
  //   query_timeout      -- 20s, client-side. Nothing here should take a
  //                         fifth of that; it exists so one stuck query
  //                         cannot pin a request open.
  //
  // `statement_timeout` is deliberately absent. pg ships it as a startup
  // parameter (pg/lib/client.js:549) and Supavisor silently drops it: probed
  // live on 2026-08-21 against both :6543 and :5432, `SHOW statement_timeout`
  // came back as Supabase's own 2min and a `pg_sleep(3)` under
  // statement_timeout=1000 ran to completion. Setting it would be config that
  // reads like a guard and is not one. Postgres-side runaway queries are
  // bounded by that 2min platform default; `query_timeout` is what actually
  // frees the request.
  const adapter = new PrismaPg(
    {
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5_000,
      query_timeout: 20_000,
    },
    {
      // The adapter attaches its own listener so a pool error can never crash
      // the process, but it only forwards to a debug channel nobody reads.
      // Connection-level trouble is exactly the thing we want to see in the
      // logs when the site is misbehaving.
      onPoolError: (err) => {
        console.error("[prisma] pool error:", err.message);
      },
    }
  );
  const client = new PrismaClient({ adapter });

  // On the demo deployment ONLY, every query passes a default-deny check
  // before it reaches Postgres (src/lib/demo.ts). This is the backstop
  // under the per-action guards: an unguarded action, a nested write, a
  // route someone forgot about — none of them can write a model the demo
  // policy does not list. In every other build `IS_DEMO` is false and this
  // branch is never constructed, so the real client stays a plain client
  // with no per-query wrapper in its path.
  if (!IS_DEMO) return client;

  return client.$extends({
    query: {
      // `$allOperations` at the TOP level of `query`, deliberately NOT nested
      // under `$allModels`. The nested form only sees model operations, so
      // raw SQL sails straight past it: with it nested, a live
      // `$executeRawUnsafe('UPDATE "User" SET name = ...')` renamed every row
      // in the database while every unit test still passed, because the unit
      // tests exercise the policy function and nothing was calling it.
      // Caught by scripts/demo/verify-guard.mts. `model` arrives undefined
      // for raw calls, which is precisely what demoWriteAllowed keys off.
      async $allOperations({ model, operation, args, query }) {
        if (!demoWriteAllowed(model, operation, args)) {
          throw new DemoWriteError();
        }
        return query(args);
      },
    },
  }) as unknown as PrismaClient;
}

// The dev singleton is keyed on the set of models the generated client
// exposes, so regenerating after a schema change rebuilds it instead of
// keeping a stale in-memory client that lacks the new models. In production
// this is a no-op (one client, one process).
//
// The key used to be a hand-written string that had to be bumped in the same
// commit as any schema change. That is a rule which works right up until
// somebody forgets, and on 2026-08-19 three schema changes in a row forgot it
// (MetricSnapshot, Visit, SearchLog). Each time the symptom was
// `Cannot read properties of undefined (reading 'findMany')` from code that
// typechecks perfectly, because `tsc` reads the freshly generated types off
// disk while the running server holds the old object.
//
// Derived automatically now. These are plain runtime objects, and hot reload
// re-imports them fresh even while the cached CLIENT stays stale -- so
// comparing the two is exactly the "has the schema changed underneath me"
// question, answered without anyone remembering anything.
//
// FIELDS, not just models (2026-08-20). The first version of this hashed
// `Prisma.ModelName` alone, which is the set of model NAMES -- so it saw a new
// model and was blind to a new COLUMN on an existing one. Adding
// User.feedSeenAt reproduced the original bug exactly: `prisma generate`
// succeeded, tsc read the fresh types off disk and passed, and the running
// server threw PrismaClientValidationError on a select of a field its cached
// client had never heard of. `*ScalarFieldEnum` is generated per model as a
// runtime object of its column names, so folding those in makes the key move
// on any schema change at all. Both halves are kept: if a future client stops
// emitting the enums, the filter yields nothing and this degrades to exactly
// the model-name behaviour it replaced, rather than to a constant.
/* The third thing that can change, and the one neither half below can see: a
 * field's own ATTRIBUTES. `takenKey` went from `@default(0)` to
 * `@default(dbgenerated())` on 2026-08-28 -- same models, same column names,
 * so the key did not move and the running server kept a client that wrote the
 * column into every INSERT, which Postgres refuses for a generated column.
 * Every contribution to the Collection failed, from code that typechecked.
 *
 * The generated client exposes no `dmmf` at runtime, so there is no object to
 * fold in. The schema FILE is the only thing that reflects an attribute, so in
 * development this reads it. Never in production: there is no hot reload there,
 * the file may not even be deployed, and a data layer that can fail to start
 * because of a missing file is a worse bug than the one this prevents. Any
 * error at all yields "", which degrades to exactly the behaviour above.
 */
function schemaFingerprint(): string {
  if (process.env.NODE_ENV === "production") return "";
  try {
    return createHash("sha1")
      .update(readFileSync(`${process.cwd()}/prisma/schema.prisma`))
      .digest("hex");
  } catch {
    return "";
  }
}

const globalForPrismaKey = globalThis as unknown as { prismaKey: string | undefined };
const clientKey = [
  schemaFingerprint(),
  Object.keys(Prisma.ModelName).sort().join(","),
  Object.entries(Prisma as unknown as Record<string, unknown>)
    .filter(
      ([name, value]) =>
        name.endsWith("ScalarFieldEnum") && typeof value === "object" && value !== null
    )
    .map(([name, value]) => `${name}(${Object.keys(value as object).sort().join("|")})`)
    .sort()
    .join(","),
].join("::");

if (globalForPrisma.prisma && globalForPrismaKey.prismaKey !== clientKey) {
  // Let the old client's pool go rather than leaking a connection per reload.
  void globalForPrisma.prisma.$disconnect().catch(() => {});
  globalForPrisma.prisma = undefined;
  if (process.env.NODE_ENV !== "production") {
    console.info("[prisma] schema changed; rebuilding the dev client");
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrismaKey.prismaKey = clientKey;
}

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
  const adapter = new PrismaPg({ connectionString });
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
const globalForPrismaKey = globalThis as unknown as { prismaKey: string | undefined };
const clientKey = [
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

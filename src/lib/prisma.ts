import { PrismaClient } from "@/generated/prisma/client";
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

// The dev singleton is keyed on the set of model delegates the generated
// client exposes, so regenerating the client after a schema change (e.g.
// adding AdminThread) rebuilds it instead of keeping a stale in-memory client
// that lacks the new models. In production this is a no-op (one client, one
// process) and behaves exactly as a plain `new PrismaClient()` would.
const globalForPrismaKey = globalThis as unknown as { prismaKey: string | undefined };
// Bump this in the SAME commit as any schema change. It is not decorative: a
// running dev server keeps the old client on `globalThis`, so without a bump
// `prisma.authToken` is simply undefined and every read through it 500s while
// `tsc` stays perfectly happy (the generated types are new, the in-memory
// client is not). Cost 15 minutes on 2026-08-11 adding AuthToken/OutboundEmail.
const clientKey = "authToken-outboundEmail-v1";

if (globalForPrisma.prisma && globalForPrismaKey.prismaKey !== clientKey) {
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrismaKey.prismaKey = clientKey;
}

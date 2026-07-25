import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
  return new PrismaClient({ adapter });
}

// The dev singleton is keyed on the set of model delegates the generated
// client exposes, so regenerating the client after a schema change (e.g.
// adding AdminThread) rebuilds it instead of keeping a stale in-memory client
// that lacks the new models. In production this is a no-op (one client, one
// process) and behaves exactly as a plain `new PrismaClient()` would.
const globalForPrismaKey = globalThis as unknown as { prismaKey: string | undefined };
const clientKey = "adminThreads-v1";

if (globalForPrisma.prisma && globalForPrismaKey.prismaKey !== clientKey) {
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrismaKey.prismaKey = clientKey;
}

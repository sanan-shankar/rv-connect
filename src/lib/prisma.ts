import { PrismaClient } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Production runs on Vercel with Turso (libSQL). The Postgres branch is an
  // optional fallback that only activates if DATABASE_URL is a postgres://
  // connection string; local dev and Turso both use the libSQL adapter.
  const dbUrl = process.env.DATABASE_URL ?? "";
  if (dbUrl.startsWith("postgres")) {
    const adapter = new PrismaPg({ connectionString: dbUrl });
    return new PrismaClient({ adapter });
  }

  const url = process.env.TURSO_DATABASE_URL ?? "file:dev.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

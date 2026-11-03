import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The daily budgets, run for real against a fake database (bug audit
 *  3, O-09 and its instances).
 *
 *  budget-coverage.test.mjs proves every door SPENDS a budget; this
 *  proves the budget holds. The modules run as they are, with the four
 *  things bare node cannot give them pointed at stand-ins: the database
 *  (a fake that keeps the rows it is handed), Upstash (absent), Sentry
 *  (a list), and the production-only telemetry switch (on).
 * ------------------------------------------------------------------ */

const fake = { rows: [], reported: [] };
globalThis.__budgetTest = fake;

const STUBS = {
  "@/lib/prisma": "export const prisma = globalThis.__budgetTest.prisma;",
  "@/lib/rate-limit": "export const upstashRedis = () => null; export const reportLimiterFailure = () => {};",
  "@/lib/report-error":
    "export const reportSwallowed = (scope, err, ctx) => globalThis.__budgetTest.reported.push({ scope, ctx });",
  "@/lib/stats-exclusion": "export const statsWritesEnabled = () => true;",
};

registerHooks({
  resolve(specifier, context, next) {
    if (STUBS[specifier]) {
      return { url: `data:text/javascript,${encodeURIComponent(STUBS[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return next(pathToFileURL(resolve(ROOT, "src", `${specifier.slice(2)}.ts`)).href, context);
    }
    return next(specifier, context);
  },
});

/** Only what the code under test asks of each table. */
fake.prisma = {
  searchLog: {
    findFirst: async ({ where }) =>
      fake.rows
        .filter((r) => r.userId === where.userId && r.scope === where.scope && r.createdAt >= where.createdAt.gte)
        .sort((a, b) => b.createdAt - a.createdAt || b.seq - a.seq)[0] ?? null,
    update: async ({ where, data }) => Object.assign(fake.rows.find((r) => r.id === where.id), data),
    create: async ({ data }) => {
      // `seq` breaks a tie the clock cannot: a loop writes many rows a millisecond.
      const row = { id: `s${fake.rows.length}`, seq: fake.rows.length, createdAt: new Date(), ...data };
      fake.rows.push(row);
      return row;
    },
    count: async ({ where }) =>
      fake.rows.filter((r) => r.userId === where.userId && (!where.createdAt || r.createdAt >= where.createdAt.gte))
        .length,
  },
};

const { logSearch } = await import("./search-log.ts");

test("C6-04: alternating two words writes at most 200 search rows a day for one member", async () => {
  fake.rows.length = 0;
  fake.reported.length = 0;
  for (let i = 0; i < 260; i++) {
    await logSearch({ scope: "places", query: i % 2 ? "bb" : "aa", userId: "u-flood", results: 0 });
  }
  const mine = fake.rows.filter((r) => r.userId === "u-flood");
  assert.equal(mine.length, 200, `${mine.length} rows written for one member in a day`);

  // The owner hears of the account once, not once a refusal.
  const heard = fake.reported.filter((r) => r.ctx?.budget === "searchRows");
  assert.equal(heard.length, 1, `${heard.length} reports for one account's refusals`);
  assert.equal(heard[0].ctx.subject, "u-flood");
});

test("C6-04: a different member's searches are their own day", async () => {
  await logSearch({ scope: "places", query: "Madanapalle", userId: "u-other", results: 3 });
  assert.equal(fake.rows.filter((r) => r.userId === "u-other").length, 1);
});

test("C6-04: rows older than a day stop counting", async () => {
  fake.rows.length = 0;
  for (let i = 0; i < 200; i++) {
    fake.rows.push({ id: `old${i}`, userId: "u-yesterday", scope: "places", query: `q${i}`, createdAt: new Date(Date.now() - 25 * 3_600_000) });
  }
  await logSearch({ scope: "places", query: "Chittoor", userId: "u-yesterday", results: 1 });
  assert.equal(fake.rows.filter((r) => r.userId === "u-yesterday").length, 201, "yesterday's 200 refused today's first");
});

test("C6-04: one person typing is still one row, and does not spend the day", async () => {
  fake.rows.length = 0;
  for (const q of ["Be", "Ben", "Beng", "Benga", "Bengal", "Bengalu", "Bengaluru"]) {
    await logSearch({ scope: "places", query: q, userId: "u-typist", results: 1 });
  }
  const mine = fake.rows.filter((r) => r.userId === "u-typist");
  assert.equal(mine.length, 1);
  assert.equal(mine[0].query, "Bengaluru");
});

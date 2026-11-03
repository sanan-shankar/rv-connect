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

const fake = { rows: [], reported: [], posts: [] };
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
  post: {
    count: async ({ where }) =>
      fake.posts.filter((p) => p.authorId === where.authorId && p.kind === where.kind && p.status === where.status).length,
  },
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
const { spendBudget, budgetLeft } = await import("./daily-budget.ts");

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

test("T2b-02: with Upstash out of reach, no link is fetched for anyone", async () => {
  /* previewFetches is closed on an outage: a preview is decoration, and an
     open budget there would be a free fetcher for whoever emptied Upstash. */
  assert.equal(await budgetLeft("previewFetches", "u-any"), 0);
  const spent = await spendBudget("previewFetches", "u-any", 1);
  assert.equal(spent.ok, false);
  assert.equal(spent.ok === false && spent.silent, true, "a refused preview must be silent: the save itself went through");
});

/** `n` letter drafts for `authorId`, and a published letter and a post that must not count. */
function drafts(authorId, n) {
  fake.posts = [
    ...Array.from({ length: n }, () => ({ authorId, kind: "letter", status: "draft" })),
    { authorId, kind: "letter", status: "published" },
    { authorId, kind: "post", status: "published" },
  ];
}

test("C6-03: the twenty-first letter in progress is refused, in a sentence", async () => {
  drafts("u-writer", 19);
  assert.deepEqual(await spendBudget("letterDrafts", "u-writer"), { ok: true });
  drafts("u-writer", 20);
  const refused = await spendBudget("letterDrafts", "u-writer");
  assert.equal(refused.ok, false);
  assert.equal(refused.ok === false && refused.silent, false, "a refused draft must say so: the member pressed Save");
  assert.match(refused.ok === false ? refused.error : "", /^You have 20 letters in progress\./);
  assert.equal(await budgetLeft("letterDrafts", "u-writer"), 0);
});

test("C6-03: an account that never confirmed its email keeps three", async () => {
  drafts("u-new", 2);
  assert.deepEqual(await spendBudget("letterDraftsUnconfirmed", "u-new"), { ok: true });
  drafts("u-new", 3);
  const refused = await spendBudget("letterDraftsUnconfirmed", "u-new");
  assert.equal(refused.ok, false);
  assert.match(refused.ok === false ? refused.error : "", /Confirm your email address to keep more/);
  // Another account's drafts are not this one's.
  assert.deepEqual(await spendBudget("letterDraftsUnconfirmed", "u-someone-else"), { ok: true });
});

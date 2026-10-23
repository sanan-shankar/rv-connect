import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { ROOT, read, decomment, walk } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  The trivia gate's log keeps the analytics room's promises.
 *
 *  src/lib/trivia-log.ts writes down what strangers type at the entry
 *  question (docs/spec/admin.md §9.11). It answers anyone, before any
 *  account exists, so the rules that keep every other activity table
 *  honest apply here twice over. Source-reading, like
 *  stats-exclusion-rule.test.mjs: the writes run against a live database
 *  and cannot be called from the unit gate.
 * ------------------------------------------------------------------ */

const LOG = decomment(read("src/lib/trivia-log.ts"));

test("the log is written only by production, never by the demo, and behind the response", () => {
  assert.match(LOG, /!IS_DEMO && statsWritesEnabled\(\)/, "logging() must ask both");
  for (const fn of ["recordTrivia", "linkTriviaToMember"]) {
    const body = LOG.slice(LOG.indexOf(`export async function ${fn}`));
    const end = body.indexOf("\nexport ", 1);
    const own = end < 0 ? body : body.slice(0, end);
    assert.match(own, /if \(!logging\(\)/, `${fn} writes without asking logging()`);
    assert.match(own, /after\(write\)/, `${fn} writes inside the request instead of after it`);
  }
});

test("rows are capped site-wide before they are written", () => {
  const body = LOG.slice(LOG.indexOf("export async function recordTrivia"));
  const cap = body.indexOf("TRIVIA_ROWS_PER_HOUR");
  const insert = body.indexOf("prisma.triviaEvent.createMany");
  assert.ok(cap > 0 && insert > cap, "the hourly cap must be counted before the insert");
  assert.match(LOG, /export const TRIVIA_ROWS_PER_HOUR = \d+;/);
});

test("nothing outside the known files touches the gate's tables", () => {
  /* A new reader would skip the exclusion and the window the room applies. */
  const known = new Set([
    "src/lib/trivia-log.ts",
    "src/lib/retention.ts",
    "src/lib/admin-trivia.ts",
    "src/app/(main)/admin/trivia/actions.ts",
  ]);
  const strays = walk(`${ROOT}/src`)
    .map((f) => relative(ROOT, f))
    .filter((f) => !known.has(f) && /prisma\.(triviaEvent|triviaAnswer)\./.test(decomment(read(f))));
  assert.deepEqual(strays, [], "read the gate's tables through src/lib/admin-trivia.ts");
});

test("the gate log is swept after a year, and the privacy page says so", () => {
  const sweep = decomment(read("src/lib/retention.ts"));
  assert.match(sweep, /gateLog: 365/);
  assert.match(sweep, /prisma\.triviaEvent\.deleteMany\(\{ where: \{ createdAt: \{ lt \} \} \}\)/);
  const privacy = read("src/app/(policies)/privacy/page.tsx");
  assert.match(privacy, /The entry question:/, "what is held");
  assert.match(privacy, /\["Answers at the entry question", "1 year"\]/, "how long");
  assert.match(read("docs/SECURITY.md"), /\| Trivia gate log \(`TriviaEvent`\) \| 1 year \|/);
});

test("the gate's id cookie is one name in one place", () => {
  const actions = decomment(read("src/components/auth/trivia-actions.ts"));
  assert.doesNotMatch(actions, /"rv_trivia_id"/, "use TRIVIA_ID_COOKIE from trivia-log.ts");
  assert.match(LOG, /export const TRIVIA_ID_COOKIE = "rv_trivia_id";/);
});

/* ---------------------------------------------------------------- *
 *  The answers never reach a browser.
 *
 *  trivia-bank.ts cannot carry `import "server-only"` (the unit tests import
 *  it under plain Node), so this is the guard instead: walk every
 *  "use client" file's imports, through any module that is not itself a
 *  server-action boundary, and fail if the bank is reachable. A client file
 *  importing trivia-actions.ts is fine: Next replaces a "use server" module
 *  with references to the actions, and nothing in it ships.
 * ---------------------------------------------------------------- */

const SRC = resolve(ROOT, "src");
const BANK = resolve(SRC, "lib/trivia-bank.ts");

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = resolve(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null;
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (/\.tsx?$/.test(cand) && existsSync(cand)) return cand;
  }
  return null;
}

function runtimeImports(file) {
  const src = decomment(read(file));
  const out = [];
  /* `import type` and `export type` are erased and ship nothing. */
  const re = /(?:import|export)\s+(?!type\s)(?:[^'"]*?\sfrom\s+)?["']([^"']+)["']/g;
  for (let m; (m = re.exec(src)); ) {
    const hit = resolveImport(file, m[1]);
    if (hit) out.push(hit);
  }
  return out;
}

const isServerBoundary = (file) => /^\s*["']use server["']/.test(read(file));

test("no client component can reach the question bank", () => {
  const clients = walk(SRC).filter((f) => /^\s*["']use client["']/.test(read(f)));
  assert.ok(clients.length > 50, `expected the app's client files, found ${clients.length}`);
  const leaks = [];
  for (const start of clients) {
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const file = queue.shift();
      for (const next of runtimeImports(file)) {
        if (next === BANK) {
          leaks.push(`${relative(ROOT, start)} -> ... -> ${relative(ROOT, file)}`);
          continue;
        }
        if (seen.has(next) || isServerBoundary(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
  }
  assert.deepEqual(leaks, [], "the bank holds every accepted answer; a client import ships them");
});

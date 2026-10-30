import test from "node:test";
import assert from "node:assert/strict";
import { read, decomment, balancedBody } from "../../src/lib/test-kit.mjs";
import { EGRESS_ALARM_SHARE, egressAlarm, projectRefOf, readEgress } from "../ops/supabase-egress.mjs";

/* ------------------------------------------------------------------ *
 *  The nightly snapshot reads Supabase's egress meter, and never makes one
 *  up (bug audit 3, L5-07).
 *
 *  Egress is the first plan line growth reaches, and the owner's rule is
 *  measure, never estimate: the reading is Supabase's own billing figure or
 *  nothing. The module runs here against a stand-in fetch that answers the
 *  way the dashboard's API does; the snapshot's and the workflow's wiring
 *  are read as source, since the job only runs against production.
 * ------------------------------------------------------------------ */

const REF = "abcdefghijklmnopqrst";
const SLUG = "orgslugexample123456";
const TOKEN = "sbp_test_token_not_real";
const POOLER = `postgresql://postgres.${REF}:pw@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`;

/** The usage answer's shape, trimmed to what matters: the dashboard's
 *  `usages` array, cached egress listed first so a careless find would take
 *  the wrong row. */
const usageAnswer = (egress) => ({
  usage_billing_enabled: false,
  usages: [
    { metric: "CACHED_EGRESS", usage: 0.02, pricing_free_units: 5, unlimited: false, capped: true },
    { metric: "DATABASE_SIZE", usage: 0.13, pricing_free_units: 0.5, unlimited: false, capped: true },
    ...(egress ? [{ metric: "EGRESS", capped: true, unlimited: false, ...egress }] : []),
  ],
});

/** A fetch that answers from `routes` (path -> [status, body]) and records
 *  what it was asked. */
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url, init) => {
    const path = new URL(url).pathname;
    calls.push({ path, auth: init?.headers?.Authorization });
    const [status, body] = routes[path] ?? [404, { message: "not found" }];
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
      text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    };
  };
  return { impl, calls };
}

const routesFor = (egress, project = { ref: REF, organization_slug: SLUG }) => ({
  [`/v1/projects/${REF}`]: [200, project],
  [`/platform/organizations/${SLUG}/usage`]: [200, usageAnswer(egress)],
});

test("the project is the one the snapshot's own database URL names", () => {
  assert.equal(projectRefOf(POOLER), REF);
  assert.equal(projectRefOf(`postgresql://postgres:pw@db.${REF}.supabase.co:5432/postgres`), REF);
  assert.equal(projectRefOf("postgresql://postgres:pw@localhost:5432/postgres"), null);
  assert.equal(projectRefOf("not a url"), null);
  assert.equal(projectRefOf(""), null);
});

test("the reading is the cycle's EGRESS meter, found through the project's organisation", async () => {
  const { impl, calls } = fakeFetch(routesFor({ usage: 1.234, pricing_free_units: 5 }));
  assert.deepEqual(await readEgress({ token: TOKEN, databaseUrl: POOLER, fetchImpl: impl }), { gb: 1.234, includedGb: 5 });
  assert.deepEqual(
    calls.map((c) => c.path),
    [`/v1/projects/${REF}`, `/platform/organizations/${SLUG}/usage`]
  );
  assert.ok(calls.every((c) => c.auth === `Bearer ${TOKEN}`), "every request carries the token");
});

test("an organisation named the deprecated way is still found", async () => {
  const { impl } = fakeFetch(routesFor({ usage: 0.5, pricing_free_units: 5 }, { ref: REF, organization_id: SLUG }));
  assert.deepEqual(await readEgress({ token: TOKEN, databaseUrl: POOLER, fetchImpl: impl }), { gb: 0.5, includedGb: 5 });
});

test("an answer without the meter is an error, never a zero", async () => {
  for (const [why, routes] of [
    ["no EGRESS row", routesFor(null)],
    ["a usage that is not a number", routesFor({ usage: "1.2", pricing_free_units: 5 })],
    ["no usages at all", { ...routesFor(null), [`/platform/organizations/${SLUG}/usage`]: [200, {}] }],
    ["no organisation", routesFor({ usage: 1, pricing_free_units: 5 }, { ref: REF })],
  ]) {
    const { impl } = fakeFetch(routes);
    await assert.rejects(readEgress({ token: TOKEN, databaseUrl: POOLER, fetchImpl: impl }), Error, why);
  }
  await assert.rejects(
    readEgress({ token: TOKEN, databaseUrl: "postgresql://localhost/x", fetchImpl: fakeFetch({}).impl }),
    /names no Supabase project/
  );
});

test("a refusal says what Supabase said, without the token, the project or the organisation", async () => {
  const echo = `token ${TOKEN} may not read ${SLUG}`;
  const { impl } = fakeFetch({
    [`/v1/projects/${REF}`]: [200, { organization_slug: SLUG }],
    [`/platform/organizations/${SLUG}/usage`]: [403, { message: echo }],
  });
  const err = await readEgress({ token: TOKEN, databaseUrl: POOLER, fetchImpl: impl }).catch((e) => e);
  assert.ok(err instanceof Error, "a 403 was taken as a reading");
  assert.match(err.message, /403/);
  assert.match(err.message, /may not read/, "Supabase's own words are dropped");
  for (const secret of [TOKEN, REF, SLUG]) assert.ok(!err.message.includes(secret), `the message carries ${secret}`);
});

test("the alarm sits at its share of what the plan includes, and only where there is a line", () => {
  assert.ok(EGRESS_ALARM_SHARE >= 0.5 && EGRESS_ALARM_SHARE <= 0.85, `${EGRESS_ALARM_SHARE} is too early or too late`);
  const line = 5 * EGRESS_ALARM_SHARE;
  assert.equal(egressAlarm({ gb: line - 0.01, includedGb: 5 }), null);
  const alarm = egressAlarm({ gb: line, includedGb: 5 });
  assert.ok(alarm, "the line itself does not trip the alarm");
  assert.match(alarm, new RegExp(`${line.toFixed(2)} of 5 GB`));
  assert.match(alarm, /docs\/OPERATIONS\.md, "Egress"/);
  // An unlimited or uncapped plan has no line, so nothing to cross.
  assert.equal(egressAlarm({ gb: 400, includedGb: null }), null);
});

test("an unlimited allowance is read as no line, not as zero", async () => {
  const { impl } = fakeFetch(routesFor({ usage: 12, pricing_free_units: 250, unlimited: true }));
  assert.deepEqual(await readEgress({ token: TOKEN, databaseUrl: POOLER, fetchImpl: impl }), { gb: 12, includedGb: null });
});

/* ---------------------------------------------------------- the wiring */

const snapshot = decomment(read("scripts/ops/snapshot.mjs"));

test("the snapshot records the reading, skips without a token, and fails the job on the alarm or a failed read", () => {
  const collect = balancedBody(snapshot, "async function collectSupabase");
  assert.ok(collect, "collectSupabase is gone");
  assert.match(collect, /process\.env\.SUPABASE_ACCESS_TOKEN/);
  assert.match(collect, /if \(!token\) return "skipped/, "no token must mean skipped, not an error and not a zero");
  assert.match(collect, /readEgress\(/);
  assert.match(collect, /add\(\s*"supabase",\s*"egress\.cycle_gb",\s*reading\.gb\s*\)/);
  // A read that fails while the token is set is an alarm too, not a quiet skip.
  const failure = collect.slice(collect.indexOf("catch"));
  assert.match(failure, /egressAlarm\s*=/, "a failed read no longer fails the job");
  assert.match(snapshot, /for \(const alarm of \[[^\]]*\begressAlarm\b[^\]]*\]\)/, "the egress alarm no longer reaches the exit code");
});

test("a backfill does not ask Supabase about a past day", () => {
  /* The meter is the cycle so far, a point-in-time count with no history:
     under an old date it would be a lie (audit Low 104). */
  const pick = snapshot.slice(snapshot.indexOf("const sources = BACKFILL"));
  const backfill = pick.slice(0, pick.indexOf(":"));
  assert.ok(!backfill.includes("collectSupabase"), "a backfill reads the egress meter");
  assert.match(pick.slice(0, pick.indexOf("];")), /\["supabase",\s*collectSupabase\]/, "the nightly run no longer reads it");
});

test("only the collect step is handed the token", () => {
  const yml = read(".github/workflows/snapshot.yml");
  const collect = yml.slice(yml.indexOf("- name: Collect"), yml.indexOf("- name: Prune stale notifications"));
  assert.match(collect, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.equal(yml.split("SUPABASE_ACCESS_TOKEN:").length - 1, 1, "the token reaches a step that does not need it");
});

import assert from "node:assert/strict";
import test from "node:test";
import { read, decomment } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  Presence telemetry: whose row it is, and how much of it there may be.
 *
 *  Two findings, one table (bug-report-2 C-163, C-164):
 *
 *   - The Visit id arrives in a request header the proxy fills from the
 *     CALLER'S OWN cookie, and the write was an upsert keyed on that id
 *     alone. A replayed id wrote into another member's row -- their view
 *     count, their endedAt, their device and their city -- and a caller
 *     rotating the cookie per request minted one row per page view for
 *     ever, which is about 660,000 rows to fill the free-tier disk and
 *     take the site read-only for everybody.
 *   - At the project's own stated scale (2,000 members, 30 views a day)
 *     180 days of ~750-byte rows is over half a gigabyte, against a 500MB
 *     plan that the gazetteer already spends 97MB of.
 *
 *  Shape assertions: last-seen.ts pulls in next/headers and Prisma, so the
 *  offline unit gate cannot execute it. The behaviours were proved against
 *  Postgres -- a scoped update by the wrong member touches 0 rows where the
 *  old shape touched 1, the create then loses to the primary key, and an
 *  ordinary member's two page views still land as one row with views 2.
 * ------------------------------------------------------------------ */

test("a visit is only ever written against the member it belongs to", () => {
  const src = decomment(read("src/lib/last-seen.ts"));
  assert.ok(
    !/visit\.upsert\s*\(/.test(src),
    "the visit write is an upsert again: an upsert can only be keyed on the id, " +
      "and the id comes from the caller's own cookie, so a replayed one writes into somebody else's row (C-163)"
  );
  // Raw SQL since 2026-09-15 (the trail needs a cap Prisma's push cannot
  // say), so the scope is pinned on the statement's own WHERE.
  const at = src.indexOf('UPDATE "Visit"');
  assert.notEqual(at, -1, "the visit update is gone");
  const update = src.slice(at, src.indexOf("`", at));
  assert.match(
    update,
    /WHERE\s+"id"\s*=\s*\$\{visitId\}\s+AND\s+"userId"\s*=\s*\$\{userId\}/,
    "the visit update is no longer scoped to the member as well as the id"
  );
});

test("a page view comes from the browser, never from a layout render", () => {
  /* The (main) layout renders for link prefetches and never while somebody
     reads, so when it wrote Visit most visits read one page and 0s, and the
     page recorded was whichever sidebar link was prefetched last (2026-09-15).
     The beacon reports real navigations; the route is the only writer. */
  const layout = decomment(read("src/app/(main)/layout.tsx"));
  assert.ok(
    !/recordPageView|readPresence/.test(layout),
    "the layout writes visits again: prefetches will count as pages and reading will count as 0s"
  );
  assert.match(layout, /<PresenceBeacon\b/, "the presence beacon is no longer mounted");

  const beacon = decomment(read("src/components/analytics/presence-beacon.tsx"));
  assert.match(beacon, /usePathname\(\)/, "the beacon no longer follows real navigations");
  assert.match(beacon, /IDLE_MS/, "the heartbeat no longer stops when the member goes idle; an open tab would count all night");

  const route = decomment(read("src/app/api/presence/route.ts"));
  const authAt = route.search(/await auth\(\)/);
  const writeAt = route.search(/recordPageView\(/);
  assert.ok(authAt !== -1 && writeAt !== -1 && authAt < writeAt, "the presence route writes before it authenticates");
  assert.match(route, /presencePingSchema\.safeParse/, "the presence route no longer validates what the browser sends");
  assert.match(route, /IS_DEMO/, "the presence route no longer skips the demo");
});

test("a rotating cookie cannot mint rows for ever", () => {
  const src = decomment(read("src/lib/last-seen.ts"));
  assert.match(src, /MAX_VISITS_PER_DAY/, "the per-member daily ceiling on new visits is gone");
  // ...and it is checked BEFORE the row is opened, or it is decoration.
  const body = src.slice(src.indexOf("async function recordVisit"));
  const capAt = body.search(/opened\s*>=\s*MAX_VISITS_PER_DAY/);
  const createAt = body.search(/visit\.create/);
  assert.ok(capAt !== -1, "nothing compares the day's count against the ceiling");
  assert.ok(createAt !== -1, "recordVisit no longer opens a visit at all");
  assert.ok(capAt < createAt, "the ceiling is checked after the row is created, which is no ceiling");
});

test("a lost create is swallowed, and nothing else is", () => {
  // Two requests from one browser can race into the create, and a foreign id
  // fails the primary key: neither is worth an error page over a statistics
  // row. Any OTHER failure must still reach the caller's guard, which logs in
  // development -- a guard that hides its own breakage is worse than none.
  const src = decomment(read("src/lib/last-seen.ts"));
  const body = src.slice(src.indexOf("async function recordVisit"));
  // Either spelling: the shared predicate, or the raw code it wraps. What is
  // pinned is that the case is recognised, not which helper recognises it.
  assert.match(body, /isUniqueViolation\(|P2002/, "the unique-violation case is no longer recognised");
  assert.match(body, /throw err/, "every failure is swallowed now, including the ones worth knowing about");
});

test("presence is kept exactly as long as the deepest analytics view reads", () => {
  /* Derived from the queries themselves, so deepening a chart forces the
     retention decision instead of silently reading rows that have been swept.
     Cut from 180 to 90 for size (C-164): 180 was margin, and margin on the
     fastest-growing table in the schema is what put it over the plan. */
  const analytics = read("src/lib/admin-analytics.ts");
  const windows = [
    ...[...analytics.matchAll(/interval '(\d+) days'/g)].map((m) => Number(m[1])),
    ...[...analytics.matchAll(/(\d+)\s*\*\s*86_?400_?000/g)].map((m) => Number(m[1])),
    ...[...analytics.matchAll(/days\s*=\s*(\d+)/g)].map((m) => Number(m[1])),
  ];
  assert.ok(windows.length >= 5, `only found ${windows.length} lookback windows; the scrape has drifted`);
  const deepest = Math.max(...windows);

  const retention = read("src/lib/retention.ts");
  const presence = Number(/presence:\s*(\d+)/.exec(decomment(retention))?.[1]);
  assert.ok(Number.isInteger(presence), "KEEP_DAYS.presence is no longer a plain number of days");
  assert.equal(
    presence,
    deepest,
    `presence telemetry is kept ${presence} days while the deepest analytics view reads ${deepest}. ` +
      `Shorter loses an answer; longer is rows nothing can reach, on the table that will hit the ` +
      `500MB plan first (C-164). Change both together, and the retention table in docs/SECURITY.md with them.`
  );
});

test("the documented retention window says the same number", () => {
  const presence = Number(/presence:\s*(\d+)/.exec(decomment(read("src/lib/retention.ts")))?.[1]);
  const doc = read("docs/SECURITY.md");
  const row = /\|\s*Presence \+ search telemetry[^|]*\|\s*(\d+) days\s*\|/.exec(doc);
  assert.ok(row, "the retention table in docs/SECURITY.md no longer has a presence row");
  assert.equal(
    Number(row[1]),
    presence,
    "docs/SECURITY.md promises a different retention window from the one the sweep enforces"
  );
});

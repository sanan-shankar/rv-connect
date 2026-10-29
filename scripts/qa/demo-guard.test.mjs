import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { ROOT, read, decomment } from "../../src/lib/test-kit.mjs";
import { carriesDemoRef, demoWipeRefusal } from "../dev/_env.mjs";

/* ------------------------------------------------------------------ *
 *  scripts/demo touches the demo database and nothing else.
 *
 *  seed-demo.mts deletes every row of whatever it reaches, and it checked
 *  only the request: a DEMO_MODE line in the same file as the URL, and a
 *  byte comparison with one other string, both waived by a flag. A
 *  `.env.demo` naming production in any other form reached the wipe, and
 *  only a foreign key on four dismissed reports would have rolled it back
 *  (bug audit 3, C1-05). Never run to test it; these hold the checks.
 * ------------------------------------------------------------------ */

test("a connection string names the demo project, or it is not the demo", () => {
  assert.equal(carriesDemoRef("postgresql://postgres.cbvlzptghkuxhygyaezq:pw@pooler.example:6543/postgres"), true);
  assert.equal(carriesDemoRef("postgresql://postgres.someotherproject:pw@pooler.example:6543/postgres"), false);
  assert.equal(carriesDemoRef(""), false);
  assert.equal(carriesDemoRef(undefined), false);
});

test("a database holding anyone but the demo's cast is never wiped", () => {
  const cast = 41;
  assert.equal(demoWipeRefusal({ users: 40, outsiders: 0, cast }), null, "today's demo");
  assert.equal(demoWipeRefusal({ users: 0, outsiders: 0, cast }), null, "an empty database has nothing to lose");
  // One real address is enough, whatever the count.
  assert.match(demoWipeRefusal({ users: 41, outsiders: 1, cast }), /not @demo\.invalid/);
  assert.match(demoWipeRefusal({ users: 400, outsiders: 400, cast }), /not @demo\.invalid/);
  // And a crowd is refused even if every address looked like the demo's.
  assert.match(demoWipeRefusal({ users: 200, outsiders: 0, cast }), /cast is 41/);
});

test("the seed checks where it is pointed and what is there, and the force flag waives neither", () => {
  const src = decomment(read("scripts/demo/seed-demo.mts"));
  const ref = src.split("\n").find((l) => l.includes("carriesDemoRef("));
  assert.ok(ref, "seed-demo.mts no longer checks the demo ref");
  assert.doesNotMatch(ref, /FORCE/, "--i-know-what-im-doing waives the destination check again");
  const contents = src.indexOf("demoWipeRefusal(");
  assert.ok(contents > 0, "seed-demo.mts no longer checks what the database holds");
  assert.ok(contents < src.indexOf("seedDemo(prisma"), "the contents check runs after the wipe has started");
  assert.doesNotMatch(src.slice(contents - 200, contents + 200), /FORCE/, "the force flag waives the contents check");
});

test("every script under scripts/demo that opens a database checks the demo ref", () => {
  const opens = /new\s+PrismaPg\s*\(|pg(?:Client|Pool)\s*\(|lib\/prisma\.js/;
  const scripts = readdirSync(join(ROOT, "scripts/demo")).filter((f) => /\.(mjs|mts|ts)$/.test(f));
  const opening = scripts.filter((f) => opens.test(decomment(read(`scripts/demo/${f}`))));
  assert.ok(opening.length >= 3, `only ${opening.length} demo scripts open a database; re-read this test`);
  for (const f of opening) {
    assert.match(decomment(read(`scripts/demo/${f}`)), /carriesDemoRef\(/, `scripts/demo/${f} opens a database without checking it is the demo`);
  }
});

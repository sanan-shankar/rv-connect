/* The settings surface's "Give everyone longer" choices and the server's
 * accepted day counts must be the same numbers. They drifted once: the surface
 * offered three days, a week and two weeks while `extendDeadline` accepted
 * only 1, 2, 4 or 7, so two of the three buttons were refused. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

test("every extension the settings surface offers is one the server accepts", () => {
  const surface = read("src/components/catchups/settings/settings-surface.tsx");
  const offered = [...surface.matchAll(/\{\s*value:\s*(\d+),\s*label:\s*"[^"]*(?:day|week)[^"]*"\s*\}/gi)].map((m) =>
    Number(m[1]),
  );
  assert.ok(offered.length > 0, "found no extension choices on the settings surface");

  const actions = read("src/app/(main)/catchups/actions.ts");
  const schema = /const extendDaysSchema = z\.union\(\[([^\]]*)\]\)/.exec(actions);
  assert.ok(schema, "extendDaysSchema is gone from catchups/actions.ts");
  const accepted = [...schema[1].matchAll(/z\.literal\((\d+)\)/g)].map((m) => Number(m[1]));

  assert.deepEqual([...offered].sort((a, b) => a - b), [...accepted].sort((a, b) => a - b));
});

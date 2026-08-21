import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  formatDisplayDate,
  formatTimeAgo,
  valleyDayKey,
  valleyDayStart,
  valleyMidnight,
  valleyYear,
} from "./utils.ts";

/* ------------------------------------------------------------------ *
 *  The valley's day is an IST day (audit B-100 and its cluster).
 *
 *  Every case below is built at a UTC/IST boundary, because that is the
 *  only place the bug ever showed: between 00:00 and 05:30 IST the two
 *  calendars disagree, and a server rendering in UTC printed yesterday.
 *  These run with no TZ set, exactly as `npm run check` and Vercel do.
 * ------------------------------------------------------------------ */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("formatDisplayDate: a letter written at 00:30 IST shows that day, not the one before", () => {
  // 00:30 IST on 15 June 2026 is 19:00 UTC on 14 June.
  assert.equal(formatDisplayDate(new Date("2026-06-14T19:00:00Z")), "15 Jun 2026");
  // And the last minute of the valley's day is still that day.
  assert.equal(formatDisplayDate(new Date("2026-06-15T18:29:00Z")), "15 Jun 2026");
  // One minute later it is the next.
  assert.equal(formatDisplayDate(new Date("2026-06-15T18:30:00Z")), "16 Jun 2026");
});

test("formatTimeAgo: the older-than-four-weeks fallback is an IST date too", () => {
  // Five weeks before a moment that is 15 June in IST but 14 June in UTC.
  const written = new Date("2026-06-14T19:00:00Z");
  const out = formatTimeAgo(written);
  // It has fallen through to a date (not "5w ago") only if enough time has
  // passed; assert on the format itself against a fixed old date instead.
  const old = new Date("2020-01-01T19:00:00Z"); // 2 Jan 2020 in IST
  assert.equal(formatTimeAgo(old), "2 Jan 2020");
  assert.ok(typeof out === "string" && out.length > 0);
});

test("valleyDayKey / valleyMidnight: the day boundary sits at 18:30 UTC", () => {
  assert.equal(valleyDayKey(new Date("2026-06-14T18:29:59Z")), "2026-06-14");
  assert.equal(valleyDayKey(new Date("2026-06-14T18:30:00Z")), "2026-06-15");
  assert.equal(valleyMidnight("2026-06-15").toISOString(), "2026-06-14T18:30:00.000Z");
  assert.equal(
    valleyDayStart(new Date("2026-06-14T19:00:00Z")).toISOString(),
    "2026-06-14T18:30:00.000Z"
  );
});

test("valleyYear: the new year arrives at IST midnight, not five and a half hours later", () => {
  assert.equal(valleyYear(new Date("2026-12-31T18:29:00Z")), 2026);
  assert.equal(valleyYear(new Date("2026-12-31T18:30:00Z")), 2027); // 00:00 IST, 1 Jan
  assert.equal(valleyYear(new Date("2026-12-31T23:59:00Z")), 2027);
});

test("the year validators re-read the clock instead of freezing it at import", () => {
  // A `.max(new Date().getFullYear())` is evaluated once, when Zod builds the
  // schema, so a warm instance that booted in December rejects January's year
  // for as long as it stays warm. Nothing in validators.ts may do that again.
  const src = readFileSync(resolve(ROOT, "src/lib/validators.ts"), "utf8");
  assert.ok(
    !/\.max\(\s*new Date\(\)\.getFullYear\(\)/.test(src),
    "validators.ts freezes a year ceiling at module load again"
  );
  assert.ok(src.includes("valleyYear"), "validators.ts no longer bounds years by the valley clock");
});

test("no date is rendered without a time zone in a server-rendered file", () => {
  // toLocaleDateString with no timeZone reads the runtime's zone: UTC on the
  // server, the viewer's own in the browser. Both are wrong for a site whose
  // shared frame is the valley's day, and the disagreement between them is
  // what produced hydration flashes. Every call must name a zone.
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      // `lab` is the dev/preview wing: it renders fixtures and documents past
      // findings, so a date there is not shown to a member.
      if (name === "generated" || name === "node_modules" || name === "lab") continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      const src = readFileSync(full, "utf8");
      // Match a toLocale*String call and look at the option object that follows
      // it, if any, for a timeZone key before the call's closing brace.
      // Only the two date-specific calls: bare `toLocaleString` is almost
      // always a NUMBER being grouped ("1,240 people"), which has no time zone
      // to get wrong.
      for (const m of src.matchAll(/toLocale(?:Date|Time)String\(([^;]*?)\)\s*[;,)\n]/g)) {
        if (!/timeZone/.test(m[1])) {
          offenders.push(`${full.slice(ROOT.length + 1)}: ${m[0].trim().slice(0, 90)}`);
        }
      }
    }
  };
  walk(resolve(ROOT, "src"));
  assert.deepEqual(offenders, [], `dates rendered with no time zone:\n${offenders.join("\n")}`);
});

/* ---- Low 28: a calendar word must count calendar days ---------------- */

test("'tomorrow' is a calendar day away, not twenty-four hours", async () => {
  const { valleyDaysBetween } = await import("./utils.ts");
  // 6pm IST today, deadline 5pm IST tomorrow: 23 hours, but a different day.
  const now = new Date("2026-03-10T12:30:00Z"); // 18:00 IST on the 10th
  const at = new Date("2026-03-11T11:30:00Z"); // 17:00 IST on the 11th
  assert.equal(valleyDaysBetween(at, now), 1);

  // Same valley day, later in the evening.
  assert.equal(valleyDaysBetween(new Date("2026-03-10T16:00:00Z"), now), 0);

  // The IST/UTC seam: 01:00 IST on the 11th is still "tomorrow" from the 10th,
  // even though both instants share a UTC date.
  assert.equal(
    valleyDaysBetween(new Date("2026-03-10T19:30:00Z"), new Date("2026-03-10T12:30:00Z")),
    1
  );
});

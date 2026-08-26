import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ROOT, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";

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
  // `lab` is the dev/preview wing: it renders fixtures and documents past
  // findings, so a date there is not shown to a member.
  for (const full of walk(resolve(ROOT, "src"), { skip: [...SKIP_DIRS, "lab"] })) {
    const src = readFileSync(full, "utf8");
      // Match a toLocale*String call and look at the option object that follows
      // it, if any, for a timeZone key before the call's closing brace.
      // Only the two date-specific calls: bare `toLocaleString` is almost
      // always a NUMBER being grouped ("1,240 people"), which has no time zone
      // to get wrong.
    for (const m of src.matchAll(/toLocale(?:Date|Time)String\(([^;]*?)\)\s*[;,)\n]/g)) {
      if (!/timeZone/.test(m[1])) {
        offenders.push(`${relative(ROOT, full)}: ${m[0].trim().slice(0, 90)}`);
      }
    }
  }
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

/* ---- C-143: SQL buckets the valley's calendar too ------------------- */

test("every SQL date bucket converts to the valley's zone before truncating", () => {
  /* Prisma DateTime is `timestamp(3) without time zone` holding UTC wall
     time, so `date_trunc('month', "createdAt")` cuts the month at 05:30 IST on
     the 1st: somebody joining at ten in the evening on the last day of a month
     was counted in the month before, and the growth curve and joinedMonth were
     the two places in this file that never got the conversion the rest of it
     already had (audit C-143).

     A SWEEP, not two assertions. The whole failure was one file doing this
     correctly in four places and naively in two, so what is pinned is that no
     naive one exists -- and the sites are COUNTED, because a per-file check
     passes on a file that has two and fixed one. */
  /** The argument list of a call, read with a paren counter rather than a
      regex -- `date_trunc('month', (x AT TIME ZONE 'UTC') AT TIME ZONE 'IST')`
      has nested parens and a regex stops at the first `)`. */
  const callArgs = (src, at) => {
    let depth = 0;
    for (let i = at; i < src.length; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")" && --depth === 0) return src.slice(at, i + 1);
    }
    return src.slice(at);
  };

  const naive = [];
  let sites = 0;
  for (const file of walk(resolve(ROOT, "src"), { match: /\.ts$/ })) {
    // Comments describe the bug; only real calls count.
    const code = decomment(readFileSync(file, "utf8"));
    for (const m of code.matchAll(/\b(date_trunc|to_char)\(/g)) {
      const args = callArgs(code, m.index + m[0].length - 1);
      // Only calls over a real column; to_char over a computed number is not a
      // date bucket at all.
      if (!/"[A-Za-z]+"/.test(args)) continue;
      sites++;
      if (!/AT TIME ZONE 'Asia\/Kolkata'/.test(args)) {
        naive.push(`${relative(ROOT, file)}: ${args.slice(0, 100)}`);
      }
    }
  }

  assert.ok(sites >= 6, `only found ${sites} SQL date buckets; this sweep has stopped matching`);
  assert.deepEqual(
    naive,
    [],
    "SQL date buckets that cut on UTC's calendar instead of the valley's:\n" + naive.join("\n")
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { ROOT, decomment, walk, SKIP_DIRS } from "./test-kit.mjs";

import {
  formatDisplayDate,
  formatDisplayDateTime,
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

test("formatDisplayDateTime: the clock face is the valley's, and it says so", () => {
  // The admin ledger's payment time. 00:30 IST on 15 June is 19:00 UTC on the
  // 14th: the date half must agree with formatDisplayDate above, and the hour
  // must be the one a person in the valley saw on the wall, not the server's.
  assert.equal(formatDisplayDateTime(new Date("2026-06-14T19:00:00Z")), "15 Jun 2026, 00:30 IST");
  // Padded, so a stack of rows lines up rather than ragging at the colon.
  assert.equal(formatDisplayDateTime(new Date("2026-09-04T03:04:23Z")), "4 Sept 2026, 08:34 IST");
  // The last minute of the valley's day is still that day.
  assert.equal(formatDisplayDateTime(new Date("2026-06-15T18:29:00Z")), "15 Jun 2026, 23:59 IST");
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

test("formatTimeAgo: the year is printed only when it is not this one", () => {
  /* On a thread of eighteen comments the repeated current year said nothing,
     while the archive runs back decades and genuinely needs it. So: silent on
     a date in this year, printed on any other.

     "This year" is the valley's, and both sides of its new year are pinned
     here rather than read off the machine. The old version built this year
     from the runner's own calendar and held it against the valley's, so from
     18:30 to 24:00 UTC every 31 December -- 00:00 to 05:30 IST on 1 January --
     CI and every western laptop went red on it (bug audit 3, L3-06). */
  const written = new Date("2026-06-15T06:00:00Z");
  // 23:59 IST on 31 December: still 2026 in the valley.
  assert.equal(formatTimeAgo(written, new Date("2026-12-31T18:29:00Z")), "15 Jun");
  // 00:00 IST on 1 January: 2027 in the valley, still 31 December in UTC and London.
  assert.equal(formatTimeAgo(written, new Date("2026-12-31T18:30:00Z")), "15 Jun 2026");
  assert.equal(formatTimeAgo(new Date("2020-06-15T06:00:00Z"), new Date("2026-12-31T18:29:00Z")), "15 Jun 2020");
});

test("no test reads the machine's own calendar off the real clock", () => {
  /* `new Date().getFullYear()` is the RUNNER's year: UTC on CI, London on the
     owner's laptop, the valley's only in the valley. A test built on it
     passes or fails by the hour it runs, which is how the one above went red
     every New Year's Eve (L3-06). Pin an instant, or ask valleyYear(). */
  const tests = ["src", "scripts"].flatMap((dir) =>
    walk(resolve(ROOT, dir), { match: /\.test\.mjs$/ })
  );
  assert.ok(tests.length >= 60, `only ${tests.length} test files found; this sweep has drifted`);
  const offenders = tests
    .filter((full) =>
      /new Date\(\s*(?:Date\.now\(\s*\)\s*)?\)\s*\.get(?:FullYear|Month|Date|Day|Hours|Minutes)\s*\(/.test(
        decomment(readFileSync(full, "utf8"))
      )
    )
    .map((full) => relative(ROOT, full));
  assert.deepEqual(offenders, [], `tests that read the runner's calendar:\n${offenders.join("\n")}`);
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

/* ---- Dates rendered and read: three sweeps that pin the property ---- *
 *
 * Each used to see one shape (bug audit 3, L3-05). The rendered-date sweep
 * was a delimiter regex that flagged a call only when a `;`, `,` or `)`
 * followed its last paren, so a date written where a .tsx file actually
 * writes them -- a JSX child, a template literal, a ternary, an attribute --
 * walked past it, and O-01 shipped through it. The calls are now read with a
 * paren counter over decommented code, so the shape around a call no longer
 * matters, only what is inside it.
 * ------------------------------------------------------------------ */

/** The argument list of the call whose `(` is at `at`: a paren counter, not a
    regex, because `date_trunc('month', (x AT TIME ZONE 'UTC') AT TIME ZONE
    'IST')` nests and a regex stops at the first `)`. Decommented code only. */
function callArgs(code, at) {
  let depth = 0;
  for (let i = at; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")" && --depth === 0) return code.slice(at, i + 1);
  }
  return code.slice(at);
}

/* A toLocaleString is a date only when its options say so: bare, it is
   almost always a NUMBER being grouped ("1,240 people"), which has no zone
   to get wrong. A bare `date.toLocaleString()` therefore still passes; it
   cannot be told from a number without types, and nothing here writes one. */
const DATE_OPTION = /\b(?:year|month|day|weekday|hour|minute|second|dateStyle|timeStyle|era|dayPeriod|timeZoneName)\s*:/;
/* A key that names a zone, written out or shorthand, and not `undefined`. */
const NAMES_A_ZONE = /\btimeZone\s*(?::\s*(?!undefined\b)[^\s,}]|[,}])/;

/** Every call in `src` that renders a date in the runtime's own zone. */
function zonelessDates(src) {
  const code = decomment(src);
  const found = [];
  for (const m of code.matchAll(
    /\b(toLocaleDateString|toLocaleTimeString|toLocaleString|DateTimeFormat|toDateString|toTimeString)\s*\(/g
  )) {
    const open = m.index + m[0].length - 1;
    const args = callArgs(code, open);
    const call = `${m[1]}${args.replace(/\s+/g, " ").slice(0, 80)}`;
    // These two take no options at all: whatever they print is the runtime's.
    if (m[1] === "toDateString" || m[1] === "toTimeString") found.push(call);
    else if (m[1] === "toLocaleString" && !DATE_OPTION.test(args)) continue;
    // `Intl.DateTimeFormat().resolvedOptions()` reads the zone; it renders nothing.
    else if (m[1] === "DateTimeFormat" && /^\(\s*\)\s*\.\s*resolvedOptions\b/.test(code.slice(open))) continue;
    else if (!NAMES_A_ZONE.test(args)) found.push(call);
  }
  return found;
}

/* Files allowed a known zone-less date, each until the row that fixes it
   lands. `calls` is exact: one more is a new offender, one fewer means the
   fix landed and this entry must go. */
const ZONELESS_UNTIL_FIXED = {
  "src/components/letters/drafts-strip.tsx": {
    calls: 1,
    why: "O-01 (bug audit 3, Phase F; listed 2026-10-30 by L3-05): the drafts strip's date, open until its own row lands",
  },
};

test("no date is rendered without a time zone", () => {
  /* toLocaleDateString with no timeZone reads the runtime's zone: UTC on the
     server, the viewer's own in the browser. Both are wrong for a site whose
     shared frame is the valley's day, and the disagreement between them is
     what produced hydration flashes. Every call names a zone, in the call:
     options built elsewhere and passed in are invisible to this sweep, which
     is why utils.ts spells its options out at each call.

     `lab` is the dev/preview wing: it renders fixtures and documents past
     findings, so a date there is not shown to a member. Tests hold the
     shapes as fixtures. scripts/ prints for the owner's own terminal; its
     read side is raw-pg.test.mjs's (every timestamp a script reads is UTC). */
  const offenders = [];
  let calls = 0;
  for (const full of walk(resolve(ROOT, "src"), {
    skip: [...SKIP_DIRS, "lab"],
    match: (name) => /\.(tsx?|mts|mjs)$/.test(name) && !/\.test\.mjs$/.test(name),
  })) {
    const src = readFileSync(full, "utf8");
    calls += [...decomment(src).matchAll(/\b(?:toLocale(?:Date|Time)?String|DateTimeFormat)\s*\(/g)].length;
    const rel = relative(ROOT, full);
    const found = zonelessDates(src);
    const allowed = ZONELESS_UNTIL_FIXED[rel];
    if (allowed && found.length === allowed.calls) continue;
    if (allowed) offenders.push(`${rel}: ${found.length} zone-less date(s), the exemption says ${allowed.calls}`);
    else offenders.push(...found.map((call) => `${rel}: ${call}`));
  }
  assert.ok(calls >= 20, `only ${calls} date-rendering calls found; this sweep has drifted`);
  assert.deepEqual(offenders, [], `dates rendered with no time zone:\n${offenders.join("\n")}`);
});

test("the rendered-date sweep sees every shape a date is written in", () => {
  /* The audit ran the old regex over eleven shapes and it flagged one. */
  const zoneless = [
    // O-01's own shape: a JSX child whose call closes `})}` over several lines.
    `{new Date(d.updatedAt).toLocaleDateString("en-GB", {\n  day: "numeric",\n  month: "short",\n})}`,
    `<span>{d.toLocaleDateString("en-GB")}</span>`,
    "const s = `Edited ${d.toLocaleDateString(\"en-GB\")}`;",
    `const s = ok ? d.toLocaleDateString("en-GB") : "";`,
    `<time title={d.toLocaleString("en-GB", { day: "numeric", month: "short" })} />`,
    `const f = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(d);`,
    `d.toLocaleTimeString("en-GB", { hour: "2-digit" /* timeZone: VALLEY_TIME_ZONE */ });`,
    `d.toLocaleDateString("en-GB", { timeZone: undefined, day: "numeric" });`,
    `const day = d.toDateString();`,
  ];
  for (const src of zoneless) assert.equal(zonelessDates(src).length, 1, `missed: ${src}`);

  const zoned = [
    `d.toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, day: "numeric" });`,
    `{d.toLocaleDateString("en-GB", {\n  timeZone: "Asia/Kolkata",\n})}`,
    `d.toLocaleDateString("en-GB", { timeZone, day: "numeric" });`,
    `const people = (1240).toLocaleString("en-IN");`,
    `const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;`,
  ];
  for (const src of zoned) assert.deepEqual(zonelessDates(src), [], `flagged: ${src}`);
});

/* The runtime's own calendar, read field by field. `getUTC*` is the UTC one
   and is fine; these answer in UTC on the server and in the viewer's zone in
   the browser. Minutes are on the list because IST is half an hour off
   every whole-hour zone. Each file here says why its reading is harmless. */
const LOCAL_CALENDAR = /\.(?:get|set)(?:FullYear|Month|Date|Day|Hours|Minutes)\s*\(/g;
const LOCAL_CALENDAR_ALLOWED = {
  "src/lib/storage.ts": "the year/month folder an upload's key is filed under: never shown, never compared, and a file filed a month either side is found by its full key",
  "src/lib/utils.ts": "valleyYear's fallback, for a runtime whose Intl cannot format en-CA; argued in place",
  "src/components/mascot/moments/rare-idle-behaviors.ts": "the hoopoe's monsoon flourish reads the viewer's own month in the browser; a day either side of a month changes nothing",
};

test("no date is read off the runtime's own calendar", () => {
  const offenders = [];
  for (const full of walk(resolve(ROOT, "src"), {
    skip: [...SKIP_DIRS, "lab"],
    match: (name) => /\.(tsx?|mts|mjs)$/.test(name) && !/\.test\.mjs$/.test(name),
  })) {
    const rel = relative(ROOT, full);
    const reads = [...decomment(readFileSync(full, "utf8")).matchAll(LOCAL_CALENDAR)].length;
    if (reads && !LOCAL_CALENDAR_ALLOWED[rel]) offenders.push(`${rel}: ${reads} local calendar read(s)`);
    if (!reads && LOCAL_CALENDAR_ALLOWED[rel]) offenders.push(`${rel}: allowed, but reads nothing now; drop the entry`);
  }
  assert.deepEqual(
    offenders,
    [],
    `the runtime's own calendar, read where the valley's is meant (valleyDayKey, valleyYear):\n${offenders.join("\n")}`
  );
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

/** Every SQL calendar cut over a real column in `src`, and the ones made on
    UTC's calendar instead of the valley's. A cut is `date_trunc`/`to_char`, an
    `EXTRACT`/`date_part` of a calendar field (an epoch is a duration, no
    calendar in it), or a `::date` cast. */
function sqlCalendarCuts(src) {
  const code = decomment(src);
  const cuts = [];
  for (const m of code.matchAll(/\b(date_trunc|to_char|date_part|EXTRACT|extract)\s*\(/g)) {
    const args = callArgs(code, m.index + m[0].length - 1);
    if (/^extract$/i.test(m[1]) && !/^\(\s*[A-Za-z]+\s+FROM\b/i.test(args)) continue; // a JS extract(), not SQL
    if (/^\(\s*(?:EPOCH\s+FROM|'epoch')/i.test(args)) continue;
    cuts.push(args);
  }
  for (const m of code.matchAll(/::date\b/g)) {
    // The operand before the cast: a parenthesised expression, or a column.
    const before = code.slice(0, m.index);
    let operand = (before.match(/(?:\w+\.)?"[A-Za-z]+"$/) ?? [""])[0];
    if (before.endsWith(")")) {
      let depth = 0;
      for (let i = before.length - 1; i >= 0; i--) {
        if (before[i] === ")") depth++;
        else if (before[i] === "(" && --depth === 0) {
          operand = before.slice(i);
          break;
        }
      }
    }
    cuts.push(operand);
  }
  // Only cuts over a real column; to_char over a computed number, or a
  // parameter cast like `$1::date`, is not a date bucket at all.
  const real = cuts.filter((args) => /"[A-Za-z]+"/.test(args));
  return { sites: real.length, naive: real.filter((args) => !/AT TIME ZONE 'Asia\/Kolkata'/.test(args)) };
}

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
     passes on a file that has two and fixed one.

     It counted only date_trunc and to_char in src/**.ts until L3-05: the
     heatmap's EXTRACT(DOW/HOUR) was converted correctly and would not have
     been caught if it were not, and scripts/ was never read. */
  const naive = [];
  let sites = 0;
  for (const dir of ["src", "scripts"]) {
    for (const file of walk(resolve(ROOT, dir), {
      match: (name) => /\.(tsx?|mts|mjs)$/.test(name) && !/\.test\.mjs$/.test(name),
    })) {
      const found = sqlCalendarCuts(readFileSync(file, "utf8"));
      sites += found.sites;
      naive.push(...found.naive.map((args) => `${relative(ROOT, file)}: ${args.slice(0, 100)}`));
    }
  }

  assert.ok(sites >= 8, `only found ${sites} SQL date buckets; this sweep has stopped matching`);
  assert.deepEqual(
    naive,
    [],
    "SQL date buckets that cut on UTC's calendar instead of the valley's:\n" + naive.join("\n")
  );
});

test("the SQL sweep sees each way a query cuts a calendar", () => {
  const naive = [
    `SELECT date_trunc('month', "createdAt") FROM "User"`,
    `SELECT EXTRACT(DOW FROM "endedAt")::int FROM "Visit"`,
    `SELECT date_part('hour', v."startedAt") FROM "Visit" v`,
    `SELECT "createdAt"::date AS day FROM "Post"`,
    `SELECT (u."createdAt" AT TIME ZONE 'UTC')::date FROM "User" u`,
  ];
  for (const sql of naive) assert.equal(sqlCalendarCuts(`const q = \`${sql}\`;`).naive.length, 1, `missed: ${sql}`);
  const fine = [
    `SELECT EXTRACT(HOUR FROM ("endedAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') FROM "Visit"`,
    `SELECT max(EXTRACT(EPOCH FROM ("endedAt" - "startedAt"))) FROM "Visit"`,
    `INSERT INTO "MetricSnapshot" ("day") VALUES ($1::date)`,
    `SELECT (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')::date FROM "Post"`,
  ];
  for (const sql of fine) assert.deepEqual(sqlCalendarCuts(`const q = \`${sql}\`;`).naive, [], `flagged: ${sql}`);
  // A JavaScript function that happens to be called extract() is not SQL.
  assert.equal(sqlCalendarCuts(`const x = extract("createdAt");`).sites, 0);
});

/**
 * Consolidate the two office spreadsheets into the RosterEntry table, the
 * one clean roster the trust model matches signups against (Phase 3).
 *
 * Source (gitignored): "sanan's stuff/rough databases/roster.csv".
 *
 * That CSV is the two office spreadsheets flattened into one file on
 * 2026-08-26, every cell of all four person-sheets carried across and checked
 * back (44,646 cells, zero differences), with a `source_sheet` column saying
 * which sheet each row came from:
 *   - centenary-2026/Registrations  (Name / Email / Year of Passing)
 *   - rishivalley/Master, /Chennai, /TN  (Batch / "Name & initials" / Email;
 *     the initials after the comma are stripped, and Chennai/TN are filtered
 *     copies of Master that the dedupe collapses)
 *
 * The workbooks themselves are gone, and with them the `xlsx` dependency: the
 * owner has no more spreadsheets coming, and that package has been frozen on
 * npm since 2022 with two advisories only fixable from the vendor's own CDN,
 * where neither Renovate nor the audit gate could ever see them.
 *
 * Deliberately imports NOTHING beyond name/email/year -- no phones, no
 * addresses, no admission numbers. A roster row is a person who never signed
 * up; holding more of their data than matching needs is liability without
 * function, and auto-filling profiles from the sheets is explicitly off
 * (owner call, 2026-08-19).
 *
 * Usage:
 *   node scripts/dev/import-roster.mjs                  # dry run: counts only
 *   node scripts/dev/import-roster.mjs --apply          # replace the table
 *   node scripts/dev/import-roster.mjs --match-existing # + report (or with
 *       --apply, verify) existing unverified members the roster vouches for
 *
 * Re-runnable: --apply replaces every imported row wholesale (the sheets are
 * the source of truth), leaving only the probe's own marker rows alone.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { loadEnv } from "./_env.mjs";
import {
  normalizeRosterName,
  stripRosterInitials,
  rosterNameMatches,
  rosterYearMatches,
} from "../../src/lib/roster-rule.ts";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const APPLY = process.argv.includes("--apply");
const MATCH_EXISTING = process.argv.includes("--match-existing");

loadEnv();

const DIR = "sanan's stuff/rough databases";
const ROSTER_CSV = `${DIR}/roster.csv`;
if (!existsSync(ROSTER_CSV)) {
  console.error(`missing: ${ROSTER_CSV}`);
  process.exit(1);
}

/* A quoted-field CSV parser, ~20 lines, rather than a dependency: this file's
   whole point now is that reading the roster needs nothing from npm. Handles
   the two things that actually occur in these sheets -- commas inside
   addresses and doubled quotes inside names. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') { field += '"'; i++; }
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/* An empty CSV cell means absent, which is what the workbooks expressed as
   null. Everything downstream was written against null. */
const cell = (v) => (typeof v === "string" && v.trim() === "" ? null : v);

function readRoster() {
  const parsed = parseCsv(readFileSync(resolve(repoRoot, ROSTER_CSV), "utf8"));
  const header = parsed[0];
  return parsed.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, cell(r[i])])));
}

/** Clean one raw row into an entry, or null if it has no usable name. */
function toEntry(rawName, rawEmail, rawYear, source) {
  if (typeof rawName !== "string" || !rawName.trim()) return null;
  const fullName = stripRosterInitials(rawName);
  const normalizedName = normalizeRosterName(fullName);
  if (!normalizedName) return null;

  /* `!email` as well as the pattern, because an empty string is falsy and would
     otherwise slip past a truthiness guard and out of this function as "".
     The dedupe key is `e.email ?? name|year`, and "" is not nullish -- every
     person without an email would collapse onto the one key "". The workbook
     reader never produced "" (xlsx gave null), so this only ever mattered once
     the CSV reader did, which is exactly when it was caught. */
  let email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;

  let batchYear = null;
  const y = Number(rawYear);
  // The school opened in 1926; anything outside a sane window is a typo or a
  // spreadsheet artefact and is imported as "no year" rather than invented.
  if (Number.isInteger(y) && y >= 1926 && y <= 2035) batchYear = y;

  return { fullName, normalizedName, email, batchYear, source };
}

/* Which columns carry the name and the year differs by origin sheet, and the
   `source` recorded against a RosterEntry row is unchanged from the workbook
   era so the table's existing rows and any new import agree. */
const SHEETS = {
  "centenary-2026/Registrations": { name: "Name", year: "Year of Passing", source: "centenary-2026" },
  "rishivalley/Master": { name: "Name & initials", year: "Batch", source: "master" },
  "rishivalley/Chennai": { name: "Name & initials", year: "Batch", source: "master" },
  "rishivalley/TN": { name: "Name & initials", year: "Batch", source: "master" },
};

const entries = [];
const tally = new Map();
for (const r of readRoster()) {
  const sheet = r["source_sheet"];
  const spec = SHEETS[sheet];
  if (!spec) {
    console.error(`unknown source_sheet in roster.csv: ${JSON.stringify(sheet)}`);
    process.exit(1);
  }
  const t = tally.get(sheet) ?? { read: 0, kept: 0 };
  t.read += 1;
  const e = toEntry(r[spec.name], r["Email"], r[spec.year], spec.source);
  if (e) {
    entries.push(e);
    t.kept += 1;
  }
  tally.set(sheet, t);
}
for (const [sheet, t] of tally) console.log(`${sheet}: ${t.read} rows read, ${t.kept} usable`);

/* Dedupe. An email identifies a person outright; without one, the same
   name+year from two sheets is one person. A row that brings an email KEEPS
   it over a keeps-nothing duplicate, so match-by-email loses nothing. */
const byKey = new Map();
for (const e of entries) {
  const key = e.email ?? `${e.normalizedName}|${e.batchYear ?? "?"}`;
  const prev = byKey.get(key);
  if (!prev || (!prev.email && e.email) || (prev.batchYear == null && e.batchYear != null)) {
    byKey.set(key, { ...prev, ...e });
  }
}
// An emailed row also collapses its email-less twin (same name+year).
for (const e of [...byKey.values()]) {
  if (e.email) byKey.delete(`${e.normalizedName}|${e.batchYear ?? "?"}`);
}
const clean = [...byKey.values()];
const withEmail = clean.filter((e) => e.email).length;
const withYear = clean.filter((e) => e.batchYear != null).length;
console.log(
  `\nconsolidated: ${clean.length} people (${withEmail} with an email, ${withYear} with a year)`
);

const db = new pg.Client(withDatabaseTls(process.env.DIRECT_URL || process.env.DATABASE_URL));
await db.connect();

if (APPLY) {
  await db.query(`DELETE FROM "RosterEntry" WHERE source <> 'phase3-probe'`);
  const CHUNK = 500;
  for (let i = 0; i < clean.length; i += CHUNK) {
    const slice = clean.slice(i, i + CHUNK);
    const values = [];
    const params = [];
    slice.forEach((e, j) => {
      const base = j * 6;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      params.push(
        `roster_${randomBytes(8).toString("hex")}`,
        e.fullName,
        e.normalizedName,
        e.email,
        e.batchYear,
        e.source
      );
    });
    await db.query(
      `INSERT INTO "RosterEntry" (id, "fullName", "normalizedName", email, "batchYear", source) VALUES ${values.join(",")}`,
      params
    );
  }
  const { rows } = await db.query(`SELECT count(*) FROM "RosterEntry" WHERE source <> 'phase3-probe'`);
  console.log(`applied: RosterEntry now holds ${rows[0].count} rows`);
} else {
  console.log("dry run: nothing written (pass --apply to replace the table)");
}

if (MATCH_EXISTING) {
  /* The backfill: members already signed up and email-confirmed but never
     verified, whom the roster vouches for. Same rule as src/lib/roster.ts,
     via the same imported functions. */
  const { rows: members } = await db.query(
    `SELECT id, name, email, "batchYear", "yearLeft", "verifyState"
     FROM "User"
     WHERE "verifyState" IN ('unverified', 'pending') AND "emailVerified" IS NOT NULL
       AND email NOT LIKE '%@probe.invalid'`
  );
  console.log(`\nmatch-existing: ${members.length} confirmed-but-unverified member(s)`);
  for (const m of members) {
    const emailHit = clean.some((e) => e.email && e.email === m.email.toLowerCase());
    const nameHit =
      !emailHit &&
      clean.some(
        (e) => rosterYearMatches(e.batchYear, m) && rosterNameMatches(m.name, e.normalizedName)
      );
    if (!emailHit && !nameHit) {
      console.log(`  no match   ${m.name} <${m.email}>`);
      continue;
    }
    const how = emailHit ? "email" : "name+batch";
    if (APPLY) {
      /* `verifyStateAt` too, which the schema's own comment demands of every
         writer of verifyState and which this one alone omitted (audit C-046).
         It defaults to now() at row creation and is never touched again, so a
         member verified by this script kept their SIGNUP timestamp -- and the
         admin worklist orders "recently verified" and "waiting longest" by
         that column, so an entire import batch sorted as though it had never
         happened and never surfaced in the recently-verified view. */
      await db.query(
        `UPDATE "User" SET "verifyState" = 'verified', "verifyMethod" = 'office_list',
                "verifiedAt" = now(), "verifyStateAt" = now()
         WHERE id = $1 AND "verifyState" IN ('unverified', 'pending')`,
        [m.id]
      );
      console.log(`  VERIFIED   ${m.name} <${m.email}> (${how})`);
    } else {
      console.log(`  would verify  ${m.name} <${m.email}> (${how})`);
    }
  }
}

await db.end();

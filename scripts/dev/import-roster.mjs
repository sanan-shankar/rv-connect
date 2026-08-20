/**
 * Consolidate the two office spreadsheets into the RosterEntry table, the
 * one clean roster the trust model matches signups against (Phase 3).
 *
 * Sources (gitignored, in "sanan's stuff/rough databases/"):
 *   - Centenary Alum meet registrations 2026-06-18.xlsx, sheet "Registrations"
 *     (Name / Email / Year of Passing)
 *   - rishivalley.xls, sheets Master + Chennai + TN
 *     (Batch / "Name & initials" / Email; the initials after the comma are
 *     stripped, and Chennai/TN are filtered copies of Master that the dedupe
 *     collapses)
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
import { createRequire } from "node:module";
// xlsx ships CJS-first; namespace-importing it under ESM yields a module
// object whose functions sit one level down. require() gets the real thing.
const XLSX = createRequire(import.meta.url)("xlsx");
import {
  normalizeRosterName,
  stripRosterInitials,
  rosterNameMatches,
  rosterYearMatches,
} from "../../src/lib/roster-rule.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);

const APPLY = process.argv.includes("--apply");
const MATCH_EXISTING = process.argv.includes("--match-existing");

for (const line of readFileSync(resolve(repoRoot, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!m) continue;
  let v = m[2];
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  if (!(m[1] in process.env)) process.env[m[1]] = v;
}

const DIR = "sanan's stuff/rough databases";
const CENTENARY = `${DIR}/Centenary Alum meet registrations 2026-06-18.xlsx`;
const MASTER = `${DIR}/rishivalley.xls`;
for (const f of [CENTENARY, MASTER]) {
  if (!existsSync(f)) {
    console.error(`missing: ${f}`);
    process.exit(1);
  }
}

/** Clean one raw row into an entry, or null if it has no usable name. */
function toEntry(rawName, rawEmail, rawYear, source) {
  if (typeof rawName !== "string" || !rawName.trim()) return null;
  const fullName = stripRosterInitials(rawName);
  const normalizedName = normalizeRosterName(fullName);
  if (!normalizedName) return null;

  let email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) email = null;

  let batchYear = null;
  const y = Number(rawYear);
  // The school opened in 1926; anything outside a sane window is a typo or a
  // spreadsheet artefact and is imported as "no year" rather than invented.
  if (Number.isInteger(y) && y >= 1926 && y <= 2035) batchYear = y;

  return { fullName, normalizedName, email, batchYear, source };
}

const entries = [];

{
  const wb = XLSX.readFile(CENTENARY);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets["Registrations"], { defval: null });
  let kept = 0;
  for (const r of rows) {
    const e = toEntry(r["Name"], r["Email"], r["Year of Passing"], "centenary-2026");
    if (e) {
      entries.push(e);
      kept += 1;
    }
  }
  console.log(`centenary-2026: ${rows.length} rows read, ${kept} usable`);
}

{
  const wb = XLSX.readFile(MASTER);
  for (const sheet of ["Master", "Chennai", "TN"]) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null });
    let kept = 0;
    for (const r of rows) {
      const e = toEntry(r["Name & initials"], r["Email"], r["Batch"], "master");
      if (e) {
        entries.push(e);
        kept += 1;
      }
    }
    console.log(`master/${sheet}: ${rows.length} rows read, ${kept} usable`);
  }
}

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

const db = new pg.Client({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL });
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
      await db.query(
        `UPDATE "User" SET "verifyState" = 'verified', "verifyMethod" = 'office_list', "verifiedAt" = now()
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

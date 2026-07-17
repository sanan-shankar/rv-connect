#!/usr/bin/env node
/**
 * Import the GeoNames "cities500" gazetteer into the "Place" table, backing
 * the robust location picker (see prisma/migrations-manual/2026-07-18-round6.sql
 * and prisma/schema.prisma's Place/UserPlace models).
 *
 * Usage:
 *   node scripts/dev/import-places.mjs
 *
 * Downloads two files from download.geonames.org into a repo-local scratch
 * dir (.geonames-tmp/, gitignored):
 *   - cities500.zip           every place with population >= 500 (~230k rows)
 *   - admin1CodesASCII.txt    country+admin1 code -> readable state/province name
 * Unzips, parses the TSV, resolves each row's admin1 code to a readable name,
 * and bulk-inserts into "Place" in batches of 1000 via a single multi-VALUES
 * INSERT ... ON CONFLICT (id) DO NOTHING (safe to re-run). altNames is
 * truncated to a sane length since some rows carry hundreds of alt spellings.
 * Connects via DIRECT_URL (session pooler), like scripts/dev/run-sql.mjs,
 * since the transaction pooler (DATABASE_URL/pgbouncer) does not reliably
 * support the extended query protocol node-postgres uses for parameterized
 * multi-row inserts. Deletes .geonames-tmp/ when done (repo has a 5GB cap).
 */
import { readFileSync, existsSync, mkdirSync, rmSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import pg from "pg";

const CITIES_ZIP_URL = "https://download.geonames.org/export/dump/cities500.zip";
const ADMIN1_URL = "https://download.geonames.org/export/dump/admin1CodesASCII.txt";
const TMP_DIR = resolve(process.cwd(), ".geonames-tmp");
const ZIP_PATH = resolve(TMP_DIR, "cities500.zip");
const CITIES_TXT_PATH = resolve(TMP_DIR, "cities500.txt");
const ADMIN1_PATH = resolve(TMP_DIR, "admin1CodesASCII.txt");
const ALT_NAMES_MAX = 400;
const BATCH_SIZE = 1000;
const PLACE_COLUMNS = ["id", "name", "asciiName", "altNames", "lat", "lng", "country", "admin1", "population"];

function loadEnv() {
  const vars = {};
  for (const file of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(m[1] in vars)) vars[m[1]] = v;
    }
  }
  return vars;
}

async function downloadFile(url, dest) {
  console.log(`Downloading ${url} ...`);
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
  await pipeline(res.body, createWriteStream(dest));
}

/** Parse admin1CodesASCII.txt into a "CC.admin1code" -> readable name map. */
function parseAdmin1Map(text) {
  const map = new Map();
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const [code, name] = line.split("\t");
    if (code && name) map.set(code, name);
  }
  return map;
}

/** Parse one cities500.txt TSV line into a Place row, or null if unusable. */
function parseCityLine(line, admin1Map) {
  if (!line) return null;
  const f = line.split("\t");
  // geonameid, name, asciiname, alternatenames, latitude, longitude,
  // feature class, feature code, country code, cc2, admin1 code, admin2
  // code, admin3 code, admin4 code, population, elevation, dem, timezone,
  // modification date
  const id = Number.parseInt(f[0], 10);
  const name = f[1];
  const asciiName = f[2] || f[1];
  const altNamesRaw = f[3] || "";
  const lat = Number.parseFloat(f[4]);
  const lng = Number.parseFloat(f[5]);
  const country = f[8] || "";
  const admin1Code = f[10] || "";
  const population = Number.parseInt(f[14], 10);

  if (!Number.isInteger(id) || !name || !Number.isFinite(lat) || !Number.isFinite(lng) || !country) {
    return null;
  }

  const admin1 = admin1Code ? admin1Map.get(`${country}.${admin1Code}`) || null : null;
  const altNames = altNamesRaw.length > ALT_NAMES_MAX ? altNamesRaw.slice(0, ALT_NAMES_MAX) : altNamesRaw || null;

  return {
    id,
    name,
    asciiName,
    altNames,
    lat,
    lng,
    country,
    admin1,
    population: Number.isFinite(population) ? population : 0,
  };
}

/** Insert a batch of Place rows via one multi-VALUES INSERT ... ON CONFLICT DO NOTHING. */
async function insertBatch(client, rows) {
  if (rows.length === 0) return 0;
  const cols = PLACE_COLUMNS;
  const values = [];
  const tuples = rows.map((row, i) => {
    const base = i * cols.length;
    const placeholders = cols.map((_, j) => `$${base + j + 1}`).join(", ");
    for (const col of cols) values.push(row[col]);
    return `(${placeholders})`;
  });
  const sql = `
    INSERT INTO "Place" ("${cols.join('", "')}")
    VALUES ${tuples.join(", ")}
    ON CONFLICT (id) DO NOTHING
  `;
  const res = await client.query(sql, values);
  return res.rowCount || 0;
}

async function main() {
  mkdirSync(TMP_DIR, { recursive: true });

  await Promise.all([downloadFile(CITIES_ZIP_URL, ZIP_PATH), downloadFile(ADMIN1_URL, ADMIN1_PATH)]);

  console.log("Unzipping cities500.zip ...");
  execFileSync("unzip", ["-o", ZIP_PATH, "-d", TMP_DIR], { stdio: "inherit" });

  const admin1Map = parseAdmin1Map(readFileSync(ADMIN1_PATH, "utf8"));
  console.log(`Loaded ${admin1Map.size} admin1 codes.`);

  const lines = readFileSync(CITIES_TXT_PATH, "utf8").split("\n");
  console.log(`Read ${lines.length} lines from cities500.txt.`);

  const env = loadEnv();
  const url = env.DIRECT_URL || env.DATABASE_URL;
  if (!url) {
    console.error("No DIRECT_URL or DATABASE_URL found in .env.local/.env");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let inserted = 0;
  let parsed = 0;
  let skipped = 0;
  let batch = [];

  try {
    for (const line of lines) {
      if (!line.trim()) continue;
      const row = parseCityLine(line, admin1Map);
      if (!row) {
        skipped++;
        continue;
      }
      parsed++;
      batch.push(row);
      if (batch.length >= BATCH_SIZE) {
        inserted += await insertBatch(client, batch);
        batch = [];
        if (parsed % 20000 < BATCH_SIZE) console.log(`  ... ${parsed} parsed, ${inserted} inserted so far`);
      }
    }
    if (batch.length > 0) inserted += await insertBatch(client, batch);

    const { rows: countRows } = await client.query('SELECT count(*)::int AS count FROM "Place"');
    console.log(`\nDone. Parsed ${parsed} rows (${skipped} skipped as unusable).`);
    console.log(`Inserted ${inserted} new rows this run. "Place" now has ${countRows[0].count} total rows.`);
  } finally {
    await client.end();
  }
}

main()
  .catch((err) => {
    console.error("Import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    if (existsSync(TMP_DIR)) {
      rmSync(TMP_DIR, { recursive: true, force: true });
      console.log(`Cleaned up ${TMP_DIR}`);
    }
  });

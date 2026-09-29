#!/usr/bin/env node
/**
 * Option A tooling, step 1: scan every distinct UserPlace.city value and flag
 * likely duplicate-name groups for human review (colonial-era renames like
 * Bombay/Mumbai, plus generic fuzzy near-matches). This never writes anything;
 * it only prints candidates. Confirm/edit the groups, then run
 * merge-cities.ts with the confirmed config.
 *
 * Usage: npx tsx scripts/dev/city-alias-scan.ts
 */
import { loadEnv } from "./_env.mjs";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

loadEnv();
if (!process.env.DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

// Known renamed-city pairs (not caught by fuzzy matching since spellings
// diverge completely). Extend this list as more surface.
const KNOWN_ALIASES: string[][] = [
  ["Bombay", "Mumbai"],
  ["Calcutta", "Kolkata"],
  ["Madras", "Chennai"],
  ["Bangalore", "Bengaluru"],
  ["Poona", "Pune"],
  ["Cochin", "Kochi"],
  ["Trivandrum", "Thiruvananthapuram"],
  ["Baroda", "Vadodara"],
  ["Mysore", "Mysuru"],
  ["Delhi", "New Delhi"],
  ["Gurgaon", "Gurugram"],
  ["Allahabad", "Prayagraj"],
  ["Simla", "Shimla"],
];

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

async function main() {
  const { PrismaClient } = await import("../../src/generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg(withDatabaseTls(process.env.DATABASE_URL!));
  const prisma = new PrismaClient({ adapter });

  const rows = await prisma.userPlace.findMany({
    select: { city: true, placeId: true },
  });

  // Group by city, count usage + distinct placeIds actually in use.
  const byCity = new Map<string, { count: number; placeIds: Set<number | null> }>();
  for (const r of rows) {
    const entry = byCity.get(r.city) ?? { count: 0, placeIds: new Set() };
    entry.count++;
    entry.placeIds.add(r.placeId);
    byCity.set(r.city, entry);
  }
  const cities = [...byCity.keys()];

  console.log(`${cities.length} distinct city values across ${rows.length} UserPlace rows.\n`);

  console.log("=== Known-alias pairs present in the data ===");
  for (const [a, b] of KNOWN_ALIASES) {
    const hasA = byCity.has(a);
    const hasB = byCity.has(b);
    if (hasA && hasB) {
      console.log(`  "${a}" (${byCity.get(a)!.count}) + "${b}" (${byCity.get(b)!.count})`);
    }
  }

  console.log("\n=== Fuzzy near-matches (edit distance <= 2, excluding known-alias pairs) ===");
  const knownSet = new Set(KNOWN_ALIASES.flatMap((pair) => pair));
  const reported = new Set<string>();
  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const a = cities[i], b = cities[j];
      if (knownSet.has(a) && knownSet.has(b)) continue; // already covered above
      const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
      if (dist > 0 && dist <= 2 && Math.min(a.length, b.length) >= 4) {
        const key = [a, b].sort().join(" | ");
        if (reported.has(key)) continue;
        reported.add(key);
        console.log(`  "${a}" (${byCity.get(a)!.count}) ~ "${b}" (${byCity.get(b)!.count}) [dist ${dist}]`);
      }
    }
  }

  // Also flag cities where the same name resolves to >1 distinct placeId
  // (a different kind of split: same spelling, different gazetteer rows,
  // e.g. what "Delhi" was before the earlier fix).
  console.log("\n=== Same city name, multiple placeIds in use (needs a canonical pick) ===");
  for (const [city, info] of byCity) {
    if (info.placeIds.size > 1) {
      console.log(`  "${city}": placeIds = ${[...info.placeIds].join(", ")} (${info.count} rows)`);
    }
  }

  await prisma.$disconnect();
}
main();

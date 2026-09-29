#!/usr/bin/env node
/**
 * Option A tooling, step 2: apply a confirmed city merge. Given a canonical
 * Place row (by geonameid) and a list of variant city names that should all
 * collapse into it, rewrites every matching UserPlace row's city/label/
 * placeId AND lat/lng (the directory map clusters by coordinates, not
 * placeId, so lat/lng must be snapped too or "merged" pins still split on
 * the map — this bit us on the earlier Delhi merge).
 *
 * Reusable: edit VARIANTS/CANONICAL_PLACE_ID below per merge, or lift this
 * into a CLI arg if this becomes a recurring job.
 *
 * Usage: npx tsx scripts/dev/merge-cities.ts
 */
import { loadEnv } from "./_env.mjs";
import { withDatabaseTls } from "../../src/lib/db-tls.ts";

loadEnv();
if (!process.env.DATABASE_URL) { console.error("No DATABASE_URL"); process.exit(1); }

// ─── Confirmed merge: Bangalore -> Bengaluru ────────────────────────────────
const CANONICAL_NAME = "Bengaluru";
const CANONICAL_PLACE_ID = null as number | null; // resolved below by lookup
const VARIANT_NAMES = ["Bangalore", "Bengaluru"]; // any UserPlace.city in this list gets collapsed

async function main() {
  const { PrismaClient } = await import("../../src/generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg(withDatabaseTls(process.env.DATABASE_URL!));
  const prisma = new PrismaClient({ adapter });

  // Find the canonical Place row (Bengaluru, IN) by name to get its lat/lng + id.
  const candidates = await prisma.place.findMany({
    where: { name: { equals: CANONICAL_NAME, mode: "insensitive" }, country: "IN" },
    orderBy: { population: "desc" },
  });
  if (candidates.length === 0) {
    console.error(`No Place row found for "${CANONICAL_NAME}" in IN`);
    process.exit(1);
  }
  const canonical = candidates[0];
  console.log("Canonical Place:", canonical.id, canonical.name, canonical.admin1, canonical.lat, canonical.lng);

  const rows = await prisma.userPlace.findMany({
    where: { city: { in: VARIANT_NAMES, mode: "insensitive" } },
    include: { user: { select: { name: true } } },
  });

  for (const row of rows) {
    const needsUpdate =
      row.city !== canonical.name ||
      row.placeId !== canonical.id ||
      row.lat !== canonical.lat ||
      row.lng !== canonical.lng;
    if (!needsUpdate) {
      console.log("skip (already correct):", row.user.name);
      continue;
    }
    const newLabel = row.label.includes(",")
      ? `${canonical.name}, ${row.label.split(",").slice(1).join(",").trim()}`
      : canonical.name;
    const updated = await prisma.userPlace.update({
      where: { id: row.id },
      data: { city: canonical.name, label: newLabel, placeId: canonical.id, lat: canonical.lat, lng: canonical.lng },
    });
    console.log("updated:", row.user.name, "->", { city: updated.city, label: updated.label, placeId: updated.placeId });
  }

  await prisma.$disconnect();
}
main();

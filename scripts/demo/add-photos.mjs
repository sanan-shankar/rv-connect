#!/usr/bin/env node
/**
 * Turn a folder of photographs into Collection entries for the demo.
 *
 *   1. Put image files in  demo-photos/  at the repo root (any format sharp
 *      reads: jpg, png, webp, tiff, avif, gif).
 *   2. Name each file with the caption you want under it. The filename IS the
 *      caption, so "Morning assembly under the banyan, 1998.jpg" becomes
 *      exactly that. A four-digit year anywhere in the name is picked up as
 *      the photo's year and sets its decade filter.
 *   3. node scripts/demo/add-photos.mjs
 *   4. npx tsx scripts/demo/seed-demo.ts
 *
 * It writes a 1600px display copy and a 480px thumbnail into
 * public/images/collection/, then regenerates
 * src/lib/demo-seed/photos.generated.ts, which content.ts merges into
 * DEMO_PHOTOS. Nothing hand-written is edited, so a rerun is always safe.
 *
 * Deliberately NOT an upload: these are ordinary files in /public, served by
 * Vercel's CDN. The demo owns no bucket and needs none, which is exactly why
 * it can afford to refuse every upload a visitor attempts.
 */

import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "../..");
const INBOX = resolve(ROOT, "demo-photos");
const OUT_DIR = resolve(ROOT, "public/images/collection");
const GENERATED = resolve(ROOT, "src/lib/demo-seed/photos.generated.ts");

// Matches the real upload pipeline in src/app/(main)/collection/actions.ts, so
// what the demo shows is the same shape and quality the live site produces.
const DISPLAY_PX = 1600;
const THUMB_PX = 480;
const QUALITY = 82;

const READABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif", ".gif"]);

/** People the generated photos are credited to, cycled through so the
 *  Collection does not look like one person uploaded everything. All of them
 *  are invented; see src/lib/demo-seed/people.ts. */
const CONTRIBUTORS = [
  "harsh-vardhan",
  "gita-raman",
  "ishaan-verma",
  "rukmini-iyer",
  "vikram-desai",
  "sarojini-bhatt",
];

/** Everyone who might love a photo, so the heart counts vary believably. */
const LOVERS = [
  "visitor", "rukmini-iyer", "sarojini-bhatt", "krishnan-menon", "vikram-desai",
  "nandita-rangan", "gita-raman", "farida-contractor", "sunita-devi", "naina-chopra",
  "riya-banerjee", "ishaan-verma", "meghna-pillai", "divya-reddy", "harsh-vardhan",
  "zoya-hussain", "priya-mathew", "tanvi-shah", "ananya-ghosh", "kabir-sethi",
];

/** Rewrite src/lib/demo-seed/photos.generated.ts from scratch. Always a full
 *  overwrite, never an append, so the file can only ever describe images that
 *  currently exist in the inbox. */
function writeGenerated(list) {
  writeFileSync(
    GENERATED,
    `/* GENERATED FILE. Do not edit by hand.
 *
 * Written by scripts/demo/add-photos.mjs from the images in demo-photos/.
 * Rerun that script to regenerate; your edits here will be overwritten.
 *
 * content.ts merges these into DEMO_PHOTOS, so everything here shows up in
 * the demo Collection after the next seed. Empty means the Collection falls
 * back to the six banyan framings in content.ts.
 *
 * To change a caption, rename the source file and rerun.
 */

import type { DemoPhoto } from "./content";

export const GENERATED_PHOTOS: DemoPhoto[] = ${JSON.stringify(list, null, 2)};
`,
  );
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function eraFor(year) {
  if (!year) return "unknown";
  if (year < 1960) return "pre-1960s";
  return `${Math.floor(year / 10) * 10}s`;
}

if (!existsSync(INBOX)) {
  mkdirSync(INBOX, { recursive: true });
  console.log(
    `Created ${INBOX}\n\n` +
      `Put your photographs in there, naming each file with the caption you\n` +
      `want shown under it, then run this again. For example:\n\n` +
      `  Morning assembly under the banyan, 1998.jpg\n` +
      `  The old library steps.jpg\n` +
      `  Rishi Konda from the north field, 2011.jpeg\n`,
  );
  process.exit(0);
}

const files = readdirSync(INBOX).filter((f) => READABLE.has(extname(f).toLowerCase()));

if (files.length === 0) {
  // Still regenerate, as empty. Returning early here would leave a stale
  // photos.generated.ts behind, and the entries in it name webp files that
  // emptying the inbox is usually the prelude to deleting: the seed would
  // then write Photo rows whose images 404 in the Collection grid.
  writeGenerated([]);
  console.log(
    `No images in ${INBOX}\n\n` +
      `Cleared src/lib/demo-seed/photos.generated.ts, so the Collection falls\n` +
      `back to the six banyan framings in content.ts.\n\n` +
      `Add photographs (named as the caption you want) and run this again.\n` +
      `Readable formats: ${[...READABLE].join(" ")}`,
  );
  process.exit(0);
}

console.log(`Found ${files.length} photograph${files.length === 1 ? "" : "s"}.\n`);

const entries = [];

for (const [i, file] of files.entries()) {
  const caption = basename(file, extname(file)).trim();
  const slug = slugify(caption);
  if (!slug) {
    console.warn(`  ! skipping "${file}": the name produces an empty slug`);
    continue;
  }

  // A four-digit year anywhere in the caption dates the photo. 1900 to next
  // year, so a stray number like "40 years on" is not mistaken for one.
  const yearMatch = caption.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : null;
  const thisYear = new Date().getFullYear();
  const photoYear = year && year >= 1900 && year <= thisYear ? year : null;

  const src = resolve(INBOX, file);
  const outName = `demo-${slug}`;

  // `withoutEnlargement` so a small original is never upscaled into softness.
  const display = sharp(src).rotate().resize(DISPLAY_PX, DISPLAY_PX, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const info = await display.webp({ quality: QUALITY }).toFile(resolve(OUT_DIR, `${outName}.webp`));

  await sharp(src)
    .rotate()
    .resize(THUMB_PX, THUMB_PX, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(resolve(OUT_DIR, `${outName}-thumb.webp`));

  // Deterministic pseudo-random love count: same photo always gets the same
  // hearts, so a reseed does not reshuffle the Collection's "Most loved" sort.
  const seed = [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const loveCount = 4 + (seed % 12);
  const loves = LOVERS.slice(0, loveCount);

  entries.push({
    slug,
    file: outName,
    uploader: CONTRIBUTORS[i % CONTRIBUTORS.length],
    caption,
    subject: "campus",
    era: eraFor(photoYear),
    photoYear,
    datePrecision: photoYear ? "year" : "unknown",
    loves,
    width: info.width,
    height: info.height,
  });

  console.log(
    `  ${caption}\n` +
      `    -> ${outName}.webp (${info.width}x${info.height})` +
      `${photoYear ? `, dated ${photoYear}` : ", undated"}`,
  );
}

writeGenerated(entries);

console.log(
  `\nWrote ${entries.length} entr${entries.length === 1 ? "y" : "ies"} to\n` +
    `  src/lib/demo-seed/photos.generated.ts\n\n` +
    `Next: npx tsx scripts/demo/seed-demo.ts\n`,
);

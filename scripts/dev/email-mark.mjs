#!/usr/bin/env node
/**
 * Rasterise the app mark for use in emails.
 *
 *   node scripts/dev/email-mark.mjs
 *
 * Reads src/app/icon.svg (the PeaksMark on its canopy tile, the same art the
 * favicon and the home-screen icon use) and writes a PNG to
 * public/images/email/mark.png.
 *
 * A PNG and not the SVG itself because Gmail strips <svg> from mail outright,
 * and an <img> pointed at an .svg is blocked or blank in most other clients
 * too. 88px for a 44px slot, so it stays crisp on a phone.
 *
 * Run this whenever src/app/icon.svg changes; nothing does it automatically,
 * because the mark is final (docs/spec/DESIGN-SYSTEM.md sec 1) and this should
 * be a deliberate act rather than a build step nobody reads.
 */
import sharp from "sharp";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(process.cwd(), "src/app/icon.svg");
const OUT_DIR = resolve(process.cwd(), "public/images/email");
const OUT = resolve(OUT_DIR, "mark.png");
const DISPLAY_PX = 44;

mkdirSync(OUT_DIR, { recursive: true });

// `density` is what tells sharp how finely to rasterise the vector before it
// resizes; left at the default 72 the source is rendered small and then scaled
// UP, which is how a crisp mark turns into a soft one.
const info = await sharp(readFileSync(SRC), { density: 400 })
  .resize(DISPLAY_PX * 2, DISPLAY_PX * 2)
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`mark.png  ${info.width}x${info.height}  ${info.size} bytes`);

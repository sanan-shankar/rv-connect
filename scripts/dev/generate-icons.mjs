/**
 * Generates every raster app icon from the one canonical mark.
 *
 * The mark itself lives in src/app/icon.svg (the two-plane PeaksMark on
 * Canopy-dark), which is all a browser tab ever needs. Home-screen and dock
 * installs need PNGs, and they need them in two different shapes:
 *
 *   - "any" icons keep the rx=96 rounded square, because Android's launcher
 *     and desktop installers paint them unmasked, corners and all.
 *   - apple-icon and the maskable icon are FULL BLEED squares, because iOS
 *     and Android's adaptive launcher clip the artwork to their own squircle.
 *     Ship them pre-rounded and the platform's mask eats into our corner
 *     radius, leaving four dark nubs where the two curves disagree.
 *
 * The maskable one additionally shrinks the ridge to 80% about the centre so
 * the whole range survives the most aggressive circular crop. Every peak then
 * sits 188px from centre at worst, inside the 204.8px safe radius.
 *
 * Run: node scripts/dev/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const source = readFileSync("src/app/icon.svg", "utf8");

/** The rounded corner is ours; the platform masks these itself. */
const fullBleed = source.replace(' rx="96"', "");

/** Wrap the art group in a 0.8 scale about the 512 canvas centre. */
const maskable = fullBleed
  .replace("<g transform=", '<g transform="translate(256 256) scale(0.8) translate(-256 -256)"><g transform=')
  .replace("</svg>", "</g></svg>");

const targets = [
  // iOS home screen. 180 is the size Apple asks for; it downsamples from here.
  { svg: fullBleed, size: 180, out: "src/app/apple-icon.png" },
  { svg: source, size: 192, out: "public/images/icons/icon-192.png" },
  { svg: source, size: 512, out: "public/images/icons/icon-512.png" },
  { svg: maskable, size: 512, out: "public/images/icons/icon-maskable-512.png" },
];

for (const { svg, size, out } of targets) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`${out}  ${size}x${size}`);
}

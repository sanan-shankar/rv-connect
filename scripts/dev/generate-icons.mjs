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
  /* The largest size anything actually asks for, and the reason it is here
     (owner, 2026-08-22, on a pixellated icon in his Mac dock: "I just want the
     max resolution possible that doesn't cause a problem").

     What consumes what: Android launchers and Chrome's install dialog stop at
     512. iOS reads apple-icon above and not this manifest at all. The one real
     consumer of anything larger is macOS -- Safari's Add to Dock reads the
     manifest, and a dock icon at the largest setting on a Retina display is
     1024 physical pixels, which the 512 was being stretched to fill.

     2048 was generated and then deleted rather than left in "just in case".
     No launcher, browser or OS requests it, so it would have been 50KB that
     only ever made the manifest longer -- and an icon list where half the
     entries are aspirational is one nobody can reason about later. If a
     display ever wants more, this file makes it one line. */
  { svg: source, size: 1024, out: "public/images/icons/icon-1024.png" },
];

for (const { svg, size, out } of targets) {
  /* 384 DPI rasterises the 512-unit SVG at 2730px, so every target here is
     SUPERSAMPLED and then reduced rather than drawn at its final size, which
     is what keeps the ridge's diagonals clean. The branch is for a future
     target big enough that 2730 would mean enlarging a smaller raster, which
     is the exact failure this whole file exists to avoid. */
  const density = size * 2 > 2730 ? Math.ceil((size * 2 * 72) / 512) : 384;
  await sharp(Buffer.from(svg), { density })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`${out}  ${size}x${size}`);
}

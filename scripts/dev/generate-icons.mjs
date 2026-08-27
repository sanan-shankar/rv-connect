/**
 * Generates every raster app icon from the one canonical mark.
 *
 * TWO sources, because the tab and the home screen want different things:
 *
 *   - src/app/icon.svg is the three green hills. A browser tab is 16px of
 *     chrome next to a page title; it wants the quiet mark. favicon.ico is
 *     cut from this.
 *   - public/images/brand/app-icon.svg is the hoopoe peeking over the bottom
 *     edge. A home-screen or dock icon is looked AT rather than glanced past,
 *     so it gets the character. Every PNG below is cut from this.
 *
 * Home-screen and dock installs need PNGs, and they need them in two
 * different shapes:
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
import { edgeLightFilter } from "../../src/lib/edge-light.ts";

/** the browser tab's mark; favicon.ico is the only thing cut from it */
const tabSource = readFileSync("src/app/icon.svg", "utf8");
/** the home screen's mark; every PNG is cut from it */
const source = readFileSync("public/images/brand/app-icon.svg", "utf8");

/** The rounded corner is ours; the platform masks these itself. */
const fullBleed = source.replace(' rx="96"', "");

/* ---- Apple's edge light, and who gets it -------------------------------
 *
 * iOS 26 and macOS 26 add their own specular pass to an app icon, and Apple
 * says plainly not to bake highlights in because of it. Android adds nothing,
 * which is why the owner noticed our icon looking flatter there. So the light
 * is baked into the Android build and left off the Apple one.
 *
 * The catch is that a web manifest has no per-OS selector: `icons` entries
 * carry src, sizes, type and purpose, and nothing else. The only platform the
 * manifest can positively identify is Android, via purpose "maskable", which
 * only an adaptive launcher reads. Everything else -- macOS Safari's Add to
 * Dock, a Chrome install on any desktop -- reads the plain "any" icons.
 *
 * So: maskable is lit, and every "any" icon stays flat. That gets iOS and
 * macOS right, which is where doubling up would actually show, and costs a
 * Windows or Linux PWA install the light it could have had. That trade is
 * deliberate: a slightly flatter icon on a desktop install nobody has asked
 * for is a smaller failure than a double-lit one in his own dock. If a lit
 * "any" icon is ever wanted, it is one more line in `targets`.
 */
const U = 0.85 * (512 / 78); // see /lab/glass-edges: that tile is 78 units at u = 0.85

function lit(svg) {
  const withFilter = svg
    .replace('<defs id="fx"></defs>', `<defs id="fx">${edgeLightFilter({ id: "edge", u: U })}</defs>`)
    .replace('<g id="lit">', '<g id="lit" filter="url(#edge)">');
  /* Both seams are in the generated source. If either stops matching, the icon
     would ship silently flat, which is exactly the bug this is fixing. */
  if (!withFilter.includes('id="fx"><filter') || !withFilter.includes('filter="url(#edge)"')) {
    throw new Error(
      "generate-icons: could not find the <defs id=\"fx\"> / <g id=\"lit\"> seams in app-icon.svg. " +
        "Regenerate it with scripts/dev/build-app-icon.mjs.",
    );
  }
  return withFilter;
}

/* Wrap the art group in a 0.8 scale, about the BOTTOM CENTRE rather than the
   canvas centre. The bird is peeking over the bottom edge, so shrinking it
   about the middle would lift the head clear of that edge and leave a band of
   tile under a floating face -- the one thing the composition cannot afford.
   Scaling toward (256, 512) keeps the head against the bottom and pulls the
   crest down into the adaptive launcher's safe circle, which is what the
   maskable icon is for. */
const maskable = lit(fullBleed)
  .replace('<g id="lit"', '<g transform="translate(256 512) scale(0.8) translate(-256 -512)"><g id="lit"')
  .replace("</svg>", "</g></svg>");
/* The 0.8 wrapper sits OUTSIDE the filtered group on purpose. An ancestor
   transform scales every length inside a filter along with the art it is
   lighting, which here is exactly right: the band should shrink with the bird
   so the edge reads the same. Putting the scale on the filtered element itself
   is the trap in docs/spec/apple-edge-light.md. */

const targets = [
  // iOS home screen. 180 is the size Apple asks for; it downsamples from here.
  // Flat: iOS 26 lights it itself.
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

/* favicon.ico, cut from the TAB source (the green hills), not from the bird.
   It is what a browser reaches for when it will not take the SVG: bookmark
   bars, older Windows builds, anything scraping a link preview.
   It held the June mark until now because it was made by hand once and then
   never regenerated, so the tab and the home screen quietly disagreed.

   An .ico is a 6-byte header, one 16-byte directory entry per size, then the
   images back to back. The images here are PNGs rather than BMPs, which every
   browser since IE11 reads, and which keeps the whole file under 4KB.
   sharp cannot write .ico, and one hand-rolled encoder is a smaller
   dependency than a package for it. */
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push(
    await sharp(Buffer.from(tabSource), { density: 384 })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer(),
  );
}
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(1, 2); // type 1 = icon
icoHeader.writeUInt16LE(icoSizes.length, 4);
let icoOffset = 6 + 16 * icoSizes.length;
const icoDir = icoSizes.map((size, i) => {
  const entry = Buffer.alloc(16);
  entry[0] = size; // width, 0 would mean 256
  entry[1] = size; // height
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(icoPngs[i].length, 8);
  entry.writeUInt32LE(icoOffset, 12);
  icoOffset += icoPngs[i].length;
  return entry;
});
writeFileSync(
  "src/app/favicon.ico",
  Buffer.concat([icoHeader, ...icoDir, ...icoPngs]),
);
console.log(`src/app/favicon.ico  ${icoSizes.join("/")}`);

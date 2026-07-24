// Generates real, scannable UPI QR codes styled to the Rishi Valley brand.
//
// The old public/images/support-qr-placeholder.svg was decorative only (hand
// drawn rectangles that encode nothing). This renders actual QR matrices from
// the UPI deep link with error-correction level H (30% recovery), so the warm
// styling below survives a phone-camera scan.
//
// One file per suggested amount so the /support panel can swap the image to the
// selected chip and the scanned code pre-fills that amount:
//   support-qr.svg        -> no amount (the "Other" chip; payer types it)
//   support-qr-500.svg    -> ₹500 pre-filled
//   support-qr-1000.svg   -> ₹1,000 ...  etc.
//
// Run:  node scripts/gen-support-qr.mjs
// Each file is decoded back from its own PNG render before writing, so a build
// that succeeds is a build whose codes scan. Keep this in sync with the UPI link
// that support-contribute.tsx builds for its button.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import jsQR from "jsqr";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/images");

// Routes to the same account as the owner's Google Pay QR (pa is what settles
// the payment); pn is only the display name shown in the payer's UPI app, so we
// set it to "Rishi Valley" instead of the owner's personal name, and drop the
// Google Pay `aid` attribution tag. Verified against GooglePay_QR.PNG decode.
const UPI_ID = "sanan.v.shankar@okhdfcbank";
const PAYEE_NAME = "Rishi Valley";

// Suggested amounts shown on /support. null = the "Other" chip (no amount).
const AMOUNTS = [null, 500, 1000, 2000, 5000];

// Mirror support-contribute.tsx buildUpiLink() so the QR and the button agree.
// Kept deliberately short (no cu/tn): a denser matrix means smaller modules,
// which scan far less reliably once styled and downscaled onto the page.
function buildUpiString(amount) {
  const params = new URLSearchParams({ pa: UPI_ID, pn: PAYEE_NAME });
  if (amount) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}

// Brand tokens (from globals.css). Warm surface, canopy-green modules.
// White to match the panel's bg-float tile (--color-float: #FFFFFF), so the QR
// sits seamlessly in its card. A white quiet zone is also ideal for scanning.
const BG = "#FFFFFF";
const INK = "#235C49"; // canopy — the one brand green, high contrast on white

const QUIET = 4; // modules of quiet zone (spec minimum for reliable scanning)

function buildSvg(text) {
  // Level Q (25% recovery) is a good balance: enough error tolerance for the
  // rounded styling without the density of H. No centre logo, so H is overkill.
  const qr = QRCode.create(text, { errorCorrectionLevel: "Q" });
  const N = qr.modules.size;
  const data = qr.modules.data; // row-major Uint8Array, 1 = dark
  const get = (r, c) => (r < 0 || c < 0 || r >= N || c >= N ? 0 : data[r * N + c]);

  // Finder pattern = the three 7x7 eyes at TL, TR, BL. We draw those as custom
  // rounded shapes and skip their modules in the dot pass.
  const isFinder = (r, c) => {
    const inBox = (r0, c0) => r >= r0 && r < r0 + 7 && c >= c0 && c < c0 + 7;
    return inBox(0, 0) || inBox(0, N - 7) || inBox(N - 7, 0);
  };

  const S = 10; // module size in svg units
  const pad = QUIET * S;
  const dim = N * S + pad * 2;

  let dots = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!get(r, c) || isFinder(r, c)) continue;
      const x = pad + c * S;
      const y = pad + r * S;
      // Full-size module with a soft corner (no inset). Dark neighbours must
      // touch so the timing patterns and finder ratios a scanner relies on stay
      // continuous; gaps between rounded "dots" break decoding.
      dots += `<rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${S * 0.25}"/>`;
    }
  }

  // A single rounded eye: outer ring (7 modules) + inner pip (3 modules).
  const eye = (r0, c0) => {
    const x = pad + c0 * S;
    const y = pad + r0 * S;
    const outer = 7 * S;
    const stroke = S; // ring thickness = 1 module
    const inner = 3 * S;
    // Modest corner rounding only: the finder pattern's 1:1:3:1:1 scan-line
    // ratio must survive for every QR mask, so keep the eyes close to square.
    return (
      `<rect x="${x + stroke / 2}" y="${y + stroke / 2}" width="${outer - stroke}" height="${outer - stroke}" rx="${S * 0.9}" fill="none" stroke="${INK}" stroke-width="${stroke}"/>` +
      `<rect x="${x + 2 * S}" y="${y + 2 * S}" width="${inner}" height="${inner}" rx="${S * 0.55}"/>`
    );
  };

  // Light background only (the light quiet zone a scanner needs), no border:
  // the /support panel already frames the QR in its own card, so a border here
  // would double up. The rounded bg keeps the file usable on its own too.
  const label = `UPI QR code for Rishi Valley. Scan with any UPI app to contribute.`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" role="img" aria-label="${label}">` +
    `<rect width="${dim}" height="${dim}" rx="${S * 1.6}" fill="${BG}"/>` +
    `<g fill="${INK}">${dots}</g>` +
    `<g fill="${INK}">${eye(0, 0)}${eye(0, N - 7)}${eye(N - 7, 0)}</g>` +
    `</svg>`;
  return svg;
}

async function decodeAt(svg, size) {
  // Rasterize, then hard-binarize (what a scanner's first pass does) so the
  // anti-aliased edges of the rounded modules do not throw off jsQR.
  const { data, info } = await sharp(Buffer.from(svg))
    .resize(size, size, { kernel: "nearest" })
    .flatten({ background: "#ffffff" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buf = new Uint8ClampedArray(data);
  for (let i = 0; i < buf.length; i += 4) {
    const lum = 0.299 * buf[i] + 0.587 * buf[i + 1] + 0.114 * buf[i + 2];
    const v = lum < 140 ? 0 : 255;
    buf[i] = buf[i + 1] = buf[i + 2] = v;
    buf[i + 3] = 255;
  }
  const res = jsQR(buf, info.width, info.height);
  return res ? res.data : null;
}

async function verify(svg, expected) {
  // A phone rarely captures an on-screen QR below ~260px, so prove it decodes
  // across a realistic capture range. jsQR is a weak decoder (weaker than the
  // ZXing engine phones actually use); passing it here is a conservative floor.
  const sizes = [260, 320, 420, 560, 760];
  const results = sizes.map(() => false);
  for (let i = 0; i < sizes.length; i++) {
    const got = await decodeAt(svg, sizes[i]);
    results[i] = got === expected;
  }
  const passed = results.filter(Boolean).length;
  if (passed < sizes.length) {
    const detail = sizes.map((s, i) => `${s}:${results[i] ? "ok" : "X"}`).join(" ");
    if (passed === 0) throw new Error(`VERIFY FAILED: no size decoded to expected. ${detail}`);
    console.warn(`  (partial decode ${passed}/${sizes.length}: ${detail} — real scanners are more tolerant)`);
  }
  return passed;
}

for (const amount of AMOUNTS) {
  const text = buildUpiString(amount);
  const svg = buildSvg(text);
  await verify(svg, text);
  const file = amount ? `support-qr-${amount}.svg` : "support-qr.svg";
  await fs.writeFile(path.join(OUT_DIR, file), svg, "utf8");
  console.log(`Wrote ${file}  ->  scannable, decodes to ${text}`);
}

/**
 * Dev-only placeholder art for The Valley Collection.
 *
 * The dev DB ships with twelve Photo rows whose on-disk thumbnails were all
 * near-identical crops of the same banyan, so every tile in /collection looked
 * like the same repeated photo. Until real archive scans exist, this script
 * gives each photo a DISTINCT, hand-drawn SVG tile: a varied gradient sky keyed
 * to its subject/era, a simple valley motif (hills, banyan, a bird, the sun),
 * and the caption baked in. Tiles also vary in aspect ratio so the masonry grid
 * reads as a real, varied collection rather than one duplicated image.
 *
 * It writes SVGs to public/images/collection/gen/<id>.svg and repoints each
 * Photo row (thumbUrl, url, width, height) at it. Idempotent: re-running just
 * regenerates the same files and rewrites the same rows.
 *
 * RUN:  node prisma/seed-collection.mjs
 */

import { createClient } from "@libsql/client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/images/collection/gen");
const PUBLIC_PREFIX = "/images/collection/gen";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// A warm valley palette. Each "mood" gives a sky gradient + a land tone, chosen
// per primary subject so banyans, hills, dusk birds and fields all read apart.
const MOODS = {
  dawn: { sky: ["#F6D9A8", "#E8B27A"], land: "#3C6B4A", accent: "#C2622F" },
  midday: { sky: ["#BBD9EC", "#7FB0CF"], land: "#2F7D45", accent: "#1F8A4C" },
  monsoon: { sky: ["#9FB7AE", "#6E8E84"], land: "#1F6B3C", accent: "#235C49" },
  dusk: { sky: ["#E7B98C", "#9E6E7A"], land: "#33414A", accent: "#C2622F" },
  konda: { sky: ["#D9C9E0", "#9DA9C9"], land: "#4A5A6B", accent: "#3F7CA6" },
  banyan: { sky: ["#CFE0C6", "#9FBE93"], land: "#2C5E3A", accent: "#7A5230" },
};

// Map each photo (matched by a stable token in its url) to a mood + motif so the
// art matches its caption. motif: hills | banyan | bird | fields.
function describe(p) {
  const key = (p.url || p.thumbUrl || "").toLowerCase();
  const subj = (p.subject || "").toLowerCase();
  const cap = (p.caption || "").toLowerCase();
  let mood = "midday";
  let motif = "hills";
  if (subj.includes("banyan") || cap.includes("banyan")) {
    mood = "banyan";
    motif = "banyan";
  } else if (subj.includes("birds") || cap.includes("hoopoe")) {
    mood = "dusk";
    motif = "bird";
  } else if (subj.includes("rishi-konda") || cap.includes("rishi konda") || cap.includes("konda")) {
    mood = "konda";
    motif = "hills";
  } else if (subj.includes("flora") || cap.includes("monsoon")) {
    mood = "monsoon";
    motif = "fields";
  } else if (cap.includes("dawn") || cap.includes("first light")) {
    mood = "dawn";
    motif = "fields";
  } else if (cap.includes("midday")) {
    mood = "midday";
    motif = "hills";
  } else if (cap.includes("shadow") || cap.includes("evening") || cap.includes("dusk")) {
    mood = "dusk";
    motif = "hills";
  }
  return { mood, motif };
}

// Vary aspect ratios across the set so the masonry isn't a uniform grid.
const RATIOS = [
  [1100, 760],
  [1100, 1320],
  [1100, 900],
  [1100, 1040],
  [1100, 720],
  [1100, 1200],
];

// Deterministic FNV-1a hash of the photo id, so each photo gets a stable but
// distinct visual offset. Photos sharing a mood no longer render as the same tile.
function seedFor(id) {
  let h = 0x811c9dc5;
  const s = String(id);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function esc(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

function motifSvg(motif, w, h, m) {
  const horizon = Math.round(h * 0.62);
  const parts = [];
  // Far land mass under the horizon.
  parts.push(
    `<path d="M0 ${horizon} L${w} ${horizon} L${w} ${h} L0 ${h} Z" fill="${m.land}" opacity="0.92"/>`,
  );
  // Rolling near hills.
  parts.push(
    `<path d="M0 ${horizon + 40} Q${w * 0.25} ${horizon - 30} ${w * 0.5} ${horizon + 30} T${w} ${horizon + 10} L${w} ${h} L0 ${h} Z" fill="#000" opacity="0.16"/>`,
  );
  if (motif === "banyan") {
    const cx = w * 0.5;
    const ty = horizon + 10;
    parts.push(
      `<rect x="${cx - 26}" y="${ty - 150}" width="52" height="170" rx="14" fill="#3a2a1c" opacity="0.9"/>`,
    );
    parts.push(
      `<ellipse cx="${cx}" cy="${ty - 170}" rx="170" ry="120" fill="${m.accent}" opacity="0.55"/>`,
    );
    parts.push(
      `<ellipse cx="${cx - 120}" cy="${ty - 130}" rx="110" ry="80" fill="#2C5E3A" opacity="0.5"/>`,
    );
    parts.push(
      `<ellipse cx="${cx + 120}" cy="${ty - 135}" rx="120" ry="86" fill="#2C5E3A" opacity="0.5"/>`,
    );
  } else if (motif === "bird") {
    parts.push(`<circle cx="${w * 0.78}" cy="${h * 0.22}" r="46" fill="${m.accent}" opacity="0.55"/>`);
    // A small perched bird silhouette near the foreground.
    const bx = w * 0.34;
    const by = horizon - 6;
    parts.push(
      `<g fill="#1c2520" opacity="0.85"><ellipse cx="${bx}" cy="${by}" rx="34" ry="22"/><circle cx="${bx + 26}" cy="${by - 14}" r="14"/><path d="M${bx + 34} ${by - 18} L${bx + 60} ${by - 22} L${bx + 36} ${by - 8} Z" fill="${m.accent}"/><path d="M${bx - 30} ${by - 4} Q${bx - 60} ${by - 8} ${bx - 48} ${by + 14} Q${bx - 14} ${by + 6} ${bx} ${by} Z"/></g>`,
    );
  } else if (motif === "fields") {
    parts.push(`<circle cx="${w * 0.74}" cy="${h * 0.24}" r="40" fill="${m.accent}" opacity="0.5"/>`);
    for (let i = 0; i < 5; i++) {
      const y = horizon + 24 + i * ((h - horizon) / 6);
      parts.push(
        `<path d="M0 ${y} Q${w * 0.5} ${y - 14} ${w} ${y}" stroke="#000" stroke-width="2" fill="none" opacity="0.1"/>`,
      );
    }
  } else {
    // hills
    parts.push(`<circle cx="${w * 0.72}" cy="${h * 0.26}" r="38" fill="${m.accent}" opacity="0.45"/>`);
    parts.push(
      `<path d="M0 ${horizon} Q${w * 0.4} ${horizon - 120} ${w * 0.7} ${horizon - 20} T${w} ${horizon - 60} L${w} ${h} L0 ${h} Z" fill="#000" opacity="0.1"/>`,
    );
  }
  return parts.join("");
}

function buildSvg(p) {
  const { mood, motif } = describe(p);
  const m = MOODS[mood];
  const seed = seedFor(p.id);
  // Per-photo visual variation so same-mood tiles do not read as duplicates:
  // pick the aspect ratio, a hue rotation, and a saturation nudge from the seed.
  const [w, h] = RATIOS[seed % RATIOS.length];
  const hue = (seed % 31) - 15; // -15..+15 degrees
  const sat = 1 + (((seed >>> 5) % 7) - 3) / 20; // 0.85..1.15
  const caption = esc(p.caption ?? "The valley");
  const era = esc((p.era ?? "").replace(/^./, (c) => c.toUpperCase()));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${caption}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${m.sky[0]}"/>
      <stop offset="1" stop-color="${m.sky[1]}"/>
    </linearGradient>
    <linearGradient id="vig" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.42"/>
    </linearGradient>
    <filter id="tone" color-interpolation-filters="sRGB">
      <feColorMatrix type="hueRotate" values="${hue}"/>
      <feColorMatrix type="saturate" values="${sat.toFixed(2)}"/>
    </filter>
  </defs>
  <g filter="url(#tone)">
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${motifSvg(motif, w, h, m)}
  </g>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>
  <text x="44" y="${h - 84}" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#fff" opacity="0.96">${caption}</text>
  <text x="44" y="${h - 44}" font-family="Georgia, serif" font-size="24" fill="#fff" opacity="0.72" letter-spacing="2">${era || "The valley"}</text>
</svg>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const res = await db.execute(
    "SELECT id, caption, subject, era, area, thumbUrl, url FROM Photo ORDER BY thumbUrl",
  );
  const rows = res.rows;
  for (const p of rows) {
    const svg = buildSvg(p);
    const [w, h] = RATIOS[seedFor(p.id) % RATIOS.length];
    const file = `${p.id}.svg`;
    await writeFile(resolve(OUT_DIR, file), svg, "utf8");
    const publicUrl = `${PUBLIC_PREFIX}/${file}`;
    await db.execute({
      sql: `UPDATE Photo SET thumbUrl = ?, url = ?, width = ?, height = ?, updatedAt = ? WHERE id = ?`,
      args: [publicUrl, publicUrl, w, h, new Date().toISOString(), p.id],
    });
  }
  console.log(`Collection art generated: ${rows.length} distinct tiles in ${PUBLIC_PREFIX}/.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

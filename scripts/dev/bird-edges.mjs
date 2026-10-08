// The mechanical half of the bird reviewer: every straight edge in every bird's source, listed.
//
// The owner's standing complaint about the glyphs (October 2026, and "I've asked you to do this
// multiple times") is the arbitrary sharp cut-off: a bill that ends in a flat chop, a wing whose
// edge is a ruler line, a shape that "looks like the image has been interrupted and cut up". Every
// such edge comes from one of three things in the SVG source, and all three can be found without
// rendering anything:
//   - an `L` command (a straight segment drawn on purpose)
//   - a `Z` that closes a subpath with a long straight chord back to its start point
//   - a <rect> or <line> element
// A straight edge is not automatically wrong (a chisel bill, a leg) -- but every one is a question
// the drawer has to answer, so this prints them all, per bird, with the two endpoints in viewBox
// units, for the reviewer to go and look at in the 600px render from bird-sheet.mjs.
//
//   node scripts/dev/bird-edges.mjs              every archetype
//   node scripts/dev/bird-edges.mjs 32 26        just these indices (ARCHES order)
//   node scripts/dev/bird-edges.mjs --min 8      only chords at least this long (default 5)
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = resolve(repoRoot, "src/components/common/bird-avatar-v2.tsx");

const argv = process.argv.slice(2);
const minIdx = argv.indexOf("--min");
const MIN_CHORD = minIdx >= 0 ? Number(argv[minIdx + 1]) : 5;
const only = argv.filter((a, k) => /^\d+$/.test(a) && argv[k - 1] !== "--min").map(Number);

const source = readFileSync(SRC, "utf8");
const start = source.indexOf("const ARCHES: Arche[] = [");
const end = source.indexOf("export const ARCHETYPES");
const body = source.slice(start, end);

// Split into archetypes on their `name:` line; the comment above each carries its index.
const parts = body.split(/\n\s*name: "/).slice(1);
const birds = parts.map((p, i) => ({ i, name: p.slice(0, p.indexOf('"')), src: p }));

/** Walks a path's d attribute and returns the straight edges in it. Handles the commands the
 *  birds actually use (M L Q A Z, absolute); anything else ends the walk for that path. */
function straightEdges(d) {
  const toks = d.match(/[MLQAZ]|-?\d*\.?\d+/gi) ?? [];
  const out = [];
  let k = 0;
  let cmd = null;
  let cur = null;
  let startPt = null;
  const num = () => Number(toks[k++]);
  while (k < toks.length) {
    const t = toks[k];
    if (/^[MLQAZ]$/i.test(t)) { cmd = t.toUpperCase(); k++; if (cmd === "Z") {
      if (cur && startPt) {
        const len = Math.hypot(cur[0] - startPt[0], cur[1] - startPt[1]);
        if (len >= MIN_CHORD) out.push({ kind: "Z chord", from: cur, to: startPt, len });
      }
      cur = startPt;
    } continue; }
    if (cmd === "M") { cur = [num(), num()]; startPt = cur; cmd = "L"; continue; }
    if (cmd === "L") { const p = [num(), num()]; out.push({ kind: "L", from: cur, to: p, len: Math.hypot(p[0] - cur[0], p[1] - cur[1]) }); cur = p; continue; }
    if (cmd === "Q") { num(); num(); cur = [num(), num()]; continue; }
    if (cmd === "A") { num(); num(); num(); num(); num(); cur = [num(), num()]; continue; }
    break;
  }
  return out;
}

const fmt = (p) => `(${+p[0].toFixed(1)},${+p[1].toFixed(1)})`;
let total = 0;
for (const b of birds) {
  if (only.length && !only.includes(b.i)) continue;
  const lines = [];
  for (const m of b.src.matchAll(/\bd="([^"]+)"/g)) {
    for (const e of straightEdges(m[1])) lines.push(`  ${e.kind.padEnd(8)} ${fmt(e.from)} -> ${fmt(e.to)}  ${e.len.toFixed(1)} units`);
  }
  // Template-literal paths (built in a .map) are listed once, unevaluated, so they are not missed.
  for (const m of b.src.matchAll(/\bd=\{`([^`]+)`\}/g)) {
    if (/\bL\b|\bL\d/.test(m[1])) lines.push(`  L in a templated path: ${m[1].slice(0, 60)}...`);
  }
  for (const m of b.src.matchAll(/<rect\b[^>]*>/g)) lines.push(`  rect     ${m[0].slice(0, 70)}`);
  for (const m of b.src.matchAll(/<line\b[^>]*>/g)) lines.push(`  line     ${m[0].slice(0, 70)}`);
  total += lines.length;
  console.log(`${String(b.i).padStart(2)} ${b.name}${lines.length ? "" : "  (no straight edges)"}`);
  for (const l of lines) console.log(l);
}
console.log(`\n${total} straight edges across ${only.length || birds.length} birds (chords under ${MIN_CHORD} units not listed).`);

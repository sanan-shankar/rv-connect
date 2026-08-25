/**
 * Distribution sanity check for the bird-avatar hash (run: `node src/lib/avatar.test.mjs`).
 *
 * No test runner is wired into this project, so this is a standalone assertion script. It mirrors
 * the salted FNV-1a in src/lib/avatar.ts and verifies, over thousands of cuid-shaped ids, that:
 *   - every species / colour / pose bucket lands within a generous band of its expected share
 *   - the three axes are decorrelated (no triple is wildly over-represented)
 *   - the two reserved birds stay reserved (see the block at the end)
 * The hashable set is 50 Rishi Valley species; 51 are drawn, the extra one being the Indian Roller
 * held back for the owner at index 50. The rendered avatars are currently background-less
 * (BG_MODE="none"), so the disc colour is not shown and the visual variety is 50 species x 2
 * poses (left/right); colour is still hashed so the disc-bearing modes work if re-enabled.
 * It throws (non-zero exit) on failure so it can gate a build if desired.
 */

import {
  speciesForMember,
  hashSpeciesFor,
  ROLLER_SPECIES_INDEX,
  ROLLER_RESERVED_USER_IDS,
  HOOPOE_SPECIES_INDEX,
  HOOPOE_HASH_REMAP_INDEX,
} from "./avatar.ts";

const SPECIES_COUNT = 50;
const COLOR_COUNT = 10;
const POSE_COUNT = 4;

function fnv1a(input) {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function axisIndex(seed, salt, count) {
  return ((fnv1a(salt + seed) >>> 13) >>> 0) % count;
}

function birdFor(seed) {
  const s = seed && seed.length > 0 ? seed : "valley";
  return {
    species: axisIndex(s, "species::", SPECIES_COUNT),
    color: axisIndex(s, "color::", COLOR_COUNT),
    pose: axisIndex(s, "pose::", POSE_COUNT),
  };
}

// cuid-shaped ids: shared "cmmz0" prefix (as real ids do) + timestamp + a high-entropy tail,
// so we exercise the hash the way 8000 genuinely distinct member ids would.
const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
function fakeCuid(n) {
  const base = "cmmz0" + (1700000000000 + n).toString(36);
  let tail = "";
  // mix the index through a couple of multiplicative steps for a varied, collision-free tail
  let x = (n + 1) * 2654435761;
  for (let i = 0; i < 16; i++) {
    x = (Math.imul(x, 0x01000193) ^ (i * 0x9e3779b9)) >>> 0;
    tail += ALPHA[x % 36];
  }
  return base + tail;
}

const N = 16000;
const species = new Array(SPECIES_COUNT).fill(0);
const color = new Array(COLOR_COUNT).fill(0);
const pose = new Array(POSE_COUNT).fill(0);
const triples = new Set();

for (let i = 0; i < N; i++) {
  const b = birdFor(fakeCuid(i));
  species[b.species]++;
  color[b.color]++;
  pose[b.pose]++;
  triples.add(`${b.species}-${b.color}-${b.pose}`);
}

const fails = [];
function checkAxis(name, counts, buckets, band) {
  const expected = N / buckets;
  counts.forEach((c, idx) => {
    const lo = expected * (1 - band);
    const hi = expected * (1 + band);
    if (c < lo || c > hi) {
      fails.push(`${name}[${idx}] = ${c}, expected ~${expected.toFixed(0)} (band ±${band * 100}%)`);
    }
  });
}

checkAxis("species", species, SPECIES_COUNT, 0.28);
checkAxis("color", color, COLOR_COUNT, 0.15);
checkAxis("pose", pose, POSE_COUNT, 0.1);

const distinct = triples.size;
if (distinct < 500) fails.push(`only ${distinct} distinct combinations observed, need >= 500`);

/* ---------------------------------------------------------------- *
 *  Parity: the mirror above and the real hash are still the same hash.
 *
 *  The distribution block deliberately re-implements the salted FNV-1a in
 *  plain JS, so a bug in avatar.ts cannot hide behind the same bug in its
 *  test. Sound -- but nothing asserted the two agreed on even one seed, so if
 *  avatar.ts changed its salt, its `>>> 13` window or its species count, the
 *  mirror would go on happily validating the OLD algorithm for ever and every
 *  band above would be a statement about code nobody runs (audit C-196).
 *
 *  The reserved block below imports the real module but only bounds the RANGE,
 *  so a degenerate-but-in-range regression passes it too. This is the tripwire
 *  that ties the two halves together. `hashSpeciesFor` remaps the Hoopoe, so
 *  the mirror is compared through the same remap.
 * ---------------------------------------------------------------- */
let mismatch = 0;
let firstMismatch = null;
for (let i = 0; i < 2000; i++) {
  const seed = fakeCuid(i);
  const raw = birdFor(seed).species;
  const mirrored = raw === HOOPOE_SPECIES_INDEX ? HOOPOE_HASH_REMAP_INDEX : raw;
  const real = hashSpeciesFor(seed);
  if (mirrored !== real) {
    mismatch++;
    if (!firstMismatch) firstMismatch = `${seed}: mirror ${mirrored}, avatar.ts ${real}`;
  }
}
if (mismatch > 0) {
  fails.push(
    `the test's mirror of the hash has parted ways with avatar.ts on ${mismatch}/2000 seeds ` +
      `(first: ${firstMismatch}) -- every distribution band above is now measuring the wrong algorithm`
  );
}

/* ---------------------------------------------------------------- *
 *  Reserved birds.
 *
 *  Unlike the distribution block above (which mirrors the hash in plain JS on purpose, so a bug in
 *  avatar.ts cannot hide behind the same bug in its test), these assertions import the real module:
 *  the point is the actual reservation, not an independent re-derivation of it.
 * ---------------------------------------------------------------- */
for (const id of ROLLER_RESERVED_USER_IDS) {
  const got = speciesForMember(id);
  if (got !== ROLLER_SPECIES_INDEX) {
    fails.push(`reserved id ${id} should wear the Indian Roller (${ROLLER_SPECIES_INDEX}), got ${got}`);
  }
}

// The Roller sits one past the end of the hashable pool, so no member can be dealt it by chance.
// This is the assertion that would catch someone "helpfully" raising BIRD_SPECIES_COUNT.
let highest = -1;
let lowest = SPECIES_COUNT;
for (let i = 0; i < 200000; i++) {
  const s = hashSpeciesFor(fakeCuid(i));
  if (s > highest) highest = s;
  if (s < lowest) lowest = s;
}
if (highest >= ROLLER_SPECIES_INDEX) {
  fails.push(`the hash reached species ${highest}; the Roller at ${ROLLER_SPECIES_INDEX} must be unreachable`);
}
if (lowest === HOOPOE_SPECIES_INDEX) {
  fails.push(`the hash reached the reserved Hoopoe at ${HOOPOE_SPECIES_INDEX}`);
}
console.log(`reserved: hash spans species ${lowest}..${highest}; Roller ${ROLLER_SPECIES_INDEX} and Hoopoe ${HOOPOE_SPECIES_INDEX} held back`);

console.log(`samples: ${N}`);
console.log(`distinct combinations observed: ${distinct} (max possible ${SPECIES_COUNT * COLOR_COUNT * POSE_COUNT})`);
console.log(`species spread: ${Math.min(...species)}..${Math.max(...species)} (expected ~${(N / SPECIES_COUNT).toFixed(0)})`);
console.log(`color spread:   ${Math.min(...color)}..${Math.max(...color)} (expected ~${(N / COLOR_COUNT).toFixed(0)})`);
console.log(`pose spread:    ${Math.min(...pose)}..${Math.max(...pose)} (expected ~${(N / POSE_COUNT).toFixed(0)})`);

if (fails.length) {
  console.error("\nDISTRIBUTION CHECK FAILED:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log("\nDISTRIBUTION CHECK PASSED");

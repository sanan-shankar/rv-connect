import assert from "node:assert/strict";
import test from "node:test";
import { decomment, read } from "./test-kit.mjs";

import { dealBird, tallyVisibleWearers, weightsFor } from "./avatar-deal.ts";
import {
  hashSpeciesFor,
  HOOPOE_SPECIES_INDEX,
  ROLLER_SPECIES_INDEX,
  speciesForMember,
} from "./avatar.ts";

/* ------------------------------------------------------------------ *
 *  The dealing rule (avatar-deal.ts), held to the owner's words:
 *  "make the occurrence of all the birds equal", "Maybe not zero, but
 *  less" (brief ¶37), "we will be assigning them the new birds. And then
 *  when the new birds kinda level up, then it goes more random" (¶38).
 *
 *  Every draw comes from a seeded generator, so each run sees the same
 *  numbers, and every band below holds for thousands of other seeds
 *  too: the seeds are not chosen to pass.
 * ------------------------------------------------------------------ */

/** mulberry32: a small seeded generator, repeatable to the draw. */
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const speciesList = (indices) => indices.map((index) => ({ index, slug: `s${index}` }));
const indexOf = (slug) => Number(slug.slice(1));

/** How many times each slug comes out of `draws` deals at fixed counts. */
function dealMany(counts, list, draws, seed) {
  const random = seeded(seed);
  const seen = new Map();
  for (let k = 0; k < draws; k++) {
    const slug = dealBird(counts, list, random);
    seen.set(slug, (seen.get(slug) ?? 0) + 1);
  }
  return seen;
}

/* Visible wearers per species on 2026-10-08: members with no photograph,
 * each counted under the bird BirdAvatar shows (birds-expansion handover,
 * session log; 510 members, 75 with a photograph). The Treepie's 21
 * includes the eleven members whose hash lands on the Hoopoe. */
const TODAY = new Map(
  Object.entries({
    19: 21, 7: 18, 29: 15, 38: 14, 8: 13, 37: 13, 2: 11, 4: 11, 12: 11, 16: 11, 23: 11, 34: 11,
    35: 11, 39: 11, 40: 11, 43: 11, 14: 10, 18: 10, 25: 10, 48: 10, 11: 9, 13: 9, 15: 9, 31: 9,
    33: 9, 3: 8, 22: 8, 41: 8, 49: 8, 1: 7, 9: 7, 10: 7, 17: 7, 26: 7, 30: 7, 32: 7, 42: 7, 45: 7,
    47: 7, 28: 6, 36: 6, 5: 5, 20: 5, 24: 5, 27: 4, 44: 4, 6: 3, 46: 3, 21: 1,
  }).map(([index, n]) => [Number(index), n])
);
const OLD = [...TODAY.keys()];
const OLD_MEAN = OLD.reduce((sum, i) => sum + TODAY.get(i), 0) / OLD.length; // 433 / 49, about 8.8

/* Twelve new species at zero, appended past the Roller where the
 * expansion puts them (51 and up), so the hash can never reach them. */
const NEW = Array.from({ length: 12 }, (_, k) => ROLLER_SPECIES_INDEX + 1 + k);
const WEARABLE = speciesList([...OLD, ...NEW]);
const startingCounts = () => new Map([...TODAY, ...NEW.map((i) => [i, 0])]);

test("a bird nobody wears is dealt about a hundred times as often as one worn by nine", () => {
  const list = speciesList([1, 2]);
  const counts = new Map([[1, 0], [2, 9]]);

  const [none, nine] = weightsFor(counts, list).map((s) => s.weight);
  assert.ok(Math.abs(none / nine - 100) < 1e-9, `the weights are ${none / nine}x apart, not 100x`);

  const seen = dealMany(counts, list, 1_000_000, 37);
  const ratio = seen.get("s1") / seen.get("s2");
  assert.ok(ratio > 95 && ratio < 105, `dealt ${ratio.toFixed(1)}x as often, expected about 100x`);
});

test("no bird's chance is ever zero: a crowded bird is dealt less, and still dealt", () => {
  for (const n of [0, 1, 9, 21, 100, 1_000, 10_000, 1_000_000]) {
    const [{ weight }] = weightsFor(new Map([[1, n]]), speciesList([1]));
    assert.ok(weight > 0 && Number.isFinite(weight), `a bird worn by ${n} weighs ${weight}`);
  }

  // Nine against ten is nearly even, which is what lets the deal go back
  // to random once the birds have levelled.
  const pair = weightsFor(new Map([[1, 9], [2, 10]]), speciesList([1, 2]));
  const [nine, ten] = pair.map((s) => s.weight);
  assert.ok(nine / ten < 1.25, `nine against ten is ${(nine / ten).toFixed(2)}x, not nearly even`);

  // ¶37's own example. The Common Kingfisher (38) is worn by 14 today, five
  // of them paid picks: it must be dealt clearly less than a bird worn by
  // seven, like the Indian Peafowl (1), and still be dealt.
  const seen = dealMany(startingCounts(), WEARABLE, 200_000, 38);
  const kingfisher = seen.get("s38") ?? 0;
  const peafowl = seen.get("s1") ?? 0;
  assert.ok(kingfisher > 0, "the Common Kingfisher was never dealt");
  assert.ok(kingfisher < peafowl / 2, `Kingfisher ${kingfisher} against Peafowl ${peafowl}`);
});

test("the Hoopoe and the Roller are never dealt, whatever list the deal is handed", () => {
  // Nobody wears either, against a bird worn by 21: if they were in the
  // draw at all they would take almost all of it.
  const list = speciesList([HOOPOE_SPECIES_INDEX, ROLLER_SPECIES_INDEX, 19]);
  const seen = dealMany(new Map([[19, 21]]), list, 1_000_000, 50);
  assert.deepEqual([...seen.keys()], ["s19"]);
  assert.deepEqual(weightsFor(new Map(), list).map((s) => s.index), [19]);

  // And across every drawn index at today's counts.
  const everything = speciesList(Array.from({ length: NEW.at(-1) + 1 }, (_, i) => i));
  const all = dealMany(startingCounts(), everything, 200_000, 51);
  assert.equal(all.get(`s${HOOPOE_SPECIES_INDEX}`), undefined, "the Hoopoe was dealt");
  assert.equal(all.get(`s${ROLLER_SPECIES_INDEX}`), undefined, "the Roller was dealt");

  assert.throws(() => dealBird(new Map(), speciesList([HOOPOE_SPECIES_INDEX]), Math.random));
});

test("when every bird is worn equally, the deal is even", () => {
  const counts = new Map(WEARABLE.map(({ index }) => [index, 10]));
  const each = 5_000;
  const seen = dealMany(counts, WEARABLE, WEARABLE.length * each, 61);
  for (const { slug } of WEARABLE) {
    const got = seen.get(slug) ?? 0;
    assert.ok(Math.abs(got - each) < each * 0.08, `${slug} dealt ${got} times, not about ${each}`);
  }
});

/* ¶38, end to end: today's counts plus twelve new birds at zero, then
 * three hundred signups, twenty times over. Pure chance would give the
 * twelve 12 / 61 of the deals, about ten of the first fifty.
 *
 * The spread (most-worn minus least-worn) closes from the bottom only.
 * Its top is history: the Treepie's 21 falls only when somebody leaves
 * it, so "levelled" here means the floor rising into the pack, not the
 * spread reaching zero. */
test("new birds are dealt first, then level into the pack", () => {
  const RUNS = 20;
  let newInFirst50 = 0;
  let spreadAt150 = 0;
  let floorAt150 = 0;
  let newMeanAt300 = 0;
  for (let run = 1; run <= RUNS; run++) {
    const counts = startingCounts();
    const random = seeded(run);
    for (let signup = 1; signup <= 300; signup++) {
      const index = indexOf(dealBird(counts, WEARABLE, random));
      counts.set(index, counts.get(index) + 1);
      if (signup <= 50 && index > ROLLER_SPECIES_INDEX) newInFirst50++;
      if (signup === 150) {
        const worn = [...counts.values()];
        spreadAt150 += Math.max(...worn) - Math.min(...worn);
        floorAt150 += Math.min(...worn);
      }
    }
    newMeanAt300 += NEW.reduce((sum, i) => sum + counts.get(i), 0) / NEW.length;
  }

  assert.ok(newInFirst50 / RUNS >= 30, `new birds took ${newInFirst50 / RUNS} of the first 50`);
  assert.ok(floorAt150 / RUNS >= 4, `the least-worn bird had ${floorAt150 / RUNS} after 150`);
  assert.ok(spreadAt150 / RUNS <= 18, `the spread was ${spreadAt150 / RUNS} after 150, from 21`);
  const newMean = (newMeanAt300 / RUNS).toFixed(1);
  assert.ok(
    newMeanAt300 / RUNS >= OLD_MEAN,
    `after 300 the new birds average ${newMean}, below the old birds' ${OLD_MEAN.toFixed(1)}`
  );
});

test("a member with a photograph is not counted: their bird is not showing", () => {
  const members = [
    { photoUrl: null, bird: 3 },
    { photoUrl: null, bird: 3 },
    { photoUrl: "https://images.rishivalley.space/u/a.webp", bird: 3 },
    { photoUrl: "", bird: 5 }, // BirdAvatar shows the bird for an empty string as well
  ];
  const counts = tallyVisibleWearers(members, (m) => m.bird);
  assert.deepEqual([...counts].sort((a, b) => a[0] - b[0]), [[3, 2], [5, 1]]);
});

/* A dealt slug resolves to an index past the Roller. speciesForMember used
 * to wrap an override modulo 51, which folded the first appended species,
 * 51, onto the Hoopoe. */
test("a species appended past the Roller is worn as itself, not folded onto the Hoopoe", () => {
  const seed = "cmr1dealtmemberxxxxxxxxxx";
  for (let index = 0; index <= 200; index++) {
    assert.equal(speciesForMember(seed, index), index);
  }
  // An index that never went through resolveBirdOverride cannot reach the
  // glyph as a negative or fractional number: it falls through to the hash.
  assert.equal(speciesForMember(seed, -1), hashSpeciesFor(seed));
  assert.equal(speciesForMember(seed, 51.5), hashSpeciesFor(seed));
});

/* What stands in for the wrap: every name the slug table can resolve has a
 * drawing. A name without one would reach BirdGlyphV2's own
 * `% ARCHES.length` and render as the Hoopoe. Counted from the source,
 * because node cannot load a .tsx file. */
test("every species name has a drawing", () => {
  const src = read("src/components/common/bird-avatar-v2.tsx");
  const archesAt = src.indexOf("const ARCHES: Arche[] = [");
  const namesAt = src.indexOf("export const SPECIES_FULL_NAMES: string[] = [");
  assert.ok(archesAt >= 0 && namesAt >= 0, "bird-avatar-v2.tsx moved its lists; update the anchors");

  const arches = src.slice(archesAt, src.indexOf("export const ARCHETYPES"));
  const drawn = arches.match(/\n\s*name: "/g) ?? [];
  const named = src.slice(namesAt, src.indexOf("];", namesAt)).match(/^\s*"[^"\n]+",?/gm) ?? [];
  assert.ok(drawn.length > ROLLER_SPECIES_INDEX, `found ${drawn.length} drawings; anchors drifted?`);
  assert.equal(named.length, drawn.length, `${named.length} names for ${drawn.length} drawings`);
});

/* A candidate drawing (a second take on a bird, appended while the birds
 * expansion runs, name ending " (candidate)") exists for the owner to compare
 * on a sheet. Until he keeps one, nobody wears it: the gallery, the paid
 * picker and the signup deal all read GALLERY_SPECIES, so that one filter is
 * the whole gate. */
test("a candidate drawing is never dealt, picked or listed until the owner keeps it", () => {
  const src = decomment(read("src/components/common/bird-avatar-v2.tsx"));
  const gallery = src.slice(src.indexOf("export const GALLERY_SPECIES"), src.indexOf("export function isCandidate"));
  assert.match(gallery, /!isCandidate\(name\)/, "GALLERY_SPECIES no longer filters candidates");
  assert.match(src, /function isCandidate[^{]*\{\s*return name\.endsWith\(" \(candidate\)"\)/, "isCandidate must test the \" (candidate)\" suffix");
});

test("signup deals the new member a bird and spends no supporter's pick", () => {
  const signup = decomment(read("src/components/auth/actions.ts"));
  assert.match(signup, /dealNewMemberBird\(\)/, "registerUser no longer deals a bird");
  // Best effort includes loading: the deal reads species lists built at
  // module load, which plate-data.ts makes throw on a missing plate bird. A
  // static import would turn that throw into a failed signup.
  assert.doesNotMatch(
    signup,
    /^import[^;]*avatar-deal-server/m,
    "deal import must sit inside registerUser's try: a failed load costs a bird, not an account"
  );
  assert.doesNotMatch(
    signup,
    /birdPickedAt/,
    "signup must not write birdPickedAt: that is what spends a supporter's pick (chooseBird)"
  );

  // The live count resolves each member the way BirdAvatar does, so paid
  // picks count under the bird they bought, and the deal hands out the
  // same list the paid picker offers.
  const server = decomment(read("src/lib/avatar-deal-server.ts"));
  assert.match(server, /speciesForMember\(/);
  assert.match(server, /resolveBirdOverride\(/);
  assert.match(server, /WEARABLE_SPECIES/);
});

test("the deal sits inside signup's try, so it can never throw out of registration", () => {
  /* The write-path review of U5 (2026-10-09) found that the test above only proved the call
     exists; a hoisted call outside the try would pass it. This one fails on exactly that. */
  const signup = read("src/components/auth/actions.ts");
  assert.match(
    signup,
    /try\s*\{[\s\S]{0,400}?await dealNewMemberBird\(\)[\s\S]{0,200}?\}\s*catch\s*\(/,
    "dealNewMemberBird() is not awaited inside a try/catch in registerUser"
  );
});

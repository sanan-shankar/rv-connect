/* ------------------------------------------------------------------ *
 *  The Catch-up's picture: the pool, the picker, and the three files
 *  that have to keep agreeing with it.
 *
 *  Run: node --test src/lib/catchup-pictures.test.mjs
 *
 *  The column is NOT NULL on purpose -- there is never a Catch-up
 *  without a picture, so there is never a no-picture layout to draw
 *  (spec 3.4, his reason at N23: "then we'd have to have 2 different
 *  architectures"). Everything below is what keeps that true: a pool
 *  whose files exist, a picker that always answers, a migration whose
 *  backfill is the same list in the same order, and creation paths that
 *  write one.
 *
 *  It matters most on the day more of HIS photographs arrive, which is
 *  meant to be one file and one edit to `CATCHUP_PICTURES` and no
 *  migration. These tests are what says whether that edit was complete.
 * ------------------------------------------------------------------ */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

import {
  CATCHUP_PICTURES,
  DEFAULT_PICTURE_FOCUS,
  PICTURE_BAND,
  PICTURE_BAND_RATIO,
  bandKeptFraction,
  isPoolPicture,
  isValidPictureFocus,
  pictureAvoiding,
  pictureFor,
} from "./catchup-pictures.ts";
import { ROOT, read, decomment } from "./test-kit.mjs";

test("the pool is a real pool: no duplicates, and every file is on disk", () => {
  assert.ok(CATCHUP_PICTURES.length >= 3, "too few photographs to spread six Catch-ups over");

  const seen = new Set();
  for (const picture of CATCHUP_PICTURES) {
    /* A duplicate is not a cosmetic problem: it shipped once (F46, `v1.webp`
       and `demo-banyan-pillar.webp` were the same photograph) and two of the
       first three cards on the list came out identical, which reads as a
       rendering bug rather than as a coincidence. */
    assert.ok(!seen.has(picture.src), `${picture.src} is in the pool twice`);
    seen.add(picture.src);

    assert.ok(
      picture.src.startsWith("/images/catchups/"),
      `${picture.src} is not in public/images/catchups; a pool entry is a shipped file ` +
        `in that folder, not a url (an uploaded picture reaches the column through setCatchupPicture)`
    );
    assert.ok(
      existsSync(resolve(ROOT, "public", picture.src.replace(/^\//, ""))),
      `${picture.src} is in the pool and not in public/ -- every Catch-up carrying it ` +
        `draws a broken image, and the column is NOT NULL so there is no fallback`
    );
    assert.ok(
      isValidPictureFocus(picture.focus),
      `${picture.src} has a focus (${picture.focus}) the picture control would refuse`
    );
  }
});

test("every pool photograph is the shape and size the band was measured for", async () => {
  /* The brief his photographs were asked for (handover, "The twenty
     photographs"): 2 : 1 and 2,400px wide or better. The band arithmetic and
     every focus in the pool assume it -- a 2 : 1 source keeps 31.6% of its
     height through the tightest band -- and the stand-ins this replaced were
     900px squares, upscaled at retina. A file that misses either is a
     question for him, not something to ship quietly. */
  for (const picture of CATCHUP_PICTURES) {
    const { width, height } = await sharp(resolve(ROOT, "public", picture.src.slice(1))).metadata();
    assert.ok(width >= 2400, `${picture.src} is ${width}px wide; the brief is 2,400 or better`);
    const ratio = width / height;
    assert.ok(
      Math.abs(ratio - 2) < 0.05,
      `${picture.src} is ${ratio.toFixed(3)} : 1, not 2 : 1; its focus and the band's safe zone assume 2 : 1`
    );
  }
});

test("a focus is a CSS object-position and nothing else", () => {
  assert.ok(isValidPictureFocus("center 85%"));
  assert.ok(isValidPictureFocus("30% 90%"));
  assert.ok(isValidPictureFocus("left bottom"));

  /* The value is interpolated into a style attribute on a page every member of
     the Catch-up loads. Anything that could carry a second declaration, or
     anything that is simply not a position, is refused at the action rather
     than trusted because it came from our own dialog. */
  assert.equal(isValidPictureFocus("center 85%; background: url(https://evil.example)"), false);
  assert.equal(isValidPictureFocus("url(https://evil.example)"), false);
  assert.equal(isValidPictureFocus("center"), false);
  assert.equal(isValidPictureFocus(""), false);
  assert.equal(isValidPictureFocus("center 85"), false);
});

test("isPoolPicture accepts exactly what ships and nothing shaped like it", () => {
  assert.equal(isPoolPicture(CATCHUP_PICTURES[0].src), true);
  assert.equal(isPoolPicture("/images/collection/not-in-the-pool.webp"), false);
  assert.equal(isPoolPicture("https://images.rishivalley.space/uploads/x/y.webp"), false);
  // No prefix matching: a path that merely BEGINS with a pool entry is not one.
  assert.equal(isPoolPicture(`${CATCHUP_PICTURES[0].src}?x=1`), false);
});

test("pictureFor is deterministic, always answers, and spreads", () => {
  // Deterministic, because a re-run of a creation path, a re-seed and a purge
  // putting a row back must all land on the same photograph rather than
  // shuffling the app under somebody.
  assert.deepEqual(pictureFor("catchup-abc"), pictureFor("catchup-abc"));

  const hit = new Set();
  for (let i = 0; i < 400; i++) {
    const picked = pictureFor(`cm${i}xyz${i * 7}`);
    assert.ok(CATCHUP_PICTURES.includes(picked), "picked something that is not in the pool");
    hit.add(picked.src);
  }
  assert.equal(
    hit.size,
    CATCHUP_PICTURES.length,
    `400 ids only reached ${hit.size} of ${CATCHUP_PICTURES.length} photographs; the hash is not spreading`
  );

  // The degenerate inputs a cuid can never be, but a backfill or a test can.
  assert.ok(CATCHUP_PICTURES.includes(pictureFor("")));
});

test("pictureAvoiding gives nobody a repeat while a picture they lack is free", () => {
  /* His rule, 2026-09-10: "to the extent possible one person doesn't have two
     catch ups with the same header when there's a picture available that they
     don't have a catch up for." `held` counts (member, Catch-up) pairs. */
  const [a, b, c] = CATCHUP_PICTURES;
  const seeds = Array.from({ length: 50 }, (_, i) => `group-${i}`);

  // Nobody holds anything: exactly the plain seeded pick, so nothing moved for
  // a Catch-up whose people have no others.
  for (const seed of seeds) assert.deepEqual(pictureAvoiding(seed, new Map()), pictureFor(seed));

  // One picture unheld: it wins from every starting point.
  for (const seed of seeds) {
    assert.equal(pictureAvoiding(seed, new Map([[a.src, 1], [b.src, 4]])).src, c.src);
  }

  // Everything held: the fewest repeats, never the most.
  for (const seed of seeds) {
    assert.equal(pictureAvoiding(seed, new Map([[a.src, 3], [b.src, 1], [c.src, 2]])).src, b.src);
  }

  // A tie is broken by the seed, so it is stable for one Catch-up and still
  // spreads across many rather than always taking the first.
  const tied = new Map([[a.src, 0], [b.src, 0], [c.src, 5]]);
  assert.deepEqual(pictureAvoiding("group-7", tied), pictureAvoiding("group-7", tied));
  const picks = new Set(seeds.map((s) => pictureAvoiding(s, tied).src));
  assert.deepEqual([...picks].sort(), [a.src, b.src].sort());

  // A count for something that has left the pool is ignored, not picked.
  const stale = new Map([["/images/collection/c3.webp", 0], [a.src, 1], [b.src, 1], [c.src, 1]]);
  assert.ok(CATCHUP_PICTURES.includes(pictureAvoiding("x", stale)));
});

test("the band is the TIGHTEST crop, not the roomiest", () => {
  /* This is the thing that has fooled two sessions (spec 10.2). The aiming
     control shows this band, so what a person places inside it survives every
     other frame. Measured off /lab/catchups/sketches on 2026-09-08: the home's
     head caps at 1520x240, and the next widest thing anything draws is the
     laptop list card at 2.5:1. */
  assert.deepEqual({ ...PICTURE_BAND }, { width: 1520, height: 240 });
  assert.ok(PICTURE_BAND_RATIO > 2.5, "the band is no longer the tightest frame in the drawing");

  // A 2:1 source -- what his twenty are asked to be -- keeps 31.6% of its
  // height through that band, which is where the safe zone in the handover
  // ("58% to 90% down the frame") comes from.
  assert.equal(Math.round(bandKeptFraction(2400, 1200) * 1000), 316);
  // A square one keeps half as much again, which is why the square stand-ins
  // this pool once held read as a 30x zoom.
  assert.equal(Math.round(bandKeptFraction(900, 900) * 1000), 158);
  // Nothing is cropped out of a source already wider than the band.
  assert.equal(bandKeptFraction(3040, 240), 1);
  assert.equal(bandKeptFraction(0, 0), 1);
});

test("the schema's default is the pool's first entry", () => {
  /* The DEFAULT is what makes a NOT NULL column safe to add to a live database
     serving both the running build and the new one (see the migration's
     header). It is a real path, and it is this one -- a default pointing at a
     file that left the pool would be a broken image on any row that fell back
     to it. */
  const schema = read("prisma/schema.prisma");
  const block = schema.slice(schema.indexOf("model Catchup {"));
  const m = block.match(/pictureSrc\s+String\s+@default\("([^"]+)"\)/);
  assert.ok(m, "Catchup.pictureSrc has no @default; adding the column would break the running build");
  assert.equal(m[1], CATCHUP_PICTURES[0].src);
  assert.match(block, /pictureFocus\s+String\s+@default\("center 85%"\)/);
  assert.equal(DEFAULT_PICTURE_FOCUS, "center 85%");
});

/** The VALUES list a migration retypes the pool into, checked against the
 *  real array: numbered 1..n, and every row a pool entry with that entry's
 *  focus, so nothing a migration writes can be a broken image or a crop
 *  aimed for some other photograph.
 *
 *  A SUBSET, not the whole pool. It used to demand equality, which made
 *  every photograph ADDED to the pool a retyping of migrations that had
 *  already run and would match no row if run again -- the opposite of "one
 *  edit and no migration". What still matters is that what they name exists. */
function assertPoolRows(sql, where) {
  const rows = [...sql.matchAll(/\(\s*(\d+),\s*'([^']+)',\s*'([^']+)'\s*\)/g)];
  assert.ok(rows.length > 0, `${where}: no VALUES list found; this check is reading nothing`);
  rows.forEach((row, i) => {
    assert.equal(Number(row[1]), i + 1, `${where}: the ordinals are not 1..n in order`);
    const entry = CATCHUP_PICTURES.find((p) => p.src === row[2]);
    assert.ok(entry, `${where}: ${row[2]} is not in the pool`);
    assert.equal(row[3], entry.focus, `${where}: ${row[2]} is aimed differently from the pool`);
  });
  return rows.length;
}

test("the migration's backfill names only pool photographs", () => {
  /* The SQL cannot import the array, so it retypes it. */
  const sql = read("prisma/migrations-manual/2026-09-08-catchup-picture.sql");
  assertPoolRows(sql, "2026-09-08-catchup-picture.sql");

  // Re-runnable, and it has to be: it is applied to two Supabase projects and
  // there is no migration table saying which have had it.
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "pictureSrc"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "pictureFocus"/);
  assert.match(sql, /WHERE c\."pictureSrc" IS NULL/);
  assert.match(sql, /ALTER COLUMN "pictureSrc" SET NOT NULL/);
  /* hashtext returns a SIGNED int4 and Postgres's `%` keeps the sign of the
     dividend, so an unmasked hash indexes off the front of the array and
     leaves the row NULL -- which the SET NOT NULL then refuses, failing the
     migration on whichever project happened to hold a row that hashed
     negative. */
  assert.match(sql, /hashtext\(c\.id\) & 2147483647/);
});

test("the batch backfill names only pool photographs, and modulos by its own list", () => {
  /* The second migration to carry a copy of the pool (build phase 4: one
     Catch-up per batch group at ten members or more). It hard-codes its
     list's LENGTH in the modulo rather than counting the VALUES the way the
     picture migration does, so a list and a modulo that disagree index off
     the end and mint a Catch-up with no picture. This is the line that says so. */
  const sql = read("prisma/migrations-manual/2026-09-08-batch-catchups.sql");
  const n = assertPoolRows(sql, "2026-09-08-batch-catchups.sql");
  const modulo = sql.match(/hashtext\(e\.id\) & 2147483647\) % (\d+)\)/);
  assert.ok(modulo, "the batch backfill no longer picks a picture by hashing the group id");
  assert.equal(Number(modulo[1]), n, "the batch backfill's modulo is not the pool's length");
});

test("retiring the stand-ins moves only rows on a retired path, and never re-dates one", () => {
  /* 2026-09-10: his first three replaced the six stand-ins, and six live rows
     were pointing at one. */
  const sql = decomment(read("prisma/migrations-manual/2026-09-10-catchup-pictures-his-three.sql"));
  assertPoolRows(sql, "2026-09-10-catchup-pictures-his-three.sql");
  assert.match(sql, /SET DEFAULT '([^']+)'/);
  assert.equal(sql.match(/SET DEFAULT '([^']+)'/)[1], CATCHUP_PICTURES[0].src, "the default it sets is not the pool's first entry");

  /* Selected by the RETIRED paths, named. "Not in the pool" would read the
     same today and, re-run after the pool grows, would drag every row on a
     newer photograph back onto these three. */
  const retired = sql.match(/"pictureSrc" IN \(([^)]+)\)/);
  assert.ok(retired, "the retirement no longer selects rows by a named list of retired paths");
  const paths = [...retired[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.equal(paths.length, 6);
  for (const p of paths) assert.ok(!isPoolPicture(p), `${p} is retired and back in the pool`);
  assert.doesNotMatch(sql, /NOT IN/);

  // An ended Catch-up shows `updatedAt` as the day it ended; a picture swap
  // nobody made must not move it.
  assert.doesNotMatch(sql, /"updatedAt"/);
  assert.match(sql, /theirs\."groupId" <> mine\."groupId"/, "it counts the row's own Catch-up against itself");
});

test("every path that mints a Catch-up gives it a picture", () => {
  /* The column is NOT NULL and it has a default, so a creation path that
     forgets does not throw -- it quietly gives every new Catch-up the same
     photograph. Nothing would report that, so this does. */
  const actions = decomment(read("src/app/(main)/catchups/actions.ts"));
  const create = actions.slice(actions.indexOf("export async function createCatchupWithPeople"));
  const tx = create.slice(0, create.indexOf("\n  });"));
  assert.match(
    tx,
    /pickCatchupPicture\(tx, group\.id\)/,
    "createCatchupWithPeople does not pick against what its people already see"
  );
  assert.match(tx, /pictureSrc:/, "createCatchupWithPeople does not write a picture");

  const seed = decomment(read("src/lib/demo-seed/seed.ts"));
  assert.match(seed, /pictureFor\(/, "the demo's Catch-up has no picture, and the demo is where most people meet the feature");
});

test("the pool lives here, and the lab room only borrows it", () => {
  /* It used to live in the room. The pool has to be readable by the creation
     path, the settings control and the demo seed, and none of them can import
     a lab file: `page.lab.tsx` and everything beside it is left out of the
     public demo's build entirely. */
  const shelf = decomment(read("src/app/lab/catchups/sketches/_shelf.ts"));
  assert.match(shelf, /from "@\/lib\/catchup-pictures"/);
  assert.ok(
    !/\{\s*src:\s*"\/images\//.test(shelf),
    "the lab room has grown its own pool again; there must be exactly one"
  );
});

test("a purged member's uploaded picture does not leave a broken card behind", () => {
  /* `Catchup.pictureSrc` is NOT NULL, so the purge cannot do what it does to
     `User.coverPhoto` and write a null. It has to put the row back on the pool
     instead -- and it has to COLLECT the url as well, or the member's bytes
     survive their own account deletion. */
  const purge = decomment(read("src/lib/account-purge.ts"));
  assert.match(purge, /restoreCatchupPicturesUploadedBy/);
  assert.match(purge, /pickCatchupPicture\(db, row\.groupId\)/);
  assert.match(purge, /pictureSrc: \{ contains: `\/uploads\/\$\{userId\}\/` \}/);
  assert.match(purge, /urls\.push\(c\.pictureSrc\)/);
});

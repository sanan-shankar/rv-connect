/* ------------------------------------------------------------------ *
 *  The flight: every camera move in the film, as keys in world metres
 *  (x east, y height above sea level, z south; the school at 0, 712, 0).
 *  Read by the film room and by scripts/dev/valley-film.mjs, which
 *  fetches the imagery these keys will look at, so change a key and
 *  re-run the script.
 *
 *  The story (docs/planning/valley/storyboard.md): down through the
 *  clouds over Madanapalle, up the NH42, west at Angallu, over the rocky
 *  hill east of the campus and the games field, and at rest on the three
 *  hills, where the ending (_film.tsx) takes over.
 *
 *  One rule sets the pace: the camera's speed goes with its height above
 *  the ground, so the land never moves more than about fifteen pixels a
 *  frame at sixty frames a second and the camera never turns faster than
 *  about twelve degrees a second. Fast high up, slow low down, as a
 *  descent looks from a real aircraft; a kilometre a second at 150 m, as
 *  the first cut flew, reads as a stuttering frame rate. The camera only
 *  ever descends, and once its gaze starts lifting to the hills it only
 *  lifts: a dip and lift over the games field read as janky.
 * ------------------------------------------------------------------ */

import { tileRect, type Key, type TileKey } from "./_geo.ts";

export const FLIGHT: Key[] = [
  /* 1: above the cloud tops south-east of Madanapalle, coming down
     through a gap with the valley ahead to the north-west */
  { t: 0, eye: [9000, 4300, 14500], look: [1500, 700, 1500], fov: 52 },
  { t: 2.2, eye: [5800, 2200, 8000], look: [1300, 720, 1000], fov: 52, roll: -2 },
  /* 2: over the town's northern edge and up the NH42, the road every
     school bus took, high enough that the ground never rushes */
  { t: 4.6, eye: [4300, 1800, 3900], look: [900, 740, 400], fov: 52, roll: -3 },
  /* 3: Angallu, turning west off the highway, the campus ahead */
  { t: 7.0, eye: [2800, 1400, 1100], look: [145, 710, 65], fov: 51, roll: -3 },
  /* 4: down over the rocky hill east of the campus, the games field in
     the middle of the frame and the three hills beyond it */
  { t: 9.6, eye: [1250, 1030, 180], look: [-1648, 266, -82], fov: 49, roll: -1 },
  /* 5: over the field, the gaze lifting to the hills as it passes under */
  { t: 11.9, eye: [480, 905, 130], look: [-2407, 639, 903], fov: 38 },
  /* 6: at rest at the field's west end, the hills lined up as the mark
     has them; the camera stays here while they become the mark */
  { t: 14.0, eye: [110, 755, 70], look: [-4812, 1060, 1407], fov: 18, settle: true },
];

/** The camera arrives at rest here; the ending is the page's (_film.tsx). */
export const DURATION = FLIGHT[FLIGHT.length - 1].t;

/** The film never looks past about 150 km, and haze has swallowed the
 *  ground well before that; zoom 8 tiles are 152 km across here. */
export const ROOTS: TileKey[] = (() => {
  const out: TileKey[] = [];
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const r = tileRect(8, x, y);
    if (r.x0 < 150000 && r.x0 + r.size > -150000 && r.z0 < 150000 && r.z0 + r.size > -150000) out.push({ z: 8, x, y });
  }
  return out;
})();

/** Where the finest imagery is allowed: the campus gets zoom 18 (about
 *  60 cm a pixel), the rest of the valley zoom 17 (1.2 m). */
export function maxZoomAt(z: number, x: number, y: number): number {
  const r = tileRect(z, x, y);
  const cx = r.x0 + r.size / 2, cz = r.z0 + r.size / 2;
  return Math.hypot(cx + 300, cz) < 1600 ? 18 : 17;
}

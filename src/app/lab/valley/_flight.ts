/* ------------------------------------------------------------------ *
 *  The flight: every camera move in the film, as keys in world metres
 *  (x east, y height above sea level, z south; the school at 0, 712, 0).
 *  Read by the film room and by scripts/dev/valley-film.mjs, which
 *  fetches the imagery these keys will look at, so change a key and
 *  re-run the script.
 *
 *  The story, in six shots (docs/planning/valley/storyboard.md):
 *    1. over Madanapalle, the valley ahead in its ring of hills;
 *    2. down onto the NH42, the road every school bus took;
 *    3. off the highway at Angallu, low over the campus from the east;
 *    4. over the games field, turning to the three hills;
 *    5. at rest, while their ridge is traced into the mark, which peels
 *       off to the corner and leaves a hill-shaped window onto the
 *       landing page's photograph, which opens until we are through it.
 * ------------------------------------------------------------------ */

import { tileRect, type Key, type TileKey } from "./_geo.ts";

export const FLIGHT: Key[] = [
  /* 1: above the cloud tops south-east of Madanapalle, coming down
     through a gap with the valley ahead to the north-west */
  { t: 0, eye: [9400, 4100, 15400], look: [1400, 700, 1600], fov: 50 },
  /* 2: down onto the NH42 at the town's northern edge, and along it */
  { t: 3.0, eye: [5200, 1600, 7000], look: [3000, 800, 1200], fov: 50, roll: -2 },
  { t: 5.6, eye: [4100, 1050, 3000], look: [2200, 760, -900], fov: 52, roll: -4 },
  /* 3: Angallu, banking left off the highway towards the campus */
  { t: 7.8, eye: [2800, 880, 600], look: [0, 740, -300], fov: 54, roll: -6 },
  { t: 9.8, eye: [1100, 820, -250], look: [-1500, 760, 200], fov: 54, roll: -3 },
  /* 4: over the games field, looking down on the campus, the Dining Hall
     and the quadrangles; then the tilt up that finds the three hills */
  { t: 11.3, eye: [390, 925, 10], look: [-60, 712, 40], fov: 46 },
  /* 5: at rest above the field, the hills lined up as the mark has them;
     the camera stays here while they become the mark and open */
  { t: 13.2, eye: [60, 757, -280], look: [-4847, 1060, 1247], fov: 17, settle: true },
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

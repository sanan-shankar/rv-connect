/* ------------------------------------------------------------------ *
 *  A photo wall's arithmetic, apart from its drawing.
 *
 *  The reading surface for a `photo-wall` question is a RUN -- one band
 *  the width of the column, every photograph at its own width, bleeding
 *  off the right edge. He picked it on 2026-09-09 off `/lab/catchups/wall`
 *  ("I pick 'a run'"); `components/catchups/edition/photo-run.tsx` draws
 *  it.
 *
 *  These two functions are here rather than in that file for a reason
 *  worth stating: NO EDITION HAS EVER USED A PHOTO-WALL QUESTION. The
 *  category has existed since the feature was built and the live database
 *  has zero prompts carrying it, so there is no page anywhere that renders
 *  the run and no screenshot that could stand in for a test. A `.tsx` file
 *  cannot be imported by a node test; a `.ts` file can. So the part that
 *  can be wrong -- the flattening and the grouping -- is testable, and
 *  `photo-wall.test.mjs` is what checks it.
 * ------------------------------------------------------------------ */

/** The minimum an answer has to look like for a wall to be built from it.
 *  Structural rather than `EditionEntry`, so the arithmetic does not drag
 *  the Prisma client into a unit test. */
export type WallEntry = {
  id: string;
  author: { id: string; name: string };
  body: string | null;
  images: string[];
  /** What each photograph looks like, same order; null when never measured. */
  photos: ({ width: number; height: number } | null)[];
};

export type WallShot<E extends WallEntry = WallEntry> = {
  src: string;
  /** width / height, from the `Image` table. */
  ratio: number;
  by: E["author"];
  /** The answer it came from, so the heart still belongs to the answer. */
  entry: E;
  caption: string | null;
};

/** A photograph nobody has measured keeps a square, which is the shape the
 *  wall's old grid gave every one of them anyway. */
export const UNMEASURED_RATIO = 1;

/**
 * Flatten the answers into one wall, in the order they were written.
 *
 * An answer may carry up to three photographs (his cap, 2026-09-09: "cap photo
 * wall also at 3 each"), and they stay adjacent so `byContributor` can put them
 * under one name.
 */
export function shotsOf<E extends WallEntry>(entries: E[]): WallShot<E>[] {
  const out: WallShot<E>[] = [];
  for (const entry of entries) {
    entry.images.forEach((src, i) => {
      const facts = entry.photos[i];
      out.push({
        src,
        ratio: facts?.width && facts?.height ? facts.width / facts.height : UNMEASURED_RATIO,
        by: entry.author,
        entry,
        caption: entry.body,
      });
    });
  }
  return out;
}

/**
 * Consecutive photographs by the same person, as one group.
 *
 * Deliberately NOT a `groupBy`. The wall's order is the order people wrote in,
 * and gathering every one of somebody's photographs from across the wall would
 * reorder everybody else — so somebody who answered first and again later
 * appears twice, which is honest, rather than having their second set dragged
 * up to sit beside their first.
 *
 * The grouping is what stops three photographs from one person reading as three
 * people: frames inside a group sit 3px apart under a single name, groups sit
 * 10px apart.
 */
export function byContributor<E extends WallEntry>(shots: WallShot<E>[]): WallShot<E>[][] {
  const out: WallShot<E>[][] = [];
  for (const s of shots) {
    const last = out[out.length - 1];
    if (last && last[0].by.id === s.by.id) last.push(s);
    else out.push([s]);
  }
  return out;
}

/**
 * Where each group starts in the flat wall.
 *
 * Worked out before the draw rather than during it: the viewer opens on an
 * index into the flat list, and a counter mutated inside a `map` is a render
 * that disagrees with itself the second time React runs it.
 */
export function groupStarts<E extends WallEntry>(groups: WallShot<E>[][]): number[] {
  return groups.reduce<number[]>((acc, _g, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + groups[i - 1].length);
    return acc;
  }, []);
}

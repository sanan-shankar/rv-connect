/* ------------------------------------------------------------------ *
 *  Justified rows: the thing the owner's reference gallery does.
 *
 *  <https://gallery.alekziol.com/mechsoc-banquet/>, measured live on
 *  2026-08-26. It is Pixieset, and the layout is the same one Flickr and
 *  Google Photos use. Walk the photographs in order, adding each to the
 *  current row, until the row would be shorter than the height you were
 *  aiming for. Then solve for the height that makes that row fill the
 *  container exactly. Every photograph keeps its true shape, the gutters
 *  stay even, and the rows all line up. Nothing is cropped.
 *
 *  The arithmetic is one line. For a row holding photographs of aspect
 *  ratios r1..rn, with n-1 gaps of g between them:
 *
 *      height = (containerWidth - g * (n - 1)) / (r1 + ... + rn)
 *
 *  because each photograph's width is its ratio times the shared height,
 *  and those widths plus the gaps have to come to the container width.
 * ------------------------------------------------------------------ */

export interface Sized {
  w: number;
  h: number;
}

export interface Placed<T> {
  item: T;
  width: number;
  height: number;
}

export function justifiedRows<T extends Sized>(
  items: T[],
  containerWidth: number,
  targetHeight: number,
  gap: number
): Placed<T>[][] {
  const rows: Placed<T>[][] = [];
  let row: T[] = [];
  let ratioSum = 0;

  const close = (height: number) => {
    rows.push(row.map((item) => ({ item, width: (item.w / item.h) * height, height })));
    row = [];
    ratioSum = 0;
  };

  for (const item of items) {
    row.push(item);
    ratioSum += item.w / item.h;
    const height = (containerWidth - gap * (row.length - 1)) / ratioSum;
    /* The row has become tall enough to fill the width at or below the
       height we wanted, so it is full. Close it at the height that fits
       exactly rather than at the target. */
    if (height <= targetHeight) close(height);
  }

  /* The leftovers. Solving for an exact fit here would blow a single
     trailing photograph up to the full container width, which is the one
     ugly thing this layout can do, so the last row is capped at the
     target and simply runs short. */
  if (row.length) {
    const exact = (containerWidth - gap * (row.length - 1)) / ratioSum;
    close(Math.min(exact, targetHeight));
  }

  return rows;
}

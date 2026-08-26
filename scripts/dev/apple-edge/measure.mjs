/* Sampling in the icon's OWN coordinate space (the 512 box), which removes
   every alignment guess. The truth's tile was located by walking a row and a
   column out to the wallpaper: x 2218..2618, y 25..427, so 400x402, square to
   within two pixels. Our render is produced at 400px so one icon unit is the
   same distance in both. */
export const L = p => 0.2126*p[0]+0.7152*p[1]+0.0722*p[2];

/** map icon-space (0..512) to pixels in an image whose tile is at ox,oy,size */
export const mapper = (ox, oy, size) => (ix, iy) => [
  Math.round(ox + (ix/512)*size),
  Math.round(oy + (iy/512)*size),
];

/**
 * Lift at the top edge of whatever shape a vertical line at icon-x crosses.
 * Scans down icon-y from 150 to 400. Returns null when the shape it lands on
 * is thinner than the body sample needs.
 */
export function liftAt(px, map, ix) {
  const col = [];
  for (let iy = 150; iy < 400; iy += 0.5) {
    const [x,y] = map(ix, iy);
    col.push(L(px(x,y)));
  }
  /* The tile is not one colour: it carries a vertical gradient, L45 at the
     top down to L20 at the bottom. A "within 12 of the tile" test therefore
     called the top of the tile artwork and every scan stopped on the first
     row. The hills are L117 and L242, the tile never passes 45, so 70 splits
     them with room to spare. */
  const isTile = v => v < 70;
  let i = col.findIndex(v => !isTile(v));
  if (i < 0 || i > col.length - 60) return null;
  const body = col.slice(i+30, i+54);
  if (body.some(isTile)) return null;
  const b = body.reduce((a,c)=>a+c,0)/body.length;
  return { lift: Math.round(Math.max(...col.slice(i, i+24)) - b), body: Math.round(b) };
}

/**
 * The whole lift curve, not just its peak.
 *
 * This exists because fitting to the peak alone let the band grow as wide as
 * it liked: a tight bright line and a wide soft ramp with the same peak score
 * identically, and a descent handed that freedom will take it. Returns lift
 * in luminance at each depth into the shape, in ICON units, so the two images
 * are comparable whatever they were rendered at.
 */
export function profileAt(px, map, ix, depths) {
  const col = [];
  for (let iy = 150; iy < 400; iy += 0.25) {
    const [x, y] = map(ix, iy);
    col.push({ iy, l: L(px(x, y)) });
  }
  const isTile = v => v < 70;
  const i = col.findIndex(c => !isTile(c.l));
  if (i < 0 || i > col.length - 160) return null;
  const edgeIy = col[i].iy;
  const body = col.slice(i + 120, i + 216);
  if (!body.length || body.some(c => isTile(c.l))) return null;
  const b = body.reduce((a, c) => a + c.l, 0) / body.length;
  return depths.map(d => {
    const want = edgeIy + d;
    let best = col[i], bd = Infinity;
    for (const c of col) { const dd = Math.abs(c.iy - want); if (dd < bd) { bd = dd; best = c; } }
    return Math.round(best.l - b);
  });
}

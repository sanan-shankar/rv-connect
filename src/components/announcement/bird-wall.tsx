"use client";

/* ------------------------------------------------------------------ *
 *  <BirdWall> — the picture on the announcement window: the Support
 *  page's plate of birds set moving, every row drifting the opposite
 *  way to the one above it. wall-birds.ts chooses and orders the birds.
 *
 *  The owner's idea, 2026-10-29: rows of birds going by, some left to
 *  right and the next right to left, and bright. Then, 2026-10-30: no
 *  coloured tiles, the birds bigger, slower, and with the cute, cosy
 *  closeness of the plate on the Support page rather than ground
 *  showing between them. So the birds sit on the plate's own warm card,
 *  each a full row tall with about a third of a bird between
 *  neighbours, as the plate spaces them, a few percent apart in size
 *  and a hair off their line so the wall never settles into a grid.
 *
 *  Each bird faces the way its row travels. The drawings all face right
 *  as drawn (the owls face out), so a row moving left is mirrored, bird
 *  by bird. It is a picture and nothing more: pointing at a bird used to
 *  stop its row and name it, and the owner had that taken out.
 *
 *  EVERY BIRD MOVES ON ITS OWN. The last wall slid each row as one
 *  strip three copies long, and in Safari the rows flashed to blank now
 *  and then: a layer that wide is painted in tiles, and a tile that
 *  scrolls in before it is painted shows the ground. A bird is a layer
 *  no bigger than itself, painted once, so there is nothing left to
 *  paint while it moves. All the birds of a row share one lap and one
 *  speed, so they keep their spacing; each starts at its own point of
 *  the lap, leaves past the edge, and comes back in from the far side
 *  while out of sight. Only transform moves.
 * ------------------------------------------------------------------ */

import type { CSSProperties } from "react";
import { BirdGlyphV2, isMirrored } from "@/components/common/bird-avatar-v2";
import { cn } from "@/lib/utils";
import { WALL_ROWS } from "./wall-birds";

/* A seed whose hashed pose is the unmirrored one, so BirdGlyphV2 draws each
   species as drawn (facing right) and the row alone decides the mirror. */
const AS_DRAWN = (() => {
  for (let i = 0; i < 64; i++) if (!isMirrored(`wall-${i}`)) return `wall-${i}`;
  return "wall-0";
})();

/* Row heights a second: about 10px a second on a laptop, a third of the last
   wall's pace, so a bird takes the best part of a minute to cross. A few
   percent either way row to row, so the rows never move in step. */
const SPEED = 0.095;
const PACE = [1, 0.9, 1.07, 0.95, 1.04, 0.92, 1.01];
/* How far past the edge a bird goes before it comes round: past the
   biggest bird, which is a little over a row height. */
const OUT = 1.15;

const KEYFRAMES = `
@keyframes wall-left { from { transform: translate3d(calc(var(--span) - var(--out)), 0, 0); } to { transform: translate3d(calc(var(--out) * -1), 0, 0); } }
@keyframes wall-right { from { transform: translate3d(calc(var(--out) * -1), 0, 0); } to { transform: translate3d(calc(var(--span) - var(--out)), 0, 0); } }
`;

/** Lengths in row heights: each row is a size container, so 100cqh is its own height. */
const rh = (n: number) => `calc(100cqh * ${n.toFixed(4)})`;

export function BirdWall({
  gap,
  top = gap,
  bottom = gap,
  rows = WALL_ROWS.length,
}: {
  /** The card between rows. A bird is drawn a touch taller than its row, so
   *  this is small: the drawings' own margins keep them apart. */
  gap: number;
  /** The card above the first row: on a phone the sheet's X sits there. */
  top?: number;
  /** The card below the last row. */
  bottom?: number;
  /** How many rows to show, from the top. */
  rows?: number;
}) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col overflow-hidden bg-card"
      style={{ gap, paddingTop: top, paddingBottom: bottom }}
    >
      <style>{KEYFRAMES}</style>
      {WALL_ROWS.slice(0, rows).map((row, r) => {
        const rightward = r % 2 === 1;
        const seconds = row.span / (SPEED * PACE[r % PACE.length]);
        return (
          <div key={r} className="relative min-h-0 flex-1 [container-type:size]">
            {row.birds.map((bird) => {
              /* Where in its lap this bird is as the window opens, so it stands
                 at `at` from the row's left edge at time zero. */
              const lap = rightward ? (bird.at + OUT) / row.span : (row.span - OUT - bird.at) / row.span;
              const phase = lap - Math.floor(lap);
              return (
                <div
                  key={bird.index}
                  className="absolute top-1/2 left-0 will-change-transform"
                  style={
                    {
                      "--span": rh(row.span),
                      "--out": rh(OUT),
                      width: rh(bird.size),
                      height: rh(bird.size),
                      marginTop: rh(bird.lift - bird.size / 2),
                      animation: `${rightward ? "wall-right" : "wall-left"} ${seconds.toFixed(2)}s linear ${(-phase * seconds).toFixed(2)}s infinite`,
                    } as CSSProperties
                  }
                >
                  <span className={cn("block size-full [&>svg]:size-full", !rightward && "-scale-x-100")}>
                    <BirdGlyphV2 seed={AS_DRAWN} px={96} speciesOverride={bird.index} />
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

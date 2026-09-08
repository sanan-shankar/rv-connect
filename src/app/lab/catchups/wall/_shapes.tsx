"use client";

/* ------------------------------------------------------------------ *
 *  A wall question's reading surface, drawn three ways.
 *
 *  THE ASK, his, brief 16: "we definitely have to add a photo wall for
 *  questions where people can just, I don't know, add photos, but it
 *  needs to be modular and work with everything else." And brief 49, on
 *  what Letterloop has that we do not: "There is no photo wall kind of
 *  thing. There aren't pretty things like that."
 *
 *  THE STANDARD is brief 21, 30 and 31, which are all one complaint: an
 *  answer tile is mostly empty. "on my phone it's maybe 3 centimetres,
 *  and only about 15% of the real estate is used, and the rest is just
 *  white space." A wall is the one question where that is fixable by
 *  construction, because a photograph can fill its own frame. So the
 *  rule under all three shapes below: THE FRAME FOLLOWS THE PHOTOGRAPH.
 *  Nothing here puts a picture into a box of the layout's choosing.
 *
 *  A GRID IS NOT ONE OF THE THREE. Twenty-four photographs in a grid is a
 *  contact sheet, and a contact sheet is the one thing a magazine
 *  designer would never print: it says these are proofs, pick one. The
 *  drift comes closest to a grid and stops short on purpose, and where it
 *  does pair two frames it pairs exactly two.
 *
 *  WHAT ALL THREE SHARE, so the comparison is about the shape and
 *  nothing else:
 *   - the app's photo viewer on a tap, through `lazy-image-viewer`,
 *     opening at the one you touched. Never `ImageViewer` directly.
 *   - the shared heart, at the size its row calls for.
 *   - the contributor named beside their photograph, never a bare wall.
 *   - keys by POSITION, because two people can put up the same
 *     photograph and a url is not an identity.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { LoveButton } from "@/components/common/love-button";
import {
  LazyImageViewer,
  preloadImageViewer,
  useImageViewer,
} from "@/components/common/lazy-image-viewer";
import { EASE_IN_OUT_SCENE, EASE_OUT_SMOOTH } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import { byContributor, contributorCount, type WallShot } from "./_corpus";

/* ── shared pieces ─────────────────────────────────────────────────── */

/** The one hover a photograph is allowed: it scales inside a frame that
 *  does not itself move (DESIGN-SYSTEM 7, the single exception to "hover
 *  never moves a control"). */
const FRAME =
  "group relative block overflow-hidden rounded-[var(--radius-md)] bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const INNER =
  "object-cover transition-transform duration-300 ease-out group-hover:scale-[1.02]";
const WARM = { onPointerEnter: preloadImageViewer, onFocus: preloadImageViewer };

/** A bird whose ink starts on the same pixel as every other bird's.
 *
 *  This is `FlushAvatar` from `../sketches/_parts.tsx` at a smaller size,
 *  and it is copied rather than imported because that one hard-codes the
 *  reader's 17px name beside it and a wall's foot line is 13px. Same
 *  cause: the glyphs are unclipped and optically sized, so a wagtail's
 *  ink starts further right than an eagle's and a column of them looks
 *  ragged. If a third caller ever wants this, the two move to a shared
 *  module rather than becoming three. */
function FlushBird({
  person,
  size,
}: {
  person: { id: string; name: string };
  size: number;
}) {
  const measure = useCallback(
    (host: HTMLSpanElement | null) => {
      const inner = host?.firstElementChild as HTMLElement | null;
      if (!host || !inner) return;
      const svg = host.querySelector("svg");
      if (!svg) {
        inner.style.transform = "";
        return;
      }
      const box = (svg as unknown as SVGGraphicsElement).getBBox();
      inner.style.transform = `translateX(${-(box.x * size) / 100}px)`;
    },
    [size],
  );
  return (
    <span
      ref={measure}
      className="block shrink-0"
      style={{ width: size, height: size }}
    >
      <span className="block">
        <BirdAvatar user={person} size={size} />
      </span>
    </span>
  );
}

/** The heart, wired to nothing. A wall's photograph is an answer, so it
 *  keeps the answer's control; the count is the fixture's. */
function Heart({
  shot,
  size = "sm",
}: {
  shot: WallShot;
  size?: "sm" | "md";
}) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(shot.hearts);
  return (
    <LoveButton
      liked={liked}
      count={count}
      size={size}
      showCount={count > 0}
      onToggle={() => {
        setLiked((v) => !v);
        setCount((c) => (liked ? c - 1 : c + 1));
      }}
      label="Love this photograph"
    />
  );
}

/** Bird, name, heart, on one line. Two decisions in it.
 *
 *  The name TRUNCATES rather than wraps: under a 200px portrait frame a
 *  wrapping name is three lines of type under a picture and the picture
 *  stops being the answer.
 *
 *  The heart sits NEXT TO the name and not at the far right of the frame.
 *  Right-aligned was the first cut and it was wrong the moment two people
 *  were side by side: under a 505px landscape the heart landed about 30px
 *  from the next person's bird, so it read as belonging to them. Bird, name,
 *  heart is one object; bird, name, gap, heart is two. */
function FootLine({
  shot,
  bird = 22,
  className,
}: {
  shot: WallShot;
  bird?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <FlushBird person={shot.by} size={bird} />
      <span className="min-w-0 shrink truncate text-[13px] font-medium leading-none text-foreground">
        {shot.by.name}
      </span>
      <span className="-ml-1 shrink-0">
        <Heart shot={shot} />
      </span>
    </div>
  );
}

/** What the wall's size is, said once, above whichever shape is drawn.
 *  It earns its line: a run shows you two photographs of two hundred and
 *  a stack shows you one, so the size of the thing is the one fact
 *  neither shape can tell you by looking. */
export function wallCountLine(shots: WallShot[]): string {
  const people = contributorCount(shots);
  if (shots.length === 1) return "One photograph, from one person";
  return `${shots.length} photographs from ${people} ${people === 1 ? "person" : "people"}`;
}

/** The viewer's images, in wall order, so opening at index i opens the one
 *  that was touched. */
function viewerShots(shots: WallShot[]) {
  return shots.map((s) => ({
    src: s.src,
    alt: "",
    caption: s.caption,
    author: { id: s.by.id, name: s.by.name },
    date: null,
  }));
}

export type ShapeProps = {
  shots: WallShot[];
  phone: boolean;
  /** The page gutter, so a shape can bleed past it and back. */
  gutter: number;
};

/* ══ A RUN ═════════════════════════════════════════════════════════════ *
 *  One band the width of the column, photographs at their own shapes,
 *  moving sideways. Reads as a strip of film.
 *
 *  Three decisions, and each one is the difference between a strip of
 *  film and a row of thumbnails:
 *
 *  1. THE BAND HAS ONE HEIGHT AND EVERY WIDTH. In a 300px band the app's
 *     widest photograph is 505px across and its tallest is 200px, two and
 *     a half times apart. Nothing is cropped to a common shape, which is
 *     what a contact sheet does. The band's top and bottom edges are the
 *     only straight lines, and they are what makes it read as one
 *     object.
 *  2. IT BLEEDS OFF THE RIGHT EDGE. The first photograph is flush with
 *     the question above it and the last one runs past the page's gutter,
 *     so the strip says there is more this way without a row of dots
 *     saying it. His, on the answer photographs: "You've made the
 *     pictures edge to edge, which is a nice touch."
 *  3. ONE PERSON'S PHOTOGRAPHS ARE ONE OBJECT. Frames inside a group sit
 *     3px apart and groups sit 10px apart, and the group carries a single
 *     name under it. Without that, six photographs from one person read as
 *     six people and the wall stops being about the group.
 *
 *  What it gives up: captions. There is nowhere in a band to set a
 *  paragraph, so the words live in the viewer. On this Edition five
 *  photographs in fourteen carry words, so that is a real loss and not a
 *  rounding error.
 * ═══════════════════════════════════════════════════════════════════════ */

export function Run({ shots, phone, gutter }: ShapeProps) {
  const band = phone ? 210 : 300;
  /* Nothing wider than the column itself, so one panorama can never
     take a whole screen sideways. At the app's widest photograph (1.684)
     a 210px band is 353px, which is why the phone number is the column
     rather than something rounder. */
  const maxFrame = phone ? 350 : 700;
  const viewer = useImageViewer();
  const scroller = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  /* How far along the strip you are, read off the scroller rather than
     counted from an index, so it is honest about a 21:9 taking four times
     the travel of a 9:16. Null means the whole wall fits and there is
     nothing to say. */
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const travel = el.scrollWidth - el.clientWidth;
      setProgress(travel > 8 ? el.scrollLeft / travel : null);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    ask();
    el.addEventListener("scroll", ask, { passive: true });
    const ro = new ResizeObserver(ask);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", ask);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [shots]);

  const groups = byContributor(shots);
  /* Where each group starts in the flat wall, worked out before the draw
     rather than during it: the viewer opens on an index into `shots`, and
     a counter mutated inside a map is a render that disagrees with itself
     the second time React runs it. */
  const starts = groups.reduce<number[]>((acc, g, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + groups[i - 1].length);
    return acc;
  }, []);

  return (
    <>
      <div
        ref={scroller}
        className="flex gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          marginLeft: -gutter,
          marginRight: -gutter,
          paddingLeft: gutter,
          paddingRight: gutter,
        }}
      >
        {groups.map((group, g) => {
          const start = starts[g];
          return (
            <div key={`${g}-${group[0].id}`} className="shrink-0">
              <div className="flex gap-[3px]">
                {group.map((s, k) => {
                  const at = start + k;
                  return (
                    <button
                      key={`${k}-${s.src}`}
                      type="button"
                      onClick={() => viewer.open(at)}
                      {...WARM}
                      aria-label={`Open ${s.by.name}'s photograph, ${at + 1} of ${shots.length}`}
                      className={FRAME}
                      style={{
                        height: band,
                        width: Math.min(Math.round(band * s.ratio), maxFrame),
                      }}
                    >
                      <Image
                        src={s.src}
                        alt=""
                        fill
                        sizes={`${Math.min(Math.round(band * s.ratio), maxFrame)}px`}
                        className={INNER}
                      />
                    </button>
                  );
                })}
              </div>
              <FootLine shot={group[0]} className="mt-2.5" />
            </div>
          );
        })}
      </div>

      {/* The only thing that says how long the strip is. A row of dots
          would be two hundred dots; a hairline is one object at any
          length.

          NOT CINNAMON, and that was a real collision rather than a
          preference: at 24 photographs the fill starts 33px wide, and the
          2px cinnamon mark that opens every question section is 32px wide.
          Two identical cinnamon dashes, one above a question and one under
          a wall, and the eye reads the second as the start of a third
          question. The mark owns cinnamon here; a scroll position is
          neutral, and its track is drawn dark enough to be seen. */}
      {progress !== null && (
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-foreground/12">
          <div
            className="h-full rounded-full bg-foreground/45 transition-[width] duration-100 ease-out"
            style={{ width: `${Math.max(6, progress * 100)}%` }}
          />
        </div>
      )}

      {viewer.mounted && (
        <LazyImageViewer
          images={viewerShots(shots)}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

/* ══ A DRIFT ═══════════════════════════════════════════════════════════ *
 *  Photographs down the column at varying sizes, the contributor in the
 *  margin beside each one. Reads as a wall.
 *
 *  THE MEASURE IS CHOSEN FROM THE PHOTOGRAPH, which is brief 21 in one
 *  line: "there would have to be a lot of layout rules that are very
 *  rapidly adjusting to the content it's receiving." Three widths, and
 *  which one a photograph gets is a fact about the photograph:
 *
 *    wide  (ratio >= 1.4)  the full column. A landscape is short, so full
 *                          width costs almost no height, and it makes a
 *                          rest in the column.
 *    square (0.9 to 1.4)   the middle measure, alternating sides.
 *    tall  (< 0.9)         the small measure, alternating sides, because a
 *                          2:3 portrait at the full 856px column is
 *                          1,283px tall and one photograph owns the
 *                          screen.
 *
 *  THE MARGIN IS NOT WASTE, IT IS WHERE THE NAME LIVES. That is the whole
 *  answer to brief 31. A tile leaves 85% of itself empty because the text
 *  is set across the top and stops; a drift leaves a column empty because
 *  the photograph is that shape, and then puts the bird, the name and the
 *  words into it. The emptiness is doing work.
 *
 *  THREE PORTRAITS IN A ROW GET PAIRED, and this is the drift's one
 *  concession to a grid. A wall where everybody photographed something on
 *  a phone is fourteen towers down a column with fourteen bylines beside
 *  them, which is the ragged case this shape is most likely to fail. Two
 *  side by side is what a magazine does with a pair of portraits. Two,
 *  never three, or it is a contact sheet again.
 * ═══════════════════════════════════════════════════════════════════════ */

type DriftRow =
  | {
      kind: "single";
      shot: WallShot;
      at: number;
      measure: number;
      side: "left" | "right" | "full";
    }
  /** Two or more plates across one row: a person who sent several, or a
   *  pair of portraits that would otherwise be two towers. */
  | { kind: "row"; shots: WallShot[]; at: number[]; named: "each" | "once" };

/** The rules above, as one pure pass. Written apart from the drawing so
 *  it can be read on its own and argued with. */
function driftPlan(shots: WallShot[], phone: boolean): DriftRow[] {
  const MID = phone ? 0.78 : 0.72;
  const SMALL = phone ? 0.58 : 0.44;
  const rows: DriftRow[] = [];
  let side: "left" | "right" = "left";

  const tall = (s: WallShot) => s.ratio < 0.9;

  /* ONE PERSON IS ONE ROW, and this is the correction that came out of
     looking at it: Ashwin sent two photographs, the rules gave them
     different measures on opposite sides of the column, and his name was
     printed twice at two sizes. It read as two people with the same name.
     A set travels together, the way it does in the run. */
  const units: Array<{ shots: WallShot[]; at: number[] }> = [];
  let i = 0;
  for (const group of byContributor(shots)) {
    units.push({ shots: group, at: group.map((_, k) => i + k) });
    i += group.length;
  }

  let u = 0;
  while (u < units.length) {
    const unit = units[u];
    if (unit.shots.length > 1) {
      rows.push({ kind: "row", shots: unit.shots, at: unit.at, named: "once" });
      u += 1;
      continue;
    }

    /* How many single portraits start here. Three or more and they pair
       off, because a wall where everybody used a phone is otherwise a
       column of towers. Two, never three: three across is a contact
       sheet. */
    let run = 0;
    while (
      u + run < units.length &&
      units[u + run].shots.length === 1 &&
      tall(units[u + run].shots[0])
    ) {
      run += 1;
    }

    if (run >= 3) {
      const take = run - (run % 2);
      for (let k = 0; k < take; k += 2) {
        rows.push({
          kind: "row",
          shots: [units[u + k].shots[0], units[u + k + 1].shots[0]],
          at: [units[u + k].at[0], units[u + k + 1].at[0]],
          named: "each",
        });
      }
      u += take;
      continue;
    }

    const s = unit.shots[0];
    if (s.ratio >= 1.4) {
      rows.push({ kind: "single", shot: s, at: unit.at[0], measure: 1, side: "full" });
    } else {
      rows.push({
        kind: "single",
        shot: s,
        at: unit.at[0],
        measure: s.ratio >= 0.9 ? MID : SMALL,
        side,
      });
      side = side === "left" ? "right" : "left";
    }
    u += 1;
  }
  return rows;
}

/** Several plates across one row, at ONE height and their own widths.
 *
 *  The justified row, and it needs no measurement: `flex-grow` set to each
 *  photograph's ratio makes the widths proportional to the ratios, and
 *  `aspect-ratio` on each one then resolves every height to the same
 *  number. A panorama beside a portrait comes out as one band with a
 *  straight top and a straight foot, which is what stops a set from
 *  reading as ragged. Equal widths were the first cut and they gave a row
 *  whose bottom edge stepped three times. */
function PlateRow({
  shots,
  at,
  onOpen,
  named,
  phone,
  count,
}: {
  shots: WallShot[];
  at: number[];
  onOpen: (i: number) => void;
  named: "each" | "once";
  phone: boolean;
  count: number;
}) {
  return (
    <div>
      <div className="flex gap-2">
        {shots.map((s, k) => (
          <button
            key={`${k}-${s.src}`}
            type="button"
            onClick={() => onOpen(at[k])}
            {...WARM}
            aria-label={`Open ${s.by.name}'s photograph, ${at[k] + 1} of ${count}`}
            className={cn(FRAME, "min-w-0")}
            style={{ flexGrow: s.ratio, flexBasis: 0, aspectRatio: s.ratio }}
          >
            <Image
              src={s.src}
              alt=""
              fill
              sizes={phone ? "220px" : "440px"}
              className={INNER}
            />
          </button>
        ))}
      </div>
      {named === "once" ? (
        <FootLine shot={shots[0]} className="mt-2.5" />
      ) : (
        <div className="mt-2.5 flex gap-2">
          {shots.map((s, k) => (
            <div key={`${k}-${s.src}`} className="min-w-0" style={{ flexGrow: s.ratio, flexBasis: 0 }}>
              <FootLine shot={s} bird={20} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Drift({ shots, phone }: ShapeProps) {
  const viewer = useImageViewer();
  const rows = driftPlan(shots, phone);
  /* High enough that the measure rules never crop. The tallest a plate
     gets is a 0.9 photograph at the middle measure: 616 wide on a laptop
     is 684 tall, and at the old 600 it lost 12% off the top of every one
     of them. A cap is a backstop here, not a layout rule. */
  const cap = phone ? 520 : 700;
  /* The gap between rows, and a full-width one gets more air under it
     because it is the rest in the column and a rest needs room around it. */
  const gap = phone ? 30 : 44;

  return (
    <>
      <div className="flex flex-col">
        {rows.map((row, r) => {
          const air =
            r === 0 ? 0 : row.kind === "single" && row.side === "full" ? gap + 14 : gap;

          if (row.kind === "row") {
            return (
              <div key={`r-${row.at[0]}`} style={{ marginTop: air }}>
                <PlateRow
                  shots={row.shots}
                  at={row.at}
                  onOpen={viewer.open}
                  named={row.named}
                  phone={phone}
                  count={shots.length}
                />
              </div>
            );
          }

          const { shot: s, at, measure, side } = row;
          /* Where the name goes. Beside the photograph whenever the margin
             it leaves can hold a bird and a line of type: on a laptop that
             is anything short of full width, on a phone only the small
             measure, because 78% of 350 leaves 77px and a bird is 28 of
             them. */
          const aside = side !== "full" && (!phone || measure < 0.6);

          return (
            <div
              key={`s-${at}`}
              /* BOTTOM aligned, and that was the fix rather than the first
                 idea. Set to the top, a name and a heart floated in the
                 corner of a 240px by 588px margin with nothing under them,
                 which is brief 31 reappearing inside the shape that was
                 meant to answer it. At the foot the same two lines read as
                 a plate's credit, the empty part of the margin sits
                 outboard where a page margin belongs, and the name is
                 beside the photograph's bottom edge like a signature. */
              className={cn("flex items-end gap-5", side === "right" && "flex-row-reverse")}
              style={{ marginTop: air }}
            >
              <div className="min-w-0" style={{ width: `${measure * 100}%` }}>
                <button
                  type="button"
                  onClick={() => viewer.open(at)}
                  {...WARM}
                  aria-label={`Open ${s.by.name}'s photograph, ${at + 1} of ${shots.length}`}
                  className={cn(FRAME, "w-full")}
                  style={{ aspectRatio: s.ratio, maxHeight: cap }}
                >
                  <Image
                    src={s.src}
                    alt=""
                    fill
                    sizes={phone ? "330px" : `${Math.round(measure * 860)}px`}
                    className={INNER}
                  />
                </button>
                {/* Caption first, then the name, exactly as in the margin
                    beside a smaller plate. The first cut set the name
                    under a full-width plate and the caption under THAT,
                    which is a post: byline, then body. One order
                    everywhere, and it is the magazine's: the words, then
                    who they belong to. */}
                {!aside && s.caption && (
                  <p className="mt-2.5 max-w-[62ch] text-[14px] leading-[1.55] text-muted-foreground">
                    {s.caption}
                  </p>
                )}
                {!aside && <FootLine shot={s} bird={22} className="mt-2.5" />}
              </div>

              {aside && (
                <div
                  className={cn(
                    "min-w-0 flex-1 pb-1",
                    side === "right" && "text-right",
                  )}
                >
                  {/* Words first, then who said them. A caption set above a
                      name reads as a remark and its attribution, which is
                      what it is; a name above a caption reads as a byline
                      and turns the photograph into a post. The measure is
                      held at 30 characters however wide the margin gets:
                      13.5px type across 479px is 60 characters a line and
                      unreadable. */}
                  {s.caption && (
                    <p
                      className={cn(
                        "mb-2.5 line-clamp-6 max-w-[30ch] text-[13.5px] leading-[1.5] text-muted-foreground",
                        side === "right" && "ml-auto",
                      )}
                    >
                      {s.caption}
                    </p>
                  )}
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-2",
                      side === "right" && "flex-row-reverse",
                    )}
                  >
                    <FlushBird person={s.by} size={phone ? 24 : 28} />
                    <span className="min-w-0 shrink truncate text-[14px] font-medium leading-none text-foreground">
                      {s.by.name}
                    </span>
                    <span className={side === "right" ? "-mr-1 shrink-0" : "-ml-1 shrink-0"}>
                      <Heart shot={s} />
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {viewer.mounted && (
        <LazyImageViewer
          images={viewerShots(shots)}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

/* ══ A STACK ═══════════════════════════════════════════════════════════ *
 *  One photograph at a time, the full column, the contributor underneath,
 *  and you move through them. Reads as a slideshow.
 *
 *  THE FRAME TWEENS ITS SHAPE, and that is the whole reason this is not
 *  jarring. Stepping from the widest photograph the app owns to the
 *  tallest moves the box from 856 by 508 to 413 by 620, which is 443px of
 *  width and 112px of height, and if the shape changes on the first frame
 *  of a cross dissolve the edges jump while the pixels are still
 *  fading. That is
 *  exactly the fault he reported in the viewer on 2026-09-07 ("is that a
 *  polished way of doing it, by just jankily moving up the window
 *  size?"), and the fix that shipped is the one used here: both frames
 *  dissolve inside one box that tweens from the outgoing shape to the
 *  incoming one, over the step's own duration. See the long comment on
 *  `box` in `src/components/common/image-viewer.tsx`.
 *
 *  THE STEP IS THE APP'S NAMED ONE (DESIGN-SYSTEM 7): incoming drifts
 *  28px from the direction of travel, outgoing slips 18px the other way,
 *  opacity asymmetric so the cross never dips see-through, and no scale
 *  in an image-to-image step, ever.
 *
 *  THE RAIL IS NOT DOTS. Two hundred dots is not an index. A hairline
 *  that fills is one object at any length, it is pressable so getting to
 *  photograph 150 is one gesture rather than 149, and the count beside it
 *  is the only place in this shape that admits how big the wall is.
 *  Without that press, the claim that a stack survives two hundred
 *  photographs is not true: it survives drawing them and not reaching
 *  them.
 * ═══════════════════════════════════════════════════════════════════════ */

const STEP = 0.22;

export function Stack({ shots, phone }: ShapeProps) {
  const viewer = useImageViewer();
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const frame = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const dragged = useRef(false);

  /* The column's real width, because the frame's height is computed from
     it and then animated. Percentages cannot be tweened against a shape. */
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /* THE BOX IS THE PHOTOGRAPH'S OWN SHAPE, both ways.
     Height alone was the first cut and it cropped: a 2:3 portrait in an
     856px column wants to be 1,284px tall, the cap pulled it to 620, and
     object-cover then showed 48% of a photograph in the one shape whose
     whole job is to show the photograph. So a tall one gets NARROWER
     instead, centred in the column, and the box tweens on both axes the
     way the viewer's does. Nothing in a stack is ever cropped. */
  const cap = phone ? 520 : 620;
  const s = shots[Math.min(at, shots.length - 1)];
  const boxW = width
    ? Math.round(Math.min(width, cap * s.ratio))
    : 0;
  const boxH = boxW
    ? Math.max(200, Math.round(boxW / s.ratio))
    : cap;

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(next, shots.length - 1));
      setAt((prev) => {
        if (clamped === prev) return prev;
        setDir(clamped > prev ? 1 : -1);
        return clamped;
      });
    },
    [shots.length],
  );

  const scrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const p = (e.clientX - box.left) / Math.max(1, box.width);
    go(Math.round(p * (shots.length - 1)));
  };

  const alone = shots.length === 1;

  return (
    <>
      {/* The drag lives on this wrapper and never on the keyed frame it
          would exit with (DESIGN-SYSTEM 7). `dragDirectionLock` is what
          leaves a vertical swipe to the page. */}
      <m.div
        ref={frame}
        drag={alone ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60) go(at + 1);
          else if (info.offset.x > 60) go(at - 1);
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }}
        className="relative w-full touch-pan-y"
      >
        <m.div
          /* Flush LEFT, not centred. A centred plate whose width changes
             every step leaves the name under it starting somewhere new each
             time, while the question above and the question below are both
             flush with the column. One left edge for the whole page. */
          className="relative overflow-hidden rounded-[var(--radius-md)] bg-muted"
          initial={false}
          animate={boxW ? { width: boxW, height: boxH } : { width: "100%", height: boxH }}
          transition={{ duration: width ? STEP : 0, ease: EASE_OUT_SMOOTH }}
        >
          <AnimatePresence mode="sync" initial={false} custom={dir}>
            <m.button
              key={at}
              type="button"
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -18 }}
              transition={{
                x: { duration: STEP, ease: EASE_IN_OUT_SCENE },
                opacity: { duration: STEP, ease: EASE_IN_OUT_SCENE },
              }}
              onClick={() => {
                if (!dragged.current) viewer.open(at);
              }}
              {...WARM}
              aria-label={`Open ${s.by.name}'s photograph full screen`}
              className="absolute inset-0 block h-full w-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
            >
              <Image
                src={s.src}
                alt=""
                fill
                sizes={phone ? "390px" : "900px"}
                className="object-cover"
                priority={at === 0}
              />
            </m.button>
          </AnimatePresence>
        </m.div>
      </m.div>

      {/* The contributor gets a whole line to themselves here, which is
          the one thing this shape can afford that the other two cannot.
          It crossfades rather than travelling: the photograph moves, its
          caption does not chase it. */}
      {/* The caption's room is RESERVED whether or not there is a caption,
          and that is the price of a control that does not move. Without it
          the rail jumped 25px between a photograph somebody wrote under and
          one they did not, under the thumb that was pressing it. Two lines
          are held; a longer caption clamps at four and moves it once. */}
      <div className="mt-3.5">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={at}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT_SMOOTH }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <FlushBird person={s.by} size={40} />
              <span className="min-w-0 shrink truncate text-[17px] font-medium leading-none text-foreground">
                {s.by.name}
              </span>
              <span className="-ml-1 shrink-0">
                <Heart shot={s} size="md" />
              </span>
            </div>
            <p className="mt-2 line-clamp-4 min-h-[48px] max-w-[62ch] text-[15px] leading-[1.6] text-muted-foreground">
              {s.caption}
            </p>
          </m.div>
        </AnimatePresence>
      </div>

      {!alone && (
        <div className="mt-4 flex items-center gap-3">
          <StepButton
            label="Previous photograph"
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <CaretLeft size={16} weight="bold" />
          </StepButton>
          {/* Pressable, so photograph 150 of 200 is one gesture. */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Which photograph"
            aria-valuemin={1}
            aria-valuemax={shots.length}
            aria-valuenow={at + 1}
            onClick={scrub}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(at + 1);
              if (e.key === "ArrowLeft") go(at - 1);
            }}
            className="h-6 flex-1 cursor-pointer place-content-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {/* Neutral, not cinnamon: the 2px cinnamon mark that opens a
                question section is 32px wide, and at 24 photographs this
                fill starts at 35. Two cinnamon dashes 80px apart read as
                the start of another question. The mark keeps cinnamon. */}
            <div className="h-[3px] w-full overflow-hidden rounded-full bg-foreground/12">
              <m.div
                className="h-full rounded-full bg-foreground/45"
                initial={false}
                animate={{ width: `${((at + 1) / shots.length) * 100}%` }}
                transition={{ duration: STEP, ease: EASE_OUT_SMOOTH }}
              />
            </div>
          </div>
          <StepButton
            label="Next photograph"
            disabled={at === shots.length - 1}
            onClick={() => go(at + 1)}
          >
            <CaretRight size={16} weight="bold" />
          </StepButton>
          <span className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">
            {at + 1} / {shots.length}
          </span>
        </div>
      )}

      {viewer.mounted && (
        <LazyImageViewer
          images={viewerShots(shots)}
          initialIndex={viewer.at ?? 0}
          open={viewer.at !== null}
          onClose={viewer.close}
        />
      )}
    </>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="state-layer grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35 active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

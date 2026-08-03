"use client";

/* ------------------------------------------------------------------ *
 *  TIME STAVE - the house chain drawn on an academic-year axis.
 *
 *  THE IDEA. Every other treatment of this chain packs pills until the
 *  line is full and then turns. That is why the owner (2026-08-02) sees
 *  "a random break in the line": the break happens where the WORDS ran
 *  out, which is a fact about typography, not about his school career.
 *  Here the horizontal direction is time. One academic year is one
 *  column of fixed width, every column on every line is the same width,
 *  and a house occupies exactly as many columns as it lasted. So Palm
 *  2016-18 is visibly twice the run of Golden 2014-15, and a line ends
 *  because the YEARS ran out at the right edge, the way a line of sheet
 *  music ends when the bar count is reached. That single change answers
 *  the owner's two complaints at once: the break now has a reason, and
 *  the space between two pills is no longer an over-long arrow, it is
 *  the length of time he spent there.
 *
 *  WHAT EACH PART IS
 *  - Pills: the kit's, untouched. Same tints, same type, same year
 *    label ("I do like the colors. I like the style of the pills, this
 *    font, with the year written how it is"). A pill is never stretched,
 *    padded or re-tinted here; it is only POSITIONED, at the left edge
 *    of the year it began.
 *  - The stave line: under each row of pills, a thin tinted ribbon per
 *    house running the full length of that house's years, notched at
 *    each year boundary. The ribbon is what carries duration, so the
 *    pill never has to change size to say it. It is also the connector:
 *    the ribbons tile the line end to end, so there is no empty lane
 *    anywhere for an arrow to have to span.
 *  - The kit's arrow sits ON that line, in the break between one
 *    house's ribbon and the next. It is always exactly ARROW_W wide,
 *    at the year boundary where the change actually happened, and it is
 *    never asked to reach across a gap - the ribbon already did that.
 *
 *  THE FOUR HARD CASES, and the answers taken:
 *
 *  1. A LONG NAME IN A ONE-YEAR SLOT. "Alamanda 2021-22" measures
 *     131.4px; a one-year column that is narrower than that would clip
 *     it. Rather than shrink the pill (not mine to change), truncate it
 *     (loses the name) or let it overrun its year (makes the axis lie),
 *     the column WIDTH is derived from the pills: one year is worth at
 *     least the widest pill that has to fit inside a single year, plus
 *     the kit's GAP. Long names therefore buy fewer years per line
 *     rather than a broken axis, and the axis stays exactly uniform.
 *     Measured: the owner's chain needs 137.4px per year, so 688px of
 *     sheet holds five years per line and his nine years take two.
 *
 *  2. TWO HOUSES IN THE SAME YEAR (his Alamanda and Jacaranda, both
 *     2021-22). They are drawn as a chord: both pills in the one 2021
 *     column, stacked, sharing one ribbon. No arrow between them,
 *     because there is no "then" between them - they are the same year,
 *     and this is the only layout in the set that can say so instead of
 *     lying about it with an arrow. Only the line that holds a chord
 *     pays the extra pill height; the other lines stay single.
 *
 *  3. A RUN THAT CROSSES THE END OF A LINE. It is tied, like a note
 *     held over a bar line: the pill sits on the first year, the ribbon
 *     runs flush off the right edge, and the same tint picks up at
 *     column zero of the next line with no arrow between the two halves
 *     (an arrow would claim a house change that did not happen). This
 *     is worth its complexity: at 480px it takes the owner's chain from
 *     four lines to three and leaves every line but the last exactly
 *     full.
 *
 *  4. A GAP IN THE RECORD (years with no house saved). One column, with
 *     a dashed rule where a ribbon would be, never its true length. An
 *     unrecorded stretch is not worth half a line, but collapsing it to
 *     nothing would put two non-adjacent years side by side. It is given
 *     up entirely rather than pushing the next house onto a new line.
 *
 *  MEASURED, on the owner's nine spans, in real Chrome at the real font
 *  (the numbers every constant below is argued against):
 *
 *    width   first pill   height   lines   longest bare run   line fill
 *    900px   0px          100.5px  2       6px                99% / 77%
 *    820px   0px          100.5px  2       6px                99% / 76%
 *    688px   0px          100.5px  2       6px                99% / 76%
 *    620px   0px          143.5px  3       6px                100/99/95%
 *    480px   0px          143.5px  3       6px                100/99/94%
 *    390px   0px          229.5px  5       6px                98% x4, 42%
 *    302px   0px          229.5px  5       6px                98% x4, 40%
 *
 *  The first pill sits at exactly 0 at every width and every span count
 *  (1, 2, 3, 5, 9 and 12 houses, plus chords, ties and gaps), nothing
 *  ever crosses the right edge (the host's scrollWidth equals its width
 *  at every size), and the longest stretch of bare background anywhere
 *  on a line is 6px, the gap between one house's ribbon and the next.
 *  That last number is the one the owner's complaint lives in: there is
 *  no arrow anywhere in this layout with empty space either side of it.
 * ------------------------------------------------------------------ */

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRINGS } from "@/components/common/motion";
import type { HouseSpan } from "@/lib/house-spans";
import {
  Arrow,
  ARROW_W,
  ChainScreenReaderText,
  GAP,
  HOUSE_TINTS,
  Pill,
  PILL_CLASS,
  useChainMetrics,
  type ChainMeta,
  type ChainProps,
} from "./_chain-kit";

export const META: ChainMeta = {
  key: "stave",
  label: "Time stave",
  blurb:
    "Years are the axis. One academic year is one column of fixed width on every line, so a house is as wide as it lasted and a line ends because the years ran out, not because the pills did.",
};

/* ================================================================== *
 *  GEOMETRY. Every number here was measured against the real pills at
 *  the real font (Libre Baskerville 12.5px bold + Source Sans 10.5px
 *  tabular): pill height 22.5px, widths 89.8px ("Red 2014-15") to
 *  132.3px ("Gulmohar 2014-15"), the owner's nine spans running 98.0px
 *  to 131.4px.
 * ================================================================== */

/** Vertical air between a pill and the ribbon that measures its years.
 *  LiftKit `--space-xs` (0.382) against the pill's own 12.5px type is
 *  4.8px; taken as 5 so it lands on a device pixel. Deliberately the
 *  SMALLEST step in this file: the pill and its ribbon are one object,
 *  and every px here is paid once per line of a chain the owner already
 *  told us not to give much room ("house is just a fun thing... don't
 *  give it so much space"). It is 5 of the 30px a plain line costs
 *  (22.5 pill + 5 + 2.5 ribbon), and 5 of the 229.5px the owner's chain
 *  costs at 302px, which is where a fatter value would be felt. */
const BAR_GAP = 5;

/** The ribbon's thickness. Twice the kit's 1.25px arrow stroke, which
 *  is the point: the arrow is a mark ON this line, so the line has to
 *  read as heavier than the mark or the arrow disappears into it. Above
 *  ~3px it stops reading as a rule and starts reading as a second, very
 *  short row of pills. */
const BAR_H = 2.5;

/** How much of a house's tint the ribbon carries. The pill next to it
 *  is border-tint/30 on a tint/0.07 fill; a solid bar at full strength
 *  out-shouts the pill it belongs to, and below ~0.4 the sky tint goes
 *  grey against the warm background. 0.5 keeps the ribbon clearly the
 *  same colour as its pill and clearly quieter than it. */
const BAR_OPACITY = 0.5;

/** The break in the ribbon at a year boundary INSIDE one house's run,
 *  which is what makes a two-year run legible as two years rather than
 *  one long bar. LiftKit `--space-xxs` (0.236) at 12.5px type is 2.9px,
 *  taken as 3: below that it reads as a rendering artefact at 2.5px bar
 *  height, above it the run stops reading as continuous. */
const NOTCH = 3;

/** Air after a house's ribbon before the next house's column starts.
 *  The kit's GAP, reused rather than re-invented, so the break on the
 *  ribbon line is exactly the break the pill row already uses. */
const BAR_END_TRIM = GAP;

/** What one house-to-house transition costs at the end of a ribbon: the
 *  arrow glyph, the same GAP again in front of it so it is not welded to
 *  the ribbon, and the trim behind it. Charged to the ribbon, never to
 *  the pill row, which is why a long name never loses its arrow. */
const ARROW_RESERVE = ARROW_W + GAP + BAR_END_TRIM;

/** The kit's Arrow renders an 18x10 svg but only exports its width, so
 *  the height is mirrored here to centre the glyph on the ribbon.
 *  Changing it would only mis-centre the arrow, never resize it. */
const ARROW_H = 10;

/** Vertical air between two stacked pills of the same chord. Same 5px
 *  as BAR_GAP: the two houses of one year and the ribbon under them are
 *  one cluster, so all the air inside that cluster is one value. The
 *  owner's chord is the whole reason his chain is 100.5px tall at 688px
 *  rather than 73px: 22.5 for the second pill plus this 5, paid on one
 *  line only, which is the cheapest honest way to say "same year". */
const LANE_GAP = 5;

/** Air between one line of the stave and the next. LiftKit `--space-m`
 *  at the pill's 12.5px type is 12.5px, taken as 13 for a whole device
 *  pixel. It has to be unmistakably larger than LANE_GAP (5) or a
 *  stacked chord would read as a new line of the stave rather than as
 *  two houses in one year; at 2.6x it is. Measured cost: 13px of the
 *  owner's 100.5px at 688px, 52px of his 229.5px at 302px. */
const STAVE_GAP = 13;

/** How many empty columns an unrecorded stretch of years is allowed to
 *  occupy. One: enough to show that something is missing, never enough
 *  for a five-year hole in someone's saved data to eat a whole line.
 *  Measured on a chain with a four-year hole at 688px: at its true
 *  length the hole left a 164px run of bare background, which is the
 *  exact look being designed out; capped at one column and filled with
 *  the dashed rule, the longest bare run drops to 12px. */
const MAX_GAP_COLS = 1;

/* ================================================================== *
 *  PLANNING. Pure functions over measured pill widths; no DOM, so the
 *  same numbers can be checked in a probe without rendering React.
 * ================================================================== */

/** A run of academic years occupying one position on the axis. Normally
 *  one house; more than one when spans overlap in time, which is the
 *  chord case (the owner's Alamanda and Jacaranda, both 2021-22). */
interface Slot {
  spanIdxs: number[];
  fromYear: number;
  toYear: number;
  cols: number;
}

/** Group the spans into slots. Any span that starts before the current
 *  slot has finished joins it rather than opening a new one, so two
 *  houses in one year (or two overlapping runs) can never be laid out
 *  as two consecutive positions in time, which would be false. */
function buildSlots(spans: HouseSpan[]): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < spans.length; i++) {
    const from = spans[i].fromYear;
    // Malformed data (toYear before fromYear) collapses to a one-year run
    // rather than producing a negative column count.
    const to = Math.max(spans[i].toYear, from);
    const last = slots[slots.length - 1];
    if (last && from <= last.toYear) {
      last.spanIdxs.push(i);
      last.toYear = Math.max(last.toYear, to);
      last.cols = last.toYear - last.fromYear + 1;
    } else {
      slots.push({ spanIdxs: [i], fromYear: from, toYear: to, cols: to - from + 1 });
    }
  }
  return slots;
}

/** The px value of one academic year: the smallest column that still
 *  lets every pill sit inside its own run, so the axis never has to
 *  stretch locally to fit a name. A multi-year run divides its pill's
 *  demand across its columns, which is why "Palm 2016-18" (98.0px over
 *  two years, so 52.0px per year) costs the layout nothing, while a
 *  one-year "Alamanda 2021-22" (131.4px + pad) sets the floor.
 *
 *  `pad` is the air charged after each pill: GAP (6px) is the tightest
 *  the column may ever get, which is what buys the most years per line
 *  when the sheet is narrow. Measured on the owner's chain: at GAP the
 *  column is 137.4px and 688px of sheet holds five years, so his nine
 *  years take two lines; one px more per column and it holds four, and
 *  he gets three lines. That is how little slack there is, and it is
 *  why the tight value, not a comfortable one, drives the packing. */
function columnUnit(slots: Slot[], spans: HouseSpan[], widths: number[], pad: number): number {
  let unit = 1;
  for (const slot of slots) {
    for (const idx of slot.spanIdxs) {
      const offset = Math.max(0, spans[idx].fromYear - slot.fromYear);
      const room = Math.max(1, slot.cols - offset);
      unit = Math.max(unit, (widths[idx] + pad) / room);
    }
  }
  return unit;
}

/** One slot, or one line's worth of a slot that got tied across a line
 *  break. Which pills a piece draws is derived from the years it
 *  covers rather than stored, so a partner house that starts after the
 *  break lands on the piece that actually holds its first year. */
interface Piece {
  slotIdx: number;
  /** First column of this piece, counted from the line's left edge, so
   *  the first piece of every line is at column 0 with no exceptions.
   *  This is what keeps the first pill flush left at every span count. */
  col: number;
  cols: number;
  /** Years of this slot already drawn on earlier lines. */
  yearOffset: number;
  /** The run continues onto the next line, so no arrow and no trim. */
  ties: boolean;
}

/**
 * Fill lines of `perStave` columns, left to right, never leaving a
 * column of a line unused when the next house could occupy it.
 *
 * A run longer than the space left on the line is TIED across the break
 * (see the header) rather than pushed whole to the next line, which is
 * what stops a line ending three-quarters empty. The one exception is
 * the head piece: if the pill would not fit inside the columns still
 * left on this line, the whole run moves down instead, because a pill
 * that overruns its own run is exactly the lie this layout exists to
 * avoid.
 */
function packStaves(
  slots: Slot[],
  widths: number[],
  perStave: number,
  colW: number
): Piece[][] {
  const staves: Piece[][] = [];
  let cur: Piece[] = [];
  let cursor = 0;
  let prevToYear: number | null = null;

  const flush = () => {
    if (cur.length > 0) {
      staves.push(cur);
      cur = [];
      cursor = 0;
    }
  };

  for (let k = 0; k < slots.length; k++) {
    const slot = slots[k];
    const widest = Math.max(...slot.spanIdxs.map((i) => widths[i]));
    // A gap in the record costs at most MAX_GAP_COLS, and costs nothing
    // at all at the start of a line: a line never opens on an indent.
    let gap =
      prevToYear === null
        ? 0
        : Math.min(Math.max(slot.fromYear - prevToYear - 1, 0), MAX_GAP_COLS);
    let drawn = 0;
    while (drawn < slot.cols) {
      if (cur.length === 0) gap = 0;
      const wontFit = (at: number) => {
        const room = perStave - at;
        const left = slot.cols - drawn;
        return (
          room <= 0 ||
          (cur.length > 0 && drawn === 0 && room < left && widest + GAP > room * colW)
        );
      };
      // An unrecorded year is worth one column, never a whole line. If
      // holding it open is the only thing pushing the next house down,
      // close it up: half an empty line is a worse lie about the record
      // than a missing dash, and the pills still name both years.
      if (wontFit(cursor + gap) && gap > 0) gap = 0;
      const col = cursor + gap;
      const avail = perStave - col;
      const remaining = slot.cols - drawn;
      if (wontFit(col)) {
        // `cur` is non-empty here (on a fresh line `avail` is perStave,
        // i.e. at least 1), so this always makes progress.
        flush();
        continue;
      }
      const take = Math.min(remaining, avail);
      cur.push({
        slotIdx: k,
        col,
        cols: take,
        yearOffset: drawn,
        ties: take < remaining,
      });
      cursor = col + take;
      gap = 0;
      drawn += take;
      if (drawn < slot.cols) flush();
    }
    prevToYear = slot.toYear;
  }
  flush();
  return staves;
}

/** One absolutely positioned thing to draw. Coordinates are px from the
 *  top left of the whole chain, so the drawing is a flat list and a
 *  probe can read every position straight off it. */
interface Placed {
  key: string;
  spanIdx: number;
  x: number;
  y: number;
  w: number;
}

interface StavePlan {
  height: number;
  colW: number;
  pills: Placed[];
  cells: Placed[];
  /** Unrecorded years: a dashed rule instead of a house's ribbon. */
  gaps: { key: string; x: number; y: number; w: number }[];
  arrows: { key: string; x: number; y: number }[];
}

/**
 * Choose the column width and lay the whole chain out.
 *
 * Two competing wants: the narrowest columns fit the most years per
 * line (fewest lines), the widest columns fill each line out to the
 * right edge (no ragged whitespace). So: start at the densest legal
 * column, then widen the column one year-per-line at a time for as long
 * as the line COUNT does not grow, and keep the last width that held.
 * At 900px on the owner's chain that turns lines of 6 and 3 years into
 * lines of 5 and 4, at the same two lines tall.
 *
 * The exception is a chain that already fits on one line. There, widening
 * to the full sheet would spread three pills across 688px with nothing
 * but ribbon between them, so a single line stays at its natural density,
 * flush left and ragged right, which is the case the owner had no
 * complaint about ("when the houses all fit in one line there's no
 * problem"). Natural density there means the column is the widest pill
 * plus ARROW_RESERVE rather than plus GAP: at GAP the pills sit 6px
 * apart, which reads as one crowded strip, and the ribbon comes out
 * shorter than the pill sitting on it. At ARROW_RESERVE the pills are
 * one arrow apart, exactly like the shipped chain's one-line case, and
 * the widest ribbon comes out exactly as long as the widest pill.
 */
function planStave(
  spans: HouseSpan[],
  widths: number[],
  pillH: number,
  containerW: number
): StavePlan | null {
  if (spans.length === 0 || containerW <= 0 || widths.length < spans.length) return null;

  const slots = buildSlots(spans);
  const totalCols = slots.reduce((sum, slot, i) => {
    const gap =
      i === 0
        ? 0
        : Math.min(Math.max(slot.fromYear - slots[i - 1].toYear - 1, 0), MAX_GAP_COLS);
    return sum + gap + slot.cols;
  }, 0);

  const unit = columnUnit(slots, spans, widths, GAP);
  const densest = Math.max(1, Math.min(totalCols, Math.floor(containerW / unit)));
  const oneLine = totalCols <= densest;

  let perStave = densest;
  let colW: number;
  if (oneLine) {
    // Between the two densities, take whatever the sheet actually has:
    // the roomy column when there is space for it, the exact fit when
    // there is not (390px of phone with three houses lands at 130px per
    // year, which is neither cramped at 6px nor stretched to 300px).
    colW = Math.min(columnUnit(slots, spans, widths, ARROW_RESERVE), containerW / totalCols);
  } else {
    colW = containerW / densest;
  }
  let staves = packStaves(slots, widths, perStave, colW);
  if (!oneLine) {
    for (let p = densest - 1; p >= 1; p--) {
      const trialW = containerW / p;
      const trial = packStaves(slots, widths, p, trialW);
      // Monotone in practice (wider columns never fit more years), so the
      // first regression is the stopping point rather than a local dip.
      if (trial.length > staves.length) break;
      perStave = p;
      colW = trialW;
      staves = trial;
    }
  }

  const pills: Placed[] = [];
  const cells: Placed[] = [];
  const gaps: { key: string; x: number; y: number; w: number }[] = [];
  const arrows: { key: string; x: number; y: number }[] = [];
  const lastSlotIdx = slots.length - 1;
  let y = 0;

  /** The spans a piece is responsible for drawing: the ones whose first
   *  year falls inside the years this piece covers. Almost always the
   *  whole slot on its head piece, but a slot that got tied across a
   *  line break must hand a late-starting partner to the piece that
   *  actually holds that year, or the pill lands past the right edge. */
  const hosted = (piece: Piece) => {
    const slot = slots[piece.slotIdx];
    return slot.spanIdxs.filter((idx) => {
      const offset = Math.max(0, spans[idx].fromYear - slot.fromYear);
      return offset >= piece.yearOffset && offset < piece.yearOffset + piece.cols;
    });
  };

  for (let s = 0; s < staves.length; s++) {
    const line = staves[s];
    const lanes = Math.max(1, ...line.map((piece) => hosted(piece).length));
    const pillBandH = lanes * pillH + (lanes - 1) * LANE_GAP;
    const barY = y + pillBandH + BAR_GAP;
    let filledTo = 0;

    for (const piece of line) {
      const slot = slots[piece.slotIdx];
      const x = piece.col * colW;
      const w = piece.cols * colW;

      // An unrecorded year holds its column open (see MAX_GAP_COLS) and
      // gets a dashed rule rather than nothing, because a bare 164px hole
      // in the line is exactly the "very inefficient job" look this
      // layout exists to remove, and because "no house saved for this
      // year" is a fact worth drawing rather than a hole worth hiding.
      if (x - filledTo > 2 * BAR_END_TRIM) {
        gaps.push({
          key: `g-${s}-${piece.slotIdx}`,
          x: filledTo + BAR_END_TRIM,
          y: barY,
          w: x - filledTo - 2 * BAR_END_TRIM,
        });
      }
      filledTo = x + w;
      const arrowFollows = !piece.ties && piece.slotIdx < lastSlotIdx;
      // A tied run runs flush off the right edge, which is the signal
      // that it continues. Everything else stops one ARROW_RESERVE short
      // of its last year's end, INCLUDING the final house of the chain,
      // which has no arrow to make room for: charging every ribbon the
      // same reserve is what keeps them all the same length, and the
      // alternative left the last one hanging 24px past its own pill
      // like a loose thread.
      const endTrim = piece.ties ? 0 : ARROW_RESERVE;

      // The ribbon, one cell per academic year. Every cell but the last
      // is exactly one column wide less the notch, so the last cell of a
      // run is the only short one and reads as the run trailing into its
      // arrow rather than as an uneven ruler.
      for (let c = 0; c < piece.cols; c++) {
        const isLast = c === piece.cols - 1;
        const cw = isLast ? w - c * colW - endTrim : colW - NOTCH;
        if (cw <= 0) continue;
        // One slot can hold several houses, so a year takes the tint of
        // the FIRST house that covers it. For the chord this is the pill
        // sitting on the ribbon (they cover the same years, so the two
        // always agree); for the rarer partial overlap it means the
        // ribbon changes colour on the year the older house ended,
        // rather than claiming the whole run for it.
        const year = slot.fromYear + piece.yearOffset + c;
        const tint =
          slot.spanIdxs.find(
            (i) => spans[i].fromYear <= year && Math.max(spans[i].toYear, spans[i].fromYear) >= year
          ) ?? slot.spanIdxs[0];
        cells.push({
          key: `c-${s}-${piece.slotIdx}-${piece.yearOffset + c}`,
          spanIdx: tint,
          x: x + c * colW,
          y: barY,
          w: cw,
        });
      }

      if (arrowFollows) {
        arrows.push({
          key: `a-${s}-${piece.slotIdx}`,
          x: x + w - BAR_END_TRIM - ARROW_W,
          y: barY + BAR_H / 2 - ARROW_H / 2,
        });
      }

      // Lane 0 is the bottom pill, sitting on the ribbon, so the chain
      // itself never leaves the line: a chord's second house stacks
      // ABOVE it rather than displacing it.
      hosted(piece).forEach((spanIdx, lane) => {
        const offset = Math.max(0, spans[spanIdx].fromYear - slot.fromYear);
        const wanted = x + (offset - piece.yearOffset) * colW;
        pills.push({
          key: `p-${spanIdx}`,
          spanIdx,
          // Last-resort clamp for a partner that starts in the final
          // column of a very wide run: it can only ever pull a pill
          // LEFT, so the first pill of a line stays at exactly 0.
          x: Math.max(0, Math.min(wanted, containerW - widths[spanIdx])),
          y: y + (lanes - 1 - lane) * (pillH + LANE_GAP),
          w: widths[spanIdx],
        });
      });
    }

    y += pillBandH + BAR_GAP + BAR_H;
    if (s < staves.length - 1) y += STAVE_GAP;
  }

  return { height: y, colW, pills, cells, gaps, arrows };
}

/* ================================================================== *
 *  RENDER
 * ================================================================== */

export default function ChainStave({ spans, className }: ChainProps) {
  const { hostRef, measurer, metrics } = useChainMetrics(spans);
  const plan = metrics
    ? planStave(spans, metrics.widths, metrics.pillH, metrics.containerW)
    : null;

  return (
    <div ref={hostRef} className={cn("relative w-full", className)}>
      <ChainScreenReaderText spans={spans} />
      {measurer}
      {plan ? (
        <div aria-hidden className="relative" style={{ height: plan.height }}>
          {plan.cells.map((cell, i) => (
            // The ribbon draws itself left to right, in time order, which
            // is scaleX from a left origin: a transform, so nothing here
            // animates a layout property.
            <motion.span
              key={cell.key}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: BAR_OPACITY, scaleX: 1 }}
              transition={{ ...SPRINGS.gentle, delay: 0.03 * i }}
              className={cn("absolute block rounded-full", HOUSE_TINTS[cell.spanIdx % HOUSE_TINTS.length])}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: BAR_H,
                // The tint class supplies the colour; painting the bar in
                // currentColor keeps the ribbon and its pill on one hue
                // without inventing a second set of tint utilities.
                backgroundColor: "currentColor",
                transformOrigin: "left center",
              }}
            />
          ))}

          {plan.gaps.map((gapRun) => (
            <span
              key={gapRun.key}
              className="absolute block text-muted-foreground"
              style={{
                left: gapRun.x,
                top: gapRun.y,
                width: gapRun.w,
                height: BAR_H,
                opacity: 0.3,
                // Dashes, not a solid rule: a solid one would read as one
                // more house whose name failed to render. 3px on, 4px off
                // is the smallest dash that still reads as deliberate at
                // 2.5px thick.
                backgroundImage:
                  "repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 7px)",
              }}
            />
          ))}

          {plan.arrows.map((arrow, i) => (
            <motion.span
              key={arrow.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.18 + 0.05 * i }}
              className="absolute block"
              style={{ left: arrow.x, top: arrow.y }}
            >
              <Arrow back={false} />
            </motion.span>
          ))}

          {plan.pills.map((pill) => (
            <motion.span
              key={pill.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SPRINGS.gentle, delay: 0.04 * pill.spanIdx }}
              className={cn(PILL_CLASS, "absolute", HOUSE_TINTS[pill.spanIdx % HOUSE_TINTS.length])}
              style={{ left: pill.x, top: pill.y }}
            >
              <Pill span={spans[pill.spanIdx]} />
            </motion.span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

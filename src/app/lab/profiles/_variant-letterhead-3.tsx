"use client";

/* ------------------------------------------------------------------ *
 *  Concept: Letterhead III (2026-08-02)
 *
 *  A fork of Letterhead II, not a new direction. Everything the owner
 *  signed off on in the 2026-07-30 review is kept verbatim: equal sheet
 *  padding on all four sides, the 8px colophon-to-name step, the
 *  verified leaf on the name's baseline, one action in line with the
 *  name, the bird perched on the sheet's top-right edge that does not
 *  move, the photo-circle override on the left edge measured off the
 *  DOM, the cities as one flat equal comma series, and the writing
 *  below as free PostCards with nothing wrapped around them. Letterhead
 *  II is still at ?v=letterhead-2 so the two can be compared.
 *
 *  SIX CHANGES, each from the owner's 2026-08-02 note:
 *
 *  1. THE HOUSE CHAIN IS SWITCHABLE, AND SO IS THE DATA IT DRAWS. Six
 *     chain treatments were built as ./_chain-<key>.tsx. `?chain=<key>`
 *     picks which one the Houses section draws; `?fixture=<key>` picks
 *     the spans it draws them from (see FIXTURES below, added 2026-08-02
 *     because every earlier screenshot judged the six treatments against
 *     _data.ts's easier eight-span mock and never once rendered the
 *     owner's real nine). Both are lab chrome and live in the fixed
 *     panel on the right, never on the sheet: Letterhead II established
 *     that the concept has to start at the very top of the shell's
 *     gutter, exactly where the shipped page starts, or every judgement
 *     about its weight is made against the wrong thing.
 *
 *  2. THE OCCUPATION IS THE FOURTH FACT. "We have batch, in the valley,
 *     and cities... especially on phone when you're ordering them up as
 *     a grid, you have an empty spot because it's a two by two grid and
 *     we only have three things... I'd prefer the occupation, but I'm
 *     afraid it won't fit."
 *     It fits, and it costs nothing, because it is a MOVE and not an
 *     addition: the subtitle line under the name is deleted in the same
 *     stroke. How the fit was won, in order of what was tried:
 *       - No sub-value. The shipped design deliberately deleted every
 *         fact sub-line ("I really don't want these weird subtitles"),
 *         and splitting "Software Engineer" / "Bluepeak Systems" across
 *         a value and a sub-value would put the first one back for the
 *         sake of a single fact. Rejected.
 *       - No truncation. Clipping someone's employer to fit a column is
 *         the same ranking the cities fix existed to remove.
 *       - So: the value WRAPS inside its own cell, and the grid is
 *         reflowed so the cell is wide enough that it only ever wraps to
 *         two lines. See FACT_GRID below for the measured widths.
 *     Wrapping does not disturb the band's baseline grid: every cell is
 *     top-aligned in its grid row, so all four labels share one baseline
 *     and all four first value lines share the next. A second line only
 *     ever grows its own row downward.
 *
 *  3. THE FACT VALUES COME DOWN TO THE APP'S BODY RUNG. "The font size
 *     for that seems weirdly bigger than everywhere else in the app...
 *     we use a bunch of different fonts and we should try to standardize
 *     that." He is right. Counting the px type rungs actually in use
 *     across src/components and src/app: 15px is the single most used
 *     size in the product (185 occurrences: every feed post body, every
 *     letter body, the directory's person name, this sheet's own
 *     occupation line before it moved). 17px is used 107 times but
 *     almost entirely for long-form reading measures. A fact value is a
 *     datum, not a reading measure, so it goes to 15px and keeps
 *     semibold, which is where its emphasis was always coming from. The
 *     About paragraph moves to 15px/1.7 in the same pass, because that
 *     is byte-for-byte the feed PostCard's body style and About is the
 *     same kind of text; leaving it at 17 would have left the sheet
 *     holding the one paragraph in the app set larger than a post. The
 *     11px canopy caps label above each value is untouched, per the note.
 *
 *  4. THE COLOPHON NUMBER IS SIZED UP AND SAT ON THE HILLS' GROUND LINE.
 *     See COLOPHON below; the numbers and the measurement are there.
 *
 *  5. THE STAMP EARNS ITS POSITION. See `placeStamp` below.
 *
 *  6. THE ENGRAVED RULE UNDER THE FACTS IS DELETED. He handed the call
 *     over, so here it is, made rather than hedged.
 *     WHAT THE RULE WAS DOING: separating the masthead from the body.
 *     WHY IT NO LONGER HAS TO: the body opens with a canopy caps label
 *     ("About", "Houses"). That label is a colour change, a case change,
 *     a weight change and a size change all at once, sitting after a
 *     26px block gap. A 3px engraved groove cannot add to a boundary
 *     that emphatic; it can only restate it. The standing rule is that a
 *     box must earn its border and that a decorative band carrying no
 *     information gets deleted rather than restyled, and a divider whose
 *     entire job is already done by the thing directly under it is
 *     exactly that band.
 *     WHAT DELETING IT BUYS: 29px of sheet height (the rule plus its
 *     26px of air) on every profile, at the same moment the fact band
 *     grew a fourth cell. On a 390px phone that is most of the height
 *     the new fact costs, so the sheet comes out roughly where it was.
 *     Rendered both ways at 1440 and 390 before deciding; without the
 *     rule the sheet reads as one continuous piece of stationery, with
 *     it the masthead reads as a boxed header stuck on top of a page.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { motion, AnimatePresence } from "motion/react";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { VerifiedMark } from "@/components/common/verified-mark";
import { SegmentedPills } from "@/components/common/segmented-pills";
import { PostCard, type PostData } from "@/components/posts/post-card";
import { GetInTouch, type ContactMethod } from "@/components/profile/get-in-touch";
import { AdmissionStamp } from "@/components/profile/admission-stamp";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SpringPress, SPRINGS, EASE_OUT_SMOOTH, FadeRise } from "@/components/common/motion";
import type { HouseSpan } from "@/lib/house-spans";
import { CHAIN_FIXTURES, type ChainMeta, type ChainProps } from "./_chain-kit";
import ChainSerpentine, { META as SERPENTINE_META } from "./_chain-serpentine";
import ChainStepped, { META as STEPPED_META } from "./_chain-stepped";
import ChainRoute, { META as ROUTE_META } from "./_chain-route";
import ChainRail, { META as RAIL_META } from "./_chain-rail";
import ChainStave, { META as STAVE_META } from "./_chain-stave";
import ChainZigzag, { META as ZIGZAG_META } from "./_chain-zigzag";
import type { MockPost, MockProfile, ProfileVariantProps } from "./_data";

/* A faint grain so the sheet reads as paper, not a flat fill. */
const PAPER_GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
      "<feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#n)'/></svg>"
  );

/** Demo-only stand-in for real bookmark rows. */
const DEMO_SAVED_IDS = new Set(["letter1", "p2"]);

/** The concept assumes the viewer's own profile so the Saved tab can show. */
const IS_OWN_PROFILE = true;

/** Stand-in for an uploaded profile picture, to prove the photo masthead. */
const DEMO_PHOTO = "/images/collection/c3.webp";

/* ------------------------------------------------------------------ *
 *  The six house-chain treatments, in the order they were built. The
 *  first is the default, so `?chain=` can be omitted.
 * ------------------------------------------------------------------ */
const CHAINS: {
  meta: ChainMeta;
  Component: (props: ChainProps) => React.ReactNode;
  /** What the pill says, at BOTH sizes now. The full META labels ("Balanced
   *  serpentine", "Diagonal zigzag") take four rows on a 390px bar, and the
   *  bar floats over the concept, so it may not grow to fit its own
   *  vocabulary. The concept's own key is the honest short name and adds no
   *  new naming.
   *
   *  The desktop panel used to show the full label and paid six stacked rows
   *  for it (measured: a 130px pill in a 176px column is one pill per row,
   *  198px of panel for one control), which is exactly the room the house
   *  data switcher needed. The full label is not lost: it now titles the
   *  blurb under the pills, where only the SELECTED concept pays for it and
   *  it costs one line instead of six rows. */
  short: string;
}[] = [
  { meta: SERPENTINE_META, Component: ChainSerpentine, short: "Serpentine" },
  { meta: STEPPED_META, Component: ChainStepped, short: "Stepped" },
  { meta: ROUTE_META, Component: ChainRoute, short: "Route" },
  { meta: RAIL_META, Component: ChainRail, short: "Rail" },
  { meta: STAVE_META, Component: ChainStave, short: "Stave" },
  { meta: ZIGZAG_META, Component: ChainZigzag, short: "Zigzag" },
];

/* ------------------------------------------------------------------ *
 *  THE HOUSE DATA (`?fixture=`), 2026-08-02. Lab chrome, not a concept
 *  change.
 *
 *  Every screenshot of the six chain treatments so far was taken against
 *  _data.ts's mock: eight spans, every year distinct. The owner's actual
 *  saved chain is NINE spans and repeats a year (Alamanda and Jacaranda
 *  are both 2021-22), so the case all six treatments exist to fix had
 *  never once been on screen. This switcher picks the spans the Houses
 *  section draws, and it DEFAULTS to the owner's chain: the failing case
 *  is what should load when he opens the page, and the mock stays one
 *  pill away.
 *
 *  The spans come from CHAIN_FIXTURES in ./_chain-kit.tsx (the corpus the
 *  concepts were written against) rather than a second copy here, so the
 *  switcher cannot drift from the fixtures the kit documents. Only the
 *  pill WORDING is local: the kit's labels are sentences written for a
 *  doc ("Owner's real 9-span career (the failing case)"), and a sentence
 *  inside a pill in a 176px panel is four lines of pill.
 *
 *  How the seven are worded. The two that are somebody's real data lead
 *  and are named for whose they are, with their length, because that is
 *  the one thing the owner has to be able to tell apart at a glance
 *  ("Owner 9" against "Mock 8"). The three short fixtures and the long
 *  one are labelled with nothing but their span count, because length IS
 *  the only thing that distinguishes them and a count cannot be misread
 *  as a name. The widest-names fixture is named for what it stresses,
 *  since its length (5) is not the point.
 * ------------------------------------------------------------------ */
interface Fixture {
  key: string;
  /** The desktop panel's wording. */
  label: string;
  /** The mobile bar's wording, where the group label is not rendered and the
   *  bar floats over the concept, so every pill has to earn its width.
   *  Measured at 390: the seven short pills run 340px and land 9px clear of
   *  the glass at each end; carrying the two counts across would make the row
   *  356px, which eats the bar's whole 10px padding and puts a pill's rounded
   *  edge on the bar's own rounded edge. The counts are what tells the two
   *  REAL chains apart, so they are kept where there is room for them (the
   *  desktop panel) and dropped where there is not. */
  short: string;
  /** `null` means "draw the profile's own mock houses" (see _data.ts), so
   *  the mock is a fixture like any other instead of a special case in the
   *  render. */
  spans: HouseSpan[] | null;
}

/** Loud on purpose: a key renamed in the kit should break this room at
 *  import, not quietly serve an empty chain that then reads as a layout
 *  bug in whichever treatment happens to be selected. */
function kitFixture(key: string, label: string, short: string): Fixture {
  const found = CHAIN_FIXTURES.find((f) => f.key === key);
  if (!found) throw new Error(`letterhead-3: no chain fixture "${key}" in _chain-kit.tsx`);
  return { key, label, short, spans: found.spans };
}

/** The first is the default, so `?fixture=` can be omitted. */
const FIXTURES: Fixture[] = [
  kitFixture("owner-9", "Owner 9", "Owner"),
  { key: "mock", label: "Mock 8", short: "Mock", spans: null },
  kitFixture("single", "1", "1"),
  kitFixture("two", "2", "2"),
  kitFixture("three", "3", "3"),
  kitFixture("twelve", "12", "12"),
  kitFixture("widest", "Widest", "Widest"),
];

/**
 * The identity lockup's geometry, declared once and then DERIVED from.
 *
 * Two things in the masthead have to agree with the name's type: the photo
 * circle (its diameter is "top of the mark to the bottom of the name", the
 * owner's own definition) and the Get in touch pill (centred on the name's
 * line box). Both are calc()ed off these, so changing the name size moves
 * them correctly instead of leaving two magic numbers behind.
 *
 * `--lh3-colophon` is unchanged at 16px even though the number inside it got
 * bigger, which is deliberate: see COLOPHON below. Because it did not move,
 * the two derived measurements below did not have to move either.
 */
const IDENTITY_VARS = {
  "--lh3-colophon": "1rem", // the colophon row's fixed height: 16px
  "--lh3-gap": "0.5rem", // colophon -> name, Letterhead I's step: 8px
  "--lh3-name": "clamp(1.9rem, 7vw, 2.6rem)",
  "--lh3-head": "calc(var(--lh3-colophon) + var(--lh3-gap) + var(--lh3-name) * 1.05)",
  // Centre a 40px (h-10) pill on the name's line box.
  "--lh3-cta-top":
    "calc(var(--lh3-colophon) + var(--lh3-gap) + (var(--lh3-name) * 1.05 - 2.5rem) / 2)",
} as CSSProperties;

/* ------------------------------------------------------------------ *
 *  COLOPHON (change 4). "Make the admission number on top slightly
 *  bigger, because right now it's kind of really tiny when it doesn't
 *  have to be. And make sure it's aligned nicely with the hills."
 *
 *  Measured off the rendered DOM (scripts/qa is where the probe ran;
 *  numbers below are what Chrome reported, not what the font's tables
 *  imply):
 *
 *   - PeaksMark's viewBox is "-110 40 1140 350" and the silhouette's
 *     highest point is y=62, so 6.3% of the box is empty air above the
 *     ridge and the ink runs flush to the bottom edge. At the old
 *     size=15 inside a 16px row that left a 1px cushion of nothing
 *     under the hills, so the "8px to the name" step was really 9px
 *     measured from ink. The mark is now size=16, exactly the row
 *     height, so the row's bottom edge IS the ground line the hills sit
 *     on and the 8px step is 8px of paper.
 *   - The numerals go 11px -> 13px. 13px is the app's small-UI rung
 *     (174 uses: every segmented pill label, every filter chip), so
 *     this is a move onto a rung that already exists rather than a new
 *     size invented for one line. Rendered cap height goes 7.3px ->
 *     8.6px against 15.0px of mark ink, i.e. mark:numeral 2.06 -> 1.74.
 *     For reference the app's canonical Wordmark lockup (PeaksMark 24
 *     beside "Rishi Valley" at 18px) runs at 1.89, but that wordmark is
 *     Libre Baskerville, whose caps are far heavier than Source Sans 3
 *     at the same px, so matching its ratio numerically here would have
 *     left the digits reading lighter than the mark, which is the exact
 *     complaint.
 *   - Tracking goes 0.2em -> 0.16em. Wide tracking is a compensation
 *     for smallness; the number is no longer small, and 0.16em is the
 *     tracking the fact labels already use, so the sheet now has ONE
 *     caps tracking value instead of two.
 *   - ALIGNMENT. `items-center` was centring two boxes, not two pieces
 *     of ink, and because a text box carries ascender and descender air
 *     the digits ended up floating 3.6px clear of the hills' base. The
 *     row is now `items-end` with `leading-none` on the numerals, which
 *     puts the numerals' box bottom on the row's bottom, and then one
 *     paint-only nudge drops them the remaining distance so the digit
 *     BASELINE lands on the ground line. The nudge is the same device
 *     and the same justification as the shipped Wordmark's own
 *     `translateY(2px)` (see peaks-mark.tsx), which exists for exactly
 *     this mismatch between a mark's box and a typeface's baseline.
 * ------------------------------------------------------------------ */
const COLOPHON = {
  /** px. Equal to `--lh3-colophon`, so the mark's ink bottom is the row's
   *  bottom edge and the 8px step to the name is measured from ink. */
  markSize: 16,
  /** px. The app's small-UI rung. */
  numberSize: 13,
  /** px, downward. Measured, not derived: with `leading-none` at 13px
   *  Chrome puts the numerals' baseline 13px down from the top of a 16px
   *  row, and the silhouette's lowest ink lands at 15.98px. 3px closes
   *  that gap to 0.02px, so the digits sit ON the hills' ground line
   *  rather than floating the 3.6px above it that `items-center` used to
   *  give them. Positive = down. It is a transform, so it is paint-only
   *  and cannot reflow the row. */
  numberNudge: 3,
} as const;

/* ------------------------------------------------------------------ *
 *  FACT GRID (change 2). Two columns until the SHEET (not the window)
 *  is wide enough for four, which is a container query and not a
 *  breakpoint on purpose: the sheet is what the facts have to fit
 *  inside, and the same viewport gives it very different widths on the
 *  profile route, in this lab harness, and beside a collapsed sidebar.
 *
 *  Measured content widths, at 15px semibold Source Sans 3:
 *    - 390px phone: sheet content 302px, 2 columns of 138px. The two
 *      long facts (cities, occupation) each wrap to 2 lines; the two
 *      short ones (batch, years) hold 1. The grid is FULL: four facts,
 *      four cells, no hole, which is the thing the owner asked for.
 *    - 688px desktop sheet: 4 columns of 152px. "Student at Imperial
 *      College London" breaks once, after "Imperial". The band stays
 *      one row across the sheet, which is the letterhead's character.
 *    - Between the two, 2 columns of 200px and up, where nothing wraps
 *      at all.
 *  The switch is at 44rem of the SHEET's width (padding included, since
 *  that is what a container query measures). Derived, not picked: a
 *  4-column cell is (sheet - 80 sheet padding - 78 gutters) / 4, so
 *  44rem = 704px is the narrowest sheet whose 4-column cell (136.5px) is
 *  still at least as wide as the 2-column phone cell (137.1px), the
 *  width already proven above to hold the longest realistic occupation
 *  in two lines. Any narrower and four columns would wrap it to three
 *  lines while two columns would not, which is a reflow that makes
 *  things worse.
 *
 *  ODD COUNTS. A profile with one or three facts would leave a hole in
 *  the 2-column regime. The last fact spans both columns when the count
 *  is odd, which is exactly what Letterhead II already did for Cities,
 *  generalised from "the cities fact is special" to "the grid never
 *  ends on a hole". At four columns a short list simply ends early,
 *  which reads as the band being shorter rather than as a gap.
 *
 *  The `@[44rem]:` variants below are written out in full rather than
 *  built from a constant on purpose: Tailwind scans this file as TEXT
 *  for candidate class names, so a class assembled at runtime never gets
 *  generated at all.
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 *  THE STAMP (change 5).
 *
 *  "No matter what the window size is, on phone or desktop, on our
 *  profile there is always white space somewhere... It would be good if
 *  the stamp came on some white space. It didn't come on your name.
 *  Ideally it would come slightly on the name, maybe some of the lines
 *  would come out of the name, but the number itself would come on
 *  white space. And it would be good if it lasted a bit longer."
 *
 *  Letterhead II pinned it at `left-1/2 top-[44px]`, which is the one
 *  place on the sheet guaranteed to be occupied, because that is where
 *  the name is. So the position is now EARNED at press time: every
 *  piece of ink on the sheet is measured, the sheet is searched for the
 *  emptiest place the numerals can land, and the stamp goes there.
 *  The permission he gave ("maybe some of the lines would come out of
 *  the name") is what makes this solvable at 390px, where nothing on
 *  the sheet is 130px clear of everything else: only the numerals' core
 *  has to be clean, and the outer double rule is allowed to graze.
 * ------------------------------------------------------------------ */

/** The rendered stamp's own bounding box after its -7deg rest rotation,
 *  measured off the DOM rather than derived from its padding: Chrome
 *  reports 119 x 65, and 120 x 66 rounds that up to whole even pixels so
 *  the half-values used below are integers. Used only to keep the whole
 *  stamp on the paper, since the sheet clips its overflow and half a
 *  stamp reads as a bug. */
const STAMP_BOX = { w: 120, h: 66 };

/** The part that must land clean. The stamp's outer rules are decoration
 *  and the owner has explicitly licensed them to overlap the name; the
 *  numerals and the inner rule around them are the thing being read.
 *  60 x 40 centred on the stamp covers "1385" at 20px plus the inner
 *  rule's inset with a couple of px to spare at the -7deg tilt. */
const STAMP_CORE = { w: 60, h: 40 };

/** px between candidate positions in the search below. 6px is finer than
 *  the eye can distinguish in a stamp's placement and keeps the whole
 *  search under 15k candidates on the widest sheet, which is one frame's
 *  worth of work in a click handler. */
const STAMP_STEP = 6;

/** px. Two positions whose clearances differ by less than this are
 *  optically the same choice, so the tie is broken by whichever sits
 *  nearer the number you actually pressed (see below). */
const STAMP_TIE = 4;

/**
 * How long the stamp stays before it starts fading. Was 1700ms, which
 * the owner found too fast, and the honest figure was worse than that:
 * the stamp's own entrance is a spring with a 0.3s delay and takes
 * about 650ms to settle, so only ~1050ms of the 1700 was spent at rest.
 *
 * 3450ms is not 1700 doubled for the sake of it. 3450 + the 550ms fade
 * is 4000ms, which is Sonner's default toast lifetime and therefore the
 * one "how long a transient notice lives" figure this product has
 * already tuned. The stamp is the same class of thing: something you
 * caused, that says one short thing, that leaves on its own. Matching
 * the app's existing answer beats inventing a second one. At rest it
 * now reads for ~2.8s.
 */
const STAMP_HOLD_MS = 3450;

/** Kept from Letterhead II, and load-bearing for the number above. */
const STAMP_FADE_MS = 550;

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Signed separation between two boxes: positive is the gap between
 *  them, negative is how deeply they overlap. */
function gapBetween(a: Box, b: Box): number {
  return Math.max(b.left - a.right, a.left - b.right, b.top - a.bottom, a.top - b.bottom);
}

/**
 * Every rect of ink on the sheet, in sheet-relative coordinates.
 *
 * Elements opt in with `data-lh3-ink`. `data-lh3-ink="text"` measures the
 * TEXT rather than the block: a Range over the element's contents returns
 * one rect per line box, so a short name in a wide column claims only the
 * width it actually inks and the whitespace beside it becomes findable.
 * That is the whole point of the exercise, since on a 1440 sheet the
 * largest empty region on the page is the space to the right of the name.
 */
function inkBoxes(root: HTMLElement, origin: DOMRect): Box[] {
  const boxes: Box[] = [];
  const push = (r: DOMRect) => {
    if (r.width <= 0 || r.height <= 0) return;
    boxes.push({
      left: r.left - origin.left,
      top: r.top - origin.top,
      right: r.right - origin.left,
      bottom: r.bottom - origin.top,
    });
  };

  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-lh3-ink]"))) {
    if (el.dataset.lh3Ink === "text") {
      const range = document.createRange();
      range.selectNodeContents(el);
      for (const rect of Array.from(range.getClientRects())) push(rect as DOMRect);
      range.detach();
    } else {
      push(el.getBoundingClientRect());
    }
  }
  return boxes;
}

/**
 * Find the emptiest place on the sheet for the stamp's numerals.
 *
 * A grid search rather than anything cleverer because the geometry is
 * genuinely arbitrary (a name that wraps, a photo circle that may or may
 * not exist, a fact band that is one row or two, an About that may be
 * absent), and because the exact-optimum rectangle packing this would
 * otherwise be is not worth writing for a decision the eye judges to
 * within a few pixels anyway.
 *
 * Score is the distance from the numerals' core to the NEAREST piece of
 * ink, maximised. Candidates whose full stamp would hang off the paper
 * are dropped outright, because the sheet clips. Ties within STAMP_TIE
 * go to the candidate nearest the colophon: among places that are
 * equally empty, the one closest to the number you pressed reads as
 * having come from it.
 */
function placeStamp(sheet: number[], ink: Box[], from: { x: number; y: number }) {
  const [sheetW, sheetH] = sheet;
  const halfCore = { w: STAMP_CORE.w / 2, h: STAMP_CORE.h / 2 };
  const halfBox = { w: STAMP_BOX.w / 2, h: STAMP_BOX.h / 2 };

  // The centre can only travel where the whole stamp stays on the paper.
  const minX = halfBox.w;
  const maxX = sheetW - halfBox.w;
  const minY = halfBox.h;
  const maxY = sheetH - halfBox.h;
  // A sheet narrower than the stamp (never at 390, but a 280px browser is
  // reachable): centre it and let the clip do what it does.
  if (maxX < minX || maxY < minY) return { x: sheetW / 2, y: sheetH / 2 };

  let best = { x: sheetW / 2, y: sheetH / 2, score: -Infinity, pull: Infinity };
  for (let y = minY; y <= maxY; y += STAMP_STEP) {
    for (let x = minX; x <= maxX; x += STAMP_STEP) {
      const core: Box = {
        left: x - halfCore.w,
        top: y - halfCore.h,
        right: x + halfCore.w,
        bottom: y + halfCore.h,
      };
      let score = Infinity;
      for (const box of ink) {
        const g = gapBetween(core, box);
        if (g < score) score = g;
        if (score <= best.score - STAMP_TIE) break; // cannot win, stop early
      }
      const pull = Math.hypot(x - from.x, y - from.y);
      if (score > best.score + STAMP_TIE || (score > best.score - STAMP_TIE && pull < best.pull)) {
        // Keep the better clearance of the two when they are genuinely
        // different, so a tie-break can never lower the score outright.
        best = { x, y, score: Math.max(score, best.score), pull };
      }
    }
  }
  return { x: best.x, y: best.y };
}

/** Placeholder reach-outs, derived only to exercise the Get in touch dialog
 *  (the mock payload has no email/phone columns; the real `User` does). */
function contactMethodsFor(profile: MockProfile): ContactMethod[] {
  if (profile.links.length === 0) return [];
  const slug = profile.name.toLowerCase().replace(/\s+/g, ".");
  const methods: ContactMethod[] = [
    { kind: "email", label: "Email", value: `${slug}@example.com`, href: `mailto:${slug}@example.com` },
    { kind: "phone", label: "Phone", value: "+91 98450 33712", href: "tel:+919845033712" },
  ];
  for (const link of profile.links) {
    if (link.kind === "instagram" || link.kind === "linkedin") {
      methods.push({
        kind: link.kind,
        label: link.label,
        value: link.handle,
        href: link.href,
        external: true,
      });
    }
  }
  return methods;
}

function buildVcard(profile: MockProfile, methods: ContactMethod[]): string {
  const email = methods.find((m) => m.kind === "email")?.value;
  const phone = methods.find((m) => m.kind === "phone")?.value;
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${profile.name}`,
    email ? `EMAIL:${email}` : null,
    phone ? `TEL:${phone}` : null,
    profile.jobTitle ? `TITLE:${profile.jobTitle}` : null,
    profile.workplace ? `ORG:${profile.workplace}` : null,
    profile.cities[0] ? `ADR:;;;${profile.cities[0]};;;` : null,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/** A member who filled in almost nothing: the layout has to survive this. */
function sparseOf(p: MockProfile): MockProfile {
  return {
    ...p,
    jobTitle: null,
    workplace: null,
    currentCity: "",
    secondaryCity: null,
    cities: [],
    yearJoined: null,
    yearLeft: null,
    gradeJoined: null,
    admissionNumber: null,
    batchType: null,
    about: "",
    houses: [],
    links: [],
    postCount: 2,
    letterCount: 0,
    posts: p.posts.filter((x) => x.kind === "post").slice(0, 2),
  };
}

/** Mock post -> the shipped card's payload. Everything the mock has no column
 *  for (images, polls, city scope) is honestly null rather than faked. */
function toPostData(post: MockPost, author: MockProfile): PostData {
  return {
    id: post.id,
    kind: post.kind,
    title: post.title ?? null,
    content: post.content,
    images: null,
    cityScope: null,
    createdAt: post.createdAt,
    author: {
      id: author.id,
      name: author.name,
      photoUrl: author.photoUrl,
      birdOverride: null,
      accountType: author.accountType,
      verifyState: author.verifyState,
      batchType: author.batchType,
      batchYear: author.batchYear,
    },
    commentCount: post.commentCount,
    likeCount: post.likeCount,
    liked: false,
    bookmarked: DEMO_SAVED_IDS.has(post.id),
    isOwn: IS_OWN_PROFILE,
    poll: null,
  };
}

type TabKey = "all" | "posts" | "letters" | "saved";
type Sample = "full" | "sparse";
type Masthead = "bird" | "photo";

export default function LetterheadThreeVariant({ profile }: ProfileVariantProps) {
  // ?sample=sparse, ?avatar=photo, ?chain=<key> and ?fixture=<key> deep-link
  // every state, so a screenshot agent can shoot all of them without clicking
  // anything. Read as the initial value only; the controls own the state from
  // then on. (Safe against a prerendered shell because the harness page keeps
  // this whole tree inside a Suspense boundary, which is what useSearchParams
  // asks for.)
  const searchParams = useSearchParams();
  const [sample, setSample] = useState<Sample>(() =>
    searchParams.get("sample") === "sparse" ? "sparse" : "full"
  );
  const [masthead, setMasthead] = useState<Masthead>(() =>
    searchParams.get("avatar") === "photo" ? "photo" : "bird"
  );
  const [chain, setChain] = useState<string>(() => {
    const requested = searchParams.get("chain");
    return CHAINS.some((c) => c.meta.key === requested) ? requested! : CHAINS[0].meta.key;
  });
  const [fixture, setFixture] = useState<string>(() => {
    const requested = searchParams.get("fixture");
    return FIXTURES.some((f) => f.key === requested) ? requested! : FIXTURES[0].key;
  });

  const activeFixture = FIXTURES.find((f) => f.key === fixture) ?? FIXTURES[0];
  // The fixture is applied BEFORE sparseOf, not after: "filled in almost
  // nothing" includes having no houses at all, and a sparse sheet that still
  // drew a nine-span chain would stop testing the thing sparse exists to test.
  const withHouses: MockProfile = activeFixture.spans
    ? { ...profile, houses: activeFixture.spans }
    : profile;
  const base = sample === "full" ? withHouses : sparseOf(withHouses);
  const active: MockProfile =
    masthead === "photo" ? { ...base, photoUrl: DEMO_PHOTO } : { ...base, photoUrl: null };
  const activeChain = CHAINS.find((c) => c.meta.key === chain) ?? CHAINS[0];

  return (
    <>
      {/* The concept starts at the very top of the shell's own gutter, the way
          the shipped profile would, with no lab furniture above it. The only
          top padding is the perch clearance the bird needs to hang over the
          sheet's edge without being cut off. No horizontal padding of its own
          either: the shell owns the gutter in the real app, so it owns it
          here. */}
      <div className="mx-auto w-full max-w-3xl pb-[var(--space-xl)] pt-[var(--space-m)] sm:pt-[var(--space-l)]">
        {/* Keyed so all sheet state (tab, stamp, likes) resets with the mock.
            The fixture is in the key for a second, harder reason: every
            treatment indexes _chain-kit's measured `widths` array positionally,
            and swapping spans without a remount renders one frame against the
            PREVIOUS pass's widths (nine spans against eight measurements is an
            undefined width and NaN geometry) before useLayoutEffect corrects
            it. Remounting starts each treatment at its own metrics===null
            first-paint branch, which every one of them already handles. */}
        <Letterhead
          key={`${sample}-${masthead}-${fixture}`}
          profile={active}
          Chain={activeChain.Component}
        />
      </div>

      {/* Lab chrome, floated off to the side so it never sits in the concept's
          own space: a panel on the right edge from lg up (where the page has
          empty margin to spare), a glass bar above the mobile nav below that.
          Not part of the concept. The chain and fixture switchers live HERE and
          not on the sheet for the same reason the sample toggles do: the sheet
          has to start where the shipped page starts.

          FOUR CONTROLS, TWO BLOCKS. Stapling the house-data switcher on as a
          fourth stacked group and changing nothing else would have run the
          desktop panel to ~608px (the 509px it measures now, plus the 99px the
          chain group gave back below) and read as one undifferentiated list of
          pills, so the panel is laid out rather than extended:
            - The two blocks are split by a hairline. Above it the controls
              change WHO the sheet is about (which mock, which masthead);
              below it they change the houses drawing (which data, which
              treatment) and the blurb closes the block by describing exactly
              what is selected there. Two subjects, one rule, no headings
              invented to say so.
            - The new row is mostly PAID FOR, not simply added: the chain
              pills dropped to their short names (see CHAINS.short), which
              packs six pills into three rows instead of six and returns 99px
              against the ~110px the seven fixture pills cost. Measured at
              1440x900: the panel goes 455px to 509px on the default chain,
              and 599px at its tallest (Stepped, whose blurb is the longest of
              the six), which still ends 173px clear of the window's bottom.
            - On the mobile bar nothing is stacked at all: it is one wrapping
              row of pills, and the fixture group's short wording keeps all
              seven on a single line, so the bar goes 2 rows to 3 (86.4px to
              123.5px, measured at 390) and stays a bar rather than becoming a
              wall over the concept it floats on.

          176px wide, and 16px off the right edge, because that is what it
          takes to clear the sheet at 1440: the sheet's right edge lands at
          x=1228 there, so a panel any wider than this starts painting over
          the paper it is meant to be judging. (Below 1440 the window simply
          does not have the margin, and the glass keeps what is under it
          readable; Letterhead II's panel behaves the same way.)

          On the mobile bar the width is SET rather than left to shrink-to-fit.
          A fixed box positioned with `left:50%` only has the window's right
          half to grow into, so `max-w` alone left it 195px wide and wrapped
          the pills into four rows over the concept; an explicit
          `100vw - 2rem` gives it the whole line it is centred on. */}
      <div
        data-lh3="lab-panel"
        className="glass fixed bottom-20 left-1/2 z-[var(--z-overlay)] flex w-[calc(100vw-2rem)] -translate-x-1/2 flex-row flex-wrap items-center justify-center gap-x-[var(--space-m)] gap-y-[var(--space-s)] rounded-[var(--radius)] border border-border p-2.5 lg:bottom-auto lg:left-auto lg:right-4 lg:top-32 lg:w-[176px] lg:translate-x-0 lg:flex-col lg:items-start lg:justify-start lg:gap-[var(--space-s)]"
        style={{ boxShadow: "0 1px 2px rgba(35,36,30,0.06), 0 18px 40px -28px rgba(35,36,30,0.7)" }}
      >
        <ToggleGroup
          label="Preview data"
          options={[
            { key: "full", label: "Full" },
            { key: "sparse", label: "Sparse" },
          ]}
          value={sample}
          onChange={(k) => setSample(k as Sample)}
        />
        <ToggleGroup
          label="Avatar"
          options={[
            { key: "bird", label: "Bird" },
            { key: "photo", label: "Photo" },
          ]}
          value={masthead}
          onChange={(k) => setMasthead(k as Masthead)}
        />

        {/* The block rule. Desktop only, and not merely for taste: the mobile
            bar is one wrapping flex row, where a full-width hairline would
            force a line break and buy a divider with a whole row of the
            concept's screen. The mobile grouping is already carried by the
            gaps (space-m between groups against 6px within one). */}
        <span aria-hidden className="hidden h-px w-full bg-border lg:block" />

        <ToggleGroup
          label="House data"
          options={FIXTURES.map((f) => ({ key: f.key, label: f.label, short: f.short }))}
          value={fixture}
          onChange={setFixture}
        />
        <ToggleGroup
          label="Chain drawing"
          options={CHAINS.map((c) => ({ key: c.meta.key, label: c.short }))}
          value={chain}
          onChange={setChain}
        />
        {/* The blurb is the concept describing itself (each ./_chain-*.tsx
            exports it), so the owner knows which idea he is looking at before
            the pills render, and it now carries the full META label as its
            opening words: the name the pills gave up is still on screen for
            the one concept being looked at, for one line instead of six rows.
            Desktop panel only: the mobile bar floats over the concept and a
            paragraph there would cover the thing being judged. */}
        <p className="hidden text-[12px] leading-[1.5] text-muted-foreground lg:block">
          <span className="font-semibold text-foreground">{activeChain.meta.label}.</span>{" "}
          {activeChain.meta.blurb}
        </p>
      </div>
    </>
  );
}

function ToggleGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: string; label: string; short?: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    /* A row on the mobile bar, a labelled stack in the desktop panel, which
       keeps the panel narrow enough to sit clear of the sheet's right edge. */
    <div className="flex shrink-0 items-center gap-2 lg:w-full lg:flex-col lg:items-start lg:gap-1.5">
      {/* The labels earn their room only in the desktop side panel; the mobile
          bar floats over the concept, so it stays as small as it can. */}
      <span className="hidden whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70 lg:inline">
        {label}
      </span>
      {/* Wrapping, not scrolling: neither the six chain names nor the seven
          fixture pills fit one row of a 176px panel, and a strip that swallows
          the wheel is a rejected pattern in this app. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {options.map((o) => (
          <SpringPress
            key={o.key}
            as="button"
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`rounded-full border px-3 py-1 text-[11.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              value === o.key
                ? "border-transparent bg-canopy text-white"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {/* Both labels are always in the DOM and one is hidden by CSS,
                rather than branching on a width in JS: a media query cannot
                be read during server render, and a pill that changes its word
                on hydration is a visible flicker. */}
            {o.short && o.short !== o.label ? (
              <>
                <span className="lg:hidden">{o.short}</span>
                <span className="hidden lg:inline">{o.label}</span>
              </>
            ) : (
              o.label
            )}
          </SpringPress>
        ))}
      </div>
    </div>
  );
}

function Letterhead({
  profile,
  Chain,
}: {
  profile: MockProfile;
  Chain: (props: ChainProps) => React.ReactNode;
}) {
  const methods = contactMethodsFor(profile);
  const about = profile.about.trim();
  const hasPhoto = Boolean(profile.photoUrl);

  /* MockHouseYear is already {house, fromYear, toYear}; this is a rename, not
     a reshape, and keeps the mock free of a lib import. */
  const spans: HouseSpan[] = profile.houses.map((h) => ({
    house: h.house,
    fromYear: h.fromYear,
    toYear: h.toYear,
  }));

  /* Four facts now, in the owner's order with the occupation added last: it
     is the one that can run longest, so it goes where a wrap costs least (the
     end of the band, and the bottom-right cell of the phone grid). */
  const occupation =
    profile.jobTitle && profile.workplace
      ? `${profile.jobTitle} at ${profile.workplace}`
      : profile.jobTitle || profile.workplace || null;

  const facts: { label: string; value: string }[] = [];
  if (profile.batchYear) facts.push({ label: "Batch", value: String(profile.batchYear) });
  if (profile.yearJoined && profile.yearLeft) {
    facts.push({ label: "In the valley", value: `${profile.yearJoined}-${profile.yearLeft}` });
  }
  if (profile.cities.length > 0) {
    facts.push({
      label: profile.cities.length > 1 ? "Cities" : "City",
      value: profile.cities.join(", "),
    });
  }
  if (occupation) facts.push({ label: "Occupation", value: occupation });

  /* The stamp: pressed in on demand, held, faded away. `at` is measured at
     press time, so it is null until the first press. */
  const [stamp, setStamp] = useState<{ key: number; x: number; y: number } | null>(null);
  const stampTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  function fireStamp(event: React.MouseEvent<HTMLButtonElement>) {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const origin = sheet.getBoundingClientRect();
    const pressed = event.currentTarget.getBoundingClientRect();
    // Measured off `frame`, not `sheet`, so the perched bird counts as ink
    // even though it hangs outside the paper: it overlaps the top-right
    // corner, which would otherwise look like the emptiest place there is.
    const spot = placeStamp(
      [origin.width, origin.height],
      inkBoxes(frame, origin),
      {
        x: pressed.left + pressed.width / 2 - origin.left,
        y: pressed.top + pressed.height / 2 - origin.top,
      }
    );
    setStamp((prev) => ({ key: (prev?.key ?? 0) + 1, x: spot.x, y: spot.y }));
    if (stampTimer.current) clearTimeout(stampTimer.current);
    stampTimer.current = setTimeout(() => setStamp(null), STAMP_HOLD_MS);
  }
  useEffect(
    () => () => {
      if (stampTimer.current) clearTimeout(stampTimer.current);
    },
    []
  );

  /* The photo circle's diameter is the owner's definition of it, taken from
     the DOM rather than assumed: "from the top of that orange logo to the
     bottom of the name". The calc in IDENTITY_VARS is the first-paint value
     and is exact whenever the name holds one line; this observer is what keeps
     the promise when a long name wraps on a phone. The loop settles because a
     wider circle can only ever push the name to MORE lines, never back to
     fewer, so height is monotonic and converges after one correction. */
  const lockupRef = useRef<HTMLDivElement>(null);
  const [diameter, setDiameter] = useState<number | null>(null);
  useEffect(() => {
    const el = lockupRef.current;
    if (!hasPhoto || !el) return;
    // ResizeObserver reports the initial size on observe(), so the first
    // measurement arrives through the same callback as every later one.
    const ro = new ResizeObserver(() => {
      const h = el.getBoundingClientRect().height;
      setDiameter((prev) => (prev !== null && Math.abs(prev - h) < 0.5 ? prev : h));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasPhoto]);
  const circle = diameter ? `${diameter}px` : "var(--lh3-head)";

  const cta =
    methods.length > 0 ? (
      <GetInTouch
        name={profile.name}
        person={profile}
        batchYear={profile.batchYear}
        methods={methods}
        vcard={buildVcard(profile, methods)}
        showSave={false}
        size="default"
      />
    ) : null;

  return (
    <>
      {/* Not clipped, so the perched bird can overlap the sheet's own edge. */}
      <div ref={frameRef} className="relative" style={IDENTITY_VARS}>
        {!hasPhoto && <PerchedBird profile={profile} />}

        <div
          ref={sheetRef}
          data-lh3="sheet"
          className="@container relative overflow-hidden rounded-[var(--radius-2xl)] border border-border bg-card"
          style={{
            boxShadow:
              "0 1px 2px rgba(35,36,30,0.05), 0 24px 48px -32px rgba(35,36,30,0.55), 0 46px 96px -55px color-mix(in srgb, var(--color-cinnamon) 26%, transparent)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-multiply"
            style={{ backgroundImage: `url("${PAPER_GRAIN}")` }}
          />
          <div
            className="pointer-events-none absolute -top-16 right-14 h-56 w-56 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--color-canopy) 14%, transparent), transparent 70%)",
            }}
          />

          {/* The stamp lands wherever the sheet is emptiest, measured at press
              time. AnimatePresence handles the fade-away; the stamp's own
              mount spring is the thump. */}
          <AnimatePresence>
            {stamp && profile.admissionNumber && (
              <motion.div
                key={stamp.key}
                exit={{ opacity: 0, transition: { duration: STAMP_FADE_MS / 1000, ease: "easeOut" } }}
                /* `w-max`, because an absolutely positioned box is still
                   constrained by the distance from its `left` to the edge of
                   its containing block: on a 350px phone sheet a stamp placed
                   at x=276 got 74px to live in, wrapped "Admission No." onto
                   two lines and grew 10px taller than STAMP_BOX promised,
                   which pushed it off the top of the paper. */
                className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-1/2"
                style={{ left: stamp.x, top: stamp.y }}
              >
                <AdmissionStamp number={profile.admissionNumber} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* EQUAL padding on all four sides. */}
          <div className="relative p-6 sm:p-10">
            <FadeRise>
              <header data-lh3="header">
                <div className="flex items-start gap-[var(--space-m)]">
                  {/* Photo masthead: the circle starts on the sheet's own left
                      edge, level with the mark, and ends on the bottom of the
                      name. Nothing else in the sheet indents for it. */}
                  {hasPhoto && (
                    <span
                      data-lh3="photo"
                      data-lh3-ink
                      className="block shrink-0 overflow-hidden rounded-full border border-border/60 bg-mist"
                      style={{ width: circle, height: circle }}
                      role="img"
                      aria-label={profile.name}
                    >
                      <img
                        src={profile.photoUrl ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}

                  {/* The lockup, and ONLY the lockup: mark, number, name. The
                      measured circle answers the owner's "top of the logo to
                      the bottom of the name" and not a line more, which is why
                      nothing else may join this box. */}
                  <div ref={lockupRef} data-lh3="lockup" className="min-w-0 flex-1">
                    {/* A block-level row, not inline-flex: an inline box would
                        add its line's leading under the mark and quietly turn
                        the 8px step into 14.5px. `items-end` plus the nudge on
                        the numerals is what sits them on the hills' ground
                        line; see COLOPHON. */}
                    {profile.admissionNumber ? (
                      <button
                        type="button"
                        data-lh3="colophon"
                        data-lh3-ink
                        onClick={fireStamp}
                        aria-label={`Admission number ${profile.admissionNumber}. Press to stamp the sheet.`}
                        className="flex h-[var(--lh3-colophon)] w-fit items-end gap-1.5 rounded-sm text-cinnamon transition-opacity duration-150 hover:opacity-75 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <PeaksMark size={COLOPHON.markSize} />
                        <span
                          className="font-bold uppercase leading-none tracking-[0.16em]"
                          style={{
                            fontSize: COLOPHON.numberSize,
                            transform: `translateY(${COLOPHON.numberNudge}px)`,
                          }}
                        >
                          {profile.admissionNumber}
                        </span>
                      </button>
                    ) : (
                      <span
                        aria-hidden
                        data-lh3="colophon"
                        data-lh3-ink
                        className="flex h-[var(--lh3-colophon)] w-fit items-end text-cinnamon"
                      >
                        <PeaksMark size={COLOPHON.markSize} />
                      </span>
                    )}

                    {/* The leaf rides inline after the last word so a wrapping
                        name never strands it on a line of its own, and sits on
                        the BASELINE, which is where Letterhead I had it. */}
                    <h1
                      data-lh3-ink="text"
                      className="mt-[var(--lh3-gap)] font-heading font-bold tracking-[-0.03em] text-foreground"
                      style={{ fontSize: "var(--lh3-name)", lineHeight: 1.05 }}
                    >
                      {profile.name}
                      <span className="ml-2.5 inline-flex align-baseline">
                        <VerifiedMark user={profile} size={16} />
                      </span>
                    </h1>
                  </div>

                  {/* The one action, in line with the name: the pill's box is
                      centred on the name's first line by calc, not by eye.
                      Held back on phones, where a 40px pill beside a 30px
                      display name would squeeze the name's own column. */}
                  {cta && (
                    <div
                      data-lh3-ink
                      className="hidden shrink-0 sm:block"
                      style={{ marginTop: "var(--lh3-cta-top)" }}
                    >
                      {cta}
                    </div>
                  )}
                </div>

                {/* No subtitle line. The occupation that used to sit here is
                    now the fourth fact, which is a move rather than an
                    addition: the masthead gets shorter by exactly the line the
                    fact band gained. */}
                {cta && (
                  /* `w-fit` so the ink box the stamp search measures is the
                     pill, not the whole row a block-level wrapper would
                     claim. Same rendering either way; the button was never
                     stretching. */
                  <div data-lh3-ink className="mt-[var(--space-m)] w-fit sm:hidden">
                    {cta}
                  </div>
                )}
              </header>

              {facts.length > 0 && (
                <dl className="mt-[var(--space-l)] grid grid-cols-2 gap-x-[var(--space-l)] gap-y-[var(--space-m)] @[44rem]:grid-cols-4">
                  {facts.map((f, i) => (
                    <div
                      key={f.label}
                      data-lh3-ink
                      className={
                        /* The grid never ends on a hole: an odd count gives
                           its last fact both phone columns. */
                        i === facts.length - 1 && facts.length % 2 === 1
                          ? "col-span-2 @[44rem]:col-span-1"
                          : "min-w-0"
                      }
                    >
                      <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-canopy">
                        {f.label}
                      </dt>
                      {/* 15px, the app's body rung (see change 3). `text-pretty`
                          so a value that wraps breaks into two comparable
                          lines instead of leaving one word alone on the
                          second. */}
                      <dd className="mt-[var(--space-xs)] text-pretty text-[15px] font-semibold leading-[1.45] text-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </FadeRise>

            {/* No engraved rule. See change 6 in the header comment. */}

            {about && (
              <FadeRise delay={0.06}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>About</SectionLabel>
                  {/* 15px/1.7 is byte-for-byte the feed PostCard's body style,
                      because this is the same kind of text. */}
                  <p
                    data-lh3-ink="text"
                    className="mt-[var(--space-s)] text-[15px] leading-[1.7] text-foreground"
                  >
                    {about}
                  </p>
                </section>
              </FadeRise>
            )}

            {profile.houses.length > 0 && (
              <FadeRise delay={0.09}>
                <section className="mt-[var(--space-l)]">
                  <SectionLabel>Houses</SectionLabel>
                  <div data-lh3-ink className="mt-[var(--space-s)]">
                    <Chain spans={spans} />
                  </div>
                </section>
              </FadeRise>
            )}
          </div>
        </div>
      </div>

      <Writing profile={profile} />
    </>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p data-lh3-ink className="text-[12px] font-bold uppercase tracking-[0.16em] text-canopy">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ *
 *  The bird, perched on the sheet's own top edge exactly where
 *  Letterhead I put it, so it costs the masthead no vertical space.
 *  Still: the idle bob is gone (owner: "don't keep moving the bird").
 *  No species name. Pressing it chirps, three cinnamon arcs and a thump,
 *  because that only happens when someone asks for it.
 * ------------------------------------------------------------------ */
function PerchedBird({ profile }: { profile: MockProfile }) {
  const [chirp, setChirp] = useState(0);

  return (
    /* Scaled from its FEET on phones (origin-bottom), so the perch line stays
       put at both sizes and only one offset has to be right. */
    <div className="absolute -top-12 right-6 z-20 origin-bottom scale-[0.8] sm:right-10 sm:scale-100">
      <button
        type="button"
        data-lh3-ink
        onClick={() => setChirp((c) => c + 1)}
        aria-label={`${profile.name}'s bird. Tap for a chirp.`}
        className="relative block rounded-full outline-none transition-transform duration-150 active:scale-[0.95] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <motion.span
          key={chirp}
          initial={chirp > 0 ? { scale: 1.1, rotate: -6 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={SPRINGS.snappy}
          className="block"
        >
          <BirdAvatar
            user={{ id: profile.id, name: profile.name, avatarSpecies: profile.avatarSpecies }}
            size={80}
          />
        </motion.span>

        {chirp > 0 && (
          <span
            key={`arcs-${chirp}`}
            aria-hidden
            className="pointer-events-none absolute right-[-2px] top-[22px]"
          >
            {[0, 1, 2].map((n) => {
              const s = 13 + n * 9;
              return (
                <motion.span
                  key={n}
                  initial={{ opacity: 0.9, scale: 0.35, rotate: -45 }}
                  animate={{ opacity: 0, scale: 1.2, rotate: -45 }}
                  transition={{ duration: 0.55, delay: n * 0.07, ease: EASE_OUT_SMOOTH }}
                  className="absolute block rounded-full border-r-2 border-cinnamon"
                  style={{ width: s, height: s, left: 0, top: -s / 2 }}
                />
              );
            })}
          </span>
        )}
      </button>

      {/* A soft contact shadow on the paper: what makes it read as perched on
          the edge rather than pasted over it. */}
      <span
        aria-hidden
        className="mx-auto -mt-1 block h-2 w-11 rounded-full"
        style={{ background: "var(--color-ink)", opacity: 0.14, filter: "blur(3px)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  What they have written: the switcher, then the shipped PostCard
 *  standing free on the page. No folder, no board, no container of any
 *  kind around the tiles (owner, 2026-07-30: "the post tiles aren't in
 *  anything"), so the sheet, the switcher and every card share the
 *  column's one outer left edge and the cards read exactly as the feed's.
 *
 *  The switcher is the SHARED <SegmentedPills> (extracted 2026-08-02 from
 *  this exact control), not a local copy. Letterhead II hand-rolled it
 *  and carried a comment saying it should be extracted if the concept
 *  shipped; it did, so the lab now calls the same component the app does
 *  and the two cannot drift.
 * ------------------------------------------------------------------ */
function Writing({ profile }: { profile: MockProfile }) {
  const sorted = [...profile.posts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const TABS: { key: TabKey; label: string; items: MockPost[]; empty: string }[] = [
    { key: "all", label: "All", items: sorted, empty: "Nothing here yet." },
    {
      key: "posts",
      label: "Posts",
      items: sorted.filter((p) => p.kind === "post"),
      empty: "No posts yet.",
    },
    {
      key: "letters",
      label: "Letters",
      items: sorted.filter((p) => p.kind === "letter"),
      empty: "No letters yet.",
    },
  ];
  if (IS_OWN_PROFILE) {
    TABS.push({
      key: "saved",
      label: "Saved",
      items: sorted.filter((p) => DEMO_SAVED_IDS.has(p.id)),
      empty: "Nothing saved yet.",
    });
  }

  const [tab, setTab] = useState<TabKey>("all");
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const [listRef] = useAutoAnimate();

  return (
    <FadeRise delay={0.12}>
      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        <SegmentedPills
          ariaLabel="Profile sections"
          layoutId="lh3Writing"
          segments={TABS.map((t) => ({ key: t.key, label: t.label, count: t.items.length }))}
          value={tab}
          onChange={setTab}
          className="bg-card"
          style={{
            boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)",
          }}
        />

        {/* Nothing wraps the tiles. auto-animate cross-fades the swap, so
            switching reads as the same stack re-settling rather than a cut. */}
        <div ref={listRef} className="mt-[var(--space-m)] space-y-2.5">
          {active.items.length === 0 ? (
            <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-10 text-center">
              <p className="font-heading text-lg tracking-tight text-foreground">{active.empty}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Share a memory, a sighting, or a note for the valley.
              </p>
            </div>
          ) : (
            active.items.map((post) => (
              <PostCard key={post.id} post={toPostData(post, profile)} variant="card" demo />
            ))
          )}
        </div>
      </div>
    </FadeRise>
  );
}

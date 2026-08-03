"use client";

/* ------------------------------------------------------------------ *
 *  Chain kit — the shared vocabulary six house-chain LAYOUT concepts
 *  each build on. Nothing in here draws a chain; it only supplies the
 *  pieces every drawing must be made of, so the six concepts can differ
 *  in layout only and never drift in colour, type, or wording.
 *
 *  Why this exists: the shipped chain (src/components/profile/
 *  houses-chain.tsx) is a boustrophedon of packed rows joined by arcs.
 *  The owner (2026-08-02 voice note) likes the pill vocabulary — "I do
 *  like the colors. I like the style of the pills, this font, with the
 *  year written how it is... I'd like to keep it something like this" —
 *  but rejects the current geometry: "the arrows are really long...
 *  most of each line is just arrows", and the first pill isn't flush
 *  left ("Golden starts maybe a centimeter to the right of the left
 *  align line. It should be all the way at that end"). So this kit
 *  freezes the part he approved (pills, tints, type, the arrow glyph,
 *  measuring, accessibility) and leaves the part he's unhappy with
 *  (how rows turn, whether there even ARE turns) open for six different
 *  answers.
 *
 *  RULES every concept inherits from here, because they are the owner's
 *  words, not a layout preference:
 *
 *  1. FIRST PILL FLUSH LEFT. The first pill's left edge sits exactly on
 *     the sheet's content left edge, zero indent. "The first house
 *     should be left aligned with everything else in the profile
 *     panel... it should be all the way at that end." No concept may
 *     reserve a gutter, badge, or turning-arc lane to the left of pill
 *     one that pushes it inward.
 *
 *  2. NO HORIZONTAL SCROLL. A strip that swallows the mouse wheel so the
 *     page under it stops scrolling is a rejected pattern in this app
 *     (see docs/spec/DESIGN-SYSTEM.md). The chain must wrap, not scroll.
 *
 *  3. HOLDS FROM ~688PX DOWN TO ~302PX, AND EVERY WIDTH BETWEEN. 688px
 *     is the real desktop content width (max-w-3xl profile route minus
 *     p-10 sheet padding); 302px is a 390px phone minus p-6 padding. The
 *     owner squeezes his desktop window narrower than a phone in the
 *     failing case he described ("particularly on desktop when my
 *     window is really small, it goes onto five different lines"), so a
 *     concept that only looks good at exactly those two sizes and not
 *     the range between them has not actually fixed the bug.
 *
 *  4. transform/opacity ONLY. Per the house animation rule; no concept
 *     may animate width, height, margin, or gap to arrange the chain.
 * ------------------------------------------------------------------ */

import { type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HOUSES } from "@/lib/houses";
import { academicSpanLabel, type HouseSpan } from "@/lib/house-spans";

/* ================================================================== *
 *  1. THE CONTRACT — every concept's default export matches this, and
 *     also exports `META` describing itself for the lab switcher.
 * ================================================================== */

/** The one shape every layout concept accepts. `className` lets the lab
 *  wrapper size the host without a concept hard-coding its own width. */
export interface ChainProps {
  spans: HouseSpan[];
  className?: string;
}

/** What a concept says about itself in the lab switcher. `blurb` is one
 *  honest sentence, not marketing copy: it should let the owner guess
 *  which idea he's about to look at before the pills even render. */
export interface ChainMeta {
  key: string;
  label: string;
  blurb: string;
}

/* ================================================================== *
 *  2. PILL VOCABULARY — lifted verbatim from the shipped chain. The
 *     owner explicitly approved this part, so no concept may re-tint,
 *     re-size, or re-font a pill; only where pills and arrows SIT is up
 *     for redesign.
 * ================================================================== */

/** Three brand tints, cycled rather than one colour per real house,
 *  because there are 22 houses and only three colours worth using
 *  (leaf/cinnamon/sky) without the chain turning into a colour-coding
 *  exercise nobody asked for. LEAF, not canopy: the owner moved this
 *  off canopy on 2026-07-30 ("we started using the dark green instead
 *  of the light green... move it back to light") because canopy is
 *  reserved for CTAs and using it here made a pill read as a button. */
export const HOUSE_TINTS = [
  "border-leaf/30 bg-leaf/[0.07] text-leaf",
  "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  "border-sky/35 bg-sky/[0.10] text-sky",
];

/** Every stored year is an ACADEMIC year (2014 reads as "2014-15"), so
 *  a span always renders as a hyphenated range, never a bare calendar
 *  year and never an en dash. Re-exported from house-spans.ts's
 *  `academicSpanLabel` under the chain vocabulary's own name so a
 *  concept only needs this one import for pill text. */
export function yearRange(span: HouseSpan): string {
  return academicSpanLabel(span.fromYear, span.toYear);
}

/* Geometry, all in px, shared so no concept re-derives (and risks
   drifting from) the numbers the pill vocabulary was measured against. */

/** The flex gap between a pill and the arrow beside it (and, inside a
 *  row, between consecutive cells). 6px = Tailwind gap-1.5; the pill
 *  and arrow read as one clause at this distance, not two words with a
 *  breath between them. */
export const GAP = 6;
/** An arrow glyph's own width, excluding the gaps on either side of it. */
export const ARROW_W = 18;
/** What one straight arrow actually costs a row when packing pills: the
 *  glyph plus the flex gap on BOTH sides of it. Any concept computing
 *  how many pills fit on a line must charge this per arrow, not
 *  ARROW_W alone, or it will overpack and clip the last pill. */
export const ARROW_SLOT = ARROW_W + 2 * GAP;
/** One stroke style for every line in a chain drawing (straight arrows
 *  and, if a concept draws one, a turn) so nothing in the chain reads
 *  as heavier or lighter than the rest of it. 1.25 keeps a small glyph
 *  from looking bolded at 12.5px pill type's weight; round caps so a
 *  1.25px line doesn't end in a hard square nib. */
export const STROKE = { stroke: "currentColor", strokeWidth: 1.25, strokeLinecap: "round" as const };

/** Straight arrows are SVG rather than the "→" glyph so they share one
 *  stroke weight and one cap style with any turn a concept draws (a
 *  system font's arrow glyph has its own weight that never quite
 *  matches a hand-drawn stroke). `back` mirrors it horizontally for a
 *  right-to-left run, e.g. a serpentine's return rows. */
export function Arrow({ back }: { back: boolean }) {
  return (
    <svg
      width={ARROW_W}
      height="10"
      viewBox={`0 0 ${ARROW_W} 10`}
      fill="none"
      aria-hidden
      className="shrink-0 text-muted-foreground/50"
      style={back ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M1 5 H15" {...STROKE} />
      <path d="M11.5 1.5 L15 5 L11.5 8.5" {...STROKE} strokeLinejoin="round" />
    </svg>
  );
}

/** One pill's classes: a full circle rule so it is unambiguously a
 *  "tag" and not a button (buttons are the only other rounded-full
 *  fill in this app, and Canopy, not a tint, is what makes something
 *  read as clickable). `items-baseline` keeps the bold house name and
 *  the smaller year type sitting on the same text baseline rather than
 *  the year drifting low against the taller name glyph. */
export const PILL_CLASS = "inline-flex items-baseline gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1";

/** One pill's CONTENTS: Libre Baskerville 12.5px bold house name, then
 *  10.5px tabular-nums year span at 75% opacity so the year reads as a
 *  caption to the name, not a second equally-weighted fact. Shared by
 *  the hidden measuring pass and the real render (`useChainMetrics`
 *  below) so a packed layout's widths are measured off the exact same
 *  markup it draws, never an estimate. */
export function Pill({ span }: { span: HouseSpan }) {
  return (
    <>
      <span className="font-heading text-[12.5px] font-bold leading-none">{span.house}</span>
      <span className="text-[10.5px] font-semibold tabular-nums leading-none opacity-75">
        {yearRange(span)}
      </span>
    </>
  );
}

/* ================================================================== *
 *  3. MEASURING — a hidden pass renders every pill once, invisibly,
 *     with the real classes, so a concept's packing math works off
 *     actual measured widths instead of guessing at text metrics.
 *     Extracted from the shipped chain's useLayoutEffect: same
 *     correctness properties, same reasons, so a concept adopting this
 *     hook inherits them rather than re-earning them.
 * ================================================================== */

/** What one measuring pass yields: each pill's rendered width in DOM
 *  order, the (shared) pill height, and the host's available width to
 *  pack into. `null` on first paint, before layout has happened once. */
export interface ChainMetrics {
  widths: number[];
  pillH: number;
  containerW: number;
}

export interface UseChainMetricsResult {
  /** Attach to the concept's outer wrapper; its `clientWidth` is what
   *  `metrics.containerW` reports, so pills pack to what the host
   *  actually has, not to an assumed max-w-3xl. */
  hostRef: RefObject<HTMLDivElement | null>;
  /** Render this once, anywhere inside the element `hostRef` is on. It
   *  is position:absolute + h-0 + hidden, so it costs no layout space
   *  in the real render; it exists purely so the pills inside it can be
   *  measured. */
  measurer: ReactNode;
  metrics: ChainMetrics | null;
}

/**
 * The hidden-measuring-pass hook. Call it with the spans a concept is
 * about to draw; render `measurer` inside the element `hostRef` is
 * attached to; once `metrics` is non-null, pack pills using
 * `metrics.widths[i]` (in span order) against `metrics.containerW`.
 *
 * Three correctness properties, all load-bearing and easy to
 * accidentally undo when a concept copies this in:
 *
 * - STABLE `spansKey`, not the `spans` array itself, drives the effect.
 *   A parent re-render commonly rebuilds `spans` as a new array with
 *   the same contents (mock data literals, a `.map` in a parent render,
 *   etc.); depending on the array reference would re-run the effect —
 *   and, since the effect's own state update triggers a re-render — on
 *   every single frame forever. Keying on a string built from the
 *   actual span contents only re-measures when a span truly changed.
 * - THE PREVIOUS-REFERENCE BAIL-OUT in `setMetrics`. A `ResizeObserver`
 *   can fire with nothing actually different (sub-pixel jitter, a
 *   scrollbar toggling), and returning the SAME object reference when
 *   every field matches lets React bail out of re-rendering instead of
 *   committing a no-op state update every time the observer breathes.
 * - THE `document.fonts.ready` RE-MEASURE. Libre Baskerville can still
 *   be loading when the first layout pass happens (system-font
 *   fallback is narrower), so pill widths measured before the web font
 *   lands are wrong; re-measuring once fonts are ready corrects them
 *   without waiting on a user-visible resize to trigger it.
 */
export function useChainMetrics(spans: HouseSpan[]): UseChainMetricsResult {
  const hostRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState<ChainMetrics | null>(null);

  // See "STABLE spansKey" above: contents, not the array reference.
  const spansKey = spans.map((s) => `${s.house}:${s.fromYear}:${s.toYear}`).join("|");

  useLayoutEffect(() => {
    const host = hostRef.current;
    const meas = measureRef.current;
    if (!host || !meas) return;

    const measure = () => {
      const kids = Array.from(meas.children) as HTMLElement[];
      if (kids.length === 0) return;
      const next: ChainMetrics = {
        widths: kids.map((k) => k.getBoundingClientRect().width),
        pillH: kids[0].getBoundingClientRect().height,
        containerW: host.clientWidth,
      };
      // See "THE PREVIOUS-REFERENCE BAIL-OUT" above.
      setMetrics((prev) =>
        prev &&
        prev.pillH === next.pillH &&
        prev.containerW === next.containerW &&
        prev.widths.length === next.widths.length &&
        prev.widths.every((w, i) => w === next.widths[i])
          ? prev
          : next
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    // See "THE document.fonts.ready RE-MEASURE" above.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [spansKey]);

  const measurer = (
    <div
      ref={measureRef}
      aria-hidden
      className="pointer-events-none absolute h-0 overflow-hidden whitespace-nowrap"
      style={{ visibility: "hidden" }}
    >
      {spans.map((span, i) => (
        <span key={i} className={cn(PILL_CLASS, HOUSE_TINTS[i % HOUSE_TINTS.length])}>
          <Pill span={span} />
        </span>
      ))}
    </div>
  );

  return { hostRef, measurer, metrics };
}

/* ================================================================== *
 *  4. ACCESSIBILITY — a chain is drawn with `aria-hidden` visuals (rows,
 *     arrows, arcs mean nothing to a screen reader), so every concept
 *     renders this once alongside its drawing. Centralised here so no
 *     concept's visual experiment can accidentally cost the chain its
 *     only accessible reading.
 * ================================================================== */

/** The sr-only ordered sentence: "Houses over the years: Golden 2014-15,
 *  then Raavi 2015-16, ..." One sentence, not a list, because a chain
 *  is a narrative ("then"), not a set of unordered facts. */
export function ChainScreenReaderText({ spans }: { spans: HouseSpan[] }) {
  return (
    <p className="sr-only">
      Houses over the years: {spans.map((s) => `${s.house} ${yearRange(s)}`).join(", then ")}
    </p>
  );
}

/* ================================================================== *
 *  5. FIXTURES — the stress corpus every concept is judged against.
 *     Sizes and names deliberately chosen to exercise the cases the
 *     shipped chain fails at: the owner's real 9-span career (his
 *     reported failing case), a long 12-span run (more turns than the
 *     shipped chain's demo ever had), and the widest real house names
 *     (so a concept's packing math is checked against its actual worst
 *     case, not an average one).
 * ================================================================== */

export interface ChainFixture {
  key: string;
  label: string;
  spans: HouseSpan[];
}

/** Build a fixture from a run of real house names, one academic year
 *  each, starting at `startYear`. Used for the fixtures below that
 *  don't need a specific multi-year span or a specific set of years —
 *  only real names in canonical order and years that increase. */
function sequentialSpans(houseNames: readonly string[], startYear: number): HouseSpan[] {
  return houseNames.map((house, i) => ({ house, fromYear: startYear + i, toYear: startYear + i }));
}

/**
 * The owner's real chain (voice note, 2026-08-02), transcribed exactly
 * as he listed it — including Alamanda and Jacaranda both landing in
 * 2021-22, which looks like a duplicate but is what his actual saved
 * data says, so a concept must not assume consecutive spans always
 * have consecutive years. This is THE failing case: "when the houses
 * all fit in one line there's no problem... [but here] it goes onto
 * five different lines and most of each line is just arrows."
 */
const OWNER_CHAIN: HouseSpan[] = [
  { house: "Golden", fromYear: 2014, toYear: 2014 }, // 2014-15
  { house: "Raavi", fromYear: 2015, toYear: 2015 }, // 2015-16
  { house: "Palm", fromYear: 2016, toYear: 2017 }, // 2016-18 (two-year run)
  { house: "Kailash", fromYear: 2018, toYear: 2018 }, // 2018-19
  { house: "Krishna", fromYear: 2019, toYear: 2019 }, // 2019-20
  { house: "Cauvery", fromYear: 2020, toYear: 2020 }, // 2020-21
  { house: "Alamanda", fromYear: 2021, toYear: 2021 }, // 2021-22
  { house: "Jacaranda", fromYear: 2021, toYear: 2021 }, // 2021-22, as the owner listed it
  { house: "Duranta", fromYear: 2022, toYear: 2022 }, // 2022-23
];

/** The five longest names in the canonical 22 (src/lib/houses.ts),
 *  longest first: Jacaranda (9), then the four 8-letter names in their
 *  canonical order. Derived rather than hand-typed so it can't drift
 *  from HOUSES if a name is ever added or renamed there. */
const LONGEST_HOUSES = [...HOUSES].sort((a, b) => b.length - a.length).slice(0, 5);

export const CHAIN_FIXTURES: ChainFixture[] = [
  { key: "single", label: "Single house", spans: sequentialSpans(HOUSES.slice(0, 1), 2014) },
  { key: "two", label: "Two houses", spans: sequentialSpans(HOUSES.slice(0, 2), 2014) },
  { key: "three", label: "Three houses", spans: sequentialSpans(HOUSES.slice(0, 3), 2014) },
  { key: "owner-9", label: "Owner's real 9-span career (the failing case)", spans: OWNER_CHAIN },
  { key: "twelve", label: "12-span stress chain", spans: sequentialSpans(HOUSES.slice(0, 12), 2010) },
  { key: "widest", label: "Widest pill names", spans: sequentialSpans(LONGEST_HOUSES, 2014) },
];

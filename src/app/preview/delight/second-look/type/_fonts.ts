/* ------------------------------------------------------------------ *
 *  Every face on this page, loaded the way the app does NOT load them.
 *
 *  Three deliberate differences from src/app/layout.tsx:
 *
 *   1. `style: ["normal", "italic"]` everywhere, so the real italic file
 *      is downloaded. The app omits `style` entirely, so no italic file
 *      exists at runtime and every italic in the product is a shear.
 *
 *   2. No `weight` array on any variable family. Passing one opts out of
 *      the variable file and out of every intermediate weight
 *      (validate-google-font-function-call.js: weights.length === 0 is
 *      the only path that reaches `weights.push('variable')`).
 *
 *   3. `axes` is passed explicitly wherever the family has an optical
 *      size. This is the one that is easy to miss. get-font-axes.js only
 *      emits an axis into the Google URL if it is in `selectedVariableAxes`,
 *      so a variable font requested without `axes: ["opsz"]` is pinned at
 *      its default optical size (14 for Fraunces, 16 for Newsreader, 14
 *      for Literata, all body sizes) and the axis does nothing. With the
 *      axis present the browser drives it automatically, because
 *      `font-optical-sizing: auto` is the CSS initial value.
 *
 *  Instrument Serif is the one non-variable family: one weight, roman
 *  and italic. Libre Baskerville IS variable now (wght 400..700, both
 *  styles, with a real Bold Italic named instance) which is exactly why
 *  loading it as two static files is a waste.
 *
 *  Preview-only. Nothing here changes what the product loads.
 * ------------------------------------------------------------------ */

import {
  Fraunces,
  Newsreader,
  Instrument_Serif,
  Literata,
  Libre_Baskerville,
  Source_Sans_3,
  Public_Sans,
  Inter,
  Figtree,
} from "next/font/google";

/* --- the two the app already owns --- */

export const libre = Libre_Baskerville({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-libre",
});

export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-source",
});

/* --- display candidates --- */

export const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--f-fraunces",
  preload: false,
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--f-newsreader",
  preload: false,
});

export const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--f-instrument",
  preload: false,
});

export const literata = Literata({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--f-literata",
  preload: false,
});

/* --- body candidates --- */

export const publicSans = Public_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-public",
  preload: false,
});

// Inter has an opsz axis (14 to 32) and is deliberately loaded WITHOUT it:
// naming the axis costs 51.5 KB (97.7 to 149.2 KB latin, roman plus italic),
// which would push the Instrument Serif pairing past what ships today. So it
// is pinned at opsz 14, and the page says so rather than hiding it.
export const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-inter",
  preload: false,
});

export const figtree = Figtree({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-figtree",
  preload: false,
});

export const ALL_FONT_VARS = [
  libre.variable,
  sourceSans.variable,
  fraunces.variable,
  newsreader.variable,
  instrument.variable,
  literata.variable,
  publicSans.variable,
  inter.variable,
  figtree.variable,
].join(" ");

/* ------------------------------------------------------------------ *
 *  Measured facts. Everything numeric below was computed from the
 *  actual font binaries in google/fonts, not quoted from a spec sheet.
 *
 *   setWidth  advance-width sum of "The rains came early this year" at
 *             30px (the size PageHeader sets), at the heading weight and
 *             optical size each face would actually ship at. Kerning not
 *             applied, so all five are wrong by the same small amount and
 *             the comparison holds.
 *   contrast  thickest horizontal run through the middle of a lowercase
 *             o, divided by the thinnest vertical run through its centre,
 *             measured off a 600px render.
 *   digits    spread between the widest and narrowest digit as a
 *             percentage of the em. 0 means the figures are tabular.
 *   kb        latin-subset woff2 bytes for roman plus true italic, with
 *             the axes listed, summed over both families in the pairing.
 * ------------------------------------------------------------------ */

export type Pairing = {
  k: string;
  label: string;
  head: string;
  body: string;
  headVar: string;
  bodyVar: string;
  /** the weight the heading face would ship at */
  headWeight: number;
  /** optional font-variation-settings for the display face */
  headVar2?: string;
  axes: string;
  setWidth: number;
  contrast: number;
  digitSpread: number;
  bodyDigits: string;
  kb: number;
  why: string;
  risk: string;
};

export const SHIPPED_SET_WIDTH = 473.9;
/* Re-measured 2026-07-25 against the latin-subset woff2 Google actually
   serves, for BOTH sides of the comparison. An earlier figure of 178.6 came
   from sizing the statics off the google/fonts repo binaries while sizing the
   variables off the served woff2, which is not a like-for-like comparison. */
export const SHIPPED_KB = 101.0;

export const PAIRINGS: Pairing[] = [
  {
    k: "today",
    label: "Today, fixed",
    head: "Libre Baskerville",
    body: "Source Sans 3",
    headVar: "var(--f-libre)",
    bodyVar: "var(--f-source)",
    headWeight: 600,
    axes: "wght 400 to 700 on both styles. No optical size. Bold Italic exists.",
    setWidth: 473.9,
    contrast: 2.69,
    digitSpread: 31.9,
    bodyDigits: "tabular by default",
    kb: 119.6,
    why: "You keep the face you already chose, and it becomes correct. Six static files become four variable ones: you gain every weight from 400 to 700 in the heading and 200 to 900 in the body, a real italic in both families, and a real Bold Italic. It costs 18.6 KB, and it is the only option on this list that carries zero design risk.",
    risk: "No optical size axis, so one drawing still serves a 30px page title and an 11px label, and the blanket tracking-tight on h1 through h4 stays a workaround rather than a decision. The heading figures are proportional with no tnum feature, so a number set in Libre Baskerville can never be made to line up. And it is 18.6 KB heavier than today, not lighter: going variable saves 5.3 KB on Source Sans 3 but costs 24.0 KB on Libre Baskerville, which is cheap as two statics.",
  },
  {
    k: "fraunces",
    label: "Fraunces",
    head: "Fraunces",
    body: "Source Sans 3",
    headVar: "var(--f-fraunces)",
    bodyVar: "var(--f-source)",
    headWeight: 600,
    headVar2: '"SOFT" 0, "WONK" 0',
    axes: "wght 100 to 900, opsz 9 to 144, plus SOFT 0 to 100 and WONK 0 to 1.",
    setWidth: 426.3,
    contrast: 2.9,
    digitSpread: 21.0,
    bodyDigits: "tabular by default",
    kb: 201.5,
    why: "The only candidate whose optical size axis runs to 144, so the same file can be a delicate 30px masthead and a sturdy 11px label without either being a compromise. Contrast climbs from 2.54 at opsz 9 to 14.00 at opsz 144, which is the thick-to-thin modulation Libre Baskerville deliberately gave up. It reads as a letterpress specimen book, which is the register a Krishnamurti school in rural Andhra Pradesh can carry and a startup cannot.",
    risk: "It has no tnum and no pnum, so its figures are proportional and unfixable: a digit swap moves a line by up to 21% of the font size. Every number in the product has to live in the body face. Turning SOFT and WONK on also costs another 118 KB for a 2021 look that will date.",
  },
  {
    k: "newsreader",
    label: "Newsreader",
    head: "Newsreader",
    body: "Public Sans",
    headVar: "var(--f-newsreader)",
    bodyVar: "var(--f-public)",
    headWeight: 600,
    axes: "Newsreader wght 200 to 800, opsz 6 to 72. Public Sans wght 100 to 900.",
    setWidth: 388.9,
    contrast: 3.12,
    digitSpread: 0,
    bodyDigits: "proportional, tnum available",
    kb: 326.1,
    why: "Drawn for screen reading, with a genuine optical size axis and the only tabular default figures of the five display faces, so numbers set in the heading actually line up. It is 17.9% narrower than Libre Baskerville at the same nominal size, which buys back a whole word per line in a narrow card.",
    risk: "The optical size axis costs 152.6 KB on its own, which makes this pairing the heaviest here at 326.1 KB, on a site whose audience includes people on rural Indian connections. And it is a newspaper face: correct, quiet, and not the thing you would pick if the complaint were that the brand lacks character.",
  },
  {
    k: "instrument",
    label: "Instrument Serif",
    head: "Instrument Serif",
    body: "Inter",
    headVar: "var(--f-instrument)",
    bodyVar: "var(--f-inter)",
    headWeight: 400,
    axes: "Not variable. One weight, roman and italic. Inter has wght 100 to 900 and opsz 14 to 32, loaded here without the opsz axis and so pinned at 14.",
    setWidth: 302.3,
    contrast: 3.07,
    digitSpread: 21.1,
    bodyDigits: "proportional, tnum available",
    kb: 127.7,
    why: "The highest contrast per byte of anything here: 3.07 from a 30 KB file. It sets 36.2% narrower than Libre Baskerville, so long titles that currently break badly in a card fit on one line. Cheaper than what ships today.",
    risk: "One weight means the serif can only ever appear on page titles. Every card title, every subhead, every 15px heading falls back to the sans, so the display face shows up perhaps four times a session and the brand voice is carried by Inter, which is the single most common interface face on the web.",
  },
  {
    k: "literata",
    label: "Literata",
    head: "Literata",
    body: "Figtree",
    headVar: "var(--f-literata)",
    bodyVar: "var(--f-figtree)",
    headWeight: 600,
    axes: "Literata wght 200 to 900, opsz 7 to 72. Figtree wght 300 to 900.",
    setWidth: 444.1,
    contrast: 2.3,
    digitSpread: 19.0,
    bodyDigits: "proportional, tnum available",
    kb: 258.4,
    why: "Commissioned by Google for Play Books, so it is drawn to be read for an hour at a time, and it carries the richest feature set of any face here: real small caps, oldstyle figures, tabular figures, a slashed zero. If the eyebrow labels ever become real small caps rather than uppercase plus tracking, this is the face that can do it in the heading.",
    risk: "It is the lowest contrast display face on this page at 2.30, below the Libre Baskerville it would replace. It is designed to disappear into a book, which is the wrong instinct for a masthead, and Figtree reads young enough to undercut the contemplative register.",
  },
];

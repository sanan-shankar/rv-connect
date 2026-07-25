/* ------------------------------------------------------------------ *
 *  Every pairing on this page, loaded for real.
 *
 *  Requested properly, which the app itself does not do: italics are
 *  asked for explicitly, and the variable families are loaded WITHOUT a
 *  `weight` array, because passing one opts out of the variable file and
 *  out of every intermediate weight.
 *
 *  Instrument Serif and Libre Baskerville are the two exceptions: they
 *  are not variable, and Libre Baskerville has no Bold Italic master at
 *  all, so it can only be asked for at 400 italic.
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

/* --- display faces --- */

export const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-fraunces",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-newsreader",
});

export const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--f-instrument",
});

export const literata = Literata({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-literata",
});

export const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--f-libre",
});

/* --- body faces --- */

export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-source",
});

export const publicSans = Public_Sans({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-public",
});

export const inter = Inter({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-inter",
});

export const figtree = Figtree({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--f-figtree",
});

export const ALL_FONT_VARS = [
  fraunces.variable,
  newsreader.variable,
  instrument.variable,
  literata.variable,
  libre.variable,
  sourceSans.variable,
  publicSans.variable,
  inter.variable,
  figtree.variable,
].join(" ");

export type Pairing = {
  k: string;
  label: string;
  head: string;
  body: string;
  headVar: string;
  bodyVar: string;
  /** heading weight the face can actually carry at display size */
  headWeight: number;
  why: string;
  risk: string;
  axes: string;
};

export const PAIRINGS: Pairing[] = [
  {
    k: "today",
    label: "Today, fixed",
    head: "Libre Baskerville",
    body: "Source Sans 3",
    headVar: "var(--f-libre)",
    bodyVar: "var(--f-source)",
    headWeight: 700,
    axes: "Neither is variable as loaded. Libre has 3 styles and no bold italic.",
    why: "The cheapest option by a mile, and you already like how it reads. Load the italics, load Source Sans 3 as the variable font it is, fix the type ladder, and most of what feels off goes away without a rebrand.",
    risk: "You still have no optical sizing and only two heading weights, so every headline is 400 or 700 with nothing between, and the global negative tracking stays a workaround rather than a decision.",
  },
  {
    k: "fraunces",
    label: "Fraunces",
    head: "Fraunces",
    body: "Source Sans 3",
    headVar: "var(--f-fraunces)",
    bodyVar: "var(--f-source)",
    headWeight: 600,
    axes: "Variable: weight 100-900, optical size 9-144, plus SOFT and WONK.",
    why: "The most characterful option that is still a serious reading face. The optical-size axis fixes the actual problem with Libre Baskerville: spacing and contrast change with size rather than being compensated by a blanket tracking hack. WONK swaps in the splayed, slightly odd letterforms at display size, which is exactly the boutique field-journal register.",
    risk: "It has a personality, and personality dates. Turn WONK up too far and it reads as a 2021 startup rather than a school in Andhra Pradesh. Keep SOFT low and WONK at or near zero for body-adjacent sizes.",
  },
  {
    k: "newsreader",
    label: "Newsreader",
    head: "Newsreader",
    body: "Public Sans",
    headVar: "var(--f-newsreader)",
    bodyVar: "var(--f-public)",
    headWeight: 600,
    axes: "Newsreader: variable weight 200-800 with a real optical-size axis 6-72.",
    why: "Drawn for screen reading, with a true optical-size axis, and it looks like a broadsheet rather than a website. Pairs with Public Sans, which is a US government face built for legibility and has more open apertures than Source Sans 3, which matters on warm low-contrast paper.",
    risk: "It is quieter than Fraunces. If the complaint is that the brand lacks character, this fixes the craft but not the character.",
  },
  {
    k: "instrument",
    label: "Instrument Serif",
    head: "Instrument Serif",
    body: "Inter",
    headVar: "var(--f-instrument)",
    bodyVar: "var(--f-inter)",
    headWeight: 400,
    axes: "Not variable: one weight, roman and italic only.",
    why: "The highest-contrast, most editorial display face here. At 34px and up it is genuinely beautiful, with the thick-thin modulation Libre Baskerville gave away. One weight is a feature at display size: you stop fiddling.",
    risk: "One weight is also a liability. Every card title, every 15px subhead has to come from the body face, so the serif only appears on page titles. And Inter is the single most common UI face on the web, which is the opposite of distinctive.",
  },
  {
    k: "literata",
    label: "Literata",
    head: "Literata",
    body: "Figtree",
    headVar: "var(--f-literata)",
    bodyVar: "var(--f-figtree)",
    headWeight: 600,
    axes: "Literata: variable weight 200-900, optical size 7-72.",
    why: "Commissioned by Google for Play Books, so it is drawn for long-form reading on screen at every size, and it has an optical-size axis. Warmer and rounder than Newsreader. Figtree is friendly without being cute, which suits a community rather than an institution.",
    risk: "Literata is designed to disappear into a book. It may be too neutral to carry a masthead, and Figtree leans young, which could undercut the contemplative register.",
  },
];

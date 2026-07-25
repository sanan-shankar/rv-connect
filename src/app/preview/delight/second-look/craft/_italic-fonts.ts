/* ------------------------------------------------------------------ *
 *  The italic faces the app owns but never downloads.
 *
 *  src/app/layout.tsx loads both families with no `style`, so only the
 *  roman files exist at runtime and every `italic` in the product is a
 *  browser-synthesised shear.
 *
 *  Note for anyone reading the craft page: next/font registers these
 *  under the REAL family names ("Libre Baskerville"), not hashed ones,
 *  so loading them here makes the real italic available page-wide. That
 *  is why the "what ships" specimen reproduces the shear with a
 *  transform instead of `font-style: italic`, which would silently pick
 *  up these files and make the comparison a lie.
 *
 *  Libre Baskerville is requested at 400 only. It has no Bold Italic
 *  master, so asking for 700 italic is not a thing that exists.
 * ------------------------------------------------------------------ */

import { Source_Sans_3, Libre_Baskerville } from "next/font/google";

export const trueBody = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sl-true-body",
});

export const trueHead = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--sl-true-head",
});

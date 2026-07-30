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
 *  Both families are requested WITHOUT a `weight` array on purpose.
 *  Libre Baskerville is a variable font (wght 400 to 700, both styles)
 *  and Source Sans 3 is variable 200 to 900; passing a weight array is
 *  the one thing that opts out of the variable file. The app passes one
 *  to both, which is why it ships six static files where four variable
 *  ones would do.
 * ------------------------------------------------------------------ */

import { Source_Sans_3, Libre_Baskerville } from "next/font/google";

export const trueBody = Source_Sans_3({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sl-true-body",
});

export const trueHead = Libre_Baskerville({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--sl-true-head",
});

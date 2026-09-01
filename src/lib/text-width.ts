/**
 * How wide a line of Libre Baskerville will be, in pixels, without a browser.
 *
 * It exists for ONE question, asked on the server: will this caption fit on
 * the line it is given, or will the browser cut it off with an ellipsis? The
 * feed rail's "From the Collection" card chooses which photograph to feature,
 * and that choice is made in a Prisma query on the server, long before
 * anything can be measured. So the alternative to this table was picking a
 * photograph and hoping -- which is how the card came to show
 * "Sports day closing ceremony (silent..." (owner, 2026-09-01: "I don't want
 * any ... in the from the collection").
 *
 * A CHARACTER COUNT WOULD NOT DO. Real captions in the archive run from
 * 6.5px to 8.1px a character, so any single cap is wrong twice over: 28
 * characters of "Games Field" is already at the edge, while 36 characters of
 * "Senior hostel boys tunnel ball relay" fits with 8px to spare. The width of
 * a line is the sum of its letters, and nothing shorter than that is true.
 *
 * The numbers are ADVANCE WIDTHS IN EMS, measured off the live card with
 * canvas measureText at 14px and divided by 14, so they scale with font size.
 * They are Libre Baskerville regular (the heading face). To re-measure after
 * a font change, run measureText over each glyph in the browser with the
 * card's computed font and divide by the size; `text-width.test.mjs` pins the
 * calibration against one known caption and will fail if the table drifts.
 *
 * It is a slight OVER-estimate by construction, which is the safe direction:
 * advances sum without kerning, and kerning only ever pulls a pair closer
 * (measured: 252.5 estimated against 251.6 real for the caption above). A
 * caption we wrongly reject is a different photograph in the card, which
 * nobody can see. A caption we wrongly accept is the ellipsis, which is the
 * whole bug.
 */

/** Advance width per glyph, in ems. */
const EM: Record<string, number> = {
  " ": 0.287, "!": 0.308, '"': 0.367, "#": 0.666, $: 0.622, "%": 0.671, "&": 0.878, "'": 0.215,
  "(": 0.332, ")": 0.332, "*": 0.516, "+": 0.55, ",": 0.273, "-": 0.463, ".": 0.265, "/": 0.46,
  "0": 0.714, "1": 0.446, "2": 0.616, "3": 0.616, "4": 0.585, "5": 0.568, "6": 0.643, "7": 0.502,
  "8": 0.606, "9": 0.643, ":": 0.285, ";": 0.311, "<": 0.581, "=": 0.62, ">": 0.581, "?": 0.399,
  "@": 1.029,
  A: 0.772, B: 0.767, C: 0.802, D: 0.884, E: 0.726, F: 0.67, G: 0.87, H: 0.925, I: 0.415,
  J: 0.394, K: 0.779, L: 0.727, M: 1.09, N: 0.902, O: 0.946, P: 0.687, Q: 0.948, R: 0.788,
  S: 0.645, T: 0.803, U: 0.861, V: 0.784, W: 1.176, X: 0.818, Y: 0.733, Z: 0.77,
  "[": 0.371, "\\": 0.46, "]": 0.371, "^": 0.48, _: 0.722, "`": 0.275,
  a: 0.554, b: 0.654, c: 0.536, d: 0.675, e: 0.573, f: 0.412, g: 0.599, h: 0.688, i: 0.341,
  j: 0.304, k: 0.616, l: 0.325, m: 1.073, n: 0.689, o: 0.654, p: 0.679, q: 0.653, r: 0.477,
  s: 0.454, t: 0.378, u: 0.67, v: 0.61, w: 0.852, x: 0.609, y: 0.639, z: 0.557,
  "{": 0.335, "|": 0.29, "}": 0.335, "~": 0.553,
  // The punctuation contributors actually type. An en dash separates half the
  // Collection's captions ("Sports day - 5K"), and smart quotes arrive
  // whenever someone writes on a phone.
  "–": 0.724, "—": 1.112, "‘": 0.257, "’": 0.254, "“": 0.449,
  "”": 0.446, "…": 0.697, "·": 0.285, "é": 0.573,
};

/** The widest glyph in the face, and so what an unmeasured one is charged. */
const UNKNOWN_EM = EM.W;

/**
 * The rendered width of `text` in Libre Baskerville, in pixels.
 *
 * `trackingEm` is the CSS letter-spacing in ems, and it is a real term rather
 * than a rounding error: the card sets -0.01em, which over a 36-character
 * caption is 5px of the 260 it has.
 */
export function headingTextWidth(text: string, sizePx: number, trackingEm = 0): number {
  let ems = 0;
  for (const ch of text) ems += EM[ch] ?? UNKNOWN_EM;
  return (ems + trackingEm * [...text].length) * sizePx;
}

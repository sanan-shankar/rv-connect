/* ------------------------------------------------------------------ *
 *  Measuring text with the real fonts, in the browser.
 *
 *  The engine's default measurer casts off from an average glyph width
 *  (src/lib/magazine/measure.ts). This one asks a canvas, which shapes
 *  with the same engine Chrome will print with, so the rows a block is
 *  given are the rows it takes. Greedy word wrap, paragraphs at newlines,
 *  a token wider than the measure broken anywhere, which is what
 *  `overflow-wrap: anywhere` does on the page. No hyphenation, because
 *  the page sets none.
 * ------------------------------------------------------------------ */

import { visibleText, type LineMeasurer } from "@/lib/magazine/measure";

const PX_PER_MM = 96 / 25.4;

export function canvasMeasurer(families: { body: string; heading: string }): LineMeasurer | null {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cache = new Map<string, number>();
  const widthOf = (font: string, s: string) => {
    const key = `${font}|${s}`;
    let w = cache.get(key);
    if (w === undefined) {
      ctx.font = font;
      w = ctx.measureText(s).width;
      cache.set(key, w);
    }
    return w;
  };
  return (text, widthMm, spec) => {
    const t = visibleText(text);
    if (!t) return 0;
    const font = `${spec.pt}pt ${spec.face === "heading" ? families.heading : families.body}`;
    const max = widthMm * PX_PER_MM;
    const space = widthOf(font, " ");
    let lines = 0;
    for (const para of t.split("\n")) {
      if (!para.trim()) {
        lines += 1;
        continue;
      }
      let line = 0;
      let count = 1;
      for (const word of para.split(/\s+/)) {
        let w = widthOf(font, word);
        if (w > max) {
          /* Break inside the token, character by character, from wherever
             the line is. */
          let run = line > 0 ? line + space : 0;
          for (const ch of word) {
            const cw = widthOf(font, ch);
            if (run + cw > max) {
              count += 1;
              run = cw;
            } else run += cw;
          }
          line = run;
          continue;
        }
        if (line === 0) line = w;
        else if (line + space + w <= max) line += space + w;
        else {
          count += 1;
          line = w;
        }
        w = 0;
      }
      lines += count;
    }
    return lines;
  };
}

/** The font families the page really uses, read off the CSS variables
 *  next/font set on the root. */
export function pageFamilies(): { body: string; heading: string } {
  const cs = getComputedStyle(document.documentElement);
  const body = cs.getPropertyValue("--font-body").trim() || "'Source Sans 3', sans-serif";
  const heading = cs.getPropertyValue("--font-display").trim() || "'Libre Baskerville', serif";
  return { body, heading };
}

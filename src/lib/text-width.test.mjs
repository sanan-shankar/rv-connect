import { test } from "node:test";
import assert from "node:assert/strict";
import { headingTextWidth } from "./text-width.ts";

/* Every number below came out of canvas measureText in the real page, at the
   feed rail's own computed font ("normal 400 14px Libre Baskerville"), on
   2026-09-01. They are the calibration: if the heading face or its metrics
   ever change, this file is what notices. */
const MEASURED = [
  ["Sports day closing ceremony (silent march past)", 341.7],
  ["Class 12 vs Staff – Tug of War", 209.1],
  ["Sports day – 5K", 112.9],
  ["Senior hostel boys tunnel ball relay", 251.6],
  ["Golden - Silver Middle Garden", 221.9],
  ["Junior school", 95.2],
  ["Indira Gandhi Gate", 138.8],
  ["Dance Cottage", 104.3],
  ["Senior Audi", 85.6],
  ["Games Field", 89.5],
  ["Cave rock", 70.8],
  ["Standing in all it's glory", 168.2],
];

test("the table lands within 2% of what the browser measured", () => {
  for (const [text, real] of MEASURED) {
    const estimate = headingTextWidth(text, 14);
    assert.ok(
      estimate - real <= real * 0.02,
      `${text}: estimated ${estimate.toFixed(1)}px against a measured ${real}px`
    );
  }
});

test("the estimate is never under the truth", () => {
  /* The safe direction, and the reason the caller can trust a fit. Summed
     advances ignore kerning, and kerning only ever pulls a pair closer. */
  for (const [text, real] of MEASURED) {
    assert.ok(
      headingTextWidth(text, 14) >= real,
      `${text} estimated narrower than it renders, which is how an ellipsis gets through`
    );
  }
});

test("tracking is charged per character", () => {
  const text = "Senior hostel boys tunnel ball relay";
  const plain = headingTextWidth(text, 14);
  const tracked = headingTextWidth(text, 14, -0.01);
  assert.ok(Math.abs(plain - tracked - 0.01 * 14 * text.length) < 1e-9);
});

test("width scales with font size", () => {
  assert.ok(Math.abs(headingTextWidth("Games Field", 28) - 2 * headingTextWidth("Games Field", 14)) < 1e-9);
});

test("the caption that started this does not fit the rail card's 260px line", () => {
  assert.ok(headingTextWidth("Sports day closing ceremony (silent march past)", 14, -0.01) > 260);
  /* ...and the one that does, does, with room to spare. A cap on characters
     would have thrown this one out too: it is the LONGER of the two. */
  assert.ok(headingTextWidth("Senior hostel boys tunnel ball relay", 14, -0.01) < 260);
});

test("an unmeasured glyph is charged as the widest one in the face", () => {
  const wide = headingTextWidth("W", 14);
  assert.equal(headingTextWidth("क", 14), wide); // Devanagari ka
  assert.equal(headingTextWidth("\u{1F600}", 14), wide); // one code point, not two
});

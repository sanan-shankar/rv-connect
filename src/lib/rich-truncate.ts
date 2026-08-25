/**
 * Where a rendered rich-text run may be cut in two.
 *
 * The feed card shows the first ~300 characters of a long post and eases the
 * rest open behind "Read more". It did that by slicing the RAW text at 300 and
 * rendering the two halves separately -- and `renderRichText` needs both
 * delimiters of a run in one string, and matches a mention whole. So anything
 * straddling that index came apart: `**a longish bold phrase**` printed its
 * asterisks, `@[Rohan](abc)` printed as its own source, and an emoji split
 * into two lone surrogates, one at the end of the lead and one at the start of
 * the remainder (audit C-011).
 *
 * The fix is not to render less, it is to cut somewhere a cut is safe: at a
 * space, outside every mention, and with no formatting run left open. That
 * index is what this returns.
 *
 * No imports, so `node --test` can load it.
 */

/** `@[Name](userId)` exactly as the composer serializes it. */
const MENTION = /@\[[^\]]*\]\([^)]*\)/g;

/** The delimiters `renderRichText` pairs, longest first so *** beats ** beats *. */
const DELIMITERS = ["***", "**", "*", "__", "~~"];

/** Half-open spans [start, end) that a cut must not land inside. */
function unsafeSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const m of text.matchAll(MENTION)) {
    spans.push([m.index, m.index + m[0].length]);
  }
  /* A formatting run is unsafe from its opening delimiter to the end of its
     closing one. Found by pairing occurrences left to right, longest
     delimiter first, and removing each pair from consideration -- which is
     close enough to what the renderer does that no cut this allows can break
     a run the renderer would have made. */
  const taken = new Array(text.length).fill(false);
  for (const [s, e] of spans) for (let i = s; i < e; i++) taken[i] = true;
  for (const d of DELIMITERS) {
    let from = 0;
    for (;;) {
      const open = text.indexOf(d, from);
      if (open < 0 || taken[open]) {
        if (open < 0) break;
        from = open + 1;
        continue;
      }
      const close = text.indexOf(d, open + d.length);
      if (close < 0) break;
      spans.push([open, close + d.length]);
      for (let i = open; i < close + d.length; i++) taken[i] = true;
      from = close + d.length;
    }
  }
  return spans;
}

const inside = (spans: Array<[number, number]>, i: number) =>
  spans.some(([s, e]) => i > s && i < e);

/**
 * The largest index at or below `max` where `text` may be split so that both
 * halves render the way the whole would have.
 *
 * Returns `text.length` when nothing needs cutting. Falls back to `max` only
 * when no safe boundary exists at all (a single 300-character word), which
 * cannot be worse than what it replaces.
 */
export function safeTruncateIndex(text: string, max: number): number {
  if (text.length <= max) return text.length;
  const spans = unsafeSpans(text);
  for (let i = max; i > max * 0.6; i--) {
    // A space is a boundary a reader already accepts, and it can never fall
    // inside a surrogate pair or a grapheme cluster.
    if (!/\s/.test(text[i])) continue;
    if (inside(spans, i)) continue;
    return i;
  }
  return max;
}

/* ------------------------------------------------------------------ *
 *  Measuring words before anything is drawn.
 *
 *  The engine has to know how tall a block of text will be without a
 *  browser, because the whole grammar is a pure function tested from
 *  node. So it estimates lines from a character count and a measure, the
 *  way a compositor casts off copy. The estimate is replaceable: a
 *  renderer that has the real font can hand in a `LineMeasurer` built on
 *  canvas `measureText`, and the room does exactly that once the fonts
 *  have loaded, so the pages it draws are measured rather than guessed.
 *  The estimate stays for the tests and for the first pass.
 * ------------------------------------------------------------------ */

import type { MagAnswer, Paper } from "./types.ts";

/** Which face a run is set in, and how big. */
export type FontSpec = { pt: number; face: "body" | "heading" };

/** Lines a text takes across `widthMm` in `font`, paragraph breaks kept.
 *  The estimate below is the default; a renderer with the real font hands
 *  in one built on canvas `measureText` and the same pages come out
 *  measured. */
export type LineMeasurer = (text: string, widthMm: number, font: FontSpec) => number;

/** Average glyph advance as a fraction of the em, by face: Source Sans 3
 *  over English prose, and Libre Baskerville, which sets wider. */
export const ADVANCE: Record<FontSpec["face"], number> = { body: 0.48, heading: 0.55 };

/* ── Visible text ──────────────────────────────────────────────────── */

/** Zero-width and bidi control characters a phone keyboard or a paste can
 *  leave behind. Built from escapes rather than written literally: U+2028
 *  inside a regex literal is a line terminator to the compiler. */
const INVISIBLE = new RegExp("[\\u200B-\\u200F\\u2028-\\u202E\\u2060\\uFEFF]", "g");

/** The composer's wire format reduced to what a reader sees, for
 *  measuring and for choosing quotes. Emphasis markers go; a mention
 *  becomes its name; links are already out (the loader took them). Not
 *  for rendering: `renderRichText` does that, with escaping. */
export function visibleText(body: string | null | undefined): string {
  if (!body) return "";
  return (
    body
      .replace(/\u0000/g, "")
      /* Invisible characters a phone keyboard or a paste can leave: zero
         width space, joiner, non-joiner, word joiner, byte order mark, the
         bidi controls. A body made only of these is nothing (F9, E9). */
      .replace(INVISIBLE, "")
      .replace(/@\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*{1,3}(\S(?:[^*]*?\S)?)\*{1,3}/g, "$1")
      .replace(/__(\S(?:[^_]*?\S)?)__/g, "$1")
      .replace(/~~(\S(?:[^~]*?\S)?)~~/g, "$1")
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** Whether there is anything to print as words. The reader's `said()` asks
 *  the same question of a whole answer; this asks it of the body alone. */
export function hasWords(body: string | null | undefined): boolean {
  return visibleText(body).length > 0;
}

/** True when the answer carries anything a page can print: words, a
 *  photograph, a card, a recording, or a vote. `said()` in the reader,
 *  widened for the two kinds the reader does not draw yet. */
export function says(a: MagAnswer): boolean {
  return hasWords(a.body) || a.photos.length > 0 || a.links.length > 0 || a.audio !== null || a.pick !== null;
}

export function wordCount(text: string): number {
  const t = visibleText(text);
  if (!t) return 0;
  /* Scripts with no spaces (Thai, Japanese, Chinese) would count as one
     word; count graphemes over ten as words there so a 400-character
     answer is not sized as a one-liner (C4). */
  const spaced = t.split(/\s+/).filter(Boolean);
  const unspaced = t.replace(/[\s\u0000-\u2FFF]/g, "").length;
  return spaced.length + Math.floor(unspaced / 6);
}

/* ── Casting off ───────────────────────────────────────────────────── */

/** Characters that fit on one line of `widthMm` at the paper's body size.
 *  Source Sans 3 averages 0.48em per glyph over English prose, which was
 *  measured rather than assumed; a script that sets wider (all caps runs
 *  about 1.3x) is handled by `capsRatio` in the estimate. */
export function charsPerLine(paper: Paper, widthMm: number, scale = 1): number {
  const ptPerMm = 72 / 25.4;
  const advancePt = paper.bodyPt * scale * paper.bodyAdvance;
  return Math.max(8, Math.floor((widthMm * ptPerMm) / advancePt));
}

/** The default cast-off: greedy word wrap on an average advance, one
 *  paragraph per newline, an unbreakable token wrapping at the measure
 *  (which is what `overflow-wrap: anywhere` does on the page). */
export const estimateLines: LineMeasurer = (text, widthMm, font) => {
  const cpl = Math.max(8, Math.floor((widthMm * 72) / 25.4 / (font.pt * ADVANCE[font.face])));
  return castOff(text, cpl);
};

/** Lines at a known characters-per-line, the estimate's core. */
export function castOff(text: string, cpl: number): number {
  const t = visibleText(text);
  if (!t) return 0;
  let lines = 0;
  for (const para of t.split("\n")) {
    if (!para.trim()) {
      lines += 1;
      continue;
    }
    const caps = capsRatio(para);
    const width = Math.max(8, Math.floor(cpl / caps));
    let line = 0;
    let count = 1;
    for (const word of para.split(/\s+/)) {
      const w = word.length;
      if (w > width) {
        /* Wraps inside itself, as anywhere-breaking does. */
        const carry = line > 0 ? width - line - 1 : width;
        const rest = Math.max(0, w - carry);
        count += Math.ceil(rest / width);
        line = rest % width || (rest ? width : w);
        continue;
      }
      if (line === 0) line = w;
      else if (line + 1 + w <= width) line += 1 + w;
      else {
        count += 1;
        line = w;
      }
    }
    lines += count;
  }
  return lines;
};

/** How much wider than average a run sets: capitals are about 1.3x. */
function capsRatio(s: string): number {
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length < 12) return 1;
  const upper = letters.replace(/[^A-Z]/g, "").length / letters.length;
  return 1 + 0.3 * Math.max(0, upper - 0.2) / 0.8;
}

/* ── Quotes ────────────────────────────────────────────────────────── */

const QUOTE_MIN_WORDS = 9;
const QUOTE_MAX_WORDS = 28;
/** The fewest words an answer needs before one of its sentences may be
 *  lifted out of it. */
export const QUOTE_FROM_WORDS = 60;
/** Quotes one writer may supply in one Edition. */
export const QUOTES_PER_WRITER = 2;

/** Split into sentences without falling for "Dr.", "e.g.", "3.5 km" or
 *  "St. Mary's" (C31). A sentence ends at . ! or ? followed by space and a
 *  capital, a quote mark, or the end. */
export function sentencesOf(text: string): string[] {
  const t = visibleText(text).replace(/\n+/g, " ");
  const out: string[] = [];
  let start = 0;
  const re = /([.!?]["'\u2019\u201D)]*)(\s+)(?=["'\u2018\u201C(]?[A-Z\u0900-\u0DFF\u0600-\u06FF])|([.!?]["'\u2019\u201D)]*)$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const end = m.index + (m[1] ?? m[3] ?? "").length;
    const s = t.slice(start, end).trim();
    const tail = s.split(/\s+/).pop() ?? "";
    /* An abbreviation or a decimal is not an end. */
    if (/^(Dr|Mr|Mrs|Ms|St|Prof|e\.g|i\.e|vs|etc|no)\.$/i.test(tail) || /\d\.$/.test(tail)) continue;
    if (s) out.push(s);
    start = end;
  }
  const rest = t.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Words that keep a sentence off a page where it would stand alone in
 *  display type (H14, H15). Not a filter on what members may write; a
 *  filter on what the magazine lifts out of context and enlarges. */
const NOT_FOR_DISPLAY =
  /\b(died|dying|death|dead|funeral|cancer|suicide|divorce|miscarriage|abuse|rape|kill|killing|hate|fuck|fucking|shit|bitch|bastard|cunt|asshole)\b/i;

/** Whether a sentence may be set large and alone on a page. It has to be a
 *  complete, quotable sentence somebody wrote: enough words, not shouted,
 *  not a url or a mention or an emoji row, not already quoting somebody,
 *  not a machine transcript, not something that reads as grief or an
 *  insult without its question, and not one that starts on a pronoun
 *  with nothing for it to point at (H12). */
export function quotable(sentence: string, opts: { transcript?: boolean } = {}): boolean {
  if (opts.transcript) return false;
  const s = sentence.trim();
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < QUOTE_MIN_WORDS || words.length > QUOTE_MAX_WORDS) return false;
  if (/https?:\/\/|www\./i.test(s)) return false;
  if (/@\w/.test(s)) return false;
  if (NOT_FOR_DISPLAY.test(s)) return false;
  if (/^(he|she|it|that|this|they|those|these|which)\b/i.test(s)) return false;
  /* Typed casually: a lowercase start, or a lowercase "i". Fine in a
     column, sloppy at 16pt italic (seen: "people create such art and i
     feel like dying." as a deck). */
  if (!/^[A-Z"'\u201C\u2018(]/.test(s)) return false;
  if (/(^|\s)i(\s|'|\u2019)/.test(s)) return false;
  if (/^["'\u201C\u2018]/.test(s) || /["\u201D]$/.test(s)) return false;
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters.length > 12 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.6) return false;
  if (/^[\p{Extended_Pictographic}\s\p{P}]+$/u.test(s)) return false;
  if (!/[.!?]["'\u2019\u201D)]*$/.test(s)) return false;
  return true;
}

export type Quote = { text: string; by: string; answerId: string; weight: number };

/** Every quotable sentence in an Edition, best first: hearts on the answer
 *  weigh most, then a length near the middle of the band. One quote per
 *  answer at most, never from a recording's transcript (E19, F25), never
 *  from a writer whose account is gone (H11), and never from an answer to
 *  an anonymous question, where the sentence could name the asker (H9). */
export function quotesOf(answers: Array<MagAnswer & { transcript?: boolean; anonymousQuestion?: boolean }>): Quote[] {
  const out: Quote[] = [];
  for (const a of answers) {
    if (!hasWords(a.body) || a.audio || a.author.gone || a.anonymousQuestion) continue;
    /* A playlist answer's best sentence is a song title (panel A9). */
    if (a.links.length > 0) continue;
    /* A quote is a sentence lifted OUT of something longer. An answer under
       QUOTE_FROM_WORDS would be printed whole twice (seen on the one-writer
       Edition: its only twenty-word answer came back as its own pull quote). */
    if (wordCount(a.body ?? "") < QUOTE_FROM_WORDS) continue;
    let best: Quote | null = null;
    for (const s of sentencesOf(a.body ?? "")) {
      if (!quotable(s)) continue;
      const n = s.split(/\s+/).length;
      const mid = (QUOTE_MIN_WORDS + QUOTE_MAX_WORDS) / 2;
      const weight = 1 + a.hearts * 0.5 - Math.abs(n - mid) / mid;
      if (!best || weight > best.weight) best = { text: s, by: a.author.name, answerId: a.id, weight };
    }
    if (best) out.push(best);
  }
  /* The same sentence in two answers (pasted, or planted, H17) is quoted
     once at most, from whichever ranks higher; and one writer is quoted at
     most twice an Edition, so the one who writes long is not the one who
     is quoted on every page (panel A9). */
  const seen = new Set<string>();
  const perWriter = new Map<string, number>();
  return out
    .sort((x, y) => y.weight - x.weight)
    .filter((q) => {
      const key = q.text.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) return false;
      const n = perWriter.get(q.by) ?? 0;
      if (n >= QUOTES_PER_WRITER) return false;
      seen.add(key);
      perWriter.set(q.by, n + 1);
      return true;
    });
}

/** A question's first words, for a cover line: cut on a word at about
 *  `max` characters, never mid-word, with an ellipsis only when cut. */
export function coverLine(text: string, max = 72): string {
  const t = visibleText(text).replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut}\u2026`;
}

/** Cut a body at about `at` characters on a word boundary, never inside an
 *  emphasis run, a mention or a url token (G20). Returns the index to cut
 *  at; a renderer slicing an essay for a continuation uses it. */
export function safeCut(text: string, at: number): number {
  if (at >= text.length) return text.length;
  let i = at;
  while (i > 0 && !/\s/.test(text[i])) i -= 1;
  /* Inside a marker or a mention: back up to before it opened. */
  const before = text.slice(0, i);
  const openMention = before.lastIndexOf("@[");
  if (openMention >= 0 && before.indexOf(")", openMention) < 0) i = openMention;
  for (const mark of ["***", "**", "__", "~~", "*"]) {
    const n = before.split(mark).length - 1;
    if (n % 2 === 1) {
      const idx = before.lastIndexOf(mark);
      if (idx >= 0 && idx < i) i = idx;
    }
  }
  return Math.max(0, i);
}

/** m:ss for a recording; null when the length is not known or is silly. */
export function durationLabel(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0 || seconds > 600) return null;
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

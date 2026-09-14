/* ------------------------------------------------------------------ *
 *  Putting blocks on pages.
 *
 *  The rules a compositor would give a junior, written as code:
 *
 *  - A story starts on a fresh page unless the page still has room for a
 *    real start (STORY_RUN_ON_ROWS). Never a headline in the bottom
 *    quarter of a page.
 *  - A headline keeps at least OPENER_KEEP_ROWS of its story under it.
 *  - Text runs fill columns top to bottom, then the next column, then the
 *    next page. An answer is never split, except an essay, which splits
 *    at a line with at least ESSAY_MIN_SPLIT lines on each side and its
 *    byline on the first.
 *  - A photograph, a card row, a wall row and a vote never split. One that
 *    does not fit moves to the next page whole.
 *  - A gap left on a page of at least QUOTE_FILL_ROWS is filled with a
 *    pull quote, from an answer that is not on that page.
 *  - The back page is the writers. It joins the last page when it fits,
 *    else it takes a page and grows to fill it.
 * ------------------------------------------------------------------ */

import { charsPerLine, visibleText, type Quote } from "./measure.ts";
import { rowsPerPage, spanMm, type Block, type MagPerson, type Page, type Paper, type TextBlock } from "./types.ts";

export const STORY_RUN_ON_ROWS = 14;
export const OPENER_KEEP_ROWS = 8;
export const ESSAY_MIN_SPLIT = 4;
export const QUOTE_FILL_ROWS = 7;
export const QUOTE_ROWS = 6;
export const BACK_PAGE_MIN_ROWS = 10;

export type Layout = {
  pages: Page[];
  /** Rows used on the current (last) page. */
  used: number;
  /** Which answers' bodies sit on the current page, for the quote rule. */
  onPage: Set<string>;
  quotesLeft: Quote[];
};

export function emptyLayout(quotes: Quote[]): Layout {
  return { pages: [], used: 0, onPage: new Set(), quotesLeft: [...quotes] };
}

function newPage(l: Layout): Page {
  const p: Page = { number: l.pages.length + 1, blocks: [], used: 0, signature: "", running: null, score: { fill: 0, image: 0, variety: 0, coherence: 0, total: 0 } };
  l.pages.push(p);
  l.used = 0;
  l.onPage = new Set();
  return p;
}

function current(l: Layout): Page {
  return l.pages[l.pages.length - 1] ?? newPage(l);
}

function put(l: Layout, b: Block) {
  const p = current(l);
  p.blocks.push(b);
  p.used += b.rows;
  l.used += b.rows;
  for (const id of answerIdsOf(b)) l.onPage.add(id);
}

function answerIdsOf(b: Block): string[] {
  switch (b.kind) {
    case "columns":
      return b.columns.flat().map((t) => t.answer.id);
    case "essay":
      return [b.text.answer.id];
    case "photo-text":
      return [b.answer.id, ...b.column.map((t) => t.answer.id)];
    case "photo-band":
      return [b.answer.id];
    case "gallery":
      return b.items.map((it) => it.answer.id);
    case "cards":
      return b.cards.map((c) => c.answer.id);
    default:
      return [];
  }
}

/** Fill a gap with a quote if one is available that is not on this page
 *  and the gap is big enough; else leave it, and let the score say so. */
function fillGap(l: Layout, paper: Paper, left: number) {
  if (left < QUOTE_FILL_ROWS) return;
  const i = l.quotesLeft.findIndex((q) => !l.onPage.has(q.answerId));
  if (i < 0) return;
  const q = l.quotesLeft.splice(i, 1)[0];
  const rows = Math.min(left, Math.max(QUOTE_ROWS, quoteRows(paper, q.text)));
  put(l, { kind: "quote", rows, text: q.text, by: q.by, answerId: q.answerId });
}

function quoteRows(paper: Paper, text: string): number {
  /* Baskerville italic at 16pt across 9 columns: about 0.52em advance. */
  const cpl = Math.floor((spanMm(paper, 9) * 72) / 25.4 / (16 * 0.52));
  const lines = Math.ceil(text.length / cpl);
  return 2 + Math.ceil(lines * (22 / 15)) + 1;
}

/** Lay one story's blocks. `first` says the story may run on (a cover or
 *  contents page never lets a story share). */
export function layStory(l: Layout, paper: Paper, blocks: Block[], opts: { allowRunOn: boolean }) {
  const perPage = rowsPerPage(paper);
  if (blocks.length === 0) return;
  const page = current(l);
  const left = perPage - l.used;
  const running = runningOf(blocks);
  /* A story that cannot start properly here starts on the next page, and
     the room it leaves is offered to a quote. Two ways to start properly:
     enough of the page is left for a real start, or the whole story fits
     in what is left (a one-line answer under a short question is a brief,
     and eight briefs make one page, not eight). */
  const whole = blocks.reduce((n, b) => n + (b.kind === "columns" ? b.columns.flat().reduce((m, t) => m + t.rows, 0) : b.rows), 0);
  const fits = whole <= left;
  if ((!opts.allowRunOn || (left < STORY_RUN_ON_ROWS && !fits)) && page.blocks.length > 0) {
    fillGap(l, paper, left);
    newPage(l);
  }
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    /* The folio names the question the page STARTS in: the first story to
       put a block on a page sets it, and a story that only ends on the page
       does not overwrite it (round three, 12). */
    if (running !== null && current(l).running === null) current(l).running = running;
    if (b.kind === "opener") {
      const keep = nextRows(blocks, i + 1);
      const need = b.rows + Math.min(OPENER_KEEP_ROWS, keep);
      if (perPage - l.used < need) {
        fillGap(l, paper, perPage - l.used);
        newPage(l);
      }
      put(l, b);
      continue;
    }
    if (b.kind === "columns") {
      layColumns(l, paper, b.columns[0], b.span);
      continue;
    }
    if (b.kind === "essay") {
      layEssay(l, paper, b);
      continue;
    }
    /* Everything else is atomic. */
    if (b.rows > perPage - l.used) {
      if (l.used > 0) {
        const opener = takeBackOpener(l);
        fillGap(l, paper, perPage - l.used);
        newPage(l);
        if (running !== null) current(l).running = running;
        if (opener) put(l, opener);
      }
    }
    if (b.rows > perPage) {
      /* Taller than a page: it was composed wrong. Clamp so the page can
         still be drawn, and the room will show the overflow. */
      put(l, { ...b, rows: perPage });
      continue;
    }
    put(l, b);
    if (running !== null && current(l).running === null) current(l).running = running;
  }
}

function runningOf(blocks: Block[]): string | null {
  const o = blocks.find((b) => b.kind === "opener");
  return o && o.kind === "opener" ? visibleText(o.question.text) : null;
}

/** Rows of the next non-column block, or of the first few column
 *  answers, for the keep-with rule. */
function nextRows(blocks: Block[], from: number): number {
  const b = blocks[from];
  if (!b) return 0;
  if (b.kind === "columns") return b.columns[0].slice(0, 2).reduce((n, t) => n + t.rows, 0);
  return b.rows;
}

/** Answers into `cols` columns of the page's remaining height, in order,
 *  no answer split; the next page gets the rest. The block the page holds
 *  records exactly which answers landed in which column, at the height
 *  the tallest column took. */
/** A page's last block, when it is a headline that would be left alone,
 *  taken back so it can go with its story to the next page (D3). */
function takeBackOpener(l: Layout): Block | null {
  const page = current(l);
  const last = page.blocks[page.blocks.length - 1];
  if (!last || last.kind !== "opener") return null;
  page.blocks.pop();
  page.used -= last.rows;
  l.used -= last.rows;
  return last;
}

function layColumns(l: Layout, paper: Paper, answers: TextBlock[], span: number) {
  const perPage = rowsPerPage(paper);
  const cols = Math.floor(12 / span);
  const queue = [...answers];
  const running = current(l).running;
  while (queue.length > 0) {
    let left = perPage - l.used;
    if (left < Math.min(6, queue[0].rows)) {
      const opener = takeBackOpener(l);
      fillGap(l, paper, perPage - l.used);
      newPage(l);
      /* A continuation page is inside the same question. */
      current(l).running = running;
      if (opener) put(l, opener);
      left = perPage - l.used;
    }
    /* How many answers this page can take at all, in order, no answer
       split: the greedy count over the columns' total capacity. */
    const columns: TextBlock[][] = Array.from({ length: cols }, () => []);
    const heights = new Array(cols).fill(0);
    let splitOne = false;
    const taking: TextBlock[] = [];
    {
      const trial = new Array(cols).fill(0);
      let c = 0;
      for (const t of queue) {
        if (trial[c] + t.rows <= left) {
          trial[c] += t.rows;
          taking.push(t);
        } else if (c + 1 < cols && t.rows <= left) {
          c += 1;
          trial[c] += t.rows;
          taking.push(t);
        } else break;
      }
    }
    if (taking.length === 0 && queue[0].rows > perPage - 2) {
      /* A single answer taller than a page (a 9,000-character paragraph):
         split it like an essay rather than lose it. */
      const t = queue.shift()!;
      layEssay(l, paper, { kind: "essay", rows: t.rows, text: { ...t, kind: "essay" }, aside: null });
      splitOne = true;
    }
    if (splitOne) continue;
    /* Then BALANCE them: a column ends when the next answer would carry it
       past an equal share, so two columns come out level rather than the
       first full and the second empty (G31, seen on the live Edition). */
    const distribute = (items: TextBlock[]): TextBlock[][] | null => {
      const cs: TextBlock[][] = Array.from({ length: cols }, () => []);
      const hs = new Array(cols).fill(0);
      const total = items.reduce((n, t) => n + t.rows, 0);
      const share = Math.ceil(total / cols);
      let c = 0;
      for (const t of items) {
        if (cs[c].length > 0 && hs[c] + t.rows > share && c + 1 < cols) c += 1;
        while (hs[c] + t.rows > left && c + 1 < cols) c += 1;
        if (hs[c] + t.rows > left) return null;
        cs[c].push(t);
        hs[c] += t.rows;
      }
      return cs;
    };
    /* Balancing can push the last column past the page where the greedy
       trial did not; give answers back until every column fits. */
    let placed: TextBlock[][] | null = null;
    while (taking.length > 0 && !(placed = distribute(taking))) taking.pop();
    if (placed) {
      placed.forEach((col, i) => {
        columns[i] = col;
        heights[i] = col.reduce((n, t) => n + t.rows, 0);
      });
      for (let i = 0; i < taking.length; i += 1) queue.shift();
    }
    const rows = Math.max(...heights);
    if (rows > 0) put(l, { kind: "columns", rows, columns, span });
    else if (queue.length > 0) {
      /* Nothing fitted on what was left: take a fresh page, and bring a
         stranded headline along. */
      const opener = takeBackOpener(l);
      fillGap(l, paper, perPage - l.used);
      newPage(l);
      current(l).running = running;
      if (opener) put(l, opener);
    }
  }
}

/** An essay may split across pages at a line, keeping its byline with at
 *  least ESSAY_MIN_SPLIT lines and leaving at least as many after. */
function layEssay(l: Layout, paper: Paper, b: Extract<Block, { kind: "essay" }>) {
  const perPage = rowsPerPage(paper);
  const t = b.text;
  const text = visibleText(t.answer.body);
  const cpl = charsPerLine(paper, spanMm(paper, 8));
  let left = perPage - l.used;
  if (t.rows <= left) {
    put(l, b);
    return;
  }
  const bylineRows = 2;
  const totalLines = t.rows - bylineRows - 1;
  if (left - bylineRows < ESSAY_MIN_SPLIT + 1) {
    const opener = takeBackOpener(l);
    const running = current(l).running;
    fillGap(l, paper, perPage - l.used);
    newPage(l);
    current(l).running = running;
    if (opener) put(l, opener);
    left = perPage - l.used;
  }
  /* Slice by characters in proportion to lines: the renderer flows the
     real words, so the slice is a guide for the height, not a cut. */
  let lineAt = 0;
  let charAt = 0;
  let first = true;
  while (lineAt < totalLines) {
    const room = left - (first ? bylineRows : 1) - 1;
    let take = Math.min(room, totalLines - lineAt);
    const remaining = totalLines - lineAt - take;
    if (remaining > 0 && remaining < ESSAY_MIN_SPLIT) take = Math.max(ESSAY_MIN_SPLIT, take - (ESSAY_MIN_SPLIT - remaining));
    if (take < ESSAY_MIN_SPLIT && !first) take = Math.min(room, totalLines - lineAt);
    const charEnd = lineAt + take >= totalLines ? text.length : Math.min(text.length, charAt + take * cpl);
    const rows = (first ? bylineRows : 1) + take + 1;
    put(l, { kind: "essay", rows, text: { ...t, rows, continued: !first, slice: [charAt, charEnd] }, aside: b.aside });
    lineAt += take;
    charAt = charEnd;
    first = false;
    if (lineAt < totalLines) {
      const running = current(l).running;
      newPage(l);
      current(l).running = running;
      left = perPage;
    }
  }
}

/** The back page: everyone who wrote, as birds and names, and the
 *  questions nobody answered. Joins the last page when there is room;
 *  otherwise takes its own and fills it. Birds go smaller as the crowd
 *  grows, so a hundred still fit one page (G35). */
export function layBack(l: Layout, paper: Paper, people: MagPerson[], alsoAsked: string[]) {
  const perPage = rowsPerPage(paper);
  const perRow = people.length > 60 ? 12 : people.length > 32 ? 10 : 8;
  const rowsPerRow = perRow >= 10 ? 4 : 5;
  const need = 3 + Math.ceil(people.length / perRow) * rowsPerRow + (alsoAsked.length ? 2 + alsoAsked.length : 0);
  const left = perPage - l.used;
  if (need <= left && l.pages.length > 0 && l.used > 0) {
    put(l, { kind: "contributors", rows: Math.max(BACK_PAGE_MIN_ROWS, need), people, alsoAsked, perRow });
    return;
  }
  if (l.used > 0) {
    fillGap(l, paper, left);
    newPage(l);
  }
  put(l, { kind: "contributors", rows: perPage, people, alsoAsked, perRow });
}

export function layAtomic(l: Layout, paper: Paper, b: Block) {
  const perPage = rowsPerPage(paper);
  if (l.used > 0 && b.rows > perPage - l.used) newPage(l);
  put(l, { ...b, rows: Math.min(b.rows, perPage) });
}

export function closePage(l: Layout) {
  if (l.used > 0) newPage(l);
}

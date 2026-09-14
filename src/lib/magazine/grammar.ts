/* ------------------------------------------------------------------ *
 *  The grammar: what a story is made of, and the shapes it can take.
 *
 *  A STORY is one question and its answers. The grammar turns a story
 *  into a list of blocks, each a whole number of baseline rows tall, in
 *  reading order. It does this several ways (the TEMPLATES), and the
 *  search in index.ts picks the way that scores best once the blocks are
 *  on pages. His words, brief para 21: "a lot of layout rules that are
 *  very rapidly adjusting to the content it's receiving."
 *
 *  Everything here is an "if statement" about content shape, and every
 *  threshold is named at the top so the room can print it and a test can
 *  pin it. The reasons are in magazine.md, "The grammar".
 * ------------------------------------------------------------------ */

import { estimateLines, hasWords, quotesOf, says, visibleText, wordCount, type LineMeasurer, type Quote } from "./measure.ts";
import { DPI_FLOOR, justify, longEdge, place, ratioOf, shapeOf, sharpness, widestSpan } from "./image.ts";
import { mmToRows, spanMm, type Block, type MagAnswer, type MagLink, type MagPerson, type MagPhoto, type MagQuestion, type Paper, type PhotoPlacement, type TextBlock } from "./types.ts";

/* ── The thresholds ────────────────────────────────────────────────── */

/** Up to this many words an answer is a NOTE: its byline runs into its
 *  words on one line, and notes pack into columns. The live median answer
 *  is 26 words. */
export const NOTE_WORDS = 28;
/** From this many words an answer is an ESSAY: it gets a wide measure of
 *  its own and may run over a page. */
export const ESSAY_WORDS = 220;
/** A story whose answers are mostly notes takes the notes templates. Six
 *  in ten, not seven: at seven the live "Songs" and "Side quest" stories
 *  missed by one answer each (panel B7, B12). */
export const NOTES_SHARE = 0.6;
/** A story where at least this share of answers carry photographs may
 *  open on its best one. */
export const PHOTO_SHARE = 0.4;
/** A story with fewer answers than this gets no deck quote under its
 *  headline: there is nothing to preview. */
export const DECK_MIN_ANSWERS = 4;
/** Rows a byline takes above a paragraph (bird, name, air). */
export const BYLINE_ROWS = 2;
/** Rows of air after any answer. */
export const GAP_ROWS = 1;
/** Rows the question mark and the "Asked by" line take around a headline. */
export const OPENER_CHROME_ROWS = 3;
/** Headline size, and the size it steps down to past `HEADLINE_STEP_CHARS`
 *  characters, so a 300-character question does not take half a page. */
export const HEADLINE_PT = 24;
export const HEADLINE_SMALL_PT = 17;
export const HEADLINE_STEP_CHARS = 120;
/** A photo wall's target row height. 42mm is about 8 rows: big enough to
 *  see a face, small enough that a wall of forty is a spread, not a book. */
export const WALL_ROW_MM = 42;
export const WALL_GAP_MM = 2;
/** Song and link cards, three across; each card's rows. */
export const CARDS_PER_ROW = 3;
export const CARD_ROWS = 8;
/** Birds in a vote result: 6mm each, at this many across the text area. */
export const VOTE_BIRDS_PER_ROW = 24;

/* ── Classification ────────────────────────────────────────────────── */

export type AnswerClass = "empty" | "note" | "paragraph" | "essay" | "photo" | "card" | "voice" | "vote";

/** What an answer IS, for the grammar. Photographs win over words because
 *  they set the block's shape; a card answer is one whose words are only
 *  the card's company; a recording is its own thing whatever the
 *  transcript says. */
export function classify(a: MagAnswer): AnswerClass {
  if (!says(a)) return "empty";
  if (a.pick !== null) return "vote";
  if (a.audio) return "voice";
  if (a.photos.length > 0) return "photo";
  const words = wordCount(a.body ?? "");
  if (a.links.length > 0 && words <= NOTE_WORDS) return "card";
  if (words <= NOTE_WORDS) return "note";
  if (words >= ESSAY_WORDS) return "essay";
  return "paragraph";
}

/* ── The context a story is composed in ────────────────────────────── */

export type Ctx = {
  paper: Paper;
  measure: LineMeasurer;
  /** Quotes from the whole Edition, best first; a story may spend them. */
  quotes: Quote[];
};

const HEADLINE_LEADING = 1.2;

/** Rows a question takes as a headline across `span` columns. */
export function headlineRows(ctx: Ctx, text: string, span: number): number {
  const t = visibleText(text);
  const pt = t.length > HEADLINE_STEP_CHARS ? HEADLINE_SMALL_PT : HEADLINE_PT;
  const lines = Math.max(1, ctx.measure(t, spanMm(ctx.paper, span), { pt, face: "heading" }));
  const rowsPerLine = (pt * HEADLINE_LEADING) / (ctx.paper.baselineMm * (72 / 25.4));
  return Math.max(2, Math.ceil(lines * rowsPerLine));
}

/** A brief's question: 13pt Baskerville across the text area. */
export const BRIEF_PT = 13;
export function briefRows(ctx: Ctx, text: string): number {
  const lines = Math.max(1, ctx.measure(visibleText(text), spanMm(ctx.paper, 12), { pt: BRIEF_PT, face: "heading" }));
  return Math.ceil(lines * ((BRIEF_PT * 1.3) / (ctx.paper.baselineMm * (72 / 25.4))));
}

/* ── Text blocks ───────────────────────────────────────────────────── */

/** The rows an answer's words take at `span` columns, as the block kind
 *  the class asks for. A note's byline runs in, so its name costs
 *  characters on the first line rather than rows. */
export function textBlock(ctx: Ctx, a: MagAnswer, span: number, kind: TextBlock["kind"]): TextBlock {
  const width = spanMm(ctx.paper, span);
  const font = { pt: ctx.paper.bodyPt, face: "body" as const };
  const text = visibleText(a.body);
  if (kind === "note") {
    /* The bird (4mm) and the name run into the first line. */
    const lines = text ? ctx.measure(`${a.author.name}    ${text}`, width - 5, font) : 1;
    return { kind, answer: a, rows: lines + GAP_ROWS };
  }
  const lines = ctx.measure(text, width, font);
  return { kind, answer: a, rows: BYLINE_ROWS + lines + GAP_ROWS };
}

function voiceBlock(ctx: Ctx, a: MagAnswer, span: number): TextBlock {
  if (!hasWords(a.body)) {
    /* Nothing to print but the fact of the recording: a run-in line. */
    return { kind: "transcript", answer: a, rows: 1 + GAP_ROWS };
  }
  const b = textBlock(ctx, a, span, "transcript");
  return { ...b, rows: b.rows + 1 };
}

/* ── Photo blocks ──────────────────────────────────────────────────── */

/** The photographs of an answer that clear the gate at three columns or
 *  more; the rest are refused and reported. */
function usablePhotos(paper: Paper, a: MagAnswer, refused: MagPhoto[]): MagPhoto[] {
  return a.photos.filter((p) => {
    const ok = widestSpan(paper, p) >= 3;
    if (!ok) refused.push(p);
    return ok;
  });
}

/** A band: one photograph at the span where it is sharpest for its size
 *  (Blurb's rule run backwards: a 900px still takes six columns at 257 dpi
 *  rather than ten at 152), or several as one justified row, with the
 *  words beneath at an eight-column measure. */
export function photoBand(ctx: Ctx, a: MagAnswer, usable: MagPhoto[]): Block | null {
  const { paper } = ctx;
  const words = wordCount(a.body ?? "");
  const placements: PhotoPlacement[] = [];
  let rows = 0;
  if (usable.length === 1) {
    const p = usable[0];
    const shape = shapeOf(p);
    /* Under twelve words a band is never taller than BAND_FEW_ROWS (the
       judge: "nearly half the page for six words"). */
    const cap = words < 12 ? BAND_FEW_ROWS : shape === "tall" ? 26 : shape === "portrait" ? 28 : 24;
    /* A photograph is weighed against its words (panel A2, C4: four words
       under a 135 x 181 mm portrait): under twelve words a portrait takes
       five columns at most and a landscape eight, whatever its sharpness. */
    const few = words < 12;
    /* A frame taller than 2:1 is a phone screenshot or a screen, never a
       photograph to give room to (the judge's pages 10 and 12): three
       columns, as a card would take. */
    const screen = (ratioOf(p) ?? 1) < 0.5;
    const maxSpan = Math.min(widestSpan(paper, p), screen ? 3 : shape === "tall" ? (few ? 4 : 6) : shape === "portrait" ? (few ? 5 : 7) : few ? 8 : 12);
    let placed: ReturnType<typeof place> = null;
    let bestScore = -1;
    for (let span = maxSpan; span >= 3; span -= 1) {
      const candidate = place(paper, p, span, cap);
      if (!candidate) continue;
      const score = sharpness(candidate.dpi) * (0.6 + 0.4 * (span / 12));
      if (score > bestScore) {
        bestScore = score;
        placed = candidate;
      }
    }
    if (!placed) return null;
    placements.push(placed);
    rows = placed.rows;
  }
  let layout: Array<{ heightMm: number; widths: number[] }> | undefined;
  if (usable.length > 1) {
    const width = spanMm(paper, 12);
    const target = usable.length <= 3 ? 52 : 44;
    layout = [];
    for (const row of justify(usable, width, target, 2)) {
      for (const item of row.items) {
        const dpi = ((item.photo.width ?? 640) / item.widthMm) * 25.4;
        placements.push({ photo: item.photo, fit: "contain", dpi });
      }
      layout.push({ heightMm: row.heightMm, widths: row.items.map((it) => it.widthMm) });
      rows += mmToRows(paper, row.heightMm);
    }
  }
  const caption = hasWords(a.body) ? textBlock(ctx, a, 8, words <= NOTE_WORDS ? "note" : "paragraph") : null;
  return { kind: "photo-band", rows: rows + (caption ? caption.rows : 1 + GAP_ROWS), answer: a, photos: placements, caption, layout };
}

/** A photograph beside a column of words: the answer's own first, then the
 *  answers that follow it until the column is as tall as the photograph.
 *  The span is chosen so the photograph is sharp and the column beside it
 *  is neither starved nor left to air. Returns the block and how many of
 *  `following` it took. */
export function photoBeside(ctx: Ctx, a: MagAnswer, photo: MagPhoto, following: MagAnswer[]): { block: Block; took: number } | null {
  const { paper } = ctx;
  const shape = shapeOf(photo);
  const screen = (ratioOf(photo) ?? 1) < 0.5;
  const spans = screen ? [3, 4] : shape === "portrait" || shape === "tall" ? [5, 4, 6, 3, 7] : [7, 6, 8, 5, 4];
  let best: { placement: ReturnType<typeof place>; column: TextBlock[]; span: number; took: number; waste: number } | null = null;
  for (const span of spans) {
    const trial = place(paper, photo, span, 30);
    if (!trial) continue;
    const textSpan = 12 - span;
    const column: TextBlock[] = [];
    let height = 0;
    if (hasWords(a.body)) {
      const own = textBlock(ctx, a, textSpan, wordCount(a.body ?? "") <= NOTE_WORDS ? "note" : wordCount(a.body ?? "") >= ESSAY_WORDS ? "essay" : "paragraph");
      column.push(own);
      height += own.rows;
    } else {
      /* No words: the byline alone, so the photograph is still somebody's. */
      column.push({ kind: "note", answer: a, rows: 1 + GAP_ROWS });
      height += 1 + GAP_ROWS;
    }
    let took = 0;
    for (const next of following) {
      const c = classify(next);
      if (c !== "note" && c !== "paragraph" && c !== "voice") break;
      const t = c === "voice" ? voiceBlock(ctx, next, textSpan) : textBlock(ctx, next, textSpan, c === "note" ? "note" : "paragraph");
      if (height + t.rows > trial.rows + 2) break;
      column.push(t);
      height += t.rows;
      took += 1;
    }
    /* The photograph is then capped at the column's height plus four rows,
       cropped toward its focus inside the budget; a crop over the budget
       keeps the whole photograph and pays for the air (the judge's first
       fix: the size answers to the words, not the other way round). */
    const placement = place(paper, photo, span, Math.max(8, height + 4)) ?? trial;
    const waste = Math.abs(placement.rows - height) + (1 - sharpness(placement.dpi)) * 10;
    if (!best || waste < best.waste) best = { placement, column, span, took, waste };
  }
  if (!best || !best.placement) return null;
  const height = best.column.reduce((n, t) => n + t.rows, 0);
  const rows = Math.max(best.placement.rows, height);
  return {
    block: {
      kind: "photo-text",
      rows,
      answer: a,
      photo: best.placement,
      column: best.column,
      side: shape === "landscape" || shape === "wide" ? "right" : "left",
      photoSpan: best.span,
      air: Math.round((rows - Math.min(best.placement.rows, height)) * 0.5),
    },
    took: best.took,
  };
}

/** Two or three photographs from consecutive short answers in one
 *  justified row, each captioned beneath its own (B17: twelve portraits
 *  with a sentence each are a gallery, not twelve bands). An answer with
 *  two photographs contributes both, captioned under the first. */
/** The narrowest a gallery photograph may be: three columns, so its
 *  caption has a measure (a 24 mm column broke "Practiced" in two). */
export const GALLERY_MIN_MM = 42;

/** A band under twelve words is never taller than this. */
export const BAND_FEW_ROWS = 16;
/** The tallest a gallery row may be: 22 rows. A pair of portraits filling
 *  the width would be 158 mm tall (panel A2: "the largest pictures in the
 *  Edition, for no reason but arithmetic"); at 22 rows they are 66 mm wide
 *  and their words sit beside them in the width left over. */
export const GALLERY_MAX_ROWS = 17;
/** Width left beside a row from which the captions move beside it. */
export const GALLERY_ASIDE_MM = 48;

function galleryBlock(ctx: Ctx, items: Array<{ answer: MagAnswer; photo: MagPhoto; first: boolean }>): Block | null {
  const width = spanMm(ctx.paper, 12);
  const gap = 3;
  const ratios = items.map((it) => ratioOf(it.photo) ?? 1);
  const sum = ratios.reduce((n, r) => n + r, 0);
  /* One row at one height: fill the width, but never taller than the cap,
     and never so wide that any photograph goes soft (the 150 dpi floor,
     per item). */
  let heightMm = (width - gap * (items.length - 1)) / sum;
  heightMm = Math.min(heightMm, GALLERY_MAX_ROWS * ctx.paper.baselineMm);
  for (let i = 0; i < items.length; i += 1) {
    const px = items[i].photo.width ?? 640;
    heightMm = Math.min(heightMm, (px * 25.4) / DPI_FLOOR / ratios[i]);
  }
  if (heightMm < 48) return null;
  const widths = ratios.map((r) => r * heightMm);
  if (widths.some((w) => w < GALLERY_MIN_MM)) return null;
  const rowWidth = widths.reduce((n, w) => n + w, 0) + gap * (items.length - 1);
  const asideMm = width - rowWidth;
  const captionsBeside = asideMm >= GALLERY_ASIDE_MM;
  const captionSpan = captionsBeside ? Math.max(3, Math.floor((asideMm / width) * 12)) : 0;
  const out = items.map((it, i) => {
    const dpi = ((it.photo.width ?? 640) / widths[i]) * 25.4;
    const span = captionsBeside ? captionSpan : Math.max(3, Math.round((widths[i] / width) * 12));
    const caption = it.first && hasWords(it.answer.body) ? textBlock(ctx, it.answer, span, "note") : null;
    return { answer: it.answer, placement: { photo: it.photo, fit: "contain" as const, dpi }, widthMm: widths[i], caption, first: it.first };
  });
  const photoRows = mmToRows(ctx.paper, heightMm);
  if (captionsBeside) {
    const captionRows = out.reduce((n, it) => n + (it.caption?.rows ?? (it.first ? 2 : 0)), 0);
    return { kind: "gallery", rows: Math.max(photoRows, captionRows), heightMm, items: out, captionsBeside: true };
  }
  const captionRows = Math.max(2, ...out.map((it) => it.caption?.rows ?? 2));
  return { kind: "gallery", rows: photoRows + captionRows, heightMm, items: out, captionsBeside: false };
}

/* ── Stories ───────────────────────────────────────────────────────── */

export type Story = {
  question: MagQuestion;
  answers: MagAnswer[];
  classes: AnswerClass[];
  /** The photograph that could open it, if any clears the gate wide. */
  lead: MagPhoto | null;
  leadAnswer: MagAnswer | null;
};

export function storyOf(paper: Paper, q: MagQuestion, excludeLeadsBy: Set<string> = new Set(), excludePhotos: MagPhoto[] = []): Story {
  const answers = q.answers.filter(says);
  const classes = answers.map(classify);
  /* The lead: the sharpest-at-size, most-hearted photograph. Portraits and
     landscapes both qualify; a strip or an unmeasured one never leads. A
     writer who has already supplied their share of leads is passed over
     (G27), so one new phone does not open every story. */
  let lead: MagPhoto | null = null;
  let leadAnswer: MagAnswer | null = null;
  let best = 0;
  for (const a of answers) {
    if (excludeLeadsBy.has(a.author.id)) continue;
    for (const p of a.photos) {
      if (excludePhotos.includes(p)) continue;
      const shape = shapeOf(p);
      if (shape === "strip" || shape === "unknown") continue;
      const span = widestSpan(paper, p);
      if (span < 6) continue;
      const w = span + a.hearts * 0.5 + longEdge(p) / 1920;
      if (w > best) {
        best = w;
        lead = p;
        leadAnswer = a;
      }
    }
  }
  return { question: q, answers, classes, lead, leadAnswer };
}

/** The templates a story may take, by name. */
export type TemplateName = "notes-3" | "notes-2" | "prose" | "prose-lead" | "gallery" | "wall" | "cards" | "vote" | "empty";

/** Photographs at or under this on a photo-wall question are placed as a
 *  photo story, not run as a wall: a wall of one is a stamp with a name. */
export const WALL_FROM_PHOTOS = 4;
/** A story this short in words, with this few answers and no
 *  photographs, is a BRIEF: its question is set small and it never takes a
 *  page of its own. */
export const BRIEF_WORDS = 60;
export const BRIEF_ANSWERS = 3;

export function isBrief(story: Story): boolean {
  const { answers, classes, question: q } = story;
  if (q.kind === "vote" || q.kind === "photo" || answers.length === 0 || answers.length > BRIEF_ANSWERS) return false;
  if (classes.some((c) => c === "photo" || c === "card" || c === "essay")) return false;
  return answers.reduce((n, a) => n + wordCount(a.body ?? ""), 0) <= BRIEF_WORDS;
}

export function templatesFor(story: Story): TemplateName[] {
  const { question: q, answers, classes } = story;
  if (answers.length === 0) return ["empty"];
  if (q.kind === "photo" && answers.reduce((n, a) => n + a.photos.length, 0) >= WALL_FROM_PHOTOS) return ["wall"];
  if (q.kind === "vote") return ["vote"];
  const n = answers.length;
  const notes = classes.filter((c) => c === "note" || c === "card").length / n;
  const cards = classes.filter((c) => c === "card").length / n;
  const photos = classes.filter((c) => c === "photo").length / n;
  const out: TemplateName[] = [];
  /* A songs question, or one that is mostly pasted links, is a playlist:
     cards, and nothing else, so a typed song name sits beside the pasted
     ones as a card with no art rather than as a stray line of notes. */
  if (cards >= 0.5 || q.kind === "songs") return ["cards"];
  if (notes >= NOTES_SHARE && n >= 6) out.push("notes-3", "notes-2");
  out.push("prose");
  if (story.lead) out.push("prose-lead");
  if (photos >= PHOTO_SHARE && story.lead) out.push("gallery");
  return out;
}

/** A story's blocks under one template. The opener comes first; what
 *  follows keeps the answers' own order (the reader's order, which is the
 *  order people wrote in). */
export function compose(ctx: Ctx, story: Story, template: TemplateName, available: Quote[] = ctx.quotes, skipPhotos: MagPhoto[] = []): { blocks: Block[]; refused: MagPhoto[]; usedQuote: Quote | null } {
  const { question: q, answers } = story;
  const refused: MagPhoto[] = [];
  let usedQuote: Quote | null = null;

  if (template === "empty") return { blocks: [], refused, usedQuote };

  /* The deck: one quotable sentence from this story, under the headline,
     from an answer that is not the first (so it previews rather than
     repeats what sits directly beneath). */
  const deckOf = (): string | null => {
    if (answers.length < DECK_MIN_ANSWERS) return null;
    /* The deck obeys the quote rules, the anonymous-question one included
       (panel B7): a preview line must not name who asked. */
    const own = quotesOf(answers.slice(2).map((a) => ({ ...a, anonymousQuestion: q.anonymous })));
    const pick = own.find((qu) => available.some((c) => c.answerId === qu.answerId));
    if (!pick) return null;
    usedQuote = pick;
    return pick.text;
  };

  const brief = isBrief(story);
  const opener = (lead: PhotoPlacement | null, leadSpan: number, deck: string | null): Block => {
    const span = lead ? 12 - leadSpan : 12;
    const chrome = brief ? 1 : OPENER_CHROME_ROWS;
    const headline = brief ? briefRows(ctx, q.text) : headlineRows(ctx, q.text, span);
    const rows = chrome + headline + (deck ? 3 : 0);
    const leadRows = lead ? (lead as PhotoPlacement & { rows: number }).rows : 0;
    return { kind: "opener", rows: Math.max(rows, leadRows), question: q, lead, deck, brief };
  };

  if (template === "wall") {
    const shots: Array<{ photo: MagPhoto; by: MagPerson; first: boolean; answerId: string }> = [];
    for (const a of answers) {
      a.photos.forEach((p, i) => {
        if (widestSpan(ctx.paper, p) >= 2) shots.push({ photo: p, by: a.author, first: i === 0, answerId: a.id });
        else refused.push(p);
      });
    }
    const blocks: Block[] = [opener(null, 0, null)];
    const width = spanMm(ctx.paper, 12);
    const rows = justify(shots.map((s) => s.photo), width, WALL_ROW_MM, WALL_GAP_MM);
    let at = 0;
    /* One wall block per justified row, so the paginator can break between
       rows and never through a photograph. Each row carries 2 rows of names
       under it. */
    for (const r of rows) {
      const items = r.items.map((it) => {
        const s = shots[at++];
        return { placement: { photo: it.photo, fit: "contain" as const, dpi: ((it.photo.width ?? 640) / it.widthMm) * 25.4 }, widthMm: it.widthMm, by: s.by, first: s.first, answerId: s.answerId };
      });
      blocks.push({ kind: "wall", rows: mmToRows(ctx.paper, r.heightMm) + 2, rowsOfPhotos: [{ heightMm: r.heightMm, shots: items }] });
    }
    return { blocks, refused, usedQuote };
  }

  if (template === "vote") {
    const result = q.choices.map((choice) => ({ choice, voters: answers.filter((a) => a.pick === choice.id).map((a) => a.author) }));
    let rows = 0;
    /* A label, the birds two rows a row, and the names under them (a bird
       is nobody on paper, H3), about eight names a line. */
    for (const r of result) rows += 1 + Math.max(1, Math.ceil(r.voters.length / VOTE_BIRDS_PER_ROW)) * 2 + Math.ceil(Math.max(1, r.voters.length) / 8);
    const blocks: Block[] = [opener(null, 0, null), { kind: "vote", rows, question: q, result }];
    const lines = answers.filter((a) => hasWords(a.body));
    if (lines.length) blocks.push(...columnsOf(ctx, lines, 2, skipPhotos, refused));
    return { blocks, refused, usedQuote };
  }

  if (template === "cards") {
    /* Every link a member pasted is a card; an answer with none is a card
       with no art (a song given only as a name). */
    const cards: Array<{ answer: MagAnswer; link: MagLink | null }> = answers.flatMap((a) =>
      a.links.length ? a.links.map((link) => ({ answer: a, link: link as MagLink | null })) : [{ answer: a, link: null }],
    );
    /* One block per row of three, so a playlist of thirty breaks between
       rows rather than being one block taller than a page. */
    const blocks: Block[] = [opener(null, 0, null)];
    for (let i = 0; i < cards.length; i += CARDS_PER_ROW) {
      blocks.push({ kind: "cards", rows: CARD_ROWS, cards: cards.slice(i, i + CARDS_PER_ROW), perRow: CARDS_PER_ROW });
    }
    /* Anyone who wrote more than a card's worth gets their words after. */
    const long = answers.filter((a) => wordCount(a.body ?? "") > NOTE_WORDS);
    if (long.length) blocks.push(...columnsOf(ctx, long, 2, skipPhotos, refused));
    return { blocks, refused, usedQuote };
  }

  if (template === "notes-3" || template === "notes-2") {
    const cols = template === "notes-3" ? 3 : 2;
    const blocks: Block[] = [opener(null, 0, deckOf())];
    blocks.push(...columnsOf(ctx, answers, cols, skipPhotos, refused));
    return { blocks, refused, usedQuote };
  }

  /* prose, prose-lead, gallery */
  let lead: (PhotoPlacement & { rows: number }) | null = null;
  let leadSpan = 0;
  const leadIsWide = template === "gallery";
  if ((template === "prose-lead" || template === "gallery") && story.lead) {
    const shape = shapeOf(story.lead);
    leadSpan = leadIsWide ? 12 : shape === "portrait" || shape === "tall" ? 6 : 7;
    const placed = place(ctx.paper, story.lead, leadSpan, leadIsWide ? 22 : 18);
    if (placed) lead = placed;
    else leadSpan = 0;
  }
  const blocks: Block[] = [];
  let ordered = answers;
  if (lead && leadIsWide) {
    /* Full-width lead above the headline: two blocks so a page break may
       fall between them only if the headline still keeps eight rows. */
    blocks.push({ kind: "photo-band", rows: lead.rows, answer: story.leadAnswer as MagAnswer, photos: [lead], caption: null });
    blocks.push(opener(null, 0, deckOf()));
  } else if (lead && story.leadAnswer) {
    /* The lead under the headline, beside a column the lead's own answer
       starts and the next ones fill: the one reordering the magazine
       allows itself, the lead's answer opening its story (magazine.md 2.5).
       A lead beside the headline itself left twenty rows of air under a
       two-line question. */
    blocks.push(opener(null, 0, deckOf()));
    ordered = [story.leadAnswer, ...answers.filter((a) => a !== story.leadAnswer)];
  } else {
    blocks.push(opener(null, 0, deckOf()));
  }
  const skip = [...skipPhotos, ...(lead && leadIsWide ? [lead.photo] : [])];
  blocks.push(...columnsOf(ctx, ordered, 2, skip, refused, template === "gallery" ? "band" : "beside"));
  return { blocks, refused, usedQuote };
}

/** Answers in order into text columns, with photograph, card and voice
 *  answers as their own blocks between column runs:
 *
 *  - two or three consecutive short photograph answers share a gallery row;
 *  - a lone photograph sits beside a column that its own words start and
 *    the following answers fill (`photoBeside`), which is what stops a tall
 *    photograph leaving half the width as air (his para 21);
 *  - a run of one answer takes a single wide column at eight columns, not
 *    the left half of two (seen on the live Edition three times).
 *
 *  A columns block's `rows` is 0 here: the paginator fills real, balanced
 *  columns of whatever height the page has left. */
function columnsOf(ctx: Ctx, answers: MagAnswer[], cols: number, skip: MagPhoto[], refused: MagPhoto[], photoVariant: "beside" | "band" = "beside"): Block[] {
  const out: Block[] = [];
  let run: TextBlock[] = [];
  const span = Math.floor(12 / cols);
  const flush = () => {
    if (run.length === 1) out.push({ kind: "columns", rows: 0, columns: [run], span: 8 });
    else if (run.length) out.push({ kind: "columns", rows: 0, columns: [run], span });
    run = [];
  };
  const pushCards = (a: MagAnswer) => {
    for (let i = 0; i < a.links.length; i += CARDS_PER_ROW) {
      out.push({ kind: "cards", rows: CARD_ROWS, cards: a.links.slice(i, i + CARDS_PER_ROW).map((link) => ({ answer: a, link })), perRow: CARDS_PER_ROW });
    }
  };
  /* A photo answer's photographs after the lead and the gate. */
  const rest = (a: MagAnswer): MagPhoto[] => usablePhotos(ctx.paper, a, refused).filter((p) => !skip.includes(p) && !lifted.has(p));

  /* Answers already placed inside an earlier block (a gallery, or the
     column beside a photograph), and photographs lifted out of a longer
     answer into a gallery while its words stay in the flow. */
  const gathered = new Set<string>();
  const lifted = new Set<MagPhoto>();
  for (let ai = 0; ai < answers.length; ai += 1) {
    const a = answers[ai];
    if (gathered.has(a.id)) continue;
    const c = classify(a);
    if (c === "empty") continue;
    if (c === "photo") {
      const photos = rest(a);
      if (photos.length === 0) {
        if (hasWords(a.body)) run.push(textBlock(ctx, a, span, wordCount(a.body ?? "") <= NOTE_WORDS ? "note" : "paragraph"));
        else if (a.photos.some((p) => skip.includes(p))) run.push({ kind: "note", answer: a, rows: 1 + GAP_ROWS, aside: "the photograph on the cover" });
        if (a.links.length) {
          flush();
          pushCards(a);
        }
        continue;
      }
      /* A gallery: this and the next short photograph answers, up to three
         photographs in the row, in order. */
      const short = (b: MagAnswer) => classify(b) === "photo" && !b.links.length && wordCount(b.body ?? "") <= NOTE_WORDS * 1.5 && !gathered.has(b.id);
      /* A later answer may lend its photographs to a gallery whatever its
         length: a long one is credited under them and its words stay in
         the flow where they were (a magazine's photo spread). */
      const lends = (b: MagAnswer) => classify(b) === "photo" && !b.links.length && !gathered.has(b.id) && rest(b).length > 0 && rest(b).length <= 2;
      const tryGallery = (pool: number[]): boolean => {
        const items: Array<{ answer: MagAnswer; photo: MagPhoto; first: boolean }> = [];
        const used: number[] = [];
        for (const j of pool) {
          const ps = rest(answers[j]);
          if (ps.length === 0 || ps.length > 2 || items.length + ps.length > 3) continue;
          const long = wordCount(answers[j].body ?? "") > NOTE_WORDS * 1.5;
          /* A long answer's photographs carry its byline, not its words. */
          ps.forEach((p, i) => items.push({ answer: long ? { ...answers[j], body: null } : answers[j], photo: p, first: i === 0 }));
          used.push(j);
          if (items.length >= 3) break;
        }
        if (used.length < 2) return false;
        /* Too narrow for any of them? Try with one fewer. */
        let block = galleryBlock(ctx, items);
        while (!block && used.length > 2) {
          const drop = used.pop()!;
          const keep = items.filter((it) => it.answer.id !== answers[drop].id);
          items.length = 0;
          items.push(...keep);
          block = galleryBlock(ctx, items);
        }
        if (!block) return false;
        /* A gallery that formed around this answer without it does not
           place it; it must be inside. */
        if (!used.includes(ai)) return false;
        flush();
        out.push(block);
        for (const j of used) {
          if (wordCount(answers[j].body ?? "") > NOTE_WORDS * 1.5) for (const p of rest(answers[j])) lifted.add(p);
          else gathered.add(answers[j].id);
        }
        return true;
      };
      if (short(a)) {
        const next: number[] = [];
        for (let j = ai + 1; j < answers.length && next.length < 4; j += 1) {
          if (lends(answers[j])) next.push(j);
        }
        /* Neighbours first; failing that, the story's later photographs,
           gathered here at the first one's place with each one's own words
           as its caption (the one departure from written order, said out
           loud in magazine.md): a lone portrait with four lines beside it
           is otherwise half a page of air. Every pair and trio that includes
           this answer is tried, nearest first, because two landscapes after
           a tall one make a row too short while two portraits further on
           make a good one. */
        const trios: number[][] = [];
        const pairs: number[][] = [];
        for (let x = 0; x < next.length; x += 1) for (let y = x + 1; y < next.length; y += 1) trios.push([ai, next[x], next[y]]);
        for (let x = 0; x < next.length; x += 1) pairs.push([ai, next[x]]);
        /* Rows of three and rows of two take turns, so a story of twelve
           portraits is not a contact sheet (panel A1, C1). */
        const lastGallery = [...out].reverse().find((b) => b.kind === "gallery");
        const pools = lastGallery && lastGallery.kind === "gallery" && lastGallery.items.length === 3 ? [...pairs, ...trios] : [...trios, ...pairs];
        let placed = false;
        for (const pool of pools) if (tryGallery(pool)) { placed = true; break; }
        if (placed) continue;
      }
      /* One photograph: beside a column of words, when there are words to
         put beside it (its own, or the answers that follow). */
      if (photos.length === 1 && photoVariant === "beside") {
        const beside = photoBeside(ctx, a, photos[0], answers.slice(ai + 1).filter((b) => !gathered.has(b.id)));
        if (beside && (beside.took > 0 || wordCount(a.body ?? "") >= 12)) {
          flush();
          out.push(beside.block);
          if (a.links.length) pushCards(a);
          /* The answers it took are the next `took` un-gathered ones. */
          let taken = 0;
          for (let j = ai + 1; j < answers.length && taken < beside.took; j += 1) {
            if (gathered.has(answers[j].id)) continue;
            gathered.add(answers[j].id);
            taken += 1;
          }
          continue;
        }
      }
      flush();
      const band = photoBand(ctx, { ...a, photos }, photos);
      if (band) out.push(band);
      if (a.links.length) pushCards(a);
      continue;
    }
    if (c === "card") {
      flush();
      pushCards(a);
      continue;
    }
    if (c === "voice") {
      run.push(voiceBlock(ctx, a, span));
      continue;
    }
    if (c === "essay") {
      flush();
      const t = textBlock(ctx, a, 8, "essay");
      out.push({ kind: "essay", rows: t.rows, text: t, aside: null });
      continue;
    }
    run.push(textBlock(ctx, a, span, c === "note" ? "note" : "paragraph"));
    if (a.links.length > 0) {
      flush();
      pushCards(a);
    }
  }
  flush();
  return out;
}

/** The estimate every text block was cast with, exposed so a renderer can
 *  compare it with what it drew. */
export { estimateLines, ratioOf };

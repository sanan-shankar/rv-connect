/* ------------------------------------------------------------------ *
 *  The engine: an Edition in, pages out.
 *
 *  Candidate generation plus a weighted score, the shape prior-art
 *  section 4 recommended and the reason it gave: it "turns a hundred
 *  things that could go wrong into a hundred scoring terms rather than a
 *  hundred nested branches". Each story (a question and its answers) may
 *  take a few templates; the search walks the stories in order and keeps
 *  the best few partial magazines at each step (a beam), so eleven stories
 *  with four templates each cost a few hundred paginations, not four
 *  million. Nothing is random and ties fall to template order, so the
 *  same Edition lays out the same way every time on every machine.
 *
 *  Around the stories: a cover, a contents page when there are enough
 *  questions to want one, and a back page of everyone who wrote.
 * ------------------------------------------------------------------ */

import { compose, storyOf, templatesFor, type Ctx, type Story, type TemplateName } from "./grammar.ts";
import { coverLine, estimateLines, quotesOf, says, type LineMeasurer, type Quote } from "./measure.ts";
import { cropWithin, dpiAt, longEdge, shapeOf, widestSpan, DPI_FLOOR } from "./image.ts";
import { closePage, emptyLayout, layAtomic, layBack, layStory, type Layout } from "./paginate.ts";
import { scoreAll } from "./score.ts";
import { A4, rowsPerPage, textWidthMm, type Block, type MagAnswer, type MagPerson, type MagPhoto, type MagQuestion, type Magazine, type MagazineSource, type Page, type Paper, type PhotoPlacement } from "./types.ts";

/** A contents page is worth a page from this many questions... */
export const CONTENTS_FROM = 6;
/** ...spread over at least this many pages of stories. */
export const CONTENTS_FROM_PAGES = 4;
/** Cover lines: this many questions, the most answered first. */
export const COVER_LINES = 3;
/** How many stories a writer may open with their photograph, as a share. */
export const LEAD_SHARE = 1 / 3;
/** Pull quotes available to the whole Edition: one per two stories, plus
 *  one, so a gap is filled by a quote only about as often as a magazine
 *  would (G9). None at all in a time capsule (H18). */
export function quoteBudget(stories: number): number {
  return Math.floor(stories / 2) + 1;
}
/** Beam width: partial magazines kept per story. */
export const BEAM = 6;

export type LayoutOptions = {
  paper?: Paper;
  measure?: LineMeasurer;
};

/* ── The cover ─────────────────────────────────────────────────────── */

/** The one photograph that may carry the cover, if any clears the gate
 *  at cover size: sharp at the full page or at a band across it, inside
 *  the crop budget, from an answer that is still somebody's. */
function coverLead(paper: Paper, source: MagazineSource): { placement: PhotoPlacement; bleed: "full" | "band"; by: MagPerson } | null {
  const answers = source.questions.flatMap((q) => q.answers.filter(says));
  let best: { placement: PhotoPlacement; bleed: "full" | "band"; by: MagPerson; w: number } | null = null;
  for (const a of answers) {
    if (a.author.gone) continue;
    for (const p of a.photos) {
      const shape = shapeOf(p);
      if (shape === "unknown" || shape === "strip") continue;
      const full = dpiAt(p, paper.widthMm, paper.heightMm);
      const bandH = paper.heightMm * 0.62;
      const band = dpiAt(p, paper.widthMm, bandH);
      let pick: { bleed: "full" | "band"; dpi: number } | null = null;
      if ((shape === "portrait" || shape === "tall") && full >= DPI_FLOOR && cropWithin(p, paper.widthMm, paper.heightMm)) pick = { bleed: "full", dpi: full };
      else if (band >= DPI_FLOOR && cropWithin(p, paper.widthMm, bandH)) pick = { bleed: "band", dpi: band };
      if (!pick) continue;
      const w = (pick.bleed === "full" ? 2 : 1) + a.hearts * 0.4 + longEdge(p) / 1920 + pick.dpi / DPI_FLOOR;
      if (!best || w > best.w) best = { placement: { photo: p, fit: "cover", dpi: pick.dpi }, bleed: pick.bleed, by: a.author, w };
    }
  }
  return best;
}

/** Rows a contents block takes: a heading, then each entry at 11pt
 *  Baskerville across the text area less the number, measured. */
function contentsRows(paper: Paper, measure: LineMeasurer, questions: MagQuestion[]): number {
  const perPage = rowsPerPage(paper);
  const cols = questions.length > 14 ? 2 : 1;
  const width = (textWidthMm(paper) - 12) / cols;
  const rowsPerLine = (11 * 1.25) / (paper.baselineMm * (72 / 25.4));
  let rows = 0;
  for (const q of questions) rows += Math.max(1, measure(q.text, width, { pt: 11, face: "heading" })) * rowsPerLine + 0.4;
  return Math.min(perPage, 4 + Math.ceil(rows / cols));
}

function coverBlock(paper: Paper, source: MagazineSource): Block {
  const lead = coverLead(paper, source);
  /* Cover lines: the most-answered questions, ties by hearts; never a
     photo-wall question, which is an instruction ("Add a photo from..."),
     not something to read on a cover (panel A2). */
  const byAnswers = [...source.questions].filter((q) => q.kind !== "photo" && q.answers.some(says)).sort((a, b) => b.answers.length - a.answers.length || heartsOf(b) - heartsOf(a));
  const lines = byAnswers.slice(0, COVER_LINES).map((q) => coverLine(q.text));
  if (lead) {
    /* The name goes where the face is not (G29). */
    const textAt = lead.placement.photo.focalY < 0.55 ? "bottom" : "top";
    return { kind: "cover", rows: rowsPerPage(paper), lead: lead.placement, bleed: lead.bleed, textAt, lines, credit: lead.by };
  }
  if (source.picture) {
    /* The Catch-up's own landscape photograph as a band: at 1920 across
       the text width it is sharp, and it is the picture members already
       know this Catch-up by. */
    return { kind: "cover", rows: rowsPerPage(paper), lead: null, bleed: "band", textAt: "bottom", lines, credit: null };
  }
  return { kind: "cover", rows: rowsPerPage(paper), lead: null, bleed: "none", textAt: "top", lines, credit: null };
}

function heartsOf(q: { answers: MagAnswer[] }): number {
  return q.answers.reduce((n, a) => n + a.hearts, 0);
}

/* ── The search ────────────────────────────────────────────────────── */

type State = { layout: Layout; choices: Record<string, string>; score: number; notes: string[] };

function cloneLayout(l: Layout): Layout {
  return {
    pages: l.pages.map((p) => ({ ...p, blocks: [...p.blocks], score: { ...p.score } })),
    used: l.used,
    onPage: new Set(l.onPage),
    quotesLeft: [...l.quotesLeft],
  };
}

export function layoutMagazine(source: MagazineSource, options: LayoutOptions = {}): Magazine {
  const paper = options.paper ?? A4;
  const measure = options.measure ?? estimateLines;
  const notes: string[] = [];

  /* Stories, in the Edition's order; leads rationed per writer. */
  const leadsBy = new Map<string, number>();
  const maxLeads = Math.max(1, Math.ceil(source.questions.length * LEAD_SHARE));
  /* The cover's photograph is not printed again inside (B24, G28). */
  const cover = coverBlock(paper, source);
  const coverPhoto = cover.kind === "cover" && cover.lead ? [cover.lead.photo] : [];
  const stories: Story[] = [];
  for (const q of source.questions) {
    const blocked = new Set([...leadsBy.entries()].filter(([, n]) => n >= maxLeads).map(([id]) => id));
    const s = storyOf(paper, q, blocked, coverPhoto);
    if (s.leadAnswer) leadsBy.set(s.leadAnswer.author.id, (leadsBy.get(s.leadAnswer.author.id) ?? 0) + 1);
    stories.push(s);
  }
  const answered = stories.filter((s) => s.answers.length > 0);
  const alsoAsked = stories.filter((s) => s.answers.length === 0).map((s) => s.question.text);
  if (alsoAsked.length) notes.push(`${alsoAsked.length} question(s) nobody answered go to the back page as "Also asked".`);

  /* Quotes: from the whole Edition, best first, rationed; none in a capsule. */
  const quotable = answered.flatMap((s) => s.answers.map((a) => ({ ...a, anonymousQuestion: s.question.anonymous })));
  const quotes: Quote[] = source.sealedAt ? [] : quotesOf(quotable).slice(0, quoteBudget(answered.length));
  const ctx: Ctx = { paper, measure, quotes };

  /* Who wrote, in order of first appearance, for the back page. Someone
     whose account is gone is still named: their words are on the pages. */
  const writers: MagPerson[] = [];
  const seen = new Set<string>();
  for (const s of answered) for (const a of s.answers) if (!seen.has(a.author.id)) { seen.add(a.author.id); writers.push(a.author); }

  /* Nobody wrote in: a cover and a back page, and a note the mailer must
     read before sending anything (A7, D12). */
  if (answered.length === 0) {
    const l = emptyLayout([]);
    layAtomic(l, paper, cover);
    closePage(l);
    layBack(l, paper, [], alsoAsked);
    const score = scoreAll(paper, l.pages);
    notes.push("Nobody wrote in: this Edition has a cover and a back page and nothing to send.");
    return { paper, source, pages: l.pages, score, choices: {}, notes };
  }

  /* The front matter is fixed; the search is over the stories. A contents
     page is worth having only when there are enough questions AND enough
     pages to find them in (A6): eight one-line answers list nothing. So
     the stories are laid once without one, and again with one if they
     ran to CONTENTS_FROM_PAGES or more. */
  const search = (wantsContents: boolean): State => {
    const front = emptyLayout(quotes);
    layAtomic(front, paper, cover);
    closePage(front);
    /* The contents is a block, not a page: the first story runs on under
       it when the rules let a story run on (the live Edition's eleven
       entries left three quarters of a page empty as a page of their own). */
    if (wantsContents) layAtomic(front, paper, { kind: "contents", rows: contentsRows(paper, measure, answered.map((s) => s.question)), entries: [] });
    return runBeam(front);
  };

  const runBeam = (front: Layout): State => {
  let beam: State[] = [{ layout: front, choices: {}, score: 0, notes: [] }];
  for (const story of answered) {
    const next: State[] = [];
    const templates = templatesFor(story);
    for (const state of beam) {
      for (const t of templates) {
        const layout = cloneLayout(state.layout);
        const composed = compose(ctx, story, t, layout.quotesLeft, coverPhoto);
        /* A story that spent a deck quote takes it out of the gap pool. */
        if (composed.usedQuote) layout.quotesLeft = layout.quotesLeft.filter((q) => q.answerId !== composed.usedQuote!.answerId);
        layStory(layout, paper, composed.blocks, { allowRunOn: true });
        const score = scoreAll(paper, layout.pages);
        const stateNotes = composed.refused.length ? [...state.notes, `${composed.refused.length} photograph(s) under "${story.question.text.slice(0, 40)}" too small to print at any size and left out.`] : state.notes;
        next.push({ layout, choices: { ...state.choices, [story.question.id]: t }, score, notes: stateNotes });
      }
    }
    /* Stable: equal scores keep template order, so a refactor that reorders
       templates changes layouts and a test catches it, rather than the
       clock (G12, G13). */
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, BEAM);
  }
  return beam[0];
  };

  let best = search(false);
  let wantsContents = false;
  if (answered.length >= CONTENTS_FROM && best.layout.pages.length - 1 >= CONTENTS_FROM_PAGES) {
    wantsContents = true;
    best = search(true);
  }
  layBack(best.layout, paper, writers, alsoAsked);
  const pages = best.layout.pages;

  /* Contents, filled in once the page numbers are known (D26, G33). The
     contents page is always exactly one page, so numbers settle in one
     pass. */
  if (wantsContents) {
    const contents = pages[1].blocks[0];
    if (contents.kind === "contents") {
      /* The contents may share its page with the first story, whose opener
         then sits on page 2 as well; the number is still the page. */
      contents.entries = answered.map((s) => ({ question: s.question, page: pages.find((p) => p.blocks.some((b) => b.kind === "opener" && b.question.id === s.question.id))?.number ?? 0 }));
    }
  }

  const score = scoreAll(paper, pages);
  const out: Magazine = { paper, source, pages, score, choices: best.choices, notes: [...notes, ...new Set(best.notes)] };
  runChecks(out);
  return out;
}

/* ── Invariants the engine checks on its own output ────────────────── */

/** The things a page must never do, checked after every layout so a
 *  rule that regresses shows up in the notes rather than on paper. The
 *  test suite asserts these notes are empty for the whole corpus. */
export function runChecks(m: Magazine): void {
  const perPage = rowsPerPage(m.paper);
  const seenPhotos = new Set<string>();
  const seenAnswers = new Map<string, number>();
  for (const p of m.pages) {
    if (p.used > perPage) m.notes.push(`CHECK page ${p.number} overflows: ${p.used} of ${perPage} rows`);
    for (const b of p.blocks) {
      for (const { placement: pl, owner } of placementsOf(b)) {
        if (pl.dpi < DPI_FLOOR - 0.5 && b.kind !== "wall") m.notes.push(`CHECK page ${p.number}: a photograph printed at ${Math.round(pl.dpi)} dpi`);
        /* The same photograph of the same answer twice is a fault; two
           answers sharing a file (a fixture, or a batch photo two people
           both posted) is not one the engine can settle. */
        const key = `${owner}:${pl.photo.src}`;
        if (seenPhotos.has(key) && b.kind !== "cover") m.notes.push(`CHECK page ${p.number}: photograph printed twice (${key.slice(-24)})`);
        seenPhotos.add(key);
      }
      if (b.kind === "columns") for (const col of b.columns) for (const t of col) seenAnswers.set(t.answer.id, (seenAnswers.get(t.answer.id) ?? 0) + 1);
      if (b.kind === "photo-text") for (const t of b.column) seenAnswers.set(t.answer.id, (seenAnswers.get(t.answer.id) ?? 0) + 1);
      if (b.kind === "opener" && p.blocks[p.blocks.length - 1] === b && p.number < m.pages.length) m.notes.push(`CHECK page ${p.number} ends on a headline`);
    }
  }
  for (const [id, n] of seenAnswers) if (n > 1) m.notes.push(`CHECK answer ${id} printed ${n} times`);
}

function placementsOf(b: Block): Array<{ placement: PhotoPlacement; owner: string }> {
  switch (b.kind) {
    case "cover":
      return b.lead ? [{ placement: b.lead, owner: "cover" }] : [];
    case "opener":
      return b.lead ? [{ placement: b.lead, owner: `lead:${b.question.id}` }] : [];
    case "photo-text":
      return [{ placement: b.photo, owner: b.answer.id }];
    case "photo-band":
      return b.photos.map((placement) => ({ placement, owner: b.answer.id }));
    case "wall":
      return b.rowsOfPhotos.flatMap((r) => r.shots.map((s) => ({ placement: s.placement, owner: s.answerId })));
    case "gallery":
      return b.items.map((it) => ({ placement: it.placement, owner: it.answer.id }));
    default:
      return [];
  }
}

/** Every photograph, link, recording and body in the source that reached a
 *  page, against every one that should have (G30). Returns what is missing. */
export function missingFrom(m: Magazine): string[] {
  const printedAnswers = new Set<string>();
  const printedPhotos = new Set<string>();
  const printedLinks = new Set<string>();
  for (const p of m.pages) for (const b of p.blocks) {
    for (const { placement } of placementsOf(b)) printedPhotos.add(placement.photo.src);
    switch (b.kind) {
      case "opener":
        /* A lead is somebody's answer, printed beside the headline. */
        if (b.lead) for (const a of b.question.answers) if (a.photos.includes(b.lead.photo)) printedAnswers.add(a.id);
        break;
      case "columns": b.columns.flat().forEach((t) => printedAnswers.add(t.answer.id)); break;
      case "essay": printedAnswers.add(b.text.answer.id); break;
      case "photo-text": printedAnswers.add(b.answer.id); b.column.forEach((t) => printedAnswers.add(t.answer.id)); break;
      case "photo-band": printedAnswers.add(b.answer.id); break;
      case "gallery": b.items.forEach((it) => printedAnswers.add(it.answer.id)); break;
      case "cards": b.cards.forEach((c) => { printedAnswers.add(c.answer.id); if (c.link) printedLinks.add(c.link.url); }); break;
      case "vote": b.result.forEach((r) => r.voters.forEach((v) => printedAnswers.add(`vote:${v.id}`))); break;
      case "wall": b.rowsOfPhotos.forEach((r) => r.shots.forEach((s) => printedAnswers.add(`wall:${s.by.id}`))); break;
      default: break;
    }
  }
  const missing: string[] = [];
  const refused = new Set(m.notes.filter((n) => n.includes("too small")).length ? ["*"] : []);
  for (const q of m.source.questions) for (const a of q.answers) {
    if (!says(a)) continue;
    /* A photo-wall answer may have been run on the wall or, under
       WALL_FROM_PHOTOS, placed as an ordinary photograph. */
    const printed = q.kind === "vote" ? printedAnswers.has(`vote:${a.author.id}`) : q.kind === "photo" ? printedAnswers.has(`wall:${a.author.id}`) || printedAnswers.has(a.id) : printedAnswers.has(a.id);
    if (!printed && !(q.kind === "photo" && a.photos.length === 0) && !(q.kind === "vote" && a.pick === null)) missing.push(`answer ${a.id} by ${a.author.name} under "${q.text.slice(0, 30)}"`);
    for (const p of a.photos) if (!printedPhotos.has(p.src) && !refused.has("*") && widestSpan(m.paper, p) >= 3) missing.push(`photo ${p.src.slice(-30)} of ${a.author.name}`);
    for (const l of a.links) if (!printedLinks.has(l.url) && q.kind !== "vote") missing.push(`link ${l.url.slice(0, 40)} of ${a.author.name}`);
  }
  return missing;
}

export { A4, textWidthMm, rowsPerPage };
export type { Magazine, MagazineSource, Page, Block, MagPhoto, TemplateName };

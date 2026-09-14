/* ------------------------------------------------------------------ *
 *  The magazine: what goes in, what comes out.
 *
 *  A published Edition, laid out as a sequence of portrait pages by rules
 *  rather than by hand. His ask, brief para 21: "the output for each
 *  catch-up, irrespective of the content, should be as if we shipped all
 *  the content to someone at, I don't know, Vogue, and had their graphic
 *  designer, and I'm the lead editor, lay it out in this wonderful-looking
 *  thing. And it should just work, right?" And para 51: "the magazine
 *  (which by the way should be in portrait not landscape)".
 *
 *  Nothing in this folder touches the DOM or the database. The whole engine
 *  is a pure function from a `MagazineSource` and a `Paper` to a
 *  `Magazine`, so every rule in it is testable from a node script against
 *  the corpus in `src/app/lab/catchups/_fixtures/magazine/`. A renderer
 *  (the lab room, later the app) only draws what the engine decided.
 *
 *  The design, the reasons and the roads not taken are in
 *  docs/planning/catchups-rework/magazine.md. Comments here say what a
 *  number is for, not why the grammar is shaped the way it is.
 * ------------------------------------------------------------------ */

/* ─── What goes in ─────────────────────────────────────────────────── */

export type MagPerson = {
  id: string;
  name: string;
  photoUrl: string | null;
  birdOverride: string | null;
  /** True when the account is gone: the answer stays, the name is what the
   *  export kept, and nothing links to a profile. */
  gone?: boolean;
  /** A second line under the name, set by the loader ONLY when two writers
   *  in one Edition share a name ("Batch of 1998"), so two bylines never
   *  read as one person answering twice. Never otherwise: the reader
   *  prints no batch line and neither does the magazine. */
  line2?: string | null;
};

export type MagPhoto = {
  src: string;
  /** Pixels, as stored (long edge at most 1920). Null when never measured,
   *  which the image rules treat as the smallest thing it could be. */
  width: number | null;
  height: number | null;
  /** 0..1 from the left and the top; 0.5 when unknown. */
  focalX: number;
  focalY: number;
  blurDataUrl: string | null;
};

export type MagLink = {
  kind: "spotify" | "youtube" | "link";
  url: string;
  title: string;
  subtitle: string | null;
  thumbUrl: string | null;
};

export type MagAnswer = {
  id: string;
  author: MagPerson;
  /** The composer's wire format with the card links already taken out
   *  (bold, italic, mentions kept). Null or blank means the words are
   *  nothing; a photograph, a link, a recording or a vote may still be the
   *  answer. */
  body: string | null;
  photos: MagPhoto[];
  links: MagLink[];
  /** A recorded answer: how long, and whether `body` is its transcript. */
  audio: { seconds: number | null; url: string } | null;
  /** A vote's pick: the id of one of its question's choices. */
  pick: string | null;
  hearts: number;
};

export type MagQuestion = {
  id: string;
  text: string;
  kind: "text" | "photo" | "songs" | "vote";
  /** The name to print after "Asked by", or null. The same rule the reader
   *  applies: only a member-written question names its asker, and only when
   *  they let it. `anonymous` is true when someone asked and chose not to be
   *  named, so the page can say so rather than print nothing. */
  askedBy: string | null;
  anonymous: boolean;
  choices: Array<{ id: string; text: string }>;
  answers: MagAnswer[];
};

export type MagazineSource = {
  /** The Catch-up's name, as typed. Never case-transformed on a page. */
  catchupName: string;
  /** ISO. The Edition's name is this date, in the valley's time zone. */
  publishedAt: string;
  /** The Catch-up's own photograph and its focus, for a cover with no
   *  photograph of its own worth the space. */
  picture: { src: string; focus: string } | null;
  /** Set on a time capsule that has opened. */
  sealedAt: string | null;
  questions: MagQuestion[];
};

/* ─── The paper ────────────────────────────────────────────────────── */

export type Paper = {
  name: string;
  widthMm: number;
  heightMm: number;
  margin: { top: number; right: number; bottom: number; left: number };
  /** Grid columns across the text area, and the gutter between them. */
  columns: number;
  gutterMm: number;
  /** One row of the baseline grid. Every block is a whole number of rows. */
  baselineMm: number;
  /** Body type, for the line estimate: points and average glyph advance as
   *  a fraction of the em, measured for Source Sans 3. */
  bodyPt: number;
  bodyAdvance: number;
};

/** A4 portrait. 12 columns of 11.5mm with 4mm gutters make a 182mm text
 *  area; a 6-column span is 89mm, which sets Source Sans 3 at 10.5pt to
 *  about 49 characters a line. Baseline 5.3mm is 15pt, the body leading, so
 *  a page holds 49 rows. */
export const A4: Paper = {
  name: "A4",
  widthMm: 210,
  heightMm: 297,
  margin: { top: 16, right: 14, bottom: 18, left: 14 },
  columns: 12,
  gutterMm: 4,
  baselineMm: 5.3,
  bodyPt: 10.5,
  bodyAdvance: 0.48,
};

export function textWidthMm(paper: Paper): number {
  return paper.widthMm - paper.margin.left - paper.margin.right;
}
export function textHeightMm(paper: Paper): number {
  return paper.heightMm - paper.margin.top - paper.margin.bottom;
}
export function rowsPerPage(paper: Paper): number {
  return Math.floor(textHeightMm(paper) / paper.baselineMm);
}
export function columnUnitMm(paper: Paper): number {
  return (textWidthMm(paper) - (paper.columns - 1) * paper.gutterMm) / paper.columns;
}
/** The width of `span` columns, gutters included. */
export function spanMm(paper: Paper, span: number): number {
  return span * columnUnitMm(paper) + (span - 1) * paper.gutterMm;
}
export function mmToRows(paper: Paper, mm: number): number {
  return Math.ceil(mm / paper.baselineMm);
}

/* ─── What comes out ───────────────────────────────────────────────── */

/** How a photograph sits in its slot. `contain` shows the whole thing at
 *  its own proportions; `cover` fills the slot and crops toward the focal
 *  point, never more than `CROP_BUDGET` of either axis. */
export type PhotoPlacement = {
  photo: MagPhoto;
  fit: "contain" | "cover";
  /** Effective dots per inch at the printed width, for the room to show. */
  dpi: number;
};

export type TextBlock = {
  kind: "note" | "paragraph" | "essay" | "transcript";
  answer: MagAnswer;
  /** Rows the engine gave it, byline included. */
  rows: number;
  /** True when this is the continuation of an essay split from the page
   *  before; the byline is not repeated, a running mark is. */
  continued?: boolean;
  /** For a split essay: the character range of `body` on this page. */
  slice?: [number, number];
  /** A line printed after the name in place of words: "the photograph on
   *  the cover", for an answer whose only photograph went there. */
  aside?: string;
};

export type Block =
  | {
      kind: "cover";
      rows: number;
      lead: PhotoPlacement | null;
      /** How the lead sits: the whole page, or a band above the name. */
      bleed: "full" | "band" | "none";
      /** Where the name goes so it never crosses the photograph's focus. */
      textAt: "top" | "bottom";
      /** The cover lines: questions, never answers. */
      lines: string[];
      /** The lead's writer, credited on the cover's foot. */
      credit: MagPerson | null;
    }
  | { kind: "contents"; rows: number; entries: Array<{ question: MagQuestion; page: number }> }
  | {
      kind: "opener";
      rows: number;
      question: MagQuestion;
      lead: PhotoPlacement | null;
      deck: string | null;
      /** A short story's question, set small and never given a page. */
      brief?: boolean;
    }
  | { kind: "columns"; rows: number; columns: TextBlock[][]; span: number }
  | { kind: "essay"; rows: number; text: TextBlock; aside: { quote: string; by: string } | null }
  | {
      kind: "photo-text";
      rows: number;
      answer: MagAnswer;
      photo: PhotoPlacement;
      /** The photograph's own words first, then the answers that follow it,
       *  as one column beside the photograph until its height is used: the
       *  image on one side and the words on the other (brief para 21). */
      column: TextBlock[];
      side: "left" | "right";
      photoSpan: number;
      /** Rows of paper beside the shorter of the two, which the fill score
       *  counts as empty rather than used. */
      air: number;
    }
  | {
      kind: "photo-band";
      rows: number;
      answer: MagAnswer;
      photos: PhotoPlacement[];
      caption: TextBlock | null;
      /** For two or more: the justified rows, each photograph's width at the
       *  row's height, so the renderer draws what the engine measured. */
      layout?: Array<{ heightMm: number; widths: number[] }>;
    }
  | { kind: "wall"; rows: number; rowsOfPhotos: Array<{ heightMm: number; shots: Array<{ placement: PhotoPlacement; widthMm: number; by: MagPerson; first: boolean; answerId: string }> }> }
  /** Two or three short photograph answers sharing one justified row, each
   *  with its run-in byline and words beneath its own photograph. */
  | {
      kind: "gallery";
      rows: number;
      heightMm: number;
      items: Array<{ answer: MagAnswer; placement: PhotoPlacement; widthMm: number; caption: TextBlock | null; first: boolean }>;
      /** A row narrower than the page puts its words in the width beside
       *  it rather than beneath each photograph. */
      captionsBeside: boolean;
    }
  /** The contents as a block rather than a page, so the first story may
   *  run on beneath it. */
  | { kind: "cards"; rows: number; cards: Array<{ answer: MagAnswer; link: MagLink | null }>; perRow: number }
  | { kind: "vote"; rows: number; question: MagQuestion; result: Array<{ choice: { id: string; text: string }; voters: MagPerson[] }> }
  | { kind: "quote"; rows: number; text: string; by: string; answerId: string }
  | { kind: "contributors"; rows: number; people: MagPerson[]; alsoAsked: string[]; perRow: number }
  | { kind: "space"; rows: number };

export type Page = {
  number: number;
  blocks: Block[];
  /** Rows used of `rowsPerPage`. */
  used: number;
  /** A short signature of the page's shape, for the variety rule. */
  signature: string;
  /** The question this page is inside, for the folio; null on the cover,
   *  the contents and the back page. */
  running: string | null;
  score: PageScore;
};

export type PageScore = {
  fill: number;
  image: number;
  variety: number;
  coherence: number;
  total: number;
};

export type Magazine = {
  paper: Paper;
  source: MagazineSource;
  pages: Page[];
  /** The sum of every page's score, which is what the search maximised. */
  score: number;
  /** Which template each story took, by question id, for the room to say. */
  choices: Record<string, string>;
  /** Anything the engine had to decide against the content and wants a
   *  person to know: a photograph too small for any slot, a question
   *  nobody answered, a name it could not set. */
  notes: string[];
};

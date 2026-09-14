# The magazine: a published Edition laid out by rules

**M1 of the Catch-ups rework, 2026-09-14.** The design of the layout engine, not of a page. What
is here: the page model, the grammar as testable rules, type and image at print sizes, the
failure list with a bypass for each, what the grammar panel broke and how the rules changed,
the feasibility spike's measurements and the pipeline recommendation, and M2+ as phases. The
engine itself is `src/lib/magazine/` (pure, no DOM, no database), its corpus is
`src/app/lab/catchups/_fixtures/magazine/`, its test is `src/lib/magazine/magazine.test.mjs`,
the room is `/lab/catchups/magazine`, and the printer is `scripts/dev/print-magazine.mjs`.

**Read his words first.** `brief.md` ¶21, ¶30, ¶31 and ¶51. Every rule below answers to one of
them, and a rule that does not is a rule this file should not have. The three sentences that
bind most tightly:

> "the output for each catch-up, irrespective of the content, should be as if we shipped all the
> content to someone at, I don't know, Vogue, and had their graphic designer, and I'm the lead
> editor, lay it out in this wonderful-looking thing. And it should just work, right?" (¶21)

> "so that we don't have blown-out-of-proportion images or tons of white space or something like
> that. It would not incorporate the comment section." (¶21)

> "the magazine (which by the way should be in portrait not landscape)" (¶51)

Two of his hedges travel with every phase after this one: a navigable PDF is *"not that
important"* (¶21), and emailing everyone happens only *"if we can do an amazing job for this"*
(¶21). The second is the gate M2+ has to clear before anyone wires Resend, which is parked in
any case (`features.md` §1: it needs a paid plan).

**What it must feel like, and must not resemble.** "Beautiful" is not the bar (CLAUDE.md). The
bar is his two questions: does it give any dopamine, and can you tell it belongs to this app
while looking like nothing already in it. Named: it should feel like *a small-press quarterly
made for these thirteen people this month*, the field-journal register the design system already
names (Appendix A: naturalist, contemplative, hand-loom, study under trees). It must not resemble
the feed printed out, a Letterloop email, a Canva template with stock geometry, or a photo book
with a caption under everything. What says "this app" without a logo: the reader's short cinnamon
mark above every question, the birds as the recurring mark (prior-art §4 named this: "sized by
slot, they give each page a visual rhythm"), warm paper and never white, Libre Baskerville for a
question and Source Sans 3 for everything read at length.

Decisions are marked **LOCKED** (his), **RECOMMENDED** (mine, with reasons; a later session may do
better and must say so) or **OPEN** (nobody's yet). Every RECOMMENDED decision carries what was
considered and not taken.

---

## 1. The page model

**LOCKED**: portrait (¶51, D29). **LOCKED**: no comments (¶21). **LOCKED**: no Edition numbers
anywhere a member reads (`docs/spec/catchups.md`); an Edition is named by its date.

**RECOMMENDED: A4, 210 x 297 mm.** India prints A4; a PDF emailed to a member in the United
States opens the same on a screen, and a home printer there scales it by 6%, which is the one
place Letter would have won. *Considered and not taken*: US Letter (wrong side of the world);
a custom "digital" page in 3:4 to fit a phone better (then nobody can print it, and a PDF that
is not a paper size reads as a slide deck); B5 (a real magazine trim, but every home printer
would letterbox it).

**RECOMMENDED: the on-screen magazine is the same pages, at true size, never re-flowed.** The
room draws A4 at 210 mm on any screen (campaign finding F34: nothing in a room is scaled). In
the app, M2 shows the pages fit-to-height on a laptop (about 87% on a 13-inch, so 10.5pt body
reads at about 12.5px) and offers the PDF itself on a phone, where the reader already exists and
is the better surface; a page at fit-to-width on a 390px phone is 46% size and unreadable
(finder D40), and that is not a fault to fix with a second layout. *Considered and not taken*:
a continuous portrait scroll built from the same blocks with the page breaks removed (loses the
thing he asked for, which is pages; and "see page 12" stops meaning anything); a phone-shaped
paper run through the same grammar (the engine takes `Paper` as an input precisely so this stays
possible, but it doubles the surface to judge and the PDF is the artefact he asked for; it is a
later phase if he wants it, not a redesign).

**The grid.** 12 columns across a 182 mm text area (margins 16 top, 14 outer, 18 bottom for the
folio), 11.5 mm columns with 4 mm gutters, so a 6-column span is 89 mm and an 8-column span is
120 mm. A baseline row is **5.3 mm (15pt)**, the body leading; every block is a whole number of
rows and a page holds **49**. Photographs sit on the grid too; a photograph's height is rounded up
to rows, so the paper under it is on the grid and the next block lands on a baseline. *Considered
and not taken*: Apple News Format's 20 columns (more resolution than 182 mm needs; the finest
thing placed is a 3-column photograph at 42 mm); a 6-column grid (cannot express a 5:7 split,
which the photo-beside-text block wants for a portrait); no baseline grid (then a page of mixed
blocks has no rhythm, which is the flat look the rooms were criticised for).

**Page furniture.** A folio on every page but the cover: the Catch-up's name and the date at the
left, the page number at the right, and between them the question the page starts in (the
running question; the first story on a page sets it and a story that only ends there does not,
finder round 3 no. 12). The cover carries the Catch-up's name **as typed** (never
case-transformed: "in the loop" stays lowercase, E37, H33), the date, an eyebrow "A Catch-up",
and three cover lines which are **questions, never answers** (H13, H14, H15: an answer lifted
onto a cover with no question above it can read as arson or grief). The back page is everyone
who wrote, as birds and names, the questions nobody answered as "Also asked", and one colophon
line that says what a Catch-up is (H1: a forwarded file has no context) and where it was made.

---

## 2. The grammar

The shape is the one prior-art §4 recommended and the reason it gave: candidate generation plus
a weighted score "turns a hundred things that could go wrong into a hundred scoring terms rather
than a hundred nested branches, and adding a rule later costs one term instead of a rewrite".
Refused at Duplo's scale: an Edition is at most 40 stories and a few thousand words, so the search
enumerates a handful of templates per story and keeps a beam of six partial magazines, which is a
few hundred paginations for the live Edition and about 20 ms.

### 2.1 Nouns

A **story** is one question and its answers, in the order people wrote them (the reader's order;
nothing is ever reordered to pack a page, G8). A **block** is a whole number of rows: an opener, a
run of text columns, an essay, a photograph beside its words, a band of photographs, a gallery, a
wall row, a row of cards, a vote, a quote, the cover, the contents, the back page. A **template**
is one way of turning a story into blocks. A **page** is blocks stacked to at most 49 rows.

### 2.2 What an answer is

Classified before anything is drawn (`classify` in `grammar.ts`), and photographs win over words
because they set the block's shape:

| Class | Rule | Drawn as |
|---|---|---|
| empty | nothing printable: no visible words, no photograph, card, recording or vote (whitespace, zero-width and formatting-only bodies count as nothing, E9, E10, F9) | not drawn; the reader's `said()` rule |
| vote | a pick | part of the vote result |
| voice | a recording | a transcript block, or a one-line note that a recording exists |
| photo | any photograph | a photograph beside its words, a band, or a share of a gallery |
| card | a pasted link and at most 28 words | a card with its words beneath |
| note | at most **28 words** (the live median is 26) | a run-in line: bird, name, words |
| paragraph | 29 to 219 words | a byline and a column of text |
| essay | **220 words** and up | a wide measure of its own; may run over pages |

### 2.3 Templates a story may take

`templatesFor` offers only templates whose parts the story has (G4: variety never forces an
essay layout onto three notes), and the search picks among them by score:

- **notes-3 / notes-2**: three or two columns of run-in notes. Offered when at least 60% of the
  answers are notes and there are six or more (70% missed two live stories by one answer each,
  panel B).
- **prose**: two balanced columns of notes and paragraphs, with each photograph answer placed
  by the photograph rules in 2.5 (beside a column, in a gallery, or as a band). Always offered.
- **prose-lead**: prose, with the story's best photograph (a portrait at 5 or 6 columns, a
  landscape at 7) under the headline beside a column that its own answer starts and the next
  answers fill; the lead's answer is pulled to the front of its story, the one reordering the
  grammar allows itself. Offered when a photograph clears the gate at 6 columns or wider. A
  lead beside the headline itself left twenty rows of air under a two-line question, which
  is where this rule came from.
- **gallery**: prose, opened by the lead across the full width when a landscape clears the gate
  there (a portrait cannot inside the crop budget, so it falls back to prose-lead's shape),
  with short photograph answers gathered into justified rows. Offered when 40% or more of the
  answers carry photographs.
- **cards**: a playlist, three cards across, one block per row so thirty break between rows.
  The only template for a songs question or one that is mostly pasted links; a song given only
  as a name is a card with no art (A25, F36).
- **wall**: the photo wall as justified rows (Flickr's algorithm, prior-art §4) at a 42 mm target
  row height, one block per row so a wall of three hundred breaks between rows, each
  contributor's name under their first photograph; no captions, as he ruled for the reader. The
  only template for a photo-wall question with **four or more** photographs; under that the
  question is a photo story (a wall of one is a stamp with a name, B20, A15).
- **vote**: the choices as rows, each with the birds of who picked it AND their names (a bird is
  nobody on paper, H3), a choice nobody picked kept and marked "Nobody" (F30), then any lines
  written beside a pick as notes. The only template for a vote.
- **brief**: not a template but a size. A story of at most three answers, at most 60 words and
  no photographs sets its question at 13pt instead of 24, and any story that fits whole in what
  is left of a page runs on. The live one-writer Edition (eight one-line answers) was eight 24pt
  headlines on four pages before this rule and is a page and a half after it.
- **empty**: a question nobody answered gets no pages; it goes to the back page under "Also
  asked" (A8, E27).

### 2.4 The opener

A short cinnamon mark, the question in Libre Baskerville at 24pt (17pt past 120 characters, so
a 300-character question does not take half a page, C22), then "Asked by" and the name when the
asker may be named (the reader's rule: only a member-written question, only when they let it;
"Asked anonymously" when they chose not to be; nothing at all for a library question, and never
"null", E4, C26). Under a story of four or more answers, a **deck**: one quotable sentence from
an answer that is not the first (so it previews rather than repeats what sits directly beneath).

### 2.5 Photographs (the "if these images are of this size" rules, ¶21)

- **The gate.** A photograph is placed only where it prints at **150 dpi or better** at its placed
  size (below that a q80 WebP on a 2x screen at fit-to-page, and a home print, both go soft); it
  scores full at **250** (Blurb's ideal, prior-art §4) and is scored down between. The gate is a
  refusal, not a score: fill cannot buy a blurry photograph (G2).
- **The frame shrinks, the photograph does not stretch.** Blurb's rule run backwards: a band takes
  not the widest span the photograph clears but the span where sharpness times prominence is
  highest, so a 900px still takes six columns at 257 dpi rather than ten at 152 (B2, B3, D16).
- **A photograph is weighed against its words.** Under twelve words a lone portrait takes five
  columns at most and a landscape eight, whatever its sharpness (panel A, C: "four words under
  a 135 x 181 mm portrait" passed the gate at 270 dpi and was a blown-up image all the same).
- **Beside a column of words.** A lone photograph with words sits beside a column that its own
  words start and the answers that follow it fill, until the column is as tall as the
  photograph; the span (4 to 7 columns) is the one that leaves the least air beside it, with
  softness costing as much as ten rows. This is his picture: "we could have the image on one
  side and then this on another side" (¶21), and it is what turns a portrait with four lines
  beside it from half a page of air into a page of the story.
- **Galleries.** Two or three short photograph answers share one justified row, two and three
  taking turns so a story of twelve is not a contact sheet; every pair and trio that includes
  the first answer is tried, nearest first, because two landscapes after a tall one make a row
  too short while two portraits further on make a good one; a later answer may lend its
  photographs to a gallery whatever its length, credited under them, its words staying in the
  flow where they were (a magazine's photo spread). A row is never taller than 22 rows and
  never narrower than 42 mm a photograph (a 24 mm column broke a caption in two); a row
  narrower than the page puts its words beside it instead of beneath. This gathering is the
  second and last departure from written order, and each photograph keeps its writer's name.
- **Crops** are toward the measured focal point and never more than **20%** of either axis
  (`CROP_BUDGET`, the reader's own budget); a photograph that would need more is shown whole at
  a smaller span rather than cut through somebody (B12, B13).
- **Unmeasured** photographs (rows older than the `Image` table) count as 640px and unknown
  shape: they take a small slot and never lead (B6, E13).
- **Duplicates** in one answer print once (B18). A lead photograph is credited to its writer on
  the same page and is not printed again at its answer (G28). **The cover's photograph is not
  printed inside**; its answer prints its name with "the photograph on the cover" (B24).
- **One writer opens at most a third of the stories** with their photographs, so one new phone
  does not open every story (G27).
- **The cover** takes the sharpest, most-hearted portrait that fills the page inside the crop
  budget at 150 dpi or better; else a landscape that fills a 62% band; else the Catch-up's own
  photograph as the band; else type alone. The name goes where the face is not: at the bottom
  when the focal point is in the upper half, else at the top (G29). A writer whose account is
  gone never supplies the cover (H11). Cover lines are the most-answered questions, ties by
  hearts, never a photo-wall question (an instruction, not a question, panel A).

### 2.6 Text

- A note's bird and name run into its first line; a paragraph's byline is two rows; an essay
  takes an 8-column measure (120 mm, about 67 characters) and may split across pages at a line,
  never with fewer than four lines on either side, its byline on the first page and "Name,
  continued" on the rest (D1, D2, C35).
- An answer is never split except an essay, and a single answer taller than a page is split like
  one rather than lost (A2, E29).
- Two writers with one name get a second line ("Batch of 1998") under each, and only then; the
  magazine prints no batch line otherwise, like the reader (H4).
- A recording prints its transcript marked "from a recording, as the browser heard it", never as
  the member's typed words (E19, F25); with no transcript it prints a one-line note that the
  member spoke, and for how long (F24).

### 2.7 Quotes

A pull quote is a sentence lifted out of something longer, and the rules are all refusals: 9 to
28 words; a complete sentence (split without falling for "Dr.", "e.g." or "3.5 km", C31); not a
url, a mention or an emoji row; not already quoting somebody; not shouted (60% capitals, C21);
not starting on a pronoun with nothing to point at ("He never came back after that.", H12); not
grief or an insult that reads differently without its question (a short list of words, H14, H15);
never from a recording's transcript; never from an answer under an anonymous question, where a
sentence could name the asker (H9); never from a writer whose account is gone; never from an
answer under **60 words** (or it prints whole twice; seen); never from an answer with a pasted
link (its best sentence is a song title, panel A); the same sentence in two answers quoted once
(H17); and **at most two quotes a writer** an Edition, so the one who writes long is not the
one quoted on every page (panel A, B). A deck obeys every one of these, the anonymous-question
rule included (panel B). Quotes are rationed to one per two stories plus one for the whole Edition, so a gap
is filled by a quote only about as often as a magazine would (G9); one is never placed on the
page its own answer is on; and **a time capsule quotes nobody** (H18: they are letters to
themselves).

### 2.8 Pagination

The rules a compositor gives a junior, in `paginate.ts`:

1. A story starts on a fresh page unless at least **14 rows** are left (a headline and eight
   rows of its story), or the whole story fits in what is left (a brief). At 20 every story
   boundary could leave nineteen rows of air, four pages' worth across the live Edition.
2. A headline keeps at least **8 rows** of its story under it, and a headline that would be
   left alone at the foot is taken back to the next page with its story (D3).
3. Text runs are **balanced**: the answers that fit on the page are shared across the columns
   by an equal share of rows, so two columns come out level rather than the first full and the
   second empty (G31; seen three times on the live Edition before the rule). A run of one answer
   takes a single wide column at eight columns, not the left half of two. No answer is split
   (D1).
4. A photograph, a gallery, a wall row, a card row and a vote never split; one that does not fit
   moves whole (D4, D6, D33).
5. A gap of **7 rows or more** left on a page is offered a quote; if none is left in the ration,
   or every candidate's answer is on that page, the gap stays and the score says so.
6. The back page joins the last page when it fits, else takes its own and fills it; its birds
   go smaller as the crowd grows so a hundred fit one page (G35).
7. A contents exists only for six or more stories on four or more pages (A6). It is a block,
   not a page, measured entry by entry, and the first story runs on beneath it (as a page of
   its own it left three quarters of the page empty on the live Edition); its numbers are
   filled in after pagination and checked against the openers (G33).

### 2.9 The score, and what the search maximises

Four terms per page, the four prior-art §4 said were worth taking from Duplo, each 0..1 or a
penalty below 0 (`score.ts`):

- **fill** (weight 1.0): rows used over 49, full marks at 82% and falling away as the square
  below it; the last page is held to 45%; and a **quiet page**, one sharp photograph across ten
  or more columns with at most six rows of words, is held to 55%, so the magazine can have a
  quiet moment (G10) without the score punishing every empty row. Air beside a photograph is
  subtracted first (G11).
- **image** (weight 0.8): the mean over the page's photographs of sharpness at placed size
  times prominence (0.6 + 0.4 x span/12), so a full-width sharp photograph scores 1, a
  half-width one 0.8, and a page with none 0.75 (neutral, so text pages are not punished).
- **variety**: −0.45 when the page's shape signature equals the page before, −0.15 when it
  equals the one two back (so A,B,A,B pays too, G5), −0.15 when three or more photographs on a
  page are all one span; a mirrored page counts as the same shape (G6); walls are exempt.
- **coherence**: −0.2 for a page that ends on a headline, −0.05 for a page that opens on a
  continuation.

The search maximises the **sum of page scores minus 1.15 per page**, so fewer fuller pages beat
more emptier ones (G1: without the page cost, padding pays, and the one-writer Edition spread
itself over nine pages). Ties fall to template order and nothing is random, so two renders of
one Edition on two machines agree (G12, G13); the test pins it.

### 2.10 What the engine checks on its own output

After every layout `runChecks` looks for: a page over 49 rows, a photograph under the floor, the
same photograph of the same answer printed twice, a page that ends on a headline. `missingFrom`
lists every answer, photograph and link in the source that reached no page (G30: no template for
a combination may silently drop a card). The corpus test asserts both lists are empty on every
Edition, plus order, determinism, the quote ration, the capsule rule, the dpi floor, the contents
rule, page bounds per fixture, and no thin page but the last.

---

## 3. Type and image at print size

**Type.** Source Sans 3 at **10.5pt on 15pt** for everything read at length (about 49 characters
a line at six columns, 67 at eight; both inside the 45 to 75 band). Libre Baskerville for the
question (24pt, 17pt when long, 13pt as a brief), the cover (44pt), a quote (16pt italic on 22pt)
and the contents. Bylines Source Sans 600 at 10.5; "Asked by", the folio, a wall name and a
card's second line at 8 to 8.5pt in the muted ink. No small caps, no tracking on names (H34
breaks Indic conjuncts), no hyphenation (H35). Both faces are the app's own next/font files, so
the same bytes print that the site shows; the room measures text on a canvas with them before it
lays out, and the print script waits for that measurement before it prints.

**Image.** Every stored Catch-up photograph is boxed to 1920px on its long edge as WebP q80 and
**no original is kept**: `/api/upload/finalize` deletes the staged file once the display copy is
written (checked 2026-09-14; the Collection keeps originals, a Catch-up does not,
`project_collection_stores_full_resolution`). On the live Edition only 15 of 36 photographs reach
1920; the rest are 719 to 1792 on the long edge, and one is 438 x 202.

What a photograph may take on A4, at the 150 floor and the 250 ideal:

| Placement | Width | A 1920 x 1440 landscape | A 1440 x 1920 portrait | A 900 x 1600 portrait | 438 x 202 |
|---|---|---|---|---|---|
| full-bleed page, 210 x 297 | 210 mm | 232 dpi as a 62% band | **164 dpi** (allowed, scored down) | 137: refused | refused |
| full text width, 12 columns | 182 mm | **268** | 201 at a 28-row cap | 126: refused | refused |
| 8 columns | 120 mm | 406 | 305 | 190 | refused |
| 6 columns | 89 mm | 549 | 411 | **257** | refused |
| 3 columns | 42.5 mm | 1148 | 861 | 538 | **262** |

So: **a 1920px photograph may take anything up to a full page on screen** (164 dpi is sharp on a
2x screen at fit-to-page) and is print-soft only at the full page; **a phone photograph under
1000px tops out at six columns**; a screenshot takes a quarter of the width and no more. With
today's pipeline "one image big" (¶21) means a 1920 source across the text width at 268 dpi,
which is already print quality, and a full-bleed cover at 164, which is screen quality. **D27
answer, RECOMMENDED**: keep 1920 for now. The only thing an original would buy is a print-sharp
full-bleed cover (a 2480px source), and nobody has asked for a printed copy. If he ever wants
one, the change is the Collection's: keep the staged original under `originals/`, one more
column, and the cover rule reads it. Not urgent, and not free (a 20 MB original per photograph
in R2 for every answer).

---

## 4. Decisions, with the roads not taken

| Decision | Status | Considered and not taken |
|---|---|---|
| A4 portrait | RECOMMENDED | Letter; a 3:4 digital page; B5 (§1) |
| Same pages on screen, true size; the PDF on a phone | RECOMMENDED | a reflowed scroll; a phone paper (§1) |
| Candidate templates plus a weighted score with a beam of six | RECOMMENDED | a fixed branching tree of if-statements (a hundred nested branches, one rewrite per new rule); Duplo's thousands of candidates (nothing to choose between at this scale); simulated annealing over whole magazines (non-deterministic, and two renders would disagree) |
| Cover lines are questions | RECOMMENDED | the most-hearted answer as the cover line (H13, H14, H15: it can read as arson, grief or an insult without its question); no cover lines (then a cover is a photograph and a date, and a forwarded file says nothing about what is inside) |
| Hearts never print as numbers; they steer the cover, the leads and the quotes | RECOMMENDED | a heart count on every answer (a public scoreboard of who nobody liked, A34); counts only over a threshold (why these?) |
| The cover photograph is a member's, the Catch-up's picture only as a fallback | RECOMMENDED | always the Catch-up's picture (five Catch-ups on one pool photograph would send five identical covers, E22, and he said the picture is "deliberately not in the reader"); never a member's photograph (then the cover never shows the month) |
| Nothing readable of a sealed capsule; its magazine exists only once it opens; its cover says written and opened | LOCKED (his 34b) + RECOMMENDED | dating it by the sealing only (then "I'm 30 now" reads as current a year on, F37) |
| A magazine of an Edition nobody wrote in is a cover and a back page, flagged for the mailer | RECOMMENDED | refusing to build it (then the Edition's own page has nothing to offer); building headings over blank paper (A7) |
| A brief's question at 13pt, run on | RECOMMENDED | one template for every story (eight 24pt headlines for 38 words, seen on the live one-writer Edition) |
| Answers keep their written order, always | RECOMMENDED | reordering within a story to fill gaps (a magazine would; the reader would then disagree with the magazine, and the contents with both, G8) |
| Quotes are rationed and filtered, and a capsule has none | RECOMMENDED | quotes wherever a gap is (G9); no quotes at all (then a short page has only air to offer) |
| Both fonts embedded from the app's own files, latin subset only | RECOMMENDED | adding Devanagari, Arabic and Tamil subsets (C1, F11: a name in those scripts falls to a system font today; the fix is a `next/font` subset per script, about 200 KB each, and a decision for M2's build machine, which has to have the fonts at all) |

---

## 5. The hundred things that could go wrong, and the bypass for each

His ask, ¶31: *"What are all the hundred things that could go wrong, and how do we bypass them?"*
The hunt ran three rounds of finders from seven angles, each reading his paragraphs from disk:
243 in round one, 110 new in round two, 22 new in round three, about 40 of the 375 duplicates of
each other. Deduplicated below to the failures that are distinct, each with what the magazine
does about it. **Bypass** is one of: a rule in the engine (named), a fixture that pins it
(named), a renderer or build-step rule for M2 (marked M2), an owner question (marked Q), or a
thing accepted with its reason. The letters (A1, G9, ...) are the hunt's own numbering, kept so
the code comments can cite them.

### Content extremes

| # | Failure | Bypass |
|---|---|---|
| A1, D13 | one word given a page | notes run in; a brief runs on; page cost in the score. `forty-notes`, `one-writer` |
| A2, D2, E29, F22 | a 9,000-character answer as one block, author lost on later pages | essay splits at a line, four lines each side, byline on the first and the name in the margin on the rest; a paragraph taller than a page is split like one. `one-essay` |
| A3, A4 | sentence-question beside essay-question; mixed lengths under one question | per-answer classes, per-story templates, balanced columns |
| A5 | forty questions, 300 characters each | headline steps to 17pt past 120 characters; contents in two columns past 14; briefs. `pressure-3` |
| A6 | one question in the whole Edition, furniture outweighs content | contents only from six stories on four pages; back page joins the last page. `one-writer` |
| A7, D12, E25 | zero answers, published anyway | a cover and a back page ("Nobody wrote in this time", the questions under Also asked) and a note the mailer must read before sending. `nobody-wrote` |
| A8, E27 | a question nobody answered among answered ones | no pages; listed under Also asked on the back page |
| A9, D10, E26 | the one-writer Edition, eight headlines | briefs; the byline runs in; the back page shows one bird, which is true. `one-writer` |
| A10, A11 | one voice is 90% of the words, or answers everything first | one writer opens at most a third of the stories; quotes rationed; the score cannot see words per writer beyond that. Accepted: the magazine prints what was written |
| A12 | a hundred writers under one question | notes-3, balanced, across pages; the back page's birds shrink to twelve a row. `pressure-3` has forty |
| A13, D11 | forty three-word answers, then one | notes-3; a brief runs on. `forty-notes` |
| A14, B19, D32, G32 | the 300-photograph wall | justified rows at 42 mm, one block a row so it breaks between rows, names under each group's first, a panorama a row of its own; 300 photographs is about 12 pages. `wall-300` |
| A15, B20 | a wall of one photograph | under four photographs a wall question is a photo story. `one-writer` |
| A16, B34 | all photographs, no words | a band or gallery item with the byline alone; the back page and cover need no words |
| A17, B40 | all words, no photographs | prose and notes templates; a type-only cover; no empty frames. `no-photos` |
| A18, A19, B16 | a legacy answer with four to six photographs | justified rows, two of them; nothing dropped. `pressure-3`, `hostile` |
| A20, B2, B3, B5, D16, B39 | a tiny source made big (438 x 202, a 128px sticker, a 719px phone photo as hero) | the dpi gate at placed size; the frame shrinks to where the photograph is sharp; a photograph that clears no slot at three columns is left out and said so in a note. `hostile` |
| A21, B17, D15 | twelve portraits with a sentence each; three tall ones from one person | galleries of two or three; the variety penalty; the fixture asserts no shape runs past three pages. `all-portraits` |
| A22, B38 | a 4:1 panorama beside portraits | shape "strip" never leads, never a cover; on a wall it takes a row of its own |
| A23, B6, E13 | unmeasured photographs | count as 640px and unknown shape: a small slot, never a lead |
| A24, B8, D37, F40 | a dead url among live ones | the engine cannot know; alt="" so Chrome draws no icon; M2: the build HEADs every image and drops the dead ones from the source before layout |
| A25, F36 | an answer that is only a url; thirty url-only songs | a card; a playlist three across, a row a block. `songs` |
| A26 | play controls printed as dead interface | no controls; a card is art, title and who; a recording is a line saying it exists |
| A27, E18, E19, F24, F25, I28 | a recording with no transcript, or a garbled machine one | printed as "spoke for 0:47" with the bird; a transcript is marked "from a recording, as the browser heard it" and never quoted. `voice-votes` |
| A28, E20, F28, F29, F30 | votes: landslide, tie, one voter, a choice nobody picked | every choice kept, "Nobody" under an unpicked one, birds and names, never a number, no winner wording, tied choices identical. `voice-votes` |
| A29, F31, H24 | six 80-character choices; a line with a url beside a pick | choices clamp to one line; lines are notes after the result; a url in a line stays a link (M2: card) |
| A30 | every kind in one Edition, a sampler of seven designs | one type system and one page furniture across every block; the variety penalty is per shape, not per kind. `pressure-3` |
| A31 | two link previews dwarfing twelve words | cards are 14 mm art; a preview image never leads |
| A32, C6, C7, D31 | a 180-character token | `overflow-wrap: anywhere`; the measurer breaks inside the token the same way. `hostile` |
| A33, C30 | "lol" or an emoji row as a pull quote | 9 to 28 words, a full stop, no url, no mention, no emoji-only, a capital start |
| A34 | hearts as a scoreboard | never printed as numbers; they steer the cover, the leads and the quotes |
| A35, C24, C25, E35 | an 80-character name, no batch year, a one-letter name | bylines wrap; no batch line at all; a name is printed as typed |
| A36, C26, E4, F19 | "Asked by null" | named, anonymous, or nothing; never a template word. `hostile` |
| A37, C22 | a 300-character question over a three-word answer | 17pt past 120 characters; a brief. `pressure-3` |
| A38, E37, E38, H33 | the Catch-up's name on the cover: 80 characters, lowercase, two characters | as typed, wraps at 44pt, never transformed; "in the loop" stays lowercase (seen live) |
| A39 | page count at both ends | measured: 2 pages for nothing, 3 for one writer, 26 for 133 answers, about 12 for a wall of 300 |
| A40, C15, C16, C17 | full bold italic; forty one-word lines; leading newlines; five blank lines | `pre-line` and the measurer agree on paragraphs; three or more newlines collapse to two; a whitespace body is nothing |

### Photographs

| # | Failure | Bypass |
|---|---|---|
| B1 | the 1920 ceiling full-bleed at 164 dpi | allowed (screen-sharp), scored down; §3's table; D27 answer: keep 1920 unless he prints |
| B4 | q80 WebP artefacts enlarged | the dpi floor keeps enlargement under about 1.7x of a 2x screen; M2 hands Chrome JPEG at q82 |
| B7, E14 | recorded size disagrees with the file | M2: the build reads the size off the bytes (the export already does) |
| B9, D18 | a slow image prints blank | the room waits for every image before it says ready; the print script prints on that |
| B10 | a phone screenshot on a portrait page | shape "tall": six columns at most, never full-bleed, never a cover unless within the crop budget (it is not) |
| B11, B12, B13, B14 | crops through text or faces; a wrong or extreme focal point | a `cover` crop never exceeds 20% of either axis, clamped to the frame; else shown whole smaller |
| B15 | tall, wide and square in one answer | justified row: every photograph at its own proportions, one height |
| B18 | the same photograph twice in one answer | printed once |
| B21 | whose photograph is whose on the wall | never sorted by shape; each group's name under its first photograph |
| B22, B23, E22, E23 | the Catch-up's picture on a portrait cover; the pool picture shared | only as a band, only when no member photograph qualifies; its focus string aims the band; M2: absolute urls in the print page |
| B24, G28 | the cover photograph printed again inside | the cover's photograph is skipped inside; its answer prints "the photograph on the cover" |
| B25, B26, B27 | dark or busy photograph under text; a cream screenshot with no edge | the cover has a scrim on the text side only; inside, text is never over a photograph; every photograph sits on a 1 mm radius mist frame |
| B28, B29, B30, B31 | alpha, greyscale, P3, EXIF | the upload path uprights and flattens; colour is what the file holds. Accepted |
| B32, B33, B35, D4, D5, D6 | a photograph split, or separated from its writer, or its caption | photographs never split; a block is photograph plus byline plus caption together; a gap left behind takes a quote |
| B36, D35 | 89 MB from 34 photographs | measured, and the bypass measured: JPEG in, 7.4 MB out (§7) |
| B37 | the blur placeholder printed | no placeholders on a print page |

### Type and text

| # | Failure | Bypass |
|---|---|---|
| C1, C4, C5, F11, H34 | Devanagari, Arabic, Tamil, Thai, combining marks | the latin subset is what ships; on this Mac they fall to Kohinoor; on a server they would be tofu. **M2**: a `next/font` subset per script the members use, and the build machine must have them. No tracking on names; grapheme-safe cuts |
| C2 | Arabic inside English | `dir="auto"` on every text block (M2 renderer) |
| C3, C36, F10 | emoji as boxes; six thousand of one | Apple Color Emoji on this Mac, none on a server (M2: Noto Color Emoji on the build machine); the measurer breaks inside the run |
| C8, C34, H35 | rivers, hyphenated names | no justification, no hyphenation |
| C9, C41 | bold italic as a sheared roman | the italic Baskerville file is loaded for quotes; body emphasis is the composer's and stays roman-bold |
| C10, C11, C12 | underline reads as a link; a struck joke lost; `plainExcerpt` strips real characters | links print unstyled in ink; `visibleText` strips markers only where they pair; `plainExcerpt` is not used |
| C13, F3, F4, F5, E11 | mentions: raw, dead, forged, of a deleted member | printed as the typed name in ink, never a link on paper (M2: the renderer passes no href) |
| C14, F1, F23 | `<script>` twice-escaped or live; text that pretends to be furniture | one renderer, `renderRichText`, once; a member's words never take headline size or the mark. `hostile` |
| C18, C19, C20, C23 | NBSP, ZWSP, quotes in quotes, a lone last word | invisible characters stripped for measuring; a sentence already in quotes is not a quote; headlines wrap naturally (M2: `text-wrap: balance`) |
| C21 | a shouted answer | printed as written; never quoted |
| C27, C37, C38 | small print too faint; dates in the wrong zone; numerals | 8pt minimum in the muted ink; every date through `formatDisplayDateLong` in the valley's zone |
| C28, C29 | drop caps on an emoji or a digit | no drop caps |
| C31, C32, H12, H16 | a quote cut mid-clause, a pronoun with no referent, an ellipsis that flips meaning | sentences split around abbreviations; no pronoun starts; never trimmed, only whole sentences |
| C33 | a transcript quoted as the member's words | never |
| C35, D1, D3, D7, D8 | orphans and widows; a headline at the foot | no answer split but an essay; a headline keeps eight rows and is taken back to the next page when its story cannot start |
| C39, C40, D30 | fonts late, faked, or missing on a server | the room measures only after `document.fonts` reports both faces; the print script prints on that and lists the fonts embedded (§7) |
| C42 | copied text comes out wrong | no drop caps, no soft hyphens; tagged PDF (M2 checks the reading order) |

### Pagination and print

| # | Failure | Bypass |
|---|---|---|
| D9, C36 | a last page with one line | the back page joins the last page; the last page's fill target is 45% |
| D14, G5, G6 | the same page five times running; A,B,A,B; mirrored pages | variety penalties one and two pages back; the signature ignores the side |
| D17 | `next/image` picks the phone-sized file | plain `<img>` of the stored bytes; M2 serves the JPEG at the placed size |
| D19, D20, D41 | animations at opacity 0; the app's chrome on every page; dark mode | the print view is the pages alone with no chrome and no motion; the paper colours are literal, not theme tokens |
| D21, D22, D23, D24, D25, D26, D27 | Letter; backgrounds off; a white frame; margin boxes; running heads; contents numbers; the outline | `preferCSSPageSize` and `printBackground` on; `@page` margin 0 and the furniture drawn inside each page, so nothing depends on margin boxes; contents numbers filled after pagination and checked against the openers; M2: an outline of questions only |
| D28 | two pixels too tall, a blank page after every page | measured: 297.01 mm pages, page count equal in the room and the PDF; the last page carries no break |
| D29 | screen breakpoints inside the print | no responsive classes on a page; every size is in mm |
| D33 | a long vote split | a vote block never splits; a landslide of forty is 8 rows |
| D34 | birds rasterised blurry | the birds are inline SVG and print as vectors (checked at 400%) |
| D36, I25 | a laptop's 4 s is a server's timeout | measured (§7): 4.5 s render, 2.6 s print, 200 MB, for the largest live Edition |
| D38, D39 | home printers, binding, spreads | 14 mm outer margins; no spreads, no facing pages, nothing crosses the gutter |
| D40, G38, G39 | the on-screen version on a phone; Cmd+P | §1: true size, the PDF on a phone; M2's route prints with the same settings, not the browser dialog |
| G1 | padding pays | the page cost |
| G2, G3 | fill beats sharpness; keeping together shrinks photographs | the gate is a refusal; spans come from sharpness, never from fit |
| G4 | variety forces a template with missing parts | templates offered only with their parts |
| G7 | the split point is all-or-nothing | the keep rule and balanced columns |
| G8 | reordering to pack pages | never, with two exceptions said out loud: the lead's answer opens its story, and a story's short photographs may be gathered into a gallery at the first one's place with each one's own words |
| G9 | filler quotes | the ration; one per answer; never on its own page; never from under sixty words |
| G10, G11 | white space always loses; letterbox counted as fill | the quiet-page target; air beside a photograph subtracted |
| G12, G13, G37 | ties, seeds, timestamp order | no randomness; template order breaks ties; answers sorted by time then id; the test runs twice |
| G14, I2, H21 | one word moves every page | accepted; M2 keys each file by content hash so a rebuilt file never replaces one already shared |
| G15 | a time limit decides the layout | none: the beam is bounded (six by templates) and the live Edition takes 20 ms |
| G16, G17, G18, G19, G21, G22 | the line estimate is wrong; Mac and server Chromium differ | the estimate is only the first pass; the room and the build measure with a canvas in the same Chrome that prints; split points still come from the estimate (M2: the measurer returns line offsets) |
| G20 | a split inside `***bold***` or a mention | `safeCut` backs up to a marker's start; a split essay prints plain |
| G23, G24 | dpi measured before the crop; one pixel flips the template | `dpiAt` uses the crop's scale; thresholds are continuous scores where they can be, and where they are not (the crop budget), a fixture would show the flip |
| G25 | an upscaled forward at 1920 counts as sharp | accepted for now; M2 option: a sharpness measure (Laplacian variance) at export, one number per photograph |
| G26, H25, H14, H15, H18 | a memorial or a screenshot as the cover; grief or profanity on it | cover lines are questions; a screenshot is "tall" and never covers; words are filtered for quotes; a capsule quotes nobody; and the Keeper's look before it is sent (M2) |
| G27 | one phone owns every lead | a third of the stories per writer |
| G29 | the cover title over the face | the name goes to the side away from the focus |
| G30 | no template for the combination | `missingFrom` on every layout; the test asserts nothing is missing |
| G31 | columns split an answer, or column 3 holds one note | never split; balanced by an equal share |
| G33 | contents numbers never settle | one block, numbers filled once, checked against the openers |
| G34, G35 | parity; a hundred contributors | no facing pages; birds shrink to twelve a row |
| G36 | weights tuned to the test Editions | the live Editions are in the test only on this machine; the twelve fixtures are the held-out set |
| G40 | the on-screen version downloads 300 photographs | M2: the screen version serves the placed size |

### People, data, time

| # | Failure | Bypass |
|---|---|---|
| E1, E2, E3, E7, E21, E34, F20, F39, H11, I13 | a member deleted or leaving after the file exists; hearts and votes changing | the file is a snapshot and says when it was made (M2: the colophon carries the build date); a purge removes the stored files under the magazine root (M2: `KNOWN_ROOTS`); a gone writer never supplies the cover or a quote; nothing prints "null" |
| E5, H9, H10 | an anonymous asker answering first, or named in an answer | answers keep their order (the reader does the same); no quote from under an anonymous question |
| E6, E8, E9, E10, F9 | an asker who left; null, whitespace, zero-width and formatting-only bodies | `says()` and `visibleText`; nothing prints for nothing |
| E12 | photo-only answers whose files are gone | M2 drops dead urls before layout; here the frame shows mist |
| E15, E16, E17, F33, F34 | links unresolved, pending, no image, no artist | a card with a glyph tile; "On Spotify" as the second line; an unresolved link stays text (M2: the build waits for resolution or prints the plain link, never a skeleton) |
| E24 | no theme | never printed |
| E28 | duplicate answers from one person | accepted: two bylines, which is what happened |
| E30, E31, E32, E33, F37 | time zones; 29 February; a capsule's two dates | every date in the valley's zone; the cover says written and opened |
| E36 | "Batch of 2024 · Batch of 2024" | the name is `title ?? groupName` once |
| E39, E40, F38, I5, I6 | export older than the database; a sealed capsule reachable | the build reads the row's status inside its own read and refuses anything but `published`; a capsule's opening runs the same build (M2) |
| H1, H2 | a forwarded file with no context; links to a login wall | the colophon says what a Catch-up is; no link in the file leads to a member page (M2) |
| H3, I30 | a bird is nobody on paper | names under the birds in a vote; names under wall groups; names by every bird on the back page |
| H4, H5 | two members with one name; a name changed after writing | a second line for homonyms; mentions print the typed name |
| H6, H7 | hidden profile fields; an email as a name | no field but the name is printed; the name is what the app allows |
| H8 | a library question looks anonymous | prints no asker line at all, the reader's rule |
| H13, H17 | an answer alarming without its question; a planted line | cover lines are questions; duplicates quoted once |
| H19, round 3 no. 8 and 16 | a Catch-up renamed or re-pictured after publishing; a retired pool picture | M2: the source is captured at build and stored with the file; a pool path not in the pool falls back to type |
| H20, round 3 no. 4 and 6 | a capsule whose Catch-up ended; nobody to preview | M2: the build runs on the opening tick regardless; a batch has no Keeper, so a preview step can only be optional (Q) |
| H22, H30 | counts from different moments; relative time | no counts printed; no relative time printed |
| H23 | words dropped from a wall answer | a wall prints no captions (his rule); the words are in the reader. Accepted, and said on the page? No: nothing on the page says so (Q) |
| H26, H27, H28, H29, I29, I31 | an untagged PDF; reading order; alt text; language | Chrome prints tagged from DOM order, which is byline, words, photograph; M2: alt "Photograph by <name>", `lang` on the document |
| H31, H32, I21 | two Editions one day; a name that breaks a filename | M2: `<name-slug>-<date>[-2].pdf`, ASCII-folded |
| H36, H37, H38 | emoji in a quote; sorting; "Rao Jr.." | quotes with emoji are refused; the back page keeps writing order, not alphabetical; a quote's attribution has no punctuation of its own |

### The file, the build, the demo (all M2 unless marked)

| # | Failure | Bypass |
|---|---|---|
| I1, I3, I4, I15 | stale detection; two copies; two builds; CDN cache | key by Edition id plus content hash; the colophon carries the build date; one build at a time per Edition; the route sends `Cache-Control: private` |
| I7, I8, I9, I10 | the login page printed; a build secret in a url; an Actions artifact; the wrong `.env` | the build reads the page as the server, not through a browser session (§7); no secret in a url; no artifacts; the script refuses when `DEMO_MODE` and production keys are both set |
| I11 | Mac and server differ | one build machine, and it is the Mac until the fonts question is settled (§7) |
| I12, I16, I17, I18, I19 | a public bucket key; a shared cache; a gate that differs from the reader; the 4.5 MB body cap; expiring links | a private prefix, served through a route that applies the reader's gate and redirects to a short-lived signed url |
| I14 | a sweep deletes the file | a row points at every file |
| I20, I22 | sending to everyone; the home-screen app | parked with email; the route sends `Content-Disposition: attachment` |
| I23, I24, I26 | the demo | the demo builds nothing and serves nothing; a fixture's page says "invented" in its colophon (Q: should it?) |
| I27 | no way to keep an answer out of a forwarded file | Q |
| I32 | old viewers | no masks, blends or filters on a page |

---

## 6. The grammar panel

Three designers (A, B, C), independently and on paper, laid out the two real Editions and the
two hardest fixtures (`photo-heavy`, `all-portraits`) under §1 to §4 as first written, tracing
what the search would pick and computing every placement's dpi; then a judge read the pages the
engine actually printed after their findings were folded in, looking for blown-up images, white
space and monotony. All three designers reached the same faults, which is the point of asking
three; the rules changed, not the pages. The full reports are in this session's log
(`handover.md`, S22); what they broke and what it became:

| What the panel broke | Who | What the rule became |
|---|---|---|
| A run of one to four answers fills the left column and leaves the right empty; fill scores the page 1.0 | A5, B1 | balanced columns; a run of one at eight columns (2.8 rule 3) |
| A lone portrait with four lines beside it: 12 to 22 rows of air, on nine pages of the live Edition | A1, B3 | the photograph beside a column that the following answers fill (2.5) |
| Four words under a 135 x 181 mm portrait, at 270 dpi, five times in one Edition | A2, B2, C | words weigh the photograph: five columns for a portrait under twelve words (2.5) |
| An answer's two or three photographs stacked in one 58 mm column beside its words | A3, B10 | a justified row, words beneath at eight columns (2.5) |
| Thirty to thirty-five pages for 4,800 words; a quarterly would do sixteen | A1, B | the above, plus briefs run on, the contents as a block, run-on at 14 rows: 25 pages now, 20 is the next target (§8 M3) |
| The contents page: eleven lines and 35 rows of air, by rule | A11, B9 | a block the first story runs on beneath (2.8 rule 7) |
| The cover photograph leads a story or reprints inside | A8, B6, C6 | kept inside out; its answer says "the photograph on the cover" (2.5) |
| A deck from a playlist; a deck under an anonymous question; three of six quotes from one writer | A9, B7 | no quotes from answers with links; decks obey every quote rule; two quotes a writer (2.7) |
| Rows of three identical portraits: a contact sheet; a leftover pair at 89 x 158 mm | A1, A2, C1, C2 | rows of three and two take turns; rows never taller than 22 rows; a narrow row's words sit beside it (2.5) |
| "Add a photo from where you are" as a cover line; the cover lines chosen by hearts | A2, B1 | never a photo-wall question; hearts stay (his own group's most-loved question is the right first line) |
| A story at 69% notes misses notes-3 by one answer | B7, B12 | 60% |
| A stranded headline when the first block does not fit | B | taken back to the next page (2.8 rule 2) |
| A gallery's "lead across the full width" cannot be a portrait | A7, B5, C3 | said plainly: a landscape leads wide, a portrait leads beside a column |
| Twelve one-sentence portraits: eleven identical blocks under prose, or a grid under gallery | A1, C1 | galleries alternate 3/2 with words beside a narrow row; the fixture pins "no shape runs past three pages" and the judge's reading is below |

What the panel found and the rules do not answer, carried to §9 or accepted: which questions
make cover lines (hearts; his call, question 44); a question that names another question's
anonymous asker (content, not layout); "Asked by X" over X's own answer (true, kept); a
writer with no hearts never supplying a lead (hearts steer, as intended); the quote ration
spent on early gaps (accepted: a magazine's quotes are teasers for stories ahead).

**The judge's reading of the printed pages.** After the designers' findings were rules, one
judge read every printed page of the live Edition, `all-portraits`, `one-writer` and seven pages
of `photo-heavy`, looking only for blown-up images, white space and monotony, and reporting
rules, not pages. Fourteen blown-up images, fourteen pages with a third or more of air, six
kinds of monotony, and six pages that already pass his bar (the cover; page 3's band, columns
and notes in proportion; a photograph whose height matches its paragraph; a three-up of
portraits at 17 rows; a two-up of landscapes at 13; the back page's crowd of birds,
"unmistakably this app; nobody else's newsletter ends like this"). Its ranked fixes and what
became of each:

1. **"A photograph's size is chosen from the words beside it and the rows left, not before."**
   Done: a band under twelve words is capped at 16 rows; a gallery row at 17; a photograph
   beside a column is cropped to the column's height plus four rows inside the crop budget, and
   may take three columns; a frame taller than 2:1 (a phone screenshot, a screen) takes three
   columns and no more. The live Edition went from 25 pages to 23 and `all-portraits` from 6 to
   5 with the test unchanged; pages 5, 7 and 18 of the live Edition are the result.
2. **"A story's photographs are one block, sized by the story's words; some things are not
   photographs."** Half done: gathering across a story, the screenshot rule, an answer's words
   printed once under its cards. Not done, M3: the opener and a gallery lead as one unsplittable
   block; a band's span bounded by the story's total words; a content-aware term (a night
   photograph, a frame that is mostly one tone) which the dpi gate cannot see.
3. **"A second and third form for everything that has one."** Not done, M3, with the judge's
   list as the brief: three opener forms, three quote positions drawn from the story on the
   page (today a quote goes only to a page's foot, and from a story pages away), a caption that
   can sit above or beside, a paragraph measure that is never twelve columns (that one was a
   renderer fault and is fixed), and a variety term that compares against the last three pages
   and refuses a repeated two-up rather than charging for it. Also two renderer faults it found:
   an essay's last line and the next note touching with no gap, and two notes touching where
   their neighbours have a row; both are the GAP_ROWS inside a block's rows meeting a block
   boundary, M2's renderer.

## 7. The spike: one real Edition through print CSS, measured

`scripts/dev/print-magazine.mjs` opens `/lab/catchups/magazine?print=1&data=<key>` in the real
Chrome on this Mac (152.0.7977.83), signed in from Node, waits for the room to say it has
measured with the real fonts and every photograph has decoded, prints with `preferCSSPageSize`
and `printBackground` on and no header or footer, and records what came out. `pdffonts` and
`pdfinfo` (poppler) read the file back; `pdftoppm` rasterises every page so it can be read
rather than trusted. Everything below was measured on 2026-09-14; `scripts/dev/.magazine/
report.json` holds the last run.

**Fidelity.** Page breaks fall exactly where the engine put them: the PDF's page count equals
the room's on every one of the sixteen Editions (a trailing blank page appeared on the first
run, from `break-after: page` on the last page, and is gone). Paper 209.9 x 297.0 mm, so `@page
{ size: A4; margin: 0 }` is honoured. Both faces embed as subsets: `LibreBaskerville-Regular`,
`SourceSans3-Roman_Regular` and `_SemiBold` (and `_Bold` where a member wrote bold); a byte
search for `/BaseFont` finds only Arial because Chrome writes the font dictionaries into
compressed object streams, which fooled the first detector. What falls to a system face on this
Mac: emoji (`AppleColorEmoji`) and Devanagari (`KohinoorDevanagari`); on a Linux build machine
those would be tofu unless the fonts are installed. The bird avatars are inline SVG and print
as vectors. A full-bleed cover photograph bleeds to the page edge with no white frame, because
the page itself is the paper and nothing depends on `@page` margins.

**The estimate against Chrome.** With the canvas measurer, no text block overflows its rows on
the live Edition except a split essay, by one row: the split *point* still comes from characters
per line, not from where Chrome broke the line. That is the one M2 measurement task (the
measurer returns line offsets, and slices follow them). The estimate alone, without the canvas,
was short by one to two rows on about a fifth of the blocks, which is why the room runs the
engine twice.

**Time and memory.** The live Edition (23 pages, 34 photographs, 4,807 words): about 4.8 s
from navigation to ready (the fonts, the canvas measure, 34 decodes at 1920px) and 2.6 s to
print; Chrome at 200 MB resident. The wall of 300: 1.2 s and 0.7 s. Nothing here strains
Vercel's Hobby function (2 GB, 300 s, prior-art §8), and nothing here needs it.

**Size, the finding that decides the pipeline.** Handed the stored WebPs, Chrome's PDF writer
stores every photograph losslessly: **89.6 MB** for 34 photographs, 2.6 MB each, unmailable
(D35, B36 confirmed). Handed the same photographs transcoded to JPEG at quality 82 (mozjpeg)
on the way past, it keeps the JPEG bytes as they are: **7.4 MB**, the same pages, and the
print step drops from 6.7 s to 1.9 s. So the build must serve the printer JPEGs, and that is
the one thing the print path needs that the site does not have. `--jpeg` on the script is the
proof; M2's build does it for real (a sized JPEG per photograph, from the stored WebP, cached
beside it).

**The corpus, printed** (the last full run, before the judge's fix; the live Edition, all-portraits
and photo-heavy after it): one-writer 4 pages, nobody-wrote 2, forty-notes 3, one-essay 8,
all-portraits 5, wall-300 about 12, no-photos 16, songs 5, voice-votes 8, hostile 10, capsule 4,
photo-heavy 15, the pressure Editions 2, 2 and 16.

### The pipeline: where the printer runs

The three addresses prior-art §8 costed, against what the spike showed:

| | Local script (this Mac) | Vercel function (`@sparticuz/chromium`) | GitHub Actions |
|---|---|---|---|
| Chrome and fonts | the real Chrome, the app's fonts through the page, system fallbacks for emoji and Indic | 70 MB Chromium, Open Sans only: **both faces must be served by the page (they are, via next/font) and there is no emoji or Devanagari fallback at all** | Chrome preinstalled, DejaVu and Noto available |
| Time and memory | 7 s, 200 MB | fits 2 GB and 300 s with room; a cold start adds 3 to 5 s | fits, 6 hours |
| The file | written beside the script | **cannot come back through the function** (4.5 MB body cap): upload to R2 from inside the function | uploads to R2 from the job |
| Photographs | fetched from the public image host | the same, plus a JPEG transcode per photograph inside the function (sharp is already a dependency) | the same |
| Trigger | by hand | the publish transition and the capsule's opening tick | a repository dispatch from the same two places |
| Cost | nothing | a fraction of a cent per Edition | single-digit cents a year |
| Who sees it first | the owner | nobody, unless a Keeper preview is built | nobody |

**RECOMMENDED: two phases, in this order.** First (M2), the local script grows into the real
build: it renders the app's own magazine route rather than the lab's, serves JPEGs, uploads to
a private R2 prefix under a content-hashed key, writes the key on the Edition, and the owner
runs it by hand for the first few Editions, which is what ¶21 asks for anyway ("if we can do an
amazing job for this, then I would be happy to wire it up"): the layout has to be judged before
anyone automates it. Second (M4), once he has judged a few, the same build moves to a Vercel
function on the publish transition, with the emoji and Devanagari fonts shipped with it
(`@sparticuz/chromium` has none) and the file uploaded from inside the function. GitHub Actions
is the fallback if the function's font situation proves ugly; it is not the first choice because
a build that runs in a repository's CI is a second place members' words pass through (I9).
*Considered and not taken*: Cloudflare Browser Rendering (free, close to the bucket, but a
third party between the page and the file, and one report of unreliable connectivity, prior-art
§8); `@react-pdf/renderer` or WeasyPrint (a second implementation of every block, the
"second implementation" that cost the Collection campaign a room, D24); Paged.js (unmaintained
since 2023, and its known faults are in flex and grid, which is where every block here lives).

---

## 8. M2 and after, as phases

Each a session. Nothing after M2 starts until he has looked at a real Edition's PDF and said
whether it clears ¶21's gate: *"if we can do an amazing job for this, then I would be happy to
wire it up"*. Email is parked regardless (`features.md` §1, a paid Resend plan).

- **M2, the magazine in the app, built by hand.** The engine moves nothing; the renderer moves
  out of the lab into `components/catchups/magazine/` with the room importing it (F34's rule
  the other way round, the same code drawn in both places). A route `/catchups/edition/[id]/magazine`
  behind the reader's own gate (I17), rendering the pages at fit-to-height on a laptop and
  offering the file on a phone. The measurer returns line offsets so an essay's slices are
  Chrome's own lines. `dir="auto"` on every text block, `lang` on the document, alt text on
  every photograph, mentions printed as names with no link (C2, H29, H28, C13). The build
  script grows as §7 says (JPEG, private R2, hashed key, `KNOWN_ROOTS`, the row), still run by
  hand. The corpus test gains the app route. **Gate**: he opens the live Edition's file.
- **M3, the look, with him.** His notes on the printed pages, folded in as rules, not pages;
  the pool of twenty photographs, if it has arrived, as cover fallbacks; the three still-open
  drawings if they have been picked (a vote's result and a recording's mark print as the
  picked drawing). A second real Edition, when there is one, as the held-out test.
- **M4, on its own.** The build on the publish transition and the capsule's opening tick, as a
  Vercel function with the emoji and Indic fonts shipped, uploading to R2; a "The magazine" door
  on the Edition's page that says "being made" until the row has a key (round 3 no. 6); stale
  detection by the content hash with a rebuild that never replaces a key already shared (I1,
  I3); the purge and the account export reaching the files (I13). The demo builds nothing
  (I24). **Gate**: ten Editions without a page he would not have sent.
- **M5, sending it.** Only if he un-parks email: the file as a link in `catchup_published`'s
  mail, never an attachment (I20), with the opt-out he decides on (I27).

---

## 9. Owner questions (for the campaign's closing gate)

**39. Should a member be able to keep an answer off the magazine?**
- **What I'd change:** a switch on the answering box, "keep this off the printed Edition"; the
  answer stays on the site, and the magazine shows the writer's name with "kept off the page".
- **What you'd notice:** one more control while answering, off by default.
- **If I guess wrong:** without it, a candid answer written for thirteen classmates can be
  forwarded to anyone as a file; with it, a page can have a name and no words.
- **Options:** (a) no switch, the magazine prints every answer (b) the switch (c) no switch, but
  the Keeper can leave an answer out before sending.
- **If you don't reply I'll do:** (a), and revisit before M5.

**40. Should a magazine of an Edition nobody wrote in exist at all?**
- **What I'd change:** today it is a cover and a back page that says nobody wrote in, and a
  flag that stops it being sent.
- **What you'd notice:** an empty Edition's page would still offer a two-page file.
- **If I guess wrong:** a two-page file that says nobody wrote in is a small embarrassment; no
  file at all means the door on that Edition does nothing.
- **Options:** (a) the two-page file, never sent (b) no file for an empty Edition.
- **If you don't reply I'll do:** (b).

**41. May a Keeper see the magazine before the Edition publishes?**
- **What I'd change:** nothing until you say: today nothing in an Edition is readable before it
  is out, Keeper included (your 2026-09-09 ruling), and a preview would break that.
- **What you'd notice:** with a preview, a Keeper would see everyone's answers a day early; without
  one, the first magazine anyone sees is the one everyone sees.
- **If I guess wrong:** a preview lets a Keeper catch a bad page; it also lets them read
  early, which you closed.
- **Options:** (a) no preview, the magazine is made when the Edition is out (b) a preview for
  Keepers on the last day (c) a preview of the layout with the words blurred.
- **If you don't reply I'll do:** (a).

**42. Should the magazine say when it was made?**
- **What I'd change:** one small line on the back page: "Printed 16 August 2026".
- **What you'd notice:** that line. It is what tells two people holding different copies
  which is newer, after an answer was edited.
- **If I guess wrong:** without it, two copies of one Edition can disagree and nobody can tell.
- **Options:** (a) the line (b) no line.
- **If you don't reply I'll do:** (a).

**44. Which questions go on the cover?**
- **What I'd change:** nothing; today the three cover lines are the questions most people
  answered, ties by hearts. On "in the loop" that is the summer question, the something-new
  question and the life-since-school one; on the Batch of 2024's it would be "did you have a
  bath today?", because that is the one with the most hearts.
- **What you'd notice:** the three lines under the name on the cover.
- **If I guess wrong:** by hearts, a joke question can head the cover; by order, the first three
  asked head it whatever they are; by the Keeper, one more thing to do before an Edition is out.
- **Options:** (a) most answered, ties by hearts (b) the first three asked (c) the Keeper picks.
- **If you don't reply I'll do:** (a).

**43. Should a photograph's original be kept for the magazine?**
- **What I'd change:** nothing now. A Catch-up photograph is stored at 1920 pixels and the
  original is thrown away; the Collection keeps originals. At 1920 a photograph is sharp across
  a whole page on any screen and print-sharp at the text width; only a printed full-bleed cover
  would want more.
- **What you'd notice:** nothing on screen. On a printed cover, a little softness.
- **If I guess wrong:** keeping originals costs storage for every answer photograph and a change
  to the upload path; not keeping them means a printed cover is 164 dpi.
- **Options:** (a) keep 1920 (b) keep originals from now on.
- **If you don't reply I'll do:** (a).

---

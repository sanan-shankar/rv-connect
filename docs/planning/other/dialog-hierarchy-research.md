# Research digest: dialog visual hierarchy and reading psychology

2026-08-29. Third of three digests (with `dialog-standards-research.md` and
`menus-focus-research.md`). Primary sources throughout; the full brief with all quotes and
the debunked-claims register lives in the session transcript. Apple is the tiebreaker.

## The headline finding

**No mainstream design system permits more than three text levels in a dialog, and most
permit two.** Apple: title + optional informative text. Material 3: headline (optional!) +
supporting text. Atlassian, Fluent, Polaris, Spectrum: two. Carbon and SLDS allow a third,
and in both it is opt-in with one narrow job (Carbon's 12px label = a breadcrumb naming the
object acted on; SLDS's tagline = extra context, never required). **Five levels — what our
UI has been doing — has no precedent anywhere in the field.**

Rules to carry into DESIGN-SYSTEM.md:

1. **Two text levels per dialog: title + optional description.** A third exists only as
   Carbon's object-label pattern (tiny, 4px above the title, part of the title's group).
2. **The description must earn its place.** Carbon: "If the title and the purpose are
   clear... a description is not needed." Fluent: "Don't restate the title in the body."
   Apple: "Include informative text only if it adds value." NN/g's 8th heuristic, 1994
   original: "Every extra unit of information in a dialogue competes with the relevant
   units and diminishes their relative visibility."
3. **Title-as-message collapse** (Carbon): a short message can BE the title, with no body
   copy allowed alongside — the cure for "an otherwise repetitive title and body message."
4. **Left-align by default; centre only short icon-anchored blocks.** M3 is explicit:
   "Alignment with icon: Center-aligned. Without icon: Start-aligned." Butterick: whole
   text blocks are never centred (both edges go ragged); short phrases and titles may be.
   The usual mechanism cited is the return sweep (a centred multi-line block gives each
   line an unpredictable start), but hold it loosely: Slattery & Vasilev 2019 improved
   sweep accuracy with bolded line starts and reading got NO faster, and Dyson 2021 calls
   the explanation "too simplistic". The defensible grounds are the unanimous convention
   (Carbon "always left-aligned", GOV.UK, Lynch & Horton, NN/g glossary, Apple's own
   WWDC25 move to left-aligned alerts "to improve readability") plus the consistent
   preference data — not a measured speed effect, which no study has actually shown for
   centred vs left prose. Either way the rule bites at 2+ lines and does not apply to a
   single centred line. (Our sign-in pages are fine; the old contribute dialog's two-line
   centred fake-title was the failure case. Carbon's empty-state trick when centring
   tempts: centre the BLOCK, left-align the text inside it.)
5. **Hierarchy budget: no more than 3 sizes, no more than 2 large elements** (NN/g,
   practitioner heuristic — flagged as such, not research). Carbon separates its three
   levels by SIZE ALONE, all weight 400, 12→20px.
6. **Spacing does the grouping, not extra headings.** Proximity overpowers colour and
   shape (NN/g Gestalt). Carbon's modal ratios: label→title 4px, title→body 16px,
   body→footer 48px — 1:4:12. M3: title→body 16dp, body→actions 24dp — 1:1.5. The gap
   before the actions is always the biggest gap in the dialog.
7. **Text width ≠ container width.** Carbon: body copy including titles takes a 20%
   right margin inside the modal; components may span 100%. Measure target 45-75ch
   (Bringhurst 66 ideal; WCAG AAA cap 80).
8. **`text-wrap: balance` on titles** (≤6 lines, Chromium limit), **`text-wrap: pretty`
   on body copy** — the orphan-minimising value. Not interchangeable.
9. **Dialog content stays under ~110 words.** NN/g (59,573 page views): users read half
   the words only on pages of ≤111 words. A dialog is the one surface that can actually
   be read in full — keep it under the threshold.

## Debunked claims — never cite these in a spec

- "Design for the F-pattern" inverts its source: NN/g calls the F-pattern the DEFAULT IN
  THE ABSENCE of formatting and says it "is bad for users." The goal pattern is the
  layer-cake (scan headings, skip between) — which also means an extra heading level is
  another thing scanned INSTEAD of the body, not added emphasis.
- The Z-pattern has no eyetracking provenance (1950s newspaper heuristic); NN/g's own
  zigzag study found zigzag layouts scan WORSE.
- The Gutenberg diagram is disclaimed by the textbook that popularised it ("little
  empirical evidence"), and only ever claimed to apply to homogeneous text, not dialogs.
- "White space increases comprehension 20% (Lin 2004)" is a misattribution — Lin's own
  words: "has nothing to do with whitespace." The real study (Chaparro 2004) found a
  TRADE: margins slow reading, improve comprehension.
- "WCAG limits centred text to 1-2 lines" — not in the SC. WCAG prohibits justification
  and caps width; it says nothing about centring.
- "60% read faster left-aligned" — no citation exists. Use the return-sweep mechanism.
- Hick's Law "speaks against, not for, the popular principle that less is better"
  (CHI '20) — do not cite it for option-count minimalism.
- 7±2 measured recall, not visible-UI capacity; modern estimates ~4.

## Numbers for the eventual DESIGN-SYSTEM.md dialog section

- Apple alert: title ≤2 lines. SLDS: title ≤50 chars (the only hard count published).
- Polaris title grammar: {verb}+{noun}, no articles ("Edit email address", never "Edit
  the email address for this order").
- M3 dialog: 24dp padding all round, 28dp radius, min 280 / max 560dp width.
- Atlassian: title heading-medium (20px/wt 653) + body, 24px inline padding, symmetric
  16px title→body and body→footer.
- Third action ("Learn more") discouraged by M3: put extra information BEFORE the dialog,
  not in it.

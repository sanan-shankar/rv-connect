# The Collection's decade scrubber, and the date the file already knows

**Read `brief.md` in this folder first, all of it.** It is the owner's own words from the
session that produced this plan. This document is a ledger that points into it — it is not a
substitute for it, and if the two ever disagree, his words win.

Three pieces of work, in the order they should be done. Everything else in this document is
context so it is never explained twice.

Every decision below is marked:

| Mark | Means | You |
|---|---|---|
| **LOCKED** | The owner decided it, reasons given. | Do not relitigate. Say so if it turns out to be impossible. |
| **RECOMMENDED** | My judgment from the session, with reasoning. | Free to do better. Say what you did instead and why. |
| **OPEN** | Nobody has decided. | Decide it, using taste and the loop. |

---

## 0. Operational context

**Operating rules are `CLAUDE.md` and `AGENTS.md`; stack traps are `docs/TRAPS.md`.** The eight
rules this section used to restate in full — the repo path, no feature branches, the gates, a push
is a deploy, one Supabase database, never `prisma db push`, Jerry Maguire, and how to sign the
chrome-devtools browser in — live there, and the copy here had already drifted from them on two
runtimes. What follows is only what is specific to this campaign.

- **`/lab/collection` renders the real Collection page against 240 made-up photographs**
  (`src/app/lab/collection/_archive.ts`). This is where to build and verify the scrubber. The live
  archive had four photographs and two decades when this was written, which cannot exercise any of
  it. `/lab` requires an admin session.
- **Editing files:** he prefers `bash` + `python3` heredocs with an `assert` on the match count
  over the Write/Edit tools — the same fail-if-it-did-not-match guarantee, fewer tokens.
- **Gotcha that cost this session an hour:** after editing `src/app/globals.css`, Turbopack can
  serve a stale stylesheet indefinitely. A hard reload and `touch` both failed. The fix is
  `mv .next .next-stale` and restart `npm run dev`. Symptom: `getComputedStyle` shows values from
  the old rule. **Verify CSS by measuring computed styles, not by looking at a screenshot** — a
  screenshot of a stale rule looks perfectly plausible.

## 1. What shipped in the session before this one — do not undo it

Ten commits on `main`, all pushed. The contribute room was rebuilt end to end. The parts
most likely to be accidentally reverted:

- The contribute dialog is a **carousel**, one photograph at a time, cross-fading on
  `<ImageViewer>`'s exact step (opacity only, two *opposite* curves so the paper does not
  flash through the middle — sampled at 1.5% peak). The stage is **one height per drop**:
  `min(240px mobile / 380px desktop, the tallest photograph's drawn height)`, computed with
  `100cqw` in a container query so it is arithmetic rather than measurement.
- The date is **one numeric box**, and how much you type is the precision — blank is
  unknown, `197` is the 1970s, `1978` is a year, and only then does a month exist. The
  floating label reports what it understood ("Filed under the 1970s") *only* at three digits,
  where the box does not already show it. **The ten decade pills are gone and are not coming
  back.**
- The encoder for that lives in `src/lib/collection.ts` as `photoDate`, pinned by
  `src/lib/collection-date.test.mjs` — which also holds the pre-existing read-side tests for
  `takenLabel`, plus a round-trip test that write and read agree. **That file already
  existed and was clobbered once by a careless `Write`; append to it, do not replace it.**
- Type floor is **14px** across the contribute flow. `text-wrap: balance` on any wrapped
  prose. Hover changes colour and never moves a control; the press keeps its sink.
- `.dotsep` is a **drawn** dot, not the `·` glyph, with two `em`-based corrections — one for
  flex rows (where `vertical-align` is ignored outright because flex items are blockified)
  and one for the four inline sites. Verified 0.008px and 0.024px off centre.

## 2. The bug already fixed, which you need to understand before touching the rail

Pressing a decade used to make the rail vanish, locking him into that decade with no way out
(brief §14). Cause: `loadPhotos` counted decades through the **same `where` the river used,
`era` included**, so the groupBy returned one row, and `<DecadeRail>` hides itself below two
marks. Fixed by building a second `where` with `era` stripped (`facetFilters` in
`src/app/(main)/collection/actions.ts`) — **a facet must not narrow its own tally**. Bucket
and search stay in the count deliberately.

Keep that rule intact whatever else changes.

## 3. Piece one — the scrubber (the big one)

### What he wants, and why

> "it's definiitely not in it's full potential now. can be much better and tie in with the ui
> better instead of just suddenly changing the positions of phtoos when you click on it"

> "I love the idea and I love showing how many photos in each year with the grey line."

**LOCKED — the rail SEEKS, it does not filter.** Pressing 1970s must not replace the grid
with a filtered set. It takes you to that stretch of one continuous river; photographs above
and below still exist and you keep scrolling into them. The rail then lights **the decade you
are currently in**, read from what is on screen, rather than a filter you set.

**LOCKED — both directions.** He was offered a cheaper version (jump down, page onward only)
and explicitly chose the full scrubber, so scrolling up from where you land must continue
into later decades. This is the part that does not exist yet and is most of the work.

**LOCKED — the marks stay.** The grey line whose length is how many photographs a decade
holds is the thing he loves. Do not replace it with plain words.

### What is actually there today

- `src/components/collection/year-rail.tsx` — the `xl:flex` margin rail (it was `decade-rail.tsx` when this was written; it counts in years now)
  and `<DecadeStrip>` (the narrow-screen line of words). **The strip is no longer rendered**
  — he rejected it outright ("Remove the decades and undated thing from mobile. It looks
  really bad."). The component is still in the file, unrendered, awaiting your decision. It
  is fine to delete it.
- `src/lib/river-cursor.ts` — pure, tested, and where the paging lives. `encodeCursor`,
  `decodeCursor`, `afterCursor`, `orderByFor`. Cursors are **opaque on the wire**; the
  client's only contract is to hand back what it was given, so you can change the encoding
  freely.
- The sort key you will seek on: **`Photo.takenKey`**, a Postgres `GENERATED ALWAYS STORED`
  integer, `year * 100 + month`, `0` when undated (a real answer here, not a missing one).
  Ordered `takenKey DESC, id DESC`, with a covering index
  `Photo_river_taken_idx (approved, isHidden, takenKey DESC, id DESC)`. The decade→year
  mapping is `ERA_START_YEAR` in `src/lib/collection.ts` and the CASE in
  `prisma/migrations-manual/2026-08-28-collection-river.sql`, which are twins and must stay
  so. **Verified by reading both.**
- `loadPhotos` in `src/app/(main)/collection/actions.ts` returns
  `{ photos, nextCursor, total?, decades? }`; `total` and `decades` ride only on the first
  page.

### The shape I would build — RECOMMENDED, and section 3 is yours to improve

Seeking to a decade is a synthetic cursor: `takenKey` one above that decade's top, so
`afterCursor` returns the newest photograph in it. Paging backwards is the mirror of
`afterCursor` (`takenKey >` instead of `<`) with `orderByFor` reversed, taking N rows and
flipping them before returning. I would add `beforeCursor` and a reversed order beside the
existing ones in `river-cursor.ts`, and give `loadPhotos` a direction, so the server side
stays pure and testable — that file exists precisely because "an off-by-one silently loses a
photograph rather than looking wrong", and this change is exactly that risk again.

**Pin the new cursor arithmetic with tests in `src/lib/river-cursor.test.mjs`** (or beside
it) before wiring any UI. The boundaries that will bite: the newest and oldest photograph in
the archive, a decade holding exactly one, two photographs sharing a `takenKey` (the `id`
tiebreak), and the undated bucket at `takenKey = 0` which sorts last and must not be
reachable by scrolling *up* out of the 1920s.

**OPEN — the client mechanics, and this is where the quality is.** Prepending rows above the
scroll position without the viewport jumping is the whole feel of it. Whatever you do, the
photograph under the reader's eye must not move when a page arrives above it. Decade headings
already exist in "Chronological" order (`photo-river.tsx`) and are the natural anchors for
reading "which decade am I in".

**OPEN — what the rail does when the order is not Chronological.** Seek only means anything
along a date spine; in "Newest" the river is sorted by upload date. Switching the order for
the reader, hiding the rail outside Chronological, or something better, is yours. Say what
you chose.

**OPEN — years inside decades.** He expects it later, not now:

> "I expect we might have to divide up the decades into years later on once more pictures
> come in."

Do not build it yet. Do leave the door open — an index that gets finer as you travel is a
scrubber; a filter that gets finer is just a longer menu.

### Tried and rejected

- **Filtering with an animated transition** was offered as the cheaper option and he did not
  take it. Do not quietly fall back to it.
- **A scrolling line of decade words on narrow screens** (`<DecadeStrip>`) shipped and was
  rejected on sight. Two words with no marks beside them carried none of what makes the rail
  worth having.

## 4. Piece two — the scrubber on a phone

**LOCKED — "A proper scrubber down the right edge."** His words, choosing it over putting
"when" into the toolbar sentence and over having nothing on mobile.

**RECOMMENDED:** a thin vertical strip pinned to the right of the grid, marks only and no
words, with the decade appearing as a bubble while the thumb is on it — the iOS/Photos
pattern. It should feel like a thumb index in a book.

**Note the gap you are closing:** there is currently **no way to filter or navigate by
decade at all under 1280px**, because the strip was removed and the rail is `xl:flex`. That
is deliberate and temporary and it is this piece's job.

**OPEN — everything about how it feels.** Whether it appears only while scrolling, whether it
is draggable or tappable, how the bubble behaves. Build it, put it on a phone viewport at
390×844, drag it with real content in `/lab/collection`, and keep going until it feels like
the thing it is imitating. That loop is the point; nothing in this document should stop you
doing something better than it describes.

**What good looks like:** a member can get from the newest photograph to the 1970s and back
in under two seconds without ever seeing an empty grid or losing their place, on a phone,
with 240 photographs loaded.

## 5. Piece three — the date the file already knows

> "also isn't it possible to scrape the when of the photo from the metadata? like have that
> as the default if it's reliable metadata. and if they want to edit the year they can but
> otherwise it ships withi that"

**The trap, which he was told and then decided around:** this is a heritage archive, and a
large share of contributions are phone photos or scans **of printed photographs**. Their EXIF
`DateTimeOriginal` is when the *scan* was made, not when the photograph was taken. Defaulting
blindly files a 1978 photograph in the 2020s — confidently, and in a way the contributor is
unlikely to correct because the pre-filled year looks plausible. A wrong year is worse than a
blank one: blank is honestly "unknown", and the decade rail then repeats the lie.

**LOCKED — the asymmetry, extended to 2010.** He chose "default only when the date is old",
then extended the threshold himself:

> default only when date is old is good but maybe extend that to 2010

So: an EXIF capture date of **2010 or earlier** can only have come from a real camera of that
era and is trustworthy enough to **pre-fill** the year (and month) — a print scanned today
carries today's date, not 2004. A date **after 2010** is ambiguous and must be **offered**,
not assumed.

**OPEN — how the offer reads.** A suggestion under the field ("The file says June 2019. Use
it") is my instinct, but the field's floating label already reports what it understood and
may be the better place for it. Yours to design; it must not add a permanently-visible
element to a panel he has just had cleaned of "an excess of elements and border".

**Unverified, check before relying on it:** I did *not* confirm that EXIF survives to a point
where the server can read it. What I did confirm is that `sharp` runs server-side on the
bytes in `src/lib/image.ts` (including a `.metadata()` call), so the capability is plausible.
What you must check: whether the **direct-upload path** (`contributePhotoDirect`, bytes go
straight to R2 from the browser) gives the server the original bytes at all, or whether EXIF
must be read **client-side** before upload. Also confirm whether the existing re-encode to
WebP strips EXIF before anything can read it. This is the first thing to establish; the whole
piece depends on it and I have not verified it.

**Also unverified:** whether `sharp` alone exposes `DateTimeOriginal` or whether a parser
(`exif-reader`) is needed. Check the storage limit rule before adding a dependency — nothing
over 200MB without asking, and this should be tiny.

## 6. What "good" looks like overall

- `npm run check` and `npm run visual` green. `/collection` is deliberately **not** masked in
  the visual suite, so its baseline moves whenever a photograph is added — read the diff, and
  if it is only new photographs, rebaseline and say so.
- Screenshot at **1440×900 and 390×844**, minimum two rounds, and compare in numbers rather
  than impressions. Measure with the `chrome-devtools` MCP; write a Playwright spec only to
  pin a number you have already seen.
- He notices pixels. In this one session he caught a 2px dot, a 6px baseline, a 10px row
  mismatch and a two-word ragged wrap. Measure before claiming something is aligned.

## 7. The autonomy, stated out loud

Sections 3 (client mechanics), 4 (how the phone scrubber feels) and 5 (how the offer reads)
are **yours**. The marks and the seek-not-filter model are his and are settled; nearly
everything about how they feel is not. He asked the previous session to "surprise me with
some amazing ui" and then, having got it, immediately found four things wrong with it — that
is the working relationship. Build it, look at it, and bring back something better than what
is written here.

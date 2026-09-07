# The front runner: what to build, and what is already settled

**Opened 2026-09-07.** Fifteen designs have been drawn and he has rejected all fifteen. This file
exists so the sixteenth is not the sixteenth attempt at the same thing.

## Read these, in this order, before drawing anything

1. [`review-2026-09-06.md`](review-2026-09-06.md) **in full.** His verdict on every design, in his
   words, 51 numbered paragraphs. It is later than everything else and it wins.
2. [`brief.md`](brief.md) **in full.** Still the source of truth for what Catch-ups is FOR.
3. This file.
4. `docs/spec/DESIGN-SYSTEM.md`, and `src/app/globals.css` where the two disagree.
5. `src/app/lab/catchups/sketches/` as it stands, and the shipped reader at
   `src/app/(main)/catchups/round/[editionId]/page.tsx`.

Do **not** read `directions.md` Parts 2 to 6 as a source of design ideas. It is the record of two
rejected passes. Its Part 1 (the architecture) is still broadly good and is the only part worth
reading, with the corrections in R2, R21, R29 and R33 applied.

## The bar, which is the whole problem

> R46: "The sad part is none of these. There is nothing here that I prefer to what is shipped."

> R36: "when I created the directory ... I was like, oh wow. This is it. For directory, that is the
> way to do it ... The biggest example is probably profiles. When I made profiles, I went through
> like 60 different versions of them ... And now I'm just so happy with it. For profiles, this is
> the right answer. This is just as good as it can be. The catch-ups, I still haven't had that
> feeling."

> R51: "the login/sign-in experience. That was screwed up. We changed a lot of things and now it's
> just right. Now I'm never gonna change it again ... That's how I need to feel about catch-up."

**And the trap, which a session will fall into if it does not read R50.** Those four are named as
examples of a FEELING, not as a parts bin:

> R50: "I didn't mention those examples for 'that's what I need', and me realising that okay this is
> exactly what is suitable for us so that you can just copy those things. Those things worked for
> those things, right? You can't just apply the same things anywhere else. It's more abstract than
> that ... You have to make what is right for this. You can't just copy elements from that."

So: do not port the Collection's year rail, the directory's grid, the letters type scale or the
profile's layout into Catch-ups. The thing to reproduce is that a surface can be solved so
completely he never wants to touch it again. Two tests, both his, from CLAUDE.md: **does it give you
any dopamine**, and **can you tell it belongs to this app while looking like nothing already in
it** (brief ¶42).

## Settled. Do not re-open these.

Every one of these was drawn some other way and rejected. The paragraph reference is his sentence.

| Settled | Where |
|---|---|
| **Tiles.** Answers sit on card stock. The tile-less experiment is over: small type on the textured background is not readable, and letters only gets away with it by being bigger. | R40, R18, R22 |
| **One type scale, standardised.** No length-dependent promotion, no display sizes appearing mid-page. | R15, R38, R44 |
| **Green is not a surface.** Green is the app bar the app already has, and an accent on a control. No green question plates, no green sheets, no green titles. | R30, R39, R44 |
| **Persistent navigation, always on screen.** Not something you scroll back to the top for. | R10, R37 |
| **If a green bar exists it is the TOP one.** No second bar at the foot. | R41 |
| **Birds are big.** They are not to be the size of the heart icon. | R25, R23, R38 |
| **No counts, anywhere.** Not answers, not photos, not questions, not people, not "13 wrote in". | R32, R21, R30 |
| **No question numbers.** | R30, R1 |
| **No dot, and no underline, as the current-item indicator.** He does not know what it should be. That is a design problem, below. | R28 |
| **Heart bottom left**, with the replies icon beside it, at the feed's sizes, in the same place on every tile. | R31, R15, R26 |
| **Empty answers are deleted, not drawn.** | R21 |
| **"Asked by Siddhant", never "Siddhant asked".** | R29 |
| **A pasted link never prints as a URL.** Two rows: the still, the title, whoever made it. No platform name, no middle dot. | R31, R6, R26 |
| **Photographs go edge to edge** and their gaps are not hairlines. | R32, R16 |
| **One scrolling column of content.** No side-by-side content columns, no third column, and on a laptop the navigation is on the RIGHT. | R11, R22, R8 |
| **The reader does not list who wrote in.** The names are on every answer already. The roster belongs on the Catch-up's home. | R2, R17, R38 |
| **Nothing about Round 2 in Round 1.** | R16, R23 |
| **No timestamps on answers.** | R10 |
| **Say it once.** "in the loop", "Round 1" and the date appear once between them, not three times each. | R13, R27 |
| **The background stays on the phone.** | R17 |
| **A fixed side rail is fixed.** Not scrolling at a tenth of the page's speed. | R13, R23 |
| **No pill soup.** | R13 |

## The five problems that are NOT solved, and that the front runner has to solve

This is the actual work. Every rejected design either dodged one of these or answered it badly.

**1. A persistent bar that carries a long question.** He likes the idea and has asked the same
question three times without getting an answer:

> R19: "I do like the idea of using the top bar like you are now, so saying 'in the loop, Round 1',
> that's done fine. And then the question. But what if the question is long? How does it fill into
> somewhere? How would we handle that? I don't want a bunch of dot dot dots everywhere."

> R26: "it's only like 20 characters of the question. Isn't that such an obvious indication that we
> shouldn't do it that way?"

Truncation is not an answer. Neither is a bar that silently resizes on every scroll. The real
questions in this Round run to about 90 characters.

**2. What the current-question indicator is.** Not a dot, not an underline, and he has said outright
he does not know what it should be (R28). He does want the position shown, and liked the idea of a
subtle one, in the top bar rather than hugging the content (R34), as long as it is "sleek" and not
"way more busy than it needs to be" (R19).

**3. The question navigator.** Every single one of the fifteen drew the same sheet, and he was
explicit about what he wants instead:

> R24: "Question navigation is literally identical across everything ... I honestly don't even mind
> that style, but they've all done such a mediocre job of it. So I'd like to see that style done
> properly with some good attention put on it, but then also done in a bunch of different ways."

Known constraints: it must not be all green (R39); it must not say "Jump to" or "In this Round",
just the Catch-up's name (R39, R43); no numbers, no counts, no answer previews (R30, R4); swiping
down from its top must close it, and if that is guaranteed the X can go entirely (R43); it should
not necessarily come from the bottom (R39); and the basic version is "totally fine" but "it can be
a bit more than that. This is so basic" (R43). Jumping should be less jumpy, and slower (R37).

**4. A short answer in a tile.** Both obvious fixes are already rejected: shrinking the tile
("made super small because the answer was short. Don't like that") and enlarging the type ("the
'enough padel to conclude squash is better' tile is atrocious on mobile", R14). The original
complaint stands: brief ¶31, a three-word answer using 15% of its tile.

**5. Whether the whole thing is better than what ships today.** R46 is the only test that matters
and no design has passed it. If a draft is not obviously better than the shipped reader, it is not
the front runner, and saying so is more useful than shipping it.

## How to work

- **One front runner, drawn by hand.** Not a set of options, not a fan-out. See handover F32, and
  R47: "I'm sure you have enough to construct a really good front runner right now."
- **The navigator is the exception**: draw that two or three ways, because he asked for exactly
  that (R24).
- **Delete freely.** R47: "you are okay to delete everything else." Everything currently in
  `src/app/lab/catchups/sketches/_directions/` is dead; the writing in `directions/` and the
  history keep whatever was worth keeping.
- **Look at every screen yourself**, at 390 and at 1512, before saying anything is done. Three of
  the four faults found in the last pass were invisible in code and obvious in a screenshot.
- **Tie it to the rest of the rework.** R48: "make sure that it ties in with everything else that we
  are trying to do with this rework: just making everything a lot more sensible and more usable.
  Something Apple would do."

## What was built, 2026-09-07

One reader, by one hand, live at `/lab/catchups/sketches`. Three views: **Reader**, the phone page
at 390, which scrolls, docks and opens for real; **Screens**, five 390x844 stills of moments deep in
the page; **Laptop**, the same page at 1512. The fifteen rejected sketches are deleted (R47).

**Where the invention went, and why there.** Every rejected design restyled the answers and drew the
same navigator. He kept saying the answers were fine (brief ¶27, R37, R40) and that the navigator
was the same mediocre sheet fifteen times (R24). So the answers are paper tiles at the feed's own
sizes and the one bespoke object is **the strip under the app's green bar**, which is the navigator.

The five problems, answered:

1. **A persistent bar that carries a long question.** The green bar carries the Catch-up's name
   (R19, R41). Under it, a glass strip: at rest "Round 1 · 15 August 2026", the one place either is
   printed; once a question's heading has scrolled under it, that question, in full. Its height is
   set by the question and changes only when the question changes, never with the scroll. The
   300-character cap is five lines on a phone and none is cut. The Screens view has that exact case.
2. **The current-question indicator.** A thin cinnamon line along the strip's top edge grows from the
   left as you read: how far through the Round you are, R28's line given a job, in the top bar as
   R34 asked. When the strip opens, the same line runs down the left of the list and STOPS at the
   question you are in. The end of a measure is the mark: not a dot, not an underline.
3. **The navigator, three ways.** (A) The strip unfolds downward in place: not from the bottom, not
   green, no title because the bar already says the name, no X because the strip is still under the
   thumb. This is the one the live Reader uses. (B) A paper sheet from the foot, the name as its
   title, no lines between rows, no X, and the current row marked with the app's own selection tint
   instead of the line, so the two marks can be compared. (C) The whole page becomes the contents,
   set in the heading face. A pick glides, slower for a longer trip (R37).
4. **A short answer in a tile.** A tight tile, not a smaller one and not bigger type. One-line
   byline (bird 40, name 17 medium), the words 10px under the name, the heart 6px under the words,
   and the photographs bled to the tile's edges with 4px gaps. "your mama" is a 130px tile.
5. **Better than shipped.** A member's first screen holds a whole answer (the shipped reader's holds
   none, recon R18); the question is always named; the list is always one tap away; a pasted song
   or video is a small card with its real cover; nothing is counted, numbered, timestamped or said
   twice. Whether it is *his* "oh wow" is his to say, and only his.

**His to decide, on his phone.** Which navigator, A, B or C; the line or the tint as the mark;
whether the strip's resting label should be the Round's meta or nothing. Then S4 draws the rest of
the surfaces from this reader's parts.

*Answered 2026-09-07: navigator **A**, and it is now the only one drawn live.*

## The sixth problem, answered 2026-09-07 (S4c): the title

It was the last note of his from the first review with no answer against it, N11:

> "I'm not too pleased with the title though. Like, In the Loop Round 1, 15th August. It's super
> basic. It works okay. I feel like we can still make it much prettier. The title. It's just not
> that beautiful."

**What was wrong, and it took looking rather than reading.** The head was a name in the heading
face over a *middle-dot meta row* — "Round 1 · 15 August 2026" — which is the app's most generic
construction and the one he has attacked by name three separate times: R4 (*"'In the loop, Round
1', middle dot, and the date. I think that can be just laid out so much better"*), R32 (*"You just
have to add a middle dot, right? Because without a middle dot, life would be incomplete"*) and R44
(*"Does it have to be middle dots?"*). It also put 67px of ink in the corner of an 856px column
with nothing using the width, so it read as a label rather than as a title.

**Three moves, and none of them is a bigger font.** 30px stays: it is `PageHeader`'s size on every
other page, and *"random massive fonts"* is a thing he has stopped twice (R38, R44).

1. **The Round number goes**, which makes the dot go with it. `architecture.md` §5 had already
   settled *"No Round numbers, anywhere. A Round is identified by its date"* on his own sentence
   (*"It doesn't matter what round, it's going to be round 15"*); the reader was the last surface
   still printing one, from D51, which predates that. The phone strip at rest now reads
   "15 August 2026" and nothing else.
2. **The date joins the title** instead of labelling it: same line, same face, one baseline, 20px
   (`h3` on the documented ladder). A masthead is a name and a date. Not at the far right of the
   column, which would recreate the fault this page exists to remove — 63 to 76% of every shipped
   index tile was the gap between a title at one end and a control at the other (recon I2).
3. **The Round opens the way its questions do.** Every question is announced by a 32px cinnamon
   mark; the Round is announced by the same mark at the width of the whole column, fading out to
   the right. One vocabulary, two scales, so the page says *this is the whole thing, those are its
   parts* without a word. It is R28's line given a job (*"if we can create some use for that line,
   that could be good"*) and it is a higher level of abstraction rather than a new ornament (¶42).
   Above the name, never below it: a rule under a masthead is a divider, and the shipped reader's
   is the one he deleted on sight (¶27, *"Can totally delete that"*).

**Considered and not taken**, so nobody re-treads them: the Catch-up's picture as a banner here
(the reader is the Round, not the Catch-up, and he rejected the picture wherever it was decoration
— *"this tiny hanging thing"*); the Round's photographs as a frieze (that is the cover you tapped
to get here, said twice); the date at the far right end of the rule (the stranded-gap fault); the
date as the head of the rail (it makes the navigation the Round's masthead, a second identity for
one object); and a solid cinnamon rule rather than a fading one, which was drawn and read as a
container's top border cut off at the rail.

Only on the wide laptop. On a phone the green bar carries the name and the strip carries the date,
which is the same lockup at that size; on a narrow laptop the strip is back and already has a
cinnamon line along its top edge, so a masthead rule 28px under it would be two cinnamon lines
stacked.

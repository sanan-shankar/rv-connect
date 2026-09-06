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

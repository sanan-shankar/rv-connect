# Catch-ups fix brief (owner review, 2026-07-25)

The owner walked the whole Catch-ups feature and found it, in their words, "such slop".
This file is the binding list of fixes. Everything here is a direct instruction, not a
suggestion. Where the owner's words are quoted, they are verbatim.

`docs/spec/catchups.md` predates this review and is written in exactly the voice the
owner is now rejecting. **Where this brief and the spec disagree, this brief wins.**
The spec's mechanics (state machine, timing, no-cron advance, the too-few-answers rule,
the scope fences in section 8) are all still binding. Its copy is not.

---

## 0. The two rules that generated most of the complaints

**RULE A: no subtitle under a heading unless it says something the heading does not.**
The owner's diagnosis: "you've picked this pattern of under every heading, you need a
subheading even when it's not needed." Almost every subtitle in this feature restates
its heading in softer words. Delete them. If you find yourself writing explanatory copy
under a heading, the answer is a better heading, not a subtitle.

**RULE B: stop reaching for "gentle", "quiet", "small", "warm", "a round of".**
Verbatim: "Tell me what the fuck is a gentle round of questions? How can a round of
questions be gentle?" and "you're not thinking what is best for the user... you think,
oh, text here would be good, what useless text can I put here." Every one of these words
is banned in Catch-ups copy. Say the thing plainly or say nothing.

Also still binding project-wide: no em dashes; say "Rishi Valley", never "Alumni";
hover never moves a control (colour change only, `active:scale` is fine).

---

## 1. Copy to delete outright

| Where | What to delete |
|---|---|
| `app/(main)/catchups/page.tsx` masthead | The subtitle "A gentle group newsletter: everyone answers a few prompts..." Delete it. The heading "Catch-ups" stands alone. Both the normal and the P2021 branch. |
| `app/(main)/catchups/page.tsx` | The "Your Catch-ups" eyebrow heading. Owner: "obviously these are your catch-ups because you're in the catch-up section and you're logged in." Delete it and the invisible mirror copy that aligns the rail. |
| `index/explainer-band.tsx` | KEEP the pill. Owner: "I guess we can leave that pill for now." But delete the trailing "a gentle group newsletter on a rhythm." clause from it, and delete the long explainer paragraph in the full-card variant. |
| `[catchupId]/page.tsx` | The subtitle "A gentle round of questions for {group}, answered together and gathered into one issue." Delete entirely. |
| `[catchupId]/page.tsx` title | Should read as `{Group name} catch-up`, e.g. "Batch of '23 catch-up". Singular. Owner: "that's plural for one catch-up that we're looking at, can just be catch-up." |
| `home/console-collecting.tsx` | "Up to 3 questions waiting on the Keeper at a time." Delete. |
| `home/console-collecting.tsx` | The "In this Round · N of 12" counter. Replace with a plain "N questions in this round". The cap is already raised to a silent 40 and must never be printed. |
| `home/console-collecting.tsx` | The SECOND "add from the library" button. There is already one; the duplicate lower down goes. |
| `home/reminder-pref-control.tsx` | The explainer sub-copy under "Reminders". Delete; the three options explain themselves. |
| `home/archive-shelf.tsx` | The explainer under "The archive" about issues living there once published. Replace the whole heading+subtitle with just **"Published issues"**. Owner: "You don't have to freaking explain every single thing." |
| `round/masthead.tsx` | The cinnamon `CATCH-UPS` eyebrow above the h1. Owner: "it's there in the sidebar, a couple of centimeters away." Delete. |
| `round/masthead.tsx` | `contributorsCopy()`'s "A small Round. {names} wrote in." Owner: "you're not gonna say a big round, a small round, a medium round. Like, what is the point of that?" For 1-3 contributors just name them ("Sanan Shankar wrote in."); 4+ keeps "N of the group wrote in." |
| `round/[editionId]/page.tsx` | Any "replies aren't open" line. Owner: "If I'm reading the issue, obviously the replies aren't going to be open yet." |
| Round header | The Catch-up's name is repeated three times on the published page (masthead h1, meta line, and again below). Print it ONCE. The meta line keeps only "Round N" and the published date. |

## 2. Layout and spacing fixes

1. **Delete the round-status tile entirely** (`home/console-collecting.tsx`, the pill +
   `MemberStrip` + `ProgressRing` block). Owner: "this green ass circle is pretty
   useless... my bird profile avatar thing is over there... that whole top tile is just
   incredibly useless. We can delete the whole thing." The remaining status information
   (which window is open, how long is left) belongs as one plain line, not a tile.
2. **Padding**: on every Catch-ups tile the top padding is visibly larger than the left
   padding. Owner: "we've solved this problem everywhere, but then here you've done this
   so poorly." Make the padding symmetric on all four sides using one LiftKit token.
   Audit every card/tile in `components/catchups/**`.
3. **The tiles are too big.** Owner: "these four tiles are so big. There's so much
   padding on each side. Doesn't need to be this big." Tighten.
4. **"Ask everyone something" appears twice** in the submission tile: once as the
   heading and again as the textarea placeholder. Keep the heading; make the placeholder
   either empty or something that is not the heading again.
5. **The write-a-question box must be bigger and auto-growing.** It is a single short
   input today. Make it a textarea that grows with content.
6. **The Keeper controls box** is a big box whose only real control is "Open answering".
   Owner: "for that we have a whole box called keeper controls... all these boxes are so
   big." Do not keep an almost-empty box: put the single transition action where the
   Keeper is actually looking (in the console, next to the questions) and drop the box.
   Settings stays, as a plain link; the settings dialog itself is fine and unchanged.
7. **Published page must not hug the sidebar.** `round/masthead.tsx` uses
   `-mx-5 sm:-mx-7 lg:-mx-10` to cancel the app shell's padding, so the band runs flush
   against the green sidebar with zero gutter. Owner: "This part is hugging the green
   sidebar. There's no margin from the green sidebar." Remove the full-bleed negative
   margins; keep the page's normal gutter. Same in that route's `loading.tsx`.
8. **The "Round 01" plate numeral** is badly placed at top right and much worse on
   mobile, where it creates "a massive amount of white space". Either integrate it into
   the masthead composition properly or remove it.
9. **The bird avatar in a white box** on the published masthead: drop the white box.
   More generally, stop placing a bird avatar wherever a region looks empty. Owner:
   "you've just randomly put the bird avatar in different places. Whenever you're like,
   oh, this feels empty, let me add the bird avatar here."
10. **Answer cards on the published page**: padding is enormous while the heart is tiny.
    The heart is `LoveButton size="sm"` (12px icon) where the rest of the app uses `md`
    (18px). Use `md`. Then bring the card padding down so the two are in proportion.
11. **Thin white rules** across the published page: reduce to the minimum that actually
    separates content. The decorative perch-wire SVG goes.
12. **Cadence picker** (`create/cadence-control.tsx`) has no transition when you change
    option. Add a crossfade on the selected state (opacity only, plus the existing
    `layoutId` thumb if present). No jagged snap.

## 3. Answering page

1. **Delete the ruled lines.** Owner: "It doesn't even write on the lines. It writes
   through them... we don't need lines. Why do we need lines?" Remove `RULED_SHEET_BG`
   from the answer textarea entirely. A clean surface, correct baseline, no drift.
2. **Delete the per-question Spotify link field.** Owner: "why would I need a Spotify
   link for every question? And what if they don't want to paste their music on
   Spotify?" Music is now its OWN question type (see section 4), not an attachment
   bolted onto every question.
3. Keep the progress ring. Owner: "The circle that shows the progress here is good. It's
   actually useful."
4. Remove the duplicated counter: the rail already says "N of M shared", and each card
   repeats "Question N of M". Keep one.

## 4. Question kinds (already wired in the library)

`src/lib/catchups.ts` `CATCHUP_PROMPT_SETS` has been rewritten. Two of the five sets are
not text questions; `promptKind(category)` in `src/lib/catchups-types.ts` returns the
kind:

- `photo-wall` -> kind `"photo"`. Everyone adds ONE picture. The Round prints them as a
  wall. Reuse `answer/photo-attachments.tsx`, limited to 1.
- `songs` -> kind `"songs"`. Everyone adds songs by NAME. Owner: "you should just be
  able to search for the song... let them just type the name of the song instead of
  pasting links."

For the answering UI, switch the control on `promptKind(prompt.category)`.

**Known limitation to leave in place and flag, do not hack around:** `CatchupEntry`
stores exactly one song (`songUrl`/`songTitle`/`songArt`). "Up to five songs" needs one
new nullable JSON column and therefore a migration, which this pass is not doing. So
implement the `songs` kind as a by-name entry against the existing single-song fields,
and leave a clear TODO naming the column that would lift it to five. Do NOT smuggle an
array into `songTitle` or reuse `images`.

## 5. Create flow

1. **Remove question-picking from creation entirely.** Owner: "Why did I have to add
   questions? ... why did I have to ask questions in the previous page when this page is
   the asking questions page? Then the previous page should literally just be pick the
   rhythm, right? Am I going crazy?" They are right. Creation is: pick who it is with,
   pick the rhythm, start. `seed-questions-picker.tsx` comes out of the create flow.
   The first Round opens in `collecting` with no questions, which is the correct initial
   state for a screen whose whole job is collecting questions.
2. **Delete the live preview card** (`create/round-preview-card.tsx`). Owner: "the
   preview box is so useless. It just says everything that it says on the left. It
   actually is the most useless thing. We have to get rid of that."
3. With both gone the create sheet is short. Do not pad it back out with a new box.
   Let it be a small, fast form.

## 6. One surface, not three

Owner: "Why do I have to click answer now? Why isn't this page just where I answer?
This page has no functionality... it should let you add questions when it's adding
questions, it should let you answer them when it's answering, and then it should let
you read the issue when it's publishing. That same one common space. I don't have to
navigate within it to different places."

So `/catchups/[catchupId]` is the single surface, and what it shows is driven by the
Round's status:

- `collecting` -> the question list plus the box to add one (already true)
- `answering` -> **the answering experience inline**, not a link to `/answer`
- `preparing` -> the holding scene (unchanged)
- `published` -> **the issue readable inline**, not just a link to `/round/[id]`

Keep `/answer` and `/round/[editionId]` as real routes: they are deep links, they are
shareable, and the published issue in particular needs its own URL. But reaching them
must not be a required step. Someone sitting on the Catch-up home during the answering
window answers there.

If the inline answering surface would be a large lift, do the `published` case first
(the issue reads inline) and flag the `answering` case, rather than half-doing both.

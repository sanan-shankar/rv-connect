# A question is a page

**Thesis:** A Round is an issue you turn through with your thumb: every question is its own page with the browser's own vertical scroll inside it, a folio at the foot of the phone always says which question you are on and how far through it you are, and the 49,000-pixel scroll stops existing.

**Designer:** 04 paged, reading.

**The bet, as given:** THE PAGED ISSUE. A Round is not one scroll. A question is a page. Moving between questions is a real act you do with your thumb, the way Apple News+ pages between stories, and something small and persistent always says which question you are on and how many are left. Vertical scroll stays inside a question. The forty-answer question in the pressure fixture is your hardest case; say exactly what a page does with it. Do not disable the native scroller.

## 1. The idea

You open Round 1 of "in the loop" on your phone and the first thing on the screen is the first question, set large in Baskerville, with the first answer under it. No masthead band, no row of birds, no chip bar. At the foot of the screen sits a strip of paper the height of a toolbar. Its top edge is a hairline broken into eleven pieces, and one of them is lit green. The strip reads IN THE LOOP · ROUND 1 on the left and QUESTION 1 OF 11 on the right; under that, the question you are reading, and ANSWER 1 OF 13. You read down. The page scrolls the way every web page scrolls, with the browser's own momentum and rubber band, and the lit piece of the line fills as you go. When you are done with question 1 you push the page left with your thumb. Question 2 slides in beside it, at its top, and the lit piece moves one along. Tap the strip and the eleven questions rise up as a sheet; tap one and you are there.

That is the whole bet. A Round is eleven pages, a cover and a back page, not one document. Today's reader renders 133 answers into one 55-screen scroll and then loses the only thing that could steer it. This one never renders more than one question at a time, so the page you are on is thirteen answers long at most for a real Round, and the thing that steers you is pinned under your thumb. It bets that the act of turning a page is what makes a Round feel like an issue rather than a feed, and that once each question is its own place, "where am I" and "how much is left" stop being questions the reader has to ask.

What it refuses to do. It does not collapse anything by default (Wikimedia measured what that costs). It does not take the vertical scroll away from the browser: the page container declares `touch-action: pan-y`, the document is the scroller, nothing is sized in `vh`, and the only thing the direction adds is a horizontal gesture the browser was not using. It does not put a Back button anywhere. It does not put a carousel inside a page, because a page that swipes cannot also hold strips that swipe. And it does not print a masthead at the top of the reader: the name is on screen at every depth as the first line of the folio, and the masthead in full is the cover page, one swipe to the right of question 1.

What it is not. The thing it most risks resembling is Instagram stories: a segmented line and a thumb that moves you sideways. The differences are the point. The line is at the foot, not the top; it moves only when you do, never on a timer; the fill inside a piece is how far you have read, not how long you have looked; and the pages under it are as tall as their content and scroll. It is also not an e-reader: Kindle and Books pages are fixed height and paginate the text, and this page is a web page that happens to have neighbours.

Where it departs from the architecture's RECOMMENDED lines:

- **1.3, Before.** Before holds every published Round except the one Now is showing. With one Round published and the next not yet open, Now shows Round 1's cover and Before is absent. This reads the "either its cover or itself, never both" rule strictly: the same cover twice on one home is the smell the rule exists to cut.
- **1.4, the cover.** The cover carries a derived picture (the most-hearted photograph of the Round, absent when there are none) and a second line the architecture did not ask for: the eleven-piece line showing how far the member has read. On the list row the cover is condensed to a state line and that same line, not a card. A pointer may be a row.
- **1.7, names.** The cover names three people and folds the rest; the cover page inside the reader names everyone, because it is a page with room.
- **1.9, photographs and length.** Photographs in an answer are justified rows, never a carousel. An answer longer than 2,400 characters folds with "Read the rest"; nothing in the real Round trips it, the 6,000-character fixture does. That is a fold on one outlier, not a collapse of a question.
- **1.13 item 4.** The composer takes the reader's shape: the same folio, the same line, one question per page. Answering and reading are the same object at two moments.
- **The reader as one component.** It stays one component, but the component is the page, and the server renders one page per request. The neighbours are fetched when you land so a swipe never waits. The 133-answer document never exists in one DOM, which is also why the heart stops costing 603 KB.

## 2. The screens

Throughout: "caps" means the app's 12px uppercase label rung, 0.08em tracking, semibold. "The line" means the pieces-of-a-hairline progress element described in section 3. A 390 measurement assumes the shell's 20px padding (content 350px wide, starting at y=76 under the 56px green bar); a 1512 measurement assumes the 248px sidebar and 40px padding (content 1184px wide, starting at x=288, y=40).

### 2.1 The list

At 390: the heading "Catch-ups" (h1, Baskerville 2rem) at the top, then one row per Catch-up, hairlines between, no cards. A row is two lines and, when there is something to show, the line under them:

```
in the loop                                     (Baskerville 1.25rem)
ROUND 1 IS OUT · YOU ARE ON QUESTION 5 OF 11    (caps, canopy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    (the line, 11 pieces, 5 lit)

Batch of 2011
ANSWERS CLOSE FRIDAY · 9 OF 39 HAVE WRITTEN IN  (caps, canopy)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    (11 pieces, 3 lit: the ones you have answered)
```

Rows are 84px tall with the line, 66px without. The state line is canopy when the state asks something of you (answer, ask, read the new Round) and muted ink when it does not ("Round 2 opens on 15 September", "No Round yet · anyone can start the first", "Ended 3 May 2026"). The whole row is the tap and it goes to the home. A long press on a phone, hover-and-dots on desktop, opens the same door the home's menu opens (2.7). No View, no dots on the row face, no birds.

Under the rows, one text link in canopy, 15px: "Start one with people you choose". Under that, only when at least one exists, a last row: "Archived · 1" with a chevron, muted. Two Catch-ups make a page that is 300px tall, and it is allowed to be.

At 1512 and 1920: two columns inside the wide shell. The rows sit at the left in a column capped at 560px. At the right, from x=888, a 368px column holding the cover (1.4, drawn in 2.3) of each Catch-up's latest published Round, stacked, each headed by the Catch-up's name in caps. That column is where a wide screen's room goes; it is absent when no Round anywhere has been published, and then the list is a short page at the left and the rest is the valley photograph. Nothing stretches past 560px.

### 2.2 Making one, and starting a Round

`/catchups/new` is a single centred column, the calm-form material: "Start a Catch-up" (h1), then three things. Name, a 56px mist FloatField. People, a search field "Add someone by name" with the chosen people listed under it as rows (bird 28, name, batch, a remove cross at the right), not chips. Rhythm, three radio rows: "Every two weeks", "Every month", "Every three months". One canopy pill at the bottom, "Start". It lands on the new home in the collecting state. There is no "+ Everyone from 2011" chip, because the batch Catch-up already exists and this page never makes one.

A batch Catch-up's first Round starts from its home. The Now panel on a batch with no Round holds one button, "Start the first Round", open to any member. Pressing it switches the panel in place to collecting (auto-animate) with the ask field visible and unfocused. No page, no member picker, nothing to name.

### 2.3 The home

`/catchups/[id]`. Three parts in every state.

**The head.** The name in the display rung (`clamp(1.9rem, 5vw, 2.6rem)`, Baskerville), printed as the member typed it. Under it one caps line: `EVERY MONTH · 23 PEOPLE`, where "23 PEOPLE" is canopy and opens the people sheet. For a batch: `EVERY THREE MONTHS · EVERYONE FROM 2011 · 39 PEOPLE`. At the right of the name's line, the "..." trigger (the menu material's `MENU_TRIGGER_HIT`), the one door to every verb. Nothing else: no birds, no rule.

**Now.** A paper card (16px radius, 16px padding at 390, 24px at 1512) whose first line is a caps eyebrow in leaf naming the Round and its clock. Only the body changes.

1. *No Round yet.* Eyebrow `NO ROUND YET`. Body, 16px: "A Round gathers questions for a week, takes answers for a week, then comes out as one issue everyone reads." One canopy pill: "Start the first Round".
2. *Collecting.* Eyebrow `ROUND 2 · QUESTIONS CLOSE FRIDAY 12 SEPTEMBER`. Body: the questions gathered so far as contents rows, the same rows the reader's sheet uses (number in caps, the question in Baskerville 15px, "asked by Nandita Rao" or `ANONYMOUS` in caps under it), so the contents page is visibly being written. Then a 12px-radius bordered field, "Ask everyone something", with a switch row under it, "Ask anonymously", and a text link "From the library". A Keeper (any member on a batch) sees a drag handle and a remove cross on each row and, under the field, a secondary button "Open answering now". With no questions yet the rows are replaced by one line, "No questions yet. Ask the first one."
3. *Answering.* Eyebrow `ROUND 2 · ANSWERS CLOSE FRIDAY 19 SEPTEMBER`. The line, eleven pieces, lit for the questions you have answered. Under it "You have answered 3 of 11" (15px) and the one canopy pill, "Answer" (it reads "Continue answering" once you have started). Then "Written in so far", 14px: three 20px birds inline before "Nandita Rao, Kabir Anand, Meera Pillai and 6 others" (tap the others to expand the names in place), and "Still to write: 14" which expands the same way, because these are people who know each other. Keeper: a hairline, then a row of text buttons: "Nudge everyone", "Close answering", "Extend" (a popover with +1 day, +2 days, +4 days, a week).
4. *Preparing.* Eyebrow `ROUND 2 · COMES OUT SATURDAY 20 SEPTEMBER, 8 AM`. Body: a cover-shaped block in the warm shimmer (the cover being printed), and one line, "Answers are sealed until then. Nobody can read them yet, Keeper included." Keeper: a secondary button, "Publish now".
5. *Published, next not yet open.* The cover of Round 1, described below, whole card tappable. Under the card, outside it, one muted line: "Round 2 opens on 15 September." Keeper: a text button beside it, "Open Round 2 now".
6. *On hold.* The panel exactly as its Round's state, plus a cinnamon caps tag at the eyebrow's right, `ON HOLD`, and one line at the bottom, "The next Round will not start until a Keeper resumes." Keeper: a text button, "Resume". A Round already collecting or answering finishes on its own; the hold is on the clock between Rounds.
7. *Ended.* Eyebrow `ENDED 3 MAY 2026`. Nothing else. The card is one line tall.

**The cover** (the one component, everywhere it appears at card size): a paper card. When the Round has photographs, a 3:2 picture band at the top, 12px radius inside the 16px card, showing the most-hearted photograph (aimed with the photo's stored PhotoAim if it has one, top-centre otherwise). When it has none, no band. Then `ROUND 1 · 15 AUGUST 2026` in caps; the line, eleven pieces, lit as far as the member has read; "Aarav Sethi, Nandita Rao, Kabir Anand and 10 others wrote in" (14px, three 20px birds before the first three names); three questions as headlines in Baskerville 16px/1.3; "AND 8 MORE QUESTIONS" in caps. Bottom right, in canopy caps, `CONTINUE FROM QUESTION 5` when a read mark exists, `READ` when not, `READ AGAIN` when the member reached the back page. The whole card is the tap and it opens the reader at that page. Hover is the state layer, nothing moves.

**Before.** A heading "Earlier Rounds" (h3) and the covers, newest first, at 390 stacked full width. It excludes the Round shown in Now, and is absent when that leaves nothing.

At 1512: the head spans the width. Under it, Now at the left (816px) and Before at the right (368px, sticky at top 40), so the covers stand beside the work like back issues on a desk. At 390 the three parts stack.

### 2.4 The composer

`/catchups/[id]/answer` is the reader's shape with a text box in it. One question per page. The folio at the foot reads `IN THE LOOP · ROUND 2` and `QUESTION 3 OF 11`, then the question and `2 ANSWERED`. The line's pieces light as you share. The page: the question (h2), the asker, then a bordered 12px-radius text area, five rows tall and growing, then "Add photos" (up to three, 80px thumbnails at the 8.8px rung with a remove cross each). Paste a link with a song or video in it and a card appears live under the text in the exact form the Round will print it, with a caption "This is how it will show." A photo-wall question replaces the text area with one mist well, 3:2, a camera glyph and "Add one photograph", with a one-line caption field under it. Two controls at the bottom right: "Share" (canopy pill) and "Skip" (text). Sharing slides the next question in from the right. A skipped question's piece stays unlit and you can swipe back to it any time before the close. On desktop the rail lists the questions with a lit or hollow mark each.

The end page: the hoopoe, "That's you in Round 2." (Baskerville, the surface's one warm line), "Comes out on Saturday 20 September." and the Catch-up's name as the way home.

### 2.5 The reader

Section 3, in full. In one line here: the reader is a cover page, one page per question, and a back page; on a phone you turn pages with your thumb or from the folio's sheet, on desktop from a permanent contents rail or the arrow keys; every page scrolls on its own.

### 2.6 Who is here, and who wrote in

**Who is here** lives in the people sheet, behind the count in the head. On a phone it is a bottom sheet at full height; on desktop a right-hand sheet 420px wide. Header: "23 people" (Baskerville 1.25rem). On a people Catch-up, two controls under the header: a field "Add someone by name" and a text button "Send the link" (copies it, toast "Link copied"). Search appears above the rows when there are more than twelve. Rows are 52px: bird 40, name 15px semibold, batch in caps under it, and after the name of a Keeper the leaf glyph and `KEEPER` in caps. Order: this Round's writers, then your own batch, then everyone else, alphabetical within each. A Keeper sees a "..." on each row that opens a proper menu, 200px wide, "Make a Keeper", "Remove from this Catch-up" (red, last). On a batch Catch-up the sheet is read-only and its first line under the header says "Everyone from 2011 is here automatically."

**Who wrote in** is drawn as names with birds beside them, in three places: the answering Now panel (2.3, state 3), the cover (three names and a fold), and the reader's cover page, which names all of them.

### 2.7 The menu, the verbs and the dialogs

One door, the "..." on the head. A menu of the shared material. For a member: "Reminders · Daily" (opens a popover with three radio rows: Daily, Last day, Off), "Archive", a separator, "Delete" in red (people Catch-ups only). A Keeper's rows sit above the member's: "Rhythm · Every month" (a popover with the three rhythms), "Hold the next Round" or "Resume", and, after the final separator, "End this Catch-up" in red. On a batch Catch-up the Keeper rows do not exist for anyone.

Dialogs, all in the dialog material. Archive has none: a toast, "Archived. Undo." Delete: title "Delete in the loop", one line "It goes to the bin for 30 days, then your place in it goes with it.", Cancel and a red "Delete". End: title "End in the loop", one line "Nobody can ask or answer again. Everything already out stays readable.", a field asking for the name typed back, Cancel and a red "End". Hold and Resume act at once, no dialog, and the panel shows the tag.

### 2.8 The batch Catch-up

Told apart by words, nothing else: the state line on the list row and the head's caps line say `EVERYONE FROM 2011`. Its first day is the head, the Now panel in state 1, and no Before. Nobody keeps it (the architecture's O1, first answer): the menu holds Reminders and Archive, Round verbs are open to any member, and the people sheet is read-only. A member who joins the site in 2027 opens it and sees every Round in Before with the line unlit.

### 2.9 Archive and delete

Both live behind the door (2.7) on the home, and behind the same door from the list row's long press. Archive hides the Catch-up from the list and silences its reminders; the "Archived · 1" row at the bottom of the list opens a sheet listing them, each with "Bring back". The same sheet's second part is the bin: "Deleted · gone in 23 days", each with "Bring back". Opening an archived Catch-up from that sheet brings it back on its own.

### 2.10 Comments on an answer, a song card, a photo wall

All three are drawn in section 3. In short: comments collapse to a count on the answer and open in place with the post comments family; a song or video link anywhere in an answer prints a card under the text, and a bare link prints the card alone; a photo wall is a page that is one justified grid, everyone's photograph attributed by bird and name.

### 2.11 The notification

The bell's rows and where each lands:

| The row | Lands |
|---|---|
| "Round 2 of in the loop is gathering questions" | the home, Now in collecting |
| "in the loop is open for answers until 19 September" | the composer, question 1 |
| "3 days left to answer in in the loop" (a nudge) | the composer, at the first unanswered question |
| "Round 1 of in the loop is out", drawn as the cover condensed (caps line, the line, the three names) | the reader, question 1 |
| "Nandita Rao commented on your answer to 'Songs you've had on repeat lately'" | the reader, page 5, scrolled to the answer, its comments open |
| "Kabir Anand hearted your answer" | the reader, the page and the answer |

### 2.12 The empty states

A brand-new member with a batch year sees the list with one row, their batch Catch-up, state line "No Round yet · anyone can start the first", and the "Start one with people you choose" link. A member with no batch year sees "You are not in a Catch-up yet." above that link and nothing else. A batch with no Round yet is 2.8. A Round with one answer: the reader's page holds the question and one tile; the folio reads `ANSWER 1 OF 1`; on desktop the tile spans both columns; the cover says "Aarav Sethi wrote in."

### 2.13 The pressure fixture

Section 7, case by case.

## 3. The reader, precisely

Two viewports are drawn: 390x844 and 1512x982. Between them, up to 1179px wide, the phone plan applies (the rail cannot fit under the rail grid's own floor). The Round is "in the loop", Round 1, 15 August 2026, 13 people, 133 answers, 11 questions. Every sample answer below is invented in the shape of a real one.

### The masthead

The masthead is drawn from the cover's fields and nothing else: the Catch-up's name, "Round 1", the date, who wrote in. On a phone it never scrolls, because it never sits in the page: it is the first line of the folio, `IN THE LOOP · ROUND 1`, present at every scroll depth of every page, and tapping it is the way up. The masthead in full is **the cover page**, page 0, one swipe to the right of question 1 and the first row of the sheet: the picture band (the most-hearted photograph, 3:2, 350x233, 12px radius) if the Round has photographs; the name in the display rung; `ROUND 1 · 15 AUGUST 2026` in caps; "13 wrote in" as a run of all thirteen names, each preceded by its 20px bird, wrapping to as many lines as it needs (three at 390); then the contents rows, the same component as the sheet's; then "Round 2 opens on 15 September." On desktop the rail is the masthead (below), and the cover page shows the picture, the name and the full names run without the contents rows, because the rows are already beside it.

On opening the reader from the cover on the home, you land on question 1, or on the page the cover said you would continue from. A deep link lands where it points.

### The navigator on a phone, RESTING

The folio: a bar fixed to the bottom of the screen, full width, edge to edge, 60px tall plus the safe-area inset (in Chrome's 390x844 emulation the inset is 0, so the bar's top edge is at y=784; on a phone with a home indicator it is at y=750 and the bar's fill continues to the screen's edge). Surface: the glass utility on paper, `--card` at 92% with a backdrop blur, so the page shows through faintly as it passes under. Padding 14px at the sides.

Its top edge is **the line**: a 2px hairline broken into as many pieces as the Round has questions, 3px gaps, spanning the full 390. Pieces before the current question are canopy at 40% opacity. The current piece is canopy, filling from the left as the page scrolls (the fill is `scaleX` from the left, tracking the window's scroll fraction each frame, no easing). Pieces after it are the border colour. A page shorter than the screen reads as full the moment you arrive. At eleven questions a piece is 33px; at the forty-question cap it is 7px and still readable as a row of pages.

Under the line, two rows:

```
y+12   IN THE LOOP · ROUND 1                      QUESTION 5 OF 11
y+32   Songs you've had on repeat lately            ANSWER 7 OF 13
```

Row one, caps: at the left the Catch-up's name and Round, in canopy, and it is a link to the home with a 44px-tall hit area; at the right the question counter in muted ink. Row two: at the left the question itself in Baskerville, 15px, one line, truncated with a 24px fade rather than an ellipsis, in ink; at the right the answer counter in caps, muted. The right column is never truncated; the question line gets what is left, about 230px, which holds "Songs you've had on repeat lately" whole and fades "Do you think your life looks like you thought it would" after "thought". The answer counter names the answer under the reading line, which is the last answer whose top edge is above 40% of the screen's height. A question with one answer reads `1 ANSWER`; with none, `NO ANSWERS`.

Everything on the bar except the name is the sheet's trigger. A horizontal swipe on the bar pages, the same as a swipe on the page.

### The navigator on a phone, OPEN

One tap opens **the sheet**, the app's bottom sheet in the dialog material: Float white, 20.8px top corners, the warm-ink backdrop, a 36x5 grabber. It rises to the height of its rows, capped at 80% of the screen (675px), and scrolls inside beyond that. It is nonmodal in the sense Apple names: drag it down or tap the backdrop and the page you were on has not moved.

Header, 12px side padding: the name in Baskerville 1.25rem (a link home), `ROUND 1 · 15 AUGUST 2026` in caps under it. Then the rows, 56px min each, 8.8px highlight radius (concentric with the sheet's corner less its padding):

```
0    Cover · who wrote in
1    What is a fun thing you did this summer?              13 · 4 PHOTOS
2    Something new you did recently that you did not       13 · 3 PHOTOS
     think you would do.
3    How do you think that coming from RV has shaped       10
     your relationship with AI?
4    Are you a rider? Are you seeing someone?              12 · 5 PHOTOS
5    Songs you've had on repeat lately                     13 · 2 PHOTOS
...
11   What's something creative you have recently done?     12 · 6 PHOTOS
     Back page · every photograph, and when Round 2 opens
```

The number sits in a 28px column in caps, canopy for questions you have reached and muted for the ones you have not, so the list is also your progress. The question is Baskerville 15px/1.3, two lines then a fade. The right column is caps, muted: the count of answers, and the count of photographs when there are any. The current row carries the canopy wash (the app's one selected state) and a 3px canopy bar at its left edge; its weight does not change, so nothing reflows. Tap a row: the sheet drops, the reader turns to that page in the direction of travel.

The forty-answer question reads in the sheet as one row like any other, `40`, at the same height, because a question is a page whatever its length; the number is what tells you it is long. On the page itself the folio's right column counts you through it, `ANSWER 17 OF 40`, and the lit piece fills over the whole length.

### The desktop plan

At 1512 the shell gives 1184px from x=288. Two columns: **the rail**, 280px, sticky at top 40, and after a 40px gutter **the page**, 864px (x=608 to 1472). No folio; the rail is the navigator, always open, which is what Wikipedia's testers preferred.

The rail: the name in Baskerville 1.375rem (a link home, the way up from any depth), `ROUND 1 · 15 AUGUST 2026` in caps, then "Aarav, Nandita, Kabir and 10 others wrote in" in 13px muted, linking to the cover page. Then the same contents rows as the sheet, at 44 to 56px each, the question in Baskerville 14px/1.35 clamped at three lines, never cut at a character count. The current row carries the wash and the 3px bar. Its right column is live: it reads `ANSWER 4 OF 13` and ticks as the page scrolls, while every other row reads its plain count. The cover and the back page are the first and last rows.

Moving: the arrow keys, ← and →, turn pages. A row in the rail turns to that page. At the foot of every page sits **the turn row**: two cells side by side, 12px radius, state layer on hover, `PREVIOUS` in caps over the previous question in Baskerville 16px at the left, `NEXT` over the next at the right, the last page's right cell reading `BACK PAGE` and the first page's left cell `COVER`. The turn row also exists on the phone under every page, so paging has a non-gesture form everywhere. There is no trackpad swipe on desktop: Chrome and Safari already spend that gesture on history.

The desktop page turn is the viewer step, the app's named pattern: the outgoing page slips 18px in the direction of travel and fades over 140ms, the incoming page drifts in 28px on `EASE_IN_OUT_SCENE` over 200ms, no scale. The window scroll lands at the incoming page's remembered offset, or its top, in the same frame.

### A question's heading

The heading is the first thing on every question page: the question in Baskerville, h2 (1.5rem/1.15, -0.02em) at 390 and h1 (2rem/1.1) at 1512, wrapping in full, never cut. No "Question 5" and no "Q5" above it: the number lives in the folio and the rail, where it is navigation. Under it, one line: for an attributed question, a 28px bird and "asked by Nandita Rao" in 13px muted, the name a link; for an anonymous one, `ASKED ANONYMOUSLY` in caps, muted. Then a `--space-l` gap (26px) and the answers.

### The answer tile, and how it packs

Two sizes, decided by what the answer holds.

**A line.** An answer of 120 characters or fewer with no line break, no photograph and no link. It has no paper. It is one row on the page background: a 28px bird at the left, then a single run of text at 15px/1.5: the name in semibold ink, the batch as `'11` in the identity row's caps, then the answer in regular weight, wrapping under itself with a 40px left indent. The heart (the shared LoveButton, md) sits at the row's right edge, aligned to the first line, and the comment count follows the answer inline as "· 2 comments" in 13px muted. Rows are 8px padded top and bottom, 50px for a one-line answer, and a hairline sits between consecutive lines, so a run of them reads as a guest book. This is what a five-word answer gets instead of a three-centimetre card that is 85% empty (¶31), and it is what the forty three-word answers become.

**A card.** Everything else: paper, 16px radius, hairline border, 16px padding. IdentityRow with the 40px bird, the name and `BATCH OF '11`. Then the text, 15px/1.7, `break-words`, folded at 2,400 characters with "Read the rest" in canopy. Then photographs, then a song card, then the foot: the heart at the left and "3 comments" (or "Comment" when there are none) beside it in 13px muted. The foot is one row, 34px, no band under it.

The four states, drawn at 390 (350px wide, 318px inside a card):

1. *Text only.* A card with the identity row and text. A 2,000-character answer under question 2 runs about 44 lines at 46 characters per line, 1,120px of text, one card, no fold, the folio counting it as one answer. At 1512 the same answer sits in a 416px column at 55 characters per line, 37 lines.
2. *One photograph.* After the text, PhotoFrame at the card's inner width: a wide photograph runs free at its shape; a tall one becomes 3:4 on a blurred bed of itself, capped at 700px. Tap opens the viewer.
3. *Three photographs* (the real answer under question 1: 1200x1600, 1200x1600, 1288x966). Justified rows, never a carousel: row one holds the two portraits side by side, 156x208 each with a 6px gap; row two holds the landscape at 318x238. Every photograph at its own shape, nothing cropped, 12px radius inside the 16px card. Tap any one and the viewer opens on it with swipe between the three; the viewer is the only horizontal swipe inside the reader and it is modal, so it never fights the page.
4. *A song link.* The rule from the measured research: the sentence is never rewritten and the link stays a link inline; the card prints under the text. The card is a bordered box, 12px radius, 10px padding, 76px tall: 56px square art at the 8.8px rung, the title in 15px semibold, the artist in 13px muted, and `SPOTIFY` or `YOUTUBE` in 10.5px caps with the source mark; at the right a 32px play ring where a 30-second preview exists (Spotify and Apple, never YouTube). The whole card opens the link in a new tab. When the answer is the link and nothing else, which is three of the four in question 5, the card stands alone and the URL is not printed. When the link does not resolve, the URL prints as a link, wrapped at any character, never wider than the column. Sample, a card: "Aarav Sethi · BATCH OF '11 / This on loop since June, do not judge: https://open.spotify.com/track/... / [art] Straight Line Was A Lie · Sudan Archives · SPOTIFY ▶".

Packing on desktop: a page's answers flow into two 416px columns with a 32px gap, column-first, so you read down the left and then the right, like a spread. Lines stay 50px rows; cards break to the next column whole, never mid-card. An answer alone on its page spans both columns as a wide card with its photograph at the left (3:4, 320px) and the text beside it.

### The comments

Collapsed: the count on the foot of a card, or inline after a line. Open: the post comments family, in place, animated with auto-animate. Under a card, the comment rows sit inside the card below a hairline: a 28px bird, the name in 13px semibold, the text in 14px, a sm heart at the right; then the composer pill with the member's own bird. Under a line, the row grows a paper panel beneath it, 12px radius, holding the same rows and pill, and the line's hairline moves under the panel. @mentions use the app's mention dropdown. A new comment posts at once and appears at the bottom; the count on the foot updates without a page render.

### The heart

The shared LoveButton, red, with its count, on every answer: the card's foot at the left, the line's right edge. Flips at once on tap. The action does not revalidate the route, so nothing re-renders under the thumb, and because a page holds thirteen cards rather than 133, the motion chunk has landed long before the first tap, so the pop plays the first time too.

### The way back, from any depth

On a phone, the folio's first line, `IN THE LOOP · ROUND 1`, at every depth of every page; and the sheet's header. On desktop, the name at the top of the sticky rail. Paging uses `history.replaceState` (`?q=5`; `?q=0` for the cover, `?q=end` for the back page), so the browser's own Back goes to where you came from in one press rather than back through eleven pages. Refresh lands you on the same page.

### The end of the Round

After question 11, one more page to the left: **the back page**. "That's Round 1." in the display rung (the reader's one warm line, on a title). Under it, in caps, `13 WROTE IN · 133 ANSWERS · 26 PHOTOGRAPHS`. Then every photograph in the Round as one justified grid, two to a row at 390 and four or five at 864, each with a 28px bird at its bottom-left corner on a 2px paper ring; tap opens the viewer, whose caption carries the author and a link "See it in question 4" that turns to that page and scrolls to the answer. Then "Round 2 opens on 15 September." at 16px, and the name, large, as the way home. Swiping left on the back page rubber-bands; so does swiping right on the cover.

### The first screen at 390

The green bar, y=0 to 56, unchanged, the menu button at its left. Then, from y=76, the first page:

- y=76 to 131: "What is a fun thing you did this summer?", Baskerville 24px, two lines.
- y=141 to 157: `ASKED ANONYMOUSLY`, caps, muted.
- y=183: the first card, x=20 to 370, paper, 16px radius. Inside it: y=199 to 239 the identity row, a 40px bird, "Aarav Sethi", `BATCH OF '11`; y=249 to 351 four lines of 15px text, "Drove to Hampi with two people I had not seen since 2011. We got there at four, climbed a rock before it got dark, ate, and drove back the same night. Worth every hour of it."; y=361 to 569 two portrait photographs side by side, 156x208 each; y=575 the landscape, 318 wide, running under the folio.
- y=784 to 844: the folio. The line along its top edge, eleven pieces, the first lit and about a fifth full. `IN THE LOOP · ROUND 1` and `QUESTION 1 OF 11`; "What is a fun thing you did this summer?" faded after "did this" and `ANSWER 1 OF 13`.

A complete answer's words and two whole photographs on the first screen, and the way to every other question under the thumb.

### The first screen at 1512

The sidebar, x=0 to 248, Catch-ups lit. The rail from x=288: "in the loop" at y=40, the caps line at y=72, the names line at y=92, then the contents rows from y=126, "Cover" first, row 1 washed with the bar at its edge and `ANSWER 1 OF 13` at its right, eleven more rows down to about y=760, then "Back page". The page from x=608: the question at y=40 in 32px Baskerville on one line, `ASKED ANONYMOUSLY` at y=87, then from y=130 two columns of 416px. Left: Aarav's card, its three lines of text, the two portraits at 205x273 and the landscape at 416x312, running to about y=934. Right: a line, "Nandita Rao '11 Learned to swim. At 33." with its heart, at y=130 to 180; then a card, "Kabir Anand · BATCH OF '09", six lines about a cousin's wedding in Coorg, no photograph, a heart and "2 comments" at its foot, y=190 to 420; then a card with one wide photograph and a line of text, y=430 to 780; then the top of a fourth. Three and a half answers on the first screen, the turn row below the fold.

### A mid-scroll screen at 390, deep in question 5

The page has scrolled 1,420px. From y=56 down:

- y=56 to 118: the tail of a card: the foot of Meera Pillai's answer, a heart with `4` and "1 comment".
- y=134 to 262: a card with no text, a song card alone, because the answer was a pasted link: art, "Nikes", "Frank Ocean", `SPOTIFY`, the play ring. "Rohan Das · BATCH OF '14" above it.
- y=278 to 328: a line: "Ishaan Bose '11 Honestly just the Interstellar soundtrack again." with its heart.
- y=329 to 379: a line: "Priya Iyer '12 Whatever my daughter puts on. So, one song." and "· 3 comments".
- y=395 to 700: a card: "Dev Malhotra · BATCH OF '08", "Found this at a record shop in Bandra and it has not left the turntable:", a photograph of a sleeve, wide, 318x212, then a card for a YouTube link, `YOUTUBE`, no play ring.
- y=716: the top of the next card.
- y=784 to 844: the folio. Four pieces lit at 40%, the fifth filling past half, six unlit. `IN THE LOOP · ROUND 1` and `QUESTION 5 OF 11`; "Songs you've had on repeat lately" and `ANSWER 8 OF 13`.

Nothing on this screen has to be scrolled to the top to be understood. The question is named, the position in it is named, the Round's position is drawn, and the way up is one tap.

### How the page turns on a phone, stated for the builder

The document is the scroller and stays the browser's. The page container declares `touch-action: pan-y`, so vertical pans are the browser's from the first pixel and only horizontal movement reaches script. On pointerdown nothing happens. When the pointer has moved 12px, the gesture is either horizontal (|dx| > |dy|) and the page follows the finger with `translateX`, the neighbour riding in beside it, resistance of a third past the cover and the back page; or it is vertical and the script never touches it again. On release the turn commits past 70px or 420px/s of velocity, on the app's shared spring, and springs back otherwise. On commit the neighbour is swapped into the flow and the window scroll is set to its remembered offset, or 0, before paint. Only the current page is in the document; the two neighbours are fetched on arrival and held ready in a fixed layer that is only visible mid-gesture, and if a flick outruns the fetch the incoming page shows the warm shimmer in the shape of a heading and two cards until it lands. Nothing is sized in `vh`. The folio pads for `env(safe-area-inset-bottom)`.

## 4. The design system, kept and broken

Kept by default: the palette, every token of it; Baskerville for headings and Source Sans 3 for everything read; the radius ladder (card 16, song card and picture band 12, art and thumbnails 8.8, the sheet's 20.8 top corners, highlight rows at 8.8 concentric with the sheet); the surface ladder (page, paper cards, Float for the sheet, the menu and the dialogs, the folio as the glass utility on `--card`); the state layer for every hover and press, no opaque swaps; the focus recipe; hover never moves anything; SpringPress on every control; auto-animate on the comment lists; AnimatePresence with a real exit on the sheet; the viewer step for the desktop turn; only transform and opacity animate, the line's fill included (`scaleX`); the warm shimmer for an unfetched page; the shared LoveButton; BirdAvatar at 28 and 40; the 44px hit rule; safe-area padding on the folio; the menu and dialog material to the letter; the caps line and MetaDots for every "·".

Broken, each because the break is the point (D36):

1. **Baskerville at 15px and 14px.** The scale reserves the heading face for 1.25rem and up. The folio's question line, the sheet's rows and the rail's rows print it at footnote size. A running head is a heading set at the size of a footnote, and every printed magazine does it; at body size the face is what tells you this line is the question and not a caption.
2. **Short answers leave the paper.** The system's content rung is a 16px paper card, and the tile is the app's tried and tested shape. A five-word answer in that card is the tile he measured at 15% used. The line keeps every part of the tile's content (bird, name, batch, answer, heart) and drops the box, because a box must earn its border and a one-liner cannot.
3. **Chrome pinned to the bottom of a phone.** Nothing in the app pins anything to the bottom edge; the shell's chrome is a top bar and a sidebar. The folio has to be under the thumb and present at every depth, so it is fixed there, edge to edge, not a floating pill.
4. **The Catch-up's name printed in 12px caps on every page** instead of once as an h1 at the top. The name is the way up and it has to be everywhere; at the display size it would be a banner eleven times over. The display size is spent once, on the cover page.
5. **Two columns of answers on desktop, filled column-first.** The one-spine column is the rule for anything read top to bottom. A page of parallel replies is a spread, the replies are not a sequence, and forty three-word answers in one 864px column would be a ribbon down the left of an empty page, which is the complaint in ¶6.

The one thing on screen that could only be this app: the folio, a strip of the app's paper carrying the Catch-up's name in the caps every identity row already wears, the question in Baskerville, and along its top edge eleven pieces of hairline in Canopy, one of them filling as you read.

## 5. Letterloop, closed and open

| # | Gap | This direction |
|---|---|---|
| L-a | comments with @mentions | closed: in place under every answer, the post comments family, the app's mention dropdown |
| L-b | a Music section with a card | closed and widened: any pasted Spotify, YouTube or Apple Music link, in any answer to any question, prints our own card; a bare link prints the card alone |
| L-c | a Photo Wall section | closed: a photo-wall question is a page that is one justified grid |
| L-d | "the next issue arrives on" | closed: the Now panel says it, the back page says it, the cover page says it |
| L-e | reactions per reply | left open on purpose: one heart is the app's language |
| L-f | reply progress | closed: names with birds on the Now panel, and "Still to write" by name |
| L-g | reminders | already there, behind the door |
| L-h | the Album across issues | half closed: the back page is the Round's own album, every photograph, tap to the viewer, "See it in question 4". An album across Rounds is left open |
| L-i | Download PDF | track M |
| L-j | Mementos | left open |
| L-k | recolouring themes | no, on purpose |
| L-l | filter an issue by member, sort replies | left open on purpose: the page model is question-first, and a per-member filter would fight it; the cover page's names run is the nearest thing |
| L-m | a banner photo per loop | closed by derivation: the most-hearted photograph is the cover's band, absent when a Round has none |
| L-n | four roles | one role, Keeper, as the architecture keeps it |
| L-o | quick actions per loop on Home | closed: the row's state line in words, canopy when it asks something of you |

And one thing Letterloop does not have at all, which this direction adds: your place. The cover, the list row and the sheet all know how far you have read, and the cover says "Continue from question 5".

## 6. Live and static

Live, because it cannot be judged from a still:

- The phone folio and its sheet, on the real Round: the swipe between pages with the neighbour riding in, the spring on release, the rubber band at the cover and the back page, the line's fill tracking the scroll, the answer counter ticking, the sheet rising and dropping, a row turning the page in the right direction.
- The turn row at the foot of a page, on both viewports.
- The desktop rail's current row following the arrow keys, the live `ANSWER n OF m` in it, and the viewer-step page turn.
- A comment count opening in place under a card and under a line.
- The heart flipping without a re-render.
- The forty-answer fixture page and the six-thousand-character fold, because the bet is judged on what a page does with them.

Static, a composition is enough:

- The list at 390, 1512 and 1920; the home in its seven states; the composer's page and its end page; the people sheet; the menu and the three dialogs; the cover in its three sizes; the notification rows; the cover page and the back page (the back page's grid may be static, the viewer behind it is the shared one).

## 7. Under pressure

**One answer.** The page is the heading, one tile, the turn row. `ANSWER 1 OF 1`. On desktop the tile spans both columns. If that one answer is "Same.", the page is a heading and a 50px line and it is short, which is allowed; the next page is a tap or a swipe away. What it does not do is stretch the line into a card to fill the room.

**Forty answers.** The fixture's crowded question is thirty lines and ten 240-character cards. At 390 that is about 4,400px, five and a half screens of one page; at 864 in two columns, about half that. The folio counts you through it, `ANSWER 17 OF 40`, and the lit piece fills over the whole length, so the length is legible before you commit and while you are in it. The sheet's row says `40`. The page holds forty tiles at most, so it is still the lightest thing the reader has ever rendered. Where it strains: forty consecutive lines are a wall of 50px rows, and on a phone the eye loses its place between rows more easily than between cards. The hairlines and the birds are what hold the rows apart; if that is not enough in the room, a line every tenth row could carry its index in the caps, and that is the first thing to try.

**A 6,000-character answer.** A card, folded at 2,400 characters with "Read the rest" in canopy, so it costs two screens on a phone until opened and six after. The 9,000-character over-cap row is the same. On desktop a 416px column holds the folded text in 44 lines. The fold is on this answer only; the page and its neighbours are untouched.

**A 24-photograph wall.** The page is the wall: justified rows at the page's width, two photographs to a row at 390 (twelve rows, about 2,600px with the name rows) and four or five at 864 (six rows). Each cell has under it a 32px row with a 28px bird, the name at 13px truncated, and a sm heart at the right; a caption prints under that when there is one, two lines then More. Tap opens the viewer. The folio counts by cell. Where it strains: the fixture's broken-file photograph draws as a paper cell of the row's height with the name row under it and nothing else, which is honest and a little bleak.

**A 300-character question.** The heading wraps in full: eleven lines of 24px Baskerville at 390, about 300px, and it is the page's first screen. The folio truncates it with the fade after about 30 characters. The sheet row clamps it at two lines, the rail at three, both with the fade. Nothing is cut at a character count and nothing ends in three periods.

**A 78-character name.** In a card, IdentityRow wraps the name to two lines and the batch line sits under the second; the row grows and nothing truncates. In a line, the name is inside the text run, so it wraps like text and the answer follows the `'84`. On the cover and the cover page the names run wraps around it. Names are never cut.

**An emoji-only answer.** A line, the emoji printed at 20px in the run after the name. Nothing else changes.

**A pasted 123-character link.** Over the line threshold, so a card; the resolver reads it; the fixture's id is fake, so it does not resolve and the URL prints as a link wrapped at any character, `break-words` on the paragraph, never wider than the column, never pushing the page sideways. A link that resolves prints the card alone.

**A Round nobody answered.** The cover page says "No one wrote in." and has no picture band. Each question page is its heading and one muted line, "No one took this one.", and the folio reads `NO ANSWERS`. The back page reads "That's Round 2." and "Nobody wrote in this time. Round 3 opens on 15 October." The home's cover and the list row both say "No one wrote in", and the row's state line is muted, not canopy, so it asks nothing of anybody.

Also in the fixture and worth saying: an answer with nothing in it, or only whitespace, is a line reading "Kim Park showed up for this Round without writing anything." in italic; the six-photograph over-cap answer draws as three justified rows; the mixed tall-wide-square answer draws as two rows; the diacritic, Devanagari and Arabic names print as typed in every place a name appears, with the Arabic name's direction respected inside the run.

## 8. The two things I am least sure I got right

**Whether a horizontal swipe belongs on a web page at all.** Everything above rests on a direction-locked gesture that shares the screen with iOS Safari's own scroller, and I have described it rather than felt it. Two things could go wrong. The lock could misfire on a diagonal thumb, so a reader who meant to scroll gets a page that twitches sideways, and once that happens twice they will stop trusting the page. And nothing on screen says a swipe exists: the folio's pieces look like pages and the turn row sits at the foot of every page, but a member who never scrolls to the foot and never tries a swipe will read the Round one question at a time through the sheet, which works, and is not the bet. The honest test is the room on a real phone, not a static: if the lock is not clean at 390 in Safari, the direction survives as folio plus sheet plus turn row, and the swipe becomes the thing I promised and could not deliver.

**Taking the paper away from short answers.** The line is what makes the forty-answer page and Cyan's one-liner work, and it is also the one place this direction changes what an answer is. A member who wrote five careful words gets a row, and the member above them who wrote two paragraphs gets a card with a photograph in it. That could read as the app deciding whose answer mattered. Everything on the tile is still there, the bird, the name, the batch, the heart, and a guest book of lines is a real form, not a demotion; but the owner said the tiles are tried and tested and I have split them in two. If the room shows a Round where the lines read as the small print under the cards, the fix is not to put the paper back. It is to give the lines more of their own presence: a larger bird, the answer in Baskerville, a hairline that means something. I would want to see it before I knew which.

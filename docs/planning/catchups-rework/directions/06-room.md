# Roll call

**Thesis:** A Round is a room, so you read who is in it before you read a word of it, and the people stay on the wall the whole way down.

**Designer:** 06 room, reading.

**The bet, as given:** THE ROOM. A Catch-up is a place with people in it, and the people are the product: who is here, who wrote in, who is still to write, who asked what. The social layer leads and the reading follows. Get the roster and the state right (architecture 1.7) in a way that makes a batch of thirty-nine feel like a room you walked into, not a list you scrolled. The birds stay; a row of birds with a number is dead.

## 1. The idea

Open a Round and the first thing you read is a sentence of names: "Aditi, Rohan, Priya, Nikhil, Tara, Arjun, Meera, Dev, Sana, Vikram, Anjali, Kabir and Leela wrote in." Each name has its bird in front of it at 20px, so the bird finally does the job he asked of it in ¶23: it sits beside a name, and when the same owlet turns up on a tile three screens down you know it is Rohan without reading. The names are the door of the room. Everything after the door is people talking.

What it bets on. Thirteen people you went to school with are more interesting than eleven questions, and the questions are only the excuse for hearing from them. So every surface answers "who" before it answers "what". The list row names who wrote in the last Round. The home names who has written in and who has not, and a batch of thirty-nine with nine answers is drawn as nine lit birds and thirty dimmed ones, which is what a half-full room looks like. The reader's masthead is that sentence of names. The phone's navigator carries the bird of whoever is talking under your thumb and changes as you scroll past people. The desktop rail keeps the whole roll on the wall while you read, and any name on it is a tap away from reading only that person's Round.

What it refuses. It never shows a bird without a name, anywhere: no "+18" cluster, no masthead of anonymous glyphs, no facepile. It never prints a count where names would fit. It refuses to give every answer the same box: a three-word answer is a remark, one line with a bird, not a three-centimetre tile with a heart lost at the bottom (¶31). And it refuses the chip row.

What it is not. The thing it most risks resembling is a chat app: a member list on the right, messages down the middle, a bar along the bottom. It is not a chat, because nothing here is live and nobody replies in real time; a Round is a finished thing you walk into after it is published. The difference is kept visible in three places. The questions are set as headings in Libre Baskerville, not as messages. Answers arrive as tiles and remarks on paper, not as bubbles. And the bar along the bottom is a navigator that never becomes a composer.

Where it departs from the architecture's RECOMMENDED lines. Three places, each said out loud. First, 1.6 allows the people sheet to be the one door for every verb; this direction takes that reading all the way and gives the home no menu at all, so the count of people in the head is the only control there. Second, 1.5 offers the sidebar as a place for your two or three Catch-ups; this direction takes it, because a room you can walk into from any screen is the point of a room. Third, 1.9 leaves the tile's chrome to the direction; this direction changes what a short answer is drawn as, and that reorders answers inside a question (remarks first, then tiles). It is the one place this direction moves something a member wrote, and section 8 owns the doubt. Everything else follows the architecture: the six nouns and their homes, the cover as one component, the hold in place of pause, no Keeper on a batch Catch-up (O1, the first answer), Round verbs open to any member of a batch.

## 2. The screens

### 2.1 The list

At 390 the page is a title, two or three doors, and nothing else. "Catch-ups" is the h1 at 2rem. Under it, with `--space-l` between them, the doors: one paper card per Catch-up, 16px radius, hairline border, the `card-elevated` shadow, 16px padding. Inside a door, top to bottom: an eyebrow in the 12px uppercase label style ("YOUR BATCH · EVERY QUARTER" in leaf for the batch Catch-up, "EVERY MONTH" in muted ink for a people one); the name in Libre Baskerville at 1.375rem; then the state line at 16px in ink, one or two sentences that change with the Round: "Answers are open until Friday. You have not written in yet." or "Round 2 is gathering questions. Three asked so far." or "Round 1 came out on 15 August." or "On hold." or "Ended 16 August 2026." Below the state line, separated by `--space-m`, the cover of the newest published Round, drawn as a nested box at 12px radius on `background/60`: "ROUND 1 · 15 AUGUST 2026" in the caps meta line, then the roll sentence at 15px with a 20px bird before each of the first four names, "Aditi, Rohan, Priya, Nikhil and 9 others wrote in.", then the headlines line in italic Libre Baskerville at 14px, "What is a fun thing you did this summer? · Songs you've had on repeat lately · and 9 more". The door is one click target to the home; the cover inside it is one click target to the reader. That is two targets, not five, and they go to two different places, which is the test ¶3 sets. Hover on either is the state layer over its own box; both have the focus ring and the press sink.

A door with no published Round yet has no cover and ends at its state line. The last card in the stack is the door for starting one: same shape, eyebrow "NEW", title "Start a Catch-up", line "Pick the people, set the rhythm. You keep it.", and a Canopy pill, "Start", the only pill on the page. Under the stack, only when at least one exists, a plain text row: "Archived · 1" with "and 1 in the bin" after it when the bin holds something. It opens `/catchups/archived`.

At 1512 the doors sit in two columns capped at 1180px, flush against the sidebar the way every wide route is, each door 575px wide, the Start door taking the empty cell when there is an odd number. With one Catch-up and the Start door, the row is full. The page is short and allowed to be short: past the cards the valley wash shows, and nothing stretches to hide it. At 1920 the same two columns, the same cap.

The sidebar changes too, on desktop and in the phone drawer. Under "Catch-ups", indented 12px, one row per Catch-up you have not archived, up to four, in the sidebar's own 14px text: "in the loop", "Batch of 2011". The active one is the Canopy active row the sidebar already uses. A cinnamon dot at the row's right end means answers are open and you have not written in; it is the only state the sidebar shows. With more than four Catch-ups the rows collapse to the plain "Catch-ups" item and the list page does the work.

### 2.2 Making one, and starting a Round

`/catchups/new` stays a centred page, in the FloatField material, because the page is a form. Three fields and one button. "Name", a 56px mist field. "People", a search field; each person picked appears under it as a roll chip, 28px bird, full name, an x, and the roll wraps. There is no "Everyone from 2011" shortcut, because the batch Catch-up already exists and the shortcut is how "Batch of 2024" drifted off its batch (recon §9). "Rhythm" is three rows with one tick, menu material: Every two weeks, Every month, Every quarter. Then "Start", a Canopy pill, and one line under it: "Round 1 opens for questions the moment you press Start." Pressing it lands on the new home in the collecting state.

A batch Catch-up is never made; it is there. Its first Round is started from the home's Now panel, by anyone in the batch, with one button, "Start the first Round". Pressing it opens Round 1 for questions and shows a toast: "Round 1 is open for questions. Everyone from 2011 has been told." It never goes near a people picker.

### 2.3 The home

Three parts, stacked at every width: the head, Now, Before. At 1512 the column is the reading column from section 3 (660px) with nothing beside it: a home with two or three things on it does not need a rail, and a rail is where today's duplicates came from.

The head. The name, printed once, as the h1 at 2rem in Libre Baskerville: "in the loop". Under it one line at 15px muted: "Every month · 39 people". "39 people" is ink, underlined on hover, and it is the one control in the head: it opens the people sheet (2.6), which is also where every verb lives (2.7). A batch Catch-up's line reads "Everyone from 2011, automatically · 39 people". No dots, no menu, no settings glyph.

Now. A paper card at 16px radius, padding `--space-l`, carrying the current Round. The seven states:

- **No Round yet.** Title in Libre at 1.25rem: "No Round yet." One line: "A Round is a handful of questions everyone answers, then everyone reads. Anyone from 2011 can start the first one." Then "Start the first Round", Canopy pill.
- **Collecting.** Title: "Round 2 is gathering questions." Line: "Questions close Friday 12 September." Then the questions asked so far, each a row: 28px bird and the asker's name at 13px semibold, the question text at 16px under it, or "Asked anonymously" with no bird; a Keeper (or anyone, on a batch) sees drag handles at the row's left and an x at its right. Under the rows, the ask field: a 56px mist field, "Ask everyone something", with a text link beneath it that flips between "Ask anonymously" and "Ask as Aditi". A Keeper also sees "Open answering now" as a secondary pill after the field. This card is the same at every width.
- **Answering.** Title: "Answers are open until Friday." Then the one Canopy pill, "Answer", or "Finish your answers · 4 of 11" if some are saved. Under it the roll in two groups. "9 of 39 have written in" as the group's caps label, then nine chips at full colour: 28px bird, first name. Then "Still to write", and thirty chips at 45% opacity, birds and names both dimmed. Every chip opens the person's profile. A Keeper sees, under the roll, "Nudge the 30" and "Close answering" as secondary pills, and "Extend" as a third that opens a four-row menu (a day, two days, four days, a week). At 390 the thirty-nine chips take about ten lines, 320px, and that is fine on a home that has nothing else to show.
- **Preparing.** Title: "Round 2 is being put together." Line: "It comes out Saturday at 9 in the morning." Then the roll of who wrote in, one group, full colour. A Keeper sees "Publish now".
- **Published, the next not yet open.** Now is the cover, the same component as on the door and in Before, and nothing else: "ROUND 2 · 15 AUGUST 2026", the roll sentence with birds on the first four names, the headlines line, the whole card a link to the reader. Under the cover, outside it, one muted line: "Round 3 opens 6 October."
- **On hold.** Whatever card the Round is in, with one cinnamon-tinted line at its top (the cinnamon chip tint, `border-cinnamon/30 bg-cinnamon/[0.07]`): "On hold. The next Round will not start until a Keeper says so." A Keeper sees "Resume" at the end of that line. A Round already collecting or answering carries on underneath, visible, because the hold is on the clock and not on the room.
- **Ended.** Title: "Ended on 16 August 2026." Nothing else in Now.

Before. Under Now, `--space-xl` down, the published Rounds newest first, each as the cover, the same component, full width, stacked with `--space-m` between. On a Catch-up with one Round there is one cover and it looks right on its own. A Round nobody wrote in is still listed, with its roll sentence reading "Nobody wrote in.", so the archive tells the truth.

### 2.4 The composer

`/answer` keeps one question per screen and the shell it has, and loses the progress pill: progress is the words "3 of 11" at 13px in the top bar, beside the Catch-up's name, which is the way back. Each question is a heading at 1.5rem with its asker under it (28px bird, name, or "Asked anonymously"), and under that one line the composer did not have before: "Rohan, Priya and 4 others have answered this one", with 20px birds on the two names. That is the room's presence in the place where you write, and it gives nothing away, because who has written in is already on the home.

The answer field is a mist float field that grows with the text. Under it, left, "Add photos" as a text button with a camera glyph (up to three), and a pasted link does its own work: the moment a Spotify, YouTube or Apple Music URL lands in the text, its card renders under the field with an x in its corner; press the x and the link stays a plain link, which is the "no card" escape. A wall question shows "Add your photograph" and one caption line instead of the field. Bottom right, "Skip" as text and "Share" as the Canopy pill. The completion screen is the hoopoe, "That is you in Round 2.", one line, "It comes out on Saturday.", and the name as the link home.

### 2.5 The reader

Section 3, in full.

### 2.6 Who is here, and who wrote in

Two questions, two places, and the second one is drawn on every surface that has a Round on it.

Who wrote in is the roll: names with birds. On the cover and the masthead it is a sentence, "Aditi, Rohan, Priya and 10 others wrote in." on the cover, all thirteen names on the masthead. On the home's Now panel while answering it is two groups of chips, lit and dimmed. In the phone navigator and the desktop rail it is a wrapped set of chips, 28px bird and first name, each one a control that reads the Round by that person. Two people with the same first name in one Round get a surname initial: "Priya M.", "Priya S."

Who is in this is the roster, one level down, behind "39 people". On a phone it is a sheet that rises to the large detent with a grabber, Float white, 20.8px top corners. On desktop it is a centred Float panel, 560px wide and up to 88vh tall, the dialog's material stretched to hold a roster (section 4 says why). Inside, top to bottom: the name and "39 people" as a header; a search line with no box (focus treatment 2), shown only when there are more than twelve people; then the rows, 44px each, in two columns on desktop and one on a phone: 40px bird, full name at 15px, the caps batch line under it, the Keeper's leaf after the name. Rows are ordered by relevance: this Round's writers first, each with "wrote in" in 12px leaf at the row's right, then your own batch, then everyone else alphabetically. On a people Catch-up a Keeper has a "..." on each row that opens a menu wide enough for "Remove from this Catch-up" on one line, with "Make a Keeper" above it. Above the rows on a people Catch-up: "Add someone", a search line, and "Copy the link", a text button that copies and toasts; no coloured well behind the URL, and the URL itself is not printed. On a batch Catch-up none of that appears, and one line under the header says: "Everyone from 2011 is in this. Nobody is added or removed." The sheet's lower half holds the verbs (2.7). It is one door.

### 2.7 The menu, the verbs and the dialogs

There is no menu. The people sheet scrolls past the roster into grouped rows on paper, 12px radius, the iOS inset-list shape, each row 44px, and the groups are the two axes from 1.6.

"You" first, for everyone: **Reminders**, three rows with one tick (Daily, Last day, Off); **Archive**, one row, which closes the sheet, removes the door from the list and the room from the sidebar, and shows a toast, "Archived in the loop", with "Undo" for six seconds; **Delete**, red, last in the group, on people Catch-ups only. Delete opens `ConfirmDialog` in the dialog material: title "Delete in the loop", one line "It sits in the bin for 30 days, then your place in it goes with it.", Cancel then a red "Delete".

"Keeper" second, only for Keepers of a people Catch-up: **Rhythm**, three rows with a tick; **Hold the next Round**, a switch row with one line under it, "A Round already running finishes on its own."; and after a gap, **End in the loop**, red, which opens "End in the loop" / "Nobody can ask or answer again. The Rounds stay readable." / Cancel, "End". A batch Catch-up has no Keeper group at all.

Round verbs are not here. They live on the Now panel with the Round: ask, open answering, nudge, close, extend, publish now. The list row's long press (a phone) or right click (desktop) opens the same sheet scrolled to "You", so archiving from the list and archiving from the room are one thing.

### 2.8 The batch Catch-up

Told apart three ways and never with a badge. The door's eyebrow says "YOUR BATCH · EVERY QUARTER" in leaf. The head's line says "Everyone from 2011, automatically". The people sheet is read-only and says so in one line. Nobody keeps it: the Keeper group does not exist, and the Round verbs on Now are open to anyone in the batch, with a 13px line under them the first time, "Anyone from 2011 can do this." Its first day is the "No Round yet" card in 2.3, and its Before is empty and not drawn. Someone who joins the site in 2028 finds it on their list that night, with every earlier cover in Before.

### 2.9 Archive and delete

Archive is personal, silences reminders, and is undone from a toast or by opening the Catch-up from `/catchups/archived`, which is a plain list of doors with a line at the top, "Opening one brings it back." Delete is the bin: the same page's second half, "In the bin", each door with "26 days left" on its state line and "Put back" as a text link. Nothing on the main list ever shows an archived or binned Catch-up, and the "Archived · 1" row is not rendered until it has something to hold. A batch Catch-up has Archive only.

### 2.10 Comments, a song card, a photo wall

All three are in section 3. In short: comments collapse to "3 comments" on the tile's bottom row and open in place as the tile's one mist well, the post comments family, with the composer pill at the well's foot; a pasted link stays a link in the sentence and its card renders under the text, first music or video link as a full card, any others as chips; a wall is justified rows of everybody's one photograph, each with its bird and first name under it, opening the viewer on the whole wall.

### 2.11 The notification

Six rows in the bell, each with names in it and each landing where the state says.

- "Round 2 of in the loop is open for questions." Lands on the home, collecting.
- "Answers are open in in the loop. Aditi and Rohan have written in." Lands on the composer.
- "Two days left to answer in in the loop." Lands on the composer.
- "Round 2 is out. Aditi, Rohan, Priya and 10 others wrote in." Lands on the reader, at the masthead.
- "Rohan loved your answer." Lands on the reader scrolled to the answer, the tile lit for one beat with the state-press tint.
- "Priya commented on your answer." Lands on the same tile with its comments open.

### 2.12 The empty states

A brand-new member with a batch year has a door on their list the night they join, so the list is never empty for them; a member with no batch year sees the Start door alone and one line above it, "You are not in a Catch-up yet." A batch with no Round is 2.3's first card. A Round with one answer publishes as a Round: the masthead's roll reads "Aditi wrote in.", the cover says the same, and the reader is her answers under their questions with nothing said about the thirty-eight who did not.

### 2.13 The pressure fixture

Section 7, case by case.

## 3. The reader, precisely

Everything in this section is drawn against "in the loop", Round 1, published 15 August 2026, thirteen writers, eleven questions, 133 answers. The writers used here are invented: Aditi Rao '11, Rohan Pillai '11, Priya Menon '09, Nikhil Sen '11, Tara Bhat '12, Arjun Iyer '11, Meera Nair '10, Dev Kapoor '11, Sana Ali '11, Vikram Rao '08, Anjali D'Souza '11, Kabir Shah '13, Leela Joseph '11.

### The masthead

Drawn from the cover's fields and nothing else. At 390, from the top of the page (the green bar is above it, 56px, untouched):

- 20px down, line one: "in the loop" in Libre Baskerville at 1.125rem, Canopy text, underlined on hover, the way up; after it a middle dot and "15 August 2026" at 14px muted. One line, 24px tall.
- `--space-xs` down, "Round 1" as the h1, 2rem, tracking -0.025em, ink. 34px tall.
- `--space-s` down, the roll: a wrapped inline run at 15px, line height 24px, gap 10px horizontally. Each item is a 20px bird, a 4px gap, the first name in ink, and a comma. The last item is "and Leela", then "wrote in." Thirteen names take four lines at 390, about 96px, and every one of them is a link to a profile. Nothing else is on the masthead: no rule under it (1.08:1 was invisible and cost 26px), no eyebrow, no "13 of the group".

At 1512 the same three lines in the 660px reading column, the h1 at 2.3rem and the roll on two lines. As you scroll, the masthead scrolls away and is not replaced by a sticky copy. The name and the Round survive in two other places: the plate on a phone and the rail on desktop.

### The navigator on a phone, resting

It is a plate along the bottom of the screen, and it is the navigator's collapsed state rather than a separate control. Geometry: `position: fixed`, 12px in from each side, so 366px wide at 390; 56px tall; its bottom edge at `max(12px, env(safe-area-inset-bottom))`. Surface: the `.glass` material, a translucent card with backdrop blur, 16px radius, hairline border, the layered ink shadow. Along its top edge, inside the radius, a 2px leaf line whose length is the reader's position inside the current question: it fills from left to right as answers pass the reading line and starts again at the next question.

Inside, left to right: a 28px bird of whoever is talking, meaning the author of the answer under the reading line (a line 40% down the viewport); when the answer changes the bird cross-fades in 140ms. Then two lines: the caps meta line, "IN THE LOOP · ROUND 1", and under it the current question at 14px in ink, one line, its right end faded by a 24px mask rather than cut with three dots. At the right end, "5/11" in 12px tabular muted figures, and a 14px chevron pointing up. The whole plate is one tap target, with the state layer on press.

The current question is the last heading whose top is above the reading line. So the question is always named on screen, at every depth, and the way up is the name on the plate's first line. Tapping the name goes home; tapping anywhere else opens the navigator. Content behind the plate gets 96px of bottom padding so the last heart on the page is never under it.

### The navigator on a phone, open

Tap the plate, or drag it up, and it grows into a sheet. Three heights, Apple's detents: 56px (the plate), 460px (medium), and 92% of the viewport (large). A tap toggles plate and medium; a drag lands on the nearest; a tap on the page or a drag down returns to the plate. At medium there is no backdrop and the page still scrolls underneath, so you can leave it open and read; at large a backdrop tints the page. The grabber, 36 by 5px in the border colour, sits centred 8px from the top.

Under the grabber, the header: "in the loop" at 1.125rem Libre, Canopy, the same link home, with "Round 1 · 15 August 2026" at 13px muted beside it. Then the questions, one row each, 44px tall, full width: a 24px-wide column with the question's number at 12px tabular muted; the question text at 15px in ink, wrapping to two lines at most, its second line faded at the right; and the count of answers, "13", at 12px muted at the row's right edge. The current row has a 3px leaf bar down its left edge, the sidebar's marker, moved on the same spring the sidebar uses, and its number turns leaf. No weight changes anywhere, so nothing reflows (the R4 bug cannot happen). When the sheet opens, the current row is already in view. Tap a row: the page jumps to that heading, landing it 72px from the top (`scroll-margin-top`), and the sheet drops to the plate.

At medium you see the header and nine rows. Scroll inside the sheet, or drag to large, for the rest and for what is under the questions: `--space-l` of air, then the caps label "WHO WROTE IN" in leaf, then the roll as chips, each a 36px pill holding a 28px bird and a first name, wrapping four to a line. Tap Aditi and the sheet drops to the plate, the page rebuilds as her eleven answers under their eleven headings, a 40px row appears under the masthead reading "Reading Aditi's answers" with "Everyone" as a link at its right, and the plate's first line reads "AIDITI · ROUND 1". Her chip in the sheet is the Canopy selected state until you clear it. Under the chips, "and 26 others in this Catch-up", a link to the people sheet.

The forty-answer question reads like this in it: one row, "Describe your month in three words.", with "40" at its right, no taller than any other row. Where you are inside those forty is the leaf line on the plate, which fills slowly across the whole question, and the bird, which changes forty times.

### The desktop plan

At 1512 the shell gives 1184px beside the sidebar. Two columns, centred as a pair in that space: the reading column at 660px, a 30px gutter, the rail at 318px, so 88px of margin each side. At 1920 the same three numbers and more margin; the measure never widens, because a line of 16px text past about 72 characters is harder to read, and that is the one kind of empty space this direction keeps on purpose.

The rail is sticky at 40px from the top with `max-height: calc(100vh - 80px)` and its own scroll. In it, top to bottom: "in the loop" at 1.125rem Libre, Canopy, the way up; "Round 1 · 15 August 2026" at 13px muted; `--space-l`; the eleven question rows at 34px each, same anatomy as the sheet's rows without the answer count, the leaf bar marking the current one and moving on the spring; `--space-l`; "WHO WROTE IN" in leaf caps; the roll as chips, three to a line, five lines; "and 26 others in this Catch-up". Hover on a question row or a chip is the state layer; the current speaker's chip carries a 2px leaf underline under the name, so the wall shows who is talking as the column scrolls. Clicking a chip filters exactly as the sheet does. The whole rail is 664px tall on this Round, inside the 902px it has. On a forty-question Round the rail scrolls, and the current row is kept in view.

The way back on desktop is the rail's name at every depth, and the sidebar's "in the loop" row, which is lit Canopy while you are inside it.

### A question's heading

`--space-xl` (42px) above it and no rule. The question at 1.5rem Libre Baskerville on a phone, 1.7rem on desktop, line height 1.15, tracking -0.02em, ink, wrapping as it needs. `--space-xs` under it, the meta line at 13px muted: "Asked by Rohan · 13 answered", with a 20px bird before Rohan, or "Asked anonymously · 13 answered". No number, because the number is navigation and lives in the navigator only. `--space-m` under the meta line, the answers begin.

### The answer tile, four states

Every answer is either a remark or a tile. A remark is an answer with no photograph, no link, no line break, and at most 80 characters after trimming; everything else is a tile. Under a heading the remarks come first, in the order they were written, as a wrapped cluster; then the tiles, in the order they were written. On this Round question 7 ("Who believes Sanan made this website?") and question 9 ("Describe your month in 3 words.") are all remarks. Question 1 has three.

A remark is an inline box on the page, not a card: paper, 12px radius, hairline, padding 6px 12px 6px 6px, `max-width: 100%`, 6px gaps between remarks and 8px between lines. Inside: a 28px bird; 6px; the first name at 13px semibold; 8px; the words at 15px in ink, wrapping if they must; 8px; the heart at 14px with its count at 12px. Three remarks under question 9 look like this: "🐦 Kabir  Coffee, deadlines, rain.  ♥ 4", "🐦 Sana  Moved. Again. Tired.  ♥ 9", "🐦 Dev  Slow and then not.  ♥ 2". The heart on a remark toggles in place. Tapping the remark's body expands it into a full tile where it stands (opacity and a 4px rise, 140ms), which is where its comments live; tapping the tile's identity row folds it back.

A tile is the paper card the app already has, tightened. 16px radius, hairline, `card-elevated`, padding 16px. The identity row: 40px bird, full name at 15px semibold, "BATCH OF '11" under it in the 10.5px caps line. `--space-s` under it, the body at 16px with line height 1.6, `whitespace-pre-wrap` and `break-words`, so a pasted token can never push the page sideways (recon §0). Then the bottom row, 36px tall, `--space-xs` under the body, and no deeper: the heart with its count at the left, then "3 comments" as a 13px text button 16px to its right, or "Comment" when there are none. Nothing sits at the right end of that row and the row is only 36px, so ¶30's band is gone.

**Text only.** Exactly the above. Rohan under question 3: "Honestly, RV made me suspicious of anything that answers too quickly. We were taught to sit with a question, and these things do the opposite, so I use them the way I used the library: to find the shelf, never to skip the book." Seven lines at 390, a tile 230px tall.

**With one photograph.** The body, then `--space-s`, then the PhotoFrame at 12px radius: a wide photograph runs at its own shape, full width of the tile's inner 318px at 390; a tall one is held at 3:4 on a blurred bed of itself, capped at 700px tall on desktop. Under the photograph, the caption clamp at four lines with "More" (D38). Tap opens the viewer. Anjali under question 10: "The mango sticky rice at the stall by the station. I went back the next day." and a landscape photograph 318 by 212.

**With three photographs.** The body, then justified rows from the aspect ratios, gap 8px on a phone and 12px on desktop. Aditi's three under question 1 (1200x1600, 1200x1600, 1288x966) at 390 become one row of the two portraits side by side, 155px wide and 207px tall each, then the landscape alone under them at 318 by 238: 453px of pictures, no letterboxing, no blurred bed. At 660 all three fit one row 236px tall: 177, 177 and 316 wide. Tap any of them and the viewer opens on that one of the three.

**With a song link.** Aditi under question 5 pasted a Spotify URL after four words. Her sentence prints as she wrote it, "This, since the train https://open.spotify.com/track/..." with the URL an underlined link, wrapping at any character. `--space-s` under it, the song card: a nested row at 12px radius on `background/60`, hairline, padding `--space-s`; 64px square art at 8.8px radius; the title at 15px semibold, "Vaseegara"; under it the artist at 13px muted, "Bombay Jayashri"; at the row's right end "SPOTIFY" in the caps line with the arrow glyph, and a 32px Canopy play circle when a 30-second preview exists. A YouTube link makes the same row with a 96 by 54 thumbnail (the true 16:9 file, never the letterboxed one, prior-art §7) and the channel where the artist goes. A second link in the same answer becomes a chip under the card: a 16px favicon and the title on one line. A link that does not resolve is left as the underlined link and nothing else, and that is the same shape whether the endpoint failed or timed out. A song typed as words is a tile with no card.

**How a one-word answer and a 2,000-character answer are packed.** The one-word answer is a remark, 36px tall, three or four to a line, its bird and name and heart all present, and it costs the page a fifth of what a tile costs. The 2,000-character answer is a tile with a body about 34 lines tall at 390; it is printed in full, because folding answers is what Wikimedia measured a reading cost for. At 1,200 characters and beyond, the tile folds at the twenty-first line with "Read the rest" as a text button, opening in place; that is the only fold, and it is one tap.

### Comments, collapsed and open

Collapsed, a comment thread is the words "3 comments" on the tile's bottom row. Tap them and the thread opens under the row as the tile's one mist well, 12px radius, padding `--space-s`, using the post comments family: each row a 28px bird, the name at 13px semibold, the comment at 14px, a 14px heart at the right, @mentions rendered by the same rich text as everywhere. At the well's foot, the composer pill, "Add a comment", which grows into a field on tap and never steals focus on its own. "Hide" at the well's top right folds it. A remark's comments live in its expanded tile.

### The heart

The shared LoveButton, red `#E03A33` in every theme, with its count. On a tile it is the app's `md` size at the bottom row's left; on a remark it is 14px inline; in a comment row 14px at the right. It flips on the first frame and nothing rebuilds behind it: the server action for a heart on a Catch-ups answer must not revalidate the page (recon §8, 603 KB per tap today).

### The way back from any depth

On a phone, the name on the plate's first line, at every scroll position. On desktop, the name at the top of the sticky rail, and the Catch-up's lit row in the sidebar. Inside the people sheet, closing it. From a filtered reading, "Everyone" clears the filter and the name still goes home. Nowhere on the page is there a Back button, and the words "Back to" do not appear.

### The end of the Round

After the last tile, `--space-xxl` (68px) of air, then a closing block with no card around it. "That is Round 1." at 1.25rem Libre. Under it at 16px: "Round 2 opens 6 October. Rohan has already asked something." Under that, the name, "in the loop", at 1.125rem Libre in Canopy, the same link as the top. Then 96px of padding so the plate does not sit on it. Nothing about who wrote in is repeated here.

### The first screen at 390

The green bar, 0 to 56. At y=76, "in the loop · 15 August 2026". At y=106, "Round 1". At y=150 to 246, the roll: four lines of birds and names, "Aditi, Rohan, Priya, Nikhil, / Tara, Arjun, Meera, Dev, / Sana, Vikram, Anjali, Kabir / and Leela wrote in." At y=288, the heading "What is a fun thing you did this summer?" on two lines, ending at y=344; "Asked anonymously · 13 answered" at y=352. At y=378, three remarks: "🐦 Kabir  Learnt to swim, at 31.  ♥ 6", "🐦 Tara  Nothing and it was perfect  ♥ 11", "🐦 Dev  Drove to Hampi with no plan  ♥ 3", ending around y=470. At y=482 the first tile begins: Aditi's identity row, "Aditi Rao / BATCH OF '11", then "Paris in June with my sister, which we had talked about since school and never done..." and the top of her two portrait photographs, running under the plate. The plate, y=776 to 832: Aditi's bird, "IN THE LOOP · ROUND 1", "What is a fun thing you did this summer?" faded at its end, "1/11", the chevron, and the leaf line at 4 of 13 along its top. Three complete answers on the first screen, and the question named twice.

### The first screen at 1512

The sidebar, 0 to 248, Catch-ups lit, "in the loop" lit beneath it. The reading column from x=376 to 1036: name and date at y=40, "Round 1" at y=72 at 2.3rem, the roll on two lines at y=124 to 172, the heading at y=214 on one line, the meta line at y=250, the three remarks on one line at y=282, and Aditi's tile from y=330 with her three photographs in one 236px row inside it, ending near y=920. The rail from x=1066 to 1384, top at y=40: the name, the date, the eleven questions with the leaf bar on the first, the roll in five lines of three, "and 26 others in this Catch-up". Nothing floats along the bottom on desktop.

### A mid-scroll screen at 390, deep in question 5

The green bar. Under it, the tail of Priya's tile: her song card, art, "Kanmani Anbodu", "Prabhu", "SPOTIFY", the play circle, then her bottom row, "♥ 12   2 comments". Then Rohan's tile: "Rohan Pillai / BATCH OF '11", the body "this, on a loop since Goa https://www.youtube.com/watch?v=..." with the URL underlined, then the YouTube row, a 96 by 54 thumbnail, "Mustt Mustt (Live)", "Nusrat Fateh Ali Khan", "YOUTUBE", then his bottom row. Then the identity row of Nikhil's tile starting under the plate. The plate: Rohan's owlet at the left, "IN THE LOOP · ROUND 1", "Songs you've had on repeat lately" fitting on one line, "5/11", the leaf line just past half. No question number on the page, no chip row, and no way to lose the question.

## 4. The design system, kept and broken

Kept, by default and without argument: the palette (D3) and nothing outside it; Libre Baskerville for every heading and Source Sans 3 for everything else; the radius ladder, 16 for the tile, 12 for the remark, the song row, the comment well and the cover's nested box, 8.8 for the song art; the surface ladder, paper on the page, `background/60` for nested rows, Float for the sheets, one mist well per tile; the state layer for every hover and press, never an opaque swap; Canopy for every pill that does something and Leaf for the marker, the eyebrow and the progress line; the three focus treatments; hover never moving a control; the press sink; `SpringPress` on every clickable; the viewer step; the dialog material for the two confirmations; the caps meta line under names at its 10.5px; `metaLine` for every middle dot.

Broken, three times, each one the point:

1. **A fixed bar along the bottom of a phone.** Nothing else in the app floats at the bottom, and the shell's chrome is the green bar and the sidebar. The plate is Catch-ups' Action Button: end to end at the bottom, glass instead of paper, a thing you drag, drawn nowhere else. It is the one place a reader's thumb rests, and the current question has to live where the thumb is.
2. **The people sheet is wider and taller than a dialog may be.** The dialog rule says `max-w-sm` and seconds. A roster of thirty-nine, its verbs, and a search line is not a dialog, so this is a sheet in the dialog's material at 560px and up to 88vh, with grouped paper rows inside Float, which the ladder would otherwise read as a step down. The alternative was a page, and a page loses the room you came from.
3. **The sidebar grows rows.** The shell's sidebar is one flat list of sections. Under Catch-ups it now holds your rooms, with one cinnamon dot for the one state that needs you. That changes shared chrome, and it is done because "getting anywhere with one obvious move" is a promise the sidebar can keep better than any page.

The one thing on screen that could only be this app: the bird in the plate. As you scroll a Round on your phone, the 28px bird at the bottom left changes to whoever is talking, so a twelve-minute read passes through thirteen birds you know by name from the door.

## 5. Letterloop, closed and open

Closed: **L-a**, comments with @mentions, the post comments family in the tile's one well. **L-b**, a card for a pasted link on any question, our own card, first link full and the rest chips. **L-c**, the wall as a block any question can carry, justified rows, a bird and a first name under each photograph. **L-d**, "Round 2 opens 6 October" at the Round's close and on the Now panel. **L-f**, reply progress as names: lit and dimmed chips on the home, "Rohan, Priya and 4 others have answered this one" in the composer, "Nudge the 30" for the Keeper. **L-l**, filter by member, the roll in the navigator and the rail: this is the direction's own axis and it goes further than Letterloop's Options menu, because a name is one tap from anywhere in the Round. **L-o**, quick actions, as the state line on the door and the cinnamon dot in the sidebar.

Left open on purpose: **L-e**, a reaction picker; the heart is the app's one reaction and a room of old friends does not need six. **L-h**, the Album; a good shelf for Before in some direction, but it would put photographs where this direction puts people. **L-i**, the PDF, track M. **L-j**, Mementos. **L-k**, themes. **L-m**, a banner photograph; the room's picture is the people in it. **L-n**, roles; Keeper, and on a batch nobody.

## 6. Live and static

Must be live to be judged: the plate and the sheet on a phone, with real drag between the three detents, a real tap toggle, the page scrolling underneath at medium, the question rows jumping the page, the leaf bar moving, the bird in the plate changing as the fixture's answers pass the reading line, and the leaf line filling across a forty-answer question. The scroll-spy that names the question. The remark that expands into a tile and folds back. The heart on a tile, a remark and a comment, flipping on the first frame. "3 comments" opening the well. A roll chip filtering the Round to one person and "Everyone" clearing it. The desktop rail's marker moving on its spring and the speaker underline moving with the scroll.

May be a static composition: the list at three widths, the sidebar rows, the seven Now states, the composer, the people sheet's rows and its verb groups, the two confirmations, the notification rows, the song and YouTube cards with fixture art, the wall's rows, the end of the Round.

## 7. Under pressure

**One answer.** The masthead's roll reads "Aditi wrote in." The reader is her answer under each question she took, and a question she skipped prints its heading with "Nobody took this one." under it. The navigator lists every question with its count, most of them "0". The plate's leaf line is either empty or full. It looks like a room with one person in it, which is what it is.

**Forty answers.** Ten of the fixture's forty are 240-character tiles and thirty are remarks, so the question is about 400px of cluster and then ten tiles. The leaf line fills across all forty. Where it breaks: the counter behind the line counts by the remark under the reading line, and with three remarks to a line it can only ever be right to within a line. Forty full tiles is 8,000px, which the plate survives and a member's patience may not; the direction has no window of mounted answers and does not pretend to.

**A 6,000-character answer, and the 9,000 one over the cap.** A tile folded at its twenty-first line with "Read the rest"; opened, 6,000 characters is about 100 lines at 390, a 2,700px tile, printed whole, with `break-words` on. The over-cap row is the same tile a third taller. Nothing clips, nothing scrolls inside the tile.

**A 24-photo wall.** Justified rows at 8px gaps: two to a row at 390, twelve rows, about 2,200px; four or five to a row at 660, about 900px. Each cell has a 20px bird and a first name under it, 16px tall. The broken file draws a paper box at the photograph's stored ratio with the bird and name under it and nothing inside, so the row keeps its shape. The over-cap answer with six photographs prints six in its rows.

**A 300-character question.** The heading at 1.5rem wraps to seven lines at 390 and looks like a paragraph in the heading face; that is honest, and there is no cut. In the sheet and the rail it wraps to two lines and fades at the second line's end, with the whole question in a title attribute and readable at the heading. The plate shows its first line, faded.

**A 78-character name.** In the tile's identity row the name wraps to two lines at 390 and the caps line sits under both. In a remark it is the first name only, "Padmanabhan", and if that alone is over 24 characters it fades at the chip's edge; the expanded tile has the whole name. On the roll and the cover, the first name. In the people sheet's row, two lines. Nothing truncates with dots and nothing overflows.

**An emoji-only answer.** A remark: the bird, the name, the emoji at 20px, the heart. "🫠" from the fixture is 36px tall and 110px wide.

**A pasted 123-character link.** As the whole answer, the sentence is the link, underlined and wrapping at any character, and the card under it if it resolves. The fixture's fake track does not resolve, so it prints as the underlined link on three lines, and the page does not move sideways, because `break-words` is on the tile's body and the remark's body both. The bare 180-character word with no spaces in it breaks the same way.

**A Round nobody answered.** It publishes and it is honest about itself. The cover's roll sentence reads "Nobody wrote in." with no birds; the reader's masthead says the same; each heading carries "Nobody took this one."; the navigator's counts are all "0"; the plate's bird slot shows the hoopoe, because there is nobody to show. The door's state line does not promote it, and Before lists it dimmed at 60% opacity. Where this breaks: a batch that never answers keeps publishing empty Rounds on its rhythm, and the direction's only answer is the hold, which somebody has to reach for.

**The no-batch member, the Devanagari name, the right-to-left name.** The caps line is simply absent when there is no batch year. Names in other scripts sit in the identity row and the roll at their own widths; the roll's comma follows the name. The right-to-left name renders as its own run inside the chip.

## 8. The two things I am least sure I got right

**The remark.** Deciding that an answer under 80 characters with no photograph is drawn as one line with a bird, and that all the remarks under a question come before all the tiles, does two things a member did not ask for: it changes the size of what they wrote, and it changes where it sits in the order. A one-line answer can be the one that matters most in a Round, and this direction gives it the shape of an aside. The threshold is a guess; 80 characters might be right for "Describe your month in 3 words" and wrong for a single sentence somebody meant. If the judges like the cluster and not the reordering, the alternative is remarks in place, each on its own line between tiles, which keeps the order and loses about half the density.

**One door under "39 people".** Every verb, from your reminders to the Keeper's End, is behind the count in the head, because a room's information sheet is where WhatsApp keeps mute and exit and people know it. But a member who wants to archive a Catch-up may never think to tap a number of people, and a Keeper who wants to change the rhythm has to scroll past thirty-nine rows to find it. The long press on the list row covers the first case and a "Settings" jump link at the sheet's top would cover the second, and both are patches on a decision that might just be wrong. The other reading of 1.6, a menu on the head beside the count, is one more control and possibly the right one.

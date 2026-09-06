# Signed at the foot

**Thesis:** A published Round is one letter that thirteen people wrote, so the reader sets every answer as a passage of prose on a single sheet and puts the writer's bird and name at the foot of the passage, where a signature goes.

**Designer:** 10 letter, blind.

**The bet, as given:** THE LETTER. A Round is a letter to the batch that many people wrote. The reader reads like correspondence: typographic, paced, answers as signed passages rather than tiles, the bird as the signature. Warm paper is already the app's ground; the question is what a letter from twenty-three people looks like on a phone and on a laptop, and how you move through one without a table of contents that looks like a table of contents. You have not seen today's layout and you should not try to imagine it.

## 1. The idea

You open Round 1 and you are holding a letter. On a phone the paper fills the screen under the green bar. At the top left, in leaf small caps, is who it is from as a group: IN THE LOOP. At the top right, the date. Then "Round 1" in Baskerville, and under it a line of prose that begins "From" and runs through thirteen names, each with its bird beside it. Then the first question, in italic, and under the question the first answer, set as plain running text with no box around it. You read it to the end, and at the end there is a bird and a name: that was Meera. Then the next passage begins.

That is the whole bet. An answer is not a card with a header. It is a passage somebody signed. Everything else in this direction follows from taking that seriously: there are no tile borders, no hairlines, no "Question 1", no row of birds you cannot name, no sentence quoted from the most-hearted answer, and nothing on the page that is clickable except the things a reader would actually want to click (a photo, a link, a name, the heart, the comments, the question you want to jump to).

What it bets on is pacing. A letter has a rhythm on the page: a block of text, a signature, a gap, the next block. Thirteen passages under one question read as thirteen voices taking turns, and the bird at the foot of each one is the beat. A one-line answer takes one line. A two-thousand-character answer takes the space it needs. Nothing is padded to fill a card.

What it refuses to do:

- It refuses to put the name before the words. You read the answer, then you learn who wrote it, the way you would with post. On desktop the birds hang in the sheet's left margin at the foot of each passage, so a glance down the margin tells you who is in this question, but the reading order is still words first.
- It refuses to decorate. No derived photograph on the cover, no ornament between passages, no rule under the masthead. The cover is typographic. The list item is a sheet, and a Catch-up with more published Rounds is a thicker stack of sheets, which is the only picture it gets.
- It refuses to shrink long answers or collapse questions to make the page short. The letter prints what was written.
- It refuses to build a second way to read that looks like a nav rail. The phone's navigator is a running head, like the top of a continuation sheet, and what it opens is the letter's own contents page set in the letter's own type.

What it is not, and what it most risks resembling: a Substack post with a comments section, or a testimonials page. Both are a column of prose with names attached. Three things keep it from being either. The passages are answers to a question that sits above them in italic, so the page reads as call and response rather than as one author. The signature carries a bird, not a headshot, so the page has a column of colour down it that only this app has. And the letter is addressed: it opens with who it is from and it closes with their signatures, which a blog never does.

Where it departs from the architecture's RECOMMENDED lines:

- The answer's identity moves from the top to the foot. The architecture keeps the tile's contents (bird, name, batch, answer, heart) and frees its chrome; this direction keeps all five and changes their order. The heart sits on the signature line, at the far end, so the moment you learn who wrote it is the moment you can thank them.
- The reader gets a second way through, by writer. Tap a name in the from-line and the letter becomes that one person's part: their answers only, under their questions. This is a filter on the same reader at the same address, so no noun gains a second home, and it is the closest thing this direction has to the "read the letter one hand at a time" a round-robin letter allows.
- The home's Now panel, once the Round is out, shows the cover and never the Round itself. The reader is a sheet you open; the home is the desk it lies on.

Everything else in Part 1 is kept: the six nouns and their homes, the three-part home, one cover drawn from four fields, one door for the verbs, names beside birds, the batch Catch-up with no Keeper (option 1), the hold on the next Round, the Archived row.

## 2. The screens

Tokens used below: the type scale as written in DESIGN-SYSTEM.md section 5; the radius ladder 16 / 12 / 8.8 / pill; the surface ladder background, paper, accent, float; the LiftKit steps named `--space-xs` through `--space-2xl`, which at the 16px base round to 6, 10, 16, 26, 42 and 68px. Where a pixel value is given for a space, it is that step, and the builder uses the token. Muted text means the app's muted foreground token. "A sheet" means a Paper surface with 4px corners and the layered ink shadow, no border; section 4 says why it is 4px and not 16.

### 2.1 The list

At 390. The green bar. Below it, 26px of page. "Catch-ups" in Baskerville 32px on the left; on the right a Canopy pill, "New", 36px tall. Then 26px. Then the Catch-ups, one under the other, 16px apart, each a sheet the full width of the column.

Each sheet is 16px padded, and holds three lines and nothing else:

1. The name, Baskerville 24px, ink. "In the loop". For the batch one, "Batch of '11".
2. Source Sans 15px, muted: "23 people · every month". For the batch one, "Everyone from '11 · every three months".
3. The state line, Source Sans 15px, ink: one of "Answering · closes Sunday · 9 of 23 have written", "Collecting questions for Round 2", "Round 2 comes out Monday", "Round 1 is out · 15 August", "Round 2 opens 15 September", "On hold", "Ended 3 March", "No Round yet". If there is something for you to do (answering is open and you have not written; someone commented on your answer), a 6px leaf dot sits before the line.

Behind each sheet is its stack. For every published Round, up to three, one more sheet edge shows behind it, each 3px lower and 3px further right, Paper, with the same shadow. A Catch-up with no Round is a single sheet. A Catch-up with five Rounds is a stack three deep. That is the whole picture a Catch-up gets, and it is honest: it is thicker because more was written.

The whole sheet is the tap target and opens the home. Long press opens the same menu the home's door opens (2.7). Hover on desktop is the state layer over the paper; press sinks it.

Under the last Catch-up, when at least one is archived or in the bin, a plain row in muted 15px: "Archived · 2". Tap it and the archived Catch-ups appear in place under the row as sheets at 60% opacity, no stack. Tap one to open it; opening brings it back, with a toast "Back on your list · Undo". The bin is the same row's second half: "Deleted · 1, gone in 23 days". Tap it, and the deleted one appears in place with one text button, "Restore".

At 1512 and 1920. Same heading row across the top of the content column. The sheets are 360px wide, 32px apart, left-aligned in a row. Two Catch-ups make two sheets and leave the rest of the row as page, with the valley wash showing through. A third wraps only past 1180px of content width, so at 1512 three sit in a row. Nothing stretches. The sheets are 152px tall at these widths. The Archived row sits under the row of sheets, left-aligned to the first.

### 2.2 Making one, and starting a Round

"New" opens `/catchups/new`, a page and not a dialog, because it asks for three things and one of them is a list of people. It is the calm-form material: mist-filled borderless fields, 56px tall, label floating inside. On a phone the fields are full width with 16px between them; on desktop the form is 480px wide, left-aligned.

The page: "New Catch-up" in Baskerville 32px. One line under it, Source Sans 15px muted: "For people you choose. Your batch already has one." Then the fields, in this order:

1. "Name". Free text.
2. "People". A search field. Typing shows matches under it as rows (bird 28, name, batch small caps); tapping a match adds them as a chip above the field, name with a 20px bird, pill, mist. The chips wrap.
3. "A Round every", which is a sentence with a select in it: "A Round every [month]". The select is the menu material, three rows: month, two months, three months.

Then a Canopy pill, "Make it". On making: the home opens, in the "no Round yet" state, with you as Keeper.

Starting a Round is never a page. On a batch Catch-up's first day, and on a people Catch-up before its first Round, the Now panel holds the one button, "Start the first Round". Tapping it opens Round 1 in its collecting state, in place, and a toast says "Round 1 is collecting questions". No dialog: a Round collecting questions can sit there harmlessly until answering opens on its clock.

### 2.3 The home

`/catchups/[id]`. Three parts, top to bottom: the head, Now, then the earlier Rounds. On a phone they stack. On desktop the head spans the column, Now is a sheet 720px wide on the left, and the earlier Rounds sit under it as covers in a row.

**The head** at 390. 26px under the green bar: the name in Baskerville 32px, "In the loop", with the menu trigger (three dots, the menu material's trigger, 44px hit area) on the same line at the right. Under the name, one line in Source Sans 15px: "Every month · 23 people", where "23 people" is leaf-coloured and is the only control that opens the people sheet. Nothing else in the head. For the batch Catch-up, "Batch of '11" and "Everyone from '11 · every three months · 39 people".

**Now** is a sheet, 16px below the head, 20px padded (24px on desktop). It is the Round being written, lying on the desk. Its content by state:

- *No Round yet.* Baskerville 20px: "No Round yet." Source Sans 15px muted: "A Round asks everyone a few questions, then prints the answers as one letter." Then the Canopy pill "Start the first Round". On a batch Catch-up any member sees the button; on a people Catch-up only the Keeper does, and everyone else sees the two lines and no button.
- *Collecting.* Baskerville 20px: "Round 2 is collecting questions." Muted line: "Answering opens Monday 14 September." Then the questions gathered so far, each as its own paragraph in Baskerville italic 17px with a 13px muted line beneath: "Asked by Nikhil Menon" or "Asked anonymously". Between them 16px; no rules. Under the list, the composer pill from the comments family, placeholder "Ask a question", with a check row beneath it, "Ask anonymously". For a Keeper (or anyone, on a batch), a secondary pill at the bottom right: "Open answering now".
- *Answering.* Baskerville 20px: "Round 2 is being written." Muted line: "Closes Sunday 20 September." Then the one Canopy pill, "Answer" (it reads "Change your answers" once you have sent). Under it, 16px, Source Sans 15px: "9 of 23 have written:" and then the nine as name-and-bird items wrapping (bird 28, name 15px, 12px between items). Then a muted line: "Still to write: Arjun Mathew, Priya Venkat, and 12 others", where "and 12 others" opens the rest in place. For a Keeper, a row of three secondary pills at the bottom: "Nudge everyone", "Extend a week", "Close now".
- *Preparing.* Baskerville 20px: "Round 2 comes out on Monday 21 September at 9:00." Then "13 of 23 wrote in:" and the names as above. Keeper: one secondary pill, "Publish now".
- *Published, next not yet open.* The cover of Round 2 (2.6 below describes it), which is the whole sheet: the Now sheet *is* the cover in this state, and tapping it anywhere opens the reader. Under the cover, outside it, one muted line: "Round 3 opens 15 October."
- *Paused.* The same Now sheet as whatever state the Round is in, with one extra line at its top in cinnamon 13px small caps: ON HOLD, and beside it in muted 13px: "The next Round waits until a Keeper resumes." A Round already collecting or answering carries on beneath it. For a Keeper, a secondary pill "Resume" beside the line.
- *Ended.* Baskerville 20px: "Ended on 3 March 2026." Nothing else in the sheet.

**Before.** If there is more than one published Round, a small caps label 26px under Now, muted, "EARLIER ROUNDS", and under it the covers, newest first, each a sheet, 16px apart on a phone and in a row of up to three at 360px wide on desktop. If the only published Round is the one showing in Now, there is no label and nothing here. On a Catch-up with one Round that has since moved to collecting Round 2, Before holds one cover and looks fine doing it: a single sheet with a date on it.

### 2.4 The composer

`/catchups/round/[id]/answer`. On a phone the paper fills the screen under the green bar; on desktop it is a sheet 720px wide, centred in the column, with 72px inner side padding, like the reader's sheet. It looks like the letter with blanks in it, which is the point: you are writing your part of the thing you will read next week.

Top left, leaf small caps: IN THE LOOP · ROUND 2. Tap it: home. Then "Your part of Round 2" in Baskerville 32px (40px on desktop). Under it, 15px muted: "Closes Sunday 20 September. Answer any of the 11, skip the rest."

Then each question, in the reader's own heading style (Baskerville italic 20px, with the "Asked by" small caps eyebrow above it where there is an asker), and under each a mist well, 12px corners, 88px tall to start, growing as you type, placeholder empty. Under the well, two text controls in 14px leaf: "Add photos" and, only on a question the Keeper marked as a photo wall, "Add your photo" instead (one photograph, and the well is 44px tall with placeholder "A line to go with it"). Pasting a Spotify or YouTube link into any well shows, under the well, the same song card the reader will print, so you can see it worked. Photos you add show under the well as a justified row of thumbnails with a remove cross on each. Between questions, 42px.

At the bottom, a row: on the left, 14px muted, "4 of 11 answered · saved"; on the right, a Canopy pill, "Send". Send needs no dialog. The page turns into the completion moment: "Sent." in Baskerville 32px, then "Round 2 comes out on Monday 21 September." then "Written so far by" and the names with birds, then the return address IN THE LOOP as a leaf small-caps line that takes you home. A text link, "Change your answers", reopens the composer until it closes.

### 2.5 The reader

Section 3 is the reader in full. In one line: one sheet, the masthead at the top, the questions as italic headings, the answers as signed passages, a running head on the phone that opens into the letter's contents, and margins on desktop that hold the contents on the left and the writers on the right.

### 2.6 Who is here, and who wrote in

**Who is here** lives behind "23 people" in the head. On a phone it rises from the bottom as a sheet in the dialog material (Float, 20.8px top corners, the warm-ink backdrop), 88% of the screen tall, with a drag edge. On desktop it is the dialog panel, `max-w-sm`, and the list scrolls inside it up to 70% of the viewport.

Its title: "In the loop" in the dialog title style. For a people Catch-up, under the title, a search line with no box (the borderless field treatment), placeholder "Add someone by name", and beside it a text button "Invite link", which copies the link and toasts "Link copied". Then the list, in three runs with small caps labels: WROTE IN ROUND 1 (this Round's writers), YOUR BATCH, EVERYONE ELSE. Each row: bird 28, name in 15px ink, the batch line in small caps muted, and for a Keeper the leaf glyph and the word KEEPER in leaf small caps after the name. Nothing else on the row. Tapping a row opens their profile. For the Keeper of a people Catch-up, each row carries a three-dot trigger at the right with one item, "Remove", which opens a confirm ("Remove Tara Bhat", description "They will not see Round 2 or anything after it", Cancel / Remove).

For the batch Catch-up: the title is "Batch of '11", under it one muted line "Everyone from the batch, 39 people", no search, no invite, no row menu. Just the list.

**Who wrote in** never appears as a count alone. It is names with birds, in three places, and the same component draws it in all three: on the Now sheet while answering and preparing ("9 of 23 have written:" and the names), on the cover ("From Meera Kulkarni, Dev Sharma, Ananya Rao and ten others"), and in the reader's masthead (section 3). The number of names before the fold is five on a phone and everyone on desktop, and "and eight others" opens the rest in place.

**The cover.** Drawn from four fields and nothing else. A sheet, 16px padded on a phone, 20px on desktop, 360px wide on desktop and full width on a phone. Top line: on the left, only when the cover is somewhere other than its own Catch-up's home (the list, a notification), IN THE LOOP in leaf small caps; on the right, always, the date in muted small caps, 15 AUGUST 2026. Then "Round 1" in Baskerville 24px. Then the from-line: "From" followed by three names with their 28px birds, then "and ten others" in muted. Then one line, 14px muted: "133 answers to 11 questions". The whole sheet is the tap target and opens the reader. There is no link inside it, no button, no quoted answer, no picture. The masthead in the reader is this same block at a larger size, so the resemblance is not a resemblance, it is the same thing.

### 2.7 The menu, the verbs and the dialogs

One door: the three dots in the head. The list row's long press (a menu on desktop) opens the same one. Nothing else anywhere offers a lifecycle verb.

The menu, in the menu material, top to bottom:

- Reminders ▸ (a submenu with three radio rows: "Daily while answering", "Last day only", "Off")
- Rhythm ▸ (Keeper of a people Catch-up only; three radio rows: "Every month", "Every two months", "Every three months")
- Hold the next Round, or Resume when held (Keeper of a people Catch-up only; acts at once, toast "The next Round will wait · Undo")
- Archive (acts at once, toast "Archived · Undo")
- separator
- End (red; Keeper of a people Catch-up)
- Delete (red; any member of a people Catch-up)

For the batch Catch-up the menu is two rows: Reminders ▸ and Archive. There is no Keeper, so there is nothing else to offer, and there is no leaving it.

Two dialogs only, both `ConfirmDialog`:

- End. Title "End this Catch-up". Description "No more Rounds. Everything already written stays readable." Cancel, then a red "End".
- Delete. Title "Delete this Catch-up". Description "It goes to your bin for 30 days, and then you leave it for good." Cancel, then a red "Delete".

Round verbs live on the Now sheet, never in the menu: ask a question, open answering now, nudge everyone, extend a week, close now, publish now. "Close now" and "Publish now" act at once with a toast and an Undo that lasts until the toast goes, because both are things a Keeper meant to do and both are recoverable for ten seconds.

### 2.8 The batch Catch-up

Told apart by its name and its second line, and by what it lacks. Its name is "Batch of '11" and no one can change it. Its line is "Everyone from '11 · every three months". No leaf beside any name, because nobody keeps it. The people sheet has no search, no invite and no row menu. The menu has two rows.

Its first day: the home, with the head and a Now sheet reading "No Round yet." and "A Round asks everyone a few questions, then prints the answers as one letter." and the Canopy pill "Start the first Round", which any of the 39 may press. Nothing under it. Someone who joins the site in 2028 lands on the same home with Round 1 through Round 7 stacked in EARLIER ROUNDS, and reads any of them.

Round verbs (open answering early, extend, nudge, close, publish now) are offered to every member of the batch, on the Now sheet, as they would be to a Keeper.

### 2.9 Archive and delete

Archive is in the one menu, on the home and from the list row. It removes the Catch-up from the list and silences its reminders, with a toast and an Undo. It comes back when you open it from the Archived row (2.1), and the Now sheet does not change, because archiving changed your list and not the Catch-up.

Delete is in the same menu for a people Catch-up. It goes to the bin for 30 days, which is also how you leave; the dialog says so in one line. The Archived row's second half shows it and its remaining days, with "Restore". The batch Catch-up has no Delete.

### 2.10 Comments on an answer, a song card, a photo wall

All three are drawn in section 3, since they live in the reader. In short: comments sit under the passage's signature line, collapsed to their count on that line and opening in place, using the post comments family. A song link stays a link in the text and prints our own card under the text. A photo wall is a block a question carries above its passages: one photograph from each writer, as one justified grid, each photograph wearing its writer's bird at its bottom left corner.

### 2.11 The notification

Each is one row in the app's notifications. Its body, and where the tap lands:

- Collecting: "Round 2 of In the loop is collecting questions." Lands on the home.
- Answering opens: "Round 2 of In the loop is open. Answer by Sunday 20 September." Lands on the composer.
- Nudge: "Round 2 closes tomorrow. 9 of 23 have written." Lands on the composer.
- Published: the cover itself is the body, with IN THE LOOP on its top line since it is away from home. Lands on the reader at the masthead.
- A comment: "Priya Venkat commented on your answer to 'Songs you've had on repeat lately'." Lands on that passage in the reader, scrolled so the signature line sits under the running head, with the comments open.

### 2.12 The empty states

A brand-new member with a batch year has a list of one: their batch Catch-up, in whatever state it is in, most often "No Round yet". Nothing on the list explains itself, because the sheet's own state line does.

A new member with no batch year sees a list with no sheets: under the heading, in Source Sans 15px, "You are not in a Catch-up yet. Make one with people you choose." and the "New" pill already in the heading row.

A batch with no Round yet: 2.8.

A Round with one answer: the reader opens with "From Meera Kulkarni." as its whole from-line, and prints only the questions she answered, each with her one passage. The contents panel lists those questions with "1" beside each, and beneath them, under a muted small caps line NOBODY ANSWERED, the rest, in muted and not tappable. The folio counts the answered ones: "1 of 7".

### 2.13 The pressure fixture

Section 7 takes each case in turn.

## 3. The reader, precisely

`/catchups/round/[id]`. On a phone the paper fills the viewport under the green bar; the valley wash is not visible on this page at 390, because the sheet covers it. At 1512 the sheet is 720px wide and sits on the page with the wash around it; its inner side padding is 72px, so the text measure is 576px. At 390 the text measure is 342px, with 24px side padding.

Type in the reader, and nowhere else at these sizes: passages in Source Sans 3 at 17px with a 1.6 line height (27px lines) at 390, and 18px with 1.6 (29px lines) at 1512. Question headings in Libre Baskerville italic, 20px/1.3 at 390 and 24px/1.3 at 1512, tracking -0.025em. Signature names in Libre Baskerville italic 15px. Small caps lines in Source Sans 3 at 12px, uppercase, tracked 0.12em. Links in passages are leaf, with `overflow-wrap: anywhere` so a pasted address breaks inside itself rather than pushing the column.

### The masthead

It is the cover, drawn large, from the same four fields.

At 390, from the green bar down: 26px of paper. Then one line, 14px tall: IN THE LOOP on the left in leaf small caps, and 15 AUGUST 2026 on the right in muted small caps. The name is the way home; tapping it opens the Catch-up's home. Then 10px. Then "Round 1", Baskerville 32px, line 40px. Then 10px. Then the from-line: the word "From" in Source Sans 15px ink, then five writers as name-and-bird items that wrap (bird 28px, 10px gap, name in Source Sans 15px, 12px between items, 32px line boxes), then "and eight others" in muted 15px. At 390 this runs to three lines, 96px. Tapping "and eight others" opens the remaining eight in place. Tapping a name sets the letter to that person's part (below, "by writer"). Then 10px. Then one line in Source Sans 15px muted: "133 answers to 11 questions." Then 42px, and the first question.

At 1512 the masthead is the same block with the title at 40px and no from-line inside the sheet, because the writers stand in the right margin, level with the title (the desktop plan below). The count line follows the title directly.

As you scroll, the masthead scrolls away like anything else. On a phone, the moment the first question's heading reaches the top of the viewport, the running head fades in over the paper (opacity only, 140ms) and stays for the rest of the letter. Scrolling back up past the first heading fades it out, because the masthead is there again and says the same things. On desktop there is no running head; the left margin is sticky and carries the name.

### The navigator, on a phone

**Resting.** A strip 52px tall, fixed directly under the green bar, in the glass material (translucent paper with a backdrop blur), no border, and the low-opacity layered shadow so the paper scrolling under it reads as under it. It has two lines, 16px side padding:

- Line 1, small caps 12px, 14px tall: on the left, IN THE LOOP · ROUND 1 in leaf, which is the way home and is its own tap target, 44px tall through padding. On the right, the folio in muted: 5 OF 11, followed by a 12px chevron pointing down.
- Line 2, Baskerville italic 15px, 20px tall, ink, one line, ellipsis at the end: the current question. "Songs you've had on repeat lately".

The current question is whichever heading last crossed the strip's bottom edge going up, so it is always the question whose passages are on screen. The folio counts questions that have at least one answer, in the order they are printed.

Tapping the strip anywhere except the name opens the contents.

**Open.** The strip stays where it is and a panel slides down from behind it, on transform only, 220ms on `EASE_IN_OUT_SCENE`, exit 180ms. The panel is Float white, 12px bottom corners, the layered shadow, and it is as tall as its contents up to 72% of the viewport (608px at 844), scrolling inside past that. Behind it the letter dims under the dialog backdrop. Tapping the backdrop, or the strip again, closes it.

Inside, 20px padded:

- A small caps line, muted: ROUND 1 · 11 QUESTIONS.
- Then the questions, one per row, in Baskerville 15px/1.4 ink, clamped to two lines, with the count of answers at the right end of the row in Source Sans 13px muted ("13", "10", "40"). Rows are their natural height plus 8px padding top and bottom, full width, 8px corners. The current question's row wears the canopy selection wash, which is the one place the app allows it. No numbers before the questions; the folio in the strip already counts. Tapping a row closes the panel and jumps the page so that question's heading sits 16px under the strip. The jump is instant, not animated, because a scroll across forty passages is nothing anyone should watch.
- Then 16px, then a small caps line, WRITTEN BY, and the thirteen writers as name-and-bird items wrapping, 28px birds. Tapping one closes the panel and sets the letter to that person's part.
- If any question got no answers, they sit at the bottom under NOBODY ANSWERED, muted, not tappable.

How the forty-answer question reads in it: "A side quest you badly want to go on." with "40" at the right end of its row, and if you are inside it, the canopy wash. A reader who has had enough taps the strip, sees the row after it, and taps that. Two taps from anywhere in forty passages to the next question, and one to any other.

**By writer.** Tapping a writer's name (in the from-line, in the open panel, in the signatures at the end, or in the desktop margin) changes the address to `?from=<member>` and the letter re-sets itself, in place, to that person's part. The masthead becomes: IN THE LOOP and the date on the top line as before; then their 64px bird and, beside it, "Meera Kulkarni" in Baskerville 32px with BATCH OF '11 in small caps under the name; then one line, 15px muted, "Meera's part of Round 1 · 9 answers", where "Round 1" is a link back to everyone's letter. The body prints only the questions she answered, each heading followed by her one passage. The running head's line 1 reads IN THE LOOP · ROUND 1 on the left and MEERA · 3 OF 9 on the right. The browser's back gesture returns to the full letter at the place you left. Nothing else changes: same headings, same passages, same hearts, same comments. It is the same reader with a filter, not another page.

### The desktop plan

At 1512 the sidebar is on the left. Within the content area, three columns, top-aligned at 32px from the top, all left-aligned as a group with 20px of page on either side:

1. **The contents margin**, 232px wide, sticky at 32px from the top. It starts with IN THE LOOP in leaf small caps (the way home), then 16px, then the eleven questions in Baskerville 14px/1.35, muted, each clamped to two lines, 8px apart, no numbers. The current question is in ink, and a 2px leaf bar sits 8px to the left of it, outside the text, so the change is colour and a mark and never weight; the line never reflows. Tapping a question jumps the page so its heading sits 32px under the top. Under the list, nothing.
2. **The sheet**, 720px wide, 32px to the right of the margin: Paper, 4px corners, layered shadow, no border, 56px top padding, 72px side padding, 68px bottom padding. It holds the masthead and the letter.
3. **The writers margin**, 200px wide, 32px to the right of the sheet, sticky at the same 32px. WRITTEN BY in muted small caps, then thirteen rows, each a 28px bird and the name in Source Sans 14px ink, 6px apart. Tapping one sets the letter to that person's part, and while you are in it that row wears the canopy wash and a text link "Everyone" appears above the list. Under the rows, 16px, then "Round 2 opens 15 September." in 13px muted.

Below 1200px of content width the writers margin folds into the sheet as the phone's from-line, and the contents margin stays. Below 960px the phone plan applies, running head and all, with the sheet full width. The sheet never grows past 720px; at 1920 the group sits left-aligned with more page to its right, which is the ¶6 fix: a letter has a measure, and the measure does not care how wide the window is.

The way back on desktop lives in three places that are all the same name: the top of the contents margin (sticky, so always on screen), the return address on the masthead, and the return address at the end of the letter.

### A question's heading

42px above it, 16px below it. Where the asker is known, an eyebrow first: NIKHIL MENON ASKED in muted small caps 12px, 6px above the question. Where the question was asked anonymously, no eyebrow: the question stands alone. Then the question in Baskerville italic, 20px at 390 and 24px at 1512, ink, as many lines as it takes. No number, no count, no rule under it.

The five anonymous questions of this Round (1, 4, 6, 7, 9) print with no eyebrow. The other six print with their asker's name.

### The passage, in four states

A passage is: the text, then any photographs, then any song card, then the signature line. Between a passage's signature line and the next passage's first line, 26px. Nothing else separates them.

**Text only.** The answer's paragraphs in the passage type, paragraphs 10px apart, no first-line indent. Then 10px, then the signature line.

Sample, under "Do you think your life looks like you thought it would since you left rv? What's different?":

> Not really. At seventeen I was sure I would be somewhere cold doing something with a lab coat. I am in Chennai, I run a tiny team that makes payroll software, and I have not worn a lab coat since Class 12 chemistry. What is different is that I thought the interesting part of life would be the work. It turned out to be the people who stayed. Three of you are in my phone's favourites and none of you were in 2011.

Then the signature line: a 28px bird, 10px, "Ananya Rao" in Baskerville italic 15px, 6px, '11 in small caps muted, and at the right end "2 comments" in 14px muted and the heart with 14.

**With one photograph.** The text, then 10px, then the photograph in `PhotoFrame`: a wide one runs at its true shape to the measure's width; a tall one becomes 3:4 on a blurred bed of itself, capped at 700px tall. At 390 a tall photograph is 342 by 456. Corners 4px. A caption beneath in 14px muted, clamped to four lines with "More" in leaf after it, "Less" once open. Then 10px, then the signature line. Tapping the photograph opens the full-screen viewer at that photograph, with the passage's other photographs, if any, as the set to swipe through.

**With three photographs.** The text, then 10px, then the three in justified rows with 4px gutters and 4px corners. The rows are packed to a target height of 220px at 390 and 260px at 1512. For this Round's three (1200 by 1600, 1200 by 1600, 1288 by 966): at 390 the two portraits share a row at 169 by 225 each, and the landscape takes the next row alone at 342 by 257, so all three are on screen at once and nothing bounces between sizes; at 1512 all three sit in one row 237px tall, the portraits 178px wide and the landscape 316px. Captions, if any, go under the set as one block. Tapping any of the three opens the viewer at that one.

Sample, the first passage of the Round, under "What is a fun thing you did this summer?":

> Took the overnight bus to Gokarna with two people from work who had never seen the sea. Slept on the beach, got burnt in the shape of a map of Sri Lanka, and ate the same fish thali three days running because nothing else was open. First real holiday since 2023. The photos make it look calmer than it was.

Then the two portraits, then the landscape, then the signature line: bird, "Meera Kulkarni", '11, "3 comments", the heart with 12.

**With a song link.** The link stays in the sentence where it was pasted, in leaf, breaking inside itself when it must. Under the text, 10px, then our own card, never the provider's player: a row on Accent with a hairline border and 12px corners, 12px padded, at most 400px wide; on the left the art (56 by 56 with 8.8px corners for Spotify; 96 by 54 for YouTube), then the title in Source Sans 15px semibold ink on one line, the artist or channel in 14px muted on the next, and at the right end the source word in small caps muted, SPOTIFY or YOUTUBE. Tapping the card opens the link in a new tab. If the link does not resolve, no card: the link in the text is all there is, and it still works. Only the first music or video link in a passage gets the card; any others print as links with a chip (title only, pill, mist) under the card.

Sample, under "Songs you've had on repeat lately":

> Mostly one song, since the wedding: https://open.spotify.com/track/3qHkc... and then whatever the auto driver was playing on the way back, which I have not managed to find.

Then the card: art, "Chuttamalle", "Anirudh Ravichander, Shilpa Rao", SPOTIFY. Then the signature line: bird, "Kabir Nair", '11, "Comment", the heart with 7.

**Packing a one-word answer.** An answer with no photograph, no link, no line break and fewer than 90 characters is set as one row: the text in the passage type, then 10px, then the signature line's contents inline (bird, name, batch), then the comments word and the heart at the row's right end. If the row does not fit the measure, the signature wraps to a second line and the row is still one object. Under "Who believes Sanan made this website?" the eleven answers print as eleven such rows, 26px apart:

> Not a chance. · [bird] Dev Sharma '11 · Comment · ♥ 9
> I do, and I have questions. · [bird] Tara Bhat '11 · Comment · ♥ 4
> Who else has the time? · [bird] Rohan Pillai '12 · Comment · ♥ 6

(The middle dots above are for this document; on screen the parts are spaced, not dotted.) Eleven rows at 28px with 26px between them is 568px: the whole question fits one phone screen with room to spare, where a tile per answer would have taken six screens.

**Packing a 2,000-character answer.** It prints. Two thousand characters is about 330 words, about 22 lines at 390, about 600px. A letter does not cut a paragraph short. The signature at the end is where the reader's eye is heading anyway.

### The comments

Collapsed: the count on the signature line, "3 comments" in 14px muted, and "Comment" when there are none. It is a text control with a 44px hit area and underlines on hover.

Open: tapping it opens the thread in place under the signature line (auto-animate), indented 38px from the passage's left edge on a phone and set flush with the text on desktop, since the birds have the margin there. It is the post comments family exactly: each comment a row with a 28px bird, the name in 14px semibold, the text in 15px, a heart at the end; then the composer pill with your bird before it and the placeholder "Add a comment". The count on the signature line becomes "Hide". Sending a comment adds the row (auto-animate) and clears the pill. A comment on your answer is a notification that lands here with the thread open.

### The heart

`LoveButton`, at the right end of every signature line: the red heart with its count. It fills on the tap, not a beat after, and the count moves with it. It is the only reaction in the letter, on purpose (section 5, L-e).

### The way back, from any depth

On a phone: IN THE LOOP · ROUND 1 on the running head's first line, at every scroll depth past the masthead, and the return address on the masthead itself before that. On desktop: the top of the sticky contents margin. At the end of the letter, on both: the return address again. In every case the thing you tap is the Catch-up's name, and it opens the home. No Back button, no arrow.

### The end of the Round

After the last passage of the last answered question, 68px. Then WRITTEN BY in muted small caps, and under it the thirteen signatures: name-and-bird items, 28px birds, wrapping, each tappable to that person's part. Then 26px, then in Source Sans 15px muted, "Round 2 opens 15 September." Then 26px, then IN THE LOOP in leaf small caps, the return address, which opens the home. Then 68px of paper to the bottom.

### First screen at 390 (844px tall)

- 0 to 56: the green bar with its menu button.
- 56 to 82: paper.
- 82 to 96: IN THE LOOP (leaf, left), 15 AUGUST 2026 (muted, right).
- 106 to 146: "Round 1".
- 156 to 252: "From" and five names with birds across three lines, ending "and eight others".
- 262 to 284: "133 answers to 11 questions."
- 326 to 378: the first question, two lines of italic: "What is a fun thing you did this summer?"
- 394 to 637: the first passage, nine lines: the Gokarna paragraph above.
- 647 to 844: the top 197px of the two portrait photographs side by side, each 169px wide, cut by the bottom of the screen with 28px of them still to come.

No running head yet. No name yet: the first signature is 300px below the fold, which is the bet in one screen.

### First screen at 1512 (982px tall)

Left, the Canopy sidebar. In the content area, at 20px in and 32px down, the contents margin: IN THE LOOP, then the eleven questions in Baskerville 14px, roman, muted, the first in ink with its leaf bar. At 284px in, the sheet, from 32px down to the bottom of the viewport and beyond:

- 88 to 104 (viewport y): IN THE LOOP and 15 AUGUST 2026 on one line inside the sheet.
- 114 to 164: "Round 1" at 40px.
- 174 to 196: "133 answers to 11 questions."
- 238 to 270: the first question, one line at 24px italic.
- 286 to 516: the passage, eight lines at 18px.
- 526 to 763: the three photographs in one row, 237px tall.
- 773 to 801: the signature line, with the bird hanging in the sheet's left padding at x 28 to 56 inside the sheet, "Meera Kulkarni" flush with the text, and at the right, "3 comments" and the heart with 12.
- 827 onward: the second passage, cut by the bottom of the viewport.

At 1036px in, the writers margin: WRITTEN BY and thirteen birds with names, ending at about 540px down, with "Round 2 opens 15 September." under them. On this screen a reader sees the whole cast at once, the first question, the first answer, its photographs and its signature, and the letter continuing.

### Mid-scroll at 390, deep in question 5

- 0 to 56: the green bar.
- 56 to 108: the running head. Line 1: IN THE LOOP · ROUND 1 on the left, 5 OF 11 and the chevron on the right. Line 2: "Songs you've had on repeat lately".
- 108 to 189: the last three lines of Kabir's passage, ending "...which I have not managed to find."
- 199 to 279: the song card: the art, "Chuttamalle", "Anirudh Ravichander, Shilpa Rao", SPOTIFY.
- 289 to 317: the signature line: bird, "Kabir Nair", '11; "Comment", the heart with 7.
- 343 to 371: a one-row answer: "Anything by Sid Sriram." then bird, "Priya Venkat", '11, "Comment", the heart with 3.
- 397 to 478: a passage of three lines: "This live version, the one with terrible audio and the crowd singing the second verse for him: https://youtu.be/dQw4w9..." with the address in leaf, broken across the line.
- 488 to 566: the YouTube card: the 96 by 54 thumbnail, "Ilaiyaraaja, Live in Concert (2022)", "Sony Music South", YOUTUBE.
- 576 to 604: the signature line: bird, "Rohan Pillai", '12; "1 comment", the heart with 11.
- 630 to 844: the next passage, six lines of a longer answer about a playlist someone's sister made, cut by the bottom of the screen, its signature still to come.

Everything on this screen is either words someone wrote, a card for a song they named, or a signature. The question is named at the top. The way home is at the top. The contents are one tap away.

## 4. The design system, kept and broken

Kept, by default and without exception: the palette (Canopy for the one pill on each surface and the sidebar; leaf for links, the return address and the selection bar; cinnamon for the ON HOLD word; the heart red; every surface on the ladder). Libre Baskerville for every heading and signature; Source Sans 3 for every passage. The state layer for hover and press; nothing moves on hover. The menu material for the one menu and its submenus; the dialog material for the two confirms and the people sheet; `ConfirmDialog` copy rules (statement titles, verbs on buttons, one description line only where it changes the choice). The focus treatments. `LoveButton`, `BirdAvatar`, `IdentityRow` (used as the signature), `PhotoFrame`, the justified rows, the viewer, the post comments family, the composer pill, the warm shimmer (the reader's `loading.tsx` is a masthead block and five lines of the measure, shimmering, not tile blocks). The LiftKit steps for every gap. Auto-animate on every list that changes. Mobile first: every measurement above was worked out at 390 and then at 1512.

Broken, each because the break is the point:

1. **Sheets have 4px corners, not 16.** The reader's sheet, the cover, the list item, the Now sheet and the composer are documents, not cards. A sheet of paper is cut square; a 16px corner reads as a control you might press, and a letter is a thing you read. 4px is on no rung of the ladder and is used for nothing else in the app. Photographs printed on a sheet take the same 4px, a print's corner, rather than the nested 12px rung.
2. **The reader's body runs at 17px/1.6 on a phone and 18px/1.6 on desktop**, one step above the scale's 16px body. The rest of the app is scanned in cards; the letter is read continuously for ten minutes at a time, and that is the one place a larger measure earns itself. Nothing outside the reader and the composer uses these sizes.
3. **The identity row moves to the foot of the answer.** Not a token, a convention: everywhere else the bird and name lead. Here they sign. The heart moves with them.

The one thing on screen that could only be this app: the desktop sheet's left margin, where a column of the batch's birds hangs at the foot of each passage, one per writer, in plumage colour, down the whole length of the letter. No other product has fifty birds to sign with.

## 5. Letterloop, closed and open

- L-a, comments: closed, under every passage, the post comments family. Mentions: open, unless the family already has them; nothing in this direction depends on it.
- L-b, a music card: closed, on any pasted Spotify or YouTube link, in any answer to any question, our card and not theirs.
- L-c, a photo wall: closed, as a block any question can carry, one photograph per writer, one justified grid above the passages, each photograph signed with a bird.
- L-d, "the next issue arrives on": closed, in three places that say the same sentence: the Now sheet, the end of the letter, and the desktop writers margin.
- L-e, a reaction picker: left open on purpose. One heart, on the signature line, is the app's whole reaction language and a letter does not want a row of faces under every paragraph.
- L-f, reply progress: closed, on the Now sheet as names, with "Still to write" as names.
- L-g, reminders: already there; behind the one door, three radio rows.
- L-h, the Album: left open. The letter's photographs live in the letter, signed. An album of every Round's enclosures is a good later thing and would sit under EARLIER ROUNDS; this direction does not draw it.
- L-i, PDF: open, track M. Worth saying: a single sheet with a masthead, italic headings and signed passages is already the shape of a printed page, and the letter's print stylesheet is most of the way to the PDF before track M starts.
- L-j, mementos: open.
- L-k, themes: no, on purpose.
- L-l, filter an issue by member: closed, as "by writer". Sort replies: open; passages print in the order people sent their answers in, the same order under every question, so the letter has one running order of voices.
- L-m, a banner and a logo per loop: no. The stack of sheets on the list is the only picture.
- L-n, roles: one role, Keeper, and none on a batch.
- L-o, home quick actions: the state line on the list sheet, and the leaf dot when there is something for you to do.

## 6. Live and static

Must be live to be judged:

- The phone reader at 390, scrolling the real Round with native scroll, with the running head fading in past the masthead and its folio and question updating as headings cross it.
- The running head's open state: the panel sliding down, the rows, the canopy wash on the current row, tapping a row and landing with the heading 16px under the strip, tapping the name and landing on the home.
- By writer: tapping a name in the from-line and watching the letter re-set to that person's part, and the back gesture returning.
- The one-row packing under questions 7 and 9, with real short answers, so the density can be seen and not described.
- The heart on a signature line, filling on the tap.
- Comments opening in place under a signature line, with the composer pill.
- The desktop sheet at 1512 with both margins sticky, the leaf bar moving down the contents as the page scrolls, and the birds hanging in the sheet's left padding.

May be static compositions:

- The list at 390, 1512 and 1920 with two and three Catch-ups and the Archived row.
- The home in its seven Now states, with the cover in the published state.
- The composer with a few questions filled.
- The people sheet, the menu with its submenus, the two dialogs.
- The song card in both shapes, and the photo wall block.
- The end of the Round.

The viewer, the shimmer and the notification rows are the app's own and need not be built for the room.

## 7. Under pressure

**One answer.** The masthead's from-line is "From Meera Kulkarni." and nothing else. The letter prints the seven questions she answered, one passage each, signed seven times by the same bird. The contents panel lists those seven with "1" beside each and the other four under NOBODY ANSWERED. The end block says WRITTEN BY and one name. It reads like a letter from one person, because it is one.

**Forty answers.** Forty passages under one heading, at an average of 400 characters, is about 40 by 200px, 8,000px, roughly ten phone screens. The running head names the question all the way down and the folio holds at "8 of 11". Getting out is two taps: the strip, then the next row. Getting in from anywhere is one. The desktop contents margin holds the leaf bar on that question for ten screens, which is honest. What the letter does not do is fold the forty away, because a folded question is a question nobody reads.

**A 6,000-character answer.** About 1,000 words, about 65 lines at 390, about 1,750px of paper. It prints in full. There is no More on an answer, only on a caption. The signature at the end is where the reader was heading. On desktop it is 1,250px of the sheet with the bird waiting at the bottom of the margin. A letter this long from one person is a letter this long.

**A 24-photo wall.** The block above the passages packs 24 photographs into justified rows at the 220px target: at 390 about eight rows of three, 1,800px; at 1512 about five rows of five, 1,300px. Each photograph wears its writer's 28px bird at its bottom left corner over a 4px inset, and tapping any one opens the viewer with all 24 as the set and the writer's name in the viewer's caption. The rows are the app's own justified rows, so a portrait and a landscape share a row at one height and nothing jumps.

**A 300-character question.** At 20px italic on a 342px measure that is about eight lines, 208px of heading. It prints as eight lines; italic Baskerville can carry it. In the running head it is one line with an ellipsis, which is enough to say which question. In the contents panel it is two lines with an ellipsis and a count. On desktop it is about five lines at 24px, and in the contents margin two lines clamped. Nothing breaks; a long question is a tall heading.

**A 78-character name.** The signature line wraps: the bird stays at the left of the first line, the name runs to a second line, and the comments word and the heart drop to the end of the last line. In the from-line the item wraps as one item. In the desktop writers margin, 200px wide, the name takes three lines at 14px, and the row grows. In the running head's by-writer folio, MEERA · 3 OF 9 uses the first name only, and a 78-character first name is clamped to 12 characters with an ellipsis, which is the one place in the direction that cuts a name.

**An emoji-only answer.** "🎉🎉🎉" is under 90 characters with no photo or link, so it is one row: the emoji at the passage size (not enlarged, the way a chat app would), then the signature, then the heart. It takes 28px. That is the right amount of paper for it.

**A pasted 123-character link.** It stays in the sentence in leaf, and `overflow-wrap: anywhere` breaks it inside itself across three lines at 390, so the column never widens and nothing pushes sideways. If it is a Spotify or YouTube address the card prints under it; if it is anything else, or resolution fails, the link is all there is, and it is tappable.

**A Round nobody answered.** It is not printed. There is no cover for it, nothing under EARLIER ROUNDS, no notification. The Now sheet says, in one line under the state it moves to next, "Round 3 closed with no answers and was not printed." and then "Round 4 opens 15 November." The reader address for it answers with the home. A letter nobody wrote is not a letter.

Where it breaks, honestly: a phone reader who wants to skim forty passages has no faster gear than scrolling; a heading in the running head does not tell you how far into the forty you are (the folio counts questions, not passages); and a reader who wants the name before the words has to reach the foot of the passage, which on a 6,000-character answer is a long way down.

## 8. The two things I am least sure I got right

### The name comes last

A passage signed at the foot is the letter, and I am not certain it survives contact with twenty-three people who know each other. When Ananya writes 800 characters about Chennai and payroll software, half the batch will know it is Ananya by the second sentence, and the signature will land as a pleasure. But a reader who does not know the voice reads 800 characters not knowing who is speaking, and there is a good chance that reader tries to read the signature first, scrolling to the foot and back, which is worse than a name at the top. The desktop margin helps, because the birds are visible in the corner of the eye before you reach them. The phone does not have that. If the judges find people scrolling ahead to the bird, the fix that keeps the bet is a 28px bird alone, unnamed, at the start of the passage's first line, with the name still at the foot, and I would rather they saw the pure version first.

### The contents panel is still a list

The running head is honestly a running head, and the by-writer move is genuinely not a table of contents. But the thing that opens when you tap the strip is eleven questions in a column with a count beside each, set in Baskerville on white, and however it is dressed that is a table of contents. I could not find a way through a letter of 133 answers on a 390px screen that did not, at some point, show a reader the list of questions, and I chose to make that list look like the contents page of a book rather than pretend it was something else. The two-line strip is also 52px of chrome under a 56px green bar, 108px before any paper, and I am not sure that is not one line too many. If it is, the name moves into the green bar's title and the strip drops to one line, 36px, with the question on the left and the folio on the right.

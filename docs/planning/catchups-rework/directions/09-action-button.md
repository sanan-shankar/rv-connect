# The bar is the question

**Thesis:** The green bar every phone screen in this app already carries becomes the whole reader: it holds the question you are in, grows into the Round's contents when you touch it, and slides sideways to the next question, so the Round can take the entire screen without leaving the app.

**Designer:** 09 action-button, blind.

**The bet, as given:** THE ACTION BUTTON. Brief paragraph 42: Apple's Action Button screen "doesn't look like anything else in Settings. It takes up the entire screen. It's end to end... No other part of Apple's UI looks like that, but it's such a wonderful addition to it, that uses some similar aspects." Make the reader on a phone that kind of surface: one end-to-end thing that looks like nothing else in the app and is unmistakably of it. You have not seen today's layout and you should not try to imagine it.

## 1. The idea

On a phone, every page of this app sits under a 56px band of Canopy green. You have looked at that band a thousand times and it has never done anything but hold a menu button. Open a Round in this direction and the band grows. It becomes a plate a third of the screen tall, printed white on green: the Catch-up's name, "Round 1", the date, the people who wrote in, and the first question in Libre Baskerville. Scroll, and the plate leaves upward, but its foot stays behind at the 56px it came from, and now that foot holds the question you are reading, in one line, with a counter at the right and eleven ticks along its bottom edge for how far in you are. Touch the bar and it fills the screen with the Round's contents. Drag it sideways and the next question slides in. The answers run under it on paper, edge to edge, with no tiles: a name, the words, the photographs full width, a heart at the end of the last line. Then the next plate comes up from below, green meeting green, and the bar is a new question.

That is the whole bet. The Action Button screen works because it takes one thing you already know, the button on the side of the phone, and lets it fill the screen. Our equivalent is the green bar. It is the most seen object on the phone, it is the sidebar's colour and so it is the app's, and no page has ever used it as a place to read. Using it that way makes the reader look like nothing else here while being made of the most familiar thing here.

Underneath the bet is one rule that the rest of the direction hangs on: **a Round is a green plate, wherever it is drawn.** The Now panel on the home is a plate whose words change with the state. A published Round's cover is a plate. The rows in Before are short plates, like spines on a shelf. The little cover on the list row is a plate the size of a stamp. The reader's masthead is the plate at full size, and the question headings inside the reader are plates too. One material, five sizes. That is the "higher level of abstraction" ¶42 asks for: you meet the green plate on the list, you meet it on the home, and when the reader opens and the whole top of the screen is that plate, you already know what it is.

What it refuses to do. It refuses to page the Round into screens you must swipe between: the Round is one native scroll from the first question to the last, because the forty-answer question and the skim reader both need a flick, not a gesture, and the drag on the bar is a shortcut through that scroll, never a replacement for it. It refuses to collapse anything by default. It refuses the answer tile: no card around an answer, no band under the heart, no box that is 85% empty. It refuses a picture per Catch-up; the green is the picture. And it refuses to show the question list in a horizontal strip of any kind.

What it is not. The thing it most risks resembling is a documentation site: a sticky header, a left rail of headings, a centred column. On desktop the bones are that, and the green and the type are what keep it from reading as one: the headings are plates, the rail marks the current row with the sidebar's cinnamon edge, and the sheet has no hairline grid anywhere. On the phone it risks resembling an Instagram story if the plates were photographs; they are not, they are type on green, and nothing auto-advances.

Where it departs from the architecture's RECOMMENDED lines:

- 1.5 says the sidebar and the green bar never leave. On the phone, in the reader, the green bar does not leave; it becomes the plate. But the menu button in it does leave. The rest of the app is two taps away (the name, then the menu) instead of one. That is the same distance Settings is from the Action Button screen, and it is the price of end to end.
- 1.5 says the Catch-up's name is the way up at every scroll depth. In the collapsed bar the name is printed at every depth, but a tap on the bar opens the contents, whose first row is the name. From deep in a question the home is two taps, not one. On an expanded plate, and on desktop, it is one.
- 1.3's Before shows every published Round. Here Before does not repeat the Round that Now is already showing as its cover. When Round 1 is out and Round 2 has not opened, Now is Round 1's cover and Before is absent. When Round 2 is collecting, Before shows Round 1. The same cover twice on one screen is ¶15 in miniature.
- 1.8's O1: I take proposal 1. A batch Catch-up is kept by nobody.
- 1.6's Pause: I take the hold. Pausing holds the next Round; a Round in flight finishes on its own.

## 2. The screens

### 2.1 The list

At 390. The page title "Catch-ups" in Libre Baskerville h1 on the page, with the one CTA at its right: a Canopy pill, "New Catch-up". Below it, one paper card (16px radius) holding one row per Catch-up. A row is 96px tall. At the left, the name in Baskerville h3 (20px, Ink), with the label caps line YOUR BATCH in Leaf above it for a batch Catch-up. Under the name, the state line at body size, muted: "Answering until Sunday · you have not written in yet", "Round 1 came out on 15 August", "Collecting questions · 6 so far", "No Round yet", "The next Round is on hold", "Ended 3 March". At the right of the row, the newest published Round's cover as a stamp: an 88x60 Canopy rectangle at the thumbnail rung (8.8px), "Round 1" in white Baskerville 14px with "15 AUG" in label caps under it. No stamp when nothing has been published. Rows are separated by a hairline inset to the text edge. The whole row is one target and opens the home; the stamp is its own target and opens the reader. A long press on a row opens the same menu the home's head has (2.7). If anything is archived or binned, one last row in the card, muted: "Archived 2 · Bin 1", which opens the archived page (2.9).

Two rows and a stamp is a page that looks finished. Three rows is the most anyone will see.

At 1512 and 1920. The same card, in the app's ContentColumn at the column's width, never stretched to the window. The rows grow to 104px and the stamp to 120x72. A row shows its ⋯ on hover at the far right (the 24-fine, 44-coarse trigger). At 1920 nothing changes but the margins. Squares in a grid were tried on paper and refused: two squares in a 1900px window are worse than two rows in a 680px column, and a Catch-up has nothing to put in a square that the state line does not say better.

### 2.2 Making one, and starting a Round

"New Catch-up" opens a page, not a dialog, because it is three decisions. The page uses the calm form material: 56px mist-filled borderless fields with the label floating inside. Field one: Name. Field two: People, a search field; each person chosen becomes an IdentityRow (40px bird, name, batch) in a list under the field with an × at its right, auto-animated. Field three: Rhythm, a select in the menu material with three rows: Every month, Every two months, Every three months. One Canopy pill at the bottom: "Create". It lands on the new home with Now in its first state.

A people Catch-up is born with no Round, the same as a batch one. Now says so and offers one pill: "Start the first Round". Tapping it starts collecting. There is no dialog, because starting is not destructive, and a toast says "Round 1 is collecting questions until 22 August". On a batch Catch-up the same pill is there for every member; on a people Catch-up it is the Keeper's.

At 1512 the form sits in a 560px column inside the shell with the sidebar in place; the chosen-people list runs two columns once it passes six.

### 2.3 The home

`/catchups/[id]`. Three parts, stacked, on the ordinary page with the valley photograph behind.

**The head** at 390: the name in Baskerville h1 (32px, Ink), plain: "in the loop". Under it, one line at body size, muted, with two live words: "Every month · 23 people". "23 people" is Leaf and opens the people sheet. At the top right of the head, level with the name, the ⋯ (2.7). For a batch Catch-up, YOUR BATCH in label caps, Leaf, sits above the name. Nothing else in the head. No birds.

**Now** is a green plate: Canopy, 16px radius, padding 24 at the sides and 18 at the top, the full width of the column. Its top row is always the Round in label caps, white at 70%. Its middle is the state. Its button, when it has one, is the on-green pill: Paper fill, Canopy text, full pill. The seven states:

1. *No Round yet.* Top row: ROUND 1. Middle: "No Round yet" in Baskerville h2, white, then one body line at 80%: "A Round collects everyone's questions for a week, then everyone answers them, then it comes out as one issue." Pill: "Start the first Round". A member of a people Catch-up who is not the Keeper sees no pill and the line "Tara starts the first Round."
2. *Collecting.* Top row: ROUND 2 · COLLECTING UNTIL 22 AUGUST. Middle: the questions gathered so far as a numbered list in white body text, each with the asker's name after it at 70% (nothing when asked anonymously); tapping one of your own opens a two-row menu, Edit and Remove. Pill: "Ask a question", which opens a dialog with one field. For a Keeper, under the pill, a white text link: "Open answering now".
3. *Answering.* Top row: ROUND 2 · ANSWERING UNTIL SUNDAY 6 SEPTEMBER. Middle: "Your turn." in Baskerville h2, or once you have written, "You're in. 9 of 23 so far." (this is the home's one line of feeling, on a title). Pill: "Answer", or "Edit your answers". Under it, WRITTEN IN in label caps, then names with 20px birds, wrapped; then STILL TO WRITE, then names. For a Keeper, a row of white text links: "Nudge everyone" · "Close early" · "Extend a week".
4. *Preparing.* Top row: ROUND 2. Middle: "Comes out on Monday 8 September at 9am." Keeper's pill: "Publish now".
5. *Published, next not yet open.* The plate is the cover, and the whole plate is the tap to the reader: "Round 2" in Baskerville h2, "8 September 2026", who wrote in as names with birds, then the first three questions as a list with "and 8 more", and a last line at 70%: "The next Round opens on 8 October." No pill; the plate is the button.
6. *Paused.* The plate of whichever state is underneath, with "· ON HOLD" appended to its top row and one extra line: "The next Round will not open until a Keeper resumes it." Keeper's pill: "Resume". A Round in flight keeps its Answer pill; the hold is about the clock.
7. *Ended.* Top row: ENDED. Middle: "Ended on 3 March 2026." Nothing else.

**Before**: under Now, after a --space-xl gap, the label caps line EARLIER ROUNDS and then one short plate per published Round not already in Now, newest first, 72px tall, 16px radius, 8px apart: "Round 1" in Baskerville 18px white on the first line with the date after it at 70%, and on the second line the writers: "Tara, Nikhil, Ananya and 10 others". The whole plate opens the reader. With no earlier Rounds, the label and the shelf are absent. After the shelf, one line in Leaf: "All photographs · 48", which opens a justified grid of every photograph from every Round with "Round 3" under each (this is where Letterloop's Album lives).

At 1512 the three parts sit in the ContentColumn in the same order. Now's plate is 680 wide. Before's short plates run two across from four Rounds on.

### 2.4 The composer

`/answer`, a page. At the top, the way home: "‹ in the loop" in Canopy 15px medium. Under it, one short plate: ROUND 2 · 11 QUESTIONS · ANSWERING UNTIL SUNDAY. Then the questions, one after another on paper: the question in Baskerville h3 (20px, Ink), and under it a mist-filled borderless field that grows as you type, placeholder "Your answer". Under the field, ADD PHOTOS as a label caps text button. For a photo-wall question the field is replaced by one square drop zone, "Add one photograph", with a caption field under it. There is no song control: paste a link anywhere in the field and its card appears under the field a second later; if it fails to resolve, the link stays a link. Answers save as you go; a muted "Saved" appears under the field and fades. A fixed bottom bar, padded for the home indicator: "4 of 11 answered" at the left and a Canopy pill "Done" at the right, which returns to the home, where Now now reads "You're in."

At 1512 the form is the 680 column, and the reader's rail sits at its left with the same eleven rows, each carrying a tick once its answer has words in it. The rail rows scroll the form.

### 2.5 The reader

Section 3.

### 2.6 Who is here, and who wrote in

Who is here lives one level down, behind "23 people" in the head. On the phone it is a sheet from the bottom: the dialog material's panel with its top corners at the floating radius, reaching to 48px below the top of the screen. On desktop it is the dialog. Inside: a search field at the top when there are more than twelve people; for a people Catch-up, above the list, "Add someone" (a search that adds) and "Send a link" (copies the invite link; the toast says "Link copied"). Then rows: 40px bird, name, batch, and on the Keeper's row the leaf and the word Keeper in label caps. Order: the people who wrote in this Round, then your batch, then everyone else, each group alphabetical. A Keeper's row menu on someone else has one item, Remove. On a batch Catch-up the sheet has no add, no link and no remove, and its header reads "39 people · everyone from '11".

Who wrote in is on the Round: on the answering plate as WRITTEN IN and STILL TO WRITE with names and 20px birds; on the cover as names; on the reader's masthead as names with birds. In each, eight names and then "and 5 others", which opens the rest in place, the plate growing to hold them. Never a bird alone.

### 2.7 The menu, the verbs and the dialogs

One door: the ⋯ at the top right of the home's head, and the same menu from a long press on the list row (a ⋯ on hover on desktop). The menu material, rows in this order: Reminders (a second menu: Daily, Last day, Off, with a check on the current one); Archive; then, for the Keeper of a people Catch-up: Rhythm (a second menu, three rows), Rename, Hold the next Round (or Resume), End this Catch-up; a separator; Delete, in red. On a batch Catch-up the menu is Reminders and Archive and nothing else.

Dialogs, all in the dialog material, a title and at most one line:

- End: "End in the loop" / "No more Rounds will open. Everything already published stays readable." / Cancel, End.
- Delete: "Delete in the loop" / "It goes to your bin for 30 days. After that your place in it goes with it." / Cancel, Delete (red).
- Rename: "Rename in the loop" / one field / Cancel, Rename.
- Ask a question (from the collecting plate): "Ask a question" / one field, and under it a toggle row, "Ask anonymously" / Cancel, Ask.

Archive has no dialog. The row leaves the list and a toast says "Archived · Undo". Rhythm and Reminders change on the spot.

### 2.8 The batch Catch-up

It is told apart by two things and nothing else: its name is always the batch, "Batch of '11", and YOUR BATCH in label caps, Leaf, sits above the name on the list row and in the head. It has no Keeper. Its menu is Reminders and Archive. Its Round verbs (start the first Round, open answering early, extend, nudge, publish now) are open to every member, and the plate says so on the first day: "No Round yet" / "Everyone from '11 is in this. Anyone can start the first Round." / pill "Start the first Round". Its people sheet is read-only, headed "39 people · everyone from '11", with this Round's writers first. A member who joins the site later finds it on their list with every earlier Round on the shelf.

### 2.9 Archive and delete

Archive from the menu (home) or the long press (list). The row leaves with auto-animate and the toast offers Undo for six seconds. Reminders stop with it. Delete goes through its dialog, then the same exit. When anything is archived or binned, the list's last row reads "Archived 2 · Bin 1" and opens `/catchups/archived`: the same row style under two label caps headings, ARCHIVED and IN THE BIN, the bin rows carrying "gone in 23 days" as their state line. Opening an archived one brings it back (toast: "Back on your list"); a bin row's menu offers Restore.

### 2.10 Comments, a song card, a photo wall

All three are in section 3 in full. In short: comments are a count in the answer's last line that opens a thread in place, hung under the author's bird on a 2px rule and ending in the composer pill; a song card is our own 12px-radius card under the answer's words, made from the first music or video link in the answer, with later links as chips; a photo wall is a block at the top of a question, before its answers, full-bleed on the phone, every photograph carrying its bird and opening in the viewer with the name.

### 2.11 The notification

Each transition is one row in the app's notifications, and the body of the published one is the cover, drawn as a stamp-sized plate beside the words.

- Collecting opened: "Round 2 of in the loop is collecting questions until 22 August" → the home.
- Answering opened: "Round 2 is open. Answer by Sunday 6 September" → the composer.
- A nudge: "Tara nudged everyone: Round 2 closes Sunday" → the composer.
- Published: "Round 2 of in the loop is out" with the stamp → the reader, at the top.
- A comment: "Nikhil commented on your answer to 'Songs you've had on repeat lately'" → the reader, scrolled to that answer with its thread open and the new comment at the bottom.

### 2.12 The empty states

A brand-new member's list holds one row, their batch Catch-up, with the state line "No Round yet · anyone can start one", and the "New Catch-up" pill. Nothing else on the page. A batch with no Round yet has the head, the first-day plate from 2.8, and no shelf. A Round with one answer reads fine: the masthead says "Tara Iyer wrote in", each plate says 1 ANSWER or NO ANSWERS, and a question with none is followed by one muted line on paper, "Nobody answered this one.", before the next plate.

### 2.13 The pressure fixture

Section 7.

## 3. The reader, precisely

Everything here is drawn against Round 1 of "in the loop": 13 people, 133 answers, 11 questions, published 15 August 2026. The thirteen writers are invented: Tara Iyer '11, Nikhil Bose '09, Ananya Krishnan '14, Rohan Pillai '11, Meera Sundaram '98, Dev Raghavan '17, Sanjana Rao '12, Kabir Menon '11, Aditi Varma '05, Vikram Nair '11, Leela Chandran '20, Ishaan Bhat '11, Nandini Reddy '13. Their answers are invented in the shape of the real ones.

Two surfaces carry everything. **The plate**: Canopy #235C49, white type, edge to edge on the phone, 16px radius in the desktop column. **The sheet**: Paper #F5F2EA, Ink type, edge to edge on the phone, and on desktop the whole area right of the sidebar. There is no valley photograph behind the reader and there are no cards on it.

Type sizes are the system's ladder: display clamp(1.9rem, 5vw, 2.6rem), which is 30px at 390 and 41.6px at 1512; h1 32px; h2 24px; h3 20px; body 16px on 1.65; 14px for meta; label 12px uppercase with 0.1em tracking, which this document calls label caps. Space tokens at a 16px base: xxs 4, xs 6, s 10, m 16, l 26, xl 42, xxl 68.

### The masthead

The masthead is the first plate, and it is the cover at full size, drawn from the cover's fields in the cover's order. On the phone it is the first thing on the page, green from the top edge of the viewport, 16px side padding.

1. The top row, 44px tall. At the left, "‹ IN THE LOOP" in label caps, white at 70%, with a 16px chevron: one target, the way home. At the right, "1 OF 11" in label caps at 70%.
2. After --space-s: "Round 1" in Libre Baskerville at display size, white.
3. After --space-xxs: "15 August 2026" at 14px, white at 80%.
4. After --space-m: who wrote in. Names in 15px white, each with a 20px BirdAvatar before it, run on like a sentence and wrapped: "Tara Iyer, Nikhil Bose, Ananya Krishnan, Rohan Pillai, Meera Sundaram, Dev Raghavan, Sanjana Rao, Kabir Menon and 5 others". "and 5 others" is a target; it opens the rest in place and the plate grows. Each name opens the profile, as names do everywhere in the app.
5. After --space-l: the first question in Baskerville h2, white: "What is a fun thing you did this summer?"
6. After --space-xs: the foot. The foot is 56px of green, the last thing on every plate, and it is the bar. In this state it shows "13 ANSWERS · 4 WITH PHOTOS" in label caps at 70% along its top, and the ticks along its bottom edge: eleven segments 16px wide and 3px tall, 4px apart, left-aligned, the first one white and the rest white at 25%. Between the two, green.

At 390 the masthead is about 350px tall. What happens as you scroll: items 1 to 5 scroll up and away with the page. The foot is sticky at the top of the viewport and does not leave. As the last 40px of the big part slide out, the foot changes what it prints (opacity only, nothing moves): the answers line fades out, and two lines fade in: the eyebrow "IN THE LOOP · ROUND 1" at the left with "1 OF 11" at the right, in label caps at 70%, and under it the question in one line of 15px medium white, cut at the end of a word with an ellipsis when it is longer than the line. The ticks stay where they were. So the masthead does not shrink; it leaves, and the bar it was standing on stays behind, holding the question.

On desktop the masthead is the same plate at the top of the column, 680 wide, 16px radius, padding 40 at the sides and 32 at the top, with two differences: there is no eyebrow row (the rail carries the name; the counter sits alone at the top right of the plate) and there is no foot (the rail is the progress). The answers line sits under the question as an ordinary line and the plate ends 32px below it. It scrolls away like any heading. The rail does the naming.

### The navigator on a phone, resting

The navigator at rest is the bar: the 56px foot of whichever plate you are under. Canopy, full width, three things on it:

- The eyebrow, label caps, white at 70%, y 9 to 23: "IN THE LOOP · ROUND 1" at the left, "5 OF 11" at the right. This is print, not a target on its own. The name is on screen at every depth.
- The question, one line, 15px medium white, y 27 to 47, cut by word with an ellipsis. "Songs you've had on repeat lately" fits whole; "Do you think your life looks like you thought it would since you left rv? What's different?" reads "Do you think your life looks like you thought it would…".
- The ticks along the bottom edge, y 53 to 56, eleven of them: the ones up to and including the current question white, the rest white at 25%.

The bar is one target, and it does two things. A tap opens the contents. A horizontal drag of more than 24px moves to the neighbouring question: drag left for the next, right for the previous. The bar takes horizontal gestures only (pan-y stays with the page), so a vertical flick that starts on it scrolls the page as usual. The move is the viewer's own film advance applied to the whole screen: the page you are on slides out the way you dragged, the next question's page slides in from the other side, 280ms on EASE_IN_OUT_SCENE, opacity asymmetric so the cross never dips see-through, and the incoming page is standing at the top of its plate, expanded, so you arrive on the question at full size. Nothing scrolls past you.

When the next plate arrives in the ordinary way, by scrolling, the bar does what the section headers in Contacts do. The next plate's big part rises under the bar, green under green. When its top edge meets the bar's bottom edge, the old bar is pushed up and out, and the new plate's foot takes the top of the screen once its own big part has gone. From the reader's chair: the question you were in leaves upward, the next question arrives at full size, and a moment later the bar holds its name.

When a name sticks. Answers taller than the screen keep their author with you: on the phone only, an answer whose rendered height is greater than the viewport minus the bar has its identity row made sticky at top 56, on paper with a hairline under it, 44px tall, so a 2,000-character answer never goes anonymous mid-scroll. Shorter answers are left alone; their names pass with them.

### The navigator on a phone, open

Tap the bar and it grows. The green rectangle scales down the screen to fill it, 320ms on EASE_IN_OUT_SCENE, the bar's two lines fading out and the contents fading in over the second half of the move. The result is a full-screen plate, the same green, and it is a contents page:

- Top row, 44px: "‹ IN THE LOOP" at the left, the way home. An × at the right, 44px hit.
- After --space-s: "ROUND 1 · 15 AUGUST 2026" in label caps at 70%.
- After --space-l: eleven rows, 8px apart, inset 12px from the screen edges. A row is the number in label caps at 60% in a 28px column, the question in 15px white on up to two lines cut with an ellipsis, and the count of answers in label caps at 60% at the right edge, tabular. A row is 44px when its question takes one line and 60px when it takes two. The current row shows its question in full however long it is, and carries the selection: a white tint at 14% behind it at 12px radius and a 3px cinnamon bar on its left edge, which is the sidebar's own way of marking where you are.
- After the rows, a hairline in white at 15% and one more row without a number: "The end of Round 1".
- The rows scroll inside the plate when the screen is shorter than they are; the top row stays.

Tap a row and the plate shrinks back into the bar (the same move reversed, 260ms), and the page beneath is standing at that question's plate, expanded. Tap the current row, or the ×, or drag the plate down, and it closes where it was. Tap "‹ IN THE LOOP" and you are on the home.

How the forty-answer question reads in it: one row like the others, with "40" at its right. A count you can see before you commit is the whole of what the contents can do for it. The rest is the bar, which holds that question's name for as long as its forty answers last, and the drag, which skips the whole thing in one move.

### The desktop plan

At 1512x982: the sidebar at the left at its own width (256 in the numbers that follow), then the sheet, Paper, 1256 wide, from the sidebar's edge to the window's, full height, no photograph behind it. Two columns on the sheet.

**The rail.** 300 wide, from x 256, padding 32 all round, sticky at top 0 for the full viewport height, with its own scroll if the rows overrun. Contents in order: "‹ in the loop" in Canopy 15px medium, a link, the way home, on screen at every depth; after --space-m, "Round 1" in Baskerville h2, Ink; after --space-xxs, "15 August 2026" at 14px, muted; after --space-xl, the eleven rows: the number in label caps, muted, in a 28px column; the question in 14px Ink at 80% on up to two lines cut with an ellipsis (the whole question in a title on hover); the answer count at the right, muted, tabular. Rows are 8px apart at 12px radius. The current row carries the canopy wash, Canopy text and a 3px cinnamon bar at its left edge, the app's one selection state. Weight does not change, so nothing reflows when the current row moves (¶10). Hover on any row is the state layer. After the rows, a hairline and "The end". The current row follows the scroll: a question is current from the moment its plate's top passes the middle of the viewport. Clicking a row scrolls to that plate's top with the page's smooth scroll. The left and right arrow keys move to the previous and next plate.

**The column.** 680 wide, centred in the 956px right of the rail, which puts it at x 694. Everything in the reader is in it: the masthead plate, the first question's answers, the next plate, and so on to the end plate. Plates are Canopy at 16px radius with 40px side padding. Answers sit on the paper with no card: identity row, words, photographs at the nested rung (12px), the actions line. A hairline in Border colour separates one answer from the next, inset to the text edge, with --space-l above and below it.

**What is sticky.** The rail. Nothing in the column. The way back is the rail's first line, on screen at every depth, and the sidebar's Catch-ups item.

At 1920 the rail is 320, the column 720, and the paper either side is what it is; the column does not widen to fill a desk.

### A question's heading

Every question after the first begins with its own plate. On the phone: Canopy, edge to edge, 16px side padding, 20px above the first line.

- The top row, 44px: "‹ IN THE LOOP · ROUND 1" at the left in label caps at 70%, a target while the plate is expanded; "5 OF 11" at the right.
- After --space-s: the question in Baskerville h2, white: "Songs you've had on repeat lately".
- After --space-xs: the foot, 56px, showing "13 ANSWERS · 2 WITH PHOTOS · ASKED BY NIKHIL BOSE" along its top (no asker when it was asked anonymously; "· A PHOTO WALL" when one is attached) and the ticks along its bottom edge. Once the plate has scrolled away, the foot is the bar.

About 200px for a two-line question. A plate is as tall as its question needs and is never cut. On desktop the plate is a 16px-radius block in the column with the question at h1 (32px), the answers line as an ordinary line under it, no foot and no ticks, and --space-xxl of paper above it so the previous question's last answer has room to end.

A number is printed on a plate only as the counter, "5 OF 11", which is navigation. A plate never says "Question 5".

### The answer tile, in four states

There is no tile. An answer is a run of things on the paper, in this order, at 390 with 16px side padding for words and none for photographs:

1. The identity row: a 28px BirdAvatar, the name in 15px medium Ink, the batch line in label caps beside it, muted: "Tara Iyer  BATCH OF '11". 28px tall.
2. After --space-xs: the words, body 16px on 1.65, Ink. A link in the words is Leaf, underlined, displayed as its host and the first few characters of its path with an ellipsis ("open.spotify.com/track/4uL…"), the whole URL as the target, and it breaks anywhere, so nothing pushes the page sideways.
3. After --space-s: the photographs, if any.
4. After --space-s: the song card, if any.
5. The actions line, 28px tall: at the left "3 comments" in 15px Ink at 70% (or "Comment" when there are none), at the right the LoveButton with its count. When the answer ends in words and the last line has 140px free at its right, the actions line is not its own line: the heart and the comment count sit in the last line of the answer, right-aligned, the way an end mark closes a magazine piece. Otherwise it is its own line under the last thing.
6. After --space-l: a hairline, then --space-l, then the next answer.

**Words only.** Meera Sundaram '98, under question 6:

> Not remotely. I thought I'd be a marine biologist somewhere with a boat. I run a school in Coimbatore and I have not been on a boat since the class trip. The odd part is that I don't mind, which nineteen-year-old me would have found unforgivable.

Four lines at 390. The last line is short, so "2 comments" and "♥ 14" sit in it at the right. The whole answer is 28 + 6 + 106 = 140px, plus the hairline gap.

**With one photograph.** Kabir Menon '11, under question 10:

> A dosa at 2am from a cart near Shivajinagar that I will not be able to find again.

Then one landscape photograph, 1288x966, full-bleed at 390: 390 wide by 293 tall, no radius, no border. A tall single photograph is PhotoFrame's 3:4 on its blurred bed, which at 390 is 520 tall; the 700 cap is never reached on a phone. Under it, the actions line on its own: "Comment" at the left, "♥ 22" at the right. On desktop the photograph is 680 wide at 12px radius, a wide one at its own shape, a tall one at 3:4 on its bed capped at 700.

**With three photographs.** Tara Iyer '11, under question 1, two portraits then a landscape:

> Drove to Gokarna with two people I had not seen since the board exams. We ate fish at the same shack three nights running because nobody could be bothered to look for another one.

Then the justified rows, full-bleed with 2px gutters: row one is the two portraits side by side, each 194 wide and 259 tall (3:4); row two is the landscape at 390 by 293. Tap any to open the viewer at that photograph with swipe between the three; the viewer's step is the named film advance with no scale, so the landscape does not bounce the frame. On desktop the same rows at 680: two portraits at 337 by 449, then the landscape at 680 by 510, 12px radius on the outer corners of each row.

**With a song link.** Dev Raghavan '17, under question 5:

> Been stuck on this since June. open.spotify.com/track/4uL… on every drive, both directions.

The sentence is printed as written with the link inline. Under it, the card: 12px radius, Accent fill (#FAF8F2) with a hairline border, padding 10, 84px tall. At the left a 64px square of album art at the thumbnail rung. Beside it, "Pasoori" in 15px medium Ink, "Ali Sethi, Shae Gill" in 14px muted, and on a third line SPOTIFY in label caps at 60% with a 12px play glyph before it. The whole card is a link out. A second link in the same answer becomes a chip: a pill on Secondary, 28px tall, the play glyph and "youtu.be/…" in 14px, in a row under the card. When a link cannot be resolved there is no card, and the link stays as the sentence has it. The actions line follows the card.

**How a one-word answer is packed.** Any answer under 48 characters with no photograph and no link is set in Baskerville h3 (20px on 1.3) instead of body, Ink, not italic. Nandini Reddy '13, under question 7: "Not a chance." is the identity row, then one line of 20px Baskerville with "♥ 31" and "4 comments" sitting in it at the right. 28 + 6 + 26 = 60px of answer. Eleven of these under question 7 read as a letters page, and the room a three-word answer would otherwise waste is spent on the type instead of on padding. An emoji-only answer takes the same rule at 28px.

**How a 2,000-character answer is packed.** Rohan Pillai '11, under question 2, 2,000 characters: at 16px on 1.65 in the 358px measure, about 47 characters a line, 43 lines, 1,135px. No More or Less on an answer (the cap belongs to captions, ¶32). The identity row is sticky under the bar for this one, because it is taller than the screen. On desktop the same answer is 24 lines in the 680 column. Paragraph breaks in the answer are honoured as --space-s.

### The comments

Collapsed: the count in the actions line, "3 comments", Ink at 70%, one target. "Comment" when there are none.

Open: tapping the count opens the thread in place under the actions line, auto-animated. A 2px rule in Border colour drops from under the author's bird, at x 29 to 31, for the height of the thread. Each comment is the post comments family's row, indented to x 56: a 24px bird, the name in 14px medium, the time in 14px muted after it, the words in 15px on the next line, and a LoveButton without a count at the right. Typing @ in the composer offers the Catch-up's people in the menu material. At the bottom of the thread, the composer pill, 40px, from x 56 to the right margin, "Add a comment"; it never takes focus on its own. Tapping the count again, which now reads "Hide 3 comments", closes the thread. A new comment on your answer is a notification that opens the reader at this answer with the thread open.

### The heart

The one LoveButton: 20px glyph, count in 14px tabular figures beside it, Heart red when yours, the same instant fill it has on the feed and no delay before its animation (¶29 is a bug in a copy; there is one component). It lives in the actions line and nowhere else. Its visible size is 20px; its hit area is 44.

### The way back to the home from any depth

On the phone: from the masthead or any expanded plate, one tap on "‹ IN THE LOOP". From anywhere else, one tap on the bar opens the contents and one tap on "‹ IN THE LOOP" at its top. The name is printed on the bar at every depth. On desktop: the rail's first line, on screen at every depth, and the sidebar. In both, the browser's back returns to wherever you came from, the home or the notification.

### The end of the Round

After question 11's last answer and its hairline, --space-xl of paper, then the end plate. On the phone, Canopy, edge to edge, 16px side padding, about 300px tall; on desktop a 16px-radius block in the column.

- Top row: "ROUND 1 · 15 AUGUST 2026" in label caps at 70%.
- After --space-s: "That's everyone." in Baskerville display, white. This is the reader's one line of feeling, on a title.
- After --space-xs: "13 wrote in. 133 answers, 520 hearts." at body size, white at 80%.
- After --space-m: "The next Round opens on 15 September." at body size, white.
- After --space-l: the on-green pill, Paper fill, Canopy text: "‹ in the loop". Beside it, a white text link at 80%: "Back to the top".
- 26px of green, and the page ends. The bar above is the eleventh question's, and its ticks are all white.

On a phone the end plate is the last thing on the page, not a footer; there is nothing under it to scroll to.

### The first screen at 390x844

From the top: the masthead plate, green from y 0 to about 350. Inside it: "‹ IN THE LOOP" and "1 OF 11" on the top row; "Round 1" at 30px Baskerville; "15 August 2026"; three lines of writers' names with their 20px birds, ending "and 5 others"; two lines of Baskerville at 24px, "What is a fun thing you did this summer?"; then the foot with "13 ANSWERS · 4 WITH PHOTOS" and the eleven ticks, the first one lit. Then paper. At y 376 the identity row: Tara Iyer's bird, her name, BATCH OF '11. At y 410, three lines of body text about Gokarna. At y 500 the top of the two portrait photographs side by side, edge to edge, running past the bottom of the screen. Nothing else: no menu button, no valley photograph, no card edge. The screen is a green top and a paper bottom with one person beginning to speak.

### The first screen at 1512x982

From the left: the Canopy sidebar, Catch-ups lit as the active row. Then the paper sheet. In the rail: "‹ in the loop" in Canopy at y 32; "Round 1" in Baskerville 24px at y 64; "15 August 2026" at y 96; from y 140 the eleven rows, the first washed in canopy with its cinnamon edge and reading "1  What is a fun thing you did this summer?  13"; the hairline and "The end" at about y 700. In the column, from x 694: the masthead plate from y 32 to about y 354, with "1 OF 11" alone at its top right, "Round 1" at 41.6px, the date, thirteen names with birds in two lines, the question in Baskerville 32px on one line, "13 ANSWERS · 4 WITH PHOTOS". Then paper, and at y 396 Tara Iyer's identity row, two lines of body text, and at y 493 the two portrait photographs side by side at 337 by 449, their bottoms at y 942, forty pixels above the bottom of the window. Right of the column, 138px of plain paper to the window's edge.

### A mid-scroll screen at 390x844, deep in question 5

From the top: the bar, y 0 to 56, green. "IN THE LOOP · ROUND 1" at the left of its eyebrow and "5 OF 11" at the right; "Songs you've had on repeat lately" whole on its one line; along its bottom edge the ticks, five white and six faint. Under it, at y 56, nothing sticky, because the answer in view is shorter than the screen. At y 70, the tail of Sanjana Rao's answer: "…the live version, and then the studio one to calm down." with, under it, her second link drawn as a chip, "youtu.be/…", and beneath that her actions line, "1 comment" and "♥ 6". A hairline at y 176. At y 202, Dev Raghavan's identity row, BATCH OF '17. At y 236, two lines: "Been stuck on this since June. open.spotify.com/track/4uL… on every drive, both directions." with the link in Leaf. At y 300, the Spotify card: the 64px art, "Pasoori", "Ali Sethi, Shae Gill", SPOTIFY. At y 396, "2 comments" and "♥ 9". A hairline at y 450. At y 476, Ishaan Bhat's identity row, and at y 510 the start of his answer, a plain list of three song names with no links, with "♥ 3" arriving in its last line at y 590. A hairline, and at y 640 Leela Chandran's row and the first line of hers. The screen holds four people and one card, and the question they are all answering is on the bar the whole time.

## 4. The design system, kept and broken

Kept, by default and without exception: the palette (D3), with no new hex anywhere in the direction; Libre Baskerville for every heading and Source Sans 3 for every word you read; the surface ladder (the sheet is Paper, the song card is Accent, the chip is Secondary, menus and dialogs are Float); the state layer for every hover and press; SpringPress on every target; the one LoveButton; the viewer and its film-advance step; the menu material and the dialog material, unchanged, for the door and the confirmations; the focus recipe; 44px hit areas; safe-area padding on the composer's bottom bar; hover that never moves a control; auto-animate on comments and the list; the shimmer while the reader loads, which draws one plate-shaped block in Canopy at 40% and three answer-shaped blocks under it.

Broken, each on purpose:

1. **Canopy becomes something you read.** The system gives the green two jobs, CTAs and the sidebar. This direction gives it a third: a plate that carries a Round's words. The break is the point of the whole direction. It is what makes the reader look like the app while looking like nothing in it, and it stays disciplined by the plate rule: green means "a Round", and nothing that is not a Round is ever green.
2. **A pill on green is Paper with Canopy text.** "CTAs are Canopy pills" has no answer for a button standing on Canopy. The on-green pill inverts it: the same shape, the same two colours, swapped. It appears only on plates: Start the first Round, Ask a question, Answer, Publish now, Resume, and "‹ in the loop" on the end plate.
3. **The phone's reader leaves the shell.** No menu button, no valley photograph, no ContentColumn. The bar stays, at its height and its colour, and becomes the plate's foot, so the plate reads as the bar grown rather than as a new object. The reader is the Action Button screen: it takes the whole thing.
4. **No radius at the screen edge.** Plates and photographs are edge to edge on the phone and have no corners to round. The radius ladder returns the moment the same things sit in the desktop column: plates 16, photographs 12, the song card 12 with its art at 8.8.
5. **Body text in the heading face.** Answers under 48 characters are set in Baskerville at h3. The heading face is for headings everywhere else in the app; here it is the density answer to ¶31, applied by a rule rather than by taste.
6. **A full-screen takeover that is not a dialog.** The contents is built the way the viewer is, as an experience, not with the dialog material. No white panel, no backdrop blur, no Cancel row; it is the bar, grown.
7. **No card around an answer.** The app puts content on paper cards. The reader puts it on one paper sheet with hairlines. A box that is 85% empty has earned nothing, so it is gone.

The one thing on screen that could only be this app: the green bar you have looked at on every page of the site, holding the question you are reading, with eleven ticks along its bottom edge, and the way it grows into the Round's contents when you touch it.

## 5. Letterloop, closed and open

- L-a, comments with @mentions: closed. The thread under the answer, with @ offering the Catch-up's people.
- L-b, a Music section with a card: closed, wider than Letterloop. Any pasted music or video link, in any answer to any question, becomes our own card; Letterloop needs its Music section.
- L-c, a Photo Wall section: closed, as a block any question can carry, at the top of the question, full-bleed on the phone.
- L-d, "the next issue arrives on": closed twice, on the Now plate and on the end plate.
- L-e, a reaction picker: open on purpose. One heart is the app's reaction language, and the end-mark placement gives it a job a picker would spoil.
- L-f, who has replied and who has not: closed on the answering plate, WRITTEN IN and STILL TO WRITE as names.
- L-g, reminders and nudges: already there; Reminders sit behind the one door.
- L-h, the Album: closed lightly, as the "All photographs" line at the end of Before, a justified grid with "Round 3" under each photograph, opening the viewer.
- L-i, PDF: open, track M's.
- L-j, Mementos: open on purpose.
- L-k, themes: no, on purpose.
- L-l, filter an issue by member, sort replies: open. The masthead's names could become a filter later ("Tara's answers, 9 of 11"); this direction does not do it, because the bar and the ticks already describe the Round one way, and a second axis would confuse them.
- L-m, a banner photo and a logo per loop: open on purpose. The green is the picture, and it never fails the way a derived photograph does on a Round with none.
- L-n, four roles: no. Keeper, or on a batch, nobody.
- L-o, quick actions per loop on the home: closed by the row's state line and the stamp.

## 6. Live and static

Must be live to be judged:

- The phone's plate: scrolling from the masthead into the answers and watching the foot's two lines fade in as the big part leaves; scrolling across a plate boundary and watching the old bar pushed up by the new plate.
- The bar's drag, left and right, with the page slide; and what happens at question 1 dragging right and question 11 dragging left (a short rubber-band and nothing else).
- The contents: the bar growing to fill the screen, the current row lit, tapping a row and landing on that plate, the × and the drag-down.
- The sticky identity row on one answer taller than the screen (Rohan's 2,000 characters).
- The heart, and one comment thread opening and closing.
- On desktop: the rail's current row following the scroll, a click on a row, and the arrow keys.

May be a static composition: every answer's words and photographs (the viewer may open, or be a still), the song card and the chip, the photo wall, the end plate, the notification rows, and every other screen in section 2. A static page at 390 and 1512 of the first screen and the mid-scroll screen, as described, is enough for those.

## 7. Under pressure

- **One answer.** The masthead reads "Tara Iyer wrote in". Each plate reads 1 ANSWER or NO ANSWERS; a question with none is followed by "Nobody answered this one." in muted body text before the next plate. The end plate reads "1 wrote in. 9 answers, 4 hearts."
- **Forty answers.** One long native scroll, about 20,000px on the phone, under a bar that never stops naming the question. The contents row shows 40. A drag on the bar skips the whole question in one move. Names of long answers stick. What breaks: nothing, but there is no way to jump to the twentieth answer; there is no reason to, either.
- **A 6,000-character answer.** About 130 lines on the phone, 3,500px. The author's row is sticky under the bar for all of it. No More or Less. On desktop, 70 lines. It is one person's page and it reads as one, which is the honest shape of the thing.
- **A 24-photo wall.** Rows of three on the phone, each photograph 128px wide, eight rows, about 1,100px full-bleed with 2px gutters, every photograph carrying a 24px bird in its corner, the viewer opening at any of them with 24 to swipe. On desktop, rows of four or five in the column. What breaks: the wall stands between the plate and the first answer, so the first answer to that question is 1,100px down, and the "· A PHOTO WALL" on the plate is the only warning.
- **A 300-character question.** On the plate at 24px Baskerville in a 358px measure, about eleven lines, a plate of 450px; it is never cut. In the bar it is one line ending "…", which is enough to know which question you are in and not enough to read it. In the contents the current row shows it in full and the others show two lines. In the rail, two lines and a title on hover. Where it breaks: the bar cannot hold it and does not pretend to.
- **A 78-character name.** The identity row wraps the name to two lines and puts the batch line under it; the sticky row becomes 64px for that answer. In the masthead the name wraps inside the run of names. On the short plates in Before and on the stamp, the writers' line cuts a name at 40 characters with an ellipsis. In a comment row the name wraps. Nothing overflows sideways.
- **An emoji-only answer.** The short-answer rule sets it at 28px on one line with the heart in the same line. It is the shortest answer on the page and it is not the emptiest.
- **A pasted 123-character link.** Printed as its host and the first characters of its path with an ellipsis, Leaf, underlined, breaking anywhere, so it takes one line and pushes nothing. If it is music or video the card follows; if not, there is no card. On desktop the same.
- **A Round nobody answered.** The masthead reads "Nobody wrote in." Eleven plates saying NO ANSWERS with "Nobody answered this one." between them would be a green wall that scrolls, so when no question has an answer the reader is three things: the masthead, the eleven questions drawn inline on paper under it as the contents, and the end plate reading "Nobody wrote in this time." with the next Round's date. Where it breaks: this Round has no bar to speak of, because there is nothing to scroll under it, and that is right.

## 8. The two things I am least sure I got right

**The drag on the bar.** The horizontal drag is the Action Button's swipe and it is the direction's signature, and I am not sure people will find it. A drag on a 56px band at the top of a phone is not a gesture the web has taught anyone, and the left edge of the screen belongs to the browser's back swipe, so a drag that starts too near the edge goes back instead of forward. The tap is the primary move and the contents does everything the drag does, so nothing is lost if the drag is never discovered; but then the signature is a sticky header that opens a list, which is a good reader and not a new one. If the room shows nobody dragging, the fix I would try first is a pair of faint chevrons at the bar's ends that appear for a second after each plate change and never otherwise.

**A Round is a green plate.** The rule that makes the direction coherent is also the thing most likely to tip it. The list has stamps, the home has a Now plate and a shelf of spines, the reader has twelve plates and a bar, all Canopy. Green in this app has meant "press me" and "the sidebar", and a page with three large green rectangles on it may read as three enormous buttons, or may push the balance he calibrates at 5 to 9 past the top of the range once the plates sit on a paper sheet with no photograph behind it. I kept the green off everything that is not a Round, kept the answers on paper, and made the plates carry type and nothing else, which is as far as a rule can go; whether it is too much green is something only the room at 390, with a real Round in it, can say.

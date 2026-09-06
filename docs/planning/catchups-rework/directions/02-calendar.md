# The calendar keeps it

**Thesis:** A Catch-up is a run of dated Rounds on one spine, the next date is circled and does the work a Keeper used to do, and a batch runs on the site's three term dates with nobody in charge.

**Designer:** 02 calendar, reading.

**The bet, as given:** A CALENDAR OF ROUNDS. Time is the structure. The home is a timeline: the Rounds that came out, the one being made, the one coming, and the date the next one opens is the hero of the page. The rhythm ("every month", "every term") organises everything, including how a batch Catch-up starts and who keeps it. Consider seriously the term-calendar alternative in the architecture (1.8): every batch's Round opening on the same day, site-wide, like term dates. Say what happens to a batch nobody answers.

---

## 1. The idea

You open a Catch-up and the first thing you see is a date. Not a tile, not a console, not three calls to action. A day of the month set big in Libre Baskerville with a cinnamon circle drawn round it, the way someone circles a date on the calendar by the kitchen door, and beside it the one thing that happens on that day: "Round 2 opens." Or "Last day to write." Or "Comes out at 6 in the evening." Under it, the one thing you can do about it. Under that, a line runs down the page, and everything this Catch-up has ever been hangs off that line in order: the Round being made now, then every Round that came out, each with its date and the names of the people who wrote in. The line begins where the Catch-up began. If the Catch-up has ended, the line ends, and you can see it end.

That is the whole bet. A Catch-up is not a thing with settings. It is a thing with a calendar, and the calendar is what you are looking at. Every state the architecture lists is a different date with a different verb beside it, so the seven Now states stop being seven screens and become one screen with a different number on it. A member never asks "where am I in this" because the answer is always the next date, and never asks "how do I get back" because the name of the thing they are inside is the way up, on every screen, in the same place.

It bets that rhythm does the keeping. For a batch Catch-up, the calendar is site-wide: every batch's Round opens for answers on the same three days a year, 6 January, 6 May and 6 September, and comes out on the same three evenings a fortnight later. Nobody starts anything. Nobody keeps it. Nobody can rename it, extend it, or publish it early, because the date is the date. The question the architecture left open, who keeps a batch Catch-up, is answered by removing it: a term does not need a Keeper any more than a Monday does. For a people Catch-up the Keeper still exists, but the Keeper's verbs are drawn as moving a tick on the calendar, which is what they are.

It refuses to show the Round on the home. The home has the spine and the covers; the Round lives in the reader and nowhere else. It refuses per-answer boxes: the reader and the home are each one sheet of paper, and everything on the sheet is text, photographs and space. It refuses to tell you who is in this with a row of birds; it tells you with names, and it tells you who wrote in this Round and which Rounds each person has written in, as dots on a line. It refuses to publish a Round nobody wrote in.

What it is not. It most risks looking like a calendar app's agenda, the Google Calendar schedule view: a column of dates with events beside them. It is not that, and two things keep it from becoming that. The dates on the spine are few (a Round a month, or three a year) and they are covers, not events: each one carries the people who wrote in and the questions they were asked, drawn large enough to be a thing in itself. And the hero is one date, not a list of them. It also risks resembling the "extended timeline view" Letterloop announced in August 2026, which nobody has seen a picture of; whatever that is, it sits inside an issue, and this spine sits above them.

Where it departs from the architecture's RECOMMENDED lines, said plainly:

- 1.8: a batch Catch-up's first Round starts itself, on the next term date, with three questions from the library already in it. There is no "Start the first Round" button. The architecture offered this alternative to one direction and asked it to say what happens to a batch nobody answers; section 2.8 says.
- 1.3: "published, next not yet open" and "collecting" are one screen, because the next Round opens for questions the moment the last one comes out. The two states still exist in the data (the difference is whether anyone has asked yet); on the page they are the same composition with a different line under the hero.
- 1.6: pause is a hold on the next Round and never freezes a Round in flight, which is the architecture's own proposal, taken. A batch has no Delete and no Round verbs at all except "Remind everyone"; there is no extend, no open early, no publish now, because the term dates do not move.
- 1.5: on a phone the Catch-up's name is printed in the green bar itself, and tapping it goes home. That is a change to the shell, and section 4 owns it.
- 1.9: a question nobody answered is not printed as a heading with nothing under it. It is carried over to the next Round and the end of the Round says so.

---

## 2. The screens

### 2.1 The list

`/catchups`. Two or three rows and one button. The page title "Catch-ups" in Libre Baskerville at h1, and at its right one canopy pill, "Make a Catch-up". Nothing else above the rows.

Each row is the name, the state line, and the year of dots. The name is Libre Baskerville at h3 (1.25rem), ink. The state line under it is Source Sans at small (0.875rem), muted, and it is always a date with a verb: "Answers close Friday 27 September · 9 of 23 have written in", "Round 2 opens 6 October", "Round 1 came out 15 August", "Comes out tomorrow at 6", "On hold", "Ended 3 March 2026". The batch Catch-up's line reads "Every term · the September Round opens in 12 days". At the row's trailing edge, vertically centred, sits the year of dots: twelve dots of 8px with 6px gaps, 162px wide, one per month of the current year, never scaling with the window. A month a Round came out is a filled ink dot. The month a Round is being made is a filled canopy dot. The month of the next date is a hollow dot with a 1.5px cinnamon ring. Every other month is a hollow dot at border colour. Above the dots, right-aligned, "2026" as a label (0.75rem, tracked). That is the row's picture, derived from its contents, and it is the same object as the spine on the home turned on its side.

The whole row is one tap target; there is no View and no three dots on the face. Rows sit directly on the page background with space-l between them and no hairline; on hover the row takes the state layer at 12px radius with space-m padding on every side, so the tint never touches a letter. Long press on a phone, or the "..." that appears at the row's trailing edge on hover and focus on desktop (44px hit, drawn at 20px), opens the same sheet as the home's menu (2.7). Rows are ordered by their next date, soonest first; a Catch-up that has ended sorts last.

At 390 the row is 76px tall, the name column 350 minus 162 minus 16, so an 80-character name wraps to three lines and the dots stay where they are. At 1512 the list column stops at 640px and the right column, from 1180 up, is the year calendar: twelve months in a 3 by 4 grid, each month a 7-column grid of 8px dots on 14px cells with the month's name as a label above it, the days a Round came out marked in ink, the days one is being made in canopy, the next opening date circled in cinnamon, today underlined. Every Catch-up of yours is on it. A dot is not a cover and opens nothing; the calendar is the picture of your year, and the rows are the doors. At 1920 the list still stops at 640 and the calendar's cells grow to 18px.

At the bottom of the list, only when one exists, a single muted row: "Archived · 1" or "Archived · 1 · Deleted · 1, gone in 26 days". Tapping it shows those rows in the same shape, each with "Put back" nowhere on its face; opening one brings it back, with a toast saying so.

Empty, for a member with no batch year and no Catch-ups: one line, "A Catch-up asks the people in it a few questions on a rhythm and prints the answers as a Round.", and the same pill. For everyone else the list is never empty, because the batch Catch-up exists on the day they join.

### 2.2 Making one, and starting a Round

`/catchups/new`, centred column. Three things, in the calm form material: a name field, a people field, and the rhythm. The people field is a search by name that adds chips; there is no "everyone from your batch" shortcut, because the batch Catch-up already exists and this page never makes one. The rhythm is three rows, each a radio with the consequence printed beside it in small text, computed live from today: "Every two weeks · Round 1 opens for answers on 19 September and comes out on 3 October", "Every month · Round 1 opens 5 October, comes out 19 October", "Every term · the next term Round opens 6 January". One button at the end, "Start it", canopy pill. Pressing it makes the Catch-up with Round 1 collecting, and lands on the home, where the hero is already the first date.

A batch Catch-up is never made. It is there on the day the batch's first member joins the site, and its first Round opens on the next term date. The only "start" a batch member can do is ask a question for it, which is the pill on its home.

### 2.3 The home

`/catchups/[id]`. One sheet of paper. On a phone it runs edge to edge from the bottom of the green bar with no radius and no margin; on desktop it is a paper card at 16px radius, at most 760px wide, with the rail beside it. Inside, three parts in a fixed order: the head, the hero, the spine. Only the hero's number and verb change with state.

**The head.** The name at h1 (2rem, Libre Baskerville, at most two lines), then a meta line at small: "Every month · 23 people", where "23 people" is a leaf text button that opens the people sheet. Under that, the year of dots with its "2026" label, the same 162px object as on the list. At the head's top right, the "..." menu trigger, drawn at 20px with the 44px hit, the one door (2.7). On a batch Catch-up the meta line reads "Every term · 39 people" and there is no Keeper's leaf anywhere on the page, because there is no Keeper.

**The hero, the circled date.** A block two things wide. Left: the day of the month as a numeral in Libre Baskerville at 88px on a phone and 120px on desktop, ink, with a cinnamon stroke drawn round it: an ellipse 1.2 times the numeral's width and 1.1 times its height, 2.5px, slightly open at the top right where the pen lifted, drawn once as an SVG path and scaled, never a CSS border-radius. Right, top-aligned with the numeral's cap height: the month as a label ("OCTOBER 2026", 0.75rem, tracked 0.12em, muted), the verb as h3 ("Round 2 opens."), and one line of small text under it. Under both, left-aligned, the one action: a canopy pill 44px tall sized to its label, or, for a Keeper's secondary verbs, leaf text buttons in a row after it.

**The spine.** A 1.5px line in border colour running down the sheet's left, 28px in from the sheet's edge on a phone and 40px on desktop. Entries hang off it with their text 24px to the right of the line. Each entry has a mark on the line: a 10px canopy disc for the Round being made, a 10px ink disc for a Round that came out, a hollow disc at border colour for a term nobody wrote in. The line starts under the hero and ends with a 12px cap and a label, "Started 12 July 2026". Entries are separated by space-xl. The first entry is the Round in the making, when there is one. Every entry below it is a cover (2.4's component), newest first, and this is Before: the archive is the spine.

The seven Now states, each as the hero's number, verb, line and action, and what the first spine entry holds:

1. **No Round yet** (a batch, on its first day, and only a batch). Hero: "6", "JANUARY 2027", "Your batch's first Round opens.", line "Three questions are already in it.", pill "Ask something". Spine: one entry, a canopy disc, "The January Round · in the making", with the three library questions listed under it, each a line of body text with "from the library" in muted small after it. Below that the start cap: "Started 5 September 2026", the day the batch Catch-up came into being.
2. **Collecting.** Hero: the day answers open, "13", "SEPTEMBER 2026", "Answers open.", line "Questions can go in until then · 4 asked so far", pill "Ask something". A Keeper also sees a leaf text button after the pill, "Open answering now", which moves the date to today. Spine's first entry: "Round 2 · in the making", its date strip in small muted text ("Questions until 13 September · answers 13 to 26 September · comes out 27 September at 6"), then the questions asked so far, each a line: the question in body text, then "Ravi asked" or "asked anonymously" in muted small, and for your own question an "x" at the row's end. A Keeper's rows carry a drag handle at the left and an "x" on every row; reordering is a drag with auto-animate. Under the list, one leaf text button, "From the library".
3. **Answering.** Hero: the last day, "26", "SEPTEMBER 2026", "Last day to write.", line "9 of 23 have written in.", pill "Answer" (or, once you have, "Change your answers"). Keeper: text buttons "Remind everyone", "Close now", "Extend a week"; the last one moves the hero's number by seven when pressed, with the numeral cross-fading. Spine's first entry: "Round 2 · in the making", the date strip, then "Written in" as a label and the nine names as bird chips (20px bird, first name, 28px tall, wrapping, ordered by when they wrote), then "Still to write" as a label and the fourteen remaining names as plain muted text separated by middle dots. On a batch Catch-up the only extra control is "Remind everyone", open to any member, once per Round.
4. **Preparing.** Hero: "27", "SEPTEMBER 2026", "Comes out at 6 in the evening.", line "13 wrote in.", no pill. Keeper: one leaf text button, "Publish now". Spine's first entry: "Round 2 · in the making", the thirteen names as chips, nothing else. A batch has no Publish now; it comes out at 6.
5. **Published, next not yet open.** Hero: the next Round's opening day for answers, "13", "OCTOBER 2026", "Round 3 opens.", line "Nothing asked for it yet. Three from the library go in if nobody asks.", pill "Ask something". Spine's first entry: the cover of Round 2, an ink disc, one tap to the reader. There is no "Round 2 is out" tile, no inline Round, no rail row; the cover on the spine is the one thing. The moment somebody asks, this becomes state 2 with no change to the page but the line.
6. **Paused, which is a hold.** Hero: the circle with nothing in it, drawn dashed, the label "NO DATE YET", the verb "Round 3 is on hold.", the line "It opens when a Keeper resumes." For a Keeper the pill is "Resume", and pressing it puts the next date back in the circle (the numeral scales in from 0.9 on the spring curve). A Round already collecting or answering when the hold was set is still the spine's first entry with its own dates, and its own Answer pill sits under that entry rather than in the hero. Nothing is hidden by a hold. A batch cannot be held.
7. **Ended.** No hero. The spine begins at the top of the sheet with a cap and "Ended 3 March 2026", then the covers, then the start cap. The meta line in the head reads "Ended · 23 people". The menu holds only Reminders (greyed, "Nothing left to remind you of") and Archive.

At 390 the hero fills what the head leaves: name and meta to about y=170, the hero from y=190 to y=340 with the pill at y=300, the spine from y=370. The primary action is on the first screen in every state; today's is at 91%. At 1512 the sheet is 760px with 40px padding, the hero's numeral 120px with the right block beside it and the pill under, and the spine below at a 680px measure. The rail, 318px from 1180 up, holds this month as a calendar: a 7-column grid of 40px cells, day numerals at small, the Round's four dates marked (answers open as a filled canopy disc behind the numeral in white, the last day circled in cinnamon, comes out as a hollow disc, questions open as a dot under the numeral), today underlined. From 1440 up the rail also shows the twelve mini months beneath it, dots only, the same marks as the list's calendar. Nothing in the rail is a cover; tapping a marked day scrolls the spine to that Round's entry.

### 2.4 The composer

`/catchups/[id]/answer`. The green bar prints "in the loop" (tap: home). The page is one sheet: at its top, "Round 2" as display and a dateline in small muted, "Answers close Friday 26 September", with a small circled "26" at the line's left, the hero's mark at 40px. Then a progress line: "4 of 11 answered" at small, and under it eleven ticks (each 24px wide, 3px tall, 4px apart), filled canopy where answered.

Then every question, on one page, in Round order. Each is the question as an h3 heading, then a text box in the calm material (mist fill, no border, grows with the text, placeholder "Your answer"), then a row of two leaf text buttons, "Add a photograph" (up to three; thumbnails at 80px, 8.8px radius, appear in a row under the box with an "x" on each) and, when the question carries a wall, "Add one to the wall" (one photograph, with a one-line caption field under it). Saving is automatic, per question, a second after typing stops; a small "Saved" fades in at the row's right and out again. There is no Skip and no Share: a question left blank is a question you did not answer, and nothing is sent until you leave.

Paste a link anywhere in a box and, within a second, the card the reader will show appears under the box, our own card (2.10), with an "x" at its corner that says "No card" for the person who pasted four links to make a list. Two links in one answer: the first music or video link gets the card, the rest stay links. The sentence you typed is never touched.

The bottom bar is the reader's navigator (section 3), reused whole: "4 / 11" and the current question, the proportional track on its top edge, tap to open the sheet of questions, each row here marked with a tick for answered. Leaving the page, by the name in the bar or any other route, is the send: the completion state is a toast, "You're in Round 2. It comes out 27 September at 6.", and the home shows your name among "Written in".

### 2.5 The reader

Section 3, in full. Here only: `/catchups/round/[id]`, one native scroll, the name in the green bar, the question in the bottom bar, the covers' big brother as the masthead, the next date circled at the end.

### 2.6 Who is here, and who wrote in

Who wrote in is on the Round: the spine's first entry during answering (chips and the still-to-write list), the cover once published (five chips and "and 8 others"), and the reader's masthead (the same chips, the "and 8 others" opening in place). A chip is a 20px bird and a first name in Source Sans at small, 28px tall, no border, no fill; on hover the state layer at pill radius. Tapping a chip in the masthead filters the reader to that person (section 3).

Who is in this is one level down, behind "23 people" in the head. It is a sheet: bottom sheet on a phone at the large detent, a float panel on desktop at 448px wide with the dialog material. Its header is the count, "23 people", and for a people Catch-up two leaf text buttons under it, "Add someone" (opens the name search in place) and "Copy the invite link" (copies, and the button reads "Copied" for two seconds; no link is printed on screen, so nothing can be clipped). A search field appears above the list when there are more than twelve people. Rows are 52px: a 40px bird, the name at small semibold, the small-caps batch line under it ("BATCH OF '11"), the Keeper's leaf glyph after the name in leaf, and at the row's trailing edge the person's Rounds as dots: one 6px dot per Round this Catch-up has published, filled ink if they wrote in, hollow if not, up to twelve, then a count ("9 of 15"). Rows are ordered: this Round's writers first, then your own batch, then everyone else, alphabetical within each. Tap a row to open their profile. For a Keeper of a people Catch-up, a "..." at the row's end opens a 220px menu (so no label wraps): "Make a Keeper", then a separator, then "Remove from in the loop" in red, which opens a dialog. On a batch Catch-up the sheet has no search-to-add, no invite, no row menus, and the header says "39 people · everyone from 2011".

### 2.7 The menu, the verbs and the dialogs

One door: the "..." at the top right of the home's head, and the same sheet from a list row (long press on a phone, the hover "..." on desktop). On a phone it is a bottom sheet with a grabber; on desktop the menu material, opening below the trigger, aligned to its leading edge. Rows at their natural height, 44px on a phone.

For a member of a people Catch-up: "Reminders · Daily" (a chevron; opens the reminders dialog), "Archive". A separator. "Delete" in red.

For its Keeper, between Reminders and Archive: "Rhythm · Every month", "Hold the next Round" (or "Resume" while held), and after the separator, "End in the loop" in red, then "Delete".

For anyone in a batch Catch-up: "Reminders · Daily", "Archive". That is the whole menu.

The dialogs, all in the one material, title plus at most one line, Cancel then the verb:

- **Reminders.** Title "Reminders". Three radio rows: "Every day it is open", "On the last day", "Off". Cancel, Save. No helper text; the rows say what they do.
- **Rhythm.** Title "Rhythm". Three radio rows: "Every two weeks", "Every month", "Every term (January, May, September)". Under the chosen row, one line in small muted text computed live: "Round 3 would open 13 October." Cancel, Save.
- **End in the loop.** Description: "Nobody can ask or answer after this. The Rounds that came out stay readable." Cancel, End (red). Nothing focused, so Enter cannot end it.
- **Delete in the loop.** Description: "It leaves your list now and is gone for good after 30 days." Cancel, Delete (red).
- **Remove Ravi.** Description: "Their answers in past Rounds stay." Cancel, Remove (red).
- Archive has no dialog. The row leaves the list and a toast says "Archived. Undo" for five seconds. Hold has no dialog either; the hero changes.

### 2.8 The batch Catch-up

Told apart by its rhythm word, nothing else: "Every term" on its state line and in its head, and a year of dots with three fixed months marked. Its name is "Batch of 2011", set by the site and un-renameable. It is listed among the people Catch-ups as one kind of thing.

The term calendar. Three dates a year, the same for every batch on the site: answers open on 6 January, 6 May and 6 September, and the Round comes out at 6 in the evening on the 20th of that month. Questions for a term's Round gather from the moment the previous term's Round came out, so there is always a Round in the making and always something to ask into. Two weeks before the date, if fewer than three questions have been asked, the library adds enough to make three, chosen so the same question does not repeat within a year. On the date, every member of the batch gets one notification, "The September Round is open for the Batch of 2011. Closes 19 September." That is the term bell, and it rings for eleven batches at once, which is the point: on 6 September the whole site is writing.

Who keeps it: nobody. There are no Catch-up verbs (no rename, no rhythm, no hold, no end, no people editing) and no Round verbs but "Remind everyone", which any member may press once per Round and which sends the last-day reminder to those who have not written. The first day, for a batch that has just come into being, is state 1 in 2.3: the first term date circled, three questions already in the making, "Ask something".

A batch nobody answers. On the 20th at 6, a term Round with no answers does not come out. No notification goes out, nothing is deleted, and the Catch-up does not pause. The spine records the term as a hollow disc with "September · nobody wrote in" in muted small text, and its questions carry over to January's Round, where they sit at the top of the list marked "carried over from September". The next term's bell rings as usual. A batch that stays silent for years keeps three notifications a year and nothing else; any member who does not want even that sets Reminders to Off, which also silences the bell, or archives it, which silences everything and hides it. One answer is enough for a Round to come out: the cover says "Ravi wrote in" and the rest of the batch gets to read him, which is how a silent batch wakes up.

Its people sheet is read-only (2.6). Someone who joins the site in 2028 is in it that day, sees every earlier Round on the spine, and can write into the next one.

### 2.9 Archive and delete, and where archived things live

Two personal verbs, from the one door, on the home or the row. Archive hides the Catch-up from the list and silences its reminders and its bell; a toast offers Undo; the "Archived · 1" row appears at the list's foot. Opening an archived Catch-up from that row brings it back to the list, with a toast, "Back on your list". Delete, for a people Catch-up only, is also how you leave: the row goes to the bin, the same foot row says "Deleted · 1, gone in 26 days", and opening it from there restores it and your membership. A batch Catch-up cannot be deleted or left; Archive is the whole answer, and the menu says nothing about leaving because there is nothing to say.

### 2.10 Comments on an answer, a song card, a photo wall

All three are in the reader and drawn in section 3. In short: comments are a count under the answer that opens in place, using the post comments family; a song card is our own 80px card under the answer's text, made from any pasted music or video link, art at the left and title, artist and a source word at the right, tapped to open the real thing in a new tab; the photo wall is a block any question can carry, everyone adds one photograph in the composer, and the reader prints them as justified rows, two or three to a row on a phone and four to six on desktop, each attributed by a 20px bird and a first name under it.

### 2.11 The notification a member taps at each transition

Each one is a date with a verb, in the bell and in the email, and each lands exactly where the state says:

- "Questions are open for Round 2 of in the loop. Answers open 13 September." Lands on the home, hero showing the 13th.
- "Round 2 of in the loop is open for answers. Closes 26 September." Lands on the composer.
- "Last day to write for Round 2 of in the loop." Lands on the composer, at the first unanswered question.
- "Round 2 of in the loop came out." Lands on the reader's masthead.
- "Ravi commented on your answer in Round 2." Lands on that answer with its comments open.
- "The September Round is open for the Batch of 2011. Closes 19 September." Lands on the batch's home.
- "Round 2 of in the loop is on hold." Lands on the home, hero showing the empty circle.
- "in the loop has ended." Lands on the home.

### 2.12 The empty states

A brand-new member lands on a list with one row, their batch Catch-up, state line "Every term · the January Round opens in 122 days", and the pill to make one of their own. A member with no batch year sees the one-line explanation and the pill (2.1). A batch with no Round yet is state 1 in 2.3: a circled date, three questions, one pill. A Round with one answer reads as a Round: the masthead says "1 wrote in" with one chip, each question the one person answered prints their answer under it, each question they skipped is not printed as a heading over nothing but listed at the end under "Carried over to Round 2", and the navigator lists only the questions that have answers.

### 2.13 The pressure fixture

Section 7, in full.

---

## 3. The reader, precisely

The Round is one sheet of paper and one native scroll. On a phone the sheet runs edge to edge from the bottom of the green bar, no radius, no margin, no shadow, and the valley photograph is not visible behind it; the sheet is the page. On desktop it is a paper column of 680px with 16px radius, and the page background shows on either side of it with the rails on it. Inside the sheet, 20px of padding on a phone and 40px on desktop, so the text measure is 350px at 390 and 600px at 1512. Everything in the sheet is text, photographs, cards for links, and space. No answer has a box.

**The green bar.** On a phone the 56px canopy bar prints the Catch-up's name where the app's own name usually sits: "in the loop", white, Source Sans at 1rem semibold, left, after the menu button. Tapping the name goes to the Catch-up's home. It is the one thing on screen at every scroll depth that says what you are inside, and it is the way up. On desktop the same job belongs to the left rail's header.

### The masthead

Drawn from the cover's fields and nothing else, so the cover on the spine and this are visibly one family: the cover prints Round, date, writers, question count at h3 size; the masthead prints the same four at display size.

At 390, from the top of the sheet:

- y=76: "Round 1" as display (clamp(1.9rem, 5vw, 2.6rem), which is 31px here), Libre Baskerville, tight tracking, ink.
- y=118: the dateline at small, muted: "Came out on Saturday 15 August 2026".
- y=148: the writers, as chips: a 20px BirdAvatar, 4px, a first name at small, 28px tall, 12px between chips, wrapping. Five names, then a chip with no bird reading "and 8 others" in leaf; tapping it expands the remaining eight in place with auto-animate and the chip disappears. At 350px the five make two lines: four on the first, one and the "others" chip on the second. The names are ordered by when they wrote in, first writer first. The chips are ordered the same way on the cover.
- y=204: the masthead ends. There is no rule under it (the 1.08:1 line is gone), no count of questions (the navigator carries that), and no row of birds.

Tapping a writer's chip filters the Round to that person: every question shows only their answer, questions they skipped drop out of the page and the navigator, and the bottom bar's left label becomes their name with an "x" ("Mohini ×"), which clears it. The navigator's count becomes "3 / 7". This is a change to your view and nothing else, and it is Letterloop's L-l closed on any width.

As you scroll, the masthead scrolls away like anything else. Nothing docks at the top except what was already there: the green bar with the name.

At 1512 the masthead is the same four lines at the top of the 680px column, display at 41.6px; the five chips and the "others" chip fit on one line.

### The navigator, on a phone

**Resting.** A bar fixed to the bottom of the viewport, 58px tall plus `env(safe-area-inset-bottom)`, glass (translucent paper with backdrop blur), a hairline at its top edge in border colour. Inside, 20px padding left and right. Left: the position as a label, "3 / 11", 0.75rem, tracked, muted, 44px wide. Then the current question in Libre Baskerville at 0.9375rem, ink, one line, clipped at the right by a 24px fade to the bar's colour, never an ellipsis and never a cut mid-word by a hard edge. Right: a chevron-up glyph (Lucide, 20px) with the 44px hit. The whole bar is one tap target that opens the sheet; the chevron is where the eye expects it. Along the bar's top edge, replacing the hairline for its length, a 2px track: eleven segments, each proportional to that question's height on the page, with a minimum of 8px and 1px gaps between them. Segments already read are ink at 60%; the current segment fills left to right with canopy as you read through it; segments ahead are border colour. So question 3, the longest by text, is a long segment, and question 7, the one-liners, is a short one; the track is the shape of the Round, and where you are in it. The bar does not hide on scroll. It is the answer to "I don't even know what the question is" and it has to be there at the moment you have forgotten.

The current question is the one whose heading is above the top of the viewport and whose next heading is below it; while the masthead is on screen the bar reads "Round 1" and "11 questions" instead of a question, and the track has no fill.

**Open.** Tapping the bar raises a sheet from the bottom on EASE_IN_OUT_SCENE over 260ms, with a grabber, to the height of its list up to 85% of the screen, then scrolling inside. The page behind stays where it was and is not dimmed; tapping anything outside the sheet, or dragging it down, closes it. The sheet is Float white, 20.8px radius at its top corners, the dialog's shadow.

Its header, 64px: "in the loop" in Libre Baskerville at h3, tappable, which goes home; under it "Round 1 · 15 August 2026" at small muted. Then a row for the top: "The masthead · 13 wrote in". Then eleven rows, one per question: the question in Libre Baskerville at 1rem, wrapping to at most three lines with a fade on the third, never cut at a character count; under it at small muted the count, "13 answers". The current question's row is marked by a 6px canopy disc in its left gutter and its text in ink; every other row's text is muted. Weight never changes, so no row reflows when the current one changes (the 18px jump in today's rail came from bolding item 5). The current row's count reads "answer 4 of 13" instead of "13 answers", which is how far into that question you are. A last row, "The end · Round 2 opens 6 October".

Tapping a row closes the sheet and scrolls the page to that heading with `scrollIntoView` smooth, the heading landing 16px under the green bar. For ten seconds after a jump the bar's left label becomes a return control, a curved arrow and the old position ("↶ 3 / 11"), and tapping it puts you back where you were, which is Apple Books' rounded arrow with a timer on it; after ten seconds, or after you scroll a screen, it reverts.

The forty-answer question reads in the sheet as one row like any other: "Describe your month in three words. · 40 answers", and, when you are in it, "answer 12 of 40". On the track it is a long segment filling slowly. Nothing about it is collapsed, windowed away or hidden; the navigator makes its length legible rather than bottomless.

### The desktop plan

At 1512 the content area is 1184px wide beside the 248px sidebar. Three columns: a left rail of 232px, a 36px gutter, the sheet at 680px, a 36px gutter, a right rail of 200px. Both rails are sticky at the top of the content area, 40px down, and scroll internally if they are ever taller than the viewport.

The left rail is the navigator. Its header: "in the loop" at h3 in Libre Baskerville, tappable, the way home, kept on screen at every depth; under it "Round 1 · 15 August 2026" at small muted. Then the eleven questions, each at 0.9375rem in Libre Baskerville, wrapping fully, with its answer count at the right in muted small ("13"), and the same canopy disc and ink-versus-muted marking as the sheet, weight never changing. Rows are 44px or taller, and hover takes the state layer at 8px radius. Under the list, "The end".

The right rail holds who wrote in: a label "WROTE IN", then thirteen rows of a 28px bird and a full name at small, tappable, each a filter as on the phone; the active one takes the canopy selection wash with white text, the app's one green state, and a "Show everyone" text button appears above the list. Under the writers, after space-xl, the next date at the hero's size for a rail: a 40px circled "6", "OCTOBER", "Round 2 opens." at small, and a leaf text button, "Ask something for it".

At 1180 to 1440 the right rail drops and its two things move to the end of the Round. Under 1180 the sheet is alone at full width up to 680 and the bottom bar returns. At 1920 nothing widens: the three columns stay 232, 680 and 200, left-aligned in the content area, and the page background shows to the right.

### A question's heading

Above every question, after space-xxl from whatever came before (space-xl after the masthead), a 32px by 2px cinnamon dash at the left of the measure, then space-xs, then the question itself as h2: Libre Baskerville at 1.5rem, tight tracking, ink, wrapping at the measure. No "Question 1". No number anywhere but the navigator. When the asker is named, one line under the heading at small muted, "Anand asked."; when the question was asked anonymously, nothing. A question over 120 characters is set at h3 (1.25rem) instead, so the 300-character one takes nine lines at 390 rather than eleven. A question that carries a wall has its wall directly under the heading, before any text answers (section 7).

### The answer tile, in four states

One tile, no box, two densities.

**Full density, text only.** An IdentityRow: the 28px BirdAvatar, then the name at 0.9375rem semibold in ink and, on the line under it, the small-caps batch line "BATCH OF '11" in muted at 0.6875rem tracked. The whole row is 28px tall with the two text lines stacked beside the bird; tapping the name opens the profile. Then space-xs, then the answer in Source Sans at 1rem with 1.65 leading, ink, `white-space: pre-wrap` and `overflow-wrap: anywhere`, never clamped. Then space-xs, then the action line, 32px tall: the LoveButton (the one red heart, 20px, with its count in small beside it, and no transition on its colour) at the left, then 16px, then the comment control as a leaf text button, "Comment" when there are none and "3 comments" when there are. The tile ends there. The next tile begins after space-l. A short answer inside a full-density question, under 90 characters and on one line, puts the action line on the same line as the text instead: the heart and the comment control sit at the line's end, right-aligned, so a one-line tile is 28 + 6 + 27 = 61px tall and nothing under it is empty.

Invented, in the shape of question 6's: "Ravi Menon, BATCH OF '11. Not remotely. I thought I would be somewhere with a coastline by now and instead I am forty minutes from where I grew up, which turns out to be exactly where I wanted to be. The surprise is how little the geography mattered. ♥ 9 · 2 comments."

**With one photograph.** The identity row, the text (this one is a caption, so it is clamped to four lines with "More" in leaf at the end of the fourth line, which opens it in place, and "Less" after), then space-s, then the photograph in PhotoFrame at the full measure: a wide photograph at its true shape, a tall one as 3:4 on a blurred bed of itself, capped at 700px tall, 12px radius on desktop and 8.8px on a phone where the sheet has no radius of its own. Tap opens the full-screen viewer. Then space-xs and the action line.

**With three photographs.** The same, but the photographs are a carousel on a phone: the shared photo carousel with its height interpolation, so dragging from the second portrait (467px tall at 350 wide) into the landscape (262px) shrinks the frame under your finger rather than snapping; three 6px dots under it, the current one ink. On desktop the three are one justified row at the measure, the two portraits and the landscape sharing a row height of about 240px, 6px gaps, each at 12px radius. Invented text for the real three-photograph answer under question 1: "Paris in a heatwave, then a week in Vienna. The third one is the view from a friend's balcony that I did not want to leave."

**With a song link.** The identity row, then the text with the link left exactly where the member typed it, rendered as a link in leaf with an underline, breaking anywhere it has to so it can never push the page sideways. Then space-s, then the card: 80px tall, the full measure wide, paper on paper so it takes a hairline border in border colour and 12px radius (a box that has earned its edge, because it is a different object from the text). Inside: at the left, the art, 64px square for a track or 96 by 54 for a video (from mqdefault or maxresdefault, never hqdefault with its bars), at 8.8px radius; then the title at 0.9375rem semibold, ink, one line, faded at the right; the artist at small muted; and at the far right a source word at label size, "Spotify" or "YouTube", muted. A play glyph on the art where a 30-second preview exists (Spotify and Apple), never on YouTube. The whole card is a link that opens the track in a new tab. Then space-xs and the action line. If the link never resolved, the text shows the plain link and no card, and there is never a shimmer waiting for one. Invented, in the shape of question 5's: "Anand Vij, BATCH OF '09. This, on loop since June: https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc" and under it a card, "Straight Line Was A Lie · The Dharwad Sessions · Spotify".

**Line density.** Chosen per question, when at least seven in ten of its answers are under 90 characters and none carries a photograph or a link. Questions 7 and 9 in the real Round qualify. Each answer is one row: the 28px bird, then, on the same baseline, the name at 0.9375rem semibold, a 6px gap, the batch as "'11" in small caps muted, a 10px gap, and the answer at 1rem in ink running on from there and wrapping under itself, not under the bird; then the heart and comment control at the row's end, right-aligned on the last line. Rows are separated by space-s. A longer answer in a line-density question simply wraps to more lines; it is still a row. Forty rows of three words are about 36px each, and the question is 1,440px tall instead of 4,000. Invented, in the shape of question 7's: "Ravi Menon '11 Not a chance. ♥ 3", "Ananya Honnur '14 I watched him do it at two in the morning. ♥ 11", "Afya Zakir '12 Who else would put a hoopoe on the login page? ♥ 6".

**A 2,000-character answer** is full density, unclamped: about 35 lines at the phone's measure, 920px, one screen and a bit, and the track shows it. **A one-word answer** in a full-density question is the 61px tile with the heart at the line's end; in a line-density question it is a 36px row.

### The comments

Collapsed: the comment control on the action line, "3 comments" in leaf. Open: tapping it expands the comments in place under the action line with auto-animate, indented 36px so they sit under the answer's text and not under the bird. Each comment is the post comments family's row: a 24px bird, the name at small semibold, the text at small, a 16px heart with a count at the row's end. Under the last comment, the composer pill, mist-filled, "Write a comment", which does not take focus until tapped; a mention is "@" and a name. The control's label becomes "Hide comments" while open. A comment on your answer is a notification that lands here with the comments already open.

### The heart

The LoveButton, the one red heart, at 20px with its count. It flips at 28ms and nothing re-renders behind it, because the action does not revalidate the page. Pressing it plays the pop once, on the spring curve, and the count steps. It is the same heart as the feed's, in the same colour in both themes.

### The way back, from any depth

On a phone: the name in the green bar, always on screen, and the name in the navigator sheet's header, one tap away. On desktop: the name at the head of the left rail, sticky, always on screen. At the end of the Round, the Catch-up's own line. There is no Back button and no link at 44,381px.

### The end of the Round

After the last answer of the last question, space-xxl, then a closing block on the same sheet:

- "The end of Round 1." at h2 in Libre Baskerville.
- If any question had no answers: at small muted, "Carried over to Round 2: What are you reading?"
- The next date, as the hero at 40px: a circled "6", "OCTOBER 2026" as a label, "Round 2 opens." at h3, and a canopy pill, "Ask something for Round 2". If the Catch-up is on hold: the dashed empty circle, "NO DATE YET", "Round 2 is on hold." If it has ended: "in the loop ended on 3 March 2026." and nothing to press.
- Then space-xl and the Catch-up's line, tappable as a whole, the way home: "in the loop" at h3 and "Every month · 23 people" at small muted under it.
- Then 40px of paper and the sheet ends.

### The first screen at 390

The canopy bar, 0 to 56, "in the loop" in white at its left after the menu button. The sheet from 56. "Round 1" at 76. "Came out on Saturday 15 August 2026" at 118. Two lines of writer chips from 148 to 204: Mohini, Cyan, Ravi, Ananya on the first line; Afya and "and 8 others" on the second. The cinnamon dash at 246. "What is a fun thing you did this summer?" at 254, two lines, ending at 314. No asker line, because it was asked anonymously. At 340 the first answer's identity row, a bird and a name and the batch line, to 368. From 374 a four-line answer of about 180 characters, to 480. At 486 the action line, a red heart with "4" and "Comment", to 518. At 544 the second answer's identity row, then two lines of text to 631, then at 641 the top of its first photograph, a portrait in a 3:4 frame that will run to 1108, cut by the navigator at 786. The bar from 786 to 844: "1 / 11", "What is a fun thing you did this summer?" faded at the right, the chevron; on its top edge the track with its first segment a fifth full in canopy and ten segments of border colour after it, the third visibly the longest.

One complete answer and the start of a second, with a photograph, on the first screen. Today's first screen has none.

### The first screen at 1512

The canopy sidebar, 0 to 248, with Catch-ups as the lit row. From 288, the left rail: "in the loop", "Round 1 · 15 August 2026", then eleven questions with their counts down to about y=560, the first marked with the canopy disc. From 556 to 1236, the sheet: "Round 1" at 41.6px, the dateline, five chips and "and 8 others" on one line, the dash and the first question on one line at 1.5rem, the first answer with its four lines of text now three at the 600px measure, its action line, then the second answer's text and, from about y=560, its three photographs as one justified row 600px wide and about 240px tall, then that answer's action line and the third answer's identity row at about y=900. From 1276 to 1476, the right rail: "WROTE IN" and thirteen names with birds down to about y=520, then the 40px circled "6", "OCTOBER", "Round 2 opens.", "Ask something for it". Three and a half answers on the first screen against today's three, but with the Round's whole map beside them.

### A mid-scroll screen at 390, deep in question 5

The canopy bar, "in the loop". Under it the tail of an answer: the bottom 40px of a song card ("Straight Line Was A Lie · The Dharwad Sessions · Spotify", the art's lower half showing), then its action line, "♥ 4 · Comment". After space-l, the next answer: "Afya Zakir" with "BATCH OF '12", then "Can't stop playing this one: https://youtu.be/dQw4w9WgXcQ", the link in leaf, wrapping under itself; then a card with a 96 by 54 thumbnail, a title, "Rick Astley", "YouTube"; then "♥ 2 · Comment". After space-l, "Anand Vij", "BATCH OF '09", "Kabhi Kabhie, the old recording, most mornings." on one line with "♥ 1 · Comment" at its end, because it has no link and no photograph. After space-l, the identity row of a fourth answer and the first line of its text, cut by the bar. The bar: "5 / 11", "Songs you've had on repeat lately", the chevron; the track with four segments in ink at 60%, the fifth just under half full in canopy, and six ahead in border colour.

Nothing on that screen is wider than 350px. The link broke where it had to. The green bar is 390px wide and so is the page.

---

## 4. The design system, kept and broken

Kept, by default and on purpose: the palette, every token of it, and the surface ladder (page under paper under float, and the state layer for hover and press, never an opaque swap); Libre Baskerville for every heading and Source Sans 3 for every line of body; the type scale for everything that is a heading or a paragraph; the radius ladder, 16 for the desktop sheet, 12 for a photograph or a card inside it, 8.8 for a thumbnail, pill for a control; the menu and dialog materials whole, including the two-text-level rule and Cancel-then-verb; the focus recipes; the LiveButton and the warm shimmer; every motion curve from motion.tsx; hover never moving a control; the mobile rules, the safe-area padding on the bottom bar, no field taking focus uninvited, 44px hits on 20px glyphs.

Broken, each because the break is the point (D36):

1. **The sheet runs edge to edge on a phone with no radius, no margin, no shadow.** The rule says cards are 16px boxes on the page. A Round is not a card; it is the page, and reading it should feel like holding one thing, not scrolling a stack of things. This is the "end to end, takes up the entire screen" of his Action Button analogy, and it is what lets the first screen hold a whole answer.
2. **The date numeral is set above the type scale**: 88px on a phone, 120px on desktop, against a scale that tops out at 41.6px. A numeral is not a heading. It is the one object on the home that has to be seen from across the room, and at the scale's display size it would be a heading like any other.
3. **The cinnamon circle is a drawn stroke, not a shape from the ladder.** Everything else in the app is a pill or a rounded box; this is an ellipse with a gap where the pen lifted. It is illustration, in the same standing as the hoopoe and the bird glyphs, and it is the mark that makes a circled date read as circled rather than as a badge.
4. **The green bar carries a page title on a phone.** Today the bar is the app's own lockup and a menu button, the same on every page. Inside Catch-ups it prints the name of the thing you are inside (the list prints "Catch-ups", the home prints "Catch-ups", the reader and composer print the Catch-up's name), and that name is a control. It is a change to the shell, and it is the only way the way-up can be on screen at every depth without spending a second strip of chrome on it.
5. **Answers have no box.** The feed's post is a paper card on the page; the reader's answer is text on a sheet with a bird beside it. The tile's content is D12's, its chrome is gone, and that is what removes the thick bottom band he named.

The one thing on screen that could only be this app: a Libre Baskerville "6" with a cinnamon pen circle round it, standing for the day the Batch of 2011 next writes to each other, and the same circle at the end of every Round telling you when the next one opens.

---

## 5. Letterloop, closed and open

| # | Letterloop has | This direction |
|---|---|---|
| L-a | comments with @mentions | closed: the post comments family under every answer, "@" and a name |
| L-b | a Music section with Spotify search | closed, wider: any pasted music or video link, on any question, makes our card; the sentence is never rewritten |
| L-c | a Photo Wall section | closed: a wall block any question can carry, everyone adds one, justified rows, attributed by bird and name |
| L-d | "the next issue arrives on" | closed and made the hero: the next date is circled on the home, at the end of every Round, in the desktop rail, and on the list row |
| L-e | a reaction picker | open on purpose: the heart is the app's one reaction, and a picker would make the action line a toolbar |
| L-f | reply progress, who has and has not | closed, on the spine's first entry: "Written in" as chips and "Still to write" as names, and in the people sheet as each person's Rounds as dots |
| L-g | reminders, automatic and manual | already there; "Remind everyone" is the manual one, open to any member of a batch |
| L-h | the Album | open on purpose: a photograph's home is the reader, a wall already gathers many photographs in one place, and the valley's photographs already have the Collection; an Album would be a fourth surface for the same pictures |
| L-i | Download PDF | track M; the end of the Round is where its link will sit |
| L-j | Mementos | open |
| L-k | themes that recolour | no, on purpose |
| L-l | filter an issue by member, sort replies | filter closed: tap a writer in the masthead or the desktop rail and the Round becomes their answers; sort left open, answers stay in the order they were written |
| L-m | a banner photo and a logo per loop | no: the Catch-up's picture is its year of dots, derived from its own calendar, and a cover carries no photograph |
| L-n | four roles | one, Keeper, and none at all on a batch |
| L-o | Home quick actions | closed by the state line on every row, which is always a date and a verb |

And two things Letterloop does that this direction refuses: deleting an issue nobody answered and pausing the loop (here a silent term is recorded and carried over, and nothing pauses), and reply progress three taps deep (here it is the first thing on the spine).

---

## 6. Live and static

Must be genuinely live to be judged:

- The mobile navigator, whole: the bar, the proportional track filling as the page scrolls, the sheet opening and closing, tapping a row and landing on the heading, the return control, and the bar's text changing as headings cross the top of the viewport. On the real Round, at 390 by 844, with the page scrolling natively.
- The desktop left rail marking the current question as the sheet scrolls, and tapping a rail row.
- The heart, so the 28ms flip is felt against today's one to three seconds.
- Comments opening and closing in place on at least one answer.
- The photo carousel on the three-photograph answer, so the height interpolation can be dragged, and the viewer opening from it.
- The writer filter: tapping a chip and seeing the Round become one person's answers, and clearing it.
- The masthead's "and 8 others" opening in place.

May be static compositions:

- The list at 390 and 1512, with the year calendar drawn.
- The home in its seven states, each as one composition at both widths, with the hero's numeral and circle drawn; the Keeper's "Extend a week" cross-fade may be a still.
- The composer.
- The people sheet, the menu sheet, and the five dialogs.
- The notifications, as a list of the eight lines and where each lands.

---

## 7. Under pressure

Against `_fixtures/pressure.ts`, honestly.

**One answer** under a question (LONELY): the heading, the dash, one full-density tile, and the next question after space-xxl. The navigator row says "1 answer". It reads as a question one person answered, which is what it is; it is not padded and it is not hidden.

**Forty answers** (CROWDED): thirty of the forty are under 90 characters and none has media, so the question takes line density: forty rows at about 36px, with the ten 240-character ones wrapping to five lines each, about 1,900px in all. The track gives it a long segment; the sheet row says "answer 12 of 40" as you go. Nothing is windowed or collapsed, and on a phone that is honest about its cost: a screen and a half of one-liners followed by another. If the Round ever has several such questions in a row, the reader is long, and the navigator is the whole answer to that.

**A 6,000-character answer**, and the 9,000-character one that predates the cap: full density, unclamped, about 100 and 150 lines at the phone's measure, 2,700px and 4,000px. Three to five screens of one person. The track shows it as a long fill inside the question's segment, and the sheet says which answer you are on, but there is no way to skip a person, and I chose not to add one, because a member's answer is not something the reader should be able to fold away. This is where the direction is weakest on a phone, and the magazine is where a long answer will be laid out properly.

**A 24-photograph wall**: justified rows at the measure, target row height 150px on a phone (two or three to a row, nine rows, about 1,450px) and 200px on desktop (four to six to a row, five rows). Each photograph attributed under it by a 20px bird and a first name at 0.75rem; a caption, when there is one, on the same line after the name, faded at the row's edge. A row with a single leftover photograph is shown at its width, not stretched. Tap opens the viewer with all 24 in order. The wall sits directly under the question's heading; text answers to the same question, if any, follow it. The broken-file photograph draws as a mist rectangle at the row height with the bird and name under it, so the row keeps its shape.

**A 300-character question**: the heading drops to h3, nine lines at 390, about 270px; in the bar it is one line faded at the right; in the sheet it is three lines with a fade on the third. It is a long heading, and it looks like one.

**A 78-character name**: in the identity row, the name wraps to two lines at the 314px beside the bird and the batch line sits under the second line; the row grows to 48px and the bird stays top-aligned. In a chip, first name only, "Padmanabhan". In line density, the name wraps and the answer starts after it on the same line, which is ugly for this one row and correct for the other thirty-nine. The Devanagari and Arabic names render in the same face and size; the right-to-left one sits inside a left-to-right row, which the row allows with `unicode-bidi: isolate` on the name.

**An emoji-only answer**: a one-line tile in full density, 61px with the heart at its end, or a 36px row in line density. The emoji are set at the body size, not enlarged.

**A pasted 123-character link**, alone, as the whole answer: rendered as a link in leaf, breaking anywhere it must so its longest unbreakable piece never exceeds the measure, then the card under it if it resolved and nothing if it did not. The sheet clips horizontally and every container that holds a member's typing has `overflow-wrap: anywhere`, so the page cannot be pushed sideways and the green bar cannot run out.

**A Round nobody answered**: it does not exist going forward, because the calendar does not publish one; the term is recorded on the spine as a hollow disc and its questions carry over. For the legacy rows that are already published empty ("test" Round 1, the fixture's Round 2), the cover on the spine reads "Nobody wrote in" in muted text where the chips would be, drawn faint, and the reader shows the masthead with "Nobody wrote in", the questions listed under "Carried over", and the end block. It is never promoted anywhere.

**A name over the cap, a whitespace-only answer, a script tag**: the 80-character name wraps like the 78; the whitespace answer is treated as no answer and the writer's chip still appears on the cover, because they showed up; the angle brackets render as text.

Where it breaks: a Round of twelve questions with forty answers each is 20,000px on a phone and the navigator makes it navigable without making it short; and a person who writes 6,000 characters to every question makes a Round that is mostly them, which the filter can show and cannot hide.

---

## 8. The two things I am least sure I got right

**The term bell for a batch that never answers.** Three notifications a year to thirty-nine people, eleven batches at once, for years, whether or not anyone in that batch has ever written a word, and three library questions seeded into every term so the Round is never empty. I chose it because the alternative, a batch that has to be started, is exactly the "Start one" he did not understand, and because a term date that only rings for batches who answered last time is a bell that stops ringing for the batch that most needs it. But I can imagine him reading "the September Round is open for the Batch of 2011" in the bell three times a year with nothing behind it and calling it noise, and I can imagine a Round that comes out with one writer feeling to that writer like standing up in an empty hall. Reminders Off silences the bell and Archive hides the whole thing, and one answer is enough to publish, and I am not sure those three are the right dials.

**The always-on bottom bar.** Fifty-eight pixels of every phone screen, forever, plus the name in the green bar, so that the question is named and the way up is on screen at every depth. That is a content-to-chrome ratio of about 5:1 on his phone, and Nielsen Norman would want the bar to slip away on a downward scroll and return on an upward one. I kept it fixed because the complaint that started this was not knowing where he was after a long scroll, and a bar that has hidden itself at that exact moment is the same bar as none. It costs a strip of every screen, it means the sheet's last answer needs 58px of extra padding to clear it, and if the room shows the track and the question are not worth that strip on the real Round, the hiding version is one line of code away and this direction would still stand.

# As it arrived

**Thesis:** A Round reads in the order people wrote in, as one transcript with each question pinned beside its answer, so the story of the fortnight carries the reading and the questions become the way to move rather than the way to read.

**Designer:** 07 transcript, reading.

**The bet, as given:** THE ROUND IN TIME ORDER. This is the deliberately wild one. A Round reads as one group conversation in the order people wrote, the way a group chat does: the questions are pinned markers along the way, not sections, and "navigate by question" means jumping between pins. It is at odds with the by-question shape everyone else will take, and it may fail; that is the point of it being in the batch. If it fails, say where, honestly, and say what part of it should survive into the others.

## 1. The idea

Open Round 1 of "in the loop" and the first thing after the name is a date: Tuesday 11 August. Under it, Ravi Menon, 9:40 pm, and everything Ravi wrote that evening, one answer after another, each with its question pinned above it like a quoted message in a chat. Then Tara Bhat at 11:02 pm. Then Wednesday, and four more people. Then a lone answer on Thursday afternoon from somebody who came back to finish the two she had skipped. The last person wrote in at 1:14 am on Saturday, seven hours before the Round came out, and the page ends by saying so. You are not reading eleven sections. You are reading the five days it took thirteen people to answer.

That is the bet, and the first honest thing to say is what the data does with it. The composer walks a member through the questions in order and saves each answer as they go, so a member's answers arrive seconds apart, in question order. Sorted by time, a Round is not a group chat where replies interleave. It is thirteen runs, one per person, each run a short letter answering all eleven questions, with the occasional late run from somebody who came back for the ones they skipped. Two people writing at the same hour do interleave, and it happens (three of the thirteen overlap on the Wednesday evening in the real Round), but the shape is arrivals, not conversation. I have designed for what the data does, and the direction is stronger for it: a run is a unit that packs a one-word answer as one line under its pin instead of a three-centimetre tile, and an arrival header prints a person's bird, name and batch once for eleven answers instead of eleven times.

What it bets on: that who came when is a story a group of friends wants, and that the pleasure of reading everybody's answer to "Are you a rider?" in one place can be had from a navigator instead of a section. What it refuses: sections, section headings, a table of contents, question numbers on the page, a row of unlabelled birds, a teaser sentence, and any Back button. What it is not: it is not a chat. There are no bubbles, no left and right, no "typing", and nobody replies to anybody inside the transcript; comments sit under an answer as they do under a post. The thing it most risks resembling is a WhatsApp export pasted into a page, and the arrival header, the paper run, and the pinned question in the house type are what keep it from that.

Where it departs from the architecture's RECOMMENDED lines, and why. 1.2 says a question is "a section of the reader once published" and an answer lives "under its question". Here a question is a pin printed above each of its answers, thirteen times across the transcript, and an answer lives in its author's run. Each noun still has one home; the home of a question is simply not a section. 1.5 asks that the list of questions be one tap away and the current question always named; both hold, through a bottom bar. 1.9's photo wall "prints them as one justified grid": kept, and it is the one place the transcript gathers rather than scatters, because twenty-four photographs want to be seen together and I could not make the bet win that argument. Everything else in Part 1 is kept as written.

If it fails, it fails in three places, named in section 8 and section 7: the punchline questions lose their side-by-side reading, a member who came back later is in two places, and the navigator has to carry more than a section list would. What should survive into the other directions whatever happens to this one: the arrival header with the valley-clock time, the bottom bar that names the question and the person and says how far through you are, the sheet whose rows carry a first line of every answer, and the "Latest" log that replaces Fresh off the press.

## 2. The screens

### 2.1 The list

At 390: the page title "Catch-ups" in Libre Baskerville at h1 (2rem), a Canopy pill "Start a Catch-up" at the right of the same line. Under it, one paper card (16px radius, hairline border, no shadow) holding one row per Catch-up, rows split by hairlines. A row is 76px tall with 16px side padding: line one is the name in the heading face at h3 (1.25rem) with a time at the right end in 12.5px muted ("Sat", "2h", "15 Aug"); line two is the latest event in 14.5px muted, one line, truncated. The row is the link, the whole row. Long press opens the same menu the home's door opens (2.7).

The event line is the row's whole state and it is written as what last happened, because this direction reads everything as a log: "Round 1 came out. 13 wrote in." · "Answers are open until Thursday. You have not written in." · "Tara asked a question." · "Questions are being gathered. 4 so far." · "On hold. Round 2 waits for a Keeper." · "Ended on 2 May." When the line needs you, it starts with a cinnamon dot (6px) and the word that is needed: "Answer by Thursday." A batch Catch-up is told apart by an uppercase 10.5px label under the name, "YOUR BATCH · 39 PEOPLE", in the byline style the app already uses under names.

At 1512: the same card, 640px wide, left edge on the main column's left edge, rows 84px. From 1180px up a 318px rail sits 30px to the right of it under the label "Latest": a log of the last eight events across your Catch-ups, each a row of a 28px bird, one line ("Mohini wrote in to in the loop", "Round 1 of Batch of '11 came out"), and a time. Each row is a link to where the event lives (the reader, the home). No quoted answer anywhere. At 1920 the card stays 640 and the rail stays 318; the page is allowed to be short, and with two Catch-ups it is.

"Archived" is one more row at the bottom of the card, present only when at least one exists, reading "Archived · 1" with a chevron; it opens a page of the same rows. "Recently deleted · 30 days" is the same row's second line when the bin holds something.

### 2.2 Making one, and starting a Round

A people Catch-up: `/catchups/new` is a page in the calm form material, three 56px mist fields with floating labels: "Name", "People" (a search that adds chips: bird, name, ×), "Every" (a three-way choice, fortnight / month / quarter, drawn as one row of three plain text options with the chosen one in Canopy fill, not a pill inside a pill). One Canopy pill at the bottom: "Start". It lands on the home in the collecting state with the questions list empty and the composer open.

A batch Catch-up is never made. It is there on the list from the member's first day, and its home's Now panel on that first day is one line and one button (2.3, state one). Pressing "Start the first Round" opens Round 1 in collecting and lands the member in the same Now panel, now holding the question composer. No people page is ever offered.

### 2.3 The home

Three parts stacked at every width; at 1512 the stack is 680px wide and centred in the main column, so the home and the reader share one measure.

**The head.** The name in Libre Baskerville h1 ("in the loop"), and under it one 14.5px muted line: "Every month · 23 people". The count is the one control and opens the people sheet (2.6). The Catch-up's menu is a "···" at the top right of the head, drawn at cursor size with a 44px hit area for a thumb (2.7). Nothing else.

**Now.** One paper card. Its top line is an uppercase 10.5px label in leaf, "ROUND 2", and under it the Round drawn as a log of three steps down a 2px rule on the left: "Questions", "Answers", "Comes out", each with its dates in 13px muted. The live step has a leaf dot on the rule and opens to hold its content and its one action; the past steps are done in ink, the future ones in muted. The seven states:

1. *No Round yet.* No log. The card holds one line, "A Round is a set of questions everyone answers in the same fortnight, then reads together on the day it comes out.", and one Canopy pill, "Start the first Round". Any member of a batch may press it (1.8, O1 answer one).
2. *Collecting.* The live step is "Questions · until Friday 8 August". Inside it, the questions gathered so far as a plain list, each with its asker's name in 12.5px muted after it ("asked by Tara", or "anonymous"), and under the list the composer: a 12px-radius bordered field, "Ask everyone something", with a text choice under it, "as Ravi" / "anonymously". For a Keeper, two text actions at the right of the step's dates: "Open answering now" and "Give it more time".
3. *Answering.* The live step is "Answers · until Thursday 14 August". Inside: the one Canopy pill, "Answer" ("Finish answering" if you have written some; the line "You wrote in on Tuesday." if you have written all). Under it the roll so far, "9 of 23 have written in", then the nine as 22px bird plus name, in the order they arrived, then "Still to write:" and the fourteen names in muted. A Keeper also gets "Nudge everyone", "Close answering", "Give it more time" as text actions on the step.
4. *Preparing.* The live step is "Comes out · Saturday 15 August, 9 am". Inside: "Answers are in. 13 wrote in." and, for a Keeper, a Canopy pill, "Publish now".
5. *Published, next not yet open.* The log is complete and greyed to one line, "Round 1 came out on 15 August", and under it the cover of Round 1 (2.3's cover, below), the whole cover one tap to the reader. Under the cover: "Round 2 opens on 15 September." If Round 2 is already collecting, the card shows Round 2's log instead and Round 1's cover moves to Before.
6. *On hold (paused).* The same card as whichever state the Round is in, with an uppercase cinnamon label "ON HOLD" beside the Round label and one line under the log, "The next Round will not start until a Keeper says so." A Round already collecting or answering carries on. A Keeper gets "Resume" as a text action.
7. *Ended.* The card holds one line, "Ended on 2 May 2026.", in muted.

A member's home is the Keeper's home without the Keeper's text actions.

**The cover**, one component everywhere it appears (list row's event line excepted, which is a pointer in words): a 16px-radius paper card, 112px tall at 390, one click target. Left, a 56px-wide date stamp in the heading face: the day number at 1.5rem over the month in 10.5px uppercase ("15 / AUG"). Beside it, "Round 1" in 16px semibold, then the roll on one line in 13px muted, "Ravi, Tara, Kabir and 10 others wrote in", then the first two questions as headlines in 13px, truncated. At the right edge, a 56px square: the most-hearted photograph of the Round at 8.8px radius, or nothing. On the list and in a notification it also carries the Catch-up's name above "Round 1".

**Before.** The label "Before" in 10.5px uppercase muted, then the covers of earlier Rounds, newest first. A Catch-up with one published Round shows one cover here only when Now is not already showing it.

### 2.4 The composer

`/answer` is a page. Top: the Catch-up's name as a 13px link (the way up), then "Round 1" in the heading face at h2, then a progress line in 12.5px muted, "3 of 11". The question in Libre Baskerville at h3, its asker under it in 12.5px muted or nothing. A 12px-radius text field, 5 lines tall, growing. Under it a row of two text controls: "Add a photo" (up to 3) and, when the question carries a wall, "Add to the wall" (exactly 1). A pasted link to a song or a video shows its card under the field within a second of the paste (art, title, artist, source), and the sentence keeps the link. Bottom right: "Skip" as text, "Share" as a Canopy pill. Skipping leaves the question for later; the home's Now panel says "Finish answering" until it is done.

The completion card: the hoopoe, "That is you in this Round.", and one line this direction adds because the transcript will show it: "You were the 9th to write in." Then the link "in the loop" back to the home.

### 2.5 The reader

Section 3, in full.

### 2.6 Who is here, and who wrote in

**Who is here** lives behind the count in the head, in the people sheet: at 390 a sheet from the bottom at the large detent, at 1512 a 448px dialog in the dialog material. Title "23 people". A search line at the top when there are more than twelve. Rows of 28px bird, name, and the batch line, ordered this Round's writers first, then your batch, then the rest; the Keeper's row carries the leaf beside the name and the word "Keeper" in 12.5px muted, nothing more. On a people Catch-up the top of the sheet holds "Add someone" (a search) and "Send the link" (the invite URL in a 12px-radius bordered box on Float, with a Copy pill); a row's "···" holds "Make a Keeper" and "Remove", the menu wide enough for its longest label. On a batch Catch-up the sheet is the rows and the search and nothing else.

**Who wrote in** is the roll: names in arrival order with the time each one wrote, drawn with 22px birds. It appears on the Now panel while answering (state three), on the cover as one line of first names, and on the reader's masthead in full (3). Never a count alone, never birds alone.

### 2.7 The menu, the verbs and the dialogs

One door: the "···" on the home's head, and the same door from a list row's long press (phone) or hover menu (desktop). At 390 it opens a sheet at the medium detent; at 1512 a menu in the menu material (Float, 12px, 4px padding, 8px row highlight, opens below the trigger). Its rows, in this order, plain verbs, no icons:

- "Reminders" (opens a three-way row inline: Daily / Last day / Off)
- "Archive"
- a separator, then for a Keeper: "Every month" (opens the rhythm choice), "Hold the next Round" or "Resume", and "End"
- a separator, then "Delete" in red (people Catch-ups only; a batch Catch-up has Archive and no Delete, per 1.6)

Archive acts at once and shows a toast, "Archived in the loop", with Undo. Delete opens a ConfirmDialog: title "Delete in the loop", one line "It goes to Recently deleted for 30 days, then your place in it goes with it.", Cancel and a red "Delete". End opens a ConfirmDialog: title "End in the loop", one line "No more Rounds. Everyone keeps what was published. This cannot be undone.", Cancel and a red "End". Nothing else in Catch-ups opens a dialog.

### 2.8 The batch Catch-up

On the list, the uppercase label "YOUR BATCH · 39 PEOPLE" under the name. On the home, the head's line reads "Every quarter · 39 people, everyone from 2011". Its first day is state one of Now. Its people sheet is read-only. Its menu has no Delete, no rhythm, no Hold and no End, because nobody keeps it: the rows are Reminders and Archive. Round verbs (open answering, nudge, close, extend, publish now) are offered to every member of the batch on the Now panel, as 1.8's first answer proposes.

### 2.9 Archive and delete

Both from the one door. An archived Catch-up leaves the list and stops reminding; it comes back when opened from the Archived row. Delete on a people Catch-up is also how you leave: 30 days in the bin, then the membership goes. The Archived row is the last row of the list card and only exists when something is in it.

### 2.10 Comments on an answer, a song card, a photo wall

Comments sit under the answer's meta row, collapsed to "3 comments" as a 14px text control; opening slides the thread open in place (auto-animate) using the post comments family: a 28px bird, the name in 13px semibold, the text in 14px, a 14px heart, a time; at the bottom the composer pill, "Write a comment", mist-filled, that grows when tapped, with @-mentions. A comment on your answer is a notification that lands on that answer (2.11).

A song card is drawn for the first music or video link in an answer; further links in the same answer get a chip (favicon, title, 12px). The link itself stays in the sentence as a leaf-coloured link. The card: 12px radius (nested in the 16px run), hairline, background at 60% page; 56px art at 8.8px radius on the left, the title in 15px semibold, the artist in 13px muted, and an uppercase 11px source mark "Spotify ↗" or "YouTube ↗"; the whole card opens the link in a new tab. A link that does not resolve is left as the plain clickable link, no skeleton.

The photo wall is a block any question can carry, and in the transcript it is the one gathered thing (3, "the wall").

### 2.11 The notification

Each lands where the state says: "Questions are open in in the loop" opens the home at the Now panel; "Answers are open" opens the composer; "Reminder" opens the composer; "Round 1 of in the loop is out" opens the reader at the top; "Tara commented on your answer" and "Kabir loved your answer" open the reader with `?at=<answerId>`, which scrolls that answer to the reading line, flashes its pin (the press tint fading over 600ms, opacity only), and sets the bottom bar to its question. The notification row is drawn as the cover's short form: the Catch-up's name, the event line, a time.

### 2.12 The empty states

A brand-new member's list holds one row, their batch Catch-up, with the event line "No Round yet. Anyone from 2011 can start the first one." A batch with no Round is state one of Now. A Round with one answer is a transcript of one run: the masthead's roll names one person, the day marker, the run, and the close reads "One person wrote in: Ravi, on Tuesday evening." The bar reads "1 of 1". A question nobody answered has no pin in the transcript and is listed in the sheet with "0" and the words "No one took this one" in muted, not tappable.

### 2.13 The pressure fixture

Section 7.

## 3. The reader, precisely

Everything below is drawn against "in the loop", Round 1, published 15 August 2026, 13 people, 133 answers, 11 questions. The base font is 16px, so the space tokens are: xxs 4px, xs 6px, s 10px, m 16px, l 26px, xl 42px (rounded). The page gutter is the shell's: 20px at 390, so the content column is 350px wide; the run card's 16px padding leaves a 318px measure inside it. Sample answers are invented in the shape of the real ones; no member's words appear here.

### The masthead

At 390 it starts at y=82, 26px (l) under the green bar.

- Line 1: "in the loop", Libre Baskerville, 1.9rem, line-height 1.05, tracking -0.025em, ink. y 82 to 114.
- Line 2, at +10px (s): "Round 1 · 15 August 2026", 14px, muted. y 124 to 144. The middle dot is `metaLine`'s.
- Line 3, at +16px (m): the roll. A 13.5px muted lead, "13 wrote in over five days,", then the names as inline chips that wrap: a 22px bird (`BirdAvatar size={22}`), a 6px gap, the name in 13.5px semibold ink, then the time in 11.5px muted ("Tue 9:40 pm"), chips separated by 14px, line height 28px. At 390 the roll shows the first four arrivals and then a text control, "and 9 others", in 13.5px semibold leaf; tapping it opens the other nine in place (auto-animate). Four chips wrap onto two lines: y 160 to 216.
- Line 4, at +10px: "Times are the valley's.", 12.5px muted italic. y 226 to 242. This is the transcript's one explanation and the reason the hours mean something: a member in San Francisco who wrote in at 3:12 am wrote in at 3:12 am in Rishi Valley.

There is no rule under the masthead and no row of birds. There is no "11 questions" line: the questions live in the bar's sheet, which is on screen from the first pixel.

At 1512 the masthead sits at the top of the 680px transcript column: line 1 at 2.3rem, line 2 the same, and the roll shows all thirteen chips, wrapping onto three lines of 28px, no fold. Line 4 the same.

As you scroll, the masthead simply leaves. It does not collapse into anything. The bar carries the name at every depth (below), and on desktop the rail does.

### The navigator on a phone, resting

It is a bar along the bottom of the screen, present from the top of the page to the end. 52px tall plus the safe-area inset (`padding-bottom: max(0px, env(safe-area-inset-bottom))`, so 86px on a phone with a home indicator), full width, the `.glass` material (translucent paper with backdrop blur), a hairline on its top edge, `position: fixed` (absolute inside the sketch frame). Two zones, split by a 1px hairline 20px tall, centred vertically:

- **Left zone, 112px wide, the way up.** A 12px chevron pointing left in muted, then the Catch-up's name in 13px semibold ink, one line, truncated: "‹ in the loop". The whole zone is a link to the home. This is 1.5's name that "the reader keeps on screen at every scroll depth".
- **Right zone, the rest, the way around.** Two lines, left-aligned with 14px padding. Line one, 13px semibold ink, one line, truncated with an ellipsis: the question of the answer at the reading line. Line two, 11.5px muted: the author of that answer, a middle dot, and the position, "Mohini Rao · 61 of 133". At the right end of the zone a 20px chevron pointing up, in muted, inside a 44px hit area. The whole zone is one button; pressing it opens the sheet.

The reading line is the horizontal line 40% of the way down the viewport. The current answer is the one whose box contains that line, or, in the gap between two, the last one whose top is above it. When the line crosses into a new answer the bar's two lines cross-fade over 120ms (opacity only) to the new question and author. Inside the wall the bar reads "Put up a photograph from this year" over "24 photographs · Kabir Sethi". Above the first run (in the masthead) it reads "Round 1" over "13 wrote in · 11 to 15 August".

### The navigator on a phone, open

Pressing the right zone slides a sheet up from the bottom over 280ms on `EASE_IN_OUT_SCENE` (it is a viewport-scale move; `transform` only). The bar stays under it. The sheet is Float white, 20.8px radius on its top corners (the floating-modal radius, because this is the one floating surface in Catch-ups), a hairline border, the layered ink shadow, and a grabber, 36x5px, muted, 8px from the top. Its height is the height of its list up to 70% of the viewport (590px at 844); for this Round the list fits at 548px, so nothing inside scrolls. A Round with forty questions scrolls inside the sheet and the grabber drags it to the large detent (92%). The sheet is nonmodal: no backdrop, and the page under it still scrolls; tapping the page, dragging the sheet down, or pressing the bar's chevron (now pointing down) closes it, 200ms out.

Inside, 20px padding: a title row, "11 questions" in Libre Baskerville at 1.25rem, then the questions as rows. A row is the number in 12.5px muted tabular figures ("1", right-aligned in 22px), the question in 14.5px ink, leading 1.35, up to two lines then an ellipsis, and the count at the right end in 12.5px muted ("13"). One-line rows are 36px, two-line rows 56px. Anonymous questions carry nothing extra; a question with an asker shows "asked by Tara" under it in 11.5px muted only inside the expanded state below. The current question (the one in the bar) is in semibold with a 2px leaf marker on its left edge, the same marker and spring the sidebar uses. A question with no answers shows "0" and "No one took this one" in place of its second line, and does not respond to a press.

Pressing a row expands it in place (auto-animate) and folds the other rows away above a "‹ All questions" text control at the top: the question in full, its asker line, and then its pins, one per answer, in transcript order. A pin row is 44px: a 28px bird, the name in 13px semibold, and after a 10px gap the first line of that answer in 13px muted, truncated; at the right end the time in 11px muted ("Tue 9:41 pm"). For the forty-answer question this list is forty rows and scrolls inside the sheet; for the one-liner questions the first line is the whole answer, so the sheet reads as the list of punchlines, which is the reading those questions want and the transcript alone cannot give.

Here is how the songs question reads in it, invented answers, real shape:

> **5** Songs you've had on repeat lately · 13
> Ravi Menon · Been living inside this one: open.spotify.com/track/5b3Q… · Tue 9:44 pm
> Tara Bhat · Ilaiyaraaja, the whole of Mouna Ragam, on the bus · Tue 11:07 pm
> Kabir Sethi · youtu.be/aQx9… ("I just want to see if the covers show up") · Wed 8:15 am
> Nina Rao · nothing new, same three Big Thief songs since March · Wed 8:19 am
> … nine more

Pressing a pin closes the sheet, jumps the page so that answer's pin sits at the reading line (an instant jump, never a 30,000px smooth scroll), flashes that pin with the press tint fading over 600ms, and puts the bar into its **lens**:

- Line one becomes "‹ Songs you've had on repeat lately ›", the arrows in 44px hit areas at each end of the zone, ink.
- Line two becomes "4 of 13 · Nina Rao" and, at the right end where the chevron was, an "×" in a 44px hit area.
- "›" jumps to the next answer to this question in transcript order, "‹" to the previous, each with the same jump and flash. Ordinary scrolling keeps working, and the counter follows whichever of that question's answers is nearest the reading line.
- "×" drops the lens and returns you to the answer you were reading before the first jump, flashing its pin. That is Apple Books' return arrow, folded into the close. Pressing line one while the lens is on reopens the sheet at that question.

Pressing any pin in the transcript itself (below) does the same thing as pressing a pin row, without opening the sheet: the lens engages on that question at that answer.

### The desktop plan

At 1512 the main column is 1264px wide with 40px padding, and the transcript is a centred spread of 1028px: a 680px transcript column, a 30px gutter, a 318px rail, with 78px of margin either side. The measure inside a run card at 680 is 648px, about 88 characters at 15px, which is the widest I will let a transcript run. Below 1180px the rail goes and the phone's bar and sheet take over, at the bottom of the window.

The rail is `position: sticky; top: 32px`, with `max-height: calc(100vh - 64px)` and its own scroll, no card, text on the page:

1. The way up: "in the loop" in 15px semibold ink, a link to the home, and under it "Round 1 · 15 August 2026" in 12.5px muted.
2. At +26px, the label "In this Round" in 10.5px uppercase muted, tracking 0.16em, then the eleven questions as rows: 13px, leading 1.35, up to two lines, the count in muted at the right, 6px vertical padding, a 2px leaf marker on the current one animated with `NAV_MARKER_SPRING` on `translateY`. No weight change on the current row (the bold-and-reflow finding in the recon): the marker and ink instead of muted do the marking. Clicking a row engages the lens on that question at its first answer and unfolds the row's pins beneath it, 24px each (a 20px bird, name, time), the current one in ink, with "‹" and "›" in 28px hit areas beside the question and a "Back to where I was" text control under the pins while a lens is on.
3. At +26px, "Arrived" in the same label style, then a disclosure line, "13, Ravi first and Devika last ›", which opens the thirteen names with their day and time; clicking a name jumps to that person's run. This is navigation by person, which a transcript can afford and a sectioned reader cannot.

Hearts, comments and the pins in the transcript behave as on the phone. The bar does not exist at 1512.

### A question's heading

There is none. A question is a **pin** above each of its answers:

- A 3px cinnamon rule on the left, full height of the pin, 2px radius.
- 10px padding-left, 2px padding top and bottom; the hit area grows to 44px with negative margins the way `GuideDoor` does.
- The question in Source Sans 3, 13.5px, leading 1.35, semibold, muted-foreground, full text, wrapping (a 300-character question wraps to five lines at this size on a phone and is left to).
- No number, no asker, no glyph. The question is not a heading, so it is not in the heading face; this is the break named in section 4.
- It is a button: hover is the state layer, focus the leaf outline, press the sink; pressing engages the lens (above). A pin is exactly the chat idiom of a quoted message above a reply, and every member already reads that grammar.

### The answer tile, in four states

An answer has no tile. It is a block inside its author's **run**, and the run is the tile:

The run is a paper card, 16px radius, hairline border, no shadow, 16px padding, full width of the column. Its header is an `IdentityRow` at avatar size sm (40px): the bird linked to the profile, the name in 16px semibold ink linked to the profile, the batch line under it in the byline style ("BATCH OF '11", 10.5px uppercase), and at the right end the time of the run's first answer in 12.5px muted ("9:40 pm" at 390, since the day marker above already names the day; "Tue 11 Aug, 9:40 pm" at 1512). A run that is one person's return days later gets its own header and its own day marker, and its time line adds "came back" in muted: "Thu 4:12 pm · came back".

Answers stack inside the run separated by 16px (m), each answer being: the pin; at +8px the body; at +6px the meta row. Consecutive answers from one person are one run; a run ends when the next answer in time order is somebody else's.

1. **Text only.** Pin, then the body in 15px, leading 1.7, ink, `whitespace-pre-wrap break-words`, rich text rendered (emphasis, mentions, links as leaf). Then the meta row: the `LoveButton` at md (18px heart, count beside it) pulled 10px left so the heart's glyph sits on the padding edge, then "3 comments" in 14px muted as a text control, 16px apart. A one-word answer is pin (one line, 18px), body (one line, 25px), meta (30px): 81px, and nothing else. An emoji-only answer sets its body at 1.75rem with leading 1.2, because a reply that is only a face is bigger in every chat, and it costs nothing. A 2,000-character answer is about 45 lines at 318px, 1,150px on a phone, unclamped; the bar names its question and its author the whole way down.
2. **With one photograph.** Pin, body, then at +10px the `PhotoFrame`: a square-or-wider photograph at its true shape across the 318px measure, 12px radius; a tall one brought to 3:4 on its blurred bed, so 318x424 at 390, and at 1512 capped by the 500px height ceiling (a 3:4 draws 375x500 in the 648px measure, the bed either side). The whole photograph opens the viewer. Then the meta row. A caption longer than four lines shows four and "More".
3. **With three photographs.** Pin, body, then the `PhotoCarousel` (the rule for more than two), which interpolates its frame height between neighbours as you drag, so two portraits then a landscape shrink under the finger rather than snapping; opening any one enters the viewer at that index. Then the meta row.
4. **With a song link.** Pin, body with the link left in the sentence as leaf text, then at +10px the song card (2.10), then the meta row. A link that fails to resolve is only the link.

A run of eleven answers with one photograph and one song is, at 390, roughly 16 + 40 + 16 + 10 x 81 (one-liners) + 424 + 90 + 32 = about 1,450px, under two screens for a whole person. The real Round's longest run, with three photographs and a 2,000-character answer, is about 3,100px.

### The wall

A question that carries a wall does not scatter into runs. It is drawn once, as its own block in the transcript, at the time its first photograph arrived, with a day marker above it if that day has not been marked yet: a header line in 15px semibold, "The wall", and under it the question as a pin, then a `PhotoStream` of every photograph in arrival order in justified rows (two per row at 390, the last row short at the target height; three or four per row at 1512), each photograph opening the viewer on the whole wall, each with a 22px bird and name under it in 12.5px and a heart at sm on the same line. In the sheet, the wall question's pins are its photographers, and pressing one jumps to the wall and flashes that photograph's frame (a 2px leaf ring, 600ms). The real Round has no wall question; the pressure fixture's wall of 24 is section 7.

### The day marker

Between runs, whenever the calendar day changes: a centred pill, mist fill, 24px tall, 12px side padding, "Wednesday 12 August" in 11.5px semibold uppercase, tracking 0.08em, muted-foreground. It is not a control. 26px (l) above and below. Five appear in the real Round.

### The comments

Collapsed: "3 comments" in the meta row, a text control in 14px muted; "Comment" when there are none. Open: the thread slides open under the meta row inside the run (auto-animate), indented 0 (the run's padding is the indent), rows 12px apart: a 28px bird, name in 13px semibold, the comment in 14px leading 1.5, then a 20px meta line with the sm heart and a time-ago in 12px muted; replies indented by 28px. At the bottom the composer pill, "Write a comment", mist fill, full width, that becomes a 12px-radius field with an ArrowUp send button when focused, never focusing itself on open. One thread stays open until closed; opening another does not close it.

### The heart

The shared `LoveButton`, md, red `#E03A33`, the pop and three flecks, optimistic. The count sits beside it in 14px. The builder's one instruction: the action must not `revalidatePath`; the transcript renders 133 answers on the server and a heart must never rebuild it (recon §8).

### The way back, from any depth

On a phone the bar's left zone, "‹ in the loop", at every pixel of the page. On desktop the rail's first line, sticky. Nothing at the bottom of the page is needed for it, and there is no Back button.

### The end of the Round

After the last run, 42px (xl) of space, then a centred block on the page, no card:

- A day-marker-style pill, "Saturday 15 August, 9:00 am".
- "That was Round 1." in Libre Baskerville at 1.5rem. (The page's one line of feeling, spent here, on a title, as the dial allows.)
- At +10px, in 14.5px muted, centred, max 36ch: "13 wrote in over five days. Ravi was first, on Tuesday evening. Devika was last, at 1:14 am on Saturday."
- At +16px: "Round 2 opens on 15 September." in 14.5px ink. If Round 2 is already collecting: "Round 2 is gathering questions now." and under it a Canopy pill, "Ask a question", to the home's Now panel. That is the forward motion Letterloop's closing line gives and the one control at the end of the page.
- Then the safe-area padding so the bar never covers it.

### The first screen at 390

y 0 to 56: the green bar. y 82 to 242: the masthead as above, with the roll's four chips (Ravi Menon Tue 9:40 pm, Tara Bhat Tue 11:02 pm, Kabir Sethi Wed 8:15 am, Nina Rao Wed 8:19 am) and "and 9 others". y 268 to 292: the day marker, "TUESDAY 11 AUGUST". y 318: the first run card begins. Inside it: Ravi Menon's header (bird, name, BATCH OF '11, "9:40 pm"), y 334 to 374; the first pin, "What is a fun thing you did this summer?", one line, y 390 to 408; the body, invented: "Took the night train to Kanniyakumari on a whim, watched the sun come up off the rocks, then slept fourteen hours in a lodge with a fan that did not work.", three lines, y 416 to 492; the meta row (heart, 4, "2 comments"), y 498 to 528; the second pin, "Something new you did recently that you did not think you would do.", two lines, y 544 to 580; the second body beginning, "Learnt to drive. At thirty-three. My father sat in the passenger seat the whole first week and said nothing, which was worse than…", running under the bar. y 758 to 844: the bar, reading "‹ in the loop" and "What is a fun thing you did this summer?" over "Ravi Menon · 1 of 133", the chevron up. One complete answer, the start of a second, the whole roll's first four names, and the date, on the first screen. Today's page shows zero complete answers there.

### The first screen at 1512

The Canopy sidebar, 248px, Catch-ups lit. The spread centred in the main column: from x=326, the 680px transcript; from x=1036, the rail. Masthead at the top of the transcript column: "in the loop" at 2.3rem, "Round 1 · 15 August 2026", the roll's thirteen chips over three lines, "Times are the valley's." Then the day marker and the first run, Ravi's, showing at 982px tall about four complete answers (the measure is wider, so bodies are two lines instead of three). The rail: "in the loop" over "Round 1 · 15 August 2026"; "IN THIS ROUND" and the eleven questions with counts, the leaf marker on question 1; "ARRIVED" and "13, Ravi first and Devika last ›". No bar.

### A mid-scroll screen at 390, deep in question 5

Somewhere around y=19,000 of a 42,000px page, inside Nina Rao's run on Wednesday morning. The green bar at the top. Under it the tail of Nina's fourth answer, "Are you a rider? Are you seeing someone?", its body two lines ("No and no, and I am at peace with exactly one of those."), its meta row. Then the fifth pin, "Songs you've had on repeat lately", then the body, "nothing new, same three Big Thief songs since March, this one most: https://open.spotify.com/track/2xKw…" with the link in leaf, breaking after the slash, then the song card: the art, "Not", "Big Thief", "SPOTIFY ↗". Then the meta row, heart 7, "1 comment". Then the sixth pin beginning, "Do you think your life looks like you thought it would since you left rv? What's different?", two lines, and the first lines of a long answer running under the bar. The bar: "‹ in the loop" and "Songs you've had on repeat lately" over "Nina Rao · 61 of 133". If the reader had arrived here through the sheet, the bar would instead read "‹ Songs you've had on repeat lately ›" over "4 of 13 · Nina Rao ×". Either way the question is on screen twice, in the pin and in the bar, and the person once, in the bar, however far Nina's run has scrolled.

## 4. The design system, kept and broken

Kept by default: the palette entire (D3); Libre Baskerville for the name, the Round title, the sheet's title and the close, Source Sans 3 for everything else; the radius ladder (16px runs, 12px photographs, song cards and fields inside them, 8.8px art and thumbnails, pills for every control, 20.8px only on the sheet, which is a floating surface); the surface ladder (page, paper runs, mist day markers and the comment pill, Float for the sheet, the people sheet and the menu; no pure white anywhere else); the state layer for every hover and press; the three focus treatments; the dialog and menu materials, unchanged; `LoveButton`, `IdentityRow`, `BirdAvatar`, `PhotoFrame`, `PhotoRows`, `PhotoCarousel`, `PhotoStream`, the viewer, the comments family, the house shimmer for loading, never the grey pulse (the masthead's two lines and three run-shaped blocks); the curves from `motion.tsx` and nothing hand-typed; only `transform` and `opacity` animate; hover never moves a control; the phone rules (safe-area padding, 44px hit areas, no uninvited keyboard, one state change per tap); the byline at 10.5px, left as the file says.

Broken, and why each break is the point (D36):

1. **A question is not a heading.** The type scale gives a section heading Libre Baskerville at h2. Here a question is set in the body face at 13.5px semibold, muted, inside a cinnamon-ruled pin, thirteen times across the page. If it were a heading it would make thirteen sections of one question, which is the by-question reader turned inside out. The pin's whole job is to be read past.
2. **Emoji-only answers at 1.75rem.** No step on the scale sits between h1 and h2, and this one does. A reply that is one face is bigger than the text around it in every chat on earth, and a transcript that set "🫠" at 15px would be the one place the grammar failed.
3. **A bottom bar and a bottom sheet.** The shell has a top bar and a sidebar; nothing in the app fixes anything to the bottom of a phone, and nothing opens a sheet with a grabber. This is the Action Button surface (¶42): it takes its material from the system (glass, Float, the floating-modal radius, the sidebar's leaf marker and spring) and is still the one thing on the site that lives at the thumb. The audit's `aria-modal` rule is not tripped: the sheet is nonmodal and says so.

The one thing on screen that could only be this app: the roll, on the masthead and at the close. Thirteen names in the order they wrote in, each with its bird and its hour on the valley's clock, read like the roll call at assembly, and "Times are the valley's" is the only sentence that explains it. No other product has a reason to print who came first, and this one has a school behind it.

## 5. Letterloop, closed and open

| # | Letterloop has | This direction |
|---|---|---|
| L-a | comments with @mentions | closed: the post comments family under each answer, mentions included |
| L-b | a Music section with a card | closed: any pasted music or video link, on any question, becomes the card under the answer; the sentence keeps the link |
| L-c | a Photo Wall section | closed: the wall block on any question, gathered once in the transcript, justified rows, attributed |
| L-d | "the next issue arrives on" | closed: the close of the Round and the Now panel both say when Round 2 opens |
| L-e | a reaction picker | open on purpose: one heart, the app's one reaction |
| L-f | reply progress | closed: the roll on the Now panel while answering, "9 of 23", names and who is still to write; and "You were the 9th to write in" on the completion card |
| L-g | reminders | already there, behind the one door |
| L-h | the Album | open on purpose: a transcript is a Round's shape, not a Catch-up's, and the Album is Before's job in some other direction |
| L-i | Download PDF | track M |
| L-j | Mementos | open |
| L-k | themes | no |
| L-l | filter by member, sort replies | closed differently: the transcript is one sort, by time; "Arrived" in the rail jumps by person; the lens walks one question |
| L-m | a banner and a logo per loop | open: the cover's 56px most-hearted photograph is the only derived picture |
| L-n | roles | one role, Keeper |
| L-o | Home quick actions | closed: the list row's event line, in words |

## 6. Live and static

Must be genuinely tappable and scrollable in the S4 room, on a phone, on the real Round and on the pressure fixture:

- the bar: it must track the reading line as the page scrolls, and its left zone must go home;
- the sheet: open from the bar, list the questions with counts, expand a question to its pins with first lines, jump to a pin;
- the lens: the "‹ ›" stepping, the counter following the scroll, the "×" returning to where you were;
- the pins in the transcript as buttons that engage the lens;
- the rail at 1512: scroll-spy, the marker, click-to-lens, "Arrived";
- the hearts (optimistic, no page rebuild) and one comment thread opening in place;
- the `?at=` landing with the flash.

May be a static composition: the masthead's roll fold, the day markers, the song card (with a fixed art), the photographs (the viewer already exists), the close of the Round, the whole of the home in its seven states, the list and its Latest rail, the composer, the people sheet, the menu and the two dialogs, the notification rows.

## 7. Under pressure

- **One answer.** One day marker, one run of one answer, the roll names one person, the close says so. The bar reads "1 of 1". Looks like a page, not a mistake.
- **Forty answers to one question.** In the transcript they are forty pins across forty runs, which is the bet's weakest showing: no reader will step "›" forty times. The sheet is the rescue, and it is a real one: forty rows of bird, name and first line, and for "Describe your month in three words" the first line is the answer, so the sheet is the reading. The sheet scrolls inside itself at the large detent. The rail at 1512 shows the forty pins in its own scroll.
- **A 6,000-character answer, and the 9,000 one over the cap.** About 133 lines, 3,400px, four screens at 390, unclamped, in the ink of its run; the bar names its question and its author on every one of those screens, which is the whole answer to ¶11. Not collapsed (Wikimedia's cost), not truncated.
- **A 24-photo wall.** One gathered block: twelve rows of two at 390, about 2,300px; six rows of four at 1512. In the sheet, 24 photographer rows. The wall is the only place the transcript breaks its own rule, and the pressure fixture is where that shows: 24 runs each holding one photograph would have been unreadable.
- **A 300-character question.** In the pin, five lines at 13.5px on a phone, and it is left to wrap, because a pin that truncated the question would fail the one thing a pin is for. In the bar, one line and an ellipsis: the bar is a name, and the sheet shows it whole, which is where a reader who needs the rest goes.
- **A 78-character name.** The run header wraps the name to two lines and the time drops under it; the chip on the roll wraps; the bar's line two truncates the name after the position count, "23 of 133 · Padmanabhan Venkataraghavan Subram…", the count first so it survives. The sheet's pin rows truncate the name at 40% of the row and keep the first line.
- **An emoji-only answer.** 1.75rem, one line, in its run; "😭😭😭🐦‍⬛🌳🫶🏽✨" is 210px wide at 390 and fits.
- **A pasted 123-character link.** `break-words` on the body, the link clickable in leaf, and a song card under it if it resolves; the unresolvable Spotify id in the fixture stays a link and draws no skeleton. The page never widens, which is the green-bar bug closed at its root.
- **A Round nobody answered.** The masthead prints "No one wrote in." in place of the roll, no "Times are the valley's", no day marker, no runs, no bar; the close says "Nobody wrote in to Round 2." and when Round 3 opens. The transcript hides nothing here because there is nothing.
- **A question nobody answered, in a Round others did.** This one the transcript does hide: no pin anywhere on the page. The sheet lists it with "0" and "No one took this one", and that is the only trace. A by-question reader prints the question and an empty line; this direction cannot, and says so.
- **Two people answering at once, and one who came back.** Runs split wherever the author changes, so a Wednesday-evening overlap becomes Kabir, Nina, Kabir, Nina, four short runs with four headers, which is true and a little noisy. A member who came back on Thursday for two skipped questions is two runs two days apart; the second header says "came back". Both are the bet being honest rather than tidy.

## 8. The two things I am least sure I got right

**Thirteen letters, not a conversation.** The bet imagined a group chat, and the data gives arrivals: thirteen runs, each one person's whole reply, because the composer saves one question at a time in order. I chose to design for the arrivals and let the story of the fortnight (who came first, who came at 1 am, who came back) carry the reading, and I think a group of people who were at school together will feel that story. But the pleasure Letterloop sells, and the one his question list is written for, is reading everyone's answer to "Are you a rider?" in one place, and here that costs a press on the bar and a press in the sheet for every question, eleven times a Round. If he opens the sketch and reaches for the fifth question's answers before he reaches for Ravi's evening, the bet has lost on its own ground, and what should be lifted out of it is the roll with its hours, the bar that names the question and the person with a position count, and the sheet whose rows carry a first line.

**The navigator carries four states, and a section list carries one.** Resting, open, expanded to pins, and the lens with its return: four things one control has to teach in a first minute, on a phone, to a member who opens Catch-ups twice a month. Each state follows from the last and none of it is new grammar (a bar, a sheet, a quoted message, a find bar with arrows), and the one-liner questions read better in the sheet than they would on any page. But "intuitive" is his word for the bar, and a navigator that needs a paragraph to describe is a navigator that may need a paragraph to learn. If it does, the lens is the part to cut: keep the bar and the sheet with its pin rows, and let a pin row simply jump, with no stepping and no return.

# You land in the Round

**Thesis:** A Catch-up opens on its newest Round, printed as one sheet of paper whose masthead folds up into the green bar, so the page you read is the page you navigate from, and the name at the top of it is the only way up.

**Designer:** 01 front-door, reading.

**The bet, as given:** THE READER IS THE FRONT DOOR. You land in the newest Round. The Catch-up's home is one move up from the reader, not the other way round, and the list is short because the reader does the work. Everything else (people, settings, the Rounds before) is a door off the reader. Paragraph 18 of the brief calls landing in the finished Round "a nice thought" and faults only the missing way back; your job is to make that thought whole.

## 1. The idea

Tap Catch-ups and you are reading. Not a page that tells you a Round exists, not a tile with one live link in it, not three buttons: the Round that came out most recently, with a whole answer on the first screen of a phone. The reader is the front door because reading is what nine visits in ten are for. Everything a member might want instead is one door off the reader, and there are four doors: the name (up to the home), the writers (the people sheet), the bar (the contents), and the end of the Round (what comes next, and the Rounds before).

The Round is printed as one sheet of paper. On a phone the sheet runs the full width of the screen and the page background never shows. On a laptop it is a 760px column of paper with 16px corners, standing on the page beside a rail. There are no answer cards on it. An answer is a bird, a name, a batch line, the words, the pictures if there are any, a heart, and the space after it. A hundred and thirty-three boxes is a feed. A hundred and thirty-three answers on one sheet is an issue, which is what a Round is. This is also the honest fix for the three-centimetre tile that is 15% words: there is no tile to be empty. A one-word answer costs two lines and a heart.

The masthead folds up into the green bar. At the top of the sheet the masthead prints the name of the Catch-up, the Round and its date, who wrote in, and what is coming next. Scroll, and as the name passes under the green bar the bar's contents cross-fade: it keeps its menu button and gains the Catch-up's name in capitals, the question you are in, and a row of eleven notches, one per question, the current one taller. That bar is the spine of the issue. Tap it and the contents rise as a sheet: the Catch-up as its first row, which is the way up, then every question with its count, the current one marked. No chip row, no bar of pills, nothing that scrolls sideways, and no chrome added to the phone that it did not already have. The green bar is 56px and it stays 56px; the reader borrows it.

The way up is the name. It is the first thing on the sheet, the first row of the contents, the top of the rail on a laptop, and the last thing at the end of the Round. Tapping it lands on the home, which is one move up and short: the head (name, rhythm, the people count, the door), Now (the Round in the making, in one of seven states), and Before (a shelf of covers). Nobody scrolls a week to get anywhere.

What it refuses. It never draws a Round twice on one screen. It never prints a teaser sentence. It never numbers a question on the page, only in the bar and the contents, where the number is a place. It never disables the scroller, never collapses a question, never puts a lifecycle verb on the sheet. It does not paginate: a Round is one scroll with a spine, because a swipe-per-question reader would make the forty-answer question a wall you cannot leave sideways.

What it is not. The thing it most risks resembling is a forum thread, or a comments page under an article: long, many authors, no boxes. Three things keep it from that. The masthead is a masthead, set in Libre Baskerville with the writers as birds under their names, and it folds into the bar rather than scrolling away. On a laptop the birds hang in the sheet's left gutter beside the text, like margin portraits, and the questions hang out further still, which a thread never does. And the packing changes with the content: one-liners pack two to a row on a laptop, a tall photograph gets a 3:4 frame on a bed of itself, three photographs pack into justified rows at the measure. The second risk is a Substack post, and the answer to that is that there is no post: the masthead is the author line for thirteen people at once.

Where it departs from the architecture's RECOMMENDED lines, and why:

- 1.5 says the name is the way up at every depth. On a phone, at depth, the name is on the bar but the bar is one tap target that opens the contents, and the name row at the top of the contents is the move. Two taps from depth, not one. The bar is one target because a 56px bar with two side-by-side hit zones on a 390px phone mis-taps; and the first tap is never wasted, because the contents also answer "where am I". On a laptop the rail's name is the move directly.
- 1.3 allows the home in "published, waiting" to be the Round itself. This direction never does that: the reader is the Round's only home, and the home's Now shows the cover. Landing in the Round is the front door's job, not the home's.
- 1.3 says the Round while it is being made lives on the home's Now panel. It does. But the reader's masthead carries the Round's state in one line with at most one button ("Round 2 is open until Sunday. Answer."). That line is a pointer to Now, in the sense 1.4 gives the word, and it is the price of landing in the previous Round while the next one is collecting or answering.
- 1.4's cover carries a derived picture here: the most-hearted photograph of the Round, when the Round has one. A Round with no photographs gets a type-only cover, and the shelf is allowed to be uneven, the way a shelf of issues is.

## 2. The screens

### 2.1 The list

`/catchups`. It is a shelf of covers, and a cover is the whole row.

At 390: the page title "Catch-ups" in the app's heading style, with one Canopy pill at the right, "Start a Catch-up". Below it, stacked with `--space-m` between, one cover per Catch-up you are in, newest activity first. A cover is a paper sheet (`#F5F2EA`, 16px radius, `card-elevated`), padded `--space-m`, and prints, top to bottom:

1. The Catch-up's name, Libre Baskerville 22px, one line, ellipsis at the end if it must. Beside it, when it is a batch Catch-up, nothing: the name is "Batch of 2011" and the next line says who is in it.
2. The state line, 13px Source Sans 3. Leaf-coloured when it wants something from you, muted when it does not. "Round 2 is open until Sunday · 9 of 23 have written in." "Round 2 is gathering questions until Thursday." "Round 2 comes out Tuesday at 9am." "Round 2 opens on 15 September." "On hold." "Ended 3 March 2027." For a batch Catch-up with nothing yet: "No Round yet · everyone from 2011 is in."
3. The cover of the newest published Round, which is the same component the home and the notification use (1.4). If the Round has a photograph, its most-hearted one runs across the top of this block at 3:2, `--radius-md` 12px, 318px wide by 212px on a phone. Then "ROUND 1 · 15 AUGUST 2026" in the 10.5px capitals byline style. Then the writers strip: four 28px birds at a 64px pitch with each person's first name under it in the same capitals, and a fifth disc in mist reading "+9" with "OTHERS" under it. Then three questions as headlines, Libre Baskerville 15px, one line each, and "and 8 more questions" in 13px muted.

Tapping anywhere on the cover opens the reader of that Round. If the Catch-up has no published Round yet, the cover block is replaced by one line of the Now state and the tap opens the home. Long-pressing the cover on a phone opens the door (2.7). Nothing else is on the cover: no View, no dots, no birds without names.

At 1512: the same covers, 560px wide, two abreast in a grid with a `--space-l` gap, left-aligned, and the page is short. On hover the cover takes the state layer and a "..." control appears at its top-right corner (the one place dots live), which opens the same door. At 1920 the covers stay 560px; three fit in a row and two leave a gap, and that gap is allowed. Nothing stretches.

The Archived row: present only when at least one Catch-up is archived or binned. One text row at the bottom, `--space-xl` below the last cover, 14px muted: "Archived (1) · In the bin (1, 30 days)". Tapping opens a plain list of names on a page; opening one brings it back, with a toast.

### 2.2 Making one, and starting a Round

A people Catch-up starts at `/catchups/new`, which keeps the centred column. Three things on it, no rules between them: a name field (the 12px bordered input, "What is this called?"), a people field (search by name, chosen people appear as identity rows beneath it with an x on hover, never as chips), and the rhythm as three radio rows, "Every two weeks", "Every month", "Every three months", with monthly ticked. One Canopy pill at the end, "Start". The "+ Everyone from 2023" chip is gone, because the batch Catch-up exists on its own (2.8) and the chip was how the wrong one got made. "Start" lands on the home in the collecting state with the question composer open, and the Catch-up appears on the list with the state line "Round 1 is gathering questions until Thursday."

A batch Catch-up's first Round starts from its home. Now says what a Round is and offers one pill, "Start the first Round", to any member. Pressing it opens Round 1 in collecting and turns Now into the question composer. It never goes near a people page.

### 2.3 The home

`/catchups/[id]`. One move up from the reader. Three parts, top to bottom on a phone; on a laptop the head spans the width, Now takes a 760px column, and Before stands beside it in a 320px column.

**The head.** The name, Libre Baskerville 34px at 390 and 40px at 1512, printed as the member typed it, no suffix. Under it, one 14px line: "Every month · 23 people". The count is the one control that opens the people sheet; it is underlined on hover, and it is the whole of the people preview. At the right of the name, a "..." control, the door (2.7). For a batch Catch-up the line reads "Every three months · everyone from 2011 · 39 people". Nothing else in the head.

**Now.** A paper sheet, the same paper as the reader, 16px radius, padded `--space-l`, holding the Round in the making. It branches on the Round's state and nothing else. The copy below is the copy on screen.

1. *No Round yet.* Title (serif 22px): "No Round yet." One line: "A Round is a handful of questions everyone answers in the same week, then reads together." One pill: "Start the first Round". On a people Catch-up this state does not occur; creating it starts Round 1.
2. *Collecting.* Title: "Round 2 is gathering questions." Line: "until Thursday 10 September." Then the questions so far as a list, each in Libre Baskerville 17px with the asker under it as a 13px identity line ("asked by Karan Bhat", or "asked anonymously"), a Keeper's rows carrying a drag handle at the left and an x at the right. Under the list, the ask composer: a textarea ("Ask everyone something"), a text toggle beneath it reading "Asking as Aditi · ask anonymously instead", a text link "From the library", and a pill, "Ask". For a Keeper, at the foot of the sheet, one text button: "Open answering now". It is the second thing on the page, not the last.
3. *Answering.* Title: "Round 2 is open." Line: "Answers close Sunday 13 September." One pill: "Answer", or "Continue · 3 of 11 answered" once you have started. Under it, the writers strip as in the cover, but with every writer shown (28px birds with first names, wrapping), headed "9 of 23 have written in", and one text line beneath: "Still to write: Karan, Meera, Rohan and 11 others", which opens the people sheet on that section. For a Keeper, a row of three text buttons: "Nudge everyone · Extend by a week · Close early".
4. *Preparing.* Title: "Round 2 comes out on Tuesday 15 September at 9am." Line: "Nobody can read the answers until then, not even the Keeper." Under it, a block of the warm shimmer the exact shape of a cover, standing in for the one that is coming. For a Keeper, one text button: "Publish now".
5. *Published, waiting.* The cover of the Round that just came out, exactly as on the list, with one line beneath the sheet: "Round 2 opens on 15 September." Tapping the cover opens the reader. The Round is never drawn here.
6. *Paused.* The Now sheet as it was in its current state, with a leaf-tinted line across the top of it: "The next Round is on hold." A Round already collecting or answering finishes on its own; the hold is on the clock between Rounds. A Keeper sees "Resume" as a text button at the end of that line. Nothing is hidden.
7. *Ended.* Title: "Ended on 3 March 2027." Nothing else in Now.

**Before.** A 10.5px capitals label, "ROUNDS BEFORE", then the covers of every published Round except the one Now is showing, newest first, stacked with `--space-m` between. On a Catch-up with one Round it is one cover, or nothing, and the page ends. Nothing is written for the empty case; the label is simply absent.

### 2.4 The composer

`/catchups/[id]/answer`. It keeps the shape that works: one question at a time, a progress line on a laptop and a slim bar on a phone, autosave on blur, Skip and Share. The top line names the Catch-up ("in the loop", the way up) and the place: "Round 2 · 3 of 11". The progress rail no longer holds two glyphs and 500px of nothing: it is the list of questions, the answered ones ticked, the current one marked.

Under the textarea, one row of two text buttons: "Add a photo" (up to three) and nothing else, because a song does not need a button. Paste a link anywhere in the text and, a second later, the card it will print as appears under the textarea: art, title, artist, the source. If the resolver fails, nothing appears and the link stays a link. A second link gets a chip under the first card. There is a way to say no card: a small x on the card, which keeps the link and drops the preview.

A photo-wall question asks for one photograph and one line. Its composer is a photo well the width of the column ("Add your photograph") with a single-line caption field beneath, and Share. The completion card stays: the hoopoe, "That is you in Round 2.", "It comes out on 15 September.", and the name as the way back.

### 2.5 The reader

The surface the sketch room draws. Section 3 has all of it: the masthead and how it folds into the green bar, the bar and its contents sheet at rest and open, the laptop plan with its rail, a question's heading, the answer in four states and two packings, comments, the heart, the way up, and the end of the Round, then the first screen and a mid-scroll screen at 390 and the first screen at 1512.

### 2.6 Who is here, and who wrote in

Two questions, two places.

Who wrote in lives on the Round. On the cover and the masthead it is the writers strip: 28px birds at a 64px pitch, first name under each in the 10.5px capitals byline style, the first four then a mist disc with "+9" and "OTHERS". Tapping the strip opens the people sheet on its "Wrote in" section. On the home's Now while answering, the strip shows everyone who has, wrapping, under "9 of 23 have written in", with "Still to write" beneath as names. On every answer it is the identity row, bird beside name beside batch. A bird never appears without a name, and a count never appears without names beside it.

Who is in this lives one level down, behind the count in the home's head, and behind the writers strip. The people sheet: a bottom sheet on a phone, a Float dialog on a laptop, 20.8px radius, the title being the Catch-up's name. When the roster is longer than twelve, a search line at the top with no box (the caret and the sheet are the field). Then sections, each a 10.5px capitals heading with no rule under it: on a published Round, "WROTE IN THIS ROUND" (13) and "DID NOT, THIS TIME" (10); while answering, "WRITTEN IN" and "STILL TO WRITE"; otherwise "YOUR BATCH" then "EVERYONE ELSE". Each row: a 40px bird, the name in 15px, the batch line under it, the Keeper's leaf after the name, and the row opens their profile. On a people Catch-up, one Canopy pill at the top, "Add someone", and a text link, "Copy the invite link", the link itself never printed. On a batch Catch-up, neither: the sheet is read-only and says so in one line under the title, "Everyone from 2011 is in. People who join the site later are added on their own."

A Keeper's per-person actions (make a Keeper, remove) sit behind a "..." on the row, in a menu of natural height, each label on one line because the menu is as wide as its longest label.

### 2.7 The menu, the verbs and the dialogs

One door, the "..." at the right of the home's head. The list row opens the same door (long press on a phone, hover dots on a laptop). The reader has no door: the name is the way up, and the door is at the top of the home.

The door is the menu material: Float, 12px radius, 4px padding, rows at their natural height, highlight by the state layer. Rows, in order:

- "Reminders · Daily" (with the current value), which opens a sheet of three radio rows: Daily, Last day only, Off.
- "Archive".
- For a Keeper, a group above the destructive one: "Rhythm · Every month" (a sheet of three radio rows), and "Hold the next Round" or "Resume".
- Last, in red, above a separator: "Delete" on a people Catch-up (which is also how you leave; the dialog says so), "End" for a Keeper. A batch Catch-up has neither: Archive is its whole answer.

Dialogs, all from `ui/dialog`, title plus at most one line. Archive: no dialog; the cover slides out of the list with auto-animate and a toast reads "Archived. Undo". Delete: title "Delete Salt and pepper", line "It goes to the bin for 30 days. After that, you are no longer in it.", Cancel then a red "Delete". End: title "End in the loop", line "No more Rounds. Everyone keeps what was written.", Cancel then a red "End". Nothing is auto-focused. Round verbs (open answering, nudge, extend, close, publish now) never enter this menu; they live on Now as text buttons beside the state they change.

### 2.8 The batch Catch-up

It exists on the day the batch's first member joins, one `Catchup` row on the existing batch group, and it appears on every member's list as "Batch of 2011". It has no Keeper (O1, the first answer). Round verbs are open to any member; Catch-up verbs do not exist for it; the rhythm is quarterly. It is told apart by its second line, "everyone from 2011", which is also the reason it looks the same everywhere else: it is a Catch-up.

Its first day: the list row reads "Batch of 2011 · No Round yet · everyone from 2011 is in." and opens the home, since there is nothing to read. The home's head: "Batch of 2011", "Every three months · everyone from 2011 · 39 people", no dots (there is nothing behind them; Archive lives on the list row's long press and on hover). Now is state 1 of 2.3: "No Round yet.", the one line, "Start the first Round". Before is absent. Its people sheet is read-only (2.6). Someone who joins the site in 2028 sees every Round in Before the day they arrive.

### 2.9 Archive and delete

Both are personal. Archive hides the Catch-up from your list and silences its reminders, with an Undo toast; it comes back when you open it from the Archived row, or when you are mentioned in a comment on your own answer, which lands you in it. Delete is the bin, 30 days, and on a people Catch-up it ends your membership when the bin empties. Neither verb appears on a cover, on the reader, or anywhere on the home except inside the one door. Archived things live in the one row at the bottom of the list that exists only when it has something in it (2.1).

### 2.10 Comments, a song card, a photo wall

Comments sit under an answer, collapsed to a count in the heart row: "3 comments", or "Comment" when there are none. They open in place with auto-animate, using the post comment family: a row of 28px bird, name, the text, and the 14px heart; the composer pill at the end, secondary fill, "Write a comment". A comment on your answer is a notification that lands on that answer with its comments open. @mentions work as they do on posts.

A song card prints under the answer's text whenever the text holds a Spotify, YouTube or Apple Music link, whatever the question. The sentence is never rewritten and the link stays a link inline, in leaf, breaking at the measure so the page cannot pan. The card is a row inside the answer, `--radius-md` 12px, hairline border, `bg-background/60`: 56px square art at the left (a YouTube link gets a 96x54 thumbnail from the wide file, never the letterboxed one), the title in 15px semibold, the artist in 13px muted, and the source as a 10.5px capitals mark, "SPOTIFY". The whole row opens the source in a new tab. Where a 30-second preview exists (Spotify, Apple), a play glyph sits on the art; YouTube gets none. The first music link in an answer is the card; further links are chips: favicon, title, one line. A link that fails to resolve stays a plain link and no card appears, ever, not even a skeleton.

A photo wall is a block any question can carry: everyone adds one photograph and a line. The Round prints them as justified rows (Flickr's rule, 4px gaps) across the sheet's full width on a phone, and across the sheet minus its 24px edge on a laptop: rows of two or three at 390, four or five at 1512, every photograph at its true shape, nothing cropped. Under each: the 28px bird and first name at the left, the heart at the right, and the caption under those in 13.5px if there is one. A tap opens the shared viewer on the whole wall.

### 2.11 The notification

Each transition sends one notification and it lands exactly where the state says:

- "Round 2 is gathering questions in in the loop." Lands on the home, with the composer in view.
- "Round 2 is open. Answers close Sunday." Lands on the composer at the first unanswered question.
- "Aditi nudged everyone in in the loop." Lands on the composer.
- "Round 2 is out." The notification's body is the cover. Lands on the reader at the top.
- "Karan commented on your answer." Lands on the reader at that answer, scrolled so its identity row sits just under the bar, comments open.
- "You were added to Salt and pepper." Lands on the home.

None of them lands on a list.

### 2.12 The empty states

A brand-new member with a batch year sees one cover on the list, "Batch of 2011", with its no-Round state line, and the pill to start a people Catch-up. A member with no batch year sees an empty shelf: the page title, the pill, and one line, "You are not in a Catch-up yet. Start one with people you choose, or wait to be added." A batch with no Round is 2.8. A Round with one answer prints as any Round does: the masthead says "Ravi Menon wrote in." with one bird, one question heading, one answer, and the end of the Round reads "One answer this time. Round 2 opens on 15 September." A Round with no answers (which can exist today) prints its masthead, "Nobody wrote in this time.", the questions as headings each with the line "No one took this one.", and the end.

### 2.13 The pressure fixture

Section 7 takes each case in turn. The rule the reader follows under all of them: a member's typing can be as long as the cap and one row over, it can be one character, and it can be nothing; the sheet prints all of it at the measure, breaks any run of characters at the edge, never clips, never scrolls sideways, and never changes shape after it has laid out.

## 3. The reader, precisely

Everything here is against the real Round: in the loop, Round 1, 15 August 2026, 13 writers, 133 answers, 11 questions. Every answer quoted is invented, in the shape of the real ones. The writers, invented: Aditi Rao '11, Karan Bhat '09, Meera Iyer '14, Tenzin Dolma '11, Nikhil Sundaram '08, Priya Venkatesh '11, Arjun Mehta '12, Sahana Kulkarni '13, Rohan Pillai '10, Ishaan Rao '11, Divya Nair '15, Vikram Sethi '07, Anjali Krishnan '11.

Tokens used throughout, at a 16px base: `--space-xs` 6px, `--space-s` 10px, `--space-m` 16px, `--space-l` 26px, `--space-xl` 42px, `--space-xxl` 68px. Paper `#F5F2EA`. The sheet's inner edge on a phone is 20px, so the measure at 390 is 350px. On a laptop the sheet is 760px wide with a 72px edge each side, so the measure is 616px, and the left edge is where birds and headings hang.

### The masthead

At 390, the sheet begins at y=56, under the green bar, and is full bleed: paper from screen edge to screen edge, no radius, no border. The masthead is printed on it, from the cover's fields and nothing else:

- y 84: the name, "in the loop", Libre Baskerville 34px, line-height 1.05, tracking -0.025em, ink. One line. A name that will not fit wraps to two.
- y 130: "Round 1 · 15 August 2026", Source Sans 3 14px, muted foreground, the middle dot from `MetaDots`.
- y 166: the writers strip. Five cells at a 64px pitch, 320px wide: four 28px birds, Aditi, Karan, Meera, Tenzin, in the order they wrote in, and a fifth 28px disc in mist with "+9" in 11px semibold. Under each, at y 198, the first name in the 10.5px capitals byline style, centred under its bird: "ADITI", "KARAN", "MEERA", "TENZIN", "OTHERS". The strip is one tap target, 46px tall, and it opens the people sheet on "Wrote in this Round".
- y 228: the state line, 13px, muted: "Round 2 opens on 15 September." In other states this line is the pointer to Now: "Round 2 is gathering questions until Thursday. Ask one", with "Ask one" as a leaf text link to the home; "Round 2 is open until Sunday. 9 of 23 have written in." with a 32px Canopy pill "Answer" at the right of the line, the only pill on the sheet; "Round 2 comes out Tuesday at 9am."; "The next Round is on hold."; "Ended on 3 March 2027." At most one line and one control, and it is the one place the page says what is next until the end.

What happens to it as you scroll: the masthead scrolls with the sheet, as text does. When the name's baseline passes under the bottom edge of the green bar (y=56), the bar's contents cross-fade over 150ms, opacity only: the bar's title space, empty on this route until now, fills with the spine. Scroll back up and the spine fades out as the name reappears. The bar never changes height and never moves.

At 1512 the masthead is not on the sheet. It is the rail (below), which is the masthead standing up beside the page and staying there.

### The navigator, resting, on a phone

The spine lives inside the green bar, which is the app's own 56px Canopy bar with its menu button at the left. Resting, once the masthead has passed:

- The menu button, unchanged, 44px target, at x 12.
- From x 64 to x 318, a two-line stack, vertically centred in the 56px: line one, "IN THE LOOP · ROUND 1", 11px capitals, tracking 0.08em, white at 72%; line two, the current question, Source Sans 3 14px semibold, white, one line, ellipsis at the end: "Songs you've had on repeat lately". After the text, a 12px chevron pointing down, white at 72%, the cue Apple puts beside a title that opens a menu.
- From x 326 to x 378, the notches: eleven vertical marks, 2px wide, 3px apart, white at 40% for questions ahead, white at 70% for questions read, and the current one 20px tall against the others' 14px, white at 100%. Forty questions would make a comb 200px wide, so the notches cap at fourteen visible: past that they draw as a fraction, "5 / 40", 12px tabular white.
- Along the bottom edge of the bar, a 2px line in white at 85% that fills from left to right as you move through the current question, from its heading to its last answer, and resets at the next heading. The notches say which question; the line says how far into it.

The stack and the notches are one tap target, from x 56 to the right edge, 56px tall. Pressing it lays the state layer over the green. That is the whole of the resting navigator: the current question is always named, and the contents are one tap from anywhere.

### The navigator, open, on a phone

Tap the spine and the contents rise from the bottom as a sheet: Float white, top corners 20.8px, a grabber, entering on `EASE_SPRING` as a transform from below the screen, with the backdrop the dialog's warm-ink tint at 55% and blur, opacity only. It is a sheet, not a dialog: the reader stays where it was underneath, and dragging the grabber down or tapping the backdrop closes it. It opens to the height of its content up to 78% of the viewport (656px at 844); past that it scrolls inside, with the current row scrolled into view on open.

Inside, padded 16px:

- The head row, 56px tall: "in the loop" in Libre Baskerville 20px, ink; beneath it "Every month · 23 people · Round 2 opens 15 Sep", 13px muted; at the right, a chevron pointing right. This row is the way up. Tapping it goes to the home.
- `--space-s` of space, then the questions, one row each, natural height, 44px minimum. Each row: a 24px-wide column with the number in 12px tabular muted ("5"); the question in 15px, ink, clamped to two lines; the answer count at the right in 12px tabular muted ("13"). The current row has a 2px leaf bar down its left edge, 16px in from the sheet's edge, the question at weight 600, and it is not clamped: it shows in full to six lines. Rows have no rules between them. A row's press is the state layer; tapping it closes the sheet and the page lands with that question's heading 16px under the green bar. The jump is instant; the sheet's exit covers it.

The forty-answer question reads in it as a row like any other with "40" at the right, and, when it is the current one, a second line under the question in 12px muted: "you are at 9 of 40". Nothing about it needs a different control. On the page, that question is forty answers packed two to a row at 1512 and one to a row at 390, and the line under the bar fills across all of them.

### The desktop plan

At 1512 the content area runs from x 288 (after the 248px sidebar and 40px of shell padding) to x 1472. Two columns and a margin:

- The rail, x 288 to 560, 272px, sticky at top 40. It is the masthead: "in the loop" in Libre Baskerville 22px, a link that goes up, underlined on hover; "Every month · 23 people" in 13px, the count opening the people sheet; then `--space-l`; "ROUND 1 · 15 AUGUST 2026" in 10.5px capitals; the writers as a five-column grid of 48px cells, three rows for thirteen people, each a 28px bird with the first name under it, every bird a link to a profile and the block's caption "13 wrote in" opening the people sheet; then `--space-l` and "IN THIS ROUND" in capitals; then the eleven questions as rows, 15px, clamped to two lines, the count at the right in tabular figures, the current one marked by a 2px leaf bar that moves between rows on `NAV_MARKER_SPRING`. Weight never changes with the marker, only colour (muted to ink), so item five stays one line and nothing under it moves. Then "Round 2 opens on 15 September." in 13px muted, or the state line's other forms with their one control. If the rail's questions run past the viewport (forty of them) that list alone scrolls, and the current row is kept in view.
- A 32px gutter.
- The sheet, x 592 to 1352, 760px wide, paper, 16px radius, `card-elevated`, from y 40 to the end of the Round. Inside, the 72px edge on each side. Birds hang in the left edge at 40px, x 616 to 656; text starts at x 664; the measure runs to x 1280.
- The remaining 120px to x 1472 is page. At 1920 the sheet grows to 880 and the pair is centred in the space; the sheet never passes 880.

The way back lives at the top of the rail at every depth, because the rail is sticky. It lives again at the end of the Round.

### A question's heading

At 390: `--space-xxl` above it from the previous question's last heart row. A label line, 10.5px capitals, muted: "13 WROTE IN · ASKED ANONYMOUSLY", or "13 WROTE IN · ASKED BY AGASTYA LEWIN" with the name a link. `--space-xs` under it, the question in Libre Baskerville 24px, line-height 1.15, tracking -0.02em, ink, as many lines as it takes. No number, no Q1, no rule, no box. The answers begin `--space-l` below.

At 1512: the same label and the question at 28px, but the heading starts at x 616, the left edge where the birds hang, so it stands 48px out into the gutter from the answers' text at x 664. A heading over 120 characters drops to 20px on both sizes and reads as the paragraph it is.

### The answer, in four states

Two packings, chosen by the answer.

**The run**, for an answer with no photographs and no card whose text is 160 characters or fewer: an identity row of a 28px bird, the name in 15px semibold, and the batch line in the 10.5px capitals byline style set inline after the name with a 10px gap ("Ishaan Rao  BATCH OF '11"); then the text on the next line at 16px, line-height 1.6; and the heart in the same line as the text when the text is one line, at the right, or on its own row beneath when it is two. On a laptop, a question whose every answer is a run prints them two to a row, row-major, inside the 616px measure, each column 300px with a 16px gap, birds inline at 28px.

**The piece**, for everything else: on a phone, the identity row (28px bird, name, batch line under it in the stacked form the app uses everywhere), then the text at 16px, line-height 1.6, then the pictures, then the card, then the heart row. On a laptop the bird is 40px and hangs at x 616 in the gutter; the name and batch line sit at x 664 on the bird's centre line; the text begins on the next line at x 664.

The heart row, both packings: 32px tall, `--space-s` under the last content, the shared `LoveButton` at `md` (18px, `#E03A33`, count in 14px) at the left, then "3 comments" or "Comment" as a 14px text button. Nothing else on the row. Between answers, `--space-l` on a phone and `--space-xl` on a laptop, and no rule.

The four states, as they print at 390:

1. *Text only.* Aditi Rao, BATCH OF '11. "Learnt to swim at thirty-two. The instructor was nineteen and very patient about it. By August I could do a length without stopping, which is not much, but it is a length more than I could do in June." Four lines at the measure, 102px of text, then the heart row: "♥ 12 · 3 comments". Whole answer 178px tall.
2. *One photograph.* Divya Nair, BATCH OF '15. "Went back to the valley for the first time since 2015. The banyan is the same and I am not." Then `PhotoFrame` at the measure: a 1200x1600 portrait becomes 3:4 on a blurred bed of itself, 350 by 467px, `--radius-md` 12px, tap to open the viewer. On a laptop the same rule, 616 wide, capped at 700px tall. Then the heart row.
3. *Three photographs.* Karan Bhat, BATCH OF '09. "Ten days in Portugal with my sister, mostly eating. The last one is the view from the room we could not afford and booked anyway." Then justified rows at a target row height of 220px on a phone: the two 1200x1600 portraits side by side, each 173 by 231, a 4px gap; under them the 1288x966 landscape at 350 by 262. On a laptop, target 240px: all three in one row, portraits 178 by 237, the landscape 316 by 237, two 4px gaps, 616 wide. Every photograph at its true shape, 12px corners on the outer corners of the group only, and a tap opens the shared viewer on the three. No carousel; nothing snaps.
4. *A song link.* Karan Bhat, BATCH OF '09, under question five. "Been stuck on this since June: https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee and nothing else has had a chance." The link prints in leaf, underlined, breaking at the measure. Under the text, `--space-s`, the card: 56px art at the left with 8.8px corners, "Alright" in 15px semibold, "Kendrick Lamar" in 13px muted, "SPOTIFY" in 10.5px capitals, a 12px play glyph on the art. The row is 76px tall, 12px corners, and opens Spotify in a new tab. Then the heart row.

How a one-word answer packs: Cyan's real tile is three centimetres and 15% words. Here, Ishaan Rao's "your mama" under question seven is a run: bird, name, batch line, then "your mama" with "♥ 8 · Comment" at the right of the same line, 54px for the whole answer plus the 26px after it. Eleven one-liners take 880px on a phone and, two to a row, 440px on a laptop.

How a 2,000-character answer packs: it is a piece; about 34 lines at the measure on a phone, 870px of text, with no More or Less, because a Round is for reading and the bar tells you where you are the whole way down. On a laptop it is 22 lines, 560px.

### The comments

Collapsed: "3 comments" in the heart row. Open: the row's label reads "Hide", and beneath the heart row, `--space-s` down, the comments in the post family: each a 28px bird, name in 14px semibold, the text at 14px, the 14px heart with a count at the right, `--space-s` between rows, no rules, no well. At the end, the composer pill, 40px, secondary fill `#EAE7DC`, "Write a comment", which opens the keyboard only when tapped. On a laptop the comments sit at x 664 on the measure, and the bird hanging in the gutter belongs to the answer above, not to any comment. Opening and closing animate with auto-animate, and nothing above the answer moves.

### The heart

The shared `LoveButton`, `md`, red on the first frame, the pop on `EASE_POP`, three leaf flecks. It flips at once and the page does nothing else: no re-render, no scroll, no delay after the colour. That last part is X's one-line fix and this direction assumes it.

### The way back, from any depth

On a phone: the spine, then the head row of the contents, two taps, or the masthead's name at the top, or the name at the end. On a laptop: the rail's name at the top, one click, at every depth. The browser's Back works as it always did.

### The end of the Round

After the last question's last heart row, `--space-xxl`, then, on the sheet:

- "The end of Round 1." in Libre Baskerville 24px.
- "133 answers from 13 people." in 14px muted.
- The state line again, as its own row: "Round 2 opens on 15 September." or its other forms with their one control, "Ask one" or the "Answer" pill.
- "ROUNDS BEFORE" in capitals and the covers of earlier Rounds, if any; Round 1 has none, so nothing is printed.
- "in the loop" in Libre Baskerville 20px with a right chevron, a full-width row, the way up.
- `--space-xl`, and the sheet ends. The page background shows under it on a laptop; on a phone the sheet runs to the bottom.

### The first screen at 390

y 0 to 56: the green bar, menu button at the left, nothing in the title space yet.
y 56: paper begins, full bleed.
y 84 to 120: "in the loop", 34px serif.
y 130 to 150: "Round 1 · 15 August 2026".
y 166 to 212: the writers strip, Aditi, Karan, Meera, Tenzin, +9, names under.
y 228 to 246: "Round 2 opens on 15 September."
y 288 to 300: "13 WROTE IN · ASKED ANONYMOUSLY".
y 306 to 361: "What is a fun thing you did this summer?" in 24px serif, two lines.
y 387 to 415: Aditi Rao's identity row, 28px bird, "Aditi Rao", "BATCH OF '11" under.
y 425 to 527: her four lines about learning to swim.
y 537 to 569: "♥ 12 · 3 comments".
y 595 to 623: Karan Bhat's identity row.
y 633 to 684: his two lines about Portugal.
y 694 to 844: the top 150px of his two portraits side by side, cut by the screen's edge.

One whole answer and the start of a second, with its photographs beginning, on the first screen. The masthead is 190px of the 788 the sheet gets, under a quarter.

### The first screen at 1512

x 0 to 248: the green sidebar, Catch-ups lit as the active row.
x 288 to 560, from y 40: the rail. "in the loop" at 22px; "Every month · 23 people"; "ROUND 1 · 15 AUGUST 2026"; three rows of five birds with names under (Aditi, Karan, Meera, Tenzin, Nikhil / Priya, Arjun, Sahana, Rohan, Ishaan / Divya, Vikram, Anjali), 150px; "IN THIS ROUND"; eleven rows, the first marked in leaf, "What is a fun thing you did this summer?  13", "Something new you did recently that you did not think you would do.  13", "How do you think that coming from RV has shaped your relationship with AI?  10", and so on to "What's something creative you have recently done?  12"; then "Round 2 opens on 15 September."
x 592 to 1352, from y 40: the sheet. At y 88, "13 WROTE IN · ASKED ANONYMOUSLY" at x 616. At y 100, the question at 28px, one line, hanging at x 616. At y 160, Aditi's 40px bird at x 616, her name and batch line at x 664, her text at 17px from y 196 to 262 (three lines at the 616 measure), the heart row to y 304. At y 346, Karan's bird, his text to y 420, and from y 430 to 667 his three photographs in one justified row, 616 wide. At y 677 his heart row. At y 735, Meera Iyer's answer, "Nothing, honestly. Slept.", as a run in the piece column since the question is mixed, and Divya's begins under it and runs off the bottom.
x 1352 to 1472: page.

Three complete answers on the first screen, one of them with three photographs.

### A mid-scroll screen at 390, deep in question five

y 0 to 56: the green bar as the spine. Menu at the left. "IN THE LOOP · ROUND 1" in capitals at 72% white; under it "Songs you've had on repeat lately" with the chevron; at the right, eleven notches, the fifth tall and white, four before it at 70%, six after at 40%. Along the bottom edge, the 2px white line at about a third of the width.
y 56: paper continues.
y 72 to 100: Tenzin Dolma's identity row, BATCH OF '11.
y 110 to 161: "This, on a loop, on every bus since May: https://www.youtube.com/watch?v=dQw4w9WgXcQ" over two lines, the link in leaf, broken at the measure.
y 171 to 247: the card: a 96 by 54 thumbnail at the left, "Ilaiyaraaja live in Bangalore, full concert" in 15px semibold clamped to two lines, "Ilaiyaraaja Official" in 13px muted, "YOUTUBE" in capitals. No play glyph.
y 257 to 289: "♥ 4 · Comment".
y 315 to 343: Meera Iyer's identity row, BATCH OF '14, the batch line inline: a run.
y 349 to 375: "A whole lot of old Ilaiyaraaja again, do not ask." with "♥ 6 · 1 comment" at the right of the line.
y 401 to 429: Nikhil Sundaram's identity row.
y 439 to 490: "Two on repeat and I am not proud of either: https://open.spotify.com/track/3UbEemDEz6b6l5EBiswULJ and https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc", three lines, both links in leaf.
y 500 to 576: the first link's card: 56px art, "Pyaar Hua Ikrar Hua", "Lata Mangeshkar, Manna Dey", "SPOTIFY", the play glyph.
y 584 to 612: the second link as a chip, 28px tall, favicon, "Straight Line Was A Lie", one line, 12px corners.
y 622 to 654: "♥ 9 · 2 comments".
y 680 to 708: Sahana Kulkarni's identity row, and her answer beginning at y 718, "Whatever my daughter is playing, which this month is one song about a shark," running to the screen's edge.

The question is named at the top of the screen. The contents are one tap away. The page has not moved sideways, because every link breaks at the measure.

## 4. The design system, kept and broken

Kept by default, and used as the thing that makes this belong: the palette, untouched, paper for the sheet and Canopy for the one pill and the bar; Libre Baskerville for the name, the questions and the end, Source Sans 3 for everything read; the radius ladder, 16 on the sheet and the covers, 12 on photographs and cards inside them, 8.8 on art and chips, pills only on things you press that are one line tall; the state layer for every hover and press; the one heart; `IdentityRow` and the 10.5px byline line under a name; the shared viewer; `PhotoFrame`'s one rule for a lone photograph; the menu and dialog materials as written; the warm shimmer where the Round is loading; motion on transform and opacity only, `EASE_SPRING` for the sheet, `EASE_POP` for the heart, `NAV_MARKER_SPRING` for the rail's marker; hover never moving anything.

Broken, each on purpose (D36):

1. **The green bar carries this route's content.** The shell's 56px bar is the app's, and on every other route it holds a menu button and a bell. Here it also holds the Catch-up's name, the current question and the notches. This is the break that is the point: the reader gets a spine on a phone without adding a single pixel of chrome, and the bar that is the app everywhere else is what makes the spine read as this app. It is the Action Button move: the same material, used in a way no other screen uses it.
2. **Answers have no card.** The tile is "tried and tested across the app" (¶27) and the architecture keeps its content and not its chrome. The whole Round is one card instead, so the surface ladder holds (paper on the page, Float above it) and the answer inside it is text on paper, the way a letter is. The 15%-words tile cannot happen because there is no tile.
3. **The masthead scrolls away.** Every long page in the app keeps its header in place or above the fold; the reader lets its masthead go and puts its name and place in the bar instead, because a 190px masthead pinned to a phone would be the 60% first screen the recon measured.
4. **A pill's radius is not the answer inside a sheet.** The contents sheet's rows and the people sheet's rows are plain rows with the state layer, not pills, and the rhythm and reminder choices are radio rows, not a pill inside a pill. The one pill on the reader is "Answer", and it is the one place a member is asked to do something.

The one thing on screen that could only be this app: the writers strip, four birds in a row with the first names in capitals under them and a mist disc that says OTHERS, standing where a magazine prints its contributors. It is the birds the owner already loves, finally attached to the names that make them identify anybody, and it is on the cover, the masthead and the rail so the three are one family by sight.

## 5. Letterloop, closed and open

- L-a, comments with @mentions: closed, the post comment family under every answer (2.10).
- L-b, music: closed wider than Letterloop's, a card for any pasted Spotify, YouTube or Apple Music link on any question, our own card, never an iframe (2.10, 3).
- L-c, photo wall: closed as a block any question can carry, justified rows, the viewer on the whole wall (2.10).
- L-d, "the next issue arrives on": closed twice, the state line on the masthead and the end of the Round, and Now on the home.
- L-e, reactions per reply: left open on purpose. The heart is the app's one reaction and a picker would put six emoji pills under every answer.
- L-f, reply progress: closed, "9 of 23 have written in" as names on Now, "Still to write" as names, both opening the people sheet.
- L-g, reminders: already there; here they sit in the one door as three radio rows.
- L-h, the Album: left open for this direction. Before is a shelf of covers with the most-hearted photograph on each; a three-up album of every photograph across Rounds is a room of its own and it would be a fifth door off the reader, which is one too many for a first cut.
- L-i, PDF: track M; the end of the Round has the place for "Download as PDF" as a text button when it exists.
- L-j, Mementos: out of scope.
- L-k, themes: not, on purpose. One look.
- L-l, filter by member and sort: left open. The writers strip and the people sheet give "what did Karan write" by opening his profile; a filter inside the reader is a control the bar does not have room for and the forty-answer question does not need.
- L-m, a banner and logo per loop: closed halfway, the cover's derived photograph; no uploads, no logo.
- L-n, four roles: one role, Keeper, and a batch Catch-up with none.
- L-o, quick actions per loop on Home: the state line on every cover, and the whole cover as the one action.

## 6. Live and static

Must be genuinely live in the S4 room, on a phone-sized frame, or it cannot be judged:

- The scroll of the whole real Round on the sheet, with the masthead folding into the green bar and the spine fading in and out at the crossing point.
- The spine: the current question updating as you scroll, the notches and the 2px line moving, and the tap that opens the contents sheet.
- The contents sheet: rising, dragging closed, the current row marked and unclamped, a row's tap landing the page at that heading, the head row going up to the home.
- The heart, flipping at once.
- Comments opening and closing in place on at least one answer, with the composer pill present (posting may be off).
- The viewer opening from a lone photograph, from the three-photo group and from the wall.
- The two packings on the real Round: question seven as runs, question one as pieces, and, on the laptop frame, the two-to-a-row runs.

May be a static composition: the list at 390, 1512 and 1920; the home in its seven Now states; the composer; the people sheet; the door menu and the three dialogs; the batch Catch-up's first day; the notifications; the empty states; the song cards (resolved by hand, with real art); the desktop rail may be static text as long as its marker moves with the scroll.

## 7. Under pressure

Against `_fixtures/pressure.ts`, honestly:

- **One answer.** The masthead's strip is one bird with a name under it and no OTHERS disc; the heading; one answer as a run or a piece; "One answer this time." at the end. On a laptop the sheet is short and the page shows under it. It looks like an issue with one letter in it, which is what it is.
- **Forty answers.** Forty runs at 390 are about 3,000px; forty pieces of 240 characters are about 9,000px. The spine names the question the whole way, the line under the bar fills across all forty, the contents sheet says "you are at 9 of 40". Two to a row on a laptop halves it. Where it strains: the line under the bar moves very slowly through 9,000px and a reader could believe it is stuck. The number in the sheet is the honest backup.
- **A 6,000-character answer, and one over.** A piece, about 100 lines on a phone, 2,600px, no More, no clip, and the row over the cap prints the same way because the sheet never assumes the cap. Where it breaks: a member who wanted the next answer scrolls 2,600px to reach it, and the spine does nothing for within-question skipping. A per-answer skip is a control this direction chose not to add; the bar's line at least shows that the question has not changed.
- **A 24-photo wall.** Justified rows: at 390, eight to ten rows of two or three, each at its true shape, about 1,600px tall with the bird-and-name rows under each; at 1512, five or six rows of four or five across the sheet's 712px, about 1,100px. Nothing crops. The broken-file photograph draws as a mist rectangle at its stored shape with the bird and name under it, and the viewer skips it. Where it strains: at forty-plus photographs the wall alone is a screen's worth of scrolling on a laptop, and the only navigation inside it is the scroll.
- **A 300-character question.** Over 120 characters the heading drops to 20px and prints as a paragraph, twelve lines on a phone, four on a laptop. In the spine it is one line with an ellipsis, which for a question that long tells you little beyond its opening words; in the contents it is clamped to two lines unless current, when it shows to six and is cut there. That is a real loss and the fixture shows it.
- **A 78-character name.** The identity row's name wraps to two lines at 15px on a phone, three on the rail's 48px cell, where it is cut to the first name and an ellipsis; in the writers strip only the first name prints, "PADMANABHAN", which at 10.5px is 84px wide and overflows its 64px cell, so cells with a long first name widen to fit and the strip wraps to two rows. The batch line stays on its own line.
- **An emoji-only answer.** A run: bird, name, then "😭😭😭🐦‍⬛🌳🫶🏽✨" at 16px on one line with the heart at the right. Nothing to do; it is what the person wrote.
- **A pasted 123-character link.** Prints in leaf and breaks at the measure, on a phone into three or four pieces, because the sheet sets `overflow-wrap: anywhere` on every run of member text and the page cannot pan. If it resolves, the card follows; the fixture's zeroed track does not resolve, so the link stays a link and no card and no skeleton appear. The unbroken 180-character word breaks the same way.
- **A Round nobody answered.** The masthead prints "Nobody wrote in this time." with no strip, each question as a heading followed by "No one took this one.", and the end. The cover on the shelf has no photograph and its strip says "Nobody wrote in". It is promoted nowhere: the list orders on the newest activity, not on publish date alone. Where it breaks: a Round like this should not publish, and the reader can only print it honestly; stopping it is the Keeper's Now panel's job, which this direction gives a warning line, "One person has written in so far", and no more.

## 8. The two things I am least sure I got right

**The front door while the next Round is being answered.** Landing a member in Round 1, read a fortnight ago, when Round 2 is open and wants their answers, is the bet at its most exposed. The masthead's state line with its one pill is the answer here, and the composer is one tap from it, but it is a line on top of old reading rather than the thing itself, and the list row's state line is what most people will act on before they ever see the sheet. The other reading is to send the row to the composer while a Round is open and to the reader otherwise, which is two destinations for one tap and exactly the "when you click what, what do you enter" confusion the architecture cuts out. I chose the one destination. If the judges find the answering state lands too far from Answer, the fix is on the masthead, not on the row: the state line becomes a band with the pill, and it stays one page.

**One sheet, no cards.** Removing the answer tile is the biggest visual bet on the page and the one the owner has not asked for; he called the tiles fine. A 49,000px paper sheet with thirteen people's writing on it, birds in the gutter and hearts on the left, could read as a beautiful issue or as a very long document with no edges, and the difference is in the packing and the type, which a static composition can only half prove. The desktop gutter with the hanging birds is what I am most confident of, and the phone, where there is no gutter and the identity rows carry the whole rhythm, is where I would look first when the room is up. If the runs and pieces do not separate cleanly at 390 without a rule or a fill, the fallback is a fill on the piece only, paper on a lighter accent sheet, which keeps the sheet and gives the eye an edge without bringing back the empty band under a one-line answer.

# Every question is a page

**Thesis:** A Round is an issue you turn through one question at a time, and the app's chrome steps out of the way while you read it, so the question you are on is never off screen and the way home is always the name in the corner.

**Designer:** 08 whole-app, blind.

**The bet, as given:** AS IF IT WERE THE WHOLE APP. Brief paragraph 19: "if catch-ups was my entire app, the amount of attention to detail that I would have would not ship anything like that... How do I make it a complete experience that is so beautiful and so intuitive?" Design Catch-ups as its own product with its own way of moving around; the app's sidebar is a door into it and nothing more. You have not seen today's layout and you should not try to imagine it.

## 1. The idea

You tap Catch-ups in the sidebar and you are at a desk with two or three things on it, each with a photograph your friends took. You tap one and you are on that Catch-up's front page, where the newest issue sits as a cover. You tap the cover and the app leaves: the sidebar goes, the green bar goes, and the issue takes the whole screen with its own bar at the top. That bar prints two things, the Catch-up's name on the left and where you are on the right, "3 of 11". You read the cover, which is the date, a photograph, the thirteen people who wrote in by bird and by name, and the eleven questions. Then you swipe left and you are on question 1. Every question is its own page. You scroll down through its answers, and when you reach the bottom the next question is waiting there as a block you can tap, or you swipe again. The name in the corner takes you home from any page, at any depth, with one tap. The counter opens the contents from any page, at any depth, with one tap.

That is the whole product: a desk, a front page, an issue with pages. Everything else is drawn inside those three places.

What it bets on is that the reader is the product and the rest is a door to it. A periodical app would not make you read thirteen answers to eleven questions as one 44,000-pixel scroll with a chip row at the top. It would give each question a page, tell you which page you are on, and let the pages turn. Paging is how the Action Button screen works in paragraph 42: one thing at a time, end to end, swipe between them. It is also what makes the phone problem in paragraph 11 disappear rather than get patched: you never do not know which question you are reading, because the page you are on is the question, and the bar says so once the heading scrolls off.

What it refuses to do: it will not show the same Round twice on one screen, ever. A Round is on the home as its cover until the next Round begins, and then it moves to the shelf; it is never in both places. It has no menus; there is one door, the About sheet, and it holds the people, your reminders, archive and delete, and the Keeper's settings, the way WhatsApp's group info does. It will not truncate a question with three dots anywhere a person is trying to read it; only the running head in the bar clamps, and the full question is one scroll up or one tap away. It will not print a row of birds with "+18" anywhere; birds appear beside names or as a picture, never as a count.

What it is not, and what it most risks resembling: an Instagram Stories viewer. Horizontal pages with a segmented progress line at the top is the Stories grammar. The difference is that nothing here plays on its own, the pages scroll vertically and are long, the progress line is a 2px hairline under a paper bar rather than a white bar over a photograph, and the type is Baskerville on paper. It reads as a magazine's contents and pages, and the sketch room should be judged on whether that holds.

Where it departs from the architecture's RECOMMENDED lines:

- 1.5's last row says the sidebar and the green bar never leave. In this direction they leave for the reader and the composer, and only for those two. The reason is one bar instead of two: on 844 pixels, the app's 56px green bar plus a reader bar plus a way to the contents is 112px of chrome before the first answer. The reader's bar carries the Catch-up's name, which is the way up, so nothing that 1.5 needs is lost. The desk and the home stay inside the shell, which is the door.
- 1.3 puts the newest published Round's cover in Now and also lists every published Round in Before. Read literally that puts Round 1's cover on the home twice on a Catch-up with one Round, which is paragraph 15. Here a cover is on the home exactly once: in Now while it is the latest thing, on the shelf once a newer Round has started.
- 1.6 allows the door to be a menu or the people sheet; this direction takes the sheet and adds that there is no menu at all, so the head of the home has no "...". The count of people is the door. The list panel opens the same sheet by long press on a phone and by a "..." that is the one exception, on the desktop panel only, because a desktop has no long press.
- 1.7 says never birds alone. The cover's picture, when the Round has no photograph, is a flock of the writers' birds. That is a picture in the picture slot, with the writers' names printed under it; it does not count anyone and it does not stand in for a name. I say this here so the judges can call it if they read the rule the other way.

## 2. The screens

Tokens used throughout: the type scale in DESIGN-SYSTEM.md section 5 (display, h1 32, h2 24, h3 20, body 16/1.65, small 14, label 12 uppercase tracked); the radius ladder (16 container, 12 nested, 8.8 thumbnail, pill controls, 20.8 for a floating panel); the surface ladder (background, paper for cards, float for sheets and menus, mist for the one well a card may hold); the space scale, which I give in pixels (10, 16, 26, 42, 68) so a builder can map them to `--space-*` whatever the names are. Every clickable thing has hover as the state layer, focus-visible per the recipe, and the press sink. Hover never moves anything.

### 2.1 The list

The desk. Inside the app shell, titled "Catch-ups" as an h1, with one Canopy pill at the title's right, "Start a Catch-up". Under it, one panel per Catch-up, and nothing else on the page except the archived row at the bottom when one exists.

A panel is a paper card, 16px radius, no border. Its top is a picture band: the Catch-up's picture, which is the latest published Round's most-hearted photograph, cropped to the band with PhotoFrame's blurred bed if it is tall, or the flock of its members' birds on paper if it has no photograph yet. Under the band, 16px padding: the name in h3 Baskerville ("in the loop"; "Batch of '11"), then one line in 14px muted ("Every month · 23 people"; "Everyone from '11 · 39 people"), then the state line in 16px ink, which is the same sentence the home's Now panel uses as its title, so the desk and the home agree by construction:

- "No Round yet"
- "Round 2 is collecting questions until Friday"
- "Round 2 · answer by Sunday · 9 of 23 in"
- "Round 2 comes out on Monday"
- "Round 1 came out on 15 August · Round 2 opens on 15 September"
- "On hold"
- "Ended on 3 March"

A leaf dot sits before the state line when a Round came out that you have not opened. When answering is open, a Canopy pill "Answer" sits at the panel's bottom right; it is the only control on the desk apart from the pill at the top, and it goes to the composer. The rest of the panel is one tap target and goes to the home.

At 390: panels are 358 wide with 16px margins, the band 358x200 clipped by the card's own top corners, stacked with 16px between them. Two panels fill the screen; three run just past it. Long press on a panel opens its About sheet (2.7).

At 1512: the content area holds up to three panels side by side, each 340 wide with the band 340x200, 32px apart, left-aligned under the title, in a column capped at 1084 and centred. A muted "..." at each panel's top right, 24px glyph with a 44px hit, opens the About sheet; it is the only "..." in Catch-ups and exists because desktops cannot long press.

At 1920: the same three panels at the same size in the same 1084 column, centred in the space beside the sidebar. The valley photograph shows around them at its 11%. The panels do not grow; that is the answer to paragraph 1's widescreen complaint. A member with one Catch-up sees one panel at the column's left, not a lonely panel stretched across a monitor.

The archived row: a single line of text at the desk's bottom, 14px, "1 archived · 1 in the bin, gone in 30 days", each half a text control. It appears only when at least one exists. Tapping "archived" replaces the desk's panels with the archived ones, drawn the same, under an h2 "Archived"; opening one brings it back and a toast says "in the loop is back on your desk".

### 2.2 Making one, and starting a Round

"Start a Catch-up" is a page, `/catchups/new`, not a dialog, because it holds a search. Inside the shell. Title h1 "Start a Catch-up". Then three parts with 42px between them and no rules: a FloatField "Name"; the rhythm as three radio rows in 16px, "Every month", "Every two months", "Every three months"; and a FloatField "Add people" whose matches appear below it as IdentityRows, tap to add, with the people chosen so far listed above the field with an x on each. One Canopy pill at the bottom, "Start", which creates the Catch-up with you as Keeper and Round 1 already collecting questions, and lands you on the home with the Ask field ready. There is no separate "start the first Round" for a people Catch-up: making one starts one.

A batch Catch-up's first Round starts from its own home. Its Now panel shows the one button "Start the first Round" (2.8). Tapping it turns Now into the collecting state on the spot; no page, no dialog, no members step.

### 2.3 The home

Inside the shell. One column, the app's content column on desktop (680 wide at 1512), full width with 16px margins at 390. Three parts, stacked, with 26px between them and no rules anywhere.

The head. A label line in leaf, 12px uppercase tracked, "CATCH-UPS", which is the way to the desk and doubles as the feature eyebrow the app already uses. Under it the name in display Baskerville, "in the loop". Under that one line in 16px, "Every month · 23 people", where "23 people" is in leaf and the whole line is the tap target that opens the About sheet. That is the head. No "...", no birds, no count of who wrote in; that belongs to the Round.

Now. One paper panel, 16px radius, 16px padding, whose first line is always the Round and its state, and which holds only what that state needs:

- No Round yet (a batch on its first day). "Nothing has gone out yet." in h3. One line of body: "A Round collects everyone's questions, then everyone's answers, and comes out as one issue." One Canopy pill, "Start the first Round".
- Collecting. "Round 2" in h2 with "Collecting questions until Friday 11 September" in 14px muted beside it. The questions gathered so far as a list in Baskerville 17px, each with "asked by Rohan Iyer" or "asked anonymously" in 13px muted under it, 12px apart, no rules, no numbers. Then the Ask row: a bordered 12px Input "Ask a question", a switch row "Ask anonymously", and a Canopy pill "Ask" that appears when the field has text. For a Keeper, a 13px leaf text control at the panel's bottom right, "Open answering now".
- Answering. "Round 2" in h2, "Answer by Sunday 20 September" in 14px muted. One Canopy pill the full width of the panel, "Answer". Once you have answered, that pill is replaced by one line, "Your answers are in" with a text control "Change them". Then "9 of 23 have written in" as a label line, the nine as a wrapped flow of bird 24 plus name in 15px, and under it in 14px muted, "Still to write: Anil, Bhavna, Devika and 11 others", names only, which opens in place. For a Keeper, three 13px leaf text controls in one row at the bottom: "Nudge everyone", "Extend by a week", "Close now".
- Preparing. "Round 2" in h2, "Comes out on Monday 21 September at 9 in the morning." The writers' flow as above, final. For a Keeper, a Canopy pill "Publish now".
- Published, next not yet open. The cover of Round 1, large (2.5's cover, drawn at panel width), which is one tap target to the reader. Under it, one line, "Round 2 opens on 15 September." and a 13px leaf text control, "Ask a question for Round 2", which opens the Ask row in place. That is the whole panel. There is no second copy of Round 1 anywhere on this page.
- Paused. Whatever the panel was showing, unchanged, with one line in cinnamon at its top, "On hold · the next Round will not open until a Keeper resumes", and for a Keeper a text control "Resume" on that line. A Round already collecting or answering finishes on its own underneath it.
- Ended. "Ended on 3 March 2026." in h3, nothing else in the panel. The head's line reads "Ended · 23 people".

Before. Present only when there is a published Round older than the one in Now. A label line "EARLIER ROUNDS" in cinnamon, then the covers at shelf size: 2-up at 390 (171 wide), 3-up at 1512 (208 wide), newest first, each one tap target to its reader. Under the covers, one text control in 14px, "All photographs · 34", which opens the album (5, L-h): every photograph from every Round of this Catch-up as justified rows, by Round, each opening the viewer.

At 390 in the published state, the first screen is: the green bar, "CATCH-UPS", "in the loop", "Every month · 23 people", and the cover's picture with "Round 1" under it. The date and the writers come in on the first scroll. At 1512 the cover lies sideways (picture left, text right) and the whole panel fits under the head with the shelf label showing at the bottom.

### 2.4 The composer

`/catchups/round/[id]/answer`. The reader's twin: it takes the whole screen, has the same bar, pages the same way, and opens the same contents sheet. Learning one teaches the other.

The bar: the Catch-up's name at left (home; everything is saved as you go, so leaving is safe), and at right "4 of 11 answered", which opens the contents sheet with a leaf check on every question you have answered. A 12px muted "Saved" appears beside the counter for two seconds after each save.

A page per question: the question in h2 Baskerville at the top, "asked by Priya Nair" or nothing under it, then the answer field, which is the mist FloatField material grown to a textarea, label "Your answer", because this page is a form. Under it a text control with a glyph, "Add photographs"; chosen ones appear as a row of 80px thumbnails at 8.8px radius with an x on each, and each thumbnail has a caption field that opens on tap. When the text contains a music or video link, a song card (2.10) renders under the field on its own, with an x that drops the card and leaves the link in the text. A photo-wall question's page has, instead of the text field, one frame at the page's inner width, 4:3, mist, with "Add your photograph" and a camera glyph in its centre, and a caption field under it. The Next block at the bottom of every page, as in the reader.

The last page: "They're in." in h2 (the one friendly line on this surface). "7 of 11 answered. You can change them until Sunday." One Canopy pill, "Done", which goes to the home. Unanswered questions are simply unanswered; there is no nag.

### 2.5 The reader

Section 3, in full.

### 2.6 Who is here, and who wrote in

Two questions, two places.

Who wrote in is a state and lives on the Round: on the Now panel while answering, as names with birds and a still-to-write list; on the cover, as three birds and "Aditi, Rohan and 11 others" on the shelf cover and the full flow on the large one; on the reader's cover page, as the full flow, thirteen items of bird 24 plus name, wrapping. Nowhere is there a count without names.

Who is in this is the roster and lives one level down, in the About sheet (2.7), under the heading "23 people". Search first when there are more than twelve. Order: this Round's writers, then your own batch, then everyone else. Each row is an IdentityRow (bird 40, name, batch line) and the Keeper's row carries the leaf and the word "Keeper" after the name in 12px caps, nothing more. On a people Catch-up the top of this section has two text controls side by side, "Add someone" (a search that turns into rows you tap) and "Send the link" (copies it; a toast says "Link copied"). A Keeper tapping a row gets the menu material with two items, "Make Keeper" and, after a separator, "Remove from this Catch-up" in red, which opens ConfirmDialog. On a batch Catch-up the section is read only: no controls, no menu.

### 2.7 The menu, the verbs and the dialogs

There is no menu. There is one sheet, About, and it is the door for every lifecycle verb and every personal setting. It opens from the head's line on the home and from a panel on the desk (long press; the desktop "..."). On a phone it is a bottom sheet in Float white, 20.8px top corners, a 36x4 grab handle, rising to 92% of the screen and scrolling inside; on desktop it is a panel 420 wide sliding in from the right edge, full height, the same material. The backdrop is the dialog backdrop. Close is the handle, a swipe down, the X at top right, or the backdrop.

Its contents, top to bottom, separated by 26px and a 12px caps label each, with no rules:

- The name in h2 and one line, "Every month · Keeper Sanan Shankar" (or "Everyone from '11 is in this · every three months").
- PEOPLE: 2.6's roster, with its controls when the Catch-up is a people one.
- YOU: three rows. "Reminders" with its value at right in muted and a chevron ("Daily", "Last day", "Off"; tap opens a three-row picker in the same sheet). "Archive" as a plain row. "Delete" in red. On a batch Catch-up, no Delete.
- KEEPER, Keeper only: "Rhythm" with its value and a chevron. "Hold the next Round" as a switch row, with a 13px muted line under it, "A Round already running finishes on its own." "End this Catch-up" in red, last.

Archive acts at once: the sheet closes, the panel leaves the desk with auto-animate, and a toast says "in the loop archived" with "Undo" for six seconds. Delete opens ConfirmDialog: title "Delete in the loop", description "It goes to the bin for 30 days, then your place in it goes with it.", Cancel and a red "Delete". End opens ConfirmDialog: title "End in the loop", description "Everyone keeps every Round. Nothing new will open.", Cancel and a red "End". Those are the only two dialogs in Catch-ups. Everything else is a sheet, a page or an in-place change.

### 2.8 The batch Catch-up

It is told apart by its name and its line and nothing else. Its name is the batch, "Batch of '11", and its line reads "Everyone from '11 · 39 people" on the desk and "Everyone from '11 is in this · every three months" in the About sheet. No badge, no icon.

Its first day: the desk panel shows the flock of the batch's birds as its picture (there is no photograph yet) and the state line "No Round yet". Its home's Now panel is the no-Round state in 2.3, with the one button "Start the first Round", open to any member. Nobody keeps it (the architecture's O1, first answer): the About sheet has no KEEPER section, and the Round verbs on the Now panel (open answering early, extend, nudge, publish now) are shown to every member of the batch. Its people section is read only. Someone who joins the site later is on the desk with the batch's panel already there and every earlier Round on its shelf.

### 2.9 Archive and delete

Both live in the About sheet's YOU section, and the desk's long press opens that sheet, so archive is two taps from the desk and never a swipe you can do by accident. An archived Catch-up leaves the desk and stops its reminders. It lives behind the archived row (2.1). Opening it brings it back. Delete on a people Catch-up is how you leave; the 30-day bin is said in the dialog and in the archived row. A batch Catch-up cannot be deleted, so its YOU section has two rows, not three.

### 2.10 Comments, a song card, a photo wall

Comments sit inside the answer tile. Collapsed, they are a speech glyph with a count at the trailing end of the tile's identity row, next to the heart. Open, they are the post comments family under the answer's content: a hairline, then comment rows (bird 28, name in 14px medium, text in 15px, a heart at the row's end), then the composer pill, "Write a comment", which supports @ to pick a member of this Catch-up. Opening never scrolls the page. A comment on your answer is a notification that lands on that answer with its comments open.

A song card renders under an answer's text whenever the text contains a music or video link, whatever the question. The text is never rewritten; the link stays inline as a leaf link and wraps with `overflow-wrap: anywhere`. The card is ours: a mist well at 12px radius (the tile's one well), art at 64x64 and 8.8px radius on the left (a 96x54 thumbnail for video), the title in 15px medium, the artist or channel in 13px muted, and the source as a 12px caps word, "SPOTIFY" or "YOUTUBE". Tapping the card opens the link in a new tab. The first such link in an answer gets the card; further ones get a 28px chip with the title. If resolution fails the link stays a link and no card is drawn.

A photo wall is a question whose answers are photographs. Its page in the reader has no tiles: after the heading, the photographs run as justified rows at the page's inner width, three or two to a row on a phone, four or three on desktop, 4px apart, 8.8px corners. Tap opens the viewer at that photograph, and the viewer's caption bar names its owner with bird and name. On desktop, hover shows the same bird and name in the photograph's bottom left corner. Hearts and comments on a wall are per photograph, inside the viewer.

### 2.11 The notification

Each transition is one row in the app's notification list, and each lands where the state says:

- "in the loop · Round 2 is collecting questions until Friday" lands on the home.
- "in the loop · answers are open until Sunday" lands on the composer's first unanswered page.
- "Sanan nudged: four days left to answer Round 2" lands on the composer.
- "in the loop · Round 2 is out" carries the shelf cover as its body and lands on the reader's cover page.
- "Rohan Iyer commented on your answer" lands on the reader at that answer's page, scrolled to the tile, with its comments open.

The row is the app's row: an actor's bird (or the Catch-up's picture for a Round event, 40px at 8.8 radius), the text, the time.

### 2.12 The empty states

A brand-new member with a batch year opens the desk and finds one panel, their batch's, with the flock as its picture and "No Round yet", plus the "Start a Catch-up" pill. One with no batch year finds the title, one line in 16px, "You are not in a Catch-up yet.", and the pill.

A batch with no Round yet is 2.8's first day.

A Round with one answer: the cover says "Aditi wrote in" with one bird beside the name; every question page shows one tile (or "Nobody answered this one." in 16px muted where she skipped it); on desktop the tile sits alone in a 680 column, no second column drawn.

### 2.13 The pressure fixture

Section 7, in full.

## 3. The reader, precisely

The reader is `/catchups/round/[id]`. It takes the whole screen: no sidebar, no green bar. It is a horizontal row of pages in a native scroll-snap container (`scroll-snap-type: x mandatory`), one page per question plus a cover page at the front and an end page at the back, so Round 1 has thirteen pages. Each page is a full-width column with its own vertical scroll. Nothing about touch is handled in JavaScript: a swipe is the browser's own snap, a tap on a contents row or a Next block is a smooth `scrollTo` to that page's snap point, and the arrow keys do the same on desktop. The page you land on when you open a Round is the cover. A notification for a comment opens the reader already scrolled to that question's page.

Names in the samples below are invented. The Round's real questions are used as printed; the answers are made up in the shape of the real ones.

### The masthead

The cover page prints the cover's fields and nothing else, in this order, at 390 with 16px side margins:

1. The date as a label line, "15 AUGUST 2026", 12px uppercase tracked, leaf.
2. "Round 1" in display Baskerville (30px at 390, 42px at 1512), tight tracking, ink.
3. The picture: the Round's most-hearted photograph, edge to edge at 390 (390 wide, 4:3, 292 tall, no radius), drawn by PhotoFrame so a tall photograph sits on its blurred bed. At 1512 it sits in the 680 column at 16px radius, 680x510. Under it, right-aligned, 12px muted: "Photograph by Aditi Menon". A Round with no photograph gets the flock instead: the writers' birds at 40px scattered on paper inside the same band, and no credit line.
4. "13 WROTE IN" as a label line in cinnamon, then the writers as a wrapped flow: bird 24 beside the name in 15px, 8px between bird and name, 12px between items, 8px between lines. Thirteen names take five lines at 390 and two at 1512. One writer prints as "Aditi Menon wrote in".
5. "11 QUESTIONS" as a label line in sky, then the contents: each question as a row with a Baskerville 14px numeral in a 24px column at the left, the question in Baskerville 17px, wrapping in full, and under it "13 answers · 4 photographs" in 13px muted. Rows are 12px apart with no rules. Each row is one tap target to its page. At 1512 this block is not drawn, because the rail holds it.
6. The Next block (below).

The Catch-up's name is not on the cover page, because the bar above it already prints it, and the shelf cover on the home lives under that name anyway. The shelf cover (208 wide on the shelf, 171 at 390) prints the same fields in the same order at a smaller size: date, "Round 1" in h3, the picture at 4:3, and the writers as three birds at 20px with "Aditi, Rohan and 11 others" in 12px under them, then "11 questions" in 12px muted. The large cover on the home adds the writers' full flow and the first three questions in full followed by "and 8 more questions". Anyone who has seen the shelf cover recognises the cover page: same order, same words, bigger.

As you scroll the cover page, all of it goes up under the bar. Nothing on it is sticky. What stays is the bar itself, which is the masthead's residue: the Catch-up's name on the left, the counter on the right. On desktop the rail's head, "in the loop" over "Round 1 · 15 August 2026", is that residue and never moves.

### The navigator, on a phone

RESTING. A bar across the top of the screen, fixed, in the glass material (translucent paper with backdrop blur) so the page shows through as it passes under. Its first row is 56px tall: at the left, 16px in, the Catch-up's name in Baskerville 16px medium, ink, and at the right, ending 16px from the edge, the counter in 12px uppercase tracked leaf: "CONTENTS" on the cover and end pages, "3 OF 11" on a question page. Both are 44px tap targets. Along the bar's bottom edge runs the spine: a 2px line made of eleven segments with 2px gaps, the segments up to and including the current page filled Canopy, the rest the border colour. On the cover page none are filled; on the end page all are.

On a question page the bar has a second row, 20px tall, under the first, so the bar is 76px. That row holds the running head: the question in 14px Source Sans, ink, one line, left-aligned at 16px, clamped with an ellipsis if it does not fit. It is drawn at opacity 0 while the page's own heading is in view and fades to 1 over 160ms once the heading's bottom edge passes under the bar. Only opacity changes; the bar's height never does. On the cover and end pages the second row does not exist and the bar is 56px. Tapping the running head scrolls the page back to its top.

So the current question is named on screen at every scroll position: large, on the page, at the top; then in the bar's second row once it has gone. And the sense of place is the counter and the spine, which change only at a page turn.

OPEN. Tapping the counter opens the contents sheet. It rises from the bottom over the dialog backdrop (tint plus blur, opacity only) to 70% of the screen, 590px at 844, in Float white with 20.8px top corners, a 36x4 handle at its top centre, 16px padding, and it scrolls inside. Its first line is "ROUND 1 · 11 QUESTIONS" in 12px caps muted. Then the rows, 10px vertical padding each, no rules: "Cover" in 14px muted; then the eleven questions, each with its numeral in 14px muted in a 24px column, the question in 16px Source Sans, ink, wrapped in full, and "13 answers · 4 photographs" under it in 13px muted; then "The end" in 14px muted. The current row carries the selected wash, Canopy at 10% with its text in Canopy, at 8px radius, and the sheet opens scrolled so that row is in view. Tapping a row closes the sheet (exit faster than the entrance) and slides the reader to that page, at its top.

The forty-answer question reads in the sheet exactly like its neighbours, with one difference: "Are you a rider? Are you seeing someone?" over "40 answers · 5 photographs". The number is the whole signal, and it is enough; a person deciding whether to turn to it can see it will be long. The sheet has no sub-navigation inside a question and I do not pretend it does. Inside that page you scroll, the running head keeps naming it, the counter is one tap from anywhere, and the next page is one swipe away from anywhere.

### The desktop plan

At 1512 the screen is two columns and no shell.

The rail is 280 wide, full height, fixed, paper, with a hairline right border. At its top, 24px down and 16px in: the PeaksMark with "Rishi Valley" in Baskerville 16px beside it, one tap target that goes to the desk, `/catchups`, which is inside the shell, so from there the sidebar is right where it was. This is the door back out of the product. 80px down: "in the loop" in Baskerville 20px, which goes to the home. Under it in 13px muted, "Round 1 · 15 August 2026". Then the contents, the same rows as the sheet, in 14px, each question wrapping in full to at most three lines with the count at the right, the current row in the selected wash at 8px radius, and "Cover" first and "The end" last. The rail scrolls on its own if the list outruns the window; eleven questions do not.

The pages sit to the right of the rail, in the remaining 1232px. A question page's content column is 904 wide, centred (x 444 to 1348): the heading spans it, and under the heading the answers run in two columns of 440 with 24 between them, packed by height so short answers sit beside long ones and the page ends level. Reading order is down the left column, then down the right. A builder can pack on the server from what is known (text length, and every photograph's stored dimensions give its height at 408 wide) and correct on the client after fonts load. The cover page and the end page use a 680 column, centred (x 556 to 1236). Below 1280 the answers go to one column of 680. The page's vertical scroll is the page's own; the rail does not move.

The way back on desktop is the rail's head: the name for the home, the mark for the app. Arrow keys turn pages. A trackpad's sideways swipe turns them too, because the container is the same scroll-snap row it is on a phone.

### A question's heading

At the top of every question page, after 24px: the question in Baskerville, h2 24px at 390 and h1 32px at 1512, tight tracking, ink, wrapping as many lines as it needs. Under it, if the question has a named asker, "asked by Kabir Sethi" in 13px muted; nothing at all if it was asked anonymously. No "Question 5", no numeral, no rule under it. The page's number is in the bar and the rail, which is where numbers are navigation. 16px below the heading, the first tile.

### The answer tile

A paper card, 16px radius, no border, at the page's inner width: 358 at 390 with 12px padding (334 inside), 440 on desktop with 16px padding (408 inside). Tiles are 10px apart. The tile has three parts stacked, and only the first is always there.

The identity row: BirdAvatar at 40 on the left; beside it the name in 15px medium ink with the batch line in 11px caps muted under it ("Kabir Sethi" over "BATCH OF '11"); and at the trailing end, top-aligned, the heart and the comment control side by side, 16px apart, each a 44px target: the LoveButton at 20px with its count in 14px, then a speech glyph at 20px with its count (the glyph alone when there are none). This row is the tile's chrome, all of it. There is no band at the bottom.

The content, 12px under the identity row: the answer text in 16px with 1.6 line height, Source Sans, ink, in full, never clamped. Then, if present, photographs; then a song card. Comments, when open, come last.

Four states:

1. Text only. Identity row, text. Rohan Iyer, '11, on question 7: "Sanan, obviously." The tile is 12 + 40 + 12 + 26 + 12 = 102px tall at 390. That is the one-word answer packed: no empty band, the heart in the row it was already sharing with his name. Ananya Ghosh's 2,000 characters on question 2 run about forty lines at 334 wide, roughly 1,100px of tile; on desktop at 408 wide, about thirty-four lines, and the packer puts three short tiles beside it in the other column.
2. One photograph. Text, then 12px, then PhotoFrame at the inner width: a wide photograph at its true shape; a tall one at 3:4 on its blurred bed (334x445 at 390), capped at 700 tall on desktop. 12px corners. A caption under it in 14px, clamped at four lines with "More", which becomes "Less". Tap opens the viewer at that photograph.
3. Three photographs. Aditi Menon, '11, on question 1: "Learnt to sail on Pulicat lake. Capsized twice, once on purpose." Then justified rows at 6px gaps: the two portraits (1200x1600) side by side at 164 wide and 219 tall each, then the landscape (1288x966) at 334 wide and 250 tall. 475px of photographs, no white either side of a tall one, and tapping any of the three opens the viewer at that index, where swiping between them is the viewer's job.
4. A song link. Kabir Sethi, '11, on question 5: "Been looping this all August, don't ask https://open.spotify.com/track/2XyQ..." The text is exactly what he typed; the link is a leaf link that wraps at any character so it cannot push the page sideways. 12px under the text, the card: a mist well at 12px radius, 334x88, the art at 64x64 with 8.8px corners on the left, then "Thendral Vanthu Theendum Pothu" in 15px medium, "Ilaiyaraaja" in 13px muted, and "SPOTIFY" in 12px caps muted. Tara Bhat's YouTube link gets the same card with a 96x54 thumbnail and "YOUTUBE". The card is the tile's one well; a tile with a card and a photograph shows both, the photograph first.

A tile taller than the screen keeps its identity row stuck to the top of the tile's visible part (position sticky under the bar), so a 6,000-character answer never becomes text from nobody.

### The comments

Collapsed, a comment thread is the speech glyph and its count in the identity row: "1". Nothing else in the tile refers to it.

Open, after a tap on the glyph, the tile grows in place with auto-animate and no scroll: a hairline 12px under the content, then the comment rows from the post comments family, each with a bird at 28, the name in 14px medium, the text in 15px, and a heart at the trailing end; then the composer pill, "Write a comment", 40px tall, with @ to pick a member of this Catch-up. Under Kabir's card, Rohan Iyer: "This song is older than you and you are right." Tapping the glyph again folds it. A comment on your answer arrives as a notification that opens this page with this tile's thread open.

### The heart

The shared LoveButton, red, with its count, in the identity row's trailing cluster. A tap fills it on the spot. Its position never changes with the tile's height, and it never sits alone in a band.

### The way back, from any depth

The Catch-up's name, at the left of the bar on a phone and at the top of the rail on desktop, at every scroll position on every page. One tap, and you are on the home, inside the shell, with the green bar or the sidebar back. There is no other back control in the reader, because there is nothing else to go back to: the reader is one level deep.

### The end of the Round

The last page. Bar: the name, "CONTENTS", all eleven segments filled. Then, from the top: "That's Round 1." in display Baskerville, the one friendly line on this surface. Under it, 16px: "Round 2 opens on 15 September. Questions are collecting now." and a leaf text control, "Ask a question for Round 2", which goes to the home with the Ask row open. Then a paper tile, 358 wide and 88 tall at 390, with "in the loop" in h3 and "Every month · 23 people" in 14px muted and an arrow at the right, which goes to the home. If earlier Rounds exist, "EARLIER ROUNDS" and their shelf covers, 2-up. If the Catch-up has ended, the second line reads "in the loop ended on 3 March 2026." and there is no Ask control. The hoopoe, if the mascot rig can stand on this page, stands at its foot; this is its one place in Catch-ups. If it cannot, the page ends with the tile.

### The first screen at 390

Top to bottom, on opening Round 1:

- 0 to 56: the bar. "in the loop" at the left. "CONTENTS" at the right. The spine along the bottom edge, no segments filled.
- 80: "15 AUGUST 2026", leaf label.
- 100 to 138: "Round 1", display 30px.
- 154 to 446: the photograph, edge to edge, 390x292: Aditi's lighthouse at Pulicat, a portrait frame sitting on its own blurred edges.
- 454: "Photograph by Aditi Menon", right-aligned, 12px muted.
- 482: "13 WROTE IN", cinnamon label.
- 502 to 662: five lines of birds and names: Aditi Menon, Rohan Iyer, Priya Nair; Kabir Sethi, Meera Krishnan, Vikram Rao; Tara Bhat, Arjun Pillai, Nikhil Reddy; Ananya Ghosh, Devika Shetty; Samir Khan, Leela Varma.
- 688: "11 QUESTIONS", sky label.
- 708 to 772: row 1, "What is a fun thing you did this summer?" in 17px Baskerville over two lines, "13 answers · 4 photographs".
- 784 to 844: row 2 begins, "Something new you did recently that you did not think you would do.", cut by the screen's edge.

Nine more rows and the Next block are below. A swipe left from anywhere on this page lands on question 1.

### The first screen at 1512

- The rail, 0 to 280: the mark and "Rishi Valley" at 24; "in the loop" at 80; "Round 1 · 15 August 2026" at 108; "Cover" at 148 in the selected wash; the eleven questions from 196 to about 796, each two or three lines of 14px with its count at the right; "The end" at about 800.
- The column, x 556 to 1236: "15 AUGUST 2026" at 64; "Round 1" at 88, 42px; the photograph at 152 to 662, 680x510, 16px corners; the credit at 670; "13 WROTE IN" at 700 and the flow on two lines to 784; the Next block at 816 to 904, a paper tile with "NEXT" in 12px caps and "What is a fun thing you did this summer?" in Baskerville 20px and an arrow at its right.
- Everything to the right of 1236 and left of 556 is the page base with the valley photograph at 11%.

### A mid-scroll screen at 390, deep in question 5

- 0 to 76: the bar. "in the loop" left, "5 OF 11" right, the running head "Songs you've had on repeat lately" at 14px in the second row, fully visible because the heading is long gone. The spine: five Canopy segments, six border-coloured.
- 76 to 128: the tail of Meera Krishnan's tile: "...and the Interstellar soundtrack when I need to finish something." and the tile's bottom edge.
- 140 to 370: Kabir Sethi's tile. Identity row at 152: his bird, "Kabir Sethi", "BATCH OF '11", and at the right "7" beside the heart and "1" beside the speech glyph. Text at 204: "Been looping this all August, don't ask" and the Spotify link wrapping onto two leaf lines. The card at 270 to 358: the art, "Thendral Vanthu Theendum Pothu", "Ilaiyaraaja", "SPOTIFY".
- 382 to 600: Tara Bhat's tile. "This live version. Skip to 2:10." and a YouTube link; the card with a 96x54 thumbnail, "Malargal Kaettaen, live at the Academy", "YOUTUBE". Heart "3".
- 612 to 714: Vikram Rao's tile. "Nothing new. Same four songs since 2019." One line. Heart "12", which is why it is the most-hearted answer on the page.
- 726 to 844: the top of Ananya Ghosh's tile, identity row and the first three lines of a list of songs typed as plain text, cut by the screen's edge.

Nothing on this screen says "Question 5". The bar says which page this is, the spine says how far through, and a tap on the running head goes to the top of the page where the question stands in 24px.

## 4. The design system, kept and broken

Kept, by default and without exception: the palette, with no new hex anywhere (the spine, the selected row and the pills are Canopy; links, the date label and the eyebrow are leaf; the heart is the heart red); Baskerville for every heading, numeral and question, Source Sans for every answer; the radius ladder inside every card (16 tile, 12 photograph and well, 8.8 thumbnail, pill controls, 20.8 on the floating sheets); the surface ladder (paper tiles and panels on the page base, Float for the sheets and the two dialogs, mist for the one well a tile may hold, the song card); hover as the state layer and nothing that moves under a cursor; SpringPress on every control; auto-animate on the desk, the comment threads and the roster; AnimatePresence with a real exit on the sheets; the shared LoveButton and BirdAvatar; the dialog material for Delete and End, and its backdrop for the sheets; the menu material for the one Keeper row menu in the roster; the focus recipe; the shimmer for loading, with the bar and the name painted at once and the tiles shimmering under them; the mobile rules (the sheets pad for the home indicator, every target is 44px, the composer's field never takes focus on its own when a page opens); the middle-dot rule through `metaLine`; and the eyebrow colours, rotated so the cover's three labels are leaf, cinnamon and sky and no surface repeats one.

Broken, on purpose:

1. The shell. The reader and the composer drop the sidebar and the green bar and carry their own bar. The break is the point of the direction: an issue is an experience, like the image viewer, and one bar with the name in it is the whole navigation a reader needs. The desk and the home stay in the shell.
2. The cover photograph at 390 runs edge to edge with no radius, where the ladder would give a photograph 12px corners inside a card. It is not inside a card; it is the cover of an issue, and a cover bleeds.
3. The answer tile's chrome. The heart and the comment control move up into the identity row and the card's bottom band goes. The feed's PostCard keeps its own chrome; this is the reader's tile, and the architecture allows the chrome to change. The reason is paragraph 31: a one-line answer is now 102px, not three centimetres of white.
4. A sheet is a new material. The dialog rules say centred, max-w-sm, a right-aligned footer. The contents sheet and the About sheet are anchored to the bottom edge on a phone and the right edge on desktop, have no footer, and hold a list. They should be built once in `ui/` as the app's sheet, next to the dialog, and never per screen.
5. Two columns of answers on desktop. The app's content runs in one column everywhere. Here, above 1280, a question's answers pack into two, because a long answer beside a one-liner is what makes the page end level and uses the width paragraph 6 complained about.

The one thing on screen that could only be this app: a Round that has no photograph gets a cover made of the writers' own birds, and every cover, photograph or not, prints those birds beside those names. Fifty valley birds that each belong to one person is a thing no other product has, and the cover is where it is spent.

## 5. Letterloop, closed and open

- L-a, comments with @mentions: closed. The thread in the tile, the composer pill with @ to pick a member of this Catch-up.
- L-b, a Music section with a card: closed and widened. The card renders under any answer that contains a music or video link, on any question, from our own card, never an iframe.
- L-c, a Photo Wall: closed. A question whose answers are photographs, printed as justified rows on its own page.
- L-d, "the next issue arrives on": closed. The end page says when Round 2 opens, and the Now panel says it on the home.
- L-e, a reaction picker: open on purpose. One heart is the app's reaction and the tile has room for exactly one.
- L-f, who has replied and who has not: closed. Names with birds, and "Still to write" by name, on the Now panel while answering.
- L-g, reminders: kept. Daily, last day, off, in the About sheet.
- L-h, the Album: closed. "All photographs · 34" under the shelf on the home, every photograph from every Round in justified rows by Round, each opening the viewer.
- L-i, Download PDF: open, track M. One note for that track: a page per question is already the PDF's page structure, so the reader and the magazine can share a spine.
- L-j, Mementos: open.
- L-k, themes: no.
- L-l, filter an issue by member, sort replies: open. The contents sheet is by question, and I did not add a second axis.
- L-m, a banner and a logo per loop: half closed. The Catch-up's picture is derived from its latest Round and nobody uploads one.
- L-n, four roles: one role, Keeper, as the architecture says; a batch has none.
- L-o, quick actions on the index: closed. The state line on every desk panel, and one Answer pill only while answering is open.

## 6. Live and static

Live, because it cannot be judged from a picture: the phone reader end to end at 390, drawn from the real Round: the swipe between pages, the cover page scrolling under the bar, the running head fading in as a heading leaves, the spine filling, the counter opening the contents sheet and a row in it turning to a page, the Next block, the heart, a comment thread opening in place under one answer, the song cards on question 5 with the real links resolved or a fixture of three, and the photo rows on the three-photograph answer opening the viewer. The desktop reader at 1512 with the rail, the arrow keys and the two-column packing, on the same Round.

Static, as compositions in the room: the desk at 390, 1512 and 1920 with two panels and the archived row; the home in its seven Now states as a strip the judge can step through; the composer at one question page and at its last page; the About sheet for a people Catch-up and for a batch; the two dialogs; the five notification rows; the three empty states; and the pressure frames in section 7. The end page may be static, but it is cheap to have live at the end of the swipe, and it should be.

## 7. Under pressure

- One answer. The page shows one tile at the top and nothing under it. On desktop it sits alone in a 680 column; the packer never draws an empty second column. The cover says "Aditi Menon wrote in". It looks fine because a tile never needed company.
- Forty answers. On a phone that page is about 10,000px of tiles, and I have no sub-navigation inside it: the running head keeps the question named, the counter and the next page are one tap and one swipe away, and a tap on the running head goes to the top. On desktop it is twenty tiles a side. Honest limit: a person looking for one friend's answer among forty scrolls for it.
- A 6,000-character answer. About 3,300px of tile at 390. The identity row sticks to the tile's top while the text scrolls, so the author never leaves. On desktop the packer stacks six or seven short tiles beside it. No clamp, no More.
- A twenty-four-photograph wall. Eight rows of three at 390, 4px apart, about 1,000px. Names are in the viewer and on desktop hover, not under every thumbnail. Honest limit: on a phone you find out whose photograph it is by opening it.
- A 300-character question. The page heading wraps to about six lines of 24px at 390, which is fine because it is the heading. The running head shows one line and an ellipsis. The contents sheet shows it in full. The rail clamps it at three lines, and the full text is the page's own heading one click away. That rail clamp is the one place this direction cuts a question short.
- A 78-character name. The identity row's name wraps to two lines at 15px and the batch line moves down; the heart cluster stays at the top right. In the writers' flow the item wraps as text does. In the rail nothing changes, because names are not in the rail.
- An emoji-only answer. Rendered at 32px, the way Messages enlarges an emoji-only message, so a tile that says one thing says it at a size worth a tile.
- A pasted 123-character link. It wraps at any character in leaf and never pushes the page sideways. If it is a music or video link it gets the card; if it is anything else it stays a link with no card.
- A Round nobody answered. It does not come out. When the answering window closes with no answers, its questions carry over and the Now panel says "Nobody answered Round 2, so its questions have moved to Round 3, which opens on 15 October." The desk's state line says the same in five words. There is no empty cover on any shelf.

## 8. The two things I am least sure I got right

### Pages instead of one scroll

The whole direction rests on a page per question, and the research in the architecture carries a warning that points at it: Wikimedia lost reading time when it made people tap to reach the next section. A swipe is not a tap on a collapsed header, and the Next block at the bottom of every page is a big target that says what is coming, but I cannot prove from a desk that thirteen people will read as far into Round 1 as they would in one long scroll. On desktop the doubt is sharper, because a mouse does not swipe and a click on the rail or the Next block is a decision a scroll never asks for. If the sketch room shows people stopping at page 3, the fallback that keeps the rest of the direction intact is a long scroll on desktop only, with the rail as it is; the phone should keep its pages.

### Leaving the shell

The reader and the composer drop the sidebar and the green bar. That is the "end to end" of paragraph 42, and it buys the one bar that makes the phone navigation work, but it also means the two screens people spend the most time on in Catch-ups are the two with no Canopy across the top, and the owner may open the room and feel he has left his app. I have leaned on the fonts, the paper, the birds, the Canopy spine and the selected row to hold it, and on the name in the corner as a one-tap return. If that is not enough, the cheapest repair is to paint the reader's bar Canopy with white text, which keeps everything else in this file and costs only the glass.

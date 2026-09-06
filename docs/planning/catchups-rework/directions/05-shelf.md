# Covers that draw themselves

**Thesis:** Every Round earns a cover from what is in it, the list and the home are shelves of those covers, and the reader is the first page of the thing that could be printed, so the web Round and the magazine share one grammar.

**Designer:** 05 shelf, reading.

**The bet, as given:** THE SHELF. The list is a row of covers, and a Catch-up and a Round each have a derived picture, the way a Letterboxd list gets its posters from what is in it. The reader is print-like, and its grammar is shared with the magazine (the campaign's track M, brief paragraphs 21 and 30), so a Round on the web already looks like the first page of the thing that could be printed. Before, on the home, is a shelf. Say what a cover looks like when a Round has no photographs.

## 1. The idea

You open Catch-ups and you are standing in front of a shelf. Two or three covers stand on it, one per Catch-up, each the size of a paperback, each with a picture nobody uploaded: the birds of the people in it, printed on paper under the Catch-up's name. Under each cover is one line saying what is going on: "Round 2 · answers close Sunday", "Round 1 is out", "Ended 3 June". Below that shelf, when something has come out lately, a second shelf holds the Rounds that just came out, as their own covers, and a Round's cover is a photograph from inside it.

You tap a cover and you are at a desk. The Round being made right now is a plate on the desk, and it fills in as the Round fills in: the questions people ask are typed onto it as cover lines, the names of the people who write in are printed onto it as they write, and when it is published its photograph arrives and it slides down onto the shelf beneath, where every earlier Round already stands. That shelf is Before. The head above it says the name, the rhythm and the count of people, and holds the one door for every verb.

You tap a Round's cover and you are holding a page. A sheet of paper with a nameplate across the top, a dateline, the names of who wrote in with their birds beside them, then the first question as a section head and the answers set as typed entries under it, one after another, without a box around any of them. At the bottom of the phone screen, where a printed page carries its folio, this page carries one too: the name of the Catch-up at the left, the question you are in across the middle, "5 / 11" at the right. Tap it and the contents of the Round rise as a sheet. Tap the name and you are back at the desk.

The bet is that a picture you did not have to upload is what makes a two-item list look finished rather than thin, and that the Round in progress is better as an object you watch fill in than as a console of pills. The second bet is that borrowing print's grammar for the reader solves three things at once: the density of a one-line answer (print runs short pieces inline), the phone's navigation (print has folios and a contents page), and the magazine, because a reader that already looks like a page is a page the PDF can be printed from with the comments taken out.

What it refuses: cards around answers, teaser sentences, a View button, three dots on a tile face, a chip row, numbered question headings, a carousel on a page, a hover that moves anything, a Now panel that is a stack of pills. It refuses to scale a cover with the window: a cover is a fixed size the way a poster on Letterboxd is 70 pixels wide whether the window is 1000 or 2500, so the shelf never stretches and the page is allowed to be short.

What it most risks resembling: Apple Books' library, a grid of covers on a wooden shelf, and inside the reader, a Substack post. It is neither. Books' covers are uploaded and its shelf is skeuomorphic wood; these covers are derived, stand on paper, and their labels are live state. A Substack post has one author and no way around it; this page has thirteen authors, a folio that names where you are, and a contents sheet one tap away.

Where it departs from the architecture's RECOMMENDED lines, and why:

- **The list carries a second shelf of Round covers** ("Recently out"), which 1.3 allows ("a cover is a pointer, and pointers may go anywhere") and 1.4 does not list. It exists because two Catch-ups on a 1512 screen make a page that is 70 percent background (recon §2), and because "what came out" is why most members open this page. It is hidden when nothing came out in the last 21 days, and it never shows a Round nobody answered.
- **The cover of the latest Round lives in Now until the next Round opens, and only then moves to the shelf.** 1.3 puts the cover in Now and Before holds every published Round; drawn literally that is the same cover twice on one screen, which is a cousin of the thing ¶15 hates. Here Before is everything that is not Now, and the move from one to the other is animated once.
- **A batch Catch-up has no Keeper** (1.8's first proposal). Its cover, its home and its people sheet all say "everyone from 2011" rather than naming a person.
- **Pause is the hold** ("Don't start the next Round until I say"), drawn as a stamp on the plate, never as a banner.
- **The door is a menu, not the people sheet.** The people sheet holds the roster only. A menu on the head is one object; a sheet that is a roster and a settings page at once is two.
- **Short answers print inline** on the byline's own line. The tile's content stays (bird, name, batch, answer, heart, D12); its shape does not, which D12 also says.

## 2. The screens

Tokens used throughout, so nothing is re-derived: the space ladder at a 16px root is xxs 4, xs 6, s 10, m 16, l 26, xl 42, xxl 68, 3xl 110 (all in pixels, rounded). The radius ladder is 16 container, 12 nested, 8.8 thumbnail, pill for anything pressed that is one row tall. Surfaces: page `#E4E1D5`, paper `#F5F2EA`, mist `#ECE8DD`, float `#FFFFFF`. Type: Libre Baskerville for anything that is a title, Source Sans 3 for everything else; the body is 16px/1.65; "label type" below means 12px uppercase at 0.08em tracking; "the byline line" means the app's existing 10.5px uppercase 0.07em semibold line under a name ("BATCH OF '11").

**The cover, once, because every shelf uses it.** A cover is two parts and one click target: the **plate** and the **label**.

The plate is a portrait rectangle at 3:4, paper, square-cornered (2px, effectively square; section 4 owns this break), carrying the `.card-elevated` shadow so it stands off the page. It is a fixed pixel size per shelf and never scales with the window. Across the top of the plate, in Libre Baskerville with tight tracking, is its **nameplate**: the Catch-up's name on a Catch-up cover, "Round 1" on a Round cover. Under the nameplate, in label type, one line: the rhythm on a Catch-up cover ("EVERY MONTH"), the date on a Round cover ("15 AUGUST 2026").

Below the nameplate band the plate carries its **picture**, and the picture is derived:

- **A Round with photographs** shows one of them, edge to edge below the nameplate band, cropped to fill, positioned by the face-safe `objectPosition` the app already stores for every measured photograph. Which one: the most-hearted photograph that survives a 3:4 crop (a portrait or a square), then the most-hearted of any shape. A landscape photograph that wins is not cropped to a slot; it sits across the plate at its true shape, centred in the space under the nameplate, paper above and below, the way a print is tipped into a cover. Hearts arrive after publishing, so a cover can change in its first days and settle; the magazine freezes whatever it is at the moment of printing. A Keeper can pin any photograph as the cover from the viewer ("Use as the cover"), and a pinned cover never moves.
- **A Round with no photographs** shows the **flock**: the birds of everyone who wrote in, drawn as glyphs on the paper, in rows, like a plate in a field guide. Six writers or fewer: 40px birds in two columns, centred. Seven to fifteen: 32px in three or four columns. More: 26px in five columns, and the flock stops drawing at thirty; it is a picture, and the label beneath carries the count. A Round nobody wrote in has an empty plate: nameplate, date, and paper.
- **A Catch-up cover** always shows the flock of everyone in it, because a Catch-up is its people and a Round is a moment. So the batch's cover is thirty-nine birds under "Batch of 2011"; a people Catch-up with four members is four large birds under its name.

Text on a plate is ink on paper, never white on a photograph, so no scrim is ever drawn; the nameplate band is paper, and the photograph starts under it.

The label is the lines under the plate, left-aligned to the plate's edge, in Source Sans: on a Catch-up cover, the state line ("Round 2 · answers close Sunday") at 13px, with a 6px leaf dot before it when there is something for you to do or read; on a Round cover, who wrote in ("Mohini Rao, Cyan Prasad and 11 others") at 13px ink, two lines at most, then "11 questions" in 12px muted. Two names then "and N others" is the rule, so the line is always the same shape. A cover with a name somewhere other than its own home (the list, a notification) prints the Catch-up's name in the label's first line instead of on the plate, per 1.4.

The whole cover is the click target. Hover is the state layer over the label and nothing on the plate moves. Focus is the leaf outline around the whole cover. Press is the SpringPress sink.

### 2.1 The list

**At 390.** The green bar, then 20px of page, then "Catch-ups" as an h1 (2rem Libre Baskerville) at the left with a "Start a Catch-up" Canopy pill at the right of the same line, 36px tall. The one CTA on the page; the batch Catch-up exists on its own, so most members press this once a year or never.

Below it, after `--space-l`, the shelf. Covers stand two abreast: plate 171 by 228, 16px between, so two fill the 350px measure; a third wraps under. The shelf is drawn as a shelf: a 1px ink line at 25 percent opacity runs under each row of plates, full width of the measure, 6px below the plates' bottom edge, and the plates' shadows fall onto it. Labels sit under the line. Three Catch-ups make two rows; two make one; one makes one cover and a lot of paper, which is fine.

Under the shelf, after `--space-xl`, "RECENTLY OUT" in label type, then a second shelf of Round covers at the same size, newest at the left, up to four, scrolling sideways with scroll-snap when there are more than two, the third peeking 24px in from the right edge. Each label's first line is the Catch-up's name (the cover is away from home), then who wrote in. This shelf is absent when nothing was published in the last 21 days.

At the bottom, only when at least one exists: an "Archived" row, one line, plain, 44px tall: "Archived · 1" at the left and a chevron at the right, and if the bin holds something, "In the bin · 1 · 30 days" as the same row's second line. It opens a page of archived covers drawn at 55 percent opacity, and opening one brings it back.

**At 1512.** The sidebar (248), the main gutter (40), the h1 and the pill on one line inside a 1000px column. The shelf: covers at 200 by 267, 24px apart, one row of up to four, left-aligned. "Recently out" beneath at the same size. The page is about 820px tall with two Catch-ups and two recent Rounds, so it does not scroll, and the right 260px of the screen is the faint valley. Nothing stretches. The tile that grew to 1244px wide with a 938px gap inside it (recon §2) is replaced by two objects that are exactly as wide as a cover is.

**At 1920.** The same. The column stays 1000px, left-aligned inside the 1280 max, and the extra width is page. The owner's "90 percent white space" complaint was about elements pulled apart by the window; covers are not pulled apart, they stand where they stand.

**What you can do.** Tap a cover: the home. Long press a cover on a phone, or hover a cover on desktop and press the "..." that appears at the label's right end (drawn at 16px, hit at 44): the same menu the home's door opens (2.7). Tap "Start a Catch-up": `/catchups/new`. Tap a Round cover under "Recently out": the reader. Tap "Archived": the archived page.

**Copy.** "Catch-ups". "Start a Catch-up". State lines: "Round 2 · questions close Friday", "Round 2 · answers close Sunday", "Round 2 · out on Monday", "Round 1 is out", "No Round yet", "Paused", "Ended 3 June 2026". "RECENTLY OUT". "Archived · 1". "In the bin · 1 · 30 days".

### 2.2 Making one, and starting a Round

`/catchups/new` is one page, and the cover is built in front of you while you fill it in. At 390: the green bar, "New Catch-up" as an h1, and under it the plate at 156 by 208, centred, blank paper with a ghosted nameplate ("Name it" in ink at 40 percent). Under the plate, three fields, in the calm 56px mist-filled floating-label material the sign-up flow uses, because this page is a form: "Name", "People", "Rhythm". Typing the name prints it onto the plate's nameplate as you type. Adding a person adds their bird to the flock on the plate; the first bird lands large and the flock regrids as the count crosses six and fifteen. The People field is the existing picker (search by name), with no "everyone from your batch" chip: the batch Catch-up exists already and this page is for chosen people. Rhythm is a select in the menu material, reading "Every month" by default. At the bottom, one Canopy pill, "Start", full width on a phone, 44px. Pressing it makes the Catch-up and lands on its home, where Now is collecting with no questions yet.

At 1512 the plate stands at 200 by 267 on the left and the three fields sit in a 420px column to its right, the pill under them, right-aligned.

A batch Catch-up is never made here. It exists on the day the batch's first member joins the site, with no Round. Its first Round is started from its home: Now shows the blank plate marked "Round 1" and the one button "Start the first Round", which anyone in the batch may press (1.8). Pressing it opens collecting for a week and lands you back on the same home with the composer for asking a question in front of you.

**Copy.** "New Catch-up". "Name". "People". "Rhythm". "Start". On the batch home: "Round 1", "A Round is a set of questions everyone answers, then everyone reads." and the button "Start the first Round".

### 2.3 The home

The home is head, Now, Before, stacked, at every width.

**The head, at 390.** After the green bar and 20px: the name as a nameplate in Libre Baskerville at 2.2rem (35px) with tight tracking, printed once and plain ("in the loop"). Under it, after `--space-xs`, one line in label type: "EVERY MONTH · 23 PEOPLE", where "23 PEOPLE" is leaf and is the one control that opens the people sheet (44px hit on a 12px line). At the right of the nameplate's line, the door: a "..." glyph, drawn at 16px, hit 44px, per the menu material. Nothing else. No suffix, no countdown in the heading, no rule under it.

**Now, at 390.** After `--space-l`. The plate stands at the left at 132 by 176, and a 202px text column sits to its right, top-aligned with the plate. What is in the column depends on the Round's state and on nothing else. The plate is the same object in every state; what is printed on it changes.

- **No Round yet** (a batch on its first day). The plate: nameplate "Round 1", nothing else, ink at 40 percent. Column: "A Round is a set of questions everyone answers, then everyone reads." in 15px, then after `--space-s` the Canopy pill "Start the first Round".
- **Collecting.** The plate: nameplate "Round 2", the date line "QUESTIONS CLOSE 12 SEP", and under the band the questions asked so far as cover lines: each at 11px Libre Baskerville italic, one line, truncated, up to four, then "+ 3 more" in label type. The plate fills in as the Catch-up asks. Column: "4 questions so far. Questions close Friday." in 15px, then the composer: a 12px-radius bordered text field, one line tall, "Ask everyone something", and under it at 13px "as Mohini ∨", a menu offering "as Mohini" and "anonymously". Not a pill inside a pill. For a Keeper (or, on a batch, anyone), a Canopy pill "Open answering" sits directly under the composer, the first control on the page rather than the last (recon §11: 91 percent down). Below Now, before the shelf, the list of questions asked so far: plain rows, each the question in 15px Libre Baskerville with "asked by Cyan Prasad" or "asked anonymously" in 12px muted under it, a Keeper's drag handle at the left and "✕" at the right, 44px rows, auto-animated on add and remove. The library of questions is a text link at the end of the list: "Pick from the library".
- **Answering.** The plate: nameplate "Round 2", "ANSWERS CLOSE 19 SEP", and under the band the names of who has written in so far, printed as they land, in the byline line style stacked one per row, up to eight, then "+ 1". Column: "9 of 23 have written in. Answers close Sunday." then the one Canopy pill "Answer" (or "Your answers" as a text link if you have, which reopens the composer to edit). For a Keeper, under the pill, two text links in 13px: "Nudge everyone" and "Close answering", the Round's verbs, on the Round. Below Now: "Still to write in" in label type, then the fourteen names as plain text, comma-separated, in 14px muted, tappable to their profiles. Twenty people who know each other; the list is the nudge.
- **Preparing.** The plate: the finished cover arriving: the nameplate, the date "OUT ON 15 SEP", and where the picture will be, the app's paper-to-mist shimmer, because the photograph is being chosen. Column: "Putting Round 2 together. Out on Monday 15 September at 9am." For a Keeper: the Canopy pill "Publish now".
- **Published, next not yet open.** The plate is the Round's real cover, at 156 by 208, larger than Now's plate in any other state, with its label under it ("Mohini Rao, Cyan Prasad and 11 others", "11 questions"). The whole plate and label is the tap to the reader, and it is the only thing on this home that leads to the Round. Column: "Round 2 is out." in 15px semibold, then "Round 3 opens 15 October." in 14px muted. For a Keeper, a text link "Open Round 3 now". Nothing else. No inline Round, no rail row.
- **Paused (the hold).** Whatever the plate was, with a stamp across its lower half: "HELD" in label type at 14px, cinnamon, inside a 2px cinnamon rounded-rectangle, rotated 6 degrees, at 85 percent opacity. Column: what the column was, with one line above it in 13px cinnamon: "Held by Mohini Rao. Round 3 waits until a Keeper resumes." and for a Keeper the text link "Resume". A Round already collecting or answering keeps going and its controls stay live.
- **Ended.** No plate. The column spans the width: "Ended 3 June 2026." in 15px. Nothing else in Now.

**Before, at 390.** After `--space-xl`. "EARLIER" in label type, then the shelf: Round covers at 156 by 208, the shelf line under them, scrolling sideways with scroll-snap when there are more than two, the third peeking. When the latest Round is in Now, the shelf holds the Rounds before it; when the next Round opens and Now becomes collecting, the latest cover slides down the page from Now to the shelf's first slot over 420ms on `EASE_IN_OUT_SCENE`, once, on that first visit. A Catch-up whose only published Round is in Now has no shelf and no "EARLIER" label.

**At 1512.** The head spans a 1000px column: nameplate at 2.6rem left, the label line under it, the door at the far right of the nameplate's line. Now: the plate at 200 by 267 at the left, the text column 480px wide to its right, and for collecting the question rows under the column rather than under the whole panel. Before: covers at 176 by 235 wrapping, five to a row, the shelf line under each row.

**What you can do.** The label line's count: the people sheet. The door: the menu. Every Round verb: in Now. The plate in the published state: the reader. A cover on the shelf: the reader. The nameplate itself does nothing, because you are on it.

**Copy.** As above. The head's line: "EVERY MONTH · 23 PEOPLE" or, on a batch, "EVERY QUARTER · EVERYONE FROM 2011 · 39 PEOPLE". No "Round 2 is out" tile with a link inside it.

### 2.4 The composer

`/catchups/[id]/answer`. It borrows the reader's page so that writing and reading are the same object: the sheet, the nameplate at the top at 17px in Libre Baskerville ("in the loop", the way up), and the question you are answering as a section head at 1.5rem, with "asked by Cyan Prasad" under it. Under the head, the writing box: the calm mist-filled material, 12px radius, growing with the text, placeholder "Your answer". Under the box, one row of text controls at 13px: "Add a photograph" (up to three; on a photo-wall question, one, and the label reads "Add your photograph to the wall"), and at the right "Skip". A song is never a field: paste any link into the box and, on paste, the card resolves under the box (art, title, artist, source), with an "✕" at its corner to say "no card" (Discord's angle brackets, as a button). A second link resolves to a chip. When a link cannot be resolved the plain link stays, underlined, and no skeleton is left behind.

At the bottom of the phone, the same folio the reader uses (section 3): "in the loop" at the left, the question across the middle, "5 / 11" at the right, with the tick strip above it. Tapping it opens the same contents sheet, listing the questions with a tick beside the ones you have answered, so the progress rail that was a pill holding two glyphs (recon §12) is gone. The primary action is a Canopy pill "Share" fixed above the folio, full width less the gutters, padded for the home indicator. After the last question: the hoopoe, "That's you in Round 2." (the one such line this surface gets), "Out on Monday 15 September." under it, and the nameplate to tap back to the desk.

At 1512 the sheet is 720 wide as in the reader, the folio is not needed because the rail lists the questions with ticks, and "Share" sits under the box at the right.

### 2.5 The reader

Section 3, in full. In one line: a sheet of paper with a nameplate, a dateline, the writers with their birds, questions as section heads, answers as typed entries with no chrome, a folio at the bottom of a phone that names the question and opens the contents, and a sticky contents rail on desktop.

### 2.6 Who is here, and who wrote in

**Who is here** lives behind "23 PEOPLE" in the head. On a phone it is a sheet that rises to the large detent (92 percent of the screen), float white, 20.8px top corners, a grabber, and a title row: "23 people" at the left in 17px Libre Baskerville, and for a people Catch-up an "Add" text control at the right that opens a search field in place. When there are more than twelve people, a search field sits under the title (the bordered 40px input, 12px radius). Then the rows, 52px each: bird at 40, the name at 15px semibold, the byline line under it, and "Keeper" with the leaf glyph in the byline line after the batch when they keep it. Order: this Round's writers first, then your own batch, then the rest, alphabetical inside each. A Keeper sees a "..." on each row (menu: "Make a Keeper", "Remove from this Catch-up" in red, last, after a separator; the menu is 200px wide so nothing breaks over four lines). The invite link is a row at the bottom of the sheet, "Copy invite link", a plain text control with the link never printed. On a batch Catch-up the sheet has no Add, no "...", no invite, and its title reads "39 people · everyone from 2011".

On desktop the same sheet is a dialog panel at `max-w-md`, the dialog material, with the same rows and a scrolling list.

**Who wrote in** is drawn three times and in one shape everywhere: names, with birds beside them. On the Now panel while answering (the names on the plate, and the "Still to write in" list under it). On the cover (the label's two names and "and N others"). In the masthead (section 3: four names with 28px birds on a phone, six on desktop, then "and 9 others", which opens the rest in place).

### 2.7 The menu, the verbs and the dialogs

One door: the "..." on the head, and the same menu from a cover on the list (long press on a phone, the "..." that appears on hover on desktop). The menu material: float white, 12px panel, 4px padding, rows at their natural height, the state layer on hover. In order:

- **Reminders ▸** opening a submenu of Daily, Last day, Off, with a check on the current one.
- **Archive**.
- A separator, then for a Keeper of a people Catch-up: **Rename**, **Rhythm ▸** (Every two weeks, Every month, Every quarter), **Hold the next Round** (or **Resume** when held).
- A separator, then in red: **End this Catch-up**, and on a people Catch-up **Delete**.

On a batch Catch-up the menu is Reminders and Archive, and nothing under the first separator: nobody keeps it and nobody leaves it.

Archive acts at once and shows a toast, "Archived. Undo", for six seconds; the cover leaves the shelf with auto-animate. Delete opens a dialog: title "Delete in the loop", description "It goes to your bin for 30 days, then you are out of it.", buttons Cancel and Delete (red, trailing, nothing auto-focused). End opens a dialog: title "End in the loop", description "Nobody can ask or answer again. Every Round stays on the shelf.", Cancel and End. Rename opens a dialog with one field. Nothing else on any surface offers a lifecycle verb. Round verbs (open answering, nudge, close, extend, publish now, open the next Round now) live in Now, as text links or the one pill, and never in this menu.

The settings dialog with nine bands and three stacked pills is gone; its three things are three menu rows.

### 2.8 The batch Catch-up

Told apart by its cover and by one line. On the list its plate carries "Batch of 2011" as the nameplate and the whole batch as its flock, thirty-nine birds where a people Catch-up has six; the label under it is the same state line. On its home the head's line reads "EVERY QUARTER · EVERYONE FROM 2011 · 39 PEOPLE". No other mark, because the rhythm line says everything a mark would.

Its first day: the home's Now holds the blank plate "Round 1" at 40 percent ink and the button "Start the first Round", which anyone may press. Before is absent. The people sheet is read-only and opens with "39 people · everyone from 2011". Someone who joins the site in 2027 finds the batch cover on their shelf on their first visit, with every earlier Round on the home's shelf.

Round verbs on a batch are open to anyone in it, so the "Open answering", "Nudge everyone", "Close answering" and "Publish now" controls in Now appear for every member. The menu holds Reminders and Archive. There is no Delete and no leaving.

### 2.9 Archive and delete

Archive: from the door, at once, with Undo in a toast. The cover leaves the shelf and its reminders stop. The "Archived · 1" row appears at the bottom of the list only when one exists, and opens a page that is the same shelf drawn at 55 percent opacity with a line under each cover, "Archived 2 September"; opening a cover brings it back onto the shelf, and the page says so once in a toast.

Delete: a people Catch-up only, from the same door, with the dialog above. The cover leaves the shelf. "In the bin · 1 · 30 days" is the second line of the same Archived row, opening the same page with those covers under their own label, each with "22 days left" and a "Put back" text control at the label's end, the one place that verb exists. After 30 days the membership goes.

### 2.10 Comments on an answer, a song card, a photo wall

All three are in section 3, in the tile's four states. In short: comments are collapsed to "3 comments" on the heart's line and open in place as a mist well under the answer, with the post comment row and composer pill unchanged; a song card is our own card under the answer's text, art at 56px, title, artist, source, the first link full and later links chips, tapping it opens the real thing in a new tab; the photo wall is a block any question can carry and prints as justified rows across the sheet's full width, edge to edge on a phone, each photograph with a byline under it and a heart, tap to the viewer over the whole wall.

### 2.11 The notification

Every Catch-up notification is one row in the bell: a cover plate at 40 by 53 at the left (the Round's cover, or the Catch-up's flock when there is no Round cover yet), two lines of text, the time.

- Collecting opens: "Round 2 of in the loop is collecting questions." Lands on the home, Now.
- Answering opens: "Round 2 is open. Answer by Sunday 19 September." Lands on the composer.
- A nudge: "Mohini Rao nudged everyone in in the loop." Lands on the composer.
- Published: "Round 2 of in the loop is out." with the Round's real cover as the plate, and the second line "Mohini Rao, Cyan Prasad and 11 others wrote in." Lands on the reader's masthead.
- A comment on your answer: "Cyan Prasad replied to your answer." Lands on the answer inside the reader, scrolled so that the answer's byline is at the top of the sheet and the folio already names its question; the comments are open.
- A heart on your answer: not a notification. It is a count.

### 2.12 The empty states

**A brand-new member.** The list shows one cover, the batch's, with "No Round yet" under it, or "Round 3 · answers close Sunday" if the batch is already running, and the "Start a Catch-up" pill. No "Recently out" shelf, no Archived row. If the batch has published Rounds, those appear on the batch's home shelf and the member can read all of them.

**A batch with no Round yet.** 2.8. A plate at 40 percent ink and one button.

**A Round with one answer.** The reader prints normally: the masthead names the one writer with their bird ("Ravi Menon wrote in."), and each question is a section head with one entry or with "Nobody answered this one." in 14px italic muted. The cover is that one answer's photograph if it has one, else a flock of one bird at 40px, centred, which is fine on paper.

**A Round nobody wrote in.** The masthead says "Nobody wrote in for this Round." under the dateline; the questions print as a contents list (they were asked, and they are worth reading); there are no entries. Its cover is an empty plate with a nameplate and date, and its label reads "Nobody wrote in". It never appears under "Recently out".

### 2.13 The pressure fixture

Section 7 takes each of the nine cases in turn.

## 3. The reader, precisely

The reader is a **sheet**: a paper (`#F5F2EA`) surface that runs from the top of the page to the end of the Round. On a phone it is edge to edge, 390 wide, so the page behind it is never seen except above the green bar; on desktop it is 720 wide with square corners and the `.card-elevated` shadow, standing on the page at x=288 (sidebar 248 plus the 40 gutter), from y=32 to the end. Inside the sheet the gutter is 20px on a phone and 48px on desktop, so the measure is 350px and 624px. Body text is 16px/1.65 Source Sans 3, ink, and on desktop it is capped at 68ch (about 590px) so a 2,000-character answer does not run wall to wall. Everything on the sheet is set flush left. There are no cards, no boxes and no hairlines between entries; the sheet, the type and the space are the whole grammar, and it is the grammar the magazine prints from.

### The masthead

Printed from the cover's fields and nothing else.

At 390, from the top of the sheet (y=56 under the green bar), with 24px of top padding:

1. The **nameplate**: the Catch-up's name in Libre Baskerville at 2.6rem (41.6px), line-height 1.05, tracking -0.025em, ink. "in the loop" is 11 characters and takes one line. A name over 24 characters steps down to 2rem, over 48 to 1.5rem, so the 80-character cap gives three lines at 24px rather than seven at 42.
2. After `--space-xs`, the **dateline** in label type, muted: "ROUND 1 · 15 AUGUST 2026 · 11 QUESTIONS". Middle dots only between segments.
3. After `--space-m`, **who wrote in**: an inline wrapped list, each item a 28px bird then the name at 15px ink with 6px between them and 14px after, so that four names take two or three lines at 350px: "Mohini Rao, Cyan Prasad, Afya Zakir, Anand Vij" then "and 9 others" as a text control in 15px leaf. Tapping it opens the remaining nine in place, same shape, auto-animated. Each name is a link to a profile. The order is the order they first appear in the Round.
4. After `--space-xl`, the first question.

Nothing under the masthead: no rule, no birds row, no chip row, no "13 of the group wrote in".

At 1512 the nameplate and the dateline share a baseline: the name at the left, the dateline right-aligned on the same line, in label type. The writers' line takes six names before "and 7 others" and fits in one or two lines of the 624 measure.

**What happens to it as you scroll.** It scrolls away with the page like a printed masthead does. It is not sticky. What stays on screen is the folio (phone) and the rail (desktop), both of which carry the name, so the way up never leaves.

### The navigator on a phone

**Resting: the folio.** A strip fixed to the bottom of the screen, above the home indicator (`padding-bottom: max(12px, env(safe-area-inset-bottom))`), 44px of hit height with 36px of visible content, the sheet's own paper fading in over the 20px above it (a paper-to-transparent gradient, so text behind it dims rather than stops). It is not a pill and not a bar with a border; it is the bottom of a page. Three things on one line, in the 350px measure:

- Left: **"IN THE LOOP"** in label type, ink, semibold. This is the way up: tapping it goes to the home. Its hit area is its own 44px column.
- Middle: the **current question**, in Libre Baskerville italic at 14px, ink, one line, truncated with an ellipsis, starting 12px after the name and ending 12px before the counter. For question 5 it reads "Songs you've had on repeat lately" and fits without truncation at about 200px.
- Right: **"5 / 11"** in label type, leaf.

Above the line, along the top edge of the folio, the **tick strip**: one 1px by 6px ink tick per question, spaced evenly across the measure, the current one 2px wide and full ink, the others at 30 percent. Eleven ticks read as a thumb index down the edge of a book; forty read as a ruler and are still legible.

The current question is whichever section head last crossed the top third of the screen, so the folio changes as the section changes and never guesses between two questions on screen (Discourse's known complaint). Inside a question with more than fifteen answers the middle cell adds " · 9 of 40" after the question in 12px muted, because there the length is what the reader needs to see.

Tapping anything except the name opens the contents. Touching and holding the folio and dragging sideways scrubs: the tick strip's current tick follows the finger, the middle cell reads each question's text as the finger crosses its tick, and letting go scrolls the page to that question. It is a second way, for people who find it; the tap is the way everyone finds.

The folio hides while the masthead is on screen (there is nothing to name yet and the name is right there) and fades in over 180ms the moment the first question's head passes the top third. It hides again on the colophon.

**Open: the contents.** A nonmodal sheet rises from the bottom to the medium detent, 52 percent of the screen (439px of 844), float white, top corners at 20.8px, hairline border, the dialog's layered ink shadow, a 36 by 5 grabber at the top centre. No scrim: the page behind stays as it was and can still be scrolled, which is the iOS nonmodal sheet the research names as "takes over part of the screen". The sheet's header, 56px: "in the loop" in Libre Baskerville at 17px at the left (the way up, again), "Round 1 · 15 August" in label type at the right. Then the list, scrolling inside the sheet: one row per question, 52px minimum, made of a 24px number column in label type leaf ("5"), the question in Libre Baskerville 15px/1.3 clamped to two lines, and the answer count right-aligned in 13px muted ("13"). The current row is ink where the others are muted, weight unchanged so nothing reflows, with a 6px leaf dot in the gutter to its left. The list opens scrolled so the current row sits second from the top; on question 5 you see rows 4 through 10 and the grabber invites the rest. Dragging the grabber up takes the sheet to the large detent, 92 percent, where all eleven fit. Forty questions scroll inside the sheet at either detent.

Tapping a row scrolls the page to that question's head, native scroll with `scroll-margin-top` of 72px so the head lands under the green bar, and the sheet drops. Tapping the name goes to the home. Tapping the page outside the sheet, or dragging the sheet down, closes it. The folio's ticks and text update the moment the page arrives.

The forty-answer question reads in the sheet as one row with "40" at its right, no different from a row with "13", and the folio's "· 9 of 40" is where that length is felt. Answers do not appear in the contents; the contents is questions, as a printed contents is.

### The desktop plan

At 1512, three columns: the sidebar at 248 (Catch-ups lit), the sheet at 720 from x=288, a 32px gap, and the **rail** at 240 from x=1040 to 1280. The rest, 232px, is page.

The rail is sticky at `top: 32px` and holds, top to bottom: "in the loop" in Libre Baskerville at 18px, ink, a link to the home; "Round 1 · 15 August 2026" in label type; after `--space-m`, the contents as rows at 14px weight 500, each a number column (label type, leaf), the question clamped to two lines, and the count at the right, muted; the current row in ink with the leaf dot, weight unchanged, so item 5's two-line wrap costs nothing (recon §1, R4). After `--space-l`, "Round 2 opens 15 September." in 13px muted, and "As a PDF" as a 13px leaf link once track M has one. The rail scrolls internally if forty rows exceed the viewport.

The way back lives in three places on desktop: the rail's name, the sidebar's Catch-ups item, and the colophon. No Back button.

### A question's heading

A question is a section, and it opens like one: `--space-xxl` (68px) above it on a phone, `--space-3xl` (110px) on desktop, so that each question reads as a fresh page without being one. Then:

- The question text in Libre Baskerville at 1.5rem (24px) on a phone and 1.7rem on desktop, line-height 1.15, tracking -0.02em, ink, wrapping freely. No number, no "Q1", no eyebrow. The number lives only in the folio, the rail and the contents, where it is navigation.
- After `--space-xs`, one line at 13px muted: "asked by Cyan Prasad" (the name a link) or "asked anonymously", then " · 13 answers".
- After `--space-l`, the first entry.

At 390 the first question ("What is a fun thing you did this summer?") takes two lines, 56px.

### The answer tile, in four states

An entry is the tile's content without the tile: bird, name, batch, answer, heart, plus a comment count. Entries are separated by `--space-l` (26px) and nothing else. The bird at the left edge of the measure is the separator the eye uses.

**Text only.** The byline row: a 28px bird, then 10px, then the name at 15px semibold ink, then 8px, then the byline line ("BATCH OF '11") on the same row, baseline-aligned. After `--space-xs`, the text at 16px/1.65, honouring the composer's emphasis and mentions, with `overflow-wrap: anywhere` so nothing can push the sheet sideways. After `--space-xs`, the **heart line**: the LoveButton with its count at the left, drawn at the app's standard size with its own padding cancelled so the heart sits on the measure's left edge, then " · 3 comments" as a 13px muted text control. Invented sample, question 3:

> [bird] **Anand Vij** BATCH OF '09
> Hard to say it is RV exactly, but I notice I ask it questions the way we were taught to ask them in assembly, which is to say I do not accept the first answer. Whether that is the school or just being annoying I could not tell you. What I do know is that nobody I studied with treats it as an oracle, and everyone I work with does.
> ♥ 6 · 2 comments

**The short form.** An answer whose text is under 24 characters on a phone (60 on desktop), with no photograph and no link, prints on the byline's own line: bird, name, byline line, then the text at 16px in the same row, then the heart pushed to the right edge of the measure with its count, the comment count folded into the heart line as " · 1" after it. Question 7 ("Who believes Sanan made this website?", eleven answers of 3 to 121 characters) becomes a column of mostly single lines:

> [bird] **Afya Zakir** BATCH OF '11  Not for a second. ♥ 4
> [bird] **Ravi Menon** BATCH OF '11  I do. ♥ 2
> [bird] **Ananya Honnur** BATCH OF '11  He definitely paid someone. ♥ 9 · 1

A 121-character answer in the same question takes the ordinary form. So do all of question 9's ("Describe your month in 3 words", 17 to 69 characters) that pass 24; the three-word ones sit inline. The tile that was three centimetres tall with 15 percent used (¶31) is one line.

**With one photograph.** Byline, text, then after `--space-s` the photograph: at the measure's width, square-cornered, following the shared rule (a wide photograph at its true shape; a tall one at 3:4 on a blurred bed of itself, capped at 700px tall), tapping to the viewer. The text sits above the photograph, as an answer, and doubles as its caption in the viewer. The heart line follows after `--space-xs`.

**With three photographs.** Byline, text, then the photographs as **justified rows**, never a carousel, because a page does not scroll sideways. The real answer under question 1 (two portraits at 1200 by 1600, then a landscape at 1288 by 966) sets as: row one, the two portraits side by side at equal height, each 171 wide by 228 tall at 390 (8px between); row two, the landscape at the full 350 width, 262 tall. On desktop the three fit one row at a shared height of about 240px: 180, 180 and 320 wide. Every photograph keeps its shape and nothing is cropped; tapping any opens the viewer at that index with swipe between the three. Invented sample:

> [bird] **Mohini Rao** BATCH OF '11
> Took the night train south with two people I had not seen since school and spent a week doing nothing in particular near the sea. One of these is a statue, one is a tower we walked up, and the third is the beach at six in the morning.
> [portrait] [portrait]
> [landscape]
> ♥ 21 · 4 comments

**With a song link.** The sentence is never rewritten. The link stays inline as a leaf underlined link, broken anywhere if it must be, and under the text after `--space-s` the **song card**: a 56 by 56 square of album art at the left (for YouTube a 100 by 56 frame at 16:9, from `maxresdefault` falling back to `mqdefault`), then the title at 15px semibold ink, the artist at 13px muted, and a 11px label line "SPOTIFY ↗" or "YOUTUBE ↗". The card has no border and no fill; the art carries a shadow and the whole row is a link opening in a new tab, with the state layer on hover. A second link in the same answer becomes a chip: a pill with a 16px source mark and the title, one line. A link that fails to resolve stays a plain link and no card is drawn. Question 5's four pasted links become four cards, and the page gets its colour from the art. Invented sample:

> [bird] **Cyan Prasad** BATCH OF '11
> This one, since June, and I am not sorry: https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc
> [art] **Straight Line Was A Lie**
> Alex G
> SPOTIFY ↗
> ♥ 6

**A 2,000-character answer** prints in full, about 35 lines at 390 (925px) and 26 lines on desktop. There is no More or Less on an answer; a long piece in a magazine is long, and the folio keeps the reader placed. The More and Less stays only on the photo wall's captions, at four lines (¶32).

**A one-word answer** is the short form. A one-character answer is the short form. An emoji-only answer is the short form at 16px, which is the size everything else is.

### The comments

Collapsed: " · 3 comments" on the heart line, a text control. Open, in place, with auto-animate: a **mist well** (`#ECE8DD`, the one recessed surface allowed, 12px radius, `--space-m` padding) under the heart line, indented 38px from the measure's left edge so it hangs under the text and not under the bird. Inside it, the post comment rows unchanged: a 28px bird, name, the text at 14px/1.5, a heart, 12px muted time; then the composer pill ("Reply", full pill, the mist-on-mist rule respected because the pill is bordered paper inside the well, not a second mist). The well is the web's margin note: it is the one thing on the sheet the magazine leaves out (¶21), and it looks like it. Tapping "3 comments" again closes it.

### The heart

The shared LoveButton, the red that never changes, with its count, on the heart line at the left of the measure, or at the right end of a short-form line. The tap is optimistic and the page does nothing else (the re-render on every tap in recon §8 is X's to remove; nothing here depends on it). No animation delay; the pop plays on the tap.

### The way back to the home, from any depth

On a phone: the folio's name, on screen from the first question to the colophon; the masthead when you are at the top; the contents sheet's header name. On desktop: the rail's name, sticky at every depth, and the sidebar. At the end: the colophon's nameplate. Never a Back button and never a link at 44,381px.

### The end of the Round

After the last entry, `--space-3xl`, then the **colophon**, centred, the one centred thing on the sheet: the nameplate again at 1.5rem ("in the loop", a link to the home), then in label type "ROUND 1 · 15 AUGUST 2026", then one line at 15px: "Mohini Rao, Cyan Prasad and 11 others wrote in." and one at 14px muted: "Round 2 opens 15 September." Then, after `--space-xl`, "ALSO ON THE SHELF" in label type and the Catch-up's other Round covers at 120 by 160 with their labels, so the way onward is a cover too; on a Catch-up with one Round this block is absent. Once track M exists, a 13px leaf link under the dateline: "As a PDF".

### The first screen at 390

Top to bottom, in pixels from the top of the viewport:

- 0 to 56: the green bar, "Rishi Valley", the menu button.
- 56: the sheet begins, paper, edge to edge.
- 80 to 124: "in the loop", 41.6px, one line.
- 130 to 145: "ROUND 1 · 15 AUGUST 2026 · 11 QUESTIONS".
- 161 to 235: who wrote in, three rows of bird-and-name: "Mohini Rao, Cyan Prasad" / "Afya Zakir, Anand Vij" / "and 9 others" in leaf.
- 277 to 333: "What is a fun thing you did this summer?", 24px, two lines.
- 339 to 355: "asked anonymously · 13 answers".
- 381 to 409: the first entry's byline: bird, "Mohini Rao", "BATCH OF '11".
- 415 to 521: her four lines of text.
- 531 to 759: the two portraits side by side, 171 by 228 each.
- 767 onward: the landscape, 350 by 262, running under the folio.
- 800 to 844: the folio would sit here, but it is hidden while the masthead is on screen; it appears the moment the question head crosses the top third, which on this Round is one flick of the thumb.

So the first screen holds the name, the date, four writers with birds, the first question and most of the first answer including two of its three photographs. Today's first screen holds zero complete answers (recon §1, R18); this one holds one answer's whole text and two thirds of its pictures, and the masthead is 180px instead of 509.

### The first screen at 1512

- The sidebar, 248, "Catch-ups" lit. The faint valley behind everything at 11 percent.
- The sheet from x=288 to 1008, from y=32, paper, square corners, the layered shadow.
- Inside it at 48px: "in the loop" at 41.6px on a baseline shared with "ROUND 1 · 15 AUGUST 2026 · 11 QUESTIONS" right-aligned; under that, the writers' line: six names with birds, "and 7 others"; then the first question at 27px; then the first entry at a 590px measure with its three photographs in one justified row at about 240px tall; then the second entry's byline and the top of its text, at about y=900.
- The rail from x=1040 to 1280, sticky: "in the loop", "Round 1 · 15 August 2026", the eleven questions with row 1 in ink and the leaf dot, "Round 2 opens 15 September."
- From 1280 to 1512: page.

Three complete answers fit under the masthead on this screen where today fit 3.3 with no masthead at all.

### A mid-scroll screen at 390, deep in question 5

- 0 to 56: the green bar.
- 56 to 120: the tail of an entry's text: "...on loop for a week, it is the drums:" and the link, "https://open.spotify.com/track/1KpAj…", leaf, underlined, broken at the measure's edge and not one pixel past it.
- 130 to 186: the song card: the square art, "Straight Line Was A Lie", "Alex G", "SPOTIFY ↗".
- 196 to 220: "♥ 6 · 2 comments".
- 246 to 274: the next byline: bird, "Afya Zakir", "BATCH OF '11".
- 280 to 306: one line of text: "Only this. Do not ask me why."
- 316 to 372: her card, YouTube, the 100 by 56 frame at the left, "Pasoori", "Ali Sethi, Shae Gill", "YOUTUBE ↗".
- 382 to 406: "♥ 11".
- 432 to 460: the next byline: "Ravi Menon", "BATCH OF '11".
- 466 to 545: three lines of text naming two songs by name, no link, no card.
- 555 to 579: "♥ 3 · 1 comment".
- 605 to 633: the next byline, "Anand Vij".
- 639 to 780: his text and, starting at 720, the top of his card.
- 780 to 800: the paper fade.
- 800 to 844: the folio: "IN THE LOOP" at the left, "Songs you've had on repeat lately" in italic across the middle, "5 / 11" in leaf at the right, and above them the eleven ticks with the fifth solid.

Nothing on this screen fails to say where you are, and the way up is 44px from your thumb.

## 4. The design system, kept and broken

**Kept by default.** The palette, every hex of it (D3). Libre Baskerville for titles and Source Sans 3 for everything else. The state layer for hover and press, never an opaque swap. Canopy pills for the one CTA on each surface, and pills for every control that is one row tall. The menu material and the dialog material, untouched, including the destructive-last rule and the two-text-level rule. The heart. BirdAvatar at its four sizes and the byline line at 10.5px. The motion curves, SpringPress on everything pressed, auto-animate on every list, AnimatePresence on the sheet, and hover never moving a control. The shimmer for loading. The 44px finger. The middle dot only between segments. The photograph rule (true shape when wide, 3:4 on a bed when tall). The one-well-per-card rule, honoured as one well per entry.

**Broken, on purpose (D36).**

1. **Square corners on printed things.** The cover plates, the reader's sheet on desktop, and the photographs on the sheet are square-cornered (2px, effectively none) where the radius ladder says 16, 12 and 8.8. The break is the concept: a printed object is not a card. The rule that replaces it is simple to check: everything printed is square, everything pressed is a pill. Nothing inside the app shell (the list's h1 row, the people sheet, the menu, the dialogs, the composer's box) departs from the ladder.
2. **The folio is a pressed control that is not a pill.** Rule 3 of the shape protocol says a single-row thing you press is a pill. The folio is the bottom of a page: text on paper with a fade above it and no edge. A pill fixed to the bottom of every screen would be the twenty-second pill; this is a line of type.
3. **The reader's sheet is one surface with no cards inside it.** The tile's chrome (border, shadow, 16px radius, `--space-m` padding) is gone from answers, which D12 permits ("its chrome does not"). The entries sit on paper separated by space and by the bird.
4. **The cover's shadow falls onto a drawn line.** The shelf line under a row of plates is a 1px ink line at 25 percent opacity: not a token, an alpha of `--ink`, the way the state layer is an alpha of ink. It is the one drawn line in the direction, and it is there because a shelf without a shelf is a grid.
5. **The "HELD" stamp is rotated.** A static transform on a static element, cinnamon outline, 6 degrees. Not a hover, not a control, so the motion rules do not apply, but it is the one rotated thing in the app and it should be.

**The one thing on screen that could only be this app:** the flock cover. A Round with no photographs gets, as its picture, the birds of everyone who wrote in, standing in rows on paper under "Round 1". Fifty Rishi Valley birds, a member's own bird among them, drawn as a field-guide plate. No other product has the birds, and no other product derives a cover from who turned up.

## 5. Letterloop, closed and open

| # | Letterloop has | This direction |
|---|---|---|
| L-a | comments with @mentions | closed: the mist well under the entry, the post comment family, mentions in the composer |
| L-b | a Music section with Spotify search and a card | closed, wider: any pasted link on any question makes the card; YouTube and Spotify at least; typed names stay names |
| L-c | a Photo Wall section | closed: a block any question carries, justified rows on the sheet, one photograph per person |
| L-d | "the next issue arrives on" | closed: in Now, in the rail, and in the colophon |
| L-e | reactions per reply | open on purpose: one heart; the app's one reaction |
| L-f | reply progress | closed: names on the plate as they write, and the "Still to write in" list |
| L-g | reminders | already there, behind the door |
| L-h | the Album | open on purpose: an album is a second home for photographs, and 1.2 gives an answer one home; the shelf's derived covers carry the best photograph of each Round, which is most of what an album is for |
| L-i | Download PDF | closed by track M, and this reader is what it prints from; "As a PDF" in the rail and colophon |
| L-j | Mementos | open |
| L-k | themes | not taken |
| L-l | filter by member, sort replies | open on purpose: a printed page has one order |
| L-m | a banner and a logo per loop | closed without uploads: the derived cover is the banner and the flock is the logo |
| L-n | four roles | one role, Keeper, and none on a batch |
| L-o | home quick actions | closed: the state line under every cover, and the one pill in Now |

## 6. Live and static

**Live, or it cannot be judged.**

- The folio and the contents sheet on the phone: fade-in past the masthead, the current question following scroll, the tap, the sheet at its detents, tapping a row and arriving, the tick strip moving, the "· 9 of 40" appearing in the crowded question. The scrub gesture may be left out of the first room and said so.
- The two shelves' sideways scroll with snap and the peek, on the phone.
- The "and 9 others" in the masthead opening in place.
- Comments opening in place on one entry, with the well and the composer pill.
- The song card as a real link, and the photograph rows opening the viewer.
- The menu from the door and from a long press on a cover, because it is the shared primitive and costs nothing.

**Static is fine.**

- The covers themselves, rendered once from the real Round (the derived picture chosen by hearts from the live data; the flock from the writers of a Round that has none, which the fixture's Round 2 and question 7 give).
- The home in its seven Now states, as seven drawings behind a switcher; the cover sliding from Now to the shelf may be described rather than played.
- The people sheet, the dialogs, the create page, the composer, the notification rows, the empty states.
- The desktop reader entire, since the rail's behaviour is a sticky list.

## 7. Under pressure

**One answer.** The reader prints one entry under the question and "Nobody answered this one." under the rest. The cover is that answer's photograph or one large bird. Fine.

**Forty answers.** Under one question, forty entries in order, nothing collapsed, nothing windowed in the first room (Discourse's virtual window is a build decision for later). Forty three-word answers pack as forty short-form lines, about 40 by 36px, 1,440px, one and three-quarter screens on a phone. The folio reads "5 / 11 · 9 of 40" inside it. Forty 240-character answers are 40 by 190px, 7,600px, nine screens, and that is what forty paragraphs are; the folio is what keeps it from being bottomless.

**A 6,000-character answer.** About 105 lines at 390, 2,770px, three and a quarter screens; no More, no clip. The 9,000-character row over the cap prints too. Where it breaks: a reader who wants to skip it has to flick past it; the contents sheet does not list answers. The magazine has a different answer (a pull quote and a page of its own) and that is track M's.

**A twenty-four-photograph wall.** Justified rows across the sheet, edge to edge on a phone: two or three per row at a target height of 160px, nine or ten rows, about 1,700px with captions; on desktop four or five per row at 220px, six rows. A caption over four lines gets More. A broken file draws a paper rectangle at the stored shape with the byline under it and no image. The cover of a Round whose only photographs are the wall's takes the most-hearted wall photograph.

**A 300-character question.** The section head wraps to about seven lines at 24px on a phone, 195px; ugly but complete, and it is a heading, so nothing is cut. In the folio it truncates to one line with an ellipsis; in the contents sheet and the rail it clamps at two lines with an ellipsis, and the row is taller. Where it breaks: the folio names it badly; the tap fixes that in one move.

**A 78-character name.** In the byline row the name wraps to two lines at 15px and the byline line drops under it; the short form is refused for a name over 32 characters, so that entry takes the ordinary form. On a cover label the two-name rule prints one name and "and 12 others" when the first name alone exceeds the line. In the masthead's writers' line the long name takes its own row. On the plate, nothing: names are not on plates. In the people sheet the row grows to two lines.

**An emoji-only answer.** The short form, 16px, on the byline's line. Seven emoji fit; the twelve-emoji fixture answer fits on desktop and wraps to the ordinary form on a phone.

**A pasted 123-character link.** `overflow-wrap: anywhere` on the sheet, so the link breaks at the measure's edge; the sheet has `overflow-x: clip` besides, so nothing can move the page. The link prints as itself, leaf and underlined, and its card sits under it; the raw string is never printed without a break opportunity. The green bar is 390 wide because the page is.

**A Round nobody answered.** The masthead, "Nobody wrote in for this Round.", the questions as a contents list with no entries, an empty plate as its cover with "Nobody wrote in" as its label, absent from "Recently out". Where it breaks: an empty plate on the home shelf looks like a mistake until you read its label; the alternative, hiding it, would hide the questions people did ask.

**Where the direction breaks that nothing above lists.** A Catch-up of 100 people gives a flock that stops at thirty birds, so two 100-person Catch-ups have covers that differ only by name. A Round whose only photographs are landscapes gets a tipped-in picture that is a third of the plate, which is honest but less good than a portrait. The scrub gesture on forty questions puts ticks 8px apart, too dense for a finger, so scrubbing there is approximate and the sheet is the real control.

## 8. The two things I am least sure I got right

**The flock as the cover of a Round with no photographs.** He said a row of birds "is totally useless" because he cannot identify them (¶23, ¶27), and the architecture bans birds alone as the drawing of who wrote in (1.7). This direction draws birds alone on the plate anyway, and argues that the plate is a picture, not a byline: the label under it names people, the masthead names them with birds beside them, and the plate is there to be looked at. I believe that distinction, and I am not sure he will, because the first thing he will see on a shelf of Rounds is birds again. The alternative I weighed and did not take is a typographic cover, the questions printed as cover lines on paper the way Granta prints a contents page as its cover; it is more clearly "print", and at 156 pixels wide it is four unreadable lines of italic. If the flock fails his test, the typographic cover is the fallback, and every other part of the direction stands.

**The folio at the bottom of the phone.** The whole phone reader rests on one 36-pixel line of type at the bottom edge. Its virtues are that it names the question at every depth, carries the way up, opens the contents in one tap and costs almost no chrome (the content-to-chrome ratio on a 844 screen is about 17 to 1). Its risks are that a line of text does not announce that it can be tapped, that a fixed element at the bottom of a page fights the browser's own toolbar on Safari, and that the paper fade above it dims the last two lines of whatever is being read. Apple Books gets away with a bare folio because its readers already know the page is tappable; ours may not. The alternative is a running head under the green bar, 40px, with the question's text and the counter, which is discoverable and costs the top of every screen. I chose the bottom because his thumb is there and because a running head under a green bar is a second bar. If the first room shows people not finding it, the fix is a 16px contents glyph at the folio's right end, hit at 44, and nothing else changes.

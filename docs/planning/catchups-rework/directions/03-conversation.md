# Everyone under the question

**Thesis:** The question is the only card and every answer is a line inside it that begins with a name, so a Round reads as eleven conversations instead of 133 tiles, and a reply is one more line.

**Designer:** 03 conversation, reading.

**The bet, as given:** ONE CONVERSATION PER QUESTION. The question is the card and every reply sits inside it, which is the one thing Letterloop gets right and the reason its issue reads as one conversation instead of a stack of profiles. Comments are native to that shape. Density is high: a one-word answer takes one line, a long one takes what it needs, and the tile chrome he hates (paragraphs 30 and 31) is gone. Beat Letterloop at its own shape.

## 1. The idea

Open the Round on a phone and the first thing you read is a question, set in Baskerville on a paper card. Under it, thirteen people answer in turn. Each answer starts with the person's name in bold and then simply says the thing: "Dev Kapoor ’11 Not a chance." is one line, and Aditi's four paragraphs about a trek run on under her name at the same measure. A bird sits at the left of every first line and nothing else sits around an answer. No box, no shadow, no band at the bottom with a heart lost in it. The heart is at the end of the answer, where a magazine puts the mark that says a piece is over. Two screens into the songs question, the green bar at the top reads "Songs you've had on repeat lately", and tapping it opens the list of eleven.

The bet is that the unit of a Round is the question, not the answer. Letterloop is right that a question with everyone's replies stacked inside it reads as one conversation, and wrong about everything around that: no way to move, no identity past a blue first name, one narrow email column, square corners, one photo per question. This direction keeps the shape and replaces the surroundings with what this app already has. Birds down the left edge. Paper on the tan page. Baskerville for the question. The heart. The green bar.

Density is the argument, and one question proves it. "Who believes Sanan made this website?" got eleven answers of three to 121 characters. Today that is eleven tiles and about four phone screens. Here it is eleven lines on one screen, and the funniest one is visible at the same time as the one it is answering. Thirteen friends answering together are funny in aggregate, and only a shape that shows several voices at once lets that be seen. The long questions are not hurt by this: a 2,000-character answer takes 2,000 characters of column. It just does not take a box as well.

What it refuses. A tile per answer. Hairlines between answers (¶14 and ¶40 count the lines; this reader has none inside a card). "Question 1" as a label. A row of birds standing in for people. A chip row. A quoted teaser anywhere. Timestamps, because a Round is simultaneous: everyone answered the same question in the same week, so no time is printed on any answer, and that is the one thing that makes this not a chat. Bubbles, and left and right alignment, for the same reason.

What it most risks resembling: Slack in compact mode, or a WhatsApp group export. Five things keep it away from that. The question heading in Baskerville at the head of every card. The card itself, paper on the page, the app's own material. The absence of times. The heart as an end mark rather than a reaction row. And the green bar carrying the question you are in, which no messaging app does and no other page in this app does either.

Where it departs from the architecture's RECOMMENDED lines, and why. The comment count reads "2 replies", not "2 comments", because in a conversation a comment on what somebody said is a reply; the component family is the posts one. The reader touches the app shell: on a phone the green bar grows from 56 to 76px and prints the Catch-up's name and the current question, so the way up and the navigator are one bar instead of two stacked strips. An answer that is nothing but a pasted link prints its card and not the raw url, because the sentence was the link. The list row always opens the home, never straight into a Round, so a tap means one thing in every state. And the cover carries no derived picture; it is typographic, the first three questions as cover lines, because in this direction the words are the identity of a Round and a Round with no photographs is common.

## 2. The screens

### 2.1 The list

At 390: the shell's 56px green bar, then "Catch-ups" as the h1 (Baskerville, 2rem) at the page gutter, and to its right one Canopy pill, "Start a Catch-up". Below, one paper card per Catch-up, 16px radius, hairline border, `card-elevated`, padding `--space-m` (16px), stacked with `--space-s` (10px) between. Inside a card: the name in Baskerville 22px/1.15, then one line at 14px muted that says the state in words:

- "Your batch · 39 people · Round 1 opens when someone starts it"
- "Every month · Round 2 open for answers until Friday · 9 of 23 written in"
- "Every month · Round 1 out 15 August · Round 2 opens 15 September"
- "On hold · Round 1 out 15 August"
- "Ended 3 March 2026"

The whole card is the one target and opens the home. Long press on a phone opens the same menu the home's head carries (2.7). No View, no dots on the face. On desktop, hover paints the state layer and a bare "…" appears at the card's top right, where dots always are, wearing `MENU_TRIGGER_HIT`. Two or three cards make a page about 300px tall. It is allowed to be short.

Under the cards, only when one exists: a text row "Archived · 1" at 14px muted, and beside it, only when one exists, "1 in the bin · 30 days". Tap either to open a sheet listing them; opening one from the sheet puts it back.

At 1512 and 1920: the same column, through `ContentColumn` at its narrow width (640px), the header on one line with the pill at its right end. The column does not grow at 1920; the margins do. Nothing on this page stretches.

### 2.2 Making one, and starting a Round

`/catchups/new` is a page, because the page is a form. Title "Start a Catch-up". Three fields in the calm-form material (56px, mist fill, floating label): "Name"; "With", a search that adds people as name chips beneath it (a chip is a pill with the person's bird at 28px, their name, and an x); and "Rhythm", two grouped rows, "Every month" and "Every three months", a tick on the chosen one, no segmented pill. One Canopy pill at the bottom right, "Start it". Pressing it makes the Catch-up and opens Round 1 for questions, and the home appears in its collecting state. The maker is the Keeper; the head says so with the leaf.

A batch Catch-up is never made. It is there on the list from the first day, and its first Round starts from the one button on its home (2.3, no Round yet). That button starts a Round, and it goes nowhere near a people page.

### 2.3 The home

One page, three parts, stacked on both widths. The head, then Now, then Before. At 1512 the page runs through `ContentColumn` at 680px; there is no right rail.

**The head.** The name in Baskerville at the display size, printed plain: "in the loop". Under it at 14px muted, the rhythm and the count on one line: "Every month · 23 people", where "23 people" is a leaf-coloured text link that opens the people sheet. On a batch: "Your batch · every three months · 39 people". At the top right of the head, the one door: a bare "…" (2.7). The Keeper's name is not in the head; the leaf beside their name in the people sheet is enough.

**Now.** One paper card, padding `--space-l` (26px), that changes with the Round's state and with nothing else.

1. *No Round yet* (a batch on its first day). Title in Baskerville 22px: "No Round yet." Body at 15px: "Questions for a week, answers for a week, then it comes out for everyone. Anyone in the batch can start it." One Canopy pill: "Start the first Round".
2. *Collecting.* Title: "Round 2 is collecting questions until Friday 5 September." Below it, the questions gathered so far, drawn as lines in the reader's own shape: bird, "Tara Menon ’11", then the question text. A Keeper sees a ↑ ↓ × trio at the right end of each line on hover; on a phone they live behind a long press. Under the lines, the ask: a bordered pill, "Ask everyone something", which grows into a text box when tapped, with "Ask anonymously" as a checkbox beneath and "From the library" as a text link beside it. For a Keeper, one more text link under the card's title: "Open answering now".
3. *Answering.* Title: "Round 2 is open for answers until Friday 12 September." One Canopy pill: "Answer". If you already have: the pill reads "Change your answers" and a line above it says "You answered 8 of 11". Then "WRITTEN IN SO FAR · 9 OF 23" as a 10.5px small-caps label, and the nine as bird-and-name pairs, wrapped. Then "STILL TO WRITE · 14" and fourteen names at 14px muted, comma-separated, no birds. A Keeper gets three text links under the pill: "Nudge everyone", "Give it more time" (a menu: a day, two days, four, a week), "Close now".
4. *Preparing.* Title: "Round 2 comes out on Saturday 13 September." One line: "Answers are in from 14 of 23." Three shimmer lines in the answer shape stand under it, the warm shimmer, not grey. A Keeper gets a secondary pill: "Publish now".
5. *Published, next not yet open.* The cover (2.3, below), whole and tappable, and under it one line: "Round 3 opens 15 October." Nothing else. The Round itself is never drawn here.
6. *Paused.* The same card as whatever state it was in, with a small-caps "ON HOLD" label at its top right and one line beneath the title: "The next Round waits until a Keeper resumes." A Round already collecting or answering is still shown and still works. A Keeper gets a text link: "Resume".
7. *Ended.* Title: "Ended on 3 March 2026." Nothing else.

**Before.** A 10.5px small-caps label, "EARLIER ROUNDS", then the covers, newest first, each a full-width paper card with `--space-s` between. A Catch-up with one Round shows one cover and nothing apologises for it.

**The cover.** One component, drawn from the Round's fields and nothing else. Padding `--space-m`. First line: "Round 1" in Baskerville 20px at the left, "15 August 2026" at 13px muted at the right. Then the first three questions as cover lines, Baskerville 15px/1.35 in ink, each allowed two lines, then "and 8 more questions" at 13px muted. Then one line at 13px muted with three birds at 28px inline, each before its name: "Mohini, Cyan, Aditi and 10 others wrote in". No answer is quoted. The whole card is the target. On the list and in a notification it also prints the Catch-up's name above "Round 1"; on its own home it does not.

### 2.4 The composer

`/catchups/[id]/answer`. On a phone the green bar is the reader's bar (3): "IN THE LOOP · ROUND 2" on the first line, the question on the second, "3 OF 11" at the right; tapping the question opens the same sheet, where answered questions carry a tick. The page holds one question card at a time, drawn exactly as the reader draws it, except that the only line in it is yours: your bird, your name in bold, your batch, and a caret. The text area has no box; it is your line in the conversation, and the caret is the state (the "field with no box" focus treatment). Under it, two text controls with a glyph each: "Add a photo" (up to three) and, on a wall question, "Add one photograph" instead. A pasted link resolves as you type and its card appears under the text, the same card the reader will show; a failed one stays a link. Under the card, at the right: "Skip" as a text link and "Share" as a Canopy pill. One line at 13px muted under the card: "Answers stay private until the Round comes out." After the last question: "That is you in this Round." in Baskerville 22px, "It comes out on Saturday 13 September." at 15px, and the name "in the loop" as a leaf link home.

### 2.5 The reader

Section 3, in full.

### 2.6 Who is here, and who wrote in

**Who is here** is the people sheet, behind "23 people" in the head. On a phone it rises from the bottom in Float white with a grabber, to the medium detent, draggable to full. On desktop it is the dialog material at `max-w-sm`. At the top, a bordered 12px search field, "Find someone", shown only when there are more than twelve. Then rows: bird at 28px, name at 15px, batch as "’11" in small caps beside it, the Keeper's leaf after their name and the word "Keeper" in 12px muted at the row's right. Order: the current Round's writers first, then your own batch, then everyone else, alphabetical within each. Rows have no borders; 44px tall. On a people Catch-up, above the list, two text links: "Add someone" and "Copy invite link". No coloured well behind a url anywhere. A Keeper's "…" on a row opens a menu wide enough for its longest item: "Make a Keeper", then a separator, then "Remove from this Catch-up" in red. On a batch, the sheet has no controls, and one line above the list at 13px muted: "Everyone from the batch of 2011 is in this, and anyone who joins later."

**Who wrote in** lives on the Round: on the Now card while answering (names with birds, and the still-to-write names), on the cover, and in the reader's masthead (3). Never a count alone.

### 2.7 The menu, the verbs and the dialogs

One door: the "…" at the top right of the home's head. The list row's long press and the desktop hover dots open the same menu. It is the menu material: Float, 12px, 4px padding, rows at their natural height. Contents, top to bottom:

- "Reminders", which opens a submenu of three radio rows: "Every day", "Last day only", "Off".
- "Archive".
- a separator, then "Delete" in red (people Catch-ups only).

For a Keeper, a second group above the separator:

- "Rhythm", a submenu of "Every month" and "Every three months".
- "Hold the next Round", or "Resume" when held.
- a separator, then "End" in red.

Archive acts at once and shows a toast, "Archived", with "Undo". Delete opens `ConfirmDialog`: title "Delete in the loop", one line "It goes to the bin for 30 days. After that your place in it goes too.", Cancel then a red "Delete". End opens the same material: "End in the loop", "Nobody can start another Round. The Rounds already out stay readable.", Cancel then a red "End". Nothing else in Catch-ups is a dialog. Round verbs never appear in this menu; they sit on the Now card with the Round.

### 2.8 The batch Catch-up

Told apart by a word, in the state line on the list ("Your batch · …") and in the head on the home ("Your batch · every three months · 39 people"). Nothing else marks it. Nobody keeps it: the menu has no Keeper group, the people sheet has no controls, and the Round verbs on the Now card are open to any member of the batch. Its first day is the "No Round yet" card in 2.3, and the first Round starts when anyone presses the button. Someone who joins the site in 2028 finds it on their list with every earlier Round under "EARLIER ROUNDS".

### 2.9 Archive and delete, and where archived things live

Archive hides the Catch-up from the list and silences its reminders, in one act, undone from the toast. Delete is the way you leave a people Catch-up; it goes to a 30-day bin, said in the dialog. A batch Catch-up has Archive only. Archived things live in the "Archived · 1" row at the foot of the list, drawn only when one exists, and the bin in the same row's second half. Opening an archived Catch-up from its sheet brings it back to the list.

### 2.10 Comments on an answer, a song card, a photo wall

All three are in section 3, because all three are lines in the same card. In short: a reply is an indented line under the answer, opened from "2 replies" in the answer's end mark; a song or video card is our own card under the answer's text, drawn from the first music or video link in it, and every later link in the same answer is a chip; a wall is a question whose card holds a justified grid of everyone's one photograph instead of lines.

### 2.11 The notification

Each transition is one bell row, and each lands where the state says.

- "in the loop · Round 2 is collecting questions until Friday" lands on the home.
- "in the loop · Round 2 is open for answers until Friday" lands on the composer.
- "in the loop · Round 2 is out", with the cover as the row's body, lands on the reader at the top.
- "Mohini replied to your answer" lands on the reader at that answer, with its replies open and the bar reading the question it is under.
- A nudge reads "Tara is asking everyone in in the loop to write in" and lands on the composer.

### 2.12 The empty states

A brand-new member sees one card on the list, their batch, with the state line "Your batch · 12 people · Round 1 opens when someone starts it", and the "Start a Catch-up" pill. A batch with no Round yet is 2.3's first state. A Round with one answer is a reader whose cards each hold one line, and a line alone looks like a line, not like a lonely tile. A question nobody answered keeps its card and its heading, with one line at 15px muted in place of the transcript: "Nobody took this one."

### 2.13 The pressure fixture

Section 7.

## 3. The reader, precisely

### The masthead

It prints the cover's fields, larger. At 390, from the top of the content: "in the loop" as the h1 in Baskerville at the display size (clamp resolves to about 30px), tight tracking, ink. Eight pixels under it, "Round 1 · 15 August 2026" at 14px muted. Sixteen pixels under that, a 10.5px small-caps label, "WROTE IN". Under the label, the cast: bird at 28px and the name at 14px semibold in ink, as pairs in a wrapped row with 12px between pairs and 6px between lines. On a phone the first five pairs, then "and 8 others" as a 13px leaf text link that expands the rest in place. At 1512 all thirteen, which wrap to three lines in a 680px column. Every name goes to a profile. No rule under it, no birds without names, no count sentence. The whole masthead is about 200px tall on a phone.

As you scroll, the masthead leaves. Nothing sticks from it. Its two facts that matter at depth, the name and the Round number, are carried by the green bar on a phone and by the rail on desktop.

### The green bar, resting

On a phone the reader takes over the shell's top bar. It stays Canopy, keeps the menu button at the left, and grows from 56 to 76px. From x=56 to x=296 it prints two things in white:

- Line one, from y=8 to y=32: "IN THE LOOP · ROUND 1" in the app's label style, 10.5px semibold small caps at 0.07em, white at 80%. This is the way up: its hit zone is the full bar width by 32px, and it goes to the home.
- Lines two and three, from y=32 to y=76: the question you are in, 13.5px/17px Source Sans 3 semibold, white, clamped to two lines. Above the first card, before any question has passed under the bar, this reads "11 questions · 13 wrote in". Its hit zone is the full width by 44px, and it opens the navigator.

At the right, from x=296 to x=382, aligned with the question lines: "5 OF 11" in the same small caps at 80%, and a 14px chevron pointing down. It appears once you are inside a question and is blank above the first card.

The bar changes as you scroll. Each question card's Baskerville heading is watched; when a heading's bottom edge passes under the bar, the bar's question becomes that heading. The outgoing line moves up 8px and fades in 120ms, the incoming one arrives from 8px below over 180ms on `EASE_OUT_SMOOTH`, transform and opacity only. Scrolling back up runs it in reverse. The counter changes with it. So the question you are reading is always named, and it is named in the app's own green, which is the one thing on this screen that could not be a screenshot of another app.

### The green bar, open

Tapping the question in the bar raises a sheet from the bottom: Float white, 20.8px top corners, the layered ink shadow, a 36 by 5px grabber centred at its top, resting at a medium detent 506px tall (60% of 844) with the dialog backdrop behind it (warm-ink tint at 55%, blurred; only opacity animates). It enters on `EASE_IN_OUT_SCENE` over 260ms, the large-move curve, and leaves faster. Drag the grabber to the full height or tap outside to close.

Inside, at the top: "ROUND 1 · 11 QUESTIONS" as a 10.5px small-caps label. Then eleven rows. Each row: the number at 12px muted in a 24px column, the question in Baskerville 15px/1.3 in ink clamped to two lines, and the count of answers at 12px muted at the right edge ("13"). Rows are 46px at one line, 62px at two, with the state layer on press. The current row carries a 2px leaf bar down its left edge and is in full ink; the others are ink at 70%. No weight changes, so nothing reflows. On open, the current row is scrolled into view. Tapping a row closes the sheet and scrolls the page so that question's heading sits just under the bar; the bar reads the new question and the new count. There is no swipe to disable and no scroller replaced; the page moves with native scroll.

The forty-answer question reads in the sheet as one row like the others, with "40" at its right. The sheet gives no progress inside a question and this direction does not pretend otherwise; the card itself is short enough (7) that it does not need one.

Swiping sideways on the bar's question moves to the next or previous question. It is a bonus and nothing depends on it; the tap and the sheet are the design.

### The desktop plan

At 1512 there is no top bar. The sidebar is the app's. Inside the content area, two columns sit together, centred as a pair: the reader column at 680px and, 48px to its right, a rail at 240px. At 1920 the pair stays the same width and the margins grow.

The rail is sticky at 24px from the top. It prints, in order: "in the loop" in Baskerville 18px as a link to the home; "Round 1 · 15 August 2026" at 12px muted; 16px of space; then the eleven questions, each a row of 13px/1.35 with its number in a 20px column at the left, clamped to two lines, never cut at a character count. The current one is in ink with a 2px leaf marker at the rail's left edge that travels on `NAV_MARKER_SPRING`, as the sidebar's marker does; the rest are muted. Weight never changes, so item 5 never wraps under the cursor. Hover paints the state layer. Under the list, "Round 2 opens 15 September" at 12px muted.

The way back on desktop is the rail's name, on screen at every depth, and the sidebar's Catch-ups item.

### A question's heading

Each question is one paper card: `--radius` 16px, hairline border, `card-elevated`, background paper, padding `--space-m` (16px) at 390 and `--space-l` (26px) at 1512, with `--space-l` between cards. At the top of the card, the question in Baskerville, `h2` at 1.5rem/1.15 with -0.02em tracking on a phone and 1.7rem at 1512, in ink, as many lines as it needs. No number in front of it. Eight pixels under it, one line at 13px muted: "asked by Tara Menon", the name a link, or "asked anonymously", or "asked by you, anonymously" when you are looking at your own hidden question. Sixteen pixels under that, the conversation begins. There is no rule between the heading and the first line, and no rule anywhere inside a card.

### The answer line

Every answer is one row of a grid: a 28px column for the bird, a 10px gap (12px at 1512), and the text column. At 390 the text column is 288px wide; at 1512 it is 592px. Rows are `--space-s` (10px) apart on a phone and `--space-m` (16px) at 1512.

The text column is one paragraph flow at 15px/1.6 on a phone and 16px/1.6 at 1512, in ink, the member's line breaks kept. It begins with the name in semibold, then the batch as "’11" in the byline's small caps (10.5px semibold at 0.07em, muted) five pixels after the name and sitting on the same baseline, then a six-pixel gap, then the answer's first word. The text wraps under itself, never under the bird, so the bird column stays a clean line of birds down the card. A member with no batch year prints the name alone. `overflow-wrap: anywhere` is set on the column, so no string a member types can push the page sideways.

**The end mark.** At the end of the answer sits the heart with its count and the reply link, floated right with 12px of clearance. If the last line has room, the mark sits on it; if not, it drops to its own line at the right edge. The heart is `LoveButton` at its `sm` size, 14px, its count in 12px; eight pixels after it, "Reply" in 12px semibold muted, or "1 reply", "2 replies" when there are any. The mark is 20px tall to the eye and 44px to a thumb. That is all the chrome an answer has.

**Text only.** "[bird] Dev Kapoor ’11 Not a chance." with the end mark on the same line: 281px of a 288px column, one line. A four-paragraph answer starts on its name line and runs on for as many lines as it needs, the end mark landing on the last one.

**With one photograph.** The text as above, then 8px under it the photograph through `PhotoFrame`, spanning the text column, 12px radius (one rung under the card). A wide one runs at its true shape, so the 1288 by 966 landscape prints 288 by 216 on a phone and 592 by 444 at 1512; a tall one becomes 3:4 on a blurred bed of itself, 288 by 384 on a phone. Tap opens the viewer. The end mark sits on its own line under the photograph, right-aligned, 8px below it.

**With three photographs.** The same, but at 390 the three go into the shared carousel at the column's width, snapping one photograph per flick, the frame's height following the finger between a portrait and the landscape so nothing jumps; at 1512 they are one justified row 592px wide, which puts the two portraits and the landscape at about 226px tall each. Tap any of them to open the viewer on that one, stepping through the three.

**With a song link.** The text prints with the url as a leaf link, unbroken words allowed to break anywhere, and 8px under the text sits the card: the text column's width up to 440px, 76px tall, 12px radius, hairline border on the card's own paper (no fill, so a card with four songs in it still has no wells), the state layer on hover, the whole card a link that opens the song in a new tab. Inside, from the left: the art at 56px square with the 8.8px thumbnail radius (a video gets a 100 by 56 frame instead); then the title at 15px semibold in one line and the artist or channel at 13px muted in one line; at the right end, "SPOTIFY" or "YOUTUBE" in 10.5px small caps muted with an up-right arrow. While it resolves, the same 76px shows the warm shimmer; when it fails, the link alone stays. An answer that is nothing but a url prints the card and no url. A second link in the same answer prints as a chip under the card: a pill with a 16px favicon and the page title in 13px. Never the provider's iframe.

**How they pack.** A one-word answer is one line. A 2,000-character answer is about fifty lines on a phone and forty at 1512, with no fold, because a conversation lets everyone finish. A run of one-liners packs at 34px per answer. An emoji-only answer of up to three emoji prints them at 24px on the name line, as Messages does. An answer with no body and no photograph prints the name and "left this blank" in 15px muted.

### The replies

Collapsed, a reply thread is the "2 replies" in the end mark. Tap it and the thread opens in place under the answer, inside the text column, with `auto-animate` on the list. Each reply is the posts family's comment row, drawn in the same grid: bird at 28px, name in 14px semibold, "’09" in small caps, then the text at 14px/1.5, and its own `sm` heart floated right on the last line. Replies are 8px apart. Under the last one sits the family's composer pill, 36px tall, hairline border on paper, placeholder "Reply to Tara", which focuses only when tapped. "@" in it opens the mention dropdown. A posted reply appears as one more line. Tapping "2 replies" again folds the thread. A reply to your answer is a notification that lands on this answer with the thread open.

### The heart

`LoveButton`, the app's one red heart, at `sm`: 14px glyph, the count beside it, painted `#E03A33` on the first frame and never tweening through black, the pop on tap, the three flecks. Optimistic: the fill and the count flip at once and nothing re-renders around it. The action must not call `revalidatePath`, which is the whole of recon §8. Its hit area is 44px on touch through invisible padding, not a bigger glyph.

### The way back

On a phone: the first line of the green bar, "IN THE LOOP · ROUND 1", at every scroll depth, one tap to the home. At 1512: the rail's name. Both are on screen from the top of the Round to its end, and neither is a Back button. The sidebar's Catch-ups item and the green bar's menu are the way to the rest of the app.

### The end of the Round

Forty pixels under the last card, no card around it, left-aligned in the column: "That's all thirteen." in Baskerville 22px; under it "Round 2 opens 15 September." at 14px muted; under that "in the loop" as a 14px leaf link to the home. Then the page ends. The first line is the one line on this screen allowed to sound like a person, and it is spent on a title.

### The first screen at 390

- 0 to 76: the green bar. Menu button at the left; "IN THE LOOP · ROUND 1"; "11 questions · 13 wrote in"; the counter blank.
- 100 to 130: "in the loop", Baskerville, 30px.
- 138 to 158: "Round 1 · 15 August 2026".
- 174 to 188: "WROTE IN".
- 194 to 296: five bird-and-name pairs on three lines, "and 8 others" on the third.
- 320: the first card begins. 336 to 392: "What is a fun thing you did this summer?" over two lines. 400 to 418: "asked anonymously".
- 434 to 506: "[bird] Tara Menon ’11 Learned to sail, badly, on a lake outside Pune. Capsized twice before lunch and once after it." over three lines; the end mark "♥ 6 · Reply" on the third.
- 516 to 540: "[bird] Rohan Pillai ’04 Nothing. Honestly nothing, and it was the best summer in years." Two lines. "♥ 3 · 1 reply".
- 550 to 598: "[bird] Meera Joshi ’11 Took my parents to the coast for the first time since 2019. This is my father pretending he is not cold." Two lines.
- 606 onward: her photograph, 288 by 216, running under the bottom edge of the screen at 822.

Two complete answers on the first screen and the start of a third with its picture, against zero today.

### The first screen at 1512

The sidebar at the left. The pair centred in what remains: the column from about x=300 to x=980, the rail from x=1028 to x=1268.

- 24 to 66: "in the loop", Baskerville, 41px.
- 74 to 92: "Round 1 · 15 August 2026".
- 108 to 122: "WROTE IN". 128 to 236: thirteen bird-and-name pairs on three lines.
- 262: the first card begins, padding 26. 288 to 319: the question on one line at 27px. 327 to 345: "asked anonymously".
- 361 to 387: Tara's answer on one line at 16px, the end mark at the right of the same line.
- 403 to 429: Rohan's, one line.
- 445 to 471: Meera's, one line. 479 to 923: her photograph at 592 by 444.
- 939 to 965: "[bird] Vikram Sen ’98 Two weeks of doing nothing on purpose in Coorg." with its end mark, just above the fold.

In the rail: the name, the date, eleven rows, the leaf marker on the first.

### A mid-scroll screen at 390, deep in question 5

- 0 to 76: the green bar. "IN THE LOOP · ROUND 1"; "Songs you've had on repeat lately"; "5 OF 11" with the chevron.
- 76 to 132: the bottom of a card above it, cut off: a song card's lower half, then its end mark "♥ 4 · Reply" at 112 to 132.
- 142 to 166: "[bird] Karan Bose ’11" alone on the name line, because his answer was only a link.
- 174 to 250: his card. Art at the left, "Straight Line Was A Lie", "Rahul Menon", "SPOTIFY ↗". 258: "♥ 2 · Reply" right-aligned.
- 288 to 360: "[bird] Neha Iyer ’11 Nothing new. The same three Kishore Kumar songs my father played in the car, on a loop, for a month, and now I play them." Three lines, "♥ 7 · 1 reply" on the third.
- 370 to 394: "[bird] Ishaan Dutt ’15 This, on repeat, since June:" 402 to 478: a video card, the 100 by 56 frame at the left, "Cheera Thoraan", "Job Kurian", "YOUTUBE ↗". 486: "♥ 5 · Reply".
- 516 to 540: "[bird] Priya Nair ’11 Album covers, if they render 😭" 548 to 624: a card, "Vazhithirivil", "Sushin Shyam", "SPOTIFY ↗". 632: "♥ 9 · 2 replies".
- 662 to 686: "[bird] Sana Khan ’11 Not a song. The sound of the fan in my old room, which I recorded before we moved." "♥ 11 · Reply" on the second line.
- 720 to 744: "[bird] Nikhil Rao ’11 Still the same playlist from 2011. I am not well." "♥ 8 · 3 replies".
- 778 to 844: the top of the next answer, "[bird] Aditi Rao ’09 On repeat for a month now, embarrassingly:", its card beginning at 810 and cut by the screen edge.

Six complete answers on one mid-scroll screen, the question named at the top in green, and the whole list one tap away.

## 4. The design system, kept and broken

Kept, by default and without exception: the palette (Canopy for the bar and the CTAs, Leaf for links and the marker, the heart red, paper on the tan page, Float for the sheet and the menu, no new hex); the card material for the question card; the radius ladder, 16 for the card, 12 for photographs and the song card inside it, 8.8 for the art, pills for controls only; the state layer for every hover and press; the menu and dialog materials as written; the type faces and the heading tracking; the byline's 10.5px small caps; transform and opacity as the only animated properties, `SpringPress` on every control, `AnimatePresence` with a real exit on the sheet, hover never moving anything; the warm shimmer for the reader's `loading.tsx`, drawn in the answer shape; the 44px hit rule; no field focusing itself; `LoveButton`, `BirdAvatar`, `PhotoFrame`, the carousel, the viewer, the justified rows, the comments family, `ContentColumn`.

Broken, on purpose:

1. **The answer has no card.** Every list in this app draws one paper card per item. In the reader the item is the question and an answer is a line. This is the direction.
2. **The shell's green bar is edited by a page.** The mobile top bar grows to 76px in the reader and the composer and prints the Catch-up's name and the current question. The shell has never carried page content. One bar instead of a bar plus a strip, and the question you are reading in the app's own green: that is the Action Button moment of this direction.
3. **The byline moves beside the name.** `IdentityRow` stacks the batch under the name; here "’11" sits inline after it, in the same small caps, so that a one-word answer is one line. The wording shortens from "BATCH OF ’11" to "’11", the alumni convention for a class year.
4. **Body text at 15px on a phone.** The scale says 1rem. The conversation runs at 15px/1.6 at 390 because the measure is 288px and density is the bet; it returns to 16px at 1512.
5. **A bottom sheet is new material.** The system has dialogs and menus. The navigator and the people sheet are a sheet: Float, 20.8px top corners, grabber, medium detent, the dialog's backdrop, the large-move curve in and a faster exit. Specified once here so it is one material, not a per-page choice.
6. **The heart is an end mark.** `LoveButton` at `sm`, floated to the last line of the answer rather than standing in an action row. The variant rule already assigns `sm` to dense meta lines, which is what the end mark is.

The one thing on screen that could only be this app: the green bar reading a member's question in white, with "IN THE LOOP · ROUND 1" above it in the label small caps, over a column of paper cards with a line of birds down the left of each.

## 5. Letterloop, closed and open

- **L-a, comments with @mentions.** Closed. Replies are lines under the answer, with the mention dropdown in the composer pill.
- **L-b, a Music section with Spotify search and a card.** Closed, and wider: any pasted Spotify or YouTube link, under any question, becomes our card; the first in an answer gets the card, the rest chips.
- **L-c, a Photo Wall section.** Closed. A wall question's card holds everyone's photograph as one justified grid, 2 per row on a phone and rows of about 200px at 1512, each with its name, its caption clamped at four lines with More, and its end mark; tap opens the viewer through the whole wall.
- **L-d, "the next issue arrives on".** Closed, at the end of the Round, in the rail, and on the Now card.
- **L-e, a reaction picker.** Open on purpose. The heart is the app's one reaction.
- **L-f, reply progress.** Closed on the Now card while answering: the names who have written in, and the names still to write.
- **L-g, reminders.** Already there; behind the one door.
- **L-h, the Album.** Open. This direction's covers are typographic, and a strip of every photograph across Rounds would be a second way of drawing a Round's contents. Worth building later as a page of its own.
- **L-i, Download PDF.** Track M.
- **L-j, Mementos.** Open.
- **L-k, themes.** Not, by decision.
- **L-l, filter by member, sort replies.** Open on purpose. The bold name at the start of every line makes one person's answers scannable down a card without a filter, and sorting a conversation would break the thing that makes it one.
- **L-m, a banner and a logo per loop.** Open. The Round's identity here is its name and its questions.
- **L-n, four roles.** Keeper only.
- **L-o, Home quick actions.** Closed by the state line on the list row.

## 6. Live and static

Must be live, because the direction cannot be judged otherwise:

- The green bar's question changing as the page scrolls, and its counter. The mid-scroll screen has to be reached by scrolling, not drawn.
- The sheet opening from the bar, a row tap closing it and landing the page on that question with the bar updated.
- The end-mark heart, optimistic, with the pop.
- One reply thread opening in place from "2 replies", with the composer pill, and folding again.
- The three-photograph carousel on a phone and the viewer from any photograph.
- At 1512, the rail's marker following the scroll.

May be static: the masthead; the list at all three widths; the seven Now states and the covers; the composer page; the people sheet's content; the menu and both dialogs; the song and video cards with resolved data; the end of the Round; the notifications.

## 7. Under pressure

- **One answer.** One line in the card, or one line and a photograph. It reads as somebody speaking, which is fine; a lonely tile was the thing that looked wrong.
- **Forty answers.** The fixture's mix, thirty short lines and ten of 240 characters, comes to about 2,400px on a phone, under three screens, with the question named in the bar throughout. The sheet's row says "40" so you know before you go in. There is no counter inside the question; three screens do not need one.
- **A 6,000-character answer.** About 150 lines at 390, four and a half screens of one voice, and no fold, because folding would make the conversation lie about who said how much. The bar still names the question; the sheet and the sideways swipe are the way past it. The 9,000-character row over the cap is the same, longer. This is where the direction is weakest and it is said so in section 8.
- **A twenty-four photograph wall.** Twelve justified rows of two on a phone at about 170px each plus a caption row under each, about 2,600px; at 1512, six or seven rows of four at 200px. The viewer steps through all twenty-four. A wall entry with no caption prints the name and the end mark only.
- **A 300-character question.** Eleven lines of Baskerville at the top of the card on a phone, about 300px, which is honest: it is the question. In the bar it clamps to two lines with an ellipsis, and in the sheet to two. That is a cut and it is the one place this direction cuts a member's words.
- **A 78-character name.** The name wraps to three lines before "’84" and the answer begin, and the answer flows on after it. Nothing truncates a name anywhere in this direction; in the masthead's cast it wraps within its pair. It looks odd and it is correct.
- **An emoji-only answer.** One line, the emoji at 24px, the end mark beside them.
- **A pasted 123-character link.** Only a url, so it prints only its card. If the resolver cannot read it (the fixture's unknown host, the dead Spotify id), the url prints as a leaf link with `overflow-wrap: anywhere`, wrapping over three lines inside the column and never past it. Ugly for one answer; sideways for none.
- **A Round nobody answered.** The masthead prints "Nobody wrote in." in place of the cast, every card prints "Nobody took this one.", and the bar's second line at the top reads "1 question · nobody wrote in". Its cover in Before says the same, and the list's state line does not promote it as fresh. Whether such a Round should publish at all is a lifecycle question this direction leaves to S5, saying only that the reader draws it without pretending.
- **The rest of the fixture.** A blank or whitespace-only body prints "left this blank" after the name. The Devanagari and Arabic names sit inline with their own script's font and the browser's bidi handling; the right-to-left name reads correctly as a run inside a left-to-right line. A photograph whose file is gone prints a paper rectangle at 3:2 with a muted camera glyph, not an empty frame with a caption under it. Six photographs on one legacy row go into the carousel on a phone and two justified rows at 1512. The markdown answer renders through `renderRichText` as it does in posts; the angle-bracket answer lands as text. A mixed-orientation trio in the viewer uses the carousel's height interpolation, which is the fix recon §8 points at.

## 8. The two things I am least sure I got right

**The heart as an end mark.** Floating the heart and the reply link onto the last line of every answer is what buys the one-line answer, and it is also 133 red hearts down the right edge of a phone column. It may read as a rhythm, the way the end mark of a magazine piece does, or it may read as clutter that a reader learns to skip and then cannot find when they want to use it. "Reply" at 12px muted at the end of a paragraph is less visible than a comments row and I do not know whether people will see it as a thing they can press. The fallback is a plain meta line under each answer, which costs a line on every one-liner and would need the bet restated.

**The green bar reading the question.** Seventy-six pixels of Canopy holding two lines of a member's words in white is the most distinctive thing here and the thing I have least evidence for. It might feel like the app's bar doing something new, which is the Action Button test passed, or it might feel like a different app's header sitting on our page. It also clamps a long question to two lines, which is a cut, and it edits a shell component that every other page leaves alone. If it fails, the same mechanism survives as a glass strip under the ordinary 56px bar, which costs 40px of chrome and the moment of the question riding up into the green.

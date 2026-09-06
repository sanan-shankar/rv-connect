# Catch-ups: the architecture, and the directions

**S3, 2026-09-05. Fable max, ultracode on for the designers and the judges; the architecture and
the synthesis are one mind.** This file is what the owner ran the campaign to reach (handover,
"S3: Directions"). Read [`brief.md`](brief.md) in full before this; every `¶n` points into it.
[`recon.md`](recon.md) is what is wrong today, measured; [`flows.md`](flows.md) is today's click
map and the intent matrix; [`prior-art.md`](prior-art.md) is what everyone else does, with its
confidence marked and its gaps listed.

**How this file is laid out.** Part 1 is the architecture: the structure every direction shares,
written before any designer saw the problem, because ¶42 asks for *"different teams... working
together... but under the same broader structure."* Part 2 is the directions that came back, what
the judges said, and what survived. Part 3 is a room brief per surviving direction, for S4. Part 4
is one paragraph on which I would pick. Part 5 is the sketch room and what he does next.

**The three marks.** LOCKED is his, with the paragraph. RECOMMENDED is this session's judgment
with the reasoning beside it; in Part 1 a RECOMMENDED mark is **binding for the directions round**,
so that eight designers produce things that can be compared, and S5 may overturn any of it with him
present. OPEN is the direction's to decide, and later the builder's.

---

# Part 1. The architecture

## 1.1 What is rotten, in one sentence

The relationship between the pages was never designed, so every page compensates by showing
everything (¶18: *"it's not built in a logical way"*; ¶36: *"the relationship between each page"*).
A published Round is drawn ten ways on four surfaces (`recon.md` §5); sixteen verbs live on five
surfaces (`recon.md` §4); the home shows the whole Round because nobody decided what the home was
for (¶15: *"then what do we put on the left? I don't know"*). The fix is not a better home page.
It is deciding, once, where each thing lives, and then letting every page show only what lives
there.

## 1.2 The nouns, and the one place each lives

A member thinks in six things. Each has exactly one home, and every other appearance is a pointer
to it.

| Noun | What it is to a member | Its one home | How it appears anywhere else |
|---|---|---|---|
| **A Catch-up** | a standing group with a rhythm: your batch, or people you chose | `/catchups/[id]`, **the home** | one row on the list, named, with its state in one line |
| **A Round** | one cycle: questions gathered, answered, then read | while it is being made, it is the **Now** panel on the home; once published, **the reader** at `/catchups/round/[id]` | **the cover**, one component, everywhere (1.4) |
| **The people** | who is in this | **the people sheet**, one level below the home, behind the count | the count in the home's header; names beside answers; never a row of birds with a number |
| **A question** | what everyone answers | inside its Round: on the Now panel while collecting, a section of the reader once published | an item in the reader's navigator |
| **An answer** | one member's reply, with photos, a song, comments | under its question, in the reader | nowhere else (no teaser sentences, ¶9) |
| **A comment** | a reply to an answer | under the answer, in the reader | a count on the answer; a notification to the author |

**RECOMMENDED, binding for the round.** These six and their homes. A direction may draw them
however it likes; it may not give a noun a second home. The teaser sentence pulled from the
most-hearted answer (the index rail, the Published-issues row) is gone in every direction: ¶9,
*"I'm just not gonna see this sentence again and again and again."*

## 1.3 The home of a Catch-up: three parts, one structure, every state

**RECOMMENDED, binding for the round.** The home has the same three parts in every state. Only
the middle one changes.

1. **The head.** The Catch-up's name, printed once and printed plain (¶25: *"we can just say In
   the loop"*; the `catch-up` suffix was his own July decision and he has reversed it, `recon.md`
   §10, F22). Its rhythm in words ("Every month"). The count of people, which is the one control
   that opens the people sheet. The Catch-up's own menu, in one place (1.6).
2. **Now.** The current Round in its current state. This is the ONLY part that branches, and it
   branches on the Round's state, never on the Catch-up's:
   - *no Round yet* (a batch Catch-up on its first day, O1): what a Round is in one line, and the
     one button that starts the first one;
   - *collecting*: the questions gathered so far, and the way to ask one; for a Keeper, the way to
     open answering early;
   - *answering*: the one button, "Answer", and who has written in so far, by name; for a Keeper,
     nudge, close, extend;
   - *preparing*: the hold, with the publish time; for a Keeper, "Publish now";
   - *published, next not yet open*: the **cover** of the Round that just came out, and when the
     next one opens; one tap to the reader. **Or**, if the direction bets that the home is the
     reader (¶18 calls landing in the finished Round *"a nice thought"* and faults only the
     missing way back), the Round itself, drawn by the same reader component with its own
     navigation and the head above it. What is banned is what he has today: the cover **and**
     the Round **and** a rail row, on one page (¶15, ¶35, H2, `recon.md` §5). A published Round
     on any screen is either its cover or itself, never both, and "itself" is one component
     wherever it is drawn.
   - *paused*: the same Now panel, frozen where it was, marked paused, with Resume for a Keeper.
     Never a banner that replaces the panel: today's banner hides a live Round (F21), which is a
     bug nobody chose.
   - *ended*: "Ended on {date}", and nothing else in Now.
3. **Before.** The published Rounds, newest first, each as its cover. This is the archive, and it
   is where "Published issues" and "Fresh off the press" both go to live: a cover row in Before is
   what "fresh" means. On a Catch-up with one Round, Before holds one cover and looks fine doing it.

Who is Keeper changes what Now offers, not what the page is: a member's home is the Keeper's home
minus the Keeper's buttons (`flows.md` §4 already shows this is what falls out).

**OPEN to each direction**: whether the head, Now and Before stack, sit side by side, fold into
one another, or become tabs inside the Catch-up; what the head looks like; whether Before is a
shelf, a list, a calendar or a strip; how Now is drawn in each state. A direction whose list is
the shelf may put the covers on the list and leave the home with only Now: a cover is a pointer,
and pointers may go anywhere. The list of seven Now states is fixed; their look is not.

**Considered and not taken as the shared structure**, so nobody re-treads it: making the Catch-up
a container with no page of its own (the list opens the newest Round, settings and people hang off
the reader). While a Round is collecting or answering there is no reader yet, so that page exists
anyway and is the home under another name. It is allowed as a direction's bet (1.5), not imposed.

## 1.4 The cover: one representation of a published Round

**LOCKED (¶13, ¶39): one representation, the same on desktop and phone.** *"this preview of this
Round 1 tile is the kind of thing that is done in 15 different ways and 15 different places."*

**RECOMMENDED, binding for the round.** One component, **the cover**, drawn from one set of
fields and nothing else:

- Round N (and the Catch-up's name, only when the cover is somewhere other than that Catch-up's
  own home: the list, a notification);
- the date it came out;
- who wrote in, as **people you can identify** (1.7), never a count alone and never birds alone;
- the questions, as headlines, or their number, if the direction wants a second line. A magazine
  cover carries its headlines, and eleven questions change with every Round; what ¶9 objects to
  is the quoted answer, *"the first sentence of a book"*, which is the same sentence every time
  you look. **No quoted answer, ever.**

No "open on its own page" link inside it: **the whole cover is the one click target** (D42, ¶35:
*"Why would I have a tile which has only one purpose?"*). It appears on the list row, in Before on
the home, in Now when the latest Round is out, and as the body of the published notification. The
reader's masthead is the cover's big brother, drawn from the same fields, and a direction should
make the family resemblance obvious.

**OPEN**: the cover's shape (a row, a card, a spine on a shelf, a dated entry, a stamp), whether
it carries a derived picture (¶1: *"maybe the catch-up could have a picture for it"*; Letterboxd
derives one from the contents, `prior-art.md` §2; the most-hearted photograph of the Round is the
obvious candidate and has an obvious failure, a Round with no photographs), and how "who wrote
in" is drawn on it.

## 1.5 Getting anywhere with one obvious move

**LOCKED**: not a Back button and not *"slide buttons here and there"* (¶18, D48). **LOCKED**: back
from the reader without scrolling a week (¶35, H6: the only link home is 44,381px down).

**RECOMMENDED, binding for the round.** Every screen carries the name of the thing it is inside,
and that name is the way up. Concretely:

| From | To | The move |
|---|---|---|
| the list | a Catch-up's home, or straight into its newest Round if the direction makes the reader the front door | tap the row; the whole row |
| the home | the reader | tap the cover; the whole cover |
| the home | the composer (`/answer`) | the one button in Now, only while answering |
| the reader | the home | the Catch-up's name, which the reader keeps on screen at every scroll depth (in a collapsed masthead, a sticky bar, a rail, whatever the direction chooses); on desktop the rail can carry it too |
| the composer | the home | the name at the top, and the completion moment |
| the people sheet | the home | it is a sheet; closing it is the move |
| a notification | exactly where the state says | collecting to the home, answering to the composer, published to the reader, a comment to the answer itself |
| anything | the rest of the app | the sidebar and the green bar, which never leave |

A member is in two or three Catch-ups (I12). A direction may put those two or three **in the
sidebar itself**, under Catch-ups, the way Slack lists channels; then every screen in the app is
one move from any Catch-up, and the list page has less to do. OPEN, and worth one direction
trying.

The reader's own navigation among questions (O7) is the hardest single problem in the campaign and
it belongs to the directions. Two things are fixed at this level: **the current question is
always named on screen** (¶11: *"I don't even know what the question is, on my phone"*), and **the
list of questions is one tap away from anywhere in the Round** (¶11: *"I click question 8, and now
I go to question 8 and that's it. I can't navigate anymore"*). A third is wanted and not required:
some sense of how far through the Round you are. The mechanism is OPEN: a sheet that takes over
part of the screen (his own suggestion in ¶17, marked as an example in ¶26), a paged issue, a
scrubber, a persistent indicator that opens into a list, the questions as a stack you flick
through, something none of us has thought of. What it must not be is the chip row, and what it
must survive is the forty-answer question in the pressure fixture. Two warnings from the research,
both measured: do not disable the native scroller (The Pudding; mobile toolbars move the viewport
under you), and do not collapse questions by default to make the page short (Wikimedia lost 44
seconds of reading per page at the 90th percentile doing exactly that).

## 1.6 The verbs: two kinds, one place each

**LOCKED**: archive and delete like WhatsApp, neither visible on the main list, no Archived section
with a Put back button in your face (¶5, D5). **LOCKED**: no leaving a batch Catch-up (¶5, D4).
**LOCKED**: too many verbs with no consistency is the complaint (¶40, L1).

**RECOMMENDED, binding for the round: the two axes, and one door.** `prior-art.md` §6 found the
rule every product people call simple obeys: a verb changes your view or it changes the thing,
never both, and the word says which. And every lifecycle verb lives behind one door on the home,
with the list row opening the same door. What follows inside those two rules is my proposal, and
a direction may argue any line of it the other way, saying so. So:

**Personal verbs**, on every Catch-up, for every member. They change only your own list.

- **Archive**: hides it from your list and silences its reminders (WhatsApp couples the two, and
  every product that separates archive from mute regrets it). Undo is a toast, not a dialog
  (Apple: no alert for a common, undoable act). It comes back when you open it from the Archived
  row.
- **Delete**: for a people Catch-up, this is also how you leave; it goes to a 30-day bin, after
  which your membership goes with it (today's mechanism, F4). It says so in one line. For a batch
  Catch-up my proposal is **no Delete**, because there is no leaving the batch (D4) and Archive is
  the whole answer, which is exactly what WhatsApp's announcement group and Slack's #general do.
  He was unsure here himself (¶5: *"Or I don't know if there should even..."*), so the other
  reading is allowed: Delete exists on everything and on a batch it means "hide this for good,
  until I open it again". O2 and O14 are proposals, then: delete is how you leave a people
  Catch-up, and a batch Catch-up has archive alone.

**Shared verbs**, Keeper only. They change the Catch-up for everyone.

- **Rhythm** (a setting, not really a verb).
- **Pause / Resume** (O3). He does not get it (¶8) and then supplies its only argument himself:
  *"if you let it go, it'll just start whenever the time is up."* That argument is about the
  clock between Rounds, not about a Round in flight, and today's pause freezes both, which is how
  a paused Catch-up came to hide a live Round (F21). My proposal: it survives as a **hold** on the
  next Round ("Don't start the next Round until I say"); a Round already collecting or answering
  finishes on its own. One verb, one meaning, and nothing it can hide. The alternative, today's
  freeze drawn honestly as a state the Now panel shows, is allowed. Either way it is never a
  banner that replaces the panel.
- **End**. Terminal. The only verb that earns a real confirmation. A direction may propose that
  End is reversible ("Ended" Catch-ups can be started again), which would make the hold above
  unnecessary; say so if you take that path.

And **Round verbs**, which are about this Round and live on the Now panel with the Round: ask,
open answering, nudge, close, extend, publish now. They are not in the menu, because they are not
about the Catch-up.

**Where they live.** The personal verbs and the shared verbs are **one door**, on the home's head.
The list row opens the same door (long press on a phone, a menu on desktop), because you archive
from the list you are looking at; that is one thing opening from two places, not two things.
Nothing else, anywhere, offers a lifecycle verb. That collapses today's five surfaces to one, and
answers the finding that archive and delete cannot be reached from inside the Catch-up they act on.
Reminders (Daily / Last day / Off) are a personal setting and sit behind the same door.

The door may be a menu, or it may be the people sheet itself: WhatsApp's group info is one screen
holding the members, mute, and exit, and for a thing you are in two or three of, one "info" sheet
holding people, your reminders, archive and the Keeper's settings is fewer ideas than a menu plus
a sheet. Either shape is allowed; two doors to the same verb is not.

**Where archived things live** (L5): one row at the bottom of the list, "Archived", present only
when at least one exists (Telegram: *"folders become available when your chat list is long enough
to start getting cluttered"*). Tap it to see them; open one to bring it back. The bin is the same
row's second half, with its 30 days said plainly.

**OPEN**: whether the menu is a sheet, a popover or a page; the exact words; whether the list row
also shows a swipe.

## 1.7 Who is here, and who wrote in

**LOCKED**: a row of birds plus "+18" identifies nobody, and initials are not the answer, *"Please
God, no"* (¶23, ¶27, I7). **LOCKED**: the Keeper's leaf beside the name is nice, keep the idea
(¶37, E2). **LOCKED**: the panel and the dialog show the same thing twice, *"So inefficient"* (¶12,
¶37, E1); the Keeper is labelled "Keeper" and nothing more (¶38).

**RECOMMENDED, binding for the round.** Two different questions, answered in two different places
(`prior-art.md` §5: the products that do this well separate the roster from the state).

- **Who is in this** is a roster: stable, rarely needed. It lives **one level down**, behind the
  count in the home's head, in the people sheet. The sheet is search first when the list is long,
  ordered by relevance (this Round's writers, then your own batch, then the rest), the Keeper's
  leaf inline on their row, and for a people Catch-up the add and invite controls at the top. No
  preview of the roster anywhere else. On a batch Catch-up the sheet is read-only: no add, no
  remove, no invite (D4, D28).
- **Who wrote in** is a state, and it is the reason you opened the page. It lives on the Round: on
  the Now panel while answering ("9 of 23 so far", then the names, and, because these are twenty
  people who know each other, who is still to write), on the cover once published, and on the
  reader's masthead. It is drawn as **names, with birds beside them** (a bird next to a name
  identifies; a bird alone counts). Up to some number of names, then "and 9 others" that opens
  the rest in place.

**OPEN**: the number of names before the fold; whether a bird sits beside every name or only in the
masthead; the sheet's look.

## 1.8 The batch Catch-up

**LOCKED (¶4, ¶5, ¶51, D4, D28)**: exists by default for every batch; everyone in the batch is in
it automatically; no adding, removing or leaving; someone who joins the site later is in it and
can read every earlier Round; batch and people Catch-ups are listed together as one kind of thing.

What S1 found (F17, `recon.md` §9): it never existed, the container needs no schema change (one
`Catchup` row pointed at the existing batch group), and his own 2026-08-21 reasoning is the
constraint on who keeps it: no single member may rename a shared batch group or change who is in
it.

**RECOMMENDED, binding for the round**, my proposals for what he left open:

- **O1, who keeps it.** Three answers were tried; the first is my proposal, and a direction may
  draw either of the first two.
  1. **Nobody.** A batch Catch-up has no Keeper. Catch-up verbs (rename, rhythm, pause, end,
     people) do not exist for it; it runs on its rhythm. Round verbs (open answering early,
     extend, nudge, publish now) are open to **any member of the batch**, the way "any member
     may create one" already is, because the clock does most of the work and a batch of
     thirty-nine can nudge itself. A commons, kept by everyone.
  2. **Whoever starts the first Round** becomes its Keeper for Round verbs only, never for the
     name or the people. Closest to today's "the creator is the Keeper" and to Letterloop; gives
     one accountable person; risks an accidental Keeper who vanishes.
  3. **The site's admins.** Rejected: it makes the owner the Keeper of eleven batches.
- **The first Round does not start itself.** A batch Catch-up is born with no Round. Its Now
  panel says what a Round is in one line and offers **"Start the first Round"** to any member.
  That is the "Start one" he remembers (¶4), but it starts a **Round**, not a Catch-up, and it
  never goes near an add-members page (B5). After that, it runs on its rhythm. Eleven batches
  getting Round 1 on the same morning by cron is noise nobody asked for; a batch that wants one
  presses the button.
  - **The alternative worth one direction's attention**: a **term calendar**. Every batch's Round
    opens on the same day, site-wide, three or four times a year, like term dates; nobody starts
    anything; "the next Round opens on 6 January" is a community event rather than a setting, and
    the question of who keeps a batch Catch-up disappears. Its cost is the batch nobody answers,
    which would publish an empty Round on schedule; Letterloop deletes such an issue and pauses,
    which the research calls harsh. A direction that takes this path says what happens to that
    batch.
- **The rhythm default** for a batch is quarterly (OPEN for S5; monthly is the people default).
- **No cap.** The 100-person cap is a creation cap on chosen people (`catchup-caps.ts`). A batch
  Catch-up's membership is the batch, so the cap does not apply to it.
- **The six members with no batch year (O12)** have no batch Catch-up and are in people Catch-ups
  as anyone is. Whether staff get one of their own is S5's question for him.
- **The drifted "Batch of 2024"** (F17) holds real answers on a snapshot group. S5 decides whether
  it is re-pointed at the real batch group or left as a people Catch-up with that name; the export
  makes either safe. Not a design question.

**OPEN to each direction**: how a batch Catch-up is told apart from a people one on the list and on
its home (a word, a mark, nothing), and what the empty first day looks like.

## 1.9 Answers with more in them

**LOCKED**: comments on answers (¶10, ¶17, ¶19, ¶27, D7); photos open in the viewer (¶10, D8); a
song link pasted anywhere makes a preview card, YouTube and Spotify at least, whatever the question
(¶16, ¶50, D9); a photo-wall question exists and is modular (¶16, ¶49, D10); the caption's More
and Less stays (¶32, D11); the answer tile's content stays: bird, name, batch, answer, a heart
(¶27, D12), its chrome does not.

**RECOMMENDED, binding for the round.**

- **Comments** sit under the answer, in the reader, collapsed to a count ("3 comments") that
  opens in place, using the same component family as post comments (¶27: *"We've done all that
  before"*). A comment on your answer is a notification that lands on the answer.
- **Links** (`prior-art.md` §7, measured): the sentence is never rewritten; the link stays a link
  inline; the card renders under the answer's text. The first music or video link in an answer
  gets a full card (art, title, artist, a source mark), the rest get a small chip. Our own card,
  never the provider's iframe. Resolution failing soft shows the plain link. The `songs` question
  kind stops being the only door: the trigger is a URL.
- **The photo wall** is a block any question can carry, not a section type: everyone adds one
  photograph; the Round prints them as one justified grid, tap to open in the viewer, attributed
  to a bird and a name.
- **Density** (¶11, ¶30, ¶31, R12, R18): the tile's thick bottom band and the one-line answer in a
  three-centimetre tile are the reader's to solve as far as the web can, and the magazine's to
  solve completely (¶31, M6). A direction says how it packs a one-word answer and a tall photo.

## 1.10 What "modular design taking care of it" means (¶36)

Today's matrix (`flows.md` §4) is ragged because every cell was decided on its own. Under 1.2 to
1.9, the same table reads like this. Columns are the Round's state on an active Catch-up; the
last two columns are the Catch-up paused or ended. Cells that read the same across a row are the
point.

| Intent | collecting | answering | preparing | published, waiting | paused | ended |
|---|---|---|---|---|---|---|
| See what is new for me | the row's state line; the Now panel | same | same | same | same, marked paused | same, "Ended" |
| Answer | not yet | **the one button in Now** | closed | closed | frozen | no |
| Ask a question | the Now panel | no | no | the Now panel, for the next Round (OPEN) | frozen | no |
| Read the latest Round | not yet | not yet | the hold | **the cover in Now, one tap** | via Before | via Before |
| Read an old Round | Before | Before | Before | Before | Before | Before |
| See who is in this | the count in the head | same | same | same | same | same |
| See who wrote in | no one yet | the Now panel, names | the Now panel, names | the cover, the masthead | same | same |
| Comment, heart | no | no | no | on the answer, in the reader | same | same |
| Change my reminders | the menu | the menu | the menu | the menu | the menu | gone |
| Start a Round | batch, no Round yet: the one button in Now | no | no | the clock, or a Keeper's "open the next Round now" | Resume first | no |
| Make a Catch-up | the list | the list | the list | the list | the list | the list |
| Invite someone | the people sheet (people Catch-ups) | same | same | same | same | no |
| Archive, delete | the menu, on the home and the row | same | same | same | same | same |
| Find an archived one | the Archived row, only when one exists | same | same | same | same | same |
| Rhythm, pause, end | the menu (Keeper) | same | same | same | Resume in Now and the menu | gone |
| Open, close, extend, nudge, publish now | the Now panel (Keeper) | same | same | no | frozen | no |
| Get back to the home | the name at the top | same | same | same | same | same |
| Get back to the app | the sidebar, the green bar | same | same | same | same | same |

Four Round states by two roles is eight real cells. Everything else in the table is the same few
words repeated, which is what he meant.

## 1.11 Copy, in one place

**LOCKED**: no "gentle", "quiet", "small", "warm", "a round of" (D43, his 2026-07-25 review);
"Keeper", not "started it" (¶38); the name plain, no suffix (¶25); the horizontal rule under the
masthead goes (¶27). **RECOMMENDED**: the name is printed one way everywhere, by
`catchupDisplayName` alone; the two hand-rolled possessives ("in the loop's Catch-up") go. Question
numbers survive only where they are navigation (the navigator, a page counter); a question is its
own heading, not "Question 1: ..." (O9, ¶27: *"Do we need to say Question 1?"*). "13 of the group
wrote in" is replaced by names (1.7), which answers ¶27's other question. Warmth at 4.5 on his
dial: one warm line per surface at most, on a title, never on a button. No em dashes.
`docs/content/AI-WRITING-TELLS.md` applies to every word a direction writes.

## 1.12 The Letterloop parity list (P22)

From `prior-art.md` §1, which read Letterloop's help centre and its one real screenshot. Each
direction says which of these it closes and how; the architecture already closes the first four.

| # | Letterloop has | We have today | Closed by |
|---|---|---|---|
| L-a | comments with @mentions on a reply | nothing | 1.9, every direction |
| L-b | a Music section with Spotify search and a card | a `songs` kind that prints a bare url | 1.9, on any pasted link |
| L-c | a Photo Wall section | a `photo-wall` kind, half-working | 1.9, a block on any question |
| L-d | "the next issue arrives on" at the end of an issue | a footer tease | the Now panel, and the reader's close |
| L-e | reactions per reply (a picker) | one heart | direction's call; the heart is the app's reaction language |
| L-f | reply progress: who has replied, who has not | "N of M have written in" | 1.7, names and the still-to-write list |
| L-g | Send reminders, up to three automatic plus manual | daily reminders plus a nudge | already there |
| L-h | the Album: every photo from every issue, three-up, by month, "View in Issue" | nothing | direction's call (a strong candidate for Before) |
| L-i | Download PDF | nothing | track M |
| L-j | Mementos: a shareable card from a reply | nothing | out of scope, unless a direction wants it |
| L-k | themes that recolour | one look | deliberately not |
| L-l | filter an issue by member, sort replies | nothing | direction's call for the reader |
| L-m | a banner photo and a logo per loop | nothing | direction's call: the derived picture, 1.4 |
| L-n | roles: Owner, Admin, Contributor, Reader | Keeper | the architecture keeps one role |
| L-o | Home quick actions for every loop | three CTAs on the index | the row's state line, 1.3 |

## 1.13 The screens every direction answers

So that eight directions can be compared like with like, each answers the same list (the
handover's checklist, in the order a member meets them):

1. **The list**, `/catchups`, at 390, 1512 and 1920, designed for two or three items (¶1, ¶6,
   ¶23, ¶24, I12), with the Archived row when one exists.
2. **Making one, and starting a Round**: a people Catch-up from chosen people; a batch Catch-up's
   first Round (¶4, B5, 1.8).
3. **The home** in every Now state: no Round yet, collecting, answering, preparing, published and
   waiting, paused, ended (¶15, ¶18, 1.3).
4. **The composer**, `/answer`, where a photo wall and a song are added, composable with text
   (¶16).
5. **The reader on desktop**, and **the reader on a phone with its navigation** and its density
   (¶10, ¶11, ¶34, R18, 1.5). This is the surface the sketch room draws, so it wants the most
   care.
6. **Who is here** and **who wrote in** (¶12, ¶27, ¶37, 1.7).
7. **The menu, the verbs and the dialogs** they open (¶14, ¶38, ¶40, D50, 1.6). The dialog
   material is fixed by `DESIGN-SYSTEM.md`; the direction decides what is a dialog, what is a
   sheet and what is a page.
8. **The batch Catch-up**: how it is told apart, its first day, its people sheet (¶4, 1.8).
9. **Archive and delete**, and where archived things live (¶5, L5, 1.6).
10. **Comments on an answer, a song card, a photo wall** (¶10, ¶16, ¶50, 1.9).
11. **The notification** a member taps at each transition and where it lands (¶36, 1.5).
12. **The empty states**: a brand-new member, a batch with no Round yet, a Round with one answer.
13. **The pressure fixture**: how the direction survives one answer, forty answers, a 6,000-
    character answer, a twenty-four-photo wall, a 300-character question, a name of 78
    characters (`_fixtures/pressure.ts`, built to the real caps; D35 as corrected in `recon.md`
    §6).

Plus, for each: the design-system rules it breaks and why (D36); which parity gaps it closes
(1.12); what in its room must be live rather than static; and the two things it is least sure it
got right.

## 1.14 What every direction is judged on

Two questions, his (CLAUDE.md, "The bar is a test"): does it give him any dopamine (¶3), and can
you tell it belongs to this app while looking like nothing already in it (¶42). And one veto:
none of them is today's layout with the bugs fixed (¶26, D37: *"You would be reducing the
negatives but not increasing the positives"*). Then the checklist above, and then one more
question put to the judges: which of these would he still be thinking about tomorrow.

## 1.15 How this page was written, and what it deliberately leaves alone

One mind, before any designer read the problem, from the brief, the recon, the flows and the
research. Each binding call above was tried more than one way first, and where a second way was
nearly as good it is written in beside the first so the designers can take it. The page fixes
where things live and how few of them there are; it fixes no shape, no colour, no mechanism and
no copy beyond the words he has already ruled on. If a direction finds that a binding call makes
its best idea impossible, it says so in its own text and does the idea anyway; the judges will
weigh it, and S5 can move the line. The one thing no direction may do is give a noun a second
home, because that is the exact rot the campaign exists to cut out.

---

# Part 2. The directions

## 2.1 How they were made

Ten designers, each given the architecture above, `brief.md` in full, the design system, and one
starting bet. Seven also read `recon.md`, `flows.md` and the measured parts of `prior-art.md`.
**Three were blind**: they read the brief, the architecture and the design system and nothing
else, on ¶26's reasoning that forty-three findings about today's layout is a description of
today's layout. The blind ones were `08 whole-app`, `09 action-button` and `10 letter`. Every
designer wrote to the same eight-section shape, so the ten can be compared like with like, and
every one is on disk in full at [`directions/`](directions/): the reader section of each is what
the sketch room draws, and it is the text a room builder works from. This file indexes them; it
does not replace them.

Each was then scored by an Opus judge against the brief with quotes, an adversarial judge read all
ten hunting for "today's layout with the bugs fixed", and a three-lens panel (the owner on his
phone, a designer at Apple, a member of the batch of 2003) answered the one question a checklist
cannot: which of these would he still be thinking about tomorrow. Their findings are in 2.4. The
first run of all this died on his session limit at 23:40 with four directions written; the rerun
at 05:40 read those four back and wrote the other six. Nothing was lost.

## 2.2 The ten, in one paragraph each

My read, from the files themselves. The judges' numbers are in 2.4 and where they moved me I say
so.

**01 · You land in the Round** (`front-door`, reading). Tap Catch-ups and you are reading the
newest Round; the home is one move up. The Round is one sheet of paper with no cards on it, and
its masthead folds into the app's own green bar: name, the question you are in, eleven notches
and a fill line, all inside the 56px the phone already had. Tap the bar and the contents rise as
a sheet whose first row is the way up. Short answers pack as "runs" (bird, name, words, heart on
one line), long ones as "pieces". Strongest idea: a spine with zero new chrome, which is ¶42
done with the most familiar object on the phone. Weakest: landing in a Round read a fortnight
ago while the next one is open and wants your answers; the designer knows it. **Keep.**

**02 · The calendar keeps it** (`calendar`, reading). A Catch-up is a run of dated Rounds on one
spine, and the next date is the hero of the home: a Libre Baskerville numeral with a cinnamon pen
circle round it. A batch runs on three site-wide term dates with nobody in charge, which answers
O1 by removing it; a term nobody answers is recorded as a hollow dot and its questions carry over.
The list row's picture is a year of dots. The phone reader has an always-on bottom bar with a
track whose segments are proportional to each question's length, and a writer filter. Strongest:
the circled date is the one mark in the batch that could only be this app, and the term bell makes
a Round a community event. Weakest: three notifications a year to a batch that never answers, and
58px of every phone screen spent on the bar. **Keep.**

**03 · Everyone under the question** (`conversation`, reading). The question is the only card and
every answer is a line inside it beginning with a name, so "Who believes Sanan made this website?"
is eleven lines on one screen instead of four screens of tiles. The heart is an end mark on the
last line. The green bar grows to 76px and prints the Catch-up's name over the question you are
in, white on Canopy. Strongest: density, and the question riding up into the green. Weakest: 133
hearts down the right edge, and a 12px "Reply" nobody may see. **Keep.**

**04 · A question is a page** (`paged`, reading) and **08 · Every question is a page**
(`whole-app`, blind). Two designers, one reading and one blind, arrived at the same bet: a Round
is not one scroll, a question is a page, you turn pages with your thumb, and a segmented line
always says where you are. They differ in execution. 04 keeps the app's shell and puts a folio at
the foot of the phone (the line, the name, the counter, the question); 08 leaves the shell for a
glass bar at the top with the same line, opens on a cover page with the Round's most-hearted
photograph, and keeps every verb in one "About" sheet. Both drop short answers out of their cards
into lines; both pack desktop answers into two columns; both give the back page or the shelf an
album of every photograph. That a blind designer and a reading one converged is the strongest
evidence in the batch that the page model is right for the phone. Their shared risk is also the
same: a horizontal gesture on a web page, and a desktop reader that has to click where it used to
scroll. The three panel lenses each called 08 the one they would forget by tomorrow, "the average
of the other nine"; 04 is the one that carries the idea. **One direction, two executions; both
sketched so he can pick the bar's edge.**

**05 · Covers that draw themselves** (`shelf`, reading). Every Round earns a cover from what is in
it: a 3:4 paper plate with a nameplate, and under it the most-hearted photograph, or, when there
is none, the "flock", the birds of everyone who wrote in drawn like a field-guide plate. The list
and the home are shelves of those covers at fixed sizes that never stretch. The reader is a sheet
with the grammar the magazine will print from: square corners on printed things, a folio at the
foot that is a line of type rather than a bar, entries with no chrome. Strongest: it answers ¶1's
"maybe the catch-up could have a picture" and ¶6's white space with one object, and it is the only
direction that makes track M's job easier. Weakest: the flock is birds alone, which ¶23 calls
useless, and the designer says so in section 8 with the typographic cover as the fallback.
**Keep.**

**06 · Roll call** (`room`, reading). The first thing you read is a sentence of thirteen names
with their birds. The phone's navigator is a plate at the foot that carries the bird of whoever is
talking under your thumb, and opens through two detents into the questions and the roll, where any
name filters the Round to that person. Answers under 80 characters are "remarks", clustered first
as chips; the rest are tiles. Your two or three Catch-ups appear as rows in the sidebar. Strongest:
the speaker's bird in the plate, and the sidebar rows. Weakest: remarks reorder what people wrote,
and every verb lives under the count of people, where nobody looks for Archive. **Keep.**

**07 · As it arrived** (`transcript`, reading; the wild one). A Round read in the order people
wrote, as runs per person with each question pinned above its answer, day markers between, and a
roll that prints the hour each person wrote in on the valley's clock. The designer found that the
data yields arrivals rather than conversation (the composer saves answers seconds apart, in order)
and designed for that honestly. Strongest: the roll with its hours, and a sheet whose rows carry
the first line of every answer, which for the one-liner questions is the reading itself. Weakest:
it gives up the thing Letterloop sells, everyone's answer to one question in one place, and its
navigator has four states. **In the cull as the wild card**, because ¶20 asked for spaghetti; if it
goes, its roll, its bar and its "Latest" log should survive into whichever wins.

**09 · The bar is the question** (`action-button`, blind). The green bar every phone screen already
has becomes a Canopy plate a third of the screen tall: the name, "Round 1", who wrote in, the first
question, white on green. Scroll and the plate leaves but its 56px foot stays as the bar, holding
the question; touch the bar and it grows to fill the screen with the contents; drag it sideways and
the next question slides in. Every Round, everywhere, is a green plate at one of five sizes.
Answers are on paper with no cards, short ones set in Baskerville. Strongest: the most distinctive
look of the ten and the clearest reading of ¶42's "higher level of abstraction" (green means "a
Round", and nothing else is green). Weakest: too much green is a real risk on a page with no
photograph behind it, and a drag on a top bar is a gesture the web never taught. **Keep.**

**10 · Signed at the foot** (`letter`, blind). A Round is one letter thirteen people wrote. Every
answer is a passage of prose on a single sheet, and the writer's bird and name come at its foot,
where a signature goes; short answers are one row with the signature inline. Sheets have 4px
corners because paper is cut square. The phone's navigator is a two-line running head under the
green bar that opens the letter's contents; tap a name anywhere and the letter becomes that
person's part. The list's picture is a stack of sheets, thicker the more was written. Strongest:
the most typographic of the ten, and the only one where reading the name is a small event. Weakest:
on a phone you read 800 characters before you learn who is speaking, and the running head under
the green bar is 108px of chrome. **Keep.**

## 2.3 What the ten agree on

Ten designers with ten bets converged on more than the architecture asked of them, and the
convergences are the findings a single mind could not have produced.

- **The answer tile goes.** Seven of ten drop the card around an answer (01, 02, 03, 05, 07, 09,
  10); the three that keep a tile (04, 06, 08) drop short answers out of it into lines. Nobody kept
  today's tile. ¶30 and ¶31 are answered by consensus.
- **Short answers pack.** Eight of ten have a rule for an answer under about 80 to 120 characters
  with no photograph: one line, name and words and heart together. The thresholds differ (24, 48,
  80, 90, 120, 160 characters); the rule is the same.
- **Names, with birds beside them.** All ten. Nobody drew a row of birds with a number; the
  masthead is a sentence of names in eight of ten.
- **A contents sheet from the bottom.** All ten open the questions as a sheet or panel, with the
  current row marked by colour or a bar and never by weight (the R4 reflow is gone in all ten).
- **Two families for the phone's navigator.** At the foot, under the thumb: 02, 04, 05, 06, 07. In
  the app's own green bar: 01, 03, 09; under it: 10; its own bar: 08. This is the one real fork in
  the batch and it is his to pick; the sketches show both.
- **A derived picture, but not the same one.** Three take the most-hearted photograph (04, 05, 08),
  two derive something else (02's year of dots, 10's stack of sheets), one refuses a picture (09:
  the green is the picture), one uses birds (05's flock, and 08 falls back to it).
- **A writer filter.** Four (02, 06, 07, 10) let a name turn the Round into one person's answers,
  which closes Letterloop's L-l on any width. Worth carrying whichever direction wins.
- **The hold, and nobody keeping a batch.** Nine took the architecture's proposals for pause and
  O1; 02 went further and removed the first-Round button with the term calendar.
- **Nothing horizontal on the page** except the two paged directions' page turn. The chip row is
  dead in all ten.

## 2.4 What the judges said

Ten Opus judges, one per direction, scored fifteen items from 1 to 5 against the brief with a
quote for each; an adversarial judge read all ten hunting for today's layout; three panel lenses
answered the tomorrow question. The full returns are in the workflow journal named in the session
log. What matters from them:

| Direction | Judge, of 75 | Today-shaped, 1 to 5 (adversarial) | The panel |
|---|---|---|---|
| 02 calendar | 68 | 3 | second, all three lenses |
| 05 shelf | 68 | 3 | |
| 04 paged | 65 | 4 | |
| 08 whole-app | 65 | 3 | the forgettable one, all three lenses |
| 01 front-door | 64 | 4, the most today-shaped | |
| 09 action-button | 64 | 2 | **first, all three lenses** |
| 07 transcript | 63 | 2, the least today-shaped | |
| 06 room | 62 | 4 | |
| 03 conversation | 60 | 3 | |
| 10 letter | 58 | 3 | |

Every judge said keep, and none found a direction that is today's layout with the bugs fixed. What
they found instead, direction by direction, and where it changed my read:

- **01** prints "13 WROTE IN" as a bare count above every question heading, which breaks its own
  rule that a count never appears without names; and its desktop home keeps today's two-column
  geometry. The adversarial judge ranks it the most today-shaped of the ten for that. Its reader is
  not; its home is.
- **02**'s weakest point is the term calendar's rigidity: three fixed dates a year, site-wide,
  unchangeable, on the one Catch-up everyone is given. Its composer is today's long form with a
  better bar.
- **03**'s list scored 2 of 5: today's tile with three things deleted and nothing put back. Its
  reader's density is the thing every lens praised.
- **04** rebuilds both of today's rails (a Fresh-off-the-press column on the list, a rail on the
  home) and keeps a heart in a band; its folio is "the best-drawn object in the batch".
- **05**'s flock is the weakness every reader named, in the designer's own words and the panel's.
  Otherwise the joint highest score, and the only direction that makes track M cheaper.
- **06** prints the Round twice on its list door (the state line, then a nested cover box saying
  the same date), which is ¶15 in miniature. Its changing bird is "the best small idea in the
  ten" (three lenses, independently).
- **07** loses on ¶16's own ground, everyone's answer to one question in one place, and says so.
  Its roll with hours and its sheet with first lines are the parts to lift.
- **08** is the average of the other nine; every idea in it is done harder by a neighbour. Folded
  into 04 as its second execution.
- **09**'s list is a card of rows with hover dots, defended by assertion. Its reader is the only
  one that reads ¶42 "as a method instead of a mood".
- **10**'s reader is "the best-drawn surface in the campaign" and its name-last rule is the
  friction every lens would feel in ten seconds.

**Where ten designers converged without being asked** (the adversarial judge's list; these are
findings, and they belong in S5's spec whichever direction wins):

1. A progress line made of one piece per question, filling as you read. Seven invented it
   independently; the architecture had only asked that the current question be named.
2. The chip row replaced by the same two-part mechanism in all ten: a persistent one-line namer of
   the question, plus a sheet listing every question with its count, the current row marked by
   colour and never by weight.
3. A boxless form for a short answer, in eight of ten, with thresholds from 24 to 160 characters.
4. "Before is everything Now is not": seven caught that 1.3 read literally draws the latest cover
   twice on a home with one Round, and made the same repair.
5. The app's green bar becoming the reader's own surface, in four (01, 02, 03, 09).
6. And one regression: three (04, 05, 07) put a second column of recent Rounds back on the list,
   which is Fresh off the press by another name. S5 should refuse it unless a room proves it.

**The bet nobody took.** The adversarial judge's last finding, and the one I would have missed:
*answering is the product*, and all ten directions are about how a finished Round is read. Nine
dispose of the composer in a paragraph and keep today's shape. The act that produces every Round,
the surface a member spends longest on, and the one where a song link and a photo wall are made,
has no direction of its own. That is the first thing S3b should do if he runs it, and if he does
not, S4's brief for each surviving room asks the builder to draw the composer with the same care as
the reader (Part 3).

**The three grafts the panel proposed**, each from a direction it did not pick onto the one it
did, and each worth trying in a room whichever way the cull goes: 06's changing bird into 09's bar
(the bird of whoever is speaking, cross-fading as you scroll); 02's proportional track onto 09's
ticks (segments sized by each question's length, so the forty-answer question is legible before you
enter it); 06's roll as a control onto 09's masthead (tap a name, read one person's Round).

## 2.5 What survives, and the order of the tabs

All ten are drawn in the sketch room, because the cull is his and not mine (D25, and the S3
section: "his cull is the shortlist, not your ranking"). The tabs run in the order I would look
at them, which is a nudge and nothing more: 09, 02, 05, 01, 03, 06, 04, 08, 07, 10. The first two
are where three lenses and the top judge scores agree; 08 sits beside 04 as its second execution;
07 is the wild card he asked for; 10 is last only because its beauty is the thing a static
drawing shows best and its friction the thing only a room can prove.

The real Round the sketches draw ran eight days, not five: thirteen people in twenty-three runs,
seven of them on the first day, which the transcript's builder found when it derived the runs from
the data. The designers' invented sample copy is replaced by the real Round everywhere the sketches
have it.

---

# Part 3. Room briefs, for S4

## 3.1 Every room, before the briefs

Read `docs/planning/catchups-rework/handover.md` ("S4: Rooms") and `docs/spec/lab-voice.md`
first; this section adds to them and repeats nothing. Then the direction's own file, all of it,
from `directions/`: its section 3 is the reader you build, section 6 says what must be live, and
section 7 is what the pressure fixture must survive. **The sketch in `src/app/lab/catchups/
sketches/_directions/<slug>.tsx` is a drawing, not a starting point**: it was built to be looked
at once, without a browser, and it fakes what a room must do for real. Read it for the numbers the
builder chose where the direction was silent (each is marked in a comment), then build the room
from the direction.

The marks below use the three the campaign uses. Across every room:

- **LOCKED, his.** The palette (¶42, D3). Names with birds beside them, never a row of birds with
  a number, never initials (¶23, ¶27). No quoted answer as a teaser (¶9). No chip row and nothing
  that scrolls sideways on the page (¶11). Comments on answers (D7). A card for any pasted song or
  video link, on any question (D9). A photo-wall block (D10). Captions keep More and Less (D11).
  The answer's content stays: bird, name, batch, answer, heart (D12). No Back button (D48). The
  Round drawn once per screen (¶15). Archive and delete like WhatsApp, off the main list (¶5). The
  batch Catch-up fixed, automatic, unleaveable (¶4, ¶51). No "gentle", "quiet", "small", "warm",
  "a round of" (D43). The name plain, no suffix (¶25).
- **RECOMMENDED, mine.** Part 1's binding lines, which every direction was built inside: six nouns
  with one home each; the home as head, Now, Before; one cover; the name as the way up; one door
  for the verbs; the hold in place of pause; who-wrote-in as names; the batch with no Keeper and a
  "Start the first Round" button. A room may depart where its direction did, saying so in its
  caption.
- **OPEN, the builder's.** Every number the direction gives is a starting point unless it says it
  is the decision. The builder owns the iteration loop: screenshot at 390 and 1512, look, fix, look
  again, and bring back something better than the direction where it can, saying what changed.

Every room draws the composer as well as the reader, at least as a static composition, because no
direction gave it a design of its own (2.4). Every room takes `?fixture=pressure` and renders the
corpus in `_fixtures/pressure.ts` through the same loader as the live Round; the forty-answer
question and the 6,000-character answer are the two cases the reader is judged on first. What good
looks like, in every room: at 390, the first screen holds a whole answer and names the Round; at any
depth, the question you are in is named on screen and the contents are one tap away; the way up is
the name; nothing pushes the page sideways; and it passes his two questions, which only he can
answer, so the room's job is to give him the real thing to answer them on.

## 3.2 The briefs

**09 · The bar is the question.** Intent: the green bar every phone has becomes the reader, and
"a Round is a green plate, wherever it is drawn". Must be live (§6): the plate leaving upward and
its foot staying as the bar; the bar's two lines fading in; a plate boundary pushing the old bar
out; the bar's drag and the page slide, with the rubber band at either end; the bar growing into
the full-screen contents and a row landing on its plate; the sticky identity row on the
2,000-character answer; the desktop rail following the scroll. Test first: how much green a
390 page can carry with no photograph behind it (§8), and whether anyone finds the drag. Try the
three grafts: the speaker's bird in the bar, the proportional ticks, the masthead's names as a
filter. OPEN and granted: the list, which the judges scored lowest; bring back a list that is not a
card of rows, or prove that one is right. The composer: draw it as a plate you write on.

**02 · The calendar keeps it.** Intent: the next date is the hero, a batch runs on the site's term
dates with nobody in charge, and the phone reader has a bar that never hides with a track the shape
of the Round. Must be live (§6): the bar and its proportional track filling with scroll, the sheet,
the return control, the writer filter, the masthead's "and 8 others". The circled date is an SVG
stroke, never a border radius; the sketch's ellipse is arithmetic, so draw it against the real
numeral and look. Test first: the always-on 58px bar against a hiding one (§8), and the year of
dots at a list row's size. RECOMMENDED: the term calendar is drawn as the batch's default with the
"Start the first Round" alternative shown beside it in the room's caption, because S5 decides O1
and he has not seen either. OPEN: whether Before is the spine or a shelf.

**05 · Covers that draw themselves.** Intent: every Round earns a cover, the list and the home are
shelves, and the reader is the page the magazine prints from. Must be live (§6): the folio's
fade-in past the masthead, the contents at two detents, the shelves' sideways scroll, comments in
place. Test first: the flock, drawn against the typographic cover the designer names as its own
fallback (§8), side by side on one shelf, because the judges and the panel all named it. Square
corners on printed things are the direction's point; keep them and let the room say why. OPEN: the
"RECENTLY OUT" shelf, which the adversarial judge calls Fresh off the press rebuilt; build the room
without it first.

**01 · You land in the Round.** Intent: the reader is the front door and its masthead folds into
the green bar. Must be live (§6): the fold at the crossing point, the notches and the fill line,
the contents sheet, the two packings on the real Round. Test first: landing in a fortnight-old
Round while the next is open (§8), which needs the fixture's collecting state; and the "13 WROTE
IN" count above every heading, which the judge caught breaking the direction's own rule, so drop
it. OPEN: the home, which keeps today's two-column geometry; try it as one column.

**03 · Everyone under the question.** Intent: the question is the only card and answers are lines
that begin with a name. Must be live (§6): the bar's question swapping as you scroll, the sheet, the
end-mark heart, a reply thread opening. Test first: whether the end mark lands on the last line or
drops (§8), on the real Round, because the density claim rests on it; and the raw link printed
inline on the four song answers, which the sketch shows is the ugliest thing on the screen. OPEN:
the list, scored 2 of 5; it needs a shape.

**06 · Roll call.** Intent: the people are the product; the roll leads and the speaker's bird rides
in the plate. Must be live (§6): the plate's three detents, the bird cross-fading with the reading
line, the leaf line, a chip filtering the Round, the sidebar rows lit. Test first: remarks in place
versus remarks clustered first (§8), because three lenses called the reordering the worst thing in
the batch; and Archive behind the people count, with a menu on the head as the comparison. Fix
before building: the list door prints the Round's date twice.

**04 · A question is a page**, with **08** as its second execution. Intent: a question is a page
and the 49,000px scroll stops existing. Must be live (§6 of both): the swipe with the neighbour
riding in and the rubber band at the cover and the back page; the line filling; the sheet; the turn
row; the desktop rail and arrow keys. Build 04's folio-at-the-foot inside the shell first; then 08's
own bar with no shell as a switch in the same room, so the one difference between them is one
control. Test first: the direction-locked gesture in Safari at 390 (§8 of both), because if it is
not clean the direction survives as folio plus sheet plus turn row. OPEN: the list and the rails
the adversarial judge flagged; the back-page album is worth keeping whatever else goes.

**07 · As it arrived.** Intent: the Round in the order people wrote. Must be live (§6): the bar
tracking the reading line, the sheet expanding to pins, the lens with its return, the pins as
buttons. Build it knowing what the data does (twenty-three runs over eight days) and let the room
show the cost honestly. What to lift out if it loses: the roll with hours and "Times are the
valley's", the sheet whose rows carry first lines, the "Latest" log.

**10 · Signed at the foot.** Intent: a letter thirteen people wrote; the signature at the foot.
Must be live (§6): the running head fading in past the masthead and opening its panel, by-writer,
the one-row packing on questions 7 and 9, the desktop margins with the birds hanging. Test first:
the name last (§8) against the designer's own fallback, a bird alone at the start of the passage
with the name still at the foot. OPEN: the running head's second line, which the designer suspects
is one line too many.

---

# Part 4. What I would pick

He picks; this is the lean. I would take **09, The bar is the question**, as the base, because it
is the only direction that reads ¶42 as a method: one material, the app's own green, meaning one
thing, "a Round", at five sizes from a stamp on the list to the whole top of his phone, and because
it turns the surface of the bug he reported four times into the feature. Onto it I would graft
three things the room can test cheaply: 06's speaker's bird in the bar, 02's proportional ticks,
and 02's circled date as the Now panel of the home, which also brings the term calendar with it as
the answer to who keeps a batch Catch-up. If the green is too much at 390, which is the direction's
own worry and mine, 01 is the same idea with the same bar at a third of the green, and I would want
to see both before deciding. 05's derived cover is the answer to ¶1's "maybe the catch-up could
have a picture" and should survive into whichever wins, with the typographic fallback and not the
flock. The magazine (track M) is served best by 05 and 10, and either's page grammar can be borrowed
by the reader that ships.

---

# Part 5. The sketch room, and what he does next

**`/lab/catchups/sketches`**, on his phone first. Ten tabs across the top in the order of 2.5, a
Phone and a Laptop toggle, and for each direction three drawings: the reader from the top as a page
he can scroll, one screen deep in question 5 with the navigator resting, and one with the navigator
open. The laptop drawing is the same reader at 1512, scaled to fit, with "Open at full size" for
pinching. Every drawing is the real Round, "in the loop" Round 1, read from the database; the first
three questions are drawn in full and the rest are named. Comments do not exist yet, so their counts
are invented and any comment text is marked so in the code. Song cards carry invented titles where
the data has none, marked the same way. Nothing on the page moves: it is the cull, not the pick.

Deep links, for a message from his phone: `?d=action-button&w=phone`, `?d=calendar&w=laptop`, and
so on with the slugs in 2.2.

**What he does**: twenty minutes, phone, then the laptop toggle on the two or three he likes.
Then one line back, from anywhere: *"keep 09, 02, 05 and 01"*, or *"keep 09 with 06's bird"*, or
*"none of these, run S3b"*. That line is S4's shortlist (D25). The questions this leaves for him
are numbered in `handover.md` under "Owner questions", each with a default, so *"defaults"* is also
an answer.

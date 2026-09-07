# Catch-ups: the architecture, settled

**S4, 2026-09-07. One hand.** This file supersedes [`directions.md`](directions.md) Part 1, which
was written before he had seen anything and before the two reviews. Where they disagree, this one
wins. Where this one and [`review-2026-09-06.md`](review-2026-09-06.md) or
[`review-2026-09-07.md`](review-2026-09-07.md) disagree, **he** wins: those are his words and they
are later than any of this.

It answers the question he says matters more than the aesthetic (N16):

> "We still have to design the aesthetic for every other page, and then more importantly, the
> structures between, behind these pages. How they relate, how you access everything. The entire
> logic of this entire concept."

Two surfaces are drawn live from it, at `/lab/catchups/sketches`: the list, and a Catch-up's home
in every state. The composer, the people sheet and the verbs' dialogs are the session after.

---

## 1. The one idea

**A Round's contents is one object, drawn at two depths.**

The questions of a Round, hung off a vertical measure, is a single component. It appears:

| Depth | Where | What the measure does |
|---|---|---|
| the home | as the **cover**: in Now when the newest Round is out, and once per Round under Earlier Rounds | a hairline, and cinnamon on a Round you have read |
| the reader | as the **navigator**, unfolded from the strip or open in the rail | fills as you read, and stops at the question you are in |

It is the same questions, in the same face, at the same measure, in both places. Nothing is
truncated to twenty characters, nothing is counted, nothing is numbered. Going deeper does not
change the object; it gives the measure a job.

Warm means READ, and it has to, because a full measure is what the reader leaves behind when you
reach the end of a Round. Marking the *unread* one warm would read better on a shelf and would make
the same colour mean opposite things two taps apart.

It was on the list too, as a third depth, until he saw it there (§4, N25). The list is navigation
and carries the Catch-up's picture instead.

That is what ¶42 asks for and what the fifteen rejected sketches did not have:

> "There can be a higher level of abstraction where it's still unique, it's still different, but you
> can tell that it belongs to this app."

It is also the answer to the campaign's oldest complaint. A published Round is drawn ten ways on
four surfaces today (`recon.md` §5), with two different teaser lengths, two typefaces and two hover
treatments for the same object. After this it is drawn **once**, and the reader's navigator is not a
cousin of the list's cover — it is the same file.

And it retires the teaser sentence he objected to (¶9) without leaving a hole. What a cover carries
is the questions, which change every Round and are the actual reason to open it. What it never
carries is a quoted answer: *"I'm just not gonna see this sentence again and again and again."*

## 1b. The Catch-up's picture

**Added 2026-09-07, in the middle of drawing this, and it is his** ([`review-2026-09-07.md`](review-2026-09-07.md)
N19 to N25). His diagnosis first, because it is better than any fix that was on the table:

> N19: "In feed, you have these images, you have the birds and everything ... Directory, you have
> the whole graphic of the map, and that's kind of single-handedly carrying that thing ...
> Collection, obviously there's so much graphics ... Catch-ups is the only one that has like
> nothing, no images, no media. It's just all text and organization and very functional and very
> corporate."

**Every Catch-up has a picture, from the day it is made.** It is never optional and there is never a
Catch-up without one, which is the reason he gave for not making it an upload-only feature (N23:
*"then we'd have to have 2 different architectures"*). One of about twenty photographs of the school
is picked for it; whoever may run the Catch-up may replace it with their own, positioned at the
time (N22, N23). On a batch Catch-up, "whoever may run it" is anyone in the batch, the same rule
that governs starting a Round.

**One shape everywhere: 3:2, one corner radius.** A circle was drawn and is wrong here — a circle
means a *person* in this app (`BirdAvatar`), and a Catch-up is not a person. A rounded rectangle is
the distinction iOS draws between an app and a contact.

**Where it goes, and where it does not.**

| | |
|---|---|
| the list | the card's full width, 3:2, edge to edge. The picture **is** the card |
| the home | an identity mark: 160 wide above the title on a phone, 156 beside it on a laptop |
| the reader | **nowhere.** The reader is the Round, not the Catch-up, and the green bar already carries the name. A picture there would be the same thing said twice (R13) |

**What the twenty want to be, and it matters.** Details, not vistas: a wall, a bit of the banyan, a
shadow on a step, a doorway, a bench. The landing page and half the Collection already are wide
valley views, so twenty more would read as the same photograph again — which is visible in the room
right now, where three stand-ins from the demo Collection are three green trees. A detail also
survives being cropped small, has no face in it, and does not put its subject dead centre where a
re-crop will cut it.

## 2. The nouns, and the one home each

A member thinks in six things. Each has exactly one home; every other appearance is a pointer to it,
and a pointer may go anywhere.

| Noun | Its one home | How it appears anywhere else |
|---|---|---|
| **A Catch-up** | `/catchups/[id]`, the home | one card on the list: its picture, its name, one line |
| **A Round** | published: the reader. Unpublished: the **Now** block on the home | **the cover** (§1), and nothing else, ever |
| **The people** | the home: a column on a laptop, a disclosure on a phone | named beside their answers; named on Now while answering |
| **A question** | inside its Round | a row of the contents (§1) |
| **An answer** | under its question, in the reader | nowhere. No teasers, no previews, no most-hearted pull-quote |
| **A comment** | under its answer, in the reader | a count on the answer's replies control; a notification |

**The rule that is not allowed to bend**: no noun gets a second home. That is the rot the campaign
exists to cut out, and every fault he listed on the home (¶15, ¶35) is one object with three.

**Correction to `directions.md` 1.2 and 1.7.** That file put the roster "one level down, behind the
count in the home's head". R2 is later and it is his:

> "the homepage or whatever of the catch-up can have all of the people listed in the sidebar. I think
> a couple of designs have it. They do it in a couple of different ways. You'd have to figure out
> what the best way is."

So on a laptop the people are **listed on the home**, all of them, and there is no preview, no "and
16 more", no See-and-add dialog. On a phone there is no room for a column, so the same list opens in
place under one control. **No sheet and no dialog**, which deletes a surface the next session was
going to have to draw. This is why E1 and E3 stop existing rather than getting redesigned: the panel
was ugly because it was previewing a list inside a box, and the dialog existed because the preview
had to fold. Give the list a column and neither problem exists.

## 3. A card is a door

On the list and on the home, **a bordered card means "this opens something", and the whole card is
the target.** Everything that is not a door is set directly on the page's own paper: headings,
state lines, the people column, the verbs.

This one rule retires five separate complaints:

- the dead "Round 1 is out" tile whose only live pixels were five words of link (¶35, H3, recon §5);
- the View button, which existed because the tile around it was not clickable (¶3, I5);
- "open it on its own page" printed inside a tile that was itself on that page (¶35);
- the three dots wedged beside the View button, off the top right where dots belong (¶24, I6);
- the hover that darkened a shape nobody could name (¶9, ¶3, I11) — a door highlights as one
  rectangle because it is one rectangle.

The **answer tile** in the reader is a card and is not a door, and that is fine: it is two levels
down, the content itself, and there is nothing under it to open. The rule governs the two surfaces
where you are choosing where to go.

## 4. The list, `/catchups`

**No right rail. No "Fresh off the press". No calls to action in the header.**

The rail is deleted rather than redesigned, and that answers I1 ("sort out what belongs in the left
column and what on the right") by removing the question. It also removes, at a stroke: the curved
divider (recon I9), the padding-less hover (I9), the double truncation (recon §12.10), the empty
Round promoted above a Round with 133 answers (recon §12.7), and the fact that on a phone the whole
rail is `display: none` and always was (recon §12.2). The surface he said had *"the most bugs"* and
*"severe problems"* (¶9) has no successor, because its job was to tell you what was new to read, and
a Catch-up showing its own newest Round tells you that better.

The page is the app's `PageHeader` — "Catch-ups", 30px, the bell, and one action, "Start a Catch-up"
— and then a **shelf of cards**, one per Catch-up. There were three calls to action on opening and
now there is one (I4).

**One card is three things: the picture, the name, one line.**

```
┌────────────────────────────────┐
│                                │
│         the picture            │   3:2, edge to edge, the card's own width
│                                │
├────────────────────────────────┤
│ Batch of 2005                  │   the name, in the heading face
│ Round 4 · answers close on     │   one line: cinnamon Round, the app's dot, the fact
│ Thursday 20 August             │
└────────────────────────────────┘
```

**The Round's questions used to be on this card, and he took them off** (N25):

> "I'm not too happy with having questions. I just feel like it's overcrowding. There's just too
> much text going on for something that should just be a navigation for all your catch-ups ... it
> just seems a bit overwhelming."

He is right and they lose nothing by going: the questions are still on the Catch-up's home, on Now
and on every cover under Earlier Rounds, which is where you are when you are choosing what to
*read* rather than which Catch-up to *open*. So the contents object of §1 lives at two depths
rather than three, and the list is navigation.

**And there are no buttons on it.** Every card is the same three things at the same height, so the
page is a shelf rather than a form, and a grid of them has no holes. Answering is one tap further
in, on the home, beside the Round it belongs to — which is the only place it has ever belonged.
That also settles I5 and I11 outright: there is no View, nothing to right-align, and the hover is
the whole rectangle because the card is one rectangle.

Two panels sit side by side at a laptop's width and one on a phone. A member has two or three
Catch-ups (I12), so two up is a screen.

**The three shapes drawn before this one**, so nobody re-treads them:

- *A wide row with the name in a margin and the Round's contents in the body.* No holes at either
  width, and it was what the questions needed — but it is a page of text, which is the thing he
  objected to.
- *A two-column grid of those rows.* Unequal heights lock into rows: a five-question Round beside an
  eleven-question one leaves 165px of hole under it, mid-page.
- *CSS columns of those rows.* Flowing instead of locking, and with three items the balancer puts
  the tall one alone in the left column: a 470px void with the page ending in the middle of it.

Equal cards make all three problems disappear, and the picture is what made equal cards possible.

**Long rectangles on a television** (I2, I13). The shelf stops at 1096px, flush in the page's own
gutter. At 2560 a television gets air on the right rather than a 2,000-pixel line.

**The verbs are not on this page.** No dots, no menu, no swipe hint drawn at rest. On a phone a
card swipes left to archive, which is the WhatsApp gesture he named (¶5) and is undoable from a
toast. Everywhere else you archive from the Catch-up's own door (§6): the shortcut belongs where the
gesture is, and the honest control belongs where the thing is. Archived Catch-ups are one quiet row
at the very bottom, present only when at least one exists, opening in place, and never a block of
tiles with **Put back** in your face (¶5, L2, L5).

## 5. The home, `/catchups/[id]`

**Paper, not a grid of cards.** Three parts, in this order, in every state. Only the middle one
branches, and it branches on the **Round's** state, never on the Catch-up's.

### The head

The Catch-up's **picture** (§1b), then its name at the app's page-title size, printed plain — "in
the loop", not "in the loop catch-up" (¶25, H4). Under the name, one line: the rhythm in words, and
for a batch Catch-up, whose it is ("Everyone from 2005"). At the right, one control, the door (§6).

The picture is above the name on a phone and beside it on a laptop. Beside it at 390 the title has
162px to live in, and "Batch of 2005" broke over two lines with its rhythm wrapping under it.

That is the whole head. No birds, no "+18", no count of people that is also a button.

### Now

The current Round, as the thing it currently is. Seven states, and the copy is fixed here so that
nobody writes an eighth:

| State | Now says | Now offers | Keeper also |
|---|---|---|---|
| no Round yet | "A Round is a few questions, answered by everyone, and read together." | **Start the first Round** | — |
| collecting | "Questions for Round 2" and the questions so far, on the measure | **Ask something** | Open answering |
| answering | "Answers are open until Friday 12 September" and the questions | **Answer**, then the names of everyone who has written in, under it | Nudge, Close now |
| preparing | "Round 2 comes out on Friday" | — | Publish now |
| published | **the cover** of that Round, and one quiet line: "Round 3 opens on 1 October" | reading it | — |
| paused | exactly the row above it, with "Paused" on its state line | what that row offers, frozen | Resume |
| ended | "Ended on 3 July 2026" | — | — |

**Paused is never a banner.** Today it replaces the whole left column, and the live consequence is
that "in the loop" is paused with a Round 2 sitting in `collecting` that no member can see or add to
(recon §11, F21). A pause is a mark on a state, not a state of its own.

**Now shows a published Round as its cover, and the Round is not also printed underneath it.** That
is the single change that ends ¶15 and ¶35. Today the home carries the dead tile, the entire Round
inline, and a Published-issues row, all three at once. After this the newest Round appears once, as
a cover, and the cover is a door to the reader.

### Before

The published Rounds that are **not** the one in Now, newest first, each as its cover. On a Catch-up
with one published Round, Before does not render at all — which is most Catch-ups today, and is why
the home stops being a page of repetitions.

On screen it is headed **"Earlier Rounds"**; "Before" is what this document calls the slot.

Where "Fresh off the press" and "Published issues" both used to live, there is now one heading and
one component. And the codebase's collision — `ArchiveShelf` meaning past Rounds while `FiledAway`
means binned Catch-ups (recon §4) — is settled by vocabulary: **Rounds are Earlier Rounds;
Catch-ups are Archived.** The word "archive" only ever means a Catch-up you have put away.

### The people

On a laptop, a column at the right of the home: every member, a bird and a name, the Keeper's leaf
inline on their row (¶37, E2, which is the one part of today's panel he liked). Ordered by this
Round's writers, then your own batch, then the rest. No preview, no fold, no dialog.

On a phone there is no column, so one control under the head opens the same list **in place**.
There is no sheet and no dialog anywhere in this, which removes a surface the next session was
otherwise going to have to draw.

On a **batch** Catch-up the list is read-only: no add, no remove, no invite, because the members are
the batch (¶4, ¶51: *"can't edit people in and out"*).

## 6. The verbs: one door, and where each lives

Sixteen verbs live on five surfaces today, two of them twice, and archive and delete cannot be
reached from inside the Catch-up they act on (recon §4). His complaint (¶40) is that *"everything's
just different in every different situation. There's no consistency."*

**Round verbs** — ask, open answering, nudge, close, extend, publish now — live on **Now**, beside
the Round they act on. They are never in a menu, because they are not about the Catch-up.

**Everything else is one door**, at the right of the home's head, and it is the only menu in
Catch-ups:

| | |
|---|---|
| Reminders | Daily / Last day / Off |
| Archive | hides it from your list and silences it. Undo is a toast |
| Leave this Catch-up | people Catch-ups only. What you already published stays where it is |
| Change the picture | whoever may run it (§1b) |
| Rhythm | Keeper |
| Hold the next Round | Keeper. What "pause" becomes (§9) |
| End | Keeper. The only verb that earns a real confirmation |

**Two personal verbs, not three**, and that is his, 2026-09-07: *"deleting becomes leaving."* The
thirty-day bin and the "Recently deleted" shelf go with the word Delete. A batch Catch-up has only
Archive, because there is no leaving your own batch (¶5).

**Who may run what.** A Catch-up's verbs — rhythm, hold, end, and the name — belong to its Keeper,
and a **batch Catch-up has no Keeper**: nobody may rename a batch or change who is in it. Its
Round's verbs — start, open answering, nudge, close, extend, publish, resume — are open to anyone in
the batch. Without that split a paused batch would have nobody able to resume it.

The Catch-up settings dialog is deleted. So are its twelve horizontal rules, its pills inside pills
and its subtitle offering three actions every one of whose controls is disabled (¶14, ¶40, S1,
recon §11).

## 7. Getting anywhere, in one move

Not a Back button, and not *"slide buttons here and there"* (¶18). **Every screen carries the name
of the thing it is inside, and that name is the way up.**

| From | To | The move |
|---|---|---|
| the list | a Catch-up's home, or its newest Round | the panel; the whole panel |
| the home | the reader | the cover; the whole cover |
| the home | the composer | **Answer**, on Now, only while answering |
| the reader | the home | the Catch-up's name, in the green bar on a phone and in the page head on a laptop, at every scroll depth |
| the reader | a question | the strip, at every scroll depth |
| the composer | the home | the name at the top, and the completion moment |
| the people sheet | the home | closing it |
| a notification | where its state says: collecting → the home, answering → the composer, published → the reader, a comment → that answer | |
| anything | the rest of the app | the sidebar and the green bar, which never leave |

That kills the 44,381 pixels (H6, recon §1): the name is on screen at every scroll depth already, in
the front runner, and it is a button.

## 8. The intents, against every state

The point of the table is the repetition in it. Columns are the Round's state; the last two are the
Catch-up paused or ended.

| Intent | collecting | answering | preparing | published | paused | ended |
|---|---|---|---|---|---|---|
| See what is new for me | the panel on the list | same | same | same | same, marked | same, "Ended" |
| Answer | not yet | **Answer**, on Now | closed | closed | frozen | no |
| Ask a question | **Ask something**, on Now | no | no | for the next Round, on Now | frozen | no |
| Read the newest Round | not yet | not yet | not yet | **the cover, in Now or on the list** | same | same |
| Read an older Round | Before | Before | Before | Before | Before | Before |
| Move inside a Round | the strip, at any depth | same | same | same | same | same |
| See who is in this | the home's column, or its one control | same | same | same | same | same |
| See who wrote in | nobody yet | names, on Now | names, on Now | names, on the cover | same | same |
| Comment, heart | no | no | no | on the answer | same | same |
| Reminders, archive, delete | the door | same | same | same | same | the door, minus reminders |
| Rhythm, hold, end | the door (Keeper) | same | same | same | Resume, on Now | gone |
| Open, close, extend, nudge, publish | Now (Keeper) | same | same | no | frozen | no |
| Get back to the home | the name at the top | same | same | same | same | same |

Four Round states by two roles is eight real cells. Everything else repeats, which is what ¶36 meant
by *"modular design would just take care of that"*.

## 9. The open questions, answered

`directions.md` left O1 to O14 for him. Six of them are design and are settled here; the rest are in
"Owner questions" in the handover with a default on each.

| | Question | Settled |
|---|---|---|
| **O4** | the shape of the list | §4: a shelf of equal picture cards, two up on a laptop. Three other shapes drawn and refused, with reasons |
| **O5** | who is here, who wrote in | §5: the roster is a column on the home (R2), and a disclosure on a phone; who wrote in is names on Now while answering; the reader shows neither, because every answer is signed |
| **O6** | what the home is | §5: the head with the picture, Now, Earlier Rounds, and the people |
| **O7** | moving inside a Round | the front runner: the strip, and the navigator drawn three ways. His pick is outstanding |
| **O8** | one representation of a published Round | §1: the cover, which is the contents on the measure. One component, two depths |
| **O9** | "13 of the group wrote in", question numbers | both gone (R21, R30, R32) |
| **O10** | Fresh off the press | §4: deleted. Its job is done by the Catch-up's own card |
| **O11** | settings, and where the verbs live | §6: one door, and the settings dialog goes |
| **O1** | who keeps a batch Catch-up | **answered 2026-09-07**: nobody. Anyone in the batch may work its Rounds; nobody may rename it or change who is in it |
| **O2** | delete on a batch | **answered**: archive only |
| **O3** | whether pause survives | **answered**: it becomes "hold the next Round". A Round in flight always finishes |
| **O14** | leaving a people Catch-up | **answered, and he changed the wording**: the verb is **Leave**, not Delete, and what you already published stays |
| **O12** | the six members with no batch year | **still open.** Re-asked in plain English as owner question 15 |

## 10. What this does not decide

The composer, the door's own sheet and the confirmations it opens, the picture's own upload and
crop at creation time (`photo-aim.tsx` and the R2 direct-upload path already exist for it), the
photo wall, the song card's behaviour beyond its shape, the notification copy, and the magazine.
The people sheet is no longer on that list: §5 removed it.
Each is a session, and each starts from this file plus the two reviews.

And one thing that is nobody's to decide but his: whether any of it clears R46 —

> "There is nothing here that I prefer to what is shipped."

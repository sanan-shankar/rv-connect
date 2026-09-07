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

**One representation of a published Round, and it is its photographs.**

A published Round appears as **the cover**: up to three photographs from inside it, tiled with a
lead picture, and the date. One component (`_cover.tsx`), used in Now when the newest Round is out
and once per Round under Earlier Rounds, and nowhere else. That retires the campaign's oldest
complaint — one Round drawn ten ways on four surfaces with two teaser lengths, two typefaces and two
hovers (recon §5) — by making it one file.

It carries no quoted answer (¶9), no count, no Round number, and **no list of its questions**. The
questions version was drawn first and he rejected it, N31: the questions are not the appetising part
of a Round, the photographs are.

The Round's *questions*, hung off a measure, survive in exactly one place: **the reader's
navigator**, where they are how you move. They are also printed once on the home while a Round is
collecting, because there they are the thing being made rather than a preview of it.

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
time (N22, N23). On a batch Catch-up, **anyone in the batch** may replace it — his answer,
2026-09-07 — which is safe because it is reversible, unlike the Round's transitions (§6).

**Wide, and that is his** (N29): *"I wanted almost like, you know, a Notion for a page, like header
photo. It's just a super wide photo, right? Maybe some aspect ratio like that."* Never a circle — a
circle means a *person* in this app (`BirdAvatar`), and a Catch-up is not a person.

**Where it goes, and where it does not.**

| | |
|---|---|
| the list | **the card IS the picture**, 5:2 on a laptop and 16:9 on a phone, with the name and the stage written on it over a fade. His: *"having the entire thing as an image and then fading to black, kind of like a Spotify thing"* |
| the home | a banner across the head, 4:1 on a laptop and 3:1 on a phone |
| the reader | **nowhere.** The reader is the Round, not the Catch-up, and the green bar already carries the name |

The 3:2 mark beside the name that this section first described is gone. He looked at it and said:
*"it's just this tiny hanging thing, not at all tied into the identity, it just exists."*

**What the twenty want to be.** He is supplying them ("I'll give the pictures when I get time") and
has said what shape: super-wide, Notion-header proportions. Two things they still need to survive:
being cropped from 5:2 on the list to 4:1 on the home, so nothing important sits at the very edge or
dead centre; and being read over, since the list writes the Catch-up's name across the bottom of
them. The room's three stand-ins are all green trees, which is the one trap worth naming — twenty
wide valley views would read as the same photograph twenty times, and the landing page and half the
Collection are already wide valley views.

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

**A question nobody answered is not in the published Round at all** (S4c, 2026-09-07). Not as a
heading with nothing under it, and not as a row in the navigator that lands you on one. His rule,
R21, given about an answer: *"Just delete it. If it's empty, just delete it."* A question is the
same object one level up. Filtered once, in the reader, so the sections, the strip, the rail and
the panel cannot disagree about how many questions there are.

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

**And a card on the list always opens the home.** It used to open the reader for a published Round
and the home for everything else. The thing he says he hates most about what ships is exactly that
unpredictability (N42): *"I still can't predict where it's gonna open when I click it. It just does
whatever it wants and I don't have a sense of it in my head."* One rule costs a tap on the way to a
Round and buys knowing where you will land.

## 4. The list, `/catchups`

**No right rail. No "Fresh off the press". One call to action.**

The rail is deleted rather than redesigned, which answers I1 by removing the question, and takes
with it the curved divider, the padding-less hover, the double truncation, the empty Round promoted
above a Round with 133 answers, and the fact that on a phone the whole rail was `display: none` and
always had been (recon I9, §12). Its job was to say what is new to read; a Catch-up showing its own
state says that better, where you were already looking.

**A card is the picture, and the words are written on it.**

```
┌────────────────────────────────┐
│                                │
│      the picture, 5:2          │
│                                │
│  Batch of 2005                 │   the name, in the heading face, on the picture
│  Answers close Thursday        │   one line: the stage, in words
└────────────────────────────────┘
```

His, N26: *"having the entire thing as an image and then fading to black, kind of like a Spotify
thing, might be nicer than this."* And N27: *"on a laptop it is kind of vertically long. I think it
might be better to make it more landscape ... I can't even see 4 catch-ups."* So 5:2 on a laptop
and 16:9 on a phone, two up at a laptop's width, four on his screen.

**No Round number**, N26: *"I don't think we need to say the round over there ... It can just be
whatever stage it's going through."* The line reads "Open for questions", "Answers close Thursday 20
August", "Out 15 August", "Ended 17 April", or "Paused".

**No buttons.** Every card is the same two things at the same height, so the page is a shelf rather
than a form and a grid of them has no holes. Answering is one tap further in, beside the Round it
belongs to. That settles I5 and I11 outright: no View, nothing to right-align, and the hover is the
whole rectangle because the card is one rectangle.

**The Round's questions used to be printed on these cards** and he took them off, N25:
*"overcrowding ... too much text going on for something that should just be a navigation for all
your catch-ups."*

**Three shapes drawn and thrown away before this one**, so nobody re-treads them: a two-column grid
of unequal text panels (locks into rows, 165px hole mid-page); CSS columns of the same (the balancer
strands the tall one, 470px void); and a wide row with the identity in a 240px margin (no holes, and
a page of text). Equal picture cards make all three problems disappear.

**The verbs are not on this page.** No dots, no menu at rest. On a phone a card swipes left to
archive, the WhatsApp gesture he named (¶5), undoable from a toast. Archived Catch-ups are one quiet
row at the foot, present only when one exists, revealed the way the sidebar's own profile menu
reveals (N26), never a block of tiles with **Put back** in your face.

**On a television** the shelf stops at 1096px, flush in the page's own gutter.

## 5. The home, `/catchups/[id]` — a place, not a page that transforms

**Rewritten 2026-09-07 after he read the first version and found it worse than what ships.** His
words are `review-2026-09-07.md` N26 to N45. The failure was not styling: the first version designed
the *shape* of the home and then filled it by putting controls in a row of equal pills under the
content, so they had nothing to belong to — *"nudge everyone, close now, just hanging in the middle
of nowhere ... just arbitrarily there. There's no sense."*

The root cause is one deletion. **The shipped home has a right rail, and I removed it** and put the
people there instead, so every control lost its address. Everything below follows from putting it
back.

### The question he asked, and the answer

> N40: "is there a home page that you then keep navigating from to do things like answer or
> whatever, or does the home page transform into something each time. I think the answer being its
> own page is good."

**A place.** Four regions, always in the same spot, at every state and for every member. Only what
is inside the second one changes.

| Region | What is in it |
|---|---|
| **The head** | the picture as a wide banner, and the name. Nothing else |
| **The Round** | what this cycle is right now, and exactly ONE thing to do about it |
| **The rail** | Reminders · This Round · This Catch-up · People — in that order, always |
| **Earlier Rounds** | the ones that have already come out, as covers |

Answering, the reader and the long dialogs are their own pages you go to and come back from.

### The rule that stops the controls floating again

**A control is either the page's one primary action, in the content, attached to the thing it acts
on — or it is in the rail. There is no third place, and there is never a row of equal-weight pills
in the content.**

The rail's order is Reminders, then the controls, then People, and People is last because it is the
only block whose length is unbounded: with twenty-four names above it, Reminders landed 1,500px down
the page.

### The Round region, per state

| State | The one primary action | What else is in the region |
|---|---|---|
| no Round yet | **Start the first Round** (people Catch-ups only) | on a batch, one line saying when it opens |
| collecting | **the ask box** | the questions asked so far, under it |
| answering | **Answer** | who has written in, by name, after it |
| published | **the cover** | nothing |
| ended | — | nothing |

**The ask box is the shipped one**, and it is here because he named it as better than what I drew:
*"the asking thing now has a box. And it says, be the first to ask. And then under that, it would
show everything ... the asking is probably even better now on the shipped version than what you've
created. This asking thing shows the questions. It doesn't invite you to ask."* Mine had the list
first and a button under it. Inverted.

**No list of questions anywhere else.** He said it three times in one sitting about three different
screens: *"Why do we just have this list of questions? I just don't get it. It's so annoying."*
Collecting is the one place they earn their space, because there they are the thing being made.

**No Round numbers, anywhere.** *"Why do we need to have the round 4? It doesn't matter what round,
it's going to be round 15."* A Round is identified by its date.

*Extended to the reader, 2026-09-07 (S4c).* "Anywhere" was written about the home, and the reader
was still printing "Round 1 · 15 August 2026" in the strip and in its laptop title, from D51, which
was decided before this file existed. Both now read "15 August 2026". The middle dot goes with the
number, which is separately his three times over (R4, R32, R44), and the reader's title becomes a
masthead: [`front-runner.md`](front-runner.md), "The sixth problem".

**Nothing that teaches.** The rhythm line under the name and the sentence explaining what a Round is
are both gone: *"everyone from 1978, every 3 months, that doesn't need to be said"*, and *"we don't
need to teach them how to use it."*

### A published Round's cover is its photographs

Not its questions. His verdict on the questions version, N31:

> "the round is just this total enjoyable experience reading everyone's answers. This is fun, that
> is fun, all of that. But the way that it's shown over here, it just looks like a bunch of
> questions and totally, it looks like work, honestly. It's not like an appetizing, beautiful thing
> you want to click and find out. Oh wow, what is this? It just seems very drab and unappealing."

So a cover is up to **three** photographs from inside the Round, tiled with a lead picture, and the
date. Three rather than four: with the lead spanning two columns and two rows, a fourth has nowhere
to go but a third row beside an empty cell. A Round nobody photographed falls back to the Catch-up's
own picture, so the shape never changes and a cover is never empty.

On the real Round, 32 of 141 answers carry a photograph, so this is drawing on what Catch-ups
actually contains.

### The people

On a laptop, the rail's last block: everyone, by name, the Keeper's sprout inline. On a phone, one
control on the head's own line — beside the name, not on a row of its own — opening a **full sheet
over the window**, dismissed by the scrim, by Escape or by swiping it down. N41: *"on phone the
people can just open into an overlay instead of cluttering that content. And maybe move it
somewhere else, maybe above, instead of having it on its own line?!?!"*

**And the rail is bounded by the window** (S4c, 2026-09-07, found by the pressure corpus). "Last,
because its length is unbounded" was not enough: at the app's hundred-person cap the rail laid out
4,000px tall inside a 982px window, and because it is `position: sticky` everything past the first
screen was not below the fold, it was unreachable at any scroll depth. So the rail stops at the
window's height and the People block — the one block that can grow — takes what is left and scrolls
inside itself under a fade. The controls do not move, which is the rule §5 exists for, and every
name is still there in full, which is what R2 asked for and what "no *and 16 more*" means.

## 6. Every control, who holds it, and where it lives

Twenty-three controls exist in the shipped app and **three do not exist at all**. Read out of
`actions.ts` and its guards, not from memory.

### What belongs to what

| Belongs to | Controls | One-way? |
|---|---|---|
| **The Round** | ask a question · from the library · ask anonymously · reorder or remove a question · **answer** · heart | all reversible |
| **The Round, one-way** | open answering · nudge · close early · **start the next Round now** | none reversible |
| **The Catch-up** | rename · change the picture · rhythm · hold the next Round · resume · add people · remove a member · make a Keeper · invite by link · end | end and remove are one-way |
| **You** | reminders · archive · leave | leave is one-way |

### The three that do not exist

- **Start the next Round now.** He found it himself: *"literally after publishing I can't start a
  new round?!?! I have to wait for two weeks minimum ... there's no control for that?? I have to
  create ANOTHER test catch up."* Confirmed in the code: `openNextRoundIfDue` fires on the clock
  alone, and no action anywhere starts one early, for anyone.
- **Rename a Catch-up.** There is no rename action. The name is the underlying group's.
- **Change the picture** (new, from §1b).

### The accident rule

> N30: "Can anyone open answering? That shouldn't be allowed. Because many people would click it by
> accident. Especially on a batch thing ... it seems like the kind of irreversible thing."

**An irreversible control never sits where a thumb lands, and is never open to everyone by default.**
So every one-way control is in the rail, marked with a small cinnamon dot, and confirms. Never in
the content, never beside the primary action.

### Which gives the answer for a batch Catch-up

**A batch Catch-up has no manual transitions at all.** Nobody opens answering, nobody closes it,
nobody publishes: it runs on its rhythm, and the only things anyone does on one are ask and answer.
That is what makes "nobody owns it" survivable, and it supersedes the earlier reading that anyone in
the batch could work its Rounds. Anyone in the batch **can** replace its picture (his answer,
2026-09-07); that is reversible and harmless.

A people Catch-up keeps a Keeper, who holds every one-way control.

### And one state deleted: `preparing`

> N38: "Why are we preparing? ... why doesn't it just publish immediately? Is there a reason we have
> to have a separate preparing section? I can't just publish at midnight and the deadline is done."

Checked: `preparing` is a hard-coded **24-hour hold** (`PREPARING_HOLD_HOURS`) between answers
closing and the Round coming out, during which nothing happens and nobody — Keeper included — can
read a word. Its only real job is stopping a Round landing at 3am, and "Publish now" exists solely
to skip it.

**Answers close and the Round comes out at the same moment**, and that moment is a civil hour. One
state, one console and one control go with it.

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
Catch-up paused or ended. `preparing` is gone (§6).

| Intent | collecting | answering | published | paused | ended |
|---|---|---|---|---|---|
| See what is new for me | the card on the list | same | same | same, marked | same, "Ended" |
| Answer | not yet | **Answer**, the page's one action | closed | frozen | no |
| Ask a question | **the ask box**, the page's one action | no | for the next Round | frozen | no |
| Read the newest Round | not yet | not yet | **the cover** | same | same |
| Read an older Round | Earlier Rounds | same | same | same | same |
| Move inside a Round | the strip, at any depth | same | same | same | same |
| See who is in this | the rail, or one control on a phone | same | same | same | same |
| See who wrote in | nobody yet | names, under Answer | on the cover, by its photographs | same | same |
| Comment, heart | no | no | on the answer | same | same |
| Reminders | the rail | same | same | same | gone |
| Archive, leave | the rail | same | same | same | same |
| One-way Round controls | the rail (Keeper) | same | Start the next Round now | frozen | no |
| Rename, picture, rhythm, hold, end | the rail (Keeper) | same | same | Resume | gone |
| Get back to the home | the name at the top | same | same | same | same |

Four Round states by two roles is eight real cells. Everything else repeats, which is what ¶36 meant
by *"modular design would just take care of that"*.

## 9. The open questions, answered

`directions.md` left O1 to O14 for him. Six of them are design and are settled here; the rest are in
"Owner questions" in the handover with a default on each.

| | Question | Settled |
|---|---|---|
| **O4** | the shape of the list | §4: a shelf of equal picture cards, the picture edge to edge with the words on it. Three other shapes drawn and refused, with reasons |
| **O5** | who is here, who wrote in | §5: the roster is a column on the home (R2), and a disclosure on a phone; who wrote in is names on Now while answering; the reader shows neither, because every answer is signed |
| **O6** | what the home is | §5: a place, not a page that transforms. Head, the Round, the rail, Earlier Rounds |
| **O7** | moving inside a Round | the front runner: the strip, and the navigator drawn three ways. His pick is outstanding |
| **O8** | one representation of a published Round | §1: the cover, which is its photographs. One component |
| **O9** | "13 of the group wrote in", question numbers | both gone (R21, R30, R32) |
| **O10** | Fresh off the press | §4: deleted. Its job is done by the Catch-up's own card |
| **O11** | settings, and where the verbs live | §6: the rail, split into This Round and This Catch-up, with a dot on everything one-way. The settings dialog goes, and so does `preparing` |
| **O1** | who keeps a batch Catch-up | **answered 2026-09-07**: nobody. Anyone in the batch may work its Rounds; nobody may rename it or change who is in it |
| **O2** | delete on a batch | **answered**: archive only |
| **O3** | whether pause survives | **answered**: it becomes "hold the next Round". A Round in flight always finishes |
| **O14** | leaving a people Catch-up | **answered, and he changed the wording**: the verb is **Leave**, not Delete, and what you already published stays |
| **O12** | the six members with no batch year | **answered 2026-09-07**: *"if they've not put a batch that's fine, they don't need a catch up."* Nothing changes for them |

## 10. What this does not decide

The composer (which he says the shipped one is close to right, N36, with two changes he named), the
confirmations the one-way controls open, the picture's upload and crop at creation time
(`photo-aim.tsx` and the R2 direct-upload path already exist for it), the library's own
organisation (N33), the photo wall, the song card's behaviour beyond its shape, the notification
copy, and the magazine. Each is a session, and each starts from this file plus the reviews.

And one thing that is nobody's to decide but his: whether any of it clears R46 —

> "There is nothing here that I prefer to what is shipped."

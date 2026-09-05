# Catch-ups reconnaissance

**S1, 2026-09-05. Opus max, one browser, no fixes.** What a member actually sees, at his phone's
size and his laptop's, measured rather than felt. Every finding carries the ledger id it confirms,
or `NEW` where the brief never mentioned it. Shots are in `e2e/.shots/catchups-recon/` (gitignored);
the number in the shot name is the number quoted here.

He said he had described *"maybe 10% of the problems"* (¶41). That was close to arithmetic. This
file has **43 findings**. Twenty-five confirm something he named, one could not be reproduced and is
marked so, and **seventeen are things nobody had noticed**.

**Corrected 2026-09-05, after he read it.** *"the R5 it takes a second to react was for tapping the
heart on a catch up taking longer to react than tapping heart on feed. noticeably longer."* That
sentence sits inside ¶11's paragraph about the chip bar and this file had filed it there. It belongs
to the heart, and following it found the real cause: **every heart tap re-renders the whole Round on
the server — 603 KB, one to three seconds — because `toggleEntryLove` calls `revalidatePath`, which
the feed deliberately removed.** Section 8. It is now the first thing X should ship after the green
bar.

The shots are in `e2e/.shots/catchups-recon/`, 24 of them, numbered by the section that cites them:
`01`-`03` the index, `10` the home on a phone, `20`-`21` the reader, `30`-`33` the home and its
dialogs, `40`-`41` the create flow, `50`-`58` every state of a Catch-up in order, `60`-`61` the
archive and the bin.

**How this was looked at.** `chrome-devtools` against the live database, signed in as the owner,
read-only on his three real Catch-ups. Viewports 390x844 (touch emulated), 1512x982, 1440x900 and
1920x1080. Geometry from `getBoundingClientRect` and `getComputedStyle`, never from squinting at a
PNG. Where a number is quoted it was read off the running page.

**What is live right now**, and it is more useful than any fixture: three Catch-ups and four Rounds
between them cover six of the states on their own.

| Catch-up | Status | Round | Round status | Entries | Authors | Questions |
|---|---|---|---|---|---|---|
| in the loop | paused | 1 | published | 133 | 13 | 11 |
| in the loop | paused | 2 | collecting | 0 | 0 | 0 |
| test | ended | 1 | published | 0 | 0 | 0 |
| Batch of 2024 | active | 1 | preparing | 8 | 1 | 8 |

---

## 0. The one to ship first

### R6/F8 — the green bar cut off on his phone. Root-caused. `CONFIRMED`

He reported this four times (¶11, ¶19, ¶25, ¶33) and it is the only bug on this list that seventy
members can see today. It is also the one he could not explain: *"Weirdly, if I make my window
smaller on desktop, I don't get that header bar cutting away, but on mobile it always happens."*

Here is why.

**A member's answer can be wider than the phone.** Three answers in the published "in the loop"
Round 1 are pasted Spotify links. The longest is 123 characters.

It is not the length that breaks the page, and this matters for the fix. A browser will break a url
after `?`, `&` and `=`, so most of it wraps. Measured against the reader's own font
(15px Source Sans 3), the pieces are 369, 17, 177, 82, 67, 44 and 120 pixels wide — and **the first
piece cannot be broken at all**: `https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee?` is 54
characters and **369px** of scheme, host and path with no break opportunity in it.

That is the whole bug. Any Spotify or YouTube link is about 350 to 400px of unbreakable text, and a
phone's answer column is 316px. The paragraph that holds it is
[`answer-card.tsx:83`](../../../src/components/catchups/round/answer-card.tsx#L83):

```
className="mt-[var(--space-s)] whitespace-pre-wrap text-[15px] leading-[1.7] text-foreground"
```

`whitespace-pre-wrap` preserves the member's line breaks. It does nothing about a word that does not
fit, and there is no `break-words` beside it. Computed on the live page: `overflow-wrap: normal`,
`word-break: normal`.

Measured at 390x844, on that answer's paragraph:

| | |
|---|---|
| paragraph box | 316px |
| its content | 377px |
| spilling past its own box | **61px** |

At 320px wide the same paragraph is a 246px box holding 369px of content, and the ink lands at
x=406 in a 320px viewport — **86px past the right edge.**

**Nothing catches it.** Walking every ancestor from that paragraph to `<html>`, all fourteen of them
are `overflow-x: visible`: the `<article>`, the question `<section>`, the column, the grid, `<main>`,
`<body>`. Each one's `scrollWidth` exceeds its `clientWidth` all the way up. The root reports
`scrollWidth: 414` against `clientWidth: 390`.

The only thing holding the page still is one declaration,
[`globals.css:325`](../../../src/app/globals.css#L325):

```css
overflow-x: clip;
```

**And the green bar does not move with the page.** The mobile bar is
[`sidebar.tsx:671`](../../../src/components/layout/sidebar.tsx#L671):

```
className="sticky top-0 z-40 flex h-14 items-center gap-1.5 bg-sidebar px-3 md:hidden"
```

`position: sticky` sizes to its containing block, not to the viewport, and it does not follow a
sideways pan. Measured: the bar is exactly 390px wide in a 390px viewport.

So the chain is: a member pastes a Spotify link → the answer overflows the phone by 61 to 86px →
nothing between it and the root clips it → on a browser where the root's `overflow-x: clip` does not
also pin the visual viewport, the page can be panned right → the sticky green bar stays at 390px
while the content moves → **background shows where the bar has run out, and every margin on the page
reads as shifted.** That is his *"extra half a centimetre of white space came in on the right-hand
side. And it cut through the sidebar"* (¶33), exactly.

**Why desktop Chrome never shows it.** Two reasons, and both are needed. At any width above 768 the
answer column is wider than 377px, so nothing overflows at all. Below 768 the overflow is real, but
Chrome's root-level `overflow-x: clip` clamps `scrollWidth` and refuses to pan. Safari on iOS is the
browser where root-level clip and the visual viewport disagree. He is right that it is a phone bug;
it is a phone bug because of the browser, not because of the width.

**What this means for X.** The fix is two lines and neither of them is the sticky bar:

1. `break-words` on [`answer-card.tsx:83`](../../../src/components/catchups/round/answer-card.tsx#L83)
   and on [`photo-wall.tsx:69`](../../../src/components/catchups/round/photo-wall.tsx#L69), which
   carries the same paragraph with the same two classes and the same omission.
2. A guard so the next surface cannot reintroduce it. The rule is not "add break-words everywhere";
   it is that **any container that renders a member's typing must not be able to push the page
   sideways.**

Do not "fix" this by widening the sticky bar. That would hide the pan and leave the page still
pannable, which is the same bug with the symptom painted over.

**Shots.** `10-home-390.png` (the home at 390, bar intact in Chrome). The cut itself does not
reproduce on this machine, which is the finding, not a gap.

### NEW — a pasted link in an answer is not a link

The same three answers show the second half of the same story. `renderRichText`
([`src/lib/rich-text.ts:75`](../../../src/lib/rich-text.ts#L75)) escapes HTML, then handles emphasis
and `@mentions`. It has no URL rule. Confirmed on the live page: the paragraph holding the Spotify
URL has zero element children, so the URL is plain text.

So today a member who pastes a song link gets: no preview (¶16, ¶49, R15), no thumbnail, **and not
even a clickable link** — plus the layout bug above. One of those three answers reads, in full,
*"Honestly I just want to see if the album covers render properly 😭😭"*. A member was testing the
feature he says is missing, in the live Round, and got nothing back.

---

## 1. The reader, `/catchups/round/[id]`

The surface he called *"incredibly bad"* on a phone (¶10). It is also the one he half-defends:
*"honestly not the worst on desktop"*. Both are true, and the numbers say why.

**The size of the thing.** "in the loop" Round 1 is 11 questions, 13 people, 133 answers.

| | 390x844 (his phone) | 1512x982 (his laptop) |
|---|---|---|
| page height | **49,464px** | 44,461px |
| screenfuls of scroll | **55.2** | 45.3 |
| complete answers visible at once | under 1 | 3.3 |
| tallest single answer | 1,267px (1.5 screens) | 784px |

Every finding below is downstream of that table. This is a 55-screen document with no way to move
around it.

### R5 + NEW — on a phone, the navigation leaves the screen and never comes back

The mobile chip row is [`toc.tsx:RoundTocChips`](../../../src/components/catchups/round/toc.tsx),
mounted at [`page.tsx:250`](<../../../src/app/(main)/catchups/round/[editionId]/page.tsx#L250>) as:

```
<RoundTocChips items={tocItems} className="mt-[var(--space-l)] lg:hidden" />
```

There is no `sticky` on it, and none on any wrapper. Measured at 390, sitting on question 8:

- the chip row is **31,735px above the top of the viewport**;
- the only `position: sticky` or `fixed` things on screen are the app's 56px green bar and a
  decorative background image;
- so there is **no in-page navigation on screen at all**, and nothing naming the question being read.

He described this twice and they are the same fault: *"I click question 8, and now I go to question
8 and that's it. I can't navigate anymore"* and *"At some point I scroll on a question, and then I
don't even know what the question is, on my phone"* (¶11). Shot `21-reader-lost-mid-scroll-390.png`.

### R5 + NEW — the chip row does not follow the reader

Worse than not being sticky: **the active chip is never scrolled into view.** `RoundTocChips` sets
the active chip's colours and does nothing else. Measured on question 8:

- `scrollLeft` of the chip scroller: **0**
- the active chip's offset: **1,900px to the right**

So even a member who scrolls back to the top to navigate finds the row showing question 1, with the
question they were reading a long way off screen and no indication which way. The highlight the
component draws is, in practice, usually invisible.

### R5 — the pills are cut off, and the row is 8 screens wide

At 390 the scroller's window is 350px. Inside it:

| | |
|---|---|
| chips | 11 |
| chip widths | 209 to 293px |
| **row width** | **2,917px** |
| sideways scrolling to reach the last question | **2,567px, or 7.3 window-widths** |

A chip is 60 to 84% of the window, so the row shows one chip and a slice of the next, clipped
mid-word by the scroller's edge with no fade. That is his *"the pills getting cut off, all of that
looks so bad"* and *"it's within this boxed rectangle"* (¶11). Shot `20-reader-top-390.png` — chip 2
reads "2. Something n" and stops at the screen edge.

### R4 — the active item bolds and the rail reflows. `CONFIRMED`, with the item

The desktop rail switches the active item from weight 400 to weight 600
([`toc.tsx`](../../../src/components/catchups/round/toc.tsx), `i === active ? "font-semibold
text-foreground" : "text-muted-foreground"`). The rail column is 220px wide at every width it
appears at.

Ten of the eleven labels are unaffected. **Item 5 is not.** "5. Songs you've had on repeat lately"
is 36 characters, one line at weight 400, and two lines at weight 600:

| | |
|---|---|
| item 5, idle | 29.9px |
| item 5, active | 47.8px |
| items 6 to 11 pushed down by | **17.9px** |
| whole rail | 531.7px → 549.6px |

Reproduced identically at 1024 and 1512. So: scroll into the songs question and the six items below
it jump down by 18px, under the reader's cursor. He was right and it is one item out of eleven,
which is exactly why it reads as *"slightly janky"* rather than broken.

### R4 — "some questions are like dot dot dot"

[`page.tsx:236`](<../../../src/app/(main)/catchups/round/[editionId]/page.tsx#L236>):

```js
label: `${i + 1}. ${s.prompt.text.length > 44 ? `${s.prompt.text.slice(0, 44).trimEnd()}...` : s.prompt.text}`
```

**5 of the 11 labels** in this Round are cut at 44 characters and end in three periods. The cut is a
character count, so it lands mid-phrase. It has been there since the feature's first commit
(`9c3a63c`), so it is not a recent regression.

Note also that this line prepends `${i + 1}. ` — **the question's number appears three times** on a
phone: in the chip, in the "Q8" eyebrow above the heading, and (on desktop) in the rail. That is
context for R9, *"Do we need to say Question 1?"*.

### R5 — the chip's own tap is fine. The "second to react" was the heart

*"And then you click it, and it takes a second to react, and it just reloads like a whole page
almost"* sits inside ¶11's paragraph about the chip bar, and this file first read it that way. **He
corrected it on 2026-09-05:** *"the R5 it takes a second to react was for tapping the heart on a
catch up taking longer to react than tapping heart on feed. noticeably longer."*

So it belongs to the heart, and it is answered in section 8 under R13 — where "reloads like a whole
page almost" turns out to be a literal description of the mechanism.

The chip tap itself was measured anyway, and it is not slow: tapping chip 8 moves the page after
**65ms**, lands the section 148px from the top, and drifts **0px** afterwards. There is no
`scroll-behavior: smooth` in the stylesheet, so it is a hard jump. **There is no chip lag to fix.**

### R7 — the rule under the masthead. `CONFIRMED`, and it is worse than "barely visible"

[`masthead.tsx`](../../../src/components/catchups/round/masthead.tsx): the masthead `<section>`
carries `border-b border-border`. Computed: `1px solid rgb(223, 216, 203)` = `#DFD8CB`, drawn on the
page background `#E4E1D5`.

**Contrast ratio 1.08:1.** He said *"a weird horizontal bar, which is barely visible, firstly. Can
totally delete that."* It is not decoration that is too quiet; it is a line nobody can see, costing
25.9px of padding beneath it.

### R7 + I7 — the birds identify nobody, and on a phone they take two rows

The masthead prints up to 14 contributor avatars at `size="xs"`, wrapping. At 390 the 13 birds take
**two rows**, then a caption. Shot `20-reader-top-390.png`.

His objection is not aesthetic and it is worth quoting exactly, because it contains its own answer
(¶23): *"This is useful if I count the birds, add that to the plus 80, and then I say, okay, there's
23 people here. But that's pretty much all the information this is giving me, because I am not
identifying the birds or the people."* And then: *"that is not to say that I want us to move to
initials. Please God, no. I don't really care about the birds. I think the birds are so much
better."*

There is a real mechanism under it. `contributorsCopy()` in the same file **names people up to
three, then stops**: one, two and three contributors are named in the byline; four or more collapse
to "N of the group wrote in." So the design already knows that naming beats counting — it just gives
up at four. Thirteen contributors get thirteen unlabelled birds and a number.

### R18 — "not enough content is showing". `CONFIRMED`

At 390, the first answer card starts at **y=509**. So 60% of the first screen is masthead: title,
meta line, two rows of birds, a byline, an invisible rule, and a chip row. Below it, the first
answer is 349px tall and runs off the bottom.

**A member's first screen of a published Round contains zero complete answers.**

### H6 — getting back to the Catch-up. `CONFIRMED`, and the number is absurd

There is exactly one "Back to the Catch-up" link. It is at **y=44,381 of a 44,461px page: 100% of
the way down.** On a phone it is 49,000px down.

*"I scroll all the way to the bottom, which takes me a week"* (¶35) is not hyperbole; it is the only
route the page offers other than the browser's own Back button.


## 2. The index, `/catchups`

Shot `01-index-1512.png`. Two Catch-ups, a right rail, and a great deal of nothing.

### I2 + I13 — the white space, measured. `CONFIRMED`

He said *"eventually 90% of the screen is white space"* (¶6). Measured on his own account, with his
two Catch-ups on it:

| | 1512x982 | 1920x1080 | 2560x1440 |
|---|---|---|---|
| the Catch-up tile's width | 836px | 1244px | 1252px |
| **dead gap inside the tile**, between the title/birds group and the View/dots group | **530px (63%)** | **938px (75%)** | **946px (76%)** |
| first screen empty below the content | 67% | 70% | 78% |
| whole window that is neither sidebar nor card | — | **73%** | **82%** |

So 82% at 2560, and the trend is exactly the one he described. The tile stops widening at ~1250px
(`RAIL_GRID` in [`rail-grid.ts`](../../../src/components/layout/rail-grid.ts) caps the columns), so
past that the emptiness moves outside the card instead of inside it. Neither is better.

The vertical figure is the one nobody mentioned. **At 1512 the whole page is 982px — it does not
scroll at all** — and 662px of that is background. Two Catch-ups produce a page that is two thirds
empty before you count the gaps inside the tiles.

### I9 — Fresh off the press: the curved border. `CONFIRMED`, root-caused

Shot `03-fresh-curved-divider-8x.png`, magnified 8x so the hairline is legible.

He was precise: *"the border between the Round 1 catch-up in one of them and then the next Fresh off
the press thing, that border is not a straight line. It's curved, which is really weird."*

[`fresh-off-the-press.tsx:64`](../../../src/components/catchups/index/fresh-off-the-press.tsx#L64)
puts the divider on the row itself:

```
<div className="[&>*:last-child]:pb-0 [&>a+a]:border-t [&>a+a]:border-border">
```

and each row is `className="block rounded-md py-3 state-layer …"`. Computed on the live page:
`border-top-width: 1px`, `border-radius: 12px`, `border-left-width: 0`. **CSS draws a border along
the corner arc**, so with the side borders at zero the line bends down through the 12px radius at
each end and tapers to nothing. It is a `border-t` on a rounded box; nothing else.

### I9 — the hover shape. `CONFIRMED`

Shot `02-fresh-hover-1512.png`. The tint is the `state-layer` utility painting the element's own box,
clipped to its radius. That box has:

| edge | padding |
|---|---|
| top | 12px |
| left | **0px** |
| right | **0px** |
| bottom (last row only, via `[&>*:last-child]:pb-0`) | **0px** |

So the tint's left edge is the first letter's left edge, its right edge is the date's right edge, and
on the last row its bottom edge is flush with the descenders. Text touches three of the four sides,
and the 12px corner radius cuts inside the text's own bounding box. That is *"the corner rounding,
and there's text coming out of the hover. It's just not done nicely."* He was describing 0px of
padding on three sides of a rounded box, which is what it is.

### I9 — the quoted sentence, and a Round nobody wrote in

Two things sit under his *"I'm just not gonna see this sentence again and again and again"*.

**The teaser is truncated twice.** The server cuts the most-loved answer to 110 characters and
appends three periods
([`(index)/page.tsx`](<../../../src/app/(main)/catchups/(index)/page.tsx>), `truncate(text, 110)`);
the paragraph then carries `line-clamp-2`, which cuts it again and adds its own ellipsis. The DOM
holds "…from the balcony every m..." and the screen shows "…from the balcon…". One of the two
truncations does nothing except guarantee the cut lands mid-word.

**"0 people wrote in."** The top row of Fresh off the press today is `Round 1 · test`, published
16 Aug, with **zero answers**. A published Round with nothing in it is promoted above a Round with
133 answers, because the rail sorts on `publishedAt` alone and filters on nothing. Tapping it opens
an empty reader. `NEW`.

### I10 + ¶13 — the same Round drawn three different ways, with different numbers

He asked why the preview under Fresh off the press and the one under Published issues are not
consistent. They are not, and the differences are measurable. Same Round, same answer:

| | index, Fresh off the press | Catch-up home, Published issues |
|---|---|---|
| teaser cut at | **110 characters** | **140 characters** |
| headline | `Round 1 · in the loop`, 13px semibold, sans | `Round 1`, 14px bold, **serif** |
| date | `15 Aug` | `15 Aug 2026` |
| "N people wrote in" | 11px, `font-semibold`, leaf | 11px, `font-medium`, leaf |
| the row | no border, `border-t` between rows | its own bordered box on `bg-background/40` |
| hover | grey state layer | cinnamon border + cinnamon tint |

Two components, drawn to two different specifications, previewing the same object with two different
amounts of the same sentence.

### I8 — the birds overlap. `CONFIRMED`

[`your-catchups-card.tsx`](../../../src/components/catchups/index/your-catchups-card.tsx): `flex
-space-x-2` on 28px `BirdAvatar`s with `ring`. Each bird sits 8px under the one before it. He thought
it a regression (*"I don't think it was like that before"*); it is deliberate, and the `+18` chip
beside it carries a hand-written 4px card-coloured ring, documented as something he looked at on
2026-09-05 and kept.

The overlap is not the finding. **The finding is that the cluster answers no question**, and his own
words (¶23) already contain the test: *"that's pretty much all the information this is giving me,
because I am not identifying the birds or the people."* The masthead's own byline names people up to
three and then gives up (`contributorsCopy`), which is the same design admitting the same thing.

### I5 + I6 — the CTA and the three dots

`buildCta` in [`(index)/page.tsx`](<../../../src/app/(main)/catchups/(index)/page.tsx>) produces
**five different labels** for the same slot: "View archive" (ended), "View" (paused or preparing),
"Answer now" (answering), "Read the Round" (published), "Add a question" (collecting).

So "View" is not a redundant CTA that someone forgot to remove; it is the fallback label for two
states that have no better verb. That is worth knowing before deciding whether the control survives:
the question is not *"why is there a View button"* but *"what should a paused Catch-up's card
offer?"*

The three dots sit **beside** the CTA, vertically centred on the right edge, not in the top right.
Measured at 1512: the dots' centre is at y=150 in a card spanning y=105 to y=196 — dead centre. His
*"shouldn't it be in the top right, where 3 dots always are?"* describes a real inconsistency with
every other menu in the app.

---

## 3. The people panel and its dialogs

### E1 — "In this catch-up". `CONFIRMED`

Shots `30-home-paused-1512.png`, `10-home-390.png`. On the Catch-up home's right rail:

| | |
|---|---|
| panel height, to show 7 of 23 people | **436px** |
| one name row | 38px (desktop), 44px (phone) |
| names shown | 7 |
| names hidden behind "and 16 more" | 16 |

The seven are **Sanan Shankar, Afya Zakir, Abhineet More, Agastya Lewin, Anand Vij, Ananya Honnur,
Anvit Meow** — the viewer, then straight alphabetical. His *"Why am I only seeing the people whose
names start with A"* (¶12) is not an impression; with 23 members it is arithmetic. It will be worse
on a batch Catch-up: Batch of 2023 has 39 members, so a member would see seven A-names out of 39.

### E3 — the "Everyone in this catch-up" dialog. `CONFIRMED`, every part

Shot `31-people-dialog-1512.png`. Dialog is 448 x 750px, fixed `max-width: 448px`.

- **"Truckload of white space"**: each row is 46px tall, and the gap between a member's name and
  their "..." button is **251px in a 414px content column — 61% of every row is empty.**
- **Two labels for one role**: the viewer's row says **"Started it"**, the other Keeper's row says
  **"Keeper"**. He asked for exactly this (¶38): *"It can just say keep it [Keeper]. Why does it have
  to say started it?"*
- **"the link is against this horribly coloured background"**: the join-link field is `#ECE8DD` on
  the dialog's pure-white `#FFFFFF` popover. It is the only warm well in the app placed directly on
  white, which is why it reads as a stain rather than a surface.
- **The link is cut off**, which he did not notice and is worse than the colour: the field's content
  is 414px wide in a 332px box, so **82px of the invite URL is clipped**, in a read-only field with
  no way to scroll or reveal it. `NEW`.
- **Two rules**, one above "Add someone by name" and one above "Or send a link", exactly as he
  counted them.

### E3 + L4 — the member menu. `CONFIRMED`, and it is as bad as he said

Shot `32-member-menu-zoom.png`. Opening a member's "..." gives a 128px-wide menu with
`min-width: 128px`:

| item | rendered lines |
|---|---|
| "Make a Keeper" | **3** |
| "Remove from catch-up" | **4**, breaking as "Remove / from catch- / up" |

He remembered the label as *"move them, catch-up"* and said *"3 words, effectively, is taking up 3
different lines."* It is "Remove from catch-up", and it takes four, hyphenated mid-word. Each row
carries a 16px icon inside the 118px content box, leaving about 90px for the text.

### S2 — the Reminders info dialog. `CONFIRMED`, with the mechanism

He said *"this is horribly sized to a new level… the dialog is so much wider than the text… and then
the text is squashed into one column on the left"* (¶40).

| | |
|---|---|
| dialog box | **288 x 72px** (`w-72`) |
| content column | 264px |
| the text | "Reminders to answer, once the round is open to replies." |
| rendered as | 2 lines, **157px and 163px** |
| **dead space to the right of the text** | **101px** |
| box width ÷ longest line | **1.62x** |

The mechanism is two classes that are each reasonable and together cannot win: `w-72` fixes the box
at 288px whatever it holds, and `text-balance` (`text-wrap: balance`) then splits the sentence into
two equal short lines instead of filling the first one. A fixed width with balanced wrapping
guarantees a column of dead space on the right, every time, at every string length.

### S1 — Catch-up settings. `CONFIRMED`

Shot `33-settings-dialog-1512.png`. 384 x 326px, and inside it:

- **a pill inside a pill**: the Rhythm control is a 350x40 fully-rounded pill containing a 111x30
  fully-rounded pill for the selected segment. His *"we have Rhythm in a pill and then a pill
  inside"* is literal;
- **three stacked 350x40 pills**: the Rhythm segmented control, "Resume this Catch-up", "End this
  Catch-up". His *"a big pill and then a small pill, and then a big pill onto that… too many pills,
  man"*;
- **9 stacked horizontal bands** in 326px of height, separated by 2 hairlines at `#DFD8CB`.

He counted twelve. In this dialog it is nine bands and two rules; his point stands and his arithmetic
was rhetorical.

---

## 4. Where the verbs live

This is L1 and ¶40 (*"there's no consistency. Everything's just different in every different
situation"*), and it is the clearest thing in this whole file. Every lifecycle action, and the one
surface it can be reached from:

| Verb | Lives on | Surface |
|---|---|---|
| Archive | the index card's "..." menu | `/catchups` |
| Delete | the index card's "..." menu | `/catchups` |
| Put back / restore | the "Filed away" section | `/catchups` |
| Pause | the Settings dialog | Catch-up home |
| End | the Settings dialog | Catch-up home |
| Change the rhythm | the Settings dialog | Catch-up home |
| **Resume** | the Settings dialog **and** a button in the home's left column | Catch-up home, twice |
| Leave | the people panel | Catch-up home |
| Add people | the people panel | Catch-up home |
| Remove a member | the people panel | Catch-up home |
| Make a Keeper | the people panel | Catch-up home |
| Reminders | its own rail card | Catch-up home |
| Nudge the group | the answering console | Catch-up home |
| Extend the deadline | its own card | Catch-up home |
| Open answering | the collecting console | Catch-up home |
| **Publish now** | the home shell **and** the reader page | two surfaces |

Two things fall out of that table.

**Archive and delete cannot be reached from inside a Catch-up.** They exist only on the index card's
menu. A member reading a Catch-up who wants to file it away has to go back to the list first. `NEW`.

**Two verbs are in two places each** (Resume, Publish now) while the other fourteen are in exactly
one, and the one is a different one each time: a card menu, a dialog, a rail card, a console, a
bespoke card, another page.

### NEW — "archive" means two different things

`FiledAway` on the index is the member's archived and deleted **Catch-ups**. `ArchiveShelf` on the
Catch-up home is the list of past published **Rounds**, labelled "Published issues". Same word in the
codebase for a shelf of Rounds and a bin of Catch-ups. Any rework of the lifecycle vocabulary (L1,
L2) has to settle this or it will keep leaking into copy.

---

## 5. One published Round, drawn ten ways

He said *"this preview of this Round 1 tile is the kind of thing that is done in 15 different ways
and 15 different places"* (¶39). The count is ten, and three of them are genuinely different designs
of the same preview card. His number is high; his complaint is right.

| # | Where | What it draws |
|---|---|---|
| 1 | index, Fresh off the press | preview card, design A (110-char teaser) |
| 2 | index, the Catch-up card's CTA | the Round as a button label, "Read the Round" |
| 3 | home, `ConsolePublished` tile | "Round N is out." + a text link, design C |
| 4 | home, below that tile | **the entire Round, inline** |
| 5 | home, Published issues rail | preview card, design B (140-char teaser) |
| 6 | reader, masthead | title, Round N, date, birds, byline |
| 7 | reader, body | the entire Round again, wider column |
| 8 | reader, footer tease | "Next Round opens…" + "Back to the Catch-up" |
| 9 | notification bell | a `catchup_published` row, "Round published" |
| 10 | `/admin/catchups` | an admin row |

### H2 + H3 — three of those ten are on one screen. `CONFIRMED`

On the home of an active Catch-up whose latest Round is published, a member gets, top to bottom:
the "Round N is out." tile (3), the whole Round inline (4), and the Published issues rail row (5).
Three representations of one object, on one page. *"This is so ridiculous, man. It's actually so
ridiculous."* (¶15)

And the tile is dead.
[`console-published.tsx`](../../../src/components/catchups/home/console-published.tsx) renders a
`<div>` with an `<h2>` and one `<Link>` reading "Open it on its own page". **The tile has no
stretched anchor and no click handler**; only those five words navigate. His ¶35 is exact:
*"Anywhere on this tile does not take me to its own page… So the rest of the tile is just dead,
which is so dumb."*

Worth noting for whoever redesigns it: the index card next door
([`your-catchups-card.tsx`](../../../src/components/catchups/index/your-catchups-card.tsx)) already
solves this properly, with a stretched `absolute inset-0` anchor behind everything and a docblock
explaining why. The pattern exists in the same feature and was not used here.


## 6. The ceilings, and a correction to D35

Read out of the shipped validators, not guessed. Every direction, every room and every fixture is
bounded by these, and the pressure corpus is built to sit on them:

| | limit | where |
|---|---|---|
| answer body | **6,000 characters** | `actions.ts:147` |
| photos per answer | **3** | `actions.ts:148` |
| question text | **300 characters** | `actions.ts:129` |
| accepted questions per Round | **40** | `MAX_ACCEPTED_PROMPTS_PER_EDITION` |
| people per Catch-up | **100** | [`catchup-caps.ts`](../../../src/lib/catchup-caps.ts) |
| Catch-up name | 80 characters | `actions.ts:117` |
| photograph long edge, as stored | **1920px** | `toDisplayWebp`, measured on all 36 live photos |

**D35 asks for two things the app cannot produce**, and a corpus built to them would test the rooms
against input no member can ever make while missing the extremes they can:

- *"an answer of 3,000 words"* — 3,000 words is about 18,000 characters against a 6,000 cap. The
  real extreme is **6,000 characters, and one row over it**, because a cap added later does not
  shrink rows that predate it.
- *"ten photos on one answer, a two-hundred-photo wall"* — the cap is **three per answer**. A
  200-photo wall needs 67 members answering, not one answer with 200 files.

The fixture at [`_fixtures/pressure.ts`](../../../src/app/lab/catchups/_fixtures/pressure.ts) is
built to the real ceilings and steps one row over each. **S3 and S4 should read D35 as corrected
here.**

**For the magazine (D27, D47).** Every stored Catch-up photograph is boxed to 1920px on its long
edge. A4 at 300dpi is 2480 x 3508. So a full-bleed portrait page off today's pixels lands at
**164 dpi**, and a half-page at 300. He asked (¶21) that *"if we have one image big, we have to make
sure that it's high resolution"* — with today's pipeline, "big" tops out at about half a page. M1
should decide whether Catch-ups starts keeping originals the way the Collection does; the decision is
not free and it is not urgent, because half a page at 300dpi is already available.

## 7. The export exists, and everything fits in 5.8 MB

[`scripts/dev/export-catchups.mjs`](../../../scripts/dev/export-catchups.mjs), read-only against the
database, dry by default. Shape: [`src/lib/catchups-export.ts`](../../../src/lib/catchups-export.ts).
Ledger row added to `scripts/README.md`; `scripts/qa/scripts-ledger.test.mjs` passes.

Run on 2026-09-05, `--write`. It agrees with F1 exactly, and adds three numbers F1 did not have:

| | |
|---|---|
| Catch-ups / Rounds / questions / answers | 3 / 4 / 21 / 141 |
| answers with photographs | 32 |
| **photographs** | **36** |
| hearts | 520 |
| memberships / reminder preferences | 35 / 14 |
| **member avatars that are uploaded photos** | **2 of 35** (the rest are bird glyphs) |
| **the whole thing on disk** | **5.8 MB** |

Verified regenerable rather than assumed: all 36 photographs and both avatars fetched, every one a
real WebP, every byte count recorded in the JSON, every referenced file present on disk. The invite
token is deliberately not exported — it is a bearer token, and an export folder that carried it would
let whoever held the folder join every Catch-up in it.

Output goes to `scripts/dev/.exports/catchups/<date>/`, which `.gitignore` already covers
(`scripts/dev/.*/`). **It holds members' private words and photographs and must never be committed.**

**One deviation from D33, said out loud.** D33 has the committed fixtures containing "the two real
published Rounds from the export". They do not, and should not: the export folder is gitignored
precisely because it holds members' words, and copying those words into `src/` would put them in git
under a different name. What the owner approved (his answer to question 5) was that **rooms show real
data**, and rooms can read the live database directly through Prisma, which is what the lab already
does. So: real Rounds come from the database at render time, and the only thing committed is the
invented corpus. Nothing is lost and no member's writing enters version control.


## 8. The shared image viewer, and the heart

### V1 — the size snap between orientations. `CONFIRMED`, measured, and the fix is already in the repo

He described one specific answer (¶28): *"Mohini had these 2 long photos. Eiffel Tower, swipe left.
Statue, swipe left, and now there's a landscape photo and the window size just bounced into the
smaller shape, and it was very jarring."*

That answer is in the live data: one entry under question 1 with three photographs, **1200x1600,
1200x1600, 1288x966** — two portraits then a landscape, exactly as he said.

Stepped through the full-screen viewer at 390x844:

| photo | source | drawn box | top edge | bottom edge |
|---|---|---|---|---|
| 1 | 1200 x 1600 | 414 x **552** | 172 | 724 |
| 2 | 1200 x 1600 | 414 x **552** | 172 | 724 |
| 3 | 1288 x 966 | 414 x **311** | **293** | **603** |

So stepping from 2 to 3 the photograph loses **241px of height in a single frame**, a 44% collapse,
with the top edge dropping 121px and the bottom rising 121px at the same time. It closes from both
sides at once, which is why it reads as the window bouncing rather than the picture changing.

**Root cause**, and the file says it in its own comment
([`image-viewer.tsx:152`](../../../src/components/common/image-viewer.tsx#L152)): *"The step: a
straight cross dissolve, opacity and nothing else."* Opacity is animated; the geometry is not. The
outgoing photograph fades at 552px while the incoming one fades in already at 311px.

**And the answer is 400 lines away.** The in-page carousel
([`photo-carousel.tsx`](../../../src/components/common/photo-carousel.tsx)) has `heightAt`, which
linearly interpolates the frame's height between the two neighbouring photographs' drawn heights and
writes it straight to `frame.current.style.height` on every scroll frame — so dragging from a
portrait into a landscape there shrinks the frame *with your finger*. The full-screen viewer, which
is the one he was using, does not do this. The same app solves the same problem correctly in one
component and not in the other.

### V2 — swiping back from the last photo lands on the first. `NOT REPRODUCED`

He said: *"instead of taking me to the second picture when I'm on the third picture, it takes me all
the way back to the first."*

I could not find a mechanism, and I looked in both places:

- **The viewer cannot wrap.** [`image-viewer.tsx`](../../../src/components/common/image-viewer.tsx)'s
  `step` is `const next = i + dir; if (next < 0 || next >= count) return i;`. It has read that way
  since the viewer's first commit (`a57cc2e`); `git log -S` on that guard returns one commit.
- **The gesture fires once per swipe.** `pinch-zoom.ts` commits on pointer-up with a single
  `if (dx < -70 || vx < -420) onStep(1); else if (dx > 70 || vx > 420) onStep(-1);`. There is no path
  that calls it twice.
- **The in-page carousel is native scroll-snap** with `snap-mandatory` and `snap-always`, and the
  comment on the slide reads *"`snap-always`: a flick moves one photograph, never three."*

So either it is iOS momentum defeating `snap-always` in the in-page carousel — which Chrome's
emulated touch does not reproduce — or it is something a desktop cannot see. **X must reproduce this
on a real iPhone before changing anything**, because the obvious "fix" (adding wrap logic) would be
changing code that is already correct. V3, the overshoot, is the same investigation: `SWIPE_RETURN`
is a 0.24s ease-out with no spring and cannot overshoot on its own, so whatever he saw was the
platform's, not ours.

### R13 + R5 — the heart. `CONFIRMED`, and the cause is a whole-page re-render on every tap

Two complaints, one mechanism. ¶29: *"if I'm on the feed and I click the heart, the heart just
becomes red. But if I click a heart on Mohini's answer, it becomes red and the animation kicks in
after the second."* And ¶11, which he confirmed on 2026-09-05 belongs here rather than to the chip
bar: *"it takes a second to react, and it just reloads like a whole page almost"*, adding
**"noticeably longer"** than the feed.

**The heart itself is not at fault, and neither is the colour.** `EntryLoveButton` renders the shared
`LoveButton` through `useHeartToggle`, which is `useOptimistic`: the fill and the count flip before
any network call. Measured end to end on a throwaway Round: **the visible state flips at 28ms.**

**What follows the tap is the problem.**
[`toggleEntryLove`](<../../../src/app/(main)/catchups/actions.ts>) ends both of its paths with:

```js
revalidatePath(`/catchups/round/${entry.editionId}`)
```

That tells Next to re-render the reader's whole server tree and ship it back inside the same POST.
The reader server-renders **every answer**. So one heart tap costs a full re-render of the Round.
Measured on "in the loop" Round 1, and compared with the feed:

| | the Catch-ups reader | `/feed` |
|---|---|---|
| answer cards rendered on the server | **133** | 0 — posts arrive client-side via `loadPosts` |
| `revalidatePath` on the heart | **yes** | **no**, deliberately |
| RSC payload per tap | **603 KB** | 55 KB |
| server + network, warm, three runs | **1,529 / 2,002 / 2,540 ms** | 250 / 287 ms |
| React reconciliation afterwards | 133 cards | none |

**11x the payload, and roughly 6x the time, before React has reconciled anything.** On the throwaway
Round with a single answer the same POST still took **900ms**; the 133-card Round is the same work
multiplied.

**And the feed already removed this exact call, with the reason written down.** From
[`feed/actions.ts`](<../../../src/app/(main)/feed/actions.ts>), inside `toggleLike`:

> "No revalidatePath here (deliberately): PostCard already applies the like/count change
> optimistically on the client, so nothing here needs freshly-rendered server markup. A
> revalidatePath forces Next to refresh the current route's server tree right after this action
> resolves, and **that refresh was landing as an occasional scroll-to-top on the heart click** (root
> cause of the "heart scroll-jump" bug). […] **THE RULE, since audit 2 took the last five out: an
> action whose result the client already holds does not revalidate.**"

Catch-ups is holding the call that rule exists to remove, on the one page in the app where it costs
the most. The feed's own tree renders no posts at all; the reader renders all 133 answers.

So his sentence is not an exaggeration — **"it just reloads like a whole page almost" is a literal
description of what happens.** The heart goes red at 28ms, and then the page spends one to three
seconds rebuilding itself underneath his thumb.

**For X.** The fix is to delete the two `revalidatePath` calls in `toggleEntryLove`, which is what
the feed did, and it is one line each. The optimistic client state is already correct. Check
`toggleCommentLike`'s sibling reasoning in the same feed file before assuming any other Catch-ups
action needs its call kept.

**A second, smaller effect is real and worth keeping separate.** The pop animation is `m.button` from
`LazyMotion`, whose feature chunk loads asynchronously.
[`motion-features.tsx`](../../../src/components/common/motion-features.tsx) predicts the symptom in
its own docblock — *"an interaction in the first moments after load animates once the feature chunk
lands"* — and that chunk finishes at **5,239ms** on this page against **1,930ms** on the feed, because
this page is 49,464px with 133 cards competing for the same thread. That explains a missing pop on
the **first** tap after a cold load. The re-render above explains the lag on **every** tap, which is
what he is describing.


## 9. The batch Catch-up: it never existed, and one has already gone wrong

This is B1 to B6 and ¶4, and it is the most consequential thing in this file. He asked for the
history (B4): *"We used to have a default batch catch-up, but now that's gone and you kind of have
to create it yourself."*

### B4 — what actually happened, in three commits

**2026-07-25, `063896c`, "start a Catch-up from people, and retire Groups".** The commit message
records his instruction of the day, verbatim:

> "Owner: for now, basically no groups, just Catch-ups, and **the Catch-up with your batch is
> automatically there**, but you can create one with any group of people"

What shipped, in the same commit's own words:

> "The people picker searches by name and offers a **one-click add of your whole batch**, since the
> batch Catch-up is the case everyone wants."

**A one-click add is not "automatically there."** The instruction was a default; what was built was a
shortcut for making one by hand. That gap is the whole of ¶4, and it has been open since July.

**2026-08-21, `31f84c9`, "a group with no Catch-up no longer gets a row that duplicates itself".**
This is the "Start one" button he remembers. Every group you were in got a row on `/catchups`, and a
group without a Catch-up got one reading "No Catch-up here yet" with a Start one button. It was
broken in a specific way: pressing it ran the create flow, which mints its own Group, so the prompt
never went away — *"you ended up with two rows of the same name, one live, one still offering Start
one, and a third if you pressed it again."*

He was offered two fixes and **chose to remove the row**, for a reason that matters now:

> "Attaching would have meant one member's private naming choice renaming a shared batch group for
> everyone in it, and the people they picked joining a batch they may not be from: a private decision
> with a public side effect."

That reasoning is still right, and it is the answer to B3 (*"who's the keeper of that catch-up?"*):
**a batch Catch-up cannot have a member-Keeper who can rename it or change who is in it**, which is
also exactly what he says in ¶4 and ¶51.

So the honest answer to B4 is: **it never existed.** He asked for it once, got a shortcut, and then
removed the shortcut's broken leftovers himself. Nothing regressed; something was never built.

### B5 — the routing bug he reported is gone, and what replaced it is worse

*"when you click Start one, it actually takes you to the page where you add members"* (¶4). That
button no longer exists at all, as of `31f84c9`. There is now **no route from a batch to a Catch-up**
anywhere in the app.

What there is instead is the create page, `/catchups/new`, shot `40-create-1512.png`. Opened by a
2023 alumnus it shows:

- **NAME**, pre-filled `Batch of 2023`
- **WITH**, offering a one-tap chip: **`+ Everyone from 2023`**

It reads exactly like the way to make your batch's Catch-up. It is not.
[`actions.ts:createCatchupWithPeople`](<../../../src/app/(main)/catchups/actions.ts>) does this:

```js
const group = await tx.group.create({ data: { name, creatorId, members: { create: memberRows } } })
```

**No `batchYear`.** Every Catch-up made through this page hangs off a brand-new hidden group with
`batchYear: null`, however it is named and whoever is in it. "Everyone from 2023" copies the batch's
members into that new group **once**, as a snapshot.

### NEW, and live — one has already drifted

This is not hypothetical. It is on the site now, and it is the single most important finding in this
file.

There are **two groups named "Batch of 2024"**:

| group | `batchYear` | members | has a Catch-up |
|---|---|---|---|
| `cmrnenxwq000104l4m793dz3d` | **2024** | 11 | **no** |
| `cmt5ru8bb000004lausdv5vvl` | **null** | 11 | **yes** |

A 2024 alumnus used the create page on **2026-08-23**. It copied the eleven members of the real batch
into a new hidden group and started a Catch-up on that. Since then:

- **a real 2024 alumnus joined the site on 2026-08-28 and is not in the Catch-up.** They joined the
  real batch group, which the Catch-up is not attached to. Ten of the eleven overlap; one member is
  in the Catch-up but not the batch, and one is in the batch but not the Catch-up;
- that Catch-up's Round 1 is sitting in **`preparing`** with **8 answers from a single author** — one
  of eleven members wrote in, and it is about to publish;
- and none of the **eleven real batch groups** on the site has a Catch-up at all.

So the promise in ¶4 and ¶51 — *"they're all automatically added and have access to previous issues
if they join later"* — is already broken for a real person, five days after that Catch-up was made,
by the only route the app offers.

### What this means for S3 and S5

Three things fall out that a design session should not have to rediscover.

1. **The container is not the problem.** `Catchup.groupId` is unique and `Group.batchYear` is unique
   (F6), so "a batch Catch-up" is one `Catchup` row pointed at the existing batch group. No schema
   change, no migration of members, no new join table. What is missing is a writer that attaches to a
   batch group instead of minting one.
2. **His 2026-08-21 reasoning is the constraint on B3.** A batch Catch-up must be un-renameable and
   un-editable by any single member, because the group is shared. That is not a limitation to design
   around; it is the reason the thing is different from a people-Catch-up at all.
3. **The 100-person cap is a creation cap** ([`catchup-caps.ts`](../../../src/lib/catchup-caps.ts)),
   applied in `createCatchupWithPeople`. A batch Catch-up whose membership *is* the batch has to
   decide what it means when a batch passes 100. Batch of 2023 is already at 39.

And one migration note for S6+, because it will be somebody's problem: **the existing "Batch of 2024"
Catch-up holds real answers on a group that is not the batch.** Whatever B1 becomes, that row has to
be either re-pointed at the real batch group or left alone deliberately. It cannot be ignored, and
the export (section 7) is what makes either safe.


## 10. The Catch-up's name, printed seven ways

H4 is one sentence in the brief (¶25): *"we can just say In the loop. We don't have to say catch in
the loop, catch up."* It is worth more than one sentence here, because the suffix is **deliberate**
and a session that "fixes the bug" would be reverting a decision without knowing it was one.

[`catchups-core.ts`](../../../src/lib/catchups-core.ts) has two helpers, with this docblock:

> `catchupDisplayName` — "The heading on the Catch-up's own home: no 'catch-up' appended, because
> the page around it has already said so."
> `catchupSurfaceTitle` — "How every OTHER surface names it… where the word has to be there for the
> name to mean anything. **Singular: it is one Catch-up (owner review 2026-07-25).**"

So the suffix is his own July decision. In ¶25 he is reversing it. Say so in the spec rather than
filing it as a bug.

Meanwhile the two helpers are not the whole story. Counted on the running app:

| # | Where | Prints |
|---|---|---|
| 1 | index card | `in the loop` |
| 2 | home `<h1>`, paused or ended | `in the loop` |
| 3 | home `<h1>`, collecting or answering | `[Recon] the happy path · 3 days left` |
| 4 | reader `<h1>` | `in the loop catch-up` |
| 5 | browser tab, reader | `Round 1 - in the loop catch-up` |
| 6 | answer page back link | `[Recon] the happy path catch-up` |
| 7 | answer completion card | `[Recon] the happy path's Catch-up` |

Seven, from two helpers plus two hand-rolled possessives
([`completion-card.tsx:52`](../../../src/components/catchups/answer/completion-card.tsx#L52) and
[`answer/page.tsx:42`](<../../../src/app/(main)/catchups/[catchupId]/answer/page.tsx#L42>)). On a
real Catch-up, number 7 reads **"See you when in the loop's Catch-up is out."**

Row 3 is its own finding. The home's heading appends a countdown — and **the countdown silently
changes what it is counting**. While collecting it is "questions close"; the moment answering opens
it becomes "replies close", with no label either time. Walking the `[Recon]` Catch-up it went
`· 3 days left` → `· 7 days left` at the transition, which reads as the deadline moving further away.

On a phone the heading wraps and the separator is orphaned: `[Recon] the happy path` on line one,
`· 7 days left` on line two, **starting with the middot**. Shot `53-home-answering-390.png`.

---

## 11. Every state, and the path between them

D34 and ¶51: *"it's important especially to see how literally every state of the catch up looks and
every sequence of events through those states looks."*

Two throwaway Catch-ups were not needed; one was. **`[Recon] the happy path`** holds the owner's
account and Jerry Maguire only, and nobody else, for the reason in F14: every Round event notifies
every member, and a real member in a test Catch-up gets test noise in their bell. **It is still on
the site**, named so nobody mistakes it. It was driven through the whole cycle in one sitting.

Where the state machine needed a clock, it did not get one: every transition below was made with the
Keeper's own controls ("Open answering", "Close answering now", "Publish now"), so no timestamp was
edited. **Two rows were touched by hand**, both on this throwaway and both said out loud: the
viewer's own `CatchupReminderPref.deletedAt` was set and then cleared, because the "Recently deleted"
shelf cannot be reached any other way — the index refuses to offer Delete on a Catch-up you started.

### The happy path, screen by screen

| # | Screen | What a person sees | What they can do next | Shot |
|---|---|---|---|---|
| 1 | `/catchups/new` | name pre-filled with **your batch**, a `+ Everyone from 2023` chip, rhythm | Start the first Round | `40`, `41` |
| 2 | home, **collecting**, empty | "Be the first to ask something", a composer, 4 rail cards | ask, or extend the deadline | `50` |
| 3 | home, **collecting**, 1 question | heading changes to "Ask everyone something"; a "1 question in this round" card with ↑ ↓ ✕; **"Open answering" appears at the very bottom, 91% down the page** | open answering | `51`, `52` |
| 4 | home, **answering** | "Answers are open." + Answer now; Nudge and Close beside it; the people panel greys out whoever has not written in and says "0 of 2 have written in" | answer, nudge, close | `53` |
| 5 | `/answer` | "Round 1", a progress rail showing `1` and `0/1` at opposite ends of an otherwise empty pill, the question, a composer, "Add a photo", Skip / Share | share | `54` |
| 6 | `/answer`, done | the hoopoe, "That is you in this Round.", "See you when {name}'s Catch-up is out." | Back to the Catch-up | `55` |
| 7 | home, **preparing** | the hoopoe again, "Putting your Catch-up together.", a shimmer standing in for the hidden answers, **"Publish now" floating between two cards** | publish | `56` |
| 8 | home, **published** | **the "Round N is out." tile, the whole Round inline under it, and a Published issues row for it in the rail** | read, heart, open the reader | `57` |
| 9 | index, **archived** | an "ARCHIVED" block under the live cards, with **Put back** right there | put back | `60` |
| 10 | index, **binned** | a "RECENTLY DELETED" block, "30 days to put it back", **Put back** right there | put back | `61` |
| 11 | home, **paused** | one card: "This Catch-up is paused." Nothing else in the left column | resume | `30` |
| 12 | home, **ended** | one card: "This Catch-up has ended." The people button becomes "See everyone" | read old Rounds | `58` |

### What the walk turned up that no single screen shows

**A paused Catch-up hides a live Round.** Pausing replaces the entire left column with a banner.
"in the loop" is paused right now **and has a Round 2 sitting in `collecting`** — nothing anywhere on
its home says so, its questions cannot be seen or added to, and no member can tell a Round is
part-built. See `flows.md` section 2.

**The primary action is the last thing on the page, on a phone.** In `collecting`, "Open answering"
is at y=1,129 of a 1,234px page — **91% down**, below the people panel, the reminders card and the
extend-the-deadline card. The rail stacks under the main column on mobile, so every Keeper action
that advances a Round sits under four cards of rail furniture.

**21 pill-shaped controls on one mobile screen.** Counted on the `collecting` home with two members
and one question: the ask-as segmented pill (a pill containing two pills), From the library, Ask the
group, two member rows (**each a pill containing a pill**), See and add people, the reminders
segmented pill (a pill containing three), four extend-the-deadline pills, Open answering, Settings.
His *"a big pill and then a small pill, and then a big pill onto that… it's just too many pills,
man"* (¶40) was about Settings; it is worse on the home.

**The song field only exists on a library question.** `promptKind(category)` returns `songs` only
when `category === "songs"`, and `category` is null on every question a member writes. So a member
who asks "what songs have you had on repeat?" **in their own words** gets a plain text box with no
song attachment, and the answers arrive as bare urls. That is the mechanism behind ¶50: *"The song
thing shouldn't just work if the question has exactly taken from the set of questions that we have."*
Confirmed by writing exactly that question in the `[Recon]` Catch-up and answering it: the composer
offered a textarea and "Add a photo", nothing else, and the published answer prints the Spotify link
as unclickable text. Shots `54`, `57`.

### NEW — the settings dialog on an ended Catch-up is entirely dead

Opened on "test", which has ended:

- title: "Catch-up settings"
- subtitle: **"Change the rhythm, or pause / end this Catch-up."** — three things you cannot do
- the Rhythm control: **all three options `disabled`**
- under it: **"You can change this anytime."**
- Pause and End: correctly absent
- the only working control: **Close**

A dialog of 358 x 180px in which every control is disabled, promising three actions it does not
offer, with helper text contradicting the disabled state directly above it.

The Reminders card on the same page is also still live and interactive on a Catch-up that can never
send another reminder.


## 12. Smaller things, all `NEW`

None of these is in the brief. Each was measured or read on the running app.

1. **The three-dot menu usually holds one item.** On a Catch-up you started, `canDelete` is false, so
   the menu he called *"so obnoxious"* and said *"interrupts everything"* (¶24) contains exactly
   **"Archive"**. A 128 x 38px popup for one word.
2. **On a phone there is no Fresh off the press at all.** The index's rail is
   `hidden min-[1180px]:block` — `display: none` under 1180px. It is still rendered into the DOM, so
   the page pays for markup nobody on a phone will ever see. The surface he says has *"the most bugs"*
   and *"severe problems"* (¶9) is a desktop-only surface.
3. **The two rails behave differently.** The index's right column vanishes below 1180px; the Catch-up
   home's stacks underneath the main column. Same feature, two responsive strategies, and only one of
   them keeps its content.
4. **The card's CTA is a different control at each size.** At 1512 "View" is a 74px pill at the right
   of the card. At 390 it is **276px of a 350px card — 79% — a full-width green bar** that dominates
   every row. His I10 complaint about a Round being *"done differently on desktop and mobile"* applies
   to the controls too.
5. **The progress rail on `/answer` is a card holding two glyphs.** A full-width pill with `1` at the
   far left and `0/1` at the far right, and about 500px of nothing between them, above a Round with
   one question.
6. **Archived and binned rows are drawn differently.** The archived row shows the Catch-up's status
   line ("Round 1 published"); the binned row replaces it with "30 days to put it back". Two designs,
   one list, four lines of copy apart.
7. **An empty Round can publish and be promoted.** `Round 1 · test` has zero answers, zero questions,
   and sits at the top of Fresh off the press because the rail orders on `publishedAt` and filters on
   nothing.
8. **A Round with one author in eleven is about to publish.** "Batch of 2024" Round 1 is in
   `preparing` with 8 answers from a single person. Nothing warns the Keeper, and the publish will
   notify all eleven.
9. **The Reminders control stays live on an ended Catch-up**, which can never send one.
10. **The teaser is truncated twice** — server-side at 110 or 140 characters depending on the
    surface, then again by `line-clamp-2`. The server cut is invisible work whose only effect is to
    guarantee a mid-word break.

---

## 13. The eleven things that most make it read as "a V0.5 of an app"

His test, ¶3: *"It doesn't give me any dopamine. It looks like not even a V1. It looks like a V0.5 of
an app."* S3 should read this list first. Ordered by how much each one costs a member, not by how
hard it is to fix.

1. **You cannot move around a Round on a phone.** 55 screenfuls, navigation that scrolls away after
   the first screen and never comes back, an active-chip highlight that is usually 1,900px off
   screen, and no way to tell which question you are in. This is the single worst thing in the
   feature and it is the one he named as *"incredibly bad"*. (§1)
2. **The home shows the same Round three times, and the first one is dead.** A tile you cannot click,
   the whole Round underneath it, and a rail row pointing back at it. (§5)
3. **The batch Catch-up does not exist, and the workaround has already lost a member.** Two groups
   called "Batch of 2024"; the Catch-up is on the snapshot, and a real 2024 alumnus who joined five
   days later is not in it. (§9)
4. **Getting back is 44,381 pixels.** The only route home from a published Round is at the very
   bottom of it. (§1)
5. **The page is mostly nothing.** 82% of a 2560px window and 67% of a 1512px one is neither sidebar
   nor card, and 63 to 76% of each Catch-up tile is the gap between its two ends. (§2)
6. **The most-used gesture in the app rebuilds the page.** Every heart tap on an answer re-renders
   the whole Round on the server — 603 KB, one to three seconds — because the action still calls
   `revalidatePath`. The feed removed exactly that call and wrote down why. *"It just reloads like a
   whole page almost"* is literal. (§8)
7. **Seventeen people are hidden behind "and 16 more", and the seven you can see are all A-names.**
   436 pixels of panel to show 7 of 23, and the row of birds beside them names nobody. (§3)
8. **Sixteen verbs live on five surfaces**, two of them twice, and archive and delete cannot be
   reached from inside the Catch-up they act on. (§4)
9. **A member's pasted song link produces nothing** — no preview, no thumbnail, not even a link — and
   pushes the whole page sideways on a phone. Somebody wrote *"I just want to see if the album covers
   render properly"* into the live Round and got a bare url. (§0)
10. **Twenty-one pills on one phone screen**, several of them pills inside pills, with the button
    that actually advances the Round at 91% of the way down. (§11)
11. **The details are unfinished in a way you can feel**: a divider that curves, a hover with no
    padding on three sides, a dialog 1.62x wider than its own sentence, a menu that breaks "Remove
    from catch-up" over four lines, an invisible rule at 1.08:1 contrast, and a settings dialog whose
    every control is disabled while its subtitle offers three actions. Individually trivial;
    together they are the whole of *"not a lot of thought has been put into it."* (§3, §11)

---

## What S1 did not cover

Honest gaps, for whoever picks this up:

- **`/catchups/join/[token]`** was not walked. The invite link was read out of the people dialog and
  measured, but the accept flow was not exercised — it needs a second signed-in account and every
  path through it writes.
- **Notifications** were mapped from the code (five `catchup_*` types, rendered in
  `notification-bell.tsx`) but not received and tapped. Which screen each one lands on is unverified.
- **`/admin/catchups`** was not opened.
- **Dark mode** was not screenshotted. Every measurement here is the light theme.
- **A plain member's view** was reasoned from the code's `isKeeper` gates, not seen: every screenshot
  here is the Keeper's.
- **V2 and V3** (the viewer's wrap-around and overshoot) are unreproduced and need a real iPhone.
- **The heart's cost after the re-render is removed** has not been measured, because the fix is X's
  to make. The 603 KB figure is the server and network half; React reconciling 133 cards sits on top
  of it and was not timed separately.

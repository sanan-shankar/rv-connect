# The guide

How the site explains itself: one chapter per area, opened from the page's own title, and, since
2026-09-27, run once for every member as a first-run tour.

Decided with the owner on 2026-08-26 and 2026-08-27 (the container and the door) and rewritten on
2026-09-27 (the chapters, the tour, the header). The 2026-08 version of this file is in
`git log --follow -- docs/spec/guide.md`; everything it settled that still holds is restated here.

---

## 1. The problem, in his words

The door (2026-08-26):

> "In each page you should be able to click some button, and this button should be extremely
> inconspicuous, but yet if you look for it you find it."

The rewrite and the tour (2026-09-27, a voice memo, quoted as spoken):

> "We are going to redo the guide and we are going to push people into the guide upon signing in.
> Mean, upon signing up, And make sure they go through [...] once people join, they will get the
> guide for the feed read through it. And then click next, go to directory, click next, and go
> cycle through of them. And then we have to make it clear on in the onboarding somehow. That they
> can always go back to this by double tapping the the title of of any of any section to access the
> guide."

> "For the people who've already joined, the next time they open the URL, we will have to run this
> through them because there's a lot of people who don't know how everything works. Okay. But only
> once, make sure that it doesn't happen again and again."

On the voice:

> "It should just be written as though I am talking to them. Okay? And not trying to sound all
> fancy and, you know, overly conversational in this cringe way. Just be direct, almost like the
> terms and conditions kind of tone."

On what was there:

> "We have a regular text font, then we have a subheading, then we have a different regular text
> font. [...] Just keep this stuff normal. And I know previously for guide, we tried to include as
> many elements of [...] visual elements that are not text like these graphics. That's just not
> working."

> "you have too many subsections? Like, you have, like, three lines per subsection. That's not how
> it goes. You order it more meaningfully. This is just as many subsections as there are lines of
> text."

On the header and the close button:

> "We've removed the left alignment of guide, and we've pushed it off to the side in the corner. I
> don't like that. If you don't want guide to be the biggest text element, which is fair, Why are
> you pushing it off to the left? Just do it differently. Either just move it above the feed, but to
> the same left line or I don't know. But right now, it looks wrong."

> "you know how the x button has this, like, darkened patch around it? I wanna remove that
> everywhere. I hate it. I don't know why we do it just have a normal x."

On the tour's own problem:

> "after signing up to first, you see the feed. And then maybe after a second or two, or maybe
> maybe it just immediately pops up. Because if it's a second or two, they might click or do
> something in that time. [...] But then if we say, like, this is the feed and then the whole area
> is covered with the guide, then this is not the feed. This is the guide. [...] I don't wanna make
> it a small portion of the screen. Should probably be the whole screen. But then, yeah, they have
> to know that they should cycle through all of those guides."

> "the onboarding is extremely smooth, And there's no, like, glitchy, you know, effect of this and
> that."

---

## 2. The decisions

**2.1 A chapter is plain writing.** This reverses the 2026-08-26 call ("the chapter is not a
document"), which built chapters out of the product's own material with short lines beside it. He
has now read the result and asked for the opposite, in the policy pages' voice. So: a title, then
paragraphs, grouped under two or three headings where the grouping means something. One body style
for every paragraph (16px, 1.65), headings in the heading face, nothing else. No diagrams, no
comparison boxes, no captions. `Scale`, `Compare` and `BlankMark` are deleted from the kit.

**2.2 The voice** is his: second person, "we" for the people who run the site, declarative,
specific, uncontracted like the terms and the guidelines. One line per chapter may carry some
warmth (the warmth dial, 4.5 of 10). `docs/content/AI-WRITING-TELLS.md` applies in full. Every fact
in a chapter was read off the code on 2026-09-27; section 7 lists the ones that corrected what he
remembered.

**2.3 The header is the chapter's title**, with the X centred on it. The small "Guide" label that
stood above it is gone (owner, 2026-09-27, second round: "I don't think we need to say guide [...]
we can just just ditch the guide thing"), and so is the paragraph about the guide that sat above
the title on the tour's first page, which put the title a third of the way down ("the feed is,
like, the primary unit [...] But it's so far down"). The margins are 24px on a phone and 48px on a
laptop, not the 16px every list sheet uses ("The margins are way too tight").

**2.3a A photograph for each chapter** (`src/components/guide/guide-photos.ts`), because the
plain-text chapters read "just black and white. Super corporate", and the fix he named was the
sign-in page's: "On desktop with an image and then a column of content [...] so that it feels more
homely." His picks from the Class Collection: Three Sisters for the Feed, the December 2011
silhouettes he linked for the Collection, the senior library for Letters ("if you can correct it
and just get the shelves even on both sides"; since 2026-10-01 Lakshman's photograph of the same
aisle, ceiling and all), Kartik's house for Catch-ups. The school bell ("we
should definitely use that somewhere") took the Directory; Birds has the September 2010 basketball
photograph, because he did not want a bird. Each is cut twice from its stored original, a tall crop
for a laptop and a wide one for a phone, and served as a static file rather than through the metered
image optimiser. The library is turned back to level before it is cut, so its uprights stand plumb.

- **A laptop** gets a window that floats clear of every edge, 1120px wide and at most 54rem tall,
  with the blur all round it ("a floating window is better than this dialog from the bottom [...]
  let the bottom be blurred like the other sides"): the photograph fills its left 44%, the chapter
  its right. The next chapter's photograph fades in over the last, which stays at full strength
  until it is covered, and is fetched while the chapter before it is read.
- **A phone** keeps the sheet that rises from the bottom, and the photograph starts at its top edge
  with the chapter's title at its foot on a shade, then the writing on paper below: one change from
  picture to paper, not paper, picture, paper ("the picture is part of this experience rather than
  we're just tacking on a picture"). Once the photograph has scrolled away, a slim bar fades in at
  the top with the title small, so the X is never white on white.
- **Which of the two shows is CSS's decision alone**, at the sheet's own 1024px breakpoint. A
  JavaScript width check answered a frame late when a window was dragged across it, and for that
  frame the laptop's white header sat over the phone's page (owner: "there flashes a white row on
  top saying feed"). Both photographs are in the page and lazy, so the hidden one never downloads.

**2.4 The close button is a bare X**, everywhere (`MODAL_CLOSE` in `ui/dialog.tsx`, which every
dialog and bottom sheet wears). Muted ink at rest, full ink on hover, a press that sinks, the 44px
target kept by the `::after`. This reverses the 2026-09-15 "32px filled circle, the iOS sheet
close".

**2.5 A chapter ends with the next one, not with the page it describes.** "Go to the Feed" is gone:
he pointed out you are usually already on it, and the X or a swipe closes the sheet. Opened from a
title, a chapter ends with an outline "Next: Directory" that swaps the chapter in place. The last
chapter in the chain (Catch-ups) and Birds end with nothing.

**2.6 The tour is the guide itself** (section 5): the same sheet, the five chapters in a row, run
over the Feed the first time a member lands there. Once per account.

**2.7 Verbs follow the device.** "Tap" where the pointer is coarse, "click" where it is fine,
through one small component (`<Tap>`, and `<DoorHint>` for the door's whole instruction, in
`src/components/guide/tap.tsx`). The door is where this matters most: on a phone the title needs
two taps, with a mouse one click.

---

## 3. Routes

```
/guide                    the index: one card per area
/guide/feed
/guide/directory
/guide/collection
/guide/letters
/guide/catchups
/guide/birds
```

Authed, under `(main)`. From inside the app a press opens the chapter as UI state over the page you
were on, with no navigation (`src/lib/guide-open.ts` has the measurements that ruled out an
intercepting route and `pushState`). A cold load or a mailed link renders the standalone page, which
ends with a link to the next chapter's page.

Closing returns you to the page underneath: the X, escape, back, a click on the scrim, or a swipe
down.

---

## 4. The door

**One door: the page title.** Every member surface routes its heading through
`src/components/layout/page-header.tsx`; pass a `guide` slug and the `<h1>` becomes the control
(`<GuideDoor>`). Nothing is added to any page. Nothing in the navigation links to `/guide` (owner,
2026-08-27: "It's fine if it's not reachable like that. The page title thing is enough."). The tour
is how members learn the door exists: page one says so and the last page says it again.

**On a phone it takes two taps.** The first arms, the second opens, so a tap that was really the
start of a scroll costs nothing. The arming is invisible (the `?` mark was removed 2026-09-02) and
expires on scroll, on a touch elsewhere, and after four seconds. A mouse and a keyboard open on the
first press. Pointer type is read off the event, not a media query.

Three details: the target is padded to 44px and given the height straight back as negative margin,
so the heading never moves; `-webkit-tap-highlight-color` is off; modified clicks (cmd, ctrl, shift,
alt) belong to the browser.

**Not doing:** a floating button or circle; a sidebar row (tried and reverted 2026-08-27); a `?`
key as the primary door; long press (it selects text on a phone); the foot of the page.

---

## 5. The tour

### 5.1 When

The first time a member lands on the Feed after this ships, or after signing up (the setup wizard at
`/welcome` finishes on the Feed). It opens at once, with no delay, because a delay is a window in
which somebody presses something (his point). It opens only on the Feed:

- **Not on any page.** A member arriving from an emailed Catch-up reminder, an invitation or a
  notification came to do one thing. A guide over that page is an interruption at the worst moment.
  The Feed is where `/` sends a signed-in member, so "the next time they open the URL" is the Feed.
- **Not only at the end of `/welcome`.** That reaches new members and none of the ~270 who have
  already joined.

Not on the public demo (`IS_DEMO`): its first frame is the product, by the standing decision in
`docs/spec/demo.md`.

### 5.2 What it is

The guide sheet, with three additions while the tour runs:

- **A cover first** (`guide-cover.tsx`): the valley photograph the sign-in page opens on, filling
  the whole window, with "How to use this site" and one line over its foot: the way back to it, in
  the device's own verb ("Tap twice on the title at the top of any page, like Feed, to come back to
  this guide"). It first read "To come back to it later, tap the title at the top of any page
  twice", and a first-time reader asked "what's it, what's title" (owner, 2026-09-29); naming the
  guide and one real title answers both.
  He asked for the guide and the way back to it "before feed on its own beautiful window", said the
  two points were "this is a how to use and you can tap the title to get back to it", and cut the
  line that said what the tour was ("delete this"). The first chapter is already laid out beneath
  the cover, so Next fades the cover away and nothing under it moves: its dots, Next and X stand
  where the chapters' do.
- **A footer** on the sheet's own surface: step dots on the left (the setup wizard's dots, one per
  page, the current one drawn long; a visited one can be pressed to go back) and a canopy
  "Next: Directory" on the right. On the last page it says "Done".
- **The last page ends** with the door again and with Reach out, for anything the guide does not
  answer.

When the tour closes, a bubble under the page's own title says "Tap the title twice to see this
again" ("Click the title..." on a laptop) for six seconds, or until the first press, key or scroll
(`door-coach.tsx`). The door is shown where it is, not only described.

Next swaps the chapter inside the same sheet: the old one fades out, the body scrolls to its top,
the new one rises in. The sheet never closes and reopens between chapters and the page underneath
never navigates. Navigating the page underneath to each area was the literal reading of "go to
directory", and it was not taken: it would load five routes under a sheet that hides them, each one
a chance for a skeleton, a map load or a layout jump, for nothing the member can see.

Teachers get four chapters: Catch-ups is left out, because `/catchups` sends teachers to the Feed.

### 5.3 Once

`User.guideSeenAt`, stamped when the tour ends: Done, or closed any other way (the X, escape, back,
the scrim, a swipe, or a link inside it that navigates away). It lives on the account, not the
browser, which is his rule for the Feed's "New since you were last here" marker (2026-08-20: "should
only appear once, not once on each device").

Stamped at the end rather than on first show, so a phone that kills the tab in the middle does not
lose the tour: the member comes back to it, on the page they had reached (a per-account
`localStorage` note of the page reached, `src/lib/guide-tour.ts`). The write is `markGuideSeen()`,
the same conditional `updateMany` shape as `markFeedSeen`, silent in production and refused on the
demo by the client extension in `prisma.ts` (its rules are `demo.ts`'s). The client also keeps its own note that the tour ended,
because the `(main)` layout and a prefetched Feed can outlive the write within one visit.

The e2e sign-in (`e2e/auth.setup.ts`) writes that note for its own account, which is the owner's,
so the visual suite photographs the Feed rather than the tour, and his own tour is not spent by a
test run. For the same reason the Feed never re-sends the stamp on the strength of that note alone.
`src/lib/guide-tour.test.mjs` pins the Feed's gate, the conditional stamp, both ways the tour ends
and the e2e note.

An admin can play it again ("there should be a way for me as admin to trigger [...] the guide pop
up [...] I went through it once [and] can't go through it again"): a guide page opened from a title
ends, for admins only, with "play the first-run tour again", a full load of `/feed?tour=replay`. The
Feed honours that address for an admin alone, starts from the cover whatever the browser remembers,
and drops the query so a reload is an ordinary Feed. The account's stamp is left as it is.

### 5.4 What waits for it

The hoopoe's celebrations (`CelebrationDetector` on the Feed) hold while any guide chapter is open
and play when it closes. The flight layer sits at `z-[70]`, above the sheet's `z-50`, so a
post-signup welcome would otherwise fly across page one.

### 5.5 Considered and not taken

- **A separate onboarding route** with its own copy of the chapters: two texts to keep in step, and
  the member never meets the object the title opens later.
- **Two sentences above the Feed chapter instead of a cover:** the first version. It put the
  chapter's title a third of the way down, and he asked for a window of its own.
- **A cover that listed every chapter with a line each,** and **one that set its two lines in the
  middle of an otherwise empty column:** both drafts of the cover, both turned down ("we don't need
  to summarise"; "a fucking metric ton of uneven distasteful whitespace").
- **Coach marks pointing at each nav item:** he wants the whole screen.
- **A delay of a second or two:** his own objection, above.
- **Stamping on first show:** the "once" is kept either way; stamping at the end also keeps the
  member who was interrupted.
- **A toast on early dismissal** telling them how to get back: page one already says it, and a
  toast after a close is one more thing moving.

---

## 6. What a chapter is made of

`guide-kit.tsx`: `Chapter` (the title), `Section` (a heading), `P`, and `GuideLink` (an inline
link in the chapters' ink); `tap.tsx`: `Tap` and `DoorHint`. The container adds what is not the chapter's: the Next control, and in
the tour the opening sentences, the footer and the closing lines.

Rules:

- A title, then paragraphs. A heading only where it groups two or more paragraphs that belong
  together. No chapter has more than three.
- Every paragraph is the same size and colour. No lede, no notes, no small print.
- Say what the place is for, then how it works, then what you control.
- Every chapter survives at 390px; no manual line breaks.
- No em dashes, no "quiet", no triples by reflex.

---

## 7. The five chapters

What each covers, in his order. The chapters in `src/components/guide/chapters/` are the text.

| Chapter | For | How it works | What you control |
|---|---|---|---|
| Feed | Things worth telling the whole community and worth keeping; what is better left to WhatsApp; the muted alumni groups | Photos (up to 3), polls, a post for one of your cities, sending photos on to the Collection | Like, save (Saved, on your profile, private), comment and reply, report a post or flag a person |
| Directory | Who lives where | Map (blue circle: several cities, tap to zoom; green: one city, tap for its people), Batches, People (search, filters) | Everything on your profile is seen by members; fill in what you are comfortable with; who sees contact details |
| Collection | The photograph you never had to show someone | Contribute, the year, review; the kinds along the top, sorts, the years down the side, search | Full-resolution download and asking the uploader; the Class Collection (unreviewed, your batch only, free) |
| Letters | Writing longer or more considered than a post | Seen in the Feed and in Letters, likes and comments, up to 3 photos | Drafts, on any device |
| Catch-ups | Keeping up with a whole group at once | Three days of questions (own or from the library, anonymous if you like), a week of answers (named, up to 3 photos), then the Edition, for its members only | Your batch's (every three months), your own (the Keeper sets the rhythm), picture, reminders, leaving |

### 7.1 Where the code corrected the memo

Written the way the code behaves, not the way it was remembered on 2026-09-27:

- **A post cannot be narrowed by batch.** Only to one of the poster's own cities. The old chapter's
  "Chosen batches only" was false.
- **Collection search reads descriptions and contributors' names,** not the kinds (People, Birds and
  the rest), which are the row of words along the top instead.
- **The original file is not kept.** A photograph is re-encoded at full resolution (WebP, quality
  100) and the download is a full-size JPEG of that. The chapter says "full resolution" and "the
  full-size picture", never "original" or "uncompressed".
- **Nothing stops the directory being scraped by a signed-in member** (no rate limit on paging or
  profiles; one endpoint returns a whole batch). The chapter says only what is true: members only,
  closed to search engines, contact details only to verified members.
- **Names need a confirmed email; contact details need manual verification.** Not "both, for any
  personal information".
- **Batch Catch-ups ran monthly.** Made quarterly on 2026-09-27 at his word ("if it's monthly now,
  make it quarterly"), code and live rows (`docs/spec/catchups.md` §2.1).
- **A batch Catch-up exists once ten of the batch have joined,** cannot be left (it can be put
  away), and has no Keeper, so nobody sets its rhythm or holds it.
- **Holding a Catch-up is the Keeper's,** for the whole group; there is no personal pause.
  Reminders cover answering only (Daily, On the last day, Never).
- **The hidden day is gone** (2026-09-08), and he asked for it not to be mentioned anyway.

### 7.2 Added from the code, beyond the memo

He asked for "things I've forgotten to mention". Taken: sending a post's photos on to the Collection;
that polls do not show who voted what; flagging a person from their profile (reports cover posts and
people, not comments); that Saved is private; that a city on your profile is what puts you on the
map; drafts on any device; up to three photos on an answer. Left out as detail nobody needs on day
one: the post and letter character limits, the 300-word letter nudge, Keepers' early-close and
extend controls, copy link, formatting shortcuts.

---

## 8. Scope fences

Out of this build:

- Chapters for `/profile`, `/messages`, `/support`, `/notifications` and the admin rooms (he: "support
  doesn't need an explanation. And about doesn't need an explanation").
- Search inside the guide. Translations.
- Per-user state beyond `guideSeenAt` and the tour's resume note: no per-chapter "read" marks.

---

## 9. What is built

2026-08-27: `/guide`, `/guide/[area]`, `GuideDoor` on six titles, the chapters. 2026-09-02: the `?`
mark removed. 2026-09-15: the sheet became `BottomSheet`. 2026-09-27: the plain-text chapters, the
header label, the bare X, Next, `<Tap>`, and the tour with `User.guideSeenAt`. The same day, second
round: the photographs, the floating window, the title in the header, the cover, the bubble on the
title and the admin's replay.

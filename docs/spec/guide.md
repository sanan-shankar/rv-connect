# The guide

How the site explains itself. One chapter per area, opened from somewhere quiet enough
that nobody who is not looking for it ever sees it.

Decided with the owner on 2026-08-26 and 2026-08-27. The room that settled the
destination is `/lab/guide` ("The same words, four containers"); read it before
building, because two of the calls below are only obvious once you have seen the four
side by side.

---

## 1. The problem, in his words

> "In each page you should be able to click some button, and this button should be
> extremely inconspicuous, but yet if you look for it you find it."

And on what the chapters are for, which is the part that matters most:

> "It's not only tech support stuff like this button is for this. We intend the feed to
> be used for these types of posts. The photos we want in Collection, we don't want just
> random photos of your class that you took while you were in school, we want things that
> should be documented and saved in a more formal archive."

So this is not documentation. It is the house saying what it hopes for, with enough
mechanics mixed in to stop anybody being stuck.

He also ruled things out. No persistent circle on every page, not even a small one with
an eye in it: "even that is too intrusive, because we just have a circle on every single
page that never goes away whether you need it or not." Not a long press, which he
rejected himself while proposing it, because a long press selects text on a phone.

---

## 2. The decisions

**2.1 The chapter is not a document.** The first build put it in the shell the policy
pages use, because he had praised those pages. He rejected it: "this is so boring." The
policy pages are plain because a legal document should be plain. A guide has the opposite
job. Nobody is obliged to read it, so it has to earn the read. A chapter is built out of
the product's own material with short lines beside it, not paragraphs under headings. See
section 5.

**2.2 It opens as a page over the page.** Stage D in the lab room. The chapter is a real
route with a real address, and when you open it from inside the app it appears over the
page you were on, which stays where you left it. Next 16 does this with intercepting
routes. Rejected: a side panel, because the chapter's diagrams stop being pictures at
404px and because a panel can only ever be opened from the page it describes, so it has
no answer to "what even is a Catch-up" asked from the Feed.

**2.3 Two placements, not one.** The requirement has two halves that pull against each
other. A lost person must find it; everyone else must never see it. One control cannot do
both without becoming the circle he rejected. Split them and both get easy. See section 4.

**2.4 It replaces the hoopoe tour.** Removed entirely on 2026-08-27, demo included, at
his instruction. See section 7.

---

## 3. Routes

```
/guide                    the index: one card per area
/guide/feed
/guide/directory
/guide/collection
/guide/letters
/guide/catchups
```

Public or authed? Authed, under `(main)`, because every chapter describes a surface you
need an account to see. The one exception worth considering later is `/guide` itself as a
signed-out preview of what the place is for.

**The interception.** `@modal/(..)guide/[area]` beside the `(main)` layout, following
`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/intercepting-routes.md`.
A soft navigation from inside the app renders the chapter over the current page; a cold
load or a refresh renders the standalone page. Known-fiddly next to this app's route
groups; budget a round of fighting it. If it proves impossible, fall back to the plain
page (stage A), which is the same file and costs only the return-to-where-you-were.

**Closing** returns you to the page underneath: escape, the close control, browser back,
and a click on the scrim all do the same thing.

---

## 4. Where the door is

### Layer 1: the sidebar row that already exists

`/about` is already in the sidebar's second group, under Support, and it currently reads
"indefinitely procrastinated". Point that row at `/guide` and label it **Guide**.

This adds nothing. No new row, no new icon, no new pixel on any page. It is a nav item in
a group the eye already files as the meta shelf, and it is where a person who is stuck
actually looks: at the menu, not at the page. This is the half that has to be findable,
and being conventional is the whole point.

`/about` is in the visual regression suite, so this moves a committed baseline. Expected.

### Layer 2: the page title is the door

Every member surface routes its heading through `src/components/layout/page-header.tsx`.
Feed, Directory, Collection, Letters, Catch-ups. The `<h1>` becomes the control that opens
that page's chapter.

Zero pixels. Nothing is added anywhere, because nothing is added: a word that is already
on the page does a second job. And it is the right word. When somebody is lost, the first
thing their eye lands on is the thing naming the page.

**The hover, on desktop.** Nothing at rest. On hover a small muted question mark fades in
after the title, in space reserved at rest so the heading never moves (owner's standing
rule: hover never moves a control). Roughly 60% of the title's size, on the baseline, in
the muted foreground. It reads as belonging to the word rather than floating in a corner.
Owner's pick from three, 2026-08-27.

**Implementation note.** `PageHeader` is a server component. The title becomes a small
client component, something like `<GuideDoor area="catchups">`, so the header itself does
not have to become one.

**On a phone, one tap reveals and the next one goes.** His idea, 2026-08-27, and better
than the permanent mark this was going to carry. A permanent mark would have rebuilt the
clutter the whole exercise exists to avoid; this keeps every page clean, teaches what the
heading does at the moment somebody pokes it, and makes a stray tap while scrolling cost a
fade rather than a navigation.

Pointer type is read off the event, not from a `hover:` media query, because a laptop with
a touchscreen is both and the query has to guess. Whichever device the person actually
used decides. Mouse and keyboard skip the two-step entirely.

Four details, because these are what make a touch control feel wrong. The tap target is
padded to 44px and given the height straight back as negative margin, so it grows while
the heading stays 30px and does not move (measured). `-webkit-tap-highlight-color` is off,
so there is no grey flash. An armed mark disarms on scroll, on a touch anywhere else, and
after four seconds, so no page is left wearing a stray question mark. And only opacity
animates.

### Not doing

- A floating button, an eye, a circle, or anything in a fixed screen position.
- A `?` keyboard shortcut as the primary door. It can be added as a free extra later, but
  the audience skews old and a keystroke is not a placement.
- Long press. His own rejection.
- The bottom of the page. The Feed has no bottom, and nobody looks down for help.

---

## 5. What a chapter is made of

Worked example: `src/app/lab/guide/_content.tsx`, the Catch-ups chapter. The rule it
follows is that the chapter shows the product's own things and writes short lines beside
them.

In that one chapter: a Round card with real bird avatars; the four windows of a Round
drawn to their true lengths, so the eye learns in one glance that answering is the long
stretch and the quiet day is a sliver; the holding state the quiet day really shows; one
real answer with an avatar on it; and a closing line that hands you back with "Start a
Catch-up".

Rules that fall out of that:

- **A diagram earns its place when the fact is a shape.** Three days, then seven, then
  one is a shape. Most facts are not, and a diagram for those is decoration.
- **Reuse the real components** where they will render without a data layer behind them.
  `BirdAvatar` is server-renderable and takes a plain object; use it.
- **End with a way back into the product.** A chapter that just stops is a dead end.
- **No em dashes, and the voice is the app's.** `docs/content/AI-WRITING-TELLS.md` applies
  here exactly as it applies to shipped copy.
- **Every chapter must survive at 640px and at 390px.** Manual line breaks in a heading
  are out; the same markup renders at both.

---

## 6. The five chapters

Each has to answer two different questions, and the second one is the one he cares about.

| Chapter | The mechanics | What the place is for |
|---|---|---|
| Feed | What a post can hold, who sees it, what the rail is | The kind of post this is for, as against a group chat |
| Directory | How to find someone, what a batch filter does, what you control about your own entry | That the entry is a real person's contact details and not a lead list |
| Collection | How to contribute, what happens after you do | The archive standard. Not snapshots from school, things worth keeping |
| Letters | That a letter goes to one person and is private | Why it exists next to a public feed |
| Catch-ups | Written. See the lab room | Written |

Catch-ups is done and is the reference for the other four.

---

## 7. The hoopoe tour is gone

Removed on 2026-08-27, in full. His reason:

> "I don't think I can get the hoopoe to be really great, and I don't think the effort is
> worth it. If people need to reference it later they'd have to go through the door, which
> is a bit weird."

And on the demo, when told it was the only thing introducing that deployment: "nah we can
kill the tour. remove it from demo."

So `src/components/tour/`, `tour-local.ts`, `tour-auto-offer.ts` and the anchors in the
composer, directory, collection and Catch-ups index are all gone, along with `isOwner`,
whose only caller was the admin page's tour button.

**One consequence to keep in view.** The demo now has no opening move at all. Its bar
still starts closed, because the argument for that (an interstitial between a hiring
manager and the work is the worst possible first frame) never depended on the tour. If the
demo turns out to need an introduction again, that default is where to reconsider, not a
new interstitial.

## 8. Scope fences

Out of this build:

- Chapters for `/profile`, `/messages`, `/support`, `/notifications` and the admin rooms.
- Search inside the guide.
- Any per-user state: no "you have read this", no dismissal, no badge.
- Translations.

---

## 9. What is built, and what is not

Shipped 2026-08-27:

- `/guide`, the index, and the sidebar row (the old `/about` row, repointed).
- `/guide/[area]` as real pages.
- The interception, so a press from inside the app opens the chapter over the page.
- `GuideDoor` on the title of all six pages that have a chapter.
- Six chapters: Feed, Directory, Collection, Letters, Catch-ups, Birds.

Verified in a browser rather than claimed: the mark is at opacity 0 at rest and 1 on
hover with the heading's rect unchanged to the pixel; a press opens the overlay with the
address bar at `/guide/birds` and the page still mounted behind it; escape returns to the
page at exactly the scroll position it was left at; a cold load of the same URL renders
the standalone page with no overlay; and on touch the first tap arms the mark without
navigating while the second one opens it.

**Not built.** Four pages still have no chapter: Reach out, Profile, Notifications,
Support. They were left rather than guessed at. Every chapter here describes behaviour
that was read out of the code first, and the reason that matters is Letters: the working
assumption going in was that a letter is private to one person, which is the opposite of
true. A chapter written from a guess is worse than a missing one.

**Also outstanding.**

- `/about` still exists and still says "indefinitely procrastinated". Nothing links to it
  now. Either delete the route or give it something to say.
- The overlay panel is full height, which is what the lab room showed and what was picked.
  On the shortest chapter (Birds) that leaves a lot of empty page below the text. Worth
  looking at before it is called finished.

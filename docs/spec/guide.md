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

**2.4 It replaces the hoopoe tour, probably.** Open question, see section 7.

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

**On a phone there is no signal, and that is the design.** Layer 2 is a shortcut, not the
entrance. Shortcuts are allowed to be invisible; that is what makes them shortcuts. The
phone path is the Guide row in the drawer, which is two taps and entirely conventional.
Putting a permanent mark beside every title to fix this would rebuild exactly the clutter
this whole exercise exists to avoid.

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

## 7. Open: what happens to the hoopoe tour

He is inclined to drop it:

> "I don't think I can get the hoopoe to be really great, and I don't think the effort is
> worth it. If people need to reference it later they'd have to go through the door, which
> is a bit weird."

The guide answers that complaint directly, since a chapter can be re-read any time from
two places. But retiring the tour is not free and the decision is his:

- It is about 977 lines under `src/components/tour/`, plus `TourAnchorSlot` mounts inside
  `catchups/page.tsx`, `collection-client.tsx`, `directory-client.tsx` and
  `create-post-form.tsx`, plus `tour-local.ts`, `tour-auto-offer.ts` and two test files.
- **The public demo uses it.** `(main)/layout.tsx` passes `autoOffer={IS_DEMO}`, so a
  stranger with no stake in the place is offered the walkthrough automatically. That is
  the demo's fastest path to showing someone the four surfaces worth seeing, and the
  guide does not replace it: a guide waits to be opened, a tour offers itself.

So the likely answer is not "delete it" but "keep it on the demo, drop it on the real
site". That is a smaller change than a removal and it keeps the demo's opening move.
Needs his call before anything is deleted.

---

## 8. Scope fences

Out of this build:

- Chapters for `/profile`, `/messages`, `/support`, `/notifications` and the admin rooms.
- Search inside the guide.
- Any per-user state: no "you have read this", no dismissal, no badge.
- Translations.

---

## 9. Build order

1. `/guide/[area]` as plain pages, plus the index, with the Catch-ups chapter lifted from
   the lab room. Reachable by typing the URL. Nothing links to it yet.
2. The remaining four chapters. Content is the long pole, not code.
3. Layer 1: the sidebar row, and the `/about` placeholder's fate. Rebaseline `/about`.
4. Layer 2: `GuideDoor` in `PageHeader`, and the hover reveal.
5. The interception, so it opens over the page. Falls back to step 1 if it fights back.
6. The tour's fate, once he has answered section 7.

Steps 1 and 2 ship value on their own: the chapters exist and are linkable even before
anything opens them.

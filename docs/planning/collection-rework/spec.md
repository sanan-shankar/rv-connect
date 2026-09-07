# The Collection rework — design

**2026-08-27.** One spec, at the owner's choice, covering the archive, the way photographs
are laid out everywhere in the app, the viewer, and the contribution flow.

## How to read this, and how much room you have

**Open [`brief.md`](brief.md) and read all of it before you read any further here.** It is
the owner's spoken brief, transcribed word for word, reversals included. This document is an
answer to it, not a replacement for it, and it is deliberately the shorter of the two. Every
time a session has worked from a summary of that brief instead of the brief, the result has
been worse than if the owner had stayed in the original conversation. He has said so
directly, twice.

[`handover.md`](handover.md) indexes the brief as 55 numbered asks with a status each; §14
below maps every one to a section here. [`prior-art.md`](prior-art.md) is the research the
recommendations lean on — read it before disagreeing with one, because the disagreement may
already be in there.

**Every decision in this document carries one of three marks.** They are the difference
between a spec and a set of orders, and the owner asked for them in these words: *"some
decisions should be left to the implementer. freedom should be given."*

| Mark | Means | What you do |
|---|---|---|
| **LOCKED** | The owner decided it, in conversation, with reasons. | Build it. Do not relitigate. If it turns out to be impossible, say so rather than quietly doing something else. |
| **RECOMMENDED** | My judgment, with reasoning attached. | You may do better. If you do, say what you did instead and why. |
| **OPEN** | Nobody has decided. | It is yours. Use taste and the iteration loop. |

**The sections that are most yours: §6 (what the Collection page looks like), §7.1 (the
buckets themselves) and §8 (the contribute room).** Those are design problems with a shape
sketched, not a solution specified. The owner's instruction on this was *"just be fresh and
creative and create something splendid"*, and a session that builds exactly what is written
below and stops has not done the job. Bring back something better than this document.

**What "good" looks like, so the loop has a target.** Screenshot at 1440 and at 390 with
real photographs, look at the PNG, name the problem in numbers, fix, look again — minimum
two rounds, per CLAUDE.md. `npm run check` green. `npm run visual` before committing any UI.
The specific bar for this work: a stranger who has never used the site should open
`/collection`, immediately want to look at a photograph, and never once see a control that
looks like a file manager.

---

## 1. LOCKED — settled in conversation

Every item here was decided by the owner during the 2026-08-26/27 session, most of them
after looking at `/lab/crop`. Reasons are in `handover.md` F8 to F13. Do not relitigate.

- **Wide photographs run free.** Square or wider: full column width, true shape, never cut,
  never barred. A 21:9 is a thin strip and that is correct.
- **Tall photographs become one shape**, drawn as large as a height ceiling allows, with a
  blurred copy of themselves filling the card either side. That shape is **3:4**, because a
  phone sensor is 4:3 and so a phone held upright produces exactly that.
- **The crop is aimed** at the subject and **clamped**: a tall photo's window travels
  between 15% and 50% down the frame and no further.
- **The photograph caps at 900px wide** however wide the card grows.
- **Feed and catch-ups use that rule. The Collection grid does not** — it uses justified
  rows with no cropping at all. The viewer always shows the true full frame.
- **Several photographs in one post use justified rows**, uncropped, because the row height
  already bounds them and cropping would buy nothing.
- **Trusted contributors auto-approve.** **The archive covers the school's whole visual
  memory**, people included. **"A wander" goes** — *"can you please delete that a wander
  that's not great."*

His own words on the wide half, which is the half that was never in doubt:

> "for very wide images like 21:9, our solution should definitely not add bars above and
> below it. we should just let it be a thin photo. it's only the tall ones that are tricky."

And on the tall half, the constraint that ruled out simply never cropping:

> "definitely don't want some huge ass pictures to keep scrolling past"

**OPEN — the height ceiling.** 560, 700 or 840px. This spec assumes 700. It is one line, it
is a taste call about how long the feed feels, and the owner did not pick. Look at all three
in `/lab/crop` with real photographs before you settle it.

---

## 2. LOCKED that it must be solved, RECOMMENDED how — the root cause

**We do not store the width and height of feed, letter or catch-up images.** `Post.images`
is a JSON array of URL strings; only `Photo` rows carry dimensions. That single gap is why:

- the page jumps as each photo loads (open bug #18), since nothing can reserve space;
- `src/lib/image-cdn.ts` had to be a URL helper rather than a real `<Image>`, as its own
  header comment says;
- justified rows are impossible, because the algorithm needs every aspect ratio up front;
- virtualising a 20,000-image grid is impossible, because a scrollbar needs row heights.

Everything else in this document sits on top of it, so it is phase one.

**Schema.** A new `Image` table, keyed by URL, rather than widening `Post.images`:

```prisma
model Image {
  url       String   @id          // the stored R2 URL, which is already unique
  width     Int
  height    Int
  focalX    Float    @default(0.5) // sharp's attention guess, 0..1
  focalY    Float    @default(0.5)
  greyscale Boolean  @default(false)
  blurhash  String?                // tiny LQIP so nothing pops in
  createdAt DateTime @default(now())
}
```

Keying by URL means **no migration of existing rows and no writes to `Post`, `Catchup` or
anything else** — a caller looks up the URLs it already has. A row missing from `Image` is
not an error; the renderer falls back to today's behaviour for it. That makes the backfill
lazy and non-blocking.

`/api/upload` returns `{ urls, images: Image[] }` instead of `{ urls }`. The existing
`{ urls }` shape is preserved so nothing breaks while callers are moved over.

**Backfill.** A one-off script reads every distinct URL in `Post.images`, `CatchupEntry`
and letters, fetches each object's header from R2, and writes the row. `sharp` gives
dimensions, the `attention` focal point and a greyscale check in one pass.

Touches a write path and the schema, so: `write-path-reviewer`, and a dated file in
`prisma/migrations-manual/` applied with `run-sql.mjs`. Never `prisma db push`.

---

## 3. LOCKED — how a photograph is laid out, everywhere

The rules live in one module, `src/lib/photo-layout.ts`, lifted from
the crop room's policy and justification helpers, where they already exist and are proven. (Both
files were folded into the shipped `src/lib/photo-layout.ts` in phase 3 and no longer exist under
`src/app/lab/crop/`.)
Every surface imports from it. There is no second implementation.

### 3.1 One photograph in a column (feed, catch-ups, letters)

```
r = width / height
photoWidth = min(columnWidth, 900)

r >= 1   → full photoWidth, true shape. Never cut, never barred.
r <  1   → the box is 3:4. The photo is drawn min(700 * 3/4, photoWidth) wide,
           centred, with a blurred, dimmed copy of itself behind it.
           Vertical trim is aimed at focalY, clamped to 15%..50%.
           Horizontal trim is aimed at focalX, clamped to 25%..75%.
```

At a 728px column that is 525 × 700 for every tall photograph, with 102px of blurred bed
each side. A 9:16 keeps 75% of its frame; a phone's own 3:4 keeps all of it. On a phone the
ceiling never binds, so nothing narrows and nothing is filled.

**The catch-up answer card uses this too**, replacing the `aspect-[21/9]` and
`aspect-square` that currently produce a row of shoulders.

### 3.2 Several photographs together (multi-photo posts, the Collection grid)

Justified rows, the Flickr and Google Photos algorithm, already written in `_justified.ts`.
Walk the photographs in order, add each to the current row until the row's natural height
falls to the target, then solve for the height that fills the container exactly. Nothing is
cut, gutters are even, rows line up.

Two guards, because this layout has one failure mode — a 9:16 beside a 21:9 solves to a row
249px high, making the portrait a 140px stamp:

**OPEN — both guard numbers below.** They are starting points, not findings. Tune them
against the fixture set in §12 and trust what you see over what is written here.

- **at most 3 per row**, and
- **a minimum row height of 60% of the target**, below which the row breaks early rather
  than squeezing. Starting numbers, to be tuned against the fixture set in §12: target
  `columnWidth / 2.2` for a post (about two per row) and `columnWidth / 3.2` for the
  Collection grid (three to four).

One number separates the two uses: the **target row height**. Posts use a large target so
they pack about two per row; the Collection grid uses a smaller one and packs three or four.
Same code.

### 3.3 The rule against distortion

Nothing ever stretches. `object-fit` is `cover` against a box of the photo's own shape or
`contain`; no photograph is scaled non-uniformly anywhere. Dimensions are rounded to whole
pixels, because a fractional box lets the container's background show as a hairline down the
edge — invisible on paper, a white outline over a blurred bed.

---

## 4. LOCKED — serving the bytes without a bill

**The constraint.** `/_next/image` is Vercel's metered optimiser. The feed and letters use
it today; the Collection does not. The textbook way to build a justified grid is
`next/image`, and that would route all 20,000 photographs through the meter. **We do not do
that.**

**Instead, derivatives are precomputed into R2 at upload**, as the Collection already does,
and extended to a ladder:

| Variant | Long edge | Used by |
|---|---|---|
| `thumb` | 480px | the grid, at any zoom below full width |
| `grid` | 1080px | a justified row on a wide screen, retina |
| `display` | 1600px | one photo in a feed card, and the viewer |
| `original` | as uploaded | download only, fetched on an explicit press |

Zero egress on R2, one storage cost, no per-request charge, and no per-request latency. The
markup is a plain `<img>` with an explicit `width`/`height` from §2 (so space is reserved
and the page stops jumping) and a `srcset` over the stored ladder.

Because §2 gives us dimensions and §3 gives us the layout, **we know the exact pixel size of
every slot before render**. That is the same knowledge Flickr banked when it moved layout to
the server and measured its first photograph loading seven times faster.

The existing feed and letter call sites move off `/_next/image` onto the same ladder, which
removes the metered dependency from the app entirely.

---

## 5. LOCKED what is wrong, OPEN how to fix it — the viewer

The owner's verdict on the current one was unambiguous, and the caption panel in particular:
*"there is no way to make it disappear except click a very exact small pill... It's like the
worst design ever."*

Everything in the list below is **LOCKED as a complaint** — the owner said each of these,
looking at the real viewer — and **OPEN as a solution.** The bullets describe an outcome; how
you reach it is yours. On the caption panel in particular he was unambiguous, and it is worth
having his actual words rather than my tidy version:

> "You click caption. And then in this extremely low frame rate, you get this bottom bar pop
> up and there is no way to make it disappear except click a very exact small pill to get it
> to go. It's so, so hard to use. It's, it's just so off putting and it's not at all pretty.
> It's like the worst design ever."

And on what he is reaching for:

> "I really wanted the image to go from edge to edge... I know that people have figured a way
> to get it more full screen and more whatever ratio of photo to white space than we do."

Rebuilt, same component, still shared by feed, letters and Collection:

- **Edge to edge.** The photograph is fitted to the viewport with a small uniform inset and
  nothing else competes for the space. A landscape photo touches the left and right edges; a
  portrait touches top and bottom.
- **Chrome floats over the photograph** rather than reserving bands beside it. A top row
  (close, download, overflow) and a bottom row (who, when, love, buckets). Both fade out
  after a moment of stillness and return on any movement. A tap toggles them.
- **The caption is always visible and never a panel.** One or two quiet lines over the
  bottom gradient. Long captions truncate with a "more" that expands in place. **There is no
  fold-up panel and no dismiss pill.** That whole mechanism is deleted.
- **The date is the date the photograph was taken**, not the date it was uploaded, shown at
  the precision the contributor gave: "May 1978", "1978", "the 1970s". Where a photo has no
  date at all, nothing is shown rather than a fake.
- **Love and buckets sit in the bottom row.** They were the only two things the separate
  `/collection/[id]` page had that the viewer did not.
- **`/collection/[id]` stops being a page.** The route stays, so a link still works and the
  photograph still has an address to share; it renders the grid with the viewer already open
  on that photograph. The separate page design is deleted.
- **The counter goes** in the Collection, where "2 of 2" means nothing against a 20,000
  image archive. It stays for a multi-photo post, where it is a real count.
- **Delete, for your own photograph** (§9), behind a confirm.

Two bugs fixed here. **The viewer does not open on the first press** — it is a `dynamic()`
import fetched only on click, so the first one waits on the network; preload it on pointer
enter and focus, as `post-card.tsx` already does. And **a keyboard user can reach every
control**, since the chrome is real buttons.

---

## 6. RECOMMENDED, and the most open section here — what you actually see

The owner's own framing of the problem: folders would be the most organised and *"also that
is the most boring"*, most people visit rarely and *"just want to see some nice pictures"*,
and whatever we build must not look like Google Drive because *"it's not a file manager."*

**Decision: photographs first, always. Organisation is a lens over them, never a gate in
front of them. There is no folder screen at any point.**

`/collection` opens directly onto a full-width river of photographs in justified rows,
newest first. No empty state to click through, no directory to descend.

**The controls sit on the title line**, which is what the owner asked for: the title left,
the five buckets as quiet text through the middle, search as an icon on the right that
expands into a field when pressed. Not a row of dropdown pills, and not a whole row to
itself. Choosing a bucket filters the river **in place**, with an opacity cross-fade and no
navigation.

**Scrolling is browsing.** A "when" control switches the river from *newest* into *time*,
which groups it under sticky decade headers as you scroll. The headers are the foldering,
inline, and they cost no click. A slim scrubber on the right edge shows the decades and can
be dragged to jump — the mechanism Google Photos uses to make a hundred thousand photographs
navigable without a single folder.

**Sorting stays where it is**, minus one. Newest, oldest and most loved remain, as the
owner asked; "A wander" is deleted. The sort lives beside the search icon, not in a pill on
a row of its own.

**The tile shows the person and the year on hover.** Not the caption, not the love count
(owner, verbatim: *"we could just show the person. The person and the year"*).

**Mobile** is the same river at two columns of justified rows, the buckets in a horizontally
scrolling strip, search behind its icon.

---

## 7. The Collection: how it is organised

The owner argued himself both into and out of tags and did not settle it. The settled
answer, from the archive literature in `prior-art.md`: **a small controlled spine for
browsing, free text underneath it for searching, and the machine filling the spine.**

### 7.1 RECOMMENDED — five buckets and an Other

Every photograph carries at least one; several are allowed, since a photograph of the banyan
is both.

**People** · **Birds** · **Nature** · **Campus** · **School life** · **Other**

Five, plus a pressure valve. Small enough to pick from without thinking and to lay across a
title line, and wide enough that nothing has nowhere to go.

**Other exists because the owner asked for it, and it is not a dumping ground — it is a
sensor.** Every archive taxonomy is wrong on the day it ships, and the useful question is
how you find out. So Other is deliberately included, and the admin side gets a view of what
is accumulating in it. If two hundred photographs land in Other with "sports day" in their
captions, that is not a mess, that is the evidence for a sixth bucket, arriving without
anyone having to guess in advance. Review it; promote what earns a bucket; leave the genuine
oddments where they are. **This feedback loop is the point of Other. Build it or the bucket
becomes a hole.** Class photographs and portraits are People. Sports
day, assembly, dining, plays and reunions are School life. Birds get their own, out of
proportion to their number, because the school's identity is a bird sanctuary and it is the
highest-value index the archive will have.

This **replaces** the fourteen-value `SUBJECTS` list in `src/lib/collection.ts`, which was
built on the old "the place, not people" frame and has no bucket a class photograph could go
in. Existing rows are remapped by the pass in §8.3.

### 7.2 LOCKED — no free-text tags, and search reads everything

The owner reasoned his own way to this: *"it is kind of easier for people to just write big
banyan tree than it is to scroll and find the big banyan tree tag."* He is right, and the
existing "Part of school" field proves the failure mode — it is free text feeding a
dropdown, so at 2,000 photographs it becomes a menu of 2,000 near-duplicates.

So: **"Part of school" stops being a filter and becomes part of what search reads.** It is
renamed **Where** and sits beside the caption.

**To answer the question directly: yes, everything written in prose is searchable.** The one
search box reads the caption, the Where line, and the contributor's name, together. Nothing
a person types is thrown away — it stops being a *dropdown* and becomes *searchable text*,
which is the whole trade. Someone who types "big banyan tree" into a caption is findable by
"banyan" without anyone ever having created a banyan tag, which is exactly the argument the
owner made himself:

> "it is kind of easier for people to just write big banyan tree than it is to scroll and
> find the big banyan tree tag. Or create a big banyan tree tag."

The rule that follows from this, and it is absolute: **nothing that is free text is ever
offered as a dropdown.** That is the bug in the current filter and it is the one thing that
must not be rebuilt.

### 7.3 LOCKED — When, unchanged

The existing year → month, or decade-if-unsure control stays exactly as it is. The owner
looked at it during the brief and said *"that's pretty smart, actually."* It is the one part
of the current form that survives untouched.

### 7.4 Black and white, for free — NOT BUILT, and the column has gone

Detected at upload with `sharp` (the `greyscale` column in §2) and offered as a filter. No
one has to tag it, and it was on the owner's own list of buckets. This is the shape of thing
worth automating: a property of the file, not a judgement about it.

**What actually happened.** §2 put the column on `Image`, which is keyed by URL and written
only by the two FEED upload routes; the Collection kept `Photo`, a different table. So the
measurement ran on every feed upload and the filter that wanted it could never read one. The
filter was never built. On 2026-09-07 (refactor audit 2 / D9) the owner said *"stop computing
it; it can be worked out again from the picture"*, and the measurement and the column both
went. **If this is built, the column belongs on `Photo`**, computed in
`contributePhotoDirect`'s encode chain — which is not `toDisplayWebp` (`docs/TRAPS.md`). The
threshold and its reasoning are twenty lines away in git.

### 7.5 Parked

Tagging people by name, and linking them to directory profiles. Real value, real privacy
weight, and it needs the rest of this shipped first.

---

## 8. Contributing

The motivating case, in the owner's words: the school's main photographer *"has taken so
many photos, but I don't feel like I can show it to him yet"* — he cannot upload one at a
time, a hundred photographs would flood the grid, and he cannot be asked to tag each one.

### 8.1 Bulk upload

Today's dialog is `multiple={false}`. One photograph at a time, ever.

Replaced by a **drag-a-folder-in** flow. Files go straight to R2 through the presigned PUT
that already exists in `src/lib/upload-client.ts`, so they never touch a serverless function
or its 4.5MB body cap, and they upload in parallel with per-file progress. Failures are
retried individually and never lose the batch.

### 8.2 OPEN — the contribute room

**This is the most open part of the spec and the owner said so in the plainest terms:**

> "how do we make a really splendid ui for them to do so? isntead of a dialog maybe a more
> expansive thing where they're encouraged to and maybe the what best describes this photo
> and then some big bucket touch targets so they'll want to do it... idk just be fresh and
> creative and create something splendid."

So what follows is a **sketch of intent, not a specification**. Take the intent, ignore the
particulars if you find better ones, and iterate against real photographs on a real screen.

**Not a dialog.** Today it is `contribute-dialog.tsx`, a modal, and a modal is the wrong
container for something you might spend twenty minutes on with two hundred photographs. It
becomes a room of its own with an address: `/collection/add`.

**The intent, in one line:** filing a photograph should feel like *placing* it somewhere,
not like completing a form. Everything below is downstream of that.

Four moments, and what each has to achieve:

**The drop.** The whole page is the target. Nearly empty, warm, one line of invitation.
When photographs land they must not turn into a list of filenames with progress bars —
**they animate into a justified grid, the same grid they will live in**, so the first thing
a contributor sees is their own photographs already looking like the archive. That is the
moment that makes someone want to add more. Transform and opacity only.

**The question.** One field, large, no label, asking in plain words rather than in
form-speak. "What is this?" with a placeholder that gives permission to be vague, because a
half-remembered caption beats an empty one. The caption *is* the description; there is not a
second overlapping field, which resolves the owner's *"caption and description kind of
overlaps."*

**The buckets, as things you want to press.** Not checkboxes and not a dropdown. Six large
tiles, each with its Phosphor duotone glyph and its word, big enough to be a genuine
pleasure to tap on a phone. Pressed, a tile fills with Canopy and stays lit; several can be
lit at once. This is the single most important interaction in the flow, because it is the
one thing we are asking of every contributor and the one thing they can silently refuse to
do. **If pressing these does not feel good, the taxonomy does not get filled in and none of
§7 works.** Spend the time here.

Then When (the existing control, untouched, §7.3) and Where (one optional line, with a
quiet suggestion list drawn from what others have already typed — which nudges people
towards each other's wording without ever becoming a dropdown).

**The batch.** For a large drop the grid *is* the interface. Drag a box across a run of
photographs, or shift-click, and the same questions appear against the selection with an
honest count: "38 photographs selected." One press on **School life** files all 38.
**That press is the difference between your photographer's hundred photographs being a chore
and being a five-minute job**, and it is the thing to get right before anything decorative.

**The finish.** A count in the house voice rather than a toast: "You have added 12
photographs to the valley's memory." The hoopoe belongs here — this is a genuine moment of
gladness and the mascot has an established easter-egg template for exactly that
(`docs/spec/mascot.md`, and it already uncovers its eyes on the login form). One appearance,
never twice, never cringe.

**Before building any of this**, read `docs/spec/DESIGN-SYSTEM.md` and the liftkit spacing
skill, look at `/lab` for rooms that have already explored adjacent ground, and build it in
`/lab` first so the owner can press the buckets before they ship. Registering a lab room is
required in the same change (`src/app/lab/_registry.ts`), and lab rooms have a house voice
of their own: `docs/spec/lab-voice.md`.

### 8.3 RECOMMENDED — the suggestions

> **SUPERSEDED IN SHAPE, 2026-08-28, by the owner. Read `handover.md` D37 before this
> section.** Everything below assumes a paid Claude API call, and he declined one: *"I
> wasn't actually gonna do it through API. I was gonna orchestrate it through my regular
> Claude Max subscription on a session in VS Code. It can access all the photos and that
> should be more than enough."* What shipped is a picker, a skill and an applier
> (`.claude/skills/tag-photos/SKILL.md`) — no key, no billing, nothing in the deployed
> bundle. The classification rules, the vocabulary and the glossary below all still hold
> and are now in `src/lib/photo-suggest.ts`; the transport is what changed. The one thing
> genuinely lost is the LIVE suggestion in the contribute room, which needed the API call.

The owner's own proposal, and the same shape as the directory's professions: *"pass the
descriptions and maybe the images through an LLM... it assigns the tags."*

Each photograph's **480px thumbnail** goes to the Claude API with its filename, any EXIF
date, and anything the contributor has already typed. The model returns a strict structured
object: one or more of the five buckets, a one-line caption, and a decade guess if the
photograph looks old. It is a **closed classification against a fixed vocabulary**, not
open-ended tag invention, which is what makes it reliable.

Implementation notes that matter:

- **Structured outputs** (`output_config.format`) with the five buckets as an enum, so the
  model cannot invent a sixth.
- **Prompt caching** on the instruction and vocabulary prefix, which is identical for every
  photograph and is where most of the input tokens are.
- **The Batch API** for the backfill: asynchronous, half price, and nothing is waiting on it.
- The thumbnail, not the original. A 480px image is roughly 230 tokens; a 4000px one is
  hundreds of times that for no gain on a five-way choice.
- **Suggestions are never silent.** They arrive as prefilled fields the contributor can
  change, marked as suggestions until accepted. A wrong guess costs a click.
- It will know "tree" and "building". It will not know "the banyan" or "Rishi Konda" unless
  those words are in the prompt, so they are — with a short glossary of the place.

**Cost, for the whole 20,000-image backfill.** About 280 input tokens and 60 output tokens
per photograph, through the Batch API at half price:

| Model | Model id | Backfill cost |
|---|---|---|
| Claude Opus 5 | `claude-opus-5` | about **$29** |
| Claude Haiku 4.5 | `claude-haiku-4-5` | about **$6** |

Those are estimates from published per-token rates and the standard image-token
approximation (roughly width × height ÷ 750), not measured — worth confirming on a hundred
photographs before running twenty thousand. Either way it is a one-off cost in the tens of
dollars, and afterwards it is a few hundredths of a cent per upload. **Recommend Opus 5**:
the difference is under $25 once, and the whole point is that the suggestions are good
enough to accept without checking.

### 8.4 The fields, for the record

Caption ("what is this?"), **Where** (free text, searched not filtered), **When**
(unchanged), **buckets** (six, prefilled from §8.3). That is the whole set. Anything you are
tempted to add, check against §7.2 first: if it is free text, it must not become a filter.

---

## 9. LOCKED — control, and moderation

**A member can delete their own photograph.** Today nobody can: both removal paths in
`collection/actions.ts` are gated on `role === "admin"`, so the Collection is the only place
in the product where you can publish something and then cannot unpublish it. The fix is a
delete on the photograph's own controls, in the viewer and on the tile, reusing
`declinePhoto`'s existing purge machinery — which is already correct, deleting the row and
booking the bytes atomically per audit M17 — behind an **uploader-or-admin** check instead of
an admin-only one.

This matters more, not less, now that trusted contributors publish instantly: with no queue
in front of them, a delete is the *only* correction available.

**A member can EDIT their own photograph, and an admin can edit anybody's** (shipped
2026-08-30). The owner: "instead of delete photo button, have an edit icon. there let it
pull up a dialog similar to the contribute where they can retag, recaption, and add year all
that stuff. give me ability to do that for everyone's photo regardless of my uploading them
or not." So the viewer's trash can became a pencil, and the delete moved inside the dialog
it opens -- an irreversible act had been sitting one pixel from Download.

Three consequences worth writing down:

- **The dialog asks the contribute room's questions, out of the contribute room's own
  component** (`components/collection/photo-questions.tsx`). A seventh bucket or a reworded
  hint reaches both rooms or neither. What it does NOT ask for is `area`: the form stopped
  offering it in the 2026-08-28 rework, and a form that no longer asks a question must not
  answer it with a blank, so an old row keeps whatever it was given.
- **`typedDate` is the exact inverse of `photoDate`** (`lib/collection.ts`, pinned by
  `collection-date.test.mjs`). The date box holds three digits for a decade and four for a
  year, so seeding it from a stored row is a real conversion, and getting it wrong would
  re-file a photograph nobody edited. Every era the archive offers survives the round trip;
  the legacy `pre-1960s`, which no row has ever held, does not, and the test says so.
- **Editing is filing, not moderation.** `editPhoto` is gated uploader-or-admin, the same
  gate as the delete, and an admin editing somebody else's photograph raises no note and no
  notification -- it is the same act the hand-run tagging pass already performs on members'
  rows. Taking something DOWN still goes through the warm note. Nothing about `approved`,
  `isHidden`, `scope` or the stored bytes moves, so an edit cannot publish a queued
  photograph or push an approved one back into the queue.

**Trusted contributors auto-approve.** `User.photoTrusted` already exists and is already
honoured by `isPhotoAutoApproved`; there is simply no way to set it. An admin gets a control
on a member's profile, and the admin queue gets select-all and approve-page so a batch is
minutes rather than hours.

**The uploader can move the crop.** Not optional. §1 aims the crop automatically, and the
only reason that is defensible is that the person who took the photograph can override it —
which is precisely what X shipped after withdrawing their own saliency crop. A small drag
handle on the preview at upload, storing `focalX`/`focalY` on the `Image` row.

---

## 10. Twenty thousand photographs

- **Justified rows** need every aspect ratio, which §2 provides.
- **Windowed rendering**: only visible rows exist in the DOM. Row heights are computable in
  advance from stored dimensions, so the scrollbar is honest and the scrubber can jump
  anywhere without loading what it skips.
- **Keyset pagination, not offset.** `loadPhotos` uses `skip: page * PAGE_SIZE`, which makes
  the database count past every row it discards; at page 400 that is 9,600 rows scanned to
  return 24. A cursor on `(createdAt, id)` is flat at any depth. It also fixes a correctness
  bug the code already documents at `actions.ts:521`: because each offset page re-runs the
  whole sort and slices it, a sort that leaves rows tied can repeat some rows across pages
  and skip others entirely. A keyset cursor cannot do that.
- **Batched loading**, as the owner noticed on his reference gallery, which held 35 of 300
  images in the DOM.
- **Indexes** for the real queries: bucket, decade, greyscale, uploader.
- **Search** over caption and where. Postgres full-text with a GIN index; `ILIKE` will not
  hold at this size.

---

## 11. Bugs folded in

- **A new photograph does not appear until the page is reloaded.** The contribute flow does
  not revalidate or insert optimistically.
- **The viewer does not open on the first press** (§5).
- **The viewer shows the upload date, not the date taken** (§5).
- **Catch-up photographs cannot be clicked** to open the viewer. Every image in the app
  becomes clickable, which was an explicit ask.
- **Feed photographs have no reserved space** and the page jumps as each lands — bug #18,
  fixed by §2, which is the rework it was waiting for.
- **A catch-up caption shows its formatting markers** on the photo wall — bug #19,
  `question-section.tsx` prints raw where `answer-card.tsx` renders.

---

## 12. Testing

The owner asked for this specifically and it is not optional: *"I need really thorough
testing for this... all kinds of aspect ratios... and then all kinds of combinations of
aspect ratios in the same post."*

- **Unit tests on `photo-layout.ts`**, which is pure: every rule against a matrix of ratios
  from 9:16 to 21:9 including 1:1, at all three column widths. Assert no card exceeds the
  ceiling, no photo is ever distorted, and justified rows always sum to the container width
  within a pixel.
- **A fixture set of real photographs** at those ratios, plus a deliberately low-resolution
  one, committed once and reused.
- **Visual regression** on feed, catchups and collection with a seeded post holding every
  ratio combination from one photograph to six.
- Then the two-round screenshot protocol at 1440 and 390, as always.

---

## 13. RECOMMENDED — phases

Each ships on its own and leaves the app working.

1. **Dimensions.** The `Image` table, the upload return, the backfill script. Nothing
   visible changes. Unblocks everything.
2. **The layout module and the single-photo rule.** Feed, catch-ups and letters. The
   chopped faces stop here, and so does the page jumping.
3. **Justified rows.** Multi-photo posts and the Collection grid.
4. **The viewer.** Edge to edge, the caption fixed, `/collection/[id]` folded in, self-delete.
5. **The Collection page.** The river, the buckets, the title-line controls, search, the
   scrubber, keyset pagination, windowing.
6. **Contributing.** Bulk upload, batch review, the suggestion pass, the crop handle,
   trusted-contributor controls.

Phases 1 and 2 are the urgent ones: they are the bugs the owner is actually looking at.

---

## 14. Every ask in the brief, and where it is answered

| # | Ask | Section |
|---|---|---|
| 1 | Scale to 20,000 | §10 |
| 2 | Am I being billed for images | §4 — no, and this keeps it that way |
| 3 | Categorisation, filtering, easy navigation | §6, §7 |
| 4 | Year not the primary axis | §6 — newest by default, time is a lens |
| 5 | Which buckets | §7.1 |
| 6 | Do we need tags at all | §7.2 — no free tags, five buckets, search |
| 7 | Easy upload-and-tag workflow | §8 |
| 8 | A description box people will not fill | §8.3 — the machine drafts it |
| 9 | 70–80% arrive in bulk | §8.1 |
| 10 | Bulk upload | §8.1 |
| 11 | Current filtering is trash | §6, §7.2 |
| 12 | A year on photos is good | §7.3 |
| 13 | Caption and description overlap; rename part of school | §7.2, §8.4 |
| 14 | Keep the when control | §7.3 — untouched |
| 15 | Upload needs a reload to appear | §11 |
| 16 | Hover should show person and year | §6 |
| 17 | Viewer does not open first press | §5, §11 |
| 18 | Viewer edge to edge | §5 |
| 19 | The caption panel is the worst design ever | §5 — deleted |
| 20 | The "2 of 2" counter | §5 |
| 21 | Show the date taken, not uploaded | §5, §11 |
| 22 | Do we need `/collection/[id]` | §5 — route stays, page goes |
| 23 | Learn from big archives | `prior-art.md` |
| 24 | The photographer cannot be invited yet | §8 |
| 25 | LLM-assisted tagging | §8.3 |
| 26 | Tag pills not pretty | §6 — buckets are text on the title line |
| 27 | Prettier caption in the viewer | §5 |
| 28 | Serve viewer, photographer, uploader | §6, §8 |
| 29 | The search bar eats a whole row | §6 |
| 30 | Part of school will reach 2,000 values | §7.2 |
| 31 | Keep newest / oldest / most loved | §6 |
| 32 | Do not reuse the pill-dropdown just because | §6 |
| 33 | Stretched on widescreen, grainy at low resolution | §3.1 (900px cap), §4 (ladder) |
| 34 | Cropping removes what matters | §3.1 |
| 35 | Catch-up faces cropped out | §3.1 |
| 36 | Catch-up photos not clickable | §11 |
| 37 | Multi-image layout logic | §3.2 |
| 38 | Avoid black bars, crop correctly | §3.1 — no bars anywhere |
| 39 | Rules for how wide the feed may be | §3.1 — the 900px cap |
| 40 | Thorough testing across every ratio | §12 |
| 41 | Every image clickable | §11 |
| 42 | Folders are organised but boring | §6 — no folder screen |
| 43 | Casual visitors want nice pictures | §6 |
| 44 | Pictures on the landing page | §6 |
| 45 | Beautiful foldering and transitions | §6 |
| 46 | Letters wastes space | **§16 — not covered here** |
| 47 | Not a file manager | §6 |
| 48 | Which buckets to keep | §7.1 |
| 49 | Lazy loading in batches | §10 |
| 50 | Justified grid, no crops, even gutters | §3.2 |
| 51 | The reference viewer is simple | §5 |
| 52 | Free to rename Collection | **§16 — recommend keeping the name** |
| 53 | Consider all options, do not ship the first idea | The whole campaign |
| 54 | No way to delete your own photo | §9 |
| 55 | The white outline over a blurred bed | §3.3 — fixed |
| 56 | Can search still read the descriptions | §7.2 — yes, caption, Where and contributor together |
| 57 | A splendid contribute UI, not a dialog, big bucket targets | §8.2 |
| 58 | Include an Other bucket | §7.1 — and it feeds back into the taxonomy |

---

## 15. Operational context

**Operating rules are `CLAUDE.md` and `AGENTS.md`; stack traps are `docs/TRAPS.md`.** Read them
there and nowhere else. This section used to restate eight of them in full — the repo path, the
shared checkout, `npm run check`, a push is a deploy, one Supabase database, never `prisma db push`,
never a Vercel CLI command, Jerry Maguire, and chrome-devtools-finds-Playwright-remembers — and the
copy had already drifted from the source on two runtimes. Two more copies of the same eight lived in
two more campaign documents, which is three places for one rule to rot.

What is specific to this campaign, and only here:

- **`/lab/collection` renders the real Collection page against 240 made-up photographs**
  (`src/app/lab/collection/_archive.ts`). That is where to build and verify. `/lab` requires an
  admin session.
- **The live archive is not a test fixture.** One Supabase database serves production and local
  dev, so anything filed into the Collection is live to real members.
- **After editing `src/app/globals.css`, Turbopack can serve a stale stylesheet indefinitely.** A
  hard reload and `touch` both fail; `mv .next .next-stale` and restart. Verify CSS by measuring
  computed styles, never by looking at a screenshot — a screenshot of a stale rule looks perfectly
  plausible.

---

## 16. What this does not cover, and why

**Letters wasting space (#46).** The owner is right that one narrow column holding three
posts with heavy whitespace is a poor use of the screen. It is a real problem and it is not
a Collection problem — fixing it means rethinking the letters reading surface, which has its
own spec and its own measure-for-a-serif constraints. Logged for its own session rather than
smuggled in here.

**Renaming the Collection (#52).** The owner granted full licence. **Recommend keeping "The
Valley Collection".** The name is not what was wrong with it; every complaint in the brief is
about behaviour. A rename costs the route, the sidebar, the specs, the visual baselines and
the owner's own mental model, and buys nothing this spec does not already buy. Easy to
revisit once the thing works.

**Tagging people by name (§7.5).** Parked, with reasons.

**The height ceiling.** 700px assumed, one line to change.

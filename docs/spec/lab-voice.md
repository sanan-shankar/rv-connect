# How a lab room should read

Every room under `/lab` follows this. It is the answer to a specific complaint
(owner, 2026-08-04):

> The delight section was all about delight. It was all about making things look
> really pretty. But now lab is just work for me to read. I keep squinting. It
> has lost that whole nice feeling. I get that the intention is now a bit more
> serious, but I just wish it could be a bit more fun to read.

And, on `/lab/everything` specifically:

> I can't even address them because most of the time I have no idea what it's
> talking about. There's like a billion punctuations and it's just so hard for me
> to actually understand what's going on.

So the bar is not "is this rigorous". The rooms were already rigorous. The bar is
**can the owner read it once, at speed, and know what to do.**

---

## The reader

One person. He knows the product better than you do, he has not read the file you
are quoting, and he is looking at this on a phone as often as a laptop. He does
not need convincing that the thing matters. He needs to know what is wrong and
what you would do instead.

He is also the person who asked for this room. Make it worth opening.

## The six rules

**1. Lead with the thing, not the analysis.**
The first sentence of any finding says what a person sees. The reasoning comes
after, if it is needed at all.

**2. One idea per sentence.**
If a sentence has a colon, a semicolon and two commas, it is three sentences
wearing a coat. Split it.

**3. No numbered sub-clauses inside a paragraph.**
`(1) ... (2) ... (3) ...` is a list. Either write it as a list or cut it to the
one point that matters. Usually the third one was the real finding and the first
two were throat-clearing.

**4. A number has to be doing work.**
"The band is 440x80 = 35,200px², about 97% empty gradient" earns its place: the
emptiness IS the finding. "The gap is 13px where a golden step would be 16px"
does not, unless someone is about to change that gap. Do not open a room with a
scoreboard because the last room had one.

**5. Plain words.**
Not "the component surfaces a semantic affordance". It shows a button. A short
list of things that keep appearing and should not: *surface* as a verb,
*affordance*, *register*, *semantics*, *hierarchy*, *cognitive load*,
*deliberately*, *precisely*, *notably*, *arguably*. Also see
`docs/content/AI-WRITING-TELLS.md`, which applies to lab rooms exactly as it
applies to shipped copy. No em dashes.

**6. It should be nice to look at.**
A room is a place you went to the trouble of building. Show the actual thing,
side by side, at the size it really renders. A live specimen beats a paragraph
describing a specimen. If a room is nothing but text, it probably wanted to be a
markdown file in `docs/`.

## The stats block is opt-in

`<Tell stats={...}>` exists because the craft room genuinely had a scoreboard:
568 call sites failing AA is the whole argument. Three rooms later, every room
opened with three big numerals whether or not it had anything to count, because
the previous room did.

Only pass `stats` when the numbers are the finding. A room about how a picker
feels has no scoreboard. That is fine. `<Tell>` without `stats` is one clean
column of prose and it looks better than a padded one.

## Before and after

Real text from `src/app/lab/everything/_findings.ts`, rewritten.

> **Before.** Three problems stacked. (1) The units are inconsistent inside one
> 16px line: member count is a bare integer next to an icon, post count carries
> the word "posts". (2) `0 posts` renders in exactly the same weight, colour and
> position as `312 posts`, so the most common value in a young community is
> presented as a neutral fact rather than a state that should change the card.

> **After.** The card shows three numbers that never move, and hides the one that
> does. A group with a Round open right now looks exactly like one nobody has
> opened in a year.

> **Before.** A bottom-up black scrim exists for exactly one reason: to keep white
> text legible over an unpredictable photo. There is no text in this band and, for
> every group in the database, no photo either. So the scrim's only measurable
> effect is to mute the brand gradient by 20% black at its base.

> **After.** There is a black fade over the cover band. A fade like that is for
> keeping white text readable on a photo. There is no text here, and no photo
> either. All it does is dull the brand colours underneath.

Shorter, and it lost nothing.

## Naming a room

Name it after what you found, not after the area you looked at. "Six different
left edges" beats "Layout audit". "The ask that argues against itself" beats
"Support page review". Those two names are the best thing about those two rooms;
keep doing that.

## The checklist before you register a room

- Read it aloud. If you run out of breath, the sentence is too long.
- Would the owner know what to do after one pass? If not, cut until he would.
- Is there anything to look at, or is it only prose?
- Does the stats block have real numbers behind it, or is it there out of habit?
- Any em dashes? Any of the words in rule 5?
- Registered in `src/app/lab/_registry.ts`, and does `node scripts/qa/lab-audit.mjs`
  still pass?

# Birds expansion, LIVING HANDOVER

## Start here

**@ this file and invoke `/campaign`.** The skill is the protocol for running this unattended:
every question the owner must answer is collected once, up front, then the units below are
worked one after another, each by one worker at the model the table names, each verified by the
runner itself. This file outranks the skill wherever they disagree. The owner, 2026-10-08, on
how it runs: *"I ain't running multiple sessions for this so you can use the orchestrate or
whatever skill we developed to tackle this."* Then, in this order:

1. **Read [`brief.md`](brief.md) in full.** It is the owner's spoken brief with the fillers
   removed and nothing else touched, 40 numbered paragraphs. Every `¶n` in this file points
   into it. The speech-to-text mangled the bird names; the readings sit beside them in square
   brackets. Do not work from this file's summary of it; the summary is an index.
2. **Read [`selection.md`](selection.md)**: the colour census of the fifty, the twelve birds
   to add and why each one, the reserve, and everything rejected with its reason.
3. **Read [`reviewer.md`](reviewer.md)**: the loop every drawing goes through and the ten-line
   checklist. Every reviewing agent reads it from disk.
4. **Find your unit** on the status board below and read its section under "The units".
5. **Before the session ends, edit this file**: the board, the ledger, the session log.

`.claude/skills/writing-for-agents/SKILL.md` governs how this file and every worker brief is
written: the owner's paragraphs travel verbatim into a worker's prompt, never paraphrased.

**Three campaign-wide rules.** One drawing hand per unit, in sequence, never a fan-out of
drawers on one brief (design is not a fan-out; N workers on one brief converge on ornament).
Every bird goes through the reviewer loop, and a bird that fails three reviews is parked, not
shipped (¶40: *"we're not shipping anything off big"*). Replacing a bird the owner did not
flag is his call alone (¶39), and the Hoopoe and the Indian Roller are never dealt to anyone.

---

## Status board (update every unit)

| Item | Status | Notes |
|---|---|---|
| Brief captured in his words | DONE | `brief.md`, 2026-10-08, 40 paragraphs; names read from the gallery order and bracketed |
| Selection written | DONE | `selection.md`: census, twelve to build, six in reserve, rejects with reasons |
| Reviewer protocol written | DONE | `reviewer.md`: the loop, the checklist, the answer format |
| U1 Tooling | DONE | `scripts/dev/bird-sheet.mjs` (renders), `scripts/dev/bird-edges.mjs` (58 straight edges found across the 51); both in `scripts/README.md` |
| Owner questions 1 to 11 | OWNER-GATED | written 2026-10-08, printed in the session; one reply restarts the run |
| U2a Cut-offs and bills | OPEN | Hornbill 10, Drongo 17, Coucal 18, Pond Heron 27, Cormorant 28, Cattle Egret 30, Flameback 41, Shrike 42, plus the edge sweep over all 51 |
| U2b Structure and colour | OPEN | Magpie-Robin 14, Lapwing 24, Golden Oriole 29, Blue-faced Malkoha 34, Common Kingfisher 38, Leafbird 39, Minivet 47 (Q10), Green-Pigeon 48 (Q3) |
| U3a Hard redraws | OPEN | Paradise Flycatcher 26 as the white male, Peregrine 32, Jacobin 35, Black Eagle 36; two attempts each for 26 and 32 |
| U3b Redraws | OPEN | R-W Bulbul 13, Indian Robin 15 (Q9), Brahminy Starling 23, Orange-headed Thrush 33, Tickell's 44 (Q4) |
| U4a New birds 1 to 4 | OPEN | Grey Junglefowl, Spot-billed Duck, Grey-headed Swamphen, Black-winged Kite |
| U4b New birds 5 to 8 | OPEN | Indian Eagle-Owl, Common Tailorbird, Common Kestrel, Black-crowned Night Heron |
| U4c New birds 9 to 12 | OPEN | Pied Kingfisher (Q5), Wire-tailed Swallow, Grey Wagtail, Rock Pigeon |
| U4d The reserve | OPEN | only if every bird of U4a to U4c passed and the answer to Q1 allows it |
| U5 The dealing rule | OPEN | `src/lib/avatar-deal.ts`, signup wiring, tests, `write-path-reviewer`; may run beside U2a (disjoint paths, no browser) |
| U6 Close-out | OPEN | centroid for every changed bird, contact photos, the "fifty" copy, visual baselines, `docs/spec/avatars.md`, history |
| Gate 2, the owner looks | OPEN | the whole point of the run on a design campaign |

---

## The ledger: every ask in the brief

Status words: DONE, OPEN, OWNER-GATED, DECLINED, PARKED (with the last review). The bird index
is its position in `SPECIES_FULL_NAMES` (`src/components/common/bird-avatar-v2.tsx`), which is
the order of `/birds`.

### The campaign-wide asks

| ID | ¶ | Ask, in his words | What it means here | Status |
|---|---|---|---|---|
| A1 | 1, 2, 3 | "expand our catalog of 50 birds into more" from the PDF; "somewhat colorful, separate from the background... thorough sense of color science"; "obviously different from each other and different to the ones that are already there" | `selection.md` | DONE (selection), OPEN (build) |
| A2 | 4 | "when you build it, it's just one criteria, cuteness" | reviewer line 7 | applies to every unit |
| A3 | 39 | "if there's one [species] that you wanted to remove slash replace... Just run it by me. Obviously, don't replace any of the ones I like" | questions 2, 3, 4, 6 | OWNER-GATED |
| A4 | 19, 40 | "an independent reviewing agent... some kind of a loop"; "Make sure you have an independent reviewer. Make sure you review everything" | `reviewer.md`, U1 | DONE (protocol), applies to every unit |
| A5 | 39, 40 | "I'm not giving you... you have to add these many... Just keep the quality really high"; "we're not shipping anything off big" | twelve, then a reserve; three strikes parks a bird | LOCKED |
| A6 | 10, 11 | "not a sign for you to make only circular ones because some of the more unique ones like the hornbill, like the lapwing [the Pond Heron and the Cormorant]... the Brahminy Kite... I really love it... It is harder to make those look cute" | a broken silhouette is welcome when it is the bird's own; it just has to be cute | LOCKED |
| A7 | 14 | "we have to balance cuteness with the trueness to the bird... the Coucal and the Koel... red eyes... that is how they are. So you might have to keep that" | the red eyes stay | LOCKED |

### The fixes, bird by bird

| ID | Bird (index) | ¶ | His words | Action | Unit | Status |
|---|---|---|---|---|---|---|
| F1 | Red-whiskered Bulbul (13) | 7 | "looks a bit almost angry and it's very sharp... a mess... particularly the thing on top" | redraw: soft tall crest, round body, calm face, the red cheek spot and vent kept | U3b | OPEN |
| F2 | Oriental Magpie-Robin (14) | 8, 12, 23 | "the white shapes in the middle feel a bit arbitrary"; "even the shape slightly"; "a bit long" | rework the white panels into the bird's real belly and wing bar; shorten the body | U2b | OPEN |
| F3 | Indian Robin (15) | 8, 36 | "okay" then "looks like a bird trying to wave... I feel bad for everyone who gets that bird" | redraw (Q9): the cocked tail as a tail, not an arm; same family as the Magpie-Robin | U3b | OPEN |
| F4 | Black Drongo (17) | 9 | "the fork is good. If we could make the fork a bit nicer, now it's like very rough" | smooth the fork's notch and lobes | U2a | OPEN |
| F5 | Greater Coucal (18) | 9 | "even with [the Coucal], there's a very rough straight line... the image has just been cut off" | the chestnut wing's edge curves | U2a | OPEN |
| F6 | Tickell's Blue Flycatcher (44) | 12, 23, 30 | "a bit weird"; "a bit long"; "I don't like it... looks just weird" | redraw (Q4) | U3b | OPEN |
| F7 | Orange-headed Thrush (33) | 12, 23 | "a bit weird... straying a bit far"; "the shape is a bit long... just not working for me" | redraw, rounder | U3b | OPEN |
| F8 | Common Kingfisher (38) | 12 | "looks fine. Though that's also kind of dull" | brighten the cyan and the orange; nothing structural | U2b | OPEN |
| F9 | Small Minivet (47) | 12, 23 | "okay. It's not not great"; "a little bit [long]... it's still okay" | shorten a little (Q10) | U2b | OPEN |
| F10 | Bay-backed Shrike (42) | 13, 34 | "looks okay... the beak is a bit too crooked and pointy"; later "is good" | soften the hook | U2a | OPEN |
| F11 | Peregrine Falcon (32) | 13, 22 | "crooked and pointy"; "overengineered... derpy... pot belly... overthought... 70 different elements... I've gone through maybe four or five versions" | redraw from nothing: strength and cuteness, under twelve shapes; two attempts, keep the better | U3a | OPEN |
| F12 | Brahminy Starling (23) | 15 | "I don't like at all... the color... that super thin black line... I don't like anything about it... should be redone" | redraw from nothing | U3b | OPEN |
| F13 | Asian Paradise Flycatcher (26) | 16 | "one of the most iconic birds in our school... insanely long tail, is white, magnificent... the females look like what you've done, but I think we should pick the male... doing justice to it" | redraw as the white male: black crested head, white body, the long white ribbon tail; two attempts | U3a | OPEN |
| F14 | Indian Pond Heron (27) | 17 | "very cute... we could add color... kind of bland. The shape is good... the beak has this weirdly, very sharply cut off thing" | keep the shape; colour the crown and the bill; round the bill tip | U2a | OPEN |
| F15 | Little Cormorant (28) | 18, 34 | "there in the middle... if it could be rounded just a bit"; "a black bird you've taken and done something really nice" | round the straight edge; change nothing else | U2a | OPEN |
| F16 | Indian Grey Hornbill (10) | 8, 18 | "looks good"; "the beak... looks like the image has been interrupted and cut up" | round the casque and the bill's ends | U2a | OPEN |
| F17 | every bird | 17, 18, 19 | "we still have a lot of these very odd arbitrary sharp cutoffs"; "I've asked you to do this multiple times" | the edge audit over all 51; every edge answered or redrawn | U2a | OPEN |
| F18 | Indian Golden Oriole (29) | 20 | "the eye, and then there's this line going through the eye, and then that intersects the beak... looks almost like it's wearing sunglasses" | the eye-stripe stops short of the bill and sits behind the eye; keep the colours | U2b | OPEN |
| F19 | Cattle Egret (30) | 21 | "is good, against some sharp stuff" | soften the buff crown's points; nothing else | U2a | OPEN |
| F20 | Blue-faced Malkoha (34) | 24 | "the background color is... all of the green, and then inside, we have a dark and [olive] green. I'm not so sure about the color science" | one body green, the wing a clear step darker or a different warmth; the blue face bigger | U2b | OPEN |
| F21 | Jacobin Cuckoo (35) | 25 | "a lot of randomly harsh and weird cut off shapes... another black and white bird... think of the white as... white space... should be redone again" | redraw: the white belly bounded by black, a soft crest, the wing flash as one shape | U3a | OPEN |
| F22 | Black Eagle (36) | 26 | "that eyebrow... a random brown spot on top of the beak... a black line over the eye, but you can't really see that... too many elements" | redraw simpler: one body, one lit region, yellow cere and eye, no scallops | U3a | OPEN |
| F23 | Jerdon's Leafbird (39) | 27 | "such lovely colors. It's hard to make sense of what is the eye, beak, face... the structure could be made a bit clearer" | keep every colour; make the black bib, the eye and the bill read as a face | U2b | OPEN |
| F24 | Black-rumped Flameback (41) | 28 | "honestly fine... but the beak is a bit [great: unclear]" | round the chisel's ends; nothing else | U2a | OPEN |
| F25 | Orange-breasted Green-Pigeon (48) | 31 | "the colors are a bit very random... light purple near the eyes in two different parts... overlapping shapes... cutting off" | redo the bands as bounded shapes on the breast only; the crown one grey; or swap (Q3) | U2b | OPEN |
| F26 | Yellow-wattled Lapwing (24) | 35 | "the leg could be put in different places. It looks a bit off right now" (bird unnamed; Q11) | move the legs under the body's centre of mass; check the Shrike's and Thrush's leg stubs | U2b | OPEN |
| F27 | Yellow-throated Bulbul (12) | 33 | "The eye is not in that, like, white circle that you've slowly built up to. I don't know if that's intentional" | nothing unless the reviewer finds the eye lost in the glow | U2b | OPEN |
| F28 | the ones he likes | 6, 8, 11, 15, 21, 29, 30, 32, 33, 34 | Hoopoe, Peafowl, Owlet, Dove, Hornbill (shape), Kite, Treepie, Weaver, Lapwing, Egret, Verditer, Purple-rumped Sunbird, C-h Bee-eater, Munia, White-eye, Purple Sunbird, Y-T Bulbul, Cormorant, Shrike, Green Bee-eater, Barbet, Koel, Sirkeer Malkoha | untouched beyond the edge audit | all | LOCKED |

### The dealing rule

| ID | ¶ | His words | Status |
|---|---|---|---|
| G1 | 37 | "assign birds that somewhat make all the birds equal... take into account the people who have paid to override their birds... assign the common kingfisher less. Maybe not zero, but less" | OPEN, U5 |
| G2 | 38 | "I don't want to change the code at any future point. I want it to be adaptable... assign people the new birds. And then when the new birds kinda level up, then it goes more random" | OPEN, U5 |

---

## Decisions

### LOCKED (the owner decided; reasons in the brief)

- Every row in the ledger marked with his words. The fixes are his list; cuteness is the build
  criterion (¶4); the Paradise Flycatcher becomes the male (¶16); the Peregrine is simple (¶22).
- An independent reviewer judges every bird (¶19, ¶40); `reviewer.md` is that reviewer.
- Replacing a bird he did not flag is his call (¶39); the questions below carry each one.
- Quality over count (¶39, ¶40); a bird that fails three reviews is parked.
- The Koel's and the Coucal's red eyes stay (¶14).
- Prior, still standing: the Hoopoe is the mascot and never a member's; the Indian Roller is
  the owner's alone (`src/lib/avatar.ts`); `BIRD_SPECIES_COUNT` is never raised, because it is
  the modulo every existing member hashes through; no `prisma db push`, ever.

### RECOMMENDED (the set-up session's judgment; a later session may do better and must say so)

- **The twelve and the reserve** in `selection.md`, in that order.
- **New species are appended at indices 51 and up**, past the Roller at 50. `hash % 50` can
  never reach them, so no existing member wakes up as a new bird; they are reached only by the
  dealing rule or a paid pick. (The alternative, taking slots inside 0..49, would re-dress
  whoever hashes there, which is the thing ¶38 is careful not to do.) `DRAWN_SPECIES_COUNT`
  in `avatar.ts` must then equal `ARCHES.length`, pinned by a test that counts the entries.
- **The dealt bird is stored in `User.birdOverride`.** No schema change: the column already
  means "the bird this member wears, by slug", sits above the hash in precedence (photo >
  override > pin > hash), does not spend a supporter's pick (`birdPickedAt` is what spends
  one), and the session already carries it. A dedicated `birdSpecies` column was considered and
  not taken: it needs DDL on the one shared database and a backfill, for a distinction (dealt
  versus chosen) the frequency rule does not need.
- **The weights.** A wearable species with `n` visible wearers gets weight `1 / (n + 1)^2`. A
  bird nobody wears is about a hundred times likelier than one worn by nine; two birds worn by
  nine and ten are nearly even. That is ¶38 in one formula: the new birds go first, and once
  they level it is close to random. Never zero (¶37). The Hoopoe and the Roller are never in the
  draw. Considered and not taken: `1/(n+1)` (too gentle: a new bird is only ten times likelier,
  so levelling takes hundreds of signups) and "always the least-worn" (zero chance for every
  other bird, which ¶37 forbids, and a deterministic queue that looks like a bug).
- **Who counts as wearing a bird**: members with no photograph, since a photograph hides the
  bird (question 8).
- **Where it runs**: in `signup` right after `prisma.user.create`, as a best-effort step like
  the batch-group join below it: a failure is reported, the member keeps the hash bird, and
  signup succeeds. Pure and tested: `dealBird(counts, random)` in `src/lib/avatar-deal.ts`.
- **Two attempts** in separate worktrees for the Paradise Flycatcher and the Peregrine (the two
  he cares about most and has been disappointed by most); one attempt for everything else.
- **A `--only` flag on `scripts/dev/centroid.mjs`** so re-centring a changed bird does not
  re-measure, and nudge by a pixel, the fifty that did not change.
- **Copy says the live count**: the guide chapter and the Support page's "See all 50" read the
  length of `GALLERY_SPECIES` rather than the word "fifty".

### OPEN (nobody has decided; the drawer's loop decides)

- Every drawing. The ledger says what is wrong and what must survive; the drawer finds the
  shapes.
- Whether the Minivet changes at all (Q10), what the Y-T Bulbul remark (F27) was about.
- Which of the twelve, if any, the owner wants on the Support plate (Q7).

---

## The units

Every drawing unit is one worker at **Fable, max effort** (the skill: Fable for highly creative
work), reviewed bird by bird by a separate **Opus** agent that reads `reviewer.md`. U5 is **Opus**
with a `write-path-reviewer` pass. The runner verifies each unit by reading the unit's 220px
sheet, running `npm run check`, and spot-checking one bird at 600px.

### How to work a drawing unit

1. Read `brief.md`, this file's ledger rows for your birds, `reviewer.md`, and the file header
   of `bird-avatar-v2.tsx` (the house idiom: viewBox 0..100, mass inside r~45, big soft rounded
   shapes, no thin spikes, real colours, one bold signature, `Eye`, `beak()` or a rounded path).
2. For each bird, in order: draw, `node scripts/dev/bird-sheet.mjs --only <i>`, look at the
   600px render and the 40px sheet yourself, `node scripts/dev/bird-edges.mjs <i>`, answer every
   edge, then hand to the reviewer. Three rounds at most.
3. The `skip` list on each entry names the palette family the bird's own colour belongs to
   (`GREENS`, `BLUES`, `WARMS`, or specific indices); set it for a new bird.
4. A new species: append the `ARCHES` entry after the Roller, append the full name to
   `SPECIES_FULL_NAMES` at the same index, and add a `bird-adjust.json` entry (run
   `npm run dev:centroid -- --only <i>` once the flag exists; until then copy a neighbour's
   values and let U6 converge it).
5. Commit per unit, by pathspec, with the ledger rows and the `progress.md` line inside the
   commit; 150 words on the message; never push; never `npm run check` beside `npm run visual`.
6. Report: birds done with the reviewer's verdicts, birds parked and why, the commit, and the
   two things you are least sure you got right.

### U5, the dealing rule

- `src/lib/avatar-deal.ts`: `wearableSpecies()` (every index in `GALLERY_SPECIES` except the
  Hoopoe), `weightsFor(counts)` as above, `dealBird(counts, random)` returning a slug, and
  `countVisibleWearers(prisma)` which reads `{ id, birdOverride, photoUrl }` for every member
  and resolves each through the same precedence `BirdAvatar` uses (`resolveBirdOverride`, then
  `speciesForMember`). One query, three columns, a few hundred rows today and still trivial at
  two thousand.
- `signup` in `src/components/auth/actions.ts`: after the create, deal and write
  `birdOverride`, best effort, reported on failure the way the batch-group join is.
- `src/lib/avatar-deal.test.mjs`: a bird with no wearers is drawn about a hundred times more
  often than one with nine; no weight is ever zero; the Hoopoe and the Roller never appear; equal
  counts draw evenly; and a simulation from today's real counts (in the session log below)
  plus twelve new birds at zero levels the spread within about 150 signups.
- `docs/spec/avatars.md`'s banner gets a paragraph: the hash is the floor for members who joined
  before 2026-10; later members are dealt. The old "no randomness anywhere" line is superseded
  with the reason: equal occurrence needs state, and the stored slug keeps the draw stable.
- `write-path-reviewer` on the diff before the commit.

### U6, close-out

Centroid convergence for every changed and new bird (then look at the sheet again: the script
can shrink a long-tailed bird), `node scripts/dev/generate-bird-photos.mjs` (the contact-card
PNGs in `public/images/birds/`, two per species), the copy that says fifty (guide chapter,
`/birds` metadata, the Support page's "See all" button), `npm run visual` and a looked-at
`visual:update` for `/birds`, `/support`, `/pick-bird`, the spec banner, the history entry,
this file's board and log.

---

## Owner questions

Written 2026-10-08, printed in the session the same day. One reply covers them: *"defaults"*,
or *"defaults except 3 and 7"* with what you want instead.

**1. How many new birds?**
- **What I'd change:** build the twelve named in `selection.md` (a rooster, a duck, a horned
  owl, a purple swamphen with a red nose, a pale kite with ruby eyes, a kestrel, a tiny
  tailorbird, a hunched night heron, a pied kingfisher, a swallow, a grey wagtail, the campus
  pigeon), then the six on the reserve if every one of the twelve clears the reviewer and there
  is time.
- **What you'd notice:** the Birds page grows from fifty to sixty-two, up to sixty-eight; new
  members start arriving as the new birds.
- **If I guess wrong:** too few and the set stays green-and-brown heavy; too many and the weak
  ones dilute the birds you like.
- **Options:** (a) the twelve, then the reserve if they clear (b) only the twelve (c) a
  different list: name the birds.
- **If you don't reply I'll do:** (a).

**2. Swap the Yellow-wattled Lapwing for the Red-wattled one?** The school's list has the
Red-wattled (the "did-he-do-it" bird: black head, red face flap); ours is the Yellow-wattled,
which you called okay.
- **What I'd change:** redraw that slot as the Red-wattled.
- **What you'd notice:** the five members who wear the Yellow-wattled wake up as the Red-wattled.
- **If I guess wrong:** we keep a bird that is not on the school's own list.
- **Options:** (a) keep the Yellow-wattled (b) swap to the Red-wattled (c) keep ours and add the
  Red-wattled as a new bird, accepting that the two will look alike.
- **If you don't reply I'll do:** (a).

**3. Swap the Orange-breasted Green-Pigeon for the Yellow-footed one?** Same situation: the
list has the Yellow-footed; you flagged ours for random colours.
- **What I'd change:** (a) fix the colours of the one we have, or (b) redraw the slot as the
  Yellow-footed: olive-green, grey crown, a lilac shoulder, yellow legs.
- **What you'd notice:** (a) the same bird, tidier; (b) the ten members wearing it wake up as a
  different pigeon.
- **If I guess wrong:** a bird you keep disliking, or ten members losing a bird they had.
- **Options:** (a) fix ours (b) swap.
- **If you don't reply I'll do:** (a).

**4. Tickell's Blue Flycatcher: redraw it, or replace it?** You said it looks weird and you
don't like it. The Blue-capped Rock-Thrush is on the list with the same blue-and-orange, plus a
black mask and a white wing flash.
- **What I'd change:** (a) draw the same species again, rounder; (b) the slot becomes the
  Rock-Thrush.
- **What you'd notice:** (b) the four members wearing Tickell's become the Rock-Thrush.
- **If I guess wrong:** a third attempt at a bird that may never work, or a swap you did not want.
- **Options:** (a) redraw (b) replace.
- **If you don't reply I'll do:** (a).

**5. The Pied Kingfisher is black-and-white. Build it?**
- **What I'd change:** draw it with its shaggy crest, dagger bill and breast band, and put it
  through the 40px look-alike test against the Magpie-Robin, the Jacobin and the Munia.
- **What you'd notice:** one more black-and-white bird on the page, if it passes.
- **If I guess wrong:** it joins the birds that "look way too similar".
- **Options:** (a) build it, the reviewer decides (b) skip it.
- **If you don't reply I'll do:** (a).

**6. Two birds left out for colour that the school might want for lore:** the Red-vented
Bulbul (the commonest bird on campus) and the White-browed Bulbul, the "Murukku bird" of the
list's own footnote.
- **What I'd change:** nothing by default. Both are brown-olive birds, and the Red-vented's dark
  head over a red vent reads like the Indian Robin at 40px.
- **What you'd notice:** one or two more brown birds.
- **If I guess wrong:** a bird people remember from school is missing.
- **Options:** (a) neither (b) the Red-vented (c) the Murukku bird (d) both.
- **If you don't reply I'll do:** (a).

**7. The twelve birds on the Support page are your handpick.**
- **What I'd change:** nothing. Once the new birds exist you can name swaps.
- **What you'd notice:** nothing.
- **If I guess wrong:** a new bird that belongs on the plate is not there until you say so.
- **Options:** (a) leave the twelve (b) tell me which to swap in, now or later.
- **If you don't reply I'll do:** (a).

**8. "Equal" counts whom?** The rule deals a new member the least-worn birds.
- **What I'd change:** count only members whose bird is actually showing. A member with a
  photograph hides their bird, so it is not counted; if they take the photo down it counts again.
- **What you'd notice:** nothing directly; the mix of birds on the feed levels faster.
- **If I guess wrong:** counting everyone, photographs included, is simpler to explain but
  levels what nobody sees.
- **Options:** (a) count only visible birds (b) count everyone.
- **If you don't reply I'll do:** (a).

**9. The Indian Robin.** Your first message said "Robin is okay"; the transcript said "I feel
bad for everyone who gets that bird".
- **What I'd change:** redraw it, keeping it in the Magpie-Robin's family, with a cocked tail
  that reads as a tail and not a wave.
- **What you'd notice:** the nine members wearing it get a better one.
- **If I guess wrong:** a bird you were fine with changes.
- **Options:** (a) redraw (b) leave it.
- **If you don't reply I'll do:** (a).

**10. Two you called okay: the Sirkeer Malkoha and the Small Minivet.**
- **What I'd change:** the Malkoha is left alone; the Minivet is shortened a little, since you
  said it was "a little bit long".
- **What you'd notice:** the Minivet a touch rounder.
- **If I guess wrong:** a bird you did not mind changes, or one you did mind does not.
- **Options:** (a) that (b) leave both (c) redraw both.
- **If you don't reply I'll do:** (a).

**11. The leg remark.** "I feel like the leg could be put in different places" lost its bird in
the transcript.
- **What I'd change:** the Yellow-wattled Lapwing's legs are the only prominent ones, so they
  move under the body; the Shrike's and the Thrush's leg stubs get checked by the reviewer.
- **What you'd notice:** the Lapwing standing more squarely.
- **If I guess wrong:** the bird you meant keeps its leg.
- **Options:** (a) that (b) tell me the bird.
- **If you don't reply I'll do:** (a).

Three things that are not questions: the Hoopoe stays nobody's and the Roller stays yours; the
dealing rule needs no change to the database; nothing is pushed by this session, you push at the
end.

## Owner answers

(none yet)

---

## Session log

### 2026-10-08, set-up (Fable, max, one session, /campaign)

Read everything: the avatar spec, the whole glyph file, the support plate and picker, the paid
pick action, the design system, the lab rooms, the centroid and contact-photo pipeline, the PDF.
Rendered every bird alone at 600px and all of them at 96 and 40 (`scripts/dev/bird-sheet.mjs`),
listed every straight edge in the source (`scripts/dev/bird-edges.mjs`, 58 across 51 birds; the
Hornbill's casque chord, the Pond Heron's bill and the Coucal's wing edge are on it, which is
the three he named). Counted who wears what across all 510 members, hash and overrides resolved
the way `BirdAvatar` resolves them:

- 510 members, 75 with a photograph, 22 with a `birdOverride` (15 of them paid picks).
- Visible wearers per species, Hoopoe and Roller aside: min 1 (Baya Weaver), max 21 (Rufous
  Treepie, which also catches the 11 members whose hash lands on the Hoopoe), mean 8.8.
- Paid picks cluster: Common Kingfisher 5, Spotted Owlet 3 (plus one admin assignment), Golden
  Oriole 2, Peafowl, Verditer, Tickell's, Peregrine, Avadavat, Pitta, Y-T Bulbul, Black Eagle,
  Purple Sunbird one each.
- Those counts are the seed for the U5 simulation.

Wrote `brief.md`, `selection.md`, `reviewer.md`, this file. Questions printed and pushed.
Stopped at gate 1.

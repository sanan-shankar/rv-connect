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

## Resume here (kept current; read before the board)

**State on 2026-10-16, later.** Units DONE: set-up, tooling, U5 (9ef4c6f9), U2a (9101e61d), U2b
(17a5c8e0), U3a, U3b, U4a (the three commits after 17a5c8e0). **Next is U4b**, new species 5 to 8:
Indian Eagle-Owl, Common Tailorbird, Common Kestrel, Black-crowned Night Heron, appended at index
61 to 64. Brief one Fable hand exactly as U4a was briefed (the U4a brief is the pattern: `selection.md`
section 2 entries, "How to work a drawing unit" step 4, `reviewer.md`, ¶1 to ¶4, ¶10 and ¶11, and
the demand that each bird carry its OWN silhouette, not the set's disc). A new species is not a
candidate: it joins the gallery, the picker and the deal on commit, and nothing is pushed until
gate 2. The loop that closed U2a to U4a: the drawer draws and looks; the runner re-centres
(`centroid.mjs --only ...` until "0 need attention"), renders the unit's sheet and looks; ONE Opus
reviewer under the budget rule writes `reviews/u4b-review-1.md`; the same drawer gets the faults
once (SendMessage, context intact); the same reviewer verifies once; faults with exact paths left
after that the runner applies itself, re-audits with `bird-edges.mjs` (a reviewer's path can
itself be a flat Q: it happened twice, revert or bow it) and looks at; a bird that fails review 3
is PARKED and still shown at gate 2; then commit by pathspec with the ledger rows, the board, this
block, the session log and the progress line inside. If a drawer or reviewer is mid-flight when
you resume, `ListAgents` shows it; uncommitted edits in `bird-avatar-v2.tsx` are the round in
progress. A usage limit (HTTP 429) has cut an agent off three times; a resumed agent carries on
from its own transcript with nothing lost, so resume it rather than re-brief.

**Then, in order:** U4c, U4d, U4e, U6 (see the board and "The units").
Owner answers are all in; nothing is owner-gated until gate 2, which is rendered sheets and
before/after pairs, not prose (he decides by seeing, Q5).

**Rules this unit taught, all binding:**
- One reviewer per unit, spawned by the runner, never by the drawer; at most two agents at once.
  A drawer spawned seventeen reviewers and was killed (2026-10-08); the owner: "tf are 17
  agents doing that's crazy".
- **Reviewer budget**: a verdict per bird in about five minutes, from the 600px render, the 40px
  sheet and the path coordinates; no pixel sampling, no reconstructing old renders, no scripts
  beyond `bird-edges.mjs` and `bird-sheet.mjs`. Two reviewers ran eight hours each on 2026-10-11
  and cost a night. Stop any reviewer past an hour (`TaskStop`) and re-brief with the budget.
- Commit each round as it lands (drawn, review pending) so an interruption loses nothing; the
  owner asked for this on 2026-10-08. Always `git commit -- <paths>`: another session's
  catch-ups work sits staged and modified in this checkout.
- A bill is never cured by a club (¶41, ¶42); the `Eye` now takes a disc colour so a head darker
  than ink keeps a visible eye; the app's svg clips at the 100-unit box, so every tip stays 3
  units inside (centroid.mjs measures the padded probe, cap 47); `bird-edges.mjs` flags flat
  quadratics, and the eye still judges a near-straight one.
- **Less ceremony, same bar** (the owner, 2026-10-14, compacting this session): *"I've added birds
  before and it's never taken so long or so much usage. So I don't know why you're doing it in this
  very grand and like it seems like a bit extra, honestly, and I feel like you can achieve the same
  quality with less usage. I don't have a problem with time. Um, and honestly, take the usage you
  need to make it good, but I feel like you might be doing overkill. And it's not going to really
  result in something better. So just keep that in mind. Make sure you balance these two things."*
  Reading: every unit from here is draw, one review, one fix pass, commit. Briefs point at the
  files on disk instead of re-quoting them. The runner looks at the sheets itself before spending
  a reviewer. The checklist and the three-strikes rule do not change.
- Candidates for a slot (Q2, Q3, Q4, Q10) are appended entries named " (candidate)" until he
  picks at gate 2; new species are appended past the Roller (index 51 and up).

---

## Status board (update every unit)

| Item | Status | Notes |
|---|---|---|
| Brief captured in his words | DONE | `brief.md`, 2026-10-08, 40 paragraphs; names read from the gallery order and bracketed |
| Selection written | DONE | `selection.md`: census, twelve to build, six in reserve, rejects with reasons |
| Reviewer protocol written | DONE | `reviewer.md`: the loop, the checklist, the answer format |
| U1 Tooling | DONE | `scripts/dev/bird-sheet.mjs` (renders), `scripts/dev/bird-edges.mjs` (58 straight edges found across the 51); both in `scripts/README.md` |
| Owner questions 1 to 11 | DONE | answered 2026-10-08 in the session; his words and the readings under "Owner answers" |
| U2a Cut-offs and bills | DONE | 2026-10-14. Seventeen birds, four drawing rounds, two reviews (`reviews/u2a-review-1.md`, `u2a-review-2.md`): review 1 passed 4, review 2 passed 9 of the 13, the last 4 (10, 41, 42, 46) fixed once more and checked by the runner at 600px. `Eye` takes a disc colour. Commits e9cf7112, e7f32046, 3c3bf8ac and the closing one |
| U5 The dealing rule | DONE | 2026-10-09. `src/lib/avatar-deal.ts` (pure), `avatar-deal-server.ts` (the count and the draw), ten tests, signup deals INSIDE the create, write-path review clean. The twelve new species would take ~70% of the first fifty signups and reach the old birds' average after ~250 |
| U2b Structure and colour | DONE | 2026-10-15. 14, 29, 34, 38, 39, 48 fixed and the Yellow-footed Green-Pigeon candidate appended at 51 (`reviews/u2b-review-1.md`, `u2b-review-2.md`: all seven failed review 1 on nineteen faults, review 2 passed four and failed three on four small faults the runner fixed from the review's own paths). Candidates are gated out of the gallery, the paid picker and the deal by `isCandidate()` with a test. The Lapwing's legs declined (Q11) |
| U3a Hard redraws | DONE | 2026-10-15. Jacobin 35 and Black Eagle 36 pass review 3. Paradise Flycatcher 26 and Peregrine 32 (first hand) PARKED at review 3; the second hand's candidates 52 and 53 are the ones the reviewer would show (`reviews/u3a-review-1..3.md`). Gate 2 shows each pair on one sheet; he picks |
| U3b Redraws | DONE | 2026-10-15. 13, 15, 23, 33, 44 redrawn in place; candidates 54 Blue-capped Rock-Thrush (beside 44, Q4), 55 Small Minivet and 56 Sirkeer Malkoha (beside 47 and 11, Q10) appended. Two reviews (`reviews/u3b-review-1.md`, `-2.md`): 1 pass then 7 fail on 12 faults; after the fix pass 4 pass and 3 fail on one exact-path fault each, which the runner applied. Reviewer's gate-2 note: seven of the eight share one body template and part at 40px by colour (A6) |
| U4a New birds 1 to 4 | DONE | 2026-10-16. Grey Junglefowl 57, Spot-billed Duck 58, Grey-headed Swamphen 59, Black-winged Kite 60 appended as real species (`reviews/u4a-review-1.md`, `-2.md`: 2 pass, 2 fail on 4 faults; after the fix pass all four pass, the Junglefowl's last notch closed by the runner from the review's path). Each has its own silhouette: comb and sickle tail, boat and spatula bill, red shield and legs, black shoulder and ruby eye |
| U4b New birds 5 to 8 | OPEN | Indian Eagle-Owl, Common Tailorbird, Common Kestrel, Black-crowned Night Heron |
| U4c New birds 9 to 12 | OPEN | Pied Kingfisher (Q5), Wire-tailed Swallow, Grey Wagtail, Rock Pigeon |
| U4d New birds 13 and 14, and a candidate | OPEN | Red-vented Bulbul and White-browed Bulbul from their colours (Q6); the Red-wattled Lapwing candidate beside 24 (Q2) |
| U4e The reserve | OPEN | only if every bird of U4a to U4d passed (Q1) |
| U6 Close-out | OPEN | centroid for every changed bird, contact photos, the "fifty" copy, visual baselines, `docs/spec/avatars.md`, history, the gate-2 sheets |
| Gate 2, the owner looks | OPEN | the whole point of the run on a design campaign |

---

## The ledger: every ask in the brief

Status words: DONE, OPEN, OWNER-GATED, DECLINED, PARKED (with the last review). The bird index
is its position in `SPECIES_FULL_NAMES` (`src/components/common/bird-avatar-v2.tsx`), which is
the order of `/birds`.

### The campaign-wide asks

| ID | ¶ | Ask, in his words | What it means here | Status |
|---|---|---|---|---|
| A1 | 1, 2, 3 | "expand our catalog of 50 birds into more" from the PDF; "somewhat colorful, separate from the background... thorough sense of color science"; "obviously different from each other and different to the ones that are already there" | `selection.md` | DONE (selection); build: 4 of 12 (U4a, 2026-10-16), U4b to U4d open |
| A2 | 4 | "when you build it, it's just one criteria, cuteness" | reviewer line 7 | applies to every unit |
| A3 | 39 | "if there's one [species] that you wanted to remove slash replace... Just run it by me. Obviously, don't replace any of the ones I like" | questions 2, 3, 4, 6 | OWNER-GATED |
| A4 | 19, 40 | "an independent reviewing agent... some kind of a loop"; "Make sure you have an independent reviewer. Make sure you review everything" | `reviewer.md`, U1 | DONE (protocol), applies to every unit |
| A5 | 39, 40 | "I'm not giving you... you have to add these many... Just keep the quality really high"; "we're not shipping anything off big" | twelve, then a reserve; three strikes parks a bird | LOCKED |
| A6 | 10, 11 | "not a sign for you to make only circular ones because some of the more unique ones like the hornbill, like the lapwing [the Pond Heron and the Cormorant]... the Brahminy Kite... I really love it... It is harder to make those look cute" | a broken silhouette is welcome when it is the bird's own; it just has to be cute | LOCKED |
| A7 | 14 | "we have to balance cuteness with the trueness to the bird... the Coucal and the Koel... red eyes... that is how they are. So you might have to keep that" | the red eyes stay | LOCKED |

### The fixes, bird by bird

| ID | Bird (index) | ¶ | His words | Action | Unit | Status |
|---|---|---|---|---|---|---|
| F1 | Red-whiskered Bulbul (13) | 7 | "looks a bit almost angry and it's very sharp... a mess... particularly the thing on top" | redraw: soft tall crest, round body, calm face, the red cheek spot and vent kept | U3b | DONE. Review 2 (2026-10-15, `reviews/u3b-review-2.md`) PASS: one soft crest tuft leaning forward, black head up and forward, white cheek with the red whisker behind the eye, white bib, red vent, a wing a clear step darker |
| F2 | Oriental Magpie-Robin (14) | 8, 12, 23 | "the white shapes in the middle feel a bit arbitrary"; "even the shape slightly"; "a bit long" | rework the white panels into the bird's real belly and wing bar; shorten the body | U2b | DONE. Review 1 (2026-10-14) failed the first rework (tail a hollow loop, wing-bar with no wing under it, eye lighter than the head); review 2 (2026-10-15) PASS: solid tail paddle, a darker folded wing with the white bar on it, white belly lobe, body shortened. Gate-2 note: it leans toward a penguin; his call |
| F3 | Indian Robin (15) | 8, 36 | "okay" then "looks like a bird trying to wave... I feel bad for everyone who gets that bird" | redraw (Q9): the cocked tail as a tail, not an arm; same family as the Magpie-Robin | U3b | DONE. Review 1 failed the first tail (a straight bar at 63 degrees, still "an arm waving"); review 2 passed it as a fan that widens away from the body the Magpie-Robin's way, told from 14 at 40px by the all-dark front and the chestnut vent; the runner applied the review's exact fix for the shoulder patch poking off the wing |
| F4 | Black Drongo (17) | 9 | "the fork is good. If we could make the fork a bit nicer, now it's like very rough" | smooth the fork's notch and lobes | U2a | DONE. Review 2 (2026-10-14) PASS: fork smoothed; red-brown iris with a dark pupil |
| F5 | Greater Coucal (18) | 9 | "even with [the Coucal], there's a very rough straight line... the image has just been cut off" | the chestnut wing's edge curves | U2a | DONE. Review 2 PASS: the wing's edge curves; the bill tapers 8.6 to a 3-unit tip, not a club |
| F6 | Tickell's Blue Flycatcher (44) | 12, 23, 30 | "a bit weird"; "a bit long"; "I don't like it... looks just weird" | redraw (Q4) | U3b | DONE. Review 2: the white bib first and the rust lobe over it so the white's top is the rust's round bottom; the runner applied the review's exact path for the bib so no white needles run up beside the head. Pair at gate 2 with the Blue-capped Rock-Thrush candidate 54 (Q4): reviewer, "no other bird in the set has a blue head on an orange body; 44 sits close to the Verditer" |
| F7 | Orange-headed Thrush (33) | 12, 23 | "a bit weird... straying a bit far"; "the shape is a bit long... just not working for me" | redraw, rounder | U3b | DONE. Review 1 PASS, the only first-time pass of the unit: one orange circle, head up and forward, blue-grey wing with the white bar, short grey tail. Reviewer's note for gate 2: it lacks the white face with two dark bars of the South Indian race, so it reads as a generic orange robin; he said "just not working for me" of the old one, so the pair old/new is his to judge |
| F8 | Common Kingfisher (38) | 12 | "looks fine. Though that's also kind of dull" | brighten the cyan and the orange; nothing structural | U2b | DONE. Colours brightened (cyan #12B6EA, orange #F27A1F); review 1 found four cut-offs the sweep had missed (bill highlight's flat end, straight-sided belly, cheek point, orange sliver), review 2 PASS with all four gone |
| F9 | Small Minivet (47) | 12, 23 | "okay. It's not not great"; "a little bit [long]... it's still okay" | shorten a little (Q10) | U3b | DONE as a pair (Q10): candidate 55 appended beside the untouched 47, round, the flame running from breast to vent (review 1 failed a chest patch as "a grey robin"; review 2 PASS). Reviewer at 40px: 47 reads more as a minivet (slim, long-tailed); 55 answers "a bit long". He picks |
| F10 | Bay-backed Shrike (42) | 13, 34 | "looks okay... the beak is a bit too crooked and pointy"; later "is good" | soften the hook | U2a | DONE. Review 1 softened the hook; review 2 failed it as a blunt thumb (5.8 deep, 4-unit knob); the fix pass slimmed it (4.7 at the base, a drooping 3.1 nail, underside bowed up). Runner looked at 600px; not re-reviewed (the 2026-10-14 rule) |
| F11 | Peregrine Falcon (32) | 13, 22 | "crooked and pointy"; "overengineered... derpy... pot belly... overthought... 70 different elements... I've gone through maybe four or five versions" | redraw from nothing: strength and cuteness, under twelve shapes; two attempts, keep the better | U3a | PARKED at review 3 (2026-10-15, `reviews/u3a-review-3.md`): the first hand's Peregrine broke the penguin reading (cream bib over a barred belly, tail under the wing tip) but its tail is a straight stick; shown at gate 2 beside the second hand's candidate 53, which the reviewer reads as "plainly a perched falcon" and "the set's best falcon face"; 53 failed only on finish, and the runner applied its three exact fixes (underside one curve, wing edge bowed, nape corner rounded inside the cream). He picks; U6 deletes the loser |
| F12 | Brahminy Starling (23) | 15 | "I don't like at all... the color... that super thin black line... I don't like anything about it... should be redone" | redraw from nothing | U3b | DONE. From nothing: apricot body, dove-grey wing and tail, head up and forward under one black crown from the bill base over the top with a soft tuft on the nape, yellow bill with a blue base. Review 1 failed the cap as a hat; review 2 PASS as a crown |
| F13 | Asian Paradise Flycatcher (26) | 16 | "one of the most iconic birds in our school... insanely long tail, is white, magnificent... the females look like what you've done, but I think we should pick the male... doing justice to it" | redraw as the white male: black crested head, white body, the long white ribbon tail; two attempts | U3a | PARKED at review 3: the first hand's white male has a grey-rimmed body and a grey tail that fuse into "a white button with a grey ring"; shown at gate 2 beside the second hand's candidate 52, "the Flycatcher to show" (black hood leaning forward, white body edged by grey shade, the ribbon trailing behind). Reviewer's finding for the whole idiom: the tail twice the body is what fights the box; a later try is worth it only with a broader ribbon (6 to 8 units) about 1.5 body lengths long behind a near-full-size body. 52's one fault is a tip 3 units from the edge, which is the campaign rule's own limit |
| F14 | Indian Pond Heron (27) | 17 | "very cute... we could add color... kind of bland. The shape is good... the beak has this weirdly, very sharply cut off thing" | keep the shape; colour the crown and the bill; round the bill tip | U2a | DONE. Review 1 (2026-10-12) PASS after the round-2 fixes |
| F15 | Little Cormorant (28) | 18, 34 | "there in the middle... if it could be rounded just a bit"; "a black bird you've taken and done something really nice" | round the straight edge; change nothing else | U2a | DONE. Review 2 PASS: the bill is slim and hooked, drawn before the head so the head's curve is its base |
| F16 | Indian Grey Hornbill (10) | 8, 18 | "looks good"; "the beak... looks like the image has been interrupted and cut up" | round the casque and the bill's ends | U2a | DONE. Review 1 failed the casque dome fused with the eye; review 2 passed the low ridge and failed the bill's rear edge (a ruler line, 97-degree corner); the fix pass bowed it 1.5 into the bill with a rounded corner. Runner looked at 600px |
| F17a | Coppersmith Barbet (9) | 34 | "Culbersmith, Lovitz [Coppersmith Barbet, lovely]" | from the sweep: the forehead band's rear rounded | U2a | DONE. Review 2 PASS: both red bands are round-capped ribbons |
| F17 | every bird | 17, 18, 19 | "we still have a lot of these very odd arbitrary sharp cutoffs"; "I've asked you to do this multiple times" | the edge audit over all 51; every edge answered or redrawn | U2a | DONE for the seventeen of U2a (4, 5, 9, 10, 12, 17, 18, 19, 20, 21, 27, 28, 30, 40, 41, 42, 46): review 1 passed 4, review 2 passed 9 of the 13, the last 4 fixed once more and looked at by the runner. `bird-edges.mjs` lists only chisel bills, legs and hidden edges on them. The birds of U2b, U3a and U3b get their edges in their own unit; U6 sweeps whatever is left |
| F18 | Indian Golden Oriole (29) | 20 | "the eye, and then there's this line going through the eye, and then that intersects the beak... looks almost like it's wearing sunglasses" | the eye-stripe stops short of the bill and sits behind the eye; keep the colours | U2b | DONE. The stripe is a rounded flick behind the eye, four units of yellow between eye and bill; review 1 failed the wing as a floating black oval, review 2 PASS with it a folded-wing teardrop from the shoulder. The head stays inside the body on purpose (he flagged only the sunglasses) |
| F19 | Cattle Egret (30) | 21 | "is good, against some sharp stuff" | soften the buff crown's points; nothing else | U2a | DONE. Review 1 PASS |
| F20 | Blue-faced Malkoha (34) | 24 | "the background color is... all of the green, and then inside, we have a dark and [olive] green. I'm not so sure about the color science" | one body green, the wing a clear step darker or a different warmth; the blue face bigger | U2b | DONE. One body green with the wing a clear step darker, blue face 10.5x9; review 1 failed the head hidden inside the body, review 2 passed the raised head and failed a hairline of olive between the blue face and the paper; the runner pulled the face in to (61.5,38) rx 9.5 per the review's path and looked at 600px |
| F21 | Jacobin Cuckoo (35) | 25 | "a lot of randomly harsh and weird cut off shapes... another black and white bird... think of the white as... white space... should be redone again" | redraw: the white belly bounded by black, a soft crest, the wing flash as one shape | U3a | DONE. Review 3 PASS: "a black crested cuckoo, its white underparts held inside a black rim and a short white flash low on a darker folded wing"; told from the Magpie-Robin by crest, dropped tail and lower flash |
| F22 | Black Eagle (36) | 26 | "that eyebrow... a random brown spot on top of the beak... a black line over the eye, but you can't really see that... too many elements" | redraw simpler: one body, one lit region, yellow cere and eye, no scallops | U3a | DONE. Review 3 PASS: "a sooty eagle with one paler folded wing running from the shoulder to a tip that lies on its broad tail", dark eye in a brown ring, yellow cere on a grey hooked bill. Seven shapes. The eye is dark brown on purpose (the adult's iris); the row's "yellow eye" was the set-up session's summary, not his words |
| F23 | Jerdon's Leafbird (39) | 27 | "such lovely colors. It's hard to make sense of what is the eye, beak, face... the structure could be made a bit clearer" | keep every colour; make the black bib, the eye and the bill read as a face | U2b | DONE. Every colour kept; the black is a mask-and-bib the size of a face, the bill a slim decurved grey; review 1 failed the eye straddling the mask, review 2 PASS with the eye inside the mask as a brown iris and ink pupil (a near-black disc in a black mask is the fault he named) |
| F24 | Black-rumped Flameback (41) | 28 | "honestly fine... but the beak is a bit [great: unclear]" | round the chisel's ends; nothing else | U2a | DONE. Review 2 failed three (eye stripe read as a shadow, moustache touching the gold, crest's lower edge a ruled diagonal); the fix pass deleted the stripe, ended the moustache 1.6 inside the cream, bowed the crest. Runner looked at 600px |
| F25 | Orange-breasted Green-Pigeon (48) | 31 | "the colors are a bit very random... light purple near the eyes in two different parts... overlapping shapes... cutting off" | redo the bands as bounded shapes on the breast only; the crown one grey; or swap (Q3) | U2b | DONE. Review 1 failed three stacked lozenges as pills and the head hidden with the crown on the eye; review 2 passed one bounded orange breast lobe and the raised head, and failed a green band over the grey cap; the runner made the cap the top of the dome per the review's path. Gate-2 note: no lilac band (it read as lips); the real male has one |
| F26 | Yellow-wattled Lapwing (24) | 35 | "the leg could be put in different places. It looks a bit off right now" (bird unnamed; Q11) | move the legs under the body's centre of mass; check the Shrike's and Thrush's leg stubs | U2b | DECLINED by the owner: Q11, "idk what that is just ignore". The Lapwing is on his LOCKED list (F28); legs not moved, edges audited only (toe pads, rounded) |
| F27 | Yellow-throated Bulbul (12) | 33 | "The eye is not in that, like, white circle that you've slowly built up to. I don't know if that's intentional" | nothing unless the reviewer finds the eye lost in the glow | U2b | DONE in U2a: review 2 of U2a (2026-10-14), "the eye now sits centred in a pale ring" |
| F28 | the ones he likes | 6, 8, 11, 15, 21, 29, 30, 32, 33, 34 | Hoopoe, Peafowl, Owlet, Dove, Hornbill (shape), Kite, Treepie, Weaver, Lapwing, Egret, Verditer, Purple-rumped Sunbird, C-h Bee-eater, Munia, White-eye, Purple Sunbird, Y-T Bulbul, Cormorant, Shrike, Green Bee-eater, Barbet, Koel, Sirkeer Malkoha | untouched beyond the edge audit | all | LOCKED |
| F29 | Sirkeer Malkoha (11) | 34 | "okay" (question 10) | redraw as a candidate, the old kept for the pair (Q10) | U3b | DONE as a pair: candidate 56 appended beside the untouched 11, olive with a long graduated tail paddle, buff belly, the red-and-yellow bill a taper to a 3.4-unit tip (review 1 failed a stepped 7-unit club; review 2 PASS). Reviewer at 40px: 11's big bill is the louder mark but it has no tail; 56 has the shape and its bill reads as a tick. He picks |

### The dealing rule

| ID | ¶ | His words | Status |
|---|---|---|---|
| G1 | 37 | "assign birds that somewhat make all the birds equal... take into account the people who have paid to override their birds... assign the common kingfisher less. Maybe not zero, but less" | DONE, U5 (2026-10-09) |
| G2 | 38 | "I don't want to change the code at any future point. I want it to be adaptable... assign people the new birds. And then when the new birds kinda level up, then it goes more random" | DONE, U5 (2026-10-09) |
---

## Decisions

### LOCKED (the owner decided; reasons in the brief)

- Every row in the ledger marked with his words. The fixes are his list; cuteness is the build
  criterion (¶4); the Paradise Flycatcher becomes the male (¶16); the Peregrine is simple (¶22).
- An independent reviewer judges every bird (¶19, ¶40); `reviewer.md` is that reviewer.
- Replacing a bird he did not flag is his call (¶39); the questions below carry each one.
- Quality over count (¶39, ¶40); a bird that fails three reviews is parked.
- The Koel's and the Coucal's red eyes stay (¶14).
- **A bill is slim and tapered to a soft rounded tip, never a thick blunt club** (¶41, ¶42,
  2026-10-11): "I just didn't like that super thick blunt one"; the Purple-rumped Sunbird's is
  one right answer and "there might be multiple correct answers".
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
- **Where it runs**: in `signup`, dealt just before and written INSIDE `prisma.user.create`
  (the worker's improvement on "after the create": the row is complete in one write, and the
  new member is not counted in their own draw). Best effort like the batch-group join: a
  failure is reported, the member keeps the hash bird, signup succeeds. Pure and tested:
  `dealBird(counts, species, random)` in `src/lib/avatar-deal.ts`.
- **Two attempts** for the Paradise Flycatcher and the Peregrine (the two he cares about most
  and has been disappointed by most): a second hand draws each again as an appended candidate
  entry, since a worktree cannot render through the one dev server. One attempt for the rest.
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

**Order**: U2a, U5, U2b, U3a, U3b, U4a, U4b, U4c, U4d, U4e, U6, one at a time. U5 goes second
so the rule he asked for cannot be lost to a long run of drawing. Candidates for a slot (Q2,
Q3, Q4, Q10) are appended entries named with " (candidate)" while the run lasts; U6 resolves
each pair to one bird after he has looked.

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

**2026-10-08, in the session, his words verbatim:**

> 1 default. 2 whicvhever looks better. 3 both pick whichever looks better. 4 both pick
> whichever looks better. 5. I can't decide these fucking things without seeing them. your
> descriptions don't help me at all. 6. I feel like you can make both and just use the more
> interesting colours they have instaed of just making them brown. 7 leave them. count visible
> birds. 9a. 10 redraw and pick the best. 11 idk what that is just ignore

**The reading taken (argue with this, not with a re-derivation):**

- **Q1** (a): the twelve, then the reserve if they clear.
- **Q2, Q3, Q4**: draw the candidate as well, and keep whichever looks better. The Red-wattled
  Lapwing is drawn beside the Yellow-wattled (24), the Yellow-footed Green-Pigeon beside the
  fixed Orange-breasted (48), the Blue-capped Rock-Thrush beside the redrawn Tickell's (44). Each
  candidate is appended as its own entry while the run lasts, so both render on the same sheet;
  the runner recommends one and **he sees both at gate 2 and picks**. The loser is deleted
  before anything is pushed. A candidate that wins takes the slot (so the members wearing the
  old bird change bird); one that loses leaves no trace.
- **Q5**: build the Pied Kingfisher; he decides on seeing it. And the general rule this answer
  states: **he decides by looking, never from a description.** Gate 2 is rendered sheets,
  before-and-after pairs and candidate pairs, with one line each, not prose.
- **Q6**: build both bulbuls, and draw them from their interesting colours rather than their
  brown: the Red-vented's crimson vent, white rump and scaly dark breast under a crested
  black head; the White-browed's yellow vent and undertail, white brow and olive-yellow wash.
  They join U4 as new birds 13 and 14.
- **Q7**: the Support plate's twelve stay.
- **Q8** (a): count only visible birds.
- **Q9** (a): redraw the Indian Robin.
- **Q10**: redraw both the Sirkeer Malkoha and the Small Minivet; keep whichever of old and new
  looks better, shown as a pair at gate 2.
- **Q11**: the leg remark is dropped; the Lapwing's legs are not moved.

**2026-10-11, after seeing the first round's renders, his words verbatim:**

> continue. also I see some beaks that have become very thick and rounded after my comments.
> that not the only way to solve the problem. for examle what the purple rumped sunbird beak is
> pretty nice and unique and still cute.

> It's not to say that that's not that that's the only way to do it. Um, there's probably other
> ways to do it. But I just didn't like that super thick blunt one. And saying that this is good
> doesn't mean it's the only way and you should only use this. Any there's, there might be
> multiple correct answers. I'm just saying that this is one. Um, that does it unique, but it's
> still cute and it's not like this ultra sharp thing.

**The reading taken:** the round-1 cure for a chopped bill overshot into thick blunt clubs. A
bill keeps a slim taper and a soft rounded tip (the Purple-rumped Sunbird's slim down-curved arc
is one model, not the template); the reviewer checklist line 1 now says so, and U2a gets a
round 3 on bills before its review.

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

### 2026-10-08, U2a drawing (Fable, max), cut off before review

The hand drew all seventeen: the eight rows plus nine from the edge sweep (Kingfisher 4, Pitta 5,
Barbet 9, Y-T Bulbul 12 adjust only, Treepie 19, Black-hooded Oriole 20, Weaver 21, Brahminy Kite
40, Munia 46). It then spawned seventeen Opus reviewers at once and the harness ended it before
any answered, so no bird has a verdict; `reviewer.md` now says one reviewer per unit, spawned by
the runner. Its work is committed as drawn, review pending, so nothing is lost to an interruption.

**Its key finding, which changes U6:** the app's `<svg viewBox="0 0 100 100">` clips at the box,
and `scripts/dev/centroid.mjs` measured a shot of that same clipped box, so it could not see a
bill that ran past the edge and converged birds with their tips AT the frame. That is the owner's
"sharply cut off" beak on the Pond Heron, the Egret, the Kingfisher and the Drongo's fork, in
pixels rather than in the drawing. The script now reads the probe with `?pad=1` (viewBox
-12.5..112.5, 4.8 px per unit) and caps reach at 47, three units inside the frame. The Lapwing's
legs run about 10 units past the bottom and were not re-measured on purpose: he called the bird
okay and dropped the leg remark (Q11); re-centring it would shrink it by a fifth. Show him at
gate 2.

The hand's two least-sure calls, for the reviewer to weigh: the Drongo's body is about 18% smaller
(adjust s 1.447 to 1.18) to fit a whole fork inside the frame, which may read as "smaller bird";
the Pond Heron's maroon went on the back, where the real bird wears it in breeding plumage, not
the crown the ledger row said, and its dagger is shorter.

**Review round 1 (three of seventeen answered before the rest were stopped):** Hornbill PASS;
Pond Heron FAIL; Barbet FAIL. The reviewers' exact fixes, for the drawer:

- Pond Heron: replace the mantle's lower edge `Q44 52 32 56 Q26 58.5 22 60` with one sag such as
  `Q38 60 22 60` that lands level on the outline (then start the top streak at x~40 so it clears
  the cap); taper the bill from about 5 units at the head to a soft rounded point about 2 units
  across and draw the dark tip as the bill's own last 4 to 5 units, tracing the bill's edges, so
  it is not a knob; bow the underside (`Q75 50.6 66 49.6` has its control 0.11 off the chord) by
  at least 1 unit. Keep the body path, the maroon mantle and the rounded crown.
- Barbet: the forehead band's lower edge `Q58 40.4 50 40 Q44.5 40.2 41 42` becomes one gentle
  arch from (68,40) to (41,42), for example `M40 36 Q56 30 66.5 37 Q71.4 39.4 68 40 Q55 37.4
  41 42 Q37.4 40 40 36 Z`; the breast band's rear control moves to about (31.2,65) so it ends
  round like the right end. Nothing else moves.
- Both reviewers found the edge audit blind to a `Q` whose control point sits on its chord;
  `bird-edges.mjs` now flags those ("flat Q", chord >= 4, control within 6% of the chord), and
  on the seventeen it lists 27 of them, most on tails and forks. The drawer clears the visible
  ones before the reviewers look again, so the review happens once.

### 2026-10-09, U5, the dealing rule (Opus, max; write-path review by its own agent)

Shipped as designed with four improvements the worker argued for and the runner accepted: the
dealt bird is written inside the create rather than by an update after it; the pure rule takes
the species list as an argument so `node:test` can load it without the `.tsx`; the deal draws
from `WEARABLE_SPECIES`, the very list `chooseBird` validates against, so the two can never
disagree; and the deal module is imported inside the `try`, since `plate-data.ts` throws at load
on purpose and a top-level import would have turned that into a failed signup. The `% 51` wrap on
an override index is gone (it would have folded the first appended species onto the Hoopoe); a
test pins that names and drawings are equal in number. Measured in the tests: a bird nobody wears
is dealt 100x as often as one worn by nine; nine against ten is 1.2x; the Hoopoe and the Roller
came up 0 times in a million draws; at today's counts the Common Kingfisher (14 wearers) was
dealt 69 times against the Peafowl's (7) 236 in 200,000, held back but never zero. The twelve
new species at zero would take about 70% of the first fifty signups and reach the old birds'
average (8.8) after about 250, not the 150 the set-up session guessed. Live, read-only: 441
visible birds across 517 members.

The write-path reviewer found nothing blocking. Its three low notes: a test now pins that the
deal call sits inside the try (added); the contact-card PNGs in `public/images/birds/` stop at
index 50, so U6 must regenerate them and then pin their count to twice the names; and one
member-visible effect to tell the owner: a new member's `/pick-bird` now shows their dealt bird
as "your current bird" with the choose button disabled on it, and their paid pick stays
unspent. One tooling note outside this campaign: the reviewer's own definition points at
`scripts/demo/verify-guard.mts` with a command that cannot resolve `@/` imports; it got a real
run (15 passed) through a temporary loader. Logged in `docs/planning/bugs.md`? No: left here for
the next audit, since it is the agent definition, not the app.

### 2026-10-14, U2a closed (Fable drawer, Opus reviewer, one session)

Resumed after the 2026-10-12 pause with the owner's note that the campaign was "overkill" in
usage (his words in the Resume block). Round 4 was re-briefed lean: one drawer, a brief that
points at the review file instead of re-quoting it, no reviewer of its own. It fixed every
in-scope fault on the thirteen and gave `Eye` a disc colour (Flameback, Shrike) with inline
iris-and-pupil eyes on the Oriole, Drongo and Munia. Review 2 (one Opus agent, 15 minutes for
thirteen birds against the previous reviewers' eight hours each): 9 pass, 4 fail on 6 faults, 5
of them created by the fixes (a ruler line where the Hornbill's bill meets the face, a blunt
thumb on the Shrike, a chestnut wedge on the Munia, the Flameback's stripe reading as a shadow)
and one review 1 missed (the Flameback's crest edge). One fix pass by the same drawer; the runner
looked at the four at 600px and closed the unit without a third review. Centroid converged in
three passes (the Hornbill went over the frame once at 49.2 and came back). `npm run check`
green. Visual baselines are not touched until U6, when every changed bird is in.

### 2026-10-15, U2b closed (Fable drawer, Opus reviewer, one session)

Seven birds and the first candidate. Review 1 failed all seven on nineteen faults, most of them
structure the rows reach (the Magpie-Robin's white shapes, the Leafbird's face, the
Green-Pigeon's bands, four cut-offs on the Kingfisher the sweep had missed) and one the reviewer
found across four birds: the head sat inside the body circle, so the outline was a plain disc.
The runner scoped the fix pass (the Oriole's head stays down, he flagged only the sunglasses);
the usage limit cut the drawer off once, it resumed from its own transcript with nothing lost.
Review 2 passed four and failed three on four small faults the fixes had made (a hairline of
olive round the Malkoha's face, a green band over both pigeons' caps, the candidate's neck
corners); the runner applied the review's own paths and bowed one near-straight neck the edge
audit caught. The candidate gate: `GALLERY_SPECIES` drops names ending " (candidate)", so a
candidate is drawn by the dev tooling only; pinned in `avatar-deal.test.mjs`. Gate-2 notes for
him: the Magpie-Robin leans penguin; the candidate reads as a yellow duckling in front of a green
egg (the reviewer's words), which is the 48-or-51 choice he asked to make by looking.

### 2026-10-15, U3a closed (two Fable hands, one Opus reviewer, one session)

Four hard redraws by one hand, then a second hand's independent takes on the two he cares about
most (Flycatcher, Peregrine) as candidates 52 and 53. Three reviews. Review 1 failed all four
(saucer tail, penguin, a corner, a blackbird); review 2 failed all six (the fixes made new corners,
both Peregrines still penguins) and named the two cues that make a penguin, a clean pale front
from chin to vent and a wing paddle with no tail, with the two changes that break it; both hands
applied them. Review 3: Jacobin and Black Eagle pass; 26 and 32 fail on one small fault each and
are parked by the three-strikes rule, kept in the tree for the gate-2 pair; 52 and 53 are the
ones to show, 53 after the runner applied its three exact fixes. The reviewer's answer on the
Flycatcher idiom is in the F13 row. The usage limit cut the reviewer off after it had written
review 3 to disk; nothing was lost. The Black Eagle's eye is dark brown (the adult's), a runner's
call against the ledger's summary.

### 2026-10-15 to 16, U3b closed (one Fable hand, one Opus reviewer, one session)

Five redraws in place and three candidates by one hand in about forty minutes, two reviews.
Review 1: the Thrush passed first time; the other seven failed on twelve faults, most of them
one shape each (a whisker on the cheek, a cap that read as a hat, a white belly chopping the
rust flat, a stepped club of a bill on the Malkoha candidate, a chest patch that made the Minivet
candidate a robin) and the Robin's tail still "an arm waving". One fix pass; review 2 passed four
and left three one-fault birds with exact paths, which the runner applied; the reviewer's own
throat path for the Rock-Thrush had two flat quadratics, bowed before rendering. The reviewer's
note that seven of the eight share one body template goes to gate 2 against A6. The Thrush is the
one to watch at gate 2: nothing on the checklist is wrong with it and it may still be the bird he
called "just not working for me".

### 2026-10-16, U4a closed (one Fable hand, one Opus reviewer, one session)

The first four new species, drawn from nothing with the demand that each carry its own
silhouette after U3b's reviewer found seven of eight on one body. They do: the Junglefowl's comb,
gold hackle and sickle tail; the Duck's boat body and yellow-nailed spatula bill (the one broad
bill in the set, tapering to its nail); the Swamphen's red shield and long red legs on a
purple-blue ball; the Kite's pale pearl body with a jet shoulder and a ruby eye. Review 1 passed
the Swamphen and the Kite and failed the Junglefowl's nested-hook tail and the Duck's club bill,
cap-into-bill band and tip at the frame; one fix pass; review 2 passed the Duck and left one notch
on the Junglefowl, closed from the review's path. The reviewer's optional Duck path was a flat Q
by the audit and was reverted. Seating note for U6: the centroid rule seats long-billed birds with
the tip near 97 percent of the frame; the cap of 47 is the rule and all three (57, 58, 60) sit at
it.

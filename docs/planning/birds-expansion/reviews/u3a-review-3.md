# U3a, independent review 3 (2026-10-15)

Review 3 of U3a: the last review for 26, 32, 35 and 36 (a bird that fails it is parked and shown at gate 2 as a parked attempt), and review 2 for the candidates 52 and 53. Judged against `reviewer.md` by the same Opus reviewer, who drew none of them.

Two pass: 35 Jacobin Cuckoo and 36 Black Eagle. 26 and 32 fail on one fault each, and each fault has a one-line fix. Both clear the problem that ran through U3a: 32 no longer reads as a penguin, and 26's white body now has an edge all round. 52 fails only on where re-centring put its tail tip. 53 is now the best Peregrine in the set and fails on four faults, two of them ruler-straight edges.

Three of the six (32, 52, 53) end up about 3 units from the box edge after re-centring. Review 2 asked for at least 6. That is the re-centring scale (`s` in `bird-adjust.json`), not the drawing; the runner can fix it without a redraw. 53's own comment says it was drawn to sit near s 1.17, and it was seated at 1.275. The app renders birds bare on the page (`BG_MODE = "none"`), so the cream-paper questions below are the real 40px case, not a sheet artefact.

Inputs: the 600px renders (all re-rendered 02:25), `sheet-26_32_35_36.png` and `sheet-26_52_32_53.png` with their 40px versions, the `draw()` bodies, `bird-adjust.json` and `bird-edges.mjs` for all six. Every chord the edge audit lists is under another shape, so none of them is a fault. Coordinates are viewBox units (0..100) from the source. "px" is a point on that bird's 600px render after re-centring. A "turn" is the change of direction where two path segments join. As in reviews 1 and 2, an edge that bows less than about 5 percent of its length is a ruler line (U2a review 2).

## For the gate-2 sheet: the two pairs at 40px (description, not a choice)

- **26 against 52 (Paradise Flycatcher).** 52 reads more as the species at 40px. A big black hood leans forward over a white body that keeps its edge through a grey underside, and the ribbon reads as a white streamer. 26 reads as a white button with a grey ring: the near-even ring makes the body a disc, and its grey wing and grey tail join into one hook.
- **32 against 53 (Peregrine Falcon).** 53 reads more as the species at 40px: a forward-leaning teardrop with a sickle wing laid down the back to the tail, which is the perched falcon's outline, under the set's clearest falcon face. 32 now reads as a slate bird with a cream bib rather than a penguin, but it is still a ball with a stick of a tail.

## The Flycatcher question: can a child name it, and is the idiom losing?

Both now read as a bird: a black crested head, an eye, a bill and a tail. Neither is a bird a child would name at a glance. 52 is a Paradise Flycatcher to anyone who knows the bird, at 600 and 96px. 26 is a black-headed white bird with a string.

**The white on cream is solved; the tail twice its body is what is beating this idiom.** 52's grey shade rim (and now 26's grey disc) gives the white body an edge at 40px. The tail is the problem. To fit a tail twice the body inside the box, the body has to shrink to about a third of the frame, which shrinks the face too. At 40px the ribbon, the one mark that says this species, is a one-to-two-pixel wisp either way: 26's tail is about 1.2 body lengths and 52's about 1.4. Length has been tried three times now (under the bird, hanging down, sweeping back). A third composition is worth one session only if it changes that trade rather than the length. That means a broader ribbon (6 to 8 units, not a string), about 1.5 body lengths, in one long sweep behind a body kept near full size. Otherwise, 52 is the answer to judge at gate 2.

---

BIRD 26 Paradise Flycatcher: FAIL (review 3: parked)
Verdict: Both review-2 faults are fixed: the white body has a grey edge all round, and the tail is rooted cleanly under a teardrop wing. But the new wing meets the grey ring at a glancing angle, so the white back ends in a sharp white point between two greys.
Neighbours at 40px: Cattle Egret (30), Tricolored Munia (46), 52 (its pair), told apart from 30 and 46 by colour: a black head on a white body. The Egret has no black and the Munia's body is chestnut.
Review 2: fault 1 (upper back with no edge) fixed. A shade disc (47,52) r 19.5 sits under the white disc (48,51) r 17.5, so the white has a grey rim of about 1 unit at the top, 2 at the upper back and 3 at the lower back; the 0.6 part is under the head. Fault 2 (sliver at the tail root) fixed: the crescent is gone, the wing's round tip (33.5-36.9, 65-67.7) lies on the tail's root, and nothing white shows there.
Faults:
  1. [line 8] A white needle between the wing and the grey ring. The wing's outer edge (`Q39 40.5 32.5 50 Q29 59.5 33.5 67`) meets the white's rim at a glancing 22 degrees at about (31.1,55.5). Above that point a wedge of white separates the wing from the grey ring: 4.3 units wide at (35.4,46.6), 2 at (32.5,50), 1 at (31.6,52.8), then nothing. That is a white point aimed down between two greys (¶31), px about (217,271) to (188,330). Fix: let the wing's outer edge meet the white's rim higher up and at a steep angle, or run it on the rim (or just outside it) from about (33,45) down, so no white tapers between wing and ring. Either way, keep every join under about 20 degrees.
Notes (not blocking):
  - The grey ring is nearly even, 1 to 3.4 units, so at 220 and 40px the body reads as a white disc with an outline: a button or plate rather than a soft body. 52's version is thicker under the belly and almost absent on the back, and it reads as shade rather than an outline.
  - Wing and tail are the same grey, #CDCFC5, and the tail leaves from the wing's tip, so the two read as one grey hook down the bird's left side.

---

BIRD 32 Peregrine Falcon: FAIL (review 3: parked)
Verdict: The penguin is broken. A cream bib over a grey-barred belly reads as a falcon's front, and the wing tip now lies on a tail that projects past it. The one fault is that tail: a straight-edged stick whose end sits 3 units from the bottom of the box.
Neighbours at 40px: Jacobin Cuckoo (35), Magpie-Robin (14), Brahminy Kite (40), 53 (its pair), told apart from 35, 14 and 40 by colour: slate body, cream bib, grey belly.
Review 2: fault 1 (shirt front) fixed: the cream bib (`M49 46 ... Q74.3 64 69 66 Q58 67.5 49 63 ...`) stops at about y 66, and below it the front is one mid-tone, `mix(SLATE, PALE, 0.45)`. Every bib join turns 16 degrees or less. Fault 2 (two stubs) fixed: the wing tip (24-30.5, 76-86.5) lies inside the tail's width, with no paper between them, and the tail's end shows about 7 units past it.
Faults:
  1. [line 1, line 9] The tail is a straight stick that nearly touches the bottom of the box. Its lower edge, `Q32.6 83.7 41.9 70.9` from the cap at (19.9,92.8), is on the silhouette for about 15.5 units, from the cap to the body's rim at (31.8,82.8). Over that run it bows about 2 percent, px about (85,560) to (178,488). Its upper edge beyond the wing tip is the same. After re-centring (s 1.266), the cap's bottom lands at about y 97, px about 582, 3 units from the bottom edge. Fix: bow both edges to about 7 percent, so the tail is a slim paddle (for the lower edge, e.g. `Q34.5 86 41.9 70.9`, join about 13 degrees). Then shorten the tail 2 to 3 units or ease s, so its end sits at least 6 units clear.
Notes (not blocking):
  - Where the bib's curved bottom crosses the belly's sides, the grey belly forms a short horn up each side between the cream and the slate rim: about 5 units on the right from (74.5,58.5), and about 3 on the left from (46,58). They are crescent horns, like the house's shade crescents, so they are not failed.

---

BIRD 35 Jacobin Cuckoo: PASS
Verdict: A black crested cuckoo, its white underparts held inside a black rim and a short white flash low on a darker folded wing. It reads as the bird at every size and apart from the Magpie-Robin by its crest, dropped tail and lower flash.
Neighbours at 40px: Magpie-Robin (14), Tricolored Munia (46), Black Eagle (36). Told apart from 14 by silhouette: a crest bump and a dropped tail, against a cocked tail. From 46 and 36 by colour: black and white, against a chestnut disc and a sooty brown body.
Review 2: fault 1 (flash tangent to the wing) fixed. The ellipse (35,68) rx 3.2 ry 2.1 at -15 degrees runs from x 31.9 to 38.1. The wing at that height runs from 30.6 to 39.3, so about 1.3 units of wing show on the left and 1.1 on the right. The wing below the bar stays joined to the rest, and the bar is 4.2 units tall.
Faults: none.
Notes (not blocking):
  - The tail paddle's tip has one join turning about 22 degrees at (15.5,87). It has been unchanged since review 1 and reads as a rounded end at 600px.

---

BIRD 36 Black Eagle: PASS
Verdict: A sooty eagle with one paler folded wing running from the shoulder to a tip that lies on its broad tail. The dark eye sits in a brown ring, and the yellow cere sits on a grey hooked bill. Simple and true, and the paler wing is the real bird's paler part.
Neighbours at 40px: Koel (16), Coucal (18), Drongo (17), told apart by colour: warm sooty brown with a dull grey-brown wing and a yellow cere. The Koel and Drongo are cool blue-black with red eyes, and the Coucal's wing is a bright rufous.
Review 2: fault 1 (straight shoulder with an elbow) fixed. The inner edge is one curve, `Q28.5 85.5 30 77 Q32 63 52 44`; its join at (30,77) turns about 2 degrees, and its visible run, about 35 units from (30,77) to where it enters the head at about (48.9,47), bows about 7.5 percent.
Faults: none.
Notes (not blocking):
  - Most of that bend sits in the lower half. The top 19 units, from about (36.5,62) to (48.9,47), px about (231,333) to (305,236), bow about 2.4 percent, and at 600px they still look nearly straight. `Q33.5 60 52 44` spreads the bend more evenly (join at (30,77) about 2 degrees).
  - Review 2's note on the cere still stands: its top stands about 1.4 units above the bill's top edge.

---

BIRD 52 Paradise Flycatcher (candidate): FAIL
Verdict: The Flycatcher to show. Both review-2 slivers are gone: the black throat is now the front of the bird down to the breast, and the wing tucks under the hood at a steep angle. Its one fault is that re-centring put the ribbon's tip 3 units from the left edge.
Neighbours at 40px: Cattle Egret (30), Tricolored Munia (46), 26 (its pair), told apart from 30 and 46 by colour: a black hood on a white body.
Review 2: fault 1 (pointed throat, white sliver) fixed. The hood's front edge bulges to about x 80.7, two units past the body, and is the front silhouette down to about y 44.4. It then turns in across the grey rim at about 33 to 39 degrees and across the white at about 43, and closes through (72,48.5) and (60,46) with joins of 5 degrees or less. No point, and no glancing edge. Fault 2 (white needle between wing and nape) fixed: the wing's front edge (`Q49 45 58 41`) crosses the hood's edge at about (56.4,41.8) at about 80 degrees, and the rest of the wing lies under the hood. Fault 3 (tail tip at the edge) NOT fixed: see below.
Faults:
  1. [line 9] The tail's tip is 3 units from the box edge. The comment says the tip sits six units clear after re-centring, but the bird was re-seated at s 1.031, x -5.69. The ribbon's leftmost point (10.1,83.6) now lands at about x 3.2, px about 19, against review 2's ask of at least 6. Fix: runner, ease s to about 0.98, or end the ribbon about 3 units sooner.
Notes (not blocking):
  - The hood's lower-left corner at (56.2,35.3) turns about 41 degrees, black on the grey wing, px about (304,244). It is a soft corner on a low-contrast edge, unchanged since review 2. If it is touched, round it like the throat.
  - Along the back, the grey shade is still a 0 to 1.4 unit hairline outside the white (review 2's note). The wing lobe, 1.5 to 3 units inside, makes the back's edge at 40px.

---

BIRD 53 Peregrine Falcon (candidate): FAIL
Verdict: Now plainly a perched falcon. A leaning teardrop body, a sickle wing laid down the back with its tip on the tail, a cream bib over a barred belly, and the set's best falcon face. The penguin reading from review 2 is gone. It fails on finish: two long edges are still ruler-straight, four regions pinch together at the nape, and re-centring set its tail 3 units from the bottom of the box.
Neighbours at 40px: Jacobin Cuckoo (35), Magpie-Robin (14), Brahminy Kite (40), 32 (its pair), told apart from 35, 14 and 40 by colour (slate, cream face and bib) and by silhouette (the leaning teardrop).
Review 2: fault 1 (penguin) fixed, by both changes. Fault 2 (cream past the slate) fixed: the bib stays 4.6 to 5.4 inside the body's edge and the barred belly 4.9 to 6 inside. Fault 3 (ruler-straight wing edge) NOT fixed: see fault 2 below. Fault 4 (sharp cheek point) fixed: `Q61 42 61 39.5 Q61 37.5 58.5 37.8` rounds it, with joins of 12 degrees or less and about 2.9 units of hood under the ring. Fault 5 (too big) not fixed: see fault 4 below.
Faults:
  1. [line 1] The underside is a ruler line with an elbow. The segment `Q45 79.5 32 89` from (62,75) runs from the belly to the tail on the silhouette for 33 units. It bows about 4.7 percent, slightly inward. Where it leaves the belly's curve at (62,75) the outline turns about 18 degrees, so at 600px it reads as a corner and then a straight diagonal, px (393,465) to (164,572). Fix: one clear curve from the belly round to the tail, bowing at least 6 percent in either direction, with the join at (62,75) under about 10 degrees. For example, `Q50 86 32 89` (convex, join about 10 degrees), then ease the next control so the join at (32,89) stays under 20.
  2. [line 1] The wing's inner edge is still ruler-straight. `Q33 62 48 36` from (29.1,83.2) bows about 4.2 percent of its 51-unit chord. About 47 units of it show, from the tip to where it enters the cream head at about (46,39.6), px about (152,525) to (275,195). Fix: bow it back further, e.g. `Q31 58 48 36` (about 7.5 percent, join at (29.1,83.2) about 12 degrees). The wing stays about 11 units wide at y 61 and well clear of the belly.
  3. [line 8] Four regions pinch together at the nape. The hood's back-bottom corner at (45.2,38) lies 0.2 inside the wing's top edge (which passes (45.1,37.8)) and 0.3 outside the cream circle. Just below it, the wing's inner edge runs along the cream circle's edge (both at about x 46 at y 39.6) and then splits off, leaving a slate needle that widens downward between the dark wing and the cream neck. Dark hood, darker wing, slate and cream all meet within about 2 units, px about (262-280, 180-215). Fix: end the hood's mask line at least 2 units inside the cream circle, rounding its corner. Bring the wing's shoulder in under the cream head at a clear angle, so its inner edge does not run along the circle and no slate tapers between them.
  4. [line 9] Too low in the box. Seated at s 1.275 (the comment asks for about 1.17), the tail's bottom (about (28,90.4)) lands at about y 97, px about 583, 3 units from the bottom edge. Fix: runner, re-seat at about s 1.17, as the drawing intends.
Notes (not blocking):
  - The grey belly forms a short horn up the bib's left side, from (50.7,54) to (47.8,57.5), 0 to 2.7 units wide. It is a crescent horn like 32's, so it is not failed.
  - The cream chin in front of the moustache still sits about 1 to 3.5 units beyond the slate body at y 36 to 38, cream on paper. It is visible at 600px and too small to matter at 40px.

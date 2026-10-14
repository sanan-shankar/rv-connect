# U2b, independent review 1 (2026-10-14)

Review 1 of U2b: the six fixed birds (14, 29, 34, 38, 39, 48) and the candidate 51, judged against `reviewer.md` and the U2b rows of the handover's ledger (F2, F8, F18, F20, F23, F25), one Opus reviewer who did not draw them.

None pass. Seven fail: 14 Magpie-Robin (3 faults), 29 Golden Oriole (1), 34 Blue-faced Malkoha (2), 38 Common Kingfisher (4), 39 Jerdon's Leafbird (3), 48 Green-Pigeon (2), 51 Yellow-footed Green-Pigeon (4). Every ledger action was carried out: the Oriole's sunglasses are gone, the Kingfisher is brighter, the Malkoha has two greens and a bigger blue face, the Pigeon has no lilac by the eye. What fails is mostly what the action left untouched or created: shapes that float, shapes that bite each other, and corners on the silhouette. Coordinates are viewBox units (0..100) from the source. "px" is a point on that bird's 600px render in `e2e/.shots/birds/`, which includes the bird's re-centring transform.

A pattern to fix once rather than seven times. In 29, 34, 48 and 51 the head circle lies wholly inside the body (34's farthest head point is about 29.9 from a body of radius 31, and the same check holds for 48 and 51), so the bird's outline is a plain disc or egg. The head then shows only where its edge cuts into some other shape (34's wing) or as a colour patch (51's yellow). The 600px renders read as balls with faces, and line 7 asks for "the head set up and forward". Separately, 29, 34 and 39 have one bill path stamped three times (base about 8 tall at x 69-71, a down-curved top, tip at x 84-85). Each is fine alone, and the birds are told apart at 40px by colour anyway, but a birder would not draw an oriole's, a malkoha's and a leafbird's bill alike. That is a note, not a fault.

The three things the drawer was least sure of:
- Magpie-Robin: the belly egg reads as a white belly on a black ball (the penguin read works). The wing-bar ribbon does not read as a wing. It is a long thin crescent following the body's left outline, and it looks like a gloss highlight on a bowling ball. So one white shape is solved and one is still arbitrary.
- Green-Pigeon 48: the three lozenges read as mechanical bands, a stack of three pills (a hamburger, or a sideways traffic light). They are flat, almost the same size, stacked on one centre line, and they ignore the body's curve.
- Leafbird: half in, half out. The disc's lower half (#121110) vanishes into the bib (#23201C), so what reads is a black dome sitting on the rim of the mask, not a round eye in a face.

48 against 51 at 40px: told apart by colour (lime with a pink and orange bar, against olive with a big yellow front). Their silhouettes are the same ellipse with the same legs.

---

BIRD 14 Magpie-Robin: FAIL
Verdict: The body is shorter and the white belly now sits where a real belly sits, but the tail reads as a hollow black loop and the wing-bar reads as a shine on a black ball, so two of the three white shapes still feel arbitrary, which is what he said.
Neighbours at 40px: Jacobin Cuckoo (35) and Tricolored Munia (46) on the sheet; Indian Robin (15) from source (same tail, body and head geometry). Told from 35 by silhouette (tail cocked up-left with no crest, against a crest and a tail swept down) and from 15 by colour (white belly, against a chestnut vent).
Faults:
  1. [line 2, line 10] The tail's white panel (M24 27 ... 35 37 ... 28 37) sits so close to the tail's upper-right edge (24,25)->(36,36) that the black between them is about 1.4 units thick (measured at mid-curve, (30.5,29.3) against (29.8,30.5)). WHITE #F6F1E7 is almost the paper #F5F2EA, so the tail reads as a thin black outline round a hole: a loop or a teapot handle (600px, the rim from about (75,45) to (120,150)px). Fix: delete the white panel, which also takes one shape off. Or narrow it so at least 3 units of black run along the upper-right edge: shift the panel's right edge to (26,30) Q30 32 32 38.
  2. [line 5, line 8] The wing-bar ribbon (44,47)->(35,73) has no wing to belong to. It runs steeply down the flank, about 70 degrees from horizontal, parallel to the body's left outline and the belly's left edge, so it reads as a reflection, not a feather mark. The real patch runs lengthwise along the folded wing, from the shoulder back towards the tail. Fix: one broader, shorter lozenge laid along the back, from about (50,50) to a rounded end near (34,58), at least 5 units deep, kept at least 3 units clear of the belly.
  3. [line 4] The eye disc INK #33302B is lighter than the head BLK #2E2A2C, so the eye reads as a faint grey smudge round a white dot (600px, about (420,135)px). Fix: the Drongo's treatment, a warm dark-brown iris (about #5A3424, r 4.4) with an INK pupil (r 2.6) and the catchlight.
Notes (not blocking):
  - The belly egg's black rim below (body bottom about y 82, belly bottom y 79) is a clean 3 units and reads as the belly turning under. Good as it is.

BIRD 29 Golden Oriole: FAIL
Verdict: The sunglasses are gone. The stripe now trails behind the eye and clear yellow separates it from the pink bill, so the face is one face. But the bird is still a yellow disc with a black spot on its back, and that spot reads as a hole, not a wing.
Neighbours at 40px: Yellow-footed Green-Pigeon (51) and Yellow-wattled Lapwing (24), told apart by colour: the only bird that is all gold, with a black dash and a pink bill.
Faults:
  1. [line 5, line 7] The wing is a free black oval, (33,64) rx 8 ry 9, inside a perfect circle (49,55) r 33, with no head and no tail in the outline. Black wings are this species' second field mark, and a floating oval does not read as one. At 600px it is a black disc at about (180,365)px, and at 40px the bird is a yellow ball with two black dots. This is the "layout is a bit weird... doesn't really look like a coherent picture" he named in ¶20, and the stripe fix did not reach it. Fix: draw the wing as one black teardrop folded along the back, from the shoulder at about (44,50) to a rounded tip towards the rear at about (22,68), 7 to 9 units deep, with its upper edge following the body's curve. That still leaves only five shapes. Optionally let the head break the outline a little (a head circle about (60,38) r 14 over the body) so the bill emerges from a head, not from the middle of the disc.
Notes (not blocking):
  - The eye (INK #33302B) and the stripe (#2E2A26) are the same dark, so the eye has no edge where the two join and is found by its catchlight alone. At 600px the round front end still reads as an eye. If the runner wants it crisper, the real bird's iris is dark red: a #8A2A22 iris with an INK pupil, as on the Drongo.
  - The bill (8.5 at the base, tapering to about 2.5 at a soft down-turned tip) passes line 1.

BIRD 34 Blue-faced Malkoha: FAIL
Verdict: The colour action is done: one olive body, one wing a clear step darker, and a bigger blue face that now carries the bird. But the head is hidden inside the body and shows only as a bite out of the wing, so the dark shape "inside" that he questioned is still an odd shape.
Neighbours at 40px: Jerdon's Leafbird (39), Yellow-footed Green-Pigeon (51) and Green-Pigeon (48), told apart by colour: dull olive with a large blue face patch.
Faults:
  1. [line 8] The head circle (57,44) r 14 is drawn over the wing ellipse (42,62) rx 15 ry 13. Because the head is the body's own olive, its outline appears only as a concave bite out of the wing's upper right, from about (47,49) to (60,54) (600px, (280,250) to (380,315)px). The wing reads as a crescent moon, not a folded wing. This is the "two shapes cutting" of ¶31 and the "inside, we have a dark" of ¶24. Fix: move the wing back and down, to about (37,66) rx 14 ry 12, so it clears the head by at least 2 units and keeps its own full rounded outline.
  2. [line 7] Every point of the head lies inside the body circle (46,56) r 31. Its farthest point is about 29.9 from the body's centre, so the outline is a plain disc and the bird has no head set up and forward. Fix: raise the head and push it forward, to about (60,38) r 14. Its top is then about 4 units above the body's outline at x 60, the blue face moves with it, and the bill stays on the head.
Notes (not blocking):
  - Even with two greens it is the dullest bird in the unit. That suits the real bird, and the blue is now the accent that sings, so it is not failed.

BIRD 38 Common Kingfisher: FAIL
Verdict: Brighter, as asked, and nothing structural was moved. But the unit owns this bird's edges (F17), and it still has a chopped bill highlight, a straight-sided belly and a pointed cheek on its outline.
Neighbours at 40px: none close on the sheet. In the full set: Verditer Flycatcher, and the two bee-eaters by their long bills. Told apart by colour: the only cyan-and-orange bird.
Faults:
  1. [line 1] The gloss wedge's base is a flat vertical chop, (77,44.5)->(77,38.5), 6 units long, between the gloss and the bill (the edge audit lists it, and nothing hides it; 600px about (462,195-225)px). The chisel allowance covers the bill's own outline, not a highlight inside it. Fix: round its base (… L77 44.5 Q75.6 41.5 77 38.5 Z), or delete the gloss, which takes one shape off and the bill still reads.
  2. [line 1] The orange belly (M47 55 Q74 57 73 80 Q57 88 42 81 …) leaves the body's outline at about x 71 and runs down almost straight to a corner at (73,80), where the edge turns about 63 degrees. At 600px that is a ruler-straight right side from about (430,340) to (435,480)px and a corner at the bottom right. Fix: keep the edge inside the body and round the corner, e.g. M47 55 Q71 57 70 71 Q68 83 56 85 Q46 85 42 81 Q39 64 47 55 Z.
  3. [line 1] The orange cheek's lower-right point (76,58) lies outside both the head (distance 22.8 against r 19) and the body. It shows as a sharp corner jutting into the paper (600px about (455,330)px), where the edge turns about 60 degrees. Fix: bring the point inside the head and round it: M58 44 Q73 45 72 54 Q69 61 62 60 Q54 53 58 44 Z.
  4. [line 8] The dark-orange oval (56,73) rx 13 ry 10 reaches y 83, while the belly's lower edge at x 56 is about y 84.2, leaving a lighter orange sliver about 1 unit thick under it (600px, (240-430, 475-500)px). The brighter oranges make the sliver more visible than before. Fix: ry 8 at cy 71. Or delete the oval, since the real bird's underside is one orange.
Notes (not blocking):
  - The colour change is good: CYAN #12B6EA and ORG #F27A1F are the kingfisher's jewel colours, no longer the dull ones he named.

BIRD 39 Jerdon's Leafbird: FAIL
Verdict: Every colour is kept and the face is closer: one black mask-and-bib, a grey bill that parts from it, and a turquoise moustache from the bill base. But the eye half sinks into the black, and the wing beneath is cornered and cut by the shapes laid over it, so the structure is not yet the clear one he asked for.
Neighbours at 40px: Green-Pigeon (48), Blue-faced Malkoha (34) and Yellow-footed Green-Pigeon (51), told apart by colour: saturated grass-green with a black face.
Faults:
  1. [line 4] The eye (62,39.5) r 4.4 sits on the mask's top edge, which runs through its centre (mask top about y 38.5-40.5 at x 55-70). Its lower half (#121110) has no visible edge against the bib (#23201C), so the eye reads as a black dome on the mask's rim (600px about (407,167)px), half in and half out, not one round eye in a face. Fix: keep the position and give the eye a warm-brown iris (about #7A4A2A, r 4.4) with an INK pupil (r 2.8) and the catchlight. The leafbird's iris is brown, and a brown ring reads whole against both the green and the black.
  2. [line 1] The wing path has two visible corners and an almost straight side. At (24,50) the edge turns about 43 degrees, and from there to (22,64) it bows only about 1 unit over 14, so it reads as a ruler line (600px (115,245) to (105,350)px). At (40,82) the lower end turns about 58 degrees, a pointed tip inside the body (600px (240,490)px). Fix: one rounded teardrop with smooth joins, e.g. M26 52 Q40 45 50 54 Q50 70 41 80 Q30 82 24 70 Q20 60 26 52 Z.
  3. [line 8] Three overlaps cut the wing. The green head circle (58,42) r 16 bites a concave arc out of the wing's top right, from about (43,48) to (50,57) (600px (265,235) to (320,300)px). The lime breast (opacity 0.8) and the warm wash (opacity 0.55) both lie across the wing's right edge, so that edge ghosts through them as a seam, with muddy mixed tones at about (44-48, 60-78). He said nothing should be reduced, so keep all three. Fix: make the breast and the wash opaque and bounded, the wash wholly inside the wing and the breast wholly in front of the wing's edge, and keep the wing at least 2 units clear of the head.
Notes (not blocking):
  - The moustache now starts at the bill base and runs back along the jaw, below the eye, so it no longer crosses the eye or sits on the bill. That part of the face fix works.

BIRD 48 Green-Pigeon: FAIL
Verdict: The lilac by the eye is gone and nothing overlaps any more, but the breast is now three pills stacked like a hamburger, and the grey crown is an oval resting on the eye of a bird with no head. The colours still feel random, which is what he said.
Neighbours at 40px: Yellow-footed Green-Pigeon (51), Jerdon's Leafbird (39) and Blue-faced Malkoha (34), told apart by colour: light lime with a pink and orange bar. Against 51 the silhouette is identical.
Faults:
  1. [line 5, line 8] The lilac (56,61) rx 12.5 ry 3.6, the orange (56,69) rx 14.5 ry 4.5 and the belly (49,77.5) rx 15 ry 4.5 are three flat horizontal lozenges of about the same size, stacked edge to edge (orange over belly by 0.5) and unrelated to the body's curve. They read as mechanical bands, not a breast. The pale third band is also a fourth colour that matches no field mark. Fix: make the breast one shape. A lilac collar as a crescent wrapping the front of the neck under the head, following the head's curve, laid over the top of one orange breast lobe so the two share a single curved border. Drop the pale belly band: the real bird's belly is the body's yellowish green.
  2. [line 7, line 4] The head circle (58,44) r 11 lies wholly inside the body ellipse (its top, (58,33), is at 0.73 of the ellipse's radius), so the "crown" is a grey oval floating on a ball. The cap (58,38.3) rx 8.5 ry 4.5 reaches y 42.8 and the eye (61,43) r 4.4 starts at y 38.6, so the grey sits about 4 units into the eye and reads as a heavy grey eyelid. Fix: raise the head so its dome breaks the body's outline (about (60,37) r 12), put the grey cap on that dome, and leave at least 2.5 units of green between the cap and the eye.
Notes (not blocking):
  - The bill and the red legs (round-ended stubs) pass.

BIRD 51 Yellow-footed Green-Pigeon (candidate): FAIL
Verdict: The right bird in the right colours (olive, a yellow-olive front, grey crown, mauve shoulder, bright yellow feet), and the feet are a good field mark. But the yellow head and breast meet in two sharp notches, an olive needle runs down its front, and the crown rests on the eye, so it looks like a yellow chick standing in front of a green egg.
Neighbours at 40px: Green-Pigeon (48), Blue-faced Malkoha (34) and Golden Oriole (29), told apart by colour: olive with a large yellow front. Against 48 the silhouette is the same.
Faults:
  1. [line 1, line 2] The head circle (58,44) r 11 and the breast circle (58,64) r 17 cross at about (48.6,49.8) and (67.4,49.8). The olive shows there as two sharp V cusps pointing into the yellow (600px about (295,245) and (465,245)px). Fix: draw head and breast as one pear-shaped path with concave curved joins at the neck, not two crossing circles.
  2. [line 2, line 8] The breast circle almost reaches the body's edge on the right. The olive between them is a crescent about 2.8 units at its widest (y 64) that tapers to nothing near (71,75) (600px, (500-515, 330-465)px). Fix: about (56,64) r 16, which leaves at least 3.8 units of olive all round.
  3. [line 4] The grey crown (57,38.5) rx 7.5 ry 4.3 reaches y 42.8 and the eye (61,43) r 4.4 starts at y 38.6, so the grey sits on the eye as a lid, the same fault as 48's fault 2. Fix: crown on the dome (cy about 36.5, ry 3.5), eye down to about (62,45.5), at least 2.5 units of yellow between them.
  4. [line 5] The mauve patch (31,52) rx 7.5 ry 9 floats at the back of an olive ball with no wing to belong to. It sits where the rump would be, not the shoulder, and reads as a lilac egg stuck on the back. Fix: move it to the bend of the wing just behind the yellow front, about (40,50), smaller (rx 5.5 ry 6.5), with at least 3 units of olive between it and the yellow.
Notes (not blocking):
  - At 11 shapes it is at the top of the element budget. The toe pads are what keep it there. They read well, so keep them and do not add anything else.
  - Judging the Q3 pair as it stands: neither is ready. Once fixed, 51 is the more coherent bird, because its colours are the real bird's in three clear zones, while 48's colours are the ones he called random.

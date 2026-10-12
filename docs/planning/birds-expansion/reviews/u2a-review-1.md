# U2a, independent review 1 (2026-10-11 to 12), two Opus reviewers, verbatim

Four pass: 4 Kingfisher, 19 Treepie, 27 Pond Heron, 30 Cattle Egret. Thirteen fail. The runner's
scope decisions for the fix round are at the end; everything above that line is the reviewers'
own words, unedited.

## Reviewer A: 4, 5, 9, 10, 12, 17, 18, 19

One thing I did not count as a fault. Several birds have a bill floating inside the disc rather than poking out of it (Pitta, Barbet, Treepie). The Verditer (31), which the owner called "super simple, super cute, great job", does the same, so I treat it as the house style the owner has already approved.

BIRD 4 Kingfisher: PASS
Verdict: A White-throated Kingfisher you can name at a glance: chocolate head, white bib, turquoise back and a slim coral dagger (7.5 deep at the base, tapering to a 2.5-unit soft round tip); nothing on it looks cut.
Neighbours at 40px: Roller (50), Verditer Flycatcher (31), Common Kingfisher (38), told apart by colour: chocolate head plus white bib plus coral bill on turquoise.
Faults: none.
Notes (not blocking):
  - The chocolate belly band's left end bulges up past the bib like a knuckle at (31-36, 64-73), with a small dimple at (32.5,73), px (199,420). Optional: start it at (33,68) and pull the curve's control point in.
  - The bill tip is 2.9 units from the frame (px ~583), right at the 3-unit limit.

BIRD 5 Pitta: FAIL
Verdict: The colours are the Indian Pitta's, but the black stripe still ends in cut corners, the eye melts into it, and the red patch under the eye reads as a mouth, so at 96 and 40px it looks like a cartoon face (heavy brow, blue cheek, red lips) rather than a bird.
Neighbours at 40px: Barbet (9), Parakeet (6), Indian White-eye (49), told apart by colour: the big azure circle and the buff lower half.
Faults:
  1. [line 1] The head stripe's two ends still read as chopped. Each lower corner is a sharp angle: 67 degrees at (69.5,44.2), px (443,244), and 54 degrees at (42.5,44), px (246,242). The top corners are 13 and 34 degrees. Fix: give each end two curve segments through a tip point so the end is rounded and joins both edges smoothly. Or draw the stripe as one stroke with round caps along its centre line (about `M41.5 40 Q56 31.5 70 40.8`, width about 7), which guarantees round ends.
  2. [line 4, line 7] The eye (62,44) r4.4, px (388,242), reaches up to y 39.6, which overlaps the stripe's lower edge (about 41.6 at x 62). Both are INK, so the eye reads as a drip hanging from a black bar, and the bar becomes a scowling brow. Fix: leave at least 1.5 units of buff or green between them. Either lower the eye to about (62,47.5) or raise the stripe about 3.5 units.
  3. [line 5, line 7] The scarlet vent (53-71, 68-80), px ~(381,461), sits at the front of the belly directly under the eye. The real bird's scarlet is the vent and undertail at the rear, and here it reads as a red mouth. Fix: move a same-size or smaller rounded lobe to the bottom rear, under the blue patch, centred about (38,77).
Notes (not blocking): the bill is tan (#C9B48E) where the real bird's is dark; its tip is 1.5 units inside the disc edge.

BIRD 9 Barbet: FAIL
Verdict: Still the lovely Coppersmith he liked, and both round-2 fixes landed, but both ends of the red breast band and the back end of the forehead band are still sliced at a slant instead of rounded.
Neighbours at 40px: Pitta (5), Parakeet (6), Indian White-eye (49), told apart by colour: the yellow face between two crimson bars on green.
Faults:
  1. [line 1] Both ends of the breast band have a sharp top corner where the curved top edge meets the end. Top-left is 71 degrees at (34,62), px (188,350); top-right is 62 degrees at (69,62.4), px (435,353). Each end reads as cut on a slant with a pointed upper horn. Fix: the band is nearly uniform in thickness (4.2 to 5), so draw it as one stroke with round caps, e.g. `M34.9 64.5 Q51.5 72 68 64.5`, width about 4.4. Or give each end two curve segments through a tip point so it joins both edges smoothly.
  2. [line 1] The forehead band's back end (`Q37.4 40 40 36`) bows only 1.6 units across a 6-unit end. It meets the lower edge at a 47 degree corner at (41,42), px (237,209), so it reads blunt and cut. Fix: two curve segments through a tip point, e.g. `... Q55 37.4 41 42 Q37.2 42.4 37.4 39.2 Q37.8 36.2 40 36 Z`.
Notes (not blocking): the forehead band's front end thins to about 2.7 units before its round tip, borderline on line 2; the bill tip is 1 unit inside the disc edge.

BIRD 10 Hornbill: FAIL
Verdict: The new banana bill is right: big, tapering from 12.5 to a 3.6-unit soft tip. But the dark casque is now a tall dome nearly as big as the pale bill under it, and it touches the eye, so at 96 and 40px the eye and casque read as one dark lump on top of the beak. That is the Black Eagle problem (paragraph 26), and the drawer's doubt is confirmed.
Neighbours at 40px: Sirkeer Malkoha (11), Laughing Dove (3), Cattle Egret (30), told apart by colour and silhouette: cool grey body with a pale down-curved banana bill (the Malkoha is olive with a red bill).
Faults:
  1. [line 4] At x 70 the casque spans y 30.3 to 38.5, 8.2 units tall, of which about 5.3 stand above the top of the bill; the pale bill showing below it is about 9 units deep. So it is a dome, not a ridge (top at px (476,127)). Its front knob overhangs the top of the bill at (78.6,39), px (538,190), leaving a step. Its rear corner (61.3,38.2), px (413,184), sits inside the eye: 4.33 units from the eye's centre, radius 4.4. Fix: keep it dark but make it a low ridge that reads as the bill's own top edge. Rear end at about x 64, at least 1.5 units clear of the eye. Top no more than about 3 units above the bill's top edge (about y 32.8 at x 70) and running parallel to it. Underside no more than about 1 unit inside the bill. Front tapering onto the bill's top edge at about x 75, with no overhang and no step.
  2. [line 4] The bill's rear edge (x 60.3 to 61.5 at y 38 to 44) runs about 1.2 units under the eye (eye at (58,41) r4.4, px (389,205)). The eye is jammed into the corner between bill and casque. Fix: leave about 1.5 units of grey around the eye. Move the eye to about (56.5,41.5) and start the bill's rear edge at x 62.5 or more.

BIRD 12 Y-T Bulbul: FAIL
Verdict: Still the glowing bulbul he liked, but the yellow hood has three stacked sharp corners beside the crest, the pale patch in the yellow under the tail has a small flat edge, and the brightest glow sits off the eye (his paragraph 33 "white circle").
Neighbours at 40px: Golden Oriole (29), Black-hooded Oriole (20), Hornbill (10), told apart by colour and silhouette: a grey body under a yellow head, with the upright crest.
Faults:
  1. [line 1] Three corners stack at the hood's top-left, just left of the crest base. Each layer's top edge leaves its corner almost flat: the halo at (44,30) at about 51 degrees, px (274,116); the olive hood at (46,31) at about 62 degrees, px (288,123); the core yellow at (47,33), px (295,137). Fix: start each layer at a point hidden under the crest base (x 50 to 53, y 30 to 32.5) and close it with a curve that joins smoothly. Example for the halo: `M50 30 Q70 30 74 48 Q75 62 64 70 Q52 74 44 66 Q38 56 39 44 Q39.5 31 50 30 Z`. Hood: `M51 31.5 ... Q42.5 32.5 51 31.5 Z`. Core: `M53 32.6 ... Q44.5 34 53 32.6 Z`.
  2. [line 1] The pale glow inside the yellow undertail patch (`M29 72 ... Q38 73 32 71 Z`) closes with a 3.2-unit straight line from (32,71) to (29,72), px (191,400) to (170,407). It shows as a flat edge at the top of the pale patch. The audit misses it because it only lists edges of 5 units or more. Fix: `... Q38 73 32 71 Q29.6 70.6 29 72 Z`.
  3. [line 4] The brightest glow (61,42) rx5.5 ry6, px (392,199), sits up and right of the eye (60,46), px (385,249). The eye straddles the glow's lower edge, half in and half out, like a misprinted eye-ring. Fix: centre it on the eye (cx 60, cy 46, rx and ry about 7) so it reads as a deliberate pale ring, or delete it. This is ledger row F27, owned by unit U2b; route it there if you prefer.
Notes (not blocking): the bird has 17 shapes, 8 of them partly see-through, which exceeds line 3's budget and line 10's flat-fills rule, but the owner explicitly accepted "a lot of elements" (paragraph 33) and the ledger locks the bird (F28). The dark streak inside the wing is about 2.25 units wide, under line 2's 3-unit floor (its pointed end is hidden under the yellow patch). The crest top is 2.8 units from the frame.

BIRD 17 Drongo: FAIL
Verdict: The fork is now smooth with round tips and a rounded notch, which was his ask. The face lets it down: a blue gloss streak runs into the eye like eyeshadow, and the eye is paler than the black around it, so at 96 and 40px only its glint shows.
Neighbours at 40px: Little Cormorant (28), Koel (16), Indian Robin (15), told apart by silhouette: the forked fish-tail at the left.
Faults:
  1. [line 4] The head gloss ellipse (60,40) rx6 ry3, px (399,195), overlaps the eye (65,42) r3.6, px (435,210), from x 61.4 to 66. It reads as a blue eye-stripe, not a shine on the crown. Fix: move it onto the crown clear of the eye, e.g. cx 58, cy 35.5, rx 5, ry 2.4, which leaves 2 units or more of black between them.
  2. [line 4] The eye's fill (INK #33302B) is lighter than the head (#29262F) and has no pupil, so it is not the darkest point on the bird. The Black Drongo's real eye is dark red-brown. Fix: a deep red-brown iris (about #4E2A26, r 3.6) with a pupil darker than the body (about #141218, r 1.9) plus the catchlight. Alternatively, keep the INK eye and ring it with a GLOSS ring about 1 unit wide.
  3. [line 2, line 3] The tail gloss is a 2.2-wide stroke (`M11 41.5 Q19.1 44.3 25.5 50`), px (47,206) to (151,267). It is under the 3-unit floor, and it is the bird's fifth mark (with the underside shade, back gloss, glint and head gloss). Fix: delete it; the blades read without it.
Notes (not blocking): the bump at (64,35) sits on the crown above the eye rather than the forehead and reads a little like an ear at 220. The size now looks in line with its neighbours, so the drawer's doubt about the 18% shrink does not show.

BIRD 18 Coucal: FAIL
Verdict: Reads as a Greater Coucal (black body, chestnut wing, red eye), but the bill is the thick blunt hook he objected to (paragraphs 41 and 42), a sliver of paper and a hairline show under it, and the wing edge still has a notch and a pointed shoulder.
Neighbours at 40px: Bay-backed Shrike (42), Koel (16), Black Eagle (36), told apart by colour: a body split black and chestnut, with a long dark tail sweeping down-left.
Faults:
  1. [line 1] The bill is a club. It is about 8.5 deep at the base, still about 6 at the bend, and ends in a round knob about 5 units across, running from (85.2,43.2) to (79.5,48.3), px (578,216) to (536,253). It is as thick at the hook as at the base. Fix: taper it from 8 at the base to about 5 or 6 mid-bill and a soft round tip 3 units across or less. For example: top edge `M72 37 Q82 36.8 85.6 44.4`, tip `Q86.2 47 84.2 47.2`, underside `Q80.4 43.4 ...` back to the base. That gives about 8.6, then 6.0, then 3.9, then a 3.1 tip.
  2. [line 1, line 8] The underside rises to (72.5,45) inside the head while the head's edge at y 45 to 47 is at x of about 74. That opens a needle of paper under the bill, pointing in at (74.7,44.8), px ~(501,227), and the 0.8-wide lower stroke `M72.8 45 Q78 46.6 82.5 46.5` crosses that paper as a hairline (the wedge the drawer noted). The bill's rear edge `Q71.5 41 72 37` is also visibly straight, with a square top corner against the head (BILL #211E22 on BLK #2A2730), px x 481 at y 170 to 229. Fix: draw the head path and circle after the bill so the head's round edge becomes the bill's base. End the underside inside the head, at about (70.5,48.5), which leaves an obtuse chin notch instead of a needle. Delete the lower stroke.
  3. [line 1] Wing corners. The right edge turns at (46.5,42) in a 41-degree notch, px (293,207), and the light inner layer repeats it at (43,44), px (267,222). The shoulder tip `Q48.6 24.8 44.5 27.8` kinks 30 degrees at (44.5,27.8), px (279,102), so the top of the wing stands up like an ear. The darker patch's top-left corner (22.5,60), px (116,339), sits 3 units inside the wing edge as a visible point. Fix: make the right edge one curve from (46.5,76.5) to the shoulder, `Q54 52 49 29`; it disappears under the head above y of about 40. Same for the light layer, `Q50.5 52 46.5 31`. Round the shoulder with `Q48.8 27.4 44.5 27.8`. Start the darker patch on the wing's outline at about (19.5,60.5).
  4. [line 3] The bird has six marks: the tail streak, the light wing layer, the darker wing patch, the crown gloss and two bill strokes. Fix: drop both bill strokes (fault 2 already removes one) and the crown gloss at (56,36), px (363,163), which reads as a smudge. That leaves three.

BIRD 19 Treepie: PASS
Verdict: The Rufous Treepie he called fine: orange-rufous body, sooty hood, pale wing panel, rounded nape; nothing cut, nothing sharp.
Neighbours at 40px: Tricolored Munia (46), Brahminy Starling (23), Bay-backed Shrike (42), told apart by colour: a lighter orange-rufous body with a mid-grey (not black) head and a pale rear patch (the Munia is deep chestnut with a black head and a white bib).
Faults: none.
Notes (not blocking):
  - The nape band's rounded end meets its underside at a 56-degree point at (31.5,45.6), px (170,223). It is visible only when zoomed; the end reads round.
  - The bill (base 72) sits on rufous, 2.6 units clear of the grey hood (hood edge 69.4 at y 44, px 454 vs 473). If it is ever touched, start the bill at x 70.
  - The bill tip is 1.2 units inside the disc edge.

## Reviewer B: 20, 21, 27, 28, 30, 40, 41, 42, 46

One pattern behind four of the fails. The house `Eye` paints its disc in INK `#33302B` (51,48,43). On a field darker than that, the eye shows as a grey lens around the catchlight. I sampled the renders: Oriole hood (46,42,38); Flameback stripe (43,40,36); Shrike mask (36,31,28); Munia hood (20,17,15). So on those four birds the eye is not the darkest point (line 4). An Eye prop for pupil colour or an iris ring would fix all four at once.

BIRD 20 Black-hooded Oriole: FAIL
Verdict: The yellow ball with a black hood and a pink bill coming out of the hood reads as the species, but the eye is lost in the hood and the wing points forward like a flipper.
Neighbours at 40px: Golden Oriole (29), Indian White-eye (49), Y-T Bulbul (12), told apart by colour: a whole black head disc on yellow, against an all-yellow head.
Faults:
  1. [line 4] The eye is the wrong colour. The INK disc is lighter than the hood (#2E2A26). At 600px it is a faint grey ring around the catchlight at about px (380,200); at 40px only the catchlight shows. The adult bird has a crimson eye. Fix: a red iris (circle at (60,41), r 4.4, about #B53A3C), a pupil in the hood's colour (r 2.4), and the usual catchlight, the way the Cormorant draws its teal eye.
  2. [lines 7 and 5] The black wing points the wrong way. It is broad at the back (x 30 to 42, y 57 to 66) and tapers to a tip at (54.5,78), aimed forward and down at the belly. A folded wing trails back toward the tail. At 96 to 220px it reads as a flipper hanging off the side (¶36). Fix: reverse it. Put the broad, round end at the shoulder behind the hood, near (43,60), and let it taper back and down along the body's left curve to a round tip near (26,72). For example: M44 57.5 Q47 61 43 65 Q36 71.5 28.5 74.5 Q24.5 75.5 25 72 Q28 63 37 58.5 Q41 56.5 44 57.5 Z
Notes (not blocking):
  - The visible part of the bill's underside (`Q76 48 64 45.6`) is ruler-straight: about 0.3 sag over 11 units. It meets the tip at a 35° kink at (84.1,47.2). Bowing it up slightly, with the control near (74,44.8), would make the comment's "down-curved" true.
  - The second hood path, `M38 40 Q52 32 66 40 ...`, lies entirely inside the hood circle and never shows. Delete it.

BIRD 21 Baya Weaver: FAIL
Verdict: A streaky brown weaver with a golden cap and breast and a pale cone bill, as the owner called "okay"; it fails only on two stray streak ends.
Neighbours at 40px: Indian Pond Heron (27), Sirkeer Malkoha (11), Yellow-wattled Lapwing (24), told apart by colour: the two yellow patches on brown.
Faults:
  1. [lines 1 and 4] The three back streaks (`M28 y Q48 y+4 68 y`) run across the whole bird and poke out at their right ends. One dark stub sits above the cap's tip at (68,36), px (440,150). Another is wedged between the mask and the bill's top corner at (68,46), px (437,225), and touches the bill. Fix: end the streaks on the back, e.g. `M28 ${y} Q39 ${y+3} 50 ${y+1}`. All three ends then fall under the cap, the mask or the breast, and the visible left halves do not change.
Notes (not blocking):
  - The cap is a band with about 6.6 units of brown above it at the eye's x (top edge y≈31.6 at x 57). It reads more as a yellow eyebrow than the breeding male's yellow crown. It had the same position before this unit and he called it okay.
  - The pale bill on a breeding male (the real one is dark) is an accepted compromise for legibility.

BIRD 27 Indian Pond Heron: PASS
Verdict: The hunched buff heron he liked, now with a maroon saddle and a slim yellow dagger bill whose dark tip is part of the bill; nothing on it stops dead.
Neighbours at 40px: Baya Weaver (21), Sirkeer Malkoha (11), Laughing Dove (3), told apart by the maroon saddle on buff (colour) and the head standing off the body (silhouette).
Faults: none.
Notes (not blocking):
  - The crown band reads as an eyebrow resting on the eye. Its lower edge is at about y 39.6 at x 61 and the eye's top is at 38.6. Its lower ends have corners of about 45° at (51.5,42.5) and (68.5,40.8). Lifting it about 1.5 units, so a sliver of buff shows between band and eye, would read as a crown.
  - The visible underside of the bill sags only about 0.45 over 12 units. That is right for a heron's dagger.
  - The mantle sag lands cleanly at (22,60).

BIRD 28 Little Cormorant: FAIL
Verdict: The low black oval he liked, with a green sheen and a teal eye, but the new bill reads as a grey pipe with a cane handle, and the sheen still ends in a point.
Neighbours at 40px: Black Drongo (17), Asian Koel (16), Greater Coucal (18), told apart by silhouette: a wide low oval with a small head bump and a pale bill out to the top right, no fork tail, no chestnut, no red eye.
Faults:
  1. [line 1, ¶41-42] The bill is a tube with a crook. Its depth is about 4.2 at x 68 and 2.9 at x 75.6. Then the hook bulb is as deep as the base again: 39.4 to 43.6 at x≈78.5. There is a notch behind it at (75.6 to 77.2, 41.8 to 43.3). Its rounded base end (59.7 to 61, 37.7 to 41.5) is laid on top of the head, almost touching the eye ring, instead of coming out of the head. The culmen stroke draws a groove along it. At 96 and 600px it reads as a bent pipe. Fix: draw the bill before the head circle so it emerges from the head's curve, as the Oriole, Egret and Pond Heron now do. Taper it from about 4.5 at the head's edge (x≈64.5) to about 2.2 just behind the tip. Turn down only the upper mandible's end, as a soft round nail about 1 unit below the lower edge, with no notch. Drop the culmen stroke. On the drawer's question: 3.8 deep is legible at 40px (about 1.5px against paper). Thickness is not the problem; the shape is.
  2. [line 1] The green sheen's lower edge (`Q40 52.5 23 58`) is nearly straight, about a 7% bow over 27 units, and ends in a 99° point at (23,58), px (90,280). That is a diagonal cut with a corner on the back, the kind of line ¶18 points at. Fix: sag the edge and round the rear end, e.g. M23 55.5 Q21 45 33 42.5 Q40 40.2 46.5 41.5 Q50 43.5 47.5 47 Q40 55.5 25.5 58.6 Q22.4 58.6 23 55.5 Z
Notes (not blocking):
  - The neck path, the ellipse that merges the neck into the body, and the head ellipse at (54.5,45) are black on black and never show. The "raised snaky neck" in the comments is not on screen. Delete them.

BIRD 30 Cattle Egret: PASS
Verdict: A soft white egret with buff plumes and a slim yellow bill that now comes out of the head and ends round; the "sharp stuff" he named is gone.
Neighbours at 40px: Laughing Dove (3), Indian Pond Heron (27), Jacobin Cuckoo (35), told apart by colour: the only white bird, with a peach breast and two legs.
Faults: none.
Notes (not blocking):
  - Line 8: the body, WHT #EFF1EA, differs from the paper #F5F2EA by only 6 in one channel, so the crown and back vanish at 600px (compare ¶25, "the white as white space"). This predates the unit and he called the bird good, so it is the runner's call. A cooler WHT around #E8EBE2, or a 1-unit SHADE rim on the upper back, would give it an edge.
  - The buff crown plume reads as an eyebrow lying on the eye.

BIRD 40 Brahminy Kite: FAIL
Verdict: The bird he loves, a white head and breast set in a chestnut disc, still has a pointed hook and one ruled edge on the white throat.
Neighbours at 40px: Tricolored Munia (46), Bay-backed Shrike (42), Rufous Treepie (19), told apart by colour: a big white head on chestnut, against a black, masked or grey head.
Faults:
  1. [line 1, ¶41-42] The hook ends in a point. `Q80 38 80 45 Q76 43 70 44` meets at (80,45) in a 64° corner, px (530,215). That is the "ultra sharp" tip he does not want, whoever drew it. Fix: give the hook a small round nail and keep the curl. For example: M68 38 Q80.6 38.4 80.4 44 Q80.1 45.6 78.8 44.8 Q75.5 43 70 44 Q67 41 68 38 Z (tip about 1.8 across).
  2. [line 1] The white bib's right edge is the tail of `Q72 30 70 56`. Once it leaves the head circle at about (69.5,44), it runs nearly vertically to (70,56): about 0.4 sag over 11.6 units. It then turns into the lower edge at a 35° corner (px x≈458, y 230 to 300). At 96px it reads as a ruled side. The edge audit cannot see it because the curve's bend is hidden under the head. Fix: replace the joint with a rounded corner and bow the visible side out about 1 unit. For example, `Q75 32 71.5 51 Q70.5 61 62 65.5 Q55.5 68 49.5 65` in place of `Q72 30 70 56 Q60 68 49.5 65`. Nothing else moves.
Notes (not blocking):
  - The black wingtip ends in a 49° point at (41,83), and its inner edge (`Q34 70`) is a near-straight 24-unit diagonal. A small cap on the tip would match the set. This is old work on a bird he loves.

BIRD 41 Black-rumped Flameback: FAIL
Verdict: The crest-and-gold woodpecker he called fine, but its face is the "sunglasses" he objected to on the Golden Oriole (a black bar through a grey eye straight into the bill), and the bird carries more marks than the budget.
Neighbours at 40px: Coppersmith Barbet (9), Y-T Bulbul (12), Hoopoe (0), told apart by silhouette and colour: a large red crest bulging above a gold body.
Faults:
  1. [line 4, ¶20] The eye-stripe (`M52 43 Q64 41 74 46 Q75 49 73 50.5 Q64 46 54 49 ...`) runs through the eye at (61,44) and under the bill's base (68.4 to 71, 43 to 51). Stripe, eye and bill read as one bar, px (360 to 480, 215 to 245). The eye's disc is also lighter than the stripe, so the eye is a grey lens inside the bar. Fix: stop the stripe at the eye with a round front cap near x 64, leaving pale lores between eye and bill. That is also the real bird: the black stripe runs back from the eye. For example: M50.5 44 Q57 41.5 63 43 Q65.5 45.5 63 47.5 Q57.5 46.5 53 49 Q49.8 47 50.5 44 Z. Also make the stripe a shade lighter than INK (e.g. #3F3A34), or the eye's disc darker than the stripe.
  2. [line 1] The moustache stripe's front end is a chop. `Q63 54 71 59 Q70 62 67 62` makes a 76° corner at (71,59) and a kink at (67,62), and the end butts against the gold edge at px (480,345). Fix: end it about 2 units short with a round cap like the eye-stripe's own end. For example, replace that segment with `Q63 54 69.5 58 Q72 60 69.4 61.7 Q68.3 62.2 67 61.8`.
  3. [line 8] The scale spot at (65,61), r 1.9, is half buried under the moustache's lower edge (y≈60.6 at x 65), so it reads as a drip off the moustache, px (435,357). Fix: move it to about (66,65.5). The spot at (59,55) is entirely under the head circle and never shows; delete it.
  4. [lines 3 and 10] The bird has 16 shapes and five marks. The bill's "gloss ridge" (`M72 44.5 L82 46.2 ...`, at 50% opacity) leaves a 1.5-unit dark rim around a grey middle. It reads as an outlined bill, and it makes the bill grey. "Grey" may be the unclear word in ¶28. The darker crown fold (`M41 22 ...`) has three corners, at (32,29), (44,33) and (46,23). Fix: delete both. The bill becomes a single INK chisel; its four L commands stay as the allowed chisel.
Notes (not blocking):
  - The crest's front end makes a 96° corner on the forehead at (65,35).
  - The gold strip between the cream front and the paper on the right (x≈71 to 74) thins to points at both ends.

BIRD 42 Bay-backed Shrike: FAIL
Verdict: The plump bay shrike with a bandit mask he called good, but the eye hangs out of the mask as a grey lens and the hook still reads as a crook.
Neighbours at 40px: Brahminy Kite (40), Rufous Treepie (19), Tricolored Munia (46), told apart by silhouette and colour: a separate chestnut head with a black band across it, and the tail at the lower left.
Faults:
  1. [line 4, ¶20] The eye's disc is lighter than the mask (#241F1C), and its lower third hangs below the mask. The mask's lower edge is at about y 39.9 at x 60; the eye spans 34.2 to 41.8. The face reads as a grey lens in a black band running into the bill, px (375,150). Fix: keep the eye inside the mask (deepen the lower edge to `Q60 42 49 41`, or use r 3.4 at (60,37.4)), and paint its disc darker than the mask (about #0F0D0C under the usual catchlight), so it reads as a glint in the mask.
  2. [line 1, ¶13 "too crooked"] The hook's end drops 2.2 below the lower mandible (about 43.7 against 41.5), with a notch behind it at (78.2 to 79.7, 41.5 to 43.2). At 96 and 220px it reads as a cane handle. Fix: halve the drop to about 1 unit and smooth the underside into the hook so there is no notch. For example: M69 36.2 Q77.2 35.7 80.6 38.8 Q82.4 40.6 81.2 42.2 Q80.2 43.1 78.8 42.4 Q74.5 41.7 69 41 Q67.5 38.5 69 36.2 Z
Notes (not blocking):
  - The cream belly has corners at (53,57), (66,75) and (49,76), so it reads a little like a sticker.
  - The head is chestnut, while the real bird's crown and nape are pale grey. The header comment still promises a "blue-grey crown". He has called this bird good twice.

BIRD 46 Tricolored Munia: FAIL
Verdict: The three clean colour blocks read at once, but the eye is a mid-grey lens on the black hood and the black-to-white join is a cut-out with points.
Neighbours at 40px: Brahminy Kite (40), Bay-backed Shrike (42), Jacobin Cuckoo (35), told apart by colour: a black head and white belly on a dark chestnut disc.
Faults:
  1. [line 4] The eye's disc (51,48,43) on the hood (20,17,15) is the most visible grey lens in the set, px (370,205). Fix: a dark-brown iris ring (about #4A2C20, r 4.4) around a pupil in the hood's colour (r 2.6), plus the catchlight. The real eye is dark brown.
  2. [line 1, ¶17, ¶25] The black breast's visible sides are nearly straight, from (44.2,54) to (46,62) and from (59,58.5) to (60,63), and they end in points at (46,62) and (60,63) where the white begins. The white belly is a pick shape with corners at (50,61), (46,78) and (66,80). At 600px the join reads as a pasted sticker. Fix: draw the white first and round its lower corners, e.g. M49 62 Q68 62 67.5 76 Q66.5 81 61 82 Q53 83.5 48 79 Q45 75 46 68 Q46.8 63.5 49 62 Z. Then draw the black breast after it as one rounded lobe whose lower edge is a single convex arc, e.g. M44 50 Q58 50 60.5 60 Q60 66 52 66 Q45.5 65.5 44.3 58 Q44 54 44 50 Z.
Notes (not blocking):
  - The bill (10 deep at the base to a 2.8 round tip) is a proper seed-eater's cone, not a club.

---

## The runner's scope decisions for the fix round (2026-10-12)

Every fault above is acted on, with these exceptions and one addition:

- **Pitta fault 3** (move the scarlet vent to the rear): NOT done. It redesigns a bird he called
  good (¶6, "all of these are good"); faults 1 and 2 (stripe ends, eye clear of the stripe) are.
  Shown to him at gate 2 as a note.
- **The non-blocking notes** are not acted on, except where a fix above touches the same shape
  anyway. The Egret's white against the paper and the Shrike's chestnut head are gate-2 notes.
- **The Kite's wingtip cap** (a note): done, one small cap, since the bird is being opened for the
  hook and the bib anyway and the owner's ¶42 is about sharp tips.
- **Addition, systemic**: the shared `Eye` gets an optional disc colour (keep INK as the default)
  so a bird whose head is darker than INK can pass a darker disc or draw an iris, which fixes the
  Oriole, Flameback, Shrike, Munia and Drongo in one idiom. Species with a coloured eye (Oriole
  crimson, Drongo red-brown, Munia dark brown) get an iris and a pupil the way the Koel, Coucal and
  Cormorant already draw theirs.

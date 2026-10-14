# U2a, independent review 2 (2026-10-14)

Review 2 of U2a: the thirteen birds that failed review 1, judged after fix round 4 against `reviewer.md`, one Opus reviewer.

Nine pass: 5 Pitta, 9 Barbet, 12 Y-T Bulbul, 17 Drongo, 18 Coucal, 20 Oriole, 21 Weaver, 28 Cormorant, 40 Brahminy Kite. Four fail: 10 Hornbill, 41 Flameback, 42 Bay-backed Shrike, 46 Tricolored Munia. Coordinates are viewBox units (0..100) from the source. "px" is a point on that bird's 600px render in `e2e/.shots/birds/`, which includes the bird's re-centring transform. Faults the runner's scope section of review 1 deliberately left alone (the Pitta's vent, the non-blocking notes) are not failed here. Where one still shows, it is repeated as a note.

One thing about the edge audit, since two of the faults below slipped past it. `bird-edges.mjs` only lists a Q curve whose control point lies exactly on its chord. A Q that bows 3 to 5 percent of its length reads as a ruler line at 600px and the audit never sees it. The Hornbill's bill base and the Flameback's crest are both that case.

---

BIRD 5 Pitta: PASS
Verdict: The Indian Pitta's green, buff, azure and scarlet, and the black stripe is now a band with two round ends lifted clear of the eye, so the face no longer reads as a scowl hanging off a bar.
Neighbours at 40px: Coppersmith Barbet (9), Parakeet (6), Indian White-eye (49), told apart by colour: the big azure circle on a buff lower half, against the Barbet's yellow mask between two red bars.
Review 1: fault 1 (chopped stripe ends) fixed, round caps both ends. Fault 2 (eye fused to the stripe) fixed: the stripe's lower edge is about y 38.4 at x 62 and the eye's top is 41.1, so 2.7 units of green and buff show between them. Fault 3 (vent) out of scope.
Faults: none.
Notes (not blocking):
  - The scarlet patch at (53-71, 68-80) still reads as a mouth under the eye, which with the arched black stripe above makes a cartoon face at 96 and 40px. This is the gate-2 note the runner already holds.
  - The buff ellipse (52,62) rx24 ry22 nearly reaches the green disc's bottom (buff 84, disc 85), leaving a green rim about 1 unit thick along the base. It reads as an outline, not a needle.

BIRD 9 Barbet: PASS
Verdict: Still the Coppersmith he called lovely, and every end of both crimson bars is now round; nothing on it is sliced.
Neighbours at 40px: Indian Pitta (5), Parakeet (6), Indian White-eye (49), told apart by colour: a yellow mask between two crimson bars on bright green.
Review 1: fault 1 (breast band's slanted ends) fixed, the band is now a constant-width ribbon with round caps. Fault 2 (forehead band's blunt rear) fixed with exactly the suggested two-curve end, and its joins turn no more than about 15 degrees.
Faults: none.
Notes (not blocking):
  - The forehead band's front end (66.5-69.5, 37-40) still thins to about 2.7 units before its round tip, as noted last time; unchanged and out of scope.
  - With the breast band now a clean even ribbon under the mask, the green ball reads a little like a smiley face. He has called it lovely, so this is a gate-2 observation only.

BIRD 10 Hornbill: FAIL
Verdict: The casque is now the low dark ridge it should be and the eye has room, but moving the bill's back edge to clear the eye has left it a ruler line down the grey face, so the beak looks pasted on, which is the "interrupted and cut up" he named.
Neighbours at 40px: Y-T Bulbul (12), Cattle Egret (30), Laughing Dove (3), told apart by colour and silhouette: an all-grey ball with a big pale banana bill hanging off the right.
Review 1: fault 1 (casque a dome fused with the eye) fixed: the ridge rises about 2.5 above the bill, its underside sits about 1 inside it, its rear is round and 2.7 clear of the eye, and its front runs onto the culmen at (75.6,38.8) with no step. Fault 2 (eye jammed against the bill) fixed: the eye is at (56.5,41.5) and the bill's rear is about 2.2 units clear of it.
Faults:
  1. [line 1, his F16 words] The bill's rear edge `Q62.6 41.6 63.5 35.6`, from (64,47.6) to (63.5,35.6), bows only 0.58 units over 12, so it is a near-vertical ruler line of pale horn on grey, px (437,164) to (441,250). It ends at the bottom in a 97-degree corner at (64,47.6), px (441,250). The top corner is hidden under the casque; this one is not. The edge audit cannot see it because the control point is off the chord. Fix: bow the rear edge at least 1.5 units and round the lower corner. Bowing it into the bill keeps the eye clearance and reads as the face's feathering wrapping the bill base. For example, start the bill at (64.5,35.5), inside the casque's round rear (`M64.5 35.5 Q71 35 77.4 40.3 ...`), and close it with `... Q68.5 47.1 64.6 47.7 Q63.4 47.6 63.6 46.4 Q67 41 64.5 35.5 Z`. That gives about 1.5 of bow, a rounded lower corner, 2.7 units clear of the eye, and the rear edge goes under the casque at about y 37.5. Moving the start point matters: today's top-left corner (63.5,35.6) sits about 0.5 units left of the casque's leftmost point (64.0), so a sliver of horn corner can peek out behind it.
Notes (not blocking):
  - The bill tip is about 3.7 frame units from the edge (px 578). That is fine, but it should not grow.

BIRD 12 Y-T Bulbul: PASS
Verdict: The glowing bulbul he liked; the hood's stacked corners are gone, the undertail glow closes on a curve, and the eye now sits dead centre in a pale ring, which is the "white circle" he asked about in paragraph 33.
Neighbours at 40px: Black-hooded Oriole (20), Flameback (41), Hornbill (10), told apart by colour and silhouette: a grey body under a yellow head with an upright yellow crest (the Oriole is a yellow ball with a black head).
Review 1: fault 1 fixed: all three hood layers now start at (50,30), (51,31.5) and (53,32.3), each inside the crest's base, and close with a curve whose join turns under 10 degrees. Fault 2 fixed (`Q29.6 70.6 29 72`). Fault 3 fixed: a pale ring `circle (60,46) r7` is centred on the eye (60,46), r 4.2, leaving an even 2.8-unit ring.
Faults: none.
Notes (not blocking):
  - The ring is an eighteenth shape on a bird already past the budget; the owner accepted "a lot of elements" (paragraph 33) and F28 locks it.
  - The dark wing panel's lower-right corner at (44,79) turns about 107 degrees and shows, faintly, just right of the yellow undertail lobe, px about (270,458). Its right edge `Q40 64 41 54` bows only about 4 percent over 25 units. Both are low-contrast (ASHD on ASH) and pre-existing.
  - The crest top is still about 3 frame units from the edge.

BIRD 17 Drongo: PASS
Verdict: A glossy black Drongo with the smooth round-tipped fork he asked for, a red-brown eye that reads as an eye at last, and a crown shine that no longer runs into it.
Neighbours at 40px: Little Cormorant (28), Greater Coucal (18), Asian Koel (16), told apart by silhouette: the forked fish-tail at the left (the Cormorant is a wide low oval, the Coucal has a chestnut wing).
Review 1: fault 1 fixed: the crown gloss (57.5,35.2) rx5 ry2.4 is about 3.6 units from the eye. Fault 2 fixed: a #4E2A26 iris with a #141218 pupil, darker than the body, and a catchlight. Fault 3 fixed: the tail stroke is deleted.
Faults: none.
Notes (not blocking):
  - Twelve shapes and four marks (underside shade, back gloss, back glint, crown gloss): at the ceiling. Review 1 asked only for the tail stroke to go, so this is not failed.
  - The crown gloss's left end (52.5,35.2) sits on the head circle's outline, so the pill straddles the head and the back gloss, px about (345,160). It reads as a shine; if it is ever touched, move it 1.5 units right.
  - The forehead bump (64,35) r6.5 still reads a little like an ear at 220px (unchanged note).

BIRD 18 Coucal: PASS
Verdict: A Greater Coucal you can name, with a black body, chestnut wing and red eye, and the bill is now a slim decurved crow's bill growing out of the head, not the club he objected to.
Neighbours at 40px: Bay-backed Shrike (42), Black Drongo (17), Little Cormorant (28), told apart by colour: a body split black and chestnut, with the long dark tail sweeping down-left.
Review 1: fault 1 fixed: the bill is about 8.6 deep at the head, 6.9 at x 80, 4.8 at x 84 and ends in a 3-unit cap. Fault 2 fixed: the head is drawn over the bill, the underside ends inside the head at (70.5,48.5), no paper wedge and no hairline remain, and the rear edge is hidden. Fault 3 fixed: the wing's right edge is one curve `Q54 52 49 29` (bow about 3 units), the shoulder turns smoothly, and the dark patch starts on the wing's outline at (19.5,60.5). Fault 4 fixed: three marks left (tail streak, light wing layer, dark patch).
Faults: none.
Notes (not blocking):
  - The cap meets the underside at (84.2,47.2) with about a 50-degree turn, a small kink under the hook at px about (575,243). The tip still reads soft.
  - The pupil is INK (#33302B), a touch lighter than the black head (#2A2730). It reads fine inside the red iris; the Drongo and the Oriole now use a pupil darker than the body, so this is the odd one out if anyone tidies the set.
  - The dark wing patch's lower-right corner (43,78.2) sits 0.9 inside the wing edge, leaving a hair of lighter chestnut at px about (272,465).

BIRD 20 Black-hooded Oriole: PASS
Verdict: A yellow ball with a jet-black hood, a crimson eye that now reads as an eye, and a black wing trailing back along the body instead of waving forward.
Neighbours at 40px: Y-T Bulbul (12), Flameback (41), Golden Oriole (29), told apart by colour: a whole black head disc on yellow (the Golden Oriole has only a stripe, the Bulbul a yellow head on grey).
Review 1: fault 1 fixed: a #B53A3C iris r4.4, a hood-coloured pupil r2.4, and a catchlight. Fault 2 fixed with the suggested path almost verbatim: the broad round end is at the shoulder (43.5,57.3) and it tapers back and down to a round tip at (25,72-75).
Faults: none.
Notes (not blocking):
  - The wing floats with about 2.8 units of yellow between it and the hood. At 220px it reads as a folded wing, but it is the one dark shape on the bird not anchored to anything. If it is touched again, tuck its top under the hood's edge.
  - The second hood path `M38 40 ...` still never shows, except that its start point (38,40) lies 0.1 outside the hood circle. That is invisible, but the path is dead weight; delete it.
  - The bill's visible underside is still nearly straight (unchanged note).

BIRD 21 Baya Weaver: PASS
Verdict: The streaky brown weaver with a golden cap and breast that he called okay; the streaks now stop on the back, and nothing pokes out near the cap or the bill.
Neighbours at 40px: Indian Pond Heron (27), Rufous Treepie (19), Sirkeer Malkoha (11), told apart by colour: two yellow patches on brown with a dark mask.
Review 1: fault 1 fixed: the streaks are `M28 y Q39.5 y+3 51 y+1`. The top one ends under the cap, the middle one under the mask (its visible end is the mask's left edge at x about 49), and the bottom one under the breast. No stub shows above the cap or beside the bill.
Faults: none.
Notes (not blocking):
  - The middle streak now ends exactly against the mask at mid-height, (49,47), px about (300,230), so mask plus streak can read as a lens and its arm. Ending that one streak at x 46, so 3 units of brown show before the mask, would remove the reading. This is a suggestion, not a ¶20 failure: it does not cross the eye or meet the bill.
  - The streaks are 2 units wide, under line 2's 3-unit floor. They are soft, round-capped and at 60 percent opacity, so they read as streaks, not needles. Pre-existing.

BIRD 28 Little Cormorant: PASS
Verdict: The low black oval he liked, with a green sheen that now sags and ends round, and a slim grey bill that grows out of the head and turns down at the tip as a cormorant's does, not a pipe with a crook.
Neighbours at 40px: Black Drongo (17), Greater Coucal (18), Asian Koel (16), told apart by silhouette and colour: a wide low oval with a small head bump, a teal eye and a pale bill off the top right; no fork, no chestnut.
Review 1: fault 1 fixed: the bill is drawn under the head; it is 3.9 deep at the head's edge, 3.1 at x 70 and 2.5 at x 76, and the nail drops about 1.1 below the lower edge. The culmen stroke is gone. Fault 2 fixed with the suggested path: the lower edge bows about 8 percent and the rear end is round.
Faults: none.
Notes (not blocking):
  - The underside meets the nail at (76.2,41.1) with a 32-degree concave turn. That is a soft hook, not the old notch, but it is the one place the bill could still be read as a crook.
  - The bill tip is about 3 frame units from the edge (px 582).
  - The neck path, the neck-merge ellipse and the head ellipse (54.5,45) are still black on black and never show (unchanged note).

BIRD 40 Brahminy Kite: PASS
Verdict: The bird he loves: a white head and breast set in chestnut, the hook now ends in a small round nail, and the bib's side curves into its lower edge instead of being ruled.
Neighbours at 40px: Tricolored Munia (46), Bay-backed Shrike (42), Rufous Treepie (19), told apart by colour: a big white head on the chestnut disc, against a black head, a black band or a grey head.
Review 1: fault 1 fixed with the suggested path: the bill is about 6 deep at the base and ends in a 1.8-unit round nail, with no point. Fault 2 fixed: the bib's right side is `Q75 32 71.5 51 Q70.5 61 62 65.5`, which bows and turns its corner on a curve. The wingtip cap was also added and is round.
Faults: none.
Notes (not blocking):
  - Where the head circle meets the bib's left lobe, at about (44.6,51), a chestnut notch of about 96 degrees pokes into the white. This is pre-existing, unchanged this round, and reads as a neck.
  - The black wingtip's inner edge `Q34 70` still bows only about 5 percent over 22 units (unchanged note).
  - The bill's two base corners, (68,38) at about 106 degrees and (70,44) at about 125, sit on the white head. They come from review 1's own path and read as a bill base.

BIRD 41 Black-rumped Flameback: FAIL
Verdict: The crest-and-gold woodpecker he called fine, with a clean single chisel bill and no more sunglasses, but the shortened eye-stripe now shows only as a grey smudge behind the eye, the moustache still touches the gold, and the crest's lower edge is a ruled diagonal.
Neighbours at 40px: Y-T Bulbul (12), Coppersmith Barbet (9), Hoopoe (0), told apart by silhouette and colour: a large red crest over a gold body with a cream front.
Review 1: fault 1 half fixed. The stripe no longer reaches the bill and the eye disc (#221F1C) is darker than it, but see fault 1 below. Fault 2 not fixed: see fault 2. Fault 3 fixed: the spot is at (66,65.5), 2.1 clear of the moustache, and (59,55) is deleted. Fault 4 fixed: the bill gloss and the crown fold are gone, and the bill is one INK chisel with round tip and base.
Faults:
  1. [lines 4 and 8, the drawer's doubt] The eye-stripe reads as a shadow, not a stripe. Its round front cap (63-65.5, 43-47.5) lies wholly under the eye (61,44) r4. Its whole rear half lies under the crest, whose front edge runs about x 55.5 to 56 at y 42 to 49. What shows is a small dark-grey wedge pinched between the crest and the eye's lower-left, about (55.7-58.5, 42.5-48.5), px about (360-392, 220-262), ending in a point where it meets the crest at (55.7,48.3), px (367,263). At 220px it makes the eye look like a smeared, larger blob. It is the "black line over the eye that you can't really see" of paragraph 26. Fix: delete the stripe; the face is then eye, moustache and bill, all clear. There is no room to show a real stripe behind the eye under this crest without redrawing the crest, which the ledger does not ask for.
  2. [line 1, review 1 fault 2 not met] The moustache's new round cap still reaches the gold. Its rightmost point is (70.7,59.9). The cream front's edge at that height is x 70.4, so the black cap overlaps the gold by about 0.35 units, px (479,350). Review 1 asked for it to end about 2 units short; the path it suggested did not achieve that, and it was applied verbatim. Fix: move the end about 2 units left, e.g. `Q62 54 67.5 57.6 Q70 59.6 67.4 61.3 Q66.3 61.8 65 61.4 Q59 58 54 58` in place of `Q63 54 69.5 58 Q72 60 69.4 61.7 Q68.3 62.2 67 61.8 Q60 58 54 58`. Its rightmost point is then about 68.7, 1.6 inside the cream.
  3. [line 1, pre-existing, missed by review 1] The crest's lower-left edge `Q40 41 47 50`, from (33,36) to (47,50), bows 0.7 units over 19.8 (3.6 percent). It is a straight diagonal between red and gold from px (197,171) to (272,246), plainly visible at 600 and at 220px. The edge audit misses it because the control is off the chord. Fix: give it a real curve, e.g. `Q37 43.5 47 50` (about 1.6 of bow, swelling the nape slightly), or bow it the other way for a concave swept nape. Either way, no ruled line. The runner may weigh this one against "honestly fine", but it is line 1's letter.
Notes (not blocking):
  - The crest's front end still makes a 96-degree corner on the forehead at (65,35), px (435,160) (unchanged note).
  - The bill tip is about 3 frame units from the edge (px 582).

BIRD 42 Bay-backed Shrike: FAIL
Verdict: The plump bay shrike with a bandit mask he called good; the eye is now a glint inside the mask, but the softened bill has become a stubby thumb, with a tip almost as deep as its base.
Neighbours at 40px: Brahminy Kite (40), Rufous Treepie (19), Greater Coucal (18), told apart by silhouette and colour: a separate chestnut head with a black band across it, a tail and a leg below (the Kite is a disc with a white head).
Review 1: fault 1 fixed: the mask's lower edge is now about 42.8 at x 60 and its top about 32.8, so the eye (60,37.8) r3.6 sits wholly inside with about 1.4 of black above and below; the disc #0F0D0C is darker than the mask. Fault 2 partly fixed: the drop is now about 0.7 and the cane handle is gone, but the bill is now too blunt (fault 1 below).
Faults:
  1. [line 1, paragraphs 41-42] The bill is a thick blunt rounded wedge. It is about 5.8 deep where it leaves the mask (x 74) and still 5.05 at x 78, then ends in a round knob 4.0 units across, from (80.6,38.8) to (78.8,42.4), px about (524-548, 150-182). That makes the tip about 70 percent of the base, the bluntest tip in the unit (the Coucal's is 3.1 on 8.6, the Kite's 1.8 on 6). The drawer also changed review 1's underside control from (74.5,41.7) to (74.3,42.5). The underside now sags and meets the knob at (78.8,42.4), px (524,180), with a 28-degree concave turn, a faint notch. Fix: start the culmen's descent earlier and tighten the cap to about 3 across, keeping the soft droop. For example: `M69 36.2 Q76.5 35.9 80.4 39.6 Q81.6 41 80.6 42.1 Q79.9 42.8 78.8 42.3 Q74.4 41.9 69 41 Q67.5 38.5 69 36.2 Z`. That gives about 5.4 deep at x 74, 4.2 at x 78, a 3.1 tip, a drop of about 0.6, and joins under 20 degrees.
Notes (not blocking):
  - The cream belly's top corner at (53,57) turns about 68 degrees (a 112-degree point), so the patch reads a little like a guitar pick (unchanged note).
  - The head circle clips the wing's top-right, leaving a 105-degree wing corner at about (45,41.3) under the mask's left end. It reads as head over wing; pre-existing.
  - The chestnut head where the real bird's crown is grey: the gate-2 note the runner already holds.

BIRD 46 Tricolored Munia: FAIL
Verdict: The three colour blocks read at once and the eye is now a dark-brown eye rather than a grey lens, but the new breast lobe and the white belly almost touch on the right, leaving a pinched chestnut wedge between them.
Neighbours at 40px: Brahminy Kite (40), Bay-backed Shrike (42), Jacobin Cuckoo (35), told apart by colour: a black head and white belly on a dark chestnut disc (the Kite's white is the head, not the belly).
Review 1: fault 1 fixed: a #4A2C20 iris r4.4, a hood-coloured pupil r2.6, and a catchlight; the ring is visible at 600px. Fault 2 fixed in its letter, using both suggested paths: the white is drawn first with round corners, and the breast is one lobe with a convex lower edge. The straight sides and the black points are gone. But see fault 1.
Faults:
  1. [lines 1 and 8, the drawer's doubt, paragraph 31] The drawer was right to doubt the crescent. The lobe's lower-right edge `Q60 66 52 66`, sweeping down-left, crosses the white's top edge `Q68 62 67.5 76`, sloping down-right, at a shallow angle at about (59.2,63.6), px (379,367). The chestnut between them, about (59-63, 58-64), px about (378-400, 335-370), narrows to a 71-degree point. At 600px it reads as the body showing through a gap where the black and the white nearly kiss, not as a clean join; the left-hand junction (about 156 degrees) is fine. Fix: make the lobe's right side drop steeply so it meets the white's top edge at close to a right angle, around (62,64.7). The chestnut corner there is then about 106 degrees instead of a point. For example: `M44.5 50 Q58 50 61 58 Q63 62.5 61.6 65.6 Q59.8 67.8 52 66.8 Q45.5 66 44.3 58 Q43.2 54 44.5 50 Z` (joins all under about 15 degrees; the lower edge stays one convex arc lying on the white).
Notes (not blocking):
  - The bill's lower-rear corner (68,52) sits right on the hood's edge (67.7 at that height), half on black and half on chestnut. It is pre-existing and reads as the base of a cone.

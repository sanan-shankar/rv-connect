# U4d review 1, 2026-10-16

Review 1 of U4d (69 Red-vented Bulbul, 70 White-browed Bulbul, 71 Red-wattled Lapwing candidate).

Judged against `reviewer.md` and nothing else, from the 600px renders, `sheet-69_70_13_15_12_24_71.png`,
`sheet-40-69_70_13_15_12_24_71.png`, `sheet-40-70_49_62_67_71_64_65_14.png` and the `draw()` source,
with the owner's Q6 reading (the bulbuls drawn from their interesting colours) and the Q2 reading (71 is
a candidate beside 24, which is LOCKED and untouched). Coordinates are source viewBox units. The edge
audit finds no chords on the bulbuls. Its four "flat Q" pieces on 71 are the legs, which are straight
with round feet, as line 1 allows. Marks are counted as in U4b and U4c.

```
BIRD 69 R-V Bulbul: FAIL
Verdict: The school's commonest bird drawn from its colours, as he asked: a black crested hood and bib over a buff belly, a sooty back and a crimson vent. It reads as the Red-vented, but the back of the crest is a ruler line, the white rump reads as a bite out of the body, and the breast scales are too thin.
Neighbours at 40px: Red-whiskered Bulbul (13), Indian Robin (15), Jacobin Cuckoo (35), told apart by colour and silhouette: against 13, its front is BLACK down to mid-breast where 13 has a big white cheek and bib; against 15, it is half pale (a buff belly and a grey-brown back) where 15 is black all over, and its tail hangs down where 15's is cocked up; against 35, a sooty-brown back and a buff, not white, belly, with the red vent.
Faults:
  1. [line 1] The back of the crest is a straight vertical line. Its back edge,
     `Q49.2 26.8 47.24 32.6`, runs from (48.6,20) to (47.24,32.6) with 0.66 of bow over 12.7
     units, about px (307,37) to (297,131) in the render. It continues the head's left outline
     straight up, so the hood has a flat back like a helmet. Exact fix: sweep the crest back to a
     round tip with a curved back edge that joins the head's outline smoothly. Replace the crest
     path's d with
     `M70.34 28.32 Q63.2 19.8 54 18 Q44 16.4 46 20 Q49.5 26 47.24 32.6 Q58 34 70.34 28.32 Z`
     (the tip is a rounded knob at about (45.7,19), and the back edge is concave by 1.45, with
     the same tangent as the head at (47.24,32.6)). Re-render to confirm it reads as a tuft, not
     a hook.
  2. [line 3] Four marks: the bib, the scales, the vent and the white rump. The rump,
     `M21.25 61.62 A26 26 0 0 0 25.45 72.54 Q32.8 66.2 21.25 61.62 Z`, is #E0DBD1 on the
     silhouette's edge, about 8 lightness points from the paper. At 600 and 220 it reads as a pale
     bite out of the back above the tail, not a patch on it. At 40px it is a dent in the outline
     and does no work. Exact fix: delete the rump path and the `RUMP` constant. That leaves
     three marks, and the Q6 colours that carry the bird (the black crested hood and the crimson
     vent) are untouched.
  3. [line 2] The four scale cups are 2.1 thick at the centre (lower edge sags 2.4, upper 0.3)
     and run to points at both ends, under the floor of about 3, the same failure as the tail
     gloss in an earlier round. Exact fix: in the map, make the d template
     `M${x - 2.4} ${y} Q${x} ${y + 6.4} ${x + 2.4} ${y} Q${x} ${y + 0.4} ${x - 2.4} ${y} Z`
     (3.0 thick at the centre, 4.8 wide; the front cup keeps 2.0 inside the breast's outline, the
     rear cups 2.5 clear of the wing, the lower cups 4.4 above the hem). Deleting the scales also
     meets the line, if the scaly breast is let go.
Notes (not blocking):
  - The eye (#0C0A0B) on the black head (#231F21) is held only by its catchlight. That is true
    to the bird and the darkest point is right, but the face is close to a void. If the owner
    finds it blank at gate 2, a slightly lighter hood (about #2E2A2C, the Magpie-Robin's black)
    would let the eye show.
  - The crest top and the tail end sit about 3% of the frame from the top and bottom edges in
    the render. That is for the runner.
```

```
BIRD 70 W-B Bulbul: FAIL
Verdict: An olive bulbul over a butter-yellow body with a golden vent. Q6's colours make it a bird that survives 40px, which the brown one did not, but its white brow reads as a band across the head, and its front end nearly touches the outline.
Neighbours at 40px: Indian White-eye (49), Tailorbird (62), Grey Wagtail (67), Yellow-throated Bulbul (12), told apart by colour and silhouette: against 49, a head on a body where 49 is one saturated yellow-green disc; against 62, an olive head with a white stripe where 62's head is cream with a rust cap, and a tail down where 62's is up; against 67, warm olive over pale butter where 67 is cool slate over bright lemon, standing on pink legs; against 12, the yellow is low where 12's is the head.
Faults:
  1. [line 8, line 5] The brow, `M54.6 30.8 Q63.5 29.6 71.4 30.7 Q73.2 32.5 71.3 34.4 Q63 35.5 54.8 34.3 Q52.6 32.6 54.6 30.8 Z`,
     is a level pill 4.75 thick and 20.6 long. That is 84% of the head's width at that height,
     so at 600 and 220 it reads as a white headband or a slot across the head, not a stripe over
     the eye. It is also paper-white (#F6F3EA), and its front end (73.2,32.5) is only 1.0 inside
     the head's outline, so at 96 and 40px the white meets the paper and the head looks cut.
     Exact fix: keep it level, low and thick, but bring the front end 2.3 inside the outline,
     end it 6 inside at the back, and let it taper toward the rear so it reads as a stripe
     running back from above the eye:
     `M56.6 31 Q63.5 29.6 71.2 30.8 Q72.6 32.6 71.1 34.3 Q63 35.4 56.8 34 Q55 32.5 56.6 31 Z`.
     That is 16 long, 4.5 thick over the eye, 3.25 near the rear round end, front at x 71.9,
     rear at 55.9, and 0.86 above the eye. Re-render. If it still reads as a band, the next step
     is shorter at the back, not an arch: an arch over the eye is the Wagtail's raised eyebrow.
Notes (not blocking):
  - The butter body (#E6DBA6) has about 8 lightness points of edge on the paper, the Tailorbird
    level. Do not go paler.
  - Against the Grey Wagtail it is the closest pair in the set (a darker top over yellow). It
    parts by hue (warm olive against cool slate), by the pale butter against bright lemon, and by
    the Wagtail's legs. That is enough at 40px, but it is worth seeing on the gate-2 sheet.
  - The tail end and the bill tip sit about 3 to 5% of the frame from the left and right edges.
    That is for the runner.
```

```
BIRD 71 Red-wattled Lapwing (candidate): PASS
Verdict: The school's own lapwing, drawn true: a white body on long yellow legs, a bronze back, one black hood from the crown down the face to the breast with the white cheek running down the neck, and the red eye-ring and wattle with a red, black-tipped bill. It reads as the species at every size.
Neighbours at 40px: Yellow-wattled Lapwing (24), Night Heron (64), Pied Kingfisher (65), Magpie-Robin (14), told apart by colour and silhouette: against 24, a white body with black down the front where 24 is a sandy ball with a black cap; against 64, a warm bronze back and black on the FRONT where the heron is grey with black on TOP, and a red bill against a black one; against 65 and 14, long yellow legs, the bronze back and the red face.
Faults: none.
Notes (not blocking):
  - On the smaller seat, it is not a fault. Its legs (to y 91) and bill (to 85.5) give it a long
    reach, so the centroid harness seats it at s 1.146 against 24's 1.396. Its body is about
    three quarters of 24's width on the sheet. Line 9 leaves the numbers to the harness, and it
    reads at 40px. If the owner picks it and wants it bigger, shortening the legs by 3 or 4
    units is the lever.
  - At 40px the gap of black between the red wattle's front (72.2,31.8) and the red bill (it
    leaves the head at about x 73.8) is under a pixel, so ring, wattle and bill run together as
    one red face-front. That is how the bird looks at a distance, the wattle does sit at the
    bill's base, and A7 says keep the species' red, so this is not ¶20's sunglasses. If it reads
    as a red mask at gate 2, pull the wattle's front back to about x 70.5.
  - The white body (#DCDAD2) has about 8.5 lightness points of edge on the paper, the Tailorbird
    level. Fine.
  - The feet sit about 3% of the frame from the bottom edge. That is for the runner.
```

For the owner's sheet, 24 against 71: at 40px, 71 reads more as a lapwing (a wader on long yellow
legs, pied black, white and bronze, with the red face), and 24 reads more as a round sandy ball with
a black cap. 24 is the cuter avatar and seats a size bigger.

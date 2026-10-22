# U4e review 1, 2026-10-22

Review 1 of U4e, the reserve (72 Little Grebe, 73 Scaly-breasted Munia, 74 Black-headed Ibis candidate, 75 Spot-breasted Fantail, 76 Common Iora).

Judged against `reviewer.md`, with paragraph 43 (ledger A8) read into line 8: the saturated colour
goes on the outside of the silhouette and the pale colours sit inside it, the Eagle-Owl's way. A pale
region on the silhouette is a fault unless a darker rim or shade holds it. As a working line I take
the Owl's own belly as the measure of "not pale". It sits on the bottom edge, about 27 lightness
points below the paper, and he called the bird "instant 10 on 10".

Sources:
- the 600px renders (all five re-rendered 2026-10-22);
- `sheet-72_73_74_75_76_61.png` and its 40px version;
- the look-alike sheets;
- the `draw()` source.

Four of the five look-alike sheets are dated 2026-10-16, before the last redraw. The 75 in its sheet
is an older fantail. So I rendered two current ones, with the dev server's `bird-sheet.mjs`, into
`e2e/.shots/birds/`:
- `sheet-40-75_14_15_17_35_69_16_13_72_73.png` (its 96 twin too), which puts the three browns
  beside the dark birds;
- `sheet-40-76_20_29_67_70_12.png` (its 96 twin too), which puts the Iora beside the orioles and
  yellows.

Every chord the edge audit lists lies inside the shape drawn over it (bill bases inside heads, tail
and plume roots inside bodies). The Fantail has none. Marks are counted as in the earlier units.

```
BIRD 72 Little Grebe: PASS
Verdict: The dabchick as a round warm-brown ball with a dark back and crown, a chestnut face and foreneck carrying the eye, the pale gape spot, and a buff powder-puff rear: the roundest bird on the list, and nothing pale touches the paper except the mid-buff puff.
Neighbours at 40px: Scaly-breasted Munia (73), Spot-breasted Fantail (75), Greater Coucal (18), Spot-billed Duck (58), told apart by colour and silhouette: the only all-brown ball with a chestnut-orange FACE and no pale underparts, against the Munia's cream lower half, the Fantail's fan and buff belly, the Coucal's chestnut on the wings under a black head, and the Duck's pale boat.
Faults: none.
Notes (not blocking):
  - Paragraph 43: it holds. The puff (#CDAE80) is about 23 points below the paper, and the
    chestnut on the face's front is saturated. Nothing pale meets the paper.
  - The gape spot's front end (about 73.1,43.3) sits about 1.3 from where the bill leaves the head
    (about 74.4). It is the species' mark at the bill's corner and pale against black, so it does
    not blur, but at 96 and 40 it touches the bill. Optional: `cx="69.6"` on the gape ellipse
    leaves 2.5 of chestnut between them.
  - The puff's back and the bill tip sit about 5% and 3% of the frame from the left and right
    edges. That is for the runner.
```

```
BIRD 73 Scaly-breasted Munia: FAIL
Verdict: A plump munia with a big chocolate head and bib, a warm-brown back and a finch's cone bill over a cream belly scalloped in brown. It reads at once as the species, the inverse of the Spurfowl, but the cream is the lower edge of the bird and sits straight on the paper with nothing holding it.
Neighbours at 40px: Tricolored Munia (46), Painted Spurfowl (25), Red-vented Bulbul (69), Little Grebe (72), Spot-breasted Fantail (75), told apart by colour and silhouette: brown over a speckled cream against 46's chestnut, black and plain white, against 25's white spots on chestnut, against 69's black crested hood and red vent, against the Grebe's all-brown with a chestnut face, and against the Fantail's fan.
Faults:
  1. [line 8, paragraph 43] The cream belly (#E2CB9E, L* about 82.6, only about 13 below the paper)
     is the silhouette's whole lower edge, from the tail root round to the bib's hem. That is
     about half the outline, and no rim holds it. At 220 the bottom of the bird softens into the
     paper, and at 40px it is the faintest edge on the sheet. This is the "lighter colours not set
     inside" of paragraph 43, against the Owl, whose belly is about 27 below. Exact fix:
     `CREAM = "#D8BC8A"` (L* about 77.5, about 18 below the paper). It is still a cream-buff, and
     the scales (#6B4430) still read on it. The fuller answer, the Ibis's device, is a slightly
     darker shade crescent along the belly's own arc. That keeps the cream lighter inside it,
     and with the bib and the scales it makes three marks.
Notes (not blocking):
  - The bill is a true cone: about 8.7 deep at the face to a 2.8 round tip, a 3:1 taper. It is a
    finch's bill, not a club.
  - The scales are 3.2 thick at the centre and 6 wide, so they meet the floor.
  - With the deeper cream, its belly comes close to the Fantail's buff (#D6B47E). The two still
    part by the fan and by scales on the cream against white spots on a dark bib.
  - The bill tip sits about 3% of the frame from the right edge. That is for the runner.
```

```
BIRD 74 Black-headed Ibis (candidate): PASS
Verdict: A pale ibis with a bare black head and neck, a slaty wing, black breeding plumes, black legs and the long black sickle. It is drawn the paragraph 43 way: its white is held almost all round by the species' own darker colours, and it reads as the bird at once.
Neighbours at 40px: Night Heron (64), Black-winged Kite (60), Cattle Egret (30), Pied Kingfisher (65), Red-wattled Lapwing (71), told apart by silhouette and colour: a whole black head-and-neck block with a down-curved bill on a pale body on black legs, against the Heron's pale face under a black cap on yellow legs, the Kite's round disc and black slash, the Egret's buff and yellow bill, the Kingfisher's crest and dagger, and the Lapwing's bronze back and red face.
Faults: none.
Notes (not blocking):
  - Paragraph 43: held, with one gap. The white (#DADFE5) is held by the black neck along the top
    and front-top, the slaty wing over the back and the slate shade under the belly. The one
    exposed stretch is the lower breast front, about 12 units of outline, from where the neck's
    base ends (about 68.5,57.5) down to the shade's front tip (67.66,70.03). Dark brackets it at
    both ends, so the eye closes the contour, and I judge the region held. If he says yes and
    wants it tighter, run the shade's front end up the breast to meet the neck's base, at least
    3 thick along the way. That is a redraw, not a one-liner: carrying the shade's inner edge up
    there makes it either pinch thin or thicken the front into a grey block.
  - It is a held-back candidate, and he should see it knowing it is one more grey, white and black
    bird in the cluster paragraph 43 names, the one at the bottom of the birds page (Kite, Night
    Heron, Pied Kingfisher, Swallow). It is the best-held of them, but it adds to the count.
  - The eye (#0B0A0B) on the black head is held only by its catchlight, the same as the
    Red-vented's. That is true to a bare black head.
  - The bill tip sits about 4% of the frame from the right edge. That is for the runner.
```

```
BIRD 75 Spot-breasted Fantail: PASS
Verdict: A dark grey-brown fantail with its tail spread wide in four soft round tips, a rich buff belly, white spots on the dark breast and a short white brow. A silhouette nothing else in the set has, and every white is held inside the dark.
Neighbours at 40px (from the current sheet): Magpie-Robin (14), Indian Robin (15), Drongo (17), Jacobin Cuckoo (35), Red-vented Bulbul (69), Little Grebe (72), Scaly-breasted Munia (73), told apart by silhouette first, the fan up and back from the rump, and by colour: grey-brown over buff, not black over white (14, 35) or black all over (15, 17); against 69, which shares a dark front with pale marks over a buff belly, the fan against the crest, and no red vent.
Faults: none.
Notes (not blocking):
  - On the brow: it reads as a brow, not a visor or a headband. It is level, starts over the eye's
    front (70.6) and ends just behind it (58.7), 4.3 inside the outline at the front and 6 at the
    back, and 3.0 to 4.3 thick. A visor or headband would reach the forehead's edge or span the
    head. At 600 it is a little stubby, a white pill. If a later pass wants it to read more as a
    stripe, thin the rear end toward 3 and leave the front alone.
  - Paragraph 43: it holds. The belly (#D6B47E) is about 20 below the paper, the Owl's way, and
    the spots and brow are paper-white but held at least 4 inside the dark.
  - The fan (#2A2421), the wing (#3D342F) and the head and bib (#4F443D) step about 7 to 8
    lightness points apart, so at 40px the top of the bird is one dark mass. The buff belly, the
    white spots and the brow light it, so it is not a void. The Magpie-Robin's blacks set the
    precedent for steps this small.
  - The fan's back tip sits about 3% of the frame from the left edge. That is for the runner.
```

```
BIRD 76 Common Iora: PASS
Verdict: The breeding male: a lemon bird with a black cap, a black back and wing carrying two curved white bars, and a short black tail. Saturated colour on the outside and the whites inside the black, exactly the paragraph 43 way.
Neighbours at 40px (from the current sheet): Black-hooded Oriole (20), Golden Oriole (29), Grey Wagtail (67), White-browed Bulbul (70), Yellow-throated Bulbul (12), told apart by silhouette and colour: a bird with a head, a back and a tail sticking out, black over the whole TOP, against two closed gold discs, 20 with a black head and black face and 29 with a black slash in the middle of the gold; the lemon is greener than their gold and the bill is dark, not pink. Against 67, black, not slate, and no legs; against 70 and 12, black against olive and grey.
Faults: none.
Notes (not blocking):
  - On the wing bars: they read as wing bars, not claw marks. There are two, not three. They are
    curved and run with the wing's lower edge, 3.2 thick with round ends, slanting down toward
    the rear, the way the covert rows' white tips lie on a folded wing. Claw marks are three
    straight parallel slashes. If the owner sees scratches at gate 2, the alternative is one
    broader white band in the same place.
  - The lemon (#EED63E) is about 10 below the paper in lightness but highly saturated, so it is
    the "significant colour" paragraph 43 asks for, not a pale one. It holds its edge at 40px.
  - The cap ends 4 above where the bill leaves the head and its lower edge clears the eye by 2.5.
    The face is clean.
  - The tail end and the bill tip sit about 5% and 3% of the frame from the edges. That is for
    the runner.
```

On the coordinator's questions, in one place:
- **The three browns (72, 73, 75)** part at 40px. The Grebe by its chestnut face and no pale
  underparts, the Munia by the speckled cream lower half, the Fantail by the fan.
- **The Iora** parts from both orioles at 40px, by silhouette and colour, as above.
- **The Munia's cream** is pale on the paper with no rim. That is the one fault in the unit.

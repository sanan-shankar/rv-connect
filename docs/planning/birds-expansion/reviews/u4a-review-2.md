# U4a review 2, 2026-10-16

Review 2 of U4a: verification of the four faults from `u4a-review-1.md` after one fix pass and a re-centre.

Judged against `reviewer.md` from the re-rendered 600px PNGs, `sheet-57_58_59_60.png`,
`sheet-40-57_58_59_60.png` and the current `draw()` source. Coordinates are source viewBox
units. The edge audit's chords (57: three, 58: one, 59: three, 60: one) all lie inside the
shape drawn over them.

```
BIRD 57 Grey Junglefowl: FAIL
Verdict: The tail now reads as one plume in two layers, teal lying on green-black, which is the fix; one small paper notch is left where the teal arch meets the stem.
Neighbours at 40px: Painted Spurfowl (25), Peafowl (1), Hornbill (10), told apart by colour (grey with a gold collar and red comb) and the dark tail tuft; unchanged from review 1.
Faults:
  1. [line 8, line 2] Review 1's fault 1 is mostly fixed: the big paper crescent between the
     plumes is gone and the dark now shows as a band outside the teal. What remains is a small
     paper wedge, about 4.5 by 2 units, tapering to a point at the right, at about (24 to 29,
     32 to 34), just under the teal arch where it joins the stem. It is visible at 600px and
     as a pale notch at 220px. It comes from the dark plume's inner curve crossing its own
     stem edge near (28.6,33.6) and leaving a loop unfilled. Exact fix: lower the teal's
     inner arch so it covers the wedge. In the TAIL path replace
     `Q21 32.5 24 32 Q32 33 33 40` with `Q21 34.5 24.5 34.5 Q32 34 33 40`. The teal's
     lower edge then runs at about y 34.6 over x 26 to 29, and the stem below y 37 is unchanged.
     Re-render and confirm the notch is gone.
New faults from the fix: none. The wing tip now ends at (35,77.5) with clear grey below it.
Note (runner, not blocking): the re-centre raised s from 1.22 to 1.306. The tail's leftmost
point is about 3.6 from the left edge and its top about 4.6 from the top edge, and the bill
tip sits at about 97% of the frame width. All three are near the edges but none touches.
```

```
BIRD 58 Spot-billed Duck: PASS
Verdict: Now a duck's bill: a black bill with a dished top running out of the forehead, about 8.4 deep at the face and tapering to a 4.5 yellow nail; the crown sits clear of it.
Neighbours at 40px: Indian Pond Heron (27), Red-wattled Lapwing (24), Cattle Egret (30), told apart by the low, wide boat silhouette and the black-and-yellow bill; unchanged.
Faults: none.
Review 1 faults:
  1. [line 1] Fixed. `M70 35 Q77 39 85 39.5 Q87.5 41.75 85 44 Q78 46 70 44.5 Z` tapers from
     about 8.4 at the rim to 4.5 at the nail, with a concave culmen. It reads as a duck's bill,
     not a club. The red spot (74,38.6) r1.4 stays inside the bill.
  2. [line 4] Fixed. The cap now ends at (68.5,32) on the head's outline, about 5 units of fawn
     clear of where the bill leaves the head (about 72,36). Cap and bill no longer join at
     96 or 40px.
  3. [line 9] Not moved, and downgraded to a runner note. The bill was shortened, but the
     re-centre raised s from 1.159 to 1.24, so the nail sits where it sat before: about 97%
     of the frame width by eye. That is the same as the Kite's bill and the Junglefowl's bill,
     which I passed in review 1, so holding the Duck alone to a stricter line would be
     inconsistent. If the runner wants air on all three, cap s in the centroid harness rather
     than redraw.
New faults from the fix: none. On the cap: it reads as a crown, not a hair swoosh. At 220
and 40px it is a dark crown patch on the back and top of the head. At 600px its lower edge
rises to a 119-degree point on the forehead (68.5,32), and that point is the one thing that
leans toward a swept fringe. It is soft enough not to fail. Optional softening: end the lower
edge level instead of rising, `Q60 41 64.5 37 Q67.5 35.5 68.5 32` ->
`Q60 39.5 65 37 Q68.5 35.5 69.6 33.6`, which keeps about 3.5 units of fawn before the bill.
The throat lump is gone (neck ellipse now rx 7, inside the head's curve).
```

```
BIRD 59 Swamphen: PASS
Verdict: Nothing regressed. Only the feet changed (ry 1.8, cy 92.6), and they are still soft and at least 3 units tall; the re-centre (s 1.109) leaves them about 3 units off the bottom edge, as before.
```

```
BIRD 60 Black-winged Kite: PASS
Verdict: Nothing regressed. The cap now ends on the forehead at (71.3,29.3), leaving about 6 units of pale brow before the bill, with its edge still arched over the eye and not sloping at it. The shortened bill's tip sits at about 96 in render.
```

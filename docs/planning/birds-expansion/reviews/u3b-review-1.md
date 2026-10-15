# U3b review 1, 2026-10-15

Review 1 of U3b (Redraws): 13, 15, 23, 33, 44 redrawn in place, and the candidates 54, 55, 56.

Judged from the 600px renders, the 220/96/40px sheets in `e2e/.shots/birds/`, the `draw()` bodies in
`src/components/common/bird-avatar-v2.tsx` and `bird-edges.mjs` (every chord it lists is hidden under
the head or body: 13's crest base, 15's tail base, 54's hood top, 55's and 56's tail bases, 56's bill
base). Coordinates are source viewBox units, before the adjust.

**Across the unit (not a per-bird fault, for the runner and gate 2).** Seven of the eight are now one
bird in different paint: a circle near (48,60) r~28, the same crescent wing from (48,46) down the
back, a short tail down-left, the head circle at about (59,40), a slim bill to the right and an oval
chest lobe. 44 and 54 share the tail, wing and bill paths exactly; 55 and 56 differ by a unit or two.
At 40px the row is told apart only by colour. That clears line 6, but A6 (¶10, ¶11) says round is
not the only answer. The owner's own question, "looking like nothing already in it", is his to put
to the sheet.

```
BIRD 13 R-W Bulbul: FAIL
Verdict: Calmer and rounder, and the crest is now a soft tuft, not a spike. But the red whisker
  sits on the white cheek like a blush, and the wing is too faint to read as a wing.
Neighbours at 40px: 14 Magpie-Robin, 12 Y-T Bulbul, 23 Starling; told apart by the brown body
  with a black head and a white centre (colour)
Faults:
  1. [line 8, ¶31] The red whisker (57.5,43 r2.8) overlaps the white cheek (63,47 r5.5) by about
     1.5 units, so two marks cut each other next to the eye and the red reads as a blush on the
     cheek. On the real bird the red sits behind the eye, above the white. Fix: move it to about
     (55.5,39.5) r2.6 so at least 1.5 units of black separate it from both the eye and the cheek.
  2. [line 8] The wing (#78624E on #8C7258) is a small step in lightness, and the lobe floats with
     an 8-unit brown band behind it (its back edge is near x=25, the body's edge x=17). At 220px it
     reads as a smudge or shadow, and at 96 and 40px it is gone. Fix: darken it (about #66513F)
     and bring the back edge to within about 3 units of the rim (e.g. `Q24 63` -> `Q20.5 62`,
     `Q31 72` -> `Q27 73`) so the lobe is the bird's back, not a mark on it.
Notes (not blocking):
  - The crest reads as a crest. At 600px it leans toward a single rabbit ear; tipping its top
    1 to 2 units forward would settle it.
  - The white belly is enclosed by brown on every side, which line 8 asks for. At 220px the bird
    reads a little as a ring around a hole, and a smaller lobe weighted to the front would help.
  - 11 shapes, under the ceiling of twelve. Belly, vent, cheek and whisker are four marks against
    line 3's three. The row asked for both red marks, so this is the row's cost, not the drawer's.
  - After the adjust, the crest tip lands about 1.5 units from the top edge.
```

```
BIRD 15 Indian Robin: FAIL
Verdict: Right colours, right family, rounder body, but the tail is still a straight raised bar
  coming off the back, which is the "bird trying to wave" the owner named.
Neighbours at 40px: 14 Magpie-Robin, 16 Koel, 17 Drongo; told apart from 14 by its all-black
  front (14 has the big white belly) and from the other two by its round shape with no long tail
Faults:
  1. [line 7, ¶36, F3/Q9] The tail is parallel-sided, about 7.5 units at the base and 7 at the end.
     Its two long edges, (31,71.2)->(15.2,39.9) and (22.8,36.1)->(38.6,67.4), bow by only about
     2 units, and it rises at about 63 degrees from the lower back with a V of paper opening
     between it and the back. A uniform bar with a round end, held up off a round body, is an arm.
     F3's action, "the cocked tail as a tail, not an arm", is not done. Fix: draw a fan. Make it
     narrow where it leaves the rump (about 5 units), widening to about 11 at a rounded end, and
     lay it closer to the back (about 45 degrees, tip near (19,35)). Run its upper edge into the
     back line so no paper wedge opens between tail and back. 14's tail is the model: it reads as a
     tail because it widens away from the body.
  2. [line 8, ¶31] The white shoulder patch (40,52 rx4.5 ry6.5, -25 degrees) has its top end at
     about (37.3,46.1). The wing lobe's upper edge there is near y=48.3, so the white pokes about
     2 units past the lobe onto the black body and is cut by the lobe's edge. Fix: move it to about
     (41,55), or shrink it to rx3.8 ry5.5, so it sits wholly on the lobe.
Notes (not blocking):
  - After the adjust (s 1.407), the tail tip reaches x of about 3. That is within the reach cap,
    but a shorter fan would also free the frame.
  - The chestnut vent reads as a round button. A lobe that follows the body's lower curve would
    belong to the bird more.
```

```
BIRD 23 Brahminy Starling: FAIL
Verdict: The thin black line and the old colour are gone, and the apricot and dove-grey are
  right. But the black cap is worn like a hat, a flat cap with its brim turned to the back.
Neighbours at 40px: 33 Orange-headed Thrush, 54 Rock-Thrush (candidate), 13 R-W Bulbul; told
  apart by its paler apricot and the black crown (colour)
Faults:
  1. [line 5, line 7] The cap sits proud of the head instead of being the head's own crown:
     - the nape tuft, (35.5 to 48, 29 to 37), sticks out behind the head over the body like a brim;
     - its lower edge runs nearly level across the head, from (37,34.8) through (49,36) to
       (70.5,31.5);
     - it stops about 4 units above the bill, with buff forehead in front.
     At 600 and 220px it reads as a cap or beret put on a ball, not as plumage. The real bird's
     black runs from the bill base over the crown, with a loose crest lying down the nape. Fix:
     keep the black inside the head circle and bring it down the forehead to the bill base (about
     (71,37)). Curve its lower edge down to just above the eye. Let the crest hang down the back of
     the head, following its curve, as a soft tuft (tip near (45,40)), not out sideways as a
     brim.
Notes (not blocking):
  - The blue bill base shows as a 2-unit knob: the head covers x up to 72.5 and the blue reaches
    74.8. It reads at 600px and vanishes below that. Bring it a unit further out or accept that
    it is a 600px-only detail.
  - The head barely breaks the body's outline, so the bird is close to a plain ball with a hat on.
    Fixing the cap will settle most of that.
```

```
BIRD 33 Orange-headed Thrush: PASS
Verdict: One orange bird with a blue-grey back and a white wing-bar, round now instead of long.
  It reads as the thrush, and nothing on it is wrong.
Neighbours at 40px: 23 Starling, 54 Rock-Thrush (candidate), 13 R-W Bulbul; told apart from 23
  by the deeper orange and no black crown, and from 54 by the orange head (colour)
Faults: none
Notes (not blocking):
  - The wing's top meets the head at (50,37.5), and the orange between the wing and the outline
    thins to a 2 to 3 unit sliver ending in a point under the head. Starting the wing 1.5 units
    lower would keep the rim even.
  - The South Indian race (cyanota) has a white face with two dark vertical bars, the mark a
    birder at Rishi Valley would name. The plain orange head is the northern bird. This is a fair
    simplification, but it is why the bird reads as "an orange robin" more than "this thrush".
  - Whether this answers ¶23's "something I don't like... just not working for me" is the
    owner's call at gate 2. The shape complaint is answered.
```

```
BIRD 44 Tickell's Blue Flycatcher: FAIL
Verdict: Round, blue, rust breast over a white belly, so the long and weird shape is gone. But the
  white belly is a separate egg with a flat top, laid across the rust breast.
Neighbours at 40px: 54 Rock-Thrush (candidate), 31 Verditer Flycatcher, 4 Kingfisher; told apart
  by the cobalt body with the orange-and-white front (colour)
Faults:
  1. [line 1, line 8 ¶31] The white belly is drawn over the orange. Its top edge runs nearly level
     from about (46,71) through (50,69), (54,68) and (58,69) to about (66,71), about 20 units with
     under a unit of bow, so it chops the rust lobe flat. At 600px it reads as a second object held
     to the chest. Fix: reverse the stack. Draw the white lobe first and the orange lobe over it,
     so the boundary is the orange's own round bottom (`Q69 72 59 73 Q50 72 48.5 63`) and the rust
     sits in the white like the real bird's breast fading into its belly.
Notes (not blocking):
  - #2F6FD0 is a bright cobalt, and with the rust breast and white belly the pattern sits close to
    an Eastern Bluebird. The real bird is a darker indigo with a brighter forehead and brow; a
    deeper body blue would point at the species.
  - The head circle cuts the top of the orange lobe and leaves small cusps where the two outlines
    meet, at about (55,50) and (68,52) in source units. They are minor.
```

```
BIRD 54 Blue-capped Rock-Thrush (candidate): FAIL
Verdict: A chestnut bird with a blue head and throat and a black wing with a white flash. That
  combination is unique in the set and reads at every size, but the hood has a ruler edge on its
  left and a pinch on its right.
Neighbours at 40px: 44 Tickell's, 33 Orange-headed Thrush, 23 Starling; told apart by the blue
  head on an orange body (colour; nothing else in the set splits that way)
Faults:
  1. [line 1] The throat part of the hood has a 10-unit, near-vertical straight edge between blue
     and chestnut on its left: (48.5,57) -> (47.5,47), control (47,52). On the right, the throat
     leaves the head circle at (70.5,47) heading down and out while the circle there heads down and
     in, so the hood pinches into a waist (at 600px, about (470,210) px). The comment says "no
     waist", but there is one. Fix: start both sides tangent to the head circle and curve them. Left:
     `M47.5 47 Q45.5 54 50 59.5`. Right: from (70.5,47) `Q72 52.5 69.5 58`.
Notes (not blocking):
  - No black on the face. It still reads as the species, because the blue cap and throat, chestnut
    body, black wing and white flash are its combination. Without the black mask and mantle it
    reads as blue-headed rather than blue-capped. Line 5 allows this as a cuteness compromise.
  - The white flash is a sideways oval (rx4.2 ry2.8, -30 degrees) across a steep black lobe, and
    at 600px the lobe and oval read a little as a second face (an orca's eye). Laying it along the
    lobe's long axis (rotate about -65 degrees) would make it a wing flash.
```

```
BIRD 55 Small Minivet (candidate): FAIL
Verdict: Rounder and shorter, as F9 asked, but the flame is now a round patch on the chest with
  grey below it, which is a robin's pattern, not a minivet's.
Neighbours at 40px: 47 Small Minivet, 44 Tickell's, 15 Indian Robin; told apart by the slate body
  with an orange chest spot (colour)
Faults:
  1. [line 5] The flame lobe stops at y=76, and slate fills the front below it down to the vent
     (about y=87). The male Small Minivet's flame runs from the breast to the vent, paling toward
     yellow, so a slate ball with a round orange chest patch contradicts the species. At 220 and
     40px it reads as a grey robin. Fix: carry the flame lobe down the front to the lower rear
     (bottom near (50,84), still inside a 2 to 3 unit slate rim), so the orange is the whole
     underside, as 47's is.
Notes (not blocking):
  - The head circle cuts the top of the flame lobe and leaves a shallow bite with two cusps (at
    600px about (345,243) and (405,243) px). The lobe could start a unit lower or follow the head's
    curve.
  - It is the same template as 44 and 54 (tail, wing and body within a unit or two).
```

```
BIRD 56 Sirkeer Malkoha (candidate): FAIL
Verdict: It finally has the long tail the real bird is known for, and the bill is half the old
  club. But the yellow tip is a fat drop with a step where it joins the red, and the tail is a
  thin stalk.
Neighbours at 40px: 11 Malkoha, 13 R-W Bulbul, 25 Spurfowl; told apart by the olive body with the
  red-and-yellow bill spot (colour)
Faults:
  1. [line 1, bill rule] The yellow starts at (77.5,34), about 1.3 units above the red's own upper
     contour there (about y=35.3). That leaves a step and a corner on the bill's top edge where the
     colours change (at 600px, about (503,123) px). The bill also ends about 7 units across, chord
     (84,39.5) to (80.5,45.5), as deep as the visible red section, so the tip is a rounded club.
     Fix: start the yellow on the red's edge (`M78 35.4`). Close the last 4 units to about 3 deep,
     so the arched bill tapers to a soft tip: for example, end the outer curve `Q86.5 42 84.8
     44.6 Q83.4 46 82 44.6` and pull the lower edge up to match.
  2. [line 5, line 7] The tail is a long stalk 4.5 to 5 units wide with nearly parallel sides, so it
     reads as a stick through the bird or a rat's tail. The Sirkeer's tail is long, broad and
     graduated, with white tips. After the adjust its tip also lands at about (3,92), in the
     frame's corner. Fix: widen it toward the end (about 8 to 9 units at a rounded tip) and
     shorten it so the tip sits near (15,88) in source. A pale tip band can be the third mark if
     wanted.
Notes (not blocking):
  - The buff belly and darker wing are clear. 9 shapes, within budget.
```

## Candidate pairs at 40px, for the gate-2 sheet (description only; he chooses)

- **44 Tickell's vs 54 Rock-Thrush**: 54 has the stronger read at 40px. A blue head on an
  orange body is a split no other bird in the set has. 44 reads as a blue bird with an orange
  front, which is right for a blue flycatcher but sits near the Verditer and a bluebird.
- **47 Small Minivet (old) vs 55 (new)**: 47 reads more as a minivet at 40px. It keeps the
  slim, long-tailed shape with orange down the whole flank. 55 is rounder, which answers "a bit
  long", but its round orange chest on a grey ball reads as a robin.
- **11 Malkoha (old) vs 56 (new)**: 11's big red-and-yellow bill is the loudest mark at 40px, but
  it is a tail-less ball. 56 has the real bird's long-tailed shape, but at 40px the tail is a
  hairline and the bill shrinks to a dot. 11 wins on recognition at that size, 56 on truth to
  the bird at 220px.

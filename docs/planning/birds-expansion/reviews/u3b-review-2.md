# U3b review 2, 2026-10-15

Review 2 of U3b: verification of the drawer's one fix pass on the twelve faults from review 1.
33 Orange-headed Thrush passed review 1 and is not re-judged. Coordinates are source viewBox
units, before the adjust. Every chord `bird-edges.mjs` now lists is hidden under the head or body:
13's crest base, 15's tail root, 54's hood top, 55's tail base and 56's bill base.

```
BIRD 13 R-W Bulbul: PASS
Verdict: The red whisker now sits behind the eye, clear of the cheek, and the wing is a real
  darker lobe reaching the bird's back. A calm, round bulbul with its soft crest, white cheek and
  red vent.
Neighbours at 40px: 14 Magpie-Robin, 12 Y-T Bulbul, 23 Starling; told apart by the brown body
  with a black head and a white centre (colour)
Faults: none
Review 1 faults: 1 fixed (red at (55.5,39.5) r2.6, black on every side). 2 fixed (wing #66513F,
  back edge within about 3 units of the rim; reads as a wing at 600 and 220px).
Notes (not blocking): the crest tip still lands about 2 units from the top edge after the adjust.
  The white belly inside the brown ring is unchanged and is line 8's own requirement.
```

```
BIRD 15 Indian Robin: FAIL
Verdict: The tail is now a fan the Magpie-Robin's way, widening from about 6 at the root to about
  10 at its round end. It reads as a cocked tail, not an even bar. One small cut remains on the
  white shoulder patch.
Neighbours at 40px: 14 Magpie-Robin, 16 Koel, 17 Drongo; told apart from 14 by 14's big white
  belly (colour; 15's front is all dark with a chestnut vent), and from 16 and 17 by the raised
  fan tail (silhouette)
Faults:
  1. [line 8, ¶31] The wing lobe's lower-right edge was narrowed (`Q42 56 46.5 51`), but the
     white patch was only partly moved. Its right side reaches about x=42.9 at y 56 to 58, where
     the lobe's edge is about x=42.3, so the white pokes about half a unit onto the black body.
     At 600px, about (250,320) px, white meets black with no blue between. Fix: replace the
     ellipse with
     `<ellipse cx="37.8" cy="55" rx="3.3" ry="5" fill={WHITE} transform="rotate(-25 37.8 55)" />`,
     which leaves about 0.8 units of lobe on every side.
Review 1 faults: 1 fixed (fan, see the verdict). 2 not fully fixed (the white is clear of the
  top edge now, but cut on the right; this is fault 1 above).
Notes (not blocking): the tail's root sits at mid-back height, (31 to 36, 48 to 52), the same as
  14's. At 600px a broad paddle raised off a round ball is still the gesture closest to ¶36, but
  it is now the family's tail, and the owner sees 14 and 15 side by side at gate 2. The chestnut
  vent is now an oval laid along the lower curve and reads as the vent.
```

```
BIRD 23 Brahminy Starling: PASS
Verdict: The black is now the head's own crown, not a hat. It runs from the bill base over the
  crown on the head's outline (proud of it by under 0.3 units) and down the nape as a tuft,
  with its lower edge dipping to just above the eye.
Neighbours at 40px: 33 Orange-headed Thrush, 54 Rock-Thrush (candidate), 13 R-W Bulbul; told
  apart by its paler apricot and the black crown (colour)
Faults: none
Review 1 fault: 1 fixed.
Notes (not blocking): at 600px the crown with its nape tuft reads like swept-back hair. That is
  close to the real bird's loose crest, and his eye decides. The tuft hooks down and back up at
  its end ((44,36) to (45.5,41.5) to (50,40)); a single curve without the hook would read more as
  feathers than as a curl. The head now breaks the body's outline, which also settled the
  "plain ball" read. The blue bill base is visible.
```

```
BIRD 44 Tickell's Blue Flycatcher: FAIL
Verdict: The flat-topped egg is gone. The rust breast now sits in a white bib, which is the
  right idea, but the bib's top corners run up past the rust as two thin white needles beside the
  head.
Neighbours at 40px: 54 Rock-Thrush (candidate), 31 Verditer Flycatcher, 4 Kingfisher; told apart
  by the deeper cobalt with the orange-and-white front (colour)
Faults:
  1. [line 2, line 8 ¶31] The white bib starts at y of about 50.5, as high as the rust lobe, and is
     wider than the rust above its widest point (y of about 63). On both sides a white wedge
     therefore shows between the rust, the blue and the head, tapering to a point near y=51:
     left about (48.5 to 50, 51 to 60), right about (68 to 71, 52 to 62). At 600px these are white
     needles at about (300,260) and (440,260) px. Fix: tuck the white's top under the rust's
     widest point, so it only shows as the belly below the breast:
     `M60 58 Q71 60 71.5 68 Q71.5 78 62 82.5 Q56.5 86 50 84.5 Q45 82.5 44.5 76 Q44 66 49 60 Q54 57.5 60 58 Z`.
     The white then emerges from under the rust at about y=62 on both sides.
Review 1 fault: 1 fixed (the white's edge against the rust is now the rust's own round bottom).
Notes (not blocking): the deeper cobalt (#2A62C4) points at the species better than review 1's
  bright blue.
```

```
BIRD 54 Blue-capped Rock-Thrush (candidate): FAIL
Verdict: The ruler edge is gone and the white flash now lies along the wing. But the hood still
  pinches at the join on both sides, so it is a blue head on a blue ball, not one hood.
Neighbours at 40px: 44 Tickell's, 33 Orange-headed Thrush, 23 Starling; told apart by the blue
  head on an orange body (colour)
Faults:
  1. [line 8, ¶31] Both sides of the throat lobe leave the head circle heading out (left
     `Q45.5 54`, right `Q72 52.5`), while the circle at those points, (47.5,47) and (70.5,47),
     heads in. So the hood has a waist on each side: at 600px, notches at about (290,205) and
     (470,210) px, two blue balls stacked. Review 1's suggested path had the same flaw on the
     right; this is the correction. Make both sides leave the circle on its own tangent, so the
     throat narrows into a rounded chin:
     `<path d="M70.5 47 Q66.5 52.75 64 56.9 Q61.5 61 59 61 Q56.5 61 54 56.9 Q51.5 52.75 47.5 47 Z" fill={BLUE} />`.
     Quadratics only, as the rest of the file is. The first control of each side lies on the
     circle's tangent at the join, the midpoints (64,56.9) and (54,56.9) sit on the line between
     their two controls, and both chin controls lie on y=61. So it is smooth at both joins, at both
     midpoints and at the chin, and the throat is about 11 wide at y=56.
Review 1 fault: 1 half fixed (the straight left edge is gone; the pinch remains, as fault 1).
Notes (not blocking): the white flash (rx4.4 ry2.6, -65 degrees) now reads as a wing flash, not
  an eye.
```

```
BIRD 55 Small Minivet (candidate): PASS
Verdict: The flame now runs from under the chin to the vent as one lobe in a slate rim. With the
  grey head and back and the fire spot on the dark wing it reads as a male minivet, not a grey
  robin.
Neighbours at 40px: 47 Small Minivet, 15 Indian Robin, 44 Tickell's; told apart by the slate body
  with the orange underside (colour)
Faults: none
Review 1 fault: 1 fixed (flame lobe to (44.5,81); at least 4 units of slate between it and the
  wing).
Notes (not blocking): the head circle still leaves two small cusps on the flame's top, at about
  (355,243) and (420,243) px at 600px. The lower third in FIRE would suggest the real fade to
  yellow, but that is optional and would be a fourth mark.
```

```
BIRD 56 Sirkeer Malkoha (candidate): PASS
Verdict: A slim, arched cherry-red bill with a yellow tip that tapers to a soft point, and a
  broad tail down and back. It reads as the malkoha at 600 and 220px, and is cute.
Neighbours at 40px: 11 Malkoha, 13 R-W Bulbul, 25 Spurfowl; told apart by the olive body with
  the red-and-yellow bill (colour)
Faults: none
Review 1 faults: 1 fixed. The yellow's ends, (78.7,35.7) and (79.6,42), lie exactly on the red's
  two edges, so there is no step. The bill tapers from about 8 at the head to a 3.4 round tip,
  so it is no club. 2 fixed (tail about 8 wide at the root and 9 at its round end; at 600px it
  reads as a tail).
Notes (not blocking): the tail is now short for a Sirkeer; its signature is a long tail. The
  adjust grew the bird to s 1.271 and the tail tip lands at about (4.6,91) of the frame, which is
  within the reach cap.
```

## Candidate pairs at 40px after the fixes (for gate 2; he chooses)

- **44 vs 54**: unchanged from review 1. 54's blue head on orange is the more distinctive split.
- **47 vs 55**: much closer now. 55's orange underside reads as a minivet as well as 47's does,
  and 55 is the rounder bird; 47 keeps the long, slim shape.
- **11 vs 56**: 56's bill is now slim and reads at 40px as a red-and-yellow tick. 11's bill is the
  bigger mark there; 56 is truer to the bird.

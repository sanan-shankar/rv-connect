# U4a review 1, 2026-10-16

Review 1 of U4a (new birds 1 to 4: 57 Grey Junglefowl, 58 Spot-billed Duck, 59 Swamphen, 60 Black-winged Kite).

Judged against `reviewer.md` and nothing else, from the 600px renders, the 220/96/40px sheets
(the four alone and beside their look-alikes) and the `draw()` source. Coordinates are SOURCE
viewBox units (what the drawer edits); where a render position matters it is given as "render",
which is the source after the `bird-adjust.json` transform. The edge audit's chords were all
checked: every one lies inside the shape drawn over it (body, head or body circle), so none is
visible.

```
BIRD 57 Grey Junglefowl: FAIL
Verdict: A plump grey rooster with a gold cape, red comb and wattle that reads at once, but the tail is two separate hooks with paper between them, not one layered sickle tail.
Neighbours at 40px: Painted Spurfowl (25), Peafowl (1), Hornbill (10), told apart by colour: grey with a gold collar and a red comb against the Spurfowl's chestnut disc, the Peafowl's blue and the Hornbill's plain grey ball; the dark tail tuft is a silhouette the other three lack.
Faults:
  1. [line 5, line 8] The two plumes are two nested crooks, not one tail. The teal plume's
     arch sits inside the dark plume's hole instead of on the dark plume, so a paper crescent
     about 2 units deep shows between them, from about (20,27) to (30,30) (the dark plume's
     inner edge "Q16 27 20 26.5 Q30 27 32 36" runs above the teal's outer edge
     "Q25 27 19 27"); each crook then also shows its own paper eye, so at 220px it reads as a
     double question mark. The dark plume also survives as a sliver under 1 unit wide down the
     teal stem's right side, (32,36) to (40,50), which is a needle (line 2). Fix: make it one
     tail in two layers. Pull the dark plume's inner edge down so it runs at or under the teal's
     outer edge (through about (19,28.5) and (24,30)), so no paper lies between them, and give
     the two stems the same right edge from (32,36) to (40,50) so the dark either shows as a
     band of 3 units or more or not at all there. Staggering the tips (teal curl ending a few
     units short of the dark one, both on the same arc) reads as layered feathers.
Notes (not blocking):
  - The dark plume's top-left reaches render x about 3, close to the left edge; once the tail
    is redrawn, keep its leftmost point at source x 10 or more.
  - The darker wing lobe's tip (35,80.5) comes within about 1 unit of the belly's outline,
    leaving a thin grey rim below it; ending it at y 77 would read cleaner.
```

```
BIRD 58 Spot-billed Duck: FAIL
Verdict: The low boat body and fawn-and-brown colouring say duck, but the bill is a straight black rod with a yellow end (a club, not a duck's bill), it runs into the dark cap at the face, and its tip touches the frame.
Neighbours at 40px: Indian Pond Heron (27), Red-wattled Lapwing (24), Cattle Egret (30), told apart by silhouette: the duck is a wide, low horizontal boat, the heron and lapwing are upright balls (the lapwing on legs), and the egret is white; the black-and-yellow bill is a colour the others lack.
Faults:
  1. [line 1] The bill is as thick at the tip as at the base: about 8 deep where it leaves the
     head (x 73), still about 7.3 deep at x 84, then rounded off over the last 4 units
     ("M71 37.5 Q81 36 88 40.5 Q90.8 42.6 88.2 45 Q81 47.5 71 45 Z"). At 600px it reads as a
     cigar with a lit end, a straight tube pushed into a ball at eye level, not a duck's bill.
     A duck's bill in profile is deepest at the face, its top a long shallow concave line that
     continues the forehead, narrowing toward a flat rounded tip with the nail. Fix: start the
     culmen higher and further back so it flows out of the forehead (top edge from about
     (70,35) down a shallow concave line), keep about 7.5 deep at the face, taper to about 4.5
     at the yellow nail, and shorten the bill so its tip sits at about x 86 (see fault 3).
  2. [line 4] The dark crown and the black bill meet at the face. The cap's front end
     (72,40.5), drawn "on the head's own outline from the bill base", lies about half a unit
     from the bill's top edge at the head's rim (x 72 to 73.4, y 37 to 40.5); the two darks
     (#4C3B2C and #2B2724) read as one band through the head at 96 and 40px, which is the
     mark-on-the-bill blur of ¶26. Fix: end the cap's front at about x 68 to 69 with its lower
     edge rising to meet the head's outline there, so at least 3 units of fawn separate cap
     from bill.
  3. [line 9] The bill's yellow tip reaches render x about 98.7 (source 90.8 at scale 1.159),
     1.3 units from the right edge: at 40px it touches the frame. Fix: the shorter bill in
     fault 1 (tip at about x 86) brings it to render about 93; re-run the centroid harness
     after.
Notes (not blocking):
  - The neck ellipse (63,50, rx 8.5) pokes out past both the head's curve and the breast at
    about (71.5,50), giving the throat a small lump with a notch above it. Shrinking it to
    rx 7 or moving its centre to x 61 lets the head flow into the breast.
  - The rear of the boat (12 to 16, 50 to 58) reads as a squared stern more than an upturned
    tail; a nub that lifts a little above the back line would say duck more plainly.
  - No eye-stripe, by design (a stripe through the eye would break line 4); the cap alone
    carries the dark crown. Acceptable.
```

```
BIRD 59 Swamphen: PASS
Verdict: A purple-blue ball on long red legs with a pale head and a comically big red nose-and-shield: it reads as a swamphen at every size, and the red carries it.
Neighbours at 40px: Purple Sunbird (22), Tickell's Blue Flycatcher (44), Peafowl (1), told apart by colour and silhouette: the red shield and red legs against the Sunbird's all-violet disc with a dark bill, the Flycatcher's orange breast and the Peafowl's blue with green train; the legs break the circle below where the other three do not.
Faults: none.
Notes (not blocking):
  - On the drawer's question, the disc body is carried: the red shield-and-bill and the red
    legs make the silhouette, and the bill tapers to a soft 4.6 tip rather than a club, which
    is right for the species' massive bill.
  - The undertail is dark navy; the white undertail a birder sees flicked up is missing. A
    small rounded cream patch under the tail root (about (24,48)) would add it, if the element
    budget allows (currently ten shapes).
  - The feet reach render y about 97, near the bottom edge; existing legged birds sit similarly,
    so not a fault.
  - The folded-wing lobe is the same falling crescent as the Junglefowl's and the Kite's; at
    40px they part by colour, which is fine, but it is the A6 single-template note again.
```

```
BIRD 60 Black-winged Kite: PASS
Verdict: A soft pale-pearl ball with a black shoulder, a ruby eye and a small hooked bill: it reads as the Black-winged Kite and stays gentle, the "dove-shaped ghost" the selection asked for.
Neighbours at 40px: Cattle Egret (30), Hornbill (10), Brahminy Kite (40), told apart by colour: the black diagonal shoulder and red eye on pale grey against the Egret's warmer white with a buff patch and yellow bill, the Hornbill's mid-grey ball and pale banana bill, and the Brahminy's chestnut.
Faults: none.
Notes (not blocking):
  - On the drawer's question: #D3D7DC on the paper does hold an edge at 40px, but only just
    (about 10 lightness points). The black shoulder and the mid-pearl wing and cap carry the
    silhouette; the body alone would not. Do not go any paler.
  - The bill tip reaches render x about 97.4 (scale 1.323), 2.6 units from the right edge.
    Trimming a unit off the hook or letting the centroid harness take s nearer 1.28 would give
    it air.
  - The cap's front end (72.9,36.4) meets the bill's top edge at its base (71,35.5). The colours
    differ (mid grey against black) so they do not blur, and the cap's lower edge arches over
    the eye (peak at (65.3,32.5)) rather than sloping down at it, so it reads as a soft hood,
    not a scowl. Ending the cap at about x 70 would separate it cleanly from the bill anyway.
  - The selection's "thin black brow" is left out on purpose (it would scowl); the red eye and
    black shoulder carry the species without it.
```

Least sure: the Kite's pass, on the pale body's edge at 40px.

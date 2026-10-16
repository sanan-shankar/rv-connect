# U4b review 1, 2026-10-16

Review 1 of U4b (new birds 5 to 8: 61 Eagle-Owl, 62 Tailorbird, 63 Kestrel, 64 Night Heron).

Judged against `reviewer.md` and nothing else, from the 600px renders, `sheet-61_62_63_64.png`,
`sheet-40-61_62_63_64.png`, the neighbour sheets `sheet-96-61_2_62_8_49_63_32_53_40_42_64_27_28_60_35.png`
and its 40px version, and the `draw()` source. Coordinates are source viewBox units; "render" means
after the `bird-adjust.json` transform. Every chord the edge audit lists lies inside the shape drawn
over it: the owl's tuft bases are inside the body ellipse, the Tailorbird's tail root and the Kestrel's
tail root are inside the body, and the Night Heron's bill base is inside the head. None is visible.

On marks (line 3) I count the way the earlier reviews did: an eye-ring or iris is part of the eye, a
repeated pattern (spots, streaks) is one mark, and anything else laid on the plumage is one mark each.

```
BIRD 61 Eagle-Owl: FAIL
Verdict: A warm tawny horned owl with big orange eyes and two soft ear tufts. It reads at once and parts from the Owlet, but the buff belly has two straight vertical sides, so it reads as an apron sewn on.
Neighbours at 40px: Spotted Owlet (2), Painted Spurfowl (25), told apart by silhouette and colour: the two tufts break the top of the outline where the Owlet is a plain disc, and the body is warm tawny where the Owlet is cool grey-brown; against the Spurfowl, the big pale face and the tufts.
Faults:
  1. [line 1] The belly's two sides are straight vertical lines. The left side,
     `M30 80.2 Q27 62 38.5 57`, keeps x between 29.4 and 30 from y 80.2 up to y 67.7, which is
     12.5 units with 0.6 of bow, before it turns toward the face. The right side,
     `Q73 62 70 80.2`, mirrors it. At 600px they are ruler lines from px (160,375) to (160,485)
     and from (440,375) to (440,485), and at 220px the belly is a tombstone shape set into the egg.
     Exact fix: make each side one even arc that bows outward and follows the body. Replace
     `M30 80.2 Q27 62 38.5 57` with `M30 80.2 A30 30 0 0 1 38.5 57`, and
     `Q73 62 70 80.2` with `A30 30 0 0 1 70 80.2`. That is a 2.7-unit bow spread along the whole
     side, the tawny band beside it is about 9 units at mid-height, and the top ends stay hidden
     under the face.
On the streaks (line 3), they earn their place. The owl has two marks, the belly and the
streak set, plus the facial disc, which is the owl's head. The five streaks are one calm,
regular pattern of small soft dashes, set three over two. They do what "mottled" asks, and they
stop the buff belly reading as a blank bib. They are invisible at 40px, but nothing there needs
them. Keep them.
Notes (not blocking):
  - The tuft tips reach render y about 2 to 3, near the top edge, the same distance the bill tips
    sit from the right edge on several birds. It is for the runner, not a redraw.
  - Two eyes, face-on, follows the Owlet's precedent. Each has a dark pupil and a catchlight, and
    the disc's rims arch over the eyes, so it is not a V scowl.
```

```
BIRD 62 Tailorbird: PASS
Verdict: A small cream bird with an olive back, a rust cap and an olive tail cocked straight up. It reads as a tailorbird, and nothing in the set looks like it.
Neighbours at 40px: Oriental White-eye (49), Green Bee-eater (8), told apart by colour and silhouette: a pale cream body under an olive back, against the White-eye's saturated yellow-green ball and the Bee-eater's emerald; and the upright tail breaks the outline above the back, where both are closed discs.
Faults: none.
Notes (not blocking):
  - On the drawer's question, it is a tail, not a rod. The visible part is about 5 wide where it
    leaves the rump behind the wing tip (27.2,54.3), about 7.6 at mid-length and about 10 at
    its round end. It nearly doubles, so it fans like a cocked wren's tail. At 220 and 96 it reads
    as a tail. At 600 its middle stretch is the most even part, so it comes nearest a handle
    there; if a second pass touches it, pinch the lower third toward 4.5.
  - On the cream edge: it has one, but it is the weakest pale body in the campaign so far.
    #E2D8BF on the paper is about 9 lightness points apart, and warm on warm, so less hue
    difference than the Kite's cool grey. It shows at 600, 220 and 96. At 40px the lower half is
    faint, and the olive back, rust cap, tail and pink legs carry the bird. Do not go any paler.
    If the runner wants more edge, a cream with more yellow in it keeps it pale: `CREAM =
    "#E6D5AE"`.
  - The bill tip (85.6,43.9) and the leg ends (y 90.6) land at about 97 to 98 in render, near
    the right and bottom edges. That is for the runner.
  - Both ends of the rust cap come to points, about 44 degrees, as crescent caps do across the
    set. Neither is a needle.
```

```
BIRD 63 Kestrel: FAIL
Verdict: A small upright falcon: a blue-grey head with a yellow eye-ring and a dark moustache, a chestnut back on a cream breast, and a grey tail with a black band. It reads as a male kestrel, but it carries four marks where the budget allows three.
Neighbours at 40px: Peregrine Falcon (32), Peregrine candidate (53), Brahminy Kite (40), Bay-backed Shrike (42), told apart by colour and silhouette: warm chestnut and cream against both Peregrines' slate-blue; a grey head against the Brahminy's white one; and against the Shrike, which shares chestnut, grey and cream, a narrow upright bird with a hanging banded tail where the Shrike is a closed disc.
Faults:
  1. [line 3] Four marks: the tail band, the pale cheek, the moustache and the three back spots.
     That makes 14 drawn shapes, and line 3 allows three marks. The earlier rounds failed the
     Peregrine on exactly this count. The spots do the least work. At 600 three dots on a large
     chestnut field read as a token, not a spotted back. At 96 and 40 they are gone. The grey head
     already parts the bird from the Brahminy, which is the job the selection gave the spots.
     Exact fix: delete the spot block,
     `{[[39, 47], [43.5, 58], [40, 69]].map(([x, y], k) => (<ellipse ... fill={SPOT} ... />))}`,
     and the `SPOT` constant. That leaves three marks and 11 shapes. (If the drawer would rather
     keep the spots and drop the cheek, that also meets the line. But the cheek carries the cream
     up into the face and ties head to body, which matters for the next note.)
Notes (not blocking):
  - On the moustache: it reads as the kestrel's moustache, not a drip. It is 4 wide where it
    hangs from under the eye-ring and narrows to a 2.4 round end on the cheek. A drop of liquid
    is the reverse, narrow above and round below, so this reads as a streak, the field mark,
    and nothing in it is sad. At 40px the ring is half a pixel, so the eye and the streak merge
    into one small dark keyhole. That is acceptable at that size.
  - On "one bird or an egg split in half": it reads as one bird, just. The chestnut/cream
    boundary runs the full height of the body from under the head to the tail. It bows about
    6.6 units toward the breast, so it is a curve, not a cut, but the body does come close to a
    two-tone egg at 600. Two things hold it together: the head overlaps both colours, and the
    wing tip crosses the body's outline onto the tail, which is what a folded wing does. Deleting
    the spots (fault 1) will make the chestnut flatter. If it then reads as a half, end the wing's
    lower edge a few units above the belly line, so cream shows under the tip and wraps the
    wing.
  - On the 40px seat: it is smaller than its round neighbours, narrower by about a third. That is
    inherent to an upright bird whose height already spans render 9 to 97. It still reads, so it
    is not a fault. A shorter tail is the only lever if the runner wants more.
```

```
BIRD 64 Night Heron: PASS
Verdict: A stocky pale-grey heron hunched on short yellow legs, with a black crown and back, a grey folded wing, a red eye and a stout black dagger. It reads as the Black-crowned Night Heron and stays soft.
Neighbours at 40px: Black-winged Kite (60), Indian Pond Heron (27), Little Cormorant (28), Jacobin Cuckoo (35), told apart by silhouette and colour: against the Kite, a horizontal loaf on two yellow legs with a long bill and the black ON TOP (cap and mantle), where the Kite is a round disc with a black diagonal slash and no legs; against the Pond Heron, cool grey where it is buff and maroon; against the Cormorant and the Jacobin, mostly pale where they are mostly black.
Faults: none.
Notes (not blocking):
  - Against the Kite, they part at 40px, by silhouette and by the yellow legs. But the two share
    a palette almost exactly: body #D5D9DC against #D3D7DC, wing #A3ACB5 against #A3ACB6, black,
    and a ruby eye. At 96 they look like siblings. That is a note for gate 2. The species gives
    a cheap way apart: the real bird's crown and back are a glossy blue-green black, so
    `BLK = "#1F3436"` would add a colour difference without touching the drawing.
  - The pale body has the Kite's edge on the paper, about 10 lightness points apart: "only just",
    as in U4a.
  - The bill tip (88,46.5) lands at about 98 in render, near the right edge. That is for the
    runner.
  - The cap's forehead end (75.2,38.55) leaves about 3.3 units of pale above where the bill
    leaves the head, so cap and bill do not join. Its lower edge sits 2 above the eye and is a
    smooth arc, so it reads as a cap, not a brow.
```

Least sure: the Tailorbird's pass, on the cream body's edge at 40px.

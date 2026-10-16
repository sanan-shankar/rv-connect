# U4c review 1, 2026-10-16

Review 1 of U4c (new birds 9 to 12: 65 Pied Kingfisher, 66 Wire-tailed Swallow, 67 Grey Wagtail, 68 Rock Pigeon).

Judged against `reviewer.md` and nothing else, from the 600px renders, `sheet-65_66_67_68.png`,
`sheet-40-65_66_67_68.png`, the look-alike sheets (`sheet-40-` and `sheet-96-65_14_35_46_64_66_44_31_38_59_67_12_49_62_8_68_10_3_57_63.png`)
and the `draw()` source. Coordinates are source viewBox units. Every chord and flat curve the edge
audit lists is accounted for:
- Kingfisher: the tail root and the breast band's rear end lie inside the body and under the wing.
  Its two `L` edges are the chisel bill, which line 1 allows, with a 3-unit round tip and the base
  inside the head.
- Swallow: the wing's front end and the bill base lie inside the head.
- Wagtail and Pigeon: the "flat Q" pieces are legs, straight with round ends, as line 1 allows. The
  Pigeon's other "flat Q" is the 4-unit bottom of a wing bar, an exact piece of the wing's lower
  curve.
- Wagtail: the tail root and the wing's front end lie inside the body and head.

Line 3 is counted as in U4b: an eye-ring or iris belongs to the eye, a repeated pattern is one
mark, and a cap or band is one mark each.

A finding that two of the four share. The Kingfisher's white (#E3E6E9) and the Swallow's white
(#E4E8ED) are lighter than the paper's shade by only about 4 lightness points (L* about 91 to 92
against the paper's 95.5). The pale birds passed so far (Kite, Night Heron, Tailorbird) sit about
9 to 10 below it. Cool against warm makes the edge visible at 600 and 220. At small sizes the eye
stops seeing a blue-against-yellow difference on a small area and reads only lightness, so at 40px
these whites go back to being white space. That is the failure of paragraph 25.

```
BIRD 65 Pied Kingfisher: FAIL
Verdict: A white kingfisher with black on it: a white head with a black shaggy crest, a long black dagger, a black spotted wing and one breast band. That answers paragraph 25, because it is not another black ball, but its white is so close to the paper that at avatar size the belly turns back into white space.
Neighbours at 40px: Magpie-Robin (14), Jacobin Cuckoo (35), Tricolored Munia (46), Night Heron (64), told apart by colour and silhouette: a white head under a black crest where those three have black heads, plus the long dagger; against the Night Heron, upright with a black spotted wing and a crest breaking the top, where the heron is a horizontal grey loaf on yellow legs.
Faults:
  1. [line 8] The white has no edge on the paper at 96 and 40px. WHT #E3E6E9 is L* about 91.1
     against the paper's 95.5, so the lower belly's outline, from the band (70,62) round to the
     tail, disappears at 40px. The bird is then held only by its black pieces. Exact fix:
     `const WHT = "#DADFE5"` (L* about 88.6). That is the lightest white that gets about seven
     points of edge, and beside the black it still reads white. If it still fades at 40px, the
     structural answer is the Cattle Egret's: a slightly darker shade crescent along the lower
     belly. That would add a shape, so it is not a one-liner.
On the six wing spots (line 3), they earn it. The bird has three marks: the crown, the band
and the spot pattern. The spots are what make the wing "pied". Without them the wing is a solid
black mass and the bird slides toward the Magpie-Robin. They read at 220 and 96, and at 40 they
lighten the wing. Six in two rows reads as speckling where three would read as buttons. Keep
them.
Notes (not blocking):
  - The crown ends 3.3 units above where the bill leaves the head, and its lower edge clears the
    eye by 2.6. The face is clean, and the eye (#0E0F12) is the darkest point.
  - The crest's top sits at render y about 6 and the bill tip at about 97% of the width, near
    the edges like several others. That is for the runner.
```

```
BIRD 66 Wire-tailed Swallow: FAIL
Verdict: A steel-blue swallow with a rust cap, a white throat and belly, and two wire streamers, leaning back as if perched on a wire. It reads as the species, but its white underparts have the same near-paper white as the Kingfisher's.
Neighbours at 40px: Tickell's Blue Flycatcher (44), Verditer Flycatcher (31), Common Kingfisher (38), Swamphen (59), told apart by silhouette and colour: a diagonal, swept bird trailing two wires against four closed round birds; a deep navy-steel against cobalt, aqua, cyan and purple; and the warm patch is the cap on TOP, where Tickell's orange is on the breast.
Faults:
  1. [line 8] Same as the Kingfisher. WHT #E4E8ED is L* about 91.8, so the belly's lower outline,
     about 40% of the bird, fades at 40px and the swallow becomes a blue crescent. Exact fix:
     `const WHT = "#DADFE5"`. Beside the navy it still reads pure white.
Notes (not blocking):
  - On the rust cap, it is a cap, not a beret. It covers the crown from the forehead to the nape,
    which is what the real bird's chestnut crown does. Its lower edge is highest over the eye
    and lower at both ends, like a cap pulled down, not a beret's tilt. It clears the eye by
    2.8.
  - The cap's forehead end (81.65,30.67) is only about 2 units from where the bill leaves the head
    (about 82,32.7). Rust and black do not blur, so this is not a fault, but at 40px they touch.
    Optional exact fix, which keeps the eye clearance at about 3:
    `<path d="M81.2 29 A16 16 0 0 0 50.06 32.61 Q57.6 31.2 64.2 26.4 Q72.8 22 81.2 29 Z" fill={CAP} />`
    (the new end is on the head's outline, about 3.8 from the bill).
  - On the wires at 40px, they read as wires. Each is 3.6 at the base and 2.6 at the round end
    (about 1.5px at 40px). Both carry on the line of the wing tip, so they read as the tail
    trailing, not as legs.
  - The upper wire's end sits at about 3% of the width from the left edge in the render. That is
    for the runner.
```

```
BIRD 67 Grey Wagtail: FAIL
Verdict: Slate over lemon with a long dark tail and pink legs, the winter bird: it parts from the Yellow-throated Bulbul exactly as planned, but the white brow reads as a cartoon eyebrow raised in surprise, not as a supercilium.
Neighbours at 40px: Yellow-throated Bulbul (12), Indian White-eye (49), Tailorbird (62), Green Bee-eater (8), told apart by colour and silhouette: yellow LOW (the whole belly) under a slate head, where the Bulbul is a grey disc with a yellow head; a horizontal bird with a tail and legs against the White-eye's and Bee-eater's closed discs; slate and lemon against the Tailorbird's olive and cream.
Faults:
  1. [line 4, line 7] The supercilium (`M75.6 33.2 Q68.7 27 60.4 33.2 ...`) is a short arch from
     x 60 to 76 with its peak at (68.4,30.1). It is about centred on the eye and curved with it,
     so at 600, 220 and 96 it is an eyebrow, and a raised one: the bird looks startled. A real
     supercilium is a long, nearly flat stripe running back past the eye toward the nape. At
     this size any short white line over the eye reads as a brow, and a long one reads as a
     headband. The house idiom has no brows: the Kite dropped its brow for the same reason. It is
     also 2.55 thick, under line 2's floor of about 3. The brow is not the signature ("lemon under
     slate, a long tail"), and the bird reads without it. Exact fix: delete the supercilium
     `<path ... fill={BROW} />` and the `BROW` constant (the drawer's own fallback).
Notes (not blocking):
  - The slate/lemon boundary, the wing's lower edge, is a long gentle curve, bowed about 2.2
    over 32 units and 1.7 over 19. It is a curve, not a ruler.
  - The tail's end sits at about 3% of the width from the left edge in the render. That is for
    the runner.
```

```
BIRD 68 Rock Pigeon: PASS
Verdict: The campus pigeon: a plump blue-grey body, a darker small head with an orange eye, a green-over-purple collar, a pale wing with two black bars, coral legs. It reads at once as everyone's pigeon.
Neighbours at 40px: Hornbill (10), Laughing Dove (3), Grey Junglefowl (57), Kestrel (63), told apart by colour: cool blue-grey with a green and purple band at the neck, against the Hornbill's warm grey with a pale banana bill, the Dove's rose-fawn, the Junglefowl's gold cape and red comb, and the Kestrel's chestnut.
Faults: none.
On the eleven shapes (line 3), they hold. It has two marks: the collar, one band in two
colours, and the bar pair. The eleven are the tail, two legs, body, two collar colours, wing,
two bars, bill and head, plus the eye. That is at the "about twelve" limit, not past it, and
at 600 it is clean, not overthought. Each piece is a field mark (the collar, the two bars, the
coral feet, the orange eye) or structure.
Notes (not blocking):
  - The bars now end on the wing's lower edge with round tops and run across the wing, the way
    the real bars cross the folded wing. They read as wing bars, not claw marks.
  - The collar's nape end is under the wing's shoulder, so there is no purple sliver.
  - The tail's left end sits at about 3% of the width from the edge in the render. That is for
    the runner.
```

Least sure: the two white faults (65, 66). `#DADFE5` gives back about seven points of edge and
still reads white beside black or navy. If the owner finds it too grey, the Cattle Egret's shade
crescent is the alternative.

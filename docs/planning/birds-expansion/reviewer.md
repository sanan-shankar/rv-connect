# The bird reviewer: the loop every drawing goes through

The owner, ¶19 of [`brief.md`](brief.md): *"So I've asked you to do this multiple times. Maybe
you failed. So maybe we need, like, an independent reviewing agent so that you create some kind
of a loop to fix that."* And ¶40: *"Make sure you have an independent reviewer. Make sure you
review everything and you are proud of your work."*

This file is that loop. **Every reviewing agent reads this file from disk** and judges against
it; the runner never paraphrases the checklist into a prompt. Independent means the reviewer is
never the agent that drew the bird.

## The loop, per bird

1. The drawer edits the bird's entry in `src/components/common/bird-avatar-v2.tsx` (a fix) or
   appends one (a new species, which also gets a line in `SPECIES_FULL_NAMES` at the same index).
2. The drawer renders it: `node scripts/dev/bird-sheet.mjs --only <i>` (dev server running).
   That writes `e2e/.shots/birds/<i>-<name>.png` at 600px and three sheets with the bird at
   220, 96 and 40px. To see it beside its look-alikes, pass their indices too:
   `--only 35,14,46` puts the Jacobin, the Magpie-Robin and the Munia on one sheet.
3. The drawer runs the mechanical half: `node scripts/dev/bird-edges.mjs <i>`. Every straight
   edge it lists is a question with exactly two answers: it is hidden under another shape, or it
   is a chisel bill or a leg and both its ends are rounded. Anything else is redrawn before the
   reviewer sees it.
4. The reviewer (a separate agent, Opus, which can read PNGs) gets: this file's path, the bird's
   index and name, the paths of the 600px render and the 96 and 40px sheets, the bird's source
   (the `draw()` body), the edge audit output, and the owner's paragraphs about that bird quoted
   from `brief.md`. It answers in the format below.
5. FAIL goes back to the drawer with the numbered faults. **At most three rounds.** A bird that
   fails the third review is parked with the last report in the handover's ledger; it is not
   shipped, and the runner does not keep polishing it.
6. PASS is recorded in the ledger with the reviewer's one-line verdict, and the runner looks at
   the 220px sheet themself before the unit is committed.

## The checklist

A bird passes only if every line holds. The reviewer names the line, the place (viewBox
coordinates, 0..100, centre 50,50), and the fix.

1. **No cut-offs.** No straight edge is visible on the silhouette or between two colour regions.
   A bill that ends in a flat chop, a wing whose lower edge is a ruler line, a crest that stops
   dead: fail. The one straight edge allowed is a chisel bill on a woodpecker or kingfisher
   (the "chisel ceiling" the file already names), and even that has a rounded tip and base. Legs
   may be straight with rounded ends.
2. **No needles.** Nothing thinner than about 3 units at its base. Crests are rounded tufts;
   tail streamers are slender ribbons with rounded ends.
3. **Element budget.** Body, head, wing, tail, bill, eye, and at most three marks. Past about
   twelve shapes the bird is "overthought" (¶22); the old Peregrine is the anti-pattern.
4. **One coherent face.** One eye with its catchlight, one bill, in a relation a child would
   draw. No line that crosses the eye and meets the bill (¶20, "sunglasses"); no mark that sits
   on top of the bill so the two blur (¶26). The eye is the darkest point on the bird unless the
   species has a coloured eye, and then it has a dark pupil.
5. **Reads as the species at 600px.** The one or two field marks a birder would name are
   present, drawn in the real plumage colours, and nothing on the bird contradicts them. A
   compromise for cuteness is allowed (¶14, the Laughing Dove); a wrong bird is not.
6. **Reads at 40px, apart from its neighbours.** On the 40px sheet, name the two or three birds
   in the set it is most like, and say what tells them apart at that size: a colour or a
   silhouette, never a detail. If only a detail separates them, fail.
7. **Cute.** A big soft body, the head set up and forward, a big eye, soft rounded shapes
   everywhere. Not angry (¶7): no sharp brow, no scowl, unless the species demands it and then
   softened. No pot belly (¶22). Nothing that reads as a limb doing something (¶36, "a bird
   trying to wave").
8. **Colour that works together.** Real plumage colours with one accent that sings; adjacent
   regions clearly apart in lightness unless the difference is a deliberate sheen; a pale belly
   has an edge against the paper (`#F5F2EA`), a dark bird has one lit region so it is not a
   void. No two shapes "cutting" each other (¶31).
9. **In the frame.** The visual mass sits near the centre and nothing kisses the edge. The
   centroid script fixes the numbers; the reviewer only flags gross off-centre or overflow.
10. **The house idiom.** `Eye`, `beak()` or a rounded path, viewBox 0..100, mass inside r~45,
    flat fills only (no gradients, filters, strokes as outlines), the `skip` list set to the
    palette family the bird's own body colour belongs to.

## The answer format

```
BIRD <index> <name>: PASS | FAIL
Verdict: <one line a non-technical owner can read: what it is and why it works, or does not>
Neighbours at 40px: <names>, told apart by <colour/silhouette>
Faults:
  1. [line n] <what, where (x,y), the fix>
  2. ...
```

A FAIL carries at least one fault with a location and a fix. A PASS may carry "notes" that are
not blocking, clearly labelled as such.

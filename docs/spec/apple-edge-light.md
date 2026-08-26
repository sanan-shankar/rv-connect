# The edge light Apple puts inside an app icon

What macOS 26 and iOS 26 do to the *inside* of an icon, measured off the
owner's own home screen rather than inferred from Apple's documentation. Not
the glassy rim around the outside of the tile, which is the part everyone
writes about and is not this.

Ground truth lives in `sanan's stuff/Inspiration/`:
`apple bordering.png` (first sighting, blurry) and `not yet right.png` (our
five renders beside the real one, which is the far-right tile).

## Where the real tile is

In `not yet right.png` the real icon's tile occupies **x 2218..2618,
y 25..427** — 400 x 402, square to within two pixels. That matters: every
measurement below is taken in the icon's own 512 coordinate space by mapping
through that rectangle, so nothing depends on eyeballing a bounding box.
`truth.mjs` re-derives the table from the screenshot.

## What was measured

Lift in luminance at the top edge of each hill, at sixteen positions across
the mark (`icon x -> lift`):

| 110 | 130 | 150 | 170 | 190 | 210 | 230 | 250 | 270 | 290 | 310 | 330 | 350 | 390 | 410 | 430 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 83 | 88 | 80 | 76 | 72 | 59 | 48 | 46 | 9 | 6 | 12 | 12 | 8 | 80 | 30 | 12 |

110-250 is the blue hill, 270-350 the cream one, 390-430 the orange.
x=370 is excluded: there a column crosses the cream sitting on the orange, so
"lift" would measure one shape against the other.

A full profile through the blue hill at one column, from the first artwork
pixel downward, on a 357px-wide sample:

```
46 103 120 129 166 162 157 149 142 131 121 119 119 119 119 ...
```

and its bottom edge, going down to the baseline:

```
... 119 121 128 132 136 138 128 123 117 | 41 21 20 ...
```

## What that says

1. **The bodies are flat.** 116 to 119 across 45 pixels of blue. No gradient,
   no dome, no bevel across the surface. Only the edge is touched.
2. **It is a band hugging the contour on the inside**, peaking three or four
   pixels in and back to the fill within about ten. Narrow.
3. **Its brightness is set by which way that piece of contour faces**: 88 on
   the blue's left flank falling to 46 at its right shoulder, 80 to 12 across
   the orange. One light, low, round to the left. Fitted at azimuth 222,
   elevation 25.
4. **It is additive.** The cream hill measures only +9 because it sits at 242
   and clips at 255, not because it gets less treatment. An overlay would have
   had to be 30% opaque on red and 50% on blue to land where the blue hill's
   edge lands; addition keeps the hue, and the edge keeps its hue.
5. **The bottom edge lifts too**, about +19, a third of the top. A bounce.
6. **The tile itself carries a vertical gradient**, L45 at the top down to L20
   at the bottom, plus the outer glass rim. Not yet reproduced.
7. Around a shape the tile darkens about 5L and no more. A contact shadow,
   not a drop shadow.

## The harness

- `truth.mjs` — re-measure the ground truth from the screenshot.
- `measure.mjs` — the shared sampler. Both sides go through it.
- `fit.mjs` — renders our filter at many parameter sets in headless Chrome,
  measures each with the same sampler, scores RMS against the table, and runs
  a coordinate descent over azimuth, elevation, band width, softness, blur,
  surface scale, amplitude and gamma.
- `compare.mjs` — writes the real tile and ours side by side at the same size.

Run from the repo root with the dev server up.

## Three constructions, two of them wrong

**A band masked straight to the contour.** Brightest at the very edge and
falling inward. The measured curve says the opposite: near zero at the rim,
peaking four to six units in. Wrong shape.

**A blurred-alpha shoulder.** Gets that curve right when you measure straight
down a column, and still looks like an airbrush. This one is worth
understanding, because the numbers endorsed it: **vertical depth is not
perpendicular distance**. On the shallow crown of a hill a band twelve units
deep spreads across a third of the shape. Measuring down a column cannot see
that, so the score improved while the picture got worse.

**An inset band between two erosions, weighted by direction.** Thin at last,
because morphology measures perpendicular distance. Right for the hills and
wrong for the bird: a band cut from alpha lights every path equally, so the
hoopoe's eleven cinnamon quill rays each got their own rim and the fan turned
into a diagram. Apple's does not do that.

**Height from TONE, with a narrow shoulder.** The one that holds up on both.
Two neighbouring cinnamon feathers are the same tone, so there is no cliff
between them and nothing lights. The cream band against cinnamon is a cliff.
The dark tip against cream is a cliff. Tone is what decides, which is also the
only thing that could work on the flat PNG we actually ship.

This is the second construction with one number changed: the blur was 1.7u,
which made the lit shoulder fifty units wide and read as an airbrush. At 0.25u
it is a line. The flat middle of every region is zeroed by subtracting what a
flat surface returns, sin(elevation) before gamma, so only cliffs light.

Values, in units of u where u is a fiftieth of the icon: azimuth 238,
elevation 34, blur 0.25u, surface scale 2.6u, amplitude 1.25, gamma 1.2.
It hangs on the art GROUP, never on a path: a tone height field needs the
whole picture, and per path it would only ever see one flat colour.

## The trap that cost three rounds

A fit reached RMS 4.8 against the sixteen-point peak table and **looked
nothing like the target**. The table holds one number per column, the peak of
the band, and a tight bright line and a wide soft ramp with the same peak
score identically. The descent was free to widen the band as far as it liked,
and did.

Scoring the whole profile fixed half of it. The other half was the axis:
sampling down a column measures vertical depth, which on a shallow slope is
several times the perpendicular distance, so a band that measured twelve units
was drawn forty wide.

**The lesson for anything like this: a numeric fit is only as good as the
thing it measures, and a picture is not optional.** Run `strip.mjs`, put the
candidates next to the real one, and look.

Second, smaller trap already fixed in `measure.mjs`: the tile is not one
colour, so a "within N of the tile colour" test calls the top of the tile
artwork and every scan stops on its first row. Threshold at L70 instead — the
hills are 117 and 242, the tile never passes 45.

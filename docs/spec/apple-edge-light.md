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

## The measurement that settles it

Sampled straight across the boundary where the blue hill meets the cream one,
along a row, at 400px:

```
117 118 117 116 119 | 144 | 236 244 242 242 242
```

One pixel of antialiasing and nothing else. Across cream/orange the same.
**Apple puts no line between two colours that touch.** Everything before this
lit a tonal step, and every one of those builds drew a line down the
cream/orange join and around each of the eleven cinnamon quill rays in the
crest. Apple draws none of them. The height field is the union alpha of the
whole picture, so the filter hangs on the art group and never on a path.

Then the four flanks of the blue hill, each read perpendicular to its own
contour, fill first and peak second:

| flank | fill | peak | lift |
|---|---|---|---|
| left | 119 | 206 | **+87** |
| top | 119 | 197 | **+78** |
| bottom | 118 | 138 | **+20** |
| right | 119 | 138 | **+19** |

Every one of them: nothing at the contour itself, peak three pixels in, back
to the fill by nine. One px there is 1.28 units of our 512 box.

## What that says

1. **The bodies are flat.** 116 to 119 across 45 pixels of blue. No gradient,
   no dome, no bevel across the surface. Only the edge is touched.
2. **It is a band hugging the contour on the inside**, peaking three or four
   pixels in and back to the fill within about ten. Narrow.
3. **It lights the silhouette, not the tone.** Nothing happens where two
   colours touch. See above; this is the single fact four builds missed.
4. **The light is at azimuth 215**, further round to the left than up, because
   the left flank (+87) beats the top (+78). Elevation 45.
5. **The dark side holds at 22% of the bright side and never reaches zero**,
   which is what lights the right of things — and it needs almost no ambient
   to get there. One distant light at the right elevation lands on 22% by
   itself; the fit wants an intercept of 0.016, which is a rounding error.
6. **It is additive.** The cream hill measures only +9 because it sits at 242
   and clips at 255, not because it gets less treatment. An overlay would have
   had to be 30% opaque on red and 50% on blue to land where the blue hill's
   edge lands; addition keeps the hue, and the edge keeps its hue.
7. **The tile itself carries a vertical gradient**, L45 at the top down to L20
   at the bottom, plus the outer glass rim. Not reproduced, and out of scope:
   the owner ruled the outer rim out explicitly.
8. Around a shape the tile darkens about 4L and recovers over ten pixels. A
   contact shadow, not a drop shadow — it never leaves the contour far enough
   to read as one.

## The construction that works

`RimFilter` in `src/app/lab/glass-edges/page.tsx`. Five stages:

1. **Depth.** Blur the union `SourceAlpha`. A blurred alpha *is* the normal CDF
   of depth past the contour: exactly 0.5 on it, rising inward.
2. **Profile.** One `feComponentTransfer` table on that depth. Because step 1
   is a CDF, inverting the CDF once turns a table indexed by alpha into a table
   indexed by **depth**, so the measured profile above is drawn literally
   rather than approximated. Scaling the blur and the profile together leaves
   the table unchanged, which is why width is a single dial.
3. **Direction.** `feDiffuseLighting` on a separate blur of the same alpha,
   one `feDistantLight` at azimuth 215, elevation 45, surface scale 3u.
4. **Two linear knobs** on that light, slope 0.3625 and intercept 0.016,
   solved by least squares over all four flanks at once. No search: the lift is
   linear in both, so one render at (1, 0) and one at (0, 1) determine
   everything and the rest is two equations.
5. Add — never blend — mask back to the source alpha, and merge the contact
   shadow underneath.

It reproduces all four flanks within 3 of 255 and leaves internal boundaries
untouched.

**`width` ships at 0.7, not at the fitted 1.** That is a correction to the
measurement rather than taste overruling it: `not yet right.png` is a
downscaled Retina capture, and resampling smears a three pixel band a pixel or
two wider than it is. Fitting the smeared profile fits the smear. Against the
crisp render the fitted width reads about a third too thick — the order of
error a 2x downsample produces — and the owner called it at exactly that,
"about 30% too thick consistently". At 0.7 the top edge peaks 192 three px in
and is back to the fill by seven, against the screenshot's 197 at four and
fill by ten. The peak brightness is untouched; only the spread moves.

Width scales the band and the light that shapes it together, which leaves the
direction alone: the normals depend on the ratio of surface scale to blur, not
on either alone. The contact shadow is deliberately not scaled — it is a
separate thing happening on the tile and it was measured at its own size.

Caveat worth knowing before this goes on anything: the treatment assumes a
ground **darker** than the artwork. On the paper ground it reads as a white
sticker outline, and wants the strength dropped.

## The harness

- `truth.mjs` — re-measure the ground truth from the screenshot.
- `truth-profile.mjs` — re-derive the profile curves.
- `measure.mjs` — the shared sampler. Both sides go through it.
- `compare.mjs` — the real tile and ours side by side at the same size.
- `look.mjs` — photograph any lab room's cells at 4x, because a 132px tile is
  too small to judge a three pixel band in.

Run from the repo root with the dev server up. `fit.mjs` and `strip.mjs` were
deleted: both hung the filter on a transformed group (see below) and so every
number they ever produced was measured at 38% of the size it claimed.

## Four constructions, all of them wrong

**A band masked straight to the contour.** Brightest at the very edge and
falling inward. The measured curve says the opposite: near zero at the rim,
peaking three or four pixels in. Wrong shape.

**A blurred-alpha shoulder.** Gets that curve right when you measure straight
down a column, and still looks like an airbrush. Worth understanding, because
the numbers endorsed it: **vertical depth is not perpendicular distance**. On
the shallow crown of a hill a band twelve units deep spreads across a third of
the shape. Measuring down a column cannot see that, so the score improved
while the picture got worse.

**An inset band between two erosions.** Thin at last, because morphology
measures perpendicular distance — but with a *square* kernel, so a 45 degree
contour gets a band 1.41x wider than a flat one. That is why the hills'
shoulders read as an airbrush while their tops read as a line. A Gaussian is
isotropic; use it instead.

**Height from tone.** Two neighbouring cinnamon feathers are the same tone, so
nothing lights between them, which looked like the answer for a while. It is
not: it draws a line at every internal colour boundary, and the measurement at
the top of this file says Apple draws none. Kept in the room as one labelled
cell so the finding is visible rather than asserted.

## The traps

**A transform on the filtered element rescales the filter.** `<g
transform="scale(0.38)" filter="url(#f)">` applies the filter in the
coordinate system the transform establishes, so a 4.5 unit blur silently
becomes a 1.7 unit one. This cost three rounds and invalidated two harness
scripts. Put the filter on an outer group and the transform on an inner one.

**A numeric fit is only as good as the thing it measures.** A fit reached RMS
4.8 against a sixteen-point peak table and looked nothing like the target. The
table holds one number per column — the peak — and a tight bright line and a
wide soft ramp with the same peak score identically. The descent was free to
widen the band as far as it liked, and did. Score whole profiles, and **put
the candidates next to the real one and look**.

**The tile is not one colour**, so a "within N of the tile colour" test calls
the top of the tile artwork and every scan stops on its first row. `measure.mjs`
thresholds at L70 instead — the hills are 117 and 242, the tile never passes 45.

## Will Apple double it up?

On the home screen, yes. iOS 26 adds its own specular pass to an app icon, and
Apple's own guidance is not to bake highlights in for exactly that reason. So
the icon handed to the home screen stays flat and lets the system light it.
Everywhere else — the sidebar mark, a letterhead, an email signature, the
favicon, a share card — nothing applies this, and baking it in is the only way
to have it at all. One source, two builds.

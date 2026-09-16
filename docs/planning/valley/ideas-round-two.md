# Round two: the ideas, before any code

Written 2026-09-16 by the fresh session `next-session.md` asked for, after reading `brief.md`
(all nine paragraphs), `handover.md`, the obys taste material (`TASTE.md` and the four recorded
reviews), the design system, the lab voice, the Collection, profile and directory specs, the
schema, and the live database. Everything below was decided before a line of code, as ¶9 asked:
*"i'm so happy if an hour goes in brainstorming and planning and ideating and then 5 hours in
finetuning."*

## What this site actually has (measured, not assumed)

The handover said "1,749 photographs with years and buckets". The database says something more
specific, and it changes what is honest to build:

| Thing | What is really there |
|---|---|
| Photographs | 1,815 approved. **1,719 are the Class of 2023's own collection** (2015 to 2026, almost all 2018 to 2023, two of them tagged, none captioned). **96 are the valley's**, every one captioned with a place and a year, 2004 to 2026. |
| Captions that name a place | Big Banyan Tree (2010, 2014, 2017: whole, then "what's left of it"), SBT benches (2009, 2010, 2022: the same benches under the same tree), Games field (2021 bare earth, 2023 green), Senior Audi, Junior hostels, Junior school, Senior school, Asthachal Steps, Indira Gandhi Gate, Dance Cottage, Cave rock, 3 Sisters Rock, Sliding rock, Duranta Hill, Bio park, K Tree, the art gallery pathway. |
| Members | 83. Batch years 1972 to 2026, most of them 2023 to 2026. 75 have the years they joined and left; 57 have a house for every year; 66 a city; 44 a job. 6 teachers with tenure years. |
| Houses | Real, per year, and they progress: Golden, Silver, Neem, Raavi, Palm, Green, Red in junior school; Meru, Nilgiri, Trishul, Kailash in the middle; Krishna, Cauvery, Amaltash, Gulmohar, Takshila, Jacaranda, Alamanda, Duranta at the top. One member's 2020 house is "Covid Year". |
| The campus, on OpenStreetMap | 109 footpaths, three pitches, the water, the school boundary, and named points: Senior School, Junior School, Dining Hall, Senior Auditorium, Study Centre, Music Cottage, Big Banyan Tree, Sliding Rock, Cave Rock, Ashtachal, Tuck shop, and the houses Krishna, Cauvery, Duranta, Red, "Trishul and Kailash". Almost no building outlines. Checked 2026-09-16. |
| The sun, the hills | Round one's `_sun.ts` (correct, tested) and the 30 m elevation, which he judged not detailed enough. |
| Not there | Building footprints, per-metre ground, satellite imagery we may redistribute, a depth model, a face model, GPS on any photograph (stripped at upload on purpose). |

Two thumbnails of the 96 answer 404 on the image host ("Sbt" 2021 and one "Senior school" 2026);
the rows exist and the objects do not. Noted for the bug tracker, not fixed here.

## The bar, restated as questions I asked every candidate

From `brief.md` and the obys reviews, in his words where they are his:

1. **Relevance times craft.** *"if we scored on relevance and how cool it looks"*: both, or nothing.
2. **The opacity test.** *"I could not tell you how they have been made."* Flat shapes and tweens score zero. Shaders, real 3D, image-based art, particles pass.
3. **Clarity at every stage.** *"I knew exactly what I was looking at."*
4. **Mid-transition is design.** *"at every point in the middle of the transition it must look like a good design."*
5. **The frequency budget (¶3).** Always-on is sub-threshold; big things are pulled by a gesture that does a real job, or are rare by nature. Nothing performs on the feed on open.
6. **Symbols people recognise (¶9).** Names, photographs, batch years, houses, the places on campus. Not a bird.
7. **Detail is the bar (¶9).** *"we'd want to see our school."* A dot is not the school. Only photographs show it.
8. **An honest axis.** The obys lesson: a direction lives on an axis native to the material (scroll is scale, scroll is revision time). What are this site's axes? Time (years), place (the campus), scale (one photograph to all), overlap (who was there with you).
9. **Phone first**, with a finger.
10. **Not another mascot (¶2).**

## Every candidate, judged

Sixteen. The three chosen are marked. Rejections are facts about the data or the bar, not verdicts
on the idea, and any of them may be reopened when the data changes.

### 1. The wall: every photograph, at once, by year. BUILD.

Pinch out from one photograph in the viewer and it shrinks into its place in a wall of every
photograph you can see, laid in rows by year, the rows as long as the years were full. Pinch in on
any one and it comes back up to fill the screen. One continuous world, one camera; the photograph
never jumps, it only gets smaller among its neighbours.

- Axis: time and scale, both honest. The zoom-out storytelling he called *"golden"* on obys, on this site's own material, and the *"what am I looking at"* failure of Atlas is answered by the year labels that stay on the left edge at every zoom and the row of the photograph you came from staying lit.
- Symbols: the photographs themselves, the years.
- Frequency: pulled by a pinch that does a job (getting to the whole archive from one picture and back). Rare on its own, and never on the feed.
- Craft: WebGL2, one instanced draw, a thumbnail atlas for the far level, real thumbnails swapped in as photographs grow past ~120px on screen, the full picture past ~800px. Sixty frames a second with two thousand quads is trivial; the work is in the level-of-detail hand-off being invisible and the camera curve.
- Mid-transition: the layout is fixed in world space, so every frame is a true crop of a wall of photographs at some size. There is no in-between state that is not a design.
- Data: honest and lopsided. For him it is his class's 1,719 plus the valley's 96, so 2018 to 2023 are fat rows and 2004 is one row of twenty-seven. That is what the archive is. The room says so.
- Why it was not built in round one: the atlas. The answer for the lab is a script that fetches the 480px thumbnails and packs them into two 2048px sheets under `public/lab/wall/`, **gitignored**, so the dev server serves them and nothing ever ships to the demo or to production. The production build is the same script writing to R2; the room's note says so.
- Where it lives: the Collection's viewer (pinch out), and a "Time" view of the Collection page. This one is the strongest candidate the previous session left unjudged, and nothing I found beats it.

### 2. Then: the same place, years apart, as dust. BUILD.

The benches under the SBT in 2009 lift off the screen as a hundred thousand grains of their own
colour, drift, and settle as the same benches in 2022. Drag the year between the two and the
picture is held wherever your finger is: half dust, half bench. Let go and it settles to the
nearer year.

- Axis: time, at one spot. "Same place, different decade" was parked because nothing tags a place; the captions do, for the valley half, and the pairs are real: SBT benches 2009 / 2010 / 2022, Games field 2021 / 2023, the Big Banyan 2014 whole and 2017 *"what's left of it"* (the landing page already says *"the banyan before the storm took the far branch"*).
- Symbols: places everybody walked past.
- Frequency: rare by nature. It only exists where a photograph has a sibling, and it plays on a press.
- Craft: this is the particle dissolve he loved on obys (*"has to be used somewhere"*) whose only failure was its destination. The destination here is another photograph of the same place, which is the most honest one there is. GPU particles sampled from both photographs in the vertex shader, a curl-noise field for the flight, the lift and settle shaped so the new picture prints in as a wave rather than fading in as a blur.
- Mid-transition: a lit cloud the colour of the place, over a dark ground, with the year counting between the two. That is a design at every frame, and the very thing his 2D-to-3D transition was not (*"this pole cut out quite dirtily"*), because nothing is half-drawn: every grain is whole.
- Data: three or four true pairs today, more when the school's photographer's archive lands. Enough for a room and for the viewer chip; not enough for a page of its own, and it does not want one.
- Where it lives: the viewer, as a small "Also 2009" chip on a photograph that has a sibling; and a strip on the Collection page.

### 3. The weave: everyone who was here, as thread. BUILD.

The school's hundred years as a length of hand-loom cloth. Every year is a warp thread. Every
member is a weft thread woven across the years they were here, coloured each year by the house
they were in: the junior-school colour, the middle-school colour, the senior-school colour. Drag
along it and a shuttle line follows your finger, naming the year and everyone who was at school
that year. Pinch in and the threads separate into people with names. Your own thread is pulled
out, and the ones that crossed yours are the people who overlapped with you.

- Axis: time and overlap. This is *"referencing the time in school"*, which he said he liked as an idea, done with the data the profile already collects and no other site has: the house, year by year.
- Symbols: names, years, houses. Hand-loom cloth is a Rishi Valley thing (`DESIGN-SYSTEM.md` Appendix A names it as a motif; nothing in the app has used it).
- Frequency: pulled. It is a view of the directory's Batches tab, and the profile's "In the valley 2014 to 2023" opens it on your own thread.
- Craft: one full-screen fragment shader that draws real cloth: each thread a lit cylinder with fibre twist along it, over and under the warp with a shadow at every crossing, a sheen that moves with the tilt of the mouse (the tilt he liked on obys). The cloth lies on the page at a slight angle; drag and it slides through the shuttle. Not a chart: if it reads as a Gantt chart it has failed the opacity test and gets rebuilt.
- Mid-transition: a zoom on cloth is cloth at every size.
- Data: 83 threads, most of them 2014 to 2026; three back in the 1960s and 70s. The cloth is thin on the left. That is honest, and it is the one piece here that gets better with every signup. Designed for two thousand threads, shown with 83.
- Colours: house names would want 22 hues, and the design system allows none. The three school stages map exactly onto the three approved tints (leaf, cinnamon, sky), and the house name appears on the segment when you are close enough. A thread with no house data is undyed.
- Where it lives: the directory's Batches tab, and the profile.

### 4. The campus, drawn from its paths. Not this round.

OpenStreetMap has the campus at footpath level, which is more than the previous session knew: 109
paths, the pitches, and the named places including four houses and the Big Banyan Tree. A map of
the paths people walked, in the field-journal hand, with the Collection's photographs pinned to
the places their captions name, and your houses lit in the order you lived in them.

Not built now because of ¶9: *"we'd want to see our school and we can't really do that here."*
Paths and names are the school's skeleton, not the school. There are no building outlines, no
per-metre ground, and no imagery we are allowed to redistribute, so the map would be handsome and
still show a place with nothing standing on it. The photographs are what show the school, and
candidates 1 and 2 are built on them. **Reopen when** building outlines exist (somebody could trace
them from imagery in an afternoon; that is a data task, not a code one) or the photographer's
archive gives every place a picture. The Overpass query and its result are recorded in the log.

### 5. The leaving book: sign a page with your finger. Not this round.

The autograph book on the last day, as a page in the batch's Catch-up: sign once, in real ink that
pools and feathers into the paper, and see everyone's hand. Names in their own handwriting are the
most recognisable symbol there is, and the finger is the pen.

Fresh and phone-native, and parked: it is a write path with a privacy weight (a signature is not
nothing), it is not impossible-looking the way 1 to 3 are, and it lands on the same Catch-up
surface the seal was aimed at. Worth a room of its own later, with the ink simulation as the whole
point.

### 6. The overlap band on the profile. Folded into 3.

"You overlapped with 41 members; 12 were in Cauvery with you in 2020." A slice of the weave
under "In the valley". Not a separate piece: it is the weave opened on one thread.

### 7. The wall and the weave on one axis. Later, if both are taken.

Zoom out of a photograph, past its year, past the decade, and at the century the people who were
at school each year run beneath the rows. The composition principle (*"many cool things working
together as one"*) argues for it; the overcrowding warning argues against doing it first. Both
rooms use the same year axis so they can be joined, and neither depends on the other.

### 8. The capsule seal with the year instead of the bird. A fix, not an idea.

He said the seal was cool and the bird unreadable. "2023" pressed into wax reads at 40px. Recorded
so it is not lost; not built, because ¶9 asked for something else entirely and this is round one
with a different stamp.

### 9. A flock coming home. Rejected, ¶2.

### 10. The banyan grown from members. Rejected (a known metaphor), and the tree is already the
landing's motif.

### 11. Dappled light on the feed. Rejected, ¶3.

### 12. Depth parallax on old photographs. No depth model on this machine; nothing honest to draw.

### 13. Ink that dries in the Letters editor. Cannot own the live contentEditable. Parked.

### 14. The school year as a ring (photographs by month, any year). Only 90 of 1,815 carry a
month. No data.

### 15. Faces named in class photographs. Parked by the Collection spec on privacy grounds, and
rightly.

### 16. Satellite imagery of the campus, tilted into 3D. The one thing that would show the
buildings from above, and the one thing we may not redistribute; and without per-metre ground it
is a photograph on a slope, which he has already judged. Parked until either changes.

## The three, side by side

| | The wall | Then | The weave |
|---|---|---|---|
| Axis | time, scale | time, one place | time, overlap |
| Symbol | photographs, years | places | names, houses, years |
| Gesture | pinch | drag the year | drag the shuttle, pinch |
| Tier (¶3) | pulled | rare by nature | pulled |
| Lives at | the viewer, the Collection | the viewer chip, a Collection strip | Batches, the profile |
| Technique | instanced WebGL2, atlas, LOD | GPU particles, curl noise | cloth in a fragment shader |
| Data today | 1,815 | 3 to 4 pairs | 83 threads |
| Gets better with | the photographer's archive | more captions | every signup |

Three rooms under one parent, `/lab/years`, because they are one idea: **time, drawn**. The
photographs by year, one place across years, the people by year. The parent is the index with a
door to each and the reasoning above in three sentences; the rooms hold the live things.

## How each is built (so the next session can pick it up mid-way)

**The wall.**
- `scripts/dev/wall-atlas.mjs`: reads every approved photograph, fetches its 480px thumbnail,
  fits it inside 64px keeping its shape, shelf-packs into 2048px WebP sheets, writes
  `public/lab/wall/atlas-<n>.webp` and `atlas.json` (id to sheet, uv rect, aspect). The folder is
  gitignored; the room says "run the script" if the atlas is missing. About 70 seconds for 1,815.
- The page loads the viewer's visible set (the same scope rule as the Collection) and hands the
  room ids, urls, sizes and years. Layout is computed once in world units: years descending, each
  year a justified block at a fixed row height, a label per year.
- `_wall.tsx`: a canvas, a camera `{x, y, zoom}` on springs, one instanced quad program. Per
  instance: rect, atlas uv, a texture slot. A small texture cache promotes photographs to their
  thumbnail when they pass ~120 screen px and to the full picture past ~800, and demotes off-screen
  ones. Labels are HTML positioned from the camera each frame, like the hills' peak labels.
- Gestures: two-finger pinch and drag on touch, ctrl+wheel and wheel on desktop, tap to fly to a
  photograph, double-tap to fly all the way out. The start state is one photograph filling the
  frame with the line "pinch out".

**Then.**
- Pairs are picked by caption in the page (SBT benches, Games field, the Big Banyan). Both
  photographs load as textures at their stored display size.
- `_then.tsx`: N particles on a grid over the frame. In the vertex shader each reads its colour
  from A and from B at its grid uv, mixes by progress, and displaces along a curl-noise field
  scaled by a bell over progress (nothing moves at 0 or 1; everything is airborne at 0.5), with an
  arrival wave so B prints in from one edge. Points are soft discs, additive in the airborne
  phase, opaque at rest. The year counts between the two.
- The control is a drag on the picture: progress follows the finger; release settles to the
  nearer end on a spring. A press on the year plays it through.

**The weave.**
- The page loads members with `yearJoined`, `yearLeft`, `houses`, `name`, `batchYear`, and
  teachers with their tenure, and sorts threads by first year.
- `_weave.tsx`: one full-screen quad. Uniforms: the camera (year span on screen, thread rows on
  screen, offset), the pointer for sheen, the hovered and own thread. A data texture carries one
  texel per thread per year: stage (0 none, 1 junior, 2 middle, 3 senior). The fragment shader
  finds its warp column and weft row, decides over/under, shades a cylinder cross-section with
  fibre twist and a crossing shadow, and dyes by stage.
- Labels: names at each thread's start and house names on segments, HTML from the camera, shown
  only past a zoom where they fit. A shuttle line at the pointer's year with the count and names.
- The stage of a house comes from the canonical list's order in `src/lib/houses.ts`: the first
  nine are junior, Meru to Malli middle, Krishna onward senior. Anything else is undyed.

## What I am not doing

- Not touching the feed, the sidebar or any always-on surface. ¶3.
- Not shipping any of this to a product route this session: three lab rooms, screenshotted at
  1440 and 390, two rounds each, then hours of polish. Where each would live is written above and
  in the registry notes for him to say yes or no.
- Not reopening round one's four pieces. `_sun.ts` and the WebGL scaffold in `_hills.tsx` are
  parts; nothing else is.

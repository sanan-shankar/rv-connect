# Progress Log

## 2026-09-02 — the Class Collection was showing the valley's photographs

**One forgotten word, `scope`.** The river is walked in two directions: older, appended at
the foot, and newer, prepended at the head once the year rail has landed mid-river. The
downward walk went through `fetchPage`, which names all five query dimensions. The upward
one, `loadNewer`, built its own call and named four. `loadPhotos` reads a missing scope as
the Valley Collection -- the right default for a cold link, and the wrong one here -- so
climbing out of a seek in the Class Collection prepended valley photographs above the class
ones, under the class heading. The owner: *"what's worse is it showed all the valley
collection photos under the heading of class collection."* Reproduced in one gesture with no
delete involved -- open the Class Collection, press 2020, scroll up -- and the screenshot
matched his pixel for pixel.

It was also the engine of the loop he reported on 2026-08-29 (*"a weird loop of switching
from 2020s to undated ... forever until I reload"*), which was treated then as a re-seed
problem: every prepended valley photograph made the next server page look like news.

Both directions now go through `fetchPage`, and `river-query.test.mjs` pins that structure
rather than the symptom -- one call site, and it names the scope. A sixth dimension added
next year cannot be added to half the river.

**The river also stopped throwing away the reader's place.** *"The page kinda reloaded when
it should stay the same cause now i've lost track of where I was."* Next re-renders this
route after every server action, and adopting that page one REPLACES the river -- fine when
the river is still page one, ruinous once the reader has scrolled into a second or climbed
back out of a seek. The two cursors are the record of having walked, so the re-seed now
declines when either has moved from the seed's. The price is that a contribution made from
deep in a long river waits for the next visit; the alternative is losing your place every
time you correct something.


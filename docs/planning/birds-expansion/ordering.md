# The order of the birds page

The owner, 2026-10-23: *"ordering them in a nice way on the list of birds page on the website.
Right now, there is no particular ordering. It's just kind of random... take every aesthetic thing
into account, you know, the color science of it all, the layouts of it all, tensions, release,
light, warm, dark, cool... What is basically the ordering of birds that will make this look most
impressive will make it seem like there's so many cute options and will just induce maximum
dopamine into the person looking at it... Just make sure things that are too similar, maybe or
things that look identical are separated a little bit."*

The order lives in `src/components/common/bird-gallery-order.ts`; `GALLERY_SPECIES` follows it,
so the birds page and the paid picker both show it. The Support page's plate keeps its own twelve
in their own order (`plate-data.ts`), as he asked.

## What a great order has to do

1. **The first screen is everything.** The grid is 2 columns on a phone, 3 and 4 on tablets, 5 on
   desktop. The first two rows at every width must be the most colourful, best-loved birds, and
   together show the whole palette.
2. **Nothing alike side by side or stacked**, at every width: the three kingfishers, the two
   parakeets, the two bee-eaters, the orioles and the Iora, the two sunbirds, the two munias, the
   black birds, the two lapwings, the two kites, the pale herons, the pigeons and dove, the two
   owls, the four bulbuls, the raptors.
3. **Quiet birds are rests, not blocks.** About thirty birds are mostly black, grey, pale or brown.
   Spread evenly they set the colours off; pooled, they are the grey patch he complained of on
   2026-10-22 (brief ¶43). Never two dark birds touching, at any width.
4. **A visible order.** A random-looking mix is what he asked to replace; the page has to read as
   designed. Colour travelling round the wheel does that, and makes every scroll a new colour world.
5. **Tension and release.** Warm, saturated energy first; calm cool blues and purples at the end.
6. **Shape rhythm.** Round birds alternate with broken outlines (crests, long tails, legs, long
   bills), so the grid's texture varies too.
7. **A star in every short stretch** (any five in a row hold at least one of the best-loved birds),
   and **a strong last row** (the end is what is remembered).

## How it was found

Every bird was measured from its render: mean lightness, colourfulness, its weighted hue, how much
of it is neutral or dark, its five main colours, and its silhouette. A similarity score combined
palette distance (CIELAB), family, and silhouette overlap. A dopamine score per bird folded in his
own verdicts (the Eagle-Owl "instant 10 on 10", the Iora and Red-vented Bulbul "amazing", the
Flameback and Tickell's "brilliant", and so on). Orders were searched by simulated annealing against
the seven aims above, then rendered as the real grid and judged by eye.

**Tried and not taken:**
- **Maximum contrast** (every neighbour as different as possible). A superb first two rows, then
  confetti: it reads random, which is the thing he asked to fix.
- **One colour journey with every bird in it.** Reads designed, but the warm stretch collected all
  the browns into a dull middle band, and it opened on the Spurfowl.
- **Rainbow waves** (three short spectra). Lively, but no visible order.
- **Overture, then a journey from purple back to red.** As good at the top; it ends on a weaker,
  browner last row.

**Taken: an overture, then a journey with rests.** The first twelve are the brightest birds as one
compressed rainbow (Red Avadavat, Hoopoe, Flameback, Eagle-Owl, Iora, Purple-rumped Sunbird,
Barbet, Green Bee-eater, Peafowl, Common Kingfisher, Tickell's, Purple Sunbird). The other vivid
birds then travel the wheel again, red to purple, and every black, grey, pale and brown bird is
spread evenly between them as a rest. A last pass removed every look-alike or dark-on-dark pair
at 2, 3, 4 and 5 columns (one dark bird sits over the half-ivory Pied Kingfisher at 3 columns, which
reads fine), and the Spotted Owlet was moved into the last row so the page ends on stars.

A bird added to the set must be placed in the order by hand; `bird-gallery-order.test.mjs` fails
until it is.

## The 2026-10-30 round

The owner looked at the page again and found four things wrong with the top:

- It was too red and warm. Some red is good for vibrancy, but the top had so much that it read as
  danger and unease rather than calm (the overture, then a journey that opened on red, put a warm
  band across rows three to six).
- Similar birds sat together: the overture's second row was three greens in a row.
- Birds he wanted lower: the Common Iora, Brahminy Starling, Sirkeer Malkoha, Yellow-throated
  Bulbul, Indian Spot-billed Duck, Pied Kingfisher, Jacobin Cuckoo and Coppersmith Barbet.
- Birds he wanted higher: the Spotted Owlet, Peregrine Falcon, Laughing Dove, Brahminy Kite,
  Indian Eagle-Owl, White-throated Kingfisher, Verditer Flycatcher, Yellow-footed Green-Pigeon,
  Jerdon's Leafbird and Wire-tailed Swallow. The Hoopoe should be first, and he suggested
  swapping the owls.

In the same round the grid itself changed (`GALLERY_GRID` in `bird-gallery-order.ts`): seven
columns at desktop instead of five, each bird filling its column up to 100px (145px was too
crowded), because he found the
Support page's twelve birds cosy and full, and this page sparse beside them. So the order is now
checked at 2, 4, 6 and 7 columns, not 2, 3, 4 and 5.

**Taken: a calm first screen, then every colour spread out.** The Hoopoe opens. The Spotted Owlet
takes the Eagle-Owl's old place in the top row, and the Eagle-Owl ends the second row: "swap the
owls" read alongside both owls being on the move-up list. All ten move-up birds are in the first
three desktop rows; all eight move-down birds sit between 35 and 53, below the first screen. The
first four rows hold three red or orange birds (the Hoopoe, the Avadavat, the Brahminy Kite)
against the old order's seven, and blues, greens, greys and soft browns lead.

It was found the same way as the first order (scored and searched, then judged as the real grid),
against these rules: never two of one colour side by side, never three of one colour in any five in
a row, no warm pair touching (with the maroon Tricolored Munia counted as warm, which the first pass
missed and put beside the Kite and the Lapwing); look-alikes never side by side, stacked or corner
to corner, with the Support plate's measured pairs added to the families (the White-throated
Kingfisher and the Verditer, the Avadavat and the Kite, the Owlet and the Dove, the two black
robins); no two black birds beside or stacked; and a vivid last row.

**Tried and not taken:**
- **Keeping the hue journey and only moving his birds.** The warm band stays, just lower, and
  his complaint was about warmth pooling, not where it pooled.
- **Eight columns at desktop.** Closer to the plate's bird size, but names wrapped, and seventy
  birds left a ragged last row of six.
- **A refinement that reshuffled from scratch to part the two robins.** It moved sixty birds and
  lost the top; a single swap of the Indian Robin with the Black Drongo did it instead.

Two black birds still sit six apart (the half-ivory Pied Kingfisher and the Greater Coucal, the
Asian Koel and the Spot-breasted Fantail). They are corner to corner at seven columns and stacked
only at six (1024 to 1279px wide). That was accepted rather than chased.

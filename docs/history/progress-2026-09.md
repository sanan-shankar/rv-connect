


## 2026-09-27 (directory) — the city panel is its old width, "See all" opens People, and rows leave out the filtered city

Three of the owner's directory notes from the guide memo. The city panel had filled the whole phone
since the 2026-09-15 sheet refactor: its `w-full sm:max-w-md` had been dead while the primitive's
data-side width outranked it, and took effect when that went. It is back to the drawer's own three
quarters of a phone and 384px from sm up (measured 293 of 390, and 384). "See all N" now switches to
People and keeps the other filters, since N was counted under them: with a batch filter on, "See all
37" opens exactly 37. Rows in a city-filtered list leave out that city (Bangalore counts as
Bengaluru); someone whose own city is another one keeps it. The two city string folds moved from
`city-coords.ts` to `normalize.ts` so the card can use them without the gazetteer, re-exported.
Verified as Jerry at 1440 and 390. check green.

## 2026-10-01 (guide) — the Letters chapter's photograph is Lakshman's senior library, levelled, ceiling and all

The owner: "we were using the Solitude in senior library picture for the letter guide photo. there's a
good replacement now that lakshman uploaded titled Senior school library. replace the old one with
this. frame it perfectly and really make use of the photo [...] also take down maya's older version."
Both crops are cut from Lakshman's 4284x5712 original. It was shot about 7.5 degrees tipped down, so
the end shelves leaned inward. The copy is turned back to level with a homography fitted to six
uprights (7.5 degrees of tilt, 0.55 of roll), checked against plumb lines at full resolution; the
skirting under the window lands on one row across 950px. The old crop stopped below the ceiling
because the old photograph's was dim. This one's is lit teak under rust-red beams, so both keep it.
Tall: 2727x4800 from 450px down, the window centred and a third of the way down, its reflection on
the floor below. Wide: 3600x2400 from 820px, so the chair clears the shade the phone lays under the
title. Tint `#756451`, focus `50% 30%`. Seen in the app at 1440x900, 1366x680 and 390x844, with no
console errors. Maya's "Solitude in senior library" went down through the admin content list's
"Take it down", with no note: the row is hidden, both stored files answer 404, and nothing else in
the database referenced them. Her other library photograph, the reading room, stays.

## 2026-10-01 (signup) — an "I don't know" at the trivia gate moves on to another question

The owner: "if anyone answers I don't know or don't know or idk or anything of that variant instead of
rejecting just automatically move onto the next question." The gate used to answer "Not quite. Have
another go." Now an answer that says only that the person does not know does what the swap arrow does:
the box clears, a different question rises in, and focus stays in the box. The rule is
`trivia-dont-know.ts`: every word must come from a small don't-know vocabulary ("idk lol", "sorry, I
don't know", "no idea", "not sure", "pata nahi", "skip") and say one of its core phrases, so a hedge
wrapped round a guess ("I don't know, maybe egg curry?") still goes to the server and passes. It runs in
the browser because the swap is free, and a server check would spend one of the eight attempts the gate
allows in ten minutes. `trivia-dont-know.test.mjs` pins both lists. Driven at 1440 and 390 in Chrome:
"idk", "I don’t know", "no idea lol", "dunno" and "not sure" each swapped with no error; "folk" was still
refused.

## 2026-10-01 (deps, security) — Next.js 16.3.8 closes a critical remote-code-execution advisory

The dependency gate went red on three advisories published after the last green run: GHSA-vcvr-r3jv-pc5j,
critical, remote code execution through `next/og`'s ImageResponse in Next 16.2.0 to 16.3.5, and two
stack-exhaustion DoS advisories in `brace-expansion` (plus a third, quadratic-time, that npm reports
alongside). `next` goes to 16.3.8 with `eslint-config-next` pinned to match, and `brace-expansion`
moves inside its existing ranges to 1.1.21 and 5.0.12. `npm audit` is down to one low and one moderate,
both under the gate. `npm run check` is green, and `next build` passes on 16.3.8.

## 2026-10-01 (profile) — one member's empty About asks after The Script

The owner asked for a small easter egg for Joyeeta Nath alone: where her own sheet says "You haven't
written an About yet. A few lines, so people know who you are now.", hers says "Why not let them know
you love The Script." Keyed on her user id, not her name, and only in the two editable branches of
`letterhead-profile.tsx` (the resting line and the open pen's placeholder), which render on your own
sheet and nowhere else, so an admin opening her profile still sees the ordinary text. Once she writes
an About it never shows again.

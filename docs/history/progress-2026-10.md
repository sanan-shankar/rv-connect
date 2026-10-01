## 2026-10-01 (directory) — the first profession pass to read everybody, and it tidies what it reads

The owner: "there should be a workflow for assigning profession tags intellignetly and combing
through everyone and creating buckets in the best way possible. we have enough to do the first pass
for that. do it." The workflow already existed (`/tag-professions`, built 2026-08-28 at 34 members);
this is its first run over everybody, 196 members with work text and 199 by the end. Mid-run he added
the tidy: "since you're going through all of them you might as well just comb through them polish
them up and um change them all".

**The buckets.** Every pair read with its batch year. Two tags joined: Sports (two athletes and a
sports scientist had nowhere true to go) and Retired, the second status beside Student, which the
vocabulary's own notes said would come. Hints sharpened where the run met a borderline (chips are
Technology, consulting is Business, a PhD is Research and Student), and `TAG_RULES` gained the rule
that settled most rows: the role decides when it names a field, the organisation when the role is
generic. Result: Student 82, Business 21, Finance 16, Healthcare 14, Education 13, Research 12,
Design 10, Technology 10, Engineering 6, Law 6, Hospitality 5, Arts, Media and Social impact 4 each,
Retired 3, Sports 3, Environment 2, Farming 2, Government 1. Eight judged and left untagged: three
bare "Consultant"s, two facilitators, a meditation teacher, "Unemployed" and the test account.

**Two caps moved**, each argued on its constant. `VOCAB_MAX` 18 to 20: nineteen tags each held real
people, and no merge was upward. `TAG_VISIBLE_MAX` 12 to 18: measured at 1440x900 the list box is
256px with 36px rows, so twelve already scrolled, and the cut hid six fields (eighteen people) that
the search box cannot find, because it searches only what is offered. All eighteen tags with two or
more people are in the dropdown now, on desktop and at 390x844.

**The tidy**, 46 rows: acronyms (UBS, UCSD, NALSAR, SRMC), placeholders emptied ("No Organization",
"None", "Na", "-"), a course or college typed as an occupation ("College" became Student at Krea
University, "Masters" Master's Student), "Freelance" and "Self" folded into the title, a doubled
"University", "Peadiatrician". Nobody's work changed except a 2024 leaver's "Architect", now
Architecture Student. Rules in `TIDY_RULES`. A verdict may carry `jobTitle`/`workplace`; a row whose
words changed since the pick is left alone (it caught one member who retitled themselves after the
apply, and the next pick took them back); the write is ONE statement guarded row by row on the words it read, so it is
all-or-nothing and one round trip (186ms each from here; a per-row loop would pass a session's
two-minute tool limit near 640 rows), proved on live rows inside a rolled-back transaction; and the
undo passes over later edits. Those decisions moved out of the script into `profession-pass.ts`,
pinned by `profession-pass.test.mjs`, because a script that opens Postgres at load is untestable.
So the tidy survives the member's next save, `occupationCase` now keeps "in", "at", "a" and the other
small words of a phrase lowercase (the save path had made "Master's In Behavioural Design" itself),
and the 100-character occupation cap is one constant, `OCCUPATION_MAX`, instead of five copies.

Two defects fixed on the way. The applier recorded the LIVE text as the source of a judgement made
on the manifest's text, so an edit between pick and apply was never re-judged. And both pickers
deleted their whole working folder, undo logs included, at every new pick;
`hand-run-passes.test.mjs` now fails a picker that does.

Verified: the dry run read line by line before `--apply` (164 rows changed); the undo's dry run
lists all 164 with nobody passed over; `?profession=sports` and `=retired` return their three each;
`/simplify` ran four reviewers and its fixes are in;
the tidied profile reads "Hedge Fund Analyst" at 1440 and 390, no console errors; check and visual
green.

## 2026-10-01 (profile) — an acronym typed into a job title or workplace survives the save

The owner, asking for the occupation text to be tidied: "there's like a lot of really weird mistakes
that um everyone has". Some of them were the app's. Every writer of `jobTitle` and `workplace` ran
`titleCase`, whose all-caps branch is right for "JEAN-LUC PICARD" and wrong for "UBS", so a correctly
typed acronym was saved as a word. Eighteen live workplaces read "Ubs", "Ucsd", "Srmc", "Nalsar" and
the like, and the admin editor could not correct one: "GNLU" typed there came back "Gnlu".
`occupationCase` in `normalize.ts` keeps a single word typed in capitals and hands everything else to
`titleCase` unchanged. The signup step, the profile pen and the admin editor use it for the two
occupation fields; `name` keeps plain `titleCase`, because a one-word name in capitals is caps lock.
A phrase typed in capitals ("IIT BOMBAY") still loses its acronym, since nothing can tell the two
apart inside a phrase; the profession pass tidies those. Pinned in `normalize.test.mjs`.

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

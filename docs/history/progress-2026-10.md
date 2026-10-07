## 2026-10-07 (auth) — a signed-out visitor to the bare domain gets the landing page again, not a loop to sign-in

The owner, signed out in Safari: "everytime I to to the url on safari (i'm logged out) it doesn't take me
to the landing but instead over here." Safari still held a session cookie whose session had ended (a
password reset, block or deletion request ends every session through the credential epoch, and an
undecodable token is dead too, but none of them removes the cookie). The proxy only asks whether a
cookie exists, so "/" went to /feed; the (main) layout found no session and went to /login; nothing
deleted the cookie, and the sign-in page's Back link went to "/" and round again, on every visit.
Reproduced against production with curl before touching anything.

Every signed-out redirect now goes through `redirectToSignIn()` (`src/lib/sign-in-redirect.ts`): the
layout and the four pages that did their own `redirect("/login")`, since layouts and pages render in
parallel. It sends the visitor to a new GET route, `/api/auth/stale`. That route asks `sessionIsStale()`
(new in `auth.ts`), and only if the cookie is confirmed dead deletes it, `__Secure-` and chunked names
included. It then sends the visitor where someone with no cookie would have gone: "/" when the destination was just the
feed (which is what the bare domain had already become), sign-in with `next=` for anything else. A live
session or a database that did not answer gets the old sign-in redirect with the cookie untouched, so a
cross-site link cannot sign anyone out and a slow pool is not a sign-out (O-03). The demo keeps going
straight to /login. The proxy's own "has a cookie" check now uses the same name rule the route deletes by,
so the two cannot disagree. `stale-session-rule.test.mjs` pins the destinations, the cookie names, check-before-delete and
that no page redirects to /login around it; the C-117 and O-03 tests follow the redirect into the helper.
Driven against the dev server: a garbage cookie and a revoked token on "/" both end at the landing page
with `Max-Age=0` sent; a deep link ends at /login with its query intact; a live session is untouched;
`next=//evil.example` lands on "/".

## 2026-10-05 (profile) — Harini Narayanan joins Srivar on the stray hair's guest list

The owner: "add the hair strand glitch to harini profile". Her id (`cmuqqk3d5001704jq6v3seabr`,
batch of 2020, the only member matching "harini") goes into `STRAY_HAIR_USER_IDS` beside Srivar
Janna's. As before, the hair renders only when she opens her own profile; nobody else's page or
bundle changes. Not seen in a browser: dev-login as a real alumna writes presence telemetry
against her. `npm run check` green.

## 2026-10-03 (backup) — the nightly media backup copies again; no October photo had reached it

Same request as the entry below. `backup` failed on 10-01 and 10-02: every object uploaded in
October (45, then 57) failed to copy into the private bucket with "Header 'x-amz-tagging-directive'
with value 'REPLACE' not implemented". The 2026-09-29 fix had switched the sync to
`--copy-props metadata-directive` to dodge R2's missing GetObjectTagging, and the CLI source
(`CopyPropsSubscriberFactory`) shows that mode sets TaggingDirective=REPLACE on every copy. It never
copied anything: the three runs after it passed only because the bucket sat at 6,032 objects with
nothing new. "default" only asks for tags on multipart copies, so the sync is back on "default"
with `s3.multipart_threshold` raised to 5GB and every copy is one plain CopyObject. The database
half of the job was never affected.

## 2026-10-03 (deps) — the two open Dependabot alerts closed: fast-uri 3.1.8, dompurify 3.4.16

The owner: "fix the github problems. I don't want any failed workflows any more". GitHub listed two
open alerts the local gate does not fail on (it stops at high): fast-uri < 3.1.8 (moderate, host
case normalisation; through ajv under Sentry's webpack plugin and Prisma's dev tooling) and
dompurify 3.4.13-3.4.15 (low, an IN_PLACE hook leaving handlers armed; through posthog-js). Both are
transitive and `npm update` moved them within their parents' ranges; only the lockfile changed.
`npm audit --omit=dev` reports 0. `npm run check` green.

## 2026-10-03 (feed) — "New in the directory" settles on seven people, down from the eight just shipped

The owner, after the entry below shipped eight: "make it 7 people". `DirectoryModule` takes 7 and
the skeleton draws seven rows. Measured at 1440x900 as Jerry: the card is 471.75px, the rail
693.5px, no console errors. With a letter in the rail it comes to roughly 860-895px, so pinned
28px down it ends near a 900px window's bottom edge, where eight ran a full row past it. `npm run check` green.

## 2026-10-03 (feed) — "Signs of life" leaves the feed rail; "New in the directory" shows eight people

The owner: "remove the signs of life siderail element. extend the new in directory to 8 people."
`PulseModule` (`rail/pulse-module.tsx`, the week's post and author counts) is deleted and
`FeedRail` drops it. `DirectoryModule` takes 8 members instead of 6, and the loading skeleton
draws eight rows to match, so the rail does not jump when it arrives.

Measured at 1440x900 signed in as Jerry: the directory card is 532.75px (was 411), the rail
754.5px with its two usual cards, no console errors. The rail is hidden below 1180px, so mobile is
unchanged. One thing to watch: in a week with a letter, the rail is about 920-955px tall, so on a
window under roughly 1000px high the last directory row sits below the fold while the rail is
pinned. `npm run check` green; `npm run visual` 25/25 (the feed is masked below its header).

## 2026-10-02 (docs) — the README is rewritten as the public overview, for people outside the project

The owner is making the repository public and sending the link with job applications (consulting,
product, applied AI), so the README is now written for executives and recruiters rather than
contributors: what the site is, the problem, the features in sidebar order, the hours and the
stack. Two drafts were rejected in review: one an essay (named "Alma", with the school's story, the
demo link and the build rules explained), the next all taglines. The one that shipped is plain
sentences, names no school, and is titled "Alumni Connect". The repository's GitHub description and
topics were set to match. The setup, structure and deploy
sections moved verbatim to `docs/SETUP.md`, which `docs/README.md` now lists.

Every number in it was read on the day, not estimated: 444 accounts (10 of them teachers), batches
1965 to 2026, 362 joined since 14 Sep, 110 home cities in 23 countries among the 323 with a place,
1,964 approved photographs with the oldest dated 1974, 148 unit test files, 516 logged sessions, the
security board's 74 findings with 0 open. The README rounds them ("more than 400", "over 100 cities")
so it does not go stale in a week.

Found while checking the demo link: `demo.rishivalley.space` still fails on every data page (the
2026-09-08 entry in `docs/planning/bugs.md`, a stale build on the demo's Vercel project). Its
database is also missing `Photo.exifYear`/`exifMonth` from `2026-08-30-photo-exif-date.sql`; applying
that was refused by the session's permission check and is left to the owner. The demo link in the
README is dead until both are done. `npm run check` green.

## 2026-10-01 (profile, directory) — a blank avatar no longer replaces the bird; two new members put right

The owner: "fix the person whose location doesn't show up on the map the german dude and why does
dechu kuppanda not have a profile picture or bird", then "if it's blank set it back to a bird".

**Dechu Kuppanda (1983).** His stored photo was 512x512 of pure transparency, 582 bytes, every pixel
zero. A photo always replaces the bird, so he had neither. The framer (`avatar-crop-dialog.tsx`) draws
the crop to a canvas and uploads that, while its preview shows the original file, so a browser that
hands back an empty canvas looks fine to the member and ships nothing. Only his of the 38 stored
avatars was blank. `isBlankImage` in `image.ts` (fully transparent, or one flat colour within 2
levels) now runs in `updateAvatar` before `putImage`, and a blank answers "That photo came through
blank, so nothing was changed." The bird or the previous photo stays. Pinned in
`image-facts.test.mjs`, and checked against his actual file. His `photoUrl` was nulled by hand. The
object itself (`avatars/cmupg85sd001g04l5u0of8qhq/2026/10/bxlkdqlcr4rzf35d0i7rshus.webp`) is still in
R2: the session's permission check refused the delete, so it waits for the owner. Nothing points at it.

**Mahesh Dr G M (1981).** He signed up today with "Osnabrueck Germany", one phrase, no comma. The picker
found nothing for it and he took "Use what I typed", and the map's gazetteer fallback splits on ", " so
it never matched. His row now names gazetteer 2856883: "Osnabrück, Lower Saxony, Germany", 52.27264,
8.0498, with `currentCity` mirrored. Undo: label and city back to "Osnabrueck Germany", placeId, lat and
lng null.

Still unmapped and left alone: Vicky Chandhok's "Kotturpuram" (a Chennai neighbourhood the gazetteer does
not hold) and Mishika Bhardwaj's "Everywhere". Dechu has no city at all. The dev server on :3000 had a
dead database pool, so this was verified against the database and the map's first coordinate rung
rather than in a browser. `npm run check` green.

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

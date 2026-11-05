## 2026-11-05 (feed) — a notification's deep link waits for the cards to settle, and lands the post centred

Found by the full Playwright run before the push: `deeplink.spec.ts`'s fresh-arrival case failed on
both viewports, with or without the rail change. Today's new letter moved every post down one place,
so the spec's ninth post became the three-photograph Banyan mural, 778px tall at 1440x900, and it
landed with its top at −129px.

The aim was wrong, not the target's size. Recorded at the moment of the call: the ten-line post
above it was 496px and settled at 320px one render later. Each card's "Read more" fold measures its
lines in a layout effect and sets state, and React flushes PostFeed's passive effect, the one that
scrolls, before rendering that update. So the scroll was aimed at the unfolded heights, 190px past
the post. The bug has been there since the deep link shipped (C-052). The spec only asked whether
the post was somewhere on screen, which a short target still passed.

PostFeed now waits for `document.fonts.ready` (the fold measures again when the web font lands) and
two animation frames before scrolling. Measured after: the call sees the settled heights, and the
post lands centred, top at 61px of 900 and 86px of 844 under the mobile bar. The spec now asserts
"centred to within 2px", which catches a mis-aim whatever the feed holds. It fails on the old
effect at both viewports.

Considered and not taken: aligning a post taller than the window by its top. No post on the first
page comes near (the tallest is 778px against an 868px threshold), because photographs reserve their
frames and text folds at seven lines.

## 2026-11-05 (feed, letters) — the rail pins by its bottom edge when it is taller than the window, Letters moves to its foot, and Usha Reddy's centenary poem goes up

**The rail.** The owner asked for "This week in Letters" below "New in the directory", and then
noticed that the card he had just moved could not be reached. The rail was `sticky top-7`, pinned
by its top edge whatever its height, and deliberately not a scroll container, so a rail taller
than the window kept its foot below the fold until the feed ran out. Measured with three modules
showing: pinned from 28px to 910px at every window height, so the last card lost 10px at 1440x900,
110px at 1440x800 and all of itself at 1280x720. Before the move, the clipped card was the
directory's last rows, which nobody had missed.

`StickyRail` (`src/components/feed/rail/sticky-rail.tsx`) sets `top` to the smaller of 28px and
"window minus rail minus 28px", from a ResizeObserver on the box. A rail that fits pins 28px from
the top as before. A taller one travels with the feed until its last card sits 28px off the
bottom, then stops. Measured after: a 28px gap below the last card at 1440x900 (top −10px) and
1280x720 (top −190px), and at 1440x1200, where the rail fits, still 28px at the top. The order is
now Collection, Directory, Letters, and the skeleton's two cards already matched it.

`e2e/feed-rail.spec.ts` pins it at 1280x720: after scrolling, the rail's outer gap is 28 either
way. Run against the old `top: 1.75rem` it fails at −190, the same number measured by hand.

**The letter.** A Word document from Dr Usha Reddy (account "Usha Rani Reddy", joined this
morning) went up as a letter under her name: "Oh Rishi Valley, Our Valley!", fourteen four-line
stanzas, her words untouched. Written straight to `Post`, the same row `createPost` would make,
since the body has no mention, link or image and nothing caches /feed or /letters. The subtitle
"A Centenary Tribute" was dropped: in the body it would lead the feed teaser ("A Centenary Tribute
Where mornings bloomed…"), and stanza thirteen already says a hundred years. Her sign-off went at
the owner's word, since the byline carries it, and so did the one-line last stanza, rejoined to
make four. The signature said ICSE 1975 while her profile says left 1976, batch of '78; nothing
was changed there.

## 2026-11-04 (collection) — the Centenary folder: copies out, sorted by subject, every photograph's date explained, and a local page to decide on each

The owner added a OneDrive download of school material to `sanan's stuff/Centenary Content/` (gitignored):
1,095 files, 12 GB, 21 folders and about 150 loose photographs. He asked for the objective trimming to be
done for him (exact copies, black, blurred) and the rest to be made easy for him to judge, and, mid-session,
for nothing to go up to the site, not even to the review room, until he has cut it down by hand.

What was in it: 876 photographs, 183 audio files (37 of them 364-byte FrontPage stubs), 24 videos (about
7 GB, mostly full dance performances), two slide decks, a history of the school's first 40 years as .doc
and .pdf, and six .rar/.zip archives whose every file was already unpacked beside them.

Set aside first, with a note naming the kept copy of each, then deleted on his word (823 MB): 67
byte-identical copies, 10 weaker copies of a photograph also kept (a second scan, a re-save, the same
print with its album border), 30 burst or bracketed frames of a moment whose sharpest frame stayed, one
frame shaken to nothing, the archives and the stubs. Audio was compared by fingerprint, not loudness:
a loudness curve called dozens of different folk tunes identical, because each starts with a quiet
lead-in. Two real audio copies; the 32 numbered folk tunes are different recordings and stay. When a
copy carried the better name (a date, the people in it), the kept file took that name.

The rest is filed under the Collection's buckets (`Photos/People`, `School life`, `Campus`, `Nature`,
`Birds`), plus `Music`, `Video`, `Documents and slides`, and `Not ours, or not photos` (internet images
of Krishnaji, a Facebook screenshot, a sunset named for Kabini). Every move is in `.catalogue/moves.tsv`;
the archives' stored dates and the EXIF survey were kept there before the pile went.

Dates, of the 770 photographs kept: 363 carry a camera date to trust, 42 a date someone wrote in a file or
folder name, and 365 need a person. Three traps found on the way, each now explained per photograph in
`.catalogue/catalogue.json`. A scan's date is the day it was scanned. A Kodak whose clock was never set
dated 94 photographs from 1 January 2004 onwards. And 46 Nikon frames of 10 June 2015 are photographs of
1950s-70s prints, so their date is the copying, not the picture. One photographer's rename template also
stamped "Valparai 17.09.2025" on the banyan mural, which the camera and its folder place in July 2026.
OneDrive's own dates would not have helped: its "modified" date on a scan is the scan date too, which is
exactly what the archives preserved.

`scripts/dev/review-photos.mjs` is the page for his pass: one photograph large with the filmstrip of its
folder, K keep, X drop, S important, and boxes for when, who and a caption, prefilled where the file name already said. What he types
for when is read on the server with the Collection's own `photoDate()` and shown as the site will
print it, and that shape is what the decisions file stores, so a 1919 is flagged as undated now rather
than at import. It decodes with the import's own rules, so a file it cannot show is one the import
would refuse. Local only, 127.0.0.1, saves on every change.
Verified in a browser at 1440x900: 770 photographs listed, a decision, a star, a name and a date written
to disk and logged, then removed again. Not checked at phone size: it is served from this Mac only.
Visible on the site: nothing.

## 2026-11-03 (budgets, review) — bug audit 3, O2's write-path review: the meters count what they refuse, and a retried preview is paid for

The runner verified O2 itself (diffs, the gate, the SearchLog index read back valid on both databases,
13 searches on the busiest member-day and 8 previews confirmed) and pinned the 16-link cap, which
nothing tested. A write-path review found nothing serious and four things worth fixing, each checked
against the code and `@upstash/ratelimit` 2.0.8 before it was changed:

- `consume` remembers a key it finds full. The library's cache blocks a refused key without counting
  it while `getRemaining` drains and says yes, so tokenless sign-ins could pass uncounted.
- The daily budgets keep no library cache (a refused member waited for UTC midnight) and treat a 3 s
  timeout, which the library resolves as a pass, as an outage.
- A failed preview's daily retry is paid from the writer's day and waits for a verified writer.
- The demo's shared visitor is not held to one account's twenty drafts.

Three low findings are recorded on the T2b-02 ledger line, not fixed. The campaign's handover for the
next runner is dated 2026-11-03 in `fix-prompt.md`. Nothing pushed.

## 2026-11-03 (budgets) — bug audit 3, unit O2: one daily budget for what an account may spend, a sweep that every door spends one, and four doors closed

Six commits, `npm run check` green before each. One migration, applied to both databases before the
code that counts on it.

The helper (O-09). `src/lib/daily-budget.ts` is the second instrument beside `rate-limit.ts`: how
much per subject per day, or a standing ceiling on what one account keeps. A `rows` budget counts the
action's own rows (no Upstash command, exact, cannot be switched off by emptying Upstash); a `redis`
one is a 24-hour sliding window under its own prefix for what writes no row. Each entry argues its
number, its outage posture and whether a refusal is a sentence or silent. `budget-coverage.test.mjs`
sweeps 110 actions and 20 route files: each spends a meter, calls a helper proved to, opens with an
admin gate, or is on a reviewed list with a reason. O-09 stays open until its `pending:` entries are
gone (C6-02, C6-05, C4-01, L8-04, C3-02).

Sign-in floods (L5-02). A refused sign-in still spent two to four of Upstash's 500,000 monthly
commands, so one machine could switch every limiter off in hours. A key the meters have refused is
now remembered for up to fifteen minutes, and the door asks that memory and the bot check before
anything that costs a command: a tokenless flood never spent a `login-ip` failure, so it had paid
for the door's reads on every attempt.

Search rows (C6-04): at most 200 a member a day, counted on a new `SearchLog(userId, createdAt)`
index; the busiest real member-day is 13. Link previews (T2b-02): at most 40 new fetches a day,
charged to whoever wrote the link at every door, readers never; 16 distinct links a post or letter;
the nightly sweep removes a preview no body holds after 90 days, its thumbnail through a key that can
only name `link-previews/` (first night: nothing to take). Drafts (C6-03): 3 letters in progress
before an email is confirmed, 20 after, and no link fetched for an unverified writer. The signup
meter's comment no longer says Stage 0 "can write nothing"; a test lists the twelve rows it can.

Check D measured: a newcomer makes 11 to 13 requests through the sign-in and sign-up doors, a brisk
signed-in visitor 77 a minute, so the rules are 1,300 and 1,000 per ten minutes (the design said
1,000 and 600), with a fallback rule if the dashboard cannot hold the cookie conditions.

Visible to members: two refusal sentences ("A letter can hold at most 16 links...", "You have 20
letters in progress..."). Not screenshotted: the shared dev server is serving stale server-action
code (it saved a 17-link test draft twice despite the compiled cap; both drafts and their preview rows
were deleted), and this unit may not restart it.

## 2026-11-03 (catchups) — bug audit 3, unit H4 (stopped part-way): every Catch-up failure reaches the owner, a missing column is not a missing table, and the Edition page and the home read less

Four of the unit's rows, in three commits, before the owner asked for one agent at a time and this
track wound down. `npm run check` green before each.

Failures (L4-01, T2a-04). The missing-table guard matched any "does not exist" that named a Catchup
table, and Postgres names the table in a column error, so a field reaching production before its
ALTER, or dropped while still read, would have put every Catch-up page behind "almost ready",
answered every action with "not set up yet" and stopped the clock, with nothing reported. The guard
now matches only a relation or a table named as missing. The clock's and the batch heal's catches
report every failure; the five pages and `runAction` keep the holding scene and sentence for a real
missing table (both databases hold all seven tables, checked) and report it first. `runAction`
reported nothing at all: it now names the failing action to Sentry, each export by its own name. The
sweep pinning it reads all eight files and fails a catch that returns before its report; run against
the old code it named all ten silent sites.

Reads (L2-04, T3-08). The Edition page's tab title fetched the Edition and the membership itself, so
each was read twice a view; both loaders are now `cache()`d and shared. The home read every answer
of an answering Edition and de-duplicated their authors in memory, to learn only whether anyone had
answered (routed (f): that was its one reader); it now reads one row. Its unused countdown went too.
Nothing visible to members: the pages read live as the test account render as before.

Not reached, for the next track-1 unit: T2b-10 with routed (h) (the premise for deleting the
`audioUrl` count does not hold for a hand-made call: `ownedVoiceRecording` checks the author's
prefix, not the answer, so one member can put one recording on two of their answers; a third option
to weigh against the index is scoping the count to `authorId`, which the existing index serves and
which is exact, since every row naming a recording is its author's or their merge survivor's; live,
no answer carries a recording yet); routed (b) (`submitPrompt`'s window check becomes the curate
path's `updatedAt` touch, so a burst queues on the Edition's row and the 40 cap holds); routed (e)
(`catchups-core.test.mjs`'s asker sweep to `filesContaining("asker:", { under: ["src/app",
"src/components"] })`, and its `ASKS_GIT` entry out of `test-kit.test.mjs`); and Phase H's T3-11,
T3-12, T3-24. No migration was written or applied.

## 2026-11-03 (demo) — bug audit 3, unit L5 (stopped part-way): a nested write is judged by the model it reaches, and the tables a visitor can grow stop at a ceiling

Two of the unit's seven rows, in two commits, before the owner asked for one agent at a time and this
track wound down. `npm run check` green before the second; before the first, red only on a Sentry test
whose 30-second spawn timed out at load average 58 (it passes alone).

Nested writes (L9-10). The demo's last write layer saw a call's root model only, so any writable model
could carry a nested write to a refused one: a post's update promoting its author, a comment's create
filing a report through two writable parents. `demoWriteAllowed` now walks the payload (`data`, both
halves of an upsert, every createMany row) and refuses any nested relation write it does not name; the
two the app makes, a poll's options and a Catch-up's roster, may only create, and each row is judged as
a create of its own. A sweep finds every nested write in `src/` (five today) and fails on one through a
writable model the list does not name. prisma.ts's sentence that a nested write cannot get past is kept,
and is now true.

Volume (L12-08). Every meter is off on the demo and everyone is one persona, so nothing bounded how many
rows a script against the public link could make, and a free-tier database past its size limit goes
read-only, where the nightly reset cannot run either. Nine tables with no bounding unique key now stop at
a ceiling (`DEMO_ROW_CEILINGS`): the extension counts the table before a create and refuses past it. A
test holds every writable model to a ceiling or a unique key pairing a person with a parent row. Proved
on the demo database inside transactions that always rolled back: refused at a ceiling, allowed under
it, nothing changed. Nothing visible on production; on the demo, only a script ever reaches a ceiling.

Not reached, for the next track-3 unit (each re-derived and ready): T8a-09 (a twin of the proxy's closed
API list in demo.ts, pins on the three support refusals, a sweep that every API route is closed, guarded
or listed as safe); T8a-17 (the demo bar's Reset reads the answer and says when it did not finish);
T7a-18 (the roster import's replace inside BEGIN/COMMIT, through an extracted helper a fake client can
test); T8a-10 and T8a-08's check (verify-guard compares counts before and after its refusals instead of
"exactly 40 people", and the world against the seed's own arrays; note it WRITES to the demo, so it was
not run, and its cleanup sets the persona's bio to null); T8a-08's records (bugs.md's "the demo database
is healthy" and its "must NOT be run", TRAPS.md:50 and the schema header's "seven of the eleven"); and
the routed index. Read-only facts gathered for them, 2026-11-03: the demo still holds 40 people, 42 user
places, 1 group and no content; it lacks only `Notification_userId_createdAt_idx` and
`User_lastSeenAt_idx` of production's 138 indexes, and `Photo.exifYear`/`exifMonth` of its columns
(2026-08-30-photo-exif-date.sql never ran there). No migration was written or applied.

## 2026-11-03 (images) — bug audit 3, unit O1: the image optimizer takes no query string, and only the folders it renders

C5-01, the cheapest way to spend Hobby's 5,000 image transformations a month, ships ahead of Phase
O's budget design. `npm run check` green; `npm run visual` 25 of 25 unchanged.

The door. A remote pattern in `next.config.ts` named only a protocol and a host, and Next admits any
query string when a pattern names no `search`. Vercel keys its image cache on the source URL, so
`<photo>?n=1`, `?n=2` and so on were each a new, metered transformation, signed out. The audit could
only call Vercel's half "likely"; one request settled it on production, before this change: a
never-seen `?c501=1` on a real avatar came back `x-vercel-cache: MISS`, age 0.

The premise, checked before narrowing anything. No stored image URL carries a query string (0 of
4,114 rows across every image column). next/image and image-cdn.ts reach only two folders:
`avatars/` (User.photoUrl, written only by updateAvatar) and `uploads/` (posts, letters, Catch-up
answers and uploaded Catch-up pictures, each held there by isUploadedImageUrl or ownedUploadUrls
before it is stored). The Collection, link previews, staging and voice answers all use a plain
`<img>` or nothing. So every pattern now pins `search: ""` and one of those two paths, and the
Collection's full-resolution originals can no longer be asked for at 3,840 px.

Proved after. On the dev server the same avatar with `?n=1` answers 400, as do a Collection original
and a foreign host; the bare avatar and upload answer 200. Signed in as the test account, every
optimizer request on /feed (7), a member's profile (1) and a published Edition (13) answered 200,
and the Collection and directory make none and show no broken image.

Two spellings no pattern can see, measured on both optimizers: a bare trailing `?` and a
`#fragment`. `next dev` keys each as a new entry; Vercel answered both from the bare URL's cached
copy (HIT, the same age), so production is safe from them. That difference went into TRAPS.md
("Serving images"), with the C5-01 shape. The three comments that called this door closed now say
what is open, and OPERATIONS.md's capacity paragraph says what is left.

The pin: `security-regressions.test.mjs` asks Next's own `hasRemoteMatch` over the evaluated config
(L9-01's loader), and a second test feeds it four loose shapes it must catch.

What it does not close. L5-11 stays open: each of today's 164 optimizer photos at each of the 16
permitted widths is still about 2,600 transformations, once per cache lifetime, and it grows with
every avatar. That is the budget design's image unit. Visible: nothing.

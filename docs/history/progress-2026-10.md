## 2026-10-30 (platform) — bug audit 3, unit L4a: the presence beat every three minutes, a tighter proxy, a pool Vercel can suspend, uploads that fit the proxy, and images that take turns

Seven rows in seven commits: six done, one parked. `npm run check` was green before each, or red only
on another track's file in flight, named in that row's ledger line.

The beat (L5-01, the owner's Q27 b). `BEAT_MS` is three minutes, pinned with his reason and against
the three windows that count on a beat arriving: "On the site now" looks back 15 minutes, the visit
cookie 30, the idle line 5, and each must outlast more than one beat. The beat that would land short of
the idle line now waits for it, still one ping per beat, so a visit that ends in stillness ends at the
idle line rather than up to a beat early; a hidden tab still closes it to the moment. Driven on a fake
clock in a signed-in browser as the test account: beats at 3 and 6 minutes while active, the closer
exactly on the idle line, a hide beat at the hide and nothing after (3 beats in 19 minutes where the
old cadence sent 11). The first run caught the idle line falling exactly on the next beat and losing the
closer; `<=` fixed it. What the owner sees: "On the site now" notices a departure exactly as fast as
before, because its window is 15 minutes and someone who left stays listed that long whatever the
beat; a visit that ends by going idle now ends at the five-minute idle line, where it used to end at the
last minute's beat before it (4 to 5 minutes), so "Typical visit" and members' minutes read a little
longer for those visits; a tab that dies without a word can end up to three minutes early.

The proxy (L5-01, T8b-10). The matcher already skipped every static and image path except the
directory map's atlas, which now joins them; the rest of the proxy's traffic (pages, RSC, actions,
presence, /ingest) needs it, so the beat is the larger saving. proxy-rule.test.mjs now imports the real
proxy (Node strips the types; two hooks supply the `@/` alias and next/server's `.js`) and runs it: a
doubled slash no longer passes as the public "/", every route file stays matched, the demo's closed
prefixes and /ingest stay matched, and a new public folder has to be placed on one side. In dev Next's
own repeated-slash 308 answers first, so the proxy is the backstop the finding asked for.

The pool (L5-04's attach half). `attachDatabasePool` from @vercel/functions' `db-connections` subpath.
The package's OIDC chain carried zod 4.1.11 (GHSA-mrhx-c7xc-m3w5, high), so an npm override points it
at the app's own 4.6.7: one zod, `npm audit` clean, no exemption. Each release holds the instance about
5.1 s so idle clients close before Fluid suspends it; inert off Vercel. The hold is Provisioned Memory
(Hobby includes 360 GB-hrs; the last meter read about 10 a month), never Active CPU.

Uploads and images (L8-03, L8-08). `UPLOAD_BODY_LIMIT` is 3.8 million bytes, because every request
passes the proxy and Routing Middleware takes 4 MB of body, not the function's 4.5. One 40-megapixel
Collection encode measured about 650 MB at its peak and four at once 2.1 GB, past a 2 GB instance, so
`sharpImage`'s buffered results take one of two slots per instance and the streamed photo download takes
one too; ten downloads as the test account (three at once, one cancelled part-way) all came back.

The lab (L12-06). `setArchived` asks for an admin on the dev server too, and the gate sweep now refuses
a gate that only runs in some environments.

Parked: L8-01, deferred by the owner on 2026-10-08. On Hobby the converter's CPU counts against the four
hours; option A (a public `s-maxage`) would not cache as written, since the proxy sets `rv-visit` on that
GET and Vercel's CDN never caches a response that sets a cookie.

For whoever is next: moving /ingest off the proxy is the other proxy lever and needs a host the session
cookie never reaches (DNS, the owner's); several comments still say "~4.5MB" (Phase N); check B should
now read Provisioned Memory beside Active CPU.

## 2026-10-30 (catchups) — bug audit 3, unit H1: a failed answer save retries, Share finishes past a blank question, a recording taken back stays off, and Catch-ups' people leave PostHog

Eight rows and the add-on in eight commits, each pinned and each pin shown failing against its
mutation; check green before the first three, and red on the later ones only in other tracks' files,
named in each ledger line; visual 25/25.

Answering. A failed save goes again on the blur its red line asks for (`shouldFlush`, T3-04),
carrying any photograph or recording that failed with it; `submitEntry` marks the four refusals a
retry cannot change, and for those the line is the server's own sentence. Beside it: the songs
field handed its blur event to `flushBody` as the words, which threw, so a song saved only on Next.
Share sweeps back to a blank question once per visit and then finishes (`nextIndex`, T3-18), and the
end card's pill goes back to the questions instead of the page it is on (T3-05). An answer's
photograph shows its remove control on a phone (T3-19), and `hover-reveal-rule.test.mjs` fails any
control in src/components revealed only by a hover. A photo-wall answer takes three photographs
through the ordinary strip, one constant shared with the server (T3-21).

Answering out loud. Every late arrival in the recorder names its take (`voice-takes.ts`, L7-09): a
recording removed or recorded over while it saves never lands on the answer, a second tap during the
permission prompt is nothing, a microphone granted after the question was left goes straight back,
Try again uploads once, and an unwanted take stops before its bytes leave staging. The player every
surface shares stops at two minutes whatever the file holds (T2b-04); the byte cap's docblock says
what it does not bound. The Edition's question panel keeps the lab's 560 and 480 and never hangs
below the window (C7a-04). Catch-ups' people carry PostHog's NO_CAPTURE like the rest of the site,
with nameless counts kept for wall photo opens and recordings played.

Visible: the answer's red line now retries, a refusal shows the server's sentence, a photo question
says "Press Next to try again."; "Back to the questions" on the end card; the remove disc on an
answer's photographs on a phone; a photo-wall question's three-photo strip instead of one large
plate; the microphone dimmed while the browser asks; a shorter question panel on small or sideways
phones. Shots at 1440 and 390, the panel at 375x548 and 932x430 too.

Verified live on a throwaway Catch-up holding only the test account, Chrome's fake microphone on,
deleted after in one guarded statement with its eight bucket files; no bell was written. Not done: a
take superseded while its finalize request is already in flight still lands in audio/ with no row
naming it (the V-L-d-01 class); the two this produced were deleted.

## 2026-10-30 (privacy) — bug audit 3, unit B3b: account deletion that finishes, on the day it says

Eight rows, Phase A's routed follow-up and two notes from the write-path review of B3a, in nine
commits across the account purge, the admin delete and merge, the nightly sweep and its workflow,
and the flag count. Every file this unit touched passed `npm run check` before each commit, and
the last run was green throughout. Most of the red between them was other tracks' work in flight
(a comment-count refactor, L3's progress line); one was this unit's own: a268a112 left
`voice-answer-rule.test.mjs` pinning the loop it had replaced, and 1b2fc2e5 points the pin at the
shared reader.

A purge that meets another write tries again (L1-04, T7a-10, T7a-09). The purge runs at
RepeatableRead, which refuses a write to any row changed after its snapshot instead of waiting,
and nothing retried: a heart on the member's post failed the purge until the next night, and the
member's own sign-in mid-purge turned the job red instead of sparing them. Both were reproduced on
throwaway accounts with the real purge first (P2034, "Could not delete the account."), then ended
in a clean purge and in "spared" after the fix, which retries from a fresh snapshot three times at
most. A run of collisions waits for tomorrow, counted as `accountsDeferred`; any other failure
reaches Sentry, and the admin hears a sentence instead of "Check the server log", as a failed merge
now does. The purge also holds every group the member is in before choosing a successor (Phase A's
follow-up), proved by a write held on a group the throwaway only belonged to.

Reporters are answered when an erasure takes what they reported (B3a's review): a pending report
on the member's post, or a flag against them, gets the closing line a post's own delete writes,
worded for an account that has gone. A flag from a member who has since left still counts in
"flagged by N members", which a group by reporter had folded into one.

The files go in one sitting, after the record (T7a-21, T7a-05, L11-07, V-T7a-02). The worklist
drained 500 objects one at a time; it now pages through all of it, 25 deletes at a time, until a
time budget is spent. The purge only queues the files: an admin's delete writes its audit line,
then drains; the sweep writes each erasure's line as its purge returns, starts no purge after 150
seconds and drains once with the rest of its 270; the workflow now waits seven minutes and curl
310 seconds, past the function's 300. A merge queues the files of the Catch-up answers it drops,
which had stayed in R2 for ever, and (from this unit's own write-path review, which found nothing
higher than Low) the duplicate's avatar in the same transaction, rather than after the commit.

The member goes on the day the email names (T7a-19). The email named the request's day plus
sixty, while the sweep purged at its first run after the exact instant, so anything asked after
the sweep's hour (about 04:00 to 08:00 IST) went the morning after. The sweep now purges in whole
valley days and the email names the first day after the sixty: the date moves one day later, the
words do not. Moving the purge earlier instead would have cut the privacy page's sixty days short.

Visible: the deletion email's date, a day later; new sentences when an admin's delete or merge
fails; "queued for deletion" where the `admin.delete` and `account.purge` lines said "removed";
`accountsDeferred`, and `imagesDeleted` for `imagesRetried`, in the night's `retention.sweep` line.
Not run: the sweep itself, which acts on every member's rows; its pieces were, on throwaways. Found
on the way: a jiti harness needs `nativeModules: ["@prisma/client"]`, or Prisma's error path
crashes on `path.sep` and every database failure reads as a TypeError.

## 2026-10-30 (db) — bug audit 3, unit L3: five indexes real queries were missing, counts that count only the page, a pool the app holds, and the database's size by table

Thirteen rows in four commits, `npm run check` green before each: ten done, three parked.

Indexes (T1-20, T1-21, T1-22, L5-09, L5-10). Measured before building: pg_stat_statements, open
since July, names each query (poll options by post on every feed page, 24,977 calls; the rail's
newest seven members, 16,116; bells cleared by link, five shapes; comments and Catch-up answers by
author for the export, the purge, the merge and the person page), and each index was built inside a
rolled-back transaction first, where the planner took four of the five at today's sizes.
`2026-10-30-missing-indexes.sql` runs one transaction per index with a five-second lock_timeout, so
no writer can deadlock against it or queue behind it; applied to production and the demo, read back
valid on both. Production, warm: the rail 0.53 to 0.06 ms (44 buffers to 9), a clear by link 0.19 to
0.04 ms (29 to 2), answers by author on the new index; Comment still scans its 36 rows, as it should.
Not built: `Visit (startedAt)` (T7b-10), which the planner would take but which saves 0.6 ms of a
3 ms admin query while every presence beat, all non-HOT, would write it; `CatchupEntry (audioUrl)`
(T2b-10), whose one reader is a count in track 1's `submitEntry` that the verdict would delete.

Counts (T1-17, L5-03, T2b-13). A relation `_count` compiles to a GROUP BY over the whole child table
joined back on the key, captured from the generated client. `src/lib/page-counts.ts` asks with the
page's ids in the WHERE, one row per item rather than one per heart (egress is the first Supabase
limit). Every hot site moved, each beside an await it already made except the Collection river,
which pays one statement a page: the feed, Saved and a profile's tabs, a letter, the Edition reader,
comment threads, the Collection river, band and permalink. The letters index never drew its counts
and drops them. Production, read-only: an Edition's counts 1.14 to 0.36 ms (606 hearts read to 52,
485 buffers to 44), a Collection page of 40 1.07 to 0.09 ms (82 to 1); the feed's tables still fit
one page, so they read the same rows either way today. Rendered counts checked against the database:
a letter's 4 and 0, an Edition's 523 hearts and 0 comments, the feed's first cards unchanged, a
thread's 1, a photograph's 2. pg_stat_statements shows the dev server emitting every count with its
`IN (...)`. A sweep fails any new relation count outside five reasoned exceptions, and C-003's pin
follows the comment filter into page-counts.ts.

Pool (L5-04's half, L5-05). `prisma.ts` builds the pg Pool itself (db-tls's settings, `max: 5`,
idle clients closed at 5 s instead of pg's 10) and hands it to the adapter with
`disposeExternalPool`, so the rebuild after a schema change still ends the old pool: the dev server
logged "schema changed; rebuilding the dev client" and served an authed /feed on the new client.
`attachDatabasePool`, the half that matters under Fluid's suspend, needs `@vercel/functions`, which
the project does not carry (0.19 MB); parked. Interactive transactions now wait the pool's 5 s for a
connection, not Prisma's 2: proved against the transaction pooler, 2.01 s before, 5.00 s after.

Size (L5-08). The snapshot has alarmed at 350 MB since e29823cb; it now records the five largest
tables each night (dry run: 132 MB, the place list 101 of it). The alarm's "read-only at 500 MB"
sentence is L8-09's to correct.

For whoever is next: the dev server's server process restarted at 02:21 UTC during this unit, with
no config change behind it, and then served every changed path without restarting again; the demo
also lacks `Notification_userId_createdAt_idx`, a declared index whose migration predates the demo;
`account-purge.ts`'s own `maxWait: 5_000` is redundant now (track 2's file).

## 2026-10-30 (privacy) — bug audit 3, unit B3a: what a departing member leaves behind

Five rows and one review follow-up, five commits, in the account purge, the admin merge, the
report queue and the post delete; `npm run check` green before each.

Reports outlive the member who filed them (T7a-01, the owner's Q1). `Report.reporterId` was
required with no onDelete, so the purge and the merge deleted every report a member had filed,
pending ones included, to let the account go. It is nullable with ON DELETE SET NULL now, through
`2026-10-30-report-outlives-reporter.sql`, which finds the old key by shape rather than name and
waits at most five seconds for its locks; applied to production and the demo, read back on both,
then proved in a rolled-back transaction on production: the filer's delete leaves the report
unnamed, the reported member's still removes it. The purge deletes no report, and a merge moves the
duplicate's reports both ways, shedding only a flag between the two accounts or a duplicate the
unique keys refuse, a pending flag kept over a settled one. A departed reporter reads as "A member
who has since left" in the Reports list and the Overview worklist. The security board's H8 probe
looked for the purge's delete; track 3 taught it to read the schema first (d10f62ca).

A reporter is answered when the post goes (T7a-02, the smaller of the audit's two routes). An author
deleting a reported post cascaded the report away, and the reporter's thread never got its last
line. `deletePostWithImages` writes it into every pending report's thread inside its transaction,
before the delete, with the author's sentence or, when an admin pressed delete, an admin's.

An erased member's things leave other members' bells with them (T7a-04, C8-09, Q21). Inside the
purge's transaction every bell whose exact link is one of the member's posts or letters, Collection
photographs, Catch-up answers, threads, person page or profile is deleted, and the writers are
pinned to those shapes; a merge points the admins' person-page bells at the survivor. Proved live
with the real purge on a throwaway account: both bells it should clear went, a control bell and the
test account's other ten stayed, nothing was left behind. Bells that only name the member, aimed at
someone else's post, still wait for the 30-day sweep: no column says who rang a bell, and names
repeat.

Unanswered questions go with their asker (C8-08, Q21): the purge deletes the member's Catch-up
questions with no row from anyone else under them; answered ones stay, unnamed. Checked read-only
against hand-written SQL for all 21 askers on production: of 32 questions, 5 would go with their
asker. A question that goes leaves its Edition, published ones included, where it read "No one took
this one."

A merge hands the Keeper's hat only to a survivor who can act (A2's review follow-up). It asks
CATCHUP_PEOPLE of the survivor inside its transaction, interactive now because of that read; a
survivor who cannot keep a hat gets the duplicate's memberships as plain membership, and every group
the duplicate kept goes through ordinary succession, each held first. `groupsKeptBy` is shared with
the purge.

Nothing a member sees changed today; the admin Reports page was screenshotted at both sizes and
reads as before. The privacy page is its own unit's and now needs two sentences: the reports a
member filed outlive them, unnamed, and the Catch-up questions they asked that others answered stay,
as from an asker who left, while unanswered ones are erased. Found on the way: `npm run verify:shot`
signs in as ADMIN_EMAIL, which is the owner's own login, not the test account the dev-login comment
names, so its two shots stamped his presence at 01:28.

## 2026-10-30 (qa) — bug audit 3, unit L2: the gates that passed on nothing see again

Eleven rows and one request from another track, twelve commits, all in the gate every worker runs
before each commit, and `npm run check` green after each one.

The comment stripper every shape test stands on was a regex that read `accept="image/*"` or
`"https://*.host"` as the start of a comment and deleted the code after it: ninety lines of
next.config.ts, every security header among them (L9-02). It now parses, and across 1,072 sources
it removes all 19,095 comments and changes no code. The C-134 wildcard pin reads the evaluated
config instead of its text (L9-01, test-kit's new `nextConfig()`), and so sees the img-src
`*.spotifycdn.com` it never could, allowlisted on next.config.ts's own reason.

The date sweeps read each call's balanced arguments, so a date in a JSX child, a template or a
ternary is seen, and they now cover local getters and the SQL cuts EXTRACT, date_part and `::date`,
in scripts/ too (L3-05). `formatTimeAgo` takes an optional `now`, so the year test pins the valley's
new year instead of failing every New Year's Eve (L3-06). The back-button rule sees `router.back()`,
forward and replaceState (L9-06). Eight sweeps read the disk rather than git, which cannot see an
unstaged file (L9-07).

In check.mjs, an ESLint error now blocks while warnings still only count (L9-03); the dependency
gate runs from any path, and a silent exit 0 no longer reads as clean (C1-08); the CI-parity test
fails on an extra action, a skipped gate step or a gate that stopped blocking (L9-04). The security
board's notes say what each probe saw (L9-11); five medium probes that read open only because their
code had moved now follow it, and H8 reads the schema so T7a-01 can drop the purge's report delete.
The visual suite fails a route that threw, with the browser's own words (L9-09).

Three exemptions, each dated and named for its row: the drafts strip's date (O-01) on the date
sweep, `catchups-core.test.mjs`'s git sweep (track 1's file), and the peer session's uncommitted
`announcement-start.tsx` on the history list. Nothing a member sees changed. `npm run visual` ran
24 of 24; /feed failed once on another worker's half-written file, and the new check named the
compile error, then passed on a re-run. O-01 could not be replayed through the suite: the account
it signs in as has no draft today.

## 2026-10-30 (catchups) — bug audit 3, unit A4: the Catch-up races close, the picture waits for a verified member, and phase A is done

Six rows and eight review follow-ups (A2's and A3's write-path reviews), twelve commits, all in the
Catch-up actions and the libraries under them. Phase A has no rows left.

Two writes that could cross now meet on a row. L1-02: removing a question read the Edition's status
and deleted with no precondition, and both opens counted questions before their swap, so the two
could leave an answering Edition with nothing in it. The removal holds the collecting Edition while
it deletes; the Keeper's open and the clock's swap first, count after and roll back on none
(`EmptyAfterSwap`). The A3 review's zero-answer close was the same shape: it counts only answers with
words, a photograph or a recording (`ANSWERED_ENTRY_WHERE`), after its swap, and the clock's too-few
rule counts the same thing. Start and End hold the Catch-up's row, the opener only while it has not
ended, so an End landing between Start's check and its Edition cannot strand one.

Who is in a Catch-up, and who keeps it, is decided one at a time per group. `lockGroup`, an
`updatedAt` touch on the group's row, comes first in leaving and removal (through succession), the
hat's revoke, adding and joining, so L1-03's two last Keepers leaving at once, two Keepers revoking
each other, an add and a join past the hundred, and a removed member's join on the old link each
queue. The revoke refuses your own hat and the last one. Adding no longer runs serializable, and
meters per person added on its own `catchupAdds` bucket (200 an hour), checked before and spent
after, so a Keeper filling a Catch-up is no longer refused at the sixth add. A join takes the cap.

T2a-08: creation looks for its twin inside the transaction, behind a `FOR NO KEY UPDATE` on the
creator's row, so a double press in flight makes one Catch-up. T2b-06: the withdrawal's delete asks
that the row is still empty. T2b-09: a reorder takes twice the soft cap. T2b-11: `pageSize` reads a
client's take for comment threads and the bell, and the answer thread's loader runs in `runAction`.
The picture and the rename wait for a verified member, and the gate test is inverted: every action is
gated unless it only reads or touches the caller's own copy. V-T2-02 is finished: every door that
takes a Catch-up, question, answer or comment id answers a missing one and one elsewhere alike.

Visible, only on a refused press: "That would leave this Catch-up with no Keeper, so nothing
changed.", "You cannot change your own Keeper hat.", "This Edition already moved on." on a removal
that lost to an open, "This Catch-up has ended." on a Start that lost to an End, the add's
full-roster sentence on a join, the verification sentence on rename and picture for an unverified
member, and the not-member sentences where "Catch-up not found." stood. Verified live on throwaway
Catch-ups holding only the test account, with a second holding only the Anonymous account standing in
for somebody else's, each deleted after in one guarded statement: two concurrent creations answered
one id; an empty open rolled back; a removal, a 41-id reorder, a withdrawal, the content-only close
(an emptied row planted), a crafted take on both pagers, your own hat, a revoke, a removal, a leave
and a rejoin by link all ran; a Start racing an End left one winner; every id door answered a foreign
id and a made-up one alike; no bell was written. Upstash's multi-token spend was checked on a
throwaway key. Each new pin was shown failing against its mutation; check green on every commit. Not
done: the account purge's own succession (`promoteOrphanedGroups`) has L1-03's shape and is left for
whoever holds account-purge.ts; a full roster and a lost race were not run live.

## 2026-10-30 (privacy) — bug audit 3, unit B2: PostHog stops reading people, and a sign-out ends its identity

Two rows, one commit: T7b-22 and T7b-21 share the PostHog client, the identify component and the
test that pins both.

T7b-22, his Q10 (a). Autocapture sent the words and every attribute of whatever was clicked, so a
classmate's name left off a directory card and their address off a mailto: link in their contact
card, under the tapper's identity. Everything that shows a person now carries `NO_CAPTURE`
(`src/lib/posthog-privacy.ts`: PostHog's own `ph-no-capture`, as a constant so a typo cannot leak):
the directory card, `IdentityRow`, `PersonName`, `BirdAvatar`, contact rows, mentions (rendered and
in the composer), notification lines, Collection tiles, the viewer's byline, comment avatars, map
rows, the profile's bird and admission number, and the admin area (a `display: contents` wrapper,
measured to move nothing). Pageviews lose `title` (a profile's is the member's name) and every
`?q=` reaches PostHog as `q=<masked>`, referrers included. Contact taps, photo opens and composer
opens open no page, so they are counted by name, without the person. Masking every word was his
option (b), not taken: "Write a letter" still sends its label. Proved in a browser on the installed
posthog-js 1.418.1 with the site's options and a recorder that sent nothing: the bare mailto link
sent its address as text and as `attr__href`, the same link inside the class sent no event, the
title was gone, and URL and referrer both read `q=<masked>`.

The admin panel, his condition: it reads fifteen `db.*` trends and its own tables, nothing from
PostHog. The nightly snapshot takes three PostHog numbers, none drawn: pageviews is untouched, events
no longer counts clicks on person surfaces (their pageviews still count), and people counts a
signed-out browser as its own visitor.

T7b-21. Signing out never reset PostHog, and the owner's opt-out outlived his sign-out with nothing
to lift it. Both sign-out buttons now go through `signOutOfSite`, which resets and puts an opt-out
back (reset() clears consent, proved); a member who signs in afterwards lifts it, without an
`$opt_in` event. The real Sign out, pressed as the test account: a fresh id, the opt-out kept.

`posthog-rule.test.mjs` pins all of it, including how the installed library treats the class, and
its patterns fail on the old code. Not done: Catch-ups components still name people in their own
links (track 1's files), and the privacy page sentence (a later unit). Its follow-up masks a password-reset link's live `?token=`, `?email=` and a
Catch-up invite's key wherever an address appears, by rule, with the route kept whole.

## 2026-10-29 (scripts) — bug audit 3, unit L1: the laptop scripts open the database verified and in UTC, and stop writing to real members

Nine rows, nine commits, all in `scripts/`. None was proved by running the script it fixes: the
probes write to real members, the seed wipes whatever it reaches, and the export reads all of
production. Every new pin fails against the old code.

VOL1-01 and L3-02, the opener. `scripts/dev/_pg.mjs` is now the only place a script gets a raw `pg`
client, and `raw-pg.test.mjs` fails one built anywhere else. Eleven scripts, run-sql.mjs among them,
accepted any certificate; every client now verifies Supabase's pinned root, and `db-tls-rule` no
longer accepts a bare `ssl:`. The opener also reads `timestamp` and `date` columns in UTC and sends
Dates in UTC, as Prisma does. The Catch-ups export had written every date 5 h 30 m early from India
and an hour early from London, and run-sql printed them that way; under an Indian clock it now
prints a row's `createdAt` exactly as the row's own text reads. The five exports on disk are
gitignored and were not re-taken: each folder holds `TIMESTAMPS-ARE-SHIFTED.txt` with its measured
offset (the four September ones five and a half hours, October's one). The gitignored anon-cleanup
undo file was moved forward 5 h 30 m, measured against its own redate record. bugs.md item 6 is
closed for scripts. run-sql was proved against production and the demo right after the switch; it
now also prints Node's MODULE_TYPELESS_PACKAGE_JSON warning on stderr, once a run, as every script
importing a src/lib .ts file does.

T2b-03 and T2b-08, the export. Recordings never copied, for want of an `audio/` folder, while the
JSON named them; each file's folder is now made where it is written, and a recording that did not
arrive is `file: null`. `bytesFor` reads the bucket's own urls through its S3 endpoint when given
the script's env (the export, the photo picker and the dimensions backfill pass it) and gives
anything over HTTP thirty seconds. One live thumbnail read proved the S3 route.

V-T7a-03, C1-02 and C1-03, the probes. Five deleted from the dropped "Session" table, three without
a catch, which stranded confirmed probe accounts; those lines are gone, phase 6 removes its sign-in
attempts by a column that exists, and every run's cleanup sits in a `finally` (bodies re-indented,
every template literal byte-identical). Phase 3 comments on a post of its own instead of a real
member's, deletes the admins' bells and audit rows naming its accounts, and expects an office-list
name match to queue as pending. Phase 7 expects a second open report of one post by the same member
to be refused, on a draft letter it makes. `probe-cleanup.test.mjs` reads the migrations for every
dropped table and fails any script still naming one.

C1-01. `fetchSessionCookie` refuses a non-loopback origin before it reads the dev-login secret, so
`screenshot:auth <url>` cannot post it to another site; the probe kit's bypass and phase4-prod-check
refuse the same way.

C1-05. The demo seed checks its destination, and nothing waives it: the URL must name the demo
project, and the database must hold only the demo's cast (no address outside @demo.invalid, at most
twice the cast). Today's demo passes, 40 accounts and none outside. verify-guard checks the ref too,
and apply-schema uses the one copy of it.

Nothing in the app changes. Not done: a Host check in /api/dev-login, and binding `next dev` to
loopback, both outside these files.

## 2026-10-29 (catchups) — bug audit 3, unit A3: an early close offers more time, a removal sticks, the invite link is back, and End waits for the Edition

Six rows, four commits, all in a Catch-up's Settings and People doors.

C3-01 and T3-06, one commit (his Q15). "Close and send it out" on an Edition nobody had answered ran
the clock's zero-answer rule, which moves the deadline to three days from now: in a week's first
days that is up to four days earlier, and it rang everyone again, spent the Edition's one safety net
and said nothing, so a second press published an empty Edition. A press with no answers now writes
nothing: the row opens "Nobody has answered yet" with "Give everyone 3 more days", and a press from a
page that did not know is refused by the server and turns into the same dialog. "Give everyone
longer" swapped on the value the action had just read, so every tap added the extension again while
the row said "A week more". `planExtension` swaps on the deadline the page showed, so a stale second
tap is refused, the row shows the phase's real deadline, no pill stays pressed, and a toast names the
new date. The offer runs through the same path, from the deadline, ringing nobody.

L12-09 and T2a-10 (his Q16). The invite link never changed and rode in every member's page data, so
a removed member could press Join on an old copy. Removal now mints a new link inside its own
transaction, and only a Keeper's page, not an ended one, carries it. It also drops the member's pref
row, as leaving does, so someone re-added by link no longer finds the Catch-up under Archived.

T3-17 (his Q11). Build phase 7 dropped the invite link with the old roster panel. "Copy invite link"
is back beside "Add someone" in the People door, Keeper-only, never on a batch or ended Catch-up; a
refused clipboard shows the address to copy by hand, and a removal's toast says the link changed.

T2a-07 (his Q2, b). End is refused while an Edition is collecting or answering, checked in the same
statement as the write (`RUNNING_EDITION_WHERE`, tested against `isEditionRunning`); the End row says
"You can end it once this Edition is over" instead of opening.

Visible: the "Nobody has answered yet" dialog; the extend row's line ("Questions close" while
collecting) and its unpressed pills; the "now close" toast; the "Copy invite link" pill, its toasts
and its fallback field; the removal toast's second sentence; the End row's line while an Edition
runs. Verified live on a throwaway Catch-up holding only the test account (the site's Anonymous
account stood in as the member removed), deleted after in one guarded statement: every path above
ran, a stale tab's extension and End were each refused, the offer moved 6 to 9 November from the
deadline with the safety-net bit untouched, the old link read "expired", a plain member's page
carried no token, and no bell was written. Each new pin was shown failing against its mutation;
check and visual 25/25 on each UI commit. Not done: a ceiling on total extension (an owner call
nobody asked), and a Start landing in the same instant as an End (neither write locks the row).

## 2026-10-29 (security) — bug audit 3, unit B1: a Sentry report leaves without the member's cookie, location or searches, and the demo reports nothing

Two rows, two commits. T8b-14 (High): since Sentry 10, `sendDefaultPii: false` no longer keeps
request data off an event, because "off" now resolves to deny lists that only the tracing code
reads. Reproduced offline on the installed 10.76.2 with the site's own options: every server error,
every report swallowed inside a request and every sampled trace (a tenth of all requests, not only
failures, which the audit had not seen) carried the live session cookie, the raw cookie header,
Vercel's city, latitude, longitude and postcode headers, the referrer and the query string.
`src/lib/sentry-scrub.ts` now runs as `beforeSend` and `beforeSendTransaction` and keeps rather than
removes: the method, the address without its query (an invite link's key blanked), and six named
headers; span attributes, span names and breadcrumb addresses get the same treatment.
`sentry-scrub.test.mjs` sends a poisoned request through the installed SDK into an in-memory
transport and fails if any of it survives; its SDK cases were shown failing with the two hooks
removed. There is no browser SDK, so nothing client-side reaches Sentry.

T8b-18 (Low): the demo is this code on a second Vercel project, so it filed its standing failures
into the one project as "production", out of the same 5,000 events a month. Sentry is now off when
`DEMO_MODE=1`, pinned by two fresh processes reading the exported options and shown failing without
the guard. A "demo" label was considered and not taken: it sorts the events without saving the
allowance.

Not visible to members. The privacy page's Sentry line is left for T8b-06. The owner's check A
stands: Sentry's Data Scrubber settings, and a search of stored issues for `authjs` and
`session-token`. Not run: a deployed build; the dev server compiled instrumentation on 10-27 and was
not restarted, so the next deploy is the first real compile of the new import. Found on the way: the
brief's gate-wait loop (`pgrep -f playwright`) matches another waiting worker's shell, so two
waiters deadlock; `pgrep -f "[p]laywright"` does not.

## 2026-10-29 (catchups) — bug audit 3, unit A2: every Catch-up control waits for a verified member, and the hat passes only to someone who can act

Eight rows, three commits. L10-01 (High, V-T2-01 folded in), T2a-03 and T3-22 are one change because
they share the people doors. A signup joins its claimed batch's Catch-up before confirming anything,
and every batch member runs the cycle, so an account that had proved nothing could remove the class's
questions, open answering, extend it without bound or publish it early with a bell to everyone; a
people Catch-up's end, remove and hat controls asked no stage either. All seven now call
`requireVerifiedMember` (Stage 2) first, the gate Start, asking and answering already had. His Q13
(a) keeps the join at signup: such an account reads its batch's Catch-up and presses nothing. The
home still draws the cycle rows for it; a press is refused with the gate's own sentence, as Start
already was.

Who may be put in a Catch-up, or handed the hat, is one rule: `CATCHUP_PEOPLE` in `catchup-caps.ts`,
an alumnus with a confirmed email and a verified profile, not blocked or leaving, never the Anonymous
byline. Both pickers ask for it (`forCatchup=1`, renamed from `alumniOnly`, on the search and on the
batch shortcut), and creation, adding and the hat's grant apply it. The roster's 100 is counted in a
serializable write with the insert, and adding is metered on `catchups` (T2a-03). The People door no
longer offers anyone already in, the Keeper included, and says when nothing changed (T3-22).

L12-03 and V-T2-02: `loadMemberEdition` advanced an Edition before asking whether the caller was in
its group, so anyone holding an Edition or answer id could move a stranger group's clock. It now
reads, checks, then advances; a missing Edition and a closed door share one sentence; spec 3.4 lists
the actions as the clock's fourth driver.

T2a-09, T7a-07, T3-15 and L10-01's succession half: both succession paths read only members a
Catch-up may hold, so the hat never lands on a blocked, leaving, teacher or unverified account, and a
holder who can no longer act does not count. The purge and an admin's merge wrote the hat as "admin",
which the revoke never matched; every writer now says "keeper" and the revoke takes either word from
anyone but the creator. The docblocks defending the old split (a group admin moderating posts, gone
since 2026-09-07) and the schema's role comment are corrected.

Visible: the People door's add list and its lines "They are already in." and "Nobody by that name.
Only verified members can be added.", the same second sentence on the create form, "Only a verified
member can be a Keeper.", a full-roster refusal, and an unverified member's press refused with a
toast. Verified live on a throwaway Catch-up holding only the test account, deleted after in one
guarded statement: creation dropped the Anonymous id, adding refused it, ask, curate, open, extend,
the hat, remove and end all ran, the serializable path ran, and no bell was written. The batch
shortcut returned 37 of 2024's 44, every one proven. Each new pin was shown failing against its
mutation; check green, visual 25/25, shots at 1440 and 390. Not run live: a full roster, a lost race,
a real succession.

## 2026-10-29 (security) — bug audit 3, unit A1: only an email on the office list verifies, and an admin's removal sticks

O-08 (High) and T7a-06 (Medium; T6-01 is its closed duplicate), one change because both live in
the same rule. The office list verified an account whose name and batch year matched a row, and the
directory shows every confirmed account each member's name and batch year, so a stranger with a
throwaway mailbox could copy a classmate's pair and be verified as them, unrecorded and untold. The
rule is now `rosterOutcome` in `roster-rule.ts`, shared by the server and the import script's
backfill. A confirmed sign-in email on the list verifies, with a `roster.verify` audit row naming
the matched row. A name and batch year alone move an unverified account to `pending`, the verify
queue: one admin bell on the transition, a `roster.queue` audit row, and never a refusal because
another account fits the same row (his Q19 ruling: two people can share a name).

T7a-06: "Remove verification" now leaves `verifyMethod: "admin_withheld"`, and the office list
never acts on a row with a method, so a removed member's next reset, profile edit or "Ask to be
verified", or the admin's own next edit, no longer verifies them back. Asking tells them an admin
has already looked and to write through Reach out. Verifying them by hand overwrites the mark.

Visible, admin side: an "Office list" fact on a person's page (the row their email is on, or the
row their name and year fit with the school's address for it, plus any other account that row
fits, linked); pending reads "Waiting for you to verify" with a Pending chip, a removed one
"Verification removed by an admin"; Overview's verify rows say "is waiting to be verified"; the
audit log shows "Office list" as the actor of its rows; the profile's unverify dialog says the leaf
stays gone until an admin verifies them again. Members see one new line, and only after a removal.

Read for him, nothing changed: of the 66 accounts marked `office_list` whose email is not on the
list, 16 fit a row by name today (verified 09-11 to 10-19); 49 were verified before the office
list existed, hand verifications stored as `office_list` until 9c1434e6 (08-21); one is unclear.
The person page's reads live in a new `roster-lookup.ts`, which also keeps that page off the write
path: the shared dev server kept serving the old `roster.ts`, and a module it had never loaded was
the way to see the page without restarting it. Pinned in `roster-rule.test.mjs` and
`admin-rule.test.mjs`, each pin shown failing against its mutation; check green, visual 25/25,
the three Office list branches seen at 1440 and 390. The write path was not run live: a name match
would ring his bell.

## 2026-10-29 (e2e) — two Collection specs stop failing on a busy machine

"Every year the rail offers lands on that year, lit" ran out of its 90s on every run. It presses
every year of the live archive, which now offers 25, at about 5s a year (an order change and a
seek). Timed one by one, all 25 landed in 1.6 to 2.6s. Its budget is now per year, and the landing
poll takes the file's 15s river budget instead of the 5s default.

Two reads in `collection-seek.spec.ts` sampled too early. After a seek the window starts at 1953
and the years above arrive when the climb sentinel fires: 33ms later at full speed, 236ms with the
CPU slowed six times. The "newer year" check now waits for them. The decade walk read opacity, but
a decade stays open for three steps of the walk and fades to only about 0.5, the test's own
threshold, in that time. It now reads `pointer-events`, which the same render sets. That skip did
not reproduce in 16 throttled walks; the margin is what was measured. The file passed 31/31 over
three repeats, and `npm run test:e2e` passed 65 with 14 phone skips.

## 2026-10-29 (visual) — the desktop suite stops depending on whether a mouse is plugged in

Every desktop route had been red since 10-23: content column 1177 against 1192, everything centred
7px left; mobile passed throughout. `scrollbar-gutter: stable` on `<html>` reserves the width of
the host Mac's scroll bars, and macOS gives Chromium classic 15px bars once a mouse is paired
("Automatically based on mouse or trackpad"; a Dell mouse is). Headless Chromium hides every bar,
so the column is an empty strip whose width is the hardware's: a headed Playwright Chromium
measured a 15px bar, the headless one 0 for the bar and 15 for the gutter. Neither
`--enable-features=OverlayScrollbar` nor an `AppleShowScrollBars` argument changes that.
`visual.spec.ts` now releases the gutter for the shot only; members keep it.

That cleared nine of twelve. The other three were deliberate changes held back behind the shift on
10-23: the birds redesign, the trivia paragraph on privacy, and Support's redrawn birds with "See
all 70". Each diff was looked at, then those three desktop baselines moved. `npm run visual` 25/25.

## 2026-10-29 (profile) — the dark mode tile just says "Experimental"

His call: the light-mode line under "Dark mode" on the profile's settings tile read "Experimental.
Turning it on takes a few questions." It now reads "Experimental" and nothing else. The dark-mode
line ("Turning it off is one press.") is unchanged. No visual baseline photographs that tile.

## 2026-10-29 (collection) — a class link sends a member with no class to the Valley Collection

He is sending `/collection?scope=class` to a class that already uses the Class Collection. The link
is the same for everybody, since the class comes from whoever opens it. A member with no class
(not yet verified, or no batch year) used to get a page titled "The Class Collection" with no
photographs, no word of why and no switch back. `/collection` now redirects them to the Valley
Collection at its plain address. The check sits in the index page, not `collectionPageData`,
because the permalink shares that and an admin with no class must still open a class photograph
from the queue. Seen as Jerry (verified, no batch year) at 1440 and 390: both land on
`/collection`, Valley title, photographs in. He decided "Join" on the sign-in page may keep
dropping the link.

`npm run visual -- -g collection` fails both desktop collection shots on the spine width (1177
against 1192). That predates this change: plain `/collection` never reaches the new line, and the
tree held nothing else.

## 2026-10-29 (audit-fix) — bug audit 3's fix campaign opens: 29 questions to the owner before any fix

The owner asked for the fix round on every open finding of bug audit 3 (359 rows, 15 phases). Run by
`/campaign` from `docs/audit-fix/2026-09-24-bug-audit-3/fix-prompt.md`, which now carries the whole
question batch under `## Owner questions`: the audit's Q1 to Q19 restated, plus ten new ones. Eight
of those were decisions sitting inside the findings themselves (what a moderator's hide does to
photos, what leaves with a departing member, the export's contents, the front page's policy links,
the deleted-photo cache, the presence ping), merged from fifteen; two are about the campaign itself
(additive database changes, and whether anything is pushed before he says so). Q7's default was
flipped from the audit's: the Collection keeps originals everywhere else, so the post tick should
too. No fix starts until he answers; the board is unchanged.

## 2026-10-28 (ci) — the gate stops crashing on a dangling link

The test finders in `scripts/qa/check.mjs` and the shared `walk` in `src/lib/test-kit.mjs` used
`statSync`, which follows links, so one dangling link anywhere under `scripts/` threw out of the
gate before a single test ran. It happened as soon as Kartikeya's photographs were in and his folder
left the Desktop: a staged album (gitignored, `scripts/dev/.album-screen/<album>/staging`) is links
into the originals. All three walks now read each entry's own type from `readdir`. Proved with the
1,764 dangling links still in place: 155/155. Nothing else in `src/` or `scripts/` is a link, so no
sweep loses a file.

## 2026-10-28 (collection) — Kartikeya's photo ceiling is raised to 3,000 a half; everybody else keeps 1,000

His: *"raise only his limit"*, after the import left Kartikeya Patodia with 1,773 class photographs
against a ceiling of 1,000 a half, so the contribute room gave him none.

`photoCeiling(userId)` in `src/lib/upload-shared.ts` answers one member's ceiling from a short map
of raises, each saying who asked and why. All three places that enforce it ask it: `photoQuotaError`
(both contribution paths), the `roomLeft` the contribute dialog shows, and the post-to-Collection
intake, so the dialog and the server cannot disagree about him. 3,000 is his 1,773 plus the thousand
any member starts with, rounded up. A map in code rather than a column, because it is one person: a
column needs a migration on both databases (TRAPS: the demo drifts) and a control in the admin panel,
and it can grow into `photoTrusted`'s shape if raises ever become common.

Both halves are raised, like the default, on purpose: the post-to-Collection intake counts both
halves against one ceiling and has no admin exemption (already filed, bug audit 3 item 643, his
campaign), so a class-only raise would have left that path with no room for him. The lookup is
`Object.hasOwn`, as in `houses.ts`, so an id spelling "constructor" cannot switch the ceiling off.

## 2026-10-28 (collection) — Kartikeya's Class of 2025 folders go in trimmed: 1,773 of 2,609, every one dated

His: *"I don't want to upload trashy photos. Trashy in just super bad quality, duplicates, blurred,
or fully black ... completely overexposed ... I'm not going to be too picky ... first, let's trim
it, and then upload it."* The folder was `~/Desktop/ISC 255`: `ICSE 23` and `ISC 25`, the class's
Class 10 and Class 12 years, 15 GB, 2,609 photographs and 64 videos. Filed under Kartikeya
Patodia's account into the Class Collection of 2025, approved, through `import-album.mjs`; the 777
he had uploaded himself were deleted earlier the same day.

**Left out, 836.** 366 byte-identical copies (`ICSE 23` holds 366 photographs that are also in
`ISC 25`). 432 repeats of one moment, bursts and retaken group photographs, keeping the sharpest
unless the sheet showed a new pose or framing. 11 nobody could read: one black frame, ten blurred
or murky, four of which only the overview sheets found. 27 with no date anywhere (Snapchat saves,
video-call screenshots, three shared images): offered as undated, and his call was *"honestly
delete all those undated ones"*, so they were never uploaded; the originals are untouched. The 64
videos, since the Collection takes photographs.

**Dates, none invented.** 1,685 from EXIF, 86 from the file name (41 WhatsApp copies, 26
screenshots, 14 millisecond names, 5 camera names), 2 from a date the camera app printed on the
picture, filed at year precision. 81 of the 86 are when the file arrived or the screen was captured,
which the app's own `NAME_NOT_TAKEN` declines to offer a contributor; the import files them at
month precision because he asked for every photograph dated, and the screen now reads camera names
through `filenameDate` and marks the rest "arrival". Raised with him rather than assumed. Eight sideways screenshots and Snapchat saves went in upright
through an Orientation tag on a staged copy, the pixels untouched.

**Tooling.** `scripts/dev/screen-album.mjs` is new: it measures without touching the album
(exposure, tile sharpness, a perceptual hash, the date), groups copies and repeats, draws four sheet
families (every photograph in date order, the groups, the near-miss pairs, the flagged ones) for a
session to judge, and stages the keepers. `import-album.mjs` gained `--dates` for per-file dates
without captions, and its "already in" line stopped printing the size of every album ever imported
(1,873) as if those were this run's.

**Found on the way.** sharp hands a one-channel raw input back as three channels after a resize,
so the first pass hashed the top third of each picture; a calibration pair measuring nonsense gave
it away, and `.greyscale()` on the way out fixed it. And no hash threshold separates a repeat from
a new pose: repeats measured 2 to 16 bits apart and so did a dancer's two poses, so the hash
proposes and the sheets decide. The band just past the group limit held 87 more repeats in 157
pairs, which is why it is now a sheet family of its own.

**Side effect.** `MAX_PHOTOS_PER_ACCOUNT` is 1,000 per half of the Collection. Kartikeya now has
1,773 class photographs, so the contribute room gives him no room for more class photographs; his
valley allowance (50 of 1,000) is untouched. Left as it is: his call.

**Undo.** `node scripts/dev/import-album.mjs --undo <ledger> --apply` with
`scripts/dev/.album-import/imported-2026-10-28T15-38-14-704Z.jsonl` (the 3-photograph test) and
`imported-2026-10-28T15-39-10-248Z.jsonl` (the rest). The verdicts and every sheet are in
`scripts/dev/.album-screen/isc-255/`.

## 2026-10-28 (ci) — the gate runs before every push, so a red run stops on the laptop instead of arriving by email

His: "some workflow failed fix it", then "I don't want to receive those emails every time or few
times something deploys." The failure he saw was already fixed (`572da69f`), but October had four:
a test the change itself broke (27th, the caption field missing `FIELD_FOCUS`) and new
high/critical advisories in Next, Sentry and DOMPurify (1st, 23rd, 25th). Every one was a push that
had not passed `npm run check` on this machine first, and the deploy went out regardless.

`scripts/dev/git-hooks/pre-push` now runs the same gate before anything leaves, and refuses the push
if it fails. ~30 seconds a push; offline it only warns, as the gate already did. Installed with
`git config core.hooksPath scripts/dev/git-hooks` (local config, so once per clone, in OPERATIONS
§2). He chose it over turning the emails off, which would also have hidden a failed backup.

The 2026-08-08 rule "never wire this into a git hook" was about commits and stays for commits; the
check skill and `check.mjs` header now say pushes are the exception. `ci-parity.test.mjs` pins the
hook as executable and exiting on a red gate. Proved with a stand-in `npm` that fails: `git push
--dry-run` was refused.


## 2026-10-27 (collection) — people can be tagged in a photo's description, and hear about it once they can open it

His: "can you tag people in photo descriptions?", then "build". A tag is the post composer's own
`@[Name](id)`, stored in `Photo.caption`, so there is no schema change and the caption is the list.

The description box in the contribute, edit and review rooms is now `CaptionField`, a
contentEditable dressed exactly as the textarea it replaced (56px empty, the floating label, the
(i)), with the composer's own pieces inside: type `@` and a name, or tap an underlined first name.
The people list is portalled to a strip pinned under the card, because the card clips its rows.
The 300 counts what a reader sees, a tag as its name, in `photoSchema`. `FloatArea` had no caller
left and went, its reasons moving into the new field.

The viewer draws captions through `renderRichText`, so a tag is a profile link, white and
underlined on the dark frame. The expandable caption stopped being a `<button>` (a link inside one
is not a link): a press on the words still toggles it, More / Less is the real button. Posts and
Catch-ups hand their bodies to the same viewer caption, so their tags and bold now render there too
instead of printing brackets. Plain-text surfaces (alt, tab title, download name, the feed card,
the admin excerpt) read tags as names through `mentionsAsNames`.

`notifyPhotoTags` runs after every caption write and every review decision, and tells a member only
once `decidePhotoVisibility` lets them open the photograph, once per photograph ever, credited to
the contributor in the review room. It runs in `after()`, off the save's response, with its three
reads in parallel and one insert, and its failures are logged and never fail the save (write-path
review: a contributor told their upload failed uploads it twice). Deleting a photograph removes its
tag bells, after the commit. Left for later, from /simplify: one mention-editing hook shared with
the post composer, and one notifier shared with post mentions; both reach into posts code. Verified live at 1440 and 390 on two of Kartikeya's photographs with Jerry Maguire; both
captions restored exactly and the two test bells removed. One of the two had been approved minutes
earlier, so that test caption was public for about a minute.

`npm run visual`: support, birds and privacy (desktop) differ from baselines that predate this
change (privacy gained the trivia paragraph on 10-23, birds its redesign); not rebaselined here.

After the push, CI failed one gate local runs could not see: the focus-edge test greps only TRACKED
files, and `caption-field.tsx` was untracked when `check` ran here. It is now on the reasoned
borderless list beside the year digits it shares a card with. Atul Vij was then tagged, by his
words "Atul Sir", on the three hike photographs still in the Collection (2.19, 2.20, 2.22), written
directly with an undo file in `scripts/dev/.album-import/`, so no bell was sent.

## 2026-10-27 (collection) — Kartikeya Patodia's 95 photographs wait in review, and the tagging pass learns People means a name

95 photographs from Kartikeya Patodia (class of 2025) went into the Valley Collection with
`import-album.mjs --scope valley --review --undated --as` his account, so they sit on the review
room's Waiting pile under his name. The album folder was named `Kartikeya Patodia` through a
symlink, because the Drive folder he used is called `rishivalley.space` and a second contributor's
`1.1.JPG` from the same folder would otherwise collide on `sourceKey` and be skipped as already in.

Dates are the camera's own, to the month, on 94; his file numbering gives the year (1.x is 2022 up
to 4.x 2025), and every stamp agrees with it. The one file with no stamp, `1.4.jpeg`, was filed 2022
at year precision on his numbering. His descriptions were Google Drive file descriptions, which a
Drive zip leaves out; read with a nine-line Apps Script the owner ran, then spread across the
ranges he named, onto 63 photographs. 32 he did not describe stay blank.

The owner then narrowed two buckets: People only when the person is named, Nature only when nature
is the subject. Applied to the batch (People on 13, Nature on 9) and written into `BUCKET_RULES`
and the tag-photos skill, so the next pass does not file every face under People and every tree
under Nature. Uploading cost Vercel nothing: the script writes to R2 and Supabase directly, and the
production logs for the window show no request from it. Undo files are in
`scripts/dev/.album-import/`.

## 2026-10-25 (deps) — CI green again: seven high and critical advisories patched

The `check` workflow had failed on the last two pushes (7aff912, 35bdf67), on one gate only: seven
new high or critical dependency advisories. Three were in Next.js (two unauthenticated remote code
execution bugs, in the image optimizer with SVGs and in `use cache`, and a Server Actions denial of
service); the rest were Sentry (a middleware bypass through the tunnel route), DOMPurify twice
(through posthog-js) and Zod (memory exhaustion). Fixed by moving `next` 16.3.8 to 16.4.3 (no 16.3
backport exists), `@sentry/nextjs` to 10.76.2 (staying on v10), `zod` to 4.6.7 and `puppeteer` to
25.16.0 (its nested zod 3 was affected too), and refreshing the lockfile's `dompurify` and
`fast-uri`. `npm audit` now reports zero.

`eslint-config-next` stays at 16.3.8 on purpose: 16.4.3 brings `eslint-plugin-react-hooks` 7.1.1,
whose React Compiler rules report 95 new errors across 25 files (refs read during render, setState
inside effects; mostly the mascot and the auth forms). It carries no advisory, so that cleanup is
its own piece of work. A local production build on 16.4.3 succeeds and serves. It newly warns that
the local-disk branch of `storage.ts` traces all of `public/` into the upload routes' bundles (the
16.3.8 build on Vercel printed nothing); left alone, since that is about 16 MB of committed files,
far under the function size limit.

## 2026-10-24 (audit) — bug audit 3 closed: 410 findings, 359 open, a fix-prompt for the campaign

The third bug audit, paused on 2026-09-27, was finished. The code had moved 113 commits, so every
finding was re-checked against today's code: a drift checker re-ruled the 77 confirmed before the
pause, and twelve validators finished the zones the usage limit had cut off. Four completeness
rounds (nine critics) followed; each still found new Mediums, and the owner closed the audit after
the fourth ("close now. i'll run the huge fix session separately"). The report says plainly that the
two-dry-rounds rule was not met, and which seams a fourth audit should sweep.

Result: 410 findings, 51 closed during the audit (16 fixed by other work since, 9 made obsolete, 12
refuted, 10 duplicates, 3 known, 1 declined), 359 open: 12 High, 92 Medium, 255 Low, no Critical.
The Highs: a stranger can become verified as a real classmate from the office list (O-08); unconfirmed
accounts can run a batch Catch-up (L10-01); login cookies go to Sentry (T8b-14); the Collection loses
work three ways; a published letter's Save is off screen and Back on a refusing dialog leaves the
page; and, with production back on Vercel Hobby since 2026-10-23, Hobby's CPU and image allowances
plus Supabase egress are the first ceilings, which a script reaches far sooner than members (L5-01,
C5-01, L8-04, L5-07). Thirteen findings are one class, filed as O-09: nothing bounds what one account
or script may spend of what everyone shares. `bug-report-3.md` replaces the interim; `fix-prompt.md`
carries the board (15 phases, run order A B O E F D C G H J I K L M N), 19 owner questions in the
five-line form, and checks A–K only the owner can do. The owner ruled the repository stays public
(C1-06). Audit-only: no application code changed.

## 2026-10-23 (birds) — the birds page in a designed order, and his last touches

The birds page and the supporters' picker now show the birds in a curated order. The brightest
twelve open as one compressed rainbow, so the first screen at any width shows the whole palette;
the other vivid birds then travel the colour wheel again, with the black, grey and brown birds
spread evenly between them as rests; no look-alikes touch at 2, 3, 4 or 5 columns, and the last row
is all stars. Five orders were tried and judged as the real grid; the reasoning is in
`docs/planning/birds-expansion/ordering.md` and a test keeps every bird in the order. Also: the
Yellow-wattled Lapwing's legs no longer run off its circle, the rounder Small Minivet he meant is
in, and the Yellow-throated Bulbul, Brahminy Starling and Black-headed Ibis were redrawn to his notes.

## 2026-10-23 (trivia) — /admin/trivia: the door, the answers worth a look, the questions best first

The room the recording was for (`docs/spec/admin.md` §9.11), under The place in the admin rail. Top
to bottom in the order he would act on it: the door (came, had a go, got through, joined, then
what those numbers mean in sentences, and a live pill when someone is at the question now);
answers worth a look, each with **Accept**; the ten questions ranked on one axis of ribbons
(right first go, after a miss, moved on, missed, left), because only a shared baseline answers
"which"; who could not get in, as trails of what they typed; every answer typed; the gate by day;
and which generations know which question. Each question opens its own page, with what it accepts
and how often each spelling is the one people use.

All the arithmetic is `src/lib/trivia-report.ts`, pure and unit-tested. `/lab/trivia-gate` draws
the same room from an invented month (`trivia-sample.ts`) so it could be judged before a real row
existed, and that month caught a flaw: "worth accepting" first kept any answer two people typed,
and at Centenary volumes a common misconception topped the list. It now wants nearness to an
accepted answer, or three people who got in elsewhere. The ribbon colours went through the
dataviz validator in both themes. Accept was driven end to end against the dev server: row,
toast, question page, undo, audit lines both ways, and the live gate letting the accepted
answer in; the probe rows were deleted, the two audit lines are real and stay. `PillNav` now
serves the analytics tabs and the ranges alike, with a press state both lacked.

**`npm run visual` is red on eleven desktop routes that are not this work's**: landing, login,
feed, directory, letters, catch-ups, both Collection views, support, birds and about. Every one
has its content column about 7px left of the baseline, and /birds is 579px taller, which is the
birds gate-2 round (2cc47df2) landing on top of this session; mobile passes throughout. The
desktop privacy baseline is held back with them, because rebaselining it alone would bake that
shift in. Whoever rebaselines the birds takes privacy too, after looking.

## 2026-10-23 (birds) — the gate-2 round: his picks resolved and his notes drawn in

He looked at every sheet and answered bird by bird. The Paradise Flycatcher keeps the first drawing,
now seated as big as its neighbours; the Peregrine takes the second drawing with the first one's
slimmer bill; the Yellow-footed Green-Pigeon takes the Orange-breasted's slot; the new Sirkeer
Malkoha takes its slot; Tickell's and the Small Minivet stay; the Red-wattled Lapwing joins beside
the Yellow-wattled in its shape; the Black-headed Ibis joins in warmer colours. The birds he named
were fixed: less grey on the Kite and Night Heron, a happier White-browed Bulbul, a clearer
Red-whiskered face, shorter robin wings and tails, a rose Starling, the Thrush's orange layers, a
readable Jacobin, the Black Eagle's curved lines, the old Brahminy Kite back. 71 birds, 142 contact
photos. Nothing pushed by this session; the work up to U4d was already live.

## 2026-10-23 (trivia) — the gate's two reads run side by side, and a swap's two rows keep their order

From the room's review pass. `checkTrivia` fetched the attempt limit and the room-accepted answers
one after the other; they are independent, so they now share one round trip to Mumbai on the path
every Centenary signup takes. `recordTrivia` stamps each row a millisecond apart in the order
given, because one insert had given a swap's skip and the next question the same instant and left
the report to untangle them. `questionById` is a map. The phone privacy baseline moves with the
entry-question bullet the recording commit added; the desktop one is held back, see the room's
entry.

## 2026-10-23 (trivia) — the gate writes down what happens at it: every question shown, skipped and answered

His, 2026-10-23: "I want to know what people are typing in, which questions people don't like,
which questions people like." Nothing was kept: the answer was judged and dropped, a swap left no
trace, and an "I don't know" never reached the server at all. Now `TriviaEvent` holds one row per
thing that happens at the gate, with what was typed and which rule let a right answer in
(`src/lib/trivia-log.ts`; design in `docs/spec/admin.md` §9.11). When the browser goes on to make an
account, its last three days of rows are stamped with the new member.

The bank and its judge moved to `src/lib/trivia-bank.ts`, since a "use server" file can only export
actions and the coming admin room re-judges every turned-away answer against today's rules.
`trivia-log-rule.test.mjs` walks every client file's imports to keep the bank off the browser, and
proved it fails on a planted transitive import. `rv_trivia_id` now arrives with the first question
and lives 30 days; the pass keeps its 30-minute life, and the write-path review agreed the M7
binding is unweakened. Production only, never the demo, behind `after()`, 600 rows an hour
site-wide, a year in the retention sweep, named on the privacy page and in SECURITY.md. The
migration is applied to both databases. `TriviaAnswer` exists for the room's Accept button.

## 2026-10-23 (birds) — U6 and gate 2: the close-out, and the sheets for him to choose from

The copy that said fifty birds now reads the gallery's own count (the birds page description,
the guide's birds chapter, the Support page's "See all" button). Every bird's two contact photos
were regenerated, 154 in all, and a test now fails if a species ships without them. The two bird
pages' mobile baselines moved and were rebaselined after looking; every desktop route is red on
this Mac's scrollbar, 15 pixels of width, so the desktop baselines wait. The gate-2 sheets show the
32 redrawn birds before and now, seven A-or-B choices, the new birds, and two yes-or-no birds; the
questions and defaults are in the handover's gate-2 report. Nothing is pushed.

## 2026-10-23 (birds) — U4f: the new birds hold their colour against the paper

His note of 2026-10-22 applied to the new birds already in. The Spot-billed Duck, Black-winged
Kite, Tailorbird, Night Heron and Rock Pigeon, which washed out on the page, now carry their
stronger colour on the outside with the pale parts inside it, the way the Eagle-Owl does; the
Kestrel, the Wire-tailed Swallow and both bulbuls have their pale fronts set inside a rim. Shapes
unchanged. The bottom of the birds page no longer reads as a grey-and-white block.

## 2026-10-22 (birds) — U4e closed: four reserve birds, the Ibis held back, and his note on contrast

The Little Grebe, the Scaly-breasted Munia, the Spot-breasted Fantail and the Common Iora join at
index 72, 73, 75 and 76. The owner, seeing the new birds on the birds page, said too many are grey,
white and cool and wash out on the paper, and that the old birds held their pale colours inside a
saturated outside; the Eagle-Owl was his "instant 10 on 10". His words are brief ¶43; the reserve
was finished with that applied, the Black-headed Ibis (white by nature) is held back as a
candidate for his yes or no, and the next unit takes the same note to the new birds already in.
One review, one darker cream on the Munia. The dependency advisory gate is red on six new
advisories outside this work (three critical: Next.js and Sentry); he was notified.

## 2026-10-18 (collection) — thirty of Santharam's wildflowers, undated and named where sure, kept off From the Collection

Three zips of Santharam Venkap's flower photographs, 35 files edited in Shotwell with every date
stripped. Five were left out: two out of focus at full size, one washed-out distant tree, one
repeat of the same yellow flower, one soft macro. The other thirty go into the Valley Collection
under his account, approved by the owner, all Nature, all undated. Eighteen carry a name where the
picture leaves no doubt (Flame of the forest, Indian laburnum, Glory lily, Datura, Coat buttons
and so on); the rest read "Flower", his word.

From the Collection skips them, his ask: `OFF_THE_CARD` in collection-module.tsx names the import
folder, in the query so thirty excluded rows cannot fill the 24-photo candidate window. The
explicit `sourceKey: null` arm is load-bearing; a bare NOT on a nullable column drops nearly the
whole archive. `import-album.mjs` gained `--undated` (file with no date instead of refusing) and
`--approved-by` (a member's photographs published with an admin as approver).

## 2026-10-17 (catchups) — Start a Catch-up sends you to your batch's own instead of copying it

His answer, 2026-10-17: when "everyone from my batch" is pressed and the batch already has a
Catch-up, "Send them to it." On `/catchups/new` that button is now "Your batch already has a
Catch-up", the same outline pill in the same place, linking to the batch's Catch-up, where anyone
can press Start. Found through the viewer's own batch membership, in parallel with the read the page
already made. A batch under ten has no Catch-up, so it keeps the shortcut; hand-picking is untouched.
Checked at 1440 and 390 as the owner (Batch of 2023).


## 2026-10-17 (catchups) — two bells an Edition for anyone not taking part; reminders off unless turned on

His answer, 2026-10-17, to how many bells an Edition may ring for somebody not taking part: "Only 'a
round started' and 'it's published'. No reminders unless you've turned them on yourself." Most
batches never touch Catch-ups, and his worry was the bell filling until people stop reading it.

Started and published still reach everyone. Answers-open reaches only the people taking part
(`takingPartIds`: asked a question in that Edition, or turned reminders on). The daily reminder
reaches only those who turned it on: `DEFAULT_REMINDER_MODE` is off, the column default moved with
`2026-10-17-reminders-default-off.sql` (applied; safe either side of the deploy; existing choices
untouched), and archiving writes "off" explicitly. The empty-window extension is silent. The manual
nudge is deleted: it reached every non-answerer whatever they chose, and on a batch any of forty
people could fire it. "Open answering" no longer says everyone is told.

`catchup-two-bells-rule.test.mjs` pins it. Driven as Jerry on a throwaway Catch-up: Open answering
ran the new audience query, the answering settings show no Nudge, Reminders reads Never.


## 2026-10-17 (catchups) — Editions start by hand: no rhythm, no hold, Start on the home for anyone in it

His, 2026-10-17, after the duplicate 2024 Catch-up: "you should be able to start one whenever you
want ... And then it ends when it ends. And then it just doesn't go until you start it again." His
answers the same day: no rhythm, and anyone in a Catch-up may start one. Plan and his words verbatim:
`docs/planning/catchups-rework/editions-on-demand.md`.

**Engine.** Nothing opens on its own: `openNextEditionIfDue`, `nextOpensAt`, `cadence`,
`addCadenceGap` and the month clamp are gone, and the sweep only advances. Idle is ONE field: an
Edition runs if it is answering or collecting with a question deadline. A batch's first is made with
none, and an Edition that closes empty twice now FIZZLES, the clock clearing its deadline, so
`isEditionRunning` needs no question count and the page-view sweep skips idle rows in SQL (the first
cut inferred fizzled from three fields and a count; /simplify's reviewers caught the per-page-view
cost). `openEdition` reuses an idle collecting row in place or opens the next number, and tells
everyone but the starter, by name, in the same transaction. Only `ended` freezes; a legacy `paused`
row runs.

**Actions.** `startEdition`: any member, verified, metered, refused once ended. `pauseCatchup`,
`resumeCatchup`, `updateCatchupCadence` and `startNextEditionNow` are deleted, with the hold credit
arithmetic. `refuseIfFrozen` became `refuseIfEnded`; `refuseIfIdle` stops `submitPrompt`,
`openAnswering` and `extendDeadline` starting an idle clock with nobody told, which is what a
batch's third question used to do. A write-path review added `curatePrompt` to the ended refusal.

**Screens.** The home's idle state is its one primary action: Start under the latest cover once one
is out, otherwise the old on-hold card's shape with "No Editions yet" or "Nothing running". Its
confirmation says how many people are told. Settings lost Rhythm, Hold and Start; the create form
lost Rhythm; list cards and both admin pages say an idle row is not taking questions. The member
guide stopped promising a rhythm and a hold.

**Data.** `2026-10-17-editions-start-by-hand.sql` (paused to active, nothing booked, an empty closed
Edition fizzled) runs after the push. Its third step already ran alone: the dev server reads
this database with the working tree, and "in the loop" Edition 2 would have reopened and told 23
people on their next page view. `2026-10-17-drop-rhythm-columns.sql` waits for both.

Driven as Jerry on a throwaway one-member Catch-up, since deleted: Start on a published one opened
Edition 2 to 07:00 IST three days out; a closed-empty one fizzled on the next page view and Start
reused the row. No bells written. Meanwhile a 2024 alumnus opened answering on her folded-in round
from production, which is the merge working. `npm run visual`:
/catchups unchanged; /support and /birds red from another session's uncommitted birds work.


## 2026-10-17 (catchups) — the 🪇 Catch-up folds into the Batch of 2024's, its round and nine questions with it

On 2026-10-15 a 2024 alumnus started a new Catch-up through /catchups/new, pressed "everyone from
my batch", and named it "🪇": the same 42 people as the Batch of 2024 Catch-up, so all of them were
in two. The batch one had run one round (one person answered) and its rhythm put the next in
December; "Start the next Edition now" was open to every member but lived in the settings panel.
The second time 2024 has done this (the first was adopted on 2026-09-08).

His, 2026-10-17: "make it the batch catch-up that has everything and remove this [one] ... port all
the questions, all the settings, everything like that, move it onto the batch catch-up."

`2026-10-17-fold-2024-duplicate-into-batch.sql` moves the duplicate's one Edition, still taking
questions, onto the batch Catch-up as Edition 2 with its nine questions and its 19 October
deadline; re-points and renames the 41 bell rows that announced it; clears the batch's booked
December date, since a round is now running; and deletes the duplicate's Catch-up and group. Its
settings were all creation defaults (pool picture, monthly) and a batch keeps its own name, so
nothing else moved. Refuses if the duplicate gains a member outside the batch, a second Edition,
or the batch starts a round of its own. Rows snapshotted first; applied, then re-run as a no-op.
The admin room shows Batch of 2024 with 42 people, 2 Editions, Edition 2 taking 9 questions.

The cause (start-a-round buried, a rhythm nobody chose, nothing on /catchups/new pointing at the
batch's own Catch-up) is the redesign he asked for in the same message, and is not in this commit.


## 2026-10-17 (collection) — seventeen of Santharam's emailed photographs wait in the review room, under his name

The photographs the owner kept from three of Santharam Venkap's emails (2026-10-15): eleven from
the Rishi Valley Bird Race, February 2010; five of the Gotipua dance of Odisha, September 2010; and
the group photograph from the declaration of Rishi Valley as a bird preserve, 27 July 1991 (photo
by S. Sridhar, Navbharat Press). Filed under Santharam's own account, as the owner asked, and
unapproved, on the Waiting pile for him to adjust and approve. Captions are the sender's own with
the grammar fixed; the bird race reads "Bird race" on the owner's word.

`import-album.mjs` learned two things for it. `--review` (valley only) lands rows waiting rather
than approved, which is also what lets a member be the uploader, since nothing skips review. A
`--captions` line may carry the sender's date as a third column, winning over the file's stamp:
one bird race file is an edited copy whose stamp sharp cannot read. Ledgers in
`scripts/dev/.album-import/` undo all three runs.

## 2026-10-17 (birds) — U4d closed: the two bulbuls he asked for, and a Red-wattled Lapwing to choose

The Red-vented Bulbul (a crested black hood with a scaly breast over buff, and the crimson vent)
and the White-browed Bulbul (olive over butter-yellow, a golden vent, the white brow) join at index
69 and 70, drawn from their colours as he asked. A Red-wattled Lapwing waits beside the
Yellow-wattled as a gated candidate for him to choose between on one sheet; the Yellow-wattled is
untouched. One review; four exact fixes on the bulbuls applied by the runner and checked by eye.
Nothing is pushed until gate 2.

## 2026-10-16 (birds) — U4c closed: the twelve new species are in

The last four of the twelve join at index 65 to 68: a Pied Kingfisher with a black shaggy crest,
a pied wing and a long dagger bill; a navy-and-white Wire-tailed Swallow with a rust cap and two
wire streamers; a slate-over-lemon Grey Wagtail with a long tail held out; and a blue-grey Rock
Pigeon with an iridescent collar and two wing bars. One review; the three one-line faults (two
whites too close to the paper, a brow that read as a raised eyebrow) were fixed by the runner and
checked by eye. Next are the two bulbuls he asked for by colour and the Red-wattled Lapwing
candidate. Nothing is pushed until gate 2.

## 2026-10-16 (birds) — U4b closed: an eagle-owl, a tailorbird, a kestrel and a night heron

Four more new species at index 61 to 64, each with its own outline: a face-on Indian Eagle-Owl
with ear tufts and big orange eyes, a Common Tailorbird with a rust cap and its tail held
straight up, a Common Kestrel standing upright with a chestnut wing and a banded grey tail, and
a hunched Black-crowned Night Heron on yellow legs with a red eye. Fable's allowance ran out, so
the drawing moved to Opus with the same brief. One review: two passed, two failed on one fault
each with exact fixes, which the runner applied and checked by eye. They join the gallery, the
picker and the deal on commit; nothing is pushed until gate 2.

## 2026-10-16 (birds) — U4a closed: the first four new species, each with its own silhouette

Grey Junglefowl, Indian Spot-billed Duck, Grey-headed Swamphen and Black-winged Kite join the set
at index 57 to 60, drawn from nothing: a comb, gold hackle and layered sickle tail; a boat body with
a black spatula bill tapering to a yellow nail; a purple-blue ball with a red shield and long red
legs; a pale pearl raptor with a jet shoulder and a ruby eye. Two reviews, one fix pass, the last
notch closed from the review's own path. They join the gallery, the paid picker and the signup
deal on commit; nothing is pushed until gate 2. Visual baselines and the "fifty" copy wait for U6.

## 2026-10-16 (birds) — U3b closed: five redraws and three candidate pairs for gate 2

The Red-whiskered Bulbul (one soft crest, calm face, whisker behind the eye), the Indian Robin
(the cocked tail a fan off the rump, no longer "a bird trying to wave"), the Brahminy Starling
(from nothing: apricot, grey wing, black crown, yellow bill with a blue base), the Orange-headed
Thrush (round) and Tickell's Blue Flycatcher (rust over white, round) are redrawn in place. Three
gated candidates sit beside birds he called okay for him to choose between on one sheet: a
Blue-capped Rock-Thrush beside Tickell's, a rounder Small Minivet beside the old, and a long-tailed
Sirkeer Malkoha beside the old. Two reviews, one fix pass by the drawer, the last three one-fault
fixes applied by the runner from the review's own paths. Visual baselines still wait for U6.

## 2026-10-15 (birds) — U3a closed: Jacobin and Black Eagle pass, the Flycatcher and Peregrine go to gate 2 as pairs

The four hard redraws. The Jacobin Cuckoo (white underparts held inside a black rim, a short
flash low on the wing) and the Black Eagle (one paler folded wing on a sooty body, dark eye, yellow
cere) passed their third review. The Paradise Flycatcher and the Peregrine each got two independent
takes: the first hand's in place, a second hand's appended as gated candidates 52 and 53. After
three reviews the first-hand pair is parked (a grey ring that makes the Flycatcher a button, a
stick tail on the Peregrine) and the candidates are the ones to show: a black hood leaning over a
white body with the ribbon trailing behind, and a leaning teardrop falcon with a sickle wing and a
cream bib over a barred belly. The reviewer's read on why the Flycatcher fights the box (a tail
twice the body shrinks the face) is in the ledger for a later try. All four pairs render on one
sheet for gate 2; he picks. Visual baselines still wait for U6.

## 2026-10-15 (birds) — U2b closed: seven birds restructured, the first candidate drawn and gated

The Magpie-Robin's white shapes are now its belly and wing-bar on a folded wing, the Golden
Oriole's stripe trails behind the eye and its black oval is a wing, the Malkoha's head stands up
out of the body with the blue face on it, the Kingfisher is brighter with four cut-offs gone, the
Leafbird has a face (mask, brown iris, slim grey bill), the Green-Pigeon has one orange breast
and a grey crown instead of three bands, and a Yellow-footed Green-Pigeon candidate sits at index
51 for him to choose against it. A candidate is gated: `GALLERY_SPECIES` drops names ending
" (candidate)", which keeps it out of the birds page, the paid picker and the signup deal at
once, pinned by a test. Two reviews (nineteen faults, then four), one fix pass by the drawer, the
last four fixes applied by the runner from the review's own paths. The Lapwing's legs are
declined on his Q11 answer. Visual baselines still wait for U6.

## 2026-10-14 (birds) — U2a closed: seventeen birds through two reviews, and the campaign goes lean

The owner, resuming: *"I've added birds before and it's never taken so long or so much usage...
you can achieve the same quality with less usage. I don't have a problem with time."* Read: the
same bar, less ceremony. Round four of U2a was one Fable drawer with a brief that pointed at
`reviews/u2a-review-1.md` instead of quoting it; it fixed the thirteen that failed review one and
gave `Eye` an optional disc colour (the Flameback's and the Shrike's heads are darker than ink)
with inline iris-and-pupil eyes on the Oriole, Drongo and Munia. Review two was one Opus agent on
a five-minute-a-bird budget: fifteen minutes, nine pass, four fail on six faults, five of them
made by the fixes (a ruler line where the Hornbill's bill meets the face, a blunt thumb on the
Shrike, a chestnut wedge on the Munia, the Flameback's eye stripe reading as a shadow). One fix
pass by the same drawer, context intact, then the runner's own look at 600px and no third review.
Every unit from here runs draw, one review, one fix pass, commit; the rule and his words sit in
the handover's Resume block. Visual baselines move once, in U6, when every changed bird is in.

## 2026-10-09 (catchups) — the magazine is deleted: engine, corpus, room, printer and spec

The owner, 2026-10-09: *"magazine is a failed experiement. delete it."* Track M is closed. Out of the
tree: `src/lib/magazine/` (the grammar, the beam search, the scorer, the measurer, the image rules,
`from-export.ts`, `magazine.test.mjs` and its 178 checks), the lab room `/lab/catchups/magazine` with
its four modules and its registry row, the twelve JSON fixtures and their corpus, the printer
`scripts/dev/print-magazine.mjs` with its `scripts/README.md` row, and `magazine.md` (783 lines).
37 files, about 23,000 lines. **Commit `3e92eb2d` is the whole record** — the layout grammar, the
three-round failure hunt, the paper panel and the print spike — if it is ever wanted back.

Two seams the deletion exposed. `ExportedImage.width`/`height` were added for the magazine's image
rules and look like magazine fields, but `sketches/_pressure.ts` reads them to size a photograph's
frame, so they **stay** and their comments now name the real reader; the exporter's sharp-based
dimension read stays with them. `loadSketchEdition`'s `opts.editionId` existed only so the magazine
room could draw a second Edition and is now dead, so it is gone. Nothing else referenced
`src/lib/magazine`; the remaining uses of the word in the lab are typography metaphors.

`scripts/dev/.magazine/` is 225 MB of gitignored scratch PDFs and PNGs from the M1 spike. It is not
this session's to delete and has been left alone; it is the owner's to clear.

`npm run check` green (148/148). `npm run visual` 21 passed; the four reds are `/birds` and
`/support` at both viewports, and the diff is bird glyph outlines from another session's uncommitted
`bird-avatar-v2.tsx` edits, not this work — no baseline was touched.

## 2026-10-09 (birds) — new members are dealt the least-worn bird; the campaign's first review round

Day two of the birds expansion campaign (`docs/planning/birds-expansion/`). The dealing rule (U5)
shipped: a member who signs up from now on is dealt a bird inside the create, weighted `1/(n+1)^2`
over the members whose bird is visible (no photograph), so a species nobody wears is a hundred times
likelier than one worn by nine, a bird many supporters picked is dealt less but never zero, and the
Hoopoe and the Roller are never dealt. Nobody who already has a bird changes. The dealt slug lives in
`birdOverride` without `birdPickedAt`, so a supporter's first paid pick is untouched, and `/pick-bird`
shows the dealt bird as the member's current one. The `% 51` wrap on an override index is gone: it
would have folded the first species appended past the Roller onto the Hoopoe. Ten tests, a write-path
review with nothing blocking, 150 of 150 green.

The first review round of the glyph fixes (U2a) taught the tools two things: the app's svg clips at
its box and the centring script measured that clipped box, so long-billed birds had converged with
their tips at the edge (the "sharply cut off" beak was literal); and the edge audit could not see a
straight line written as a quadratic with its control point on its own chord. Both are fixed
(`centroid.mjs` reads the padded probe and caps reach at 47; `bird-edges.mjs` flags "flat Q"). A
drawing hand that spawned seventeen reviewers at once was ended by the harness with no verdict
delivered; the protocol now says one reviewer per unit, spawned by the runner.

## 2026-10-08 (collection) — the order menu names its clock: Recently added, Oldest added, Year taken

The owner: *"newest and oldest is confusing with chronological."* The menu runs on two clocks, when a
photograph was added and when it was taken, and "Newest" and "Oldest" never said which. A photograph's
age is when it was taken, so "Oldest" read as the 1950s and returned the first uploads. The labels are
now Recently added, Oldest added, Year taken, Most loved, with the two "added" orders adjacent: it is
one order run both ways, and with four items, placing Year taken second gained nothing. "First added"
was tried and rejected: *"first added sounds like recent ... it should be a negative recent."* The URL
values (`newest`, `oldest`, `taken`, `loved`) are unchanged, so no link breaks. The skeleton's
placeholder word, the two Playwright specs that pick orders by name, and the comments that named the
old labels follow. `npm run check` green; `npm run visual` 25/25; the Collection specs 14 pass, and
"every year the rail offers lands on that year, lit" fails with or without this change (A/B against
HEAD's labels, which failed on 2013), so it is pre-existing and unrelated.

## 2026-10-08 (birds) — the birds expansion campaign opens: brief, selection, reviewer loop, two tools

The owner's spoken brief (a dictated message and a pasted transcript, 2026-10-08) asks for three
things: more birds from the school's own list (`sanan's stuff/The Birds of Rishi Valley.pdf`), chosen
for colour and for being obviously different from each other and from the fifty; fixes to the birds
he does not like, the Peregrine and the Paradise Flycatcher above all; and a dealing rule so new
members land on the least-worn birds, paid picks counted, nothing ever at zero. Set up as a campaign
under `/campaign` in `docs/planning/birds-expansion/`: `brief.md` is his words cleaned of fillers only,
40 numbered paragraphs with the mangled bird names read from the gallery order and bracketed;
`selection.md` is the colour census of the fifty (eleven greens, ten blacks, fifteen browns), the
twelve birds to add and why each, a reserve of six, and every reject with its reason; `reviewer.md` is
the independent review loop he asked for (ten lines, three rounds, then parked); `handover.md` is the
board, the ledger of every ask against its paragraph, the decisions marked LOCKED, RECOMMENDED and
OPEN, the unit briefs, and eleven questions with a default on each.

Two tools, both in `scripts/dev/`: `bird-sheet.mjs` renders any bird alone at 600px and the set at 96
and 40px through `/lab/centroid`; `bird-edges.mjs` lists every straight edge in every bird's source,
and found 58, the Hornbill's casque, the Pond Heron's bill and the Coucal's wing edge among them,
which are the three he named. Counted who wears what across all 510 members with the hash and the
overrides resolved the way `BirdAvatar` resolves them: 75 photographs, 22 overrides (15 paid), visible
wearers from 1 (Baya Weaver) to 21 (Rufous Treepie), mean 8.8; the Common Kingfisher carries five paid
picks. The dealing rule needs no schema change: the dealt bird goes in `birdOverride`, new species
are appended past the Roller so no existing member's hash can reach them, and the weight is
`1/(n+1)^2` over visible wearers. Stopped at gate 1 with the questions printed and pushed.

## 2026-10-07 (deps) — sharp 0.35.5 and source-map-js 1.2.2 clear two new high advisories

The dependency gate went red on two advisories published since the last green run: GHSA-wq5f-xc86-pv6w
in sharp's bundled libvips (librsvg, CVE-2026-96889) and GHSA-68fv-2mgg-jv7q, an event-loop DoS in
source-map-js. Both move inside their existing ranges, so only the lockfile changes: sharp 0.35.4 to
0.35.5 with its `@img` binaries (libvips 1.3.3 to 1.3.4), and source-map-js 1.2.1 to 1.2.2 under
Tailwind and PostCSS. A WebP conversion and an SVG render through sharp both work, `npm run check` is
green, and `next build` passes. The first build failed on every `next/font/google` import with
"queries have exactly one entry"; a corrupt `.next/cache/turbopack` (the build's cache, not the dev
server's `.next/dev`) was the cause, and moving it aside fixed it. `braces` (high, GHSA-vfj7-8cjw-p6xm)
still shows in `npm audit`: it has no fixed 3.x release and lives only under eslint-config-next, a dev
tool the gate excludes on purpose.

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


## 2026-10-09 (catchups) — the vote question is deleted, code and spec, with its empty table left for a later drop

His, 2026-10-09: "no need to vote. let's ditch that. I don't like it particularly cause it takes up
real estate in the UI and I don't think anyone's gonna use it." Built in phase 13, never released,
never seen by a member.

Out of the tree: `/lab/catchups/vote` and its registry row, the `"vote"` prompt category,
`submitPrompt`'s choices, `submitEntry`'s `pollOptionId`, `vote-question-rule.ts` and its test, the
export and admin bits, the demo allow-list row, and spec.md 3.11. The feed's own `PollOption` and
`PollVote` are a different feature and are untouched.

`CatchupPromptOption` and `CatchupEntry.pollOptionId` were measured empty and stay until the code
removal has deployed: `2026-10-09-drop-vote-questions.sql` is written and NOT APPLIED, because a
column dropped before its code is live breaks production. Commits `5d8d52cb` and `3a4fb0e8` hold the
whole feature if it is ever wanted back.


## 2026-10-11 (catchups) — answering out loud ships: the mic in the box, the tape in the reader, and the transcript stops welding words together

He picked the recorder off `/lab/catchups/voice` on 2026-10-09 ("the mic in the box ... is fine")
and reported two faults from trying it: "sometimes it just didn't put a space between different
words um, the capitalizations were kind of weird", and "every time when I played the recording it
was just quiet ... if there's any types of those kind of bugs then none of the front end even
matters". The player is the tape, this session's call of the three he did not choose between: it
needs nothing stored but `audioSeconds`, and the bird is already in the byline two lines above.

**The transcript fault was in our code, not the recogniser.** `SpeechRecognition` hands over a list
of settled phrases, each capitalised as though it opened a sentence and none carrying a separator;
the lab recorder joined them with `heard += result[0].transcript`, which welds the last word of one
to the first of the next. `lib/voice-transcript.ts` joins with a space and takes the capital off a
continuing phrase ONLY when its first word is on a closed list of function words, so "the banyan"
is lower-cased and "Rishi Valley" and every surname are not. 17 tests.

**The quiet was not storage.** Measured end to end against the real bucket as Jerry: 23,478 bytes
recorded, 23,478 fetched back, identical RMS (0.000656), peak and sample count, served as
audio/webm. Nothing between the microphone and the ear changes a byte. What is now in the code is
the other half of the answer: the recorder watches its own level while he talks, and a recording
whose loudest moment never cleared `QUIET_RMS` says so and offers a retake rather than saving
silence. The test object was deleted afterwards (404 confirms).

**A spoken answer with no words would have vanished.** `said()` kept an entry only for words,
photographs or link cards, so a Firefox answer -- a recording and no transcript, which spec 3.10
drew first on purpose -- would have been dropped from the Edition with nothing on screen to say so:
F38 and F39 with a microphone. Fixed and pinned.

Wired: the draft and the home loader carry the recording, `submitEntry` already took it, the
advance pill waits on `settle()` so nobody leaves with an upload in flight, and the reader's loader
and tile draw the tape above the words with "From the recording" under them. The focus edge moved
with the box into `MicInTheBox`; `answer-card.tsx` joins the reasoned borderless list naming where
its box went. C-125's pin now names the four fields it needs instead of matching the select whole.

**Not tested here, and it is the one he must do**: a real microphone. Headless Chrome on this
machine cannot open one, and Chrome's fake device emits intermittent beeps, so its loudness
readings are worthless. Record one answer and play it back.


## 2026-10-11 (catchups) — the orphaned 2024 snapshot group is deleted, 11 duplicate memberships with it

His, 2026-10-09, answering question 45: "figure out what it's like now. it might be gone already.
tidy up if not." It was not gone. Measured immediately before the delete: 11 members, 0 Catch-ups,
and 0 of those members missing from the real batchYear=2024 group, so it was still the inert
leftover of the hand-made 2024 Catch-up that build phase 4 re-pointed away from it on 2026-09-08.

`2026-10-11-delete-orphan-2024-snapshot.sql` is pinned by id and refuses rather than deletes if the
group has since acquired a Catch-up, a batch year, or a member who is not in the real batch. Proved
in a rolled-back transaction first, then applied: snapshot gone, the real Batch of 2024 untouched
with its 41 members. Only `GroupMember` and `CatchupSeries` carry a foreign key to `Group`, and the
memberships cascade, so nothing else was reachable from it.


## 2026-10-11 (catchups) — the song columns stop being read, and their drop file waits for his release

His, 2026-10-09: "remove songs." `CatchupEntry.songUrl/songTitle/songArt` have been null on every
row since build phase 10 made a pasted link a `LinkPreview` card wherever it is pasted, which is
brief 50's actual ask.

Gone from the code: `submitEntry`'s `songUrl` input, its zod field, the resolve block, `songPatch`,
`songWarning` on both returns, the three columns in the create, and the select; `resolveSpotify`
itself and its ten tests; the account export's two selects; the rework export's three fields and
their type; the admin list's song in `metaLine`; and the song shape in the pressure corpus, where
the Spotify link is now pasted into the body like any other link. The three fields are out of
`schema.prisma`, which is safe while the columns remain: Prisma tolerates columns it does not know.

**The columns themselves wait.** `2026-10-11-drop-song-columns.sql` is written and NOT APPLIED, and
it also takes `CatchupReminderPref.deletedAt`, dead since the 30-day bin went in phase 5. It runs
only after this commit has deployed, because one database serves production and local dev and a
column dropped under a running build breaks it. It refuses if any answer has started carrying a song
again. `CatchupEdition.publishAt` is NOT in it and must never be: a time capsule is that column.

C-027's pin no longer orders the window re-read against a Spotify fetch that no longer exists; the
re-read stays, with its reason rewritten.

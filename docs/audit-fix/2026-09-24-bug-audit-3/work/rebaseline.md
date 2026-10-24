# Re-baseline: 495ecdd2 -> 88642426 (written 2026-10-23 12:48 BST)

The audit read the code at 495ecdd2 (2026-09-24). Every validator checks its findings against HEAD 88642426. A finding whose cited lines changed is RE-CHECKED at HEAD, never assumed; a finding fixed since is ruled FIXED-SINCE with the commit.

## Commits (oldest last)
```
88642426 2026-10-23 feat(birds): U6, the close-out: the count reads itself, every bird has its photos
0985b732 2026-10-23 feat(birds): U4f, the new birds hold their colour against the paper
580a842f 2026-10-22 feat(birds): U4e, four reserve birds, the Ibis held back, and the owner's contrast note
5bf35dd2 2026-10-18 feat(collection): file Santharam's undated flowers, and keep them off the feed card
c6863ecc 2026-10-17 chore(catchups): the start-by-hand cleanup also ran on the demo
5425e80a 2026-10-17 chore(catchups): record the start-by-hand cleanup as applied on main
44b20a91 2026-10-17 feat(catchups): Start a Catch-up sends a batch to its own Catch-up
6fb896bd 2026-10-17 feat(catchups): two bells an Edition for anyone not taking part
eb855c71 2026-10-17 feat(catchups): Editions start by hand: no rhythm, no hold, Start for anyone
81a5aa91 2026-10-17 fix(catchups): the folded 2024 Catch-up sorts back to the top of the admin list
19047d9a 2026-10-17 fix(catchups): fold the duplicate 2024 Catch-up into the batch's own
70e4a0c6 2026-10-17 feat(scripts): import-album can file photographs for review, under the sender's name
21438cd5 2026-10-16 feat(birds): U4d, the two bulbuls he asked for and a Red-wattled Lapwing to choose
25aebe4a 2026-10-16 feat(birds): U4c, the twelve new species are in
838b2ea5 2026-10-16 feat(birds): U4b, an eagle-owl, a tailorbird, a kestrel and a night heron
0f481c44 2026-10-15 feat(birds): U4a, four new species with their own silhouettes
64d0031d 2026-10-15 feat(birds): U3b, five redraws and three candidate pairs for gate 2
cdba1d2c 2026-10-15 feat(birds): U3a, four hard redraws and two second-hand candidates for gate 2
ee2349c5 2026-10-15 feat(birds): U2b, seven birds restructured and the first candidate drawn and gated
e1cce52a 2026-10-14 feat(birds): U2a closed, the seventeen through review two and one fix pass
09795ec9 2026-10-12 feat(birds): U2a round three, six bills tapered instead of clubbed
931a48c6 2026-10-12 docs(birds): a resume block at the top of the campaign file
1cd2f27e 2026-10-12 docs(birds): U2a review one, both reviewers verbatim, with the fix round's scope
7850a227 2026-10-11 feat(birds): U2a round two, every flat edge curved and the seventeen re-centred
cdb33c56 2026-10-11 docs(catchups): close the rework campaign
3c6ee660 2026-10-11 feat(catchups): stop reading the song columns
703fabaf 2026-10-11 chore(catchups): delete the orphaned 2024 snapshot group
9e6721df 2026-10-11 feat(catchups): a question you can answer out loud
5d5c6898 2026-10-11 feat(catchups): delete the vote question and the magazine
ad390fd0 2026-10-09 feat(avatars): deal a new member the least-worn bird at signup
b928d16a 2026-10-09 fix(bird-edges): flag a straight line written as a flat quadratic
aec2a73b 2026-10-08 feat(birds): U2a cut-offs and bills, drawn and awaiting review
c9071fdc 2026-10-08 fix(centroid): measure the padded probe so a bill past the frame is seen, not clipped
9302094c 2026-10-08 docs(birds): record the owner's gate-1 answers and the units they change
f04ec1b7 2026-10-08 fix(collection): the order menu names its clock
34327956 2026-10-08 fix(centroid): sign in before measuring, and measure only the birds asked for
7f674fc4 2026-10-08 docs(platform): board: SSL enforced and verified, spend cap set, two items deferred
1e2905ce 2026-10-08 docs(operations): capacity from a measured week: CPU per view down 69%, egress binds
3db605e3 2026-10-08 docs(birds): open the expansion campaign with its brief, selection and reviewer loop
8c511917 2026-10-07 fix(deps): patch sharp and source-map-js for two new high advisories
dcad8dd8 2026-10-07 fix(auth): delete a dead session cookie so the bare domain shows the landing page
3eb0f482 2026-10-05 feat(profile): give Harini Narayanan the stray hair
a281e855 2026-10-03 fix(backup): copy media as plain CopyObjects R2 accepts
2ca40aae 2026-10-03 fix(deps): patch fast-uri and dompurify for the open Dependabot alerts
10987ae6 2026-10-03 feat(feed): show seven new members in the rail, not eight
6ac93492 2026-10-03 feat(feed): drop Signs of life from the rail, show eight new members
44516525 2026-10-02 docs(readme): rewrite the README as the public overview of the project
221a0ed5 2026-10-01 fix(profile): a blank avatar crop is refused so the bird stays
359bf04a 2026-10-01 feat(directory): the first profession pass over everybody, tidying what it reads
d845872a 2026-10-01 fix(profile): an acronym typed into an occupation survives the save
0f584248 2026-10-01 feat(guide): Lakshman's senior library for the Letters chapter, levelled
e91dbb77 2026-10-01 feat(signup): an "I don't know" at the trivia gate moves on to another question
df260031 2026-10-01 fix(deps): next 16.3.8 and patched brace-expansion
5647e489 2026-10-01 feat(profile): an easter egg in one member's empty About line
1545fd3b 2026-09-29 docs(email): delete the launch spec; its rules live beside the code
489e7d53 2026-09-29 fix(banner): the resend button takes the shared focus ring
f528908c 2026-09-29 fix(guide): the tour's first page names the title that opens the guide again
0a99214d 2026-09-29 docs(platform): board: TLS backup proved, L8-01 left as an owner decision
9569b061 2026-09-29 docs(audit): mark the bug-audit-3 findings already fixed outside the audit
b2982679 2026-09-29 docs(platform): board: session and Catch-up fixes done, checks pending
592e3526 2026-09-29 fix(catchups): the Picture row opens the picker; Start it again asks to
e286daf0 2026-09-29 fix(auth): a database that does not answer no longer signs the member out
2378a7a9 2026-09-29 docs(platform): board: TLS and link parser done, audit items fixed elsewhere
b6cbdfc0 2026-09-29 fix(links): bound the page-meta patterns so a hostile page parses in milliseconds
91c07fbc 2026-09-29 fix(database): encrypt every connection and verify it is Supabase
9e739197 2026-09-29 fix(banner): the confirm-your-email chip stops covering Catch-ups
1e5f9887 2026-09-29 docs(operations): what 2,000 members costs, from measurements
b4cf32b3 2026-09-29 docs(platform): board: early CPU reading, lab gate done
8d35ff4e 2026-09-29 fix(lab): every server-rendered room checks the admin role itself
05191f2a 2026-09-29 docs(platform): the owner's brief and a resumable ledger for platform health
69c3fed4 2026-09-29 chore(database): an empty api schema for Supabase's Data API
e29823cb 2026-09-29 fix(database): cap refused sign-in rows, and alarm on the database's size
c41893f0 2026-09-29 feat(email): a bounced confirmation fixes itself; the member moves to another address
4487283b 2026-09-29 fix(backup): restore every night's dump in rehearsal, keep the place list apart
d7a8041d 2026-09-29 feat(email): waiting for a confirmation email no longer locks anybody out
19be10b0 2026-09-29 fix(platform): links stop prefetching pages nobody opens
7f28818c 2026-09-29 fix(backup): copy large photographs without asking R2 for their tags
64c91fca 2026-09-29 feat(lab): the valley film without flicker, at sixty frames, with a true trace
09216fa3 2026-09-28 fix(onboarding): the welcome line just asks for a few details
edcde55e 2026-09-28 fix(feed): the confirm-your-email box starts level with the header circles
d6a8718b 2026-09-28 fix(guide): the cover's title and line sit closer to the dots
6c84c602 2026-09-28 feat(onboarding): one sheet, with your Directory card filling in as you go
00c4da0c 2026-09-28 docs(valley): what the film tried and did not take, and its video cuts on the board
387ced86 2026-09-28 feat(lab): scripts/dev/valley-film-video.mjs renders the valley film to video
18443d4d 2026-09-28 fix(lab): the valley film's fetch tells Esri's placeholder tile by colour
9cd97914 2026-09-28 docs(valley): the handover's board and log for the film's second day
2294302b 2026-09-28 feat(lab): the valley film's glass mark gets a rim and clearer glass
33aee54d 2026-09-28 feat(lab): the valley film looks down on the campus before it finds the hills
9b2ce78b 2026-09-28 feat(lab): the valley film renders to video, and its ground takes relief from the photographs
6f896bb8 2026-09-28 feat(lab): the valley, flown into, as the landing page's opening
daec81ec 2026-09-27 feat(catchups): everyone in a batch runs its Catch-up, which starts on hold
cd1ec452 2026-09-27 feat(feed): links in posts and letters show as they do in Catch-ups
04e75d5d 2026-09-27 fix(directory): full screen shows more of the map, not a bigger one
077eaacf 2026-09-27 fix(catchups): a member added to a Catch-up after it started is told
5164de0f 2026-09-27 feat(feed): tagging in the composer works like Messages
bb8f29ef 2026-09-27 fix(guide): allowlist the photographs' loading colours, and round the bubble to the card
f7b3c5d9 2026-09-27 feat(guide): a photograph per chapter, a floating window, a cover, and the way back shown
25c21c28 2026-09-27 fix(feed): a mention rings once, however often the tag is toggled
44ceac73 2026-09-27 feat(feed): the Collection card shows Cave Rock at blue hour for now
1f44f1e9 2026-09-27 feat(feed): a member tagged in a post, letter or comment is told
1439c83a 2026-09-27 fix(catchups): a library photo or songs question is asked as one again
9c992844 2026-09-27 fix(collection): retry a missed direct upload, keep what arrives, and say so
4a7f886d 2026-09-27 chore(lab): delete the valley campaign's rejected rooms
f71cdb36 2026-09-27 docs(history): restore September's session entries and test the index both ways
e9bf63e2 2026-09-27 docs(audit): pause refactor audit 3 with its first fourteen readings compiled
f32b6e02 2026-09-27 docs(audit): pause bug audit 3 with an interim report
4eddc6f7 2026-09-27 fix(ui): the decade presets and audience chips lose the tan fill
105e056c 2026-09-27 fix(collection): the drop box says drag and drop, paste, or click to browse
b5a87180 2026-09-27 fix(directory): the city panel is its old width, and See all opens People
46d4408f 2026-09-27 feat(guide): plain-text chapters, and a once-only tour over the Feed
14f77687 2026-09-27 feat(catchups): a batch Catch-up runs every three months
08d25d12 2026-09-27 fix(ui): the close button is a bare X, with no disc behind it
e49e6265 2026-09-27 fix(catchups): a changed batch year moves the member out of the old batch
```

## Files changed under src/ prisma/ scripts/ (numstat: added deleted path)
```
170	8	.github/workflows/backup.yml
2	2	package.json
46	0	prisma/migrations-manual/2026-09-27-batch-catchups-paused.sql
48	0	prisma/migrations-manual/2026-09-27-batch-catchups-quarterly.sql
18	0	prisma/migrations-manual/2026-09-27-guide-seen.sql
22	0	prisma/migrations-manual/2026-09-29-data-api-empty-schema.sql
91	0	prisma/migrations-manual/2026-10-09-drop-vote-questions.sql
75	0	prisma/migrations-manual/2026-10-11-delete-orphan-2024-snapshot.sql
55	0	prisma/migrations-manual/2026-10-11-drop-song-columns.sql
42	0	prisma/migrations-manual/2026-10-17-drop-rhythm-columns.sql
66	0	prisma/migrations-manual/2026-10-17-editions-start-by-hand.sql
110	0	prisma/migrations-manual/2026-10-17-fold-2024-duplicate-into-batch.sql
23	0	prisma/migrations-manual/2026-10-17-reminders-default-off.sql
22	58	prisma/schema.prisma
7	5	scripts/README.md
2	1	scripts/demo/seed-demo.mts
2	1	scripts/dev/backfill-image-dimensions.mjs
100	0	scripts/dev/bird-edges.mjs
92	0	scripts/dev/bird-sheet.mjs
30	8	scripts/dev/centroid.mjs
2	1	scripts/dev/city-alias-scan.ts
4	30	scripts/dev/export-catchups.mjs
4	2	scripts/dev/generate-bird-photos.mjs
81	20	scripts/dev/import-album.mjs
2	1	scripts/dev/import-roster.mjs
2	1	scripts/dev/merge-cities.ts
0	215	scripts/dev/print-magazine.mjs
4	0	scripts/dev/run-sql.mjs
2	1	scripts/dev/seed-curated-content.ts
2	1	scripts/dev/set-password.mjs
10	4	scripts/dev/tag-photos-pick.mjs
136	126	scripts/dev/tag-professions-apply.mjs
18	10	scripts/dev/tag-professions-pick.mjs
75	0	scripts/dev/valley-film-video.mjs
342	0	scripts/dev/valley-film.mjs
0	106	scripts/dev/wall-atlas.mjs
2	3	scripts/ops/prune.mjs
30	5	scripts/ops/snapshot.mjs
2	3	scripts/qa/_probe-kit.mjs
2	1	scripts/qa/crawl.mjs
21	0	scripts/qa/hand-run-passes.test.mjs
2	1	scripts/qa/phase4-prod-check.mjs
38	0	scripts/qa/progress-log.test.mjs
1	0	scripts/qa/protocol-audit.mjs
1	1	src/app/(auth)/error.tsx
1	1	src/app/(auth)/forgot-password/forgot-client.tsx
1	1	src/app/(auth)/login/login-client.tsx
1	1	src/app/(auth)/reset-password/reset-client.tsx
1	1	src/app/(auth)/signup/signup-client.tsx
10	5	src/app/(auth)/verify-email/verify-client.tsx
1	1	src/app/(main)/admin/(index)/page.tsx
1	0	src/app/(main)/admin/audit/page.tsx
6	10	src/app/(main)/admin/catchups/(index)/page.tsx
6	8	src/app/(main)/admin/catchups/[catchupId]/page.tsx
23	1	src/app/(main)/admin/mail/actions.ts
1	1	src/app/(main)/admin/messages/(index)/page.tsx
15	12	src/app/(main)/admin/people/actions.ts
1	1	src/app/(main)/admin/support/page.tsx
3	1	src/app/(main)/birds/page.tsx
18	8	src/app/(main)/catchups/(index)/page.tsx
48	35	src/app/(main)/catchups/[catchupId]/(home)/page.tsx
235	624	src/app/(main)/catchups/actions.ts
3	4	src/app/(main)/catchups/edition/[editionId]/page.tsx
7	23	src/app/(main)/catchups/new/loading.tsx
29	15	src/app/(main)/catchups/new/page.tsx
24	3	src/app/(main)/collection/actions.ts
3	2	src/app/(main)/directory/loading.tsx
15	4	src/app/(main)/directory/page.tsx
1	1	src/app/(main)/error.tsx
192	14	src/app/(main)/feed/actions.ts
20	4	src/app/(main)/feed/page.tsx
29	13	src/app/(main)/guide/[area]/page.tsx
42	0	src/app/(main)/guide/actions.ts
3	3	src/app/(main)/guide/page.tsx
41	22	src/app/(main)/layout.tsx
1	1	src/app/(main)/letters/(index)/page.tsx
40	6	src/app/(main)/letters/[id]/(read)/page.tsx
1	1	src/app/(main)/messages/(index)/page.tsx
1	1	src/app/(main)/messages/[id]/page.tsx
2	1	src/app/(main)/pick-bird/page.tsx
4	4	src/app/(main)/profile/[id]/page.tsx
1	1	src/app/(main)/support/page.tsx
6	1	src/app/(main)/welcome/page.tsx
1	1	src/app/(policies)/guidelines/page.tsx
1	1	src/app/(policies)/layout.tsx
1	1	src/app/(policies)/privacy/page.tsx
1	1	src/app/(policies)/terms/page.tsx
0	7	src/app/api/account/export/route.ts
43	0	src/app/api/auth/stale/route.ts
2	1	src/app/api/demo/reset/route.ts
38	0	src/app/api/users/first-names/route.ts
1	1	src/app/catchups/join/[token]/loading.tsx
1	1	src/app/catchups/join/[token]/page.tsx
1	1	src/app/catchups/join/page.tsx
18	0	src/app/globals.css
2	0	src/app/lab/[dir]/auth/page.lab.tsx
2	0	src/app/lab/[dir]/page.lab.tsx
24	0	src/app/lab/_gate.ts
1	1	src/app/lab/_kit.tsx
1	1	src/app/lab/_lab-client.tsx
12	49	src/app/lab/_registry.ts
1	1	src/app/lab/_second-look-kit.tsx
2	0	src/app/lab/birds-bg/page.lab.tsx
3	1	src/app/lab/birds-rv/page.lab.tsx
0	639	src/app/lab/catchups/_fixtures/magazine/all-portraits.json
0	467	src/app/lab/catchups/_fixtures/magazine/capsule.json
0	66	src/app/lab/catchups/_fixtures/magazine/corpus.ts
0	1418	src/app/lab/catchups/_fixtures/magazine/forty-notes.json
0	896	src/app/lab/catchups/_fixtures/magazine/hostile.json
0	3637	src/app/lab/catchups/_fixtures/magazine/no-photos.json
0	83	src/app/lab/catchups/_fixtures/magazine/nobody-wrote.json
0	160	src/app/lab/catchups/_fixtures/magazine/one-essay.json
0	400	src/app/lab/catchups/_fixtures/magazine/one-writer.json
0	2248	src/app/lab/catchups/_fixtures/magazine/photo-heavy.json
0	1145	src/app/lab/catchups/_fixtures/magazine/songs.json
0	1908	src/app/lab/catchups/_fixtures/magazine/voice-votes.json
0	5631	src/app/lab/catchups/_fixtures/magazine/wall-300.json
4	16	src/app/lab/catchups/_fixtures/pressure.ts
1	1	src/app/lab/catchups/capsule/_room.tsx
3	1	src/app/lab/catchups/capsule/page.lab.tsx
0	82	src/app/lab/catchups/magazine/_live.ts
0	83	src/app/lab/catchups/magazine/_measure.ts
0	611	src/app/lab/catchups/magazine/_pages.tsx
0	129	src/app/lab/catchups/magazine/_room.tsx
0	76	src/app/lab/catchups/magazine/page.lab.tsx
2	0	src/app/lab/catchups/settings/page.lab.tsx
2	8	src/app/lab/catchups/sketches/_data.ts
1	1	src/app/lab/catchups/sketches/_harness.tsx
8	9	src/app/lab/catchups/sketches/_pressure.ts
1	1	src/app/lab/catchups/sketches/_rail.tsx
3	2	src/app/lab/catchups/sketches/_types.ts
2	0	src/app/lab/catchups/sketches/page.lab.tsx
2	0	src/app/lab/catchups/swipe/page.lab.tsx
6	112	src/app/lab/catchups/voice/_clip.ts
1	1	src/app/lab/catchups/voice/_room.tsx
3	1	src/app/lab/catchups/voice/page.lab.tsx
0	273	src/app/lab/catchups/vote/_ask.tsx
0	139	src/app/lab/catchups/vote/_ballot.tsx
0	160	src/app/lab/catchups/vote/_cases.ts
0	279	src/app/lab/catchups/vote/_results.tsx
0	344	src/app/lab/catchups/vote/_room.tsx
0	18	src/app/lab/catchups/vote/page.lab.tsx
1	1	src/app/lab/catchups/wall/_room.tsx
3	1	src/app/lab/catchups/wall/page.lab.tsx
2	0	src/app/lab/centroid/page.lab.tsx
2	2	src/app/lab/collection/_archive.ts
3	3	src/app/lab/collection/page.lab.tsx
1	1	src/app/lab/collection/scrub/page.lab.tsx
1	1	src/app/lab/collection/swap/page.lab.tsx
2	0	src/app/lab/comments/page.lab.tsx
1	1	src/app/lab/craft/page.lab.tsx
2	0	src/app/lab/directory/page.lab.tsx
119	0	src/app/lab/email-states/page.lab.tsx
3	1	src/app/lab/glass-edges/page.lab.tsx
1	1	src/app/lab/groups-rethink/_shell.tsx
1	1	src/app/lab/groups-rethink/page.lab.tsx
1	1	src/app/lab/hoopoe-lives/page.lab.tsx
3	1	src/app/lab/hoopoe-marks/page.lab.tsx
1	1	src/app/lab/hoopoe/page.lab.tsx
3	1	src/app/lab/icon-colours/page.lab.tsx
3	1	src/app/lab/icon-directions/page.lab.tsx
1	1	src/app/lab/landings/_variant-clarity.tsx
1	1	src/app/lab/landings/_variant-editorial.tsx
1	1	src/app/lab/landings/_variant-livingvalley.tsx
1	1	src/app/lab/landings/_variant-noticeboard.tsx
1	1	src/app/lab/landings/_variant-postcard.tsx
1	1	src/app/lab/landings/page.lab.tsx
4	5	src/app/lab/layout.tsx
3	1	src/app/lab/logo/page.lab.tsx
3	1	src/app/lab/logos/page.lab.tsx
1	1	src/app/lab/mascot-moments/page.lab.tsx
1	1	src/app/lab/new-post/_room.tsx
2	0	src/app/lab/new-post/page.lab.tsx
2	0	src/app/lab/page.lab.tsx
1	1	src/app/lab/profiles/page.lab.tsx
1	1	src/app/lab/spine-marker/page.lab.tsx
1	1	src/app/lab/support-ideas/_shared.tsx
1	1	src/app/lab/support-ideas/page.lab.tsx
1	1	src/app/lab/type/page.lab.tsx
110	0	src/app/lab/valley/_clouds.ts
2083	0	src/app/lab/valley/_film-gl.ts
629	0	src/app/lab/valley/_film.tsx
65	0	src/app/lab/valley/_flight.ts
325	0	src/app/lab/valley/_geo.ts
0	89	src/app/lab/valley/_mark-light.tsx
0	171	src/app/lab/valley/_room.tsx
0	161	src/app/lab/valley/_seal.tsx
0	94	src/app/lab/valley/_terminator.tsx
2	0	src/app/lab/valley/hills/page.lab.tsx
8	36	src/app/lab/valley/page.lab.tsx
0	70	src/app/lab/valley/seal/_seal-room.tsx
0	12	src/app/lab/valley/seal/page.lab.tsx
1	1	src/app/lab/viewer/page.lab.tsx
0	60	src/app/lab/years/_index.tsx
0	12	src/app/lab/years/page.lab.tsx
0	50	src/app/lab/years/then/_then-room.tsx
0	457	src/app/lab/years/then/_then.tsx
0	41	src/app/lab/years/then/page.lab.tsx
0	42	src/app/lab/years/wall/_wall-room.tsx
0	752	src/app/lab/years/wall/_wall.tsx
0	44	src/app/lab/years/wall/page.lab.tsx
0	40	src/app/lab/years/weave/_weave-room.tsx
0	579	src/app/lab/years/weave/_weave.tsx
0	65	src/app/lab/years/weave/page.lab.tsx
1	1	src/app/not-found.tsx
1	1	src/components/admin/admin-chrome.tsx
1	1	src/components/admin/admin-person-row.tsx
1	1	src/components/admin/analytics/compare.tsx
1	1	src/components/admin/analytics/tabs.tsx
18	1	src/components/admin/catchup-status.ts
1	1	src/components/admin/content/content-list.tsx
1	1	src/components/admin/mail/mail-rows.tsx
1	1	src/components/admin/messages/thread-list.tsx
1	1	src/components/admin/messages/thread-view.tsx
1	1	src/components/admin/people/person-detail.tsx
1	1	src/components/admin/reports/report-list.tsx
1	1	src/components/admin/review/review-room.tsx
26	0	src/components/auth/actions.ts
1	1	src/components/auth/auth-panel.tsx
193	0	src/components/auth/change-email-actions.ts
165	0	src/components/auth/change-email-dialog.tsx
19	1	src/components/auth/email-actions.ts
64	0	src/components/auth/trivia-dont-know.test.mjs
61	0	src/components/auth/trivia-dont-know.ts
9	0	src/components/auth/trivia-gate.tsx
4	2	src/components/auth/verification-actions.ts
140	79	src/components/auth/verify-email-banner.tsx
4	9	src/components/auth/verify-email-dialog.tsx
48	8	src/components/catchups/answer/answer-card.tsx
14	1	src/components/catchups/answer/answer-experience.tsx
1	1	src/components/catchups/answer/completion-card.tsx
7	2	src/components/catchups/answer/types.ts
835	0	src/components/catchups/answer/voice-recorder.tsx
0	78	src/components/catchups/create/cadence-control.tsx
25	31	src/components/catchups/create/create-catchup-form.tsx
32	9	src/components/catchups/create/people-picker.tsx
1	1	src/components/catchups/edition/not-yet-published.tsx
1	1	src/components/catchups/edition/photo-run.tsx
13	92	src/components/catchups/edition/reader-parts.tsx
18	2	src/components/catchups/edition/reader.tsx
73	0	src/components/catchups/edition/voice-tape.tsx
61	32	src/components/catchups/home/catchup-home.tsx
23	5	src/components/catchups/home/collecting.tsx
1	1	src/components/catchups/home/people-door.tsx
26	16	src/components/catchups/home/types.ts
1	1	src/components/catchups/index/archived-row.tsx
1	1	src/components/catchups/index/picture-door.tsx
1	1	src/components/catchups/not-available.tsx
99	168	src/components/catchups/settings/settings-surface.tsx
16	10	src/components/catchups/settings/types.ts
135	0	src/components/catchups/voice-clip.ts
11	11	src/components/collection/collection-client.tsx
1	1	src/components/collection/collection-skeleton.tsx
42	14	src/components/collection/contribute-room.tsx
2	2	src/components/collection/photo-river.tsx
5	5	src/components/collection/photo-scrubber.tsx
27	10	src/components/collection/river-controls.tsx
2	2	src/components/collection/river-query.test.mjs
1	1	src/components/common/attach-image-dialog.tsx
208	78	src/components/common/bird-adjust.json
1503	440	src/components/common/bird-avatar-v2.tsx
12	0	src/components/common/control-geometry.ts
8	1	src/components/common/filters/range-facet-pill.tsx
1	1	src/components/common/identity-row.tsx
1	1	src/components/common/image-viewer.tsx
107	0	src/components/common/link-card.tsx
60	0	src/components/common/link-import-rule.test.mjs
30	0	src/components/common/link.tsx
1	1	src/components/common/motion.tsx
1	1	src/components/common/person-name.tsx
6	1	src/components/common/rich-text-area.tsx
60	0	src/components/common/step-dots.tsx
64	7	src/components/directory/alumni-map.tsx
36	2	src/components/directory/directory-client.tsx
15	2	src/components/directory/directory-grid.tsx
14	3	src/components/directory/profile-card.tsx
0	3	src/components/feed/feed-rail.tsx
54	9	src/components/feed/rail/collection-module.tsx
3	3	src/components/feed/rail/directory-module.tsx
1	1	src/components/feed/rail/letters-module.tsx
0	65	src/components/feed/rail/pulse-module.tsx
10	10	src/components/feed/rail/rail-skeleton.tsx
24	33	src/components/guide/chapters/birds.tsx
48	66	src/components/guide/chapters/catchups.tsx
53	51	src/components/guide/chapters/collection.tsx
44	22	src/components/guide/chapters/directory.tsx
51	50	src/components/guide/chapters/feed.tsx
2	1	src/components/guide/chapters/index.tsx
26	31	src/components/guide/chapters/letters.tsx
91	0	src/components/guide/door-coach.tsx
129	14	src/components/guide/guide-body.tsx
142	0	src/components/guide/guide-cover.tsx
55	145	src/components/guide/guide-kit.tsx
73	8	src/components/guide/guide-layer.tsx
289	21	src/components/guide/guide-overlay.tsx
65	0	src/components/guide/guide-photos.ts
75	0	src/components/guide/guide-tour-start.tsx
58	0	src/components/guide/tap.tsx
1	1	src/components/landing/landing-footer.tsx
1	1	src/components/landing/landing-hero.tsx
1	1	src/components/landing/landing-nav.tsx
10	3	src/components/layout/notification-bell.tsx
3	2	src/components/layout/page-header.tsx
35	0	src/components/layout/rail-grid.test.mjs
17	0	src/components/layout/rail-grid.ts
1	1	src/components/layout/sidebar.tsx
1	1	src/components/letters/drafts-strip.tsx
1	1	src/components/letters/letter-desk.tsx
1	1	src/components/letters/letter-menu.tsx
1	1	src/components/mascot/hoopoe-playground.tsx
9	2	src/components/mascot/moments/celebration-detector.tsx
1	1	src/components/messages/thread-list.tsx
6	5	src/components/onboarding/actions.ts
86	70	src/components/onboarding/onboarding-flow.tsx
127	0	src/components/onboarding/step-kit.tsx
21	38	src/components/onboarding/steps/done-step.tsx
31	48	src/components/onboarding/steps/houses-step.tsx
80	82	src/components/onboarding/steps/photo-step.tsx
49	46	src/components/onboarding/steps/register-step.tsx
32	28	src/components/onboarding/steps/welcome-step.tsx
3	0	src/components/onboarding/types.ts
6	2	src/components/posts/comments-section.tsx
71	19	src/components/posts/create-post-form.tsx
87	29	src/components/posts/post-card.tsx
2	7	src/components/profile/house-chain-editor.tsx
13	4	src/components/profile/letterhead-profile.tsx
7	2	src/components/profile/profile-actions.ts
1	0	src/components/profile/stray-hair-ids.ts
7	1	src/components/settings/actions.ts
1	1	src/components/settings/dark-gauntlet.tsx
1	1	src/components/support/bird-picker.tsx
1	1	src/components/support/bird-plate.tsx
2	2	src/components/support/costs-card.tsx
4	3	src/components/support/support-shell.tsx
9	5	src/components/ui/dialog.tsx
1	0	src/components/ui/focus-recipe.test.mjs
76	21	src/components/ui/sheet.tsx
6	0	src/instrumentation.ts
16	1	src/lib/admin-worklist-query.ts
2	1	src/lib/admin.ts
5	0	src/lib/audit.ts
81	3	src/lib/auth.ts
35	0	src/lib/avatar-deal-server.ts
278	0	src/lib/avatar-deal.test.mjs
103	0	src/lib/avatar-deal.ts
20	17	src/lib/avatar.ts
221	0	src/lib/batch-catchup-keeper-rule.test.mjs
62	15	src/lib/batch-catchups.test.mjs
113	24	src/lib/batch-catchups.ts
4	2	src/lib/caption-tidy.ts
97	0	src/lib/catchup-added-notify-rule.test.mjs
76	0	src/lib/catchup-library-pick-rule.test.mjs
104	85	src/lib/catchup-lifecycle.test.mjs
61	0	src/lib/catchup-notifications.ts
65	0	src/lib/catchup-two-bells-rule.test.mjs
94	196	src/lib/catchups-core.test.mjs
155	265	src/lib/catchups-core.ts
6	0	src/lib/catchups-edition-view.ts
7	17	src/lib/catchups-export.ts
120	58	src/lib/catchups-notify.ts
50	19	src/lib/catchups-types.ts
126	159	src/lib/catchups.ts
7	22	src/lib/city-coords.ts
2	1	src/lib/comment-target-rule.test.mjs
111	0	src/lib/confirmation-copy.test.mjs
106	0	src/lib/confirmation-copy.ts
102	0	src/lib/db-tls-rule.test.mjs
70	0	src/lib/db-tls.ts
1	2	src/lib/demo-seed/content.ts
0	2	src/lib/demo-seed/seed.ts
0	1	src/lib/demo.test.mjs
0	6	src/lib/demo.ts
91	0	src/lib/email-bounce-rule.test.mjs
3	1	src/lib/email-gate-message.ts
54	0	src/lib/email-gate-open.ts
65	0	src/lib/email-gate-rule.test.mjs
4	0	src/lib/email-normalization-rule.test.mjs
38	7	src/lib/email-queue.ts
3	1	src/lib/email-verification.ts
4	1	src/lib/email.ts
32	0	src/lib/gate-coverage.test.mjs
52	14	src/lib/guide-areas.ts
21	5	src/lib/guide-open.ts
90	0	src/lib/guide-tour.test.mjs
46	0	src/lib/guide-tour.ts
16	0	src/lib/house-spans.ts
44	1	src/lib/image-facts.test.mjs
28	0	src/lib/image.ts
21	0	src/lib/link-preview-core.test.mjs
28	3	src/lib/link-preview-core.ts
38	0	src/lib/login-attempt-cap-rule.test.mjs
22	0	src/lib/login-attempt.ts
0	129	src/lib/magazine/from-export.ts
0	696	src/lib/magazine/grammar.ts
0	154	src/lib/magazine/image.ts
0	325	src/lib/magazine/index.ts
0	296	src/lib/magazine/magazine.test.mjs
0	296	src/lib/magazine/measure.ts
0	361	src/lib/magazine/paginate.ts
0	146	src/lib/magazine/score.ts
0	289	src/lib/magazine/types.ts
86	0	src/lib/mail-policy.test.mjs
47	0	src/lib/mail-policy.ts
2	1	src/lib/map-cluster.ts
52	0	src/lib/mention-editing.test.mjs
189	0	src/lib/mention-editing.ts
175	0	src/lib/mention-notifications.test.mjs
135	0	src/lib/mention-notifications.ts
30	0	src/lib/normalize.test.mjs
69	2	src/lib/normalize.ts
185	0	src/lib/post-link-cards.test.mjs
68	0	src/lib/posts.ts
4	1	src/lib/prisma.ts
109	0	src/lib/profession-pass.test.mjs
227	0	src/lib/profession-pass.ts
2	2	src/lib/profession-tags.test.mjs
111	27	src/lib/profession-tags.ts
5	2	src/lib/profile-editor-rule.test.mjs
16	12	src/lib/proxy-rule.test.mjs
14	0	src/lib/rate-limit.ts
7	2	src/lib/read-more-fold.test.mjs
9	0	src/lib/rich-text-editing.ts
-	-	src/lib/rich-text.test.mjs
39	2	src/lib/rich-text.ts
8	0	src/lib/roster.ts
61	0	src/lib/session-unavailable-rule.test.mjs
29	0	src/lib/sign-in-redirect.ts
92	0	src/lib/stale-session-rule.test.mjs
54	0	src/lib/stale-session.ts
20	27	src/lib/time-capsule-rule.test.mjs
100	38	src/lib/upload-client.ts
171	0	src/lib/upload-fallback-rule.test.mjs
31	0	src/lib/upload-shared.ts
9	0	src/lib/utils.ts
3	3	src/lib/validators.ts
135	0	src/lib/voice-transcript.test.mjs
179	0	src/lib/voice-transcript.ts
110	0	src/lib/voice-upload-client.ts
0	243	src/lib/vote-question-rule.test.mjs
0	175	src/lib/vote-question-rule.ts
9	6	src/proxy.ts
16	3	src/types/next-auth.d.ts
```

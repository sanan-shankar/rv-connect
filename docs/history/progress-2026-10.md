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

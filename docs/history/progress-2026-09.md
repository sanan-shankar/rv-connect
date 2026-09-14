## 2026-09-12 (later) — a year of the Collection stops going blank when a photograph joins or leaves it

The owner: "when I add or remove photos, the photos from that year disappear until I reload the
page. so when I upload something to 2014, all the photos of that year disappear. happens for other
people too not just me."

The river draws a year only when it holds EXACTLY as many photographs as the box reserved for it,
because a year drawn from half its photographs is shorter than its box and that moves the document
(2026-09-10). The count comes from the shape index, which was written when the page opened and never
moved again. So anything that changed a year made the two disagree, and a year that disagrees is not
drawn short -- it is drawn as nothing, a blank box at the old height, and `held` then blocks the
re-fetch that would have put it right. Three routes to the same blank:

- deleting one: `forget` took the photograph out of the flat list and nowhere else, leaving its year
  one short of its box;
- adding one: the index still said N, and the year arrived from `loadBand` holding N+1;
- somebody else adding or deleting while your page was open -- the "other people too" half, and the
  same mismatch from the other side.

The index now follows the archive. `reshapeBand`/`holdsBand`/`sameIndex` in river-geometry.ts (pure,
unit-tested) replace one year's run with the shapes of what that year actually holds; `ratioOf` is
shared with the server so both round a photograph identically. `needBand` reshapes on arrival, so a
year that has changed since the page opened takes the room it needs. `forget` takes the photograph
out of its year and out of the index together. And a fresh index from the server -- which arrives
after every contribution, deletion and edit -- is adopted without giving up the river: years that
still match are kept, a year that gained or lost one is let go and fetched again whole, which is what
puts a new contribution into 2014 without a reload.

Two brakes, because this area has produced a runaway fetch three times. The re-seed that replaces the
river with page one is now refused while the river is drawn from geometry (there the cursors never
move, so nothing ever looked "walked", and page one is only the newest few years -- adopting it
blanked every year below them). And the reconcile compares the server's index against ITS OWN LAST
ANSWER rather than against the screen: the two differ on purpose after `needBand` corrects a year,
and comparing against the screen would undo that correction, re-fetch, and be answered again for as
long as they disagreed.

Measured in a real browser against the live archive, with the page size temporarily cut so the Valley
loads year by year the way the class archive does, and one year made to look as though a photograph
had just been added to it. Before: reaching that year drew BLANK, and deleting one photograph from a
year of nine drew BLANK. After: 5 photographs and 8 photographs, no console errors, and no further
requests in the five seconds after it settled. Also fixed alongside, same cause: a heart or a caption
edit was written into the flat list only, so the next year to arrive rebuilt the river from copies
made before the change.

`npm run check` clean, 118/118.

## 2026-09-12 (later) — "Read more" folds by lines, and prefers a paragraph to a sentence

His second look at the same control: "make sure the read more appears not by character count but only
after 7 lines of written content. it's appearing too early now. but prefer to show read more when
there's a para break so if it breaks after 5 lines let's still show it."

So the fold is measured, not counted. A character count cannot know the width, the font or where a
paragraph ends -- 300 characters is four lines on a desktop and ten on a phone, which is why it fired
early. `src/lib/read-more-fold.ts` splits the job: the browser reports the vertical centre of every
rendered line (`Range.getClientRects`, one rect per line; a blank line has no glyphs, so a paragraph
break shows up as a gap wider than a line), and a pure `chooseFold` decides. Seven lines, or the
LATEST paragraph that ends on line 5, 6 or 7. A post nine lines long is the first that folds at all:
hiding a single line saves no height when "Read more" takes a line of its own.

Measured again when the width changes and once `document.fonts.ready` resolves, because both rewrap
the text. The server render, which cannot measure, clamps a post over 300 characters to `7lh` so the
first paint is close to the final one rather than printing every line and snapping shut.

**Nothing is split any more.** The whole post renders in one `renderRichText` call and the paragraph
is clipped in CSS, which retires audit C-011 rather than re-fixing it: `rich-truncate.ts` and its
`safeTruncateIndex` are deleted, since there is no second render to keep in step with the first.

**How the fold looks.** A fold at a paragraph's end just stops -- the full stop already says so. A
fold inside a paragraph lets its last line trail off, fading over its right 40% to nothing, the way
iOS ends a clipped description, instead of the "..." this used to print. It is a mask, not a
card-coloured gradient over the text, because the card also renders in a sheet on a different
surface; a second mask layer keeps every other line solid, including the ones below the fold that
"Read more" grows into, and `--fold-fade` lifts the trail from 0 to 1 as the post opens. The label
moved from `mt-1` to `mt-2` (at 4px it sat inside the paragraph's leading and read as one more line
of the post) and carries MENU_TRIGGER_HIT's device: 44px of touch on a coarse pointer, invisible.

Measured on the real posts at 1440 and 390: a 14-line post stops at its line-6 paragraph with no
fade, a 24-line one at seven with the fade, an 8-line one not at all; the open eases 178 -> 434px
with `--fold-fade` 0.17 -> 1 across the same beat. No page errors at either width.

**`npm run visual` could not be trusted this session and was not updated.** All 24 routes fail,
including the signed-out landing and login, which hold no post card. The reason is not this work:
the dev server is serving `@font-face` rules for the metric FALLBACKS only (`local(Times New Roman)`,
`local(Arial)`) and no webfont file is requested at all, so the whole app is set in Times and Arial
against baselines shot in Libre Baskerville and Source Sans 3. The font files are present in
`.next/dev/static/media`; the CSS that points at them is not. A restart of the dev server is what
that wants, and the server belongs to another session working in this tree.

## 2026-09-12 — "Read more" continues the sentence instead of breaking it onto a new line

The owner pointed at three feed posts, each broken mid-sentence once opened: "Am / visiting RV",
"first / impressions", "in a / way those were". None of it was in the text. The database held
ordinary spaces. The card drew the first ~300 characters as one `<p>` and the remainder as a
second `<p>` inside a height-animated box, so every opened long post broke at wherever the cut
fell, and the new line opened with the space the cut sits on.

The remainder is now an inline span inside the lead's paragraph, fading in as before. The height
ease had nothing left to wrap, so the handler reads the paragraph's collapsed height and a layout
effect plays the grow from it before the longer text paints, then hands back `height: auto`.
Measured on all three posts at 1440 and 390: one paragraph, height easing 128 -> 153px (mural,
desktop) with no inline style left at rest, no page errors. `rich-truncate.test.mjs` pins the
remainder as an inline span.

Data, same session: the Big Banyan Tree mural post (`seed-wa-the-big-banyan-tree-mural`) is
rewritten to his two paragraphs. The two WhatsApp replies (Anita Reddy, Usha K) that had been
pasted into its body are gone, and `picks.json`/`picks.md` match, though the seed skips existing
ids anyway.

`npm run check` clean, 117/117. `npm run visual` 25/25.

## 2026-09-11 (later) — a saved contact wears the member's face: their photo, or their bird

Asked for on 2026-09-10 and twice left unbuilt. The Save contact card download now carries a
PHOTO: the member's uploaded picture, or the bird the app draws for them, chosen by
`contactPhotoSrc` with BirdAvatar's own precedence so the two cannot disagree.

**The birds are pre-rendered, not drawn per request.** `BirdGlyphV2` is JSX, and Next will not
compile a manual `renderToStaticMarkup` inside `app/` (the app icon hit this first). With no disc a
bird's pixels depend only on species and pose, so there are exactly 102 of them.
`scripts/dev/generate-bird-photos.mjs` drives `/lab/centroid` in a real browser and writes
`public/images/birds/`, 852 KB in all. The probe grew `flip` and `pad`: pad widens the frame to 125
units, because a Kingfisher's bill and a Coucal's tail run past the 100-unit box, which the avatar
clips at its edge unseen but which floated as a hard cut inside a contact's circle on the first pass.
Each sits on `--card`, since phones crop to a circle and some paint transparency black.

**Fetched on open, not baked into the page.** Inline it would have added ~11 KB of base64 to every
profile view. The card starts the fetch when it opens, so Save still lands inside the tap (Safari
drops a download that comes long after the gesture), re-encodes on a canvas as a 384px JPEG
(Apple Contacts takes no WebP), and saves without a face rather than not at all if the image fails.
A photo goes through `photoSrc`; hand-building the optimizer URL with `q=80` returned 400, since
Next 16 allows only `q=75`.

Verified by downloading real cards in Chrome: Adit Ajay's carries his owlet, Venkatesh B R's his
flycatcher photograph, no console errors. `npm run check` 117/117, `npm run visual` 25/25.

Also found: `scripts/dev/centroid.mjs` has been unable to reach `/lab/centroid` since /lab became
admin-only (audit M19); it never signs in. Not fixed here.

## 2026-09-11 — the bot check stops being able to lock a member out, and starts saying why it turned them away

A member reported that sign-in kept telling her "We couldn't confirm you're human. Refresh the page
and try once more", on Safari, not incognito, with no checkbox ever appearing. She had tried three
times. The table said six: six `bot-check` refusals between 13:19 and 13:28 UTC on 2026-09-10, no
successes, against a verified account with a password and no block on it. Two other people passed
the same door in the same nine minutes — one signed in, one got their password wrong twice — so
nothing was down. Cloudflare had simply decided to challenge her, and the challenge is where
people die.

**The number that made this a shape problem rather than a bug.** Thirteen of the thirty-nine
sign-in attempts in the fortnight to 2026-09-10 were refused at the bot check. Seven of the
thirteen were the owner's own.

**Why three sessions had already failed to fix it.** M07 fixed the blocked script. 2026-08-22
fixed the widget re-arming under a live submit. 2026-08-28 fixed the hostname list. Every one was
a real cause and every one was fixed correctly, and none of them touched what was underneath: a
tokenless sign-in was a THROW, so any failure of the widget — for any reason, including reasons
nobody had met yet — was a permanent lockout, wearing a sentence that told the member to refresh.
Refreshing was never once the thing wrong. Worse, the reset form wears the same widget, so the
recovery path was shut too.

**The asymmetry nobody had argued for.** `verifyTurnstile` fails OPEN when Cloudflare is
unreachable from the SERVER, on the stated ground that a bot check which takes sign-in down with
it is worse than the bots. Failing CLOSED when the failure was on the visitor's side was not a
decision, it was where the code fell. So sign-in now runs an unvouched attempt on
`login-unverified` — five an hour per IP, spent on success as well as failure. A person gets in on
the first try. A stuffing run gets five guesses an hour with `login-ip` (30 failures a quarter
hour), `login-account` (10), bcrypt at cost 12, the block list and `credentialVersion` all still
standing behind it. Signup and the reset REQUEST keep the hard refusal: a bot minting accounts is
what Turnstile is most for, and someone turned away there has a human to write to. Owner's call,
asked and given before any of this was written.

**And it now says why.** The thing that made this unsolvable was that the failure erased its own
evidence: Cloudflare names its reason in the console of the person who cannot get in, and the
server recorded the single word `bot-check`. `LoginAttempt.detail` now carries `no-token/timeout`,
`no-token/error-110200`, `refused/timeout-or-duplicate`, and /admin/audit shows it. The half after
the slash is the widget's own account, sent with the request and **trusted for nothing** —
allowlisted by `bot-check-detail.ts`, recorded, never branched on. Proved on the live path, not
just in the unit test: a hint of `<script>alert(1)</script>` is written down as plain `no-token`.

**A blocked script no longer stops at the client.** The form used to short-circuit on it and never
send the request, which was right when every such attempt was refused and is wrong now that they
are not — the person likeliest to be permanently locked out was the one being spared the round
trip. It sends, and the "something in this browser is blocking it" sentence is held back and shown
only if the server does refuse.

**Two documents were asserting something about the owner's Cloudflare dashboard that was not
true.** `docs/SECURITY.md:213` and `docs/TRAPS.md:296` both said `vercel.app` was on the widget's
hostname list. It is not; the list reads `localhost`, `rishivalley.space`,
`rv-alumni-demo.vercel.app`, `rv-alumni.vercel.app`. The 2026-08-28 session designed the widening,
wrote it up as shipped, and the dashboard is the owner's. That is why every past deployment still
answers 110200 and why he still cannot open one. Both files now say what is actually there and
that the entry is still worth adding — `turnstile-origin-rule.ts` was built to make it safe and
still would. It is a convenience now rather than a rescue, because an old deployment carries its
own build and none of today's code reaches it.

**Ruled out, so the next session does not chase it.** `frame-src` in the CSP has no `blob:`, and a
`blob:` iframe on rishivalley.space IS blocked — proved with a live `securitypolicyviolation`. It
is not this bug. An isolated probe serving the production CSP, a permissive one and none at all
gave the identical result, so the widget failing to draw its checkbox in an automated Chrome is
the automation, not the policy. Left alone rather than "fixed" on suspicion.

**Verification.** `npm run check` clean, 117/117 test files (the new one is
`bot-check-detail.test.mjs`, five cases on the untrusted hint). The behaviour proved against the running server
rather than asserted: a sign-in carrying no token at all is judged on its credentials for five
attempts and refused with `bot-check` on the sixth. Probe rows deleted afterwards, along with a
`not-a-real-account-turnstile-probe@example.invalid` row the 2026-08-28 session left behind, which
had been sitting in the analytics "locked out, worth emailing them" panel ever since.

**H22's probe went red on the rename** (`verifyTurnstile` → `checkTurnstile` at the sign-in door)
and now names all three spellings. It broke the day the door was improved, which is the least
useful moment for a security board to go red.

# Session history — September 2026

Moved out of the root `progress.md`, unedited. The root file is the index: one line per
session, and the full entry lives here. Nothing reads these files — they are the record,
not an input.

Newest first. Until 2026-09-07 the root log ran in two directions at once — some sessions
prepended, some appended — so entries from the same day that came from the two different
halves are ordered by date and then by where they already sat. No text was edited.

## 2026-09-10 (later) — his first three photographs replace the six stand-ins, and nobody sees the same header twice

He sent three photographs of the school, cropped to 2 : 1 by hand, against the twenty the pool
has been waiting for since build phase 3: *"I was supposed to provide 20. I have three. that'll
do for now."* They replace six stand-ins cut from the demo Collection, five of them the same
banyan from different angles, none wider than 1,280px -- *"I don't wanna see any of those."*

**The files ship uncropped**, WebP q90 at 3,456 to 4,608px wide, camera metadata stripped
(a Lumix writes GPS). Nothing is baked in: every surface still takes its own crop with
`object-fit: cover` and the photograph's own `focus`, which is what he asked for -- his crop is
the file, ours is the aim. **Each aim was chosen by looking**, not computed: every candidate was
cut at all four frame shapes the app draws (6.33 : 1 down to 1.78 : 1), with the scrim and a name
over it, and read at the tightest band. The path 66%, the benches 68% -- they fill 47% to 80% of
the frame, a little more than the band holds, so the front bench's foot goes under the scrim --
and the hill 48%, aimed at the boulder's top because the boulder is taller than the band.

**His rule about repeats is now the pick.** *"To the extent possible one person doesn't have two
catch ups with the same header when there's a picture available that they don't have a catch up
for."* `pictureAvoiding` counts, per photograph, the (member, Catch-up) pairs already showing it
-- exactly how many people would see it twice -- and takes the least held, so the count is zero
whenever anybody in the room has a picture free. Ties go round the pool from the old seeded pick,
so an empty count is byte-for-byte what shipped before and a retried creation still lands on the
same photograph. One query (`pickCatchupPicture`) fills it, and all three paths that mint a
picture share it: starting a Catch-up, a batch reaching ten, and the purge putting one back after
its uploader deletes their account. The rule is pure and tested; the query is the only impure half.

**The six live rows are the half an edit cannot reach**, since each stores its own path. A dated
migration moves them with the same rule in SQL, greedy in creation order. Rehearsed against
production inside a transaction that rolled back: all six move, the one Catch-up on an uploaded
photograph is untouched, and of 51 people across every Catch-up exactly one ends with a repeat --
the account holding six Catch-ups, five of them on the pool, where three photographs can only go
2-2-1. **It is applied AFTER the deploy, not before**: the running build has no
`/images/catchups/` until then, and the stand-in files stay in `public/images/collection/` for the
demo's Collection, so a row that has not moved yet keeps drawing.

**One test rule was loosened on purpose.** Two applied migrations retype the pool, and the test
demanded they equal it exactly -- so every photograph ADDED would have meant retyping migrations
that had already run and would match no row again, which is the opposite of the "one edit, no
migration" the pool was moved out of the lab for. It now checks that what they name is still in
the pool with the same aim. Adding photographs stays one file and one line; retiring one is a
migration, and this is the worked example. The new migration selects by the six RETIRED paths by
name rather than "not in the pool", so re-running it after the pool grows cannot drag a row on a
newer photograph back onto these three.

Also: the lab shelf drew six cards by indexing `PICTURES[0..5]` and would have drawn nothing for
three of them, so it goes round the pool instead; and a new test pins every pool file at 2,400px
or wider and within 2% of 2 : 1, which is the brief his next batch will be measured against.

`npm run check` 116/116, `npm run visual` 25/25 with no baseline moved -- the correct result,
since the live rows do not move until the migration runs. The `/simplify` pass's four review
agents all died on a session rate limit; the diff was reviewed by hand instead.

## 2026-09-10 (later) — More under an answer only shows when there is more

He opened More under Mohini's answer in the reader and nothing more appeared. The cause was two
tests disagreeing: the button showed on a CHARACTER count (over 600) while the fold is a LINE count
(10). Measured on her 805 characters: 7 lines at 1512 and 8 at 1440, so the fold hid **0px** under
a button that promised more; 18 lines at 390, where it hid 198px and the button was right.

Now the fold is measured the way the viewer's caption already is (`scrollHeight - clientHeight`),
re-asked by a ResizeObserver when the column changes width. The character count stays as the cheap
first pass, and the button starts shown so the server and first client render agree -- the phone,
where long answers really fold, never sees it arrive late. After: no button at 1512 or 1440; at
390 More reveals all 446px and turns to Less. Pinned in `reader-geometry.test.mjs`.

## 2026-09-10 (later) — the line beside an Edition's date is cinnamon, read or not

His words: *"on the list of catch ups when it shows an edition it has this grey line to the left of
the date. can you make that line cinnamon instead of grey."* The grey was the read mark's second
state -- cinnamon while an Edition was unread, the page's hairline once opened (build phase 6) -- so
the measure is now cinnamon on every cover and read and unread no longer look different. Two things
are kept so that is one class to undo: `e.read` still arrives from `readEditionIds()`, and a screen
reader still hears "Not read yet." on an unread one. Seen on `/catchups` at 1440 and 390, on an
Edition the owner has read.

## 2026-09-10 (later) — build phase 9: a Catch-up answer gets the feed's comments, on the feed's own table

His ask was plain (review-2026-09-07 N1): *"I feel like the comment section can be done the same way
that we do it in feed ... I think we can just copy that comment section."* So nothing about the
thread is new, and the work was making one thread serve two owners without a second copy of it.

**One table.** `Comment.postId` is nullable, `entryId` sits beside it, and `Comment_one_target`
says exactly one is set. Prisma cannot express that, so it lives in
`2026-09-10-comments-on-answers.sql` and `comment-target-rule.test.mjs` is the only thing
connecting the two. Additive and a relaxation, so it went to both projects before the deploy.

**One implementation.** `lib/comment-thread.ts` now holds the paging, the deleted-parent stub, the
double-submit guard, the one-level reparenting (C-016), the same-thread check (M28) and the
serialiser. `feed/actions.ts` and `catchups/actions.ts` each keep only their own gate and their
own bell. `comments-section.tsx` takes its five actions as a prop.

**On the page.** The replies control is the feed's -- 51x32 beside a 51x32 heart, 4px apart, glyph
centres level -- and the panel brings its own open/close clock. Driven as Jerry at 1440 and 390:
count 0 -> 1 -> 2, one bell for two comments from one person, both deleted through the shared
action as blanked soft-deletes. No overflow, no console errors.

**The bell is per person per answer**, not per Edition, and that departs from the spec: owner
question 27. Keyed on the exact sentence, because a name prefix would merge "Ravi" into "Ravi Kumar".

**Found by tracing every reader of the widened column**: leaving a Catch-up would have left every
comment bell behind, the admin list would have linked to `/feed#null`, and the export would have
dropped Catch-up comments. The write-path review added one real gap (no Remove control for an
admin on a Catch-up thread, now wired) and one true-but-intended cascade, whose record is corrected.

`npm run check` 116/116, `npm run visual` 25/25 with no baseline moved.

## 2026-09-10 (later) — the .vcf drops its houses for an about line, and a divider stops running under the bird

Two small owner callouts on Save Contact and the feed rail.

The downloaded `.vcf`'s NOTE used to append every house year (`; Houses: Aravalli 2014-15, ...`) —
dropped, since a house name means nothing to a phone's Contacts app outside the school. In its
place: the person's `about` text, if they wrote one, joined to the batch line by a blank line
(`user.about ? `\n\n${user.about}` : ""`). `academicSpanLabel` came out with it — nothing else in
the file still called it.

**"New in the directory"**, the feed rail module, drew its row divider as a `border-t` on each
row's own `<div>`, so the line ran the row's full width, under the bird glyph as well as the name.
Moved to a separate hairline (`h-px bg-border`) inset `ml-[52px]` — the sm avatar's 40px plus the
row's `gap-3` — the convention an icon-led menu usually uses, separating the text rather than the
glyph beside it. Putting the border on the row's text column instead was tried and dropped: that
column is only as tall as its two lines of centered text, not the row's full height, so its border
would sit lower than the row boundary rather than on it.

## 2026-09-10 — the reader is the front runner, and the bar hands over instead of blinking

Build phase 8 of the Catch-ups rework. `/catchups/edition/[id]` is the front runner transplanted
out of `/lab/catchups/sketches`, not re-derived: eight files deleted (the masthead, the table of
contents, the question section, the answer card and its photographs, the footer tease, the Spotify
card and the photo wall) and six written. The answers are quiet paper tiles at the feed's own sizes
and the one bespoke object is the strip under the green bar, which is the navigator — navigator A,
the only one left after N46.

**The green bar carries the Catch-up's name on a phone**, and it is the way back up at every scroll
depth (architecture 7, and the 44,381px of scrolling recon measured as the only way home). It
arrives through a store rather than a prop because the bar lives in `Sidebar`, a SIBLING of the page
in the `(main)` layout, and no prop can travel that path; `useLayoutEffect` sets it before paint, so
a client navigation never shows the wordmark first.

**The layout is chosen in CSS, which is the one place this departs from the room.** A room draws
inside a fixed frame, so it picked between its three layouts in JavaScript from a prop. A page
cannot: the server would render one of the three and the browser would paint it before swapping —
on a laptop that is the phone layout, full-bleed, with a strip pinned under a bar that is not there.
So every structural choice is a class and the server's single render is right at every width.
JavaScript keeps only the two scroll offsets, which nothing paints.

**Tailwind emits `md:` AFTER an arbitrary `min-[1180px]:`.** Measured: `h-16 md:h-[88px]
min-[1180px]:h-0` computed to 88px at 1440 and put the page title 88px below the shell's own 40px
gutter. Every three-way rule in the file bounds its middle range, and `reader-geometry.test.mjs`
fails on any that does not — along with nine other pins between a constant and the class that
mirrors it.

**The two clamps swap, closing F41**: the docked question in the strip goes 3 → 2 lines, a row in
the pull-down list goes unbounded → 3. The row's clamp sits on an inner span, because
`overflow: hidden` clips at the padding box and the same rule one level up bleeds a band of the
fourth line into the row beneath.

**The photo wall ships as the RUN he picked** — one band, every photograph at its own width,
bleeding off the right edge, one contributor's set 3px apart under a single name, no captions and
no count line. **It has never rendered against real data and cannot**: `photo-wall` has been a
question category since the feature was built and the live database holds zero prompts carrying it.
So its arithmetic moved to `lib/photo-wall.ts` and `photo-wall.test.mjs` pins the part that can be
wrong — the grouping, and that the viewer opens on the photograph that was touched. A guarded flip
of a live prompt to see it once was attempted and correctly refused.

**Eight notes from him while it was on screen**, all folded in the same session:

- the names sat too far from the birds. Cause found by measuring: flushing a glyph's left edge
  slides its right edge left too, so a bird sat **16px** from its name against a photograph's 12,
  and the first fix returned only the right inset and closed half of it. What comes back is the box
  minus the ink; both are **12** now.
- the question heading's 26ch measure came off — *"summer goes onto the next line when there's
  plenty of space. idk why that's fixed like that."*
- on a laptop the strip now **fades in only past the first question**, never says the date, and
  **hands over from question to question**. The blink between questions was one number doing two
  jobs: the strip was labelled from the question you are READING, which changes a screen and a half
  before its heading reaches the bar, so in that window nothing was docked and it fell back to the
  date. It is labelled from the last heading that went UNDER the bar instead.
- the 88px that held a place for that bar is gone with it — *"a massive gap above the title."*
- the grabber pill under the list is deleted.
- the panel's chrome no longer changes as it opens: the border used to flip instantly while the
  height took 300ms, which is the *"outline that follows it a beat late."*
- one clock instead of three. Height carries opacity, 260 in and 200 out, and the caret joins it.

Measured at four widths: no horizontal overflow anywhere, the reading column **856 at 1512** (the
room's own number), page margins 40 both sides at 1440, and the title at the shell's own gutter at
every width. `npm run check` green, `npm run visual` 25/25 with no baseline moved.

**Phase 8 leaves two things behind, both by design**: comments are phase 9 and the replies control
is not drawn until there is something to open, and a link pasted into an answer's body is still
printed as text until phase 10 resolves it.

## 2026-09-09 — the home becomes a place, and answering stops taking you away from it

Build phase 7 of the Catch-ups rework. `/catchups/[id]` is rebuilt as a PLACE rather than a page
that reshapes itself, which is his own framing: *"is there a home page that you then keep
navigating from to do things like answer or whatever, or does the home page transform into
something each time. I think the answer being its own page is good."*

Four regions, always in the same spot. The **head** is the picture with the name written on it and
People and Settings as two doors on it — 240px on a laptop and 172 on a phone, a HEIGHT and never a
ratio, so a wider screen shows more photograph rather than a thinner slice. The **Edition region**
draws exactly one thing per state. The **state line** sits under it, right-aligned. The **sidebar**
is the back numbers as covers and nothing else.

**Answering moved onto it**, his N77: *"it doesn't make sense to have the collecting in the home
screen and then the answering takes you away from it."* The composer keeps every audited invariant
— the per-prompt save queue, the row-version guard, the failed-save status — and loses its 272px
rail for the drawn marks, which are now buttons to each question rather than a read-only bar
(*"I can't really navigate between questions while answering them"*). Skip for now is gone
(*"skip for now is same as next"*) and Back moved beside Next. `/catchups/[id]/answer` is a
permanent 308, and a dated migration rewrites the twelve `Notification.link` rows that point at it
— not cosmetic, because the daily reminder de-duplicates itself by matching on that link, so a
stale row would have left a member a permanent reminder beside every new one.

**One representation of a published Edition.** The sidebar and the Edition region both draw
`EditionCoverCard`, the same component `/catchups` uses. That is brief 13 and 39 answered in an
import rather than a fourth drawing.

**Thirteen files deleted**, including the 733-line people panel he called *"done so badly"*. Its
three verbs — add someone, remove a member, make a Keeper — came with it onto the People door,
which a test caught me dropping: deleting the panel took the last alumni-only people search with
it, so a Keeper had no way left to add anybody.

**Measured at 1440**: no horizontal overflow, rail 318 wide, page margins **40 left and 40 right**
where they were 40 and 148 (*"the margin on the right is so much bigger than the margin on the
left. That makes no sense."*), and the sidebar's first cover top-aligns with the main column's
first tile at y=304. `npm run check` 113/113, `npm run visual` 25/25 with no baseline moved.

**Three faults found by looking rather than reasoning.** An ended Catch-up's only published Edition
was drawn nowhere — the region skips it and the sidebar excluded it as "the latest" — so it was
unreachable from its own home. And both dialogs opened with their first row focused and tinted: on
the settings panel that row was "Open answering", the one control that cannot be undone, looking
armed.

**Also in this session**: `renameCatchup`, which had never existed, refusing a batch Catch-up
through the same preamble as every other Catch-up-level control; the `/catchups` list reading a
Catch-up's own name instead of its group's, found by a review and then read in the file; and a
`sharp` advisory that was blocking every commit in the repo, patched and installed.

## 2026-09-09 — a wall is not a contact sheet: the photo wall drawn three ways, and he picked the run

`photo-wall` has been a question kind since Catch-ups was built and had never been drawn. It is
the owner's, brief 16: *"we definitely have to add a photo wall for questions where people can
just, I don't know, add photos, but it needs to be modular and work with everything else."* It is
a locked decision and it comes before build phase 8, because the reader is drawn in phase 8 and a
wall changes a page already drawn.

`/lab/catchups/wall`, three shapes, live at 390 and 1512, drawn by one hand. **A run**: one band
the width of the column, every photograph at its own width, moving sideways off the right edge,
one name under each person's set. **A drift**: photographs down the column at three measures, and
which measure a photograph gets is a fact about the photograph rather than a pattern, with the
contributor set at the plate's foot in the margin it leaves. **A stack**: one at a time, the box
tweening to each photograph's own shape, with a rail you can press to jump.

**A grid was not drawn.** Twenty-four photographs in a grid is a contact sheet, and a contact
sheet says these are proofs, pick one. The drift comes closest and stops at pairs.

**The number that decided it, measured at 1512 as the wall's own height.** At two hundred
photographs a run is 353px of page, a stack 666px and a drift 33,469px. The run pays nothing
because it spends the room sideways instead: 7,938px of strip at twenty-four and 64,735px at two
hundred. So the drift is the only one where the size of the wall is the size of the page, which
is both why it feels like a wall and why two hundred breaks it.

**He picked the run**, and ruled on two more things in the same breath. The count line above the
band is deleted: *"delete this random stat"*. And a wall answer is capped at **three**, the same
as any answer, not the six proposed here — which means the answering half of a wall question
costs nothing to build, because the control is the photo strip already on the composer with not
one thing changed. `spec.md` §10.1 had said "the photo strip with a higher cap" and now says
unchanged.

**Six faults found by looking, all fixed before it was called ready.** The heart right-aligned
under a wide frame landed 30px from the next person's bird and read as theirs. A cinnamon scroll
rail was indistinguishable from a question's own 32px cinnamon mark. The drift printed one
person's name twice at two sizes on opposite sides of the column, so a contributor's set became
one justified row with one name, which also took the twenty-four wall from 16,736px to 11,826px.
The drift's margin floated a name in the corner of a 240 by 588 hole, which is brief 31
reappearing inside the shape meant to answer it, so the credit moved to the plate's foot. And the
stack cropped 52% off every portrait, so a tall one now gets narrower rather than shorter and the
box tweens on both axes the way the viewer's does.

**A trap worth keeping: `next/image` cannot fetch anything under `/lab`.** That path requires a
session (`src/proxy.ts`, audit M19) and the optimiser fetches the source server-side with no
cookie, so a file in `public/lab/` answers 307 to it and `/_next/image` answers 400 — while the
same file loads perfectly in a plain `<img>` in the room that owns it. The corpus moved to
`public/images/`.

**A justified row needs no measurement**, and it is the shape behind both the contributor sets and
the portrait pairs: `flex-grow` set to each photograph's ratio makes the widths proportional to the
ratios, and `aspect-ratio` then resolves every height to the same number.

**A per-person cap turns out to be a layout lever, not only a policy.** At the proposed six the
drift ran 116,321px at two hundred photographs; at his three it runs 33,469px, because three each
means most people arrive as a set, a set is one justified row, and a row of three is a third of
the height of three plates. It did not save the drift, but it is worth knowing.

The run ships inside build phase 8 as a transplant. The drift and the stack stay drawable in the
room as the record of why the run won.

---

## 2026-09-09 — the approved features become spec, and the browser ceiling is withdrawn

Run beside his settings session, in `docs/planning/` only, so the paths were disjoint.

**Four new spec sections.** §3.10 a question you answer out loud, §3.11 a question the group votes
on, §3.12 time capsule mode, §3.13 reading before you have written. Three new phases, 12 to 14.

**Two places the spec now disagrees with what S-features proposed, and says so.** The voice answer
is an answer MODE on any text question rather than a question KIND, because the barrier it removes
is typing and typing is the barrier on every question, not on one the Keeper remembered to pick.
And the poll does NOT widen the feed's `PollOption`/`PollVote`: both carry a non-null `postId` and
a required `Post` relation, so widening means two nullable foreign keys and a permanent coupling
for no shared behaviour. A `CatchupPromptOption` table plus one nullable column on `CatchupEntry`
is smaller — and because an entry already carries `@@unique([promptId, authorId])`, one vote per
person is enforced by a constraint that already exists and a voter appears in "who wrote in" with
no new code.

**Phase 11 is corrected**: `CatchupEdition.publishAt` is NOT dropped. A time capsule is a scheduled
publish date and it is the same column.

**One thing is left OPEN rather than decided**, and deliberately. His *"answers are definitely
hidden until you write your own"* does nothing as the app stands — nothing is readable before an
Edition is published anyway. So it is either a confirmation of today or a request for a real
feature, and §3.13 puts both readings down with owner question 22 rather than guessing. This
campaign was burned once by over-reading him, on 2026-09-05, when a dozen marks had turned "if
there's a reason, sure" into a locked decision.

**The track X row's numbers are corrected** from the recon's 603 KB / 2.6s to the measured 223 KB
and 1,333 to 1,809 ms; the older figure was uncompressed.

**And the browser ceiling is withdrawn**, at his instruction: *"nah it can be anything even photos
etc. there's no hanging. it handles 4 sessions sometimes. update whatever told you that."* The rule
— one `chrome-devtools`, one `screenshot-qa` pair, because his Mac had hung — is now dead in the
`/campaign` skill, both audit prompt templates, this campaign's handover and spec, and the
machine-load memory. **What survives is the other half he has never reversed**: usage is spent
deliberately. And one concurrency rule survives on its own merits, because it was never about
memory — `npm run check` still does not run beside `npm run visual`, which caused spurious
whole-page diffs twice on 2026-08-29.

## 2026-09-09 — he rules on every feature, invents the time capsule, and asks for the question library

He went through `features.md` out loud and ruled on all eleven proposals plus the four written up
as not proposed. His words are verbatim in that file's §1 and in the handover's "Owner answers".

**In**: a question you answer out loud (the audio plays back, the transcript from the browser,
which he raised himself); a question the group votes on; a longer question library; and **answers
hidden until you write your own — but a published Edition open to everybody regardless**, which he
reversed from a "considered and not proposed" and which lands inside build phases 7 and 8.

**Out**: the map, a guest question from another batch, and the one-line answer as an enforced cap.
**Parked**: more reactions, anonymous answers, and the emailed issue, which needs a paid Resend
plan. **Open**: then-and-now, which he did not follow and which is now explained plainly.

**He invented time capsule mode**, and it replaces "this time last year" entirely: an Edition
sealed when written and released a year later, a switch in settings, with the library tweaked to
suit. Better than the idea it replaces because it changes what people write rather than what they
are shown.

**A build warning fell out of it.** Phase 11 must NOT drop `CatchupEdition.publishAt` — a time
capsule is a scheduled publish date and it is the same column.

**The question library advice he asked for** is argued from his own data, as he suggested. Ranked
by hearts per answer on the live Edition: the nosiest question won at 6.0 on 112-character answers,
the deepest came last but one on 618-character answers from the fewest people, and the songs
question came last of all. Sixty to eighty questions, six shown at a time, three rules to keep it
short.

**And a note on writing for him**: the first draft opened with an array of category ids and the
word migration, and his first sentence back was "I don't understand what you're even saying."

## 2026-09-09 — the settings get their marks back, and their answers stop hanging

His round-two notes on the rework, verbatim in
`docs/planning/catchups-rework/review-2026-09-09.md` S15 to S18, with a research ask attached:
Apple's menus, Revolut's, and "build something that looks like that but intersecting with our
language and aesthetic. Login is a perfect example of that. And don't copy that UI."

The icons come back, and the two notes that looked contradictory ("kinda liked the icons" against
"I don't like that brown") are one note once the colour protocol is read. Rule 3 allows at most one
mist fill inside a card and never two adjacent; nine `bg-muted` tiles in a column is nine touching,
which is what read as brown. The mark was never the problem, the box behind it was, so the glyph
stays and the fill goes.

Structure comes back too — "it's less approachable than before but with some big bugs solved" —
as three cards with a hairline and no fill. That is the one shape left open: rule 3's own sentence
is "if it needs an edge, it earns a border, not a fill", paper on Float was closed in September when
the Get in touch card was pulled up for warmth climbing the ladder, and three filled groups would be
three adjacent wells. It also happens to be Revolut's recipe on white, hairline and large radius,
depth by outline rather than shadow.

The chooser dialogs are deleted. Rhythm, Reminders and Give everyone longer unfold where they stand,
on the app's own segmented material. Apple is explicit that a disclosure chevron "reveals the next
level in a hierarchy", and three options are not a hierarchy — so the chevron now appears on exactly
two rows, Name and Picture, a disclosure caret on the three that unfold, and nothing at all on the
rows that fire an action, the way iOS Settings draws Sign Out. Give everyone longer gained the
options he asked for: three days, a week, two weeks.

Nothing hangs in the middle of a row any more. A value sits on the second line under its own label,
so the row has two left edges and no floating third column — which also settles the hint, because a
row either has an answer or needs explaining, never both. "Cannot be undone" takes a third line that
only a one-way row ever has, which makes those rows physically taller.

The group head took three tries and the last one is his: outside the card, 15px on the foreground
rather than 13px muted, 24px above and 8px below, aligned to the card's own left edge. And the one
serif word in the list is gone — "why is the Catch-up name the only thing serif in this entire
thing?" It was the type rule read too literally: in that row the name is not being presented, it is
being reported as a value.

`npm run check` 112/112, `npm run visual` 25/25, no baseline moved.

## 2026-09-09 — the settings stop being a list of controls and become a description

Spec 10.3, the gate on build phase 7. He gave notes on the settings list first; they are verbatim
in `docs/planning/catchups-rework/review-2026-09-09.md`, and every one is answered.

Three of them were geometry, so they were measured before anything moved. The sideways scroll he
reported is 4px: the scroll region carried `pr-1` and each row bled 8px past it, so a row ran 426px
wide inside a 414px box. The group heads "were not aligned to anything" because the head carried
`px-2` while the row it heads carries `-mx-2 px-2` -- the head's text landed at 222.7 and every
label under it at 214.7. And the hint truncated at BOTH widths, not only on a phone: "You stop
getting Editions. What you wrote stays. Cannot be undone" wanted 346px in a 341px box on a laptop.

The nine icon tiles are deleted, which was his main gripe, and with them every container in the
panel: no tile, no rule, no card inside the card. The first list was iOS's TOP-LEVEL Settings
grammar transplanted, where each tile is a different app's icon; nine identical beige squares carry
no information. Apple's own answer for settings inside an app is a grouped table with no icons.

What replaced them is the idea that also fixes the batch case. A Catch-up's settings are the
Catch-up described, so "This Catch-up" holds the same three rows for everybody -- Name, Picture,
Rhythm -- and who you are decides which of them open. A row you may not change still states its
answer and has no chevron. A batch Catch-up is therefore not a stub with the Keeper's rows deleted;
it is the same panel with two rows sealed.

Colour appears exactly twice in the whole flow: the words "Cannot be undone" where a row's value
goes, and the fill of the button that does the thing.

Every row opens something, and everything it opens is one of three shapes -- a confirmation, a
chooser, an editor -- written together in one file rather than five times inside five build phases.
The phone sheet says Settings at the top left with an X at the top right, the grabber pill is gone,
and a downward swipe from the top of the list brings it down while anywhere else it still scrolls.

That gesture could not be built on framer's `drag`. The sheet's body IS the scroller, so an
unconditional drag eats every upward flick; and `dragListener={false}` plus `dragControls.start()`
from a pointermove does not work either, because the moment a finger moves on a scrollable box
Chrome takes the gesture and fires `pointercancel`, so the pointermove that would start the drag
never arrives. Measured -- a real touch sequence left the sheet where it was. It reads the touch
events directly, non-passively, and moves the sheet's own motion value.

Two standards the lab itself was breaking are enforced on the way past: a 19px `DialogTitle` where
the material is 16px medium and per-dialog title sizes are forbidden, and the picture picker's two
description levels where the standard allows one. Two bugs fell out of drawing it. The picker goes
three up above the `sm` breakpoint, but the breakpoint is the viewport and the panel is a fixed
width, so on a laptop it drew each photograph 103x41 -- the "colour swatch rather than a picture"
its own comment was written to avoid. And the root layout's `<body>` is `flex flex-col`, where an
auto horizontal margin on a child disables `align-self: stretch`, so the new room sized itself to
its content and collapsed to 526px in a 1512px window.

The list, the sheet and every dialog live in one file. `/lab/catchups/settings` draws it for all
three cases with the confirmations beside it, and the sketches spine's Settings door opens the same
component, so the room and the spine cannot drift.

`npm run check` 112/112. `npm run visual` 25/25, no baseline moved, which is the correct result for
a change entirely under `/lab`.

## 2026-09-09 — S-features: what else an Edition could hold

The second brainstorm, which he has asked for twice: `docs/planning/catchups-rework/features.md`.
One hand, no fan-out — ultracode is allocated to S3, S3b and M1 and this is none of them.

**Why the shortlist can be seven items.** A question's kind is derived from its category and the
categories are a plain array, so a new kind of thing an Edition can hold is one id, one branch, one
answering control and one reading surface. No column, no migration.

**The photo wall is the only non-optional item**: LOCKED since D10, never drawn, and it comes
before build phase 8 because it can change a page that is already drawn. Three shapes are argued —
a run, a drift, a stack — against the rule that a grid is a contact sheet.

**Letterloop parity, eleven rows, one real gap**: the issue arrives in your inbox and ours does
not. He gated email himself on the magazine being good, so it stays gated and is named for
honesty. The cheap gap is the question library, 600+ against our eight categories, and it is no
code at all.

**The signal in the wider space**: every memory-capture product near this one has moved to voice,
on the shared diagnosis that typing is the barrier. And their product is the printed keepsake,
which confirms track M.

Seven proposals with a default of "not unless you say so", four written up as considered and not
proposed, and the session's lean stated in one line. What is not measured is stated too: nobody
opened Letterloop's own published issue.

## 2026-09-09 (track X) — the photograph's shape stops jumping a frame ahead of the dissolve

His, brief 28, on his phone, on a real answer: *"Mohini had these 2 long photos. Eiffel Tower,
swipe left. Statue, swipe left, and now there's a landscape photo and the window size just bounced
into the smaller shape, and it was very jarring. Is that the best way to do it? Is that a polished
way of doing it, by just jankily moving up the window size?"* V1.

**Reproduced on the photographs he was actually looking at.** Entry `cmshic6bo` in "in the loop"
Edition 1 carries three: 1200x1600, 1200x1600, 1288x966. At 390x844 that is 390x520, 390x520,
390x293. The step is a 220ms cross dissolve, but the SHAPE changed on its first frame, so the
picture's top and bottom edges moved 113px inward while the pixels were still fading.

**The carousel behind it already did this right.** `heightAt` in `photo-carousel.tsx` interpolates
the frame across a swipe. The viewer had no equivalent, which is the asymmetry the recon named.

**Both frames now dissolve inside one box that tweens between the two fitted sizes**, on the step's
own curve and duration. Measured per animation frame: 390x520, 394, 325, 308, 297, 294, 390x293 at
217ms. Nothing slides and nothing springs — he settled the step itself in August (*"just have a
simple delightful cross dissolve without any bouncing or other jarring motion"*) and that is
untouched. The only thing that moves now is the shape, which is the thing that used to jump.

**The sizes are learned, not plumbed.** `ViewerImage` carries no dimensions and four callers build
one, so passing them through would be an API change on the feed, letters, the Collection and
Catch-ups for one number. The pre-decode effect already builds an `Image` per neighbour, so it
records what it decoded — the shape is known BEFORE the step that needs it — and the current
photograph records itself on load. An unlearned shape falls back to the whole stage, which is
exactly the old behaviour, and the first box of an opening is set with no tween so opening never
animates.

**It is the shared viewer**, so the feed and the Collection take it too. Checked live at 1440: the
feed's viewer opens, the photograph fits the screen, Escape closes it, zero console errors.

`npm run check` 112/112. `npm run visual` 25/25, no baseline moved — the viewer is not open in any
baseline shot. **V2 and V3 are NOT in this commit and are still open**; see the session log.

## 2026-09-09 (track X) — a photo caption folds at four lines instead of two

His, brief 32, talking himself around twice and landing on a number: *"I don't want photo captions
in catch-ups to have a More and Less button. Let it just show all the text... Actually, you know
what, no, let's keep the More and Less button, but maybe increase it from 2 lines to 3 lines. Or 3
lines to 4 lines. The threshold. Right now it's just 2 lines and then More. And maybe make it 4
lines."* Campaign question 6, defaulted to four on his last word; D38.

**Measured on Mohini's 410-character caption**, which is the longest on the live Edition: at 390 it
shows 90px of 180px, four lines at a 22.475px line height, with More offered. At 1440 the whole
caption is 90px, so it now shows entire and there is no fold at all — which is the change, rather
than one more line of the same truncation.

**One constant, written twice on purpose.** A caption that overflows is a button and one that does
not is a paragraph, and both have to clamp at the same line or "More" appears beside a caption that
was already whole. `CAPTION_CLAMP` keeps the number in one place. Not written inline, because
`line-clamp-N` IS a display utility and Tailwind emits `display: block` after it — the trap build
phase 6 hit, where the two together silently cancel the clamp.

**It is the shared viewer, so this is the feed and the Collection too.** A caption is a caption
wherever the photograph came from, and a per-caller prop would be an API invented to hold one
number. Its own commit, so it can be reverted alone.

`npm run check` 112/112. `npm run visual` 25/25, no baseline moved — the viewer is not open in any
baseline shot.

## 2026-09-09 — the calling card ships, and the bird stays off the green

Follows the room below. He picked the calling card, then took it apart: the boxes' type
hierarchy, the copy button's motion, the batch line, the gaps, and the bird's ring.

**Shipped: the portrait.** `src/components/profile/get-in-touch.tsx` no longer draws tiles. The
bird sits at 72px over the name and "Batch of {year}", then the reach-outs as rows on the panel
itself, one hairline per gap inset past the icon gutter, a copy button per row.

**The bird is on white, never on green.** The canopy band drew first and needed a cream disc
behind the glyph to be visible at all. His objection killed it: *"the birds are different sizes so
it'll look weird on the orange thrush I imagine."* He is right, the 50 glyphs share no common
bounding box. On paper there is no disc and nothing to size. Confirmed on a real fixture whose
seeded species IS an orange bird -- it reads fine, and reads smaller than the kingfisher, which on
white is simply a smaller bird rather than a glyph rattling in a circle.

**Every number traces to something.** Name 20px (h3 rung), batch 12px semibold at 0.12em (the §5
label rung; the 10.5-11px bolds elsewhere are cinnamon kickers, decoration allowed to be small),
row label 13px and value 12.5px both unchanged from the shipped tile, button 14px. Bird top on the
close X's line -- the X does not move, top-right at 16px is the one inset every dialog shares.
Gaps: 24px head to first row, 21px between rows, 20px above the button, 16px to the panel edge.
Inside the head, 8px bird to name and 6px name to batch -- two numbers, not one, because the name
and the batch are one unit and the bird is a separate object above them. One `gap-2` served both
at first, which made bird to name 12px and left the name floating (*"move the name a bit up"*).
Measured identical in the lab room and in the shipped dialog.

**Two of those gaps were holes.** He asked what the whitespace above the email and above the CTA
was for. Measured 34px and 26px inside a 21px rhythm, and neither had a reason.

**The rule departed from.** The name is 20px, so this is now the only dialog title in the app that
is not 16px, against the dialog material's "no per-dialog title sizes". He asked for it and the
reason holds: this title names a subject, not an action, and it is the only one sharing its block
with a 72px portrait. The component header says not to cite it as precedent.

**Copy is new and it is not silent.** `navigator.clipboard.writeText` fails on an insecure origin
and on a denied permission, so a failure raises a toast rather than a tick over nothing.

Seven call sites took the two new props. `person` and `batchYear` are required, not optional: a
fallback would give the app two different contact dialogs, which is the drift the one-material rule
exists to stop.

`npm run check` clean, `npm run visual` 25/25. One thing unchanged and worth knowing: the dialog
still autofocuses its first link, so the top row wears a focus ring on open. It did that before
this rework too; it is more conspicuous now only because it is the one filled-looking thing left.

## 2026-09-09 — four brown boxes on a white card

His, opening: *"can you make the dialog for get in touch more beautiful and visually appealing ...
my main problem is I don't like that brown for the boxes."*

**The brown is a rung inversion.** The Get in touch sheet paints its four contact tiles `--card`
#F5F2EA and floats them on a `--float` #FFFFFF panel. Paper sits BELOW float on the surface
ladder, so the warmth is climbing where DESIGN-SYSTEM.md rule 1 says it must sink. Rule 3 catches
the same tiles again: each carries a fill AND a border where one would have done. So the system's
own answer was never "pick a less brown fill", it was "these should not be boxes".

Two more things the measuring turned up. The bold line in each tile is the LABEL and the quiet one
is the address, and there is no way to copy anything: every row is a `mailto:`/`tel:` link, which
is the wrong verb most of the time.

**`/lab/reach` holds the four ways out**, drawn after he picked the calling card and then asked the
question the first draft could not answer: the bird was sitting on the canopy band and needed a
cream disc to be visible at all. *"the birds are different sizes so it'll look weird on the orange
thrush I imagine."* He is right; the glyphs are not drawn to a common bounding box, so a disc
exposes whichever one under-fills it. Three of the four rooms put the bird on the white body
instead, where there is no disc to size. The fourth keeps the band and drops the bird, so the
choice between charm and green weight is visible rather than argued.

**Front runner: the portrait.** Every number in it traces to something rather than to an eye:

| | value | where it comes from |
|---|---|---|
| name | 20px | h3 on the §5 ladder. The ONE dialog title in the app that is not 16px — see below |
| batch | 12px semibold, 0.12em | the §5 label rung (`0.75rem`, 0.08–0.16em); the 10.5px bolds elsewhere are cinnamon kickers, decoration allowed to be small |
| row label / value | 13px / 12.5px | unchanged from the shipped tile. The container changed, the type ladder did not |
| button | 14px | `text-sm`, every CTA in the app |
| bird top | on the close X's top line | the X is pinned at 16px in every dialog, so the bird moved, not the X |
| head → first row | 24px | no hairline there, so the gap is the only separator; 24 is the group gap the dialog material already names |
| between rows | 21px | 10px of row padding either side of a hairline |
| last row → CTA | 20px | the row rhythm. A filled green pill does not need extra air to stop reading as a fifth row |
| CTA → panel edge | 16px | the dialog's own padding, unchanged |

Both gaps he flagged were real: the head break measured 34px and the CTA gap 26px, against a
21px inter-row rhythm, and neither number had a reason behind it.

**The one rule departed from, on his instruction.** The dialog material says "no per-dialog title
sizes" and every dialog title in the app is 16px. He asked for the name bigger. The reason holds
up: this title is not naming an action, it is the subject of a card, and it is the only dialog
title sharing its block with a 64px portrait. If a second dialog ever wants its own title size,
this is not the precedent to cite.

Also in: the copy button springs on `SPRINGS.snappy` and cross-fades into the tick and back rather
than cutting; "Batch of", never "Class of", which is what the sidebar byline, the auto-joined group
and the directory heading all already say.

Nothing shipped. `src/components/profile/get-in-touch.tsx` is untouched until he picks.

## 2026-09-08 (track X) — the heart's animation was a second late because the tap rebuilt the whole Edition

His, brief 29: *"if I'm on the feed and I click the heart, the heart just becomes red. But if I
click a heart on Mohini's answer, it becomes red and the animation kicks in after the second."*
And on 2026-09-05, correcting the recon's first reading: *"tapping the heart on a catch up taking
longer to react than tapping heart on feed. noticeably longer."*

**`toggleEntryLove` ended both of its paths with `revalidatePath` on the reader route.** That
makes Next rebuild the route's server tree the instant the action resolves, and this route
server-renders every answer in the Edition.

**Measured on "in the loop" Edition 1 (133 answers) at 1440, four taps each way, on the owner's
own answer so `notifyLove` never fires and no member's bell moves:**

| | bytes down the wire | click to response |
|---|---|---|
| with the call | 223 KB | 1,333 to 1,809 ms |
| without it | **1 KB** | 514 to 781 ms |

The remaining half-second is the round trip to Mumbai, which every write pays. The heart itself
paints in 30 to 56 ms and always did: `EntryLoveButton` holds `liked` and `count` in its own state
through `useHeartToggle`, so the rebuilt page was markup nobody read. The four taps left the heart
exactly where it started.

**The feed already knew.** `toggleLike` deliberately has no such call and states the rule in its
own comment, written after audit 2 took the last five out and after that same refresh had been
landing as an occasional scroll-to-top on the heart click: *an action whose result the client
already holds does not revalidate.* `toggleEntryLove` was written later, with the call in it,
twice.

**So the rule is now a test rather than a comment**, `src/lib/heart-revalidate-rule.test.mjs`,
across all four love toggles (the feed's post and comment, the Collection's photograph, the
Catch-up's answer), proved to fail before it was kept. Nothing else on the reader reads a heart
count: `catchups-edition-view.ts` hands each card its opening `loveCount` and the client owns it
from there, and there is no aggregate anywhere on the page.

`npm run check` 112/112. No `npm run visual`: nothing rendered changed, and the reader is not a
route in the suite.

## 2026-09-08 (track X) — the half-centimetre of white space on the right, and it was never the green bar

His, four times over, always on his phone (brief 11, 19, 25, 33): *"the top green bar doesn't even
extend all the way. It's just cut off partway"*, and *"as if catch-ups just rendered completely and
then this extra half a centimetre of white space came in on the right-hand side. And it cut through
the sidebar."*

**It is a pasted Spotify link.** Three answers in the live "in the loop" Edition 1 are one. The
first piece of `https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee?` is 54 characters and 369px
with no break opportunity anywhere in it, and the reader's answer column on a phone is 316px. The
paragraph carried `whitespace-pre-wrap` and nothing beside it, so `overflow-wrap` computed
`normal` and the word simply refused to fit.

**Measured at a true 390x844 with touch emulation, before and after.** The document laid out 414px
wide in a 390px window — 24px, and half a centimetre is 19 — while the sticky green bar stayed
exactly 390. `position: sticky` sizes to its containing block and does not follow a sideways pan,
so the bar ran out where the page kept going. After: 390 against 390, and the paragraph that held
377px of content in a 316px box now holds 316.

**Why the recon could not reproduce it and this could.** It measured without `isMobile`. With
touch emulation Chrome shrinks the layout viewport to the overflowing content, which is what iOS
Safari does; without it, `html { overflow-x: clip }` in globals.css clamps `scrollWidth` and the
page refuses to pan. The recon's conclusion — that it is a phone bug because of the browser, not
because of the width — was right; only its "does not reproduce on this machine" was wrong, and it
was a viewport flag.

**Seven lines, and not one of them is the bar.** Widening the bar would have hidden the pan and
left the page still pannable, which is the same bug with the symptom painted over. `break-words`
went on every element that prints a member's typing: the answer body, the photo-wall caption, the
question heading, the post body's two halves on the feed, a letter's body, and the admin room's
copy of an answer. The feed and letters were never reported and have the identical fault; the
column is wider there, so it takes a longer link.

**The guard is `src/lib/rich-text-wrapping.test.mjs`**, proved to fail before it was kept. The
rule is not "add break-words everywhere" — it is that the handful of elements rendering
`renderRichText` output each carry a break rule, because that is the only text on any page whose
width nobody chose. It reads the enclosing few lines rather than one attribute, because
`comments-section.tsx` had already reached for `[overflow-wrap:anywhere]` on its own and put it on
the parent.

`npm run check` 111/111. `npm run visual` 25/25, no baseline moved: no page that photographs
itself contains a link long enough to have been overflowing.

## 2026-09-08 (later still) — the toast's action button stops being a black pill

His, on the Undo beside "Test was archived": *"sometimes they come with this black thing which is
jarring. it can just say the thing against the white doesn't have to be black. or some other way.
but this doesn't work."*

Sonner's default INVERTS the toast to make its action button -- literally
`color: var(--normal-bg); background: var(--normal-text)` in its own stylesheet -- so on this
app's cream paper every toast with an action carried a black filled pill. App-wide, not a
Catch-ups thing.

It is the word now, in Canopy, on the toast's own paper, which is the shape the quiet affirmative
action already takes everywhere else here (the Archived shelf's Put back, a link inside a card).
28px tall against Sonner's 24, because the design system grows the hit area rather than the ink.
Dark mode takes the leaf the success icon already uses there, since the sidebar green is
unreadable on a dark toast.

One trap, and it cost a round: `.cn-toast` had been sitting in `sonner.tsx` as a hook with no rule
behind it, and adding one at three selectors TIED Sonner's `[data-sonner-toast][data-styled='true']
[data-button]` on specificity and lost on source order, because the library injects its stylesheet
at runtime, after ours. Measured -- the button came back black. Carrying `[data-styled]` too makes
it four and it wins.

## 2026-09-08 (later still) — the picture scrim goes a tenth darker

His, once the list was shipped and he could see the card and the home's header side by side:
*"can you increase the bottom image darkening on both the card and header by 10%."*

One constant, `PICTURE_SCRIM` in `src/lib/catchup-pictures.ts`, and all three stops are scaled
rather than the foot alone -- 0.61 to 0.67, 0.37 to 0.41, 0.085 to 0.094 -- so the curve keeps its
shape and every surface drawing it stays identical. That is the same arithmetic his earlier
correction took in the other direction (*"if the darkening is the same constant, make both less
dark by 15%"*), and it is the reason "both" is one edit rather than two.

No baseline moved: the list's cards are inside the masked band, and the home is still the lab
room's until build phase 7.

## 2026-09-08 (later still) — build phase 6: the list

`/catchups` is the drawing now. `_list.tsx` from `/lab/catchups/sketches` was transplanted
rather than re-derived: the card IS the photograph, 5:2 on a laptop and 16:9 on a phone, two up
from 1180px, the Catch-up's name in the heading face and one line of state written on it over
the shared scrim. No rail, no Fresh off the press, no View, no three dots, no row of birds, no
count of anything, no Edition number. Measured against the room at 1440: the shelf is 1096 wide
starting at x 288, a card is 538 by 216 against the room's 536 by 214 (the two pixels are the
card's own border), and the "Start a Catch-up" pill now right-aligns with the cards instead of
with a rail column that no longer exists. At 390 a card is 350 by 198 against the room's 348 by
196.

Five files deleted rather than restyled: `fresh-off-the-press.tsx`, `filed-away.tsx`,
`your-catchups-card.tsx`, `catchup-card-menu.tsx`, `group-first-guidance.tsx`. All five are
pinned as absences in `batch-catchups.test.mjs`, so a three-dot menu coming back fails the
build.

**The spare slots**, spec 5, decided by him on 2026-09-07 and drawn by nobody until now. The
grid holds four things; Catch-up cards first, the remainder filled with the newest published
Editions. `editionSlots()` is in `catchup-shelf.ts` with a table test: 1 to 3, 2 to 2, 3 to 1, 4
or more to none, and 0 to none because an Edition is only reachable through a membership.

**The Edition cover was drawn twice.** The first version wrote the date onto the photograph
exactly the way a Catch-up card writes its name, and failed his own test for it -- *"just so
it's obvious that they're different types of elements"* -- outright. Three of the five published
Editions on this database carry no photograph at all, so the cover fell back to its Catch-up's
own picture and came out as a paler copy of the card two inches to its left: same picture, same
words in the same corner, with a 2px mark carrying the whole distinction. Looked at, at 1440,
and rebuilt. The cover now has a FOOT: the picture stops short and the date is set on the card's
own paper under it, with the Catch-up's name beside it when the member has more than one. A card
with a caption bar is a different object from a photograph with words on it, at any size and
whatever the picture turns out to be, and it is the shape the home's Earlier Editions covers
already have. It keeps the Catch-up card's outline exactly, so the shelf has no ragged row in
it: the picture takes whatever the foot leaves.

**The read mark is drawn for the first time.** `CatchupEditionRead` has been written since phase
5 and nothing looked at it; `readEditionIds()` is one query for the whole page and the answer is
a set, never a count. It shows as the 2px measure beside the date on a cover: cinnamon while
unread, the page's own hairline once read. Cinnamon is the app's own "there is something here",
which is what the bell wears. Both states were driven live -- the 15 August Edition unread, the
5 September one already marked read by phase 5's own testing.

**Where archiving went when the card menu died.** The drawing has no menu on a card at rest and
architecture 4 replaces it with the phone's swipe-left (his WhatsApp gesture, brief 5). That is
built, with the undo toast, and it was driven with a real touch sequence: a left swipe archives,
a vertical swipe scrolls the page and archives nothing, because `dragDirectionLock` sets
`touch-action: pan-y` itself. But a swipe leaves a mouse and a keyboard with nothing, and on a
batch Catch-up archiving is the ONLY exit there is. So the same action has a second door on a
fine pointer: a control in the card's top right, which is where he said dots belong *"if at
all"* (brief 24), invisible until the card is pointed at or reached with Tab. Verified: focus
lands on it, `:focus-visible` matches, opacity 1. `useCoarsePointer()` picks between them, and
it asks about the pointer rather than the viewport because a 1,024px tablet is a finger and a
1,024px window is not.

Leaving is untouched and was CHECKED rather than assumed: `home/people-panel.tsx` still offers
it to a non-creator on a people Catch-up, so no member is left with no way out between phases 6
and 7.

**Two numbers came from the app rather than from taste.** The card's ratio switches at 500px,
not at the app's `sm`: at 639 the shelf is one column so a card is 599 by 338, and at 640 it is
584 by 235 -- a 103px jump on one pixel of viewport. 500 is where a card stops being
phone-shaped (below it a card is at most 460 wide and the widest phone in portrait is 430), and
the jump there is 74px. And the name clamps to two lines, which is a pressure finding: at the
80-character cap `actions.ts` allows, drawn at 390, the name took four lines, covered the
photograph from 18px below the card's top to its foot, and put its first line above where the
scrim has any ink in it. One trap on the way, worth writing down: `line-clamp-2` IS a display
utility, and Tailwind emits `display: block` after it, so the two together silently cancel the
clamp.

`shortDate` and `dayAndDate` left the lab room for `formatDisplayDateLong` and a new
`formatDayAndDate` in `lib/utils.ts`, both pinned to the valley's own day -- the room's versions
read the server's clock, which is UTC on Vercel and would have printed the wrong day for
anything published between 00:00 and 05:30 IST. The stage line itself is `catchupStageLine()` in
`catchups-core.ts`, pure, with its own cases. It deliberately carries no countdown: that is
`describeEditionStatus`'s job on the page you are already on. "Ended" carries no date because
nothing records when a Catch-up ended, and inventing a column for one line on one card is a
migration phase 6 does not have.

The list's old query that read EVERY member of every group, with no `take`, to draw a
five-avatar cluster -- flagged in phase 4, since a batch group is everyone from a year and grows
on its own -- is deleted rather than bounded. The drawn card has no birds on it, so 39 rows and
0.4ms became 0.

**Cards appear and disappear, and the shelf owns that.** His, once it was on screen: *"can you
have a pretty and thoughtful animation for the archiving of ccatchups basically the appearing and
disappearing of any of those cards on that screen. we need that level of attention to detail
throughout."* Archiving started on the card and that was the wrong altitude twice over: a card
that removes itself cannot animate its own exit, and the Undo in its toast outlives it. So
membership is the shelf's fact now. A card leaves DOWNWARD, 18px and 0.94 over 260ms, because
down is where an archived Catch-up actually goes; `mode="popLayout"` takes it out of the grid's
flow at once so the survivors slide up while it is still fading, and `layout="position"` keeps
the photograph inside untouched. Two numbers came from watching it rather than from taste: the
exit needed its own curve (on the app's default ease-out it was at 21% opacity by 100ms, gone
before it had visibly moved, while the slide took 400ms), and every entrance holds its fade for
140ms because archiving frees a slot, so one cover leaves the cell as another arrives and both at
half strength put two dates legibly on top of each other.

**And a bug he found in it, which was mine.** *"there was one edition showing and when put back an
archived one the edition disappeared the the catch up didn't appear. it just disappeared from the
archived list."* Exactly right. The shelf hides a card optimistically while the server round trip
runs, and nothing ever took the id out again -- so **Put back**, which happens in a different
component at the foot of the page, correctly handed the shelf the Catch-up back and the shelf
went on hiding it, while the Edition cover that had been filling its slot correctly went away.
The optimistic hide now lasts exactly as long as the server takes to disagree with it: a new list
of ids IS the answer, whatever it says. Adjusted during render rather than in an effect, because
an effect paints the wrong frame first and that frame is the bug. Driven through his sequence and
four neighbours of it -- archive, let the toast expire, put back; archive two and put them back
one at a time; archive everything; reload -- and a reload now agrees with the screen in every one.

**A real hole in the visual mask, found while chasing a diff.** `/catchups` is masked past its
header by marking the first run of elements that starts clear of it. The grid and the Archived row
were two siblings, so they were marked as two boxes, and the 8px between them was comparing live
page background on every run. One wrapper, one box, no seam. A suite that cries wolf is worse than
no suite, which is what its own docblock says.

The swipe panel behind a card is Canopy rather than cinnamon, and that is a rule rather than a
preference: cinnamon means one-way in this app, every control that cannot be undone wears it, and
archiving is undoable from the toast before your thumb has left the screen.

`npm run check` 110/110. `npm run visual` 25/25 with one baseline moved, read first: the desktop
`/catchups` header, where the CTA travels 332px right to sit flush with the shelf.

## 2026-09-08 (later) — the Catch-up settings dialog loses its rules

His question, and the answer is yes: *"it added a separating line between each line. iOS doesn't
do it that way. do we really have to do it that way?"* The dialog is
`keeper-settings-dialog.tsx`, the only dialog in the app carrying more than one `border-t` — one
hairline above **Pause this Catch-up**, another between Pause and **End this Catch-up**.

Both are gone; the gap does the work instead. 24px above the pair, 12px inside it, measured back
at 1440 and 390. The dialog is 22px shorter.

The line rule was real, and it was transplanted from the wrong place. DESIGN-SYSTEM.md's menu
section (2026-08-29) puts a `DropdownMenuSeparator` over a destructive item and states its own
reason: **the gap is the warning**. A menu row is flush against its neighbours, so a line is the
only gap there is. A dialog row already has 16px around it and both of these rows are outlined
pills — the hairline was a third horizontal edge inside a 33px space that already held two button
borders. Applying the rule's REASON removes the rule's mechanism.

He is also right about iOS specifically, and in a way worth writing down: iOS draws hairlines
BETWEEN rows inside one grouped container, inset from the leading edge, and separates the groups
themselves with whitespace. It never draws a full-bleed line between two standalone buttons. Both
of ours were the second thing. That distinction is now a bullet in the Dialogs section, so the
next session reads it before re-adding a border.

`npm run check` green, `npm run visual` 25/25 — the dialog is behind a click, so no baseline moved.

## 2026-09-08 — the six migrations run, and Groups turns out not to be a feature

The queue that had been waiting on a deploy since 2026-09-07 is empty. Confirmed first, with the
test the previous session left rather than by looking at the site and calling it healthy: zero of
the 21 landing-page chunks contain `prefers-reduced-motion: reduce`. The two hits for the bare
string are Sonner's stylesheet and the `motion` library's own `initPrefersReducedMotion`, which
asks for `"(prefers-reduced-motion)"` with no `: reduce` — both third-party, both inconclusive by
design, which is why the agreed answer was the exact string and its ABSENCE. `fabd7042` is new in
this push, so the test is about this deploy and not an earlier one.

Then all six, against both Supabase projects. **61** bell links rewritten from `/catchups/round/`
to `/catchups/edition/`, **17** `ContentView` rows merged and re-kinded; seven unused indexes;
`OutboundEmail.bounceKind` (0 rows); `Image.greyscale` (3 true of 53, recomputable);
`Photo.area` and `Photo.freeTags` with their trigram indexes (0 of 1,749 photographs); and
`Post.groupId`, `Group.description`, `Group.coverImage`. Every file carries a guard that refuses
if a row has picked up a value, and every guard passed.

**`Group.description` was the one open decision and his answer closed it sideways.** Asked in
plain English — 11 of 18 groups, every value the sentence signup auto-writes, nothing has ever
read it — he said *"wtf is a group we don't have them"*, then *"what if we just delete groups
entirely?"* Both are the right instinct and the answer to the second is no: **a Group is not a
feature, it is the invisible membership container under a Catch-up.** The browsable Groups
feature was removed months ago; the table survived carrying 105 memberships, all six Catch-ups,
and the 11 batch groups keyed on `batchYear @unique` that build phase 4 creates a Catch-up for.
Deleting it deletes who is in what. The *name* is the residue, not the object — worth a rename
one day, not a deletion, and `spec.md` §14 already fences that refactor out of this campaign.

**Run against the demo too, which contradicts what the fix-prompt said, deliberately.** That file
said production only, because the demo is serving an old build. His instruction was later and
explicit: *"run all six against BOTH Supabase projects."* The demo was already 500ing on every
data route before any of this and still is — the old-build bug he deferred (*"let it fail"*) — so
the drops changed nothing about its health, and when it is redeployed the columns will be
correctly absent rather than drifted.

**Verified after, and this is the part that matters**, because a bad column drop shows up as every
page 500ing at once, not as an error in the file: `check.mjs` green 107/107 and
`npm run verify:crawl` **21/21 at 200** signed in, against the migrated database.

## 2026-09-08 — build phase 2: the clock

Three things, three commits, `spec.md` §3.3. Nothing here is drawn: the surfaces are phases 6
to 8. This is the mechanism underneath them.

**`preparing` is deleted.** His, N88: *"Why are we preparing? ... why doesn't it just publish
immediately? Is there a reason we have to have a separate preparing section? I can't just
publish at midnight and the deadline is done."* It was a hard-coded 24-hour hold between
answers closing and the Edition coming out, during which nobody — Keeper included — could read
a word. Answering now goes straight to published in ONE transition, which fixes a second thing
nobody had named: the close used to be silent and the bell came a day later, so the two could
come apart. They are the same write now.

Gone: `PREPARING_HOLD_HOURS`, `preparingPatch`, `publishNow` and its button, the `publishAt`
field on the Prisma model, the branch in `computeStatus`, `planNextAction`, `STATUS_ORDER`,
`overdueEditionWhere`, the admin chip, the index's sort priority, and the preparing screens on
the home and the reader. `closeAndPrepare` is `closeAndPublish`.

**Two files the spec listed for deletion are still here, deliberately.** `almost-ready.tsx` is
the pre-migration P2021 holding scene on six routes; only its second job, standing in for
`preparing`, is gone, and its docblock now says not to give it a third. `not-yet-published.tsx`
was never the preparing screen — its own docblock said so — it covers draft, collecting and
answering deep links, all three still reachable. Deleting it would dead-end every link shared
while an Edition is still taking questions.

**Every deadline lands on a civil hour: 07:00 IST.** A deadline was `addDays(now, N)`, so it
inherited whatever minute the phase happened to open at, and an Edition came out at that minute
forever after. The hour is read off the app, not chosen: `vercel.json` runs
`/api/catchups/tick` at 02:00 UTC, which is 07:30 IST, so a 07:00 IST deadline is always swept
by that morning's cron **within thirty minutes**. A test asserts that gap against `vercel.json`
itself, so moving the cron fails the build.

`snapToDeadlineHour` rounds forward only and is idempotent — a window is never shorter than its
nominal length, and an extension anchored on a stored deadline cannot walk it forward a day per
call. It costs up to one extra day per window, which is why the reminder bucket now seeds at 8
on a seven-day window rather than 7. Applied in `answeringPatch`, `extendPhasePatch`,
`extendPatch`, `questionsExtendPatch`, the create path, the dormant revive and
`openNextEdition`.

**Resume is the one deadline that does not snap**, and the reason is written where a later
session would otherwise "finish" the rule: a resume credits back exactly the time the freeze
took, and rounding forward hands back time nobody was owed. The cost is bounded — a resumed
deadline sits at an odd minute, and a deadline is a threshold rather than a scheduled moment,
so the Edition still lands on the next tick or the next page view.

**"Start the next Edition now" is added — the control nobody had.** He found it himself:
*"literally after publishing I can't start a new round?!?! I have to wait for two weeks minimum
... there's no control for that?? I have to create ANOTHER test catch up."* Confirmed in the
code before it was written: the next Edition opened on the clock alone.

`openNextEdition` is now one function shared by the clock and the Keeper's hand, so a
hand-started Edition is the same object as a scheduled one down to the notification, and the
compare-and-swap on `nextOpensAt` is what stops two Keepers on two stale tabs minting two
Editions. It is ONE-WAY, so the accident rule governs it (architecture §6, N30): the card sits
in the rail with a cinnamon dot and confirms, never beside the Edition it would replace.

Two numbers came out of measuring rather than looking. The dot is in a 16px box because a bare
6px dot in the same `gap-2` row started its label **30px** from the card edge against the three
sibling cards' **40px** — a ten-pixel step down the rail. And "Cannot be undone." is its own
row in the confirmation rather than the tail of a sentence, which is `spec.md` §7's rule; as
one string it landed on its own line only because the measure happened to break there.

**Proved on the app, not asserted.** Clicked through on `[Recon] the happy path`: Edition 2
opened `collecting` with `questionsCloseAt` at **2026-09-12 07:00 IST**, against Edition 1's
inherited **22:20**. `nextOpensAt` cleared, one notification written, the owner excluded from
it. `npm run check` green, `npm run visual` 25/25 with no baseline moved.

**The migration is a no-op backstop and was applied to both projects.**
`2026-09-08-preparing-becomes-published.sql` publishes any Edition caught mid-hold, dated when
it was always going to come out. Counted first, which is the procedure the file now carries:
production held 2 collecting and 5 published and nothing preparing, the demo held no Editions
at all, and neither could grow one before the deploy because `preparing` is only reachable from
`answering` and production has no answering Edition. **The notification is the part that is
easy to miss** — `notifyPublished` fires from the action, not the database, so a row published
by SQL sends nobody anything. Zero rows, so nothing was owed.

`publishAt` the COLUMN is not dropped. This commit only stops Prisma naming it, which is what
makes the drop safe; the drop, and `@@index([status, publishAt])` with it, wait for phase 11.

## 2026-09-08 — the six migrations stay unrun, and why

He pushed and said Vercel was done. Two checks ran before anything irreversible, and one failed.

**The demo is serving an old build.** The new one renamed `/catchups/round` to `/catchups/edition`;
on `demo.rishivalley.space` the old path exists and 500s while the new one 404s, which is the
reverse of a current build. Separately the demo 500s on every data route — feed, Collection,
directory, letters, Catch-ups — while its database is healthy (every column present, the guard
script 15/15, 40 people seeded), so it is the deployed app. Filed in `bugs.md`. **He deferred it:**
*"honestly forget the demo site for now. i'll fix that later after launch. let it fail."*

**Production could not be positively confirmed**, which is the reason nothing was dropped. Every
route redirects to login before routing, so no status code distinguishes the builds. It looks
healthy; that is not proof, and these are `DROP`s on members' data with no undo.

The close-out now carries the test the next session should use: fetch the landing page, pull its
chunk URLs, grep them for `prefers-reduced-motion`. Every check was removed in `fabd7042`, one of
them in the landing footer's bird, so its **absence** proves the new build is live. Its presence
proves nothing — the `motion` library ships the same string.

Also still open: `Group.description`, 11 of 18 rows non-null, left out of the groups drop because he
was asked about a different column and has not answered.

## 2026-09-08 — Round becomes Edition, build phase 1

His, 2026-09-07: *"let's not use Round or Issue let's call them additions"* — then, a minute
later, *"Editions not additions."* The database has said `CatchupEdition` since the day it was
written; everything above it said Round. One mechanical pass, no behaviour change, which is
`spec.md` §2 and the first of the rework's eleven phases.

`/catchups/round/[editionId]` is now `/catchups/edition/[editionId]`,
`src/components/catchups/round/` is `edition/`, `catchups-round-view.ts` is
`catchups-edition-view.ts`, and the types moved with them: `RoundEntry`, `RoundMasthead`,
`RoundTocRail`, `PublishedRoundView`, `openNextRoundIfDue`, `SketchRound`, `ShelfRound`,
`RoundState` and the rest. `npm run visual` is 25/25 with no baseline moved, which is the
proof that a rename is all this was.

**`roundLabel()` is deleted rather than renamed**, and that is the one place phase 1 had to
choose words. An Edition is identified by its DATE (N92: *"let's ditch the round 1 ... The
round number is irrelevant"*), so its five call sites each lost a number:

| Surface | Was | Is |
|---|---|---|
| the reader's masthead | `Round 1 · Published 5 September 2026` | `Published 5 September 2026` |
| the home's published tile | `Round 1 is out.` | `The new Edition is out.` |
| the home's rail | `Round 1`, with a small grey date at the right | the full date **as the row's title** |
| the rail's label | `Published issues` | `Published Editions` |
| Fresh off the press | `Round 1 · [Recon] the happy path` | the group name (the date was already there) |
| a card's status chip | `Round 4 published` | `Published` |
| the deep-link guard | `Round 4 is not out yet` | `This Edition is not out yet` |
| the answering page's header | `Round 4` | `Answering` |

The admin room still prints `Edition 3`, in three places, and that is a decision rather than
an oversight: there the number is the row's actual key (`@@unique([catchupId, number])`), an
unpublished Edition has no date to go by, and §7's copy rule is about what members read. Put to
him rather than assumed, and confirmed the same day: *"admin room can keep printing number."*
All three sites carry a comment saying it is deliberate, and `spec.md` §7 now states the
exception beside the rule -- otherwise a later phase tidies the rename by taking them out.

**Two stored strings say "round" and no amount of renaming in TypeScript reaches them.**
`Notification.link` holds 61 rows pointing at `/catchups/round/<id>`, and `ContentView.kind`
holds 17 rows of reader opens that `admin-analytics.ts` reads back with a raw
`WHERE kind = 'round'`. `2026-09-08-round-becomes-edition.sql` rewrites both, idempotently.

**It has NOT been applied, and that is deliberate.** Running it before this commit deploys
would point 61 live bell links at a route the running build does not have — a 404 for seventy
members, for however long the tree sits uncommitted. It is the same ordering rule §3 states
for a column drop, and for the same reason: one database serves production and local dev. It
runs against both Supabase projects the moment Vercel finishes deploying. The demo's counts
are 0 and 0.

The other half of the move is permanent: `src/app/(main)/catchups/round/[editionId]/page.tsx`
is now a `permanentRedirect`, verified as a 308. The spec asks for both, not either — the
migration fixes the bell, the redirect fixes anything already shared, bookmarked or sitting in
an email, and a Catch-up is a keepsake people come back to years later.

**What a 288-identifier sed pass gets wrong, so the next mechanical rename expects it.** Two
categories, both caught by reading the diff rather than by any gate:

- **The word "round" is not always the noun.** `"How often a Round comes round"` became
  `"comes edition"` in the lab's settings list; `daysLeftUntil: rounds up` became `editions
  up`; `round trip` became `edition trip` in three files; the guide's opening line told every
  member that a Catch-up *"comes edition on a schedule."* Four of those were live copy.
- **His words are quoted all over this codebase and they are not ours to edit.** Nine of his
  verbatim sentences were silently rewritten — *"let's ditch the round 1"* became *"the
  edition 1"*, *"Can't control who's in the catch up once the question round has started"*
  became *"question edition"*. Every one is restored. A quoted paragraph is evidence; a pass
  that edits it destroys the record of what he actually said.

Also swept: the `Issue` noun, which he rejected in the same breath as Round. `PublishedIssue`
is `PublishedEditionContents`, and the guide no longer collects answers *"into one issue."*

`docs/spec/catchups.md` still describes the old route. Phase 11 rewrites it to describe what
shipped; half-rewriting it now would leave a document claiming things that are not true.

Gate 107/107, seven green. `npm run visual` 25/25.

## 2026-09-08 — the design lab leaves the demo's build, and only the demo's

Refactor audit 2, rows G1 and G7, and the owner's answer to question 23: **"8 remove it from the
demo."** His own site keeps the lab; the public demo stops carrying it.

**The mechanism is one line of config and 47 renamed files.** Every room is now `page.lab.tsx`
rather than `page.tsx`, and `next.config.ts` puts `"lab.tsx"` on `pageExtensions` for every build
except one with `DEMO_MODE=1` in its environment — the env var the demo's second Vercel project
already sets, so nothing new was invented. `lab-01` named the one thing that would kill this option:
whether Turbopack honours a multi-dot `pageExtensions` in the App Router. It does. A full build
lists all 47 lab routes; a `DEMO_MODE=1` build lists none.

**Measured on cold paired builds of the same commit**, this Mac at load average 9-11:

| | with the lab | demo build | delta |
|---|---|---|---|
| App routes | 120 | 73 | −47 |
| `.next/server/app` | 11,760 KB | 7,568 KB | −4,192 KB |
| `.next/static/chunks` | 7,324 KB | 4,412 KB | −2,912 KB |
| `.next/static/media` | 3,040 KB, 72 woff2 | 256 KB, 9 woff2 | −2,784 KB, −63 fonts |
| Turbopack compile | 34.1 s | 21.8 s | −12.3 s |
| TypeScript | 36.0 s | 29.9 s | −6.1 s |
| Static pages | 98 | 57 | −41 |

**The 63 font files are `lab-04`, and they were verified rather than believed**: `next/font/google`
self-hosts at build time, so with no page importing `/lab/type`'s `_fonts.ts` the demo build simply
stops fetching nine families from Google before it can finish. Nothing outside those two rooms
imports either font file.

**One audit number is honestly overstated, and it is the headline one.** `bundle-build-07` promised
~4-6 s on a warm build. With each configuration's own Turbopack cache in place and no source change,
the two builds are **16 s and 15 s**. Vercel restores `.next/cache` between deploys, so a real demo
deploy sits somewhere between that and the cold pair, nearer the warm end. The artifact saving,
−9,888 KB, is unconditional; the seconds are not.

**Why the demo only.** `/lab/collection` is the Collection rework's test fixture, because the real
`/collection` holds two photographs that both say "asdf". Two committed Playwright suites drive it,
and `verify:crawl`, `dev:centroid` and the two `apple-edge` scripts all reach lab routes. None of
them runs against a demo build, which is exactly why the demo-only form is safe and a main-build
exclusion is not.

**`scripts/qa/lab-audit.mjs` learned the new name and then learned to enforce it.** It now fails on
a lab page called `page.tsx` and on a non-lab page called `page.lab.tsx` — both proved by renaming a
real file and watching the gate go red, then putting it back. Without that, a new room named
`page.tsx` would pass every existing check and quietly ship to a deployment where `/lab` is closed
and nobody can open it.

**`layout.tsx` and `loading.tsx` were deliberately not renamed**, against `lab-01`'s instruction. A
layout with no page beneath it never enters the demo's route tree, so the rename buys nothing, and
leaving them alone keeps `loading-boundary-rule.test.mjs` and the M19 admin-gate greps looking at
the filenames they expect.

The demo's three layers were re-proved on the real demo database, not just in theory:
`src/lib/demo.test.mjs` 22/22 and `npx tsx scripts/demo/verify-guard.mts` 15 passed, 0 failed.

## 2026-09-08 — a closed audit's working notes go to git history

Refactor audit 2, row `docs-01`, and the rule the owner agreed in question 21: when an audit
closes, its working notes go and a pointer stays. He asked for it this session — *"7 just do this
in this sesion"*. Bug audit 1 set the shape in August; refactor audit 1 had kept everything.

**Gone: `docs/audit-fix/2026-08-25-refactor-audit-1/work/`, 72 files and 1,866,717 bytes** —
54.5 % of `docs/` by weight for a campaign that closed on 2026-08-27. `report.md` and
`fix-prompt.md` stay, because they are the record `docs/audit-fix/README.md` promises and
`CLAUDE.md` points at.

**The part that is not free, and the reason this was a question rather than a `git rm`.** The two
surviving files cite `work/` constantly: **20 lines, not the 13 the audit counted** — nine in
`report.md`, eleven in `fix-prompt.md`. Deleting the folder without touching them would have
manufactured 20 dead paths inside the record that was kept, which is the exact rot `docs-08` is
about. Each file now opens with a note saying the folder is in git history, giving the
`git show <sha>:<path>` form for reading one and the `git log --diff-filter=D` form for finding the
removal, and stating that every `work/…` path below it is a path in history. That is one banner
rather than twenty inline repetitions, which keeps the record readable; the citations themselves
still name the file a reader wants, which is the useful half of them.

Two sentences did need rewriting rather than covering, because they asserted the opposite of what
is now true: session 10 and the close-out both recorded that *"bug audit 2 kept its `work/` after
closing, so this one does too."* Both now carry the date that superseded them.

`docs/audit-fix/README.md` gained the rule itself, so the next audit to close knows what survives
and knows that the citation rewrite ships in the same commit.

**Not touched: refactor audit 2's own `work/` folder.** That campaign is still running, and
archiving it is its own close-out question.

## 2026-09-08 — the demo photograph importer that never imported a photograph

Refactor audit 2, row D10 (`lib-core-config-04`), parked at the close because he had never actually
been asked about it. Asked directly, he said **"2 delete it"**.

A 200-line script read a `demo-photos/` folder at the repo root, encoded each image and regenerated
`src/lib/demo-seed/photos.generated.ts`, which the seeder merged ahead of the six hand-written
banyan framings. **The generated file was `[]` for its entire life** — one commit in its history,
the day it was created — so the merge at `seed.ts:313` had always been `[...[], ...DEMO_PHOTOS]`.
Its documented working folder also broke the closed-root rule, and its ignore line went with it.

Gone: the script, the generated file, the import, the merge, the ledger row, the ignore line, and
the section of `docs/spec/demo.md` that told you to run it. The spec now says plainly that filling
the demo's Collection means writing an importer that works rather than reviving this one.

## 2026-09-08 — a download you can actually open

The owner: *"when I download images from places it comes as webp. people can't really use that. it
has to be jpg or png no."* He is right, and it had been true since the viewer shipped. Everything
this app stores is WebP, and the Download button saved the stored bytes — so an alumnus who wanted a
print of 1978 got `dw8j9tcpcln8puf1mjrqj3rt.webp`, which older Photoshop, Preview's print dialog and
most print shops in India refuse to open.

**JPEG, not the PNG he asked for first, and the numbers are why.** Measured on three real archive
photographs before deciding: 6000x4000 is 3.9MB as JPEG q92 and **43.5MB as PNG**; 3456x4608 is
2.7MB against 20.4MB. Eight to eleven times the traffic per press, buying nothing — what PNG would
losslessly preserve is a WebP that was already lossy, so it can only store this file's existing
compression artefacts perfectly. He had said "prefer png but if it increases my costs a lot then no
need"; it does, so it did not.

`GET /api/photo/download` re-encodes on demand and stores nothing. Full resolution, unresized.
`.keepExif()` carries the taken-date through, which is the whole point of having kept it
(2026-09-01): the file lands in a classmate's photo app under the right year instead of under today.
Verified against a real 6000x4000 photograph — stored WebP dated 2022-09, saved JPEG dated 2022-09,
same dimensions.

**The response is streamed, and that is not an optimisation.** Vercel's 4.5MB cap is on the response
body as well as the request — everyone here knew the request half, because presigned uploads exist
to dodge it. The largest photograph in this Collection is 40 megapixels; a buffered route would have
413'd on exactly the photographs that matter most and worked fine on everything else. Streaming is
Vercel's own documented exemption. Now a `docs/TRAPS.md` entry, because the next route handing back
image bytes will have the same shape.

Three things the change picked up on the way:

- **The filename.** It was the object key. It is now "Rishi Valley 1978 Sports day.jpg", built from
  the caption and the taken-date. Set through the anchor's `download` attribute rather than a
  `Content-Disposition` header, so a member-written caption never reaches a header;
  `photo-save-name.test.mjs` pins the extension replacement (`photo.webp.jpg` is the naive fix and
  is no better than what it replaced), the length cut, and a caption that tries to be a path.
- **A busy state.** A 24-megapixel scan is around six seconds end to end, and a button that looks
  idle for six seconds gets pressed again — spending the member's own hourly allowance on the same
  file. Spinner in the same 40px box, disabled while in flight, verified at 1440x900 and 390x844.
- **The gate.** Session plus a new `photoDownloads` meter, 60/hour. Not about the bytes: the stored
  object was always publicly fetchable off R2. It bounds a script pointed at the converter, which is
  the one read path in this app that costs real CPU. `keyForUrl` does the input check, so it cannot
  be aimed off-host — verified: off-host, traversal and unknown-root URLs all 400, signed out 401.

107/107 tests, `npm run visual` green.

## 2026-09-08 — nothing checks the reduce-motion setting any more

Three shipped files still gated on the OS reduce-motion preference, all written before the owner
ruled on it. Asked at the campaign's close whether they should go too, he said **"make them animate
for everybody"**, so they did:

- `landing/footer-hoopoe.tsx` argued in its own docblock that it was a deliberate scoped exception,
  and stood the bird down to a static perch. The state, its `matchMedia` effect, its ref, the
  `blocked` clause and the flattened bob pose are all gone.
- `mascot/moments/not-found-stage.tsx` teleported the bird to a click instead of arcing to it.
- `landing/showcase-shot.tsx` dropped its parallax transform.

DESIGN-SYSTEM §7 now says **zero** shipped files check it, and makes the count the rule: a grep for
`prefers-reduced-motion` outside a comment returning a hit is a regression, not a new exception.
The one remaining mention is `motion.tsx`'s own line saying it must never be wired up.

His reasoning, from 2026-09-07: *"I know these people. they'd want to see these fun things. don't
make anything boring because they have rduced motion on."*

107/107 tests, `npm run visual` 25/25.

## 2026-09-08 — the second heart you press in the Collection

The owner, on an S23 with the app installed: *"I tried to like a photo in collection and though I
get the celebration with the heart, the heart didn't fill in. when I tried on another it worked. but
obviously it should always work not only sometimes."*

**It was the in-flight guard, and it was a page-wide lock.** `useHeartToggle` refuses a second tap
while the first is still in the air — that is audit C-010/C-178, and it is right. But it kept that
fact in one boolean per hook INSTANCE. For four of the five hearts those are the same thing: a post
card, a comment row, a letter and a Catch-up answer each draw one heart and each hold their own
hook. The Collection is the fifth and it is shaped differently — the heart lives in the full-screen
viewer, the viewer walks the whole river, and `collection-client.tsx` holds a single hook for the
archive. So a tap on any photograph while another photograph's toggle was still in the air was
dropped. Not queued, not retried: returned on at line one, before any request was made.

And it was silent in the worst way, because `LoveButton` animates on **press**, not on the answer.
The flecks flew and the pop played and the heart stayed empty — which is exactly the two sentences
above, in that order.

**Measured before it was fixed and after.** chrome-devtools at 390x844 on Slow 3G, signed in as
Jerry Maguire: heart photograph A, step to B, heart B while A is still going. Before — B reads
`aria-pressed="false"` for ever and the page made **one** POST for two taps. After — B fills and
stays filled, and the page makes **two**. The control (tapping B alone, nothing in flight) passed
both times, which is why it "worked on another one".

**The fix is per subject.** `busy` is a `Set<string>` and `fire()` takes `{ subject }`; the action
is handed that subject back, so `togglePhotoLove` takes the id from the tap that fired it rather
than from a `loveTarget` ref the page had to keep beside the hook. That ref is gone. Callers that
pass nothing share the key `""`, which is byte-for-byte the old behaviour and correct for them.

`heart.test.mjs` pins both halves — the `Set` in the hook, and the Collection actually passing
`{ subject: photo.id }` — because the boolean version passed every test in that file. All seven
gates green. No pixels moved, so no baselines did either.

## 2026-09-08 — refactor audit 2: eleven units, and the close-out

The campaign ran unattended from the owner's 28 answers to a close. **Phases A, B, C, D and H are
DONE; E, F and G are PARTIAL with their remaining rows named on the board.** All seven `npm run
check` gates green — the shape-and-colour audit had been warning for weeks and is clean — plus
`npm run visual` 25/25 and `npm run verify:crawl` 21/21 at runtime.

Eleven worker units, each one verified here rather than believed: commit stats read, the riskiest
diff read line by line, gates re-run, one factual claim per row checked against the file, and two
security tripwires broken deliberately to prove they still fire.

**Seven defects came out of that verification rather than out of the audit**, and they are the
reason the protocol says a worker's report is a claim. A three-line fix had truncated `progress.md`
by 580 lines and destroyed five sessions' history. `npm run screenshot` printed "Screenshot saved"
while writing a blank frame of a page that never loaded. The visual suite was going red for a
database write. Two parameters were wider than any caller needed, one of them admitting `role` and
`credentialVersion` on a path reached from sign-up. Two "dead" props were alive in the lab. A
finding's proposed filename was already a live Prisma module. And one row's stated risk was wrong in
a way that would have reddened the build.

Nothing was pushed, and no `DROP` ran: five migration files sit written and unrun, with the commands
in the close-out for the owner. Nine questions are left, each with a default, answerable in one line.

## 2026-09-08 — the documentation pass: eleven documents that described a different app

Phase F's second unit, and the campaign's last. Eleven documents, six commits, **−540 lines net**,
and not one of them a line of product code.

**Every number in this session was counted, not copied from the finding.** That was the standing
instruction and it earned itself three times. The audit said `admin.md`'s section map was two rooms
short of eleven routes; `ls src/app/(main)/admin` says **fourteen page routes across eleven
sections**, and `admin-nav.ts` is the one source both the rail and the Overview read. The audit said
the test suite was 74 files in one document and 25+ in another; it is **106**. The audit said the
visual suite was eleven routes with four masked; `ROUTES` holds **twelve** and **six** carry
`live:`. A pass that had trusted any of those three would have replaced one wrong number with
another.

**The thing three specs had in common, and it is worth a rule.** `letters.md`, `media.md` and
`directory.md` each carried a supersession banner over a body nobody had removed, so the file read
two ways at once and only a careful reader avoided the wrong one. `media.md`'s dead sections had
been printing underneath their own tombstones since August. **A tombstone is not a delete** — and
worse, **a banner is itself a dated claim and rots exactly like the body it annotates**:
`directory.md`'s said the `City`/`HouseYear`/`ProfileTag` schema was "a live, unimplemented plan",
which was true when written and is now three shipped features under other names
(`Place`/`UserPlace`, `User.houses`, `User.professionTags`). `letters.md`'s banner named three
Catch-up models — `CatchupIssue`/`CatchupQuestion`/`CatchupAnswer` — that `catchups.md` §6 says
outright do not exist. That file was 430 lines of which ~300 specified Roundups: a Groups feature in
a product with no Groups, a `datasource provider = "sqlite"` three stack generations old, and a
Render Cron tick never built. It is 174 lines now. The rule is in `docs/README.md`: date the claim
when you write a banner.

**The map that polices drift had drifted.** `docs/README.md` opens by promising every path was
verified against disk, and had not been touched since the day it said so while eight files landed
under it. It said `docs/spec/` holds "**Exactly**" twelve files and omitted `guide.md` and
`hand-run-passes.md` — the second of which `CLAUDE.md` marks in bold as read-before-working, so a
session trusting the word "Exactly" would never open it. It named four files in `docs/planning/`,
where there are thirty-seven. And it never listed `TRAPS.md`, `OPERATIONS.md` or `SECURITY.md` at
all. Rewritten from `ls`.

**Where a count kept rotting, the count was deleted rather than corrected.** Audit 1 fixed "10
routes x 2" to 11; ten days later it was 12. So `OPERATIONS.md` and `CLAUDE.md` now say "one line
per route in `ROUTES`, each with its reason" and the two test-file counts became "every
`*.test.mjs` the repo tracks". The two documents also disagreed on how long the visual suite takes
— 80 seconds against 50 — so both numbers are gone. What was *added* is the thing neither said:
masking `/collection` and its class half on 2026-08-29 and 09-02 cost the one route that watched
image sizing, and the class empty state is now photographed nowhere.

**`visual.spec.ts`'s own comment was the stalest of the three**, which matters because it is the
source the two documents quote. Ninety lines below a `ROUTES` array holding six `live:` entries, its
`LIVE ROUTES` block still read "Four routes photograph a database" and "`/collection` is
deliberately NOT in this list". Corrected in the same commit as the documents that quote it.

**Six of `scripts/README.md`'s ledger lines had stopped being true.** The `check` row omitted `deps`
and `security`, gates since 2026-09-02 whose whole point was to stop being CI-only.
`hoopoe-zoom-probe` pointed at `bugs.md` **#14**, which is now Vercel environment duplicates; the
zoom bug is **#17** and its cause is known to be Safari. `local-base-url.mjs` was described as "finds
which port the dev server is on" when it is the loopback and same-origin guard that stops an admin
cookie being minted against a non-local origin — the one helper in the folder doing security work,
undersold in prose. **A trap found while fixing it**: `scripts-ledger.test.mjs`'s second test walks
every backticked file-shaped name in that README and demands it exist under `scripts/`, so naming
`playwright.config.ts` in a sentence reds the build. Describe non-`scripts/` files in words.

**The dead-path sweep was 54 real mentions in a field of 94, and telling them apart is the work.**
About forty are deliberate "this was deleted, it lives in git history" pointers, and deleting those
is the failure mode. Each was opened. `guide.md` names `src/components/tour/` on purpose — the
sentence is about the tour being gone. `README.md`'s `public/uploads/` is true: the dev filesystem
driver writes there, the folder just does not exist until somebody uploads locally. What was
repointed: the `UserAvatar` that became `BirdAvatar`, the whole `src/app/preview/` tree that became
`/lab`, `src/lib/motion.ts` + `src/components/motion/` that became one
`src/components/common/motion.tsx`, `decade-rail.tsx` that counts in years now, and the crop room's
two helpers that were folded into `src/lib/photo-layout.ts`. Where a plan's file inventory was the
*record of a swap* rather than a map — `avatars.md` §8, `profile.md`'s grounding list — it says so
now instead of reading as current.

**Two campaign documents were each printing eight of `CLAUDE.md`'s operating rules in full**, and
the copies had already drifted from the source on two runtimes (`npm run check` at 25s against 30s,
`npm run visual` at 70s against 80s against 50s). Both cut to a pointer plus what is genuinely
campaign-specific. The third copy is in `collection-rework/handover.md`, which a peer session owns
tonight, so it stands.

**And that third copy had been openly contradicting `CLAUDE.md` for weeks**, in a planning document
most sessions never open: *"the chrome-devtools MCP cannot sign in ... CLAUDE.md still says to POST
the secret from `evaluate_script`; do not."* Reading `scripts/qa/_dev-login.mjs` settles the
substance — `evaluate_script` serialises its arguments into the page's own main world, which is
app-controlled ground, and that helper exists precisely so the secret goes from Node and only the
HttpOnly cookie reaches the browser. But the MCP has no way to be *handed* a cookie, so the recipe
in `CLAUDE.md` is the only way to drive an authed browser from it. `CLAUDE.md` now states both
facts, so the two documents agree.

**Three small live defects came out of reading, none of them a finding.** `CLAUDE.md`'s screenshot
table had a blank line before its `shots:clean` row, which orphans that row outside the table in any
renderer. `scripts/qa/crawl.mjs` never learned `/guide`, shipped 2026-08-27 — a one-token fix that
makes the README's "keep this in step" sentence true. And `admin.md` §9.9's "one schema gap to raise
before that build" — `User.lastSeenAt` — has been closed for weeks, with a partial index Prisma
cannot express.

`npm run check` green before every commit: types, lint, protocol, **46 lab routes**, **106/106
tests**, deps, security. No pixels moved, so `npm run visual` was not run. Six commits,
`ae88aaec`..`(this one)`.

**Parked, and named so nobody thinks they were missed**: `docs-07` and `docs/spec/catchups.md`
entirely, plus `docs/planning/catchups-rework/*` — a peer session is rebuilding Catch-ups in this
checkout and owns them. `collection-rework/handover.md` and `class-collection/spec.md`, filed in
`bugs.md` for their own campaigns. `docs-01` (archiving audit 1's `work/`), `docs-04`, `docs-13` and
`docs-14`, which are close-out questions or already done.

## 2026-09-08 — the Catch-ups rework gets a spec, and the database corrects it five times

The shape has been drawn and signed off at `/lab/catchups/sketches`; this session wrote what the
code and the database have to become for that drawing to be the shipped app.
`docs/planning/catchups-rework/spec.md`: every decision LOCKED, RECOMMENDED or OPEN, eleven build
phases each a revertable slice, and ¶1 to ¶52 of his brief mapped to the section that answers it.
It redraws nothing — `architecture.md` is still the design, and re-deriving a design he has already
approved has cost this project a session before.

**Five things the live rows said that the plan did not.**

The Edition that was mid-flight in `preparing` published itself between sessions, so there is
nothing to rescue today — but the migration still has to handle the state, because the daily tick
can create one at any moment, and `notifyPublished` fires from the action rather than from the
database. A row published by SQL sends nobody anything, and for its members the Edition simply
never happened.

The replacement for `preparing`'s 24-hour hold was already in the repository. `vercel.json` runs
the tick at 02:00 UTC, which is 07:30 IST, so snapping deadlines to **07:00 IST** means that
morning's cron always publishes, within thirty minutes. That is a number off the app rather than a
preference, which is the standard the last session set.

`joinBatchGroup`'s swallowed failure — the one its own comment predicted, with no self-heal
anywhere — **has already happened**: Rukmini Rau carries `batchYear: 2024` and is not in the Batch
of 2024 group. So the batch phase ships two idempotent passes in the tick, not just a backfill.

Which is what makes the hand-made "Batch of 2024" adoptable. Its snapshot group holds 11 members,
the real batch group holds 11, ten are in both; the one who is only in the snapshot is Rukmini,
with no answers and no questions. Heal her membership first and the snapshot becomes a strict
subset, so re-pointing `Catchup.groupId` at the real batch group loses nobody and hands two 2024
alumni the earlier Edition — which is ¶4's *"access to previous issues if they join later"*,
becoming true for the first time.

And nine of eleven batches have four members or fewer, and six have exactly one. A batch Catch-up
for one person is a newsletter to yourself, with reminders. That is owner question 19.

**What the spec settles beyond transcription.** Comments widen the existing `Comment` table rather
than growing a twin: `CommentLike`, the soft-delete-with-replies rule, the purge behaviour and the
700-line reading surface all exist and are all already argued for in the schema's own comments, and
a twin needs a twin of every one of them. Link previews get a `LinkPreview` table keyed by url, the
way the Collection's `Image` table is, so nothing migrates and a missing row is not an error. The
composer's song FIELD is deleted rather than drawn — ¶50 asks for the opposite of a dedicated
field, and F30 measured what keeping it costs: thirteen answers on the songs question and `songUrl`
null on every one, because people pasted into the body. Column drops are always a second file
applied after the deploy, because one database serves production and local dev.

Export re-run before any of it: 6 Catch-ups, 7 Editions, 24 questions, 143 answers, 36 photographs,
521 hearts, 5.8 MB.

Three new owner questions, then two. Twenty is F41, and its stated default is to do nothing until
he answers, because it is the only item in the spec that would truncate something a member wrote.
Twenty-one was withdrawn within the hour: the 10% tile tightening he asked to be measured before it
touched the feed had already been measured (8px above the reaction row, 9px below, shared) and had
already shipped as `2a6f7d25`, on its own so he can revert it alone.

And a correction to this session's own arithmetic, made the same day: **six** of the eleven batches
have exactly one person in them, not three, and nine have four or fewer, not eight. More than half
of the batch Catch-ups would be a newsletter to yourself, which is a different weight of question
from the one first written down — and very likely why the answer came back as it did.

**He answered both the same evening, and nineteen came back bigger than the question.** Not "wait
for a second member" but *"for people whose batches have less than ten people, let's not even show
the catch ups things in the sidebar ... once there's ten it appears and the catch up would be
created for that batch."* So ten is the floor, the backfill creates two Catch-ups rather than
eleven, and a member with nothing behind the door does not get the door. One clause is a reading
rather than his words and is marked as such: the test is *have you got a Catch-up*, not *is your
batch big*, because his reason was that it would not be reachable — and a small-batch member
invited to a people Catch-up can reach one. Two live cases prove it is not hypothetical: Jerry has
no batch year and is in two, and the public demo's visitor is a member of `demo-catchup`, so a
strict batch-size test would have quietly deleted Catch-ups from the demo's sidebar.

Twenty answered (a), and the two clamps swap: the pull-down list of questions gets three lines
where it had none, and the strip's docked question comes down from three to two. Right way round —
the strip is on screen the whole time you read, the list is a deliberate pull-down. **F41 closes**,
after a day open as the only item in the spec that would truncate a member's own words.

## 2026-09-08 — a letter gets the same three controls a post has

Campaign question 15, answered *"15 b"*: add all three. A letter had no way to be reported,
edited or deleted from the page it is read on, while every post has had all three since the
feed shipped.

**No server-side code was written, and none should have been.** A letter is a `Post` row with
`kind: "letter"`, so `deletePost` (author or admin), `editPost` (author only), `reportPost`
(anybody signed in, refused in the demo) and `adminRemovePost` (admin) all already took one.
The whole feature is `src/components/letters/letter-menu.tsx`, a "..." on the byline row that
is the same object as `post-card.tsx`'s header menu, item for item and label for label. It
sits beside the author rather than joining the hearts at the foot, because on a card that is
where the menu lives and a reading page should not grow a fourth control next to the measure.

**Edit does not open a dialog for a draft, and does for a published letter.** That split was
already decided twice in the source before tonight: `/letters/[id]/edit` refuses anything but
the author's own draft, and `edit-post-dialog.tsx` carries the owner's "the dialog register is
for things that take seconds, never for writing". A draft's Edit is a `Link` to the desk; a
published letter's is the shared dialog. A delete lands the member on `/letters`, with a
`router.refresh()` because `deletePost` revalidates `/feed` and not the letters index.

**Three things came out of the work that the question did not ask about.**

1. The draft notice's *Continue editing* link went to `/letters` — the index — from the day it
   was written, so the one control on a draft's own page sent its author to a list to find the
   draft again. It goes to the desk now, the same place the drafts strip has always linked.
   Pinned in `feed-write-rule.test.mjs`.
2. The admin's **Remove letter** was a bare `ShieldAlert` in the action row labelled
   "Remove letter (admin)" — the parenthetical role note DESIGN-SYSTEM.md's menu-item rule was
   written to replace. It moved into the new menu; leaving it would have put Remove on the page
   twice.
3. The report dialog said **"Report post"** over a letter. It has an `itemLabel` now, defaulted
   to "post", and `post-card` passes "letter" for a letter card too.

The menu panel is `w-auto`: the material's default is `w-(--anchor-width)`, and against a 28px
glyph trigger that falls back to a 128px floor which broke "Remove letter" over two lines.
**post-card's menu carries the same label on the same panel and still wraps it** — left for the
feed's own pass rather than widened here.

Delete was proved end to end rather than argued: a throwaway draft was seeded for the test
account, deleted through the new menu, and the row was gone from the database with the browser
on `/letters`. The draft was removed in the same run.

`npm run check` **106/106**, `npm run visual` **25/25** (no baseline moved; `/letters/[id]` is
not in the suite and the index did not change), `write-path-reviewer` clean on all four
invariants. Three screenshot rounds, desktop and 390x844, of the author's menu, a stranger's
menu, and each of the four dialogs.

**One trap worth carrying forward.** After removing the admin button, mobile threw an
intermittent hydration mismatch on `/letters/[id]` naming a `<button aria-label="Remove letter
(admin)">` that no longer exists in the source. It was a stale Turbopack SERVER compile: the
client bundle had the new tree and the server was still rendering the old one, on the same
route, for over an hour. **`touch` did not invalidate it — only a real content change did.**
Proved by inserting a marker attribute, watching the stale button disappear from the served
HTML in the same request, and taking the marker back out.

## 2026-09-07 — the five parked rebuilds get a description he can judge, and five bugs get filed

Two of the owner's answers were deliverables rather than decisions, and this is them.

**Question 27**: *"would need better descriptions to decide but not for now. however keep it
somewhere so I know it's pending."* The five Phase G rebuilds are written up in
`docs/planning/FEATURES.md` in the plain terms the original question should have used — what moves,
what it buys, and what the trap is — with the standing note that none of them changes what the site
looks like and that they are independent of each other.

**Question 9** (*"9b but mark it as a bug in bugs"*) and **question 28** are filed in
`docs/planning/bugs.md`, along with three defects found while verifying tonight's work: the review
room's `Done` control passes an anchor to a component told it is a button, a profile with an empty
house list still draws the HOUSES heading, and two live planning documents now describe
`approvePhotos`, deleted this evening.

Question 28 is filed as OPEN rather than closed. He replied *"i don't know what you're saying.
should be fine"* — the rate limiter fails open, so a missing key has no symptom, and "should be
fine" is not the same as somebody having looked at the dashboard.

## 2026-09-07 — one folder for scratch screenshots, and something that empties it

The owner's answer to campaign question 22: *"there's two different folders of them. delete all the
screenshots in both and make sure all future screenshots only fill into one folder. delete the other
folder permanently."*

Read conservatively and said so: the two scratch folders are `e2e/.shots/` and `.tmp-shots/`, the
latter written into the closed repo root by `scripts/dev/apple-edge/look.mjs` — the last thing still
breaking that rule. **`e2e/__screenshots__/` was NOT touched**: those 13 MB are the reference images
`npm run visual` compares every page against, and deleting them makes the whole check meaningless
until regenerated. If he meant those too it is one command.

`e2e/.shots/` had reached **630 MB** with nothing ever clearing it. 419 files predating today were
removed — **403 MB reclaimed** — and today's 307 were left alone, because a peer session is live in
this checkout and a screenshot it took an hour ago may still be its "before" shot.

`.tmp-shots/` is gone with its ignore line, `look.mjs` writes beside everything else, and
`npm run shots:clean` clears anything older than a week. The docs name one folder now.

## 2026-09-07 — the session log becomes an index, and a test keeps it one

Refactor audit 2, Phase F, and the owner's answer to campaign question 20 ("20b"). The full entry
now goes to `docs/history/progress-<YYYY-MM>.md` and `progress.md` keeps one line per session. The
rule used to run the other way — write here, move a closed month out — and it was written down in
two places with nothing enforcing it, so August closed, never moved, and the file reached **11,604
lines and the fourth-largest in the repository**, growing about 550 lines a day.

**323 entries moved, 0 lines of session text lost.** Proved rather than assumed: every non-blank
line of the old file was counted against the two month files, and the only six that did not carry
over were the old header and the June/July pointer, both reproduced in the new index. The root file
is 350 lines.

**It also fixes the second half of that finding.** The log had been running in two directions at
once — some sessions prepending, some appending — with September entries at both ends and no agreed
place to write. The two chronologies are merged by date; where a day had entries from both halves,
the existing relative order is kept and the month file says so. No entry text was edited.

`scripts/qa/progress-log.test.mjs` is the thing that makes it stick: it refuses an entry heading in
the index, caps the index's size, and fails if a month file holds an entry the index does not list,
or if a month file exists that the index never mentions. Mutation-tested all three ways.

Doing this by hand rather than by worker was deliberate: earlier tonight a worker truncated this
same file by 580 lines while making a three-line fix elsewhere.

## 2026-09-07 -- the hygiene pass: comments that describe code nobody has, and the last raw hex

Refactor audit 2, Phase F unit 1. Thirteen rows across eleven territories, plus the one live
`npm run check` warning and the owner's Q13 heading answer. Comment-only in most files; the code
that did move is named below.

**What was wrong and is not any more.** A viewer whose caption control was an alias for the
measurement behind it and whose two step arrows carried the same 330-character class twice; a crop
dialog citing a drag rig the viewer deleted; a photograph rule saying "nothing in the app calls
this" about a function the carousel calls on every swipe; a Collection room describing decade
pills scrapped on 2026-08-28 and a comment insisting there is no way to jump by decade on a phone,
nine lines above the scrubber that is exactly that; a feed action naming group plumbing removed in
phase 2; an admin layout counting eleven routes (14) and pointing at `admin-actions.ts`, a file
that no longer exists; three "fourteen-bird plate" mentions of a plate that has held twelve since
2026-08-22; `/guide/[area]`'s `generateStaticParams`, which could never prerender anything because
the root layout reads the theme cookie; eight auth comments describing deleted code, including one
claiming `maskEmail` exists for a client component when all four callers are server modules; a
member-facing onboarding line offering "settings", which 404s; a root layout still calling dark
mode "visually inert" 60 lines of `.dark` block later.

**The code that moved, all of it small**: `post-card` parsed `post.images` twice and its
`viewerImages` memo depended on the second parse; `search-pill`'s `m.form` animated nothing;
`posthog-identify` returned a cleanup that only held a comment; `sidebar` inlined a seven-line
`counts?.[key]` helper and now reads the teacher test once instead of twice, so the desktop rail
and the mobile drawer cannot disagree about who sees Catch-ups.

**The raw hex.** `protocol-audit` had one finding left in the whole repo: the sidebar wordmark's
`text-[#EAF1DF]`, from `bed93ca1`. **No token matches it** -- the nearest, `--sidebar-foreground`,
is `#EBF3EE`, a different colour -- and it should not be one: it is the lightest of the logo's
three fixed planes, which must not flip with the theme. So it went where the mark's other fills
already live and are sanctioned, as `PeaksMark`'s `variant="cream"`. Byte-identical output; the
protocol gate is now clean for the first time this campaign.

**Q13, the three off-ladder headings.** He asked "which headings" rather than answering, so the
stated default stands: same pixels, one name. `--text-lede: 26px` in `tailwind-theme.css`, font
size only, because the two surfaces set their own leading (tight against snug) and a paired
line-height would have moved them. Seven call sites: the dark-mode gauntlet's six step headings
and the Collection contribute room's invitation. Measured live afterwards: 26px / 32.5px,
unchanged. **The two `catchups/join` headings were left alone (parked area), and a 27px heading
nobody has told him about is live at `auth-panel.tsx:177`.**

**Member-visible**: the dark-mode page's two "Back to settings" controls now read "Go back"
(his Q10 answer, verbatim option (a)); the onboarding photo step says "from your profile".

**DESIGN-SYSTEM section 7 now records his reduced-motion decision in his own words** rather than
stating it as a house default, and names the three shipped files that still check the OS setting
(`footer-hoopoe`, `not-found-stage`, `showcase-shot`) as deliberately left alone -- he answered a
question about ADDING two guards, not about stripping the ones there.

**Findings that were wrong, and were not applied**: `use-letter-persistence`'s two wrappers are
not one-caller (three each), so inlining them broke the build and was reverted;
`shell-primitives-11` would delete `--space-xxl`, whose only non-lab consumer is the landing
showcase the owner kept at Q1; `admin.ts:26-27`, `settings/actions.ts:15`, `letter-images.tsx`,
`place-write.ts`, `motion-features.tsx`, `directory-module`'s select, `post-feed.tsx:112` and
`notifications/actions.ts:47` had all already been fixed.

`npm run check` green (105 tests, protocol clean), `npm run visual` 25/25, `/dark-mode`
screenshotted at 1440 and 390.

## 2026-09-07 — seven indexes nothing uses, and one the audit was wrong about

Refactor audit 2, D7's index half (`data-layer-04`). The audit named eight; **seven are dropped
and the eighth is refused, on measurement rather than reasoning.**

The instrument: `idx_scan` over a window open since 2026-05-22 (108 days), then a controlled probe
today -- a full authenticated crawl, then `/admin/audit`, `/admin/analytics` at `journey`, `people`
and `faces`, then twelve `/collection` loads across both halves and a bucket filter. Every reader
the audit named was visited.

Dropped, each 0 scans today: `Photo_approved_isHidden_createdAt_idx` (6,388 lifetime, all of them
before `Photo_river_added_idx` was built on 2026-08-28 -- it is a strict prefix of that index and
Postgres walks a DESC btree backwards, so nothing it served is unserved), `Photo_river_era_idx`
(5), `LoginAttempt_email_createdAt_idx` (8), `LoginAttempt_userId_createdAt_idx` (24),
`AuditLog_actorId_createdAt_idx` (7), `AuditLog_targetId_idx` (7), `ContentView_viewerId_lastAt_idx`
(110). All eight objects exist on production AND the demo, every one a plain btree matching its
Prisma declaration exactly -- none is one of the eleven the schema header warns about.

**`Photo_era_idx` is KEPT and the finding is wrong about it.** It went 60 -> 80 during this
session. The finding's reasoning is right -- no `where` filters `era` alone since the decade rail
became a seek -- but "no query shape can use it" and "nothing is using it" are different claims,
and only the second justifies a drop. Its statement is in the SQL file, commented out, with the
numbers.

`ContentView_viewerId_lastAt_idx` is an INDEX drop only: the owner kept `firstAt`/`lastAt`, and the
columns and their writes are untouched.

**No DDL.** `prisma/migrations-manual/2026-09-07-drop-unused-indexes.sql` is written and unrun --
and unlike the column drops beside it, its ordering does not matter, because Prisma never names an
index in a query.

## 2026-09-07 — the bounce subtype stops being stored twice

Refactor audit 2, D7's column half (`data-layer-03`, reduced by the owner). `OutboundEmail.
bounceKind` held Resend's raw hard/soft subtype from 2026-08-19 so the two could be handled
differently later. They never were, and nothing ever read the column: **0 of 55 rows on
production, 0 of 0 on the demo** -- fifty-five sent messages and not one bounce among them.
`admin-analytics.ts` counts `deliveredAt`/`bouncedAt`/`complainedAt` being non-null and has never
named it.

**Nothing that was being read is lost.** The webhook still writes the subtype into `lastError` --
"Bounced (<subtype>) -- the address did not accept it" -- which is the sentence the admin worklist
already draws. The comment there now says it is the only place the distinction lives, and that a
handler which acts on it wants a column again with a reader in the same commit.

**Three columns in this finding were KEPT, on his instruction**: `ContentView.firstAt`/`lastAt`
(217 of 217 filled) and `MetricSnapshot.capturedAt` (561 of 561). Untouched, declarations and
writes intact.

**No DDL.** `prisma/migrations-manual/2026-09-07-drop-bounce-kind.sql` is written and unrun.

## 2026-09-07 — the black-and-white measurement stops running

Refactor audit 2, D9 (`data-layer-02`). `Image.greyscale` was measured with a pixel pass over the
probe buffer on **every feed upload**, and the filter it existed for could never have read it:
`Image` is keyed by URL and written only by the two feed upload routes, while the Collection's
rows are `Photo`, a different table with no such column. **3 of 53 rows true on production, 0 of 2
on the demo.** The owner: *"stop computing it; it can be worked out again from the picture."*

`meanChroma`, `isGreyscale` and the 8-in-255 threshold go together -- the first existed only to
feed the second. A comment where they were says why, and where they belong if the filter is ever
built (a column on `Photo`, computed in `contributePhotoDirect`'s encode chain, which is not
`toDisplayWebp`). `collection-rework/spec.md` §7.4 now opens with "NOT BUILT, and the column has
gone" instead of promising a filter.

Four tests went with them. The replacement is the one that would actually catch something: a
black-and-white photograph must still be **measurable at all**, because sharp's attention crop
behaves differently on a flat monochrome frame and a null there takes the whole layout with it.

**No DDL.** `prisma/migrations-manual/2026-09-07-drop-image-greyscale.sql` is written and unrun,
and says out loud that this is the one column in tonight's set that is not empty.

## 2026-09-07 — the Groups feature's last column, and a branch of the visibility rule with it

Refactor audit 2, D6 (`data-layer-01`). `Post.groupId` has been NULL on every row since Groups
were retired -- **0 of 20 on production, 0 of 0 on the demo**, counted again today -- and
`createPost` refused one outright, so nothing could ever set it. Six read paths carried
`groupId: null` as a filter that matched every row, and `Post_groupId_createdAt_idx` was a btree
over a column of nulls with **889 recorded scans** doing that work.

**This is a security change and it is not a quiet one.** `decidePostVisibility` had a group branch
above the city and batch arms: a post with a `groupId` was decided by membership alone and
returned `ok: true` without consulting either. That branch could not fire on any row that exists
or could be written, so it is gone, along with `VisibilityFacts.isGroupMember`, the
`"not-a-member"` reason, `GUARD_SELECT`'s `groupId` and the `isMemberOf` lookup behind it.
Nothing else in the rule moved: hidden, draft, author-blocked, admin, author, city and batch are
untouched and their tests are unchanged.

Three tests in `post-visibility-rule.test.mjs` existed only for that branch. **They are replaced
by one that pins the absence** -- and pins the thing that made the branch dangerous, which is that
it short-circuited the audience arms. If a group-like scope ever returns, that test says it must
decide the audience too, not skip it. `RULE_FACTS` drops to three.

`Group`, `GroupMember` and `Catchup.groupId` are untouched: the Group row is still the membership
container under every people-started Catch-up. `Group.description` (11 of 18 rows, every one the
generated sentence "Everyone from the batch of 2010.") and `Group.coverImage` (0 rows, no writer
ever) stop being written.

**No DDL ran.** `prisma/migrations-manual/2026-09-07-drop-groups-residue.sql` is written, unrun,
and says out loud that running it before this deploys is an outage. `npm run check` 105/105,
`verify:crawl` 20/20, `write-path-reviewer` on the diff.

## 2026-09-07 — the Collection stops reading two columns nothing has written

Refactor audit 2, D5 (`collection-08`), which closes audit 1 §4 #16. `Photo.area` ("Part of
school") and `Photo.freeTags` (bird and species names) both left the contribute form long ago --
`freeTags` on 2026-07-18, `area` on 2026-08-28 -- and were still being selected, searched and
written as literal NULLs. Counted again today before cutting: **0 of 1,749 rows on production, 0
of 0 on the demo**, both columns.

Gone from the code: `LEGACY_AREAS`/`areaLabel`, the two fields on `PhotoData`/`PhotoMeta`, the
`photoSchema` arm, both contribute inputs, the two search `OR` arms, the viewer mapping's `where`
line and its `freeTags` spread, the account export's `area: true`, the demo seed's six "Whole
campus" values and the lab archive's `WHERE` specimen list. Two files the finding's own
remediation list missed and which would have failed the build: `import-album.mjs`'s explicit
`INSERT` column list and `lab/collection/_archive.ts`'s fixture.

**`ViewerImage.where` STAYS.** The finding asks whether it has a producer left: it does --
`/lab/viewer` builds two literals with it, and the lab is typed and compiled.

**No DDL ran.** `prisma/migrations-manual/2026-09-07-drop-collection-legacy-tags.sql` is written
and unrun; the owner runs it after this deploys, against production and the demo separately. The
two trigram indexes (`Photo_area_trgm_idx`, `Photo_freeTags_trgm_idx`, both at `idx_scan = 0` over
a window open since 2026-05-22) go with the columns, taking the schema header's eleven-index
census to nine on the day it runs.

`npm run check` 105/105, `verify:crawl` 18/20 (`/lab` and `/signup` are a peer session's live
Catch-ups edits, not this change), `/collection` shot and read.

## 2026-09-07 — four dead options removed, two kept because the lab uses them

Refactor audit 2, directory-profile-17, "six props across five files". **Two of the six are not
dead**, which is the failure mode the campaign warned about: a finder who greps shipped callers only.

- `GetInTouch`'s `showSave` / `size` — **kept.** Seven call sites, five in `/lab/profiles`. Three of
  those (passport, broadsheet, terrace) omit both and therefore run the defaults. Deleting them
  fails TypeScript. The JSDoc says so now, so the next audit does not re-propose it.
- `AdmissionStamp`'s `className` — **kept.** `_variant-broadsheet.tsx:673` and
  `_variant-terrace.tsx:623` pass it. (`_variant-dossier.tsx` has its own local copy of the
  component, which is what made the count look smaller than it is.)

Removed, each re-grepped across the lab first:

- `ProfileAuthorFeed`'s `layout` and its whole `"sheet"` branch — one caller, always `"cards"`. Also
  `emptyBody`, never passed. Note this leaves `PostCard`'s `variant="sheet"` with no caller anywhere;
  that is feed-posts territory, not this row, and `image-cdn.ts`'s comment about it is corrected
  rather than deleted.
- `LocationPicker`'s `disabled` — four call sites, none passes it.
- `fullWidth`, in **three** files, not the one the finding names: `directory-client.tsx`,
  `admin/content/content-list.tsx` and `admin/people/people-list.tsx`, plus `AdminFilterBar`'s
  `facets: (fullWidth, compact?)` contract. Every call site passed `true`. content-list had a
  **third** use of it the finding missed, on the "Show removed things" button.
- `contacts-editor.tsx`'s four re-export lines. Their comment said the profile imports its
  vocabulary from the editor; the profile imports from `@/lib/contact-rows` directly.

And `renderPrimaryFacets` / `renderSecondaryFacets` become one `renderFacets(compact)`: the
primary/secondary split served a desktop toolbar row and a "More filters" disclosure that
`filter-popover.tsx` removed ("Every facet lives in here now"), and both callers have called the two
in order ever since.

Measured rather than eyeballed: the directory's four facets are 248x36 in the desktop popover and
328px full-width in the 390px sheet, admin People 248x36, admin Content 248x36 — the same numbers
the `fullWidth ? ... : undefined` produced, because every caller passed `true`.

`npm run check` 105/105.

## 2026-09-07 — the houses step stops fetching a column the page already has

Refactor audit 2, directory-profile-10. `/welcome` loads the member's row and hands eleven fields to
the wizard. The houses step then made a second round trip on mount, through a server action, to read
a twelfth (`houses`) off the same row — behind a two-bar skeleton, on the one step whose whole point
is that everything is already known. The page select carries `houses` now and passes
`parseHouseYearEntries(user.houses)`, exactly as `/profile/[id]` does; `getOnboardingHouses` and
`GetHousesResult` are gone, and so is the skeleton branch and the `loading` state.

The freshness question is the only real risk, because `saveOnboardingHouses` deliberately does NOT
`revalidatePath("/welcome")`. Verified in the browser as Jerry rather than argued: seeded years and a
saved chain, `/welcome?step=houses` painted "Neem 2014-16 -> 2016-17" on the first frame with zero
`.skeleton-warm` nodes; picked Palm, Save & continue, Back — "Neem 2014-16, Palm 2016-17, 2017-18",
still zero skeletons, no console output. The RSC re-runs after the action, which is what the page's
own guard comment has always claimed. Desktop and 390x844 both, and the bottom-sheet shell too.

`npm run check` 105/105.

## 2026-09-07 — the Catch-ups room meets its pressure corpus, and a design pass gets reverted

Session S4c. It was meant to be a fine-tune with the owner in the loop; its prompt said "he has more
tweaks, take them" and also named two items as ours. He had not given the tweaks yet, and the
session filled the wait with the two items instead of stopping. He rejected the result: *"i don't
like any of the aesthetic changes you've made they all suck."* Every aesthetic change is reverted
and `src/app/lab/catchups/sketches/` is byte-identical to `d9bf261` again — the masthead, the Round
number leaving the reader, the dropped unanswered question, the bounded rail, the clamped rail rows
and a simplify pass, all gone.

**What survived is the part with no visual footprint**, and one tool.
`_fixtures/pressure.ts` had been on disk since 09-05 and nothing had ever rendered it. `?data=pressure`
now swaps the `SketchRound` the whole spine draws, through one adapter, so the list, the home and
the reader are all judged on forty answers to one question, a twenty-four photograph wall, a hundred
people and links nobody has a resolver for. That is his own ¶51: *"incredibly robust can be produced
with only pressure testing."*

**It found seven defects in an afternoon on surfaces four sessions had already looked at.** The
worst was silent: the room imported `ImageViewer` directly, whose last line portals to
`document.body`, so every server render of a page with a photograph threw, React called it
recoverable and rebuilt the whole tree on the client — the page rendered twice with every gate
green. `lazy-image-viewer.tsx` has said in its header since it was written that every caller must
come through it; that comment is now `image-viewer-import-rule.test.mjs`, proved to fail before it
was kept. Also fixed: no `overflow-wrap` on the answer body or question heading (recon F18 alive
inside the front runner); links that could not be resolved were deleted and their answers vanished
entirely, while links that could were printed above their own card; photographs keyed by url rather
than by position; and the corpus itself had been minting one id for ninety-three people.

**Two were found and deliberately not fixed**, because both fixes change what a page looks like and
that is his call: the home's rail is 4,000px and unreachable at the hundred-person cap, and one
300-character question makes a 211px row in the reader's rail. Both are written up with the fix
already worked out, as F40 and F41.

The room renders clean at 390 and 1512 after the revert. `npm run visual` was 25/25 earlier in the
session, `/catchups` included, which makes the handover's old warning about that route stale.

## 2026-09-07 — onboarding's "seen" flag was the mascot's one-shot latch with a different prefix

Refactor audit 2, directory-profile-21. `src/lib/onboarding-local.ts` was 28 lines of
`safeGet(key) === marker` / `safeSet(key, marker)` over `local-storage.ts`, which is exactly
`hasFired`/`markFired` in `mascot/moments/one-shot.ts`. Both files' headers already cross-referenced
each other. The file is gone; the two callers (the flow, and the demo bar that suppresses it) latch
`ONBOARDING_SEEN` instead.

The key moves from `rv:onboarding:seen:<id>` to `rv:moment:onboardingSeen:<id>`, so a member who
bailed out of the wizard **before** saving an admission number sees the Welcome step once more.
Anyone with an admission number is bounced at `onboarding-flow.tsx:138` before the flag is read, so
that is the whole blast radius, and it is one greeting.

`ONBOARDING_SEEN` lives in `onboarding/types.ts` rather than in either component: the demo bar must
agree with the flow on it, and importing it from `onboarding-flow.tsx` would pull that whole client
graph into the demo bar's chunk.

`npm run check` 105/105.

## 2026-09-07 — the profile skeleton stops drawing a rule the sheet deleted

Refactor audit 2, directory-profile-23; audit 1's F-11, profile half, never applied. The letterhead
deleted its engraved rule on 2026-08-02 and says so at length in its own source, including the 29px
of sheet height that bought back. The skeleton kept drawing it: a 3px bar plus two `--space-l` steps,
about 29px, which is exactly the number the sheet's comment quotes. So every cold profile load ended
with the content jumping up by that much — on a file whose own contract is "the page with the ink
drained out ... so nothing re-corners, re-pads or jumps".

Two lines gone. The directory's skeleton was fixed in that batch; this one was missed.

`npm run check` 105/105.

## 2026-09-07 — your own profile stops building a Photos grid you cannot open

Refactor audit 2, directory-profile-12. The letterhead's fourth tab is Saved on your own sheet and
Photos on everybody else's, so `tab === "photos"` is unreachable on your own profile. The page ran
the photos query anyway, flattened it, built up to sixty `<Link><img>` nodes and serialized them into
the RSC payload — on the profile every member opens more often than any other. One query and up to
sixty image nodes now skipped when `isOwnProfile`.

The finding's letterhead citation was 17 lines out (`:1884-1891` against a real `:1901-1907`); the
claim held.

`npm run check` 105/105.

## 2026-09-07 — the directory stops shipping a field nothing reads

Refactor audit 2, directory-profile-09. Every person in every map pin carried an `otherCities`
string array — the member's other mapped cities — computed per pin entry and serialized into the RSC
payload of every directory load and every filter change. Its own type comment said it was "kept for
matching only"; there is no matching code, and the drilldown stopped drawing an "Also in ..." line in
July. `grep -rn otherCities src` found the producer and the type, and nothing else.

Gone, with `allMappedCities`, which existed only to compute it. The finding's citations were all
several lines off (`:88-92`, `:113`, `:125-130` against a real `:74-79`, `:106`, `:112-116`) but
right about the content. C-098's pins are on `cities`, the pin's own list, which is untouched.

`npm run check` 105/105.

## 2026-09-07 — the house picker and its lab room go

Refactor audit 2, directory-profile-05, widened by the owner: *"delete the whole house picker lab we
don't need it."* `HousePicker` was the wrapper that hung a house panel off a year row. The chain
editor replaced that interaction on 2026-08-07 and the wrapper survived in `components/common/` with
a 30-line docblock arguing an interaction nothing shipped runs. Its only render site was
`/lab/houses`, so the room goes with it: both routes, the registry entry, the two iframes.

What stays is `HouseOptions`, the panel body the shipped chain editor draws, so the file is
`house-options.tsx` now and says what it holds.

Four comments named the picker and would have gone stale silently: `houses-step.tsx` (the step it
replaced), `use-wide-viewport.ts` (which cited the picker as the reason the hook exists — it now
cites the editor), `filter-sheet.tsx` (a list of the app's bottom sheets) and `globals.css`'s dot
correction, which claimed "four INLINE sites (house-picker, alumni-map)" and now names the one that
is real. `lab/everything/_findings.ts` still names the file, deliberately: its header says `evidence`
is untouched receipts, and it already cites a `settings-form.tsx` deleted months ago.

`npm run check` 105/105 after `npm run build` regenerated `.next/types/validator.ts` — deleting a
route reds `tsc` until it does. Lab registry 48 routes -> 46.

## 2026-09-07 — One answer to "what is a page" across the screenshot family

`verify:shot` took a bare route, `screenshot` and `screenshot:auth` took a full URL, and CLAUDE.md's
own table says `<url>` while every session types a path. Three answers to one question, in one
family of scripts, which is the drift Phase E exists to close. A leading `/` now resolves against
localhost:3000 inside the shared `shoot()`, so both forms work everywhere.

Found because the path form silently produced a blank frame; that half is fixed separately and is
the real bug.

## 2026-09-07 — The screenshot scripts stop reporting a page they never loaded

Found while verifying Phase D unit 1, not by the audit. `npm run screenshot /about` printed
**"Screenshot saved"** and wrote a 1440x900 frame of `about:blank`. Puppeteer needs an absolute URL,
the navigation failed, `shoot()` set `status = "NAV-ERR"` — and `screenshot.mjs` destructures only
`outPath` and prints success regardless.

That is the worst failure a verification tool can have. The whole screenshot protocol in CLAUDE.md is
"screenshot, read the PNG, compare in specific numbers", and a session following it would have read a
blank frame as evidence of a page it had never seen.

`shoot()` throws on a failed navigation now. `verify-shot` opts out with `tolerateNavError`, because
reporting `status` in its JSON is its whole job and it has a caller reading that field. Everything
else exits 1 with the reason.

## 2026-09-07 — The places writer's extra columns get a name

A write-path review of Phase E unit 4 flagged it, and the audit did not. `replaceUserPlaces` gained
an optional `userData` so sign-up's register step could save four profile columns in the same
transaction as the member's cities. The parameter was typed `Prisma.UserUpdateInput` — the whole
thing, including `role`, `isBlocked`, `verifyState` and `credentialVersion`.

Nothing exploits it: the one caller passes a literal of four fields built from a Zod schema, and
`userId` comes from the session, never a parameter. But it is a privilege-escalation *shape* one
careless caller away, and the only thing objecting was a comment. It is a `Pick` of those four now,
so the compiler enforces what the prose asserted.

## 2026-09-07 — moderation moves out of the profile folder

Refactor audit 2, directory-profile-15. `src/components/profile/admin-actions.ts` held eight actions
and none of them was about a profile: five are the panel's standing controls (block, delete, note,
verify, unverify) and three are report and post moderation whose only caller is the reports queue.
The five join `admin/people/actions.ts`, which is the same subject and already carried role, photo
trust and merge; the three become `admin/reports/actions.ts`, beside `report-list.tsx`. The file is
gone, and with it the `const requireAdmin = requireAdminAction` alias.

**Both of the finding's supporting facts were wrong, and its list of pins was short.**
`admin/people/actions.ts` does not import `adminDeleteUser` -- it imports nothing from that file.
`admin-profile-tools.tsx` DOES, by a relative `"./admin-actions"`, which is why a `profile/admin-actions`
grep misses it and why the finding's consumer list was otherwise right. Four things hard-code the
path: `gate-coverage:188`, `admin-guard-rule:19`, `unattended-rule:305` and `scripts/qa/audit-status.mjs:229`
-- the last a check-gate script, so a wrong move reddens `npm run check` rather than the suite. Three
docs name it too. All eight travel in this commit.

Two mutation tests, because a moved pin is a pin that can have stopped pinning: dropping
`refuseSelfOrLastAdmin` from `adminBlockUser` fails admin-guard-rule, and dropping `verifyStateAt`
from `adminUnverifyUser` fails C-046 -- and the C-046 sweep now reads a file with more verifyState
writes than the one it used to. `npm run check` 105/105, `npm run visual` 25/25. Person page, People
list, reports queue and a member's profile all render with no console error, and Save note fires from
its new home. Dismiss and resolve are unexercised: nothing is pending, and those buttons only draw on
the pending list.

## 2026-09-07 — one mail row, for the queue and for a person

Refactor audit 2, admin-analytics-05 / E11. The person page drew its own mail row -- the same kind
label, status chip, tries count, red `lastError` and Try again as `MailRows`, differing only in an
absolute date and in hiding Try again on anything but a failed row. Owner asked, told exactly what
would change, and answered **"16a"**: merge and accept it. So on `/admin/people/[id]` the dates read
"2w ago" instead of "2 September", and every row carries Try again and Clear.

Two things beyond the row itself. `MailRows` gained `showRecipient`, because the queue answers "who,
what, when" and a person's own page has already said who, at the top, in bigger type -- passing the
identity through would have printed the same address down eight rows, which is noise he was not asked
about and did not agree to. And `useAdminAct` lost its `onDone` option: the mail card was its only
caller and passed `() => router.refresh()`, which is the default written out, so the docblock had
described a difference that never existed. `MAIL_STATUS_TONE`, `mailKindLabel` and `mailStatusLabel`
are local again now that nothing outside the file chips a mail state.

Screenshotted at 1440 and 390. The section is 614px on both; rows fit at 390 with the two buttons
beside the text, no wrap. `/admin/mail` is untouched. `npm run check` 105/105, `npm run visual`
25/25.

## 2026-09-07 — the admin tools on a profile stop keeping their own copy of the truth

Refactor audit 2, directory-profile-16. `AdminProfileTools` wrote the busy / try / toast pattern four
times, and mirrored `isBlocked` and `verifyState` in local state that flipped on the client whether
or not the write had landed. 222 lines to 194.

**The finding's remedy was half right and I did not take that half.** It says route all four handlers
through `useAdminAct`. Three of them are `ConfirmDialog` `onConfirm`s, and that dialog ALREADY owns a
busy state, already runs the action through `callAction` and already shows the refusal -- so the hook
on top would track "working" twice and toast a refusal the dialog is about to toast. `useAdminAct`'s
own docblock says as much ("the confirm-dialog flows in person-detail do exactly that"), and
person-detail is the worked example: `onConfirm` returns the result and the dialog does the rest. So
the note, the one control not behind a confirmation, takes the hook; the other three hand their
result back. The generic "Something went wrong" catch is gone either way, which was the real defect:
a rejected action now gets the app's standard message instead.

Driven live as admin on Jerry's profile: note saved, block and unblock, unverify and re-verify. Every
label followed the refreshed server prop, every toast fired, no page error. `npm run check`: 105/105.
His `verifiedAt` is 5.5 hours earlier than it was, because restoring it needed an UPDATE the sandbox
refused; same date, test account, nothing reads it.

## 2026-09-07 — onboarding was the third places writer, and it said there were two

Refactor audit 2, directory-profile-11. `place-write.ts`'s header claimed "exactly two writers -- a
member editing their own in /settings, and an admin editing someone's on the person page". Both
halves were wrong: there is no /settings page any more, and sign-up's register step was a third
writer, hand-rolling the same wipe-and-recreate with a `createMany` inside a transaction that also
wrote four profile columns. `place-input.test.mjs` had counted three writers for a while; only the
prose had not caught up. The finding's line range (`:78-108`) was exact.

`replaceUserPlaces` takes an optional `userData` now, spread into the `prisma.user.update` it already
runs, so the register step's admission number, occupation, organisation and subjects still land or
fail with the cities in one transaction. The legacy mirror is spread AFTER it, so no future caller
can pass its own `currentCity` and become the fourth copy of C-101. The schema's UserPlace comment
said "Both writers" too, and now says three.

Verified against the real database, signed in as Jerry: the register step saved, advanced to the
houses step with no page error, and his one place came back with its `placeId`, coordinates and
position untouched, the legacy columns re-mirrored and the four profile columns unchanged.
`npm run check`: 105/105.

## 2026-09-07 — five hand-rolled admin checks go through the one guard

Refactor audit 2, duplication-15 (audit-1's dup-20 residue). `approvePhoto`, `approvePhotos`,
`declinePhoto` and `adminRemovePhoto` each opened `auth()` and asked `role !== "admin"` themselves,
and `lab/actions.ts` asked it again with a full stop on the end of the refusal. All five now call the
shared guard, so the check and its wording cannot drift from the twenty-odd actions beside them. The
finding's four line numbers were all wrong (1039/1078/1159/1231 against a real 886/925/1006/1078);
the functions it named were right.

The two approvals take `requireAdminActor` rather than `requireAdminAction`, because they stamp
`approvedById` — which is the shape `admin/review/actions.ts` already uses for the same write, so the
two approval paths now read identically. The mixed owner-or-admin checks at `:1055` and `:1155` are
NOT this rule and were left.

**One trap came out of it.** A refusal returned from the shared guard is not a fresh object literal,
so TypeScript stops normalising the return union and `{ success: true }` loses its
`error?: undefined`. That makes the whole result a weak type, and `content-list.tsx:418` — a caller
neither the finding nor I had thought about — stopped compiling. Fixed by writing
`Promise<AdminActionResult>` out on the three actions that return that shape, which is what the type
was created for. `npm run check`: 105/105.

## 2026-09-07 — the report transaction is written once

Refactor audit 2, feed-posts-14(a). The Report row and the AdminThread that answers it landed in one
`$transaction` in `reportPost` and again in `reportUser` — twenty-three near-identical lines each,
differing only in the create data and whether a lost race reads as "already reported" or "already
flagged". `reportUser`'s comment held the pairing together: *"half-fixing one of a matched pair is
how this codebase has drifted before."* `fileReport` is that promise as code, the same move session 5
made with `vetReport`.

It returns `{ id } | "duplicate"` rather than throwing, because losing the race to
`Report_open_post_per_reporter_key` is not a failure — the loser has the outcome it wanted. What that
reads as to the member is the one thing that differs, so the wording stayed at the call site. The
parameter is a `Pick` of five columns, not the whole `ReportUncheckedCreateInput`: a third caller
could otherwise file a report already marked resolved and `tsc` would agree.

**The audit's Risk line for this row was wrong** and it would have reddened the build. It names
`security-regressions:221` and `:274` and calls the change low risk; the pin that actually breaks is
C-060/C-007 in the same file, which looped BOTH exported bodies for `$transaction` / `tx.report.create` /
`db: tx` / `isUniqueViolation`. Rewritten to pin the helper and to add a guarantee the old one lacked —
neither exported path may grow a write of its own. Mutation-tested five ways. **14(b), the move out of
`components/`, stays declined**: there are twelve `"use server"` files there, not one.

## 2026-09-07 — the M33 bell rule lives once

Refactor audit 2, feed-posts-04. Four notification writes sat inline in `feed/actions.ts`, and two
of them — `toggleLike` and `toggleCommentLike` — carried the M33 one-per-unread rule in twelve
near-identical lines each, kept in step by a comment saying "same rule as toggleLike". jscpd never
flagged the pair: the variable names and the message differ, which is exactly the shape the
fix-prompt calls a sameness maintained by hand.

`notifyMember` and `notifyMemberOnceUnread` in `post-notifications.ts` are the two writes now, and
the M33 paragraph is on the second of them. The `where` is a spread of the row about to be written,
plus `read: false`, so the dedupe cannot drift from what it dedupes.

**Verified against the real database, not just typechecked.** A throwaway probe called the helper
against Jerry's own bell: one row after the first like, still one after the second, two after the
first is marked read, and four after two plain writes — then deleted its own four rows. Four
mutations of the new pin (a like downgraded to the plain helper, `read: false` dropped, the dedupe
narrowed to userId+type, an inline create restored) each turn `npm run check` red.

## 2026-09-07 — one query for "does this member list this city"

Refactor audit 2, feed-posts-08. `prisma.userPlace.findFirst` with a
case-insensitive city match was written three times: `createPost` (a miss folds to "Everyone"),
`editPost` (a miss is REFUSED, audit C-017) and `canViewCityScope` on the read side. One `where`,
three `select`s, and `editPost`'s comment holding the sameness together in prose.

`ownCity(userId, city)` in `city-scope.ts` is the query now, returning the STORED spelling or null —
the strictly larger answer, so what a miss means stays at the call site where it actually differs.
Deliberately not `cache()`d, unlike `getViewerCities`: two of the three callers are writes
re-checking the audience at the moment they store it.

Byte-identical where clause, so no behaviour moved. C-017's pin was mutation-tested against the new
shape and still bites. A companion sweep refuses a fourth hand-rolled `userPlace.findFirst` anywhere
in non-lab `src/` — the copy that would ask the question a little differently on a write that
decides who reads a letter.

## 2026-09-07 — "three photos per post" stops being typed by hand

Refactor audit 2, feed-posts-06. The cap lived in six places: `const MAX_FILES = 3` in each of the
two upload doors, `3 - shots.length` in the composer's upload hook, `previews.length >= 3` on the
composer's attach button, `allowed.length > 3` in `editPost`, and `MAX_IMAGES` in
`upload-ownership-rule.ts` — the only one with an argument attached. Five of them now import the
sixth. `upload-ownership-rule.ts` has no imports at all, by design, so the two client files pay a
constant and nothing else.

`upload-ownership.ts`'s re-export of `MAX_IMAGES`/`MAX_IMAGE_URL` went too: knip listed it unused
and it was a second front door to one constant.

The pin is a sweep, not the five-file list the audit handed over, because the copy that matters is
the seventh one nobody counts. It refuses three shapes across non-lab `src/`: a second `MAX_IMAGES`
-style declaration, a named photo collection compared against a literal 3, and `3 - x.length`.
Mutation-tested in all three directions before it was believed.

## 2026-09-07 — The Collection viewer's admin flag stops being optional

Found by a write-path review of Phase E unit 2, not by the audit. `toViewerImage(p, isAdmin = false)`
gained its default so two lab rooms could omit the argument. That default is a trap: a future caller
that forgets it compiles cleanly, and the only symptom is the edit pencil quietly not rendering for
an admin. It under-permissions rather than over-permissions, so it was never a hole — but a missing
capability `tsc` refuses to mention is the exact shape of bug that file was split out to prevent.

Required now, with the reasoning in the source. The two lab rooms say `false` out loud.

## 2026-09-07 — the Collection's two "viewers" get two names

`collection-viewer.ts` is a SERVER module about the member doing the looking; it imports Prisma.
The photograph-to-viewer field map added an hour earlier is client-safe and is about the image
viewer they look through. Naming them `collection-viewer.ts` and `collection-viewer-image.ts` put
one letter of meaning between two modules where picking the wrong one puts Prisma in the browser
bundle — and `tsc` is perfectly happy about that. The server one is now
`collection-viewer-facts.ts`, and both banners say which is which.

**How it surfaced is worth writing down.** Creating the new module at the taken name for one
minute, then restoring the original byte-for-byte, left Turbopack's dev cache holding the
overwritten version at that path — permanently. `git diff` was clean, `tsc` was clean, `npm run
check` was green, and `/collection` still threw `viewerFacts is not a function` on every render,
with React swallowing it into "Switched to client rendering". Touching the file did not help; nor
did changing its bytes. The proof was reading `.next/dev/server/chunks` and finding the wrong
module's banner under the right module's path. CLAUDE.md gotcha 1 is right and its remedy is `mv
.next .next-stale`; another session is live in this checkout, so the rename — which the code wanted
anyway — is what shipped instead. **The next session on a cold `.next` will not see any of this.**

`npm run check` green (105/105); `/collection` and `/collection?scope=class` both 200 with an empty
error list, where minutes earlier they were the error boundary.

## 2026-09-07 — the Catch-up reader gets a masthead, and meets the corpus nobody had run

Catch-ups rework, session S4c. Two things were outstanding and both were ours.

**N11, the title.** His last unanswered note from the first review: *"In the Loop Round 1, 15th
August. It's super basic ... I feel like we can still make it much prettier."* The fault was not the
size — 30px is `PageHeader`'s size everywhere and he has stopped "random massive fonts" twice. It
was that the head was a name over a middle-dot meta row, the construction he has attacked by name
three times (R4, R32, R44), sitting in the corner of an 856px column. So: the Round number goes,
which takes the dot with it (`architecture.md` §5 already said "no Round numbers, anywhere" and the
reader was the last surface breaking it); the date joins the title on one baseline at 20px; and the
Round is announced by the same cinnamon mark its questions are, at the width of the whole column,
fading right. Four other shapes are recorded as considered and not taken.

**The pressure corpus, driven for the first time.** `_fixtures/pressure.ts` was written on 09-05 and
nothing had ever rendered it. `?data=pressure` now swaps the `SketchRound` the whole spine draws,
through one adapter, so the list, the home and the reader are all judged on forty answers to one
question, a twenty-four photograph wall, a hundred people and links nobody has a resolver for.

**It found seven defects in an afternoon on surfaces four sessions had already looked at.** The
worst was silent: the room imported `ImageViewer` directly, whose last line is
`createPortal(…, document.body)`, so every server render of a page with a photograph threw, React
called it recoverable and rebuilt the whole tree on the client — 34,000 pixels rendered twice, with
green gates. `lazy-image-viewer.tsx` has said in its header since it was written that every caller
must come through it; that comment is now `image-viewer-import-rule.test.mjs`, proved to fail before
it was kept. Also: no `overflow-wrap` on the answer body (recon F18 alive inside the front runner);
links that could not be resolved were deleted and their answers vanished, while links that could
were printed above their own card; the rail was 4,000px and unreachable at the hundred-person cap; a
line clamp on a padded button bled its fourth line into the row below; and the corpus itself had
been minting one id for ninety-three people since the day it was written.

`npm run check` green (105 tests), `npm run visual` 25/25 run separately. Every screen read at 390
and 1512. Three questions for him are in the handover, 19 to 21.

## 2026-09-07 — the album importer stops copying the app, and a test stops pinning a shape

Refactor audit 2, `fresh-code-04`. Three sites carried copies of code they wanted to import, and
all three said so in their own comments: `import-album.mjs` re-implemented the 480px/q72 thumbnail
recipe *and* `exifBlockOf`, and `exif-date.test.mjs` pinned the SHAPE of `dateOnlyExif` — building
the allow-list by hand — rather than the function. The cause was one line of resolver mechanics:
`collection-photo.ts` imports through the `@/lib` alias, and a bare `node` resolves neither the
alias nor an extensionless specifier.

`THUMB_PX`, `gridThumb`, `exifBlockOf` and `dateOnlyExif` move to `src/lib/collection-image.ts`,
which imports `./image.ts`, `./exif-date.ts` and `./utils.ts` relatively and with extensions — the
shape `photo-suggest.ts` already uses and explains. `collection-photo.ts` re-exports all four, so
nothing under `src/` changed an import.

**The test now runs the real function**, and that is the half worth having: it composes the block
the app actually writes and feeds it to sharp, instead of agreeing with itself about what the app
probably does. Proved under bare `node` before committing — 480x320 WebP out of `gridThumb`, and
`dateOnlyExif` returning the one date tag.

Two documentation pointers moved with it: `TRAPS.md`'s "add a format there, not at a call site"
paragraph, and `media.md`'s thumbnail row.

Not folded in: `scripts/demo/add-photos.mjs` also says `THUMB_PX = 480`, but it encodes at q82 from
a path with plain `sharp`, so it is a different pipeline and not a fourth copy of `gridThumb`.

`npm run check` green (105/105); `exif-date.test.mjs` 18/18.

## 2026-09-07 — one mapping from a photograph to the viewer, and a sweep that keeps it one

Refactor audit 2, `fresh-code-03`. `toViewerImage` was written three times: in
`collection-client.tsx` and once in each of the two lab Collection rooms. The rooms' own headers
promise that every component on the page is "the REAL one", and the mapping that feeds the real
viewer was the one thing they copied — so both rooms drew a photograph the site does not draw: no
`alt`, no free tags, and the raw `area` value rather than `areaLabel(area)`. A room answering a
design question with the wrong picture is worth more than the thirty lines.

`src/lib/collection-viewer-image.ts` is now the only copy. **Not `collection-viewer.ts`** — that
name was taken, by a *server* module about the member doing the viewing, which imports Prisma;
one letter of meaning apart and importing the wrong one from a client component drags Prisma into
the browser. Both banners say so now.

**The pin is a sweep, not a list of three files**, because the third copy arrived by paste and the
fourth would too. `collection-viewer-image.test.mjs` walks every `.ts`/`.tsx` under `src/` and
refuses a second `` href: `/collection/${…}` `` inside an object literal, with a count guard on
the walk. Mutation-tested both ways: re-adding a lab copy fails it, and breaking the shape in the
home module fails it as "found 0".

Nothing visible moved. The lab rooms gain `alt` text and lose an empty-string Where; `canEdit` is
now true for the room's own eight fixture photographs, and the pencil is still never drawn because
the viewer needs `onEdit` as well and no room passes it.

`npm run check` green (105/105); `/lab/collection` and `/lab/collection/swap` both 200, no console
errors.

## 2026-09-07 — the two halves of the Collection keep their words in one place

Refactor audit 2, `collection-11`. Eight `scope === "class" ? … : …` ternaries decided what the
class half of the Collection calls itself, and they sat in four files: the page title and two
search labels in `collection-client.tsx`, the empty state's heading and body, the "Try a wider
bucket" line, the contribute dialog's title, and the quota refusal in the server action. Two of
the strings ("Search your class") were already written twice.

`HALVES` in `src/lib/collection.ts` is now the whole vocabulary of each half, beside
`defaultOrderFor`, which was already a per-half fact living there. Every string is byte-identical
to what shipped, including the curly apostrophe in "the valley's memory".

**Only the words.** The layout ternaries stay as JSX conditionals where they are — `xl:hidden`,
`xl:mt-0`, `xl:mt-[42px]`, and where the order menu mounts. Those are about the class half having
no bucket line, which is structure, and hiding structure in a copy table would make both halves
harder to read, not easier. And this is not extensibility: `scope-caret.tsx` argues the two-ness
is load-bearing, so a third half is not what the table is for.

`npm run check` green (103/103); `/collection` and `/collection?scope=class` both 200 with no
console errors.

## 2026-09-07 — the directory person is one type, derived from the select

Refactor audit 2, `directory-profile-08`. Audit 1's F-09 asked for one `PERSON_SELECT` and one
person type; only the select landed. The type stayed hand-written four times — `DirectoryUser` in
the action, `interface User` in the client, an inline props type on the card, and `PinRow` in the
page — so the select and its four readers could drift silently, which is the same bug the select
was extracted to stop.

All four are now `Prisma.UserGetPayload<{ select: typeof PERSON_SELECT }>` (and `PIN_SELECT` for
the map's rows), exported from `select.ts` and reached by `import type`, which erases, so a client
component can name a server module for free.

**`workplace` was being fetched and drawn nowhere.** 60 rows a page, 60 more on every Load more.
Neither `interface User` nor `ProfileCard` declared it; only `DirectoryUser` did, and
`DirectoryUser` had no importer. It stays a *searched* column in `where.ts` — a WHERE clause is
not a select. And the comment defending `currentCity` as "fetched to satisfy a type rather than a
pixel" was false: `ProfileCard` draws it in the meta line. Replaced rather than kept.

`npm run check` green (103/103); `/directory` and `/directory?q=a` both 200 with no console
errors, map pins and People cards unchanged.

## 2026-09-07 — one Overview worklist file, and the banner that argued for two

Refactor audit 2, `admin-analytics-06` (carried over unfixed from audit 1). `admin-worklist.ts`
held `WorkItem`, `QUEUE_LABEL` and `QUEUE_TONE` behind a banner reading *"Split from
admin-worklist.ts for the usual reason: that one is imported by a client component and this one
imports `prisma`"*. Nothing imports it from a client component. Its only two readers are
`admin-worklist-query.ts` and `admin/(index)/page.tsx`, and that page is a server component that
calls `loadWorklist()` inline; `WorkRow` and `QUEUE_ICON` live in the page.

A false banner is worse than no banner: it tells the next reader to preserve a split that protects
nothing. The three files merge into one, the Overview page's two imports become one, and the header
now records the rule the file genuinely keeps — the list and the rail's count are the same fact —
plus which of the four admin pairs are real seams (people, content and threads each *are* imported
by a `"use client"` file, and stay).

`npm run check` green: 103/103 tests, TypeScript and ESLint clean.

## 2026-09-07 — The visual suite stops crying wolf about a database write

`/catchups` was red on both viewports and no commit caused it. The live band is masked by marking
the elements under the page header, which covers the band at TODAY's height — so the strip between
the band's foot and the viewport's was still being compared, and that strip is empty background only
until the content grows into it. Six more Catch-ups arrived, the band grew about 160px, and the
suite failed for a database write.

The block comment above the masking already stated the intent — "the content under the page header
is covered" — so this is that sentence implemented: one fixed rectangle from the band's foot to the
foot of the viewport, appended at run time and dying with the context.

**Constrained to the band's own x-range, never the full viewport.** The first attempt used
`left:0;right:0`, which masked the sidebar and cut through the serif title on all five band routes,
and the comment directly above promises the sidebar, the gutters and the background are still
compared. With the x-range constraint the change is surgical: `feed`, `letters`, `collection` and
`collection-class` all pass **unmodified**, and only `catchups` — the one route with an actually
uncovered strip — needed a new baseline.

25/25 visual, `npm run check` green.

## 2026-09-07 — three tree sweeps stop reading what they cannot be about

Refactor audit 2, `lib-tests-05`. `identity-row-overflow-rule` walked all 688 files under `src/`,
decommented every one and split it into lines to look for two class names that 123 of them can
even contain. It reads the bytes first now and drops the rest: **152 ms to 75 ms**, measured four
runs each way. `notification-links` did two full walk-read-decomment passes in one process; one
module-level array serves both, and the second filters it instead of walking again (126 to 108 ms).
`loading-boundary-rule` re-walked each skeleton's own directory for a `page.tsx`; it uses the walk
it already did.

**The pre-filter is why this row was still open, and the guards are the point.** A sweep that
filters its file list and then asserts "no offenders" passes for ever over an empty loop.
`identity-row` had no count guard at all — the finding says it kept one; it did not — so it now
counts the files that survived the filter (123 today, floor 40) *and* the `overflow-*-visible`
lines actually read (floor 1, naming `identity-row.tsx`). `loading-boundary` gained one for both
its walks. All three were mutation-tested: break the filter, break the match, shorten the list, and
each fails with the number in the message.

One accidental widening closed on the way past: `notification-links`' /settings sweep passed
`skip: ["node_modules", LAB]`, which REPLACES the kit's default rather than adding to it, so it had
been reading and decommenting the 46 files of generated Prisma client on every run. 606 files down
to 560.

**The audit's timings for this row are all stale** — it cites 1,064 ms for the identity-row sweep
and 165 + 189 ms for the two notification ones; today they are 152 and 126 for the whole file. The
saving is roughly 100 ms of CPU per `npm run check`, not the 1.3 s claimed. Worth doing for the
vacuity guards, not for the clock.

## 2026-09-07 — the Playwright suite signs in the way everything else does

Refactor audit 2, `scripts-e2e-ci-14`. `e2e/auth.setup.ts` hand-rolled the dev-login that
`scripts/qa/_dev-login.mjs` was written to own — the tenth copy of the block that helper deleted
nine of, in the one file nobody thinks of as a QA script. `devLoginContext` existed for Playwright
and Playwright alone and had no caller at all; it has one now.

Three behaviours had already diverged and the helper's are the right ones: it passes
`redirect: "error"`, so a proxy that stops treating `/api/dev-login` as public fails loudly instead
of following the bounce to `/login` and reporting a confusing missing cookie; it names both cookie
spellings instead of trusting `storageState` to pick up whatever is there; and its 404 message
lists all three causes. Its own `requireSecret` throws a better message than the local
DEV_LOGIN_SECRET check, so that check and the ADMIN_EMAIL one are gone.

Kept on purpose: the `goto("/")` plus `assertSameOriginAfterNavigation` — the helper does not
navigate, and the origin has to be checked before a cookie is minted against it — and the
`/feed` redirect assertion, which proves the cookie authenticates rather than trusting a 200.
Gate: `playwright test --project=setup` passes in 2.6s.

## 2026-09-07 — one answer to which Chrome, and mobile shots that are actually mobile

Refactor audit 2, Phase E: `scripts-e2e-ci` 03, 04 and 15, which the campaign file says are one
commit because 15's Chrome and 03's viewport are parameters of 04's shared module.

**The `/Applications/Google Chrome` literal was typed out fifteen times under four policies**, one
of which resolved to `undefined` — the six phase probes passed
`executablePath: process.env.PUPPETEER_EXECUTABLE_PATH` and were safe only because `bootstrap(...,
{ chrome: true })` had set it a few lines earlier. `crawl.mjs` and `verify-shot.mjs` passed nothing
at all and made the caller export it, which is why CLAUDE.md gotcha 2 and `scripts/README.md` each
carried a paragraph about a trap that now stops existing. There is one answer: `chromePath()` in
`_probe-kit.mjs`, `existsSync`-guarded so it still degrades to puppeteer's own browser on a machine
that is not this Mac. Twenty-two launch sites call it. Smoke-run: all three screenshot commands and
a bare launch, with no `PUPPETEER_EXECUTABLE_PATH` in the environment.

**Finding 03 was 80% already fixed** — `screenshot-auth.mjs`, `verify-shot.mjs` and
`theme-shots.mjs` got the phone's pointer in `23bae4f` on 2026-09-05. `_dir-room-shots.mjs` had not,
and has it now.

**`_shoot.mjs` is the shot itself**: which Chrome, what `--mobile` means, where the file lands, and
the networkidle2-with-a-domcontentloaded-fallback the two screenshot scripts had and `verify-shot`
did not — so `verify:shot` stops reporting NAV-ERR for a page that loaded perfectly well. The three
commands stay three commands and keep only their argument parsing: 67 + 118 + 48 lines become 19 +
53 + 31 over a 179-line module.

## 2026-09-07 — Refactor audit 2, the owner's answers in

His reply to the 28 questions is recorded verbatim in the campaign file with a reading per row, so a
worker argues with the reading rather than the paragraph. Three readings are deliberately
conservative and each is offered back to him at the close.

**Q3 overrides Q18 where they collide.** He said "delete all" to the unread database columns and,
separately, "fixing that separately leave it alone" about the song feature. The Catch-ups rework
campaign is live in this same tree, so the three song columns are the one item in that table that is
not touched. **`User.currentCity` and `secondaryCity` are not reachable by "delete all" either** —
the row he read said they hold members' own data and that nothing here touches them.

**Reduced motion is now a standing product decision, not a row.** His words: "reduce motion
shouldn't be considered anywhere... don't make anything boring because they have rduced motion on."
The two violations stay, DESIGN-SYSTEM §7 gets rewritten to say so, and nothing that already honours
the setting is stripped out — he answered a question about adding two guards, not about removing
every existing one.

The board gains two rows: letters get Report, Edit and Delete (Q15b, real feature work), and Phase G
shrinks to the demo exclusion because Q27 parks its five rebuilds for a proper write-up.

## 2026-09-07 — the reader adapts to the window, and the feed's dots stop pushing the icons down

**The carousel was making the heart and the comment icon drop.** His: "the carousel navigation
doesn't even interfere with the icons because they're at the sides and it is at the middle. So just
let those icons be where they were going to be anyway." The dots were a band of their own, 14px
tall, above the action row. They are drawn out of flow now, 21px below the photograph, which is
measured rather than guessed: with the band gone the row starts 8px under the photograph and is 32px
tall, so its centre is at 24 and a 6px dot starts at 21. Verified: the heart's centre and the dots'
centre both sit 24px below the photograph, and the row is exactly where a post with no carousel puts
it.

**The laptop had been built for one window width.** His: "you've not finetuned the response to
changing the window size ... remember that at each window size it has to look amazing ... at some
point you might [want] to remove the navigation and swap it to the phone method of questions to save
space." So there are three layouts, not two, and the third is his idea: the rail is on whenever
there is room for it (a 520px column plus the gutter plus a 280px rail, which is a 1180px window)
and off whenever there is not, and below that the strip comes back as a floating card at the top of
one column, exactly the phone's mechanism. Measured across 1024, 1180, 1366, 1512, 1920 and 2560: no
horizontal overflow anywhere, both gutters equal at every width, and the reading column growing 524
to 900 before it stops.

Capping the two columns as a block and centring them was tried first and was worse: at 2560 the
reader became an island with a thousand pixels of nothing beside it. Both columns stay flush to the
page's gutters and only the space between them grows.

**And the floating question is gone from the wide laptop**, because the rail already names the
question: "on desktop don't have the question floating. I can see it in the sidebar." On the narrow
laptop the header drops its Round and date instead, since the strip is carrying them and printing
both would be the thing he has objected to twice. The head now sits 36px above the first mark rather
than 56, which is half the 72 between questions, so it reads as attached to the Round.

## 2026-09-07 — the reader's type goes on the app's scale, and the swell goes continuous

Three of his, after looking at the laptop view.

**The type was chosen by feel and it showed.** "Don't be so flippant and casual with font sizes
please make sure they're in line with everything on that page and standard sizes we use in the rest
of the website unless you have a good reason for not doing that." The Catch-up's name was 44px,
bigger than anything else in the app. It is 30 now, which is what `PageHeader` sets on the Feed, the
Directory, the Collection and Letters, and what the Support page hand-writes to match. The question
headings were 30 on a laptop, the same size as the page title above them, and 24 on a phone; they
are 24 on both now, which is `h2` on the documented scale. The rail was 16 and pulled the eye off
the page: "my eyes go there instead of the content when it should just be a navigation thing." It is
14, the scale's `small`, still serif and still spaced out.

**The magnification was stepped, and he named it exactly.** "I feel like the navigation is more
discrete and in these steps compared to the more macos dock magnification which is more continuous."
It was: the first cut found the nearest row and scaled by whole rows away, so three rows had three
fixed sizes and moving the pointer inside a row changed nothing. It is now a bell curve on the
distance in pixels between the pointer and each row's middle, so every pixel of movement changes
every row a little, which is what the dock does. Measured: moving the pointer 10px changes four rows
at once and the peak drifts smoothly between them.

## 2026-09-07 — the feed's photographs run edge to edge

One change, on its own, so it can be reverted on its own. Owner: "I think we should also make that
edge-to-edge picture thing, make that change even in the feed. Let's just see how that works ...
keep that as one nuclear commit that I can revert."

A post card's photographs now bleed to the card's edges instead of sitting inside its 16px padding.
The card clips its own corners, the photographs drop the radius and the side borders they used to
draw against nothing, and everything else about them is untouched: three or more is still a
carousel, two is still a justified row, one is still the shared frame, and every one still opens the
viewer at itself. Measured at 390: a carousel spans the card's full 348px content box.

Reverting this commit puts the padding back and nothing else moves.

## 2026-09-07 — Catch-ups front runner, his first round of notes

His review of the front runner, and the two bugs in it root-caused before anything was redrawn.

**The navigation was not fixed, it was drifting, and the cause was the room rather than the
design.** "The in the loop and the question are supposed to be fixed, but they actually move very
slowly ... so that by the time I'm on the 6th question, it's totally out of the screen." Measured:
a `position: sticky` element inside a `transform: scale(s)` drifts at exactly (1 - s) of the
scroll, because the browser resolves the sticky offset in the untransformed space and the scale
then shrinks the correction. At 0.92 that is 1,487px of drift over 20,000px; on the laptop frame
at 0.95 it was 914px. The scaling frame existed only so a fixed-width drawing could be shrunk to
fit, and it has been deleted: both views are fluid, sticky is native, and the strip now measures
56px from the top at every scroll depth and every window width.

**The birds were not left-aligned, and the layout was not why.** Every avatar box in the column
starts on the same pixel. A photograph is clipped to a full circle and fills its 40px; a bird is
drawn inside r~45 of a 0..100 viewBox, so its ink spans about 32px starting 4px in. The feed has
the same 4px, it just never stacks twelve avatars in a column. Fixed here by measuring each
glyph's real ink box and sliding it left by its own inset, sizes untouched, so every mark starts
on the same pixel. The app-wide version of that is his call, not a lab room's.

**The rest of his notes.** Replies are the feed's row now (bird, name inline, the words after it),
opening and closing animated. A docked question stops at three lines and then cuts, which he
weighed himself against the eight it used to allow. The laptop columns fill the page again, 1184px
with equal 40px gutters, matching the shipped reader's proportions he said were better. The rail is
serif, bigger, further apart, cinnamon rather than green, marked by colour and never by weight, and
it swells under the pointer without reflowing. A far jump no longer fast-forwards through thirty
thousand pixels; the page lets go, cuts, and the new question rises into place.

One regression of my own, caught in a screenshot: the arrival wrapper had one child, so the
`space-y` on the box outside it applied to nothing and every question ran into the one before it.

## 2026-09-07 — Catch-ups front runner: the strip is the navigator (S3c)

One reader, drawn by one hand, live at `/lab/catchups/sketches`, after he rejected all fifteen
sketches ("There is nothing here that I prefer to what is shipped"). The fifteen are deleted, as
he allowed; the room is now that one reader in three views: the phone page live, five stills of
moments deep in it, and the same page at 1512.

**The invention goes in one place.** Every rejected design restyled the answers, which he kept
saying were fine, and drew the same navigator. So the answers are paper tiles at the feed's own
sizes, and the one bespoke object is the strip under the app's green bar. At rest it says
"Round 1 · 15 August 2026", the one place either is printed. Once a question's heading has
scrolled under it, it carries that question in full: a 300-character question is five lines and
none of them is cut. A cinnamon line along its top is how far through the Round you are. Tap it
and it unfolds downward, in place, into the list of questions, where the same line runs down the
left and stops at the question you are in. That stopping point is the current-item mark he did
not want as a dot or an underline. The navigator is also drawn as a paper sheet from the foot and
as a full-screen contents page, because he asked for the one style done properly and then done
several ways.

**The phone drawing is live, not a still.** It scrolls, spies on its own headings, opens, and a
pick glides at a speed that grows with the distance rather than jumping. That is what found the
fault a still could not: the first rule put a picked question's heading under the strip while
the strip still named the question before it. The reading line is now the strip's foot plus the
landing breath, so landing on a question makes it current, and the strip shows the Round while a
heading is on screen.

Two traps for the record: a `<button>` centres its own text, so a label inside one needs
`text-left` however its parent is set; and a `overflow-x-auto` wrapper is a scroll container,
inside which nothing sticky sticks, which is why the harness only wraps the full-size laptop
drawing when the lab chrome is on.

## 2026-09-07 — Catch-ups: all fifteen sketches rejected, and what replaces them

He went through every sketch out loud, one at a time, and rejected all fifteen: *"There is nothing
here that I prefer to what is shipped"*, and *"you are okay to delete everything else."* That review
is now `docs/planning/catchups-rework/review-2026-09-06.md`, verbatim, 51 numbered paragraphs, given
the same treatment as `brief.md` because a summary of it would lose exactly the detail that makes it
useful. It outranks `directions.md` everywhere the two disagree.

`front-runner.md` is what a builder actually works from: twenty-two settled rules with his own
sentence beside each one, and the five problems none of the fifteen solved. The settled list is
mostly reversals of things two passes had assumed. Tiles are back, because small type on the
textured background is not readable and letters only gets away with it by being bigger. Green is not
a surface. One type scale, with no length-dependent promotion. Persistent navigation, and if there
is a green bar it is the top one. No counts of anything, ever.

The five unsolved problems are the actual work: a persistent bar that can carry a ninety-character
question without truncating it; what the current-question indicator is, given that a dot and an
underline are both out; a question navigator that is not the same mediocre sheet fifteen times; a
short answer in a tile, when shrinking the tile and enlarging the type are both already rejected;
and whether the result is materially better than what ships today, which is the only test that has
ever mattered here and the one nothing has passed.

Recorded in the same breath, because it is the trap the next session will otherwise fall into: the
directory, the Collection's year rail, the profile page and the login flow were named as examples of
a FEELING of having solved something completely, not as a parts bin. *"You have to make what is
right for this. You can't just copy elements from that."*

No code changed. The session stopped before the rebuild at his instruction, with the tree clean.

## 2026-09-07 — Catch-ups S4: the architecture, and the two surfaces that carry it

The reader was drawn and reviewed twice; this session did the part he says matters more — *"the
structures between, behind these pages. How they relate, how you access everything."* The settled
shape is `docs/planning/catchups-rework/architecture.md`, which supersedes `directions.md` Part 1,
and both surfaces are live at `/lab/catchups/sketches`: the list, a Catch-up's home in all seven
states, and the reader, joined up so the moves between them can be walked. Navigable rather than
stills, because a dead end in the relationship between pages is invisible in a picture.

The one idea is that a Round's contents — its questions, hung off a vertical measure — is a single
component at two depths: the cover on a Catch-up's home, and the navigator inside the reader. That
retires the campaign's oldest complaint by construction, since one Round drawn ten ways on four
surfaces becomes one file. The measure's colour is read/unread on a cover and progress in the
reader, which is coherent only in that direction: warm has to mean read, because a full measure is
what the reader leaves behind.

The rest falls out of one rule, that a card is a door and the whole card is the target. The dead
"Round 1 is out" tile, the View button, "open it on its own page" and the stray three dots all stop
existing rather than getting redrawn. Fresh off the press is deleted outright and its job — what is
new to read — is done by the Catch-up's own card. The roster becomes a column on the home at a
laptop's width and the same list opening in place on a phone, which deletes the people dialog *and*
the sheet that was going to replace it, so the next session has one surface fewer to draw.

Two changes are his, given mid-session and recorded verbatim in `review-2026-09-07.md`. First the
picture: Catch-ups is the only surface in the app with no imagery, which is why it reads
"functional and corporate", so every Catch-up now carries a photograph from the day it is made,
from a pool of about twenty he will supply. Then, seeing it drawn, he took the Round's questions off
the list entirely — overcrowding, for a page that is navigation. Both were right and both were
cheap, because the questions were still on the home.

Four list shapes were drawn and three thrown away: a two-column grid of unequal panels, which locks
into rows and left a 165px hole mid-page; CSS columns of the same, where the balancer stranded the
tall one and left a 470px void; and a wide row with the identity in a 240px margin, which had no
holes and was a page of text. Equal picture cards only became possible once the picture arrived to
make every card the same height. The reasoning is in `_list.tsx` so nobody re-treads it.

Gates green; `npm run visual` 25/25, run separately. He owes four answers and about twenty
photographs; the paste line for the session after is at the foot of the handover.

## 2026-09-07 — Catch-ups S4, second pass: the rail comes back

He read the first pass and found the home worse than what ships, and the diagnosis he gave was
right at the root: *"the level of critical thinking and brainstorming and planning and rigor has
significantly dropped."* The first pass designed the *shape* of the home and then filled it by
putting controls in a row of equal pills under the content, so they belonged to nothing — *"nudge
everyone, close now, just hanging in the middle of nowhere ... arbitrarily there. There's no
sense."* The cause was one deletion: the shipped home has a right rail, this design removed it and
put the people there, and every control lost its address.

So the second pass started from the work that had been skipped — a full control inventory read out
of `actions.ts` and its guards. Twenty-three controls exist, classified by whether they belong to
the Round, the Catch-up or you, and by whether they can be undone. **Three do not exist at all**:
starting the next Round early, which he found himself on a test Catch-up (`openNextRoundIfDue`
fires on the clock alone and no action anywhere starts one); renaming a Catch-up, which has no
action either; and changing the picture, which is new.

Out of that came the rule that stops it happening again: **a control is either the page's one
primary action, in the content, attached to the thing it acts on, or it is in the rail.** No third
place. The rail is Reminders, This Round, This Catch-up, People, in that order — People last
because it is the only unbounded block, and with it first Reminders landed 1,500px down a Catch-up
of twenty-four. One-way controls carry a cinnamon dot and confirm.

Three things fell out of thinking about reversibility. **A batch Catch-up has no manual transitions
at all** — it runs on its rhythm, so nobody can open answering by accident, which was his
objection. **`preparing` is deleted**: checked, it is a hard-coded 24-hour hold in which nobody,
Keeper included, can read anything, and "Publish now" exists only to skip it; answers now close and
the Round comes out at the same moment. **A card always opens the home**, because the thing he
hates most about what ships is not knowing where a click will land.

Two of his own calls landed the same day. A published Round's cover is now **its photographs**, not
its questions: *"it looks like work, honestly. It's not like an appetizing, beautiful thing you want
to click."* And the picture stopped being a mark beside the name and became the thing itself — the
list card IS the photograph with the name written across it over a fade, and the home opens with a
Notion-width banner.

`npm run check` green. `npm run visual` red on `/catchups` at both viewports and it is not this
work: the diff touches no shipped file, and that route photographs live data he was adding test
Catch-ups to while this ran. Baselines deliberately left alone rather than baking a throwaway in.

## 2026-09-07 — The install button, and Samsung's broken minting server

The owner pressed Install on his Galaxy and Android answered with a red Play Protect sheet: *"Unsafe
app blocked. This app was built for an older version of Android and doesn't include the latest
privacy protections."*

Nothing is wrong with this site. Android installs a web app as a real signed package, and that
package is built on the browser vendor's own minting server, not by us — so `src/app/manifest.ts`,
which is complete and correct, has no say in it. Chrome's server stamps a current
`targetSdkVersion`; **Samsung Internet's is stamping one below 34**, which Android 14 and up refuse
to sideload. It is a live Samsung bug hitting every installable web app, not just this one;
Progressier gave up and started routing Samsung users to Chrome in March.

Which is what the tile now does. A third road beside iOS and Chromium: `isSamsung()` next to the
existing `isApple()` sniff, and an **Open in Chrome** button that fires an Android `intent://` URL
carrying the current address, falling back to Chrome's Play Store listing on a phone that has none.
Deleting `isSamsung` is the entire undo if Samsung ever ships a fix.

Verified the tile's own geometry rather than guessing: injected both roads' markup against the real
stylesheet at 390x844 and measured. The new copy wraps to two lines and the card comes out at
**133px, identical to the Chromium tile beside it**, so the longer sentence costs no height. The
`intent://` hand-off itself is untested — that needs an actual Android phone, and it is the one
thing here I could not prove.

Timing was lucky. The tile is still admin-gated (`profile/[id]/page.tsx:455`), so no alumnus ever
saw this, and Samsung is a large share of Android in India.

## 2026-09-07 — Refactor audit 2, Phase D: four switched-off subsystems come out

**D11b — the composer's dead `placeholder` prop.** `CreatePostForm` took a `placeholder` no caller
has ever passed, resolved it through a `ComposerScope` type and a `SCOPE_PLACEHOLDER` map that
existed to hold two strings, and then retyped the letter one as a literal further down the file. Two
named constants now, the owner's 2026-08-04 wording note kept above them, and one fewer prop on the
app's biggest client component. −16/+8.

**D11a — the `pending` filter branches the review room left behind.** `/admin/content` redirects
`?type=pending` to `/admin/review` on the raw search param, before the filters are ever read — so
the four branches downstream that still understood `pending` (an approved-false predicate, an
oldest-first `orderBy`, an oldest-first merge sort, and a member of `ContentType`) could not be
reached by any call the app can make. Out, with the thirteen-line comment that explained an option
nobody can pick, and the page docblock that said the review queue lives here. −19/+9.

**D4 — the second photo-review screen on `/admin/content`.** Built 2026-08-28, replaced two days
later by `/admin/review`, and left standing: a per-row Approve and Decline on any unapproved
photograph in the general list, a tick box drawn over its 64px thumbnail, and a "N waiting / Tick
all / Approve N" bar above the list. The spec has said since 2026-08-30 that what stays on this page
is the count as a link; the code did not. It is the count as a link now, and every row's actions live
behind the same "..." menu the rest of the list uses. `approvePhoto` and `approvePhotos` went with
it — the review room's `saveReview` is the only write that lets a photograph into the Collection.

`approveChosen` went too, and it was a live B-042: it called the action directly rather than through
`callAction`, and cleared `approving` as a trailing statement rather than in a `finally`, so a
rejected batch left the Approve button disabled for the rest of the session.

**The C-074/C-130 pin moved with the code it pins.** `image-purge-rule.test.mjs` read all four of its
assertions out of `collection/actions.ts`; two of them were about `approvePhoto`. They now read the
review room's `saveReview`, and they read the variable name out of the `updateMany` rather than
hard-coding it, so a rename cannot quietly empty them. Mutation-tested both ways: `updateMany` →
`update` reds it, dropping the `count === 0` check reds it. −292/+79 across four files.

**D1 — the feed's sort and time filters.** `<FeedColumn showControls={false}>` has been the feed's
only render since `096a034` (2026-06-28), so the disclosure holding "Most recent / Most liked / Most
discussed" and "Today / This week / This month / This year" has not been on screen for ten weeks and
nothing else writes either value. Everything conditioned on them went: the block and its `Input` and
`Select` imports, the two state hooks, the `showControls` prop on both components, `getTimeFilterDate`
with its valley-day arithmetic, the `sortBy`/`timeFilter` options on `loadPosts`, and the offset-paging
arm the count sorts existed to reach — an entire second query path out of the feed, `skip` included.
`loadPosts` is keyset-only now.

The `offset:` guard on the cursor decode stays on purpose: a page left open from before this reads its
old `offset:N` cursor as "start from the first page" rather than as a post id. Three audits had fixed
bugs in the arm that went (Low 48's valley-day boundaries, Low 79's negative-skip clamp, B-122's
tie-break) — none of it reachable. Paging proved live by temporarily dropping `PAGE_SIZE` to 3 and
loading three pages: 25 posts, 25 unique, no repeats. −208/+50.

`npm run check` green (105 tests), `npm run visual` 25/25 — no baseline moved, which is the point: none
of this was on screen. Screenshotted `/feed`, `/feed?q=`, `/admin/content` and `/letters/new` at
1440x900 and 390x844.

## 2026-09-07 night — S4d, round two: Editions, the composer, and three bugs he spotted

The same session, continued through about fifty more notes sent while the work ran.

**The noun is Edition**, twice-said: *"let's not use Round or Issue"*, then *"Editions not
additions."* Every user-facing string changed; the TYPES did not, on purpose for one pass — the
database already says `CatchupEdition` while the shipped reader's URL says `round`, so the rename
wants doing across schema, actions, routes and room together rather than starting scattered in a
lab room. A published Edition is now dated in full, because with the number gone the date is its
name and a shelf of them spans years; the live deadline stays year-less.

**Photographs on an answer.** The strip sits between the writing box and the controls so it grows
downward and never moves the sentence being written. The container animates 0 → auto so everything
below travels once; tiles rise 8px and fade; removal uses `popLayout` so survivors slide into the
gap. Exit 180ms against 280 in. The remove control is always visible rather than on hover, because
half the people attaching a photograph are on a phone.

**Three bugs he found, all root-caused rather than patched.**

The reader painted the narrow layout for one frame before the wide one. `useState(false)` plus an
effect is correct during hydration and wrong on a client-side mount, which is how the room reaches
the reader. `useSyncExternalStore` is correct in both; measured over 30 animation frames after the
click, no wrong frame at all.

Clicking a person in the People dialog landed on their profile drawn without the app's sidebar —
`main` at left 0 and width 1512 instead of 248 and 1264. A client-side navigation from `/lab` into
`(main)` crosses two layout trees and the `(main)` layout does not take over. Nothing is wrong with
the profile and nothing will be wrong when this ships inside `(main)`; the lab has to leave by a
full page load.

And the Pressure pill had never worked: which corpus is drawn is decided by the SERVER component
off `searchParams.data`, and the pill changed the URL with `router.replace`, so it lit up and the
page kept drawing the real Round.

**Deleted**: the Screens tab and the two navigators he did not pick, `_frames.tsx` with them, and
the default "Batch of <your year>" typed into `/catchups/new`'s Name field — a form that makes a
Catch-up with people you choose, pre-filled with the one name it is least likely to want.

**The swell came down twice**, 40% each time and both off the growth rather than the number:
1.14 → 1.084 → 1.05. Reach stayed at 120px, which matters more at low amplitude, not less.

**Parked with his decision recorded, not built**: the list's spare slots (four tiles; Catch-up cards
first, recent Edition covers filling the remainder) and S-features, the feature brainstorm he has now
asked twice not to lose.

## 2026-09-07 — S4d, the Catch-ups room: his first round of fine-tuning notes

`/lab/catchups/sketches`. He went through the whole spine out loud, then sent seven more notes
while the work was running. Everything below is his; where a number appears it is his number or
one measured against the app's own.

**The reader.** The Round NUMBER is gone from every surface in the drawing -- "let's ditch the
round 1. Let's only have the date, and then let the date be orange. The round number is
irrelevant" -- which takes the middle dot with it and retires `RoundLine`, unused for two passes.
The heart and reply row is a tenth tighter above and below: measured, the ink sits 21px under the
words and 23px above the card's edge, so a tenth of each is 2px, which is what came off. The side
padding is untouched, at his instruction.

**The question rail's magnification is rebuilt from scratch**, at his word: "it's super glitchy
and jittery ... things react early and late". Three real faults. It kept the pointer in React
state, so every pixel of movement reconciled eleven rows. It cached row centres in an effect keyed
on the CURRENT QUESTION, so they were stale against every resize. And it wore `transition:
transform 90ms linear`, a CSS animation restarted every frame toward a target that had already
moved. It now uses the app's own mechanism -- the Collection year rail's: a motion value for the
pointer, a transform reading each row's live rect, a spring on the scale. Zero React renders per
frame. The reach is 120px rather than the Collection's 64, because these rows wrap to three lines
and measure 41-79px; at 64 one row popped alone.

**The home is largely rebuilt.** The picture carries the name from its bottom left and two icon
controls hard right, one row at both widths; People opens a dialog and the Catch-up's settings open
another, so the sidebar holds the previous Rounds and nothing else ("just put the previous rounds
there"). The settings dialog was a column of bare verbs and is now a settings list: an icon tile, a
label, what it does, and where it stands, with the irreversible ones saying "cannot be undone" in
words instead of wearing a dot that needed a footnote. Reminders is a row among them, not a
separated pill.

Collecting draws the shipped questions panel on the page -- reorder and remove included, which the
drawing had lost -- with the controls riding on the asker's line so a tile is not a row taller than
it needs to be. Answering happens HERE too rather than on its own page, and its progress marks are
the navigator: every mark is a button to its question. `preparing` was already gone; `no Round yet`
goes now, because a Catch-up starts collecting the moment it is made.

**The pictures were judged rather than picked by filename.** `v1.webp` and
`demo-banyan-pillar.webp` are the same photograph, which is why two list cards looked identical;
`demo-assembly-wide.webp` is 760x1140, portrait. Both dropped. Each survivor now carries the band
its wide crop is taken at, because what makes these read as a place -- a horizon, the stone
benches, the ground -- is in the lower quarter of every one, and a centred 240px band returns green
texture. The banner is a fixed height rather than a ratio, so a wider window shows more photograph
rather than a thinner slice.

**Two things the app already had and this page had reinvented.** The list's primary action is the
standard `default` pill again, not a size down. The two-column grid is `rail-grid.ts`'s own 318px
rail and 30px gutter, not an invented 300 and 56, and the page no longer caps at 1096 -- which is
why the right margin was 148px against the left's 40.

**The type rule, written down** because he found the two faces doing the same job one line apart:
serif is a title or a name, sans is the app talking. `globals.css` puts the heading face on h1-h4,
so every label now says `font-sans` explicitly.

`npm run check` green (105 tests). Every screen read at 390 and 1512 across eight rounds. The
`sidebar.tsx:132` protocol finding is `bed93ca`, another session's.

## 2026-09-06 — Catch-ups rework, S3: ten directions and the sketch room

The shared architecture was written first and alone, then re-tried call by call after the owner's
mid-session line to brainstorm before deciding; five of its binding lines loosened, with the paths
not taken kept in the page. Ten designers then wrote ten whole-concept directions from it (seven
with the recon, three blind to it), each to the same eight sections; ten Opus judges scored them
against the brief with quotes, an adversarial judge hunted for today's layout in every one and found
none, and a three-lens panel picked the direction he would still be thinking about tomorrow, the
same one three times: the app's green bar becoming the reader. The first workflow died on the
session limit with four directions on disk; the rerun read them back and wrote the rest.

**`/lab/catchups/sketches` is the cull.** Ten tabs, and for each the real "in the loop" Round drawn
three ways on a phone and once at 1512, in a frame that scales a fixed-width drawing to fit. Ten
Opus builders drew them from the direction files, one file each, without a browser; every drawing
was read at both sizes here. Two things the batch taught: ten designers converged on the same
two-part phone navigator and the same boxless short answer without being asked (handover F24), and
not one designed the page where answers are written (F25), which is now owner question 8.

Tooling: `screenshot-auth.mjs --full` scrolls lazy images in first, and its header records that a
2x full-page capture over about 8,000px with a backdrop blur comes out blank (F27). The MCP browser
cannot be signed in from a session (F28). `directions.md` holds the architecture, the ten, the
judges, a room brief each for S4, and the lean.

## 2026-09-06 — Sidebar mark goes flat cream

The sidebar/mobile-header lockup painted the PeaksMark in three shaded planes
(`variant="two-plane"`). At 24px the middle and Rishi planes read as smudges, so
the mark is now the plain silhouette in the lightest of those three colours,
`#EAF1DF`, against the dark green rail. Visual baselines for all nine authed
routes moved for the mark alone; diffs checked before accepting.

## 2026-09-06 — Catch-ups, the sketches redrawn by hand

He read the ten directions and rejected most of them: *"80% of the designs have just no taste at
all"*, *"the way you prompted your subagents led to a somewhat convergence on design"*, *"So
freaking just do it yourself I give up. There's no rigor."* He is right about the cause, and it is
now handover F32. Ten builders sharing one brief and one contract can only differ in ornament,
because the brief has already fixed everything structural. Nine of the ten drew a card per answer
under a heading.

Redrawn here, one hand, against the real Round. Six deleted (a question per page, twice; the name
signed at the foot; three that were the same drawing), three moved to the Catch-up's home where
their ideas actually live, one rebuilt. Five now: **the one I would build**, **the question is
printed on green**, **each question is laid out for what it is**, **the question rides with you**,
**one person at a time**.

His review is a table in `directions.md` Part 6 and is enforced in `_parts.tsx` rather than left to
memory: at most two facts in a meta line, no counts at all, no batch line under a name, the feed's
own heart and comment icon in the same corner of every answer, comments closed until tapped, no
status dots, no question numbers, and the shipped Round page's own two-column grid quoted so a
sketch cannot invent a margin.

The one idea he did not ask for: ¶31 says a short answer looks lost in a big tile, and he has
rejected shrinking the tile, so the box stays and the TYPE moves. Under 45 characters an answer is
set in Baskerville at 25px, and a question whose answers are all short becomes a grid of display
lines. "Describe your month in 3 words" goes from eleven full-width paragraphs to the best-looking
question in the Round at a fifth of the scroll.

Three faults in the shipped app fell out of drawing it. **Spotify album art has never rendered**:
the oembed now returns `image-cdn-*.spotifycdn.com` and the CSP allowed only `i.scdn.co`, so every
cover was refused with nothing but a console line, found on a real answer reading "Honestly I just
want to see if the album covers render properly" (F29). **The songs question resolves nothing**,
because the resolver only fires on the composer's dedicated field while people paste links into the
body (F30); the sketches parse them and draw them, YouTube included, which needs no key. And a
**bottom-sticky bar inside a transformed frame** fails two separate ways, both measured rather than
reasoned about (F31).

## 2026-09-05 — Refactor audit 2, campaign gate 1

The campaign's questions are written and the owner is asked once: 28 of them, merged down from 61
separate asks across the report's eight big decisions, its fifty-row table and each phase's own gate.
Every one carries a default, so the whole batch answers in a sentence.

**Every Phase D column `SELECT` is run, against production and the demo, before the questions rather
than after them — and two results change an answer the audit had already reached.** `User.currentCity`
and `secondaryCity`, filed as "two legacy city columns", hold 56 and 5 of 70 members' own data; they
are not empty and nothing in this campaign touches them. `Image.greyscale` is 3 of 53 true, not zero.
Confirmed empty and safe to stop writing: `Photo.area`, `Photo.freeTags`, the three Catch-up song
columns, `Post.groupId`, `OutboundEmail.bounceKind`. Confirmed full, and therefore keepers:
`Photo.approvedAt`/`approvedById`, `ContentView.firstAt`/`lastAt`, `MetricSnapshot.capturedAt`.
No DDL was run and none will be: the removal commands go to the owner at the close.

The ledger's three "the SELECTs are still unrun" lines were stale and are corrected in the same edit.

## 2026-09-05 — Catch-ups reconnaissance (S1)

Forty-three findings, measured on the running app rather than felt: 24 confirm something the
owner named, 2 are marked NOT REPRODUCED, and 17 are new. `docs/planning/catchups-rework/recon.md`
groups them by surface with a root cause per bug and a ranked ten at the end; `flows.md` is the
click map and the intent-by-state matrix he asked for.

**The green bar that seventy members can see is root-caused, and the fix is not the bar.** A
pasted Spotify link's scheme-host-path is 54 characters and 369px with no break opportunity; the
reader's answer paragraph is 316px and has no `break-words`; none of its fourteen ancestors clips;
only `html{overflow-x:clip}` holds the page still, and the mobile header is `position: sticky`, so
it cannot follow a sideways pan. Also root-caused: the divider that curves (a `border-t` on a
`rounded-md` box, so CSS draws it along the corner arc), the hover with no padding on three sides,
the rail item that reflows when it bolds, the viewer's 552-to-311px size snap, and the heart whose
pop waits on a lazy-motion chunk that lands at 5,239ms on a 49,464px page.

**Two groups are named "Batch of 2024".** The real batch has no Catch-up; a hand-made snapshot has
it, and an alumnus who joined five days later is not in it. Recovering the history answered the
owner's question about the batch Catch-up disappearing: it never existed. He asked for one on
2026-07-25, got a one-tap shortcut, and removed its broken leftovers himself on 2026-08-21.

**Corrected the same day, on his word.** He read it and said the "takes a second to react"
complaint was the heart, not the question chips — *"noticeably longer"* than the feed. The sentence
sits inside a paragraph about the chip bar, which is where it had been filed and measured at 65ms.
Following his correction found something bigger than either reading: `toggleEntryLove` still calls
`revalidatePath` on the reader route, so every heart tap re-renders all 133 answers on the server —
**603 KB and 1.5 to 2.6 seconds**, against the feed's 55 KB and 270ms. The feed removed exactly that
call in an earlier audit and its comment states the rule and the symptom it caused. "It just reloads
like a whole page almost" was literal. Two lines to delete.

The whole of Catch-ups now exports to a rebuildable folder — 5.8 MB, photographs copied beside the
JSON — and a pressure corpus sits on each real cap. Two of the campaign's own decisions were
corrected in passing: it had asked for extremes the app cannot produce, and for members' words to
be committed to git.

## 2026-09-05 — Catch-ups rework, day zero

The owner's brief on Catch-ups ran to fifty paragraphs across two sittings and a typed
follow-up, and its one process instruction was that nobody downstream should work from a
summary of it. So the campaign opened the way the Collection one did:
`docs/planning/catchups-rework/brief.md` is his words with the fillers removed and nothing
else touched, and `handover.md` is the living index into it: the sessions and their models, a
ledger of every ask pointing at paragraphs, the decisions marked LOCKED / RECOMMENDED / OPEN,
and one prompt per session. Recon and prior art run first, on Opus; the directions, the pick
and the magazine design run on Fable; nothing runs on ultracode, at his word.

**Measured before anything was written**: three Catch-ups, four Rounds, 141 answers, 32 with
photos, none with a song, 520 hearts; eleven batch groups and not one has a Catch-up, though
64 of 70 members carry a batch year. The whole thing fits in one JSON file, which is why
"nothing gets deleted" (¶45) costs an export script rather than a plan.

**The skill grew a section.** `writing-for-agents` now separates a handover that carries the
owner's brief (his paragraphs travel verbatim, into every worker's prompt) from a
session-to-session handover (the writer's judgment is enough), with his reasons quoted. Both
copies updated, the repo's and the one in `~/.claude/skills/` that actually loads.

`docs/spec/catchups.md` carries a banner: it describes today, and the brief outranks it.

**Second half, after his answers.** He answered all five questions within the hour and left
ultracode to the session. It was used for the two jobs that are many independent readings
rather than one long sequence: four verifiers read the raw transcript against the cleaned
brief, and eight researchers plus an assembler were to run the prior-art sweep. The verifiers
finished and found 69 things, nearly all one fault: hedges and "right?" tags trimmed as if
they were fillers, which made him sound certain where he was tentative; plus three flattened
self-corrections, one deleted sentence of opinion, and a dozen unbracketed corrections. All
folded back into the brief, its header rewritten to say what the conventions really are, and
the lesson written into the skill: a hedge is content. The other eleven agents hit the usage
limit on the first launch and ran on a second once it reset. Two critics then read the
handover's ledger and decisions against the brief with different lenses and found it short:
no row for his typed answers, about thirty asks unrecorded (two of them hard scope fences from
¶20), sixteen paragraph pointers short, and a dozen marks that read a hedge as a decision.
All repaired the same evening; each disputed decision is now split into his part, LOCKED, and
the session's, RECOMMENDED. One claim in the recon prompt was simply false (an export script
is not a hand-run pass) and is withdrawn. Eight researchers and an assembler produced
`prior-art.md`, 21,000 words across eight shapes with every claim marked for confidence and a
gaps section, so S2 needs no session of its own. His answers are ¶51 and ¶52 of the brief and
gave the campaign a portrait magazine, a pressure corpus of fixtures, the storyboard of every
state and every sequence as recon's first duty, and `/lab/catchups/` as the sandbox.

## 2026-09-05 — the Map segment warms on hover, and the world arrives whole

The owner, on B7's placeholder beat: *"do that"*. So: `SegmentedPills` segments take an optional
`warm`, fired on pointer-enter and focus, and the directory's Map segment passes one. It is a
fourth field on the segment rather than a fourth prop on the control, for the same reason `count`
is one -- exactly one segment in the app has anything to warm, and it draws nothing.

**Measuring it said the module was never the beat.** On a production build, pressing Map fetched
its chunks at 63 ms, drew the empty card at 155 ms, and reached the map at 465 ms. The hover moved
two of three chunks earlier and changed that number by nothing. What it did expose is where the
time actually went: the atlas -- `countries-110m.json`, 105 KB of coastlines -- was requested at
**464 ms, after the map had mounted**, because `loadLandPaths` started in the mount effect. So the
land always arrived last, behind a beat nobody was waiting on for a good reason.

It starts at module scope now, memoised and browser-guarded, so the request goes out with the
chunk -- which the hover has already fetched. Measured on `next start`, Fast 3G, an empty cache,
three runs each:

| | first map frame | coastlines |
|---|---|---|
| no hover | 494-525 ms | **719-732 ms** |
| hover first | 530-542 ms | **530-542 ms** |

So the hover does not make the map appear sooner -- it is ~25 ms later, honestly -- it makes it
arrive **whole**, 190 ms sooner, with no window where a drawn map has no land in it.

The `AbortController` went with the change: there is nothing useful to abort. The response is a
static file behind an immutable cache header, a remount wants the same promise, and an unmount
mid-flight now drops the result rather than cancelling work already paid for. Verified: opening
Full screen remounts the map with **0 atlas refetches**, and a People-first arrival that never
touches the toggle still fetches **0 atlas and 0 d3**, so B7's saving is intact.

The ~500 ms to the first map frame is the view crossfade plus the map's own first render of 177
country paths. It is not network and this could not have fixed it.

## 2026-09-05 — Turbopack's duplicate chunks: measured, and left alone

Refactor audit 2, row B9, which the audit wrote as an experiment with a revert condition rather
than a fix. Three steps, all measured against a running `next start`, signing in with a cookie
minted on the dev server.

**(a) B8 did not dissolve the twins.** Re-running the duplicate check after the motion-barrel fix:
**29 chunk pairs at token-Jaccard 1.0000**, 453,882 B of duplicated bytes among the 203 chunks over
5 KB. The audit found 23 pairs and 305 KB, so there are more, not fewer. Whatever emits a module
twice is not the call sites.

**(b) `generateComponentChunks: true` loses on the cold load, which is the audit's own revert
condition.** Cold /feed **1,543,943 -> 1,558,255 B decoded** (+14,312, +0.9%) and 499,581 ->
505,387 encoded. A three-page session (/feed, a profile, /directory, by client navigation)
**1,955,622 -> 1,936,489 decoded** (-19,133, -1.0%) and -5,062 encoded, for one extra request. A 1%
saving across three pages bought with 1% on every first paint is not a trade this site wants.

**(c) `requestCost: 100000` does nothing at all** -- byte-for-byte identical to the baseline on all
three measurements. The knob has no purchase on this graph.

Reverted. `next.config.ts` is untouched and the rebuild is byte-identical to the pre-experiment
one on all 99 routes.

**The thing worth keeping is a trap, and it is in TRAPS.md now.** Under `generateComponentChunks`,
`route-bundle-stats.json` reports every route at 431-440 KB instead of 774-1,230 KB, because the
component chunks it emits are fetched on the same load and not counted as first-load. That reads as
a 65% cut and is a 0.9% regression. Every bundle number in these audits comes from that JSON; a
session that changed a chunking option and read only the JSON would ship the opposite of what it
measured.

## 2026-09-05 — one "open this photograph" button instead of four

Refactor audit 2, media-viewer-03, the second half of B10. The same button was written four
times -- post-card's `PhotoButton`, answer-photos' `Opener`, and inline buttons in letter-images
and photo-wall -- carrying the same class string, the same aria-label shape and the same pair of
preload handlers. `grep` for the class string found exactly those four.

`common/photo-opener.tsx` is the one now. Two decisions inside it:

- **The border is in the base class, not passed.** The audit warned that adopting `Opener`
  verbatim would strip post-card's border, because `Opener`'s own base lacks it. It lacks it
  because all three of its call sites pass `border border-border` -- so the border was never
  optional anywhere. It is in the base and those three stopped passing it. Verified in the
  browser: 1px rgb(223,216,203), radius 12px, focus ring 2px leaf at 2px offset, on all of feed,
  letter and Catch-up.
- **The preload is wired in, not passed.** A caller cannot write a fifth copy that forgets it,
  which is the state the owner met when he pressed a photograph and waited.

photo-river's `Tile` stays where it is, as the finding says: a scrim, no border and a caption for
a label is a different control.

**One deliberate change**: a lone photograph's label is now "View this photo full screen"
everywhere, where post-card and letter-images said "View photo 1 of 1 full screen". That is
`Opener`'s wording and it is better; the Catch-up wall keeps naming the person, through a `label`
override, because on a wall whose photograph it is tells you more than which.

-89 lines net over four files. `npm run check` and `npm run visual` green.

## 2026-09-05 — one way into the image viewer, and the SSR guard that only three lab rooms needed

Refactor audit 2, row B10, absorbing A18 (deferred from Phase A for exactly this). Six files knew
the viewer's module path and each wrote the same four things: the `dynamic()`, the bare `import()`
that warms it, a `mounted`/`at` pair set together in an `open(i)`, and the latched render. Five
copies of a latch, and only one of them carried the argument for why it is a latch.

`common/lazy-image-viewer.tsx` now holds `LazyImageViewer`, `preloadImageViewer` and
`useImageViewer()`, with post-card's argument moved in. Net -24 lines across ten files.

**The three lab rooms were the whole reason the viewer had an SSR portal guard.** They imported
`ImageViewer` directly, so Next rendered it on the server, so the component held its portal target
in state and returned null on the first render -- and `portal` had to be a dependency of the
caption's `useLayoutEffect`, because otherwise it measured nothing once and never again. They come
through the shared module now, every caller is `ssr: false`, and the state, the effect and the
dependency are gone: `createPortal(..., document.body)`.

Verified the viewer opens and Escape closes it on **all eight surfaces** -- /feed, a letter, the
Collection, a Catch-up round, a profile, and /lab/viewer, /lab/collection, /lab/collection/swap.
The caption affordance the removed dependency protected still works: at 390px the lab viewer's long
caption reads `aria-expanded="false"` clamped to 45px and opens to 90px on a press.
`collection-permalink.spec.ts` green, `npm run visual` 25/25.

Measured between builds: **/lab/viewer -136,869 B, /lab/collection -115,359 B,
/lab/collection/swap -67,631 B** raw first-load JS; shipped routes gain 321-435 B for the shared
wrapper. Eleven built chunks still carry the viewer, so the finding's hope of "possibly fewer
viewer chunks" did not land -- that duplication is Turbopack's chunking, not the call sites, which
is B9's question.

## 2026-09-05 — a profile arrives with its Writing tab already filled

Refactor audit 2, row B13. The Writing tab fetched its first page from a mount effect after
hydration -- one extra round trip and one skeleton on every profile view. Audit 1 closed exactly
this shape on /collection and did not reach the profile's author feed.

`profile/[id]/page.tsx` calls `loadPosts({ authorId })` beside the counts it already runs, in the
same `Promise.all`, and passes the first page down. `ProfileAuthorFeed` takes `initialPosts` /
`initialCursor` / `initialHasMore`; when they are given, the mount effect does not run. Only the
**All** scope is seeded -- the segmented switcher remounts the feed with a fresh `key` per scope,
so Posts and Letters arrive unseeded and keep their skeleton and `expectedCount`.

`getViewerCities` is `cache()`d in the same commit, and that is not a spare improvement: the page
reads it for its counts and `loadPosts` reads it again, so without it this row would have traded
a browser round trip for a duplicate query.

Verified on a profile with a post: **zero argument-carrying server actions fire on load** (the
two that remain take no arguments and are not this one), the card is in the first paint, and
All/Posts/Letters still switch and still agree with the pills -- All 1, Posts 1, Letters 0.

## 2026-09-05 — a letter stops carrying the comments stack and an admin dialog in its first load

Refactor audit 2, row B12. `post-card.tsx` defers both `CommentsSection` and `ModerationDialog`;
`letter-engagement.tsx` imported both statically, so the same two modules were in /letters/[id]'s
first load and not /feed's. It was written after the card and did not copy the shape.

The comments block keeps its **server** render -- no `ssr: false` -- because it is `alwaysOpen`
on a letter and draws its own skeleton rows from `expectedCount`; taking it out of the HTML would
leave a hole under the letter until hydration. The moderation dialog is admin-only and opens on a
press, so it gets `ssr: false` behind the `viewerIsAdmin` guard that already existed.

Measured between builds: **-40,719 B raw first-load JS on /letters/[id]** (1,048 KB -> 1,007 KB).
The audit estimated ~22.6 KB for both. Verified at 1440 and 390: the comments block and its
composer are there, and the admin's Remove opens "Remove this letter".

## 2026-09-05 — the report dialog stops mounting twenty times a feed

Refactor audit 2, row B11. Four of `post-card.tsx`'s five deferred pieces were already dynamic;
ReportDialog was excluded on the grounds that it is mounted unconditionally, so its own
AnimatePresence can play the CLOSE animation, and that deferring something rendered on every card
would save nothing. The first half is true; the second is not. The restructuring is the same
two-line `mounted` latch sitting twenty lines below it for the viewer.

Latched now: the first "Report" mounts it, it stays mounted after so the close still animates,
and the import is `next/dynamic`. A feed of twenty cards mounts one dialog tree instead of
twenty, on first use rather than on load.

Measured between builds: **-39,014 B raw first-load JS on /profile/[id]** (the Select primitive
left with it) and -1,923 B on /feed, which keeps Select for another importer -- exactly what the
finding said would happen. Verified: report a post, cancel (height 282 -> 270, opacity 1 -> 0,
then unmount), report it again and it opens.

## 2026-09-05 — domMax arrives on its own, without the rest of the motion barrel

Refactor audit 2, row B8, with dependency-diet-15 riding along. `LazyMotion`'s loader was
`import("motion/react").then((m) => m.domMax)`, and a dynamic NAMESPACE import cannot be
tree-shaken: the bundler has to evaluate every export of the barrel to hand back `m`. So the
async feature chunk carried `useInvertedScale` (27.9 KB on its own), `Reorder`, `LayoutGroup`,
`MotionConfig`, the legacy frameloop and the view-transition machinery -- none of which any file
in this app imports.

`motion-features-max.ts` is one static named import and a default export, which is Motion's own
documented features.js shape; the loader points at it. `motion-namespace-rule.test.mjs` reads
both halves now (the loader must go through that module, and that module must import domMax),
both mutation-tested.

Measured between builds: **the 72,472 B barrel chunk is gone** -- `useInvertedScale` is in no
built chunk at all -- and `.next/static/chunks` fell 6,163,567 -> 6,072,974 B. It also moved
first-load, which the finding did not promise: Turbopack recomputed the shared motion graph from
domMax's real dependencies, so **every one of the 99 routes lost 1,164 B and the heaviest lost
3,693** (/login).

Both domMax-only behaviours verified: the sidebar marker glides through eight intermediate
positions on a navigation (layout), and /admin/review's `drag="x"` card still gets
`touch-action: pan-y` (drag). The file's comment also named `no-motion-namespace.test.mjs`, which
has never existed; it names the real pin now, and says so.

## 2026-09-05 — the profession vocabulary stops shipping to every member's browser

Refactor audit 2, row B7, the vocabulary half. `directory/page.tsx` has carried a comment since
it was written -- "Resolved on the server so the client never imports the whole vocabulary to
render twelve strings" -- and it was not true. One `tagLabel()` call in `directory-client.tsx`,
for the chip a bookmarked `?profession=` draws, pulled `PROFESSION_TAGS` into the client chunk,
and with it all seventeen `hint` strings, which that file's own doc says are "for the tagging
session, not for the UI". A const array of object literals cannot be shaken field by field.

The label is computed on the server now and passed as `initialFilters.professionLabel`. Not read
off the `professions` prop: a tag below `TAG_FLOOR` is not in that list, and a bookmarked link to
one still has to draw a chip a person can read and clear.

`directory-rule.test.mjs`'s pin moved with it and grew a third assertion -- the server computes
it, the client reads it, and the client does not import the vocabulary at all. All three
mutation-tested: each breaks exactly one test.

Measured between builds: **-2,409 B off /directory**, and "Still in full-time education" is now
in no built chunk. Verified `?profession=law`, `?profession=environment` (below the floor) and
`?profession=social impact` -- the chip reads Law, Environment and Social impact, and clears.

## 2026-09-05 — d3 arrives with the map, not with the directory

Refactor audit 2, row B7, the map half. d3-geo, d3-selection, d3-zoom and topojson-client are
one 66 KB chunk on /directory alone -- and since the view logic changed, a directory opened with
`?q=` or `?year=` starts on **People**. So every shared search link and every batch-tile
drilldown was downloading a projection it never ran. Audit 1 moved the atlas JSON to a fetch and
left the component static; this is the other half.

`next/dynamic`, `ssr: false`. Nothing is lost to that: the atlas already arrives by fetch after
hydration, so the server has never drawn a continent. The `loading` box is the frame the real
map paints first -- same card, same `flex-1`, same 360px floor, same `--muted` ocean. Measured
through the swap: the placeholder card is up at 237 ms (1112x697, rgb(236,232,221)) and the map
lands on it at 500 ms in dev, which is the world appearing on water that `directory/loading.tsx`
already does for the page.

Measured between builds: **/directory 1,240 KB -> 1,159 KB, -80,723 B raw first-load JS.**
Verified: a bare /directory still draws the map with its six pins; `?q=a` opens on People with
no svg and no d3 at all; pressing Map brings it in.

`MAP_MIN_H` cannot be imported by the loading box without pulling back the module it defers, so
it is a literal there and both sides carry a comment saying so.

The audit warned the `/directory` visual baseline would stop matching, because it masks `main
svg.touch-none` and `ssr: false` takes that out of the server HTML. It did not: `settle()` waits
on `networkidle` twice, which covers the chunk fetch. 25/25 green, unchanged baselines.

## 2026-09-05 — the admin's city picker leaves /admin/people/[id]'s first load

Refactor audit 2, row B6, the person-detail half. `LocationPicker` drags base-ui's combobox with
it -- 53 KB raw, the heaviest single thing on that route, for one field in one of the four cards
down the left.

`next/dynamic` with SSR left on. The audit (bundle-build-05) says this picker "sits behind the
admin's edit affordance"; it does not -- it is drawn at rest in `PlacesCard`, so deferring the
paint would pop a control in under an admin's cursor. The source now says so, for whoever reads
that finding next.

Measured between builds: **-56,750 B raw first-load JS on /admin/people/[id]** (1,090 KB ->
1,033 KB). Verified the picker is still there at rest: an input 676px wide, placeholder "Add a
city", no 4xx on the page.

## 2026-09-05 — /welcome stops downloading five steps to show one sentence

Refactor audit 2, row B6, the /welcome half. The Welcome screen is a heading, a paragraph and a
button, and it was arriving with all five wizard steps behind it: the register step's
LocationPicker drags base-ui's combobox, houses drags the chain editor and a popover, photo
drags the crop and attach dialogs. A step switch is state, so all five shipped whichever one
rendered. Every new member pays that once, on a phone, straight after signing up.

The three heavy steps are `next/dynamic` now, SSR left ON -- `?step=register` is a real deep
link and `ready` starts true for one, so these do render at rest; this is a client-chunk split,
not a paint deferral. A small effect fetches the step AFTER the current one, keyed on
`stepOrder` rather than `STEP_ORDER` so a teacher account (no houses step) preloads photo.

Measured between builds: **/welcome 1,200 KB -> 1,070 KB, -129,408 B raw first-load JS.** Past
the audit's ~115 KB estimate. Verified all four steps by deep link as Jerry, and "Skip for now"
still walks register to houses.

## 2026-09-05 — the guide's six chapters wait to be asked for

Refactor audit 2, row B5. `GuideLayer` is mounted once in the (main) layout and renders nothing
until somebody presses a page title -- but it imported the overlay and all six chapters at module
scope, and an import ships whichever way the branch goes. So ~14 KB rode the first load of every
member route for a sheet most visits never open.

New `guide-body.tsx` holds the overlay and the chapters barrel; `guide-layer.tsx` loads it with
`next/dynamic`, `ssr: false` (the server snapshot here was always null, so there is no HTML to
lose). `guide-areas.ts` stays static -- the sidebar and the door import it as plain data.
`GuideDoor` warms the chunk on `pointerenter` and `focus`, which on touch fires just before the
first of the two taps a finger needs anyway.

Measured between builds: **-14.2 to -14.8 KB raw first-load JS on 38 member routes**, -556 KB
across the app. Verified on /feed and /collection: the sheet still animates in from y=72 to y=32
at opacity 0 to 1, carries the right chapter, and Escape still closes it. No console errors.

## 2026-09-05 — the 404's flight director stops riding every route

Refactor audit 2, row B4. Next puts the root not-found boundary in every route's client graph,
which is right for a *boundary* -- but this one held the whole 404 bird: the flight-token kit,
the rig metrics, the smoothstep, the idle loop and the pointer handler. 4.5 KB raw on all 51
non-lab routes and all 48 lab ones, for a page almost nobody reaches.

`not-found.tsx` is 51 lines now: the copy block, and a `dynamic()` for
`components/mascot/moments/not-found-stage.tsx`. `useSoloHoopoe()` stays in the boundary, so a
nested `notFound()` under the sidebar never even fetches the stage. The one real change inside
the split is the pointer handler: it was `onPointerDown` on the boundary's `<main>`, and it is
a window listener in the stage now, keeping the same `closest("a,button,...")` guard. A `fixed
inset-0` catcher would have been the other way and is wrong -- it sits over "Back to home".

Measured between builds: **-4,539 B raw first-load JS on every one of the 99 routes**, -231 KB
across the non-lab app. Verified signed in at 1440: the copy is up at 300 ms with no bird, the
bird arrives and settles at the corner by 3.3 s, a click at (1150, 260) flies it exactly there,
and "Back to home" still navigates. At 390 the rig is 116 as before. Nested `notFound()` from
/admin/people/[id] still draws the copy with the sidebar intact and one bird, not two.

## 2026-09-05 — the search pill stops riding twenty-two headers that never draw it

Refactor audit 2, row B3. `PageHeader` took a `showSearch` boolean and imported `SearchPill`
itself, and a server component that imports a client component ships that module whether or not
the branch renders. So SearchPill and its two Phosphor icons were in the first load of
twenty-six routes for a pill exactly one of them draws.

`search` takes the node now, not a flag, and /feed passes `search={<SearchPill />}`. The
audit's remedy was to fold it into `actions`, matching how Collection and the directory pass
theirs -- but `actions` renders after the bell, so on /feed that would have reordered search and
bell in front of the owner. The slot stays; only the import moves.

Measured between builds: **-7.5 KB raw first-load JS on 22 non-lab routes** (-164 KB across the
app), plus -23 KB on /lab/support-ideas. Verified at 1440 and 390: the cluster is still search,
bell, New post; the glass still draws its line into the gap; the title still fades on the phone
and holds on the desktop. `npm run visual` green.

## 2026-09-05 — the sidebar's bird stops riding along on pages it never lands on

Refactor audit 2, row B2, and the second half of audit 1's finding 08. `sidebar-hoopoe.tsx`
and `logo-easter-egg-hoopoe.tsx` both statically imported the puppet, so 28 KB of rig was in
the first load of most authenticated routes for a bird that cannot appear for ninety seconds
and never appears below 768px, and for an egg that needs three clicks on a logo.

Both are `next/dynamic` now. `onReady` was already how each fills its controller, which is
what makes this safe -- next/dynamic's wrapper drops refs, and a `ref` here would leave the
bird permanently and silently inert. The egg warms the chunk on the FIRST click, because three
have to land inside 650 ms.

Measured between builds: **-74.4 KB raw first-load JS on 26 routes** -- every `/admin/*`,
/about, /letters x4, /messages/[id], /birds, /guide x2, /pick-bird, /support -- and -54.4 KB on
/collection and /collection/[id], -68.6 KB on /admin/review. Far past the audit's -28 KB
estimate: the puppet chunk was dragging more with it than the finder attributed. /feed,
/directory, /profile/[id], /welcome, /catchups and /dark-mode do not move, each having its own
static importer, exactly as the finding predicted.

Verified by hand on /about at 1440x900: Ctrl+Shift+H summons the bird, it perches 60px above
the profile row, and three fast clicks on the wordmark still pop the egg. No console errors.
`not-found.tsx`'s comment claimed the sidebar shows its bird at first paint; it never did, and
that line is corrected in the same commit.

## 2026-09-05 — the sign-in page stops carrying a tooltip it never draws

Refactor audit 2, row B1. `float-field.tsx` imported `InfoTooltip` at module scope, and
`InfoTooltip` is built on the base-ui Popover, so every page drawing any float field paid for
the whole floating stack -- Popover, its positioner, floating-ui's `computePosition` -- whether
or not a hint existed. Exactly one caller in the tree passes a hint (`photo-questions.tsx`), and
it is not one of those pages.

`next/dynamic` with `ssr: false`, kept behind the existing `{hint && ...}` guard. `ssr: false`
costs no first paint here because every hint lives inside a dialog that opens after hydration.

Measured between two production builds: **-145 KB raw first-load JS on /login, /signup,
/forgot-password, /reset-password and /**, and -16.4 KB on /admin/review, which also carried the
chunk. /login is 928 KB -> 783 KB. Verified by hovering the (i) on the review room's description
field: the note still opens, 288px wide over two lines, no console errors. `npm run check` and
`npm run visual` green.

## 2026-09-05 — the lab's stylesheet stops riding on every member's page

Refactor audit 2, Phase A, row A1 and A1b. One stylesheet served all 100 routes, and about a
third of it existed only because a file under `/lab` used those classes. It is render-blocking
and it was on the signed-out landing page.

Two lines in `globals.css` do it. `source("../")` narrows Tailwind's scan from the whole
repository to `src/`, which is how `min-w-[640px]`, `h-[86dvh]` and `pt-[106px]` were shipping
to members from markdown files that merely quoted them. `@source not "./lab"` holds the design
lab out; the lab compiles its own utilities in `src/app/lab/lab.css`, loaded by the lab layout.

The audit's recipe for that second sheet does not work, and the failure is silent: a negated
`@source` applies to every sheet that reaches it, including through `@reference`, so a lab sheet
referencing `globals.css` excludes the lab from its own scan and compiles to 84 bytes. Hence
`tailwind-theme.css` — `@theme inline`, `@custom-variant`, `state-layer`, the three things
Tailwind needs at compile time — referenced by both sheets. Token values did not move.

Measured off two production builds: **238,434 -> 160,915 bytes raw on every route, and 33,666 ->
24,716 gzipped.** The lab sheet is 147,185 bytes on 48 routes, all of them under `/lab`, none
member-facing. `npm run check` green, all 25 visual tests unchanged, and `/lab/v2`, `/lab/craft`,
`/lab/profiles` and `/lab/landings` screenshotted intact.

## 2026-09-05 — forty lines of CSS stop costing 234 packages

Refactor audit 2, Phase A, row A2. The `shadcn` package was installed for one import in
`globals.css` and nothing else: no code in `src/`, `scripts/` or `e2e/` imports it, and it is
run, if ever, as `npx shadcn add`, which fetches its own copy. It brought **234 lockfile entries,
21.6% of the whole file**, and installed on every Vercel build.

Of the 95 lines it contributes, five variants have callers: `data-open` and `data-closed` in
`dialog.tsx`, `data-disabled` in the combobox, dropdown menu and select, and `data-horizontal` /
`data-vertical` in `separator.tsx`. Those are now in `tailwind-theme.css`. Its other four
variants, its `no-scrollbar` utility and its accordion keyframes have no caller here; this
project's accordion is a hand-rolled spring.

They are inlined verbatim rather than swapped for Tailwind's built-in `data-*:` shorthand,
which is not the same thing. `data-horizontal:` natively resolves to `[data-horizontal]`, and
Base UI's Separator writes `data-orientation="horizontal"`, so the swap would have quietly
dropped both of that component's rules. The other four exclude the `="false"` case React renders
for a false-valued data attribute; the built-in variant matches on presence alone.

Lockfile 1,083 -> 849 entries. The shipped stylesheet is **byte-identical** across the change,
compared chunk to chunk between two production builds. `components.json` is untouched, so
`npx shadcn add <component>` still works.

## 2026-09-05 — the lab stops holding a production dependency open

Refactor audit 2, Phase A, row A3. `world-atlas` was a **production** dependency, 7.8 MB,
installed on every Vercel build, and the only importer left in the repository was one lab file:
`src/app/lab/directory/_maps.tsx:28`, `import worldData from "world-atlas/countries-110m.json"`.

That is the exact antipattern the shipped map documents as wrong. `alumni-map.tsx:83-101` was
changed in audit 1 to fetch `/geo/countries-110m.json` instead, and spends eighteen lines
explaining why: a static import compiles 105 KB of JSON into a JavaScript module and parses it on
the main thread. The room that prototyped the map kept the version the shipped file warns about.

The room now uses the same static file through a `useLand()` hook, with the same abort signal and
the same "empty until the atlas lands" behaviour, which both consumers already coped with because
they map over the array. It also drops an `any` cast and its `eslint-disable`.

32 runtime dependencies and 17 dev, down from 33 and 18. `/lab/directory` screenshotted with the
coastlines and all 45 place circles drawn, no console errors.

## 2026-09-05 — "mobile" screenshots stop having desktop hands

Refactor audit 2, Phase A, row A4. `screenshot.mjs` and `map-cluster-verify.mjs` set
`deviceScaleFactor: 2, isMobile: true, hasTouch: true` alongside 390x844.
`screenshot-auth.mjs`, `verify-shot.mjs` and `theme-shots.mjs` set the size and none of the
three. Since the interesting surfaces are all behind a login, that is nearly every mobile shot
anyone has looked at for weeks.

Measured on the running page rather than argued. At 390x844 with the size alone,
`(hover: hover)` is **true** and `(pointer: coarse)` is **false**; with the three properties both
invert. So the shipped stylesheet's seven `@media (hover:hover)` blocks were applying in shots of
a phone that would never match them.

The clearest thing it was hiding: `install-app-tile.tsx:80` returns `hidden` unless
`(pointer: coarse)` matches, so the PWA install tile has been absent from every mobile shot of a
profile and present on every real phone. The Playwright projects were always honest -- the mobile
project sets `isMobile`/`hasTouch` -- so this is the Puppeteer half only.

`screenshot.mjs`'s comment claimed the auth variant already did this. It now says when that
became true.

## 2026-09-05 — the rule against rebaselining blind gets its tool back

Refactor audit 2, Phase A, row A5. `npm run visual:report` has never worked on this machine, and
OPERATIONS' one rule about never accepting a red visual run without looking at the diff depends
on it.

Two faults, where the audit found one. The HTML reporter was registered only under
`process.env.CI`, so a local run wrote no report at all. And its `outputFolder` was spelled
`e2e/.report`, which Playwright resolves against the **config's** directory, exactly as
`outputDir: ".output"` beside it does -- so even in CI it wrote `e2e/e2e/.report`: a path the npm
script does not read and `.gitignore`'s `/e2e/.report/` does not cover. Registering the reporter
without fixing the path would have produced an untracked folder and still no report.

Both fixed. A local run now writes `e2e/.report/index.html`, `visual:report` serves it (checked:
HTTP 200), and `git status` stays clean.

## 2026-09-05 — a security pin on a corpse

Refactor audit 2, Phase A, row A6, first half. `ae5bc9a` removed the hoopoe tour on 2026-08-27,
"total rather than a flag". `scripts/qa/tour-mobile-verify.mjs` still looked for
`[role="dialog"][aria-label="Product tour"]` and a button reading "hoopoe tour" on `/admin`.
Neither has existed for nine days; run today it would retry four times and exit 2, INCONCLUSIVE,
which is the one exit code a reader blames on their dev server rather than on the script.

Its test passed on every `npm run check` throughout, because it asserts only that the script's
**source** still contains `requireLoopbackBaseUrl`, `assertSameOriginAfterNavigation` and a
Node-side `fetch` to `/api/dev-login`. A source-reading pin cannot tell a live script from a dead
one; the source is still there either way. Worth remembering about this repo's rule-test pattern.

Both files gone, 274 lines, and the ledger row with them. `cookieDomainForBaseUrl` loses its only
non-test caller and stays: three lines against a real trap (Chrome wants `[::1]` bracketed), now
with a comment saying it is deliberately unused rather than leaving it looking wired up.
`_dev-login.mjs`'s docblock cited the deleted script as the one of nine that got the secret
handling right; it now says so in the past tense.

The tests gate reads 101 files, down from 102. Note for the next session: `scripts-ledger.test.mjs`
reads `git ls-files`, so a deletion only passes once it is staged.

## 2026-09-05 — the security allowlist empties, and phase9 stops failing quietly

Refactor audit 2, Phase A, row A7. `npm-audit-gate.mjs` allowlisted GHSA-ggr8-5vv4-36mx
(deepmerge-ts stack exhaustion through `@prisma/config`) because npm's only offered fix was a
two-major Prisma downgrade. The `deepmerge-ts: ^8.0.2` override then fixed it outright:
`deepmerge-ts` resolves to 8.0.2 today and the tree has **zero** high or critical advisories.

So the entry was accepting an advisory that no longer existed, and worse, if the override were
ever removed the entry would have accepted its return silently instead of failing loudly. The
allowlist is now empty, which is the healthy state, and the gate says which kind of clean it
means rather than one sentence for both.

Two tests read `Object.keys(ALLOWLIST)[0]`, so the day the allowlist emptied they would have
asserted on `undefined` rather than failing. `gateVerdict` already took the allowlist as a
parameter; they now use a crafted one and prove the mechanism whatever the live list holds.

`phase9-probe.mjs` had **three** stale assertions, not the one the audit found, and nothing runs
it automatically so all three had been failing for weeks. One named the advisory the gate no
longer prints. The other two asserted that `check.yml` runs the two security gates -- which it
stopped doing the day they moved inside `check.mjs`, the change `ci-parity.test.mjs` exists to
protect. They now read `check.mjs`. The probe reports 13 passed, 0 failed.

## 2026-09-05 — the filter kit stops describing a consumer it lost

Refactor audit 2, Phase A, row A8, first piece. The Collection left
`src/components/common/filters/*` in `8a0ba37` and grew its own river controls; the directory
chrome became one sentence in `bfabfea`. Between them they orphaned `active-filter-chips.tsx`
(61 lines), `result-count.tsx` (19) and `SortPill` (37), and left five comments across the kit
still naming Collection as its second consumer and `active-filter-chips.tsx` as a live twin. The
kit's actual second consumer is admin: People, Content and their filter sheets.

`HOUSE_OPTIONS` went dead when the owner removed house filtering on 2026-08-28, which left
`src/lib/directory-facets.ts` as a nine-line header explaining what is *not* in it plus a
two-entry array with one reader, whose name collided with a different `TYPE_OPTIONS` in
`admin-content.ts`. The array moved into `directory-client.tsx`, the file went, and the one
sentence worth keeping (City and Profession are live sets, not static ones) went with it.

`FacetOptionsPopup`'s `anyItem` was optional only for SortPill's sake, so it is required now.

Note for the next session: `focus-recipe.test.mjs` enumerates **tracked** files, so a deletion
reds `npm run check` with an ENOENT until it is staged -- the same trap `scripts-ledger.test.mjs`
has. The audit said no test named these files; one reaches them by enumeration.

`/directory`, `/admin/people` and `/admin/content` all load clean, and the visual suite is
unchanged.

## 2026-09-05 — three button variants nothing has ever asked for

Refactor audit 2, Phase A, row A8, second piece. `button.tsx` offered a `link` variant and
`icon-xs` / `icon-lg` sizes with zero call sites anywhere in `src`, the lab included, and no
computed `variant:`/`size:` string that could reach them. Their neighbours are all busy:
`icon-sm` has eight sites, `primary` 64, `outline` 62. Three cva lines, about 200 bytes out of a
chunk that rides all 52 non-lab routes.

## 2026-09-05 — 410 KB of tracked binaries nothing has ever loaded, and a delight that shipped to everyone

Refactor audit 2, Phase A, row A8, third piece. Four tracked files under `public/` that no
`src` attribute names and no `readdir` reaches: `lab/crop/pano-21x9.webp` (153,150 B),
`lab/crop/phone-9x16.webp` (141,394), `lab/crop/grainy-420.webp` (38,124) and
`images/collection/c3-thumb.webp` (87,682). 420,350 bytes, deployed to Vercel's CDN on every
build since August.

The three crop files were the room's first cut on 2026-08-27 and were superseded the next day by
`6fb0780`, which rewrote `_specimens.ts` around the eleven `shape-*.webp` fixtures; nobody deleted
the originals. `c3-thumb` is the file audit 1's finding 17 missed, because `77dc9da` matched on
display copies and `c3.webp` is live. Its header comment now says which files "delete these files"
means.

`c3-thumb` needed a database check, since a June seed wrote local paths into `Photo` rows and grep
cannot see a database. `SELECT ... WHERE url LIKE '%/images/collection/%' OR "thumbUrl" LIKE ...`
returns **0 rows against production and 0 against the demo**.

Separately, `.hoopoe .wing` and its four siblings moved from `globals.css` into `lab.css`. They are
hand-written rules rather than utilities, so A1's `@source not "./lab"` could not reach them and
they were still shipping to every member page for a delight only `/lab/v2/page.tsx` renders.

## 2026-09-05 — two meta tags on every page for a reader that does not exist

Refactor audit 2, Phase A, row A9. `withSentryConfig` sets `experimental.clientTraceMetadata`
unconditionally on Next 15 and up, which stamped `<meta name="sentry-trace">` and
`<meta name="baggage">` into every HTML document this site serves: about 400 bytes carrying the
Sentry public key, the org id, a trace id and a sample rate. They exist for a **browser** SDK to
read and continue the server's trace from, and there is no browser SDK here on purpose
(`instrumentation.ts` argues that at length: ~30 KB gzipped against a standing constraint that
monitoring may not slow the site down).

The SDK has no option for it. Its only early return is for `cacheComponents`, and it *prepends*
its two names to whatever the config already holds, so setting the key cannot unset it. Deleting
the key off the object `withSentryConfig` returns is the whole mechanism. The build's Experiments
list no longer prints `clientTraceMetadata`, and a live page now serves **0** of those tags.

`telemetry: false` while in the file: the build plugin reported the bundler, SDK version and
build timings to Sentry on every deploy for nothing this project reads.

And the CSP: the comment governing the whole directive block says *"PostHog is same-origin
(proxied through /ingest) so it needs no host here"*, and then `img-src` and `connect-src` both
listed `https://*.posthog.com`. Checked live rather than reasoned about: `/login` loads 43
resources, four of them PostHog's, **every one first-party at `/ingest`, none to posthog.com**.
Both lines gone, no CSP violation in the console. `security-regressions.test.mjs` permitted three
wildcard hosts and now permits two, so putting it back has to argue for itself.

## 2026-09-05 — three overrides that were overriding nothing

Refactor audit 2, Phase A, row A15. `package.json` carried five npm `overrides`; `OPERATIONS.md`
§4 opened *"One `overrides` entry lives in `package.json`"* and described one of them. Both
numbers were wrong.

Two are load-bearing, and for the same reason: `@prisma/config` pins `deepmerge-ts` to an exact
`7.1.5` and `prisma` pins `mysql2` to an exact `3.15.3`, so npm's only offered fix for either
advisory is a two-major Prisma downgrade. An exact pin upstream is unambiguous.

The other three -- `browserslist`, `postcss-selector-parser`, `fast-uri` -- were asked for only
with caret ranges, so a fresh resolution already picked a version at or above the pin. Proved
rather than reasoned: removed all three, ran `npm install`, and every resolved version came back
**identical** (`browserslist` 4.28.8, `fast-uri` 3.1.7), the lockfile stayed at 848 entries, and
the advisory gate stayed clean. `postcss-selector-parser` is not even in the tree any more; its
only asker was `shadcn`.

`fast-uri`'s override is nine days old (`a13a8a9`, 2026-09-02). It closed four real advisories at
the time by moving the *lockfile* off 3.1.5; what it did not need to be was permanent.

§4 is now a table -- override, what it forces, who pins it, what it closes, when it can go --
because that paragraph's own last sentence is the rule: an override that outlives its reason is a
pin nobody remembers making. It had already happened four times over.

Also dropped `"msw": false` from `allowScripts`: `msw` left the tree with `shadcn` yesterday, and
denying an install script for a package nobody installs is noise in a block that exists to be read.

## 2026-09-05 — an auth wrapper that wrapped nothing, and a hash that needed no export

Refactor audit 2, Phase A, row A14, with both halves needing a correction first.

`(auth)/layout.tsx` was called a no-op. It was not: it rendered
`<div className="min-h-screen bg-background">`. Both halves turn out to be said elsewhere already.
`globals.css:315` applies `bg-background text-foreground` to `body` for the whole product, and
`auth-panel.tsx:126,129` sets its own `min-h-screen`, which is exactly what the layout's own
comment claimed ("each auth page owns its own layout"). Measured after removing it: on `/signup`
at 390x844 the panel spans 0 to 844, the document is 844 tall, and the mascot sits at y=235 fully
inside. `npm run visual` unchanged on `/login` at both viewports; the other four auth routes
screenshotted.

`hashToken` was called an unused export. It has three callers -- all three inside its own file.
What is unused is the `export`: its docblock explains it exists so a caller in another file can
share one hash, and that caller is now `claimToken`, three functions further down the same file.
So the function stays and the keyword goes, with the reason written down, because a hash helper
anything can reach is a second implementation waiting to happen.

Trap worth knowing: deleting a `layout.tsx` reds TypeScript until a build runs, because Next's
generated `.next/types/validator.ts` still imports it and neither a dev-server request nor
`tsc` regenerates that file. `npm run build` does.

## 2026-09-05 — the pool rule was reading 20_000 as 20

Refactor audit 2, Phase A, row A16. `/api/demo/reset` builds its own Prisma client per call --
correctly, because the demo write policy would refuse nearly every statement the seed makes -- and
built it with `new PrismaPg({ connectionString })` and nothing else. That is exactly the bare form
`src/lib/prisma.ts:18-25` spends twenty lines calling dangerous (pg defaults: max 10 per instance,
and no checkout timeout at all, so a checkout with no free connection waits forever). It now
carries `max: 5`, `connectionTimeoutMillis: 5_000` and a deliberately loose `query_timeout` of
60s, since the seed's own transaction already caps any single statement at 30s.

It also declares `maxDuration = 120`, which its two sibling crons in `vercel.json` have had since
audit C-079 and it never did.

`db-pool-rule.test.mjs` could not see any of this: it read one hard-coded path. It now walks
`src/`, finds every file constructing a `PrismaPg`, and asserts the bands on each, with a count
guard so a broken walk cannot empty the loop and pass by testing nothing.

Then the mutation test found something the widening was not looking for. **The band checks have
been reading the wrong numbers since they were written.** They matched with `\d+`, which stops at
a JS numeric separator, so `connectionTimeoutMillis: 5_000` read as 5 and `query_timeout: 20_000`
read as 20. They passed, for the wrong reason -- and a `query_timeout` of `600_000`, ten minutes,
would have read as 600 and passed too. That is what deleting `max: 5` caught and loosening
`query_timeout` did not. Fixed, both mutations now go red naming the file, and the real values
are inside their bands.

## 2026-09-05 — the spec that taught the hallucination the owner complained about twice

Refactor audit 2, Phase A, row A11. `CLAUDE.md` sends a media session to `docs/spec/media.md`, and
that file's own banner blessed §4.2 and §4.4 as "still true". §4.2 taught a **three**-variant image
pipeline. Two variants ship. The third, `originalUrl`, has never existed in any schema.

That is the same wrong belief the owner has now objected to twice, most recently 2026-09-02: *"this
is the second time a session has hallucinated that we're compressing collection photos why??"* --
and it was written down, in the file a session is told to read first.

The audit's first draft of this correction overcorrected and called all three rows wrong. Checked
line by line against both encode sites instead:

- `thumbUrl` 480px at q72 is **right** (`collection-photo.ts:212-213`).
- `url` 1600px at q80 is right **for the FormData fallback only** (`actions.ts:341-342`).
- The direct path, which nearly every contribution takes, stores **full resolution at WebP q100**,
  bounded only by a 40-megapixel AREA cap against decompression bombs (`actions.ts:600-603`).
- `originalUrl` at 3000px never existed.

So §4.2 is now a three-row table of **two** variants with the display copy's two encodes spelled
out separately, and it points at `toDisplayWebp` by name as the thing not to reach for. §4.4's
budget arithmetic, which multiplied the three imaginary variants, is replaced by "budget from R2,
not from a document". §9's schema block, §12's "keep originalUrl?" question and §7's return shape
all said three; all three now say what shipped.

`TRAPS.md` had the same gap facing the other way. Its flat "the Collection does NOT downscale" is
true of the direct path and false of the fallback, so a session reading it would be wrong about
half the contributions. It now names the exception, and `schema.prisma:270`'s own `// 1600px`
comment -- wrong for the direct path -- says what is really stored.

The divergence itself (fallback silently gives a smaller photograph) is the owner's call, filed as
§4 #20 of the audit. This commit documents it rather than deciding it.

## 2026-09-05 — two Collection reads stop being public endpoints

Refactor audit 2, Phase A, row A12. Every export of a `"use server"` file is registered as a
client-callable server action with its own action ID, whether or not any client calls it.
`loadPhoto` and `myPendingPhotos` were exports of `collection/actions.ts` and their only callers
are server modules: `collection-data.ts` and `/collection/[id]/page.tsx`.

Both authenticate correctly, so this was never a hole. It was surface -- and that file's own
comments say twice over, at `:208` and `:722`, that a server action is a public HTTP endpoint.

Moving them needed a seam first. `shape`, `includeFor` and `PhotoData` are shared with
`loadPhotos`, which is genuinely client-called and stays; a `"use server"` file may only export
async functions, so they cannot be exported from where they were. They are now
`src/lib/collection-shape.ts`, and `actions.ts` re-exports the `PhotoData` *type* so the client
components and two lab rooms that import it from there keep working -- a type export erases, so it
mints no endpoint.

`security-regressions.test.mjs:321` pinned the M30/M31 rule by reading `actions.ts` for
`decidePhotoVisibility`, and went red the moment `loadPhoto` left. It reads `collection-data.ts`
now, and asserts `loadPhoto` is actually in the file it is reading, so the pin cannot pass by
looking at the wrong place next time.

`/collection`, `/collection?scope=class` and a real permalink all load clean; visual unchanged.

## 2026-09-05 — a prop that lied, and the reason it should keep lying

Refactor audit 2, Phase A, row A17, closed against what it actually renders rather than as written.

`BirdAvatar`'s `ring` prop draws a card-coloured separator for overlapping rows. It is applied
unconditionally on the photo path (`:58`) and only `if (clipped)` on the bird path (`:104`), where
`clipped = BG_MODE === "inset"` and `BG_MODE` has been `"none"` throughout. So the Catch-up card
passes `ring` for five stacked avatars and gets nothing, while the `+N` chip beside them
hand-writes the identical `box-shadow` and does get one.

The audit's remedy is to drop the guard. **I tried it and looked at it at 2x, and it is worse.**
A 4px ring on a 28px avatar overlapped by `-space-x-2` (8px) consumes the entire overlap: each
glyph is sliced to a crescent by its neighbour's ring, and the ring over the `+N` chip covers the
`+`, so "+18" reads as "· 18". A photograph is clipped to a circle and wears the ring as a border.
An unclipped bird glyph does not.

Shown to the owner with both screenshots; he kept today's pixels. So nothing member-visible moved.
What changed is that the guard is now argued rather than incidental: the prop's docblock says
where it draws, where it does not, what happens if somebody removes the guard, and that a stacked
row is deliberately mixed today (photo members ringed, bird members not). The chip's hand-written
shadow says the same from its side. If `BG_MODE` ever moves to `"inset"` the row becomes
consistent on its own.

## 2026-09-05 — a probe that reported success and measured nothing

Refactor audit 2, Phase A, row A6, second half. Owner's call: retire rather than repair.

`scripts/qa/_dir-chrome-probe.mjs` measured the live directory toolbar so `/lab/directory`'s stated
numbers stayed re-derivable. Its `page.evaluate` opened with
`document.querySelector('[data-tour="directory-search"]')`, and every `data-tour` attribute in the
repository went with the hoopoe tour in `ae5bc9a` on 2026-08-27. Its caller prints
`${label}: toolbar not found` and continues, so since that day it has run clean, **exited 0**, and
produced twelve of those lines instead of a measurement table -- the failure this project likes
least, a tool reporting success while doing nothing.

That is the second dead thing the tour removal left behind; the first was `tour-mobile-verify.mjs`
this morning. Both were invisible because nothing runs them automatically.

90 lines, its ledger row, and the three places that cited it: the room's own body copy, which told
a reader the numbers were "read off the live page with `scripts/qa/_dir-chrome-probe.mjs`", and
two comments saying "3 rows, 142px here means the same thing it means there". All three now say
the same true thing instead: measured on 3 August 2026, dated rather than live, and re-derive by
hand before trusting them against today's bar.

## 2026-09-05 — /notice/[id] retired eleven months early

Refactor audit 2, Phase A, row A10. `bugs.md` carried a dated cleanup: *"After 2027-08-01: delete
`/notice/[id]`."* That date was arithmetic -- 2026-07-24, when moderation notes moved to messages,
plus a 365-day notification retention. The owner settled retention at **30 days** yesterday
(`74cc61a`), which moves the answer to 2026-08-23.

Checked live rather than trusting the arithmetic, because a wrong answer 404s a link in somebody's
inbox. Against production **and** demo: **0 notifications created before 2026-07-24, and 0 carrying
a `/notice/%` link.** The oldest notification in the table is 2026-08-05, which is the nightly
sweep doing its job. The route's whole audience is empty.

Gone with it: `page.tsx` (119 lines) and `loading.tsx`, `openAdminNoticeThread`'s `createdAt` and
`db` overrides -- the `db` one existed solely so that resolution could create inside the
transaction where it had taken `FOR UPDATE` on the notification row (audit C-115) -- and the
`Prisma.TransactionClient` type import that only the `db` option needed.

The C-115 pin in `threads-rule.test.mjs` read the page file and would have reddened `npm run check`
on its own; it is replaced by a note recording what it guarded and why the race is now unreachable.
Four comments across `admin-note.ts`, `messages/[id]/page.tsx`, `feed/actions.ts` and
`moderation-dialog.tsx` cited the route in the present tense and now say when it went.
`bugs.md`'s entry is struck through with the live counts, not just marked done.

## 2026-09-05 — the photographs pass starts obeying its own protocol

Refactor audit 2, Phase A, row A13. `docs/spec/hand-run-passes.md` says a picker **carries the
vocabulary and the rules inside the manifest**, and says why: a session reading a batch picked last
week should judge by the vocabulary that was current when it was picked, and a manifest carrying
its own rules can be read by somebody who never opened the skill.

`tag-professions-pick.mjs` has done that since it was written. `tag-photos-pick.mjs` never did --
its manifest was `{database, taken, outstanding, photos}` and its skill told the session to go and
read `BUCKET_RULES` and `VALLEY_GLOSSARY` out of `src/lib/photo-suggest.ts` instead, which is
exactly the lookup the protocol exists to prevent.

`hand-run-passes.test.mjs` did not catch it. It pinned the working folder, the database stamp,
read-only, `--apply`/`--undo` and the skill -- five of the protocol's rules and not this one. So a
rule nobody checked is the rule one of the three passes skipped, which is the whole reason that
file exists.

Both halves fixed. The picker now copies `vocabulary`, `eras`, `rules` and `glossary` into the
manifest at pick time; proved by running it read-only at `--limit 1` and reading the result: 6
buckets, 11 eras, 943 characters of rules, 1,105 of glossary. The test gained a
`carries the vocabulary and the rules` case that runs for **every** pass, mutation-tested by
deleting `rules:` from the picker and watching it go red by name. The skill's "read the source"
paragraph now says "work from the manifest", and says why.

The audit's third part -- making `import-album.mjs` import `gridThumb` and `exifBlockOf` instead of
copying them -- is conditional on `collection-photo.ts` losing its `@/` imports, and belongs with
the Phase E dedupe rather than here.

## 2026-09-05 — the presence write stops asking a question it already knows the answer to

Refactor audit 2, Phase C, row C3(a) (`data-layer-07(a)`). `touchLastSeen`'s `user.updateMany` is
throttled by its own WHERE — `lastSeenAt IS NULL OR lastSeenAt < now - 15min` — so for fourteen
minutes in every fifteen it writes nothing. It was still a round trip and a row-lock attempt on
`User`, on every page view, for every member. The session callback had already read that member's
row in the same request; it just did not select the column.

It does now, and the layout passes it in. Measured on `/feed` with `pg_stat_statements`: **23
statements to 22** on a view where the member was here recently, and a genuinely stale row still
gets written — set `lastSeenAt` to an hour ago, load the page, watch it move.

The interesting part is the failure in between. `lastSeenAt: Date | null` on `session.user`
typechecked cleanly and then threw `lastSeenAt.getTime is not a function` on every render: the
NextAuth session is a JSON payload and a Date does not survive it. It is an ISO string now, parsed
at the reader, and the trap is in `docs/TRAPS.md` under Next.js. Nothing found it but
`touchLastSeen`'s own catch, which logs loudly in development for exactly this reason — the guard
CLAUDE.md argues for, paying for itself.

## 2026-09-05 — one unread count per request instead of three

Refactor audit 2, Phase C, row C2 (`shell-primitives-03` = `data-layer-09`). A hard load of `/feed`
asked `SELECT count(*) FROM "Notification" WHERE userId = … AND read = false` three times: the
`(main)` layout for the sidebar bell, the page for its header bell, and then the bell itself from a
mount effect. Every other authenticated page asked twice, because the sidebar's mobile top bar
renders the bell at every width — `md:hidden` is CSS, not React.

`src/lib/notification-count.ts` owns the query now, wrapped in React's `cache()`, so the layout and
the page collapse into one; the action the bell calls on focus uses it too, which keeps one owner of
the shape rather than one owner of the request. The bell's mount refresh is gone: at mount the prop
had been computed on the same request milliseconds earlier. Its `focus` listener stays, and that is
the half that earns its keep — the sidebar bell is not re-rendered by a soft navigation, so its
count does go stale, and only focus catches that.

The feed page's own `userPlace.findMany` folded into `getViewerCities` at the same time, which is
where the `orderBy: { position: "asc" }` went: the letters index has claimed in a comment since
August that `getViewerCities` returns position order, and until now only the feed's private copy
did.

Measured with `pg_stat_statements`: `/feed` **22 statements to 21** per render, plus one fewer
client action per authenticated page load — itself a session read and a count. Proved live as Jerry:
badge reads 3 against a database that says 3, and marking one read behind the page's back and firing
`focus` takes it to 2.

## 2026-09-05 — the layout stops waiting on its own bookkeeping

Refactor audit 2, Phase C, row C4 (`admin-analytics-07`, corrected). `touchLastSeen` rode in the
`(main)` layout's render-blocking `Promise.all`, so every authenticated page — and this layout
renders above every `loading.tsx` in the app — waited on two writes to Mumbai before it would render
anything. The layout's own comment has named `after()` as the tool for this since it was written.

The naive move is a trap the audit's verifier caught: `touchLastSeen` called `await headers()`, and
a Server Component may not call a request-time API inside `after()` — Next throws. Because the
function swallows what it catches, presence would have died in production and said nothing. So the
reading and the writing are two functions now. `readPresence()` collects the request's facts during
render, where headers exist; `touchLastSeen(userId, presence, lastSeenAt)` takes them and does the
two writes behind the response. `currentPath()` went with it — `readPresence` reads `x-pathname`
itself, and `currentTarget()`, which the sign-in detour needs, stays.

Proved live: set `lastSeenAt` an hour back, load `/feed`, and the row still moves — with the write
now off the render path. The pattern is the same one `drainMailQueue` has used in production since
it was written.

## 2026-09-05 — four routes stop fetching their own row twice

Refactor audit 2, Phase C, row C1 (`data-layer-08` = `collection-04` = `fresh-code-23` =
`directory-profile-13` = `member-surfaces-16`). Next runs `generateMetadata` and the page in the
same request, and on four routes each wrote its own lookup of the same row. TRAPS has said since
August that `cache()` is the tool for exactly this; none of the four used it.

Each route now has one module-scope `cache()`d loader, keyed on strings and never on the session
object — `auth()` hands back a fresh object per call, so keying on it would miss every time. The
metadata reads its two or three columns off the row the page was going to fetch anyway.

Measured with `pg_stat_statements`, median of three loads each, against the same files at HEAD:
`/letters/[id]` **21 → 19**, `/profile/[id]` **24 → 23**, `/collection/[id]` **33 → 31**,
`/catchups/[id]` **33 → 30** (the Catch-up saves more than one because its metadata's include
issued a second statement for the group).

The permalink is the interesting one. Its `generateMetadata` had its own `photo.findUnique`, its own
`user.findUnique` and its own `decidePhotoVisibility` call — a correct second copy of a decision, and
audits M30/M31 are both the story of a list and a permalink disagreeing about who may see something.
It now asks `loadPhoto`, which owns that decision for the body, so the two cannot drift: a refusal
and a missing row both arrive as null, which is the same answer for a tab title. The
`security-regressions` pin moved with it — it used to grep the page for `decidePhotoVisibility(`,
which the page no longer calls, and now asserts the title comes through `loadPhoto` and that the
page never queries `Photo` directly. Mutation-tested by putting a `prisma.photo.findUnique` back and
watching it go red.

Not proved: the two-account class-refusal check the finding asks for. Both tooling accounts are
admins, and an admin is exempt from the class rule; signing in as a real alumnus to test it is not
allowed. The structural argument stands in its place — metadata and body are one call now.

## 2026-09-05 — the Collection asks who you are once, and a class permalink opens in the class order

Refactor audit 2, Phase C, the rest of `collection-04`. A class permalink used to read the same
three columns of the viewer's own row four times in one request: `generateMetadata`, `loadPhoto`,
`collectionPageData` and `loadPhotos` each asked the primary key for `verifyState` and `batchYear`
separately. They cannot hand the row to each other — `loadPhotos` is also called straight from the
client, so it has to be able to read for itself — which is exactly the shape React's request-scoped
`cache()` is for. `src/lib/collection-viewer.ts` owns it now, with `photoTrusted` riding along
because one shape is worth more than one column.

Measured with `pg_stat_statements`: the permalink is **31 → 30** statements, and the class half's
statement list now shows exactly one `verifyState, batchYear, photoTrusted` read where it showed
two. C1's own commit had already taken it from 33.

And the correctness slip underneath: `[id]/page.tsx` passed `order: "newest"` for both halves, while
the index reaches the same data through `riverFiltersFrom`, which falls back to
`defaultOrderFor(scope)` — Chronological for a class, Newest for the valley. So the two doors into
the Class Collection disagreed about its order. Proved live: a class permalink now reads
Chronological, a valley one still reads Newest, and both open with the viewer on the photograph.
`e2e/collection-permalink.spec.ts` passes at both viewports.

## 2026-09-05 — the letters index stops pulling draft bodies it never reads

Refactor audit 2, Phase C, row C8 (`member-surfaces-03`). The drafts query selected
`{ id, title, content, updatedAt }` for up to twenty drafts; `DraftSummary` is
`{ id, title, updatedAt }`, the mapping picks those three, and `DraftsStrip` draws a title and a
date. A letter body is capped at 20,000 characters, so a prolific drafter pulled up to 400 KB
through the pooler on every visit to `/letters` for nothing. One word deleted. Proved live: the
strip still reads "Untitled letter · Edited 27 Aug".

## 2026-09-05 — nine ways of asking one table, asked once

Refactor audit 2, Phase C, row C5 (`admin-analytics-03` + `09` + `14` = `data-layer-12`). Four
loaders fanned out counts over a single table and paid a round trip for each: `loadPeople` ran nine
`user.count`s, `loadMail` five `outboundEmail.count`s, `loadContent` three `post.count`s, and
`worklistCounts` — which runs on **every** `/admin/*` render — scanned `User` three times for two
verify queues and a headcount. The file already knew the instrument: `loadJourney` has always been
one `$queryRaw` with six `count(*) FILTER (WHERE …)` columns.

Each is now one pass. What stayed separate stayed separate on purpose, and the docblock in
`admin.ts` says so: six queues over six tables are six queries, because different tables are
different questions. Only same-table fan-outs folded. The profile's two `post.count`s by `kind`
became one `groupBy` for the same reason — the expensive half of that query is the audience arms
above it, and it was running them twice.

Measured with `pg_stat_statements`, minimum of three loads, against the same files at HEAD:
`?view=people` **37 → 27**, `?view=health` **29 → 24**, `?view=content` **43 → 39**,
`/profile/[id]` **23 → 22**. Two of those ten come off every admin page, not just analytics.

Every number checked against the predicate it replaced, twice over: the FILTER form and the old
`WHERE` form compared side by side in SQL, then the rendered page read against the database.
Members 70, joined-30 35, confirmed 68, this week 23, this month 45, placed 56, photo 4, dark 5,
never seen 25, blocked 0; posts 11, letters 6, drafts 2, comments 18, hearts 62, saved 5, photos
1,749; sent 55, delivered 31, bounced 0, queued 0. All identical.

## 2026-09-05 — six more avatar selects join the two that own the shape

Refactor audit 2, Phase C, row C9 (`data-layer-11` = `duplication-06` = `directory-profile-27` =
`feed-posts-17.13`). `people-select.ts` says the rule in its own header: two shapes are named, and
anything else spreads one and adds what it needs, *so the addition is visible in the diff*. Fourteen
files already did; six hand-wrote the four identity fields again. Now none do — a `grep` for
`birdOverride: true` across `src` returns `people-select.ts`, `auth.ts`'s session read, and
`/pick-bird`, which selects the column itself rather than an avatar.

The audit's remedy was wrong at one of the six, and the verifier caught it: `catchups-round-view.ts`
was told to spread `AUTHOR_CARD_SELECT`, which carries `verifyState`. That column is deliberately
absent there — the byline is `batchLine(e.author)` and never draws a verified leaf, exactly as the
letter page argues at length for the identical shape. Spreading the card select would have fetched
an unused column for every entry in every published Round. It spreads `IDENTITY_SELECT` and names
its three extras, and the reason is now written where the omission is.

## 2026-09-05 — two pagers stop naming a row they cannot promise still exists

Refactor audit 2, Phase C, row C6's second half (`data-layer-10`). `keyset.ts` exists because
Prisma's `cursor: { id }` needs the row it names to still be inside the filtered set, and answers
**nothing at all** when it is not — measured on this exact stack on 2026-08-24, with the numbers in
that file's header. Two pagers still used the cursor. One of them, admin People, said in its own
docblock that it was "keyset, not offset, following `loadPosts`", and then was not.

`admin-people-query.ts` now decodes a real `(createdAt, id)` cursor and ANDs `keysetWhere` into its
filter — AND, not a spread, because `peopleWhere` can carry its own top-level `OR`. Twenty-five
lines go with it: the recovery block that existed only to survive the cursor's failure mode, an
existence check plus an offset re-query that took a row count **from the client**. That parameter is
gone from `loadPeoplePage`, from `loadMorePeople` and from `people-list.tsx`, and the C-174 pin that
guarded it is retired from `profile-editor-rule.test.mjs` with a note saying why. The directory's
row stays: it sorts by name and batch, has no timestamp key, and `keyset.ts` carves it out by name.

The account export's `keyset()` helper takes the caller's `where` now instead of sitting beside it,
so the ten paged queries get `id: { gt: after }` rather than a cursor. The failure this closes is
small and real: a member's own row leaving the set during their own export used to truncate the file.

Proved live. `/admin/people`: 60 rows, "Show more", 70 rows, all 70 distinct, button gone — and 70
is the headcount. The export as Jerry returns places 1, posts 1, messages 1, comments 0, each equal
to a `SELECT count(*)`; as the owner it returns 1,721 Collection photographs across four pages of
500, with 1,721 distinct URLs.

## 2026-09-05 — the Catch-up shelf's teasers are one query, not six

Refactor audit 2, Phase C, row C6's first half (`data-layer-06`). The block's own comment says it
"exists to have removed" the N+1 over every published Round. It capped it at six rather than removing
it: six `findFirst`s in a `Promise.all`, each ordered on a relation count, which Prisma compiles into
a correlated subquery. Six correlated one-row queries on a five-connection pool is two waves, for six
short strings.

One `DISTINCT ON (editionId)` now. Prisma has no expression for `DISTINCT ON`, which is why it is
raw — the same reason `loadJourney` is. The tie-break on `id` is kept and so is the reason for it:
ordering on a count alone is not total, and the teaser would otherwise change between two identical
page loads.

Proved by rendering both Catch-up homes before and after and diffing the teaser text: byte-identical.
Honest limit on the number — this database has one Round with answers in it, so today's measured
delta is zero. The saving is one query per published Round up to six, and it arrives when a group has
a shelf.

## 2026-09-05 — the feed stops re-rendering a server tree that holds none of what changed

Refactor audit 2, Phase C, row C7 (`feed-posts-02` + `10` + `16`). Three separate wastes, one idea:
a refresh nobody reads.

**Five `revalidatePath("/feed")` calls.** `/feed`'s server tree renders no post, no comment and no
poll — it fetches the unread count, the member's cities, the "new since" marker and the four rail
modules; posts arrive through `loadPosts` into client state. `toggleLike`, `toggleBookmark` and
`toggleCommentLike` had this call removed when it turned out to be the root cause of the heart
scroll-jump, and the note explaining that is still in the file. `votePoll`, `createComment`,
`deleteComment`, `adminRemoveComment` and `editPost`'s `/feed` half were never fixed. They are now,
and the note has grown a paragraph stating the rule and listing what still revalidates and why, so
the next writer does not put one back.

**Two `revalidatePath("/")` calls** on mark-read. A literal `/` is the signed-out landing hero and
nothing else — only `revalidatePath("/", "layout")` means everything — so tapping a notification
purged a page the member is not on and refreshed nothing the bell reads.

**The bell's per-open prune.** Two queries on every first-page open to delete each member's read
notifications past the hundredth, under a comment reading "no scheduled job does either". One does,
and has since the retention sweep learned this table. The cap is a `step("notificationCap", …)` in
`retention.ts` now, beside the age cutoff and every other number that says how long this app keeps
things — and a cap enforced only for members who open the bell was never a bound anyway. The SQL
reproduces today's meaning rather than the audit's proposal: rank each member's notifications
newest-first including unread ones, delete the READ ones past the hundredth. The audit's version
partitioned on `WHERE read` first, which would have let a member with ninety unread keep a hundred
read rows instead of ten. Dry-run before it shipped: **0 rows** would be deleted today, and the
busiest member holds 24.

Proved live as Jerry, on the owner's own post so nobody else was touched: commented, and the scroll
position moved **0 pixels** while the comment appeared; navigated to `/directory` and back, and the
fresh server render shows the comment and a count of 2 where it said 1; deleted it, 0 pixels again.
Test rows removed afterwards — Jerry has 0 comments and there are no notifications from the last
half hour.

## 2026-09-05 — the read-time Catch-up advance is one query, on every page in the app

Refactor audit 2, Phase C, row C3(b) (`data-layer-07(b)`). The lazy advance runs on essentially
every authenticated render, and it was two `findMany`s against the same `group.members.some` join —
one for stale editions, one for Catch-ups whose `nextOpensAt` had passed. For a member in no
Catch-up, which is most members, both returned nothing.

One query now, with an `OR` over the two conditions and every edition included newest-first: the
stale ones feed `advanceEdition`, the newest feeds `openNextRoundIfDue`, and Prisma cannot include
the same relation twice under two filters. A Catch-up holds one edition per cadence period, and only
the Catch-ups the `where` already narrowed to are loaded.

**Why the ordering is safe, since the two reads were sequential and the second saw the first's
writes.** The only thing the advance loop writes to `nextOpensAt` is `now + cadence gap`, always in
the future, so a Catch-up it publishes cannot also become due to *open* in the same pass — which is
the only reason the second read sat where it did. In the other direction `openNextRoundIfDue`
compare-and-swaps on the `nextOpensAt` it was handed, so a value that moved under it is a no-op
rather than a double open. Both halves confirmed by driving it.

Gated by driving a real Round through the whole cycle, on the Catch-up whose group has exactly one
member and that member is the owner, so nothing reached anybody else. Round 99 opened `collecting`,
went to `answering` on a page load, then `preparing` and `published` in one later pass with
`nextOpensAt` set — and, exactly as predicted, it did **not** open the next Round in that same pass.
Forcing `nextOpensAt` into the past opened Round 100 on the next load and cleared the stamp. Torn
down afterwards: the sandbox is `ended` with its one original edition, and the owner's notification
count is back to 15.

Measured with `pg_stat_statements`, minimum of four loads against the same file at HEAD: `/about`
**11 → 8** statements. Three, not one, because each of the two reads carried a relation include that
Prisma issues as its own statement. That is three off **every authenticated page view in the app**.

`catchup-lifecycle.test.mjs`'s B-061 pin moved from the literal nesting to the property: it slices
`advanceDueCatchups` and asserts the query still narrows to active Catch-ups and to the viewer's
scope. Mutation-tested by deleting `status: "active"` and watching it go red.

## 2026-09-05 — the schema stops lying about eleven indexes, and one of them is a trap

Refactor audit 2, Phase C, row C10 (`data-layer-05`). `docs/TRAPS.md` said "two expression indexes
exist that Prisma cannot see". There are **eleven**, counted from `pg_indexes` on 2026-09-05: two
`lower()` uniques, three `lower()` btrees, five GIN trigram indexes and one partial. None is
expressible in `schema.prisma`, so `prisma migrate diff` offers to create or drop every one of them,
every time, and a session that trusts the schema thinks Collection search and people search are
unindexed. The authoritative list now lives in the schema's own header with the migration file each
one came from, and TRAPS points at it rather than keeping a second copy.

**The audit's own instruction here was the trap.** It said to add `@@index([lastSeenAt])` to `User`,
on the reasoning that `User_lastSeenAt_idx` is "a plain btree Prisma CAN express and the schema never
received". It is not plain — `2026-08-19-analytics.sql:22-23` creates it `WHERE "lastSeenAt" IS NOT
NULL`. A plain `@@index` is a *different* index, so following the instruction would have made the
next routine `migrate diff` propose dropping a live partial index and building a worse replacement:
the exact failure the entry exists to prevent, introduced by the entry's own fix. The schema says so
where the temptation is.

Found doing the census: **the demo database has seven of the eleven.** `Place_asciiName_idx`,
`Place_name_idx`, `UserPlace_city_idx` and `User_lastSeenAt_idx` never reached it, because the
migrations that created them predate the demo project. Nothing is broken at demo data size, so it is
a note in `docs/planning/bugs.md` with the idempotent repair written out, not a live schema change
made without asking. The full `pg_indexes` dump of both databases is saved beside the audit at
`work/db-indexes-live.json` — 131 indexes on production, 129 on demo — which is the thing audit 1
wanted and could not take.

## 2026-09-05 — the Collection asks each per-half question once, and keeps the instant swap

Refactor audit 2, Phase C, row C11 (`collection-03`) — **done, but not as written.** The finding
wanted the other half's facts fetched on the swap instead of on every page load. The block it names
argues the opposite in its own comment, and the owner's words behind that argument are in
`progress.md`: a swap must be instant and "cannot be caught halfway". The finding's own Confidence
line names exactly that as the thing that would change its mind. So the design stays.

What was actually wasteful was the shape, not the timing. Three questions — the member's own queue
awaiting review, whether the half holds any approved photograph, and the room left on their account
— were each asked **once per half**, so a class-eligible member paid six round trips to describe two
collections. They are the same question of the same table with a different scope, which is what
`groupBy` is for. Three queries now, for both halves, and the scope arms still come from
`photoScopeWhere` rather than a second copy of the rule written out here.

Measured with `pg_stat_statements`: `/collection` **23 → 18** statements — five, not the three I
expected, because the two per-half `myPendingPhotos` calls each carried relation loads of their own.

Proved identical by rendering the page under both versions and diffing the facts that reach the
client: `hasApprovedPhotos`, `roomLeft`, `canSeeClass`, `myClassYear` and the two pending queues all
byte-for-byte the same, as the owner (2023, 1,718 class photographs) and again with Jerry's batch
year temporarily set to 1999 so the class half was genuinely empty — the case where a wrong answer
would draw a bucket line and a search box over nothing. Jerry's year is back to null. The swap itself
still lands in one press: the caret takes `/collection` to `?scope=class&order=taken` with the
Class Collection's own heading and its Chronological order, no round trip and no flash.

## 2026-09-05 — Phase C closed: the query floor

All eleven rows of refactor audit 2's Phase C, in twelve commits (`29582b3`..`ce223a0`). Nine routes
measured with `pg_stat_statements` against the same files at the phase's start commit, minimum of
several samples each:

| route | before | after |
|---|---|---|
| `/feed` | 24 | 19 |
| `/about` | 12 | 8 |
| `/collection` | 27 | 19 |
| `/directory` | 21 | 18 |
| `/letters` | 15 | 11 |
| `/admin/analytics?view=people` | 38 | 24 |
| `/profile/[id]` | 25 | 19 |
| `/letters/[id]` | 21 | 16 |
| `/catchups/[id]` | 33 | 27 |

**216 → 161, a quarter of them gone.** Four of those come off *every* authenticated page rather than
one route: the no-op presence UPDATE, the duplicate unread count, and two from the Catch-up advance.
One client action goes with them — the bell's mount refresh, which was a whole request for an
integer the page had just counted.

Three of the eleven rows were wrong as written and two of the three would have shipped a defect;
`docs/audit-fix/2026-09-03-refactor-audit-2/fix-prompt.md` records which, with the evidence. The one
worth repeating here is that the audit's own schema-reconciliation row told the fixer to declare a
plain `@@index` for an index that is partial — which is precisely how a routine `migrate diff` comes
to offer to drop a live one, the trap the row exists to close.

`npm run check`, `npm run visual` (25/25) and `npm run verify:crawl` (20/20) green at the end.

## 2026-09-05 — Phase E, E1: one client for /api/upload

Three surfaces POSTed to `/api/upload` and each spelled the whole ceremony out: FormData, fetch,
`res.json()`, the `!res.ok` toast, the M15 notices loop, the facts merge. They had drifted, and both
drifts were member-visible.

**Only the post composer had a deadline.** The Catch-up attachments and the support-message composer
reset their busy state in `finally` alone, so a fetch that never settles — a phone losing signal
mid-upload — left the button reading "Adding..." for the rest of the session. That is the wedged-busy
shape B-042 fixed in three other places. Both have the 60 s abort now, because it lives in the helper.

**The Catch-up answer refused photographs the rest of the app accepts.** It checked `file.size > 5MB`
*before* calling `shrinkForUpload`, so an ordinary 6 MB phone JPEG — exactly the file the shrinker
exists to make uploadable — was turned away on that one page. The pre-check is gone; `shrinkForUpload`
already refuses what it cannot shrink, by name (an animated GIF, a HEIC), which is a better sentence
than "Each photo must be under 5MB."

`postImages`, `announceUploadNotices` and `factsByUrl` now live beside `directUploadPut` in
`upload-client.ts`. `shrinkForUpload` deliberately stays at the call sites: `upload-size-rule.test.mjs`
greps each sending file for it by name, and its whole job is to notice the fourth surface that forgets.

One failure sentence replaces three. A member who was told "That photo would not upload. Try again." /
"That image didn't upload. Try another one?" is now told the same thing on both, and the composer keeps
naming the file because it uploads a batch one at a time.

Verified live as Jerry: a 16 MB JPEG through the support composer, a two-frame GIF through the post
composer (the notice toasted, the crop handle got its aim), and the wire contract probed against the
running route. `npm run check` green.

C-073's pin moved with the refactor and was re-pointed in the same commit, then mutation-tested: gut
`announceUploadNotices`, or stop `postImages` calling it, and the suite goes red.

## 2026-09-05 — Phase E, E2: one HEIC refusal

Six places decided a photograph was a HEIC and told the member so, in six wordings. Two of the six
hand-rolled the predicate, and one of those two was a real defect: the settings avatar compared the
two MIME strings only, so a blank-MIME iPhone photograph — precisely the case `isUnsupportedHeic`
checks the file extension for — fell past it to the byte sniffer and came back with *"That file
doesn't look like a JPG, PNG, GIF or WebP image."* True, and no help at all.

`heicRefusal(filename?)` and `heicBatchRefusal(count)` join `stillPictureNotice` in `upload-shared.ts`
and are shaped the same way: name the file when there is one to name. The advice clause is its own
export, because the browser shrinker's leading sentence is genuinely different — it is saying why a
file could not be MADE small, not that the format is refused — while its advice is the same advice.

The sweep that pins this found the sixth copy nobody had counted. The audit named four; a verifier
found a fifth in the contribute room; `image-downscale.ts` was the sixth, testing `/hei[cf]/i` against
the MIME type by hand. All six go through the one predicate now, and the test is a sweep over `src/`
rather than a list, so it catches the seventh instead of the six that exist today.

Not fixed, because verification refuted it: there was never a crash here. `sniffImageType` refuses a
HEIC safely and always did. The bug was the sentence, and the sentence is what changed.

`npm run check` green. Verified live that the contribute room still takes an ordinary photograph
through the `accept` callback this touched.

## 2026-09-05 — Phase E, E10a: the canonical origin has one home

`https://rishivalley.space` was a string literal in seven places: the proxy's canonical redirect,
`appUrl`'s production base, and four of the five URLs an email carries. `email.ts:44` already knew
and documented it rather than fixing it.

`src/lib/origin.ts` is one exported constant and **no imports**, which is the constraint that had
kept this undone: `proxy.ts` is bundled for the edge and says it cannot import `demo.ts`. The
obstacle there is that module's dependencies, not the directory, and a bare constant is edge-safe.
The file says so, so the next person does not add an import to it.

This costs two lines rather than saving any, and it is worth it for the reason `docs/TRAPS.md`
already records about the image host: moving a host was five changes, not one. The cost of being
wrong is a member clicking a dead link in an email, the one surface here with no undo.

Verified the redirect that uses it: `Host: rv-alumni.vercel.app` on `/feed` still answers
308 to `https://rishivalley.space/feed`.

## 2026-09-05 — Phase E, E3: an email says one thing, not two

Every message shipped an HTML part and a plain-text part, both typed out by hand, and **three of the
four had drifted** — a member could read two wordings of one message depending on their mail client.

| Message | HTML said | Plain text said |
|---|---|---|
| Reset password | set a new password "below" | set a new password "here" |
| Password changed | a button labelled *This wasn't me* | a bare URL, no label |
| Deletion scheduled | a button labelled *Keep my account* | a bare URL, no label |

`shell()` returns both halves from one set of words now: `body` is a `string[]` of plain prose, and
`shell` escapes and wraps it for the HTML and joins it for the text. The four `text:` arrays are gone.
Both missing labels come back for free, and the two notices' plain-text order now matches their HTML,
which it had stopped doing.

One deliberate copy loss: the reset email's address was bold in HTML and plain in text. The bold is
gone rather than added, because the address is already the only proper noun in that sentence and
restraint is the whole design of this file (owner, 2026-08-12).

**No test read this file at all** — the only two references anywhere were the importer and a
protocol-audit allowlist. `email-templates.test.mjs` now renders all four and checks both directions:
every sentence in the text is in the HTML, and every block in the HTML is in the text, with the
preheader and the shell's own furniture excepted by name. Mutation-tested: drop the footnote, the CTA
label, or a second paragraph from the text half and it goes red. The first two are precisely the bugs
this row was about.

All four plain-text parts were rendered and read before committing. `npm run check` green, 102 tests.

## 2026-09-05 — Phase E, E4a: one prelude for the dev scripts, and the guard import-album never had

Seven scripts in `scripts/dev/` made the same destination check — *"you asked for `.env.demo`, so the
connection had better carry the demo project's ref"* — each with its own copy of the ref, and one of
the seven messages had drifted from the other six. **The eighth script had no check at all, and it is
`import-album.mjs`: the one script in the folder that writes photographs into the archive.**

`databaseUrl(envFile)` in `_env.mjs` is the one copy, with run-sql's full comment as the reason.
`import-album` gained the guard by construction rather than by anyone remembering to add it, which is
the whole argument for the shape. `_cli.mjs` takes `argv()` (six byte-identical copies of `flag` and
`value`) and `bytesFor()` (two).

Verified rather than assumed. Against a deliberately wrong `.env.demo.probe` pointing at a
non-demo host, both `tag-professions-pick` and `import-album` refuse and name the ref. Against
the real `.env`, `tag-professions-pick --limit 1` and `tag-photos-pick --limit 1` both run to
completion, the second fetching a real photograph through `bytesFor`'s new home ("wrote 1, failed 0").

**161 lines out, 68 in.** `npm run check` green, 102 tests.

### The stranded-originals dry run, which three sessions have listed as unrun

`node scripts/dev/sweep-stranded-originals.mjs` → **0 staged originals under `collection/` in
`rv-alumni-media`, 0.00 MB, 0 to delete.** Nothing is stranded. The audit's open question is closed.

## 2026-09-05 — Phase E, E4b: one env parser, and it is dotenv's

Four hand-rolled `.env` parsers: `scripts/dev/_env.mjs` and three more in `scripts/demo/`, one of
which read `.env` twice (a leftover from when the second entry was a `.env.local`, folded away on
2026-08-08).

The audit said to write a fifth in `scripts/demo/`. A verifier refuted that: `_env.mjs` already IS
that module, and a fourth parser is the thing the audit exists to prevent. It also caught that the
two regexes disagree on **values**, not just keys, so a swap is not free.

So `_env.mjs` parses with `dotenv` now, which this project already depends on. The hand-rolled loop
got four things wrong that dotenv gets right: an inline `# comment` stayed part of the value,
trailing whitespace was kept, a quoted multi-line value was cut at the first newline, and
`export KEY=value` was not seen at all.

**Gate, run before the swap and not just after**: both parsers over the real `.env` and `.env.demo`,
compared key by key **by value** — the verifier's warning was that comparing key *sets* cannot see a
rewritten connection string. **25 keys, 0 differences.** Nothing changed that day. It is here so the
next value pasted in with a comment after it does not silently join a DSN.

One thing deliberately not shared: the two demo scripts **assign** into `process.env` rather than
calling `loadEnv`, because `loadEnv` refuses to override and here the demo file must beat whatever
the shell exports. A stray production `DATABASE_URL` in a terminal must not win in a script that
wipes what it connects to. Both now say so where the temptation is.

These three cannot be run (two delete every row in the database they reach), so the gate was
`npm run check`, a `tsx` probe proving the import resolves from a `.mts`, and reading the diff: all
four safety assertions (`DEMO_MODE=1`, the project-ref match, "differs from `.env`", zero-tables) are
untouched. Two comments calling a `.mts` file `.ts` went with it; `docs/spec/demo.md` explains why it
must be `.mts` and was right all along.

## 2026-09-05 — Phase E, E9: five hand-typed h1s, beside the component that exists for them

`AuthHeading` exists so that /login, /signup and the landing's stand-in never drift into three title
scales. Five sites typed its class string out instead: both /signup steps, /login, and both halves of
`auth-first-frame.tsx`. All five are `<AuthHeading title="..." />` now; children have been optional
since the calm-form pass, so each site goes from three lines to one.

Two reports disagreed on this. `auth-edge` filed the login/signup duplication as a not-finding, and it
is right about the perch box and the outer scaffold: a `FlightPerch` leaf would take seven props for
twelve lines of JSX. It is not right about the h1, where the component already exists and both files
already import that module. **Taken for the h1 only; the perch box and the scaffold are untouched.**

The pin moved and got stronger. `auth-first-frame.test.mjs:41` asserted the literal class string in
two files at once; that string now lives in one place, so it is pinned there by itself, and a second
test refuses a hand-typed `<h1` anywhere in the three auth columns. Mutation-tested both ways:
re-scale `AuthHeading` to 31px, or let the stand-in hand-roll an `<h1>` again, and the suite goes red.

Verified: `/login`'s h1 measures 27px / 33.75px / -0.675px in Libre Baskerville, unchanged, and
`npm run visual` is **25/25** — no pixel moved on any route at either viewport.

## 2026-09-05 — Phase E, E7a: one stamped-cookie scheme for the two gates

The human pass and the trivia pass are the same token — `${ts}.${hmac(label:ts:subject)}` — and had
two implementations: two mints, two parses, two clock-skew rules, two compares. `trivia-actions.ts`
said so in a comment: *"the same clock-skew paranoia human-pass-rule.ts applies."* A rule kept true by
a comment is the drift the `-rule` split exists to end. The two differ in exactly three things, and
those are now the parameters: label, subject, TTL.

`signStamp` and `stampValid` live in `human-pass-rule.ts`, which imports nothing relative so node can
run its test against it directly. `signHumanPass`/`humanPassValid` are one-line calls on them, so all
**nine existing attack tests pass untouched**. The helpers could not go the other way: `trivia-actions.ts`
is `"use server"`, where a non-async export breaks every importing route at runtime (C-189).

**One behaviour changed, deliberately.** `hasPassedTrivia` split on "." and compared only the middle
segment, so `<ts>.<validsig>.anything` was accepted by the trivia gate and refused by the human pass.
Nobody could forge that signature without `AUTH_SECRET`, so it was never a hole — but there is no
reason for one gate to be looser than the other. It tightens. There is now a vector saying so, rather
than a mystery failure waiting in `phase4-probe.mjs`.

The trivia gate had no unit tests at all, only the owner-run probe. It has five now: cross-browser
replay, the 30-minute expiry (asserted against the human pass's five, so the two TTLs cannot silently
merge), a future stamp, the junk-suffix vector above, and a label swap.

Verified end to end in the browser: answered the entry question, then submitted the form with an
address that already exists. The action returned *"An account with this email already exists"* — which
sits **after** the `hasPassedTrivia` check in `registerUser`, so the pass `signStamp` minted was
accepted by `stampValid`. No account created.

## 2026-09-05 — Phase E, E10b: the retention sweep's eight cutoffs as a table

Eight of the nightly sweep's steps are the same thing: one `deleteMany` against one date column, and
a count back. They were written out longhand, five lines each, differing only in the model, the column
and the number of days. They are a list beside `KEEP_DAYS` now, so the eight retention promises and
the eight deletes that keep them sit in one place.

**The obvious way to write this is the wrong one.** The audit proposed `{ model: "report", field:
"createdAt" }` strings and one narrow cast past Prisma's types. I wrote that first, then read the
comment I had put above it and found it was a lie: a typo in either string compiles, fails once a
night against a table that does not exist, and is swallowed into `reportSwallowed` — a silent leak of
exactly the kind this sweep exists to prevent. Each entry carries a closure instead, so `tsc` checks
every model and every column. Proved both ways: change `searchLog`'s column to `endedAt` and
TypeScript names it; drop a step from the table entirely and TypeScript notices `SweepResult` is
missing a field.

The four steps that are genuinely their own thing are untouched: `adminMessages` (a transaction that
files R2 purges before deleting), the notification cap (a window function), `catchupCopies`
(Serializable and batched) and the account purge. The one ordering that matters is kept — the age
cutoff runs inside the list and the per-member cap after it, so the cap still ranks what the cutoff
left.

Roughly line-neutral, as the audit said the whole phase would be: the code went 41 lines to 8, and
the reasoning above went in beside it. Not run: it deletes, and it runs nightly on its own.

## 2026-09-05 — Phase E, E6a: the security sweep stops asking git

Two of this repo's sweeps decided "which files are server actions" by `git grep -l '"use server"'`.
C-189 removed that from `gate-coverage.test.mjs` and wrote down all three ways it fails open: it
matches only the DOUBLE-quoted directive, it requires the directive at character zero (so a file
opening with its docblock is dropped whole, in a codebase this comment-heavy), and git sees only
TRACKED files, so a new action file is invisible until somebody stages it.

**`security-regressions.test.mjs` still had it** — the sweep pinning the two Criticals closed,
including C2, arbitrary unrecoverable R2 deletion. Every one of those failure modes produces *no*
assertion rather than a failing one, so an ungated new action simply ships. `serverActionFiles` lives
in `test-kit.mjs` now and both sweeps call it, so there is one answer instead of two that agree today.

Its second `git grep` had the same hole and is walked now too: the C1-c check that
`NEXT_PUBLIC_ADMIN_EMAIL` never reaches the browser bundle could not see an unstaged file.

**Both holes proved, not argued.** An untracked, single-quoted `"use server"` file taking `images`
with no `ownedUploadUrls` call, and an untracked file reading `NEXT_PUBLIC_ADMIN_EMAIL`: `git grep`
returns nothing for either, and the sweep now fails on both. The probes were deleted by the same
command that wrote them.

## 2026-09-05 — Phase E, E5a/E6b: one brace matcher, and the bug adopting it found

`scripts/qa/audit-status.mjs` — the script that decides what the security status board reports — kept
a byte-identical copy of `balancedBody`, and five test files still sliced function bodies by hand with
`indexOf("\n}")` or `indexOf("\n  }")`, the two shapes `test-fn-body.mjs`'s own docblock exists to warn
about. All of them go through the shared matcher now. `audit-status.mjs` keeps only the part that is
genuinely its own — the two declaration shapes to look for — and hands over the RegExp rather than the
match index, because a number passed as `decl` would be coerced through `text.match()` and silently
find something else.

**Gated exactly as the audit asked: `audit-status.mjs --json` before and after is byte-identical.**
All 74 tracked security items report the same state.

**Adopting it found a bug in the thing being adopted.** `balancedBody` steps over a return type written
as `Promise<{ users }>` by counting angle brackets — and there are no angle brackets in
`): { AND?: ...; OR: ... } {`, so it stopped at the TYPE's opening brace and returned the type instead
of the body. `audienceWhere` in `src/lib/posts.ts` has exactly that shape, and it is the function
`rich-truncate.test.mjs` pins the post-visibility author exemption on. The fix tells the two apart by
matching the brace and looking past it: if the next thing is another brace, the one just matched was a
type. Five shapes now covered and checked — bare object type, generic type, plain type, no type, and a
brace in a parameter type.

That defect is the same failure the helper was written for: a shape test reading the wrong region and
quietly asserting against nothing. Nothing was passing wrongly today, because the four converted pins
all fail closed — but the next `doesNotMatch` against such a function would have passed for ever.

Two `indexOf("\n  }")` sites are deliberately left: they slice a try/catch guard and an `if` branch,
not a function body, which is not what this helper is for.

Mutation-tested after conversion: remove one author exemption from `audienceWhere`, or stop
`generateViewport` reading the theme cookie, and the pins go red.

## 2026-09-05 — `/fix-campaign`: the audit runs itself now

The owner's job on a fix campaign had become clerical: paste the audit's `fix-prompt.md` into a
fresh Opus Max session, wait an hour, paste it into the next one, all night. Refactor audit 2 has
four phases left and none of them needs him except for the decisions.

`/fix-campaign` is that loop written down — installed **globally** in `~/.claude/skills/`, at his
request, so it works in any project rather than only this one. One orchestrator session collects
every question he must answer, in one batch, before any work starts; then it works the phases in
order, briefing **one** worker per chunk with the rows quoted verbatim, and verifying each worker's
output itself — the diff, the gate, the file — because an agent's report is a claim. It stops twice:
that first question batch, and the close.

**Two of his instructions shaped it and are pinned rather than described.** The questions go out as
plain numbered text, written into the fix-prompt *and* printed on screen, never through
`AskUserQuestion`: *"those are kinda restrictive and quit if you close the app."* And every question
carries the answer the session will take if he does not reply, so fifty of them can be answered with
one sentence. Each is five lines — what I'd change, what you'd notice, if I guess wrong, options, the
default — with a banned-word list and a re-read pass in the voice of someone who has never opened the
repo.

Resume is the `## Campaign board` now at the top of audit 2's fix-prompt: one row per phase, status
from a closed set of five words. A session that dies mid-run costs nothing, because the next one
reads the board and starts at the first phase that is not `DONE`.

`scripts/qa/fix-campaign.test.mjs` pins the shape: the four sections an open campaign's fix-prompt
must carry, the status vocabulary, the CLAUDE.md routing row, and the `AskUserQuestion` ban. Closed
campaigns are exempt by an explicit `<!-- campaign: closed -->` marker — audit 1's prompt has a
different shape because it predates the protocol, and retrofitting it would be a lie about what
happened. The global skill is checked only where a global skills folder exists, so CI has genuinely
nothing to check rather than silently passing.

All six assertions mutation-tested. One was missed on the first pass and is worth recording: the
CLAUDE.md check matched a bare `/fix-campaign` anywhere in the file, so deleting the routing row
still passed — the prose mention two sections earlier covered for it. It pins the table row now.

Both audit prompts in `docs/audit-fix/prompts/` now describe what the fix-prompt must contain, so a
future audit writes one the campaign can read instead of one it has to rebuild — and writes its owner
decisions in the five-line format from the start, which is the difference between copying fifty
questions across and rewriting them.

## 2026-09-05 — `/fix-campaign` becomes `/campaign`, and learns a second shape

The catch-ups rework is the second campaign with phases, a board and questions only the owner can
answer, and the skill written for audits did not think it applied: a design session handed
`handover.md` does not reach for something called "fix-campaign". So the skill is renamed and its
scope widened to any campaign, with the campaign file in charge of what a unit is, which model each
takes, and where a fan-out is allowed. Every pointer moved with it — CLAUDE.md's routing row and
prose, both audit prompts, `docs/audit-fix/README.md`, audit 2's fix-prompt, and the catch-ups
handover, which now opens by invoking it.

Three things are new rather than moved. **Fan-out guidance**: a `Workflow` when the same input
deserves many independent readings combined mechanically, subagents when the result changes what you
do next, neither when the work is one sequence with state. The default stays one worker at a time —
his words, asked directly: *"i'm in no rush so it's fine it's one after another."* Overlap is a
judgment the runner may decline, and the browser is a lock either way. **A quality section**: every
worker ends with the two things it is least sure it got right, two attempts in worktrees where taste
decides rather than a gate, adversarial review instead of confirming review, a phase read as one
diff after its units land, a drift check against the owner's original words every few units, and
permission to hand over before judgment degrades or to re-plan when the order turns out wrong.
**A notification between the two gates** when a unit lands that everything after it depends on, so a
bad direction can be killed the same evening instead of the next morning.

`scripts/qa/campaign.test.mjs` (renamed) finds campaign files rather than listing them, in
`docs/audit-fix/*/fix-prompt.md` and `docs/planning/*/handover.md`, and holds a file to the protocol
only if it names `/campaign`. That is what keeps the collection rework — run by hand before the skill
existed — out of scope without an exemption, and it is why the catch-ups handover is checked from
today. Headings are matched loosely because an audit writes "## Campaign board" and a rework writes
"## Status board"; the wording was never the thing worth pinning. Two new assertions pin the parts
he asked for by name: that the fan-out guidance is still there, and that sequential is still the
stated default.

## 2026-09-05 — S3 gets a cull step, unequal inputs, and a bar that is a test

Four changes to the catch-ups handover before S3 runs, all of them about the quality of what
comes out rather than the speed of getting there.

**A cull before the build.** S3 used to end with `directions.md` and hand straight to S4, so the
owner would have chosen between six or eight directions by reading five thousand words of prose —
the hardest possible version of the task for him, and hours of room-building spent on bets nobody
had looked at. S3 now ends by building `/lab/catchups/sketches`: one screen per direction, the same
real Round rendered every way, the reader only, 390 first. Static is fine; D21's "rooms, not
mockups" still governs the pick, this is only the cull. His twenty minutes on a phone is now what
sets S4's shortlist, and S4 builds the survivors instead of everything.

**Unequal inputs to the designers.** They all used to read the same six documents. At least two now
get `brief.md`, the design system and the architecture page and nothing else — no recon, no flows,
no prior art. Forty-three findings about what is wrong with today's layout is a detailed description
of today's layout, and a designer holding them designs in their terms, which is ¶26 exactly. The
blind ones should be the freshest and the least practical in the batch.

**The prior art is ranked rather than handed over whole.** F15 already said §7 and §8 are measured
and §1, §2, §3 and §5 are inference with nothing opened in a browser; the instruction now matches.
Low-confidence research does not make a designer better, it spends the attention that would have
gone elsewhere.

**One more question for the judge panel**: which of these would he still be thinking about tomorrow?
Scoring against a checklist rewards completeness and quietly prefers the safe direction.

And CLAUDE.md gains the one thing it did not have: a statement of what winning looks like. Every
design line in it was a prohibition. The bar is now stated as his two tests — does it give you any
dopamine, and can you tell it belongs to this app while looking like nothing already in it — with
the reason adjectives are banned from a brief written down beside it. He asked whether words like
"beautiful", "original" and "delightful" should go in CLAUDE.md; they should not, because a word
with no referent gets filled with the median of everything ever called that, which is the house
style of every AI-built app.

## 2026-09-04 — thirty days, said in one place

Refactor audit 2 found the split M55 thought it had closed. `snapshot.yml` ran
`prune.mjs --days 30` nightly; `retention.ts`, `docs/SECURITY.md` and the privacy page all
promised a year. M55 had seen the same disagreement and fixed it the wrong way round, raising
the code's default to 365 without touching the flag in the workflow, so the override survived
its own repair and members' notifications kept going at thirty days while the published policy
said 365.

The owner chose the behaviour over the promise: "30 days is good. you can update the privacy
policy to 30 days for notifications." So `KEEP_DAYS.notifications` is 30, `DEFAULT_DAYS` in
prune.mjs is 30, the privacy table and the SECURITY.md retention table say 30 days, and the
`--days` flag is deleted from the workflow — the number now exists in one place with a comment
saying why, which is the only shape that survives the next person to read it.

Four comments elsewhere cited the old year and are now false: `post-notifications.ts` and
`notification-reach.test.mjs` explain the 404-link cleanup by how long a bell row lives, and
`/notice/[id]` dated its own retirement from it. That last one is the interesting one — its
audience is notification rows minted before 2026-07-24, so at thirty days it has resolved
nothing since 2026-08-23. It is now retirable, and says so; deleting it is a fix session's job,
not an audit's. Gate green, 102/102.

## 2026-09-04 — the second refactor audit, and what it found by looking twice

Twenty-two readers over one tree: sixteen territories sized so each could read every file it owns,
six cross-cutting lenses for the questions that fall between them. **369 findings.** The whole
apparatus is in `docs/audit-fix/2026-09-03-refactor-audit-2/`; a fix session starts by @-ing its
`fix-prompt.md` and nothing else.

The five that matter: **the design lab's stylesheet ships to every member** — 74 KB of the 233 KB
shared sheet exists only because a `/lab` file uses those classes, it is render-blocking, and it is
on the signed-out landing page. **The sign-in pages carry a tooltip they never draw**, about 150 KB
of popover library on the first four screens a new alumnus sees. **`shadcn` and `world-atlas` are
paying no rent** — 234 packages, a fifth of the lockfile, for forty lines of CSS, and a 7.8 MB
production dependency kept alive by one lab file still doing what the shipped map was fixed to stop
doing. **Every
authenticated page runs seven queries before its own.** And **the QA tooling has been lying**: every
mobile screenshot of a signed-in page was taken with desktop hover semantics, so controls appear in
them a phone never draws; and `visual:report`, the tool behind the rule about never rebaselining
blind, has never worked here, because the reporter is registered only under CI.

The method that earned its keep was overlap. Territory readers and lenses were deliberately not
partitioned cleanly, and twenty findings arrived from two directions at once — which is how the lab's
CSS got measured three ways, how audit 1's half-executed hoopoe deferral surfaced from both the shell
and the mascot side, and how three lenses independently reached the retention divergence. The
correction that best repays it: `/lab/directory` still compiles a 105 KB atlas into a module, the
exact antipattern the shipped map's own comment documents as wrong — the lab room that prototyped a
fix never received it. **When a shipped file is fixed, the room that prototyped it is the second
place the fix has to land, or the room becomes a museum of the bug.**

Then twenty-five adversarial verifiers, each told to default to *refuted*. Eighty-four findings
re-tested: **none refuted, forty-five corrected in a detail.** That ratio is the audit's most useful
output, and it is now the fix prompt's first instruction — trust the finding, re-check the line
numbers. Seven corrections killed a recommendation rather than a citation, the sharpest being that
moving `touchLastSeen` into `after()` would throw in production and log nothing, because it calls
`headers()`.

One thing was fixed rather than filed, on the owner's answer, and it has its own entry above.

## 2026-09-04 — the ledger says the hour

The admin Support ledger printed a payment's day and nothing else, so two gifts of the same amount
on the same afternoon read identically, and no row could be held beside Razorpay's dashboard and
matched to a payment there. Every row now reads `4 Sept 2026, 16:37 IST`.

The zone is in the string, not implied. Both clock times this app already prints — the
verify-email banner, the mail queue's refill hour — name IST out loud for the same reason: an
unlabelled 16:37 is read as the reader's own, and the owner is not always in India. The formatter
is `formatDisplayDateTime` in `utils.ts`, spelling its date half exactly as `formatDisplayDate`
does so no surface says one day two ways, with a 2-digit hour so a column of rows lines up instead
of ragging between "8:34" and "23:34". Pinned at the IST/UTC seam in `valley-day.test.mjs`.
Rows in "Attempts that stopped" have no payment time and still show `createdAt`, the moment the
order opened; the comment on the row says so.

## 2026-09-03 — the viewer stops letting go of the page, and of its own controls

Two complaints, one photograph session. "Don't fade out the controls on the image viewer if
we're hovering over anything... I click next picture and it exits and I've totally lost track
of where I was." And: "don't allow me to scroll or interact with whatever's behind the image
viewer while I'm in it."

They turned out to be one shape twice. A mouse parked on the Next arrow sends no pointermove,
so the idle timer counted a cursor that was AIMING at a control as stillness; the arrow faded
to `pointer-events-none` and the click went through it to the wash beside the photograph,
which closes the viewer. The timer now also bails while `[data-viewer-chrome]:hover` matches,
asked only where `(hover: hover)` is true because a touchscreen leaves the state stuck after a
tap. A wheel counts as activity too: a trackpad zoom or a scrolled caption moves no pointer at
all, and the chrome used to withdraw in the middle of it. A press deliberately does not
count: `onTapPhoto` toggles the chrome, so a pointerdown that first set "shown" would invert
the tap and a phone tapping a withdrawn chrome would put it away again.

The scroll lock was worse: `document.body.style.overflow = "hidden"` had never locked anything.
Body overflow only propagates to the viewport when the root element's own overflow is `visible`
in both axes, and globals.css sets `overflow-x: clip` on `<html>` as a sideways backstop — so
the lock read as a lock and the page scrolled on underneath. It is on `<html>` now, where
globals.css already says the app puts it, with a non-passive wheel/touchmove guard for the
rubber-band. The guard asks two questions before it prevents anything: not inside our own
`[data-viewer-scroll]` caption box, and inside this overlay at all — the Edit dialog opens on
top of a viewer that stays open behind it and its 90vh body has to keep scrolling.

Measured in chrome-devtools rather than argued: cursor on the arrow, chrome still at opacity 1
after 20s; cursor on the photograph, still gone by 18s; `html` computed `overflow-y: hidden`
while open and `visible` after close, with the scroll position intact. Four pins in
`image-viewer-chrome.test.mjs`, since every one of these fails invisibly. Gate 102/102, visual
25/25.

## 2026-09-02 — four fast-uri advisories, closed with an override

The push went green through Vercel and red through the `check` workflow: four new high
advisories in `fast-uri` 3.1.5, published upstream between the local run and the push. Not
code, and not something the local gate could have caught -- `npm audit` reads a registry
that had changed underneath it.

All three paths in are build-time tooling (`@sentry/webpack-plugin`'s webpack, `prisma`'s
dev server, the `shadcn` CLI), every one of them through `ajv`, so nothing reachable at
runtime -- but this repo closes advisories rather than reasoning about reachability, and
`5dbb402` set the precedent with three others last week.

`overrides: { "fast-uri": "^3.1.7" }`. The 3.x line carries the patch, so no major bump and
no `ajv` compatibility question: all four resolutions move 3.1.5 -> 3.1.7 and the tree is
otherwise untouched. Six lines of lockfile.

## 2026-09-02 — the white flash was mine, and scrolling up is smooth now

**The section key I introduced this afternoon caused the thing he escalated about.** Keyed
by the year, React got duplicates and left sections behind; I keyed it by the band's first
PHOTOGRAPH, which is unique -- and which MOVES. A page arriving above changes which
photograph a year begins at, so the key changed, so React destroyed and rebuilt the entire
year and every tile in it went white and faded back: *"very frequently the photos appear and
then turn white and then reappear ... and all i'm doing is freaking scrolling?!?!"* He was
testing a regression I had shipped an hour earlier.

The key is now the year and how many times it has occurred -- `2021#0`. Unique in the bad
state, where a year repeats; unchanged in the good one, however much arrives above or below
it. Measured with a MutationObserver over a fast climb out of a seek: **144 images added, 0
removed, 0 sections rebuilt.** Nothing is destroyed, so nothing can flash.

**You could outrun the loader.** The head sentinel looked 1200px ahead, which is under two
frames of a fast upward flick against a round trip, so the reader reached the empty edge,
met the page header where the previous year should be, and was pushed back down when the
page landed. 3000px now -- roughly two pages of warning, which is what it takes to stay in
front of a hand. The foot keeps 1200: a page appended below the fold is invisible until you
arrive.

**And the anchor was shoving the one reader it was meant to protect.** It corrects the
scroll by everything the document gained, on the assumption that all of it landed above the
reader. True of everyone in the river, false of the one person who has scrolled off the top
of it -- for them the page lands BELOW, and the correction pushed them out of the header and
back into photographs they had just left. It now records where the seam is and leaves a
reader above it alone.

Measured over thirty 900px upward steps out of a 2020 seek: 0 images removed, 0 times the
bare edge was reached, 0 downward shoves, and it arrives at the top of the archive.

## 2026-09-02 — a seek is a scroll now, not a rebuild; and the page is driven as a journey

**"It's like navigating to a point in a pdf."** *"Why can't I just jump to that point
with the photos already above and below it??????? you don't lose the stuff above where you
navigate to momentarily do you?!?"* He is right and it was the design, not a bug in it:
pressing a year returned that year and everything older and NOTHING above, then trickled
the years above back in as the reader scrolled into an empty edge. So you landed against
the page header where 2020 should have been.

A seek now brings its context with it. `loadPhotos` returns `above`, the page before the
boundary, in the same query -- the "newer" branch was already there, so it is one function
called twice rather than a second query shape -- and the client prepends it before the
landing commits. The landing then aims at the pressed year's own heading rather than at the
head of the river, because those stopped being the same place the moment the river kept
what is above. Measured: pressing 2021 arrives with 1262px of 2022 already above it, 2019
with 1268px, 2023 with 410px, each with its own heading at the top of the viewport.

**The rail's tooltip is gone.** `title` on every row drew the browser's own grey box over
the photographs -- "I dont want that dialog box interfering with what im seeing." The count
it carried is still there in the form this rail was built to say it: the mark's length. That
is the same decision as cutting the number from the controls line, reaching the last place
it had not.

**And the page is now tested as a journey.** `e2e/collection-journeys.spec.ts`. Everything
else pointed here looks at the page standing still -- the visual suite screenshots it, the
unit tests read its source, `collection-seek` drives the lab room, which has its own state
and exercises none of `CollectionClient`. Every bug this week lived in a TRANSITION, which
is a state no screenshot of a settled page is ever taken of.

It asserts invariants over sequences and nothing about what the archive holds, because it
shares a database with production: a photograph appears once after any sequence; a pressed
year lands at the top, lit, with the archive continuous above it; headings exist in
Chronological and nowhere else; a swap and back returns the river you started with. It runs
the seek loop on the deepest half the account can reach, because the failure needs an
archive bigger than a screen.

Verified by reverting: with the section key and the `riverOrder` grouping both put back,
three of the four go red with the owner's own symptoms, including `Expected: 17, Received:
25` -- the river growing under him. Either fix alone is enough, which is worth knowing;
they were kept as belt and braces.

## 2026-09-02 — three facts on the Collection described the wrong half

Not one he reported: found reading the swap path for the bugs he did report,
and it would have been the next one he hit.

Three things on this page are per-half -- the member's own queue awaiting
review, whether the half holds any approved photograph at all (which decides
between the controls and the empty state), and how much room is left on their
account here. All three were computed for `filters.scope`, the half the SERVER
was asked for. Swapping halves happens entirely in the browser by design, so
after one press all three described the other collection: the Awaiting-review
strip drew the valley's queue over the Class Collection, an empty class got a
bucket line and a search box over nothing instead of its own empty state, and
the contribute room promised the other half's quota.

Answered for both halves on the server now, and only for halves the member may
actually read. Two indexed counts and one small findMany more per page load,
against a swap that needs no round trip and cannot be caught halfway. The queue
is held as a record keyed by half rather than one list reset on the swap: a list
has to be re-seeded at the exact moment `scope` changes, and getting that
ordering wrong is precisely how the valley's queue ended up over the class.

Six swaps, stable: 17 valley photographs and 48 class ones, every time, no
duplicates, no leftover sections.

## 2026-09-02 — the phone's scrubber travels instead of teleporting

*"The scrolling bar should never jump from place to place. It does that now."*
Measured on the class archive: the thumb sat on **the same pixel through
nineteen thousand pixels of scrolling** and then jumped 75px when the year
changed. It was placed at `indexOf(active) / count` -- the band and nothing
else -- so within a year there was nothing for it to say.

It now sits at the band PLUS how far through the band the reader has got, which
is the difference between a signpost and a scrollbar. Deliberately not the raw
scroll fraction: in a lazily loaded river that is a fraction of what happens to
be loaded rather than of the archive, and it would put the thumb nowhere near
the tick that names where you are.

The interpolation is one function, `readBandPosition`, and both indexes call it
-- the river off the heading refs it already holds, the scrubber off the same
headings' `data-band` in the DOM. Two implementations of "which year am I in"
is how the rail and the scrubber would come to disagree, which on this page has
happened before.

After: 176, 184, 193, 201, 210, 218, 226, 235 down the track over the same
scroll that used to produce two positions; no step over 12px across 26 samples.
The scrubber's scroll read is now rAF-throttled too, since it touches layout and
a scroll event fires more often than the screen refreshes.

## 2026-09-02 — the seek, on a phone, and the year that can go further up

Three more from the same read, all of them the same shape: something that
scrolls the reader assumed a number it should have measured.

**A pressed year landed underneath the app bar.** `headOfRiver` put the river's
top 24px below the VIEWPORT top -- 24 being the wide-screen rail's own `top-6`,
hardcoded. On a phone there is a 56px sticky bar over that, so the year you
pressed arrived 32px under the bar you pressed it from: *"2017 wasn't at the top
of the page it was just above the top so not visible."* The bar now carries
`data-app-bar` and the landing measures it, so one expression is right at both
widths and follows the bar if it ever changes height.

**And then you could not climb back out.** The upward seam is driven by an
IntersectionObserver, and an observer reports TRANSITIONS. After a seek the seam
enters range once, that one callback runs at the landing -- where the answer is
correctly "no, the reader has not asked" -- and it never fires again, because the
seam never leaves range. So scrolling up did nothing at all: *"all the years
above 2017 have disappeared ... above 2018 instead of 2018 is the title of the
page. WHY"*. The scroll listener now asks the same question on every scroll. And
`wantsNewer` has a second clause that is not a nicety: at the top of the document
there is no upward gesture to make, so at scroll zero the absence of one IS the
request. It fires once, the page lands anchored above, and the ordinary rule
takes over from there.

Ten of ten seeks now land on the year pressed, at the top, rail lit, no
duplicates -- against three of six landing wrong before today.

**The class page's first year sits on the order's line.** With no bucket line
beside it, the controls row was one short word on the right and a thousand empty
pixels to its left, and it pushed the first year heading 42px down for nothing:
*"the 2026 can go further up. still too much space. maybe align the tops of that
and the chronological."* On a wide class page the order is lifted out of that row
onto the river's own first line, so "2026" and "Chronological" share a top edge.
Measured after: both at y=105, and the order's right edge is 1404 in BOTH halves
-- the same pixel, which is the other thing he asked for. The rail keeps its
place with a 42px offset, exactly the row it replaces. Below 1280px nothing
changes: there is no rail column down there for the order to sit beside.

One visual baseline moved, examined first: a single horizontal band where the
heading rose, nothing else on the page.

## 2026-09-02 — the Collection's river, and the one bug wearing four costumes

The owner, after a minute on the page: *"there's still soooo many usage bugs in collection
it's crazy ... photos just disappear ... everything takes a reload to fix. we've considered
0 edge cases, 0 scenarios."* He was right, and the four things he named were mostly two
faults.

**A year is not a React key.** `<section key={band.key}>`. `bandsOf` cuts CONSECUTIVE runs,
so the same year comes back as several bands the moment the list is not sorted by year --
which is every render between pressing Chronological and the chronological page arriving,
because `order` flips at the press and `photos` does not. React got `key="2021"` four times,
stopped being able to reconcile the list, and left nodes behind: sections belonging to a
query nobody was looking at, still on the page, showing the same photographs again, under
headings the current order does not draw. Measured: eight scope swaps grew the valley's 17
photographs to 41 nodes with 24 duplicates, and the leftover section carried `mt-12` while
sitting first in the DOM -- a corpse React had lost track of. His "2021 twice under Newest"
screenshot is this, and so is "photos just disappear" and "everything takes a reload".

Keyed by the photograph a run starts at now, which is unique by construction. And the
second half of the same fault: the river is grouped by `riverOrder`, the order the
photographs on screen were actually FETCHED in, committed alongside them -- never by the
order that has been asked for.

**The seek ran away from you.** Pressing a year lands the reader at the head of the river,
which is exactly where the upward sentinel lives -- so on arrival it was on screen, it
fired, `loadNewer` prepended the year above, and that armed it again. Press 2020 and the
river climbed back toward 2026 while you watched: *"it goes to chron but brings 2022 to the
top of the page but the siderail says 2026."* Measured before: three of six seeks landed on
the wrong year. It now needs the reader to be travelling UPWARD, which is a fact about them
and not about what is on screen. After: eight of eight land on the year pressed, at the top,
with the rail lit on it.

Two smaller ones found in the same read. A landing left its scroll anchor in the ref, so the
next page to arrive "corrected" the scroll by the difference between two unrelated documents
and threw the reader somewhere arbitrary. And `more`/`loadNewer` could fire while a new
river was in the air, fetching from a cursor cut in the archive nobody is looking at any
more -- the generation guard only catches pages already in flight, not ones started
afterwards.

Four pins in `river-query.test.mjs`, all structural: they fail if a year becomes a key
again, if the requested order reaches the river, or if the head sentinel goes back to
firing on visibility alone.

## 2026-09-02 — the dev server can be opened on a phone now

**`allowedDevOrigins`, three private ranges.** Since Next 15.2 the dev server answers
`/_next/*` with a 403 to any request whose Origin is not localhost. The Mac's server binds
to every interface, so `http://192.168.x.x:3000` from a phone on the same Wi-Fi returns the
HTML fine -- and then every script 403s. Nothing hydrates, and every element still sitting
at the `opacity: 0` start of an entrance animation stays invisible, so /login rendered its
background and the word "Back" and nothing else. A blank page with no error on it, which is
the worst shape a failure can take: the owner spent twenty minutes turning off iPhone
settings, and the network was never the problem.

Reproduced exactly by loading the same LAN address in Chrome here rather than guessing at
his phone -- 15 resources 403, the HMR socket refused, `isSecureContext` false. One line of
config, and the form paints.

The three RFC1918 ranges rather than one machine's address: the router reassigns, and a
config that needs editing to keep working will be wrong on the day it is needed. It widens
dev access from "this Mac" to "anything already on this Wi-Fi", which is the trust boundary
the dev server has anyway. Production builds ignore the option entirely.

Worth having beyond one bug: this project is mobile-first and had no way to look at a change
on a real iPhone short of deploying.

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

**Chronological stopped moving between the two halves.** The controls row is
`justify-between`, and the class side drops the bucket line, which left the order dropdown as
the row's only child -- and a lone child in `justify-between` sits at the START. So it jumped
from the right edge to the left the moment you swapped halves: *"the position of newest
chronological etc should be the same in valley and in collection, i dk why it's switching
spots."* `ml-auto` on the order block, so it is pinned right whether or not the buckets are
beside it.

**The question mark is gone from every page title.** *"Ditch the question marks when you click
on page titles. On desktop I can say just click the title for the guide. And on phone let it
work the same just remove the question mark."* The mark was his own pick from three on
2026-08-27; a shortcut that has to draw itself on every heading is not a shortcut. The
two-step on touch stays and is now invisible: first tap arms, second opens, because a tap on
a 30px heading is as often a scroll that started badly. The four-second disarm matters more
than it did, not less -- with nothing on screen, a tap a minute later has to be a first tap
again.

## 2026-09-02 — session close-out: the scrubber gets out of your hand's way

**The "errors on localhost" were the dev server, not the app.** `verify:crawl` came back 200
on every route with no console errors; the one timeout, `/pick-bird`, answers 200 with no
errors on its own. The server had been serving a pre-change module for `?scope=class` through a
touch and a real content edit, its HMR channel had stopped answering, and an e2e run that takes
one minute took fourteen and a half. It has since been restarted, and on the fresh server the
class half correctly opens on `taken` and the valley on `newest` -- the change was right all
along. The five specs that failed against the sick server pass 13/13 against the healthy one.

**The rail shows years rather than decades on the live Collection, and that is deliberate.**
The rail folds into decades only once the years stop fitting down the column, which at a 23.5px
row is about twenty-nine of them; the live archive has three. Offered the alternative -- group
the moment a second decade exists, so the approved decade rail appears far sooner -- the owner
kept the fit-based rule: *"let it show as separate years until they fit, that's a good idea."*
Written down beside the line, because it reads like an oversight and is not one.

**The scrubber's readout moved out from under the thumb.** *"My thumb covers the ticks so I
can't see them ... the year is a bit hidden by my finger sometimes. I like the big text, the
focus, the ticks, just need to tweak how it's done."* So what you HOLD and what you READ are no
longer in the same place: the hairline stays on the right edge where a thumb goes, and
everything meant to be looked at moves inboard of the ~50pt a thumb and the hand behind it
occlude. The scale starts at 54px, the year's right edge at 92px, and the year still sits just
inside the longest tick so the two read as a label on a ruler.

**Two visual baselines updated, both examined first.** Mobile `collection` and
`collection-class` carried two intentional differences: the scrubber's hairline is a TIMER
rather than a state -- raised by a scroll, gone a second and a half later -- so it is masked in
`volatileRegions()` now, and the baselines predated `8a10763`, the approved change that opens
the header search as a line rather than a box. The differing pixels were bounded to
(279,77)-(390,124) and read before anything was rewritten.

Gate green (99/99), seek specs 13/13 across both viewports, visual 25/25, `npm audit` 0.

## 2026-09-02 — the scrubber was unreachable, a class opens in time, and three advisories closed

**The scrubber could not be found, and the reason was a bad decision of mine.** *"How do you
access the side rail on mobile, can't find it."* I had gated it to Chronological, on the
argument that a year label means nothing in a river sorted by upload date. But the Collection
OPENS on Newest — so on a phone, on the real page, there was simply nothing there. The rail has
always been drawn in every order and pressing it commits to reading in time; the scrubber now
does the same. What changes with the order is only what the thumb REPORTS at rest: running in
time it sits at the band you are in, otherwise it rides the scroll and claims no year. Held, it
is the same index either way, and letting go turns the river to Chronological and travels
there. Verified end to end on the real page: opens on Newest, drag, release, and the URL is
`?when=2021&order=taken`.

**A class opens on Chronological** (owner). It is not a feed of arrivals, it is one batch's
record of itself, and "what have we got, from when" is the question people bring to it — which
is also the only order the rail and the scrubber can index, so the half that most wants an
index gets one on arrival rather than after a trip through a menu. Switching halves takes that
half's default with it, alongside the bucket and search that were already cleared.

**The right edge is the scrubber's.** The browser's overlay scroll bar shows at exactly the
moment the scrubber raises its hairline, in exactly the same place, so the two drew on top of
each other. The native bar is hidden — scoped to under 1280px and only while the Collection's
scrubber is mounted, with `scrollbar-gutter: stable` already app-wide so nothing shifts.

**A trap worth writing down: `defaultOrderFor` cannot live beside `riverFiltersFrom`.** That is
where it reads most naturally, and putting it there dragged `collection-data.ts`'s whole server
graph into the browser bundle — auth, then `next/server`, then Prisma, then sharp. `tsc` was
perfectly happy; the Collection rendered a blank page. It lives in `collection.ts` with
type-only imports, and a test asserts it has not moved back.

**And the dev server lied about it.** After the fix, `?scope=class` still came back `newest`
from the running server while `?when=2021` correctly came back `taken` — the pre-change module
for that one route, surviving a touch and a real content edit (CLAUDE.md gotcha 1). Isolated in
node, the function was right all along. That is why the behaviour is pinned in the unit suite
rather than confirmed by looking at the page: a manual check would have "proved" the opposite
of what the code says. **The dev server needs a restart before the class default shows up
locally.** It is not this session's process to restart.

**Three dependency advisories closed rather than accepted.** `mysql2` (high, auth-plugin
downgrade leaking plaintext credentials) arrives only through the Prisma CLI, which bundles a
driver for every database it supports; this app is Postgres and never opens a MySQL connection,
so it was unreachable — but Prisma pins it at exactly 3.15.3, so no update could reach it and an
override was the only route. `postcss-selector-parser` (low) comes via the shadcn CLI, and
`browserslist` (high, two advisories) via Sentry's webpack plugin and shadcn — both build-time,
both already in the pushed lockfile. All three are `overrides`, beside the existing
`deepmerge-ts` entry: `npm audit` reports 0, and the repo's own gate is clean without adding a
single new allowlist entry.

## 2026-09-02 — the phone gets a scrubber, and the scrollspy stops lying

*"You have to think of an ingenious non-intrusive way of doing it on phone as well, something
like the google photos scroller."* Then, on the first attempt: *"that green mobile scroller
looks a bit cringe. Maybe not a full colour background way of doing it. Something more elegant.
Maybe the background fades out while you're doing it and we kinda make it a spectacle of a
scroller that people can get such a thrill out of using."*

**Three states, and the first is nothing.** At rest there is no scrubber — no track, no rule,
no furniture down the edge of the photographs, which is the state the Collection is in almost
all of the time and the reason the other two are allowed to be as loud as they are. Scrolling
raises a single three-pixel hairline against the right edge, an iOS scroll indicator near
enough, with no lettering at all; it leaves a second and a half after the river stops. Held is
the spectacle: the photographs fade back to the page's own paper, every band the archive holds
comes up the edge as a scale with the ticks lengthening toward your thumb, and the year reads
out beside it in Libre Baskerville at forty pixels.

**Nothing in it has a fill.** The Canopy pill was wrong twice over: Canopy is this project's CTA
colour and a position readout is not a CTA, and a solid lozenge riding over the photographs is
a widget sitting on the work when the whole idea is for the work to step back and let the index
through. The scrim is the page's own background rather than a shadow, and stops at 88% so a
ghost of the photographs stays under it — go opaque and it stops being the Collection stepping
back and starts being a different screen.

**It scrubs the BANDS, not the page.** The river is cursor-paginated, so a scrollbar's
arithmetic — position over document height — would map a thumb's travel onto whatever happened
to have loaded and call 1978 by a different name every time another page arrived. The drag maps
onto `orderBandKeys`, which is now shared with the rail rather than derived twice: they are
different shapes for different hands but indexes of the same sequence, and two copies of "which
band comes after this one" is two copies that can disagree.

**And the scrollspy had been lying.** `useActiveBand` hangs off an IntersectionObserver whose
root is the top fifth of the window, so it only fires when a heading crosses THAT strip — which
is what continuous scrolling does and what a jump does not. Landing from 28,872px to 14,002px
with no heading inside the strip at either end changes no intersection state, delivers no
callback, and leaves the reading wherever it last settled: measured, the reader at the 2000
heading with the rail lit on "Undated". It went unnoticed for as long as it was only a mark
glowing in a margin. The scrubber prints the answer on screen, so it had to be right — one
reading per frame, on scroll, and only while the page is moving.

## 2026-09-02 — the rail goes back to the deployed metrics, and starts sticking again

Four things, and the most important of them was a regression I put there.

**The rail had stopped being sticky.** *"The siderail shouldn't disappear when I scroll down,
cause if I'm at 1987 the only way to navigate is to scroll to the top?"* Measured: after
scrolling 2500px the rail sat 2312px above the window, and its computed position was
`relative`. The rewrite had added a `relative` class beside `sticky` to give the absolute rows
a containing block — and Tailwind emits position utilities in its own order rather than the
class string's, so `relative` won. `sticky` is a positioned element in its own right and needed
no help. One class deleted.

**The metrics are the deployed rail's, measured off it rather than remembered.** A row was
23.5px there (22.5 plus a 1px gap, an 11px label at the inherited 16.5px line height) and had
drifted to 17px here — *"in general all the decades are cramped together"* — which is also the
answer to *"you have a lot less magnification"*: the dock's three numbers were already
identical, but the same 1.16 on a smaller row is a smaller swell. `ROW` and `ROW_H` are now
copied from the shipped file with the measurement written down beside them.

**The years are packed.** No slot left for a year the archive does not hold, none stretched to
fill a block. The stretch is what made *"under 2010s it's okay but 2020s for some reason is so
much wider"* — the 2020s holds three years across a five-year span and was being pulled over
ten slots. Every tick in the rail is now the same distance from the next, at every level, in
every decade, whatever the archive holds.

**And the rail can be walked without leaving it.** *"I don't want to have to exit the siderail
and enter again to get the next row."* Packed years mean blocks of different heights, and
opening whichever decade's block contains the pointer looks right and is not: leaving a
ten-year decade drops the pointer clean past a one-year decade and into whatever is under THAT.
Measured, a steady drag went 2020s, 2010s, 2000s, 1970s, 1940s — four skipped. It steps ONE
decade in the direction you left, no more than once per row of travel, which is exactly the
sensitivity the closed list already has. Both directions verified monotonic.

Also: `protocol-audit` was failing on `src/lib/text-width.ts`, a table of character WIDTHS in
which "·" is one of the characters being measured. The rule looks for a dot between two quotes,
which is what a keyed lookup of glyph metrics is made of. Exempted in the audit rather than
bent in the component, beside the existing exemption for metaLine's own implementation.

## 2026-09-02 — the photograph you can finally get closer to

Owner: *"you can't really pinch zoom on the image viewer. make sure you can on mobile and
desktop."* He was right, and it was the wrong gap for an archive of scanned prints, where the
thing worth seeing is usually a face in the back row rather than the whole frame.

**Why this was a rewrite rather than an addition.** The viewer handed horizontal swiping to
Motion's `drag="x"`, and Motion's drag knows about exactly one finger: a second finger landing
on the photograph did not begin a pinch, it carried on dragging. There is no way to bolt a
two-finger gesture onto a one-finger library without the two fighting over the same pointer, so
the swipe moved into `src/components/common/pinch-zoom.ts` beside the pinch and one state
machine now owns every pointer. Its three tuned numbers carry over verbatim — 14% elastic
follow, a 70px or 420px/s release, no overshoot home — because that feel was settled and this
was a gesture rewrite, not a re-tuning.

**Every way in.** Two fingers pinch, anchored on the midpoint you started with and panning as
that midpoint travels. One finger pans when zoomed and steps when not. Double tap or double
click goes to 2.5x on the point you hit, and back. A trackpad pinch arrives as a wheel event
with `ctrlKey` set, which is the only way a browser reports one; a plain wheel notch zooms too,
since a mouse has no pinch. `+`, `-` and `0` for the keyboard, and Esc now backs out of the zoom
before it closes the viewer.

**Two things that cost measurements.** The pan clamp was reading `offsetWidth`, which rounds to
a whole pixel — half a pixel becomes four at 8x, and a photograph panned hard against the side
of the screen left a 0.9px hairline of backdrop down its edge (measured). The fitted size is now
arithmetic on the file's own dimensions, which is exactly what `max-w-full max-h-full` does, and
all four corners land within 0.05px. And the zoom ceiling is the file's own 1:1 point rather
than a constant, floored at 4x and capped at 8x: the owner has objected twice to photographs
upscaled into grain, and an unbounded zoom is that complaint with a gesture attached.

**A single tap on the photograph is held for 240ms** and there was no way around it: the first
tap of a double tap is indistinguishable from a single one until the window closes, and firing
the chrome toggle immediately would flash the chrome in and out under every zoom. A tap on the
backdrop still closes instantly — closing must never feel hesitant, and a double tap out there
means nothing anyway.

Verified with a throwaway puppeteer probe rather than the usual `chrome-devtools` MCP, which did
not load this session: real CDP touch events for the pinch and the swipe, real ctrl+wheel for
the trackpad, at 1440x900 and 390x844. Anchoring holds to 0.005 of the frame, the pinch scales
by the ratio of the fingers, a pan while zoomed never steps, and a step arrives fitted.
`pinch-zoom.test.mjs` pins the seven mechanisms whose absence looks fine from the outside.

`npm run visual` is 23 passed / 2 failed, and both failures are `/collection?scope=class`, whose
baseline still expects the empty state another session has just filled with 1,719 photographs.
Nothing to do with this change; that route wants a mask or a rebaseline from whoever owns it.

## 2026-09-02 — a decade of one class's photographs, dated one by one

The owner's own album, 1,719 photographs spanning 2015 to 2023, into the Class Collection
of 2023. `scripts/dev/import-album.mjs` is what put them there.

**Why not the contribute room.** It already takes a bulk drop and is good at it, so the
first instinct was to use it. Three of its limits are the wrong shape for seeding an
archive: 200 per drop, 20MB per file (seven of these are bigger), and — the one that
actually decides it — **one date for a whole drop**. An album spanning nine years needs a
date per photograph or the year rail, which is the entire reason for putting it there, has
nothing to draw.

**The dates.** Read per file with `exifStamp`, the reader that deliberately cannot name a
GPS tag. 1,688 carry a real camera stamp and are filed at month precision. 28 are filed at
YEAR precision because `album-date-provenance.txt` marks them "owner gave the year only" —
their files say 1 January midday and nobody should read that as January. Three PNGs fall
back to the folder name, which is the owner's own filing rather than an invention, and the
script lists them rather than doing it quietly. Every year count came out exactly equal to
its folder's file count, so no photograph's EXIF disagreed with where it had been put.

**The stored copy now keeps its date, and only its date.** The owner: *"I thought date
metadata is already stored?? yes I want that stored."* It was — in the database, as
`exifYear`/`photoYear`, which the viewer reads. It was not in the bytes, because the
re-encode drops EXIF and audit M12 wanted it dropped: 356 of these files carry the GPS
coordinates of a boarding school. So `dateOnlyExif` builds a FRESH block holding one tag
and hands it to `withExif`. An allow-list of one, never the original block with things
removed — a strip-list is wrong the first day a camera writes a tag nobody anticipated.
Verified end to end on a real file fetched back off the CDN: 3264x2448 in, 3264x2448 out,
`DateTimeOriginal` present, latitude and "iPhone 6 Plus" gone.

Writing that needed `exifStamp`, which is `exifDate` handing back the string instead of the
parsed pair, so the day and the second survive rather than being reconstructed from a year
and a month. The round-trip test immediately caught what the parser never had to care
about: **EXIF ASCII values are NUL-terminated and `trim()` does not remove a NUL**, so the
stamp was being written back into files as `"2019:03:14 09:12:00\0"`.

**q100, and two corrections owed to the owner.** Twice now a session has told him the
Collection downscales to 1920px. It does not, and the reason is not carelessness: `image.ts`
exports `toDisplayWebp`, a well-named function whose docblock says "The display copy of an
uploaded photograph … boxed to 1920", and it belongs to the FEED. The Collection's real
encode is an anonymous chain inside `contributePhotoDirect`. That pair is now in TRAPS.md,
and the quality is a named `COLLECTION_WEBP_QUALITY` so it can be found by grep.
The second correction: "zero dimension changes" was true of a 48-photo random sample and
false of the album — seven 2021 shots are 60-62.8MP, above the 40MP anti-bomb cap, and do
come down. The owner chose to let them.

Measured before he chose, on his own photographs: q90 stores 38% of source bytes, q95 66%,
q100 93%. He took q100 after asking what three terabytes would cost — about $46/month on R2,
and about $18 on Backblaze B2, which is cheaper because Backblaze sells disk and Cloudflare
sells network. B2 has no APAC data centre, which is what settles it for members in India.

He then proposed the sharper version: *"not compressing so q100 until the resolution is above
4k in which case we downscale to 4k."* Measured rather than argued, and it is the one idea in
this session that had to be talked out of. 4K on the long edge is 9.8MP; the album averages
14.7 and the Canon shoots 24, so a 4K cap shrank 11 of 14 sampled photographs. And it costs
the SAME bytes as simply dropping to q90 — 39% of source against 38% — so it buys nothing it
was reaching for. The asymmetry is the argument: q90 removes detail nobody can see and leaves
a 24MP master to re-derive from; a resize removes the photograph. He took full resolution.

**No ceiling for the archive keeper.** `MAX_PHOTOS_PER_ACCOUNT` is 1,000 per half and the
album is 1,719. Owner: *"of course no limits for uploading should be there for me."* Admins
are now exempt in `photoQuotaError` and in `roomLeft`, which have to agree or the drop room
caps a batch the server would have taken. Same exemption, same shape, as
`isPhotoAutoApproved`.

**Two bugs found on the way, and then fixed on his instruction ("solve both").**

The first: nothing outside the two nightly jobs declared a `maxDuration`, so every upload ran
on the platform default. A 24MP photograph re-encodes in 1.5 seconds and a 40MP one in 16,
before either R2 round trip — and past the limit the invocation is killed, so the member sees
a contribution that failed and nothing is reported anywhere, the process having died before
any error handler ran. Exactly the gap audit C-079 was about, still open on the paths doing
the most work. Now 60 seconds on the two collection PAGES and the two upload routes. On the
pages and not on `actions.ts`, because a Server Action inherits its timeout from the page
hosting it: declared beside the action it would have looked right and done nothing. The
C-079 test grew a second half that pins all four.

The second: `sharp.metadata().exif` comes back EMPTY for a PNG whose `DateTimeOriginal`
exiftool reads without difficulty, so the contribution succeeded and the photograph was filed
undated with no symptom at all. PNG keeps EXIF in two places and libvips reads neither — the
`eXIf` chunk, and the one Apple and ImageMagick actually write, a deflated `zTXt` chunk keyed
"Raw profile type APP1" holding the TIFF block hex-encoded. `exifFromPng` finds both and hands
the bytes to the same walk as every other format, so it is a container reader that parses no
tags and the module still cannot name a GPS tag. `exifBlockOf` is now the single place that
chooses a source, because a fallback only `exifDateOf` got would date a photograph in the
archive and leave the downloaded file undated. Its test asserts sharp finds nothing, so the
day sharp learns to, somebody hears about it rather than the fallback shadowing it for ever.

All 1,719 are in, nothing failed, and every per-year count equals its folder's file count
exactly: 6, 19, 23, 116, 206, 442, 234, 465, 208. 1,691 at month precision and 28 at year.
Nine integrity checks are zero — scope, class, approval, uploader, `takenKey`, dimensions,
duplicates. 18,818 megapixels stored, largest 40.0, which is the anti-bomb cap doing the only
resizing in the archive. `?when=2018` lands the river on the 2018 chapter, which is the whole
reason the dates had to be per photograph.

The PNG fix landed mid-import and the three affected photographs had already gone in at year
precision, so they were undone through the ledger and re-imported — which caught that the
script needed the same fallback separately, `exifBlockOf` being unreachable behind the `@/lib`
alias. Now 2020-06, 2020-06 and 2020-07, matching exiftool, with the date in the stored bytes.

The script is dry by default, ledgers every write one line at a time before the next photograph
starts, and `--undo` takes the rows and their stored objects back out — which matters because
the app has no way to un-file a class photograph. `Photo.sourceKey` is unique and carries
`album:<path>`, so a crashed run is resumed by running it again; a query up front means a resume
does not re-encode what is already in. It began as one `pg.Client` shared by four workers, which
pg serialises and pg@9 will refuse, and is now a pool.

## 2026-09-02 — the gate CI runs is the gate you run

The owner has been getting "Run failed: check" emails minutes after pushing, on trees that
were green when he ran `npm run check`. Both halves of that were true at once, because
check.yml ran three steps, not one: `npm run check`, then the npm advisory gate, then the
audit status board. CI was a strict superset of the local gate, so the two extra checks
could only ever be discovered after the push — and a push to this repo is a deploy, so the
email is always about code that already shipped. Twice in a fortnight it fired: a
browserslist advisory published overnight (2026-09-02, run 33601328643) and an open high
finding on the status board (2026-08-27, run 33071535024).

Both are gates in check.mjs now, `deps` and `security`, and check.yml runs `npm run check`
and nothing else. `scripts/qa/ci-parity.test.mjs` fails the build if a step is ever added
back — one list of gates, in one place, and the test is what keeps it one.

Making the advisory gate runnable on a laptop turned up a fail-open. `npm audit` answers
`{ message, error }` with no `vulnerabilities` key when it cannot reach the registry, and
gateVerdict read the missing key as an empty report: an audit that never happened returned
a clean bill of health for dependencies it had never looked at. It now says so, and exits 2
rather than 1, because "could not check" is a different answer from "checked and found
nothing". check.mjs reads the difference — a warning on a laptop with no network, a failure
under CI, where there is no such excuse. Two tests pin it.

The H16 probe was reading check.yml for the two script names, so moving them turned it OPEN
and failed the run. That is the probe doing its job: the mechanism moved, and the proof had
to follow it to check.mjs. Its both-directions evidence is that it went open and then ok,
observed, not argued.

Gate 101/101, all seven green in 37s.

## 2026-09-01 — the Collection card never truncates its caption

*"I don't want any ... in the from the collection. only pick photos for whom that wouldn't
occur."* The card had shown "Sports day closing ceremony (silent..." — a tile announcing it
was too small for what it held.

The fit is now decided where the photograph is chosen, on the server, because that is the
only place a different photograph can still be picked. That needs the width of a line of
Libre Baskerville without a browser to ask, which is `src/lib/text-width.ts`: advance widths
per glyph in ems, measured off the live card with canvas measureText and divided by 14.

**A character count would have been wrong twice.** Real captions run 6.5px to 8.1px a
character, so any single cap both admits captions that overflow and throws out ones that fit:
36 characters of "Senior hostel boys tunnel ball relay" clear the line by 14px while 30 of
"Class 12 vs Staff – Tug of War" only just do. Summing the letters is the only true answer.

The table reads WIDE — it adds advances and ignores kerning, which only ever pulls a pair
closer — so it errs towards passing over a photograph rather than towards an ellipsis. Checked
against the browser on all thirteen captions in the archive: 0.1px to 3.8px over, never under
by more than a rounding error, every verdict the same. Two of the 260px line are left unspent
anyway. The rail is a fixed 318px column, so 260 does not move with the viewport.

It looks at the 24 most recent landscape photographs and takes the first that fits; a
photograph with no caption has nothing to truncate and stays eligible. If none of the 24 fit,
the card hides, which is what it already does when the archive is empty.

## 2026-09-08 — build phase 3: the picture

`spec.md` §3.4 and §10.2, drawn in `architecture.md` §1b. Every Catch-up now carries a
photograph in the database, from the day it is made, and there is a control that changes it.
**Nothing draws it yet** — the list is phase 6 and the home is phase 7 — so `npm run visual` is
25/25 with no baseline moved, which is the correct result rather than a suspicious one.

His diagnosis is the whole reason the phase exists (N19): *"In feed, you have these images, you
have the birds and everything ... Directory, you have the whole graphic of the map ...
Collection, obviously there's so much graphics ... Catch-ups is the only one that has like
nothing, no images, no media. It's just all text and organization and very functional and very
corporate."* And N23 is why it is compulsory rather than an upload people may skip: *"then we'd
have to have 2 different architectures."*

**Two columns, NOT NULL, with the backfill in the same file.** `Catchup.pictureSrc` is a path
into the shipped pool or an https url on our own image host — one column, because they are the
same thing to every reader of it — and `Catchup.pictureFocus` is the `object-position` its crop
is taken at. The backfill is deterministic on `hashtext(id)`, masked positive first because
Postgres's `%` keeps the sign of the dividend and a negative index would leave the row NULL for
the `SET NOT NULL` to refuse. It carries the FOCUS through with the pick rather than leaving it
on the column default: three of the six stand-ins are aimed at 88, 90 and 92 per cent, and
taking the photograph without its aim is what returns a band of green canopy where a horizon
should be. Applied to **both** Supabase projects: 6 rows on production, 0 on the demo, which
seeds its own.

**The column has a DEFAULT, and that is not laziness.** One database serves production and local
dev, so a NOT NULL column with no default breaks the RUNNING build's `catchup.create` the moment
it lands, and applying it after the deploy breaks the NEW build instead. A default makes both
orderings safe, so this file could be applied before the push like every other additive change.
`catchup-pictures.test.mjs` pins it equal to `CATCHUP_PICTURES[0]`.

**The pool left the lab.** `PICTURES` lived in `src/app/lab/catchups/sketches/_shelf.ts`, which
the public demo's build does not compile at all — and the creation path, the settings control and
the demo seed all need it. It is `src/lib/catchup-pictures.ts` now, with the measured band beside
it, and the room re-exports it so there is exactly one pool. **Adding his twenty is one edit to
that array and no migration**, and the test file is what says whether the edit was complete: it
checks every file is on disk, no duplicates, and that the migration's own retyped VALUES list
still matches.

**Creation writes one**, in both places that mint a `Catchup`: `createCatchupWithPeople` seeds
`pictureFor` off the group id, which exists inside the transaction already, and the demo seed off
`demo-catchup`. Deterministic rather than random, so a retried creation and a re-seed land on the
same photograph.

**Who may change it, written now so phase 4 does not have to widen it.**
`mayChangeCatchupPicture` is pure and tested: whoever may run the Catch-up, and on a batch
Catch-up **anyone in the batch** — his answer to owner question 18. It is the one place this
feature departs from the accident rule, and it has to: nobody keeps a batch Catch-up, so
Keeper-only would mean nobody at all, for ever, on the Catch-ups most members will be in. Batch
Catch-ups arrive in phase 4; `Group.batchYear` is the whole test and the guard already reads it.
The home passes `canChangePicture` alongside `isKeeper`, and the settings dialog shows the
picture row on the first and the clock controls on the second, so phase 4 flips one boolean.

**THE CROP MOVES BETWEEN SCREENS, and that is what the aiming control is about.** The same
photograph is a 6.33:1 band on a wide monitor's banner, 2.5:1 on a laptop's list card and 1.78:1
on a phone's. So the frame you drag is the TIGHTEST of them, 1520x240, not the roomiest: what
you place inside it survives everywhere. Aim in the roomy one and a phone-shaped choice quietly
falls out of the banner a laptop draws, which nobody would ever see happen. Measured live: the
frame comes out 478x75 in the dialog on a laptop and 324x51 on a phone, an arrow key moves the
aim two points and a 30px drag moved it seven.

**The upload branch is assembly, and it was checked end to end rather than assumed.** Presign →
finalize with the proxied fallback, through a new `uploadOneImage` in `upload-client.ts`; the
composer keeps its own copy, because it uploads a batch, keeps the facts for its crop handle and
reports "3 of 5", and none of that collapses into a helper without making the helper worse. Both
halves were driven in a real browser: a pool pick plus an aim wrote `center 81%`, and an upload
came back as a real `images.rishivalley.space/uploads/...` url and saved. `upload-size-rule.test.mjs`
gained the dialog and a pin that the helper actually shrinks, which is what stops the delegation
being the whole answer.

**What `pictureSrc` will accept, and this is the half that matters.** It goes into a column every
member of the Catch-up then loads in their browser, so an arbitrary url would be somebody else's
server being told who read what, from a settings row. Exactly two things pass: a pool path, or an
image this app minted under the CALLER's own `uploads/<their id>/` prefix, through the same
`ownedUploadUrls` rule a post's images go through. `pictureFocus` is interpolated into a style
attribute, so it is matched against a pattern rather than trusted for having come from our own
dialog.

**And the consequence nobody had to ask for.** A member who uploads a picture and then deletes
their account used to be two bugs at once: their bytes would survive the purge, because nothing
collected them, and the Catch-up would be left pointing at an object about to vanish. The purge
now collects the url and puts the row back on its pool pick — it cannot write a null the way
`User.coverPhoto` does, because the column is NOT NULL by design.

`npm run check` green, 108/108. `npm run visual` 25/25.

**One thing left behind on purpose.** `[Recon] the happy path` is carrying the uploaded
photograph from the end-to-end test rather than its backfilled pool pick. Deleting the R2 object
was refused by the sandbox, and a row pointing at it is better than an orphan nothing can
enumerate; it is a throwaway Catch-up that phase 11 removes anyway, and it should take the object
with it.


## 2026-09-08 — build phase 4: the batch Catch-up, and a sidebar row that has to earn itself

Phase 4 of eleven, `docs/planning/catchups-rework/spec.md` §3.5 and §3.5b. His, from the paragraph
the whole feature comes from: *"anyone in that batch is automatically added to that catch-up, can
see the history of rounds ... This batch catch-up should exist by default"*, and *"the batch catch
up can't edit people in and out it's just people in that batch."*

**Nothing was modelled.** A batch was already a `Group` with `batchYear` set and a Catch-up was
already one row per `Group`, so the whole phase is rows, guards and one predicate: no schema
change and no `prisma generate`. That is worth saying because the obvious reading of "a batch
Catch-up" is a new kind of thing, and it is not one.

**Two Catch-ups now exist that never did**, not eleven. Ten is his floor, 2026-09-08: *"for people
whose batches have less than ten people, let's not even show the catch ups things in the sidebar.
it won't be reachble to them. once there's ten it appears and the catch up would be created for
that batch."* Measured against the live database: eleven batch groups, of which 2023 holds 39
members and 2024 holds 11. Nine of the other batches hold four or fewer and six hold exactly one,
so under any smaller floor most batch Catch-ups would have been a newsletter to yourself, with
reminders.

**The 2024 one was adopted rather than duplicated, and the assertion is the point of the file.**
A 2024 alumnus had made a "Batch of 2024" Catch-up through `/catchups/new` back in August, which
always mints a NEW group — so it sat on an 11-person snapshot with no `batchYear` while the real
batch group had no Catch-up at all. One migration, in this order: heal the memberships, ASSERT that
every snapshot member is in the real group, then re-point `Catchup.groupId`. Re-pointing a Catch-up
at a different group changes who can read it, so if that subset ever failed to hold the whole file
would abort rather than quietly take somebody's access away. It kept its published Edition, its 8
answers and its 8 questions exactly where they were, and it handed two 2024 alumni an Edition they
were never in — which is the brief's *"access to previous issues if they join later"* arriving for
the first people it was ever true of. Rehearsed on both projects inside a transaction that rolled
back before anything was applied for real.

**The membership heal fixed a failure the code had predicted about itself.** `registerUser` calls
`joinBatchGroup` in a best-effort block, and the comment beside it said, in as many words, that
nothing anywhere re-checks *"an alumnus with a batchYear and no batch-group row"*. One member was
in that state: Rukmini Rau, batch 2024, absent from her own batch group since signup. She is in it
now, and the tick has a nightly pass so the next one lasts a day rather than for ever.

**A batch Catch-up carries two NULLs on purpose.** `createdById`, because nobody keeps one, and
`inviteToken`, because there is nobody to invite — the membership IS the batch. The second is what
closes the invite-link door on it and why the roster shows no link.

**The refusals are rules rather than accidents, and that distinction is the work.** Nobody could
have passed the Keeper check on a batch group anyway: `createdById` is null and every role in one
is `"member"`. But that is a property of today's data, not a guarantee, and one mis-aimed
`setCatchupKeeper` would end it. So both Keeper preambles refuse a batch BEFORE they ask who the
Keeper is, which covers all thirteen controls that come through them in one place, and the two
exits refuse it by name. Leaving would have been undone by the nightly heal putting the person
straight back, so refusing is the honest answer rather than the strict one. Neither screen offers
what the server refuses: no Leave row in the roster, no Delete in the card menu, and the settings
dialog comes out as the Picture row alone — which is the previous phase's `canChangePicture`
/`isKeeper` split working exactly as it was built to, with nothing touched.

**The sidebar row now has to earn itself, and the test is not the obvious one.** His reason for
hiding it is *"it won't be reachble to them"* — hide the door when there is nothing behind it. The
obvious implementation is "is your batch big", and it would have been wrong: a member of a small
batch can still be invited to a Catch-up somebody else started, and two live accounts prove it is
not hypothetical, including the public demo's visitor. So the predicate is **"can you open at
least one Catch-up"**, one `findFirst` in the authenticated layout, inside the `Promise.all` that
was already waiting on the notification count. 0.117ms execution and 2.1ms planning on the live
database; skipped entirely for teachers, who were already out. Measured across all seventy
members: **51 now see Catch-ups, 15 lose the row, 4 teachers were already hidden.** Before this,
only the members of a hand-made Catch-up had anything there at all.

And it defaults to showing. A missing prop that hides a whole feature is a worse failure than one
that shows an empty state, and hiding a door was never the access control — the membership check
is, and it is unchanged.

**One correction, and it is worth recording because of how it travelled.** This session first
wrote that `CRON_SECRET` was unset and that the nightly tick therefore 401'd, and reasoned around
a dead cron for an afternoon. It is set, in `.env`, on Vercel and in GitHub, and
`/api/catchups/tick` answers 200 to a correctly signed request with both self-heal passes coming
back a clean no-op. The claim came from a one-line memory index that had gone stale and
contradicted its own file, and from `docs/planning/bugs.md`, which had listed it as owed for
about three weeks after it stopped being true. Both are corrected, and so is
`docs/spec/catchups.md`, which still called that route "a future endpoint, not required for MVP"
long after it shipped.

`npm run check` 109/109. `npm run visual` 25/25 with no baseline moved, which is the correct
result: nothing was redrawn.

## 2026-09-08 — build phase 5: leaving, and the read mark

Deleting your copy of a Catch-up is gone, and what replaced it is one word of his (N18):
*"defaults, except deleting becomes leaving."* So there is one exit now, it happens in the
moment you confirm it, and what you already published stays where other people have read it.

**The bin was leaving with a fuse on it, and that is the whole argument.** `setCatchupDeleted`
stamped `CatchupPref.deletedAt`, which stopped every broadcast reaching you at once and armed a
nightly sweep to take your `GroupMember` row on the thirtieth night. Between those two moments you
were still in the group, out of every notification, with a countdown on a row you had to go
looking for. Four things went with it: the sweep in `retention.ts` (a Serializable transaction, a
200-a-night batch and a Keeper succession hand-off), the subtraction in `groupMemberIds` that kept
the audience and the membership honest for a month, the "Recently deleted" shelf and its
countdown, and `restoreOwnCatchupCopy`.

**Counted first, on both projects: 16 preference rows on production and none on the demo, of which
zero are archived and zero are binned.** So the migration's `UPDATE ... SET archivedAt =
COALESCE(archivedAt, deletedAt)` moved nothing. It exists so it cannot become a no-op later: a
member who bins a copy in the hours before this deploys lands in Archived rather than in a bin
nothing empties any more. The column itself is NOT dropped — that is phase 11, after this deploys
— but its index went tonight, because an index drop has no ordering and the sweep that was its
only reader is deleted in the same commit.

**Two audit findings close by deletion rather than by fix, and both are pinned as absences.**
C-020 was a rejoin hole: following your own invite link redirected an existing member past the
join action, so the bin stayed armed and the sweep removed somebody who had just walked back in.
There is no bin to arm. C-023's third path — the sweep that removed a membership and therefore had
to promote a successor first — is gone, and `group-succession.test.mjs` now asserts retention
removes no memberships at all. A test that reads nothing is worse than no test, so each one fails
if the thing it describes comes back.

**The refusal must not be deleted with the action that shared it.** Phase 4 put
`BATCH_LEAVE_REFUSAL` on both exits; deleting one of them is exactly how a guard quietly goes
missing. `leaveCatchup` is now the only exit and the only place that refusal can live, and
`batch-catchups.test.mjs` says so from the other side too: it fails if `setCatchupDeleted` comes
back without one, and it fails if `setCatchupArchived` ever starts refusing a batch — because on a
batch Catch-up archiving is the only way out there is.

**On the list, Delete became Leave**, with the confirmation rewritten to say what actually
happens: you come out now, your published answers stay, nobody else's list changes, coming back
needs a fresh invitation. Driven in a real browser at 1440 and at 390: the menu reads Archive then
Leave, the dialog carries that copy, zero console errors. The batch card offers Archive alone,
which is the server's answer shown rather than a way to be told no.

**The read mark is a table of its own, and the reasoning is worth keeping.** `ContentView` already
writes a `(viewerId, "edition", targetId)` row from the same page, so the obvious move was to read
it back. Three things stopped it: it is the admin analytics counter and is under standing pressure
to stay bounded (its own comments record an index dropped and its columns argued over), its
`targetId` is deliberately not a foreign key, and it is written BEFORE the reader knows the
Edition's status — so a deep link followed while an Edition was still collecting would have made
it look read on the day it came out. A member-facing unread mark should not be one retention
decision away from flipping. `CatchupEditionRead` is one row per person per Edition, both sides
Cascade, `update: {}` so a re-read keeps the first time you saw it.

Proved live rather than asserted: opening a published Edition as Jerry wrote exactly one row;
opening it again left `readAt` at 05:29:42.228; opening a collecting Edition wrote nothing. Nothing
draws it yet — the list that shows an unread Edition differently is phase 6 — which is the point of
writing it now: the marks accumulate from tonight, so that list has something to draw.

One tooling note, because it cost a restore: `npx prisma format` re-aligned all 501 lines of
`schema.prisma` and moved several comment blocks relative to the attributes they explain. The
edits went back in by hand. Do not run it on this schema.

`npm run check` 110/110. `npm run visual` 25/25 with no baseline moved, which is correct: the only
visible change lives inside a dropdown, and the shelf that went was empty for every member.

## 2026-09-08 — the lockup was never too big, it was too heavy

The owner, on the sidebar: *"the eye is too drawn to the logo ... it now seems bigger and more
imposing."* It was not bigger. Flattening the mark to one cream silhouette a few days earlier
(`bed93ca1`) had raised its ink by **64%** at an unchanged 24px — measured by summing luminance
departure from the rail green over the mark's box, three-plane 61% against flat 100%. So the
complaint was real and the obvious fix was the wrong one.

The ratio that governs both lockups turned out to be **cap height over the mark's INK height**.
Under ~0.65 the mark reads as the subject and the type as its caption; over ~0.85 the mark shrinks
to punctuation. The sidebar sat at 0.66. The profile sheet's colophon sat at **0.56** — the same
fault, further along, and the thing the owner had been circling for weeks without a name: *"there's
something that doesn't feel right about the number ... I can't point my finger at the problem."*

**Sidebar**: mark 24 → 19 (ratio 0.83), gap 10 → 14px, `tracking-tight` → `tracking-wide`. Shrinking
alone would have pulled the lockup 13px narrower and the rail's 248px is justified by the lockup
reaching across it, so the width comes back out of the two spacing values instead: 191.2px against
the old 192.3px. He asked whether the margins either side of the ink were equal. They were not —
`translateX(3px)`, an optical nudge eyeballed against the old mark and never re-derived, was pushing
the lockup 7.3px right of true. Now `-0.7px`, which equalises the ink at 28.1px a side.

**Profile colophon**: numerals 13 → 16px (ratio 0.69), gap 6 → 9px, tracking 0.16 → 0.14em. The old
comment said 0.16em kept ONE caps tracking value on the sheet; right goal, wrong measure, because
`em` scales with size — the sheet's other caps labels are 11 and 12px and carry 1.76 and 1.92px of
space, while 0.16em at 16px is 2.56px. The arithmetic pointed at 0.12em (1.92px, identical to ABOUT
and HOUSES); he looked at both and took 0.14em. Recorded in the comment rather than quietly
corrected, along with the three variants he named as the ones to reach for next time.

**What did not move, and that is the finding.** Vertical alignment. A six-way sweep confirmed the
existing rule — cap band on the mark's *geometric* centre — beats both alternatives. Not the centre
of mass, which sits 66.6% down because a hill is bottom-heavy; aligning there, or bottom-aligning
the baseline to the hill's base, makes the peaks loom over the word. That is the arrangement he
rejected on this same colophon on 2026-08-03. Both nudges stay where they were.

One tooling note. The first specimen sheets used Google Fonts webfonts and were **wrong** — Libre
Baskerville measured an ink ascent of 12.44px against the app's 14.94px, enough to invalidate every
1px judgement. Specimens after that were rendered inside the running app, where next/font is already
loaded, and reproduced the app's geometry exactly. Do not measure this app's type anywhere else.

`npm run check` clean, 112/112. Verified at 1440x900 and 390x844, light and dark.

## 2026-09-09 — the Collection was fetching itself, and nobody had to touch it

The owner, on the archive he cannot ship: "I scroll and then it constantly readjusts and brings me
back down ... I've reached the top of the page and it's stuck at the top and then loads all the
photos in these steps and then goes to higher and higher years ... totally unacceptable." Three
sessions had tried to fix this by feel. This one measured it first.

**Finding 1: an infinite loop, and it needed no input at all.** Landing on the class archive at 2020
and then touching nothing for ten seconds: **27 pages fetched, 932 photographs mounted, the document
grown 17,869px → 65,883px**, and the rail walking 2020 → 2021 → 2022 → 2023 → 2026 while the reader
sat still. Two separately-correct fixes cancelling out. `wantsNewer` answered yes for as long as
`scrollY <= 0`, which at the top of a seek is for ever; and the scroll correction meant to push the
reader off zero declined to move anybody above the seam (`if (top < seam) return`), so the condition
could never stop being true. That early return also skipped `syncScrollWatch()`, leaving `movingUp`
armed from the flick that started the pull — the tight half of the same loop.

Fixed with two independent brakes, because this has come back three times. The zero rule is now
latched to one pull per river, and the prepend it asks for is exempted from the seam guard so it
actually lands the reader off zero. Either alone ends the loop; verified by removing each in turn.
A reader at the top emits no `scroll` event, so `wheel` and `touchmove` re-arm the latch — the
gesture is real even when the page cannot move, which is what un-strands a seek without reopening
the loop. Idle after the fix: **0 fetches, height stable.**

**Finding 2: every arriving page re-rendered all 1,718 photographs.** Nothing was memoised, and the
cost grew straight in line with the river (4x CPU throttle): 48 tiles → 120ms, 240 → 263ms, 480 →
303ms, 768 → 384ms, extrapolating to ~800ms of frozen main thread per page at full size. **41% of a
fast scroll was spent blocked**, which is what swallows the wheel and makes the page lurch. Memoised
the band and the tile; the growth is now flat rather than linear (768 tiles: 384 → 106ms, blocking
41% → 26%). The band comparator leans on a fact about this river — photographs only ever arrive at
one END — and says so, because an edit that inserts into the middle breaks it.

**Finding 3: the popping.** Up to 14 of 16 viewport tiles were blank mid-flick. `warmThumbs` already
existed for view swaps; the foot and head pages now warm through it as they arrive, in the screen and
a half of travel the sentinel buys. Worst-case blanking 14 → 5.

**What was NOT happening**, and it is worth recording because it is what everyone assumed: nothing
ever resets the scroll. A timeline of every scroll and wheel event through a fast flick shows **zero
backwards jumps**. "It brings me back down" was the runaway prepending content above the reader, plus
input latency from the blocking above — not a bad correction.

**The look**, from the same conversation. Corner rounding is gone from Collection tiles ("I don't
think they do corner rounding. I don't think we should either"), the gap is 4px rather than 12 to
match the reference galleries, and the hover magnification moved from 300ms `ease-out` to 450ms
`ease-in-out` — it was snapping to size and then coasting.

Pinned by `a river nobody is touching does not fetch itself` in `e2e/collection-seek.spec.ts`, the one
test there driven against the real archive rather than /lab/collection, because the bug lives in
<CollectionClient>'s paging and the lab room has none. Confirmed to fail on the original code and
pass on the fix.

Phase 2 — computing each band's exact height from the aspect ratios already in the database, so the
document is full-height from the start and nothing ever shifts — is designed but not built. Google's
own writeup is the reference: layout on load and resize, never on scroll.

**Correction, same day: the hover zoom was never animating.** He came back with "the zoom is much
more janky and breaky than before", and he was right. Tailwind v4 compiles `scale-[1.03]` to the
standalone CSS `scale` property, not to `transform` — so `transition-[opacity,transform]` named a
property the tile never sets, and the magnification arrived in ONE FRAME. Sampled every frame
through a hover: computed `scale` goes `none` -> `1.03` between two consecutive frames while
computed `transform` reads `none` for the whole 700ms. Retuning the duration and the curve, which is
what this session did first and what an earlier one had done before it, could never have worked.
Now `transition-[opacity,scale]` at 300ms ease-out: 20 distinct scale values across the transition,
16-17ms frames. The scrim was also finishing 250ms before the picture, so it moved to 300ms too and
the two land together. Written up in TRAPS.md, because roughly seventy other call sites — the shared
`Button` among them — pair a transform transition with an `active:scale-*` and are very likely the
same defect. Not audited yet; his call.

**And the white flash on the way up was a guard reading the wrong thing.** He kept reporting it and
it kept surviving: seek to a year, flick up fast, and for a frame the photographs vanish or half the
screen shows nothing beside half a screen of pictures. Instrumented every height change against
every scroll change through one fast flick: `docHeight +1617px, scrollY +0` — twice. The anchor was
declining to correct because `top < seam`, which reasons about the reader's position in the
DOCUMENT. The seam sits just under the page header, so a reader at the top of a seek is "above" it
while looking straight at the photographs beneath — and a page landing there was inserted into the
middle of their view, uncorrected. The condition is now the VIEWPORT against the seam
(`top + clientHeight <= seam`), so anybody with the river in shot gets the correction and only a
reader with the river entirely below the fold is left alone. Uncompensated insertions per flick:
2 → 0. `fromZero` went with it, redundant once the rule reasons about what is on screen.

**Which is where the patching stops.** With the correction now arithmetically perfect, every one of
those insertions is a 1,617px instantaneous teleport: he was travelling UP, hit the ceiling because
the content above does not exist yet, and got yanked DOWN by the correction. Anchor it and you get a
teleport; do not and you get the white flash; fetch earlier and you get the runaway. There is no
correct setting of these dials, because the document does not know its own height. Three sessions
have now failed here by tuning them. Escalated to the architecture rather than attempted a fourth
time, per systematic-debugging's rule, and he approved the rebuild: solve the justified rows from
the aspect ratios already in the database, reserve exact space for what has not loaded, and delete
the correction system entirely. Exact heights also make `content-visibility` safe again, which
windows the river — and that is the answer to the last symptom he reported, individual tiles
flashing white on the way up, which is Chrome evicting decoded bitmaps when 900+ images are live.

**Two shortcuts tried and REVERTED, recorded so nobody spends a day on them again.** Both aimed at
the last symptom -- flick upward fast from a seek and you meet the page title, then get pushed back
down -- and both were built, measured against the real archive at 4x throttle, and thrown away.

1. *Reserve the true height of everything above, as one block.* From `bands`, which already carries
   a count for every year, at the river's own measured height-per-photograph. It works on its own
   terms: landing is correct (the 2017 heading lands 105px down), zero jumps, and the reader never
   meets the title. It is still useless. Pages fill in at the BOTTOM of that block, beside the
   river, so climbing thirty thousand pixels leaves you in blank paper: **0 photographs in the
   viewport** after 20 flicks. One opaque spacer cannot say WHICH photographs belong at the position
   you scrolled to, so nothing can know what to load.

2. *Cap that reservation at a 2.5-screen runway and refill it on every arrival* -- always taller
   than one flick, always inside the head sentinel's 3000px reach, so climbing into it is always
   already fetching. A treadmill. The reader outruns it: a 1400px flick every 110ms spends about
   12,700px/sec and one page is ~3,800px per round trip. **20 of 25 flicks landed on empty paper**,
   with 6 ceiling hits and 6 jumps -- worse than doing nothing.

The lesson both teach is the same and it is worth stating plainly: **without per-year positioning
you can either show blank paper or teleport the reader, and there is no third option.** Reserving
space you cannot fill in time is blank paper; not reserving it is the teleport. Three sessions have
now been spent tuning the dials between those two, and the dials do not have a good setting.

So the next session builds the real thing, and should not try a fourth variation on the anchor. The
river's state stops being one contiguous array and becomes a map of band -> (loaded photographs OR a
reserved height), every year drawn at its own computed height whether or not its photographs are
there. The loader then fetches BY POSITION rather than by walking pages: at document position Y the
band boxes say that is 1994, so it asks for 1994, which the server already does -- `?when=` seek is
exactly that query. Aspect ratios for the arithmetic are already in the database, and `drawnRows` in
photo-layout.ts already solves row breaks and heights and mirrors flexbox. Exact heights also make
`content-visibility` safe again, which windows the river and answers the last unexplained symptom:
individual tiles flashing white on the way up, which is Chrome evicting decoded bitmaps once 900+
images are live in the DOM.

`npm run check` clean, 112/112. `npm run visual` 25/25. Verified at 1440x900 and 390x844.

## 2026-09-09 (later) — the Collection stops guessing its own height

The rebuild the two reverted shortcuts pointed at, and it closes every scrolling symptom the archive
has had for three sessions. The owner, on the last one: "every single time the scrolling indicator
readjusts ... I get a glitch regardless of speed." He was exactly right, and that was the diagnosis:
the glitch WAS the correction. So the correction is gone rather than tuned.

**The one fact that changes everything.** Justified row-breaking is arithmetic on aspect ratios and a
column width, and every photograph's dimensions are already in the database. So the geometry of the
whole archive is knowable before a single thumbnail loads. `PhotoShapeIndex` — `[ratio, bandKey]` per
photograph, in river order — now rides back with the first page. Measured on the class archive:
**1,718 photographs, 20.6 KB of JSON, 1.3 KB gzipped**, which is less than one 480px thumbnail. We
had been paying for that information in scroll bugs instead of in 1.3 KB.

**`src/lib/river-geometry.ts`** turns it into per-year boxes. The hard part was making a reserved box
EXACTLY the height of the photographs that will fill it — a few pixels a year is a document that
drifts, and the glitch comes straight back. Three attempts, each measured against the browser:
treating the trailing row as justified was **210px** out on a 208-photograph year; treating it as the
target height was **29px** out on a one-photograph year, because <PhotoStream>'s ghost cell does not
swallow all the slack — flex shares free space in proportion to grow factors and the photographs have
their own. Modelling that share lands it at **0.5px worst case across six bands and both viewports**,
including a 319-photograph year on a phone (19,805 drawn against 19,804.5 computed).

**What the river does now.** Every year is on the page from the first frame, drawn if its photographs
are held and reserved at its exact height if not. `loadBand` fetches ONE YEAR, and the river asks for
the year the reader is actually looking at rather than walking pages from wherever it happened to
stop. A year is all-or-nothing: pages are cut by size and end mid-year, and a year drawn from half
its photographs is shorter than its box — which is how pressing 2017 came to land 5,513px short until
the "complete or reserved" rule went in. Pressing a year on the rail is now a scroll to a known
offset with no query at all.

Measured on the class archive at 4x CPU throttle, document 105,772px on arrival:

| | 25 hard flicks UP | 20 hard flicks DOWN |
|---|---|---|
| document height changes | 0 | 0 |
| scroll corrections | 0 | 0 |
| frames at the page title | 0 | — |
| flicks landing on empty paper | 0 of 25 | 0 of 20 |

`scrollAnchor`, `landAt`'s corrections and the zero-pull latch are all dead weight in the geometry
path and stand down there; the cursor walk still serves /lab/collection and the orders that are not
years. One visual-suite fix rode along, and it is the same story in miniature: `settle()` called
`decode()` on every image on the page, and a river that draws its whole archive holds hundreds of
lazy images thousands of pixels away that never load — `decode()` on those never settles, so the
shot hung to the 90-second timeout. Bounded to what can appear in the frame; the suite went from
4.2 minutes to 1.1.

One pre-existing failure is NOT fixed and is not mine: `every year the rail offers lands on that
year, lit` (collection-journeys) fails against the live archive. Verified by A/B — with the geometry
switched off it fails EARLIER, at the first year instead of the fifth.

`npm run check` clean, 113/113. `npm run visual` 25/25. Verified at 1440x900 and 390x844.

**2026-09-10, the fine-tuning pass on top of it.** Four things, all of them his.

**Pressing a year went to 2026.** My own regression from the day before: the instant seek set
`seekBand`, which changes `fetchPage`, which fires the query effect and rebuilds the river from its
head. So a press paused for a round trip and then landed on the newest year, every time. With
geometry a seek touches NO query state at all -- it is a scroll to an offset already on the page.
`landAt` rather than `scrollTo`, because the oldest year ends the document and the scroll position
that would put its heading at the top does not exist until the tail grows: pressing 2015 came to
rest 569px down while every other year landed exactly. All ten years now land at 24px on desktop and
66px on a phone (clear of its 56px bar), with the rail lighting the right one -- which needed
`useActiveBand` to read the BOX keys rather than the loaded ones, or landing on a year still
reserved lit its nearest loaded neighbour.

**The rail folded to decades at random.** `useColumnHeight` measured
`getBoundingClientRect().top + window.scrollY` -- a document coordinate -- and then subtracted it
from `window.innerHeight`, which is a window measurement. At the top of the page the two agree, so it
looked right; 20,000px down it computed a negative height, clamped to zero, and the rail decided it
had no room. That is why it "happens very occasionally and a reload fixes it" (owner): a reload puts
you back where the coordinate spaces agree. A/B'd to be sure -- with the old line, scrolled to
45,000px: two decades. With the fix: ten years, at every depth.

**The rail's type was too small,** and he was right. 11px of muted tabular numerals is under the
floor for something meant to be read and clicked, and this is the one control that indexes the whole
archive. 12.5px now, one clean step below the bucket row's 14px instead of two. Every other number
in that file moved by the same 1.136 rather than being re-chosen, so the rail keeps the density it
was tuned to: pitch 23.5 -> 26.7, row 22.5 -> 25.6, squeeze floor 17 -> 19.3, Undated gap 10 -> 11.4,
dock falloff 64 -> 72.7 (still 2.7 rows either side), label box 34 -> 39px.

**And the photographs stopped switching on all at once.** Two causes, one of them mine. A page is cut
by SIZE, so it ended mid-year; the river only draws a year it holds completely, so that trailing year
was discarded and immediately re-fetched -- two round trips before the first screen could draw, which
is the pause on every scope and bucket change. The page now rounds up to the next year boundary in
the same query. Measured: one round trip, photographs on screen in 157-392ms at 4x throttle.

The second cause predates all of this. `warmThumbs` decodes a page before it mounts, so its tiles
arrived `complete`, the ref callback marked them visible in the frame they were created, and the
300ms fade had nothing to animate from -- a whole screenful appearing between two frames. A
first-time thumbnail now gets its flag one frame later so the fade actually runs, with a 22ms stagger
capped at ten tiles so it reads as a wave rather than a switch. Sampled per frame on a cold load:
**25 frames mid-fade against 0 before, and up to 7 distinct opacities in a single frame against 1.**

`npm run check` clean, 115/115. `npm run visual` 25/25. The collection suite is 21 passed with one
PRE-EXISTING failure (`every year the rail offers lands on that year, lit`), which A/B confirms is
not this work: with the geometry switched off it fails earlier, at the first year instead of the
fifth, and its slowness is what knocks the lab seek test over in a long run.

## 2026-09-12 (later still) — a notification you have read stays read

Owner: *"though I mark a notification as read it constantly marks it as unread every time I change a
page. we can't let notifications become annoying and have alarm fatigue."* Reproduced at 390x844
before touching anything: mark all read on /feed, tap through to /directory, and the badge says
"3 unread notifications" again while `SELECT count(*) ... read=false` for that member returns 0.
Every page change after that put it back.

**There are two bells and they take turns.** /feed renders its own in the page header; every other
route gets the one in the mobile top band, which lives in the (main) layout. Each held the badge
number in its own `useState(initialUnreadCount)`, and that is the whole bug in two halves. The
band's prop comes from the layout, and Next does not re-render a shared layout on a soft navigation
(`staleTimes.md`: "shared layouts won't automatically be refetched on every navigation, only the
page segment that changes"), so it is frozen at whatever the last FULL page load counted — for the
rest of the session. Leaving /feed then mounts that bell fresh, and a fresh mount re-seeds the badge
from the frozen number. Nothing was un-reading anything; the writes were always correct, and the
database proved it at every step. A stale prop was simply overwriting the truth once per navigation.

Desktop never showed it, which is why it survived: off /feed there is no bell at that width, so the
only way in was the browser Back button.

**The fix is one shared count per document** (`src/components/layout/unread-store.ts`), read through
`useSyncExternalStore`, so a remount adopts what the member's own clicks produced instead of
resurrecting a prop. Module state, so a real page load still starts empty and the server's freshly
computed number seeds it. Not React context: the two bells sit in different trees and a provider
high enough to hold both would re-render the app shell on every count change.

What a mounting bell does with the prop is the part worth pinning, so it is a pure function with a
test: seed when nothing has set a count yet, ignore a prop that agrees or that this document has
already been handed, and ask the server — one indexed count — for a number never seen before, which
is the only case where frozen and genuinely-new are indistinguishable. Remembering every count seen,
not just the last, is what keeps the ordinary feed/directory back-and-forth at zero round trips.
The residual: read three, have exactly three arrive, and a page rendering "3" reads as the frozen
"3", so the badge under-reports until the next focus or panel open. That is the quiet direction of
the error, and the loud one is what made the badge worth ignoring.

Measured after, same route, same account: 3 -> mark all read -> 0, and 0 across a soft navigation,
a return to /feed and the Back button. Clicking a single notification: 3 -> 2, still 2 two pages
later, database 2. A notification inserted mid-session while browsing still lights the badge on the
next feed render, so nothing went quiet. `npm run check` clean, 119/119 (7 new).

## 2026-09-12 (later still) — four ways to say "hold this", for the phone's scrubber

"People don't really intuit that you can drag on the normal looking one and it's hard to contact it
at times. Google photos is a very obvious easy to use one. Something like that probably but more
pretty. Or if you have a different way also that works. Work in lab" (owner, 2026-09-12).

**The shipped scrubber is disguised as something you cannot drag, and the disguise is deliberate.**
`photo-scrubber.tsx` describes its own resting form as "an iOS scroll indicator, near enough, three
pixels wide and no lettering at all". That is what it was aiming at and it hit it. iOS scroll
indicators are not draggable and everyone knows it, so the thing reads as decoration reporting a
position rather than a control.

Three more causes, and together they are the "at times":

- It leaves 1.4 seconds after the river stops. Scroll, see it, stop scrolling to aim, watch it fade
  while you are aiming.
- The target is 44 wide and 28 tall. Apple's number is 44 both ways, and on a vertical control the
  vertical axis is the one you have to land on.
- It sits flush at `right: 0` — curved glass, the back-swipe zone, and a right thumb hooking over
  the edge of the phone to reach it.

**A fifth cause was claimed and then disproved, which changed the work.** The first reading of a
mobile screenshot said the river was full-bleed, so the hairline was being drawn over photographs
and vanishing against bright sky. Measured on the real `/collection` at 390: the photographs run
20 to 370. There is a 20px margin of page down each side and the hairline sits in it, on paper,
perfectly legible. Every face had been given its own sheet of paper to sit on; three of those
sheets were cream laid over cream and did nothing, and came out.

What the measurement leaves behind is a better rule than either claim: **the gutter is 20px and it
decides which faces need ground.** Grip (18px) and Bead (13px) fit inside it and carry nothing.
The year chip is 50px, so 38 of them are over a photograph and it has to be opaque — accent, which
is also its right rung on the ladder for a small thing floating over the page. The ruler's longest
ticks reach about 10px past the edge of a photograph exactly as they become the one you are meant
to read, so it keeps a paper gradient under them. Confirmed by finding a scroll position where the
chip's own centre has an `IMG` in its hit stack, and photographing it there.

**The room is `/lab/collection/scrub`.** Four faces on the real 240-photograph river, swapped from a
bench in the bottom left, with the held state byte-identical across all four — the paper coming up,
the scale up the edge, the year at forty pixels is the part he already approved and it is not what
is being asked about. Only the resting face changes, so the only question the room asks is which one
you reach for.

- **Grip** — two lines instead of one, the mark every drag handle uses.
- **Signpost** — the year is the handle. A number that moves as you scroll is obviously about
  position, and in Newest or Most loved, where no year would be honest, it shows the gesture instead.
- **Bead** — a bead on a thread, the most literal slider there is, and the only face that leaves a
  line down the edge at rest.
- **Ruler** — the scale faintly present all the time, grabbable anywhere. It is the only face that
  takes something away: the right 32px stop scrolling the river, and its caption says so.

All four get the fixes that are not in question: a 56px seat, the art held 8px in from the edge with
the hit box still reaching it, and a stay that does not expire while you are aiming. Two switches
settle by feel what would otherwise have been guessed at — whether it stays put at rest, and whether
a tap opens the scale for somebody who will never drag anything.

Nothing shipped changed. `photo-scrubber.tsx` is untouched until a face is picked, and the kit is
lab-local so the pick is a transplant rather than an unpick.

Measured after: hit boxes 72x56 reaching the true edge, against the shipped 44x28. Art at 13, 18 and
50px wide, all ending 8px in. Tap-to-open raises the scale and tapping away clears it. `npm run
check` clean, 119/119; `npm run visual` 25/25.

## 2026-09-13 — the year is the handle

"Ship signpost. stays put on. tap open off" (owner, 2026-09-13), picking from the four faces drawn
at /lab/collection/scrub the night before.

**What it replaces described itself accurately and that was the problem.** The old resting form was
"an iOS scroll indicator, near enough, three pixels wide and no lettering at all", in its own
docblock. It was exactly that, and an iOS scroll indicator is a thing everybody knows you cannot
drag, so the disguise worked and the control vanished into it. A number is not chrome: it moves as
you scroll, so it is visibly about position, and it is text, so it reads as something to touch. It
also answers a question the hairline could not, which is what year am I in without holding anything.

**The shipped component came out simpler than the lab version, because both switches resolved to
deletions.** "Stays put" removed the 1400ms linger, the hide timer and the `shown` state; "tap open
off" removed the pin state, the tap threshold and the press-vs-drag bookkeeping. Two states now,
and the first one is no longer nothing.

**Staying put is what broke the top of the page, and it is the one thing the lab could not have
caught.** A control that only appeared mid-scroll never had to share the top-right corner with
anything. Resting at the top of a 96px track it landed 7px inside the Contribute button and read as
a second round button stacked under the first. The track starts at 124 now: the chip's top is 138
against Contribute's bottom of 117, twenty-one clear, for 28px of a 652px travel. And the caret form
shown in Newest was 31px, very nearly a circle, which is what made it mimic a button at all -- it is
held to 46px now, so the control is one silhouette whose contents change with the order rather than
two different shapes.

**Two things that were true stopped being true, and both are written down rather than quietly
dropped.** `e2e/collection-seek.spec.ts` pinned "nothing at rest", raised by a scroll, gone 1.4s
later -- the exact behaviour just reversed. It now pins the opposite, including a six-second wait
that fails on a regression to any timer at all. And the visual suite masked the scrubber because it
was "a TIMER, not a state"; that reason expired, so the mask note says what the reason is now
(presence races image decoding, since the chip only exists once the river overflows the window).

**A cold load needed a ResizeObserver.** Presence depends on there being something to scroll, and
the river lazy-loads: at mount the page is one screen tall, so a scroll listener alone would keep
the chip away until the reader scrolled, which they cannot do until the photographs arrive and give
the page its height. That is the whole control failing to appear, on exactly the load where it is
most wanted.

Measured after, on the real /collection at 390: hit box 72x56 reaching the true edge, against 44x28;
chip 46x28 in Newest and 48x28 in Chronological, both ending 8px in; drag names a band and seeks to
it; a tap pins nothing. Absent at 1440, where the rail is. `npm run check` clean, 119/119;
`npm run visual` 25/25 after rebaselining the two mobile Collection shots, whose only real change is
the mask rectangle around a control that changed size and place.

**Unrelated, found while running the full suite and left alone:**
`collection-journeys.spec.ts` "every year the rail offers lands on that year, lit" fails on desktop.
It swaps to whichever half is deeper, then reads the rail before it has caught up with the new
scope, so it collects the valley's years (which include 2014) and clicks them against the class rail
(2015-2026, no 2014). Live-data dependent, desktop-only, and nothing to do with the scrubber, which
is `display: none` at that width and skipped on mobile. Its own commit.

## 2026-09-13 (later) — the admission number on a profile drops from 16px to 15px

"can you make that 16 px into 15px. keep all else same" (owner, 2026-09-13), after asking the size
of the admission number and the batch number on a profile.

Both copies of the number in `letterhead-profile.tsx` moved together, the one you read and the one
you type into with the pen out, so the lockup does not change size when editing starts. Everything
else is untouched: the 16px mark, the row height, the 9px gap, the 1px nudge, and the Batch fact
(11px label, 15px year). The editable lockup's comment had said "13px caps" since an earlier resize;
it says 15px now. Checked on the owner's own profile at 1440 and 390: the digits still sit level
with the peaks, no console errors. `npm run check` clean, 119/119. Profile is not in the visual suite.


## 2026-09-13 (latest) — the bird in the button

"I'm thinking of ditching the shrunk composer above the posts since it serves the same function as
new post. but I kinda like showing ones own bird on the feed. and i'd like the new post cta to be
there because it's more space efficient ... and I want the posts to start right at the top instead
of this dead space. also will have to work out beautiful animation for the composer appearing now
that it's not exactly appearing from anything" (owner, 2026-09-13).

A lab room at `/lab/new-post`, nothing shipped to `/feed` yet. The pill row goes (44px plus the 20px
gap), and the owner's own bird moves into the New post button, in a 30px card-coloured disc where
the plus was. Opening the composer, the bird flies out of the button on a shared `layoutId` and
lands in the composer's avatar slot, leaving a dimmed nest behind. Two faces on the bench: In place
(the card opens at the top of the feed, posts slide down on `layout="position"`, posting dissolves
the card into the first post) and Sheet (the phone convention; the bird waits for the sheet to
settle before flying, because a sliding target makes the flight wobble). Morphing the whole card out
of the pill was considered and not taken: it stretches every word inside on the way.

The page reads the session so the bird is the owner's own. PostCard runs in `demo`; nothing posts.
The pill is spelled out rather than `buttonVariants`, whose descendant-svg rule would force the bird
glyph to 16px. Driven signed in at 1440 and 390: the bird measured mid-flight, the card and the
landed post sharing one top at 60ms, Escape and outside click close an empty card and return focus
to the button, no console errors.

## 2026-09-13 (later again) — pressing the oldest year from another order lands it at the top

Found by running the full e2e suite after the scrubber shipped. `collection-journeys.spec.ts`
"every year the rail offers lands on that year, lit" was red on desktop, and its failure was hiding
a real one underneath.

**The test was reading the wrong half.** It switches to whichever of Valley and Class holds more
years, and every swap in the file waited for "a photograph is visible". Measured through a swap at
1440: the title turns over at once, but the old half's photographs and the old half's rail stay up
for about 840ms while the other half is fetched, so the page never flashes empty. The wait was true
throughout and waited for nothing. It read the Valley's years, 2014 among them, off a rail about to
become the Class's, then pressed 2014 on a rail that runs 2015 to 2026. Two other tests carried the
same wait, one with a comment calling the title "the readiness signal". They passed only because
their assertions hold on either half. All three swaps now go through `switchHalf`, which waits until
no photograph on the page was on it before. A photograph belongs to one half and a swap arrives
whole, so that is exactly "the other half is here".

**With the swap fixed, the test reached 2015 and found the product bug.** Pressed from Newest, the
oldest year rested 396px down the screen with the page at its foot. The same press from
Chronological landed at 24. A press from another order is carried out in a postponed effect, once
the boxes exist, and that effect still called `window.scrollTo`. The oldest year's box ends the
document, so the browser clamped: asked for 104590, it stopped at 104218, 372px short, and the blank
after the river was never grown. The 2026-09-10 fix for this exact symptom put `landAt` into
`seekTo` and not here. It is `landAt` here too now.

**Then it went red at random, on a different test each run.** Every failure was one wait, "Timeout
5000ms exceeded", choosing an order and waiting for year headings to appear or go. Timed on the dev
server with nothing else running, an order change took 0.5 to 1.2s on the Valley and 0.7 to 2.0s on
the Class. Duplicates and headings each failed inside a full run and passed every time alone. The
year test, twenty river reloads on its own, hit it in two of three solo runs. The two waits that sit
through a river reload now allow 15s, local to those helpers the way the neighbouring specs set
theirs, not a global expect timeout.

Measured after: the journeys spec twice on both viewports, 8 passed and 1 skipped each time (the
year test is desktop-only), the year test walking all ten Class years including 2015. `npm run
check` clean, 119/119; `npm run visual` 25/25.

## 2026-09-13 (latest, round 2) — the bird steps out of the button

"I thought of this but wasn't the biggest fan because we have to inset the bird in a white box and
now the bird is waay too small and smaller than how the bird appears in basically every other
instance on the website" (owner, 2026-09-13), on `/lab/new-post`.

The bird leaves the pill and stands beside it at 40px, the `sm` size posts, the composer and the
rails use, with no disc. The pill gets its plus back. Bird and pill stay one button, hover and press
on the pill only, and the bird's 40px slot holds its width while the bird is out so the pill never
slides. The composer's slot is also 40px, so the flight is now a move with no scaling.

## 2026-09-13 (latest, round 3) — one shape, not two buttons

"but now we have two buttons with that have the same purpose. I know i'm giving you a bunch of
constaints but is there any way past it" (owner, 2026-09-13), on the bird standing beside the pill.

A 40px bird next to a 40px pill reads as two objects whatever the wiring, so the bench now offers two
ways to make them one shape without a box. Overlap: the pill starts under the bird's middle and a
round socket 3px wider than the bird is masked out of the green, so the bird stands on the page
colour and the green wraps it; the empty socket waits while the bird is out. Badge: no pill, the bird
is the button and wears a 20px canopy plus with a page-coloured halo. It is one object for certain
and gives up the words.

## 2026-09-13 (latest, round 4) — the socket goes

"it's a bit of a weird shape for the green bit. that sticks out. it's just standing out in the ui this
crescent thing. plus the ends of the green bit are quite sharp and that looks weird as well" (owner,
2026-09-13), on Overlap.

The sharp ends were geometry: a socket 23px in radius cut through a pill 20px in half-height has to
leave two points. Overlap is gone (kept in the room's comment as considered and not taken). Chip
replaces it: an ordinary pill whose round left end is the 40px bird, no cut and no box. The press
sinks the whole button; hover brightens only the green, since a filter on the bird would recolour it.
While the bird is out a plus fades into its place. A Green bird switch on the bench borrows a seed
id that hashes to a green species, because a green bird on canopy is the case that could fail.

## 2026-09-13 (latest, round 5) — the badge unfolds

"badge is honestly pretty good. if you can make the green plus enlarge when it's clicked on so it
doesn't look like this afterthought that would be good. so the plus becomes a full circle when the bird
flies away" (owner, 2026-09-13).

Badge is the room's default now. While the bird is out, the 20px canopy badge moves 14px up and left
and doubles, landing exactly on the 40px circle the bird left, and folds back as it returns. Transform
only, on `snappy`, so it settles before the bird (on `gentle`) arrives home. The plus is not scaled with
the disc, because doubling a 12px glyph with a 3px stroke gives a 6px stroke. The small plus rides the
disc and fades, and an ordinary 17px plus fades in at the centre.


## 2026-09-13 (descenders) — the tails of g and y stop being shaved off names

"the names in new in the directory get cut off. like the low letters like yg and so on. this happens
in a very subtle way in a bunch of places particularly in the admin panel" (owner, 2026-09-13).

An overflow clip cuts at the padding box, and `leading-none` makes the line box shorter than the
glyphs. Measured in Chrome: the feed rail's names lost 0.43px off every descender (the Link carries
its own `truncate`, so IdentityRow's clip/visible split never reached it), the mobile header's
"Rishi Valley" 1.68px. Admin rows already measured clean in Chrome, so the fix is engine-proof rather
than Chrome-tuned: a `descender-room` utility in tailwind-theme.css pads the clip box 0.25em each way
and hands it back with an equal negative margin, so no row moves. Applied to IdentityRow's name and
meta rows, the rail link, the sidebar wordmark and two catch-up name lines. After: ink sits 2.8 to
3.4px inside every clip box. WebKit was not measured (not installed).

## 2026-09-14 — the white ring goes

"when the green plus is the bigger circle when ou hover there's a white ring around it. don't show
hover status like that. show it like it's shown for any CTA like we do now. and is there any reason you
did it that way?" (owner, 2026-09-14), on `/lab/new-post`.

No reason; it was a mistake. The page-coloured 2px halo that lets the badge sit on a green bird was a
box-shadow on the disc itself, so it stayed on the unfolded circle (doubled to 4px by the scale) and
sat under the hover's brightness filter, which lifted it lighter than the page. The halo is now its own
element behind the badge, present only while a bird is under it and fading as the bird leaves, and out
of the filter's reach. The circle's hover and press are the canopy CTA's from `button.tsx`: 1.08
brightness, a 0.97 sink and the canopy drop shadow.

## 2026-09-14 (later) — the bird is the button

"ship it" (owner, 2026-09-14), on Badge in `/lab/new-post`.

On `/feed` the pill row above the posts is gone and the header's New post pill with it. In their place
is `NewPostCTA`: the member's own 40px bird with a 20px canopy plus at its corner. Pressing it opens the
composer at the top of the feed (In place, the room's default; Sheet was not chosen). The bird flies
into the composer's avatar slot on a shared `layoutId`, and the badge unfolds into a full 40px canopy
circle where the bird was. `NewPostDock` is the state the header and the column share, replacing a DOM
query that clicked the old pill.

`CreatePostForm`'s feed path lost its pill, its measured-height animation and its local open state:
FeedColumn mounts the card when the dock opens and owns the motion (the card fades and settles from its
top right; the feed below is one `layout="position"` block, so the posts slide as a translate). Escape
and a click away close an empty card and return focus to the badge; pressing the badge while open only
focuses the editor. A published post keeps the card on "Posting..." until the feed has reloaded with
it, then the card dissolves into it. `PostFeed` now re-arms its skeleton only for a new search, so that
reload no longer flashes three skeletons over the feed. The loading skeleton lost its composer block,
and DESIGN-SYSTEM no longer lists the composer pill as the one pill-shaped input.

Checked signed in at 1440 and 390 on the real feed without publishing (that would post to the live
database): posts start 24px under the header, open puts the composer at the top with focus in it and
the posts 198px lower, Escape and a click away close it, no console errors. Posting was proven in the
lab room.

## 2026-09-14 (search) — the search glass gets its circle back, and opens as a pill

"I don't like the fact that everything else is in a circle and this is just hanging. this is too
different particularly sometimes on a textured icons. can you create it the same way but make it in a
circle and just as smooth" (owner, 2026-09-14), on the header search. Then, mid-build: "make the
expansion 20% slower and the compression the same as expnasion".

`SearchPill` rests as the bell's exact 40px paper circle (card fill, border, the 1px shadow; measured
identical at 1440) and opens by widening that paper leftward into a pill. The motion is the hairline
version's, not the 2026-08-30 spring's: one property, one decelerating curve, the glass fixed (0px of
travel measured at 1440 and 390), words fading in behind the edge. 0.6s both ways, up from 0.5s open
and 0.26s close. The opaque fill is what the textured headers needed. Because it now has a border,
it wears `FIELD_FOCUS_WITHIN` and left the focus test's borderless list.

Checked signed in as Jerry on /directory and /feed at 1440, /directory and /collection at 390: the
pill reaches 300px on desktop and the column's left edge (20px) on a phone. Visual suite 25/25 with no
baseline moved.


## 2026-09-14 (avatars) — a member's photograph can no longer fall back to their bird

"in the image viewer why does veenkatesh br show as a verditer when he's uploaded a profile picture.
make sure that never happens anywhere" (owner, 2026-09-14).

Why: the Collection's photo query selected the uploader as `{ id, name }` only, and the viewer's byline
drew from that. With no `photoUrl`, `BirdAvatar` did its job and drew his hashed bird. The admin
analytics list "Members nobody has responded to" had the same hole in its raw SQL.

The fix is the type, not the two queries. `AvatarUser.photoUrl` was optional, so a select that forgot
it compiled. It is now `string | null`, required, and so is every person type that feeds an avatar
(Catch-up refs, post authors, the sidebar, mentions, the map, admin rows). `tsc` then named every
caller that had no photo to give. The real ones now carry it (the Collection uses `IDENTITY_SELECT`);
the invented ones (guide, landing, eggs, lab fixtures) say `photoUrl: null` out loud.


## 2026-09-14 (header) — header controls centre on the title's capitals, and the unfolded plus is 36px

"the search notification and new post icons seem lower than the Feed text ... make sure it's visually
balanced and it appears on the same horizontal line ... also the green plus icon when expanded seems
bigger than the notification icon" (owner, 2026-09-14).

Why: measured signed in as Jerry on every header route at 1440 and 390. The cap of the title runs from
44.9 to its baseline at 68 (centre 56.5), and every 40px control centred at 61, 4.5px low. `mt-px` had
aligned the TOPS while the title was `leading-none`. `leading-[1.2]` later dropped the letters 3px
and left the controls where they were. `PageHeader`'s row is now `-mt-[3.5px]`, centre 56.5 (92.5
on a phone, the first line of a wrapped title). One change, every surface.

The unfolded badge was exactly the bell's 40px, but a solid canopy disc with a shadow reads larger
than a paper circle with a hairline border. It now unfolds to scale 1.8 (36px) on the same centre,
and its plus is 16px instead of 17.

Visual suite: 12 header baselines moved, diffs read first (controls and the header pills only).


## 2026-09-14 (mobile header) — the directory's headcount stays beside its toggle on a phone, and the feed's bell moves up to the top bar like every other page

"on mobile the number of people is below the batch map people thing. it can be on the right on the same
vertical ... the filters can still be below it" and "the notification bell is on the page in feed but up
top everywhere else. make it up top even in feed why be different there" (owner, 2026-09-14).

Directory: `SentenceLine` takes `show` ("all" | "count" | "tokens"). Below sm the count rides the
toggle row on the right, as from sm up; only the filter tokens and "Clear all" take the line under
it, and that line is not rendered when nothing is filtered, so the map rises 46px on an unfiltered
phone. 218px of toggle and "82 people" fit 358px with room to spare.

Feed: `PageHeader`'s bell is `hidden md:block`, and the sidebar no longer skips its top-bar bell on
/feed. Below md the bell is in the same place on every route; from md up the feed header keeps it.

Also fixed the index line of the (header) entry above, which did not match its heading and was
failing `progress-log.test.mjs` at HEAD.

Visual suite: feed and directory at mobile moved, diffs read first (bell box and the count row only).


# Progress Log

## 2026-08-27 — the line Apple draws inside our icon, and the crest that carries it

The owner had noticed his own home screen doing something to our icon that Android does
not: a bright edge on the black crest tips, so they stop sinking into the tile. Four
earlier attempts at reproducing it were wrong in the same way, and the measurement that
settles it is one row of pixels across the join between the blue hill and the cream one:
`117 118 117 116 119 | 144 | 236 244 242 242 242`. One pixel of antialiasing and nothing
else. **Apple puts no line between two colours that touch.** Every previous build lit a
tonal step, which by construction draws a line down the cream/orange join and around each of
the eleven cinnamon quill rays in the crest. The height field is the union alpha of the whole
picture, so the filter hangs on the art group and never on a path.

**A bug, not a taste call, was why it kept coming out thin.** The filter was on the same `<g>`
as `transform="scale(0.38)"`, and a transform on the filtered element rescales every length
inside the filter with it, so a 4.5 unit blur was silently rendering as 1.7. Three rounds of
"make it wider" were fighting that. It also invalidated two harness scripts, `fit.mjs` and
`strip.mjs`, which are deleted rather than corrected: every number they ever produced was
measured at 38% of the size it claimed.

With that fixed, the fit is four numbers off his screenshot -- left flank +87, top +78,
bottom +20, right +19, each peaking three pixels inside the contour and back to the fill by
nine. Left beating top puts the light at azimuth 215, further round to the left than up. The
dark side holding at 22% rather than falling to nothing is what lights the right of things,
and it needs almost no ambient: one distant light at the right elevation lands on 22% by
itself. Ours reproduces all four within 3 of 255.

**Width ships at 0.7, not the fitted 1**, and that is a correction to the measurement rather
than taste overruling it. The screenshot is a downscaled Retina capture and resampling smears
a three pixel band a pixel or two wider than it is, so fitting the profile fitted the smear.
The owner called it at "about 30% too thick consistently", which is the order of error a 2x
downsample produces.

**The crest gained a longer cinnamon point and a rounded tip.** The point was vanishing by
26px; it is lengthened by moving the dark cap down, which leaves the fan's outline exactly
where it was because the outline is the quill's point either way. Rounding took two goes: the
first capped the tip with a quadratic whose control sat ABOVE the apex to hold the tip's
height, and a quadratic control above the apex is what makes a point in the first place, so
four settings rendered identical. It is a cubic with its controls on the tangents now, and
the quill is drawn from a length chosen to give back exactly what the rounding costs.

Together those two put visibly more light on the orange, which he caught. Measured, the peak
brightness had not moved -- 212 before, 211 after. What grew was the lit area: the point used
to be a sliver with nowhere for a highlight to sit.

**The icons ship as two builds from one source.** iOS 26 and macOS 26 add their own specular
pass and Apple says plainly not to bake highlights in, so `apple-icon.png` is flat. Android
adds nothing, which is why he noticed our icon looking duller there, so the maskable icon has
the light baked in. The catch is that a web manifest has no per-OS selector -- an icon entry
carries src, sizes, type and purpose and nothing else -- so the only platform it can
positively identify is Android, via `purpose: "maskable"`. Every plain "any" icon stays flat,
because macOS Safari's Add to Dock reads those. That costs a Windows PWA install the light it
could have had, deliberately: a flatter icon on a desktop install nobody has asked for is a
smaller failure than a double-lit one in the owner's own dock.

**The icon's geometry moved out of the lab** into `src/lib/hoopoe-geometry.ts`, as data
rather than JSX. It had been defined inside a lab page, which meant the shipped mark and the
character it came from could drift apart the first time anyone touched either. Both rooms and
the build script now render the identical `Prim[]`. The first attempt was a route handler
calling `renderToStaticMarkup`, which Next refuses to compile inside `app/`; the refusal was
right, and this version needs no dev server, no sign-in and no browser.

**The favicon is one cream range on pine.** The three planes carried three tints, which is a
separation that survives at 512 and turns to mud by 16. The two inner planes sat entirely
inside the silhouette, so painting them the same cream changes nothing but the file size.

**A dark app icon does not exist and now says so.** The source SVG carried a
`prefers-color-scheme` rule swapping the tile to ink, which did nothing: sharp rasterises
without a colour scheme, so every PNG came out canopy anyway. Nor could it work downstream --
a home screen icon is one flat PNG on both platforms. A rule that quietly does nothing is
worse than no rule, so it is gone, with the reason written into the file so nobody re-adds it.

Three smaller things worth the ink. `look.mjs` built filenames with
`[stem, i, tag].filter(Boolean)` and index **0** is falsy, so row 0 kept overwriting a
different file and I read back a stale image twice before noticing. The generated icon's own
comment spelled out the two seam tags the generator finds by string replace, so the
substitution went into the comment instead of the markup. And an XML comment cannot contain a
double hyphen, which sharp rejects outright -- that is how the favicon build first broke.
Both scripts now assert their seams and fail loudly, because a silently flat Android icon is
the exact failure this whole path exists to prevent.

Full working, the four wrong constructions and the traps: `docs/spec/apple-edge-light.md`.
The rooms are `/lab/glass-edges` and `/lab/hoopoe-marks`.

## 2026-08-27 — 500px, the bucket's own url, and a blur that is actually a blur

Three corrections to the same afternoon's work, all of them the owner looking at the real
thing and being right.

**The ceiling is 500, not 700 or 560.** He picked 560 from `/lab/crop` and then went lower
after living with it, for a reason the room could not show because the room draws
photographs rather than posts: "560 makes one post take up my entire desktop screen which
shouldn't happen." A card is the photograph plus a byline, the words and the actions, about
120px of it, so on a 900px laptop window 560 leaves nothing else on screen. At 500 nothing is
ever drawn taller than 500px anywhere: a tall photo is 375x500, a square 500x500, a 4:3
667x500, a panorama 900x386.

**Catch-up photographs were going through Vercel's image optimiser, and I put them there.**
They had been served straight off R2 since the day they shipped; `<PhotoFrame>` called
`photoSrc()` internally, which quietly changed that for a whole surface. Measured after he
reported it: a cold transform is 878ms against 264ms for the same bytes from the bucket's own
edge, and a Catch-up is the worst case for it -- everyone opens the same Round within a day,
so nobody amortises the first transform. The component no longer decides: the caller passes
the url it wants, the feed and letters keep the optimiser they already used, and Catch-ups
have their bucket urls back. Which is also the direction spec §4 locks: off the metered
optimiser entirely, onto precomputed R2 derivatives.

**The blur was shabby, and for a specific reason.** The bed was the 16px smear stored with
each image, on the theory that a 26px blur destroys the difference anyway. It does not:
`object-cover` stretches a 16px source across 350px of card, so every source pixel becomes a
20px block and the blur smears those into streaks. Owner, looking at his own Round: "very
distracting and not smooth and just yucky blur bars." It is the photograph itself now, same
`src` and `sizes` so the browser resolves the same URL and it costs no second download --
which is what `/lab/crop` did in the first place.

**And one bug of my own, caught by a gate rather than by me.** Hiding the bed below a 456px
viewport, to save a phone a blurred layer it can never see, hung `npm run visual`: a
`display: none` image with `loading="lazy"` never loads, so `img.complete` stays false
forever and the spec's settle() waits on `document.images` for good. The saving was never
measured; the cost was real inside a minute. Reverted, with the reason written down.

`npm run check` green, 78/78. `npm run visual` 23/23.

## 2026-08-27 — the Collection rework, phase 2: one rule for one photograph

Spec §13 phase 2, and the fix for the complaint the owner actually looks at: "all of their
faces are cropped out and you can't see them... sometimes the catch up just shows a bunch of
shoulders. Like, why?"

**Three surfaces, three different rules, none of them written down.** The feed guillotined a
photograph at a fixed 384px, whatever shape it was and whatever width the card had grown to
-- at 1216px that is a 3.2:1 letterbox applied to everything. A single Catch-up photograph
was forced into `aspect-[16/10] sm:aspect-[21/9]` and centre-cropped, which is what turned a
portrait of four friends into a row of shoulders. Letters had no bound at all. They now share
`src/lib/photo-layout.ts`, which is the rule the owner picked in `/lab/crop`: square or wider
runs free at true shape, taller than wide comes to 3:4 on a blurred bed of itself, aimed at
the subject and clamped, and nothing is ever drawn wider than 900px or taller than 700.

**Expressed as CSS, not as a measurement.** A max-width and an aspect-ratio the browser
resolves for itself, so nothing waits for layout to know how big a photograph will be -- which
is what reserves the space and stops the page jumping (bug #18). Measured on the feed after
the change: CLS 0.0000 at 1440x900 and at 390x844. The old markup gave the image no height at
all until its file arrived.

**A square photograph was coming out taller than a portrait**, which the tests caught rather
than my eye. Written literally, the spec bounds tall photos at 700px and everything else at
900px wide, so a 1:1 lands at 728px tall in a laptop column and 900 on a wide screen -- taller
than the shape the ceiling exists to bound. Handover F9 had seen it coming and left it open.
The ceiling now applies to every photograph, and a wide one obeys it by narrowing rather than
by being cut, which changes nothing except shapes between 1:1 and about 1.29:1 on a column
wider than 700px.

**The smear earns its keep twice.** The 16px placeholder stored with each image is also what
fills the card beside a tall photograph: same 140 bytes, no second decode of a full-size file,
and it is already there before the photograph arrives. The filter is the one approved in
`/lab/crop`, to the number.

Measured live at both viewports rather than eyeballed: a tall Catch-up photo draws exactly
525x700 with 151px of bed each side at 1440, and 314x419 with no bed at all at 390; a 4:3 feed
photograph went from 728x384 cropped to 728x546 whole; a letter photograph is 678x452 at true
shape. Eleven tests pin the rule across nine aspect ratios from 9:16 to 21:9 at the three real
column widths. `npm run check` green, 78/78. `npm run visual` 23/23.

Several photographs in one post still use the old mosaic; justified rows are phase 3.

## 2026-08-27 — the guide, made smooth by taking the route out of the way

Owner, on three successive versions: "so incredibly lazy", "this is so horrible", "why
can't it be as smooth as option D looked in the lab". The last question had a real answer
and finding it is what fixed the rest.

**The lab's D was smooth because it was fake.** A useState flip with nothing in the path.
The shipped version routed instead, and a route navigation measured **404 to 444ms in dev
before the sheet existed to animate**, with the route already compiled. That is 400ms of
nothing followed by an animation, and no easing curve survives it.

**Two attempts to keep the URL and the smoothness, both measured, both abandoned.**
Intercepting routes were correct about addresses and cost the 400ms. `history.pushState`
behind a client-state open was instant and fought Next's router: `usePathname` moves with a
pushState, so the layer's own "navigated away" effect fired one tick after every open and
closed the chapter before it appeared, and Next rewrote `history.state` so the address
never came back on close. Both diagnosed by instrumenting the store rather than guessing:
`listeners: 1, current: null` said the subscriber was fine and something had reset it.

**So the chapter is plain UI state and does not touch the address.** `/guide/[area]` is
still a real page for a mailed link, a refresh, or the index. What is given up is linking
to "the overlay, over the feed", which nobody asked for and which cost all the smoothness
that was asked for. One history entry is pushed with the same URL so back still closes it,
which Next ignores because the route has not changed. Click to painted sheet is now 91 to
276ms in dev.

**Everything else in that round.** The mark went 0.58em to 0.42em to 0.5em, twice too far
in each direction before landing. The panel was starting 14% down the screen and now sits
32px from the top. The close button moved into a zero-height sticky row, so it stops
pushing every chapter title down: 45px above the title became 37px. The nested
flex-plus-inner-scroller became one element that is itself the scroller, because a shape
with several ways to end up zero-height is a shape that will one day not scroll. `svh`
replaced `dvh`, since iOS resizes a dvh-tall sheet under the finger scrolling it.

**Two things fixed blind, and said so.** The layout shifting as the overlay opens did not
reproduce here in headless or headful: `main.x` is identical on every frame through the
transition, and macOS hands out overlay scrollbars so there is no gutter to lose.
`scrollbar-gutter: stable` went onto `html` anyway, because it is the correct fix for
exactly that symptom on any machine where scroll bars are always shown, and because a modal
putting `overflow: hidden` on the document is a whole-app pattern rather than this
feature's problem. Whether it was the right fix is still his to confirm.


## 2026-08-27 — the Collection rework, phase 1: every image gets measured

`docs/planning/collection-rework/spec.md` §13 phase 1, the one everything else sits on.
Nothing visible changed, deliberately.

**The gap.** `Post.images` and `CatchupEntry.images` are JSON arrays of URL strings, so the
app knew nothing about a feed, letter or Catch-up photograph except where to fetch it. That
one absence is under four separate complaints: the page jumps as each photo lands, a
justified row cannot be solved without every aspect ratio up front, a 20,000-image grid
cannot be windowed without row heights, and a crop cannot be aimed at anything.

**The table is keyed by URL**, which is the whole trick: no existing row moves, nothing else
in the schema changes, and a URL with no row is not an error -- the renderer falls back to
what it did before. That is what made it safe to add mid-flight and to backfill afterwards.
It holds width, height, a focal point, whether the photograph has any colour, and a 16px
smear of itself to show while the real thing loads.

**Four numbers, each argued rather than picked.** The probe decodes once at 160px and every
measurement runs off that raw buffer. The greyscale threshold is 8 of 255, measured: a true
greyscale copy of one of our own photographs reads 0.01 and the five colour photographs to
hand read 16.8 to 49.3. The smear is 16px on its longest edge -- compared at 12, 16, 24 and
32 side by side, 12 is mush and 24 starts showing structure a blur then has to hide -- and
costs about 140 characters. And the focal probe asks libvips for the image's own shape with
20% off its height rather than for a square, because a square image asked for a square crop
is never cropped at all, so no focal point is reported and the column takes a NaN. There is
a test for exactly that.

**What the focal points actually say, which is worth knowing before phase 2 leans on them.**
Across the 41 photographs now in the database, 14 land at an extreme edge (within 3% of a
border) and only 13 fall inside the 15-50% band the tall-photo rule will use. sharp's
`attention` is a contrast heuristic and it goes for the bright sky. So the clamp in D9 is
not a nicety, it is doing most of the work, and the uploader override the spec calls a hard
requirement is what actually makes the aim defensible.

Backfilled 41 images on the main database and 2 on the demo, none failed. Verified at
runtime rather than by types alone: signed in, posted a photograph through `/api/upload`,
and the response carried the measurements while the row held the same ones. Then an upload
that fails partway -- a good photo followed by a file that is not an image -- to prove the
abort takes back both the bytes and what we learned about them. It does; no row survived.

`npm run check` green: TypeScript, ESLint, protocol, 45 lab routes, 77/77 test files.

## 2026-08-27 — the guide, made to actually work

Owner on the first cut: "it's done so incredibly poorly ... this is pukeworthy." Five
things, all real, all found by looking at it rather than at the code.

**The door was missing on Catch-ups**, the one page he named as needing it most. The script
that added `guide=` to six page headers inserted at the first `<PageHeader` it found, and
`catchups/page.tsx` has two: the "almost ready" fallback got the door and the real header
did not. A count of headers against doors per file would have caught it in one line, and
that check now exists as a habit rather than a script.

**No entrance.** This component is rendered by a route, so it mounts with the sheet already
open, and a sheet born open has no closed-to-open transition to run. Traced at 30ms
intervals it went from absent to fully opaque in a single sample. It now mounts shut and
opens on the next frame: 40px of rise against a fade, over 190ms, measured.

**No exit.** Closing was `router.back()`, which unmounts the tree on the spot, so the exit
styles never got a frame either. The sheet now closes first and the navigation follows.
Traced: y 126 to 165 while opacity goes 1 to 0.01, then the URL returns.

**Every panel a different height**, which is the one that made it look unowned. `ui/sheet`
sets `data-[side=bottom]:h-auto`, and a plain `h-[86dvh]` loses to it every time:
tailwind-merge keeps both, because they are different variant groups, and the attribute
selector then wins on specificity. Setting a height and never checking it applied is the
whole mistake. Before: 703 to 1406px across six chapters, with Catch-ups opening 1406px
tall inside a 900px window so its top 500px sat off the screen. After: 774 desktop and 726
mobile, identical on all six.

**The page behind, and the flicker.** Neither reproduced headlessly. `main.x` never moves,
and no scroll happens during the open. Two fixes went in anyway because both are correct
for a modal route regardless of who is right: `scroll={false}`, since Next scrolls to the
top on navigation by default and doing that under an overlay moves the page while the
reader watches, and `prefetch`, since the delay before the sheet appeared was the chapter
route compiling. Warmed, it arrives with the press. Next disables prefetch in development,
so that half only shows on the deployed site, and the dev delay will stay.


## 2026-08-27 — refactor audit, the last two rows: one refused, one done

The campaign's final structure-only pair. The owner left the judgement to this session.

**`duplication-02` — the action-gate wrapper — re-refuted at fix time.** Its two payoffs
both fail against today's tree. The one the handover called "the payoff that justifies it"
was that `requireVerifiedMember()` calls `auth()` itself, so 24 actions authenticate twice
and a wrapper would remove a real per-request cost. `auth()` is `cache()`d
(`src/lib/auth.ts:455`), so the second call is a cache hit and costs nothing — and phase 3's
own member-gate rewrite already says so in a comment eight lines from the call
(`src/lib/member-gate.ts:46`). The verifier proved two session READS and stopped there; the
cache is what makes that free. The second payoff was structural: forgetting a gate becomes
impossible when the gate wraps the function. That needs the finding's
`export const doThing = withMember(async …)` shape, and `gate-coverage.test.mjs`'s C-189
sweep hard-fails any export that is not `export async function` — on purpose, because
`export const doThing = async () => {}` is the exact form that once shipped ungated past it.
Allowing the wrapper means teaching three separate mechanisms a new export form
(`exportedActions`, the offenders list, `fnBody`) — loosening the tripwire that catches
ungated actions, in exchange for lines. And the pilot file the handover named has no member
gate and no rate limit, so it would exercise neither `withMember` nor the options that carry
the savings, on a file where the wrapper is a net +60 lines. Three reasons, any one of them
enough.

**What the row actually had to give, taken.** `messages/actions.ts` really did spell the
same admin check out three times — session read, `role !== "admin"`, `"Not authorized"` —
and a security check that exists three times can be fixed twice and left wrong once. One
file-local `actingAdmin()` now holds it. No new lib module, no tripwire edit:
`gate-coverage`'s delegation pass already credits a caller with a private helper's gate,
which is what that pass is for. Verified against the live database rather than by reading
the diff: a thread opened as Jerry, replied to as admin, marked sorted, then read back —
`status` closed, `adminUnread` false, one `fromAdmin` message with the admin's own id on it.

**Closed out.** Report §1b has a measured column now, taken the only way a measurement like
this is worth anything: the campaign's baseline commit extracted to a scratch tree with
`git archive` and put through the SAME tool invocation as today's, so nothing is compared
against §1a's unknown flags. −8.00 MB tracked (37.89 → 29.89), and that is net of the audit's
own 19,355 lines of markdown. −10 dependencies. Four tables, nine columns and three indexes
gone from both databases. Duplication 2.04 % → 1.47 %, which is 61 fewer clones.

Then he asked for the stats, so the two rows I had left open got measured too. The build
shares `.next` with a dev server another session started, so it was built in a throwaway git
worktree under the gitignored `.scratch/` — two traps there, both now written down: Turbopack
refuses a `node_modules` symlink and will not resolve upward past the worktree's own
lockfile, so it has to be hard-linked with `cp -Rl`. First-load JS then comes straight out of
`.next/diagnostics/route-bundle-stats.json`, whose `firstLoadUncompressedJsBytes` is exactly
the metric the audit's baseline used. **/feed 1,530 → 1,186 KB, /directory 1,642 → 1,218,
/profile 1,636 → 1,225, the median member route ~1,370 → 1,047.** Compile 16.9 → 12.1 s,
TypeScript 19.4 → 14.5 s; the wall clock is not comparable at load 36. Real import cycles
5 → 0.

**And the code-lines row is a miss, which the report now says outright.** The 196 commits in
the window were partitioned by hand — 167 the campaign's, 29 peer feature work — and the
campaign's own diffs come to **−1,067 against an expected −4,500 to −5,500**. Phase 1a
delivered −2,070 of that; the two dedupe phases, 65 commits and the largest investment in the
campaign, netted **−90 lines between them**. Not a bad estimate, a wrong unit: dedupe is
line-neutral by construction here, because the house rule is that every constant is argued
for in a comment, so replacing five copies with one function owes a docblock, five imports
and five call sites. What it did buy is 61 fewer clones and 939 fewer duplicated lines — a
bug in any of them now gets fixed once. Every other projection the audit made was met or
beaten. The note for the next audit is in §1b: project clones, packages, bytes and database
objects here, and do not project SLOC at all.

**And the bug that driving it found.** C-014 fixed a shared-browser leak: the crash-net key
grew a member id, so one person's unsaved letter could not be restored into the next
person's composer. The key template was right. The wiring was not. `letter-desk.tsx` never
passed `currentUser`, and the desk is the ONLY surface where `defaultLetter` is set, so it
is the only place the crash net runs at all -- meaning every belt this app has ever written
went to `rv:letter-draft:anon:new`, and the fix has been off for its entire life. Proved by
signing two accounts into the same browser and reading the keys: both `anon:new` before,
two distinct ids after.

The shape test could not have caught it, and that is the lesson worth keeping: it greps the
key template and counts three call sites passing the id, all of which were true while the
id was undefined at every one of them. The new pin asserts the WIRE -- the desk passes
`currentUser={{ id: writerId }}` and both letter pages pass `writerId={session.user.id}`.
Found by driving the machine, not by reading it.

**`feed-posts-02` — the composer's two machines, out into named hooks.** The app's biggest
client file was 1,685 lines; it is 1,201 now, with `use-letter-persistence.ts` (468) and
`use-composer-uploads.ts` (225) beside it. A move, not a cut: +209 lines all told, which is
what the two named boundaries cost, and the honest price of the letter machine — the most
audit-scarred code in the repo, C-014, C-175, C-176, C-177, B-043 and M66 — being one unit
with an API instead of 310 lines in the middle of a component. The editor body stayed put:
it closes over twenty pieces of state and prop-drilling them is worse than the length.

The persistence hook's API is eight things in, five out, and that matters: the finding's own
falsifier was "if the refs cannot cross a hook boundary without a 15-parameter API, stop and
keep the file whole". Grouping is what avoided it — `draft` and `initial` are the five-value
bundles the exit save already kept in one ref, and the four pieces of restore plumbing
(setContent, setTitle, the contentEditable, the hydration latch) collapse into one
`onRestore` callback, because putting words back on the sheet is the editor's business.

**Four pinned test files moved with it, in the same commit**: composer-rule (six anchors),
rich-truncate (C-183's exact count of two blob releases, C-014's three key call sites),
upload-shared (C-073's two notices) and upload-size-rule's SENDERS list. The counts all
survive the move to the digit, which is the useful part: two releases are still two, three
call sites still three.

**Driven, not read.** Typed a letter and watched the device copy appear after the 2.5s idle;
reloaded and took the "Picked up where you left off" offer; left the page mid-sentence and
watched "Saved to your drafts"; resumed the draft and watched the desk go Saving... → Saved
with the local copy cleared on success; attached a photograph on the feed (presign 200,
finalize 200, blob preview, Post enabled only after) and removed it again. `npm run visual`
is 23/23 — the split is invisible, which is the whole point.

## 2026-08-27 — the guide ships, and the hoopoe tour does not

`/guide` is real: an index, six chapters, and two ways in. The tour is gone.

**The destination was chosen by building all four.** `/lab/guide` renders one Catch-ups
chapter as a page, a side panel, a section of one long document, and a page floating over
the app, from a single component, so only the container differed. He picked the last one.
Two things the specimens decided that prose could not: the chapter's diagrams stop being
pictures at a panel's 404px, and a panel can only be opened from the page it describes, so
it has no answer to "what even is a Catch-up" asked from the feed.

**Two rejections, both worth keeping.** The first chapter draft sat in the policy pages'
shell because he had praised those pages: "this is so boring." Those pages are plain
because a legal document should be. The second earned it with charm instead: "I do like the
straightforward tone of the T&C instead of your try hard cringe cute tone." So the voice is
the community guidelines' and the form is not a document. Cut in the rewrite: an invented
anecdote, three aphorisms, a closing send-off, and a sentence that said what a Catch-up is
not before saying what it is, which `AI-WRITING-TELLS.md` bans outright.

**Half the graphics did not earn their place** and he said so. The rule now: a graphic
belongs when the fact is a shape or a comparison. The four windows of a Round drawn to
their real lengths is a shape. Named questions against always-named answers is a
comparison, and it is the rule people get wrong. The Round card and the holding shimmer
only showed what the real page already shows, so they went.

**The placement is one door: the page title.** It adds nothing to any page because it adds
nothing, a word already there doing a second job. On desktop the mark fades in on hover.
On a phone, his idea: one tap reveals it, the next one goes.

A second door shipped first, the sidebar's `/about` row repointed at `/guide`, on the
argument that a lost member looks at the menu rather than at the page. He reverted it the
same day: "It's fine if it's not reachable like that. The page title thing is enough." So
nothing in the navigation links to `/guide`. It is reachable by URL, by the back-link on a
standalone chapter, and by any link mailed to somebody, and a member who has not worked
out that the heading is pressable will not find it by browsing. That is the trade he
chose: no clutter anywhere, at the cost of discovery. `/about` is unchanged and still says
"indefinitely procrastinated".

**Three things only measurement caught.** The heading's tap target was 30px, under the 44
everyone agrees on; padding plus equal negative margin bought the height back without
moving the heading a pixel. Reading the scroll position in the overlay's own effect
returned a reader 600px down to 5041, because by then the navigation had already happened;
the door records it before it leaves. And reserving layout space for the mark pushed "The
Birds of the Valley" onto a second line at 390px and shoved the whole page down 30px. The
visual suite caught that last one on the page nobody was looking at, which is the entire
argument for running it. The mark is zero-width now and paints outside its own box.

Verified in a browser, not claimed: opacity 0 at rest and 1 on hover with the heading rect
unchanged; the overlay opens with the address bar at /guide/birds and the page still
mounted behind it; escape returns to exactly the scroll position it left; a cold load of
the same URL renders the standalone page with no overlay; and on touch the first tap arms
without navigating.

**Not done, and named rather than faked.** Reach out, Profile, Notifications and Support
have no chapter. Every chapter here describes behaviour read out of the code first, and the
reason that matters is Letters: the working assumption was that a letter is private to one
person, which is the opposite of true. `/about` is now an orphan still reading
"indefinitely procrastinated".

**The overlay was hand-rolled first, and the protocol audit was right to fail it.** This
app has one dialog material and `ui/sheet` is its edge-anchored variant. Rebuilt on
`side="bottom"`, it came out better than the hand-rolled version in five ways it did not
have to think about: the warm-ink scrim, the focus trap, escape, the aria wiring and the
scroll lock. It also sizes to its content, which quietly fixed the empty page under the
shortest chapter. `src/lib/guide-scroll.ts`, written to hand the scroll position from the
door to the overlay, is deleted: the primitive keeps the position on its own, measured at
40 in and 40 out.

One diagnosis in here was wrong and worth recording. A tap on the heading appeared not to
arm the mark, and the theory was that focusing the link scrolled it into view and tripped
the disarm. The real answer was the test: at 40px of scroll the sticky mobile header covers
the title, so the tap was landing on the header. `elementFromPoint` said so in one line.
The speculative fix, a frame delay and an 8px threshold, was reverted rather than left in
wearing a plausible comment.

Gates green. The /about baseline moved to say Guide and then moved back; the regenerated
file differs from the original by two antialiasing pixels, checked rather than assumed.


## 2026-08-27 — a room to choose where the in-app guide lives

The owner wants a guide chapter per area, reachable from an affordance so quiet that
nobody who is not looking for it ever sees it. Placement is the loud question, but it
cannot be answered first: a hover that throws you to another route and a hover that
opens a sheet want different doors. So this session built `/lab/guide` to settle the
destination, and left placement for the next one.

**One chapter, four containers.** Catch-ups, because he named it as the least intuitive
thing in the app. The chapter is written once in `_content.tsx` and every stage renders
that same component untouched, so nothing about the writing can sway the pick. The four:
a page of its own, a side panel over the page you were on, a section of one long
document jumped into by anchor, and the page floating over the app via intercepting
routes. Each sits in a fake browser frame, because the address bar is half the argument
and is invisible if you only draw the viewport.

**A wrong turn worth recording.** The first version put the chapter in the policy pages'
shell, on the grounds that he had praised those pages. He rejected it: "this is so
boring". The pages are good because a legal document should be plain, and a guide has
the opposite job — nobody is obliged to read it, so it has to earn the read. This is the
purpose-fit rule he has given before, and it was violated in the same session he restated
it. The rebuild is made of the product's own material instead: a Round card with real
bird avatars, the four windows drawn to their true lengths, the holding state the quiet
day really shows, one answer card, and a closing action that hands you back to the
product.

**Two things the specimens decided.** The band of windows only reads as a picture at page
width; at the panel's 404px it is still legible but has stopped teaching the shape, which
is the whole reason it exists. And a panel can only be opened from the page it describes,
so it has no answer to "what even is a Catch-up" asked from the feed. Both point at D,
and A is the same file so it comes free. The earlier claim that a panel cannot carry a
URL was wrong and the stage shows it with the query in the bar.

**Two mock defects fixed after looking.** A close button floating over the scroller let
the diagram slide underneath it; it moved into a sticky strip. The negative top margin
on that strip then dragged the chapter's first line up under it, which is what negative
margins do to everything that follows them.

Gates green: TypeScript, ESLint, protocol, lab registry (44 routes), unit tests.


## 2026-08-26 — phase 5 part 2: the pen, the press and the first photograph

Four commits close the refactor audit's phase 5. The full handover is
`docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md`, session 8.

**What got lighter, and how it was proved.** Every number here was read off a real
browser against a production server, not off a build manifest, because the manifest
cannot tell a chunk that loads immediately from one that loads on a click. A
stranger viewing a classmate's profile was downloading the GeoNames city picker, the
house picker, the contact-row editor and both photo dialogs in order to render none of
them: 1,730 KB of JavaScript for a sheet of text, now 1,634. The feed and the Collection
were shipping the comment thread, the full-screen viewer, the edit and moderation
dialogs, the poll builder and the mention list to pages where nobody had clicked
anything yet; all of them now arrive on the press. /privacy and /login were downloading
the rich-text renderer's five regular expressions and a 30-entry table of international
calling codes, and building all of them, because everything in `utils.ts` rides along
with `cn`; both moved to modules of their own.

**The change a member will actually notice is not about bytes.** The Collection's grid
fetched its first page after the page had already loaded, so a cold visit sat on
skeletons for 778 ms locally and **2.9 seconds on a slow connection** before one
photograph appeared. That query now runs on the server with the three the page already
ran, and the photographs arrive with the paint.

**Where measurement changed the answer.** Deferring the house chain on your own profile
was wrong and only a rAF sampler said so — it is the one editor visible at rest, and
`ssr: false` popped it in two frames late, so it keeps its server render while the other
four do not. The audit's estimate for the profile split was 80–150 KB; the honest number
is 73. And the audit named /directory alongside /collection for the first-page fix, but
/directory has server-rendered its first page all along.

**A method worth keeping.** Byte totals tell you that something moved. Fetching the
chunks the browser actually downloaded and grepping them for a string only one module
contains tells you *what* moved — and it is what caught the browser image downscaler
still riding onto every profile view behind a hook, after the five obvious things had
already gone.

Also in this pass: /collection's visual baseline held one photograph and the live
database now has two, which had the route red on both viewports for no commit's reason.
Looked at and re-recorded on its own, which is what `visual.spec.ts`'s own note says to
do when a photo arrives.

Phase 6 is next and cannot start without the owner: it is DDL on the live database and
needs his answers on the drops.


## 2026-08-26 — phase 5 part 1: the bundle diet, and the thing that was never the bundle

Eight commits against the refactor audit's phase 5. Five rows executed, three
re-refuted with measurements attached so nobody re-runs them. The full handover
is `docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md`, session 7.

**What got lighter.** Every member page lost roughly 295 KB of first-load
JavaScript, and /directory 402 KB. posthog-js (245 KB, the largest single thing
after react-dom) now arrives on an idle callback instead of before hydration;
the animation runtime moved behind LazyMotion so `m.` components load their 132
KB of features asynchronously; the world atlas /directory drew is fetched as a
static file rather than compiled into the page's JavaScript; the 404's hoopoe
stopped riding along on /privacy and /terms; and the app's one internal barrel
is gone. Measured on production builds, not estimated.

**The finding that matters more than all of it.** A feed screenful downloads
**1,041 KB of photographs against 188 KB of gzipped JavaScript**. Every image
was oversized — a card 728px wide fetching a 1920px file, a half-width card
359px wide fetching 1600px, between four and twenty times the pixels a screen
can use. Feed and letter photos now come through the image optimizer at display
size: 364 KB for the same screenful, a 65% cut, nothing upscaled. Photos are
5.5x all the JavaScript in this audit put together, which is worth remembering
the next time a page feels slow.

Two consequences the owner should hold on to: this starts billing Vercel image
transformations (trivial at 63 members, but it is a real line item), and the
privacy policy lost its "Vercel Analytics" row because that tool was removed in
favour of PostHog — a member-facing legal document, edited in the same commit as
the code that made it untrue.

**Three claims did not survive contact.** Excluding `src/generated` from
tsconfig removes 3 files of 6,300, because TypeScript still pulls in whatever is
imported — Instantiations were identical to the digit. Sentry's build hook costs
about 1 s today, not the 3 s the audit measured, so dropping the wrapper is not
worth its risk. And making the demo bar dynamic saved exactly zero bytes: 1,619
KB decoded before and after. That last one was reverted rather than kept as
indirection that buys nothing.

**A method worth reusing.** The audit's own `route-js.mjs` counts what a route
*can* hydrate, so it reports no change for any `next/dynamic` work and cannot
tell an eager chunk from a lazy one. The ground truth is what the browser
actually downloads, and getting that on an authed route needs a production
server started with an http `AUTH_URL` (otherwise it wants a `__Secure-` cookie
the browser will not set over http). That method changed three verdicts here.

**Guard added.** LazyMotion's `strict` mode would catch a stray `motion.` at dev
time, but it would also break every lab room, since the 30 files under
`src/app/lab` still use `motion.` deliberately. `motion-namespace-rule.test.mjs`
replaces it, mutation-checked three ways — one stray `motion.` anywhere in the
app silently puts 132 KB back on every page, and nothing else would notice.

Five rows remain in phase 5. The largest, splitting the letterhead's edit half
out of what every stranger downloads, was deliberately not started late in a
session: it is a 400-line extraction on the app's second-heaviest route and
wants a session's front half, not its tail.

## 2026-08-26 — apple logo replication, committed on the owner's word

Not this session's work. The icon and edge-light files had been sitting modified
and untracked for about two days, belonging to no live session; two peers had
each left them alone and one had asked about them. The owner said commit them,
so this is that, reviewed rather than rubber-stamped.

What is in it. The app icon now has TWO sources instead of one, and the reason is
written into `generate-icons.mjs`: `src/app/icon.svg` stays the quiet three-hill
mark, because a browser tab is 16px of chrome beside a page title, and
`favicon.ico` is the only thing cut from it; `public/images/brand/app-icon.svg`
is the hoopoe peeking over the bottom edge with its crest fanned, and every
home-screen and dock PNG is cut from that, because those are looked at rather
than glanced past. The maskable variant scales about the bottom centre, not the
canvas centre, so shrinking it cannot lift the head off the edge it is peeking
over.

`docs/spec/apple-edge-light.md` is the measurement write-up: what macOS 26 and
iOS 26 draw INSIDE an icon (not the glassy outer rim everybody documents),
measured off the owner's own home screen, plus the three reconstructions that
were wrong and why the numbers endorsed the second one anyway. Its lesson is
worth more than its result: a numeric fit is only as good as the thing it
measures, and a picture is not optional. `/lab/glass-edges` puts the candidates
next to each other, and `scripts/dev/apple-edge/` is the harness.

What this session added to it, rather than found: ledger lines in
`scripts/README.md` for the six harness scripts (the new scripts-ledger gate
fails a tracked script with no line), a `.gitignore` rule for their comparison
strips (234KB of regenerable PNG), and the spec's line in `docs/README.md`.

One thing for the owner's eye, flagged rather than changed: the recolour of
`icon.svg` dropped its `prefers-color-scheme` block along with the old comments,
so the SVG favicon no longer swaps its tile to the dark rail in dark mode. That
may well be deliberate — Apple's icons do not adapt either — but it was not
written down anywhere, so it is written down here.

`npm run check` green, 77/77. `npm run visual` 21/23; both failures are another
session's in-flight Vercel-Analytics removal rewriting the /privacy processor
table, not this.

## Session 2026-08-26 (seventh) — refactor audit phase 4, part 2: the admin wing and the doors

Fourteen commits, the six rows phase 4 had left, and the phase is closed. The full
account with every rule-4 outcome is in
`docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md`; this is the short version.

**The admin wing was the biggest piece.** Nine functions across six files each wrote
out the same setBusy / callAction / toast / refresh / release-in-a-finally handler,
six of them carrying the same verbatim comment explaining the finally (B-042, the bug
where a rejected call left a row disabled for the session). Six copies of a guard is
six chances to write the seventh without it, so it is one `useAdminAct` now, with two
options and no more. People and Content shared their filter controls and had each
hand-built the same hundred-line assembly on top of them, which is how they ended up
behaving differently behind an identical-looking bar; that is one `AdminFilterBar`,
and two real behaviour differences were reconciled deliberately rather than
preserved. The messages pages wrote the eight-field member shape four times and the
take-one-extra-and-reverse message window twice. Twelve admin pages carried the same
four-line paragraph about B-024, whose argument now lives once in `lib/admin.ts` —
which needed it, because that file still claimed the layout guard was what protected
a new section, and that is the belief B-024 disproved.

**Three analytics views stopped paying for numbers they throw away.** Content and
Faces each ran thirteen concurrent queries to get one integer, the denominator of a
percentage. Rhythms fetched two user-joined visitor lists and two raw aggregates and
rendered none of them. The room advertises itself as getting faster as it grows, and
this was the page where that was untrue.

**Eight API route handlers each had their own front door.** Next gives a route handler
no origin check, and `gate-coverage` only sweeps `"use server"` files, so nothing
anywhere failed if one arrived with three of the four checks — including three copies
of a fail-closed constant-time secret comparison whose newest copy carried the comment
"matching the two sibling cron routes". They share `lib/api-gate.ts` now, and two
derived tests make the sharing stick. Both upload paths were driven against the real
R2 bucket to prove it, and the test objects deleted afterwards.

**One member-facing fix fell out of a dedupe.** The onboarding step and the profile
letterhead each wrote out picking, framing and sending a photograph, and differed in
the one place it mattered: onboarding shrank an undecodable file in the browser first
and the profile did not. So the same HEIC off the same phone worked during the wizard
and died at Vercel's body cap from the profile, with a stuck spinner and no message.
One hook, one guard, both surfaces — driven as Jerry on each, including a deliberately
truncated JPEG to reach the branch.

**The best thing here is probably a test.** `scripts/README.md` has opened with "add a
script, add a line" since the owner cleared 31 dead one-off probes by hand. Written
down was not enough: the folder held 50 scripts and the README named 32, and the
eighteen it had lost included every phase probe and the whole of `ops/`, which a
nightly workflow runs. That rule is now a gate, in both directions. Three more pins
landed with it — every upload route must use the shared door, every cron must use the
shared secret check, and the avatar hook must really shrink — and every one was
mutation-tested, because a pin that cannot fail is worse than no pin.

**Refused, with reasons.** The audit's suggestion to give the audit log page the shared
admin skeleton would have made it draw avatar circles that never arrive, for twelve
lines. Its suggested home for the upload guard would have put NextAuth in five browser
bundles. Its shared probe-cleanup would have over-deleted on the live database, and its
shared dev-database opener wanted one default connection string across four scripts
that deliberately point at different databases. Two of the five "live routes" it said
the crawler was missing turned out not to be routes at all.

Gates: `npm run check` green before every commit (77 test files now), `npm run visual`
23/23, `npm run verify:crawl` 20/20 including the three routes nothing had ever crawled.

## Session 2026-08-26 (sixth) — eight more trivia questions, and the line that shows them

The entry gate had two questions, so anyone who never lived in a house and never
looked up at the tree was stuck refreshing. It now has ten: the hill over the games
field, where singing assemblies happen, Thursday dinner, the tuck shop, the fourth
valley after Golden, Silver and Neem, the round hut, folkie, and the walk up to
Asthachal. The owner supplied the questions and the answers he wanted honoured; the
wording is his, tidied.

Matching works the way it already did — strip everything but letters and digits, then
allow one typo on any answer of five characters or more — with two additions.
`normalize()` now also drops a trailing "valley", so "Raavi valley" and "Raavi" are
one answer. And Thursday dinner is a menu rather than a name: "egg curry", "paneer",
"tomato rice", or all three in a sentence, are the same answer, so that one question
carries a `contains` list and passes on a mention. Every accepted spelling the owner
listed was checked against the real matcher before this landed, and two gaps it found
were closed: "ashta" is a transposition, which the one-edit rule counts as two, and
"kaveree" had been promised in a comment since August without ever matching.

**What a visitor sees.** The longer questions broke the line that shows them, in three
ways, all now fixed and all measured in the browser rather than eyeballed.

The swap arrow was a sibling of the question's text box. An inline-block that has to
wrap takes the full width of its line, so the moment a question needed two lines the
arrow had nowhere to sit and dropped onto a line of its own — which was already
happening on a phone with the two old questions. It now lives inside the text box,
tied to the last word by a non-breaking space, so it rides the last line and hugs the
question mark at every width.

No line of a question holds a single word any more. `text-balance` evens the lines out
and a non-breaking space between the last two words guarantees the tail; all ten
questions were measured at 500, 390, 360, 320, 280 and 240px and none of them orphans
a word or strands the arrow.

And a swap that changes the number of lines no longer jolts the answer field and the
button downward in one frame. The question block's height is animated on the same
spring the words ride: a 28px change now spreads over thirteen frames, five pixels at
the worst of them.

`npm run check` green. `npm run visual` 22/23 — the failure was `/support` on mobile,
the bird grid and the cost bar caught mid-render, which passes on re-run and has
nothing to do with signup.

### Later the same session — the auth column arrives with the cream

The owner watched the landing-to-signup transition and named the order he did not
want: the slide starts, the cream right-hand background comes in and the hoopoe
flies out, and then, mid flight, the content turns up on cream that has already
finished arriving. He wanted the cream to arrive with the content already on it.

The landing owns those 0.9 seconds. /signup does not exist until the push at the
end of them, so there was no version of this that did not either move the
navigation earlier or draw the destination early. He picked the second, for
seamlessness, and it is what shipped: `auth-first-frame.tsx` draws the
destination's opening frame on the landing, parked behind the photo layer and
uncovered by the slide, running the entrance the real page would have run. The
landing names that destination in `AUTH_PREVIEW_FLAG`, and the real page reads it
through `useFlightArrival` and mounts settled instead of sliding the same column
in a second time. Measured: the frame exists 139ms after the click, the column has
settled by 536ms, the push lands at ~1.4s and every element is within 0 pixels of
where the drawing had it. Both destinations, not just /signup — the owner asked
for /login to be on the same architecture, and it is.

The stand-in is a real duplication, so it is pinned: `auth-first-frame.test.mjs`
fails if any string or measured class in it drifts from signup-client.tsx,
login-client.tsx or trivia-gate.tsx. It has already earned that twice — once on
the entrance pose, and once on /login's Sign in button, which the stand-in had
drawn disabled when the real page mounts it live, a colour pop at the swap.

The owner's second report, that the hoopoe lands in the wrong spot when the
question runs to more than one line, turned out to be older than any of this. The
flyer aims at the last perch the destination reported, and the destination watched
the hoopoe's own box — a fixed 112px square that never resizes. Every reflow that
matters moves the COLUMN instead: the trivia question arriving a beat after mount
and wrapping, a late font, an error line. Because the column is vertically
centred, a taller question lifts the box without changing its size at all, so the
observer never fired and the bird went on aiming at the rect the box had while the
question still read "...". Now the observer watches the column too. Measured on a
two-line question: the perch rose 14px, settled at 1538ms, and the flyer landed on
it at 3473ms with a delta of 0,0.

`npm run check` green, 76/76. `npm run visual` 23/23.

One thing the settled mount uncovered on /login: a faint blink in the email and
password bars as the bird flew in. The password row carried
`initial={{ opacity: 0 }}` from the days when the field did not render at all for
the admin address, a fade with nothing left to announce since the bypass was
removed. It was invisible only because the column used to fade in on top of it;
with the column mounting settled it blinked on its own for ~180ms, measured
dropping to 0 at the swap and easing back over eleven frames. Removed rather than
suppressed, because the row is unconditional now: it is the same shape as the
email row above it, `layout` for the reflow when an error line arrives and nothing
else. Re-measured: no opacity dip and no row movement in the 45 frames after the
swap, and a direct visit still plays the full entrance (0 to 1, x 48 to 0, settled
by 700ms). `auth-first-frame.test.mjs` fails if a mount fade returns to either row.

## Session 2026-08-26 (fifth) — phase 4 part 1: the same thing, written once

The fifth fix session of the 2026-08-25 refactor audit. Fifteen of phase 4's twenty-one rows,
in 25 commits. `npm run check` green before every one; `npm run visual` **23/23** (six runs);
`npm run verify:crawl` 17/17 (twice); `hoopoe-landing-check` all four arrivals passing.

**What a member could see.** Four things, all deliberate.

Eleven hovers that never actually animated now do. `transition-property` takes real CSS
property names, and `colors` is not one — it is a Tailwind shorthand that exists only as the
whole utility `transition-colors`, so `transition-[colors,transform]` emitted
`transition-property: colors, transform` and the colour half matched nothing. The transform
eased; the colour snapped; nothing anywhere reported it. Directory cards, message threads and
their image links, the composer's remove button, the landing CTA, the Collection's dialog and
filter row, the flag control and an onboarding skip were all doing this. Each now names the
properties its own hover changes, and the protocol audit refuses the broken form so it cannot
return. A thread row ramps through twelve border colours where it used to jump.

The loading feed shimmers warm instead of pulsing grey. `ui/skeleton.tsx` was stock shadcn —
`animate-pulse bg-muted`, the thing CLAUDE.md bans by name — with two importers left while the
other 201 skeletons in the app used the warm utility. The component is gone.

The answering screen's "not available" card takes the Catch-up home's geometry: 48px of
padding down to about 26, the measure from 768px to 672. It had missed the owner's own
2026-07-25 correction because it was a second copy of the card. And the answering console's
question labels take the collecting console's wording ("You (anonymous)" rather than "asked by
you"), because only one of the two vocabularies tells you whether the question you asked is
showing your name.

**The riskiest piece** was the hoopoe's flight. /login and /signup each carried the whole
arrival machinery — the session flag, the perch report with its DOMMatrix un-shift, the
ResizeObserver watch, the handoff reveal, the mobile fly-in — comment for comment identical,
and auth-panel.tsx held a third copy of the fly-in half. It is one hook now. The proof is
`hoopoe-landing-check`, which drives all four arrivals and measures them: final flyer position
0.00px from the destination rect, two overlap frames, no correction jump. The AuthPanel pages
were sampled frame by frame separately — 43 veiled frames with no flash, first visible frame
139px above the viewport, a 407px descent.

**Where the audit was wrong.** Six places, all recorded in the campaign's handover. catchups-12
was already done in full by an earlier phase. duplication-19 names four `useWideViewport` call
sites and only two are that hook — one moved into the flight machinery this session, and one is
a bare `.matches` read inside a click handler. feed-posts-06's "likely a fourth copy" is two
more, so all five hearts in the app now share one optimistic toggle rather than three of five.

**One row deliberately not done.** Both findings propose a shared pager for the feed, a
profile's Posts tab and the Collection. They are not variants of one thing: the Collection pages
by offset and carries a total, the other two page by cursor; two re-arm the skeleton on a filter
change and one deliberately does not; two carry the double-tap ref-guard and one does not. A
hook over them needs four options, which is what both findings say not to invent — and both
carry an explicit escape for exactly this. What was genuinely one rule, `appendUnseen`, is now
shared by all four lists and pinned.

**Five test pins went red**, each because it asserted a literal that a shared helper replaced.
Every one was rewritten to check the behaviour rather than the spelling, and — the part that
matters — **every one was then mutation-tested**. Three of the five would have gone on passing
against a helper that had quietly lost the guard the pin exists for. B-061 is now stricter than
it was: it also fails a Keeper action that reaches the freeze without asking for it.

**Filed, not fixed**: the /login password peek-a-boo does not cover the bird's eyes. Not at the
end of the intro, not on the reveal toggle. /signup's register step tucks the wings correctly
with the same two verbs, so the mascot is fine and /login is not. Proved not to be a regression
from this campaign by probing the same page at `e7efc97`, before any of these files were
touched: the identical wings-down bird. It is bug 20 in `docs/planning/bugs.md`, with a note
that no gate can see it — /login's hoopoe sits inside a masked volatile region, so a green
visual run says nothing about the bird.

**Two gotchas worth keeping.** Deleting a tracked file makes `npm run check` *crash* rather than
fail, in the protocol audit, until the deletion is staged: it reads `git ls-files`, not the
working tree. And `verify-shot.mjs` swallows a failed screenshot in a bare `try {} catch {}` and
still prints its output path, so it will report success on a file it never wrote.

## Session 2026-08-26 (fourth) — phase 3: one spelling for the things written many times

The fourth fix session of the 2026-08-25 refactor audit. All 14 phase-3 rows executed in 21
commits. `npm run check` green before every one; `npm run visual` **23/23** (four runs);
`npm run verify:crawl` 17/17 (three runs).

**What a member could see**: one thing, deliberately. Catch-ups had six date formatters in
three locale tags — en-US, en-IN, en-GB — for a community whose every timestamp is IST, so
the same published date read "Aug 5" on the index rail and "5 Aug 2026" on the archive shelf.
Five now share one pair of formatters. Four of the five swaps change no pixel (en-IN and
en-GB render both forms identically, checked before editing). The fifth does: the "Fresh off
the press" rail read "Aug 16" and now reads "16 Aug".

Two latent bugs closed with it. The feed card and the letters index built their excerpts with
a markdown stripper that lacked the image rule, so a letter opening with a photo would have
excerpted as "!banyan at dusk ..." — the audit said this was visible today and it is not, none
of the eight letters holds a markdown image, so it needed hand-typed markdown to reach. And
the contact editor validated `displayEmail` with a bare `z.email()` while the profile editor
used the shared `emailField()`: capitals saved un-lowercased, and a pasted address with a
leading or trailing space was **refused outright**, which is the half a member would hit.

**The largest piece** was the test suite. 39 files re-typed the same ROOT/read preamble,
`decomment` shipped in two spellings, seven `walk`s and three surrogate detectors were
hand-rolled. All of it is `src/lib/test-kit.mjs` now. The weak `decomment` turned out to be
worse than "the two can disagree": across 592 source files they disagree on seven, and every
disagreement is the weak variant cutting a live line in half — `validators.ts` losing its
https check, `next-path.ts` losing the `startsWith("//")` open-redirect guard. Nothing was
vacuous today only by luck of where the assertions sliced.

Sharing helpers created two new vacuity points and both were caught by mutation rather than
by reading: gutting the shared `walk` to return nothing left notification-links and
image-purge-rule **green**, because every assertion in them reads "no file does X". Both now
count what they swept first. Same shape for `hasLoneSurrogate` — six negative assertions
across three files and nothing proving the detector fires — so text-shape gained the positive
case. That is the standing cost of a shared kit and it is written into the handover.

**Also**: `knip` went from 131 unused files to 5, which is the difference between a report
nobody reads and one where every line is a question (all five are the landing showcase,
still the owner's call); the profile page stopped fetching the bcrypt hash on every view;
the write gate's Stage 2 is now built on Stage 1 rather than copying it, proved equivalent
over all 28 session×IS_DEMO combinations; and the token burn, written twice under two copies
of the same explanation, is one `claimToken`.

**Deferred with reasons, not skipped**: moving the rich-text renderer and phone kit out of
utils.ts belongs to phase 5, where the bundle number that justifies it gets measured; and
lib-tests-01's optional shared `section()` is not safe as a sweep, because half the twelve
extractors carry their own anti-vacuity assert.

## Session 2026-08-26 (later still) — phase 2: the switched-off things stop shipping

The third fix session of the 2026-08-25 refactor audit. All 8 phase-2 rows executed in 11
commits, plus two the owner decided at session start. `npm run check` green before every one;
`npm run visual` **23/23**, the eight content-drift failures sessions 1 and 2 both saw now
masked by another session's `900546f`; `npm run verify:crawl` 17/17.

**Owner's calls**: the landing showcase is decoupled now with ship-vs-retire still open; the
tour stays demo-only and is lazy-loaded rather than armed for members; the About page keeps
its joke; the logo's "Did you know" facts are deleted; /donate redirects.

**What changed that a member could see**: /donate now answers at the proxy, so an old link
resolves before the login wall instead of after it. The sidebar logo no longer holds a
hidden fact card (the rail is pixel-identical; the demo survives at /lab/eggs). A letter's
back link and share link go to Letters rather than to a retired group URL that only
redirected away. Four loading skeletons stopped causing the layout jump they exist to
prevent — /dark-mode was drawing a settings form that has not existed for some time. And the
demo's tour no longer stalls 2.5 seconds on its Catch-ups stop, which it had done since the
Catch-ups rebuild took the anchor with it.

**The largest piece** was the Groups residue: loadPosts' membership gate, five revalidatePath
calls forking on a dead path, deletePost's group-admin branch, and a GroupMember query that
ran on every single Saved open to build an OR whose group arm could never match. The prop
chain went with it, and it reached further than the audit had mapped — through the composer's
group scope and placeholder and post-card's type. What deliberately stayed: createPost's
refusal of a groupId, and decidePostVisibility's group branch, which is live defence for the
private container under every Catch-up, not residue.

**Twelve comments were lying**, including five files that each said "there is no cron on this
project" when there are two Vercel crons and three scheduled workflows. None of them drains
the mail queue, which is the true thing they now say.

**Still owed to the owner**: the public landing links to no Privacy, Terms or Guidelines —
they live in the footer, which is inside the showcase and therefore still off. The audit
called that the one thing to fix immediately regardless of the showcase's fate, but it is new
UI on the public page, so it waits for him.

## Session 2026-08-26 (later) — phase 1b: 6.5MB out of the tree, and two gates that were lying

The second fix session of the 2026-08-25 refactor audit. All 16 phase-1b rows executed in 18
commits. `npm run check` green before every one; `npm run visual` run three times and unchanged
throughout (the same 8 content-drift failures session 1 recorded — feed, directory, letters,
catchups at both viewports — caused by live posts and signups moving the pages, not by this work).

**Assets, ~6.5MB.** Both databases were queried before anything was deleted: no Photo, Post, Group
or CatchupEntry row anywhere points at the WhatsApp originals or at any local collection file
beyond the `demo-*` set. Moved to `sanan's stuff/moved out of the repo/` with a note explaining
each: the two WhatsApp originals (3.05MB, and being under `public/` they were served on the live
domain at a guessable address, full resolution, no access control), the 1.79MB overflow-stories
PDF/HTML, and the 381KB 4096px brand PNG. Deleted outright: v4–v6 and c5–c6 with thumbs, the 12
gen/ placeholder tiles, and the five support QR SVGs with their generator and two devDeps.

**Dependencies.** Out: supercluster, d3-scale and their @types, @types/bcryptjs,
@next/bundle-analyzer (webpack-only, so it has never produced a report on this Turbopack project —
`npm run analyze` now calls `next experimental-analyze`), tw-animate-css and xlsx. In: d3-selection
and @types/geojson, both imported by the map but resolving only as transitives. The prisma family
had drifted to three different versions in the lockfile and is now aligned on 7.10.0; next and
eslint-config-next are back in step at 16.3.3, whose new lint rule found the project's three
deliberate hard navigations (each keeps its behaviour and now says why).

**Where the audit was wrong** (rule 4 outcomes):
- **dependency-diet-02 (prisma → devDependencies) is re-refuted in part and was NOT done.**
  `@prisma/client` declares `prisma` as an optional peer, so npm keeps it in the `--omit=dev` graph
  wherever it is listed — measured before and after. The claimed ~121MB production-graph saving and
  the retirement of the audit-gate allowlist entry both fail to materialise; only deploy risk was
  left, so prisma stays in dependencies. shadcn (~22MB) and @types/d3-zoom do genuinely leave; pg
  and dotenv were still moved, because the app truly does not need top-level pg (the adapter carries
  its own) even though the graph does not shrink.
- **root-docs-assets-10's CLAUDE.md half is not done.** CLAUDE.md's spec list still omits `admin`.
  The file carries the owner's uncommitted edit, so staging it would have staged his work too.

**Two gates were reporting success on nothing.**
- `crawl.mjs` had two hardcoded profile cuids, both of users since deleted. A profile page for a
  missing user answers **200** with the app shell and no profile in it, so the crawl printed `OK 200`
  twice for two blank pages — the exact failure it exists to catch. Ids now come from the database
  and each row must show that person's name. Proved by feeding it a name that is not on the page.
- `drive.mjs`'s houses and places scenarios drove `/settings`, gone since the letterhead profile
  absorbed the editors (22b4b6c). Both now open the member's own profile, and the houses scenario
  asserts the panel is really on screen rather than only screenshotting whatever happened.

**The popover joined the menu material.** PopoverContent hand-restated the surface and animated with
tw-animate-css's slide/zoom family — the one exception to the "no slide-downs on one page and pops on
another" rule menu-material.ts exists to state. Verified through the harness: 344x352, opacity 1,
12px radius, 140ms — the material's own numbers.

**The roster stopped needing a dead library.** The owner confirmed no further spreadsheets are
coming, so the two office workbooks were flattened into one `roster.csv` (every column of all four
person-sheets, checked back cell by cell: 2,602 rows, 44,646 cells, zero differences) and `xlsx` —
frozen on npm since 2022 with two advisories fixable only from the vendor's CDN, invisible to both
Renovate and the `--omit=dev` audit gate — is gone. **The CSV reader exposed a real bug**: an empty
email fell through `if (email && ...)` as `""`, and the dedupe key is `email ?? name|year`, where
`""` is not nullish — so every person without an email collapsed onto one key and 2,134 people
became 1,333. The workbook reader never produced `""`, so it had never shown. Both readers now
produce byte-identical entries.

**Docs.** README was teaching three forbidden things — `prisma db push` twice, the deleted
admin-login bypass, and `NEXT_PUBLIC_ADMIN_EMAIL`, which reopens closed critical C1-c. Six dead doc
pointers repointed at git history, profile.md's REJECTED banner replaced with its dated resolution,
ROADMAP's three unannotated reversals annotated, and OPERATIONS finally documents snapshot.yml, the
one job whose missed night is permanently missing from every analytics chart. progress.md's June and
July moved to `docs/history/`, proved lossless by rebuilding the original from the three files.

**For the owner.** ~357MB of unused Puppeteer Chrome sits in `~/.cache/puppeteer` and is outside
the repo, so it is his to delete. The two roster workbooks in `moved out of the repo/roster
spreadsheets/` were never in git — that folder holds the only copies.

## Session 2026-08-26 — phase 1a of the refactor campaign: 2,052 lines that ran nothing

The first fix session of the 2026-08-25 refactor audit. All 16 phase-1a rows executed in 21
commits: 2,320 lines deleted, 268 added. `npm run check` green before each commit and at the
end; `verify:crawl` 200 on all 17 routes.

- **The biggest single win was a flag that had never once been flipped.** `bird-avatar.tsx`
  carried a 52-case mono-silhouette renderer behind `const USE_V2 = true`, set on 2026-06-29
  and never changed, so nothing below line 682 could execute. 734 lines to 118. It was not
  even a working fallback: the file's own comment admitted the legacy index mapping was
  "approximate for that dead path", because the case order never learned about the
  species-per-member migration or the Roller/Dove swap. 45 modules import `BirdAvatar`, so
  this rode into nearly every client chunk that shows a face.
- **Two dead server actions were also live POST endpoints.** `updateUserProfile` (the
  whole-form profile save, superseded when the owner asked the profile to save on blur) and
  `createCatchup` (the groups-era creation path). In Next an exported server action is
  invocable by action id whether or not any component references it, so a dead one is not
  just weight, it is surface. `setTheme` was a third, and de-exporting it is what forced the
  one test change below.
- **The analytics room was paying for numbers nobody renders.** `loadSupport` had no caller
  at all; eight further fields were fetched from Mumbai and dropped on the floor — a groupBy
  plus a follow-up findMany plus a label map on every ContentView open, a user groupBy per
  PeopleView, a ten-row findMany per ReachView. All four views re-opened and eyeballed
  afterwards; every tile still there.
- **The audit was wrong in six places, and the pre-flight caught all six.** `ContactKind` is
  genuinely imported (tsc refused the de-export). `Profession` was fully dead rather than
  internal, so it went entirely. `MAX_INPUT_PIXELS` was a re-export line, not a declaration.
  `TourStopId` and `CatchupRoundSection` were used in-file. `SORT_OPTIONS` was a cascade
  nobody had spotted. Every one of those is the rule-4 pre-flight earning its place: the
  report is evidence, not instruction.
- **One test had to be widened, and it is worth the owner's eye.**
  `gate-coverage.test.mjs` builds the set of "gated" actions from EXPORTED functions only,
  then lets a thin public wrapper inherit a gate from a gated sibling. Making `setTheme`
  private therefore orphaned `setThemePreference` — the check had not moved, only its
  visibility. The gated set now reads every async function in the file; the assertion still
  runs over exported ones alone, so it is strictly wider. Proved by injecting an ungated
  exported action and watching the sweep fail on it.
- **Two tests were rewritten rather than deleted.** `normalize.test.mjs` sliced `social.ts`
  using `indexOf("export function socialIcon")` as an *end* boundary; deleting that function
  would have made indexOf return -1 and the slice silently swallow the rest of the file while
  still passing. Both boundaries now sit on surviving declarations.
  `house-spans.test.mjs` was 100% pins on a dead function, so instead of dropping the file
  below the suite's floor it now pins what ships, including a regression test for audit
  Low 99 (a skipped year must open a new house span, not claim a year nobody recorded).
- **`npm run visual` is red on four routes and it is not this work.** Same 8 failures before
  and after every change: feed, directory, letters, catchups at both viewports, all from live
  database drift (a new post at the top, new signups) shifting everything below. The other 15
  pass, `/birds` included. Not rebaselined — that would misattribute real rows to this commit
  and go stale on the next post. It is a suite-design question for the owner.
- **Found in passing, not fixed:** `crawl.mjs`'s hardcoded `OWN`/`OTHER` profile ids no
  longer exist, and the crawler prints `OK 200` for a page that renders the 404 — those two
  rows have been proving nothing. Filed for the scripts territory.


## Session 2026-08-25 — "Still locked out: 1" was a ghost, and the panel could not tell

The owner opened `/admin/analytics` -> Joining and read a red **Still locked out: 1** over a panel
that says "worth emailing them directly", plus a bar in "Why sign-ins fail" labelled with the raw
slug `blocked`. One commit on `main`, not pushed. `npm run check` green (70 tests).

- **Nobody was locked out, and no account has ever been blocked.** `SELECT ... WHERE "isBlocked" =
  true` returns zero rows. The address was `phase2-probe-1787166205085@example.invalid`, a throwaway
  the Phase 2 security probe created on 19 Aug, blocked on purpose to prove audit H4 held, and then
  deleted. `.invalid` is the RFC 2606 reserved domain, so it was never a person.
- **The bug is that a deleted account keeps counting as somebody locked out.** `loadJourney`'s
  locked-out query read `LoginAttempt` alone, with no join to `User`, and `purgeUserAccount` clears
  neither this table nor the `userId` on it. So this was never only about probes: any member who
  self-deletes after a run of failed sign-ins would have appeared under the same instruction to email
  them. It now `LEFT JOIN`s `User` and drops any address whose attempts point at an account that has
  vanished. A `userId` of NULL is deliberately kept — that is the ordinary "no account with that
  address" failure, which is exactly the person the panel is for.
- **Both conditions are aggregates, and the test says why.** A row-level `WHERE` would drop the
  purged account's SUCCESSFUL attempt and leave its failures, flipping the address *into* the list —
  the opposite of the fix. `src/lib/login-attempt-rule.test.mjs` pins the join, pins that the guard
  stays inside the `HAVING`, and fails if `purgeUserAccount` ever starts touching `LoginAttempt`, at
  which point the comment needs re-reading rather than the guard deleting. All four assertions were
  mutation-tested: each fix reverted individually, each caught by its own test.
- **The raw slug was a label map that half-covered its vocabulary.** `REASON` named four of the seven
  reasons `LoginReason` can write; `blocked`, `rate-limited` and `bot-check` fell through to the slug.
  Keyed on `LoginReason` now, so the gap cannot reopen — an unlabelled reason is a tsc error rather
  than something the owner reads as a member in trouble. A gap that looks like data is worse than no
  label at all.
- **Nine synthetic rows removed, five addresses, all on `@example.invalid`**
  (`prisma/migrations-manual/2026-08-25-purge-synthetic-login-attempts.sql`, guarded to refuse if any
  account exists on that domain, re-run clean). This is housekeeping, not the fix — the join alone
  already takes the tile to zero, verified against the live database before deleting anything. It
  takes the probe noise out of the three totals the join does not touch. Retention would not have:
  `LoginAttempt` is kept 365 days, so these were due to clear in August 2027. Not applied to the demo
  database, on purpose: data-only file, and that `LoginAttempt` table is empty.
- **Verified at both viewports.** The tile reads a green 0, the panel reads "Nobody is locked out",
  and the reason breakdown is 31 / 5 / 1 with no slug. `npm run visual` not run: the change is
  admin-only, `/admin/analytics` is not in `ROUTES`, and another session has `e2e/visual.spec.ts`
  open mid-investigation.

## Session 2026-08-24 — Safari could not load localhost, and the cache kept it broken

The owner's Safari had been unusable on `localhost:3000` for days while Brave was fine: first an
unstyled page, then "Safari can't open the page ... the server unexpectedly dropped the connection"
on every load until a hard reload. Three commits on `main`, not pushed. `npm run check` green (54
tests). `npm run visual` 18/23 — all five reds read and confirmed as database drift (new members
moved the directory count and the map clusters, a catch-up named "test" was archived); layout and
type pixel-identical, no baselines rewritten.

- **The cause was ours and dated exactly: `b64e44a`, 20 Aug 13:58.** It added
  `Strict-Transport-Security` and the CSP's `upgrade-insecure-requests` to every response, dev
  included. WebKit obeys `upgrade-insecure-requests` on `localhost`, Chromium exempts it, so Safari
  fetched every stylesheet and script over an https the dev server does not speak. Both headers are
  gated on `isProd` now. Full mechanism in `TRAPS.md`.
- **The fix landing did not end the symptom, and that was the real lesson.** Safari served the
  broken era from its own cache through hard reloads, dev-server restarts and a verified-correct
  server — `curl` proved the headers were gone while the browser kept failing. It ended when the
  owner cleared Safari > Settings > Privacy > Manage Website Data > localhost.
- **Two suspects killed with evidence rather than guesses.** No service worker (the owner's own
  Manage Website Data listing names its categories and there is none). No HSTS pin: WebKit ignores
  an HSTS header over plain http, tested against a throwaway server and a second port on the same
  hostname, so clearing history would have done nothing.
- **A WebKit build, installed and then removed (297MB, over the 200MB line I should have asked at).**
  A clean WebKit loading the site
  perfectly — first load, reload, after a 30s idle — is what cleared the code and moved the search
  into Safari's stored state. chrome-devtools MCP cannot do this; the bug class is WebKit-vs-Chromium.
- **A second, smaller fix rode along, and it was not the cause.** `next dev` drops an idle keep-alive
  connection after six seconds (measured) and Safari, unlike Chromium, does not retry into a fresh
  socket. Dev responses now send `Connection: close`. Verified it leaves hot reload alone by watching
  `turbopack-connected` / `built` / `serverComponentChanges` still arrive over the HMR socket.
- **Left alone deliberately:** `127.0.0.1:3000` renders but refuses the HMR socket, because Next's
  dev server treats a different hostname as a different origin. One line (`allowedDevOrigins`) if it
  is ever wanted; nobody needs that address while `localhost` works.

## Session 2026-08-22 — The Turnstile checkbox: why it shows, and the second tick

The owner reported the bot check appearing in incognito, on his sister's Safari desktop in the UK,
and in a plain Samsung Chrome tab — and that she had to tick it **twice**. One commit on `main`, not
pushed. `npm run check` green (54 tests), `npm run visual` 23/23 with no baseline rewrites.

- **Why it shows is not a bug, and not something the code can fix.** The widget MODE lives in the
  Cloudflare dashboard and is set to **Managed**, whose documented job is to escalate to a checkbox
  by visitor risk. Our `appearance: "interaction-only"` was already correct and is why most members
  see nothing. Incognito, Safari (ITP, and Private Relay's shared IP) and a fresh mobile profile all
  read as an unrecognised visitor. Invisible mode would end it, and was recommended against and
  declined: it has no interactive fallback, so an alum Cloudflare cannot clear gets refused with no
  way to prove themselves — the M07 loop again. Pre-Clearance needs the hostname proxied through
  Cloudflare; `rishivalley.space` answers `server: Vercel`, so it is not available.
- **The second tick WAS ours.** `getToken()` re-armed the widget as it handed the token over, to
  brew the next one early. Reproduced with Cloudflare's forced-challenge test key and measured: the
  token was gone **33ms** after the click, while the button read "Signing in..." for another 2.5s.
  So the tick wiped itself in front of them. Re-arming now belongs to the three forms and fires only
  once an attempt has failed. Verified: the token now survives to 1500ms and clears at 3000ms beside
  the refusal — and that refusal is "Invalid email or password", the positive control proving the
  handed-out token still passes siteverify.
- **It fits the form now.** `size: "flexible"` replaced the fixed 300px box that sat short of the
  400px fields, and a `clip-path` rounds it to the fields' 12px. Measured flush at 400px desktop and
  338px at 390. Nothing inside the challenge can be styled — it is a cross-origin iframe, so the
  white fill, the type and the logo are Cloudflare's and stay Cloudflare's.
- **The visual suite earned its keep.** The obvious `overflow-hidden rounded-*` made the 0px-tall
  holder a block formatting context, which stopped margins collapsing through it; the login form's
  `space-y-3` paid 12px twice and every row slid 6px. Caught by `npm run visual` on the page nobody
  was looking at. `clip-path` paints the same corners and does not touch layout. In `TRAPS.md` now.
- **`TURNSTILE_DEV_CHALLENGE=1`** pins the always-challenge test key locally. Dev otherwise pins the
  invisible always-pass key, so nobody here had ever watched a member tick the box, which is exactly
  how the re-arm bug shipped. Off by default; every unattended flow needs the widget passing alone.
- **Known limit, left deliberately:** below a 352px viewport the column is narrower than Cloudflare's
  300px floor and the widget's right edge clips. No phone in use is that narrow (smallest current
  iPhone is 375). Still better than the old fixed box, which overflowed the page outright.

## Session 2026-08-21 — The pre-release fix session, part two

Picked up the "Still open" list from part one. **Fifteen of the sixteen remaining canonical findings
are closed**; the sixteenth (B-063, the Catch-up leave/archive/delete feature) is designed, has the
owner's two decisions recorded, and is not built. Eight commits on `main`, none pushed.
`npm run check` green (46 unit tests, up from 38), `npm run visual` 23/23.

- **Pausing a Catch-up now actually pauses it.** Pause and End wrote only the Catch-up's own status,
  so the live Round kept advancing, kept sending every non-answerer a daily reminder for the whole
  week, and published itself, all while the home page said "This Catch-up is paused" with no way to
  answer and the header counted down above that banner. The semantics chosen is FREEZE (the spec's
  paused state is a calm banner plus Resume, which only makes sense if the clock stops with it);
  resume shifts every unreached deadline forward by exactly the paused duration, so the group gets
  back the window it had. New nullable `Catchup.pausedAt`. The reviewer caught that stopping the
  clock covered only half of it: five Keeper controls and both member submissions write the Round
  directly and checked only the ROUND's status, which does not change on a pause, so a stale tab
  could still publish a paused Catch-up and announce it to everyone. All seven share `refuseIfFrozen`
  now.
- **A Round nobody asks a question in goes quiet** instead of opening for answers, nudging everyone
  daily to answer nothing, publishing an empty keepsake and starting again next cadence, forever. It
  extends the question window once, then goes dormant; the first question revives it.
- **A Round that published while paused no longer leaves the Catch-up dead** with no future Round and
  no control anywhere to start one.
- **Every date on the site is the valley's day.** The helpers named no time zone, so they used the
  server's (UTC) or the reader's, and a letter written at 00:30 showed yesterday to everyone,
  permanently. Sixteen surfaces, one convention (`VALLEY_TIME_ZONE` and friends in `utils.ts`), plus
  a test that sweeps the whole app and fails on any date rendered without a zone. The year ceilings
  on sign-up were frozen the first time their module loaded, so a server started in December kept
  rejecting January.
- **A double-tap no longer breaks a like.** All five toggles are delete-first and idempotent; the
  client holds one tap in flight. Proved live in a rolled-back transaction that the racing insert is
  rejected by the unique index, which is the exact error the action now answers.
- **Notifications land somewhere.** A comment on a letter took you to the feed, where letters'
  comments are not shown. Four admin notifications pointed at a route retired months ago. Tapping a
  notification whose row had been pruned did nothing at all.
- **A dropped connection no longer freezes the page.** Nothing handled a request that fails to
  arrive at all: the feed sat on grey placeholders forever, and forty-odd controls disabled
  themselves for the rest of the visit with no message. One `callAction` helper, 77 await-sites, 46
  stuck-button cases. Fanned out to a subagent; the whole diff was read here.
- **The bell badge tells the truth**, having been computed once per hard page load and able only to
  count down since.
- **You can take your email off your profile.** The X on that row used to write "no chosen address",
  which the profile read as "fall back", and it published your private sign-in address instead.
- Plus: the post edit cap, place validation on both writers, the admin inbox's unreachable archive,
  the unread-flag lost update, deterministic pagination in the Collection and the feed, and the
  deletion of the dead `/onboarding` route.

**Two net-new findings**, neither in the audit: `createPost` still accepted a `groupId` for the
removed Groups feature and made posts visible on no page in the app (refused now); and a non-async
export in a `"use server"` file 500s every importing route at RUNTIME while `tsc` passes it clean.

## Session 2026-08-21 — The pre-release fix session, part one

The formal bug audit finished this morning with 45 canonical findings; this session fixed the two
Criticals, every launch-blocking High and the whole scale phase. Fourteen commits on `main`, none
pushed. `npm run check` green throughout (38 unit tests, up from 26), `npm run visual` 23/23 twice.
(The ledger and the session briefs were working papers and were removed once the review closed on
2026-08-21; the durable part lives in `docs/TRAPS.md` and in bugs.md's "Settled" section.)

- **Deleting an account used to destroy other people's writing.** `Group.creatorId` and
  `CatchupPrompt.authorId` were both `ON DELETE CASCADE` on a column that only records who happened
  to START something communal. Proved against the real database in a rolled-back transaction:
  deleting the owner's account would have taken all 12 groups, both Catch-ups, both Editions and all
  133 answers. Both columns are nullable `SetNull` now, the purge hands a group with no admin left
  to its longest-standing member, and the merge inherits ownership rather than nulling it. Pinned by
  a test that walks the whole Cascade graph out of `User` rather than checking the two columns the
  audit named.
- **A thirty-second Resend brownout permanently failed every queued email.** A requeued row kept its
  `createdAt`, so it stayed the oldest eligible row and the same drain pass took it again: four
  attempts in four seconds, then terminally failed, which nothing retries. Every failure books a
  later retry now, and a failure the provider caused is told apart from one the address caused. In
  the same pass: `deletion-scheduled` mail could never be selected at all (the eligible list is
  derived from `PRIORITY` now), a bounce webhook handed back budget Resend had already spent, and
  overlapping drains fan out past the provider's rate limit — one pass at a time via a lease row,
  claim/block/release proved live.
- **The connection pool was unbounded and infinitely patient.** `max 5`, a 5s checkout timeout and a
  20s query timeout. `statement_timeout` is deliberately absent: probed live against both poolers,
  Supavisor silently drops pg's startup parameter, so the audit's own fix direction would have
  shipped config that reads like a guard and is not one.
- **Email capitalisation** was canonical in three different ways across signup, login and reset. One
  helper now; the one live member with a capital in her address (who could never have received a
  password reset) is backfilled; a unique index on `lower(email)` means a future path that forgets
  gets a clean refusal instead of a second account for one mailbox.
- **The admin panel could be locked shut from inside it** and eleven of its twelve pages were bare
  Prisma reads relying on a layout gate that soft navigation skips. Both closed, the last-admin count
  moved inside a serializable transaction, and the three self-destructive controls are no longer
  rendered on your own row.
- **The first thing a new member does was broken.** A normal phone photo is 5-12MB and Vercel refuses
  a body over ~4.5MB before the function runs, so onboarding's avatar step failed with a stuck
  spinner and no message. Four upload boundaries go through one `shrinkForUpload` now.
- **The feed, the composer, the letters desk and the rail** stopped losing or leaking what members
  wrote: the card updates on delete and edit, autosave says "not saving" instead of lying and keeps
  a copy on the device, Post is gated on in-flight uploads, the rail stops teasing city-scoped
  letters to everybody, a draft's audience survives being reopened, and removing a contact row saves
  the list without it.
- **Payments that land while the phone kills the tab** now reach the supporter: the webhook writes
  them a notification carrying the bird-picker link, and only when it was the one that recorded the
  payment.
- **Indexes.** Ten child-side foreign keys plus a trigram index on the gazetteer. The city
  type-ahead went from **368ms and 4,690 buffers to 7.4ms and 54**, measured with EXPLAIN (ANALYZE)
  before and after. The directory stopped serialising every member into the map on every filter
  change. Presence telemetry gained a 180-day expiry (it had none), and the admin heatmap's
  busiest-hour line stopped being eleven hours out.
- **A batch can no longer be split into two groups** by two people registering in the same second.

## Session 2026-08-21 — The house chain goes back to arrows
Owner: "the house chain was arrows before. recently we made it lines. revert it back to arrows as
it was before."

- **`houses-chain.tsx` restored to its state before commit 5aa5549** (2026-08-19,
  "replace house-chain arrows with colour-handoff lines"): the SVG arrow glyph with its head, the
  6px gap each side, the 4px `TURN_LEAD` that keeps a turn off the pills, and the arrowheads on
  the serpentine turns. Nothing else in that commit was touched.
- **The `/lab/chain-lines` room stays**, since the six line treatments are worth keeping as a
  record; its registry note no longer claims Thread shipped. The component docblock says plainly
  that lines were tried for two days and reversed, so no future session re-ships them by accident.
- Verified: `npm run check` green (26/26), `npm run visual` 23/23 against the committed baselines,
  and the real chain screenshotted at 1440x900 and 390x844 — nine houses, arrows in both rows,
  the turn arrow pointing down into the next row on both viewports.

## Session 2026-08-19 — The admin panel, rebuilt as nine sections
Owner's ask: "completely redo admin... it follows no design principles, no UI, no UX, it's just a
mess." Three specific complaints: no navigation other than scrolling, the bird/name/subtitle row
done "in a billion different ways", and "so much grey text". Spec written and approved first at
`docs/spec/admin.md`.

- **Measured before touching anything.** At 1440x900 the panel was 2901px tall (3.2 screens), 70%
  of that a 49-row users table; 203 interactive elements; 128 of 242 text nodes (53%) grey; 23
  elements below the type scale's smallest documented step, 18 of them also grey; ~15 database
  round trips per load including THREE separate scans of the User table; and a `min-w-[640px]`
  table inside a 460px scroller, so on a phone block and delete were off-screen behind a
  horizontal scroll with no affordance.
- **Nine sections in three groups, behind a swapped sidebar.** Entering `/admin` replaces the
  main rail's nav with the admin sections. Same `NavRow`, same marker group, so the cinnamon edge
  GLIDES out of the account section and up into the list. A second rail beside the first was
  offered and rejected as janky by the owner, correctly: two vertical navs and 180px of a 1192px
  column. Eleven routes, each loading only its own data.
- **People replaces three sections** that all described the same 51 members (Users, Verification,
  and Email & verification, whose fourth filter was literally labelled "Everyone" and listed all
  of them two inches above a section that listed all of them). Uses the shared filter kit rather
  than the bare pill row that reinvented it. Three-up from `xl` at the owner's ask: 51 people in
  1640px, where the old table needed 2032px for 49 with no avatars at all.
- **One person row, and it refuses a `meta` prop.** `IdentityRow` is shared GEOMETRY, not shared
  content, which is why adopting it never made two screens agree: every caller passes its own
  subtitle. `AdminPersonRow` has nowhere to put a different one. Fixes the last `formatBatch`
  call in the app (`user-management.tsx:86`), which rendered blank for every teacher and was
  flagged in round 3 as "an admin surface the owner did not name".
- **Twelve capabilities the code supported and the panel could not reach**: contributions ledger
  (with the livemode split, so a dev's test click cannot inch the real total), a content desk over
  posts/letters/comments/photos, admin notes (stored AND fetched on every load, then dropped),
  `photoTrusted` and role (columns with no UI anywhere in the app), editing a member's
  name/batch/cities/bird instead of hand-writing SQL, account merging, a blocked list, report
  history, per-message mail failures with the stored `lastError` and a retry, Catch-up rounds past
  their date, and a stubbed Analytics room.
- **Two owner notes pulled against each other and the later one won.** 2026-08-04 asked for more
  density; 2026-08-19 asked for "no overcrowded elements, everything well spaced". The answer was
  not tighter rows but FEWER THINGS PER ROW: at most one chip and one button, and a chip only for
  something a human must act on. "Email not confirmed" was showing on seven of eighteen rows for
  a state this codebase's own taxonomy calls "not a problem"; it is gone. "Unverified" is gone
  because the Verify button beside it already said so.
- **One click target per row.** The first cut had the card going to the admin record and the name,
  on top of it, going to the public profile, which needed a stretched overlay, a pointer-events
  dance and a breakpoint. It is now one plain link, and where a Verify button exists the link
  stops short of it so the hover tint ends exactly where the link does.
- **After**: no admin screen over 1.8 screens, grey down to 34% on the densest one, ZERO elements
  below the type scale, no horizontal scroll at 390px, every destructive action reachable on a
  phone.
- **Gotcha 3, again, and the owner caught it before I did.** `people-list.tsx` (client) imported
  the facet OPTIONS from a module that also imported `prisma`, which dragged `pg` and its
  `require("dns")` into the browser bundle. `tsc` was perfectly happy. Same bug `admin-threads.ts`
  hit and documented earlier; the fix is the same split, now applied three times and commented in
  each. Types and constants in `admin-*.ts`, database in `admin-*-query.ts`.
- **Also**: `docs/spec/person-row-audit.md` written (four components, ten subtitle formulas across
  the app, plus two live bugs found on the way: the mention dropdown hand-writes the batch line so
  teachers read wrong, and `IdentityRow`'s default meta style is 10.5px, below the scale). The app
  outside `/admin` was deliberately not touched. The tour trigger stays on Overview and its test
  followed the guard into the layout rather than being deleted.
- Commits: `f31a448` spec, `ae7d9c4` the rebuild, `41d5011` the spacing and clarity pass,
  `cba56e0` simplify. Not pushed.

## Session 2026-08-19 — The hoopoe gets a public playground at `/hoopoe`
Owner's ask: lift the lab's hoopoe room out to `/hoopoe`, keep the lab version untouched, and on
the public one keep only the first tile and the password/gaze demo, expanded into something easy
to play with and worth sending to people.
- **New public route** `src/app/hoopoe/page.tsx` + `src/components/mascot/hoopoe-playground.tsx`.
  `/lab/hoopoe` is unchanged: proportion sliders, tail compare, matrix and sequence builder all
  still live there. The public page carries no readouts, no code output and no API names.
- **The playground is the tile, expanded**: a scene that scales its bird off a ResizeObserver
  (150-280px), tap-anywhere-to-fly, gaze that follows the
  pointer and hands back to the ambient wander on leave, a day/dusk sky mixed from `--sky` /
  `--canopy` / `--cinnamon` (dusk is how you actually see `sleep()` land), and 36 verbs on a
  labelled rail in plain English. "Surprise me" plays one of six named four-beat routines; the
  name shows in the caption while it runs.
- **Three geometry fixes found by measuring, not by eye**: the horizon was 24px below the bird's
  feet (it is now derived from the rig's 152/120 box), an unclamped fly-to cropped the crest on
  any click in the top 45% of the sky (targets are clamped into the frame, and the marker shows
  the clamped point), and `rest()` restores the POSE but never the POSITION, so a bird flown into
  a corner could not come home. "Settle down" now flies it back to the rig anchor
  ((101+10)/152 down its own box) before settling. The rig is found by `PARTS.root` and walked up
  to its `<svg>`, not by asking the scene for its first `<svg>`, which any icon would satisfy.
- **Sticky scene** on both viewports so the toy never scrolls off while you use the rail; it
  needed `bg-card` or the chips read straight through the caption text.
- Public in `src/proxy.ts` (reads nothing, writes nothing) and in `PRODUCT_ROUTES` in
  `scripts/qa/lab-audit.mjs`. Verified at 1440x900 and 390x844 with fly, settle, surprise, dusk,
  sleep and the password toggle driven live. `npm run check` green. Not pushed.
- **Owner round 1** (same session): the intro paragraph and the butterfly prop are gone, the
  caption is just "Tap to see it fly.", and the show/hide password icons were inverted against
  the house convention (`src/components/auth/password-field.tsx:75`: shown = Eye, hidden = EyeOff).

## Session 2026-08-14 (round 3) — No rings on boxes; the whole auth family swept; mobile keeps its keyboard
Owner notes on round 2, shipped in `7a505a7` / `094a540`:
- **The leaf focus ring is OFF every calm-form box** (owner: "I don't want the green outline
  on boxes. it still shows on phone"): inputs match :focus-visible even on tap, so the ring
  flashed green on every touch. The caret + floating label are the field's focus state now.
  Buttons and links KEEP their rings (keyboard travel); the round-2 outline-solid fix still
  matters there. FloatField, trivia box and the phone shell all cleaned.
- **Autofocus is desktop-only**: useDeferredAutofocus gates on `(hover:hover) and
  (pointer:fine)`, so phones never get the keyboard summoned on arrival (owner: "the keyboard
  takes up half a page"). Covers login, signup, trivia, forgot (its raw autoFocus converted to
  the hook), reset. Composer/menus/lab autofocts untouched (post-tap, wanted).
- **Batch InfoTip stacking fixed** (owner: "the i to explain batches goes behind the UI"):
  every form row is a transformed motion.div = its own stacking context, so later rows painted
  over the bubble regardless of z-index. The years row now carries `relative z-10`; verified
  via elementFromPoint at the bubble's center.
- **Forgot + reset password swept into the calm form** (owner: "do a thorough job like the
  forgot password page... look through and make sure"): PasswordField rebuilt on FloatField
  (8-char rule as focus hint, not a grey line), reset's two fields ride it (reset KEEPS its
  confirm field - choosing an unseen new password is where confirm earns its place),
  forgot's email is a FloatField and its ask-subtitle died, AuthPanel widened 360->400,
  AuthHeading paragraph optional (kept where it informs: sent-to address, dead-link reasons,
  reset account). verify-email checked: no inputs, no work needed. Onboarding (/welcome) is a
  different surface, not swept - flag if wanted.
- All verified live at 1440x900 + 390x844 (rings gone while focused, tip above rows, zero
  autofocus under touch emulation, dead-link state, forgot both viewports). `npm run check`
  green. Not pushed.

## Session 2026-08-14 (round 2) — Login joins the calm form; toggle animates both ways; mist
Owner follow-ups on the signup redesign, shipped in `e555fde` / `4c931a2` / `12a1bac`:
- **The expand snap is fixed.** auto-animate FLIPs siblings on row REMOVAL but drops them
  straight to place on INSERTION (frame-sampled: shrink eased ~250ms, expand jumped 68px in one
  frame). Replaced with Motion layout rows + `AnimatePresence mode="popLayout"` for the years
  row and error line: both directions now interpolate identically (28 frames each way, snappy
  spring), segmented control still moves 0px. Same choreography on login's admin-hide and error.
- **Trivia step re-centred** (owner: "spaced weird, not in the middle"): anchoring is per step
  now - trivia `my-auto`, register `mt-[8vh]` - with `layout="position"` gliding the column
  between anchors at the swap (bird eases 279->118 over ~23 frames, no teleport). Trivia's
  "Answer this to prove you're one of us." deleted; question sits mt-5 under the title.
- **Paper -> mist everywhere in the calm forms** (owner: "not liking the white typing box"):
  `FIELD_SHELL`, segmented track, autofill inset shadows. Mist is +2.6 dL* on the page (auditor
  corrected my +3.5 claim), the well-you-type-into rung, no white-slab glare. DESIGN-SYSTEM.md
  §3 updated.
- **/login rebuilt on FloatField** (`4c931a2`): no subtitle, two mist wells, 400px column
  matching signup, "Forgot it?" right-aligned under the password box, lg canopy CTA, popLayout
  rows. Flight/perch/admin machinery untouched; admin bypass, wrong-password error and
  forgot-password email carry all re-verified live.
- **App-wide a11y catch** (`12a1bac`): keyboard focus rings on every `Button` and `Input` were
  INVISIBLE - Tailwind v4's `outline-none` zeroes `--tw-outline-style` and
  `focus-visible:outline-2` only restores width, so rings resolved 2px leaf with style:none.
  Screenshot-qa caught it probing computed styles; fixed with `focus-visible:outline-solid` on
  both primitives + FloatField + trivia input. NOTE for a future sweep: any other element
  pairing `outline-none` with `focus-visible:outline-*` outside these primitives has the same
  dead ring.
- QA: 2 screenshot-qa (login desktop/mobile) + design-protocol-auditor, all findings applied
  (dL* figure, stale paper comments, line-height slack on Forgot-it). `npm run check` green.
- Still parked for owner calls: SegmentedPills 32px tap target, 20px Back link, login/signup
  CTA at 44px vs 56px fields.

## Session 2026-08-14 — Signup goes calm (Revolut reference) + landing frost timing
Owner asked for the join page to stop feeling crowded and daunting, retitled to "A bit about
yourself", subtitle gone, and sent the Revolut "bank account details" reel as the target: soft
filled boxes, label inside, nothing else. Shipped in `886fbab`:
- **`FloatField`** (`src/components/common/float-field.tsx`): 56px paper-filled borderless field,
  12px radius, label floats up on focus/fill/autofill via transform-only translate+scale (0.72 =
  11.5px rendered; base stays 16px so iOS never zooms). Placeholder hints exist but appear only
  while focused ("2014", "8+ characters"). Recorded in DESIGN-SYSTEM.md §3 as the second
  sanctioned input material for calm forms; bordered `Input` stays the default elsewhere.
- **Register step rework** (`signup-form.tsx`): role segmented control first, full width, no
  "I am a..." label; alumni years (Joined/Left/Batch, 3-up, InfoTip inside the batch box) appear
  directly below it; Confirm Password deleted (eye toggle covers it; server never read it);
  phone is one composite box, "+91" fades in on wake, "Optional" hint inside, helper line gone;
  auto-animate slides the conditional rows. Every permanent grey helper paragraph is gone.
- **The toggle jump is dead structurally**: the entrance column is `mt-[8vh] mb-auto` instead of
  `my-auto` (page.tsx), so the alumnus/teacher flip changes height only BELOW the control
  (measured 0px movement; before: 151px scroll-clamp leap on mobile). Whole form now fits both
  1440x900 and 390x844 with zero scroll (was 995px tall). Bird + title are pixel-identical
  across the trivia->register swap now, so the step change no longer re-centers anything.
- **Trivia step harmonized**: same paper 56px answer box (plain input on `FIELD_SHELL`, not an
  `Input` override), `size="lg"` Check to match Join, 16px pre-CTA gap on both steps.
- QA: 2 screenshot-qa agents + design-protocol-auditor. Auditor's real catch: I had duplicated
  and orphaned `YearInput`; it now renders through FloatField so signup consumes it again.
  Flagged for a future owner call: SegmentedPills' 32px tap target (app-wide control, iOS wants
  44), the 20px-tall Back link (shared with /login), and /login still on bordered inputs while
  its sibling signup went paper (deliberate scope, worth harmonizing later).
- **Landing frost fix** (`071323d`): the hero Sign in pill's backdrop blur popped in a beat
  after load, because an ancestor fading below opacity 1 forms a backdrop root and the pill
  couldn't sample the photo mid-entrance. Middle block now animates transform only; the fade
  lives on the headline wrapper and each CTA (`MotionLink`) individually with identical
  timings. Frame-sampled 241 frames: blur(8px) active on every frame including the first,
  middle never dips below 1; sign-in exit choreography re-verified intact.
- Before/after shots in `docs/planning/shots/signup-{before,after}-*.png` (untracked).

## Earlier months

June and July 2026 are archived, unedited, in `docs/history/`:
`progress-2026-06.md` (the visual overhaul, bird avatars, the hoopoe rebuild) and
`progress-2026-07.md` (the letterhead profile, one spine, direct uploads, /lab).
A month moves there once it is closed, in the same commit as an ordinary session entry.

## 2026-08-11 - Forgot password, email confirmation, and a send queue

- **Forgot password**, end to end. `/forgot-password` takes an address and answers identically
  whether or not it matches an account (a version that said "no such account" turns the form into a
  membership checker for a private community); the "check your inbox" screen masks the address the
  VISITOR TYPED rather than one from the server, so it can help with a typo without leaking anything.
  `/reset-password` judges the link server-side before painting, so a dead link never shows a form
  that fails after you have chosen a password. Dead links split by cause - expired, used, stale,
  unrecognised - because the four need different next steps. On success the person is signed in with
  the password they just chose rather than sent to a login screen to retype it.
- **Email confirmation**, on the owner's "middle" call: read everything freely, confirm to write.
  Gated server-side at posts, letters, publishing a draft, edits, comments, all three upload routes,
  Collection contributions, Catch-up creation/prompts/entries/member-adds, and other members'
  contact details. Presign matters most: what it returns writes straight into the bucket with no
  further pass through our code. Contacts are decided BEFORE the list is built, not by hiding the
  button, because everything on a profile is serialized to the browser. Likes, bookmarks, drafts and
  reports stay open.
- **The 100-a-day problem.** Resend's free plan sends 100 messages a day and launch is expected to
  exceed that in signups alone, so nothing sends inline: every message is an `OutboundEmail` row and
  a drain pass sends what the day's budget allows. Three things this had to get right. Resets sort
  first AND hold a reserved 20 of the 95, so nobody locked out is stuck behind a hundred welcome
  emails. Tokens are minted BY THE DRAIN at the moment of sending, so a confirmation that waited two
  days still arrives with its full day of life. And the app never says "check your inbox" for a
  message still queued - `verificationMailState` distinguishes sent from queued and the banner,
  dialog and verify page all say different things for the two.
- **Security**: reset tokens stored as a SHA-256 hash and never in the clear, single-use, claimed by
  a conditional update so two clicks cannot both win. `sendVerificationEmail` deliberately lives in
  `lib/` rather than the `"use server"` file: exported from there it would be an unauthenticated
  "mail anyone from hello@rishivalley.space" relay.
- **Admin**: `Email & verification` puts the two different meanings of "verified" side by side
  (did the address answer / is this really an RV person), over the three queue numbers - sent today
  out of 95, waiting, gave up.
- **Three bugs found by running it, not by reading it.** `prisma.ts`'s dev singleton key was not
  bumped with the schema, so a live dev server held a client with no `authToken` delegate and every
  read 500'd while `tsc` stayed clean (gotcha 3, again). A reset only drained when somebody happened
  to be browsing. And `.env` carries the production `RESEND_API_KEY`, so an end-to-end test sent two
  live messages to a `.invalid` address: `sendMail` now refuses reserved TLDs outright and
  development does not mail real people without `EMAIL_DEV_SEND=1`.
- Migration `2026-08-11-auth-tokens.sql` applied (AuthToken, OutboundEmail); the 37 existing members
  were grandfathered as confirmed rather than locked out of posting by a feature added after them.
- Owner action: set `APP_URL=https://rishivalley.space` on Vercel. Emailed links are deliberately
  NOT built from `AUTH_URL`/`NEXTAUTH_URL`, which bugs.md #15 suspects still points at the old
  vercel.app host.

## 2026-08-11 (later) - the hoopoe round: five bugs traced, one measured down, one disproved

Owner reported eight things about the mascot in one go, with the standing instruction not to
restructure the rig: "i want the same behaviour i have with the bugs fixed." So every fix below is
the smallest one that removes the cause, and the two design calls were put to the owner rather than
guessed (they chose: wings keep flapping through the landing flare; keep the ponder and reset after).

- **The idle bird that could not be shooed away** was the one worth the most care. The idle effect
  re-runs whenever the tab is hidden and shown again, and it restarted the ambient breathe
  unconditionally. That writes `PARTS.body {scaleY,y}` over `arcAndLand`'s own AWAITED body
  animation, and a superseded animation's `.finished` never resolves in motion v12, so `flyIn()`
  hung: the bird landed, never reached `sleep()`, and the `flyTo()` the next mouse move enqueued sat
  behind a step that could never finish. One condition (`if (!damper.active)`) fixes it, which is
  what the damper was always for. Guarded by the new `scripts/qa/hoopoe-idle-check.mjs`; on the
  unfixed code the exit flight never writes a single transform (`rootTransform: "none"`).
- **The celebration left the face dirty.** `react("thinking")` cocks the head 10 degrees and biases
  the gaze and nothing put either back, so the quick check celebrated side-on and kept that head
  afterwards; it also kept the `happy` arc eyeshape, which has no pupil, which is what the owner was
  seeing as eyes that never came back to normal before the wings covered them. `celebrate()` now
  levels the head, clears the gaze and hands the round eyes back. Verified on the real signup flow:
  head 9-10 degrees during the ponder, 0 from the moment the celebration starts, round eyes at 2.5s.
- **The arc flew off the top of the screen.** Both hero CTAs sit on one row, but /login's bird
  perches 69px higher than /signup's, so one formula put the login apex at -35px (above the viewport)
  while signup peaked at +21px and read fine. The arch is now fitted per flight to the smoothed
  target, so it is a ceiling on the flights that need one and leaves the path the owner likes alone.
  Login apex -35px -> +7px.
- **The landing plonked** because the cruise ended ON the perch at pace and stopped dead. It now aims
  16px high and sinks the rest on a decelerating ease with the wings still beating. Final approach
  3.42px/frame -> 0.42px/frame.
- **The flight jerk is a stall, not a reposition**, which measuring settled quickly: the perch rect
  never drifts vertically mid-flight (y=0.0px). A performance trace found two forced reflows stacking
  in the destination's commit; one was `reportPerchRect` running from `useLayoutEffect`, i.e. reading
  geometry synchronously inside React's commit before first paint. Made passive, and it leaves the
  trace's reflow list. The other is inside React's own `commitMount` and was left alone, so this
  REDUCES the jerk rather than removing it. Said so to the owner rather than claiming the fix.
- **Ctrl+Shift+H now ships.** It was a dev-only review aid; the owner asked for it on the live site.
- **Browser zoom (bugs.md #17) still does not reproduce**, now with both flaws in the old probe
  corrected: real viewport+DPR zoom instead of CSS `zoom`, and empirical pivot measurement (rotate
  180 degrees, midpoint of the before/after boxes) instead of reading computed style, which only
  says what the CSS declares. Every pivot correct to within 0.5 user units at five zoom levels and
  on a live resize. Third disproof; recorded in bugs.md so nobody spends a fourth session on it, and
  the next step is a screenshot from the owner rather than more code.

## 2026-08-11 (later still) - the zoom bug was Safari all along, and the jerk was three layouts deep

- **Bugs.md #17 root-caused by the owner's screenshots.** The one variable three investigations
  missed was the browser: every probe ran Chrome, the owner zooms Safari (the menu bar was in the
  screenshot; they then confirmed Chrome and Brave are fine). Chrome resolves px transform-origins
  on SVG children in user units; WebKit multiplies them by the page-zoom factor, so every pivot
  slid by the zoom and the wings swung from the bird's bottom centre instead of its shoulders.
  Fixed by converting every RIG_CSS origin to view-box percentages, which carry no unit to scale.
  On the way, measured that Chrome anchors percentage origins at 0 rather than the viewBox's y=-10
  the spec describes (the spec mapping put every y-pivot exactly 10 units low), so the shipped
  mapping is y% = y/152 per measurement; hoopoe.tsx documents it. Chrome verified byte-equivalent
  (empirical pivots within 0.25u, committed probe passes unmodified, landing check 28/28). WebKit
  still unmeasured: safaridriver needs the owner to flip "Allow remote automation" in Safari's
  Develop settings; bugs.md says exactly what to look at either way.
- **The remaining flight jerk was three stacked forced layouts, whack-a-moled one trace at a
  time.** The ~85ms bill for laying out the just-mounted auth page lands on whoever reads geometry
  first inside the commit: first autoFocus (react-dom's in-commit focus()), then Next's
  post-navigation scroll walk (shouldSkipElement), then our own perch report. All three are gone:
  a new useDeferredAutofocus hook focuses the same field two frames later on a clean tree (login
  email, trivia gate, signup first name), the flight navigation pushes with scroll:false, and the
  perch report's explicit mount call is deleted in favour of the ResizeObserver's guaranteed
  initial delivery, which the platform runs AFTER layout. The ForcedReflow insight is now absent
  from the flight trace entirely; what remains is the browser's one unavoidable rendering-phase
  layout, which rAF outruns by construction.
- **One regression caught by the guards, not by eyes**: the gate's deferred focus fires late enough
  that the rig is live, so its curious-on-focus expression queued ahead of the mobile fly-in and
  the veil lifted on a seated bird (landing check: first visible frame mid-viewport). The gate now
  swallows exactly the first, programmatic focus; a person focusing the field still gets the look.
- Owner action: either flip Safari's "Allow remote automation" (Develop settings) so the WebKit fix
  can be measured with safaridriver, or just Cmd+/Cmd- on /login and say what the bird does.

## 2026-08-12 - Safari measured for real, and the flight physics pass

- **The zoom fix verified in actual Safari** (26.5.2, safaridriver, after the owner flipped "Allow
  remote automation"): the percentage origins resolve to exactly the right pivots in WebKit too
  (computed "42px 85.000069px", empirical wing pivot (42.0, 85.0)), settling the anchor question:
  WebKit anchors percentage origins at 0 like Chrome, not at the viewBox's -10 like the spec. Two
  humbling findings recorded in bugs.md #17 for the next prober: CSS `zoom` does NOT reproduce the
  Cmd+ breakage in Safari (so the px bug is specific to real page zoom, which no automation on this
  machine can drive), and Safari does not reflect a just-written SVG child transform in
  getBoundingClientRect synchronously (a probe that reads in the same tick gets garbage; the first
  run reported every pivot uniformly ~100u off for exactly that reason). Final confirmation of
  Cmd+ itself remains the owner's eyes, said plainly.
- **The flight physics pass** (owner: sign-in ok, join worse, "doesn't feel like the hoopoe
  translation is related to the actions it's making"). Four corrections, all in the flight layer:
  the altitude ripple was rounded to whole cycles per cruise and drifted up to half a wingbeat out
  of phase with the wings by mid-flight — it now runs at the puppet's exact 440ms period,
  phase-locked to the downstroke; the symmetric sine arch became sin(pi*u^0.85) so the apex sits at
  ~44% and the descent is a long shallow glide (measured on join: 48% of the flight's time over the
  last 28% of its ground — join gains most, its perch being 70px lower); the flare now pitches
  nose-up against travel (-6.9 deg measured, level by touchdown); and the retarget smoothing is
  exponential in real time instead of per-frame, so the path no longer depends on refresh rate.
  Landing check 28/28, dx=dy=0.00px. The in-SVG flights (sidebar, mobile fly-in) were left alone:
  arcAndLand already drives wings and bob from one clock.
- Owner action: Cmd+ and Cmd- on /login in Safari (the one thing automation cannot press), and fly
  both CTAs to judge the new physics — the numbers can only prove coupling, not feel.

## 2026-08-12 (later) - the physics pass reverted

- Owner verdict on the flight physics pass (c279438): "it's made it much worse." Reverted whole,
  no cherry-picking; the flight layer is byte-identical to its pre-pass state (verified against
  7003690, which passed the landing check 28/28). Lesson recorded for the next attempt: the four
  changes were all mathematically defensible and measured as intended, and the owner still hated
  the result, so flight-feel changes must be judged by the owner WATCHING each change in isolation,
  one at a time, not shipped as a bundle argued from mechanism. The physics commit's analysis
  (wingbeat period mismatch, apex position, flare pitch, per-frame smoothing) survives in git if a
  future one-at-a-time round wants the starting points.

## 2026-08-12 (later still) - descenders in the name field

- Owner: a name with letters that go under the line "cuts off". Real, and only on your own profile:
  the read-only `<h1>` clips nothing (the nearest overflow ancestor is the card, 336px below), but
  the editable name is a textarea, which is a scroll container and clips at its own box. That box is
  the mirror's, set at line-height 1.05, while Libre Baskerville's content area is 1.226em — so
  0.09em of the font hangs outside the line box at each end. Measured at 41.6px: the tail of the j in
  "Sananjjy" lost 3.1px off the bottom, and the accent on a capital ("Śrī", "Ñ") lost 4.0px off the
  top. Nothing else on the sheet is set that tight, so nothing else was losing anything.
- Fix: the clip box grows 0.12em past the line box at both ends, pulled up by 0.12em with the same
  0.12em handed back as padding, so the text does not move by a pixel and the mirror still owns the
  height. Verified: mirror 43.67px unchanged and the Batch row still at y=227, room 4.98px each side
  against 4.02 needed at top and 3.14 at bottom; at 390px it scales with the clamp (4.19px room
  against 3.03 and 2.92). The mirror also gained `break-words` to match the UA's own wrapping on a
  textarea, or a name with no space in it for 60 characters would wrap in the field but not in the
  mirror and show a sliver of a second line through the newly taller clip box.
- The j tails now cross the dotted pen rule by 1.1px, which is what writing on a ruled line does.
  Checked at 2.6x: terminals whole, macron and acute whole. Desktop and 390x844 both shot.

## 2026-08-13 - The email queue stops lying

- A fresh signup was told "we've hit today's email limit, your link goes out at 8pm" as the third
  email of a 95-email day. Root causes, all three now structural rather than patched: the
  fire-and-forget drain never ran on the deployment (nothing has EVER sent from Vercel; every
  message in the Resend dashboard so far left this laptop - check the env var is named exactly
  RESEND_API_KEY and redeploy); `verificationMailState` answered "queued" for every unsent row and
  the banner explained it with the only reason it knew; and `appUrl` built links against localhost
  whenever NODE_ENV=development, so the one working sender mailed a member a link to a laptop.
- The shape now: `claimAndSend` is the single code path that moves a row out of the queue (drain
  loop, resend button, page-load read all go through it). `verificationMailState` repairs instead
  of reporting - a queued row with budget available is sent synchronously inside the page load, so
  "we've hit today's email limit" is IMPOSSIBLE to render while the day has budget left; the state
  is sent | imminent | queued-with-refill-time | failed | none, and only queued may mention the
  limit. Deferral names the moment ("tomorrow at 5:30 am"), formatted in the reader's locale via
  useSyncExternalStore because SSR's locale is not the reader's (found as a live hydration
  mismatch). A really-sent email never carries a localhost link.
- Proven against the running app, not asserted: a signup-shaped account with a stranded queued row
  logged in through the real form; first page load sent the mail (Resend-accepted, token minted
  with its full day) and showed "we sent a link". With 95 sends recorded today, the same load
  showed the limit banner with the refill time and no button. next-devtools reported zero errors.
  Test rows and fillers torn down; baseline verified (0 queued, 40 users).
- The three real members affected were all put right: Shrey's stranded mail was flushed (he
  confirmed himself despite the localhost origin), and Sanjula and Nirad were re-sent
  canonical-origin links, old tokens burned.
- NEEDS DEPLOY, and on the dashboard: confirm the Vercel env var is literally RESEND_API_KEY.
  Until both, this laptop remains the only machine that can send.

## 2026-08-13 - Shrey's Black Eagle, and the build-fund bar goes live

- Set Shrey Davuluri's `birdOverride` to `black-eagle` (valid slug, not a reserved species), same
  run-sql path as Sanjula's Purple Sunbird.
- Answered "how much have we received via Razorpay": Rs 3,530 across 2 real paid contributions
  (Rs 100 Sanan 2026-08-05, Rs 3,430 Shrey 2026-08-13). 17 live `created` rows are abandoned
  checkouts, not money.
- The "Recovering what it cost to build" bar on /support now reads the real figure instead of a
  hand-edited constant: the page sums paid live-mode Contribution rows per view and passes paise
  into CostBar; the bar completes at the Rs 4,00,000 build cost. Failed sum falls back to the
  zero-state bar. Verified live: fill renders max(0.8825%, 12px), exactly 3,530/4,00,000.
  Committed faa41af.

## 2026-08-13 (later) - Production sends its own mail, verified

- The owner re-created the Resend key under the exact name RESEND_API_KEY on Vercel (the old var
  could not be renamed), added APP_URL, and pushed; the redeploy made the env change take effect.
- Verified from the outside, not assumed: drove https://rishivalley.space/forgot-password in a real
  browser with the local dev server DOWN. The shared-DB row went queued -> sent in 0.64 seconds and
  Resend's own record shows the message, created by the deployment. First email Vercel has ever
  sent; the laptop is no longer load-bearing.
- The new key is full-access (old was send-only), so sent-message bodies are now auditable via the
  API - used today to prove Nirad's re-sent link carried rishivalley.space on every href (the
  localhost one he saw was the pre-fix 04:22 message threaded above it in Gmail).

## 2026-08-13 - The owner's thirteen-item punchlist

One session, eleven commits, every item from the owner's list landed and verified in the running app:

- **Letters**: drafts are deletable (the `deleteDraft` action existed with zero callers; the strip
  grew a trash button - confirm, optimistic removal, auto-animate). Tested end to end on the real
  "t4wt" junk draft. "Something's broken" is now "Bug report" everywhere the bug kind speaks.
- **Comments, the big one**: deletion is soft (`deletedAt`, content blanked) so deleting a parent
  no longer takes its replies - they anchor to a quiet "[deleted]" stub (feather in a mist circle).
  Authors delete their own comments from a hover-revealed "..." menu (owner mid-session: "would
  Instagram do it like that?"), never a bare Delete button. All four `_count.comments` sites
  exclude deleted rows, so the count can no longer include invisible comments. `loadComments` is
  keyset-paginated (5 on open, 10 per scroll page, replies always travel with their parent) with an
  auth check the security audit had flagged. The comment heart is a named `sm` variant (14px in the
  12px meta row, button 18px inside the 20px row - the love-button doc comment records both owner
  rulings). The open animation no longer overshoots on empty threads: the skeleton is sized from
  the count the card already knows. Verified with a seeded 55-comment thread: opens with 15, loads
  the rest only on scroll; parent-delete/stub/count all proven against the DB.
- **Notifications**: the bell pages by keyset (20 at a time; row 21 used to be unreachable),
  refetches its first page on every open (was once per mount, went stale), infinite-scrolls inside
  its own box, and prunes each account to its newest 100 on open (no cron, same lazy pattern as the
  mail drain). New `(userId, createdAt)` index. NOTE: my prune test seeded 130 fake rows dated 30
  days back, which pushed the owner's 13 oldest real notifications (all read, >30d old) past the
  cap and deleted them - a testing mistake, disclosed. 30 real notifications remain.
- **Catch-ups**: mobile gets one numbered, tappable dot per prompt in the sticky bar (filled =
  shared, ring = current) - phones previously had no way to jump between questions. "Share" on the
  last prompt sweeps to the first unanswered prompt instead of the completion card (verified on the
  live Round: Share on Q11 with Q7/Q9 blank lands on Q7). Spec 3.4 updated. Also fixed the square
  "white boxes" behind the answered-cluster birds (ring-2 on an unrounded box) - owner spotted it
  in a screenshot mid-session.
- **Rich text everywhere**: the composer's DOM<->markdown helpers moved to
  `src/lib/rich-text-editing.ts`; a shared `<RichTextArea>` now powers the catch-up answer box and
  the quick-edit dialog (which used to reopen rich posts as raw markdown). The round reader and
  comments render markdown via `renderRichText` instead of printing markers. Verified: bold in a
  catch-up answer round-trips to `**markdown**` in the DB (then restored the owner's answer).
- **Profile bird**: hovering/focusing/tapping the perched bird shows the species chip (below the
  bird - above it starts at viewport y=-27 and is never seen), resolved through the same
  override>pin>hash chain as the glyph. The chirp arcs follow the pose: a mirrored bird used to
  call out of the back of its head. Verified on Shrey's left-facing Black Eagle.
- **Clickable identity**: audit of every BirdAvatar site; linked the photo-viewer byline, four
  catch-up "asked by" lines, the masthead contributor strip, the answered cluster, and the people
  panel rosters. Notification rows can't link their actor yet (name is baked into the message
  string) - parked in FEATURES as "actor field on Notification".
- Two schema columns/indexes via manual idempotent SQL (`2026-08-13-comment-deleted-at.sql`,
  `2026-08-13-notification-created-index.sql`), both applied. Dev server restarted once: the
  running Turbopack held the pre-`deletedAt` Prisma client and 500'd the feed until restart.
- Separately: Shrey is a Black Eagle (`birdOverride`), and the /support build-fund bar now sums
  real paid live-mode Contributions (Rs 3,530 so far of the Rs 4L build cost) - committed and
  PUSHED earlier at the owner's request; everything after that push is committed but NOT pushed.

## 2026-08-18 - Teachers become first-class: onboarding, signup tenure, profile

Owner request thread: remove admission number and houses for teacher signups; make city picks
commit to a pill immediately; add optional subjects; then a full teacher pass (tenure years at
signup, "years in the valley" with "present", subjects on the profile like batch, clear editing).
Four commits, all gates green, verified end-to-end with a real teacher signup that was then
deleted through its own delete-account flow.

- **Onboarding**: teachers (accountType != alumnus) get a four-step wizard - Houses is a student
  record and never renders; the register step swaps Admission number for a subjects field and the
  copy says "old students", not "batchmates". Deep link ?step=houses on a teacher lands on
  register.
- **City picker**: the register step always uses the multi chip list now. A tapped result becomes
  a sky pill at once, the popup closes and the input blurs (the old single-then-"Add another
  city" toggle left the pick as plain text). LocationPicker's keep-popup-open-across-picks multi
  behaviour is gone everywhere - a pick finishes the gesture, tapping the box starts the next.
- **New `<TagInput>`** (`src/components/common/tag-input.tsx`): type-to-chip for short lists.
  Enter/comma/blur commit (blur matters on phones), backspace on empty removes the last chip,
  dedupe case-insensitive, pasted comma lists split. Chips byte-identical to the city pills;
  the input is the shared `<Input>` (protocol auditor caught my hand-rolled first draft
  reverting the 12a1bac focus-outline fix). Subjects title-case as they become pills.
- **Signup**: Teacher keeps Joined/Left at half-width each (Batch alone leaves, popLayout);
  Left is optional and its fit-to-content InfoTip says "Still teaching at Rishi Valley? / Leave
  this blank." - two forced lines, no orphan (owner rejected two longer drafts and a w-64 bubble
  with dead space; InfoTip grew a `fit` prop). Server maps the pair to taughtFrom/taughtUntil
  and derives teacher vs ex_teacher from whether Left was given; year order validated for both
  account types; accountType from the client is never stored raw.
- **Profile**: teachers show Subjects (wide fact) where alumni show Batch, "In the valley" from
  tenure with "2005-present" while current; no admission number (colophon shows the bare mark in
  edit mode too), no Houses in either state. Editing: the until-slot reads "present" at rest
  (PenValue grew `restText`), placeholder "now" while editing; typing a finish year flips the
  byline to "Former teacher" live, clearing it flips back - the year IS the control, no toggle.
  Teacher-only fields also gated by row accountType server-side (write-path reviewer's finding).
  Sidebar chip finally receives accountType, so teachers read "Teacher" not "Member". A profile
  with no occupation no longer shows a hanging "at" under the name (rest-state only; the holes
  return with the pen).
- **Hoopoe wing fix** (signup): answering the trivia fast stranded the wings half-raised - the
  unqueued coverEyes fired mid celebrate(2), then the interrupted greet's leftover wave wrote
  rotate back over the tuck's translate ("wrong pivot"). The mount tuck now polls isBusy()
  (340ms minimum settle, 8s cap past the flight failsafe) so it always lands after the whole
  queue drains. Measured the wing transforms through the fast path: flap clean, tuck settles at
  the exact login-page pose. Owner kept seeing the bug in a stale tab - a hard refresh shows it
  fixed.
- Write-path reviewer also surfaced (pre-existing, NOT from this diff): the demo database never
  got `2026-08-13-comment-deleted-at.sql`, so `scripts/demo/verify-guard.mts` fails on the
  comment step until that file is applied to the demo DB. Parked for a follow-up.
- Owner feedback logged to memory: full-page screenshots are not enough - zoom into every
  touched state and catch orphaned words, oversized bubbles and stray connectives before he does.

### Same day, round 2 - owner-reported polish and the flight-path hoopoe

- **Hoopoe, actually closed**: the owner's Safari screenshots showed the true repro was the
  LANDING -> flight -> fast trivia path, which the direct-load test never exercised. The flight
  handoff's greet could land after the form had already tucked the wings; its wave then wrote
  rotate over the tuck (the "hanging arms"). Two layers: runIntro now lets the greet lapse if the
  trivia step is already gone, and the form keeps a 15s watch that re-asserts the tucked pose the
  moment any other animation finishes - a stranded wing survives at most one 250ms tick, whatever
  path or browser timing lets a writer through. Verified live on the full landing->flight->fast
  path: pose byte-stable for 12s.
- **Letterhead**: empty occupation line takes NO space at rest and grows in with the pen (the
  Houses-hint height pattern); the verified leaf rides a no-wrap group with the name's last word
  (never orphaned on its own line); the name's type is 6cqi against the sheet's own @container
  instead of 7vw (owner: "it wraps, then unwraps and then wraps") so characters-per-line holds
  through the scaling band and wrapping is one event; the sheet keeps ONE padding, the smaller
  p-6, at every size (owner preference). Remaining single re-flow sits exactly at the 768px
  sidebar collapse; collapsing the sidebar at 1024 instead would make even that monotonic but
  changes every page's 768-1024 layout - offered, not taken unilaterally.

### Same day, round 3 - the valley gets its own pin, teachers get their own word

- **Owner asked why Kartik Kalyanram sat under Madanapalle** when his city reads Rishi Valley.
  Not a data fault: the map buckets every location onto a 0.1-degree grid (~11 km) so one city
  cannot split into two stacked dots, Rishi Valley is 10.4 km from Madanapalle, and both round
  into the same square `78.5,13.6`. A square takes the name of the FIRST member drawn into it and
  the pin query orders `batchYear desc`, so two 2023 members in Madanapalle claimed the square
  before the 1978 arrival ever reached it. Adding Rishi Valley to the gazetteer late had nothing
  to do with it - `city-coords.ts` already carried the string, and a fully linked row lands in the
  same square anyway. Only the map merged them; the Directory city facet always listed both.
- **Fix**: `OWN_PIN_CITIES` in `city-coords.ts`, an opt-out keyed by name rather than by square,
  with Rishi Valley in it. Both still plot at exact coordinates, so `maxUsefulZoom` and the
  supercluster do the rest - merged at world zoom, resolving to "Madanapalle - 2 members" and
  "Rishi Valley - 1 member" as you drill in, which is what the grid was standing in for. Grid
  stays the default everywhere else. Verified by drilling the real map to the split and opening
  the drilldown (Kartik, Batch of '78, Doctor); both viewports.
- **Data touched at the owner's direction**: Ananya Parthasarathy's workplace `Gnlu` -> `GNLU`;
  Kartik's houses JSON `(raavi)`/`(kailash)` -> `(Raavi)`/`(Kailash)` (free-text parentheticals,
  not canonical `houses.ts` entries); Kartik's UserPlace relinked from free-typed to the curated
  Rishi Valley row (placeId 900000001, exact lat/lng); Mini Muralidas's subject `Evs` -> `EVS`.
  Note the signup form title-cases what people type, which is where every one of these came from.
- **Teachers in "New in the directory"**: the last byline still calling `formatBatch`, which takes
  batchType and batchYear and therefore cannot see accountType. Teachers have no batch year, so
  they rendered with a blank line. Moved to `batchLine` (already says "Teacher"/"Former teacher")
  and gave it `blankWhenUnknown` so the rail keeps its deliberate blank for batch-less alumni
  rather than gaining "Member" filler. The sidebar account chip already routed through
  `batchLine` and needed no change - verified the chain auth.ts:108 -> layout.tsx:83 -> chip by
  reading it, NOT on screen: admin-login is locked to ADMIN_EMAIL so the teacher pill cannot be
  photographed without flipping the owner's own accountType in the shared production DB. Said so
  rather than claiming it.
- **Subject vs Subjects**: the profile fact was always plural, so a teacher of one read
  "Subjects: EVS". Pluralised off the comma list in both the read-only sheet and the editor, the
  same `> 1` rule the City/Cities fact beside it already follows. Plural branch verified by
  briefly setting two subjects on Mini's row, screenshotting, and reverting (confirmed back to
  `EVS`).
- `batchLine` now has unit tests (teacher, ex_teacher, blankWhenUnknown, anonymous, full year).
- **Left alone, flagged**: `src/components/admin/user-management.tsx:86` is the one remaining
  `formatBatch` call and shows the same blank for teachers. It needs accountType threaded through
  its server page, and it is an admin surface the owner did not name.

## Round 4 — Kartik's Pitta, and a teacher's city already filled in

- **Kartik Kalyanram is an Indian Pitta.** Data only: `User.birdOverride = 'indian-pitta'`, applied
  with `scripts/dev/run-sql.mjs`. The slug resolves through `resolveBirdOverride`
  (bird-avatar-v2.tsx:1743); Pitta is not one of the two reserved species (Hoopoe, Indian Roller),
  so it takes effect immediately. Verified on his profile — hero avatar and post byline both show
  the green back, buff underparts, azure wing patch.
- **A current teacher's city starts as Rishi Valley.** The onboarding register step already
  pre-fills Occupation and Organisation for `accountType === "teacher"`; the city chip list now
  joins them, seeded with the curated gazetteer row (placeId 900000001, "Rishi Valley, Andhra
  Pradesh") when they have no saved places. It is an ordinary pill: removable, and the box below
  still adds as many more cities as they want. Former teachers and alumni are untouched, and
  anyone with saved cities keeps exactly what they saved.
  - Verified by temporarily forcing `accountType: "teacher"` and `places: []` in welcome/page.tsx,
    shooting `/welcome?step=register` at 1440x900 and 390x844, then reverting the file. The chip
    fits the card at 390 with room to spare.
  - **Still true**: "Skip for now" writes nothing, so a teacher who skips the step keeps a blank
    city. The default only lands if they save the step.
- **Mini Muralidas set by hand** (owner: "set her place to RV"). She is the one current teacher on
  the site and had already been past onboarding, so the new default could never reach her. One
  `UserPlace` row inserted against the curated Rishi Valley entry (placeId 900000001, exact
  lat/lng, `position` 0), with the legacy `User.currentCity` column set to the same label the way
  `saveOnboardingRegister` keeps it in sync. Her profile now reads CITY: Rishi Valley, and she
  plots inside the valley's own pin.

## Round 5 — "TEACHER · TEACHER"

- **The bug the owner caught**: the map drilldown read `Mini Muralidas / TEACHER · TEACHER`. Two
  independently correct values collided — `batchLine` returns "Teacher" for a current teacher, and
  her occupation is, reasonably, "Teacher". The directory card had it too
  (`Teacher · Teacher · Rishi Valley`), and it only appeared at all because her city was set an
  hour earlier; before that she was not on the map and her card had no third segment.
- **Fix in `metaLine`, not at the two call sites.** A segment repeating one already on the line now
  vanishes the way an empty one does, comparison case- and space-insensitive, first spelling kept.
  Both surfaces that pair a role label with a free-typed field
  (`directory/profile-card.tsx:66`, `directory/alumni-map.tsx:666`) are fixed by it, and so is any
  future one — no call site should have to know its two inputs can collide.
- **Swept for the rest**: those two are the only places in the app that render `batchLine`
  alongside `jobTitle`. Every other `metaLine` call pairs things that cannot be equal (name +
  batch, batch + date, email + batch). `MetaDots`, the styled twin, was left alone deliberately:
  its two call sites are batch+date and a list of houses, which are already distinct, and its
  parts are ReactNodes with nothing to compare.
- Four `metaLine` tests added to `batch-line.test.mjs` (repeat, case/space, order preserved, empty
  segments). 10/10 in that file, `npm run check` green.
- **Verified on screen, not by reasoning**: drove the real map with chrome-devtools, zoomed to the
  valley and opened the pin — `Mini Muralidas / TEACHER`, `Kartik Kalyanram / BATCH OF '78 ·
  DOCTOR`. Directory card reads `Teacher · Rishi Valley` at 1440 and 390.

# Session — Support page redesign, four concepts in /lab

The Support page had barely been touched in months and the owner called it the weakest part of the
site: "a heading, then grey text, then subheading, then regular text, then boxes with the same
cluttered hierarchy, then the chip in box with totally different stuff going on." Counted twelve
distinct text sizes on one page. He redirected the work into `/lab` rather than straight onto the
route, and asked for one calm version plus creative alternatives.

**New room: `/lab/support-ideas`, "Four ways to ask"** (registered in `_registry.ts`, group Delight).
Four full rebuilds sharing one `_shared.tsx`: same words, same rupees, same fourteen birds, so any
difference between them is a design decision. `?v=plate|aviary|days|stamps` deep-links a concept.

- **Plate** — the calm one. Every section is a card, every card opens with the same line, nothing
  outside a card is a heading. Three type levels and no more.
- **Aviary** — his own idea. 156 bird glyphs on a responsive CSS grid behind the whole page, with
  every readable thing on glass.
- **Days** — the bill as ₹76 a day and thirty marks. Pick an amount and watch it fill some of them
  in, in cinnamon. You see what your money buys before reading a word.
- **Stamps** — two rows of seven is a sheet of stamps. Perforation is a real SVG path
  (`mask-composite` is still uneven across browsers). Click one and the button says which bird you
  are claiming, so the reward stops being a sentence.

**Copy, all his:** no "actually" before costs; the site is "this site", never "Rishi Valley"; struck
"A few people chipping in comfortably covers the whole month", "If it has helped you find an old
friend...", "Fourteen of the fifty" and "One time, never a subscription". The pledge is four short
LINES, not a paragraph — as prose it broke mid-thought, and every line now fits a 390px screen
without wrapping. CTA is "Contribute ₹1,000": formal, and no middle dot, because the dot is the
app's separator for meta segments with no grammar between them and this is one verb phrase.

**The bird arrangement** got real work after he asked for it to "reveal the true variety and beauty".
Read the fourteen discs' actual hex off the rendered glyphs, then used the one fact that matters in a
two-row grid: cells touch exactly when their columns are less than two apart, rows are irrelevant.
Spread the three greens, three teal-to-blues, three reds and two pale ones across columns ≥2 apart.
Result: no two neighbours share a hue, every column pairs warm with cool, three columns land on near
complementaries. Facing is composed too — it is seed-derived, so `seedFacingRight()` walks
`plate-<i>-<k>` until the pose lands right. All fourteen face one way like a field-guide plate; the
head-on Spotted Owlet is the one bird looking back at you.

**His rounds on it:**
- Cost tile "poor use of space" → rebuilt twice. A right-aligned list was worse (label and number
  500px apart). Landed on the bar carrying its own biggest label: Hosting is 85% of the bill, so at
  44px tall it holds "Hosting ₹1,950" in white (7.78:1). Domain and Photos cannot — 78px and 28px
  wide, and white on cinnamon is 4.13:1 — so they are named underneath. The asymmetry is the finding.
- Second bar unclear → now "Recovering what it cost to build" / "₹0 of ₹4,00,000".
- Aviary birds "waaay too small on mobile" → moved from absolutely-positioned clamped pixels to a
  responsive CSS grid, 4/6/9 columns, bird at 42% of its cell. Scales with the screen, cannot overlap.
- "No birds behind text ruins readability" → every panel is glass including the title, so the wood
  runs at full strength and nothing is read off bare background.
- Hover dim "fast and almost jittery", twice → 150ms to 620ms. Measured: 1.0 → 0.64 → 0.36 → 0.30.

Hydration note worth keeping: positions from a fixed hash are not enough on their own. React compares
the server's style string to the client's numbers, so `20.359622773614056%` against `20.3596%` is a
mismatch. Every generated number is rounded before it reaches a style attribute.

`npm run check` green throughout. Verified at 1440 and 390 with chrome-devtools, including a real
hover to confirm the dim curve. Nothing under `(main)/support` was touched: the shipped page is
unchanged pending his pick.

## Round 5 — the rectangle in the bird's shadow

- **What he saw**: on a profile, hovering the bird brought up a faint extra shadow that lingered
  about a second after the pointer left. Two screenshots settled it: at rest the contact shadow is
  a soft ellipse, while hovering it is a hard-edged RECTANGLE.
- **Cause**: hovering mounts the name label, Chrome repaints that corner, and it repaints a dirty
  RECT. A `filter: blur()` repainted inside a dirty rect cannot read pixels from outside it, so the
  ellipse came back sliced along a straight edge and stayed sliced until the next full repaint.
- **Fix**: `willChange: "filter"` on the shadow span, and nothing else. It owns its raster, so no
  neighbour's invalidation can cut it. Same bar, same 3px blur, same 0.14; darkest pixel 212 and
  spread 32 on the same crop, before and after.
- **Two wrong turns first, both reverted** (`1fe4cff`): swapping the label's spring for an
  opacity-only tween, and repainting the shadow as a radial gradient. Neither was asked for, both
  changed how the thing looks and moves, and the owner had to catch them. The artifact does not
  appear in a headless capture — asking for his screenshot earlier would have found the real cause
  in one step instead of three.

# Session — Aviary ships as /support, with the bird picker

The owner picked Aviary from /lab/support-ideas and asked for the ship, with rounds:

- **Header not in a tile.** The title and pledge sit bare on the page; the wood (see below) keeps a
  clear lane behind the content column so bare text never lands on a bird. Pledge is his exact
  paragraph, one para, body size, reading colour.
- **Costs, Revolut register.** Third rebuild of this card and the one that stuck: the ₹2,290
  headline leads at the type scale's h2 with the old card's count-up kept, an 8px segmented strip
  under it, then a receipt — one row per cost with a DOTTED LEADER carrying the eye from name to
  amount. The dots are the answer to both earlier failures (the fat labelled bar, and the
  right-aligned list whose label sat 500px from its number). Recovery bar: live sum from the
  Contribution table (paid + livemode, same as before), no figures at either end — the ₹4,00,000
  never prints.
- **The wood** (`wood.tsx`): fixed field of ~75 glyphs on a jittered responsive grid (4/6/8 cols),
  clear lane behind the 768px column via a CSS mask so it tracks every width; on phones the lane
  becomes an edge-whisper at 45% instead (no gutters exist there). left offset 248px so it never
  paints across the sidebar; -z-10 inside the shell's z-10 context so it sits above the valley
  photo and under everything readable. Counted 8 birds per gutter in a 1440 viewport — no bald sides.
- **Min contribution ₹500** (was ₹100), server-clamped, and it doubles as the perk threshold so one
  number answers "minimum" and "what unlocks the picker".
- **The bird picker** (`bird-picker.tsx` + `chooseBird` in actions.ts): members whose PAID
  contributions (current key mode) reach ₹500 see the full wearable collection — all fifty minus
  the reserved Hoopoe and Roller — in place of the fourteen-bird plate. Tap selects (canopy wash,
  the app's one green state); a confirm strip rises with the bird, its name and "This becomes your
  avatar everywhere on the site."; only "Make it my bird" writes. Re-pickable forever; current bird
  wears a canopy check. Verified LIVE end to end on the shared DB with the owner's own account:
  picked the Verditer Flycatcher, watched the sidebar avatar change on refresh, then restored
  birdOverride to NULL by targeted UPDATE (guarded on the test value).
- **Write path reviewed** (write-path-reviewer, then spot-checked its claims by hand): auth +
  own-row-only write, IS_DEMO guard, server-side slug allowlist (WEARABLE_SLUGS, reserved birds
  excluded, resolveBirdOverride as independent second enforcement), eligibility summed server-side
  from rows only a valid Razorpay signature can mark paid. Demo backstop confirmed personally:
  Contribution is not in ALLOWED_WRITE_MODELS and birdOverride is own-profile-scoped.
- **Contribute panel**: "Contribute ₹1,000" with a word space (no middle dot), "PICK AN AMOUNT"
  eyebrow removed, one-time line folded into the shield note, success copy now points at the picker
  ("the bird picker just above is now yours") and router.refresh() makes that true.
- cost-bar.tsx retired; plate data (arranged order + facing seeds) extracted to
  `plate-data.ts`, shared by plate, picker and the lab room's record.
- `npm run check` green; console clean; verified at 1440 and 390 (record shots
  `temporary screenshots/support-ship-{desktop,mobile}.png`).

Loose end noted, not mine: `scripts/demo/verify-guard.mts` fails to start under
`--experimental-strip-types` (ERR_MODULE_NOT_FOUND src/lib/prisma.js) — pre-existing tooling issue,
unrelated to this diff, flagged by the write-path review.

# Session — the owner's corrections round on /support (same day, after the first ship)

He reviewed the first ship and rejected most of my re-derivations: he wanted the LAB aviary, with
his named fixes, not a new design. Ten corrections, all landed:

- **Picker off /support** ("the support page should be the support page"): now at /pick-bird, whose
  only member entry is the post-payment redirect. No standing door on /support; the "Choose your
  bird" CTA he saw existed because his account holds old test-mode payments ≥₹500, and it is gone.
- **/pick-bird rebuilt from his verdicts**: at rest the grid is pure plumage, no labels ("fat and
  close together with their names... downright ugly"). Hover = the plate's spotlight exactly: others
  dim to 0.3 over 620ms, the name materialises under the focused bird; the state-layer hover tint
  was removed after he compared it to lab ("just copy exactly what you did in the lab"). Tap sinks
  (SpringPress), selection = canopy wash, sticky bottom confirm bar so the write is its own click.
- **Costs restored to the shipped CostBar structure** he called "at least an efficient design":
  "Where the monthly bill goes" + counted-up ₹2,290/month, the 20px segmented bar, pill legend
  (upgraded to exact rupees), then "Recovering what it cost to build" (his exact old label; my
  longer rewrite reverted) with the SAME 20px bar so the two match. Fill is live from the paid+
  livemode Contribution sum; no figures at either end, the ₹4,00,000 never prints.
- **The wood scrolls with the content** like the lab original: absolute against the shell's content
  div, not fixed. That anchor spans exactly the area right of the 248px rail, so it structurally
  cannot paint over the sidebar (his "birds in the sidebar", three times); md:pl-6 keeps even a
  first-column bird 30px+ clear of the rail edge. Bird size is clamp(40px,5vw,84px)×scale: the lab
  presence at a laptop, no specks (his word for the 26px cut), no murals on wide screens.
- **One wood, two callers**: lab aviary imports SupportWood(inset=false). Its birds vanished at
  first because the lab room root is not a stacking context, so -z-10 slid behind the room's own
  opaque background; `isolate` on the root fixed it. Density fixes can no longer land in one place
  and not the other (they did; he noticed).
- **Pledge**: his new copy, one full-width paragraph: "This site is not for profit and will always
  be free to use. Donations are much appreciated and go towards running and improving it for
  everyone. Anything left over goes to the school." (Grammar fix + "anything left over" in place of
  "100% of any money not used for the site"; offered him the explicit variant if he wants it back.)
- **Header icon**: shipped original restored exactly (rounded-lg, bg-leaf/10, no border, sway).
- **Section headings** back to the site's text-xl font-bold register. **"See all 50"** is a filled
  secondary pill at full control height ("barely a button").
- **Contribute button**: gap-2, the Button primitive's own 8px, after two smaller gaps read as none.
- **Admin test door**: "Change bird" beside the Contribute heading, admin-only; /pick-bird and
  chooseBird both carry a role==="admin" exception so the owner can walk the exact supporter flow
  without paying. Members still need the paid sum; the server action re-checks it.

Verified: hover dim measured at 0.3 on /support and /pick-bird; wood scrolls with content (bird
rect moved exactly the scroll delta); zero bird pixels left of x=281 at 1440 and 2560; lab room
renders its field again (91 birds); mobile 390 clean. npm run check green throughout.

# Session — /pick-bird unified with /birds; constant bird size; backdrop choice staged

- **/pick-bird now wears the Birds of the Valley layout exactly**: same 2/3/4/5 columns, same 96px
  glyphs, same 13px muted names, title only (owner: "why have two separate layouts"). What it adds
  is behaviour alone: the plate's spotlight dim, the press sink, canopy selection wash, sticky
  confirm bar. /birds also drops its subtitle; both pages are title + grid, one look. Cross-refs in
  both files so the grids cannot drift silently.
- **Wood birds no longer scale with the window** (owner: resizing shrank them to specs while text
  stayed put). Fixed 64px base × 0.68-0.95 → every bird is 44-61px on a phone, laptop and 5K alike;
  the column count is what adapts. The 0.95 ceiling is load-bearing: a 61px bird at max jitter
  stays inside a 97px four-column phone cell. Measured 44-61px at 390 and 1440.
- **Backdrop decision staged, not made**: /support?bg=solid (photo hidden, birds kept) and
  ?bg=plain (photo and birds both hidden) render live against the default shipped look. Temporary
  decision aid; hard-code the winner and delete the param once he picks.

# Session — plate on mount, bigger wood, /pick-bird truly matches /birds, solid backdrop chosen

- The fourteen-bird plate animates in on MOUNT with its stagger, not on scroll-into-view.
- Background birds up to an 80px base (54-76px, constant at every width) after 44-61 still read
  small; columns went 3/5/8 so a max bird at max jitter stays inside even a phone cell.
- The real layout gap between /birds and /pick-bird found and answered directly: identical grids,
  but content-column.tsx assigns /birds the WIDE column and /pick-bird defaulted to centered 768px.
  /pick-bird added to WIDE_ROUTES with a comment tying the two.
- The owner picked the backdrop: SOLID page on /support, birds kept, valley photo hidden for this
  one route (scoped style tag). Preview flags deleted.

# Session — no dim on the picker, 50% bigger field, three root causes, one-pick policy

- **/pick-bird hover**: the dim is gone ("annoying to look and choose" among fifty). Hover is the
  app's standard story: state-layer tint on the hovered cell + the name stepping up to the reading
  colour. The plate on /support keeps its spotlight; it is a preview, not a choice.
- **Field birds 50% bigger** (120px base, 82-114px, constant), and the layout finally holds three
  invariants at once after three separate owner complaints proved they interlock:
    size constant (fixed px base) + density constant (auto-fill 170px-minimum cells, replacing
    viewport-fraction columns whose 385px cells on a 27" made the bald gutters in his screenshot) +
    no overlap (34-66% jitter keeps a 114px bird's 84px reach under half the minimum cell).
- **The rearrange-on-load root cause**: (main)/template.tsx animates a TRANSFORM for the page
  entrance, and a transformed ancestor is the containing block for absolute descendants, so the
  wood spent the entrance anchored to the 768px column and snapped wide when the transform
  cleared. Moved the mount to the APP SHELL (wood-mount.tsx, usePathname === /support), outside
  the template; measured identical bird rects at first paint and after settle. The solid-backdrop
  style hide moved with it.
- **No birds behind bare text**: the centre lane is fully transparent again (not 40%), which the
  fixed-density gutters now afford; phones keep whisper edges via the media-query mask.
- **The perk policy, asked and answered**: (1) no cheating a pick — the page gate is a curtain,
  chooseBird re-checks auth, demo, allowlist, the Razorpay-signature-backed paid sum, and now the
  unspent-pick rule on every call; (2) pay now, pick later works — eligibility is a standing sum
  and /pick-bird stays open until the pick is spent; (3) one pick EVER — a set birdOverride
  refuses further picks for members (admin exempt for testing; an admin-assigned override counts
  as spent, noted as accepted edge). After a successful pick the member is walked back to
  /support; the confirm strip says "You pick once, so make it count."

# Session — pay-again-pick-again, a new deal of the field, the backdrop A/B chip

- **The pick ledger got its column**: `User.birdPickedAt` (schema + dated idempotent SQL in
  prisma/migrations-manual, applied via run-sql.mjs; never db push). The rule the owner actually
  wanted: a pick is SPENT when used and REGRANTED by any paid contribution newer than the last
  spend. First pick needs the ₹500 floor; changing your mind costs another contribution. paidAt is
  only ever written by the signature-verified paths, so the ledger cannot be forged. Enforced in
  chooseBird, mirrored by the /pick-bird gate, said in the confirm strip ("Changing it again takes
  another contribution.").
- **The field re-dealt**: ARRANGEMENT constant folds into the position hash, so one number rerolls
  the whole layout deterministically. Seed 3 replaces the original after his laptop-width
  screenshot showed two clustered gaps; clearings also thinned 1-in-7 -> 1-in-9. Verified even
  gutters at 1512.
- **pt-16 on the field**: the earliest possible bird top now lands below the page title's own top
  (owner: the hoopoe "shouldn't be above the top of Support").
- **Temporary backdrop A/B chip** (admin-only, bottom-right on /support): flips live between
  "solid + birds" and "valley photo, no birds". Marked for deletion once he calls the winner.

# Session close — tree and no birds ships; the aviary parks in the lab

The owner called it after the A/B: /support ships with the valley photo and no bird field. The
solid-plus-birds design is PARKED, not deleted, per his ask that reviving it later must not mean
re-tuning density and sizes:

- The A/B chip and the wood's shell mount are gone entirely (his follow-up: parked code should not
  ride in bundles it is not used by). wood.tsx's only consumer is now the lab reference at
  /lab/support-ideas?v=aviary, so it tree-shakes out of every (main) page.
- wood.tsx keeps every tuned number as parked (82-114px birds, fixed-density auto-fill cells,
  arrangement seed 3, the clear reading lane, the title clearance) and its header carries the full
  revival recipe, including the load-bearing lesson: mount from the APP SHELL, never the page,
  because the page-transition template's transform becomes the containing block for an absolute
  field and causes the re-anchor flash. The registry note on the lab room says the same.

What /support ships as after today, in sum: the tree-photo backdrop, his pledge paragraph, the
restored CostBar with the live recovery fill, the fourteen-bird plate with the spotlight, minimum
contribution ₹500, payment success walking straight into /pick-bird (the /birds layout with
selection and the sticky confirm), the pay-again-pick-again ledger on birdPickedAt, and the
admin-only Change bird test door.

---

# A stray hair, for two accounts

Not a feature. `StrayHair` puts one tapered strand on the screen for the two ids in
`stray-hair-ids.ts`, and only when they are looking at their own profile. Empty that array and it
is over; the gate sits on the server, so the component's chunk never reaches anyone else's bundle.

Three things had to be true or it reads as a drawing rather than as dirt on the glass:

- It is `fixed`, not absolute, so it does not scroll with the sheet. This is the whole illusion.
- It is a filled tapered path (1px at the root, 0.75 at the middle, a point at the tip), not a
  stroke, and a shallow S rather than an arc. The first pass was a symmetric dome and that was the
  tell — nothing organic is a parabola, so it read as a pencil mark. Owner then called the strand
  thick and blurry: root width came down from 1.6px and the blur from 0.3 to 0.12, with fill
  opacity up 0.55 -> 0.68 to hold its presence at the thinner width.
- It flees only while the cursor is CLOSING on it. Pushing on the receding half as well made a
  swipe straight through cancel itself: measured 9px of travel where it now moves 46. An
  incidental pass 95px away still only nudges it 4px, and that gap is what keeps it ambiguous.
  The offset accumulates and never returns to origin, so there is no snap-back frame.

Two gotchas worth keeping. Exporting the id array from the `"use client"` component gave the
server component a client *reference*, so `.includes` was not a function and the page 500'd —
`tsc` was perfectly happy, which is gotcha 3 in CLAUDE.md exactly. And this repo has no prettier
config: running `prettier --write` on the profile page reformatted 321 lines to its 80-column
defaults. Reverted and reapplied by hand; the page edit is a 9-line pure insertion.

---

# The chain trades its arrows for lines

The owner's read on the house chain (2026-08-19 voice note): the layout is right, but from afar
it is "a bunch of pills". The arrows between houses were the problem, grey glyphs floating in
air, so nothing looked connected to anything. The ask: connecting lines that leave one pill in
its colour and arrive at the next in its colour.

The first pass drew exactly that and he called it janky. Two reasons, both now understood. A
full-ink line is the most saturated thing in a block of 7% washes, so it shouted over the pills
it was joining. And 30px is too short for an end-to-end gradient to read as a choice; the more
saturated ink just wins and the middle looks like a smudge.

So the second pass went to the lab. `/lab/chain-lines` ("The colour handoff") draws the real
nine-house chain with the shipped geometry six ways: thread, garland, baton, stitch, rings
(his outline idea), wash, with a width slider so each one curls into the serpentine on demand.
He picked Thread over the old arrows and the other five, and it shipped: 1.75px at 60% opacity,
which is roughly the weight of the pill borders, and each ink holds pure for the first and last
30% of the line with the blend confined to the middle. The blend is OKLab via color-mix, because
sRGB drags green-to-orange through mud and OKLCH drags orange-to-blue through magenta. Lines now
run flush to the pill borders at both ends; the 4px standoff existed for arrowheads, and a
connector that stops short of what it connects is an arrow with no head. No arrowheads at all:
the year captions already state the order.

One gotcha for the file: a linearGradient in default objectBoundingBox units on a horizontal
line paints NOTHING, because the line's bounding box has zero height and the spec skips the
gradient entirely. Every connector gradient is gradientUnits="userSpaceOnUse" for that reason.

---

# Two lessons written down where they will be read

Session outcome (2026-08-19, evening): no product code, two doctrine commits.

The sidebar regression test earlier today took three failed rounds because the debugging
happened inside Playwright: re-run the suite, read the locator error, guess, repeat, while
chrome-devtools sat there able to show the live DOM in one call. The owner's words: "I can't
afford stupid mistakes like this when the solution is right there." That is now gotcha 7 in
CLAUDE.md, with the rule stated as a lane assignment: the MCP finds the answer, Playwright
remembers it. A spec is written after the behaviour is understood, never as the instrument for
understanding it. The two locator traps are named there too: the mobile drawer re-renders the
same components through a Radix portal (scope to the desktop `aside`), and exit-animating nodes
still answer `toBeVisible()` (assert on geometry with `expect.poll`). `e2e/sidebar.spec.ts` is
the worked example.

Separately, the owner asked that lab rooms read like the Delight group, not the Second look
group. `docs/spec/lab-voice.md` now says so in its own section: a Delight room is a thing to
play with and its prose is a caption; a Second look room is a memo with exhibits, and a new
room must not be modelled on one. Audits keep their rigour but change shape, specimen first,
fix beside it. The pre-registration checklist gained the matching question.

Commits: 6730e14 (CLAUDE.md), 28ad1bb (lab-voice.md). `npm run check` clean, 15/15 tests.

Session outcome (2026-08-19, night): audit item A2 resolved without the owner.

The owner went looking for "Object versioning" in the R2 dashboard and could not find it,
because Cloudflare R2 does not have object versioning on any plan — the audit's "enable
versioning today" remediation for C2/C4 was impossible as written. A2 anticipated this and
named its own fallback, which is now built: `backup.yml` gained a `media` job that copies
`rv-alumni-media` server-side into the private backup bucket every night, never with
`--delete`, so a deleted photo — including via the C2 arbitrary-delete bug — survives in the
backup. The job refuses public destinations (same guard as the dump job) and fails if the
backup ever holds fewer objects than the live bucket. A2 rewritten as done in
OWNER-INPUT-REQUIRED.md, PDF regenerated, OPERATIONS.md records the single-photo restore
command. One open question the first run will answer: whether the R2 token in GitHub secrets
can read the media bucket, or is scoped to the backup bucket only.

Commit: f8aeb76. `npm run check` clean, 15/15 tests. Not yet pushed — needs the owner's
go-ahead, then a manual Actions run to prove the media job end to end.

Session outcome (2026-08-20): the home-screen icon, and a divider that followed you between
devices.

The owner added rishivalley.space to his iPhone home screen and got a plain letter "R"; on a
Mac he got the mark, but blurry. Three separate causes. The site shipped no apple-touch-icon
at all, and iOS Safari reads neither favicon.ico nor an SVG icon for Add to Home Screen, so
it fell back to drawing a letter tile. There was no web app manifest either, so the only
raster anywhere was a 32px favicon.ico, which is what macOS was scaling up. And `/icon.svg`
was not excluded from the auth proxy, so a signed-out phone asking for the icon was answered
with a 307 to /login and an HTML page where it wanted an image. All three fixed:
`scripts/dev/generate-icons.mjs` derives a full-bleed 180px apple-icon and 192/512/maskable
PNGs from the one canonical PeaksMark, `src/app/manifest.ts` carries them, and the proxy
matcher now lets the brand assets through. Verified all five URLs answer 200 with the right
content type while signed out. The apple-icon and the maskable icon are deliberately NOT
pre-rounded, because iOS and Android adaptive launchers mask to their own squircle and would
otherwise eat into our rx=96 corners.

Second: "New since you were last here" lived in localStorage, so it was a fact about a
browser, not a person — the same posts were announced as new again on every device signed in.
Moved onto the account as `User.feedSeenAt`, read by the feed's server component, advanced by
a `markFeedSeen` action with a conditional updateMany so two devices cannot rewind each other.
Verified end to end against the database: the marker stamps to the newest post on load,
rewinding it by one post draws the divider in the right place at both viewports, and the same
load advances it again.

That change also caught a hole in the dev Prisma client's staleness guard. It hashed
`Prisma.ModelName` — the set of model NAMES — so it saw a new model and was blind to a new
COLUMN on an existing one. Adding feedSeenAt reproduced gotcha 8 exactly: generate succeeded,
tsc passed off the fresh types on disk, and the running server threw
PrismaClientValidationError from its cached client. The key now folds in each model's
`*ScalarFieldEnum`, so it moves on any schema change at all.

Commits: 2e160c6 (the icon set, swallowed into a concurrent session's security commit — see
below), c372839 (feed marker + the Prisma key). `npm run check` clean 15/15, `npm run visual`
21/21.

Note for whoever reads this next: several sessions were live in this tree, and one of them ran
a bare `git commit` while the icon files sat staged, so those eight files landed inside
2e160c6 rather than under their own message. Nothing is lost and nothing was rewritten. A
third item the owner raised — the show/hide password button on /reset-password — could not be
reproduced in Chrome at either viewport (it reveals and re-hides correctly on both fields) and
the owner set it aside rather than pin down what he saw.

## 2026-08-20 — Security audit, Phases 1 and 2

Two phases of `docs/planning/SECURITY-FIX-PLAN.md`, which is now the spine for the remaining eight.
Ground truth for what is closed is `npm run audit:status`, not any document.

**Phase 1 — the unauthenticated admin takeover (C1).** All three parts removed: the password-less
branch in `authorize()`, the `/api/auth/admin-login` route that minted a 30-day admin session from
an email address alone, and `NEXT_PUBLIC_ADMIN_EMAIL`, which compiled that address into every
visitor's browser bundle. A fourth path turned up that the audit had missed -- a `signIn` callback
re-writing `role: "admin"` onto whoever matched `ADMIN_EMAIL`, on every sign-in.

That route was load-bearing for every screenshot script, the Playwright visual suite and the
chrome-devtools MCP workflow, so the capability survives as `/api/dev-login`: 404 whenever
`NODE_ENV` is production, wants a 32-char secret compared with `timingSafeEqual` rather than an
identifier, and copies the role the row already holds instead of granting one. Nine hand-copied
sign-in blocks across `scripts/qa` became one `_dev-login.mjs` that authenticates from Node, so the
secret never enters page JavaScript.

**Phase 2 — authorization holes.** `loadDirectoryPage` had no `auth()` call at all. Six interaction
paths acted on any `postId` without asking whether the caller could see the post, while the read
path carefully checked group membership, city scope and batch targeting -- so a non-member could
read and post into a private Catch-up thread with nothing but an id the app hands out in its own
notification links. `isBlocked` was read by six list queries and no write path. A deleted account
kept a working session for 30 days. A password reset burned reset links but not sessions.

The last three are one mechanism: a `credentialVersion` column stamped into the JWT and compared on
every session read, dropped by the `auth()` wrapper -- the one function every page and action
already calls, so it cannot be forgotten by the next action somebody writes.

**The lesson worth keeping.** The behavioural probe caught a lockout bug that `npm run check` was
entirely happy with: neither mint path carried `credentialVersion`, so anyone who had ever reset
their password would have been thrown out immediately after signing in, forever. Every phase from
here writes the probe and pastes the numbers into the plan's session log.

## 2026-08-20 — Security Phase 3: verification finally means something

**Phase 3 — the two-gate trust model (H21, and M1's harvesting half).** `verifyState` had a badge
and no consequences: any account with a throwaway mailbox could post, vote, upload, report, and
read every phone number in the directory. Now the tiers hold server-side. Stage 0 (unconfirmed
email) reads the feed and sees the map's circles and counts, never a name -- not in /directory, not
in the two name-serving API routes, not on a profile, not even in the tab title. Stage 1
(confirmed) browses the people but writes nothing and opens no contact details. Stage 2 (profile
verified) is a member. Every write action moved from the email gate to the new
`requireVerifiedMember`; own-account writes (deleting your own content, bookmarks, the feed
marker) deliberately stayed below it. `reportUser` also stopped stripping the reported member's
badge -- one anonymous-grade report would now have stripped their *access*.

**The roster.** The school's two sheets (Centenary registrations + the 1936-onward Master list)
consolidated into 2,134 `RosterEntry` rows carrying nothing beyond name/email/batch. A signup the
sheets vouch for verifies itself with `verifyMethod: "office_list"` the moment its email is
confirmed -- email match alone, or name+batch with no single-token or initial matches. Everyone
else gets "Ask to be verified" (the confirm-email card's new sibling), which writes the first-ever
`pending` and joins a new `verify` queue on the admin worklist. No digests, no mail: the owner
mans the panel, so the worklist row IS the pipeline.

**Proof, per the Phase 2 lesson.** `scripts/qa/phase3-probe.mjs`, kept as a script: 22/22 against
the running dev server, driving disposable accounts at each tier through real pages, a real
comment typed into the real feed UI (refused with the card at Stage 1, lands at Stage 2), and all
three roster outcomes through a real /verify-email link. Locked states screenshot at 1440x900 and
390x844 and read. `npm run check` 17/17 files, `npm run visual` 21/21, production build clean,
`audit:status` 13 fixed / 18 open.

## 2026-08-20 — Security Phase 4: bots pay at the door, and everything is metered

**Closed H22, H6, M2, M3, M7** (audit:status: 18 fixed / 15 open). Turnstile now stands at all
three public doors and is verified **server-side**: inside NextAuth's `authorize()` for login (the
one place a direct POST to the callback route cannot skip), in `registerUser`, and in
`requestPasswordReset`. Development pins Cloudflare's official always-pass test pair, so the
enforcement path is byte-identical in every environment while local sign-in, e2e, visual and the
QA probes run unattended; the widget is `appearance: "interaction-only"`, so no page changed a
pixel (21/21 baselines untouched). A signup or a completed reset carries a five-minute HMAC
"human pass" bound to its one address into the auto-sign-in, instead of solving the widget twice.

**One limiter.** `src/lib/rate-limit.ts` is the single Upstash-backed throttle: login failures
per IP and per account (successes free, so nobody's own sign-ins spend anything), signup and
reset per IP, posts/comments/uploads/reports/catch-up creation per account. Fail-open with a
logged miss, IS_DEMO exempt three ways over — the demo can never be locked out. Refusals carry
honest codes: the login form now says "too many attempts" or "couldn't confirm you're human"
instead of lying "invalid password". The trivia gate lost its repo-printed fallback secret, its
cookie-keyed in-process limiter (the one an attacker skipped by omitting the cookie while it
starved real first-timers), and its shareable pass token — now per-IP in the shared store, and
HMAC-bound to the browser that earned it. Owner ask mid-session: the gate also offers "Try a
different question" now.

**Proof.** `phase4-probe.mjs` 29/29 live: refusals before bcrypt (LoginAttempt proves the
password was never judged), account lockout that survives IP rotation while a bystander signs in
from the attacker's own IP, the whole real signup driven in a browser with two forged-trivia-pass
sabotages refused mid-flow, the M7 DoS pinned dead, reset caps with zero mail rows, the 41st
presign a 429. `phase4-prod-check.mjs` 6/6 against a local production build: the QA bypass with
the CORRECT secret refused, a garbage token refused by a live siteverify round trip — plus a
positive control (human pass signs in), which caught the first run passing vacuously on
UntrustedHost 500s. `npm run check` clean, e2e 22 passed.

Post-deploy: XFF spoof-rotation confirmed dead against live Vercel; a headless bot was
refused at the production login with the honest copy while the widget loaded clean (site
key accepts the domain). Owner round from screenshots, same day: dev test key switched to
the invisible variant (the dark Cloudflare card was my wrong key pick, not the design),
challenge theme pinned light, and the trivia swap became an inline circular-arrow glyph —
half-turn per press, one-breath question crossfade, arrow gliding on layout=position.
Deploy times (~1m20 → ~2m) are Sentry + PostHog landing Aug 19, normal; puppeteer's
per-build Chrome download on Vercel was the one real waste, now skipped (.puppeteerrc.cjs).

## 2026-08-20 — Security Phase 5: the bucket stops trusting the caller

**C2 was the worst thing in the audit that was not an open front door.** Any confirmed member could
put every image URL they could scrape — the heritage Collection, other people's avatars, anyone's
post photos — into a post's `images`, then delete the post, and every one of those objects was
deleted from R2 with it. No versioning, no undo, a scanned archive that cannot be re-sourced. One
authenticated request.

**The fix: the bucket stops trusting any URL the caller hands it.** Every upload now mints its key
server-side under the uploader's own prefix, `<purpose>/<their id>/…`, and every write that accepts
image URLs (posts, letter drafts, Catch-up answers) refuses anything that is not app-minted AND under
the caller's own `uploads/` prefix, capped at three. So a post can only ever carry photos its author
uploaded, and deleting it can only ever delete those. The verdict is a pure rule with twelve tests
written as attacks; the two direct-to-R2 paths bind the staged key to the caller the same way. That
one change also closes M10 (external tracking-pixel URLs are refused by the same gate).

The rest of the upload surface got hardened alongside: removed Collection photos now actually delete
their bytes instead of leaving them fetchable forever (M11); the direct Collection path re-encodes the
original so a phone photo's GPS coordinates are not published to the whole community, full resolution
kept (M12); a magic-byte sniff decides what is really an image before libvips touches it (M13); every
sharp call has a decompression-bomb ceiling (M14); a presigned object's size is checked with a HEAD
before it is pulled into a function's memory, since R2 cannot enforce it in the signature the way S3
can (M16); and one account can only fill so much of the Collection (M17).

**Proof.** `phase5-probe.mjs` 27/27, against the running server and the REAL R2 bucket: the actual
composer driven headless with its upload response forged to a victim's URL creates no post carrying
it and the victim's object survives — while the attacker's own post goes through (positive control);
cross-user staged-key finalize is refused and own succeeds; a GPS/EXIF JPEG comes out of the
re-encode with no metadata; a delete really removes the bytes; text-in-a-png-suit is refused. `check`
clean (19 test files), `visual` 21/21 — no UI moved. New copy shows only on abuse paths; a member's
normal posting is untouched, except that a directly-uploaded Collection photo is now stored as a
full-resolution WebP with its location metadata stripped.

Self-review caught what the probe would not have: WebP's 16383px hard cap, which the M12 re-encode
would have thrown on for a very large scan where the old raw passthrough stored it — bounded now. No
schema change, so no migration and no demo-DB step this phase.

## 2026-08-20 — Security Phase 6: headers, the beta.32 auth bump, and the crons that never fired

**Seven findings, three of them structural.** The auth library and image decoder both carried live
advisories (C3): next-auth moved beta.30 → 5.0.0-beta.32 (pinned exact — a beta you can't let float),
sharp 0.34 → 0.35.3, next 16.2 → 16.3.1. The one that mattered is next-auth: the advisory is
*existence-based auth checks can fail open*, and this whole app is `if (!session?.user?.id) return`.
So the probe doesn't trust the version string — it signs a real account in through the real
credentials callback under the new library, opens a members-only route with the minted session, and
confirms a wrong password still mints nothing. beta.32 authenticates and does not fail open.

sharp 0.35 brought a stricter libpng that rejects images over cosmetic warnings; `sharpImage` now
sets `failOn: "error"` so an old heritage scan with a bad colour profile is decoded, not turned away.
(It also rejected the probe's hand-pasted 1×1 test PNG — a bad test fixture, not a real photo; the
probe now generates a valid one, and re-ran 29/29.)

**Headers (H7).** A real CSP plus X-Frame-Options: DENY, Referrer-Policy, nosniff, Permissions-Policy
and explicit HSTS. `frame-ancestors 'none'` is the clickjacking fix the audit named by name (framing
/settings to bait a click onto deleteAccount). The CSP was iterated with the browser console open, as
the plan warned: it caught Vercel Analytics' loader host, and a production build confirmed the login
page renders whole — hero, fonts, and the Cloudflare Turnstile widget all load under the enforced
policy. The one residual eval "issue" is Turnstile fingerprinting the headless browser inside
Cloudflare's own iframe, present whether or not we allow eval, i.e. not ours.

**The quiet ones.** `/lab` was public in production and `/lab/everything` served an internal audit log
of quoted source paths (M19) — now removed from the public list and behind an admin-only layout that
404s everyone else, so it doesn't even admit it exists. The nightly `vercel.json` cron pointed at
`/api/catchups/tick`, a route that never existed, so it 404'd every night and Catch-up deadlines only
advanced when a member happened to load a page (M27) — the route exists now, wrapping the cron-wide
advance the function was written for, gated by CRON_SECRET. Poll options were written in a loop after
the post existed, so a mid-loop failure left a partial poll (M32) — folded into the post's own create
as one transaction. `updateContactMethods` wrote links, socials and a display email with no
validation at all, saved from stored XSS only by a read-side re-check (M18) — now through the same
schema profileSchema uses. And `/api/users-by-batch` would dump the whole user table to any
signed-in account (H18) — capped.

**Proof.** phase6-probe 15/15 live, phase5-probe 29/29 under the new sharp, build exit 0 under all
three upgrades, check clean, visual 21/21. Owner action: confirm CRON_SECRET is set on the real
Vercel project (same one demo-reset uses) so the nightly Catch-up cron actually runs; until then the
lazy page-load tick covers it exactly as before, so nothing regresses.

## 2026-08-20 — Security Phase 7: a record that outlives the people in it

Before this, nothing was written down. An admin could block, delete, verify or demote anyone and the
only trace was the effect itself; a member could delete their account and it vanished without a line
(H10, M36). If C1 had ever been exploited you would never have learned the 72-hour clock had started
(H14). So: an **AuditLog** table with no foreign keys on purpose — actorId, targetId and a
denormalised name live as plain strings, so "admin X deleted member Y" survives Y's deletion, and X's,
which is the one property an audit log exists to have. `writeAudit()` records block/unblock, delete,
verify, unverify, role, merge, self-deletion and reports, and it can never throw — an audit write must
not turn a successful moderation click into an error page. Sign-ins were already logged (LoginAttempt,
Phase 4), so the two tables together are the record.

The admin can now **see** it: `/admin/audit` puts the attribution record and the failed-sign-in record
side by side — who did what to whom, and the shape a break-in attempt makes (a burst of wrong
passwords, a run at addresses that match no account). That is H14: not alerting, but the thing you look
at when you have a reason to.

And **H5** finally closed. Phase 3 took away the one-report-strips-a-badge bug; this took away the rest.
A member can no longer inflate a flag count by reporting the same person over and over — one report per
pair, enforced by a unique index and answered gently ("we've already got your flag", even when two
flags race in together and one loses to the constraint). Reporting routes through the same new-thread
budget messaging does, so it can't be a faster way to page a human. And at three distinct flaggers the
admin hears "N members have now flagged X" instead of a single voice — but the standing still only ever
changes by the admin's hand, which was the whole point of making verifyState a capability in Phase 3.

**Proof.** phase7-probe 9/9 live, including the real thing end to end: an admin clicks Verify in the
actual /admin/people UI, the member is verified, an attributed `admin.verify` row lands in the log, and
it renders on /admin/audit. check clean, visual 21/21, the new page screenshotted both viewports. One
migration (AuditLog + the Report unique), applied forward-only; the demo writes no audit rows.

## 2026-08-20 — Security Phase 8: leaving, and being able to see the rules

Deleting your account used to be one click and a lie: the click destroyed the rows instantly with no
confirmation and no way back, and it LEFT every photograph you ever uploaded publicly fetchable in
storage forever, with nothing left pointing at it so nobody could ever find and remove it (H9 — the
finding that made "right to erasure" unachievable for images). Now deletion is a request: it asks for
your password (a stolen browser session is not enough to erase somebody's history), signs you out
everywhere, emails you the date it becomes final, and waits 60 days — during which simply signing in
again cancels it, and your name is held out of the directory as if you had already gone. When the
window closes, a nightly job erases everything for real: the rows AND the stored images, through the
same one purge the admin's delete button uses. The same job is the retention schedule (M34): admin
messages 2 years, reports 3, payment records 10, notifications and security logs 1, email delivery
records 180 days — personal data now stops accumulating forever, and every sweep leaves a line in
/admin/audit saying what it swept.

Alongside it, the things a member can now DO: download everything the site holds about them as one
file (the "Download your data" link in settings — GDPR Art. 20), and read, at last, what the site
actually promises. Three documents went up — /privacy, /terms, /guidelines — written in plain
sentences, honest about the public image CDN and about what outlives deletion, with the controller
contact reachable at the bottom rather than featured. Signup now carries the consent tick linking
all three, enforced server-side and receipted with a timestamp. H12, the "bare violation with no
defence available", is closed pending the owner's read of the words.

**Proof.** phase8-probe 40/40 against the real server and the real bucket, twice: the real dialog
refusing a wrong password, a real uploaded image provably gone from R2 after the sweep, the seeded
over-age rows dying while fresh ones survive, the export refusing strangers, the signup refusing a
consent-stripped POST. The write-path review found three real gaps (a non-atomic purge, Catch-up
enrolment reaching grace-period members, merge stranding an avatar in R2) and the design review
three more (focus rings, a borrowed field material) — all six fixed and re-proved. check clean,
visual green with two new baselines, phase4-probe re-run 29/29.

## 2026-08-20 — Security Phase 9: the gate that stays shut on its own

Everything fixed so far was held closed by attention, and attention rotates. Now CI holds it: every
push runs `npm audit` through a gate with a written allowlist (the one accepted advisory is named,
with its reason and the condition that clears it — anything new at high or critical stops the
merge), and runs the audit status board with `--fail-on-open`, so a security fix that quietly
regresses fails the build naming the finding (H16). And the test suite grew teeth (H17): regression
pins that keep the two critical findings closed forever, an attack suite for the one function that
feeds member text into raw HTML, and a sweep that checks EVERY server action carries an auth gate
or a written reason it doesn't — the tripwire for the forgotten-line class of bug that caused three
of the audit's findings. Proved in both directions: the probes watched each gate refuse a real and
a crafted regression, 13/13. audit:status: 42 fixed, 0 open.

## 2026-08-20 — Security Phase 10: the long tail, swept

The audit's remaining mediums and lows, closed or consciously accepted, every one now on the status
board with its reason. The real changes: the three upload endpoints no longer trust a browser cookie
alone — a request from another site's page is refused by its Origin before anything else runs (M33);
passwords now have a floor beyond length — the breach-corpus classics, rishivalley123 and its family,
and your own email address are refused at signup and reset, with the reset checked before the link is
spent so a rejected password never burns it (M8); starting or growing a Catch-up tops out at 100
people instead of the 500 the audit demonstrated as forced-enrolment (M29); the password-reset form
no longer answers faster for strangers than for members (L3); a duplicate signup race gets a sentence
instead of a crash (L9); and the one production log line that printed a member's email address now
masks it (L5). Housekeeping with teeth: AGENTS.md stopped describing the deleted admin bypass as a
working feature, and the three PostHog 404s that have polluted every console check since Phase 1 are
gone, so the next real error stands alone. Proved live, 11/11, with the phase 5 and phase 8 probes
re-run green behind the route changes. The board: 74 findings tracked, 0 open.

## 2026-08-20 — Security section closed: one reference document

The three working files of the overhaul (the 2,000-line audit, the owner Q&A, the fix plan with its
ten session logs) collapsed into docs/SECURITY.md: the machinery and what must not be broken, the
owner's standing decisions, the retention schedule, the accepted-risk register with reasons, the
open items, and the traps. The full originals stay in git history. Ground truth remains `npm run
audit:status` (74 tracked, 0 open), which reads the code, not any document. Loose ends tied the
same evening: CRON_SECRET now matches across Vercel and GitHub, proved by a manual retention run
going green and writing its own line into /admin/audit; the Supabase DPA form recorded as declined
by the owner; the DPA posture of the other four providers recorded.

## 2026-08-20 — The Cloudflare checkbox stops being a trap; the reset screen learns hierarchy

Owner, from incognito: the human-verification checkbox appeared (it does, for suspicious visitors —
that is Managed mode deciding, and the right trade against refusing real humans outright), and
submitting without ticking it hung for a while and then errored. The hang is gone: the widget now
says the moment Cloudflare is waiting on a human, and all three auth forms answer an unticked
submit within two seconds with one plain sentence instead of timing out into a doomed request.
Proved live against the forced-interactive test key. And the "Check your email" screen went from
four equal grey lines to three tiers: the address bold on its own line, one quiet line for the
hour-long lifespan and the spam pointer, and a proper link to try a different address. Both
viewports read, visual 23/23. With the owner also changing the second admin's temporary password
today, the security section's open-items list is empty.

## 2026-08-21 — The pre-release audit armory: two overnight prompts and eleven imported reviewers

The owner asked for two paste-and-go prompts to run as dedicated overnight sessions before the
public release: one formal simplification audit (the codebase is ~200k lines of TS/TSX and he
named AI bloat as a real problem here) and one bug-and-stability audit with headroom to 2,000
users. Both are audit-only by design; each produces a phased report under docs/planning/audits/
that later fix sessions execute without re-deriving anything. Two research agents swept what the
community has published for each job; everything that verified was downloaded, not paraphrased.
Now in .claude/skills/: Sentry's code-simplifier (Anthropic's official one, vendored), find-bugs
and sentry-code-review; goal-sloc (SLOC-as-scoreboard with anti-gaming rules); Effeilo's
front-refactor and front-review; Dimillian's bug-hunt-swarm and review-swarm; and the 21k-line
code-review-skill reference. In .claude/agents/: Anthropic's five pr-review-toolkit agents,
silent-failure-hunter the prize among them. In docs/planning/audit-assets/: Anthropic's
production review pipeline verbatim (findings must each survive an independent validation agent)
and the Big List of Naughty Strings for input fuzzing. The prompts themselves are
docs/planning/simplification-audit-prompt.md and docs/planning/bug-audit-prompt.md; each carries
the owner's brief nearly verbatim, his prompting ideology (verbose briefs, agents decide their
own granularity), the shared-database rule stated twice, and the distilled methodology from both
research sweeps, including the connection-budget arithmetic and the IST-vs-UTC date-boundary hunt.

## 2026-08-21 — Pre-release fix session three: the last canonical finding, and half the tail

Session three of the fix work. It opened with one canonical finding left and closed with none:
**all 45 are fixed**, both feature builds have shipped, and `npm run check`, `npm run visual` and
`npm run test:e2e` are green. Nineteen commits, and the owner pushed once mid-session.

**B-063, the Catch-up leave/archive/delete feature**, was the large piece. Built to the design he
approved: Leave on the People panel, Archive and Delete on the card's own menu, an "Archived" and
a "Recently deleted" section that render only when they hold something. Personal by construction
(the state is two nullable columns on `CatchupPref`, unique on the pair, so it cannot leak across
members), a leaver's published answers stay where they were published, and the nightly sweep
empties the 30-day bin. Two extensions beyond the approved design, both argued in the code: Delete
is refused for the creator as well as Leave (the sweep would otherwise strip the founder's
membership row and leave a Keeper the app tells "you are not a member"), and the menu does not
offer what the action would refuse. Proved live with two throwaway accounts at both viewports, and
the sweep proved in a rolled-back transaction.

Then the clusters: the mail drain's recipient scope (M53, the flag that could send real members'
mail off a dev machine), Turnstile and the database-outage sign-in message (M07, M18 — both told
people something untrue at the worst moment), nine fire-and-forget writes moved to `after()`, the
money surfaces (M59 could have let a junk flood get Razorpay to disable the payment webhook), the
Catch-up engine's correctness, the directory's NaN 500 and its NULLS-FIRST batch sort, uploads
(row before bytes; a measured 81MP → 40MP ceiling), the token transactions, the app shell's error
boundaries and loading states, and the demo.

**Three findings turned out to be wrong and are recorded as such** rather than patched: M30 (the
visibility rule always had the author exemption, deliberately above the hidden check; only the list
query lacked it), M56 (the retry latch was fine — a failed `<script>` leaves its tag in the DOM and
the "already loaded?" check looked for the tag), and Low 43 (GitHub's 60-day workflow disable
applies to public repositories; this one is private). Two more are deferred with reasons: M22
trades a latency win on six pages for a theme flash, and M24 needs a new client surface.

**Two agent reports each contained a real defect, caught only by reading the diff**: a token hash
copied into a second file, and a security check dropped from a rewritten query. Both had passed
every gate. That rule earned its keep twice in one session.

Two things were found that the audit never named. **B-203**: "Start one" on a group card minted a
duplicate group, so the row stayed forever offering to do it again; the owner chose to drop the row
rather than make the button attach. And **the demo's database had received none of the audit's
migrations** — it was fourteen behind and would have broken on the next push. `run-sql.mjs` gained
an `--env` flag, all fourteen were applied, and the write guard passes 15/15 again.

Also, at the owner's ask: Renovate was unblocked (an `_comment` key it does not accept had stopped
it opening any pull request at all) and eleven of twelve npm advisories cleared, which subsumes
Dependabot PR #10.

Handed over at roughly 92% by effort with 22 Medium roots and about 47 Low items left. The brief
was the session-four brief; the disposition ledger was the record. Both were removed on 2026-08-21
when the review closed.

## 2026-08-21 — Pre-release fix session four: the tail, and the report is closed

Took the "Still open" list from part three and finished it. **Every one of the 45 canonical
findings, all 68 Medium roots and all 117 Low items in `bug-report.md` is now dispositioned** —
fixed, not-a-bug with the reason written down, or deferred with the reason written down. Eleven
commits on `main`, none pushed. `npm run check` green (53 unit tests), `npm run visual` 23/23,
`npm run test:e2e` 24 passed, and `verify:crawl` clean on every route.

The two that had teeth. **Deleting an account was silently breaking other people's conversations**:
`Comment.author` cascaded, and the self-referencing parent key is SetNull, so purging somebody
deleted every comment they had written and promoted every reply underneath to a top-level comment —
a stray sentence with no question above it, in a thread that then lied about its shape. Exactly the
corruption the soft delete exists to prevent, which the purge path had been quietly reintroducing.
A comment still holding somebody else's reply now survives as a blank, nameless anchor; everything
childless goes. Proved against a real cross-author thread in a rolled-back transaction. And **a
letter open on two devices lost whichever side wrote more** — the desk autosaves the whole body with
no precondition, and both surfaces said "Saved". Every save now carries the version it was working
from. Proved end to end with a probe: the desk saved, another surface wrote over the row, and the
desk's next save was refused with the other side's words intact.

Two more worth naming. **Nobody signed in was being identified to the analytics at all** on a full
page load: PostHog was started inside an effect, React runs a child's effects before its parent's,
so the identify step always ran first, found nothing loaded and gave up — and its deps never
changed, so it never ran again. Every first visit, every refresh, every link from an email was an
anonymous session. Caught with a before/after probe. And **the audience field on a post was the one
thing stored exactly as it arrived** — no length limit, no format — in a column every feed query
searches through; fixing it turned up a second bug, that matching was a plain text search, so a
post aimed at "ISC-20111" showed to everyone in ISC-2011.

The rest, in clusters: reports settle once instead of twice; the verification queue orders by when
somebody asked rather than when they last browsed (new `verifyStateAt`); one press is one post and
one comment; search logging finally deduplicates keystrokes; the letters index pages instead of
stopping at forty; the data export streams instead of holding a whole history in memory twice; a
failed place lookup says so instead of quietly saving a city with no map pin; and an unconfirmed
member's pages no longer wait on the email provider before rendering anything.

Then the Low appendix, all of it. Admin lists that showed less than they counted now say so.
Verifying somebody by hand records that an admin did it, not the office roster. Erasing your
Catch-up answer withdraws it. Removing a question no longer puts the next one on top of the last.
The saved contact card survives a comma. Impossible year combinations are refused. And 64 pixels of
dead space came off the bottom of every page on a phone, reserved for a tab bar that does not
exist — six mobile baselines moved, and decoding the PNGs row by row showed the shared area had
**zero** differing pixels: the pages are simply shorter.

**Four findings were wrong or already closed, and are recorded rather than patched.** Low 53's
mechanism is real (setting a cookie in a Server Action does re-render the page — it is in the
installed Next docs) but its scenario cannot happen here, so the code COMMENT claiming otherwise was
the actual defect. Low 69's live "clash" — Delhi matching New Delhi — is `city-coords.ts` aliasing
them deliberately, the way it aliases Chennai and Madras. Low 60 names a file that no longer exists.
Nine more Lows had already been closed by earlier sessions' clusters.

**Three are deferred on their merits, not skipped.** Low 89 wants a partial unique index Prisma
cannot express, and the expressible alternative fails worse: one forgotten transition and a member
can never receive a password reset again. Low 78 is a moderation policy question the audit itself
says belongs to the owner. M19 and its two siblings wait on a custom domain for the image bucket,
which only he can buy — it is the "image CORS thing" he already remembers.

Everything the report contained is now closed, so its paperwork went with it. What survives is the
part the code cannot say: `docs/TRAPS.md` (the runtime traps, each one proved) and a new section in
`docs/planning/bugs.md` under "Settled, do not re-open" (what was deliberately NOT a bug, what is
deferred and why, and the owner decisions taken along the way).

## 2026-08-22 — Pre-release bug audit, round two (audit-only)

Ran the formal pre-release bug/stability audit a second time as a fresh set of eyes, dedup baseline
being `docs/TRAPS.md` plus the `bugs.md` Settled/Open ledger. Audit-only: no application code
changed. Report at `docs/planning/audits/bug-report-2.md`, machine ledgers alongside
(`findings-raw.json`, `verdicts-merged.json`), refuted+duplicate appendix beside them.

Shape: 22 read-only finder agents (12 territories partitioned by write-path density + 10
cross-cutting lenses) → 204 candidates → 18 adversarial validators, one per code-locality zone, each
told to refute against the actual code and to fold duplicates. Then orchestrator hand-verification of
the top tier and one live database proof.

Outcome: no Critical. 3 High, 42 Medium, 131 Low confirmed (plus 7 the validators surfaced), 13
refuted with written reasons, 14 folded as duplicates, 8 left SUSPECTED with the exact runtime check
named. 292 clean checks recorded as the verified-clean map.

The three Highs: an unverified account can publish a plain post to the feed by sending saveAsDraft on
a non-letter kind (the gate reads the raw flag, the draft-effect requires kind==letter, and they
disagree — hand-confirmed); a Keeper can see anonymous Catch-up askers on the home surface that the
Round page correctly hides (M10 incomplete); and an admin mail "Retry" on a deferral-exhausted row
resets attempts but not deferrals, making an unkillable queued zombie that folds every future reset
for that member. The scariest Mediums: a refunded donation resurrects to "paid" (and re-grants a
bird) when Razorpay replays payment.captured, because the capture branch guards only status!=paid;
and a keyset cursor at a deleted/hidden row silently ends pagination across feed, letters, bell and
directory — proven live: Prisma's cursor comparison returns 0 rows when the cursor id exists in no
row, while a valid cursor returns the rest.

2,000-user headroom: comfortable. Connection budget correctly sized (pool 5 × ~40 instances = 200 =
Supavisor cap); DB is 112MB of 500MB (97MB of it the static Place gazetteer). Real watch-items are
Resend's 100/day free tier trailing a big launch day, the unbounded Visit table lacking a retention
sweep, and PostHog/Sentry free-tier ceilings. Scorecard: overall 7.6/10, launch-ready with a short
punch-list.

Honest limitation: input validation was audited by code-read, not live BLNS browser fuzzing; that
live naughty-strings pass is the one deferred brief item and the cheapest high-value follow-up. No
test account created, no rows written — every check read-only against the shared database.

## 2026-08-22 — Six items from the owner's round, plus three raised mid-session

Seven commits. The profile sheet, the picker's idea of Delhi, and the first half of the phone-app
work.

**The Done-button collapse glitch** (owner: "it shrinks but then it shrinks a bit extra and it
expands marginally a beat later") was real and had a measurable number. The occupation row reserves
6px inside its own animated height so the dotted PenRule under it is not clipped, and cancelled that
reserve with a static `-mb-[6px]`. Static was the bug: driven to `height: 0` on exit the padding's
+6px is gone but the margin's -6px is not, so the sheet settled exactly 6.00px short and jumped back
the frame AnimatePresence unmounted the node. Proved on the live page before touching anything, by
measuring the card at `height: 0` against the same card with the node removed. The margin now
animates on the same spring as the height, so the two share one progress curve. After: exit
undershoot 0.00px and monotonic, enter dips 0.00px, resting sheet unchanged at 445.13px.

Note for whoever hits this class of bug again: **a static offset cancelling an animated one is a
bug that only appears at the ends of the animation.** The give-away is a settle that overshoots by
exactly the offset.

**The organisation field cutting off text while typing** (owner: "the 'I' is getting hidden and cut
out") was two things, both reproduced with real keystrokes at 390x844. A PenValue is an `<input>`,
which is one line forever: past the width of its column the slot pins at `max-w-full` and the input
scrolls to follow the caret — measured scrollLeft climbing 6px, 26px, 100px, 173px, at which point
"Imperial" is off the left edge. Separately, the slot relocates whole to the next line at character
34, because an inline-block cannot break. Both halves of the occupation line are `PenBlock`
(a textarea) now, with a new `inline` option so they still stand mid-sentence; a textarea wraps,
which is also what the read-only sheet does with the same words. After: scrollLeft 0 at every length
to 64 characters, box grows to a second line instead. The line-relocation is unchanged and
unfixable without abandoning form controls; nothing is hidden by it now.

**Delhi and New Delhi.** The previous fix was an UPDATE, so it fixed the rows of the day and new
members went straight back to picking Delhi. The gazetteer holds Delhi (pop 11,034,555) and New
Delhi (pop 317,797) 3.4km apart, and the picker ranks exact-name-match then population, so "delhi"
put the eleven-million row under the cursor. It is a rule now, in `src/lib/place-aliases.ts`, keyed
by geonameid and never by name (Delhi, Ontario and Delhi, California are real places). Applied in
two places that close different doors: the search answers an aliased row with its replacement so the
choice is never offered, and `resolvePlaces` collapses it again at write time because the picker is
a suggestion and the gate is the gate.

Which meant fixing something else first: **onboarding never used `resolvePlaces`.** It had its own
placeSchema and its own cleaning loop, hence no lat/lng bounds and no check that placeId named a
real row — and it is the writer every new member goes through, which is exactly why the people
caught by this were the newest ones. Three writers, one gate now.

The migration also did the half the earlier merge missed: `User.currentCity` is a legacy mirror of
the first place that the feed's "New in the Directory" module reads directly, and three members had
a UserPlace saying New Delhi with a currentCity still saying "Delhi, Delhi". That is what the owner
was actually looking at. Nine place rows moved, nine currentCity values resynced (including
Bangalore/Bengaluru drift from the last merge). Seven unit cases pin the rule against a stubbed
gazetteer.

**Raised mid-session and done:** the Done button no longer moves while a field saves (34px measured;
`sm:flex-row-reverse`, so the save mark sits on whichever side is not the button's anchor at that
breakpoint). Every dotted pen rule now ends on a whole dash — it was a `repeating-linear-gradient`
tiling at a fixed 5px and stopping wherever the text stopped, so the last dash was a stub; one tile
plus `background-repeat: round` scales the tile so a whole number spans the box. The country code
slot hugs its text (51px → 22.4px, gap 29px → 4px) with the cap moved to `maxLength=4`.

**"Add it to your phone"**, under the dark mode tile, admins only, phones only, per the owner's
call. No service worker: Chrome's installability criteria are HTTPS plus a manifest with name, 192
and 512 icons, start_url and standalone display, all of which `src/app/manifest.ts` has shipped
since 2026-08-20. The `beforeinstallprompt` listener is registered from the authenticated layout,
not the tile — Chrome fires it once per hard page load and thirty seconds in, and the tile lives
behind Edit profile, so a listener attached on mount would catch nothing.

**The low-resolution app icon was not a code problem.** Every asset is already right and already on
`origin/main`: favicon.ico at 16/32/48, a vector `icon.svg` that modern browsers prefer for the tab,
apple-touch-icon at 180, and 192/512/maskable-512 for the manifest. They landed 2026-08-20; before
that the only raster icon on the site was the favicon, which is exactly the complaint. iOS and
Android snapshot the icon when the shortcut is made and never refresh it, so a home-screen icon
created before that date stays low-resolution forever. Removing and re-adding picks up the current
one — which the new Install button now does.

**The admin activity timeline needed no build either.** PostHog already runs with autocapture on,
pageviews on every client navigation and every signed-in member identified, so the per-person
chronological story is being recorded today. Persons are keyed by the opaque user id with only
accountType/batchYear/isOwner attached — deliberately no name or email — so looking somebody up
means pasting their id from their profile URL. Session replay stays off.

**One thing worth a decision:** the directory visual baseline went red twice today for things that
were not changes — once for a member's new city (Nuku'alofa) and once for sub-pixel map jitter with
identical cluster counts. It tracks live member data, so it will keep doing this. Masking the
markers would cost the test the thing it is for.

## 2026-08-22 — The app icon, in the site's own colours

The icon paints its three hills cream, sage and near-black. None of those is a colour the site uses
anywhere else, which is the whole reason it only ever looks right sitting on sidebar green: on a
dark tile the back hill is near-black on near-black and the mark loses its right shoulder.

`/lab/icon-colours` repaints the same geometry in the green, the cinnamon and the blue. Six orders
with green on the left (leaf / canopy / leaf-light, each with cinnamon and sky either way round),
four alternatives that were not asked for (three greens tonally, cream in front of the two brand
colours, depth run backwards with the far hill pale, and one flat white at three opacities), each on
paper, white, sidebar green and dark, then again at 32px and 16px. The favicon sizes are where most
of them fall apart, so they are on the same card rather than a section further down.

The three plane paths are now exported from `peaks-mark.tsx` as `PEAK_PLANES` instead of copied into
the room, so the preview can never drift from the shipped mark. The room's own corner radius is
computed per size (96 of 512); a fixed CSS radius had turned every 32px tile into a circle.

**Also shot, not committed:** the sidebar lockup with the mark in one flat colour instead of three,
desktop and mobile, against the current version. `#EBF3EE` (the sidebar foreground the wordmark
already uses) reads as one drawn logotype; pure white makes the mark brighter than the words beside
it. Both were temporary edits to `sidebar.tsx` and `logo-fact.tsx`, reverted after the screenshots.

**Unrelated red:** `npm run visual` failed on feed desktop. The diff is entirely inside "New in the
directory", which lists live members. Same class of false positive as the directory map on 2026-08-21.

## 2026-08-24 — Occupation and organisation, editable from the panel

The person page could show a member's `jobTitle` and `workplace` only through the "View profile"
link; every other field on that card was fixable in place. Two inputs now sit between Batch and
Bird, in the order the profile prints them ("Lawyer at Trilegal"), with the same 100-character cap
`profileSchema` puts on the member's own form and the same `titleCase` on save, so a correction
typed here cannot read differently from one typed there. Either half may stand alone or be cleared,
because the profile prints the "at" only between two real halves.

Labelled **Occupation** and **Organisation**, not "What they do" and "Where": the card immediately
below is "Where they are", and two fields a screen apart both asking "where" read as one question.

`revalidatePath("/directory")` was already in the action, which is what the directory's profession
filter needs.

**Not verified in a browser:** the read path is confirmed live (the inputs render the real values
off the database at both viewports), but the classifier blocked getting a session cookie into the
MCP browser, so the Save button was never actually clicked. The write is three lines added to the
`prisma.user.update` that already saves name, account type and batch year from the same button.

## 2026-08-24 — Fixing round two of the pre-release audit: phases 1 and 2, plus three more

Eight commits against `docs/planning/audits/bug-report-2.md`. The disposition ledger is
`docs/planning/audits/fix-ledger.md`; it is the handover between sessions and is current.

**Phase 1, all five.**

*Unverified publish (C-122).* `createPost` skipped the verified-member gate on the raw
`saveAsDraft` flag, but only stored a draft when the kind was also `letter`. A submission with the
flag and no kind therefore skipped the only enforcement of `emailConfirmed` and landed
`status: "published"`. One predicate, `isLetterDraft`, now answers both questions.

*Donation accounting (C-084, C-085, C-087, and C-151 with them).* Both confirmers admitted the move
to "paid" from anything that was not already "paid", so a re-delivered `payment.captured` or a
replayed browser callback put a refunded gift back on "paid" with a fresh `paidAt` and minted a
second bird pick. Stated positively now, as `PAYABLE_FROM`. Separately, the refund branch read no
amount at all: a hundred rupees back on a five thousand rupee gift erased the whole five thousand
from every money surface. `Contribution` gained `refundedAmount` and `reversalIds`; every aggregate
goes through `CONTRIBUTION_SUM`/`netPaise`, swept by a test. Migration
`2026-08-24-contribution-partial-refund.sql`, applied to both databases. Proved against Postgres:
a partial refund keeps the row on "paid" and subtracts exactly its paise, a re-delivered refund is
a no-op, and a capture arriving after a reversal moves nothing.

*Keeper anonymity (C-019).* The home page's inline Round declared `const askerVisible = p.showAsker
|| isKeeper` inside its map, shadowing the imported helper of the same name. Proved on the live
page: four anonymous questions handed their asker's name and bird to their Keeper before the fix,
none after. All four surfaces use the shared helper now, and `catchups.test.mjs` sweeps for a local
shadow or any spelling of a Keeper exception.

*Hidden letters (C-002).* `letters/[id]` tested `isHidden` above `canViewPost`, cancelling both
exemptions the rule grants above its own hidden refusal: the moderator's own Open link 404'd, and
the author had no route to their removed letter at all. The page also says "Removed by a moderator"
now, in the same shape as the draft notice; it used to say nothing.

*Mail retry (C-102).* Retry reset the status and the attempts and left the deferrals, so a row
retired by a provider outage came back queued and invisible to the drain forever. For a reset, which
folds, every later "forgot my password" folded into the zombie and returned without sending.

**Phase 2, the pagination cluster (C-005/C-124/C-162/C-171/C-056).** Proved against this database
what the audit could only infer: `cursor: { id }` on a hard-deleted row returns an empty array with
no error, and on a row that still exists but no longer matches the `where` it silently SKIPS one row,
because `skip: 1` then eats a real one. So the cursor stopped naming a row. `src/lib/keyset.ts`
carries the sort key instead, and the feed, the comment thread and the bell all page on values.
The directory keeps its M39 offset recovery: it sorts by name and batch, so it has no timestamp to
seek on. Verified end to end — the bell goes 20 rows to 23, its exact total, no duplicates.

**Two refuted by running the check.** C-096 (directory dead-ends at the NULL-batchYear region under
the batch sorts): walked all 63 rows one page at a time with a boundary inside the NULL region, no
dead end — Prisma 7's cursor compiler handles it. C-055 (a legacy admin note destroyed by the prune):
zero `/notice/%` notifications in either database, and `notifyAdminNote` has opened an AdminThread
before writing the bell row since the rewrite, so the note's text is never the notification's only
copy.

**Also fixed.** C-065: the retention sweep deleted `AdminMessage` rows without queueing their
screenshots, so the bytes orphaned unfindably; it collects then deletes in one transaction now.
C-175/C-176/C-177, the letters desk: the autosave timer guarded on state its own effect does not
depend on and fired mid-publish; the audience was sent but not watched, so choosing one and not
typing was never saved; and nothing survived the tab closing, so writing fluently and then closing
lost every word since the last pause. A `pagehide` handler writes the local copy synchronously now,
for resumed drafts too, and that copy is finally read back and offered on reopen.

**`npm run visual` is red on 7 of 20, and none of it is code.** The diffs are live data: different
members in "New in the Directory", a heart count that moved from 7 to 8, a new draft at the top of
Letters, a relative "just published" label on a Catch-up. The suite reads the shared production
database, so its baselines rot on their own between runs. Worth deciding what to do about, because
a suite that is red for reasons nobody caused is a suite nobody reads.

**Left for the owner.** C-135 (confirm Google Pay / UPI survives `payment=()` with a real test
payment), C-165/C-166 (PostHog and Sentry free-tier ceilings), C-186 (the demo project's cron env).

## 2026-08-24 (evening) — round-two fix session, phases 3, 4 and 5

Continued the bug-report-2 fix run. Phases 1 and 2 were closed in the earlier
session; this one closed **Phase 3 (uploads and orphaned bytes), Phase 5
(client-side races and autosave) and Phase 4 (Catch-ups lifecycle and
notifications)** — 27 findings in 23 commits, none pushed.

Every fix shipped its gate in the same commit, and every gate was proved by
reverting the fix and watching the test fail. Where a behaviour could be
proved against the real database or real R2, it was: a forced R2 refusal
queueing the right purge row, a two-file upload leaking an object before the
fix and none after, a photo removed from a draft actually leaving the bucket,
two concurrent avatar swaps orphaning one object under the old shape and none
under the new, a 40-day bin dropping off the retention due-list, succession
promoting the right member, a love notification reaching a member and not a
leaver.

**Phase 3** — C-063 (staged originals reclaimed on every refusal), C-064 (four
orphan paths: both upload loops, the photo row, the display+thumb pair, and a
photo taken off a draft), C-050/C-131 (avatar swap is a compare-and-swap),
C-069/C-152 (a refused delete leaves a worklist), C-067 (a turned photograph
keeps its full resolution: 22.7MP → 40.0MP), C-070 (a panorama encodes at
all), C-072 (too many pixels says so), C-066 (a blank MIME type is still a
photo), C-073 (every path that flattens an animation says so).

**Phase 5** — C-179/C-071 (Load more drops a stale page and dedupes),
C-133/C-178/C-010 (one `settledHeart` decision plus in-flight guards across
all five hearts), C-125 (a second device cannot replace a Catch-up answer).

**Phase 4** — C-020 (rejoining takes it out of the bin), C-021 (an empty Round
cannot open for answers), C-023 (the hat is handed on before the last head
leaves), C-144 (a monthly rhythm on the 31st stops skipping a month),
C-141/C-031 (one valley-day count for every countdown surface), C-025 (the
revoke no longer strips a group admin), C-026 (the manual nudge is metered),
C-027 (an answer cannot land in a closed Round), C-028 (extending a dormant
Round moves its deadline), C-029 (two questions in one slot render stably).

**Owner-visible copy change**: a Catch-up countdown one day out now reads
"closes tomorrow" where it read "last day", and the bell's one-day-out
reminder reads "Answers close tomorrow for X's Catch-up." The reminder BUCKET
is deliberately still counted in 24-hour blocks — it decides whether a nudge
fires at all — and the ledger says so at C-141.

**Still owed**: Phase 6 (113 Lows and 21 Mediums, including five test-coverage
holes), and the four owner-only items (C-135, C-165/C-166, C-186). The visual
suite is red on 8 of 20 routes from live data drift, not code — the diffs are
whole-page shifts from new content, and the directory, which nothing this
session touched, is among them. The owner still owes a decision on that.

**Trap learned**: `python3 -c "open(p,'w').write(open(p).read() + x)"` truncates
the file before it reads it. It emptied `fix-ledger.md` mid-session; rebuilt
from the last commit plus this session's rows. Read first, then open for write.

## 2026-08-25 — round-two fix session: the five test-coverage holes

Continued the bug-report-2 fix run. Phase 6 begins with the five findings that
were about the GATES rather than the code: a test that does not exist, a test
that lies about its reach, and a test whose header promises a generality its
hard-coded list does not have. They weaken every other gate in the repo, so
they went first.

- **C-187 — nothing tested session revocation at all.** The word
  `credentialVersion` appeared in no test in the repo, and the whole mechanism
  that ends a blocked, deleted or password-reset member's session was one
  inline condition in the NextAuth callback. The predicate now lives in
  `src/lib/session-revocation.ts` and is attacked as six cases, with two
  wiring tests beside them: the callback still calls it, and the session
  `select` still fetches every column it reads — derived from the rule's own
  source, so a new clause fails until the query fetches it. Four mutations
  proved it: flipped `!==`, dropped `isBlocked`, dropped the select column,
  guard removed.
- **C-193 — the C2 ownership sweep had already drifted.** It named two files
  under a title claiming "every write path"; `messages/actions.ts` was the
  third and unswept. It derives the list now. The first attempt was vacuous in
  this repo's favourite way: matching the bare name `ownedUploadUrls` passed
  against a file that still IMPORTED the helper and had stopped calling it.
- **C-194 — nothing pinned that the visibility guard is CALLED**, only that
  the rule is right. A new sweep requires every action naming a `postId` or
  `commentId` to consult `canViewPost`, or to sit on a written list of the
  ones authorised by authorship or the admin role. It found a live gap while
  being written: `reportPost` had no check, so reporting any post by id put
  its author's name into the reporter's thread. It guards now.
- **C-191 and C-192 — two headers that over-promised.** The cascade test's
  reachable-from-User walk is filtered through a fail-CLOSED subset assertion
  now (25 models, each with the reason it is that member's to lose), so a new
  communal model wired Cascade fails on the day it is written, which is what
  the header always claimed. The index test keeps its ten measured hot reads
  and gains a derived sweep over every `@@unique([aId, bId])` of real relation
  columns. Both were proved with the audit's own scratch models.

**Raised, not fixed:** generalising the index sweep exposed `GroupMember.userId`
— `loadSavedPosts` reads memberships by userId on every request with no index
to serve it, the same shape as B-090. It is exempted in the test with that
said plainly, and it wants a migration, which does not belong in a test
change. It is the first item in the ledger's open column.

## 2026-08-25 — a cancelled account deletion stays cancelled

**C-075.** The nightly retention sweep reads its due list once, then purges the
accounts one at a time, each in its own transaction — so minutes pass between
"this account is due" and "delete it". Signing in during the 60-day grace
window IS how a member calls the deletion off, and the purge erased them
anyway: irreversibly, rows and R2 bytes both, after the app had told them it
was cancelled.

The cutoff now rides on the DELETE rather than only on the due-list read, and
zero rows deleted rolls the whole transaction back — the group rehoming, the
image worklist, the cleared reports. A cancellation is counted as spared, not
as a sweep error. An admin's deliberate delete passes no cutoff and is
unchanged.

Reproduced live before the fix and after it, against the real database: three
concurrent cancel-versus-purge races under the old shape destroyed all three
accounts after a committed cancellation; five races under the new shape
refused all five. A re-read at the top of the transaction would not have
closed this — READ COMMITTED cannot see a sign-in that commits mid-flight —
which is why the condition is on the delete, where Postgres locks the row and
re-evaluates the predicate against the version that won.

## 2026-08-25 — the image optimizer stops working for strangers

**C-134.** `next/image`'s optimizer is reachable signed out (avatars render on
the login page) and it will fetch and transform anything `remotePatterns`
vouches for. That list carried `*.r2.dev` — which is every free, self-serve
Cloudflare bucket in the world. Anybody could host a large image on their own
bucket and drive `/_next/image?url=...` in a loop, once per unique URL, each
one a fresh fetch, decode and transform billed to this project's Vercel
account, until legitimate avatars degrade too.

`next.config.ts` now builds one named host list and feeds it to
`remotePatterns`, `img-src` and `connect-src` alike; it reads
`R2_PUBLIC_BASE_URL`, so the demo deployment needs no second edit.
`upload-shared.ts` had already made exactly this call, in writing — "the exact
host, not a `pub-*.r2.dev` wildcard: a wildcard would vouch for anybody else's
bucket" — and the two files now agree.

Proved against the running server: an arbitrary `pub-*.r2.dev` host is refused
with "url parameter is not allowed", the legacy host and the current one are
still accepted, and a real member avatar still optimises.

## 2026-08-25 — the directory's city chips, and a count that disagreed with its list

**C-091 — a city chip could lead nowhere.** Every city the directory offers as
a filter is a string read straight back out of the member's own row. The
filter then folded it through the gazetteer's normalizer — which strips
accents and drops a comma-qualified tail — and compared the folded key against
the unfolded column. Postgres folds case, never accents, so a member living in
"Zürich" was unreachable from the one chip that names their city, and so was
anybody whose row still carries a "Northfield, Minnesota". The picked value is
now the first thing compared, with the folded aliases (Bangalore/Bengaluru)
beside it. Reproduced live against a seeded row: nought members before, one
after, with all thirty-four real facets still full and both alias pairs still
agreeing.

**C-004 — the profile's counts answered a different question from its list.**
The tab numbers and the Photos grid were built from a hand-copied fragment of
the feed's where-clause, and the copy had lost three things: the batch arm,
the author's exemption from the city arm, and the author-standing filter. So a
count could sit above a list that did not match it, and a batch-targeted photo
could reach the grid of somebody outside its audience. One `audienceWhere`
builder now owns those arms and both surfaces compose from it.

Proved live: a batch-targeted post by an ISC-1978 member reached an ISC-1972
viewer's profile grid under the old shape and does not under the new, while
the author still sees their own. Swept every viewer-by-author pair in the real
data: no count changes today, because nothing batch-targeted exists yet, so
nothing on screen moves and the visual baselines are untouched.

## 2026-08-25 — two fields a member types, and what the app did with them

**C-040 — pasting an Instagram address produced a dead link.** The column is
meant to hold a bare handle, and every other social field tolerates a pasted
URL because it falls through to the "does it start with http" check.
Instagram did not: it was prefixed unconditionally, so a pasted
`https://instagram.com/ananya` rendered as
`https://instagram.com/https://instagram.com/ananya` and displayed as
`@https://instagram.com/ananya`, on the public profile. One
`instagramHandle` reducer now runs on the way in and on the way out — the
write so the column stops collecting URLs, the read so rows that already hold
one are fixed without asking anybody to retype. The three real Instagram
values on the site today are plain handles and are untouched.

**C-043 — signup accepted the impossible pair the profile editor refuses.** A
batch year earlier than the year you left is the two fields swapped, and the
editor says so. Signup checked only left-before-joined, so that pair went
through and `batchTypeFromLeaving` returned null for it — an account with no
batch type, outside every batch-targeted post and mis-joined to its batch
group, with nothing on screen to explain it. One `yearClashMessage` rule now
answers for both writers.

**Copy change worth knowing about:** signup's left-before-joined refusal now
reads in the editor's words, "You cannot have left before you joined. Check
the other year too.", rather than its own sentence.

## 2026-08-25 — a teacher can be mentioned by name

**C-006.** `/api/users/search` held teachers out of every result, under a
comment saying its only consumers were the Catch-ups people surfaces. They
were not: the composer's @-mention dropdown shares the same endpoint, and
picking a name from it is the only way to insert a mention. Teachers post to
the feed and write letters like anybody else, so wanting to mention one is an
ordinary thing to want, and it was impossible.

Catch-ups is an alumni feature, so the rule now lives with the surface that
has it: the two Catch-ups pickers ask for `alumniOnly=1` and the endpoint
hides nobody unless asked. Opt-in on purpose — a caller that forgets the flag
gets more people, never a narrowed list it cannot see is narrowed.

Proved against the running server with a real teacher's name: the composer's
dropdown returns them, the Catch-ups picker still does not.

## 2026-08-25 — notifications that lead somewhere

**C-052 — the feed never scrolled to the post a notification named.** Every
like and comment notification on a plain post links to `/feed#<id>`, and
nothing read the fragment: the feed fetches its posts after mount, so at the
moment the router commits there is no card with that id. The member landed at
the top of the feed with no idea which post was meant. The feed now scrolls to
that card and rings it for two seconds — a canopy ring drawn on a
pseudo-element, so only opacity animates.

Two ways to get this wrong, and the first two attempts hit both. A callback
beside `setPosts` runs before React has committed the cards, so the lookup
finds nothing and fails silently, which looks exactly like the bug. And
tapping the bell while already on the feed changes only the fragment, which is
a same-document navigation: nothing remounts and no effect re-runs. Both are
now handled and both are pinned in `e2e/deeplink.spec.ts`, which I watched fail
with the second half reverted.

**C-054 — bell rows outlived the letters they pointed at.** Delete or hide a
letter and "X replied to your comment" still sat in somebody's bell pointing
at a page that answers 404 — for up to a year, since notifications are kept
until the 365-day sweep. Catch-ups has cleared its own notifications since it
was written; the feed never did. The cleanup now lives inside the delete
helper, so a third way to delete a post cannot forget it, and a moderator's
hide clears everybody's rows except the author's, because the author can still
open the post and read the notice there.

**Also visible:** the deep-linked post gets a brief green ring. Screenshotted
at both viewports. `npm run visual` is red on the same eight routes as before
(feed, directory, letters, catchups at both sizes) and no others — still the
live-data drift the owner owes a decision on, not this change.

## 2026-08-25 — analytics stops being handed everybody's session token

**C-198**, which the audit could only mark as needing a live check. It does
not any more. `posthog-js` fires at the same-origin `/ingest` path — the whole
point of that path is that an ad blocker cannot see a third-party hostname —
and a same-origin request carries every cookie this site has set, the HttpOnly
session token included. The rewrite then hands the request on.

I pointed the rewrite at a local echo server and signed a real browser in. The
full `authjs.session-token` arrived at the destination on every analytics
request. The comment beside the rule in `proxy.ts` had said, in writing, that
these requests "carry no session by design".

The strip happens in the proxy, because a rewrite cannot edit headers:
`/ingest` and everything under it now lose their cookie header before the
request goes anywhere. Re-ran the echo test — nothing arrives. Then put the
real destination back and confirmed PostHog still accepts a live event
(`200 {"status":"Ok"}`), still serves the SDK bundle, and that the feed renders
with no console errors. PostHog identifies events from the payload, never from
our cookies, so there was never anything to lose by this.

One honest limit: this proves the local path. On Vercel the rewrite itself is
served by their infrastructure and I cannot watch it from here — but the strip
runs in middleware, which does run there.

## 2026-08-25 — the Visit table: whose row it is, and how much of it there may be

**C-163.** A visit's id arrives in a request header the proxy fills from the
caller's own cookie, and the write was an upsert keyed on that id alone. Two
consequences: replaying somebody else's id wrote into their row — their view
count, their endedAt, their device and their city — and a signed-in caller
rotating the cookie on every request minted one row per page view for ever,
with nothing anywhere to stop it. About 660,000 rows fills the free-tier disk
and takes the database read-only for everybody.

The write is now update-then-create with the update scoped to the member as
well as the id, and a new row is only opened if this account has opened fewer
than forty today — a number an ordinary browser, which carries one sliding
thirty-minute cookie, never approaches. Proved against Postgres: the wrong
member's scoped update touches nothing where the old shape touched a row and
incremented its count; the create that follows loses to the primary key. Then
re-proved the ordinary path with a throwaway member — two page views, one row,
two views, entry path kept and last path moved.

**C-164.** Presence telemetry was kept 180 days as margin: double what any
chart reads. Margin on the fastest-growing table in the schema is what puts it
over the plan — at this project's own stated scale that is over half a
gigabyte of Visit rows against a 500MB database the gazetteer already spends
97MB of. Cut to 90 days, which is exactly the deepest lookback any analytics
view uses, so the rows it removes are the ones nothing can reach and no answer
the owner can get today gets shorter. The gate derives that lookback from the
analytics queries themselves, so deepening a chart fails the build until
somebody decides about retention rather than silently reading swept rows.

## 2026-08-25 — the demo stops blaming the network for its own rules

**C-044.** Editing a contact field in the demo failed with "That did not save.
Check your connection." Nothing was wrong with the connection: the demo's
write allowlist did not contain `showEmail`, `phone` or `phones`, and the
contact action writes all three on every save whatever the visitor actually
touched — so changing an Instagram handle was refused by the Prisma layer,
which throws, which the profile's autosave prints as a network error. Same for
the admission number, and for removing a photo.

All four are ordinary scalar columns a visitor is meant to edit, and they are
on the list now. `photoUrl` deliberately is not — it is an upload output and
the demo takes no uploads — so removing a photo refuses in words at the front
door, the way uploading one already did.

The gate derives the columns the contact editor writes from that action's own
source, so a new one fails the build until somebody decides whether the demo
may have it. Not exercised against the demo deployment itself, which is a
separate project and database.

## 2026-08-25 — a chargeback the owner wins counts again

**C-086.** When a supporter's bank opens a dispute, the webhook moves that
contribution out of "paid", and every money surface — the public recovery bar,
"Given, all time", the supporter's own history — stops counting it. Nothing
anywhere moved it back. So a dispute the owner WON, money that never actually
left the account, stayed un-counted for ever, and the only way to correct it
was raw SQL against the live database.

`payment.dispute.won` and `payment.dispute.closed` now return the row to
"paid", conditional on it still being disputed and deduped against a
re-delivery, with an audit line — the one event in the whole app that moves a
money total upwards after the fact, so the owner hears why from somewhere
other than a total that quietly grew. A LOST dispute is deliberately still
ignored: un-counted is the right answer for that one.

One imprecision, written on the function rather than hidden: a dispute is
recorded as the whole payment, so a partial refund that happened before the
chargeback cannot be told apart from it and comes back too. Telling them apart
needs a column of its own; the audit line names the paise that moved.

Proved against Postgres with a throwaway row: the first delivery moves it to
paid with nothing withheld, the re-delivery moves nothing.

## 2026-08-25 — three unattended paths that gave up quietly

**C-108 — the mail drain's lease lapsed exactly when it mattered.** One pass at
a time, fleet-wide, is what stops the queue mailing a provider that rate-limits
at two requests a second. The lease lasted 45 seconds and a worst-case pass —
eight sends each timing out at ten — takes eighty, so during a brownout, the
one condition the lease exists for, a second pass took it mid-flight and the
two ran together. The pass now renews the lease before every send and stops if
it has lost it. Renewal rather than a longer lease deliberately: a lease sized
for the worst case would stall the queue for eighty seconds every time an
instance was frozen mid-drain. Proved against Postgres.

**C-161 — the confirmation banner promised a time it could not keep.** It
prints a clock time, "your link goes out tomorrow at 5:30 am", and the value
behind it was the next UTC midnight for everybody, with no term for how many
people were in the queue. The drain is oldest-first, so on a launch day with
three hundred signups the person at position two hundred was told tomorrow and
waited three days. The ETA now counts the confirmations actually ahead of this
one and divides by a day's budget.

**C-149 — the Catch-up clock's failures reached nobody.** `advanceEdition`
never re-throws, on purpose, so its callers' Sentry reporters could not see a
per-edition failure, and its own catch only wrote to the console — which on
Vercel is a line nobody reads. Round-opening failures were reported and
round-advancing failures were not: the Round simply stops moving while the
countdown carries on counting down. It reports now, and the gate sweeps every
catch in the file rather than pinning that one.

## 2026-08-25 — the Medium tier is closed

Twelve commits, none pushed (sixty in total are now unpushed, going back to 2026-08-23). `npm run check` green throughout (65 test files).
`npm run visual` red on the same eight of twenty-three checks it was red on
this morning — feed, directory, letters and catchups at both viewports, all
live data drift — and on nothing else.

**What closed.** The five test-quality gaps first, because they weakened every
other gate in the repo: session revocation had no test at all, the C2
ownership sweep named two of three write paths, nothing pinned that the
visibility guard is CALLED, and two test headers promised a generality their
hard-coded lists did not have. Then every actionable Medium: the purge that
ignored a cancellation, the open image proxy, the city chip that led nowhere,
the profile count that disagreed with its list, the pasted Instagram link, the
impossible pair of years, the teacher nobody could mention, the notification
that scrolled nowhere and the one that led to a 404, the analytics proxy
carrying everybody's session token, the Visit table's two problems, the demo
blaming the network for its own rules, the chargeback the owner wins, and
three unattended paths that gave up quietly. Four more Mediums turned out to
be duplicates of those.

Seventy-four of the run's findings are now disposed of. What remains is 121
Lows and four items only the owner can do.

**Two things found while fixing, not in the report.** `reportPost` had no
visibility check — writing the C-194 sweep is what surfaced it — so reporting
any post by id put its author's name into the reporter's thread. And
generalising the index test exposed `GroupMember.userId`, read on every
request by `loadSavedPosts` with no index to serve it; that one is written
down in the test's own exemption list and handed to the next session, because
it needs a migration.

**The trap that cost the most rounds**, and it is the same one as last
session's: a shape test that greps for a function NAME passes against a file
that only IMPORTS it. It went vacuous three separate times today before each
gate was proved by reverting the fix. A per-file sweep has a second version of
the same hole — it passes when a file has two takedown paths and you only
fixed one. Count the sites, don't detect them.

## 2026-08-25 (later) — the long tail, part one: the feed's write paths

The last session of the run. Everything above Low was closed; what is left is
121 small findings, worked in FILE order rather than id order so a module is
opened once.

**The feed's writes (C-018, C-003, C-009, C-015, C-016, C-017).** Six findings
in one file, and four of them are the same shape: a query that answers a
slightly different question from the one the surface is asking.

Deleting a post purged every url it named, whether or not another post still
named the same one. `images` is caller-supplied JSON and the ownership check
only vets the prefix, so attaching one own-upload to two posts and deleting
the first left the second's photograph 404ing — the exact "live post with
broken pictures" this function was written to prevent, reached from the other
side. It now queues only the urls no surviving row names, matched inside the
delete's own transaction. Proved against Postgres with two posts sharing one
image: the shared byte survives, the solo one goes.

The count on a card and the list in a thread were two different questions. The
four `_count.comments` fragments filtered on hidden + deleted; the thread also
required the author to be in good standing. A post whose only comment came
from a since-blocked member showed "1" and rendered nothing. `VISIBLE_COMMENT`
now lives in `src/lib/posts.ts` and both halves spread it.

The double-submit guard matched author, text, kind and status — not the
photographs, the letter's title or the poll. Two pictures shared seconds apart
under "Reunion!" were one post, and the composer said "Post shared!" about the
one it dropped. The window query is now a shortlist that `isPostTwin` settles.

`escapeLike` clamps at 100 characters before escaping (before, never after: cut
an escape pair in half and Postgres refuses the pattern outright). That one
line covers the feed, the directory, the Collection, users-search and admin
search, none of which capped the term and all of which are unmetered reads.

**Two are member-visible.** Replying to a reply notified the ROOT comment's
author while the composer said "Replying to <somebody else>"; the person whose
name was on screen heard nothing. The composer now sends the tapped reply's id
and the server notifies its author — the stored parent is still the root, so
the thread looks exactly as it did. And a letter draft scoped to a city the
author had since removed from their profile silently widened to Everyone on the
next autosave keystroke, chip still reading "X only". That save is now refused
with a sentence saying why.

Gate: `src/lib/feed-write-rule.test.mjs`, eighteen assertions, every one proved
by reverting its fix and watching it fail.

## 2026-08-25 (later) — the long tail, part two: Catch-ups

Ten findings pointed at Catch-ups. Four were already closed by the Mediums
above them -- checking first is the whole reason the ledger exists -- and two
more did not survive being looked at.

**The demo's flagship flow could never finish (C-113).** "Start a Catch-up" is
a permanent button on the demo's Catch-ups index and /catchups/new is
deliberately open, but the creating transaction's first write is
`group.create`, and Group and GroupMember were not on the demo's write
allowlist. So every attempt died on the guard and told the visitor "Something
went wrong. Please try again." -- for ever, on the one flow the demo exists to
show off. Both models are now allowed; the reset already wiped all three group
tables. The gate derives the model list from the transaction itself, so a
write added later cannot quietly re-open the hole.

**A phase that slips a whole day, about half the time (C-142).** Every
deadline is minted as `now + N days` where `now` is whenever the day-0 tick
happened to run, and the day-N tick runs at its own offset. Fire a second
earlier than day 0 did and `t >= deadline` misses, so the Round waits another
twenty-four hours. Magnitude does not matter; sign does. `TICK_GRACE_MS` is
five minutes -- more than any scheduler's wobble, far less than the hours the
shortest phase is measured in -- and it lives in `computeStatus`, so what the
tick does and what the page says stay one function.

**A photo that came back after being removed (C-182).** The upload handler
closes over the `images` prop from before its await, so removing a photo
mid-upload was undone the moment the upload landed, and the parent autosaved
the resurrected list. It reads a ref now. Remove stays live during an upload
on purpose: waiting for someone else's photo to finish before you can undo
your own is the worse answer.

**The invite link had no loading boundary (C-139).** It is the one async
database route outside `(main)`, so nothing above it applied and a stranger
opening a forwarded link on a cold function watched a blank tab. Its skeleton
is the page's own Shell with the wordmark real from the first frame; every
block is the real element's line box, and the width at which the paragraph
stops wrapping to five lines (472px, where the card stops shrinking) was
measured in the browser rather than guessed. Checked at 1440x900 and at a true
390x844.

**One refuted by asking the database (C-127).** Two comments in this codebase
contradicted each other about whether `upsert` is atomic. It is: Prisma 7.9
emits `INSERT ... ON CONFLICT DO UPDATE` for this shape, and 75 deliberately
simultaneous first-writes produced zero violations. The comment claiming
otherwise was the wrong half and now says what Postgres actually does. The
P2002 catch stays as cheap insurance, no longer as the thing holding the
toggle up.

## 2026-08-25 (later) — the long tail, part three: the edge boundary

Seven findings about `src/proxy.ts` and the two config files beside it. It runs
before every request, so everything it gets wrong is invisible from inside the
app.

**The site had no crawl policy (C-203).** No robots.ts, no sitemap.ts, and
neither filename excluded from the proxy matcher, so a crawler asking for
/robots.txt was redirected to /login and read the sign-in page as the policy.
There are now both, and both are past the matcher. Everything is disallowed
except the seven pages a stranger is meant to find; the demo disallows all of
itself, because two copies of the same site competing in search results is
worse than one. The sitemap is hand-written on purpose: derived from the route
tree it would be one refactor away from publishing the directory. Its gate
checks every url it lists against `publicPaths`.

**A cron that could never succeed (C-111, C-136, C-201).** One vercel.json
ships both crons to both Vercel projects, and /api/demo/reset was missing from
publicPaths -- so the nightly cookieless GET was 307'd to /login before the
route's deliberate 200 no-op could answer. That no-op exists precisely so the
run reports success instead of raising a failed-cron alert, and a permanently
non-2xx nightly job is exactly what teaches somebody to stop reading cron logs,
which is where a real tick failure would hide. The gate derives the cron list
from vercel.json, so a fourth one cannot drift out again.

**An API that answered in HTML (C-202).** Every gated path was redirected to
/login, /api included -- and a `fetch` cannot act on that. The browser follows
it, `res.ok` is true, `res.json()` throws on the login markup, and the member
is shown a generic failure for what is really "sign in again". /api/* now gets
a 401 in JSON. Pages still redirect, destination in tow. Verified live:
/api/places/search went from a 307 to `401 {"error":"Not authenticated"}`.

**Two small route facts.** A tokenless /catchups/join fell through to (main)'s
/catchups/[catchupId] and gave a lost link a generic 404 or a login bounce, on
a path the proxy deliberately opens; it has its own page now, saying what the
[token] page says about a link it does not recognise. And the browser chrome
colour was a static export, so once dark shipped, dark-theme members got
warm-paper Safari chrome around a charcoal app -- the exact mismatch the
constant exists to prevent, inverted. It reads the cookie now. Both verified
in the browser, at 1440x900 and 390x844.

**Two refuted by reading node_modules.** C-132 and C-184 both claimed
`skipTrailingSlashRedirect` makes every trailing-slash URL 404. It suppresses
the client-facing 308 and nothing else: `removeTrailingSlash` runs
unconditionally before route matching.

## 2026-08-25 (later) — the long tail, part four: the doors

Eleven findings on the paths somebody reaches when they cannot sign in. There
is no second door behind these, which is why a Low here is worth more than its
label.

**A blocked member could complete a password reset (C-033).** Nothing in the
reset flow read `isBlocked`: the mail went out, the link worked, the password
was written, and the screen said "we are signing you in now" -- and then
`authorize()`, the only gate that checks it, refused with "Invalid email or
password", which bounced them back to /login where the new password was refused
again. An endless loop that told them nothing true. The reset now queues no
mail for a blocked row while answering exactly as it answers everything else,
so the identical `{ ok: true }` that stops this being a membership oracle is
preserved. Proved end to end against the running server: same account, same
form, one mail queued unblocked and none blocked.

**A committed password change could still look like a failure (C-035).** Four
post-commit writes were plain awaits with no catch, under a comment claiming
the mail was "never awaited for success". A pool timeout in any of them threw
out of the server action, so the member watched "Saving..." for ever with no
way to know the password had in fact changed -- and the token was already
burned, so trying again said the link was used. They sit in a try now, with
`reportSwallowed` as the witness.

**Three auth forms could strand on a disabled button (C-034).** reset,
forgot-password and resend-confirmation all awaited a server action bare, so a
rejected dispatch skipped every line after it, including the one that
re-enables the button. They go through `callAction` like everything else.

**A valley clock printed as if it were yours (C-037 and its three
duplicates).** Three separate docstrings claimed the send time was formatted in
the reader's timezone; the code pins it to Asia/Kolkata. The comments invited a
later session to "restore" browser-local formatting and re-break a day
comparison that had already been fixed. Corrected, and the member-facing time
now says IST -- a member in London was reading a valley wall time as their own
and would have checked an empty inbox at the wrong hour.

**One written down rather than changed (C-032).** The session is an ABSOLUTE
thirty days, not the rolling one NextAuth documents: the refresh rides on
Set-Cookie headers from GET /api/auth/session, and `auth()` takes the RSC path,
which reads the body and drops them. There is no middleware, no SessionProvider
and no useSession anywhere. So every member is signed out thirty days after
signing in, however often they visit, and a launch cohort hits it together.
That is a defensible posture and a recoverable re-login, so it is the owner's
call rather than something to change quietly -- **owner decision needed.** It
is now stated beside the config, with the note that revocation does not depend
on it.

**Two refuted.** C-038 (a password-null account being stranded) is latent: no
production path mints one. C-036 (a mail scanner auto-confirming an address) is
a documented decision that grants an attacker nothing they could not get by
confirming their own address.

**A probe lesson worth carrying.** Proving C-033 in a browser failed three
times in a row, always looking like the fix worked. Two separate reasons, both
of which produce a convincing zero: the reset limiter is per-IP, so the second
submission was refused BEFORE the isBlocked branch (fixed with a distinct
`x-forwarded-for` per run); and `page.fill` before hydration sets the DOM value
of a CONTROLLED input without React ever seeing it, so the form posted an empty
address and the action returned early. React does not overwrite a value already
in the field when it hydrates, so the field looks right the whole time. The
tell is the confirmation screen, which echoes the address out of React state --
assert on that, and wait for React props on the form before typing.

## 2026-08-25 (later) — the long tail, part five: the directory

Nine findings, six real, and five of the six are the same shape: a number
produced by one query beside a list produced by another, with a rule in one
half and not the other. On the one page whose entire job is telling people
apart, that is worse than it sounds.

- **A tile that lied about its own contents (C-095).** The batch tile counts
  exclude faculty; the filter behind the tile did not. `accountType` and
  `batchYear` are written independently by the admin editor, so flipping an
  alumnus to ex_teacher keeps whatever year the row had. The tile said N and
  opening it listed N+k. Proved live: batch 2023 now says 37 and lists 37.
- **Two filters, one of them ignored (C-093).** `where.accountType` was
  assigned twice, and the second won: year=faculty + type=alumni always
  resolved to plain alumni, while both tokens sat on screen and the grid was
  headed "Faculty". It is one fold now, so a contradiction returns nothing --
  honest, and legible because both tokens are there to explain it.
- **A heading over the whole membership (C-099).** The page read the year with
  bare `Number()` while the query used `parseBatchYear`. `?year=1800` is truthy
  to Number, so the page called itself filtered and headed 63 people "Batch of
  '00" -- a filter you could see and were not getting. One exported parser now
  serves both. The first screenshot caught that the fix was half-done: the chip
  is rendered by the client from `initialFilters`, so that had to carry the
  APPLIED filters too, not the raw params.
- **Pins that led with the wrong people (C-092).** Postgres orders NULLs first
  on a DESC column. The M38 fix put `nulls: "last"` on `directoryOrderBy` and
  its sibling query never got it, so a pin's visible twelve filled with rows
  carrying no batch year at all. Every batchYear desc sort now declares it, and
  the gate sweeps for them rather than pinning the one that was wrong.
- **An escape link that reached a fraction of what it counted (C-098).** A pin
  is an 11km grid cell and two towns can share one -- Hyderabad and
  Secunderabad do. The count aggregated both; the link named whichever resolved
  first. A pin carries its whole cell now. The unmapped bucket's "See all"
  is gone rather than falling back to /directory, which lists none of them.
- **The search nobody was recording (C-097).** `SearchScope` declared
  "directory" and the analytics grouped by it, but nothing ever wrote one --
  because a comment said the directory filters in the browser, which was never
  true. Its gate derives the scope list from the union, so a declared scope
  with no writer fails.

Three refuted: C-094, C-100 and C-170 all claim an uncapped search term is a
DoS. Right about the mechanism, wrong about the cost -- the tables are small,
the endpoints are gated and rate-limited, and a long LIKE needle fails FASTER
per row, not slower. (The feed and directory terms are capped anyway now, by
C-015 earlier today.)

## 2026-08-25 (later) — the visual suite stops crying wolf

Not a finding: this came out of verifying the directory work. `npm run visual`
went from the documented 8 red to 12, and the four new ones were mobile
collection, support, birds and about -- pages nothing had touched. The diff on
each was a handful of pixels in one place: the notification bell's unread
badge, which sits in the mobile header of every route and changes the moment
anybody comments on anything. The suite was reporting somebody else's activity
as a regression on four unrelated pages.

Masking it turned up a real defect behind it. The header variant of the bell
has no `sr-only` label -- only the sidebar variant does -- so its accessible
name is whatever the badge says, literally "1", or nothing at all when the
count is zero, since `title` only fills in where there is no other content. A
screen reader announced a bare number with no clue what pressing it does. That
is why `getByRole("button", { name: /notifications/i })` matched nothing and
the first mask silently covered no pixels at all.

So: the label is added (invisible, no layout change), the bell goes into
`volatileRegions()`, and the four baselines whose only diff was that badge are
rewritten. Back to exactly the documented 8, all of them the live-data drift
still owed a decision by the owner.

**The lesson**: a Playwright mask whose locator matches nothing does not fail.
It passes, covers no pixels, and the test goes on failing for the reason you
thought you had just masked. Check the -actual.png for the magenta block before
believing a mask worked.

## 2026-08-25 (later) — the index the last session handed over

`GroupMember` carried one index, the composite unique `(groupId, userId)`.
Postgres can only use a composite when the LEADING column is constrained, so
`where: { userId }` alone could not touch it -- and `loadSavedPosts` asks
exactly that on every request, which is B-090 all over again. The previous
session found it while generalising the index sweep and wrote it into the
test's own exemption list rather than leaving it silent, because it needed a
migration.

`@@index([userId])`, applied to both databases, exemption removed so the
derived sweep covers the column rather than carrying an excuse for it. Proved
live: EXPLAIN reports `Index Scan using "GroupMember_userId_idx"` where it was
a sequential scan. Not urgent at today's size; a full scan of a few thousand
rows on a page load at the 2,000-member ceiling this audit is sized against.

## 2026-08-25 (later) — the long tail, part six: reporting

Four findings on the two report paths. One was already closed (C-001:
`canViewPost` went in with the C-194 work). The other three are all about the
same few lines.

**One complaint could look like a pattern (C-060).** `Report` carries a unique
on (reporterId, reportedUserId), which was meant to be the one-open-report
rule. It is not: a POST report leaves reportedUserId NULL, and Postgres treats
NULLs as distinct, so that index constrains member-to-member reports and
nothing else. The rule lived in a findFirst instead, which under READ COMMITTED
two simultaneous submissions both pass -- two reports, two admin threads, two
notifications, from one person double-tapping. That is the exact effect M29 set
out to stop, surviving M29.

M29 declined a unique index because the live table already holds duplicates
from before the rule and a full constraint would mean deleting moderation
records. A **partial** one does not: it covers only PENDING post reports, so
every resolved row stays exactly where it is, and a post going wrong again
still files a fresh report. Zero conflicting rows in either database. Proved
live: three simultaneous reports leave one report and one thread where the old
shape left three of each.

**A report that reached nobody, for ever (C-007).** The Report row, its
AdminThread and the admin notification were separate awaits. A pool timeout
after the first left a pending report with no thread -- and the dedupe above it
selected `thread.id` and ignored that it was null, so every retry answered
"already reported, an admin is looking at it" while it sat on nobody's desk.
They are one transaction now, in both report paths, and the dedupe repairs a
thread-less report rather than reporting success over it.

**A dead end at the end of a 500-character field (C-013).** The details box
advertised 500 characters; the submitted string is `"<reason>: <details>"`, and
the server refuses anything over 500 with a flat "Please provide a valid
reason". Somebody who did exactly what the field invited got a refusal naming
nothing to fix. The box's cap is derived from the longest reason now, so adding
a longer one cannot re-open the gap.

## 2026-08-25 (later) — the long tail, part seven: the pen

Five findings on the inline profile editor, and four of them are one sentence:
`updateProfileField` is the ONLY live editor of these columns, and every bound
in it was typed out locally rather than taken from the schema every other
writer uses. So the loose numbers were the ones that shipped and the shared
ones were unreachable -- jobTitle and workplace at 120 against the schema's
100, admission numbers to 100000 against 10000, and a flat year ceiling of 2100
against `yearField`'s per-parse valleyYear()+ahead, which exists precisely so
the ceiling tracks the clock. The letterhead's own name box carried
`maxLength={80}`, re-creating on the client the exact lockout Low 84 fixed on
the server: a member whose name signup had accepted could not finish typing it.

The schema decides now and this file keeps the sentence, because Zod's "Too
big: expected string to have <=100 characters" is not how anything else here
talks to a member. Verified live that the pen still saves, and that every bound
refuses exactly what the schema refuses.

**Five 500s that should have been refusals (C-174).** A `"use server"` export
is a network-callable POST and its parameter types are erased, so a crafted
call sending a number where a string is declared reached `.trim()` and threw --
a digest in the logs instead of a sentence on screen. Guarded at all five
sites: the pen's value, BOTH report paths' reason, the deletion re-auth
password (a `formData.get` that can return a File), and the two
`Math.trunc(loaded)` paginators, where a non-finite offset reaches Prisma.

**Autosaves that raced each other (C-045).** `useAutoSave` counted in-flight
writes but never ordered them, and the places picker commits on every change
into a wipe-and-recreate transaction. Two edits a moment apart each deleted
what they could see and then inserted; the `@@unique([userId, position])` --
which exists for exactly this -- aborted the loser. Nothing was corrupted, but
the loser showed "check your connection" over a save that was fine, and which
list survived came down to timing. The queue is chained now. A failed places
save also refreshes: a refused wipe-and-recreate leaves the OLD list on file
while the screen shows the new one, which is the one state where keeping the
local copy tells a lie.

## 2026-08-25 (later) — the long tail, part eight: conversations

Nine findings on member-to-admin threads. Two themes.

**A flag cleared for something nobody had seen (C-053, C-061).** The unread
mark is the only signal either side gets that a message exists, so clearing it
wrongly does not degrade a surface -- it deletes the message from everyone's
attention. "Sorted" cleared `adminUnread` unconditionally, so a member reply
that committed after the admin's page rendered went straight into the closed
pile with nothing anywhere saying it had arrived. And all three mark-read paths
cleared the flag for messages that arrived between the page's query and the
write, so they were never rendered and never marked. Closing is not reading
now, and every clear is scoped to the newest message actually on screen.

**A list cut with nothing on the page to say so (C-058, C-081).** B-200 fixed
this once on the admin side. The member's own /messages kept a bare `take: 60`,
and the admin's OPEN query had no cap at all -- on the reasoning, written into
the file, that open threads are the work queue and are never hidden. That does
not survive what actually lands in the table: nothing auto-closes a thread and
`openAdminNoticeThread` opens one per moderated post, comment and photograph,
so the queue fills with rows nobody needs to act on and every render fetched
all of them with their member and last message. Both are capped now, both with
a count and a "Show N older".

**Three smaller ones.** Sending a message twice sent it twice and paged the
admins twice -- the composer guards on `sending` STATE, which binds on the next
render, so Cmd+Enter key-repeat plus a click got past it and two tabs never saw
it. Both write paths carry the server twin guard now. A member whose posts an
admin removed in a burst had those admin-opened notice threads counted against
their own new-thread budget, so they could not write to say what they thought
about it. And `deriveSubject`/`previewOf` cut at UTF-16 code units, splitting
emoji into replacement diamonds in stored subjects; they cut on graphemes now
while keeping the same width budget, because counting graphemes instead would
have silently doubled an emoji subject's length -- a different bug.

## 2026-08-25 (later) — the long tail, part nine: the machinery nobody watches

Eighteen findings across the mail queue, the nightly sweep, the account purge
and the rate limiters. They share a shape: these paths run with no human on
them, so a failure has no symptom until somebody asks where their email went.

**Three ways the queue could lie.** The fold path -- what a member pressing
"resend" hits -- returned above `scheduleDrain()`, so the one route most likely
to be used to poke a stuck queue was the only one that never poked it. A dev
machine with `EMAIL_DEV_SEND=1` and no API key printed the link to its terminal
and then marked the row `sent`, which is the one lie this table cannot recover
from, because nothing ever looks at a sent row again. And a row deferred by
RESEND's own quota -- a different ceiling from this app's budget, invisible in
its arithmetic -- fell through to a banner reading "A link has been sent to
your email", for up to twenty-four hours, about a message that had not been
sent. All three closed; "imminent" now has to be within ten minutes to be
called that.

**Silence, in four places that matter.** Every drain swallow point logged to a
serverless console nobody reads; they report now. `takeDrainLease` read ANY
error as "somebody holds the lease", so a database that had stopped answering
looked exactly like a busy queue and the drain quietly stopped. And the three
rate limiters fail open by deliberate design -- an Upstash outage must not lock
everyone out of signing in -- but with console-only evidence, that same outage
silently turned off every limit in the app, including the ones in front of
sign-in and password reset, with the abuse they prevent as the only symptom.
Throttled to one report a minute per limiter, because a failing backend fails
on every request.

**A leak that could not be recovered from (C-076).** `collectImageUrls` says it
reads inside the purge transaction so nothing uploaded in between can slip
past. That rests on the isolation level, and the transaction set none -- so
under READ COMMITTED a post committed mid-purge was invisible to the collect
and then cascaded away, leaving bytes no row names. Nothing in this system can
enumerate the bucket, so those bytes are unreachable for ever. RepeatableRead
now, which turns a leak into a retry.

**A transcript deleted, its cover left behind (C-062).** AdminMessage cascades
FROM AdminThread, not toward it, so the 730-day sweep emptied conversations and
left the shells -- each carrying `subject`, which is DERIVED FROM THE MEMBER'S
OWN FIRST MESSAGE. The one line retention existed to remove was the line that
outlived it. Proved in a rolled-back transaction against the real database: the
aged-out thread goes, a thread with one recent reply stays.

**And the rest.** No route in this project declared a `maxDuration`, so a sweep
that walks ten tables and purges whole accounts ran on a default sized for a
page render -- and a cut-off invocation dies without reaching the reporter.
`dismissMail` was the one write in its file with no status guard, and it could
delete a row Resend accepted today, handing back a slot already spent against
the real quota (B-071, again). The data export omitted the questions a member
ASKED, which is often the most personal thing in a Round. And backup.yml
claimed it shared a quiet-hours window with the catchups cron: they are five
and a half hours apart, because **Vercel crons run in UTC** and `0 2 * * *` is
07:30 IST. That fact is now in docs/OPERATIONS.md, where the next schedule
change will meet it.

**Two handed to the owner**, because they are questions about plan ceilings
rather than about this code: whether the demo's unbounded anonymous writes can
fill its disk faster than the nightly reset can clear it (C-112), and whether
type-ahead search exhausts the Upstash free command quota at 2,000 members
(C-167). Both are recorded rather than guessed at. C-167 is materially less
dangerous than it was: a quota exhaustion now reports instead of silently
switching every rate limit off.

## 2026-08-25 (later) — the long tail, part ten: uploads and the Collection

Seven findings, one of them needing the database's help.

**One contribution, two photographs (C-129).** The direct-upload path PUTs a
full-resolution original under a fresh key, then the action reads it,
re-encodes it, stores a display copy and a thumbnail, creates the row, and only
THEN deletes the staged original. Two calls with the same key landing together
both read before either delete ran, so both did all of that: two Collection
photos, four stored objects, and a per-account ceiling checked before either
insert. Sequential resubmission was already safe; the concurrent case is not
something application code can close under READ COMMITTED, so `Photo.sourceKey`
is unique now. Nullable, so every existing row and the proxied path -- which
has no staged key -- coexist without a backfill. Proved against Postgres: three
simultaneous contributes of one key leave one photograph.

**Two admins clearing the queue together (C-074, C-130).** `approvePhoto` was a
bare `update` and `declinePhoto`'s delete sat inside a transaction after a
pre-read. Whoever moved second got a raw P2025, which `callAction` renders as
"check your connection and try again" -- a wrong diagnosis that invites a retry
of something that will never work. Both answer in words now, and the decline's
rollback takes its purge rows with it, since whoever won the race queued the
same urls.

**A download that saved the error (C-157).** The photo viewer fetched and
called `.blob()` without checking `res.ok`, so a 404 or a 5xx resolved and the
XML or HTML of the error was written to disk under the photograph's own name,
with nothing on screen saying anything had gone wrong.

**A fallback nobody could see (C-158).** The direct-upload path falls back to
the server proxy on a presign failure or a blocked PUT, silently, by design --
the upload still works. That is precisely how direct uploads stayed broken for
weeks (TRAPS.md records it). All three fallbacks say so now.

**A promise the intake could not keep (C-159).** Its docblock says the whole
thing resolves rather than throwing, because it runs inside `after()` where a
rejection reaches nobody -- but the two reads before the loop sat outside any
try. And a copy that failed after both PUTs had landed left two fresh R2
objects no row names, which is unrecoverable, because nothing here can
enumerate the bucket. Both closed.

C-068 refuted by its own test: the dev `.env` carries full R2 credentials, so
the host-recognition branch it depends on is live locally.

## 2026-08-25 (later) — the long tail, part eleven: posts and letters

Seven findings; one was already closed (C-199, by C-002's work).

**"Read more" tore the post in half (C-011).** A long post is split at exactly
300 characters and the two halves are rendered by SEPARATE `renderRichText`
calls -- and that function needs both delimiters of a run in one string and
matches a mention whole. So anything straddling the boundary came apart: a bold
phrase printed its asterisks, `@[Name](id)` printed as its own source, and an
emoji split into two lone surrogates, one at the end of the lead and one at the
start of the remainder. `safeTruncateIndex` finds the last space at or below
the cap that is outside every mention and every formatting run. Its test
renders both halves and compares against the unsplit render, which is the
property that actually matters.

**Two client guards that bind too late (C-180, C-183).** Both Load-more
handlers relied on `disabled={loadingMore}`, which binds on the next render, so
a double tap appended the same page twice -- the same reasoning M35 already
records for the composer. They have a synchronous ref and an id-dedupe now. And
the composer minted a `blob:` preview per photograph and only ever revoked on
REMOVE, so every picture actually posted stayed pinned in memory for the rest
of the session, which on the immersive letters desk is a long one.

**A letter left on a shared browser (C-014).** The crash-net localStorage key
carried no member id, sign-out clears cookies but not localStorage, and the
":new" key is only cleared by a successful save. So the next person to open
/letters/new on a family laptop had the previous member's unsaved letter
restored silently into their composer, under their own name.

**An author losing sight of their own letter (C-008).** The letters index
hand-rolled the city and batch fragments and omitted the author exemption the
shared `audienceWhere` carries on both arms. Remove the city you scoped a
letter to, and it vanished from your own index while staying readable to
everybody still in that city.

**One where the comment was the wrong half (C-012), and one question for the
owner.** `deleteDraft` justified being author-only with "a draft is never
visible to anyone else, admins included". That is not true --
`decidePostVisibility` grants admins their exemption above its draft refusal --
and a test pins it ("an admin sees everything"). I corrected the comment rather
than the behaviour, because a gated decision is not mine to overturn. But it is
worth a decision: a draft is private writing with no audience, so there is
nothing in one to moderate. **If drafts should be private from admins too, it
is one line to move in post-visibility-rule.ts and one test to change.**

## 2026-08-25 (evening) — where the long tail stands

Ninety-six Lows closed in fourteen commits, worked in FILE order rather than id
order so each module was opened once. **Twenty-nine findings remain**, three of
them already refuted; the handover in docs/planning/audits/fixer-prompt.md maps
every one to its file and suggests four batches.

What the run looked like from inside it. The Lows were not, mostly, small
versions of the Mediums. They were **one rule written down twice**: a count
built by one query beside a list built by another (the directory, five times
over), a bound typed into the editor that members actually reach while the
shared schema went unread (the profile pen), a comment asserting an invariant
the code had stopped keeping (three separate timezone docstrings, `deleteDraft`,
`collectImageUrls`, backup.yml). And **a guard that binds too late**: three
`disabled={loading}` flags that a double tap gets past, two check-then-insert
dedupes that READ COMMITTED lets both callers through, one autosave queue that
counted its writes without ordering them.

Three of those needed the database's help rather than more code — a partial
unique on open post reports, a unique on the Collection's staged upload key,
and an index on `GroupMember.userId` that the previous session scoped and
handed over. All three applied to `.env` and `.env.demo`, all three proved
against Postgres before being written down.

**Two things are the owner's to decide**, and neither is a defect:

- Sessions are an **absolute** thirty days, not the rolling one NextAuth
  documents. Every member is signed out thirty days after signing in however
  often they visit, and a launch cohort will hit it together. It is a
  defensible posture, so it is written at the config rather than changed.
- **Admins can read unpublished letter drafts**, and a test pins that. The
  comment claiming otherwise was corrected. A draft has no audience, so there
  is nothing in one to moderate — but overturning a gated decision is not a
  fix session's call.

**The trap that cost the most this time** was not the vacuous shape test (that
one is now well enough known to catch on the first mutation pass, and it still
caught two). It was **the convincing zero**: three separate mechanisms — a
per-IP rate limit, a `page.fill` that lands before hydration, and a locator
matching nothing — each produced a proof that looked exactly like the fix
working. All three are written into the handover. The rule that survives them:
assert on something that could only be true if the code under test ran, never
on the absence of an outcome.

## 2026-08-25 (evening) — the last stretch, part one: the shell every page renders

Five findings, all in the two files that run before anything else does.

**Nine statements to send nothing (C-104).** `drainMailQueue` sits in the
layout's `after()`, so it runs on every authenticated page view. With an empty
queue it still took the drain lease, reclaimed stale claims, counted the daily
budget four times over, counted the backlog and released the lease again:
around nine statements including three writes, on the hottest path in the app,
to do nothing. The lease made it worse than it reads --
`releaseDrainLease` deliberately expires the row, so every single view WINS the
lease and does the whole dance. There is one indexed count in front of it now,
and the live queue is empty, so that is what a page view costs today: measured,
one statement.

The interesting half is the arm that is easy to leave out. Counting only
`queued` rows is the obvious precheck and would strand a row whose sender died
mid-send for ever, because reclaiming it is this pass's own job and the
precheck would be what skipped the pass. `drainHasWork` in mail-policy.ts spells
both arms out where a test can call them, exactly as `drainEligible` already
does for the row selection, and `STALE_CLAIM_MS` moved there so the query and
the predicate cannot drift.

**Two gates, one of which threw the link away (C-117, C-200 — the same bug
twice).** The proxy adds `?next=` when there is NO session cookie (B-022). A
cookie that exists but no longer authenticates passes its presence check and
lands in the `(main)` layout, which redirected to a bare `/login`. That is not
an exotic state: it is precisely what a password reset or a block leaves on
every other device the member is signed in on. So the realistic case is a
member who reset their password on their phone, then opens an emailed letter
link on the laptop, signs in, and arrives at /feed with no idea what happened
to the link. The layout now redirects with the destination in tow, and the
proxy forwards the query string as `x-search` so the two gates produce the same
Location — verified with both: a present-but-invalid cookie and no cookie at
all now both answer `/login?next=%2Fdirectory%3Fbatch%3D2011`. `x-search` is a
second header rather than an addition to `x-pathname`, because touchLastSeen
records that one as the page somebody was on and a search term is not part of
a page's name.

**A comment claiming a guard that was not there (C-120).** The PostHog config
said its two masking options were "belt and braces ... never transmit the
contents of an input", and neither of them is that: one governs event
properties, the other is the literal non-masking setting. Input contents are
safe, but for a reason that is not in this file — posthog-js excludes them
itself, in two places, and I read them rather than assuming: element attributes
are only collected for `name`, `id`, `class` and `aria-label` once the element
is an input, textarea, select or contenteditable, so `value` is never among
them, and its safe-text walk returns the empty string outright for those same
elements, so a letter draft cannot leave as `$el_text` either. That is now
written at the config, including the part that matters — it is their default we
are leaning on, so it is worth re-reading on an upgrade.

**M46's fix was the comment, not the code (C-115).** The legacy `/notice/[id]`
page resolves an old admin_note into a real conversation. Its comment describes
two simultaneous opens both minting a thread as the OLD behaviour. It was still
the current behaviour: a findFirst followed by a create is idempotent only if
something stops both concurrent readers from seeing nothing, and AdminThread has
no unique key for (memberId, kind, createdAt). Proved live before touching it —
two parallel opens, two identical conversations about one note, one of them
orphaned in the member's list and the admin's inbox for ever.

The lock is the notification row, `FOR UPDATE`, with the create inside the same
transaction: this resolution is the only writer of that row's link, exactly one
request may move it from a legacy link to a thread, and the second then sees
what the first wrote and takes the short-circuit a later visit would. A partial
unique index was the other route and was declined — notice threads are also
opened in bursts by moderation, one per removed post, where two in the same
millisecond would throw at an admin, which is a worse failure than the duplicate
it prevents.

**The trap this time was the dev server's own compiler.** The first probe said
one thread with the fix AND one thread without it — a convincing zero of the
kind this run keeps producing. The first request to a route in dev compiles it
and every other request waits on that compile, which serialised the two and
destroyed the race being probed. Warm the route first, then race. With that,
the old code gives two threads every time and the new code gives one.

## 2026-08-25 (evening) — the last stretch, part two: the rooms only the owner sees

Eight findings, two of them refuted on their merits. What binds this batch is
that none of them can crash: every one is a number that quietly disagreed with
the list printed under it, which is the worst way for an admin room to be
wrong, because nothing on the page can show it.

**Ten leaderboards keyed on what people are called (C-080).** Every superlative
in the analytics room grouped by `u."name"`, and User.name has no unique
constraint. Two members with one name collapsed into a single bar carrying the
sum of both their counts, under one of their identities; at two thousand alumni
that is not a hypothesis. Proved inside a rolled-back transaction: two "Probe
Twin" accounts with three hearts and one become a single bar of four under the
old query and two bars of three and one under the new.

Grouping by id then makes a NEW thing visible instead of hiding it — two bars
reading the same name — so a name that repeats within one list, and only then,
carries its batch as a hint, which is how the directory already tells two people
apart. There are no duplicate names in the live database today, so the room
looks exactly as it did; screenshotted desktop and mobile to confirm that.

**The growth curve counted UTC's months (C-143).** `date_trunc('month',
"createdAt")` on a naive UTC column cuts the month at 05:30 IST on the 1st, so
somebody who joined at ten in the evening on the last day of a month was
counted in the month before. The same file already does the double conversion
in four other places, one of them twenty-two lines above the offender with a
comment explaining why. The gate is a sweep over every `date_trunc`/`to_char`
in `src` that reads a column, counted rather than detected, because that is the
exact failure: one file with six of the thing and four of them right.

**Two measurements under one label (C-089).** The "Did not go through" tile
excluded `["paid", "refunded"]` and so counted `disputed` — a chargeback, money
that DID move and that the webhook really does write — in a warn-toned tile for
failed payments, while the ledger below rendered the same row under "Given
back". Both now read `REVERSED_STATUSES`, so a sixth contribution status cannot
be added without the tile learning about it.

**Half a fix from the first audit (C-088).** Low 116's hygiene work — clear the
failure reason, record the method — landed only in the webhook's captured
branch. The browser callback is the one that usually WINS that race: the payer
retries inside the same modal, the tab survives, the callback fires and the
webhook then matches nothing because the row is already paid. So a successful
gift kept the red error line from the attempt before it, and it landed in "Most
used" as "unknown". The callback clears the reason now; the method it cannot
know at all (a checkout callback carries an order id, a payment id and a
signature and nothing else), so the webhook backfills it — narrowly, on a row
still `paid` and still without a method, so it can never resurrect a refunded
gift the way C-084's negation did.

**A derived credential left to drift (C-041).** `adminUpdatePerson` wrote
`batchYear` and never re-derived `batchType`, which is derived from the pair.
Correct somebody's batch year across the ICSE/ISC boundary and the stored board
stayed as it was, so `batchTargetKey` built "ISC-2012" where the truth was
"ICSE-2012" and a batch-targeted post went to the wrong set of people. Nothing
visible gave it away: the byline formats from `batchYear` alone. The member's
own editor had done this correctly all along. It now also re-checks the office
roster on the same edit, which is the other thing that editor does at that
moment.

**One comment describing an abolished model (C-049).** `chooseBird`'s header
said "re-picking is allowed indefinitely ... nothing to meter and no state to
corrupt by clicking twice". The code under it implements the opposite, with the
owner's own date on it: one pick per contribution, spent on use, regranted only
by a paid contribution newer than the last spend. It meters, and clicking twice
does corrupt state — the first click spends the grant and the second is refused.
The gate is deliberate; the comment was wrong.

**Two refuted (C-082, C-090).** The audit log's scope is stated at
`audit/page.tsx` and enumerated as a closed union: who changed standing or
destroyed data. Ordinary edits and content moderation are outside it by design,
not by omission. And whether a refund should revoke the bird already picked
with that money is a product decision about a cosmetic perk, not a defect —
the finder said as much. Both are rows in the ledger, not changes.

## 2026-08-25 (evening) — the last stretch, part three: settings, onboarding and the odds

Ten findings. One was already closed, one is refuted, and the rest are single
lines in eight different files — but three of them share a shape worth naming:
**a rule written in three places, mirrored twice**.

**A city you deleted, back on your page (C-101).** The profile falls back to
`[currentCity, secondaryCity]` while a member's places list is empty, and all
three writers of that list mirrored only the FIRST place into the legacy pair.
So a member carrying a pre-migration `secondaryCity` who then cleared every
place got `currentCity` nulled and the stale second city resurrected — a place
they had just removed, printed on their own profile. One `legacyCityColumns`
helper now, called by all three; the gate counts the callers, because a check
that "some file calls it" passes on a codebase where two of the three still
hand-roll it.

**C-042 was already closed**, by the 2026-08-22 canonical-city work: onboarding
now shares `placesSchema` and `resolvePlaces` with the other two. It only
needed a ledger row — and, as it turned out, the third `legacyCityColumns`
call above.

**Two dates for one day (C-146).** Requesting account deletion writes an audit
line and posts the member a confirmation naming the purge date. The email is
formatted in the valley's zone, with a comment above it explaining exactly why
it must be; the audit line eight lines earlier used `toISOString()`. For any
request made between midnight and 05:30 IST the two named different days, and
an admin cross-checking them had nothing to say which was right. Same on the
purge side in `retention.ts`.

**The theme was never going to come back (C-138).** Two comments promised that
`User.theme` is "the source of truth" and that a forgotten device would "drift
back to the DB truth on next sign-in". Nothing anywhere copies that column into
a cookie, so a new device starts light. I corrected the comments rather than
building the restore, and the reason is in the code beside them: /dark-mode
gates on the COOKIE, deliberately, and dark mode on this site is something you
EARN by beating the day's Wordle. Restoring it silently on the second device
would quietly delete the one feature the gauntlet is. **Owner: if the theme
should follow a member across devices, it is one line at sign-in — and the
gauntlet stops being a gauntlet.**

**A first photo, beheaded (C-051).** `updateAvatar` ends in a fixed
`resize(512, 512, { fit: "cover", position: "centre" })`. The profile opens the
crop dialog before calling it, precisely because "the old path shipped the
ORIGINAL bytes to a hard-coded centre crop"; onboarding did not. B-030 fixed
the SIZE half of this for onboarding and left the framing half, so the very
first photo a new member uploads — usually straight off a phone, where the face
is rarely centred — was cut blind. It opens the same dialog now, verified by
driving it: pick a file, "Frame your photo" appears, desktop and at 390.

**A cap that was never there (C-169).** Nothing on the image path bounded URL
LENGTH: `postSchema.images` is a bare `z.string()`, `parseImageUrls` only checks
the JSON parses into strings, and the key parser is happy with any number of
characters after the prefix. So `uploads/<own id>/<megabytes of junk>.webp` was
app-minted, owned, and stored verbatim in a column every feed reader downloads
and re-parses per render — the identical resource class already closed for the
sibling `targetBatches` field. The cap sits in the pure ownership rule, so all
four paths (post, edit, Catch-up entry, message screenshot) get it at once.

It is written `!(length <= cap)` rather than `length > cap`, and that is
deliberate: a candidate built without the field would make `undefined > 512`
false and disable the check everywhere while every reader still believed in it.
There is a test for exactly that.

**Three quieter ones.** `pick-bird` caught its own database errors into values
that changed a redirect (C-155), so a member who HAD paid, hitting a pool
timeout at the busy moment payments cluster, was silently classified as a
non-supporter and sent to the page whose one call to action is to pay again.
The catches are gone; a broken read reaches the error boundary, which says so
and offers Try again. The roster import script wrote `verifyState` without
`verifyStateAt` (C-046), against the rule the schema states at that column, so
an entire import batch sorted by its members' SIGNUP times and never appeared
in "recently verified" — swept now across the app AND the scripts, since the
one that got it wrong was a script no typechecker was ever going to read. And
`getWordleAnswer` had no deadline (C-116).

**That last one is the trap of this batch.** Its catch only ever caught a
REJECTION, and the failure the file exists to survive is an endpoint that
accepts the connection and never replies — which does not reject. Proved both
ways, and the first attempt at the proof was itself the bug in miniature: a
`fetch` stub that ignored the abort signal hung for ever and proved only that
the stub ignores signals. A stub that HONOURS the signal shows it exactly: the
old code is still waiting at 8 seconds, the new one aborts at 3,019ms and
returns a fallback word.

## 2026-08-25 (evening) — the last stretch, part four: the gates that were not gating

Six findings, and they are the run's most uncomfortable ones, because every
one of them is a check that reported success while checking nothing. The run
found forty-odd of these in the application; these six were in the machinery
that was supposed to find them.

**`npm run check` said "clean" for a tool that had crashed (C-190).** The lint
gate parsed eslint's summary line, and a clean eslint prints none — so did a
crashed one. The captured exit code was discarded. Same in the protocol audit.
Proved by throwing at the top of `protocol-audit.mjs`: it used to print
`ok Shape + colour protocol clean`, and now prints `warn ... tool crashed`
followed by the stack.

**And it would not have noticed the suite shrinking (C-195).** Test discovery
is bound to one extension and two directories, and it fails open: rename a test
to `.spec.mjs` and it silently stops running, with the gate reporting "N/N
passing" for a smaller N. There is a floor now, and — the half that catches one
rename rather than a wholesale disappearance — a detector for test-shaped files
the runner would not execute. Proved: renaming `heart.test.mjs` used to give a
green `74/74 passing`, and now gives `FAIL — 1 not run` naming the file. The
"14 unit tests" in CLAUDE.md was stale by 61.

**A pin asserting against the wrong half of a file (C-188).** composer-rule's
B-048 guard tested `/cityScope/` against the whole TAIL of feed/actions.ts below
`editPost` — and `cityScope` appears six more times further down in `loadPosts`.
Deleting editPost's entire audience block left it green; I checked, by deleting
all eleven occurrences in that body. The balanced-brace body was being computed
on the line above and thrown away with a `void fn;`, because the local
extractor truncated a top-level server action. That extractor now lives in
`src/lib/test-fn-body.mjs` with the two ways it goes wrong written down, and
both files use it.

**Three ways to smuggle an ungated action past the sweep (C-189), and a
fourth.** gate-coverage found action files by `git grep -l '"use server"'`. That
misses a `'use server'` file (single quotes), a file whose directive follows a
docblock — the likely shape in a codebase this comment-heavy — and, since git
grep only sees TRACKED files, a new action file until somebody stages it, which
is exactly the moment you would want it to speak up. It walks the filesystem
now, with the strictness in one filter. The third vector was `exportedActions`
seeing only `export async function`, so an arrow-function export was swept by
nothing; rather than teach that regex every export form JavaScript has, the
ASSUMPTION is pinned — an action file exports async functions and types, full
stop. All three verified with a scratch action file written each way; each is
caught now, and none was before.

**A test validating an algorithm nobody runs (C-196).** `avatar.test.mjs`
deliberately mirrors the hash in plain JS so a bug in `avatar.ts` cannot hide
behind the same bug in its test — sound, and it had no tripwire, so if
`avatar.ts` changed its salt or its shift window the mirror would go on
validating the old algorithm for ever. A parity assertion over 2,000 seeds ties
them together. Proved by changing `>>> 13` to `>>> 11` in avatar.ts: 1,955 of
2,000 seeds disagree, and the suite says so instead of passing.

**A negative pin that only knew two spellings (C-197).** The B-020 guard
refused `where: { email }` and `where: { email: email }` — two anticipated
shapes — so the bug could return the moment somebody renamed the variable, and
its paired positive assertion only checked that the token `acctKey` appeared
SOMEWHERE in auth.ts, which it does for rate limiting whether or not the lookup
uses it. Replaced with a positive sweep: every `where: { ... email: X ... }` in
`src`, with X traced back to where it was made, must reach the canonical form.
Three legitimate ways to get there (normalised inline, parsed by a schema whose
email field is resolved BY NAME through validators.ts, or read back out of the
User row) and the third is a listed exemption with its reason, so it is a
reviewed decision rather than a silent pass. Proved with exactly the regression
the old pins missed: `where: { email: submitted }`.

**The pattern across all six.** Every one fails OPEN. A missed file, a missed
export, a truncated slice, a drifted mirror, a crashed tool and a shrunken
suite all produce the same output as success. That is the property to check
when writing any of these, and it is cheaper to check than to discover: revert
the fix and watch the gate fail. Every gate in this run was checked that way,
and roughly one in eight was vacuous until that check exposed it.

## 2026-08-25 (evening) — the second pre-release audit is closed

**All 203 ids are disposed of.** `docs/planning/audits/fix-ledger.md` has a row for
every one — `fixed <sha>`, `not-a-bug <reason>` or `owner <reason>` — and it reconciles
exactly against `verdicts-merged.json`, 203 against 203. Every `fixed` sha resolves.
Nothing is left open.

Four of those rows are new tonight and were the reason the handover's count said 199: the
owner-decision items C-135, C-165, C-166 and C-186 had been carried in prose from session
to session with no row of their own. Carried in prose is how a thing gets lost.

**Tonight closed the last 29**, in four commits: the shell every page renders, the admin
rooms, settings and onboarding, and the gates themselves. `npm run check` is green;
`npm run visual` is red on exactly the eight it has been red on since before this run
started (feed, directory, letters and catch-ups at both viewports), from live data drift
rather than code, which is one of the decisions still owed.

**What the Low tier turned out to be.** Not small versions of the Mediums. Overwhelmingly
**one rule written down twice**, and then only half-maintained: a count built by one query
beside a list built by another, a bound typed into the editor members actually reach while
the shared schema went unread, three place writers each mirroring half of the same legacy
pair, ten leaderboards keyed on a name that is not unique. And **a comment that had
outlived its code** — nine of them, by my count, and in six cases the comment was the half
that was wrong, which is a different kind of fix and a harder one to be honest about.

**What I would tell the next person.** The single most valuable habit in this run was
cheap: revert the fix and watch the gate fail. Roughly one in eight gates was vacuous
until that check exposed it, tonight included — and the last batch of findings was six
gates that had never been checked that way at all, every one of them reporting success
while checking nothing. A test that has never been seen to fail is a rumour.

The second most valuable was distrusting a zero. Five separate mechanisms produced a
proof that looked exactly like the fix working: a per-IP rate limit refusing the second
run, a `page.fill` landing before hydration, a Playwright mask whose locator matched
nothing, the dev server's own compiler serialising a race, and a `fetch` stub that ignored
the abort signal it was there to test. Assert on something that could only be true if the
code under test ran — never on the absence of an outcome.

## 2026-08-25 (evening) — owner round: a longer session, and a door into every Catch-up

**Sessions are ninety days now, not thirty** (owner's call on the C-032 finding). Still
ABSOLUTE, and that is the part worth repeating: the cookie's expiry is fixed at sign-in and
does not advance however often somebody visits, because the refresh NextAuth documents
rides on Set-Cookie headers this app's request path discards. A bigger number is not a
rolling session. If it should ever genuinely roll, the change is a middleware or a route
that re-issues the cookie, not a larger constant.

`SESSION_MAX_AGE` lives in `session-revocation.ts` because TWO places mint a session
cookie — the real one and `/api/dev-login` for local tooling — and the second used to carry
its own hand-typed thirty days under a comment claiming it matched a `maxAge` that auth.ts
never set. Both read the one constant now, and the gate pins that rather than the number.

Revocation is unaffected: `credentialVersion` is compared on every session read, so a
password reset, a block or a deletion request still ends every live session at once.

**An admin door into every Catch-up.** The Catch-ups page shows the viewer's own
memberships, and the owner is in almost none of them, so his own Catch-ups page is nearly
empty and there was no route from it to the whole list. `/admin/catchups` has listed every
Catch-up on the site all along — stuck Rounds first, then everything else — and nothing
pointed at it.

It started as a third control in the page header and that was wrong, measured rather than
felt: at 390px the right cluster is 195px against a 151px title inside a 358px
`flex-nowrap` header, so the button pushed "Catch-ups" onto two lines where the committed
baseline has it on one. Four pixels is not worth an icon nobody can read. It sits on its
own row under the header now, admin-only, in Canopy, saying what it is — "Every Catch-up on
the site". Screenshotted at both viewports; the title is back on one line.

## 2026-08-25 (evening) — the reading room

**An admin can read every Catch-up now, without being in one** (owner, 2026-08-25: "I
should be able to see everything in all catch ups as if I'm a member but I don't show up as
a member"). `/admin/catchups/[catchupId]`: every Round newest first, every question, every
answer under it, with hearts and dates.

**Why a separate page and not an observer mode.** The member-facing screen is 2,212 lines
of client components built around a `viewer` who is a member — composers, the curation
console, the Keeper's settings, a people panel with remove and promote controls. Each one
would need a read-only branch, and a missed branch is a button that looks live and then
fails. The reading room has no interactive component at all, so there is nothing to disable
and nothing to forget. Same posture the `/admin/catchups` list already states for itself:
oversight, not a second control panel.

It writes nothing and joins nothing — no `GroupMember` row, no `CatchupPref`, no server
action on the page — so reading a Catch-up cannot make the reader appear inside it. Proved
the guard live: signed in as a real member, `/admin/catchups/<id>` answers 307 to /feed and
the response body contains none of the questions or answers.

**Anonymous questions ARE attributed here**, which is the owner's decision and the one place
in the app where it happens. Marked on the row with a sky chip reading "Only you see this",
and stated once at the top of the page, so the exception is visible to whoever is reading
rather than silent. A member still never learns who asked — `HomePromptView.author` stays
null over the wire, which is what audit C-019 was about. If it is ever regretted it is one
`select` and one block.

**The C-189 fix earned its keep within the hour.** gate-coverage's admin-page sweep now
walks the filesystem instead of asking `git ls-files`, and it caught this brand-new page
while it was still untracked — under the old version it would have been invisible to the
"every /admin page checks the role itself" gate until somebody staged it.

**And the free-tier sizing in OPERATIONS.md is measured now rather than asserted** (the
C-165/C-166 questions). 63 members produced 9,219 page views in thirty days, which puts
PostHog at roughly 4% of its 1M-event month — but the number scales with MEMBERS, and at
2,000 the same behaviour is well past it. Sentry is tighter than it looks: at that traffic
the 10,000-SPAN allowance is already the closer of its two limits, not a distant one.
Neither breaks the site at the cap; both go blind, which in launch month is the whole point
of having them. The levers are one line each and the doc names them.

## 2026-08-25 (evening) — the button, third time

Two corrections to the entry above it, both the owner's, both right.

**It is a bare circle now, with no label** ("just a circle button somewhere small"), and it
is back in the top right of the header where he asked for it — **desktop only**. The
labelled row under the header was the wrong answer for a reason he named immediately: it
took a row of its own and pushed every card down the page. An admin affordance that moves
the member's content is not unintrusive whatever it says.

The measurement that decides this, at a TRUE 390 rather than a browser window that would
not go below 500: the header has **33.27px** of slack between the title and the "Start a
Catch-up" pill. The smallest circle in the app is 32px and the cluster's gap is 10, so 42px
into 33px — and even a 24px circle does not fit, because the gap alone eats a third of what
is left. Nothing goes beside that CTA on a phone. So on mobile the button is simply not
rendered, and the admin sidebar's own Catch-ups entry is one tap from the hamburger. Both
viewports screenshotted against the committed baselines: desktop gains one 36px ghost
circle and nothing moves; mobile is pixel-unchanged.

**And the protocol audit caught a hand-typed `·` in the reading room** — "Asked anonymously
· Katyaini Gupta". It was right twice over: the rule exists so separators come from
`metaLine`, and the line was reading as two facts stuck together rather than the one fact it
is. It says "Asked anonymously, by Katyaini Gupta" now. Worth noting that this gate reported
the violation at all — until this morning a crashed audit and a clean one were the same
green line (C-190).

## 2026-08-25 (evening) — a real alumnus on the admin panel, and why he was not

The owner saw **Kartik Kalyanram, Batch of '78, "the admin panel"** in the analytics room's
"On the site now", and he is the only admin. He is right that it should not say that, and
right that it needed explaining rather than dismissing.

**Nobody got in.** `role` on that row is `member`, the `AuditLog` holds zero actions by his
account ever, and the two admin accounts are both the owner's. The Visit was written at
14:04 IST with `browser`, `os`, `country` and `city` all null — Vercel stamps geography onto
every real request and every real agent string parses to a browser, so four nulls means a
script against **localhost**, and local dev shares one database with production. Six minutes
later commit `6d5609e` landed saying, in its own log: "signed in as a real member,
`/admin/catchups/<id>` answers 307 to /feed". That was the previous session proving the new
reading room's guard, via `/api/dev-login`, **as Kartik**. The guard held. The footprint is
what stayed.

**The rule now, the owner's: if a test needs a profile, it is Jerry Maguire.** That account
exists for exactly this and nothing else was ever supposed to be borrowed. Written where a
session will actually hit it — the `chrome-devtools` sign-in step in CLAUDE.md, and the
JSDoc on `fetchSessionCookie` in `scripts/qa/_dev-login.mjs`, whose old wording ("pass any
member's address") is what invited this. Both say why: dev-login is not read-only, because
the `(main)` layout writes a Visit and stamps `lastSeenAt` against whoever the cookie names.

**Two things this exposed and did not fix**, both noted for the owner rather than acted on:
the presence tracker records the URL a person *asked for*, not the page they *got*, because
[layout.tsx:78](<src/app/(main)/layout.tsx>) writes the row before the nested admin gate
redirects — so any member who types `/admin` reads as "on the admin panel" for fifteen
minutes. And this week's real analytics carry eleven localhost rows from tooling. The stray
Kartik row and his moved `lastSeenAt` are still there; removing them is a write to the live
database and the owner has not asked for it.

## 2026-08-25 (evening) — "nice try"

The owner's call, after the Kartik row above: a non-admin who asks for /admin is told so, instead
of being bounced to the feed without explanation. Two words, no other text, styled like /about's
"indefinitely procrastinated" stub. And explicitly: **the analytics row may keep saying "the admin
panel"** ("it's fine if it's logged as admin under the analytics"). That was the honest half of the
problem anyway — the person really did ask for that URL. What was missing was that they never
learned they had been refused, so the owner's panel was the only account of the event.

`requireAdminPage()` now calls **`forbidden()`** instead of `redirect("/feed")`, with
`experimental.authInterrupts: true` in next.config.ts to enable it. Three reasons it is that and
not markup returned from the layout:

- **It still throws.** The segment's render terminates in the guard, so no admin page body is ever
  built for a member. Returning a message in place would leave `{children}` to Next's composition
  rules, and a guard whose safety rests on those is a guard that breaks at some future upgrade.
- **It gets its own boundary**, separate from not-found. This matters concretely: `/admin/messages/[id]`,
  `/admin/people/[id]` and `/admin/catchups/[catchupId]` all call `notFound()` for a row that is
  genuinely gone. Sharing one boundary would have shown the OWNER "nice try" for a deleted thread.
  Verified: as admin, `/admin/people/<bogus>` renders the not-found UI and never the 403 body.
- **The boundary sits at `(main)`, not the app root**, so the sidebar survives. Being turned away is
  not a reason to strip somebody's navigation.

Proved against the running server with a throwaway member (created, used, deleted; no real alumnus
and no existing account touched). `/admin`, `/admin/analytics`, `/admin/catchups`, `/admin/people`
and `/admin/audit` each answer **403** with "nice try" and none of the panel's content; the admin
still gets 200 and the real page; signed out is still the proxy's 307 to /login. Screenshotted at
1440x900 and 390x844.

**Two findings that are NOT this change**, both proved rather than assumed:

- **`notFound()` under `(main)` returns HTTP 200, everywhere.** Not an admin thing and not new:
  `/letters/<bogus>`, `/collection/<bogus>` and `/profile/<bogus>` all render the not-found UI with
  a 200. Only a route that matches nothing at all (`/nonexistent-route-xyz`) gets a real 404. The
  `(main)` layout flushes the shell before the page resolves, so the status is already committed —
  soft-404s, which search engines treat as indexable. Left alone; it is its own piece of work.
- **The 403 logs one dev-only React warning** ("Encountered a script tag while rendering React
  component") and lights Next's "1 Issue" badge. Chased to the end so nobody chases it again: it is
  Next's, not ours. `forbidden()` is caught by a CLIENT error boundary, so React re-renders the tree
  on the client and walks Next's own `self.__next_f.push(...)` streaming script tags. The warning
  string exists only in React's `*.development.js` builds, so it cannot fire in production. Written
  into the comment at the top of forbidden.tsx.

`npm run visual` was NOT run: no baselined route can reach this boundary (the suite signs in as
admin, who never sees it), and the run had already hung the owner's machine once this session.

## 2026-08-25 (night) — the simplification audit, start to finish

The pre-release simplification audit ran end to end in one session: 18 reader agents
(13 territories sized so every file got read, 5 cross-cutting lenses), every static tool
in the brief, two timed builds, ~30 orchestrator hand-checks, a 10-cluster adversarial
verification pass (161 verdicts: 120 confirmed, 40 corrected in detail, 1 refuted), and
two completeness-critic rounds. The deliverable is
`docs/planning/audits/simplification-report.md` — 241 findings compiled into a six-phase
fix plan sized for later sessions, with the 18 full agent reports as appendices under
`docs/planning/audits/simplification/agents/` and the verification evidence under
`verify/`.

**The shape of what was found.** Not rot smeared everywhere — rot concentrated in a dozen
superseded entry points, plus loading-strategy debt. The five headlines: every member
page ships ~1.4MB of raw JS of which ~360-380KB comes off with autonomous changes
(posthog-js is 245KB on all 92 routes, statically initialised; the full framer-motion
runtime rides `template.tsx`); ~5,000 lines of dead or duplicated code (a ~595-line
avatar renderer unreachable since June behind `USE_V2 = true`, two live-but-uncalled
server actions, the auth preamble pasted ~75 times, a test helper pasted 33 times in two
divergent spellings); 6.4MB of tracked files nothing references (raw WhatsApp originals
publicly served among them); four dead database tables, five dead columns, three unusable
indexes — the NextAuth Prisma adapter has never been called under JWT+Credentials; and
the README currently teaches three forbidden operations, including the admin-login bypass
deleted by C1-b.

**Two working discoveries along the way.** `npm run analyze` has been a silent no-op the
whole time — `@next/bundle-analyzer` is incompatible with Turbopack builds; the audit used
`next experimental-analyze` (works, decoded) and a manifest-derived per-route JS table
instead. And a usage-limit cutoff kills every in-flight subagent at once: the first
fan-out lost ~1.8M tokens with nothing on disk, after which everything ran in waves of six
with agents persisting their own reports before returning — the second cutoff cost nothing.

**What was deliberately not touched:** the comment mass (it is the institutional memory,
verified block by block), the lab (zero bytes of member-facing JS, proven chunk by chunk),
the mail queue (every mechanism pins a dated incident), the gazetteer (the villages are
the point), and the migrations folder. Section 5 of the report records these so no future
audit re-litigates them.

**Owner decisions pending** (report §4, eighteen items): the landing showcase's fate and
the missing public policy links, the tour at launch, the database drops, moving 19k lines
of imported skill prose out of the repo, PostHog-vs-Vercel-Analytics, and the §7 process
mechanism — the scripts-ledger gate, the test survival rule, and the "close it out"
checklist he asked for, worded and ready for sign-off.

## 2026-08-26 — docs/audit-fix: every audit gets a dated home, and the fix campaign gets its handover

All audit material now lives under `docs/audit-fix/`, one dated folder per audit: what the
owner reads (reports, fix ledgers, fix prompts) at each folder's top level, the working
evidence (plans, raw tool output, agent reports, verification verdicts) tucked under
`work/`. Three folders: bug audit 1 (2026-08-21, closed; artifacts live in git history,
the folder holds the pointer), bug audit 2 (2026-08-22, closed; report + fix-ledger kept,
its two machine dumps — 994KB of JSON — deleted per the refactor audit's own finding, and
the ledger's owner-decision leftovers carried into `docs/planning/bugs.md` so the only
live content kept living in the live tracker), and refactor audit 1 (2026-08-25, report
final, fixes not started). The reusable prompts moved to `docs/audit-fix/prompts/`, each
now carrying the owner's standing rules in writing: crash-safe waves with on-disk
resume, usage discipline (never stingy, never wasteful), the artifact convention, and
scratch-file discipline.

The fix campaign's workflow is now one file: the owner @s
`docs/audit-fix/2026-08-25-refactor-audit-1/fix-prompt.md` and that is the entire
handover — status board, owner-input map (which §4 decision gates which phase, asked for
at phase start), execution rules, and a session log every fix session appends to before
ending. Fixes run on Opus max; audits on Fable ultracode. This reorganisation itself
executed the audit's "archive the closed bug audit" item, so the fix prompt marks it done.

Also in this pass: `docs/planning/catchups-fixes-brief.md` — which the owner found fully
executed and stale — is gone (the owner had already deleted it on disk; the commit records
it), and `docs/spec/catchups.md`'s banner now states the rules directly instead of
deferring to a deleted file. `docs/README.md` learned the new folder and had its spec
list corrected (admin.md and person-row-audit.md were missing). CLAUDE.md gained two
things: the `docs/audit-fix/` pointer, and the owner's "kowalski" rule — say the word,
get an instant compact progress report (item n of m, percent effort and time remaining,
blockers) with no preamble.

Root directory, for the record since the owner asked: the audit's verdict stands — all 16
tracked root files are tool-required (verified against each tool's own docs or code); the
real root cleanups are in fix phase 1b (tsbuildinfo relocation, progress.md monthly
archive, the personal folders he moves himself).

## 2026-08-27 — the `sizes` promise now names its column, and two pages stop over-fetching

`PHOTO_SIZES_FULL` said which half of a card a photo fills and nothing about which
column the card is standing in, so `/letters/[id]` and `/profile/[id]` — both centered,
both capped well under the feed's width — inherited the FEED's promise. On a 2560px
screen the profile's photo slot is 732px and it was asking for 1216px; a phone's slot is
314px and the mobile clause said `100vw`, i.e. 390. Measured against a running page:
500 → 424, 768 → 428, 900 → 596 (letter article), 1024 → 660, 1096 → 732, and the
centered column reaches its 768px cap at a 1096px viewport.

Three slots now, named for their column: `PHOTO_SIZES_WIDE_*` (unchanged, the feed),
`PHOTO_SIZES_CENTERED_*` (a post card in the centered column) and `PHOTO_SIZES_LETTER`
(the letter reader's 680px reading measure, which stops growing at a 984px viewport,
well before the column does). `PostCard` takes a `column` prop — `"wide"` by default,
`"centered"` from the two profile feeds — because the card cannot see the column it is
in and the two are 484px apart at the top end.

Measured after: profile photo at 2560×1 drops from the 1456 rung to 750, and at 390×3
from 1456 to 1080. Nothing looks different — `npm run visual` 23/23, and the declared
widths sit 4px under the real slot so a retina Mac lands on 1456 for a 1464px need
rather than paying for 1920.

## 2026-08-27 — the two Dependabot highs, closed

Both were transitive and neither was reachable from anything a member touches, but
`npm audit` is now clean rather than clean-with-an-explanation. `deepmerge-ts`
(GHSA-ggr8-5vv4-36mx, stack exhaustion) arrives through the Prisma CLI's `@prisma/config`,
which pins it to an exact `7.1.5`; npm's only offered fix was `prisma@6.12.0`, two majors
back, so it is an `overrides` entry forcing `^8.0.2` instead, with `prisma validate` and
`prisma generate` both run against it and OPERATIONS §4 carrying the note to delete the
override once upstream moves. `extract-zip` (GHSA-jmr9-qjv8-65gv, symlink path traversal
when unpacking a downloaded Chrome) had no patched version under `puppeteer@24`, so
puppeteer went to 25.9.0 — a devDependency, and the screenshot toolchain was re-run against
it: `npm run screenshot` and `npm run verify:crawl` both drive the same bare
`puppeteer.launch`, and both still launch.

7 high advisories to 0.

## 2026-08-27 — refactor audit 1, phase 6: schema and architecture

The last phase of the campaign. Its shape was decided before any code moved, by a fact
worth stating plainly: **`origin/main` was 165 commits behind local**, so production was
still running the pre-campaign build, and one Supabase database serves production and
local dev. Prisma names every column of every model explicitly in its SELECT list —
proved, not assumed, by logging one `post.findFirst` and reading
`SELECT ... "Post"."tag" ...` back — so a column dropped under a running old build is an
outage, not a warning. Every DROP in this phase is therefore written as a dated file and
left unapplied until a build without the column is live. Code, then deploy, then DDL,
never the reverse. The owner pushed so the deploy could bake.

**The NextAuth adapter and its three tables.** `adapter: PrismaAdapter(prisma as any)` sat
in `auth.ts` doing nothing: `strategy: "jwt"` is explicit and the only provider is
Credentials, and @auth/core reaches an adapter from four places only — OAuth account
linking, the email provider's VerificationToken flow, WebAuthn, and database sessions —
none of which exist here. The audit traced that through the installed dist; the database
settles it: 63 members have been signing in for months and `Account`, `Session` and
`VerificationToken` hold **zero rows between them**. Gone from `auth.ts` (taking one of the
repo's few `any` casts with it), from the schema, from `package.json`, from the demo seed's
reset, and from the two probe scripts that deleted from `Session` as cleanup. The demo's
deny canary — which forged a Session to prove the demo refuses writes — now mints a
password-reset token instead, a model the policy still denies by name.

**GroupInvite.** A table the Groups feature left behind: no reader, no writer, no invite
UI, and the only line naming it was the demo reset wiping a table nothing fills. It holds
two rows — both `pending`, both sent by the owner on 2026-07-21 a minute apart, both
un-acceptable because nothing accepts an invite. Model, three back-relations, seed line and
cascade-map entry gone; the table's DROP is dated and waiting on the deploy.

**Five dead columns.** `User.openTo` and `Post.tag` had carried a schema comment promising
"a future cleanup migration" since July; this is it. With them: `Photo.blurhash` and
`Photo.originalUrl` (both 0 non-NULL — and `originalUrl` is *not* the full-size download,
which is `Photo.url`; it was a second, always-empty promise of the same thing, read only by
three defensive purge sites that could never see a value), and `Group.visibility`, written
with three constants and read by nothing at all, describing a browsing experience that no
longer exists now that a Group row survives only as a Catch-up's membership container.

**Where the audit was wrong: `Post.tag` has a writer.** The finding says "zero readers and
zero writers", and `scripts/dev/seed-curated-content.ts:316` writes `tag: piece.tag` from
eleven literals, five of them `"campus-memory"` — which is exactly the five tagged rows the
census found. Left alone it would have thrown on its next run against a column that no
longer exists. The field is gone from the script's type, its eleven pieces and its create.

**The Visit geolocation trio, and it is the one that deletes personal data.**
`Visit.timezone`, `Visit.lat` and `Visit.lng` were filled from Vercel's edge headers on
every page view and read by nothing — not the analytics room, which groups by country,
city and region and never selects these; not the export; not retention, which deletes whole
rows by date. 194 of 614 visits carry a real coordinate pair. That is the argument *for*
removing them rather than against: a field you collect and never use is one you should stop
collecting. Collection stopped first — `last-seen.ts` no longer reads the three headers at
all, and `num()`, which existed only to parse the two coordinates, went with them.

**One index dropped, one kept, and the counters are why.** The audit named three indexes no
query can use. `Group_visibility_createdAt_idx` went with its column above.
`SearchLog_query_idx` goes here: every SearchLog read filters `createdAt` first and the two
`groupBy(["query"])` hash-aggregate after it, which a btree on `query` serves in no plan —
and `pg_stat_user_indexes`, consulted rather than assumed, shows **one scan in a 96-day
window**. It is write amplification on a debounced-keystroke insert path, forever, for a
lookup nobody performs. `Comment_postId_isHidden_idx` is **kept**: 13 scans in the same
window, and the finding itself rates it marginal and says to skip it in doubt. Dropping an
index to save 16 kB is not worth being wrong about.

**Four of the app's five real import cycles, gone.** All four were `import type` edges —
erased at compile time, harmless at runtime, and 80% of the cycle count every future audit
would have to re-triage. `OnboardingStepId`/`OnboardingUser` moved to
`components/onboarding/types.ts` (the flow imported its three steps while all three imported
a type back, three cycles; and `welcome/page.tsx`, a server component, had been reaching
into a client module for a string union). `RailViewer` moved to
`components/feed/rail/rail-viewer.ts`, beside the modules that share it. Measured with madge
**after fixing the run itself**: the obvious invocation silently skipped 328 files because it
could not resolve the `@/` alias and reported a flattering zero. With `--ts-config
tsconfig.json` it resolves all but two, and the count is 40 — 39 of them inside Prisma's
generated client, and one of ours: `lib/catchups.ts > lib/catchups-notify.ts`, which is
catchups-03's row and is not done.

**The Catch-ups engine, split in two, and the app's last import cycle with it.**
`lib/catchups.ts` held both the pure state machine and the Prisma drivers, and that one fact
paid for a lot: `catchups-notify.ts` imported `answerReminderMessage` from it while it
imported notify back, so the two were a cycle; and because the pure half has to load under
bare `node --test` with no Prisma client in its graph, prisma and notify had to arrive
through lazy singletons (`getPrisma`, `getNotify`, `PrismaLike`, `NotifyModule`) with a
dynamic `report()` beside them. 900 lines moved to `catchups-core.ts`; the 443 that remain
import prisma, notify and `reportSwallowed` as plain static imports. Notify takes its one
helper from the core, and the cycle is gone — `madge --circular --ts-config tsconfig.json`
now reports 39, every one of them inside Prisma's generated client and none of them ours.

Two things the split surfaced rather than caused. `catchup-lifecycle.test.mjs`'s C-149 sweep
— every catch that swallows must report — matched on the literal `report(`, so renaming the
call to `reportSwallowed(` turned it red, which is a pin doing its job. While fixing it: its
catch pattern required parentheses, so a `catch { }` written without a binding was invisible
to the sweep. Widened. And `catchups.test.mjs` is now `catchups-core.test.mjs`, because that
is what it tests.

Verified beyond the gate: a real published Round rendered for a member of its group, with
`roundLabel`, the published date, the 13-strong bird row, `askerVisible`'s "asked
anonymously" and the entry list all correct — and a Round belonging to a group the viewer is
NOT in still 404s, which is the same audience rule as before.

**avatarColor, retired in name for months and in fact only now.** `bird-avatar.tsx` has
said in its own banner since July that "there is no avatarColor override — the bird always
drives its own colour", and the prop carried `@deprecated unused`. What survived was the
plumbing: stamped into every JWT, re-read from the row on every session refresh, selected in
ten queries, declared in ten component interfaces — about 25 files carrying a value
discarded on arrival. 43 references gone. A live JWT minted before this still carries the
claim, which is harmless: the session callback stops reading it, and an unread claim is
ignored rather than an error.

Verified: `npm run verify:crawl` 20/20 routes 200 with a session minted after the change,
and the feed, the rail's directory list, the composer and the sidebar all still draw their
birds in the bird's own colours.

**And then the drops actually ran.** The code deployed first: pushed, Vercel green on that
exact commit, production smoke-tested on the new build, and every scheduled job and API
route grepped for the names about to disappear. Then the demo database — empty of every
target, so it proved the SQL and risked nothing — then a fresh `backup.yml` dispatched by
hand because the nightly one was twelve hours old and this step does not come back, then
production, one file at a time.

Gone from both databases: `Account`, `Session`, `VerificationToken`, `GroupInvite`;
`User.openTo`, `User.avatarColor`, `Photo.blurhash`, `Photo.originalUrl`, `Post.tag`,
`Group.visibility`, `Visit.timezone/lat/lng`; `SearchLog_query_idx` and
`Group_visibility_createdAt_idx`. Verified with `to_regclass` and `information_schema`, and
— the check that mattered most — `CatchupSeries` still holds 3 and `CatchupEntry` 133, which
is the disaster the census was written to prevent. 63 members intact, `verify:crawl` 20/20,
production public routes 200, and the demo write-guard 15/15 including its new canary.

**Getting the push out needed a git fix.** Origin's tip was an earlier shape of a commit
that had since been rewritten locally, so the two could not fast-forward. A merge resolved
cleanly and was then rejected by a GitHub ruleset — this branch must not contain merge
commits — which is exactly why it had been rewritten in the first place. A rebase with
autostash did it, git dropping the duplicate commit on its own recognisance. The owner's
uncommitted `CLAUDE.md` edit was copied out and checksum-compared before and after, because
it is not mine to stash.


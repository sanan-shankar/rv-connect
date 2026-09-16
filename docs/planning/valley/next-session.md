# The next session: fresh ideas first, then hours of finishing

Written 2026-09-16 by the session that built round one, for a fresh Fable session. The
owner pastes one line; this file is the whole handover. His words are in `brief.md`; where
this file quotes him the sentence is his, and where it reads as an opinion beneath a quote,
the opinion is the previous session's and is labelled so.

## Read first, in full, in this order

1. `docs/planning/valley/brief.md`: nine paragraphs, all his, typed. ¶1 is the ask, ¶3 the
   rule that governs everything, ¶9 the review of what round one built. Do not skim.
2. `docs/planning/valley/handover.md`: what was built, the board, the ideas considered and
   not taken, with reasons.
3. `/Users/sanan/Documents/sattviq/obys/docs/TASTE.md`, then the four review sections of
   `/Users/sanan/Documents/sattviq/obys/docs/reference/website-prompt-verbatim.txt` (search
   for "Feedback on first three directions", "Feedback on the round-2", "The full lab
   review", "Review 4"). That is the taste he pointed at in ¶1, in his own voice, recorded
   over four sittings for a different site. Read it for the *shape* of what he loves and
   hates, not for the content: that site is a company brochure and this is a place people
   open every day (¶3).
4. `CLAUDE.md`, `docs/spec/DESIGN-SYSTEM.md`, `docs/spec/lab-voice.md`, and the spec of
   whatever surface an idea lands on (`docs/spec/media.md` for the Collection,
   `directory.md`, `letters.md`, `catchups.md`, `profile.md`).

## The ask, in his words

¶1: *"take that one concept of insanely sick web dev tricks and visuals that are hyper
relevant to content and try to incoroporate a few into this website. now it can't be a
insanely huge thing if it's something that'll happen often cause they might get sick of it.
if it's small and splendid then maybe. but the huge ones we can find place for as well but
make sure they don't happen too often. or maybe just something else entirely. but basically
my goal is to absoultely blow some minds with incredible web dev in this site but not make in
cringe and annoying ... think of stuff that would 1 be relevant and ebautiful for us and 2
done in a place that is relevant for it. you can make a lab for this ... obviously should also
work on phone. and just show off things that people would be like how tf can they do that."*

¶2: *"be fresh don't gimme stuff like another mascot or something. just completely novel and
insanely relevant and dopamine inducing upon interacting"*

¶3, the rule: *"there's fundamental differences in the types of things you can do fo ra cool
website landing page and an impeccably made social media site for alumni ... if for example
every time I open feed the text assembled itself from tiny dots, i'd get sick of it after
three times. I can't have that every time. but it work on a website."*

¶9, how he wants this session to run: *"remember i'm under no time constraint and i'm so
happy if an hour goes in brainstorming and planning and ideating and then 5 hours in
finetuning and whatever. I just want really quality results. obviously don't unnecessarily
burn usage but don't be stingy with it there's enough."*

## What round one built, and his verdict on each (¶9, verbatim)

All four are live at `/lab/valley` so you can see them; none is being taken as it stands.

- **The sidebar mark lit by the valley's real sun.** *"I don't really like the mark lit. I
  like the idea of referencing the time in school or something but eh this isn't an exciting
  way to do it and i'd rather have something else."*
- **The directory's map with the day/night line and members' cities lit or dark.** *"world in
  this hour kinda complicates the directory it has a thing going on that will fill it up
  don't want layes of dark on top of that and then randomly colouring the cities on top of
  the circles we'll have on them."*
- **The member's own bird pressed into wax (SVG lighting filter).** *"the seal is cool but
  literally can't see it when it's not massive. it just looks like a brown spot. and it's not
  the most recognisable symbol I doubt people are that familiar with their bird."*
- **The real hills round the school (SRTM elevation, contour map that stands up into relief,
  sun and shadows, raw WebGL2).** *"hills is obviously teh coolest but I just think it's
  definitely no where detailed enough to be cool. like we'd want to see our school and we
  can't really do that here. the transition to showing the hilss in exact that shape is cool,
  but not worth doing everything for that. not a fan of the colouring and the way the contour
  is and just the executation. I had also thought of 3d but then i'd need like per metre data
  or something for it actually to feel mind blowing and nice. I don't have too much to take
  away from here because our school is just a dot and then we see the hills around it."*

### What the previous session takes from that (its reading, beneath his words)

- **Detail is the bar.** A dot in a bowl of hills is not the place; *"we'd want to see our
  school."* Whatever is shown has to show the school as itself: its buildings, its trees,
  its paths, the people, the years. Public terrain is 30 m per pixel and there is no free
  per-metre elevation for this valley that the session could find (searched the public
  tile and DEM sources; unverified beyond that), so real 3D ground is parked unless a fine
  data source appears (drone photogrammetry, a survey, a model somebody already made).
- **"Referencing the time in school" is liked as an idea and not in that form.** The
  members' years there are real data (batch, houses per year, joined/left). An idea that
  makes those years *felt* is still open; a colour shift on a logo is not it.
- **Symbols people recognise.** A member's bird is not one. Their own name, their photograph,
  their batch year, their house, the places on campus everybody walked through, the
  photographs in the Collection: those are.
- **The directory's map stays clean.** It already has its own thing (counted city pins,
  clusters, a drilldown); nothing is layered over it.
- **The 2D-to-3D transition was liked on its own** (*"cool"*) and is not worth a whole idea.
  Keep it as a move, not a purpose.

## Decisions

- **LOCKED (¶3).** The frequency budget. Always-on things are sub-threshold. Big things are
  pulled by the member with a gesture that does a real job, or are rare by nature. Nothing
  performs on the feed on every open.
- **LOCKED (¶2).** Not another mascot; nothing that is birds as decoration.
- **LOCKED (¶9).** None of the four round-one pieces is built further as it stands. Reuse
  a technique from them if an idea genuinely needs it (`_sun.ts` is correct and tested;
  the WebGL scaffold in `_hills.tsx` works), never the idea.
- **LOCKED (CLAUDE.md).** Lab rooms are `page.lab.tsx`, registered in
  `src/app/lab/_registry.ts` in the same change, written to `docs/spec/lab-voice.md`.
  Motion never checks the OS reduce-motion setting. Mobile is verified at 390x844 for every
  desktop change. Commits: conventional, no attribution of any kind, under 150 words, by
  pathspec; a push is a deploy and needs his word.
- **RECOMMENDED.** Spend the first hour or more on the ideas, before any code, and do it as
  one hand: list what this site genuinely *has* (1,749 photographs with years and buckets;
  members with batch, houses per year, cities, professions; letters; Catch-ups with
  editions, a time capsule, voice answers; the campus and its places; the hoopoe, which is
  off the table), then for each thing ask what a member would do with it that no other site
  could offer, then what technique makes that impossible-looking. Judge every candidate on
  the obys axes (relevance times craft; the opacity test; clarity at every stage; *"at every
  point in the middle of the transition it must look like a good design"*) and on ¶3. Ten
  to twenty candidates on paper, three built. Fanning the brainstorm out to several agents
  converges on ornament (a standing lesson in this repo); fan out only for coverage work
  such as screenshot sweeps.
- **RECOMMENDED.** Build in `/lab/<something>` as a fresh room or rooms rather than under
  `/lab/valley`, with real data where it exists (the Collection's real photographs are
  readable from a lab room, admin only; the 240 stand-ins at `/lab/collection` are for
  layout, not for judging a picture). Screenshot both viewports, read the PNGs yourself, at
  least two rounds per piece, and keep going for hours after it works: he has said the
  polish is where the time should go.
- **RECOMMENDED.** Write your own board into `handover.md` within the first hour, and keep
  it current, so a session limit costs nothing. Keep your context under about 70 per cent.
- **OPEN.** The ideas themselves, where each lives, and how many. Bring back something
  better than anything written here.

## Considered and not taken so far (so nobody re-treads it blind)

From `handover.md`, with the reasons; each is a fact about the data, not a verdict on the
idea, and any of them may be worth reopening:

- **The archive wall**: pinch out from one Collection photograph to all 1,749 filed by
  decade, then in again. The zoom-is-scale idea he called golden on obys, on an honest axis.
  Not built because the far-out view needs a thumbnail atlas: 1,749 optimizer calls per view
  is a quota risk, a public atlas in `public/` would ship to the demo domain, and an atlas
  in R2 needs a hand-run script. `Photo.blurhash` exists and nothing writes it. The R2
  atlas is the right build and it is a session's work. He has not seen or judged this one.
- **A flock coming home** on a globe: birds again (¶2). Parked.
- **Same place, different decade** in the Collection: needs pairs of one spot, untagged.
- **The banyan grown from members**: a known metaphor. Parked.
- **Dappled light on the feed**: decorative, daily surface, ¶3.
- **Depth-map parallax on old photographs**: no depth model on this machine.
- **Ink that dries as you type a Letter**: cannot be done on live contentEditable.

## Seeds (the previous session's, unbuilt, yours to drop)

Offered as the *style of thinking*, in his phrase from obys, not as instructions. Any of
them may be wrong.

- The school as itself. What exists that shows the campus rather than its silhouette: the
  Collection's photographs of buildings and places; his own memory of where things are;
  OpenStreetMap's building footprints for the campus (unverified: nobody has looked); the
  aerial imagery a satellite tile server carries (licensing unverified). An illustrated map
  of the campus, in the field-journal hand, that the Collection's photographs are pinned to,
  is one shape; it would need him to say where things are.
- Time in school, felt rather than displayed: a member's years there against the school's
  hundred; the people who overlapped with you; the houses you were in, year by year, drawn
  as something you can run a finger along. The data is real and already on the profile.
- The Collection is the richest honest material in the app, and the only place a photograph
  can do something a feed cannot. Scale (the wall), time (the year rail already is
  scroll-is-time), and place are its three axes.

## What good looks like

- He opens a lab URL and stares. He can tell what he is looking at at every moment (the
  Until standard) and cannot tell how it was made (the opacity test).
- It is relevant to this school and these people, not to websites in general.
- It works at 390x844 with a finger.
- It obeys ¶3: he could see it a hundred times, or he chooses when to see it.
- Every screenshot read by the session; two rounds minimum per piece; no console errors;
  `npm run check` green before every commit.

## Operational context

- Repo `/Users/sanan/Documents/rv-connect`, branch `main`, shared checkout: another session
  may be working in the tree, so never stash, reset or restart anything you did not start.
  The dev server on `:3000` is usually already running and belongs to whoever started it.
- The lab is admin-only. Authed screenshots: `node scripts/qa/verify-shot.mjs <route>
  <out.png> [mobile]` (writes to `e2e/.shots/`), or the shared `shoot()` in
  `scripts/qa/_shoot.mjs` with a longer `settleMs` for anything WebGL. The MCP browser can
  measure but cannot be handed the session cookie without the dev-login secret; the scripts
  read `.env` themselves.
- Gate: `npm run check` (types, lint, protocol audit, lab registry, unit tests, advisories).
  `npm run visual` only if a product surface changed.
- Session log: the full entry in `docs/history/progress-2026-09.md`, one line in
  `progress.md` whose text is exactly the entry's title, staged with the work.
- Round one's code, for parts: `src/app/lab/valley/` (`_sun.ts` and its test, `_hills.tsx`,
  `_seal.tsx`, `_terminator.tsx`, `_mark-light.tsx`), the terrain script
  `scripts/dev/valley-terrain.mjs`, the data in `public/lab/valley/`.

## Before you end

Update `handover.md`'s board and log, write the progress entry, commit by pathspec, and
leave a one-line paste for the session after you if the work is not finished. Do not push.

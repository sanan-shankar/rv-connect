# The valley campaign: handover

## Start here

Read `brief.md` first, in full: eight paragraphs, all his, typed. Then this file's board. Then,
only if you are going to change a decision rather than carry one out, the obys material
named under "Where the taste came from".

The ask, in his words (¶1): *"take that one concept of insanely sick web dev tricks and
visuals that are hyper relevant to content and try to incorporate a few into this website"*,
built *"in a place that is relevant for it"*, working *"on phone"*, and (¶2) *"completely
novel and insanely relevant and dopamine inducing upon interacting"*, not another mascot.
The bar for the night (¶4, ¶6): proposals in the lab he can *"stare in awe"* at, screenshotted
and not *"shabby"*.

## What this campaign is

A lab room, `/lab/valley`, holding a small family of things that share one idea: **the site
knows where it is.** Rishi Valley is a real place with real hills, a real sky and a real hour,
and the app can carry all three honestly. Nothing in the family performs on the feed.

The four pieces, and where each would live if he says yes:

| Piece | What it is | Tier (¶1, ¶3) | Where it would live |
|---|---|---|---|
| The hills | The real ground round the school from public elevation data, drawn as a contour map that stands up into relief, lit by the sun where it is over the valley this minute, under today's real weather. Drag to orbit, drag the hour, stand on the campus and look west at the three peaks the mark is drawn from. | big, pulled by the member | About, "Where this is"; the 404; the landing's showcase if it ever returns |
| The mark, lit | The sidebar's peaks mark takes its light from the valley's real sun: bright cream by day, warmer at dusk, a moonlit silhouette at night. Changes over hours, never performs. | always-on, sub-threshold | the sidebar lockup and every other lockup |
| The world at this hour | The directory's own map with the day/night line where it really is, and the cities members live in lit or dark. "It's daylight in N of the M cities you live in." | always-on, functional | the directory's map |
| The seal | Your own bird pressed into wax with an SVG lighting filter, lit from the valley's sun; press and hold to seal. | rare by nature, once a year | the Catch-ups time capsule (`/lab/catchups/capsule`), the moment it is sealed |

Everything is fed by one file, `src/app/lab/valley/_sun.ts`: the sun's position (NOAA),
the valley's clock, sunrise and sunset, the moon's phase, the sky's colour. One sun, four
surfaces, which is the composition rule from obys ("many cool things working together as
one") applied without a single scroll-jacked sequence.

## Where the taste came from

`/Users/sanan/Documents/sattviq/obys` is the SattvIQ marketing site. Its `docs/TASTE.md`
(the digest of four recorded reviews) and `docs/reference/website-prompt-verbatim.txt` (the
reviews themselves, 160KB) are the source. What transfers, in his words there:

- *"if we scored on relevance and how cool it looks"*: both axes, always. Until Labs is a
  ten on both because *"you're literally scrolling through"* the thing the company does.
- The opacity test: *"even I can tell exactly how all of these three websites have been
  made. But if you gave me until labs or glyphic, I could not tell you how they have been
  made."* Flat shapes and scroll tweens fail it; shaders, real 3D, image-based art pass.
- Clarity at every stage: *"I still don't know what the company does, but I knew exactly
  what I was looking at."*
- *"What did the 3D model actually do? Nothing. It just showed off that these guys are good
  at web dev."* A wow that carries no content is a painting of a factory.
- *"at every point in the middle of the transition it must look like a good design."*
- *"you just want to break for a bit"*: pacing; never one theatre piece into another.
- The loved moves: the 2D-to-3D turn (*"done amazingly well, so smooth, pivoted on this
  really nice point"*), the particle dissolve (*"has to be used somewhere"*, failed only on
  its destination), the zoom-out storytelling (*"the idea is golden"*), the whiteboard
  anneal in a small window. And the mouse tilt: *"the slight tilting, all of that is nice"*.

What does NOT transfer (¶3): scroll theatre on a daily surface. His own example: text
assembling from dots on every feed open, *"i'd get sick of it after three times"*.

## His review of round one (2026-09-16, ¶9 in `brief.md`)

None of the four is taken as it stands. His words, per piece, are in `next-session.md`
alongside the previous session's reading of them; the short form: the lit mark is *"not an
exciting way to do it"*, the day/night map *"complicates the directory"*, the seal *"just
looks like a brown spot"* below a large size and the bird is not a recognisable symbol, and
the hills, *"obviously the coolest"*, are *"no where detailed enough to be cool ... our
school is just a dot."* The idea of referencing time in school survives in principle. The
next session starts from `next-session.md`.

## Decisions

- **LOCKED (¶3, ¶1).** The frequency budget. Always-on things are sub-threshold and change
  over hours. Big things are pulled by the member with a gesture that does a real job, or
  are rare by nature. Nothing plays on the feed.
- **LOCKED (¶2).** Not another mascot, and nothing that is mostly birds-as-decoration.
- **LOCKED (¶5).** The three peaks in the mark are Bodikonda, Middle Peak and Rishikonda,
  left to right as seen from the school. They are at very different distances; Bodikonda is
  over the border in Karnataka. The terrain reaches 32 km each way for this reason.
- **LOCKED (CLAUDE.md).** Motion never checks the OS reduce-motion setting. The lab kit's
  toggle is the kit's; the hills ignore it.
- **RECOMMENDED.** Raw WebGL2 for the hills, no three.js. Reason: the look is a custom
  shader either way (contours, cast shadows, the model's fading edge), the camera is forty
  lines, and the repo gains no dependency. A next session may add three.js if it needs
  shadows from real geometry or a second scene; say why.
- **RECOMMENDED.** Vertical exaggeration 1.25, not the museum's 1.5 to 2, because the people
  looking walked up these hills.
- **RECOMMENDED.** Weather from Open-Meteo (keyless), fetched on the server, cached fifteen
  minutes, null on failure with one small honest line. Never fetched from the browser (CSP
  names its hosts).
- **OPEN.** Where the hills live in the product. About is the strongest case (a page for a
  place that has never shown the place). The 404 is the wittiest. Neither is built.
- **OPEN.** Whether the sidebar mark's daily light ships. It is invisible until noticed,
  which is the point and also the risk.
- **OPEN.** The names on the hills. The room labels heights only; the mark's three names are
  his (¶5) and OpenStreetMap carries no peak names here (checked 2026-09-16, Nominatim and
  Overpass). Do not label a real hill with a guessed name.

## Considered and not taken (so nobody re-treads it)

- **The archive wall**: pinch out from one Collection photograph to all 1,749 filed by
  decade, GPU-drawn, the zoom-is-scale idea he called golden with an honest axis. Not built
  this round because the far-out view needs a sprite atlas of every thumbnail, and building
  one means either 1,749 optimizer calls per view (a quota risk), a public atlas of real
  photographs in `public/` (would ship to the demo domain), or a hand-run script writing an
  atlas to R2 (real infrastructure for a prototype). `Photo.blurhash` exists but nothing
  writes it (0 readers, no writer found). The right build is the R2 atlas; it is a session
  of its own. Strongest candidate for round two.
- **A flock coming home**: every member's bird on the directory's globe flying back to the
  valley along great circles. Relevant, but birds again (¶2), and the directory already has
  its map. Parked.
- **Same place, different decade** in the Collection: needs pairs of photographs of one spot,
  which the data does not tag. Parked.
- **The banyan grown from members**: a tree-of-members is a known metaphor even if the
  banyan's aerial roots make it apt. Parked.
- **Dappled light under the banyan on the feed**: pretty, decorative, on the daily surface.
  Rejected by ¶3.
- **Depth-map parallax on old photographs**: needs a depth model this machine cannot run.
- **Ink that dries as you type a Letter**: cannot be done on live contentEditable text
  without owning the editor. Parked.

## What good looks like

- The hills, at 1440 and at 390: the first frame is a contour map you would put on a wall;
  the tilt up into relief looks like a good design at every frame; dragging the hour towards
  18:00 sends the ridge's shadow across the campus; at night the campus keeps a lamp on and
  the sky has stars; "From the school" shows the western skyline with the three peaks in the
  mark's order. No jagged edges, no seam between the fine and coarse maps, labels crisp at
  any zoom, 60fps on a laptop and smooth on a phone.
- The mark: at 19px on the rail the day and night versions are both obviously the mark;
  side by side the difference is clear; in isolation nobody would call it an effect.
- The world map: the line is where a globe would put it (check against the sun dot: it must
  be 90 degrees from the terminator everywhere), cities read lit or dark at a glance.
- The seal: the bird reads as pressed wax, not a drop shadow; the press feels physical;
  it holds at 40px.
- Every screenshot read by the session, not by an agent's report. Both viewports, two rounds
  minimum (CLAUDE.md).

## Operational context

- Repo `/Users/sanan/Documents/rv-connect`, branch `main`, commit with a pathspec (a peer's
  staged files may share the tree). The dev server on :3000 belongs to another session: use
  it, never restart it.
- The lab is admin-only. Sign in through `POST /api/dev-login` as `ADMIN_EMAIL` (the MCP
  route in CLAUDE.md, or `scripts/qa/_dev-login.mjs` for scripts). Never a real alumnus.
- Terrain: `node scripts/dev/valley-terrain.mjs --km 16 --zoom 14` and `--km 64 --zoom 12`
  write `public/lab/valley/height-<km>km.{png,json}`. Both are committed; re-run only to
  change the crop.
- Weather: `src/app/lab/valley/_weather.ts`, Open-Meteo, server only.
- Gate: `npm run check`. The visual suite does not cover lab routes.
- Files: `src/app/lab/valley/` (`_sun.ts`, `_weather.ts`, `_hills.tsx`, `_mark-light.tsx`,
  `_terminator.tsx`, `_seal.tsx`, `_room.tsx`, `page.lab.tsx`, `hills/`, `seal/`), the
  registry rows in `src/app/lab/_registry.ts`, this folder.

## Status board (update every session)

| Item | Status | Notes |
|---|---|---|
| Owner's words on disk | DONE | `brief.md`, ¶1 to ¶8, 2026-09-16 |
| obys read, taste digested | DONE | "Where the taste came from" above; the source is the obys `docs/TASTE.md` and the verbatim reviews |
| Elevation data fetched | DONE | 16 km and 64 km crops, `public/lab/valley/`, 2026-09-16; school at 712 m, ridge to the west up to 1,300 m at 6 km, 1,344 m at 19 km |
| `_sun.ts` written and pinned | DONE | position, clock, sunrise/sunset, moon phase, sky palette; `_sun.test.mjs` |
| The hills room | DONE, round one | `/lab/valley/hills`; shot at sunset, morning, night, from above, from the school, both viewports. Round two ideas: a real skirt so the model's edge reads as a table model rather than a fade; a compass rose; names on the three peaks once he confirms which hill is which |
| The mark, lit | DONE | on the overview: the rail at 19px through nine hours, the planes at 64px |
| The world at this hour | DONE | on the overview, with members' 44 cities |
| The seal | DONE | `/lab/valley/seal`; luminance height map after the first cut came out as a ring |
| Overview room and registry | DONE | `/lab/valley` with two children |
| Screenshots, both viewports, two rounds | DONE | twelve shots read, two bugs found and fixed |
| `npm run check` green | DONE | 129 tests |
| Progress entry and commit | DONE | 2026-09-16 |
| Round two, same night | DONE | the live hills embedded on the overview (compact: no dial, no wheel capture so the page keeps scrolling), the sun drawn as a disc in the sky under the canvas so a ridge can stand in front of it, a north needle while orbiting |
| His review of round one | DONE | 2026-09-16 morning, ¶9: none taken as it stands; verdicts recorded above and in `next-session.md` |
| Round two, fresh ideas | IN PROGRESS | 2026-09-16, a fresh Fable session: sixteen candidates judged in `ideas-round-two.md`; three rooms under `/lab/years`. The wall DONE (commit 6302bae2), then DONE, the weave next |

## Log

- 2026-09-16, afternoon. The wall committed (6302bae2): three levels, both viewports, pinch and drag through CDP, the three-tap cycle. Then built and shot: three pairs, five moments each, both viewports; the rest state moved onto the photograph quads with a per-pixel fade after the first round showed the grains posterizing it.
- 2026-09-16, late morning. Round two opened. Read everything `next-session.md` named, measured the database (1,719 of 1,815 photographs are the Class of 2023's; 96 valley photographs captioned by place; 83 members, 57 with a house per year), queried OpenStreetMap for the campus (109 paths, named places, no building outlines). Wrote `ideas-round-two.md`: sixteen candidates, three to build. Building order: the wall, then, the weave.

- 2026-09-16, morning. He reviewed all four (¶9): none taken. Wrote `next-session.md`, the handover for a fresh session, and this section.
- 2026-09-16, 00:50. Round two: the overview opens on the live hills, the sun is in the sky, north is marked. Shot again at both viewports. The throwaway shot runner used all night is `/tmp/rv-valley-shots.mjs` (not in the repo; `node /tmp/rv-valley-shots.mjs <name-regex>`).
- 2026-09-16, 00:40. All four pieces built and shot; two bugs found by the shots (unplaced late labels, the dead context after React's double mount) and one of mine (a duplicate `press`) that took the dev server down for three minutes. Committed.
- 2026-09-16, 00:20, the opening session (Fable). Read obys (`CLAUDE.md`, `TASTE.md`, the
  verbatim reviews, the particle, zoom, plant and anneal rooms), this repo's design system,
  lab voice, registry and the Collection and mascot specs. Probed and confirmed: public
  terrain tiles, Open-Meteo, the image host's CORS. Wrote the terrain script and both crops,
  `_sun.ts`, `_weather.ts`, `_hills.tsx`. Context at 42% when the owner flagged it; this
  file exists so the night's work survives a session limit.

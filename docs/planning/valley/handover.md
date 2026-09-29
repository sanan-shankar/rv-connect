# The valley campaign: handover

## Start here

Read `brief.md` first, in full: thirteen paragraphs, all his. ¶11 is the ask this campaign
now runs on, ¶12 is what he thinks of the round-one look, ¶13 is his review of the film's
third cut, ¶5 names the three hills. Then this file's board.

## What this campaign is now (2026-09-27)

One thing: **the real valley, flown into.** Everything else the campaign built was deleted
at his word (¶11: *"ditch all the other ideas. Like by ditch, I mean delete them. They're
all bad"*). What survives is the hills, rebuilt from scratch against his three complaints:

- **Realism, not abstraction.** *"maybe more like satellite imagery, much more like
  realism. Right now it seems a bit too abstract. I don't really like the contours. I don't
  really like the colors"* (¶11); *"these ugly horizontal lines and horrible colours it just
  looks like a horribly made video game"* (¶12). The ground is drawn from real aerial
  photographs draped on real elevation, under a real sky. No contour lines, no invented
  palette: every colour on screen is the ground's own. *"The blue is nice"*: the sky stays.
- **Relatable beyond the three hills.** *"this could be anywhere in India ... the only
  reason if I look at this and say, okay, I know what this is, is at the end when I see
  those three hills"* (¶11). Two cures he named, and this does both: a drone-shot path that
  ends on the hills, and enough detail that the school is recognisable on the way (the
  games field, the red-tiled quadrangles, the trees).
- **A clear use, understood by everyone.** *"I want you to tell me exactly where you're
  going to use it. And it shouldn't be something that you kind of have to be like into web
  design ... to understand how cool it is"* (¶11). The use is his own storyboard: the
  landing page opens on it, the flight ends on the three hills, the hills become the mark,
  the mark settles in the top-left corner where the wordmark lives.

Time of day is not a feature (¶11: *"I don't really care that much about the time aspect
... I just want to see it in any one of these"*): one chosen light, fixed.

## The three hills

¶5: *"we called them bodikonda, middle peak, rishikonda left to write. they're actually not
physically that close they just look like it."* The round-one "From the school" view he
recognised (¶11) shows them west-south-west of the campus, and the elevation data puts them
at: Bodikonda about 6.5 km at 1,266 m, Middle Peak about 5.0 km at 1,226 m, Rishikonda
about 4.2 km at 1,077 m (azimuths about 248, 256 and 259 degrees from the school). Nearest
is darkest and farthest lightest in the mark's own planes, which is the haze between them.
He also said Bodikonda is in Karnataka; OpenStreetMap puts the state line about 2.4 km
beyond that peak, so either the line or the naming is loose. Nothing is labelled with a
name until he confirms which hill is which.

## Deleted, 2026-09-27

His verdicts are in `brief.md` (¶9 for round one, ¶10 and ¶11 for all of it). Git history
keeps every file.

- Round one (2026-09-16): the sidebar mark lit by the valley's sun, the directory's map
  with the day/night line, the member's bird pressed into wax, and the overview room that
  held all four. The hills are the survivor.
- Round two (2026-09-16): `/lab/years` and its three rooms (every photograph at once, the
  same bench years apart, everyone who was here as thread), the atlas script behind the
  first, and the ideas file that chose them.

## Considered and not taken (the film)

- **Copernicus GLO-30 instead of SRTM** for the fine elevation (2026-09-28): decoded the
  N13 E078 tile and resampled it onto the film's grid. It differs from SRTM by about 4 m
  and is *smoother* (surface roughness 1.3 against 2.2), because SRTM's extra texture is
  radar speckle. No crisper hills; the softness is the 30 m limit every open model shares.
- **Zoom-19 imagery over the campus**: Esri has none here (its "not yet available" tile).
- **Synthetic rock detail on the hills' geometry**: would make the ridge the mark traces
  differ from the elevation the trace is computed from. The imagery's own relief (bump
  from brightness) does the job on the lit faces instead.

## Decisions

- **LOCKED (¶11).** The hills alone. No second idea rides along.
- **LOCKED (¶11, ¶12).** No contour lines, no invented colours. Real imagery, real sky.
- **LOCKED (¶11).** One chosen light, not a live clock or live weather.
- **LOCKED (CLAUDE.md).** Motion never checks the OS reduce-motion setting. Lab rooms are
  `page.lab.tsx`, registered in `src/app/lab/_registry.ts`. Mobile verified at 390x844.
- **RECOMMENDED.** Raw WebGL2, no library, as round one. The look is custom shading either
  way (the imagery, the haze, the sun), and a library would decide the look for us.
- **OPEN.** The imagery's licence for a public page. The lab uses Esri World Imagery tiles,
  fetched by a dev script into a gitignored folder so nothing reaches a deploy. Shipping it
  on the landing page needs his call between the options the storyboard lays out.

## Status board

| Item | Status | Notes |
|---|---|---|
| His words on disk | DONE | `brief.md` ¶1 to ¶12 |
| Round one and round two deleted | DONE | 2026-09-27; this file's "Deleted" section |
| The three hills located | DONE | from the round-one view he recognised; names unconfirmed |
| Storyboard and where it lives | DONE | `storyboard.md`: the landing page, first visit per device, skippable |
| Imagery and elevation pipeline | DONE | `scripts/dev/valley-film.mjs`; 2,778 tiles from Esri Wayback release 64001 (2026-02-26), 97,599 trees, gitignored |
| The flight, built in the lab | DONE, round one | `/lab/valley`: clouds, trees with shadows, afternoon sun; the ending is trace, glass mark, window into the photograph |
| Screenshots, both viewports, two rounds | DONE | desktop and 390x844, every shot; 42 to 60 fps at 1.25x on his M1 |
| Video cuts | DONE | `?record=1` renders frame by frame; landscape and phone MP4s sent to him twice (the second with the campus look-down) |
| Motion-blurred cuts | DONE | `scripts/dev/valley-film-video.mjs`; landscape and phone sent as the third cut |
| His review of the third cut (¶13) | DONE | flickering spots, a trace that missed the hills, the frame rate, the games-field dip |
| Fourth cut: ¶13 answered | DONE | 60 fps, sixteen averaged moments a frame; the flight paced by height; the trace read off the frame; cloud-free imagery |
| His review of the fourth cut | OPEN | |
| Live room at 60 fps near the ground | OPEN, not blocking | 32 to 46 fps below 300 m: about 700 tile draws at the telephoto hold, trees 7 ms, clouds 3.5 ms; the video is what ships |
| Delete the round-one hills room | OPEN | once he accepts the film; kept for comparison at `/lab/valley/hills` |

## Operational context

- Repo `/Users/sanan/Documents/rv-connect`, branch `main`, shared checkout: commit with a
  pathspec, never stash or reset another session's work, never restart a dev server you did
  not start. Do not push without his word.
- The lab is admin-only. Authed shots: `node scripts/qa/verify-shot.mjs <route> <name.png>
  [mobile]` (writes to `e2e/.shots/`).
- Round one's elevation: `node scripts/dev/valley-terrain.mjs`, crops in
  `public/lab/valley/`. The sun: `src/app/lab/valley/_sun.ts` and its test.
- Gate: `npm run check`.

## Log

- 2026-09-29. His ¶13 on the third cut, answered in the fourth. The spots were NaN pixels
  (relief from screen derivatives on tile skirts) blown up by the bloom; also stabilised the
  tile handover, the tree shadow map and sub-pixel crowns. Measured before designing the new
  flight: the old one moved the ground 25 to 40 px a frame at 60 fps (a kilometre a second at
  150 m) and turned 58 degrees a second over the field; the new one is at most about 15 px and
  12 degrees. The trace is `ValleyRenderer.outline` (a GPU mask of the ground within 7 km,
  read back per column), feet found where the outline stops falling faster than 1 in 12. The
  hold is reframed at 18 degrees so all three hills stand whole. Imagery moved to Esri Wayback
  release 64001: the live service's May 2026 capture has clouds over Madanapalle.
  Render: `node scripts/dev/valley-film-video.mjs [--portrait]`.

- 2026-09-28, later. Simplify pass (four reviewers; dead code, one tile walk per frame,
  shared height helpers in `_geo.ts`). Record mode for video; relief from the imagery's
  brightness and a film grain (the biggest step from rendered to photographed); the
  camera looks down on the games field before tilting up to the hills; the glass mark has
  a rim. Commits 03a19bb8, 16414299, 6a26376c, f9cf6ef2. Render a cut:
  `node /tmp/rv-record.mjs <name> land|port 30 17.8` (a scratch script; recreate from
  the record-mode comment in `_film.tsx` if /tmp was cleared).

- 2026-09-28, early. Built the film at `/lab/valley`: tiled aerial imagery on SRTM with a
  camera-following level of detail, physically based haze and sky, baked hill shadows, 114k
  ray-traced trees from the imagery with a shadow map, volumetric cumulus with the flight's
  gap cut into their coverage, AgX. He reviewed it live while it was built: "fully flat",
  "drab", "the sun blinds" the hills (fixed: heights, colour, a south-west afternoon sun);
  "still looks fake" (trees, clouds, light); the first ending "a non sequitur" (rebuilt as
  trace, glass mark, window into his photograph, from his ¶11 storyboard).

- 2026-09-27. He rejected round two (¶10), then narrowed the campaign to the hills (¶11)
  and called the round-one look a graphics malfunction (¶12). Deleted round one's other
  pieces, the overview, `/lab/years`, the atlas script and the ideas file. Checked the data
  for realism: Esri World Imagery shows the campus at about a metre per pixel (the games
  field, the quadrangles, the canopy); OpenStreetMap has the school's outline, the NH42
  from Madanapalle, the tanks and the state line. Located the three hills.
- 2026-09-16. Round one built and reviewed (¶9), round two built. The full record of both
  is in git history and `docs/history/progress-2026-09.md`.

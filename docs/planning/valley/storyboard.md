# The valley, flown into: storyboard

What it is, where it lives, and what it is made of. Live at `/lab/valley` (drag the
scrubber to any moment; `?t=15.6` holds one).

## Where it lives

**The landing page, `/`.** The first thing anyone sees at the site's address: every new
member following an invite link, every alumnus signing in on a new phone. It plays once, as
the page's opening, and ends on the landing page exactly as it is today: your photograph
under the banyan, "Welcome back to the valley.", the two buttons, the wordmark in the
corner. Signed-in members never see it (they go straight to the feed), so nobody meets it
more than a handful of times.

- **First visit on a device:** the whole film, about 19 seconds. A tap, a scroll or any key
  skips straight to the landing.
- **Every visit after:** the landing opens as it does today, with a quiet "Watch the flight"
  link for anyone who wants it again.

Nothing else in the app changes.

## The film, shot by shot

| Time | Shot | What you see |
|---|---|---|
| 0 to 2 s | Above the clouds | High over the plateau south-east of Madanapalle, cumulus below, coming down through a gap in them. |
| 2 to 7 s | The road in | Over Madanapalle's northern edge and up the NH42, the road every school bus took, high enough that the ground glides rather than rushes. |
| 7 to 10 s | Angallu | Turning west off the highway; the three hills rise ahead for the first time, and the camera comes down over the rocky hill east of the campus. |
| 10 to 12 s | Over the campus | The games field opens up beyond the rocky hill and passes under the camera, the three hills ahead the whole time. |
| 12 to 14 s | The three hills | The gaze lifts to the hills and the camera comes to rest on them. |
| 14 to 16 s | The trace | A line traces the three hills' real outline, foot to foot: Bodikonda, Middle Peak, Rishikonda. The shape it closes fills as frosted glass. |
| 16 to 17 s | The mark | The glass lifts off and flies to the top-left corner, shrinking, and on the way becomes the drawn mark, landing as the wordmark's own. |
| 16 to 18 s | Through the hills | Where it lifted away, a hill-shaped window shows the landing's photograph. The window opens until we are through it. |
| 18 to 19 s | The landing | The headline and buttons arrive. The page is the landing page. |

The camera's speed goes with its height above the ground, so nothing on screen moves more
than about fifteen pixels a frame, and the film is rendered at sixty frames a second with
real motion blur.

The ending is your storyboard from ¶11: *"we go ... the final place we see the hills, and
then ... we kind of like enter the hills, and then that generates the logo, and then that
logo ... goes and sits at the left corner"*, with your photograph as the place we arrive.

## What is real in it

- **The ground:** aerial photographs (Esri World Imagery, about a metre a pixel over the
  campus and the road, from its February 2026 release: the current one has clouds baked
  into the photograph over Madanapalle) draped on SRTM elevation (30 m).
- **The trees:** 114,000 of them, each one found in the photographs and stood up where it
  grows, its colour taken from its own crown.
- **The three hills:** at their real heights and distances. The trace is their outline as
  the frame itself draws it, read back from the picture, so it sits exactly on the ridge.
- **The light:** one afternoon sun from the south-west, the shadows it casts off the hills
  and the trees, and the haze of a hazy Deccan day. The clouds are made up; the sky is not
  a picture.

## How it would ship

**As a film, not a live 3D scene.** The live version in the lab needs a good graphics chip
and about 50 MB of photographs; a phone on mobile data has neither. The same engine renders
the flight frame by frame into two short videos (landscape and portrait, sixty frames a
second), which every phone plays smoothly. The ending (the trace, the mark, the window, the words)
stays live in the page, drawn over the video's last frame, so the logo lands on the real
wordmark and the last frame *is* the page.

## Decisions that are yours

1. **The photographs' licence.** The lab uses Esri World Imagery, which is fine for a
   prototype on this machine and not settled for a public page. The choices: Esri's own
   licence (a developer account; terms to check), a one-off commercial image of the valley
   (a Pléiades or Maxar scene, a few hundred dollars for the area the film sees), or a
   drone flight over the campus by someone at the school (the sharpest of all, and ours).
2. **Which hill is which.** The film traces the three you recognised in round one. The
   names are yours from ¶5; nothing on screen names them.
3. **First visit only, or every visit.** Recommended: first visit, with "Watch the flight"
   after.
4. **Length.** About 19 seconds now. The road section can lose two seconds if it drags;
   below that the camera would have to fly faster than the land can move smoothly.

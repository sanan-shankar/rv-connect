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

- **First visit on a device:** the whole film, about 18 seconds. A tap, a scroll or any key
  skips straight to the landing.
- **Every visit after:** the landing opens as it does today, with a quiet "Watch the flight"
  link for anyone who wants it again.

Nothing else in the app changes.

## The film, shot by shot

| Time | Shot | What you see |
|---|---|---|
| 0 to 3 s | Above the clouds | High over the plateau south-east of Madanapalle, cumulus below, coming down through a gap in them. |
| 3 to 7 s | The road in | Down over Madanapalle's northern edge and along the NH42, the road every school bus took. |
| 7 to 10 s | Angallu | Banking off the highway; the three hills rise on the horizon for the first time. |
| 10 to 13 s | Over the campus | Low over the campus trees, slowing, turning to face the hills. |
| 13 to 15 s | The three hills | The camera comes to rest. A line traces their real ridge: Bodikonda, Middle Peak, Rishikonda. |
| 15 to 16 s | The mark | The traced shape fills as frosted glass: the mark, cut from the real skyline. It peels off and flies to the corner, becoming the drawn mark as it shrinks. |
| 15 to 17 s | Through the hills | Where it peeled away, a hill-shaped window shows the landing's photograph. The window opens until we are through it. |
| 17 to 18 s | The landing | The headline and buttons arrive. The page is the landing page. |

The ending is your storyboard from ¶11: *"we go ... the final place we see the hills, and
then ... we kind of like enter the hills, and then that generates the logo, and then that
logo ... goes and sits at the left corner"*, with your photograph as the place we arrive.

## What is real in it

- **The ground:** aerial photographs (Esri World Imagery, about a metre a pixel over the
  campus and the road) draped on SRTM elevation (30 m).
- **The trees:** 114,000 of them, each one found in the photographs and stood up where it
  grows, its colour taken from its own crown.
- **The three hills:** at their real heights and distances. The mark's shape is the real
  skyline from the campus, which is why the trace fits it.
- **The light:** one afternoon sun from the south-west, the shadows it casts off the hills
  and the trees, and the haze of a hazy Deccan day. The clouds are made up; the sky is not
  a picture.

## How it would ship

**As a film, not a live 3D scene.** The live version in the lab needs a good graphics chip
and about 50 MB of photographs; a phone on mobile data has neither. The same engine renders
the flight frame by frame into two short videos (landscape and portrait, about 6 MB each),
which every phone plays smoothly. The ending (the trace, the mark, the window, the words)
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
4. **Length.** About 18 seconds now. The road section can lose three seconds if it drags.

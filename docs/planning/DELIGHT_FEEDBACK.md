> **Superseded 2026-07-02.** Current source for motion rules: `docs/spec/DESIGN-SYSTEM.md` sec 7. This
> doc remains the authoritative record of the owner's per-item verdicts (build/fix/skip/defer) from the
> `/preview/delight` walkthrough and is the newest feature-detail layer for delight work; consult it
> for WHAT to build before consulting `docs/planning/DELIGHT_FIX.md` for HOW/where. Kept current for
> unresolved items (composer rework, loading-ideas gallery, easter-egg verdicts); not all items here
> have shipped yet.

# Delight lab: owner feedback, tracked line by line

Source: the owner's full walkthrough of `/preview/delight` (2026-06-30). Every instruction is captured
here so nothing is dropped. This round REFINES the lab to final quality; promotion into the core app is a
separate, coordinated pass on the owner's word (other sessions are editing core concurrently).

Status key: [build] building this pass in the lab · [keep] approved, preserve as is · [fix] change per note
· [defer-hoopoe] owned by the owner's other session · [ideas] needs another idea round before any build
· [skip] dropped per owner · [clarify] owner asked me to explain what I meant; addressed in the reply

Lane: which lab route/file. Promotion target noted where it differs.

---

## Global decisions (apply everywhere)

- [keep] One spring for everything. Adopt the single spring set across the product.
- [keep] FadeRise entrance is good. Use it for enters / route changes / empty states.
- [build] Press feedback is barely noticeable; make it more intentional. (Done in `_kit` SpringPress:
  tap sink 0.93 + small hover lift, snappy spring, transform only.)
- [build] REDUCED MOTION: the owner overrides the usual rule. Every animation runs all the time,
  regardless of the OS reduced-motion setting. Nothing here moves fast or jars; the people will want to
  see it. Lab already ignores OS and is toggle-only. Promotion note: the REAL app must also NOT gate on
  `prefers-reduced-motion` for these (owner's explicit call).
- [skip] DARK MODE: light mode only for now. Do not invest in dark mode. (Anything "theme transition"
  related is parked with it.)
- [keep] Hearts are always red. Only transform animates; colour never fades through dark.

## Page-load / landing load

- [build] On a fresh machine the landing content paints, then the photo pops in a beat later. Make
  everything arrive together, intentionally (not necessarily FadeRise; pick the best thing). Lane:
  transitions route demonstrates a "hold until images are ready, then reveal as one" choreography.
  Promotion target: real landing page.
- [build] Landing to login: slide the shared elements off to the left while the login panel slides in
  from the right; same background and logo stay put. Owner loved this and the bounce. Lane: transitions.

## Navigation & transitions (transitions route)

- [build] Sliding sidebar active marker. Must-have, no debate. The active indicator slides between items.
- [build] Segmented control thumb slide. Must-have. (Already in kit `Seg`; feature it.)
- [build] Content cross-fade + size between feed views/tabs. Must-have.
- [keep] Letter vs fade entrance distinction is fine.
- [clarify] "Valley wash in parallax" was not legible; owner could not see it. Real background is a static
  photo, so a moving-background parallax has no home. Downplay / remove it and label it "not used."

## The living valley (landing route)

- [build] Effects belong BELOW the calm first-photo hero, in the section that describes the site. That
  section is the most-seen part, so it must look great. Keep the calm hero photo at the very top; do not
  change that.
- [keep] Cursor parts the leaves. Done tastefully; keep it.
- [fix] Cursor does not affect leaves in the horizontal band where content sits (only above/below). Make
  at least the side margins of that band react. Nice-to-have, not critical.
- [build] LEAVES: they read as leaf-shaped silhouettes, not leaves. Add detail (midrib + veins, slight
  curl/asymmetry) and real VARIETY: neem, pipal/peepal, banyan, gulmohar, duranta and similar. Colour them
  better. Current count is fine. Include a YELLOW leaf instead of having two greens.
- [keep] Leaves settle on hand-off. Nice touch; keep, and keep this leaf palette (plus the new yellow).
- [build] BIRDS (replace entirely): the current hopping bird has no character and just slides up and down
  like a zombie; the screenshot-hopping bird is sharp, ugly, all black, and zooms like a Star Wars
  character. Ditch both. Build cute, polished, DISTINCT little birds (different species, not one repeated,
  not all black, warm palette) with ARTICULATED LEGS that move individually; a believable hop-and-walk
  gait along surfaces (top of screenshot frames / a branch / the ground) that occasionally jumps to the
  next frame. Much more polished than Flappy Bird. Several birds doing different things.
- [defer-hoopoe] The hoopoe mascot should also appear here with richer capability. Leave a labeled slot;
  the other session builds the character.

## Loading states (loading route + new loading-ideas round)

- [ideas] Do NOT implement loading states yet. The owner wants something much more involved and asked for
  another round of ideas first. Build a richer IDEAS gallery (live mockups) to choose from. Constraints:
  one reusable thing usable on EVERY page (not a different scene per page); enjoyable to watch for however
  long it shows (1 to 10s); not shown at all if the page loads basically instantly; school-relevant.
  Candidate directions floated by the owner: sports-day human avatars (running races, long jump, javelin),
  birds sleeping then waking, birds foraging a grid (liked), many birds in a Pac-Man trail (owner unsure /
  maybe cringe; present honestly).
- [keep] Bird foraging the grid is liked. Refine it into the gallery.
- [fix] Valley-warm shimmer does not loop cleanly (second sweep cuts off at halfway). Fix to a seamless
  loop, then it can stay. Owner likes the colour.
- [keep] Leaves settle on hand-off (also liked here).
- [defer-hoopoe] Hoopoe hopping the rows: it is off-centre in each icon and very small; deferred with the
  hoopoe. For now swap to a plain bird-avatar moving between avatar spots, or mark deferred.
- [build] Letters "Dear friend, ..." draw-on (the quill/envelope writing animation). Owner: "that is a
  must. That is amazing." Keep the icon and colours. Lane: loading-ideas (and reused by the Letters
  compose/read surface at promotion).

## Feedback moments (feedback route)

- [fix] Heart: still lacking and feels jagged, like 5fps versus the smoother animations. Make it buttery
  and smooth (multi-keyframe via tween + ease, never a 3-plus-keyframe spring). Stay always-red,
  transform-only.
- [keep] Heart leaf flourish is good.
- [fix] Bookmark ribbon tuck: when unsaved the outline is uneven (the bottom inverted-V notch is much
  thinner than the three straight sides) and the animation is mid / not visible / not joyful. Even the
  outline and make the tuck clearly visible and delightful.
- [fix] Share: making it a checkmark is good, but the post-morph wiggle feels forced and unnatural. Remove
  the wiggle; let it settle cleanly.
- [build] RSVP to going: incorporate it.
- [build] Poll vote bars: make it happen.
- [build] Bell dot: needed.
- [build] Scholarship fund shows progress: animate the bar filling on load / in-view.
- [keep] Comments open: owner loved it. Preserve.
- [keep] Composer expand/unfurl: good. (Full rework lives in the composer route.)
- [build] Bird avatar reacts on tap: the rotate + enlarge is good; refine it to be polished and
  intentional.
- [fix] The "noise" coming out of the avatar on tap is two crude curved lines; make a nicer chirp (clean
  concentric arcs / little notes).
- [build] Hover-to-reveal SPECIES: on PROFILE pages only (anyone's profile, including your own), hovering
  the bird shows its species name.
- [clarify] "Send a toast": owner likes the animation but does not know where it goes. Keep the demo;
  explain it fires on confirmations in-app (contact saved, post shared, RSVP) via the existing toast
  system.

## The composer (rework; new composer route)

- [build] Do research on how good social composers are built, then rework. Owner likes the expand/open.
- [build] Do NOT keep photo/poll/letter visible at all times. Tuck them away.
- [build] Poll is rarely used yet takes major space; tuck it away specifically (behind a more/plus menu).
- [build] Remove the suggested tag chips (campus memory / life update / looking for connections / photo /
  general). No tag suggestions. Instead a small "add a tag" affordance: click it to add one tag (e.g.
  Memory, School update). Do not waste vertical space on tags.
- [build] Bold + italic needed. ADD underline + strikethrough. No superscript/subscript. The formatting
  controls currently feel stranded; integrate them cleanly (e.g. on focus, inline).
- [fix] Focus bug: clicking to type draws a weird extra green shape/box behind the field that needs a
  second click to clear. Only a clean, subtle focus treatment on the field itself (a soft ring that fades
  in). No double green.
- [build] Clicking the empty background (no tiles/elements) should auto-retract the composer; there is
  currently no obvious way to collapse it.
- [build] Post button shape: the current core curvature looks dated. Reshape it into a clean, confident
  button. (The lab/delight post button was preferred over the core one.) Animate the enabled state.

## Bird avatar (cross-cutting)

- [build] React on tap (rotate + enlarge), refined and intentional. (feedback route)
- [fix] Better chirp animation. (feedback route)
- [build] Species name on hover, on profile pages only. (feedback route demo; promotion target: profile)

## Easter eggs & ambient (eggs route)

- [build] Hover the logo to reveal a school fact. Make 10 made-up RV facts. Same fact for the whole
  page-load session; a different one on reload (hovering repeatedly shows the same one). Tasteful.
- [keep] Konami "valley flash": liked the birds and the animation. Keep; frame it as "type the Konami
  sequence anywhere."
- [clarify] Time-of-day background tint ("the hour thing"): owner did not get it and there is already a
  background. Skip; explain it was a day-to-dusk wash that has no home with a static background.
- [skip] Dawn-code greeting: not wanted.
- [skip] Heart-streak feather: redundant with the existing heart flourish.
- [fix/skip] Idle peaks breathing + rare crest shimmer: owner sees nothing. Remove the broken version
  (do not ship something invisible).
- [skip] Theme sun-sweep transition: parked with dark mode.
- [defer-hoopoe] Hoopoe corner peek / corner peak: defer to the hoopoe session.
- [clarify] "Bell rouge": owner asks which bell. Explain (a hidden school-bell chime easter egg, distinct
  from the notification bell-dot); hold unless owner wants it.
- [skip] Sound + haptics: owner leaves entirely to me. Holding sound; will consider a subtle mobile haptic
  only where it clearly helps, later.

---

## Deferred to the owner's other session
- The hoopoe mascot and every hoopoe-driven moment (landing mascot, loading hopper, corner peek, trivia
  gate replacement). Lab keeps labeled placeholders only.

## Needs the owner before core promotion
- Confirm the lab-first, then-promote sequencing (vs. me editing core now while other sessions run).
- Loading states: owner picked the SLEEPING BIRDS waking-on-load concept ONLY. Drop sports day,
  drop Pac-Man, and the foraging bird needs a believable peck (it currently reads as twerking, not
  pecking). Not built into the app yet (the app is responsive enough that a loading state rarely
  shows); build the sleeping-birds overlay when prioritized.
- Composer: approve the reworked direction before it replaces the core composer.

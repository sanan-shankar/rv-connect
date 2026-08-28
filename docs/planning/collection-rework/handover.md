# Collection rework — LIVING HANDOVER

## Start here

**@ this file and nothing else.** Then, in this order:

1. **Read [`brief.md`](brief.md) in full.** Not skimmed, not summarised. It is the owner's
   spoken brief transcribed word for word, and he has asked twice that no session work from
   a condensed version of it. Roughly ten minutes.
2. **Read [`spec.md`](spec.md).** The design. Every decision in it is marked **LOCKED**
   (build it), **RECOMMENDED** (you may do better, say so) or **OPEN** (yours to decide).
   §6, §7.1 and §8 are deliberately yours — the owner asked for something better than what
   is written there, not a faithful transcription of it.
3. **Skim [`prior-art.md`](prior-art.md)** — how Instagram, X, Flickr and Google Photos
   solved these same problems. Read it before disagreeing with a recommendation; the
   disagreement may already be answered.
4. **Phase 6 is finished. What is left is the close-out and the owner's own eyes.**
   All six phases have
   shipped their visible half: dimensions are stored, one photograph in a column has one
   rule, several together are justified rows everywhere, the viewer is rebuilt, the
   Collection page is a river with six buckets and a decade rail, and contributing is a
   pop-up you drop a hundred photographs into. **The status board below is the truth**;
   this is the short version of it.

   The three pieces of §8.3 and §9 that were owed all shipped on 2026-08-28 (session 6):
   the suggestion pass, in a shape the owner redirected (**D37** — no API, a session in
   this repo looking at the photographs); the crop handle (**D38**); and the approval
   queue's selection (**D39**). The trusted-contributor toggle the board asked for turned
   out to **already exist** on a member's profile — see F45, and do not go looking for it.

   **So what is left is the close-out in the status board**, which has one trap in it:
   `/lab/crop`'s specimens are now shared with `/lab/collection`, so retiring that room
   MOVES them rather than deleting them (F39). And **the owner has not looked at most of
   this** — Open questions 1, 2, 3 and 6 are the backlog of things built and unseen. If he
   is in the room, that is worth more than any new work.

**Operational context is spec §15** — repo, branch, the gate, screenshots, the test account,
the one database behind both production and local dev, and the rule that a push is a deploy.
Read it before you run anything. Two things this session learned that are not in it:

- **The chrome-devtools MCP cannot sign in.** Every page worth looking at needs a session,
  including `/lab`, and `scripts/qa/_dev-login.mjs` exists precisely because the secret must
  not enter page JavaScript — it signs in from Node and copies the cookie into the browser.
  CLAUDE.md still says to POST the secret from `evaluate_script`; do not. Use
  `npm run verify:shot <route> <name.png> [mobile]` for a shot plus a console check, or a
  short scratch probe built on `_probe-kit.mjs` + `_dev-login.mjs` when you need geometry.
  Delete the scratch probe before you commit.
- **The machine is often shared with another Claude session building at the same time.**
  `npm run check` took 556 seconds one run and 24 the next, on the same tree. That is load,
  not a regression. Do not start a browser fleet; one page at a time (the owner's Mac has
  hung).

`.claude/skills/writing-for-agents/SKILL.md` governs how you edit this file and anything
else you write for the session after you.

**Before your session ends**, edit this file: status board, decisions, session log. The
next session starts by @-ing it alone, so whatever is not written here is lost.

This file is an *index into* `brief.md`, never a replacement for it. It follows the
`docs/audit-fix/*/fix-prompt.md` living-handover convention (see that folder's README), but
lives under `docs/planning/` because this is a design and rework campaign rather than an
audit and its fixes.

## What this campaign is

One spec — the owner's explicit choice over splitting it — covering four things that turn
out to share one root cause:

1. **The Collection archive**: organisation, buckets, tags, filtering, search, the landing
   page, at a target scale of 20,000 images.
2. **Bulk upload and tagging**, including LLM-assisted tagging, because 70–80% of images
   are expected to arrive in bulk and the owner cannot ask a contributor to tag 100 photos
   one at a time.
3. **The image viewer**, rewritten: edge to edge, the caption panel redesigned, the
   separate `/collection/[id]` page probably deleted.
4. **A robust cross-app image layout system** for feed, catch-ups, letters and Collection,
   so no photograph is ever butchered by a crop again.

The root cause shared by (3) and (4), and the reason they cannot be done separately: **we
do not store intrinsic width and height for feed, letter or catch-up images.**
`Post.images` is a JSON array of URL strings. Only `Photo` rows carry dimensions. Without
dimensions you cannot reserve space, cannot compute justified rows, and cannot make an
informed crop decision. This is also open bug #18 (`docs/planning/bugs.md:221`), which
says "the owner is reworking how photos crop and size and will fold this in" — this is
that rework.

## Status board (update every session)

- [x] **Brief captured verbatim** — `brief.md`, 2026-08-26.
- [x] **Billing question answered** — see Findings F1. Collection does *not* go through
      Vercel's metered optimiser today. The naive fix would put it there; the design must
      not.
- [x] **Reference gallery identified** — see Findings F2. Pixieset, justified rows.
- [x] **Crop bug root-caused** — see Findings F3.
- [x] **`/lab/crop` room** — built, session 1. Six crop rules against six awkward
      photographs at the three real column widths, plus justified rows against today's post
      grid and today's masonry. Every control is a URL parameter, so a comparison can be
      linked: `?mode=six|scroll|many&w=phone|laptop|wide&photo=<key>&policy=<key>&n=2|3|4|6`.
      The maths is in `src/app/lab/crop/_policies.ts` and `_justified.ts`, written to be
      lifted into the real components rather than retyped. Two extra controls were added
      after the first pass, because the numbers showed the six rules were not the whole
      decision: **portrait floor** (4:5 / 1:1 / 5:4) and **photo width cap** (full column /
      900px / 720px), then a seventh rule and a **tall-photo height ceiling** (560 / 700 /
      840px), then an eighth rule of the owner's own and a fill control. See F8, F9 and F10.
- [x] **Prior art researched** — `prior-art.md`. Owner asked for it directly mid-session.
- [x] **Owner picked a crop policy** — 2026-08-27, over several rounds in `/lab/crop`.
      D6 to D12 are the rule, F8 to F13 the reasoning, D15 the height it settled at after he
      had lived with the shipped version.
- [x] **Write the spec** — [`spec.md`](spec.md), 2026-08-27. Fifteen sections, six phases,
      and a table in §14 mapping all 55 ledger asks to where each is answered. Two are
      deliberately out of scope with reasons in §15 (Letters' use of space, and renaming
      the Collection).
- [x] **Owner reviewed the spec** — 2026-08-27, "I read your spec and it's mostly fine",
      plus the three changes now folded in: search must still read descriptions (§7.2), a
      splendid contribute room rather than a dialog (§8.2), and an Other bucket (§7.1).
- [x] **How to write for the next session** — `.claude/skills/writing-for-agents/SKILL.md`,
      wired into CLAUDE.md's skills table. See F14; the owner had raised it twice.
- [ ] **Execute, phase by phase** — spec §13. No separate plan document, deliberately:
      §13's six phases plus the LOCKED / RECOMMENDED / OPEN marks are the plan at the right
      altitude, and a task-by-task breakdown would re-introduce exactly the over-constraining
      the owner objected to.
  - [x] **Phase 1 — dimensions**, session 2, 2026-08-27. The `Image` table, both upload
        routes recording what they store, both delete paths forgetting it, and
        `scripts/dev/backfill-image-dimensions.mjs`. Applied to the main and demo databases;
        41 and 2 rows backfilled, none failed. Nothing visible changed. See D13a and F15/F16
        for the two places the implementation departs from spec §2, and why.
  - [x] **Phase 2 — the layout module and the single-photo rule**, session 2, 2026-08-27.
        `src/lib/photo-layout.ts` and `<PhotoFrame>`, used by the feed, the Catch-up answer
        card and letters. The chopped faces (#35) and the page jumping (#18) stop here.
        Measured at both viewports, at the 500px ceiling it ended on: a tall Catch-up photo
        is 375x500 with 226px of bed each side at 1440 and 314x419 with none at 390; a 4:3
        feed photo went from 728x384 cropped to 728x546 whole; CLS 0.0000. See D14 and D15
        for the two places the rule moved after the spec was written.
  - [x] **Phase 3 — justified rows**, session 3, 2026-08-27. `<PhotoRows>` and
        `<PhotoStream>` in `src/components/common/photo-rows.tsx`, the maths in
        `photo-layout.ts` beside the single-photograph rule, and all four surfaces on them:
        the post card, the Catch-up answer card, the Catch-up photo wall and the Collection
        grid. Built as **flexbox rather than measured pixels** (F22), so the row count
        follows the column instead of a rule (F23) and nothing has to run after first paint.
        `/lab/crop/_justified.ts` is deleted -- it was the second implementation. See D16 to
        D18 for the three places this departs from what the spec wrote down, and F22 to F25
        for the measurements behind them. **D17 is the one the owner should be told about**:
        a tall photograph inside a row is brought to 3:4 exactly as it is when alone, which
        the spec's D12 said would not be necessary.
  - [x] **Phase 4 — the viewer**, session 4, 2026-08-28. Edge to edge, chrome that
        withdraws on stillness, the caption panel deleted, the date taken instead of the date
        uploaded, the heart and the buckets folded in, a member's own delete, and
        `/collection/[id]` reduced to the route. Catch-up photographs open too (#36, #41),
        which was the last surface where a photograph was not clickable. See D22 to D25 and
        F30 to F33.
  - [x] **Phase 5 — the Collection page**, session 5, 2026-08-28. The river, the six
        buckets on one line of words, the decade rail that replaced the When dropdown,
        search on the title line, "Through time" with sticky decade headings, keyset
        pagination, batched loading and `content-visibility` windowing. The Part-of-school
        dropdown is deleted, not restyled. `/lab/collection` is where to judge it: 240
        made-up photographs, because the database holds two. See D26 to D31 and F34 to F39.
  - [x] **Phase 6 — the contribute pop-up**, session 5, 2026-08-28. Bulk drop, paste and
        browse; the wall of justified rows the photographs develop into; the six bucket
        tiles; batch questions against a selection; the hoopoe at the end. See D32 to D36
        and F40 to F44. **Not all of §8**: three pieces are still owed and are the next
        session's, below.
  - [x] **Phase 6, the rest**, session 6, 2026-08-28. All three, in three commits:
        - **§8.3, the suggestion pass** — and the owner changed its shape before a line was
          written (**D37**). No API key, no billing, nothing new in the deployed bundle: a
          picker exports untagged photographs into a gitignored `.tagging/`, a session in
          this repo reads them, an applier puts the answers back. The rules are in
          `src/lib/photo-suggest.ts` where tests hold them; the procedure is
          `.claude/skills/tag-photos/SKILL.md`. **The live in-room suggestion is not
          built and cannot be without the API call** — say so rather than implying §8.3 is
          wholly done.
        - **§9, the crop handle** (**D38**). `PhotoAimButton` on any composer preview the
          card will cut, drawn at the real frame. `Image.focalSet` is new, so the clamp
          brakes the machine and not the person. F46 to F48 are what driving it found.
        - **§9, the queue's selection** (**D39**). `approvePhotos`, ticks on the waiting
          rows, "Tick all", "Approve N". The **profile toggle already existed** (F45).
- [ ] **OWED BY THE OWNER: an R2 lifecycle rule on the staging prefix.** Bulk upload
      stages every dropped file under `collection/<userId>/...` the moment it lands, before
      anything is filed, which is what makes a drop of a hundred feel instant. A drop that
      is abandoned leaves those objects behind, and nothing in this system can enumerate
      the bucket to find them (that is deliberate, audit C-063). One lifecycle rule in the
      Cloudflare dashboard -- delete objects under that prefix older than a few days --
      closes it permanently. Cheap either way (a stray photograph is a fraction of a cent a
      month), but it is unbounded without the rule.
- [ ] **Close-out**: delete `/lab/crop`, `public/lab/crop/` and the registry row (its
      "several at once" mode now renders the SHIPPED components beside what each surface did
      before, so it is worth keeping until the owner has looked at phase 3);
      fold bug #18, #19, #35 and #37 out of `docs/planning/bugs.md`,
      update `docs/spec/media.md` (large parts of it are now superseded — see D2, D3),
      delete `/lab/crop` and its registry line, log in `progress.md`.

## Decisions locked so far

Each is the owner's, given in this session. Do not relitigate these without asking him.

- **D1. One spec, everything at once.** Not split into a layout spec and a Collection spec.
- **D2. The frame widens: the school's whole visual memory.** People, class photos, events
  and the place all belong. **This supersedes `docs/spec/media.md` §2**, whose entire
  design rests on "the place, not people" and on a taxonomy with deliberately nowhere to
  file a photograph of people. That taxonomy (`src/lib/collection.ts` `SUBJECTS`) is now
  wrong and must be redesigned, not extended.
- **D3. Trusted contributors auto-approve.** Bless a person once and everything they
  upload goes live immediately; everyone else's first N photos queue, then they are
  trusted too. The `photoTrusted` flag already exists on `User` and is already honoured by
  `isPhotoAutoApproved` (`src/lib/collection-photo.ts:103`) — there is simply no UI to set
  it. This supersedes `docs/spec/media.md` §8's "every photo starts unapproved", and
  resolves that spec's own open question 4.
- **D4. "A wander" sort is deleted.** Owner, verbatim: "can you please delete that a
  wander that's not great". It is in `COLLECTION_SORT_OPTIONS`
  (`src/lib/collection-facets.ts`) and in the `loadPhotos` sort switch.
- **D5. The name stays "The Valley Collection".** The owner granted a free hand to rename
  it. Declined, and he did not object: every complaint in the brief is about behaviour, and
  a rename costs the route, the sidebar, the specs and the visual baselines while buying
  none of it. Revisit once the thing works, if ever. Reasoning in spec §16.
- **D6. Crop policy — DECIDED, after eight rules in `/lab/crop`.** Square or wider fills the
  column at true shape, never cut, never barred, so a 21:9 is a thin strip. Taller than wide
  becomes **3:4** on a blurred bed of itself. See D7 to D11 for the rest, D14 and D15 for
  where it moved once it was shipped and looked at, and F8 to F13 for why each number is
  what it is. **All of it is built** — `src/lib/photo-layout.ts`, eleven tests.
- **D7. 3:4, not 2:3 or 4:5.** A phone sensor is 4:3, so held upright it shoots 3:4, which
  makes it the most common portrait anyone will post and one that then passes through
  untouched. Also draws the photo wider with less blur beside it. See F12.
- **D8. Blur, not plain paper, beside a tall photo.** The owner's own reversal, and correct:
  blur as the whole rule squashes every photo into one landscape box and is "a cop out";
  blur as the bed beside a photo already shown properly is just a better background than a
  flat colour. Different things.
- **D9. The crop is aimed at the subject and clamped.** Sharp's `attention` gives a focal
  point at upload; a tall photo's window travels between 15% and 50% down the frame and no
  further. The clamp is not decoration — see F13 and the X precedent in `prior-art.md`.
  **The uploader must be able to override it.** That is a hard requirement, not a nicety.
- **D10. The photograph caps at 900px wide** however wide the card grows. Fixes the
  wide-screen bloat and the graininess of a small file stretched across a 1216px slot.
- **D11. Feed and catch-ups crop; the Collection grid does not.** The grid uses justified
  rows, uncropped. The viewer always shows the true full frame. Owner: "I agree with your
  feed catch ups and collection thing."
- **D12. Several photos in one post use justified rows, uncropped**, at most three per row.
  The row height already bounds them, so cropping buys nothing.
- **D13. No free-text tags; six buckets; everything prose stays searchable.** "Part of
  school" becomes **Where**, read by search, never a dropdown. An **Other** bucket exists
  and feeds evidence back into the taxonomy. Spec §7.
- **D13a. Two departures from spec §2's sketch, both mine, both RECOMMENDED-grade.**
  The spec drew the table with a `blurhash` column; it ships as **`blurDataUrl`**, a 16px
  WebP data URI of about 140 characters. Same job, no new dependency, no decoder in the
  bundle, and it can be handed straight to `next/image`'s `blurDataURL` if we ever want to.
  And measuring is split from remembering — `describeImage` in `image.ts` (sharp) and
  `recordImage`/`forgetImages` in `image-record.ts` (Prisma only) — so the account purge and
  the nightly retention sweep, which forget rows and never measure anything, do not drag a
  native image decoder into their bundle.
- **D14. The height ceiling governs every photograph, not only tall ones.** Mine, and it is
  a small extension of spec §3.1 rather than a departure from it. Written literally -- ceiling
  for `r < 1`, 900px cap for everything else -- a SQUARE photograph comes out 728px tall in a
  laptop column and 900px on a wide screen, so the shape the ceiling exists to bound (a
  portrait at 700px) ends up SHORTER than one it does not. F9 saw this coming and left it
  open. A wide photograph now obeys the ceiling the way a tall one does: by narrowing, never
  by being cut. It touches nothing but shapes between 1:1 and about 1.29:1, and only on a
  column wider than 700px. Say so if you disagree; it is one `Math.min`.
- **D15. The height ceiling is 500px, and it governs every photograph.** He picked 560 from
  `/lab/crop`'s three (560 / 700 / 840), shipped it, looked at it and went lower, verbatim:
  *"also make it 500 instead of 560. 560 makes one post take up my entire desktop screen
  which shouldn't happen."* Worth keeping the reason, because the room could not have shown
  it: the room draws PHOTOGRAPHS and he was judging POSTS. A card is the photograph plus a
  byline, the words and the actions -- about 120px -- so on a 900px-tall laptop window a
  560px photograph leaves nothing else on screen. At 500, nothing anywhere is drawn taller
  than 500px: a tall photo is 375x500, a square 500x500, a 4:3 667x500, a 21:9 900x386.
  It is one constant, `PHOTO_MAX_HEIGHT` in `src/lib/photo-layout.ts`.

- **D16. Justified rows are CSS, not arithmetic in JavaScript.** Mine, and it is the shape
  of the whole phase rather than a detail. `/lab/crop/_justified.ts` measured its stage with
  a ref and computed every rectangle; the app gives each photograph
  `flex-basis: ratio x targetHeight` and `flex-grow: ratio` and lets the browser do it.
  Flexbox breaks the line where the greedy walk would, and sharing free space in proportion
  to ratio is exactly what puts every photograph on a line at the same height. The reason it
  matters: a layout that has to MEASURE its container can only run after the first paint, so
  the photographs land and then jump -- which is bug #18, the thing this campaign exists to
  end, not to relocate. It also renders on the server and survives a resize with no
  JavaScript at all. `_justified.ts` is deleted: one implementation, per spec §3.
- **D17. A tall photograph inside a row is brought to 3:4, exactly as it is when alone.**
  Mine, and **the one thing in phase 3 the owner should be asked about**, because spec §3.2
  and D12 both say several photographs are laid out "uncropped". They are, on the wide side.
  On the tall side the measurement refuses: a real post in his own feed holds a 1.77, a 2.21
  and a 0.45, and solving that row at true shapes drew the 0.45 -- a screenshot -- **72px
  wide beside a 357px neighbour**. Justified rows give every photograph in a row the same
  height, so the width disparity IS the ratio disparity, and 2.21 against 0.45 is five to
  one. Framing first bounds it: the narrowest a row can hold is 3:4 and the same photograph
  posted alone would have been drawn 3:4 anyway, aimed and clamped, on a blurred bed. There
  is no reading of D6 under which a tall photograph alone is 3:4 and the same photograph
  beside two others is a strip. It also sits exactly where **D11** drew the line -- the feed
  and Catch-ups crop, the Collection grid does not -- and the grid is the other component,
  which never does this. The wide side is deliberately untouched: clamping a 21:9 to 16:9
  would cut a quarter off a panorama to buy its neighbours about 20px, against his own "we
  should just let it be a thin photo".
- **D18. The row count follows the column; there is no "three per row".** Mine, and it
  replaces spec §3.2's two guard numbers, both of which were marked OPEN. A count decided in
  JavaScript cannot be right at two column widths at once (F23), and a target expressed as a
  fraction of the column -- which is what §3.2 proposed -- packs the same number of
  photographs into a phone as into a 27-inch monitor, which is the same failure. A basis in
  real pixels wraps on its own: three across a 728px card, one across a 316px one. The
  numbers are `PHOTO_ROW_TARGET = 150` for a card and `min(190px, 30%)` for the grid, both
  measured (F24).

- **D19. Up to a fifth of a photograph may be cut to spare it a blurred bed.**
  The owner's, 2026-08-28, looking at two landscapes in his own feed: *"i'll allow you to crop
  20% of an image to have fewer blur bars. so we don't have bars on these types of things.
  obviously any time there's crop you use sharp to crop decently well."* A photograph square
  or wider is never cut, so the 500px ceiling could only be obeyed by NARROWING it -- which is
  why anything between about 1:1 and 1.46:1 stopped short of its column with blur down both
  sides. `max-width` now carries the budget, `max-height` the ceiling, `object-fit: cover`
  takes the difference off the top and bottom, and the window is aimed at sharp's focal point
  and braked symmetrically (F27). **Two things it deliberately does not touch**: a tall
  photograph, which is already at 3:4 on a bed and where the budget would start cutting the
  commonest portrait anybody posts (D7's whole reason); and anything from 1.8:1 up, where the
  900px cap binds before the ceiling and nothing is ever cut.
- **D20. More than two photographs in a post is a carousel.** The owner's, same message:
  *"I think if there's more than two images we use a carousel. and make sure it's a beautiful
  transition and just done really well. lot of carousels are super basic and not much thought
  and it's not smooth. let's make ours amazing."* One photograph at a time; exactly two stays
  a justified row; one stays one. `src/components/common/photo-carousel.tsx`, and F28 is what
  makes it not-basic.
- **D21. A carousel's photographs share ONE shape, and it is the median of the set.** Mine.
  A carousel has to pick a shape or the card changes height under the reader's thumb, and the
  obvious pick -- the tallest photograph -- reintroduced D19's own complaint one component
  over: two landscapes and a portrait made a 421px frame on a phone, so both landscapes sat in
  121px of bed. The median means the shape most of them already are is the shape they are all
  drawn in; the odd one out is the only one bedded. Clamped to 3:4 and 1.8:1, so a carousel is
  never a shape a single photograph could not be.

- **D22. The viewer never enlarges a photograph past its own file.** Mine, and it is the
  one place where "edge to edge" is not taken literally. Removing the inset makes a 1600px
  photograph fill a 1440x900 laptop (1350x900 against the old 1258x839), which is the ask.
  Making a 980px one fill it as well means painting 1.5x on a 1x screen and 2.9x on his, and
  that is the complaint he has already made twice about the feed -- *"particularly when the
  images are themselves not the highest resolution... we get extremely grainy things"*. So a
  file too small to fill sits at its true size on the wash, sharp, with a shadow under it so
  it reads as a print rather than as a failed load. **The real fix is spec §4's ladder**: a
  bigger derivative, not a bigger box. Worth putting to him if he ever says the viewer looks
  small on a wide screen, because the answer is the ladder and not this rule.
- **D23. The whole caption is the control, in both directions.** Mine, and it is the direct
  answer to *"there is no way to make it disappear except click a very exact small pill"*.
  Pressing the words opens them; pressing them again closes them; so does Esc, which takes
  the caption before it takes the viewer. The smallest target anywhere in the component is a
  40px icon button. What opens with the words is everything the resting state has no room
  for -- the rest of a long caption, the Where line, the buckets -- which is what let the
  separate photo page go.
- **D24. "Withdrawn on its own" and "put away by you" are different states.** Mine. The
  chrome fades after 3.6s of stillness and any movement brings it back; a press on the
  photograph dismisses it and movement does NOT undo that, only another press. One state for
  both would mean a twitch of the mouse re-drawing chrome somebody had just cleared. 3.6s
  rather than the 2.6 it was first built at: on a phone no mouse ever moves, so the press on
  the photograph is the only way back, and a first-time reader needs long enough to find the
  close button.
- **D25. A member's own delete is uploader-or-admin, and shares the admin's machinery.**
  Mine, following `deletePost`, which is the same act on a post and already has that gate.
  An admin removing somebody ELSE'S approved photograph still goes through
  `adminRemovePhoto` and its warm note; this is the plain hard delete. Both now call one
  `erasePhoto`, so audit M17's ordering -- the row and the purge rows in ONE transaction, the
  R2 drain after the commit -- exists once rather than twice. `Photo` is not on the demo's
  `ALLOWED_WRITE_MODELS`, so the demo's default-deny already covers the new action and no
  closed list needed an entry.

- **D26. Photographs first; organisation is a lens, never a gate.** Mine, and it is the
  answer to the owner's own #42/#44. `/collection` opens on the river; there is no folder
  screen anywhere and every control narrows what is already on the screen, in place, with a
  cross-fade rather than a navigation.
- **D27. The whole filter row is deleted, not restyled.** A full-width search field, a When
  dropdown, a Part of school dropdown and a Sort pill become ONE line: the six buckets as
  words with a canopy underline that glides between them, and the count and the order as a
  sentence on the right. Search is an icon on the title line -- the shared `<SearchPill>`,
  extended with a live controlled mode rather than copied. This is #29 and #32 answered by
  subtraction.
- **D28. Two dropdowns are GONE rather than prettier, and each for its own reason.**
  *Part of school* is free text, so its menu heads for two thousand near-duplicates (#30,
  the owner's own reasoning); it is searched now. *When* became the decade rail, which is
  better than the dropdown at the thing a dropdown is for: nine marks whose length is each
  decade's share of the archive, so it says what shape the archive IS at rest, with no
  click. Press one to filter. Below 1280px it is the same words as a scrolling line.
  **Worth telling the owner plainly**: a filter he called "definitely useful" no longer
  has a dropdown. The capability is not gone, the mechanism is.
- **D29. The rail is a filter, not a scrubber, and that is honesty rather than
  timidity.** Google Photos' scrubber maps scroll position to date. The river is keyset
  paginated, so the rows past the current page do not exist in the browser and a scrubber
  would be inventing them. Pressing a decade asks the server, which cannot lie. Revisit if
  the archive is ever fully materialised client-side, which it should not be.
- **D30. A fourth order, "Through time", and one new generated column.** Newest, Oldest and
  Most loved are all sorts of the UPLOAD log, which is the wrong spine for an archive. The
  fourth sorts by when the photograph was TAKEN and turns the decades into sticky headings
  you scroll past -- the foldering the owner wanted (#45), inline, at the cost of no clicks.
  It needed `Photo.takenKey`: year * 100 + month, collapsed from three columns at three
  precisions, GENERATED ALWAYS in Postgres. Undated is 0, not NULL, so it sorts last with no
  NULLS clause and the keyset cursor stays a two-column comparison.
- **D31. Six buckets, and the column keeps its old name.** People · Birds · Nature · Campus
  · School life · Other, replacing the fourteen (spec §7.1). The Postgres column is still
  `subject`: one database serves production and local dev, so renaming it breaks every
  Collection query in production until the next deploy lands, and legibility does not buy
  an outage window. `bucketsOf()` maps on read; the migration maps the rows.

- **D32. Contributing is a POP-UP, and that reverses spec §8.2.** The owner's, 2026-08-28,
  after looking at it built both ways: *"i'm not sure I like the contribute being a separate
  page. I feel like it should a pop up but can be prettier and we have to say the pste, drop
  and browse thing."* §8.2's argument -- a modal is the wrong container for twenty minutes
  with two hundred photographs -- is answered by making it a large one, most of the glass,
  with its own scroll. `/collection/add` is deleted.
- **D33. The photographs are the interface, and they DEVELOP.** Mine, and it is the whole
  room. A dropped photograph appears immediately at full size in the justified rows it will
  live in on /collection, half-faded, and comes up to full as its bytes land. It is the true
  state of the thing and the right metaphor for an archive, it is opacity only, and it is
  what makes the difference between watching a queue drain and watching your own pictures
  arrive.
- **D34. Everything that lands is selected.** Mine, and it is the load-bearing decision for
  the case this campaign exists for. Drop a hundred, type one caption, press School life,
  press Add: that is the five-minute job against "I can't ask him to do it one by one". A
  plain press narrows to one photograph, so a single caption needs no mode to enter first.
- **D35. Nothing is required.** No caption, no bucket, no date. A contribution refused for
  want of a tag is a contribution that does not happen, and the owner has said plainly he
  cannot expect people to fill anything in. §8.3's suggestion pass is what raises the fill
  rate, not a required field.
- **D36. Collection contributions get their own rate limit, at 400 an hour.** Mine, and it
  is a security-adjacent change so the argument matters. Forty an hour was written for a
  one-at-a-time dialog and a contribution spends two of it -- twenty photographs an hour,
  so the photographer's hundred was not slowed, it was impossible. Raising it does NOT
  raise what an abusive account can cost: `MAX_PHOTOS_PER_ACCOUNT` already bounds the total
  at a thousand however fast they arrive, and this only decides how long reaching that
  ceiling takes. The `uploads` meter for post images is untouched, because posts have no
  such ceiling. The old comment on `uploads` said it stood in "until M17's real per-account
  quota lands"; it landed.

- **D37. The suggestion pass is a session in this repo, not a paid API call.** The
  owner's, 2026-08-28, before a line of it was written. Spec §8.3 drew the Claude API with
  structured outputs, prompt caching and the Batch API, and costed a 20,000 backfill at
  about $29 on Opus 5. Asked whether to add an `ANTHROPIC_API_KEY`, he answered: *"I wasn't
  actually gonna do it through API. I was gonna orchestrate it through my regular Claude
  Max subscription on a session in VS Code. It can access all the photos and that should be
  more than enough."* He is right and it is better on every axis that matters here: no key,
  no billing, no runtime dependency, nothing new in the deployed bundle, and a session that
  can genuinely LOOK at the photographs rather than pay per token to. `tag-photos-pick.mjs`
  exports a batch into a gitignored `.tagging/` as 640px JPEGs plus a manifest of what each
  contributor already typed; the session writes `verdicts.json`; `tag-photos-apply.mjs`
  puts it back, dry by default. **What is genuinely lost is the LIVE suggestion in the
  contribute room**, which needed the API call: a new upload still depends on somebody
  pressing a bucket tile, and the answer is to run the pass again when photographs have
  accumulated. Say that plainly rather than letting §8.3 read as finished.
- **D38. A hand-aimed crop is not braked; the clamp is on the guess.** Mine, and it needed
  one column (`Image.focalSet`). `framePhoto` holds a tall photograph's window inside
  15–50% of the frame because sharp's `attention` is a contrast heuristic — of the first 41
  photographs measured, 14 landed within 3% of an edge (F15). That brake belongs on a
  guess. A person who has dragged the window has looked at the photograph, and X's own
  conclusion after withdrawing their saliency crop was that *"how to crop an image is a
  decision best made by people"*. Braking them would make the handle **lie**: the window
  would settle somewhere they did not put it. Not a sentinel value inside `focalY`, because
  every position a person can choose is also one the machine can guess.
- **D39. The queue is a SELECTION, not an "approve everything" button.** Mine. Spec §9 asks
  for "select-all and approve-page"; the ticks are the load-bearing half. A batch approval
  with no way to exclude is how a photograph nobody looked at reaches the Collection, and an
  admin who cannot leave one out will either approve blind or go back to one at a time. The
  bar appears only past one waiting photograph — a single one already has its own Approve
  button two inches to the right.

## Findings from reading the code (2026-08-26, session 1)

- **F1. The Vercel billing question, answered.** `/_next/image` is Vercel's *metered*
  image optimiser. It is used by `src/components/posts/post-card.tsx:446` (feed) and
  `src/components/letters/letter-images.tsx:51` — this is the change the owner
  half-remembered. **The Collection does not touch it.** Tiles serve `photo.thumbUrl` (a
  480px WebP generated at upload) and the viewer serves `photo.url` (1600px), both
  straight from R2, zero egress, no per-request bill. Catch-up answer cards also serve
  direct. Avatars and the landing page use the `next/image` component, so they *are*
  metered.
  **The trap this creates:** the textbook way to build a justified no-crop grid is
  `next/image`, and doing that would route all 20,000 photographs through the metered
  optimiser. The design must keep precomputing derivatives into R2 at upload time. Write
  this constraint into the spec explicitly, because the obvious implementation violates it.
  Exact rates depend on the owner's Vercel plan and were not verified in this session; the
  *mechanism* above was verified by reading the code.
- **F2. The reference gallery is Pixieset** (theme "vintage", jQuery, Bootstrap 2.3 —
  a photographer's client-gallery SaaS, not bespoke). Measured live in
  `chrome-devtools`, 1440px viewport: the layout is **justified rows**. Pick a target row
  height; walk the photos in order adding each to the current row until their combined
  aspect ratios fill the container width; then solve for the exact height that makes the
  row fit perfectly. Verified by measurement: a 640×960 portrait renders at 157×236
  (ratio 0.665 against a true 0.667); a 640×427 landscape at 354×236 (1.500 against
  1.499). Zero cropping. Uniform 6px gutters. Row heights vary per row (observed 230, 236,
  268). 35 of roughly 300 images were in the DOM on load, confirming the batched lazy
  loading the owner noticed. **This is a solved, well-documented algorithm** and it does
  exactly what the owner described. It is the same family as Flickr's and Google Photos'
  justified layouts.
- **F3. The cropped faces have one root cause and it is not the layout code.**
  `src/components/catchups/round/answer-card.tsx:41` forces
  `aspect-[16/10] sm:aspect-[21/9]` plus `object-cover` on a single catch-up photo. A
  portrait photograph of a group of people, centre-cropped into a 21:9 letterbox, is
  geometrically a row of shoulders. Two or three photos get `aspect-square`. The feed does
  a softer version of the same thing (`object-cover` with `max-h-96` / `max-h-64` /
  `max-h-48`, `post-card.tsx:461-467`). Letters happen to be fine: `object-cover` with no
  height constraint does not crop.
  **But the reason nobody could fix it properly is F4.**
- **F4. No intrinsic dimensions are stored for feed, letter or catch-up images.**
  `Post.images` is `String?`, a JSON array of URLs. Only the `Photo` model has
  `width`/`height`. `src/app/api/upload/route.ts:132` returns `{ urls }` and nothing more.
  This is why `src/lib/image-cdn.ts` had to be built as a URL helper rather than a real
  `<Image>` component — its own header comment says so. **Any real fix starts here**: the
  upload route must return dimensions and the callers must store them. This is a schema
  change and a write-path change, so it needs `write-path-reviewer` and a dated file in
  `prisma/migrations-manual/`.
- **F5. Bulk upload does not exist.** `contribute-dialog.tsx:236` passes `multiple={false}`.
  Strictly one photograph at a time. `MAX_PHOTOS_PER_ACCOUNT` is 1000
  (`src/lib/upload-shared.ts:43`), `MAX_UPLOAD_BYTES` is 20MB.
- **F6. The current grid is CSS-column masonry**, not justified rows:
  `break-inside-avoid` plus `mb-3` on the tile (`collection-client.tsx:48`). That is why
  the rows do not line up the way the reference gallery's do. Page size is 24.
- **F8. The six rules are not the real decision; two numbers are.** Computing every
  rule against every specimen at the 728px column showed `bounds`, `snap` and `focal` all
  returning **910px** for a 9:16 photo, because all three share Instagram's 4:5 floor and
  728 / 0.8 = 910. That is taller than a laptop viewport, so "pick a rule" alone does not
  answer the owner's one firm constraint. Instagram's 4:5 is tuned to Instagram's ~470px
  desktop column, where it yields 587px. **Copying the ratio without copying the column
  copies the wrong thing.** The two levers that actually decide whether the feed is a chore
  are the portrait floor and whether the photograph is allowed to grow with the card at all
  (brief #39). Both are now controls in the room. The whole-feed heights at 728px with a 4:5
  floor: free 4,587px, bounds/focal 4,089px, snap 4,095px, fill 2,912px, today 2,232px.
- **F9. A seventh rule, and the owner's own split.** Asked for advice, he gave the shape
  himself: a 21:9 should be a thin photo at full width with no bars, blurred fill is "a cop
  out" and not what a professional product would do, and "it's only the tall ones that are
  tricky". Correct on all three. The useful framing to keep: for a tall photo, **displayed
  width, final height and how much you cut are three quantities locked together and you may
  pick two.** So there are exactly three ways to stop a tall photo running down the page --
  cut it (Instagram), narrow it (Reddit, Slack, Mastodon) or blur-fill it (Apple, WhatsApp)
  -- and no fourth. Rule seven, "tall narrows, wide runs free", picks height and no-cut and
  pays in width.
  Two things it is worth not relearning. **The height ceiling must be an absolute pixel
  number, not a share of the column**: tying it to the column drew a 9:16 photo 201px wide
  on a phone, smaller than what ships today, on the device where portraits matter most. At
  700px absolute a phone narrows nothing at all. And **narrow is not blurred fill minus the
  blur**: blurred fill fixes the box at 3:2 so a tall photo comes out 273x485 in a 728px
  column, where narrow gives the same photo 394x700, about twice the picture.
  Still open on this rule: at the 1216px wide column a SQUARE is 1216px tall, which the
  ceiling does not touch because it only governs r < 1. That is what the photo-width cap
  control is for, so on a 4K screen the two controls are needed together.
- **F10. The owner's own rule, and it is a good one.** Asked to choose between cutting and
  narrowing, he proposed a third thing: bring every tall photo to **2:3** and fill the space
  beside it with a blurred copy rather than plain paper. Worth keeping because the numbers
  are better than they look. Cutting a 9:16 to SQUARE costs 44% of the frame; cutting it to
  2:3 costs **16%**, and a 4:5 loses a comparable 17% off its sides going the other way. So
  the damage is small and, unlike the square floor, even in both directions. What it buys
  over plain narrowing is rhythm: every tall card comes out at exactly the same size
  (467 x 700 at the 728px column, 700px ceiling), where narrowing leaves them ragged.
  He also reversed his earlier position on blur, correctly. Blur as the WHOLE rule squashes
  every photo into one landscape box and is a cop out. Blur as the filler beside a photo
  that is already being shown at a proper size is just a better background than a flat
  colour. Those are different things and the room now separates them: the fill is a control
  ("Beside a tall photo": blurred copy / plain paper) shared by both narrowing rules.
  The **photo width cap now defaults to 900px** at his instruction, so the recommendation
  includes it rather than leaving it as an extra. Without it a square photo is 1216px tall
  on a 4K screen, which no height ceiling touches, because the ceiling only governs r < 1.
- **F11. A member cannot delete their own photograph. At all.** Verified by reading
  `src/app/(main)/collection/actions.ts`: the file exports `contributePhoto`,
  `contributePhotoDirect`, `loadPhotos`, `myPendingPhotos`, `togglePhotoLove`,
  `approvePhoto`, `declinePhoto` and `adminRemovePhoto`. There is no member-facing delete
  of any kind. Both removal paths are gated on `session.user.role !== "admin"` and return
  "Not authorized" otherwise (`declinePhoto`, line 626).
  This is bigger than a missing button. It is the only place in the product where a member
  can publish something and then cannot unpublish it, and it lands badly against work
  already done elsewhere: the security overhaul built account deletion and image purging
  precisely so people keep control of what they have put here. A contributor who uploads
  the wrong photo, or a photo of someone who then objects, currently has to find an admin.
  It also makes the D3 trusted-contributor decision sharper rather than softer: once a
  trusted person's uploads go live instantly with no queue in front of them, the ONLY
  correction available is a delete, and they do not have one.
  Needs: a delete on the photo's own controls for its uploader, reusing `declinePhoto`'s
  existing purge machinery (which is already correct -- row first, then bytes, atomic, per
  audit M17) behind an uploader-or-admin check rather than an admin-only one. This touches
  a server action, so it wants `write-path-reviewer` before it ships.
- **F12. 3:4, not 2:3, and the reason is the phone.** The owner asked whether 2:3 was too
  tall. It is, for the feed. A phone camera's sensor is 4:3, so held upright it produces a
  3:4 photograph, which makes 3:4 the most common portrait shape any member will ever post
  and, at a 3:4 target, one that passes through completely untouched. 2:3 is the 35mm
  shape: right for the school photographer's DSLR, wrong for everyone else. At the 728px
  column with a 700px ceiling, 3:4 also draws the photo **525px wide with 102px of blur
  each side**, against 467px and 131px at 2:3 -- a bigger picture and less of the blur he
  dislikes. The cost is that a 9:16 keeps 75% rather than 84%, and 9:16 is a screenshot or
  a video still, not a framed photograph. The cross-loss is symmetric and so decides
  nothing: a 3:4 photo loses 11% to a 2:3 target and a 2:3 photo loses 11% to a 3:4 one.
  **The room now defaults to 3:4** and offers 4:5 / 3:4 / 2:3 as a control.
- **F13. Aiming the crop, with brakes.** Owner: "make sure the crop does detect subject
  though ... if there's no downside to it might as well get a slightly better position."
  Agreed and done, but clamped, and the clamp is the whole point given F2's X precedent.
  A tall photo's window may travel only between **15% and 50%** down the frame; heads live
  in the upper half, so the worst case of a bad guess is the plain centre crop we would
  have done anyway. A wide photo's window travels between 25% and 75% across.
  Three things make this a different proposition from the one X withdrew, and **all three
  must hold or it is not worth shipping**: it only nudges (the crop is 25% at most, where X
  cut arbitrary images down to a small 16:9 preview and so chose which of several people
  you saw); it is clamped; and **the uploader must be able to override it**, which is X's
  own replacement and is not built yet. That override belongs in the spec as a hard
  requirement, not a nice-to-have.
  Honest measurement: on the six specimens, aiming moves the window by two or three per
  cent, because they are landscapes with no single subject. The owner saw this himself and
  called it marginal. It earns its keep on a photograph of a person standing off to one
  side, which is the case the archive is about to fill up with.
- **F14. How to write for the next session, which is now a skill.** The owner has raised
  this twice in two different forms and asked that it stop being something he repeats:
  `.claude/skills/writing-for-agents/SKILL.md`, triggered from CLAUDE.md's skills table.
  Two failure modes, both his words. **Distilling**: "I've told you many tiny things and
  many things we have to beat, and many of my opinions, and you have only distilled them
  down to the most important things... Do not lose any important information because that's
  when you get a lower quality result than if you just use the session that we're using
  right now." And **over-directing**: "you're giving such direct instructions that you're
  not going to allow that session to be creative enough. You've completely constrained it...
  If I just needed one solution, then it's fine to be direct. But we don't know what we
  want, so we need a level of creativity for it to iterate and decide what's best."
  The mechanism that resolves the second one, and the reason the skill is worth having
  rather than being a note: **every decision gets marked LOCKED, RECOMMENDED or OPEN.**
  Without those marks a long document reads as orders throughout; with them it can be
  specific and still leave real room. `spec.md` was rewritten to carry them.
  Also his standing rule on rewriting anything: "rewritten should be pretty exactly the same
  with the grammar tightened up but every single thing still conveyed."
- **F15. The aim is worse than the idea, and the clamp is carrying it.** Now that every
  photograph in the database has been measured, the focal points can be counted rather than
  argued about. Of 41: **14 land within 3% of an edge** of the frame and only **13 fall
  inside the 15–50% band** the tall-photo rule (D9) will actually use. sharp's `attention` is
  a contrast heuristic and it goes for the bright sky, exactly as F8 saw on the six specimens.
  Three things follow. The clamp is not decoration, it is doing most of the work. The
  uploader override in spec §9 is the part that makes aiming defensible at all, and it is
  still unbuilt. And phase 2 must not present the aim as cleverness in the UI, because a
  third of the time it is pointing at a corner.
- **F16. A square photograph reports no focal point at all**, and it took a synthetic test to
  see it. Ask libvips for a square crop of a square image and no crop happens, so
  `attentionX` comes back undefined and the obvious division writes NaN into the column,
  which then poisons every crop computed from it. The probe now asks for the image's own
  shape with 20% off its height, which guarantees a crop whatever the aspect ratio and
  returns both coordinates from the one pass. Pinned by a test named after the case.
- **F17. The blur bed and the loading placeholder are the same object.** The 16px smear
  stored on every `Image` row (about 140 characters) is blown up and blurred with the filter
  the owner approved in `/lab/crop` -- `scale(1.12) blur(26px) brightness(.68) saturate(1.1)`
  -- and it does both jobs: it holds the reserved space with something photograph-shaped
  while the real file arrives, and it is what fills the card beside a tall photograph. The
  alternative, a second `<img>` of the full-size file behind the first, is what the lab room
  did; it costs a large blurred layer per card for a difference nobody can see once a 26px
  blur has been applied. Worth knowing before phase 3 draws a grid of them.
- **F18. `naturalWidth` lies, and it cost twenty minutes.** Measuring a photograph in the
  browser, the same file reported 680px wide on a laptop and 350px on a phone. It is not a
  bug: when an image is chosen from a `srcset` with `w` descriptors, `naturalWidth` is the
  intrinsic size divided by the candidate's effective density, so it tracks the SLOT rather
  than the file. Read `currentSrc` for what was actually fetched.
- **F19. Do not put a surface onto `/_next/image` without knowing it was there before.**
  `<PhotoFrame>` called `photoSrc()` internally, which looks harmless and quietly moved a
  whole surface onto Vercel's metered optimiser: Catch-up photographs had been served
  straight off the bucket since the day they shipped. The owner noticed within the hour --
  *"for some reason the photos don't load until I wait on them for a second. it wasn't like
  this a few days ago. I can't have the user waiting for anything wtf"* -- and he was right.
  Measured in dev: a cold transform is **878ms**, the same bytes from the bucket's own edge
  are **264ms**, a warm transform is 2ms. A Catch-up is the worst possible case for that,
  because a Round is a newsletter: everyone opens it within a day of each other, so the
  first transform is paid by nearly all of them rather than amortised the way a feed photo's
  is. The component no longer decides -- the caller passes the url it wants. **The real fix
  is still owed and it is spec §4:** precomputed derivatives on R2, no optimiser anywhere,
  which also settles F1's billing question for good. Until then the feed and letters keep
  the optimiser they already had (a deliberate 2026-08-26 change, with measurements, commit
  b2216d5) and Catch-ups have their bucket urls back.
- **F20. The blurred bed has to be the photograph, not its thumbnail.** The first version
  used the 16px smear stored on the `Image` row, reasoning that a 26px blur destroys the
  difference anyway. It does not, and the reason is arithmetic: `object-cover` stretches a
  16px source across ~350px of card, so every source pixel becomes a 20px block and the blur
  smears those into streaks. The owner, looking at his own Round: *"I feel like the blur is
  quite shabbily done... very distracting and not smooth and just yucky blur bars."* It is
  the photograph itself now, with the same `src` and `sizes`, so the browser resolves the
  same URL and it costs no second download -- which is exactly what `/lab/crop` did. The
  smear is still stored and still worth having; it is a placeholder, and the Collection grid
  in phase 5 is where it earns its keep.
- **F21. A `display: none` image with `loading="lazy"` never loads, so it never completes.**
  Hiding the bed below a 456px viewport, to spare a phone a blurred layer it can never see,
  hung `npm run visual` outright: `e2e/visual.spec.ts`'s `settle()` waits for every
  `document.images` entry to be `complete`, and a hidden lazy image never is. Ninety-second
  timeout, no pixel diff, nothing wrong with the picture. Two things worth taking from it --
  the trick itself, and that the saving was never measured while the cost arrived inside a
  minute.
- **F22. Flexbox has two traps in it and both cost time.** First, **a flex line whose grow
  factors sum to less than one does not fill**: below one the spec treats them as fractions
  of the free space rather than as shares of it, and the remainder is simply left over.
  Ratio is the natural grow factor here -- free space shared in proportion to ratio is what
  makes a row one height -- but a lone 3:4 photograph has a grow of 0.75, so it took three
  quarters of its row and stopped: 265px wide in a 316px phone card with 51px of nothing
  beside it. Every factor is scaled by 1000 now (`photoGrow`), which changes no proportion.
  Second, and only a diagnostic problem: **React collapses `flexGrow`/`flexShrink`/
  `flexBasis` into the `flex` shorthand** in the style attribute, so a probe selecting on
  `[style*="flex-basis"]` finds nothing and looks like the layout never rendered.
- **F23. The row count is the decision, not the row.** The first implementation balanced
  photographs into rows of at most three in JavaScript -- 4 goes 2+2, 5 goes 3+2 -- and
  solved each row to the full width. It measured beautifully on a laptop and was wrong on a
  phone by a factor of three: a real feed post's three photographs came out 267, 334 and
  113px wide at 151px high in a 730px card, and **47, 112 and 140px wide at 64px high** in a
  316px one. A contact sheet. The fix is not a breakpoint, it is to stop deciding: a
  flex-basis in real pixels wraps by itself, so the same markup is three across a laptop and
  one across a phone, and a photograph that ends up alone on a row is then drawn exactly as
  a single photograph would have been -- same rule, same cap, no second answer.
- **F24. Three measured numbers, and why each is what it is.**
  `PHOTO_ROW_TARGET = 150` is a packing number, not a taste one: it is what decides how many
  photographs share a row, because a photograph's basis is this times its ratio. At 150 a
  730px card takes three ordinary frames at 151px high and a 358px one takes a single wide
  frame or two portraits; raise it and a laptop drops to two, lower it and a phone starts
  putting three across.
  The grid's `min(190px, 30%)` is a percentage of the CONTAINER rather than the viewport,
  because the sidebar appears at a breakpoint and the column does not change width where the
  viewport does. It is aimed **under** where the rows should land, deliberately: flex-wrap
  breaks the moment the next basis does not fit, so a row can only ever grow past the target,
  never settle below it, where the greedy walk is free to take whichever is CLOSER (Flickr's
  own refinement). At 220 the Collection's 4:1 panorama and 5:4 print could not share a
  1112px row -- and the row they would have shared was 207px, nearer 220 than the layout that
  rejected it. At 190 they sit together, at 193px high.
  Measured after: a wall of mixed shapes at a 1216px column lays out in rows of four and five
  at 210-241px, every row spanning 1216 exactly. The reference gallery measured 230-268 at
  1170 (F2).
- **F25. The trailing row needs its own mechanism, and a width cap is not it.** A justified
  layout has exactly one ugly failure: the last row holds whatever is left, so solving it to
  the full width blows a single leftover photograph up to the width of the page. Capping
  every cell fixes that and breaks something worse -- a row in the MIDDLE then runs short
  too, and rows lining up is the entire reason for the layout. Measured: with the cap at
  1.5x the target, one row in twelve on a phone ran to 289px of 358. The grid instead ends
  with an empty zero-width cell of large flex-grow, which can only ever join the last row and
  takes nearly all of its free space, so mid rows fill to the pixel and the last one sits at
  the target height and runs short -- what Flickr, Google Photos and the reference gallery
  all do. A CARD has no ghost: there the last row is usually the only row, and a short one
  reads as a rendering fault.
- **F26. There is almost nothing in the database to test this against.** Two approved
  Collection photographs, one post with three images, no `photo`-category Catch-up prompt at
  all, so the photo wall does not exist in real data. That is why `/lab/crop`'s "several at
  once" mode now renders the SHIPPED components, with a wall of 34 (the six specimens
  repeated) beside what each surface did before. Judge phase 3 there, not on `/collection`.
  A fixture set of real photographs at every ratio -- spec §12 asks for one, including a
  deliberately low-resolution frame -- is still owed, and is the thing that would let the
  visual suite cover any of this.
- **F27. The bars were the ceiling being paid for in width.** Worth stating plainly because
  it is not obvious from the rule as written. A photograph square or wider is never cut (D6),
  so the only way it can obey a 500px height ceiling is to be drawn narrower than its column
  -- and everything between about 1:1 and 1.46:1 is. Measured on the owner's own two posts:
  27px of bed a side on a 1.34:1, 82px on a 1.18:1. Under D19 both reach both edges, losing
  9% and 19%. The aim for a wide photograph is a SYMMETRIC band (0.25-0.75), where the tall
  one is floored at 50%: a portrait's heads live in the upper half, so the worst case of a bad
  guess there is the centre crop, but a landscape has no such rule and sharp's `attention` goes
  for the bright sky -- which on a landscape is the half worth losing. The window can travel at
  most a tenth of the frame from centre anyway, because the crop is at most a fifth.
  **One case is a bad trade and the owner has not seen it**: a square in a card wider than
  625px spends the whole fifth and keeps a smaller bed, a full price for a partial win.
  Avoiding it means knowing the real column width, which means measuring after paint, which is
  the page-jump this campaign exists to end. Flagged, not solved.
- **F28. What makes a carousel not-basic is all gesture, and none of it is a library.**
  Three things, and each replaced something that felt wrong. **The scrolling is the browser's**
  -- a native scroll-snap track follows a finger with the platform's own momentum and
  rubber-band, which no JavaScript drag handler reproduces, and `scroll-snap-stop: always` is
  what stops a fast flick skidding past three photographs. **The arrows use our curve**:
  `behavior: "smooth"` is whatever the engine feels like and is usually flat, so a press
  animates `scrollLeft` on a rAF through `EASE_OUT_SMOOTH` with snapping switched off for the
  460ms, because a scripted scroll and a snapping engine fight each other. **The indicator is
  scroll-linked**, reading the real offset every frame and writing a transform straight to the
  element rather than to state -- so it travels with a thumb mid-swipe instead of jumping when
  the slide lands, and a re-render per scroll frame (which is how a carousel starts dropping
  them) never happens.
- **F29. `<PhotoBed>` is now shared.** The blur beside a photograph was inline in
  `<PhotoFrame>`; the carousel needs the identical thing, and a second copy of a filter nobody
  would remember to keep in step is how the two drift. One component, both callers.
- **F30. A full-screen overlay in the page tree is not on top of the page.** The viewer has
  been `fixed inset-0` at `--z-overlay` since it shipped, and on a phone the sidebar's
  `sticky z-40` header painted straight over it -- the close button included. z-index only
  orders siblings within a stacking context, and an ancestor of the viewer had already
  opened one. It renders through a portal on `document.body` now, which is what `aria-modal`
  had been claiming all along. Anything else in this app that is "above everything" and is
  NOT portalled is worth checking for the same thing.
- **F31. A measurement that runs once can run against nothing.** "More" appears only when
  the caption is really cut off, which is measured (`scrollHeight` against `clientHeight`)
  rather than guessed from a character count, because the answer depends on the glyphs and
  the width. The layout effect ran on the first render -- when the portal ref was still null
  and the component returned null -- and with every other dependency already settled it never
  ran again. Result: a caption clamped at 45px around 90px of text, with no way to open it,
  which is the exact bug this phase exists to end. `portal` is in the dependency list now.
  The general shape: **when a component can return null before its DOM exists, whatever
  gates that render belongs in the deps of every effect that measures.**
- **F32. Two shared primitives had a light-surface hover baked in.** `LoveButton` and
  `ShareButton` both paint the app's ink `state-layer` and send their label to
  `text-foreground` on hover. Over a near-black wash the ink tint has nothing to darken and
  the label walks into the picture. Each grew one `onDark` prop rather than the viewer
  keeping a private copy; the heart, its colour and its pop are untouched.
- **F33. There is still almost nothing real to look at.** Two approved Collection
  photographs, and both are test rows with "asdf" in the caption; the older of them is a
  980x240 panorama, which is how D22 got measured at all. `/lab/viewer` is the room that
  exercises the states (a long caption, Where, buckets, a heart, a delete, a set with its
  counter), but its own specimens are 800-1300px, so the room CANNOT show what edge to edge
  looks like on a laptop -- judge that on `/collection` or on a Round, where the files are
  the real ones. The fixture set spec §12 asks for is still owed and is now overdue twice.
- **F34. Other has to be a real destination in code, or it is a hole.** The spec says
  Other is a sensor rather than a bin. That only works if an unrecognised value LANDS
  there: the first version of `bucketsOf` dropped anything it did not know, so a photograph
  carrying a value from the demo's own seeds would have belonged to no bucket at all and
  shown up in no view -- invisible rather than flagged. It reads as Other now, which is the
  same answer the migration writes into the column, and a test says the two agree.
- **F35. `history.replaceState` is a NAVIGATION to Next, and that broke every shared
  link.** The river writes the view it is showing into the address bar as you filter, so a
  bucket or a decade is a link. On `/collection/<id>` -- the same page with the viewer
  already open -- that write fired on mount, rewrote the URL to `/collection`, and Next
  re-rendered the OTHER route, which has no photograph to open. A shared link landed on the
  archive with the thing it named nowhere in sight, and there was no error anywhere. The
  guard is a comparison against the filters the page was ASKED for, not a ref latched on the
  first run: a ref is defeated by StrictMode's double-invoked mount effect in development,
  which is exactly how the first version let the write through. Pinned in
  `e2e/collection-permalink.spec.ts`.
- **F36. `tsc --noEmit` will report a file clean that a cold run fails.** `tsconfig.json`
  has `incremental: true` and a tsbuildinfo in `node_modules/.cache`, so a file is only
  re-checked when its own dependencies change -- and `useAdminAct` typed its callback as
  `{ error?: string } | void`, a WEAK type that TypeScript refuses from any source sharing
  none of its properties. Every action returning `{ success: true }` on its happy path was
  a real error at that call site, and `npm run check` had been reporting TypeScript clean
  for however long, because the caller changes far less often than the actions it calls.
  **Twenty minutes went into thinking my own change had caused it.** If a type error
  appears and disappears between runs, delete `node_modules/.cache/tsconfig.tsbuildinfo`
  before believing either answer.
- **F37. Trigram beats full-text here, and it is one line either way.** Spec §10 asked for
  a tsvector column and Postgres full-text search. The copy argues against it: full-text
  stems and tokenises, so it answers "banyan" and not "bany", and somebody half-remembering
  a caption types the fragment. Three `pg_trgm` GIN indexes serve the unanchored ILIKE the
  query already writes, need no new column, no trigger and no query change, and pg_trgm was
  already installed in this database (in the `extensions` schema, so the operator class
  wants qualifying).
- **F38. Windowing and justified rows fight, and the decade heading is the truce.**
  `content-visibility: auto` is the browser's own windowing and needs no measured rows,
  which is what D16 ruled a virtualiser out for. But it can only be applied to a CHUNK, and
  chopping one continuous river into chunks breaks a justified row at every seam. A decade
  band is a seam that already ends its rows, so the windowing rides on those and on nothing
  else -- and never on the first band, which is the largest thing painted. In the other
  three orders there are no bands and so no windowing, only batched loading. Say so rather
  than implying the archive is windowed everywhere.
- **F39. There is finally something to look at, and it is `/lab/collection`.** 240
  photographs dealt from the eleven real shapes in `/lab/crop/_specimens.ts`, across nine
  decades weighted the way an archive actually fills (mostly recent, a third undated), six
  buckets and twelve names. It renders the REAL components; only the archive is invented.
  Two things it cost: the fixture must be deterministic or the room cannot be screenshotted
  twice and compared, and the obvious `Math.sin` hash for that is a trap -- its precision is
  not specified by the language, so a server and a browser may disagree in the last bits and
  every value here is immediately floored into an index. Integer mixing instead, and
  remember `^` in JavaScript answers a SIGNED 32-bit integer: forgetting one `>>> 0` made
  half the values negative and collapsed nine decades into three.
  **`/lab/crop`'s specimens are now shared.** When that room is retired its
  `_specimens.ts` and the eleven `public/lab/crop/shape-*.webp` files MOVE somewhere
  shared rather than going with it -- spec §12 has been asking for exactly this fixture set
  since the campaign opened, and it exists now.
- **F40. A Prisma-side default on a Postgres GENERATED column breaks every INSERT.**
  `takenKey` is `GENERATED ALWAYS ... STORED`, and it was declared `@default(0)` in
  schema.prisma. Prisma applies a non-`dbgenerated` default CLIENT-side, which means it
  writes the column into the INSERT, and Postgres refuses a non-DEFAULT value for a
  generated column. Every contribution to the Collection failed, from code that typechecked
  and whose reads were all fine. The owner found it before I did. `@default(dbgenerated())`
  is how Prisma is told the database owns a column: read it, never write it.
- **F41. The stale-client guard could not see it, and now can.** `src/lib/prisma.ts` hashes
  model names and field names, which is why it caught a new column when it was added. A
  field's ATTRIBUTES -- its default, its type -- appear in neither, so changing `@default(0)`
  to `@default(dbgenerated())` left the key identical and the running server kept a client
  that still wrote the column. The generated client exposes no `dmmf` at runtime, so there
  is nothing to fold in; in DEVELOPMENT the key now includes a hash of `schema.prisma`
  itself. Never in production: there is no hot reload there, the file may not be deployed,
  and a data layer that fails to start over a missing file is worse than the bug.
  **This is the third distinct form of CLAUDE.md gotcha 8.** If a Prisma error appears from
  code that typechecks, suspect the cached client before the code.
- **F42. `tsc --noEmit` reports a file clean that a cold run fails.** `tsconfig.json` has
  `incremental: true`. A caller is only re-checked when its own dependencies change, so
  `useAdminAct` -- whose `{ error?: string } | void` is a WEAK type TypeScript refuses from
  any source sharing none of its properties -- had a real error at the content queue's
  `declinePhoto` call that `npm run check` had been reporting clean for however long.
  Twenty minutes went into believing my own change had caused it. **If a type error appears
  and disappears between runs, delete `node_modules/.cache/tsconfig.tsbuildinfo` before
  trusting either answer.**
- **F43. Concurrent upload lanes claim in a ref, never in state.** Three lanes start in the
  same tick; `setPhotos` has not committed by the time the second reads the wall, so all
  three found the same photograph and uploaded it three times over. A `Set` written
  synchronously is the only thing that is true immediately. The same tick trap also had a
  second half: the pump's effect originally depended on `photos`, so every `setPhotos` the
  pump ITSELF made re-ran the effect, whose cleanup cancelled the upload already in flight
  -- the result was discarded and not one photograph ever finished. Read the wall through a
  ref; depend only on how many there are.
- **F44. A presigned PUT that neither answers nor fails stalls the whole wall.** From
  localhost the PUT to R2 simply hangs, and with a fixed pool of lanes three stuck files
  stop the other ninety-seven. `directUploadPut` takes an `AbortSignal` now and the room
  gives each file a deadline proportional to its size (20s plus 20s per megabyte, capped),
  after which it falls back to the proxied path exactly as a CORS-blocked PUT does. One
  photograph in a composer can afford to wait; a wall cannot.
- **F7. A concurrent session is editing this area.** `src/app/(main)/collection/page.tsx`
  changed on disk mid-session (server-side first-page fetch added, `firstPage` prop passed
  to `CollectionClient`). Per CLAUDE.md, work around other sessions' edits, never stash or
  revert them. Re-read collection files before editing them.

- **F45. The trusted-contributor toggle already existed, and the board said it did not.**
  Three sessions carried "there is still no UI to set `photoTrusted`" in the status board
  and in spec §9. It is on a member's admin profile under **Powers**, beside Admin
  (`person-detail.tsx`, and `adminSetPhotoTrusted` in `admin/people/actions.ts`), with a
  blurb that says what it does rather than what the column is called. Somebody built it and
  nobody struck the line. **The lesson is not "check before building" — it is that a
  status board copied forward is a claim, not a fact.** The three items on it were checked
  against the code this session and one of the three was already done.
- **F46. `git commit -- <paths>` takes the WORKING TREE, not the index.** This repo's own
  rule for a shared checkout is to commit with an explicit pathspec so a peer's staged work
  cannot ride along. It does not do what it looks like: naming a path commits that file's
  working-tree contents and **ignores whatever was staged for it**. So `git apply --cached`
  of a single hunk, followed by `git commit -F - -- CLAUDE.md`, committed BOTH hunks — the
  owner's own uncommitted edit went in with mine. Harmless here (his change, and one he
  wanted), but the technique for splitting a file is `git add -p` or `git apply --cached`
  followed by a **plain `git commit` with no pathspec at all**, having staged only what you
  mean. The pathspec form is still right when you are committing whole files.
- **F47. A portalled dialog is a click OUTSIDE the composer, and this is the second time.**
  `create-post-form.tsx` collapses on an outside mousedown, and its guard named
  `attachOpen` by hand with a comment recording the identical bug for the attach-photo
  popup in August 2026 ("composer reset when you browse for files... nothing uploads").
  The crop handle was a second portal and did the same thing: opening it and dragging
  collapsed the composer out from under the dialog, taking the uploaded photograph with it.
  A third would have repeated it again, so the guard now asks whether the click landed in
  **any** `[role="dialog"]` rather than keeping a list of them. **Anything else in this app
  that closes on an outside click wants the same question asked of it.**
- **F48. A dialog that shows "what it will look like" has three ways to lie, and driving it
  found all three.** None would have shown up in a screenshot. (1) It opened at the RAW
  `focalY` where the card draws the CLAMPED one — 9% against 15% — so its first frame was a
  photograph nobody had ever seen. (2) `object-position` takes whole percent and the drag
  stored a float, so a window approved at 53% was saved as 0.5747 and drawn at 57%; the
  value is quantised now, and the number on screen is the number in the row. (3) Bounding
  the frame with `max-height` to keep the dialog inside a short window clamped the box
  **without narrowing it**, so a 3:4 frame drew at 375x468 — 0.80. The cap is a `max-width`
  now. The general shape: **if a preview claims to be the real thing, every bound on it has
  to be expressed in the axis that keeps the shape.**
- **F49. `hasContent` in the composer counts words only, and photographs are not words.**
  Found beside F47 and deliberately NOT fixed, because it changes behaviour nobody asked
  about. An outside click on a composer holding three uploaded photographs and no text
  still collapses it to the pill. The photographs survive in state and come back when it is
  re-expanded, so nothing is lost — but they vanish from the screen, which is not what
  "there is nothing here yet" should mean. One clause: `content.trim().length > 0 ||
  images.length > 0`. The owner's call.

## The requirement ledger

Every discrete ask in `brief.md`, itemised so none is quietly dropped. Status is one of:
`open`, `answered`, `decided`, `done`, `deferred`. **This is an index, not a substitute for
reading the brief** — the wording in the brief carries nuance this table does not.

### Scale, cost, organisation

| # | Ask | Status |
|---|---|---|
| 1 | Scale to 20,000 images (and by implication beyond) | **mostly** — phase 5: keyset paging, trigram search, indexes, `content-visibility` windowing in time order (F38). The R2 derivative ladder (spec §4) is still owed |
| 2 | Clarify whether images are being billed through Vercel; "I don't want to be billed by myself for images" | **answered** — F1 |
| 3 | All forms of categorisation, filtering, extremely easy navigation | **done** — phase 5: six buckets, the decade rail, one search box, four orders |
| 4 | Year should not be the primary organising axis | decided (his) |
| 5 | Buckets floated: people, class photos, nature, birds, black-and-white (he notes it overlaps), "how things looked at a certain time" | **decided** — phase 5, the six in D31. His to overrule |
| 6 | Do we need tags at all? He argues both sides and does not settle it | **answered** — no free tags; six buckets browse, everything in prose is searched |
| 7 | An easy workflow for uploading *and* tagging | **done** — phase 6. Drop, one caption, one bucket press, Add |
| 8 | A description box per image, but he cannot expect people to fill it | **partly** — phase 6 asks once for a whole batch and requires nothing. §8.3 is what fills it |
| 9 | 70–80% of images expected via bulk upload | context — and phase 6 is built for it |
| 10 | **Bulk upload must be supported** | **done** — phase 6. Paste, drop or browse, any number at once |
| 11 | Current filtering is "extremely trash" | **done** — phase 5, the whole row is deleted (D27) |
| 12 | A year tag on photos is good | exists, keep |
| 13 | "Part of school" wording; caption and description overlap | **decided** — two fields, not three: the caption IS the description, and "Part of school" is **Where**, one optional line, searched not filtered. Put to him again 2026-08-28; see Open questions 5 |
| 14 | "When" must be present; the year → month, or decade-if-unsure fallback is "pretty smart, actually" | **keep as is** |
| 30 | "Part of school" is free text and will reach ~2,000 distinct values at 2,000 photos, making its dropdown unusable; fold it into the main search instead | **done** — phase 5, the dropdown is deleted and search reads it |
| 31 | Keep newest / oldest / most loved | **done** — all three kept, "A wander" gone, "Through time" added (D30) |
| 32 | The pill-plus-dropdown filter pattern is "not a 10 on 10"; do not reuse it just because it is used elsewhere; keep thinking creatively | **done** — phase 5. Not one pill or dropdown survives on this page except the order menu |
| 29 | The search bar is too big and the controls eat a whole row; consider moving them up in line with the title | **done** — phase 5. Search is an icon on the title line; the controls are one line of words |
| 23 | Study how big archives and photo libraries solve this (he names Imperial's archive); lift from prior art rather than reinventing | **answered** — `prior-art.md` |
| 24 | The school photographer cannot be invited yet | **done** — phase 6 for the upload, D37 for the tagging, D39 for the queue his first hundred lands in. He can be invited |
| 25 | LLM-assisted tagging from descriptions and images | **done, in a shape he redirected** — D37. A session in this repo reads the photographs; no API, no key, no bill. `.claude/skills/tag-photos/SKILL.md`. **The live in-room suggestion is not built** and needed the API call |
| 28 | Design for three audiences: end user, photographer, uploader | **done** — phase 5 serves the first, phase 6 the other two |

### Bugs and gaps found by the owner while talking

| # | Ask | Status |
|---|---|---|
| 15 | A newly uploaded photo does not appear until the page is reloaded | **fixed** — phase 5. The route did refresh; the river was seeded from the prop once and never listened again |
| 17 | Clicking a photo did not open the viewer the first time ("this doesn't even load... Okay. Loaded") | **fixed** — phase 4. It was the `dynamic()` import; every tile now warms it on pointer enter and on focus, as the post card already did |
| 21 | The viewer shows the *upload* date, not the date the photo was taken | **fixed** — phase 4, `takenLabel` in `src/lib/collection.ts`. "May 1978", "1978", "the 1970s", or nothing |
| 36 | Catch-up images cannot be clicked to expand | **fixed** — phase 4. A wall photograph opens the viewer on the WHOLE wall |
| 35 | Catch-up photos crop friends' faces out; "sometimes the catch up just shows a bunch of shoulders" | **fixed** — phase 2 for one photograph, phase 3 for the wall and the legacy multi-photo answer |
| 55 | The white outline around a photo on its blurred bed. Fractional widths (a 2:3 photo is 466.67px in a 728px column) let the frame's own light background show as a hairline down the edge, invisible on paper and obvious over blur | **fixed** — dimensions round to whole pixels, and a photo on a bed carries no background or border of its own |
| 56 | Search must still read the descriptions | **answered** — spec §7.2, yes |
| 57 | "how do we make a really splendid ui for them to do so?... big bucket touch targets so they'll want to do it" | **done** — phase 6, and **his to judge**. A pop-up at his call (D32), not the room §8.2 sketched |
| 58 | "should include an other bucket also" | **done** — it is one of the six, and it is a real destination in code rather than a hole (F34). The tagging pass is told to use it rather than force a fit |
| 59 | Specs and prompts written by AI for AI are too distilled and too constraining; make it a skill so he stops repeating it | **done** — `.claude/skills/writing-for-agents/SKILL.md`, wired into CLAUDE.md's skills table |
| 60 | Catch-up photographs made the reader wait about a second each. "I can't have the user waiting for anything wtf how can we not have the photos ready for them to look at" | **fixed** — F19, they are back on the bucket's own urls. The lasting answer is spec §4 |
| 61 | The blurred bed was "quite shabbily done... yucky blur bars" | **fixed** — F20, the bed is the photograph rather than its 16px thumbnail |
| 62 | "560 makes one post take up my entire desktop screen which shouldn't happen" | **decided** — D15, the ceiling is 500 |
| 54 | **No way for a member to take down a photo they uploaded**, short of asking an admin. Owner, 2026-08-27: "there's no easy intuitive way for me to take down a photo that i've uploaded now? apart from using the admin thing" | **fixed** — phase 4, `deleteOwnPhoto`, uploader-or-admin, behind a confirm. D25 |

### The image viewer

| # | Ask | Status |
|---|---|---|
| 18 | Edge to edge; more immersive; a better photo-to-whitespace ratio. He recalls Dropbox or Google Drive doing it "all the way" | **done** — phase 4, with the one limit in D22 (never enlarged past its own file) |
| 19 | The caption panel is the worst of it: low frame rate, a bottom bar that pops up, dismissible only by hitting one small exact pill. "It's like the worst design ever" | **done** — phase 4. The panel is deleted; the caption is always on screen and the whole of it is the control. D23 |
| 20 | The "2 of 2" counter may not be needed, at least in the Collection | **done** — phase 4. Gone in the Collection (`showCount={false}`), kept where a count is a real fact: a post, a letter, a Catch-up wall |
| 21 | Show the person and the date the photo was taken | **done** — phase 4 in the viewer, phase 5 on the tile |
| 22 | `/collection/[id]` probably should not exist; fold the heart and the tags into the viewer. "That another page isn't even pretty" | **done** — phase 4. The route renders the grid with the viewer open on that photograph; the page design is deleted, and `photo-love-button.tsx` and `photo-moderation-control.tsx` went with it |
| 27 | The caption and its surroundings can be much prettier | **done** — phase 4, and **his to judge**. Two lines on a warm-ink scrim, the buckets and the Where line one press behind them |
| 51 | The reference viewer is simple, intuitive, few elements, though its animations are choppy; ours will have more elements | reference |

### Image display across the app

| # | Ask | Status |
|---|---|---|
| 33 | Feed images stretch on widescreen monitors; low-resolution images go grainy; there is no real limit on feed width | **fixed** — the 900px cap (D10) and the 500px ceiling (D15) |
| 34 | Automatic cropping removes the part that matters | **fixed** — phases 2 and 3, and the uploader override now exists (D38): a handle on any composer preview the card will cut, and `focalSet` so the clamp does not brake a person |
| 37 | Multi-image layouts are more complicated and he does not know whether the logic works | **done** — phase 3 justified rows, and the 2026-08-28 carousel rule: every photograph is drawn exactly as it would be posted alone |
| 38 | Avoid a wall of black bars, but find the right way to crop | **done** — D6, D19, and the carousel frame that follows the photograph |
| 39 | Consider rules for how wide the feed may be | **done** — the 900px cap (D10) and the 500px ceiling (D15) |
| 40 | **Thorough testing across every aspect ratio, and combinations of ratios within one post**, across feed, catch-ups and Collection | **partly** — every ordered pair and triple of nine ratios at all three column widths is asserted in `photo-layout.test.mjs`. The fixture set of real photographs (spec §12) is still owed, F26 |
| 41 | Every image clickable, opening in our viewer | **done** — phase 4. Catch-ups were the last surface; the feed, letters and the Collection already were |

### The Collection's aesthetics and landing page

| # | Ask | Status |
|---|---|---|
| 42 | What do you see on a fresh click? Folders would be most organised but "the most boring" | **decided** — D26. Photographs, immediately; no folder screen anywhere |
| 43 | Many people use the app rarely and just want to see nice pictures without navigating | **done** — the river is the landing state; nothing to navigate |
| 44 | Perhaps show pictures on the landing page with an option to go deeper | **done** — pictures first, buckets and decades are the way deeper |
| 45 | Any foldering must be beautiful, with amazing transitions and incredible attention to detail | **done** — "Through time" folders inline under sticky decade headings; the bucket underline glides; the river cross-fades |
| 46 | Use the screen properly. Letters is "quite a horrible use of space": one column, about three posts, too much whitespace inside and outside the tiles | open — **note this indicts Letters too** |
| 47 | Must not look corporate, or like Google Drive / OneDrive / Dropbox. "It's not a file manager. It should still be a delightful image viewer and archive" | **his to judge** — phase 5. No folders, no boxes, no pills; `/lab/collection` |
| 48 | Which buckets to keep | **decided** — D31 |
| 16 | Tile hover currently shows caption + love count + person; he wants person + year instead | **done** — phase 5, exactly that and nothing else |
| 26 | The tag pills are "okay... not too pretty" | **done** — there are no filter pills left; the buckets are words on a line |

### From the reference gallery

| # | Ask | Status |
|---|---|---|
| 49 | Lazy loading in batches as you reach the bottom | **done** — phase 5, an observer at the foot, 48 at a time, keyset |
| 50 | A justified grid: mixed aspect ratios, even gutters, no black bars, no cropping | **done** — phase 3, `<PhotoStream>` |

### Meta

| # | Ask | Status |
|---|---|---|
| 52 | Free to rename "Collection" entirely | D5 |
| 53 | Consider all the options and pick a well-considered one; do not ship the first idea, as happened the first time | **method instruction, applies to every decision in this campaign** |

## Open questions for the owner

1. **The Collection page, all of it** (phase 5), at `/lab/collection` rather than
   `/collection` -- the real one holds two photographs. Four worth naming, because each is
   a decision rather than a detail: the **six buckets** are a proposal he can overrule
   (D31); the **When dropdown is gone**, replaced by the decade rail, which is the one
   place a capability he called "definitely useful" changed mechanism (D28); **"Through
   time"** is a fourth order he did not ask for, and it is the one that makes this an
   archive rather than a feed (D30); and the **decade rail filters rather than scrubs**,
   for a reason that is honest rather than lazy (D29).
2. **The viewer, all of it** (phase 4). Built, still unseen. The photograph is never
   enlarged past its own file (D22); the chrome withdraws after 3.6s of stillness (D24);
   the counter is gone in the Collection and kept on a post (#20).
3. **The carousel, again** (2026-08-28). He objected to a photograph drawn small, and the
   fix changed the rule: the frame is now the height of whichever photograph you are
   looking at, interpolated across the swipe, so nothing is ever shrunk or bedded. Worth a
   look at the card breathing as it moves, because that is the part he has not seen.
4. **The square case in F27**, which he already owns and nobody has resolved.
5. **Where, and whether it earns its place** (#13). He asked again on 2026-08-28: *"I
   thought we made a decision on the description+where in the valley being a bit redundant?
   where did we land on that?"* Where we landed: **two fields, not three.** The caption IS
   the description -- there is no second overlapping box, which was his own complaint -- and
   "Part of school" became **Where**, one optional line, searched exactly as the caption is
   and never offered as a dropdown (§7.2). So they are redundant in what they DO: search
   cannot tell them apart. The only thing Where buys is that it ASKS a different question,
   and a short field labelled with a place gets a place written in it where a caption gets
   a sentence. That is a real difference and a small one. **His to call**: keep the second
   line, or fold it into the caption and have one field. Folding it in is about ten minutes
   and loses nothing search can see.
6. **The tagging pass, now that it is built** (#25, D37). Two things are his to judge and
   neither is code. **How much a session should take on at once**: the picker defaults to
   sixty, which is a guess about how many photographs a session can look at properly before
   the last ones get answered carelessly. And **whether captions should be written at all**
   — the applier only ever fills a blank, and the skill tells the session to describe what
   is in the frame and never to write a name, because it cannot tell one person or one year
   from another by looking. He may want captions left to people entirely, which is one line
   in the skill.
7. **The crop handle** (D38), which he has not seen. It appears only on a composer preview
   the card is actually going to cut, and it opens the photograph at the real frame — 3:4
   at 375x500 for anything taller. Two things worth his eye: whether the small crop badge
   on an 80px preview is findable, and whether "Put it back" is the right words for
   returning to the machine's own aim.
8. **The queue's ticks** (D39), also unseen. Five waiting photographs is the case it was
   screenshotted at; whether the bar earns its line when there are two is a taste call.
9. **F49, and it is one clause.** An outside click still collapses a composer holding three
   photographs and no text. Not fixed because it changes behaviour he has not asked about.

## Session log

### Session 1 — 2026-08-26 (Opus, in progress)

Brainstorming session. No application code touched.

- Read the Collection surface, the image pipeline, the schema, `docs/spec/media.md`,
  `docs/planning/bugs.md` #18.
- Loaded the reference gallery in `chrome-devtools` and measured it (F2).
- Answered the billing question (F1), root-caused the crop bug (F3, F4).
- Got D1, D2, D3 from the owner; D4 and D5 came from the brief itself.
- Wrote `brief.md` verbatim and this file, at the owner's explicit instruction, before
  building anything, so the campaign survives this session's context filling up.
- Built `/lab/crop` (commit below). `npm run check` green: TypeScript clean, ESLint clean,
  protocol clean, 45 lab routes registered, 78/78 tests. Verified in the browser at 1440 and
  at 390. Note the gate took **656 seconds** rather than its documented 23, because another
  session was building at the same time; that is machine load, not a regression.
- Researched prior art at the owner's request mid-session and wrote `prior-art.md`. The two
  findings that change the design: X measured real racial and gender bias in exactly the
  saliency-crop idea our sixth rule uses and withdrew it, which matters much more now that
  D2 put people in the archive; and Flickr pre-generates justified layout server-side off a
  viewport-width cookie, which is both a 7x first-photo speedup and the thing that keeps us
  off the metered Vercel optimiser.
- The owner picked the crop rule over several rounds in `/lab/crop`; D6 to D12 are the
  result, F8 to F13 the reasoning.
- Wrote `spec.md`, then rewrote it to carry the LOCKED / RECOMMENDED / OPEN marks after the
  owner's feedback on AI-written specs being too constraining (F14).
- **Next session: spec §13 phase 1, stored dimensions.** Everything else sits on it.

### Session 2 — 2026-08-27 (Opus)

Read `brief.md` and `spec.md` in full and skimmed `prior-art.md`, in that order, then built
**phase 1**. Detail in `progress.md` under the same date; the parts that change what the next
session should do are D13a, F15 and F16 above.

- `Image` (schema + `prisma/migrations-manual/2026-08-27-image-dimensions.sql`, applied to
  the main and the demo databases), `describeImage` in `src/lib/image.ts`,
  `recordImage`/`forgetImages` in `src/lib/image-record.ts`, both upload routes recording
  what they store and returning it, both byte-delete paths forgetting it,
  `scripts/dev/backfill-image-dimensions.mjs` and its ledger line, twelve tests.
- Verified at runtime and not only by `tsc` (CLAUDE.md gotcha 3): posted a photograph
  through `/api/upload` signed in, the response carried the measurements and the row matched;
  then an upload that fails partway, to prove the abort takes back the row as well as the
  bytes. `npm run check` green, 77/77.
- The write-path review was done in this session rather than by the subagent, because this
  session was told not to spawn agents. All four invariants checked against the diff by hand:
  auth is unchanged and still precedes every write; no new user input reaches Prisma (the
  only string written is a URL the server itself minted in `putImage`); `Image` is absent
  from the demo's `ALLOWED_WRITE_MODELS`, so the demo's default-deny covers it and no closed
  list needed a new entry; and the schema went through a dated idempotent file applied with
  `run-sql.mjs`, never `db push`.
- Then **phase 2** in the same session: `src/lib/photo-layout.ts` (the rule, pure, eleven
  tests across nine aspect ratios at the three real column widths), `<PhotoFrame>`, and the
  three surfaces wired to it. `image-record.ts` grew the read side. The one surprise is D14.
- Measured live at both viewports with the repo's own probe helpers rather than the
  chrome-devtools MCP: **`/lab` and every signed-in page need a session, and the MCP cannot
  get one** -- `scripts/qa/_dev-login.mjs` exists precisely because the secret must not enter
  page JavaScript, so it signs in from Node and copies the cookie into the browser. CLAUDE.md
  still tells you to POST the secret from `evaluate_script`; do not, and see F18 for the
  measurement trap that wastes the time you save.
- **Then three corrections, all from the owner looking at the real thing** (commit
  `91713f0`): the ceiling went to 500 (D15), Catch-ups came back off the image optimiser
  (F19), and the blurred bed became the photograph rather than its 16px thumbnail (F20).
  One bug of my own on the way, caught by `npm run visual` rather than by me (F21).
- **State at the end of this session.** Phases 1 and 2 shipped in four commits: `a9e0c5c`
  (the `Image` table, both upload paths, the backfill), `07f4bdc` (`photo-layout.ts`,
  `<PhotoFrame>`, three surfaces), `91713f0` (the three corrections). `npm run check` green
  at 78/78, `npm run visual` 23/23, nothing pushed. Uncommitted work in the tree belonging
  to another session: `/lab/glass-edges`, `/lab/hoopoe-marks`, `scripts/dev/apple-edge/*`
  and `docs/spec/apple-edge-light.md`. **Leave all of it alone** and commit with an explicit
  pathspec (`git commit -F - -- path/one path/two`), or it rides along with yours.
- **Next session: phase 3, justified rows.** Read this file, then `brief.md` in full, then
  spec §3.2. Everything it needs is stored.

### Session 3 — 2026-08-27 (Opus)

Read `brief.md` and `spec.md` in full and `prior-art.md`, then built **phase 3**: justified
rows on all four surfaces. Detail in `progress.md` under the same date; what changes what the
next session should do is D16 to D18 and F22 to F26 above.

- `src/components/common/photo-rows.tsx` -- `<PhotoRows>` for a card's handful and
  `<PhotoStream>` for an archive's stream -- plus the maths in `photo-layout.ts` beside the
  single-photograph rule. Wired to `post-card.tsx`, `answer-card.tsx`,
  `question-section.tsx`'s photo wall and `collection-client.tsx`.
  `src/app/lab/crop/_justified.ts` deleted, and `PHOTO_SIZES_*_HALF` with it: "half a card"
  stopped describing any real slot once a photograph's share of its row became its ratio over
  the row's.
- Six new tests, three of which run **every ordered pair and triple of nine aspect ratios**
  at all three column widths -- the brief's "all kinds of combinations of aspect ratios in
  the same post", asserted rather than eyeballed. They found a real case: a 21:9 beside two
  4:3s at 728 leaves the second 4:3 alone on a row where the 500px ceiling binds, so that row
  is 667 of 728 and centred. `drawnRows` reports `capped` so a short row can be told apart
  from a broken one.
- `npm run check` 78/78, `npm run visual` 23/23 with the Collection's two baselines
  deliberately moved (read the diff first -- it is masonry becoming rows),
  `verify:crawl` 20/20.
- **What the owner has not seen yet.** D17, the tall-photograph clamp inside a row, which is
  a departure from D12's "uncropped" and has a measured reason. And the phone behaviour of a
  three-photograph post: three full-width photographs stacked, about 760px in total, where it
  used to be 456px of hard-cropped cells. That is longer, and every photograph in it is
  legible; if he wants it shorter the honest answer is a carousel, not a smaller crop.
  Both are worth putting in front of him at `/lab/crop?mode=many&n=34`.
- **Next session: phase 4, the viewer.** Read this file, then `brief.md` in full, then spec
  §5. Nothing in phases 4 to 6 is blocked -- the layout work is finished.

### Session 3, second round — 2026-08-28 (Opus)

The owner looked at phase 3 in his own feed and asked for two things. Both shipped; detail in
`progress.md` under 2026-08-28, and the decisions are D19 to D21 with F27 to F29 behind them.

- **A 20% crop budget** on every photograph square or wider, which is what was producing the
  blurred bars he objected to: the ceiling could only be obeyed by narrowing, and now it is
  obeyed by cutting instead. `framePhoto` gained `maxHeight`, and every row cell carries it.
- **A carousel past two photographs** (`photo-carousel.tsx`), with the set agreeing on one
  shape. `<PhotoBed>` came out of `<PhotoFrame>` so both use one blur.
- `npm run check` 81/81, `npm run visual` 23/23 with no baseline moved, `verify:crawl` 20/20.
- **Unresolved, and his to call**: the square case in F27, and the fact that a mixed-orientation
  carousel always beds somebody -- the odd shape out. Both are stated rather than smoothed over.

### Session 4 — 2026-08-28 (Opus)

Read `brief.md` and `spec.md` in full and `prior-art.md`, then built **phase 4: the viewer**.
Detail in `progress.md` under the same date; what changes what the next session should do is
D22 to D25 and F30 to F33 above.

- `src/components/common/image-viewer.tsx`, rebuilt. Edge to edge with no inset, chrome on
  warm-ink scrims that withdraws after 3.6s of stillness, the fold-up caption panel and its
  dismiss pill deleted, a Tab trap, Esc taking the caption before the viewer, the date taken
  rather than the date uploaded, and the heart, the buckets, the Where line and a delete all
  in the bottom row. `showCount` turns the counter off for the Collection.
- `takenLabel` and `eraPhrase` in `src/lib/collection.ts` with seven tests;
  `PhotoData.takenLabel`; `deleteOwnPhoto` and the shared `erasePhoto` in
  `collection/actions.ts`; `loadPhoto` for a permalink; `collection-data.ts` so
  `/collection` and `/collection/[id]` fetch through one function.
- `/collection/[id]` is the grid with the viewer open on that photograph.
  `photo-love-button.tsx` and `photo-moderation-control.tsx` are deleted with the page they
  were the only callers of, and `src/lib/heart.test.mjs` repointed at the grid, which is
  where the Collection's heart lives now.
- Catch-ups: `answer-photos.tsx` and `photo-wall.tsx`, both new client components, so every
  photograph in a Round opens (#36, #41). A wall photograph opens the viewer on the whole
  wall.
- `LoveButton` and `ShareButton` each grew one `onDark` prop (F32). `/lab/viewer` rewritten
  to exercise the new states, and its registry note with it.
- `npm run check` 82/82, `npm run visual` 23/23 with no baseline moved. Measured in a real
  browser at 1440x900 and 390x844 on `/lab/viewer`, `/collection`, a real
  `/collection/[id]` and a live Round.
- **The write-path review was done in this session by hand** rather than by the subagent,
  the same way session 2 did it. `deleteOwnPhoto`: auth precedes the write and the row is
  re-read for its uploader before the gate; no user input reaches Prisma beyond the id;
  `Photo` is absent from the demo's `ALLOWED_WRITE_MODELS`, so default-deny covers it and no
  closed list needed an entry; no schema change. The one thing a reviewer should look at
  again is that an ADMIN can now hard-delete somebody else's photograph through this action
  (D25 argues why, following `deletePost`) -- the UI always sends them to the note flow
  instead, but the action allows it.
- **What the owner has not seen.** All of it. The three to put in front of him are in Open
  questions 1 above.
- **Next session: phase 5, the Collection page.** Read this file, then `brief.md` in full,
  then spec §6 and §7. Nothing is blocked.

### Session 5 — 2026-08-28 (Opus)

Read `brief.md` and `spec.md` in full and `prior-art.md`, then built **phase 5: the
Collection page**. Detail in `progress.md` under the same date; what changes what the next
session should do is D26 to D31 and F34 to F39 above.

- **Interrupted twice by the owner, and both were the right interruptions.** First, the
  carousel: *"why are all the photos fixed at that aspect ratio... that photo can take up
  much more space but we're not letting it??"* -- which is D21, the case the last session
  flagged as unresolved. Shipped separately (commit `3e6d4c9`) before going back to phase
  5, because he was looking at it. The rule is now one sentence: **every photograph in a
  carousel is drawn exactly as it would have been posted on its own**, and the frame is the
  current photograph's height, interpolated across the swipe. Two fixed-shape rules were
  tried first and each was wrong in the other's direction; the numbers are in the commit.
  Second, the contribute panel: *"still not nice at all... let's think of something totally
  different and just dopamine inducing"*, which is spec §8.2 and phase 6.
- The river: `river-controls.tsx`, `decade-rail.tsx`, `photo-river.tsx`, and
  `collection-client.tsx` rewritten around them. `collection-facets.ts` is deleted with the
  dropdowns it fed. `<SearchPill>` grew a live controlled mode rather than being copied.
- Postgres: `2026-08-28-collection-river.sql` -- the taxonomy remapped, `takenKey`
  generated, three river indexes and four trigram GIN indexes. Applied to the main and the
  demo databases, idempotent, re-run to prove it.
- `src/lib/river-cursor.ts` came OUT of the server action so the keyset paging could be
  tested at all (a "use server" module may only export async actions). Seven tests on it,
  seven on the taxonomy, and `e2e/collection-permalink.spec.ts` for F35.
- **The write-path review was done in this session by hand**, as sessions 2 and 4 did. Auth
  precedes every write and none of the changed actions moved a gate; the only new user
  input reaching Prisma is `buckets`, which passes a Zod enum of exactly six values before
  it is joined; `Photo` is still absent from the demo's `ALLOWED_WRITE_MODELS`, so
  default-deny covers everything here; the schema change went through a dated idempotent
  file. Two bounds came out of the review rather than out of a test: an offset cursor is
  capped at 10,000 (a cursor is input, and `skip: 1e12` is a request to count past a
  trillion rows), and `search` is capped at 100 characters server-side as well as in
  `riverFiltersFrom`.
- `npm run check` green, 85/85. `npm run visual` 23/23 with the two Collection baselines
  deliberately moved -- read the diff first, it is the dropdown row becoming the bucket
  line. Measured live at 1440x900 and 390x844 on `/lab/collection` and `/collection`.
- **What the owner has not seen:** all of phase 5, and the carousel change. Open questions
  1 and 3 above are what to put in front of him.
- **Next session: phase 6, contributing.** Read this file, then `brief.md` in full, then
  spec §8. He has asked for it twice. Nothing is blocked.

### Session 5, second half — 2026-08-28 (Opus)

**Phase 6's interface**, built after phase 5 landed, and shaped live by the owner three
times while it was being built. Detail in `progress.md` under the same date; the decisions
are D32 to D36 and the findings F40 to F44.

- Built first as a room at `/collection/add`, then moved into a pop-up at his word (D32)
  and the route deleted. `contribute-dialog.tsx` is gone; `contribute-room.tsx` holds both
  the pop-up and the room inside it, and `bucket-tiles.tsx` is the six targets on their own
  so the suggestion pass in §8.3 can reuse them.
- `contributed-hoopoe.tsx` is the one appearance the flow gets, at the end, on the count.
- **The three corrections he made while watching**, all shipped: the remove control was
  invisible (F44's neighbour -- `group-hover` with no `group`), contributing was broken by a
  Prisma error (F40), and it should be a pop-up rather than a page (D32).
- **The write-path review was done in this session by hand.** `vetUploadRequest` grew a
  `meter` parameter that DEFAULTS to the old value, so both other callers are unchanged.
  The presign route now parses its body before the gate, and only that: no auth, no
  database read and no signature happens before the gate still passes. The only new user
  input reaching Prisma is `buckets`, through a Zod enum of exactly six values. `Photo`
  remains absent from the demo's `ALLOWED_WRITE_MODELS` and both actions still refuse
  `IS_DEMO` outright. The rate-limit change is argued in D36 and is the one thing here a
  reviewer should look at twice.
- Verified by adding one real photograph end to end against the live database and then
  removing it through the same purge machinery `erasePhoto` uses; the archive is back to
  its two rows and the two objects are on the purge queue.
- `npm run check` green, 85/85. `npm run visual` 23/23, no baseline moved.
- **What the owner has not seen:** the pop-up in its final shape, and the finish screen with
  the hoopoe.
- **Next session: the rest of phase 6** -- the suggestion pass, the crop handle, the
  trusted-contributor control. All three are in the status board above. Read this file, then
  `brief.md` in full, then spec §8.3 and §9.

### Session 6 — 2026-08-28 (Opus)

Read `brief.md` and `spec.md` in full and `prior-art.md`, then built **the three pieces of
phase 6 that were owed**. Detail in `progress.md` under the same date; what changes what the
next session should do is D37 to D39 and F45 to F49.

- **The owner redirected §8.3 before a line of it was written**, and his shape is better:
  no API, no key, no bill, a session in this repo that can simply look at the photographs
  (D37). `scripts/dev/tag-photos-{pick,apply}.mjs`, `src/lib/photo-suggest.ts` (19 tests),
  `.claude/skills/tag-photos/SKILL.md`, wired into CLAUDE.md's skills table. **Verified
  against the live archive**: picked its two photographs, read them, watched the dry run
  refuse both suggested captions because both rows already had one, applied, and undid —
  the two rows are as the session found them. Every refusal fired on a deliberately bad
  file: a seventh bucket, an id outside the batch, an invented decade, and a batch picked
  from one database applied to another.
- **The crop handle** (D38), with `Image.focalSet` and a dated migration applied to both
  databases. Wired into the post/letter composer and Catch-up answers. **Driving the real
  composer found three bugs a screenshot would not have** — F48 for the two in the dialog,
  F47 for the composer collapsing out from under it, which is the second time a portalled
  dialog has done that.
- **The queue's selection** (D39). And **the trusted-contributor toggle the board asked for
  already existed** (F45) — three sessions carried a line saying it did not.
- **The write-path review was done in this session by hand**, as sessions 2, 4 and 5 did.
  `aimImage`: auth precedes the write; the only inputs are a url through the same C2
  ownership check every image-naming path uses and a finite number clamped to 0..1; `Image`
  is absent from the demo's `ALLOWED_WRITE_MODELS` and the action refuses `IS_DEMO`
  outright; the schema went through a dated idempotent file applied with `run-sql.mjs`. No
  meter, matching `togglePhotoLove` — a small idempotent write on a row the caller already
  owns, bounded by their own upload quota. `approvePhotos` bounds its id list at 100 before
  it becomes an `IN` clause, and `myImageFacts` reads through the same ownership filter so
  it cannot be used to enumerate the bucket.
- `npm run check` green, 86/86. `npm run visual` 23/23, no baseline moved. Measured at
  1440x900 and 390x844. Every probe deleted itself and its own rows and bytes; the
  `Image` table is back to 44 rows, 0 hand-aimed.
- **One commit picked up a change that was not mine**, and it is worth knowing why: F46,
  `git commit -- <paths>` takes the working tree and ignores the index, so staging a single
  hunk of CLAUDE.md did not hold. The owner's own uncommitted edit went in with it.
- **What the owner has not seen:** the tagging pass, the crop handle, the queue's ticks —
  and still all of phases 4 and 5. Open questions 1, 2, 3 and 6 to 9.
- **Next session: the close-out**, which is now the only thing left on the board. Retiring
  `/lab/crop` MOVES its specimens rather than deleting them (F39). Then bug #18, #19, #35
  and #37 out of `docs/planning/bugs.md`, and `docs/spec/media.md`, large parts of which
  D2 and D3 superseded. If the owner is in the room, showing him the backlog above is worth
  more.

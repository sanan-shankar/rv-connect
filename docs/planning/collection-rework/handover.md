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
4. **Then start spec §13, phase 4: the viewer.** Phases 1, 2 and 3 are done and committed —
   dimensions are stored, one photograph in a column has one rule, and several photographs
   together are justified rows everywhere. **All the layout work is finished**; what is left
   is the viewer (§5), the Collection page itself (§6) and contributing (§8), and those are
   the three most OPEN sections in the whole spec.

   Phase 4 is the viewer, and it is the right next one for the same reason phases 1–3 were:
   it is what the owner was looking at when he dictated the brief. His verdict on the caption
   panel — *"it's like the worst design ever"* — is the single sharpest thing he said. §5
   lists what is wrong as LOCKED and leaves every solution OPEN.

   If you would rather do a different phase first, say so and do it — §13's order is
   RECOMMENDED, not LOCKED.

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
  - [ ] **Phase 4 — the viewer. START HERE.** · **Phase 5** the Collection page ·
        **Phase 6** contributing. Read spec §5, §6 and §8 before starting any of them; §6
        and §8.2 are the two most open sections in the whole campaign and the owner has said
        so in the plainest terms. All the layout work is done, so nothing below is blocked.
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
- **F7. A concurrent session is editing this area.** `src/app/(main)/collection/page.tsx`
  changed on disk mid-session (server-side first-page fetch added, `firstPage` prop passed
  to `CollectionClient`). Per CLAUDE.md, work around other sessions' edits, never stash or
  revert them. Re-read collection files before editing them.

## The requirement ledger

Every discrete ask in `brief.md`, itemised so none is quietly dropped. Status is one of:
`open`, `answered`, `decided`, `done`, `deferred`. **This is an index, not a substitute for
reading the brief** — the wording in the brief carries nuance this table does not.

### Scale, cost, organisation

| # | Ask | Status |
|---|---|---|
| 1 | Scale to 20,000 images (and by implication beyond) | open |
| 2 | Clarify whether images are being billed through Vercel; "I don't want to be billed by myself for images" | **answered** — F1 |
| 3 | All forms of categorisation, filtering, extremely easy navigation | open |
| 4 | Year should not be the primary organising axis | decided (his) |
| 5 | Buckets floated: people, class photos, nature, birds, black-and-white (he notes it overlaps), "how things looked at a certain time" | open — he is unsure, wants a proposal |
| 6 | Do we need tags at all? He argues both sides and does not settle it | open — **needs a designed answer, not a question back** |
| 7 | An easy workflow for uploading *and* tagging | open |
| 8 | A description box per image, but he cannot expect people to fill it | open |
| 9 | 70–80% of images expected via bulk upload | context |
| 10 | **Bulk upload must be supported** | open — F5, does not exist |
| 11 | Current filtering is "extremely trash" | open |
| 12 | A year tag on photos is good | exists, keep |
| 13 | "Part of school" wording: maybe rename to notes / location; caption and description overlap | open |
| 14 | "When" must be present; the year → month, or decade-if-unsure fallback is "pretty smart, actually" | **keep as is** |
| 30 | "Part of school" is free text and will reach ~2,000 distinct values at 2,000 photos, making its dropdown unusable; fold it into the main search instead | open — he reasoned to this himself, it is close to a decision |
| 31 | Keep newest / oldest / most loved | decided |
| 32 | The pill-plus-dropdown filter pattern is "not a 10 on 10"; do not reuse it just because it is used elsewhere; keep thinking creatively | open — a design instruction |
| 29 | The search bar is too big and the controls eat a whole row; consider moving them up in line with the title | open |
| 23 | Study how big archives and photo libraries solve this (he names Imperial's archive); lift from prior art rather than reinventing | **answered** — `prior-art.md` |
| 24 | The school photographer cannot be invited yet: cannot upload one by one, 100 photos would flood and get lost, cannot tag each one | the motivating use case |
| 25 | LLM-assisted tagging from descriptions and images, as was done for directory professions | open — he proposed it, likes it |
| 28 | Design for three audiences: an end user finding photos, a photographer wanting their work seen and sorted, and an uploader wanting it seamless | open — framing instruction |

### Bugs and gaps found by the owner while talking

| # | Ask | Status |
|---|---|---|
| 15 | A newly uploaded photo does not appear until the page is reloaded | open — **bug** |
| 17 | Clicking a photo did not open the viewer the first time ("this doesn't even load... Okay. Loaded") | open — **bug**, suspect the `dynamic()` import latency in `collection-client.tsx:28` |
| 21 | The viewer shows the *upload* date, not the date the photo was taken | open — **bug/gap** |
| 36 | Catch-up images cannot be clicked to expand | open — **bug** |
| 35 | Catch-up photos crop friends' faces out; "sometimes the catch up just shows a bunch of shoulders" | **fixed** — phase 2 for one photograph, phase 3 for the wall and the legacy multi-photo answer |
| 55 | The white outline around a photo on its blurred bed. Fractional widths (a 2:3 photo is 466.67px in a 728px column) let the frame's own light background show as a hairline down the edge, invisible on paper and obvious over blur | **fixed** — dimensions round to whole pixels, and a photo on a bed carries no background or border of its own |
| 56 | Search must still read the descriptions | **answered** — spec §7.2, yes |
| 57 | "how do we make a really splendid ui for them to do so? isntead of a dialog maybe a more expansive thing... big bucket touch targets so they'll want to do it... just be fresh and creative and create something splendid" | open — spec §8.2, deliberately left OPEN |
| 58 | "should include an other bucket also" | open — spec §7.1, and it feeds the taxonomy back |
| 59 | Specs and prompts written by AI for AI are too distilled and too constraining; make it a skill so he stops repeating it | **done** — `.claude/skills/writing-for-agents/SKILL.md`, wired into CLAUDE.md's skills table |
| 60 | Catch-up photographs made the reader wait about a second each. "I can't have the user waiting for anything wtf how can we not have the photos ready for them to look at" | **fixed** — F19, they are back on the bucket's own urls. The lasting answer is spec §4 |
| 61 | The blurred bed was "quite shabbily done... yucky blur bars" | **fixed** — F20, the bed is the photograph rather than its 16px thumbnail |
| 62 | "560 makes one post take up my entire desktop screen which shouldn't happen" | **decided** — D15, the ceiling is 500 |
| 54 | **No way for a member to take down a photo they uploaded**, short of asking an admin. Owner, 2026-08-27: "there's no easy intuitive way for me to take down a photo that i've uploaded now? apart from using the admin thing" | open — **verified, F11** |

### The image viewer

| # | Ask | Status |
|---|---|---|
| 18 | Edge to edge; more immersive; a better photo-to-whitespace ratio. He recalls Dropbox or Google Drive doing it "all the way" | open |
| 19 | The caption panel is the worst of it: low frame rate, a bottom bar that pops up, dismissible only by hitting one small exact pill. "It's like the worst design ever" | open — **redesign** |
| 20 | The "2 of 2" counter may not be needed, at least in the Collection | open |
| 21 | Show the person and the date the photo was taken | open |
| 22 | `/collection/[id]` probably should not exist; fold the heart and the tags into the viewer. "That another page isn't even pretty" | open — recommend keeping the *route* for shareable links but deleting the separate page design |
| 27 | The caption and its surroundings can be much prettier | open |
| 51 | The reference viewer is simple, intuitive, few elements, though its animations are choppy; ours will have more elements | reference |

### Image display across the app

| # | Ask | Status |
|---|---|---|
| 33 | Feed images stretch on widescreen monitors; low-resolution images go grainy; there is no real limit on feed width | **fixed** — the 900px cap (D10) and the 500px ceiling (D15) |
| 34 | Automatic cropping removes the part that matters | open — F3 |
| 37 | Multi-image layouts are more complicated and he does not know whether the logic works | open |
| 38 | Avoid a wall of black bars, but find the right way to crop | open — **D6, the gating decision** |
| 39 | Consider rules for how wide the feed may be | open — **now a control in `/lab/crop`**, and F8 says it is half the answer |
| 40 | **Thorough testing across every aspect ratio, and combinations of ratios within one post**, across feed, catch-ups and Collection | **partly** — every ordered pair and triple of nine ratios at all three column widths is asserted in `photo-layout.test.mjs`. The fixture set of real photographs (spec §12) is still owed, F26 |
| 41 | Every image clickable, opening in our viewer | open |

### The Collection's aesthetics and landing page

| # | Ask | Status |
|---|---|---|
| 42 | What do you see on a fresh click? Folders would be most organised but "the most boring" | open — **the second-biggest design question** |
| 43 | Many people use the app rarely and just want to see nice pictures without navigating | open — framing |
| 44 | Perhaps show pictures on the landing page with an option to go deeper | open — his own suggestion |
| 45 | Any foldering must be beautiful, with amazing transitions and incredible attention to detail | open |
| 46 | Use the screen properly. Letters is "quite a horrible use of space": one column, about three posts, too much whitespace inside and outside the tiles | open — **note this indicts Letters too** |
| 47 | Must not look corporate, or like Google Drive / OneDrive / Dropbox. "It's not a file manager. It should still be a delightful image viewer and archive" | open — constraint |
| 48 | Which buckets to keep | open |
| 16 | Tile hover currently shows caption + love count + person; he wants person + year instead | open |
| 26 | The tag pills are "okay... not too pretty" | open |

### From the reference gallery

| # | Ask | Status |
|---|---|---|
| 49 | Lazy loading in batches as you reach the bottom | open — F2 confirms; current Collection paginates at 24 |
| 50 | A justified grid: mixed aspect ratios, even gutters, no black bars, no cropping | **done** — phase 3, `<PhotoStream>` |

### Meta

| # | Ask | Status |
|---|---|---|
| 52 | Free to rename "Collection" entirely | D5 |
| 53 | Consider all the options and pick a well-considered one; do not ship the first idea, as happened the first time | **method instruction, applies to every decision in this campaign** |

## Open questions for the owner

1. **The crop policy** (D6). Blocked on the `/lab/crop` room.
2. **The multi-photo layout** — same room, same decision point.
3. **The landing shape** (#42/#44) — folders, a flowing grid, or a hybrid. Approaches to
   be proposed with a recommendation, not asked cold.
4. **The bucket vocabulary** (#5/#48) — to be proposed, not asked. He has said twice he
   does not know and wants it solved for him.
5. **The LLM tagging pass** (#25) — he wants it. Cost at 20,000 images was not yet
   estimated; do that before proposing it, and put a real number in the spec.

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

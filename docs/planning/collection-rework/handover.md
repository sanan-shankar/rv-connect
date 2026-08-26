# Collection rework — LIVING HANDOVER

**This file plus [`brief.md`](brief.md) is the entire handover.** A session is started by
@-ing this file. Read `brief.md` **in full, first** — it is the owner's own words and the
owner asked explicitly that it never be reduced to a summary. This file is an *index into*
that brief, not a replacement for it. Edit this file before your session ends: status
board updated, session log appended, so the next session can be started by @-ing it alone.

Follows the `docs/audit-fix/*/fix-prompt.md` convention (see that folder's README). It
lives under `docs/planning/` rather than `docs/audit-fix/` because this is a design and
rework campaign, not an audit and its fixes.

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
- [ ] **`/lab/crop` room** — in progress, session 1. Six crop policies against a hostile
      set of real photographs at 1440 / 3840 / 390 widths, so the owner can choose by
      looking. Must also cover the multi-photo layout question.
- [ ] **Owner picks a crop policy** — blocks the spec, because it determines the justified
      grid maths, the stored derivative sizes and the viewer's framing.
- [ ] **Write the spec** — one document, `spec.md` in this folder, phased so it can still
      ship incrementally.
- [ ] **Owner reviews the spec.**
- [ ] **Implementation plan** (`superpowers:writing-plans`).
- [ ] **Execute, phase by phase.**
- [ ] **Close-out**: fold bug #18, #19 and the catch-up items out of `docs/planning/bugs.md`,
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
- **D5. The name may change.** The owner explicitly granted this: "If you wanna call it
  something totally different, that's fine. That's how much autonomy I'm giving you."
  No decision yet. Default is to keep "The Valley Collection" unless a rename earns itself.
- **D6. Crop policy: undecided, and it is the gating decision.** The owner declined to pick
  from a written list and asked to see the options rendered: "this is a big decision i'd
  like to see it done different ways so I can decide. think of all the ways it can be done."
  One firm constraint inside that: "definitely don't want some huge ass pictures to keep
  scrolling past" — which rules out uncapped free-height as the winner.

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
| 23 | Study how big archives and photo libraries solve this (he names Imperial's archive); lift from prior art rather than reinventing | open — method instruction |
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
| 35 | Catch-up photos crop friends' faces out; "sometimes the catch up just shows a bunch of shoulders" | open — **urgent**, F3 |

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
| 33 | Feed images stretch on widescreen monitors; low-resolution images go grainy; there is no real limit on feed width | partly addressed by the 2026-08-26 `sizes` fix (commit b2216d5), **not fully** |
| 34 | Automatic cropping removes the part that matters | open — F3 |
| 37 | Multi-image layouts are more complicated and he does not know whether the logic works | open |
| 38 | Avoid a wall of black bars, but find the right way to crop | open — **D6, the gating decision** |
| 39 | Consider rules for how wide the feed may be | open |
| 40 | **Thorough testing across every aspect ratio, and combinations of ratios within one post**, across feed, catch-ups and Collection | open — a testing requirement, not optional |
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
| 50 | A justified grid: mixed aspect ratios, even gutters, no black bars, no cropping | open — F2 gives the algorithm |

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
- Next: build `/lab/crop`.

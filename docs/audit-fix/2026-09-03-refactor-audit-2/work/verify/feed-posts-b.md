# feed-posts-b - adversarial verification notes

Verified at HEAD `74cc61a` (one commit past the audit baseline `72b5a1d`; `74cc61a` is a
notification-retention fix that touches none of these files). Working tree: `docs/audit-fix/README.md`
and `progress.md` are modified by somebody else; none of my territory files carry uncommitted edits.
Read-only throughout: no build, no tsc, no browser, no database. Byte attribution came from the
read-only build at `.scratch/audit2-build/.next/`.

Charter: feed, posts, letters, comments. Twelve ids. Ten confirmed (four with corrections), one
refuted sub-claim inside an otherwise-confirmed finding, nothing needing a database, nothing needing
a browser.

---

## feed-posts-12 - `feed/loading.tsx` holds a composer card that no longer exists
**CONFIRMED.**

`src/app/(main)/feed/loading.tsx` is 32 lines. Lines 7-10 are exactly as claimed:

```
{/* Create post skeleton */}
<div className="rounded-[var(--radius)] border border-border bg-card p-6">
  <div className="skeleton-warm h-20 w-full rounded-md" />
</div>
```

`p-6` (24px x2) + `h-20` (80px) = a 128px bordered tile. The composer at rest is
`create-post-form.tsx:1263`, `className="state-layer flex h-11 w-full ... rounded-full bg-card px-4 ..."`
— 44px, and `COLLAPSED_H = 44` at :79 names it. The tile is gone by construction: :1214-1215 wears
`expanded ? "card-elevated border-border bg-card" : "border-transparent bg-transparent"`, under the
owner quote at :1194-1204 ("get rid of the tile ... just have an icon and a pill").

Dates check out: `git log -1 -- feed/loading.tsx` = `d8149a5 2026-07-30`; `git log -S'get rid of the
tile'` = `72aa7f6 2026-08-04 feat(feed): the collapsed composer is a bird and a pill, no tile`. The
skeleton predates the pill by five days.

The missing header/rail is real and stronger than the finding says. `feed/page.tsx:67-80` renders a
`PageHeader` inside `RAIL_GRID`, and `:82-95` renders `FeedColumn` beside `<aside className={RAIL_ASIDE}>`
with `FeedRail`. `loading.tsx` imports `RAIL_GRID` but renders **no header bar and no `<aside>` at all**,
so from 1180px up the skeleton is one column and the page arrives as two. The sibling
`catchups/(index)/loading.tsx` does all three (header row :11-17, cards :22-36, `<aside className={RAIL_ASIDE}>`
:36) — the house pattern exists and the feed's skeleton is the one that departs from it. That sibling is
the model the fix should copy.

Correction: none material. The owner-quote line reference `:1194-1197` is the first four lines of a
comment that runs :1194-1204.

## feed-posts-13 - `PollDisplay`'s rAF count-up is what `motion` already ships
**CONFIRMED WITH CORRECTION.**

`poll-display.tsx:30-66` is `CountUp`: `useState(0)`, `fromRef`, `raf` ref, a `requestAnimationFrame`
loop with an inline `1 - Math.pow(1 - t, 3)` at :51. 37 lines for the component, 40 with its :27-29
docblock. The file already imports `m` from `motion/react` (:5) and `SPRINGS` (:6).

The API exists. `motion@12.38.0`; `node_modules/motion/dist/react.d.ts` is `export * from 'framer-motion'`,
and `framer-motion/dist/types/index.d.ts:1511` exports `animate`, `useMotionValue`, `useTransform`,
`useSpring`. The repo already uses all three in shipped code: `use-motion-value` in
`settings/avatar-crop-dialog.tsx:136`, `useTransform` in `admin/review/review-room.tsx:309`, and the
imperative `animate` in `common/pinch-zoom.ts:61`. So this is not a new dependency surface.

Three corrections the fixer needs:

1. **The proposed `<m.span>` adds a DOM node the current code does not have.** `CountUp` returns
   `<>{shown}%</>` (:65) — a fragment inside the existing `<span className="text-sm tabular-nums
   text-muted-foreground">` at :195. A `m.span` nests a second inline element. Harmless for layout
   (inline in inline, `tabular-nums` inherits), but it is a change, and the `%` has to move inside the
   `useTransform` output or the span will hold two children.
2. **Bundle caveat, unmeasured.** `src/components/common/motion-features.tsx` wraps the app in
   `LazyMotion features={loadDomMax}` precisely so the animation engine is not statically imported.
   A static `import { animate } from "motion/react"` in `poll-display.tsx` pulls the imperative
   animation runtime into whatever chunk carries the poll. `pinch-zoom.ts` already does this, but
   pinch-zoom is itself behind a `dynamic()` viewer chunk, and `poll-display` is not. The fixer should
   diff `/feed`'s first-load bytes before and after; a `useSpring`-on-a-motion-value shape is the
   fallback if `animate` proves expensive. This is a "library" finding whose saving unit is lines, so
   it must not silently cost KB.
3. Stale comment to fix while there: :42 says "first mount, where shown was seeded to value", but
   :34 is `useState(0)`. The early return at :41 fires only when the target is genuinely 0.

Confidence in the substance: high. Confidence that the eight-line sketch is a drop-in: medium, for
reason 2.

## feed-posts-14 - `report-action.ts`: duplicated transaction (a) and misplaced file (b)
**(a) CONFIRMED. (b) CONFIRMED WITH CORRECTION — its stated rationale is factually wrong.**

(a) `src/components/posts/report-action.ts` is 350 lines. `reportPost`'s transaction is at 204-233,
`reportUser`'s at 288-314. They are the same twelve statements: `let thread: { id: string }`, a
`prisma.$transaction(async (tx) => { const report = await tx.report.create({ data: {...}, select:
{ id: true } }); return openReportThread({ db: tx, reportId: report.id, reporterId: session.user.id,
subject, opening }); })`, then `catch (err) { if (!isUniqueViolation(err)) throw err; return { success:
true, already*: true }; }`. The only deltas are the `data` payload (`targetType: "post", postId` vs
`targetType: "user", reportedUserId`) and the return key (`alreadyReported` vs `alreadyFlagged`).
`reportUser`'s own comment at :283-287 says the shape is kept identical on purpose ("half-fixing one
of a matched pair is how this codebase has drifted before"), which is the argument FOR one helper.

Saving check: the two blocks are ~57 lines including their C-007/C-060/H5 comments. A shared
`fileReport()` is ~20 lines with the two audit comments merged, plus ~5 lines per call site → net
~25 gross, ~15 after the comments are rehoused. The finding's "~18 lines" is honest.

(b) **The rationale is false.** The finding says this is "the only `"use server"` file under
`src/components/`". `grep -rln '"use server"' src` returns 31 files, of which **twelve** are under
`src/components/`: `auth/actions.ts`, `auth/email-actions.ts`, `auth/trivia-actions.ts`,
`auth/verification-actions.ts`, `onboarding/actions.ts`, `posts/report-action.ts`,
`profile/admin-actions.ts`, `profile/profile-actions.ts`, `settings/actions.ts`,
`settings/theme-actions.ts`, `support/plate-data.ts`. So `report-action.ts` is following a well-populated
house pattern, not breaking a unanimous one; the move would make it the odd one out, not the other way
round. Recommend declining (b) outright rather than treating it as taste.

Second correction on (b): the finding lists four test paths to update. There are **seven** references
to the literal path outside the file: `security-regressions.test.mjs:221,274`,
`profile-editor-rule.test.mjs:80,93`, and — missed — `scripts/qa/audit-status.mjs:203,365,637`, which
`npm run check` runs as the security status board. Plus two importers (`posts/report-dialog.tsx:22`,
`profile/flag-person-dialog.tsx:16`). A move that forgets audit-status.mjs fails `npm run check` in
a gate the finding did not name.

## feed-posts-15 - The composer's "+" menu and attachment strip are extractable
**CONFIRMED WITH CORRECTION.**

Geometry verified: `create-post-form.tsx` is 1,287 lines; `const editorBody = (` at :578 and the
`);` closing it at :1151 → 574 lines, exactly as claimed. The `+` menu is :873 (`{showMore && (`)
to :1041, ~169 lines. The attachment strip is :694-792 (`{previews.length > 0 && (` at :694, its
close at :792), ~99 lines.

The seam analysis is right. The menu reads `showMore`, `more/setMore`, `canAddPoll`,
`pollOptions/setPollOptions`, `canToggleLetter`, `isLetter/setKind`, `canOfferCollection`,
`toCollection/setToCollection`, `audienceOptions`, `audienceCity/setAudienceCity` and the shared
`iconControl` string (:571-573) — nothing else, and nothing from the contentEditable, the refs or the
persistence machine. The strip reads `previews`, `pending`, `urls`, `facts`, `removeImage`, all five
produced by `useComposerUploads`.

The gate analysis is right, and I checked all three pins myself:
- C-183 (`rich-truncate.test.mjs:106-115`) reads `use-composer-uploads.ts`, not the composer. Holds.
- B-044 (`composer-rule.test.mjs:104-113`) counts `disabled={!content.trim()...}` in the composer;
  both matches are at :1090 and :1128, inside `editorBody` but **outside** both extracted regions. Holds.
- The other two composer assertions (`composer-rule.test.mjs:150,155`) want `initialCityScope` (a
  prop, stays) and `formData.set("cityScope", audienceCity ?? "")` (inside `handleSubmit`, stays). Hold.

**Correction:** "the biggest client component in the app" is wrong. Counting `"use client"` `.tsx`
outside lab: `profile/letterhead-profile.tsx` 2030, `mascot/hoopoe.tsx` 1512,
`collection/collection-client.tsx` 1469, then `create-post-form.tsx` 1287. It is the **fourth**
largest. That matters only for how the item is sold; the seams are real either way.

Two non-gates the fixer will trip over in grep and should ignore: `letters/desk-skeleton.tsx:30` and
`app/lab/everything/_findings.ts:191` both mention `create-post-form.tsx` by name with stale line
numbers. Neither is a pin.

## fresh-code-20 - `create-post-form.tsx` hygiene: class strings, one-caller parameter, ternaries
**CONFIRMED.** Every line reference is exact.

- The 170-char menu-item class string is at **927, 944, 977** — three identical occurrences,
  `grep -c` = 3, no fourth anywhere in `src`.
- The audience chip class is at **1009** and **1025**, inside the finding's :1004-1013 / :1024-1029
  ranges. Two identical occurrences.
- `expand(startKind?)` is declared at :223 and called exactly once, `expand("post")` at :1257.
- Nested ternaries at :216-220 (`effectivePlaceholder`), :531-536 (the toast label) and :1137-1145
  (the submit label, three levels). All three are real, all three break 5d.
- :217 is `"Write your letter to the valley. Take your time."`, character-for-character
  `SCOPE_PLACEHOLDER.letter` at :89. (The finding cites `SCOPE_PLACEHOLDER` "at 90"; the record starts
  at :84 and the `letter:` line is :89. One-line drift, immaterial.)

One thing the fix must not lose, which the finding does not say: `expand("post")`'s argument is doing
work. The pill's `onClick` at :1257 is the only route back into an expanded composer after an
outside-click collapse (`:285`, `if (!defaultLetter) setExpanded(false)`), and `setKind("post")` at
:224 is what stops a composer that was toggled to Letter from reopening in letter mode. Dropping the
parameter is safe only if `setKind("post")` is inlined unconditionally inside `expand()` — which IS
safe, because :285 proves the pill path never runs when `defaultLetter` is true (the letters desk
never collapses). Say so in the fix, or a later reader will delete the `setKind` too.

## media-viewer-01 - One entry point for the image viewer instead of five ramps
**CONFIRMED.** I enumerated every caller rather than trusting the list.

`grep -rn "image-viewer" src` (lab excluded) gives exactly five `dynamic()` declarations —
`collection-client.tsx:70-72`, `post-card.tsx:67-70`, `letter-images.tsx:18-21`,
`answer-photos.tsx:36-39`, `photo-wall.tsx:29-32` — and five preload sites:
`photo-river.tsx:27` (the exported one), `post-card.tsx:80`, `answer-photos.tsx:40`,
`photo-wall.tsx:33`, and `letter-images.tsx:51` (an inline `onPointerEnter={() => void import(...)}`,
not a named const). Six files know the module path, as claimed; a seventh reference is a `type
{ ViewerImage }` import in `collection-client.tsx:44`.

The latch is four literal copies plus one variant:
- `post-card.tsx:201-209` — `viewerAt` + `viewerMounted` + `openViewerAt`, and it is the only one
  carrying the reason ("must STAY mounted after it closes ... but it must not mount before the first
  open").
- `letter-images.tsx:36-37` + `:48-49`, `answer-photos.tsx:90-91` + `:93`, `photo-wall.tsx:39-40` +
  `:54-55` — same two `useState`s, same paired setters, no reason given.
- `collection-client.tsx:944-945` is the variant: `useState(Boolean(openPhoto))`, **not** `false`,
  because a `/collection/[id]` permalink lands with the viewer already open.

That last one is the trap. A `useImageViewer()` hook that hard-codes `useState(false)` would break the
Collection permalink (`e2e/collection-permalink.spec.ts`). The finding already says collection-client
keeps its own state and takes only the lazy component and the preload — the fixer must honour that,
or give the hook an initial-index argument.

Sub-claim on the dead export: verified. `photo-river.tsx:27` `export const preloadViewer` is used only
at :97 and :98 in its own file, no importer anywhere in `src`, and `raw/knip-repo-config.txt:60` lists
it. The `export` keyword is dead, the const is not.

Saving: five `dynamic()` blocks (3-4 lines each), five preload lines, four latch pairs. ~40 net lines
is the right order. Overlaps `media-viewer-02` (the viewer emitted nine times); doing 01 first is the
safer order because it collapses the module-path references that 02 has to reason about.

## media-viewer-03 - The "open full screen" button is written five times
**CONFIRMED WITH CORRECTION.** The clone is real; three details of the evidence are wrong and one of
them changes the fix.

`grep -rn "block w-full overflow-hidden rounded-\[var(--radius-md)\]" src` hits exactly five lines —
`letter-images.tsx:53`, `post-card.tsx:112`, `photo-river.tsx:103`, `answer-photos.tsx:68`,
`photo-wall.tsx:61` — as claimed. `PhotoButton` (post-card:89-119) and `Opener`
(answer-photos:43-75) are the same component with different names.

Corrections:

1. **The class strings are not identical, and not in the way the finding says.** It attributes "minus
   the border" to photo-river alone. In fact `answer-photos.tsx:68` **also** has no `border
   border-border`, while post-card, letter-images and photo-wall all do. So adopting `Opener` verbatim
   as the shared component silently removes the border from three surfaces. The fix must either put
   the border in the shared class and have answer-photos opt out, or have the three borrowers pass
   `border border-border` through `className`. photo-river differs further still: `group relative`,
   `bg-paper`, `text-left`, and **no** `hover:opacity-95` (its hover is the scrim, per its own comment
   at :100-102).
2. **"All five wire `onPointerEnter`/`onFocus`" is not true.** `letter-images.tsx:51` wires only
   `onPointerEnter`; it has no `onFocus`. So a keyboard user tabbing to a letter's photograph does not
   warm the viewer chunk today. Sharing the component fixes a real (small) bug — worth saying, because
   it means this item is not purely cosmetic.
3. **The aria-labels are three shapes, not "four the same".** `View photo ${i+1} of ${n} full screen`
   is post-card:110, letter-images:52 and answer-photos:64 (the last only when `count > 1`).
   `photo-wall.tsx:60` is `View ${entry.author.name}'s photo full screen` — it has no index/count at
   all — and `photo-river.tsx:99` is `photo.caption ?? \`Photograph by ${photo.uploader.name}\``. So the
   shared component needs an optional label override, not just an index and a count. Without it,
   photo-wall's and photo-river's labels regress.

With those three handled the saving is roughly right: ~31 + ~33 lines of the two twin components
collapse into one ~35-line file, and the two inline buttons shrink by ~4 lines each. Call it ~25-30
lines and 4 clones → 1, rather than ~40.

## member-surfaces-02 - Lazy-load the moderation dialog (and comments) on the letter page
**CONFIRMED WITH CORRECTION.** The conclusion is right; I had to re-prove it because the finder's
grep markers do not prove what they are used for, and the saving estimate is too high.

The source facts hold: `letter-engagement.tsx:8-9` statically imports `CommentsSection` and
`ModerationDialog`; they render at :86-93 and :95-102; `post-card.tsx:63-78` declares both via
`dynamic(..., { ssr: false })`. `letter-engagement.tsx` has no rule-test pin (no test file names it).

The chunk arithmetic reproduces exactly. From `raw/route-bundle-stats.json` against
`.scratch/audit2-build/`: `/letters/[id]` has 34 first-load chunks to `/about`'s 31, and the four it
does not share are `0jc5aw9ry3033.js` (353 B), `15cj6lz1ay0c8.js` (21,434 B), `1fxjfjfygzry5.js`
(22,615 B) and `3evj1hvsedjp7.js` (18,411 B, also in `/feed`).

**The finder's markers are unsound.** `onCommentRemoved` and `itemLabel` are JSX **prop names**, so
they appear in the *caller's* chunk whether or not the callee is bundled with it — `post-card.tsx:632`
and `:674` pass both to components it loads dynamically. Searching for them, `/feed`'s first load
"contains" both (`0l7jfuve0b6zb.js`, 58,389 B), which would have refuted the finding as written.

I re-ran it with strings that only exist inside the callees' bodies —
`"It comes down for everyone right away"` (moderation-dialog.tsx:77) and `"Write a comment..."`
(comments-section.tsx:457). Result across first-load chunk sets:

| route | moderation dialog | comments section |
|---|---|---|
| `/letters/[id]` | `1fxjfjfygzry5.js` (22,615 B) | same chunk |
| `/feed` | absent | absent |
| `/about`, `/collection`, `/profile/[id]` | absent | absent |

So the finding's conclusion stands and is now proved properly: on a letter both components are in
first load; nowhere else are they.

**Correction to the saving.** The finding offers "~4 KB for the dialog, up to ~40 KB more for the
comments". Both live in **one** 22,615-byte raw chunk, so the ceiling for the pair is ~22.6 KB raw,
not ~44 KB — and that ceiling is only reached if nothing else the page needs shares that chunk, which
I could not determine from the build alone. Treat ~22.6 KB as the optimistic bound and re-measure
after the change.

Nothing here needs a browser to decide the dialog half (admin-only, guarded by `viewerIsAdmin &&`
already). The comments half genuinely wants the layout-jump check the finding asks for, but that is a
verification of the fix, not of the finding.

## member-surfaces-03 - Stop fetching every draft's body on the letters index
**CONFIRMED.** The cleanest item in the cluster.

`letters/(index)/page.tsx:98-103` is
`prisma.post.findMany({ where: { kind: "letter", authorId: session.user.id, status: "draft" },
select: { id: true, title: true, content: true, updatedAt: true }, orderBy: { updatedAt: "desc" },
take: 20 })` — `content: true` is on **line 100**. The mapping at :146-151 emits `{ id, title,
updatedAt }` only. `DraftSummary` (`drafts-strip.tsx:12-16`) is those same three fields. `grep -n
"d\.content"` in the page: no hits; `drafts` appears only at :106, :144, :146. `DraftsStrip` never
reads a body.

The 20,000-character cap is real and I found it in code, not just the spec:
`src/lib/post-caps.ts:20`, `export const POST_CONTENT_MAX = { post: 5000, letter: 20000 } as const`.
So the 20 x 20,000 = ~400 KB worst case is honest, with the caveat the finding already makes (0 for
most members).

Delete `content: true` from line 100. One line, no type change, nothing else to touch.

## member-surfaces-12 - One `LetterKicker`, one `DocLink`
**CONFIRMED WITH CORRECTION — the DocLink half is bigger than the finding says.**

Kicker: `grep -rn "text-\[10.5px\] font-bold uppercase tracking-\[0.13em\] text-cinnamon" src` returns
**nine** lines, not three. Three are shipped code —
`letters/(index)/page.tsx:182`, `letters/[id]/(read)/page.tsx:166`, `posts/post-card.tsx:424` — and six
are lab (`lab/tiles/_specimens.tsx:405`, `lab/profiles/_variant-passport.tsx:428`,
`_variant-letterhead.tsx:427`, `_variant-field-guide.tsx:187`, `_variant-editorial.tsx:128`, plus a
quoted string in `lab/everything/_findings.ts:151`). Lab rooms are out of scope per brief §3, so the
finding's "exactly the three kicker sites" is right about shipped code and wrong about the grep. No
consequence for the fix; the shared component must live somewhere the lab is not obliged to import.

DocLink: the six cited copies are all there —
`privacy/page.tsx:209,213`, `terms/page.tsx:28,32,105`, `guidelines/page.tsx:73`. But there are
**three more character-identical copies the finding missed**, in
`src/components/auth/signup-form.tsx:675, 679, 683` (the terms / guidelines / privacy links in the
signup consent line), and a fourth near-copy at `(auth)/forgot-password/forgot-client.tsx:223` which
adds `text-[14px]`, a transition, an active state and a focus ring. So it is 9 exact + 1 variant, not
6. That makes the item better than advertised — and it means the shared `DocLink` cannot live under
`app/(policies)/`; it needs a home the auth surfaces can import (`components/common/`).

Risk note the finding gets right: `/privacy` is one of the 11 visual-baseline routes, so moving these
classes verbatim should come out green; `/signup` is not baselined, so tab through the consent line
by hand.

## member-surfaces-15 - Import the letter title's easing instead of hand-typing it
**CONFIRMED.** Exact.

`letters/letter-title.tsx:34`: `transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1], delay: 0.15 }}`.
`common/motion.tsx:32`: `export const EASE_POP = [0.34, 1.56, 0.64, 1] as const;`. Identical to the
digit. The file already imports from that module at :11 (`import { SPRINGS } from
"@/components/common/motion"`), so the change is one word on the import line and one on :34.

The `as const` readonly tuple is accepted in this position elsewhere in shipped code —
`notification-bell.tsx:308,315` and `love-button.tsx:121,162` both write `ease: EASE_POP` — so there
is no typing surprise waiting.

For the collection lens, not this one: `[0.22, 1, 0.36, 1]` is hand-typed six times
(`collection/year-rail.tsx:112`, `collection/photo-scrubber.tsx:295,328,351,386,398`) and is **not**
any exported curve (`EASE_OUT_SMOOTH` is `[0.16, 1, 0.3, 1]`), so that is a "should it be exported"
question rather than a duplicate of an existing token. `notification-bell.tsx:167` hand-types
`[0.36, 0.07, 0.2, 1]` once.

## member-surfaces-16 - One post read for the letter page's metadata and body
**CONFIRMED.** Three reads today, two after the fix.

`letters/[id]/(read)/page.tsx`: `generateMetadata` does `prisma.post.findUnique({ where: { id },
select: { title: true, content: true, kind: true } })` at :29-35, then `canViewPost(id, ...)` at :44.
The page does `prisma.post.findUnique({ where: { id }, include: { author: {...}, _count: {...},
likes: {...}, bookmarks: {...} } })` at :59-77, then `canViewPost(id, ...)` again at :108. The guard
fetch is memoised — `post-visibility.ts:59-61`, `const guardedPost = cache((postId) =>
prisma.post.findUnique({ where: { id: postId }, select: GUARD_SELECT }))`, with the audit Low 14
docblock at :47-58 saying exactly why. So per letter view: 1 guard read (deduped across both calls) +
2 content reads = 3.

The proposal works: an `include` returns every scalar column, so the page's fetch already carries
`title`, `content` and `kind`; wrapping it in `cache()` and calling it from `generateMetadata` collapses
3 → 2.

One trade the finding does not mention, worth a line in the fix: today a **refused** letter costs
`generateMetadata` a cheap three-column read; afterwards it costs the full include (author join,
two `_count` aggregates, two scoped relation reads). Since both functions run in the same request for
every rendered page, the win is real for the common case, but the refusal path gets slightly heavier.
Not a reason to decline — just don't claim it is free in every case.

Saving "~8 lines" is right (the seven-line `findUnique` plus its three-line comment come out, a small
`cache()` wrapper goes in).

---

## Cross-finding notes

- **feed-posts-15 vs fresh-code-20 overlap the same file and must be sequenced.**
  fresh-code-20 rewrites the class strings at :927/:944/:977 and :1009/:1025 — all five inside the `+`
  menu that feed-posts-15 wants to move to `composer-more-menu.tsx`. Doing fresh-code-20 **first** is
  the safer order: a `MENU_ITEM` const and a `CHIP` const make the extracted component smaller and the
  move mechanical. Doing them the other way means rewriting the same strings in a file that has just
  moved. fresh-code-20's other three parts (`expand`, the three ternaries, `SCOPE_PLACEHOLDER`) are
  outside both extracted regions and are order-independent.
- **media-viewer-01 and media-viewer-03 touch the same five files** and should ship as one campaign,
  01 first: 03's shared `PhotoOpener` wants `onPreload` to come from 01's new module, and doing 03
  first means wiring five per-file `preloadViewer` consts into it and then unwiring them.
- **member-surfaces-02 overlaps media-viewer-01's territory in `post-card.tsx`** only as a model to
  copy (`post-card.tsx:63-78`), not as a file to edit. No conflict.
- **feed-posts-12 and member-surfaces-02 are the two owner-visible items here**; everything else is
  invisible if done correctly.

## Nothing in this cluster needs a database or a browser

`member-surfaces-03`'s 400 KB is a worst-case arithmetic from a code-level cap, not a claim about
real rows, so it does not need a SELECT. `member-surfaces-02`'s comments half wants a browser to
verify the *fix*, not the finding. `feed-posts-13`'s bundle caveat wants a build diff, which is a
fix-time measurement.

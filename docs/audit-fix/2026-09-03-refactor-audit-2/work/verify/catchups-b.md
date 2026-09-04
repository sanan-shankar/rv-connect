# catchups-b - adversarial verification notes

Verifier: catchups-b. Charter: Catch-ups (rounds, prefs, shelf, bin, succession); a
simplification that drops a guard is a refutation.
HEAD at verification: `74cc61a fix(retention): notifications are kept 30 days, everywhere`.
Working tree: only `docs/audit-fix/README.md` and `progress.md` modified (someone else's WIP,
neither in my territory). No source file I read has uncommitted edits.

Ids checked: catchups-13, -14, -15, -16, -18; data-layer-06, -08, -11; dead-code-09;
duplication-02; media-viewer-06, -17.

Headline: nothing in this cluster is fabricated. Two findings ship a fix step that would turn
`npm run check` RED or delete a documented guard, and neither finding names the pin:

1. **catchups-15 breaks a pin its own gate says it doesn't.** `src/lib/catchups-core.test.mjs:833-838`
   (C-141) asserts the answer page still contains the literal
   `return answersCloseSentence(at, new Date());` -- which is the body of the `closesLabel`
   the finding wants deleted.
2. **data-layer-11's remedy for `catchups-round-view.ts` adds a column the repo says on the
   record is deliberately absent** (`verifyState`), and its premise ("equals AUTHOR_CARD_SELECT
   byte for byte", "does not import IDENTITY_SELECT") is wrong on both halves.

---

## catchups-13 - types that lie / live in the wrong house  -> CONFIRMED (with two notes)

Verified at HEAD, sub-claim by sub-claim:

- `AnswerAsker` is at `src/components/catchups/answer/types.ts:12-16`, `{ id; name; photoUrl }`,
  **not exported**, used once at `:37` (`asker: AnswerAsker | null`). Confirmed it understates:
  `answer/page.tsx:212` selects the prompt author with `author: { select: IDENTITY_SELECT }`
  and `people-select.ts:35-40` shows `IDENTITY_SELECT = { id, name, photoUrl, birdOverride }`;
  `page.tsx:249-251` assigns that row straight into `asker`, and
  `answer/answer-card.tsx:86` renders `<BirdAvatar user={prompt.asker} size={22} />` while
  `bird-avatar.tsx:93` reads `user.birdOverride`. Type-level only -- the value survives to the
  client, so there is no wrong-bird bug today, just a type that hides the field. The finding
  says exactly this; no exaggeration.
- `HomePromptView.category: string | null` is at `home/types.ts:45`. The narrow type exists
  (`catchups-types.ts:72 PromptCategory`, used at `:128` on `CatchupPromptView`). The cast site
  the finding names is right: `(home)/page.tsx:245` is `category: p.category,` and the column is
  `String?` (`prisma/schema.prisma:1012`), so a cast is genuinely needed.
- `RoundEntry` is declared at `round/answer-card.tsx:34` and imported by exactly four files,
  one of them `src/lib/catchups-round-view.ts:40` -- lib reaching into a component. Confirmed.
- Five person spellings confirmed: `CatchupPersonRef` (`catchups-types.ts:111-117`),
  `HomePersonRef` (`home/types.ts:21-34`), `AnswerAsker`, `PickedPerson`
  (`create/people-picker.tsx:36-42`), `AvatarUser` (`bird-avatar.tsx:25-33`).

Two things the finding did not say, for the fixer:

- **A comment goes stale with the rename.** `catchups-core.test.mjs:730-732` says, verbatim,
  "A type declaration reads `asker: AnswerAsker | null;` and has nothing to get wrong." The
  test itself is safe (its filter is `/asker:[\s\S]{0,200}?[?]|asker:[^\n]*&&/`, a ternary/guard
  detector, and `asker: CatchupPersonRef | null` introduces no `?`), but the comment should be
  updated in the same commit or it is a fresh instance of finding 14.
- **`HomePersonRef.photoUrl` is required, `CatchupPersonRef.photoUrl` is optional.** Making
  Home extend Catchup widens it; harmless for the renderers (BirdAvatar takes everything
  optional) but it is a real type change, not a pure alias swap.

## catchups-14 - comments describing deleted code -> CONFIRMED-WITH-CORRECTION (11 of 13 sub-items clean)

Every sub-item read at HEAD.

- **(a) CONFIRMED, and it is worse than stated.** `catchups-core.ts:36` opens `/* ---...` and the
  next `*/` in the file is at line 69 -- which is the closer of `askerVisible`'s own `/**`
  docblock opened at 51. So lines 36-69 are ONE comment; `askerVisible` (line 70) is
  syntactically undocumented today. The header at 18-21 does say "That workaround is gone".
- **(b) CONFIRMED.** Line 83 `/** Question window: 3 days. Answer window: 7 days. Preparing hold:
  24h. */` sits directly above `newInviteToken`'s docblock (84-94); the constants are at 99-101.
- **(c) CONFIRMED.** `catchups.ts:215-221` is `advanceEdition`'s docblock; 222-236 is
  `restoreOwnCatchupCopy`'s docblock; 237-245 the function; `advanceEdition` at 247. And 395 is
  indented six spaces inside a four-space block. The C-020 pin survives a move: it slices
  `indexOf("export async function restoreOwnCatchupCopy(")` to the next `\nexport `
  (`catchup-lifecycle.test.mjs:203-227`), and its `!body.includes("archivedAt")` assertion is
  safe because the only "archivedAt" in `catchups.ts` is at line 233, inside a comment, and the
  test `decomment()`s first.
- **(d) CONFIRMED, range off by one.** The orphaned comment is `home/types.ts:37-40` (41 is
  blank), and `MAX_ACCEPTED_PROMPTS_PER_EDITION` now lives only as a module-private const in
  `catchups/actions.ts:95`.
- **(e) CONFIRMED as a stale comment; the proposed FIX is a copy change, not a comment change.**
  The comment is at `(home)/page.tsx:398-399` and the element at `:400`. `almost-ready.tsx:32-34`
  defaults: `title = "Catch-ups are almost ready."` (identical to the override) and
  `body = "Everyone answers a few questions, and their replies become one issue the whole group
  reads. Check back in a moment."` -- no banned word, so the comment is false. BUT the page's
  `body="Check back in a moment."` is genuinely shorter than the default, so "replace with
  `<AlmostReady />`" changes what a member sees on the pre-migration degrade path. That makes
  this sub-item **owner-visible**, not the T1/cheap/autonomous the finding tags the whole of 14.
  Safer step: delete the comment, keep the props.
- **(f) REFUTED as written; the comments are stale in a WORD, not in their reason.** All three
  exist (`keeper-settings-dialog.tsx:5-8`, `cadence-control.tsx:12-17`,
  `create-catchup-form.tsx:19-22`) and each says the client file avoids `@/lib/catchups` because
  that module drags Prisma into the browser. That constraint is still LIVE and is now stronger,
  not gone: `catchups.ts:23` imports `reportSwallowed` and the file imports prisma statically,
  and `catchups.ts:40-51` writes the rule out loud -- "THE RULE THAT MATTERS IS THE OTHER
  DIRECTION. A CLIENT component must import from `./catchups-core` directly." Deleting the three
  paragraphs deletes a guard's explanation. Correct action: strike the word "lazy-loaded" and
  point at `catchups.ts:46-50`; do not delete.
- **(g) CONFIRMED, path corrected.** The file is
  `src/app/(main)/catchups/round/[editionId]/page.tsx` (NOT under `[catchupId]/`). Line 76 is the
  orphaned one-line docblock; 77-82 the real comment; `loadEditionBase` at 83.
- **(h) CONFIRMED exactly.** `api/catchups/tick/route.ts`: 5-23 the route's M27 story, 24-30
  `maxDuration`'s docblock, 31 `maxDuration`, 33 `GET`.
- **(i) CONFIRMED, ranges off by one.** `photo-attachments.tsx`: C-182 comment 41-48, `facts`
  docblock 49, `facts` state 50, `imagesRef` 52. (Finding said 41-50 / 51 / 52.)
- **(j) CONFIRMED.** Same as media-viewer-17 below.
- **(k) CONFIRMED.** `catchups-core.test.mjs:9-10` says "They import the real functions from
  catchups.ts ... the impure drivers (which load prisma lazily)"; the import at line 56 is
  `} from "./catchups-core.ts";`.
- **(l) CONFIRMED.** `library-picker-dialog.tsx:7-8` says "Reused by both call sites"; the only
  importer is `home/console-collecting.tsx:28,169`. `index/group-first-guidance.tsx:5-9` names
  "the index ... and the create flow's no-group short-circuit"; the only importer is
  `(index)/page.tsx:12,370`.
- **(m) REFUTED.** Two errors. First, `src/components/catchups/answer/types.ts` contains no such
  sentence -- `grep -n "catchups.ts\|askerVisible"` on it returns nothing; the only hit is
  `catchups-types.ts:138`. Second, that sentence is still TRUE: `catchups.ts:51` is
  `export * from "./catchups-core";` and every server caller imports it from `@/lib/catchups`
  (e.g. `answer/page.tsx:14`). Nothing to fix.

Savings correction: ~45 comment lines is about right for (a)+(b)+(d)+(g)+(i)+(k)+(l), but (f)'s
~15 lines should NOT be counted as removable, and (e) is 2 lines not 4.

## catchups-15 - `closesLabel` wraps a null check -> CONFIRMED-WITH-CORRECTION (the gate is wrong)

The duplication is real. `answer/page.tsx:54-64`:
`function closesLabel(at: Date | null) { if (!at) return "Answering now."; /* 8-line C-141/C-031
comment */ return answersCloseSentence(at, new Date()); }`, called once at `:272`.
`catchups-core.ts:764-768`: `export function answersCloseSentence(...) { if (closeAt == null)
return "Answering now."; ...`. Identical sentence, identical null branch. The comment's
C-141/C-031 story is told at the source (`catchups-core.ts:729-744`).

**Correction 1 (the important one).** The finding's gate says "`catchup-lifecycle.test.mjs` pins
this page's `catchup.status !== "active"` and the entries select, not `closesLabel`." True, and
irrelevant -- the pin is in a DIFFERENT file. `src/lib/catchups-core.test.mjs:833-838`:

```
test("C-141: nothing prints a countdown from a raw millisecond gap any more", () => {
  assert.match(
    read("src/app/(main)/catchups/[catchupId]/answer/page.tsx"),
    /return answersCloseSentence\(at, new Date\(\)\);/
  );
```

Deleting `closesLabel` removes that exact string and turns `npm run check` red. The fix must
update the regex in the same commit (e.g. to `/answersCloseSentence\(edition\.answersCloseAt/`),
and the fix session should be told the pin's INTENT -- "the page takes its words from the shared
pair" -- so it re-points rather than weakens it.

**Correction 2 (small).** `closesLabel`'s comment carries `audit Low 28`, an id that
`catchups-core.ts:729-744` does NOT carry (it names C-141/C-031 only). Low 28 survives elsewhere
(`src/lib/utils.ts:439`, `src/lib/valley-day.test.mjs:97`), so nothing is lost, but say so
rather than let a fixer think an id is being dropped.

Saving: 11 lines of function + 1 blank = the finding's 12. Honest.

## catchups-16 - two `AnswerCard`s -> CONFIRMED

`src/components/catchups/answer/answer-card.tsx:33 export function AnswerCard(` (editable sheet:
RichTextArea, PhotoAttachments, SongNameField) and
`src/components/catchups/round/answer-card.tsx:36 export function AnswerCard(` (published card:
IdentityRow, renderRichText, AnswerPhotos, SpotifyCard, EntryLoveButton). No shared prop.
Import sites: the editing one has exactly one (`answer-experience.tsx:22`, used at `:230`); the
published one is imported by `round/question-section.tsx:25`.

Rename safety checked: no `*.test.mjs` or `*.spec.ts` anywhere references `answer-card` by path
(`grep -rn "answer-card" --include=*.test.mjs --include=*.spec.ts src/ e2e/ scripts/` -> empty),
so no pin moves. Three stale prose references to "AnswerCard" would want the new name in the
same commit: `photo-attachments.tsx:12`, `song-attachment.tsx:9`, `answer-experience.tsx:7`
(and `post-card.tsx:587` mentions AnswerCard for a spacing precedent -- that one means the
ROUND card, leave it).

## catchups-18 - `runAction` swallows into `console.error` -> CONFIRMED (and the optional pin extension is safe)

`catchups/actions.ts:164-174` is exactly as described: `catch (err) { if
(isMissingCatchupTable(err)) return {...}; console.error("[catchups/actions]", err); return
{ error: "Something went wrong. Please try again." }; }`, wrapping all 22 actions.
`catchups.ts:320-332` is the same shape one file over and routes through
`reportSwallowed("catchups", err, { step: "advanceEdition", ... })` with the reason written out
at 328: "A console line on Vercel reaches nobody". `reportSwallowed` is already imported from an
actions file (`components/auth/actions.ts:16,198`).

I checked the finding's optional step -- extending the C-149 sweep
(`catchup-lifecycle.test.mjs:354-400`) to `actions.ts` -- and it is safe **after** the fix:
`actions.ts` has exactly three `catch` blocks, at 167 (runAction), 1458 and 1590. The latter two
open with `if (!isUniqueViolation(err)) throw err;`, and the sweep skips any block containing
`throw` (line 385). Today runAction would FAIL the sweep (it has both `isMissingCatchupTable`
and `console.error`, so it falls to the final `reportSwallowed` assertion at 395-399); after the
fix it passes. So: apply the fix first, extend the sweep in the same commit.

## data-layer-06 - six teaser queries -> CONFIRMED-WITH-CORRECTION

The block is at `(home)/page.tsx:312-339` (finding said 311-338): `TEASER_ROUNDS = 6` at 321,
`Promise.all(teasered.map(...))` 324-339, each `prisma.catchupEntry.findFirst({ where: {
editionId: ed.id, body: { not: null } }, orderBy: [{ loves: { _count: "desc" } }, { id: "asc" }],
select: { body: true } })`. The `groupBy(["editionId","authorId"])` the finding points at as the
right shape is at 300-306. The file's own comment at 318-319 does say this is "the N+1 this block
exists to have removed". All confirmed.

Corrections:
- **The saving is "up to 5", not 5.** `teasered = publishedEditions.slice(0, 6)`, so a Catch-up
  with one published Round saves 0 and a brand-new one runs no teaser query at all. The 5 is the
  ceiling, reached only on Catch-ups with 6+ published Rounds. State it that way or the fix
  session will over-report.
- **The raw query is compatible with the demo's write guard** -- worth saying, because a fixer
  will worry: `src/lib/demo.ts:105-118` allows `queryRaw`/`queryRawUnsafe` by name and refuses
  only `executeRaw*`. And `$queryRaw` with `Prisma.sql` is established idiom here
  (`directory/page.tsx:333`, `api/places/search/route.ts:93`, `admin-analytics.ts` x12).
- The proposed SQL is valid Postgres as written (DISTINCT ON's expressions are the ORDER BY
  prefix; `e.body` is functionally dependent on the grouped PK), but it returns raw rows Prisma
  cannot type -- the fixer must declare the row type by hand and keep the 140-char trim and the
  `id ASC` tiebreak comment (327-329), which is the thing that stops the teaser changing between
  two identical loads.

## data-layer-08 - generateMetadata + page double-fetch -> CONFIRMED-WITH-CORRECTION

`grep -n "cache(" ` over all four files returns nothing: confirmed, no memoisation anywhere.

Catch-ups half verified in full: `(home)/page.tsx:47-63` metadata does
`prisma.catchup.findUnique({ select: { title, group: { select: { name } } } })`;
`loadHome` at `:87-120` does `prisma.catchup.findUnique({ include: { group..., editions... } })`
-- `include` returns every scalar, so `title` is in it and the metadata's select is a strict
subset. Two queries per view. Real.

Corrections:
- **TRAPS line numbers are wrong.** The quoted rule is `docs/TRAPS.md:87-89`, not 66-68.
  (66-68 is the Prisma model/dev-server entry.)
- **The catch-ups remedy costs an `auth()` in `generateMetadata`.** `loadHome(catchupId,
  viewerId)` is keyed on the viewer; today the metadata never calls `auth()` (`page.tsx:383` is
  the only `auth()` in the file). To share one cached loader the metadata must `await auth()`
  too. That is cheap (`auth()` is `cache()`d, and audit 1 refuted the withMember wrapper on
  exactly that ground) but it is not the zero-cost swap the finding implies -- and it means the
  metadata now runs the heavy `include` instead of a two-column select. Net is still -1 round
  trip; say so honestly.
- **Letters is harder than stated.** `letters/[id]/(read)/page.tsx` calls `canViewPost(id,
  session.user)` at BOTH `:44` (metadata) and `:108` (page). `canViewPost`'s second argument is
  the session user OBJECT, and TRAPS:87-89 is explicit that an object argument makes every
  `cache()` call a miss. So the "apply the same rule function once" half needs the rule
  re-keyed on strings first, or it silently does nothing. This is the sub-claim I'd send back.
- **Collection is EASIER than stated, and the finding missed the ready-made loader.**
  `collection/[id]/page.tsx` has prisma calls only inside `generateMetadata` (`:52`, `:59`); the
  page body calls `loadPhoto(id)` at `:96`, and `loadPhoto`
  (`collection/actions.ts:957-986`) already does the same `photo.findUnique` + `user.findUnique`
  + `decidePhotoVisibility` the metadata hand-repeats, keyed on `id` alone. The clean fix is to
  have the metadata go through that one function (via a cached internal, since a `"use server"`
  export cannot itself be wrapped) -- 2 queries saved and a duplicated visibility decision
  removed, which is a bigger win than the finding claims.

## data-layer-11 - six hand-typed avatar selects -> CONFIRMED-WITH-CORRECTION (the remedy is wrong at one site)

The sites exist. Verified the two in my territory:
- `catchups/new/page.tsx:55`: `select: { batchYear: true, name: true, photoUrl: true,
  birdOverride: true }` -- IDENTITY_SELECT minus `id` plus `batchYear`. Confirmed.
- `catchups-round-view.ts:103-113`: the entry author's select, seven fields
  `{ id, name, photoUrl, birdOverride, accountType, batchType, batchYear }`.

Three corrections, one of them material:

1. **"imports `IDENTITY_SELECT`? no - it imports `photoFactsFor`" is FALSE.**
   `catchups-round-view.ts:42` is `import { IDENTITY_SELECT } from "@/lib/people-select";` and
   it is used at `:91` for the prompt author. (The finding's TITLE says "a file that already
   imports the module" -- the title is right and the Where-line contradicts it.)
2. **"equals `AUTHOR_CARD_SELECT` byte for byte" is FALSE.** `people-select.ts:51-57` is
   `{ ...IDENTITY_SELECT, accountType, verifyState, batchType, batchYear }` -- EIGHT fields. The
   round-view block has seven; `verifyState` is absent.
3. **Because of (2), the proposed fix would add a column the repo documents as deliberately
   absent.** The identical seven-field shape appears at
   `letters/[id]/(read)/page.tsx:63-71` WITH its reason written above it: "No `verifyState`, and
   that is consistent rather than an omission: this byline is `metaLine(batchLine(author),
   date)` and never draws a verified leaf, so the column would be fetched and dropped." The
   round view's byline is the same function (`catchups-round-view.ts:174 authorMeta:
   batchLine(e.author)`). So the correct rewrite at that site is
   `{ ...IDENTITY_SELECT, accountType: true, batchType: true, batchYear: true }` -- matching
   letters -- and NOT `...AUTHOR_CARD_SELECT`. Doing it the finding's way pulls an unused column
   for every entry in every published Round.

With that correction the finding is still worth doing: spreading IDENTITY_SELECT at both
catchups sites is line-for-line and removes two drift surfaces.

## dead-code-09 - the four tsc-unused locals -> CONFIRMED-WITH-CORRECTION

`raw/tsc-unused.txt` reproduced at HEAD and each site read:
- `answer-photos.tsx:149` `{(photo, i, cell) => (` -- body reads `images[i]`, never `photo`.
- `post-card.tsx:553` `{(photo, i, cell) => (` -- body reads `images[i]`.
- `photo-river.tsx:472` `{(p, i, cell) => (` -- here **`p` IS used** (`<Tile photo={p} ...>`);
  the unused one is `i`, the MIDDLE parameter. The finding's blanket sentence "the first two
  must be named to reach `cell`" holds for the first two sites; for photo-river it is the
  second that must be named. Small, but a fixer renaming `p` would be following the text.
- `scripts/dev/merge-cities.ts:22` `const CANONICAL_PLACE_ID = null as number | null; //
  resolved below by lookup` -- confirmed never read.

Note the finding does not say: `npm run check`'s tsc does NOT run with
`--noUnusedLocals/--noUnusedParameters` (the raw file was produced by a hand-run
`npx tsc --noEmit --noUnusedLocals --noUnusedParameters`), so nothing here is failing today.
This is one deleted line plus three clearer signatures, exactly as tiered -- just confirm the
ESLint config tolerates `_photo` before choosing the underscore over deletion.

## duplication-02 / media-viewer-06 - the `/api/upload` client written three times -> BOTH CONFIRMED; they agree; media-viewer-06's steps are the safer ones

Read all three handlers in full. The duplication is exactly as described:
- `photo-attachments.tsx:86-115`: FormData/`append("files")`, `fetch("/api/upload", {method:
  "POST", body})`, `res.json()`, `!res.ok` toast, `for (const notice of (data.notices ?? []) as
  string[]) toast.info(notice)` under `// Anything the server changed about the file, said out
  loud (audit M15).`, facts merge, `onChange`.
- `message-composer.tsx:72-82`: the same, ending `setImageUrl(data.urls?.[0] ?? null)`.
- `use-composer-uploads.ts:178-212` (`uploadOneFile`): the same plus a 60 s AbortController.
The M15 comment is verbatim in all three (plus a fourth at `use-composer-uploads.ts:166-167`).
The facts merge is verbatim twice: `photo-attachments.tsx:101-109` vs the `keep()` body at
`use-composer-uploads.ts:113-122`.

Where they differ, and who is right:
- **Line ranges:** media-viewer-06 is accurate. duplication-02 puts `keep()` at
  "use-composer-uploads:100-110" (that is the `previewsRef` effect) and `uploadOneFile` at
  "177-208" (it is 178-212); `message-composer` is 61-88, not 61-89.
- **Gates:** media-viewer-06 names the pin that actually bites,
  `src/lib/upload-size-rule.test.mjs:25-57` -- a per-file assertion that each of six SENDER
  paths, including `catchups/answer/photo-attachments.tsx` and `messages/message-composer.tsx`,
  textually matches `/shrinkForUpload|downscaleImage|useAvatarUpload/` after `decomment`. Its
  instruction "keep `shrinkForUpload` at the CALL SITES" is therefore mandatory, not stylistic.
  duplication-02 instead gates on `attach-well.test.mjs` and `composer-rule.test.mjs` (both
  exist -- `src/components/common/attach-well.test.mjs`, `src/lib/composer-rule.test.mjs` --
  but neither mentions these files) and never names `upload-size-rule.test.mjs`. Follow
  media-viewer-06 here.
- **NEITHER names the second pin, and it is the sharper one.**
  `src/lib/catchups-core.test.mjs:844-874` (C-182) slices `photo-attachments.tsx` from
  `"async function handleFiles"` to the first `"\n  }\n"` and asserts that slice contains
  `onChange([...imagesRef.current,` and does NOT contain `onChange([...images,`. Any extraction
  that moves the post-upload `onChange` out of `handleFiles` -- or that adds a nested function
  whose closing `  }` lands earlier -- turns that test red. The refactor must leave the
  `onChange([...imagesRef.current, ...urls])` line lexically inside `handleFiles`.
- **The behavioural half of duplication-02 is real and is the reason to do this at all:**
  neither `photo-attachments.handleFiles` nor `message-composer.handlePickImage` has an
  AbortController; both clear busy state only in `finally`, so an unsettled fetch leaves
  "Adding..." stuck. `use-composer-uploads.ts:182-198` shows the shape that fixes it. That is a
  guard being ADDED, not dropped -- the good kind of finding.
- Three failure sentences for one failure, confirmed verbatim at
  `photo-attachments.tsx:93,112` / `message-composer.tsx:77,84` /
  `use-composer-uploads.ts:193,195,202`.

Merged recommendation: one item, media-viewer-06's steps and savings (~30 lines, 2 clones),
plus duplication-02's timeout rationale and its correct note that `contribute-room.tsx`'s
`fileOne` and `avatar-upload.ts` are a different (presign/server-action) shape and do not join.
Gate list must be: `upload-size-rule.test.mjs` + `catchups-core.test.mjs` (C-182) + `npm run
check`, then a real attach on all three surfaces.

## media-viewer-17 - the "legacy rows only" comment in answer-photos -> CONFIRMED

`round/answer-photos.tsx:129-131`: "Only legacy rows reach any of this -- the answer form has
taken one photograph per answer since it shipped (`PhotoAttachments max={1}`)."
False at HEAD: `answer/answer-card.tsx:123` renders `<PhotoAttachments images={entry.images}
onChange={onImagesChange} />` for a TEXT prompt with no `max`, and `photo-attachments.tsx:32` is
`max = 3`; only the photo prompt passes `max={1}` (`answer-card.tsx:128`). The server agrees:
`catchups/actions.ts:148` is `images: z.array(z.url()).max(3, "Up to 3 photos.")`. So the
`images.length > 2` carousel branch (128-140) and the `== 2` rows branch (141-176) are live for
any text answer with two or three photographs, and a session trusting the comment would delete
~50 lines of reachable code. Duplicate of catchups-14 (j); same fix, one line of comment.

---

## Cross-cutting notes for the compiler

- **Two findings in this cluster touch `answer/page.tsx` and `photo-attachments.tsx`**
  (catchups-15 + data-layer-08 on the page; catchups-14i + duplication-02/media-viewer-06 +
  C-182 on the attachments). Sequence them into one visit per file.
- **catchups-15 and catchups-18 both land in files pinned by `catchups-core.test.mjs` /
  `catchup-lifecycle.test.mjs`.** Neither pin is wrong; both need a deliberate, explained edit
  in the same commit. A fix session that "makes the test pass" by loosening a regex has
  destroyed the finding's value -- say that in the fix prompt.
- **The one thing I could not settle without a browser:** whether the `(home)` teaser rewrite
  (data-layer-06) and the `cache()` work (data-layer-08) actually change the rendered page. Both
  are read-path rewrites; the visual gate exists (`npm run visual` covers `/catchups`) but the
  Catch-up HOME is not one of the 11 baselined routes, so the fixer must open a Catch-up with
  2+ published Rounds by hand.

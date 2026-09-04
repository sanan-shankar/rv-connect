# directory-profile-b - adversarial verification

Cluster: the directory, member profiles, the map, profession tags.
Verified at HEAD `74cc61a` (the find phase ran at `72b5a1d`; the only commit between them is
`74cc61a fix(retention): notifications are kept 30 days, everywhere`, which touches none of
these files). Working tree: only `docs/audit-fix/README.md` and `progress.md` are modified,
plus this audit's untracked folder. **No file in this cluster has uncommitted edits.**

Read-only throughout: grep/sed/awk/git log only. No build, no tsc, no browser, no database.

---

## directory-profile-13 - profile page looks the member up twice - **CONFIRMED** (line correction)

Two `prisma.user.findUnique` calls in one file, both on the same `id`:

- `src/app/(main)/profile/[id]/page.tsx:39-42` (in `generateMetadata`), `select: { name: true,
  isBlocked: true, deletionRequestedAt: true }`
- `src/app/(main)/profile/[id]/page.tsx:120-124` (the page body), `omit: { password: true },
  include: { places: { orderBy: { position: "asc" } } }`

The finding cited `:121-125` for the second; the actual statement is `120-124`. `generateMetadata`
itself spans `26-48`, not `28-50`.

The metadata columns ARE a subset: `omit: { password: true }` returns every other User scalar,
so `name`, `isBlocked` and `deletionRequestedAt` all come back in the page's row.

**The repo has already proved the mechanism and paid for it once.** `src/lib/post-visibility.ts:50-61`:

> "`generateMetadata` and the page body of a route both run in the same request, and both guard
> the same post -- so every letter and profile page that does this paid for the identical query
> twice ... (audit Low 14). `cache()` is keyed on the argument, and the argument here is one
> string, so this is a plain memo for the life of the request."

`const guardedPost = cache((postId) => prisma.post.findUnique(...))` is the exact shape the
finding proposes, already shipped, already on React `cache` + the pg adapter. So this is not a
speculative Next.js behaviour claim; it is the same fix applied to a call site Low 14 missed.

Notes for the fixer:
- `generateMetadata` early-returns at `:36-38` for an unconfirmed non-self viewer BEFORE any
  query, so the memo is simply not warmed on that path — no regression, still one query.
- The memoised call must keep `omit: { password: true }` and the `places` include, or the page
  body loses `user.places` (read at `:198+`).
- Pin unaffected: `profile-email.test.mjs` reads `page.tsx` as text for `user.showEmail ?` and
  the vCard line; neither moves.

Verdict: **confirmed**.

---

## directory-profile-14 - the Writing tab fetches page one after hydration - **CONFIRMED** (line correction)

`src/components/profile/profile-author-feed.tsx`:
- mount effect at **`:71-90`** (finding said 71-92) — `await callAction(() => loadPosts({ authorId, kind }))`
  then `setPosts/setCursor/setHasMore/setLoading`.
- skeleton at `:123-152` (finding said 123-153), sized by `Math.min(expectedCount ?? 3, 3)`.
- `expectedCount`'s docblock at `:34-46` says outright the count exists so the skeleton is "not a
  guess we have to make" — i.e. the machinery exists purely to make this round trip look tidy.

The server half is there: `page.tsx:180-184` runs `Promise.all([post.count(post), post.count(letter),
bookmark.count])` over `visiblePostsWhere`, which `:154-178` builds from `AUTHOR_IN_GOOD_STANDING`,
`PUBLISHED_ONLY` and `audienceWhere` — "the one builder loadPosts uses", per its own comment. So
the page already has everything the first page needs except the rows.

Only caller: `letterhead-profile.tsx:1918-1932`, mounted with `key={tab}` — so the finding's own
caveat is right, seeding only helps the default `all` tab; the two filtered tabs remount and
refetch by design.

Verdict: **confirmed**. It stays T3/medium: the extraction of `loadPosts`'s body is a feed-lens
call, and the fixer must keep `expectedCount` for the two filtered scopes.

---

## directory-profile-15 - `admin-actions.ts` under `components/profile/` - **CONFIRMED WITH CORRECTION**

Real: `src/components/profile/admin-actions.ts` is 305 lines, `"use server"`, **8** exported
actions — `adminBlockUser:22`, `adminDeleteUser:68`, `adminUpdateNote:122`, `adminVerifyUser:144`,
`adminUnverifyUser:199`, `adminHidePost:226`, `adminDismissReport:285`, `adminResolveReport:296`.
`settleReport:262` is a PRIVATE helper, not a ninth action; the finding's **Where** lists it
alongside the three exported moderation actions, which reads as if it were exported. Not
load-bearing, but the correct sentence is "three of its eight exported actions are moderation,
plus one private helper".

Consumers confirmed by grep (`grep -rn "profile/admin-actions" src scripts e2e`):
- `src/components/admin/reports/report-list.tsx:16` — the only importer of the three moderation actions
- `src/components/admin/people/person-detail.tsx:36`, `people-list.tsx:16`
- `src/components/profile/admin-profile-tools.tsx:9-15` (relative `"./admin-actions"`)

**A second correction: `src/app/(main)/admin/people/actions.ts` does NOT import from this file.**
The finding's evidence says "the admin area's own `app/(main)/admin/people/actions.ts` reaches into
`components/profile/` for `adminDeleteUser`", and repeats it in **What to do** ("already `"use
server"`, already imports one of them"). It does not. Its import block (`:3-21`) has no
`admin-actions` entry; the only occurrence of the name in that file is prose at `:400`
("// delete below exactly as they do in adminDeleteUser."). So the destination the finding
proposes for the five user actions has no existing dependency pulling them there — the move is
still defensible on folder-hygiene grounds, but the fixer should know the stated justification is
false and pick the destination on its own merits.

**Correction the fixer needs: FOUR pins hard-code this path, and `security-regressions.test.mjs`
is not one of them.** The finding guessed "gate-coverage + security-regressions"; the real list is:

1. `src/lib/gate-coverage.test.mjs:219` — an `AUTHORISED_OTHERWISE` key
   `"src/components/profile/admin-actions.ts": { adminHidePost: "admin-only moderation ..." }`.
   The file list it sweeps (`files = serverActionFiles(resolve(ROOT, "src"))`, `:117`) is a WALK,
   so a moved file stays covered — only this literal key must be renamed, or `adminHidePost`
   fails the "acts on a post id without canViewPost" assertion.
2. `src/lib/admin-guard-rule.test.mjs:19` — `read("src/components/profile/admin-actions.ts")`
   and then `body(blockDelete, "adminBlockUser")` / `adminDeleteUser`. A move makes `read()`
   throw. Both functions must land in the same new file, together.
3. `src/lib/unattended-rule.test.mjs:305` — the file is one of four `sources` swept for
   `verifyState` writes that forget `verifyStateAt`. Path literal; must be updated.
4. `scripts/qa/audit-status.mjs:246` — audit item asserting
   `/purgeUserAccount/.test(decomment(read("src/components/profile/admin-actions.ts")))`.
   This one is in the SECURITY STATUS BOARD, which `npm run check` runs: a stale path here turns
   a green board red (or throws on `read`).

Also `src/lib/admin.ts:27` names the path in prose (a comment, harmless but should follow).

I did NOT find `security-regressions.test.mjs` naming this file — it names
`src/components/profile/profile-actions.ts:177`, a different file.

Verdict: **confirmed-with-correction**. The relocate is right; the "which pins" half of the
finding is wrong in both directions (it named one file that does not pin it and missed two
`.test.mjs` pins plus a check-gate script).

---

## directory-profile-16 - `AdminProfileTools` hand-writes what `useAdminAct` replaced - **CONFIRMED WITH CORRECTION**

`src/components/profile/admin-profile-tools.tsx` (222 lines):
- state mirrors at `:32-36` — `note`, `blocked`, `verified`, `verifying`, `saving`; dialog at `:38`.
- four handlers: `handleBlock:40`, `handleDelete:55`, `handleVerifyToggle:73`, `handleSaveNote:93`,
  ending ~`:105`. Each has its own `try { ... } catch { toast.error("Something went wrong. Please
  try again."); }`. Three of the four have no `callAction` (`handleDelete` and the rest call the
  action bare); `useAdminAct` wraps every call in `callAction`.
- `src/components/admin/use-admin-act.ts:8-36` docblock: "Nine functions across six files wrote
  this out, and six of them carried the same verbatim B-042 comment ... here it is one line that
  cannot be forgotten." So the hook exists precisely for this, and this file is a tenth copy.
- The mirror states are refreshable: `admin-actions.ts` calls `revalidatePath(\`/profile/${userId}\`)`
  at `:44` (block), `:172` (verify), `:195` (unverify), `:222` (note/unverify area). So
  `router.refresh()` does re-deliver `isBlocked` / `verifyState` as props.

**Two corrections the fixer must not miss:**

1. `onDone` is a **hook-level option**, not a per-call one (`useAdminAct(options?: { onDone?; refreshOnError? })`,
   `:37`). The finding says "keep `handleDelete`'s hard navigation via `act`'s `onDone` option" —
   that would route ALL four actions through the delete's navigation. The fixer needs either a
   second `useAdminAct({ onDone: () => { window.location.href = "/directory" } })` instance for
   delete, or to leave `handleDelete` hand-written (it also carries an
   `// eslint-disable-next-line @next/next/no-location-assign-relative-destination` at `:65`
   that must survive).
2. The hook's own docblock parks this shape: "Anything needing a third option should keep its own
   handler instead. The confirm-dialog flows in person-detail do exactly that." `AdminProfileTools`
   IS a confirm-dialog flow (`dialog` state at `:38`, three `ConfirmDialog`s). It is still
   convertible — `act` returns a boolean specifically "for the callers that branch on it (closing
   a confirm dialog only if the thing it confirmed actually happened)" — but the fixer should read
   that paragraph before deciding, and the saving is nearer ~45 lines only if all four convert.

Verdict: **confirmed-with-correction**.

---

## directory-profile-17 - "options every caller leaves at the default" - **SPLIT: 4 sub-claims confirmed, 2 REFUTED**

This is a six-part finding and it is right on four parts and wrong on two, because it grepped
non-lab callers only. The lab rooms are real TypeScript consumers of these shared components and
`npm run check` typechecks them.

### 17a. `GetInTouch` `showSave` / `size` - **REFUTED**
`grep -rn "GetInTouch" src --include=*.tsx` gives **seven** call sites, five of them in `/lab`:
- `letterhead-profile.tsx:726` and `:735` — both pass `showSave={false} size="default"` (the
  finding's two)
- `lab/profiles/_variant-letterhead-3.tsx:941` and `_variant-letterhead-2.tsx:406` — also pass
  `showSave={false} size="default"` explicitly. **Deleting the props breaks `tsc` here.**
- `lab/profiles/_variant-passport.tsx:692`, `_variant-broadsheet.tsx:707`,
  `_variant-terrace.tsx:617` — pass NEITHER, i.e. they render the `showSave = true` / `size = "sm"`
  defaults and the outer Save-contact button the finding wants deleted.
So the claim "the only caller passes `showSave={false} size="default"` both times" is false, and
"hard-code `size="default"` and delete the outer Save button" would change what three approved lab
rooms render. Per the brief, touching a lab room is an owner call, never autonomous T1.

### 17b. `AdmissionStamp` `className` "never passed" - **REFUTED**
Two lab rooms pass it: `lab/profiles/_variant-broadsheet.tsx:673`
(`className="ml-1 w-fit"`) and `_variant-terrace.tsx:623-626`
(`className="ml-[var(--space-s)] mt-[var(--space-l)] w-fit lg:hidden"`, with a comment explaining
why). Removing the prop fails `tsc`. (`_variant-passport.tsx:248` and `_variant-dossier.tsx:295`
declare their OWN local `AdmissionStamp`; those are not consumers.)

### 17c. `ProfileAuthorFeed` `layout` and `emptyBody` - **CONFIRMED**
`ProfileAuthorFeed` has exactly one call site in the whole tree (`letterhead-profile.tsx:1918`,
plus a prose mention in `saved-posts-feed.tsx:122`), and it passes `layout="cards"`. No lab room
imports it. `emptyBody` (`:23`, `:33`, `:163`) is passed by nobody anywhere. Both dead.
The "sheet" branches at `:119`, `:126-131`, `:135-139` and the empty-state fallback are the
unreachable half.

### 17d. `contacts-editor` re-exports - **CONFIRMED**
`src/components/profile/contacts-editor.tsx:87-90`:
```
/* Re-exported so the profile keeps importing its editor's vocabulary from the
   editor, while the round trip itself lives in a module a test can reach. */
export { buildRows, rowsToPayload };
export type { ContactKind, ContactRow };
```
The profile does not: `letterhead-profile.tsx:66` is
`import { buildRows, rowsToPayload, type ContactRow } from "@/lib/contact-rows";`. The only two
references to `contacts-editor` anywhere are the two `next/dynamic` imports of `ContactsEditor`
(`letterhead-profile.tsx:140`, `:422`). Nothing imports `ContactKind` from it either. 4 lines dead.

### 17e. `directory-client` `fullWidth` - **CONFIRMED** (see fresh-code-07; count corrected there)

### 17f. `LocationPicker` `disabled` - **CONFIRMED**
Declared `location-picker.tsx:56` (in `LocationPickerBaseProps`), destructured `:189`, used `:340`
(`disabled={disabled}` on the Combobox). Four call sites in the tree — `person-detail.tsx:603`,
`letterhead-profile.tsx:2018`, `register-step.tsx:130`, `lab/location-picker/page.tsx:41` and `:56` —
and **none** passes it. Dead, 3 lines. (Note it lives on the BASE props, so it is dead for both
`mode="single"` and `mode="multi"`; it does not depend on finding -18's `mode="single"` question.)

Verdict: **confirmed-with-correction** for the finding as a whole — its ~70-line saving is really
~25-30 lines (17c + 17d + 17f + 17e), and two of its six sub-claims must be dropped or re-filed
as owner decisions about lab rooms.

---

## directory-profile-23 - the profile skeleton still draws the deleted engraved rule - **CONFIRMED**

`src/app/(main)/profile/[id]/loading.tsx:30-31`, exactly as cited:
```
        {/* the engraved rule */}
        <div className="skeleton-warm mt-[var(--space-l)] h-[3px] w-full rounded-full" />
```
The real sheet has no such rule: `letterhead-profile.tsx:1169-1180` is a comment where it used to
be — "The engraved rule that used to sit here is DELETED (owner handed the call over, 2026-08-02)
... Deleting it also buys back 29px of sheet height on every profile."

The skeleton's own contract at `:1-6`: "The skeleton is the page with the ink drained out rather
than a rough sketch of it, so nothing re-corners, re-pads or jumps."

History checks out. `git log -- .../profile/[id]/loading.tsx` last touches it at
`22b4b6c feat(profile): ship the letterhead as everyone's profile`. Audit 1 raised the same two
lines (`2026-08-25-refactor-audit-1/work/findings-index.json:1436` names
`profile/[id]/loading.tsx:30-31` and `directory/loading.tsx:11-21`). The audit-1 skeleton commit
`34a77b4 fix(loading): skeletons that stand where the page actually lands` covered /dark-mode,
/letters, /collection and /reach-out — **not** this one. The directory half was fixed separately
by `e8c0b6a feat(directory): the map opens where the owner framed it, without the jump`, on the
owner's own report, so `directory/loading.tsx` is indeed correct today. Delete 30-31.

Verdict: **confirmed**.

---

## duplication-06 - people-select: types, byline select, nine inline selects - **CONFIRMED WITH CORRECTION**

### The four type declarations - CONFIRMED
- `src/components/directory/alumni-map.tsx:30-46` `PinPerson`: id, name, photoUrl, birdOverride,
  accountType, verifyState, batchType, batchYear, currentCity, jobTitle + `otherCities?` (with a
  4-line doc).
- `src/components/directory/directory-client.tsx:28-39` `interface User`: the same ten, verbatim,
  no `otherCities`.
- `src/components/directory/profile-card.tsx:44-57` (`ProfileCardProps.user`, finding said 45-56):
  the same ten, inline.
- `src/components/posts/post-card.tsx:139-148` `author`: id, name, photoUrl, birdOverride,
  accountType, verifyState, batchType, batchYear — byte-for-byte the field set of
  `AUTHOR_CARD_SELECT` (`people-select.ts:52-58`).
The proposed `AuthorCard` / `PinPerson = AuthorCard & { currentCity; jobTitle; otherCities? }` /
`User = Omit<PinPerson,"otherCities">` chain is sound and `tsc` is the whole proof.

### The byline select duplicated in the two letters pages - CONFIRMED, and it is a THREE-way
`letters/(index)/page.tsx:77-87` and `letters/[id]/(read)/page.tsx:62-72` hold the identical
3-line comment ("No `verifyState`, and that is consistent rather than an omission ... the column
would be fetched and dropped") over the identical
`select: { ...IDENTITY_SELECT, accountType: true, batchType: true, batchYear: true }`.
**Correction / bonus**: the finding asked the fixer to "check whether `admin-threads-server.ts:37-39`
is the same shape". It is: `THREAD_MEMBER_SELECT` (`:34-40`) is exactly this plus `email: true`, so
it folds to `{ ...BYLINE_SELECT, email: true }`. And a FOURTH site has the same shape:
`src/lib/catchups-round-view.ts:103-111` spells out id/name/photoUrl/birdOverride/accountType/
batchType/batchYear by hand — a BYLINE_SELECT candidate, not the AUTHOR_CARD one.

### The nine remaining inline `birdOverride: true` selects - CONFIRMED as a count, OVERSTATED as candidates
`grep -rn "birdOverride: true" src | grep -v /lab/` returns exactly the nine sites the finding
lists (plus `people-select.ts:39` itself). But "seven candidates" is too generous:
- `src/app/(main)/pick-bird/page.tsx:50` is `select: { birdOverride: true, birdPickedAt: true }` —
  a two-column read with nothing to do with the identity shape. **Not a candidate at all.**
- `src/lib/auth.ts:325-331` has no `id` field (it is inside a `findUnique` by id) and is
  emailVerified/email/batchType/batchYear/name/photoUrl/birdOverride — spreading IDENTITY_SELECT
  would ADD `id` to the session-revocation read. Possible but it changes a security-hot query;
  treat as its own decision.
- `src/app/api/users/search/route.ts:63-77` and `src/components/feed/rail/directory-module.tsx:32-40`
  are the two audit-1 said to leave, as the finding itself notes.
So the honest count is roughly **four** clean conversions (`admin/people/[id]/page.tsx:34-52` and
`welcome/page.tsx:32-46` spread IDENTITY_SELECT and keep their long tails;
`catchups-round-view.ts:103-111` and `auth.ts:405-414` take the new BYLINE_SELECT), not seven.

**Correction on the gate**: the finding says "for `auth.ts:329,413` check `auth-flow-rule` /
`security-regressions.test.mjs` for a `birdOverride` pin first". I checked —
`grep -rn "birdOverride" src/lib/*.test.mjs scripts/qa/*.mjs` returns **nothing**. There is no pin
on `birdOverride` anywhere in the test suite or the QA scripts. That check is already done.

Verdict: **confirmed-with-correction**.

---

## fresh-code-07 - directory-client mirrors props into state; `fullWidth` is always true - **CONFIRMED WITH CORRECTION**

### The effect - CONFIRMED
`src/components/directory/directory-client.tsx:168-173`:
```
  useEffect(() => {
    // Resyncs the list from freshly server-rendered props when the query changes. ...
    listGeneration.current += 1;
    setResults(users);
    setCursor(nextCursor);
  }, [users, nextCursor]);
```
`results`/`cursor` are seeded from the same props at `:154-155`. This is brief 5e's "useEffect that
mirrors props into state". The comment at `:169` is **167 characters** on one line (the finding
said 170) and narrates the obvious.
`collection-client.tsx:238-252` does solve the same problem with the adjust-during-render pattern
(`const [seed, setSeed] = useState(firstPage); if (firstPage !== seed) { ... }`) and explains why —
so the in-repo precedent is real.
**Risk the finding does not state:** the effect also bumps `listGeneration.current`, the ref that
audit M36 added so a "Load more" in flight under old filters is discarded (`:159-166`). Moving the
bump into the render phase is a ref mutation during render; it is safe behind the `users !== seed`
guard (it happens once per new first page, exactly as today) but the fixer must keep the M36
comment attached to it and must not let a StrictMode double-render bump it twice in a way the
in-flight comparison notices. Worth a re-read of `handleLoadMore` (`:185+`) before committing.

### `fullWidth` - CONFIRMED, count corrected
Every call site passes `true`:
`directory-client.tsx:546 renderPrimaryFacets(true, true)`, `:547 renderSecondaryFacets(true, true)`,
`:613 renderPrimaryFacets(true)`, `:614 renderSecondaryFacets(true)`,
`admin-filter-bar.tsx:151 facets(true, true)`, `:178 facets(true)`.
So `fullWidth ? (compact ? "w-full h-9" : "w-full") : undefined` never yields `undefined`.
**Correction: there are FOUR declarations, not three.** The finding named
`directory-client.tsx:396,423`, `content-list.tsx:146-147` and `admin-filter-bar.tsx:151,178`
(the last is a call site, not a declaration). The full set is:
- `directory-client.tsx:396` and `:423` (two)
- `src/components/admin/content/content-list.tsx:146-147` (and `:163`, a third `fullWidth ? ... : undefined`)
- `src/components/admin/people/people-list.tsx:122-123` — **missed by the finding**
- plus the contract type `src/components/admin/admin-filter-bar.tsx:88`:
  `facets: (fullWidth: boolean, compact?: boolean) => ReactNode;` which must become
  `(compact?: boolean) => ReactNode`, or the two implementations stop matching.
Both `facets` implementations are handed to `AdminFilterBar` as `facets={facets}`
(`people-list.tsx:152`, `content-list.tsx:178`), so all four move together in one change.

Pin check: `src/lib/directory-rule.test.mjs:21` reads `directory-client.tsx` as text and asserts
`label="Profession"` exists (`:223`), that `/\{professions\.length >= 1 && \(/` appears BEFORE it
(`:300-303`), and that `label: tagLabel(initialFilters.profession)` survives (`:307-311`).
`label="Profession"` sits at `directory-client.tsx:452`, inside `renderSecondaryFacets` — so
dropping the `fullWidth` parameter does not disturb any of them, provided the facet renderers stay
in this file. I found no pin on the mirroring effect itself.

Verdict: **confirmed-with-correction**.

---

## fresh-code-21 - the three-way nested ternary and the twin batch tiles - **CONFIRMED**

`src/components/directory/directory-client.tsx` is 785 lines. Verified at HEAD:
- `:641` `{browseView === "people" ? (` ... `:717` `) : browseView === "map" ? (` ... `:718`
  `cityPins.length === 0 && unmappedCount === 0 ? (` ... `:748` `)` (closing the inner ternary)
  ... `:749` `) : (` ... `:779` `)}`. A three-way ternary with a nested two-way inside the middle
  arm, spanning 139 lines. As claimed.
- The two batch tiles: `<button` at `:752-765` (the year tile) and `:766-778` (the Faculty tile),
  each carrying the identical 200-char class string
  `"card-elevated group flex flex-col items-center rounded-[var(--radius)] border border-border bg-card p-4 pt-3.5 transition-[border-color,transform] duration-200 hover:border-canopy/40 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"`.
  The finding said `:752-763` and `:766-776`; the true closes are 765 and 778.
- `:386-390` `const views: ("map"|"batches"|"people")[] = [...]` then `viewSegments = views.map(...)`
  with a two-level ternary for the label — a three-entry literal, as claimed.
- Two empty-state cards of the same shape: `:651-658` (namesLocked) and `:718-735` (map empty).
  The finding said 719-735; the block opens at 718.
- **Mis-indentation is real**: `:641` is at 8 spaces while its parent `<m.div` opens at 10 and
  closes at `:780` with 10. Prettier would move the whole block.

Gate note: the split into `PeopleView` / `MapView` / `BatchesView` must keep `label="Profession"`,
the `{professions.length >= 1 && (` gate and `label: tagLabel(initialFilters.profession)` inside
`directory-client.tsx` — those three live in `renderSecondaryFacets` (`:423-460`) and the chip
builder, not in 641-779, so extracting the view JSX is clear of `directory-rule.test.mjs`. If the
fixer instead moves the facet renderers, three assertions in that file break.

Verdict: **confirmed**.

---

## Overlaps

- **directory-profile-17e vs fresh-code-07 (`fullWidth`)**: they agree. **fresh-code-07's steps are
  the safer ones** — it names the `AdminFilterBar` `facets` contract that must change with the
  implementations, which -17 does not. But neither is complete: -17 covers only the directory,
  fresh-code-07 misses `people-list.tsx:122-123`. Merge into one item with all four declarations
  plus `admin-filter-bar.tsx:88`.
- **fresh-code-07 and fresh-code-21 touch the same file** (`directory-client.tsx`). Sequence them
  in one session: 21 re-indents and re-shapes 641-779, 07 touches 168-173 and 396/423. No conflict,
  but two sessions editing this file in parallel will collide.
- **duplication-06 and directory-profile-17** do not overlap.

## Notes on the tree state
No file in this cluster carries uncommitted edits. `git status --short` at verification time:
`M docs/audit-fix/README.md`, `M progress.md`, `?? docs/audit-fix/2026-09-03-refactor-audit-2/`.

# v-dedupe-evidence — verification notes

Verifier: v-dedupe-evidence. Date: 2026-08-25. HEAD at verification time: c74d99f
("feat(admin): a non-admin who asks for /admin is told 'nice try'").
Cluster: the duplication evidence — 24 findings across auth-edge, duplication, catchups,
feed-posts, member-surfaces, data-layer, lib-tests.

`git status --short` on every file I read in this cluster returned clean — no uncommitted
edits from the other session touched any evidence file, so the counts below are HEAD counts.

## Charter check 1 — the 136-line login/signup clone (auth-edge-01, duplication-04)

Extracted `login-client.tsx:223-358` (136 lines) and `signup-client.tsx:163-284` (122 lines)
and diffed them.

- Raw diff: **38 differing lines, every one inside a comment block** (three hunks: the
  ResizeObserver mount-report note is 21 lines in login vs 7 abbreviated lines in signup
  that explicitly point back to "the full note on the identical effect in
  (auth)/login/page.tsx"; the flight-handoff comment 3v3; the double-greet comment 2v2).
- Comment-stripped diff: **77 lines vs 77 lines, byte-identical** ("CODE IDENTICAL").

So the clone is real and the code is exactly duplicated. The detail that is wrong:
duplication-04 says "comment-for-comment identical" and auth-edge-01 says "line-for-line
identical including its long comment blocks" — false; the signup copy carries deliberately
abbreviated comments referencing login's full note. The ranges are otherwise exact
(136 vs 122 lines). auth-panel.tsx:50-75 confirmed as the third, simplified copy of the
mobileFlyIn matchMedia init + preFlightVeil + useLayoutEffect machinery.

Verdict: auth-edge-01 and duplication-04 confirmed-with-correction (comment-identity claim).

## Charter check 2 — published-round select clone + song-rule drift (catchups-04)

Read `(main)/catchups/[catchupId]/page.tsx:85-190` (`loadPublishedIssue`) and
`round/[editionId]/page.tsx:239-350` in full.

- The prompt/entry/love `select` block is line-for-line the same (same field list, same
  Lows 27/34/57 tie-break comment, same nested 8-field entry-author select). Only
  differences: round page adds `number: true` and uses `session.user.id` where the home
  passes `viewerId`.
- `toPersonRef` re-declared in both, as claimed (arrow form at [catchupId] ~141-151,
  function form at round ~292-299).
- **Song drift confirmed, quoted at HEAD:**
  - Home (`[catchupId]/page.tsx:177`):
    `song: e.songUrl ? { url: e.songUrl, title: e.songTitle ?? e.songUrl, art: e.songArt } : null`
    — songUrl-only condition, no trim.
  - Round (`round/[editionId]/page.tsx:335,342`):
    `const songTitle = e.songTitle?.trim() || e.songUrl?.trim() || null;` then
    `song: songTitle ? { url: e.songUrl ?? "", title: songTitle, art: e.songArt } : null`
    — prints on songTitle OR songUrl, with a title fallback chain and the `url: ""`
    unlinked-row convention.
  - Concrete divergence: an entry with `songTitle` set but `songUrl` null renders a song
    row on the Round page and NO song on the home page. The round copy also has a long
    comment explaining the rule; the home copy has none.

Verdict: catchups-04 confirmed.

## Charter check 3 — action-preamble census on two files (duplication-02)

`src/app/(main)/feed/actions.ts`:
- `^export async function`: **17** (claim 17 ✓)
- `await auth()`: **17** (claim 17 ✓)
- `requireVerifiedMember`: **8** (claim 8 ✓)
- `await rateLimit(`: **2** (lines 171 "posts", 861 "comments") — **claim says 3. Wrong.**

`src/app/(main)/messages/actions.ts`:
- exported actions **5** / `await auth()` **5** / member-gate **0** / rate-limit **0**
  (claim 5/5/0/0 ✓)
- hand-rolled admin checks: exactly **3**, lines 211, 259, 294
  (`if (!session?.user?.id || session.user.role !== "admin")`) — claim "+3" ✓.

Bonus row sampled: `catchups/actions.ts` = 23 exported / 23 `await auth()` / 8 member-gate
(claim 23/23/8 ✓) but `await rateLimit(` = **3** (lines 353, 457, 2172), **claim says 4.
Wrong.** So the rate-limit column of the census is off by one on both files I counted;
the auth/gate columns are exact.

## Charter check 8 — the double-auth mechanism (duplication-02, auth-edge-12)

`src/lib/member-gate.ts:43-44`:

```ts
export async function requireVerifiedMember(): Promise<GateResult> {
  const session = await auth();
```

Confirmed: any action that runs `await auth()` and then `requireVerifiedMember()` performs
two session reads. Verified a live caller: feed `createPost` does `await auth()` (via its
preamble) and then `const gate = await requireVerifiedMember();` at actions.ts:166.
The claimed "24 double-auth actions" total was not re-counted file-by-file, but feed(8) +
catchups(8) + collection(4 per census) + upload routes already reach ~20+ and the
mechanism is proven.

auth-edge-12 also confirmed: member-gate.ts:43-63 duplicates email-verification.ts:49-68
— same session fetch, same `{id, name, email, role}` viewer projection, same IS_DEMO
short-circuit (each with its own copy of the justification comment), same emailConfirmed
check; member-gate adds exactly one line, `verifyState !== "verified"` (line 60).

Verdict: duplication-02 confirmed-with-correction (rate-limit counts 2 and 3, not 3 and 4).

## Charter check 4 — the identity-select counts (data-layer-05, duplication-06)

- Exact string `photoUrl: true, birdOverride: true` (the one-line 4-field select form):
  **20 occurrences across 14 files** (catchups/[catchupId]/page.tsx x3,
  admin/catchups/[catchupId]/page.tsx x2, answer/page.tsx x2, catchups/page.tsx x2,
  admin-analytics.ts x2 (lines 394, 404 — with batchYear), and 1 each in
  admin/messages/[id], round/[editionId], collection/[id], letters/[id], letters/page,
  messages/[id], users-by-batch route, catchups/new, catchups/join/[token]).
  data-layer-05 says "x14" — the file count is 14 but the occurrence count is 20;
  correction, and it makes the finding slightly stronger.
- `birdOverride: true`: **exactly 39 occurrences across exactly 25 files** — matches
  duplication-06's "39 occurrences across 25 files" to the digit. Spot-checked that hits
  are inside `select:` blocks (admin-analytics 394/404, feed include 1203/1370,
  COMMENT_AUTHOR_SELECT feed/actions.ts:35-45 which is itself the "already hoisted" proof
  the finding cites).

Verdicts: duplication-06 confirmed; data-layer-05 confirmed-with-correction (20 sites in
14 files, not 14 sites).

## Charter check 5 — the decomment copies (lib-tests-01)

- `const decomment` appears in **21 src test files + 1 more in scripts/qa/audit-status.mjs
  = 22 copies**, and all 22 bodies are byte-identical
  (`src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1")`),
  verified by `grep -A3 | sort | uniq -c`. The report's list of 21 test files matches;
  the audit-status.mjs copy is a 22nd the report did not count (scripts territory).
- The WEAK variant (regex `(^|[^:])\/\/` without the quote-char guard, locally named
  `code`/`strip`): **exactly 12 files** — auth-flow-rule, directory-rule, feed-write-rule,
  image-purge-rule, login-attempt-rule, place-input, profile-editor-rule, rich-truncate,
  security-regressions, threads-rule, unattended-rule, valley-day (all .test.mjs).
  Matches the claimed "21 vs 12"; note security-regressions carries BOTH variants
  (strong `decomment` + a weak inline), which is the drift risk stated.

Verdict: lib-tests-01 confirmed (with the small note of the 22nd strong copy in scripts/).

## Charter check 6 — the date-locale disagreement (catchups-07, duplication-18)

Quoted at HEAD:
- `index/fresh-off-the-press.tsx:23` — `toLocaleDateString("en-US", ...)`
- `home/archive-shelf.tsx:22` and `home/console-published.tsx:33` — `"en-IN"`
- `round/masthead.tsx:50`, `round/footer-tease.tsx:27`, `home/extend-deadline-card.tsx:49`
  — `"en-GB"`
- The shared helper exists: `src/lib/utils.ts:371-378 formatDisplayDate` = en-GB, short
  month, VALLEY_TIME_ZONE.

All three locales confirmed present, so the same site really does render "Aug 5" and
"5 Aug"/"5 August". duplication-18's extra inline sites spot-checked and real:
letters/[id]/page.tsx:182, collection/[id]/page.tsx:159, letters/drafts-strip.tsx:98,
settings/actions.ts:369 (all en-GB there).

Verdicts: catchups-07 confirmed; duplication-18 confirmed.

## Charter check 7 — the three photo-intake copies (member-surfaces-03)

Opened all claimed ranges:
- Schema parse + era derivation: `collection/actions.ts:157-171` (formData source) vs
  `:348-359` (input source) — the `photoSchema.safeParse` shape and the two-line `era =`
  derivation are token-identical apart from the data source and error wrapper
  (`{error}` vs `refuse()`).
- Auto-approve: `actions.ts:216-221` (`session.user.role === "admin" || !!me?.photoTrusted`),
  `:448` (same expression off `mePromise`), `collection-intake.ts:~76`
  (`me.role === "admin" || me.photoTrusted`). Three spellings of one rule, confirmed.
- Thumb recipe: `actions.ts:202-206` (`.rotate().resize(480,480,{fit:"inside",
  withoutEnlargement:true}).webp({quality:72})`), `:425-428` (same minus `.rotate()`, with
  an argued comment: it re-encodes the already-upright display copy — a DELIBERATE
  variation, the fixer must preserve it), `collection-intake.ts:125-130` (THUMB_PX = 480,
  same fit/quality). Confirmed.

Verdict: member-surfaces-03 confirmed (fixer note: the direct path's missing `.rotate()`
is intentional and documented in-file).

## Remaining cluster findings — spot verification

- **auth-edge-02** (photo panel x3): the `fixed inset-y-0 left-0 w-[58.3333%]` panel with
  the 100vw right-aligned `HERO_IMAGE_SRC` Image, gradient overlay and drop-shadowed
  Wordmark link is byte-identical at login-client:446-472, signup-client:300-337,
  auth-panel:118-156; auth-panel:119-122 carries the "same crop as /login and /signup ...
  one continuous photograph" comment. **Confirmed.**
- **auth-edge-03** (password reveal): password-field.tsx:12-13 = "Extracted so the reset
  page cannot drift from what /login and /signup draw"; its only importer is
  `reset-password/reset-client.tsx`; login-client:558-585 and signup-form:616-644 each
  hand-roll FloatField + Eye/EyeOff trailing button. **Confirmed.** (Fixer note: both
  inline copies drive `hoopoe.gaze` from onChange, and login's toggle uses the
  `state-layer` class — PasswordField must grow those or the pages keep local wrappers.)
- **auth-edge-05** (validators links clone + displayEmail drift): the
  `z.array(z.object({label, url: https-refine + URL-parse refine})).max(10)` block is
  character-identical at validators.ts:137-158 and 190-208 (profileSchema's ends
  `.optional()`, contactMethodsSchema's does not — one-line difference). displayEmail
  drift confirmed: profileSchema:119 uses `z.union([z.literal(""), emailField()])`,
  contactMethodsSchema:179-181 uses raw
  `z.union([z.literal(""), z.email(...).max(200)]).nullable()` — no `emailField()`
  normalisation. **Confirmed.**
- **auth-edge-08** (token burn x2): both `tx.authToken.updateMany` blocks quoted at
  email-actions.ts:182-197 (kind "verify") and 380-395 (kind "reset") — same where-shape
  (`tokenHash: hashToken(...), kind, usedAt: null, expiresAt: {gt: new Date()},
  user: {email: peek.email}`), same `data: {usedAt: new Date()}`, each under its own copy
  of the stale-check justification comment. **Confirmed.**
- **duplication-05** (keeper guards): file is 2,187 lines; `isEffectiveKeeper` appears
  **18** times (claim: 18); `"Only the Keeper"` refusal string appears **10** times
  (claim: 10 guards). The canonical block at 1078-1092 (`openAnswering`) matches
  catchups-02's quoted copy verbatim. **Confirmed.**
- **catchups-02** (14-block gate preamble): same evidence as above; the edition-scoped
  block at 1078-1092 read in full and matches the claim's canonical copy word-for-word
  (loadFreshEdition -> membership -> isEffectiveKeeper -> refuseIfFrozen). Census columns
  (23 auth / 8 member-gate) support the 7+4+3 block arithmetic. **Confirmed.**
- **feed-posts-03** (include + serializer x2): the `include` object at 1196-1217 and the
  nested copy at 1362-1387 are the same 8-field author select + _count + likes/bookmarks/
  pollOptions/pollVotes shape (userId spelled differently). Drift confirmed exactly as
  claimed: line 1292 `bookmarked: p.bookmarks.length > 0` (loadPosts) vs line 1410
  `bookmarked: true` (loadSavedPosts). `COMMENT_AUTHOR_SELECT` exists at 34-45 with the
  "One copy, two readers" comment. **Confirmed.**
- **feed-posts-05** (pager dedupe + stale comment): post-feed.tsx:26 still says
  "`author` is reserved for a later batch (needs loadPosts support)" while
  actions.ts:1110 declares `authorId?: string // set => only this author's posts
  (profile Posts tab)` — stale, confirmed. `appendUnseen` is exported from
  lib/append-page.ts and its ONLY importer is collection-client.tsx — none of the three
  hand-rolled dedupe sites use it. C-180 comments present in both pagers
  (post-feed:235, profile-author-feed:82). **Confirmed.**
- **feed-posts-06** (heart handlers x3): `likeBusy`/`bookmarkBusy` refs + optimistic
  flip + revert at post-card.tsx:167+, letter-engagement.tsx:43+ (with the verbatim
  "the same refs the feed card carries (audit C-010/C-178)" comment), and
  comments-section.tsx:591+ (`handleLike` against `toggleCommentLike`). **Confirmed.**
  (Small behavioural nuance for the fixer: post-card's handleLike returns early on
  `demo` before setting the busy ref; letter-engagement has no demo early-return —
  the shared hook must keep the demo path.)
- **feed-posts-07** (upload preamble x3 + recipe x2): all three routes carry
  `originAllowed(...)` (route.ts:24, presign:30, finalize present per grep of gate lines)
  + `await auth()` (28/34/49) + `requireVerifiedMember()` (38/43/59) +
  `rateLimit("uploads", ...)` (45/50/66). The
  `.rotate().resize(1920,1920,{fit:"inside",withoutEnlargement:true}).webp({quality:80})`
  recipe is verbatim at route.ts:148-155 and finalize:140-144. **Confirmed.**
- **feed-posts-08** (read-time x4 + excerpt bang bug): the identical
  `Math.max(1, Math.round(words/200))` formula at post-card.tsx:154-157,
  letters/page.tsx:36, letters/[id]/page.tsx:113, letters-module.tsx:60-63. Both
  hand-rolled excerpts (post-card:148-153, letters/page:39-45) use
  `/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g` WITHOUT the preceding
  `/!\[[^\]]*\]\([^)]*\)/g` image rule that utils.ts:616-628 `plainExcerpt` carries with
  the documented "!banyan" bug note — so the stray-bang bug is live on both surfaces
  today. **Confirmed.**
- **member-surfaces-06** (hoopoe empty states x3): files are 42/50/57 lines
  (claim: 42/50/57 ✓); all three share the identical shell — `useHoopoe()` + `stageRef` +
  `useSoloHoopoe()` + `useMomentAutoplay(stageRef, ...)` + `<div ref={stageRef}
  aria-hidden className=...>`. **Confirmed.**
- **data-layer-06** (UserPlace transaction x2): admin/people/actions.ts:223-245 and
  settings/actions.ts:161-183 are **byte-identical** 23-line `$transaction([deleteMany,
  ...create, user.update(legacyCityColumns)])` blocks, including the C-101 comment,
  at exactly the claimed ranges. **Confirmed.**

## Verdict summary

| id | verdict |
|---|---|
| auth-edge-01 | confirmed-with-correction (code-identical; comments differ, 38 lines) |
| auth-edge-02 | confirmed |
| auth-edge-03 | confirmed |
| auth-edge-05 | confirmed |
| auth-edge-08 | confirmed |
| auth-edge-12 | confirmed |
| duplication-02 | confirmed-with-correction (rate-limit census: feed 2 not 3, catchups 3 not 4) |
| duplication-04 | confirmed-with-correction (not "comment-for-comment identical") |
| duplication-05 | confirmed |
| duplication-06 | confirmed (39/25 exact) |
| duplication-18 | confirmed |
| catchups-02 | confirmed |
| catchups-04 | confirmed (song drift quoted) |
| catchups-07 | confirmed |
| feed-posts-03 | confirmed |
| feed-posts-05 | confirmed |
| feed-posts-06 | confirmed |
| feed-posts-07 | confirmed |
| feed-posts-08 | confirmed |
| member-surfaces-03 | confirmed |
| member-surfaces-06 | confirmed |
| data-layer-05 | confirmed-with-correction (20 occurrences in 14 files, not 14) |
| data-layer-06 | confirmed |
| lib-tests-01 | confirmed |

Nothing in this cluster was refuted. No finding rested on live data (no
unverifiable-needs-db). The tree movement since the find phase did not invalidate any
count I re-ran: every line range I opened still matched within a line or two.

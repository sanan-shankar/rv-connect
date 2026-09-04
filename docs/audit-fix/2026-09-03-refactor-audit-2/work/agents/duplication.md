# duplication - refactor audit 2 report

Cross-cutting duplication lens. Every one of the 232 jscpd clones in `raw/jscpd.txt` (src +
scripts, tests excluded), the 4 in `raw/jscpd-e2e.txt` and the 2 in `raw/jscpd-tests.txt` was
opened on BOTH sides (the clone range plus a line of context either end) and classified into
the charter's five classes: (a) real duplication in shipped code that one owner should hold,
(b) lab-vs-shipped design history, (c) protocol-mandated sameness in the hand-run passes,
(d) deliberate decoupling across a module boundary, (e) tolerable. The (a) clones were grouped
into programmes (one owner + all its call sites). Then a second hunt for the near-duplicates
jscpd cannot see: the same function under two names, the same Prisma select or Zod shape
spelled twice, the same class string pasted across files, the same refusal sentence in two
places, the same fix applied to one twin and not the other. Date: 2026-09-03. Files in
territory: the 693 files jscpd scanned (60 js, 420 tsx, 213 ts) + 9 e2e + 102 tests; opened at
the clone ranges: every one of the 238 clones (about 150 distinct files); read fully: 34
(listed below).

## Coverage

- Read fully: `docs/spec/hand-run-passes.md`, `scripts/qa/hand-run-passes.test.mjs`,
  `scripts/dev/_env.mjs`, `scripts/qa/protocol-audit.mjs:140-290`, `src/lib/people-select.ts`,
  `src/lib/test-kit.mjs` (exports), `src/lib/gate-coverage.test.mjs` (the GATE regex and the
  C-189 sweep), `src/components/common/identity-row.tsx`, `use-wide-viewport.ts`,
  `motion.tsx` (exports + FadeRise), `src/components/catchups/answer/answer-card.tsx`,
  `catchups/round/answer-card.tsx`, `catchups/answer/photo-attachments.tsx`,
  `letters/letter-images.tsx`, `posts/use-composer-uploads.ts:40-215`,
  `collection/contribute-stage.tsx`, `collection/edit-photo-dialog.tsx`,
  `collection/photo-questions.tsx` (head + exports), `common/photo-carousel.tsx`,
  `auth/verify-email-banner.tsx`, `auth/verify-email-dialog.tsx`, `auth/member-verify-dialog.tsx`,
  `common/filters/facet-select.tsx`, `facet-search-select.tsx`, `range-facet-pill.tsx`,
  `admin/analytics/{cohort,compare,heatmap,presence,stat,tabs}.tsx`,
  `src/app/api/upload/route.ts`, `api/upload/finalize/route.ts`, `messages/message-composer.tsx`
  (upload half), `settings/avatar-upload.ts` (upload half), `collection/contribute-room.tsx`
  (structure, imports, `fileOne`), `src/app/page.tsx`, `src/lib/upload-shared.ts` (exports +
  HEIC), the audit-1 duplication report and its fix log in full.
- Read at the clone ranges: all 238 clones, both sides, with context. For the 88 lab-internal
  clones and the 27 lab-vs-shipped ones the range was read to confirm the nature of the pair
  (which side is the prototype), not the whole file.
- Skimmed: the interiors of `lab/profiles/_variant-*`, `lab/landings/_variant-*`,
  `lab/directory/*`, `lab/composer/_variants.tsx` beyond their clone windows (design history by
  the brief's rule; the clone windows were enough to classify).
- Not read: `contribute-room.tsx` lines 160-595 and 650-1067 (the Collection territory agent's;
  I read enough to rule its upload path in or out of duplication-02); `src/lib/admin-analytics.ts`
  (1,165 lines, admin territory); `src/components/common/image-viewer.tsx` (see next line).
- Uncommitted edits seen: at session start `git status` showed `M src/components/common/
  image-viewer.tsx`; by the time I began reading files the tree was clean apart from this
  audit's own folder, so a peer committed it. I did not read image-viewer.tsx (audit-1 dup-24
  item 2 concerned it; its state is reported as unknown below rather than guessed).
- Tools: read-only throughout. No build, no tsc, no knip, no browser, no database, no script was
  run; the census numbers come from `node -e` one-liners over the raw jscpd file and grep.

## Summary

The 232 clones split cleanly once both sides are open: **47 are real duplication in shipped
code or scripts (class a), 115 are the lab (b), 1 is the hand-run-pass protocol (c), 38 are
deliberate decoupling (d), 31 are tolerable (e)**. The (a) mass is 522 duplicated lines in 14
programmes; the lab carries 1,866 (88 lab-vs-lab pairs, 27 lab-vs-shipped), which is what a
variant gallery is and is recorded, not proposed. The (d) block is almost entirely the server-
action preamble (27 clones inside `catchups/actions.ts`, `feed/actions.ts`,
`collection/actions.ts`) and that is not duplication at all: it is the shape
`gate-coverage.test.mjs`'s C-189 sweep reads inside every exported action body, and audit-1's
action-gate wrapper was re-refuted at fix time for exactly that reason. Nothing here re-proposes
it. The two biggest wins in the honest unit are **scripts**: a dev-script kit (12 clones, 171
lines, and a safety guard -- the demo-database destination check -- that is copied into seven
scripts with drifted wording and is *missing* from the one script that writes photographs into
the archive), and the QA kit's unfinished adoption (16 clones; `_probe-kit.mjs` already exports
`bootstrap()` and `makeLedger()` and phase3-probe imports the kit and still carries its own
copy of the ledger). The largest single script clone (26 lines) is `audit-status.mjs`'s private
`fnBody`, which audit-1 dup-03 told to point at `test-fn-body.mjs` and which was not converted.

What jscpd could not see is where the shipped-code risk is. The browser-side proxy upload
(shrink → FormData → `/api/upload` → notices → facts) is hand-rolled in three surfaces, and the
composer's 60-second timeout fix never reached the other two, so a Catch-up photo or a support
message attachment whose fetch never settles wedges its button for the session. The server-side
image intake is four ceremonies with three refusal phrasings, and the avatar path hand-rolls a
HEIC check that misses the blank-MIME case `isUnsupportedHeic` exists to catch. The auth pages
hand-type the 27px heading `AuthHeading` already renders, five times. Structural vs cheap: 14 of
the 21 findings are structural, and I have said plainly where the honest verdict is "line-
neutral, one place for the next fix" (audit-1's lesson). What surprised me: how much of the
new Collection work is *not* duplicated -- `contribute-stage` argues its three departures from
`PhotoCarousel` in its header and imports `CarouselArrow` rather than redrawing it, and
`edit-photo-dialog` asks its questions through `photo-questions.tsx` exactly as its header
promises. What audit-1 left that is now moot: dup-14 (MomentStage) is complete for every stage
moment; dup-18 (one date voice) has two stragglers; dup-16 did the select half and not the type
half; dup-20 has five hand-rolled admin checks left; dup-24 items 3 and 4 were never done.

## The census (the charter's questions, answered)

### Every clone, classified

Clone numbers are jscpd's order in `raw/jscpd.txt` (1-45 under `scripts/`, 46-232 under
`src/`). Programme ids (P-*) are defined under Findings.

| Clones | Class | Verdict |
|---|---|---|
| 1 | d | `demo/apply-schema` vs `dev/_env`: the demo wall (audit-1 not-finding) |
| 2 | e | `demo/seed-demo` vs `demo/verify-guard`: 7-line env parser, both inside demo/ |
| 3, 4, 21, 22, 23 | a | identical `puppeteer.launch` block (P-S3; 18 files carry it) |
| 5 | e | `apple-edge/truth*`: a peer's measurement harness, 6 lines |
| 6, 7, 8, 9, 18 | a | `flag`/`value` argv helper x6 files (P-S1) |
| 10, 11, 12, 13, 19 | a | env + url + DEMO_REF destination guard x7 files (P-S2) |
| 14 | a | `bytesFor` x2 with identical comment (P-S1) |
| 15 | e | `city-alias-scan.ts` vs `merge-cities.ts`: 4-line Prisma opener (audit-1 dup-08 refusal) |
| 16 | a | tag-photos pick vs apply: the same bootstrap (P-S1 + P-S2) |
| 17 | c | applied-log write: protocol-mandated `applied-`; key drift `applied:` vs `at:` |
| 20 | e | `ops/prune` vs `ops/snapshot`: dotenv preamble, CI-run scripts |
| 24 | a | `_probe-kit.makeLedger().check` vs phase3's own `check` (P-S4) |
| 25 | a | `audit-status.fnBody` vs `test-fn-body.balancedBody` (P-S5) |
| 26, 29, 30 | a | chdir/config preamble that `bootstrap()` already does (P-S4) |
| 27 | a | `drive.mjs` opens the contribute dialog twice (P-S7, within-file) |
| 28 | a | hoopoe-idle vs hoopoe-landing check: own ledgers (P-S4) |
| 31, 32 | e | probe import preambles: that IS the kit adoption |
| 33, 34, 37 | a | the sign-up drive x3 probes (P-S6) |
| 35, 36, 39 | d | probe cleanup blocks: each deletes its own tables (audit-1 dup-07 refusal) |
| 38 | e | phase6/phase7 2-line `get` |
| 40, 41 | a | protocol-audit: three sweeps of one loop shape (P-S7, within-file) |
| 42, 43, 44 | a | `e2e/.shots` auto-number x3 + goto fallback x2 (P-S8) |
| 45 | a | tour-mobile-verify presses Next twice (P-S7, within-file) |
| 46, 47, 53 | e | AnimatePresence fade quad (6 sites, 6 lines each; see Notes on duplication-08) |
| 48 | e | import lists |
| 49, 50, 51, 52 | e | login/signup page shell after audit-1 dup-04; the 10-line perch-box comment is duplicated (hygiene) |
| 54 | e | admin support `Ledger` vs `MailRows` row shell, 10 lines (audit-1 item 6 verdict stands) |
| 55-70 | d | catchups action preambles: the C-189 tripwire's contract (16 clones) |
| 71 | e | `QuestionSection` map x2 |
| 72, 83, 84, 88 | e | Next page/generateMetadata boilerplate |
| 73 | a | photo-meta input type x2 (+ admin/review) (P-A1) |
| 74-77, 79-81 | d | feed/collection action preambles (7 clones, same contract) |
| 78 | a | uploader-or-admin check x2 in collection/actions (P-A3) |
| 82 | a | the letters byline select x2 with the same comment (P-A2) |
| 85, 86 | a | messages/actions: demo sentence x2, thread select x2 (P-A3) |
| 87 | d | upload route vs finalize loop scaffold: two routes, cross-referenced comments, different abort semantics |
| 89-93, 105-112, 114, 116-124, 128-137, 139-141, 143-144, 149-157, 159-166, 168-180, 182-187, 189-193, 196-203, 205 | b | lab-vs-lab (88 clones, 1,448 lines): variant galleries |
| 90, 93, 94, 97-104, 125-127, 138, 142, 145-148, 158, 167, 181, 188, 194, 195, 204 | b | lab-vs-shipped (27 clones): the register in duplication-21 |
| 113, 115 | e | outside-click/Escape effect: two shipped sites with different conditions |
| 206, 207, 209, 210 | e | same shape, different action / 2 sites / audit-1 item 6 idioms |
| 208 | a | resend handler: banner vs dialog "twin" (P-A5) |
| 211 | d | `contribute-stage` vs `PhotoCarousel`: three departures argued in the header |
| 212 | a | year-rail `rows.push` x2 (P-A3) |
| 213 | a | filters kit pill trigger x4 (P-A6) |
| 214 | a | range-facet-pill From/To select x2 (P-A3) |
| 215, 216, 217 | a | directory person type x3 + post-card author (P-A2) |
| 218, 219 | e | landing `isMobile` / in-view probe: unreachable code today (dead-code lens) |
| 220 | d | perching-birds behaviour roll (audit-1 not-finding) |
| 221-224 | d | hoopoe fold/unfold asymmetry (audit-1 not-finding) |
| 225 | a | onboarding step footer x2 (P-A4) |
| 226-228 | d | PostFeed vs ProfileAuthorFeed (audit-1 dup-12 refusal) |
| 229 | e | report-action tails: result keys are client API |
| 230 | e | api-gate tails, 6 lines, one file |
| 231 | a | catchups.ts CAS `updateMany` x3 (P-A3) |
| 232 | d | `classYearsOf` vs `parseBatchTargets`: same walk, different grammar, both pinned rule files |
| e2e 1-4 | a | collection-seek.spec.ts helpers (P-E1) |
| tests 1-2 | e | photo-layout.test / purge-rule.test fixtures |

Counts: **a 47 (522 lines), b 115 (1,866), c 1 (12), d 38 (372), e 31 (348)**. The per-clone
sum is 3,120 because jscpd reports overlapping ranges as separate clones (the catchups
preamble at line 386 is paired four times); jscpd's own de-overlapped total is 2,888.

### The answers

- **How many of the 232 are (a)?** 47: 33 in scripts, 14 in src. Plus 4 of 4 in e2e.
- **Total (a) mass and programmes.** 522 duplicated lines (371 scripts, 151 src) across 14
  programmes: P-S1 dev argv/bytesFor kit, P-S2 the connection-URL guard, P-S3 browser launch,
  P-S4 bootstrap/ledger adoption, P-S5 audit-status fnBody, P-S6 the sign-up drive, P-S7
  within-file script helpers, P-S8 the numbered shot; P-A1 PhotoMetaInput, P-A2 people-select
  types + byline select, P-A3 within-file shipped micro-clones, P-A4 StepFooter, P-A5
  useResendVerification, P-A6 the facet pill trigger; P-E1 the e2e Collection helpers.
- **Which programme removes the most clones for the least risk?** P-S1+P-S2 together
  (duplication-01): 12 clones, 171 lines, one new helper file beside `_env.mjs`, no shipped
  code touched, and it closes a real hole (import-album has no destination guard). Second:
  P-S4/P-S3/P-S6/P-S8 (duplication-04, 16 clones) -- low risk for the bootstrap/ledger/shot
  halves, medium only for the probe drive because probes write to the live database.
- **Which clones are inside a single file?** 69 of 232 (716 lines): scripts 27, 40, 41, 45;
  src 53, 55-58, 60-70, 73, 78, 79-81, 85, 86, 91, 92, 107-112, 117-124, 131-133, 143, 144,
  173, 197-203, 205, 209, 212, 214, 219-224, 229, 230, 231; plus all 4 e2e and both test
  clones. Of those, the cheap real wins are the ones NOT covered by a refusal: 27, 40, 41, 45
  (scripts, duplication-10) and 78, 85, 86, 212, 214, 231 (src, duplication-09). The 27
  action-preamble ones are the tripwire's contract; the 30 lab ones are galleries.
- **Which shared primitive is most often re-implemented instead of imported?** In shipped
  code, `AuthHeading` (5 hand-typed copies of its h1 in login, signup, auth-first-frame) and
  the identity select (9 inline `birdOverride: true` selects after audit-1 took 39 to 12). In
  scripts, `_probe-kit.bootstrap()` (14 scripts still inline the chdir/env/BASE preamble it
  does) and the launch block (18 files). Primitives that are NOT re-implemented anywhere I
  looked: `MomentStage` (all four stage moments use it), `CarouselArrow` (contribute-stage
  imports it), `IdentityRow`, `ConfirmDialog`, `FloatField`, `SegmentedPills` (letterhead-3's
  comment records the extraction and calls the shared one).
- **Two implementations of the same rule where drift already exists.** Quoted:
  1. The demo destination guard: six scripts say `refusing: ${envFile} was asked for, but the
     connection does not carry the demo ref`; `run-sql.mjs:54` says `...but the connection
     host does not carry the demo ref ${DEMO_REF}`; `import-album.mjs:104-107` has no guard.
  2. The proxy upload: `use-composer-uploads.ts:181-197` wraps the fetch in a 60 s
     `AbortController`; `photo-attachments.tsx:89-115` and `message-composer.tsx:61-89` do not,
     and both reset `uploading` only in `finally`, which a never-settling fetch never reaches.
  3. The HEIC refusal: `settings/actions.ts:88` tests `file.type === "image/heic" ||
     file.type === "image/heif"`; `upload-shared.ts:187-191` `isUnsupportedHeic` also tests
     `/\.hei[cf]$/i.test(file.name)` "because `type` is occasionally blank for these on some
     mobile browsers".
  4. The applied log: `tag-photos-apply.mjs:230` writes `{ database, applied, changes }`;
     `tag-professions-apply.mjs:242` writes `{ database, at, changes }`.
  5. The analytics intensity ramp: `cohort.tsx:62` `0.15 + share * 0.85`, `heatmap.tsx:59`
     `0.18 + (n / max) * 0.82`, `compare.tsx:263` `0.16 + Math.abs(r) * 0.84`.
  6. The refusal voice: `"Not authenticated"` x60 vs `"Not signed in"` x2
     (`messages/actions.ts:90,150`); `"Not authorized"` x18 vs `"Not authorized."` x1
     (`lab/actions.ts:31`).
  7. The image-type refusal: `"${file.name}" doesn't look like a JPG, PNG, GIF or WebP image.`
     (upload/route.ts:109) / `That upload doesn't look like...` (finalize:119,
     collection:566) / `That file doesn't look like...` (collection:318, settings:96).

## Findings

### duplication-01 - Give the dev scripts one kit for argv, the connection URL and its demo guard
- **Where**: `scripts/dev/backfill-image-dimensions.mjs:33-55, 91-96`;
  `scripts/dev/import-album.mjs:74-79, 104-107`; `scripts/dev/tag-photos-pick.mjs:34-39, 55-67,
  122-127`; `scripts/dev/tag-photos-apply.mjs:41-46, 53-63`;
  `scripts/dev/tag-professions-pick.mjs:40-45, 62-75`; `scripts/dev/tag-professions-apply.mjs:
  47-52, 59-69`; `scripts/dev/sweep-stranded-originals.mjs:48-60`; `scripts/dev/run-sql.mjs:
  40-55`; the owner-to-be `scripts/dev/_env.mjs`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: clones 6-14, 16, 18, 19 -- 12 of the 45 script clones, 171 duplicated lines.
  `const flag = (name) => argv.includes(name); const value = (name, fallback) => {...}` is
  byte-identical in six files. `const DEMO_REF = "cbvlzptghkuxhygyaezq"` and the four-line
  check after it are in seven files; three carry the comment "The same destination check
  run-sql.mjs makes", four do not, and `run-sql.mjs:54`'s message has drifted from the other
  six (quoted in the census). `async function bytesFor(u)` is in two files with the same
  three-line comment above it. And `import-album.mjs:104-107` resolves
  `env.DIRECT_URL || env.DATABASE_URL` from `--env` and then goes straight to the R2 checks:
  the one script in the folder that writes photographs into the archive is the one with no
  destination guard. `_env.mjs`'s banner refuses a shared database *opener* ("The four
  scripts that open one do it four ways -- pg with relaxed SSL, pg without, and Prisma behind
  the pg adapter -- and a shared opener with a default connection string is the same
  convenience that scripts/demo/* keeps a wall against") and that refusal stands: this
  finding shares the URL and its guard, and every script keeps its own `new pg.Client(...)`.
- **What to do**: (1) In `_env.mjs` add `export function databaseUrl(envFile)`: `readEnv`,
  exit if neither variable, the DEMO_REF check with run-sql's full comment as the one copy,
  return the url. (2) Beside it, `scripts/dev/_cli.mjs` exporting `argv()` returning
  `{ flag, value, rest }` and `bytesFor(u)` (the "public/ on dev, absolute on the bucket"
  comment moves with it). (3) Convert the eight scripts; import-album gains the guard by
  construction. (4) `scripts/README.md` gets a row for `_cli.mjs` (scripts-ledger.test.mjs
  counts every tracked non-test file; `_env.mjs`'s row 88 is the precedent).
  `hand-run-passes.test.mjs` is unaffected: it greps the picker for `const OUT = path.join(`,
  `database:\s*envFile` and the absence of UPDATE/INSERT/DELETE, none of which move.
- **Saving**: 12 clones; ~171 duplicated lines; roughly -60 SLOC net (each site drops ~18
  lines and adds two imports); one guard, now covering import-album.
- **Risk & gate**: low. `npm run check` (hand-run-passes.test.mjs, scripts-ledger.test.mjs).
  Do not run the writers; the two pickers are read-only by protocol and `node
  scripts/dev/tag-professions-pick.mjs --limit 1 --env .env.demo` against a deliberately wrong
  `.env.demo` is the one live proof that the guard message prints from its new home -- ask
  the owner before running anything that reads a real database.
- **Confidence**: high. What would change my mind: a reason in import-album's 90-line header
  for wanting no guard (there is none; it checks five R2 variables and the quality flag).
- **Notes**: This is the follow-on to audit-1 dup-08, whose fixer shared the env parser and
  refused the opener; the guard was not mentioned either way and has since been copied three
  more times by the Collection and hand-run-pass work. `scripts/ops/prune.mjs` and
  `snapshot.mjs` (clone 20) use `dotenv` directly and run in CI with real env; leave them.

### duplication-02 - One browser-side proxy upload for the three surfaces that hand-roll it, and carry the composer's timeout to them
- **Where**: `src/components/catchups/answer/photo-attachments.tsx:75-115`;
  `src/components/messages/message-composer.tsx:61-89`;
  `src/components/posts/use-composer-uploads.ts:177-208` (`uploadOneFile`) and `:156-172` (the
  finalize branch's copy of the notices/keep tail); owner-to-be `src/lib/upload-client.ts`
  (today exports only `directUploadPut`).
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd pairs none of these (different names, different wrapping). All three do
  the same eight steps: `shrinkForUpload` → `new FormData()` + `append("files", ...)` →
  `fetch("/api/upload", { method: "POST", body })` → `res.json()` → `!res.ok` → toast →
  `for (const notice of (data.notices ?? []) as string[]) toast.info(notice)` with the same
  "(audit M15)" comment three times → keep `data.images` (the loop at photo-attachments
  :101-109 is verbatim `keep()` at use-composer-uploads:100-110). The drift is behavioural:
  the composer wraps its fetch in a 60 s `AbortController` (`UPLOAD_TIMEOUT_MS`, :181-197)
  with a named timeout sentence; photo-attachments and message-composer have no timeout and
  reset `uploading`/`setUploading(false)` only in `finally`, so a fetch that never settles (a
  phone losing signal mid-upload) leaves the button on "Adding..." for the rest of the session
  -- the wedged-busy shape audit B-042 fixed in three other places. Three failure sentences
  for one failure: "That photo would not upload. Try again." / "That image didn't upload. Try
  another one?" / `"${file.name}" failed to upload. Check your connection and try again.`
- **What to do**: In `upload-client.ts` (client-safe already; confirm its imports stay
  browser-only), `export async function uploadViaProxy(files: File[], { timeoutMs = 60_000 }
  = {}): Promise<{ urls: string[]; images: (PhotoFacts & { url: string })[]; notices:
  string[] }>` that owns the FormData, the fetch with the AbortController, the `!res.ok`
  translation into a thrown Error (server `error` or the timeout sentence), and returns the
  parsed body. Call sites: photo-attachments `handleFiles` keeps its max/size toasts and the
  `imagesRef` C-182 logic and calls the helper; message-composer `handlePickImage` likewise;
  `uploadOneFile` becomes three lines. The `toast.info` loop over notices can stay at the
  call sites (the composer's comment on why a toast rather than inline copy is worth
  keeping) or move into the helper -- either way one copy of the M15 comment.
- **Saving**: 0 jscpd clones (it never saw them); ~70 duplicated lines to one function; two
  surfaces gain the timeout; one failure sentence; the next upload surface is a one-liner.
- **Risk & gate**: medium (three upload surfaces). `npm run check`; then attach a photo to a
  Catch-up answer, a support message and a post as Jerry; pull the network mid-upload on one
  and confirm the button releases after 60 s with the timeout sentence. `attach-well.test.mjs`
  and `composer-rule.test.mjs` read composer sources: confirm neither pins
  `fetch("/api/upload"` inside a function body before moving it.
- **Confidence**: high on the duplication and the missing timeout (both files read in full at
  the handler); medium on whether the helper should own the toasts.
- **Notes**: `contribute-room.tsx`'s `fileOne` (599-648) is a different shape -- presign then a
  server action, no `/api/upload` -- and `avatar-upload.ts` goes through a server action too;
  neither joins this. Alternative rejected: a `useProxyUpload` hook -- two of the three callers
  are plain async functions inside components that already own their busy state, and a hook
  would push that state somewhere it is not wanted.

### duplication-03 - Server-side image intake: four ceremonies, three phrasings, one hand-rolled HEIC check
- **Where**: `src/app/api/upload/route.ts:81-112`; `src/app/api/upload/finalize/route.ts:
  106-126`; `src/app/(main)/collection/actions.ts:276-286` and `:313-319` (`contributePhoto`),
  `:553-570` (`contributePhotoDirect`); `src/components/settings/actions.ts:85-97`
  (`uploadAvatar`); owner `src/lib/upload-shared.ts` (already home of `isImageFile`,
  `isUnsupportedHeic`, `sniffImageType`, `stillPictureNotice`, `MAX_UPLOAD_BYTES`).
- **Phase**: dedupe
- **Tier**: T3 (T1 for the settings half)     **Class**: structural     **Decides**: autonomous
- **Evidence**: the same sequence in all four -- `isImageFile` → HEIC → size →
  `sniffImageType(buffer)` → `countImageFrames` notice -- with the refusal copy differing per
  copy (census item 7), the 20 MB refusal spelled two ways, and the HEIC sentence spelled out
  in full twice (`upload/route.ts:89`, `collection/actions.ts:281`). `settings/actions.ts:88`
  hand-rolls `file.type === "image/heic" || file.type === "image/heif"` and its own short
  sentence ("HEIC is not supported yet. Please export as JPG or PNG."), where
  `isUnsupportedHeic` (`upload-shared.ts:187-191`) also tests the `.heic/.heif` extension
  because "`type` is occasionally blank for these on some mobile browsers" -- so an iPhone
  avatar with a blank MIME passes the settings check, reaches sharp, and gets the opaque
  "unsupported image format" error the helper was written to prevent.
- **What to do**: Two halves. T1 first: `settings/actions.ts:88` → `if (isUnsupportedHeic(file))
  return { error: HEIC_REFUSAL }` where `HEIC_REFUSAL` is the shared sentence exported from
  upload-shared.ts (and the two spelled-out copies import it). T3 second, only if the fixer
  finds it reads better than four copies: `export function refuseUnlessImage(file: File,
  maxBytes: number): string | null` (isImageFile / HEIC / size) and `refuseUnlessImageBytes
  (buffer): string | null` (sniff) in upload-shared.ts; the API routes keep their `abort()`
  purge wrappers (C-064) and pass the string through; finalize keeps its HEAD-before-fetch size
  order (M16), which the helper must not reorder.
- **Saving**: 0 jscpd clones (87 is the loop scaffold, deliberate); ~45 duplicated lines to
  two predicates; one refusal voice; the settings HEIC gap closed.
- **Risk & gate**: medium for the T3 half (write paths, pinned). `upload-size-rule.test.mjs`,
  `upload-ownership-rule.test.mjs` and `image-purge-rule.test.mjs` read the route sources --
  read them FIRST; if one pins `MAX_UPLOAD_BYTES` inside a route body, the helper must be
  called with that token at the call site so the sweep still sees it (audit-1's dup-09 fix
  note: anchor below the preamble). `npm run check`; upload an avatar, a post photo, a
  Collection photo by both paths; a HEIC with a blank MIME on /settings.
- **Confidence**: high on the settings drift (both functions read); medium on the full merge.
- **Notes**: audit-1 refused a shared upload *guard* in upload-shared.ts because five client
  components import that file and `auth` would drag Prisma into their bundles. That objection
  does not apply here: these predicates are pure, already live in that file, and involve no
  auth. Clone 87 (the two routes' `urls/images/notices/abort` scaffold) stays: the comments
  already cross-reference each other and finalize's abort also purges the staged keys the loop
  had not reached, which the classic route has no equivalent of.

### duplication-04 - Finish adopting the QA kit: bootstrap, ledger, browser launch, the sign-up drive, the numbered shot
- **Where**: inline chdir/env/BASE preamble in 14 scripts outside `_probe-kit.mjs`
  (`scripts/qa/drive.mjs:22-24`, `crawl.mjs`, `hoopoe-landing-check.mjs`,
  `hover-probe.mjs:36-38`, `map-cluster-verify.mjs:23-25`, `screenshot.mjs`,
  `screenshot-auth.mjs:8-12`, `verify-shot.mjs`, `theme-shots.mjs:20-22`,
  `tour-mobile-verify.mjs`, `phase9-probe.mjs`, `scripts/dev/import-roster.mjs`,
  `dev/centroid.mjs`, `dev/shot-clip.mjs`); a private pass/fail ledger in
  `phase3-probe.mjs:38-48,398`, `hoopoe-idle-check.mjs:37-41`, `hoopoe-landing-check.mjs:30-34`;
  the identical `puppeteer.launch({ headless, executablePath: process.env.
  PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome...", args })` block in 18 files
  (`dev/apple-edge/look.mjs`, `dev/centroid.mjs`, `qa/_dir-room-shots.mjs`, `drive.mjs`,
  `hoopoe-idle-check.mjs`, `hoopoe-landing-check.mjs`, `hoopoe-zoom-probe.mjs`,
  `hover-probe.mjs`, `map-cluster-verify.mjs`, `phase{3,4,5,7,8,10}-probe.mjs`,
  `screenshot-auth.mjs`, `theme-shots.mjs`, `tour-mobile-verify.mjs`); the trivia-gate +
  six-field + consent drive in `phase4-probe.mjs:245-266`, `phase8-probe.mjs:313-335`,
  `phase10-probe.mjs:87-110`; the `e2e/.shots` auto-number in `screenshot.mjs:14-22`,
  `screenshot-auth.mjs:27-35`, `tour-mobile-verify.mjs:23-27` plus the networkidle2 fallback
  goto in `screenshot.mjs:54-59` / `screenshot-auth.mjs:71-76` and the `ADMIN_EMAIL` check in
  `screenshot-auth.mjs:21-25` / `tour-mobile-verify.mjs:17-21`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous for the bootstrap, ledger
  and shot halves; the launch helper and the probe drive wait on the scripts lens (audit-1
  flagged `hover-probe`, `theme-shots`, `tour-mobile-verify`, `hoopoe-*-check`,
  `_dir-room-shots`, `map-cluster-verify` as the hand-rolled puppeteer probes CLAUDE.md now
  forbids -- a script that is deleted is not one to deduplicate).
- **Evidence**: clones 3, 4, 21-24, 26, 28-30, 33, 34, 37, 42-44 (16 clones, ~163 lines).
  `_probe-kit.mjs` exports `bootstrap(importMetaUrl, { base, chrome })` (chdir + env + BASE +
  the Chrome path) and `makeLedger()`; `phase3-probe.mjs:25` imports `bootstrap, openDb` and
  keeps its own `check` at :40-48 -- clone 24 is the kit's function beside phase3's copy of it.
  Audit-1 dup-07 converted the phase probes' bootstrap and openDb and stopped there.
- **What to do**: (1) phase3, hoopoe-idle-check, hoopoe-landing-check → `makeLedger()` (the
  hoopoe checks print `PASS/FAIL`; the kit prints `ok/FAIL`; cosmetic). (2) The ten qa scripts
  with the inline preamble → `const { BASE } = bootstrap(import.meta.url, { chrome: true })`.
  (3) If the scripts lens keeps the screenshot family: `export async function launchChrome
  (viewport: "desktop" | "phone" | "phoneTouch")` in `_probe-kit.mjs` returning `{ browser,
  page }` -- the three presets seen are 1440x900, 390x844, and 390x844 with
  `isMobile/hasTouch` (drive.mjs:683-685 explains why the touch flags matter). (4) `export
  async function driveSignup(page, { base, email, batch, password, consent = true })`
  covering the trivia gate (`banyan`/`cauvery`), the six fields and the tick; phase8's
  consent test passes `consent: false` and asserts the refusal itself. (5) `scripts/qa/
  _shots.mjs` exporting `nextShotPath(label, mobile)` and `gotoSettled(page, url)`.
- **Saving**: 16 clones; ~163 duplicated lines; roughly -120 SLOC across scripts/qa.
- **Risk & gate**: low for (1), (2), (5): `npm run check`, then `node scripts/qa/
  screenshot.mjs http://localhost:3000` once. (4) touches probes that create rows on the live
  shared database: convert, do not run in the fix session, run each once at the next security
  pass (audit-1's rule for dup-07). `tour-mobile-verify.test.mjs` pins four literal shapes in
  `tour-mobile-verify.mjs` (`requireLoopbackBaseUrl(process.argv[2]`,
  `assertSameOriginAfterNavigation(baseUrl, page.url())`, the dev-login fetch template, and
  the ABSENCE of `page.evaluate(async (email)`) -- any refactor of that file keeps those four
  strings in its body.
- **Confidence**: high on (1), (2), (5); medium on (3), (4).
- **Notes**: `crawl.mjs` and `verify-shot.mjs` are the two the CLAUDE.md tooling table names;
  they get the bootstrap regardless.

### duplication-05 - audit-status.mjs still carries its own fnBody; point it at balancedBody
- **Where**: `scripts/qa/audit-status.mjs:85-116` vs `src/lib/test-fn-body.mjs:22-73`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: clone 25 -- 26 lines, 259 tokens, the largest single script clone. Audit-1
  dup-03 prescribed exactly this ("Point gate-coverage.test.mjs and scripts/qa/audit-status.mjs
  at balancedBody"); the fixer built `test-kit.mjs` (which re-exports `balancedBody` at :29)
  and gate-coverage goes through it, but audit-status was not converted: `test-fn-body` is
  imported today only by `test-kit.mjs`, `composer-rule.test.mjs` and `knip.jsonc`.
  `test-fn-body.mjs`'s own banner is the reason it matters: a hand-copied slicer already
  shipped one silent bug (C-188). audit-status is the security status board `npm run check`
  runs.
- **What to do**: `import { balancedBody } from "../../src/lib/test-fn-body.mjs";` and keep a
  four-line `fnBody(text, name)` adapter that builds audit-status's two-form regex
  (`export? async? function NAME` | `NAME(`) and returns `balancedBody(text, m.index)` --
  check the signature first (`balancedBody(text, at)`, :38). Delete :91-116.
- **Saving**: 1 clone, 26 lines; one slicer.
- **Risk & gate**: low. `npm run check` runs audit-status; its status counts must be identical
  before and after.
- **Confidence**: high.

### duplication-06 - people-select: the types, the byline select and the nine selects that still spell birdOverride by hand
- **Where**: types -- `src/components/directory/alumni-map.tsx:30-46` (`PinPerson`),
  `directory-client.tsx:28-39` (`interface User`), `profile-card.tsx:45-56` (inline prop),
  `src/components/posts/post-card.tsx:139-148` (`author`); byline select --
  `src/app/(main)/letters/(index)/page.tsx:77-87` and `letters/[id]/(read)/page.tsx:62-72`
  (the same three-line "No `verifyState`, and that is consistent rather than an omission"
  comment twice); inline selects -- `src/app/api/users/search/route.ts:69`,
  `src/app/(main)/admin/people/[id]/page.tsx:39`, `welcome/page.tsx:35`, `pick-bird/page.tsx:50`,
  `catchups/new/page.tsx:55`, `src/components/feed/rail/directory-module.tsx:35`,
  `src/lib/catchups-round-view.ts:108`, `src/lib/auth.ts:329, 413`; owner
  `src/lib/people-select.ts`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: clones 82, 215, 216, 217. Audit-1 dup-16 asked for one `DirectoryPerson` type;
  the fix log records "IDENTITY/AUTHOR_CARD selects + directory PERSON_SELECT → ab82f30", the
  select half. The three TypeScript declarations are still three, twelve identical fields
  each (PinPerson adds `otherCities`), and post-card's `author` is a fourth spelling of the
  AUTHOR_CARD shape. Audit-1 dup-06 took 39 inline `birdOverride: true` selects to 12; nine
  remain, of which two (`users/search`, `directory-module`) are the deliberately-narrow
  harvest surfaces audit-1 said to leave, so seven candidates. people-select.ts's banner
  already says the rule: a variant "spreads one of them and adds what it needs".
- **What to do**: In people-select.ts export hand-written `type Identity` and `type
  AuthorCard` (NOT `Prisma.UserGetPayload<...>`: if any client component imports this file, a
  value import of the generated client is the dns-in-the-bundle trap audit-1 hit; `import
  type` from the generated client is safe but hand-written is simpler and the file is four
  fields long). Export `BYLINE_SELECT = { ...IDENTITY_SELECT, accountType: true, batchType:
  true, batchYear: true } as const` with the letters comment as its docblock; both letters
  pages use it (`admin-threads-server.ts:37-39` adds the same three to a different base --
  check whether it is the same shape before folding it in). Then `PinPerson = AuthorCard &
  { currentCity; jobTitle; otherCities? }`, directory `User = Omit<PinPerson, "otherCities">`,
  profile-card's prop the same, `PostData["author"] = AuthorCard`. Convert the seven inline
  selects where the field set matches a constant exactly; for `auth.ts:329,413` check
  `auth-flow-rule` / `security-regressions.test.mjs` for a `birdOverride` pin first.
- **Saving**: 4 clones (~50 lines); 7 near-dups; the "add a field in three places or the
  surfaces drift" class closed for the directory.
- **Risk & gate**: low. `npm run check` -- `tsc` is the whole proof for the types; `npm run
  verify:crawl` for the selects.
- **Confidence**: high.

### duplication-07 - The auth pages hand-type the heading AuthHeading already owns
- **Where**: `src/app/(auth)/login/login-client.tsx:251`; `src/app/(auth)/signup/
  signup-client.tsx:174, 190`; `src/components/auth/auth-first-frame.tsx:71, 120`; owner
  `src/components/auth/auth-panel.tsx:163-190` (`AuthHeading`, used by forgot/reset).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `<h1 className="font-heading text-[27px] leading-tight tracking-tight
  text-foreground">` appears six times in four files (the census script's third most repeated
  long class string in shipped tsx); one of the six IS `AuthHeading`'s own h1 (:177). Login,
  signup and the first frame predate its extraction. `auth-first-frame.tsx`'s header:
  "`auth-first-frame.test.mjs` fails if any copy or measured class drifts from
  login-client.tsx / signup-client.tsx / trivia-gate.tsx" -- so the first frame must change in
  the same commit as the two pages.
- **What to do**: `<AuthHeading title="Welcome back" />` (or whatever each h1 says) at the
  five sites; AuthHeading's children are optional precisely so a page with no subtitle can
  use it. Read `src/components/auth/auth-first-frame.test.mjs` first; if it pins the literal
  class string, widen it to accept `AuthHeading` on both sides in the same commit.
- **Saving**: 0 jscpd clones; 5 copies of one class string; the 27px rung has one home.
- **Risk & gate**: low-medium. `npm run visual` (`/login` is a baseline); the landing → login
  flight check audit-1's fixer did (the first frame must still match the page pixel-for-pixel:
  same tag, same classes, same text). Gate: auth-first-frame.test.mjs green.
- **Confidence**: high.
- **Notes**: 27px is not on the DESIGN-SYSTEM §5 ladder (h1 2rem, h2 1.5rem, h3 1.25rem); see
  the owner decision on heading rungs. This finding only moves the number into one place; it
  does not change it.

### duplication-08 - One EmptyCard for the five empty-state cards
- **Where**: `src/app/(main)/letters/(index)/page.tsx:155-163`;
  `src/components/posts/post-feed.tsx:363-375`; `src/components/directory/directory-client.tsx:
  651-658, 660-675, 719-730`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `card-elevated rounded-[var(--radius)] border border-border bg-card p-12
  text-center` five times in three files, each followed by `<p className="font-heading
  text-lg tracking-tight text-foreground">` and a `mt-2 text-sm ... text-muted-foreground`
  paragraph; two prepend `<NoResultsHoopoe size={76} />` inside `mb-3 flex justify-center`,
  one prepends a Feather icon. The lab letterhead copies the same card at `p-10` (clone 193).
  Audit-1 dup-14 made the hoopoe stage one component and left the card around it five times.
- **What to do**: `src/components/common/empty-card.tsx` -- `EmptyCard({ art?, title,
  children?, className? })` rendering exactly this markup. The five sites pass their own
  copy and art. Directory-client's three keep their branch logic and pass different titles.
- **Saving**: 0 jscpd clones; 5 copies of a 3-line shell; the next empty state is one line.
- **Risk & gate**: low. `npm run visual` (`/feed`, `/directory`, `/letters` are baselines but
  masked past the header on live data) -- eyeball each empty state signed in as Jerry with a
  search that matches nothing.
- **Confidence**: high.
- **Notes**: the AnimatePresence fade quad (`initial y:8 / animate / exit y:-8 /
  SPRINGS.gentle`, clones 46, 47, 53 -- six sites in forgot, reset and signup) is the other
  repeated visual idiom. `FadeRise` has no `exit`, and each site needs its own `key`, so a
  `FadeSlide` saves three lines per site and adds fifteen. I classified it (e): do it only if
  motion.tsx gains an exit-capable primitive for another reason.

### duplication-09 - Within-file micro-clones in shipped code, one sweep
- **Where / what** (each verified at both ends):
  1. `src/app/(main)/collection/actions.ts:1203-1210` = `:1303-1310` -- the uploader-or-admin
     check → `requirePhotoOwner(photoId, session)` returning `{ error } | { photo }`; and
     "That photo is no longer here." at `:1031, 1051, 1149, 1337` → one const.
  2. `src/app/(main)/messages/actions.ts:157-160` = `:229-232` -- `select: { id: true, memberId:
     true, kind: true, subject: true }` → `THREAD_SELECT`; `:91` = `:151` the demo refusal
     sentence → const; `:90, :150` "Not signed in" are the app's only two departures from
     "Not authenticated" (60 sites) -- take the majority.
  3. `src/components/collection/year-rail.tsx:228-238` = `:253-263` -- `rows.push({...})` →
     `rowFor(y, group, head)`.
  4. `src/lib/catchups.ts:173-177` = `:200-204` (and `:183-187`) -- the `updateMany` CAS on
     `remindersSent: before.remindersSent` → `casEdition(tx, editionId, status, before, patch)`
     returning `count > 0`.
  5. `src/components/common/filters/range-facet-pill.tsx:84-98` = `:99-113` -- the From/To
     `<select>` → `YearSelect({ label, value, onChange, years })` (audit-1 dup-24 item 4, not
     done).
  6. `src/app/(main)/feed/actions.ts:651-656` = `src/app/(main)/catchups/actions.ts:1307-1311`
     -- the `baseUpdatedAt` lost-update guard: the same four lines, the same sentence "That
     save could not be checked. Reload and try again.", comments cross-referencing each other
     (M66 / "the same instrument editPost carries") → `parseBaseVersion(raw): { base: Date |
     null } | { error }` in `src/lib/` (both files already import lib).
  7. `src/components/profile/admin-actions.ts:92` = `src/lib/admin.ts:160` -- "This is the only
     admin. Make somebody else one first." → export the sentence from lib/admin.ts. The two
     IMPLEMENTATIONS stay separate on purpose: admin-actions' comment explains the purge
     cannot sit inside the serializable retry, and `admin-guard-rule.test.mjs` pins
     `refuseSelfOrLastAdmin`/`Serializable` in lib/admin.ts and the self/last-admin regex in
     admin-actions -- a string export changes neither.
- **Phase**: dedupe
- **Tier**: T1 (2, 7), T2 (1, 3, 4, 5, 6)     **Class**: structural (1, 3, 4, 5, 6) / cheap
  (2, 7)     **Decides**: autonomous
- **Evidence**: clones 78, 85, 86, 212, 214, 231 plus two jscpd-blind twins (6, 7). Copy
  census over shipped src: "That photo is no longer here." x4, "This Round already moved on."
  x4 (catchups/actions), "We couldn't find that conversation" x3 -- refusal sentences a later
  edit will change in most but not all of their copies.
- **Saving**: 6 clones (~53 lines) + 2 twins; net SLOC about zero (audit-1's lesson); one
  sentence per refusal; the CAS guard and the ownership check each have one home.
- **Risk & gate**: low. `npm run check` (`catchup-lifecycle.test.mjs` reads catchups.ts --
  confirm it does not pin the inline `updateMany`; admin-guard-rule per item 7); edit and
  delete a Collection photograph, reply to a support thread, save a letter draft twice from
  two tabs (item 6's guard must still refuse the stale one).
- **Confidence**: high.

### duplication-10 - Within-file micro-clones in scripts, one sweep
- **Where / what**:
  1. `scripts/qa/protocol-audit.mjs:150-159`, `:226-236`, `:270-280` -- three sweeps of one
     loop (allowlist → `readSource` → `codeLines` → regex → push message) → `sweep({ allow,
     test, message })`. The combined loop at :193-220 (three regexes, one allowlist) and the
     middle-dot loop at :241-262 (two path skips) differ and stay.
  2. `scripts/qa/drive.mjs:108-115` = `:244-251` -- open the contribute dialog →
     `openContribute(page)`.
  3. `scripts/qa/tour-mobile-verify.mjs:197-203` = `:214-220` -- press Next → `clickNext(page)`
     (neither range is one of the four strings tour-mobile-verify.test.mjs pins).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: clones 27, 40, 41, 45.
- **Saving**: 4 clones, ~32 lines.
- **Risk & gate**: low. `npm run check` runs protocol-audit: its violation count before and
  after must match exactly (that is the whole proof for item 1).
- **Confidence**: high.

### duplication-11 - StepFooter for the onboarding steps (audit-1 dup-24 item 3, not done)
- **Where**: `src/components/onboarding/steps/houses-step.tsx:135-147`;
  `register-step.tsx:196-208`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: clone 225 (13 lines): a ghost Back with the arrow, a ghost "Skip for now"
  disabled while saving, and the primary; only the primary differs (`type="button"
  onClick={handleSave}` vs `type="submit"`). Audit-1 listed this as item 3 of dup-24; the fix
  log's phase 4 has no StepFooter and `ls steps/` confirms none exists.
- **What to do**: `StepFooter({ onBack, onSkip, saving, children })` in `steps/`, the primary
  button as children. photo-step and done-step have different footers; leave them.
- **Saving**: 1 clone, 13 lines.
- **Risk & gate**: low; onboarding is not a visual baseline -- open `/welcome` as Jerry at
  both viewports.
- **Confidence**: high.

### duplication-12 - useResendVerification for the banner and the dialog that call themselves twins
- **Where**: `src/components/auth/verify-email-banner.tsx:95-125`;
  `src/components/auth/verify-email-dialog.tsx:94-124`.
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: clone 208 (14 lines). The dialog's own comment: "Same 'ok' in result check as
  the banner's twin of this handler". Shared: the busy guard, `setBusy`/`setFlash`,
  `callAction(() => resendVerification())`, the `!("ok" in result) || !result.ok`
  discrimination with the same fallback sentence, `router.refresh()`, `finally`. Different:
  what each does with `result.state` (the banner drives its own state machine; the dialog
  composes one of three sentences).
- **What to do**: `useResendVerification()` in `components/auth/` returning `{ busy, error,
  send }` where `send()` resolves to the ok result or `null` after setting `error`; each
  surface keeps its own mapping of the result. `member-verify-dialog.tsx` (clone 206) is a
  different action with a different result shape -- leave it.
- **Saving**: 1 clone, ~14 lines; the B-042 comment moves to one place.
- **Risk & gate**: low. Resending needs an unconfirmed account; if none is to hand, the code
  reading is the proof plus `npm run check`.
- **Confidence**: high.

### duplication-13 - The filters kit's pill trigger, spelled four times
- **Where**: `src/components/common/filters/facet-select.tsx:95-104` (FacetSelect) and
  `:134-142` (SortPill); `facet-search-select.tsx:89-98`; `range-facet-pill.tsx:64-73`;
  owner `pill-shell.tsx` (already exports `facetPillClass`, `FacetClearButton`, `FacetPanel`).
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: clone 213 plus two more jscpd did not pair (SortPill's has no clear button).
  The nine-line block `<div className={facetPillClass(set, className)}><Trigger
  data-facet-trigger="" className="flex min-w-0 flex-1 items-center gap-1.5 py-2
  outline-none"><span className="truncate">{text}</span>{!set && <ChevronDown .../>}
  </Trigger>{set && <FacetClearButton .../>}</div>` differs only in which trigger primitive
  it wraps (`SelectPrimitive.Trigger` vs `PopoverTrigger`) and the clear payload.
- **What to do**: `FacetPill({ set, text, label, onClear, Trigger, className })` in
  pill-shell.tsx taking the trigger component as a prop. If a component-as-prop reads worse
  than four copies -- and it may -- the honest alternative is to leave it: the shell IS
  `facetPillClass` + `FacetClearButton`, which are already shared.
- **Saving**: 1 clone + 2; ~30 lines.
- **Risk & gate**: low. `npm run visual` (`/directory` is a baseline; the filter row is inside
  the masked half, so eyeball it at 390 and 1440).
- **Confidence**: medium -- I would do it only if a fifth pill arrives.
- **Notes**: knip lists `filters/active-filter-chips.tsx` and `filters/result-count.tsx` as
  unused files (dead-code lens).

### duplication-14 - PhotoMetaInput: the photograph's answers typed three times
- **Where**: `src/app/(main)/collection/actions.ts:454-466` (`contributePhotoDirect` input)
  and `:1279-1287` (`editPhoto` input); `src/app/(main)/admin/review/actions.ts:33-40`
  (`ReviewAnswers`); owner `src/lib/collection-photo.ts:66-74` (`parsePhotoMeta`'s parameter).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: clone 73 plus the review type jscpd did not pair. The three differ only by
  `area` (contributePhotoDirect has it; editPhoto deliberately does not -- its header says a
  form that stopped asking must not answer with a blank) and by their own `key`/`scope`/`id`.
- **What to do**: `export type PhotoMetaInput = Parameters<typeof parsePhotoMeta>[0]` in
  collection-photo.ts; `contributePhotoDirect(input: PhotoMetaInput & { key: string; scope?:
  string })`, `editPhoto(input: Omit<PhotoMetaInput, "area"> & { id: string })`,
  `ReviewAnswers = Omit<PhotoMetaInput, "area">`. Types only.
- **Saving**: 1 clone; 3 declarations → 1.
- **Risk & gate**: low; `npm run check` is the proof.
- **Confidence**: high.

### duplication-15 - Hand-rolled admin checks still outside requireAdminAction (audit-1 dup-20 residue)
- **Where**: `src/app/(main)/collection/actions.ts:1039, 1078, 1159, 1231` (`if (session?.user?
  .role !== "admin") return { error: "Not authorized" }` in approvePhoto, approvePhotos,
  declinePhoto, adminRemovePhoto); `src/app/lab/actions.ts:31` (`"Not authorized."`, the
  full-stop drift audit-1 quoted).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: audit-1 dup-20 counted eleven; today's grep finds these five. `lib/admin.ts`'s
  banner: "Centralised so the check and its copy cannot drift between the twenty-odd actions
  that need it."
- **What to do**: `const denied = await requireAdminAction(); if (denied) return denied;` at
  the four Collection sites and in lab/actions.ts. `gate-coverage.test.mjs`'s GATE regex
  (:26) already accepts `requireAdminAction`.
- **Saving**: 5 near-dups; one refusal string.
- **Risk & gate**: low. `npm run check` (gate-coverage, admin-guard-rule); approve one queued
  photograph as admin.
- **Confidence**: high.

### duplication-16 - Two date stragglers after audit-1's one date voice
- **Where**: `src/app/(main)/letters/[id]/(read)/page.tsx:195-200`;
  `src/components/settings/actions.ts:232-237`.
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: both spell `toLocaleDateString("en-GB", { timeZone: VALLEY_TIME_ZONE, day:
  "numeric", month: "long", year: "numeric" })`, which is `formatDisplayDateLong`
  (`src/lib/utils.ts:237-244`) verbatim; the letters page even imports `VALLEY_TIME_ZONE` for
  it. Not stragglers, checked: `drafts-strip.tsx:99` (day + short month, no year -- a narrow
  column, the same call audit-1 kept for the index rail), `extend-deadline-card.tsx:49`
  (weekday), `verify-email-banner.tsx:55` (a time).
- **What to do**: `formatDisplayDateLong(letter.createdAt)` and
  `formatDisplayDateLong(purgeAt)`.
- **Saving**: 2 near-dups, ~10 lines.
- **Risk & gate**: low; `npm run check`; open one letter.
- **Confidence**: high.

### duplication-17 - clamp is defined six times while hoopoe-kit exports one
- **Where**: exported: `src/components/mascot/hoopoe-kit.ts:285`. Local copies:
  `src/components/mascot/hoopoe-playground.tsx:90`, `mascot-flight-layer.tsx:70`,
  `src/components/common/pinch-zoom.ts:64`, `src/lib/photo-layout.ts:203`,
  `src/components/settings/avatar-crop-dialog.tsx:82` (function form), `src/app/not-found.tsx:92`
  (`clamp01` over a `clamp` -- check where that one comes from).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: grep; six one-line definitions of the same arithmetic.
- **What to do**: `export const clamp = (v: number, lo: number, hi: number) => ...` in
  `src/lib/utils.ts`; hoopoe-kit re-exports or imports it. CAVEAT before touching
  `pinch-zoom.ts` and `photo-layout.ts`: both have `*.test.mjs` files that import them under
  bare node (audit-1's "import-clean on purpose" note for `catchups.ts`/`avatar.ts`, which
  bit twice). Read `pinch-zoom.test.mjs` and `photo-layout.test.mjs`'s import lines; if they
  load the `.ts` directly, an `@/lib/utils` import breaks them and those two keep their local
  line. Do the other four.
- **Saving**: 4-6 one-liners; 0 lines; one name.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: medium (the bare-node constraint decides how many).

### duplication-18 - e2e: the Collection specs re-declare their locators and helpers
- **Where**: `e2e/collection-seek.spec.ts:37` (`rail`), `:43` (`drawn`, which reads the RAIL);
  `e2e/collection-journeys.spec.ts:41` (`rail`, identical), `:47` (`drawn`, which reads the
  RIVER -- the same name with a different meaning one file over); `page.goto("/lab/
  collection")` ten times in seek; within seek: the scrubber grab (`:561-568` = `:584-591`),
  the "band under the reader" scrollspy evaluate (`:478-484` = `:608-617`),
  `readInChronologicalOrder` (`:111-119`) vs `readChronologicallyOnAPhone` (`:521-525`).
- **Phase**: dedupe
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: all four e2e clones plus the two cross-file twins. `e2e/playwright.config.ts`
  has `testDir: "."` and the default `testMatch` (`*.spec.ts` / `*.test.ts`), so a helper module
  named `e2e/_collection.ts` is not collected as a test.
- **What to do**: `e2e/_collection.ts` exporting `rail`, `scrubber`, `openCollection(page,
  { lab, order })`, `bandUnderReader(page)`, `grabScrubber(page)`; rename one `drawn`
  (`railDrawn` / `riverDrawn`). Say in the helper's comment why seek drives `/lab/collection`
  and journeys drives `/collection`.
- **Saving**: 4 clones (38 lines) + 2 cross-file twins.
- **Risk & gate**: low. `npm run test:e2e` is the gate (not run in the fix session unless the
  owner says; per CLAUDE.md the specs are the MCP's memory, so no spec changes behaviour).
- **Confidence**: high.

### duplication-19 - The hand-run pass family: what the protocol requires and what is merely copied
- **Where**: `scripts/dev/tag-photos-{pick,apply}.mjs`, `tag-professions-{pick,apply}.mjs`.
  (`import-album.mjs`, which the brief groups here, is not a pass: it has no `-pick`, so
  `hand-run-passes.test.mjs` never sees it; it is covered by duplication-01.)
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: clones 7, 8, 9, 11, 12, 16, 17, 18, 19. REQUIRED by `docs/spec/
  hand-run-passes.md` and pinned by `scripts/qa/hand-run-passes.test.mjs`: the `-pick`/
  `-apply` pair; `const OUT = path.join(process.cwd(), "scripts", "dev", ".<name>")` in the
  picker; `database: envFile` in the manifest; no UPDATE/INSERT/DELETE in the picker;
  `--apply`, `--undo` and `applied-` in the applier; a skill that links the spec. MERELY
  COPIED (the spec's own "copy the pair that is closest" produced it): the argv helper, the
  env + url + DEMO_REF block, the `pg.Client` line, `readJson`, the `writeRow` pattern, the
  undo branch, the applied-log write. Drift inside the protocol-mandated part: tag-photos-
  apply.mjs:230 writes `{ database, applied: <iso>, changes }` and tag-professions-apply.mjs:
  242 writes `{ database, at: <iso>, changes }`. Harmless today -- both undo branches read only
  `.database` and `.changes` -- but the third pass will copy one of them and the field will
  mean nothing in particular.
- **What to do**: pick `applied` (the older) and change one key in tag-professions-apply. The
  bootstrap goes with duplication-01. Do NOT share the appliers' refusal logic (vocabulary
  check, id-outside-batch, same-id-twice, database mismatch): each enforces its own
  vocabulary's rules and the spec wants them readable in the file a session opens.
- **Saving**: the one (c) clone stays; one drift closed.
- **Risk & gate**: low; `npm run check`.
- **Confidence**: high.

### duplication-20 - The analytics room's four repeated idioms
- **Where**: the empty note `<p className="px-0.5 py-1 text-[12.5px] text-muted-foreground">`
  in `src/components/admin/analytics/cohort.tsx:22`, `compare.tsx:215`, `heatmap.tsx:28`,
  `presence.tsx:72`, `stat.tsx:161`; the bar-behind-text row in `stat.tsx:168-184` (BarList)
  and `compare.tsx:151-172` (GroupTable); the chip-link in `tabs.tsx:56-66` and
  `compare.tsx:84-90`; the intensity ramp with three floors (census item 5).
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous (admin territory by file;
  listed here because it is duplication)
- **Evidence**: grep counts above; `stat.tsx`'s banner already calls itself "the analytics
  room's four primitives", which is the home.
- **What to do**: `EmptyNote`, `LinkChip`, `BarRow` in stat.tsx; one `INTENSITY_FLOOR`
  const. The floor change is owner-visible (three grids would share one floor; today 0.15,
  0.16, 0.18) -- say so in the fix note.
- **Saving**: 0 jscpd clones; ~40 lines; one ramp.
- **Risk & gate**: low; open `/admin/analytics` on every view.
- **Confidence**: high.

### duplication-21 - Register: the 27 lab-vs-shipped clones (recorded, not proposed)
- **Where**: `lab/_kit.tsx:29-33` vs `common/motion.tsx:17-21` (SPRINGS; `_kit.tsx:52` is also
  a second `FadeRise` and `useValleyMotion` is `useMotionGovernor`'s ancestor) [90];
  `lab/birds-bg/page.tsx:41-55` vs `bird-avatar-v2.tsx:1811-1825` (the outline filter) [93];
  `lab/chain-lines/page.tsx` vs `profile/houses-chain.tsx` (balanceRows, the turn geometry,
  the row loop -- 11 clones, 192 lines) [94, 97-104]; `lab/eggs/page.tsx` vs
  `layout/konami-eggs.tsx` [125-127]; `lab/landings/_variant-editorial.tsx` vs
  `landing/trust-section.tsx` (VOUCHED) [138]; `lab/mascot-moments/page.tsx` vs
  `moments/moment-hoopoe.tsx` (`useAutoplay` is `useMomentAutoplay`) and
  `no-results-hoopoe.tsx` (the sequence) [142, 145]; `lab/profiles/_chain-kit.tsx` vs
  `houses-chain.tsx` (Arrow, useChainMetrics) [146-148]; `lab/profiles/_variant-broadsheet`
  vs `letterhead-profile.tsx` (chirp arcs) [158]; `_variant-dossier` vs `admission-stamp.tsx`
  [167]; `_variant-letterhead-2` vs `letterhead-profile.tsx` (the stamp, the photo-circle
  observer, the facts grid -- 39 + 11 lines) [181, 188]; `_variant-letterhead` vs
  `letterhead-profile.tsx` (the sheet) [194, 195]; `lab/support-ideas/_shared.tsx` vs
  `support/bird-plate.tsx` [204].
- **Phase**: architecture
- **Tier**: T4     **Class**: structural     **Decides**: owner
- **Evidence**: in every pair the lab side is the prototype and the shipped side is the pick
  transplanted (commit history per audit-1: "port the approved preview interactions into the
  app" for eggs; "shipped 2026-07-30 from the Letterhead II concept" in letterhead-profile's
  header; chain-lines' header: "all copied from src/components/profile/houses-chain.tsx").
  `rg 'from "@/app/lab'` over shipped src returns nothing, so none of it reaches members.
- **What to do**: nothing, by the brief's rule. Two optional one-liners for the lab lens or
  the owner: `export { SPRINGS, FadeRise } from "@/components/common/motion"` in `_kit.tsx`
  (8 lab files import from `_kit`, 26 already import from `common/motion`), and
  `lab/mascot-moments` importing `useMomentAutoplay` instead of re-declaring it -- each stops
  the record drifting from the shipped primitive at the cost of coupling the record to it.
- **Saving**: 0.
- **Risk & gate**: none.
- **Confidence**: high.

## Owner decisions

- **The letterhead header still asks for something nobody does.** `letterhead-profile.tsx:6-9`
  (2,030 lines today) still says "The concept file is the design record; this is the same
  layout against real `User` data. Keep them in step, or retire the concept." Audit-1 raised
  this; nothing changed, and the concept has since grown a third variant (`_variant-
  letterhead-3.tsx`, 1,333 lines) that the header does not mention. Recommendation, unchanged
  from audit-1: amend the two headers to say the concept is a snapshot of the 2026-07-30 pick,
  not a maintained spec. Five minutes, no code. The same one-line note fits
  `lab/chain-lines/page.tsx` vs `houses-chain.tsx`.
- **Three heading sizes that are not on your ladder.** DESIGN-SYSTEM §5 gives h1 2rem (32px),
  h2 1.5rem (24px), h3 1.25rem (20px). Shipped pages hand-type `text-[27px]` (the auth pages,
  6 sites), `text-[26px]` (the join pages, done-step, dark-gauntlet x6, person-detail: 9
  sites) and `text-[24px]` (thread-view, three onboarding steps: 4 sites). Two of the three are
  off the ladder and none has a name. Either bless 26 as the page-title rung in §5 (and fold
  27 into it) or move them to 2rem/1.5rem; a `PageTitle` primitive follows the decision, not
  the other way round. Recommendation: bless one, because the 26/27 split is not a design
  choice anyone made.
- **Should the lab import the shipped motion primitives?** `_kit.tsx` re-declares SPRINGS
  (three of motion.tsx's four keys) and its own FadeRise; `lab/mascot-moments` re-declares
  `useMomentAutoplay`. A one-line re-export stops them drifting from what ships and couples
  the design record to future changes of it. Recommendation: re-export SPRINGS only (a spring
  that changes in the app should change in the record, or the record lies about the feel),
  leave FadeRise and the autoplay hook as the snapshots they are.
- **"You are not a member of this group."** The four lifecycle refusals in
  `catchups/actions.ts:566, 627, 657, 735` say "group"; the three membership refusals say
  "Catch-up". `loadKeeperScope`'s comment records the two phrasings as deliberate copy that
  the collapse must not change, and it did not. But "group" is the pre-rename vocabulary
  (Groups were removed; the feature is Catch-ups). One word, four places, your call.
- **The plural ternary.** Forty-plus inline `n === 1 ? "person" : "people"` across the app. A
  `plural(n, one, many)` helper is line-neutral and would touch forty files for readability
  alone. Recommendation: leave it; the inline form reads fine and every site's words are
  right where the number is.

## Not-findings

(verified intentional; recorded so no future audit re-litigates)

- **The 38 (d) clones are one contract, not duplication.** Twenty-seven of them are the
  server-action preamble (`await auth()` → null check → `if (typeof id !== "string" || !id)`
  → gate → rate limit) inside `catchups/actions.ts` (16), `feed/actions.ts` (7) and
  `collection/actions.ts` (4). `gate-coverage.test.mjs:26` defines `GATE = /await\s+auth\s*\(
  |requireVerifiedMember|.../` and `:160` tests it against `fnBody(src, name)` for EVERY
  exported action, so the `await auth()` must appear inside each body; audit-1's `withMember`
  wrapper (dup-02) was re-refuted at fix time on exactly this (plus `auth()` being
  `cache()`d). The id-typecheck line (19 sites) and `"Invalid request."` (24) are that
  contract's second line. Nothing here re-proposes it, and the cost is known: 27 clones and
  about 250 duplicated lines are the price of a tripwire that reads bodies.
- **Probe cleanup blocks** (35, 36, 39): each deletes the tables its own probe wrote; audit-1
  dup-07's `makeProbeUser` was refused for that reason. Stands.
- **The demo env parser** (1): the wall between "seed the demo" and "seed production"
  (audit-1 dup-08). Stands. Clone 2 (seed-demo vs verify-guard, both inside demo/) is seven
  lines and could share a `demo/_env.mts` without crossing the wall; not worth a file.
- **The upload routes' loop scaffold** (87): two routes whose comments cite each other
  ("same shape and the same reason as the classic route's"), and finalize's `abort` purges
  the staged keys the loop had not reached, which the classic route has no equivalent of.
- **`contribute-stage` vs `PhotoCarousel`** (211, and the charter's collection lead): the
  stage's 69-line header argues three deliberate departures (one height per drop, cross-fade
  not slide with the viewer's opposite-curve trick, arrows beside the count), and it already
  imports `CarouselArrow` rather than redrawing it. The eleven shared lines are the arrow-key
  handler. Not a re-implementation.
- **The two `AnswerCard`s** (charter lead): `catchups/answer/answer-card.tsx` is the writing
  control (RichTextArea, PhotoAttachments, autosave, Skip/Next), `catchups/round/answer-card
  .tsx` is the reading card (IdentityRow, renderRichText, AnswerPhotos, EntryLoveButton).
  jscpd found nothing between them and neither did I. Only the export name is shared (see
  hygiene, under For other lenses).
- **`photo-attachments` vs `letter-images`** (charter lead): letter-images is a viewer
  launcher with no upload path; not a pair. photo-attachments' real twins are in
  duplication-02.
- **The eight `*-hoopoe.tsx` files** (charter lead): the four stage moments (`no-results`,
  `no-saved`, `contributed`, `messages-empty`) all render through `MomentStage`
  (`moment-hoopoe.tsx:88-113`) -- audit-1 dup-14 is complete. `celebration-hoopoe.tsx` is a
  fixed overlay that plays on `onReady`, `logo-easter-egg-hoopoe.tsx` is click-triggered inside
  the logo and consults `anotherHoopoeOnScreen()` itself, `sidebar-hoopoe.tsx` and
  `landing/footer-hoopoe.tsx` are resident birds. Four shapes, four files; nothing to fold.
- **`IdentityRow`** is not re-implemented by the people rows in `catchups/create/
  people-picker.tsx:189-200`, `home/people-panel.tsx:577-586` or `admin/analytics/
  presence.tsx:82-108`: those are horizontal name + batch-year rows, not IdentityRow's
  stacked name-over-byline. Clone 210 is (e).
- **The hoopoe's fold/unfold blocks** (221-224): audit-1's not-finding (the landing variant
  deliberately leaves the legs alone, with the `.finished` reason in the comment). Stands.
- **PostFeed vs ProfileAuthorFeed** (226-228): audit-1 dup-12's shared pager was refused with
  three measured differences (offset vs cursor, skeleton re-arm, the C-180 ref-guard); what
  was genuinely one rule (`appendUnseen`) is already shared and pinned. Stands.
- **`classYearsOf` vs `parseBatchTargets`** (232): the same eight-line CSV walk, a different
  token grammar (four digits vs `type-year`), in two rule files each pinned by its own
  `*-rule.test.mjs`. A shared walker would hide the grammar that IS the rule. Keep.
- **`report-action.ts`'s two transaction tails** (229): `alreadyReported` vs `alreadyFlagged`
  are client API (the dialogs read them); the shared part (`openReportThread`) is already
  shared. Audit-1 dup-24 item 1 (the preamble) was done (`c5025c5`).
- **`api-gate.ts`'s two tails** (230): six lines in one file that audit-1's own fix created.
- **The five `*-message.ts` sentinels**: audit-1's not-finding stands (dependency-free by
  contract; plain-Node probes import them).
- **`loading.tsx`**: an md5 over every `loading.tsx`, `error.tsx` and `not-found.tsx` under
  `src/app` finds no byte-identical pair; audit-1 dup-23 (the letters desk skeleton) is done
  and the rest each mirror their own page.
- **`admin/support`'s `Ledger` vs `MailRows`** (54): a ten-line row shell around two different
  row grammars (payment status/refund/failure vs mail kind/attempts/lastError). Audit-1 dup-24
  item 6's verdict ("fix only if already editing") stands; an `AdminLedgerRow` earns its
  keep at the third sibling.
- **The lab-vs-lab clones** (88 clones, 1,448 lines): variant galleries (`_variant-letterhead-2`
  vs `-3` share 91 lines of `contactMethodsFor`/`buildVcard`/`sparseOf`/`toPostData`
  verbatim; the five chain variants; the five landing variants' VOUCHED; the five spine-marker
  rows). Forks are the medium. Two lab-internal items that a lab lens might still want are
  under For other lenses.
- **The `isMobile` matchMedia pair** (218) and the in-view probe (219) sit in
  `landing/perching-birds.tsx` and `ambient-leaves.tsx`, which are reachable today only through
  `landing/showcase.tsx`, which knip lists as unused and `src/app/page.tsx` does not import
  (its header says why). Dead code is not deduplicated; see the dead-code hand-off.

## Audit-1 carry-overs in this territory

- dup-01 (legacy silhouette renderer): done; nothing remains.
- dup-02 (action-gate wrapper): re-refuted at fix time; the 27 preamble clones are the price
  and stay (Not-findings).
- dup-03 (rule-test kit): done for the tests; `scripts/qa/audit-status.mjs` was not pointed
  at `balancedBody` -- duplication-05.
- dup-04 (login/signup flight + photo half): done; the residue (49-52) is (e); one duplicated
  10-line comment (hygiene, below).
- dup-05 (keeper gates): done; clones 61-70 are the remaining preamble lines, i.e. the tripwire.
- dup-06 (identity selects): done, 39 → 12; nine remain (duplication-06), two by design.
- dup-07 (probe kit): bootstrap/openDb done; `makeProbeUser` refused; `makeLedger` was built
  but phase3 and the hoopoe checks never adopted it, and the screenshot family never got the
  bootstrap -- duplication-04.
- dup-08 (dev-script db opener): refused, env parser shared; the URL guard was copied on since
  -- duplication-01 (a guard, not an opener).
- dup-09 (API guards): done (`api-gate.ts`); the upload predicates are a separate residue --
  duplication-03.
- dup-10, 11, 13, 14, 15, 17, 19, 21, 22, 23: done; nothing remains that jscpd or I can see.
- dup-12 (shared pager): refused; stands.
- dup-16 (directory person type): select half done, type half not -- duplication-06.
- dup-18 (one date voice): done, two stragglers -- duplication-16.
- dup-20 (hand-rolled admin checks): five remain -- duplication-15.
- dup-24 items: 1 done; 2 (`image-viewer.tsx` Link-vs-span fragment) unknown -- the file was a
  peer's uncommitted edit at session start and I did not read it; 3 not done (duplication-11);
  4 not done (duplication-09 item 5, duplication-13); 5 done (`AdminFilterBar`); 6 unchanged,
  verdict stands; 7 done; 8 done; 9 left by design.
- Owner decision "letterhead in step": still open, restated above with new evidence (a third
  variant).
- Owner decision "landing showcase family": still switched off; `page.tsx` renders only the
  hero and its header says how to put the showcase back; knip lists 5 of the family and the
  transitive set is larger (dead-code hand-off).
- Owner decision "two kinds of are-you-sure": not re-examined here (not a clone); the
  shell-primitives lens's.

## For other lenses

- **dead-code**: `src/app/page.tsx` renders only `LandingHero`; `landing/showcase.tsx` (knip:
  unused) is the sole importer of `perching-birds.tsx`, `ambient-leaves.tsx`,
  `section-reveal.tsx`, `shots.ts`, `showcase-shot.tsx` and `landing-nav.tsx`, so those are
  unreachable too even though knip's non-transitive list names only `showcase`,
  `feature-section`, `footer-hoopoe`, `landing-footer`, `trust-section` -- verify with the
  production knip run before calling it. Clones 138, 218, 219, 220 live there. Also in knip's
  list: `filters/active-filter-chips.tsx`, `filters/result-count.tsx`.
- **scripts-e2e-ci**: the 18 files with the identical launch block (duplication-04 lists
  them) -- which survive decides how much of P-S3 is real. `scripts/dev/apple-edge/truth.mjs:3`
  and `truth-profile.mjs:6` read `"sanan's stuff/Inspiration/not yet right.png"`, a path in the
  untracked private folder the brief says not to open; a measurement script that cannot run
  without a private file is a question for that lens. `ops/prune.mjs` and `snapshot.mjs`
  use `dotenv` while every dev script uses `_env.mjs` -- fine (they run in CI), noting it.
- **catchups territory**: the "group" wording (owner decision above); "This Round already
  moved on." x4 and "Something went wrong. Please try again." x8 across 5 files (a
  `GENERIC_FAILURE` const is cheap but touches five files; catchups' own copy at
  `actions.ts:172` is inside `runAction`, the one place the others could import from).
- **collection territory**: `contribute-room.tsx` (1,067 lines) beyond its structure and
  `fileOne` was not read; its private `measure(file)` (:125-160) should be checked against
  `image-downscale.ts` / `describeImage`; its `notices` Set (:597) is the fourth home of the
  M15 notices idea (duplication-02 covers the three fetch-based ones).
- **admin territory**: duplication-20 (the analytics idioms) and clone 54 (Ledger vs MailRows)
  are theirs by file.
- **design / shell-primitives**: the heading rungs (owner decision); the AnimatePresence fade
  quad (six sites; duplication-08 Notes); `rounded-[var(--radius)] border border-border
  bg-card p-[var(--space-m)]` is the most repeated long class string in shipped tsx (11x in 7
  files, five of them `loading.tsx` skeletons that each mirror their own page per audit-1
  dup-23's verdict) -- worth a look only if a card primitive is on the table anyway.
- **lab**: the concept-picker harness is written three times (`lab/landings/page.tsx:39-94`,
  `lab/profiles/page.tsx:71-117`, `lab/support-ideas/page.tsx:60-69` -- `isConceptKey`, the
  `?v=` param, `selectConcept`, the pill nav, clones 139-141); `_kit.tsx` as motion.tsx's
  twin; the 88 lab-internal clones. All (b); the lab lens decides whether harness chrome is
  design history or scaffolding.
- **security / write-path**: the two upload surfaces with no timeout (duplication-02) and the
  avatar HEIC check that misses the blank-MIME case (duplication-03) are drift with a member-
  visible failure mode; both are small.
- **hygiene** (no finding of its own): two exported `AnswerCard`s in `catchups/answer/` and
  `catchups/round/` -- rename one (`AnswerEntryCard`?); the perch-box comment is written twice
  in two phrasings (`login-client.tsx:230-239` vs `signup-client.tsx:147-153`) -- keep one and
  point the other at it; three copies of the "(audit M15)" notices comment (duplication-02
  folds them).

## Metrics

- Clones triaged: 232 + 4 e2e + 2 tests = 238, all classified; both sides opened for every one.
- Class split: a 47 (522 duplicated lines) / b 115 (1,866) / c 1 (12) / d 38 (372) / e 31
  (348). jscpd's de-overlapped total is 2,888; the per-clone sum is 3,120.
- Within-file clones: 69 of 232 (716 lines); 10 of them are cheap real wins, 27 are the
  tripwire contract, 30 are lab galleries.
- Lab: 88 lab-vs-lab clones (1,448 lines), 27 lab-vs-shipped (418 lines). `rg 'from
  "@/app/lab'` over shipped src: 0 hits.
- Programmes: 14 (8 scripts, 6 src) + 1 e2e; honest projection across all findings: ~110
  clones or near-duplicate copies removed (47 jscpd (a) + 4 e2e + ~60 jscpd-blind copies),
  ~700 duplicated lines to single owners, net SLOC roughly -180 (almost all of it in
  scripts/qa and scripts/dev), two behavioural drifts closed (upload timeout, avatar HEIC),
  one missing guard added (import-album).
- Near-duplicate census (shipped src, non-lab): `"Not authenticated"` 60 / `"Not signed in"`
  2; `"Not authoriz(s)ed"` 19 sites of which 5 hand-roll the admin predicate; `"Invalid
  request."` 24; `typeof x !== "string" || !x` 19; inline `birdOverride: true` selects 9;
  `initial={{ opacity: 0, y: 8 }}` 11; `exit={{ opacity: 0, y: -8 }}` 6; the 27px auth h1 6;
  26px h1/h2 9; 24px h2 4; the p-12 empty card 5; `clamp` definitions 6 (+1 exported);
  `n === 1 ? ... : ...` 40+; raw `toLocaleDateString` outside utils 6 (2 stragglers);
  outside-click `mousedown` listeners 2 shipped (different conditions).
- Scripts census: identical `puppeteer.launch` block 18 files; inline `process.chdir(repoRoot)`
  14 scripts outside the kit; `DEMO_REF` 7 files (+1 script without it); `flag`/`value` argv
  helper 6 files; private pass/fail ledgers 3; `e2e/.shots` auto-number 3.
- Biggest files touched by findings: `catchups/actions.ts` 2,054; `feed/actions.ts` 1,550;
  `collection/actions.ts` 1,359; `contribute-room.tsx` 1,067; `letterhead-profile.tsx` 2,030
  (register only); `drive.mjs` 727; `audit-status.mjs` 723; `protocol-audit.mjs` 302.
- Lines read: roughly 9,000 at clone ranges and in the 34 fully-read files, plus the 785-line
  audit-1 duplication report and ~400 lines of its fix log.

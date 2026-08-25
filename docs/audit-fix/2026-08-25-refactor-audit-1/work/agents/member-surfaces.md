# member-surfaces - simplification audit report

Territory reader for the secondary member surfaces: Collection, Letters, Support/Donate
(Razorpay), Messages (member<->admin threads), Notifications (actions + links lib), Notice,
About, the dark-mode gauntlet, the three policy pages, and the settings/theme component
cluster. Date: 2026-08-25. Files in territory: 67 (33 app routes/loading files, 2 API routes,
25 components, 7 lib files); read fully: 61; skimmed: 6 (the prose interiors of
privacy/terms, tail of avatar-crop-dialog after verifying its structure, and the three
mascot-moment siblings read for the dedupe comparison).

## Coverage

- Read fully: `src/app/(main)/{collection,letters,support,donate,messages,notifications,notice,about,dark-mode}/**`,
  `src/app/(policies)/_shared.tsx`, `(policies)/layout.tsx`, `(policies)/guidelines/page.tsx`,
  `src/app/api/razorpay/webhook/route.ts`, `src/app/api/account/export/route.ts`,
  `src/components/collection/**`, `src/components/letters/**`, `src/components/support/**`,
  `src/components/messages/**`, `src/components/settings/**` (avatar-crop-dialog to line 230),
  `src/lib/{collection,collection-facets,collection-intake,contribution-state,razorpay,theme,notification-links}.ts`.
- Skimmed (why): `(policies)/privacy/page.tsx` and `(policies)/terms/page.tsx` bodies (verified
  they use the `_shared.tsx` vocabulary and hold only prose; the structure is what the audit
  judges, the words are legal copy); `avatar-crop-dialog.tsx:230-370` (render half of a
  single-implementation dialog whose math half I read in full);
  `src/components/mascot/moments/{no-results,no-saved,moment}-hoopoe.tsx` (outside territory,
  read to confirm the three-way clone in finding 06).
- Not read: nothing in the charter left unread.
- Uncommitted edits seen (someone else's WIP): none in my territory. `git status` shows another
  session's WIP in `next.config.ts`, `src/lib/admin.ts`, `scripts/qa/phase7-probe.mjs`,
  `src/components/tour/manual-tour-entry.test.mjs`, and a new `src/app/(main)/forbidden.tsx` -
  all outside my files. One consequence for a finding: 08 recommends the /donate redirect land
  in `src/proxy.ts` (clean) rather than `next.config.ts` (their WIP).

## Summary

This territory is in much better shape than "many small surfaces written in different
sessions" predicted. The money path (support actions, razorpay.ts, the webhook,
contribution-state) is the best-commented code in the repo and every heavy comment carries an
audit ID - I found essentially nothing to cut there and say so as not-findings. The shared
primitives are genuinely shared: the Collection uses `components/common/filters`, the letter
desk wraps `CreatePostForm` rather than forking it, the message composer serves three modes
from one file. The real wins are concentrated dead code: a 114-line server action nothing
calls (`updateUserProfile`, superseded 2026-08-07 by per-field autosave), and the entire UPI
QR pipeline (a 147-line generator script, five committed SVGs totalling ~199KB in `public/`,
two devDependencies, a stale README row) orphaned when Razorpay replaced the QR on
2026-08-05. After those, it is dedupe: two-and-a-half copies of the Photo-row intake flow,
three near-identical hoopoe empty-state components, two byte-identical loading files, and
hand-rolled copies of `plainExcerpt`/read-time that are worse than the shared helper they
shadow (one of them re-introduces a "!alt-text" rendering artifact the shared helper
explicitly fixed). Structural-vs-cheap split: roughly 9 structural, 4 cheap. The surprises:
`/about` ships to production reading "indefinitely procrastinated", and the `/dark-mode`
loading skeleton still mocks the retired /settings page, component name and all.

## Findings

### member-surfaces-01 - Delete the dead `updateUserProfile` server action
- **Where**: `src/components/settings/actions.ts:26-139` (the function), plus the imports it
  alone uses at lines 16-18 (`profileSchema`, `batchTypeFromLeaving`, `normalizePhone`)
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: knip and knip-production both list `updateUserProfile  function
  src/components/settings/actions.ts:26:23` as an unused export. Grep confirms zero call
  sites: `letterhead-profile.tsx` imports only `updateUserPlaces, requestAccountDeletion,
  updateAvatar, removeAvatar` (lines 85-91), `photo-step.tsx` imports only `updateAvatar`,
  and `profile-actions.ts` merely mentions it in a comment. That comment is the epitaph:
  "That module writes a whole FORM: updateUserProfile reads fourteen names off one FormData
  ... The profile has no Save button (owner, 2026-08-07: 'let the profile automatically
  save'), so every field commits on its own." The whole-form save was superseded by the
  per-field writes in `profile-actions.ts` and nothing was left pointing at it. No
  `*.test.mjs` references it.
- **What to do**: Delete lines 26-139. Remove `profileSchema` from the import at line 16
  (check first: it is imported from `@/lib/validators` in this file only for this function -
  `profile-actions.ts` imports its own copy), and `batchTypeFromLeaving`/`normalizePhone`
  from line 17-18 if no other function in the file uses them (`updateUserPlaces` uses
  `titleCase` only; `requestAccountDeletion` uses neither). Then reword the three comments
  that cite it as a live counterpart: `src/components/profile/profile-actions.ts:8`,
  `src/lib/utils.ts:468`, `src/lib/validators.ts:102` (and 128) - they explain rules by
  contrast with a function that will no longer exist; point them at `profile-actions.ts`'s
  own per-field model instead.
- **Saving**: ~118 lines code
- **Risk & gate**: low. `npm run check` (TypeScript will catch any missed import), plus open
  `/profile/<own id>` and save one field to prove the live path untouched.
- **Confidence**: high. The one thing that would change my mind: a dynamic
  `formData`-action reference by string, which Server Actions cannot do - I checked for the
  bare identifier repo-wide.
- **Notes**: This is the cleanest single deletion in the territory. `profileSchema` itself
  stays in validators (profile-actions.ts imports it for per-field bounds via
  `fieldClears`). The commit should be one revertable change: function + its orphaned
  imports + the three comment rewordings.

### member-surfaces-02 - Delete the orphaned UPI QR pipeline (script, five SVGs, two deps)
- **Where**: `scripts/gen-support-qr.mjs` (147 lines), `public/images/support-qr.svg`,
  `support-qr-500.svg`, `support-qr-1000.svg`, `support-qr-2000.svg`, `support-qr-5000.svg`
  (~199KB total), `package.json` devDependencies `jsqr` and `qrcode`,
  `scripts/README.md:73`
- **Phase**: dead
- **Tier**: T1     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/components/support/support-contribute.tsx:16-18` records the
  replacement: "This replaced a static UPI QR and an `upi://pay` deep link (2026-08-05)."
  Grep for `support-qr` across `src/`, `e2e/`, `public/` finds zero references outside the
  generator script itself and docs history (`docs/planning/bugs.md:369` past tense). Grep
  for `jsqr|qrcode` finds exactly one consumer: the script. knip lists
  `scripts/gen-support-qr.mjs` as an unused file in both configs. The SVGs were last touched
  2026-07-24 (`1f549b3 added actual qr codes and fixed 404`), twelve days before the feature
  they serve was removed. The script's own header says "Keep this in sync with the UPI link
  that support-contribute.tsx builds for its button" - a button that no longer exists.
- **What to do**: `git rm scripts/gen-support-qr.mjs public/images/support-qr*.svg`; remove
  `jsqr` and `qrcode` from devDependencies and run the lockfile update; delete the
  `gen-support-qr.mjs` row from `scripts/README.md`. Everything in `public/` deploys, so the
  five SVGs are currently shipped to production for nothing.
- **Saving**: 147 lines script + 6 files + ~199KB deployed static assets + 2 devDependencies
- **Risk & gate**: low. `npm run check`; open `/support` and complete the chip-select UI to
  confirm nothing renders a QR.
- **Confidence**: high. Would change my mind: an owner intention to bring back a no-fee UPI
  path - but the support-contribute header explains why Razorpay won (international alumni),
  and the script is one `git revert` away if ever wanted.
- **Notes**: The orchestrator's own `findings.md:189` had guessed these devDeps were "fine as
  devDeps IF those scripts are current". They are not current; this settles it.

### member-surfaces-03 - Merge the three Photo-intake flows' shared halves
- **Where**: `src/app/(main)/collection/actions.ts:122-249` (`contributePhoto`),
  `296-489` (`contributePhotoDirect`), `src/lib/collection-intake.ts:46-181`
  (`copyPostImagesToCollection`)
- **Phase**: dedupe
- **Tier**: T3     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd flags the internal clones (`actions.ts [203:15-209:39] ==
  [425:48-432:40]`, `[225:34-245:23] == [459:29-476:25]`). Three code paths create Photo
  rows and each re-states: (a) the schema parse + era derivation
  (`actions.ts:157-171` vs `348-359` - identical ten lines), (b) the
  admin-or-photoTrusted auto-approve lookup (`217-221` vs `362-365/447-448` vs
  `intake:64-76`), (c) the thumbnail recipe (480px, `webp({quality:72})` -
  `actions.ts:202-206`, `425-428`, `intake:125-130`), and (d) the row-data literal with the
  legacy placeholders `subject: "", freeTags: null` (`actions.ts:224-245`, `451-475`,
  `intake:136-156`). Both dialog paths stay live by design - `contribute-dialog.tsx:130-167`
  uses direct-to-R2 when presign works and falls back to the FormData path (local dev, CORS
  miss) - so neither can be deleted; the shared prep can.
- **What to do**: Extract into `collection-intake.ts` (or a small `collection-write.ts`):
  (1) `parsePhotoMeta(input) -> { caption, area, era, photoYear, photoMonth, datePrecision } | {error}`
  wrapping the safeParse + `eraFromYear` fallback; (2) `photoAutoApprove(session)` doing the
  role/photoTrusted read; (3) `photoRowData(userId, meta, stored, autoApprove)` returning the
  `data` literal (with the `subject: ""`/`freeTags: null` legacy comment written once);
  (4) `gridThumb(buffer)` for the 480px/q72 recipe. Rewire the three callers. Keep
  `createPhotoRow` and the `refuse` cleanup exactly as they are - the C-063/C-064 orphan
  logic is per-path on purpose and must not be abstracted.
- **Saving**: ~55-70 lines code, and one place instead of three to change when a Photo
  column moves
- **Risk & gate**: medium. `npm run check` - specifically `collection-rule.test.mjs` (it
  pins the refuse-shape of `contributePhotoDirect`; the extraction must not change any
  return shape) - then one real upload through the dialog on localhost (which exercises the
  FormData fallback) and one composer post with the "Also add to the Collection" tick.
- **Confidence**: high on the duplication, medium on the exact line count.
- **Notes**: I considered and rejected merging the two actions into one with a source
  parameter: the direct path's every-exit-must-purge invariant (the `refuse` closure) is
  load-bearing and a merged function would smear it across both modes. Extracting only the
  pure prep keeps each path's storage-cleanup story intact. Related: finding 12 would shrink
  the row literal further.

### member-surfaces-04 - Move lab-only `wood.tsx` out of the shipped component tree, and fix its three stale references
- **Where**: `src/components/support/wood.tsx` (246 lines); stale references at
  `src/app/(main)/support/page.tsx:60-64` (comment naming `wood-mount.tsx`),
  `src/app/lab/_registry.ts:198` ("one boolean in wood-mount.tsx puts it back on /support"),
  and `wood.tsx:9-11` (revival instructions naming `app-shell.tsx` mounting)
- **Phase**: relocate
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: Floor question answered with the import graph: `SupportWood` has exactly one
  importer, `src/app/lab/support-ideas/_variant-aviary.tsx` - a lab room. Nothing under
  `(main)` imports it, so it is lab-only, not shipped and not dead (the parked header at
  `wood.tsx:3-7` records the owner's 2026-08-18 decision to keep it revivable: "he wants the
  option back without re-tuning"). But its revival instructions are stale: `wood-mount.tsx`
  does not exist anywhere in `src/` (grep), so both the registry note and the page comment
  describe a mechanism that was since deleted, and a future session following them would go
  hunting for a file that is not there.
- **What to do**: `git mv src/components/support/wood.tsx src/app/lab/support-ideas/_wood.tsx`
  and update the one import in `_variant-aviary.tsx`. Rewrite the revival note in the moved
  file's header to describe what revival actually takes now (mount `SupportWood` from
  `app-shell.tsx` behind a `usePathname() === "/support"` wrapper, and move the file back);
  fix `_registry.ts:198` and delete the stale `wood-mount.tsx` sentence from
  `support/page.tsx:60-64` (keep the transform-containing-block warning, which is real and
  still true).
- **Saving**: 0 lines (246 lines leave `src/components`); truth-in-file-tree and three
  corrected comments
- **Risk & gate**: low. `npm run check` (lab registry audit runs in it); open
  `/lab/support-ideas?v=aviary`.
- **Confidence**: high. Would change my mind: the owner preferring the parked design to sit
  visibly in the prod tree as a statement of intent - but memory ("aviary parked in
  wood.tsx (lab-only)") already records it as lab-only.
- **Notes**: Do NOT delete it, and do not trim its 127 comment lines: they are the tuning
  history ("I should be able to get it to look like it does now") the parking exists to
  preserve. The comment density lead (1.15 ratio) is a not-finding; the location is the
  finding.

### member-surfaces-05 - Schedule the retirement of the /notice/[id] legacy resolver
- **Where**: `src/app/(main)/notice/[id]/page.tsx` (105 lines),
  `src/app/(main)/notice/[id]/loading.tsx` (13 lines), plus the `createdAt` override
  parameter of `openAdminNoticeThread` in `src/lib/admin-threads-server.ts` that exists for
  this caller
- **Phase**: placeholder (a compatibility shim with a knowable expiry)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (at the dated moment)
- **Evidence**: The file's own header: "kept only so links already sitting in people's
  notification lists still work ... New notes link there [/messages/[id]] directly." The
  only inbound references to `/notice/` are that same history told in comments
  (`messages/[id]/page.tsx:23`, `feed/actions.ts:512`, `moderation-dialog.tsx:20`,
  `admin-note.ts:13`); no live writer mints a `/notice/` link. The shim's audience is
  `Notification` rows with a legacy link, and `src/lib/retention.ts:41-42` caps
  notifications at 365 days ("Notifications: 1 year. Purely transient by design"). The
  moderation-notes-to-messages migration landed 2026-07-24, so after ~2027-07-24 no
  notification that predates the migration can still exist, and the route resolves nothing
  ever again.
- **What to do**: Nothing today. Add a dated line to the cleanup ledger the orchestrator
  compiles: after 2027-08-01, delete `src/app/(main)/notice/` (both files), remove the
  `createdAt`/`db` override plumbing from `openAdminNoticeThread` if this was its only
  caller (check at that time), and reword the four history comments that cite the route.
- **Saving**: ~120 lines, deferred (~0 today)
- **Risk & gate**: low at the dated moment. `npm run check`; `npm run verify:crawl` (the
  route disappears from the crawl list).
- **Confidence**: high on the mechanism; the date is arithmetic on the retention window.
- **Notes**: The resolver itself is well-built (the FOR UPDATE lock story, C-115) - this is
  not a criticism, just a shim whose job finishes. Deleting early would 404 real old
  notification links, which is why this is dated rather than immediate.

### member-surfaces-06 - Collapse the three hoopoe empty-state components into one
- **Where**: `src/components/messages/messages-empty-hoopoe.tsx` (42 lines, mine),
  `src/components/mascot/moments/no-results-hoopoe.tsx` (50 lines),
  `src/components/mascot/moments/no-saved-hoopoe.tsx` (57 lines) - the latter two belong to
  the mascot territory; flagged here because my file is one of the three
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: jscpd: `no-results-hoopoe.tsx [19:12-32:8]` == `messages-empty-hoopoe.tsx
  [20:12-32:17]` (14 lines, 70 tokens), plus the same pairing against `no-saved-hoopoe.tsx`.
  Reading all three confirms the shell is byte-similar: `useHoopoe()` + `stageRef` +
  `useSoloHoopoe()` + `useMomentAutoplay(stageRef, play)` + the identical
  `<div ref={stageRef} aria-hidden className>` render. The only real content of each file is
  its `h.sequence(...)` choreography (5-8 lines) and a default size.
- **What to do**: Add to `src/components/mascot/moments/moment-hoopoe.tsx` (which already
  exports the two hooks) a `MomentHoopoe({ size, className, play }: { play: (h) => void })`
  component owning the shell. Each of the three becomes a ~8-line wrapper (or the two
  simple ones inline at their call sites and only `NoSavedHoopoe`, which takes a
  `bookmarkRef`, keeps a named wrapper). Move each file's "approved as designed on the
  idea board" comment to sit above its sequence, so the design provenance survives.
- **Saving**: ~70 lines across three files (of which ~30 in my territory)
- **Risk & gate**: low. `npm run check`; eyeball the empty state on `/messages` (sign in as
  Jerry with no threads is not needed - the component renders when the list is empty;
  a quick `npm run visual` covers the routes it watches).
- **Confidence**: high.
- **Notes**: Coordinate with the mascot/landing agent so this lands once, not twice. The
  `useSoloHoopoe` one-hoopoe-on-screen rule must stay inside the shared shell - it is the
  behaviour all three exist to respect.

### member-surfaces-07 - Replace the hand-rolled letter excerpts with `plainExcerpt` (and fix the "!alt" artifact they re-introduce)
- **Where**: `src/app/(main)/letters/page.tsx:39-45` (`excerpt()`),
  `src/components/posts/post-card.tsx:148-153` (`letterPlain`/`letterExcerpt` - feed
  territory, named for the merge)
- **Phase**: dedupe
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: `src/lib/utils.ts:616-628` `plainExcerpt` strips markdown AND, per its own
  comment, strips images entirely first because otherwise the link rule "leave[s] a stray
  '!' in front of the alt ('!banyan'), which read as a typo wherever a teaser quoted a post
  that opened with a photo". Both hand-rolled copies use only the second regex
  (`/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g`) without the image rule - so a letter that opens
  with an inline image renders "!banyan ..." in the letters index card and in the feed's
  compact letter card today, the exact artifact the shared helper was fixed for. The rail's
  `letters-module.tsx:83` already uses `plainExcerpt` correctly, so the same letter can
  excerpt differently in the rail vs the index.
- **What to do**: In `letters/page.tsx`, delete `excerpt()` and call
  `plainExcerpt(l.content, 240)` (the helper's grapheme-safe truncation is a strict
  improvement over `slice`). In `post-card.tsx`, delete the `letterPlain`/`letterExcerpt`
  pair and call `plainExcerpt(content, 200)`.
- **Saving**: ~12 lines, plus two latent rendering bugs gone
- **Risk & gate**: low. `npm run check`; write a letter starting with an image in dev and
  view `/letters` (or trust the unit surface: `plainExcerpt` behaviour is already the
  tested one). `npm run visual` for the feed card.
- **Confidence**: high.
- **Notes**: Cross-territory with feed-posts for the post-card half; the orchestrator should
  merge rather than double-assign.

### member-surfaces-08 - Replace the /donate page stub with a proxy redirect
- **Where**: `src/app/(main)/donate/page.tsx` (7 lines); the redirect belongs beside the
  /groups rule at `src/proxy.ts:192-194`
- **Phase**: dead (route-level)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous
- **Evidence**: The whole page is `redirect("/support")` with a comment: "Keep this redirect
  so old links never break." Floor question answered: yes, it is a 7-line stub a config-level
  redirect replaces. As a page under `(main)` it also sits behind auth, so a signed-out
  holder of an old /donate link bounces via /login first; a proxy redirect (the same
  mechanism `/groups/*` already uses: "send them somewhere real rather than to a 404")
  answers before auth and drops one route from the 92-route build.
- **What to do**: Add to `src/proxy.ts` next to the /groups block:
  `if (pathname === "/donate") return NextResponse.redirect(new URL("/support", request.url));`
  with a one-line comment (school-donation framing dropped; kept for old links). Delete
  `src/app/(main)/donate/page.tsx`. Do NOT use `next.config.ts` - another session has
  uncommitted WIP there, and the proxy is already this repo's home for legacy-path redirects.
- **Saving**: 7 lines + 1 route out of the production build (and its per-route manifest
  entry: route-js listed /donate at 23 shared chunks)
- **Risk & gate**: low. `npm run verify:crawl`; open `/donate` signed in and signed out,
  expect /support and /login-then-/support respectively. `src/proxy.ts` is
  security-adjacent: keep `security-regressions.test.mjs` green.
- **Confidence**: high.
- **Notes**: proxy.ts is a pinned-behaviour file (241 comment lines to 126 code, per the
  brief); the addition is three lines in the established pattern, not a rewrite.

### member-surfaces-09 - De-duplicate the byte-identical letters loading files
- **Where**: `src/app/(main)/letters/new/loading.tsx` and
  `src/app/(main)/letters/[id]/edit/loading.tsx` (18 lines each, identical to the byte,
  including the `NewLetterLoading` component name in the edit file)
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: jscpd: `[id]/edit/loading.tsx [1:1-18:2]` == `new/loading.tsx [1:1-18:2]`
  (18 lines, 99 tokens). Both mock the same LetterDesk sheet, correctly - the desk is the
  same component on both routes.
- **What to do**: Make `[id]/edit/loading.tsx` a one-line re-export:
  `export { default } from "../../new/loading";` (a loading file only needs a default
  export; Next resolves it normally). Alternatively move the skeleton to
  `src/components/letters/desk-loading.tsx` and re-export from both - not worth the third
  file; the re-export is enough.
- **Saving**: ~17 lines
- **Risk & gate**: low. `npm run check`; hard-navigate to `/letters/new` and an edit URL in
  dev and see the shimmer.
- **Confidence**: high.
- **Notes**: If the two desks ever diverge visually the re-export is trivially split again.

### member-surfaces-10 - One `readMinutes()` helper instead of four hand-rolled copies
- **Where**: `src/app/(main)/letters/page.tsx:35-37`,
  `src/app/(main)/letters/[id]/page.tsx:112-113`, `src/components/posts/post-card.tsx:154-157`
  (feed territory), `src/components/feed/rail/letters-module.tsx:61-64` (feed territory)
- **Phase**: dedupe
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Four shipped sites (plus two lab copies) each write
  `Math.max(1, Math.round(words / 200))` over `content.trim().split(/\s+/).filter(Boolean)`.
  The 200wpm constant lives in four places; a letter card and its reading page computing
  read time differently after a drift would be a visible inconsistency.
- **What to do**: Add `export function readMinutes(content: string): number` to
  `src/lib/utils.ts` (beside `plainExcerpt`, which findings 07 sends the same callers to),
  with the one-line 200wpm reasoning comment written once. Replace the four call sites.
- **Saving**: ~10 lines; one constant
- **Risk & gate**: low. `npm run check`.
- **Confidence**: high.
- **Notes**: Combine with finding 07 in one commit - same callers, same import line.

### member-surfaces-11 - Sweep the small dead/aliased exports (razorpayConfigured, SUBJECT_VALUES/AREA_VALUES, the setTheme alias)
- **Where**: `src/lib/razorpay.ts:42-44` (`razorpayConfigured`),
  `src/lib/collection.ts:40-41` (`SUBJECT_VALUES`, `AREA_VALUES` exports),
  `src/components/settings/theme-actions.ts:64-75` (`setThemePreference` alias of `setTheme`)
- **Phase**: dead
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: All three are knip lines I confirmed by grep. `razorpayConfigured`: zero
  references anywhere (src, scripts, e2e, tests) - delete the function. `SUBJECT_VALUES`:
  zero importers (validators.ts imports only `ERA_VALUES`); `AREA_VALUES` likewise - both
  became orphans when the 2026-07-18 rework made `area` free text and removed subject
  tagging from the form. `setTheme`/`setThemePreference`: both callers (`lights-on.tsx`,
  `dark-gauntlet.tsx`) import only `setThemePreference`; the alias comment itself says
  "collapse to one when the flow ships" and the flow shipped 2026-08-02.
- **What to do**: (1) Delete `razorpayConfigured` (function + its 1-line comment). (2) In
  `collection.ts`, delete the `SUBJECT_VALUES`/`AREA_VALUES` lines; keep `ERA_VALUES`
  (validators uses it) - note the `SUBJECTS`/`AREAS` arrays themselves stay for now because
  the label maps at lines 44-50 derive from them (finding 12 owns their fate). (3) In
  `theme-actions.ts`, rename `setTheme` to `setThemePreference`, delete the alias and its
  11-line comment; the callers' import already matches. `knip` also flags
  `CONTRIBUTION_STATUSES` and `canBecomePaid` in contribution-state.ts, but both are
  imported by `contribution-state.test.mjs`, which uses them to pin the state machine
  (`canBecomePaid("refunded") === false` is audit C-084/C-085 stated as an assertion) -
  keep those; they are the tested spec of the rule, listed under not-findings.
- **Saving**: ~22 lines, 3 knip warnings
- **Risk & gate**: low. `npm run check` (the test suite proves contribution-state untouched).
- **Confidence**: high.
- **Notes**: The theme-actions rename is behaviour-neutral: "use server" actions are
  addressed by export name at build time, and both callers already use the surviving name.

### member-surfaces-12 - Decide the legacy Collection taxonomy plumbing (subject/freeTags)
- **Where**: `src/lib/collection.ts:4-27, 44-50` (SUBJECTS/AREAS + label maps),
  `src/app/(main)/collection/actions.ts:60-63` (PhotoData carries `subject: string[]`,
  `freeTags: string[]`), `:89-92` (shape() splits them), `:232-237, 465-468` (writers pin
  `subject: ""`, `freeTags: null`), `src/lib/collection-intake.ts:147-150` (same),
  `src/app/(main)/collection/[id]/page.tsx:78-81, 117-136` (renders subject/area/freeTags
  chips)
- **Phase**: placeholder
- **Tier**: T2     **Class**: structural     **Decides**: owner (one database check turns it
  autonomous)
- **Evidence**: The 2026-07-18 rework removed subject tagging and the bird/species free-tag
  field from the upload form; every writer since stores `subject: ""` and `freeTags: null`
  (the comment at `actions.ts:231-233` says the columns are "kept as empty/null for older
  rows and any other Collection surface still reading them"). The only readers left are the
  detail page's chips and the search `OR` over `freeTags`
  (`buildCollectionWhere`, kept deliberately "so older bird-tagged photos stay findable").
  Whether any row actually has a non-empty `subject`/`freeTags` is a one-query question this
  audit cannot ask (read-only, no DB).
- **What to do**: At fix time run
  `SELECT count(*) FROM "Photo" WHERE subject <> '' OR "freeTags" IS NOT NULL;` (via the
  approved scripts/dev/run-sql.mjs path). If zero: drop the chips block from the detail
  page, `subject`/`freeTags` from `PhotoData`/`shape`/`includeFor` consumers, the `freeTags`
  arm of `buildCollectionWhere`, and `SUBJECTS`/`AREAS`/label maps from `collection.ts`
  (leaving ERAS + `eraFromYear` + `PHOTO_YEAR_MIN`); the schema columns can stay for a later
  migration pass, written to as "" / null. If nonzero: keep everything and record the row
  count as the reason (a not-finding for future audits).
- **Saving**: ~55-65 lines if the count is zero; 0 otherwise
- **Risk & gate**: medium (touches the gallery's data shape). `npm run check`; open
  `/collection` and a photo detail page; `npm run visual`.
- **Confidence**: medium - entirely contingent on the row count. The pre-launch database is
  young and the taxonomy was removed before public release, so zero is likely.
- **Notes**: Written as owner because it deletes a (vestigial) display feature; if the DB
  check comes back zero the owner call is trivial. This is the finding that makes 03's
  extracted `photoRowData` smaller still.

### member-surfaces-13 - Retire the letters' /groups branches (catchups already retired theirs)
- **Where**: `src/app/(main)/letters/[id]/page.tsx:120-124` (back link:
  `letter.groupId ? "/groups/<id>" : "/letters"`, label "Back to group"),
  `src/components/letters/letter-engagement.tsx:17,25,93,97` (the `groupId` prop, the
  moderation redirect, `shareHref`)
- **Phase**: dead (branch)
- **Tier**: T2     **Class**: structural     **Decides**: autonomous (with one DB check)
- **Evidence**: Groups were retired as a user-facing feature 2026-07-25
  (`src/proxy.ts:187-194`, which now redirects all `/groups/*` to `/catchups`). The rest of
  the app scrubbed its equivalents and says so in code:
  `catchups/[catchupId]/page.tsx:554` ("Was `/groups/${result.groupId}` -- groups have no
  user-facing page"), `post-card.tsx:238` ("could only ever have produced a 404 link"),
  `notification-links.ts:35` ("createPost now refuses a groupId"). The letters pages are the
  last shipped surface still minting `/groups/<id>` hrefs. Because createPost refuses
  groupId, no new letter can carry one; only a pre-2026-07-25 group letter could, and for
  such a row today's "Back to group" link lands the reader on /catchups with a misleading
  label, and the share button copies a redirecting URL.
- **What to do**: Check `SELECT count(*) FROM "Post" WHERE kind='letter' AND "groupId" IS NOT NULL;`
  at fix time. Expected zero (letters shipped after groups died): then hard-code the back
  link to `/letters`, drop the `groupId` prop from `LetterEngagement` (redirect to
  `/letters`, `shareHref = /letters/${postId}`), and remove the prop at the call site
  (`letters/[id]/page.tsx:214`). If nonzero, keep the row's readability but still point the
  chrome at `/letters` - the proxy redirect makes `/groups/<id>` a worse destination than
  the letters index either way.
- **Saving**: ~10 lines + one prop-drill; consistency with the three files that already
  document the rule
- **Risk & gate**: low. `npm run check`; open a letter and use the back link and share
  button.
- **Confidence**: high on the direction; the DB check only decides whether a comment about
  legacy rows is needed.
- **Notes**: The Post model's `groupId` column itself is feed/schema territory (catchups
  still use Group as a hidden membership container) - this finding touches only the letter
  surfaces' links.

### member-surfaces-14 - Correct the comments that state the abolished bird-pick model (and the fourteen-bird count)
- **Where**: `src/components/support/bird-picker.tsx:19-21` ("re-picking is allowed forever:
  the perk is standing, so there is nothing to meter") and `:130-133` ("the fourteen-bird
  plate on /support"); `src/app/(main)/support/page.tsx:24` ("everyone else sees the
  fourteen-bird plate")
- **Phase**: hygiene
- **Tier**: T1     **Class**: cheap     **Decides**: autonomous
- **Evidence**: Both claims are contradicted by the shipped code beside them.
  `support/actions.ts:232-239` (audit C-049) states the live rule in capitals: "ONE PICK PER
  CONTRIBUTION (owner, 2026-08-18) ... it is the comment that was wrong" - and
  bird-picker's own confirm bar says "Changing it again takes another contribution", so the
  file disagrees with itself. The plate is twelve birds, not fourteen:
  `plate-data.ts:3-8` ("Down from fourteen (owner, 2026-08-22)").
- **What to do**: Rewrite the three sentences: picker header's last paragraph to state the
  spend/regrant model (one pick per paid contribution, `birdPickedAt`), and
  "fourteen-bird" to "twelve-bird" in both files.
- **Saving**: 0 lines; prevents the C-049 class of bug (a session trusting the stale
  comment) from recurring
- **Risk & gate**: none beyond `npm run check` (comment-only).
- **Confidence**: high.
- **Notes**: This repo treats wrong comments as bugs (C-049's whole write-up is about one);
  these are the two I could find in the territory that assert the opposite of shipped
  behaviour.

### member-surfaces-15 - Fix the loading skeletons that mock retired pages
- **Where**: `src/app/(main)/dark-mode/loading.tsx` (28 lines, component named
  `SettingsLoading`, mocking "section-label bands and hairline field rows" of the retired
  /settings page); subtitle bars on pages whose subtitles were removed (owner, 2026-08-22):
  `letters/loading.tsx:6` (`h-4 w-80`), `collection/loading.tsx:6` (`h-4 w-96`),
  `messages/loading.tsx:6` (`h-4 w-80`)
- **Phase**: hygiene
- **Tier**: T2     **Class**: cheap     **Decides**: autonomous
- **Evidence**: `/dark-mode` renders a centred ceremony (`DarkGauntlet`, max-w-[560px],
  min-h-[70vh] flex centre) or the one-button `LightsOn`; its loading file mocks a settings
  form card with three sections of labelled field rows - a page that no longer exists
  (notification-links.ts:53-58 records "There is no `/settings` route ... the page was
  retired"). The three list pages ship `<PageHeader title>` with explicit "No subtitle
  (owner, 2026-08-22)" comments, but their skeletons still hold a subtitle bar, so every
  cold load shows a two-line header that collapses to one when the page lands - exactly the
  jump a skeleton exists to prevent.
- **What to do**: Replace dark-mode/loading.tsx with a small centred block (a kicker bar, a
  title bar, two body lines, in a max-w-[560px] min-h-[70vh] flex centre), renamed
  `DarkModeLoading`. Delete the three subtitle bars (and drop the enclosing `space-y-2`
  where it becomes single-child).
- **Saving**: ~12 lines net; three cold-load layout jumps
- **Risk & gate**: low. Hard-refresh each route in dev; `npm run visual` is not affected
  (skeletons are transient).
- **Confidence**: high.
- **Notes**: The other territory skeletons (letter reading page, photo page, thread page,
  support, notice) match their pages well - several carry audit M06 comments and were
  clearly built against the real geometry.

## Owner decisions

**The About page ships saying "indefinitely procrastinated."**
`src/app/(main)/about/page.tsx` is 19 lines: a header and, centred in 75vh of empty space,
the words "indefinitely procrastinated" in small muted text. It is a real sidebar
destination, and this is a pre-public-release audit. Three honest options: write the page
(even three short paragraphs - what this site is, who runs it, how to reach them - would
do); point the nav entry at `/guidelines` or drop it until the page exists; or keep the joke
deliberately (it is in the site's voice, and a member who clicks About gets a smile rather
than a lorem-ipsum). My recommendation: keep the route but write the three paragraphs; the
guidelines page's register ("the community talking") shows this takes an hour, and About is
the one page a cautious new alumnus reads before trusting the site with their details. If
the joke stays, it should be a decision on record, not a leftover.

**The legacy Collection taxonomy (finding 12).** Whether the subject/species chips on the
photo page and the freeTags search arm are display support for real old rows or plumbing for
rows that never existed is one SELECT away. If the count is zero I recommend the deletion;
if not, keep it and write the count down so the next audit does not re-open it.

**A dated cleanup (finding 05).** The /notice resolver finishes its job when the
notification retention window (1 year) has passed the 2026-07-24 migration. I recommend the
compiled plan carry a "after 2027-08-01" line so it is deleted on schedule rather than
rediscovered by an audit in 2028.

## Not-findings

- **The money path's comment density is the standard, not the bloat.**
  `support/actions.ts` (0.80 ratio), `razorpay.ts` (0.76), the webhook (0.72),
  `contribution-state.ts` - every heavy block carries an audit ID (C-084/C-085/C-086/C-087/
  C-088/C-151/M56-M60), an owner decision with a date, or a race explanation that would cost
  a session to re-derive. The comment-density tool led here; the brief's "a comment that
  carries a reason, a date, an owner quote or an audit ID is NOT bloat" rule disposes of it.
- **No Razorpay SDK is deliberate.** `razorpay.ts:3-6`: one authenticated POST and two HMACs;
  "the SDK would buy us nothing but a dependency sitting in the path of real money." Correct
  under the brief's library phase - the hand-rolled side is ~165 well-tested lines.
- **`CONTRIBUTION_STATUSES` and `canBecomePaid` look dead to knip but are the tested spec.**
  `contribution-state.test.mjs` imports both and asserts the C-084/C-085 transitions on
  them. Production code uses `PAYABLE_FROM` inline in Prisma wheres; the helper is the
  unit-testable statement of the same rule. Keep.
- **`contribution-state.test.mjs` / `notification-links.test.mjs` as "unused files"** is the
  known knip-config gap (brief section 3): they are node:test files the check runner
  discovers.
- **The letter desk does not fork the composer.** `letter-desk.tsx:87` renders
  `CreatePostForm defaultLetter immersive` - "extracted nothing, forked nothing, so the two
  can never drift." The charter's fear ("if letters/new re-implements it, say so") does not
  apply.
- **Collection filters are the shared primitives.** `collection-client.tsx:8-16` imports
  `FacetSelect, FacetSearchSelect, SortPill, ActiveFilterChips, ResultCount, FilterSheet`
  from `components/common/filters`. Letters has no facet code at all (a keyset-paged index).
  Floor question: no duplicate facet code exists in this territory.
- **/dark-mode is a member feature, not a leftover gauntlet.** Linked from the profile
  (letterhead-profile.tsx:1354), gated on the cookie with a documented reason
  (`lib/theme.ts` - dark is earned per device by design, C-138), and the 782-line
  gauntlet+nightfall+lights-on cluster is owner-scripted theatre ("the transition to dark
  mode has to be done, like, insanely well"). The asymmetric off-switch is the joke. Nothing
  to cut.
- **The policy pages should stay JSX, not become MDX.** Floor question answered no: the
  three documents are 421 lines sharing an 82-line typographic vocabulary (`_shared.tsx`).
  MDX would save perhaps 100 lines of `<P>`/`<Section>` wrappers at the price of a new
  dependency (`@next/mdx`), config in `next.config.ts` (someone's WIP), and a second
  authoring format in the repo. The current setup is dependency-free and one file per
  document.
- **The two contribute paths are both live.** The FormData `contributePhoto` is the
  presign-unavailable fallback (local dev without R2, CORS miss) that
  `contribute-dialog.tsx:126-166` documents and uses; not dead code (finding 03 dedupes
  their shared halves instead).
- **`MIN_RUPEES` duplicated client-side is deliberate** (`support-contribute.tsx:47-50`:
  "Duplicated deliberately ... If they ever disagree, the server wins").
- **The account-export route's hand-written JSON streaming** is the M48 fix (bounded memory
  on a legally-must-be-complete export), not over-engineering.
- **Empty states (floor question).** Four hand-rolled empty states in the territory:
  Collection truly-empty and no-matches cards (`collection-client.tsx:384-421`), the letters
  index card (`letters/page.tsx:156-165`), the messages hoopoe panel
  (`messages/page.tsx:129-135`). Each is 10-20 lines with genuinely different content (CTA
  button / chips + two actions / icon + copy / mascot). A shared `EmptyState` primitive
  would save ~20 lines at the cost of a fifth prop-shaped API; I judged it not worth the
  coupling and record it here so the count is on file. (The hoopoe *shells* are a different
  story - finding 06.)

## For other lenses

- `src/app/(main)/admin/messages/[id]/page.tsx:58-81` duplicates
  `messages/[id]/page.tsx:43-70` (jscpd, 24 lines): the thread message-window select +
  take-one-extra + reverse logic. A `loadThreadWindow(threadId, limit)` in
  `lib/admin-threads-server.ts` would serve both sides. (admin-analytics)
- `src/components/posts/post-card.tsx:148-157`: the letter excerpt + read-time hand-rolls
  covered by my findings 07/10 - merge, don't double-assign. (feed-posts)
- `src/app/lab/support-ideas/_shared.tsx:39-54` exports `PLEDGE, SEGMENTS, MONTHLY,
  BUILD_COST, BUILD_RECOVERED` and `src/app/lab/support/_bars.tsx:15` `BUILD_COST` - all
  knip-dead inside lab rooms; also `costs-card.tsx` now owns the live SEGMENTS numbers, so
  the lab copies are frozen history (fine) but their unused exports could drop `export`.
  (lab lens)
- `src/components/layout/notification-bell.tsx` (481 lines, "use client") is the
  notifications UI surface; my territory covered only its actions. (layout/shell lens)
- `transition-[colors,transform]` appears in 14 shipped files (5 of them mine:
  contribute-dialog:227, collection-client:342, thread-list:47, conversation:105,
  message-composer) - `colors` is not a CSS property, so the colour half of these
  transitions silently never animates. `letters/page.tsx:178`'s comment documents the trap
  and spells out `border-color` instead. A repo-wide sweep to real property names is a
  one-session UI fix. (design-protocol / bundle lens)
- Both `collection-client` and `directory-client` fetch their first page client-side after
  mount (server component passes only filters/flags), so every cold visit pays skeleton +
  action round trip. Server-rendering page 0 into props is a real perceived-latency lever
  but changes the established idiom on two surfaces at once. (bundle/perf lens)
- `(policies)/privacy/page.tsx:144-153` hard-codes the retention windows (1 year
  notifications, 10 years contributions, 60-day deletion) that `src/lib/retention.ts`
  enforces - a legal document must be prose, but a drift check (a rule-test asserting the
  numbers match `KEEP_DAYS`) would be in this repo's style. (lib-core-config)
- `scripts/README.md` will need its `gen-support-qr.mjs` row removed with my finding 02.
  (scripts lens, coordination only)

## Metrics

- Lines read: ~7,900 code lines across 61 files (territory total per cloc: app surfaces
  ~3,700; components ~4,700 incl. settings 1,531 and support 1,272; lib 686; API routes 748).
- Comment-heaviest in territory (comment-density.txt): `wood.tsx` 1.15 (127/110, parked by
  owner - intentional), `support/actions.ts` 0.80, `collection-intake.ts` 0.79,
  `razorpay.ts` 0.76, webhook route 0.72 - all verified reason-carrying, none proposed for
  trimming.
- Biggest files: `collection/actions.ts` 753, `dark-gauntlet.tsx` 504,
  `collection-client.tsx` 466, `razorpay/webhook/route.ts` 421, `support-contribute.tsx` 415.
- Dead code found: 118 lines (updateUserProfile) + 147 lines (QR script) + ~22 lines (small
  exports) + 7 lines (/donate) = ~294 lines, plus 6 files, ~199KB static assets, 2
  devDependencies, and ~120 deferred lines (/notice, dated 2027-08).
- Dedupe found: ~55-70 (photo intake) + ~70 (hoopoe trio, ~30 in-territory) + ~17 (loading
  twins) + ~12 (excerpts) + ~10 (readMinutes) + ~10 (letters /groups branches) ≈ 175 lines.
- Honest total if every finding lands: ~430 lines now (plus ~120 dated), 1 route out of the
  build, 2 deps, 199KB of deployed assets.

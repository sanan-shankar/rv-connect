# C7a — fresh eyes on the cold files
Agent: C7a · Started: 2026-10-24 · Model: Opus 5.5 (1M)
Charter: cold-files.md section A — the 72 files in the Glasswing top 250 that every report and
verdict mentions at most once. Each read at HEAD as a finder would, cold: wrong behaviour a member
will hit, data loss, races, stale state, effects that leak or fire twice, inputs that break it,
comments that state a rule the code breaks. New defects only (deduped against candidates.md, every
report and verdict). HEAD read: 36ed27d3 (at start).

## File board (read / finding ids / clean)
- `src/components/directory/alumni-map.tsx` — read; clean (unmapped-bucket note, Minor notes)
- `src/components/collection/photo-river.tsx` — read; C7a-01
- `src/components/support/costs-card.tsx` — read; clean (its one defect is T8a-18)
- `src/components/settings/dark-gauntlet.tsx` — read; clean (the IST Wordle date is L3 row 48)
- `src/components/mascot/sidebar-hoopoe.tsx` — read; clean
- `src/app/(auth)/verify-email/verify-client.tsx` — read; clean
- `src/components/mascot/moments/not-found-stage.tsx` — read; clean
- `src/components/common/pinch-zoom.ts` — read; clean
- `src/components/landing/ambient-leaves.tsx` — read; clean, and DORMANT (only `showcase.tsx`, which nothing live mounts)
- `src/components/posts/use-composer-uploads.ts` — read; clean
- `src/app/(main)/catchups/(index)/page.tsx` — read; clean (cover photos of blocked authors are T2a-13's class)
- `src/components/landing/footer-hoopoe.tsx` — read; DORMANT (L7 row 125); its Strict-Mode `mountedRef` would freeze it on localhost if it is ever re-mounted
- `src/components/common/location-picker.tsx` — read; clean
- `src/components/auth/trivia-gate.tsx` — read; clean (also on C7b's list B)
- `src/components/collection/photo-scrubber.tsx` — read; clean
- `src/components/guide/guide-door.tsx` — read; clean
- `src/components/collection/year-rail.tsx` — read; clean
- `src/components/common/photo-aim.tsx` — read; C7a-02
- `src/components/profile/pen.tsx` — read; C7a-03
- `src/components/mascot/moments/logo-peek.tsx` — read; clean
- `src/lib/image-record.ts` — read; clean
- `src/components/mascot/moments/logo-easter-egg-hoopoe.tsx` — read; clean
- `src/components/ui/sheet.tsx` — read; clean (one rare drag note under Minor notes)
- `scripts/dev/sweep-stranded-originals.mjs` — read; clean
- `src/app/(main)/collection/[id]/page.tsx` — read; clean
- `src/components/admin/people/people-list.tsx` — read; clean
- `src/components/landing/perching-birds.tsx` — read; DORMANT (as ambient-leaves)
- `src/components/onboarding/onboarding-flow.tsx` — read; clean
- `src/components/settings/avatar-crop-dialog.tsx` — read; clean
- `src/app/(main)/admin/content/page.tsx` — read; clean
- `src/components/common/photo-carousel.tsx` — read; clean
- `src/components/catchups/edition/navigator.tsx` — read; C7a-04
- `src/components/common/bird-avatar-v2.tsx` — read: helpers, exported API, override/reservation resolution, glyph component in full; the ~2,400 lines of per-species SVG drawing skimmed (static paths, no logic); clean
- `src/components/mascot/hoopoe-playground.tsx` — read; its one defect is T9-05 (the per-render PeekABoo effect is L7/T9 noted)
- `src/components/mascot/moments/moment-hoopoe.tsx` — read; clean
- `src/components/profile/profile-author-feed.tsx` — read; clean
- `src/components/analytics/posthog-provider.tsx` — read; clean (C-198/C-165/C-120 are the provider's known rows)
- `src/components/common/attach-image-dialog.tsx` — read; clean
- `src/components/letters/letter-menu.tsx` — read; clean
- `src/app/(main)/welcome/page.tsx` — read; clean (one stale comment, Minor notes)
- `scripts/qa/_shoot.mjs` — read; clean
- `scripts/qa/map-cluster-verify.mjs` — read; clean
- `src/app/(main)/admin/people/(index)/page.tsx` — read; clean
- `src/app/(main)/admin/review/page.tsx` — read; clean (bugs.md #21 is the room's known item)
- `src/components/catchups/index/archived-row.tsx` — read; clean
- `src/components/common/use-user-search.ts` — read; clean
- `src/components/feed/rail/letters-module.tsx` — read; clean
- `src/components/mascot/hoopoe-warmup.tsx` — read; clean (one inaccurate comment, Minor notes)
- `src/components/mascot/use-hoopoe-life.ts` — read; clean
- `src/components/profile/houses-chain.tsx` — read; clean
- `src/components/profile/saved-posts-feed.tsx` — read; clean (one cosmetic resize note, Minor notes)
- `src/components/support/bird-plate.tsx` — read; clean
- `scripts/qa/lab-audit.mjs` — read; clean
- `src/app/(auth)/verify-email/page.tsx` — read; clean
- `src/components/admin/analytics/stat.tsx` — read; clean
- `src/components/collection/photo-questions.tsx` — read; clean
- `src/components/common/use-deferred-autofocus.ts` — read; clean
- `src/components/directory/directory-grid.tsx` — read; clean (one rare stranding note, Minor notes)
- `src/components/guide/guide-overlay.tsx` — read; clean
- `src/components/mascot/moments/celebration-detector.tsx` — read; clean (one guard note, Minor notes)
- `src/components/mascot/moments/celebration-signals.tsx` — read; clean
- `src/lib/geocode.ts` — read; clean
- `scripts/dev/import-places.mjs` — read; clean (scratch-at-root note, Minor notes)
- `scripts/dev/tag-photos-pick.mjs` — read; clean
- `src/app/(main)/admin/audit/page.tsx` — read; clean
- `src/app/lab/catchups/sketches/_reader.tsx` — skimmed (lab room, out of scope by charter: imports, effects and data paths checked — it reads fixtures only, no action, no fetch)
- `src/components/catchups/index/catchup-shelf-view.tsx` — read; clean (silent Undo failure, Minor notes)
- `src/components/common/use-closing-dialog.ts` — read; clean
- `src/components/guide/chapters/catchups.tsx` — read; clean (every number checked against catchups-core.ts:110-113)
- `src/components/mascot/moments/fly-away-hoopoe.tsx` — read; clean
- `src/lib/place-input.ts` — read; clean
- `scripts/dev/.anon-cleanup/redate.mjs` — read; clean for a spent one-off (undo-order note, Minor notes)

## Findings

### C7a-01 — After a member edits a photograph's caption or date from the viewer, its tile in the river keeps the old date on hover and the old caption as its accessible name until a reload: the year's memo comparator says nothing changed
- Severity: Low
- Confidence: certain (mechanism read end to end); would change my mind: a path that re-keys or re-renders the band after `onSaved` — none found.
- Where: `src/components/collection/photo-river.tsx:667-675` (the comment), `:764-773` (the comparator); `src/components/collection/collection-client.tsx:1351-1356` (`patch` = `prev.map(p => p.id === id ? change(p) : p)`), `:1751-1753` (`onSaved` → `patch`); tile fields at `photo-river.tsx:103` (`aria-label={photo.caption ?? …}`), `:125` (`alt`), `:241-243` (`photo.takenShort` in the hover scrim).
- Taxonomy: 6b (memo staleness), comment-lies
- Expected: the comment on `BandSection` rests its comparator on "Photographs only ever arrive at one END or the other (`appendUnseen`, `prependUnseen`) … so a band whose id, count and first and last photographs are unchanged has not changed."
- Actual: a third writer exists. `EditPhotoDialog`'s `onSaved` patches the photograph IN PLACE (`patch(editTarget.list, editTarget.photo.id, (p) => ({ ...p, ...fields }))`, fields = caption, subject, era, photoYear, photoMonth, datePrecision, takenLabel, takenShort). For any photograph that is not the first or last of its year (and in Newest/Loved order, where the whole river is ONE band `"all"`, for any photograph but the two ends of the entire river), `a.band.id`, `length`, `photos[0]` and `photos[last]` are all unchanged, so `BandSection` skips the render and the memoised `Tile` keeps the old `photo` object. The hover scrim still prints the old `takenShort`; `aria-label`/`alt` keep the old caption. The server refresh does not rescue it: `editPhoto`'s re-render brings an index (`[ratio, key]` per photo) that is `sameIndex` with the last one for every caption edit, and for a date edit that keeps the year's sequence of shapes (the index is `[ratio, year]` per photograph, `river-geometry.ts:135-175`; a month change that reorders photographs of different shapes does change it and is refetched whole), so the `lastIndex` effect (`collection-client.tsx:553-576`) returns early and `held` is untouched; in Newest and Most loved there are no boxes, so that effect returns at `boxesRef.current.length === 0` for every edit, and the seed re-seed (`collection-client.tsx:240-251`) only fires when the server's page holds a photograph the river lacks.
- Why: comparator `a.band.photos[0] === b.band.photos[0] && a.band.photos[a.band.photos.length - 1] === b.band.photos[b.band.photos.length - 1]` cannot see a middle element being replaced. The viewer itself is right (it reads `photos`, which is updated), so the member sees the new date while the viewer is open and the old one on the tile after closing it.
- Proof: argue-only from code (needs an editable photograph, i.e. a signed-in owner's own upload, and this round may not sign in). Orchestrator, with Jerry and a photograph Jerry contributed that sits mid-year: open it, edit its month, save, close the viewer, hover the tile — the old month shows; reload — the new one.
- Fix direction: make the comparator honest — compare the photos arrays element-wise by reference (cheap: a band is hundreds at most, and the point of the memo was to avoid rendering, not to avoid a loop), or bump a per-band revision when `patch` writes into it. Then correct the comment.
- Gate: a unit test on the comparator (exported) asserting a band with a replaced middle photograph is "changed".
- Known-related: T4b read this file and verified its observers (T4b "Every listener and observer…"); no report or verdict names the comparator. Not T4b-01 (index shift on band landing) nor T4a-02 (600-row cut).

### C7a-02 — The crop dialog can show a frame that is not the one saved: it seeds its position once per mount, so a cancelled drag, or a resumed draft whose measurements arrive after the photograph, reopens on a frame the post will not draw — and "Use this" closes as if it saved when the save failed
- Severity: Low
- Confidence: certain for the mechanism (one `useState` initialiser, no reset on open; the failure branch closes the dialog); likely for the resumed-draft ordering (depends on the image loading before the `myImageFacts` round trip, which a warm cache makes the usual case). Would change my mind: a remount of `AimDialog` per open — none; it is rendered whenever `shape` is known, open or not (`photo-aim.tsx:167`).
- Where: `src/components/common/photo-aim.tsx:115-117` (`shape` seeded from `facts` only at mount), `:124-135` (measured from the file when `facts` is absent), `:138-144` (`known.focalY = facts?.focalY ?? 0.5`), `:167` (`<AimDialog>` always mounted), `:184-185` (`const start = shownAim(facts); const [aim, setAim] = useState(start);`), `:224-233` (`save`: `if (res.error) console.error(...)` then `onOpenChange(false)` either way); callers `src/components/posts/create-post-form.tsx:866-870` and `src/components/catchups/answer/photo-attachments.tsx:118-122`; the late facts for a resumed draft at `src/components/posts/use-composer-uploads.ts:126-139` (`myImageFacts(resumed)` in a mount effect).
- Taxonomy: 6b (state seeded once, stale), silent-failure, comment-lies
- Expected: the module's promise, "The frame is the REAL one … What you drag is what the feed shows", and `shownAim`'s: "The dialog opens on what the card SHOWS, or its first frame would be a photograph nobody has ever seen." `use-composer-uploads.ts:121-125` restates it for resumed drafts. `save`'s comment: the failure "is logged where a developer will see it".
- Actual, three ways:
  1. Drag the photograph, then close with Escape, the backdrop or the X (Base UI calls `onOpenChange(false)`; nothing resets `aim`). Reopen: the dialog shows the abandoned drag as the current frame, under "This is the shape it takes in a post". A member who checks and closes again leaves the post on the machine's crop while believing it is on theirs.
  2. A resumed draft (the letters desk resumes drafts "as a matter of course", `image-aim.ts` docblock): the thumbnail's bytes are usually already cached, so `new Image()` resolves before the `myImageFacts` server action returns; `AimDialog` mounts with `focalY` 0.5 and seeds `aim` from it; the real facts then arrive and change `start` but not `aim`. The first open shows the centre crop while the card will draw the stored aim — exactly the "first frame nobody has ever seen" the code was written to prevent.
  3. `aimImage` fails (DB hiccup, or P2025 for a URL with no `Image` row): the dialog closes exactly as on success. `console.error` in a member's browser is seen by nobody (Sentry is server-only), so the comment's "logged where a developer will see it" is false in production. The member's chosen crop is silently not applied.
- Why: `useState(start)` runs once for the life of the always-mounted `AimDialog`; no effect or `onOpenChange` handler re-seeds `aim` from `start` on open. `save` has no branch that keeps the dialog open on `res.error`.
- Proof: argue-only from code (needs a signed-in composer). Orchestrator, as Jerry, in the feed composer: add a tall photograph, open the crop, drag, press Escape, reopen — the dragged frame is shown; reload with the draft saved, open the crop on the resumed photograph before anything else — compare with the card after posting.
- Fix direction: seed `aim` from `start` every time the dialog opens (in the `onClick` that opens it, or key `AimDialog` on an open counter), and after a successful save hand the new aim back to the caller so `facts` (and `start`) carry it; on `res.error` keep the dialog open with an inline sentence instead of closing.
- Gate: a source pin that `photo-aim.tsx` resets `aim` on open, plus one that `save` does not call `onOpenChange(false)` on the error branch.
- Known-related: L1 (`photo-aim.tsx:224-233` clean for double-submit) and L12 (ownership) read the server half; T3-13's class (the press never animates, `:160`) is a different defect. No report names the seeding or the silent close.

### C7a-03 — On the profile, "That did not save" lasts only until the next field saves: fix "the other year" as the error asks, see "Saved", and the year that was refused is still on screen and was never written
- Severity: Medium
- Confidence: certain (read end to end: the save mark, the commit handler, the action's refusal, the form's one-time seed). Would change my mind: a path that re-commits a refused field or re-seeds `form` after a refresh — none; `form` is a `useState` initialiser (`letterhead-profile.tsx:378-390`) and nothing calls `setForm` from props.
- Where: `src/components/profile/pen.tsx:396-424` (`useAutoSave.run`: `setMessage(null)` and `setState("saving")` at the START of every save, `if (inFlight.current > 0) return;` before the error branch, then `setState("saved")`); `:415-420` (the comment "An error stays put. It is the one state that must not time itself out, because the value on screen is not the value on file"); `src/components/profile/letterhead-profile.tsx:442-458` (`commitField`: stamps `saved.current[key]` only on success, never retries), `:378-390` (`form` seeded once); `src/components/profile/profile-actions.ts:179-198` (the cross-field year check, "Refused rather than corrected … The message names the other field so it is clear which one to fix first"); `src/lib/batch-year.ts:89-99` (every clash message ends "Check the other year too.").
- Taxonomy: 6a (error state overwritten), 6c(3) (a later result clobbers an earlier one's state), 6k (the edit is lost while the screen says saved), comment-lies
- Expected: an unsaved value never sits on screen under a "Saved" mark; the refusal "stays put" until that value is on file.
- Actual: a member whose sheet says joined 1980, left 1987 (batch 1995) and who means 1988–1995 types the joined year first, blurs, and is refused: "You cannot have left before you joined. Check the other year too." They do exactly that: "left" goes to 1995, which passes every clash against the stored rows (joined 1980, batch 1995), saves, and the mark reads "Saved" with a tick, then goes quiet. The joined year still reads 1988 on the sheet — `form` is local and never re-seeded — but the database holds 1980, and nothing ever re-sends it (`saved.current.yearJoined` was never stamped, so only a fresh blur of that field would). They leave; next visit says 1980. The same happens after ANY refused field (a one-letter name, an over-long About, an admission number in the wrong shape, a dropped connection) followed by any other field's save, and — before the member has even seen the refusal — whenever two saves overlap in flight (a slow connection, or the places picker, which commits on every change): the refused one's `failed` is dropped by the `inFlight > 0` early return and the later success sets "saved", so the error is never shown at all.
- Why: the error is stored in shared, last-writer state (`state`/`message`), not per field. `run` clears it unconditionally when the next save begins (`setMessage(null)`), and only the LAST save to finish decides what the mark says. The design's own repair instruction ("Check the other year too") therefore guarantees the stranding on the cross-field path.
- Proof: argue-only from code (a profile edit needs a signed-in account). Orchestrator, as Jerry on his own letterhead: Edit, set "joined" to a year after "left", blur (error shows), set "left" to a later year, blur ("Saved"), reload — "joined" is back to its old value. Read-only half: `SELECT "yearJoined","yearLeft" FROM "User" WHERE email = 'sanan.shankar@gmail.com'` before and after.
- Fix direction: keep failures per field (a `Map<field, message>` in `useAutoSave` or in the letterhead) and show "Not saved" until THAT field saves; on a cross-field refusal, re-commit the refused field automatically after the other year saves (or validate the pair client-side and save both together); never let a later success clear an unrelated failure. Then make the comment true.
- Gate: a unit test on `useAutoSave` (or a pure reducer extracted from it): fail(A) then succeed(B) leaves A's failure visible; and a source pin that `commitField` re-sends a field whose last save was refused once its clash partner saves.
- Known-related: C-045 (the queue that orders these saves — this is the state AROUND the queue, which C-045 did not touch); audit Low 96 (the cross-field refusal itself, which is right); T6's chaos row says the pen "KEEPS the typed value on screen … so nothing is lost until a reload" — true, and that is the failure: the screen keeps it, the file does not, and the mark says the opposite. L1 marked the profile save path clean for ordering only. T5-06 is the expired-session sentence, a separate trigger of the same stranding.

### C7a-04 — On a small phone the Edition's question list runs off the bottom of the screen and its last questions cannot be picked: the panel's cap is TALLER on a phone than on a laptop, the inverse of what its comment says
- Severity: Low
- Confidence: certain for the inversion (one class string); likely for the consequence on phones whose visible viewport is under ~660px (iPhone SE/mini class, small Android, any phone in landscape below md). Would change my mind: a page-level scroll that can bring the panel's foot into view — there is none, the instrument is `sticky top-14 h-0` (`reader.tsx:532-543`).
- Where: `src/components/catchups/edition/navigator.tsx:448-456` — comment "A cap, so forty questions scroll inside the panel instead of off the screen. Shorter on a phone, where the panel hangs from the top of the window rather than from a card 16px down", code `max-h-[560px] overflow-y-auto py-1.5 md:max-h-[480px]` (560 below md, 480 at md and up); `src/components/catchups/edition/reader.tsx:532-543` (the strip and panel are a sticky, zero-height overlay at `top-14`), `:607-633` (the panel under the strip).
- Taxonomy: comment-lies, 6h (small-viewport boundary), mobile
- Expected: a cap that keeps the list on screen, shorter on a phone, as the comment says.
- Actual: on a phone the panel may be 560px tall and hangs below the 56px bar and the ~44px strip, so its foot sits at ~660px. Mobile Safari on a 667pt-tall phone shows ~550px of page with its toolbars, a 360x640 Android ~560px: the bottom ~100px of the panel's own scroll box is below the screen, and scrolling INSIDE the panel cannot bring it up (the box is the clipped thing, not its content). The largest live Edition has 11 accepted questions (read-only count today), which at the panel's 2-3 line rows overflows 560px — so the last question or two are under the screen edge with no way to tap them from the list. The member can still scroll the page itself, so nothing is lost, only the navigator's promise.
- Why: the two arbitrary values are the wrong way round for the comment's reasoning, and both are fixed pixels rather than a share of the viewport.
- Proof: read-only; or in a browser at 375x548 (no sign-in needed only if a public Edition exists — otherwise as Jerry): open an Edition with 8+ questions, open the strip, scroll the list to its end; the last row is below the viewport.
- Fix direction: cap by the viewport, e.g. `max-h-[calc(100svh-56px-44px-env(safe-area-inset-bottom)-16px)]` on a phone and the laptop's equivalent from md, or simply swap the two numbers and add the svh ceiling; then make the comment say what the code does.
- Gate: a source pin in the reader's test that the panel's phone cap is viewport-relative (or ≤ the md cap).
- Known-related: T3 read the reader in part (`reader.tsx:131-144, 155-210, 300-480, 520-560`) and its F18/F41 clamps are separate; no report names this cap.

## Minor notes (below the bar for a finding: real, but cosmetic, rare or self-healing)

Recorded so the next reader does not re-derive them; none is counted in the round's verdict.

- `src/components/directory/directory-grid.tsx:177-192, 243-253` — the out-wave can strand cards: if `people` changes A→B and then back to exactly A before the exit timer fires (~120-175ms), the second run finds `changed.length === 0` and returns, the timer was cleared by the cleanup, and the slots wave B faded keep motion's committed final style (`opacity: 0`, NativeAnimation's `onfinish` → `setStyle`, `node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs:35-50`). `dirty` is only cleared on the next `shown` commit, so they stay invisible until the next filter change. Needs two server lists to land inside one exit window (Next normally supersedes the first navigation), so rare. Same function: a new `people` array with the same ids in the same order never reaches `shown`, so a refreshed field on an unchanged slot (a new verified mark, a retagged profession) waits for the next real change.
- `src/components/profile/saved-posts-feed.tsx:51-65` with `:168-203` — `useContainerColumns` observes whichever `ref` element exists on the FIRST effect run (the skeleton, or the empty card when `expectedCount` is 0) and never re-binds when the list replaces it, so `cols` is frozen at the width measured during loading: narrowing a laptop window or rotating a tablet afterwards keeps two columns (or one). Cosmetic.
- `src/components/mascot/moments/celebration-detector.tsx:132-163` — when the first queued celebration finishes, `canRender` is still `true`, so the next one mounts in the same render; the effect's poll then sees that bird's own `.hoopoe-mascot`, retries for ~30s and changes nothing. The one-hoopoe check is skipped for every queued celebration after the first, and its comment ("Re-arms whenever a new item reaches the head of the queue") holds for the poll only. Two queued celebrations in one visit are rare; another bird being up at that moment rarer.
- `src/components/catchups/index/catchup-shelf-view.tsx:150-159` — the toast's Undo ignores `setCatchupArchived`'s result; a refused undo (rate limit, demo) shows nothing and the card stays archived. Recoverable from the Archived row, whose Put back does toast its error (`archived-row.tsx:95-99`).
- `src/components/ui/sheet.tsx:164-239` — `useSwipeDownToClose` re-binds whenever `onClose` changes identity (callers `people-door.tsx:325` and `house-chain-editor.tsx:297` pass inline arrows), and a re-bind mid-drag drops `dragging` without resetting the inline `transform`, leaving the sheet displaced by the drag distance until the next drag. Needs a parent render during a touch drag.
- `src/components/directory/alumni-map.tsx:763-772` with `src/app/(main)/directory/page.tsx:134` — the "Not yet on the map" sheet lists at most 12 people (PIN_PEOPLE_CAP) under a title counting all of them, with no "See all" (deliberately, `alumni-map.tsx:911-916`) and no sentence saying the list is cut; the comment's "says the number in words instead (below)" refers to nothing below. Two such members live today (T6).
- `src/components/mascot/hoopoe-warmup.tsx:31-38` — "anotherHoopoeOnScreen() is only ever read at specific, one-shot trigger moments … never polled continuously" is no longer true (SidebarHoopoe retries every 8s, CelebrationDetector every 3s); harmless where the warmup mounts (login, signup, landing), where neither runs.
- `src/app/(main)/welcome/page.tsx:62-65` — "admissionNumber is only ever set via the onboarding 'register' step or /settings": the settings form is gone; the profile pen sets it (`letterhead-profile.tsx:909`). The guard's logic is unaffected.
- `scripts/dev/import-places.mjs:32` — the scratch folder is `process.cwd()/.geonames-tmp`, i.e. the repo ROOT when run from there, against CLAUDE.md's closed-root rule ("its working folder BESIDE it, never above it"); deleted in `finally`, so only a killed run leaves it.
- `scripts/dev/.anon-cleanup/redate.mjs:114-142` — the undo file is written only after every UPDATE has run, so a failure mid-loop (the per-row anchor check throws) leaves earlier rows changed with no undo on disk. A spent one-off whose dry run now fails on the first missing anchor before `--apply` could matter; the hand-run-passes protocol writes the undo first.
- `src/components/common/photo-carousel.tsx:303-312` — a second arrow press inside one slide's 460ms tween re-targets the slide `at` still names (it only advances past the half-way point), so a quick double press moves one photograph, not two.
- `src/lib/place-input.ts:175-190` — a confirmed `placeId` keeps the client's own `label`, `city`, `lat` and `lng` unless the alias table rewrites it, so a hand-made request can file a real gazetteer id under any name and pin; only the member's own row is affected.
- `src/app/(main)/admin/audit/page.tsx:27-46` — the three `razorpay.*` action codes written by the webhook (`contribution_reversed`, `dispute_resolved`, `webhook_rejected`) have no human label and print raw.

## Verified clean
- **Memo comparators in the Collection river, apart from C7a-01** — `photo-river.tsx:274-282` (`Tile` compares the photo by reference, so any rebuilt photo re-renders it) and the band key (`bandsOf`, `:304-334`) stays unique and stable across head and foot pages; every listener, observer and rAF in the river cleans up (`:422-469`, `:588-602`).
- **The map's zoom ceiling can never sit under its opening view** — `maxUsefulZoom` floors at `ZOOM_FLOOR = 12` (`map-cluster.ts:81, 280-289`) against `DEFAULT_K = 1.133` (`alumni-map.tsx:170`), so the clamp effect (`:470-477`) cannot fight the reset button; the d3 transform is re-seeded on the full-screen swap (`:453-458`); a failed atlas draws pins only (`:301-321`); names stay locked below Stage 1 (`:874-878`, the page passes no people).
- **Composer uploads cannot strand the Post button** — a failed upload removes its thumbnail and revokes its blob (`use-composer-uploads.ts:225-237`), so `uploading` always comes back down; blob previews are revoked on unmount and after a post (`:106-111, 259-262`); a removal mid-upload drops the late url by matching on the blob key (`:213-224`).
- **Confirmation landing** — the token is burned and `emailVerified` written in one transaction, and a lost race reads the row fresh (`email-actions.ts:193-212`); `alreadyVerified` comes from the DB on every session read (`auth.ts:428`); Resend can never strand its button (`verify-client.tsx:110-123`). The repeated-`token` crash is L6-07.
- **Dark gauntlet** — every listener, interval and timeout of the sleep trial is removed on unmount (`dark-gauntlet.tsx:488-502`); the theme persists only on "Keep it" (`:109-116`), as T6 recorded. The IST Wordle date is L3 row 48.
- **Location picker** — stale place searches are dropped by request id and aborted (`location-picker.tsx:154-179`); a failed search is told apart from "not in our list" (`:131-139, 391-393`); multi-mode never lets an echoed label stick (`:219-244`).
- **Trivia gate (client half)** — the answer never ships (`trivia-gate.tsx:35-37, 80-86`); `checking` guards a double submit; the server logs at most `ANSWER_MAX` characters and only under the hourly cap (`trivia-log.ts:102-120`).
- **Scrubber and rail** — the scrubber seeks on release only (`photo-scrubber.tsx:307-315`) and survives a refused pointer capture (`:293-297`); the year rail lights exactly one row (`year-rail.tsx:565-572`) and re-measures on the row count (`:152-162`).
- **Pinch zoom** — the wheel listener is native, non-passive and removed with the viewer (`pinch-zoom.ts:480-490`); a pending single tap cannot outlive the viewer (`:494-499`); pans are clamped continuously (`:375-381`).
- **Bottom sheet and side sheet** — swipe listeners are removed with the popup (`sheet.tsx:228-237`); the inline transition names `translate` so Base UI's exit still runs (`:146`).
- **Admin pages read** — each re-checks `requireAdminPage()` itself (`admin/people/(index)/page.tsx:29`, `review/page.tsx:32`, `content/page.tsx:30`, `audit/page.tsx:52`); the people list guards a double Verify with an in-flight set (`people-list.tsx:95-108`) and its Show more always re-enables (`:75-93`); the list is keyed on the filters so paging resets (`page.tsx:42-45`).
- **Avatar crop** — the bitmap is closed and the object URL revoked on file change or unmount (`avatar-crop-dialog.tsx:168-175`); EXIF orientation is baked before the canvas (`:153`); dismissal is ignored while the crop uploads (`:269-273`); undecodable files fall back (`:165-167, 230-248`).
- **Letter menu** — Delete pushes to /letters and refreshes the router cache (`letter-menu.tsx:109-119`); a published letter's edit dialog remounts with the refreshed words (`:210-224`); an emptied title is written as null (`feed/actions.ts:613, 735`).
- **Catch-ups shelf** — the optimistic hide is dropped the moment the server's list changes (`catchup-shelf-view.tsx:130-135`), and `setCatchupArchived` revalidates `/catchups` (`catchups/actions.ts:2320`), so the action's own response carries the fresh list and an Undo cannot race the archive's refresh.
- **Profile feeds** — Load more is guarded by a same-tick ref and deduped (`profile-author-feed.tsx:109-132`); both mount fetches carry a cancel flag (`:83-107`, `saved-posts-feed.tsx:135-155`).
- **People search hook** — a slower response for an older query never lands (`use-user-search.ts:51-79`).
- **Collection permalink** — visibility through `loadPhoto` → `decidePhotoVisibility` (`collection-data.ts:271-297`), the view recorded in `after()` and only after the 404 decision (`collection/[id]/page.tsx:95-106`), the caption in the tab title only for a photo the viewer may see (`:55-60`).
- **Catch-ups index** — one membership query, covers and read marks in parallel (`(index)/page.tsx:218-227`), covers only from live Catch-ups (`:191`); archived prefs are the viewer's own (`:115`).
- **Letters rail module** — the city and batch audience filters apply to non-admins (`letters-module.tsx:39-44`).
- **Onboarding** — the admission-number bounce and the seen-latch run once per true mount, Strict-Mode safe (`onboarding-flow.tsx:158-177`); the invite `next` is `safeNextPath`-checked (`welcome/page.tsx:57`).
- **Gazetteer fallback and place writes** — a failed gazetteer query leaves members unmapped for one render and caches nothing (`geocode.ts:91-97`); every placeId is confirmed before the write and unknown ones degrade to free text (`place-input.ts:170-190`); the schema bounds label, city, lat, lng and count (`:25-39`).
- **Image facts** — `recordImage`/`forgetImages`/`photoFactsFor` never throw and log every failure (`image-record.ts:37-112`).
- **Bird glyph** — the hash space is fixed at 50 (`avatar.ts:50, 163-169`), so appending species never re-deals anyone's bird; the Hoopoe and Roller slugs resolve only for their reserved ids (`bird-avatar-v2.tsx:2678-2701`); `mix()` expands 3-digit hex (`:41-61`).
- **Edition navigator** — the swell is motion values reading live rects, no React render per pointer move (`navigator.tsx:270-281, 370-397`); the fill measures after commit (`:375-384`).
- **Houses chain** — stale metrics for a chain of a different length are never laid out (`houses-chain.tsx:508-522`); row packing always finds a legal layout (`:282-293`).
- **Mascot moments** — every bird is aria-hidden; the flight token cancels every await in the 404 stage (`not-found-stage.tsx:95-132, 280-291`); the sidebar sleeper arms nothing below 768px (`sidebar-hoopoe.tsx:109-120`); the logo peek removes its listeners (`logo-peek.tsx:186-194`).
- **One-off and QA scripts** — the stranded-originals sweep is dry by default, matches only `-o.` keys and refuses any key a row points at (`sweep-stranded-originals.mjs:25-31, 74-138`); the photograph picker is read-only against the database, clears only the batch and never the undo logs, and names its database in the manifest (`tag-photos-pick.mjs:99-110, 154-158`); the places import is idempotent (`import-places.mjs:96-114`); the redate script writes literal timestamps to avoid the raw-pg local-zone trap (`redate.mjs:16-21`); the lab audit checks both naming directions (`lab-audit.mjs:126-140`).
- **Dormant landing decorations** — `ambient-leaves.tsx`, `footer-hoopoe.tsx` and `perching-birds.tsx` are mounted only from `showcase.tsx`/`landing-footer.tsx`, which nothing live renders (L7 rows 124-130); read anyway, nothing beyond L7's Strict-Mode note on `footer-hoopoe.tsx:166, 204-210`.

## Leads for other territories
- T6 / profile — `src/components/profile/letterhead-profile.tsx:378-390, 442-458` — `form` is seeded once and never re-read from the refreshed props, so beyond C7a-03 the open sheet also keeps showing the RAW typed value after a save the server normalised (`profile-actions.ts:126` title-cases the name, `:137` occupation-cases job title and workplace); it corrects on the next visit. Cosmetic on its own.
- T4b / Collection — `src/components/collection/collection-client.tsx:1351-1356` (`patch`) is the writer behind C7a-01; any future in-place write (an approval, a love count shown on tiles) inherits the stale band unless the comparator is fixed there or in `photo-river.tsx`.

## Inputs for the live naughty-strings pass
- Profile year pens (joined/left, taught from/until) — `User.yearJoined/yearLeft/taughtFrom/taughtUntil` via `updateProfileField` — the cross-field order that strands a refusal (C7a-03): set the first year past the other, then fix the other.
- Photograph description in the edit dialog — `Photo.caption` via `editPhoto` — emoji at the 300th code unit (`photo-questions.tsx:170` slices code units, not graphemes) and a caption edit followed by hovering the tile (C7a-01).

## Coverage
- Read completely (cold, at HEAD 36ed27d3): all 72 files on cold-files.md section A — see the file board above for each one's line. Two were read in part, deliberately: `src/components/common/bird-avatar-v2.tsx` (2,797 lines; every helper, the exported API, the override and reservation resolution and the glyph component read in full; the ~2,400 lines of per-species SVG path data skimmed, as static drawing with no logic) and `src/app/lab/catchups/sketches/_reader.tsx` (a lab room, out of scope by charter; its imports, effects and data paths checked — fixtures only, no action, no fetch).
- Read to confirm or refute, outside the list: `collection-client.tsx:140-260, 450-580, 1280-1420, 1730-1775`; `edit-photo-dialog.tsx:40-80, 130-136`; `river-geometry.ts:135-221`; `letterhead-profile.tsx:378-520, 555-600`; `profile-actions.ts:100-215`; `batch-year.ts:89-100`; `edition/reader.tsx:520-650`; `create-post-form.tsx:845-880`; `answer/photo-attachments.tsx:105-125`; `image-aim.ts:40-100`; `email-actions.ts:154-221`; `auth-tokens.ts:81-83, 271-301`; `trivia-actions.ts:80-140`; `trivia-log.ts:102-120`; `directory/page.tsx:40-138`; `directory-client.tsx:185-260`; `map-cluster.ts:81, 280-289`; `avatar.ts:40-169`; `back-closes.ts` (whole); `use-hoopoe.ts:32-80`; `catchups/actions.ts:2300-2321`; `feed/actions.ts:600-640, 700-740`; `wordle.ts`; `dark-mode/page.tsx`; `collection-data.ts:100-110, 260-297`; `filter-sheet.tsx:25-45`; `house-chain-editor.tsx:290-305`; `node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs:1-120`.
- Read-only database checks: `Photo` untagged vs total (1,737 of 2,043); accepted questions per published Edition (11, 8, 2) for C7a-04.
- Deduped against: `candidates.md`, every `reports/*.md` and `verdicts/*.md` (grep per file and per mechanism before each finding: photo-river/comparator/takenShort, photo-aim/aimImage, inFlight/useAutoSave/pen.tsx, the panel cap, unmapped, costs-card (T8a-18), wordle (L3 row 48), footer-hoopoe (L7, dormant), hoopoe-playground (T9-05), repeated `token` (L6-07), blocked authors in Catch-ups (T2a-13)), the dedup baseline, and TRAPS.
- Taxonomy rows applied with zero new findings and genuinely verified clean: 6a (missing await, swallowed rejections, timers and listeners — every effect in the 72 files has its cleanup or a stated reason not to), 6b (conditional hooks, effect deps, setState-after-unmount, index keys — the two index-keyed lists are deliberate and argued: `directory-grid.tsx:330-336`, the houses chain's fixed pills), 6c(1) double submit on every control in the list (Resend, Verify, Put back, archive, crop, aim, upload, trivia Check), 6d (the one-offs' raw `pg` writes and their timestamp handling), 6g (blob URL lifetimes, the stranded-originals sweep), 6h dates (the gauntlet's IST Wordle is L3's), 6k (atlas down, gazetteer down, places API down, upload failure).
- Taxonomy rows not applicable here: 6e (no auth code in the list beyond the confirm page's server half, already T5's), 6f (no route or long-running action among these files), 6j (no query in these files grows with members except the Catch-ups index, whose reads are bounded by the viewer's own memberships and the four shelf slots).
- Could not verify: C7a-01, C7a-02 and C7a-03 live (each needs a signed-in edit, which this round may not make) — each carries the orchestrator's Jerry recipe; C7a-04's exact overflow per device (Safari's visible viewport varies with its toolbars).

Verdict: **NOT DRY.** One new Medium: C7a-03 (on the profile, a refused field is stranded on screen under a "Saved" mark the moment any other field saves — and the cross-field year refusal's own instruction, "Check the other year too", leads there). Three new Lows with teeth: C7a-01 (a photograph's tile keeps its old date and caption after an edit until a reload: the year's memo comparator cannot see a middle photograph change), C7a-02 (the crop dialog reopens on a frame that was never saved, and closes as if it saved when the save failed), C7a-04 (the Edition's question list is taller on a phone than on a laptop, the inverse of its comment, so on a small phone its last questions cannot be reached). Thirteen minor notes below the bar.

STATUS: COMPLETE at HEAD 36ed27d3

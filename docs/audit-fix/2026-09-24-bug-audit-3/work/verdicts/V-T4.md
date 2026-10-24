# V-T4 — adversarial validation of T4a (Collection write paths) + T4b (Collection surfaces)
Validator: V-T4 · Model: Opus 5.5 (claude-opus-5-5) · Started: 2026-09-27 02:34 BST
Assignment: T4a-01..T4a-14, T4b-01..T4b-13, plus the routed candidates V-T1-02 (collection-intake's raw `Promise.all` orphan), V-T4a-A (the tick copies the feed's 1920 px display copy), V-T4a-B (`use-composer-uploads.ts:187` stale `shots`).
Method: `work/brief-validator.md` exactly. Read-only; SELECT-only database (times printed by run-sql.mjs are one hour early on this BST machine; cast with `::text`); no gates, no browser, no sign-in; scratch only under /tmp, deleted by the command that made it.
Resumed: 2026-10-23 (fourth session) at HEAD 88642426, 113 commits past the audit's 495ecdd2; every citation re-checked at HEAD; verdicts may be FIXED-SINCE <sha> / MOOT-SINCE <sha>. The first run (2026-09-27) was killed by a usage limit before any verdict was written; nothing below is from it.
Orchestrator-settled going in: T4a-01 hand-verified live; T4b-01 confirmed at source; T4b-02 = T8b-01's Collection instance (T8b-01 canonical); T4b-03 hand-verified; T4b-08 main claim refuted live; T4b-13 re-ruled Low live.

## Verdict board (stubs first; each is replaced by its full verdict below as it is settled)
- T4a-01 — CONFIRMED-CORRECTED (High; the trigger account holds 1,740, not 1,743)
- T4a-02 — CONFIRMED-CORRECTED (Medium, latent; largest year 465)
- T4a-03 — CONFIRMED-CORRECTED (Medium; the repo records the lifecycle rule as never added)
- T4a-04 — DOWNGRADED to Low (mechanism confirmed and wider; 3 live photographs download under the wrong year)
- T4a-05 — FIXED-SINCE 9c992844 (one retry with a fresh presign, no second shrink, the member is told)
- T4a-06 — DOWNGRADED to Low (needs `.env.demo` to hold R2 keys, which the demo spec forbids; owner check written)
- T4a-07 — CONFIRMED-CORRECTED (Low)
- T4a-08 — REFUTED (the findUnique answers 'Photo not found' for the stated race; only a millisecond window remains)
- T4a-09 — REFUTED (the demo visitor owns no photograph and cannot contribute; unreachable)
- T4a-10 — CONFIRMED-CORRECTED (Low; a fourth stale note at schema.prisma:528)
- T4a-11 — CONFIRMED-CORRECTED (Low; 70e4a0c6's sender date mitigates filing)
- T4a-12 — CONFIRMED-CORRECTED (Low; a NUL in the caption is a deterministic trigger)
- T4a-13 — CONFIRMED (Low)
- T4a-14 — CONFIRMED (Low; not reachable from the UI today)
- T4b-01 — CONFIRMED-CORRECTED (High)
- T4b-02 — DUPLICATE of T8b-01
- T4b-03 — CONFIRMED-CORRECTED (High; not fixed by 9c992844)
- T4b-04 — CONFIRMED-CORRECTED (Medium)
- T4b-05 — CONFIRMED-CORRECTED (Medium; 20 of 572 members qualify)
- T4b-06 — CONFIRMED (Medium; 0 of 572 trusted)
- T4b-07 — CONFIRMED-CORRECTED (Medium)
- T4b-08 — REFUTED (live; residual geometry cost is L5's)
- T4b-09 — CONFIRMED-CORRECTED (Low)
- T4b-10 — CONFIRMED (Low)
- T4b-11 — CONFIRMED (Low)
- T4b-12 — CONFIRMED-CORRECTED (Low; the action POST itself 431s, not an RSC GET)
- T4b-13 — DOWNGRADED to Low (orchestrator live re-ruling stands)
- V-T1-02 — CONFIRMED (Low)
- V-T4a-A — CONFIRMED-CORRECTED (Low, latent; bytes copied verbatim, no live rows)
- V-T4a-B — REFUTED (no path delivers twice inside one render)

## Verdicts


### T4a-01 — CONFIRMED-CORRECTED (High)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `src/lib/collection-intake.ts` is byte-identical at HEAD (no commit touched it since 495ecdd2): `:72` unscoped `prisma.photo.count({ where: { uploaderId: userId } })`, `:79` `isPhotoAutoApproved(me)`, `:86-87` `room = Math.max(0, MAX_PHOTOS_PER_ACCOUNT - existing); if (room === 0) return 0;` — all correct. `collection/actions.ts:99-121` `photoQuotaError` (`:110` admin exemption, `:116` per-scope count) — correct. CORRECTED: the `MAX_PHOTOS_PER_ACCOUNT` docblock is `src/lib/upload-shared.ts:33-52` (the "COUNTED PER HALF" paragraph is `:43-51`), not `:41-58`; the caller is now `src/app/(main)/feed/actions.ts:330-346` (the `after()` at `:339`, the swallow comment at `:334-335`), not `:299-307`.
What I tried to refute it with: a second quota path that exempts admins before the helper runs (none: `createPost` calls the helper with only `userId`, `imageUrls`, `caption`); a role check inside `photoRowData`/`isPhotoAutoApproved` that could skip the count (none, the count is the early return); whether the owner's account still holds >1,000 rows (yes).
Why it stands / falls: the helper still counts every Photo row across both scopes with no admin exemption, so the account holding the class album gets `room = 0` and the tick returns 0 before any copy, with nothing logged (the early return is not an error). The two writers of the M17 rule remain drifted exactly as described.
Live check run: `SELECT u.id, u.role, p.scope, count(*) FROM "Photo" p JOIN "User" u ON u.id=p."uploaderId" WHERE u.role='admin' GROUP BY 1,2,3` -> account `cmr1uahuj…` (admin) class 1,740; a SECOND admin account `cmseq4ys…` valley 3. Correction: the finder's "admin account holds 1,743" summed two admin accounts; the importer's account holds 1,740 (all class, 0 valley). Its room is still `max(0, 1000-1740) = 0`. Members: 298 valley + 2 class rows, none near the cap.
Corrections to the finding: the 1,743 figure is two admin accounts (1,740 + 3); the trigger account is the one `import-album.mjs` filed the class album under. Severity High stands: the owner is the member who hits it, on every ticked post, silently. Fix direction unchanged (one shared quota helper: admin exempt, count `scope: "valley"` since the tick always lands in the valley via `photoRowData`'s default).
Orchestrator action: none needed (hand-verified at source and by count; a live proof would write a post).

### T4a-02 — CONFIRMED-CORRECTED (Medium, latent)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (mechanism); the data state is not reached yet
Citations re-derived: `collection/actions.ts` shifted +21 below line ~250 (9c992844). CORRECTED: the `take` docblock is `:962-964`, `take: 600` is `:998` (were 941-943, 977). `collection-client.tsx` is line-identical at HEAD (every change since was comment wording, same line count): `:514` warm, `:515` `held.current.set`, `:519` `reshapeBand`, `:523` rebuild, `:881` the cursor walk standing down — correct. `src/lib/river-geometry.ts` `holdsBand` `:186-194`, `reshapeBand` docblock `:196-210` and body `:211-221` — correct within the cited range.
What I tried to refute it with: a continuation in `loadBand` (none: one `findMany`, no cursor, no `complete` flag returned); a client re-ask when `data.photos.length < box.count` (none: `needBand` returns early for any held key, and `reshapeBand` adopts whatever arrived); the cursor walk as a backstop (stands down whenever boxes exist, `:881`); whether the rail shows a number (it does not since the `title` was removed, `year-rail.tsx:395-400`, but the mark's LENGTH is the count, so the rail still draws the true size).
Why it stands / falls: a year over 600 rows is cut to 600 silently and the box is reshaped to fit, so photographs 601+ of that year are unreachable in Year taken while present in Recently added. Medium is right for a latent edge: nobody hits it today.
Live check run: `SELECT scope, "takenKey"/100 yr, count(*) FROM "Photo" WHERE approved AND NOT "isHidden" GROUP BY 1,2 ORDER BY 3 DESC LIMIT 4` -> class 2022: 465, 2020: 440, 2021: 233, 2023: 208. Largest year 465 (unchanged since the audit).
Corrections to the finding: line numbers above; "the rail says 700" should read "the rail's mark is drawn at 700's length". The order names changed on 2026-10-08 (`f04ec1b7`): "Chronological" is now labelled "Year taken" and "Newest" is "Recently added" in the UI; the code values (`taken`, `newest`) are unchanged.
Orchestrator action: none.

### T4a-03 — CONFIRMED-CORRECTED (Medium; confidence raised to certain that no rule exists)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (no code path deletes an abandoned staged original; the repo now records the lifecycle rule as never added)
Citations re-derived: CORRECTED for HEAD: `contribute-room.tsx` `remove()` is `:705-712` (was 698-705); the Discard confirm is `:312-322` (`onConfirm` `:318-321`: `onOpenChange(false); setWall(0);`), not `:311`; `collection/actions.ts` refusals above the key check are `:398-400` (auth, IS_DEMO; the key check is `:402-415`), not `:377-379`. `src/app/api/upload/presign/route.ts:90` ("Under `staging/` one lifecycle rule closes it permanently") — correct. The other citations (progress-2026-08, bug-report-2:250, fix-ledger:57) are history and unchanged.
What I tried to refute it with: (1) a delete action the room could call — still none; `purgeImageKey` is reached only from `contributePhotoDirect`; (2) a sweeper over `staging/` — `sweep-stranded-originals.mjs` still reads only `collection/`, `retention.ts` only drains `PendingImagePurge`; (3) a recorded lifecycle rule — grep of `docs/OPERATIONS.md`, `docs/planning/platform-health/`, `docs/spec/media.md`, `docs/TRAPS.md` finds none; and the repo itself now says so: `docs/history/progress-2026-09.md:8431` (2026-09-27, the drop-box session): "staging starts a direct upload, so that test square may sit under `staging/` in R2 until the lifecycle rule clears it; **it was never added**."
Why it stands / falls: the half of C-063 that the audit-2 ledger left to the owner is not done, by the repo's own record, and the in-app half (a discard action) was never built. Since 2026-09-27 the voice recorder also stages under `staging/` (`/api/upload/audio`, progress-2026-09.md:6864), so the same gap covers abandoned recordings. Corroboration from L11: the media backup's run logs show ~330 objects copied from `media/staging/` since 2026-08-29 (a staged original exists only for the minutes between drop and Add on the success path, so many of those were abandoned ones).
Live check run: none possible (R2 is off limits); the documentary evidence above settles the "is there a rule" question as far as the repo can.
Corrections to the finding: confidence likely -> certain on the rule's absence (per `progress-2026-09.md:8431`); scope widened to staged voice recordings; the owner-question (Q8 / C in `owner-questions-draft.md`) can be closed as "it was never added" rather than asked. Medium stands (GPS-bearing originals at public URLs, unbounded growth).
Orchestrator action: none for the verdict; the fix session should add the rule (prefix `staging/`, e.g. 1 day) AND the in-app discard.

### T4a-04 — DOWNGRADED to Low (CONFIRMED mechanism, live instances found)
Verdict: DOWNGRADED to Low
Confidence in verdict: likely
Citations re-derived: `src/lib/exif-date.ts:131-134` (the "wider than what `exifDate` will OFFER" note) and `:140-148` (`exifStamp`) — correct, file unchanged; `src/lib/collection-image.ts:126-131` (`dateOnlyExif`) — correct; ALSO its docblock `:119-121` says "`exifStamp` has already refused anything that is not a date this archive would file", which is false (it only range-checks) — a comment lie the finder did not cite. CORRECTED: the fallback's `dateOnlyExif` call is `collection/actions.ts:248` (encode `:262-266` after 9c992844 replaced the 1600 box), the direct path's is `:530`; `scripts/dev/import-album.mjs` reads at `:331-332` and writes the stamp at `:480` (were 288-289 / 423). `api/photo/download/route.ts:76-83` (`keepExif` + its comment) — correct within a line. `taken-date.ts:296`, `:299`, `:323-345` — correct. `exif-date.test.mjs:39-42`, `:47-50` pin "kept in the file but not offered" — correct.
What I tried to refute it with: whether anything rewrites the stored bytes after an edit or a review (nothing: `editPhoto` and the review room write columns only); whether the download names the archive's year anyway (the filename does, via `collectionSaveName`; the EXIF does not); and — the adversarial point that decides severity — what the member's photo app would do WITHOUT the stamp: it files the file under the download date, which is also wrong.
Why it stands / falls: the mechanism is exactly as described and is broader than the finder framed it: the stored copy carries the FILE's stamp, never the archive's answer, so ANY photograph whose contributor (or the review room) corrected the year downloads under the wrong year — not only scanner or epoch stamps. And `70e4a0c6` (2026-10-17) makes it systematic for the importer: a captions line's sender date "wins over the file's stamp, which on a scan is the day it was scanned" for the COLUMNS, but `:480` still writes `p.stamp` (the scan date) into the stored copy as DateTimeOriginal. Downgraded because the harm is a date inside a downloaded file, every archive-side reading (columns, river, rail, viewer, the download's own filename) is right, and the no-stamp alternative misfiles too; it is cosmetic-with-teeth, not a degradation of the archive.
Live check run: `SELECT "exifYear","photoYear",approved,"createdAt"::date FROM "Photo" WHERE "exifYear" IS NOT NULL AND "photoYear" IS NOT NULL AND "exifYear" <> "photoYear"` -> 3 approved valley rows (exif 2006 / filed 1974; 2016 / 2015; 2026 / 2021). On the contribute paths `exifYear` is the judged offer (`photoRowData` `exif?.year`, `collection-photo.ts:225`), so each of these files' stored copies carries a DateTimeOriginal in a year the archive rejected; a download of the 1974 photograph files itself under 2006.
Corrections to the finding: severity Medium -> Low; trigger widened from "scans/epochs" to "any photograph whose filed year differs from its file's stamp" (3 live today) plus every `--review` import with a sender date; fix direction should lead with the finder's second option — write the archive's own year/month into the download at `/api/photo/download` (one change, fixes existing stored copies on the way out) — and narrow `exifStamp` only as the secondary half; add the `collection-image.ts:119-121` comment to the L9 list.
Orchestrator action: optional — `exiftool -DateTimeOriginal` on the public WebP of the 1974/2006 row would show the 2006 stamp; not needed for the verdict.

### T4a-05 — FIXED-SINCE 9c992844
Verdict: FIXED-SINCE 9c992844 ("fix(collection): retry a missed direct upload, keep what arrives, and say so", 2026-09-27)
Confidence in verdict: certain
Citations re-derived: `src/lib/upload-client.ts` now has `MAX_ATTEMPTS = 2` and `attemptDirectUpload` returning `"retry"` for a thrown presign fetch, a presign 5xx, a PUT 5xx and a thrown/aborted PUT, `"unavailable"` only for `{direct:false}` or a 4xx; `directUploadPut` loops with a FRESH presign and a fresh `AbortSignal.timeout(deadlineMs)` per attempt. `collection/actions.ts` `contributePhoto` no longer resizes to 1600 q80: `:262-266` uses `storedResizeBox` + `COLLECTION_WEBP_QUALITY`, and returns `smaller: true`; `contribute-room.tsx:776` counts it and `:838-843` toasts `fallbackSizeNotice`/`fallbackSizeBatchNotice`. Pinned by the new `src/lib/upload-fallback-rule.test.mjs` (171 lines).
What I tried to refute it with: whether the retry reuses a spent signal (no — `deadlineMs` is a number, remade per attempt, and the commit says so); whether a 4xx PUT (a bad signature after a long first attempt) is retried (no, it goes to the fallback — but the retry always takes a fresh presign, so an expired URL is only possible within one attempt's deadline); whether the member is now told (yes, one toast per drop).
Why it stands / falls: all three halves of the finding — no retry, a second shrink to 1600 q80, nothing said — are addressed. What remains by design: after two failed attempts the photograph is stored at the browser's 2048px shrink (the 4.5MB body cap), and the member is told. Each retry spends one more `collectionUploads` token (3 per retried photograph instead of 2), harmless at 1,000/h.
Live check run: none needed.
Corrections to the finding: none; close it.
Orchestrator action: none.

### T4a-06 — DOWNGRADED to Low (mechanism CONFIRMED; the blast path needs an env file the demo spec forbids)
Verdict: DOWNGRADED to Low
Confidence in verdict: possible (turns on one fact I may not read: whether `.env.demo` carries `R2_*` keys)
Citations re-derived: `scripts/dev/backfill-screen-copies.mjs` is unchanged since the audit: undo `:136-145` (`emptied += rowCount; await drop(line.key);` — the drop does not depend on `rowCount`), reconcile `:150-166` (`unnamed(lines)` `:110`, `for (const o of orphans) await drop(o.key)` `:160`) — correct. CORRECTED: `scripts/dev/import-album.mjs` undo is now `:230-257` (`DELETE ... RETURNING "screenUrl"` `:242-245`, the unconditional object deletes `:247-253`), not `:196-222`. `scripts/dev/_env.mjs:78-92` `databaseUrl` — correct (checks the DATABASE host for the demo ref only). The `upload-shared.ts` "demo deployment reads the same bucket" line is now `:271-272`, not `:240`.
What I tried to refute it with: WHERE the two scripts get their bucket credentials. Both read all five `R2_*` keys ONLY from the env file named by `--env` (`databaseUrl` -> `readEnv([envFile])`, no `.env` fallback, no `process.env` read), and both EXIT before any query when a key is missing (`import-album.mjs:145-150` "refusing to run against the local filesystem fallback"; `backfill-screen-copies.mjs:72-77` "this script talks to the bucket directly"). And `docs/spec/demo.md:110` says of the demo project: "**Do not set** ... any `R2_*` ... a secret that is not in the environment is a secret that cannot leak from it", repeated at `:20-21` ("the R2 keys ... which the demo project simply does not have") and `:147` ("No bucket is involved at any point"). The `upload-shared.ts:271` "reads the same bucket" is about public image URLs (no key needed), not about write credentials. So with a spec-conforming `.env.demo` the slip the finder describes (`--undo ... --env .env.demo --apply`) refuses at startup and deletes nothing.
Why it stands / falls: the protocol gap is real — the ledgers carry no database stamp, and both undo/reconcile modes delete objects whether or not the row check matched, which `hand-run-passes.md` forbids for the tagging passes — but the destructive scenario requires a local `.env.demo` holding PRODUCTION bucket write keys, which the repo's own demo spec says must not exist. The backfill's usage line advertising `[--env .env.demo]` (`:45`) is the one hint that someone may once have put R2 keys there.
Live check run: none (`.env.demo` is deny-listed for this session, rightly).
Corrections to the finding: severity Medium -> Low while `.env.demo` has no `R2_*`; restore Medium if it does. Fix direction unchanged (stamp the ledger with the env file + bucket; make the object delete conditional on the row check; extend `hand-run-passes.test.mjs` to every ledger-writing script) — it is cheap and correct either way.
Orchestrator action: count, without printing values: `grep -c '^R2_' .env.demo` (and `grep '^R2_BUCKET=' .env.demo | cut -d= -f1` only to confirm the key name). If the count is 5 and the bucket is `rv-alumni-media`, T4a-06 is Medium as filed.

### T4a-07 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: CORRECTED: `togglePhotoLove` is `collection/actions.ts:1004-1030` (auth `:1005-1006`, `requireVerifiedMember` `:1009-1010`, `deleteMany` `:1014-1017`, `create` + P2003 "That photo is no longer here." `:1019-1029`), not `:983-1010`. The feed's standard: `toggleLike`'s `canViewPost` is `feed/actions.ts:829` (was 710); the others are `votePoll` `:488`, `toggleBookmark` `:909`, `loadComments` `:1435`. `src/lib/photo-visibility-rule.ts` `PHOTO_NOT_VISIBLE` + the one-message comment `:146-150`, `decidePhotoVisibility` `:154-190` (was 141-179).
What I tried to refute it with: a visibility check inside the action's callers (the heart is only offered on photographs the viewer can see, but the action takes a raw id); an FK or RLS that would refuse a love on an unapproved/hidden/other-class row (none: `PhotoLove` FKs only require the row to exist); a test pinning Collection interactions (none — `security-regressions.test.mjs`'s class-scope pins cover reads and deletes).
Why it stands / falls: unchanged at HEAD — the action never consults `decidePhotoVisibility`, so an id holder can love an invisible photograph and read success vs "no longer here" as an existence oracle the rule's comment was written to prevent. Low is right: cuids are unguessable and only leak by being shared.
Live check run: none needed (shape read in full).
Corrections to the finding: line numbers only.
Orchestrator action: none.

### T4a-08 — REFUTED (the stated scenario; a sub-round-trip race remains)
Verdict: REFUTED
Confidence in verdict: certain
Citations re-derived: CORRECTED: `adminRemovePhoto` is `collection/actions.ts:1174-1197`; `findUnique` `:1178-1181`, `if (!photo) return { error: "Photo not found" };` `:1182`, `update` `:1184`, `purgeImageUrls` `:1189`.
What I tried to refute it with: the finder's own scenario, step by step. "Uploader deletes; admin presses Remove on the stale row": the uploader's `erasePhoto` has already deleted the row, so the admin's `findUnique` at `:1178` returns null and the action answers `{ error: "Photo not found" }` at `:1182` — a sentence, not a throw, and not "Check your connection". P2025 is only reachable if the row vanishes in the window BETWEEN `:1178` and `:1184`, i.e. one database round trip (milliseconds), which the title's "a second earlier" does not describe.
Why it stands / falls: the title and Actual are wrong about the reachable case; the guard the finder says is missing is the `findUnique` it cites. What survives is hygiene: the residual window is real but vanishingly narrow, and `updateMany` + `count === 0` would close it for free (and match `editPhoto`). Not worth a finding row; fold it into T4a-09's "one `refuseInDemo`/one shape" tidy if the fix session touches the file.
Live check run: none needed.
Corrections to the finding: REFUTED as filed; optionally record "adminRemovePhoto: `update` -> `updateMany` for the millisecond race" as a one-line note under the Collection unit.
Orchestrator action: none.

### T4a-09 — REFUTED (unreachable in the demo)
Verdict: REFUTED
Confidence in verdict: certain
Citations re-derived: CORRECTED: `deleteOwnPhoto` is `collection/actions.ts:1144-1162` (no `IS_DEMO`); the siblings' guards are `:165` (`contributePhoto`), `:400` (`contributePhotoDirect`), `:1233-1235` (`editPhoto`). `src/lib/demo.ts:63-71` (`ALLOWED_WRITE_MODELS`, `PhotoLove` present, `Photo`/`PendingImagePurge` absent) — correct.
What I tried to refute it with: who can reach the Delete in the demo. The demo seed (`src/lib/demo-seed/seed.ts:318-330` with `content.ts:683-782`) files all six Collection photographs under OTHER personas (`harsh-vardhan`, `ishaan-verma`, `gita-raman`), never under `visitor` (`DEMO_USER_ID`); the visitor's role is `member` (`seed.ts:174`); and contributing is refused under `IS_DEMO` at `:165`/`:400`, so the visitor can never come to own one. The edit dialog's Delete is offered only on `canEdit` photographs (own upload or admin, `collection-client.tsx:1342`), so it is never drawn for the visitor, and a hand-made call with another persona's photo id is refused at `:1153-1155` ("Not authorized") before `erasePhoto` can reach the third layer.
Why it stands / falls: the trigger state (a demo visitor who owns a photograph, or an admin visitor) does not exist and cannot be created, so the misleading "Check your connection" cannot appear. The missing guard is a consistency nicety (three of four Collection writes spell it out), not a bug.
Live check run: none needed.
Corrections to the finding: REFUTED; optionally a one-line consistency note for the fix session's Collection unit.
Orchestrator action: none.

### T4a-10 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: still stale at HEAD. `prisma/schema.prisma:11-23` "ELEVEN INDEXES" (lists `Photo_area_trgm_idx`, `Photo_freeTags_trgm_idx`) and `:47` "only SEVEN of the eleven" — correct. CORRECTED: the "still in both databases until the owner runs" notes are now `:310` (Image.greyscale), `:375` (Photo.area/freeTags) and a FOURTH the finder missed, `:528` (Group.description/coverImage); "Three GIN trigram indexes on caption, area and freeTags" is `:503` (was 498). `docs/TRAPS.md:41` and `:50` — correct. `docs/spec/media.md:233` (was 219) "unrun. **The columns still exist.**". `collection/actions.ts:633-635` (was 612-614) search comment. `src/app/api/upload/presign/route.ts:16-18` — correct.
What I tried to refute it with: whether any commit since 495ecdd2 corrected the header or the notes (none touched those lines; the schema diff is +22/-58 elsewhere); whether the columns or indexes reappeared.
Why it stands / falls: production has nine special indexes and none of the five dropped columns; every one of these comments still says otherwise.
Live check run: `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND (indexdef ILIKE '%lower(%' OR indexdef ILIKE '%gin_trgm%' OR indexdef ILIKE '%WHERE%')` -> exactly the nine (Photo_caption_trgm_idx, Place_altNames_trgm_idx, Place_asciiName_idx, Place_name_idx, Report_open_post_per_reporter_key, UserPlace_city_idx, User_email_lower_key, User_lastSeenAt_idx, User_name_trgm_idx). `information_schema.columns` for Photo.area/freeTags, Image.greyscale, OutboundEmail.bounceKind and Group.* -> only Group's six live columns; `description`/`coverImage` gone.
Corrections to the finding: add `schema.prisma:528` (Group residue note) to the list; line numbers above.
Orchestrator action: none.

### T4a-11 — CONFIRMED-CORRECTED (Low; partly mitigated by 70e4a0c6, and that commit widens T4a-04)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: CORRECTED for HEAD (`70e4a0c6` rewrote ~80 lines of the script): the filing read is `scripts/dev/import-album.mjs:331-332` (`exifStamp(...)` then `parseExifStamp`), the stored-copy write is `:480` (`withExif({ IFD2: { DateTimeOriginal: p.stamp } })`), the header promise "IT NEVER INVENTS A DATE ... REFUSED, not filed undated" is still `:51-56`. `exif-date.ts:140-148` and `taken-date.ts:323-345` — correct.
What I tried to refute it with: the 2026-10-17 changes. `--captions` may now carry a third column, the sender's date, which "wins over the file's stamp, which on a scan is the day it was scanned" (header `:76-80`, `given` at `:357-359`) — so an operator who types dates is no longer filed by a scanner's stamp. But without a third column (the default, and the original `--scope valley --captions` mode) the year still comes from `exifStamp`'s Original -> Digitized -> Modified fall-through with no scanner/epoch/file-name judgement (`:357`: `const year = given ? given.year : date ? date.year : Number(foldered[1])`). New since the audit: `--undated` (`:345-351`) files a stampless photograph as undated on purpose, and the folder-name fallback (`:343`) — both deliberate, documented, and not this finding.
Why it stands / falls: the planner still files from the write-back reader rather than `judgeTakenDate`; a scanned or re-saved file with no third-column date is filed under its scan/save date. The header's "REFUSED" promise is now also qualified by `--undated` (accurate in its own paragraph). Low stands: hand-run, owner-operated, and the new `given` column is the operator's escape hatch.
Live check run: none (never run the script).
Corrections to the finding: line numbers; note the `given` mitigation; note that with a `given` date the stored copy STILL carries the scan stamp as DateTimeOriginal (`:480` writes `p.stamp` regardless) — that half belongs to T4a-04 and is folded there.
Orchestrator action: none.

### T4a-12 — CONFIRMED-CORRECTED (Low; a deterministic trigger exists)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: CORRECTED: `purgeImageKey(input.key, "staged")` is `collection/actions.ts:567` (inside the encode try that ends `:568-570`), the `createPhotoRow` call is `:583-603`, the helper `createPhotoRow` (purge-on-failure, rethrow) is `:325-346` (was 306-325); the P2002 branch `:604-612`.
What I tried to refute it with: a retry path that could reuse the staged key (the room drops a failed photograph from the wall — T4b-03 — so there is no retry, and the key is gone anyway); any input validation that would refuse a bad row BEFORE the purge.
Why it stands / falls: the original is deleted before the row exists, so a failed insert loses the full-resolution upload. Found while checking the second point: the caption passes `photoSchema` (`validators.ts:261`, `z.string().trim().max(300)`, no control-character check) and Postgres refuses a U+0000 in a text column, so a caption containing a NUL (a PDF paste) is a DETERMINISTIC trigger, not just a pool blip: the encode and the three PUTs succeed, the staged original is purged at `:567`, `photo.create` fails, `createPhotoRow` purges the three new objects, the action rejects — and (T4b-03) the photograph leaves the wall. The member must find the file again and will hit the same error with the same caption. Still Low: the member re-uploads; nothing is left behind.
Live check run: none (would write).
Corrections to the finding: line numbers; add the NUL-caption deterministic trigger (and the fix half routed by the leads file: validate/strip control characters in `photoSchema` before the action consumes the staged key).
Orchestrator action: none needed; the live naughty-strings pass already showed a NUL reaching Postgres elsewhere (`/feed?q=a%00b`).

### T4a-13 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `src/lib/collection.ts:321-326` (`eraFromYear`), `ERAS` ending `"2020s"` at `:170`, `ERA_START_YEAR` `:356` — correct; file unchanged since the audit.
What I tried to refute it with: whether `photoYear` can be 2030 before 2030 (no: `yearField` caps at `valleyYear()`), so the trigger is the calendar, 1 January 2030 IST; whether anything reads `era` for a dated row in a way members see (the river, rail, `takenKey` and labels all prefer `photoYear`, as the finder says).
Why it stands / falls: ran the real module at HEAD: `eraFromYear(2029) = "2020s"`, `eraFromYear(2030) = "unknown"`. A wrong column nobody sees until somebody filters or audits by era. Low.
Live check run: `node --input-type=module -e "const m = await import('.../src/lib/collection.ts'); console.log(m.eraFromYear(2029), m.eraFromYear(2030))"` -> `2020s unknown`.
Corrections to the finding: none.
Orchestrator action: none.

### T4a-14 — CONFIRMED (Low; not reachable from the UI today)
Verdict: CONFIRMED
Confidence in verdict: certain (mechanism); reachability narrow
Citations re-derived: CORRECTED: `contributePhoto` spans `collection/actions.ts:162-321`; its `createPhotoRow` with no `sourceKey` is `:297-310` (was 283); the direct path's `sourceKey: input.key` is `:591`, its P2002 branch `:604-612`.
What I tried to refute it with: the UI's double-submit guard. The Add button is `disabled={adding}` (`contribute-room.tsx:1035-1036`) and `fileAll` returns on `adding` (`:781`); a click is a discrete React event, flushed before the next one, so a double click does not start two batches. Server actions are not auto-retried by Next. Since 9c992844 the fallback is also rarer (two failed direct attempts first).
Why it stands / falls: the mechanism is real (no idempotency key on the proxied path) but nothing in the shipped UI produces the double invocation; the realistic future trigger is the fix for T4b-03 itself — a "try again" over photographs whose fallback POST actually committed but whose response was lost would make twins. That is the reason to keep it attached to T4b-03's unit rather than drop it.
Live check run: none.
Corrections to the finding: line numbers; reachability note above; bundle with T4b-03's retry.
Orchestrator action: none.

### T4b-01 — CONFIRMED-CORRECTED (High)
Verdict: CONFIRMED-CORRECTED (orchestrator hand-verified at source 2026-09-27; re-derived at HEAD)
Confidence in verdict: certain (deterministic edit-year path); the band-arrival path is a race of one round trip
Citations re-derived: `image-viewer.tsx` and `collection-client.tsx` are line-identical at HEAD (since 495ecdd2 only comment wording and one import changed, same line counts). `image-viewer.tsx:267` `useState(initialIndex)`, `:339-341` clamped `at`/`current`, `:805` `key={at}`, `:833` `src={shown}`; the only `setIndex` calls are `:355` (step) and `:393` (reset on open) — no identity re-find. `collection-client.tsx:523` (`needBand` rebuild), `:553-576` (the `lastIndex` effect; held deleted `:569-571`, rebuild `:575`), `:233-252` (seed guard, `setPhotos(firstPage.photos)` `:245`), `:1751-1754` (`onSaved` -> `patch`). CORRECTED: `viewerList`/`viewerImages` are `:1314-1318` (not 1316-1320); `listFor` `:1293-1296` returns the live `photos` for "main". `editPhoto`'s two `revalidatePath` calls are now `collection/actions.ts:1283-1284` (were 1262-1263).
What I tried to refute it with: a re-find by `href`/`src` in the viewer (none); the viewer closing when its list changes (it does not); whether `lastIndex` could bail out on an edit (only when `sameIndex` — a year change moves one entry between runs, so it does not); whether the revalidated page's `filters` could differ from the client's and stop the effect at the "view the reader has left" check (no: actions POST to the canonical URL that the URL sync already rewrote, so the server renders the same view).
Why it stands / falls: the viewer holds a slot, the Collection rebuilds the list under it on a year edit and on every band arrival, and nothing maps the open photograph to its new slot. High stands: an everyday edit leaves the member looking at (and able to edit) a different photograph.
Live check run: none (browser); orchestrator's source verification stands.
Corrections to the finding: line numbers above; order names are now "Year taken"/"Recently added" (`f04ec1b7`, UI labels only).
Orchestrator action: the finder's throwaway-account proof (own photograph, Year taken, edit the year, watch `dialog img[src]`) if a live pin is wanted.

### T4b-02 — DUPLICATE of T8b-01
Verdict: DUPLICATE of T8b-01 (canonical: the Dialog primitive; this is its Collection instance and its worst one)
Confidence in verdict: certain
Citations re-derived: `contribute-room.tsx` refusal is now `:227-241` (refuse `:234-237`; was 225-237); `ui/dialog.tsx:15-29` `useBackClosableRoot` unchanged in lines by `08d25d12` (that commit touched the close button only); `back-closes.ts` and `use-leave-guard.ts` unchanged since 495ecdd2.
What I tried to refute it with: whether `08d25d12` or any later commit re-arms a refused close (no); V-T8's reading of Base UI's controlled-open selector (a refused controlled close re-renders nothing except where the caller sets its own state, as the room does with `setLeaving(true)`).
Why it stands / falls: the mechanism is T8b-01's, still present at HEAD; the Back -> "Discard N?" -> Cancel -> Back sequence still leaves the page with the wall. Keep T4b-02's scenario as T8b-01's headline reproduction and its gate (Back, Cancel, Back stays on /collection with the dialog open).
Live check run: none.
Corrections to the finding: fold into T8b-01; carry V-T8's ruled fix direction (do not splice in `onPop`; refuse through `details.cancel()` and re-push when cancelled; a deferred re-check belt).
Orchestrator action: none beyond T8b-01's.

### T4b-03 — CONFIRMED-CORRECTED (High)
Verdict: CONFIRMED-CORRECTED (orchestrator hand-verified; re-derived at HEAD, NOT fixed by 9c992844)
Confidence in verdict: certain
Citations re-derived: CORRECTED for HEAD (`contribute-room.tsx` grew ~20 lines above the loop): the batch snapshot `:802`, the loop `:813-826` (catch pushes the raw `err.message` `:819-824`), `if (done === 0) { toast.error(...); return; }` `:844-847` (the only branch that keeps the wall), the partial toast `:848-854`, the unconditional cleanup `:858-866` (`live.current.forEach(revoke)` `:859`, `setPhotos([])` `:862`, `setMeta({})` `:863`); the two action awaits are `:752` (`contributePhotoDirect`) and `:773` (`contributePhoto`), and the file imports no `callAction` at all. `rate-limit.ts:113-128` (`collectionUploads` 1000/h, shared with presign) — correct within the block. The spec line is `docs/planning/collection-rework/spec.md:398-399` (was 399-400).
What I tried to refute it with: whether `9c992844` ("keep what arrives") changed the post-loop cleanup — it did not; "keep what arrives" means the fallback no longer shrinks a second time. Whether failures are retried anywhere (no). Whether `callAction` wraps `fileOne` higher up (no).
Why it stands / falls: on any partial failure the failed photographs, their captions and buckets are discarded with the successes; a rejected action surfaces as a raw message ("Failed to fetch"). T4a-12's NUL-caption trigger makes a one-photograph loss deterministic. High stands.
Live check run: none needed.
Corrections to the finding: line numbers; since 9c992844 a retried direct photograph spends 3 meter tokens, so the "photographer meets the meter" example arrives slightly sooner. Also note the email-gate branch (`:822`, `if (emailGate.handled(message)) break;`) — see new candidate V-T4-01.
Orchestrator action: none.

### T4b-04 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: CORRECTED: "Add more" is `contribute-room.tsx:1023-1029` (no `disabled`; the Add button beside it is `disabled={adding}` `:1030-1039`); `onRemove={remove}` `:963`; the stage's always-visible remove button `contribute-stage.tsx:304-311` (correct); the snapshot `:802`, loop `:813`, the end-of-batch `setPhotos([])`/`setMeta({})` `:862-863`; the Discard copy "They have not been added to the Collection yet." `:316`. The pump `:583-626` is around `:590-633` now.
What I tried to refute it with: whether the stage is replaced by a progress view while filing (no — only the progress label changes, `:1010-1012`, the stage and its remove button stay); whether the loop re-checks the wall (it checks only `left.current`, `:814-815`); whether paste is disabled while adding (the room's paste listener depends on `added`/`active`, not `adding`).
Why it stands / falls: (a) photographs added mid-Add climb and are then dropped by `setPhotos([])`; (b) a photograph removed mid-Add is filed anyway from the snapshot; (c) the Discard copy ignores what has been filed. Medium stands.
Live check run: none.
Corrections to the finding: line numbers; add paste as a third way to add mid-batch.
Orchestrator action: none.

### T4b-05 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `collection-data.ts` unchanged since the audit: `:64-69` (the comment promising a public-half landing), `:70` (scope as vocabulary), `:132-137` (`classWhere`), `:164` (`readable`), `:217` (`here = scopeFacts[scope] ?? scopeFacts.valley`), `:219` (`loadPhotos`) — correct. `collection-client.tsx:288` (facts fallback to the flat valley props), `:1427` (`trulyEmpty`), `:1451`, `:1457`, `:1734` — line-identical; `scope-caret.tsx:49` — not touched.
What I tried to refute it with: a redirect or scope correction between `riverFiltersFrom` and render (none); whether `loadPhotos` returns something for the ineligible (an empty page, as stated); whether the client's URL sync would rewrite `scope=class` away (no: client `scope` starts at `filters.scope` = "class").
Why it stands / falls: the comment promises the valley fallback and the code never performs it; the ineligible member gets a titled, empty Class Collection with a live Contribute that fails only at Add, after the full uploads.
Live check run: `SELECT count(*) total, count(*) FILTER (WHERE "batchYear" IS NULL) ..., FILTER (WHERE "verifyState" <> 'verified') ... FROM "User"` -> 572 users; 17 with no batch year, 3 unverified, 20 ineligible (was 17 of 223 at the audit).
Corrections to the finding: the live count (20 of 572). Medium stands.
Orchestrator action: none.

### T4b-06 — CONFIRMED (Medium)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `collection-client.tsx:288` (`facts` carries `roomLeft`), `:1737-1738` (`autoApproved={autoApproved}`, `roomLeft={roomLeft}` — the flat props); `facts.roomLeft` is read nowhere (grep). `collection-data.ts:232` (`autoApproved: isPhotoAutoApproved(...)`, one value). CORRECTED: the auto-approve rule is now `collection/actions.ts:574-577` (direct) and `:293-295` (fallback), was 556-559; the room's copy is `contribute-room.tsx:1050-1053` and `:1274-1278` ("An admin looks at new photographs before they appear.") and the Finish `:1340-1342` ("with an admin to look at").
What I tried to refute it with: whether the room reads the action's returned `autoApprove` for the Finish (it does not; only the prop); whether a class swap re-fetches facts (by design it does not).
Why it stands / falls: unchanged at HEAD. Both halves of the finding hold.
Live check run: `SELECT count(*) FILTER (WHERE "photoTrusted") FROM "User"` -> 0 of 572. So every non-admin member contributing to the class reads the review promise for photographs that are live to the class at once.
Corrections to the finding: "222 of 223" is now "every one of 572 non-admin members (0 trusted)".
Orchestrator action: none.

### T4b-07 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: CORRECTED within a few lines: `setListFor` `collection-client.tsx:1297-1312`, `patch` `:1351-1356`, `handleToggleLove` `:1376-1389`, `onSaved` `:1751-1754`, `forget` `:1393-1415` (writes held, `photos`, both queues, `linked`); `use-engagement.ts:80` (`settledHeart(before, result.liked ?? result.loved)`) — correct. `togglePhotoLove` revalidates nothing (`actions.ts:1004-1030`), so no server answer repairs the river's copy.
What I tried to refute it with: whether the feed card still lands in the `linked` strip — yes, `collection-module.tsx:145` still links `/collection/${photo.id}` (since `44ceac73` it may be the pinned Cave Rock photograph, which is in the river too); whether `patch` touches `linked` for "main" or vice versa (no).
Why it stands / falls: one row lives in two strips, `patch` writes one, and the heart adopts the server row, so the next tap from the stale strip inverts the member's real state. Medium stands.
Live check run: none.
Corrections to the finding: line numbers only.
Orchestrator action: none.

### T4b-08 — REFUTED (main claim; residual belongs to L5)
Verdict: REFUTED
Confidence in verdict: certain (the orchestrator's live run, 2026-09-27 02:58 BST)
Citations re-derived: `collection-client.tsx:372-419` (URL sync, `replaceState` `:418`) — line-identical. The component's own comment at `:199-203` ("one RSC GET per `loadPhotos` call, `navigateToUnknownRoute` in the trace") contradicts the live observation and is now itself stale (an L9 note, or a measurement of an older Next/PostHog patch state).
What I tried to refute it with: (accepted the orchestrator's run) pressing "Birds" produced exactly one request, the action `POST /collection?bucket=birds`, and no `GET ...&_rsc=` in the following 7 s. Read `server-action-reducer.js:74`: actions POST to `state.canonicalUrl`, which the patched `replaceState` keeps current — which is why the POST carries the new query string, and which matters for T4b-12.
Why it stands / falls: the "whole page rendered a second time" consequence does not happen on `/collection`. What remains: the three queries per first page (page + rail `groupBy` + the full geometry select with no `take`) — T4a's lead, L5's to size at 2,000 members — and, unverified live, the `/collection/<id>` case: the first filter write there changes the PATH, which the component's own comment (`:386-391`) says Next treats as a navigation to the other route (one extra render and a remount, once per permalink visit).
Live check run: the orchestrator's (above).
Corrections to the finding: REFUTED as filed; record the residual as a Low under L5 (geometry select) and an unverified Low for the permalink route's first filter write; add `:199-203` to the L9 comment list.
Orchestrator action: optional — one network-tab look on `/collection/<id>` after a bucket press to settle the permalink residual.

### T4b-09 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `collection-client.tsx` line-identical: `seekTo`'s geometry branch `:980-994` (scroll only, `seekBand` untouched by design), the only `setSeekBand(key)` `:1003`, mount seeding `:142-152` (`firstPage.above` dropped: `photos` starts at `firstPage.photos`), the query effect's mount guard `:777` (`if (seeded.current === fetchPage) return;`), `landOn` set only at `:862` inside that effect, the landing effect `:1173-1188`. `collection-data.ts:72-90` (`when` -> band) and `:97-103` (forces `taken`) — correct within a line.
What I tried to refute it with: any mount-time landing for `filters.band` (none: `landOn` is only written by the query effect, which skips on mount); the URL effect reading `activeBand` (it reads `seekBand`, `:415`).
Why it stands / falls: a shared year link lands at the head of the river, and after a geometry seek the address keeps the previous year. Low stands.
Live check run: none.
Corrections to the finding: line numbers within a line; order names as noted under T4b-01.
Orchestrator action: none.

### T4b-10 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism; cost argued
Citations re-derived: `photo-river.tsx:75-83` (`warmThumbs(photos, count = 12, patience = 450)`), `collection-client.tsx:514`, `:905`, `:1066` (each `warmThumbs(data.photos, data.photos.length, 0)`) — correct; `actions.ts` `take: 600` is now `:998`.
What I tried to refute it with: whether `count` caps internally (no, `slice(0, count)` with `count = length`); whether the tile's `loading="lazy"` limits the fetch (the warm builds its own `Image()` per photograph, so lazy loading is bypassed for the whole year).
Why it stands / falls: reaching 2022 starts 465 thumbnail fetches and decodes at once (largest year live: 465). Low: a phone-memory and data cost at the class ceiling, not measured.
Live check run: largest band 465 (see T4a-02).
Corrections to the finding: none.
Orchestrator action: optional heap snapshot on a phone viewport.

### T4b-11 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `docs/OPERATIONS.md:36-40` ("the Collection's phone scrubber, which is a timer rather than a state", `:38`) — still present at HEAD despite two later OPERATIONS commits (`1e5f9887`, `1e2905ce`) that added content elsewhere. `e2e/visual.spec.ts` scrubber mask comment ~`:101` — correct.
What I tried to refute it with: a timer in `photo-scrubber.tsx` (none; its only lifetimes are one rAF, a scroll listener, a ResizeObserver and the `has-scrubber` class).
Why it stands / falls: a doc lie, one sentence to fix.
Live check run: none.
Corrections to the finding: none.
Orchestrator action: none.

### T4b-12 — CONFIRMED-CORRECTED (Low; consequence re-stated)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: likely (431 on the GET proven live by the orchestrator; the POST path read in Next's source, not run)
Citations re-derived: `search-pill.tsx:230-231` (no `maxLength`) — correct; `collection-client.tsx:293-294`, `:356-370` (debounce, `setSearch(searchInput)` unsliced), `:414` (`q.set("q", search)`), `:418` (`replaceState`) — correct; `collection/actions.ts:667` `MAX_SEARCH = 100`, applied at `:679`.
What I tried to refute it with: the finder's route to harm went through T4b-08's RSC GET, which is refuted. But Next posts every server action to `state.canonicalUrl` (`node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:74`), and the patched `replaceState` keeps that URL current — the orchestrator saw the action go to `POST /collection?bucket=birds`. The URL-sync effect is declared before the query effect, so it writes first. The orchestrator's probe: `GET /collection?q=<20,000×b>` -> **431** from Node before the app runs; 8,000 -> 200.
Why it stands / falls: so a search long enough to push the request line past ~16KB (Vercel's own URL limit is ~14KB) makes the search's own `loadPhotos` POST, and every later action from that page (band loads, hearts, Load more), fail before the app runs; `callAction` shows "That did not go through. Check your connection and try again." until the search is cleared, and the address bar holds a link that cannot be opened. URL-encoding multiplies non-ASCII: a Tamil or Devanagari character is 9 bytes as `%XX%XX%XX`, so ~1,600-1,800 pasted Indic characters reach it. Still Low: rare input, recovered by clearing the box.
Live check run: the orchestrator's (above).
Corrections to the finding: consequence re-stated (the action POSTs to the long URL, not an RSC GET); fix unchanged (`maxLength={100}` on the live pill and `slice(0, 100)` before `setSearch`, so the URL can never carry more than the server reads).
Orchestrator action: optional — paste 20,000 characters into the Collection search on the throwaway account and watch for the 431 POST and the toast.

### T4b-13 — DOWNGRADED to Low (orchestrator re-ruled live)
Verdict: DOWNGRADED to Low
Confidence in verdict: certain
Citations re-derived: `image-viewer.tsx:452-491` (the `window` keydown listener; `+`/`=`/`-`/`_`/`0` at `:465-467`, arrows `:468-469`, the Tab trap `:470-487`), `:715-718` (`chromeClass`: hidden chrome is `pointer-events-none opacity-0`, still focusable) — line-identical at HEAD. Base UI `node_modules/@base-ui/react/esm/dialog/popup/DialogPopup.js:91-95` stops propagation of `COMPOSITE_KEYS` (arrows, Home, End; `composite/composite.js:3-12`) at the popup — confirmed on disk.
What I tried to refute it with: (accepted the orchestrator's live run as Jerry, nothing saved) arrows never reach the viewer while the edit dialog has focus, and Tab stayed inside the dialog (the modal focus manager wins over the viewer's `first.focus()`). The "Save leaves you on a different photograph" consequence is REFUTED for this path (T4b-01's is the real one).
Why it stands / falls: what survives is small: `+ = - _ 0` typed into the description or the year (e.g. "1970") zoom or refit the photograph behind the scrim; and, separately, when a tap has put the chrome "off" (a keydown nudges only "idle" back to "shown", `:499-518`), Tab still reaches the invisible Close/Download/Edit buttons. Low.
Live check run: the orchestrator's.
Corrections to the finding: severity High -> Low; fix narrows to an editable-target / `defaultPrevented` early return in `onKey` and `inert` (or `visibility: hidden`) on chrome that is off.
Orchestrator action: none.

### V-T1-02 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain (code)
Citations re-derived: `src/lib/collection-intake.ts` byte-identical at HEAD: the comment `:96-97` ("Set as soon as each PUT lands, so the catch below knows what it has to clean up"), `:126-131` the raw `Promise.all([putImage(...), gridThumb(original).then(putImage ...)])`, `:133-134` the assignments only after both resolve, `:151-167` the catch queuing only what was assigned. `src/lib/image-purge.ts:82-104` `putAllOrNone` (its docblock names exactly this failure); its only user is `collection/actions.ts` (two calls). The gate `src/lib/image-purge-rule.test.mjs:182-186` reads `collection/actions.ts` alone.
What I tried to refute it with: whether `getImageBuffer`/`gridThumb` failing first leaves nothing stored (true — then nothing to orphan; the orphan needs the full copy's PUT to land and the thumbnail branch to fail, or vice versa); any other writer with the same unpaired shape (grep of every `putImage(` caller: `api/upload`, `api/upload/finalize`, `settings/actions.ts`, `link-preview.ts` each store ONE object; only the intake stores a pair outside `putAllOrNone`).
Why it stands / falls: a half-landed pair leaves an object under `collection/<id>/` with no row and no purge entry, and the comment says the opposite. Low (best-effort helper, rare trigger) — and today it is unreachable for the owner because T4a-01 returns before any copy; reachable for members.
Live check run: none possible (needs a failing PUT).
Corrections to the finding: none. Bundle with T4a-01 and V-T4a-A (one helper, one unit). Widen the C-064 sweep to every file under `src/` that calls `putImage`.
Orchestrator action: none.

### V-T4a-A — CONFIRMED-CORRECTED (Low; latent, no live rows)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (mechanism); severity likely
Citations re-derived: `collection-intake.ts:100` (`keyForUrl(url)` of the POST's image), `:105` (`getImageBuffer(key)`), `:126-127` (`putImage(original, ...)` stores those bytes verbatim). The post's object is the feed's display copy from `/api/upload/finalize/route.ts:130` (`toDisplayWebp`), `src/lib/image.ts:34-50` ("boxed to 1920, WebP at 80"); finalize deletes the staged original (M12), so nothing larger exists when the tick runs.
What I tried to refute it with: a deliberate decision on record — the helper's header (`:23-29`) deliberately copies "the bytes already in storage", but only to keep the two rows independent, and says nothing about size; `docs/spec/media.md:126-132`'s storage table lists the direct path (full resolution) and the fallback (2048px, the member told since 9c992844) and omits this third path entirely, mentioning it only as having no screen copy (`:132`). Memory/TRAPS: the Collection stores full resolution; `toDisplayWebp`'s 1920px box is the FEED's.
Why it stands / falls: a ticked photograph enters the archive at 1920px q80, the only Collection path that is both smaller than the archive's standard and silent about it (the fallback now says "saved smaller"). CORRECTION to the lead: it is not a "second-generation" re-encode — the bytes are copied verbatim, so it is the feed's first-generation 1920px q80 encode. Low: no photograph has ever entered this way (see below), the tick is a convenience the owner asked to be unobtrusive, and a fix needs the composer to keep or re-stage the original, which is a design change.
Live check run: `SELECT ("sourceKey" IS NULL), count(*), max(GREATEST(width,height)), count(*) FILTER (WHERE GREATEST(width,height) <= 1920), count(*) FILTER (WHERE "screenUrl" IS NULL) FROM "Photo" GROUP BY 1` -> 9 rows with no `sourceKey`, all <= 1600px and no screen copy (the old 1600px fallback); none is a 1920px tick copy. The tick has never produced a Collection row (for the owner it cannot, T4a-01).
Corrections to the finding: "second-generation WebP" -> "the feed's 1920px q80 copy, byte for byte"; add the media.md table gap; fix direction: either have the composer request a Collection-grade copy at finalize time (from the staged original, before it is deleted), or say it out loud the way the fallback does, and document the path in media.md either way.
Orchestrator action: none.

### V-T4a-B — REFUTED
Verdict: REFUTED
Confidence in verdict: likely
Citations re-derived: `src/components/posts/use-composer-uploads.ts:187` (`const remaining = MAX_IMAGES - shots.length;`) — correct (file unchanged since the audit); `MAX_IMAGES = 3` at `src/lib/upload-ownership-rule.ts:15`; the server's "Up to 3 photos." at `:63-64`.
What I tried to refute it with: every way files reach `handleImageFiles`. Its one caller is `AttachImageDialog`'s `onFiles` (`create-post-form.tsx:934`); the composer has no drop or image-paste handler of its own (its `onPaste` inserts plain text, `:451-452`). Inside the dialog: click-to-browse (`onChange`) and drop (`onDrop`) are React handlers, dispatched against the fiber's CURRENT props, and a discrete event's updates (here `setShots` runs synchronously before the first `await`, `:214`) are flushed before the next discrete event — so the second drop runs the new closure with the new `shots`. Paste goes through a document listener via `deliverRef`, updated in a passive effect; React 18 flushes passive effects synchronously after a discrete-input render, and the listener is removed anyway because the dialog closes after every delivery (`attach-image-dialog.tsx:234-236`, `onFiles(files); onOpenChange(false);`), so a second delivery needs the dialog reopened (a click, a render). The photo button is `disabled` at `previews.length >= MAX_IMAGES` (`create-post-form.tsx:960`).
Why it stands / falls: the stale read needs two deliveries inside one render, which no shipped path produces. The defensive version (`setShots` with a functional cap, or reading a ref) costs nothing, but there is no member-visible bug.
Live check run: none.
Corrections to the finding: REFUTED; optional hygiene only.
Orchestrator action: none.

## New candidates

### V-T4-01 — A contributor whose email is unconfirmed gets the confirm-your-email dialog AND a toast telling them to "try again in a moment"
- Severity: Low (contradictory copy; nothing lost — `done === 0` keeps the wall)
- Confidence: certain (code)
- Where: `src/components/collection/contribute-room.tsx:822` (`if (emailGate.handled(message)) break;` — breaks WITHOUT pushing a failure), then `:844-847` (`if (done === 0) { toast.error(failures[0] ?? "Nothing could be added just now. Try again in a moment."); return; }`); the gate: `src/components/auth/verify-email-dialog.tsx:51-64` (`handled` opens the dialog on `EMAIL_UNVERIFIED`/`MEMBER_UNVERIFIED`); the refusal: `collection/actions.ts:170` / `:433` (`requireVerifiedMember`). On the way there the presign is refused too (`src/lib/api-gate.ts:68-70`, 403), which `attemptDirectUpload` reads as `"unavailable"`, so every photograph sits on the wall as "here" with no key and the first Add shrinks one in the browser before the action refuses.
- Taxonomy: 6a (the error path reaches a fallback message meant for an unknown failure), 6h identity states (unconfirmed email), L9-adjacent copy
- Expected: one answer, the gate's ("confirm your email first").
- Actual: the gate dialog opens and, beside it, a red toast says "Nothing could be added just now. Try again in a moment." — the wrong advice (waiting will not help) on top of the right one.
- Fix direction: `return` after a handled gate (skip the done/failure toasts), or push nothing and guard the `done === 0` toast on `failures.length > 0`.
- Gate: a source pin that the handled-gate branch exits `fileAll` before the toasts.
- Known-related: T4b-03 (the same post-loop block); the email gate work in `d7a8041d`.

## Cross-zone notes
- **T8b-01 (V-T8)**: T4b-02 folded as DUPLICATE; its Back -> Cancel -> Back reproduction is the canonical scenario.
- **L9 (comment lies)**: add `src/lib/collection-image.ts:119-121` ("`exifStamp` has already refused anything that is not a date this archive would file" — it only range-checks; T4a-04), `src/components/collection/collection-client.tsx:199-203` ("one RSC GET per `loadPhotos` call" — contradicted by the orchestrator's live run; T4b-08), and `prisma/schema.prisma:528` (the Group residue note, T4a-10's fourth stale "still in both databases").
- **Owner questions**: Q8 / C ("does R2 have a lifecycle rule on `staging/`?") can be answered from the repo: `docs/history/progress-2026-09.md:8431` says "it was never added". T4a-06's weight needs one owner check: does `.env.demo` hold `R2_*` keys (count only)?
- **T2b / L11**: since 2026-09-27 the voice recorder also stages under `staging/` (`/api/upload/audio`), so T4a-03's missing rule covers abandoned recordings too; the media backup copies whatever sits in `staging/` (L11's ~330).
- **L6 / O-06**: T4b-12's real consequence generalises — Next posts every server action to `state.canonicalUrl` (`server-action-reducer.js:74`), so ANY page that writes an unbounded value into its own URL makes every later action on that page fail with a 431/414 before the app runs. The Collection search is the one unbounded writer I found; the directory's search is router-driven (its own GET would 431 the same way on a long paste).
- **L5**: T4b-08's residual (page + rail `groupBy` + the full geometry select with no `take`, per first page) is L5's to size; the permalink route's first filter write (path change) is an unverified extra render.
- **T1 / leads-routed.md:130** (erasePhoto never clears other members' `User.coverPhoto`): MOOT — no application code writes `coverPhoto` (only `/lab` rooms and the export route read it) and the live count is 0 (`SELECT count(*) FILTER (WHERE "coverPhoto" IS NOT NULL) FROM "User"` -> 0).
- **T4a-01 / V-T1-02 / V-T4a-A** are one helper (`collection-intake.ts`): fix them as one unit.
- **Scripts (T4a-04/T4a-11)**: `70e4a0c6`'s `--review` + sender-date mode files the right year in the columns but still writes the scan date into the stored copy as DateTimeOriginal (`import-album.mjs:480`), so the 17 Santharam photographs' downloads carry the scan stamp if their files had one.

## Coverage
- Checked completely at HEAD 88642426 (every citation re-derived, every refutation attempted): T4a-01, T4a-02, T4a-03, T4a-04, T4a-05, T4a-06, T4a-07, T4a-08, T4a-09, T4a-10, T4a-11, T4a-12, T4a-13, T4a-14, T4b-01, T4b-02, T4b-03, T4b-04, T4b-05, T4b-06, T4b-07, T4b-08, T4b-09, T4b-10, T4b-11, T4b-12, T4b-13, V-T1-02, V-T4a-A, V-T4a-B.
- Partially checked, and why: T4a-06 (whether `.env.demo` carries `R2_*` keys is deny-listed for this session; ruled on the demo spec, with the one-line owner check written down); T4b-08's permalink residual and T4b-12's POST-431 (no browser; argued from Next's source and the orchestrator's live probes); T4b-10's memory cost (unmeasured).
- Files read at HEAD for this zone: `src/lib/collection-intake.ts` (whole), `src/app/(main)/collection/actions.ts` (99-121, 162-321, 325-346, 385-615, 633-680, 955-1030, 1049-1284), `collection-data.ts` (60-246), `src/components/collection/contribute-room.tsx` (226-325, 580-640, 700-882, 955-1060, 1268-1346), `collection-client.tsx` (136-155, 196-254, 285-370, 372-419, 498-578, 776-886, 955-1012, 1168-1192, 1290-1420, 1730-1756), `contribute-stage.tsx` (296-312), `src/components/common/image-viewer.tsx` (267, 339-393, 448-545, 706-718, 805, 833), `src/lib/upload-client.ts` (9c992844 diff), `upload-shared.ts` (25-52, 262-280), `exif-date.ts` (125-159), `collection-image.ts` (110-131), `collection-photo.ts` (125-232), `taken-date.ts` (296-345), `photo-visibility-rule.ts` (120-200), `river-geometry.ts` (180-235), `image-purge.ts` (78-104), `image-purge-rule.test.mjs` (172-190), `rate-limit.ts` (112-134), `api-gate.ts` (52-101), `demo.ts` (allowlist), `demo-seed/seed.ts` + `content.ts` (photo owners), `scripts/dev/_env.mjs` (whole), `import-album.mjs` (40-165, 225-395, 470-485), `backfill-screen-copies.mjs` (30-90, 110-166), `api/photo/download/route.ts` (70-90), `api/upload/presign/route.ts` (12-20, 78-96), `ui/dialog.tsx` (1-40), `use-composer-uploads.ts` (150-276), `attach-image-dialog.tsx` (100-245), `create-post-form.tsx` (920-961), `verify-email-dialog.tsx` (51-81), `docs/spec/media.md` (122-170), `docs/spec/demo.md` (15-25, 100-150), `docs/TRAPS.md` (285-300), `docs/OPERATIONS.md` (36-40), `docs/history/progress-2026-09.md` (8424-8431), Base UI `DialogPopup.js` (85-98), Next `server-action-reducer.js` (74).
- Live read-only SQL run (2026-10-23): Photo counts by role/scope/account; largest year bands; special indexes and dropped columns; class-eligibility and `photoTrusted` counts; exif-vs-filed-year disagreements (3); `sourceKey`-less rows and their sizes (9, all <= 1600px); `coverPhoto` count (0).
- Tally: CONFIRMED 6 (T4a-13, T4a-14, T4b-06, T4b-10, T4b-11, V-T1-02), CONFIRMED-CORRECTED 15 (T4a-01, -02, -03, -07, -10, -11, -12, T4b-01, -03, -04, -05, -07, -09, -12, V-T4a-A), DOWNGRADED 3 (T4a-04 Medium->Low, T4a-06 Medium->Low, T4b-13 High->Low), REFUTED 4 (T4a-08, T4a-09, T4b-08, V-T4a-B), DUPLICATE 1 (T4b-02 = T8b-01), FIXED-SINCE 1 (T4a-05, 9c992844), MOOT-SINCE 0 (30 rulings). New candidates 1 (V-T4-01, Low).
STATUS: COMPLETE at HEAD 88642426

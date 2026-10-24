# V-T3 — adversarial validation of T3 (catchups surfaces: pages + client)
Validator: V-T3 · Started: 2026-10-23 · Model: Opus 5.5 (claude-opus-5-5)
Assignment: T3-01..T3-24 (reports/T3.md), plus the routed-lead rows naming T3. Re-baseline: the audit read 495ecdd2; every citation is checked at HEAD 88642426 (line numbers below are HEAD's).
Method: work/brief-validator.md, read-only (SELECT/EXPLAIN only, no browser, no sign-in, no git writes, no gates).

## Status board (updated as each verdict lands)
- T3-01 — FIXED-SINCE 592e3526
- T3-02 — FIXED-SINCE 1439c83a
- T3-03 — FIXED-SINCE 592e3526 (path then deleted by eb855c71)
- T3-04 — CONFIRMED-CORRECTED (Medium)
- T3-05 — CONFIRMED (Medium)
- T3-06 — CONFIRMED-CORRECTED (Medium)
- T3-07 — MOOT-SINCE eb855c71
- T3-08 — CONFIRMED-CORRECTED (Low)
- T3-09 — CONFIRMED (Low)
- T3-10 — CONFIRMED-CORRECTED (Low; wider than Catch-ups, see V-T3-01)
- T3-11 — CONFIRMED-CORRECTED (Medium, likely)
- T3-12 — CONFIRMED (Low)
- T3-13 — KNOWN (TRAPS, Tailwind v4 scale-*/translate-* entry)
- T3-14 — CONFIRMED (Low)
- T3-15 — CONFIRMED (Low, latent)
- T3-16 — DUPLICATE of T7b-03 (T7b-03 canonical; data half expired)
- T3-17 — CONFIRMED (Medium; owner question whether the drop was intended)
- T3-18 — CONFIRMED (Medium)
- T3-19 — CONFIRMED (Medium)
- T3-20 — MOOT-SINCE 5d5c6898
- T3-21 — CONFIRMED-CORRECTED (Low; now live)
- T3-22 — CONFIRMED-CORRECTED (Low)
- T3-23 — CONFIRMED (Low)
- T3-24 — CONFIRMED (Low)

## Verdicts

### T3-01 — FIXED-SINCE 592e3526
Verdict: FIXED-SINCE 592e3526 (2026-09-29, "fix(catchups): the Picture row opens the picker; Start it again asks to"). The finding was CONFIRMED at 495ecdd2 (orchestrator hand-verified; my re-read of `git show 592e3526` agrees: `SettingsDialogs` rendered only `confirm`/`edit`).
Confidence in verdict: certain
Citations re-derived (HEAD): the row is now `settings-surface.tsx:240-246` (`opens: c.canChangePicture ? { shape: "picture" } : undefined`); `SettingsDialogs` at `:877-937` now mounts `<PicturePickerDialog open={open?.shape === "picture"} onOpenChange={(o) => !o && onClose()} catchupId={c.catchupId} picture={c.picture} onChanged={() => router.refresh()} />` at `:908-914` (the `onChanged` refresh at `:913`); the import is `:103`. `PicturePickerDialog` (`home/picture-picker-dialog.tsx:74`) takes exactly `open/onOpenChange/catchupId/picture/onChanged`, and `SettingsCatchup.picture` exists (`settings/types.ts:44`). `grep -rn PicturePickerDialog src` outside the lab: the definition and this one importer.
What I tried to refute the fix with: a prop mismatch (none; the picker's own `useEffect` re-reads `picture` on open, `:101-105`); the picture dialog being nested inside the other `Dialog` (it is a sibling in a fragment, so the two never stack); a row that still sets a shape nobody reads (the `Opens` union is `confirm | edit | picture`, all three now handled).
Why it falls: the dead branch is wired; the comment at `:871-876` ("it opens the picker that shipped in build phase 3") is now true.
Live check run: none needed (the commit message records a browser check at 1440 and 390).
Corrections to the finding: none for the fix session; note for L9 that `setCatchupPicture` never purges a replaced uploaded picture (leads-routed L12 row, `actions.ts:715` at HEAD) is now REACHABLE, because the picker is mounted: that lead should be ruled on its own (see Cross-zone notes).
Orchestrator action: none.

### T3-02 — FIXED-SINCE 1439c83a
Verdict: FIXED-SINCE 1439c83a (2026-09-27, "fix(catchups): a library photo or songs question is asked as one again"). CONFIRMED at 495ecdd2 (orchestrator hand-verified `collecting.tsx:84` sent no `category`).
Confidence in verdict: certain
Citations re-derived (HEAD): `home/collecting.tsx:75` holds `category` state; `:89-92` `updateText` drops it when the box is blanked; `:99-101` `submitPrompt({ editionId, text: body, category, showAsker: !anon })`; `:181-185` the library pick sets both text and category; `:219` `onPick: (text: string, category: PromptCategory) => void`, `:239` `onClick={() => onPick(text, set.id)}`. Server: `catchups/actions.ts:158` (`category: promptCategorySchema.optional()`), `:834`, `:901-902` (`category: category ?? null, source: keeper ? "keeper" : category ? "library" : "member"`). `promptKind` (`catchups-types.ts:92-96`) still maps `photo-wall` → photo and `songs` → songs (the `vote` branch is gone with 5d5c6898); both sets still exist in `CATCHUP_PROMPT_SETS` (`catchups-core.ts:233`, ids at `:269`, `:281`).
What I tried to refute the fix with: a second caller of `submitPrompt` without a category (none in `src/components`); the category surviving onto an unrelated fresh question (blank text clears it); the server refusing the id (it parses through `promptCategorySchema`). `node --test src/lib/catchup-library-pick-rule.test.mjs`: 3/3 pass at HEAD.
Why it falls: the set id now rides the pick to the row. The fix keeps the category when the member edits the prefilled words (the owner's call T3 left open), which is documented at `:80-88`.
Live check run: `node --test src/lib/catchup-library-pick-rule.test.mjs` → pass 3, fail 0.
Corrections to the finding: none. Consequence for T3-21: the photo wall is now REACHABLE, so T3-21's "unreachable today" no longer holds (see T3-21).
Orchestrator action: none.

### T3-03 — FIXED-SINCE 592e3526
Verdict: FIXED-SINCE 592e3526 (the on-hold card's "Start it again" opened the settings confirm `{ shape: "confirm", key: "resume" }` instead of `router.refresh()`). The held state itself is then gone: eb855c71 (2026-10-17, "Editions start by hand: no rhythm, no hold, Start for anyone") deleted pause/resume, the rhythm and the on-hold card. CONFIRMED at 495ecdd2 (orchestrator hand-verified `catchup-home.tsx:194`).
Confidence in verdict: certain
Citations re-derived (HEAD): `home/catchup-home.tsx` has no "on hold" card, no `data-resume`, no `onResume`. What stands in that slot is the idle branch `:200-225`, whose pill calls `onStart` → `s.panel.onOpen({ shape: "confirm", key: "start" })` (`:277-281`), and `useSettings.confirm` handles `"start"` with `startEdition(c.catchupId)` (`settings-surface.tsx:820-821`). `grep -rn "resumeCatchup\|data-resume" src` outside the lab: nothing.
What I tried to refute the fix with: whether the new Start pill repeats the old fault (a click wired to the refetch): it does not, it opens a confirm whose `onDo` calls `startEdition`.
Why it falls: fixed, then the code path deleted; the successor control carries the fixed shape.
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T3-04 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands)
Confidence in verdict: certain
Citations re-derived (HEAD; answer-card.tsx grew a voice recorder in 9e6721df, so every line moved): `answer/answer-card.tsx:60` (`savedRef = useRef(entry.body)`), `:97-102` (`flushBody`: `:99` returns when `value.trim() === savedRef.current.trim()`, `:100` advances `savedRef` BEFORE the save, `:101` `onBodyBlur(value)`), `:193-198` (the comment promising "blurring the field again retries"), `:205-209` (the line "Not saved. Click away and back to try again."). `answer/answer-experience.tsx:141-146` (the `{ error }` branch: toast + `saveStatus` "failed", nothing rewinds the card's ref; was `:137-143`). The server's refusals at HEAD: `catchups/actions.ts:1593-1595` ("closed") and `:1596-1600` ("stale"; was `:1918-1926`). NEW callers of the same `flushBody` since the audit: the voice recorder's `onTranscript` (`answer-card.tsx:83-91`, calls `flushBody(next)`) and the songs field (`:173`, `onCommit={flushBody}`), so a failed transcript save is equally un-retryable.
What I tried to refute it with: a reset of `savedRef` on failure (none; the parent never passes `saveStatus` into the comparison, it is only rendered); `RichTextArea.onChange` resetting the ref (it only calls `setBody`, `:155`); a remount on revisiting the question (the remount re-seeds `savedRef` from `entry.body`, which `handleBodyBlur` already set to the unsaved text, `answer-experience.tsx:158-161`, so still no send); Next/Share (`flushBody()` bare, `:226`, same early return).
Why it stands: `savedRef` records what was SENT, not what the server ACCEPTED, so the retry the red line promises is a no-op unless the text changes. Correction to the consequence: two of the refusals the finding lists cannot succeed on retry anyway ("closed" and "stale", whose own sentence says "Reload the page"); the real victims are the transient ones (a dropped connection, deploy skew, an expired session through `callAction`'s generic sentence), where a retry WOULD land. In those cases the red line lies and, if the member then leaves the page, the paragraph is lost. Live today: Batch of 2024 is `answering` until 2026-10-25 07:00 IST (44 members), so the surface is in use.
Live check run: `SELECT ... FROM "CatchupEdition" WHERE status='answering'` → one row, Batch of 2024, closes 2026-10-25 01:30 UTC.
Corrections to the finding: line numbers above; Actual: drop "stale"/"closed" as examples of a retry that should work (they are refusals the line should not invite a retry for at all: the line should say "Reload" for those and "try again" only for transient failures); add the transcript and songs paths to Where.
Orchestrator action: optional browser proof on a throwaway answering Edition (offline toggle, blur, online, blur → no request in the network list).

### T3-05 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: likely (mechanism certain from source; the visible outcome needs one browser press)
Citations re-derived (HEAD): `answer/completion-card.tsx:55-57` (`<Link href={`/catchups/${catchupId}`}>` "Back to the Catch-up") correct; `answer/answer-experience.tsx:56` (`index` state) and `:60` (`current = index < total ? prompts[index] : null`), the card at `:254` (was `:55-59` / `:241`); `home/catchup-home.tsx:248-256` (answering is drawn ON the home, `<AnswerExperience>` with no `key`; was `:221-229`); `[catchupId]/answer/page.tsx:28-35` (the 308 shim; was `:26-35`).
What I tried to refute it with: a `key` on `AnswerExperience` that would remount it on the refetch (none); the `(home)/loading.tsx` boundary flashing and remounting the subtree on a same-URL navigation (the navigation is a transition, and Next 16.3.8's `ppr-navigations.js:158-174` refetches the leaf on a same-page navigation while CARRYING the old node's `bfcacheId`, so the segment keeps its state identity — the finder's reading holds on the bumped Next version); `@/components/common/link` changing semantics (it only defaults `prefetch={false}`, 19be10b0).
Why it stands: the one primary pill on the end screen navigates to the URL the member is already on, and the client state that put the card there survives. At best a refetch; the card stays.
Live check run: none possible read-only (a browser press).
Corrections to the finding: line numbers above; none to severity or fix.
Orchestrator action: on a throwaway answering Edition, answer the last question, press "Back to the Catch-up", observe URL unchanged and the card still showing (with T3-18, use an Edition where every question is answered).

### T3-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands; population widened since the audit)
Confidence in verdict: certain on mechanism; likely that it is hit
Citations re-derived (HEAD; settings-surface.tsx lost 168 lines in eb855c71, so all moved): `settings/settings-surface.tsx:791-806` (`pick`): `:792` `setRow(null)`, `:796` the reminders `next === was` guard, `:801-805` the extend branch with NO such guard (`setExtended(days); await run(() => extendDeadline(...))`). The rhythm pill the finding contrasted with is DELETED (eb855c71), so reminders is the one contrast left. `Pills` `:323-361`, `aria-pressed={on}` `:342`, Canopy fill when `o.value === at` — the picked extend pill stays pressed and pressable. The row line `:187-196` (`extended ? `${labelOf("extend", extended)} more` : ...`). `extended` state `:762`, never re-synced from props (only `reminder` and `name` are, `:771-772`). Server: `catchups/actions.ts:1282-1339` (`extendDeadline`), docblock `:1266-1281` (the "two Keepers each tapping … the second one loses" claim at `:1275-1277`), CAS `:1308-1314` on the deadline `loadKeeperEdition` read in the same request; `extendPhasePatch` anchors on the CURRENT deadline (`catchups-core.ts:806-820`).
What I tried to refute it with: a server-side guard against the same `days` twice (none; no expected-deadline parameter); a cap on total extension (none in `extendDeadline` or `extendPhasePatch`); the row folding hiding the pill (it does fold, `:792`, but reopening shows "A week" still pressed).
Why it stands: every successful tap adds the full extension again, the row keeps naming one extension, and the server CAS cannot catch a stale second tap because it compares against its own fresh read.
Live check run: none needed (the Edition in flight is a real batch; no write allowed).
Corrections to the finding: (1) line numbers above. (2) WIDER POPULATION: since daec81ec (2026-09-27, "everyone in a batch runs its Catch-up") `extendDeadline` passes `allowBatch: true` (`:1290-1294`, the flag at `:1293`) and the settings row is drawn for `canRun = isKeeper || isBatch` (`(home)/page.tsx:477`), so on a batch Catch-up EVERY member holds the pill, and the "two Keepers on stale copies" case is now "any two of 44 members". With no cap on total extension, repeated taps push the deadline without bound. (3) `extended` also survives an Edition change in the same session (eb855c71's Start keeps the home mounted), so a new Edition's row can open saying the previous Edition's "A week more". Fix direction stands, plus: reset `extended` when `c.editionId` changes, and consider a ceiling on total extension per Edition now that a whole batch holds the control (owner call).
Orchestrator action: none required; a throwaway-Catch-up press-twice and a `SELECT "answersCloseAt"` before/after would make it live.

### T3-07 — MOOT-SINCE eb855c71
Verdict: MOOT-SINCE eb855c71 (2026-10-17, "Editions start by hand: no rhythm, no hold"). The finding was right at 495ecdd2 (the state line for `published` printed "The next one opens …" from `Catchup.nextOpensAt`, read before `advanceEdition` stamped it).
Confidence in verdict: certain
Citations re-derived (HEAD): `Catchup.nextOpensAt` is out of the Prisma model (`prisma/schema.prisma:1089-1094`, the column awaiting `2026-10-17-drop-rhythm-columns.sql`); `homeStateLine` (`catchups-core.ts:1210-1229`) now takes only `catchupStatus` and the Edition's `status`/`answersCloseAt`, and returns `null` for `published`; the home passes it `freshLatest` (re-read after the advance, `(home)/page.tsx:450-456`). The one Catch-up-row field it still reads is `status`, which `advanceEdition` never writes.
What I tried to refute the mootness with: any other field on the cached `loadCatchup` row that the advance can change and the page prints (none: `title`, `pictureSrc/Focus`, `status`, `createdById`, `inviteToken`; the advance writes Editions and bells only).
Why it falls: the stale field and the line that printed it are both gone.
Live check run: none needed.
Corrections to the finding: n/a. The sibling lead (T3 report, Leads, "T8b / L2": the first home view after `nextOpensAt` drawing the old cover) is moot for the same reason — nothing opens Edition N+1 on a clock any more; only the comment overclaim in `(main)/layout.tsx:55-67` remains (L2/L9's).
Orchestrator action: none.

### T3-08 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived (HEAD): `(home)/page.tsx:201-209` (the `distinct: ["authorId"]` read while `answering`) and `:281` (`answeredAuthorIds` on the view) correct; `home/types.ts:68-69` correct; `countdownLabel` `(home)/page.tsx:269-279` and `types.ts:64-65` (the field at `:65`; was `:270-280`). `grep -rn "answeredAuthorIds\|countdownLabel" src` outside the lab: only the page that writes them and the type — no reader. The third dead field the finding named, `CatchupHomeData.nextOpensAt` (`types.ts:89-92`), is GONE (eb855c71).
What I tried to refute it with: a reader anywhere in `src/components/catchups/**` (none); Prisma pushing `distinct` to SQL (the generator block `prisma/schema.prisma:1-4` enables no `nativeDistinct`, so the engine fetches every matching row and de-duplicates in memory, as the finding says).
Why it stands: a per-view query and two payload fields with no consumer, during the one week the home is busiest. Live, the answering Batch of 2024 Edition has 12 wall/songs answers plus its text answers; the cost is small today and grows with members x questions.
Live check run: none needed beyond the grep.
Corrections to the finding: drop `nextOpensAt` from the dead-field list (deleted); line numbers above.
Orchestrator action: none.

### T3-09 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived (HEAD): `src/app/catchups/join/[token]/page.tsx:63-72` (select: `group: { select: { name: true, _count: ... } }`, no `title`), `:133` (`{catchup.group.name}` in the `<h1>`), `:149` (`<AcceptInvite ... groupName={catchup.group.name} />`) correct; `join/accept-invite.tsx:42` correct; `renameCatchup` is now `catchups/actions.ts:656-678` and still writes only `Catchup.title`; the not-member card is `(home)/page.tsx:537-543` (``Join ${result.groupName}``) fed from `:124` (`groupName: catchup.group.name`) (was `:518-530`, `:123`).
What I tried to refute it with: creation writing the display name into `Group.name` so the two never diverge (true until a rename: `createCatchupWithPeople` writes `Group.name = name`, `title` null, `actions.ts:519-540`; the rename then diverges them); any other spelling path on the join page (none).
Why it stands: three surfaces print the group's original name after a rename. Reach is narrow: the join page needs a pre-2026-09-09 link (T3-17) and the not-member card needs a non-member who has the URL.
Live check run: none needed.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### T3-10 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands for the Catch-ups instance; the same viewer path also prints feed posts raw, filed as V-T3-01 so the fix is one unit)
Confidence in verdict: certain
Citations re-derived (HEAD): `edition/reader-parts.tsx:266-272` (`shots = images.map(... caption: entry.body ...)`, the `caption` at `:269`) correct; `lib/photo-wall.ts:63` (`caption: entry.body`) correct; `edition/photo-run.tsx:233` (`caption: s.caption`; was `:228-236`); `common/image-viewer.tsx:710` (`const caption = current?.caption?.trim() ?? ""`), `:1059` and `:1070` (`{caption}` as a text child of a `<p>`) correct; the tile renders the same body through `renderRichText` at `reader-parts.tsx:176` correct.
What I tried to refute it with: a markdown-to-text pass anywhere between the entry and the viewer (none; `rich-text.ts` exports only `MENTION_PATTERN`, `mentionedUserIds`, `renderRichText`); the viewer rendering rich text (it prints a string).
Why it stands: one field, two renderings in one Edition. Correction to the consequence: on a WALL question the answering surface has no writing field (`answer-card.tsx:168-170`), so wall answers carry an empty body and the viewer shows no caption at all; the live wall answers (6 on the answering Batch of 2024 Edition) all have `body_len = 0`. The raw-marker case is the ordinary TEXT answer that carries photographs, whose tile renders and whose viewer does not. Live today no published answer with photographs uses a marker (`SELECT ... body ~ '\*\*|_..._|__|~~'` over `CatchupEntry` with images → 0), so it is latent.
Live check run: `SELECT count(*) FILTER (WHERE images IS NOT NULL), count(*) FILTER (WHERE images IS NOT NULL AND body ~ '\*\*|(^|\s)_[^_]+_|__|~~') FROM "CatchupEntry"` → 45 / 0.
Corrections to the finding: (1) drop "On a wall question the viewer IS where the words live" as the headline consequence (wall answers have no words from the app); (2) the fix direction's `visibleText` in `src/lib/magazine/measure.ts` NO LONGER EXISTS (the magazine was deleted in 5d5c6898), so the fix needs its own markdown-to-plain helper next to `renderRichText`, or the viewer renders through it; (3) the feed's post card hands the viewer the same raw markdown (`posts/post-card.tsx:279`), including the `@[Name](userId)` mention token since tagging shipped (1f44f1e9/5164de0f) — V-T3-01; one fix in the viewer (or one helper at both call sites) closes both.
Orchestrator action: none.

### T3-11 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Medium stands, confidence "likely": mechanism certain, perceptible jank needs a trace)
Confidence in verdict: likely
Citations re-derived (HEAD; reader.tsx gained 16 lines): `useSpy` `edition/reader.tsx:322-385`, the `setSpy` with its thresholds `:358-364` (was `:342-349`); `const spy = useSpy(...)` in `EditionReader` `:458`; every `Section` re-created with fresh ref arrows `:736-748` (was `:720-732`); `Tile` `:157-217`, `Section` `:227` — plain functions, no `memo`; `Body` `reader-parts.tsx:102`, `renderRichText(text, { linkRanges })` inside render at `:176`, no `useMemo` in the file (`grep -n "useMemo\|memo(" reader-parts.tsx` empty); `Photographs` `:244`, `shots` rebuilt per render `:266-272`.
What I tried to refute it with: React bailing out (nothing between `EditionReader` and the tiles is memoised, so every `setSpy` re-renders every `Section` and `Tile`); `setSpy` rarely firing (it skips only when `current`/`labelled` are unchanged AND `within` moved < 0.5 % of the current question's height AND `progress` < 0.2 % of the page — on the live 133-answer Edition that is roughly every 20-60 px of scroll, i.e. most frames of a flick, not literally every frame).
Why it stands: a root-level state update at scroll cadence re-renders the whole Edition, and each `Body` re-runs `renderRichText` WITH `linkRanges` (`link-preview-core.ts`'s `findLinks`) on every render. Normal answers cost milliseconds; L6-05 measured a hostile 6,000-character answer at ~0.22 s per `findLinks` call, so one such answer multiplied by T3-11's re-render cadence freezes the reader (leads-routed "T3 — T3-11's per-scroll re-render multiplies L6-05's trimTail cost"). Live scale: the largest published Edition has 133 answers, 25,668 characters.
Live check run: `SELECT "editionId", count(*), sum(length(body)), max(length(body)) FROM "CatchupEntry" JOIN "CatchupEdition" ... WHERE status='published' GROUP BY 1` → 133 entries / 25,668 chars / max 2,000.
Corrections to the finding: line numbers above; "on nearly every frame" → "every 0.5 % of a question's height or 0.2 % of the page"; "141 Tiles" → 133 answers on the largest live Edition today; add the L6-05 compounding (the hostile-input case is what turns degradation into a freeze).
Orchestrator action: `performance_start_trace` on the 133-answer Edition at 390x844 while flick-scrolling, to settle Medium vs Low.

### T3-12 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain on mechanism
Citations re-derived (HEAD): `glide` `edition/reader.tsx:410-422` (a `requestAnimationFrame` loop calling `window.scrollTo` until `p >= 1`, no handle, no cancel; was `:394-406`); `pick` `:471-489`, the near branch `:476-479`, the far branch's `window.setTimeout` `:482-486` (no handle, no cleanup; calls `window.scrollTo` and `setArriving(false)`).
What I tried to refute it with: an unmount cleanup or a ref holding the rAF id (none; `glide` is a module function); a second pick cancelling the first (none — two loops run).
Why it stands: up to 900 ms of `window.scrollTo` after the reader may have unmounted, overriding the next page's scroll restoration.
Live check run: none needed.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### T3-13 — KNOWN
Verdict: KNOWN (docs/TRAPS.md:428-454, "A Tailwind v4 `scale-*` / `rotate-*` / `translate-*` sets the CSS `scale` … property, NOT `transform`"). That entry names the class AND says "Not audited beyond the Collection as of 2026-09-09: roughly seventy call sites … If those presses have never animated, that is the same defect and not a separate one." So this is the known, deliberately unaudited debt, not a new finding; the site list is still worth handing to whoever fixes the class.
Confidence in verdict: certain
Citations re-derived (HEAD): `index/catchup-card.tsx:126` (`transition-[opacity,transform]` + `hover:scale-105 active:scale-95`) correct; `home/picture-picker-dialog.tsx:255` (`transition-[box-shadow,transform]` + `active:scale-[0.98]`) correct and now REACHABLE (T3-01 fixed); `edition/reader.tsx:546` (`transition-[opacity,transform]` + `md:-translate-y-2`; was `:530-531`) correct; `home/people-door.tsx:168` (`transition-[color,opacity]` + `active:scale-95`) correct; `create/cadence-control.tsx:52` is GONE (the file was deleted in eb855c71). Tailwind 4.2.2 verified in `node_modules/tailwindcss/dist/lib.js`: `scale-*` emits `scale: var(--tw-scale-x) var(--tw-scale-y)`, `translate-*` emits `translate: …`, and `transition-transform` expands to `transform, translate, scale, rotate`.
What I tried to refute it with: whether the class is already fixed app-wide (no: the shared `Button`, `ui/button.tsx:72`, still pairs `transition-[…,transform]` with `active:scale-[0.97]`).
Why it is KNOWN: the TRAPS entry is the baseline row for exactly this.
Live check run: none needed.
Corrections to the finding (for the class's fix inventory): the finder's sweep only matched `transition-[…]`; `transition-colors` beside a `scale-*` is the same defect and adds four more Catch-ups sites: `settings/settings-surface.tsx:737` (`PictureDoor`, the two doors on every Catch-up's photograph, `active:scale-[0.97]`), `home/collecting.tsx:423` (the ask panel's row buttons, `active:scale-95`), `create/people-picker.tsx:192` (`active:scale-[0.99]`) and `:280` (`active:scale-90`).
Orchestrator action: none; route the site list to the TRAPS class's fix unit.

### T3-14 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived (HEAD; people-picker.tsx changed in eb855c71/44b20a91): `create/people-picker.tsx:153` (`unpicked = results.filter((r) => !value.some((p) => p.id === r.id))`, no `me` filter; was `:142`), `:117-151` (`addMyBatch`; `existing` is `value` only at `:124-125`), the viewer's fixed chip `:246-258`, the `value` chips `:260-287`. Server dedupe `catchups/actions.ts:477` (`invitedIds = [...new Set(memberIds.filter((id) => id !== creatorId))]`; was `:490-496`). `api/users/search/route.ts` and `api/users-by-batch/route.ts` still do not exclude the caller.
What I tried to refute it with: the batch shortcut no longer being offered (since 44b20a91 the button LEADS to the batch's own Catch-up whenever one exists, `:218-228`, and every batch of ten has one, so the batch path now rarely reaches `addMyBatch`; the NAME SEARCH path is unchanged and still offers the viewer).
Why it stands: typing your own name adds a second, removable chip of yourself; the server drops it, so only the screen and the 100-cap count are wrong.
Live check run: none needed.
Corrections to the finding: line numbers above; note the batch path is now mostly unreachable (the search path carries the finding).
Orchestrator action: none.

### T3-15 — CONFIRMED
Verdict: CONFIRMED (Low stands; latent)
Confidence in verdict: certain
Citations re-derived (HEAD): `setCatchupKeeper` `catchups/actions.ts:2349-2394` (was `:2727-2748`): the revoke `updateMany` scoped to `role: "keeper"` `:2378-2381`, and on `count === 0` with the member still present it falls through to `{ success: true, isKeeper }` `:2382-2393`; the comment calling that "the no-op it should always have been" `:2365-2372`. `home/people-door.tsx:115-126` — the toast is chosen from intent (`:121`), not from the result. `isKeeper` is true for `admin` rows via `isEffectiveKeeper` (`(home)/page.tsx:180-184`).
What I tried to refute it with: a live population that can hit it — `GroupMember` rows with `role='admin'` inside Catch-up groups that are NOT the creator: 0 (2 admin rows, both creators, whom the door does not offer the control for, `people-door.tsx:81`).
Why it stands: a success toast for a write that matched nothing. Unreachable from today's data; reachable after an account merge or the purge's succession writes an `admin` row (T2a-09 / L1).
Live check run: `SELECT gm.role, count(*), count(*) FILTER (WHERE c."createdById" IS NULL OR gm."userId" <> c."createdById") FROM "GroupMember" gm JOIN "CatchupSeries" c ON c."groupId"=gm."groupId" GROUP BY 1` → admin 2 / 0 non-creator; keeper 1; member 418.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### T3-16 — DUPLICATE of T7b-03
Verdict: DUPLICATE of T7b-03 — T7b-03 is CANONICAL. Both describe the one skipped migration (`prisma/migrations-manual/2026-09-09-answering-moves-to-the-home.sql`). T7b-03 is the better carrier for what survives at HEAD: it names the three false claims (the `catchups-notify.ts` comment, the spec sentence, refactor audit 3's note) and the process gap (no ledger of applied manual migrations), which is all that is left now the data has aged out. T3-16 contributes one more stale comment to fold into T7b-03 (below). V-T7b ruled its row "DUPLICATE of T3-16, V-T3 picks canonical" — this flips it: T7b-03 canonical, T3-16 folds in.
Confidence in verdict: certain
Citations re-derived (HEAD): the migration file unchanged; `catchups/actions.ts:1320-1328` (`extendDeadline`'s reminder delete, whose comment at `:1322-1326` says "A stale reminder still pointing at `/catchups/<id>/answer` is left alone by this delete and cleared by the dated migration instead" — the migration never ran; was `:1581-1589`); `[catchupId]/answer/page.tsx:10-14` (the shim's header: "The dated migration rewrites the rows that exist").
What I tried to refute it with: a record of the migration being applied (`grep -rn answering-moves-to-the-home docs/history progress.md` → nothing; `git log -S` since 495ecdd2 → only the audit's own docs).
Why it is a duplicate, and what survives: same file, same rows, same fix. Live at HEAD the 22 rows are GONE — aged out by the 30-day retention sweep, not migrated (`SELECT count(*) FROM "Notification" WHERE link LIKE '/catchups/%/answer'` → 0; oldest Notification 2026-09-23 06:31 UTC). No writer has produced an `/answer` link since 2026-09-09, so the data defect cannot recur. Residual: Low, comment/spec lies plus the ledger gap.
Live check run: the two SELECTs above → 0 rows; oldest `2026-09-23 06:31:34`.
Corrections to the finding (to fold into T7b-03): add `catchups/actions.ts:1322-1326` and `[catchupId]/answer/page.tsx:11-14` to the comments to correct ("the old rows aged out unrewritten").
Orchestrator action: none (the demo database's state is unread; the demo is deferred).

### T3-17 — CONFIRMED
Verdict: CONFIRMED (Medium stands, with one owner question: was dropping the invite link in build phase 7 intended?)
Confidence in verdict: certain
Citations re-derived (HEAD): `(home)/page.tsx:426` (`inviteToken: catchup.inviteToken` shipped to the client; was `:414`); `home/types.ts:82-84` (the "Keeper's invite card is simply absent" comment) correct; `grep -rn inviteToken src` outside `src/generated` and the lab finds no component that reads it — only the page, the type, the join route (`catchups/join/[token]/page.tsx:64`), `joinCatchupByToken` (`catchups/actions.ts:587`, lookup `:608`), creation (`:538`, `inviteToken: newInviteToken()`), the export's exclusion and the batch code that writes `null`. Still live behind a link nobody can copy: `src/proxy.ts:39`, `:217-220`, `:296` (the public allowlist), the join page and `join/accept-invite.tsx`, and `welcome/page.tsx:54-57` (`next` carried through sign-up). `docs/spec/catchups.md:403-408` (§7.6) still specifies the page the link opens; §8 (settings) lists no invite row.
What I tried to refute it with: an invite surface added since the audit in People, Settings or the guide (none; `people-door.tsx` has rows, Keeper/Remove and `AddSomeone`; `settings-surface.tsx` has no invite row); a spec or handover recording the drop as deliberate (none found: architecture.md:370 still lists "invite by link"; editions-on-demand.md does not mention it); whether any people Catch-up is affected (live: 1 active people Catch-up with a token, 1 ended; the 20 batch Catch-ups correctly carry none).
Why it stands: a Keeper of a people Catch-up can add only people who already have accounts; the join route, its sign-up path and the token on every new people Catch-up are a feature with no door.
Live check run: `SELECT c.status, (g."batchYear" IS NOT NULL), (c."inviteToken" IS NOT NULL), count(*) FROM "CatchupSeries" c JOIN "Group" g ON g.id=c."groupId" GROUP BY 1,2,3` → active/people/token 1, ended/people/token 1, active/batch/no-token 20.
Corrections to the finding: line numbers above. Add the owner question to the fix unit: restore the link (a Keeper-only row in People on an active people Catch-up) or retire the route, the action, the proxy entry and the column.
Orchestrator action: none (owner decision).

### T3-18 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain on mechanism
Citations re-derived (HEAD): `answer/answer-experience.tsx:96-107` (`advance`: on the last prompt, `firstUnanswered = prompts.findIndex((p, i) => i !== index && !answeredIds.has(p.id))` → `goTo(firstUnanswered, -1)`; only when none is left `goTo(index + 1, 1)`; was `:95-106`), `answeredIds` `:69-75` (meaningful AND not failed); `answer/answer-card.tsx:104-108` (the pill is never disabled because it is "the only way past one") and `:225-231` (Next/Share calls `flushBody()` then `onAdvance`); the completion card `answer-experience.tsx:254`.
What I tried to refute it with: a memory of prompts already swept to (none: the sweep is stateless per press); the marks as an exit (they navigate between questions; none of them is the card); the completion card being reachable by answering the skipped question with whitespace (no: `isMeaningfulEntry` needs non-empty content).
Why it stands: a member who deliberately leaves a question blank can never reach the end of the deck; each Share sends them back to the blank one. Live now: the Batch of 2024 Edition is answering (44 members; 52 answers so far), so this runs today.
Live check run: `SELECT count(*) ... FROM "CatchupEntry" JOIN "CatchupEdition" ... WHERE status='answering'` → 52 entries.
Corrections to the finding: line numbers above.
Orchestrator action: none required; a throwaway three-question Edition (answer 1 and 3, Share twice) would show it.

### T3-19 — CONFIRMED
Verdict: CONFIRMED (Medium stands)
Confidence in verdict: certain (CSS); one look at 390x844 with touch emulation would close the "never seen" half
Citations re-derived (HEAD): `answer/photo-attachments.tsx:123-130` (the remove `SpringPress`, class at `:126`: `opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100`) correct; `PhotoAimButton` beside it `:118-122`, which returns null when nothing is cut (`common/photo-aim.tsx:146`; "Always there, never on hover" `:155`). Contrast at HEAD: the feed composer's remove is always drawn (`posts/create-post-form.tsx:885`, no opacity rule; was `:827-840`), the list card's hover control is not rendered on a coarse pointer (`index/catchup-card.tsx:121`, `!coarse &&`), the People door uses `[@media(hover:hover)]:opacity-0` (`home/people-door.tsx:169`). No `@custom-variant hover` override in `src/app/tailwind-theme.css` (only `dark` and `data-*`).
What I tried to refute it with: another removal path on the answer (none: clearing the images needs this button); the tile taking focus on tap so `focus-visible` reveals it (a tap on the image does not focus the button, and `:focus-visible` does not match pointer focus anyway).
Why it stands: on a touch screen the remove control is an invisible 24px target in the corner of the plate. Live now: 13 of the 52 answers on the answering Batch of 2024 Edition carry photographs.
Live check run: `SELECT count(*) FILTER (WHERE images IS NOT NULL), count(*) FROM "CatchupEntry" e JOIN "CatchupEdition" ed ... WHERE ed.status='answering'` → 13 / 52.
Corrections to the finding: line numbers above (the composer line moved to `:885`).
Orchestrator action: at 390x844 with touch emulation on a throwaway answering Edition, attach a photograph and read `getComputedStyle(document.querySelector('[aria-label="Remove photo"]')).opacity` → expected "0".

### T3-20 — MOOT-SINCE 5d5c6898
Verdict: MOOT-SINCE 5d5c6898 (2026-10-11, "feat(catchups): delete the vote question and the magazine"). The finder's reproduction through `layoutMagazine` stood at 495ecdd2 (orchestrator noted it as reproduced); the code path no longer exists.
Confidence in verdict: certain
Citations re-derived (HEAD): `src/lib/magazine/` does not exist (`paginate.ts`, `grammar.ts`, `measure.ts`, `index.ts`, `magazine.test.mjs` all deleted); `src/app/lab/catchups/magazine/**`, its fixtures and `scripts/dev/print-magazine.mjs` deleted in the same commit; `grep -rn "layoutMagazine\|lib/magazine" src scripts` → nothing.
What I tried to refute the mootness with: a surviving caller or a copy of `layColumns` elsewhere (none).
Why it falls: the loop, its callers and the corpus test that could have crashed `npm run check` locally are all gone; the commit message records the owner calling the magazine "a failed experiment".
Live check run: none needed.
Corrections to the finding: n/a. Also moot: T3-10's fix-direction pointer to `visibleText` in `measure.ts` (corrected there).
Orchestrator action: none.

### T3-21 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; "unreachable today" is no longer true)
Confidence in verdict: certain
Citations re-derived (HEAD): `answer/answer-card.tsx:168-170` (`prompt.kind === "photo"` → `<PhotoAttachments ... max={1} />`; was `:131-133`) and its docblock `:8` ("photo -> exactly one picture, no writing surface"); `answer/photo-attachments.tsx:7-10` (the docblock) and `:61-64` (the refusal "One photo for this question."), `single` at `:56`. The other half: `docs/spec/catchups.md:396` (§7.5 "3 photographs per answer, on every kind"; was `:349`) and `:483` (§10.2 "The cap is the ordinary three per answer"; was `:435`); `edition/photo-run.tsx:38` ("THE CAP IS THREE, which is his too"); `lib/photo-wall.ts:49`; the server's `images: z.array(z.url()).max(3, ...)` at `catchups/actions.ts:176` (was `:198`).
What I tried to refute it with: a later decision that a wall takes one (none in the spec or the rework docs; the two surfaces still disagree).
Why it stands, and what changed: T3-02 was fixed in 1439c83a, so wall questions are being asked again: the Batch of 2024 Edition answering now has a `photo-wall` question (library, created 2026-10-15) with 6 answers, every one capped at one photograph by this control.
Live check run: `SELECT p.category, json_array_length(e.images::json) ... WHERE p.category IN ('photo-wall','songs') AND p."createdAt" > '2026-10-01'` → 6 wall answers, all `n_images = 1`, `body_len = 0`.
Corrections to the finding: severity line "unreachable today because of T3-02" → "live since 1439c83a (the answering Batch of 2024 Edition)"; line numbers above. Whether one or three is right is the owner's word (the spec and photo-run say three, the answer card says one); the fix is to make the two halves agree.
Orchestrator action: none.

### T3-22 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands)
Confidence in verdict: certain
Citations re-derived (HEAD): `home/people-door.tsx:186-207` (`AddSomeone({ catchupId, onChanged })` receives no roster; `useUserSearch(query, { alumniOnly: true })` `:190`; ``${name} is in.`` on any success `:200`), every result offered `:243-260` — correct. Server: `addCatchupMembers` `catchups/actions.ts:2065-2164` (was `:2431-2517`): `createMany({ skipDuplicates: true })` `:2119-2122`, the false comment "The picker never offers an existing member" `:2137`, `return { success: true as const, added: created.count }` `:2162`.
What I tried to refute it with: a roster filter in `useUserSearch` (none); the toast reading `added` (it does not).
Why it stands: the add list offers people already in (and the Keeper), and "X is in." is said whether or not anything changed.
Live check run: none needed.
Corrections to the finding: "`addCatchupMembers` sends no notification" is out of date — since 077eaacf (2026-09-27) it rings `notifyAdded` for the NEWLY added only (`:2152`), so re-adding an existing member still sends nothing; line numbers above.
Orchestrator action: none.

### T3-23 — CONFIRMED
Verdict: CONFIRMED (Low stands)
Confidence in verdict: certain
Citations re-derived (HEAD): `home/people-door.tsx:127-136` (the Remove `RowButton`, `onClick={() => run(() => removeCatchupMember(...), ...)}` with no confirm), `:114` (`gap-0.5` beside the sprout `:115-126`), the row buttons `:157-177` (always visible on a coarse pointer via `[@media(hover:hover)]:opacity-0`, `:169`); `removeCatchupMember` `catchups/actions.ts:2179-2213` (was `:2533-2566`), deleting the member's Catch-up bells at `:2207`; `docs/spec/DESIGN-SYSTEM.md:305-306` correct.
What I tried to refute it with: an undo on the toast (none: `toast.success(said)`); a confirm wrapper in `run` (none).
Why it stands: a one-way act on a phone, one 26px target from the Keeper control, with no confirmation, unlike every other one-way verb on the home. Reach: only the Keeper of a people Catch-up (1 active today).
Live check run: none needed.
Corrections to the finding: line numbers above.
Orchestrator action: none.

### T3-24 — CONFIRMED
Verdict: CONFIRMED (Low stands; the flicker half stays "possible")
Confidence in verdict: certain for the silent Undo
Citations re-derived (HEAD; the file changed only for 19be10b0's link): `index/catchup-shelf-view.tsx:150-160` (the toast at `:150`, its Undo: `await callAction(() => setCatchupArchived(c.catchupId, false)); router.refresh();` at `:155-156`, result never read), `:130-135` (`signature`; any change runs `setLeaving([])` at `:134`), `archive` `:139-162`; `callAction` never throws (`lib/call-action.ts:43-58`, the catch returns `{ error: ACTION_FAILED }`). Contrast: `index/archived-row.tsx:95-97` reads its result and toasts the error.
What I tried to refute it with: Sonner surfacing an error from the action callback (it does not; the callback's promise is discarded inside `start`).
Why it stands: a failed Undo leaves the card archived and says nothing; recoverable from Archived → Put back.
Live check run: none needed.
Corrections to the finding: line numbers above.
Orchestrator action: the flicker half needs a browser (two quick archives).

## New candidates

### V-T3-01 — Tapping a photograph on a feed post shows the post's raw markdown as the viewer's caption, and since tagging shipped a tagged member reads as `@[Name](userId)`
- Severity: Low (cosmetic-with-teeth: the most-used surface, and the token exposes a member id format)
- Confidence: certain on mechanism (latent in today's data)
- Where:
  - `src/components/posts/post-card.tsx:273-282` (`viewerImages`: `caption: post.kind === "letter" ? null : content`, where `content` is the stored markdown, `:230`)
  - `src/components/common/image-viewer.tsx:710`, `:1059`, `:1070` (the caption printed as a text child, no rendering)
  - `src/lib/rich-text.ts:24` (`MENTION_PATTERN`, the wire format `@[Name](userId)` that `renderRichText` turns into a link) and `src/lib/mention-editing.ts:11-14` (the composer serialises a tag to exactly that); tagging shipped 2026-09-27 (1f44f1e9, 5164de0f)
- Taxonomy: 6h (one field, two renderings) — the feed instance of T3-10
- Expected: the post card renders the body through `renderRichText` (bold, italics, a tagged name as a green link); the viewer's caption should read the same words.
- Actual: a post "Lunch with **Priya** at Hampi" with a photograph reads correctly on the card; tap the photograph and the caption shows the asterisks. A post that tags someone shows `@[Priya Raman](cm…)` — brackets, parentheses and the member's id — under the photograph. Live today: 5 of 32 posts carry images and none uses a marker or a tag, so nobody has seen it yet; tagging is new and the composer now offers it like Messages.
- Why: the viewer takes a plain-string `caption`, and both callers that hand it a member's prose (this one and T3-10's Catch-up answer) pass the stored markdown.
- Proof: read-only, the lines above; `SELECT count(*) FILTER (WHERE images IS NOT NULL AND images <> '[]'), count(*) FROM "Post"` → 5 / 32; markers and mention tokens in posts → 0.
- Fix direction: one helper beside `renderRichText` that turns stored markdown into plain words (mentions to their names, markers dropped), applied at both caption call sites, or the viewer renders the caption through `renderRichText` itself. Fold with T3-10 into one fix unit.
- Gate: a grep-shaped rule that no `caption:` handed to the viewer is a raw `content` / `entry.body`; a unit test on the helper with a mention and `**bold**`.
- Known-related: T3-10 (the Catch-ups instance; same fix); bugs.md #19 (closed on a deleted file).

## Routed leads naming T3 (rows in leads-routed.md added after T3's run)
- **T9 → T3, the resting birds (`almost-ready.tsx:84`, `completion-card.tsx:41`, `index/nothing-here.tsx:33`)** — all three still mount `ResidentHoopoe` at HEAD. They are instances of T9-03, which V-T9 CONFIRMED-CORRECTED as "the jam stops taps/beats/verbs, the idle loop keeps running", so "freeze" is overstated for a resting bird too. Fold into T9-03; no T3 finding.
- **T7b → T3, T7b-15's day-only deadline wording** — the surfaces are `homeStateLine` (`catchups-core.ts:1225-1226`, "Answers close <day>"), `catchupStageLine` (`:1231+`) and the Keeper row (`settings-surface.tsx:187-196`). Copy belongs to T7b-15; nothing to add from the surfaces.
- **L6 → T3, T3-11 multiplies L6-05** — confirmed: `Body` re-runs `renderRichText(text, { linkRanges })` (`reader-parts.tsx:176`) on every spy update; folded into T3-11's corrected consequence.
- **L12 → T3/T2a, `setCatchupPicture` never purges a replaced uploaded picture** (`catchups/actions.ts:715-769` at HEAD) — the lead's "unreachable while T3-01 stands" is no longer true: the picker is mounted since 592e3526, so a Keeper (or any batch member, `mayChangeCatchupPicture`) replacing an uploaded picture now leaves the old object in R2 with no row. Also unpurged: an upload made inside the picker and then abandoned for a pool photograph (the C-064 class, KNOWN). This lead should be ruled as its own finding by V-L-d (L12's zone) or the orchestrator; it is not a T3 surface defect.
- **L2 → L9/T3, `(main)/layout.tsx:55-67` "the awaited advance is what makes the page you are about to read correct"** — the overclaim stands at HEAD (layout and page render concurrently). Its T3 sibling (the first home view after `nextOpensAt` drawing the old cover) is MOOT-SINCE eb855c71: nothing opens an Edition on a clock any more.
- **L2 → T3/L5, L2-04 (the Edition page's `generateMetadata` and page both run `loadEditionBase`/`loadMembership`)** — still true at HEAD: `edition/[editionId]/page.tsx:75` and `:95` are plain `async function`s, called at `:122` and again at `:145`/`:150`. L2-04 is canonical (V-L-a's zone).
- **L5 → T3, cross-user identical reads** — no Catch-ups read is identical across viewers (each is membership-scoped); nothing to add.

## Cross-zone notes
- **V-T7b**: T7b-03 is CANONICAL for the skipped `2026-09-09-answering-moves-to-the-home.sql`; T3-16 is the DUPLICATE (V-T7b's file currently says the reverse, pending this pick). Fold T3-16's two extra stale comments into T7b-03: `catchups/actions.ts:1322-1326` and `[catchupId]/answer/page.tsx:11-14`.
- **V-L-d / orchestrator (L12)**: the `setCatchupPicture` purge lead became reachable with 592e3526 (see Routed leads).
- **T1 / T4b**: V-T3-01 (feed photo captions print raw markdown and the `@[Name](userId)` tag token) shares T3-10's fix in the shared viewer; one unit.
- **T2a / V-T2**: since daec81ec every batch member holds the extend control (`allowBatch: true`), so T3-06's double-extension and the absence of any ceiling on total extension now apply to a whole batch (44 members on the Edition answering today). Worth a line wherever the "everyone in a batch runs its Catch-up" permissions are reviewed.
- **TRAPS class (Tailwind scale/translate)**: T3-13's site inventory, plus four `transition-colors` sites the finder's sweep could not match (`settings-surface.tsx:737`, `collecting.tsx:423`, `people-picker.tsx:192`, `:280`), goes to whoever fixes the class.
- **Live state the fix session should know**: Batch of 2024 is `answering` until 2026-10-25 07:00 IST (44 members, 52 answers, a `photo-wall` and a `songs` question). T3-04, T3-05, T3-18, T3-19 and T3-21 are all live on it.

## Coverage
- Checked completely at HEAD 88642426: T3-01 through T3-24 (24 of 24), every citation re-opened and corrected where it moved; the three outside-the-audit fixes re-checked against their commits (592e3526 for T3-01/T3-03, 1439c83a for T3-02, whose test `catchup-library-pick-rule.test.mjs` passes 3/3).
- Verdicts: FIXED-SINCE 3 (T3-01, T3-02, T3-03); MOOT-SINCE 2 (T3-07 by eb855c71, T3-20 by 5d5c6898); CONFIRMED 10 (T3-05, T3-09, T3-12, T3-14, T3-15, T3-17, T3-18, T3-19, T3-23, T3-24); CONFIRMED-CORRECTED 7 (T3-04, T3-06, T3-08, T3-10, T3-11, T3-21, T3-22); KNOWN 1 (T3-13, TRAPS); DUPLICATE 1 (T3-16 of T7b-03); REFUTED 0. Total 24. New candidates: 1 (V-T3-01).
- Severity changes: none upgraded or downgraded. T3-11 stays Medium at "likely" pending a trace; T3-21's "unreachable" is withdrawn (live since 1439c83a); T3-16's data half expired (Low residual, under T7b-03).
- Files read completely at HEAD: `home/catchup-home.tsx`, `answer/answer-card.tsx`, `answer/answer-experience.tsx`, `answer/completion-card.tsx`, `[catchupId]/(home)/page.tsx`, `[catchupId]/answer/page.tsx`, `create/people-picker.tsx`, `home/people-door.tsx` (60-330). Read in part: `settings/settings-surface.tsx` (1-420, 620-941), `edition/reader.tsx` (150-240, 318-780), `edition/reader-parts.tsx` (102-190, 244-280), `home/collecting.tsx` (70-240), `home/picture-picker-dialog.tsx` (60-135), `answer/photo-attachments.tsx` (1-140), `answer/voice-recorder.tsx` (156-480), `index/catchup-shelf-view.tsx` (105-170), `catchups/join/[token]/page.tsx` (55-150), `catchups/actions.ts` (450-560, 656-780, 1180-1340, 1433-1600, 2040-2400), `lib/catchups.ts` (330-440), `lib/catchups-core.ts` (806-820, 1210-1250), `common/image-viewer.tsx` (1050-1075), `posts/post-card.tsx` (265-290), `prisma/schema.prisma` (1080-1100), TRAPS 426-454, `(main)/layout.tsx` (30-70). Tailwind 4.2.2 and Next 16.3.8 internals re-checked for T3-13 and T3-05.
- Read-only database queries: running Editions; wall/songs prompts and their answers; answers with photos and markers; posts with images and markers/tags; group roles in Catch-up groups; Catch-ups by kind and token; the `/answer` bell rows and the oldest Notification; the largest published Edition.
- Not done (outside read-only): the browser proofs listed per verdict (T3-05, T3-11 trace, T3-19 at 390x844, T3-24's flicker). The voice recorder (new since the audit) was skimmed for resource cleanup only; one open question, not filed: whether every browser fires MediaRecorder `stop` when `teardown()` ends the stream's tracks on an unmount mid-recording (Next pressed while recording), which decides whether that recording is saved or silently dropped.
- Scratch: none left (one `/tmp/vt3` helper was removed before use; every query ran inline).

STATUS: COMPLETE at HEAD 88642426

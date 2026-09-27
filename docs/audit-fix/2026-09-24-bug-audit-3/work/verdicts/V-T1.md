# V-T1 — adversarial validation of T1 (feed, posts, letters, comments)
Validator: V-T1 · Started: 2026-09-24 · Model: Opus 5.5
Zone: every finding in `work/reports/T1.md` (T1-01 … T1-25), plus the orchestrator's O-01 / O-06 where they touch the feed.

**Summary.** 25 candidates: CONFIRMED 8 (T1-07, 10, 11, 13, 17, 19, 20, 22) · CONFIRMED-CORRECTED 13 (T1-01, 02, 03, 06, 08, 09, 14, 15, 18, 21, 23, 24, 25) · DOWNGRADED 1 (T1-16 Medium -> Low) · REFUTED 3 (T1-04, T1-05, T1-12) · UPGRADED 0 · DUPLICATE 0 · KNOWN 0. New candidates: V-T1-01, V-T1-02, V-T1-03 (all Low). The finder's `actions.ts` line numbers drift by 10-50 lines in several findings (the file is unchanged since 2026-09-17); every corrected number is in the verdicts.

## Verdicts

### T1-01 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (reach wider than stated; severity Medium stands)
Confidence in verdict: certain
Citations re-derived: `rich-text-editing.ts:52-55` correct (the four wrap lines); `rich-text.ts:45` is the `edge = [^\s${c}]` line and `:51` the run pattern (finder's 45-51 is right); `rich-text.ts:72-74` and `rich-text-editing.ts:6` quoted correctly; `create-post-form.tsx:396` is the Ctrl+B call (`if (applyFormatShortcut(e)) handleRichInput();`; finder said 395-397, fine). `rich-text-area.tsx:69,83,91` is the shared field.
What I tried to refute it with: (1) a normalisation step between the DOM and the stored string -- there is none: `handleRichInput` (`create-post-form.tsx:377`) and `RichTextArea`'s mirror (`rich-text-area.tsx:69`) store `serializeEditableToMarkdown(el)` verbatim, and `handleSubmit` only checks `content.trim()`; (2) Chrome writing the trailing space as U+00A0 instead of U+0020 -- irrelevant, JS `\s` matches U+00A0 too (reproduced below); (3) a test pinning the edge -- `rich-text-editing.test.mjs` has five cases, none with whitespace at a formatting edge; `rich-text.test.mjs` has none either.
Why it stands / falls: the serializer wraps whatever the formatted element contains, and the renderer (deliberately, its rule 2 at `rich-text.ts:25-26`) refuses a run that starts or ends on whitespace, so the two halves of "the app's one rich-text story" disagree on exactly the input a Windows double-click (which selects the trailing space) or a drag selection produces. The member sees bold on the sheet and literal asterisks on the card, the letter page and every teaser. Medium is right: visible, embarrassing, recoverable by editing, and only some selections trigger it.
Live check run: scratch module under /tmp importing the real `serializeEditableToMarkdown` and `renderRichText` with the test file's node shim (deleted by the same command): `<b>hello </b>world` -> md `**hello **world` -> html `**hello **world`; `<b>hello\u00A0</b>world` -> the same literal result; `say<b> hello</b>` -> `say** hello**` literal; `<i>a </i>b` -> `*a *b`; `<u>x </u>y` -> `__x __y`; control `<b>x</b> y` -> `<strong>x</strong> y`.
Corrections to the finding: Where should add `src/components/catchups/answer/answer-card.tsx:114` -- the Catch-up answer card writes through the same `RichTextArea`, so Catch-up answers (rendered through `renderRichText` in `reader-parts.tsx`) publish the same literal asterisks; the edit dialog (`edit-post-dialog.tsx`) likewise. The phone's native selection-bar Bold reaches the same path (`create-post-form.tsx:390-394` comment). Fix direction and gate stand (the fix is in the one shared serializer, so one gate covers every surface).
Orchestrator action: none needed (pure functions); optional live look on a Windows browser.

### T1-02 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (one line range; severity Medium stands)
Confidence in verdict: certain on the mechanism; the trigger (editing during the Save round trip) is uncommon on a fast connection
Citations re-derived: `create-post-form.tsx:518-531` (markSaved, clearLocalDraft, toast, `onDraftSaved`), `:570-576` (finally clears `submittingRef` because `handedOff` stays false on the desk path), `:631-643` (the contentEditable has no disabled state) all correct; `letter-desk.tsx:117-122` correct; `use-letter-persistence.ts:385-386`, `:387-442`, `:398`, `:431-434` correct. The twin guard is `actions.ts:242-268` (finder: 241-266), its `where` matches `content: parsed.data.content` exactly at `:245`.
What I tried to refute it with: (1) the desk adopting the new id before the unmount -- it does not; `onDraftSaved` only calls `router.replace` and `postId` stays undefined on the `/letters/new` instance, so the cleanup takes the `createPost` branch; (2) `/letters/new` and `/letters/[id]/edit` sharing a segment so nothing unmounts -- they are sibling folders (`new/page.tsx` vs `[id]/edit/page.tsx`), so the desk unmounts; (3) the submit latch still being up at unmount -- `finally` runs synchronously right after `onDraftSaved` returns, long before the navigation commits; (4) the server twin guard -- exact-content match, so a single extra keystroke defeats it; (5) `ownedUploadUrls` refusing a url already on another row -- it checks prefix, mint and cap only (`upload-ownership.ts:32-42`), so the second row legitimately stores the same `images`; (6) the Save button being disabled while an upload finishes -- it is (`:1144`), so the trigger is typing, a title edit, removing a thumbnail or changing the audience during the round trip, all of which require re-focusing after the button press.
Why it stands / falls: `markSaved` stamps the submitted snapshot, the member's later edits change `exitRef`, and the unmount cleanup of the `/letters/new` instance (which never learned the new row) writes a second draft. The member lands on the edit page holding the older text, sees two toasts, and has a second draft in the strip carrying the newer keystrokes and the same photographs. Medium: wrong behaviour with confusing results, but it needs an edit inside the save's round trip, which on desktop is under a second.
Live check run: none possible read-only (needs a throttled browser and a write).
Corrections to the finding: twin-guard lines are `actions.ts:242-268`; add that the trigger needs the writer to click back into the sheet (the button press takes focus), which is why it is a slow-connection case. Fix direction stands; it should be done in one unit with T1-03 and V-T1-01 (one "which versioned write, if any, and with which base" decision for the whole hook).
Orchestrator action: throwaway account, DevTools "Slow 3G", `/letters/new`, type a sentence, press Save as draft, click back into the sheet and type three characters before the toast; expect two toasts and two drafts; then `SELECT id, left(content,40), images FROM "Post" WHERE "authorId"=<throwaway> AND status='draft' ORDER BY "createdAt" DESC LIMIT 2`.

### T1-03 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (server lines wrong; which side loses is settled below; severity Medium stands)
Confidence in verdict: certain on the mechanism, likely on frequency
Citations re-derived: `use-letter-persistence.ts:295-309` (timer; `:306` assigns `autosaveRunRef`), `:387-442` (exit save; `:429` reads `baseUpdatedAtRef` and nothing awaits `autosaveRunRef`), `:138-141` (the "explicit Save or Publish waits" comment), `:371-373`, `create-post-form.tsx:437` all correct. The version guard is `actions.ts:652-658` (the `write` closure's `updateMany ... updatedAt: base`) and the refusal text `:673-678`, not `:604-611`.
What I tried to refute it with: Next 16.3.3's client action queue, which serializes server actions from one tab (`app-router-instance.js` `dispatchAction`): if it held the exit save behind the autosave, the exit save would still carry the stale base (its FormData is built at unmount), so it would lose deterministically, not escape. In fact a navigation DISCARDS the pending autosave from the queue (`dispatchAction`, the ACTION_NAVIGATE branch) while its fetch keeps going, and the exit save is dispatched after the navigation settles, so the two requests are genuinely concurrent. The window is the whole autosave round trip because `/letters/(index)/loading.tsx` lets a prefetched "All letters" commit immediately, unmounting the desk at the click. If the autosave's response lands BEFORE the unmount, `runAutosave` stamps `savedSnapshotRef` and the exit save is skipped (no bug) -- which is why the trigger is "click within the round trip".
Why it stands / falls: the autosave was sent first, so it usually wins; the exit save is then refused and `finish(error)` toasts "That letter did not save. It is kept on this device. Open the letters desk again to retry." over a row that holds exactly those words (when nothing was typed after the autosave fired). The stash is dropped silently on the next visit (equal content), so the only harm is a false alarm on the one feature whose job is to say truthfully whether a letter is safe. In the rarer reverse order the autosave's refusal stashes the OLDER words and toasts "This letter has changed somewhere else. Reload the page..." on the letters index, and the next visit offers that older copy as "a newer copy of this letter" -- accepting it reverts the letter.
Live check run: none possible read-only.
Corrections to the finding: server lines as above; state that the common outcome is the false "did not save" toast (autosave first) and the reverse order is the rarer, more harmful one. Fix direction stands (chain the exit save onto `autosaveRunRef`, or skip it when the in-flight payload equals the exit snapshot); do it with T1-02 and V-T1-01.
Orchestrator action: throwaway account, resumed draft, "Slow 3G", type, wait 2.6 s ("Saving..."), click "All letters" at once; watch for the red toast, then read the row.

### T1-04 — REFUTED
Verdict: REFUTED (the mechanism exists; the claimed consequence has no reachable trigger)
Confidence in verdict: likely
Citations re-derived: the conditional write is `actions.ts:652-658` and the separate re-read `:694-698` (finder: 604-627); `use-letter-persistence.ts:333` correct.
What I tried to refute it with: every writer of a `Post` row (`grep post.update|updateMany`: `editPost`, `publishDraft`, `adminRemovePost`, `admin/reports/actions.ts:26`, the admin merge at `admin/people/actions.ts:361`, dev scripts). For A's re-read to return B's version, B's write must SUCCEED between A's update and A's re-read. A draft is only ever written through the desk, which always sends a base (`letter-menu.tsx:158-165` routes drafts to the desk, never to the tokenless dialog). B's base can only equal the version A just produced if B read the row after A's update -- and a device only learns a version from its own successful save's re-read or a fresh page load. A refused save never re-reads (`:673-678` returns first), so a stale device stays refused for good; two devices typing in turn, the finder's trigger, is exactly the case the guard refuses every time. The other writers either cannot reach a draft's body (hide, merge) or go through a refused `editPost` first (`publishDraft` from the desk). Same-tab pairs are one success per version too (T1-03, V-T1-01).
Why it stands / falls: the finder's own "Actual" paragraph could not build the sequence, and I cannot either. The only residue is theoretical: a multi-second pool stall between the two statements, during which a third copy of the page loads fresh and autosaves. That is not a member-facing finding at this scale.
Live check run: none needed (code-path argument).
Corrections to the finding: withdraw. If the fix session touches `editPost` for T1-06 or T1-16 anyway, taking `updatedAt` from the write itself (`updateManyAndReturn` or raw `RETURNING`) is a free hardening, not a fix.
Orchestrator action: none.

### T1-05 — REFUTED
Verdict: REFUTED (the server half is real; the client never shows the 404 it sends)
Confidence in verdict: likely (settled from Next 16.3.3's client source; a browser trace would make it certain)
Citations re-derived: publishDraft's revalidations are `actions.ts:361-363` (finder: 356-358), deletePost's `:465` (finder: 425), deleteDraft's `:392` (finder: 379); `letters/[id]/edit/page.tsx:47-55` and `letters/[id]/(read)/page.tsx:92` correct; `action-handler.js:963,990` correct (a revalidating action renders the current page into its response).
What I tried to refute it with: the client side. `server-action-reducer.js` calls the caller's `resolve(actionResult)` BEFORE it returns the seeded state; the caller's continuation (`await callAction(...)` in `create-post-form.tsx:497` or `letter-menu.tsx:110`) then calls `router.push` synchronously (`app-router-instance.js:340-351`). Counting promise reactions from the `resolve`: the caller's continuation runs at the third microtask, the queue's `handleResult` at the fourth (the reducer's promise is adopted through `.then(async cb)` and the `async` wrapper in `createMutableActionQueue`). So the navigation is dispatched while the server action is still `actionQueue.pending`, and `dispatchAction`'s ACTION_NAVIGATE branch marks it `discarded`, which `runAction.handleResult` honours by never applying its state (it only schedules a refresh). Even with the order reversed, both updates are transition `setState`s queued before React's scheduler renders, so React renders the navigation's suspended state and keeps the desk on screen until the letter page arrives.
Why it stands / falls: the not-found tree is rendered on the server and thrown away on the client. What survives is cost, not a flash: the action re-renders a page whose queries run for nothing, which is T1-06 / T8b-12's multiplier.
Live check run: a /tmp simulation of the two promise chains exactly as Next 16.3.3 builds them (async `callServer` returning a new Promise, `callAction`'s `return await run()`, the caller's `await`, versus `fetchServerAction().then(async cb)` inside the queue's `async` wrapper and `runAction`'s `.then(handleResult)`), deleted by the same command: output `caller continuation -> router.push (BEFORE handleResult)` then `handleResult`.
Corrections to the finding: withdraw as a member-facing defect; fold the wasted server render into T1-06's note.
Orchestrator action: optional certainty: throwaway account, "Slow 3G", publish a draft from `/letters/<id>/edit` with a MutationObserver on the not-found hoopoe's heading; expect no mount. Same for Delete on `/letters/<id>`.

### T1-06 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; one premise overstated, which changes the fix)
Confidence in verdict: certain
Citations re-derived: `actions.ts:687-690` is the unconditional `if (isLetter) { revalidatePath("/letters"); revalidatePath(`/letters/${postId}`) }` (finder: 636-640); `use-letter-persistence.ts:283-364` correct; `(main)/layout.tsx:26-131` correct (auth, then a four-way `Promise.all` at `:83-103`, then two `after()`s at `:116-122`, `:131`); `letters/[id]/edit/page.tsx:26-57` correct; `action-handler.js:963,990` confirms the page render.
What I tried to refute it with: whether the revalidation buys anything for a draft. It does, a little: `server-action-reducer.js` calls `invalidateBfCache()` for any revalidating action, and Next 16 keeps a client BFCache of dynamic segments for Back/Forward (`segment-cache/bfcache.js`). Without the revalidation, Back from the desk to `/letters` could restore the drafts strip with a stale title and "Edited" date. The finder's premise "for a surface nothing server-rendered shows" is therefore too strong: the strip IS server-rendered and shows the title. The cost side holds exactly: every autosave (2.5 s idle) renders the edit page plus the (main) layout (T8b-12 counted ~4-5 shell queries, plus the page's two).
Why it stands / falls: real, repeated, avoidable server work on the hottest writing path; nothing a member sees. Low.
Live check run: none needed (source).
Corrections to the finding: fix direction must keep Back-freshness: e.g. skip revalidation on draft autosaves but revalidate once when the desk is left (the exit save, or a `router.refresh()` on unmount), or accept a stale strip on Back and say so. Related, not duplicate: T8b-12 is the general "every revalidating action re-renders the shell" multiplier; this is the one call site where the revalidation is almost pure cost.
Orchestrator action: none.

### T1-07 — CONFIRMED
Verdict: CONFIRMED (Low; latent)
Confidence in verdict: certain on the mechanism; the trigger is two letters sharing a millisecond at a page boundary
Citations re-derived: `letters/(index)/page.tsx:49-50`, `:71`, `:87`, `:113` correct; `keyset.ts:29-33` is the "id half is not decoration" rule (finder: 30-35).
What I tried to refute it with: precision -- `information_schema` gives `Post.createdAt` datetime_precision 3, the same as a JS Date, so the cursor round-trips exactly and only a true tie is lost; ties -- none today.
Why it stands / falls: the index pages on `createdAt` alone while `keyset.ts` states every list must end its order in `id`. A tie straddling rows 20/21 drops the 21st from page 2. With seven published letters it has never happened and is unlikely to at 2,000 members, but it is a one-line departure from a rule the rest of the app keeps.
Live check run: `SELECT "createdAt", count(*) FROM "Post" WHERE kind='letter' AND status='published' GROUP BY 1 HAVING count(*)>1` -> no rows; 7 published letters; `datetime_precision` = 3.
Corrections to the finding: none beyond the line range.
Orchestrator action: none.

### T1-08 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low stands; the draft is hidden, not unreachable)
Confidence in verdict: certain
Citations re-derived: `letters/(index)/page.tsx:95-106` (`take: 20`, `orderBy: updatedAt desc`, no +1) correct; `drafts-strip.tsx` has no count or "more" line.
What I tried to refute it with: whether the 21st draft is reachable. It is not listed anywhere, but it is not stranded either: deleting any visible draft revalidates `/letters` (`deleteDraft`, `actions.ts:392`), the strip re-seeds from the fresh list (`drafts-strip.tsx:51-56`), and the 21st takes the freed slot. The finder's "cannot be deleted from the UI" is therefore wrong; "invisible until the member has twenty or fewer" is right.
Why it stands / falls: the exit save (owner, 2026-08-24) makes drafts accumulate without a press, and the strip never says it stopped at twenty -- the exact shape Saved fixed (audit Low 76). Live: one draft in the whole database, so no member is near it.
Live check run: `SELECT "authorId", count(*) FROM "Post" WHERE status='draft' GROUP BY 1 ORDER BY 2 DESC LIMIT 3` -> one author with 1 draft.
Corrections to the finding: consequence "hidden until a visible draft is deleted", not "reachable nowhere and undeletable".
Orchestrator action: none.

### T1-09 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (trigger and proof step wrong; Low stands)
Confidence in verdict: certain
Citations re-derived: `loadPosts`' no-session return is `actions.ts:1038-1040` (finder: 1034-1036); `loadComments`' is `:1249-1250` (finder: 1240-1242); `post-feed.tsx:291-308` (empty copy) and `:123-127` (error toast), `comments-section.tsx:357-360` (error toast) and `:741-747` (the empty thread renders nothing) correct.
What I tried to refute it with: the proxy. `src/proxy.ts:171-175, 304-325` checks only that a session cookie EXISTS; a missing cookie on an action POST is answered with a redirect to /login, which rejects the action and lands in `callAction`'s "That did not go through..." -- T5-06 / T8b-03, not this finding. So the finder's headline case (the absolute 90-day expiry: the browser drops an expired cookie) does not reach the empty path, and its proof ("delete the session cookie in devtools") reproduces T5-06 instead. The empty path IS reached when the cookie is present but `auth()` answers null: (a) a credentialVersion bump from another device (password reset, deletion request, block), which the proxy waves through on presence; (b) O-03 / T5-17's transient pool timeout inside the session callback, which NextAuth turns into a null session -- under load this is the likelier trigger, and then a search reads "No posts match your search", Load more ends the feed (`hasMore` false after appending nothing), and an opened thread shows nothing.
Why it stands / falls: two reads return the "nothing" shape for "no viewer", so a lapsed or momentarily unreadable session paints a false empty state with no toast. Low: nothing is lost and a reload resolves it, but it is the read-side face of O-03.
Live check run: none needed (code path); read `proxy.ts` to settle the trigger.
Corrections to the finding: trigger = revoked session or a failed session read (not the 90-day expiry); proof = sign in the throwaway account in two browsers, reset its password in one, then in the other type a search / press Load more / open a thread. Fix direction stands (return `{ error }` for no session); it composes with T5-17's `SessionUnavailable`, which would turn case (b) into a rejection that `callAction` already reports.
Orchestrator action: the two-browser revocation step above, with the throwaway account.

### T1-10 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain
Citations re-derived: `post-card.tsx:374` (`const shareHref = `/feed#${post.id}``, one value for every kind) and `:700` (`<ShareButton href={shareHref} label="Copy link to post" />`, in the action row both branches share, after the letter branch at `:471-495`) correct; `letter-engagement.tsx:65` (`/letters/${postId}`) and `notification-links.ts:27-35` (`postNotificationLink`) correct.
What I tried to refute it with: a letter branch that draws its own share control (none; the action row is common), and the feed resolving `/feed#<id>` for an old post (it scrolls only to loaded cards, `post-feed.tsx:171-174`).
Why it stands / falls: a letter card on the feed, the profile or Saved copies a feed link; the recipient lands on /feed and, for anything older than the first pages, at the top with no letter in sight. The label also says "post".
Live check run: none needed.
Corrections to the finding: none.
Orchestrator action: none.

### T1-11 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain
Citations re-derived: `comments-section.tsx:603-608` (Escape: `setReplyTo(null)` only) correct; the contract comment is `:269-274` ("only Escape or sending clears them"); the inline box reads `replyDraft` at `:559-561` correct; sending clears both at `:436-437`.
What I tried to refute it with: a clear elsewhere on Escape or on retarget (none: `startReply` at `:246-249` only sets `replyTo`; the click-away effect at `:283-292` deliberately keeps a non-empty draft).
Why it stands / falls: Escape closes the box but keeps the words, so the next Reply on anyone opens holding them, placeholder hidden. The member will usually see their own old words before sending, which is why Low is right.
Live check run: none needed.
Corrections to the finding: none. (Pressing Reply on B without Escape also carries the draft across, but that one matches the comment's "the box moves" design.)
Orchestrator action: none.

### T1-12 — REFUTED
Verdict: REFUTED (the premise state does not exist)
Confidence in verdict: certain
Citations re-derived: `toggle-queue.ts:72-88`, `heart.ts:23-30`, `letter-engagement.tsx:46-47` correct; `toggleLike` returns `liked` only (true).
What I tried to refute it with: the finder's premise is a page showing `liked=false` with a count that ALREADY includes this member's like. Every heart takes both values from the same render (`letter-engagement.tsx:46-47` from `initialLiked`/`initialLikeCount`; `serializePost` for cards), so a Back-restored payload from before the tap shows `liked=false, count=N-1`, a consistent pair. From that pair the queue's two trips settle correctly: trip 1 deletes (server liked:false) -> `settledHeart` keeps `{false, N-1}`; trip 2 re-creates -> `{true, N}`, which is the row's count.
Why it stands / falls: the count comes from `before`, and `before` is internally consistent, so the delete-then-recreate settle lands on the server's number. The only drift is other members' likes since the payload was rendered, which is ordinary staleness, not an off-by-one from this path.
Live check run: /tmp script with the real `settledHeart` and `createToggleQueue` against a counting fake server (deleted by the same command): real stale payload `{liked:false,count:4}` with the row liked at 5 -> screen `{true,5}`, server `{true,5}`; only the impossible premise `{false,5}` produces `{true,6}`.
Corrections to the finding: withdraw. (Returning the count from `toggleLike` would still be a nice-to-have for other members' concurrent likes; not a bug.)
Orchestrator action: none.

### T1-13 — CONFIRMED
Verdict: CONFIRMED (Low)
Confidence in verdict: certain
Citations re-derived: `report-action.ts:196-199` (selects `id` and `author.name` only), `:219-220` (subject "A post by ...", opening "You reported a post by ..."), `:262-265` (admin notification "reported a post by ...") correct; `postNoun` at `notification-links.ts:44-46`; the dialog title "Report {itemLabel}" at `report-dialog.tsx:98`, fed "letter" by `letter-menu.tsx:202-207`.
What I tried to refute it with: a kind-aware caller that rewrites the subject (none), and the admin thread naming the item elsewhere (it does not; the admin also reads "a post by").
Why it stands / falls: the member pressed "Report letter" and their own thread, plus the admin's bell line, say "post". Copy only.
Live check run: none needed.
Corrections to the finding: add the admin bell line (`:262-265`) as the third string (the finder named it at `:264`, fine).
Orchestrator action: none.

### T1-14 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (lines; Low, tampered-only, stands)
Confidence in verdict: certain
Citations re-derived: `validators.ts:209-251` (no refine ties `pollOptions` to `kind`) correct; `wantedPollOptions` is `actions.ts:214-217` (finder: 196-212); the letter card never draws `PollDisplay` (the poll sits in the non-letter branch, `post-card.tsx:525-533`); the letter page has no poll; `votePoll` (`actions.ts:396-445`) checks only visibility and that the option belongs to the post.
What I tried to refute it with: the composer (it never sends `pollOptions` for a letter, `create-post-form.tsx:466`), so only a hand-made call reaches it.
Why it stands / falls: the server accepts and stores options no surface shows; harmless today.
Live check run: `SELECT count(*) FROM "PollOption"` -> 0.
Corrections to the finding: line range for `wantedPollOptions`.
Orchestrator action: none.

### T1-15 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (lines; and it is reachable from the composer, not only by a hand-made call; Low stands)
Confidence in verdict: certain
Citations re-derived: `validators.ts:211` (`content` untrimmed), `:213` (title untrimmed), `:278-282` (comment untrimmed) correct. `wantedTitle` is `actions.ts:226` (finder: 216); editPost's content check is `:532-534` (finder: 492-494); editPost's title trim is `:647` (finder: 498). `writeComment`/`createComment` add no trim either (`comment-thread.ts`, `actions.ts:823-844`).
What I tried to refute it with: the client guards (`create-post-form.tsx:425` `!content.trim()`, `comments-section.tsx:414` `!text.trim()`), which stop ASCII whitespace. They do not stop invisible characters that JavaScript's `trim()` keeps: U+200B zero-width space, U+2060, U+3164 Hangul filler, U+2800 braille blank. The composer forces plain-text paste (`insertPlainTextPaste`), so pasting one of those publishes an empty-looking card through the UI.
Why it stands / falls: the server never makes "not empty" true; the client's check is the only one and has a hole. Low: a card with a byline and nothing else, by accident or prank.
Live check run: `node -e '"\u200B".trim().length'` -> 1 (and the same for U+3164, U+2800).
Corrections to the finding: add the invisible-character path; fix direction should refuse, on the server, a post, title or comment with no visible character once `\p{Cf}`, `\p{Zs}`, U+3164 and U+2800 are set aside -- as a test only; the text is stored as typed, since U+200D is part of every emoji ZWJ sequence.
Orchestrator action: optional: in the throwaway account's feed composer paste U+200B alone and press Post.

### T1-16 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low (mechanism confirmed; reach is compound)
Confidence in verdict: certain on the mechanism
Citations re-derived: `actions.ts:550`, `:579`, `:662-666`, `:682` correct; `deletePostWithImages`' still-named filter `:85-96` correct; `drainPendingImagePurges` (`account-purge.ts:428-472`) deletes whatever it is handed with no reference check, so nothing downstream saves it; `ownedUploadUrls` (`upload-ownership.ts:32-42`) lets two rows name one url.
What I tried to refute it with: a reference check in the drain (none), a unique on image urls (none), and the UI paths that put one url on two rows: T1-02's duplicate draft is the only one I found; every composer uploads fresh bytes otherwise, and the Collection tick copies to new keys.
Why it stands / falls: `editPost` queues and drains a removed url without C-018's "no other row names it" check, so removing a photograph from one of T1-02's twin drafts deletes the bytes the other still shows (and a published letter's images cannot be edited afterwards). But reaching it needs T1-02's race (an edit inside the Save round trip) with a photograph attached, and then removing the photo from one twin while keeping the other rather than deleting a twin (the safe, likelier move). The bytes are the member's own upload from their own device. Low, fixed in the same unit as T1-02.
Live check run: none possible read-only.
Corrections to the finding: severity Low (compound reach); fix direction and gate stand (one "urls no other row names" helper for both purge writers).
Orchestrator action: only with T1-02's reproduction: attach a photo before the throttled Save, then remove it on the edit page and check the other draft's image url answers 404.

### T1-17 — CONFIRMED
Verdict: CONFIRMED (Low today; grows with every comment and like ever written)
Confidence in verdict: certain on the plan shape; the SQL text is the finder's capture, which I did not re-capture
Citations re-derived: `actions.ts:984` (`postInclude`), `letters/(index)/page.tsx:85`, `letters/[id]/(read)/page.tsx:42` correct; `VISIBLE_COMMENT` is `posts.ts:80-84` (finder: 76-80); the Catch-up sibling `catchups-edition-view.ts:146` is T2b-13's. Also in the same family, not named by the finder: `pollOptions ... _count: { votes: true }` at `actions.ts:989`.
What I tried to refute it with: correlation. Rebuilding the statement as Prisma shapes a filtered relation count (a LEFT JOIN to a `GROUP BY "postId"` subquery with the author join inside) and EXPLAINing it on the live database gives a HashAggregate over the WHOLE Comment table, merge-joined to a walk of `User_pkey` in id order (47 buffers today; a merge join stops only past the highest commenting author's id, so in practice most of the table), with no page ids pushed inside. The `@@index([postId, isHidden])` cannot serve it. No `relationJoins`/LATERAL strategy is configured (`prisma/schema.prisma` generator block; Prisma 7.10.0).
Why it stands / falls: every feed page, letters index and letter open pays for every visible comment in the database plus a walk of the member table. Sub-millisecond at 28 comments; linear after that, on the three most-read surfaces, from a pool of five. The finder's 30-50k-comment projection is generous for this community (28 in the first months), so Low is right at the 2,000 target, but it is the one cost here that never stops growing.
Live check run: `EXPLAIN (ANALYZE, BUFFERS)` of the reconstructed feed page statement -> `HashAggregate (Group Key: c."postId") <- Merge Join (j0.id = c."authorId") <- Index Scan using User_pkey ... Filter NOT isBlocked (Buffers 47) + Seq Scan on Comment (Rows Removed 11)`; 0.38 ms today.
Corrections to the finding: add `actions.ts:989` (poll vote counts) to the same family; T2b-13 is the same root cause on `CatchupEntry` and should share the fix pattern (not a duplicate: different model, different surface).
Orchestrator action: none.

### T1-18 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (Low, conditional on owner question 7; the repo's own gate misses it)
Confidence in verdict: certain on the mechanism; the budget depends on the plan mode
Citations re-derived: `actions.ts:298-308` (the `after()` copy; finder: 299-307), `collection-intake.ts:94-171` (parallel per-image GET, metadata, two PUTs, `photo.create`) and `:151-167` (the catch's purge queue) correct; `feed/page.tsx` exports no `maxDuration`.
What I tried to refute it with: a platform default that makes it moot -- under Fluid compute the Hobby default is 300 s (findings.md "Vendor limits"), so the copy is safe unless the project runs the legacy 10 s default; that is owner question 7 and the finding says so. Also checked the repo's own rule: `unattended-rule.test.mjs:169-181` ("every surface that re-encodes an image declares a maxDuration", C-079) lists the two Collection pages and two upload routes only. `createPost`'s `after()` re-encodes (the `gridThumb` resize) and is hosted by `/feed` AND by `/letters/new` (the desk offers the tick whenever a photo is attached, `create-post-form.tsx:585-588`), neither of which is in that list.
Why it stands / falls: if the budget is short, a kill skips the per-image catch, orphaning landed PUTs with no purge row, and the member keeps the "with the Collection editors" toast for a photo that never arrives. Under Fluid it does not happen. Low.
Live check run: `grep maxDuration` across `src` -> only the Collection pages, upload routes, download, audio finalize and the three crons declare one.
Corrections to the finding: add `/letters/new` as a second host page; the gate to extend is the existing C-079 test (add the two pages), not a new rule. Related: V-T1-02 (a partial-PUT orphan in the same helper that happens without any kill).
Orchestrator action: owner question 7 settles the number.

### T1-19 — CONFIRMED
Verdict: CONFIRMED (Low; the accented-name half has no live victim)
Confidence in verdict: certain
Citations re-derived: `rich-text-editing.ts:78` (`before.match(/@(\w*)$/)`), `mention-dropdown.tsx:38-40` (an empty query renders nothing), `create-post-form.tsx:377-378` (`computeMentionRange` per input) correct.
What I tried to refute it with: the endpoint's matching -- `/api/users/search` ANDs `contains` per token (`route.ts:46`), so a member can still reach an accented name by typing an ASCII fragment from its middle, which softens but does not remove the problem; the live roster -- 0 of 224 names contain any non-ASCII character today, 1 contains an apostrophe/hyphen/period (and `\w` also stops at those: "@D'" closes the list).
Why it stands / falls: `\w` is ASCII, so the list closes on the first accented or Indic letter, and `asha@gmail` opens a people search for "gmail". Cosmetic-with-teeth for future members; nobody today.
Live check run: `SELECT count(*) FILTER (WHERE name ~ '[^\x01-\x7F]') ...` -> 0 non-ASCII names; 1 name with `'`, `’`, `.` or `-`.
Corrections to the finding: note that apostrophes and hyphens end the run too, and that the live population is currently unaffected.
Orchestrator action: none.

### T1-20 — CONFIRMED
Verdict: CONFIRMED (Low; hygiene at the 2,000 target)
Confidence in verdict: certain
Citations re-derived: `prisma/schema.prisma:958-966` (`model PollOption`, no `@@index`) and `actions.ts:987-991` correct.
What I tried to refute it with: the live index list (`PollOption_pkey` only) and the row count (0). The table will stay small (a few thousand options at most), so the per-page scan is sub-millisecond; the stronger argument is the FK cascade on post delete and the schema's own standard (PollVote got both indexes for B-090).
Why it stands / falls: missing FK index, confirmed; negligible cost.
Live check run: `pg_indexes` for PollOption -> pkey only; `EXPLAIN ... WHERE "postId" IN (...)` -> Seq Scan; `count(*)` -> 0.
Corrections to the finding: none.
Orchestrator action: none.

### T1-21 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (a third caller; the Catch-up lead is wrong; Low stands)
Confidence in verdict: certain
Citations re-derived: `post-notifications.ts:81-91` (`deleteMany where link = ...`; finder: 83-92). Callers: `actions.ts:110` (`deletePostWithImages`; finder: 107), `actions.ts:495` (`adminRemovePost`; finder: 462), and a third the finder missed, `admin/reports/actions.ts:36` (the report-queue takedown).
What I tried to refute it with: the live index list (`Notification_pkey`, `(userId, read)`, `(userId, createdAt)`; nothing on `link`) and the finder's sibling claim. `clearCatchupNotifications` (`catchups/actions.ts:2305-2325`) filters `userId` first, so the `(userId, ...)` indexes serve it: that half of the claim does not hold.
Why it stands / falls: each post delete or hide scans the notification table. Deletes and hides are rare, and the table is pruned to about 100 rows per member, so this stays in the tens of milliseconds at the target; an index on `link` would add write cost to the hottest insert path for a rare delete. Low; the fix session may reasonably decline.
Live check run: `EXPLAIN (ANALYZE) SELECT id FROM "Notification" WHERE link = '/feed#...'` -> Seq Scan, 432 rows removed.
Corrections to the finding: add the third caller; drop the Catch-ups sibling claim; note the index's write cost in the fix direction.
Orchestrator action: none.

### T1-22 — CONFIRMED
Verdict: CONFIRMED (Low; about a millisecond at 2,000)
Confidence in verdict: certain
Citations re-derived: `directory-module.tsx:30-40` correct; rendered for every confirmed member's feed via `feed-rail.tsx:38`.
What I tried to refute it with: the live index list (no `User(createdAt)`), the plan (Seq Scan + top-N heapsort of every member), and the scale (224 rows today, 2,000 at the target: a millisecond or two).
Why it stands / falls: real and negligible; the caching suggestion is the more useful half.
Live check run: `EXPLAIN (ANALYZE)` of the rail query -> `Limit <- Sort (top-N heapsort) <- Seq Scan on User`, 0.8 ms.
Corrections to the finding: none.
Orchestrator action: none.

### T1-23 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (reach narrower than stated; Medium stands)
Confidence in verdict: certain on the mechanism; likely on the path to loss
Citations re-derived: `use-letter-persistence.ts:44-45` (key has user and post, no tab), `:337-342` (success clears), `:344-353` (refusal stashes and reports "failed"), `:192-214` (pagehide stash) correct; the desk's "Not saving. Kept on this device." is `letter-desk.tsx:93`; the version guard is `actions.ts:652-658` (finder: 604-611). Also relevant and unmentioned: tab A's idle crash net (`:179-183`) overwrites the shared key with A's words 2.5 s after A's typing, a moment before A's autosave clears it, so B's stash is gone even before A's save lands.
What I tried to refute it with: the finder frames it as M66's "laptop and phone" scenario. Two DEVICES have separate localStorage, so that scenario cannot collide on the key; only two tabs or windows of one browser profile can. Checked whether the refused tab is protected by its own re-stash: B re-stashes on its own idle timer and on pagehide, but once B is closed nothing re-stashes, and A's next idle pause overwrites then clears the key.
Why it stands / falls: B was told its words are "Kept on this device"; after B closes and A saves once more, they are nowhere. The toast does tell B to reload, which (if followed promptly) recovers them through the "newer copy" offer; closing instead loses them. Medium: an edge case, but the loss is a writer's words, the thing this hook exists to keep.
Live check run: none possible read-only.
Corrections to the finding: reach is two tabs of one browser, not two devices; add the crash-net overwrite path (`:179-183`).
Orchestrator action: throwaway account, two tabs on one `/letters/<id>/edit`: type in A, wait 3 s; type in B (red "Not saving"); close B; type in A, wait 3 s; read `localStorage` for `rv:letter-draft:<id>:<postId>` -> absent or A's words.

### T1-24 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (latent: no surface can create the triggering post; Low stands)
Confidence in verdict: certain
Citations re-derived: `loadSavedPosts`' where is `actions.ts:1157-1174` with the city arm alone at `:1172` (finder: 1153-1170); the feed's `audienceWhere` is `:1057` (finder: 1050); `posts.ts:110-124` correct. The sweep is `post-visibility-rule.test.mjs:380-406`.
What I tried to refute it with: how a batch-targeted post comes to exist. The composer never sends `targetBatches` (no `.tsx` outside the guide text writes it); only a hand-made `createPost` can, and the live table holds 0 targeted posts. The test's blind spot is simpler than "does not count Saved's nested where": `AUDIENCE_SURFACES` (`:380-383`) lists only `loadPosts` and the profile page, so Saved (and the letters index, which does comply) are never swept.
Why it stands / falls: Saved does skip the batch arm, so a crafted batch-targeted post saved by a member who later corrects their batch stays on their shelf while the feed and the direct link refuse it. No member can reach it today.
Live check run: `SELECT count(*) FILTER (WHERE "targetBatches" IS NOT NULL AND "targetBatches" <> '') FROM "Post"` -> 0 of 25.
Corrections to the finding: add "latent: requires a hand-made batch-targeted post"; the gate fix is adding `loadSavedPosts` (and the letters index) to `AUDIENCE_SURFACES`.
Orchestrator action: none.

### T1-25 — CONFIRMED-CORRECTED
Verdict: CONFIRMED-CORRECTED (four callers, not three; Low stands)
Confidence in verdict: certain
Citations re-derived: `keyset.ts:54-61` (`decodeKeyset`) and `:70-82` (`keysetWhere`), the contract comment `:46-53` correct. Callers: `actions.ts:1116` (finder: 1113), `comment-thread.ts:128` (finder: 130; shared by the feed thread AND the Catch-up answer thread), `notifications/actions.ts:31` (the bell), and `admin-people-query.ts:66` (the admin people list), which the finder did not name.
What I tried to refute it with: a later guard (none; `keysetWhere` hands the Date straight to Prisma) and whether the serialisation actually throws (it does).
Why it stands / falls: `8700000000000000|x` passes `Number.isSafeInteger` and becomes an Invalid Date that throws on serialisation, so the caller sees "Check your connection" and Sentry gets an exception, against the module's "null for anything that is not one" promise. Crafted input only.
Live check run: `node -e` -> `Number.isSafeInteger(8.7e15)` true, `new Date(8.7e15).getTime()` NaN, `toISOString()` throws `RangeError: Invalid time value`.
Corrections to the finding: add the fourth caller (admin people); the one-line fix in `decodeKeyset` covers all four.
Orchestrator action: none.

## New candidates

### V-T1-01 — Two autosaves from one tab overlap whenever a save outlasts the next pause, and the writer is told the letter "has changed somewhere else"
- Severity: Low
- Confidence: likely (mechanism certain from code; the trigger is an `editPost` round trip longer than the gap to the next idle pause, i.e. a slow connection, a cold start or a pool wait; routine in a London-to-Mumbai dev setup)
- Where: `src/components/posts/use-letter-persistence.ts:295-309` (the timer guards on `submittingRef` only and starts `runAutosave()` whether or not `autosaveRunRef.current` is still in flight), `:320` (the base is read when the timer fires, before the previous run's answer has advanced it), `:329-353` (the refusal: `writeLocalDraft()`, `onAutosaveState("failed")`, the toast), `src/app/(main)/feed/actions.ts:652-658, 673-678` (the version guard and its sentence); Next 16.3.3 `app-router-instance.js` `dispatchAction` (a second server action from the same tab is queued behind the first, but its FormData already carries the stale base).
- Taxonomy: 6c(3) out-of-order completion, 6i two writers on one row (the same tab), sibling of C-175 and T1-03
- Expected: C-175's own gate states the property: "only one versioned editPost is in flight" (bug-report-2 C-175, Gate). `handleSubmit` honours it by awaiting `autosaveRunRef`; the autosave never checks it against itself.
- Actual: the writer pauses (autosave 1 sends base v1), types a few words, pauses again; if autosave 1 has not answered yet, autosave 2 also sends v1. Autosave 1 lands (v2); autosave 2 is refused. The desk turns red ("Not saving. Kept on this device.") and a toast says "This letter has changed somewhere else. Reload the page before you carry on, or your writing here will replace it." about the member's own writing. The next autosave carries v2 and quietly succeeds, so nothing is lost, but the instruction to reload is false and alarming.
- Why: quoted above; no in-flight check exists between two autosaves, and serialising the requests (Next does) does not help because the token is captured at fire time.
- Proof: throwaway account on a resumed draft, DevTools "Slow 3G" (or a 4 s artificial latency), type, pause 2.6 s, type one word, pause 2.6 s: expect the red chrome and the toast while the row holds the first save.
- Fix direction: chain rather than start: when the timer fires with `autosaveRunRef.current` set, run the new autosave after it (`autosaveRunRef.current = autosaveRunRef.current.then(runAutosave)`), with `runAutosave` reading `baseUpdatedAtRef` at send time. The same chaining is T1-03's fix for the exit save; do both in one unit with T1-02.
- Gate: a sequencing test like `heart.test.mjs`'s fake server: two autosaves with a slow first must send the base the first returned, and only one versioned write is ever in flight.
- Known-related: C-175 (Save/Publish vs autosave, fixed), T1-03 (exit save vs autosave), T1-06 / T8b-12 (every autosave re-renders the page and the shell, which lengthens exactly this round trip).

### V-T1-02 — The "Also add to the Collection" copy orphans a stored image whenever one of its two PUTs fails: its comment says each PUT is recorded as it lands, but neither is recorded until both have
- Severity: Low
- Confidence: certain (code); the trigger is one R2 PUT failing, or the thumbnail resize throwing, while the other PUT succeeds
- Where: `src/lib/collection-intake.ts:96-99` (the comment: "Set as soon as each PUT lands, so the catch below knows what it has to clean up"), `:126-134` (`const [copiedUrl, thumbUrl] = await Promise.all([putImage(original ...), gridThumb(original).then(putImage ...)]); stagedCopiedUrl = copiedUrl; stagedThumbUrl = thumbUrl;` -- both assigned only after BOTH resolve), `:151-167` (the catch queues only what was assigned, i.e. nothing); contrast `src/lib/image-purge.ts:82-104` (`putAllOrNone`, written for exactly this after audit C-064: "`Promise.all` rejects on the first failure and drops the other results on the floor") and its only users, `collection/actions.ts:262-265, 536-542`; the gate `src/lib/image-purge-rule.test.mjs:182-186` sweeps `collection/actions.ts` alone for `await Promise.all([ putImage`, so this file escapes it.
- Taxonomy: 6g orphaned objects, comment-lie, a gate that pins the instance rather than the property (TRAPS "pin the property")
- Expected: C-064/C-159: nothing this app stores is left with no row and no purge-queue entry.
- Actual: if the full-size copy lands and the thumbnail PUT (or `gridThumb`) fails, `Promise.all` rejects, the catch finds both `staged*` still null, queues nothing, and the landed copy of the member's photograph sits in the bucket under `collection/<id>/` with no row naming it and nothing that will ever delete it (account deletion included). The member sees nothing either way (the helper is best-effort inside `after()`).
- Why: quoted above; the C-064 fix was applied to the two Collection actions and never to this third writer.
- Proof: argue-only (needs a failing PUT). A unit test can prove it with a stubbed `putImage` that resolves once and rejects once.
- Fix direction: `const [copiedUrl, thumbUrl] = await putAllOrNone([putImage(...), gridThumb(original).then(...)], "intake-failed")` and drop the now-redundant staging variables (or assign each inside its own `.then`); correct the comment.
- Gate: widen `image-purge-rule.test.mjs`'s C-064 sweep from `collection/actions.ts` to every file under `src/` that calls `putImage`.
- Known-related: C-064 (the pattern and its helper), C-159 (this helper's catch), T1-18 (the same helper under a platform kill), T4a-01 (the same helper's quota); T4a's "verified clean" row on this helper covered the failed `photo.create`, not a half-landed pair.

### V-T1-03 — When a new feed search's first page fails, the previous list stays on screen under the new search's banner, and Load more then continues the new query from the old list's cursor
- Severity: Low
- Confidence: certain (code); the trigger is any rejected first page during a search: a dropped connection, a pool timeout inside `loadPosts` (O-03's family), or O-06's NUL byte
- Where: `src/components/posts/post-feed.tsx:107-134` (a new search bumps `listGeneration` and shows the skeleton; on `"error" in data` it toasts, sets `loading` false and returns, leaving `posts`, `cursor`, `hasMore` and `shownSearchRef` exactly as the previous query left them), `:267-271` (the banner reads the NEW `search`), `:219-251` (`handleLoadMore` captures the already-bumped generation, so nothing discards its page, and `fetchPosts` is bound to the new search while `cursor` is the old list's)
- Taxonomy: 6b stale state across a query change, 6k chaos (a failed read paints a success state), sibling of audit Low 75 (fixed for Load more mid-flight, not for a failed first page)
- Expected: the banner "Showing posts for X" describes the list under it (Low 75's reasoning at `:220-226`).
- Actual: a member on the feed types a search; the first page fails; the toast says "That did not go through...", and the unfiltered feed they were already reading stays on screen under "Showing posts for 'X'", presented as the results. If they press Load more, the new query's matches older than the old list's last post are appended beneath the unfiltered posts. O-06's live run started from a fresh `?q=` load, where the old list was empty, which is why it showed "No posts match your search"; from a loaded feed the same failure shows the wrong posts instead.
- Why: quoted above; the error branch was written for the first page of a fresh mount (B-042's "unstick the skeleton") and never considered a list already on screen.
- Proof: throwaway account on /feed with posts loaded, DevTools offline (or `?q=a%00b` typed into the header pill for O-06's server error): the old posts remain under the new banner; press Load more if shown.
- Fix direction: on a first-page error for a query different from `shownSearchRef.current`, either clear `posts`/`cursor`/`hasMore` and render a distinct "the search did not go through" state, or roll the banner back to the query the list belongs to.
- Gate: extract the first-page reducer (previous state + result or error -> next state) into a pure function and pin "an error never leaves another query's list under this query's banner".
- Known-related: O-06 (the NUL-byte trigger, orchestrator), audit Low 75 (the load-more half of the same rule), T1-09 (the resolved-empty cousin).

## Cross-zone notes

- **V-O-L1 / O-06**: from an already-loaded feed, the NUL search does not show "No posts match your search"; it shows the previous unfiltered list under the search banner (V-T1-03). The orchestrator's live run began from a fresh `?q=` load. Fix both in one place: strip U+0000 in `escapeLike` (O-06) and fix the error state (V-T1-03).
- **V-O-L1 / O-01**: re-read `drafts-strip.tsx:97-102`: the `toLocaleDateString("en-GB", { day, month })` call has no `timeZone`, exactly as O-01 says; nothing in my zone changes it.
- **V-T5 / V-T8 (T5-06, T8b-03)**: T1-09's "90-day expiry" case is theirs. An expired cookie is absent, the proxy (`proxy.ts:304-325`) redirects the action POST, and the member gets `callAction`'s connection sentence; T1-09's empty path needs a present-but-revoked cookie or O-03's failed session read.
- **V-O-L1 / O-03, V-T5 / T5-17**: `loadPosts` and `loadComments` turn a failed session read into an EMPTY page (T1-09), so under the pool-timeout storm a search reads "No posts match" and Load more ends the feed silently. T5-17's `SessionUnavailable` would convert this into a rejection; worth naming in that fix unit.
- **V-T2 (T2a)**: T1's lead "`clearCatchupNotifications` deletes by link with no index" is wrong: it filters `userId` and `type` first (`catchups/actions.ts:2317-2323`), served by the `Notification(userId, ...)` indexes.
- **V-T2 (T2b-13)**: same root cause as T1-17 (Prisma's uncorrelated `GROUP BY` subquery for a filtered relation `_count`). One fix pattern for both. Not duplicates (different model and surface).
- **V-T4 (T4a)**: V-T1-02 lives in `collection-intake.ts` (T4a's helper). Also worth one EXPLAIN by V-T4 or V-L-c: `collection-shape.ts:108` puts an unfiltered `_count: { loves: true }` on every river page, which T1-17's plan shape suggests aggregates the whole `PhotoLove` table per page.
- **V-T7a**: `admin-people-query.ts:66` is a fourth `decodeKeyset` caller, so T1-25's out-of-range cursor also throws on the admin people list.
- **V-L-c (L5)**: T1-06's per-autosave page and shell re-render is what stretches the autosave round trip that V-T1-01 and T1-03 race on; the pool arithmetic and these two races share a cause.
- **V-L-d (L9)**: two gates pin instances rather than properties: `unattended-rule.test.mjs:169-181` (C-079's maxDuration list omits `/feed` and `/letters/new`, T1-18) and `image-purge-rule.test.mjs:182-186` (C-064's sweep reads one file, V-T1-02). Also `post-visibility-rule.test.mjs:380-383` lists two of four audience surfaces (T1-24).

## Coverage

- Checked completely (every citation re-derived, refutation attempted, severity ruled): T1-01, T1-02, T1-03, T1-04, T1-05, T1-06, T1-07, T1-08, T1-09, T1-10, T1-11, T1-12, T1-13, T1-14, T1-15, T1-16, T1-17, T1-18, T1-19, T1-20, T1-21, T1-22, T1-23, T1-24, T1-25.
- Partially checked, and why: T1-17's SQL text is the finder's capture (Prisma query log); I re-derived the plan from a hand reconstruction of that SQL, not from a fresh capture. T1-05's refutation rests on Next 16.3.3's client source plus a promise-order simulation; a browser trace (the orchestrator's) would make it certain. T1-02, T1-03, T1-16, T1-23 and V-T1-01 need a throttled browser and writes to prove live; the orchestrator steps are in each verdict.
- Read-only proof run: two scratch modules under /tmp (T1-01 serializer/renderer round trip; T1-12 heart settle with a counting fake server) and one promise-order simulation (T1-05), each deleted by the command that created it; SELECT/EXPLAIN against the live database for T1-07, T1-08, T1-17, T1-19, T1-20, T1-21, T1-22, T1-24 and the index census; `node -e` for T1-15 and T1-25.
- Files read for this validation: `src/app/(main)/feed/actions.ts` (1-700, 960-1315), `src/components/posts/{use-letter-persistence.ts (all), create-post-form.tsx (150-660, 1140-1190), comments-section.tsx (176-300, 350-445, 545-615, 735-750), post-feed.tsx (40-320), post-card.tsx (366-378, 466-534, 690-705), report-action.ts (185-280), mention-dropdown.tsx (30-45)}`, `src/components/letters/{letter-desk.tsx, letter-engagement.tsx, letter-menu.tsx (86-175), drafts-strip.tsx}`, `src/app/(main)/letters/{(index)/page.tsx (1-175), new/page.tsx, [id]/edit/page.tsx, [id]/(read)/page.tsx (30-60, notFound lines)}`, `src/lib/{rich-text.ts (1-140), rich-text-editing.ts (1-120), keyset.ts, heart.ts, toggle-queue.ts (1-120), posts.ts, post-notifications.ts (60-91), draft-images.ts, upload-ownership.ts, call-action.ts, collection-intake.ts (55-174), image-purge.ts (60-104)}`, `src/lib/account-purge.ts` (drain), `src/proxy.ts` (171-345), `src/app/(main)/layout.tsx` (20-140), `src/components/feed/rail/directory-module.tsx`, `catchups/actions.ts` (2296-2325), `collection/actions.ts` (250-290, 525-570), tests `rich-text-editing.test.mjs`, `heart.test.mjs`, `composer-rule.test.mjs` (C-175 area), `post-visibility-rule.test.mjs` (370-430), `unattended-rule.test.mjs` (155-181), `image-purge-rule.test.mjs` (160-186); Next 16.3.3 `app-router-instance.js`, `app-call-server.js`, `use-action-queue.js`, `server-action-reducer.js` (180-345), `segment-cache/bfcache.js`, `action-handler.js` (skipPageRendering lines).
- Not re-examined: T1's "Verified clean" rows beyond those a finding depended on; T1's naughty-strings inputs (the orchestrator's live pass owns them).

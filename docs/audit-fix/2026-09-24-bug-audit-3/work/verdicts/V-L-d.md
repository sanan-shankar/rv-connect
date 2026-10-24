# V-L-d — adversarial validation of L6 (input validation) + L12 (write-path invariants) + L9 (test quality / comment lies) + L7 (client-react)
Validator: V-L-d · 2026-10-23 · Model: Opus 5.5 · Checked at HEAD 88642426. NOTE: the working tree is at `13f797bd`, four
commits past 88642426 (42ec6fe7, 2cc47df2, f8ef67a2, 13f797bd: trivia gate log + /admin/trivia, bird avatars). None of
them touches a file any finding below cites except `src/lib/audit.ts` (+4, trivia audit kinds) and `docs/spec/admin.md`
(+82, after line 578 is cited at 88642426). Line numbers below are 88642426's (`git show 88642426:<path>`).
Method: work/brief-validator.md. Read-only; SELECT-only SQL (8 queries); pure functions executed from their real source
files under Node 26 (no scratch file left; one `/tmp/vld-*` copy per command, deleted by the same command). No browser, no
gates, no sign-in. One public `curl` re-run of L6-07 was refused by the permission layer (the orchestrator's 09-27 live
confirmation stands; the code is unchanged).

## Summary table
| Id | Verdict | Severity |
|---|---|---|
| L6-01 | FIXED-SINCE 5164de0f | (was Medium) |
| L6-02 | CONFIRMED-CORRECTED (sink list of V-O-B; two new sinks) | Low |
| L6-03 | CONFIRMED-CORRECTED (vote-choice clause MOOT-SINCE 5d5c6898) | Low |
| L6-04 | CONFIRMED-CORRECTED | Low |
| L6-05 | UPGRADED to Medium (widened by cd1ec452: posts, letters and comments now scan links; 2.5 s per scan at the letter cap) | Medium |
| L6-06 | CONFIRMED-CORRECTED (vote-choice and cadence items MOOT) | Low |
| L6-07 | CONFIRMED (live-proved 09-27; unchanged at HEAD) | Low |
| L6-08 | CONFIRMED-CORRECTED (one-word occupation acronyms FIXED-SINCE d845872a; names and `iOS` stand) | Low |
| L6-09 | CONFIRMED-CORRECTED (subject is "...", not "") | Low |
| L12-01 | CONFIRMED-CORRECTED | Medium |
| L12-02 | CONFIRMED-CORRECTED | Low |
| L12-03 | CONFIRMED-CORRECTED (eleven actions now; nudgeGroup MOOT-SINCE eb855c71) | Low |
| L12-04 | CONFIRMED-CORRECTED | Low |
| L12-05 | CONFIRMED-CORRECTED (live numbers refreshed) | Low |
| L12-06 | CONFIRMED (reach strengthened: `allowedDevOrigins` admits LAN origins on purpose) | Low |
| L12-07 | CONFIRMED-CORRECTED | Low |
| L12-08 | CONFIRMED-CORRECTED | Low |
| L12-09 | CONFIRMED-CORRECTED (owner decision) | Medium |
| L9-01 | CONFIRMED (re-executed) | Low |
| L9-02 | CONFIRMED (re-executed) | Low |
| L9-03 | CONFIRMED | Low |
| L9-04 | CONFIRMED | Low |
| L9-05 | CONFIRMED-CORRECTED | Low |
| L9-06 | CONFIRMED-CORRECTED (the guide-overlay quote is gone at HEAD) | Low |
| L9-07 | CONFIRMED-CORRECTED | Low |
| L9-08 | CONFIRMED | Low |
| L9-09 | CONFIRMED | Low |
| L9-10 | CONFIRMED-CORRECTED (re-executed) | Low |
| L9-11 | DOWNGRADED to Low (its sharpest instance, C4/L11-01, FIXED-SINCE a281e855) | Low |
| L9-12 | CONFIRMED-CORRECTED (A38 MOOT; five late-routed lies added) | Low |
| L7-01 | CONFIRMED | Medium |
| L7-02 | CONFIRMED-CORRECTED (the "nobody has seen it" premise is weaker) | Medium |
| L7-03 | CONFIRMED (one fix unit with T9-04, T8b-07, T8b-15, L8-06) | Medium |
| L7-04 | CONFIRMED | Low |
| L7-05 | CONFIRMED | Low |
| L7-06 | CONFIRMED | Low |
| L7-07 | CONFIRMED | Low |
| L7-08 | CONFIRMED | Low |
| L7-09 | CONFIRMED | Medium |
| V-L-d-01 (new, routed from V-T3) | NEW CANDIDATE | Low |

Counts: 39 assigned + 1 routed lead. CONFIRMED 16, CONFIRMED-CORRECTED 20, UPGRADED 1 (L6-05), DOWNGRADED 1 (L9-11),
FIXED-SINCE 1 (L6-01), REFUTED 0, DUPLICATE 0, MOOT (partial clauses) 4 (L6-03 choices, L6-06 choices + cadence, L12-03
nudgeGroup, L9-12 A38). New candidates 1.

## Verdicts

### L6-01 — FIXED-SINCE 5164de0f
Verdict: FIXED-SINCE 5164de0f ("feat(feed): tagging in the composer works like Messages")
Confidence in verdict: certain
Citations re-derived: the renderer now writes the id into the anchor: `src/lib/rich-text.ts:166-173` (`'<a href="/profile/$2" data-mention-id="$2" …>$1</a>'`, with the comment "`data-mention-id` lets a draft or an edit come back into the composer as a tag rather than a link (serializeNode)"); the serializer reads it back: `src/lib/rich-text-editing.ts:38-46` (`const mentionId = el.dataset?.mentionId; … return name ? \`@[${name}](${mentionId})\` : ""`). Pinned: `src/lib/mention-editing.test.mjs:17-23` (asserts both halves).
What I tried to refute it with: the four hydration sites (`rich-text-area.tsx`, `create-post-form.tsx` resumed draft and device copy, the edit dialog, the answer card) all hydrate through `renderRichText`, so all get the `data-mention-id` anchor; the serializer strips a leading "@" and any `[`/`]` from the name, so the round trip of `@[Asha Rao](cm1)` is byte-identical.
Why it stands / falls: the exact asymmetry L6 executed (the serializer had no branch for the mention anchor) is closed, and a test pins it. The two comments L9 A37 called lies ("its inverse, so the draft round-trips") are now true.
Live check run: none needed (0 mention rows were damaged per L6's SELECT).
Corrections to the finding: close it; drop L9 Table A row A37 with it.
Orchestrator action: none.

### L6-02 — CONFIRMED-CORRECTED (Low; V-O-B canonical for the root, this is the sink list)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): the bell renders one text run at `src/components/layout/notification-bell.tsx:486` (was :479); `src/app/(main)/feed/actions.ts:876` (liked your post), `:992` (commented), `:1015` (replied), `:1404` (liked your comment) (were :757/:866/:887/:1226); `messages/actions.ts:135, :207, :252` (correct ±1); `report-action.ts:220, :264, :342` (correct); `verification-actions.ts:68` (was :65-66); `catchups-notify.ts:147` ("… is starting a Catch-up", was :110 group). NEW sinks since the audit base: `src/lib/mention-notifications.ts:113` (`${actorName} mentioned you in a ${noun}`, 1f44f1e9) and `src/lib/catchups-notify.ts:370-371` (`${writerName} replied to you in ${groupName}'s Catch-up.`). Admin worklist titles `admin-worklist-query.ts:198, :222` render the same strings. No `<bdi>`, `dir="auto"` or `unicode-bidi: isolate` anywhere outside /lab (grep at HEAD: the only `isolate` hits are the Tailwind stacking utility).
What I tried to refute it with: any strip on the write path (none: `retitle`/`titleCase` strips nothing; the only control-character strip is `link-preview-core.ts:357` for page titles); whether a bidi run can escape its element (it cannot escape the `<p>`, but the sentence IS one text node, so the member's override reorders the app's own words after it, as L6 says).
Why it stands: unchanged mechanism, two more sentences built the same way. Per V-T6 (V-O-B), one root and one fix: strip U+202A–U+202E / U+2066–U+2069 in the identity writers and isolate interpolated names at these sinks.
Live check run: none possible (needs a second member's bell); V-O-B's live run proves the name half.
Corrections to the finding: lines above; add the two new sinks; fold into V-O-B's unit.
Orchestrator action: none.

### L6-03 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `validators.ts:95-96` (signup names, correct); `profile-actions.ts:120` (`value.length < 2`, was :119); Catch-up name/rename/question now `catchups/actions.ts:137, :152, :157` (were :148/:166/:171); poll options, caption, house, place, link label, message, report reason unchanged in shape. The vote-choice rule (`vote-question-rule.ts:53`) is MOOT-SINCE 5d5c6898 (the vote question was deleted). The only invisibles-aware helper L6 pointed at, `magazine/measure.ts` `visibleText`, was deleted with the magazine in the same commit; `caption-tidy.ts` (ZWSP/ZWNJ/ZWJ/BOM, review room only) remains the only one.
What I tried to refute it with: a visible-letter refine anywhere in `validators.ts` or the actions (grep for `\p{L}`, `200B`, `2060`, `3164`: none outside caption-tidy).
Why it stands: `trim().min(1)` is still the only emptiness test; an invisible name, Catch-up name, question, caption or message still passes.
Live check run: none (pure; L6 executed every schema).
Corrections to the finding: lines above; drop the vote-choice clause (MOOT) and the "move measure.ts's INVISIBLE set" pointer (the file is gone: write the set fresh in `lib/`).
Orchestrator action: none.

### L6-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): nothing strips C0 on any write path (grep `u0000` in src: only `rich-text.ts:130` (link placeholder), `link-preview-core.ts:357`, `next-path.ts:23`); `escapeLike` (`db-text.ts:49-55`) is unchanged and still keeps NUL (O-06 is not fixed; its fix direction lives there). The two partial-write paths: `contributePhotoDirect` — `parsePhotoMeta` at `collection/actions.ts:454-462` accepts a NUL caption, the staged original is purged at `:571`, then `createPhotoRow` at `:583-603` throws 22021 (not a unique violation, so `:609` rethrows) after purging what it stored at `:343`: the contribution is gone (was "`createPhotoRow`" unspecified). `declinePhoto` — `erasePhoto` at `:1105`, then `notification.create` at `:1108` (were :1083-1101).
What I tried to refute it with: whether 9c992844 ("retry a missed direct upload, keep what arrives") changed the server order: it changed the client's retry, not this order; a retry of a NUL caption re-fails deterministically and the staged key is already gone.
Why it stands: unchanged mechanism; the two irreversible-step-first orderings are visible at the lines above.
Live check run: none (writes).
Corrections to the finding: lines above. Fix shares O-06's `escapeLike` change for reads and a `memberText()` refine for writes; `declinePhoto` composes its note before `erasePhoto`.
Orchestrator action: none.

### L6-05 — UPGRADED to Medium (widened since cd1ec452)
Verdict: UPGRADED to Medium
Confidence in verdict: certain (re-measured at HEAD with the real modules)
Citations re-derived (HEAD): `MENTION_PATTERN` is now `src/lib/rich-text.ts:24` (`/@\[([^\]]+)\]\(([A-Za-z0-9_-]+)\)/g`, unchanged shape, used at `:166-173`); `trimTail` `link-preview-core.ts:53-72` (unchanged). NEW CALLERS since cd1ec452 ("links in posts and letters show as they do in Catch-ups"): `post-card.tsx:247` (`stripReplacedLinks`, client, memoised) and `:550` (`renderRichText(displayBody, { linkRanges })`, inline in JSX, so re-run on EVERY render of the card); `letters/[id]/(read)/page.tsx:147` (`stripReplacedLinks`) and `:268` (`renderRichText(…, { linkRanges })`); `comments-section.tsx:1059`; `feed/actions.ts:299, :417, :774` (`findLinks` in createPost, publishDraft, editPost). The Catch-up callers remain (`catchups-edition-view.ts:171, :237`, `reader-parts.tsx:176`).
What I tried to refute it with: a length bound before `trimTail` (none: `MAX_URL_LENGTH` is applied only by `classifyLink`, after the scan); memoisation of the post card's render (only the strip is memoised).
Measured at HEAD (Node 26, real files): `findLinks("https://a.com/" + ")"×n)`: n≈5,000 (the post cap) **152 ms**, 6,000 (the answer cap) **219 ms**, 20,000 (the letter cap) **2,524 ms**; `stripReplacedLinks` at 20,000 **2,461 ms**; `renderRichText(… , { linkRanges })` at 20,000 **2,469 ms**; the mention pattern `"@[".repeat(10000)` **301–310 ms**.
Why it rises: at the audit base only a Catch-up answer (6,000 cap) paid the closer scan. Now a letter does, at 20,000: one hostile letter costs ~5 s of server CPU on every open of `/letters/<id>` (two scans), ~2.5 s inside the author's own save, and a 5,000-character plain post costs ~0.3 s on every render of its feed card on every member's phone (SSR, hydration, and each re-render, e.g. a heart tap). The trigger is still deliberate, by a verified member, but the cost now lands on everyone who scrolls the feed past it and on the owner's Hobby CPU budget, which is what Medium ("degradation") is for. T2b-01's sibling pattern was rated High at 20 s; this is a quarter of that, per view, repeatable.
Live check run: none against the database; the timings above are pure.
Corrections to the finding: severity Medium; title should name letters and feed posts, not only "a hostile answer"; the fix (count brackets once in `trimTail`; bound the mention name to `{1,100}`) is unchanged and now also protects `post-card`. Gate: the timing-budget test should cover 20,000 characters.
Orchestrator action: none.

### L6-06 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `validators.ts:95-96` (names, raw `.max(50)`), `:98-101` (password `.max(128)`), `:102` (signup phone `.max(24)`), `:64` and `:68` (link label/url), `:80` (11th link), `:203-205` (instagram/linkedin/facebook) — all still without a message; signup FloatFields at `signup-form.tsx:581, :591, :603` carry no `maxLength`; onboarding `register-step.tsx:166, :185, :194` (`Input`, no `maxLength`; T6-11). MOOT: the "choices" message (`catchups/actions.ts:180-183`, deleted by 5d5c6898) and the Catch-up `cadence` enum (`updateCatchupCadence` deleted by eb855c71, comment at `catchups/actions.ts:680`).
What I tried to refute it with: a Zod error map (none: no `z.config`/`errorMap` in src) and client caps added since (none on these inputs).
Why it stands: unchanged.
Live check run: none (pure; L6 executed the messages).
Corrections to the finding: drop the two MOOT items.
Orchestrator action: none.

### L6-07 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived (HEAD): `reset-password/page.tsx:17-24` (`const { token } = await searchParams; … checkResetLink(token ?? "")`), `verify-email/page.tsx:19-32`, `auth-tokens.ts:81-82` (`createHash("sha256").update(raw)`), `:271` (`readToken`); directory `page.tsx:159, :173-184` → `where.ts` `escapeLike(filters.q)`; feed `page.tsx:27, :32`. All unchanged in shape.
What I tried to refute it with: a `typeof` guard added anywhere on the three paths (none); the collection's `one()` (still the only page-level guard, plus `admin-content.ts:52` and `admin-people.ts:66`, which are admin).
Why it stands: the orchestrator reproduced it live on 2026-09-27 (500 on both public pages) and the code has not changed.
Live check run: a re-run of the two public curls was refused by the permission layer; not needed.
Corrections to the finding: none. Absorbs T6-10's URL half (V-T6); `readToken` refusing a non-string is the root fix (V-T5 routes it here as canonical).
Orchestrator action: none.

### L6-08 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED (part FIXED-SINCE d845872a)
Confidence in verdict: certain (executed at HEAD)
Citations re-derived (HEAD): `normalize.ts:37-56` (`capitalizeWord`), `:80-82` (`titleCase` → `retitle`), `:87-116` (`retitle`), NEW `:138-142` (`occupationCase`: a single all-caps word is kept); callers: names `profile-actions.ts:126`, `auth/actions.ts:124`, `admin/people/actions.ts:104`; occupation now `occupationCase` at `profile-actions.ts:137`, `onboarding/actions.ts:58-59`, `admin/people/actions.ts:139-140`; subjects `profile-actions.ts:157`, `onboarding/actions.ts:68`; places `place-input.ts:148`. The length check still precedes the transform (`profile-actions.ts:125-126`).
Executed: `titleCase("İSMAİL")` → "İsmai̇l" (6 → 8 code units); `titleCase("İ"×50)` → 100 code units; `titleCase("iOS developer")` and `occupationCase("iOS developer")` → "IOS Developer"; `occupationCase("GNLU")` → "GNLU" (fixed); NEW: `titleCase("ß")` → "SS".
Why it stands / falls: d845872a fixed the one-word acronym case in occupations (UBS, GNLU), which was the most common real damage (eighteen live workplaces, per its comment). The Turkish dotted capital in names, the brand-case `iOS`, and the post-transform length overflow remain.
Live check run: pure only.
Corrections to the finding: note the partial fix; drop "do not title-case job titles at all" as the owner has since chosen `occupationCase`.
Orchestrator action: none.

### L6-09 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (executed at HEAD)
Citations re-derived: `admin-threads.ts:78-86` (`cutTo`), `:88-101` (`deriveSubject`), `:104-108` (`previewOf`) — correct.
Executed: `deriveSubject("a" + U+0301×500)` → `"..."` (not `""`: the `cutTo(flat, 64)` returns "" and `:100` appends "..."); `previewOf(…, 70)` → `"..."`.
Why it stands: the thread's subject reads "..." and the admin bell "<name> wrote: ...". Same consequence, corrected detail.
Live check run: pure only.
Corrections to the finding: "empty subject" → a subject of "...".
Orchestrator action: none.

### L12-01 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `feed/actions.ts:125-152` (createPost: `isLetterDraft` exemption at :147, gate at :152 only when not a draft); `editPost` `:585-593` (unconditional `requireVerifiedMember()` before the row is read at :595); callers `use-letter-persistence.ts:331` (autosave) and `:430` (exit save); `create-post-form.tsx:529` (a resumed draft's Save). `member-gate.ts:41-59` (Stage 2 = Stage 1 + `verifyState === "verified"`).
What I tried to refute it with: (1) d7a8041d ("waiting for a confirmation email no longer locks anybody out"): `emailGateOpenFor` (`email-gate-open.ts:33-54`) keeps Stage 1 OPEN while a member's confirmation is still queued, so a brand-new member whose mail has not gone out passes Stage 1 — but `editPost` needs Stage 2, so an unvouched member is still refused; and a member whose confirmation WAS sent and not clicked is refused at Stage 1. (2) A desk-level gate (none). (3) Live population: 574 accounts, all `verifyState = verified` today (457 `admin.verify` audit rows), 85 with `emailVerified` NULL; 0 drafts. So today's trapped population is the unconfirmed members whose mail has gone out, plus every future signup before the owner or the roster vouches.
Why it stands: unchanged; the second writer of a draft still gates before it knows it is a draft.
Live check run: `SELECT count(*) …"User"` by state (above); `SELECT count(*) FROM "Post" WHERE status='draft'` = 0.
Corrections to the finding: lines above; the refusal copy a member reads depends on which gate is shut (EMAIL_UNVERIFIED or MEMBER_UNVERIFIED), both as described.
Orchestrator action: the finder's live step with a NEW throwaway (unconfirmed, mail sent): `/letters/new` → Save as draft → type → wait 3 s.

### L12-02 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `catchups/actions.ts:1469-1482` (`hasImages`, ownership, `imagesValue`), `:1531` (written), `:1560-1564` (the transaction reads only `audioUrl` for the replaced-recording diff), `:1625-1628` (only `replacedAudio` is purged), `:1630` (a cleared answer is deleted). The sibling that does it: `feed/actions.ts:638, :667, :750-770` (`removedImages` via `droppedImages`, queued in-tx, drained after).
What I tried to refute it with: the account purge (`account-purge.ts:106-159`) collects only images a row still names, so a dropped answer photograph survives even the member's own deletion — which the privacy page promises erases "your posts, comments, photographs" (`privacy/page.tsx:164`). That adds teeth rather than refuting.
Why it stands: unchanged.
Live check run: `Image` rows under `/uploads/` named by no Catchup picture, Post, answer, avatar or message: 19 today (1 since 2026-09-29); not attributable.
Corrections to the finding: lines above; add the deletion-promise consequence. Fix together with V-L-d-01 (same class).
Orchestrator action: none.

### L12-03 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED (one caller MOOT)
Confidence in verdict: certain
Citations re-derived (HEAD): `loadFreshEdition` `catchups/actions.ts:268-303` (`advanceEdition` at :286, before anything else); `loadMemberEdition` `:371-377` (advance first, membership second); `loadKeeperEdition` `:396-430`; `loadCommentableEntry` `:1762-1770`. Callers at HEAD (11, was 12): ungated — `curatePrompt` `:958, :996`, `openAnswering` `:1024`, `closeAndPublish` `:1098`, `extendDeadline` `:1290`, `loadEntryComments` `:1793`; Stage 2 — `submitPrompt` `:836`, `setEditionTimeCapsule` `:1385`, `submitEntry` `:1459`, `toggleEntryLove` `:1675`, `createEntryComment` `:1825`, `toggleEntryCommentLike` `:1911`. `nudgeGroup` is MOOT-SINCE eb855c71 (deleted). `advanceEdition` (`catchups.ts:238-319`) still applies due steps with their bells. Spec promise now at `docs/spec/catchups.md:184-189`.
What I tried to refute it with: whether the no-rhythm rework (eb855c71) removed the clock's due steps (it did not: answering → published/sealed, reminders and the capsule still advance by time); whether `startEdition` goes through the same door (it does not; it is not a clock driver).
Why it stands: membership is still decided after the write; consequence remains timing-only.
Live check run: none (a write).
Corrections to the finding: eleven actions, five with no stage gate; spec line numbers; the L10-01 Keeper-stage gap (V-L-b, High) is a different defect on four of the same callers.
Orchestrator action: none.

### L12-04 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `admin/people/actions.ts:263-295` (`adminSetRole`; the branch is `:275-282`: `if (role === "member") { refuseSelfOrLastAdmin(...) } else { prisma.user.update({ data: { role } }) }`), audit `:284-291`.
What I tried to refute it with: a parse of `role` (none; the parameter is typed `"admin" | "member"` only at compile time); the session gate compares `role === "admin"` (so any other string demotes).
Why it stands: unchanged.
Live check run: none (a write).
Corrections to the finding: lines; fix in the same change as T7a-11 (V-T7a), branching on `role === "admin"` for the unguarded path.
Orchestrator action: none.

### L12-05 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `docs/SECURITY.md:105` ("covering every admin action"); `writeAudit(` callers at HEAD: `admin/people/actions.ts:284, :434, :472, :540, :611, :647`, `account/export/route.ts:140`, `razorpay/webhook/route.ts:57, :328, :408`, `change-email-actions.ts:155` (new), `report-action.ts:268, :347`, `settings/actions.ts:225`, `auth.ts:273`, `retention.ts:306, :357`. Still none in `declinePhoto` (`collection/actions.ts:1095`), `adminRemovePhoto` (`:1174`), `deletePost`'s admin branch (`feed/actions.ts:526`), the hides (`feed/actions.ts:556`, `:1101`, `admin/reports/actions.ts:22`), `settleReport` (`admin/reports/actions.ts:58`), `adminSetPhotoTrusted` (`admin/people/actions.ts:241`).
What I tried to refute it with: the trivia admin actions added at 13f797bd DO audit (`admin.trivia_accept`/`_unaccept` live), which shows the pattern is wanted, not that moderation got it.
Why it stands: unchanged.
Live check run: `SELECT action, count(*) FROM "AuditLog" GROUP BY 1` → 13 kinds (admin.verify 457, retention.sweep 72, account.export 9, account.purge 4, account.email_change 2, admin.unverify 2, account.delete_request 2, admin.trivia_unaccept 1, admin.unblock 1, admin.block 1, account.delete_cancel 1, admin.trivia_accept 1, admin.delete 1); decline bells now 12 (2026-09-23 → 2026-10-17; the 56 L12 counted have been swept by the 30-day retention, which is the finding's point).
Corrections to the finding: refresh the numbers as above.
Orchestrator action: none.

### L12-06 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism; likely on reach (raised from possible)
Citations re-derived: `src/app/lab/actions.ts:20-31` (gate only `if (process.env.NODE_ENV !== "development")`), `:36-58` (upsert/delete) — correct, file untouched since 495ecdd2.
What I tried to refute it with: Next's dev-origin protection. It works against it: `next.config.ts:268-272` sets `allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"]` on purpose ("This is what makes `npm run dev` testable on a real iPhone"), so a browser on the same private network is an ALLOWED origin of the dev server, and those three ranges are what café and hotel networks hand out.
Why it stands: the only dev bypass of an auth check in the app, writing to the production database, from an origin the config deliberately admits.
Live check run: none (a write).
Corrections to the finding: cite `allowedDevOrigins` as the reach evidence.
Orchestrator action: none.

### L12-07 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `admin/review/actions.ts:53-126` (`saveReview`; `input.id` untyped; `updateMany` WHERE at `:96-97` is `{ id: input.id }` for `action: "save"`); `admin/reports/actions.ts:58-79` (`settleReport` `updateMany` at :63-66, then `noteOnReportThread` :75); `notifications/actions.ts:80-103` (`markNotificationRead`, `updateMany` :92-95); `admin/people/actions.ts:580` (`adminVerifyUser`); `collection/actions.ts:1004` (`togglePhotoLove`).
What I tried to refute it with: React's `decodeReply` does carry plain objects into a server action; `{ id: { not: "" } }` is a valid `StringFilter` in a `PhotoWhereInput`; no `typeof` check precedes any of the four admin writes.
Why it stands: unchanged.
Live check run: none.
Corrections to the finding: lines above.
Orchestrator action: none.

### L12-08 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: likely (unchanged reasoning; the demo is deferred)
Citations re-derived (HEAD): `rate-limit.ts:282` (`rateLimit`), `:301` (`hasBudget`), `:316` (`consume`) all short-circuit on `IS_DEMO` (were :268/:287/:302); `demo.ts:234` (`if (ALLOWED_WRITE_MODELS.has(model)) return true;`, was :240).
What I tried to refute it with: a per-model ceiling added to `demoWriteAllowed` (none).
Why it stands: unchanged.
Live check run: none.
Corrections to the finding: lines above.
Orchestrator action: none.

### L12-09 — CONFIRMED-CORRECTED (Medium; owner decision)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain on the mechanism
Citations re-derived (HEAD): `removeCatchupMember` `catchups/actions.ts:2179-2240` (membership `deleteMany` in a tx at :2195-2200, bells cleared :2207; no token rotation); `joinCatchupByToken` `:587-650` (lookup by token :608); the token is minted once at creation `:538`; `newInviteToken` has no other caller (grep). Shipped to every member's browser: `(home)/page.tsx:426` (`inviteToken: catchup.inviteToken`) into `CatchupHome` at `:551` (`"use client"`). Batch Catch-ups carry no token (`batch-catchups.ts:187`).
What I tried to refute it with: a join refusal for a previously removed member (none); a Keeper control to reset the link (none).
Why it stands: unchanged.
Live check run: `SELECT … FROM "CatchupSeries"`: 2 Catch-ups carry a token, 1 not ended.
Corrections to the finding: lines above.
Orchestrator action: owner question as the finder framed it (does a removal survive the invite link?).

### L9-01 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain (re-executed at HEAD)
Citations re-derived: `next.config.ts:101` (`*.razorpay.com`), `:119` (`*.spotifycdn.com`), `:157` (`*.r2.cloudflarestorage.com`) — unchanged; `security-regressions.test.mjs`, `test-kit.mjs:52-53` unchanged since 495ecdd2.
Live check run: the test's own regex over `decomment(next.config.ts)` at HEAD → offenders `[]` while the file holds three wildcards.
Corrections to the finding: none.

### L9-02 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain (re-executed)
Citations re-derived: `test-kit.mjs:41-53` — correct; docblock claim at :47-50.
Live check run: `decomment(next.config.ts)` at HEAD contains neither "Content-Security-Policy" nor "X-Frame-Options" (both are in the file).
Corrections to the finding: none.

### L9-03 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `scripts/qa/check.mjs:107` (`blocking: false, // by design`), `:260` (`if (state === "fail" && r.blocking) blocked = true;`) — file unchanged since 495ecdd2.
Corrections to the finding: none.

### L9-04 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `ci-parity.test.mjs:30-50` (`runSteps` matches `run:` only) — unchanged.
Corrections to the finding: none.

### L9-05 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): the bumps are `email-actions.ts:394` (was :376; the "full 30 days" comment is :389-393), `settings/actions.ts:221` (was :215), `admin/people/actions.ts:499` (was :496); `session-revocation.test.mjs:14` still says "30-day JWT window". No test names `increment` beside `credentialVersion` (grep of every `*.test.mjs`).
What I tried to refute it with: a new pin since (none); the new `change-email-actions.ts` (unconfirmed accounts only, password re-auth, CAS, audit) does not bump and does not need to (no credential changes).
Corrections to the finding: lines above.

### L9-06 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived: `back-closes-rule.test.mjs:53-56` (regex at :56) — correct; `router.back()` at `dark-gauntlet.tsx:145`, `lights-on.tsx:25` — correct. The guide's historical quote ("Closing was router.back()", `guide-overlay.tsx:20`) no longer exists at HEAD (the overlay was rewritten by 46d4408f/f7b3c5d9); the argument stands without it.
Corrections to the finding: drop the guide-overlay citation.

### L9-07 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD): `confirm-dialog.test.mjs:23`, `focus-recipe.test.mjs:67` (was :65), `batch-catchups.test.mjs:357` (was :328), `contribution-state.test.mjs:164`, `catchups-core.test.mjs:759` (was :862), `keyset.test.mjs:89` (was :88), `notification-reach.test.mjs:78` (`|| true`), `people-search-rule.test.mjs:47` (`|| true`, was :46), `post-visibility-rule.test.mjs:326`. Still nine; `gate-coverage` and `security-regressions` walk the filesystem.
Corrections to the finding: lines above.

### L9-08 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `notification-reach.test.mjs:76` ("two ways"), `:78` (`|| true`), `:95-106` (takedown count, floor `sites >= 3`) — unchanged; the three takedown sites are now `feed/actions.ts:107` (`tx.post.delete`), `:568` (adminRemovePost), `admin/reports/actions.ts:28` (adminHidePost).
Corrections to the finding: site lines.

### L9-09 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: O-01's call still at `drafts-strip.tsx:99` (V-O-L1: open at HEAD); no spec under `e2e/` listens for `pageerror` or console errors at HEAD (grep). The orchestrator re-checked the diff PNG (findings.md:137).
Corrections to the finding: none.

### L9-10 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain (re-executed at HEAD)
Citations re-derived (HEAD): `demo.ts:234` (was :240); `prisma.ts:68-71` (the "a nested write" sentence at :69); `demo.test.mjs:194` (the smuggling test).
Live check run: `demoWriteAllowed("Post","update",{…data:{author:{update:{role:"admin"}}}})` → true; the `Comment` → `post.update.reports.create` case → true; the `User` control → false.
Corrections to the finding: lines above.

### L9-11 — DOWNGRADED to Low
Verdict: DOWNGRADED to Low
Confidence in verdict: likely (severity call)
Citations re-derived: `scripts/qa/audit-status.mjs:159-165` (C4: `media = /media/.test(b)`), `:348-357` (M2), `:366-367` (M4: the note is "credential epoch column present", which is honest about what it checked), `:577-582` (M29) — file unchanged since 495ecdd2.
What I tried to refute it with: each contradiction at HEAD. C4's — the instance the finder rated Medium for ("it hid L11-01") — no longer contradicts: the media backup is green since a281e855 (V-L-b: L11-01 FIXED-SINCE). H11, H18, M2, M29 still overstate (their contradicting findings stand), M4's note is narrower than the finding says.
Why it falls a tier: no member-facing defect, and the one case where the board's green actually hid a live failure is fixed; what remains is a board whose notes overclaim, which is the Low "comment lie with teeth" class.
Corrections to the finding: severity Low; drop M4 from the "contradicted" list (its note says only "column present"); C4 is now historical evidence, not a live contradiction.

### L9-12 — CONFIRMED-CORRECTED (Low)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: certain
Citations re-derived (HEAD), row by row: A4 `2026-09-08-batch-catchups.sql:26` stands; A5 `catchups-core.ts:306-310` and the test title `catchups-core.test.mjs:313` stand; A6 `catchups-core.ts:406-411`, `catchups/actions.ts:2339-2344`, `gate-coverage.test.mjs:190` stand; A7 `docs/spec/admin.md:578` stands at 88642426; A14 `roster.ts:13-14` stands; A17 `contribution-state.ts:35, :46` stand; A21 `pick-bird/page.tsx:17-20` stands (the only `/pick-bird` link on /support is the admin-only "Change bird", `support/page.tsx:64-71`); A31 `rare-idle-behaviors.ts:17` stands; A32 `api-gate.ts:41` vs `:68` stands; A33 `catchups-edition-view.ts:214` (was :211-213) stands; A35 `image-aim.ts:66, :72` stands; A47 `retention.yml:7-8`, `retention/sweep/route.ts:10`, `docs/OPERATIONS.md:144` (was :131-132) stand; A52 `unattended-rule.test.mjs:214` stands; A53 `index-coverage.test.mjs:8` stands; A55 `schema.prisma:205`, `account-purge.ts:98, :243-246`, `cascade-rule.test.mjs:115`, `demo.ts:135` stand (live `User.coverPhoto` non-null = 0). MOOT: A38 (the choices message went with the vote question, 5d5c6898). A37 is no longer a lie (L6-01 FIXED-SINCE 5164de0f).
ADDENDUM — five comment lies routed to L9 after it had finished (leads-routed.md "From L12", "From L11"), each verified at HEAD, belong in this row: (a) `catchups/actions.ts:1947-1948` (`DEMO_SHARED_COPY_REFUSAL`'s docblock: "`GroupMember` is not on `ALLOWED_WRITE_MODELS`") — it is, `demo.ts:83`; (b) `.claude/agents/write-path-reviewer.md:13-14` ("18 files … 10 API routes … sixteen" `auth()` calls) — 22, 18 and 17; (c) `api/resend/webhook/route.ts:78` ("400, not 401: Svix retries on 5xx") — Svix retries any non-2xx (behaviour right, reason wrong); (d) `api/demo/reset/route.ts:13-15` ("On the real deployment it is a 404") — true of the POST (:82), the GET answers 200 `{ skipped }` (:111); and `:40`'s "reportSwallowed" is never called by the route; (e) `storage.ts:130` ("Images are content-addressed (cuid filenames), so cache forever") — link-preview thumbnails are keyed by the URL's hash, so a re-host under the same key is served stale under `immutable`.
Corrections to the finding: lines above; drop A37/A38; add (a)-(e).

### L7-01 — CONFIRMED (Medium)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism; likely on the length of the blank
Citations re-derived: `(main)/template.tsx:28-38` (`initial={{ opacity: 0, y: 8 }}`); Next doc `template.md:47` ("It wraps `error.js`, `loading.js`, `not-found.js`, and `page.js`"); `motion-features.tsx:37-40` (`LazyMotion features={loadDomMax}`, a function, so async); `framer-motion/dist/es/components/LazyMotion/index.mjs:54-60` (`features().then(…)` in an effect, no `catch`).
What I tried to refute it with: (1) whether `m.div` renders `initial` before features arrive (it does: LazyMotion's comment at `motion-features.tsx:31-32` says "`initial` styles apply", and L7 curled the same library's output on /login); (2) a MotionConfig or reduced-motion branch that would skip `initial` (none; the owner's always-on rule); (3) whether the loading skeleton sits outside the template (it does not, per the doc).
Why it stands: every hard load of a signed-in page streams its skeleton at opacity 0 and can paint nothing until hydration plus an async chunk; a failed chunk strands it.
Live check run: none possible signed out beyond L7's /login curl.
Corrections to the finding: none.
Orchestrator action: the finder's devtools step (view-source of `/feed` as the test account; block `motion-features-max`).

### L7-02 — CONFIRMED-CORRECTED (Medium)
Verdict: CONFIRMED-CORRECTED
Confidence in verdict: likely (WebKit behaviour; CSS certain)
Citations re-derived: `layout.tsx:63-68` (`generateViewport`: `themeColor`, `viewportFit` only; no `maximumScale` anywhere in src); `comments-section.tsx:587` (textarea `text-sm`, no breakpoint); `search-pill.tsx:240` (`text-[13.5px]`); `globals.css` sets no root font-size and `tailwind-theme.css` does not override `--text-sm` (so `text-sm` is 14px).
What I tried to refute it with: a root font-size or a `--text-sm` token that would lift 14px to 16px (none).
Why it stands: unchanged.
Corrections to the finding: the "nobody who works on the site has seen it" premise is weaker than written: `next.config.ts:268-271` says `allowedDevOrigins` exists to make "`npm run dev` testable on a real iPhone". The bug stands; the explanation for why it went unnoticed should not rely on the owner's Android.
Orchestrator action: one iPhone, one tap on "Write a comment…".

### L7-03 — CONFIRMED (Medium)
Verdict: CONFIRMED
Confidence in verdict: certain on the mechanism; likely on frequency
Citations re-derived: `node_modules/next/dist/esm/shared/lib/lazy-dynamic/loadable.js` (`lazy(()=>opts.loader().then(convertModule))`, no catch; `Suspense` only when `ssr:false` or `loading`); no `src/app/global-error.tsx`; no `ChunkLoadError` handling in `src` or in Next's client components (grep). `dynamic(` census at HEAD by file count matches L7's list (17 files outside /lab).
What I tried to refute it with: a Next-level chunk-failure recovery (none found in `next/dist/client`); a per-callsite error boundary (none).
Why it stands: as written.
Corrections to the finding: none. One fix unit with T9-04 (V-T9), T8b-07 (global boundary), T8b-15 (`reset` vs retry) and L8-06 (platform half).

### L7-04 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `ui/button.tsx:72` (`transition-[color,background-color,border-color,box-shadow,transform] … active:scale-[0.97]`), `ui/dialog.tsx:75-76` (`MODAL_CLOSE`, `transition-[color,transform] … active:scale-90`) — correct.
Corrections to the finding: none.

### L7-05 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `contacts-editor.tsx:250-263` (`opacity-0 … group-hover/row:opacity-100`, no coarse-pointer guard; `onCommit(next)` at :256) — correct.
Corrections to the finding: none (the `showEmail` side effect was not re-derived).

### L7-06 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the code paths
Citations re-derived: `next-auth/react.js:126-135` (`if (!providers) { window.location.href = …/error; return; }`); `auth.ts:352-354` (`pages: { signIn: "/login" }` only); `signup-form.tsx:416-467` (`signInResult?.error` at :434 reads `undefined` as success; the catch at :464-467) — correct.
Corrections to the finding: none.

### L7-07 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain on the order
Citations re-derived: `notification-bell.tsx:262-280` (await `markNotificationRead`, then `router.push`) — correct.
Corrections to the finding: none.

### L7-08 — CONFIRMED (Low)
Verdict: CONFIRMED
Confidence in verdict: certain
Citations re-derived: `directory-client.tsx:266-272` (`router.push` in `navigate`), `:273-284` (`updateFilters`), `:297-309` (`handleSearch`, the 300 ms timer at :306) — correct.
Corrections to the finding: none.

### L7-09 — CONFIRMED (Medium)
Verdict: CONFIRMED
Confidence in verdict: certain on the code paths; likely on reach
Citations re-derived: `voice-recorder.tsx:226-249` (`send`: `onStored(stored)` unconditional in `.then`; `l.uploading = run` overwrites), `:262-289` (`start`: `l.recording` read before the `getUserMedia` await, set at :311-322 after it), `:324-326` (`ondataavailable` pushes into the CURRENT `l.chunks`), `:449-461` (`remove` calls `onStored(null)` at once), `:463-469` (`send` inside a state updater), `:801-830` (the mic button stays enabled through `asking`; Record again and Remove stay enabled while `saving`); receivers `answer-card.tsx:81-93`, `answer-experience.tsx:113-174` (one ordered queue per prompt: null then the URL, so the late URL wins).
What I tried to refute it with: a disabled state on Remove while saving (none); a generation or mounted check after the await (none); the per-prompt queue (it preserves exactly the wrong order).
Why it stands: as written.
Corrections to the finding: none.
Orchestrator action: the finder's local steps on a throwaway Catch-up.

## New candidates

### V-L-d-01 — Replacing an uploaded Catch-up picture leaves the old photograph in the bucket for ever, and an upload abandoned in the picker likewise; neither survives into the account purge
- Severity: Low
- Confidence: certain on the mechanism; reachable since 592e3526 (the Picture row opens the picker again, T3-01 FIXED-SINCE). Live: 0 of 22 Catch-ups hold an uploaded picture today, so nothing is stranded yet.
- Where: `src/app/(main)/catchups/actions.ts:715-769` (`setCatchupPicture`: `prisma.catchup.update({ data: { pictureSrc: src, pictureFocus: focus } })` at :761-764, with no read of the previous `pictureSrc` and no purge); `src/lib/account-purge.ts:117-126, :143` (the purge collects only the CURRENT `pictureSrc` under `/uploads/<id>/`); `src/components/catchups/home/picture-picker-dialog.tsx:93-95, :151, :170` (an upload made in the picker is kept while the dialog is open and is never saved if the member then picks a pool photograph or closes the dialog). The sibling that gets it right: `feed/actions.ts:638-770` (`editPost` queues `droppedImages` in the same transaction, C-064).
- Taxonomy: 6g (orphaned objects when a row stops naming them) · write-path invariant 4.
- Expected: C-064's rule (bytes a row stops naming are queued for deletion in the write that stops naming them) and the privacy page's "After 60 days the account, your posts, comments, photographs … are erased" (`privacy/page.tsx:164`).
- Actual: a member uploads a picture for their Catch-up, later uploads another (or switches to a pool picture). The first stays public at its `uploads/<their id>/…` address with its `Image` row, named by nothing; when the member later deletes their account, the purge never sees it, so a personal photograph outlives the deletion the privacy page promises.
- Why: the action was written when the picker was unmounted (L12's "unreachable today", leads-routed "From L12"), and the comment's "it destroys nothing" (`:693`) was read as "it needs no cleanup".
- Proof: argue-only (writes). Read-only sizing: 19 `/uploads/` `Image` rows are named by no row today (the whole C-064 family), 1 created since 2026-09-29.
- Fix direction: inside `setCatchupPicture`, read the old `pictureSrc` in the same statement (an `update` with `select`, or a `findUnique` already done at :739 — add `pictureSrc` to its select) and, after the write, `purgeImageUrls([old], "replaced")` when the old value is an upload and no other row names it. For the picker's abandoned upload, either delete it on close-without-save through a small owned-URL purge action, or upload only on Save.
- Gate: extend the C-064 shape pin in `image-purge-rule.test.mjs` to every writer that overwrites an image-URL column (`pictureSrc`, `photoUrl`, `images`), requiring a purge of the replaced value. One unit with L12-02.
- Known-related: L12-02 (the answer-photograph instance), C-064, C-063, V-T3's routed lead.

## Cross-zone notes
- **L6-01 FIXED-SINCE 5164de0f** retires L9 Table A row A37 (the "round-trips" comments are now true).
- **L6-05 is now a feed and letters defect**, not only a Catch-ups one: T3-11's per-scroll multiplier (V-T3) is joined by `post-card.tsx:550`'s un-memoised render on every card re-render. Fix `trimTail` once; it protects all four surfaces.
- **L6-02 → V-O-B (V-T6)**: add `mention-notifications.ts:113` and `catchups-notify.ts:370-371` to the sink list.
- **L6-07 ← T6-10 (V-T6), V-T5**: canonical; fix `readToken` (non-string refusal) and one `firstParam` helper for `directory`, `feed`, the two token pages.
- **L12-03 vs L10-01 (V-L-b, High)**: four of L12-03's five ungated callers are L10-01's Keeper actions; different defects (order vs stage), same lines; fix in one pass over `loadMemberEdition`/`loadKeeperEdition`.
- **L12-04 + T7a-11 (V-T7a)**: one `z.enum(["admin","member"])` closes both.
- **L12-06**: `next.config.ts:268-272` `allowedDevOrigins` is the reach evidence (deliberate LAN access to the dev server).
- **L9-11**: C4 is no longer a live contradiction (L11-01 FIXED-SINCE a281e855 per V-L-b).
- **L7-02**: `next.config.ts:268-271` says the dev server exists to be tested on a real iPhone; the "owner is on Android, so nobody saw it" explanation should be dropped from the report.
- **L7-03 + T9-04 + T8b-07 + T8b-15 + L8-06**: one fix unit (V-T9 agrees).

## Coverage
- Checked completely (citations re-derived at HEAD 88642426, refutation attempted, verdict written): L6-01..L6-09, L12-01..L12-09, L9-01..L9-12, L7-01..L7-09, plus the routed lead V-L-d-01 (setCatchupPicture).
- Executed at HEAD (pure, real source files): `renderRichText`/`findLinks`/`stripReplacedLinks` timings (L6-05), `titleCase`/`occupationCase` (L6-08), `deriveSubject`/`previewOf` (L6-09), `demoWriteAllowed` nested cases (L9-10), `decomment` over `next.config.ts` with the C-134 regex (L9-01/02).
- Read-only SQL (8): User states; drafts by state; `AuditLog` kinds; decline bells; `CatchupSeries` uploaded pictures and live tokens; orphaned `/uploads/` `Image` rows; `User.coverPhoto` count.
- Only partially checked, and why: L7-05's `showEmail` side effect (not re-derived; the remove itself is certain); L7-01/L7-02/L7-03/L7-09 consequences that need a browser or a device (the orchestrator actions named per verdict); L12-06's reach depends on the owner's network; L6-07's live re-run was refused by the permission layer (09-27 live proof stands, code unchanged); L9-03/L9-04 not re-executed (files unchanged since the finder's runs).
- Leads-routed rows naming L6/L7/L9/L12 addressed: all L9 comment-lie leads routed after L9 finished are folded into L9-12's addendum (a)-(e); the L11 → L9 scripts leads (phase4-prod-check, phase5/8 probes) belong to C1, which reports them; the L2 → L9 layout-advance comment is L9 Table A A25; L6's leads to T-territories were ruled by those validators.
- Sideways looks that came back clean: `change-email-actions.ts` (new; unconfirmed only, password re-auth, CAS, P2002 handled, audited), `guide/actions.ts` `markGuideSeen` (takes nothing from the client; dev-only logging of its own failure, production silent by design), `mention-notifications.ts` (visibility-checked per recipient, deduped).
STATUS: COMPLETE at HEAD 88642426
